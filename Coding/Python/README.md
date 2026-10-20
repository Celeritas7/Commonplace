# Step 3 — Lesson pages (toolbar, end-of-lesson block, section numbers, XP removed)

Apply AFTER step 2 (sw.js here is v19 and includes step 2's `js/today-card.js` line).
Copy into `Python/` at the same paths, then:

```
cd lessons/_build && python build.py
```

Commit message:

```
python lessons: labelled bottom toolbar, end-of-lesson block, no XP HUD

- lib/lesson-reader.js: toolbar is a labelled bar at the bottom of the screen
  on phones (Reader · Smaller · Larger · Theme · Saved · Account/Sign in), a
  labelled pill bottom-right on ≥820px. It no longer covers the breadcrumb or
  progress bar. New Theme button cycles light → dark → system via CPTheme.
  Bookmark sheet and the account panel dock above the toolbar. All colours
  from tokens.css (reader mode now follows the theme).
- lessons/_build/build.py + lesson.css + lesson.js: every lesson ends with a
  "Before you go" block (#eol): 1 Recall (3 questions from L["recall"], or a
  muted "not written yet" row) → 2 notebook link (L["notebook"] or the nb-link
  from section 4) → 3 "Mark N.N done" (writes PYPROGRESS 100). Previous/Next
  become a two-card pager under it.
- XP HUD removed (markup, CSS, counter); toasts just say the word.
- Phones: section number sits above the heading; sections get 18px padding.
- Cobra (desktop) lifted to bottom:96px so it clears the backup button.
- lessons/Py_Lesson_0_1.html: same edits by hand, with three real recall
  questions.
- sw.js: VERSION cp-py-v19.
```

## Note

Your generated lessons (`Py_Lesson_*.html`) are still the pre-step-1 build —
they lack the `tokens.css` / `theme.js` head links, so step 1's dark mode and
this step's toolbar theme button only work after `build.py` has been run.
Running it once after copying step 3 covers both.

## Recall data shape (for parts/part_N.py)

```python
"recall": [
  {"q": "What does <code>list(range(1, 10, 3))</code> give?",
   "opts": [("a", "[1, 4, 7, 10]"), ("b", "[1, 4, 7]"), ("c", "[3, 6, 9]")],
   "answer": "b", "why": "It stops before 10."},
  ...  # three per lesson
],
"notebook": ("../fundamentals/02_for_loops.html", "Open the For Loops notebook"),  # optional
```

Lessons without `recall` show "Not written for this lesson yet. Go on to the notebook."

## For Claude Code

- `#eol-done` click → `PYPROGRESS.write(id, 100)`. If the merged progress store
  wants a separate "done" flag, this is the hook.
- Recall answers are not recorded anywhere yet (wire a wrong answer into the
  mistake bank here if wanted: `.rq .opt.wrong`).
- Drills (`lib/lesson-drills.js`) still append their own section 9 after the
  page; they are untouched.

## Test at 390px

- Toolbar at the bottom, six labelled buttons, none clipped; the top bar shows
  breadcrumb + progress bar unobstructed.
- Theme button: Light → Dark → Auto; the whole page recolours.
- End of lesson: tap answers — the explanation appears under the question;
  Mark done turns green; Previous/Next cards sit side by side.
- Section headings that wrap to 2–3 lines have the number above them.
