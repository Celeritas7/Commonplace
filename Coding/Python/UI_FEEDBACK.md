# Design feedback — Python book (Commonplace)

Paste the block below into Claude Design. It follows on from `UI_BRIEF.md`.

---

I'm redesigning the **Python** book in "Commonplace", my personal study-notes site.
Static GitHub Pages, hand-written HTML/CSS/JS, no framework. Shared house style
across five books; Python's identity is deep green on cream, serif headings,
mono labels. I study mostly on a **phone (390px)**, sometimes on a laptop.

Below is feedback from a review of the current pages (`index.html`, lesson pages,
notebook pages, practice cards, My Scripts). Please propose designs that fix the
problems in sections 1–4. Section 5 is context only.

## 1. Readability (every page)

- Too much text is 9–11px: tab numbers, "Runtime / Engine / Pages" labels, card
  counts, "RUNNABLE" badges, breadcrumbs, lesson meta ("8 sections · ~12 min").
  Set a floor of 12px for decoration and 13px for anything read while studying.
- Grey-on-cream text sits at 2.3–3.0 contrast (needs 4.5): breadcrumb and its
  "/" separators (1.2), lesson meta line, code line numbers, the "▶ Run" label.
  Pick one darker secondary grey and use it everywhere.
- Code blocks clip on the right on phones (lesson code 373px in a 280px box,
  notebook editors 410px in 360px) with no scroll cue. Wrap long lines on phones
  or show an edge fade.
- No dark mode. Design a dark variant of the green/cream palette; evening study on
  a phone is the main use.

## 2. Touch targets and controls (phone)

- Buttons below 44px: practice filter chips (26px), notebook Run/Reset (30–32px,
  pressed constantly), lesson reading toolbar (32px), live-shell ⏎ (30×28),
  breadcrumb links (15–18px). Bring all to 40–44px.
- The four main tabs (Learn / Practice / Mistake Bank / My Scripts) wrap to two
  rows on a phone. Needs a single-row pattern (scrolling segmented control, or
  icons + short labels).
- Practice filter chips wrap into four rows; the problem-tab row scrolls sideways
  with no edge fade and clipped titles.
- Hint / Reveal answer: the content appears *below* the buttons, off-screen, so
  tapping seems to do nothing. Show the hint/answer where the eye is.

## 3. Page structure

**Home page**
- The banner (title + live-shell demo) fills the entire first phone screen; the
  first study action is 640px down. Shrink or collapse the banner on phones.
- The **Practice tab** repeats each section three times: "Focus · rotates daily"
  strip → "All sections" grid → the sections themselves. ~3,700px tall on a
  phone. Same problem the brief described for the Learn tab, now on Practice.
- "Begin: Lesson 0.1" is the only call to action. I'd like a **"Today" block**
  instead: Resume lesson X.Y (N% read) · drills due · mistakes to re-solve ·
  today's notebook. One card, one tap each.
- The Mistake Bank tab embeds a whole page in an iframe: a second nav bar
  (Coding / Python / Mistake Drill), an email box, and an empty dashed box when
  signed out. Design it as a native tab with a proper signed-out state.
- Backup (⇅) only exists on lesson pages, not on the home page.

**Lesson pages**
- The floating toolbar (Aa − + ○ ⚑) covers the breadcrumb and progress bar at
  the top. ○ is actually the *account* chip and ⚑ is *bookmarks*; neither is
  labelled. Give the toolbar a home that doesn't overlap, and label the icons.
- No "← Previous" — only "All lessons" and "Next".
- Section-number badges sit beside 3-line headings on phones and look misaligned.
- Desktop: the "Cobra" mascot bubble (bottom-left) covers the backup button.
  XP counter top-right never changes — either make XP meaningful or remove the HUD.

**Notebook pages**
- Four stacked headers before content: dark top bar → breadcrumb → notebook hero
  card ("Python for loops", Run all / Reset all) → the imported notebook's own
  title ("🔁 Python for Loop — Complete Study & Practice Notebook"). Real content
  starts ~1.5 screens down. Collapse to one header.
- Hero text says "the first run downloads Python, needs a connection" — not true
  any more (Python is bundled). Replace with an honest status: "Python ready /
  loading / offline".
- There's no Stop button for runaway cells. Design one next to Run.
- Error output is a raw traceback including Pyodide internals. Design a compact
  error block: last line prominent, full traceback behind "show more".

**Mistake Drill page**
- 497px wide on a 390px phone (email box + sign-in button overflow); scrolls
  sideways.

**My Scripts page**
- Dark theme while every other Python page is light. Three floating action
  buttons bottom-right cover content. Align with the house style.

## 4. States that need designing

- **Offline**: home page currently freezes at "Connecting…" with no message when
  the network is down. Practice cards say "offline" while notebooks work. Design a
  single offline indicator and an offline-friendly home page.
- **Signed out** for Mistake Bank, 100 Days and attempt chains (currently an empty
  box, a blurred "made-up data" sample, or nothing).
- **Empty / not-yet-written** for the 43 planned lessons (fine today, but check).
- **Pyodide loading** (first run can take 5–10 s): a visible loading state on
  Run buttons and the live shell.

## 5. Context only — not design work

These are engineering bugs being fixed separately; mentioned so the design
accounts for them:

- Warm-ups section never renders (missing data script); 5.4 → 6.1 is a dead link.
- Two separate mistake banks (local vs cloud) will be merged into one.
- Only 3 of 32 lessons have end-of-lesson drills; the rest will get them, so each
  lesson needs an **end-of-lesson block**: 3-question recall → "Open the
  notebook" → "Mark done" → Next.
- Reading position isn't saved; "Resume" currently picks the wrong lesson.
- Practice "Focus" rotates by calendar day, ignoring what's due; it will move to
  the spaced-repetition logic that My Scripts already has (Leitner boxes,
  "Due today · N").

## What I want back

1. Phone-first mockups of: home page (Learn + Practice tabs, with the Today
   block), a lesson page (toolbar, end-of-lesson block), a notebook page (single
   header, Run/Stop, error block), and the Mistake Bank tab.
2. A type scale (floor 12/13px) and a two-grey text palette with contrast ≥ 4.5,
   plus a dark variant.
3. Component specs for: segmented tab row, filter chips, Run/Stop/Reset buttons,
   offline/loading/signed-out states.
