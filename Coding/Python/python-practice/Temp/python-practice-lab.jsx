/* Commonplace UI kit — PythonPracticeLab: the §III practice loop, SQLZoo-style.
 *
 * Same UX as the SQL practice, Python-flavored (green) and powered by a real
 * in-browser CPython (Pyodide):
 *   1. Work graded problems one at a time via a tab strip; attempted/solved ones
 *      hide so there is nothing to scroll past.
 *   2. Write & run real Python — Run & Check feeds any sample input to input(),
 *      captures stdout, and compares it to the expected output.
 *   3. Every attempt is logged; a failed one can be "Saved to the bank"
 *      (Supabase commonplace_attempts + commonplace_mistakes in the live app,
 *      gated on magic-link sign-in).
 *   4. Banked mistakes become a Mistake Drill — a quiz you re-solve by hand.
 *
 * Extras over the SQL version: a fullscreen editor (Python gets long) and a
 * tap-to-insert keyword/builtin tray. */

const PP = {
  green: "#2f6b4f", green2: "#3c8362", greenDk: "#234f3b", greenDeep: "#16352a",
  sage: "#7fa68b", sageSoft: "#dde7dd", brass: "#a98a4b",
  ink: "#1a2820", inkSoft: "#41564a", inkMute: "#7a8c80",
  rule: "#cdbfa3", ruleSoft: "#d2dacb",
  paper: "#efe7d6", paper2: "#f4f5ec", paper3: "#fbfcf6",
  bg: "#16352a", bg2: "#0f261e", bg3: "#1e4636", w: "#d7e8dd", dim: "#7e9486",
  ok: "#2f8f5b", err: "#b3261e",
  kw: "#e08aa6", bi: "#8fd0b0", strc: "#a6c97a", num: "#e0b36b", com: "#7e9486",
};
const PESC = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const PYEX = window.PY_PRACTICE_EX || [];

/* ---- python highlighter (matches the Python page) ---- */
function hlPyP(code) {
  const kw = /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g;
  const bi = /\b(print|input|len|range|int|str|float|list|dict|set|tuple|bool|abs|sum|min|max|enumerate|zip|map|filter|sorted|open|type|isinstance|round|join|split)\b/g;
  const num = /\b(\d+\.?\d*)\b/g;
  const paint = (t) => PESC(t).replace(kw, '<span style="color:' + PP.kw + '">$1</span>').replace(bi, '<span style="color:' + PP.bi + '">$1</span>').replace(num, '<span style="color:' + PP.num + '">$1</span>');
  return String(code).split("\n").map((line) => {
    const re = /("""[\s\S]*?"""|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|#.*$)/g;
    let html = "", idx = 0, m;
    while ((m = re.exec(line)) !== null) {
      html += paint(line.slice(idx, m.index));
      const tok = m[0];
      html += tok.charAt(0) === "#" ? '<span style="color:' + PP.com + ';font-style:italic">' + PESC(tok) + "</span>" : '<span style="color:' + PP.strc + '">' + PESC(tok) + "</span>";
      idx = m.index + tok.length;
    }
    return html + paint(line.slice(idx));
  }).join("\n");
}

/* ---- shared Pyodide engine (boots once) ---- */
function usePyodide() {
  const [py, setPy] = React.useState(null);
  const [state, setState] = React.useState("boot"); // boot | ready | nodb | err
  React.useEffect(() => {
    let cancelled = false;
    if (typeof window.loadPyodide !== "function") { setState("nodb"); return; }
    window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" })
      .then((p) => { if (!cancelled) { setPy(p); setState("ready"); } })
      .catch(() => { if (!cancelled) setState("err"); });
    return () => { cancelled = true; };
  }, []);
  return { py, state };
}

/* run user code with a stdin feed; returns {stdout, err} */
async function runPy(py, code, feed) {
  const harness = "import sys, builtins, io\n__out = io.StringIO()\nsys.stdout = __out\n__feed = " + JSON.stringify(feed || []) + "\n__ii = [0]\ndef __inp(prompt=''):\n    if __ii[0] < len(__feed):\n        v = __feed[__ii[0]]; __ii[0] += 1; return v\n    return ''\nbuiltins.input = __inp\n";
  await py.runPythonAsync(harness);
  let err = null;
  try { await py.runPythonAsync(code); }
  catch (e) { err = String(e.message || e); }
  let stdout = "";
  try { stdout = py.runPython("__out.getvalue()"); } catch (_) {}
  return { stdout, err };
}
const normOut = (s) => String(s == null ? "" : s).replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/g, "")).join("\n").replace(/\n+$/g, "");
const onlyTraceback = (e) => { const lines = String(e).trim().split("\n"); return lines[lines.length - 1] || "error"; };

