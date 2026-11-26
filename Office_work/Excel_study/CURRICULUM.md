# Excel curriculum — Phase F

The standalone personal-study path is expanded in small reviewable modules. F1 introduces the curriculum index and essential formula lessons. The existing Section 1 URL, gate, workbook API and local reading key remain available. Central assigned content still supports the reviewed SUM contract; new curriculum capabilities, private assignments, per-user persistence and offline packs require separate integration. F1 adds no account-wide storage, auth or database changes.

| Module | Coverage | Status |
| --- | --- | --- |
| F1 | Section 2 SUM / AVERAGE / COUNT / MIN / MAX; blanks versus zero; five professional contexts; guided/independent tasks, quiz and separate XLSX starter/solution | Implemented in this PR |
| F2 | Relative, absolute and mixed references; line totals, quotations, unit cost and fictional JPY/PHP conversion | Planned |
| F3 | Number formats, tables, sorting, filtering, validation | Planned |
| F4 | IF, conditional formatting, lookup functions | Planned |
| F5 | SUMIF/SUMIFS, COUNTIF, PivotTables, charts and business reports | Planned |
| F6 | Power Query and repeatable data preparation; link to existing VBA section | Planned |
| G/H | Review and extend central published capability contracts, personalized assignment and performance reporting | Separate |

F1 simulator is intentionally bounded to the five functions on B2:B4, numbers and blanks. Independent AVERAGE/COUNT deliberately use an empty B3; other tasks use the scenario's revised B3. Grading checks function/range, valid calculation and unchanged independent inputs. A blank is not zero. All-empty AVERAGE reports #DIV/0!, COUNT/SUM/MIN/MAX return zero. The learner can explore other supported functions, but only the requested function scores. A task submission and quiz are separate. Session progress records passed independent skills per scenario; history is capped at 100, with the latest 10 displayed. No new persistent storage.

The F1 workbooks reuse the bounded D2 ZIP/OOXML writer with a reviewed formula allowlist. Each has Read me and five exercise sheets, with blank B5 in starters and correct formula/cache in solutions; AVERAGE/COUNT preserve the blank input. Existing D2 files retain their names, cells and original styles. F1 files are independent public samples, not imported private attachments. Physical Excel/iPad opening and central assigned/offline integration remain pending.
