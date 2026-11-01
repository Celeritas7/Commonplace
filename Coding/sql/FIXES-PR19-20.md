# Fixes for the PR #19 / #20 review — prompt for Claude Code

Do fixes 1, 2, 4 and 5 now. Fix 3 can wait, but the redesign's "data changed" state depends
on it, so its function is written out below. Leave sw.js and the lesson text alone.

## 1 · Grader: false "column order" verdict
**File:** `Practice/sqlzoo-lab.js`, `bagKey` / `compare`.

**Bug.** The grader sorts the cells inside each row before comparing. So expected
`[(1,2),(3,4)]` against actual `[(2,1),(3,4)]` is reported as a column-order error, and so
is a duplicated row standing in for the mirrored one. Both are really values errors.

**Fix.** Report "columns in the wrong order" only when a single column permutation makes
every row match:

```js
function cellKey(v){ return v === null ? "\u0000NULL" : typeof v + ":" + String(v); }
function rowsBag(rows){ return rows.map(function(r){ return r.map(cellKey).join("\u0001"); }).sort().join("\u0002"); }
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
```

Inside `compare()`, after the column-count check:
1. Compare rows exactly, unordered unless `orderMatters`. If they match, return ok.
2. `findColumnPermutation(expected, actual)` returns a permutation → reason
   "Right data, but the columns are in the wrong order".
3. Same rows but in a different order, and `orderMatters` → "Wrong row order".
4. Otherwise → "Values differ", with the differing rows and cells, so the challenge diff can
   draw them (`diff.cells`, `diff.extra`, `diff.missing`; see HOOKS.md §4).

**Tests to add:** `[(1,2),(3,4)]` vs `[(2,1),(3,4)]` → values. `[(1,2),(3,4)]` vs
`[(1,2),(1,2)]` → values. `[(1,2),(3,4)]` vs `[(2,1),(4,3)]` → column order. Then confirm all
19 reference solutions still grade ✓.

## 2 · Funnel tap jumps the page and opens the keyboard
**File:** `lib/sql-lab.js`, `selectRung(i, true)` → `setQuery` → `editor.focus()`.

**Fix.** A funnel tap runs the query without focusing the editor:

```js
function setQuery(sql, opts){ editor.value = sql; run(); if (!opts || opts.focus !== false) editor.focus({ preventScroll: true }); }
// in selectRung(i, fromTap): setQuery(rung.sql, { focus: false });
```

Then scroll the result into view only if it's off-screen, and never focus on phones. The
chip and column-insert taps can keep their focus call, but use `{ preventScroll: true }`.

## 3 · "Data changed" warning (can wait)
**Files:** `lib/sql-lab.js:37`, and the copy inside every module page.

**Bug.** `CHANGES_DATA` uses the `m` flag, so any line starting with DROP, REPLACE, etc.
matches. That gives false hits like `SELECT\nREPLACE(title, …)`, and misses `WITH … INSERT`.

**Fix.** Replace the regex with this function:

```js
function changesData(sql){
  var s = String(sql).replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"|--[^\n]*|\/\*[\s\S]*?\*\//g, " ");
  return s.split(";").some(function(st){
    var m = st.trim().match(/^\(*\s*([a-z]+)/i); if (!m) return false;
    var k = m[1].toUpperCase();
    if (/^(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER|TRUNCATE|ATTACH|DETACH|VACUUM|REINDEX|PRAGMA)$/.test(k)) return true;
    return k === "WITH" && /\)\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(st);
  });
}
```

Put it in one shared file (e.g. `lib/sql-changes.js`) instead of a copy in each module page.

## 4 · Quiz blanks reject valid alternatives
**Folder:** `The Modules/quiz/`, using quiz.js's `{ a, alt: [...] }` shape.
- `module-05.js`, the self-join blank whose answer is `<`: add `alt: ['>']`.
- `module-07.js`, `CAST(… AS {{2}})`: add `alt: ['INT']` (keep the existing answer as `a`).
- `module-02.js`, "written with {{1}} or !=": add `'<>'` to `alt`.

Check whether quiz.js trims and upper-cases before it compares. If it doesn't, also add
lowercase `int`.

## 5 · Next sits dead for about 3 s when the quiz layer isn't loaded
**File:** `The Modules/module-check.js`, `withQuiz`, which polls for `CPQuiz` for 3 s.

**Fix.** Decide up front, the same way the Python version does:

```js
function quizAvailable(){
  if (window.CP_QUIZ_OFF) return false;
  if (window.CPQuiz) return true;
  return !!document.querySelector('script[src*="progress-backup.js"]');  // the layer is coming; worth a short wait
}
function withQuiz(fn, fallback){
  if (!quizAvailable()) return fallback();
  if (window.CPQuiz) return fn(window.CPQuiz);
  var t0 = Date.now(), id = setInterval(function(){
    if (window.CPQuiz){ clearInterval(id); fn(window.CPQuiz); }
    else if (Date.now() - t0 > 600){ clearInterval(id); fallback(); }
  }, 50);
}
```

- **Next:** when the quiz isn't available, follow the link straight away.
- **Start the check:** when it isn't available, don't leave the button dead. With the
  redesign, call `SQLBook.check.set({ state: "unavailable" })`. That removes the button and
  turns the gate off. Before the redesign, hide the check block.

## Optional · playground-enhancements.js:63
**Bug.** `localStorage.getItem` sits outside try/catch. When storage is blocked the whole
script stops, and Mark as done and Reset stop with it.

**Fix.** Wrap every storage access in the file in one helper:

```js
function lsGet(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }
```
