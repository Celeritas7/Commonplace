# Phase 0 + Phase 1 (batch 1) — drop-in

Copy these into your `Python/` folder. **No HTML edits, no `build.py` edits, and a
rebuild with `build.py` will not undo any of it** — everything hangs off
`lib/lesson-reader.js`, which is already on all 32 lesson pages.

## What to copy

    lib/lesson-reader.js      → Python/lib/lesson-reader.js   (replaces existing)
    lib/lesson-drills.js      → Python/lib/lesson-drills.js   (new)
    lib/lesson-drills.css     → Python/lib/lesson-drills.css  (new)
    lib/drills/0_2.js         → Python/lib/drills/0_2.js      (new folder)
    lib/drills/0_3.js         → Python/lib/drills/0_3.js
    lib/drills/0_4.js         → Python/lib/drills/0_4.js

Do **not** copy `lib/random/fd.js` (you already have it, unchanged) or
`Py_Lesson_0_4.html` — those two are only here so the folder previews on its own.

## Phase 0 — reading-page UI

**Now fixed at source.** `reading-sync.js` is the file that makes the panel: it is a
top-right pill on desktop, but its `@media(max-width:600px)` rule moved it to
`bottom:10px` — that is the slab across the bottom of the phone. The patched copy
in this folder collapses it to a 34px chip (bottom-left, above the `⇅` backup
circle, clear of the home bar) that opens on tap. Every subject page that loads
`reading-sync.js` — SQL, VBA, C — gets the fix, not just Python.

    reading-sync.js  → <the folder two levels above Python/>/reading-sync.js

`progress-backup.js` is unchanged and included only so the demo page runs.

**The ★ and the red pin are not from this app.** `progress-backup.js` draws one
bottom-**left** `⇅` circle and nothing else; `reading-sync.js` draws only the sync
bar and, in toggle mode, an inline "○ Mark read" pill. Neither makes a ★ or a pin,
and the lesson pages load nothing else — so those two round buttons at bottom-right
are your mobile browser's own UI. There has never been a "bookmark this spot"
control in a lesson: the Learn shelf's Bookmark card is computed from reading
progress, and the only manual marker is `⚑` in the top pill.


- The fixed "✓ Synced · email · Sign out" panel is hidden and now opens from a
  small **✓ chip** in the top pill, next to `⚑`. Tapping outside closes it.
  Chip shows `✓` when signed in, `○` when signed out.
- Fixed bottom-anchored floaters (the **★ bookmark**, the red pin, toasts) get
  `margin-bottom: env(safe-area-inset-bottom)` so the phone's home bar no longer
  sits on them. With the panel collapsed they are no longer covered either.
- The flag sheet also respects the safe-area inset.

On lesson pages `lesson-reader.js` takes over from the chip above: it matches
`#reading-sync-bar` by id, hides reading-sync's own chip, and hangs the panel under
the top pill. So the two fixes do not fight — apply both.

## Phase 1 — drills in lessons

`lesson-reader.js` looks for `lib/drills/<lessonId>.js` (e.g. `0_4` for
`Py_Lesson_0_4.html`). If it exists it loads `lib/random/fd.js`,
`lesson-drills.css` and `lesson-drills.js` and appends a **section 9 — Drills**
to the page. Lessons without a drill file are untouched.

Per variant: one fill-the-blank, one spot-the-bug — same two kinds as the random
module, reusing the same `FD` engine.

**Soft lock.** Variant 1 is open. Drill 2 opens once drill 1 is answered (right or
wrong). The next variant opens once its pair is answered. **Skip ahead** opens
everything, and the rail dots are clickable. Progress is per lesson in
`localStorage` under `lsd:<id>`; "Bank it" on a wrong answer appends to `lsd:bank`
(the hook Phase 4 will read). XP and the toast work whether or not `lesson.js`
exposes `addXp`.

### Batch 1 written

| Lesson | Variants | Drills |
|---|---|---|
| 0.2 Installing Python | which python · sys.executable · conda vs pip | 6 |
| 0.3 Script, REPL, notebook | script · REPL · notebook | 6 |
| 0.4 Reading a traceback | bottom-up · type: detail · SyntaxError · moment of use | 8 |

0.1 is hand-authored outside the builder — it gets drills in batch 2 once I've read it.

### Adding a lesson later

Write `lib/drills/<part>_<n>.js` setting `window.LESSON_DRILL_DATA` to an array of

    { name, title, concept,
      d1: { kind, ask, code, blanks:[{a, lures:[…]}], why },
      d2: { kind, ask, code, options:[…], answer:<index>, why } }

`{{1}}`, `{{2}}` … in `d1.code` are the blanks, in order. Nothing else to wire up.