/* ====================================================================
   ATTEMPTS + BANK STORE (localStorage-backed) — the future-quiz source
==================================================================== */
function makePyStore() {
  let att = {}; try { att = JSON.parse(localStorage.getItem("commonplace_pypractice_attempts") || "{}"); } catch (e) {}
  let code = {}; try { code = JSON.parse(localStorage.getItem("commonplace_pypractice_code") || "{}"); } catch (e) {}
  let solved = {}; try { solved = JSON.parse(localStorage.getItem("commonplace_pypractice_solved") || "{}"); } catch (e) {}
  let bank = {}; try { bank = JSON.parse(localStorage.getItem("commonplace_pypractice_bank") || "{}"); } catch (e) {}
  const saveAtt = () => { try { localStorage.setItem("commonplace_pypractice_attempts", JSON.stringify(att)); } catch (e) {} };
  const persist = () => { try {
    localStorage.setItem("commonplace_pypractice_solved", JSON.stringify(solved));
    localStorage.setItem("commonplace_pypractice_bank", JSON.stringify(bank));
  } catch (e) {} };
  return {
    att, code, solved, bank,
    saveCode() { try { localStorage.setItem("commonplace_pypractice_code", JSON.stringify(code)); } catch (e) {} },
    logAttempt(ex, q, ok, msg) {
      const arr = att[ex.id] || (att[ex.id] = []);
      const last = arr[arr.length - 1];
      if (!(last && last.q === q && last.ok === ok)) { arr.push({ q, ok, msg, t: Date.now() }); if (arr.length > 25) arr.shift(); saveAtt(); }
    },
    markSolved(id) { solved[id] = true; persist(); },
    bankAttempt(ex, a) {
      a.saved = true; saveAtt();
      const key = ex.id + ":" + a.t;
      bank[key] = { key, exId: ex.id, sec: ex.sec, title: ex.title, reason: capPy(a.msg || "wrong output"), resolved: false, t: a.t };
      persist();
    },
    bankByKey(key) { return bank[key]; },
    resolveMistake(key) { if (bank[key]) { bank[key].resolved = true; persist(); } },
    bankedList() { return Object.values(bank).sort((a, b) => a.t - b.t); },
  };
}
function capPy(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
function relTimeP(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return m + " min ago";
  const h = Math.round(m / 60); if (h < 24) return h + "h ago";
  const d = Math.round(h / 24); if (d < 14) return d + "d ago";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---- buttons ---- */
function ppBtn(kind) {
  const base = { fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.3px", borderRadius: "7px", padding: "8px 15px", cursor: "pointer" };
  if (kind === "run") return { ...base, background: PP.green, color: "#fff", border: "1px solid " + PP.green };
  if (kind === "go") return { ...base, background: PP.green2, color: "#08130b", border: "1px solid " + PP.green2 };
  return { ...base, background: "transparent", color: PP.inkMute, border: "1px solid " + PP.ruleSoft };
}

/* ====================================================================
   KEYWORD TRAY — tap to insert at the caret
==================================================================== */
const PY_TOKENS_KW = ["def ", "for ", "while ", "if ", "elif ", "else:", "in ", "range(", "return ", "import ", "not ", "and ", "or ", "True", "False", "None"];
const PY_TOKENS_BI = ["print(", "input(", "len(", "int(", "str(", "sum(", "sorted(", "enumerate(", "\":\"", "[]", "{}", "\"  \""];

function KeywordTray({ onInsert }) {
  const [open, setOpen] = React.useState(true);
  const tokBtn = (t, accent) => {
    const label = t === "\"  \"" ? '" "' : t.trim();
    return (
      <button key={t} type="button" onClick={() => onInsert(t)}
        style={{ flex: "0 0 auto", fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "6px 11px", borderRadius: "8px", cursor: "pointer", minHeight: "34px", display: "inline-flex", alignItems: "center", userSelect: "none",
          border: "1px solid " + (accent === "kw" ? "#cbb3d8" : "#bcdfca"), background: accent === "kw" ? "#f3e9f6" : "#e4f3ea", color: accent === "kw" ? "#7a4ea0" : PP.greenDk, fontWeight: accent === "kw" ? 600 : 500 }}>{label}</button>
    );
  };
  return (
    <div style={{ margin: "10px 0 0" }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "12px", color: PP.inkSoft, background: PP.paper2, border: "1px solid " + (open ? PP.green : PP.ruleSoft), borderRadius: "8px", padding: "8px 13px", cursor: "pointer", minHeight: "38px" }}>
        <span>⌨</span> {open ? "Hide keys" : "Insert keywords & builtins"} <span style={{ color: PP.inkMute, fontSize: "11px" }}>{open ? "⌃" : "⌄"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginTop: "9px" }}>
          <div style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "4px" }}>{PY_TOKENS_KW.map((t) => tokBtn(t, "kw"))}</div>
          <div style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "4px" }}>{PY_TOKENS_BI.map((t) => tokBtn(t, "bi"))}</div>
        </div>
      )}
    </div>
  );
}

