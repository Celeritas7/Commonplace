# BatSmith — my notes

Started:

Open the app from `Offline_apps / Coding/BatSmith/index.html` and read it next to the tutorial.
It is long (1,947 lines): read the shared parts first, then just **two** templates (Git pull, and one you use).

## Block by block

For each block: what it does · why it's there (what breaks without it) · what each name means.

### Lines 1–172 — head, theme tokens, highlighter colours

### Lines 174–252 — the screen: appbar, list, form, preview, two dialogs

### Lines 258–283 — helpers: L, B, rem, et, echo, nq, block, fail

### Lines 285–392 — shared fields: FOLDER, COMMON, head, GIT_FIELDS, findPython

### Lines 397–420 — template 1: Git pull

### Lines ___–___ — one more template of my choice: ______

### Lines 1673–1683 — state: S, save, tpl, vals

### Lines 1685–1711 — the highlighter: RX_FULL, paint, hl

### Lines 1713–1784 — gen, renderList, renderForm, renderOut

### Lines 1786–1828 — download and the saved library

### Lines 1830–1897 — the command index

### Lines 1898–1944 — events and start-up

## Hint questions

1. Line 259: why is each line an object `{ c, w }` and not just a string? What would be harder without `w`?
2. Lines 263–267: what does `et("50% & more")` return, and why?
3. Lines 272–277: what does `block()` do to the lines you give it?
4. Lines 302–311: why are `COMMON()` and `FOLDER()` functions that *return* field lists, instead of one shared array?
5. Lines 397–420: change "Rebase instead of merge" in the app. Which line of `build()` reacts to it?
6. Lines 1679–1683: you add a new field with a `def` to a template. Old saved values don't have it. What does `vals()` do?
7. Lines 1718–1723: type a Japanese folder name in any template. What line appears, and where is it inserted?
8. Lines 1744–1765: where in the HTML file is the form written? (Search for `id="form"`.) How do its controls get there?
9. Lines 1914–1919: how does `onField` know which key to save when you type in a box?
10. Lines 1867–1881: why build every script to make the index, instead of typing the list of commands by hand?
11. Line 1941: open the app by double-click and through a local server. When is `sw.js` registered?

## Experiments I ran

## Still unsure about

## Claude's check

_(empty until reviewed)_
