/* sql-grade.js — the module pages' grader, shared with the Mistake Bank and SQLZoo.
   Generated from the inline script in The Modules/module-04.html (same functions, same
   rules: FIXES-PR19-20.md §1 column permutations, §3 changesData). If you change the
   grader there, regenerate this file. */
(function () {
  function changesData(sql){
    var s = String(sql).replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"|--[^\n]*|\/\*[\s\S]*?\*\//g, " ");
    return s.split(";").some(function(st){
      var m = st.trim().match(/^\(*\s*([a-z]+)/i); if (!m) return false;
      var k = m[1].toUpperCase();
      if (/^(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER|TRUNCATE|ATTACH|DETACH|VACUUM|REINDEX|PRAGMA)$/.test(k)) return true;
      return k === "WITH" && /\)\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(st);
    });
  }
  function cellKey(v){ return v === null ? "\u0000NULL" : typeof v === "number" ? "number:" + (+v.toFixed(9)) : typeof v + ":" + String(v); }
  function rowKey(r){ return r.map(cellKey).join("\u0001"); }
  function rowsBag(rows){ return rows.map(rowKey).sort().join("\u0002"); }
  function findColumnPermutation(expected, actual){          // returns p (actual col p[j] → expected col j) or null
    var n = expected.columns.length, E = expected.values, A = actual.values;
    if (E.length !== A.length) return null;
    var colBag = function(rows, j){ return rows.map(function(r){ return cellKey(r[j]); }).sort().join("\u0001"); };
    var cand = [];
    for (var j = 0; j < n; j++){ cand[j] = []; for (var k = 0; k < n; k++) if (colBag(E, j) === colBag(A, k)) cand[j].push(k); if (!cand[j].length) return null; }
    var target = rowsBag(E), used = [], p = [];
    (function search(j){
      if (j === n) return rowsBag(A.map(function(r){ return p.map(function(k){ return r[k]; }); })) === target;
      for (var i = 0; i < cand[j].length; i++){ var k = cand[j][i]; if (used[k]) continue; used[k] = 1; p[j] = k; if (search(j + 1)) return true; used[k] = 0; }
      return false;
    })(0) || (p = null);
    return p && p.some(function(k, j){ return k !== j; }) ? p : null;   // identity permutation means it isn't a column-order problem
  }
  function orderKeys(solution, columns) {
    const s = solution.replace(/'(?:[^']|'')*'/g, "''").replace(/;\s*$/, "");
    let depth = 0, at = -1;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "(") depth++; else if (s[i] === ")") depth--;
      else if (!depth && /^order\s+by\b/i.test(s.slice(i)) && /\W/.test(s[i - 1] || " ")) at = i;
    }
    if (at < 0) return null;
    const names = columns.map(c => c.toLowerCase());
    const keys = s.slice(at).replace(/^order\s+by\s+/i, "").replace(/\blimit\b[\s\S]*$/i, "").split(",").map(k => {
      const name = k.trim().replace(/\s+(asc|desc)\b.*$/i, "").replace(/^.*\./, "").toLowerCase();
      return names.indexOf(name);
    });
    return keys.indexOf(-1) > -1 ? [] : keys;
  }
  function compare(expected, actual, keys) {
    const E = expected.values, A = actual.values, nE = expected.columns.length, nA = actual.columns.length;
    const yours = { columns: actual.columns, rows: A }, exp = { columns: expected.columns, rows: E };
    const v = (reason, detail, diff) => ({ ok: false, verdict: { reason, detail, yours, expected: exp, diff: diff || {} } });
    if (nA !== nE) {
      const names = expected.columns.map(c => c.toLowerCase());
      const cols = actual.columns.map((c, i) => names.indexOf(c.toLowerCase()) < 0 ? i : -1).filter(i => i > -1);
      return v("Column count differs", `You returned ${nA} column${nA === 1 ? "" : "s"}; the answer has ${nE}.`, { cols });
    }
    const sameBag = E.length === A.length && rowsBag(E) === rowsBag(A);
    if (sameBag) {
      if (!keys) return { ok: true };
      const proj = (rows, ks) => rows.map(r => ks.map(k => cellKey(r[k])).join("\u0001"));
      const ks = keys.length ? keys : expected.columns.map((_, i) => i);
      const pe = proj(E, ks), pa = proj(A, ks);
      if (pe.every((x, i) => x === pa[i])) return { ok: true };
    }
    const p = findColumnPermutation(expected, actual);
    if (p) return v("Columns in the wrong order", "Right data, but the columns are in the wrong order. The answer lists them as " + expected.columns.join(", ") + ".", { cols: p.filter((k, j) => k !== j) });
    if (sameBag) {
      const cells = [];
      A.forEach((r, i) => { if (rowKey(r) !== rowKey(E[i])) r.forEach((_, j) => cells.push([i, j])); });
      return v("Wrong row order", "Right rows, wrong order. Check your ORDER BY.", { cells });
    }
    const left = {}; E.forEach((r, i) => { const k = rowKey(r); (left[k] = left[k] || []).push(i); });
    const extra = []; A.forEach((r, i) => { const l = left[rowKey(r)]; if (l && l.length) l.shift(); else extra.push(i); });
    const missing = [].concat.apply([], Object.keys(left).map(k => left[k])).sort((a, b) => a - b);
    if (E.length !== A.length) return v("Row count differs", `You returned ${A.length} row${A.length === 1 ? "" : "s"}; the answer has ${E.length}.`, { extra, missing });
    return v("Values differ", `${extra.length} of your rows ${extra.length === 1 ? "isn't" : "aren't"} in the answer.`, { extra, missing });
  }
  function snapshot(db) {
    const out = {};
    const objs = db.exec("SELECT type, name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name");
    (objs.length ? objs[0].values : []).forEach(([type, name]) => {
      const q = '"' + name.replace(/"/g, '""') + '"';
      const r = db.exec("SELECT * FROM " + q);
      const columns = r.length ? r[0].columns : (db.exec("PRAGMA table_info(" + q + ")")[0] || { values: [] }).values.map(c => c[1]);
      out[name] = { type, columns, values: r.length ? r[0].values : [] };
    });
    return out;
  }
  function compareState(expected, actual) {
    const names = Object.keys(expected).concat(Object.keys(actual)).filter((n, i, a) => a.indexOf(n) === i).sort();
    for (const n of names) {
      const e = expected[n], a = actual[n];
      if (!a) return { ok: false, verdict: { reason: "Values differ", detail: `The answer has a ${e.type} called ${n}; your database doesn't.`, yours: { columns: [], rows: [] }, expected: { columns: e.columns, rows: e.values }, diff: {} } };
      if (!e) return { ok: false, verdict: { reason: "Values differ", detail: `Your database has a ${a.type} called ${n} that the answer doesn't.`, yours: { columns: a.columns, rows: a.values }, expected: { columns: [], rows: [] }, diff: {} } };
      const r = compare(e, a, null);
      if (!r.ok) { r.verdict.detail = `In ${n}: ` + r.verdict.detail; return r; }
    }
    return { ok: true };
  }
  window.SQLGrade = { changesData: changesData, cellKey: cellKey, rowKey: rowKey, rowsBag: rowsBag,
    findColumnPermutation: findColumnPermutation, orderKeys: orderKeys, compare: compare,
    snapshot: snapshot, compareState: compareState };
})();
