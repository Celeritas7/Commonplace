/* Module 2 - Building a one-file app: the HTML. */
(function () {
var code = COURSE.code;

COURSE.module({
  id: 'm2',
  title: 'The one-file app',
  blurb: 'Every line of the page skeleton and what it is for, then the controls a tool is made of: inputs, dropdowns, buttons and outputs.',
  apps: 'Part Matrix Finder, Flowchart',
  lessons: [

  // ------------------------------------------------------------------ 2.1
  {
    title: 'The page skeleton, line by line',
    minutes: 20,
    html: `
<p class="lead">Almost every app you have starts with the same dozen lines. Once you know what each one is for,
you can start any new tool in under a minute.</p>

${code('html', `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Part Matrix Finder</title>
  <style>
    /* all the CSS goes here */
  </style>
</head>
<body>
  <!-- everything you see goes here -->

  <script>
    // all the JavaScript goes here, at the END of the body
  </script>
</body>
</html>`, 'apps/Mechanical/#Part_matrix/part_matrix_finder_v2.html (shape)')}

<table>
<tr><th>Line</th><th>Why it is there</th></tr>
<tr><td><code>&lt;!DOCTYPE html&gt;</code></td><td>Tells the browser to use modern rules. Without it, browsers fall back to a 1990s compatibility mode and layouts behave strangely.</td></tr>
<tr><td><code>&lt;html lang="en"&gt;</code></td><td>The language of the page. Spell-checkers and screen readers use it. Use <code>lang="ja"</code> for a Japanese page.</td></tr>
<tr><td><code>&lt;meta charset="utf-8"&gt;</code></td><td>How the text is encoded. Without it, characters like <code>ø</code>, <code>±</code>, <code>µm</code> or Japanese text can turn into garbage (<code>Ã¸</code>).</td></tr>
<tr><td><code>&lt;meta name="viewport" ...&gt;</code></td><td>Makes the page use the real screen width on phones instead of pretending to be a desktop and shrinking everything.</td></tr>
<tr><td><code>&lt;title&gt;</code></td><td>Text on the browser tab, in the taskbar and in bookmarks.</td></tr>
<tr><td><code>&lt;style&gt;</code> in the head</td><td>CSS is read before the page is drawn, so it never flashes unstyled.</td></tr>
<tr><td><code>&lt;script&gt;</code> at the end of the body</td><td>By the time the script runs, every element above it already exists, so it can find them.</td></tr>
</table>

<h2>Why the script goes last</h2>
<p>The browser reads the file from top to bottom. If the script were in the head, a line like
<code>document.getElementById('status')</code> would run before the element exists and get nothing back (<code>null</code>).
That is one of the most common beginner errors: <i>"Cannot set properties of null"</i>.</p>
${code('html', `
<p id="status">Loading…</p>
<script>
  document.getElementById('status').textContent = 'Ready';   // works: the <p> is above
</script>`, 'order matters')}

<div class="inapps"><b>In your apps</b>
Open <code class="path">part_matrix_finder_v2.html</code> in a text editor: the <code>&lt;style&gt;</code> starts on line 7,
the visible page follows, and one <code>&lt;script&gt;</code> near the bottom holds all the logic. Route Studio uses the same
order, but its CSS and JS are in separate files: <code>&lt;link&gt;</code> in the head, a list of <code>&lt;script src&gt;</code> at the end.</div>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'Write the skeleton from memory',
      task: `<p>Start from an empty file and write a complete skeleton for <b>Bolt Torque Helper</b>:</p>
<ol><li>doctype, <code>html</code> with <code>lang="en"</code>, <code>head</code>, <code>body</code></li>
<li>the <code>charset</code> and <code>viewport</code> meta tags, and the title</li>
<li>a <code>&lt;style&gt;</code> block that sets the body font to <code>sans-serif</code></li>
<li>a paragraph <code>&lt;p id="status"&gt;Loading…&lt;/p&gt;</code></li>
<li>a <code>&lt;script&gt;</code> at the end of the body that changes the status text to <code>Ready</code></li></ol>
<p>Try it without scrolling up. That's how it sticks.</p>`,
      start: `
<!-- Write the whole page here -->
`,
      checks: [
        { label: 'Starts with &lt;!DOCTYPE html&gt;', fn: function (t) { return /^\s*<!doctype html>/i.test(t.src); } },
        { label: '&lt;html lang="en"&gt;', fn: function (t) { return t.doc.documentElement.getAttribute('lang') === 'en'; } },
        { label: 'meta charset is utf-8', fn: function (t) { var m = t.$('meta[charset]'); return m && /utf-8/i.test(m.getAttribute('charset')); } },
        { label: 'meta viewport is present', fn: function (t) { var m = t.$('meta[name="viewport"]'); return m && /width=device-width/.test(m.getAttribute('content') || ''); } },
        { label: 'Title is "Bolt Torque Helper"', fn: function (t) { return t.doc.title.trim() === 'Bolt Torque Helper'; } },
        { label: 'A &lt;style&gt; block sets the body font to sans-serif', fn: function (t) { return !!t.$('head style') && /sans-serif/.test(t.css('body', 'font-family')); } },
        { label: 'The script changed #status to "Ready"', fn: function (t) { return t.text('#status') === 'Ready'; } }
      ],
      hint: 'The script should be <code>document.getElementById(\'status\').textContent = \'Ready\';</code> placed after the <code>&lt;p&gt;</code>. The CSS is <code>body { font-family: sans-serif; }</code>.',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bolt Torque Helper</title>
  <style>
    body { font-family: sans-serif; }
  </style>
</head>
<body>
  <p id="status">Loading…</p>

  <script>
    document.getElementById('status').textContent = 'Ready';
  </script>
</body>
</html>`
    }],
    quiz: [
      { q: 'A page shows "M8 Ã˜6" instead of "M8 Ø6". Which line is missing?',
        options: ['&lt;meta name="viewport"&gt;', '&lt;meta charset="utf-8"&gt;', '&lt;!DOCTYPE html&gt;'],
        answer: 1, why: 'Wrong or missing charset is what turns special characters into two or three junk characters.' },
      { q: 'The console says "Cannot set properties of null (setting \'textContent\')". What is the most likely cause?',
        options: ['The script runs before the element exists, or the id is misspelled', 'The CSS is wrong', 'The browser is offline'],
        answer: 0, why: 'getElementById returned null: either the element is further down the page than the script, or the id doesn\'t match.' }
    ]
  },

  // ------------------------------------------------------------------ 2.2
  {
    title: 'Inputs, dropdowns, buttons, outputs',
    minutes: 25,
    html: `
<p class="lead">A tool is mostly a form: the user enters values, presses a button (or not) and reads the result.
HTML has a ready-made control for nearly every kind of value.</p>

<h2>The controls you will use most</h2>
${code('html', `
<label for="dia">Bolt size (mm)</label>
<input id="dia" type="number" min="3" max="36" step="1" value="8">

<label for="grade">Property class</label>
<select id="grade">
  <option value="8.8">8.8</option>
  <option value="10.9" selected>10.9</option>
  <option value="12.9">12.9</option>
</select>

<label><input id="lubed" type="checkbox"> Lubricated thread</label>

<button id="calc" type="button">Calculate</button>

<output id="result">–</output>`, 'a small form')}

<table>
<tr><th>Control</th><th>Use it for</th></tr>
<tr><td><code>&lt;input type="number"&gt;</code></td><td>Numbers. <code>min</code>, <code>max</code> and <code>step</code> limit the arrows and the keyboard on phones.</td></tr>
<tr><td><code>&lt;input type="text"&gt;</code> / <code>type="search"</code></td><td>Free text, search boxes.</td></tr>
<tr><td><code>&lt;select&gt;</code></td><td>One choice from a fixed list (material, grade, unit).</td></tr>
<tr><td><code>&lt;input type="checkbox"&gt;</code></td><td>Yes / no.</td></tr>
<tr><td><code>&lt;textarea&gt;</code></td><td>Many lines of text, e.g. pasting a table from Excel.</td></tr>
<tr><td><code>&lt;input type="file"&gt;</code></td><td>Letting the user pick a file from disk (Module 6).</td></tr>
<tr><td><code>&lt;button type="button"&gt;</code></td><td>An action. Write <code>type="button"</code> so it never tries to "submit" the page.</td></tr>
<tr><td><code>&lt;output&gt;</code></td><td>A result. Like a <code>&lt;span&gt;</code>, but it tells screen readers "this is a result".</td></tr>
</table>

<h2>Labels matter</h2>
<p><code>&lt;label for="dia"&gt;</code> connects the text to the input whose <code>id</code> is <code>dia</code>.
Clicking the label then focuses the input, and the click area is bigger. For checkboxes, you can wrap the input inside the label instead.</p>

<h2>The <code>id</code> is the handle for JavaScript</h2>
<p>Every control your script needs to read or change gets a short, unique <code>id</code>. In the next module the script will use
<code>document.getElementById('dia').value</code> to read the bolt size.</p>

<div class="inapps"><b>In your apps</b>
Part Matrix Finder's data screen is a <code>&lt;textarea id="paste"&gt;</code> for pasting from Excel, plus a hidden
<code>&lt;input type="file" id="file" accept=".csv,.tsv,.txt"&gt;</code> behind a "Choose CSV file…" button.
<code>accept</code> filters the file picker to those extensions.</div>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'Build the torque helper form',
      task: `<p>Add the controls for the Bolt Torque Helper (no calculation yet; that's Module 4):</p>
<ol><li>A number input with <code>id="dia"</code>, <code>min="3"</code>, <code>max="36"</code>, value <code>8</code>, and a <code>&lt;label for="dia"&gt;</code>.</li>
<li>A <code>&lt;select id="grade"&gt;</code> with the options <code>8.8</code>, <code>10.9</code>, <code>12.9</code> and its own label.</li>
<li>A <code>&lt;button id="calc" type="button"&gt;</code> that says <code>Calculate</code>.</li>
<li>An <code>&lt;output id="result"&gt;</code>.</li></ol>`,
      start: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Bolt Torque Helper</title>
  <style>
    body { font-family: sans-serif; padding: 12px; }
    label { display: block; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>Bolt Torque Helper</h1>

  <!-- your controls here -->

</body>
</html>`,
      checks: [
        { label: 'Number input #dia with min 3, max 36, value 8', fn: function (t) { var e = t.$('#dia'); return e && e.type === 'number' && e.min === '3' && e.max === '36' && e.value === '8'; } },
        { label: 'A label is connected to #dia', fn: function (t) { var e = t.$('#dia'); return e && e.labels && e.labels.length > 0; } },
        { label: '#grade is a select with 8.8, 10.9, 12.9', fn: function (t) { var e = t.$('select#grade'); if (!e) return false; var v = Array.prototype.map.call(e.options, function (o) { return o.value || o.textContent.trim(); }); return v.join(',') === '8.8,10.9,12.9'; } },
        { label: 'A label is connected to #grade', fn: function (t) { var e = t.$('#grade'); return e && e.labels && e.labels.length > 0; } },
        { label: 'Button #calc with type="button" says "Calculate"', fn: function (t) { var e = t.$('button#calc'); return e && e.getAttribute('type') === 'button' && e.textContent.trim() === 'Calculate'; } },
        { label: 'An &lt;output id="result"&gt;', fn: function (t) { return !!t.$('output#result'); } }
      ],
      hint: 'Look at the "a small form" example above; it is almost the whole answer. Check that every <code>for="..."</code> matches an <code>id="..."</code> exactly.',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Bolt Torque Helper</title>
  <style>
    body { font-family: sans-serif; padding: 12px; }
    label { display: block; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>Bolt Torque Helper</h1>

  <label for="dia">Bolt size (mm)</label>
  <input id="dia" type="number" min="3" max="36" step="1" value="8">

  <label for="grade">Property class</label>
  <select id="grade">
    <option value="8.8">8.8</option>
    <option value="10.9">10.9</option>
    <option value="12.9">12.9</option>
  </select>

  <p><button id="calc" type="button">Calculate</button></p>
  <output id="result">–</output>
</body>
</html>`
    }],
    quiz: [
      { q: 'Users must choose one material from Steel, Aluminium or Brass. Which control fits best?',
        options: ['&lt;input type="text"&gt;', '&lt;select&gt;', '&lt;textarea&gt;'],
        answer: 1, why: 'A fixed list belongs in a select: no typos, and the code always gets one of the known values.' },
      { q: 'Why does Part Matrix Finder use &lt;input type="file" accept=".csv,.tsv,.txt"&gt;?',
        options: ['To upload the CSV to a server', 'So the file picker only shows those file types', 'To make the file smaller'],
        answer: 1, why: 'accept only filters the picker. The file is still read locally, inside the browser.' }
    ]
  }
  ]
});
})();
