/* app.jsx — Classical Machine Learning interactive book
   Two surfaces: Contents (plated cards + filter/search/progress)
   and a per-chapter Cover page shown before the live notebook. */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const CHAPTERS = window.AI_CHAPTERS;
const GROUPS = window.AI_GROUPS;
/* per-section accent + the 5-stop w-spectrum for small UI accents */
const GROUP_COLORS = {
  "Foundations": "var(--cyan)",
  "Core models & workflow": "var(--violet)",
  "Advanced topics": "var(--magenta)"
};
const SPECTRUM_VARS = ["var(--cyan)", "var(--blue)", "var(--violet)", "var(--magenta)", "var(--solar)"];
const ACCENTS = window.AI_ACCENTS || {};
const NB_BASE = "./html/";   // standalone nbconvert HTML (open directly, no server)
const PROGRESS_KEY = "aistudy.progress.v1";
const ROUTE_KEY = "aistudy.route.v1";

/* ----------------------------------------------------- progress (persisted) */
function useProgress() {
  const [prog, setProg] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
  });
  const setMark = useCallback((id, status) => {
    setProg(prev => {
      const next = { ...prev };
      if (!status || next[id] === status) delete next[id];
      else next[id] = status;
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);
  return [prog, setMark];
}

/* --------------------------------------------------------- hash routing */
function parseHash() {
  const m = (location.hash || "").match(/#\/chapter\/([\w]+)/);
  return m ? { name: "cover", id: m[1] } : { name: "contents" };
}
function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((r) => {
    if (r.name === "cover") location.hash = "#/chapter/" + r.id;
    else location.hash = "";
    try { localStorage.setItem(ROUTE_KEY, JSON.stringify(r)); } catch (e) {}
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, []);
  return [route, go];
}

/* ------------------------------------------------------ 4D motif canvas */
function Motif({ type, seed, hero, accent, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.Motifs) return;
    const cleanup = window.Motifs.mount(ref.current, { type, seed, hero, accent });
    return cleanup;
  }, [type, seed, hero, accent]);
  return <canvas ref={ref} className={className}></canvas>;
}

/* =============================================================== CARD */
function Card({ ch, status, onOpen, onMark }) {
  const cls = "card" + (status === "done" ? " is-done" : status === "revisit" ? " is-rev" : "");
  return (
    <div className={cls} style={{ "--acc": ACCENTS[ch.id] }} onClick={() => onOpen(ch.id)}>
      <div className="plate">
        <Motif type={ch.motif} seed={ch.seed} accent={ACCENTS[ch.id]} />
        <span className="pno mono">{ch.id}</span>
        <span className="dim4">4D · projected</span>
        <span className="flag f-done">✓ understood</span>
        <span className="flag f-rev">↻ revisit</span>
      </div>
      <div className="info">
        <div className="top">
          <span className="tag">{ch.tag}</span>
          {ch.kind === "reference" && <span className="badge ref">Reference</span>}
          {ch.kind === "extra" && <span className="badge extra">Extra</span>}
        </div>
        <h3>{ch.title}</h3>
        <p>{ch.lead}</p>
        <div className="foot">
          <div className="meta">
            <span>~{ch.time} min</span>
            <span className="status" onClick={(e) => e.stopPropagation()}>
              <span
                className={"smark" + (status === "done" ? " on-done" : "")}
                title="Mark understood"
                onClick={() => onMark(ch.id, "done")}>✓</span>
              <span
                className={"smark" + (status === "revisit" ? " on-rev" : "")}
                title="Mark to revisit"
                onClick={() => onMark(ch.id, "revisit")}>↻</span>
            </span>
          </div>
          <span className="open mono">Open cover <span className="arr">→</span></span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================== CONTENTS */
function Contents({ prog, setMark, onOpen }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = { all: CHAPTERS.length, done: 0, revisit: 0 };
    GROUPS.forEach(g => c[g] = 0);
    CHAPTERS.forEach(ch => {
      c[ch.group]++;
      if (prog[ch.id] === "done") c.done++;
      if (prog[ch.id] === "revisit") c.revisit++;
    });
    return c;
  }, [prog]);

  const q = query.trim().toLowerCase();
  const match = (ch) => {
    if (q && !(ch.title.toLowerCase().includes(q) ||
      ch.tag.toLowerCase().includes(q) ||
      ch.concepts.join(" ").toLowerCase().includes(q))) return false;
    if (filter === "all") return true;
    if (filter === "done") return prog[ch.id] === "done";
    if (filter === "revisit") return prog[ch.id] === "revisit";
    return ch.group === filter;
  };

  const visibleGroups = GROUPS
    .map(g => ({ g, items: CHAPTERS.filter(ch => ch.group === g && match(ch)) }))
    .filter(s => s.items.length > 0);

  const pct = Math.round((counts.done / counts.all) * 100);
  const romans = ["I", "II", "III"];

  return (
    <div>
      <nav className="crumb">
        <a onClick={() => goExternal("../../index.html")}>Commonplace</a>
        <span className="sep">/</span>
        <a onClick={() => goExternal("../index.html")}>Coding</a>
        <span className="sep">/</span>
        <span className="here">Classical ML</span>
      </nav>

      <header className="masthead">
        <div>
          <div className="kicker"><span className="pulse"></span>Subject I · <span className="dim">Languages &amp; Models</span></div>
          <h1>Classical Machine&nbsp;<span className="hyper">Learning</span><span className="w">.</span></h1>
          <p className="tagline">Eighteen chapters of supervised and unsupervised learning — each one a live notebook you can edit and run, drawn here as a window into the high-dimensional spaces models actually live in.</p>
        </div>
        <div className="seal">
          CHAPTERS · <b>18</b><br />
          RUNTIME · <b style={{ color: "var(--violet)" }}>Pyodide</b><br />
          INSTALL · <b style={{ color: "var(--done)" }}>none</b><br />
          PLATES · <span style={{ color: "var(--magenta)" }}>4-D projected</span>
        </div>
      </header>

      <div className="toolbar">
        <div className="chips">
          <button className={"chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>All<span className="ct">{counts.all}</span></button>
          {GROUPS.map(g => (
            <button key={g} className={"chip" + (filter === g ? " active" : "")} onClick={() => setFilter(g)}>
              {g.replace(" models & workflow", "").replace(" topics", "")}<span className="ct">{counts[g]}</span>
            </button>
          ))}
          <button className={"chip dot-done" + (filter === "done" ? " active" : "")} onClick={() => setFilter("done")}>✓ Done<span className="ct">{counts.done}</span></button>
          <button className={"chip dot-rev" + (filter === "revisit" ? " active" : "")} onClick={() => setFilter("revisit")}>↻ Revisit<span className="ct">{counts.revisit}</span></button>
        </div>
        <div className="search">
          <span className="ic mono">⌕</span>
          <input className="mono" placeholder="search topics…" value={query}
            onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="progress-meter">
          <span className="lbl">Progress</span>
          <span className="bar"><i style={{ width: pct + "%" }}></i></span>
          <span className="pct">{counts.done}/{counts.all} · {pct}%</span>
          <span className="legend" title="The 4th coordinate (w) is drawn as colour temperature">
            <span className="grad"></span> w: near → far
          </span>
        </div>
      </div>

      {visibleGroups.length === 0 && (
        <div className="empty">No chapters match “{query}”.</div>
      )}

      {visibleGroups.map((sec, i) => (
        <div key={sec.g}>
          <div className="shead">
            <span className="n" style={{ color: GROUP_COLORS[sec.g] }}>{romans[GROUPS.indexOf(sec.g)] || "§"}</span>
            <h2>{sec.g}</h2>
            <span className="ln" style={{ background: "linear-gradient(90deg, color-mix(in srgb, " + GROUP_COLORS[sec.g] + " 35%, transparent), var(--rule) 60%)" }}></span>
            <span className="ct">{sec.items.length} {sec.items.length === 1 ? "chapter" : "chapters"}</span>
          </div>
          <div className="cards">
            {sec.items.map(ch => (
              <Card key={ch.id} ch={ch} status={prog[ch.id]} onOpen={onOpen} onMark={setMark} />
            ))}
          </div>
        </div>
      ))}

      <div className="toolbar" style={{ marginTop: 36 }}>
        <div className="chips">
          <a className="chip" onClick={() => goExternal("./lab/index.html")}>Open full JupyterLab ↗</a>
          <a className="chip" onClick={() => goExternal("./tree/index.html")}>File browser ↗</a>
          <a className="chip" onClick={() => goExternal("./repl/index.html")}>Python REPL ↗</a>
        </div>
      </div>

      <footer className="colophon">
        <span className="motto">“Read a little, then run it.”</span>
        <span>BUILT WITH JUPYTERLITE · PYODIDE</span>
      </footer>
    </div>
  );
}

/* =============================================================== COVER */
function Cover({ ch, idx, status, setMark, onOpen, onHome }) {
  const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
  const next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
  const nbUrl = NB_BASE + ch.file.replace(/\.ipynb$/, ".html");

  return (
    <div className="cover" style={{ "--acc": ACCENTS[ch.id] }}>
      <nav className="crumb">
        <a onClick={() => goExternal("../../index.html")}>Commonplace</a>
        <span className="sep">/</span>
        <a onClick={() => goExternal("../index.html")}>Coding</a>
        <span className="sep">/</span>
        <a onClick={onHome}>Classical ML</a>
        <span className="sep">/</span>
        <span className="here">{ch.id} · {ch.title}</span>
      </nav>

      <section className="cover-hero">
        <div className="heroText">
          <div className="chno">
            CHAPTER {ch.id}
            <span className="grp">— {ch.group}</span>
          </div>
          <h1>{ch.title}</h1>
          <p className="lead">{ch.lead}</p>
          <div className="heroMeta">
            <span><b>~{ch.time} min</b> read &amp; run</span>
            <span className="pip"></span>
            <span className="mono">{ch.file}</span>
            {ch.kind === "reference" && <><span className="pip"></span><span style={{ color: "var(--violet)" }}>Reference</span></>}
            {ch.kind === "extra" && <><span className="pip"></span><span style={{ color: "var(--coral)" }}>Extra</span></>}
          </div>
        </div>
        <Motif type={ch.motif} seed={ch.seed} hero accent={ACCENTS[ch.id]} className="heroCanvas" />
      </section>

      <div className="cover-body">
        <div className="panel">
          <h4>What you'll learn</h4>
          <ul className="learn-list">
            {ch.learn.map((l, i) => (
              <li key={i}><span className="ix mono">{String(i + 1).padStart(2, "0")}</span><span>{l}</span></li>
            ))}
          </ul>
          <div style={{ height: 22 }}></div>
          <h4>Concepts &amp; classes</h4>
          <div className="concepts">
            {ch.concepts.map((c, i) => (
              <span key={c} className="concept" style={{ color: SPECTRUM_VARS[i % 5], borderColor: "color-mix(in srgb, " + SPECTRUM_VARS[i % 5] + " 35%, transparent)" }}>{c}</span>
            ))}
          </div>
        </div>

        <div>
          <div className="panel">
            <h4>Chapter card</h4>
            <div className="side-row"><span className="k">Section</span><span className="v">{ch.group}</span></div>
            <div className="side-row"><span className="k">Topic</span><span className="v">{ch.tag}</span></div>
            <div className="side-row"><span className="k">Est. time</span><span className="v" style={{ whiteSpace: "nowrap" }}>~{ch.time} min</span></div>
            <div className="side-row"><span className="k">Notebook</span><span className="v file">{ch.file}</span></div>
            <div className="side-row"><span className="k">Status</span><span className="v" style={{ whiteSpace: "nowrap", color: status === "done" ? "var(--done)" : status === "revisit" ? "var(--coral)" : "var(--ink-mute)" }}>{status === "done" ? "Understood" : status === "revisit" ? "To revisit" : "Not started"}</span></div>

            <div className="cta-row">
              <a className="btn primary" href={nbUrl}>Open the notebook <span className="arr">→</span></a>
            </div>
            <div className="mark-row">
              <button className={"mark-btn" + (status === "done" ? " on-done" : "")} onClick={() => setMark(ch.id, "done")}>✓ Understood</button>
              <button className={"mark-btn" + (status === "revisit" ? " on-rev" : "")} onClick={() => setMark(ch.id, "revisit")}>↻ Revisit</button>
            </div>
            <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", letterSpacing: "0.5px", marginTop: 16, marginBottom: 0, lineHeight: 1.7 }}>
              First load fetches the Python runtime (~20–30s). Edit any cell and press Shift+Enter to re-run.
            </p>
          </div>
        </div>
      </div>

      <div className="pager">
        {prev
          ? <a onClick={() => onOpen(prev.id)}><span className="pl">← Previous · {prev.id}</span><span className="pt">{prev.title}</span></a>
          : <a className="ghost"><span className="pl">← Previous</span><span className="pt">—</span></a>}
        {next
          ? <a className="next" onClick={() => onOpen(next.id)}><span className="pl">Next · {next.id} →</span><span className="pt">{next.title}</span></a>
          : <a className="next ghost"><span className="pl">Next →</span><span className="pt">—</span></a>}
      </div>

      <footer className="colophon">
        <a className="motto" onClick={onHome}>← All eighteen chapters</a>
        <span>CHAPTER {ch.id} · CLASSICAL ML</span>
      </footer>
    </div>
  );
}

/* --------------------------------------------------- external navigation */
function goExternal(url) { window.location.href = url; }

/* =============================================================== APP */
function App() {
  const [prog, setMark] = useProgress();
  const [route, go] = useRoute();

  const openCover = useCallback((id) => go({ name: "cover", id }), [go]);
  const home = useCallback(() => go({ name: "contents" }), [go]);

  if (route.name === "cover") {
    const idx = CHAPTERS.findIndex(c => c.id === route.id);
    if (idx === -1) { home(); return null; }
    return (
      <div className="wrap">
        <Cover ch={CHAPTERS[idx]} idx={idx} status={prog[CHAPTERS[idx].id]}
          setMark={setMark} onOpen={openCover} onHome={home} />
      </div>
    );
  }
  return (
    <div className="wrap">
      <Contents prog={prog} setMark={setMark} onOpen={openCover} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
