# RESTORE — get the runnable dark notebooks working

The notebooks stopped running because JupyterLite needs all its files **flat at
the root** of `AI_study`. The reorganizing moved the runtime into `Old_files/`
and split the book into `book/`, which is why clicking a chapter no longer opens
a live, themed notebook. This puts everything back and applies the dark theme.

Do these steps **in order**, inside
`D:\Coding\App_generation\...\Commonplace\Coding\AI_study`.

---

## Step 1 — Move the runtime back to the root
Open the `Old_files` folder. Select **everything inside it** (Ctrl+A) and **move**
it up into the `AI_study` root.
- When Windows asks about duplicates, choose **"Replace the files in the
  destination."** (These are the real runtime files — you want them at root.)
- After this, `Old_files` is empty. Delete it.

You should now see folders like `build`, `extensions`, `files`, `api`, `static`,
`tree`, `repl`, and files like `service-worker.js`, `bootstrap.js` directly in
`AI_study`. That's correct — JupyterLite is meant to look "busy" and flat.

## Step 2 — Delete the leftovers from the reorg
Delete these from the root if present — they belong to the broken layout:
- the `book` folder
- `FOLDER_MAP.md`
- any loose `Temp` folder

## Step 3 — Drop in the themed files (from this download)
Copy the contents of this folder into the `AI_study` root, choosing **Replace**
for every conflict:
- `index.html`            (landing page — opens notebooks directly)
- `app.jsx`, `data.js`, `motifs.js`   (the book UI)
- `observatory-jupyter.css`           (the dark notebook theme — NEW file)
- `jupyter-lite.json`                 (sets JupyterLab Dark)
- `notebooks/index.html`, `lab/index.html`  (load the dark theme)

## Step 4 — Run it
1. Open PowerShell in the `AI_study` folder and run:
   ```
   python -m http.server 8137
   ```
   Leave the window open.
2. Go to **http://localhost:8137/index.html**
3. **Hard-refresh: Ctrl+Shift+R** (important — JupyterLite caches via a service
   worker; without this you'll see the old light theme).

### Expected result
- Landing page = dark Observatory book.
- Click any chapter → the **live notebook opens directly**, dark indigo, cyan
  prompts, serif markdown — matching the app. You can run and edit cells.

---

### If a notebook still looks light after Ctrl+Shift+R
The old service worker is still cached. In the browser: **F12 → Application →
Service Workers → Unregister** (all of them) → **Storage → Clear site data** →
reload. This only needs to be done once.
