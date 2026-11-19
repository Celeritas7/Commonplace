# Web Studio cloud database

The account data lives in the existing **General_apps** Supabase project (`wylxvmkcrexwfpjpbhyy`), the project used by Commonplace sign-in and Python synchronization. It does not use Technical or create another Supabase project.

Apply the additive, one-time [`sql/web_studio_sync.sql`](../sql/web_studio_sync.sql) migration before enabling the frontend. It creates only `public.commonplace_web_studio`, two functions, the table's trigger and three ownership policies. It does not alter Python or other sections' tables. Existing local records are uploaded by the authenticated application; the migration never reads browser storage. For a deployment that already applied the earlier two-argument writer, apply [`sql/web_studio_sync_owner_guard.sql`](../sql/web_studio_sync_owner_guard.sql) instead of rerunning the base migration. The upgrade removes the old overload and installs the required expected-owner check; it does not modify study rows.

The table holds one JSON snapshot per account, with a monotonically increasing revision and a server-written timestamp. Snapshots contain version 1, native `study` and legacy course `legacy` records. Embedded local project images are part of their source files. Lessons, course media, service-worker caches, downloaded packs, authentication tokens and other Commonplace sections are not stored here. Shared `cpx.*` annotations have separate local storage and are outside this snapshot.

Only authenticated users can select, insert or update their own row. There is no anonymous access or client deletion grant. The write function is `SECURITY INVOKER`, derives ownership from `auth.uid()`, rejects a missing identity, and keeps RLS active. Every object uses an explicit schema; function search paths are empty. Public execute privileges are revoked, with authenticated execution granted only to the writer.

## Client contract

Read `user_id,revision,snapshot,updated_at` from `commonplace_web_studio`, filtered by the signed-in user ID. RLS independently enforces that filter.

Call `web_studio_sync_write` with:

- `expected_revision`: 0 if no row exists, otherwise the last server revision read.
- `new_snapshot`: `{version:1,study:object|null,legacy:object|null}`.
- `expected_owner`: required UUID of the account for which the snapshot was prepared. The server rejects it unless it equals `auth.uid()`. This prevents an authentication change during a pending request from sending account A’s work into account B’s row; it never chooses ownership from the argument.

The result is `{conflict:boolean,revision:number,snapshot:object|null}`. A successful write returns the exact saved snapshot and the next revision. A stale write changes nothing and returns the current server snapshot so the client can merge and retry. An absent-row conflict returns revision 0 and snapshot null. Unique-key insertion and the conditional UPDATE supply PostgreSQL's concurrency protection; no clock comparison or advisory lock is needed.

Use this RPC for application writes. Direct owner REST writes retain the same ownership and structural restrictions but cannot provide the client's three-way conflict merge by themselves. A trigger rejects ownership changes, revisions that skip a number, and initial revisions other than 1. The table caps serialized JSON snapshots at **8 MiB**; reaching a storage or size limit must leave local work intact and show an error. Individual field and project limits are also checked by the application.

## Database acceptance

Run [`tests/sync-rls.sql`](../tests/sync-rls.sql) as the SQL-editor administrator. It runs inside `BEGIN`/`ROLLBACK`, temporarily uses one existing account's row, and impersonates a distinct test identity solely through transaction-local claims. It creates no auth users and leaves no study records behind. Assertions cover owner read/write, stale revisions, invalid/oversized snapshots, revision enforcement, cross-account reads/writes, a wrong or missing expected owner, missing identity, and anonymous denial. Run project security advisors after deployment and inspect findings for the new objects; unrelated existing findings are not permission to change other sections.
