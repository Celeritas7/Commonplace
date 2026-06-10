# Classical Machine Learning — Interactive Book

An interactive, runnable version of the 18 course notebooks
(`3_Classical_ML/Course/Lessons`). Built with **JupyterLite**: Python runs
entirely in your browser via Pyodide — no install, no server account, no setup.

## How to open it

JupyterLite must be served over HTTP. **Double-clicking `index.html` will not work.**

**Easiest (Windows):** double-click **`START_HERE.bat`**. It starts a tiny local
server and opens the book at `http://localhost:8000`. Keep that window open while
you read; close it when finished.

**Manual alternative:** open a terminal in this folder and run
`python -m http.server 8000`, then visit `http://localhost:8000` in your browser.

## Using the book

- The landing page lists all 18 chapters. Click one to open the live notebook.
- First load takes ~20–30s while the Python runtime downloads (needs internet).
- Edit any code cell and press **Shift+Enter** to re-run it and see the output change.
- Saved outputs (plots, tables) are shown until you re-run a cell.
- "Open full JupyterLab" gives the full multi-notebook interface.

## Notes / limitations

- An internet connection is required: the Python runtime loads from a CDN, and any
  cell that fetches a dataset from a URL needs network access.
- A few original notebooks load local data files (e.g. `adult.data.txt`) that were
  not present in the source folder. Those specific cells will error if re-run, but
  their saved outputs still display. All self-contained cells run normally.
- Your edits live only in the browser session and are not written back to the
  original `.ipynb` files. Use File ▸ Download to save a modified notebook.
