# Web Dev Bootcamp: study book

A study-book page for *The Complete 2022 Web Development Bootcamp* (Angela Yu, The App Brewery, on Udemy).

- **What it holds:** the course **index only**: 35 sections, 441 numbered lessons, 8 coding exercises and 4 quizzes, grouped into five parts. No lesson content is stored here.
- **Your study books:** the transcript PDFs (Sections 1–5, contents page, full book) stay in Google Drive (`Claude_Workspace/#Data_storage/HTML_CSS_JS/Section-wise`). The page links to them; they open only for your Google account.
- **Your progress:** ticks, stars, notes and open sections are saved in the browser under `commonplace_wdb_v1`, and are included in the hub's Export / Import backup.

## Files

| File | Purpose |
|---|---|
| `index.html` | The page: progress, search, filters (to do / done / starred / notes, lesson types), sections with lessons |
| `data/course-index.js` | The index: one line per lesson, section by section, plus the Drive ids of the study books |
| `my_apps/` | My own apps rebuilt by hand: a tutorial per app, then notes → rewrite → one feature → a new app (see `my_apps/README.md`). The apps themselves stay private in `Offline_apps` |
| `pwa/` | Install manifest and icons (like the other books) |
| `sw.js` | Offline cache when served over http. Bump `CACHE` after changing a file |

## Editing the index

Lesson numbers aren't written in the data; they are counted in order, skipping "Coding Exercise N" and "Quiz N" lines, as on Udemy. Keep one title per line. Changing the order changes the numbers. The source was `HTML_CSS_process/Temp/Index.docx`; OCR mistakes were corrected (e.g. "Pradice" → "Practice", "HTM L" → "HTML", missing numbers in sections 11–15, 18–22 and 32–34).
