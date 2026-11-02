/* Module 4 - JavaScript: making the page do something. */
(function () {
var code = COURSE.code;

COURSE.module({
  id: 'm4',
  title: 'Making it do something',
  blurb: 'JavaScript for tools: read inputs, react to typing and clicks, calculate, and draw a table from data with a live search, which is the heart of Part Matrix Finder.',
  apps: 'Part Matrix Finder, Route Studio',
  lessons: [

  // ------------------------------------------------------------------ 4.1
  {
    title: 'Read, calculate, show',
    minutes: 30,
    html: `
<p class="lead">Nearly every feature in a tool follows the same loop: <b>read</b> the inputs, <b>calculate</b>, <b>show</b> the result.
Then you choose <b>when</b> the loop runs: on every keystroke, or when a button is pressed.</p>

<h2>Read</h2>
${code('js', `
var diaInput = document.getElementById('dia');   // find the element once
var dia = Number(diaInput.value);                // .value is ALWAYS text, so convert it`, 'read')}
<p><code>.value</code> gives text, even for <code>type="number"</code>. <code>"8" + 2</code> is <code>"82"</code>, while
<code>Number("8") + 2</code> is <code>10</code>. Convert with <code>Number(...)</code> before any maths.</p>

<h2>Check the input</h2>
${code('js', `
if (diaInput.value.trim() === '' || !isFinite(dia)) {
  result.textContent = '—';      // empty or not a number: show a dash, don't show "NaN"
  return;
}`, 'guard')}
<p><code>NaN</code> ("not a number") is what you get from <code>Number('abc')</code>. It spreads through every calculation,
so stop early and show something friendly.</p>

<h2>Calculate and show</h2>
${code('js', `
var inch = dia / 25.4;
result.textContent = inch.toFixed(3);   // 3 decimal places, as text`, 'show')}
<p>Use <code>textContent</code> to put text on the page. It's safe: whatever the user types is shown as text, never run as HTML.</p>

<h2>When: events</h2>
${code('js', `
function update() { /* read, check, calculate, show */ }

diaInput.addEventListener('input', update);    // every keystroke
calcBtn.addEventListener('click', update);     // or: only on the button
update();                                       // once at the start, so the page isn't empty`, 'events')}
<p>The <code>input</code> event fires on every change and makes the tool feel instant. Use a button when the calculation is slow,
or when the user should finish entering several values first.</p>

<div class="inapps"><b>In your apps</b>
Route Studio's <code>js/shell.js</code> wires its header buttons (Open, Paste table, Examples, theme) with exactly this
<code>addEventListener</code> pattern. Part Matrix Finder re-filters on every keystroke in the search box using the <code>input</code> event.</div>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'Live mm → inch converter',
      task: `<p>Make <code>#inch</code> show the value of <code>#mm</code> converted to inches with <b>3 decimals</b>,
updating while you type (the <code>input</code> event).</p>
<ul><li>25.4 mm → <code>1.000</code></li><li>100 mm → <code>3.937</code></li>
<li>empty box → <code>—</code> (an em dash, already in the starter)</li></ul>`,
      start: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>mm to inch</title>
  <style>
    body { font-family: sans-serif; padding: 16px; font-size: 18px; }
    output { font-weight: bold; }
  </style>
</head>
<body>
  <label for="mm">Millimetres</label>
  <input id="mm" type="number" step="any">
  <p>= <output id="inch">—</output> in</p>

  <script>
    var mm = document.getElementById('mm');
    var inch = document.getElementById('inch');

    function update() {
      // 1. read  2. check  3. calculate  4. show
    }

    // connect update() to the input event, and call it once
  </script>
</body>
</html>`,
      checks: [
        { label: '25.4 mm shows 1.000', fn: function (t) { t.type('#mm', '25.4'); return t.text('#inch') === '1.000'; } },
        { label: '100 mm shows 3.937', fn: function (t) { t.type('#mm', '100'); return t.text('#inch') === '3.937'; } },
        { label: 'Empty box shows —', fn: function (t) { t.type('#mm', ''); return t.text('#inch') === '—'; } },
        { label: 'Updates while typing (no button needed)', fn: function (t) { return !t.$('button') && /addEventListener\(\s*['"]input['"]/.test(t.src); } }
      ],
      hint: 'Inside update(): <code>var v = Number(mm.value);</code> then <code>if (mm.value.trim() === \'\' || !isFinite(v)) { inch.textContent = \'—\'; return; }</code> then <code>inch.textContent = (v / 25.4).toFixed(3);</code>. After the function: <code>mm.addEventListener(\'input\', update);</code>',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>mm to inch</title>
  <style>
    body { font-family: sans-serif; padding: 16px; font-size: 18px; }
    output { font-weight: bold; }
  </style>
</head>
<body>
  <label for="mm">Millimetres</label>
  <input id="mm" type="number" step="any">
  <p>= <output id="inch">—</output> in</p>

  <script>
    var mm = document.getElementById('mm');
    var inch = document.getElementById('inch');

    function update() {
      var v = Number(mm.value);
      if (mm.value.trim() === '' || !isFinite(v)) { inch.textContent = '—'; return; }
      inch.textContent = (v / 25.4).toFixed(3);
    }

    mm.addEventListener('input', update);
    update();
  </script>
</body>
</html>`
    }],
    quiz: [
      { q: 'An input holds "12". What is input.value + 3?', options: ['15', '"123"', 'NaN'], answer: 1,
        why: '.value is text, so + joins the two strings. Number(input.value) + 3 gives 15.' },
      { q: 'Why use textContent rather than innerHTML to show a result?',
        options: ['It is faster to type', 'Text the user typed is shown as text and never run as HTML'], answer: 1,
        why: 'innerHTML interprets &lt; and &gt; as tags. With textContent, pasted text can never break the page.' }
    ]
  },

  // ------------------------------------------------------------------ 4.2
  {
    title: 'Data in, table out, live search',
    minutes: 35,
    html: `
<p class="lead">Most of your tools are a list of things (parts, routes, tasks) shown as a table that you can filter.
The pattern is always the same: keep the data in an <b>array</b>, and <b>redraw</b> the table from it whenever something changes.</p>

<h2>Data as an array of objects</h2>
${code('js', `
var PARTS = [
  { code: 'BR-101', name: 'Bracket, hose clamp', qty: 2 },
  { code: 'BL-208', name: 'Bolt M8x25',          qty: 8 },
  { code: 'WS-008', name: 'Washer M8',           qty: 8 }
];`, 'data')}
<p>Each <code>{ }</code> is one row. <code>PARTS[1].name</code> is <code>'Bolt M8x25'</code>, and <code>PARTS.length</code> is 3.</p>

<h2>Render: data → rows</h2>
${code('js', `
function render(list) {
  var tbody = document.getElementById('rows');
  tbody.innerHTML = '';                         // clear the old rows
  list.forEach(function (p) {
    var tr = document.createElement('tr');
    [p.code, p.name, p.qty].forEach(function (v) {
      var td = document.createElement('td');
      td.textContent = v;                       // safe: always text
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}`, 'render')}

<h2>Filter: keep the rows that match</h2>
${code('js', `
function filtered(q) {
  q = q.trim().toLowerCase();
  if (!q) return PARTS;                          // empty search: everything
  return PARTS.filter(function (p) {
    return p.name.toLowerCase().indexOf(q) >= 0 ||
           p.code.toLowerCase().indexOf(q) >= 0;
  });
}

search.addEventListener('input', function () { render(filtered(search.value)); });`, 'filter')}
<p><code>.filter()</code> builds a <b>new</b> array with only the rows where the function returns <code>true</code>.
The original <code>PARTS</code> never changes, so clearing the search brings everything back.
<code>toLowerCase()</code> on both sides makes the search ignore upper and lower case.</p>

<div class="inapps"><b>In your apps</b>
This is the core of Part Matrix Finder. Its <code>applyFilter(MODEL, {codes, names, text})</code> returns the matching parts,
and the screen is redrawn from the result. The newer v2 even counts matches per name before you pick one:
${code('js', `
var pool = applyFilter(MODEL, { codes: sel.codes, names: [], text: sel.text, strictA: true }).parts;
var tally = {};
pool.forEach(function (p) { tally[p.name] = (tally[p.name] || 0) + 1; });`, 'apps/Mechanical/#Part_matrix/part_matrix_finder_v2.html')}
<code>tally</code> is an object used as a counter: <code>{ 'Bolt M8x25': 3, 'Washer M8': 5 }</code>.</div>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'A mini part finder',
      task: `<ol><li>Write <code>render(list)</code> so it fills <code>#rows</code> with one <code>&lt;tr&gt;</code> per part (code, name, qty)
and sets <code>#count</code> to e.g. <code>6 parts</code>.</li>
<li>Make <code>#q</code> filter by name <b>or</b> code, ignoring case, while typing.</li>
<li>Call <code>render(PARTS)</code> at the start.</li></ol>`,
      start: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Part finder</title>
  <style>
    body { font-family: sans-serif; padding: 16px; }
    table { border-collapse: collapse; margin-top: 8px; }
    td, th { border-bottom: 1px solid #ddd; padding: 4px 10px; text-align: left; }
  </style>
</head>
<body>
  <input id="q" type="search" placeholder="Search name or code">
  <span id="count"></span>
  <table>
    <thead><tr><th>Code</th><th>Name</th><th>Qty</th></tr></thead>
    <tbody id="rows"></tbody>
  </table>

  <script>
    var PARTS = [
      { code: 'BR-101', name: 'Bracket, hose clamp', qty: 2 },
      { code: 'BL-208', name: 'Bolt M8x25',          qty: 8 },
      { code: 'BL-210', name: 'Bolt M10x30',         qty: 4 },
      { code: 'WS-008', name: 'Washer M8',           qty: 8 },
      { code: 'HS-343', name: 'Hose 343434 R65',     qty: 1 },
      { code: 'CL-020', name: 'Clamp, P-type 20',    qty: 3 }
    ];

    function render(list) {
      // fill #rows and #count
    }

    // filter while typing in #q

    render(PARTS);
  </script>
</body>
</html>`,
      checks: [
        { label: 'Starts with 6 rows', fn: function (t) { return t.$$('#rows tr').length === 6; } },
        { label: 'Each row has 3 cells', fn: function (t) { var r = t.$('#rows tr'); return r && r.children.length === 3; } },
        { label: '#count says "6 parts"', fn: function (t) { return t.text('#count') === '6 parts'; } },
        { label: 'Typing "bolt" leaves 2 rows', fn: function (t) { t.type('#q', 'bolt'); return t.$$('#rows tr').length === 2; } },
        { label: '…and #count says "2 parts"', fn: function (t) { return t.text('#count') === '2 parts'; } },
        { label: 'Searching by code works ("ws-0" → 1 row)', fn: function (t) { t.type('#q', 'ws-0'); return t.$$('#rows tr').length === 1; } },
        { label: 'Upper case works too ("CLAMP" → 2 rows)', fn: function (t) { t.type('#q', 'CLAMP'); return t.$$('#rows tr').length === 2; } },
        { label: 'Clearing the search shows all 6 again', fn: function (t) { t.type('#q', ''); return t.$$('#rows tr').length === 6; } }
      ],
      hint: 'Copy the render and filter examples above. For the count: <code>document.getElementById(\'count\').textContent = list.length + \' parts\';</code> at the end of render().',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Part finder</title>
  <style>
    body { font-family: sans-serif; padding: 16px; }
    table { border-collapse: collapse; margin-top: 8px; }
    td, th { border-bottom: 1px solid #ddd; padding: 4px 10px; text-align: left; }
  </style>
</head>
<body>
  <input id="q" type="search" placeholder="Search name or code">
  <span id="count"></span>
  <table>
    <thead><tr><th>Code</th><th>Name</th><th>Qty</th></tr></thead>
    <tbody id="rows"></tbody>
  </table>

  <script>
    var PARTS = [
      { code: 'BR-101', name: 'Bracket, hose clamp', qty: 2 },
      { code: 'BL-208', name: 'Bolt M8x25',          qty: 8 },
      { code: 'BL-210', name: 'Bolt M10x30',         qty: 4 },
      { code: 'WS-008', name: 'Washer M8',           qty: 8 },
      { code: 'HS-343', name: 'Hose 343434 R65',     qty: 1 },
      { code: 'CL-020', name: 'Clamp, P-type 20',    qty: 3 }
    ];
    var search = document.getElementById('q');

    function render(list) {
      var tbody = document.getElementById('rows');
      tbody.innerHTML = '';
      list.forEach(function (p) {
        var tr = document.createElement('tr');
        [p.code, p.name, p.qty].forEach(function (v) {
          var td = document.createElement('td');
          td.textContent = v;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      document.getElementById('count').textContent = list.length + ' parts';
    }

    function filtered(q) {
      q = q.trim().toLowerCase();
      if (!q) return PARTS;
      return PARTS.filter(function (p) {
        return p.name.toLowerCase().indexOf(q) >= 0 || p.code.toLowerCase().indexOf(q) >= 0;
      });
    }

    search.addEventListener('input', function () { render(filtered(search.value)); });

    render(PARTS);
  </script>
</body>
</html>`
    }],
    quiz: [
      { q: 'After PARTS.filter(...) returns 2 parts, how many items are in PARTS?',
        options: ['2', 'Still all of them; filter makes a new array'], answer: 1,
        why: 'That is why clearing the search can show everything again: the original list was never touched.' },
      { q: 'Why does render() start with tbody.innerHTML = \'\'?',
        options: ['To clear the previous result, otherwise rows pile up on every keystroke', 'It is required by HTML'], answer: 0,
        why: 'Redraw-from-scratch is the simplest reliable pattern: clear, then build everything from the current data.' }
    ]
  }
  ]
});
})();
