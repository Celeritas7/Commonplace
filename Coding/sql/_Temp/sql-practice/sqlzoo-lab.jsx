/* Commonplace UI kit — SqlZooLab: the real "SQLZoo Practice" page, faithfully.
 *
 * The loop the page is built around:
 *   1. Practice graded SQLZoo-style problems (world / nobel / football) live on
 *      SQLite, one problem at a time via a tab strip.
 *   2. Every Run & Check is logged as an attempt (pass or fail) under the card.
 *   3. A failed attempt can be "Saved to the bank" — in the real app that inserts
 *      into Supabase (commonplace_attempts + commonplace_mistakes), gated on a
 *      magic-link sign-in.
 *   4. Those banked mistakes feed a later Mistake Drill — a quiz you re-solve
 *      yourself, by hand, until each one is fixed.
 *
 * Runs real SQLite (sql.js + the SQLZoo seed). Save-to-bank is simulated here
 * (no live Supabase project), but the sign-in gate, the attempts trail, and the
 * mistake-drill queue all behave exactly as on the live site. */

const ZC = {
  ox: "#8a2f22", ox2: "#6f2317",
  ink: "#211b13", inkSoft: "#564b3a", inkMute: "#8a7c63",
  rule: "#cdbfa3", ruleSoft: "#ddd1b8",
  paper: "#efe7d6", paper2: "#f6f0e2", paper3: "#fbf7ec",
  bg: "#0e1116", bg2: "#161b22", bg3: "#1c2230",
  green: "#6ee29a", cyan: "#56b6c2", amber: "#e3b341", w: "#c9d4e3", dim: "#6b7689",
  ok: "#2f8f5b", err: "#c2502f",
  world: "#2f7d57", nobel: "#7a4ea0", football: "#b06a1f",
};
const ZESC = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ZX = (h) => h.replace(/<[^>]+>/g, ""); // strip the <b> tags in prompts for plain contexts

/* ---- shared SQLite engine (boots once, shared by sandbox + grader) ---- */
function useZooDb() {
  const [db, setDb] = React.useState(null);
  const [state, setState] = React.useState("boot"); // boot | ready | nodb | err
  React.useEffect(() => {
    let cancelled = false;
    if (typeof window.initSqlJs !== "function") { setState("nodb"); return; }
    window.initSqlJs({ locateFile: (f) => (function(){var s=document.querySelector('script[src*="sql-wasm"]');return s?s.src.slice(0,s.src.lastIndexOf("/")+1):"";})() + f })
      .then((SQL) => {
        if (cancelled) return;
        const d = new SQL.Database();
        d.run(window.SQLZOO_SEED || "");
        setDb(d); setState("ready");
      })
      .catch(() => { if (!cancelled) setState("err"); });
    return () => { cancelled = true; };
  }, []);
  return { db, state };
}

/* compare two result sets for the grader (mirrors sqlzoo-lab.js) */
function sameResult(a, b, ordered) {
  if (!a || !b) return false;
  const norm = (r) => r.values.map((row) => row.map((v) => (v == null ? "\u0000" : String(v))).join("\u0001"));
  let ra = norm(a), rb = norm(b);
  if (ra.length !== rb.length) return false;
  if (!ordered) { ra = ra.slice().sort(); rb = rb.slice().sort(); }
  return ra.every((x, i) => x === rb[i]);
}

/* ============================ DATA ============================ */
const ZOO_SCHEMA = window.SQLZOO_SCHEMA || [];
const ZOO_EX = window.SQLZOO_EXERCISES || [];
const DS_TABLES = { world: ["world"], nobel: ["nobel"], football: ["eteam", "game", "goal"] };
const DS_LABEL = { world: "world", nobel: "nobel", football: "football" };
const ZOO_CHIPS = [
  { label: "world · Europe", sql: "SELECT name, population\nFROM world\nWHERE continent = 'Europe'\nORDER BY population DESC;" },
  { label: "nobel · Peace", sql: "SELECT yr, winner\nFROM nobel\nWHERE subject = 'Peace'\nORDER BY yr DESC;" },
  { label: "football · scorers", sql: "SELECT player, teamname, gtime\nFROM goal\nJOIN eteam ON goal.teamid = eteam.id\nWHERE matchid = 1005;" },
];

/* ====================================================================
   SQL SYNTAX HIGHLIGHTING + token tray + fullscreen-capable editor
   (matches the Python practice editor, SQL-flavored)
==================================================================== */
const SQLHL = { kw: "#79b8ff", fn: "#56b6c2", str: "#a6c97a", num: "#e3b341", com: "#6b7689", punct: "#c9d4e3" };
function hlSql(code) {
  const KW = /\b(SELECT|DISTINCT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ON|USING|AS|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|EXISTS|DESC|ASC|UNION|ALL|CASE|WHEN|THEN|ELSE|END|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|PRIMARY|KEY|DEFAULT)\b/gi;
  const FN = /\b(COUNT|SUM|AVG|MIN|MAX|ROUND|ABS|LENGTH|UPPER|LOWER|COALESCE|CAST)\b/gi;
  const NUM = /\b(\d+\.?\d*)\b/g;
  const paint = (t) => ZESC(t)
    .replace(KW, (m) => '<span style="color:' + SQLHL.kw + ';font-weight:bold">' + m + "</span>")
    .replace(FN, (m) => '<span style="color:' + SQLHL.fn + '">' + m + "</span>")
    .replace(NUM, '<span style="color:' + SQLHL.num + '">$1</span>');
  return String(code).split("\n").map((line) => {
    const re = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|--.*$)/g;
    let html = "", idx = 0, m;
    while ((m = re.exec(line)) !== null) {
      html += paint(line.slice(idx, m.index));
      const tok = m[0];
      html += tok.charAt(0) === "-" ? '<span style="color:' + SQLHL.com + ';font-style:italic">' + ZESC(tok) + "</span>" : '<span style="color:' + SQLHL.str + '">' + ZESC(tok) + "</span>";
      idx = m.index + tok.length;
    }
    return html + paint(line.slice(idx));
  }).join("\n");
}

