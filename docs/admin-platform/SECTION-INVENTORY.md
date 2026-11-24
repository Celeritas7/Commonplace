# U0 section and dependency inventory

Snapshot: `300bf3bcf1d62315ee47d40d320b969d871e0c26`, 2026-11-24.
This is a permission-catalogue proposal grounded in current navigation and source files, not a statement that every lesson is complete or browser-tested. Proposed IDs are not yet implemented. Do not infer authorization from path prefixes alone.

## Main catalogue

| Proposed ID | Parent | Source entry | Observed state |
| --- | --- | --- | --- |
| coding | root | Coding/index.html | Hub |
| coding.sql | coding | Coding/sql/index.html | Study section |
| coding.cpp | coding | Coding/c_and_cpp_study/index.html | Combined C/C++ section |
| coding.python | coding | Coding/Python/index.html | Study section |
| coding.ai | coding | Coding/AI_study/index.html | Book/notes plus JupyterLite |
| coding.bat | coding | Coding/batch_study/index.html | Partly authored curriculum |
| coding.web | coding | Coding/html_css_js_study/index.html | HTML/CSS/JavaScript Web Studio |
| mechanical | root | Mechanical/index.html | Hub |
| mechanical.automobile | mechanical | Mechanical/Automobile/index.html | Study collection |
| mechanical.calculations | mechanical | Mechanical/Calc_Console/index.html | Calculation console |
| mechanical.cmti | mechanical | Mechanical/CMTI/index.html | Study collection |
| mechanical.gdt | mechanical | Mechanical/GD&T/index.html | Study section |
| mechanical.harness | mechanical | Mechanical/Harness/index.html | Study section |
| mechanical.hoses | mechanical | Mechanical/Hose_routing/index.html | Study/route tools |
| mechanical.machine-design | mechanical | Mechanical/Machine_Design/index.html | Study section |
| mechanical.manufacturing | mechanical | Mechanical/Manufacturing/index.html | Study section |
| mechanical.motion | mechanical | Mechanical/Motion_lab/index.html | Motion lab |
| mechanical.sheet-metal | mechanical | Mechanical/Sheet_metal/index.html | Study section; checker.html is a related tool |
| mechanical.movements | mechanical | Mechanical/Brown_507_Movements/index.html | Related movements collection |
| maths | root | Maths/index.html | Hub |
| maths.statistics | maths | Maths/Statistics/statistics_practice.html | Linked study section |
| maths.algebra-trigonometry | maths | Maths/Algebra_Trigonometry/A1-exponents-powers.html | Linked study section |
| maths.calculus | maths | No active hub route | Planned; folder exists |
| maths.linear-algebra | maths | No active hub route | Planned; folder exists |
| office | root | Office_work/index.html | Hub |
| office.excel | office | Office_work/Excel_study/Section_1_Study.html | Preview + Phase A simulator |
| office.vba | office | Office_work/VBA_macros/Section_1_Study.html | Six section HTML files |
| office.power-query | office | No active route | Planned Power Query & Formulas card |
| languages | root | Language study/index.html | Planned phrasebook hub |
| languages.japanese | languages | No active route | Planned |
| languages.german | languages | No active route | Planned |
| languages.sanskrit | languages | No active route | Planned |
| languages.french | languages | No active route | Planned |
| exercises | root | Exercises/index.html | Planned cross-subject area |

Automobile's deeper route groups include Intro, Engine_systems (Exhaust_system, Fuel_system, Material, N42, Petrol_deisel), Torque_convertor_gears, Clutch_brakes_suspensions, Steering_Wheels_tyres, Electronics_electrical (Battery), AC_system, Airbags, Head_up_display, Driving_physics and Miscllinous. Use stable catalogue IDs and explicit mappings while preserving these existing URLs.

Other lesson/module pages inherit from a reviewed section registry only after their status and content classification are established. Temp, _archive, backup HTML, design handoffs, build/vendor directories and runtime support pages must not automatically become learner courses or downloads. Public historical copies still matter to confidentiality even if not listed in navigation.

