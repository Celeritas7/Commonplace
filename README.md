# Commonplace study layer

Adds bookmarks, highlights, "concept unclear" marks, and annotations to your Commonplace app — **without changing any of your note files**. A small local server injects the study script into each page as it serves it.

## Run
1. Install Python if you don't have it (python.org — check "Add to PATH").
2. Double-click `run-commonplace-study.bat` (or drag your `Mechanical` folder onto it).
3. Browse at http://localhost:8137/ — keep the black window open.

## Use
- **★ button** (bottom-right): bookmark the current page. Bookmarks appear at the top of the home screen and in the ☰ panel on every page.
- **Select any text** → toolbar appears: **Highlight**, **? Unclear** (red wavy mark for concepts you don't get yet), or **Note** (highlight + annotation).
- **Click a mark** to read/edit its note, switch its type, or delete it.
- **☰ panel**: all bookmarks, plus this page's unclear marks and highlights (click to jump). Export/Import backs up everything to a JSON file.

Data is stored in your browser (localStorage) per computer — use Export backup before switching machines or clearing browser data.