/* which tables this exercise touches → drives the column chips */
function tablesForEx(ex) {
  const found = [];
  if (ex && ex.sol) {
    const re = /\b(?:from|join)\s+("?[a-z_][a-z0-9_]*"?)/gi; let m;
    while ((m = re.exec(ex.sol)) !== null) { const t = m[1].replace(/"/g, "").toLowerCase(); if (found.indexOf(t) < 0) found.push(t); }
  }
  (DS_TABLES[ex && ex.ds] || []).forEach((t) => { if (found.indexOf(t) < 0) found.push(t); });
  return found.length ? found : (DS_TABLES[ex && ex.ds] || []);
}
const COLS_BY_TABLE = {};
ZOO_SCHEMA.forEach((t) => { COLS_BY_TABLE[t.name] = (t.cols || []).slice(); });

const SQL_KW_TOKENS = ["SELECT ", "DISTINCT ", "FROM ", "WHERE ", "AND ", "OR ", "ORDER BY ", "DESC", "GROUP BY ", "HAVING ", "LIMIT ", "JOIN ", "ON ", "COUNT(", "SUM(", "AVG(", "LIKE ", "IN (", "BETWEEN ", "=", "*", ",", "'  '"];

function sqlInsertAtCaret(ta, raw, setCode) {
  if (!ta) return;
  let token = raw, back = 0;
  if (token === "'  '") { token = "''"; back = 1; }
  else if (token === "IN (") { back = 0; }
  else if (/[(]$/.test(token)) { /* caret after ( */ }
  const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, before = v.slice(0, s);
  const needSpace = before.length && !/\s$/.test(before) && !/[(,]$/.test(before) && !/^[\s,)]/.test(token);
  const ins = (needSpace ? " " : "") + token;
  const next = before + ins + v.slice(e);
  setCode(next);
  requestAnimationFrame(() => { ta.focus(); const p = s + ins.length - back; ta.setSelectionRange(p, p); });
}

function SqlKeywordTray({ onInsert, tables }) {
  const [open, setOpen] = React.useState(true);
  const tok = (t, kind) => {
    const label = t === "'  '" ? "' '" : t.trim();
    const sty = kind === "kw" ? { border: "1px solid #f3c2dd", background: "#fbe6f1", color: "#b03a78", fontWeight: 600 }
      : kind === "tbl" ? { border: "1px solid #bcdfca", background: "#e4f3ea", color: "#1f7a4d", fontWeight: 700 }
        : { border: "1px solid #bcdcf3", background: "#e3f0fb", color: "#1f6fa6" };
    return <button key={kind + t} type="button" onClick={() => onInsert(t)}
      style={{ flex: "0 0 auto", fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "6px 11px", borderRadius: "8px", cursor: "pointer", minHeight: "34px", display: "inline-flex", alignItems: "center", userSelect: "none", ...sty }}>{kind === "tbl" ? "▤ " + label : label}</button>;
  };
  return (
    <div style={{ margin: "0 0 0" }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "12px", color: ZC.inkSoft, background: ZC.paper2, border: "1px solid " + (open ? ZC.ox : ZC.ruleSoft), borderRadius: "8px", padding: "8px 13px", cursor: "pointer", minHeight: "38px" }}>
        <span>⌨</span> {open ? "Hide keys" : "Insert keywords & columns"} <span style={{ color: ZC.inkMute, fontSize: "11px" }}>{open ? "⌃" : "⌄"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginTop: "9px" }}>
          <div style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "4px" }}>{SQL_KW_TOKENS.map((t) => tok(t, "kw"))}</div>
          <div style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "4px" }}>
            {(tables || []).map((tn) => [tok(tn, "tbl"), ...(COLS_BY_TABLE[tn] || []).map((c) => tok(c, "id"))])}
          </div>
        </div>
      )}
    </div>
  );
}

