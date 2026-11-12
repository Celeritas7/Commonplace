# my_apps (HTML, CSS & JS)

Each folder is one of **my own offline apps**, rebuilt by hand. The page (index.html) shows whatever files exist:

- tutorial.md  — how the app works, block by block (written by Claude, short excerpts only)
- notes.md     — stage 1: my notes + answers to the hint questions
- rewrite.html — stage 2: from blank, using only my notes
- change.html  — stage 3: rewrite + one feature
- new.html     — stage 4: a similar app from scratch

## The real apps stay private

Unlike Python/my_scripts and batch_study/my_scripts, there is **no original file here**. Commonplace is public and the apps
live in the private `Offline_apps` repository (and in Drive, `Claude_Workspace/App_generation_offline`). Open the original
from there and read it next to the tutorial. The line numbers in the tutorial and notes refer to the snapshot date in
`scripts.json`; if the app changes a lot, ask Claude to update the tutorial.

## Opening the page
- Double-click index.html: works offline from a snapshot. After saving notes or code, double-click refresh.bat, then reload.
- Through run-commonplace-study.bat (localhost:8137) or the hosted app: always live, no refresh needed.
- Each .html stage has an **Open** button that runs it in a new tab.

## Adding another app
Make a new folder (e.g. `03_weekly_focus`), add an entry to scripts.json, and ask Claude for its tutorial.md and notes.md.
Keep data files (CSV, part files, anything personal) out of this folder — it is public.