## Authentication and study-data dependencies

| Component | Reuse | Required boundary before learner rollout |
| --- | --- | --- |
| _lib/gate.js | Google/email UX, callback recovery, shared SDK initialization | Server-authorized membership/section context; local marker is not authorization |
| reading-sync.js and BAT copy | Resource-set completion and local-first behaviour | Owner-specific local state, active permission checks, account-switch cancellation |
| extras.js | Bookmarks, highlights, notes without rewriting lesson DOM | Account-specific records; preserve legacy ownership and page mappings |
| _lib/progress-backup.js | Existing user access to export/import | Replace all-storage export/import with a safe versioned format |
| Python lib/practice-set.js | Practice/completion and cloud adapters | Separate authored assignments from personal exercises; owner migration |
| SQL lib/sql-sync.js | Existing field-specific merge behaviour | Account storage and in-flight request ownership; avoid cross-account merge |
| C/C++ lib/offline-practice.js | User-keyed exercise snapshot | Apply active section entitlements; review remaining unscoped records |
| Web Studio studio-cloud.js / studio-sync.js | Owner guard, cancel stale requests, revision checks | Extend to multiple isolated offline accounts rather than one owner marker |
| Web Studio studio-store.js / studio-sync-merge.js | Validated backups, recovery journals, conflict preservation | Integrate new stable lesson/material IDs and scoped storage |
| Excel excel-ribbon.js / .css | Reusable simulator UI | Capability-aware lesson adapter; no independent admin/auth |
| C/C++ code-exec function source | Validates signed-in user via getUser | Add section/membership authorization and quotas; deployed behaviour not verified by source review |

The current code-exec source forwards work to an external execution service after authentication. Do not equate 'authenticated' with authorization to execute C++ or use its paid resources. U0 made no execution requests and did not inspect secrets.

## Offline implementation matrix

| Section | Worker and pack source | Scope / ownership implications |
| --- | --- | --- |
| Python | sw.js, lib/offline-worker.js, offline-assets.js, tools/build-offline.py | Python scope and versioned shell; verified packs including runtime. Preserve successful offline startup. |
| BAT | sw.js, offline-manager.js, offline-assets.json | cp-bat-shell-v1 / cp-bat-downloads-v1; section scoped, no per-user pack boundary |
| C/C++ | sw.js, lib/offline-manager.js, offline-assets.js | cp-cpp-shell-v1 / cp-cpp-downloads-v1; hash-verified pack; user-keyed practice rows are separate |
| SQL | sw.js, lib/offline-manager.js, offline-assets.js | cp-sql-shell-v1 / cp-sql-downloads-v1; fixed study keys and account-independent pack |
| Web Studio | sw.js, offline.js, offline-assets.json | cp-web-studio-downloads-v1 / cp-web-studio-offline-v1; versioned manifest, resumable verification |
| AI Study | study-sw.js, book/js/sw-register.js; JupyterLite runtime | Multiple book/notes scopes; do not take over lab/notebook/tree/repl worker scopes |
| Excel | No section-specific worker/pack in current Excel files | Local lesson progress exists; do not claim a tested offline install |
| Other areas | Shared study tools and legacy offline-generation scripts | Inventory local state per adapter before enabling multi-user/offline packs |

Keep public runtime bytes reusable; do not redownload Python runtimes for every account. Private content and user work require distinct owner boundaries. Preserve progress on updates, download interruption, quota failure, worker replacement and account switching.

## Existing regression coverage to preserve

- tests/gate-login.cjs and Coding/{batch_study,sql}/tests/login-return.cjs.
- C/C++ login workflow and section tests.
- Section offline-manifest workflows and build checks.
- Web Studio storage, backup, sync, sync-merge, auth, worker and browser tests.
- Existing quiz-routing checks.

A shared gate/study-tool change can affect several offline manifests and CI workflows. List all impacted manifests in each implementation PR and regenerate/check them together. U0 changes none.
