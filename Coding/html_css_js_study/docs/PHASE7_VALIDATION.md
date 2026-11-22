# Phase 7 — Web Studio device and integration validation

Review date: 2026-11-22 (Japan). Status: **automation and documentation prepared; physical-device acceptance remains open**.

Release under review: Web Studio **1.7.1**, starting from Commonplace commit `9022924685142c9d4bba81a221c74ab802ef7b4f` ([mobile return fix, PR #64](https://github.com/Celeritas7/Commonplace/pull/64)). The app still contains three sample lessons; the full learning book is deliberately deferred.

## Release and preservation boundary

- Pack: **57 files, 1,542,552 bytes (1.54 MB)**; manifest revision `fae3b1d8de3a47662383b5f44e770cbadc24e46339e49b1a35a6212c411c9b38`.
- This phase adds test coverage and corrects documentation. It does not change application files, the download manifest, the shared login gate, production database/schema, saved study records or downloaded packs. No new study download is required for these documentation/test changes.
- Study records, original tracker IDs, projects, account bindings and annotation keys retain their existing formats. Repair remains section-scoped and does not clear website data.
- Native study records and projects participate in account sync. Shared highlights/annotations and downloaded files remain local. Google Drive books, Udemy, new sign-in and account synchronization require a connection.

## Evidence and its limits

| Check | Evidence | What it establishes |
| --- | --- | --- |
| v1.7.1 automated baseline | [PR #64 run 44559585170](https://github.com/Celeritas7/Commonplace/actions/runs/44559585170): contracts, Chromium and WebKit passed | Learning, backup/restore, fixture-account sync, mobile navigation and real service-worker scenarios passed on that release. |
| Current Phase 7 automation | [PR #65](https://github.com/Celeritas7/Commonplace/pull/65) Checks and the [Web Studio workflow](https://github.com/Celeritas7/Commonplace/actions/workflows/web-studio.yml) are the run record; all three browser suites and contracts are required before merge | Re-runs the baseline and adds the shared-gate integration suite below. Do not infer a physical-device pass from a workflow pass. |
| Live pack, 2026-11-22 | All 57 deployed files matched the expected byte lengths and SHA-256 hashes | The hosted assets match this release. One initial `studio-project-ui.js` request returned HTTP 503 and matched on a single retry; a successful check does not guarantee future network availability. |
| Interactive visual review, 2026-11-22 | Cloud Chrome; local checkout in 390px and 810px-wide frames | The complete download showed Ready offline / 57 of 57 files. Start studying revealed the selected reading part. Book dismissed the panel on the tablet layout. A saved project's preview button changed its greeting through real JavaScript. This was connected local QA, not an iPad, a Home Screen app or an offline cold-start test. |
| User's desktop-width screenshot, 2026-11-22 | JavaScript lesson and navigation visible; browser/version not supplied | Desktop loading is visible. Account · new work indicates staged account work; it is not proof that two devices have synchronized successfully. |
| Earlier Android download screenshot | Ready offline / 57 of 57 files, followed by the reported obstructing panel | Download verification was visible. The later mobile return fix still needs the user's physical-phone confirmation. |
| iPad Safari and installed Home Screen | **Not yet tested on a physical device** | Separate login, offline reopening, keyboard/touch, update, backup and account-sync results are still required. |

### Automated coverage

The workflow uses Playwright **1.65.1**, with Chromium and WebKit in the matching pinned Linux container. Browser widths are simulations; neither engine run is a physical Android/iPad test.

- `tests/browser.cjs` and its exercise/project/sync suites: reading, quizzes, notes/bookmarks, real previews/checks, attempt history, project switching, image/website export, reviewed backup restore, conflicting edits and fixture-account synchronization. Phone/tablet/desktop navigation is exercised. The learning suite replaces the login gate only inside its test context.
- `tests/offline-browser.cjs`: explicit fresh download, interrupted body transfer and resume, verified Start studying, active-transfer preservation when leaving the panel, full browser restart offline, real HTML/CSS/JavaScript and exercise execution, damaged files, coherent partial updates and scoped repair. Persistent profiles are reused; ordinary HTTP caching is disabled, and Chromium also clears its HTTP cache. An uncached request must fail. The app is served on localhost, so this suite alone does not exercise the shared login restriction.
- `tests/auth-browser.cjs`: full app startup and the actual shared gate run at a routed non-localhost HTTPS origin. Tests hold implicit and PKCE callbacks until the mock SDK consumes them, verify approval before cloud access, reject a disallowed account without changing study data, admit a previously approved cached session while offline, explain signed-out offline access, and follow the native Google link through a deterministic same-window return.
- The authentication fixture substitutes only a synthetic permitted-email hash and mocks Supabase/provider responses; production account restrictions are untouched. These tests do **not** certify Google's live provider configuration, the real account allowlist, production RLS, browser-to-Home-Screen session transfer or physical iPad storage. Offline authentication uses routed resources; actual offline transport is covered by the separate worker suite.
- Node/Python contracts cover data validation, merge/recovery, preview guards, worker verification/deadlines and generated manifest integrity. Existing shared annotation storage is preserved in fixtures. **Actual highlight placement/selection anchors are not yet certified**; retaining their keys is not the same as verifying their rendered position.

## Device acceptance: first short study session

Use the same browser or installed app for preparation and study. Repeat separately in regular iPad Safari and the Home Screen app if you use both. Record device, OS/browser version and app version with each result. Keep a scoped study backup; use a review project so the exercise check cannot overwrite an important draft.

1. **Open and prepare while connected.** Confirm the lesson is visible and the version is 1.7.1. If sign-in is required, complete Google sign-in and confirm the return reaches Web Studio. Open Study offline, finish the download and wait for Ready offline. If already ready, Check saved pack should keep it ready.
2. **Return to learning.** Tap Start studying. Confirm the panel closes and the current lesson is visible. Reopen it and test Back to study and Book/Practice navigation. The current reading part must remain intact.
3. **Save identifiable work.** Add a short note, bookmark a reading part and create a project named Phase 7 review from the Study card template. In JavaScript, change the counter increment from 1 to 2; run the preview and confirm two clicks show Clicks: 4. Run Check exercise in the JavaScript lesson and inspect its feedback.
4. **Reopen with no connection.** Enable Airplane Mode and ensure Wi-Fi is also off. Close the app completely, reopen the same app/tab, and confirm the lesson, note, bookmark and review project remain. Run the preview again and check the counter. Merely viewing an already open page does not count as cold reopening.
5. **Reconnect and check sync.** Keep the app open and wait for Account · synced. On another device with the same account, open Account sync and use Load synced work when offered. Verify the exact note and review project; send an identifiable edit back and check it on the first device. Account · new work means a result is waiting to be loaded, not a sync failure.

Do not mark any unperformed item as PASS. A first report can be as short as:

```text
Device / OS / browser or Home Screen:
Web Studio version:
Lesson visible after Start studying: PASS / FAIL / NOT TESTED
Cold reopening with Wi-Fi and mobile data off: PASS / FAIL / NOT TESTED
Preview: two clicks show Clicks: 4: PASS / FAIL / NOT TESTED
Note / bookmark / project retained: PASS / FAIL / NOT TESTED
Same-account edit reaches other device and returns: PASS / FAIL / NOT TESTED
Any error text:
```

## Remaining acceptance before closing Phase 7

- **Files and recovery on iPad:** export the scoped study backup and a standalone website; confirm both are available in Files. Restore the backup in a separate regular browser/device context using the review/merge path and confirm code, notes and bookmarks. Preserve the original context as the comparison. Shared highlights use their separate existing controls.
- **Update survival:** preserve the review note, bookmark and project while an older installed pack receives the current release; verify the returned lesson and preview, then repeat offline reopening. If only the current version is available, record this as NOT TESTED; do not force a downgrade or remove saved storage to manufacture the test.
- **Interrupted download/repair:** record a physical-device result when an interruption or repair is actually exercised. Do not delete a good pack merely to reproduce the automated test. Verify repair returns the same data and other prepared Commonplace sections still open.
- **Shared annotations and navigation:** inspect a known existing Course highlight/bookmark and confirm the text/position matches before and after reopening. Check Commonplace/Coding parent links while connected, Course's return to Web Studio, portrait/landscape layouts, keyboard behavior and comfortable reading/touch targets. Parent folders require their own offline preparation.
- **Real sign-in and cross-device sync:** distinguish successful Google return from cached-session admission and distinguish the actual two-device test from simulated account tests. Never publish authentication tokens, private backup contents or account identifiers in a failure report.

Close the phase only after the required device results are recorded and any failures are resolved. Automation, source review and screenshots cannot substitute for those results. Expanding the full curriculum is a separate future decision.
