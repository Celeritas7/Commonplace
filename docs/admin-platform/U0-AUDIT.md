# U0 — Central administration architecture audit

Date: 2026-11-24 (Japan). Baseline: `300bf3bcf1d62315ee47d40d320b969d871e0c26`.
Status: read-only audit delivered; **not approved for multi-user production onboarding**.

This change contains documentation only. It does not change application code, database objects, hosting, authentication settings, learner access or existing downloads. No learner identity was invented. Database inspection used catalog SELECT queries, project metadata and security advisors; no application records or authentication tokens were exported. Detailed unrelated-app security metadata is deliberately excluded from this public repository.

## 1. Outcome and scope

Build one Commonplace Admin Studio, not separate administration inside Excel. Preserve the current personal environment while introducing an isolated, tested multi-user platform. Reuse learning engines and suitable synchronization patterns; do not reuse the frontend gate as an authorization boundary.

U0 acceptance: map routes and dependencies, distinguish public from protected delivery, inspect relevant live database security, identify reusable components and migration hazards, document rollout/rollback and phase criteria. These are met at the design-review level. Provider-dashboard configuration, administrator bootstrap identity, physical-device testing and restored-backup evidence remain explicit deployment gates, not implied successes.

Companion documents:
- [Section and dependency inventory](SECTION-INVENTORY.md)
- [Implementation and acceptance plan](IMPLEMENTATION-PLAN.md)

## 2. Evidence and hosting

- Repository metadata reports public visibility and GitHub Pages enabled.
- Anonymous HTTP GET to `https://celeritas7.github.io/Commonplace/Office_work/Excel_study/Section_1_Study.html` returned 200 and the actual worksheet HTML, without a login session. This demonstrates public delivery even when JavaScript overlays a login screen.
- Repository homepage metadata names `https://commonplace-gamma.vercel.app`. The same Excel path returned 404 there; its root returned 200 but did not contain Commonplace. Do not treat that metadata as proof of a current equivalent deployment. Domain ownership/deployment configuration needs confirmation before cutover.
- `_lib/gate.js` explicitly describes itself as a curtain over public static files. It bypasses file/localhost, hashes email against an allowlist, trusts locally saved session/email markers for offline startup and uses the existing Supabase session storage key.
- Google sign-in uses native same-window navigation for iPad gesture compatibility; callback completion, bounded loading, retries and resume handlers are already present. BAT/SQL/C++ callback-preservation fixes must remain regression requirements.
- Separate browser origins and Safari/Home Screen contexts cannot be assumed to share local data or sessions. A new origin cannot silently read old-origin progress; switching Supabase projects does not automatically preserve auth user UUIDs or sessions.

### Protected delivery decision (proposed, not provisioned)

Preferred: a separate Commonplace Supabase project plus a dedicated application origin for the new platform. Keep the legacy personal installation operational during the pilot. This contains unrelated-app authorization risk and avoids old service workers controlling the new app. It creates explicit costs: provider configuration, a fresh administrator session, a verified identity mapping and controlled data transfer. No project purchase or creation is included in U0.

Alternative: reuse General_apps only after its exposed tables, views, functions, grants and Storage policies have been reviewed/remediated for untrusted learner identities. A new schema/table prefix alone does not isolate a learner holding the same project's authenticated JWT.

Use a public application shell containing only safe interface/runtime assets; load restricted lesson JSON through RLS and restricted files through private Storage or a permission-checking server endpoint. Invitation/account-management operations use a server-side function with freshly verified administrator membership. Privileged credentials remain server-side.

Do not merely protect the main route while leaving HTML, JSON, media, source files, old deployments or build artifacts public. Protected lessons must not also be embedded in public bundles. Existing published curriculum can remain explicitly public during the transition; moving future versions behind authorization cannot recall earlier public copies, Git history, downloads or forks. Full historical confidentiality is not achievable retroactively.

## 3. Authentication and authorization

Preserve Google/email sign-in UX, callback URL ownership and offline recovery. Replace the email allowlist as the authority only in the staged multi-user implementation. Use verified authenticated UUIDs and database membership/status checks. Email is an invitation/lookup attribute, not a permission identifier.

Proposed app membership: `invited`, `active`, `suspended`, `revoked`; roles: `admin`, `learner`. Bootstrap only the specifically verified owner account using a controlled administrative operation. No first-user admin rule, frontend role flag or editable user_metadata authorization. Protect against removal/demotion of the last administrator and document recovery.

