# Python on an offline iPad

1. While connected, open the Python homepage in Safari.
2. Share → Add to Home Screen. Keep “Open as Web App” enabled if offered.
3. Open that icon and sign in while connected. Safari and the installed app may have separate storage; prepare the installed app itself.
4. Open **Study offline**. Download **Python essentials** (~22 MB).
5. Optionally download **Data & plotting libraries** (~135 MB) over Wi-Fi.
6. Keep the screen open until **Ready offline**. Disable Wi-Fi, close and reopen Python, then open a lesson and run a code cell. Try `print(sum(range(11)))`; expected output: `55`.

Local practice and the bundled interpreter work from the saved files. Existing cloud-only records, external links and synchronization need internet. This change does not add an offline sync queue to cloud-only features. Stay signed in. Clearing site data removes downloads and local work; browser storage can also be reclaimed. Check download status before leaving Wi-Fi, and keep backups of important work using the existing backup controls.

Interrupted downloads retain completed files. Reconnect and resume. The readiness check inspects the current cached files rather than trusting a stored success flag. Each downloaded file is checked against its SHA-256 hash, so a captive portal or half-deployed update is not reported as ready. Storage failures are reported without deleting practice data. Packs survive shell-cache upgrades; only superseded copies of successfully replaced assets are removed.

## Maintenance

After editing Python pages, scripts or shared dependencies, run:

```sh
python Coding/Python/tools/build-offline.py
node Coding/Python/tests/offline-worker.cjs
```

Commit the generated `offline-assets.js` alongside the source changes. Bump `VERSION` in `sw.js` for shell changes. Serve all files as-is without modifying their contents during deployment. The manifest includes active Python pages and their local dependencies, the bundled v0.26.4 runtime, and optional packaged libraries. Archives, temporary drafts and SQL setup files are excluded.

Browser regression suite (requires Playwright and Chromium):

```sh
node Coding/Python/tests/offline.cjs
```

It exercises download failure/resume, clears HTTP cache, goes offline, opens new pages, runs CPython, tests the random-module runner and worker `input()`, then imports NumPy/pandas and creates a plot. Set `CHROMIUM_PATH` if Chromium is elsewhere. No real cloud credentials are used.

Validation for this change: service-worker regression checks passed; actual bundled Pyodide executed arithmetic and loaded NumPy/pandas/matplotlib/Pillow locally. Browser suite could not launch in the authoring environment (Chromium socket creation was denied); physical iPad/Safari verification remains necessary.

## Recovering stale setup code

Open `offline-repair.html?nocache=49` in the affected browser/app. It has no external scripts and deliberately bypasses the old page cache. Its button removes only `cp-py-*` shell caches, re-registers the Python worker with a distinct URL and uncached imports, waits for that exact worker to activate, then verifies the download status through a MessageChannel. It does not unregister other apps, delete the download pack, or modify localStorage/IndexedDB. A failed step is shown on screen.
