/* ============================================================================
 * cpp-practice-plus.js  ·  Commonplace  ·  C++ Practice Lab
 *
 * Drop-in practice UI for cpp_playground.html. No changes to the page's CSS
 * and no changes to its engine — this file injects its own <style> and hooks
 * the globals the page already exposes (cm, sb, exercises, activeExercise,
 * setActive, loadIntoEditor, loadMistakes).
 *
 * Add ONE line just before </body> in cpp_playground.html:
 *     <script src="cpp-practice-plus.js"></script>
 *
 * What it adds, in the page's own visual language:
 *   • PROBLEM CARD  — the active problem written properly above the editor
 *                     (title, badges, full prompt) instead of a code comment.
 *   • KEY PALETTE   — tap-to-insert C++ pills above the editor (assemble
 *                     instead of typing from blank). Inserts at the cursor.
 *   • HINT / REVEAL — a written hint and a worked solution for the active
 *                     problem (from ex.hint / ex.solution if those columns
 *                     exist, else from the local LIBRARY map below).
 *   • ATTEMPT CHAIN — "↻ Your attempts · N tries" under the editor, with a
 *                     pass/fail sparkline and every try's code + reason.
 *   • MISTAKE DRILL — "Spot the bug" / "Blank redo" modes over the redo queue,
 *                     with progress and Next / Exit.
 *
 * Idempotent: safe to include twice.
 * ========================================================================== */
