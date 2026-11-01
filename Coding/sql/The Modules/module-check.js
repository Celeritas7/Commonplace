// module-check.js — the 5-question check at the end of every SQL module (soft gate).
// Same rules as the Python lessons (Coding/Python/lessons/_build/lesson.js):
//   · "Check yourself · 5 questions" sits above the Previous / Next links;
//     get 4 of 5 and the module is checked.
//   · "Next · Module N →" runs the check first, unless this module is already checked;
//     "Continue anyway" always goes on, so the gate never traps you.
//   · Questions come from quiz/module-NN.js (CP_QUIZ_BANK); their sec ("3.2") names the
//     lesson, so "Review those sections" scrolls to h2#lesson-32-….
// cp_sql_check = { "03": { pass, right, asked, at } }. A later miss never un-checks a module.
// Loaded by every module-*.html after playground-enhancements.js. On redesigned pages
// (section.bk-check present) book-ui.js draws the check and the gate; this file only
// opens the quiz on sqlbook:check-start and reports the result with SQLBook.check.set().
(function () {
  var m = location.pathname.match(/module-(\d+)\.html/);
  if (!m || window.__sqlModuleCheck) return; window.__sqlModuleCheck = 1;
  var MOD = m[1], NUM = parseInt(MOD, 10), KEY = "cp_sql_check";

  function checks() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function checked() { var c = checks()[MOD]; return !!(c && c.pass); }
  function save(r) {
    var all = checks(), prev = all[MOD];
    if (prev && prev.pass && !r.pass) return;
    all[MOD] = { pass: r.pass, right: r.right, asked: r.asked, at: r.at || Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  }
  function lessonEl(sec) { return document.querySelector('main h2[id^="lesson-' + String(sec).replace(".", "") + '-"]'); }
  function secName(sec) { var h = lessonEl(sec); return h ? h.textContent.trim() : "Lesson " + sec; }
  function goTo(list) {
    var h = list && list.length ? lessonEl(list[0]) : document.querySelector('main h2[id^="lesson-"]');
    if (h) h.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // FIXES-PR19-20.md §5: decide up front whether the quiz layer can arrive at all
  function quizAvailable() {
    if (window.CP_QUIZ_OFF) return false;
    if (window.CPQuiz) return true;
    return !!document.querySelector('script[src*="progress-backup.js"]');  // the layer is coming; worth a short wait
  }
  function withQuiz(fn, fallback) {
    if (!quizAvailable()) return fallback();
    if (window.CPQuiz && CPQuiz.check) return fn(window.CPQuiz);
    var t0 = Date.now(), id = setInterval(function () {
      if (window.CPQuiz && CPQuiz.check) { clearInterval(id); fn(window.CPQuiz); }
      else if (Date.now() - t0 > 600) { clearInterval(id); fallback(); }
    }, 50);
  }
  function quizOpts(after, onResult) {
    return {
      count: 5, pass: 4, title: "Check · Module " + NUM, passTitle: "Module " + NUM + " checked",
      continueLabel: after ? "Next module" : "Done", anywayLabel: after ? "Continue anyway" : "Close",
      secName: secName,
      onResult: function (r) { save(r); onResult(); },
      onDone: function (r) {
        if (r.empty) { if (after) after(); return; }   // nothing to ask: never block
        if (r.action === "review") return goTo(r.sections);
        if (after && r.action === "continue") after();
      }
    };
  }

  // ---- redesigned pages: book-ui.js draws section.bk-check and runs the soft gate ----
  if (document.querySelector(".bk-check")) {
    var gateHref = null;
    var paintBook = function () {
      if (!window.SQLBook) return;
      if (!quizAvailable()) return SQLBook.check.set({ state: "unavailable" });
      var c = checks()[MOD];
      if (!c) return SQLBook.check.set({ state: "untaken" });
      var date = c.at ? new Date(c.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
      SQLBook.check.set({ state: c.pass ? "passed" : "partial", score: c.right, total: c.asked || 5, date: date });
      var tab = document.querySelector('.bk-tab[aria-current="page"]');
      if (tab && c.pass && !tab.querySelector(".ok")) tab.insertAdjacentHTML("beforeend", ' <span class="ok">✓</span>');
    };
    document.addEventListener("sqlbook:ready", function () {
      paintBook();
      var all = checks();   // ✓ on the tabs of other modules that are checked
      Array.prototype.forEach.call(document.querySelectorAll(".bk-tab[data-mod]"), function (t) {
        var c = all[t.getAttribute("data-mod")];
        if (c && c.pass && !t.querySelector(".ok")) t.insertAdjacentHTML("beforeend", ' <span class="ok">✓</span>');
      });
    });
    // the gate's "Take the check" fires sqlbook:gate first, then sqlbook:check-start
    document.addEventListener("sqlbook:gate", function (e) {
      var g = document.getElementById("bk-gate");
      gateHref = e.detail && e.detail.choice === "check" && g ? g.dataset.href : null;
    });
    document.addEventListener("sqlbook:check-start", function () {
      var href = gateHref; gateHref = null;
      var after = href ? function () { location.href = href; } : null;
      withQuiz(function (Q) { Q.check(quizOpts(after, paintBook)); },
               function () { SQLBook.check.set({ state: "unavailable" }); if (after) after(); });
    });
    return;
  }

  // ---- older pages: inject the .mcheck box and gate the Next link here ----
  var nav = document.querySelector("main .module-nav");
  if (!nav) return;
  var css = document.createElement("style");
  css.textContent =
    ".mcheck{margin:40px 0 18px;padding:18px 20px;border:1px solid var(--rule);border-radius:10px;background:var(--paper-2)}" +
    ".mcheck .k{font-family:var(--mono);font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent)}" +
    ".mcheck h3{margin:6px 0 4px;font-size:24px}" +
    ".mcheck p{margin:0 0 12px;color:var(--ink-soft)}" +
    ".mcheck button{font-family:var(--mono);font-size:13px;font-weight:600;min-height:44px;padding:0 18px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);cursor:pointer}" +
    ".mcheck.done{border-color:var(--forest)}.mcheck.done .k{color:var(--forest)}" +
    ".mcheck.done button{background:transparent;color:var(--forest);border-color:var(--forest)}";
  document.head.appendChild(css);
  var box = document.createElement("section");
  box.className = "mcheck"; box.id = "mod-check";
  box.innerHTML = '<span class="k">Before the next module</span><h3>Check yourself · 5 questions</h3>' +
    '<p id="mod-check-note">A short quiz on this module. Get 4 of 5 and it is checked.</p>' +
    '<button type="button" id="mod-check-btn">&#129504; Start the check</button>';
  nav.parentNode.insertBefore(box, nav);
  var btn = box.querySelector("button"), note = box.querySelector("p");

  function paint() {
    var c = checks()[MOD]; if (!c) return;
    if (c.pass) {
      box.classList.add("done"); btn.textContent = "✓ Checked · " + c.right + "/" + c.asked;
      note.textContent = "You passed the check for this module. Retake it any time from 🧠 Quiz.";
    } else {
      btn.textContent = "↻ Try the check again";
      note.textContent = "Last try: " + c.right + "/" + c.asked + ". Get " + Math.min(4, c.asked) + " of " + c.asked + " to check this module.";
    }
  }

  function run(after) {
    withQuiz(function (Q) { Q.check(quizOpts(after, paint)); },
             function () { if (after) after(); else box.hidden = true; });
  }

  // no quiz layer: no dead button (Next already goes straight on). The progress-backup.js tag sits below this script, so look once the page has parsed.
  document.addEventListener("DOMContentLoaded", function () { if (!quizAvailable()) box.hidden = true; });
  paint();
  btn.addEventListener("click", function () { run(null); });
  Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
    var label = a.querySelector(".label");
    if (!label || !/^\s*Next\b/i.test(label.textContent)) return;
    a.addEventListener("click", function (e) {
      if (checked() || !quizAvailable() || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      var href = a.href;
      run(function () { location.href = href; });
    });
  });
})();
