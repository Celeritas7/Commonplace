# Handoff: Python & SQL Practice + Mistake Bank (Supabase-driven)

## Overview
This bundle upgrades the **Commonplace** study app's Coding section. It adds an
interactive "practice loop" for Python and SQL, and makes the index pages
**data-driven from Supabase** instead of hand-written HTML.

The practice loop: a learner works graded problems one at a time (solved ones
hide), runs real code in the browser, and every attempt is logged. A failed
attempt can be **saved to a "bank"** (Supabase), and banked failures become a
**Mistake Drill** — a quiz the learner re-solves by hand until each is cleared.

Target app: a static multi-page site (vanilla HTML/CSS/JS) at
`Commonplace/Coding/` with pages like `Python/index.html`, `sql/index.html`,
`sql/sqlzoo.html`. It already uses Supabase (magic-link auth, tables
`commonplace_exercises`, `commonplace_attempts`, `commonplace_mistakes`) and
loads its "100 Days" viewer dynamically. Engines already in use: **sql.js**
(SQLite WASM) and **Pyodide** (CPython WASM).

## About the design files
The files in `refs/` are **design references built in HTML/React-via-Babel** —
working prototypes showing the intended look and behaviour, **not** production
code to ship as-is. The task is to **recreate them in the app's existing
environment** (vanilla JS + the app's CSS classes and Supabase client), matching
the established patterns in `Python/index.html` / `sql/sqlzoo.html`. The React
(`.jsx`) prototypes are the source of truth for layout, colours, and behaviour;
port them to the app's plain-JS render style (the app builds DOM via template
strings, e.g. `renderExerciseCard`, `cardHtml`).

If you prefer, the prototypes also run standalone as-is (see
`refs/standalone/*.html`) and can be embedded via `<iframe>`, but the intended
outcome is native integration.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, and interactions are all
specified below and present in the reference files. Recreate pixel-for-pixel
using the app's fonts (Cormorant Garamond / EB Garamond / JetBrains Mono) and the
existing `.sec` / `.card` / terminal styles.

---

## Part A — Data-drive the index card grids
Make **Fundamentals (§I)**, **Data Libraries (§II)** and **Practice & Drills
(§IV)** load from a new `commonplace_pages` table.

- DDL + seed: `refs/supabase/commonplace_pages.seed.sql` (run once).
- Reference renderer: `refs/supabase/python-sections.js` — emits the app's exact
  `.sec` / `.sec-head` / `.cards` / `.card` markup. Group by `section_key`, order
  by `section_order` then `card_order`.
- Integration: replace the three static `<section>` blocks in `Python/index.html`
  with `<div id="dyn-sections">…fallback…</div>` and run the renderer after the
  Supabase client (`window.sb`) is created.
- Lesson **content stays as existing pages**; the table only stores the card
  index (`idx` badge, `title`, `href`, `card_order`, `status`).
- Degradation: on offline / empty table / missing client, keep whatever is inside
  `#dyn-sections` (paste the old sections there as fallback).

Do the same for the SQL index's module/practice grids if desired (same table,
`subject = 'sql'`).

## Part B — The Practice & Mistake Bank (Python §III, and SQL "SQLZoo Practice")
Reference components:
- Python: `refs/python/python-practice-lab.jsx` (+ data `python-practice-data.js`)
- SQL: `refs/sql/sqlzoo-lab.jsx` (+ `sqlzoo-seed.js`, `sqlzoo-exercises.js`)

Render this **inline** in Python `index.html` §III (replacing the attempt-chain
cards in `#hd-body`) and in the SQL practice page. Feed it the learner's real
`commonplace_exercises` rows (grouped by their `section` tag, e.g.
"Section 3: Control flow and logical operator").

### Screen: Practice section
- **Header**: `§ III` kicker (mono, 12px, bold, green `#2f6b4f`), title in
  Cormorant Garamond 32px, a count pill, and an engine-status pill
  ("CPYTHON READY" / "engine ready") with a state dot (amber loading → green
  ready → red error). Italic EB Garamond description below.
- **Auth line**: email input + "Email me a link" button (magic-link). When signed
  in, shows "Signed in as <email>" + Sign out. Save-to-bank is gated on this.
- **Progress bar**: `<n> / <total> solved`, fill colour = accent
  (Python green `#2f6b4f`, SQL oxblood `#8a2f22`).
- **Problem tab strip** (sticky, horizontal scroll): one pill per *unsolved*
  problem (`P1`/`W1` badge + title + ✓ when done). Solved problems drop out of
  the strip (reappear when all are solved). Active pill = ink background `#211b13`.
- **Problem card**:
  - Badge (id), title (EB Garamond 18px 600), section label, difficulty dots
    (1–3 filled), ✓ when solved (green `#2f8f5b`, inset 3px left border on card).
  - Prompt (HTML, EB Garamond 16px).
  - **Code editor** — see "Editor" below.
  - **Keyword tray** — see below — directly **above** the editor.
  - Buttons: `▶ Run & Check` (filled accent), `⤢ Fullscreen`, `Hint`,
    `Reveal answer` (ghost). Hint = amber callout; Reveal = highlighted code block.
  - **Feedback**: green success / red error mono chip.
  - **Output**: dark panel (`#16352a` Python / `#0b0e13` SQL). Python shows
    captured stdout; SQL shows the result grid (sticky header, right-aligned
    numbers, NULL italic dim).
  - When solved: full-width green **Next →** button advances to next unsolved.
  - **Attempts log** (collapsible, dashed top border): newest-first list, each row
    = ✓/✕ badge, the submitted code (syntax-highlighted), reason ("solved" /
    "wrong result" / error), relative time. A failed row shows **Save to bank**
    (gated on sign-in → reveals the auth line if signed out; on success →
    "Saved to bank ✓").

