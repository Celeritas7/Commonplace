# C/C++ offline study

Open `offline.html` from the visible **Study offline** link on the home page or
Practice Lab. Prepare the Safari browser or installed Home Screen app where you
will actually study. Sign in there online first. Safari and the installed app
may have separate storage. Keep the setup page open until verification finishes.

The pack contains all 158 lesson pages with their exercises and simulations,
local fonts, editor libraries, shared study/backup tools and the local page code.
The displayed size is generated from the actual asset bytes. Account-specific
problems are separate: load them online in Practice Lab, then choose **Save
problems offline**. The snapshot is scoped to the signed-in account. It does not
copy cloud attempt history or the cloud mistake bank. Refreshing problems does
not overwrite a saved snapshot until you explicitly save again.

## Execution and data

This release supports reading, lesson JavaScript quizzes/simulations, syntax
cards, code editing and per-item draft persistence without internet. It does
**not** compile or execute C/C++ offline. The existing Run button uses Judge0
through the existing authenticated cloud function. Offline Run explains this;
no simulated output is passed off as compiler output. Account/cloud changes,
grading and external links still require connectivity.

Clang compiled to WebAssembly is technically feasible: the upstream
[wasm-clang project](https://github.com/binji/wasm-clang) contains a compiler,
linker, in-memory filesystem, headers/libraries and worker runtime, but describes
itself as an alpha demo. No such toolchain is currently bundled in Commonplace.
An iPad-compatible integration would need separate memory/startup, language and
standard-library compatibility, cancellation and device validation. It is not
claimed supported in this release. No compiler download is offered.

Drafts, saved problem snapshots and study annotations remain device-local. The
existing reading-sync code pushes read progress when signed in and reconciles
completed local units on pull, but live account synchronization was not tested
for this change. No new offline write queue is introduced. Export important
study work with the existing backup menu. Updates and repair never clear
localStorage or IndexedDB. Clearing Safari website data or OS storage eviction
can remove local work and downloads.

## Reliability and maintenance

- Small worker install: only setup HTML, repair HTML and manager JS. The large
  study pack is downloaded only on request.
- Cache keys contain SHA-256 revisions. Readiness and resume inspect saved bytes
  and hashes, not a remembered ready flag. Interrupted downloads retain completed
  files. Each request/body has a deadline; the UI has bounded worker/RPC waits.
- HTML/JS/CSS/JSON use bounded network-first loading with saved-pack fallback;
  worker registration bypasses HTTP cache. Fonts are served from the saved pack.
- Old asset copies remain available during an incomplete upgrade. Only an
  individual successfully saved replacement removes its older copy.
- `offline-repair.html?nocache=1` is self-contained and bypasses worker caches.
  It replaces the worker at the **C/C++ scope only**, refreshes the tiny shell,
  and verifies pack status. It neither unregisters other workers nor clears
  study/download storage.
- Generator follows transitive local references and explicitly includes dynamic
  shared study dependencies. A change to shared login/editor/fonts changes the
  manifest. `.github/workflows/cpp-offline-manifest.yml` checks PRs, regenerates
  and commits the manifest on relevant main pushes, and explicitly requests a
  branch-based GitHub Pages rebuild after a bot commit. Action failures remain
  visible; branch protection or disabled Actions can require manual generation.
- A half-deployed site produces a useful hash-mismatch error. Wait for deployment,
  choose Check for updates, then Resume. Do not clear website data.

Commands from repository root:

```sh
python3 Coding/c_and_cpp_study/tools/build-offline.py
python3 Coding/c_and_cpp_study/tools/build-offline.py --check
node Coding/c_and_cpp_study/tests/offline-worker.cjs
node Coding/c_and_cpp_study/tests/offline-ui.cjs
# With Playwright and Chromium installed:
node Coding/c_and_cpp_study/tests/offline-browser.cjs
```

## Validation record

Worker/Fetch/crypto tests pass in Node with an in-memory Cache Storage emulator:
fresh small install; interrupted download/resume without refetching complete
files; corruption detection; offline reopening of every asset without an HTTP
cache; shared-login revision update; old-release fallback and preservation of
another section's cache. UI VM tests pass for bounded registration failure and
retry, account snapshot isolation, actual existing draft save/restore code and
background draft flushing. Inline JavaScript syntax is checked.

These are not device tests. Local Chromium launch was attempted and blocked by
`socket() failed: Operation not permitted`. WebKit is not installed locally.
Physical iPad/Safari, actual Home Screen installation, cloud compilation and
live account synchronization have not been tested. The browser acceptance suite
is included for a host that can run Chromium; the iPad check below is necessary.

## Short iPad test

1. From the intended Safari/Home Screen context, download until **Ready offline**.
2. Optionally save your account problems in Practice Lab while connected.
3. Turn Wi-Fi/mobile connectivity off, close and reopen the app. Open a lesson
   you have not previously visited, try its quiz, and add a bookmark/highlight.
4. Write `cout << 55;` in a syntax-card editor, leave and return: the draft should
   remain. Run should state that compilation needs internet, not show `55`.
5. Reconnect, open Repair setup, and verify that drafts and annotations remain.
