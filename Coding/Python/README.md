# Learn-pane port — folder shelves

Six files, one paste. Nothing already in `index.html` is rewritten.

## 1 · Where each file goes

    Coding/Python/
    ├── index.html                    ← already there, gets 3 new lines (step 2)
    ├── shelf.html                    ← NEW  (page, must sit beside index.html)
    ├── css/
    │   └── shelf.css                 ← NEW
    └── js/
        ├── learn-shelf.js            ← NEW  rebuilds the Learn pane
        ├── shelf-data.js             ← NEW  book, modules, notebooks, accents, marks
        ├── progress-adapter.js       ← NEW  finds reading progress in localStorage
        └── shelf-page.js             ← NEW  renders shelf.html

`shelf.html` stays at the root because it is a page, not an asset — its own links
already point at `css/` and `js/`. Create the `css/` and `js/` folders if they
don't exist. (`README.md` is not used by the app.)

## 2 · One paste in `index.html`

At the very bottom, between the existing `</script>` and `</body>`:

    <script src="js/progress-adapter.js"></script>
    <script src="js/shelf-data.js"></script>
    <script src="js/learn-shelf.js" defer></script>

Order matters. That is the whole patch — do **not** delete `setupLearnRotation()`;
`learn-shelf.js` replaces the pane contents at load, so the old strip and the four
§ sections are gone anyway, and Practice keeps its own rotation untouched.

## 3 · Check

Reload `index.html`. The Learn tab shows a bookmark card and three shelves
(Books / Modules / Notebooks). Click any folder → `shelf.html?s=…`.

In the console:

    PYPROGRESS.debug()     // what reading progress was found, and where

## Making the bookmark live

The bookmark reads a normalised map of lesson id → percent. `progress-adapter.js`
already recognises several shapes (`py_0_1`, `Py_Lesson_0_1`, `{seen,total}`,
percent or fraction). If it finds nothing, add one line to each lesson page's
progress code — in `lessons/Py_Lesson_0_1.html`, inside `paint()`:

    if (window.PYPROGRESS) PYPROGRESS.write("0.1", p);

and load the adapter in that page's `<head>`:

    <script src="../js/progress-adapter.js"></script>

Use the matching id per lesson (`"0.2"`, `"1.1"`, …).

## Adding lessons later

Everything the shelves show comes from `js/shelf-data.js`:

- `PARTS` — the 13 parts. Add a `lessons: [...]` array to a part as you write it;
  a part with no written lessons renders as "planned" automatically.
- Written lessons are declared in `SEED.live.bookWritten` — add `"1.1"` etc. as
  each file lands at `lessons/Py_Lesson_1_1.html`.
- `MODS` — the module books (NumPy, Pandas, …). Lesson files are expected at
  `modules/<slug>/<n>.html`; change the path in `js/shelf-page.js` if you prefer
  them under `lessons/`.
- `SHELF` — per-folder accent colour and line-drawn mark.