Permissions:
- Default deny. Catalogue nodes use stable IDs independent of URLs.
- An explicit leaf grant allows that leaf and necessary breadcrumb containers, not siblings.
- Granting a parent means an explicit reviewed scope; newly introduced descendants are not silently granted. Implement by materializing reviewed leaf grants or a versioned scope snapshot.
- Explicit deny overrides inherited allowance; suspension/revocation overrides everything.
- A material assignment alone does not grant section access.
- Authorize on every protected data request, including nested asset and answer-sheet requests. Do not rely exclusively on a stale JWT role or a cached navigation list.
- Admin writes require online server verification. Audit events originate server-side with actor, action, target, time and safe before/after details; learners cannot forge or erase them.
- Admin reporting reads progress through a narrowly authorized reporting path. Private personal notes are not automatically made visible merely because an administrator can monitor progress.

## 4. Database findings and reuse

Source references: `_lib/gate.js`, `reading-sync.js`, `Coding/sql/lib/sql-sync.js`, `Coding/Python/lib/practice-set.js`, `Coding/html_css_js_study/studio-cloud.js`, and the Web Studio SQL files.

The current shared authentication/data project is **General_apps**, reference `wylxvmkcrexwfpjpbhyy`; Technical is a different project. Catalog inspection found RLS enabled on these ten relevant tables:

| Table | Current role in the application |
| --- | --- |
| commonplace_exercises | User-owned practice exercises, not a centrally published curriculum |
| commonplace_attempts | Attempt records |
| commonplace_mistakes | Mistake/review records |
| commonplace_progress | Exercise completion; unique user/exercise pair |
| commonplace_notes | User-owned notes |
| commonplace_external_resources | Reading/resource state; unique user/resource-set/item key |
| commonplace_web_studio | One revisioned learning snapshot per user |
| sql_user_state | One progress/checks/mistake-bank snapshot per user |
| py_game_state | Python game state |
| py_my_scripts | User/script records |

Inspected policies mainly enforce row ownership. They are not section authorization, publishing state, assignment or active-membership checks. Do not repurpose user-owned exercise tables as the admin material catalogue: that would mix two ownership models and break existing callers.

Web Studio is the strongest existing synchronization reference: `web_studio_sync_write` is SECURITY INVOKER, checks `auth.uid()` against expected_owner and uses expected revisions; a trigger enforces immutable ownership and incrementing revisions. Its anonymous EXECUTE privilege is absent. These patterns are reusable, not proof that every other path is safe.

Legacy exercise/attempt/progress foreign keys refer to record IDs; some do not encode the owner's UUID alongside that ID. U1 tests must verify that a learner cannot attach their own attempt/progress to someone else's inaccessible exercise. A foreign key alone does not prove authorization of the referenced record.

Some legacy grants include privileges wider than required by the browser. Explicit least-privilege grants and RPC auditing belong in the target design. RLS alone is not a substitute for privilege review.

Shared-project inspection found permissive policies and grants outside Commonplace. This is a launch blocker for inviting learners into that project without broader review, not evidence that a particular learner has accessed other apps. No exploit attempts or writes were performed. Security advisors also reported mutable function search-path warnings; these do not establish exploitability by themselves. Remediation reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable . RLS-without-policy notices may intentionally implement default denial and must not be 'fixed' with blanket allow policies.

No Commonplace-specific material bucket was present in the inspected Storage bucket list. The new material library requires private buckets and assignment-aware read rules, not reuse of an unrelated public bucket.

## 5. Browser data and offline findings

- `extras.js`: `cpx.bookmarks`, `cpx.marks`, `cpx.resume` are shared local keys. Page URLs identify marks but not account ownership.
- `_lib/progress-backup.js`: exports all localStorage and imports arbitrary keys. This can include auth state; replace with a versioned allowlisted study-data format before multi-user use. Never import auth tokens, role hints, permissions or other-app keys.
- SQL uses fixed keys `commonplace_module_exercises_progress`, `cp_sql_check`, `cp_sql_bank`; on sign-in it merges local data into the current user. Account switching can contaminate another user's records unless storage and in-flight sync are isolated.
- Python reading and practice use fixed keys including `cp_py_read` and `commonplace_practice_set_*`. Preserve the current owner's work through an explicit one-time migration; do not assign legacy records to whichever learner signs in first.
- Excel preview uses `commonplace_excel_preview_v1`. It has no independent multi-user foundation or verified offline pack.
- C/C++ offline practice already uses `cpp.offline.problems.<user-id>`: reusable ownership separation for those records, not all study data.
- Web Studio has a browser-owner marker, per-account sync metadata, cancellation on account change, scoped backup validation and import recovery. It blocks cross-owner sync; it is not a complete multiple-account offline vault. Its main local content records still use fixed keys.
- Download caches are generally section-specific, not account-specific. That is acceptable for deliberately public runtime assets but not private assigned lessons. The AI/JupyterLite section has its own worker scopes and runtime; a site-wide worker replacement risks breaking it.

