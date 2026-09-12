# Classical Machine Learning — Interactive Book

18 course notebooks as a runnable, annotated study book. Python runs in the browser
via JupyterLite/Pyodide — no install, no server account.

## Run it

JupyterLite must be served over HTTP; double-clicking `index.html` will not work.

- **Windows:** double-click `START_HERE.bat`, then open <http://localhost:8000>.
- **Anything else:** `python -m http.server 8000` in this folder, then open the same URL.

First load takes ~20–30 s while the Python runtime downloads. Internet is required.

## Where things live

```
AI_study/
├─ index.html            landing page — chapter list, progress            ← START HERE
├─ book/                 everything that is *ours*
│  ├─ reader.html        the study reader (skins, focus/page view, margin notes, labs)
│  ├─ css/
│  │  ├─ colors.css      THE palette — every hex used by index + reader lives here
│  │  └─ observatory-jupyter.css   dark theme for the raw JupyterLab/notebook views
│  ├─ js/
│  │  ├─ reader.js       renders a notebook into sections, runs cells via Pyodide
│  │  ├─ lab.js          interactive lab plates (draggable least-squares etc.)
│  │  ├─ motifs.js       chapter motifs / accents
│  │  └─ app.jsx         landing-page React app
│  └─ data/
│     ├─ data.js         chapter list (id, file, title, tag, lead)
│     └─ study-data.js   per-chapter study layer: asides, recall, exercises, lab config
├─ files/                the 18 source notebooks (.ipynb) — the reader loads these
├─ START_HERE.bat        local server launcher
└─ (everything else)     JupyterLite runtime — api/ build/ extensions/ lab/ notebooks/
                         repl/ tree/ static/ *.json service-worker.js bootstrap.js
                         config-utils.js. Must stay flat at the root. Don't move it.
```

## Entry points

- `index.html` → `book/reader.html?nb=<file>` is the canonical way to read.
- `notebooks/`, `lab/`, `tree/`, `repl/` are the raw JupyterLite apps — reachable from
  the landing-page chips when you want the full notebook UI.

## Notes

- Cells that fetch remote datasets need network access; a few original notebooks load
  local files that were never in the source folder and will error if re-run.
- Edits live in the browser session only. Use File ▸ Download in JupyterLab to save.
- `RESTORE_README.md` is the one-time recovery procedure from an earlier reorg — kept for reference.
