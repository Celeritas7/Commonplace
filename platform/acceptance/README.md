# U9 — Security acceptance and recovery

U9 has two kinds of evidence: repeatable tests of this repository, and acceptance
of the actual hosted deployment and physical devices. Passing one does not imply
the other. The live entry remains `deployment = null`. See the current
[readiness assessment](../../docs/admin-platform/U9-READINESS.md).
The next U9 checkpoint adds [disposable full Supabase integration](LOCAL-STACK.md)
with real local Auth, PostgreSQL, REST, Storage and Edge services. It does not
provision a hosted staging project or replace the hosted/device gates below.
The [hosted staging preparation](HOSTED-STAGING.md) now provides the Google login,
isolated client and package builder. General_apps is the selected shared backend;
the separate HTTPS origin and hosted execution remain subject to the release gates.
Use the [current migration and signup rollout order](SIGNUP-ROLLOUT.md), including
paused installation of candidate 04 after all six migrations and owner setup.
The [G0 readiness checkpoint](G0-READINESS.md) records the latest read-only
reconciliation and unresolved recovery/shared-access gates.

## Repeat the automated checks

From the repository root:

```sh
npm ci --prefix platform --ignore-scripts
npm test --prefix platform
node platform/tools/build-offline-shell.mjs --check
npm run test:browser --prefix platform
```

Install the browser with the pinned Playwright CLI in `platform/` if necessary:
`npx playwright install --with-deps chromium`. The focused U9 subset is
`npm run test:acceptance --prefix platform`. CI runs the entire suite, both Edge
Function type checks and the nine existing Deno tests. No test needs live keys,
real emails, a paid service or a production database.

| Evidence | What it establishes | Limit |
| --- | --- | --- |
| Final migration catalog and role matrix | The complete migration chain retains default-deny, UUID ownership, admin-only writes, private files and CAS synchronization | PGlite uses a minimal Auth/Storage fixture and SQL roles, not real JWTs or HTTP services |
| Deliberate permission drift | The read-only preflight catches missing functions, disabled RLS, anonymous execution and excess table/column grants | A catalog check is not a policy semantics or whole-project audit |
| U7 → U8 snapshot restore | Synthetic old/new study records, all platform table contents, revisions, audit, grants and RLS survive an isolated PGlite dump/reload; retry stays idempotent | Not a hosted `pg_dump`/Auth/Storage byte restore, disaster recovery certification or migration reversal |
| Real worker code in controlled failures | Partial application downloads cannot report ready or serve partial shells; failed updates preserve the old shell; unchanged assets are reused; legacy caches and OAuth URLs are preserved | Cache/worker API harness, not an iPad lifecycle test |
| Browser acceptance | Online saved-study resume rechecks revocation; a verification transport failure while `navigator.onLine` is true blocks fallback without deleting work; disabling/reopening the host retains queued edits and same-owner recovery | Synthetic identity, cloud and failure injection; real transport, sessions and devices remain pending |

U9 fixes the central session's offline branch so an online browser always checks
current authorization, even after selecting saved study or missing an online event
while backgrounded. The regression failed before the change. Its public shell
manifest is refreshed; the worker scope and legacy application files are unchanged.

## Read-only target preflight

Before installation, use [shared-project-catalog.sql](shared-project-catalog.sql)
and the rollout guide's prerequisites. After the six migrations, and again after
signup candidate 04, run [catalog.sql](catalog.sql) as a trusted database operator.
The file contains one SELECT statement with catalog/Storage metadata reads.
It creates or changes nothing and returns no user records or secrets. Retain the
project reference, source commit, run time and returned findings in private release
evidence. Zero rows means only these structural checks passed. Missing roles or
Storage schema are an incompatible/unprepared target, not a passing empty result.

The checks cover required platform tables/functions/U8 columns, RLS, browser table
and column privileges, function exposure/search paths, private bucket configuration
and restrictive Storage guards. They do not assess unrelated application policies,
JWT validation, dashboard exposed-schema settings, function body tampering, exact
policy expressions or encryption. Run hosted advisors and the matrix below too.
Do not make a failing check green by adding broad grants or by using service-role
credentials for learner tests.

## Hosted acceptance — pending approval

Use the selected General_apps backend only after its shared-project prerequisites
and the separate HTTPS origin are approved. Keep the legacy installation running.
General_apps is not disposable; review its entire exposed surface because a
prefix is not isolation. The local fixture runner stays on its own loopback stack.
Do not provision paid resources or modify the shared project as part of merely
running this repository's tests.

1. Record the target, origin, PostgreSQL version, source SHA, all migration file
   checksums, dependency lock checksum, exposed schemas and reviewed advisors.
   Confirm `cp_private` is not exposed. Verify backup scope and restore evidence
   before applying anything to a database containing valued data.
2. Follow the [rollout guide](SIGNUP-ROLLOUT.md): all six migrations, verified
   owner bootstrap, then candidate 04 installed paused. New tracked test Auth
   identities require the later G4 signup approval/window; never create them
   early as a shortcut. Keep mappings and tokens outside Git and public evidence.
3. Configure the reviewed client, Google callback allowlist and Edge services on
   staging only. Supply the service credential only to `material-files` and the
   separate private signing key only to `offline-lease`. Choose an explicit offline
   interval; the seven-day sample setting does not approve a production interval.
   Verify the gateway with the target's actual key/JWT configuration.
