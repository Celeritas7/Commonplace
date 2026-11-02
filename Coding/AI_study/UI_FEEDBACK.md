# AI / Machine Learning — UI review

Reviewed 1 Nov 2026, on a phone (390 px wide) and an iPad (820 px wide).

**Pages looked at:**
- the landing page (`index.html`)
- the notebook reader (`book/reader.html`)
- the notes hub (`notes/index.html`)
- the Géron hub (`notes/geron/index.html`)
- a Géron chapter note (ch 4)
- the gradient-descent note
- the two flowchart notes (`foundations/ch1`, `projects/ch2`)

**How:** each page was opened in a headless browser. I measured overflow, button sizes and text sizes, ran a code cell, and took screenshots.

**Overall:**
- **What works:**
  - The landing page and the reader look striking.
  - The notes pages are clean and easy to read.
  - The reader's study features are good ideas: recall questions, margin notes, the hands-on "lab", and the section tabs.
- **What's wrong:** the problems are mostly not about looks.
  - The first cell of most notebooks fails.
  - Half the section can't be reached from its own front page.
  - Nothing works offline.
  - Many controls are too small for a finger.

Items are ordered by how much they hurt studying, worst first.

---

## P1 — Broken or blocking

### 1. The first code cell fails in 11 of the 18 notebooks
**What happens:**
- Pressing **▶ Run** on the first cell of *04 Linear Models* gives:
  ```
  File "<exec>", line 4
      %matplotlib inline
  SyntaxError: invalid syntax
  ```
- The same happens in 11 notebooks, and 26 cells across 16 notebooks start with a `%` or `!` line.
- Those lines are Jupyter commands, not Python.
- Because the whole cell fails to compile, its imports (`numpy`, `pandas`, `matplotlib`) never run, and every later cell fails with `NameError`.

**Why it matters:** the very first thing a learner does in a chapter is broken.

**Fix:**
- In `book/js/reader.js`, inside `exec()` at about line 398, remove lines starting with `%` or `!` before running the code. Better still, show them greyed out as "Jupyter-only line, skipped here".
- The Python app's notebook player already does exactly this (`Coding/Python/lib/notebook-player.js`).
- It's about a 3-line change.

### 2. The notes and the Géron hub can't be reached from the AI page
**What happens:**
- The landing page links only to the 18 notebook chapters, plus JupyterLab, File browser and REPL.
- Nothing on the site links to `notes/index.html`, `notes/geron/index.html`, or any of the 12 note pages.
- You can only get there by typing the address.

**Fix:**
- Add a "Notes & book" block to the landing page (`book/js/app.jsx`), with a card for the **Géron hub** and one for **All notes**.
- Each notebook chapter could also link to its matching Géron note. For example, *04 Linear Models* ↔ *Géron ch 4 Training Models*.

### 3. The two flowchart notes show an empty box without internet
**What happens:**
- `notes/foundations/ch1-ml-landscape.html` and `notes/projects/ch2-end-to-end-project.html` draw their flowchart with **Mermaid**, loaded from `cdn.jsdelivr.net`.
- When that doesn't load (offline, a slow connection, or a blocked CDN), the page shows a large empty white card, and the console says `mermaid is not defined`.

**Fix:**
- Keep a local copy of `mermaid.min.js` in `_lib/`, the same way React, CodeMirror, KaTeX and Pyodide already are.
- Show the flowchart's source text as a fallback if it still can't draw.

### 4. Nothing in this section works offline, even though local copies exist
| Page | Loads from the internet | Local copy already in the repo |
|---|---|---|
| Landing | React + ReactDOM (**development** builds) and Babel, from unpkg | `_lib/react/` |
| Reader | `marked`, from jsdelivr | `_lib/marked.min.js` |
| Reader | CodeMirror + Python mode, from cdnjs | `_lib/codemirror/` |
| Reader | Pyodide 0.26.4, from jsdelivr | `_lib/pyodide/` (same version, 0.26.4) |
| Notes | KaTeX, from cdnjs | `_lib/katex/` |
| Flowcharts | Mermaid, from jsdelivr | none yet (see item 3) |

Also:
- None of these pages registers the site's service worker, so even after one visit, nothing is cached for offline use.
- JupyterLite's own `service-worker.js` covers only the JupyterLab views.

**Fix:**
- Point every `<script src>` above at `_lib/`.
- Add a small service worker for `Coding/AI_study/` that caches the book, notes and notebooks, following the pattern in `Coding/Python/sw.js`.
- Two caveats:
  - Packages like scikit-learn (used in 169 cells) still need the internet the first time, unless their wheels are copied into `_lib/pyodide/`.
  - 7 cells read local CSV files that aren't in the repo, so those cells will always fail. Either add the files or note this beside those cells.

### 5. The landing page is wider than a phone screen
- On a phone, the page is 447 px wide on a 390 px screen. On an iPad it's 870 px on 820.
- The title's "Learning" is cut off at the right edge, and the intro sentence runs off the screen.
- The cause is the large serif title and the decorative "seal" element.

**Fix:** use a `clamp()` font size for the `h1` (about `clamp(40px, 11vw, 76px)`), and stop the seal and kicker from setting a width.

---

## P2 — Comfort on phone and iPad

### 6. Buttons and links are too small to tap
The target is 44 × 44 px.

| Where | Measured |
|---|---|
| Reader top bar: FOCUS/PAGE, PAPER/DARK, ALIVE/STILL toggles | 46–54 × **21** px |
| Reader "AI_Study" breadcrumb | 64 × **11** px |
| Reader section ← → buttons | about 24 × **20** px |
| Landing filter chips (All / Foundations / Core / Advanced / Done / Revisit) | about 70–118 × **27** px |
| Landing ✓ / ↻ buttons on each card | about 22 × 22 px |
| Landing breadcrumb "Commonplace / Coding" | 18 px tall |
| Notes: "hide skip items" checkbox | **13 × 13** px |
| Notes: "Next: Chapter 2 →" and "all notes" links | 16 px tall |
| Gradient-descent slider | 16 px tall |

