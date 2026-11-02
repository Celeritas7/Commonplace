/* Module 1 - What "offline app" means. */
(function () {
var code = COURSE.code;

COURSE.module({
  id: 'm1',
  title: 'What an offline app is',
  blurb: 'An app is a folder of files and the browser runs it. Learn what that folder contains, the two ways to open it, and what breaks without internet.',
  apps: 'Route Studio, Weekly Focus, DocSearch',
  lessons: [

  // ------------------------------------------------------------------ 1.1
  {
    title: 'An app is a folder of files',
    minutes: 15,
    html: `
<p class="lead">Your browser is already a full program runner. Give it an HTML file and it draws the screen,
runs the JavaScript and remembers data. An offline app is just a set of files that the browser opens.</p>

<h2>The three languages</h2>
<table>
<tr><th>File type</th><th>Job</th><th>Analogy</th></tr>
<tr><td><code>.html</code></td><td>What is on the page: headings, buttons, inputs, tables.</td><td>The parts list and assembly</td></tr>
<tr><td><code>.css</code></td><td>How it looks: colours, spacing, fonts, layout.</td><td>Surface finish and paint</td></tr>
<tr><td><code>.js</code></td><td>What it does: react to clicks, calculate, save data.</td><td>The mechanism</td></tr>
</table>
<p>All three can live in one file (a <code>&lt;style&gt;</code> block and a <code>&lt;script&gt;</code> block inside the HTML),
or be split into separate files once the app grows.</p>

<h2>Two of your apps, side by side</h2>
<div class="inapps"><b>In your apps</b>
<b>Part Matrix Finder</b> is <b>one file</b>:
<code class="path">apps/Mechanical/#Part_matrix/part_matrix_finder_v2.html</code> (32&nbsp;KB) contains its HTML, CSS and JavaScript together.<br><br>
<b>Route Studio</b> is a <b>folder</b>:</div>
${code('text', `
Route Studio Offline/
├── index.html                the page: markup only
├── css/route-studio.css      all the styling
├── js/route-studio.js        geometry, 3D view, main tabs
├── js/analysis.js, refine.js, clearance.js, ...   one file per feature
├── js/vendor/three.min.js    a 3D library, copied in (not downloaded)
├── fonts/                    IBM Plex fonts, copied in
├── samples/                  test .pts / .stp files
└── Launch Route Studio.bat   double-click to start it`, 'apps/Mechanical/Route Studio Offline/')}
<p>Both are the same kind of thing: files the browser reads. A larger app is simply split into more files.</p>

<h2>The smallest possible app</h2>
${code('html', `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Hello</title>
</head>
<body>
  <h1>Hello from my first app</h1>
</body>
</html>`, 'hello.html')}
<p>Save this as <code>hello.html</code>, double-click it, and it opens in your browser. That's a working offline app.
The <code>&lt;title&gt;</code> is the text on the browser tab, and <code>&lt;h1&gt;</code> is the main heading on the page.</p>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'Your first page',
      task: `<p>Make a page for a tool called <b>Bolt Torque Helper</b>:</p>
<ol><li>Set the tab title to <code>Bolt Torque Helper</code>.</li>
<li>Add an <code>&lt;h1&gt;</code> heading with the same text.</li>
<li>Below it, add a paragraph (<code>&lt;p&gt;</code>) that describes the tool in one sentence.</li></ol>`,
      start: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Untitled</title>
</head>
<body>

</body>
</html>`,
      checks: [
        { label: 'The tab title is "Bolt Torque Helper"', fn: function (t) { return t.doc.title.trim() === 'Bolt Torque Helper'; } },
        { label: 'There is an &lt;h1&gt; that says "Bolt Torque Helper"', fn: function (t) { return t.text('h1') === 'Bolt Torque Helper'; } },
        { label: 'There is a &lt;p&gt; paragraph with some text', fn: function (t) { var p = t.$('p'); return p && p.textContent.trim().length > 5; } }
      ],
      hint: 'Change the text between <code>&lt;title&gt;</code> and <code>&lt;/title&gt;</code>. Then put <code>&lt;h1&gt;Bolt Torque Helper&lt;/h1&gt;</code> and <code>&lt;p&gt;...&lt;/p&gt;</code> between <code>&lt;body&gt;</code> and <code>&lt;/body&gt;</code>.',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Bolt Torque Helper</title>
</head>
<body>
  <h1>Bolt Torque Helper</h1>
  <p>Looks up the tightening torque for a metric bolt size and grade.</p>
</body>
</html>`
    }],
    quiz: [
      { q: 'Route Studio is split into many files, Part Matrix Finder is one file. Which one is "more" of an offline app?',
        options: ['Route Studio, because it has more files', 'Part Matrix Finder, because one file is easier to copy', 'Neither: both are files the browser runs, just organised differently'],
        answer: 2, why: 'Splitting is about keeping a big app manageable. The browser treats both the same way.' },
      { q: 'Which file type decides what happens when you click a button?',
        options: ['.html', '.css', '.js'], answer: 2, why: 'JavaScript is the behaviour. HTML only places the button, and CSS only styles it.' }
    ]
  },

  // ------------------------------------------------------------------ 1.2
  {
    title: 'Two ways to open an app',
    minutes: 15,
    html: `
<p class="lead">You can open an app by double-clicking its HTML file, or through a tiny web server on your own computer.
The address bar shows which one you're using, and it affects what the app is allowed to do.</p>

<h2>Way 1: straight from disk (<code>file://</code>)</h2>
<p>Double-click <code>index.html</code> and the address bar shows something like
<code>file:///D:/Apps/Weekly_focus_offline/index.html</code>. This is the simplest way. It works for most apps,
including Part Matrix Finder, the Flowchart editor, and this course.</p>
<p>But for safety, browsers restrict pages opened from disk. A page opened this way <b>cannot use <code>fetch()</code>
to read other files</b> next to it, and some features (service workers, "keep my data" storage) are switched off.</p>

<h2>Way 2: through a local server (<code>http://localhost</code>)</h2>
<p>A local server is a small program on your PC that hands the files to the browser as if they came from a website.
The address becomes <code>http://localhost:8765/index.html</code>. "localhost" means "this computer", so nothing goes on the internet.</p>
<div class="inapps"><b>In your apps</b>
<code class="path">Launch Route Studio.bat</code> starts exactly this. The important line is:
${code('bat', `
%PY% -m http.server %PORT% --bind 127.0.0.1`, 'apps/Mechanical/Route Studio Offline/Launch Route Studio.bat')}
Python has a web server built in (<code>python -m http.server</code>). <code>--bind 127.0.0.1</code> means
"only answer this computer", so nobody else on the network can open it. If Python isn't installed, the .bat
falls back to a small server written in PowerShell. <code>run-weekly-focus-offline.bat</code> does the same on port 5071.</div>

<h2>A real failure you can see</h2>
<p>DocSearch's page asks its Python program for data with <code>fetch('/api/info')</code>. When I opened
<code>web/index.html</code> by double-clicking, the browser refused:</p>
${code('text', `
Fetch API cannot load file:///api/info. URL scheme "file" is not supported.`, 'browser console')}
<p>That's why DocSearch has to be started with <code>python docsearch_web.py</code>: its Python program is both the
web server and the part that searches the files.</p>

<h2>Rule of thumb</h2>
<table>
<tr><th>The app...</th><th>Double-click is fine?</th></tr>
<tr><td>keeps everything in one HTML file, or loads extra files with <code>&lt;script src&gt;</code> / <code>&lt;link href&gt;</code></td><td>Yes</td></tr>
<tr><td>loads files with <code>fetch()</code> (JSON data, other pages)</td><td>No, it needs a local server</td></tr>
<tr><td>should install like a phone app and work with no network (service worker)</td><td>No, it needs a local server</td></tr>
<tr><td>needs to read your hard drive freely, or run Python code</td><td>No, it needs its own program (like DocSearch)</td></tr>
</table>
<div data-quiz></div>
`,
    quiz: [
      { q: 'You double-click an app and it shows "Failed to fetch" in the console. What is the most likely cause?',
        options: ['The internet is down', 'The app uses fetch(), which browsers block on file:// pages', 'The HTML file is corrupted'],
        answer: 1, why: 'Pages opened from disk cannot fetch() other files. Start it through a local server, or change the app to load the data with &lt;script src&gt; instead.' },
      { q: 'What does --bind 127.0.0.1 do in Route Studio\'s launcher?',
        options: ['Makes the app faster', 'Lets only this computer connect to the server', 'Downloads three.js'],
        answer: 1, why: '127.0.0.1 is the address of "this machine", so other computers on the network can\'t reach the server.' },
      { q: 'Is http://localhost:8765 "online"?',
        options: ['Yes, it starts with http', 'No, localhost is your own computer; nothing leaves it'],
        answer: 1, why: 'The browser and the server are both on your PC. It works with the network cable unplugged.' }
    ]
  },

  // ------------------------------------------------------------------ 1.3
  {
    title: 'What breaks without internet',
    minutes: 20,
    html: `
<p class="lead">Most web pages quietly download things while they load: fonts, libraries, icons. Offline, each of
those downloads fails. Making an app offline mostly means finding them and keeping a local copy instead.</p>

<h2>The usual suspects</h2>
<p>Any address starting with <code>http://</code> or <code>https://</code> inside your page is a download:</p>
${code('html', `
<!-- a library from a CDN (a public file server) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- fonts from Google -->
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans" rel="stylesheet">

<!-- data from an online service -->
fetch('https://api.open-meteo.com/v1/forecast?...')`, 'online dependencies')}

<h2>The fix: keep a local copy, use a relative path</h2>
${code('html', `
<script src="js/vendor/three.min.js"></script>
<link href="fonts/fonts.css" rel="stylesheet">`, 'apps/Mechanical/Route Studio Offline/index.html')}
<p>A <b>relative path</b> like <code>js/vendor/three.min.js</code> means "starting from the folder this HTML file is in".
Wherever you copy the folder, the path still works. That's why Route Studio's README says
<i>"Keep these folders together with index.html."</i></p>

<div class="inapps"><b>In your apps</b>
Route Studio's README has the note <i>"three.js is in js/vendor/three.min.js (r128) and the IBM Plex fonts are in fonts/"</i>.
Someone downloaded those files once and put them in the folder. The page then points to the local copies.</div>

<h2>Things that are allowed to need the internet</h2>
<p>Weekly Focus still has weather and train-delay cards. When I tested it with no connection, those two downloads failed. By design
(its README says so) the cards then show "Offline" and the rest of the app carries on. That is a deliberate choice: optional extras may use the internet,
but the core of the app must not depend on it.</p>

<h2>Avoid absolute paths</h2>
${code('html', `
<script src="file:///D:/Users/me/Apps/lib/three.min.js"></script>   <!-- only works on one PC -->
<script src="/js/app.js"></script>                                  <!-- leading / breaks on file:// -->
<script src="js/app.js"></script>                                   <!-- good: relative -->`, 'paths')}
<p>A full <code>file:///D:/...</code> path breaks as soon as the folder is copied to another place or PC. A leading <code>/</code> means "the root of the site", which on <code>file://</code> is the root of your drive.</p>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'Make this page offline-safe',
      task: `<p>This page was copied from a website. Assume the files <code>css/style.css</code>, <code>js/chart.min.js</code> and
<code>fonts/fonts.css</code> are already saved next to it.</p>
<ol><li>Change every <code>https://</code> address so it points to the local copy using a relative path.</li>
<li>Remove the leading <code>/</code> from <code>/js/app.js</code>.</li></ol>
<p>(The preview won't change, because the files don't exist here. The checks read your code.)</p>`,
      start: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Stack-up Checker</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans">
  <link rel="stylesheet" href="https://example-cdn.com/stackup/style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
  <h1>Stack-up Checker</h1>
  <script src="/js/app.js"></script>
</body>
</html>`,
      checks: [
        { label: 'No http:// or https:// addresses left', fn: function (t) { return !/https?:\/\//i.test(t.src); } },
        { label: 'Loads fonts/fonts.css', fn: function (t) { return !!t.$('link[href="fonts/fonts.css"]'); } },
        { label: 'Loads css/style.css', fn: function (t) { return !!t.$('link[href="css/style.css"]'); } },
        { label: 'Loads js/chart.min.js', fn: function (t) { return !!t.$('script[src="js/chart.min.js"]'); } },
        { label: 'Loads js/app.js with a relative path (no leading /)', fn: function (t) { return !!t.$('script[src="js/app.js"]') && !t.$('script[src="/js/app.js"]'); } }
      ],
      hint: 'Replace the whole address inside the quotes, e.g. <code>href="https://fonts.googleapis.com/..."</code> becomes <code>href="fonts/fonts.css"</code>.',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Stack-up Checker</title>
  <link rel="stylesheet" href="fonts/fonts.css">
  <link rel="stylesheet" href="css/style.css">
  <script src="js/chart.min.js"></script>
</head>
<body>
  <h1>Stack-up Checker</h1>
  <script src="js/app.js"></script>
</body>
</html>`
    }],
    quiz: [
      { q: 'You copy Route Studio to a USB stick but leave out the js/vendor folder. What happens offline?',
        options: ['Nothing, the browser has three.js built in', 'The 3D view fails because three.min.js cannot be found', 'The browser downloads it automatically'],
        answer: 1, why: 'The page asks for js/vendor/three.min.js next to it. If the file isn\'t there, every feature that uses three.js stops.' },
      { q: 'Weekly Focus loads weather from the internet. Does that make it a bad offline app?',
        options: ['Yes, an offline app may never use the internet', 'No, as long as the core works without it and the extra fails politely'],
        answer: 1, why: 'Optional extras are fine. The important part is that planning, boards and saving all work with no connection.' }
    ]
  }
  ]
});
})();
