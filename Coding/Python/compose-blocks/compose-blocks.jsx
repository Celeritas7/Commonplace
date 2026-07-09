/* Commonplace UI kit — ComposeBlocks: a mobile-first drag-to-order Python editor.
 *
 * Ported from the "Dojo Paper" design prototype (see design_handoff_compose_blocks/).
 * The learner writes a program as an ordered stack of small labeled code blocks,
 * drags to reorder, then assembles them top-to-bottom and runs the whole thing.
 * Order is the lesson: a call above its def produces a real NameError, and the
 * editor maps that failure back to the guilty block and teaches the fix.
 *
 * Idiomatic to this codebase: React 18 + Babel-standalone (no build step), real
 * in-browser CPython via Pyodide, a self-contained component that sets a global.
 * Runner is the one swappable dependency — replace runProgram() with a POST to a
 * sandboxed endpoint, keeping the { ok, stdout, errType, errMsg, errLine } shape.
 *
 * Exposes:  window.ComposeBlocks  —  <ComposeBlocks seed={[...]} /> */

const { useState, useRef, useEffect, useLayoutEffect } = React;

/* ---- Dojo Paper tokens ---- */
const C = {
  cream: "#f7f1e3", paper: "#fffdf6", ink: "#2b2b2b", verm: "#b8412e", vermDk: "#8f3223",
  keyKw: "#ddd6f3", keyFn: "#cfe6c8",
  synKw: "#6a58b8", synFn: "#2f6b4f", synStr: "#2f6b4f",
  ln: "rgba(43,43,43,.35)",
  exitOk: "#8fd6a0", exitErr: "#e0917e", trace: "#d08a7a",
  mute: "rgba(43,43,43,.55)", mute45: "rgba(43,43,43,.45)", mute6: "rgba(43,43,43,.6)", mute2: "rgba(43,43,43,.2)",
};
const SHADOW = "4px 4px 0 rgba(43,43,43,.9)";
const SHADOW_SM = "2px 2px 0 rgba(43,43,43,.85)";
const SHADOW_LIFT = "9px 9px 0 rgba(43,43,43,.9)";
const MONO = "'JetBrains Mono',ui-monospace,monospace";
const UI = "'Inter',system-ui,sans-serif";

const KW = ["def", "for", "while", "if", "elif", "else:", "in", "return", "import", "not", "and", "or", "True", "False", "None"];
const FN = ["print(", "input(", "len(", "int(", "str(", "range(", "sum(", "sorted("];
const SYM = [":", "(", ")", "[", "]", "{", "}", ",", ".", "=", "==", "%"];

const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

/* ---- helpers ---- */
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const lineCount = (code) => String(code).split("\n").length;
function autoSize(ta) { if (!ta) return; ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }

/* naive python-ish coloring for the assembled panel (inline spans -> innerHTML) */
function colorLine(line) {
  let s = esc(line);
  s = s.replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|"[^"]*"|'[^']*')/g, '<span style="color:' + C.synStr + '">$1</span>');
  s = s.replace(/\b(import|from|def|return|if|elif|else|for|while|in|not|and|or|True|False|None|as|pass|break|continue)\b/g, '<span style="color:' + C.synKw + ';font-weight:600">$1</span>');
  s = s.replace(/\b(print|input|len|int|str|range|sum|sorted)\b(?=\()/g, '<span style="color:' + C.synFn + ';font-weight:600">$1</span>');
  return s;
}

/* map a global (top-level) line number to the block it belongs to */
function blockForLine(lineNo, blocks) {
  if (!lineNo) return null;
  let acc = 0;
  for (let i = 0; i < blocks.length; i++) {
    const n = lineCount(blocks[i].code);
    if (lineNo <= acc + n) return { block: blocks[i], localLine: lineNo - acc };
    acc += n;
  }
  return null;
}
/* the undefined name from a NameError message, e.g. is_odd */
function guiltyName(run) { if (!run || !run.errMsg) return null; const m = run.errMsg.match(/name '([^']+)'/); return m ? m[1] : null; }
/* the block that defines that name (so the hint can point at it) */
function defBlockLabel(name, blocks) {
  const b = blocks.find((bl) => new RegExp("def\\s+" + name + "\\b").test(bl.code) || new RegExp("\\b" + name + "\\s*=").test(bl.code));
  return b ? b.label : "def " + name;
}

