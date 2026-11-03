# Part Matrix Finder — my notes

Started:

Open the app from `Offline_apps / Mechanical/#Part_matrix/part_matrix_finder_v2.html` and read it next to the tutorial.

## Block by block

For each block: what it does · why it's there (what breaks without it) · what each name means.

### Lines 1–148 — head and CSS (tokens, dark theme, print)

### Lines 150–224 — the two screens in HTML

### Lines 226–232 — clean()

### Lines 234–266 — guessDelim() and parseDelimited()

### Lines 268–327 — buildModel()

### Lines 329–351 — applyFilter()

### Lines 353–367 — state, $, esc, theme

### Lines 369–410 — loading: load(), readFile(), paste, drag and drop

### Lines 412–512 — tag fields: makeField(), tags(), the × buttons

### Lines 514–599 — render()

### Lines 601–640 — table clicks, crosshair, CSV export, print

### Lines 642–646 — start-up

## Hint questions

1. Line 228: what is `_x000D_`, and where does it come from? (Hint: copy a cell with a line break in Excel.)
2. Lines 235–241: paste a CSV that uses `;` with a few commas inside the cells. Which separator wins, and why?
3. Lines 249–264: follow the text `a,"b,c",d` character by character. What are `inQ`, `field` and `row` after each character?
4. Lines 271–284: what happens if the sheet has no "Item No" header? Which row becomes the header?
5. Lines 305–312: what is a "label" row, and how do the labels end up attached to each part?
6. Line 331: what does the "Also show D, * and numbered marks" checkbox change in `applyFilter`?
7. Line 380: why does it save the raw text instead of `MODEL`?
8. Line 398: remove the `setTimeout`. What goes wrong when you paste?
9. Lines 506–508: why is the × click handled on `document` instead of on each button?
10. Line 526: what is `CAP`, and what would happen with 5,000 parts and no cap?

## Experiments I ran

## Still unsure about

## Claude's check

_(empty until reviewed)_
