/* notebook-player.js — one shared player for every Python notebook page.
 * Step 4 + Step 6 (Run/Stop, queue, Run all, Python status, restart flow, output states).
 *
 * A page is just: <head> includes + <script type="application/json" id="nbdata">
 * (a flat list of {t:"md"|"code", s:"..."} cells) + one call:
 *
 *   NotebookPlayer.mount({
 *     id:     "02_for_loops",          // storage key prefix (keeps old saved edits)
 *     folder: "fundamentals",
 *     file:   "02_for_loops.ipynb",
 *     crumb:  "for loops",             // header title
 *     unit:   "Section" | "Problem",   // optional; what the outline counts
 *     prereqs: true,                   // run earlier cells quietly first when you jump ahead
 *     lesson: ["../lessons/Py_Lesson_2_3.html", "Lesson 2.3"],   // optional link in the header
 *     autoload: true                   // start Python ~0.6s after load (default: true unless Save-Data)
 *   });
 *
 * Python runs through NotebookPlayer.engine (see HOOKS.md). If none is set, the
 * built-in in-page Pyodide engine is used — it works, but cannot be stopped.
 * Needs (optional, degrades gracefully): marked, CodeMirror (+python mode), Pyodide.
 */
(function (root) {
  "use strict";
  /* theme: same key as lib/theme.js, applied before first paint */
  try { if (!root.CPTheme) { var _t = localStorage.getItem("cp-py-theme"); document.documentElement.setAttribute("data-theme", /^(light|dark|system)$/.test(_t || "") ? _t : "light"); } } catch (e) {}

  /* ------------------------------------------------------------ helpers */
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }

  // Tolerant heading reader — notebooks often write "##Prime" with no space.
  var HEAD_RE = /^(#{1,6})\s*(.*)$/;
  function heading(text) {
    var lines = String(text).split("\n"), i = 0;
    while (i < lines.length && !lines[i].trim()) i++;
    if (i >= lines.length) return { lvl: 0, text: "", body: "" };
    var m = HEAD_RE.exec(lines[i].trim());
    if (!m) return { lvl: 0, text: "", body: String(text).trim() };
    return { lvl: m[1].length, text: m[2].trim(), body: lines.slice(i + 1).join("\n").trim() };
  }
  function cleanTitle(s) {
    return String(s)
      .replace(/<[^>]+>/g, "")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{20E3}]/gu, "")
      .replace(/^[\s\d.)·—-]+(?=\S)/, "")
      .replace(/\s+/g, " ").trim();
  }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function firstLine(s) { var l = String(s).split("\n"); for (var i = 0; i < l.length; i++) if (l[i].trim()) return l[i].trim(); return ""; }

  // "##Title" -> "## Title" outside code fences, so marked renders real headings.
  function normMd(src) {
    var fence = false;
    return String(src).split("\n").map(function (l) {
      if (/^\s*(```|~~~)/.test(l)) { fence = !fence; return l; }
      if (fence) return l;
      l = l.replace(/^(\s{0,3}#{1,6})(?=[^#\s])/, "$1 ");
      // headings: drop keycap numbers (1-9, 10) - the outline already numbers sections
      if (/^\s{0,3}#{1,6}\s/.test(l)) l = l.replace(/^(\s{0,3}#{1,6}\s+)(?:[0-9#*]\uFE0F?\u20E3|\uD83D\uDD1F)\s*/, "$1");
      return l;
    }).join("\n");
  }
  function renderMd(src) {
    var s = normMd(src);
    if (root.marked) { try { return wrapEmoji(root.marked.parse(s)); } catch (e) {} }
    return "<pre>" + esc(s) + "</pre>";
  }
  // Wrap emoji in prose (not inside <pre>/<code>) so CSS can size and align them.
  var EMO = /(?:\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDEFF]|\uD83E[\uDD00-\uDFFF]|[\u2600-\u27BF]|\u2B50|\u2B55)\uFE0F?/g;
  function wrapEmoji(html) {
    var parts = html.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>)/);
    for (var i = 0; i < parts.length; i += 2) parts[i] = parts[i].replace(EMO, '<span class="np-emo">$&</span>');
    return parts.join("");
  }

  /* ---------------------------------------------- outline (units + groups) */
  // Same rules as practice_import/nb_to_import_sql.py so counts agree:
  //  structured notebooks: '# Problem N' starts a unit;
  //  otherwise the shallowest heading level in 2..4 used at least twice.
  function analyse(cells, opts) {
    var heads = cells.map(function (c) { return c.t === "md" ? heading(c.s) : { lvl: 0 }; });
    var structured = heads.filter(function (h) { return h.lvl === 1 && /problem\s*\d+/i.test(h.text); }).length >= 3;
    var B = 2;
    if (!structured) {
      var counts = { 2: 0, 3: 0, 4: 0 };
      heads.forEach(function (h) { if (counts[h.lvl] !== undefined) counts[h.lvl]++; });
      B = counts[2] >= 2 ? 2 : counts[3] >= 2 ? 3 : counts[4] >= 2 ? 4 : 2;
    }
    var items = [], units = [], codeUnit = [], cur = -1, codeN = 0;
    cells.forEach(function (c, i) {
      var h = heads[i];
      if (c.t === "md" && h.lvl) {
        var isUnit = structured ? (h.lvl === 1 && /problem\s*\d+/i.test(h.text)) : (h.lvl === B);
        var isGroup = structured ? (h.lvl === 1 && !isUnit) : (h.lvl < B);
        if (isUnit) {
          var label = cleanTitle(h.text) || "Untitled";
          if (structured) { // pull the statement line so "Problem 7" says what it is
            var st = statementAfter(cells, heads, i);
            if (st) label = label + " · " + cleanTitle(st);
          }
          cur = units.length;
          units.push({ cell: i, label: label, codes: [] });
          items.push({ kind: "unit", u: cur });
        } else if (isGroup && i > 0) {
          var g = cleanTitle(h.text);
          if (g) items.push({ kind: "group", label: g });
        }
      } else if (c.t === "code") {
        codeUnit[codeN] = cur;
        if (cur >= 0) units[cur].codes.push(codeN);
        codeN++;
      }
    });
    // Practice logs: a heading with no code under it isn't a problem (matches the
    // importer, which drops heading-only problems). It still shows as text.
    if (opts && opts.dropEmpty) {
      var keep = [], remap = {};
      units.forEach(function (u, k) { if (u.codes.length) { remap[k] = keep.length; keep.push(u); } });
      items = items.filter(function (it) { return it.kind !== "unit" || remap[it.u] !== undefined; })
                   .map(function (it) { return it.kind === "unit" ? { kind: "unit", u: remap[it.u] } : it; });
      codeUnit = codeUnit.map(function (k) { return k >= 0 && remap[k] !== undefined ? remap[k] : -1; });
      units = keep;
    }
    // drop group labels that have no unit after them before the next group
    items = items.filter(function (it, i) {
      if (it.kind !== "group") return true;
      var nx = items[i + 1];
      return nx && nx.kind === "unit";
    });
    return { units: units, items: items, codeUnit: codeUnit, structured: structured };
  }
  function statementAfter(cells, heads, i) {
    var lines = heads[i].body.split("\n");
    for (var k = 0; k < lines.length; k++) if (/problem statement/i.test(lines[k])) {
      for (var j = k + 1; j < lines.length; j++) if (lines[j].trim()) return lines[j].trim();
    }
    for (var n = i + 1; n < cells.length && cells[n].t === "md"; n++) {
      if (/problem statement/i.test(heads[n].text)) return firstLine(heads[n].body);
    }
    return "";
  }

  /* -------------------------------------------------------------- utils */
  function noop() {}
  function fmtS(ms) { var s = Math.max(0, ms) / 1000; if (s < 1) return s.toFixed(2) + "s"; if (s < 10) return s.toFixed(1) + "s"; if (s < 60) return Math.round(s) + "s"; return Math.floor(s / 60) + "m " + Math.round(s % 60) + "s"; }
  function fmtMB(b) { return (b / 1e6).toFixed(1); }
  function ord(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function emit(name, d) { try { document.dispatchEvent(new CustomEvent(name, { detail: d })); } catch (e) {} }
  function stoppedError() { var e = new Error("Stopped"); e.stopped = true; return e; }
  function range(n) { var r = []; for (var i = 0; i < n; i++) r.push(i); return r; }

  var PY_BYTES = 10e6, SEEN = "cp-py-pyodide-seen", LONG = 20, KEEP = 5000;

  /* ------------------------------------------- built-in engine (in-page) */
  var INPUT_SHIM =
    "import builtins, os\n" +
    "os.environ['MPLBACKEND']='AGG'\n" +
    "def __input(prompt=''):\n" +
    "    r=__js_input(str(prompt))\n" +
    "    print(str(prompt)+str(r))\n" +
    "    return str(r)\n" +
    "builtins.input=__input\n";
  var FIGCODE =
    "def __nbx_capture_figs():\n" +
    "    import sys\n" +
    "    if 'matplotlib' not in sys.modules: return []\n" +
    "    import matplotlib.pyplot as plt, io, base64\n" +
    "    out=[]\n" +
    "    for n in plt.get_fignums():\n" +
    "        f=plt.figure(n); b=io.BytesIO(); f.savefig(b,format='png',bbox_inches='tight')\n" +
    "        out.append(base64.b64encode(b.getvalue()).decode())\n" +
    "    plt.close('all'); return out\n" +
    "__nbx_capture_figs()\n";
  /* Same contract as a worker engine (HOOKS.md), minus stop(): Python on the
     main thread cannot be interrupted, so Stop only works once a worker engine
     is plugged in. input() uses window.prompt here (synchronous). */
  var builtinEngine = {
    name: "in-page",
    load: function (report) {
      if (typeof root.loadPyodide !== "function") return Promise.reject(new Error("Pyodide is not on this page"));
      return root.loadPyodide().then(function (p) {
        report("starting");
        builtinEngine._py = p;
        p.globals.set("__js_input", function (q) { var r = root.prompt(q || ""); return r === null ? "" : r; });
        return p.runPythonAsync(INPUT_SHIM);
      });
    },
    run: function (n, code, io) {
      var p = builtinEngine._py;
      p.setStdout({ batched: io.out }); p.setStderr({ batched: io.err });
      return p.loadPackagesFromImports(code).catch(noop).then(function () { return p.runPythonAsync(code); }).then(function (res) {
        var repr = null;
        if (res !== undefined && res !== null) {
          try { var b = p.pyimport("builtins"); repr = b.repr(res); b.destroy(); } catch (e) { repr = String(res); }
          if (typeof res.destroy === "function") { try { res.destroy(); } catch (e) {} }
        }
        return p.runPythonAsync(FIGCODE).then(function (fp) { var figs = fp.toJs(); fp.destroy(); return { repr: repr, figures: figs }; });
      }, function (e) { var x = new Error("python"); x.traceback = e && e.message ? e.message : String(e); throw x; });
    }
  };

  /* --------------------------------------------------------------- mount */
  function mount(cfg) {
    cfg = cfg || {};
    var dataEl = document.getElementById(cfg.dataId || "nbdata");
    var CELLS = [];
    try { CELLS = JSON.parse(dataEl.textContent); } catch (e) { document.body.insertAdjacentHTML("afterbegin", '<p style="color:#b33;padding:20px">Could not read the notebook data on this page.</p>'); return; }

    var ID = cfg.id || location.pathname.split("/").pop().replace(/\.html?$/, "");
    var LS = function (k) { return "pynb_" + ID + "_" + k; };
    var practice = (cfg.folder === "practice");
    var UNIT = cfg.unit || (practice ? "Problem" : "Section");
    var PREREQS = cfg.prereqs != null ? !!cfg.prereqs : !practice;
    var AUTOLOAD = cfg.autoload != null ? !!cfg.autoload : !(navigator.connection && navigator.connection.saveData);
    var A = analyse(CELLS, { dropEmpty: practice });
    var TOTAL = CELLS.filter(function (c) { return c.t === "code"; }).length;
    var up = cfg.up || "../index.html", home = cfg.home || "../../../index.html";
    function engine() { return P.engine || builtinEngine; }
    function seen() { return cfg.pyCached != null ? !!cfg.pyCached : store(SEEN) === "1"; }
    function ranMap() { try { return JSON.parse(store(LS("ran")) || "{}"); } catch (e) { return {}; } }
    function saveRan(m) { store(LS("ran"), JSON.stringify(m)); }

    /* ---- shell: sticky header (home · back · title · status) + strip ---- */
    var body = document.body;
    body.classList.add("np");
    var ttl = cfg.crumb || String(cfg.title || ID).replace(/<[^>]+>/g, "");
    var bar = el("header", "np-bar");
    bar.id = "np-bar";
    bar.innerHTML =
      '<div class="np-bar-in">' +
        '<a class="np-hbtn" href="' + esc(home) + '" title="Commonplace home" aria-label="Commonplace home">&#8962;</a>' +
        '<a class="np-hbtn" href="' + esc(up) + '" title="Back to the Python page" aria-label="Back to the Python page">&#8249;<span class="lbl-long"> Python</span></a>' +
        '<h1 class="np-ttl">' + esc(ttl) + '</h1>' +
        '<button class="np-led" id="np-led" type="button" data-state="idle"><span class="dot" aria-hidden="true"></span><span class="t-s" id="np-led-s"></span><span class="t-l" id="np-led-l"></span></button>' +
      '</div>' +
      '<div class="np-strip" id="np-strip" role="status" hidden></div>';
    var head2 = el("div", "np-head2");
    head2.innerHTML =
      '<div class="np-head2-in">' +
        '<button class="np-btn go" id="np-runall" type="button">&#9654; Run all</button>' +
        '<button class="np-btn" id="np-resetall" type="button">&#8635; Reset all</button>' +
        '<span class="np-jump"><span class="np-selw"><select id="np-sel" aria-label="Jump to section"></select></span><span class="np-pos" id="np-pos-m"></span></span>' +
        '<span class="np-prog" title="code cells run on this device"><span class="track"><span class="fill" id="np-fill"></span></span><span class="pc" id="np-pc">0 / ' + TOTAL + '</span></span>' +
        (cfg.lesson ? '<a class="np-lesson" href="' + esc(cfg.lesson[0]) + '">' + esc(cfg.lesson[1] || "Lesson") + ' &#8599;</a>' : '') +
      '</div>';
    var layout = el("div", "np-layout");
    var rail = el("aside", "np-rail");
    rail.setAttribute("aria-label", "Outline");
    rail.innerHTML = '<div class="np-rail-in"><div class="np-rail-k">Outline</div><div class="np-pos" id="np-pos-d"></div><ul class="np-ol" id="np-ol"></ul></div>';
    var main = el("main", "np-main");
    main.innerHTML =
      '<div id="np-cells"></div>' +
      '<div class="np-note">Every code cell is live and they all share one Python session, so run them top to bottom (or <b>Run all</b>). ' +
        (PREREQS ? 'If you jump ahead, the cells above run quietly first. ' : '') +
        '<b>&#9632; Stop</b> restarts Python, which clears every variable &#8212; re-run the cells above afterwards. ' +
        'Press <code>Shift+Enter</code> in a cell to run it. Edits are saved on this device.</div>' +
      '<footer class="np-colophon"><span><a href="' + esc(up) + '">&#8592; Python page</a></span><span>' + (cfg.file ? 'from ' + esc(cfg.file) + ' &#183; ' : '') + plural(A.units.length, UNIT.toLowerCase()) + ' &#183; ' + plural(TOTAL, 'code cell') + '</span></footer>';
    layout.appendChild(rail); layout.appendChild(main);
    body.insertBefore(layout, body.firstChild);
    main.insertBefore(head2, main.firstChild);
    body.insertBefore(bar, layout);

    function headH() { return bar.offsetHeight || 56; }
    function setHeadH() { document.documentElement.style.setProperty("--np-head", headH() + "px"); }
    function scrollToY(y) { var reduce = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches; root.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" }); }
    function scrollToEl(e, gap) { scrollToY(e.getBoundingClientRect().top + root.pageYOffset - headH() - (gap == null ? 10 : gap)); }
    /* keep an element clear of the sticky header AND the site's floating buttons */
    function fabClear() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--np-fab-clear")) || 0; }
    function keepVisible(e) {
      var r = e.getBoundingClientRect(), fab = fabClear();
      if (r.top < headH() + 8 || r.bottom > root.innerHeight - fab) scrollToY(r.top + root.pageYOffset - (root.innerHeight - r.height) / 2);
    }

    /* ---- strip: one sticky line under the header for long-lived messages ---- */
    var stripEl = document.getElementById("np-strip"), stripMsg = null, stripTimer = 0, stripHTML = "";
    function setStrip(m) { stripMsg = m; clearTimeout(stripTimer); if (m && m.ttl) stripTimer = setTimeout(function () { if (stripMsg === m) setStrip(null); }, m.ttl); paintStrip(); }
    function statusStrip() {
      var s = status.state, d = status.detail || {};
      if (s === "downloading" && !seen()) {
        var has = d.total && d.loaded != null, pc = has ? Math.min(100, Math.round(d.loaded / d.total * 100)) : -1;
        return { kind: "download", msg: "<b>Downloading Python</b> &#183; " + (has ? fmtMB(d.loaded) + " of " + fmtMB(d.total) + " MB" : "about " + Math.round((d.total || PY_BYTES) / 1e6) + " MB"),
          sub: "First time only. After this it starts from the device.", bar: pc };
      }
      if (s === "starting" && !seen()) return { kind: "download", msg: "<b>Starting Python</b> &#183; almost ready", sub: "Queued cells run as soon as it is up.", bar: -1 };
      if (s === "offline") return { kind: "failed", msg: "<b>You&#8217;re offline.</b> Python downloads once (about " + Math.round(PY_BYTES / 1e6) + " MB) &#8212; connect, then retry.", acts: [["retry", "&#8635; Retry", "np-btn"]] };
      if (s === "failed") return { kind: "failed", msg: "<b>Python didn&#8217;t load.</b> " + esc(d.message || "Check the connection, then retry."), acts: [["retry", "&#8635; Retry", "np-btn"]] };
      return null;
    }
    function paintStrip() {
      var m = stripMsg || statusStrip();
      if (!m) { stripHTML = ""; stripEl.hidden = true; stripEl.innerHTML = ""; stripEl.removeAttribute("data-kind"); setHeadH(); return; }
      stripEl.hidden = false; stripEl.setAttribute("data-kind", m.kind);
      var acts = (m.acts || []).map(function (a) { return '<button type="button" class="' + a[2] + '" data-act="' + a[0] + '"' + (a[3] != null ? ' data-n="' + a[3] + '"' : '') + '>' + a[1] + '</button>'; }).join("");
      if (m.close) acts += '<button type="button" class="np-x" data-act="close" aria-label="Dismiss">&#215;</button>';
      var barH = m.bar == null ? "" : '<span class="np-strip-bar' + (m.bar < 0 ? ' ind' : '') + '"><i style="width:' + (m.bar < 0 ? 30 : m.bar) + '%"></i></span>';
      var html = '<div class="np-strip-in"><p class="np-strip-msg">' + m.msg + (m.sub ? '<span class="np-strip-sub">' + m.sub + '</span>' : '') + '</p>' +
        (acts ? '<span class="np-strip-acts">' + acts + '</span>' : '') + barH + '</div>';
      if (html === stripHTML) return;
      stripHTML = html; stripEl.innerHTML = html;
      setHeadH();
    }
    stripEl.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-act]") : null; if (!b) return;
      var act = b.getAttribute("data-act"), n = +b.getAttribute("data-n");
      if (act === "retry") retry();
      else if (act === "close") setStrip(null);
      else if (act === "stopall") stopAll();
      else if (act === "goto") { if (editors[n]) scrollToEl(editors[n].cell); }
      else if (act === "rerun") { setStrip(null); rerunAbove(n); }
    });

    /* ---- Python status ---- */
    var status = { state: "idle", detail: {} };
    var led = document.getElementById("np-led"), ledS = document.getElementById("np-led-s"), ledL = document.getElementById("np-led-l");
    function ledText(s, d) {
      var pc = d.total && d.loaded != null ? Math.min(100, Math.round(d.loaded / d.total * 100)) : null;
      switch (s) {
        case "downloading": return pc != null ? [pc + "%", "Downloading " + pc + "%"] : ["Loading", "Downloading Python"];
        case "starting":    return ["Starting", "Starting Python"];
        case "ready":       return ["Ready", "Python ready"];
        case "busy":        return d.waiting ? ["Input", "Waiting for input"] : ["Busy", d.cell != null ? "Running In [" + (d.cell + 1) + "]" : "Python busy"];
        case "restarting":  return ["Restarting", "Restarting Python"];
        case "failed":      return ["Retry", "Python failed \u00b7 Retry"];
        case "offline":     return ["Offline", "Offline \u00b7 Retry"];
        default:            return ["Load", "Python not loaded"];
      }
    }
    function setStatus(s, d) {
      status = { state: s, detail: d || {} };
      var t = ledText(s, status.detail);
      led.setAttribute("data-state", s); ledS.textContent = t[0]; ledL.textContent = t[1];
      var act = s === "idle" || s === "failed" || s === "offline";
      led.title = act ? (s === "idle" ? "Load Python now (about " + Math.round(PY_BYTES / 1e6) + " MB the first time)" : "Try loading Python again") : t[1];
      led.setAttribute("aria-label", "Python status: " + t[1]);
      led.classList.toggle("act", act);
      var d2 = status.detail;
      if (s === "downloading" && d2.total && d2.loaded != null) led.style.setProperty("--p", Math.round(d2.loaded / d2.total * 100)); else led.style.removeProperty("--p");
      paintStrip(); paintBusy();
      emit("np:status", { state: s, detail: status.detail });
    }
    led.onclick = function () { if (status.state === "idle") loadPy().then(pump, noop); else if (status.state === "failed" || status.state === "offline") retry(); };

    var pyReady = false, loading = null;
    function loadPy() {
      if (pyReady) return Promise.resolve();
      if (loading) return loading;
      var eng = engine();
      setStatus(seen() ? "starting" : "downloading", { total: PY_BYTES });
      loading = Promise.resolve().then(function () { return eng.load(setStatus); }).then(function () {
        pyReady = true; loading = null; if (cfg.pyCached == null) store(SEEN, "1");
        setStatus(current ? "busy" : "ready", current ? { cell: current.rec.n } : null);
      }, function (e) {
        loading = null;
        if (status.state !== "offline" && status.state !== "failed") {
          var off = navigator.onLine === false;
          setStatus(off ? "offline" : "failed", off ? null : { message: (e && e.userMessage) || "Check the connection, then retry." });
        }
        throw e;
      });
      return loading;
    }
    function retry() {
      if (typeof P.onRetry === "function") { try { P.onRetry(); } catch (e) {} }
      loadPy().then(pump, noop);
    }
    root.addEventListener("online", function () { if (status.state === "offline") retry(); });

    /* ---- cells ---- */
    var host = document.getElementById("np-cells");
    var editors = [], unitEls = [], cms = [];
    var codeIdx = 0, unitByCell = {};
    A.units.forEach(function (u, k) { unitByCell[u.cell] = k; });

    var firstMd = -1;
    for (var fi = 0; fi < CELLS.length; fi++) { if (CELLS[fi].t === "md") { firstMd = fi; break; } if (CELLS[fi].t === "code") break; }
    CELLS.forEach(function (c, i) {
      if (c.t === "md") {
        var src = c.s;
        if (i === firstMd && unitByCell[i] === undefined) {
          var hh = heading(src);
          if (hh.lvl === 1) { if (!hh.body) return; src = hh.body; }   // header already names the notebook
        }
        var d = el("div", "np-md", renderMd(src));
        if (unitByCell[i] !== undefined) { d.classList.add("np-unit"); d.id = "np-u" + (unitByCell[i] + 1); unitEls[unitByCell[i]] = d; }
        host.appendChild(d);
        return;
      }
      host.appendChild(buildCell(c.s, codeIdx++));
    });

    function buildCell(src, n) {
      var cell = el("section", "np-cell");
      cell.id = "np-c" + (n + 1);
      cell.setAttribute("data-state", "idle");
      cell.setAttribute("aria-label", "Code cell " + (n + 1));
      var top = el("div", "top");
      top.innerHTML = '<span class="pip" aria-hidden="true"></span><span class="lbl">In [' + (n + 1) + ']</span>';
      var stat = el("span", "np-cstat"); stat.setAttribute("aria-live", "polite");
      var reset = el("button", "np-mini", '<span aria-hidden="true">&#8635;</span><span class="w"> Reset</span>'); reset.type = "button";
      reset.title = "Put back the notebook's original code"; reset.setAttribute("aria-label", "Reset this cell's code");
      var run = el("button", "np-run", "&#9654; Run"); run.type = "button"; run.title = "Run (Shift+Enter)";
      top.appendChild(stat); top.appendChild(reset); top.appendChild(run);
      var ta = el("textarea", "np-ta"); ta.spellcheck = false;
      var saved = store(LS("code_" + n));
      ta.value = (saved != null && saved !== "") ? saved : src;
      ta.rows = Math.min(24, Math.max(2, ta.value.split("\n").length));
      var outw = el("div", "np-outw"); outw.hidden = true; outw.setAttribute("data-ix", n + 1);
      var pre = el("pre", "np-out");
      var figs = el("div", "np-figs");
      var more = el("button", "np-outmore"); more.type = "button"; more.hidden = true;
      var ask = el("form", "np-ask"); ask.hidden = true;
      ask.innerHTML = '<span class="np-ask-k">Waiting for input()</span><label class="np-ask-p" for="np-in' + n + '"></label>' +
        '<span class="np-ask-row"><input class="np-ask-in" id="np-in' + n + '" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send">' +
        '<button class="np-run" type="submit">Enter &#8629;</button></span>';
      var note = el("p", "np-stopnote"); note.hidden = true;
      outw.appendChild(pre); outw.appendChild(figs); outw.appendChild(more); outw.appendChild(ask); outw.appendChild(note);
      var err = el("div", "np-err"); err.hidden = true;
      cell.appendChild(top); cell.appendChild(ta); cell.appendChild(outw); cell.appendChild(err);

      var rec = { n: n, original: src, cell: cell, top: top, stat: stat, reset: reset, run: run, outw: outw, pre: pre, figs: figs, more: more,
        ask: ask, askP: ask.querySelector(".np-ask-p"), askIn: ask.querySelector("input"), note: note, err: err,
        state: "idle", lines: [], dropped: 0, nfig: 0, quiet: false, open: false, secs: 0 };
      function kbRun() { if (/^(idle|done|error|stopped)$/.test(rec.state) && !isBusy()) enqueue(rec, {}); }
      if (root.CodeMirror) {
        var cm = null;
        rec.get = function () { return cm ? cm.getValue() : ta.value; };
        rec.set = function (v) { if (cm) cm.setValue(v); else ta.value = v; };
        rec.init = function () {
          cm = root.CodeMirror.fromTextArea(ta, { mode: "python", lineNumbers: true, indentUnit: 4, viewportMargin: Infinity,
            lineWrapping: root.innerWidth <= 640,   // phones: wrap instead of scrolling sideways inside a cell
            extraKeys: { "Shift-Enter": kbRun, "Ctrl-Enter": kbRun, "Tab": function (c) { c.execCommand(c.somethingSelected() ? "indentMore" : "insertSoftTab"); } } });
          cm.on("change", function () { store(LS("code_" + n), cm.getValue()); });
          cms.push(cm);
        };
      } else {
        rec.get = function () { return ta.value; };
        rec.set = function (v) { ta.value = v; };
        ta.addEventListener("keydown", function (e) { if (e.shiftKey && e.key === "Enter") { e.preventDefault(); kbRun(); } });
        ta.addEventListener("input", function () { store(LS("code_" + n), ta.value); });
      }
      run.onclick = function () {
        var s = rec.state;
        if (s === "running" || s === "waiting") stopCell(rec);
        else if (/^(idle|done|error|stopped)$/.test(s) && !isBusy()) enqueue(rec, {});
      };
      reset.onclick = function () { rec.set(src); store(LS("code_" + n), null); outReset(rec); clearErr(rec); setState(rec, "idle"); };
      more.onclick = function () { rec.open = !rec.open; outPaint(rec); if (!rec.open) keepVisible(rec.more); };
      ask.onsubmit = function (e) { e.preventDefault(); if (rec.askDone) rec.askDone(rec.askIn.value); };
      editors[n] = rec;
      return cell;
    }
    editors.forEach(function (r) { if (r.init) r.init(); });

    /* ---- output: text (long → collapsed), figures, quiet, input(), stop note ---- */
    function outReset(rec) {
      rec.lines = []; rec.dropped = 0; rec.nfig = 0; rec.quiet = false; rec.open = false;
      rec.figs.innerHTML = ""; rec.note.hidden = true; rec.note.innerHTML = ""; rec.ask.hidden = true;
      outPaint(rec);
    }
    function outAppend(rec, s) {
      var add = String(s).split("\n");
      for (var i = 0; i < add.length; i++) rec.lines.push(add[i]);
      if (rec.lines.length > KEEP) { var k = rec.lines.length - KEEP; rec.lines.splice(0, k); rec.dropped += k; }
      rec.quiet = false;
      if (!rec.raf) rec.raf = requestAnimationFrame(function () { outPaint(rec); });
    }
    function addFig(rec, b64) {
      rec.nfig++;
      var f = el("figure", "np-fig"), img = new Image();
      img.alt = "Figure " + rec.nfig + " from In [" + (rec.n + 1) + "]"; img.src = /^data:|^blob:|^https?:/.test(b64) ? b64 : "data:image/png;base64," + b64;
      f.appendChild(img); f.appendChild(el("figcaption", null, "Figure " + rec.nfig));
      rec.figs.appendChild(f);
    }
    function outPaint(rec) {
      if (rec.raf) { cancelAnimationFrame(rec.raf); rec.raf = 0; }
      var L = rec.lines, total = L.length + rec.dropped, long = total > LONG, live = rec.state === "running" || rec.state === "waiting";
      var show = L.length || rec.nfig || rec.quiet || !rec.ask.hidden || !rec.note.hidden;
      rec.outw.hidden = !show;
      rec.outw.classList.toggle("long", long);
      rec.outw.classList.toggle("open", long && rec.open);
      rec.outw.classList.toggle("live", long && live);
      rec.outw.classList.toggle("quiet", !!rec.quiet);
      var txt;
      if (rec.quiet) txt = "(ran \u2014 no output)";
      else if (!long || rec.open) txt = (rec.dropped ? "[\u2026 " + rec.dropped.toLocaleString() + " earlier lines not kept]\n" : "") + L.join("\n");
      else txt = live ? L.slice(-LONG).join("\n") : L.slice(0, LONG).join("\n");
      rec.pre.textContent = txt; rec.pre.hidden = !txt;
      rec.more.hidden = !long;
      if (long) rec.more.innerHTML = rec.open ? "&#9652; Show less" : "&#9662; Show all " + total.toLocaleString() + " lines";
    }

    /* ---- input(): inline field in the cell (worker engines call io.input) ---- */
    function askInput(rec, q) {
      return new Promise(function (res, rej) {
        rec.askP.textContent = q == null ? "" : String(q);
        rec.askIn.value = ""; rec.ask.hidden = false;
        rec.askDone = function (v) { rec.askDone = null; rec.askReject = null; rec.ask.hidden = true; outAppend(rec, (q || "") + v); setState(rec, "running"); setStatus("busy", { cell: rec.n }); res(v); };
        rec.askReject = rej;
        setState(rec, "waiting"); setStatus("busy", { cell: rec.n, waiting: true });
        outPaint(rec);
        setTimeout(function () { try { rec.askIn.focus({ preventScroll: true }); } catch (e) { rec.askIn.focus(); } keepVisible(rec.ask); }, 30);
      });
    }
    function hideAsk(rec) {
      rec.ask.hidden = true; rec.askDone = null;
      if (rec.askReject) { var r = rec.askReject; rec.askReject = null; r(stoppedError()); }
    }

    /* ---- cell states: idle · queued · running · waiting · stopping · done · error · stopped ---- */
    function setState(rec, s) {
      rec.state = s; rec.cell.setAttribute("data-state", s); rec.busyNote = false;
      clearInterval(rec.tick); rec.tick = 0;
      var b = rec.run;
      b.disabled = false; rec.reset.hidden = false;
      if (s === "running" || s === "waiting") {
        b.innerHTML = "&#9632; Stop"; b.className = "np-run stop"; b.title = "Stop this cell (restarts Python)"; rec.reset.hidden = true;
        if (s === "waiting") { rec.stat.innerHTML = '<span class="wait">Waiting for input</span>'; guardStop(rec); }
        else {
          var paint = function () {
            if (rec.phase) { rec.stat.innerHTML = '<span class="spin"></span>' + rec.phase; return; }
            var ms = Date.now() - rec.t0;
            rec.stat.innerHTML = '<span class="spin"></span>Running' + (ms >= 2000 ? " &#183; " + Math.floor(ms / 1000) + "s" : "");
            guardStop(rec);
          };
          paint(); rec.tick = setInterval(paint, 250);
        }
      } else if (s === "queued") {
        b.innerHTML = "Queued"; b.className = "np-run queued"; b.disabled = true; b.title = pyReady ? "Waiting its turn in Run all" : "Waiting for Python to start"; rec.reset.hidden = true;
      } else if (s === "stopping") {
        b.innerHTML = '<span class="spin"></span>Stopping'; b.className = "np-run stopping"; b.disabled = true; rec.reset.hidden = true;
        rec.stat.innerHTML = '<span class="stp">Stopping&#8230;</span>';
      } else {
        b.innerHTML = "&#9654; Run"; b.className = "np-run"; b.title = "Run (Shift+Enter)";
        rec.stat.innerHTML =
          s === "done" ? '<span class="ok">&#10003; ' + fmtS(rec.secs) + '</span>' :
          s === "error" ? '<span class="bad">&#10005; ' + esc(rec.errType || "Error") + '</span>' :
          s === "stopped" ? '<span class="stp">&#9632; Stopped after ' + fmtS(rec.secs) + '</span>' : "";
      }
      emit("np:cell", { cell: rec.n, state: s, secs: rec.secs });
      paintBusy();
    }
    /* If the running cell's Stop is off screen (or under the floating buttons), offer Stop in the sticky strip. */
    function guardStop(rec) {
      if (batch || (stripMsg && stripMsg.kind !== "running")) return;
      var live = rec.state === "running" || rec.state === "waiting";
      var r = rec.run.getBoundingClientRect(), shown = stripMsg && stripMsg.kind === "running";
      var vis = r.top >= headH() + (shown ? 8 : 0) && r.bottom <= root.innerHeight - fabClear();
      if (live && !vis) {
        var ms = Date.now() - rec.t0;
        setStrip({ kind: "running", msg: "<b>" + (rec.state === "waiting" ? "In [" + (rec.n + 1) + "] is waiting for input" : "Running In [" + (rec.n + 1) + "]") + "</b>" +
          (rec.state === "running" && !rec.phase && ms >= 2000 ? " &#183; " + Math.floor(ms / 1000) + "s" : ""),
          acts: [["goto", "Show", "np-btn", rec.n], ["stopall", "&#9632; Stop", "np-btn stop"]] });
      } else if (shown) setStrip(null);
    }
    /* One shared session: while anything runs (or Python is starting/restarting), every other
       Run is disabled and says why. Run all / Re-run are the only queue. */
    function isBusy() { return !!current || queue.length > 0; }
    function busyWhy() {
      if (!pyReady || status.state === "starting" || status.state === "downloading") return "Python is starting";
      if (status.state === "restarting") return "Python is restarting";
      return current ? "Python is busy &#183; In [" + (current.rec.n + 1) + "]" : "Python is busy";
    }
    function paintBusy() {
      if (!runAllBtn) return;
      var busy = isBusy(), why = busy ? busyWhy() : "", whyT = why.replace("&#183;", "·");
      body.classList.toggle("np-busy", busy);
      var ra = document.getElementById("np-resetall");
      if (ra) { ra.disabled = busy; ra.title = busy ? whyT : "Put every cell back to the notebook's original code"; }
      if (!batch) { runAllBtn.disabled = busy; runAllBtn.title = busy ? whyT : "Run every cell from the top"; }
      editors.forEach(function (r) {
        if (!/^(idle|done|error|stopped)$/.test(r.state)) return;
        r.run.disabled = busy; r.run.title = busy ? whyT : "Run (Shift+Enter)";
        if (busy) { if (!r.busyNote) { r.busyNote = true; r.statSaved = r.stat.innerHTML; } r.stat.innerHTML = '<span class="busy">' + why + '</span>'; }
        else if (r.busyNote) { r.busyNote = false; r.stat.innerHTML = r.statSaved || ""; }
      });
    }

    /* ---- compact error block (Step 4) ---- */
    function clearErr(rec) { rec.err.hidden = true; rec.err.innerHTML = ""; }
    function showErr(rec, text) {
      var lines = String(text).replace(/\s+$/, "").split("\n");
      var last = lines[lines.length - 1] || String(text);
      var m = /^([A-Za-z_][\w.]*(?:Error|Exception|Interrupt|Exit|Warning)|\w+Error)\s*:?\s*(.*)$/.exec(last);
      var type = m ? m[1] : "Error", msg = m ? (m[2] || m[1]) : last;
      var keep = [], frames = 0, skip = false, lineNo = null, ptr = [];
      for (var i = 0; i < lines.length - 1; i++) {
        var l = lines[i], f = /^\s*File "([^"]+)", line (\d+)/.exec(l);
        if (f) { skip = /^\/lib\/|_pyodide|pyodide\.asm/.test(f[1]); if (!skip) { frames++; if (f[1] === "<exec>") { lineNo = +f[2]; ptr = []; } } }
        if (!skip) { keep.push(l); if (!f && lineNo && /\S/.test(l) && !/^Traceback/.test(l)) ptr.push(l); }
      }
      keep.push(last);
      var hint = "";
      var dm = /(Did you mean[^?]*\?)/.exec(msg);
      if (dm) { hint = dm[1]; msg = msg.replace(dm[1], "").replace(/[.\s]+$/, ""); }
      rec.errType = type;
      rec.err.innerHTML =
        '<span class="k">' + esc(type) + (lineNo ? " &#183; line " + lineNo : "") + '</span>' +
        '<div class="msg">' + esc(msg) + '</div>' +
        (ptr.length ? '<pre class="ptr">' + esc(ptr.slice(-2).join("\n")) + '</pre>' : '') +
        (hint ? '<p class="hint">' + esc(hint) + '</p>' : '') +
        '<details class="more"><summary>Full traceback &#183; ' + plural(Math.max(1, frames), "frame") + '</summary><pre>' + esc(keep.join("\n")) + '</pre></details>';
      rec.err.hidden = false;
    }

    /* ---- one session, one lane: a queue in front of the engine ---- */
    var queue = [], current = null, batch = null, sessionRan = {}, runAllBtn = null;
    function stripMagics(code) { return code.replace(/^[ \t]*(%%?[a-zA-Z_]+\b|!(pip|python|conda|ls|cat)\b).*$/gm, ""); }
    function codeOf(n) { return editors[n] ? stripMagics(editors[n].get()) : ""; }
    function qIndex(rec) { for (var i = 0; i < queue.length; i++) if (queue[i].rec === rec) return i; return -1; }
    function enqueue(rec, opts) {
      if (!/^(idle|done|error|stopped)$/.test(rec.state)) return false;
      if (!(opts && opts.batch) && isBusy()) return false;   // single runs never queue
      rec.prevState = rec.state;
      queue.push({ rec: rec, opts: opts || {} });
      setState(rec, "queued");
      pump();
      return true;
    }
    function restore(rec) { setState(rec, rec.prevState && rec.prevState !== "queued" ? rec.prevState : "idle"); }
    function dequeue(rec) {
      var i = qIndex(rec); if (i < 0) return;
      var job = queue.splice(i, 1)[0]; restore(rec); paintQueue();
      if (job.opts.batch) afterJob(job, "skipped");
      if (!current && !queue.length && status.state === "busy") setStatus("ready");
    }
    function cancelQueue(filter) {
      var keep = [], drop = [];
      queue.forEach(function (j) { (filter && !filter(j) ? keep : drop).push(j); });
      queue = keep; drop.forEach(function (j) { restore(j.rec); }); paintQueue(); paintBusy();
    }
    function paintQueue() {
      queue.forEach(function (j, i) {
        j.rec.stat.innerHTML = '<span class="q">' + (!pyReady ? "Waiting for Python" : (i === 0 && current) || (i === 0) ? "Up next" : "Queued &#183; " + ord(i + 1)) + '</span>';
      });
    }
    function pump() {
      if (current) return;
      if (!queue.length) { paintBusy(); if (status.state === "busy") setStatus("ready"); return; }
      if (!pyReady) { paintQueue(); loadPy().then(pump, function () { cancelQueue(); endBatch(); }); return; }
      var job = current = queue.shift(); paintQueue();
      if (job.opts.batch && job.opts.batch === batch) { batch.at = batch.list.indexOf(job.rec.n) + 1; paintBatch(); }
      exec(job).then(function (r) { current = null; afterJob(job, r); pump(); });
    }
    function runPrereqs(rec, eng) {
      var list = [];
      for (var j = 0; j < rec.n; j++) { if (sessionRan[j] || editors[j].skipPre || editors[j].state === "stopped") continue; var c = codeOf(j); if (!c.trim() || /\binput\s*\(/.test(c)) continue; list.push(j); }
      var quiet = { out: noop, err: noop, input: function () { return Promise.resolve(""); } };
      var chain = Promise.resolve();
      list.forEach(function (j, k) {
        chain = chain.then(function () {
          if (rec.state === "stopping") throw stoppedError();
          rec.phase = "Cells above &#183; " + (k + 1) + "/" + list.length; rec.preCell = j;
          return Promise.resolve(eng.run(j, codeOf(j), quiet)).then(function () { sessionRan[j] = 1; editors[j].cell.classList.remove("cleared"); editors[j].cell.classList.add("ran"); }, noop);
        });
      });
      return chain.then(function () { rec.phase = null; rec.preCell = null; });
    }
    function exec(job) {
      var rec = job.rec, opts = job.opts, eng = engine();
      outReset(rec); clearErr(rec); rec.cell.classList.remove("cleared", "ran"); rec.errType = null; rec.secs = 0; rec.phase = null; rec.preCell = null;
      rec.t0 = Date.now();
      var abort; var stopped = new Promise(function (_, rej) { abort = rej; });
      rec.abort = function () { abort(stoppedError()); };
      setState(rec, "running"); setStatus("busy", { cell: rec.n });
      var io = { out: function (s) { outAppend(rec, s); }, err: function (s) { outAppend(rec, s); }, input: function (q) { return askInput(rec, q); } };
      var work = (PREREQS && !opts.noPre ? runPrereqs(rec, eng) : Promise.resolve()).then(function () {
        if (rec.state === "stopping") throw stoppedError();
        return eng.run(rec.n, codeOf(rec.n), io);
      });
      return Promise.race([work, stopped]).then(function (res) {
        res = res || {};
        if (res.repr != null && res.repr !== "") outAppend(rec, String(res.repr));
        (res.figures || []).forEach(function (b64) { addFig(rec, b64); });
        if (rec.state === "stopping") { rec.secs = rec.secs || Date.now() - rec.t0; return "stopped"; }
        if (!rec.lines.length && !rec.nfig) rec.quiet = true;
        rec.secs = Date.now() - rec.t0;
        sessionRan[rec.n] = 1; markRan(rec.n);
        return "done";
      }, function (e) {
        var tb = e && (e.traceback || e.message) || String(e);
        if ((e && e.stopped) || rec.state === "stopping" || /KeyboardInterrupt/.test(tb)) { rec.secs = rec.secs || Date.now() - rec.t0; return "stopped"; }
        rec.secs = Date.now() - rec.t0; showErr(rec, tb); return "error";
      }).then(function (r) {
        rec.abort = null; hideAsk(rec);
        if (stripMsg && stripMsg.kind === "running") setStrip(null);
        setState(rec, r); outPaint(rec);
        return r;
      });
    }

    /* ---- Stop: kill the worker, start a fresh session, tell the user ---- */
    function stopCell(rec) {
      if (rec.state !== "running" && rec.state !== "waiting") return;
      if (batch) { var b = batch; batch = null; cancelQueue(function (j) { return j.opts.batch === b; }); paintRunAll(); emit("np:runall", { state: "stopped", cell: rec.n, done: b.done, total: b.list.length, kind: b.kind }); }
      cancelQueue();
      if (stripMsg && (stripMsg.kind === "batch" || stripMsg.kind === "running")) setStrip(null);
      rec.secs = Date.now() - rec.t0;
      if (rec.phase && rec.preCell != null && editors[rec.preCell]) { editors[rec.preCell].skipPre = true; rec.stopAbove = rec.preCell; }
      hideAsk(rec);
      setState(rec, "stopping");
      if (typeof P.onStop === "function") { try { P.onStop(rec.n); } catch (e) {} }
      var eng = engine();
      if (typeof eng.stop !== "function") return;  // in-page engine: cannot interrupt; the cell ends as "Stopped" when the run returns
      setStatus("restarting");
      Promise.resolve().then(function () { return eng.stop(rec.n); }).then(function () {
        restarted({ cell: rec.n, secs: rec.secs, reason: "stopped" });
      }, function () {
        if (rec.abort) rec.abort();
        pyReady = false; setStatus("failed", { message: "Python did not restart. Reload the page." });
      });
    }
    function restarted(info) {
      info = info || {};
      var n = info.cell != null ? info.cell : (current ? current.rec.n : null);
      var rec = n != null ? editors[n] : null;
      if (current && current.rec.abort) { if (current.rec.state === "running" || current.rec.state === "waiting") { current.rec.secs = Date.now() - current.rec.t0; setState(current.rec, "stopping"); } current.rec.abort(); }
      if (batch) { batch = null; paintRunAll(); }
      cancelQueue();
      if (stripMsg && stripMsg.kind === "running") setStrip(null);
      var any = false;
      editors.forEach(function (r) { if (sessionRan[r.n] || r.cell.classList.contains("ran")) { any = true; r.cell.classList.remove("ran"); r.cell.classList.add("cleared"); if (r !== rec && /^(done|idle)$/.test(r.state)) { r.stat.innerHTML = ""; r.busyNote = false; r.statSaved = ""; } } });
      sessionRan = {};
      if (rec) {
        if (info.secs != null) rec.secs = info.secs;
        rec.note.innerHTML = (rec.stopAbove != null ? "Stopped while In [" + (rec.stopAbove + 1) + "] (a cell above) was running; it is skipped when cells above run quietly. " : "") +
          "Python restarted here &#8212; variables from earlier cells are gone.";
        rec.stopAbove = null;
        rec.note.hidden = false; outPaint(rec);
      }
      var above = n != null ? n : 0;
      var lead = info.reason === "crashed" ? "<b>Python stopped unexpectedly and restarted.</b> " : "<b>Python restarted.</b> ";
      setStrip({ kind: "restart", close: true,
        msg: lead + (above || any ? "Variables from earlier cells are gone &#8212; re-run the cells above." : "Nothing ran before this cell, so nothing was lost."),
        acts: above ? [["rerun", "&#8635; Re-run " + (above === 1 ? "1" : "1&#8211;" + above), "np-btn go", above]] : [] });
      pyReady = true; setStatus("ready");
      emit("np:restart", { cell: n, secs: rec ? rec.secs : null, reason: info.reason || "stopped" });
    }

    /* ---- Run all / Re-run 1–k: a batch on the same queue ---- */
    runAllBtn = document.getElementById("np-runall");
    function runBatch(list, kind) {
      if (batch || current) return;
      list = list.filter(function (n) { return editors[n] && /^(idle|done|error|stopped)$/.test(editors[n].state); });
      if (!list.length) return;
      var b = batch = { list: list, kind: kind, done: 0, at: 0, t0: Date.now() };
      if (stripMsg && (stripMsg.kind === "restart" || stripMsg.kind === "batch-error" || stripMsg.kind === "done")) setStrip(null);
      paintBatch();
      list.forEach(function (n) { enqueue(editors[n], { noPre: true, batch: b }); });
    }
    function rerunAbove(k) { runBatch(range(k), "rerun"); }
    function batchName(b) { return b.kind === "rerun" ? "Re-running 1&#8211;" + b.list.length : "Running all"; }
    function paintBatch() {
      var b = batch; if (!b) return;
      var at = Math.max(1, b.at), tot = b.list.length;
      setStrip({ kind: "batch", msg: "<b>" + batchName(b) + "</b> &#183; " + at + " / " + tot, bar: Math.round(b.done / tot * 100), acts: [["stopall", "&#9632; Stop", "np-btn stop"]] });
      paintRunAll();
      emit("np:runall", { state: "running", kind: b.kind, at: at, done: b.done, total: tot });
    }
    function paintRunAll() {
      if (batch) { runAllBtn.disabled = false; runAllBtn.innerHTML = "&#9632; Stop &#183; " + Math.max(1, batch.at) + " / " + batch.list.length; runAllBtn.className = "np-btn stop"; runAllBtn.title = "Stop running (restarts Python)"; }
      else { runAllBtn.innerHTML = "&#9654; Run all"; runAllBtn.className = "np-btn go"; runAllBtn.title = "Run every cell from the top"; }
    }
    function endBatch() { if (batch) { batch = null; paintRunAll(); if (stripMsg && stripMsg.kind === "batch") setStrip(null); } }
    function afterJob(job, r) {
      var b = job.opts.batch; if (!b || b !== batch) return;
      b.done++;
      if (r === "error") {
        batch = null; cancelQueue(function (j) { return j.opts.batch === b; }); paintRunAll();
        setStrip({ kind: "batch-error", close: true,
          msg: "<b>" + (b.kind === "rerun" ? "Re-run" : "Run all") + " stopped at In [" + (job.rec.n + 1) + "]</b> &#183; " + esc(job.rec.errType || "Error"),
          acts: [["goto", "Go to cell", "np-btn", job.rec.n]] });
        scrollToEl(job.rec.cell);
        emit("np:runall", { state: "error", kind: b.kind, cell: job.rec.n, done: b.done, total: b.list.length });
        return;
      }
      if (r === "stopped") { batch = null; paintRunAll(); return; }
      if (b.done >= b.list.length) {
        batch = null; paintRunAll();
        setStrip({ kind: "done", ttl: 4000, close: true, msg: "<b>&#10003; " + (b.kind === "rerun" ? "Re-ran 1&#8211;" + b.list.length : "Ran all " + b.list.length) + "</b> &#183; " + fmtS(Date.now() - b.t0) });
        emit("np:runall", { state: "done", kind: b.kind, done: b.done, total: b.list.length });
      } else paintBatch();
    }
    function stopAll() {
      var cur = current && current.rec;
      if (cur && (cur.state === "running" || cur.state === "waiting")) { stopCell(cur); return; }
      if (batch) { var b = batch; batch = null; emit("np:runall", { state: "stopped", kind: b.kind, done: b.done, total: b.list.length }); }
      cancelQueue(); paintRunAll(); if (stripMsg && stripMsg.kind === "batch") setStrip(null);
    }
    runAllBtn.onclick = function () { if (batch) stopAll(); else if (!isBusy()) runBatch(range(TOTAL), "all"); };
    document.getElementById("np-resetall").onclick = function () {
      if (current || queue.length) return;
      if (!root.confirm || root.confirm("Put every cell back to the notebook's original code and clear the run marks?")) {
        editors.forEach(function (r) { store(LS("code_" + r.n), null); r.set(r.original); outReset(r); clearErr(r); setState(r, "idle"); r.cell.classList.remove("ran", "cleared"); });
        store(LS("ran"), null); paintProgress();
      }
    };

    /* ---- outline: rail + phone select ---- */
    var ol = document.getElementById("np-ol"), sel = document.getElementById("np-sel");
    var railLinks = [];
    var optTop = el("option"); optTop.value = "0"; optTop.textContent = "Top of page"; sel.appendChild(optTop);
    var og = null;
    A.items.forEach(function (it) {
      if (it.kind === "group") {
        ol.appendChild(el("li", "grp", esc(it.label)));
        og = document.createElement("optgroup"); og.label = it.label; sel.appendChild(og);
        return;
      }
      var u = A.units[it.u], num = it.u + 1;
      var li = el("li"); var a = el("a");
      a.href = "#np-u" + num;
      a.innerHTML = '<span class="n">' + String(num).padStart(2, "0") + '</span><span class="t">' + esc(u.label) + '</span>';
      a.onclick = function (e) { e.preventDefault(); goUnit(it.u); };
      li.appendChild(a); ol.appendChild(li); railLinks[it.u] = a;
      var o = el("option"); o.value = String(num); o.textContent = num + ". " + u.label;
      (og || sel).appendChild(o);
    });
    if (!A.units.length) { ol.appendChild(el("li", "grp", "No headings in this notebook")); }
    sel.onchange = function () { var v = +sel.value; if (v === 0) root.scrollTo({ top: 0 }); else goUnit(v - 1); };

    function goUnit(k) {
      var t = unitEls[k]; if (!t) return;
      root.scrollTo({ top: t.getBoundingClientRect().top + root.pageYOffset - headH() - 8 });
      onScroll();
      store(LS("unit"), String(k + 1));
      if (history.replaceState) history.replaceState(null, "", "#np-u" + (k + 1));
    }

    var curUnit = -2, restored = false;
    function onScroll() {
      var y = headH() + 24, k = -1;
      for (var i = 0; i < unitEls.length; i++) { if (unitEls[i] && unitEls[i].getBoundingClientRect().top <= y) k = i; else break; }
      if (k === curUnit) return;
      curUnit = k;
      if (restored) store(LS("unit"), String(k + 1));
      railLinks.forEach(function (a, i) { if (a) a.classList.toggle("on", i === k); });
      if (k >= 0 && railLinks[k]) {
        var box = rail.querySelector(".np-rail-in"), a = railLinks[k];
        var r = a.getBoundingClientRect(), bb = box.getBoundingClientRect();
        if (r.top < bb.top + 40 || r.bottom > bb.bottom - 20) box.scrollTop += (r.top - bb.top) - box.clientHeight / 2;
      }
      sel.value = String(k + 1 > 0 ? k + 1 : 0);
      var txt = A.units.length ? (k >= 0 ? UNIT + " <b>" + (k + 1) + "</b> of " + A.units.length : plural(A.units.length, UNIT.toLowerCase())) : plural(TOTAL, "code cell");
      document.getElementById("np-pos-d").innerHTML = txt;
      document.getElementById("np-pos-m").innerHTML = k >= 0 ? (k + 1) + " / " + A.units.length : "";
    }
    var ticking = false;
    root.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); if (current) guardStop(current.rec); }); } }, { passive: true });
    root.addEventListener("resize", function () { setHeadH(); onScroll(); });

    /* ---- progress (persisted: "run on this device") ---- */
    function paintProgress() {
      var m = ranMap(), n = 0, k;
      for (k in m) if (m[k] && +k < TOTAL) n++;
      document.getElementById("np-fill").style.width = (TOTAL ? Math.round(n / TOTAL * 100) : 0) + "%";
      document.getElementById("np-pc").textContent = n + " / " + TOTAL + " run";
      A.units.forEach(function (u, i) {
        var done = u.codes.length && u.codes.some(function (c) { return m[c]; });
        if (railLinks[i]) railLinks[i].classList.toggle("done", !!done);
      });
    }
    function markRan(n) {
      var m = ranMap(); if (!m[n]) { m[n] = 1; saveRan(m); }
      if (editors[n]) { editors[n].skipPre = false; editors[n].cell.classList.remove("cleared"); editors[n].cell.classList.add("ran"); }
      paintProgress();
    }

    /* practice logs: offer the problem-card view when data/<id>.js exists */
    if (practice) {
      var addCards = function () {
        var has = (root.PRACTICE_SET_INDEX || []).some(function (st) { return st.set === ID; });
        if (!has) return;
        var b = el("a", "np-btn", "&#9638; View as problem cards"); b.href = "set.html?s=" + encodeURIComponent(ID);
        var acts = head2.querySelector(".np-head2-in"); if (acts) acts.insertBefore(b, acts.querySelector(".np-jump"));
      };
      if (root.PRACTICE_SET_INDEX) addCards();
      else { var si = document.createElement("script"); si.src = "data/index.js"; si.onload = addCards; si.onerror = noop; document.head.appendChild(si); }
    }

    /* ---- public hooks (HOOKS.md) ---- */
    P.setStatus = setStatus;
    P.sessionRestarted = restarted;
    P.askInput = function (n, q) { return editors[n] ? askInput(editors[n], q) : Promise.reject(new Error("No cell " + n)); };
    /* returns false (and does nothing) while Python is busy */
    P.runCell = function (n, o) { return !!(editors[n] && enqueue(editors[n], o && o.noPre ? { noPre: true } : {})); };
    P.stopCell = function (n) { if (editors[n]) stopCell(editors[n]); };
    P.runAll = function () { runBatch(range(TOTAL), "all"); };
    P.stopAll = stopAll;
    P.rerunAbove = rerunAbove;
    P.load = function () { return loadPy().then(pump); };
    P.state = function () {
      return { status: status.state, running: current ? current.rec.n : null, queued: queue.map(function (j) { return j.rec.n; }),
        batch: batch ? { kind: batch.kind, at: batch.at, done: batch.done, total: batch.list.length } : null,
        sessionRan: Object.keys(sessionRan).map(Number), cells: editors.map(function (r) { return r.state; }) };
    };

    /* ---- go ---- */
    setStatus("idle");
    paintRunAll(); paintProgress(); onScroll();
    function refresh() { cms.forEach(function (cm) { try { cm.refresh(); } catch (e) {} }); }
    root.addEventListener("load", function () { refresh(); setHeadH(); onScroll(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { refresh(); setHeadH(); });
    var want = /^#np-u(\d+)$/.exec(location.hash || "");
    var last = want ? +want[1] : (+store(LS("unit")) || 0);
    if (last > 0 && unitEls[last - 1]) setTimeout(function () { goUnit(last - 1); restored = true; }, 80);
    else restored = true;
    if (AUTOLOAD) setTimeout(function () { loadPy().then(pump, noop); }, 600);

    return { units: A.units, total: TOTAL, run: P.runCell, stop: P.stopCell, state: P.state };
  }

  var P = root.NotebookPlayer = root.NotebookPlayer || {};
  P.mount = mount; P.analyse = analyse; P.heading = heading; P.builtinEngine = builtinEngine;
  if (!("engine" in P)) P.engine = null;    // set to a worker engine (HOOKS.md)
  if (!("onStop" in P)) P.onStop = null;    // optional notification: onStop(cellIndex)
  if (!("onRetry" in P)) P.onRetry = null;  // optional notification before a retry
})(window);
