# App inventory

The map of every app being managed from the Claude chat. Update it whenever an app is added, moved or changes state.

Last checked: 2026-11-02

## Where things live

| Place | What it holds |
|---|---|
| GitHub `Celeritas7/Commonplace` (this repo) | The Commonplace study hub: subject hubs (Coding, Mechanical, Maths, Language study, Office_work, Exercises) and the shared offline libraries in `_lib/`. |
| `apps/` in this repo | **Master copy** of the standalone offline apps, imported from Drive on 2026-11-02. Same folder names as Drive. Edit here; changes are copied back to Drive. |
| Drive `Claude_Workspace/App_generation_offline/` | The copy you run on your PC. Updated from `apps/` after each change. |
| Drive `Claude_Workspace/App_generation/` | Empty (created 2026-11-02). |
| Drive `Claude_Workspace/#Data_storage`, `Practice_sessions_storage`, `#Delete` | Not apps; not inventoried. |

## Standalone offline apps (`apps/`)

| App | Folder (in `apps/` and Drive) | What it does | How it runs | Notes |
|---|---|---|---|---|
| Route Studio | Mechanical/Route Studio Offline | Hose and cable routing checks for Creo: bend radius, clearance, cable bundles through clamps, `.pts` analysis, STEP/IGES import. Has a 3D view (three.js). | `Launch Route Studio.bat` (localhost:8765) or open `index.html` | Most developed app: split into `css/` + many `js/` modules, has `tests/`, `ROADMAP.md`, `TESTING.md`. |
| Machine Design | Mechanical/Machine_deisgn_app | Machine design study page, plus stack-up practice data. | Open `Machine_Design_index.html` | A **different version** is in the hub at `Mechanical/Machine_Design/index.html` (hub 525 KB vs app 565 KB). Loads `../../_lib/progress-backup.js`, which only exists inside the hub, so the backup button is missing when run standalone. Folder name has a typo ("deisgn"). |
| Part Matrix Finder | Mechanical/#Part_matrix | Part matrix lookup tool (`part_matrix_finder_v2.html`) over `input/Part_matrix_Data.csv`. | Open the HTML file | `Temp/` holds two older versions. The `#` in the folder name breaks some `file://` links (a browser reads `#` as the start of a page anchor), so consider renaming it. |
| Weekly Focus (offline) | General/Weekly_focus_offline | Planner (Today, Calendar, Routines, Week, Chats, boards) — the v97 online app with Supabase/login removed. Data in browser localStorage. | Open `index.html`, or `run-weekly-focus-offline.bat` (localhost:5071); installable PWA | The online original isn't in Drive or this repo. Offline changes are marked `OFFLINE` in `js/weekly-focus-app.js`. |
| Offline Flowchart | General/Flowchart_app | Flowchart editor (Mermaid / draw.io); saves projects as files in a chosen folder, with version history. | Open `index.html` in Edge/Chrome | Older duplicate `General/Flowchart` removed from the repo (still in git history and still in Drive). Drive's `.git` folder was not imported. |
| DocSearch | General/Doc_search_tool | Searches for a word inside every document in a folder (PDF, Word, Excel, PowerPoint, STEP, text). Local web page. | `python docsearch_web.py` (localhost:8765) | Python app, not plain HTML. `__pycache__` and the generated `samples/BRK-100_Tooling` were not imported (rebuild with `python samples/make_samples.py`). **Same port 8765 as Route Studio**, but it picks the next free port if busy. |
| — | Coding/ | Empty. | | |

## Commonplace hub apps (this repo)

Entry point: `index.html` → subject hubs. Libraries are made offline by `make_offline.py`; the study layer (bookmarks, highlights) is `extras.js` + `serve.py` / `serve.js`.

| Hub | Apps / sections |
|---|---|
| Coding | AI_study (JupyterLite), Python (practice), batch_study, c_and_cpp_study, sql, design_handoff_practice_mistake_bank, **offline_apps_study** (Offline App Workshop: the course on building these apps; modules 1–5 written, 6–12 planned) |
| Mechanical | Automobile, Brown_507_Movements, CMTI, Calc_Console, GD&T, Harness, Hose_routing, Machine_Design, Manufacturing, Motion_lab, Sheet_metal |
| Maths | Algebra_Trigonometry, Calculus, Linear_Algebra, Statistics |
| Language study, Office_work (VBA_macros), Exercises | single hubs |

## Cleanup candidates

Listed only; nothing has been deleted.

- Duplicate Flowchart copy still in Drive (`General/Flowchart`); removed from the repo.
- Machine Design: two diverging versions (Drive and repo).
- Old backups in the repo: `build.py.bak_20261007`, `Mechanical/index.html.bak_20261007`, `Maths/index.html.bak_20261001`, `make_offline_R000.py`, `Temp/`, `_wt_probe.txt`. Git keeps history, so these copies aren't needed.
- `__pycache__` in Drive DocSearch.

## Next steps

1. ~~Import the Drive apps into `apps/`~~ (done 2026-11-02, smoke-tested in Chromium: all apps open; Weekly Focus's weather/train cards need internet as designed; DocSearch needs its Python server).
2. Reconcile the two Machine Design versions.
3. Work through the apps one at a time: improvements and explanations.

## Workflow

1. Change the app in `apps/`, test it, commit with a message that explains why.
2. Push to GitHub.
3. Copy the changed files to the same path in Drive `App_generation_offline/`.
