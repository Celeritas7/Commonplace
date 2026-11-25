# U9 — Technical shared-project checkpoint

Status on **2026-11-25 (Japan): selected; preparation supported; hosted writes and
learner activation pending**. The user selected **Celeritas7's Org → Technical**
after merging PR #94. This supersedes the earlier proposal to provision a separate
project. No new project, plan change or organization selection is required.

## Backend mapping

| Purpose | Project | Verified state |
| --- | --- | --- |
| Selected new platform backend | Technical — `ulgrfumbwjovbjzjiems` | Healthy, Mumbai (`ap-south-1`), PostgreSQL 17.6; shared with existing apps |
| Existing personal Commonplace login/progress | General_apps — `wylxvmkcrexwfpjpbhyy` | Seven `commonplace_*` tables, all with RLS enabled; retained in place |

The seven legacy tables are `commonplace_attempts`, `commonplace_exercises`,
`commonplace_external_resources`, `commonplace_mistakes`, `commonplace_notes`,
`commonplace_progress` and `commonplace_web_studio`. This inspection read their
catalog metadata, not learner records. Technical currently has no Commonplace
relations, functions or schema, including a case-insensitive search for Commonplace,
Commonspace and `cp_` names. It has no `cp-materials` bucket or platform Edge routes.

Do not rename/copy those legacy tables into Technical or repoint `_lib/gate.js` and
existing progress sync. The new platform uses the reviewed `cp_*`/`cp_private`
migrations. A later progress transfer needs its own verified source/destination
identity mapping; equal emails do not establish equal Auth UUIDs. Google callbacks,
installed apps and legacy offline stores continue using their existing setup.

## Read-only findings

Catalog, migration, bucket and Edge metadata plus security/health advisors were
reviewed. No RPC was invoked to probe another user's data. No user rows, keys,
object paths or file bytes were exported. Counts describe this checkpoint, not a
permanent inventory or a complete authorization test.

| Surface | Evidence | Consequence |
| --- | --- | --- |
| Public relations | 122 tables with RLS enabled; nine views, eight with `security_invoker` | RLS enabled alone does not establish isolation. The remaining owner-context view needs a dependency/grant review. |
| Policies | 282 public/Storage policies; 120 have an exact `true` USING or WITH CHECK expression | Some are intentional public learning content. Several inspected user-state tables also have broad browser grants and permissive policies without a restrictive guard. New Commonplace JWTs would share this surface. |
| Public functions | 41 non-extension functions; six anonymous-callable and 18 authenticated-callable security definers | Review each function and its helper checks. Two inspected user-state routines accept caller-supplied user IDs without a caller identity check in their bodies. Counts/string matching alone are not vulnerability verdicts. |
| Auth signup | An existing signup trigger writes a row into another app's profile table | Even synthetic Auth accounts have side effects. Use a bounded, tracked hosted test plan; never run the empty local-fixture runner against Technical. |
| Storage | Four existing public buckets; no Commonplace private bucket | Existing assets stay unchanged. Restricted tutorials require `cp-materials` and the tested bucket guard plus authorized Edge delivery. |
| Hosted services | 13 recorded migrations; two existing Edge functions; no platform migrations/functions | Preserve migration history and unrelated functions. A disabled gateway JWT flag alone says nothing about authentication inside an existing handler. |
| Advisors | Owner-context view, callable definers and mutable function search paths require review; health returned no lints | Advisor output supplements the catalog and application review; it does not certify the shared project. |

**Shared isolation remains unresolved.** `cp_` names, a separate browser origin and
Commonplace membership checks cannot restrict what the same project's roles can
do through another app's API. Do not blanket-revoke existing policies or disable
shared Auth settings: existing clients must be inspected and tested before a
targeted change. Private review evidence should retain detailed policy/function
definitions; it should not be committed with account data or credentials.

Rerun [shared-project-catalog.sql](shared-project-catalog.sql) as a trusted
operator before hosted writes and after any shared policy change. It is a single
read-only inventory query and works before Commonplace is installed. It reports
effective browser grants (including PUBLIC and column grants), all policy modes,
view options, callable functions, Auth triggers and bucket settings. It does not
execute those functions or fetch application rows. Its default relation/function
scope is public and Storage. Reconcile its schema-access list with the actual Data
API configuration and extend the query for other exposed schemas. A function-body
hash is for drift comparison, not authorization proof. Review function bodies and
helper chains privately. Keep policy expressions private if they contain personal
identifiers. The existing [catalog.sql](catalog.sql) remains the separate
Commonplace-specific check after all six migrations.