**Fix:**
- Set a shared rule of `min-height: 44px` on buttons and toggles.
- Make checkboxes 22 px, wrapped in a label you can tap.
- On a phone, put the three reader toggles behind one "Aa" or "⚙" button, which also fixes item 7.

### 7. The reader's sticky header takes up a fifth of the phone screen
- It's about 165 px on a 844 px phone screen, and 134 px on an iPad.
- It holds the breadcrumb, three toggle pairs, the progress percentage, the Python status, the Jupyter link, and the section tabs.
- On a phone, each code cell scrolls under all of that.

**Fix:**
- On a phone, keep only the section tabs and a small Python status dot in the sticky bar.
- Move the skin toggles into a settings menu.
- Hide the bar while scrolling down, and show it again on scroll up.

### 8. Text is too small in many places
- **Measured sizes:**
  - Landing labels: 8.5 px, 9 px, 10 px, 10.5 px and 11 px. These include "4D · PROJECTED", "~40 min" and "PREVIEW CHAPTER →".
  - Reader labels: 9.5–11 px. These include "CELL_1.PY", "OUTPUT", the "0% of chapter" counter, and the button text.
- **Also hard to read:** the letter-spaced uppercase mono labels, in light grey on light grey (PAPER skin).
- **Fix:**
  - Use 12 px as the smallest size, and 13 px for anything you need to read (button labels, counters).
  - Darken the grey labels so they meet 4.5:1 contrast.

### 9. The "◐ theme" icon draws as half a shape
- On the notes pages, the theme button's `◐` falls back to a font that draws only half of it.
- In Géron ch 4 the button shows the glyph alone on its own row.

**Fix:** use an inline SVG sun/moon, or a text label "Dark", and keep the button on the same row as "Mark reviewed".

### 10. The phone layout of the reader's code cells
- **Problem:** the toolbar (`⇤ RUN ABOVE`, `RESET`, `▶ RUN`) wraps onto two rows on a phone, and **Run** drops to the second row under the file name.
- **Fix:** put **▶ Run** first and full height, and put the other two behind a "⋯" menu, or make them icon-only.
- **Suggestion:** add a **Run all** button at the top of the chapter. "Run above" only helps once you're partway down.

---

## P3 — Consistency and polish

### 11. Two visual styles that don't link to each other
- **The landing page and reader** use a dark "observatory" theme: serif headlines, neon gradients and animated point clouds.
- **The notes** use a light Inter theme with tag pills.
- Both are fine, but they feel like two different sites, and there's no way to get from one to the other (item 2).

**Fix:** choose one shared header and footer, with the Commonplace / Coding / AI breadcrumb, the same theme button and the same back link, and use it on all three areas. Colours can stay different per area.

### 12. Developer text shown to the learner
The notes hub says *"Click a note to open it. Built from `_template.html`."*. Replace it with something like *"Chapter notes, flowcharts and interactive demos."*

### 13. Two notes for the same chapter
- *Ch 1 — ML Landscape* (`foundations/`) and *Géron ch 1 — ML Landscape* (`classical-ml/`) cover the same chapter.
- So do *Ch 2 — End-to-End Project* (`projects/`) and *Géron ch 2*.

**Fix:** merge them, or link each pair together ("Flowchart version ↔ Full notes") and list them together on the hub.

### 14. The study layer exists for only 1 of 18 chapters
- `book/data/study-data.js` (the recall questions, asides, exercises and lab) has content only for chapter **04**.
- The other 17 chapters show plain notebook content, with no recall checks.

**Fix:** fill it in chapter by chapter, starting with 01–03 so the first study sessions have it. Or reuse the site's `_lib/quiz/` banks, the way Python and SQL do, so each chapter gets the same "Check yourself · 5 questions" end-of-chapter check.

### 15. Progress isn't backed up or shared between devices
- Progress is kept in this browser only:
  - chapter progress in `aistudy.progress.v1`
  - "Mark reviewed" dates in `reviewed-<note>`
  - checkboxes in `chk-…`
- Unlike the Python and SQL apps, these pages don't load `_lib/progress-backup.js`.
- So progress made on the iPad doesn't show on the phone, and it's lost if the browser data is cleared.

**Fix:** load `_lib/progress-backup.js` on the landing page, the reader and the note template, and list these keys in it.

### 16. Smaller items
- **Landing:** the React development builds and in-browser Babel make the first load on a phone noticeably slow. Use the production React builds and a pre-compiled `app.js` (no Babel), or the local copies.
- **Reader:** the first section tab is shortened to "Linear Models for Reg…". On a phone, show only the Roman numeral and put the full title in the page heading.
- **Géron hub:** every Part I chapter has a green **NOW** badge. If it means "current track", say that once on the Part heading instead of on every row.
- **Gradient-descent note:** the η slider is a bare 16 px line. Give it a visible track, a 28 px thumb, and its value beside it.

---

## Suggested order
1. **One small PR:** items 1 (skip `%` lines), 2 (link the notes from the landing page), 5 (title overflow) and 12 (developer text). This gives the biggest gain for the least work.
2. **Offline:** items 3 and 4 (local libraries and a service worker for the AI section), plus 15 (progress backup).
3. **Phone comfort:** items 6, 7, 8, 9 and 10. This is a good job for Claude Design: send it the screenshots and this list.
4. **Content:** item 14, the study layer and quiz checks for the other 17 chapters.
5. **Unify:** items 11 and 13, the shared header and merged notes.