function SqlHighlightedEditor({ code, setCode, taRef, onKey, full, placeholder, minHeight }) {
  const preRef = React.useRef(null);
  const sync = () => { const ta = taRef.current, pre = preRef.current; if (ta && pre) { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; } };
  const shared = { margin: 0, border: "none", fontFamily: "var(--font-mono)", fontSize: full ? "15px" : "13.5px", lineHeight: 1.6, padding: full ? "16px" : "12px", whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word", tabSize: 2, letterSpacing: "normal", boxSizing: "border-box" };
  const html = code ? hlSql(code) + "\n" : '<span style="color:' + ZC.dim + '">' + ZESC(placeholder || "") + "</span>";
  return (
    <div style={{ position: "relative", background: ZC.bg, border: "1px solid #2a2f3a", borderRadius: "8px", overflow: "hidden", flex: full ? 1 : "none", display: "flex" }}>
      <pre ref={preRef} aria-hidden="true" style={{ ...shared, position: "absolute", inset: 0, color: ZC.w, overflow: "hidden", pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: html }} />
      <textarea ref={taRef} value={code} onChange={(e) => setCode(e.target.value)} onScroll={sync} onKeyDown={onKey} spellCheck={false}
        style={{ ...shared, position: "relative", width: "100%", flex: full ? 1 : "none", minHeight: full ? "100%" : (minHeight || "150px"), resize: full ? "none" : "vertical", background: "transparent", color: "transparent", WebkitTextFillColor: "transparent", caretColor: ZC.w, outline: "none", overflow: "auto" }} />
    </div>
  );
}

function SqlCodeEditor({ code, setCode, taRef, onCheck, full, setFull, placeholder, tables, minHeight, children, promptHtml, exId, exTitle }) {
  const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); onCheck(); } if (e.key === "Escape" && full) setFull(false); };
  const onInsert = (t) => sqlInsertAtCaret(taRef.current, t, setCode);
  const tray = <SqlKeywordTray onInsert={onInsert} tables={tables} />;
  const editor = <SqlHighlightedEditor code={code} setCode={setCode} taRef={taRef} onKey={onKey} full={full} placeholder={placeholder} minHeight={minHeight} />;
  const controls = (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={onCheck} style={zooBtn("oxrun")}>▶ Run &amp; Check</button>
      <button onClick={() => setFull(!full)} style={zooBtn("ghost")}>{full ? "✕ Exit fullscreen  (Esc)" : "⤢ Fullscreen"}</button>
      {children}
    </div>
  );
  if (full) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: ZC.paper, backgroundImage: "radial-gradient(circle at 16% 10%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 38%), radial-gradient(circle at 86% 80%, rgba(160,138,96,0.10) 0%, rgba(160,138,96,0) 44%)", display: "flex", flexDirection: "column", padding: "20px 24px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: ZC.inkMute }}>SQL editor · fullscreen</span>
          <span style={{ flex: 1 }} />
          <button onClick={() => setFull(false)} style={zooBtn("ghost")}>✕ Exit (Esc)</button>
        </div>
        {promptHtml && (
          <div style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid " + ZC.ruleSoft }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              {exId && <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#fff", background: ZC.inkMute, borderRadius: "5px", padding: "2px 7px" }}>{exId.toUpperCase()}</span>}
              {exTitle && <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "18px", color: ZC.ink }}>{exTitle}</span>}
            </div>
            <p style={{ margin: 0, color: ZC.inkSoft, fontFamily: "var(--font-body)", fontSize: "16px" }} dangerouslySetInnerHTML={{ __html: promptHtml }} />
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
function Sandbox({ db, state }) {
  const [code, setCode] = React.useState("SELECT name, continent, population\nFROM world\nWHERE continent = 'Europe'\nORDER BY population DESC;");
  const [out, setOut] = React.useState({ kind: "empty", msg: "Run a query to see results." });
  const taRef = React.useRef(null);

  React.useEffect(() => { if (db) exec("SELECT name, continent, population\nFROM world\nWHERE continent = 'Europe'\nORDER BY population DESC;"); }, [db]);

  function exec(sql) {
    if (!db) return;
    const q = (sql != null ? sql : code).trim();
    if (!q) { setOut({ kind: "empty", msg: "Type a query and hit Run." }); return; }
    const t0 = performance.now();
    try {
      const res = db.exec(q); const ms = (performance.now() - t0).toFixed(1);
      if (!res.length) { setOut({ kind: "ok", msg: "✓ Statement ran. No rows returned.", ms }); return; }
      const last = res[res.length - 1];
      setOut({ kind: "grid", cols: last.columns, rows: last.values, ms });
    } catch (e) { setOut({ kind: "err", msg: "✕ " + (e.message || e) }); }
  }
  const setQuery = (sql) => { setCode(sql); exec(sql); if (taRef.current) taRef.current.focus(); };
  const insertCol = (cn) => {
    const ta = taRef.current; if (!ta) { setCode((c) => c + " " + cn); return; }
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, before = v.slice(0, s);
    const ins = (before.length && !/\s$/.test(before) && !/[(,.]$/.test(before) ? " " : "") + cn;
    const next = before + ins + v.slice(e); setCode(next);
    requestAnimationFrame(() => { ta.focus(); const p = s + ins.length; ta.setSelectionRange(p, p); });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: "18px", alignItems: "start" }} className="zoo-lab-grid">
      <aside style={{ background: ZC.paper3, border: "1px solid " + ZC.ruleSoft, borderRadius: "10px", padding: "12px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", letterSpacing: "2px", textTransform: "uppercase", color: ZC.inkMute, marginBottom: "10px" }}>Tables</div>
        {ZOO_SCHEMA.map((t) => <ZooTable key={t.name} t={t} onPeek={() => setQuery("SELECT * FROM " + t.name + " LIMIT 20;")} onCol={insertCol} />)}
      </aside>
      <div style={{ minWidth: 0 }}>
        <div style={{ background: ZC.bg, border: "1px solid #2a2f3a", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", background: ZC.bg2, borderBottom: "1px solid #2a2f3a" }}>
            <span style={{ display: "flex", gap: "6px" }}><Dot c="#ff5f56" /><Dot c="#ffbd2e" /><Dot c="#27c93f" /></span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: ZC.dim, marginLeft: "4px" }}>query editor — ⌘/Ctrl + Enter to run</span>
          </div>
          <textarea ref={taRef} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); exec(); } }}
            style={{ width: "100%", minHeight: "150px", resize: "vertical", border: 0, outline: "none", background: ZC.bg, color: ZC.w, fontFamily: "var(--font-mono)", fontSize: "13.5px", lineHeight: 1.6, padding: "14px", display: "block" }} />
          <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "10px 12px", background: ZC.bg2, borderTop: "1px solid #2a2f3a", flexWrap: "wrap" }}>
            <button onClick={() => exec()} style={zooBtn("run")}>▶ Run</button>
            <button onClick={() => { setCode(""); setOut({ kind: "empty", msg: "Editor cleared." }); if (taRef.current) taRef.current.focus(); }} style={zooBtn("ghost")}>Clear</button>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: ZC.dim }}>last statement's rows are shown</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "12px 0 0" }}>
          {ZOO_CHIPS.map((c) => <ZooChip key={c.label} label={c.label} onClick={() => setQuery(c.sql)} />)}
        </div>
        <div style={{ marginTop: "14px", background: ZC.paper3, border: "1px solid " + ZC.ruleSoft, borderRadius: "10px", padding: "4px", minHeight: "60px", overflow: "auto" }}>
          <ZooResult out={out} light />
        </div>
      </div>
    </div>
  );
}

function Dot({ c }) { return <span style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />; }
function zooBtn(kind) {
  if (kind === "run") return { fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.4px", borderRadius: "7px", padding: "8px 15px", cursor: "pointer", border: "1px solid " + ZC.green, background: ZC.green, color: "#08130b" };
  if (kind === "oxrun") return { fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.4px", borderRadius: "7px", padding: "8px 15px", cursor: "pointer", border: "1px solid " + ZC.ox, background: ZC.ox, color: "#fff" };
  return { fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.4px", borderRadius: "7px", padding: "8px 15px", cursor: "pointer", border: "1px solid #333a47", background: "transparent", color: ZC.dim };
}

function ZooChip({ label, onClick }) {
  const [h, setH] = React.useState(false);
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: h ? ZC.ox : ZC.inkSoft, background: ZC.paper3, border: "1px solid " + (h ? ZC.ox : ZC.ruleSoft), borderRadius: "16px", padding: "5px 11px", cursor: "pointer" }}>{label}</button>;
}

function ZooTable({ t, onPeek, onCol }) {
  const [open, setOpen] = React.useState(false);
  const [h, setH] = React.useState(false);
  return (
    <div style={{ marginBottom: "4px" }}>
      <button onClick={() => { setOpen((o) => !o); onPeek(); }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "7px", background: h ? ZC.paper2 : "none", border: 0, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "12.5px", color: ZC.ink, padding: "5px 6px", borderRadius: "6px", textAlign: "left" }}>
        <span style={{ fontSize: "9px", color: ZC.inkMute, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
        <span style={{ fontWeight: 600, flex: 1 }}>{t.name}</span>
        <span style={{ color: ZC.inkMute, fontSize: "11px" }}>{t.rows}</span>
      </button>
      {open && (
        <div style={{ padding: "2px 0 8px 16px" }}>
          {t.cols.map((cn) => <ZooCol key={cn} cn={cn} onClick={() => onCol(cn)} />)}
        </div>
      )}
    </div>
  );
}
function ZooCol({ cn, onClick }) {
  const [h, setH] = React.useState(false);
  return <button onClick={(e) => { e.stopPropagation(); onClick(); }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: h ? ZC.paper2 : "none", border: 0, cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: h ? ZC.ox : ZC.inkSoft, padding: "3px 6px", borderRadius: "5px", textAlign: "left" }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: ZC.rule }} />{cn}
  </button>;
}

