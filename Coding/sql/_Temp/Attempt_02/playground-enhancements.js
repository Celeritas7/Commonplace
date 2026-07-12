// playground-enhancements.js
// Adds to every interactive SQL playground:
//   1. Persist typed query text to localStorage so refresh doesn't wipe it
//   2. Persist a "ran" timestamp so we can show "last run X ago"
//   3. Optionally sync exercise status (in_progress / done) when the user runs
//      a query in a Challenge playground — same Supabase pattern as the SQLZoo tracker
// Loaded by every module-*.html via a single <script> tag at the end of <body>.

(function () {
  // ---- module identification ----
  var pathMatch = location.pathname.match(/module-(\d+)\.html/);
  if (!pathMatch) return;
  var MODULE_NUM = parseInt(pathMatch[1], 10);

  // ---- localStorage key for typed queries ----
  function keyFor(pgIdx) { return "commonplace_pg_attempt_m" + MODULE_NUM + "_" + pgIdx; }
  function attemptStateKey() { return "commonplace_module_exercises_progress"; }

  // ---- find challenge playgrounds by walking the DOM ----
  // A playground is a "challenge" if the nearest preceding h4 has id starting with "challenge-"
  function findChallengeMap() {
    var map = {}; // pg-idx -> { exerciseKey, anchorId }
    var pgs = document.querySelectorAll(".playground");
    pgs.forEach(function (pg) {
      var node = pg.previousElementSibling;
      while (node) {
        if (node.tagName === "H4" && node.id && node.id.indexOf("challenge-") === 0) {
          // Format: challenge-<digits>-<slug>
          // Digits are concatenated M+L+C (no separator). Module is 1-10.
          // If it starts with "10", module is 10, otherwise module is the first digit.
          var dm = node.id.match(/^challenge-(\d+)/);
          if (dm) {
            var digits = dm[1];
            var moduleNum, lessonNum, challengeNum;
            if (digits.substring(0, 2) === "10") {
              moduleNum = 10;
              lessonNum = digits.charAt(2);
              challengeNum = digits.charAt(3);
            } else {
              moduleNum = digits.charAt(0);
              lessonNum = digits.charAt(1);
              challengeNum = digits.charAt(2);
            }
            var exKey = "ex_" + moduleNum + "_" + lessonNum + "_" + challengeNum;
            map[pg.getAttribute("data-pg-idx")] = { key: exKey, anchor: node.id };
          }
          break;
        }
        if (node.tagName === "H4" || node.tagName === "H3" || node.tagName === "H2") break;
        node = node.previousElementSibling;
      }
    });
    return map;
  }

  // ---- text persistence ----
  document.querySelectorAll(".playground").forEach(function (pg) {
    var idx = pg.getAttribute("data-pg-idx");
    var ta = pg.querySelector("textarea");
    if (!ta) return;

    // Load saved text on page load
    var saved = localStorage.getItem(keyFor(idx));
    if (saved !== null && saved !== ta.value) {
      ta.value = saved;
      // Add a small "restored" badge above the playground (subtle)
      var header = pg.querySelector(".pg-header");
      if (header && !header.querySelector(".pg-restored")) {
        var b = document.createElement("span");
        b.className = "pg-restored";
        b.textContent = "↻ restored";
        b.style.cssText = "font-size:10.5px;color:#7c3aed;background:#f5f3ff;padding:2px 8px;border-radius:10px;margin-left:8px;font-weight:600;";
        b.title = "Your last typed query was restored from this device.";
        header.appendChild(b);
        setTimeout(function () { b.style.opacity = "0.5"; }, 3000);
      }
    }

    // Save text on input (debounced)
    var saveTimer = null;
    ta.addEventListener("input", function () {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        try { localStorage.setItem(keyFor(idx), ta.value); } catch (e) {}
        var badge = pg.querySelector(".pg-restored");
        if (badge) badge.remove();
      }, 400);
    });
  });

  // ---- challenge progress tracking ----
  var challengeMap = findChallengeMap();
  function setChallengeStatus(exKey, status) {
    try {
      var st = JSON.parse(localStorage.getItem(attemptStateKey()) || "{}");
      if (st[exKey] === "done" && status !== "done") return; // don't downgrade
      if (st[exKey] === status) return;
      st[exKey] = status;
      localStorage.setItem(attemptStateKey(), JSON.stringify(st));
    } catch (e) {}
  }

  // Wire run button: when user runs a query in a challenge playground, mark in_progress
  document.querySelectorAll(".playground").forEach(function (pg) {
    var idx = pg.getAttribute("data-pg-idx");
    var info = challengeMap[idx];
    if (!info) return;

    var runBtn = pg.querySelector('[data-action="run"]');
    if (!runBtn) return;

    runBtn.addEventListener("click", function () {
      setChallengeStatus(info.key, "in_progress");
      addChallengeControls(pg, info);
    });
  });

  // ---- "Mark as done" button on challenge playgrounds ----
  function addChallengeControls(pg, info) {
    if (pg.querySelector(".pg-done-btn")) return;
    var header = pg.querySelector(".pg-header");
    if (!header) return;
    var btn = document.createElement("button");
    btn.className = "pg-done-btn";
    btn.textContent = "Mark as done";
    btn.style.cssText = "font-size:11px;font-weight:700;padding:5px 10px;border-radius:14px;border:1px solid #16a34a;background:#fff;color:#16a34a;cursor:pointer;font-family:inherit;margin-left:auto;";
    btn.onclick = function (e) {
      e.preventDefault();
      setChallengeStatus(info.key, "done");
      btn.textContent = "✓ Done";
      btn.style.background = "#dcfce7";
      btn.style.cursor = "default";
      btn.disabled = true;
    };
    header.appendChild(btn);

    // Reflect current state
    try {
      var st = JSON.parse(localStorage.getItem(attemptStateKey()) || "{}");
      if (st[info.key] === "done") {
        btn.textContent = "✓ Done";
        btn.style.background = "#dcfce7";
        btn.style.cursor = "default";
        btn.disabled = true;
      }
    } catch (e) {}
  }

  // Initialize controls for already-completed challenges on load
  Object.keys(challengeMap).forEach(function (idx) {
    var pg = document.querySelector('.playground[data-pg-idx="' + idx + '"]');
    if (pg) addChallengeControls(pg, challengeMap[idx]);
  });

  // ---- top-of-page badge: "X / Y exercises done in this module" ----
  (function () {
    if (Object.keys(challengeMap).length === 0) return;
    var total = Object.keys(challengeMap).length;
    var done = 0;
    try {
      var st = JSON.parse(localStorage.getItem(attemptStateKey()) || "{}");
      Object.values(challengeMap).forEach(function (info) {
        if (st[info.key] === "done") done++;
      });
    } catch (e) {}

    // Inject a small status pill in the topnav if present, else near the module hero
    var nav = document.querySelector(".topnav, .module-hero, main");
    if (!nav) return;
    var pill = document.createElement("a");
    pill.href = "exercises.html";
    pill.className = "module-progress-pill";
    pill.style.cssText = "display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;padding:5px 12px;border-radius:14px;background:#ede9fe;color:#4f46e5;text-decoration:none;margin-left:auto;white-space:nowrap;";
    pill.innerHTML = "📚 " + done + " / " + total + " done";
    pill.title = "View all exercises across modules";
    if (nav.classList.contains("topnav")) {
      nav.appendChild(pill);
    } else {
      pill.style.position = "fixed";
      pill.style.top = "14px";
      pill.style.right = "14px";
      pill.style.zIndex = "1000";
      pill.style.boxShadow = "0 4px 12px rgba(79,70,229,0.18)";
      document.body.appendChild(pill);
    }
  })();
})();
