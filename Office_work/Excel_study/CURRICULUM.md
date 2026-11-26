# Excel curriculum — Phase F

The standalone personal-study path is expanded in small reviewable modules. F1 introduces the curriculum index and essential formula lessons. The existing Section 1 URL, gate, workbook API and local reading key remain available. Central assigned content still supports the reviewed SUM contract; new curriculum capabilities, private assignments, per-user persistence and offline packs require separate integration. F1 adds no account-wide storage, auth or database changes.

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
| R1 | An automatically activated, incomplete public shell uses one complete saved revision without a network-first launch. Preserve legacy caches, open-page revision consistency, study records and private packs; exercise real automatic activation and cold reopen. | Implemented in this correction; automated regression coverage added. Physical iPad acceptance remains pending. |
| R2 | Reject whitespace inside function names and cell references while preserving legitimate Excel syntax. Grade each criterion independently, with correct/incorrect formula and input cases. | Next correction |
| R3 | Establish extensible, versioned lesson capabilities shared by personal study and central assigned learning, including common assessment logic and compatibility with existing records. | Planned correction |
| R4 | Plan durable attempt history beyond the current 40-submission central cap, persistent curriculum progress and meaningful comparison of assessment conflicts. Define ownership, migration, offline/retry and backup compatibility before implementing storage changes. Preserve every existing record. | Planned correction |

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

F1 simulator is intentionally bounded to the five functions on B2:B4, numbers and blanks. Independent AVERAGE/COUNT deliberately use an empty B3; other tasks use the scenario's revised B3. Grading checks function/range, valid calculation and unchanged independent inputs. A blank is not zero. All-empty AVERAGE reports #DIV/0!, COUNT/SUM/MIN/MAX return zero. The learner can explore other supported functions, but only the requested function scores. A task submission and quiz are separate. Session progress records passed independent skills per scenario; history is capped at 100, with the latest 10 displayed. No new persistent storage.

The F1 workbooks reuse the bounded D2 ZIP/OOXML writer with a reviewed formula allowlist. Each has Read me and five exercise sheets, with blank B5 in starters and correct formula/cache in solutions; AVERAGE/COUNT preserve the blank input. Existing D2 files retain their names, cells and original styles. F1 files are independent public samples, not imported private attachments. Physical Excel/iPad opening and central assigned/offline integration remain pending.