/* ---- the runner (the one swappable dependency) ---- */
let pyPromise = null;
function loadPyodideOnce() {
  if (pyPromise) return pyPromise;
  pyPromise = new Promise((resolve, reject) => {
    if (typeof window.loadPyodide === "function") { window.loadPyodide({ indexURL: PYODIDE_BASE }).then(resolve).catch(reject); return; }
    const s = document.createElement("script");
    s.src = PYODIDE_BASE + "pyodide.js";
    s.onload = () => window.loadPyodide({ indexURL: PYODIDE_BASE }).then(resolve).catch(reject);
    s.onerror = () => reject(new Error("Failed to load Pyodide"));
    document.head.appendChild(s);
  });
  return pyPromise;
}
/* run assembled source, capturing stdout+stderr; parse a top-level error line */
async function runProgram(src) {
  const py = await loadPyodideOnce();
  py.runPython("import sys, io\n_out=io.StringIO()\nsys.stdout=_out\nsys.stderr=_out");
  let ok = true, errType = null, errMsg = null, errLine = null;
  try {
    await py.runPythonAsync(src);
  } catch (err) {
    ok = false;
    const m = String((err && err.message) || err);
    const lm = m.match(/line (\d+)/g);
    if (lm) errLine = parseInt(lm[lm.length - 1].replace("line ", ""), 10);
    const em = m.match(/(\w*(?:Error|Exception)): ([^\n]*)/);
    if (em) { errType = em[1]; errMsg = em[2]; }
  }
  let stdout = "";
  try { stdout = py.runPython("_out.getvalue()"); } catch (_) {}
  try { py.runPython("sys.stdout=sys.__stdout__\nsys.stderr=sys.__stderr__"); } catch (_) {}
  return { ok, stdout, errType, errMsg, errLine };
}

/* ==================================================================== */
/* scoped stylesheet — the bits inline styles can't do (pseudo, scroll,  */
/* keyframes, media). Injected once.                                     */
/* ==================================================================== */
const CB_CSS = `
.cb-app{width:100%;max-width:380px;background:${C.cream};border:1.5px solid ${C.ink};border-radius:18px;
  box-shadow:6px 6px 0 rgba(43,43,43,.9);padding:16px;display:flex;flex-direction:column;gap:14px;
  box-sizing:border-box;font-family:${UI};color:${C.ink};-webkit-tap-highlight-color:transparent}
.cb-app *{box-sizing:border-box}
.cb-app textarea{width:100%;border:none;outline:none;resize:none;background:transparent;padding:12px 14px;
  font-family:${MONO};font-size:13px;line-height:1.6;color:${C.ink};display:block;overflow:hidden}
.cb-keyrow{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}
.cb-keyrow::-webkit-scrollbar{display:none}
.cb-outputs{display:flex;flex-direction:column;gap:14px}
.cb-press:active{transform:translate(1px,1px)}
.cb-press2:active{transform:translate(2px,2px)}
.cb-spin{width:11px;height:11px;border:2px solid rgba(247,241,227,.3);border-top-color:#f7f1e3;border-radius:50%;
  animation:cb-spin .7s linear infinite;flex:0 0 auto}
@keyframes cb-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.cb-spin{animation:none}}
@media (min-width:640px){
  .cb-app{max-width:700px;padding:20px}
  .cb-outputs.cb-two-up{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
}
.cb-app.cb-full{position:fixed;inset:0;z-index:1000;max-width:none;width:100vw;min-height:100vh;
  border:none;border-radius:0;box-shadow:none;overflow:auto}
`;
function StyleOnce() {
  useEffect(() => {
    if (document.getElementById("cb-style")) return;
    const tag = document.createElement("style");
    tag.id = "cb-style"; tag.textContent = CB_CSS;
    document.head.appendChild(tag);
  }, []);
  return null;
}

