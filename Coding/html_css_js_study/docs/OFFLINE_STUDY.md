# Web Studio offline study

Web Studio's explicit study download contains the three sample lessons, exercises and feedback, course index, editors, preview checker, fonts, icons and shared Commonplace scripts that this section needs. The download panel reports the current total bytes, saved progress and remaining bytes. The full Angela Yu course, linked Google Drive books and their videos/PDFs are not included.

HTML, CSS and JavaScript previews execute locally in the browser's sandbox. The included Acorn parser supports the preview's safety checks; no Python, compiler or remote execution service is required. The sample exercises run real browser code. Preview requests to external services, remote scripts/styles/fonts and external images remain blocked. Embedded supported raster images work offline. Exported standalone websites can have different network dependencies, so review their warnings before using them offline.

## Prepare this iPad

1. Open the [Web Studio offline launcher](../offline.html) in Safari while connected. Tap **Share → Add to Home Screen** (under **More** on some iPads), keep **Open as Web App** on if shown, then tap **Add**. Open the **Web Studio** icon. If you study in Safari instead, bookmark the launcher and use **Prepare or check downloads** there.
2. Sign into Commonplace in the browser or installed app where you will study. Safari and a Home Screen app may have separate storage. Each needs its own sign-in and its own download.
3. Select **Study offline**, then download the study pack. Keep this app open while downloading. Size, remaining bytes, progress and any file error appear beside the controls. **Back to study** at the top returns to your current lesson or workspace; it does not cancel the download. The learning tabs also close the panel.
4. Wait for **Ready offline**, then select **Start studying** to reveal your lesson or workspace. Ready means the required files have been checked in this browser's storage. It is not a promise that the device will retain them forever or that an expired/missing login can be renewed without internet.
5. Turn off the connection, close and reopen Web Studio, edit a sample and run its preview. Add a note and bookmark, reopen again and check them. Test Safari and Home Screen separately if you use both.

An interrupted download retains completed files. Reconnect and resume: completed files whose content has not changed are verified and reused. A missing, damaged or changed file is downloaded again. Keep a separate study backup under **Projects & backup**; do not clear website data to install an update or repair downloads.

## What works without a connection

| Feature | Offline behavior |
| --- | --- |
| Three sample lessons and original course index | Read locally after the study pack is ready. The index's external destinations need internet. |
| HTML/CSS/JavaScript editors and previews | Real local browser execution; supported embedded images remain available. |
| Exercise checks, hints and mistake review | Use the saved local code and checker. |
| Projects, native notes, bookmarks, quizzes and progress | Save on this device. Existing account sync queues these records for later upload. |
| Shared highlights and annotations | Remain in this browser with their existing separate backup controls; they are not in account sync. |
| JSON backup/import and standalone HTML export | Operate on locally saved records; file saving/opening still needs device acceptance. |
| Sign-in, account synchronization and download updates | Need internet. Keep the app open after reconnecting and wait for the account sync status. |
| Google Drive books, Udemy, external services and parent Commonplace/Coding pages | Not included in this section's pack. Need internet unless separately prepared by their own apps. |

Account synchronization is the existing v1.6 local-first implementation, described in [CLOUD_SYNC.md](CLOUD_SYNC.md). Downloads and shared highlights never upload as part of the account snapshot. Incoming synced work still waits for **Load synced work** so an open editor is not replaced while typing.

## If the study interface does not start

Web Studio v1.7.3 includes a **separate startup recovery screen**. Its inline watchdog starts before the lesson scripts load, and the learning application only reports startup success after the reading content, editor and Run preview control have initialized. This is **different from Ready offline**, which only means the required saved files passed their integrity checks. A verified download is not proof of a successful cold reopening on an iPad.

If a required script fails, a learning dependency is unavailable, a startup exception occurs or startup stalls, an independent screen offers **Retry opening Web Studio**, **Repair offline setup** and **Open offline launcher**. These controls work even if `studio.js` never runs. The message gives a category and, when available, a safe filename; it never includes authentication callback parameters, personal study notes or code, raw error stacks, or access tokens. When the shared Commonplace sign-in gate is active, the gate remains visible and takes priority; it is never bypassed by recovery.

If you see the recovery screen, first use Retry. If the issue persists, reconnect, open Repair offline setup in the **same Safari or installed Home Screen context**, and recheck the study pack. Do **not** clear website data, reinstall the app or delete downloaded files. If the recovery screen reports that the offline worker does not control this page, retry while connected before testing offline again. The worker diagnosis is informational: a registered worker and a verified pack do not automatically prove page control.

