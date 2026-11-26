# Excel curriculum — Phase F

The standalone personal-study path is expanded in small reviewable modules. F1 introduces the curriculum index and essential formula lessons. The existing Section 1 URL, gate, workbook API and local reading key remain available. R3 shares versioned lesson metadata, evaluation and grading with central assigned learning. The central publication contract still supports reviewed SUM assignments; publishing the other personal formula lessons and extending persistent progress require separate integration. F1 adds no account-wide storage, auth or database changes.

| Module | Coverage | Status |
| --- | --- | --- |
| F1 | Section 2 SUM / AVERAGE / COUNT / MIN / MAX; blanks versus zero; five professional contexts; guided/independent tasks, quiz and separate XLSX starter/solution | Merged in PR #116 |
| F2 | Relative, absolute and mixed references; line totals, quotations, unit cost and fictional JPY/PHP conversion | Implemented in Section 3; see F2 below |
| F3 | Number formats, tables, sorting, filtering, validation | Implemented in Section 4; see F3 below |
| F4 | IF, conditional formatting, lookup functions | Planned |
| F5 | SUMIF/SUMIFS, COUNTIF, PivotTables, charts and business reports | Planned |
| F6 | Power Query and repeatable data preparation; link to existing VBA section | Planned |
| G/H | Review and extend central published capability contracts, personalized assignment and performance reporting | Separate |

## Correction sequence before F2

Continue from consolidated main, including PRs #108–#111 and #113–#116.
PR #93 and the old intermediate Excel branches are superseded; do not merge them
separately. Each correction below has its own reviewable PR. F2 follows R1–R4.

| Phase | Scope and acceptance | Status |
| --- | --- | --- |
| R1 | An automatically activated, incomplete public shell uses one complete saved revision without a network-first launch. Preserve legacy caches, open-page revision consistency, study records and private packs; exercise real automatic activation and cold reopen. | Merged in PR #118. Physical iPad acceptance remains pending. |
| R2 | Reject whitespace inside function names and cell references while preserving legitimate Excel syntax. Grade each criterion independently, with correct/incorrect formula and input cases. | Merged in PR #120, including compatibility for earlier saved evaluations. |
| R3 | Establish extensible, versioned lesson capabilities shared by personal study and central assigned learning, including common assessment logic and compatibility with existing records. | Merged in PR #122; see the architecture and extension contract below. |
| R4 | Plan durable attempt history beyond the current 40-submission central cap, persistent curriculum progress and meaningful comparison of assessment conflicts. Define ownership, migration, offline/retry and backup compatibility before implementing storage changes. Preserve every existing record. | Plan merged in PR #125; see [Learning records](LEARNING-RECORDS-PLAN.md). Persistence implementation remains separate. |

The primary learner is a beginner in Japan–Philippines second-hand product
trading. Prioritize inventory, quotations, customer follow-ups, fictional currency
conversion, shipping, costs and profitability while retaining mechanical
engineering and the other professional contexts. Permissions, profiles,
personalized assignments and reporting belong in central Commonplace Admin
Studio. No separate Excel administration system is planned.

These code corrections do not authorize production synchronization, hosted
database changes, authentication/permission changes or learner enrollment.
The central [G0 readiness gate](../../platform/acceptance/G0-READINESS.md) and
the [Excel physical-device checks](OFFLINE-SYNC.md) remain separate.

F1 simulator is intentionally bounded to the five functions on B2:B4, numbers and blanks. Independent AVERAGE/COUNT deliberately use an empty B3; other tasks use the scenario's revised B3. Grading checks function/range, valid calculation and unchanged independent inputs separately. A blank is not zero. All-empty AVERAGE reports #DIV/0!, COUNT/SUM/MIN/MAX return zero. A different supported function can earn calculation and unchanged-input credit, but only the requested function earns the function criterion and permits a full pass. A task submission and quiz are separate. Session progress records passed independent skills per scenario; history is capped at 100, with the latest 10 displayed. No new persistent storage.

