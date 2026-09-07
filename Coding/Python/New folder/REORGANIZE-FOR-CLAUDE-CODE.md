# Task: Reorganize the Python study folder (like the SQL folder)

## Goal
Tidy `Python/` so shared code and archives live in clear folders, mirroring the
SQL project's layout (`lib/` for shared code, topic folders for pages, an
archive for old revisions). **Nothing about the pages' behavior should change.**

## Target structure
```
Python/
  index.html                  # hub (Learn / Practice / Mistake Bank)
  lib/                        # ALL shared JS engines
    practice-engine.js
    practice-sets.js
    compose-blocks.js
    python-practice-section.js
    python-practice-data.js   # moved out of python-practice/
  fundamentals/               # unchanged (01–08, mistake-drill.html, python-practice-plus.js)
  libraries/                  # unchanged (numpy, pandas, matplotlib, pandas_practice)
  practice/                   # unchanged (self-practice notebooks)
  practice_import/            # unchanged (SQL import scripts)
  100_days/                   # unchanged
  _archive/                   # everything stale goes here
    Temp/  (root Temp, fundamentals/Temp, libraries/Temp, 100_days/Temp, python-practice/Temp)
    compose-blocks/           # old prototype folder
    design_handoff_compose_blocks/
    python-practice/          # whatever remains after moving the data js to lib/
    NumPy_practice.html
    pizza.py
    working.txt
    TROUBLESHOOT-FOR-CLAUDE-CODE.md
```

## Steps
1. Create `lib/` and `_archive/`.
2. Move the five shared JS files listed above into `lib/`.
3. Move the archive items into `_archive/` (preserve subfolder names).
4. **Fix references** — grep the whole folder for each moved filename and update:
   - `index.html` loads: `python-practice/python-practice-data.js`,
     `practice-sets.js`, `compose-blocks.js`, `practice-engine.js`
     → change to `lib/<name>.js` (data file: `lib/python-practice-data.js`).
   - Check `100_days/index.html` and any page under `fundamentals/` or
     `libraries/` for `<script src=` references to the moved files; update the
     relative path (`../lib/<name>.js` from a subfolder).
   - Do NOT touch anything inside `_archive/` — dead copies may keep broken paths.
5. Verify: open `Python/index.html` in a browser with DevTools → Network.
   No 404s; the Practice tab renders exercise cards with the block editor
   (button reads "Assemble & run"); Learn tab shows the Focus/All-sections
   cards. Open one fundamentals page and one libraries page — cells run.

## Cautions
- localStorage keys must keep working — they don't depend on paths, only on
  page filenames staying the same. Do not rename any HTML file.
- `fundamentals/mistake-drill.html` is Supabase-backed; don't move it.
- If the folder is a git repo, use `git mv` so history follows.