### Editor (shared, inline + fullscreen)
- Dark editor: a syntax-highlighted `<pre>` underlay + a transparent `<textarea>`
  on top (caret/selection live; colours show through). Identical font/size/
  padding/line-height on both layers; sync scroll. `⌘/Ctrl+Enter` = Run & Check.
- **Highlighting** — Python: keywords pink `#e08aa6`, builtins teal `#8fd0b0`,
  strings olive `#a6c97a`, numbers amber `#e0b36b`, comments dim italic `#7e9486`.
  SQL: keywords blue-bold `#79b8ff`, functions cyan `#56b6c2`, strings olive
  `#a6c97a`, numbers amber `#e3b341`, comments dim italic `#6b7689`.
- **Keyword tray**: collapsible ("Hide keys" / "Insert keywords…"). Row 1 =
  language keywords (Python: `def for while if elif else: in range( return import
  not and or True False None`; SQL: `SELECT DISTINCT FROM WHERE AND OR ORDER BY
  DESC GROUP BY HAVING LIMIT JOIN ON COUNT( SUM( AVG( LIKE IN ( BETWEEN = * , ' '`).
  Row 2 = builtins/snippets (Python: `print( input( len( int( str( sum( sorted(
  enumerate( ":" [] {} " "`) or, for SQL, the **current exercise's tables +
  columns** (table chip + its column chips). Tapping inserts at the caret.
- **Fullscreen**: fixed overlay. Python overlay bg = dark green `#16352a`; SQL
  overlay bg = **warm paper `#efe7d6`** (with the page's subtle radial highlights)
  while the editor itself stays dark. Top→bottom: header ("EDITOR · FULLSCREEN" +
  Exit/Esc), **the question** (badge + title + prompt), **the keyword tray**, the
  editor (fills), the run controls, then **feedback + output**. Esc exits.

### Grading
- **Python**: run code in Pyodide. Prepend a harness that captures stdout to a
  `StringIO` and overrides `input()` to pop from a per-exercise `stdin` list.
  Compare normalised stdout (trim trailing whitespace per line, strip trailing
  blank lines) to the exercise's `expect`. Runtime errors → show the last
  traceback line.
- **SQL**: run the learner's query and the reference `sol` on the live sql.js DB;
  compare result sets. If `order` is true, also compare row order; otherwise
  compare order-independently.

## Interactions & behaviour
- Tab strip hides solved problems; "Next →" jumps to the next unsolved.
- Run & Check logs an attempt (pass/fail) under the problem; identical
  consecutive attempts are de-duped.
- Save to bank: if signed out → reveal/focus the auth line and abort; if signed
  in → insert into `commonplace_attempts` (+ a `commonplace_mistakes` row for
  failures) and mark the attempt "Saved ✓" (idempotent).
- Mistake Drill: lists banked failures; "Start drill" queues unresolved ones;
  each drill re-poses the problem with "you missed this before: <reason>", grades
  the same way, and on success marks the mistake resolved (drops off the list).

## State management
Per learner, persisted (the prototypes use localStorage; in the app use Supabase
+ a local cache):
- `solved` map (exercise id → bool)
- `attempts` map (exercise id → [{ code, ok, msg/reason, ts }]) — mirrors
  `commonplace_attempts`
- `bank` map (key → { exId, section, title, reason, resolved, ts }) — mirrors
  `commonplace_mistakes`
- in-progress `code` per exercise
- auth/session (already handled by the app's Supabase magic-link flow)

## Data model (Supabase)
- **New** `commonplace_pages` — see `refs/supabase/commonplace_pages.seed.sql`
  (`subject, section_key, section_no, section_title, section_desc, section_order,
  idx, title, href, card_order, status`). Public read; writes restricted.
- **Existing** `commonplace_exercises` (prompt/title/section/solution/expected),
  `commonplace_attempts` (user_id, subject, language, code, passed, stderr,
  exercise_id), `commonplace_mistakes` (user_id, attempt_id, exercise_id, subject,
  reason). The prototypes' "Save to bank" simulates these inserts — wire them to
  the real tables (RLS `auth.uid() = user_id`).

## Design tokens
- **Python accent** green `#2f6b4f` (deep `#16352a`, light pill bg `#dde7dd`,
  border `#7fa68b`). **SQL accent** oxblood `#8a2f22`.
- Paper `#efe7d6` / `#f6f0e2` / `#fbf7ec`; ink `#211b13` / soft `#564b3a` /
  mute `#8a7c63`; rule `#cdbfa3` / soft `#ddd1b8`.
- Terminal: bg `#0e1116`/`#16352a`, text `#c9d4e3`/`#d7e8dd`, dim `#6b7689`.
- States: ok `#2f8f5b`, error `#c2502f`/`#b3261e`.
- Radii: cards 10–12px, chips/pills 8–20px. Card hover: `translateY(-2px)`.
- Fonts: display **Cormorant Garamond**, body **EB Garamond**, mono
  **JetBrains Mono** (Google Fonts).

## Assets
No image assets. Engines from CDN: sql.js `1.10.2`
(`cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/`), Pyodide `0.26.4`
(`cdn.jsdelivr.net/pyodide/v0.26.4/full/`). Pyodide is ~10 MB on first load.

## Files in this bundle
- `refs/python/python-practice-lab.jsx`, `refs/python/python-practice-data.js`
- `refs/sql/sqlzoo-lab.jsx`, `refs/sql/sqlzoo-seed.js`, `refs/sql/sqlzoo-exercises.js`
- `refs/supabase/commonplace_pages.seed.sql`, `refs/supabase/python-sections.js`
- `refs/standalone/python-practice.html`, `refs/standalone/sql-practice.html`
  (runnable hosts — open to see the exact intended UI/behaviour)
