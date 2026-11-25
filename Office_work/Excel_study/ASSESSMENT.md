# Phase D — independent Excel assessment

This public sample extends the existing Section 1 worksheet. It is open-book practice, not a protected or certified examination. Three fictional warehouse tasks check actual worksheet values, formula and output, and formatting. A submitted attempt has partial-credit criteria and an overall score; cancel/reset abandons an unfinished attempt. The session history is in memory only and disappears on reload. Starting a task resets the sample sheet, not existing study progress. No real learner data or identity is used by this legacy preview.

## Central Commonplace integration handoff

The main platform owns identity, section access, assigned material versions, private study records and sync. At the time of this phase, its implementation is in the repository but live activation is disabled. Phase D must not create a second authentication system, unowned localStorage history, or direct database writes.

The assessment component exposes an optional `onSubmitted(record)` callback. The payload is versioned:
- `schema_version: 1`, `section: "office.excel"`, `assessment_id`, `assessment_version`
- `attempt_id` (client-generated UUID), `started_at`, `submitted_at`
- `grading: "client-self-assessment"`, `score`, `max_score`, `passed`
- `results`: criterion ID, skill ID, label, pass/fail, and bounded submitted response(s) (cell address, property, value).

The preview has no persistence sink. Its grading keys are public practice data. A future authorized adapter must validate the record and associate it with an actual published material/version and the verified account using the central account context and ownership checks. Never trust a client-supplied owner or role. Use unique attempt identifiers and idempotent sync; retain separate attempts rather than overwriting prior answers. Handle pending saves, offline ownership, and cross-account cancellation through the central mechanisms. If server-certified assessment is later required, grade against a server-controlled answer key rather than trusting these client scores.

The existing central U7/U8 worksheet/quiz records are not a complete assessment-history or admin-report API. Coordinate any new record kind, server validation, schema migration, and explicit administrator reporting permission with the main Commonplace project. Do not broaden access to private notes/highlights in order to provide reports. Until approved and deployed, do not tell learners that assessment history is saved to the cloud.

## Tests

From repo root: `node Office_work/Excel_study/tests/assessment.test.cjs`. This checks grading and mock-DOM lifecycle, not browser rendering, database persistence or iPad acceptance. Use only synthetic data during preview.
