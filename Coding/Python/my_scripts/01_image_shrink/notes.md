# Image_shrink_R003.py — my notes

Started: 2026-10-01

## Block by block

For each block: what it does · why it's there (what breaks without it) · what each name means.

### Lines 1–3 — imports

### Lines 5–13 — which folder to work in

### Lines 15–22 — the Old folder and the target width

### Lines 24–35 — the loop and the two skips

### Lines 37–38 — step 1: move the original

### Lines 40–49 — step 2: open and resize

### Lines 51–56 — step 3: save and report

## Hint questions

1. Lines 7–13: run it by double-clicking, then from a terminal in another folder. What is `script_dir` each time? Does the `if` actually change anything?
2. Line 25: does `os.listdir` look inside subfolders? So can line 34 ever skip anything?
3. Line 27: which files in test_images get silently ignored?
4. Lines 38 → 41 → 52: follow `big_photo.jpg` — where is it after each line? Now run the script a second time. What is in `Old\big_photo.jpg`?
5. Lines 44–45: what happens to `small.jpg` (449 px wide)? Why the `int()`?
6. Line 48: what is LANCZOS? One sentence from the Pillow docs.

## Experiments I ran

## Still unsure about

## Claude's check

_(empty until reviewed)_