The F1 workbooks reuse the bounded D2 ZIP/OOXML writer with a reviewed formula allowlist. Each has Read me and five exercise sheets, with blank B5 in starters and correct formula/cache in solutions; AVERAGE/COUNT preserve the blank input. Existing D2 files retain their names, cells and original styles. F1 files are independent public samples, not imported private attachments. Physical Excel/iPad opening and central assigned/offline integration remain pending.

## R2 formula and grading correction

The existing standalone Section 1, independent assessments, F1 lessons and central
assigned SUM worksheet share a bounded syntax helper. It accepts case differences,
spaces or CRLF at expression/argument boundaries, absolute/mixed references and
either endpoint order for the same B2:B4 rectangle. Function names and cell tokens
stay contiguous, including each `$` marker; the function name immediately precedes
`(`. Tabs, nonbreaking spaces, split tokens, other ranges and extra expressions are
not accepted by this helper. The simulator still supports only its reviewed
single-range functions; this is not a complete Excel formula interpreter.

| Example | Current check |
| --- | --- |
| `=sum( $B2 : B$4 )` | Accepted for SUM on the fixed range |
| `=SUM(B4:$B$2)` | Accepted; the same rectangle is referenced |
| `=S U M(B2:B4)` or `=SUM(B 2:B4)` | Rejected; a token has been split |
| `=SUM (B2:B4)` | Rejected; the built-in function call is not contiguous |
| `=SUM(B2:B4 C2:C4)` | Unsupported intersection expression; its space is not erased |

The supported whitespace and reference forms follow Microsoft's
[MS-XLSX formula grammar](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-xlsx/3d025add-118d-4413-9856-ab65712ec1b0).
The helper preserves reference markers for later consumers; its canonical
comparison applies only to evaluation in this fixed worksheet, not to copying
relative formulas in the separate F2 reference engine.

F1 awards requested-function, valid-entered-calculation and original-input credit
independently. A wrong formula no longer removes correctly preserved input credit.
The central guided/revision/clipboard rubric checks each required input separately
and checks the SUM expression independently of input validity. Applying a formula
still requires all three central numeric inputs to be valid. Formatting and
clipboard evidence keep their separate criteria. Numeric assessment evidence uses
bounded decimal/scientific notation rather than arbitrary JavaScript coercion.

