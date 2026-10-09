# Plan — Practice pages redesign (Python)

Scope: the pages behind **Practice & Drills** / the **Practice logs** shelf
(`practice/*.html`, `100_days/index.html`), plus the shared notebook player they
are built on (also used by `fundamentals/*.html` and `libraries/*.html`).

---

## 1. What is wrong today (audit, Oct 2026)

| Page | Problem |
|---|---|
| All 8 `practice/*.html` | Generic grey/indigo notebook template (`--accent:#4f46e5`, system sans). Shares nothing with the house style. No TOC, no problem count, no solved state. |
| All 18 notebook pages | ~55 lines of CSS and ~135 lines of player JS are **copy-pasted inline** into every file. Any fix has to be made 18 times. |
| `self_practice_beginner` | 120 code cells, ~132,000px tall. 224 headings render as raw text (`#Browser practice`, `##Prime Number Checker`) because the source markdown has no space after `#`. |
| `self_practice_beginner_from_aistudy` | Duplicate of Beginner (only title differs). |
| `self_practice_intermediate` | Same raw-`#` headings (38). No problem boundaries. |
| `self_practice_intermediate_structured` | Best of the set, but Problem 1's statement ("Coffee Machine") does not match its code (beam SFD/BMD). Several empty sections. |
| `random_module_practice_2` | Page title is "Practice files". Answers are pasted HTML inside code cells (visible before running). Cells print `example_N_output`, which is never defined. |
| `section_3_14`, `golden_problem_template` | Both are **blank templates** (`<Write the problem statement here>`), not practice. |
| `100_days/index.html` | Uses house style, but signed-out view is only a sign-in prompt. |

There is also no single source for the palette: the same `:root` tokens are
written out separately in `index.html` and `css/shelf.css`.

---

## 2. The standard UI — yes, there should be one

Everything in Python should come from **one token file** and **one small
component set**. The tokens already exist; they just need to live in one place.

### 2.1 Tokens → new `css/tokens.css`

| Role | Token | Value | Use |
|---|---|---|---|
| Page | `--paper` | `#eceee4` | body background (+ the existing noise/radial gradients) |
| Page, raised | `--paper-2` | `#f4f5ec` | inset blocks, badges, example boxes |
| Card | `--card` | `#fbfcf6` | problem cards, panels |
| Text | `--ink` / `--ink-soft` / `--ink-mute` | `#1a2820` / `#41564a` / `#7a8c80` | body / secondary / labels |
| Rules | `--line` / `--line-soft` | `#d2dacb` / `#e0e6d8` | borders, dividers |
| Primary | `--green` / `--green-2` / `--green-dk` | `#2f6b4f` / `#3c8362` / `#234f3b` | buttons, links, active chip |
| Code surface | `--green-deep` | `#16352a` | code editor + output (matches the hero "live shell") |
| Accent | `--sage` / `--sage-soft` | `#7fa68b` / `#dde7dd` | card left rule, tags |
| Highlight | `--brass` | `#a98a4b` | Practice-logs identity, counts, "template" |
| Status: pass | `--ok` (new) | `#2f8f5b` | solved, passed output (already used by `practice-engine.js`) |
| Status: fail | `--err` (new) | `#b3261e` | failed attempt, error output (already used by `practice-engine.js`) |
| Fonts | `--disp` / `--serif` / `--mono` | Cormorant Garamond / EB Garamond / JetBrains Mono | titles / prose / labels + code |

`index.html`, `shelf.css`, the notebook player and the practice engine all import
this file instead of redeclaring values.

### 2.2 Components (reuse what exists, add what's missing)

| Component | Source | Notes |
|---|---|---|
| Breadcrumb `.crumb` | `shelf.css` | top of every page |
| Page head (kicker, title, italic sub, stats) | `shelf-page.js` `setHead` | same as the Practice-logs shelf page |
| Section head `.sec-head` (`§ n`, title, count, rule) | `index.html` | one per problem group |
| **Problem card** | new, styled like `.nbcard` | title, level dots, status chip, statement |
| **Example block** | new | Input / Output side by side in `--paper-2`, mono |
| **Code cell** | restyle player cell | `--green-deep` surface, mono, Run = `--green` button (not indigo) |
| **Output panel** | restyle | stdout in ink-on-dark; error line in `--err` |
| **Status chip** | new | Unsolved (mute) · Attempted (brass) · Solved (`--ok`) · Failed (`--err`) |
| **Attempt history** | new, `<details>` | past attempts collapsed under the problem, newest first |
| Callout / Mistake log / Takeaways | restyle `<details>` | dashed `--line` border, like the home-page note box |
| Level dots | `practice-engine.js` `dots()` | ● ◐ ✦ get a legend: Beginner · Intermediate · Module drill |

---

