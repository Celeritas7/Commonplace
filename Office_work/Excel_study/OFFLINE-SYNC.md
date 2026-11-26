# Excel Phase E1 — assigned calculation history and offline synchronization

The central Commonplace learner workspace already provides signed per-owner offline packs, an account/material-version-scoped study store, pending synchronization, revision conflicts and backups. This phase extends that path only for the authorized fixed SUM exercise. It does not add another service worker, account system, database, role, or policy.

## Delivered
- Pressing **Apply formula** records the submitted formula, the three entered values, UUID, client timestamp, whether the formula was accepted and the calculated result (null on rejection). Results are local self-practice evidence, not a certified score. The latest five submissions are shown in the Calculation history panel; all recorded entries are stored in the existing progress record.
- Reading existing version 1 worksheet records without history is unchanged. Optional worksheet.attempts is strictly validated for SUM assignments, including recomputing accepted/result, unique UUIDs and field bounds. Existing records are not rewritten automatically. A reset clears only the current draft, not previous recorded attempts. The cap is 40 submissions per assigned material version: no automatic pruning; after the cap the draft still works but a visible message says the new submission was not recorded. An append-only unlimited history and reporting permissions are separate future work.
- The current central host attaches the verified account and exact published material identity; its offline store/outbox and existing cp_sync_read / cp_sync_write protocol handle persistence and retries. No database migration is needed for this bounded extension of the JSON study record. Concurrent edits remain conflict alternatives under the existing sync contract, not silently merged assessment histories. Older clients that cannot validate the optional field may require an update; keep existing data and backups.
- Refresh the central public shell manifest for the new module and changed public code. The standalone B–D2 preview remains session-only and unchanged. Phase B–D guided/independent assessment and workbook submission/assessment are not yet integrated into the authorized workspace.

## Verification and remaining gates
Four executable test groups exercise record validation, legacy and size boundaries, and the existing sync-store/account-store against a synthetic memory DB and RPC fixture (offline reopen, lost-ack retry, backup, account switch and material versions). A browser regression is provided for offline reset/reopen/reconnect; run it with the existing central Playwright suite. Production activation is still disabled in platform/admin/deployment.mjs. Central G0 recovery and shared-access readiness, hosted permissions, actual database sync and physical iPad testing remain prerequisites. No production connection or change was made. Do not enroll a real learner on the basis of this PR alone.

Run from repository root: node --test platform/tests/excel-calculation-history.test.mjs; node platform/tools/build-offline-shell.mjs --check; npm run test:browser --prefix platform -- tests/browser/excel-history.spec.mjs.

## E2 — assigned guided SUM and independent revision

The authorized fixed SUM worksheet now offers two explicit practice modes. Guided SUM checks the original inputs, the SUM expression and a recorded submission. Independent revision asks the learner to match B3 to original B2, preserve B2 and B4, and calculate the total, with four criteria graded from the assigned dataset. Both modes use the exact published material already delivered by the authorized path. No public scenarios are substituted; private quizzes and released-answer rules are unchanged. Phase A Ribbon orientation is preserved. Formatting, clipboard-specific and broader assessments need additional reviewed capabilities.

Activity tags `guided-sum-v1` and `independent-match-v1` identify the template version in the existing calculation record. Untagged E1 records retain their original shape. Active mode persists with the draft. Reset and leaving a mode preserve submissions. Grades are recomputed from recorded values/formula and the pinned dataset; no trusted or certified score is asserted. The shared 40-submission cap remains, with a visible limit and no automatic deletion. The same account/material version identity, offline queue, retry, conflict alternatives and backup path apply. Existing worksheet completion is distinct from assessment results. Older clients need an updated public shell. No database migration, authentication change or production activation is included.

Verification: expanded calculation-history test suite covers rubric checks, activity allowlist, shared payload bounds, actual renderer event handlers with a mock DOM, and tagged records through offline reopening, reset, lost-ack retry, backup and account/material isolation. Added a Playwright offline regression for CI. Physical iPad, hosted database and full browser acceptance remain pending. This is the SUM slice of E2; richer Phase B–D controls and append-only reporting require further work.

