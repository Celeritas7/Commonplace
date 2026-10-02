# my_scripts

Each folder is one script I'm rebuilding. The page (index.html) shows whatever files exist:

- original.bat — snapshot of the real file (taken 2026-10-01). Re-copy it if the real one changes.
- notes.md     — stage 1
- rewrite.bat  — stage 2
- change.bat   — stage 3
- new.bat      — stage 4

Run the .bat files from a cmd window opened in that folder (type the name, press Enter),
so the window stays open and errors stay visible.

Git scripts (01, 03, 05): test them in a throwaway repo, NOT inside Commonplace.
01 does `cd /d "%~dp0"` then `git pull` — from here that pulls into the Commonplace repo;
03 and 05 do `git add -A` / `push`, which would commit and push the whole Commonplace app.

To add another script: make a new folder, put original.bat in it, add an entry to scripts.json.