/* helper: insert text at a textarea's caret, updating React via the setter */
function insertAtCaret(ta, raw, setCode) {
  if (!ta) return;
  let token = raw, back = 0;
  if (token === "\"  \"") { token = '""'; back = 1; }
  else if (token === "[]" || token === "{}") { back = 1; }
  else if (token === "\":\"") { token = '":"'; }
  const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, before = v.slice(0, s);
  const needSpace = before.length && !/\s$/.test(before) && !/[(.[]$/.test(before) && !/^[\s)\]:,]/.test(token);
  const ins = (needSpace ? " " : "") + token;
  const next = before + ins + v.slice(e);
  setCode(next);
  requestAnimationFrame(() => { ta.focus(); const p = s + ins.length - back; ta.setSelectionRange(p, p); });
}

/* ====================================================================
   CODE EDITOR (inline + fullscreen) with run controls
==================================================================== */
/* A syntax-highlighted code editor: a colored <pre> sits under a transparent
   <textarea> (caret + selection stay live, the colors show through). */
function HighlightedEditor({ code, setCode, taRef, onKey, full, placeholder }) {
  const preRef = React.useRef(null);
  const sync = () => { const ta = taRef.current, pre = preRef.current; if (ta && pre) { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; } };
  const shared = {
    margin: 0, border: "none", fontFamily: "var(--font-mono)", fontSize: full ? "15px" : "13px",
    lineHeight: 1.6, padding: full ? "16px" : "12px", whiteSpace: "pre-wrap", overflowWrap: "break-word",
    wordBreak: "break-word", tabSize: 4, letterSpacing: "normal", boxSizing: "border-box",
  };
  const html = code
    ? hlPyP(code) + "\n"
    : '<span style="color:' + PP.dim + '">' + PESC(placeholder || "") + "</span>";
  return (
    <div style={{ position: "relative", background: PP.bg, border: "1px solid " + PP.bg3, borderRadius: "8px", overflow: "hidden", flex: full ? 1 : "none", display: "flex" }}>
      <pre ref={preRef} aria-hidden="true" style={{ ...shared, position: "absolute", inset: 0, color: PP.w, overflow: "hidden", pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: html }} />
      <textarea ref={taRef} value={code} onChange={(e) => setCode(e.target.value)} onScroll={sync} onKeyDown={onKey} spellCheck={false}
        style={{ ...shared, position: "relative", width: "100%", flex: full ? 1 : "none", minHeight: full ? "100%" : "150px", resize: full ? "none" : "vertical", background: "transparent", color: "transparent", WebkitTextFillColor: "transparent", caretColor: PP.w, outline: "none", overflow: "auto" }} />
    </div>
  );
}

function CodeEditor({ code, setCode, onRun, onCheck, running, taRef, full, setFull, placeholder, stdin, promptHtml, exId, exTitle }) {
  const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); onCheck(); } if (e.key === "Escape" && full) setFull(false); };
  const onInsert = (t) => insertAtCaret(taRef.current, t, setCode);
  const tray = <KeywordTray onInsert={onInsert} />;
  const editor = <HighlightedEditor code={code} setCode={setCode} taRef={taRef} onKey={onKey} full={full} placeholder={placeholder} />;
  const controls = (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={onCheck} disabled={running} style={{ ...ppBtn("run"), opacity: running ? 0.6 : 1 }}>{running ? "Running…" : "▶ Run & Check"}</button>
      <button onClick={() => setFull(!full)} style={ppBtn("ghost")}>{full ? "✕ Exit fullscreen  (Esc)" : "⤢ Fullscreen"}</button>
      {stdin && stdin.length > 0 && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: PP.inkMute }}>sample input: <span style={{ color: PP.green }}>{stdin.join(" ⏎ ")}</span></span>
      )}
    </div>
  );

  if (full) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: PP.greenDeep, display: "flex", flexDirection: "column", padding: "18px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: PP.sage }}>Editor · fullscreen</span>
          <span style={{ flex: 1 }} />
          <button onClick={() => setFull(false)} style={{ ...ppBtn("ghost"), color: PP.w, borderColor: "rgba(255,255,255,0.25)" }}>✕ Exit (Esc)</button>
        </div>
        {promptHtml && (
          <div style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              {exId && <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#08130b", background: PP.sage, borderRadius: "5px", padding: "2px 7px" }}>{exId.toUpperCase()}</span>}
              {exTitle && <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "18px", color: "#fff" }}>{exTitle}</span>}
            </div>
            <p style={{ margin: 0, color: "rgba(231,240,232,0.85)", fontFamily: "var(--font-body)", fontSize: "16px" }} dangerouslySetInnerHTML={{ __html: promptHtml }} />
          </div>
        )}
        <div style={{ marginBottom: "12px" }}>{tray}</div>
        {editor}
        <div style={{ marginTop: "12px" }}>{controls}</div>
      </div>
    );
  }
  return <div>{tray}<div style={{ marginTop: "10px" }}>{editor}</div><div style={{ marginTop: "10px" }}>{controls}</div></div>;
}

