# BAT offline study

Open `offline.html` from the visible Study offline link. Prepare downloads in the
same Safari browser or Home Screen app used for studying. Sign in there first.
The complete pack is approximately 5.1 MB; the worker installation fetches only
four small setup files (index, setup page, manager, login gate).

BAT sandbox output is a JavaScript simulation, not Windows execution. Text
checks and lessons work locally. Real .bat files require Windows. External links,
authentication and cloud operations need internet. Existing lesson completion
reconciliation code was inspected, but live cloud synchronization was not tested.
Local notes, highlights and scripts must not be assumed to synchronize.

## Design

- Download list: actual byte sizes and SHA-256 hashes, generated recursively from
  current BAT files and local dependencies (including fonts and login code).
- Cache `cp-bat-downloads-v1` retains files across versions. Resume hashes stored
  response bodies and skips unchanged files. Readiness re-hashes every file.
- Mismatches, HTTP errors, storage failures and timeouts appear beside controls.
- Each completed file replaces only its own old copy; interrupted files retry.
- Network-first static requests prevent old saved HTML/JS hiding fixes; failed
  network requests fall back to explicit saved responses. HTTP cache is bypassed.
- Repair refreshes the exact BAT worker scope and setup list. It does not clear
  localStorage, IndexedDB, packs or any other section's cache.
- No new sync behavior or storage key migration is introduced. iPadOS eviction
  and user clearing website data can still remove local data. Export backups.

Run `python3 Coding/batch_study/tools/build-offline.py` after edits. The
`bat-offline-manifest.yml` workflow regenerates on main pushes, commits only this
manifest and requests a Pages rebuild. Failed workflow runs must be fixed before
considering newly changed content ready for offline download. Hash mismatch is a
visible error during any deployment transition, never false readiness.

## Validation (2026-11-12)

Passed in Node with real SHA-256 and Response objects and an in-memory Cache API:
corrupt download rejection, per-file resume without re-fetching completed files,
full-pack hash verification, corrupted cached-file detection, repair, offline
saved-list verification, unrelated-cache preservation, and manifest byte checks.

`node Coding/batch_study/tests/storage.cjs`

A full Playwright suite is provided for fresh setup, interrupted/corrupt download,
shared-file revision updates, legacy-worker upgrade, repair, saved data, cold
reopen with network disabled and HTTP cache cleared, and BAT simulation output:

`node Coding/batch_study/tests/offline.cjs`

That browser suite could not run in the authoring environment: Chromium's process
singleton socket was denied; the separate cloud browser could not reach the local
server. No successful Chromium, Safari or physical iPad test is claimed. The full
suite needs to run in an environment with Chromium available before treating
browser/device validation as complete.

## iPad acceptance check

1. Open the app online, sign in, open a lesson, then Study offline.
2. Start downloading; interrupt Wi-Fi, reconnect and Resume. Wait for Ready offline.
3. Save a practice answer, a bookmark and a note using the lesson controls.
4. Turn off internet, close/reopen the same browser or installed app. Open lessons,
   My Scripts and Sandbox. `echo hello` should show simulated `hello`.
5. Reopen the saved work; reconnect and Repair. Verify that work remains.

Do not use Safari “Clear History and Website Data” as an HTTP-cache test: it also
removes study data. The automated suite clears ordinary HTTP cache separately.
