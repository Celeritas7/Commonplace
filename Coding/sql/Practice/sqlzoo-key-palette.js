// sqlzoo-key-palette.js — v3 "smart keys": a predictive, grammar-driven key palette.
// Same API as v2 — sqlzoo-lab.js calls window.SQLZOO_KEYS.build(e.ds, ta).
//
// Smart mode reads the SQL before the caret, works out where you are in the
// statement (clause + last token), and shows only what can logically come next:
//   NEXT  — the most likely tokens right now (e.g. column names after SELECT)
//   THEN  — the clause-ending keyword waiting in the wings (e.g. FROM while you list columns)
//   bar   — ⌫ (delete last token), ↵, and a digit pad when a number is expected
// "All" switches back to the full v2 palette. Choice is remembered per device (localStorage "zk-mode").
// No focus() is needed for any of this: sql-kb-fix.js keeps the keyboard down on chip taps.
(function () {
  "use strict";

  var KW = ["SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT",
            "DISTINCT", "AS", "JOIN", "ON", "AND", "OR", "LIKE", "IN", "DESC"];
  var FN = ["COUNT(", "SUM(", "AVG(", "MIN(", "MAX("];
  var PUNCT = [";", ",", ".", "(", ")", "*", "=", ">", "<", ">=", "<=", "<>", "''", "%"];

  var TABLES = {
    world: [{ t: "world", cols: ["name", "continent", "area", "population", "gdp", "capital"] }],
    nobel: [{ t: "nobel", cols: ["yr", "subject", "winner"] }],
    football: [
      { t: "game",  cols: ["id", "mdate", "stadium", "team1", "team2"] },
      { t: "goal",  cols: ["matchid", "teamid", "player", "gtime"] },
      { t: "eteam", cols: ["id", "teamname", "coach"] }
    ]
  };
  // numeric columns → offer > < BETWEEN and the digit pad instead of quotes
  var NUMERIC = { "world.area": 1, "world.population": 1, "world.gdp": 1, "nobel.yr": 1,
                  "game.id": 1, "goal.matchid": 1, "goal.gtime": 1 };
  // known join keys → one-tap ON conditions
  var JOINS = {
    football: [["game", "id", "goal", "matchid"], ["eteam", "id", "goal", "teamid"],
               ["eteam", "id", "game", "team1"], ["eteam", "id", "game", "team2"]]
  };

  var DS_COLOR = { world: "#2f7d57", nobel: "#7a4ea0", football: "#b06a1f" };
  var CAP_KW = { fill: "#e5e0f2", line: "#cdc3dd" };
  var CAP_FN = { fill: "#d9e9d1", line: "#bdd3b2" };
  var CAP_PUNCT = { fill: "#fbf8ef", line: "#ddd2bb" };
  var TEAL = "#2f6b5e", TEAL_DEEP = "#1d453c";
  var MONO = "font-family:'JetBrains Mono',monospace;";
  var LABEL = MONO + "font-size:10px;font-weight:700;letter-spacing:2px;color:#8a7c63;";

  // ---------- insertion (space-aware, cursor-aware) ----------
  // kinds: kw (space both sides) · fn/id (space before) · op (space both) · p (raw) ·
  //        pair ('' caret inside) · digit (space unless glued to a number) · raw (no spaces)
  function insertKey(ta, text, kind, opt) {
    opt = opt || {};
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    if (opt.replace) s = Math.max(0, s - opt.replace);
    var before = v.slice(0, s);
    var ins = text;
    if (kind === "digit") {
      if (before && !/[\s(\d.]$/.test(before)) ins = " " + ins;
    } else if (kind !== "p" && kind !== "pair" && kind !== "raw") {
      if (before && !/[\s(.,']$/.test(before)) ins = " " + ins;
      if (kind === "kw" || kind === "op") ins += " ";
    } else if (kind === "pair" && before && !/[\s(%]$/.test(before)) ins = " " + ins;
    ta.value = before + ins + v.slice(e);
    var pos = s + ins.length - (opt.back != null ? opt.back : (kind === "pair" ? 1 : 0));
    ta.setSelectionRange(pos, pos);
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true })); // keeps progress autosave working
  }

  // ⌫ — deletes the selection, or the last whole token before the caret
  function backToken(ta) {
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    if (s === e) {
      var before = v.slice(0, s).replace(/[ \t]+$/, "");
      var m = before.match(/((GROUP|ORDER)\s+BY|NOT\s+(LIKE|NULL)|IS\s+NOT|'[^']*'?|[A-Za-z_]\w*(\.\w*)?\(?|\d+(\.\d*)?|>=|<=|<>|!=|\n|[^\s])$/i);
      s = m ? before.length - m[0].length : before.length;
      if (s === e) return;   // nothing before the caret
    }
    ta.value = v.slice(0, s) + v.slice(e);
    ta.setSelectionRange(s, s);
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // ---------- lexer + walker ----------
  var CLAUSE = { "SELECT": 1, "FROM": 1, "WHERE": 1, "GROUP BY": 1, "HAVING": 1, "ORDER BY": 1, "LIMIT": 1, "JOIN": 1, "ON": 1 };
  var FNS = { COUNT: 1, SUM: 1, AVG: 1, MIN: 1, MAX: 1, ROUND: 1, LENGTH: 1, LEFT: 0, CONCAT: 1 };
  var WORDS = { SELECT: 1, FROM: 1, WHERE: 1, HAVING: 1, LIMIT: 1, DISTINCT: 1, AS: 1, JOIN: 1, ON: 1, AND: 1,
                OR: 1, NOT: 1, LIKE: 1, IN: 1, IS: 1, NULL: 1, BETWEEN: 1, DESC: 1, ASC: 1, INNER: 1, LEFT: 1, RIGHT: 1 };
  var CMP = { "=": 1, ">": 1, "<": 1, ">=": 1, "<=": 1, "<>": 1, "!=": 1, "LIKE": 1, "NOT LIKE": 1 };

  function lex(src) {
    var out = [], re = /--[^\n]*|'(?:[^']|'')*'?|>=|<=|<>|!=|[A-Za-z_]\w*(?:\.\w*)?|\d+(?:\.\d*)?|\S/g, m;
    while ((m = re.exec(src))) {
      if (m[0].slice(0, 2) === "--") continue;
      var t = m[0], u = t.toUpperCase(), last = out[out.length - 1];
      if (last && u === "BY" && (last.u === "GROUP" || last.u === "ORDER")) { last.u += " BY"; last.t += " BY"; continue; }
      if (last && u === "JOIN" && /^(INNER|LEFT|RIGHT|FULL|OUTER)$/.test(last.u)) { last.u = "JOIN"; last.t += " JOIN"; continue; }
      if (last && (u === "NULL" || u === "LIKE") && last.u === "NOT" ) { last.u = "NOT " + u; last.t += " " + t; continue; }
      if (last && u === "NOT" && last.u === "IS") { last.u = "IS NOT"; last.t += " NOT"; continue; }
      out.push({ t: t, u: u });
    }
    return out;
  }

  function schema(ds) {
    var tabs = TABLES[ds] || [], byT = {}, owners = {};
    tabs.forEach(function (tb) {
      byT[tb.t.toLowerCase()] = tb;
      tb.cols.forEach(function (c) { (owners[c.toLowerCase()] = owners[c.toLowerCase()] || []).push(tb.t); });
    });
    return { tabs: tabs, byT: byT, owners: owners };
  }

  function walk(toks, sc) {
    var st = { clause: null, frames: [], tables: [], alias: {}, sel: [], plain: [], agg: false,
               prev: null, prev2: null, opCol: null, between: false, betweenAnd: false };
    toks.forEach(function (k) {
      var u = k.u, lo = k.t.toLowerCase(), pu = st.prev ? st.prev.u : "";
      k.betweenAnd = false;
      if (u === "(") { st.frames.push({ clause: st.clause, opener: pu }); st.clause = "("; }
      else if (u === ")") { var f = st.frames.pop(); st.clause = f ? f.clause : st.clause; }
      else if (u === ";") { st.clause = null; st.frames = []; }
      else if (CLAUSE[u]) { st.clause = u; st.between = false; }
      else if (u === "BETWEEN") st.between = true;
      else if (u === "AND" && st.between) { st.between = false; k.betweenAnd = true; }
      else if (/^[a-z_]/i.test(k.t) && !WORDS[u] && !FNS[u]) {
        var tb = sc.byT[lo];
        if (tb && (pu === "FROM" || pu === "JOIN" || (pu === "," && st.clause === "FROM"))) {
          if (st.tables.indexOf(tb.t) < 0) st.tables.push(tb.t);
          k.kind = "table";
        } else if (st.prev && st.prev.kind === "table" && pu !== "," ) {
          st.alias[lo] = st.prev.t.toLowerCase(); k.kind = "alias";   // FROM world w
        } else if (st.prev && pu === "AS" && st.prev2 && st.prev2.kind === "table") {
          st.alias[lo] = st.prev2.t.toLowerCase(); k.kind = "alias";
        } else {
          var c = lo.indexOf(".") > 0 ? lo.split(".")[1] : lo;
          if (sc.owners[c]) {
            k.kind = "col";
            if (st.clause === "SELECT") { st.sel.push(c); if (!st.frames.length || st.frames[st.frames.length - 1].clause !== "SELECT") st.plain.push(c); }
          } else k.kind = "id";
        }
      }
      if (FNS[u] && st.clause === "SELECT") st.agg = true;
      if (CMP[u]) st.opCol = st.prev;
      st.prev2 = st.prev; st.prev = k;
    });
    st.betweenAnd = !!(st.prev && st.prev.betweenAnd);
    return st;
  }

  // ---------- prediction ----------
  function kw(l) { return { l: l, k: "kw" }; }
  function op(l) { return { l: l, k: "op" }; }
  function pu(l) { return { l: l, k: "p" }; }
  function fn(l, comma) { return { l: l, k: "fn", comma: comma }; }

  function predict(before, full, ds) {
    var sc = schema(ds);
    var r = { now: [], then: [], pad: false, hint: "", replace: 0 };

    // "w." → that table's (or alias's) columns
    var dot = before.match(/([A-Za-z_]\w*)\.(\w*)$/);
    var partial = "";
    if (dot) {
      var fs0 = walk(lex(stmtOf(full, before.length)), sc);
      var tn = sc.byT[dot[1].toLowerCase()] ? dot[1].toLowerCase() : fs0.alias[dot[1].toLowerCase()];
      if (tn && sc.byT[tn] && sc.byT[tn].cols.indexOf(dot[2].toLowerCase()) < 0) {
        r.now = sc.byT[tn].cols.filter(function (c) { return c.indexOf(dot[2].toLowerCase()) === 0; })
          .map(function (c) { return { l: c, k: "raw" }; });
        r.replace = dot[2].length; r.hint = tn + " columns";
        return r;
      }
    }
    // a half-typed word → complete it
    var pw = before.match(/[A-Za-z_]\w*$/);
    if (pw) {
      var w = pw[0], lw = w.toLowerCase(), uw = w.toUpperCase();
      var known = WORDS[uw] || FNS[uw] || sc.byT[lw] || sc.owners[lw] || uw === "GROUP" || uw === "ORDER";
      var aliasSpot = /\bAS\s+$/i.test(before.slice(0, -w.length));
      // a keyword that is also the start of a longer one (OR→ORDER BY, AS→ASC, NOT→NOT LIKE) stays completable
      var ambiguous = WORDS[uw] && KW.concat(["ASC", "NOT LIKE", "IS NOT", "NOT NULL"]).some(function (k) { return k.indexOf(uw) === 0 && k.length > uw.length; });
      if (!aliasSpot && (!known || uw === "GROUP" || uw === "ORDER" || ambiguous)) { partial = w; before = before.slice(0, -w.length); }
    }

    var stmt = before.slice(before.lastIndexOf(";") + 1);
    if (/'/.test(stmt) && (stmt.match(/'/g).length % 2 === 1)) {       // inside '…'
      r.now = [{ l: "close '", k: "close" }, pu("%")];
      r.hint = "typing a value";
      return r;
    }
    var toks = lex(stmt);
    var st = walk(toks, sc);
    var fst = walk(lex(stmtOf(full, before.length)), sc);               // whole statement → table scope
    var scope = fst.tables.length ? fst.tables : sc.tabs.map(function (t) { return t.t; });
    var p = st.prev, U = p ? p.u : "", K = p ? p.kind : "";

    function colsOf(tabs, opts) {
      opts = opts || {};
      var seen = {}, out = [], multi = tabs.length > 1;
      tabs.forEach(function (t) {
        (sc.byT[t.toLowerCase()] || { cols: [] }).cols.forEach(function (c) {
          var amb = multi && sc.owners[c].filter(function (o) { return tabs.indexOf(o) >= 0; }).length > 1;
          var l = (amb || opts.qualify) ? t + "." + c : c;
          if (seen[l] || (opts.skip && opts.skip.indexOf(c) >= 0)) return;
          seen[l] = 1; out.push({ l: l, k: "id", comma: opts.comma });
        });
      });
      if (opts.first) out.sort(function (a, b) {
        return (opts.first.indexOf(b.l.split(".").pop()) >= 0) - (opts.first.indexOf(a.l.split(".").pop()) >= 0);
      });
      return out;
    }
    function isNum(tok) {
      if (!tok) return false;
      if (tok.u === ")") return true;   // COUNT(…) etc.
      var lo = tok.t.toLowerCase(), c = lo.split(".").pop(), t = lo.indexOf(".") > 0 ? lo.split(".")[0] : null;
      if (t && st.alias[t]) t = st.alias[t];
      var owners = t ? [t] : (sc.owners[c] || []).filter(function (o) { return scope.indexOf(o) >= 0; });
      return owners.some(function (o) { return NUMERIC[o + "." + c]; }) || /^(COUNT|SUM|AVG|MIN|MAX)$/.test(tok.u);
    }
    var missing = st.sel.filter(function (c) {
      return !(sc.owners[c] || []).some(function (o) { return fst.tables.indexOf(o) >= 0; });
    });
    var needGroup = fst.agg && fst.plain.length > 0 && !/GROUP\s+BY/i.test(stmtOf(full, before.length));
    function ranked(list) {   // tables owning the chosen columns first
      return list.slice().sort(function (a, b) {
        function score(t) { return st.sel.filter(function (c) { return (sc.owners[c] || []).indexOf(t) >= 0; }).length; }
        return score(b) - score(a);
      }).map(function (t) { return { l: t, k: "table" }; });
    }
    var fnAll = FN.map(function (f) { return fn(f); });
    var tail = { WHERE: [needGroup ? kw("GROUP BY") : null, kw("ORDER BY"), kw("LIMIT"), pu(";")],
                 HAVING: [kw("ORDER BY"), pu(";")] };

    var frame = st.frames[st.frames.length - 1];
    var cond = st.clause === "WHERE" || st.clause === "HAVING" || (st.clause === "(" && frame && !FNS[frame.opener] && frame.opener !== "IN");

    if (!p) { r.now = [kw("SELECT")]; r.hint = "every query here starts with SELECT"; }
    else if (U === ";") { r.now = [kw("SELECT")]; }
    else if (st.clause === "(" && frame && FNS[frame.opener]) {                 // COUNT( … )
      if (U === "(") r.now = (frame.opener === "COUNT" ? [pu("*")] : []).concat(colsOf(scope), [kw("DISTINCT")]);
      else if (U === "DISTINCT") r.now = colsOf(scope);
      else r.now = [pu(")")];
    }
    else if (st.clause === "(" && frame && frame.opener === "IN") {             // IN ( … )
      if (U === "(") { r.now = [{ l: "''", k: "pair" }, kw("SELECT")]; r.pad = true; }
      else if (U === ",") { r.now = [{ l: "''", k: "pair" }]; r.pad = true; }
      else { r.now = [pu(","), pu(")")]; r.pad = /^\d/.test(p.t); }
    }
    else if (st.clause === "SELECT") {
      if (U === "SELECT") r.now = colsOf(scope).concat([pu("*"), kw("DISTINCT")], fnAll);
      else if (U === "DISTINCT") r.now = colsOf(scope);
      else if (U === "*" && st.prev2 && st.prev2.u === "SELECT") r.now = [kw("FROM")];
      else if (U === "," || /^[+\-*\/]$/.test(U)) r.now = colsOf(scope, { skip: st.sel }).concat(fnAll);
      else if (U === "AS") { r.hint = "type a name ⌨"; r.then = [pu(","), kw("FROM")]; }
      else {
        r.now = colsOf(scope, { skip: st.sel, comma: true }).concat([kw("AS")], FN.map(function (f) { return fn(f, true); }));
        r.then = [kw("FROM")];
      }
    }
    else if (st.clause === "FROM" || st.clause === "JOIN") {
      var unused = sc.tabs.map(function (t) { return t.t; }).filter(function (t) { return fst.tables.indexOf(t) < 0 || st.clause === "FROM" && U === "FROM"; });
      if (U === "FROM" || U === ",") r.now = ranked(U === "FROM" ? sc.tabs.map(function (t) { return t.t; }) : unused);
      else if (U === "JOIN") r.now = ranked(unused);
      else if (st.clause === "JOIN") { r.now = [kw("ON")]; }
      else {
        var canJoin = sc.tabs.length > fst.tables.length;
        var L = [];
        if (missing.length && canJoin) L.push(kw("JOIN"));
        if (needGroup) L.push(kw("GROUP BY"));
        L.push(kw("WHERE"));
        if (canJoin && !missing.length) L.push(kw("JOIN"));
        L.push(kw("ORDER BY"));
        if (fst.agg && !needGroup) L.push(kw("GROUP BY"));
        L.push(kw("LIMIT"));
        r.now = L; r.then = [pu(";")];
      }
    }
    else if (st.clause === "ON") {
      if (U === "ON" || U === "AND") {
        var hints = (JOINS[ds] || []).filter(function (j) { return st.tables.indexOf(j[0]) >= 0 && st.tables.indexOf(j[2]) >= 0; })
          .map(function (j) { return { l: j[0] + "." + j[1] + " = " + j[2] + "." + j[3], k: "id", strong: true }; });
        r.now = hints.concat(colsOf(st.tables, { qualify: true }));
      }
      else if (CMP[U]) r.now = colsOf(st.tables, { qualify: true });
      else if (K === "col" && !(st.prev2 && CMP[st.prev2.u])) r.now = [op("=")];
      else {
        r.now = [];
        if (sc.tabs.length > fst.tables.length) r.now.push(kw("JOIN"));
        if (needGroup) r.now.push(kw("GROUP BY"));
        r.now.push(kw("WHERE"), kw("ORDER BY"), kw("AND"));
        r.then = [pu(";")];
      }
    }
    else if (cond) {
      var tailL = (tail[st.clause] || tail.WHERE).filter(Boolean);
      var inParen = st.clause === "(";
      if (st.betweenAnd || U === "BETWEEN") { r.pad = true; r.hint = "type the number below"; }
      else if (U === "WHERE" || U === "AND" || U === "OR" || U === "NOT" || U === "(" || U === "HAVING") {
        r.now = st.clause === "HAVING" ? fnAll.concat(colsOf(scope)) : colsOf(scope).concat([kw("NOT"), pu("(")]);
      }
      else if (U === "LIKE" || U === "NOT LIKE") {
        r.now = [{ l: "'…%'", ins: "'%'", k: "pair", back: 2 }, { l: "'%…%'", ins: "'%%'", k: "pair", back: 2 },
                 { l: "'%…'", ins: "'%'", k: "pair", back: 1 }, { l: "''", k: "pair" }];
      }
      else if (U === "IN") r.now = [pu("(")];
      else if (U === "IS") r.now = [kw("NULL"), kw("NOT NULL")];
      else if (CMP[U]) {
        if (isNum(st.opCol)) { r.pad = true; r.now = [pu("(")]; r.hint = "number"; }
        else r.now = [{ l: "''", k: "pair" }, pu("(")];
      }
      else if (K === "col" || (U === ")" && st.clause === "HAVING")) {
        r.now = (isNum(p) ? [op(">"), op("<"), op("="), op(">="), op("<="), op("<>"), kw("BETWEEN"), kw("IN")]
                          : [op("="), kw("LIKE"), kw("IN"), op("<>"), kw("IS"), kw("NOT LIKE")]);
      }
      else if (st.between && /^\d/.test(p.t)) { r.now = [kw("AND")]; r.pad = true; }
      else {
        r.now = [kw("AND"), kw("OR")].concat(inParen ? [pu(")")] : []);
        r.then = inParen ? [] : tailL;
        r.pad = /^\d/.test(p.t);
      }
    }
    else if (st.clause === "GROUP BY") {
      if (U === "GROUP BY") r.now = colsOf(scope, { first: fst.plain });
      else if (U === ",") r.now = colsOf(scope, { first: fst.plain });
      else { r.now = colsOf(scope, { comma: true, first: fst.plain }); r.then = [kw("HAVING"), kw("ORDER BY"), pu(";")]; }
    }
    else if (st.clause === "ORDER BY") {
      if (U === "ORDER BY" || U === ",") r.now = colsOf(scope, { first: fst.sel });
      else if (U === "DESC" || U === "ASC") { r.now = colsOf(scope, { comma: true }); r.then = [kw("LIMIT"), pu(";")]; }
      else { r.now = [kw("DESC"), kw("ASC")].concat(colsOf(scope, { comma: true, skip: [p.t.toLowerCase().split(".").pop()] })); r.then = [kw("LIMIT"), pu(";")]; }
    }
    else if (st.clause === "LIMIT") {
      r.pad = true;
      if (/^\d/.test(U)) r.then = [pu(";")]; else r.hint = "how many rows?";
    }
    else r.now = KW.map(kw);

    if (partial) {
      var lp = partial.toLowerCase();
      var match = function (c) { var s = (c.l || "").toLowerCase(); return s.indexOf(lp) === 0 || s.split(".").pop().indexOf(lp) === 0; };
      var pool = r.now.concat(r.then), pick = pool.filter(match);
      if (!pick.length) pick = KW.map(kw).concat(fnAll, colsOf(scope), sc.tabs.map(function (t) { return { l: t.t, k: "table" }; })).filter(match);
      if (pick.length) {
        r.now = pick.map(function (c) { var o = {}; for (var q in c) o[q] = c[q]; o.comma = false; return o; });
        r.then = []; r.replace = partial.length; r.hint = "";
      }
    }
    return r;
  }

  function stmtOf(full, caret) {
    var a = full.lastIndexOf(";", caret - 1), b = full.indexOf(";", caret);
    return full.slice(a + 1, b < 0 ? full.length : b);
  }

  // ---------- keycaps ----------
  function keycap(label, bg, onClick, square) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText =
      MONO + "font-size:13px;font-weight:600;color:#211b13;" +
      "background:" + bg.fill + ";border:1px solid " + bg.line + ";border-radius:10px;height:38px;padding:0 13px;" +
      "cursor:pointer;flex:0 0 auto;white-space:nowrap;" +
      (square ? "min-width:38px;display:inline-flex;align-items:center;justify-content:center;padding:0 11px;" : "");
    function up() { b.style.transform = "none"; }
    b.addEventListener("pointerdown", function () { b.style.transform = "translateY(1px)"; });
    b.addEventListener("pointerup", up);
    b.addEventListener("pointerleave", up);
    b.addEventListener("click", onClick);
    return b;
  }

  function colPill(label, onClick, comma) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "zk-col";
    b.innerHTML = (comma ? '<span style="color:#b3a585;margin-right:3px;">,</span>' : "") + esc(label);
    b.style.cssText =
      MONO + "font-size:13px;font-weight:400;color:#56503f;" +
      "background:#fbf8ef;border:1px solid #ddd2bb;border-radius:17px;height:34px;padding:0 14px;" +
      "cursor:pointer;flex:0 0 auto;white-space:nowrap;";
    b.addEventListener("click", onClick);
    return b;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function el(tag, css, html) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // table chip + attached ⤢ schema button (shared by both modes)
  function tableChip(tb, ta, ds, isOpen, onTap, count) {
    var pair = el("span", "display:inline-flex;flex:0 0 auto;margin-right:2px;");
    var chip = el("button",
      "display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px;" + MONO + "font-size:13px;font-weight:700;" +
      "color:" + (isOpen ? "#fff" : TEAL_DEEP) + ";background:" + (isOpen ? TEAL : "#e2ebe6") + ";" +
      "border:1px solid " + (isOpen ? TEAL : "#b6cdc3") + ";border-radius:10px 0 0 10px;cursor:pointer;white-space:nowrap;",
      '<span style="font-size:12px;opacity:.8;">\u25A6</span> ' + tb.t +
      (count ? ' <span style="font-size:11px;font-weight:400;opacity:.7;">' + tb.cols.length + " cols</span>" : ""));
    chip.type = "button";
    chip.className = "zk-table";
    chip.setAttribute("data-table", tb.t);
    chip.addEventListener("click", onTap);
    var mag = el("button",
      "display:inline-flex;align-items:center;justify-content:center;height:38px;width:34px;font-size:13px;" +
      "color:" + TEAL_DEEP + ";background:#cfded7;border:1px solid #b6cdc3;border-left:0;" +
      "border-radius:0 10px 10px 0;cursor:pointer;", "\u2922");
    mag.type = "button";
    mag.className = "zk-schema";
    mag.setAttribute("data-table", tb.t);
    mag.title = "Schema & first rows";
    mag.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (window.SQLZOO_SCHEMA && window.SQLZOO_SCHEMA.open) window.SQLZOO_SCHEMA.open(tb.t, ta, ds);
    });
    pair.appendChild(chip); pair.appendChild(mag);
    return pair;
  }

  function getMode() { try { return localStorage.getItem("zk-mode") || "smart"; } catch (e) { return "smart"; } }
  function setMode(m) { try { localStorage.setItem("zk-mode", m); } catch (e) {} }

  // ---------- palette ----------
  function build(ds, ta) {
    var host = el("div", "margin:0 0 12px;");
    host.className = "zk-host";
    var state = { open: true, mode: getMode(), openTable: (TABLES[ds] && TABLES[ds][0]) ? TABLES[ds][0].t : null };
    var raf = 0, lastKey = "";
    // re-render only when the prediction actually changes — keeps row scroll positions and saves DOM churn
    function schedule() {
      if (state.mode !== "smart" || !state.open) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var caret = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
        var key = JSON.stringify(predict(ta.value.slice(0, caret), ta.value, ds));
        if (key !== lastKey) render();
      });
    }
    ["input", "click", "keyup", "select"].forEach(function (ev) { ta.addEventListener(ev, schedule); });
    function onSel() {
      if (!ta.isConnected) { document.removeEventListener("selectionchange", onSel); return; }
      if (document.activeElement === ta) schedule();
    }
    document.addEventListener("selectionchange", onSel);
    render();
    return host;

    function render() {
      lastKey = "";
      host.innerHTML = "";
      var card = el("div", "background:#faf6ec;border:1px solid #cdbfa3;border-radius:10px;padding:" +
        (state.open ? "10px 12px 12px" : "6px 8px 6px 12px") + ";");
      host.appendChild(card);

      var head = el("div", "display:flex;align-items:center;gap:8px;");
      head.appendChild(el("span", LABEL, state.open ? "KEY PALETTE" : "KEYS HIDDEN"));
      head.appendChild(el("span", "flex:1;"));
      if (state.open) {
        var seg = el("span", "display:inline-flex;border:1px solid #ddd2bb;border-radius:10px;overflow:hidden;flex:0 0 auto;");
        [["smart", "Smart"], ["all", "All"]].forEach(function (m) {
          var on = state.mode === m[0];
          var b = el("button", MONO + "font-size:12px;font-weight:600;height:32px;padding:0 12px;border:0;cursor:pointer;" +
            "background:" + (on ? "#211b13" : "#fbf8ef") + ";color:" + (on ? "#faf6ec" : "#56503f") + ";", m[1]);
          b.type = "button";
          b.addEventListener("click", function () { state.mode = m[0]; setMode(m[0]); render(); });
          seg.appendChild(b);
        });
        head.appendChild(seg);
      }
      head.appendChild(keycap(state.open ? "Hide \u2303" : "Show keys \u2304", CAP_PUNCT, function () {
        state.open = !state.open; render();
      }));
      card.appendChild(head);
      if (!state.open) return;
      if (state.mode === "smart") renderSmart(card); else renderAll(card);
    }

    function row(card, css) {
      var r = el("div", "display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;" +
        "-webkit-overflow-scrolling:touch;scrollbar-width:none;margin-top:8px;padding-bottom:2px;" +
        "align-items:center;min-height:40px;" + (css || ""));
      r.className = "zk-row";
      card.appendChild(r);
      return r;
    }
    function laneLabel(r, text) {
      r.appendChild(el("span", LABEL + "flex:0 0 44px;", text));
    }

    function chipFor(c, replace) {
      var opt = { replace: replace, back: c.back };
      function go(text, kind) { return function () { insertKey(ta, text, kind, opt); }; }
      if (c.k === "table") {
        var tb = null; (TABLES[ds] || []).forEach(function (t) { if (t.t === c.l) tb = t; });
        if (tb) return tableChip(tb, ta, ds, false, go(tb.t, "id"), false);
      }
      if (c.k === "close") return keycap(c.l, CAP_PUNCT, function () {
        var s = ta.selectionStart;
        if (ta.value.charAt(s) === "'") { ta.setSelectionRange(s + 1, s + 1); ta.dispatchEvent(new Event("input", { bubbles: true })); }
        else insertKey(ta, "'", "p");
      });
      if (c.comma) {
        return (c.k === "fn" ? keycap(", " + c.l, CAP_FN, cm) : colPill(c.l, cm, true));
      }
      function cm() { insertKey(ta, ",", "p", opt); insertKey(ta, c.l, c.k); }
      if (c.k === "id" && !c.strong) return colPill(c.l, go(c.l, "id"));
      if (c.k === "raw") return colPill(c.l, go(c.l, "raw"));
      if (c.k === "id") return keycap(c.l, { fill: "#e2ebe6", line: "#b6cdc3" }, go(c.l, "id"));
      var cap = c.k === "kw" ? CAP_KW : c.k === "fn" ? CAP_FN : CAP_PUNCT;
      return keycap(c.l, cap, go(c.ins || c.l, c.k), c.k === "p" || c.k === "op" || c.k === "pair");
    }

    function renderSmart(card) {
      var caret = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
      var r = predict(ta.value.slice(0, caret), ta.value, ds);
      lastKey = JSON.stringify(r);

      var nr = row(card);
      laneLabel(nr, "NEXT");
      r.now.forEach(function (c) { nr.appendChild(chipFor(c, r.replace)); });
      if (r.hint) nr.appendChild(el("span", MONO + "font-size:12px;font-style:italic;color:#8a7c63;flex:0 0 auto;white-space:nowrap;", esc(r.hint)));

      var tr = row(card, "opacity:" + (r.then.length ? 1 : .45) + ";");
      laneLabel(tr, "THEN");
      if (r.then.length) r.then.forEach(function (c) { tr.appendChild(chipFor(c, 0)); });
      else tr.appendChild(el("span", MONO + "font-size:12px;color:#b3a585;", "\u2014"));

      card.appendChild(el("div", "border-top:1px dashed #d8ccb2;margin:10px 0 0;"));
      var ur = row(card);
      ur.appendChild(keycap("\u232B", CAP_PUNCT, function () { backToken(ta); }, true));
      ur.appendChild(keycap("\u21B5", CAP_PUNCT, function () { insertKey(ta, "\n", "p"); }, true));
      if (r.pad) {
        ur.appendChild(el("span", "width:1px;height:26px;background:#ddd2bb;flex:0 0 auto;margin:0 2px;"));
        "1234567890".split("").concat(["000", "."]).forEach(function (d) {
          ur.appendChild(keycap(d, { fill: "#fff", line: "#ddd2bb" }, function () { insertKey(ta, d, "digit"); }, true));
        });
      } else {
        [",", "(", ")", "*"].forEach(function (k) {
          ur.appendChild(keycap(k, CAP_PUNCT, function () { insertKey(ta, k, "p"); }, true));
        });
      }
    }

    function renderAll(card) {
      var r1 = row(card);
      KW.forEach(function (k) { r1.appendChild(keycap(k, CAP_KW, function () { insertKey(ta, k, "kw"); })); });
      var r2 = row(card);
      FN.forEach(function (k) { r2.appendChild(keycap(k, CAP_FN, function () { insertKey(ta, k, "fn"); })); });
      PUNCT.forEach(function (k) {
        r2.appendChild(keycap(k, CAP_PUNCT, function () { insertKey(ta, k, k === "''" ? "pair" : "p"); }, true));
      });
      r2.appendChild(keycap("\u21B5", CAP_PUNCT, function () { insertKey(ta, "\n", "p"); }, true));

      var tables = TABLES[ds] || [];
      if (!tables.length) return;
      card.appendChild(el("div", "border-top:1px dashed #d8ccb2;margin:10px 0 0;"));
      var tr = row(card);
      tr.appendChild(el("span", "display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;margin-right:3px;",
        '<span style="width:8px;height:8px;border-radius:50%;background:' + (DS_COLOR[ds] || "#564b3a") + ';"></span>' +
        '<span style="' + LABEL + '">' + ds.toUpperCase() + "</span>"));
      tables.forEach(function (tb) {
        var isOpen = tb.t === state.openTable;
        tr.appendChild(tableChip(tb, ta, ds, isOpen, function () {
          if (isOpen) insertKey(ta, tb.t, "id"); else { state.openTable = tb.t; render(); }
        }, true));
      });
      var act = null;
      tables.forEach(function (tb) { if (tb.t === state.openTable) act = tb; });
      if (act) {
        var cr = row(card);
        cr.appendChild(el("span", "display:inline-flex;align-items:center;flex:0 0 auto;",
          '<span style="' + LABEL + '">' + act.t.toUpperCase() + ' \u00B7</span>'));
        act.cols.forEach(function (cn) { cr.appendChild(colPill(cn, function () { insertKey(ta, cn, "id"); })); });
      }
    }
  }

  window.SQLZOO_KEYS = { build: build, insertKey: insertKey, TABLES: TABLES, predict: predict };
})();
