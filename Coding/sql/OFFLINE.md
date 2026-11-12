# SQL offline study

Open `offline.html` in the browser/Home Screen app used to study. Installation only
fetches worker code and its manifest. The explicit pack includes every SQL study
page, local dynamic study-layer dependencies, fonts, and the SQLite WASM binary.

Sample databases remain session-only by design: reload/reset restores their seed.
Query drafts and existing practice records live in localStorage; repairs never
clear it or IndexedDB. Cloud success is not implied by saving locally. See the setup
page for synchronization limits and iPad instructions.

## Maintaining the pack

Run `python3 Coding/sql/tools/build-offline.py` after changing SQL or any shared
asset. It discovers local transitive references, hashes bytes, regenerates the
standalone repair page, and explicitly includes dynamically constructed runtime
and study-layer dependencies. Do not add the manifest itself or the worker to the
pack (that would create circular hashes). Add dynamically constructed dependencies
here if a future feature cannot be discovered from static references.

`python3 Coding/sql/tools/build-offline.py --check` runs on **every push and PR**,
including shared login changes outside SQL. A stale manifest fails CI with a repair command. Rebuild and commit it with
shared changes before publishing. The check is read-only: automatic manifest
commits were not enabled. Existing branch-based Pages hosting is retained.

Caches are scoped by SQL-specific names. Repair replaces only this section's
worker and shell caches; it keeps all content-addressed pack revisions, local
study data, and other sections' caches. Previous revisions remain available during
partial updates. Ready status hashes every saved response against the current
manifest. Network reads have deadlines; message calls and activation also time out.

## Validation

- `node Coding/sql/tests/worker.cjs`: Fetch/WebCrypto worker adapter tests plus the
  actual bundled SQLite runtime and exercise reference queries.
- `node Coding/sql/tests/offline.cjs`: Playwright Chromium tests of fresh setup,
  corrupt/interrupted file and resume, cold navigation with HTTP cache cleared,
  real UI queries and grading, local draft persistence, shared-file update,
  legacy worker upgrade, repair preservation, and viewport checks.
- CI installs an isolated pinned Playwright version. Set `CHROMIUM_PATH` to use
  an existing Chromium executable locally. No claim of real iPad/Safari testing.

## Verified for this change

GitHub Actions Chromium acceptance run 43204039379 passed on Linux, including
actual SQLite queries and grading offline, HTTP cache cleared before reopening,
resumption, changed shared-file manifests, legacy-worker repair, draft persistence
and storage preservation. Worker tests also executed all 19 exercise reference
queries against the bundled SQLite WASM. Viewports: 390, 820 and 1440 pixels.
The local headless launch was blocked by socket restrictions; CI supplied the real
browser run. Real iPadOS Safari/Home Screen storage and account cloud sync were
not tested.