Earlier central attempt records are preserved with their original evaluation.
Current scores are recomputed from the recorded evidence and clearly identified
as current checks; a changed outcome is shown alongside the earlier outcome.
See [R2 saved-history compatibility](OFFLINE-SYNC.md#r2--formula-rules-and-saved-history-compatibility).
The shared syntax helper and per-attempt evaluation marker are the bounded R2
correction. R3 builds on those semantics without changing saved outcomes; durable
history/progress planning remains R4.

## R3 shared versioned curriculum

[The curriculum architecture and extension contract](CURRICULUM-ARCHITECTURE.md)
defines the shared core, exact lesson/runtime/rubric versions and the compatibility
rules for future modules. The existing five F1 lessons now live in that core.
Personal formula tasks, standalone criterion assessments, central assigned
calculation/practice and the content review preview consume its evaluation or
grading functions through thin adapters.

`personal-formulas@1` pins all five existing lesson versions and permits numbers
and blanks. `assigned-sum@1` pins the existing SUM lesson and requires three numeric
inputs. These are explicit reviewed policies; adding a future catalog entry does
not expand either released runtime. Unknown versions and unsupported capabilities
fail instead of falling back to a newer or different lesson.

The published SUM bundle remains the only source of assigned scenario data.
Central capabilities, authorized material bytes, progress identities, saved
record shapes and the 40-submission cap remain compatible. Admin Studio keeps
permissions, profiles, assignments and reporting; its prompt guidance now reflects
the current bounded controls. R3 adds no new learner enrollment, production
activation, storage migration or F2 lesson. The other F1 functions still need the
later G/H publication and assigned-UI integration.

## R4 learning-records plan

[The durable learning-records plan](LEARNING-RECORDS-PLAN.md) selects an immutable
attempt journal in a companion database, preserving the existing U8 database and
old cached shells. It defines additive migration from current work, pending
snapshots and conflict history; separate recorded/current assessment outcomes;
persistent progress dimensions; meaningful conflict comparison; and versioned
append, backup and reporting contracts for later implementation.

This correction is planning only. Central history still refuses new records at
40; it does not prune earlier attempts. Personal F1/Section 1 assessment history
remains session-only. Admin Studio reporting and the proposed storage changes
are not delivered by this plan. Continue F2–F6, then G/H, after R4 review/merge;
later persistence packages must meet the plan's compatibility/recovery gates
before claiming durable or synchronized learning records. R4 is merged in
PR #125; F2 follows below.

## F2 references and business calculations

[Section 3](Section_3_Study.html) adds four lessons using the shared exact
`personal-references@1` runtime and `reference-foundations@1` rubric. The default
context is Japan–Philippines second-hand trading. All five existing professional
contexts remain available with separate fictional F2 datasets; earlier scenario
data and F1/Section 1 behavior are unchanged.

| Lesson | First formula | Copy operation | Business meaning |
| --- | --- | --- | --- |
| Relative line totals | `=B3*C3` in D3 | Down to D4/D5 | Quantity × unit price in JPY |
| Absolute conversion rate | `=B3*$F$2` in C3 | Down to C4/C5 | JPY amount × fictional PHP per 1 JPY; one fixed rate cell |
| Mixed quotation grid | `=$B3*C$2` in C3 | Across/down to D3/C4/D4 | Keep unit prices in column B and quotation quantities in row 2 |
| Relative unit cost | `=B3/C3` in D3 | Down to D4/D5 | Landed cost including shipping ÷ usable units |

The copy control transforms the entered formula, including a mistaken lock; it
does not insert an answer from the lesson. Every destination is prepared before
any is changed, so invalid syntax or an out-of-bounds copy leaves existing
destination drafts intact. Applying formulas previews calculations. Submitting
grades each source/destination reference pattern and valid calculation
independently; independent work also checks the starting inputs. Criterion IDs
are stable. Reversed multiplication operands are accepted; division order and
each dollar-sign lock remain significant.

This engine supports two contiguous A1 references joined by `*` or `/` inside
A1:F12, with bounded numeric strings. Case and supported boundary spaces/CRLF
are accepted. Internal token spaces, other expressions and formula-cell chains
are outside this exercise. Blank cells evaluate as zero; text, zero denominators
and nonfinite calculations give explicit errors. This is a bounded practice
engine, not a full Excel workbook evaluator. The reference/copy rules follow
[Microsoft's reference guide](https://support.microsoft.com/en-us/excel/switch-between-relative-absolute-and-mixed-references)
and [multiplication/division guide](https://support.microsoft.com/en-us/excel/multiply-and-divide-numbers-in-excel).

Guided and independent modes use distinct dataset identities and starting values.
The concept quiz is separate from the worksheet score. In-memory task records
retain UUID, time, exact lesson/runtime/rubric/scenario/dataset references,
submitted formulas/inputs and criterion results. The latest ten of up to 100
session submissions are displayed; reaching the limit retains earlier results
and leaves calculation available. Reload/close clears this session. Existing
local reading state, central records and offline packs are not adopted or changed.
R4 durable persistence remains planned.

Each context has a separate F2 starter and solution XLSX workbook with Read me
and four exercise sheets. They use the guided dataset and the same cell
addresses, units, reference locks and calculated caches as the simulator.
Starters leave answer cells empty; solutions are behind a separate download.
Existing D2/F1 workbook APIs and outputs remain compatible. Files are not uploaded
or automatically assessed. See [workbook verification](WORKBOOKS.md#f2-reference-workbooks).

The central publication schema and released SUM runtime are unchanged. The public
central shell is refreshed because its shared curriculum dependency changed;
standalone Section 3 gains no service worker or private assigned capability.
Downloaded XLSX files can be used separately; real Excel open/save and physical
iPad acceptance remain to be observed. No hosted activation, permission change
or learner enrollment is included. F3 continues below.

## F3 business tables and entry checks

[Section 4](Section_4_Study.html) adds five version-1 lessons through
`personal-tables@1` and `table-foundations@1`. Japan–Philippines second-hand
trading is the default; all five professional contexts remain available. Each
lesson uses six fictional records with a stable item ID, description, status,
quantity, unit price, discount and planned shipping date. Guided and independent
tasks have distinct dataset identities and starting values.

| Lesson | Required task | What is assessed |
| --- | --- | --- |
| Number formats | Show whole quantities, JPY/PHP prices, one-decimal percentages and yyyy-mm-dd dates | Each column format independently; stored values remain unchanged |
| Create a table | Create `PracticeItems` over A1:G7 with headers and banded rows | Full table, requested name and banding independently |
| Sort complete records | Sort Quantity from smallest to largest and show every record | Selected sort, actual numeric order and complete visibility independently |
| Filter records | Show Ready items with Quantity at least 5 | Each condition and the actual visible set independently |
| Validate entries | Require whole quantities from 0 to 10000 and Ready/Reserved/Shipped status | Each enabled rule and existing values independently |

Every task also checks retention of the original six item identities. Independent
tasks separately check that every raw value remains attached to its original ID.
A display, sorting or filtering mistake does not remove unrelated criterion
credit. Resetting restores the task's original draft without adding or deleting
submitted session attempts. Quiz checks remain separate from independent passes.

The bounded table engine keeps typed records, row order, display formats and
filtered visibility separate. Formatting never converts currencies or replaces
numeric values with display strings. Percentages retain their fractional values;
dates retain numeric serials in the Excel 1900 system. Sorting moves all seven
fields together, compares numeric values numerically, keeps equal values stable
and leaves blanks last in either direction. It does not automatically sort again
after an edit.

Filters retain all records and use a snapshot of the last applied criteria.
Editing a record does not silently reapply its filter; use **Reapply current
filter**. **Clear filters** restores visibility in the current row order. Editing
uses the stable item ID, including after sorting or while a record is hidden.
The practice compares its preset status labels exactly.

Rules apply to direct quantity/status entry. An invalid new entry leaves both
the worksheet and the typed draft intact. Enabling a rule retains earlier invalid
values; **Check existing values** lists them for correction. The native workbook
uses whole-number and inline-list Stop validation. Native Excel alerts apply to
direct entry; copied or deleted values can bypass those alerts, and existing
values need a separate check. The page and workbook explain this behavior.

These behaviors follow the reviewed Microsoft guides for
[number formats](https://support.microsoft.com/en-us/excel/get-started/available-number-formats-in-excel),
[tables](https://support.microsoft.com/en-us/excel/get-started/create-and-format-tables),
[sorting](https://support.microsoft.com/en-us/excel/sort-data-in-a-range-or-table-in-excel),
[filters](https://support.microsoft.com/en-us/excel/get-started/filter-data-in-a-range-or-table-in-excel)
and [validation](https://support.microsoft.com/en-us/excel/more-on-data-validation).
The preview has fixed columns, six records, bounded numeric inputs, selected
formats and entry rules. It does not implement arbitrary Excel formulas, row
insertion/deletion, locale-specific text sorting or every table option.

Session evidence includes the exact lesson/runtime/rubric/scenario/dataset
references, the full typed worksheet state, criterion results, UUID and time.
The latest ten of at most 100 submissions are displayed, without pruning the
earlier in-memory submissions. Reloading or closing ends this session. R4's
durable-history implementation, the central 40-submission cap and existing saved
records remain unchanged.

The ten new F3 downloads contain Read me and five exercise sheets, with native
Excel table definitions, number formats, sort/filter metadata, hidden rows and
entry validation. Practice files leave each task to complete; solutions apply
the goal to the guided data. All six records remain in a filtered solution.
The 30 earlier D2/F1/F2 outputs retain their bytes. See
[F3 workbook verification](WORKBOOKS.md#f3-business-table-workbooks).

The existing homepage now links Section 4 from Learn, Practice and Workbooks,
with four available and three planned sections. The central shell is refreshed
for its changed shared core, while the assigned publication contract remains
SUM-only. F3 adds no personal service worker, storage migration, hosted change,
production activation or enrollment. Physical iPad and native Excel acceptance
remain pending. F4 — decisions, conditional formatting and lookups — follows.
