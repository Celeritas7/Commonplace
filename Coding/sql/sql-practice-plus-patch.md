# Patch: sql-practice-plus.js — table-first key palette

Three edits. Line numbers refer to your current file.

---

## Edit 1 — add a `.` key (≈ line 47, `KW_TOKENS`)

**Find:**
```js
var KW_TOKENS = ["SELECT", "DISTINCT", "FROM", "WHERE", "AND", "OR", "ORDER BY", "DESC",
  "GROUP BY", "HAVING", "LIMIT", "JOIN", "ON", "COUNT(", "SUM(", "AVG(", "LIKE", "IN (",
  "BETWEEN", "=", "*", ",", "'  '"];
```

**Replace with:**
```js
var KW_TOKENS = ["SELECT", "DISTINCT", "FROM", "WHERE", "AND", "OR", "ORDER BY", "DESC",
  "GROUP BY", "HAVING", "LIMIT", "JOIN", "ON", "COUNT(", "SUM(", "AVG(", "LIKE", "IN (",
  "BETWEEN", "=", "*", ",", ".", "'  '"];
```

---

## Edit 2 — make `.` glue tokens together (`insertAtCursor`, ≈ line 51)

**Find:**
```js
function insertAtCursor(ta, raw) {
  var token = raw, back = 0;
  if (token === "'  '") { token = "''"; back = 1; }
  else if (/[(]$/.test(token)) { /* leave caret right after "(" */ }
  else token = token + " ";
  var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
  var before = v.slice(0, s);
  var needSpace = before.length && !/\s$/.test(before) && !/[(,]$/.test(before) && !/^[,)]/.test(token);
```

**Replace with:**
```js
function insertAtCursor(ta, raw) {
  var token = raw, back = 0, isDot = raw === ".";
  if (token === "'  '") { token = "''"; back = 1; }
  else if (/[(]$/.test(token)) { /* leave caret right after "(" */ }
  else if (!isDot) token = token + " ";
  var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
  var before = v.slice(0, s);
  if (isDot) before = before.replace(/\s+$/, "");   // "goal ." → "goal."
  var needSpace = !isDot && before.length && !/\s$/.test(before) && !/[(,.]$/.test(before) && !/^[,)]/.test(token);
```

(The rest of the function is unchanged — `s` is only used again via `before.length`,
so also change the next lines from `var ins = (needSpace ? " " : "") + token;
ta.value = before + ins + v.slice(e); var pos = s + ins.length - back;` to:)

```js
  var ins = (needSpace ? " " : "") + token;
  ta.value = before + ins + v.slice(e);
  var pos = before.length + ins.length - back;
```

Tapping `goal` → `.` → `teamid` now yields `goal.teamid`.

---

## Edit 3 — table chips reveal columns first (inside `addToolbar`, ≈ line 99)

**Find (the whole `rowC` block):**
```js
var rowC = document.createElement("div"); rowC.className = "pp-row";
// group columns under their table — the table name is itself a tappable chip
tablesForEx(ex).forEach(function (tn) {
  var tb = document.createElement("button");
  tb.type = "button"; tb.className = "pp-tok pp-tok-tbl";
  tb.textContent = tn;
  tb.title = "table";
  tb.addEventListener("click", function () { insertAtCursor(ta, tn); });
  rowC.appendChild(tb);
  (BY_TABLE[tn] || []).forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "pp-tok pp-tok-id";
    b.textContent = c;
    b.addEventListener("click", function () { insertAtCursor(ta, c); });
    rowC.appendChild(b);
  });
});
```

**Replace with:**
```js
var rowC = document.createElement("div"); rowC.className = "pp-row";
// Tables first; only the selected table's columns are shown.
// First tap on a chip = reveal its columns. Second tap = insert the table name.
var exTables = tablesForEx(ex);
var openTable = exTables[0] || null;
function renderTableRow() {
  rowC.innerHTML = "";
  exTables.forEach(function (tn) {
    var tb = document.createElement("button");
    tb.type = "button";
    tb.className = "pp-tok pp-tok-tbl" + (tn === openTable ? " on" : "");
    tb.textContent = tn;
    tb.title = tn === openTable
      ? "Tap to insert \u201C" + tn + "\u201D"
      : "Tap to show " + tn + "\u2019s columns";
    tb.addEventListener("click", function () {
      if (tn === openTable) insertAtCursor(ta, tn);
      else { openTable = tn; renderTableRow(); }
    });
    rowC.appendChild(tb);
  });
  var cols = BY_TABLE[openTable] || [];
  if (cols.length) {
    var sep = document.createElement("span");
    sep.className = "pp-col-sep";
    rowC.appendChild(sep);
    cols.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "pp-tok pp-tok-id";
      b.textContent = c;
      b.addEventListener("click", function () { insertAtCursor(ta, c); });
      rowC.appendChild(b);
    });
  }
}
renderTableRow();
```

---

## Edit 4 (styling) — active-chip + separator CSS (inside `injectCss`, after the `.pp-tok-tbl::before` rule)

**Add these two rules:**
```css
.pp-tok-tbl.on{background:#1f7a4d;border-color:#1f7a4d;color:#fff;}
.pp-col-sep{flex:0 0 auto;width:2px;align-self:stretch;background:#bcdfca;border-radius:2px;}
```

---

## Result

- World/Nobel: unchanged look (one table, its columns beside it).
- Football: `game / goal / eteam` chips in one row; tap one to swap in its
  columns; tap the highlighted chip again to type the table name.
- Compose qualified names manually: `goal` → `.` → `teamid` = `goal.teamid`.
- Delete the earlier `sqlzoo-key-palette.js` I sent — it targeted the wrong
  script and isn't needed.
