// sql-lab.js — powers the SQL home page: the Lab console, the funnel, the module
// cards and the Today card. Drawing goes through book-ui.js (window.SQLBook), which
// loads after this file, so anything that paints waits for "sqlbook:ready".
(function () {
  "use strict";

  var db = null;
  var SQLmod = null;       // sql.js module, kept so "Reset data" can rebuild the database
  var engineReady = false, bookReady = false;
  var editor = document.getElementById("editor");
  var lab = document.getElementById("lab-console");
  var resultsEl = document.getElementById("results");
  var PHONE = window.matchMedia("(max-width:720px)");

  function onBook(fn) { if (bookReady) fn(); else document.addEventListener("sqlbook:ready", fn); }
  document.addEventListener("sqlbook:ready", function () { bookReady = true; });
  function pgSet(state, data) { if (window.SQLBook) SQLBook.pg.set(lab, state, data); }

  // ---------- boot the engine ----------
  initSqlJs({ locateFile: function (f) { return (function(){var s=document.querySelector('script[src*="sql-wasm"]');return s?s.src.slice(0,s.src.lastIndexOf("/")+1):"";})() + f; } })
    .then(function (SQL) {
      SQLmod = SQL;
      db = freshDb();
      engineReady = true;
      onBook(function () { runQuery(); });   // open with live data
    })
    .catch(function (e) {
      onBook(function () { pgSet("error", { message: "Could not load the SQL engine. " + e.message }); });
    });
  onBook(function () { if (!engineReady) pgSet("running"); });

  function freshDb() {
    var d = new SQLmod.Database();
    d.run(window.SQL_LAB_SEED);
    return d;
  }

  // FIXES-PR19-20.md §3: strip comments and strings, then look at the first keyword of each statement.
  function changesData(sql) {
    var s = String(sql).replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"|--[^\n]*|\/\*[\s\S]*?\*\//g, " ");
    return s.split(";").some(function (st) {
      var m = st.trim().match(/^\(*\s*([a-z]+)/i); if (!m) return false;
      var k = m[1].toUpperCase();
      if (/^(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER|TRUNCATE|ATTACH|DETACH|VACUUM|REINDEX|PRAGMA)$/.test(k)) return true;
      return k === "WITH" && /\)\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(st);
    });
  }
  var dataChanged = false;
  function resetData() {
    if (!engineReady) return;
    try { db.close(); } catch (e) {}
    db = freshDb();
    dataChanged = false;
    pgSet("idle");
    if (window.SQLBook) SQLBook.toast("Data reset to its original state");
  }
  document.addEventListener("sqlbook:reset-data", function (e) { if (e.detail && e.detail.pg === lab) resetData(); });

  // ---------- run a query ----------
  function runQuery() {
    if (!engineReady) return;
    var sql = editor.value.trim();
    if (!sql) { pgSet("idle"); return; }
    var t0 = performance.now(), res;
    try { res = db.exec(sql); }
    catch (e) { pgSet("error", { message: String(e.message || e) }); return; }
    var ms = Math.max(1, Math.round(performance.now() - t0));
    var last = res.length ? res[res.length - 1] : null;   // show the final result set
    var data = last ? { columns: last.columns, rows: last.values, ms: ms } : { message: "Statement ran. No rows returned.", ms: ms };
    if (changesData(sql)) { dataChanged = true; data.changed = "this query changed the sample data"; }
    else if (dataChanged) data.changed = "an earlier query changed the sample data";
    pgSet(dataChanged ? "dirty" : "ok", data);
  }

  // ---------- editor helpers ----------
  // FIXES-PR19-20.md §2: callers that aren't typing (the funnel) pass {focus:false} so a
  // tap never scrolls the page to the editor or opens the phone keyboard.
  function setQuery(sql, opts) {
    editor.value = sql;
    editor.dispatchEvent(new Event("input"));   // book-ui grows the textarea to fit
    runQuery();
    if (!opts || opts.focus !== false) editor.focus({ preventScroll: true });
  }
  function insertAtCursor(text) {
    var s = editor.selectionStart, e = editor.selectionEnd, v = editor.value;
    // If the caret sits after the closing semicolon (where it lands after a
    // table peek), insert before it so the name lands inside the statement.
    var tail = v.slice(s);
    if (/^\s*$/.test(tail)) {
      var m = v.slice(0, s).match(/;\s*$/);
      if (m) { s = e = s - m[0].length; }
    }
    // add a leading space if needed so tokens don't run together
    var before = v.slice(0, s);
    var needSpace = before.length && !/\s$/.test(before) && !/[(,.]$/.test(before);
    var ins = (needSpace ? " " : "") + text;
    editor.value = before + ins + v.slice(e);
    var pos = s + ins.length;
    editor.setSelectionRange(pos, pos);
    editor.focus({ preventScroll: true });
  }
  function resultOnScreen() {
    var r = lab.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  document.getElementById("run-btn").addEventListener("click", runQuery);
  document.getElementById("clear-btn").addEventListener("click", function () {
    editor.value = ""; editor.dispatchEvent(new Event("input")); editor.focus({ preventScroll: true });
    pgSet("idle");
  });
  editor.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runQuery(); }
    // Tab indents instead of leaving the editor
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      var s = editor.selectionStart, en = editor.selectionEnd, v = editor.value;
      editor.value = v.slice(0, s) + "  " + v.slice(en);
      editor.setSelectionRange(s + 2, s + 2);
    }
  });

  // ---------- starter chips ----------
  var CHIPS = [
    { label: "all films", sql: "SELECT * FROM film;" },
    { label: "distinct ratings", sql: "SELECT DISTINCT rating FROM film;" },
    { label: "count by rating", sql: "SELECT rating, COUNT(*) AS films\nFROM film\nGROUP BY rating\nORDER BY films DESC;" },
    { label: "top spenders", sql: "SELECT c.first_name, c.last_name, SUM(p.amount) AS spent\nFROM customer c\nJOIN payment p ON p.customer_id = c.customer_id\nGROUP BY c.customer_id\nORDER BY spent DESC;" },
    { label: "films + category", sql: "SELECT f.title, cat.name AS category\nFROM film f\nJOIN film_category fc ON fc.film_id = f.film_id\nJOIN category cat ON cat.category_id = fc.category_id\nORDER BY cat.name;" },
    { label: "missing emails", sql: "SELECT COUNT(*) AS total, COUNT(email) AS with_email\nFROM customer;" }
  ];
  var chipsEl = document.getElementById("chips");
  CHIPS.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = c.label;
    b.addEventListener("click", function () { setQuery(c.sql); });
    chipsEl.appendChild(b);
  });

  // ---------- schema explorer ----------
  // Buttons go after the .hm-schema__t title row; it must not be replaced.
  var META = window.SQL_LAB_SCHEMA || [];
  var tEl = document.getElementById("schema-tables");
  META.forEach(function (t) {
    var row = document.createElement("button");
    row.type = "button"; row.className = "hm-t"; row.setAttribute("aria-expanded", "false");
    row.innerHTML = t.name + " <span>" + t.rows + "</span>";
    var cols = document.createElement("div");
    cols.className = "hm-cols"; cols.hidden = true;
    t.cols.forEach(function (cn) {
      var cb = document.createElement("button");
      cb.type = "button"; cb.className = "hm-col"; cb.textContent = cn;
      cb.addEventListener("click", function () { insertAtCursor(cn); });
      cols.appendChild(cb);
    });
    row.addEventListener("click", function () {
      var open = cols.hidden;
      cols.hidden = !open; row.setAttribute("aria-expanded", String(open));
      setQuery("SELECT * FROM " + t.name + " LIMIT 20;", { focus: !PHONE.matches });
    });
    tEl.appendChild(row);
    tEl.appendChild(cols);
  });

  // ---------- interactive funnel ----------
  var FUNNEL = [
    { kw: "SELECT", sub: "columns (AS aliases)",
      desc: "Choose which columns come back, and rename them. This is the only clause that's required in every query.",
      sql: "SELECT title, rating, length\nFROM film;" },
    { kw: "FROM", sub: "the source table",
      desc: "Names the table the rows are drawn from. The engine actually resolves this before SELECT — it needs to know the table before it can find your columns.",
      sql: "SELECT *\nFROM actor;" },
    { kw: "WHERE", sub: "row filter",
      desc: "Keeps only the rows that pass a condition. It runs before any grouping, so it can't see aggregates like COUNT — that's what HAVING is for.",
      sql: "SELECT title, rating\nFROM film\nWHERE rating = 'PG';" },
    { kw: "GROUP BY", sub: "collapse into groups",
      desc: "Folds many rows into one per group, so aggregates can summarise each group. Here: one row per rating, with a count.",
      sql: "SELECT rating, COUNT(*) AS films\nFROM film\nGROUP BY rating;" },
    { kw: "HAVING", sub: "filter the groups",
      desc: "Like WHERE, but it filters groups after aggregation — so it can test a COUNT or SUM. Keep only ratings with more than two films.",
      sql: "SELECT rating, COUNT(*) AS films\nFROM film\nGROUP BY rating\nHAVING COUNT(*) > 2;" },
    { kw: "ORDER BY", sub: "sort the result",
      desc: "Arranges the final rows. Sorting happens late — after filtering and grouping — so you can order by an aggregate or an alias.",
      sql: "SELECT title, length\nFROM film\nORDER BY length DESC;" },
    { kw: "LIMIT", sub: "cap the rows",
      desc: "Returns only the first n rows. Applied dead last, so it caps whatever the clauses above produced — perfect for top-N questions.",
      sql: "SELECT title\nFROM film\nORDER BY title\nLIMIT 5;" }
  ];
  var funnelEl = document.getElementById("funnel");
  var asideEl = document.getElementById("funnel-aside");
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // run=true (a tap) loads the clause's example into the Lab and runs it, as the
  // section note promises; the initial selection on page load only shows it.
  function selectRung(i, run) {
    var f = FUNNEL[i];
    Array.prototype.forEach.call(funnelEl.children, function (c, j) { c.setAttribute("aria-pressed", String(j === i)); });
    if (run) {
      setQuery(f.sql, { focus: false });
      if (!resultOnScreen()) {
        if (PHONE.matches) { if (window.SQLBook) SQLBook.toast("Ran " + f.kw + " in the Lab", { action: { label: "See result ↑", href: "#lab" } }); }
        else lab.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    if (asideEl) asideEl.innerHTML =
      '<span class="bk-k bk-k--accent">Clause ' + (i + 1) + " of 7</span>" +
      "<h3>" + f.kw + "</h3>" +
      "<p>" + f.desc + "</p>" +
      '<pre class="bk-code"><code>' + esc(f.sql) + "</code></pre>";
  }
  FUNNEL.forEach(function (f, i) {
    var b = document.createElement("button");
    b.type = "button"; b.style.width = (100 - i * 5) + "%";
    b.innerHTML = f.kw + " <span>" + f.sub + "</span>";
    b.addEventListener("click", function () { selectRung(i, true); });
    funnelEl.appendChild(b);
  });
  selectRung(0, false);

  // ---------- modules, progress, Today ----------
  // Challenge lists come from lib/exercises-index.js (the one list every counter uses).
  var MODULES = [
    { t: "Retrieving data", b: "SELECT, columns, aliases, DISTINCT, COUNT." },
    { t: "Filtering & sorting", b: "WHERE, AND/OR, IN, LIKE, ORDER BY, LIMIT." },
    { t: "Aggregating data", b: "SUM, AVG, GROUP BY, HAVING." },
    { t: "JOINs", b: "INNER, LEFT, RIGHT, FULL, UNION." },
    { t: "Advanced SQL", b: "Dates, string functions, subqueries, self-joins." },
    { t: "Creating & modifying tables", b: "CREATE, INSERT, UPDATE, DELETE, ALTER." },
    { t: "Conditional expressions & views", b: "CASE, COALESCE, NULLIF, CAST, views." },
    { t: "Importing & exporting data", b: "CSV in, CSV out, cleaning on the way." },
    { t: "PostgreSQL with Python", b: "psycopg, parameters, transactions." },
    { t: "Capstone — Tiffinly", b: "Design and query a real schema." }
  ];
  var READONLY = 9;
  function nn(n) { return (n < 10 ? "0" : "") + n; }
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (e) { return {}; } }

  function progressModel() {
    var prog = readJSON("commonplace_module_exercises_progress"), checks = readJSON("cp_sql_check");
    var list = window.SQL_EXERCISES || [];
    var mods = MODULES.map(function (m, i) {
      var n = i + 1, ex = list.filter(function (e) { return e.m === n; });
      var done = ex.filter(function (e) { return prog[e.k] === "done"; }).length;
      var c = checks[nn(n)];
      return { n: n, title: m.t, blurb: m.b, href: "The Modules/module-" + nn(n) + ".html", done: done, total: ex.length, ex: ex, checked: !!(c && c.pass), check: c || null };
    });
    var current = mods.filter(function (m) { return m.done < m.total; })[0] || null;
    mods.forEach(function (m) { m.state = m.n === READONLY ? "readonly" : m === current ? "current" : m.total && m.done === m.total ? "done" : ""; });
    var any = Object.keys(prog).some(function (k) { return /^ex_\d+_/.test(k); }) || Object.keys(checks).length > 0 ||
      !!(window.SQLBank && SQLBank.all().length);
    var next = null;
    list.some(function (e) { if (prog[e.k] !== "done") { next = e; return true; } return false; });
    return {
      mods: mods, current: current, next: next, fresh: !any,
      done: mods.reduce(function (a, m) { return a + m.done; }, 0),
      total: mods.reduce(function (a, m) { return a + m.total; }, 0),
      checked: mods.filter(function (m) { return m.checked; }).length
    };
  }

  function paintHome() {
    var P = progressModel();
    SQLBook.modules.render("mods", P.mods.map(function (m) {
      return { n: m.n, title: m.title, blurb: m.blurb, href: m.href, done: m.done, total: m.total, checked: m.checked, state: m.state };
    }));
    document.getElementById("overall-prog").textContent = P.done + " / " + P.total + " challenges · " + P.checked + " of 10 checked";

    if (P.fresh) { SQLBook.today.render({ state: "fresh" }); return; }
    var date = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    var resume = P.current
      ? { href: P.current.href, title: "Continue Module " + P.current.n + " · " + P.current.title, sub: P.current.done + " / " + P.current.total + " challenges done" }
      : { href: "Practice/sqlzoo.html", title: "All " + P.total + " challenges done", sub: "Keep sharp on SQLZoo, or retake a module check" };
    var rows = [], due = window.SQLBank ? SQLBank.dueItems() : [];
    if (due.length) rows.push({ tone: "due", mark: String(due.length), label: "Mistakes due to re-solve",
      sub: due.slice(0, 3).map(function (it) { return it.srcLabel; }).join(" · "), value: "Re-solve →", href: "Practice/mistake-drill.html" });
    if (P.next) rows.push({ mark: "›", label: "Next unfinished challenge", sub: P.next.t.replace(/^Challenge\s+/, ""), value: "Open →", href: "The Modules/" + P.next.u });
    var partial = P.mods.filter(function (m) { return m.check && !m.check.pass; })[0];
    var unchecked = P.mods.filter(function (m) { return !m.checked; })[0];
    var target = partial || unchecked;
    rows.push({
      tone: P.checked ? "ok" : "", mark: "✓", label: "Module checks · " + P.checked + " of 10",
      sub: partial ? "Module " + partial.n + " last try " + partial.check.right + " / " + partial.check.asked + " — try again"
         : unchecked ? "Next: Module " + unchecked.n + " · " + unchecked.title : "Every module checked",
      value: target ? "M" + target.n + " →" : "✓",
      href: target ? target.href + "#check" : "#modules-top"
    });
    SQLBook.today.render({ date: date, resume: resume, rows: rows });
  }
  onBook(paintHome);
  // another tab (a module page) may finish a challenge or a check while this one is open
  window.addEventListener("storage", function (e) {
    if (bookReady && (e.key === "commonplace_module_exercises_progress" || e.key === "cp_sql_check" || e.key === "cp_sql_bank")) paintHome();
  });
  // sql-sync.js merged another device's progress, checks or bank
  document.addEventListener("sqlsync:pulled", function () { if (bookReady) paintHome(); });

})();
