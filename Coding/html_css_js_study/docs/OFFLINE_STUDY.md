# Web Studio offline study

Web Studio's explicit study download contains the three sample lessons, exercises and feedback, course index, editors, preview checker, fonts, icons and shared Commonplace scripts that this section needs. The download panel reports the current total bytes, saved progress and remaining bytes. The full Angela Yu course, linked Google Drive books and their videos/PDFs are not included.

HTML, CSS and JavaScript previews execute locally in the browser's sandbox. The included Acorn parser supports the preview's safety checks; no Python, compiler or remote execution service is required. The sample exercises run real browser code. Preview requests to external services, remote scripts/styles/fonts and external images remain blocked. Embedded supported raster images work offline. Exported standalone websites can have different network dependencies, so review their warnings before using them offline.

## Prepare this iPad

1. Open the [Web Studio offline launcher](../offline.html) in Safari while connected. Tap **Share → Add to Home Screen** (under **More** on some iPads), keep **Open as Web App** on if shown, then tap **Add**. Open the **Web Studio** icon. If you study in Safari instead, bookmark the launcher and use **Prepare or check downloads** there.
2. Sign into Commonplace in the browser or installed app where you will study. Safari and a Home Screen app may have separate storage. Each needs its own sign-in and its own download.
3. Select **Study offline**, then download the study pack. Keep this app open while downloading. Size, remaining bytes, progress and any file error appear beside the controls. **Back to study** at the top returns to your current lesson or workspace; it does not cancel the download. The learning tabs also close the panel.
4. Wait for **Saved files verified**, then select **Start studying** to reveal your lesson or workspace. This checks the pack in this installation. A missing sign-in needs a connection.
5. Close Web Studio completely, disconnect, reopen from the icon, edit a sample and run its preview. Add a note and bookmark, reopen again and check them. Test Safari and Home Screen separately if you use both.

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

## Updates and repair

Safari bookmarks enter through `offline.html`. The installed manifest starts at `index.html`. Both use the section-scoped worker and the shared Commonplace sign-in gate. The main page loads the store, lessons, preview and other modules before `studio.js` mounts the interface. The separate download manager can operate independently. A missing lesson script shows **Retry startup** and **Repair offline setup** above the app. An unavailable sign-in script shows sign-in recovery.

A prepared installation serves its verified HTML and allowlisted static dependencies directly from Cache Storage. Each new navigation selects a completed revision. The worker records the selection against the browser's document ID so an open session can keep reading the same files after another tab downloads an update or the worker restarts. Content-addressed file keys and the original complete-pack metadata are compatible with v1.7.2. An incomplete candidate is never used for navigation. Corrections to a damaged pack require an explicit download or repair. The repair page is independent of the lesson scripts and can fetch its connected copy directly.

**Update an existing installation**

1. Open the same Web Studio icon while connected and confirm the save indicator. Choose **Study offline → Updates and repair → Check for app updates**.
2. Choose **Check downloads**, then **Download study pack** or **Resume download** if offered. The previous pack remains usable while the new revision is incomplete.
3. After verification, choose **Reload app** under **Updates and repair**. If the older interface is stuck, open **Repair Web Studio offline setup** in the same installation, select **Repair offline setup**, then **Return to Web Studio**. The repair action resumes verified downloads and preserves study and account storage.
4. Check the footer for **Version 1.8** and run the offline reopen test above. In **Study offline**, **Saved files verified** describes file integrity. “Lesson interface opened offline from the saved pack” describes this particular successful launch. The device acceptance test also exercises the preview and verifies your own records.

A storage read error, a missing file, a sign-in prompt, lack of worker control and a lesson interface that failed to start each have different recovery text. Diagnostics contain no callback parameters, account details or study content.

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
