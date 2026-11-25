# General_apps access-repair preparation

**Review candidates only — no hosted change or learner activation.** Prepared
against merged PR #96 (`41feea4e3d6ff1fb8dc7e87f6cbd4af5f609fdbb`) on
2026-11-25 (Japan). These files are deliberately outside
`platform/supabase/migrations/` and are not copied into the normal staging package.
Do not run a directory glob, database reset or automated deployment against the
shared project. The six existing platform migrations remain unchanged.

This is the first concrete repair package from the
[General_apps review](../../acceptance/GENERAL-APPS-REVIEW.md). It does not close
every shared-app finding or prove recovery. The existing personal study system,
Supabase configuration, downloaded packs and live records have not changed.

## Prepared candidates

| File | Effect when explicitly applied | Deployment prerequisite |
| --- | --- | --- |
| `01_access_foundation.sql` | Protected legacy-to-Auth identity mappings, expiring Edge grants and caller-only identity/entitlement RPCs; no automatic backfill | Confirm target, backup and compatible schemas; keep `ga_private` outside exposed API schemas |
| `02_legacy_policy_guards.sql` | Restrictive guards on six legacy tables, including Eagle units and progress | Candidate 01, verified mappings, Eagle members including a confirmed writer, reviewed policy and grant baselines, and all three client cutovers |
| `03_roadmap_session_owner.sql` | Enforce matching owners for tasks, child tasks and sessions. Start and complete retain their signatures and return a saved session ID | Candidate 01, both reviewed RPC fingerprints, consistent historical ownership, caller regression and recovery checkpoint |
| `04_commonplace_signup.sql` | Administrator-managed admission, revision-checked recovery, atomic UUID reservation and verified completion | Six CP migrations, verified CP administrator, reviewed foundation fingerprints and four ordinary nondeferred legacy triggers; installed **disabled** |
| `edge/` | Candidate `claude-proxy` and `code-exec` handlers require a verified non-anonymous user and a current explicit function grant | JWT-capable clients, per-user grants, source drift review and each owning app's deployment review |
| `90_containment.sql` | Close new CP admission, revoke Edge grants and disable both Roadmap session RPCs, retaining identities and data | Apply only if 01/03/04 are present; follow selective rollback guidance below |

The SQL runs in transactions. Session/trigger definition drift aborts the relevant
candidate before replacement. Normalized definition hashes ignore line-ending
differences, not code changes. The new private tables have RLS and no frontend or
service-role table grants; trusted operators manage mappings and Edge grants.
No real user ID, email, token, key or ownership assignment is embedded here.

## Compatibility findings and owning-app work

