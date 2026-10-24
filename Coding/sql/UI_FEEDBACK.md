# Design feedback — SQL book (Commonplace)

Paste the block below into Claude Design. It follows on from the Python book's
`Coding/Python/UI_FEEDBACK.md`; the SQL book should end up feeling like a sibling
of the redesigned Python book.

---

I'm redesigning the **SQL** book in "Commonplace", my personal study-notes site.
Static GitHub Pages, hand-written HTML/CSS/JS, no framework. Shared house style
across five books; SQL's identity is oxblood (#8a2f22) on cream paper, serif
headings (Cormorant / EB Garamond), mono labels (JetBrains Mono), and dark
terminal panels for the query console. A real SQLite database (sql.js) runs in
the page, so every example can be run. I study mostly on a **phone (390px)**,
sometimes on a laptop.

The pages: `index.html` (home: The Lab console, the SQL Funnel, module list,
practice cards), `The Modules/module-01…10.html` (the book), `Practice/sqlzoo.html`
(19 auto-checked exercises) and `Practice/mistake-drill.html`.

Below is feedback from a review of the current pages at 390px and 1366px.
Please propose designs that fix the problems in sections 1–4. Section 5 is
context only.

## 1. Three different looks — make it one book

- Modules 1–2 use one design (tab strip at the very top, a stats card on the
  right of the title, an editor with chip examples).
- Modules 3–10 use another (sticky crumb bar + sticky module tab strip, an
  "In this module" list above the title, "Run query →" playgrounds).
- The practice pages (SQLZoo, Mistake Drill) use a third (sans-serif, chunky
  shadowed cards, red primary buttons).
- Please design **one** module-page template and one practice-page style that
  all of these share, using the same tokens as the redesigned Python book
  (type scale, greys, radii, button sizes, light/dark).

## 2. Phone layout (390px)

- **Pages scroll sideways.** Module 1 is 313px wider than the screen; Modules
  3–8 and 10 are 137–146px wider; the home page is 44px wider. Causes: the
  crumb-bar links (Lab · Funnel · Modules · Practice) that don't wrap, the
  "📚 0 / 10 done" pill, and the home section notes ("click a table to peek ·
  ⌘/Ctrl + ↵ to run", "click a clause to run it") which are `nowrap`.
- **The top of a module eats the screen.** Two sticky bars take ~105px, and the
  "▸ Practice & Exercises" pill wraps onto three lines and overlaps the bar.
  One compact bar on phones, please.
- **Home masthead:** the tagline is squeezed into a narrow column beside the
  "Engine · Schema · Tables · Runs" seal, so it runs 10 lines of 2–3 words.
  Stack them on phones.
- **Long module tab strip** (01 retrieving data … 10 capstone) scrolls with no
  cue that there's more. Replace on phones with a compact "Module 4 of 10 ▾"
  picker, or add edge fades.
- **Result tables** scroll sideways inside the dark panel with no cue
  (RENTAL_… cut off). Add an edge fade or a "scroll →" hint.
- **Mistake Drill:** the floating 🔖 ★ ☰ buttons and the Quiz pill sit on top
  of the full-width "Go practice →" button.

## 3. Readability and touch targets

- Lots of text under 12px: kickers, section numbers ("§ I"), seal text, module
  meta ("11 challenges"), tab numbers, the 10–10.5px quick-nav links, chip
  labels, result footers. Same floor as Python: 12px decoration, 13px for
  anything read while studying.
- Many controls are under 32px tall on phones (≈100 on Module 5): Reset,
  Show hint, Show solution, Mark as done, chips, Clear. Aim for 44px.
- Grey-on-cream labels (`--ink-mute` #8a7c63) are too light for small text;
  pick one darker secondary grey, as in Python.

## 4. Missing pieces to design (the Python book has these)

1. **Module reader toolbar** — text size, a sections sheet ("In this module"),
   and a Previous / Next bar fixed at the bottom on phones (bottom-right pill on
   desktop). Today the only way around is the long tab strip.
2. **End-of-module block** — "Check yourself · 5 questions" → result →
   Next module. The Python book has a *soft* gate: if you skip the check, Next
   asks once ("Take the check first? / Continue anyway"). Today SQL modules end
   with a plain "What's next" paragraph.
3. **Exercise states** — module challenges are only self-marked ("Mark as
   done"). Please design the checked flow the SQLZoo page already has, inside
   the module: not tried / wrong (show the diff: your rows vs expected) /
   right / revealed. Also a "try first" guard before Show solution, and stepped
   hints (hint 1 → hint 2 → solution) instead of one reveal.
4. **Home: Today / Resume card** — "Continue Module 4 · Lesson 4.2", mistakes
   due, next unfinished challenge. The home has no "where was I" today.
5. **Native Mistake Bank** — one bank fed by module challenges *and* SQLZoo,
   working offline on the device. States: empty, due today, nothing due yet,
   just fixed. Today the drill only fills from SQLZoo and only when signed in.
6. **Sign-in chip on home** (as in Python) — today sign-in lives only at the
   bottom of the SQLZoo page ("Email me a link").
7. **Light / dark switch** — none today (only Module 4 has partial dark CSS).
   The terminal panels should stay dark in both.
8. **Module cards on home** — progress for Modules 1–2 is stuck at 0 (see 5);
   Module 9 (PostgreSQL with Python) counts 9 challenges that can't be run or
   ticked here. Show it as "read-only · run in pgAdmin/Python" instead of 0/9.

## 5. Context only — not design work (Claude Code will fix these)

- `sql-kb-fix.js` (keeps the phone keyboard closed unless you tap a query box)
  never loads: every page points at `sql/lib/`, the file is in `sql/Practice/`.
- Modules 3–10 point at `reading-sync.js` / `funnel-interactive.js` in the
  wrong folder (404), so module progress is never synced to the cloud; it lives
  only in this browser (`commonplace_module_exercises_progress`).
- Modules 1–2 are 2 MB bundled pages with no "Mark as done" buttons, so they
  can't record progress. They will be rebuilt in the Modules 3–10 format.
- Quiz banks exist only for Modules 1–2; Modules 3–10 get generated questions.
- The SQL service worker is network-first with no precache, so only pages
  already opened work offline.
- "Practice & Exercises" links go to `exercises.html`, which just redirects to
  `sqlzoo.html`.
- ~60 MB of old `_Temp/` and `Temp/` copies in the folder.

## What I want back

- One module-page template (phone + desktop), including the toolbar, sticky
  header, playground, challenge states and end-of-module block.
- The home page at 390px: masthead, Today/Resume card, sign-in chip, module
  cards (incl. read-only Module 9).
- Mistake Bank states.
- Tokens shared with the Python book (light + dark), so both books can use the
  same `lib/tokens.css`.
- Deliver as files I can drop in, like the Python steps, with a note of which
  files each step replaces.

---

## Split of work

| Phase | Who | What |
|---|---|---|
| 1 | Claude Code | Fix the paths in section 5 (kb-fix, reading-sync), phone overflow, Mistake Drill overlap, sticky-bar height, point "Practice & Exercises" straight at `sqlzoo.html` |
| 2 | Claude Code | Rebuild Modules 1–2 in the 3–10 format; quiz banks for Modules 3–10; end-of-module check + soft gate (reusing the Python quiz layer) |
| 3 | Claude Design | Sections 1–4: shared template, toolbar, challenge states, home Today card, Mistake Bank, theme |
| 4 | Claude Code | Wire Design's files in: auto-checked module challenges, local Mistake Bank fed by modules + SQLZoo, Today card data, precache for offline |