(function () {
  "use strict";
  if (window.__cppPracticePlus) return;
  window.__cppPracticePlus = true;

  var LS_ATTEMPTS = "commonplace_cpp_attempts";   // { [exId]: [{q,ok,msg,t}] }
  var LS_KEYS_OPEN = "commonplace_cpp_keys_open";
  var SHOW_LATEST = 4;

  /* ------------------------------------------------------------- utilities */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function rel(ts) {
    if (!ts) return "";
    var d = Math.max(0, Date.now() - (typeof ts === "number" ? ts : new Date(ts).getTime()));
    var min = Math.round(d / 6e4), hr = Math.round(d / 36e5), day = Math.round(d / 864e5);
    if (min < 1) return "just now";
    if (min < 60) return min + (min === 1 ? " min ago" : " mins ago");
    if (hr < 24) return hr + (hr === 1 ? " hour ago" : " hours ago");
    if (day < 31) return day + (day === 1 ? " day ago" : " days ago");
    var mo = Math.round(day / 30);
    return mo < 12 ? mo + (mo === 1 ? " month ago" : " months ago") : Math.round(day / 365) + " yr ago";
  }
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function readAll() { try { return JSON.parse(localStorage.getItem(LS_ATTEMPTS) || "{}"); } catch (e) { return {}; } }
  function writeAll(o) { try { localStorage.setItem(LS_ATTEMPTS, JSON.stringify(o)); } catch (e) {} }
  function attemptsFor(id) { var a = readAll()[id]; return Array.isArray(a) ? a : []; }
  function pushAttempt(id, rec) {
    var all = readAll(), list = Array.isArray(all[id]) ? all[id] : [];
    var last = list[list.length - 1];
    if (last && last.q === rec.q && !!last.ok === !!rec.ok) return false;   // dedupe identical consecutive tries
    list.push(rec); all[id] = list; writeAll(all); return true;
  }
  function activeEx() { return window.activeExercise || null; }
  function activeKey() { var a = activeEx(); return a ? a.id : "free"; }

  /* ------------------------------------------------------- the key palette */
  var KEY_ROWS = [
    { tag: "STRUCTURE", cls: "kw", keys: [
      "#include <iostream>\n", "using namespace std;\n", "int main() {\n    \n}\n", "return 0;",
      "for (", "while (", "if (", "else ", "class ", "struct " ] },
    { tag: "STREAMS & TYPES", cls: "bi", keys: [
      "cout << ", "cin >> ", " << endl;", "getline(cin, ", "int ", "double ", "bool ",
      "string ", "vector<int> ", "map<string, int> " ] },
    { tag: "PUNCTUATION", cls: "pn", keys: ["{", "}", "()", ";", "\"\"", "<<", "&&", "%", "++", "->"] }
  ];
  var PAIRS = { "()": 1, "\"\"": 1 };

  function insertKey(tok) {
    var cm = window.cm;
    if (!cm) return;
    cm.replaceSelection(tok, "end");
    var c = cm.getCursor();
    if (PAIRS[tok]) cm.setCursor({ line: c.line, ch: c.ch - 1 });
    else if (tok.indexOf("\n    \n") >= 0) cm.setCursor({ line: c.line - 1, ch: 4 });
    cm.focus();
  }

  function buildPalette() {
    var panel = $("editor-panel");
    if (!panel || $("cpx-pal")) return;
    var open = localStorage.getItem(LS_KEYS_OPEN) !== "0";
    var wrap = el("div", "cpx-pal" + (open ? " open" : ""));
    wrap.id = "cpx-pal";
    var head = el("div", "cpx-pal-head",
      '<span class="cpx-kick">KEY PALETTE → TAP TO INSERT</span>' +
      '<span class="cpx-sp"></span>' +
      '<button type="button" class="cpx-keysbtn">' + (open ? "Hide keys" : "Show keys") + "</button>");
    wrap.appendChild(head);
    var body = el("div", "cpx-pal-body");
    KEY_ROWS.forEach(function (r) {
      var row = el("div", "cpx-pillrow", '<span class="cpx-rowtag">' + r.tag + "</span>");
      var pills = el("div", "cpx-pills");
      r.keys.forEach(function (k) {
        var b = el("button", "cpx-pill cpx-pill-" + r.cls, esc(k.replace(/\n {4}\n/, " ⏎ ").replace(/\n/g, "⏎")));
        b.type = "button";
        b.addEventListener("click", function () { insertKey(k); });
        pills.appendChild(b);
      });
      row.appendChild(pills);
      body.appendChild(row);
    });
    wrap.appendChild(body);
    head.querySelector(".cpx-keysbtn").addEventListener("click", function () {
      var nowOpen = !wrap.classList.contains("open");
      wrap.classList.toggle("open", nowOpen);
      this.textContent = nowOpen ? "Hide keys" : "Show keys";
      localStorage.setItem(LS_KEYS_OPEN, nowOpen ? "1" : "0");
    });
    // sits directly above the editor, under the active-exercise banner
    var anchor = $("active-ex") || panel.querySelector(".panel-head");
    anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
  }

  /* ------------------------------------------------------------ problem card */
  function buildProblemCard() {
    var panel = $("editor-panel");
    if (!panel || $("cpx-problem")) return;
    var card = el("div", "cpx-problem");
    card.id = "cpx-problem";
    card.hidden = true;
    var anchor = $("active-ex") || panel.querySelector(".panel-head");
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
  }

  function refreshProblem() {
    var card = $("cpx-problem");
    if (!card) return;
    var ex = activeEx();
    card.hidden = !ex;
    if (!ex) return;
    var auto = ex.expected_output != null && String(ex.expected_output).length;
    var diff = (ex.difficulty || "").toLowerCase();
    card.innerHTML =
      '<div class="cpx-prob-top">' +
        '<span class="cpx-prob-kick">PROBLEM</span>' +
        (diff ? '<span class="badge-diff d-' + esc(diff) + '">' + esc(diff) + "</span>" : "") +
        '<span class="badge-mode ' + (auto ? "mode-auto" : "mode-self") + '">' + (auto ? "auto-check" : "self-grade") + "</span>" +
        '<span class="cpx-sp"></span>' +
        '<button type="button" class="cpx-change">Change problem</button>' +
        '<button type="button" class="cpx-freeplay">✕ Free play</button>' +
      "</div>" +
      '<div class="cpx-prob-title">' + esc(ex.title || "Exercise") + "</div>" +
      '<p class="cpx-prob-prompt">' + esc(ex.prompt || "") + "</p>";
    card.querySelector(".cpx-change").addEventListener("click", function () {
      if (window.setExCollapsed) window.setExCollapsed(false);
      var p = $("ex-panel");
      if (p && p.scrollIntoView) p.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    card.querySelector(".cpx-freeplay").addEventListener("click", function () {
      if (window.setActive) window.setActive(null);
      if (window.toast) window.toast("Free play — runs won't be bound to an exercise");
    });
  }

  /* --------------------------------------------------- hint / reveal answer */
  function libFor(ex) {
    if (!ex) return null;
    if (ex.hint || ex.solution) return { hint: ex.hint || "", solution: ex.solution || "" };
    return LIBRARY[slug(ex.title)] || null;
  }

  function buildHintRow() {
    var panel = $("editor-panel");
    if (!panel || $("cpx-help")) return;
    var wrap = el("div", "cpx-help");
    wrap.id = "cpx-help";
    wrap.innerHTML =
      '<div class="cpx-help-btns">' +
        '<button type="button" class="cpx-dash" data-cpx="hint">💡 Hint</button>' +
        '<button type="button" class="cpx-dash cpx-mute" data-cpx="sol">👁 Reveal answer</button>' +
      "</div>" +
      '<div class="cpx-hintbox" hidden><span class="cpx-hl">HINT</span><span class="cpx-hint-txt"></span></div>' +
      '<div class="cpx-solbox" hidden><span class="cpx-hl cpx-hl-mute">ONE WAY TO WRITE IT</span><pre class="cpx-sol-txt"></pre></div>';
    var tb = panel.querySelector(".toolbar");
    tb.parentNode.insertBefore(wrap, tb.nextSibling);
    wrap.querySelector('[data-cpx="hint"]').addEventListener("click", function () {
      var b = wrap.querySelector(".cpx-hintbox"); b.hidden = !b.hidden;
    });
    wrap.querySelector('[data-cpx="sol"]').addEventListener("click", function () {
      var b = wrap.querySelector(".cpx-solbox"); b.hidden = !b.hidden;
    });
  }

  function refreshHelp() {
    var wrap = $("cpx-help");
    if (!wrap) return;
    var lib = libFor(activeEx());
    wrap.hidden = !lib;
    if (!lib) return;
    wrap.querySelector(".cpx-hint-txt").textContent = lib.hint || "No hint written for this one yet.";
    wrap.querySelector(".cpx-sol-txt").textContent = lib.solution || "No worked solution written for this one yet.";
    wrap.querySelector(".cpx-hintbox").hidden = true;
    wrap.querySelector(".cpx-solbox").hidden = true;
  }

  /* ---------------------------------------------------------- attempt chain */
  function buildChain() {
    var panel = $("editor-panel");
    if (!panel || $("cpx-chain")) return;
    var wrap = el("div", "cpx-chain");
    wrap.id = "cpx-chain";
    panel.appendChild(wrap);
    renderChain();
  }

  function renderChain() {
    var wrap = $("cpx-chain");
    if (!wrap) return;
    var open = wrap.classList.contains("open");
    var list = attemptsFor(activeKey());
    var n = list.length;
    var spark = list.slice(-6).map(function (a) {
      return '<i class="' + (a.ok ? "ok" : "no") + '"></i>';
    }).join("");
    var head = '<button type="button" class="cpx-chain-toggle">' +
      '<span class="cpx-rot">▸</span> Your attempts · <b>' + n + "</b> " + (n === 1 ? "try" : "tries") +
      '<span class="cpx-spark">' + spark + "</span></button>";
    var body;
    if (!n) {
      body = '<div class="cpx-chain-body"><div class="cpx-chain-empty">No attempts yet — run your code and every try is logged here.</div></div>';
    } else {
      var ordered = list.slice().reverse();
      var shown = wrap.__all ? ordered : ordered.slice(0, SHOW_LATEST);
      var rows = shown.map(function (a) {
        return '<div class="cpx-row">' +
          '<div class="cpx-badge ' + (a.ok ? "ok" : "no") + '">' + (a.ok ? "✓" : "✕") + "</div>" +
          '<div class="cpx-main">' +
            '<div class="cpx-meta"><span class="cpx-verdict ' + (a.ok ? "ok" : "no") + '">' + (a.ok ? "passed" : "failed") + "</span>" +
            '<span class="cpx-when">' + esc(rel(a.t)) + "</span></div>" +
            '<pre class="cpx-code">' + esc((a.q || "").replace(/\s+$/, "") || "(empty)") + "</pre>" +
            (a.ok ? '<p class="cpx-reason">solved</p>'
                  : '<p class="cpx-reason no"><span class="rl">why</span>' + esc(a.msg || "ran with an error") + "</p>") +
          "</div></div>";
      }).join("");
      var more = (!wrap.__all && n > SHOW_LATEST)
        ? '<button type="button" class="cpx-more">+' + (n - SHOW_LATEST) + " earlier " + ((n - SHOW_LATEST) === 1 ? "try" : "tries") + "</button>"
        : "";
      body = '<div class="cpx-chain-body">' + rows + more + "</div>";
    }
    wrap.className = "cpx-chain" + (open ? " open" : "");
    wrap.innerHTML = head + body;
    wrap.querySelector(".cpx-chain-toggle").addEventListener("click", function () { wrap.classList.toggle("open"); });
    var m = wrap.querySelector(".cpx-more");
    if (m) m.addEventListener("click", function () { wrap.__all = true; renderChain(); wrap.classList.add("open"); });
  }

  // observe the page's own verdict: #run-btn disabled flips back when a run ends
  function watchRuns() {
    var btn = $("run-btn"), status = $("status"), term = $("term");
    if (!btn || !status) return;
    var wasDisabled = !!btn.disabled;
    new MutationObserver(function () {
      var now = !!btn.disabled;
      if (wasDisabled && !now) {
        var ok = status.classList.contains("chip-ok");
        var text = (term.textContent || "").trim();
        var code = window.cm ? window.cm.getValue() : "";
        var msg = ok ? "" : (text.split("\n").filter(function (l) { return l.trim(); }).slice(-1)[0] || "ran with an error");
        if (pushAttempt(activeKey(), { q: code, ok: ok, msg: msg, t: Date.now() })) {
          renderChain();
          var wrap = $("cpx-chain");
          if (wrap) wrap.classList.add("open");
        }
        if (drill.on && ok) markDrillCleared();
      }
      wasDisabled = now;
    }).observe(btn, { attributes: true, attributeFilter: ["disabled"] });
  }

  /* ------------------------------------------------------------ mistake drill */
  var drill = { on: false, mode: "spot", queue: [], pos: 0, code: {} };

  function buildDrillBar() {
    var panels = document.querySelectorAll(".panel");
    var mp = null;
    Array.prototype.forEach.call(panels, function (p) {
      if (p.querySelector("#mistakes")) mp = p;
    });
    if (!mp || $("cpx-drillctl")) return;
    var bar = el("div", "cpx-drillctl");
    bar.id = "cpx-drillctl";
    bar.innerHTML =
      '<div class="cpx-toggle">' +
        '<button type="button" data-mode="spot" class="on">Spot the bug</button>' +
        '<button type="button" data-mode="blank">Blank redo</button>' +
      "</div>" +
      '<span class="cpx-modehint">See your old code and fix it in place.</span>' +
      '<span class="cpx-sp"></span>' +
      '<button type="button" class="cpx-start">Start drill →</button>';
    mp.insertBefore(bar, $("mistakes"));
    Array.prototype.forEach.call(bar.querySelectorAll("[data-mode]"), function (b) {
      b.addEventListener("click", function () {
        drill.mode = b.getAttribute("data-mode");
        Array.prototype.forEach.call(bar.querySelectorAll("[data-mode]"), function (x) {
          x.classList.toggle("on", x === b);
        });
        bar.querySelector(".cpx-modehint").textContent = drill.mode === "spot"
          ? "See your old code and fix it in place."
          : "Start from an empty editor — no peeking.";
      });
    });
    bar.querySelector(".cpx-start").addEventListener("click", startDrill);
    refreshDrillCount();
  }

  function refreshDrillCount() {
    var bar = $("cpx-drillctl");
    if (!bar) return;
    var n = document.querySelectorAll("#mistakes .m-row").length;
    bar.querySelector(".cpx-start").textContent = n ? "Start drill · " + n + " →" : "Start drill →";
    bar.querySelector(".cpx-start").disabled = !n;
  }

  // read the redo queue straight off the rendered rows (they already carry the
  // exercise link and the code snapshot the page loaded)
  function startDrill() {
    var sb = window.sb, list = window.exercises || [];
    if (!sb || !window.currentUser) { alert("Sign in first — the drill reads your saved mistakes."); return; }
    sb.from("commonplace_mistakes")
      .select("id, exercise_id, created_at, commonplace_attempts(code)")
      .eq("subject", "cpp").eq("resolved", false)
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) { alert("Could not load the bank: " + res.error.message); return; }
        var rows = (res.data || []).filter(function (m) {
          return m.exercise_id && list.some(function (e) { return e.id === m.exercise_id; });
        });
        if (!rows.length) { alert("Nothing exercise-linked in the bank to drill yet."); return; }
        drill.on = true;
        drill.queue = rows.map(function (m) { return m.exercise_id; });
        drill.code = {};
        rows.forEach(function (m) { drill.code[m.exercise_id] = (m.commonplace_attempts || {}).code || ""; });
        drill.pos = 0;
        loadDrill(0);
      });
  }

  function loadDrill(pos) {
    if (!drill.on) return;
    if (pos >= drill.queue.length) { endDrill(true); return; }
    drill.pos = pos;
    var id = drill.queue[pos];
    var ex = (window.exercises || []).filter(function (e) { return e.id === id; })[0];
    if (!ex) { loadDrill(pos + 1); return; }
    window.loadIntoEditor(ex);                       // page's own loader (banner + starter + active state)
    if (drill.mode === "spot" && drill.code[id] && window.cm) {
      window.cm.setValue(drill.code[id]);            // your old, wrong attempt — fix it in place
    }
    renderDrillBanner();
  }

  function renderDrillBanner() {
    var panel = $("editor-panel");
    if (!panel) return;
    var bar = $("cpx-drillbar");
    if (!bar) {
      bar = el("div", "cpx-drillbar");
      bar.id = "cpx-drillbar";
      panel.insertBefore(bar, panel.firstChild.nextSibling);
    }
    bar.hidden = !drill.on;
    if (!drill.on) return;
    bar.innerHTML =
      '<span class="cpx-drilltag">DRILL · ' + (drill.mode === "spot" ? "Spot the bug" : "Blank redo") + "</span>" +
      "<b>" + (drill.pos + 1) + " of " + drill.queue.length + "</b>" +
      '<span class="cpx-sp"></span>' +
      '<button type="button" class="cpx-next">Next →</button>' +
      '<button type="button" class="cpx-exit">✕ Exit drill</button>';
    bar.querySelector(".cpx-next").addEventListener("click", function () { loadDrill(drill.pos + 1); });
    bar.querySelector(".cpx-exit").addEventListener("click", function () { endDrill(false); });
  }

  function markDrillCleared() {
    var bar = $("cpx-drillbar");
    if (bar && !bar.querySelector(".cpx-cleared")) {
      var tag = el("span", "cpx-cleared", "cleared ✓");
      bar.insertBefore(tag, bar.querySelector(".cpx-sp"));
    }
  }

  function endDrill(complete) {
    drill.on = false;
    var bar = $("cpx-drillbar");
    if (bar) bar.hidden = true;
    if (complete && window.toast) window.toast("Drill complete — the bank is clear 🎉");
  }

  /* ------------------------------------------------------------------ hooks */
  function hookPage() {
    var _setActive = window.setActive;
    if (typeof _setActive === "function") {
      window.setActive = function () {
        var r = _setActive.apply(this, arguments);
        refreshProblem(); refreshHelp(); renderChain();
        return r;
      };
    }
    // the problem now lives in the card above the editor — stop stuffing the
    // prompt into the code as a /* banner */ (the editor gets ONLY starter code)
    if (typeof window.buildTemplate === "function") {
      window.buildTemplate = function (ex) {
        return (ex.starter_code && ex.starter_code.trim())
          ? ex.starter_code
          : "#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n";
      };
    }
    var _renderMistakes = window.renderMistakes;
    if (typeof _renderMistakes === "function") {
      window.renderMistakes = function () {
        var r = _renderMistakes.apply(this, arguments);
        refreshDrillCount();
        return r;
      };
    }
  }

  /* ------------------------------------------------------------ injected css */
  function injectCss() {
    if ($("cpx-style")) return;
    var s = document.createElement("style");
    s.id = "cpx-style";
    s.textContent = [
      /* problem card (the page's own #active-ex banner is replaced by it) */
      "#editor-panel .active-ex.on{display:none;}",
      ".cpx-problem{padding:14px 18px 15px;background:#f6f2fe;border-bottom:1px solid #ddd2f3;}",
      ".cpx-prob-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;}",
      ".cpx-prob-kick{font-size:10px;font-weight:700;letter-spacing:1.4px;color:var(--purple-deep,#6d28d9);}",
      ".cpx-prob-title{font-weight:700;font-size:18px;line-height:1.25;color:var(--ink,#1a202c);}",
      ".cpx-prob-prompt{margin:5px 0 0;font-size:14px;line-height:1.5;color:var(--ink-soft,#4a5568);max-width:640px;text-wrap:pretty;}",
      ".cpx-change{font:inherit;font-size:12.5px;font-weight:700;color:var(--purple-deep,#6d28d9);background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;}",
      ".cpx-freeplay{font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:2px solid var(--purple-light,#c4b5fd);border-radius:11px;padding:6px 11px;background:var(--card,#fff);color:var(--purple-deep,#6d28d9);}",
      /* palette */
      ".cpx-pal{padding:12px 18px;background:#faf7ff;border-bottom:1px solid #ece7f6;}",
      ".cpx-pal-head{display:flex;align-items:center;gap:10px;}",
      ".cpx-kick{font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:var(--purple-deep,#6d28d9);}",
      ".cpx-sp{flex:1;}",
      ".cpx-keysbtn{font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:2px solid #ece7f6;border-radius:10px;padding:5px 11px;background:var(--card,#fff);color:var(--ink-soft,#4a5568);}",
      ".cpx-pal-body{display:none;flex-direction:column;gap:7px;margin-top:9px;}",
      ".cpx-pal.open .cpx-pal-body{display:flex;}",
      ".cpx-pillrow{display:flex;align-items:center;gap:8px;}",
      ".cpx-rowtag{flex:0 0 96px;font-size:9px;font-weight:700;letter-spacing:1.2px;color:#a0aec0;}",
      ".cpx-pills{display:flex;gap:7px;flex-wrap:wrap;flex:1;}",
      ".cpx-pill{flex:0 0 auto;display:inline-flex;align-items:center;height:34px;padding:0 12px;border:1.5px solid #ece7f6;border-radius:10px;font-family:var(--mono,'JetBrains Mono',monospace);font-size:12.5px;font-weight:600;color:var(--ink,#1a202c);cursor:pointer;white-space:nowrap;}",
      ".cpx-pill:active{transform:translateY(1px);}",
      ".cpx-pill-kw{background:#efe7fd;}.cpx-pill-bi{background:#e3f6fb;}",
      ".cpx-pill-pn{background:var(--card,#fff);border:1.5px dashed var(--purple-light,#c4b5fd);}",
      /* hint / reveal */
      ".cpx-help{padding:0 18px 14px;}",
      ".cpx-help-btns{display:flex;gap:8px;flex-wrap:wrap;}",
      ".cpx-dash{font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1.5px dashed var(--purple-light,#c4b5fd);border-radius:11px;padding:7px 13px;background:transparent;color:var(--purple-deep,#6d28d9);}",
      ".cpx-dash.cpx-mute{color:var(--ink-dim,#718096);}",
      ".cpx-hintbox{margin-top:10px;background:#f6f2fe;border:1px solid #ece7f6;border-left:3px solid var(--purple,#8b5cf6);border-radius:12px;padding:11px 14px;font-size:13.5px;color:var(--ink-soft,#4a5568);text-wrap:pretty;}",
      ".cpx-hl{display:block;font-size:10px;font-weight:700;letter-spacing:.7px;color:var(--purple-deep,#6d28d9);margin-bottom:4px;}",
      ".cpx-hl-mute{color:var(--ink-dim,#718096);}",
      ".cpx-solbox{margin-top:10px;}",
      ".cpx-sol-txt{font-family:var(--mono,'JetBrains Mono',monospace);font-size:12.5px;line-height:1.55;background:var(--terminal,#1e1b4b);color:#e0e7ff;border-radius:12px;padding:12px 14px;margin:0;overflow-x:auto;}",
      /* attempt chain */
      ".cpx-chain{border-top:1px solid #ece7f6;background:#faf7ff;border-radius:0 0 18px 18px;}",
      ".cpx-chain-toggle{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:none;background:none;cursor:pointer;padding:11px 18px;font:inherit;font-size:12.5px;color:var(--ink-dim,#718096);}",
      ".cpx-chain-toggle b{color:var(--ink,#1a202c);}",
      ".cpx-rot{display:inline-block;transition:transform .18s;font-size:10px;}",
      ".cpx-chain.open .cpx-rot{transform:rotate(90deg);}",
      ".cpx-spark{margin-left:auto;display:flex;gap:3px;}",
      ".cpx-spark i{width:7px;height:7px;border-radius:2px;display:inline-block;}",
      ".cpx-spark i.ok{background:var(--green,#22c55e);}.cpx-spark i.no{background:var(--red,#ef4444);}",
      ".cpx-chain-body{display:none;padding:0 18px 16px;}",
      ".cpx-chain.open .cpx-chain-body{display:block;}",
      ".cpx-chain-empty{font-size:13px;color:var(--ink-dim,#718096);padding:4px 0 8px;}",
      ".cpx-row{display:flex;gap:10px;padding:10px 0;border-top:1px dashed #e4dcf5;}",
      ".cpx-row:first-child{border-top:none;}",
      ".cpx-badge{flex:none;width:20px;height:20px;border-radius:6px;display:grid;place-items:center;font-size:12px;font-weight:700;margin-top:1px;}",
      ".cpx-badge.ok{background:var(--green,#22c55e);color:#fff;}",
      ".cpx-badge.no{background:#fdecea;color:#b91c1c;border:1px solid #f3b4ad;}",
      ".cpx-main{flex:1;min-width:0;}",
      ".cpx-meta{display:flex;align-items:baseline;gap:8px;margin-bottom:5px;flex-wrap:wrap;}",
      ".cpx-verdict{font-size:10.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;}",
      ".cpx-verdict.ok{color:#15803d;}.cpx-verdict.no{color:#b91c1c;}",
      ".cpx-when{font-size:11px;color:var(--ink-dim,#718096);}",
      ".cpx-code{margin:0;background:var(--terminal,#1e1b4b);color:#dbe4ff;border-radius:9px;padding:9px 11px;font-family:var(--mono,'JetBrains Mono',monospace);font-size:11.5px;line-height:1.5;white-space:pre;overflow-x:auto;max-height:150px;}",
      ".cpx-reason{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:var(--ink-soft,#4a5568);}",
      ".cpx-reason.no{color:#8c2f22;}",
      ".cpx-reason .rl{font-size:9.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#b91c1c;margin-right:6px;}",
      ".cpx-more{margin:10px 0 0;border:1px dashed var(--purple-light,#c4b5fd);background:transparent;color:var(--purple-deep,#6d28d9);border-radius:9px;padding:7px 11px;font:inherit;font-size:12px;cursor:pointer;}",
      /* drill */
      ".cpx-drillctl{display:flex;align-items:center;gap:14px;padding:13px 18px;background:#faf7ff;border-bottom:1px solid #ece7f6;flex-wrap:wrap;}",
      ".cpx-toggle{display:inline-flex;background:var(--card,#fff);border:2px solid #ece7f6;border-radius:12px;padding:3px;gap:3px;}",
      ".cpx-toggle button{font:inherit;font-size:12.5px;font-weight:700;border:none;background:transparent;color:var(--ink-dim,#718096);padding:7px 13px;border-radius:9px;cursor:pointer;}",
      ".cpx-toggle button.on{background:var(--purple-deep,#6d28d9);color:#fff;}",
      ".cpx-modehint{font-size:13px;color:var(--ink-dim,#718096);}",
      ".cpx-start{font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:none;border-radius:13px;padding:10px 18px;background:linear-gradient(135deg,var(--purple,#8b5cf6),var(--cyan,#06b6d4));color:#fff;box-shadow:0 4px 14px rgba(109,40,217,.35);}",
      ".cpx-start:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;}",
      ".cpx-drillbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 18px;background:linear-gradient(90deg,var(--purple-deep,#6d28d9),var(--purple,#8b5cf6));color:#fff;font-size:13px;}",
      ".cpx-drilltag{font-size:11px;font-weight:700;letter-spacing:.7px;background:rgba(255,255,255,.2);border-radius:8px;padding:3px 9px;}",
      ".cpx-cleared{font-size:11.5px;font-weight:700;background:rgba(255,255,255,.22);border-radius:8px;padding:3px 9px;}",
      ".cpx-drillbar .cpx-next{font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:none;border-radius:11px;padding:6px 12px;background:#fff;color:var(--purple-deep,#6d28d9);}",
      ".cpx-drillbar .cpx-exit{font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;border:1.5px solid rgba(255,255,255,.55);border-radius:11px;padding:6px 11px;background:transparent;color:#fff;}",
      "@media (max-width:640px){.cpx-rowtag{display:none;}}"
    ].join("");
    document.head.appendChild(s);
  }

  /* ------------------------- hints + worked solutions for the seeded problems */
  var LIBRARY = {
    "greet-by-name": {
      hint: "getline(cin, name) reads a whole line; cin >> name stops at the first space. Then cout << \"Hello, \" << name << \"!\" << endl;",
      solution: "#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string name;\n    getline(cin, name);\n    cout << \"Hello, \" << name << \"!\" << endl;\n    return 0;\n}"
    },
    "add-two-numbers": {
      hint: "cin >> a >> b; reads both numbers in one go — whitespace separates them.",
      solution: "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}"
    },
    "celsius-to-fahrenheit": {
      hint: "F = c * 9.0 / 5.0 + 32. Use fixed << setprecision(1) from <iomanip> for one decimal.",
      solution: "#include <iostream>\n#include <iomanip>\nusing namespace std;\n\nint main() {\n    double c;\n    cin >> c;\n    cout << fixed << setprecision(1) << (c * 9.0 / 5.0 + 32) << endl;\n    return 0;\n}"
    },
    "the-integer-division-trap": {
      hint: "7/2 with two ints truncates. Make one side a double — 7/2.0 — to keep the fraction.",
      solution: "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << 7 / 2 << endl;\n    cout << 7 / 2.0 << endl;\n    return 0;\n}"
    },
    "swap-without-a-temp-variable": {
      hint: "int& a is an alias for the caller's variable — assigning to a changes theirs. You still need a temp inside.",
      solution: "#include <iostream>\nusing namespace std;\n\nvoid swapVals(int& a, int& b) {\n    int t = a;\n    a = b;\n    b = t;\n}\n\nint main() {\n    int x = 3, y = 9;\n    swapVals(x, y);\n    cout << x << \" \" << y << endl;\n    return 0;\n}"
    },
    "fizzbuzz-to-15": {
      hint: "Check i % 15 == 0 FIRST, then 3, then 5 — otherwise 15 prints only \"Fizz\".",
      solution: "#include <iostream>\nusing namespace std;\n\nint main() {\n    for (int i = 1; i <= 15; i++) {\n        if (i % 15 == 0) cout << \"FizzBuzz\" << endl;\n        else if (i % 3 == 0) cout << \"Fizz\" << endl;\n        else if (i % 5 == 0) cout << \"Buzz\" << endl;\n        else cout << i << endl;\n    }\n    return 0;\n}"
    },
    "sum-the-even-numbers-to-100": {
      hint: "Step the loop by 2 (i += 2) instead of testing every number.",
      solution: "#include <iostream>\nusing namespace std;\n\nint main() {\n    int total = 0;\n    for (int i = 2; i <= 100; i += 2) total += i;\n    cout << total << endl;\n    return 0;\n}"
    },
    "multiplication-triangle": {
      hint: "Inner loop runs j = 1..i. Print a space before every value except the first.",
      solution: "#include <iostream>\nusing namespace std;\n\nint main() {\n    for (int i = 1; i <= 4; i++) {\n        for (int j = 1; j <= i; j++) {\n            if (j > 1) cout << \" \";\n            cout << i * j;\n        }\n        cout << endl;\n    }\n    return 0;\n}"
    },
    "count-the-vowels": {
      hint: "Lowercase each char with tolower(c), then test it against the string \"aeiou\" with find.",
      solution: "#include <iostream>\n#include <string>\n#include <cctype>\nusing namespace std;\n\nint main() {\n    string line;\n    getline(cin, line);\n    int n = 0;\n    for (char c : line) {\n        if (string(\"aeiou\").find(tolower(c)) != string::npos) n++;\n    }\n    cout << n << endl;\n    return 0;\n}"
    },
    "is-it-prime": {
      hint: "n < 2 is not prime. Test divisors up to i * i <= n — anything beyond is a mirror of a smaller one.",
      solution: "#include <iostream>\nusing namespace std;\n\nbool isPrime(int n) {\n    if (n < 2) return false;\n    for (int i = 2; i * i <= n; i++) {\n        if (n % i == 0) return false;\n    }\n    return true;\n}\n\nint main() {\n    bool first = true;\n    for (int n = 2; n < 20; n++) {\n        if (isPrime(n)) {\n            if (!first) cout << \" \";\n            cout << n;\n            first = false;\n        }\n    }\n    cout << endl;\n    return 0;\n}"
    },
    "factorial-recursively": {
      hint: "Base case first: n <= 1 returns 1. Otherwise n * factorial(n - 1).",
      solution: "#include <iostream>\nusing namespace std;\n\nlong long factorial(int n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n}\n\nint main() {\n    cout << factorial(10) << endl;\n    return 0;\n}"
    },
    "euclid-s-gcd": {
      hint: "gcd(a, b) == gcd(b, a % b), and gcd(a, 0) == a. That is the whole algorithm.",
      solution: "#include <iostream>\nusing namespace std;\n\nint gcd(int a, int b) {\n    if (b == 0) return a;\n    return gcd(b, a % b);\n}\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << gcd(a, b) << endl;\n    return 0;\n}"
    },
    "largest-in-a-vector": {
      hint: "Either loop keeping a running max, or call *max_element(v.begin(), v.end()) from <algorithm>.",
      solution: "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    vector<int> v = {5, 12, 3, 19, 7};\n    cout << *max_element(v.begin(), v.end()) << endl;\n    return 0;\n}"
    },
    "reverse-a-word": {
      hint: "reverse(s.begin(), s.end()) does it in place — then print s.",
      solution: "#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s;\n    cin >> s;\n    reverse(s.begin(), s.end());\n    cout << s << endl;\n    return 0;\n}"
    },
    "word-frequency-count": {
      hint: "istringstream splits the line into words. map<string,int> already keeps its keys sorted, so just iterate it.",
      solution: "#include <iostream>\n#include <map>\n#include <sstream>\nusing namespace std;\n\nint main() {\n    string line;\n    getline(cin, line);\n    istringstream ss(line);\n    map<string, int> freq;\n    string w;\n    while (ss >> w) freq[w]++;\n    for (auto& kv : freq) cout << kv.first << \" \" << kv.second << endl;\n    return 0;\n}"
    },
    "a-rectangle-class": {
      hint: "Members go under private:, the constructor and area()/perimeter() under public:.",
      solution: "#include <iostream>\nusing namespace std;\n\nclass Rectangle {\nprivate:\n    int w, h;\npublic:\n    Rectangle(int width, int height) : w(width), h(height) {}\n    int area() const { return w * h; }\n    int perimeter() const { return 2 * (w + h); }\n};\n\nint main() {\n    Rectangle r(3, 4);\n    cout << r.area() << \" \" << r.perimeter() << endl;\n    return 0;\n}"
    },
    "bank-account-with-guards": {
      hint: "Guard first, mutate second: reject amount <= 0, and reject a withdrawal larger than the balance — report each refusal instead of silently failing.",
      solution: "#include <iostream>\nusing namespace std;\n\nclass BankAccount {\nprivate:\n    long balance = 0;\npublic:\n    void deposit(long amount) {\n        if (amount <= 0) { cout << \"Refused: deposit must be positive\" << endl; return; }\n        balance += amount;\n        cout << \"Deposited \" << amount << \" — balance \" << balance << endl;\n    }\n    void withdraw(long amount) {\n        if (amount > balance) { cout << \"Refused: \" << amount << \" would overdraw a balance of \" << balance << endl; return; }\n        balance -= amount;\n    }\n};\n\nint main() {\n    BankAccount a;\n    a.deposit(500);\n    a.deposit(-20);\n    a.withdraw(900);\n    return 0;\n}"
    },
    "a-node-that-frees-itself": {
      hint: "A unique_ptr member frees its node when the owner dies, so destroying the head cascades down the chain.",
      solution: "#include <iostream>\n#include <memory>\nusing namespace std;\n\nstruct Node {\n    int value;\n    unique_ptr<Node> next;\n    Node(int v) : value(v) {}\n    ~Node() { cout << \"Node \" << value << \" destroyed\" << endl; }\n};\n\nint main() {\n    auto head = unique_ptr<Node>(new Node(1));\n    head->next = unique_ptr<Node>(new Node(2));\n    return 0;\n}"
    }
  };
  window.CppPracticeLibrary = LIBRARY;   // extend or override from the page if you like

  /* ------------------------------------------------------------------- boot */
  function boot() {
    if (!$("editor-panel")) { setTimeout(boot, 120); return; }
    injectCss();
    buildProblemCard();
    buildPalette();
    buildHintRow();
    buildChain();
    buildDrillBar();
    watchRuns();
    hookPage();
    refreshProblem();
    refreshHelp();
    // the page renders its lists asynchronously after auth resolves
    setTimeout(refreshDrillCount, 1200);
    setTimeout(refreshDrillCount, 3000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