## Backup evidence carried forward

The private **Technical Supabase Backup and Recovery Runbook**, dated 2026-11-16,
records `Technical_2026-11-15.dump` (14,004,112 bytes), a recorded SHA-256, 2,216 TOC
entries, successful archive decoding and a selective Burmese table recovery of
822 rows. It also records downloaded Storage inventory reconciled by count/size.
This is documentary evidence; the archive was not downloaded or rehashed here.
The runbook explicitly leaves full Auth, roles, dependencies, RLS and Storage-link
recovery unproven. A selective data restore does not establish those properties.

Before hosted changes, reconcile a current Technical backup and recovery record:

- Preserve the previous archive; record the new snapshot time, hash, readable TOC
  and schema/data/migration coverage privately.
- Preserve ownership, grants, functions, policies and Auth identities/dependencies
  needed for recovery; a data-only or `--no-privileges` export is insufficient alone.
- Back up Storage bytes separately with paths and per-object integrity evidence;
  record Auth/provider configuration, Edge versions and server-secret recovery.
- Restore on a compatible isolated target, verify referential integrity and
  representative permissions as non-bypass roles, then test the six platform
  migrations against that baseline and confirm existing app behavior.

General_apps backup evidence belongs to another project. The disposable local
Commonplace matrix proves the platform fixture, not Technical's existing apps or
its disaster recovery. Never reset or restore over Technical as a test.

## Remaining hosted sequence

1. Resolve the shared API findings with each affected app's authorization contract
   and regression evidence. Include anonymous, existing users and a Commonplace-only
   authenticated identity. Review all exposed schemas and shared Auth side effects.
2. Reconcile the Technical backup/restore evidence above. Verify schema/name
   collisions, grants, triggers and migration-history compatibility against the
   current catalog. Do not repair unrelated history or use a broad remote reset.
3. Choose the separate HTTPS website origin and verify the designated administrator's
   Technical Auth UUID through a trusted operator. The learner email remains absent.
   Reuse project Auth settings carefully: preserve existing Site URL/provider/redirect
   configuration and add only the exact required redirect after reviewing impact.
4. Prepare the package with Technical's publishable key and a public offline key;
   store the signing key only in the Edge secret store. The builder accepts Technical
   but always reports readiness as unassessed. It neither contacts nor deploys to it.
5. Apply the six reviewed migrations explicitly in order, preserving other app
   objects/history, then run both catalog checks. Verify `cp_private` is not exposed,
   bootstrap only the verified owner, and deploy only the two platform Edge routes.
6. Publish only the package's `public/` folder at the reviewed origin. Complete the
   real Google/JWT/Storage/Edge/assignment/revocation matrix with tracked fixtures,
   then device/offline/account-switch and rollback acceptance. The local fixture
   runner stays loopback-only and must not be adapted to this live shared target.

This checkpoint changes preparation and review inputs only. Source authentication
and deployment stay `null`; no hosted migration, signup, role, policy, bucket,
Google setting or application deployment was changed.

## Verification for this change

- The checked-in shared catalog ran read-only on Technical: 796 metadata rows
  across the stated review scope, including all 282 policies and the signup trigger.
- 121 Node/PostgreSQL checks and 52 browser cases passed locally; the existing
  offline shell hash check passed unchanged. Exact-head CI is recorded in the PR.
- The new PostgreSQL fixture runs the inventory inside a read-only transaction
  before Commonplace migrations. It verifies PUBLIC/column grants, permissive and
  restrictive policies, owner/invoker views, callable definers, Auth side effects
  and an extra schema needing review, while excluding a private marker row.
- Package tests cover Technical selection, separate token storage, backend-scope
  labels, retained legacy rejection, hash-checked operator files outside the public
  bundle, and inactive checked-in configuration. No live login was attempted.

Provider guidance:
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[owner-context views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
[anonymous-callable definers](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable),
[authenticated-callable definers](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