4. After the approved signup window and verified registration, separately review
   learner A/B access and assignments. Create a synthetic published Excel lesson/file
   for A, a B-only lesson, a draft, an unreleased answer sheet and a profile-group
   assignment. Verify the following
   with real signed user sessions and public client credentials. A database owner
   or service token is never evidence of a learner boundary.

| Case | Required result |
| --- | --- |
| Anonymous/unregistered | No private membership directory, profiles, lessons, files, offline lease or admin operations; new membership starts without section access |
| Learner A / B | Each sees only its published assigned content and own study state; A cannot read/write B's UUID, profile, material, backup or progress |
| Administrator | Manage learners, profiles, publications and assignments; successful changes produce audit records; sole owner cannot be revoked through the learner API |
| Privilege escalation | Forged role/profile/import fields, user metadata, query parameters and direct table writes cannot grant access |
| Direct URLs and alternate APIs | REST/RPC/GraphQL, raw object/public URLs, bucket listing, signed-URL creation and guessed IDs deny unauthorized access; a 404 from an undeployed endpoint is not a security pass |
| Private file service | A can download its file; invalid/expired JWTs, wrong/missing Origin, B's ID, drafts and integrity mismatches deny; no permanent bearer/public URL is emitted |
| Publication and group changes | Draft/archive/unreleased answers are hidden; exclusions override groups; removing a member/assignment denies fresh reads without changing the existing JWT |
| Revocation during request | Hold a file transfer or lease generation, revoke access, then release it: recheck denies delivery; record bytes already transmitted separately |
| Concurrent administration | Two tabs saving the same revision cannot overwrite silently; revoke/write races leave an authorized committed write or a denial, never a post-revocation bypass |
| Offline/reconnect | Old JWTs and old receipts do not bypass current online denial; disconnected study obeys its lease; pending work is retained without being assigned to another owner |
| Two devices and failed acknowledgements | Different notes retain both copies; repeated operation ID uploads once; edits during upload stay pending; explicit resolution keeps history |
| Import boundary | Malformed/oversized JSON, active/macro/external-link files and scripts are rejected; imported code is inert; valid imports remain draft until reviewed |

Record request class, role label, expected/actual outcome and time. Never record
Authorization headers, JWTs, learner emails, personal notes or signing keys in
public reports. Store private evidence separately. CI creates synthetic users and
applies migrations only inside its fresh disposable local stack. It never applies
migrations, creates owners/users or sends acceptance requests to a hosted project.

## Physical iPad / Android acceptance

The synthetic `/platform/learn/offline-preview.html` can validate the offline UI
before staging exists. It cannot validate real Google login, access control or
cross-device sync. Prepare the download in the exact Home Screen installation you
will use in the café; Safari and the installed app may have different storage.

| Step | Observe and record |
| --- | --- |
| 1. Online preparation | Exact build/device/OS/browser; Google login returns to the correct staging page; Excel-only account has no other subjects or admin controls |
| 2. Download | Study offline shows size, progress and remaining bytes; interruption/pause resumes completed files; Ready offline appears only after completion |
| 3. Airplane-mode cold reopen | Close the app, disconnect Wi-Fi/mobile data, reopen the same Home Screen app; Resume saved study opens assigned lesson and tutorial without a login loop |
| 4. Durable work | Change SUM, notes, bookmark and quiz; wait for Saved on this device; close/reopen offline and confirm every value |
| 5. Foreground and expiry | Background/foreground retains owned work; an expired lease closes private content; verify both while open and on cold reopen |
| 6. Reconnect and conflict | Upload pending work; make different changes on a second device; both copies remain until a deliberate choice |
| 7. Account switch and revocation | Sign out/switch to B; no A content appears; return to A without deleting its notes; revoke A online and confirm future authorized requests fail |
| 8. Update and recovery | Failed application update retains the old shell; complete update preserves notes; export/restore a same-owner backup and reject a different owner's backup |
| 9. Existing study | Reopen existing Python, SQL, C++, BAT and Web Studio installations offline; check their saved bookmarks/notes without clearing data or reinstalling |

Record PASS/FAIL/BLOCKED separately per device and step. Desktop device emulation
is not physical iPad acceptance. Never clear website data to obtain a pass.

## Backup and rollback rehearsal

Before pilot activation, verify an isolated restore of the actual target's schema,
rows, grants, functions, policies and migration history, plus required Auth metadata
and separately saved private Storage bytes. Record timestamp, scope, file size,
SHA-256, restore log and representative ownership/file checks. Keep real dumps
private. A backup of Technical is not a backup of General_apps. Existing general
backup results may be supporting evidence; they do not prove Commonplace's future
Auth/Storage integration or the restoration of changes not yet deployed.

For a pilot rollback: disable the new route/configuration, stop new assignments,
retain server tables, audit, files, local IndexedDB and queues. Keep the same origin
and namespace for recovery. Export outstanding work if authorized access remains
available; record blocked owners for a controlled operator-assisted recovery. Do
not demote/reassign owners, remove migrations, reset revisions, restore raw DML,
overwrite legacy U7 data, drop buckets or clear devices. Re-enable only the tested
compatible build and reconcile with CAS; an old signed lease cannot be remotely
recalled from a disconnected device. The browser test rehearses local disable /
re-enable only; hosted restore, traffic and deployment rollback are still required.

## Release decision

GO requires all hosted, backup, origin/key, physical-device and legacy-regression
gates above, a chosen disconnected interval, and a reviewed activation change.
Any BLOCKED/unknown remains NO-GO. A merged implementation PR is not activation or
proof that these gates passed. Use the readiness report to record the next evidence;
do not restart U0 or repeat completed local tests without a reason.
