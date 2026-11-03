/* reader.js — Observatory chapter reader, study edition.
   Loads files/<nb>.ipynb, groups its cells into the notebook's own sections, and
   presents one section at a time (or the whole chapter) with:
     · paper / dark skins, focus / page views, alive / still motion — all remembered
     · a margin per section: printed aside + a note you write (hover to reveal)
     · recall questions and checked exercises from study-data.js
     · an optional interactive lab (lab.js) whose points Python can read
   Python runs via Pyodide, one shared session, exactly as before. */
(function () {
  const qs = new URLSearchParams(location.search);
  const CHAPTERS = window.AI_CHAPTERS || [];
  const file = qs.get("nb") || (CHAPTERS[0] && CHAPTERS[0].file) || "";
  const ch = CHAPTERS.find((c) => c.file === file) ||
    { id: "—", title: file.replace(".ipynb", "").replace(/_/g, " "), tag: "", lead: "" };
  const STUDY = (window.AI_STUDY || {})[ch.id] || {};
  const SSTUDY = STUDY.sections || {};
  const LAB_SEC = STUDY.lab && STUDY.lab.section != null ? STUDY.lab.section : 1;
  const ACC = (window.AI_ACCENTS || {})[ch.id] || "#7c9bf0";
  const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV"];

  document.documentElement.style.setProperty("--acc-dark", ACC);
  document.title = ch.title + " · Classical ML";

  /* ---------------------------------------------------------------- prefs */
  const PK = "aistudy.reader.prefs.v1";
  let prefs = { skin: "paper", view: "focus", motion: "alive" };
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PK) || "{}")); } catch (e) {}
  function applyPrefs() {
    const r = document.documentElement;
    r.dataset.skin = prefs.skin; r.dataset.motion = prefs.motion; r.dataset.view = prefs.view;
    document.querySelectorAll("[data-pref]").forEach((b) => {
      b.classList.toggle("on", prefs[b.dataset.pref] === b.dataset.val);
    });
    try { localStorage.setItem(PK, JSON.stringify(prefs)); } catch (e) {}
  }
  document.querySelectorAll("[data-pref]").forEach((b) => {
    b.addEventListener("click", () => {
      prefs[b.dataset.pref] = b.dataset.val; applyPrefs();
      if (b.dataset.pref === "motion") mountMotif();
      render();
    });
  });
  applyPrefs();

  /* phones and tablets: view settings live behind the gear, and the bar slides away while you
     scroll down (back as soon as you scroll up), so code cells get the screen */
  const top = document.querySelector(".top"), gear = document.getElementById("gearBtn");
  const phone = window.matchMedia("(max-width:900px)");   /* phones and tablets */
  if (gear) gear.addEventListener("click", () => {
    const open = top.classList.toggle("is-open");
    gear.setAttribute("aria-expanded", open ? "true" : "false");
    top.classList.remove("is-hidden");
  });
  let lastY = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY, dy = y - lastY;
    if (Math.abs(dy) < 8) return;
    lastY = y;
    if (!phone.matches || top.classList.contains("is-open") || y < 120) { top.classList.remove("is-hidden"); return; }
    top.classList.toggle("is-hidden", dy > 0);
  }, { passive: true });

  /* ------------------------------------------------------------ chapter state */
  const app = document.getElementById("app");
  const store = {
    key: "aistudy.reader." + file,
    load() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { return {}; } },
    save(s) { try { localStorage.setItem(this.key, JSON.stringify(s)); } catch (e) {} }
  };
  let saved = store.load();
  let cells = [], sections = [], secOf = [], sec = Math.max(0, saved.sec || 0), cms = [], lab = null;
  let recall = saved.recall || {};      /* sectionIndex -> picked option */

  document.getElementById("crumbCh").textContent = (ch.id + " · " + ch.title).toUpperCase();
  const jl = document.getElementById("jlink");
  if (jl) jl.href = "../notebooks/index.html?path=" + encodeURIComponent(file);

  fetch("../files/" + file)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch((e) => {
      const offline = !navigator.onLine || e.message === "504" || e instanceof TypeError;
      app.innerHTML = '<div class="loading">' + (offline
        ? "This chapter isn't saved for offline use yet. Open it once while online and it will be here next time."
        : "Could not load files/" + file + " — " + e.message) + "</div>";
    });

  function src(c) { return Array.isArray(c.source) ? c.source.join("") : c.source || ""; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function join(t) { return Array.isArray(t) ? t.join("") : t || ""; }

  /* ------------------------------------------------- static python highlighter
     Page-view cells aren't CodeMirror, so they get the same palette by hand.
     Token classes (.t-*) are coloured by reader.html from the skin's --syn-* vars. */
  const PY_KW = /^(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case)$/;
  const PY_BI = /^(abs|all|any|bool|dict|enumerate|filter|float|format|getattr|hasattr|input|int|isinstance|iter|len|list|map|max|min|next|open|print|range|repr|reversed|round|set|setattr|slice|sorted|str|sum|super|tuple|type|zip)$/;
  function sp(cls, t) { return '<span class="t-' + cls + '">' + esc(t) + "</span>"; }
  function pyhl(code) {
    const re = /(#[^\n]*)|([rbfuRBFU]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'))|(\b\d+\.?\d*(?:[eE][+-]?\d+)?\b)|(@[A-Za-z_]\w*)|([A-Za-z_]\w*)|([+\-*/%=<>!&|^~]+)/g;
    let out = "", last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index)); last = re.lastIndex;
      const t = m[0];
      if (m[1]) out += sp("com", t);
      else if (m[2]) out += sp("str", t);
      else if (m[3]) out += sp("num", t);
      else if (m[4]) out += sp("dec", t);
      else if (m[5]) {
        const dotted = code[m.index - 1] === ".", call = /^\s*\(/.test(code.slice(re.lastIndex));
        if (PY_KW.test(t)) out += sp("kw", t);
        else if (t === "self" || t === "cls") out += sp("self", t);
        else if (!dotted && PY_BI.test(t)) out += sp("bi", t);
        else if (call) out += sp("fn", t);
        else if (dotted) out += sp("prop", t);
        else out += esc(t);
      } else out += sp("op", t);
    }
    return out + esc(code.slice(last));
  }

  function init(nb) {
    let s = -1, codeN = 0;
    nb.cells.forEach((c) => {
      const t = src(c).trim(); if (!t) return;
      if (c.cell_type === "markdown" && /^#{1,2}[^#]/.test(t)) {
        s++; sections.push(t.split("\n")[0].replace(/^#+\s*/, "").replace(/[*`]/g, ""));
      }
      const cell = { type: c.cell_type, src: t, orig: t, sec: Math.max(s, 0), ran: false, outs: c.outputs || [], live: null };
      if (c.cell_type === "code") cell.n = ++codeN;
      cells.push(cell);
    });
    if (!sections.length) sections.push(ch.title);
    (saved.ran || []).forEach((i) => { if (cells[i]) cells[i].ran = true; });
    sections.forEach((_, i) => { secOf[i] = cells.map((c, j) => (c.sec === i ? j : -1)).filter((j) => j >= 0); });
    if (sec >= sections.length) sec = 0;

    /* exercises become real cells at the end of their section */
    Object.keys(SSTUDY).forEach((k) => {
      /* exercise can be one object or a list of them */
      const i = +k; if (!secOf[i]) return;
      [].concat(SSTUDY[k].exercise || []).forEach((ex) => {
        cells.push({ type: "code", src: ex.code, orig: ex.code, sec: i, ran: false, outs: [], live: null, exercise: ex, n: ++codeN });
        secOf[i].push(cells.length - 1);
      });
    });

    buildHead();
    render();
    document.addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest(".CodeMirror,textarea,input")) return;
      if (prefs.view !== "focus") return;
      if (e.key === "ArrowRight") go(sec + 1);
      if (e.key === "ArrowLeft") go(sec - 1);
    });
  }

  /* ------------------------------------------------------------------ header */
  /* "read alongside": the study notes that cover this chapter (data.js AI_NOTES_FOR) */
  function alongside() {
    const list = (window.AI_NOTES_FOR || {})[ch.id] || [];
    if (!list.length) return "";
    return '<div class="alongside"><span class="eyebrow">read alongside</span>' +
      list.map((n) => '<a href="../' + n[0] + '">' + esc(n[1]) + '</a><span class="why"> — ' + esc(n[2]) + "</span>").join("<br>") +
      "</div>";
  }

  function buildHead() {
    const prog = progress();
    document.getElementById("head").innerHTML =
      '<div class="hero">' +
        '<div class="herotext">' +
          '<div class="kick"><span>' + (ch.group || "Chapter") + "</span><em>" + (ch.tag || "notebook") + "</em><span class=\"date\">" +
            new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + "</span></div>" +
          "<h1><i>" + ch.id + ".</i> " + ch.title + "</h1>" +
          (ch.lead ? '<p class="blurb">' + ch.lead + "</p>" : "") +
          '<div class="meta"><span>~' + (ch.time || "—") + " min</span><span><b>" + cells.filter((c) => c.type === "code").length +
            "</b> runnable cells</span><span><b>" + sections.length + "</b> sections</span><span>" + file + "</span></div>" +
          alongside() +
          '<div class="runall"><button class="btn btn-run" id="runAll" title="Run every code cell in the chapter, top to bottom">▶ Run all</button>' +
            '<span id="runAllMsg" class="runmsg" aria-live="polite"></span></div>' +
        "</div>" +
        '<figure class="fig"><div class="figplate"><canvas id="motif"></canvas>' +
          '<span class="figlab">fig. 1 · 4D, projected</span>' +
          '<span class="figspec"><i></i><i></i><i></i><i></i><i></i></span></div>' +
          '<figcaption><b>Fig. 1.</b> Each row of <code>X</code> is one point in 4-space. The sheet is the model; ' +
          "the fourth axis is drawn as colour — watch it turn.</figcaption></figure>" +
      "</div>" +
      '<div class="journey"><div><div class="eyebrow">the journey · <b>' + prog.done + "</b> of " + CHAPTERS.length + " understood</div>" +
        '<div class="cmap">' + CHAPTERS.map((c) => {
          const st = c.id === ch.id ? "here" : prog.map[c.id] === "done" ? "done" : "";
          return '<a class="cm ' + st + '" href="reader.html?nb=' + encodeURIComponent(c.file) + '" title="' + c.id + " · " + c.title + '"></a>';
        }).join("") + "</div></div>" +
        '<div class="jsum"><div class="eyebrow">this chapter</div><div id="chsum"></div></div></div>';
    mountMotif();
    const ra = document.getElementById("runAll");
    if (ra) ra.onclick = runAll;
  }
  function progress() {
    let map = {};
    try { map = JSON.parse(localStorage.getItem("aistudy.progress.v1")) || {}; } catch (e) {}
    return { map: map, done: Object.keys(map).filter((k) => map[k] === "done").length };
  }
  function mountMotif() {
    const cv = document.getElementById("motif");
    if (!cv || !window.Motifs) return;
    if (cv._cleanup) { cv._cleanup(); cv._cleanup = null; }
    /* motifs.js sizes itself from the canvas box, so wait until layout gives it one */
    let tries = 0;
    (function whenSized() {
      if (!cv.isConnected) return;
      if (cv.getBoundingClientRect().width < 2) {
        if (tries++ < 60) return requestAnimationFrame(whenSized);
        return;
      }
      cv._cleanup = window.Motifs.mount(cv, { type: ch.motif || "scatter", seed: ch.seed || 4, accent: ACC, hero: true, speed: prefs.motion === "still" ? 0 : 1 });
    })();
  }

  /* ------------------------------------------------------------------ render */
  function go(i) {
    if (i < 0 || i >= sections.length) return;
    sec = i; saved.sec = i; store.save(saved);
    render(); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function render() {
    cms = [];
    const nav = sections.map((t, i) =>
      '<button class="snav' + (i === sec ? " is-cur" : "") + (recallOk(i) ? " is-ok" : "") + '" data-sec="' + i + '">' +
      ROMAN[i] + '<span>' + esc(t) + "</span></button>").join("");
    const rail = document.getElementById("secnav");
    rail.innerHTML = '<div class="snavin">' + nav + "</div>";
    document.querySelectorAll("[data-sec]").forEach((b) => {
      b.onclick = () => {
        if (prefs.view === "focus") return go(+b.dataset.sec);
        const el = document.querySelector('.section[data-s="' + b.dataset.sec + '"]');
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
      };
    });
    const curBtn = rail.querySelector(".snav.is-cur");
    if (curBtn) {
      const pad = 24;
      const left = curBtn.offsetLeft - pad, right = curBtn.offsetLeft + curBtn.offsetWidth + pad;
      if (left < rail.scrollLeft) rail.scrollLeft = Math.max(0, left);
      else if (right > rail.scrollLeft + rail.clientWidth) rail.scrollLeft = right - rail.clientWidth;
    }
    document.getElementById("prog").innerHTML = "<b>" + pct() + "%</b> of chapter";
    const sum = document.getElementById("chsum");
    if (sum) sum.innerHTML = ranCount() + "/" + cells.filter((c) => c.type === "code").length + " cells ran<br>" +
      recallCounts().ok + "/" + recallCounts().total + " recalled";

    const list = prefs.view === "focus" ? [sec] : sections.map((_, i) => i);
    app.innerHTML = list.map(sectionHTML).join("");
    list.forEach(wire);
    if (STUDY.lab) mountLab();
  }

  function sectionHTML(i) {
    const st = SSTUDY[i] || {};
    const body = secOf[i].map((j) => cellHTML(j, i)).join("");
    const qs = rqs(i);
    const recallHTML = qs.length > 1
      ? '<div class="rcheck"><div class="rchead">Check yourself · ' + qs.length + " questions</div>" + qs.map((r, k) => recallBlock(i, r, k)).join("") + "</div>"
      : qs.length ? recallBlock(i, qs[0], 0) : "";
    const navHTML = prefs.view === "focus" ? focusNav(i) : "";
    return '<section class="section" data-s="' + i + '">' +
      '<div class="secmain">' +
        '<div class="sechead"><span class="secnum">§ ' + ROMAN[i] + "</span><span class=\"eyebrow\">" +
          (STUDY.lab && i === LAB_SEC ? "code · visual" : st.exercise ? "concept · exercise" : "concept") + "</span>" +
          (prefs.view === "focus" ? '<span class="eyebrow count">' + (i + 1) + " / " + sections.length + "</span>" : "") + "</div>" +
        (STUDY.lab && i === LAB_SEC ? '<div class="labhost" id="labhost"></div>' : "") +
        body + recallHTML + navHTML +
      "</div>" +
      '<aside class="margin">' +
        (st.aside ? '<div class="aside"><span>⁂</span>' + esc(st.aside) + "</div>" : "") +
        '<div class="notefield"><div class="notelab">margin · write here</div>' +
        '<textarea data-note="' + i + '" placeholder="…"></textarea></div>' +
      "</aside></section>";
  }

  function cellHTML(j, i) {
    const c = cells[j];
    if (c.type === "markdown") return '<div class="plate-md" data-i="' + j + '">' + marked.parse(c.src) + "</div>";
    const isStatic = prefs.view === "page" && !c.exercise;
    const head = c.exercise
      ? '<div class="exhead"><span class="eyebrow">exercise · checked</span><b>' + esc(c.exercise.title || "Your turn") + "</b>" +
        (c.exercise.prompt ? "<p>" + esc(c.exercise.prompt) + "</p>" : "") + "</div>"
      : "";
    return head + '<div class="plate-code' + (c.exercise ? " is-ex" : "") + '" data-i="' + j + '">' +
      '<div class="codebar"><span class="fname">cell_' + c.n + ".py</span>" +
      (c.ran ? '<span class="ran">● ran</span>' : "") + '<span class="grow"></span>' +
      (isStatic
        ? '<button class="btn" data-focus="' + i + '">▸ focus to run</button>'
        : '<button class="btn" data-above="' + j + '" title="Run every code cell before this one" aria-label="Run above"><span class="ic">⇤</span><span class="lb"> run above</span></button>' +
          '<button class="btn" data-reset="' + j + '" title="Restore the original code" aria-label="Reset"><span class="ic">↺</span><span class="lb"> Reset</span></button>' +
          '<button class="btn btn-run" data-run="' + j + '">▶ Run</button>') +
      "</div>" +
      (isStatic ? '<pre class="static" data-focus="' + i + '" title="Open this cell in focus view to run it">' + pyhl(c.src) + "</pre>" : '<div class="ed" data-ed="' + j + '"></div>') +
      '<div class="out" id="out-' + j + '"></div></div>';
  }

  function recallBlock(i, r, k) {
    const key = rkey(i, k), picked = recall[key], done = picked != null, ok = picked === r.answer;
    return '<div class="recall' + (done ? (ok ? " is-ok" : " is-no") : "") + '">' +
      '<div class="rlab">' + (done ? (ok ? "✓ recalled" : "↻ not yet — revisit") : "recall · before you move on") + "</div>" +
      "<div class=\"rq\">" + esc(r.q) + "</div><div class=\"ropts\">" +
      r.options.map((o, n) => '<button class="ropt' + (done && n === r.answer ? " is-ans" : done && n === picked ? " is-pick" : "") + '"' +
        (done ? " disabled" : "") + ' data-recall="' + key + '" data-opt="' + n + '"><i>' + "ABCD"[n] + "</i>" + esc(o) + "</button>").join("") +
      "</div>" + (done ? '<div class="rwhy">' + esc(r.why || "") + "</div>" : "") +
      (done && !ok ? '<button class="rretry" data-retry="' + key + '">↻ Try again</button>' : "") + "</div>";
  }

  function focusNav(i) {
    const p = sections[i - 1], n = sections[i + 1];
    return '<div class="focusnav">' +
      '<button class="navb" data-go="' + (i - 1) + '"' + (i === 0 ? " disabled" : "") + ">‹ " + (p ? "§ " + ROMAN[i - 1] + " · " + esc(p) : "start") + "</button>" +
      '<span class="keys"><kbd>←</kbd><kbd>→</kbd></span>' +
      '<button class="navb" data-go="' + (i + 1) + '"' + (i === sections.length - 1 ? " disabled" : "") + ">" + (n ? "§ " + ROMAN[i + 1] + " · " + esc(n) : "end") + " ›</button></div>";
  }

  /* ------------------------------------------------------------------- wiring */
  function wire(i) {
    secOf[i].forEach((j) => {
      const c = cells[j];
      const host = document.querySelector('[data-ed="' + j + '"]');
      if (host) {
        const cm = CodeMirror(host, { value: c.src, mode: "python", theme: prefs.skin === "paper" ? "obs-paper" : "obs", lineNumbers: true, indentUnit: 4, viewportMargin: Infinity });
        cm.on("change", () => { c.src = cm.getValue(); });
        cm.setOption("extraKeys", { "Shift-Enter": () => runCell(j) });
        cms[j] = cm;
      }
      paintOutInto(document.getElementById("out-" + j), c);
    });
    document.querySelectorAll("[data-run]").forEach((b) => (b.onclick = () => runCell(+b.dataset.run)));
    document.querySelectorAll("[data-above]").forEach((b) => (b.onclick = () => runAbove(+b.dataset.above)));
    document.querySelectorAll("[data-reset]").forEach((b) => (b.onclick = () => {
      const j = +b.dataset.reset, c = cells[j];
      c.src = c.orig; if (cms[j]) cms[j].setValue(c.orig);
    }));
    document.querySelectorAll("[data-focus]").forEach((b) => (b.onclick = () => {
      prefs.view = "focus"; applyPrefs(); go(+b.dataset.focus);
    }));
    document.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => go(+b.dataset.go)));
    document.querySelectorAll("[data-recall]").forEach((b) => (b.onclick = () => {
      const y = window.scrollY;
      recall[b.dataset.recall] = +b.dataset.opt; saved.recall = recall; store.save(saved); render();
      window.scrollTo(0, y);
    }));
    document.querySelectorAll("[data-retry]").forEach((b) => (b.onclick = () => {
      const y = window.scrollY;
      delete recall[b.dataset.retry]; saved.recall = recall; store.save(saved); render();
      window.scrollTo(0, y);
    }));
    document.querySelectorAll("[data-note]").forEach((t) => {
      const k = "aistudy.note." + ch.id + "." + t.dataset.note;
      try { t.value = localStorage.getItem(k) || ""; } catch (e) {}
      const grow = () => { t.style.height = "auto"; t.style.height = Math.max(54, t.scrollHeight) + "px"; };
      if (t.value) t.closest(".notefield").classList.add("has");
      requestAnimationFrame(grow);
      t.addEventListener("input", () => {
        try { localStorage.setItem(k, t.value); } catch (e) {}
        t.closest(".notefield").classList.toggle("has", !!t.value); grow();
      });
    });
  }

  function mountLab() {
    const host = document.getElementById("labhost");
    if (!host) return;
    lab = window.Lab.mount(host, {
      title: STUDY.lab.title,
      onPush: async (pts, btn) => {
        const label = btn.textContent;
        btn.disabled = true; btn.textContent = "sending…";
        try {
          const py = await boot();
          await py.runPythonAsync("lab_points = " + JSON.stringify(pts));
          btn.textContent = "✓ lab_points set";
        } catch (e) { btn.textContent = "failed — no internet?"; }
        setTimeout(() => { btn.disabled = false; btn.textContent = label; }, 2200);
      }
    });
  }

  /* ---------------------------------------------------------------- progress */
  /* a section's recall may be one question or a list (a chapter check). Question k
     of section i is saved under "i" for k = 0 and "i.k" after that, so answers
     saved before lists existed still count. */
  function rqs(i) { const r = (SSTUDY[i] || {}).recall; return !r ? [] : Array.isArray(r) ? r : [r]; }
  function rkey(i, k) { return k ? i + "." + k : String(i); }
  function recallOk(i) { const q = rqs(i); return q.length > 0 && q.every((r, k) => recall[rkey(i, k)] === r.answer); }
  function recallCounts() {
    let total = 0, ok = 0;
    Object.keys(SSTUDY).forEach((i) => rqs(i).forEach((r, k) => { total++; if (recall[rkey(i, k)] === r.answer) ok++; }));
    return { total, ok };
  }
  function ranCount() { return cells.filter((c) => c.ran).length; }
  function pct() {
    const codeTotal = cells.filter((c) => c.type === "code").length || 1;
    const rc = recallCounts();
    return Math.round(((ranCount() + rc.ok) / (codeTotal + rc.total)) * 100);
  }

  /* ------------------------------------------------------------------ output */
  function paintOutInto(out, c) {
    if (!out) return;
    let h = "";
    if (c.live) {
      h += '<div class="olabel">output</div>';
      if (c.live.stdout) h += "<pre>" + esc(c.live.stdout) + "</pre>";
      if (c.live.result) h += '<pre class="res">' + esc(c.live.result) + "</pre>";
      (c.live.imgs || []).forEach((b) => { h += '<img src="data:image/png;base64,' + b + '" alt="figure" />'; });
      if (c.live.err) h += '<pre class="err">' + esc(c.live.err) + "</pre>";
    } else if (c.outs && c.outs.length) {
      h += '<div class="olabel"><span class="saved">saved output</span> — run to refresh</div>';
      c.outs.forEach((o) => {
        if (o.output_type === "stream") h += "<pre>" + esc(join(o.text)) + "</pre>";
        else if (o.output_type === "error") h += '<pre class="err">' + esc((o.ename || "") + ": " + (o.evalue || "")) + "</pre>";
        else if (o.data) {
          if (o.data["image/png"]) h += '<img src="data:image/png;base64,' + join(o.data["image/png"]).replace(/\n/g, "") + '" alt="figure" />';
          else if (o.data["text/plain"]) h += '<pre class="res">' + esc(join(o.data["text/plain"])) + "</pre>";
        }
      });
    }
    out.innerHTML = h;
    out.classList.toggle("has", !!h);
    const plate = out.closest(".plate-code");
    if (plate && c.exercise) plate.classList.toggle("passed", !!(c.live && !c.live.err));
    if (plate && c.exercise) plate.classList.toggle("failed", !!(c.live && c.live.err));
  }

  /* ----------------------------------------------------------------- pyodide */
  /* Notebook cells are written for Jupyter (IPython). Pyodide runs plain Python, so
     IPython-only lines are rewritten first: `%matplotlib` is dropped, `%timeit` times
     one run, `!pip install` / `%pip install` go through micropip, and other shell
     commands or magics print a note instead of raising a SyntaxError.
     Indented magics keep their indent; a `% (a, b)` continuation line is left alone. */
  const PY_HELPERS = [
    "import time as _ipy_time",
    "_IPY_SKIP_PIP = {'pysqlite3', 'sklearn.utils', 'sklearn', 'scikit-learn', 'numpy', 'pandas', 'matplotlib', 'scipy', 'joblib'}",
    "async def _ipy_pip(names):",
    "    import micropip",
    "    for n in names:",
    "        if n.startswith('-') or n in _IPY_SKIP_PIP: continue",
    "        try:",
    "            await micropip.install(n)",
    "            print('installed ' + n)",
    "        except Exception as e:",
    "            print('could not install ' + n + ' in the browser: ' + str(e).splitlines()[0])",
    "def _ipy_timeit(stmt, g):",
    "    t = _ipy_time.perf_counter(); exec(stmt, g); d = _ipy_time.perf_counter() - t",
    "    print('%.3g s (one run; the browser does not repeat like %%timeit)' % d)",
    "def _ipy_skip(line):",
    "    print('(skipped in the browser: ' + line + ')')"
  ].join("\n");

  /* import name -> PyPI name, for packages Pyodide does not load from imports */
  const PIP_FOR = { seaborn: "seaborn", imblearn: "imbalanced-learn", nltk: "nltk" };

  function toPython(code) {
    const lines = code.split("\n");
    const q = (t) => JSON.stringify(t);
    if (/^%%/.test(lines[0] || "")) {
      const m = lines[0].slice(2).trim().split(/\s+/)[0];
      if (m === "time" || m === "timeit") lines.shift();
      else return "_ipy_skip(" + q(lines[0]) + ")";
    }
    return lines.map((line) => {
      /* only lines that start (after any indent) with %name or !command;
         a "% (a, b)" format continuation is ordinary Python and is left alone */
      const mm = line.match(/^([ \t]*)((?:%%?[a-zA-Z_]\w*|![ \t]*[a-zA-Z]).*)$/);
      if (!mm) return line;
      const ind = mm[1], l = mm[2];
      let m;
      if (/^%matplotlib\b/.test(l)) return ind + "pass  # " + l;
      if ((m = l.match(/^%(?:timeit|time)\s+(.*)$/))) return ind + "_ipy_timeit(" + q(m[1]) + ", globals())";
      if ((m = l.match(/^(?:!\s*|%)pip\s+install\s+(.*)$/))) return ind + "await _ipy_pip(" + q(m[1].trim().split(/\s+/)) + ")";
      return ind + "_ipy_skip(" + q(l.trim()) + ")";
    }).join("\n");
  }
  if (typeof window !== "undefined") window.__toPython = toPython;

  /* Pyodide lives in the shared Commonplace/_lib/pyodide (same 0.26.4 build). Its lock
     file serves numpy from that folder, so numpy cells run offline; every other package
     (pandas, scikit-learn, matplotlib…) still comes from the Pyodide CDN and needs internet. */
  const PYO = new URL("../../../_lib/pyodide/", location.href).href;
  let pyodide = null, booting = null;
  const kpill = document.getElementById("kpill"), ktext = document.getElementById("ktext");
  function kstate(cls, txt) { kpill.className = "kpill " + cls; ktext.textContent = txt; }
  function boot() {
    if (pyodide) return Promise.resolve(pyodide);
    if (booting) return booting;
    kstate("is-boot", "booting python…");
    booting = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PYO + "pyodide.js";
      s.onload = async () => {
        try {
          pyodide = await loadPyodide({ indexURL: PYO });
          await pyodide.runPythonAsync("import os\nos.environ['MPLBACKEND']='AGG'");
          await pyodide.runPythonAsync(PY_HELPERS);
          for (const name of (window.AI_DATA_FILES || [])) {
            try {
              const r = await fetch("../files/data/" + name);
              if (r.ok) pyodide.FS.writeFile("/home/pyodide/" + name, new Uint8Array(await r.arrayBuffer()));
            } catch (e) { /* the notebook cell will report the missing file */ }
          }
          if (window.Lab) await pyodide.runPythonAsync("lab_points = " + JSON.stringify(window.Lab.DEFAULT));
          kstate("is-ready", "python ready");
          resolve(pyodide);
        } catch (e) { kstate("is-err", "boot failed"); reject(e); }
      };
      s.onerror = () => { kstate("is-err", "python unavailable"); reject(new Error("Could not load Python from _lib/pyodide.")); };
      document.head.appendChild(s);
    });
    return booting;
  }

  async function exec(c) {
    let py;
    try { py = await boot(); }
    catch (e) {
      booting = null;   /* allow a retry on the next Run */
      c.live = { stdout: "", result: "", imgs: [], err: "Python could not start. " + (e.message || e) };
      return c.live;
    }
    kstate("is-busy", "running…");
    let stdout = "";
    py.setStdout({ batched: (t) => { stdout += t + "\n"; } });
    py.setStderr({ batched: (t) => { stdout += t + "\n"; } });
    const live = { stdout: "", result: "", err: "", imgs: [] };
    const figBg = prefs.skin === "paper" ? "#f5f6f8" : "#0e1422";
    try {
      const code = toPython(c.src);
      await py.loadPackagesFromImports(code);
      let r;
      try { r = await py.runPythonAsync(code); }
      catch (e) {
        /* a package Pyodide doesn't bundle (seaborn, imblearn…): install it once, retry */
        const miss = String(e.message || e).match(/No module named '([\w]+)/);
        const pkg = miss && PIP_FOR[miss[1]];
        if (!pkg) throw e;
        kstate("is-busy", "installing " + pkg + "…");
        await py.loadPackage("micropip");
        await py.runPythonAsync("import micropip\nawait micropip.install(" + JSON.stringify(pkg) + ")");
        kstate("is-busy", "running…");
        r = await py.runPythonAsync(code);
      }
      if (r !== undefined && r !== null) {
        try { live.result = py.globals.get("repr")(r).toString(); } catch (e) { live.result = String(r); }
        if (r && r.destroy) try { r.destroy(); } catch (e) {}
      }
      if (py.loadedPackages && py.loadedPackages["matplotlib"]) {
        const figs = await py.runPythonAsync(
          "import base64,io\nimport matplotlib.pyplot as _plt\n_l=[]\nfor _n in _plt.get_fignums():\n" +
          "    _b=io.BytesIO();_plt.figure(_n).savefig(_b,format='png',dpi=110,bbox_inches='tight',facecolor='" + figBg + "',edgecolor='none')\n" +
          "    _l.append(base64.b64encode(_b.getvalue()).decode())\n_plt.close('all')\n_l");
        if (figs) { live.imgs = figs.toJs ? figs.toJs() : []; if (figs.destroy) figs.destroy(); }
      }
      c.ran = true;
      saved.ran = cells.map((x, i) => (x.ran ? i : -1)).filter((i) => i >= 0);
      store.save(saved);
      kstate("is-ready", "python ready");
    } catch (e) {
      live.err = String(e.message || e).split("\n").filter((l) => !l.includes('File "/lib/python')).join("\n");
      if (!navigator.onLine || /fetch|NetworkError|Failed to load|load package|included in the Pyodide distribution/i.test(live.err))
        live.err += "\n\nOffline? Only numpy is stored locally. Other packages (pandas, scikit-learn, matplotlib…) need an internet connection.";
      kstate("is-ready", "python ready");
    }
    live.stdout = stdout.replace(/\n$/, "");
    c.live = live;
    return live;
  }

  async function runCell(j) {
    const c = cells[j]; if (c.type !== "code") return;
    const btn = document.querySelector('[data-run="' + j + '"]');
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
    await exec(c);
    if (btn) { btn.disabled = false; btn.textContent = "▶ Run"; }
    paintOutInto(document.getElementById("out-" + j), c);
    document.getElementById("prog").innerHTML = "<b>" + pct() + "%</b> of chapter";
    const bar = document.querySelector('.plate-code[data-i="' + j + '"] .codebar');
    if (bar && !bar.querySelector(".ran")) bar.insertAdjacentHTML("afterbegin", '<span class="ran">● ran</span>');
  }

  /* Run every notebook cell top to bottom (exercises are left for you), stopping at
     the first error like Jupyter does, and jump to the section where it stopped. */
  async function runAll() {
    const list = cells.map((c, k) => k).filter((k) => cells[k].type === "code" && !cells[k].exercise);
    const msg = document.getElementById("runAllMsg");
    const say = (t) => { if (msg) msg.textContent = t; };
    document.querySelectorAll(".btn").forEach((b) => (b.disabled = true));
    let stop = -1;
    for (let n = 0; n < list.length; n++) {
      say("running " + (n + 1) + " of " + list.length + "…");
      const live = await exec(cells[list[n]]);
      if (live && live.err) { stop = list[n]; break; }
    }
    document.querySelectorAll(".btn").forEach((b) => (b.disabled = false));
    if (stop < 0) { say("all " + list.length + " cells ran"); render(); return; }
    const c = cells[stop];
    say("stopped at cell_" + c.n + " (§ " + ROMAN[c.sec] + ") with an error");
    if (prefs.view === "focus" && c.sec !== sec) go(c.sec); else render();
    const el = document.querySelector('.plate-code[data-i="' + stop + '"]');
    if (el) el.scrollIntoView({ block: "center" });
  }

  async function runAbove(j) {
    document.querySelectorAll(".btn").forEach((b) => (b.disabled = true));
    for (let k = 0; k < j; k++) if (cells[k].type === "code") await exec(cells[k]);
    document.querySelectorAll(".btn").forEach((b) => (b.disabled = false));
    render();
  }
})();
