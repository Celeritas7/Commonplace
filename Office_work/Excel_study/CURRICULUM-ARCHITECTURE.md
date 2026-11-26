# Excel R3 — shared curriculum and version contract

R3 follows merged R2 (PR #120). Its purpose is to make the existing personal and
assigned learning paths consume the same reviewed lesson definitions, evaluator
and assessment logic before F2 expands the curriculum. It preserves their
different UI and record formats. R4 owns durable-history/progress/conflict planning;
G/H owns broader central publication and reporting integration.

## Shared core and adapters

`excel-curriculum.js` is a pure classic-script core for the existing personal
pages. `curriculum.mjs` imports that same implementation for module-based central
consumers. The core has no DOM, account, network, storage or scenario lookup. Its
lesson definitions are plain data; imported content cannot install callbacks,
formula interpreters or other executable implementations.

| Consumer | Shared behavior | Adapter responsibility |
| --- | --- | --- |
| `excel-formula-foundations.js` | Five F1 lesson definitions, formula evaluation, requested-function/calculation/input grading | Resolve the selected fictional scenario, prepare existing guided/independent values, retain the F1 public API |
| `excel-assessment.js` | Declarative formula, numeric, style and grouped criterion checks | Read worksheet evidence, retain criterion/skill IDs, bounded response snapshots, session records and UI |
| `calculation-history.mjs` | Current central SUM calculation and guided/revision/formatting/clipboard rubrics | Preserve legacy evaluation, validate stored history, append bounded attempts and distinguish recorded/current outcomes |
| `platform/content/excel-contract.mjs` | Exact lesson/capability/runtime metadata and worksheet cells/formula | Validate the authorized wire bundle and consume only its supplied dataset |
| `platform/content/render.mjs` | Central review-preview calculation | Render imported text safely and keep the preview ephemeral |
| `platform/prompts/generator.mjs` | Reviewed central capability/formula metadata | Generate draft-only material guidance in central Admin Studio |

Guided Ribbon event sequencing and simulator editing controls retain their current
responsibilities. The D2/F1 workbook writer continues to use its existing adapter
API, filenames and answer separation. The shared core is a bounded engine for the
reviewed B2:B4 aggregate functions, not an arbitrary spreadsheet evaluator.

Central material validation also imports this core in the isolated server
package. The package builder admits exactly `curriculum.mjs`,
`excel-curriculum.js` and `formula-syntax.js` outside `platform/`. It preserves
their source bytes and repository-relative layout under
`supabase/functions/_shared/platform/` and `_shared/Office_work/`, keeping all
local imports inside the functions mount. Other Office pages/controllers are not
included. This is packaging preparation, with no hosted function deployment.

## Exact released references

Lesson, runtime and rubric references have exactly `{ id, version }`. Resolution
requires an explicit supported version; missing, unknown, future and mismatched
references fail. Capability IDs include their wire version and resolve exactly.
There is no implicit latest-version or default-SUM fallback.

| Reference kind | Current released entries | Meaning |
| --- | --- | --- |
| Lesson | `sum@1`, `average@1`, `count@1`, `min@1`, `max@1` | Existing content/quiz plus worksheet, capability, runtime and rubric references |
| Capability | `explanation.text.v1`; `excel.sum.b2-b4.v1`, `excel.average.b2-b4.v1`, `excel.count.b2-b4.v1`, `excel.min.b2-b4.v1`, `excel.max.b2-b4.v1` | Reviewed operation and fixed worksheet shape; catalog presence is not publication permission |
| Runtime | `personal-formulas@1`, `assigned-sum@1` | Pinned capability set, ordered lesson references, evaluator and numeric-input policy |
| Rubric | `formula-foundations@1`, `worksheet-criteria@1`, `assigned-practice@1` | Versioned assessment implementation and applicable evidence/template |

Resolved metadata is deeply frozen. Catalog lists are detached copies. A
runtime-specific lesson list follows that runtime's exact references; F1 uses
this list, so registering a future catalog entry cannot silently expand F1.
Both runtime capability lists are explicit and pinned for the same reason.

The published central material already has its own lesson/concept/scenario/
dataset versions. An internal `sum@1` reference does not replace any of those
published identities. Likewise, R2's attempt `evaluation_version: 2` is a saved
outcome-validation version, not a new lesson or material version.

## Evaluation and grading policies

| Runtime | Supported executable formulas | Numeric policy |
| --- | --- | --- |
| `personal-formulas@1` | SUM, AVERAGE, COUNT, MIN, MAX on the reviewed B2:B4 rectangle | Three numeric-or-blank input strings. Blanks are ignored; all-blank AVERAGE reports `#DIV/0!` |
| `assigned-sum@1` | SUM on the same rectangle | All three input strings must be valid numbers |

Both use R2's strict token parser, decimal/scientific numeric rules and existing
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
of those worksheet activities. G/H must review the corresponding publication
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