function ZooResult({ out, light }) {
  const c = light
    ? { empty: ZC.inkMute, ok: ZC.ok, err: ZC.err, th: ZC.ink, thBg: ZC.paper2, td: ZC.inkSoft, foot: ZC.inkMute, line: ZC.ruleSoft, thLine: ZC.rule }
    : { empty: ZC.dim, ok: ZC.green, err: "#f0917f", th: ZC.cyan, thBg: ZC.bg3, td: ZC.w, foot: ZC.dim, line: "rgba(255,255,255,0.05)", thLine: "rgba(255,255,255,0.1)" };
  if (out.kind === "empty") return <div style={{ fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "16px", color: c.empty }}>{out.msg}</div>;
  if (out.kind === "ok") return <div style={{ fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "16px", color: c.ok }}>{out.msg}</div>;
  if (out.kind === "err") return <div style={{ fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "16px", color: c.err, whiteSpace: "pre-wrap" }}>{out.msg}</div>;
  return (
    <React.Fragment>
      <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "var(--font-mono)", fontSize: "12.5px" }}>
        <thead><tr>{out.cols.map((col) => <th key={col} style={{ textAlign: "left", background: c.thBg, color: c.th, borderBottom: "2px solid " + c.thLine, padding: "7px 11px", position: "sticky", top: 0 }}>{col}</th>)}</tr></thead>
        <tbody>
          {out.rows.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j} style={{ borderBottom: "1px solid " + c.line, padding: "6px 11px", color: v == null ? c.foot : c.td, fontStyle: v == null ? "italic" : "normal", textAlign: typeof v === "number" ? "right" : "left" }}>{v == null ? "NULL" : ZESC(v)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: "14px", padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: "11px", color: c.foot }}>
        <span>{out.rows.length} {out.rows.length === 1 ? "row" : "rows"}</span><span>{out.cols.length} cols</span><span>{out.ms} ms</span>
      </div>
    </React.Fragment>
  );
}

