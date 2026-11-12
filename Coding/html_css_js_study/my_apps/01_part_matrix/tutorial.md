# Part Matrix Finder — how it works

A tutorial on my own app. The app itself is **not** stored here: open it from
`Offline_apps / Mechanical/#Part_matrix/part_matrix_finder_v2.html` (or the same path in Drive,
`App_generation_offline`) and read it side by side. Line numbers refer to that file (649 lines, snapshot 2026-11-03).

**Kind 1: one-file app.** HTML, CSS and JavaScript are all in one file. No libraries, no server.
Bootcamp lessons it uses: 15 boilerplate · 21 tables · 26 forms · 31–39 CSS · 45 box model · 109–111 strings ·
126–129 if/else · 132–137 arrays and loops · 141–148 DOM · 163–172 events.

## The big picture

The app has two screens and one data model:

1. **Load screen**: paste the Excel "Data" sheet or drop a CSV.
2. **Main screen**: pick spec codes (Items) and part names (Variant); a matrix shows every part marked **A** for all chosen codes.
3. **Model**: the pasted text becomes `{ codes, parts, names, labelKeys }` once. Every filter after that works on this model, not on the text.

```
paste / drop → parseDelimited() → buildModel() → MODEL ─┬→ applyFilter() → render()
                                                         └→ localStorage (opens ready next time)
```

## Lines 1–148 — head and CSS

- Colour **tokens** on `:root` (`--paper`, `--ink`, `--items`, `--variant`…) and a second set under
  `:root[data-theme="dark"]`. Every rule uses `var(--…)`, so dark mode is just the second set of tokens.
- Comment headers split the CSS by screen part: top bar, filter box, suggestion list, matrix, load screen.
- `@media print` at the end hides the controls, so **Print** gives a clean table.

## Lines 150–224 — the two screens in HTML

- `<section class="load" id="load">` and `<section id="main" class="hidden">`: both screens are in the page all
  the time. JavaScript only swaps the `hidden` class.
- The paste box is a `<textarea id="paste">`. The file picker is a hidden `<input type="file" accept=".csv,.tsv,.txt">`
  behind a normal button, because a real file input can't be styled nicely.
- Every element the script needs has an `id`. That list of ids is the contract between HTML and JavaScript.

## Lines 226–266 — reading pasted text

`guessDelim()` decides what separates the cells by counting in the first 4,000 characters:

```js
if (tabs > 0 && tabs >= commas && tabs >= semis) return '\t';
if (semis > commas) return ';';
return ',';
```

Excel puts TABs on the clipboard; a CSV file uses commas (or semicolons in some countries).

`parseDelimited()` reads the text **one character at a time**, because a cell like `"Bracket, hose clamp"` contains
a comma that is not a separator. It remembers whether it is inside quotes (`inQ`), and a doubled quote `""` inside
quotes means one real `"`. This is a small *state machine*: the same character means different things depending on the state.

## Lines 268–327 — building the model

`buildModel()` turns rows into something easy to filter:

- It **finds the header row** by looking for the cells "item no" and "item name" in the first 20 rows. If they're missing,
  it falls back to the row with the most short, code-like cells.
- Every column to the right of Qty is a **spec code**.
- Rows whose Item No looks like `Group:` are **labels** (group headings). They are remembered and attached to the parts
  below them. Rows with a number are **parts**.
- `marks` stores only the cells that have something in them, keyed by column number. That keeps the model small.
- It ends with `names` (every part name, unique and sorted, via `new Set`) for the suggestion list.

When something is wrong it uses `throw new Error('…')`, and `load()` shows the message to the user.

## Lines 329–351 — the filter

`applyFilter(model, f)` is a **pure function**: it only reads the model and returns `{ parts, cols }`. It never touches the page.

- A part passes only if **every** selected code is marked `A` on it (`for … if (!hit(…)) return false`).
- Part names are OR'ed: any one of them matching is enough.
- `cols` keeps only the code columns that are used by at least one remaining part, so the matrix shrinks as you filter.

Keeping the logic pure makes it easy to test, and it is why the CSV export and the screen always agree.

## Lines 353–367 — state and theme

- A few global variables hold the state: `MODEL`, `sel` (the current filter), `showAll`, `LAST` (the last result).
- `var $ = function (id) { return document.getElementById(id); };` is a short helper used everywhere.
- The theme block runs once at start: saved choice, otherwise the computer's setting (`matchMedia`).

## Lines 369–410 — loading data

- `load(text, label)` runs the whole pipeline inside `try { } catch`, saves the **raw text** in `localStorage`
  (key `pmf.data.v1`), switches screens and calls `render()`.
- Pasting loads straight away: a `paste` listener waits 30 ms (`setTimeout`), because the text isn't in the box yet
  at the moment the event fires.
- `FileReader` reads a chosen or dropped file, and `dragover` / `drop` listeners on the whole `document` make the entire page a drop zone.

## Lines 412–512 — tag fields with suggestions

`makeField('I')` and `makeField('V')` build the two filter boxes from one function: one function, two fields.
Inside, `options()` lists suggestions, `draw()` shows them, `pick()` adds a tag, and `keydown` handles ↑ ↓, Enter,
Escape and Backspace. The suggestion list is hidden on `blur` after a short delay, so a click on a suggestion still counts.

The × on each tag is handled by **one** listener on the whole document, using `e.target.closest('.tag button')`.
That is *event delegation*: tags are re-drawn all the time, so listeners on the tags themselves would be lost.

## Lines 514–599 — render

`render()` redraws everything from `sel` and `MODEL`:

- runs `applyFilter`, updates the counts, and shows only the first 300 rows (`CAP`) unless you choose "Show all";
- puts your selected code columns first;
- prints group headings only when a group label changes between rows, and drops label levels that are the same for every row;
- builds the whole table as one HTML string and sets `innerHTML` once. Every value goes through `esc()` first, so text from the sheet can never break the page.

## Lines 601–640 — clicks on the table, export, print

- One `click` listener on the table: header click toggles that code in the filter, name click adds the name as a variant.
- A `mouseover` listener highlights the whole column under the mouse (the "crosshair").
- **Export CSV** writes the current result with `csvCell()` (quotes cells containing `,` `"` or line breaks) and a
  `'﻿'` BOM so Excel opens Japanese text correctly. It's the same export as Mini Matrix step 5 in the workshop.

## Lines 642–646 — start-up

The last block tries to load the saved text from `localStorage`. If there is none, or it no longer parses, it shows the
load screen. It's placed last so that every function it calls already exists.

## What to look for when you read it

- Where the app keeps **state**, and the one function that redraws from it.
- Why the parser walks character by character instead of using `split(',')`.
- Which functions touch the page and which don't (`applyFilter` doesn't).
