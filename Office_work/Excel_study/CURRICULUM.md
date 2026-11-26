# Excel curriculum — Phase F

The standalone personal-study path is expanded in small reviewable modules. F1 introduces the curriculum index and essential formula lessons. The existing Section 1 URL, gate, workbook API and local reading key remain available. R3 shares versioned lesson metadata, evaluation and grading with central assigned learning. The central publication contract still supports reviewed SUM assignments; publishing the other personal formula lessons and extending persistent progress require separate integration. F1 adds no account-wide storage, auth or database changes.

| Module | Coverage | Status |
| --- | --- | --- |
| F1 | Section 2 SUM / AVERAGE / COUNT / MIN / MAX; blanks versus zero; five professional contexts; guided/independent tasks, quiz and separate XLSX starter/solution | Merged in PR #116 |
| F2 | Relative, absolute and mixed references; line totals, quotations, unit cost and fictional JPY/PHP conversion | Planned |
| F3 | Number formats, tables, sorting, filtering, validation | Planned |
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
| R3 | Establish extensible, versioned lesson capabilities shared by personal study and central assigned learning, including common assessment logic and compatibility with existing records. | Implemented in this correction; see the architecture and extension contract below. |
| R4 | Plan durable attempt history beyond the current 40-submission central cap, persistent curriculum progress and meaningful comparison of assessment conflicts. Define ownership, migration, offline/retry and backup compatibility before implementing storage changes. Preserve every existing record. | Next correction |

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
relative formulas in the future F2 module.

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
