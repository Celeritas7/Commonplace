# my_scripts (Python)

Each folder is one script I'm rebuilding. The page (index.html) shows whatever files exist:

- original.py — snapshot of the real file (taken 2026-10-01). Re-copy it if the real one changes.
- notes.md    — stage 1: my notes + answers to the hint questions
- rewrite.py  — stage 2: from blank, using only my notes
- change.py   — stage 3: rewrite + one feature
- new.py      — stage 4: a similar tool from scratch

## Opening the page
- Double-click index.html: works offline from a snapshot. After saving notes/code,
  double-click refresh.bat, then reload the page.
- Through run-commonplace-study.bat (localhost:8137) or the hosted app: always live, no refresh needed.

## Running them
Test data does NOT live here — this folder auto-syncs to GitHub. It lives in
D:\Coding\Python_learning\<same folder name>\ (not synced).

Most of these scripts work on "the folder I'm standing in", so:
1. open a terminal in the test-data folder, e.g. D:\Coding\Python_learning\01_image_shrink\test_images
2. run:  python D:\Coding\App_generation\General_purpose\Commonplace\Coding\Python\my_scripts\01_image_shrink\rewrite.py
3. to reset the test data, empty test_images and copy test_images_backup back in.

Never run a stage file inside this folder — it would act on the files here.

## Not here
Step 6 is a company script; it and its data stay outside this repo.

To add another script: make a new folder, put original.py in it, add an entry to scripts.json.
