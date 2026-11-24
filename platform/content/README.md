# U4 — Flexible curriculum and scenario contracts

Status: isolated, data-only implementation on merged U3 (`8cd37c2`, PR #75). No production deployment or database migration. No existing curriculum, authentication, service workers, progress keys or Excel files changed.

## What is reusable

A **concept** holds the curriculum explanation and objectives. A **scenario** holds professional context and instructions. A **dataset** supplies typed columns, units and rows. A **lesson** composes exact versions of those three records with activities and required capabilities. An **assignment descriptor** pins the exact lesson version and assignment state; its recipients are resolved by the server, not included in learner-visible content.

The public examples demonstrate one `excel.sum@1` concept with three compositions: Japan–Philippines inventory (25 items), assembly components (42 pieces) and monthly expenses (100,000 JPY). Each composition references the same core concept rather than copying an entire curriculum. No profile-to-profession keyword inference is used: the administrator will explicitly select scenarios/assignments. The generic contracts also support explanatory Python/SQL and other section lessons; executable code runtimes are not part of these records.

## Version 1 shape

Every record has exactly `schema_version: 1`, `kind`, a stable lowercase `id` and positive safe-integer `version`, plus the fields below. Unknown fields, including arbitrary scripts, URLs or identity fields, are rejected. IDs match `[a-z][a-z0-9.-]{0,99}`. Published versions must become immutable in U6; U4 validates version references but does not itself provide a publishing database.

| Kind | Additional required fields |
| --- | --- |
| `concept` | `section_id`, `title`, `explanation`, `objectives` (text list) |
| `scenario` | `title`, `context`, `instructions` |
| `dataset` | `title`, `columns` (key, label, type, unit), `rows` (ordered cell arrays) |
| `lesson` | `section_id`, `title`, `concept_ref`, `scenario_ref`, `dataset_ref`, `required_capabilities`, `activities` |
| `assignment` | `section_id`, `lesson_ref`, `status` (`assigned` or `revoked`) |

References contain exactly `{id, version}`. A bundle contains exactly `{concept, scenario, dataset, lesson}` and every reference must match. Concept and lesson must have the same section. Datasets allow 1–16 unique columns and 1–200 rows, with exact row widths. Cells are finite bounded numbers or nonempty plain strings according to their column type, not formulas. Numeric values are limited to magnitude 10^12. Units may be empty. Activities have unique IDs, a type and plain instruction; `sum-column` additionally requires an existing numeric `column_key`. Supported activity types are `explanation` and `sum-column`. New types require a reviewed schema/adapter extension, not arbitrary imported code.

`contracts.mjs` is the shared executable validator for browser and future server ingestion. `parseBundleJSON` limits input to 1 MiB before parsing. Individual records are limited to 256 KiB, 20,000 traversed nodes and depth 12; lists/text fields have explicit smaller bounds in the validator. Cycles, sparse arrays, functions, non-finite numbers, non-plain objects, duplicate IDs, unknown schema versions and mismatched references fail. Text remains untrusted even when valid: use text nodes and sandboxed previews, never `innerHTML` or evaluation. `safeCSV` quotes all fields and prefixes text that could be interpreted as a spreadsheet formula; original dataset data is preserved.

`composeLesson` validates and returns a detached, deeply frozen snapshot after checking declared requirements against the host's supported capabilities. Section adapters must also validate their actual worksheet/activity shape.

Use `await progressIdentity(assignment, bundle, activityId)` to obtain a storage key. It includes assignment, section, lesson, concept, scenario and dataset versions plus the activity ID. Canonical JSON tuples of up to 160 characters remain unchanged; longer tuples become `cp-content-v1:sha256:<64 lowercase hex characters>` (85 characters), computed over the entire canonical tuple with Web Crypto SHA-256. This fits both the U1 account store and SQL `record_id` limit without a migration. The API is now asynchronous; all callers must await it and use an ownership-checked ticket when writing afterward. HTTPS/localhost supplies Web Crypto in the browser; there is no weaker fallback. Keep any full reference metadata needed for reporting in the record payload.

This creates a content identity only: it neither migrates nor merges legacy study keys or changes the U1 progress schema. Persist identities under the U1 account namespace when U7/U8 adapters are implemented. Existing short U4 identities are preserved, and the disabled platform has no deployed overlength records to migrate.

## Authorized section consumption

`createAssignedContentAdapter({sectionId, capabilities, loadAuthorizedBundle})` requires an explicit server-authorized loader. There is no default URL, static fallback, local role bypass or offline lease implementation. It checks the U1 context/ticket and section before calling the provider, passes an abort signal, discards stale-account responses, and verifies the response owner, publication state, assignment status/ID and pinned lesson version before composition.

Provider response contract:

```text
{
  owner_id: verified requesting user's UUID,
  publication_state: "published",
  assignment: validated assignment descriptor,
  bundle: validated exact-version content bundle
}
```

These checks prevent adapter mistakes; **they are not server authorization**. U6 must implement the loader on RLS/protected endpoints and freshly enforce active membership, section permission, published state and effective individual/group assignment. The server derives the requesting UUID from verified authentication; the adapter does not send a claimed user ID. A forged response from a caller-supplied/local loader is not proof of access. Signed download URLs, assets/workbooks, file validation, material publication and group-assignment storage remain U6 work. Draft review is separate from this learner loader; the U4 public fixtures are never treated as real published assignments.

The U3 profile reader supplies learning context separately. Do not put account/email/session envelopes into lessons or infer authorization from a profile. Saved assignment descriptors stay independent from professional profile changes, so changing occupation does not silently change the curriculum or discard progress.

## Excel reference boundary

Main's Phase A source supports manual `=SUM(B2:B4)` in B5 and three numeric inputs. `excel-contract.mjs` declares `explanation.text.v1` and `excel.sum.b2-b4.v1` and prepares the validated worksheet model. It requires exactly three rows, text/number columns and one SUM activity. It rejects unsupported shapes and capability requests, including an AutoSum-button operation. The Ribbon contains location previews, not implemented capabilities.

PR #70 was rechecked during U4 and remains open against `feat/excel-study-phase-a` (head `c19e571`). U4 does not depend on or modify that PR. New capability IDs must be backed by merged simulator operations and acceptance tests. The model is not injected into the existing Excel DOM; U7 will implement the actual Excel adapter. Its current lesson, simulator and `commonplace_excel_preview_v1` data stay intact.

## Preview and checks

Serve the repository and visit `/platform/content/preview.html`. Switch between three professional scenarios and calculate the total. This is an isolated synthetic review renderer using the shared validator/worksheet model, not an alternative production curriculum or a full formula engine. It uses text nodes, computes only the declared fixed SUM and writes no storage or assignments. It does not fetch private content.

Run the existing platform commands:

```sh
npm ci --prefix platform --ignore-scripts
npm test --prefix platform
cd platform
npx playwright install --with-deps chromium
npm run test:browser
```

Evidence: Node tests cover composition, generic non-Excel records, version/shape mismatches, strict JSON validation, capability rejection, formula-safe export, distinct progress identities, assignment state/owner/version checks and account-switch races. Browser tests cover scenario switching, recomputation, empty input, markup injection, mobile width and the existing Excel exercise/progress remaining functional across preview visits. Local browser runs use the documented Chromium 133 override; actual iPad/Safari and live authorization acceptance remain pending.

## Remaining phases and deployment gates

U5 builds the copyable prompt workflow using these contracts and U3 profiles. U6 adds server ingestion using the same validators, immutable publication, assignments and private assets; it must reject unsupported content before publishing. U7 connects the existing Excel simulator, then other sections. U8 handles owned offline content and progress synchronization. No U0/U1 activation/backup/staging prerequisite is removed by U4. Public fixtures and already public static lessons are not confidential; restricted material must never be bundled into this public repository/build.

## U7 integration

The [learner workspace](../learn/README.md) now composes freshly authorized U6 material bundles and passes their worksheet model to Excel's assigned lesson renderer. It reuses the existing Phase A Ribbon and fixed SUM capability; the legacy static lesson and unmerged PR #70 remain unchanged. Local progress uses the versioned identities described above. The U7 host remains behind the disabled deployment boundary.
