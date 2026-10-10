/* notebook-player.js — one shared player for every Python notebook page.
 *
 * A page is just: <head> includes + <script type="application/json" id="nbdata">
 * (a flat list of {t:"md"|"code", s:"..."} cells) + one call:
 *
 *   NotebookPlayer.mount({
 *     id:     "02_for_loops",          // storage key prefix (keeps old saved edits)
 *     folder: "fundamentals",          // shown in the bar path
 *     file:   "02_for_loops.ipynb",    // source notebook name
 *     crumb:  "for loops",             // last breadcrumb
 *     kicker: "Fundamentals · Notebook",
 *     title:  "Python <code>for loops</code>",   // HTML allowed
 *     sub:    "…",                     // HTML allowed, optional
 *     repl:   "<span class=as>for i in range(5):</span>",  // optional
 *     unit:   "Section" | "Problem",   // optional; what the outline counts
 *     prereqs: true                    // run earlier cells first when you jump ahead
 *   });
 *
 * Needs (optional, degrades gracefully): marked, CodeMirror (+python mode), Pyodide.
 */
(function (root) {
  "use strict";

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
      return l.replace(/^(\s{0,3}#{1,6})(?=[^#\s])/, "$1 ");
    }).join("\n");
  }
  function renderMd(src) {
    var s = normMd(src);
    if (root.marked) { try { return root.marked.parse(s); } catch (e) {} }
    return "<pre>" + esc(s) + "</pre>";
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

  /* ------------------------------------------------------------- Pyodide */
  var py = null, pyReady = false, pyLoading = null, setLed = function () {};
  function ensurePy() {
    if (pyReady) return Promise.resolve(py);
    if (pyLoading) return pyLoading;
    if (typeof root.loadPyodide !== "function") { setLed("Python unavailable", "err"); return Promise.reject(new Error("Pyodide not loaded")); }
    setLed("loading Python…", "loading");
    pyLoading = root.loadPyodide().then(function (p) {
      py = p;
      py.globals.set("__js_input", function (q) { var r = root.prompt(q || ""); return r === null ? "" : r; });
      return py.runPythonAsync(
        "import builtins, os\n" +
        "os.environ['MPLBACKEND']='AGG'\n" +
        "def __input(prompt=''):\n" +
        "    r=__js_input(str(prompt))\n" +
        "    print(str(prompt)+str(r))\n" +
        "    return str(r)\n" +
        "builtins.input=__input\n");
    }).then(function () { pyReady = true; setLed("Python ready", "ready"); return py; },
            function (e) { pyLoading = null; setLed("Python failed (offline?)", "err"); throw e; });
    return pyLoading;
  }
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
    var A = analyse(CELLS, { dropEmpty: practice });
    var TOTAL = CELLS.filter(function (c) { return c.t === "code"; }).length;
    var up = cfg.up || "../index.html", home = cfg.home || "../../../index.html", coding = cfg.coding || "../../index.html";

    function ranMap() { try { return JSON.parse(store(LS("ran")) || "{}"); } catch (e) { return {}; } }
    function saveRan(m) { store(LS("ran"), JSON.stringify(m)); }

    /* ---- shell ---- */
    var body = document.body;
    body.classList.add("np");
    var bar = el("header", "np-bar");
    bar.innerHTML =
      '<div class="np-bar-in">' +
        '<a class="np-hbtn home" href="' + esc(home) + '" title="Commonplace home">&#8962;<span class="lbl-long"> Home</span></a>' +
        '<a class="np-hbtn" href="' + esc(up) + '" title="Python hub">&#8249; Python</a>' +
        '<span class="np-ttl">~/python/' + esc(cfg.folder || "") + '/<b>' + esc(cfg.file || ID) + '</b></span>' +
        '<span class="np-led" id="np-led" role="status" aria-live="polite"><span class="dot"></span><span class="t" id="np-led-t">Python not loaded</span></span>' +
        '<span class="np-prog" title="code cells run on this device"><span class="track"><span class="fill" id="np-fill"></span></span><span class="pc" id="np-pc">0 / ' + TOTAL + '</span></span>' +
      '</div>';
    var jump = el("div", "np-jump");
    jump.innerHTML = '<label class="sr" for="np-sel" hidden>Jump to</label><select id="np-sel" aria-label="Jump to"></select><span class="np-pos" id="np-pos-m"></span>';
    var layout = el("div", "np-layout");
    var rail = el("aside", "np-rail");
    rail.setAttribute("aria-label", "Outline");
    rail.innerHTML = '<div class="np-rail-in"><div class="np-rail-k">Outline</div><div class="np-pos" id="np-pos-d"></div><ul class="np-ol" id="np-ol"></ul></div>';
    var main = el("main", "np-main");
    main.innerHTML =
      '<nav class="np-crumb" aria-label="Breadcrumb">' +
        '<a href="' + esc(home) + '">Commonplace</a><span class="sep">/</span>' +
        '<a href="' + esc(coding) + '">Coding</a><span class="sep">/</span>' +
        '<a href="' + esc(up) + '">Python</a><span class="sep">/</span>' +
        '<span class="here">' + esc(cfg.crumb || ID) + '</span></nav>' +
      '<header class="np-mast" data-file="' + esc(cfg.file || "") + '">' +
        '<span class="np-wdots"><i class="r"></i><i class="y"></i><i class="g"></i></span>' +
        '<div class="k">' + esc(cfg.kicker || "Notebook") + '</div>' +
        '<h1>' + (cfg.title || esc(ID)) + '</h1>' +
        (cfg.sub ? '<p class="sub">' + cfg.sub + '</p>' : '') +
        (cfg.repl ? '<div class="repl"><span class="pr">&gt;&gt;&gt;</span> ' + cfg.repl + '<span class="cur"></span></div>' : '') +
        '<div class="meta">' + (cfg.file ? '<span>from <b>' + esc(cfg.file) + '</b></span><span>&#183;</span>' : '') +
          '<span>' + plural(A.units.length, UNIT.toLowerCase()) + '</span><span>&#183;</span>' +
          '<span>' + plural(TOTAL, 'code cell') + '</span><span>&#183;</span><span>one shared Python session</span></div>' +
        '<div class="acts"><button class="np-btn go" id="np-runall">&#9654; Run all</button><button class="np-btn" id="np-resetall">&#8635; Reset all</button></div>' +
      '</header>' +
      '<div id="np-cells"></div>' +
      '<div class="np-note">Every code cell is live and they all share one Python session, so run them top to bottom (or <b>Run all</b>). ' +
        (PREREQS ? 'If you jump ahead, the cells above run quietly first. ' : '') +
        'Press <code>Shift+Enter</code> in a cell to run it. Edits are saved on this device. The first run downloads Python, so it needs a connection.</div>' +
      '<footer class="np-colophon"><span><a href="' + esc(up) + '">&#8592; Python hub</a></span><span>CPython in the browser via Pyodide</span></footer>';
    layout.appendChild(rail); layout.appendChild(main);
    body.insertBefore(layout, body.firstChild);
    body.insertBefore(jump, layout);
    body.insertBefore(bar, jump);

    var led = document.getElementById("np-led"), ledT = document.getElementById("np-led-t");
    setLed = function (t, c) { led.className = "np-led " + (c || ""); ledT.textContent = t; };

    /* ---- cells ---- */
    var host = document.getElementById("np-cells");
    var editors = [], unitEls = [], cms = [];
    var codeIdx = 0, unitByCell = {};
    A.units.forEach(function (u, k) { unitByCell[u.cell] = k; });

    CELLS.forEach(function (c, i) {
      if (c.t === "md") {
        var d = el("div", "np-md", renderMd(c.s));
        if (unitByCell[i] !== undefined) { d.classList.add("np-unit"); d.id = "np-u" + (unitByCell[i] + 1); unitEls[unitByCell[i]] = d; }
        host.appendChild(d);
        return;
      }
      host.appendChild(buildCell(c.s, codeIdx++));
    });

    function buildCell(src, n) {
      var cell = el("section", "np-cell");
      cell.setAttribute("aria-label", "Code cell " + (n + 1));
      var top = el("div", "top");
      top.innerHTML = '<span class="pip"></span><span class="lbl">In [' + (n + 1) + ']</span>';
      var reset = el("button", "np-mini", "Reset"); reset.title = "Put back the notebook's original code";
      var run = el("button", "np-run", "&#9654; Run"); run.title = "Run (Shift+Enter)";
      top.appendChild(reset); top.appendChild(run);
      var ta = el("textarea", "np-ta"); ta.spellcheck = false;
      var saved = store(LS("code_" + n));
      ta.value = (saved != null && saved !== "") ? saved : src;
      ta.rows = Math.min(24, Math.max(2, ta.value.split("\n").length));
      var out = el("pre", "np-out"); out.setAttribute("data-ix", n + 1); out.setAttribute("aria-live", "polite");
      cell.appendChild(top); cell.appendChild(ta); cell.appendChild(out);

      var rec = { n: n, original: src, out: out, run: run, cell: cell };
      if (root.CodeMirror) {
        var cm = null;
        // CodeMirror needs the textarea in the document; create it on next tick
        rec.get = function () { return cm ? cm.getValue() : ta.value; };
        rec.set = function (v) { if (cm) cm.setValue(v); else ta.value = v; };
        rec.init = function () {
          cm = root.CodeMirror.fromTextArea(ta, { mode: "python", lineNumbers: true, indentUnit: 4, viewportMargin: Infinity,
            extraKeys: { "Shift-Enter": function () { runCell(rec); }, "Ctrl-Enter": function () { runCell(rec); }, "Tab": function (c) { c.execCommand(c.somethingSelected() ? "indentMore" : "insertSoftTab"); } } });
          cm.on("change", function () { store(LS("code_" + n), cm.getValue()); });
          cms.push(cm);
        };
      } else {
        rec.get = function () { return ta.value; };
        rec.set = function (v) { ta.value = v; };
        ta.addEventListener("keydown", function (e) { if (e.shiftKey && e.key === "Enter") { e.preventDefault(); runCell(rec); } });
        ta.addEventListener("input", function () { store(LS("code_" + n), ta.value); });
      }
      run.onclick = function () { runCell(rec); };
      reset.onclick = function () { rec.set(src); store(LS("code_" + n), null); out.className = "np-out"; out.textContent = ""; };
      if (ranMap()[n]) cell.classList.add("ran");
      editors[n] = rec;
      return cell;
    }
    editors.forEach(function (r) { if (r.init) r.init(); });

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
    sel.onchange = function () { var v = +sel.value; if (v === 0) window.scrollTo({ top: 0 }); else goUnit(v - 1); };

    function goUnit(k) {
      var t = unitEls[k]; if (!t) return;
      t.scrollIntoView({ block: "start", behavior: "auto" });
      onScroll();
      store(LS("unit"), String(k + 1));
      if (history.replaceState) history.replaceState(null, "", "#np-u" + (k + 1));
    }

    var curUnit = -2, restored = false;
    function onScroll() {
      var y = (window.innerWidth >= 1100 ? 70 : 130), k = -1;
      for (var i = 0; i < unitEls.length; i++) { if (unitEls[i] && unitEls[i].getBoundingClientRect().top <= y) k = i; else break; }
      if (k === curUnit) return;
      curUnit = k;
      if (restored) store(LS("unit"), String(k + 1));
      railLinks.forEach(function (a, i) { if (a) a.classList.toggle("on", i === k); });
      if (k >= 0 && railLinks[k]) {
        var box = rail.querySelector(".np-rail-in"), a = railLinks[k];
        var r = a.getBoundingClientRect(), b = box.getBoundingClientRect();
        if (r.top < b.top + 40 || r.bottom > b.bottom - 20) box.scrollTop += (r.top - b.top) - box.clientHeight / 2;
      }
      sel.value = String(k + 1 > 0 ? k + 1 : 0);
      var txt = A.units.length ? (k >= 0 ? UNIT + " <b>" + (k + 1) + "</b> of " + A.units.length : plural(A.units.length, UNIT.toLowerCase())) : plural(TOTAL, "code cell");
      document.getElementById("np-pos-d").innerHTML = txt;
      document.getElementById("np-pos-m").innerHTML = k >= 0 ? (k + 1) + " / " + A.units.length : "";
    }
    var ticking = false;
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }, { passive: true });
    window.addEventListener("resize", onScroll);

    /* ---- progress ---- */
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
      if (editors[n]) editors[n].cell.classList.add("ran");
      paintProgress();
    }

    /* ---- running ---- */
    var sessionRan = {};
    function codeOf(n) { return editors[n] ? editors[n].get() : ""; }
    function runQuiet(p, code) {
      return p.loadPackagesFromImports(code).catch(function () {}).then(function () { return p.runPythonAsync(code); }).catch(function () {});
    }
    function runPrereqs(p, n) {
      var chain = Promise.resolve();
      for (var j = 0; j < n; j++) (function (j) {
        if (sessionRan[j]) return;
        var code = codeOf(j);
        if (!code.trim() || /\binput\s*\(/.test(code)) return;   // never pop prompts for cells you skipped
        chain = chain.then(function () { return runQuiet(p, code); }).then(function () { sessionRan[j] = 1; });
      })(j);
      return chain;
    }
    function runCell(rec, opts) {
      opts = opts || {};
      var out = rec.out, buf = "";
      out.className = "np-out show"; out.textContent = ""; rec.run.disabled = true;
      function append(s) { buf += s + "\n"; out.textContent = buf; }
      var code = rec.get();
      return ensurePy().then(function (p) {
        return (PREREQS && !opts.noPre ? runPrereqs(p, rec.n) : Promise.resolve()).then(function () {
          p.setStdout({ batched: append }); p.setStderr({ batched: append });
          return p.loadPackagesFromImports(code).catch(function () {});
        }).then(function () { return p.runPythonAsync(code); }).then(function (res) {
          if (res !== undefined && res !== null) {
            var rep; try { var b = p.pyimport("builtins"); rep = b.repr(res); b.destroy(); } catch (e) { rep = String(res); }
            append(rep);
            if (res && typeof res.destroy === "function") { try { res.destroy(); } catch (e) {} }
          }
          return p.runPythonAsync(FIGCODE);
        }).then(function (fp) {
          var figs = fp.toJs(); fp.destroy();
          figs.forEach(function (b64) { var img = new Image(); img.alt = "figure"; img.src = "data:image/png;base64," + b64; out.appendChild(img); });
          if (!buf && !figs.length) out.textContent = "(ran — no output)";
          sessionRan[rec.n] = 1; markRan(rec.n);
        });
      }).catch(function (e) {
        out.classList.add("err");
        out.textContent = (buf ? buf : "") + (e && e.message ? e.message : String(e));
      }).then(function () { rec.run.disabled = false; });
    }

    document.getElementById("np-runall").onclick = function () {
      var chain = Promise.resolve();
      editors.forEach(function (r) { chain = chain.then(function () { return runCell(r, { noPre: true }); }); });
    };
    document.getElementById("np-resetall").onclick = function () {
      if (!root.confirm || root.confirm("Put every cell back to the notebook's original code and clear the run marks?")) {
        editors.forEach(function (r) { store(LS("code_" + r.n), null); r.set(r.original); r.out.className = "np-out"; r.out.textContent = ""; r.cell.classList.remove("ran"); });
        store(LS("ran"), null); paintProgress();
      }
    };

    /* practice logs: offer the problem-card view when data/<id>.js exists */
    if (practice) {
      var addCards = function () {
        var has = (root.PRACTICE_SET_INDEX || []).some(function (st) { return st.set === ID; });
        if (!has) return;
        var b = el("a", "np-btn", "&#9638; View as problem cards"); b.href = "set.html?s=" + encodeURIComponent(ID);
        var acts = main.querySelector(".np-mast .acts"); if (acts) acts.insertBefore(b, acts.firstChild);
      };
      if (root.PRACTICE_SET_INDEX) addCards();
      else { var si = document.createElement("script"); si.src = "data/index.js"; si.onload = addCards; si.onerror = function () {}; document.head.appendChild(si); }
    }

    /* ---- go ---- */
    paintProgress();
    onScroll();
    function refresh() { cms.forEach(function (cm) { try { cm.refresh(); } catch (e) {} }); }
    root.addEventListener("load", function () { refresh(); onScroll(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    // deep link (#np-u7) or the last place you were
    var want = /^#np-u(\d+)$/.exec(location.hash || "");
    var last = want ? +want[1] : (+store(LS("unit")) || 0);
    if (last > 0 && unitEls[last - 1]) setTimeout(function () { unitEls[last - 1].scrollIntoView({ block: "start" }); restored = true; }, 80);
    else restored = true;
    setTimeout(function () { ensurePy().catch(function () {}); }, 600);

    return { units: A.units, total: TOTAL, run: function (n) { return editors[n] && runCell(editors[n]); } };
  }

  root.NotebookPlayer = { mount: mount, analyse: analyse, heading: heading };
})(window);
