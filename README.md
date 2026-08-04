# Commonplace — offline kit

One script that makes the whole hub work with no internet.

## Run it (once, on your PC)

1. Copy `make_offline.py` into your `Commonplace/` root folder (next to `index.html`).
2. Open a terminal there and run: `python make_offline.py`
3. Wait a few minutes on the first run — it downloads ~60–80 MB into `Commonplace/_lib/`.

It then rewrites your pages to load everything locally:
- **Pyodide + numpy** → Python pages run fully offline
- **CodeMirror, marked, supabase-js** → editors and rendering work offline
- **Google Fonts** → Cormorant/EB Garamond/JetBrains Mono load offline
- Adds a small **⇅ button** (bottom-left of every page): *Export progress* saves all your study progress + future "don't understand" tags to a JSON file; *Import progress* merges a backup back in (never un-marks something you've done since).

Re-running is always safe. At the end it prints anything still internet-only — paste that list back to Claude if something should be localized too.

## What stays online-only (by design)

- **C++ Run button** — code executes on Judge0 via your Supabase function; offline you can still read lessons and edit code, just not run it.
- **Cloud sync / magic-link sign-in** — progress saves to the device instantly offline and syncs when you're back online and signed in.

## iPad

1. Copy the whole `Commonplace` folder (including `_lib/`) to iCloud Drive as usual.
2. On the iPad: Files → iCloud Drive → touch-and-hold `Commonplace` → **Keep Downloaded** (iPadOS 18+). New files you add from the PC then auto-download whenever the iPad is online — no manual steps.
3. Open pages in an app with a real built-in browser (e.g. Documents by Readdle) rather than the Files quick-look preview — and always the same app, so saved progress is always found. Quick-look doesn't reliably keep localStorage.

## Untouched

`Temp/`, `_archive/`, `_superseded_flat_build/` and `Coding/AI_study/` (JupyterLite already ships its own offline support) are left as-is.
