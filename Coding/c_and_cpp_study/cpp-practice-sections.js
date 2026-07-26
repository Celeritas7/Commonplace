/* ============================================================================
 * cpp-practice-sections.js  ·  Commonplace  ·  C++ Practice Lab
 *
 * Layer 2 — load AFTER cpp-practice-plus.js:
 *     <script src="cpp-practice-plus.js"></script>
 *     <script src="cpp-practice-sections.js"></script>
 *   </body>
 *
 * Adds (no changes to the page's CSS — styles are injected, cpx2- prefixed):
 *   • SECTIONS      — problems grouped by book part into 5 sections, with a
 *                     "today's focus" pair that rotates daily.
 *   • PROBLEM STRIP — P1…P18 pills in one horizontal row: pick, solve, next.
 *                     Solved pills turn green; progress chip counts them.
 *   • FOCUS MODE    — loading a problem hides the hero and compacts the
 *                     editor + output so the whole solve loop fits one screen.
 *   • SLOT EDITOR   — C++-shaped "blocks": three fixed slots (INCLUDES /
 *                     HELPERS / MAIN) assembled in order at run time.
 *                     Toggle Slots ⇄ Classic in the editor header.
 * ========================================================================== */
(function () {
  "use strict";
  if (window.__cppPracticeSections) return;
  window.__cppPracticeSections = true;

  var LS_MODE = "commonplace_cpp_editor_mode";   // "slots" | "classic"
  var LS_HIDE = "commonplace_cpp_hide_solved";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  /* ------------------------------------------------------------- sections */
  var SECTIONS = [
    { key: "s1", roman: "I",   name: "Basics & IO",           parts: ["part-1", "part-2"] },
    { key: "s2", roman: "II",  name: "Control Flow",          parts: ["part-3"] },
    { key: "s3", roman: "III", name: "Functions & Recursion", parts: ["part-4"] },
    { key: "s4", roman: "IV",  name: "STL & Strings",         parts: ["part-5"] },
    { key: "s5", roman: "V",   name: "Classes & Memory",      parts: ["part-6", "part-7"] }
  ];
  function secOf(ex) {
    var tags = ex.tags || [];
    for (var i = 0; i < SECTIONS.length; i++) {
      if (SECTIONS[i].parts.some(function (p) { return tags.indexOf(p) >= 0; })) return SECTIONS[i];
    }
    return SECTIONS[0];
  }
  var day = Math.floor(Date.now() / 864e5);
  var FOCUS = [SECTIONS[day % 5].key, SECTIONS[(day + 2) % 5].key];

  var curTab = "focus";                            // "focus" | section key | "all"
  var hideSolved = localStorage.getItem(LS_HIDE) === "1";
  var solved = {};                                 // { exercise_id: true }

  /* -------------------------------------------------------- problem strip */
  function buildStrip() {
    var panel = $("ex-panel");
    if (!panel) return;
    var wrap = $("cpx2-strip");
    if (!wrap) {
      wrap = el("div", "cpx2-strip");
      wrap.id = "cpx2-strip";
      var head = panel.querySelector(".panel-head");
      head.parentNode.insertBefore(wrap, head.nextSibling);
      if (window.setExCollapsed) window.setExCollapsed(true);   // fold the old list; ▾ still opens it
    }
    renderStrip();
  }

  function renderStrip() {
    var wrap = $("cpx2-strip");
    if (!wrap) return;
    var list = window.exercises || [];
    if (!list.length) { wrap.innerHTML = ""; return; }

    var num = {};                                  // stable P-numbers by list order
    list.forEach(function (ex, i) { num[ex.id] = i + 1; });
    var nSolved = list.filter(function (ex) { return solved[ex.id]; }).length;

    var tabs = [{ key: "focus", label: "★ Today's focus" }]
      .concat(SECTIONS.map(function (s) {
        var n = list.filter(function (ex) { return secOf(ex).key === s.key; }).length;
        return { key: s.key, label: s.roman + " · " + s.name + " (" + n + ")", today: FOCUS.indexOf(s.key) >= 0 };
      }))
      .concat([{ key: "all", label: "All" }]);

    var visible = list.filter(function (ex) {
      var sk = secOf(ex).key;
      if (curTab === "all") { /* all */ }
      else if (curTab === "focus") { if (FOCUS.indexOf(sk) < 0) return false; }
      else if (sk !== curTab) return false;
      if (hideSolved && solved[ex.id]) return false;
      return true;
    });

    wrap.innerHTML =
      '<div class="cpx2-tabs">' +
        tabs.map(function (t) {
          return '<button type="button" class="cpx2-tab' + (curTab === t.key ? " on" : "") + '" data-tab="' + t.key + '">' +
            esc(t.label) + (t.today ? '<i class="cpx2-dot" title="today\'s focus"></i>' : "") + "</button>";
        }).join("") +
        '<span class="cpx-sp"></span>' +
        '<button type="button" class="cpx2-hide' + (hideSolved ? " on" : "") + '">' + (hideSolved ? "☑" : "☐") + " hide solved</button>" +
        '<span class="cpx2-progress">' + nSolved + " / " + list.length + " solved</span>" +
      "</div>" +
      '<div class="cpx2-pills">' +
        (visible.length ? visible.map(function (ex) {
          var isActive = window.activeExercise && window.activeExercise.id === ex.id;
          var isSolved = !!solved[ex.id];
          return '<button type="button" class="cpx2-pill' + (isActive ? " on" : "") + (isSolved ? " ok" : "") + '" data-ex="' + esc(ex.id) + '">' +
            '<b>P' + num[ex.id] + "</b> " + esc(ex.title || "Untitled") + (isSolved ? " ✓" : "") + "</button>";
        }).join("") : '<span class="cpx2-none">Nothing left here — nice. Pick another section.</span>') +
      "</div>";

    Array.prototype.forEach.call(wrap.querySelectorAll(".cpx2-tab"), function (b) {
      b.addEventListener("click", function () { curTab = b.getAttribute("data-tab"); renderStrip(); });
    });
    wrap.querySelector(".cpx2-hide").addEventListener("click", function () {
      hideSolved = !hideSolved;
      localStorage.setItem(LS_HIDE, hideSolved ? "1" : "0");
      renderStrip();
    });
    Array.prototype.forEach.call(wrap.querySelectorAll(".cpx2-pill"), function (b) {
      b.addEventListener("click", function () {
        var ex = (window.exercises || []).filter(function (e) { return e.id === b.getAttribute("data-ex"); })[0];
        if (ex && window.loadIntoEditor) window.loadIntoEditor(ex);
      });
    });
  }

  function fetchSolved() {
    if (!window.currentUser || !window.sb) return;
    window.sb.from("commonplace_attempts")
      .select("exercise_id").eq("subject", "cpp").eq("passed", true).not("exercise_id", "is", null)
      .then(function (res) {
        if (res.error) return;
        solved = {};
        (res.data || []).forEach(function (r) { solved[r.exercise_id] = true; });
        renderStrip();
      });
  }

  /* ------------------------------------------------------------ slot editor */
  var slotMode = localStorage.getItem(LS_MODE) !== "classic";   // slots by default

  function parseSource(src) {
    var lines = String(src || "").replace(/\r/g, "").split("\n");
    var i = 0, inc = [];
    while (i < lines.length && /^\s*(#include|using\s|$)/.test(lines[i])) { inc.push(lines[i]); i++; }
    var mi = -1;
    for (var j = i; j < lines.length; j++) { if (/int\s+main\s*\(/.test(lines[j])) { mi = j; break; } }
    if (mi < 0) return null;
    var last = lines.length - 1;
    while (last > mi && lines[last].trim() !== "}") last--;
    if (last <= mi) return null;
    return {
      inc: inc.join("\n").replace(/\s+$/, ""),
      helpers: lines.slice(i, mi).join("\n").trim(),
      body: lines.slice(mi + 1, last).join("\n").replace(/\s+$/, "")
    };
  }

  function composeFrom(body) {
    var inc = ($("cpx2-inc") ? $("cpx2-inc").value : "").replace(/\s+$/, "");
    var helpers = ($("cpx2-fn") ? $("cpx2-fn").value : "").trim();
    var ret = /(^|\n)\s*return\s/.test(body) ? "" : "\n    return 0;";
    return inc + "\n\n" + (helpers ? helpers + "\n\n" : "") + "int main() {\n" + body + ret + "\n}\n";
  }

  function autoGrow(t) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight + 2, 220) + "px"; }

  function buildSlots() {
    var panel = $("editor-panel");
    if (!panel || $("cpx2-slots")) return;
    var wrap = el("div", "cpx2-slots");
    wrap.id = "cpx2-slots";
    wrap.innerHTML =
      '<div class="cpx2-slot"><label for="cpx2-inc"><b>1 · INCLUDES</b> — headers &amp; using</label>' +
        '<textarea id="cpx2-inc" rows="2" spellcheck="false"></textarea></div>' +
      '<div class="cpx2-slot"><label for="cpx2-fn"><b>2 · HELPERS</b> — functions &amp; classes, optional</label>' +
        '<textarea id="cpx2-fn" rows="2" spellcheck="false" placeholder="// e.g. bool isPrime(int n) { … }"></textarea></div>' +
      '<div class="cpx2-mainlabel"><b>3 · MAIN</b> — this code runs inside <code>int main() { … }</code></div>';
    var cmEl = panel.querySelector(".CodeMirror");
    cmEl.parentNode.insertBefore(wrap, cmEl);
    Array.prototype.forEach.call(wrap.querySelectorAll("textarea"), function (t) {
      t.addEventListener("input", function () { autoGrow(t); });
    });
    // mode toggle in the panel header
    var head = panel.querySelector(".panel-head");
    var btn = el("button", "btn btn-ghost btn-sm");
    btn.id = "cpx2-mode";
    btn.type = "button";
    btn.title = "Slots: assemble includes / helpers / main separately. Classic: one full file.";
    head.insertBefore(btn, $("reset-btn"));
    btn.addEventListener("click", function () { setSlotMode(!slotMode, true); });
    paintMode();
  }

  function paintMode() {
    var btn = $("cpx2-mode");
    if (btn) btn.textContent = slotMode ? "▤ Classic mode" : "⧉ Slot mode";
    var wrap = $("cpx2-slots");
    if (wrap) wrap.style.display = slotMode ? "" : "none";
  }

  function fillSlots(parsed) {
    $("cpx2-inc").value = parsed.inc;
    $("cpx2-fn").value = parsed.helpers;
    autoGrow($("cpx2-inc")); autoGrow($("cpx2-fn"));
    window.cm.setValue(parsed.body);
    window.lastTemplate = parsed.body;             // keep the page's overwrite guard honest
  }

  function setSlotMode(on, announce) {
    if (on) {
      var parsed = parseSource(window.cm.getValue());
      if (!parsed) {
        if (announce && window.toast) window.toast("Couldn't split this code into slots — staying in classic");
        slotMode = false;
      } else {
        fillSlots(parsed);
        slotMode = true;
      }
    } else {
      var full = composeFrom(window.cm.getValue());
      window.cm.setValue(full);
      window.lastTemplate = full;
      slotMode = false;
    }
    localStorage.setItem(LS_MODE, slotMode ? "slots" : "classic");
    paintMode();
  }

  // Run / save-as-mistake read cm synchronously — swap the full program in
  // just before the page's own handler fires, restore the body right after.
  function injectFull() {
    var body = window.cm.getValue();
    window.cm.setValue(composeFrom(body));
    setTimeout(function () { window.cm.setValue(body); }, 0);
  }
  document.addEventListener("click", function (e) {
    if (!slotMode || !e.target || !e.target.closest) return;
    if (e.target.closest("#run-btn") || e.target.closest("#mistake-btn")) injectFull();
  }, true);
  document.addEventListener("click", function (e) {
    if (!slotMode || !e.target || !e.target.closest) return;
    if (e.target.closest("#reset-btn")) {
      setTimeout(function () {                      // after the page reset the editor to DEFAULT_CODE
        var parsed = parseSource(window.cm.getValue());
        if (parsed) fillSlots(parsed);
      }, 0);
    }
  }, false);

  /* ------------------------------------------------------------ page hooks */
  function hookPage() {
    var _load = window.loadIntoEditor;
    if (typeof _load === "function") {
      window.loadIntoEditor = function (ex) {
        var r = _load.apply(this, arguments);
        if (slotMode) {
          var parsed = parseSource(window.cm.getValue());
          if (parsed) fillSlots(parsed);
        }
        renderStrip();
        return r;
      };
    }
    var _setActive = window.setActive;
    if (typeof _setActive === "function") {
      window.setActive = function () {
        var r = _setActive.apply(this, arguments);
        document.body.classList.toggle("cpx-focus", !!window.activeExercise);
        renderStrip();
        return r;
      };
    }
    var _renderEx = window.renderExercises;
    if (typeof _renderEx === "function") {
      window.renderExercises = function () {
        var r = _renderEx.apply(this, arguments);
        buildStrip();
        fetchSolved();
        return r;
      };
    }
    // Ctrl/Cmd-Enter goes straight to runCode — route it through the assembler
    if (window.cm && window.runCode) {
      var wrapRun = function () { if (slotMode) injectFull(); window.runCode(); };
      window.cm.setOption("extraKeys", { "Cmd-Enter": wrapRun, "Ctrl-Enter": wrapRun });
    }
    // refresh solved marks when a run finishes (run-btn re-enables)
    var btn = $("run-btn");
    if (btn) {
      var was = !!btn.disabled;
      new MutationObserver(function () {
        var now = !!btn.disabled;
        if (was && !now) setTimeout(fetchSolved, 900);
        was = now;
      }).observe(btn, { attributes: true, attributeFilter: ["disabled"] });
    }
  }

  /* ------------------------------------------------------------ injected css */
  function injectCss() {
    if ($("cpx2-style")) return;
    var s = document.createElement("style");
    s.id = "cpx2-style";
    s.textContent = [
      /* strip */
      ".cpx2-strip{padding:12px 18px 13px;border-bottom:1px solid #ece7f6;background:#faf7ff;}",
      ".cpx2-tabs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px;}",
      ".cpx2-tab{position:relative;font:inherit;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid #ece7f6;border-radius:11px;padding:6px 11px;background:var(--card,#fff);color:var(--ink-dim,#718096);}",
      ".cpx2-tab.on{background:var(--purple-deep,#6d28d9);border-color:var(--purple-deep,#6d28d9);color:#fff;}",
      ".cpx2-dot{position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--amber,#f59e0b);border:2px solid #faf7ff;}",
      ".cpx2-hide{font:inherit;font-size:12px;font-weight:600;cursor:pointer;border:none;background:none;color:var(--ink-dim,#718096);}",
      ".cpx2-hide.on{color:var(--purple-deep,#6d28d9);}",
      ".cpx2-progress{font-size:12px;font-weight:700;color:var(--purple-deep,#6d28d9);background:#efe7fd;border-radius:10px;padding:4px 10px;}",
      ".cpx2-pills{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin;}",
      ".cpx2-pill{flex:0 0 auto;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;border:1.5px solid #ece7f6;border-radius:20px;padding:7px 14px;background:var(--card,#fff);color:var(--ink-soft,#4a5568);white-space:nowrap;max-width:230px;overflow:hidden;text-overflow:ellipsis;}",
      ".cpx2-pill b{color:var(--purple-deep,#6d28d9);margin-right:2px;}",
      ".cpx2-pill.on{background:var(--purple-deep,#6d28d9);border-color:var(--purple-deep,#6d28d9);color:#fff;}",
      ".cpx2-pill.on b{color:#fff;}",
      ".cpx2-pill.ok{border-color:rgba(34,197,94,.5);background:rgba(34,197,94,.08);color:#15803d;}",
      ".cpx2-pill.ok b{color:#15803d;}",
      ".cpx2-pill.on.ok{background:#15803d;border-color:#15803d;color:#fff;}",
      ".cpx2-pill.on.ok b{color:#fff;}",
      ".cpx2-none{font-size:13px;color:var(--ink-dim,#718096);padding:4px 2px;}",
      /* slots */
      ".cpx2-slots{padding:12px 18px 4px;background:#faf7ff;border-bottom:1px solid #ece7f6;}",
      ".cpx2-slot{margin-bottom:9px;}",
      ".cpx2-slot label,.cpx2-mainlabel{display:block;font-size:10.5px;font-weight:600;letter-spacing:.8px;color:var(--ink-dim,#718096);margin-bottom:4px;}",
      ".cpx2-slot label b,.cpx2-mainlabel b{color:var(--purple-deep,#6d28d9);letter-spacing:1.2px;}",
      ".cpx2-mainlabel{margin:2px 0 8px;}",
      ".cpx2-mainlabel code{font-family:var(--mono,'JetBrains Mono',monospace);font-size:10.5px;background:#efe7fd;border-radius:6px;padding:1px 6px;letter-spacing:0;}",
      ".cpx2-slot textarea{display:block;width:100%;box-sizing:border-box;font-family:var(--mono,'JetBrains Mono',monospace);font-size:12.5px;line-height:1.55;border:1.5px solid #ece7f6;border-radius:10px;background:var(--card,#fff);color:var(--ink,#1a202c);padding:8px 11px;resize:none;overflow:auto;outline:none;}",
      ".cpx2-slot textarea:focus{border-color:var(--purple-light,#c4b5fd);}",
      /* focus mode — the whole solve loop on one screen */
      "body.cpx-focus .hero{display:none;}",
      "body.cpx-focus .CodeMirror,body.cpx-focus .CodeMirror-scroll{min-height:170px;}",
      "body.cpx-focus pre.term{max-height:150px;overflow:auto;}",
      "body.cpx-focus .cpx2-tabs{margin-bottom:8px;}",
      "body.cpx-focus .cpx-pal{padding-top:9px;padding-bottom:9px;}",
      "@media (max-width:640px){.cpx2-progress{order:-1;}}"
    ].join("");
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------------- boot */
  function boot() {
    if (!$("editor-panel") || !window.cm) { setTimeout(boot, 120); return; }
    injectCss();
    buildSlots();
    hookPage();
    if (slotMode) setSlotMode(true);               // split the default code into slots
    buildStrip();
    fetchSolved();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
