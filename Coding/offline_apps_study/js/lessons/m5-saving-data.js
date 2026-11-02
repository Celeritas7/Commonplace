/* Module 5 - Saving data without a server. */
(function () {
var code = COURSE.code;

COURSE.module({
  id: 'm5',
  title: 'Saving data without a server',
  blurb: 'Keep the user\'s work between visits with localStorage, and protect it with an export / import backup, the way Weekly Focus does.',
  apps: 'Weekly Focus, Part Matrix Finder, this course',
  lessons: [

  // ------------------------------------------------------------------ 5.1
  {
    title: 'localStorage: the browser\'s notebook',
    minutes: 30,
    html: `
<p class="lead">Every browser gives each site a small storage area that survives closing the tab and restarting the PC.
It's called <code>localStorage</code>, and it's where all your offline apps keep their data.</p>

<h2>Three calls are enough</h2>
${code('js', `
localStorage.setItem('demo:note', 'Check torque on M8');   // save   (key, value)
localStorage.getItem('demo:note');                          // read   → 'Check torque on M8', or null if never saved
localStorage.removeItem('demo:note');                       // delete`, 'the API')}
<p>Keys and values are always <b>text</b>. To save a list or an object, turn it into text with
<code>JSON.stringify</code>, and back with <code>JSON.parse</code>:</p>
${code('js', `
var board = { name: 'Week 45', tasks: ['Drawing review', 'Order clamps'] };
localStorage.setItem('wfo:board:Week 45', JSON.stringify(board));

var back = JSON.parse(localStorage.getItem('wfo:board:Week 45') || 'null');
back.tasks.length;   // 2`, 'objects need JSON')}

<h2>Use a key prefix</h2>
<p>On <code>file://</code>, every page you open from disk can share the <b>same</b> storage. If two apps both use the key
<code>settings</code>, they overwrite each other. Start every key with a short app prefix.</p>
<div class="inapps"><b>In your apps</b>
Weekly Focus's README: <i>"Each board is one localStorage key: <code>wfo:board:&lt;name&gt;</code>. All keys start with
<code>wfo:</code>, so the offline and online builds never touch each other's data."</i><br>
This course uses <code>oas:</code> ("offline app study"). The exercises below use <code>demo:</code>.</div>

<h2>Save often, load once</h2>
${code('js', `
var box = document.getElementById('note');
var KEY = 'demo:note';

// load once at start (storage can be blocked, so guard it)
try { box.value = localStorage.getItem(KEY) || ''; } catch (e) {}

// save on every change
box.addEventListener('input', function () {
  try { localStorage.setItem(KEY, box.value); } catch (e) {}
});`, 'the pattern')}

<div class="warn"><b>Know the limits</b>
<ul style="margin:4px 0 0;padding-left:20px">
<li>About <b>5 MB</b> per site. That's plenty for text and settings, but not for images or big files.</li>
<li>It lives in <b>one browser on one PC</b>. Edge doesn't see Chrome's data.</li>
<li><b>Clearing browsing data deletes it.</b> That's why the next lesson (backups) is not optional.</li>
</ul></div>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'A note that survives a reload',
      task: `<ol><li>When the page loads, put the saved note (key <code>demo:note</code>) into <code>#note</code>.</li>
<li>Save the note on every <code>input</code> event.</li>
<li>Wrap the storage calls in <code>try { } catch (e) { }</code>.</li></ol>
<p>The checks type a note, then <b>reload the page</b> to see if it comes back.</p>`,
      start: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Note</title>
  <style>
    body { font-family: sans-serif; padding: 16px; }
    textarea { width: 100%; height: 140px; font: inherit; }
  </style>
</head>
<body>
  <label for="note">Shift note</label>
  <textarea id="note"></textarea>

  <script>
    var box = document.getElementById('note');
    var KEY = 'demo:note';

    // 1. load the saved note

    // 2. save on every change

  </script>
</body>
</html>`,
      checks: [
        { label: 'Typing saves to localStorage under "demo:note"', fn: function (t) {
            try { t.win.localStorage.removeItem('demo:note'); } catch (e) {}
            t.type('#note', 'Check torque on M8');
            return t.win.localStorage.getItem('demo:note') === 'Check torque on M8';
          } },
        { label: 'After a reload, the note is back in the box', fn: function (t) {
            return t.reload().then(function () { var e = t.$('#note'); return e && e.value === 'Check torque on M8'; });
          } },
        { label: 'Storage calls are inside try / catch', fn: function (t) { return /try\s*\{[^}]*localStorage/.test(t.src); } }
      ],
      hint: 'Copy "the pattern" above. Make sure the load line uses <code>KEY</code> and the save line uses <code>box.value</code>.',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Note</title>
  <style>
    body { font-family: sans-serif; padding: 16px; }
    textarea { width: 100%; height: 140px; font: inherit; }
  </style>
</head>
<body>
  <label for="note">Shift note</label>
  <textarea id="note"></textarea>

  <script>
    var box = document.getElementById('note');
    var KEY = 'demo:note';

    try { box.value = localStorage.getItem(KEY) || ''; } catch (e) {}

    box.addEventListener('input', function () {
      try { localStorage.setItem(KEY, box.value); } catch (e) {}
    });
  </script>
</body>
</html>`
    }],
    quiz: [
      { q: 'You run localStorage.setItem(\'x\', [1, 2, 3]). What does getItem(\'x\') return?',
        options: ['[1, 2, 3] as a list', 'The text "1,2,3"', 'null'], answer: 1,
        why: 'Values are converted to text. Use JSON.stringify to save the list and JSON.parse to get a real list back.' },
      { q: 'You switch from Chrome to Edge on the same PC. Is your Weekly Focus data there?',
        options: ['Yes, it is saved on the PC', 'No, each browser has its own storage; move it with Export / Import'], answer: 1,
        why: 'localStorage belongs to one browser profile. That is why every one of your apps has an export.' }
    ]
  },

  // ------------------------------------------------------------------ 5.2
  {
    title: 'Backups: export and import',
    minutes: 35,
    html: `
<p class="lead">Data in localStorage disappears if someone clears browsing data. Every serious offline app needs a way to
save everything to a file and load it back. That's also how you move data to another PC.</p>

<h2>Export: data → file</h2>
${code('js', `
function exportData() {
  return JSON.stringify({ app: 'mini-notes', saved: new Date().toISOString(), notes: notes }, null, 1);
}

function download(text, filename) {
  var blob = new Blob([text], { type: 'application/json' });  // a file that exists only in memory
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);                          // give it a temporary address
  a.download = filename;                                       // "download" instead of "open"
  a.click();
  URL.revokeObjectURL(a.href);
}`, 'export')}
<p>Nothing is uploaded anywhere. The browser builds the file in memory and saves it to Downloads.</p>

<h2>Import: file → data, carefully</h2>
${code('js', `
function importData(text) {
  var data;
  try { data = JSON.parse(text); } catch (e) { return false; }      // not JSON at all
  if (!data || data.app !== 'mini-notes' || !Array.isArray(data.notes)) return false;  // wrong file
  notes = data.notes;
  save(); render();
  return true;
}

fileInput.addEventListener('change', function () {
  var reader = new FileReader();
  reader.onload = function () {
    if (!importData(reader.result)) alert('That is not a Mini Notes backup.');
  };
  reader.readAsText(fileInput.files[0]);
});`, 'import')}
<p>Always <b>check before you overwrite</b>. Someone will eventually pick the wrong file. The <code>app</code> field is a cheap way
to recognise your own backups.</p>

<div class="inapps"><b>In your apps</b>
Weekly Focus's green <b>On this device</b> pill has: Export backup (.json), Import backup (boards in the file replace boards with
the same name, other boards are kept), <b>Keep my data</b> (asks the browser not to clear storage on its own, using
<code>navigator.storage.persist()</code>), and a <b>backup reminder</b> after 7 days without a backup.<br><br>
This course does the same: look at <code>exportProgress()</code> and <code>importProgress()</code> in
<code>Coding/offline_apps_study/js/course.js</code>.</div>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'Export and import for Mini Notes',
      task: `<p>The app and its buttons are already written. Finish the two functions:</p>
<ol><li><code>exportData()</code> returns JSON text containing <code>app: 'mini-notes'</code> and the <code>notes</code> array.</li>
<li><code>importData(text)</code> replaces <code>notes</code>, then calls <code>save()</code> and <code>render()</code>, and returns <code>true</code>,
but only if the text is valid JSON with <code>app === 'mini-notes'</code> and a <code>notes</code> array.
Otherwise it returns <code>false</code> and changes nothing (no crash).</li></ol>`,
      start: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Mini Notes</title>
  <style>
    body { font-family: sans-serif; padding: 16px; }
    li { margin: 2px 0; }
  </style>
</head>
<body>
  <input id="txt" placeholder="New note"> <button id="add" type="button">Add</button>
  <p><span id="count"></span> &middot;
     <button id="exp" type="button">Export</button>
     <button id="imp" type="button">Import…</button>
     <input id="file" type="file" accept=".json" hidden></p>
  <ul id="list"></ul>

  <script>
    var KEY = 'demo:mini-notes';
    var notes = ['Order clamps', 'Drawing review'];
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(s)) notes = s; } catch (e) {}
    notes = ['Order clamps', 'Drawing review'];   // (exercise: always start from the same two notes)

    function save() { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) {} }
    function render() {
      var ul = document.getElementById('list'); ul.innerHTML = '';
      notes.forEach(function (n) { var li = document.createElement('li'); li.textContent = n; ul.appendChild(li); });
      document.getElementById('count').textContent = notes.length + ' notes';
    }

    function exportData() {
      // return JSON text with app: 'mini-notes' and the notes
      return '';
    }

    function importData(text) {
      // check, then replace notes, save, render, return true
      return false;
    }

    // ---- wiring (already done) ----
    document.getElementById('add').onclick = function () {
      var t = document.getElementById('txt'); if (!t.value.trim()) return;
      notes.push(t.value.trim()); t.value = ''; save(); render();
    };
    document.getElementById('exp').onclick = function () {
      var blob = new Blob([exportData()], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'mini-notes-backup.json'; a.click(); URL.revokeObjectURL(a.href);
    };
    document.getElementById('imp').onclick = function () { document.getElementById('file').click(); };
    document.getElementById('file').onchange = function () {
      var r = new FileReader();
      r.onload = function () { if (!importData(r.result)) alert('That is not a Mini Notes backup.'); };
      r.readAsText(this.files[0]);
    };
    render();
  </script>
</body>
</html>`,
      checks: [
        { label: 'exportData() returns valid JSON', fn: function (t) { JSON.parse(t.win.exportData()); return true; } },
        { label: '…with app: "mini-notes" and both notes', fn: function (t) { var d = JSON.parse(t.win.exportData()); return d.app === 'mini-notes' && Array.isArray(d.notes) && d.notes.length === 2; } },
        { label: 'Importing a good backup with 3 notes shows "3 notes"', fn: function (t) {
            var ok = t.win.importData(JSON.stringify({ app: 'mini-notes', notes: ['a', 'b', 'c'] }));
            return ok === true && t.text('#count') === '3 notes' && t.$$('#list li').length === 3;
          } },
        { label: 'A backup from another app is refused (returns false, still 3 notes)', fn: function (t) {
            var ok; try { ok = t.win.importData('{"app":"weekly-focus","notes":[]}'); } catch (e) { return false; }
            return ok === false && t.text('#count') === '3 notes';
          } },
        { label: 'Text that is not JSON is refused without crashing', fn: function (t) {
            var ok; try { ok = t.win.importData('hello'); } catch (e) { return false; }
            return ok === false && t.text('#count') === '3 notes';
          } },
        { label: 'Round trip: export, then import the result, keeps the notes', fn: function (t) {
            var text = t.win.exportData(); t.win.importData(text);
            return t.text('#count') === '3 notes';
          } }
      ],
      hint: 'exportData: <code>return JSON.stringify({ app: \'mini-notes\', notes: notes });</code>. For importData, copy the "import" example above. The <code>try { JSON.parse } catch</code> line is what stops "hello" from crashing it.',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Mini Notes</title>
  <style>
    body { font-family: sans-serif; padding: 16px; }
    li { margin: 2px 0; }
  </style>
</head>
<body>
  <input id="txt" placeholder="New note"> <button id="add" type="button">Add</button>
  <p><span id="count"></span> &middot;
     <button id="exp" type="button">Export</button>
     <button id="imp" type="button">Import…</button>
     <input id="file" type="file" accept=".json" hidden></p>
  <ul id="list"></ul>

  <script>
    var KEY = 'demo:mini-notes';
    var notes = ['Order clamps', 'Drawing review'];
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(s)) notes = s; } catch (e) {}
    notes = ['Order clamps', 'Drawing review'];   // (exercise: always start from the same two notes)

    function save() { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) {} }
    function render() {
      var ul = document.getElementById('list'); ul.innerHTML = '';
      notes.forEach(function (n) { var li = document.createElement('li'); li.textContent = n; ul.appendChild(li); });
      document.getElementById('count').textContent = notes.length + ' notes';
    }

    function exportData() {
      return JSON.stringify({ app: 'mini-notes', saved: new Date().toISOString(), notes: notes }, null, 1);
    }

    function importData(text) {
      var data;
      try { data = JSON.parse(text); } catch (e) { return false; }
      if (!data || data.app !== 'mini-notes' || !Array.isArray(data.notes)) return false;
      notes = data.notes;
      save(); render();
      return true;
    }

    // ---- wiring (already done) ----
    document.getElementById('add').onclick = function () {
      var t = document.getElementById('txt'); if (!t.value.trim()) return;
      notes.push(t.value.trim()); t.value = ''; save(); render();
    };
    document.getElementById('exp').onclick = function () {
      var blob = new Blob([exportData()], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'mini-notes-backup.json'; a.click(); URL.revokeObjectURL(a.href);
    };
    document.getElementById('imp').onclick = function () { document.getElementById('file').click(); };
    document.getElementById('file').onchange = function () {
      var r = new FileReader();
      r.onload = function () { if (!importData(r.result)) alert('That is not a Mini Notes backup.'); };
      r.readAsText(this.files[0]);
    };
    render();
  </script>
</body>
</html>`
    }],
    quiz: [
      { q: 'Why does the backup file contain app: \'mini-notes\'?',
        options: ['Browsers require it', 'So import can recognise its own files and refuse anything else'], answer: 1,
        why: 'A wrong file should be refused, not silently loaded over your data.' },
      { q: 'Is exported data sent to the internet?',
        options: ['Yes, through the Blob', 'No: Blob + a.download builds the file in memory and saves it to Downloads'], answer: 1,
        why: 'Everything happens inside the browser. It works with the network cable unplugged.' }
    ]
  }
  ]
});
})();