/* ====================================================================
   GRADED PRACTICE — tab strip + one card at a time
==================================================================== */
function PyGraded({ py, state, user, onReveal, store, onGlobalChange }) {
  const [activeId, setActiveId] = React.useState(PYEX[0].id);
  const [, force] = React.useReducer((x) => x + 1, 0);
  const solved = store.solved;
  const remaining = PYEX.filter((e) => !solved[e.id] || e.id === activeId);
  const allDone = PYEX.every((e) => solved[e.id]);
  const tabs = allDone ? PYEX : remaining;
  const active = PYEX.find((e) => e.id === activeId) || PYEX[0];
  const solvedCount = PYEX.filter((e) => solved[e.id]).length;
  const advance = () => {
    const idx = PYEX.findIndex((e) => e.id === activeId);
    for (let k = 1; k <= PYEX.length; k++) { const e = PYEX[(idx + k) % PYEX.length]; if (!solved[e.id]) { setActiveId(e.id); return; } }
  };
  return (
    <div>
      <PyAuthLine user={user} onReveal={onReveal} />
      <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "6px 0 18px" }}>
        <div style={{ flex: 1, height: "9px", background: PP.paper2, border: "1px solid " + PP.ruleSoft, borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: (PYEX.length ? Math.round(solvedCount / PYEX.length * 100) : 0) + "%", background: PP.green, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: PP.inkSoft, whiteSpace: "nowrap" }}>{solvedCount} / {PYEX.length} solved</span>
      </div>
      <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", gap: "12px", background: "rgba(239,231,214,0.92)", backdropFilter: "blur(8px)", borderTop: "1px solid " + PP.rule, borderBottom: "1px solid " + PP.rule, margin: "0 0 18px" }}>
        <span style={{ flex: "0 0 auto", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "1.6px", textTransform: "uppercase", color: PP.inkMute }} className="pyp-tabs-label">{allDone ? "all solved" : "remaining"}</span>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "9px 0" }}>
          {tabs.map((e) => {
            const isActive = e.id === activeId, isDone = !!solved[e.id];
            return (
              <button key={e.id} onClick={() => setActiveId(e.id)}
                style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 13px", borderRadius: "20px", cursor: "pointer", maxWidth: "240px", fontFamily: "var(--font-mono)", border: "1px solid " + (isActive ? PP.ink : PP.rule), background: isActive ? PP.ink : PP.paper3 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: isActive ? "#fff" : PP.green }}>{e.id.toUpperCase()}</span>
                <span style={{ fontSize: "12.5px", color: isActive ? PP.paper : PP.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span>
                {isDone && <span style={{ color: isActive ? "#8fe0b0" : PP.ok, fontSize: "11px" }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
      <PyExCard key={active.id} ex={active} py={py} state={state} user={user} onReveal={onReveal}
        solved={!!solved[active.id]} store={store} onSolvedChange={force} onBank={onGlobalChange} onNext={advance} allDone={allDone} />
    </div>
  );
}

function PyAuthLine({ user, onReveal }) {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", margin: "0 0 16px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        <span style={{ color: PP.inkSoft }}>Signed in as <b style={{ color: PP.ink }}>{user.email}</b></span>
        <button onClick={() => onReveal.signOut()} style={ppBtn("ghost")}>Sign out</button>
      </div>
    );
  }
  return (
    <div id="pyp-auth" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", margin: "0 0 16px", fontFamily: "var(--font-mono)", fontSize: "12px", outline: onReveal.revealed ? "2px solid " + PP.green : "none", outlineOffset: "5px", borderRadius: "4px", padding: onReveal.revealed ? "6px" : 0, transition: "outline 0.2s" }}>
      {sent ? (
        <span style={{ color: PP.ok }}>✉️ Check your inbox for the sign-in link (demo: <button onClick={() => onReveal.signIn(email)} style={{ ...ppBtn("go"), padding: "4px 9px" }}>simulate click</button>)</span>
      ) : (
        <React.Fragment>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) setSent(true); }}
            style={{ fontFamily: "var(--font-mono)", fontSize: "12px", padding: "8px 11px", border: "1px solid " + PP.rule, borderRadius: "7px", background: PP.paper3, color: PP.ink, minWidth: "210px" }} />
          <button onClick={() => { if (email.trim()) setSent(true); }} style={ppBtn("run")}>Email me a link</button>
          <span style={{ color: PP.inkMute }}>— sign in to bank your mistakes</span>
        </React.Fragment>
      )}
    </div>
  );
}

function PyExCard({ ex, py, state, user, onReveal, solved, store, onSolvedChange, onBank, onNext, allDone }) {
  const [code, setCode] = React.useState(() => store.code[ex.id] || "");
  const [fb, setFb] = React.useState(null);
  const [output, setOutput] = React.useState(null); // {text, isErr}
  const [running, setRunning] = React.useState(false);
  const [showHint, setShowHint] = React.useState(false);
  const [showSol, setShowSol] = React.useState(false);
  const [full, setFull] = React.useState(false);
  const [attOpen, setAttOpen] = React.useState((store.att[ex.id] || []).length > 0);
  const taRef = React.useRef(null);
  const attempts = store.att[ex.id] || [];

  const setCodeP = (v) => { setCode(v); store.code[ex.id] = v; store.saveCode(); };

  const check = async () => {
    const q = code.trim();
    if (!q) { setFb({ ok: false, msg: "Write some code first." }); return; }
    if (state !== "ready" || !py) { setFb({ ok: false, msg: state === "nodb" || state === "err" ? "Python engine offline — connect to the internet to run." : "Python is still loading…" }); return; }
    setRunning(true); setFb(null);
    const { stdout, err } = await runPy(py, q, ex.stdin);
    setRunning(false);
    if (err) {
      const short = onlyTraceback(err);
      setOutput({ text: err, isErr: true });
      setFb({ ok: false, msg: "✕ " + short });
      store.logAttempt(ex, q, false, short);
      onSolvedChange(); setAttOpen(true); return;
    }
    const ok = normOut(stdout) === normOut(ex.expect);
    setOutput({ text: stdout || "(no output)", isErr: false });
    setFb(ok ? { ok: true, msg: "✓ Correct — output matches the expected result." } : { ok: false, msg: "✕ Output doesn't match the expected result yet." });
    store.logAttempt(ex, q, ok, ok ? "" : "wrong output");
    if (ok) store.markSolved(ex.id);
    onSolvedChange(); setAttOpen(true);
  };

  const dots = [1, 2, 3].map((d) => <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: d <= ex.diff ? PP.green : PP.rule }} />);

  return (
    <div style={{ background: PP.paper3, border: "1px solid " + (solved ? PP.ok : PP.ruleSoft), borderRadius: "11px", padding: "16px 18px", boxShadow: solved ? "inset 3px 0 0 " + PP.ok : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#fff", background: solved ? PP.ok : PP.inkMute, borderRadius: "5px", padding: "2px 7px" }}>{ex.id.toUpperCase()}</span>
        <span style={{ fontWeight: 600, fontSize: "18px", flex: 1, color: PP.ink, fontFamily: "var(--font-body)" }}>{ex.title}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: PP.inkMute, marginRight: "2px" }}>{ex.sec.replace(/:.*/, "")}</span>
        <span style={{ display: "inline-flex", gap: "3px" }}>{dots}</span>
        {solved && <span style={{ color: PP.ok, fontWeight: 700, marginLeft: "4px" }}>✓</span>}
      </div>
      <p style={{ margin: "10px 0 12px", color: PP.inkSoft, fontFamily: "var(--font-body)", fontSize: "16px" }} dangerouslySetInnerHTML={{ __html: ex.prompt }} />

      <CodeEditor code={code} setCode={setCodeP} onCheck={check} running={running} taRef={taRef} full={full} setFull={setFull}
        placeholder="Write your Python here…  ⌘/Ctrl + Enter to run" stdin={ex.stdin}
        promptHtml={ex.prompt} exId={ex.id} exTitle={ex.title} />

      <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
        <button onClick={() => setShowHint((s) => !s)} style={ppBtn("ghost")}>{showHint ? "Hide hint" : "Hint"}</button>
        <button onClick={() => setShowSol((s) => !s)} style={ppBtn("ghost")}>{showSol ? "Hide answer" : "Reveal answer"}</button>
      </div>

      {showHint && <div style={{ marginTop: "12px", fontSize: "14.5px", color: "#7a5a17", background: "#faf3df", border: "1px solid #e7d6a8", borderRadius: "8px", padding: "9px 12px", fontFamily: "var(--font-body)" }}>{ex.hint}</div>}
      {showSol && <pre style={{ marginTop: "12px", background: PP.bg, fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "12px", borderRadius: "8px", overflow: "auto", whiteSpace: "pre" }} dangerouslySetInnerHTML={{ __html: hlPyP(ex.sol) }} />}

      {fb && <div style={{ marginTop: "11px", fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "9px 12px", borderRadius: "8px", color: fb.ok ? PP.ok : PP.err, background: fb.ok ? "#e9f5ee" : "#f8ebe6", border: "1px solid " + (fb.ok ? "#b6dcc4" : "#e7c3b4") }}>{fb.msg}</div>}
      {output && (
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "9.5px", letterSpacing: "1.5px", textTransform: "uppercase", color: PP.inkMute, marginBottom: "5px" }}>Output</div>
          <pre style={{ margin: 0, background: PP.bg, color: output.isErr ? "#f0a99e" : PP.w, fontFamily: "var(--font-mono)", fontSize: "12.5px", lineHeight: 1.6, padding: "12px 14px", borderRadius: "8px", overflow: "auto", whiteSpace: "pre-wrap" }}>{output.text}</pre>
        </div>
      )}

      {solved && !allDone && <button onClick={onNext} style={{ marginTop: "14px", width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, background: PP.ok, color: "#fff", border: "1px solid " + PP.ok, borderRadius: "8px", padding: "11px 16px", cursor: "pointer" }}>Next →</button>}

      <PyAttemptsLog ex={ex} attempts={attempts} open={attOpen} onToggle={() => setAttOpen((o) => !o)} user={user} onReveal={onReveal} store={store} onChange={onSolvedChange} onBank={onBank} />
    </div>
  );
}