| Consumer | Observed contract | Required client/owner review before enforcement |
| --- | --- | --- |
| [Code_sensei](https://github.com/Celeritas7/Code_sensei) | Its `user_id` references a separate app user table. Current main uses anonymous REST headers and a single display-name lookup | Add verified Supabase sign-in to the owning client, pass its JWT on every private read/write and AI call, replace the name lookup with `code_sensei_current_user_id()`, and preserve/account-scope saved work. Test existing notes/progress before recording cutover. This client change is **not included** in the candidate package |
| [HealthLog](https://github.com/Celeritas7/HealthLog) | The legacy archive stores textual user keys; current sync has a separate authenticated implementation | Review actual archive consumers and map the original keys to verified UUIDs. Never cast a textual key or assign all history to the first admin |
| [Eagle workspace](https://github.com/Celeritas7/Eagle_eye_view_app_advanced) | Progress belongs to shared assembly units and nodes, not individual learner records | Confirm the actual legacy client and team. Explicit Eagle members with a verified UUID and linked viewer role can read. Members with admin/operator roles can write. Include assembly, project and version workflows that modify units indirectly |
| [Roadmap_advanced](https://github.com/Celeritas7/Roadmap_advanced/blob/main/src/store/studySessions.ts) | Uses start and complete RPCs, session reads and direct undo | Check both RPCs, defaults, retry IDs, client-visible errors, direct undo and null-task sessions. Reconcile existing session/task or parent/child ownership discrepancies with the owning app before installation |
| Existing shared Auth clients | Four triggers enforce admission/link the shared registry/create other app settings | Legacy-approved signup keeps its current path and approved role. CP-only signup creates no legacy role/profile/settings and no CP membership; verified registration and section grants remain separate |

The candidate foundation creates no second editable browser role registry. The
legacy identity map only connects an existing app record ID to a verified Auth
UUID. It does not change that legacy record ID or infer a link from email/name.
One Code_sensei account must resolve to exactly one mapped app identity; zero or
ambiguous matches deny access. Existing unmapped/null-owned data is preserved,
and enforcement stops until it is reviewed.

Candidate 01 accepts a Code_sensei mapping only for an existing source UUID and a
confirmed Auth account. A confirmed account can own multiple reviewed HealthLog
keys. An archive key must exist when mapped, and a visit keeps its original key.
Retire an unused key before reusing it. Mapping corrections record the old and
new UUIDs, time, database login and active role in protected history. Associate
each correction with its operator ticket when using a shared database login.

Candidate 02 locks the mapping and cutover evidence while checking the source
tables, effective browser privileges and each existing permissive policy. Allow a
maintenance window for these locks. Changed policies, inherited privileges that
survive revocation, or browser column grants stop installation for review.
Populate the Eagle membership list from the owning team's approved UUIDs.
Deleting an upstream project or assembly, or changing a version, may modify
Eagle units through a foreign key. These writes require an Eagle writer, including
indirect writes from background jobs. Confirm those callers before enforcement.
A denied cascade rolls back the original operation.

Candidate 03 validates the owner relationships against existing rows in the same
transaction as the RPC replacements. An inconsistent historical link aborts the
installation. Preserve the affected records and obtain the owner's reconciliation
decision. Successful start and complete calls return the session UUID, including
on retry. A suppressed write produces an API error. Containment revokes both
RPCs while retaining the session ledger.

`ga_can_call_edge(name)` accepts no user ID and checks the current JWT subject.
Grant rows default to absent, can expire, and can be revoked without deleting
study work. The Edge handlers use a publishable-key client carrying the user JWT
for this RPC, not their privileged backend client. The AI handler retains its
daily budget/response limits and drops the public-client shared-secret gate.
There is no new paid AI integration for Commonplace's prompt generator.

## Signup behavior and containment

After the six migrations, candidate 04 checks a reviewed function fingerprint
from each migration, including U9 registration, and the four shared triggers'
bodies, bindings and firing schedule. The private signup control starts disabled.
Enabling it requires separate rollout approval and the existing shared-project
and recovery checks. Verify the hosted provider's mailbox-ownership guarantee.

In an enabled Admin Studio, open **Signup requests**. Preparing a normalized
email creates a 24-hour request. Existing verified accounts without a reservation
still use **Register a learner**. The new controls require the candidate RPCs.

| Action | Effect |
| --- | --- |
| Prepare | Creates the first request for the address. A duplicate cannot renew or reopen an earlier decision. |
| Signup | Reserves the Auth UUID in the same transaction as the Auth insert. A failed insert releases the reservation. A missing or disabled control, expired or withdrawn request, or conflicting legacy approval denies signup. |
| Confirm and register | The learner confirms the original account. Reload requests, check the reserved Auth ID and select **Register suspended learner**. The server checks the verified address and reserved UUID. Membership starts suspended with zero section grants. |
| Withdraw | Stops completion even after later confirmation. The Auth identity and saved work are retained. Manage completed learners through membership controls. |
| Renew or resume | After withdrawal or expiry, extends the request. A reserved account keeps its UUID and resumes confirmation through its original Auth method. An identity mismatch requires review. |
| Release for legacy approval | Releases only an unused, withdrawn or expired reservation. The history remains and the owning app must approve the address independently. Bound identities cannot be transferred. |

The completion RPC accepts an admission ID, expected revision and display name.
Other review actions also require the displayed revision. Reload after a conflict.
The signup trigger locks the control row through commit, then uses wall-clock time
for the expiry decision. Completion checks expiry again. Closing the control
stops new reservations. Withdraw an outstanding request to cancel its completion.

Legacy signup requires one preapproved role. It binds an empty UUID or accepts
the same UUID. Conflicting or ambiguous identities abort the Auth insert.
Existing legacy role helpers and other shared policies remain deployment dependencies.

For rollback, first close new CP signup and pause the affected feature. Keep
restrictive policies and identity mappings in place. Candidate 90 provides
containment after the entire candidate set is installed; apply its relevant
statements selectively for a partial rollout. It deliberately does not restore
an insecure conflict path or anonymous access. Suspend pilot memberships through
the existing audited administrator API if needed. Preserve rows, queues and
downloaded packs. Fix forward, retest, then explicitly regrant only intended
capabilities. An earlier backup or older browser build must not silently reopen
the old access rules. A full database restore is an isolated recovery operation,
not the default rollback for a client error.

## R1: connect the existing restore result to its input

The prior private audit verified archive integrity. The earlier Windows CP3
report still has no established link to the exact archived dump verified there.
No live restore is claimed. Reuse the existing Solitro recovery work.

On the computer holding the **exact dump used for CP3**, run the local Node 22+
collector with explicit paths:

```powershell
node platform/operations/general-apps/capture-recovery-identity.mjs --archive "PATH-TO-EXACT-CP3-INPUT.dump" --report "PATH-TO-solitro_cp3_utc_integrity_report.txt" --out "NEW-PRIVATE-EVIDENCE.json"
```

The collector streams SHA-256, records byte sizes, parses only the six CP3 count
fields and never connects to a database. It rejects changed inputs and refuses
to overwrite output. It stores no absolute input paths, raw rows or report text.
The PGDMP header check is not a full archive validation. `--expected-sha256 HASH`
can compare the input with the hash in the private audit. A different hash means
a different input, not corruption. `--confirm-restore-input` records an operator
assertion only; it never upgrades it to a cryptographically established link.
Only a source hash already embedded in the report establishes that limited
hash association, and even that does not prove the report's authenticity or
Auth/RLS/Storage recovery. Every output keeps `deployment_ready: false`.

For an initial Windows check without Node, `Get-FileHash -LiteralPath` with
`-Algorithm SHA256` is sufficient to identify the candidate dump. The operator
must still confirm it is the one actually used for CP3. Do not upload the raw
database, role export or user records to the public repository.

After identifying the input, finish the existing isolated restore checks:
Auth identities/FKs, effective grants/function ownership, A/B RLS execution,
private Storage bytes/download authorization and server-secret/config recovery.
The reported 302 matching public tables alone does not establish these gates.

## Coverage and remaining gates

Candidate 02 covers six legacy tables. Candidate 03 covers the Roadmap task
hierarchy, session ledger and two RPCs. Other candidates cover the four Auth
signup triggers and two Edge routes. It is **not a complete shared-project
authorization repair**. Remaining broad tables/functions, email-fallback role
helpers, other Edge routes, actual exposed-schema settings, affected client
cutovers and the owner identity mappings still require closure. No unverified
mapping or client-readiness attestation is supplied for live use. The six other
Code_sensei learner-data tables, including notebooks, saved projects and chat
history, remain a rollout blocker. The owning app must protect those paths and
demonstrate authenticated access with real verified mappings before enforcement.

Tests execute the actual candidate SQL in isolated PostgreSQL and the actual
candidate Edge handlers with fake provider I/O. The local Supabase runner also
installs them only in its disposable loopback stack, exercises real Auth signup
and concurrent request claims, and then contains the rollout. Its local config
requires confirmation through the isolated Mailpit inbox. Hosted provider acceptance remains separate.
The normal staging builder does not copy these candidates or fixtures.

Merge records preparation. It does not enable admission, run SQL, deploy either
legacy Edge function or qualify the backend for a learner pilot. Both Commonplace
activation configurations remain `null`. Hosted Google return, real private-file
recovery and iPad/Android offline/account-switch acceptance remain open.