## E2B — assigned formatting and clipboard practice

The central authorized three-row SUM worksheet now opts into five working Home Ribbon tools. Bold, Fill Color (yellow), and Borders toggle the actual A1 heading. Copy and Paste copy only a valid numeric B2 value into B3 through an internal session clipboard. Other Ribbon tools and orientation-only mounts stay previews. No system clipboard, cut, arbitrary text edits, formula copying, or full workbook editing. The standalone Phase B–D2 practice page is not changed.

The formatting exercise grades three style flags plus preservation of the original numeric inputs; it uses a separate Submit formatting control and does not require SUM or mark the worksheet as studied. Clipboard practice grades original B2/B4, B3 matching original B2, the SUM formula, and recorded Copy/Paste use (five criteria). Manual edits of B2/B3 invalidate the copy evidence; reset/starting another mode clears draft tool state and session clipboard. The clipboard itself never persists and is discarded when leaving the mode or renderer. Submitted tool snapshots and optional draft tool state share the existing version-1 progress record and 40-submission cap. Format submissions retain the existing calculation-shaped record fields for compatibility; their rubric is independent of the calculation accepted/result fields. Old E1/E2 records remain readable. Older clients require the new shell before loading new records.

The published assignment remains the only data source. Practice results are client-side self-assessment, not proof of actual actions to a server. No new access rules, storage, database migration or deployment activation. The public shell manifest is refreshed for the optional Ribbon capability and validated record extensions. Added tests for rubrics, strict snapshots and size bounds, actual Ribbon event handlers in a mock DOM, and existing sync/backup/account isolation. A real-browser offline regression is supplied for CI. Physical iPad and hosted acceptance remain pending under E3 and central G0/G1 gates.


## E3 — Excel device acceptance preparation

**Physical device and hosted backend acceptance are pending, not implied by a merged PR or CI.** E3 adds a dedicated Home Screen entry for the existing public offline sample, `platform/learn/offline-preview.html`, with a distinct manifest identity and launch URL. The real learner entry, account model and material permissions are unchanged. The shared shell preparation now waits for activation and control of the open learner page after verified shell download before the host can report Ready offline. Interrupted activation has a retry message; it does not clear storage.

### iPad acceptance checklist (fictional sample only)

Open the updated HTTPS deployment's exact `/platform/learn/offline-preview.html` path in Safari (do not append a query string). Install using Share → Add to Home Screen; call it **Excel Test**. If Safari offers Open as Web App, enable it. Launch the new icon **while connected** and prepare offline there; Safari and installed web app storage may differ. Keep all existing personal Commonplace icons, website data, notes, and backups untouched. If the new entry or install option is unavailable, report it rather than altering the existing installations.

| ID | Action | Required evidence |
| --- | --- | --- |
| E3-01 | Open new Home Screen icon online, tap Study offline / Resume download; if an application update is offered, save/reopen it first. | Excel offline device test banner; Ready offline · 3 materials; no error. |
| E3-02 | Open Prepare a shipment to Manila. In guided SUM use `=SUM(B2:B4)`, then start independent revision, set B3 to 12 and apply SUM. | Guided submission complete; independent score 4/4; B5 = 29. |
| E3-03 | Start heading formatting. Select A1 and tap Bold, Fill Color and Borders; Submit formatting. Add a fictional note and bookmark. | Yellow/bold/bordered heading, 4/4, Saved on this device. |
| E3-04 | Enable Airplane Mode; explicitly turn Wi-Fi off. Close the installed app from the app switcher and reopen the same icon. Choose Resume saved study. | No blank page or live login. Heading formatting and score, note and bookmark survive. |
| E3-05 | While offline, start clipboard practice, select B2 → Copy, B3 → Paste, B5 → enter SUM and Apply. | B3 = 12, B5 = 29, clipboard score 5/5; changes waiting to sync. |
| E3-06 | Close and cold-reopen twice more while offline. Open the quiz and save a response. Open Inventory practice file and download the sample TXT. | Three cold reopen passes; both scores remain; quiz can be answered and file can be opened offline. |
| E3-07 | Reconnect; use Sync now if needed. | No changes waiting to sync; scores and notes still present. This verifies the **simulated** sample sync only. |
| E3-08 | Export study backup from Sync, backups and access. Confirm it is available in Files. Lock saved study and check Resume saved study is disabled while offline. Reconnect and refresh online access. | Backup file exists; locked sample cannot reopen offline; sample data returns after online access. Do not share backup contents publicly. |

