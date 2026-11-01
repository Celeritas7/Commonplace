/* sql-bank.js — the Mistake Bank store, shared by the module pages, SQLZoo, the bank
   page and home. One list in localStorage "cp_sql_bank":
     {id, src:"module"|"sqlzoo", srcLabel, title, prompt, hint, href, sql_wrong, solution,
      reason, added, updated, due, step, state}
   href is relative to Coding/sql/. due is a local date "YYYY-MM-DD". added/updated are ms.
   Schedule: a miss is due tomorrow (step 0). Each right answer moves one step along
   1 → 3 → 7 → 14 days and marks the item "fixed"; a miss goes back to step 0.
   Every write calls SQLSync.changed() so a signed-in reader's bank follows them. */
(function () {
  "use strict";
  var KEY = "cp_sql_bank", STEPS = [1, 3, 7, 14];

  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    if (window.SQLSync) SQLSync.changed();
  }
  function day(offset) {
    var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + (offset || 0));
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function daysUntil(due) { return Math.round((new Date(due + "T12:00:00") - new Date(day(0) + "T12:00:00")) / 86400000); }
  function isDue(it) { return !!it.due && it.due <= day(0); }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return -1; }

  var bank = {
    KEY: KEY, STEPS: STEPS, day: day, daysUntil: daysUntil, isDue: isDue,
    all: read,
    get: function (id) { var l = read(), i = find(l, id); return i < 0 ? null : l[i]; },
    /* A wrong answer or a revealed solution: add the item, or send it back to step 0. */
    miss: function (o) {
      var list = read(), i = find(list, o.id), now = Date.now(), it = i < 0 ? { id: o.id, added: now } : list[i];
      ["src", "srcLabel", "title", "prompt", "hint", "href", "solution"].forEach(function (k) { if (o[k] != null) it[k] = o[k]; });
      if (o.sql_wrong != null) it.sql_wrong = o.sql_wrong;
      it.reason = o.reason || it.reason || "wrong result";
      it.updated = now; it.step = 0; it.due = day(STEPS[0]); it.state = "due";
      if (i < 0) list.push(it); else list[i] = it;
      write(list);
      return it;
    },
    /* A right answer. Only items already in the bank move, and a fixed item only moves again
       once it is due (re-running a solved challenge doesn't skip steps). Returns {item, before} or null. */
    fix: function (id) {
      var list = read(), i = find(list, id); if (i < 0) return null;
      if (list[i].state === "fixed" && !isDue(list[i])) return null;
      var before = JSON.parse(JSON.stringify(list[i])), it = list[i];
      it.step = Math.min((it.step || 0) + 1, STEPS.length - 1);
      it.due = day(STEPS[it.step]); it.state = "fixed"; it.updated = Date.now();
      write(list);
      return { item: it, before: before };
    },
    /* Undo puts back the copy fix() returned. */
    restore: function (copy) {
      var list = read(), i = find(list, copy.id);
      copy = JSON.parse(JSON.stringify(copy)); copy.updated = Date.now();
      if (i < 0) list.push(copy); else list[i] = copy;
      write(list);
    },
    dueItems: function () { return read().filter(isDue).sort(function (a, b) { return (a.due < b.due ? -1 : a.due > b.due ? 1 : (a.updated || 0) - (b.updated || 0)); }); },
    dueCount: function () { return read().filter(isDue).length; },
    /* "today", "tomorrow", "in 3 days" */
    when: function (due) { var n = daysUntil(due); return n <= 0 ? "today" : n === 1 ? "tomorrow" : "in " + n + " days"; }
  };

  /* One-time import of the old Mistake Drill's source: wrong SQLZoo attempts that were never
     resolved (commonplace_sqlzoo_attempts + commonplace_sqlzoo_mistakes_resolved). */
  (function migrate() {
    try {
      if (localStorage.getItem("cp_sql_bank_migrated")) return;
      var att = JSON.parse(localStorage.getItem("commonplace_sqlzoo_attempts") || "{}") || {};
      var done = JSON.parse(localStorage.getItem("commonplace_sqlzoo_mistakes_resolved") || "[]") || [];
      var ex = {}; (window.SQLZOO_EXERCISES || []).forEach(function (e) { ex[e.id] = e; });
      var list = read(), added = 0;
      Object.keys(att).forEach(function (code) {
        var wrong = (att[code] || []).filter(function (a) { return !a.ok; });
        if (!wrong.length || done.indexOf(code) >= 0 || find(list, "sqlzoo_" + code) >= 0) return;
        var e = ex[code], last = wrong[wrong.length - 1];
        list.push({ id: "sqlzoo_" + code, src: "sqlzoo", srcLabel: "SQLZoo · " + code.toUpperCase(),
          title: e ? e.title : code.toUpperCase(), prompt: e ? e.prompt : "", hint: e ? e.hint : "",
          href: "Practice/sqlzoo.html#card-" + code, sql_wrong: last.q || "", solution: e ? e.sol : "",
          reason: last.msg || "wrong result", added: last.t || Date.now(), updated: last.t || Date.now(),
          due: day(0), step: 0, state: "due" });
        added++;
      });
      if (window.SQLZOO_EXERCISES || !Object.keys(att).length) localStorage.setItem("cp_sql_bank_migrated", "1");
      if (added) write(list);
    } catch (e) {}
  })();

  window.SQLBank = bank;
})();
