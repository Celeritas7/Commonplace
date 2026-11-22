# Web Studio — Phase 0 audit and implementation checklist

Date: 2026-11-15 (Japan)
Repository: Celeritas7/Commonplace
Audited main commit: `2f150ee24637fa2225e72387fae7fd386fb03856`
Scope: `Coding/html_css_js_study/` and its immediate shared dependencies.

**Reading this document:** the audit, inventory, findings and design brief below describe the pinned Phase 0 commit, not the current application. The phased checklist is maintained as implementation progresses. The current sample release is v1.7.1 with account sync and verified offline packs; [PHASE7_VALIDATION.md](PHASE7_VALIDATION.md) records current validation evidence and outstanding device acceptance.

## Historical Phase 0 decision

Proceed to Phase 1 design prototype. The current application is a course tracker, not yet an integrated web-development learning environment. Preserve that tracker while adding Web Studio capabilities incrementally. No runtime, authentication, production database, study data or deployment changes are part of Phase 0.

This is a source audit plus a small Node data validation, not a browser/device acceptance test or full security audit. No live personal records were accessed. Linked Drive PDFs and Udemy lessons were not opened; their content quality, completeness and accessibility remain unverified.

## Historical Phase 0 inventory

| Feature | Existing evidence | Status / implication |
| --- | --- | --- |
| Course structure | data/course-index.js; index.html builds rows from BOOTCAMP | 35 sections, 5 parts, 441 numbered entries, 8 exercise titles, 4 quiz titles: 453 unique generated IDs |
| Course tracker | index.html: render, stats, secStats | Completion, section totals, search including notes, type filters, starred/notes views, bulk mark/clear |
| Continue | index.html: stats and cont click handler | Opens first unfinished item; not a true most-recent-session resume despite saved last field |
| Notes / stars | index.html: row and delegated handlers | Local state; no inline code workspace |
| External study material | README and BOOTCAMP.books | Contents/full PDF and five section PDF links for sections 1–5; links only |
| Lesson content | README and rendered page notice | Teaching content stays outside this section |
| Exercises / quizzes | typeOf and stats | Titles and completion ticks, not runnable course exercises |
| Shared enhancements | progress-backup.js loads extras.js, quiz/quiz.js and autoscroll.js | Shared annotations and potentially generated quizzes must be distinguished from course exercises |
| Install metadata | pwa/manifest.json and three icon files | Standalone display, section scope, index.html entry |
| Offline cache | sw.js | Ten precache URLs; best-effort caching, no verified download UI |
| Backups | _lib/progress-backup.js | Export/import exists but has important scope and restore limitations |
| Editor / preview / projects | Section file inventory and index implementation | Absent |
| Section-owned tests / offline manifest generator | Recursive repository inventory | Absent |

The inventory has eight files: README, index HTML, course data, service worker, manifest and three icons. File count excludes directories. Course IDs were computed with the existing numbering rules in Node: all 453 are unique, sections are contiguous 1–35. Counts measure index entries, not available lessons.

## Data preservation contract

| Stored item | Current representation | Required protection |
| --- | --- | --- |
| Tracker | localStorage `commonplace_wdb_v1` | Keep the original key and schema during the UI-only phase |
| Completion / stars / notes | done, star, notes maps keyed by l1…l441, x1…x8, q1…q4 | Freeze current ID-to-title mapping before adding or rearranging content |
| UI state | open, show, hide, openNote, last | Preserve compatible values; do not conflate last with implemented resume |
| Shared annotations | cpx.bookmarks, cpx.marks, cpx.resume | Shared across sections; marks/resume depend on page paths and DOM anchors |
| Authentication | Shared gate/session storage | Never include credentials or session tokens in new project exports; do not clear shared storage |
| Future projects | Not implemented | Use separate versioned storage; keep imported files and large project assets separate from tracker state |

Source: index.html lines 161–170 and row-building logic; extras.js lines 12–15 and PAGE path mapping.