Report iPadOS version, device/install type, exact tested origin and source revision if known, each ID as PASS/FAIL/NOT TESTED, and a screenshot or error text for failures. Avoid real names, account data and real lesson contents. No production activation or real learner enrollment is authorized by this sample test. Real XLSX download/open/save acceptance belongs to the separate D2 practice page; the central sample attachment is TXT. Production offline acceptance must be repeated after central access/recovery approval and hosted rollout with authorized test accounts.

## R1 — incomplete application update recovery

The pre-R1 worker could activate automatically after all old pages closed, even
though its new shell had not been downloaded. Its fetch handler then looked only
in the new cache and tried the network, leaving a complete older shell unused.
The existing failed-update test exercised the old worker, so it missed this
transition. This failure is reproduced by the new worker and real-browser tests.

The correction chooses one verified complete public shell before serving its
page, modules or styles. An incomplete active worker can use a previous complete
release directly, including after a worker restart. Legacy completion markers
remain usable by verifying the saved release's combined asset digest. Interrupted,
cancelled or corrupt downloads keep the previous release available. New completion
markers retain the exact public manifest; partially saved files remain reusable
when the download resumes.

Open pages keep their selected revision while a new download finishes and across
worker restarts. New navigation can use the completed update. Prior complete
shells are retained rather than deleted during activation; their additional storage
is an intentional recovery tradeoff. Account permissions, the 40-submission cap,
study records, pending changes, signed private packs, backup formats and central
deployment configuration are unchanged.

### Repeatable automated checks

From the repository root:

```sh
node --test platform/tests/acceptance-worker.test.mjs platform/tests/shell-worker.test.mjs platform/tests/excel-shell-control.test.mjs
node platform/tools/build-offline-shell.mjs --check
npm run test:browser --prefix platform -- tests/browser/excel-shell-update.spec.mjs tests/browser/excel-device-acceptance.spec.mjs tests/browser/excel-history.spec.mjs
```

The dedicated browser regression uses a loopback server and fictional sample
data. It downloads the old shell through the real UI, saves work, installs an
updated worker, closes the last controlled page and observes natural activation
without downloading the update. Reopening with the server rejecting public assets
must produce zero public asset requests and render the saved revision. A further
offline cold reopen must retain the note, bookmark, SUM submission, pack documents
and attachment bytes. This is client/offline evidence, not hosted sync or iPad
acceptance.

### Additional physical iPad update acceptance

Repeat E3-01–E3-08 in the same **Excel Test** installation after the correction is
merged and the test site is updated. On a controlled test origin with two reviewed
shell revisions, also check the update transition below; do not change production
activation or clear any device data to perform it.

| ID | Action | Required evidence |
| --- | --- | --- |
| R1-01 | Prepare a complete prior shell and save a fictional note, bookmark and calculation. Allow the browser to discover the next revision, then close all pages before downloading that update. | Prior pack and study work are saved; the update shell is incomplete. |
| R1-02 | Disconnect, cold-open the same Home Screen icon and resume saved study. Repeat after closing it again. | Saved application loads; note, bookmark, submission and downloaded materials remain usable. |
| R1-03 | Reconnect and use Study offline / Resume download. Interrupt once, reopen offline, then reconnect and finish. Reopen the updated application when work is saved. | Prior release remains usable during interruption; the completed update loads after reopening; records and packs remain. |