/* ====================================================================
   ATTEMPTS STORE — every Run & Check, pass or fail; Save-to-bank gated
   on sign-in; banked failures feed the Mistake Drill.
==================================================================== */
const ATT_KEY = "commonplace_sqlzoo_attempts";
function loadAtt() { try { return JSON.parse(localStorage.getItem(ATT_KEY) || "{}"); } catch (e) { return {}; } }
function saveAtt(a) { try { localStorage.setItem(ATT_KEY, JSON.stringify(a)); } catch (e) {} }
function relTime(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return m + " min ago";
  const h = Math.round(m / 60); if (h < 24) return h + "h ago";
  const d = Math.round(h / 24); if (d < 14) return d + "d ago";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ====================================================================
   GRADED EXERCISES — problem-tab strip, one at a time
==================================================================== */
function Graded({ db, state, user, onReveal, store, onGlobalChange }) {
  const [activeId, setActiveId] = React.useState(ZOO_EX[0].id);
  const [, force] = React.useReducer((x) => x + 1, 0);
  const solved = store.solved;
  const remaining = ZOO_EX.filter((e) => !solved[e.id] || e.id === activeId);
  const allDone = ZOO_EX.every((e) => solved[e.id]);
  const tabs = allDone ? ZOO_EX : remaining;
  const active = ZOO_EX.find((e) => e.id === activeId) || ZOO_EX[0];
  const solvedCount = ZOO_EX.filter((e) => solved[e.id]).length;

  const advance = () => {
    const idx = ZOO_EX.findIndex((e) => e.id === activeId);
    for (let k = 1; k <= ZOO_EX.length; k++) {
      const e = ZOO_EX[(idx + k) % ZOO_EX.length];
      if (!solved[e.id]) { setActiveId(e.id); return; }
    }
  };

  return (
    <div>
      {/* sign-in line */}
      <AuthLine user={user} onReveal={onReveal} />

      {/* progress */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "6px 0 18px" }}>
        <div style={{ flex: 1, height: "9px", background: ZC.paper3, border: "1px solid " + ZC.ruleSoft, borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: (ZOO_EX.length ? Math.round(solvedCount / ZOO_EX.length * 100) : 0) + "%", background: ZC.ox, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: ZC.inkSoft, whiteSpace: "nowrap" }}>{solvedCount} / {ZOO_EX.length} solved</span>
      </div>

      {/* tab strip */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", gap: "12px", background: "rgba(239,231,214,0.92)", backdropFilter: "blur(8px)", borderTop: "1px solid " + ZC.rule, borderBottom: "1px solid " + ZC.rule, margin: "0 0 18px" }}>
        <span style={{ flex: "0 0 auto", fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "1.6px", textTransform: "uppercase", color: ZC.inkMute }} className="zoo-tabs-label">{allDone ? "all solved" : "remaining"}</span>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "9px 0" }}>
          {tabs.map((e) => {
            const isActive = e.id === activeId, isDone = !!solved[e.id], dc = ZC[e.ds] || "#888";
            return (
              <button key={e.id} onClick={() => setActiveId(e.id)}
                style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 13px", borderRadius: "20px", cursor: "pointer", maxWidth: "230px", fontFamily: "var(--font-mono)", border: "1px solid " + (isActive ? ZC.ink : ZC.rule), background: isActive ? ZC.ink : ZC.paper3 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: isActive ? "#fff" : dc }}>{e.id.toUpperCase()}</span>
                <span style={{ fontSize: "12.5px", color: isActive ? ZC.paper : ZC.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span>
                {isDone && <span style={{ color: isActive ? "#8fe0b0" : ZC.ok, fontSize: "11px" }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* active card */}
      <ExCard key={active.id} ex={active} db={db} state={state} user={user} onReveal={onReveal}
        solved={!!solved[active.id]} store={store} onSolvedChange={force} onBank={onGlobalChange} onNext={advance} allDone={allDone} />
    </div>
  );
}

function AuthLine({ user, onReveal }) {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", margin: "0 0 16px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
        <span style={{ color: ZC.inkSoft }}>Signed in as <b style={{ color: ZC.ink }}>{user.email}</b></span>
        <button onClick={() => onReveal.signOut()} style={zooBtn("ghost")}>Sign out</button>
      </div>
    );
  }
  return (
    <div id="zoo-auth" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", margin: "0 0 16px", fontFamily: "var(--font-mono)", fontSize: "12px", outline: onReveal.revealed ? "2px solid " + ZC.ox : "none", outlineOffset: "5px", borderRadius: "4px", padding: onReveal.revealed ? "6px" : 0, transition: "outline 0.2s" }}>
      {sent ? (
        <span style={{ color: ZC.ok }}>✉️ Check your inbox for the sign-in link (demo: <button onClick={() => onReveal.signIn(email)} style={{ ...zooBtn("oxrun"), padding: "4px 9px" }}>simulate click</button>)</span>
      ) : (
        <React.Fragment>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) setSent(true); }}
            style={{ fontFamily: "var(--font-mono)", fontSize: "12px", padding: "8px 11px", border: "1px solid " + ZC.rule, borderRadius: "7px", background: ZC.paper3, color: ZC.ink, minWidth: "210px" }} />
          <button onClick={() => { if (email.trim()) setSent(true); }} style={zooBtn("oxrun")}>Email me a link</button>
          <span style={{ color: ZC.inkMute }}>— sign in to bank your mistakes</span>
        </React.Fragment>
      )}
    </div>
  );
}

function ExCard({ ex, db, state, user, onReveal, solved, store, onSolvedChange, onBank, onNext, allDone }) {
  const [code, setCode] = React.useState(() => store.code[ex.id] || "");
  const [fb, setFb] = React.useState(null); // {ok, msg}
  const [grid, setGrid] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);
  const [showSol, setShowSol] = React.useState(false);
  const [full, setFull] = React.useState(false);
  const [attOpen, setAttOpen] = React.useState((store.att[ex.id] || []).length > 0);
  const taRef = React.useRef(null);
  const attempts = store.att[ex.id] || [];

  const check = () => {
    const q = code.trim();
    if (!db) { setFb({ ok: false, msg: "engine not ready" }); return; }
    if (!q) { setFb({ ok: false, msg: "Write a query first." }); return; }
    let userRes, refRes, msg = "", ok = false;
    try { const r = db.exec(q); userRes = r.length ? r[r.length - 1] : null; }
    catch (e) { msg = "SQL error: " + (e.message || e); setFb({ ok: false, msg: "✕ " + msg }); setGrid(null); store.logAttempt(ex, q, false, msg); onSolvedChange(); return; }
    if (!userRes) { msg = "no rows returned"; setFb({ ok: false, msg: "✕ Your query returned no result set." }); setGrid(null); store.logAttempt(ex, q, false, msg); onSolvedChange(); return; }
    try { const r = db.exec(ex.sol); refRes = r[r.length - 1]; } catch (e) { setFb({ ok: false, msg: "internal: reference failed" }); return; }
    ok = sameResult(userRes, refRes, ex.order);
    msg = ok ? "" : "wrong result";
    setGrid({ cols: userRes.columns, rows: userRes.values });
    setFb(ok ? { ok: true, msg: "✓ Correct — your result matches the reference." } : { ok: false, msg: "✕ Not quite — the rows don't match the expected answer." });
    store.logAttempt(ex, q, ok, msg);
    if (ok) store.markSolved(ex.id);
    onSolvedChange();
    setAttOpen(true);
  };

  const dots = [1, 2, 3].map((d) => <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: d <= ex.diff ? ZC.ox : ZC.rule }} />);

  return (
    <div style={{ background: ZC.paper3, border: "1px solid " + (solved ? ZC.ok : ZC.ruleSoft), borderRadius: "11px", padding: "16px 18px", boxShadow: solved ? "inset 3px 0 0 " + ZC.ok : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#fff", background: solved ? ZC.ok : ZC.inkMute, borderRadius: "5px", padding: "2px 7px" }}>{ex.id.toUpperCase()}</span>
        <span style={{ fontWeight: 600, fontSize: "18px", flex: 1, color: ZC.ink, fontFamily: "var(--font-body)" }}>{ex.title}</span>
        <span style={{ display: "inline-flex", gap: "3px" }}>{dots}</span>
        {solved && <span style={{ color: ZC.ok, fontWeight: 700, marginLeft: "4px" }}>✓</span>}
      </div>
      <p style={{ margin: "10px 0 12px", color: ZC.inkSoft, fontFamily: "var(--font-body)", fontSize: "16px" }} dangerouslySetInnerHTML={{ __html: ex.prompt }} />

      <SqlCodeEditor code={code} setCode={(v) => { setCode(v); store.code[ex.id] = v; saveCode(store); }} taRef={taRef}
        onCheck={check} full={full} setFull={setFull} placeholder="Write your SQL here…  ⌘/Ctrl + Enter to run" tables={tablesForEx(ex)} minHeight="110px"
        promptHtml={ex.prompt} exId={ex.id} exTitle={ex.title}>
        <button onClick={() => setShowHint((s) => !s)} style={zooBtn("ghost")}>{showHint ? "Hide hint" : "Hint"}</button>
        <button onClick={() => setShowSol((s) => !s)} style={zooBtn("ghost")}>{showSol ? "Hide answer" : "Reveal answer"}</button>
      </SqlCodeEditor>

      {showHint && <div style={{ marginTop: "12px", fontSize: "14.5px", color: "#7a5a17", background: "#faf3df", border: "1px solid #e7d6a8", borderRadius: "8px", padding: "9px 12px", fontFamily: "var(--font-body)" }}>{ex.hint}</div>}
      {showSol && <pre style={{ marginTop: "12px", background: ZC.bg, color: ZC.cyan, fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "12px", borderRadius: "8px", overflow: "auto" }}>{ex.sol}</pre>}

      {fb && <div style={{ marginTop: "11px", fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "9px 12px", borderRadius: "8px", color: fb.ok ? ZC.ok : ZC.err, background: fb.ok ? "#e9f5ee" : "#f8ebe6", border: "1px solid " + (fb.ok ? "#b6dcc4" : "#e7c3b4") }}>{fb.msg}</div>}
      {grid && <div style={{ marginTop: "10px", overflow: "auto", background: ZC.paper3, border: "1px solid " + ZC.ruleSoft, borderRadius: "8px", padding: "4px" }}><ZooResult out={{ kind: "grid", cols: grid.cols, rows: grid.rows, ms: "—" }} light /></div>}

      {solved && !allDone && <button onClick={onNext} style={{ marginTop: "14px", width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, background: ZC.ok, color: "#fff", border: "1px solid " + ZC.ok, borderRadius: "8px", padding: "11px 16px", cursor: "pointer" }}>Next →</button>}

      {/* attempts log */}
      <AttemptsLog ex={ex} attempts={attempts} open={attOpen} onToggle={() => setAttOpen((o) => !o)} user={user} onReveal={onReveal} store={store} onChange={onSolvedChange} onBank={onBank} />
    </div>
  );
}

function AttemptsLog({ ex, attempts, open, onToggle, user, onReveal, store, onChange, onBank }) {
  const list = attempts.slice().reverse();
  const [showAll, setShowAll] = React.useState(false);
  const shown = showAll ? list : list.slice(0, 4);
  const tries = list.length;

  return (
    <div style={{ marginTop: "16px", borderTop: "1px dashed " + ZC.rule, paddingTop: "13px" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: "9px", fontFamily: "var(--font-mono)", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: ZC.inkMute, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: "13px", color: ZC.ox }}>↻</span> Your attempts
        <span style={{ color: ZC.ox }}>{tries === 0 ? "none yet" : tries + (tries === 1 ? " try" : " tries")}</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </div>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "12px" }}>
          {tries === 0 && <div style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: ZC.inkMute, fontStyle: "italic" }}>No attempts yet — hit Run &amp; Check and your trail builds here.</div>}
          {shown.map((a, i) => (
            <AttemptRow key={a.t + "-" + i} a={a} user={user} onReveal={onReveal} store={store} ex={ex} onChange={onChange} onBank={onBank} />
          ))}
          {!showAll && list.length > shown.length && (
            <button onClick={() => setShowAll(true)} style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: "11px", color: ZC.ox, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px", padding: "2px 0", textAlign: "left", alignSelf: "flex-start" }}>+ {list.length - shown.length} earlier {list.length - shown.length === 1 ? "attempt" : "attempts"}</button>
          )}
        </div>
      )}
    </div>
  );
}

