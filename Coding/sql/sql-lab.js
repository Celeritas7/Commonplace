// sql-lab.js — powers the interactive SQL Lab
(function () {
  "use strict";

  var db = null;
  var ready = false;
  var editor = document.getElementById("editor");
  var resultsEl = document.getElementById("results");
  var led = document.getElementById("led");
  var ledText = document.getElementById("led-text");

  // ---------- boot the engine ----------
  initSqlJs({ locateFile: function (f) { return "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/" + f; } })
    .then(function (SQL) {
      db = new SQL.Database();
      db.run(window.SQL_LAB_SEED);
      ready = true;
      led.classList.add("ready");
      ledText.textContent = "engine ready";
      runQuery(); // run the default query so the page opens with live data
    })
    .catch(function (e) {
      led.classList.add("err");
      ledText.textContent = "engine failed";
      showError("Could not load the SQL engine.\n" + e.message);
    });

  // ---------- run a query ----------
  function runQuery() {
    if (!ready) return;
    var sql = editor.value.trim();
    if (!sql) { resultsEl.innerHTML = '<div class="res-msg empty">Type a query and hit Run.</div>'; return; }
    var t0 = performance.now();
    try {
      var res = db.exec(sql);
      var ms = (performance.now() - t0).toFixed(1);
      if (!res.length) {
        resultsEl.innerHTML = '<div class="res-msg ok">✓ Statement ran. No rows returned.</div>' +
          '<div class="res-foot"><span>' + ms + ' ms</span></div>';
        led.classList.remove("err"); led.classList.add("ready"); ledText.textContent = "engine ready";
        return;
      }
      var last = res[res.length - 1]; // show the final result set
      renderTable(last.columns, last.values, ms);
      led.classList.remove("err"); led.classList.add("ready"); ledText.textContent = "engine ready";
    } catch (e) {
      showError(String(e.message || e));
      led.classList.remove("ready"); led.classList.add("err"); ledText.textContent = "query error";
    }
  }

  function renderTable(cols, rows, ms) {
    var h = '<table class="grid"><thead><tr>';
    cols.forEach(function (c) { h += "<th>" + esc(c) + "</th>"; });
    h += "</tr></thead><tbody>";
    rows.forEach(function (r) {
      h += "<tr>";
      r.forEach(function (v) {
        if (v === null) h += '<td class="null">NULL</td>';
        else if (typeof v === "number") h += '<td class="num">' + esc(v) + "</td>";
        else h += "<td>" + esc(v) + "</td>";
      });
      h += "</tr>";
    });
    h += "</tbody></table>";
    h += '<div class="res-foot"><span>' + rows.length + (rows.length === 1 ? " row" : " rows") +
         "</span><span>" + cols.length + (cols.length === 1 ? " column" : " columns") +
         "</span><span>" + ms + " ms</span></div>";
    resultsEl.innerHTML = h;
    resultsEl.scrollTop = 0;
  }

  function showError(msg) {
    resultsEl.innerHTML = '<div class="res-msg err">✕ ' + esc(msg) + "</div>";
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ---------- editor helpers ----------
  function setQuery(sql, run) {
    editor.value = sql;
    if (run !== false) runQuery();
    editor.focus();
  }
  function insertAtCursor(text) {
    var s = editor.selectionStart, e = editor.selectionEnd, v = editor.value;
    // add a leading space if needed so tokens don't run together
    var before = v.slice(0, s);
    var needSpace = before.length && !/\s$/.test(before) && !/[(,.]$/.test(before);
    var ins = (needSpace ? " " : "") + text;
    editor.value = before + ins + v.slice(e);
    var pos = s + ins.length;
    editor.setSelectionRange(pos, pos);
    editor.focus();
  }

  document.getElementById("run-btn").addEventListener("click", runQuery);
  document.getElementById("clear-btn").addEventListener("click", function () {
    editor.value = ""; editor.focus();
    resultsEl.innerHTML = '<div class="res-msg empty">Editor cleared.</div>';
  });
  editor.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runQuery(); }
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
    b.className = "chip"; b.textContent = c.label;
    b.addEventListener("click", function () { setQuery(c.sql); });
    chipsEl.appendChild(b);
  });

  // ---------- schema explorer ----------
  var META = window.SQL_LAB_SCHEMA || [];
  var tEl = document.getElementById("schema-tables");
  META.forEach(function (t) {
    var wrap = document.createElement("div");
    wrap.className = "tbl";

    var row = document.createElement("button");
    row.className = "tbl-row";
    row.innerHTML = '<span class="car">▶</span><span class="nm">' + t.name + '</span><span class="ct">' + t.rows + "</span>";
    row.addEventListener("click", function (e) {
      // toggle open on the caret area, but also load a peek query
      wrap.classList.toggle("open");
      setQuery("SELECT * FROM " + t.name + " LIMIT 20;");
    });
    wrap.appendChild(row);

    var cols = document.createElement("div");
    cols.className = "cols";
    t.cols.forEach(function (cn) {
      var cb = document.createElement("button");
      cb.className = "col";
      cb.innerHTML = '<span class="dot"></span>' + cn;
      cb.addEventListener("click", function (ev) {
        ev.stopPropagation();
        insertAtCursor(cn);
      });
      cols.appendChild(cb);
    });
    wrap.appendChild(cols);
    tEl.appendChild(wrap);
  });

  // ---------- interactive funnel ----------
  var FUNNEL = [
    { kw: "SELECT", sub: "columns (AS aliases)", color: "#5f8c45",
      desc: "Choose which columns come back, and rename them. This is the only clause that's required in every query.",
      ex: "<span class='kw'>SELECT</span> title, rating, length\n<span class='kw'>FROM</span> film;",
      sql: "SELECT title, rating, length\nFROM film;" },
    { kw: "FROM", sub: "the source table", color: "#3f7d74",
      desc: "Names the table the rows are drawn from. The engine actually resolves this before SELECT — it needs to know the table before it can find your columns.",
      ex: "<span class='kw'>SELECT</span> *\n<span class='kw'>FROM</span> actor;",
      sql: "SELECT *\nFROM actor;" },
    { kw: "WHERE", sub: "row filter", color: "#3a6ea5",
      desc: "Keeps only the rows that pass a condition. It runs before any grouping, so it can't see aggregates like COUNT — that's what HAVING is for.",
      ex: "<span class='kw'>SELECT</span> title, rating\n<span class='kw'>FROM</span> film\n<span class='kw'>WHERE</span> rating = 'PG';",
      sql: "SELECT title, rating\nFROM film\nWHERE rating = 'PG';" },
    { kw: "GROUP BY", sub: "collapse into groups", color: "#6a54a3",
      desc: "Folds many rows into one per group, so aggregates can summarise each group. Here: one row per rating, with a count.",
      ex: "<span class='kw'>SELECT</span> rating, <span class='kw'>COUNT</span>(*) <span class='kw'>AS</span> films\n<span class='kw'>FROM</span> film\n<span class='kw'>GROUP BY</span> rating;",
      sql: "SELECT rating, COUNT(*) AS films\nFROM film\nGROUP BY rating;" },
    { kw: "HAVING", sub: "filter the groups", color: "#a8447a",
      desc: "Like WHERE, but it filters groups after aggregation — so it can test a COUNT or SUM. Keep only ratings with more than two films.",
      ex: "<span class='kw'>SELECT</span> rating, <span class='kw'>COUNT</span>(*) <span class='kw'>AS</span> films\n<span class='kw'>FROM</span> film\n<span class='kw'>GROUP BY</span> rating\n<span class='kw'>HAVING</span> <span class='kw'>COUNT</span>(*) > 2;",
      sql: "SELECT rating, COUNT(*) AS films\nFROM film\nGROUP BY rating\nHAVING COUNT(*) > 2;" },
    { kw: "ORDER BY", sub: "sort the result", color: "#c07a2c",
      desc: "Arranges the final rows. Sorting happens late — after filtering and grouping — so you can order by an aggregate or an alias.",
      ex: "<span class='kw'>SELECT</span> title, length\n<span class='kw'>FROM</span> film\n<span class='kw'>ORDER BY</span> length <span class='kw'>DESC</span>;",
      sql: "SELECT title, length\nFROM film\nORDER BY length DESC;" },
    { kw: "LIMIT", sub: "cap the rows", color: "#5e7081",
      desc: "Returns only the first n rows. Applied dead last, so it caps whatever the clauses above produced — perfect for top-N questions.",
      ex: "<span class='kw'>SELECT</span> title\n<span class='kw'>FROM</span> film\n<span class='kw'>ORDER BY</span> title\n<span class='kw'>LIMIT</span> 5;",
      sql: "SELECT title\nFROM film\nORDER BY title\nLIMIT 5;" }
  ];
  var funnelEl = document.getElementById("funnel");
  var asideEl = document.getElementById("funnel-aside");

  function selectRung(i) {
    var f = FUNNEL[i];
    Array.prototype.forEach.call(funnelEl.children, function (c, j) { c.classList.toggle("active", j === i); });
    asideEl.innerHTML =
      '<div class="fk">Clause ' + (i + 1) + " of 7</div>" +
      "<h3>" + f.kw + "</h3>" +
      "<p>" + f.desc + "</p>" +
      '<div class="ex">' + f.ex + "</div>" +
      '<div class="load"><button class="btn run" id="funnel-run">Run this in the Lab ↑</button></div>';
    document.getElementById("funnel-run").addEventListener("click", function () {
      setQuery(f.sql);
      document.querySelector(".lab").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  FUNNEL.forEach(function (f, i) {
    var b = document.createElement("button");
    b.className = "frung";
    b.style.background = f.color;
    b.innerHTML = '<span><span class="kw">' + f.kw + '</span> <span class="sub">' + f.sub + "</span></span>" +
                  '<span class="pin">tap →</span>';
    b.addEventListener("click", function () { selectRung(i); });
    funnelEl.appendChild(b);
  });
  selectRung(0);

  // ---------- modules + progress ----------
  var MODULES = [
    { t: "Retrieving Data", n: 11 },
    { t: "Filtering & Sorting", n: 15 },
    { t: "Aggregating Data", n: 14 },
    { t: "JOINs", n: 13 },
    { t: "Advanced SQL", n: 16 },
    { t: "Creating & Modifying Tables", n: 14 },
    { t: "Conditional Expressions & Views", n: 11 },
    { t: "Importing & Exporting Data", n: 8 },
    { t: "PostgreSQL with Python", n: 9 },
    { t: "Capstone — Tiffinly", n: 9 }
  ];
  var doneByModule = {};
  try {
    var prog = JSON.parse(localStorage.getItem("commonplace_module_exercises_progress") || "{}");
    Object.keys(prog).forEach(function (k) {
      if (prog[k] !== "done") return;
      var m = k.match(/^ex_(\d+)_/);
      if (m) { var mi = +m[1]; doneByModule[mi] = (doneByModule[mi] || 0) + 1; }
    });
  } catch (e) {}

  var modsEl = document.getElementById("mods");
  var totalDone = 0, totalAll = 0;
  MODULES.forEach(function (mod, idx) {
    var mi = idx + 1;
    var done = doneByModule[mi] || 0;
    var pct = mod.n ? Math.round(done / mod.n * 100) : 0;
    totalDone += done; totalAll += mod.n;
    var a = document.createElement("a");
    a.className = "mod" + (done > 0 ? " done-some" : "");
    a.href = "module-" + String(mi).padStart(2, "0") + ".html";
    a.innerHTML =
      '<span class="num">' + String(mi).padStart(2, "0") + "</span>" +
      '<span class="body"><span class="t">' + mod.t + "</span>" +
      '<span class="meta">' + mod.n + " challenges</span></span>" +
      '<span class="prog"><span class="bar"><span class="fill" style="width:' + pct + '%"></span></span>' +
      '<span class="pct">' + done + "/" + mod.n + "</span></span>";
    modsEl.appendChild(a);
  });
  document.getElementById("overall-prog").textContent = totalDone + " / " + totalAll + " done";

})();
