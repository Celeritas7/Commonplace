# Commonplace — setup walkthrough

A personal hub for all your study notes (SQL, Automobile Mechanisms, C, future subjects). Lives as a GitHub Pages site at `https://<your-github-username>.github.io/commonplace`.

This `commonplace-starter/` folder is a *staging* version. Once you move it out of `SQL/` and into its own location, it becomes your actual hub repo.

---

## One-time setup (~15 min, then never again)

### 1. Move the folder to its own home

On your PC, **cut** `D:\#########Database\##Coding\SQL\commonplace-starter\` and **paste** it as:

```
D:\#########Database\##Coding\Commonplace\
```

(Rename `commonplace-starter` → `Commonplace`.)

### 2. Copy the SQL book in

The SQL book is already built. Copy its HTML output into the hub:

- From: `D:\#########Database\##Coding\SQL\book\output\html\`
- To:   `D:\#########Database\##Coding\Commonplace\sql\`

You can pick either the original (`output/html/`) or the notes-based version (`output-from-notes/html/`) — start with one. The hub's `index.html` links to `sql/index.html`, so as long as one of them lands at `Commonplace/sql/`, the card on the landing page will work.

### 3. Make it a git repo

Open a terminal in `D:\#########Database\##Coding\Commonplace\`:

```
git init
git add .
git commit -m "Initial: Commonplace hub with SQL"
```

### 4. Create the GitHub repo

1. Go to <https://github.com/new>
2. Repository name: `commonplace`
3. Public, no README/`.gitignore`/license (you have files already)
4. Click "Create repository"
5. On the next page, copy the two commands GitHub shows under **"…or push an existing repository from the command line"** and run them in your terminal:

   ```
   git remote add origin https://github.com/<your-username>/commonplace.git
   git branch -M main
   git push -u origin main
   ```

### 5. Turn on GitHub Pages

1. In your repo on GitHub: **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Click **Save**
5. Wait 1–2 minutes. GitHub shows a green checkmark and the URL:

   ```
   https://<your-username>.github.io/commonplace/
   ```

Open that URL — the landing page appears. Click the SQL card — your book opens. Bookmark on your phone (Chrome menu → **Add to Home screen**) for app-like access.

---

## Adding a new subject later

Suppose you finish your Automobile Mechanisms notes and have a built HTML version. To add it:

1. Copy the built HTML folder into `Commonplace/mechanisms/`
2. Edit `Commonplace/index.html`:
   - Find the `<div class="card coming">` block for "Automobile Mechanisms"
   - Change `<div class="card coming">` → `<a class="card" href="mechanisms/index.html">`
   - Change `<span class="badge soon">Coming soon</span>` → `<span class="badge live">Live</span>`
   - Close it with `</a>` instead of `</div>`
3. Commit and push:

   ```
   git add .
   git commit -m "Add Mechanisms"
   git push
   ```

GitHub Pages redeploys in ~1 min. The mechanisms card on the hub goes live.

Same pattern for C, future subjects, anything.

---

## File structure you'll end up with

```
Commonplace/
├── index.html              ← hub landing page (this file)
├── README.md               ← this walkthrough
├── sql/                    ← interactive SQL book
│   ├── index.html
│   ├── module-01.html
│   ├── … module-10.html
├── mechanisms/             ← future
├── c/                      ← future
└── .gitignore              ← optional
```

That's the whole thing. One landing page, one folder per subject, GitHub Pages does the hosting.

---

## A note on discipline

This is *infrastructure*, not study material. You set it up once and don't touch it again until you have a new subject's worth of notes to add. Don't redesign the landing page. Don't add a search bar. Don't add a dark mode. Don't add analytics. Open it on your phone, click SQL, start reading on the train.

The 4-week study plan in `D:\#########Database\##Coding\SQL\study\sql-study-plan.md` is what you actually do. The hub is just where it lives.