function AttemptRow({ a, user, onReveal, store, ex, onChange, onBank }) {
  const [saving, setSaving] = React.useState(false);
  const save = () => {
    if (a.saved) return;
    if (!user) { onReveal.reveal(); return; }
    setSaving(true);
    setTimeout(() => { store.bankAttempt(ex, a); setSaving(false); if (onBank) onBank(); else onChange(); }, 420);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "11px", alignItems: "start" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "11px", fontWeight: 800, color: "#fff", marginTop: "1px", background: a.ok ? ZC.ok : ZC.ox }}>{a.ok ? "✓" : "✕"}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.45, color: ZC.w, background: ZC.bg, border: "1px solid " + ZC.bg3, borderRadius: "6px", padding: "7px 10px", whiteSpace: "pre-wrap", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: hlSql(a.q) }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", marginTop: "4px", color: a.ok ? ZC.ok : ZC.ox }}>{a.ok ? "solved" : (a.msg || "wrong result")}</div>
        {!a.ok && (a.saved
          ? <button disabled style={{ marginTop: "7px", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, color: ZC.ok, background: ZC.paper3, border: "1px solid " + ZC.ruleSoft, borderRadius: "6px", padding: "5px 11px", cursor: "default" }}>Saved to bank ✓</button>
          : <button onClick={save} disabled={saving} style={{ marginTop: "7px", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, color: "#fff", background: ZC.ox, border: "1px solid " + ZC.ox, borderRadius: "6px", padding: "5px 11px", cursor: "pointer" }}>{saving ? "Saving…" : "Save to bank"}</button>)}
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: ZC.inkMute, whiteSpace: "nowrap", paddingTop: "3px" }}>{relTime(a.t)}</span>
    </div>
  );
}

function saveCode(store) { try { localStorage.setItem("commonplace_sqlzoo_code", JSON.stringify(store.code)); } catch (e) {} }

