# Classical Machine Learning — Interactive Book

18 course notebooks as a runnable, annotated study book. Python runs in the browser
via JupyterLite/Pyodide — no install, no server account.

## Run it

Pages must be served over HTTP; double-clicking `index.html` will not work. Serve the
**Commonplace root** (two folders up), not this folder, so the shared `_lib/` is reachable.

- **Windows:** double-click `START_HERE.bat`. It serves the root and opens
  <http://localhost:8000/Coding/AI_study/index.html>. The root `run-commonplace-study.bat` works too.
- **Anything else:** `python -m http.server 8000` in the Commonplace root, then open the same URL.

### Offline

Everything the pages need is loaded from `Commonplace/_lib/` (React, fonts, CodeMirror,
marked, MathJax, mermaid, Pyodide), so the landing page, reader, notes, maths and flowcharts
all work without internet. In the reader, **numpy cells run offline**; cells that need
pandas, scikit-learn, matplotlib etc. download those packages and need internet. The raw
JupyterLite apps (`lab/`, `notebooks/` …) still load their own Python kernel from the CDN.

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
├─ notes/                study notes: hub, Géron hub + PDF reader, chapter notes, flowcharts
│  ├─ index.html         notes hub (linked from the landing page)
│  ├─ _template.html     copy into a tag folder to start a note
│  └─ _touch.css         shared by every note: 44px controls on touch screens, ≥12px labels
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

- The notebooks were written for Jupyter. Before running a cell the reader rewrites
  IPython-only lines: `%matplotlib` is dropped, `%timeit` times one run, `!pip install`
  goes through micropip, other `!` / `%` lines print a note. Packages Pyodide doesn't
  bundle (seaborn, imbalanced-learn, nltk) are installed on first import (needs internet).
- Cells that fetch remote datasets need network access; a few original notebooks load
  local files that were never in the source folder and will error if re-run.
- Edits live in the browser session only. Use File ▸ Download in JupyterLab to save.
- `RESTORE_README.md` is the one-time recovery procedure from an earlier reorg — kept for reference.