Existing users' records have not been read or migrated. Phase 0 protects them by making no runtime edits. Phase 1 must retain the current page URL and IDs, preserve unknown state fields, and verify existing annotation anchors before changing the DOM. Prefer new explicit IDs for new lessons; never renumber legacy records in place. Any later migration needs an exact mapping, recoverable backup and repeat-run checks.

## Historical Phase 0 findings and priorities

| ID | Priority | Evidence and impact | Planned action |
| --- | --- | --- | --- |
| W0-01 | High | Ordinary lesson IDs derive from array order. Inserting/reordering entries can silently misassign old notes and completion. | Freeze a legacy mapping before curriculum changes; regression fixture in Phase 1 |
| W0-02 | High | save() catches storage errors without feedback; malformed JSON loads as empty state and subsequent saves could overwrite it. | Visible save failure; preserve malformed raw data and offer recovery |
| W0-03 | High | Shared backup dl() exports every localStorage entry on the origin, potentially including auth/session data. | Do not share existing full backup files; future scoped export must allowlist study/project records and exclude auth |
| W0-04 | High | Shared backup import only sets absent keys, except special crs:: merging. Existing commonplace_wdb_v1 is skipped. | Add explicit section restore/merge semantics before calling backup a recovery guarantee |
| W0-05 | High | sw.js swallows individual precache failures; startup also hides registration failures. | Verified pack, visible failures and bounded retries in Phase 6 |
| W0-06 | High | Precache omits gate.js, dynamically needed supabase.js, quiz.js, autoscroll.js and referenced font binaries. Runtime caching is incidental. | Generate transitive dependencies plus explicit dynamic assets; preserve account restrictions |
| W0-07 | Medium | Cache-first response with background refresh can show older code; ignoreSearch collapses query variants; no repair screen. | Section-only repair and tested update flow; do not rely on cache-busting query alone |
| W0-08 | Medium | No integrated lesson reader, editor, preview or course exercise execution. | Phases 2–4; keep external resource labels honest |
| W0-09 | Medium | Continue clears text/show filters but retains hidden types. If its target type is hidden, lookup can be null before scrollIntoView. | Reveal target type and guard missing targets; Phase 1 regression case |
| W0-10 | Medium | Note input saves but does not refresh note-count statistics until another render. | Refresh counters without disrupting typing |
| W0-11 | Medium | Tracker uses its own local state; no reading-sync integration found in its entry/dependency chain. | Do not promise cross-device tracker sync; define separately if requested |
| W0-12 | Medium | Shared quiz/scroll/bookmark controls may compete with a future coding workspace. | Make deliberate per-screen integration choices; avoid duplicate course/generated quiz presentation |

Priorities describe implementation order, not claims of a confirmed user incident. W0-09 is a source-derived failure path, not a reproduced browser result.

## Dependencies and authentication

Entry loads shared gate.js, local course data and progress-backup.js; font CSS references local WOFF2 files. progress-backup.js dynamically adds shared study, quiz and scrolling layers. The gate conditionally loads local supabase.js for sign-in and handles saved-session admission and OAuth return.

No unconditional URL-rewriting router was found in the section entry. extras.js rewrites history only for its specific cpx-resume hash. Do not assume the BAT OAuth bug occurs here. Future navigation must preserve authentication callback parameters until the shared login flow consumes them. Physical Safari/Home Screen storage, sign-in return and offline admission need separate acceptance checks; source review does not certify them.

Private PDF links remain external. Do not copy private documents into the public repository as part of the redesign. A later private file-import design must establish storage, backup and offline reopening behaviour.

## UI design brief

Working name: Web Studio. Keep the legacy course tracker reachable throughout development.

- Home: continue learning, resume saved project when implemented, HTML/CSS/JavaScript tracks.
- Learn: readable lesson content and editable examples; external materials explicitly labelled.
- Practise: task, code, preview, hints and feedback.
- Projects: saved webpage cards, meaningful names and last-edited state.
- Offline: real verification state, download progress and repair; never show a fabricated ready state.
- Desktop / landscape iPad: editor beside preview, optional collapsible lesson pane.
- Portrait iPad / phone: Lesson, Code and Preview tabs with sufficient touch targets.
- Visual direction: restrained language colours, dark editor, light preview, accessible theme alternatives.
- New/unbuilt areas must be labelled or omitted, not represented by controls that imply working features.

