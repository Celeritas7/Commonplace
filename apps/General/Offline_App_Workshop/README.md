# Offline App Workshop

A course that teaches how to build offline browser apps like the ones in `apps/` (Route Studio, Weekly Focus, Flowchart, Part Matrix Finder, DocSearch), using those apps as the examples.

## Run

Double-click `index.html`. It needs no internet, no server and no other folder. It uses system fonts only, so the folder can be copied anywhere.

## How it is built

The course is an offline app itself, built only from what it teaches:

| File | What it does |
|---|---|
| `index.html` | Page layout; loads the scripts below with plain `<script src>` tags (no `fetch`, so `file://` works) |
| `css/course.css` | Styles. Colours are tokens on `:root`, and dark mode redefines them |
| `js/course.js` | Engine: navigation, exercise runner (code → preview iframe → checks), quizzes, progress in `localStorage` (`oas:` keys), export/import backup |
| `js/lessons/*.js` | One file per module. Each calls `COURSE.module({...})` |
| `js/lessons/planned.js` | Outlines of modules not written yet |

## Adding a lesson

Add an entry to a module's `lessons` array:

```js
{
  title: 'Lesson title', minutes: 20,
  html: `...lesson text... ${code('js', `example`, 'caption')} <div data-ex="0"></div> <div data-quiz></div>`,
  exercises: [{ title, task, start, solution, hint,
                checks: [{ label: 'what is checked', fn: function (t) { return t.text('#out') === '42'; } }] }],
  quiz: [{ q, options: [...], answer: 0, why: 'explanation' }]
}
```

A check gets `t` with `t.doc`, `t.win`, `t.src`, `t.$`, `t.$$`, `t.text`, `t.type`, `t.click`, `t.css`, `t.wait` and `t.reload` (see the comment in `js/course.js`).

To write a planned module: move its entry out of `planned.js` into a new `js/lessons/mN-*.js` and add the `<script>` tag in `index.html`.

## Status

Written: modules 1–5 (11 lessons, 10 exercises, 23 quiz questions). Planned: modules 6–12.
