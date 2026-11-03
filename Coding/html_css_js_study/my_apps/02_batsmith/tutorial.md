# BatSmith — how it works

A tutorial on my own app. The app itself is **not** stored here: open it from
`Offline_apps / Coding/BatSmith/index.html` (or Drive, `App_generation_offline/Coding/Batsmith/index.html`) and read
it side by side. Line numbers refer to that file (1,947 lines, snapshot 2026-11-03).

**Kind 1: one-file app** (it also installs as an app when served over http, which makes it kind 4 too).
Bootcamp lessons it uses: 26 forms · 45–50 layout · 109–113 strings · 132–137 arrays and loops · 141–148 DOM ·
163–172 events · 167–169 objects and methods · 168 switch.

## The big idea: templates are data

BatSmith never contains 28 finished `.bat` files. It has **28 template objects** in one array `T`, and each one knows how
to *build* its script from the options you pick. Change an option and the script is rebuilt from scratch.

```
pick a type (T[i]) → its fields become a form → your values (o) → T[i].build(o) → lines → highlighted preview
                                                                                       └→ download .bat / copy
```

## Lines 1–172 — head and CSS

- Colour tokens with three themes: **auto** (follows the computer), **light** and **dark**.
- Classes `tk-k`, `tk-v`, `tk-s`, `tk-o`, `tk-c`, `tk-l` colour the preview: keywords, variables, strings,
  operators, comments, labels.

## Lines 174–252 — the screen

- `<header class="appbar">`: buttons for the command index (`#idxBtn`), the saved library (`#libBtn`) and the theme (`#themeBtn`).
- `<main>`: a search box (`#q`) and the list of types (`#tlist`), the form (`#form`) with the file name, and the preview
  (`#code`) with Copy, Save, Download and "Explain every line".
- Two `<dialog>` elements: the **command index** and **saved scripts**. A `<dialog>` is a built-in pop-up:
  `showModal()` opens it, `close()` closes it, and Esc works for free.

## Lines 258–283 — helpers: one line = `{ c, w }`

Every generated line is an object: `c` is the **code**, `w` is the **why** (the explanation shown when you click the line).

```js
var L = function (c, w) { return { c: c, w: w || "" }; };
```

Small helpers build common pieces: `rem()` adds a comment if comments are on, `echo()` and `et()` make text safe for
`echo` by escaping the characters cmd would act on (`^ & | < > ( ) %`), `block()` indents the body of an `if ( … )` block,
and `fail()` writes the standard "print an error, pause, exit /b 1" lines.

## Lines 285–392 — shared fields and pieces

Many templates need the same options (which folder, window title, what happens at the end, git remote and branch).
They are written once, as functions that return **field lists**: `FOLDER()`, `COMMON()`, `GIT_FIELDS`. Each field is
plain data:

```js
{ k: "title", label: "Window title", type: "text", def: title }
```

`k` is the key in your values, `type` says which control to draw, `def` is the default, and an optional
`show: function (o) { … }` hides the field when it doesn't apply.

`head()` writes `@echo off`, the title and `setlocal`. `findPython()` writes the lines that look for `py -3` or `python`.

## Lines 394–1671 — the 28 templates

Each `T.push({ … })` is one type. The first one, **Git pull** (lines 397–420), shows the full shape:

- `id`, `name`, `cat` (category), `file` (default file name), `blurb`, `concepts` (the batch ideas it teaches);
- `fields`: the form, assembled from the shared pieces plus its own options;
- `build(o)`: returns the list of lines, written with `head()`, `rem()`, `L()`, `block()` and so on;
- `warn(o)`: notes shown above the preview (for example "Test git scripts in a throwaway repo first").

The rest follow the same shape: files and text (backup, clean up, find text, sort…), loops, menus and small games,
launchers, system and network tools.

## Lines 1673–1683 — state

All your choices live in one object `S`, saved under `localStorage` key `batsmith_v1`: the chosen type (`S.tpl`),
the values per type (`S.vals`), file names and the saved library. `vals(t)` merges your saved values with each
field's default, so a new field in a later version still gets a value.

## Lines 1685–1711 — the syntax highlighter

Three regular expressions (`RX_FULL`, `RX_TEXT`, `RX_STR`) find strings, `%variables%`, keywords and operators.
`paint()` walks through the matches and wraps each in a `<span class="tk-…">`, escaping everything in between.
`hl(line)` handles whole-line cases first (comments, labels, `echo` text), then calls `paint()`.

## Lines 1713–1784 — drawing the screen

- `gen(t, o)` calls `t.build(o)` and, if any line has non-English characters, inserts `chcp 65001` so cmd reads
  the file as UTF-8.
- `renderList()` groups the types by category and filters them by the search text.
- `renderForm()` turns the field list into HTML: a checkbox, a `<select>`, a `<textarea>` or an `<input>` per field.
  **The form is not written in the HTML at all**: it's generated from data.
- `renderOut()` builds the script, numbers the lines, highlights them and adds the explanation under each line.
- `all()` = list + form + preview.

## Lines 1786–1828 — files and the library

`download()` makes a `Blob`, a temporary URL and an `<a download>` and clicks it, the same pattern as the workshop's
export (lesson 5.2). Line ends are `\r\n`, because Windows batch files expect them. **Save** stores the current type,
values and file name in `S.lib`.

## Lines 1830–1897 — the command index

`buildIndex()` **generates every template's script** (with default options, plus a few extra option sets) and searches
the text for each command (`robocopy`, `for /f`, `choice`…). So the index can never claim a type uses a command it
doesn't actually write.

## Lines 1898–1944 — events and start-up

- One `input` and one `change` listener on the whole form call `onField()`, which reads the changed field's id
  (`f_title` → key `title`), saves the value and redraws only the preview. That is event delegation again.
- A click on a preview line toggles its explanation; the "Explain every line" box shows them all.
- The service worker is registered **only** over `http(s)`, so double-clicking the file still works.
- Everything sits inside `(function () { … })();` so its many names (`T`, `S`, `L`…) don't leak into the page.

## What to look for when you read it

- How one data shape (`T.push({ fields, build })`) replaces 28 separate pages.
- Where a value flows: form → `onField` → `S.vals` → `vals()` → `build(o)` → preview.
- How the explanation travels with each line (`{ c, w }`) instead of living in a separate file.