Required model: public runtime cache separate from account-owned material packs and notes; private records keyed by project + user + section + content/version. On account change stop pending requests, invalidate UI state, detach the previous user's data and never reassign their queued work. Preserve unsynced work for its owner. Anonymous legacy state stays quarantined until a verified owner-controlled migration.

Private pack manifests must be authorized, versioned and hash-verified; preserve partial downloads and reuse unchanged files. Do not cache callback tokens, administrative responses or session-bearing URLs. Safe public runtime files can remain shared. A same-origin script can access browser storage; prefixes alone are not protection against XSS. Imported previews/code execution need sandboxing, strict sanitization/CSP and no access to app credentials.

Offline access requires a stated authorization lease policy. Its duration is an unresolved product decision: short leases improve revocation response but reduce disconnected study availability. Local checks protect normal app use, not a hostile device owner who has already copied files. Revocation blocks new server access, takes effect on reconnect/lease enforcement in the client, and cannot recall exported workbooks or disconnected copies. Signed URL validity is also bounded by expiry rather than guaranteed immediate per-user revocation.

## 6. Excel coordination

At the baseline, PR #68 and #69 are merged. PR #70 is open and still targets `feat/excel-study-phase-a`; review/retarget it against main after confirming its intended diff. U0 does not alter that PR.

Keep `Office_work/Excel_study/Section_1_Study.html`, `excel-ribbon.js` and `excel-ribbon.css` working. The shared contract will supply authorized learner context, scenario data and material assignments to the simulator. Do not put user administration into Excel. Do not assume arbitrary imported spreadsheet formulas are supported by the current limited simulator.

Future guided lessons should declare required simulator capabilities, dataset/cell mapping, objectives, steps, validation rules and material version IDs. Unsupported capabilities must produce a clear validation error, not guessed execution. Existing lesson IDs/progress must be mapped, not reset. Personalization changes examples without changing the core mathematical concept.

## 7. Verification performed and limits

Passed on the unchanged checkout:
- Web Studio sync engine: 22 checks.
- Web Studio sync merge: 28 checks.
- Web Studio project/backup: 17 checks.
- Read-only offline manifest verification: Web Studio 58 files / 1,545,607 bytes; C/C++ 196 / 9,275,497; SQL 109 / 3,524,884; BAT 66 / 5,078,334.
- Anonymous GitHub Pages lesson retrieval described above.
- Live read-only metadata inspection: relevant policies, grants, constraints, RLS flags, Web Studio functions, Storage policies/buckets, migration history, advisors.

Attempted BAT and SQL browser login-return checks could not start: the installed Playwright runtime lacks its expected Chromium headless-shell executable. These are environment-blocked, not passing tests and not demonstrated application failures. No physical iPad test, live user-login test, restored-backup test, deployment-dashboard review, comprehensive cross-app RPC audit or server RLS negative test was performed. Unit tests use isolated fixtures and do not demonstrate production authorization.

## 8. Launch gates and rollback

Before U1 production deployment:
1. Choose isolated backend/new origin or complete shared-project remediation. U1 schema/contracts/tests can be prepared locally before that deployment decision; do not provision a paid project implicitly.
2. Verify owner UUID securely, bootstrap/recovery process, Google/email provider settings, permitted callbacks and invite-only onboarding. Do not place owner email/UUID or learner identities in public docs.
3. Back up every backend actually modified. General_apps requires its own fresh backup; a Technical backup is not a substitute. Include schema/data/functions/policies/grants/migration history, relevant Auth configuration and separately backed-up Storage object bytes.
4. Verify backup checksum and restore into an isolated environment; test representative record/relationship/file restoration. Avoid production restore tests.
5. Preserve device study state via a safe scoped export; keep old origin and downloads available. Never tell users to clear website data.
6. Use additive versioned migrations; deploy policies/backend before exposing learner UI. Validate anonymously, as administrator, as learner A and learner B, and after revocation. Tests using service-role credentials do not prove RLS.
7. Rollback disables the new learner entry point and restores the prior application release without dropping new data or old progress. Preserve queued work; fix forward for destructive data changes. Rehearse before cutover.

U0 conclusion: ready to review the design and prepare U1 in isolation; **not ready to invite real learners or switch production authentication**.
