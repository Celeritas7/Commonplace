# U9 — General_apps shared-project checkpoint

Status on **2026-11-25 (Japan): selected; preparation supported; hosted writes and
learner activation pending**. The user confirmed **Celeritas7's Org → General_apps**
(`wylxvmkcrexwfpjpbhyy`) and corrected the earlier Technical selection. Use the
existing Commonplace backend. Technical is not a target for this application.
No new project or organization selection is needed.

## Verified backend mapping

General_apps is healthy, in Mumbai (`ap-south-1`), on PostgreSQL 17.6. The existing
Commonplace authentication and seven `commonplace_*` tables belong here:

- `commonplace_attempts`
- `commonplace_exercises`
- `commonplace_external_resources`
- `commonplace_mistakes`
- `commonplace_notes`
- `commonplace_progress`
- `commonplace_web_studio`

All seven tables have RLS enabled. The read-only catalog recheck found no `cp_`
platform relations/functions, no `cp_private` schema and no `cp-materials` bucket.
It read metadata only, not user rows, keys or file bytes. RLS enabled is not by
itself proof that policies isolate users correctly.

Preserve these existing tables, Auth identities, progress synchronization and
installed offline stores. The new platform's six reviewed migrations introduce
`cp_*`/`cp_private` objects in the same backend; no cross-project transfer is needed.
An existing Auth UUID still needs an explicit platform membership. The old email
allowlist, an email match or editable Auth metadata must not grant administrator
access. Verify the designated owner's General_apps Auth UUID before bootstrap.

## Preparation behavior

The package builder accepts General_apps and labels it `shared-existing`.
Technical is rejected. Unknown references remain `unverified`; the builder never
certifies hosted readiness. The example configuration names General_apps and
leaves the publishable key, separate HTTPS origin and public signing key unset.
The source authentication and deployment configurations remain `null`.

Use a separate HTTPS staging origin and browser token namespace
`cp:commonplace-staging-wylxvmkcrexwfpjpbhyy:auth`. Existing Commonplace production
origins are rejected by staging validation. The new browser session is stored
separately while authenticated identities continue to belong to General_apps.
Preserve existing shared Auth Site URL, Google provider and redirect settings;
review and add only the exact staging callback. Do not clear existing website data.

The server package includes [shared-project-catalog.sql](shared-project-catalog.sql).
This read-only inventory reports effective browser/column grants, all policy modes,
view options, function metadata, Auth triggers and bucket settings. It works before
Commonplace migrations. Reconcile its public/Storage scope with the actual Data API
exposed schemas and inspect function/helper authorization privately. Output policy
expressions may contain identifiers and should stay private. The separate
[catalog.sql](catalog.sql) checks Commonplace after migration.

## Remaining hosted prerequisites

1. Complete General_apps' own shared API, Auth-trigger, Storage and advisor review.
   Earlier Technical findings do not establish this project's security state.
   The previous General_apps audit also noted function search-path and callable
   definer advisories; review actual grants and helper checks before any fix.
   Use targeted changes and regression tests for affected applications.
2. Reconcile the existing **General_apps** backup and restore evidence with the
   current migration baseline. Confirm ownership/grants, Auth identities and
   dependencies, RLS runtime behavior, Storage bytes and server-secret recovery.
   Archive/data comparison results alone do not prove Auth or authorization recovery.
   Preserve earlier backups; test restoration on a compatible isolated target.
3. Select the separate staging HTTPS origin, verify the administrator UUID and
   prepare public/private signing keys with private material restricted to the
   server secret store. The actual learner email remains unspecified.
4. Apply the six migrations explicitly in order after the preceding checks,
   preserving unrelated objects and migration history. Run both catalog checks,
   confirm `cp_private` is not exposed, bootstrap the verified owner and deploy
   only the two Commonplace Edge routes.
5. Publish only the reviewed package's `public/` directory. Complete hosted
   Google/JWT/Storage/Edge, learner A/B, revocation, device/offline/account-switch
   and rollback acceptance with tracked fixtures. The loopback-only local runner
   must never be repointed at this shared live project.

No hosted migration, account, policy, Auth setting or deployed application was
changed during target selection or correction. The staged source and local
fixtures do not establish live learner readiness. Existing personal study and
downloaded packs continue using their current installation.

Provider guidance:
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[anonymous-callable definers](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[authenticated-callable definers](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