function PyAttemptsLog({ ex, attempts, open, onToggle, user, onReveal, store, onChange, onBank }) {
  const list = attempts.slice().reverse();
  const [showAll, setShowAll] = React.useState(false);
  const shown = showAll ? list : list.slice(0, 4);
  const tries = list.length;
  return (
    <div style={{ marginTop: "16px", borderTop: "1px dashed " + PP.rule, paddingTop: "13px" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: "9px", fontFamily: "var(--font-mono)", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: PP.inkMute, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: "13px", color: PP.green }}>↻</span> Your attempts
        <span style={{ color: PP.green }}>{tries === 0 ? "none yet" : tries + (tries === 1 ? " try" : " tries")}</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </div>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "12px" }}>
          {tries === 0 && <div style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: PP.inkMute, fontStyle: "italic" }}>No attempts yet — hit Run &amp; Check and your trail builds here.</div>}
          {shown.map((a, i) => <PyAttemptRow key={a.t + "-" + i} a={a} user={user} onReveal={onReveal} store={store} ex={ex} onChange={onChange} onBank={onBank} />)}
          {!showAll && list.length > shown.length && (
            <button onClick={() => setShowAll(true)} style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: "11px", color: PP.green, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px", padding: "2px 0", textAlign: "left", alignSelf: "flex-start" }}>+ {list.length - shown.length} earlier {list.length - shown.length === 1 ? "attempt" : "attempts"}</button>
          )}
        </div>
      )}
    </div>
  );
}

