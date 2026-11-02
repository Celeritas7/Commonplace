# BatSmith — BAT file generator

A standalone, offline web app that builds Windows `.bat` files from a few options and explains every line it writes.

## Use it
- **Simplest:** double-click `index.html`. Everything (code, styles, icon) is inside that one file, so it works with no internet and no server. You can copy `index.html` anywhere on its own.
- **As an installable app:** host this folder on any static web server (or GitHub Pages) and open it once. The browser then offers "Install", and the service worker keeps it working offline.

## Script types
Git pull · Git sync / upload · Open a terminal here · Local web server · Run a Python script · Backup a folder · Clean up files · Do something to many files · Menu of commands · Launch apps & sites · Restart a program

## Features
- Live preview with syntax colours; click a line (or tick "Explain every line") to see why it is there.
- Download as `.bat` with Windows (CRLF) line endings, or copy to the clipboard.
- Warnings for risky settings (mirror backups that delete, patterns that match the script itself, missing `call`).
- **Saved**: keep named configurations and re-open or re-download them later.
- Light / dark / auto theme. Options and saved scripts stay in this browser (localStorage).

## Files
| File | Purpose |
|---|---|
| `index.html` | The whole app |
| `manifest.webmanifest`, `icon.svg`, `sw.js` | Only used when hosted, for install + offline |
