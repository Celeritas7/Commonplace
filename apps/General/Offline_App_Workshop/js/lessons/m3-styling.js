/* Module 3 - Styling with theme tokens and dark mode. */
(function () {
var code = COURSE.code;

COURSE.module({
  id: 'm3',
  title: 'Styling and dark mode',
  blurb: 'Write CSS the way your newer apps do: colours as named tokens in one place, so a dark theme is just a second set of values.',
  apps: 'Flowchart, Part Matrix Finder, this course',
  lessons: [

  // ------------------------------------------------------------------ 3.1
  {
    title: 'CSS basics and colour tokens',
    minutes: 25,
    html: `
<p class="lead">CSS is a list of rules. Each rule says "these elements" (the selector) and "look like this" (the declarations).</p>
${code('css', `
body          { font-family: sans-serif; margin: 0; }      /* every <body> */
.card         { border: 1px solid #ccc; padding: 12px; }   /* class="card" */
#result       { font-weight: bold; }                       /* id="result" */
button:hover  { background: #eee; }                        /* a button under the mouse */
table td      { padding: 4px 8px; }                        /* <td> inside a <table> */`, 'selectors')}

<h2>The problem with hard-coded colours</h2>
<p>A first version of an app usually has colours typed directly into many rules:</p>
${code('css', `
body   { background: #f2f4f3; color: #1a1f24; }
button { border: 1px solid #d5dbdf; }
.hit   { background: #1f5faf; color: #fff; }
a      { color: #1f5faf; }`, 'hard to change')}
<p>Changing the blue means finding every <code>#1f5faf</code>. Adding a dark theme means rewriting every rule.</p>

<h2>Tokens: name a colour once, use it everywhere</h2>
<p>CSS <b>custom properties</b> (also called variables or tokens) start with <code>--</code>. You define them on <code>:root</code>
(the whole page) and read them with <code>var()</code>:</p>
${code('css', `
:root {
  --paper: #f2f4f3;   /* page background */
  --ink:   #1a1f24;   /* text */
  --rule:  #d5dbdf;   /* lines and borders */
  --items: #1f5faf;   /* the accent blue */
}
body   { background: var(--paper); color: var(--ink); }
button { border: 1px solid var(--rule); }
.hit   { background: var(--items); color: #fff; }
a      { color: var(--items); }`, 'apps/Mechanical/#Part_matrix/part_matrix_finder_v2.html (simplified)')}
<p>Name tokens after their <b>job</b> (<code>--paper</code>, <code>--ink</code>, <code>--rule</code>), not their colour (<code>--light-grey</code>).
The job stays the same in dark mode, while the colour changes.</p>

<div class="inapps"><b>In your apps</b>
The two Flowchart versions show this change. The older copy had 12 tokens and many hard-coded colours, e.g.
<code>button:hover{border-color:#aab2c0;background:#f9fafb}</code>. The newer <code>Flowchart_app</code> has about 30 tokens, and the
same rule became <code>button:hover{border-color:var(--line-strong);background:var(--hover)}</code>. That rewrite is what made
its dark mode possible (next lesson).</div>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'Turn hard-coded colours into tokens',
      task: `<ol><li>Add a <code>:root</code> rule defining <code>--paper</code>, <code>--ink</code>, <code>--rule</code> and <code>--accent</code>
with the four colours used below.</li>
<li>Replace every colour in the other rules with <code>var(--…)</code>. When you're done, no rule except <code>:root</code> should contain a <code>#</code> colour
(<code>#fff</code> on the accent button is allowed).</li></ol>
<p>The page should look exactly the same when you finish. That's how you know the refactor worked.</p>`,
      start: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tokens</title>
  <style>
    body   { background: #f2f4f3; color: #1a1f24; font-family: sans-serif; padding: 16px; }
    .card  { background: white; border: 1px solid #d5dbdf; border-radius: 8px; padding: 12px; }
    button { border: 1px solid #d5dbdf; border-radius: 4px; padding: 6px 12px; background: white; color: #1a1f24; }
    button.primary { background: #1f5faf; border-color: #1f5faf; color: #fff; }
    a      { color: #1f5faf; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Part 343434</h2>
    <p>Bracket, hose clamp. <a href="#">Open drawing</a></p>
    <button>Cancel</button> <button class="primary">Save</button>
  </div>
</body>
</html>`,
      checks: [
        { label: '--paper, --ink, --rule and --accent are defined on :root', fn: function (t) { var s = t.win.getComputedStyle(t.doc.documentElement); return ['--paper', '--ink', '--rule', '--accent'].every(function (k) { return s.getPropertyValue(k).trim() !== ''; }); } },
        { label: 'body uses var(--paper) and var(--ink)', fn: function (t) { var m = t.src.match(/body\s*\{[^}]*\}/); return m && /var\(--paper\)/.test(m[0]) && /var\(--ink\)/.test(m[0]); } },
        { label: 'The primary button uses var(--accent)', fn: function (t) { var m = t.src.match(/button\.primary\s*\{[^}]*\}/); return m && /var\(--accent\)/.test(m[0]); } },
        { label: 'No hex colours outside :root (except #fff)', fn: function (t) {
            var css = (t.$('style') || {}).textContent || '';
            css = css.replace(/:root\s*\{[^}]*\}/, '');
            var hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
            return hexes.every(function (h) { return /^#fff(fff)?$/i.test(h); });
          } },
        { label: 'The page still looks the same (background is #f2f4f3)', fn: function (t) { return t.css('body', 'background-color') === 'rgb(242, 244, 243)'; } }
      ],
      hint: 'Start with <code>:root { --paper: #f2f4f3; --ink: #1a1f24; --rule: #d5dbdf; --accent: #1f5faf; }</code>, then replace each colour, e.g. <code>border: 1px solid var(--rule);</code>.',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tokens</title>
  <style>
    :root  { --paper: #f2f4f3; --ink: #1a1f24; --rule: #d5dbdf; --accent: #1f5faf; }
    body   { background: var(--paper); color: var(--ink); font-family: sans-serif; padding: 16px; }
    .card  { background: white; border: 1px solid var(--rule); border-radius: 8px; padding: 12px; }
    button { border: 1px solid var(--rule); border-radius: 4px; padding: 6px 12px; background: white; color: var(--ink); }
    button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    a      { color: var(--accent); }
  </style>
</head>
<body>
  <div class="card">
    <h2>Part 343434</h2>
    <p>Bracket, hose clamp. <a href="#">Open drawing</a></p>
    <button>Cancel</button> <button class="primary">Save</button>
  </div>
</body>
</html>`
    }],
    quiz: [
      { q: 'Which token name is better?', options: ['--dark-blue', '--accent'], answer: 1,
        why: 'In dark mode the accent may become light blue. A name that describes the colour\'s job is still correct after that change.' },
      { q: 'The card above still has background: white. What will go wrong in dark mode?',
        options: ['Nothing', 'The card stays white on a dark page; it needs its own token too (e.g. --sheet)'],
        answer: 1, why: 'Any colour that is not a token is stuck. Part Matrix uses a --sheet token for its panels, buttons and boxes for exactly this reason.' }
    ]
  },

  // ------------------------------------------------------------------ 3.2
  {
    title: 'Dark mode and a theme switch',
    minutes: 25,
    html: `
<p class="lead">Once colours are tokens, dark mode is just a second set of token values. There are two ways to trigger it:
the computer's own setting, and a button in your app.</p>

<h2>1. Follow the computer's setting</h2>
${code('css', `
:root { --paper: #f2f4f3; --ink: #1a1f24; }

@media (prefers-color-scheme: dark) {
  :root { --paper: #15191c; --ink: #e6eaed; }
}`, 'automatic')}
<p><code>@media (prefers-color-scheme: dark)</code> is true when Windows (or the phone) is set to dark mode.</p>

<h2>2. Let the user choose</h2>
<p>Put an attribute on the <code>&lt;html&gt;</code> element and give it its own token block:</p>
${code('css', `
:root[data-theme="dark"] { --paper: #15191c; --ink: #e6eaed; }`, 'manual')}
${code('js', `
document.getElementById('theme').addEventListener('click', function () {
  var root = document.documentElement;                 // the <html> element
  var dark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', dark ? 'light' : 'dark');
});`, 'the switch')}

<h2>Both together</h2>
<p>The full pattern, used by both <code>Flowchart_app</code> and this course: follow the computer's setting <b>unless</b> the user has picked a theme.</p>
${code('css', `
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark tokens */ }
}
:root[data-theme="dark"] { /* the same dark tokens */ }`, 'apps/General/Flowchart_app/index.html')}
<p><code>:not([data-theme="light"])</code> means "unless the user chose light". Yes, the dark values appear twice.
That's the price of supporting both triggers in plain CSS.</p>

<div class="inapps"><b>In your apps</b>
Part Matrix Finder remembers your choice between visits:
${code('js', `
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(TKEY, t); } catch (e) {}
}`, 'part_matrix_finder_v2.html')}
<code>localStorage</code> is the browser's small notebook for your app. Module 5 covers it properly.
The <code>try { } catch</code> is there because storage can be blocked (private windows, strict settings), and a theme
switch should never crash the app.</div>

<div class="note"><b>Try it here</b>
The &#9680; button at the top right of this page does exactly this.</div>

<div data-ex="0"></div>
<div data-quiz></div>
`,
    exercises: [{
      title: 'Add a dark theme and a switch',
      task: `<ol><li>Add a <code>:root[data-theme="dark"]</code> rule that sets <code>--paper</code> to <code>#15191c</code>,
<code>--ink</code> to <code>#e6eaed</code> and <code>--sheet</code> to <code>#1c2125</code>.</li>
<li>In the script, make the <code>#theme</code> button switch <code>data-theme</code> on the <code>&lt;html&gt;</code> element between
<code>dark</code> and <code>light</code>.</li></ol>`,
      start: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Theme</title>
  <style>
    :root { --paper: #f2f4f3; --ink: #1a1f24; --sheet: #ffffff; --rule: #d5dbdf; }
    /* add the dark tokens here */

    body  { background: var(--paper); color: var(--ink); font-family: sans-serif; padding: 16px; }
    .card { background: var(--sheet); border: 1px solid var(--rule); border-radius: 8px; padding: 12px; }
  </style>
</head>
<body>
  <button id="theme" type="button">Light / dark</button>
  <div class="card"><h2>Part 343434</h2><p>Bracket, hose clamp.</p></div>

  <script>
    // make #theme switch the theme
  </script>
</body>
</html>`,
      checks: [
        { label: 'Starts light (background #f2f4f3)', fn: function (t) { return t.css('body', 'background-color') === 'rgb(242, 244, 243)'; } },
        { label: 'Clicking #theme sets data-theme="dark" on &lt;html&gt;', fn: function (t) { t.click('#theme'); return t.doc.documentElement.getAttribute('data-theme') === 'dark'; } },
        { label: 'In dark mode the background is #15191c', fn: function (t) { return t.css('body', 'background-color') === 'rgb(21, 25, 28)'; } },
        { label: 'In dark mode the card is #1c2125', fn: function (t) { return t.css('.card', 'background-color') === 'rgb(28, 33, 37)'; } },
        { label: 'Clicking again goes back to light', fn: function (t) { t.click('#theme'); return t.css('body', 'background-color') === 'rgb(242, 244, 243)'; } }
      ],
      hint: 'CSS: <code>:root[data-theme="dark"] { --paper: #15191c; --ink: #e6eaed; --sheet: #1c2125; }</code>. For the script, copy "the switch" example above.',
      solution: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Theme</title>
  <style>
    :root { --paper: #f2f4f3; --ink: #1a1f24; --sheet: #ffffff; --rule: #d5dbdf; }
    :root[data-theme="dark"] { --paper: #15191c; --ink: #e6eaed; --sheet: #1c2125; --rule: #323a40; }

    body  { background: var(--paper); color: var(--ink); font-family: sans-serif; padding: 16px; }
    .card { background: var(--sheet); border: 1px solid var(--rule); border-radius: 8px; padding: 12px; }
  </style>
</head>
<body>
  <button id="theme" type="button">Light / dark</button>
  <div class="card"><h2>Part 343434</h2><p>Bracket, hose clamp.</p></div>

  <script>
    document.getElementById('theme').addEventListener('click', function () {
      var root = document.documentElement;
      var dark = root.getAttribute('data-theme') === 'dark';
      root.setAttribute('data-theme', dark ? 'light' : 'dark');
    });
  </script>
</body>
</html>`
    }],
    quiz: [
      { q: 'Your PC is in dark mode, but you clicked "light" in Flowchart_app. Which rule wins?',
        options: ['The @media dark rule, because the PC setting always wins', 'Light: :root:not([data-theme="light"]) no longer matches, so the dark tokens don\'t apply'],
        answer: 1, why: 'The :not(...) part switches the automatic rule off as soon as the user has chosen light.' },
      { q: 'Why does Part Matrix wrap localStorage.setItem in try { } catch?',
        options: ['It makes saving faster', 'Storage can be blocked; without the catch, the error would stop the rest of the script'],
        answer: 1, why: 'An uncaught error stops the script. Saving a theme preference is not worth crashing the app over.' }
    ]
  }
  ]
});
})();