/* ==================================================================== */
/* KEY PALETTE — zero-typing token insertion                             */
/* ==================================================================== */
function KeyPill({ tok, kind, disabled, onInsert }) {
  const bg = kind === "kw" ? C.keyKw : kind === "fn" ? C.keyFn : C.cream;
  return (
    <button type="button" className="cb-press" disabled={disabled} onClick={() => onInsert(tok)}
      style={{
        flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center",
        height: "38px", padding: kind === "sym" ? "0 10px" : "0 13px", minWidth: kind === "sym" ? "38px" : "auto",
        background: bg, border: "1px solid " + C.ink, borderRadius: "10px", boxShadow: SHADOW_SM,
        fontFamily: MONO, fontSize: "13px", fontWeight: 600, color: C.ink, cursor: disabled ? "default" : "pointer",
        userSelect: "none", opacity: disabled ? 0.4 : 1,
      }}>{tok}</button>
  );
}

function Palette({ focusedLabel, keysHidden, setKeysHidden, onInsert }) {
  if (keysHidden) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.paper, border: "1px solid " + C.ink, borderRadius: "12px", boxShadow: SHADOW, padding: "6px 6px 6px 12px" }}>
        <span style={kicker()}>KEYS HIDDEN</span>
        <button type="button" className="cb-press" onClick={() => setKeysHidden(false)} style={miniBtn()}>Show keys ⌄</button>
      </div>
    );
  }
  const disabled = !focusedLabel;
  return (
    <div style={{ background: C.paper, border: (focusedLabel ? "2px solid " + C.verm : "1px solid " + C.ink), borderRadius: "12px", boxShadow: SHADOW, padding: "10px 0 12px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 9px" }}>
        <span style={kicker()}>KEY PALETTE{focusedLabel && <span style={{ color: C.verm }}> → {focusedLabel.toUpperCase()}</span>}</span>
        <button type="button" className="cb-press" onClick={() => setKeysHidden(true)} style={miniBtn()}>Hide keys ⌃</button>
      </div>
      <div className="cb-keyrow" style={{ padding: "2px 0 4px 12px" }}>
        {KW.map((t) => <KeyPill key={t} tok={t} kind="kw" disabled={disabled} onInsert={onInsert} />)}
      </div>
      <div className="cb-keyrow" style={{ padding: "6px 0 4px 12px" }}>
        {FN.map((t) => <KeyPill key={t} tok={t} kind="fn" disabled={disabled} onInsert={onInsert} />)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px 12px 2px 12px", borderTop: "1px dashed " + C.mute2, marginTop: "8px" }}>
        {SYM.map((t, i) => <KeyPill key={t + i} tok={t} kind="sym" disabled={disabled} onInsert={onInsert} />)}
      </div>
    </div>
  );
}

