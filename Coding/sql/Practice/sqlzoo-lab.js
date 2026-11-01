// sqlzoo-lab.js — powers the SQLZoo-style practice page (free sandbox + graded exercises)
// Drawing goes through book-ui.js (window.SQLBook), which loads last, so anything that
// paints waits for "sqlbook:ready". Grading uses lib/sql-grade.js, the module pages' grader.
(function () {
  "use strict";

  var SQL = null;          // sql.js module
  var sandboxDb = null;    // mutable DB for the free Lab
  var ready = false, bookReady = false;
  var SEED = window.SQLZOO_SEED || "";
  var SCHEMA = window.SQLZOO_SCHEMA || [];
  var EXERCISES = window.SQLZOO_EXERCISES || [];
  var PROGRESS_KEY = "commonplace_sqlzoo_progress";
  var G = window.SQLGrade;

  var led = document.getElementById("led");
  var ledText = document.getElementById("led-text");
  var freeEl = document.getElementById("free");

  function onBook(fn) { if (bookReady) fn(); else document.addEventListener("sqlbook:ready", fn); }
  document.addEventListener("sqlbook:ready", function () { bookReady = true; });

  // ---------- progress ----------
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  var progress = loadProgress();

  // ---------- boot ----------
  initSqlJs({ locateFile: function (f) { return (function(){var s=document.querySelector('script[src*="sql-wasm"]');return s?s.src.slice(0,s.src.lastIndexOf("/")+1):"";})() + f; } })
    .then(function (mod) {
      SQL = mod;
      sandboxDb = freshDb();
      ready = true;
      setLed(true);
      buildSchema();
      buildChips();
      onBook(function () {
        buildExercises();
        hydrateProgressFromSupabase();                     // pull cross-device solves now if a session exists…
        if (window.sb && window.sb.auth) {                 // …and again once auth resolves (getSession is async)
          window.sb.auth.onAuthStateChange(function () { hydrateProgressFromSupabase(); });
        }
        runSandbox(); // open with live data
      });
    })
    .catch(function (e) {
      led.classList.remove("loading"); led.classList.add("err");
      ledText.textContent = "engine failed";
      onBook(function () { SQLBook.pg.set(freeEl, "error", { message: "Could not load the SQL engine. " + e.message }); });
    });

  function freshDb() {
    var d = new SQL.Database();
    d.run(SEED);
    return d;
  }

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function lastResult(db, sql) {
    // returns {columns, values} of the final statement, or null for no result set
    var res = db.exec(sql);
    if (!res.length) return null;
    return res[res.length - 1];
  }

  // ---------- result-set comparison (the grader) ----------
  // FIXES-PR19-20.md §1: lib/sql-grade.js reports "columns in the wrong order" only when one
  // column permutation fixes every row; anything else is a values / row-count / order verdict,
  // with the cells and rows to flag in the challenge diff. Rows that tie on every ORDER BY key
  // may come back in any order.
  function compare(e, expected, actual) {
    if (!actual) actual = { columns: [], values: [] };
    return G.compare(expected, actual, e.order ? G.orderKeys(e.sol, expected.columns) : null);
  }

  // ---------- free sandbox ----------
  var editor = document.getElementById("editor");
  var dataChanged = false;

  function runSandbox() {
    if (!ready || !bookReady) return;
    var sql = (editor.value || "").trim();
    if (!sql) { SQLBook.pg.set(freeEl, "idle"); return; }
    var t0 = performance.now(), res;
    try { res = sandboxDb.exec(sql); }
    catch (e) { SQLBook.pg.set(freeEl, "error", { message: String(e.message || e) }); setLed(false); return; }
    var ms = Math.max(1, Math.round(performance.now() - t0));
    setLed(true);
    var last = res.length ? res[res.length - 1] : null;
    var data = last ? { columns: last.columns, rows: last.values, ms: ms } : { message: "Statement ran. No rows returned.", ms: ms };
    if (G.changesData(sql)) { dataChanged = true; data.changed = "this query changed the sample data"; }
    else if (dataChanged) data.changed = "an earlier query changed the sample data";
    SQLBook.pg.set(freeEl, dataChanged ? "dirty" : "ok", data);
  }
  function setLed(ok) {
    led.classList.remove("loading");
    led.classList.toggle("ok", ok); led.classList.toggle("err", !ok);
    ledText.textContent = ok ? "engine ready · " + SCHEMA.length + " tables" : "query error";
  }
  function setQuery(sql) {
    editor.value = sql; editor.dispatchEvent(new Event("input"));
    runSandbox(); editor.focus({ preventScroll: true });
  }
  function insertAtCursor(text) {
    var s = editor.selectionStart, e = editor.selectionEnd, v = editor.value;
    var before = v.slice(0, s);
    var needSpace = before.length && !/\s$/.test(before) && !/[(,.]$/.test(before);
    var ins = (needSpace ? " " : "") + text;
    editor.value = before + ins + v.slice(e);
    var pos = s + ins.length;
    editor.setSelectionRange(pos, pos); editor.focus({ preventScroll: true });
  }

  document.getElementById("run-btn").addEventListener("click", runSandbox);
  document.getElementById("clear-btn").addEventListener("click", function () {
    editor.value = ""; editor.dispatchEvent(new Event("input")); editor.focus({ preventScroll: true });
    SQLBook.pg.set(freeEl, "idle");
  });
  // #reset-btn carries data-action="reset-data"; book-ui turns its click into this event
  document.addEventListener("sqlbook:reset-data", function (ev) {
    if (!ready || !ev.detail || ev.detail.pg !== freeEl) return;
    try { sandboxDb.close(); } catch (e) {}
    sandboxDb = freshDb(); dataChanged = false;
    SQLBook.pg.set(freeEl, "idle");
    SQLBook.toast("Data reset to its original state");
  });
  editor.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runSandbox(); }
  });

  // ---------- starter chips ----------
  var CHIPS = [
    { label: "biggest populations", sql: "SELECT name, population\nFROM world\nORDER BY population DESC\nLIMIT 10;" },
    { label: "recent nobels", sql: "SELECT yr, subject, winner\nFROM nobel\nWHERE yr >= 2010\nORDER BY yr DESC;" },
    { label: "all goals", sql: "SELECT matchid, player, gtime\nFROM goal\nORDER BY matchid, gtime;" },
    { label: "join: scorer + team", sql: "SELECT player, teamname\nFROM goal\nJOIN eteam ON goal.teamid = eteam.id;" },
    { label: "count by continent", sql: "SELECT continent, COUNT(*) AS countries\nFROM world\nGROUP BY continent\nORDER BY countries DESC;" }
  ];
  function buildChips() {
    var chipsEl = document.getElementById("chips");
    CHIPS.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "bk-chip"; b.textContent = c.label;
      b.addEventListener("click", function () { setQuery(c.sql); });
      chipsEl.appendChild(b);
    });
  }

  // ---------- schema explorer ----------
  function buildSchema() {
    var tEl = document.getElementById("schema-tables");
    SCHEMA.forEach(function (t) {
      var row = document.createElement("button");
      row.type = "button"; row.className = "pr-t"; row.setAttribute("aria-expanded", "false");
      row.innerHTML = esc(t.name) + " <span>" + t.rows + "</span>";
      var cols = document.createElement("div"); cols.className = "pr-cols"; cols.hidden = true;
      t.cols.forEach(function (cn) {
        var cb = document.createElement("button"); cb.type = "button"; cb.className = "pr-col"; cb.textContent = cn;
        cb.addEventListener("click", function () { insertAtCursor(cn); });
        cols.appendChild(cb);
      });
      row.addEventListener("click", function () {
        var open = cols.hidden; cols.hidden = !open; row.setAttribute("aria-expanded", String(open));
        setQuery("SELECT * FROM " + t.name + " LIMIT 20;");
      });
      tEl.appendChild(row);
      tEl.appendChild(cols);
    });
  }

  // ---------- exercises ----------
  var DS_META = {
    world:    { label: "World",    blurb: "Countries, continents, area, population, GDP." },
    nobel:    { label: "Nobel",    blurb: "Prize year, subject and winner." },
    football: { label: "Football", blurb: "A sample tournament: teams, games and goals (JOIN practice)." }
  };
  function chKey(id) { return "sqlzoo_" + id; }
  var LAST = {};   // key → last options given to SQLBook.challenge.set, so an SQL error keeps the verdict on screen
  function chSet(key, o) { LAST[key] = o; SQLBook.challenge.set(key, o); }

  function updateProgressBar() {
    var total = EXERCISES.length, done = 0;
    EXERCISES.forEach(function (e) { if (progress[e.id] === "done") done++; });
    var pct = total ? Math.round(done / total * 100) : 0;
    var fill = document.getElementById("prog-fill");
    var txt = document.getElementById("prog-text");
    if (fill) fill.style.width = pct + "%";
    if (txt) txt.textContent = done + " / " + total + " solved";
  }
  function updateBankLink() {
    var a = document.getElementById("bank-link"), n = window.SQLBank ? SQLBank.dueCount() : 0;
    if (a) a.textContent = "Mistake Bank" + (n ? " · " + n : "");
  }

  /* ---------- cross-device solve-sync (commonplace_progress) ---------- */
  // exercise-code -> commonplace_exercises uuid. Same codes as the progress map
  // keys (w1, n3, f2). Mirror of the map in sql-practice-plus.js, which is
  // IIFE-scoped and not reachable from here.
  var SQL_EXERCISE_IDS = {
    w1:"d84d587b-82c6-4636-a18e-2d70a40b34b2", w2:"7f736c6a-f1d5-4947-be60-a878daa6f6cd",
    w3:"8260a723-1a21-4d74-8b9e-e2fdfc57e2c4", w4:"642a7744-0c77-4189-8b24-61d3296f882c",
    w5:"dac23c04-9dbf-4038-bf30-33f9bb1d3fdd", w6:"7c228bed-bbea-43bd-bf7f-67c7f3972858",
    w7:"b2292092-bcde-4a2a-8252-173796788f08", w8:"f57bbb44-87b0-44cb-bb85-c3710020ceca",
    n1:"ff4b8818-39bb-4321-bfa1-9707c129d90c", n2:"4a15b925-1a20-4c44-b9c9-601e02b159ea",
    n3:"9560237e-ebeb-41d6-95e7-95a576fd8884", n4:"9c2c0ed0-fe0d-4a9a-8ddf-2b7df8d33e7a",
    n5:"77241724-d6b3-45d2-9c4e-290dda0dc08d", n6:"517383e0-7195-4d28-8ce6-6ad3328adadc",
    f1:"98e8e367-103d-47a4-a140-4cb2da000bfe", f2:"b3e35982-742e-4ca0-a048-066caa5d76ca",
    f3:"eeb913d6-4015-4b2e-a16e-647a2e3cfca8", f4:"1bc32ddb-1be7-44ca-bbfe-841806273c1f",
    f5:"972f4db8-6956-4290-ae06-3e4aa27f5c72",
  };

  // Upsert this solve into commonplace_progress. Read-then-write so solved_at
  // (the streak anchor) is set once on first solve and never moved; re-solves
  // only bump last_solved_at + solve_count. Fire-and-forget: a network failure
  // must never block the local solve, which is already saved by the caller.
  function recordSolve(code) {
    try {
      var sb = window.sb, user = window.currentUser;
      if (!sb || !user) return;
      var exId = SQL_EXERCISE_IDS[code];
      if (!exId) return;
      var now = new Date().toISOString();
      sb.from("commonplace_progress")
        .select("solve_count")
        .eq("user_id", user.id)
        .eq("exercise_id", exId)
        .maybeSingle()
        .then(function (res) {
          if (res.error) return;
          if (res.data) {
            return sb.from("commonplace_progress")
              .update({ last_solved_at: now, solve_count: (res.data.solve_count || 0) + 1 })
              .eq("user_id", user.id)
              .eq("exercise_id", exId);
          }
          return sb.from("commonplace_progress").insert({
            user_id: user.id,
            exercise_id: exId,
            subject: "sql",
            solved_at: now,
            last_solved_at: now,
            solve_count: 1
          });
        })
        .catch(function () { /* offline — local progress already persisted */ });
    } catch (e) { /* never let sync errors reach the grading path */ }
  }

  // Pull this user's solves back from commonplace_progress and merge them into
  // local state, so a second device shows solved cards. Marks cards "done"
  // DIRECTLY — bypassing the verdict-ok block — so recordSolve never fires on
  // hydrate and solve_count can't inflate on load. Read-only against Supabase.
  function hydrateProgressFromSupabase() {
    try {
      var sb = window.sb, user = window.currentUser;
      if (!sb || !user) return;   // signed out -> local-only, no-op
      var byUuid = {};
      for (var code in SQL_EXERCISE_IDS) { byUuid[SQL_EXERCISE_IDS[code]] = code; }
      sb.from("commonplace_progress")
        .select("exercise_id")
        .eq("user_id", user.id)
        .eq("subject", "sql")
        .then(function (res) {
          if (res.error || !res.data) return;
          // AUTHORITATIVE: the server is the single source of truth for solves.
          // Build the server's set first, then reconcile BOTH directions —
          // add marks the server has, remove marks it doesn't. Touches only the
          // "done" flags; the "<id>:code" draft keys in the same map are left
          // alone so an unsolve never discards the user's typed SQL.
          var onServer = {};
          res.data.forEach(function (row) {
            var c = byUuid[row.exercise_id];
            if (c) onServer[c] = true;
          });
          for (var code in SQL_EXERCISE_IDS) {
            if (onServer[code]) progress[code] = "done";
            else if (progress[code] === "done") delete progress[code];          // server reset reaches this device
            paintSolved(code);
          }
          saveProgress(progress);
          updateProgressBar();
        })
        .catch(function () { /* offline — local progress stands */ });
    } catch (e) { /* sync read must never break the page */ }
  }

  // The .ch box book-ui wraps each exercise in keeps the old card hooks (#card-<id>,
  // .ex-card, .done, .ex-editor, .ex-head/.ex-title/.ex-prompt, .ex-actions, .ex-out) so
  // sql-practice-plus.js (tab strip, attempts log), sqlzoo-ui-plus.js (fullscreen, schema
  // sheet) and sql-highlight.js keep working.
  function paintSolved(code) {
    var box = document.getElementById("card-" + code); if (!box) return;
    var done = progress[code] === "done", c = SQLBook.challenge.get(chKey(code));
    box.classList.toggle("done", done);
    if (done && c && c.state !== "right") chSet(chKey(code), { state: "right", verdict: { detail: "Solved earlier on this device." } });
    if (!done && c && c.state === "right") chSet(chKey(code), { state: "untried" });
  }

  function buildExercises() {
    var host = document.getElementById("ex-list");
    var order = ["world", "nobel", "football"];
    order.forEach(function (ds) {
      var items = EXERCISES.filter(function (e) { return e.ds === ds; });
      if (!items.length) return;
      var meta = DS_META[ds] || { label: ds, blurb: "" };
      var grp = document.createElement("div"); grp.className = "ex-group"; grp.setAttribute("data-ds", ds);
      grp.innerHTML = '<div class="pr-group ex-group-head"><h3>' + esc(meta.label) + '</h3><span class="bk-k">' + esc(meta.blurb) + "</span></div>";
      items.forEach(function (e) { buildExercise(grp, e); });
      host.appendChild(grp);
    });
    SQLBook.challenge.decorate(host);
    EXERCISES.forEach(function (e) {
      var box = host.querySelector('.ch[data-ch="' + chKey(e.id) + '"]'); if (!box) return;
      box.id = "card-" + e.id;
      box.classList.add("ex-card");
      box.querySelector(".ch__head").classList.add("ex-head");
      box.querySelector(".ex-actions [data-action=\"run\"]").classList.add("run");
      addStar(box, e);
      paintSolved(e.id);
    });
    updateProgressBar();
    updateBankLink();
  }

  function buildExercise(grp, e) {
    var h4 = document.createElement("h4");
    h4.setAttribute("data-ch-key", chKey(e.id));
    h4.className = "ex-title";
    h4.innerHTML = esc(e.id.toUpperCase()) + " · " + esc(e.title) + ' <span class="pr-diff" title="difficulty ' + e.diff + '/3">' + "●●●".slice(0, e.diff) + '<i>' + "●●●".slice(e.diff) + "</i></span>";
    var p = document.createElement("p"); p.className = "ex-prompt";
    p.innerHTML = e.prompt; // trusted authored HTML (bold tags only)

    var pg = document.createElement("div"); pg.className = "playground"; pg.setAttribute("data-ex", e.id);
    pg.innerHTML =
      '<div class="pg-header"><div class="left"><span class="led"></span><span>Exercise ' + esc(e.id.toUpperCase()) + " · " + esc(e.ds) + "</span></div></div>" +
      '<textarea class="ex-editor" spellcheck="false" placeholder="Write your SQL here, then Run &amp; check…"></textarea>' +
      '<div class="pg-actions ex-actions"><div class="left-actions">' +
        '<button class="btn" type="button" data-action="reset">Reset</button>' +
        '<button class="btn" type="button" data-action="hint" data-hint="' + esc(e.hint || "") + '">Show hint</button>' +
        '<button class="btn" type="button" data-action="solution" data-solution="' + esc(e.sol) + '">Show solution</button>' +
      '</div><button class="btn primary" type="button" data-action="run">Run →</button></div>' +
      '<div class="pg-result ex-out"></div>';
    var ta = pg.querySelector("textarea");
    ta.value = progress[e.id + ":code"] || "";
    // the key palette sits between the editor and the buttons; its taps never focus the editor
    var keys = document.createElement("div"); keys.className = "pr-keys";
    keys.appendChild(window.SQLZOO_KEYS.build(e.ds, ta));
    pg.insertBefore(keys, pg.querySelector(".pg-actions"));

    grp.appendChild(h4); grp.appendChild(p); grp.appendChild(pg);

    ta.addEventListener("keydown", function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") { ev.preventDefault(); check(); }
    });
    ta.addEventListener("input", function () { progress[e.id + ":code"] = ta.value; saveProgress(progress); });
    pg.querySelector('[data-action="run"]').addEventListener("click", check);
    pg.querySelector('[data-action="reset"]').addEventListener("click", function () {
      ta.value = ""; ta.dispatchEvent(new Event("input")); SQLBook.pg.set(pg, "idle");
    });

    function bankMiss(reason) {
      if (!window.SQLBank) return false;
      var typed = (ta.value || "").trim();
      SQLBank.miss({ id: chKey(e.id), src: "sqlzoo", srcLabel: "SQLZoo · " + e.id.toUpperCase(), title: e.title,
        prompt: e.prompt, hint: e.hint || "", href: "Practice/sqlzoo.html#card-" + e.id,
        solution: e.sol, reason: reason, sql_wrong: typed });
      updateBankLink();
      return true;
    }
    pg.__bankMiss = bankMiss;

    function check() {
      if (!ready) return;
      var key = chKey(e.id), c = SQLBook.challenge.get(key), attempt = ((c && c.attempt) || 0) + 1;
      var userSql = (ta.value || "").trim();
      if (!userSql) { SQLBook.pg.set(pg, "idle"); return; }
      var db = freshDb(); // isolated run — sandbox mutations can't affect grading
      var expected, actual, t0 = performance.now();
      try { expected = lastResult(db, e.sol); }
      catch (err) { db.close(); SQLBook.pg.set(pg, "error", { message: "Internal: reference failed (" + err.message + ")" }); return; }
      try { actual = lastResult(db, userSql); }
      catch (err) {
        db.close();
        SQLBook.pg.set(pg, "error", { message: String(err.message || err) });
        chSet(key, Object.assign({}, LAST[key], { attempt: attempt }));
        return;
      }
      db.close();
      var ms = Math.max(1, Math.round(performance.now() - t0));
      SQLBook.pg.set(pg, "ok", actual ? { columns: actual.columns, rows: actual.values, ms: ms } : { message: "Statement ran — no rows returned.", ms: ms });

      var verdict = compare(e, expected, actual);
      if (verdict.ok) {
        var nxt = nextExercise(e);
        chSet(key, { state: "right", attempt: attempt, rows: expected.values.length,
          next: nxt ? { href: "#card-" + nxt.id, label: "Next · " + nxt.id.toUpperCase() } : null });
        progress[e.id] = "done"; saveProgress(progress);
        recordSolve(e.id);
        if (window.SQLBank) SQLBank.fix(key);
        updateBankLink();
        document.getElementById("card-" + e.id).classList.add("done");
        updateProgressBar();
      } else {
        chSet(key, { state: "wrong", attempt: attempt, verdict: verdict.verdict, banked: bankMiss(verdict.verdict.reason.toLowerCase()) });
      }
    }
  }
  function nextExercise(e) {
    var i = EXERCISES.indexOf(e);
    for (var k = 1; k < EXERCISES.length; k++) { var n = EXERCISES[(i + k) % EXERCISES.length]; if (progress[n.id] !== "done") return n; }
    return null;
  }

  // Revealing a solution banks the exercise too
  document.addEventListener("sqlbook:solution", function (ev) {
    var m = /^sqlzoo_(.+)$/.exec(ev.detail.key || ""); if (!m) return;
    var pg = document.querySelector('.playground[data-ex="' + m[1] + '"]');
    if (pg && pg.__bankMiss) pg.__bankMiss("solution revealed");
  });

  // Bookmarks are LOCAL ONLY. Stored as progress[id + ":star"] = true — never the
  // string "done", and never under the bare id — because hydrateProgressFromSupabase()
  // deletes any key whose value is "done" that the server does not know about.
  // The ":code" draft keys survive the same way. There is no server sync for stars.
  function addStar(box, e) {
    var on0 = !!progress[e.id + ":star"];
    var starB = document.createElement("button");
    starB.type = "button"; starB.className = "ex-star"; starB.title = "Bookmark this exercise";
    starB.setAttribute("aria-pressed", String(on0)); starB.textContent = on0 ? "★" : "☆";
    starB.addEventListener("click", function () {
      var on = !progress[e.id + ":star"];
      if (on) progress[e.id + ":star"] = true; else delete progress[e.id + ":star"];
      saveProgress(progress);
      starB.textContent = on ? "★" : "☆";
      starB.setAttribute("aria-pressed", on ? "true" : "false");
    });
    box.querySelector(".ch__head").insertBefore(starB, box.querySelector(".ch-badge"));
  }

})();