/* ====================================================================
   MISTAKE DRILL — the "future quiz": banked failures, re-solved by hand
==================================================================== */
function MistakeDrill({ db, banked, store, onChange }) {
  const [mode, setMode] = React.useState("list"); // list | drill | done
  const [queue, setQueue] = React.useState([]);
  const [idx, setIdx] = React.useState(0);

  const start = (single) => {
    const q = single ? [single] : banked.map((b) => b.key);
    if (!q.length) return;
    setQueue(q); setIdx(0); setMode("drill");
  };

  if (banked.length === 0) {
    return (
      <div style={{ background: ZC.paper3, border: "1px dashed " + ZC.rule, borderRadius: "11px", padding: "22px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", letterSpacing: "2px", textTransform: "uppercase", color: ZC.inkMute, marginBottom: "8px" }}>Nothing banked yet</div>
        <p style={{ margin: 0, color: ZC.inkSoft, fontFamily: "var(--font-body)", fontSize: "16px" }}>When you fail a graded exercise above and tap <b>Save to bank</b>, it lands here as a mistake to re-drill — a personal quiz you solve again, by hand, until it sticks.</p>
      </div>
    );
  }

  if (mode === "drill") {
    const key = queue[idx];
    const b = banked.find((x) => x.key === key) || store.bankByKey(key);
    return <DrillCard db={db} bank={b} index={idx} total={queue.length}
      onResolved={() => { store.resolveMistake(key); onChange(); }}
      onNext={() => { if (idx + 1 < queue.length) setIdx(idx + 1); else setMode("done"); }}
      onQuit={() => setMode("list")} />;
  }

  if (mode === "done") {
    return (
      <div style={{ background: "#e9f5ee", border: "1px solid #b6dcc4", borderRadius: "11px", padding: "26px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "34px" }}>✓</div>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "26px", margin: "6px 0 4px", color: ZC.ink }}>Drill complete</h3>
        <p style={{ margin: "0 0 14px", color: ZC.inkSoft, fontFamily: "var(--font-body)" }}>You worked back through {queue.length} banked {queue.length === 1 ? "mistake" : "mistakes"}.</p>
        <button onClick={() => setMode("list")} style={zooBtn("oxrun")}>Back to the bank</button>
      </div>
    );
  }

  // list
  const unresolved = banked.filter((b) => !b.resolved);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
        <button onClick={() => start(null)} disabled={!unresolved.length} style={{ ...zooBtn("oxrun"), opacity: unresolved.length ? 1 : 0.5, padding: "11px 18px", fontSize: "13px" }}>▶ Start drill · {unresolved.length}</button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: ZC.inkMute }}>{banked.length} banked · {banked.length - unresolved.length} resolved</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {banked.map((b) => (
          <div key={b.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "13px", alignItems: "start", background: ZC.paper3, border: "1px solid " + (b.resolved ? ZC.ruleSoft : "#e7c3b4"), borderRadius: "10px", padding: "13px 15px", opacity: b.resolved ? 0.6 : 1 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#fff", background: ZC[b.ds] || ZC.inkMute, borderRadius: "5px", padding: "3px 8px", marginTop: "2px" }}>{b.exId.toUpperCase()}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "16px", color: ZC.ink }}>{b.title}</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "7px", marginTop: "5px" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: ZC.ox, flex: "0 0 auto", marginTop: "6px" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: ZC.inkSoft }}>{b.reason}</span>
              </div>
            </div>
            {b.resolved
              ? <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", fontWeight: 700, color: ZC.ok, whiteSpace: "nowrap", marginTop: "3px" }}>resolved ✓</span>
              : <button onClick={() => start(b.key)} style={{ ...zooBtn("ghost"), color: ZC.ox, borderColor: ZC.rule, whiteSpace: "nowrap" }}>Drill →</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DrillCard({ db, bank, index, total, onResolved, onNext, onQuit }) {
  const ex = ZOO_EX.find((e) => e.id === bank.exId) || {};
  const [code, setCode] = React.useState("");
  const [fb, setFb] = React.useState(null);
  const [done, setDone] = React.useState(false);
  const [full, setFull] = React.useState(false);
  const taRef = React.useRef(null);

  const check = () => {
    const q = code.trim(); if (!db || !q) { setFb({ ok: false, msg: "Write a query first." }); return; }
    let userRes, refRes;
    try { const r = db.exec(q); userRes = r.length ? r[r.length - 1] : null; } catch (e) { setFb({ ok: false, msg: "✕ SQL error: " + (e.message || e) }); return; }
    if (!userRes) { setFb({ ok: false, msg: "✕ No result set." }); return; }
    try { const r = db.exec(ex.sol); refRes = r[r.length - 1]; } catch (e) { setFb({ ok: false, msg: "internal error" }); return; }
    const ok = sameResult(userRes, refRes, ex.order);
    setFb(ok ? { ok: true, msg: "✓ Fixed! This mistake is cleared from the bank." } : { ok: false, msg: "✕ Not yet — " + bank.reason + ". Adjust and run again." });
    if (ok) { setDone(true); onResolved(); }
  };

  return (
    <div style={{ background: ZC.paper3, border: "1px solid " + ZC.rule, borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: ZC.paper2, borderBottom: "1px solid " + ZC.ruleSoft }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: ZC.ox }}>Mistake Drill</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: ZC.inkMute }}>{index + 1} / {total}</span>
        <button onClick={onQuit} style={{ marginLeft: "auto", ...zooBtn("ghost"), padding: "5px 11px", fontSize: "11px", color: ZC.inkMute, borderColor: ZC.ruleSoft }}>Quit</button>
      </div>
      <div style={{ padding: "18px 18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "8px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#fff", background: ZC[bank.ds] || ZC.inkMute, borderRadius: "5px", padding: "2px 7px" }}>{bank.exId.toUpperCase()}</span>
          <span style={{ fontWeight: 600, fontSize: "18px", color: ZC.ink, fontFamily: "var(--font-body)" }}>{bank.title}</span>
        </div>
        <p style={{ margin: "0 0 6px", color: ZC.inkSoft, fontFamily: "var(--font-body)", fontSize: "16px" }} dangerouslySetInnerHTML={{ __html: ex.prompt || "" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "7px", margin: "0 0 12px", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: ZC.ox }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ZC.ox }} />you missed this before: {bank.reason}
        </div>
        <SqlCodeEditor code={code} setCode={setCode} taRef={taRef} onCheck={check} full={full} setFull={setFull}
          placeholder="Solve it yourself this time…" tables={tablesForEx(ex)} minHeight="110px"
          promptHtml={ex.prompt} exId={bank.exId} exTitle={bank.title} />
        {done && <button onClick={onNext} style={{ ...zooBtn("run"), marginTop: "10px" }}>{index + 1 < total ? "Next mistake →" : "Finish drill ✓"}</button>}
        {fb && <div style={{ marginTop: "11px", fontFamily: "var(--font-mono)", fontSize: "12.5px", padding: "9px 12px", borderRadius: "8px", color: fb.ok ? ZC.ok : ZC.err, background: fb.ok ? "#e9f5ee" : "#f8ebe6", border: "1px solid " + (fb.ok ? "#b6dcc4" : "#e7c3b4") }}>{fb.msg}</div>}
      </div>
    </div>
  );
}

/* ====================================================================
   SHARED HEAD
==================================================================== */
function ZSHead({ title, sub }) {
  return (
    <React.Fragment>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "30px", margin: "0 0 4px", color: ZC.ink }}>{title}</h2>
      <p style={{ color: ZC.inkSoft, margin: "0 0 18px", fontFamily: "var(--font-body)", fontSize: "16px", textWrap: "pretty" }} dangerouslySetInnerHTML={{ __html: sub }} />
    </React.Fragment>
  );
}

/* ====================================================================
   STORE (mistake bank + attempts + solved) — localStorage-backed
==================================================================== */
function makeStore(force) {
  const att = loadAtt();
  let code = {}; try { code = JSON.parse(localStorage.getItem("commonplace_sqlzoo_code") || "{}"); } catch (e) {}
  let solved = {}; try { solved = JSON.parse(localStorage.getItem("commonplace_sqlzoo_solved") || "{}"); } catch (e) {}
  let bank = {}; try { bank = JSON.parse(localStorage.getItem("commonplace_sqlzoo_bank") || "{}"); } catch (e) {}
  const persist = () => { try {
    localStorage.setItem("commonplace_sqlzoo_solved", JSON.stringify(solved));
    localStorage.setItem("commonplace_sqlzoo_bank", JSON.stringify(bank));
  } catch (e) {} };
  return {
    att, code, solved, bank,
    logAttempt(ex, q, ok, msg) {
      const arr = att[ex.id] || (att[ex.id] = []);
      const last = arr[arr.length - 1];
      if (!(last && last.q === q && last.ok === ok)) { arr.push({ q, ok, msg, t: Date.now() }); if (arr.length > 25) arr.shift(); saveAtt(att); }
    },
    markSolved(id) { solved[id] = true; persist(); },
    bankAttempt(ex, a) {
      a.saved = true; saveAtt(att);
      const key = ex.id + ":" + a.t;
      bank[key] = { key, exId: ex.id, ds: ex.ds, title: ex.title, reason: capitalize(a.msg || "wrong result"), resolved: false, t: a.t };
      persist();
    },
    bankByKey(key) { return bank[key]; },
    resolveMistake(key) { if (bank[key]) { bank[key].resolved = true; persist(); } },
    bankedList() { return Object.values(bank).sort((a, b) => a.t - b.t); },
  };
}
function capitalize(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }

/* ====================================================================
   PAGE
==================================================================== */
function SqlZooLab({ onBack }) {
  const { db, state } = useZooDb();
  const [, force] = React.useReducer((x) => x + 1, 0);
  const storeRef = React.useRef(null);
  if (!storeRef.current) storeRef.current = makeStore(force);
  const store = storeRef.current;

  const [user, setUser] = React.useState(null);
  const revealRef = React.useRef({ revealed: false });
  const onReveal = {
    get revealed() { return revealRef.current.revealed; },
    reveal() { revealRef.current.revealed = true; force(); const el = document.getElementById("zoo-auth"); if (el) { const i = el.querySelector("input"); if (i) i.focus(); } },
    signIn(email) { setUser({ email: email || "you@email.com", id: "demo-user" }); revealRef.current.revealed = false; },
    signOut() { setUser(null); },
  };

  const ledColor = state === "ready" ? ZC.ok : state === "err" || state === "nodb" ? ZC.err : ZC.amber;
  const ledText = state === "ready" ? "engine ready — datasets loaded" : state === "nodb" ? "offline — connect to load the engine" : state === "err" ? "engine failed to load" : "loading SQL engine…";

  const banked = store.bankedList();

  return (
    <div>
      {/* breadcrumb-ish back row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: ZC.inkMute, marginBottom: "26px" }}>
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ color: ZC.inkMute, textDecoration: "none" }}>SQL</a>
        <span style={{ color: ZC.rule }}>/</span>
        <span style={{ color: ZC.ink }}>SQLZoo Practice</span>
      </div>

      <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", letterSpacing: "2px", textTransform: "uppercase", color: ZC.inkMute, marginBottom: "8px" }}>Self-directed practice</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "44px", lineHeight: 1.06, margin: "0 0 8px", color: ZC.ink }}>SQLZoo-style Practice</h1>
      <p style={{ fontSize: "19px", color: ZC.inkSoft, maxWidth: "64ch", margin: "0 0 18px", fontFamily: "var(--font-body)", textWrap: "pretty" }}>Three classic teaching datasets — <b>world</b>, <b>nobel</b>, and a sample <b>football</b> tournament — running live in your browser on SQLite. Explore them freely, or work the graded exercises and have your answers checked instantly.</p>
      <div style={{ display: "flex", alignItems: "center", gap: "9px", fontFamily: "var(--font-mono)", fontSize: "12px", color: ZC.inkMute, margin: "4px 0 26px" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: ledColor, boxShadow: "0 0 0 3px " + ledColor + "30" }} />{ledText}
      </div>

      <section style={{ marginTop: "10px" }}>
        <ZSHead title="Free query" sub="Run anything. Click a table to peek, click a column to drop its name into the editor. This sandbox is yours." />
        <Sandbox db={db} state={state} />
      </section>

      <section style={{ marginTop: "44px" }}>
        <ZSHead title="Graded exercises" sub="Write a query, hit <b>Run &amp; Check</b>. Your result is compared against a reference answer — order is checked only where the question asks for it. Every attempt is logged below the problem; a failed one can be <b>saved to your bank</b> to re-drill later." />
        <Graded db={db} state={state} user={user} onReveal={onReveal} store={store} onGlobalChange={force} />
      </section>

      <section style={{ marginTop: "44px" }}>
        <ZSHead title="Mistake Drill" sub="Your banked failures, turned into a quiz you re-solve by hand — no peeking — until each one is fixed and drops off the list." />
        <MistakeDrill db={db} banked={banked} store={store} onChange={force} />
      </section>

      <footer style={{ marginTop: "60px", paddingTop: "18px", borderTop: "1px solid " + ZC.rule, fontFamily: "var(--font-mono)", fontSize: "11px", color: ZC.inkMute, lineHeight: 1.6 }}>
        Datasets are original/representative reconstructions modelled on the classic SQLZoo tutorial schemas — not copied from SQLZoo. Engine: sql.js (SQLite WASM), in your browser. In the live app, “Save to bank” writes to Supabase (commonplace_attempts + commonplace_mistakes) behind a magic-link sign-in; here it’s simulated on this device.
      </footer>

      <style dangerouslySetInnerHTML={{ __html: "@media (max-width:760px){.zoo-lab-grid{grid-template-columns:1fr!important}}@media (max-width:680px){.zoo-tabs-label{display:none!important}}" }} />
    </div>
  );
}

window.SqlZooLab = SqlZooLab;