/* ==================================================================== */
/* BLOCK CARD                                                            */
/* ==================================================================== */
function BlockCard({ b, focused, isErr, dragging, dimmed, dy, taRefs, cardRefs, onGripDown, onFocusBlock, onChangeCode, onToggle, onDelete }) {
  const taRef = useRef(null);
  useLayoutEffect(() => { if (!b.collapsed) autoSize(taRef.current); }, [b.code, b.collapsed]);

  const cardStyle = {
    background: C.paper, border: "1px solid " + C.ink, borderRadius: "12px", boxShadow: SHADOW,
    overflow: "hidden", touchAction: "none",
    ...(focused && !isErr ? { border: "2px solid " + C.verm } : {}),
    ...(isErr ? { border: "1px solid " + C.verm, boxShadow: "4px 4px 0 rgba(184,65,46,.55)" } : {}),
    ...(dragging ? { boxShadow: SHADOW_LIFT, transform: "rotate(-2deg) translateY(" + dy + "px)", borderWidth: "1.5px", position: "relative", zIndex: 5 } : {}),
    ...(dimmed ? { opacity: 0.45 } : {}),
  };
  const n = lineCount(b.code);

  return (
    <div ref={(node) => { cardRefs.current[b.id] = node; }} style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "46px", padding: "0 4px 0 13px", borderBottom: b.collapsed ? "none" : "1px solid " + C.mute2 }}>
        <span onPointerDown={(e) => onGripDown(e, b.id)} title="Drag to reorder"
          style={{ color: dragging ? C.ink : C.mute45, fontSize: "14px", cursor: dragging ? "grabbing" : "grab", touchAction: "none", padding: "0 2px" }}>⠿</span>
        <span style={{ fontFamily: MONO, fontSize: "13px", fontWeight: 700 }}>{b.label}</span>
        {b.collapsed && <span style={{ fontFamily: MONO, fontSize: "11px", color: C.mute45, whiteSpace: "nowrap", flex: "0 0 auto" }}>· {n} line{n === 1 ? "" : "s"}</span>}
        {focused && !isErr && <span style={stamp()}>KEYS INSERT HERE</span>}
        {isErr && <span style={stamp()}>RAN TOO EARLY</span>}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => onToggle(b.id)}
          style={{ ...iconBtn(), fontSize: "15px", transform: b.collapsed ? "rotate(-90deg)" : "none" }}>⌄</button>
        <button type="button" onClick={() => onDelete(b.id)} style={{ ...iconBtn(), fontSize: "17px" }}>×</button>
      </div>
      {!b.collapsed && (
        <div style={{ margin: 0, padding: 0 }}>
          <textarea spellCheck={false} rows={1} value={b.code}
            ref={(node) => { taRef.current = node; taRefs.current[b.id] = node; }}
            onFocus={() => onFocusBlock(b.id)}
            onChange={(e) => { onChangeCode(b.id, e.target.value); autoSize(e.target); }} />
        </div>
      )}
    </div>
  );
}

