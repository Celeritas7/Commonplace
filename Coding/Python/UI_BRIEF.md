# Design brief — Python book launcher (Commonplace)

Paste the block below into Claude Design.

---

Redesign the launcher page for the **Python** book in "Commonplace", a personal
study-notes site. It is a static GitHub Pages site: hand-written HTML/CSS/JS,
no framework, no build step, one self-contained `index.html` per book.

## What this page is

`Coding/Python/index.html` — the front door to everything Python. The site has five
books (SQL, C & C++, Python, AI/ML, Batch Scripts); each has its own visual identity
inside one shared house style.

## The problem

The page shows the same three things in three different places, and it has just
started carrying two fundamentally different kinds of content in one list.

**Duplication.** The "Learn the syntax" tab renders, top to bottom:
1. a JS-injected strip: "Focus · rotates daily" — 2 cards
2. immediately under it: "All sections" — 3 cards, same names
3. then the actual sections themselves — same names a third time

So "Fundamentals" and "Data Libraries" each appear three times above the fold. The
strip was built when there were only three flat sections; it now adds noise, not
navigation.

**Two content types in one list.** The tab now holds:
- **§ 0 Before You Code** — a *written book*: authored lessons, prose, diagrams,
  exercises. 1 of 4 written. This is growing to **13 parts / 75 lessons**.
- **§ I Fundamentals (8)** and **§ II Data Libraries (4)** — *notebook players*:
  pages that render Jupyter cells and run them live in the browser via Pyodide.
  These are not lessons; they are runnable practice surfaces.
- **§ III Practice & Drills (8)** — which duplicates the separate "Practice" tab.

The book and the notebooks are different in kind. A reader picking "For Loops"
expects a lesson and gets a bare grid of runnable cells. Once the book has 75
lessons, a flat list of section cards will not scale at all.

## The intended structure

**The book is the spine.** 13 parts, 75 lessons:

- Part 0 Before You Code (4) · I The Basics (7) · II Decisions and Loops (5)
- III Collections (6) · IV Functions (6) · V Errors and Debugging (4)
- VI Files, Formats and the OS (4) · VII Standard Library Toolbox (7)
- VIII Object-Oriented Python (5) · IX Programs People Use (5)
- X Talking to the Internet (4) · XI Data Libraries (11)
- XII Automating the Boring Stuff (7)

Only 1 lesson exists today; the rest must show as planned without looking broken
or shouting for attention. Most parts will sit at 0 written for months.

**The notebooks are companions, not peers.** Each lesson links out to its matching
notebook player as its "Try it" surface. The notebooks should stay reachable
directly — but they should read as a *tool*, not as a second curriculum competing
with the book.

**Three tabs stay:** `01 Learn the syntax` · `02 Practice` · `03 Mistake Bank`.
Practice and Mistake Bank are JS-generated and out of scope — do not redesign them,
but keep their tab chips and switching behaviour intact.

## What to design

1. **A part-based Learn pane** that holds 13 parts and 75 lessons without becoming a
   wall. Collapsed by default is fine. Show per-part progress (lessons read /
   lessons written / lessons planned — three states, not two).
2. **A clear split** between the book and the notebook players. Decide the
   relationship and make it legible at a glance.
3. **Kill the duplication.** The daily-focus strip either earns its place by doing
   something the section list can't, or it goes. Your call — argue for it.
4. **A "continue where you left off" affordance.** Reading progress is already
   stored in localStorage; surface it instead of making the reader hunt.
5. **The empty state.** With 1 of 75 lessons written, the page must feel like a
   book that has begun, not a site that is broken.

## Constraints — these are fixed

**Palette** (already the Python book's identity — keep it):
```
--paper:#eceee4  --paper-2:#f4f5ec  --card:#fbfcf6
--ink:#1a2820    --ink-soft:#41564a --ink-mute:#7a8c80
--line:#d2dacb   --line-soft:#e0e6d8
--green:#2f6b4f  --green-2:#3c8362  --green-dk:#234f3b  --green-deep:#16352a
--sage:#7fa68b   --sage-soft:#dde7dd --brass:#a98a4b
```
Warm sage-green on paper. The other books are oxblood-on-cream (SQL), warm cream
and orange (C), graphite and amber (Batch) — do not drift toward any of those.

**Type:** Cormorant Garamond (display) · EB Garamond (body) · JetBrains Mono
(all chrome, labels, code). Served locally from `../../_lib/fonts/`.

**Tech:** one static HTML file. Inline CSS and JS. No React, no Tailwind, no build
step, no external requests. Progress lives in `localStorage`. The page is served
from a plain local HTTP server and from GitHub Pages.

**Existing masthead:** a dark green panel with a live Python shell mock
(`>>> print("hello, world")`) and three stats — runtime / engine / pages. It works
and is on-brand. Keep it, or improve it, but keep its spirit.

**Paths that must keep working:**
```
lessons/Py_Lesson_0_1.html        the book
fundamentals/01_random_module.html … 08_functions.html   notebook players
libraries/numpy.html, pandas.html, pandas_practice.html, matplotlib.html
practice/*.html    100_days/index.html    fundamentals/mistake-drill.html
```

## Audience of one

Aniket — a mechanical engineer in Japan who already knows C and is learning Python
alongside four other languages here. He reads these to re-read them. The site's own
description: "a library of study notes, written to be re-read." Calm, bookish,
unhurried. Not a bootcamp, not a dashboard, no streaks-and-badges gamification on
this page.

## Deliver

A full-page design for the Learn pane in the states that matter: the default view,
a part expanded, and the near-empty reality of today (1 lesson written of 75).
Show the notebook players in whatever relationship you decide. Explain the
information architecture choice in a sentence or two.