Physical iPad results remain **NOT TESTED** until these steps are observed on the
device. R1 is merged in PR #118. R2 is described below; R3/R4 and then F2–F6, G/H
remain in [the curriculum sequence](CURRICULUM.md#correction-sequence-before-f2).

## R2 — formula rules and saved-history compatibility

Earlier clients removed all whitespace before recognizing a formula, which could
accept split tokens such as `=S U M(B 2:B4)`. The shared bounded parser now checks
the actual function and reference tokens and accepts the supported equivalent
absolute/mixed references. Current input criteria and the SUM-expression criterion
are evaluated independently; a bad cell no longer removes formula credit, and a
bad formula does not remove valid input credit. The calculation itself succeeds
only when both syntax and all required numeric inputs are valid.

Simply replacing the evaluator would invalidate some earlier progress records:
stored `accepted`/`result` fields are recomputed during reading and backup restore.
R2 therefore adds `evaluation_version: 2` only to newly appended calculation
records. Records without that field keep the frozen earlier evaluator for
validation, including its original numeric conversion. Unknown explicit versions,
extra fields and inconsistent results remain invalid. Original IDs, timestamps,
formulas, values and outcomes are not rewritten or dropped. The outer worksheet
and study-record version, material/account identity and 40-submission cap remain
unchanged.

The UI distinguishes historical evidence from current feedback. If current
formula/input checks disagree with an earlier recorded outcome, Calculation history
shows both. Practice scores use the current criteria and explain that earlier
recorded outcomes are retained. Opening an old applied draft whose formula now
needs correction displays a review message and an empty current result; opening
alone does not rewrite progress or discard the draft. Notes, bookmarks, pending
operations, conflict alternatives and saved packs follow the existing owned store
and backup path.

The public shell manifest includes the shared parser and updated assigned-study
modules. Update the public application shell on each device before expecting an
older client to read new version-2 evaluations; pre-R2 clients reject the additional
field rather than silently reinterpret it. R1 preserves old complete shells and
open-page consistency during that update. Keep existing origins, installations,
data and backups.

### Repeatable checks and device acceptance

```sh
node --test platform/tests/excel-formula-accuracy.test.mjs platform/tests/excel-calculation-history.test.mjs platform/tests/excel-formula-foundations.test.mjs
node platform/tools/build-offline-shell.mjs --check
npm run test:browser --prefix platform -- tests/browser/excel-formula-accuracy.spec.mjs tests/browser/excel-history.spec.mjs tests/browser/excel-device-acceptance.spec.mjs
```

Regression fixtures cover all five standalone professional contexts, malformed
tokens, supported reference forms, independent partial credit, mixed old/new
histories, unknown evaluation versions, contradictory results, offline reopening,
lost-acknowledgment retry and repeatable backup restore. The browser checks use
fictional data and exercise the actual personal and central controls.

After the reviewed test site is updated, repeat the existing E3 physical iPad
checklist. In the Excel Test worksheet, confirm that `=S UM(B2:B4)` is rejected,
`=sum($B$2:$B$4)` calculates the total, an incorrect formula retains correct-cell
credit, and saved old/new attempts survive an offline reopen and backup export.
Physical-device acceptance remains pending. No production synchronization,
database/authentication/permission change, learner enrollment or G0 clearance is
part of R2.

## R3 — shared curriculum without record migration

The personal and assigned adapters now import the same reviewed versioned
curriculum core. Current central calculation uses `assigned-sum@1`; practice
grading uses `assigned-practice@1`. The original legacy evaluator is retained
unchanged for unversioned saved attempts. R2 `evaluation_version: 2` entries retain
their existing formula acceptance, numeric requirements, precision and outcomes.
These evaluation markers are distinct from curriculum and material versions.

R3 adds internal `curriculumRef` and `runtimeRef` to prepared worksheet models.
Those references are not inserted into published bundles, progress records or
backup payloads. The authorized dataset, canonical material document bytes and
assignment/activity identity remain unchanged. Existing private pack manifests,
downloaded documents/attachments, signed leases and pending operation identities
are preserved. There is no migration, new store, history pruning or limit change.

The public shell gains the shared core and its module facade. The generated
manifest verifies those dependencies with the assigned adapters. R1's complete
revision fallback and open-page consistency continue to apply; keep existing
installations and website data when updating. No additional personal-study
service worker is installed.

Repeatable checks from the repository root:

```sh
node --test platform/tests/excel-curriculum.test.mjs platform/tests/content-contracts.test.mjs platform/tests/excel-calculation-history.test.mjs platform/tests/excel-tools-history.test.mjs platform/tests/excel-formula-accuracy.test.mjs platform/tests/excel-formula-foundations.test.mjs
node platform/tools/build-offline-shell.mjs --check
npm run test:browser --prefix platform -- tests/browser/excel-curriculum-shared.spec.mjs tests/browser/excel-formula-accuracy.spec.mjs tests/browser/excel-history.spec.mjs tests/browser/excel-device-acceptance.spec.mjs tests/browser/excel-shell-update.spec.mjs
```

The new fixtures pin an existing material's serialized bytes and progress key,
check exact-version rejection and shared evaluation/grading, and verify the
updated application through a cold offline reopen with saved notes, bookmarks,
attempts and pack bytes. Existing R2 retry/backup and R1 update regressions remain
part of verification. Actual iPad/hosted acceptance and G0 remain pending; follow
the existing E3 checklist after the reviewed test deployment updates.

## R4 — learning-records planning

R3 is merged in PR #122. The [R4 plan](LEARNING-RECORDS-PLAN.md) audits current
history and recovery limits and defines the future implementation contracts.
It selects a companion journal database so an older R1-pinned shell can still
open the existing version-1 U8 study/pack database. New immutable attempts,
bounded append/read operations and durable receipts are separate from the
existing mutable `cp_sync_read` / `cp_sync_write` path.

Migration must preserve attempts from current work, pending/base snapshots,
conflicts and retained resolution history. Original evaluation outcomes stay
unchanged; missing original grades are labeled rather than reconstructed as
historical facts. A draft conflict choice must retain both sides' attempts.
Persistent reading, guided, independent and quiz progress have distinct semantics,
and future reports belong to a separately authorized central Admin Studio path.

R4 adds no persistence implementation. The 40-entry central cap, personal session
history, v1 backup bounds, pending operations, saved packs, shell manifest and
activation settings are unchanged. The plan specifies segmented complete backups,
old/new-client coexistence, crash/quota recovery and future acceptance cases;
those cases are requirements, not completed device/hosted verification. The plan
is merged in PR #125; the following F2 phase continues curriculum development.

## F2 — personal reference lessons and existing offline records

Section 3 adds four personal lessons on relative, absolute and mixed references,
multiplication, division and formula copying. The new `personal-references@1`
runtime and `reference-foundations@1` rubric are separate from F1 and central SUM.
Central publication remains the existing authorized SUM contract. Permissions,
profiles, assignments and reporting remain in Commonplace Admin Studio.

The shared curriculum file is part of the central public shell, so the generated
45-file shell manifest is refreshed for its changed bytes. R1's complete-cache
fallback and open-page consistency continue to apply. Existing private packs,
material bytes, record schemas, evaluation versions and backup payloads are
unchanged. There is no new personal-study service worker, origin or installation.
Keep existing website data and packs when updating the reviewed application.

F2's personal attempts and independent progress stay in memory for the current
page session, with a disclosed limit of 100 task submissions and a latest-10
history view. Reloading ends that session. The independent task's exact lesson,
rubric, runtime, scenario and dataset identity is recorded in memory, and quiz
feedback remains separate from task completion. No persistent progress, journal
database, migration or change to the central 40-submission cap is implemented.
R4's durable-record requirements remain future implementation work.

The new engine/workbook/browser regressions cover all five contexts, independent
partial credit, copy failures, syntax boundaries, download contents and unchanged
browser storage. Existing R1/R2/R3 checks continue to cover central offline
reopening, packs, old/new saved outcomes, retries and backups. Native Excel and
physical iPad acceptance remain pending, as do hosted recovery and G0. F2 does
not activate production synchronization, alter hosted databases/authentication/
permissions or enroll learners.