/* ==================================================================== */
/* OUTPUT — assembled program + stdout                                   */
/* ==================================================================== */
function Outputs({ run, blocks }) {
  if (!run) return null;

  if (run.running) {
    return (
      <div className="cb-outputs">
        <div style={{ background: C.ink, border: "1px solid " + C.ink, borderRadius: "12px", boxShadow: "4px 4px 0 rgba(43,43,43,.35)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderBottom: "1px solid rgba(247,241,227,.15)" }}>
            <span style={{ ...kicker(), color: "rgba(247,241,227,.6)" }}>STDOUT</span>
          </div>
          <pre style={{ margin: 0, padding: "12px 14px", fontFamily: MONO, fontSize: "13px", lineHeight: 1.6, color: C.cream, display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="cb-spin" />warming up the Python runtime…
          </pre>
        </div>
      </div>
    );
  }

  const total = blocks.reduce((a, b) => a + lineCount(b.code), 0);
  const guilty = guiltyName(run);

  // continuous 1-based line numbers across all segments
  let ln = 0;
  const segs = run.assembled.map((seg, si) => {
    const hot = !run.ok && run.errLabel === seg.label;
    let html = "";
    seg.code.split("\n").forEach((line) => {
      ln++;
      const mark = !run.ok && run.errLine === ln;
      html += (mark
        ? '<span style="color:' + C.verm + ';font-weight:700">' + ln + " ▸</span>"
        : '<span style="color:' + C.ln + '">' + ln + "  </span>") + colorLine(line) + "\n";
    });
    return { label: seg.label, hot, html: html.replace(/\n$/, ""), si };
  });

  return (
    <div className="cb-outputs cb-two-up">
      {/* assembled program */}
      <div style={{ background: C.paper, border: "1px solid " + C.ink, borderRadius: "12px", boxShadow: SHADOW, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderBottom: "1px solid " + C.mute2 }}>
          <span style={kicker()}>ASSEMBLED PROGRAM</span>
          <span style={{ fontFamily: MONO, fontSize: "11px", color: C.mute45 }}>{total} LINE{total === 1 ? "" : "S"}</span>
        </div>
        {segs.map((s) => (
          <div key={s.si} style={{ position: "relative", padding: "8px 12px 6px 10px", borderTop: s.si === 0 ? "none" : "1px dashed " + C.mute2, background: s.hot ? "rgba(184,65,46,.06)" : "transparent" }}>
            <span style={{ position: "absolute", top: "8px", right: "10px", fontFamily: MONO, fontSize: "9px", fontWeight: s.hot ? 700 : 600, letterSpacing: "1px", color: s.hot ? C.verm : "rgba(43,43,43,.4)" }}>
              {s.label.toUpperCase()}{s.hot && guilty ? " — USES " + guilty : ""}
            </span>
            <pre style={{ margin: 0, fontFamily: MONO, fontSize: "12.5px", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: s.html }} />
          </div>
        ))}
      </div>

      {/* stdout — the one dark surface */}
      <div style={{ background: C.ink, border: "1px solid " + C.ink, borderRadius: "12px", boxShadow: "4px 4px 0 rgba(43,43,43,.35)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderBottom: "1px solid rgba(247,241,227,.15)" }}>
          <span style={{ ...kicker(), color: "rgba(247,241,227,.6)" }}>STDOUT</span>
          <span style={{ fontFamily: MONO, fontSize: "10px", fontWeight: 700, letterSpacing: "1px", color: run.ok ? C.exitOk : C.exitErr }}>EXIT {run.ok ? "0" : "1"}</span>
        </div>
        {run.ok ? (
          <pre style={{ margin: 0, padding: "12px 14px", fontFamily: MONO, fontSize: "13px", lineHeight: 1.6, color: C.cream, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{run.stdout || ""}</pre>
        ) : (
          <React.Fragment>
            <pre style={{ margin: 0, padding: "12px 14px", fontFamily: MONO, fontSize: "12px", lineHeight: 1.6, color: C.trace, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              dangerouslySetInnerHTML={{ __html:
                "Traceback (most recent call last):\n" +
                '  File "program.py", line ' + (run.errLine || "?") + ", in &lt;module&gt;\n" +
                '<span style="color:' + C.exitErr + ';font-weight:700">' + esc((run.errType || "Error") + ": " + (run.errMsg || "")) + "</span>" }} />
            {guilty && (
              <div style={{ borderTop: "1px solid rgba(247,241,227,.15)", padding: "9px 12px", fontFamily: MONO, fontSize: "11px", lineHeight: 1.6, color: "rgba(247,241,227,.6)" }}>
                line {run.errLine || "?"} ran before <b style={{ color: C.cream, fontWeight: 600 }}>{defBlockLabel(guilty, blocks)}</b> existed — drag <b style={{ color: C.cream, fontWeight: 600 }}>{run.errLabel || ""}</b> below it ↓
              </div>
            )}
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

/* ==================================================================== */
/* ROOT                                                                  */
/* ==================================================================== */
function ComposeBlocks({ seed }) {
  const initial = (seed && seed.length ? seed : (window.COMPOSE_BLOCKS_SEED || [])).map((b) => ({ ...b, collapsed: !!b.collapsed }));
  const [blocks, setBlocks] = useState(initial);
  const [focusedId, setFocusedId] = useState(null);
  const [keysHidden, setKeysHidden] = useState(false);
  const [drag, setDrag] = useState(null);          // { id, dropIndex, dy }
  const [run, setRun] = useState(null);            // { running } | { ok, assembled, stdout, err* }
  const [ranOnce, setRanOnce] = useState(false);
  const [full, setFull] = useState(false);

  const taRefs = useRef({});
  const cardRefs = useRef({});
  const idSeq = useRef(initial.length + 1);

  /* re-measure textareas once webfonts land (they change metrics) */
  useEffect(() => { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { Object.values(taRefs.current).forEach(autoSize); }); }, []);
  /* Esc leaves fullscreen */
  useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const focused = blocks.find((b) => b.id === focusedId) || null;

  const setBlockCode = (id, code) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, code } : b)));

  /* insert a palette token at the caret of the focused textarea */
  function insertToken(tok) {
    if (!focused) return;
    const ta = taRefs.current[focused.id];
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, before = v.slice(0, s);
    const prev = before.slice(-1);
    const needSpace = before.length > 0 && !/[\s(\[{]/.test(prev) && !/^[:)\]},]/.test(tok);
    const ins = (needSpace ? " " : "") + tok;
    const next = v.slice(0, s) + ins + v.slice(e);
    setBlockCode(focused.id, next);
    const caret = s + ins.length;
    requestAnimationFrame(() => { const t = taRefs.current[focused.id]; if (t) { t.focus(); t.setSelectionRange(caret, caret); autoSize(t); } });
  }

  function addBlock() {
    const id = "b" + (idSeq.current++);
    setBlocks((bs) => [...bs, { id, label: "block " + (bs.length + 1), code: "", collapsed: false }]);
    setFocusedId(id); setRun(null);
    requestAnimationFrame(() => { const t = taRefs.current[id]; if (t) t.focus(); });
  }
  function deleteBlock(id) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    setFocusedId((f) => (f === id ? null : f));
    setRun(null);
  }
  function toggleCollapse(id) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, collapsed: !b.collapsed } : b)));
  }

  /* ---- drag to reorder (pointer events, touch-friendly) ----
     window-level move/up listeners survive React re-renders, so the grip node
     being replaced can't strand the gesture (the bug the prototype warns about);
     no setPointerCapture on the grip is needed. */
  function onGripDown(e, id) {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const snapshot = blocks;                       // order is stable until drop
    let started = false, rects = [], dropIndex = snapshot.findIndex((b) => b.id === id);

    const begin = () => {
      started = true;
      rects = snapshot.map((b) => { const c = cardRefs.current[b.id]; if (!c) return null; const r = c.getBoundingClientRect(); return r.top + r.height / 2; });
      setDrag({ id, dropIndex, dy: 0 });
    };
    const onMove = (ev) => {
      if (!started) {
        if (Math.abs(ev.clientY - startY) < 5 && Math.abs(ev.clientX - startX) < 5) return;
        begin();
      }
      const y = ev.clientY;
      let idx = snapshot.length;
      for (let i = 0; i < snapshot.length; i++) {
        if (snapshot[i].id === id) continue;
        const mid = rects[i];
        if (mid != null && y < mid) { idx = i; break; }
      }
      dropIndex = idx;
      setDrag({ id, dropIndex: idx, dy: y - startY });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!started) return;                        // it was a tap, not a drag
      const from = snapshot.findIndex((b) => b.id === id);
      let target = dropIndex;
      const next = snapshot.slice();
      const moving = next.splice(from, 1)[0];
      if (target > from) target--;
      target = Math.max(0, Math.min(next.length, target));
      next.splice(target, 0, moving);
      setBlocks(next);
      setDrag(null); setRun(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  /* ---- run ---- */
  async function doRun() {
    setRun({ running: true }); setRanOnce(true);
    const src = blocks.map((b) => b.code).join("\n");
    let res;
    try { res = await runProgram(src); }
    catch (e) { res = { ok: false, stdout: "", errType: "RuntimeError", errMsg: String((e && e.message) || e), errLine: null }; }
    const assembled = blocks.map((b) => ({ label: b.label, code: b.code }));
    let errLabel = null;
    if (!res.ok) { const loc = blockForLine(res.errLine, blocks); if (loc) errLabel = loc.block.label; }
    setRun({ ok: res.ok, assembled, stdout: (res.stdout || "").replace(/\s+$/, ""), errType: res.errType, errMsg: res.errMsg, errLine: res.errLine, errLabel });
    setBlocks((bs) => bs.map((b) => ({ ...b, collapsed: true })));   // make room for output
    setFocusedId(null);
  }
  const running = !!(run && run.running);
  const n = blocks.length;

  return (
    <React.Fragment>
      <StyleOnce />
      <div className={"cb-app" + (full ? " cb-full" : "")}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={kicker()}>COMPOSE · PYTHON</span>
          <span style={kicker()}>№ {n} BLOCK{n === 1 ? "" : "S"}</span>
        </div>

        <Palette focusedLabel={focused ? focused.label : null} keysHidden={keysHidden} setKeysHidden={setKeysHidden} onInsert={insertToken} />

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
          {blocks.map((b, i) => (
            <React.Fragment key={b.id}>
              {drag && drag.dropIndex === i && <DropLine />}
              <BlockCard b={b}
                focused={b.id === focusedId}
                isErr={!!(run && !run.running && !run.ok && run.errLabel === b.label)}
                dragging={!!(drag && drag.id === b.id)}
                dimmed={!!(drag && drag.id !== b.id)}
                dy={drag && drag.id === b.id ? drag.dy : 0}
                taRefs={taRefs} cardRefs={cardRefs}
                onGripDown={onGripDown} onFocusBlock={setFocusedId}
                onChangeCode={setBlockCode} onToggle={toggleCollapse} onDelete={deleteBlock} />
            </React.Fragment>
          ))}
          {drag && drag.dropIndex === blocks.length && <DropLine />}
          <button type="button" className="cb-press" onClick={addBlock}
            style={{ width: "100%", background: "transparent", border: "1.5px dashed " + C.mute45, borderRadius: "12px", padding: "13px", fontFamily: MONO, fontSize: "13px", fontWeight: 600, color: C.mute, cursor: "pointer" }}>+ Add block</button>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button type="button" className="cb-press2" onClick={doRun} disabled={running}
            style={{ flex: 1, background: C.verm, color: "#fff7ec", border: "1.5px solid " + C.ink, borderRadius: "12px", padding: "14px", fontFamily: UI, fontSize: "15px", fontWeight: 700, boxShadow: SHADOW, cursor: running ? "default" : "pointer", opacity: running ? 0.55 : 1 }}>
            {running ? "▶  Running…" : ranOnce ? "▶  Run again" : "▶  Assemble & run"}
          </button>
          <button type="button" className="cb-press2" onClick={() => setFull((f) => !f)}
            style={{ background: C.paper, color: C.ink, border: "1.5px solid " + C.ink, borderRadius: "12px", padding: "14px 16px", fontFamily: UI, fontSize: "14px", fontWeight: 600, boxShadow: SHADOW, cursor: "pointer" }}>
            {full ? "⤢ Exit full" : "⤢ Fullscreen"}
          </button>
        </div>

        <Outputs run={run} blocks={blocks} />
      </div>
    </React.Fragment>
  );
}

function DropLine() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", height: 0, margin: "-8px 0" }}>
      <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: C.verm }} />
      <span style={{ flex: 1, height: "3px", background: C.verm, borderRadius: "2px" }} />
    </div>
  );
}

/* ---- small shared style helpers ---- */
function kicker() { return { fontFamily: MONO, fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: C.mute }; }
function miniBtn() { return { fontFamily: MONO, fontSize: "11px", fontWeight: 600, background: C.cream, border: "1px solid " + C.ink, borderRadius: "8px", padding: "7px 10px", boxShadow: SHADOW_SM, color: C.ink, cursor: "pointer" }; }
function iconBtn() { return { width: "40px", height: "46px", display: "flex", alignItems: "center", justifyContent: "center", color: C.mute6, background: "none", border: "none", cursor: "pointer", fontFamily: MONO }; }
function stamp() { return { display: "inline-block", fontFamily: MONO, fontSize: "9px", fontWeight: 700, letterSpacing: "1px", color: C.verm, border: "1px solid " + C.verm, background: "rgba(184,65,46,.07)", padding: "3px 6px", borderRadius: "6px", transform: "rotate(-1.5deg)", whiteSpace: "nowrap", flex: "0 0 auto" }; }

window.ComposeBlocks = ComposeBlocks;