## 3. Phases

### Phase 0 — Shared tokens (small, no visual change)
1. Create `css/tokens.css` with §2.1.
2. Replace the duplicated `:root` blocks in `index.html` and `css/shelf.css` with
   an import of it.
3. Check: screenshots of `index.html` and `shelf.html` are pixel-identical before/after.

### Phase 1 — Content fixes (quick wins)
1. **Headings:** in the player's markdown step, normalise `^(#{1,6})(\S)` →
   `$1 $2` before `marked`. Fixes all raw-`#` headings without hand-editing notebooks.
2. **Duplicates:** keep one Beginner page; redirect the AI-study one to it; drop it
   from `shelf-data.js` and the index grid.
3. **Templates:** move `golden_problem_template.html` and `section_3_14.html` to
   `practice/_templates/`; remove them from the practice lists (offer a small
   "New problem from template" link instead).
4. **Random Module 2:** real title; define or remove `example_N_output`; turn the
   pasted-HTML answers into proper hidden "Show answer" blocks.
5. **Structured Problem 1:** fix statement/code mismatch — *needs your input on
   which one is correct*.
6. Make counts agree: index grid, shelf `n:`, and shelf subtitle wording
   ("runnable sets", not "every cell is editable").

### Phase 2 — One shared notebook player in house style
1. Extract the inline CSS → `lib/notebook-player.css` (built on `tokens.css`) and
   the inline JS → `lib/notebook-player.js`.
2. Each notebook page shrinks to: `<head>` includes + the `nbdata` JSON + one
   `NotebookPlayer.mount()` call.
3. Restyle per §2.2: crumb + page head, dark-green code cells, green Run buttons,
   status line in the header.
4. Add a **sticky outline** (built from headings): a left rail on desktop, a "Jump
   to…" dropdown on phones, plus "Problem 7 of 60".
5. This automatically re-skins `fundamentals/` and `libraries/` too (18 pages).

### Phase 3 — Real problem structure for the practice logs
1. Reuse the parser in `practice_import/nb_to_import_sql.py` (it already finds 60
   problems / 120 attempts in Beginner) and add a `--json` output that writes
   `practice/data/<set>.json`:
   `{id, title, section, level, statement, examples[], attempts[{code, status}], expect?}`.
2. New page `practice/set.html?s=<set>` renders a set as:
   - section heads (`§`) grouped by the notebook's sections,
   - one **problem card** each: statement → examples → your past attempts
     (collapsed) → editor → Run / Check / Save to bank,
   - a filter row: All · Unsolved · Failed · Solved.
3. Checking: when a problem has `expect`, auto-check like `practice-engine.js`;
   otherwise **self-check** ("Mark solved" / "Still failing"). Notebook problems
   have no expected outputs today, so most start as self-check; `expect` can be
   added per problem over time.
4. Progress + bank: write to the same store the Practice tab uses so solved
   state and the Mistake Bank are shared (see open question B).
5. Keep the old notebook view one click away ("View as notebook").

### Phase 4 — Shelf / index polish
1. Practice-logs shelf: group cards by level (Beginner · Intermediate · Module
   drills · Projects), show "60 problems · 12 solved" on each card.
2. "100 Days" moves to its own row as a project; signed-out view gets a short
   explainer and a blurred sample chain instead of only a sign-in prompt.
3. The Practice & Drills grid on `index.html` uses the same data, so the counts can't drift.

### Phase 5 — Verify (every phase)
- Playwright screenshots at 1280px and 390px for every touched page; no horizontal
  scroll; no console errors (offline Pyodide error excepted).
- Keyboard: Tab through cards, Shift+Enter runs a cell, focus rings visible.
- Contrast: `--ink-mute` on `--card` for small labels ≥ 4.5:1 (bump size or
  colour if not).

---

## 4. Open questions (need your call)

- **A. Scope of the re-skin.** Phase 2 changes the 18 notebook pages (fundamentals
  + libraries too), not just practice. OK, or practice only?
- **B. Where progress lives.** Practice tab = localStorage; Mistake Drill =
  Supabase. Should the new problem pages write to Supabase (works across devices,
  needs sign-in) or localStorage (works offline, one device)?
- **C. Auto-check vs self-check.** Is self-check acceptable for notebook problems
  until expected outputs are added?
- **D. Structured Problem 1.** Keep the Coffee Machine statement or the beam code?

## 5. Suggested order and size

| Phase | Size | Visible result |
|---|---|---|
| 0 Tokens | S | none (groundwork) |
| 1 Content fixes | S | headings fixed, duplicates/templates gone |
| 2 Shared player | M | all notebook pages in house style with outline |
| 3 Problem sets | L | practice logs become real problem cards |
| 4 Shelf polish | S | grouped, counted, consistent |
