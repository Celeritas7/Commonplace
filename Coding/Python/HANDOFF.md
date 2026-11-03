# Handoff — Python app (and what this chat touched elsewhere)

Written 3 Nov 2026 at the end of the chat that built most of the Python study app.
Paste the "For the next chat" section into a new chat to carry on.

## What is live on `main` (all merged, all tested on a 390 px phone)

**Python app — `Coding/Python/`**
- 32 lessons, 0.1–5.4. Every lesson has:
  - a quiz bank (`lessons/quiz/Py_Lesson_X_Y.js`, 7–10 questions each) and the
    "Check yourself · 5 questions" soft gate before the next lesson
  - a Drills section (`lib/drills/X_Y.js`, 4 ideas × fill-the-blank + spot-the-bug),
    loaded by `lib/lesson-reader.js`, played by `lib/lesson-drills.js` + `lib/random/fd.js`
- Practice keyboard with Easy/Medium/Hard levels, Enter auto-indent, ⧉ duplicate block, sticky Next.
- Notebook player runs Python in a Web Worker (`lib/py-worker.js`, `lib/py-worker-engine.js`):
  real Stop, `input()` via SharedArrayBuffer (COOP/COEP set in `sw.js`), restart banner.
- Offline: `sw.js` precaches every lesson, quiz bank and drill file. Current version **cp-py-v44**.
  Bump VERSION whenever a cached file changes.
- Lesson text corrections: 0.1 (syntax errors stop the whole file), 0.4 (modern
  `'(' was never closed` message), 1.2, 1.5, 2.2.

**AI / Classical ML — `Coding/AI_study/`** (now owned by a separate chat; see below)
- `UI_FEEDBACK.md` review report; phases 1, 4 and 5 shipped from this chat:
  `%magic` lines skipped in the reader, notes reachable from the landing page,
  99 recall questions across all 18 chapters (`book/data/study-data.js`),
  one breadcrumb trail on every notes page, duplicate Ch 1/Ch 2 notes cross-linked.
- Offline cache: `study-sw.js`, version **aistudy-v3**.

**SQL — `Coding/sql/`** (owned by a separate chat)
- Phase 1 and 2 shipped from here early on (paths fixed, Modules 1–2 rebuilt,
  quiz banks 3–10, `module-check.js` soft gate). Everything since is the SQL chat's.

## How things are wired (for whoever edits next)
- Quiz bank format: `window.CP_QUIZ_BANK = [ {type:'mcq'|'fill'|'match', sec:N, …} ]`,
  spec in `_lib/quiz/README.md`. `sec` = lesson section 1–8; "Review those sections" scrolls there.
- Drill format: `window.LESSON_DRILL_DATA = [ {name,title,concept,d1:{…blanks},d2:{…options}} ]`,
  see `lib/drills/0_4.js` as the reference. Chip text is escaped (quotes are safe);
  an answer may be needed by two blanks.
- Lesson CSS is inlined per lesson from `_build/lesson.css` — patch both, or all 32 pages drift.
- Test locally: `python3 -m http.server 8301` at the repo root; Playwright is at
  `/opt/node22/lib/node_modules/playwright`. Every claim about Python output in the
  banks and drills was verified on Python 3.13.

## For the next chat (paste this)
> The Python study app in `Coding/Python/` is complete: all 32 lessons have quizzes,
> drills and an end-of-lesson check, verified on a phone. Open PR to merge first:
> #36 (table fit on phones + this handoff note). Pending, none waiting on you:
> 1. **Mistake Bank page** — Lesson 5.4 teaches the method but there is no page in the
>    app. Waiting on a Claude Design mock; build it once there is one.
> 2. **iPad chart check** — open a notebook with a matplotlib chart while online and
>    confirm it draws (could not be tested from the sandbox; jsdelivr is blocked there).
> 3. **Optional tidy-up** — `practice/golden_problem_template.html` and
>    `practice/section_3_14.html` are templates sitting among real practice pages.
> 4. **Old branches** — `ccr-123aaab7-dgdxv4` (a superseded Python plan, safe to delete);
>    `ccr-e89ce11d-329as5` (Cardboard Workshop) and `claude/tolerance-stack-up-app-bjcmwk`
>    (tolerance stack-up) are finished *Mechanical* apps, never merged, merge cleanly —
>    decide in the Mechanical chat.
> The AI section (`Coding/AI_study/`) and SQL (`Coding/sql/`) each have their own chat;
> do not edit them from here (PR #29 hit a merge conflict for exactly that reason).
> AI still owes a notebook clean-up: text mistakes in notebooks 01, 05, 15; removed
> functions `load_boston`, `df.append`, `sklearn.utils.Memory`; Colab-only cells unmarked.
