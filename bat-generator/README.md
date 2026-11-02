# BatSmith — BAT file generator

A standalone, offline web app that builds Windows `.bat` files from a few options and explains every line it writes.

## Use it
- **Simplest:** double-click `index.html`. Everything (code, styles, icon) is inside that one file, so it works with no internet and no server. You can copy `index.html` anywhere on its own.
- **As an installable app:** host this folder on any static web server (or GitHub Pages) and open it once. The browser then offers "Install", and the service worker keeps it working offline.

## Script types (28)
- **Git:** pull · sync / upload
- **Shell / Web / Python:** open a terminal here · local web server · run a Python script
- **Files:** backup · clean up · do something to many files · project folder skeleton · hide / protect (ATTRIB) · handle files dropped on it (SHIFT)
- **Text:** search text in files (FINDSTR) · text file tools (TYPE, MORE, SORT, FC, `<`, `>>`) · text tricks (substring, replace, length)
- **Loops:** every sub-folder (FOR /D, /R) · repeat with numbers (FOR /L)
- **Interactive / Projects:** menu · pick from a list (arrays) · calculator · guess the number
- **Startup:** open apps, files & sites — any path: folders, programs, PDFs, Excel/Word, images, websites, shortcuts, `ms-settings:` links
- **System / Network:** restart a program · system info report · shutdown timer · schedule a script (SCHTASKS) · service manager (SC, NET START) · network check (PING, IPCONFIG) · map a network drive (NET USE)

The **Commands** button lists every common batch command and which script types use it. The list is worked out by scanning the scripts the app actually generates.

## Features
- Live preview with syntax colours; click a line (or tick "Explain every line") to see why it is there.
- Download as `.bat` with Windows (CRLF) line endings, or copy to the clipboard.
- Warnings for risky settings (mirror backups that delete, patterns that match the script itself, missing `call`).
- Non-English characters in paths or text: `chcp 65001` (UTF-8) is added automatically.
- Comment style: `REM` or `::`.
- **Saved**: keep named configurations and re-open or re-download them later.
- Light / dark / auto theme. Options and saved scripts stay in this browser (localStorage).

## Files
| File | Purpose |
|---|---|
| `index.html` | The whole app |
| `manifest.webmanifest`, `icon.svg`, `sw.js` | Only used when hosted, for install + offline |
