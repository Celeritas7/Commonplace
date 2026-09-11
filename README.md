# Commonplace study layer

Adds bookmarks, highlights, "concept unclear" marks, and annotations to your Commonplace app — **without changing any of your note files**. A small local server injects the study script into each page as it serves it.

## Run
1. Needs Python **or** Node.js — either one (your original launcher used Node's `npx serve`, so you likely have Node already).
2. Put this folder anywhere inside your Commonplace tree and double-click `run-commonplace-study.bat`. It climbs to your **top-level root** (the highest folder with an `index.html`, preferring the one that also has `_lib\`) so every app is covered. To force a different folder, drag that folder onto the .bat.
3. Browse at http://localhost:8137/ — keep the black window open. **The ★ / 🔖 / ☰ buttons only appear on pages served this way** — your original plain-server .bat does not add them.

## If the buttons appear in only some apps
The server refuses anything outside the folder it is serving, so apps that live *above* or *beside* that folder are opened without the study layer. Two things to check:

- **Read the launcher window.** It now prints `Serving root:` and lists every app folder covered. If an app is missing from that list, drag the folder that contains *all* your apps onto the .bat.
- **Check for absolute `file:///` links.** A hub card whose `href` is a full `file:///D:/...` path leaves localhost entirely, so that app loses the layer even when it is inside the root. Change those to relative paths (e.g. `Cpp/index.html`).

## Use
- **★ button** (bottom-right): bookmark the current page. Bookmarks appear at the top of the home screen and in the ☰ panel on every page.
- **Select any text** → toolbar appears: **Highlight**, **? Unclear** (red wavy mark for concepts you don't get yet), or **Note** (highlight + annotation).
- **Click a mark** to read/edit its note, switch its type, or delete it.
- **☰ panel**: all bookmarks, plus this page's unclear marks and highlights (click to jump). Export/Import backs up everything to a JSON file.

Data is stored in your browser (localStorage) per computer — use Export backup before switching machines or clearing browser data.