function PyAttemptRow({ a, user, onReveal, store, ex, onChange, onBank }) {
  const [saving, setSaving] = React.useState(false);
  const save = () => {
    if (a.saved) return;
    if (!user) { onReveal.reveal(); return; }
    setSaving(true);
    setTimeout(() => { store.bankAttempt(ex, a); setSaving(false); if (onBank) onBank(); else onChange(); }, 420);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "11px", alignItems: "start" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "11px", fontWeight: 800, color: "#fff", marginTop: "1px", background: a.ok ? PP.ok : PP.err }}>{a.ok ? "✓" : "✕"}</span>
      <div style={{ minWidth: 0 }}>
        <pre style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.5, color: PP.w, background: PP.bg, border: "1px solid " + PP.bg3, borderRadius: "6px", padding: "7px 10px", whiteSpace: "pre-wrap", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: hlPyP(a.q) }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", marginTop: "4px", color: a.ok ? PP.ok : PP.err }}>{a.ok ? "solved" : (a.msg || "wrong output")}</div>
        {!a.ok && (a.saved
          ? <button disabled style={{ marginTop: "7px", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, color: PP.ok, background: PP.paper3, border: "1px solid " + PP.ruleSoft, borderRadius: "6px", padding: "5px 11px", cursor: "default" }}>Saved to bank ✓</button>
          : <button onClick={save} disabled={saving} style={{ marginTop: "7px", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, color: "#fff", background: PP.green, border: "1px solid " + PP.green, borderRadius: "6px", padding: "5px 11px", cursor: "pointer" }}>{saving ? "Saving…" : "Save to bank"}</button>)}
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: PP.inkMute, whiteSpace: "nowrap", paddingTop: "3px" }}>{relTimeP(a.t)}</span>
    </div>
  );
}