The regression suites `tests/startup.cjs` and `tests/startup-browser.cjs` cover missing dependencies, main-script exceptions, stalled startup, redacted diagnostics, gate priority and preserved local data in Node/Chromium/WebKit. They are not physical iPad tests.

## Updates and repair

The worker installs without downloading the study pack. After a complete pack has been saved, the worker **serves its verified static files immediately**, even when Wi-Fi appears connected but is unusable. It does not prefer HTTP 404, HTTP 503, wrong-MIME responses or partially downloaded candidate files over an intact saved revision. If a saved file is missing, the worker accepts a live replacement only if its bytes match the pinned file's SHA-256 digest; otherwise it displays an error requiring repair. Before any complete pack exists, a fresh connected visit uses the network, not individual candidate files.

Download checks still obtain the latest generated list and verify its files by byte length and SHA-256. Unchanged files are reused across revisions. The previous complete pack remains available while a replacement is incomplete; already-open Web Studio pages stay pinned to their original saved revision when the new pack becomes complete. A new navigation/reload selects the latest complete revision. Neither routine fetches nor repair removes the older hashed pack. To adopt deployed changes deliberately, connect, select **Study offline → Updates and repair → Check for app updates**, use **Reload app** after saving, then verify or download the changed pack and reload again if needed. **Ready offline** verifies saved assets, not actual physical iPad reopening or complete main-app initialization.

**Ready offline** is calculated from verified saved files, not from a remembered success flag. Browser storage, network requests and worker messages have deadlines. Errors identify the affected operation or file and keep retry/resume available. Browser eviction or manual removal of a file makes the next check incomplete.

The section's **Repair offline setup** page refreshes Web Studio's worker registration and checks the download again. It preserves the two study records, import recovery journal, sign-in, account owner and sync baseline, shared annotations, downloaded packs and other Commonplace sections. It does not clear website data. After repair, resume any required files and repeat the offline reopen test in the same Safari/Home Screen context.

## Keeping the download list current

`tools/build-offline.py` generates `offline-assets.json` from the section and its local dependencies, including dynamically loaded shared scripts and CSS font files. It records relative URLs, byte sizes, SHA-256 hashes and a deterministic manifest revision. The worker and the manifest itself are excluded from the pack, avoiding self-referencing hashes.

After changing an app file or a shared dependency:

```sh
python3 Coding/html_css_js_study/tools/build-offline.py
python3 Coding/html_css_js_study/tools/build-offline.py --check
python3 Coding/html_css_js_study/tests/offline-manifest.py
```

The read-only Web Studio workflow checks this on pull requests, including changes under `_lib/` and to `extras.js`, and runs the browser suites. A separate main-only workflow regenerates the list after relevant pushes. If needed, it commits only `offline-assets.json`, retries against the latest main after a concurrent update and requests a GitHub Pages rebuild. During a non-atomic deployment, a file/hash mismatch produces a visible retryable error; it never reports the mismatched file as ready.

The pack cache is `cp-web-studio-downloads-v1`; candidate/complete manifest metadata lives in `cp-web-studio-offline-v1`. Download and repair code must not delete either cache as part of a shell update. It must not use an origin-wide cache lookup that could return another Commonplace section's copy of a shared file.

## Validation scope

Automated coverage is defined in `tests/worker.cjs`, `tests/offline-manifest.py` and `tests/offline-browser.cjs`, alongside the existing learning, projects/backup and sync suites. It covers fresh setup, interrupted resume, changed and corrupted assets, old-cache upgrade, scoped repair, offline reopen and preservation of saved work. The offline browser workflow runs Chromium and WebKit with isolated persistent profiles in the pinned Playwright 1.65.1 container. Ordinary HTTP caching is disabled; Chromium also clears it through CDP. Network access is disabled before closing the last page and reopening the app, and an uncached request must fail. Temporary/private browser profiles are not the supported offline study setup. Check the pull request's actual results before treating a run as passed.

Physical iPad Safari and installed Home Screen acceptance are still pending; the evidence and device checklist live in [PHASE7_VALIDATION.md](PHASE7_VALIDATION.md). Desktop WebKit is not a physical iPad test. The ordinary HTTP-cache clearing technique and offline execution results must be reported with the engine that actually ran them; deleting website data is neither required nor an acceptable substitute for this check.