A visual prototype is the Phase 1 review deliverable before the main redesign is implemented. Phase 0 produces this brief, not a finished mockup.

## Phased checklist and acceptance gates

Checked implementation items describe shipped functionality, not a physical-device sign-off. The v1.7.1 baseline passed [Chromium/WebKit CI run 44559585170](https://github.com/Celeritas7/Commonplace/actions/runs/44559585170) for [PR #64](https://github.com/Celeritas7/Commonplace/pull/64). Phase 7 tracks new validation and the remaining manual checks.

### Phase 0 — audit (complete)

- [x] Pin current main and inventory section files.
- [x] Validate course counts, unique generated IDs and section sequence.
- [x] Trace tracker state, shared backup and immediate dynamic dependencies.
- [x] Record risks, external-content limitations and authentication boundaries.
- [x] Define UI brief, preservation rules and reviewable phase boundaries.
- [x] Make no feature, database or deployment changes.

### Phase 1 — UI prototype, then navigation

- [x] Apply the reviewed learning UI with phone, portrait iPad and landscape/desktop layouts.
- [x] Retain the tracker and URL; freeze the legacy ID mapping in `tests/legacy-id-map.json`.
- [x] Scope new styles to Web Studio and retain direct Commonplace/Coding navigation.
- [x] Preserve notes/stars/completion and stored annotation records across refresh and UI transitions in automated fixtures.
- [x] Fix the Continue filter edge case and stale note totals (`tests/legacy.cjs`).
- [x] Add visible storage errors, scoped exports and recoverable import/merge.
- [x] Add touch targets and heading focus; automated phone layouts verify navigation without forcing the editor keyboard.
- [ ] Complete physical-device visual/accessibility review, including contrast, touch comfort and actual annotation placement (Phase 7).
Acceptance: tracker fixtures and navigation/data-preservation suites pass. Physical review remains distinct from viewport simulation.

### Phase 2 — editor and real preview

- [x] HTML/CSS/JS editing, explicit Run, console/errors, reset and local drafts.
- [x] Sandbox preview away from parent storage, login and navigation.
- [x] Validate preview messages; block parent privileges and stop ordinary runaway loops/recursion.
- [x] Identify and block unsupported external assets/services in the preview; warn about export dependencies.
Acceptance: Chromium/WebKit tests execute real JavaScript, retain drafts through reopening, and verify that preview code cannot read parent study/session storage. Extremely expensive native browser operations are not guaranteed preemptible; see the README's execution limits.

### Phase 3 — sample learning book and learning flow

Scope revised by the user: prepare only enough sample material to review the app; full course review and curriculum conversion are deferred.

- [x] Three samples: HTML reading card, CSS spacing and JavaScript click counter.
- [x] Selected Drive HTML/CSS topics reviewed; JavaScript mapped to the course outline with API references. Original explanations and exercises; source scope is visible.
- [x] Stable lesson IDs, editable shared project and saved-place resume.
- [x] Reading, prediction, practice, five-question check, notes/bookmarks and separate progress indicators.
- [ ] Physical iPad review of the sample learning flow.
- Deferred: full curriculum and any private PDF import strategy. No private book files are published.
Acceptance: review the three samples in sequence, edit/run/check, then reopen to confirm saved study records. See [sample sources and scope](SAMPLE_LESSONS.md).

### Phase 4 — exercises and feedback

- [x] Three sample exercises with starter code, progressive hints, browser checks, possible solutions and retry history.
- [x] Separate automatic correctness from visual self-review.
- [x] Distinguish original authored exercises from lesson quizzes and shared generated quizzes.
- [x] Mistake Bank, latest 20 attempts per exercise, scoped backup inclusion and visible save failures.
- [ ] Physical iPad Safari/Home Screen acceptance (tracked in Phase 7).
Acceptance: known correct/incorrect solutions behave predictably and feedback explains failures. Node coverage and the Chromium/WebKit acceptance suite cover the sample rubrics, errors, cancellation, local history and data preservation; device acceptance remains separate. See [exercises and feedback](EXERCISES.md).

### Phase 5 — projects and backup

- [x] Named local projects, three templates, duplication/rename and embedded small raster images.
- [x] Scoped backup, import validation, reviewed merge/replace choices and recoverable writes.
- [x] Export a runnable standalone HTML website; exclude study/auth/session and unrelated records.
- [ ] Physical iPad file download/open/import acceptance (tracked in Phase 7).
Acceptance: export/import round trip preserves code/assets, handles invalid imports and does not overwrite unrelated work. See [projects, backups and recovery](PROJECTS_AND_BACKUP.md).

### Phase 6 — reliable offline preparation

- [x] Small worker install, explicit study pack, byte sizes and remaining progress.
- [x] Hash verification, reuse unchanged files on resume, deadlines and visible retry.
- [x] Generated manifest checks and automatic main refresh cover shared-file changes and dynamic dependencies.
- [x] Scoped repair preserves study data and downloaded packs.
- [x] Safari/Home Screen preparation and online-only services documented in [OFFLINE_STUDY.md](OFFLINE_STUDY.md).
Acceptance: automated fresh setup, interrupted resume, corrupt file, old-cache upgrade, repair and offline reopen checks are defined in the worker/manifest/Chromium/WebKit suites. Actual run results must be recorded with delivery; physical iPad Safari and Home Screen acceptance remains in Phase 7.

### Phase 7 — device and integration validation (in progress)

- [x] Establish the v1.7.1 automated Chromium/WebKit baseline, including simulated phone/tablet/desktop widths, real offline execution, resume, repair, updates and saved-work preservation (PR #64).
- [x] Preserve unrelated section records/caches in fixtures; SQL and BAT checks passed on the baseline PR.
- [x] Add the Phase 7 app/shared-gate integration suite and evidence record; require Chromium/WebKit CI results before merge. See [PHASE7_VALIDATION.md](PHASE7_VALIDATION.md) for fixture boundaries and run evidence.
- [ ] Confirm the latest **Start studying** mobile fix on the user's Android device. The earlier screenshot verified a completed download, but reported the lesson-obscuring panel; it was not a passing study-flow test.
- [ ] Test physical iPad Safari and installed Home Screen separately: sign-in return, cold offline reopen, editing/checking, notes/bookmarks, updates and backups.
- [ ] Confirm actual shared annotation placement and comfortable keyboard/touch/contrast behavior on physical devices.
- [ ] Verify production cross-device account sync using the same signed-in account; distinguish this from fixture-account tests.
- [ ] Record any real-device Commonplace navigation or other-section regressions found during review.
Acceptance: [PHASE7_VALIDATION.md](PHASE7_VALIDATION.md) must distinguish passed automation, user-reported results, not-tested checks and known limitations. This phase remains open until its required device checks are recorded; no physical iPad result is inferred from WebKit.

## Historical Phase 0 validation record and remaining uncertainty

Performed: immutable GitHub source reads, full section file inventory, immediate dependency review, isolated Node evaluation of course data and numbering validation. No repository runtime files were edited. No device or browser tests were performed in Phase 0.

Not verified: Drive PDF contents, external course access, actual device storage, cloud session/sync operation, deployed cache state, teaching accuracy across linked materials. Existing shared generated quizzes were identified as a dependency but not exhaustively audited.

The Phase 0 recommendation was to begin with a visual prototype and apply runtime changes after design review. That work has since shipped through the phases above. The ongoing preservation rule remains: use scoped pull requests, keep unrelated work intact and refresh affected offline manifests whenever implementation changes app or shared files.


## Added phase — account synchronization (v1.6)

Added after Projects and backup: local-first Supabase synchronization of projects/code, native notes/bookmarks/progress/quizzes/exercises and the original course tracker, using Commonplace’s existing account. Incoming changes use an explicit safe reload; conflicting code and notes are retained. See [CLOUD_SYNC.md](CLOUD_SYNC.md). Shared highlights and downloaded packs remain local. Reliable offline preparation is implemented in Phase 6; physical-device acceptance remains in Phase 7.