/* ====================================================================
   MISTAKE DRILL — banked failures, re-solved by hand
==================================================================== */
function PyMistakeDrill({ py, state, banked, store, onChange }) {
  const [mode, setMode] = React.useState("list");
  const [queue, setQueue] = React.useState([]);
  const [idx, setIdx] = React.useState(0);
  const start = (single) => { const q = single ? [single] : banked.filter((b) => !b.resolved).map((b) => b.key); if (!q.length) return; setQueue(q); setIdx(0); setMode("drill"); };

  if (banked.length === 0) {
    return (
      <div style={{ background: PP.paper3, border: "1px dashed " + PP.rule, borderRadius: "11px", padding: "22px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", letterSpacing: "2px", textTransform: "uppercase", color: PP.inkMute, marginBottom: "8px" }}>Nothing banked yet</div>
        <p style={{ margin: 0, color: PP.inkSoft, fontFamily: "var(--font-body)", fontSize: "16px" }}>When you fail a problem above and tap <b>Save to bank</b>, it lands here as a mistake to re-drill — your own quiz, solved again by hand until it sticks.</p>
      </div>
    );
  }
  if (mode === "drill") {
    const key = queue[idx]; const b = banked.find((x) => x.key === key) || store.bankByKey(key);
    return <PyDrillCard py={py} state={state} bank={b} index={idx} total={queue.length}
      onResolved={() => { store.resolveMistake(key); onChange(); }}
      onNext={() => { if (idx + 1 < queue.length) setIdx(idx + 1); else setMode("done"); }}
      onQuit={() => setMode("list")} />;
  }
  if (mode === "done") {
    return (
      <div style={{ background: "#e9f5ee", border: "1px solid #b6dcc4", borderRadius: "11px", padding: "26px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "34px" }}>✓</div>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "26px", margin: "6px 0 4px", color: PP.ink }}>Drill complete</h3>
        <p style={{ margin: "0 0 14px", color: PP.inkSoft, fontFamily: "var(--font-body)" }}>You worked back through {queue.length} banked {queue.length === 1 ? "mistake" : "mistakes"}.</p>
        <button onClick={() => setMode("list")} style={ppBtn("go")}>Back to the bank</button>
      </div>
    );
  }
  const unresolved = banked.filter((b) => !b.resolved);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
        <button onClick={() => start(null)} disabled={!unresolved.length} style={{ ...ppBtn("go"), opacity: unresolved.length ? 1 : 0.5, padding: "11px 18px", fontSize: "13px" }}>▶ Start drill · {unresolved.length}</button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: PP.inkMute }}>{banked.length} banked · {banked.length - unresolved.length} resolved</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {banked.map((b) => (
          <div key={b.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "13px", alignItems: "start", background: PP.paper3, border: "1px solid " + (b.resolved ? PP.ruleSoft : "#e7c3b4"), borderRadius: "10px", padding: "13px 15px", opacity: b.resolved ? 0.6 : 1 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#fff", background: PP.green, borderRadius: "5px", padding: "3px 8px", marginTop: "2px" }}>{b.exId.toUpperCase()}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "16px", color: PP.ink }}>{b.title}</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "7px", marginTop: "5px" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: PP.green, flex: "0 0 auto", marginTop: "6px" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: PP.inkSoft }}>{b.reason}</span>
              </div>
            </div>
            {b.resolved
              ? <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", fontWeight: 700, color: PP.ok, whiteSpace: "nowrap", marginTop: "3px" }}>resolved ✓</span>
              : <button onClick={() => start(b.key)} style={{ ...ppBtn("ghost"), color: PP.green, borderColor: PP.rule, whiteSpace: "nowrap" }}>Drill →</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PyDrillCard({ py, state, bank, index, total, onResolved, onNext, onQuit }) {
  const ex = PYEX.find((e) => e.id === bank.exId) || {};
  const [code, setCode] = React.useState("");
  const [fb, setFb] = React.useState(null);
  const [output, setOutput] = React.useState(null);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [full, setFull] = React.useState(false);
  const taRef = React.useRef(null);
  const check = async () => {
    const q = code.trim(); if (!q) { setFb({ ok: false, msg: "Write some code first." }); return; }
    if (state !== "ready" || !py) { setFb({ ok: false, msg: "Python engine not ready." }); return; }
    setRunning(true); setFb(null);
    const { stdout, err } = await runPy(py, q, ex.stdin);
    setRunning(false);
    if (err) { setOutput({ text: err, isErr: true }); setFb({ ok: false, msg: "✕ " + onlyTraceback(err) }); return; }
    const ok = normOut(stdout) === normOut(ex.expect);
    setOutput({ text: stdout || "(no output)", isErr: false });
    setFb(ok ? { ok: true, msg: "✓ Fixed! This mistake is cleared from the bank." } : { ok: false, msg: "✕ Not yet — " + bank.reason + ". Adjust and run again." });
    if (ok) { setDone(true); onResolved(); }
  };
  return (
    <div style={{ background: PP.paper3, border: "1px solid " + PP.rule, borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: PP.paper2, borderBottom: "1px solid " + PP.ruleSoft }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: PP.green }}>Mistake Drill</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: PP.inkMute }}>{index + 1} / {total}</span>
        <button onClick={onQuit} style={{ marginLeft: "auto", ...ppBtn("ghost"), padding: "5px 11px", fontSize: "11px" }}>Quit</button>
      </div>
      <div style={{ padding: "18px 18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "8px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#fff", background: PP.green, borderRadius: "5px", padding: "2px 7px" }}>{bank.exId.toUpperCase()}</span>
          <span style={{ fontWeight: 600, fontSize: "18px", color: PP.ink, fontFamily: "var(--font-body)" }}>{bank.title}</span>
        </div>
        <p style={{ margin: "0 0 6px", color: PP.inkSoft, fontFamily: "var(--font-body)", fontSize: "16px" }} dangerouslySetInnerHTML={{ __html: ex.prompt || "" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "7px", margin: "0 0 12px", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: PP.green }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: PP.green }} />you missed this before: {bank.reason}
        </div>
        <CodeEditor code={code} setCode={setCode} onCheck={check} running={running} taRef={taRef} full={full} setFull={setFull}
          placeholder="Solve it yourself this time…" stdin={ex.stdin}
          promptHtml={ex.prompt} exId={bank.exId} exTitle={bank.title} />
        {done && <button onClick={onNext} style={{ ...ppBtn("go"), marginTop: "10px" }}>{index + 1 < total ? "Next mistake →" : "Finish drill ✓"}</button>}
        {fb && <div style={{ marginTop: "11px", fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "9px 12px", borderRadius: "8px", color: fb.ok ? PP.ok : PP.err, background: fb.ok ? "#e9f5ee" : "#f8ebe6", border: "1px solid " + (fb.ok ? "#b6dcc4" : "#e7c3b4") }}>{fb.msg}</div>}
        {output && <pre style={{ marginTop: "10px", background: PP.bg, color: output.isErr ? "#f0a99e" : PP.w, fontFamily: "var(--font-mono)", fontSize: "12.5px", lineHeight: 1.6, padding: "12px 14px", borderRadius: "8px", overflow: "auto", whiteSpace: "pre-wrap", margin: 0 }}>{output.text}</pre>}
      </div>
    </div>
  );
}

/* ====================================================================
   SECTION ENTRY — replaces the old v1/v2 version-chain "100 Days"
==================================================================== */
function PythonPracticeSection({ SecHead }) {
  const { py, state } = usePyodide();
  const [, force] = React.useReducer((x) => x + 1, 0);
  const storeRef = React.useRef(null);
  if (!storeRef.current) storeRef.current = makePyStore();
  const store = storeRef.current;
  const [user, setUser] = React.useState(null);
  const revealRef = React.useRef({ revealed: false });
  const onReveal = {
    get revealed() { return revealRef.current.revealed; },
    reveal() { revealRef.current.revealed = true; force(); const el = document.getElementById("pyp-auth"); if (el) { const i = el.querySelector("input"); if (i) i.focus(); } },
    signIn(email) { setUser({ email: email || "you@email.com", id: "demo-user" }); revealRef.current.revealed = false; },
    signOut() { setUser(null); },
  };
  const banked = store.bankedList();
  const led = state === "ready" ? PP.ok : state === "err" || state === "nodb" ? PP.err : PP.brass;
  const ledText = state === "ready" ? "CPython ready" : state === "nodb" ? "offline — connect to load Python" : state === "err" ? "engine failed to load" : "loading CPython (Pyodide)…";
  const solvedCount = PYEX.filter((e) => store.solved[e.id]).length;

  return (
    <section style={{ margin: "48px 0 0" }}>
      <SecHead n="III" title="Practice & Mistake Bank" count={PYEX.length}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: PP.green, background: PP.sageSoft, border: "1px solid " + PP.sage, borderRadius: "999px", padding: "2px 9px" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: led }} />{ledText}
        </span>
      </SecHead>
      <p style={{ color: PP.inkSoft, fontSize: "16px", fontStyle: "italic", margin: "0 0 18px", fontFamily: "var(--font-body)" }}>
        Work problems one at a time — solved ones drop away so there's nothing to scroll past. Run real Python, and when one trips you up, bank the failure: it comes back as a Mistake Drill you re-solve yourself.
      </p>

      <PyGraded py={py} state={state} user={user} onReveal={onReveal} store={store} onGlobalChange={force} />

      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", margin: "40px 0 14px", paddingBottom: "6px", borderBottom: "1px solid " + PP.ruleSoft }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "24px", lineHeight: 1, letterSpacing: "-0.2px", margin: 0, color: PP.greenDk }}>Mistake Drill</h3>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", fontWeight: 700, color: PP.green, background: PP.sageSoft, border: "1px solid " + PP.sage, borderRadius: "999px", padding: "1px 8px" }}>{banked.filter((b) => !b.resolved).length} to drill</span>
      </div>
      <PyMistakeDrill py={py} state={state} banked={banked} store={store} onChange={force} />

      <p style={{ marginTop: "20px", fontFamily: "var(--font-mono)", fontSize: "11px", lineHeight: 1.6, color: PP.inkMute }}>
        Runs real CPython in your browser via Pyodide (first run downloads ~10&nbsp;MB). In the live app, “Save to bank” writes failures to Supabase (commonplace_attempts + commonplace_mistakes) behind a magic-link sign-in, which seed your future drills; here that step is simulated on this device.
      </p>
    </section>
  );
}

window.PythonPracticeSection = PythonPracticeSection;
