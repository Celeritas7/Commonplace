# Excel R3 — shared curriculum and version contract

R3 follows merged R2 (PR #120). Its purpose is to make the existing personal and
assigned learning paths consume the same reviewed lesson definitions, evaluator
and assessment logic before F2 expands the curriculum. It preserves their
different UI and record formats. The [R4 learning-records plan](LEARNING-RECORDS-PLAN.md)
defines durable history, progress and conflict comparison without implementing
storage changes. G/H owns broader central publication and reporting integration.

## Shared core and adapters

`excel-curriculum.js` is a pure classic-script core for the existing personal
pages. `curriculum.mjs` imports that same implementation for module-based central
consumers. The core has no DOM, account, network, storage or scenario lookup. Its
lesson definitions are plain data; imported content cannot install callbacks,
formula interpreters or other executable implementations.

| Consumer | Shared behavior | Adapter responsibility |
| --- | --- | --- |
| `excel-formula-foundations.js` | Five F1 lesson definitions, formula evaluation, requested-function/calculation/input grading | Resolve the selected fictional scenario, prepare existing guided/independent values, retain the F1 public API |
| `excel-reference-foundations.js` | Four F2 lesson definitions, reference translation, arithmetic evaluation and stable per-cell grading | Resolve separate fictional F2 datasets and units, preserve all five context identities and supply worksheet layout |
| `excel-table-foundations.js` | Five F3 lessons, typed table operations, display formats and outcome-based grading | Resolve six-record fictional datasets, currency and guided/independent starting state across the same five contexts |
| `excel-assessment.js` | Declarative formula, numeric, style and grouped criterion checks | Read worksheet evidence, retain criterion/skill IDs, bounded response snapshots, session records and UI |
| `calculation-history.mjs` | Current central SUM calculation and guided/revision/formatting/clipboard rubrics | Preserve legacy evaluation, validate stored history, append bounded attempts and distinguish recorded/current outcomes |
| `platform/content/excel-contract.mjs` | Exact lesson/capability/runtime metadata and worksheet cells/formula | Validate the authorized wire bundle and consume only its supplied dataset |
| `platform/content/render.mjs` | Central review-preview calculation | Render imported text safely and keep the preview ephemeral |
| `platform/prompts/generator.mjs` | Reviewed central capability/formula metadata | Generate draft-only material guidance in central Admin Studio |

Guided Ribbon event sequencing and simulator editing controls retain their current
responsibilities. The D2/F1 workbook writer continues to use its existing adapter
API, filenames and answer separation. The shared core contains bounded engines
for reviewed B2:B4 aggregate functions, F2 reference exercises and F3 typed tables;
it is not an arbitrary spreadsheet evaluator.

Central material validation also imports this core in the isolated server
package. The package builder admits exactly `curriculum.mjs`,
`excel-curriculum.js` and `formula-syntax.js` outside `platform/`. It preserves
their source bytes and repository-relative layout under
`supabase/functions/_shared/platform/` and `_shared/Office_work/`, keeping all
local imports inside the functions mount. Other Office pages/controllers are not
included. This is packaging preparation, with no hosted function deployment.

## Exact references and release status

F1, F2, F3 v1 and assigned SUM are released on main. F3 PR #132 first merged
into the F2 branch; the combined PR #128 then merged into main during R5 work.
R5 therefore adds explicit v2 table references while preserving released v1.
See the R5 decision below for the checked heads and compatibility boundary.

Lesson, runtime and rubric references have exactly `{ id, version }`. Resolution
requires an explicit supported version; missing, unknown, future and mismatched
references fail. Capability IDs include their wire version and resolve exactly.
There is no implicit latest-version or default-SUM fallback.

| Reference kind | Available exact entries | Meaning |
| --- | --- | --- |
| Lesson | `sum@1`, `average@1`, `count@1`, `min@1`, `max@1`; four F2 lessons; five F3 lessons at both `@1` and `@2` | Content/quiz plus worksheet, capability, runtime and rubric references |
| Capability | `explanation.text.v1`; five `excel.<function>.b2-b4.v1` entries; four `excel.references.<lesson-id>.v1` and five `excel.tables.<lesson-id>.v1` entries below; `excel.tables.create-table.v2` | Reviewed operation and fixed worksheet shape; catalog presence is not publication permission |
| Runtime | `personal-formulas@1`, `assigned-sum@1`, `personal-references@1`, `personal-tables@1` and `@2` | Pinned capability set, ordered lesson references, evaluator and input policy |
| Rubric | `formula-foundations@1`, `worksheet-criteria@1`, `assigned-practice@1`, `reference-foundations@1`, `table-foundations@1` and `@2` | Versioned assessment implementation and applicable evidence/template |

Resolved metadata is deeply frozen. Catalog lists are detached copies. A
runtime-specific lesson list follows that runtime's exact references; F1 uses
this list, so registering a future catalog entry cannot silently expand F1.
Every runtime capability list is explicit and pinned for the same reason.

The published central material already has its own lesson/concept/scenario/
dataset versions. An internal `sum@1` reference does not replace any of those
published identities. Likewise, R2's attempt `evaluation_version: 2` is a saved
outcome-validation version, not a new lesson or material version.

## Evaluation and grading policies

| Runtime | Supported evaluation / operations | Numeric policy |
| --- | --- | --- |
| `personal-formulas@1` | SUM, AVERAGE, COUNT, MIN, MAX on the reviewed B2:B4 rectangle | Three numeric-or-blank input strings. Blanks are ignored; all-blank AVERAGE reports `#DIV/0!` |
| `assigned-sum@1` | SUM on the same rectangle | All three input strings must be valid numbers |
| `personal-references@1` | Two A1 references within A1:F12 joined by `*` or `/` | Bounded numeric strings; referenced blanks are zero; text and zero denominators produce errors |
| `personal-tables@1` / `@2` | Selected formats, table creation, whole-row sorting, status/quantity filtering and entry rules on six records; v1 retains 31-character table names, v2 permits 32 | Typed numbers or null; raw input uses the existing numeric parser; quantities can be negative/decimal before the explicit whole-number rule is enabled |

The two aggregate runtimes use R2's strict token parser, decimal/scientific numeric rules and existing
15-significant-digit result conversion. The shared evaluator preserves the
intentional blank-policy difference. It does not substitute a personal scenario
when assigned data is missing or invalid.

Rubrics share formula-equivalence and numeric-evidence checks while preserving
each task's criteria. F1 checks the function required by the pinned lesson,
whether the entered formula calculates, and unchanged independent inputs. A
caller-modified derived formula cannot change the requested lesson's function.
Central modes retain their original four/five criteria, including separate style
and clipboard evidence. Section 1 retains its exact `results`/response shape;
F1 and central retain `criteria`/`maxScore`. Scores remain client self-assessment.

## Central publication and administration

The central material schema and server validator still accept the reviewed
`explanation.text.v1` / `excel.sum.b2-b4.v1` publication contract. The adapter binds
that capability to `sum@1` and `assigned-sum@1`, with one `sum-column` activity and
three text/number rows. `EXCEL_ASSIGNED_CAPABILITIES` names that supported set;
`EXCEL_PHASE_A_CAPABILITIES` remains a compatibility alias to the same array.

The new prepared-model `curriculumRef` and `runtimeRef` fields are internal. They
are never added to an authorized bundle, material bytes or stored learner state.
Personal AVERAGE/COUNT/MIN/MAX support therefore does not permit central assignment
of those worksheet activities. The same restriction applies to F2's reference
lessons and F3's table lessons. G/H must review the corresponding publication
schema, server validation, UI, authorization and offline contracts together.

Permissions, profiles, personalized assignments and reporting remain in Commonplace
Admin Studio. Its prompt describes current bounded SUM, formatting and clipboard
controls accurately while still producing inert material drafts for review.

## Extending the curriculum

1. Add a stable lesson/capability ID or a new version for changed semantics. Keep
   released definitions and engine behavior available to their existing references.
2. Implement and test the reviewed evaluator/rubric behavior. Reject unsupported
   references and expressions; do not accept executable functions from lesson data.
3. Create a new runtime version when changing its lesson/capability set or input
   policy. Pin exact lesson versions and update the intended adapter explicitly.
   A catalog addition alone must not change an existing learning path.
4. For central publication, review every contract layer in G/H. Registering a
   personal capability does not authorize a schema change, migration or deployment.
5. Verify outcomes across professional contexts, old/new records, canonical
   material bytes, progress identity, offline reopen, retry and backup. Regenerate
   the public shell for dependency changes; preserve existing private packs.

Future examples prioritize Japan–Philippines second-hand trading: inventory,
quotations, customer follow-ups, fictional JPY/PHP conversion, shipping, costs and
profitability. The existing mechanical-engineering and other contexts remain
available. F2 adds reference/copy behavior only through its own reviewed module;
R2's fixed-cell formula canonicalization must not be used as copy semantics.

## Preservation and verification

There is no storage migration, new account system, history pruning or changed
40-submission limit in R3. Unversioned attempts keep the frozen legacy evaluator;
version-2 attempts keep their existing outcomes. Assignment, material, lesson,
scenario, dataset and activity identity remain unchanged. Existing notes,
bookmarks, pending operations, conflict alternatives, signed private packs and
backups stay on the existing owned path.

`platform/tests/excel-curriculum.test.mjs` checks exact references, runtime scope,
immutability, shared adapter outcomes, explicit blank policies and literal saved
history compatibility. It pins canonical material bytes and a legacy progress
key. `platform/tests/browser/excel-curriculum-shared.spec.mjs` checks actual
personal/central consumers and cold offline retention of work and pack bytes.
Existing R1/R2, workbook, content-contract and account/sync regressions remain.

Physical iPad acceptance, hosted recovery and central G0 remain pending. R3 does
not activate production synchronization, modify hosted databases/authentication/
permissions or enroll a learner.

The R4 plan keeps these released references distinct from journal schemas,
legacy evaluation markers and curriculum-plan versions. Future record adapters
must preserve unknown historical rubric provenance and establish stable criterion
IDs before emitting durable grades. New curriculum definitions alone cannot
authorize storage migration, central publication or reporting access.

## F2 — exact reference lessons and copy behavior

F2 adds four version-1 lessons under the new `personal-references@1` runtime and
`reference-foundations@1` rubric. It does not add lessons to either released
aggregate runtime or change an existing lesson/rubric definition.

| Lesson | Capability | Source and destinations |
| --- | --- | --- |
| `relative-line-totals@1` | `excel.references.relative-line-totals.v1` | D3 to D4/D5, using `=B3*C3` |
| `absolute-rate@1` | `excel.references.absolute-rate.v1` | C3 to C4/C5, using `=B3*$F$2` |
| `mixed-quotation@1` | `excel.references.mixed-quotation.v1` | C3 to D3/C4/D4, using `=$B3*C$2` |
| `relative-unit-cost@1` | `excel.references.relative-unit-cost.v1` | D3 to D4/D5, using `=B3/C3` |

The core exposes pure parse, copy, evaluate and grade operations with explicit
runtime/rubric references. Copying translates the learner's actual expression,
preserving each row/column lock independently. The page computes every destination
before changing any destination input, so one out-of-range reference cannot cause
a partial copy. The bounded grammar accepts two contiguous A1 references joined
by multiplication or division, with ordinary spaces or line endings at expression
boundaries. Split tokens, unsupported operators and references outside A1:F12 are
rejected. References to formula cells are outside this practice. Supported numeric
inputs and the 15-significant-digit result conversion follow the existing numeric
rules; missing/blank referenced cells are zero and a zero denominator is an error.

Each answer cell has separate stable `reference-pattern:<address>` and
`valid-calculation:<address>` criteria. Independent tasks also have
`original-inputs`. Pattern grading uses the registered lesson, destination and
exact locks, while calculation grading uses the entered expression and current
inputs. Equivalent multiplication operand order is accepted; reversed division
is a different operation. An invalid source does not erase credit for a correct
destination. Correct arithmetic alone does not satisfy a requested lock pattern.

The F2 adapter supplies separate guided/independent dataset IDs and version 1
for each of the five existing professional contexts. Section 3 keeps exact
lesson, runtime, rubric, scenario and dataset references with its session-only
attempt snapshots. Independent progress uses the complete independent dataset
identity; quiz feedback is a separate learning signal. These are not durable
journal entries, centrally assigned materials or an R4 storage migration.

Regression coverage lives in `excel-references-engine.test.mjs`,
`excel-reference-workbooks.test.mjs` and `browser/excel-references.spec.mjs` under
`platform/tests/`. Existing curriculum tests continue to pin F1 scope, central
material bytes, progress identity and legacy outcomes. The central public shell
is regenerated for the updated shared core; private packs and personal storage
behavior remain unchanged.

## F3 — typed records and table operations

The five version-1 lessons `number-formats`, `create-table`, `sort-records`,
`filter-records` and `validate-entry` each have the exact capability
`excel.tables.<lesson-id>.v1`. They belong to `personal-tables@1` and
`table-foundations@1`. The released aggregate and reference runtimes retain
their earlier lists and behavior.

The core exposes `createTableState`, `applyTableAction`, `tableView`,
`inspectTableValidation`, `formatTableValue` and `gradeTables`, with explicit
runtime/rubric references. It accepts exactly six complete typed records with
unique stable item IDs. Numeric columns contain numbers or null; planned dates
contain whole Excel 1900 serials from 61 through 2958465. There is no executable
content, formula evaluation or callback in a table lesson definition.

The schema-version-1 worksheet state contains separate records, a complete
permutation of row IDs, display formats, table metadata, the last sort,
filter criteria, the last applied visible IDs and enabled entry rules. Every
action returns detached state. Unsupported actions, versions, columns, malformed
or sparse arrays, incomplete row order and invalid new entries fail without
mutating the input. Names and item IDs require a complete token match.

Formatting changes metadata only. Sorting changes order only and keeps equal
values stable, with blanks last. Filtering updates a visible-ID snapshot and
never removes a record or changes its order. Editing by item ID retains the
last filter snapshot until explicit reapplication. Clearing filters restores
all rows in their current order. Enabling validation does not rewrite or
silently repair existing invalid values; inspection and direct-entry checks are
separate operations.

Stable criterion IDs distinguish requested settings, actual sorted/visible
outcomes, existing-value validity, retained `record-identities` and independent
`original-records`. The registered lesson's goals remain authoritative when
caller-derived metadata is altered. Raw values are compared by item ID, not by
screen position. F3 uses exact preset status labels; general locale-specific
text collation and arbitrary validation expressions are outside this runtime.

The adapter supplies separate `f3-<scenario>-<lesson>-<mode>@1` dataset identities
and current currency. Section 4 records the complete submitted worksheet and
exact curriculum references in memory. This worksheet schema is not a new
central progress, backup or journal schema. It cannot establish central
publication permission or durable account history.

`excel-tables-engine.test.mjs`, `excel-table-workbooks.test.mjs` and
`browser/excel-tables.spec.mjs` exercise transformations, grading, native export
and actual controls. Existing F1/F2, R1/R2/R3 and central contract tests remain.
The generated public shell changes only for its shared core bytes. Server
packaging retains the same three-file curriculum allowlist and no deployment.

### R5 — released v1 compatibility and corrected v2 practice

The development review is dated 27 November 2026 (Japan). At R5's first check,
main was `b115ccf9b7e580f35f84d8a0cfd0113cee5851bb` and combined F2/F3 PR #128
was open at `a88ab60ffe13f5274007836c496c1f9bd7ff92ae`. During this work, #128
merged into main at `f0f861887de26c4040ec8b4a451e08056bfbfa13`, with head
`640398d8a5a2c0884f1aa343007a63b48592ed94`. R5 is based on that merged main.
The pre-release-v1 option in the review no longer applies. **Released F3 v1 is
preserved, and new personal practice explicitly selects v2.**

`personal-tables@2` pins all five table lessons at version 2 and the new
`excel.tables.create-table.v2` capability. The other four capability definitions
remain v1. Both runtimes use the same bounded table implementation family;
the v2 runtime and create-table capability explicitly declare the 32-character
name policy. `table-foundations@2` supplies the corrected name comparison.
All five lessons need v2 references because each exposes the same table controls
and uses that exact runtime/rubric pair. Lesson content, stable criterion IDs,
dataset identities/version 1 and worksheet schema version 1 remain unchanged.

`personal-tables@1`, `table-foundations@1`, all five v1 lessons and their
capabilities retain their metadata and behavior, including the original
31-character limit, rejection message and case-sensitive score. Mixed
lesson/rubric versions and unknown versions fail explicitly. Calling the newer
rubric never rewrites a result previously recorded under v1.

Only the v2 `table-name` criterion compares names without letter case. The learner's
original spelling remains in worksheet state and submitted snapshots. Names
use a bounded ASCII subset: 1–32 characters, an English letter or underscore
first, then English letters, digits or underscores. Full-token matching and
rejection of cell-reference-like names and the single letters R/C remain.
Periods, backslashes and non-ASCII letters are outside this practice subset.
The HTML limit, accessible guidance and rejection message use the same 32-character
maximum. This is an exercise limit; native Excel supports broader forms and
up to 255 characters, with case-insensitive names, as described in Microsoft's
[table-naming rules](https://support.microsoft.com/en-us/excel/rename-an-excel-table).

The personal adapter selects v2 for new sessions. Its explicit `forVersion(1)`
adapter keeps workbook generation pinned to released lessons and their original
data-version labels, so all 40 D2/F1/F2/F3 files retain their bytes. Submitted
records keep the exact lesson/runtime/rubric references used at submission.
No existing snapshot is regraded or migrated, and no missing history is invented.
Independent criteria, original rows, F1/F2/assigned behavior, private packs and
backup contracts retain their existing semantics. Regenerate the public shell
manifest for the changed shared core. Core/browser regressions cover both
versions, equivalent spellings, partial credit, length boundaries, atomic
rejection and retained evidence; workbook hashes pin the published files.

## F4A — IF decision practice

The new `if-minimum-target@1` lesson, `excel.decisions.if-minimum-target.v1`
capability, `personal-decisions@1` runtime and `decision-foundations@1` rubric
are exact personal-only entries. The pure shared evaluator checks a bounded
IF grammar: B2:C4 cell references (optional locks, no copying), six comparison
operators, and two quoted ASCII text literals up to 24 characters. Input cells
must be numeric under the existing bounded numeric policy. No eval, arbitrary
formula parsing or executable content. The rubric checks the registered goal
per output: required minimum condition including equality, correct text branches
and actual result, plus independent original inputs. It does not trust a caller's
derived formula or change any released reference. The central SUM publication
contract and staged package allowlist remain unchanged. F4B/F4C/F4D follow in
separate PRs; no new record storage, production sync or permission changes.

## F4B — numeric conditional formatting

`highlight-below-target@1`, `excel.conditional.highlight-below-target.v1`,
`personal-conditional-formatting@1` and `conditional-foundations@1` are new exact
personal references. The existing IF runtime and every earlier reference remain
pinned. A pure validator returns detached rule data (range, operator, normalized
numeric threshold, style), or rejects without modifying the existing rule. The
view derives highlighted and invalid cell addresses from numeric inputs, never
from user-supplied style evidence. The rubric checks range, strict comparison,
threshold, style, matching addresses and independent original inputs separately.
The lesson goal is registered; the numeric target and baseline come from the
selected fictional dataset. No central publication change, new storage, schema,
workbook exporter or production activation. Refresh only the existing public
shell shared-core dependency. F4C/F4D follow separately.
