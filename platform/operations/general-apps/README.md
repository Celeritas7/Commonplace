# General_apps access-repair preparation

**Review candidates only — no hosted change or learner activation.** Prepared
against merged PR #96 (`41feea4e3d6ff1fb8dc7e87f6cbd4af5f609fdbb`) on
2026-11-25 (Japan). These files are deliberately outside
`platform/supabase/migrations/` and are not copied into the normal staging package.
Do not run a directory glob, database reset or automated deployment against the
shared project. The six existing platform migrations remain unchanged.

Use the [current migration and signup rollout order](../../acceptance/SIGNUP-ROLLOUT.md)
before execution. Candidate 04 depends on all six CP migrations and follows owner
verification/bootstrap; it is not an early shared repair to apply before that
foundation. Installing it leaves new Commonplace signup paused.

Candidate 04's [2026-11-26 compatibility update](../../acceptance/SIGNUP-COMPATIBILITY.md)
requires the current hardened Auth baseline and preserves its identity, link and
settings checks. It is still unapplied and is not a replayable upgrade. Remaining
restoration verification is deferred while code work continues; it remains a
live-rollout prerequisite, with the resume details retained privately.

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
| `05_code_sensei_isolation.sql` | Full Code_sensei ownership graph, member-only curriculum, retry receipts and atomic project saves | Candidates 01 and 02, verified mappings, owning-client cutover and old saved-work reconciliation; see [preparation evidence](../../acceptance/CODE-SENSEI-ISOLATION.md) |
| `06_healthlog_archive.sql` | Read-only verified-owner access across all four HealthLog archive tables; preserves original keys and relationships | Revised 01 then 02, verified mappings including clinic/dose-only keys, reviewed archive consumers and recovery; see [readiness evidence](../../acceptance/HEALTHLOG-ARCHIVE-READINESS.md) |
| `07_eagle_workspace.sql` | Verified Eagle membership, linked Logi graph guards and atomic deletion/archival RPCs | Revised 01/02, reviewed registry and exact graph baseline, plus `eagle-graph-v1:` client evidence; see [Eagle readiness](../../acceptance/EAGLE-WORKSPACE-READINESS.md) |
| `08_roadmap_daily_actions.sql` | Atomic daily task/session actions with owner-scoped retry receipts | 01/03, exact source/owner baseline and coordinated client/recovery acceptance; see [Roadmap session readiness](../../acceptance/ROADMAP-SESSION-READINESS.md) |
| `09_roadmap_record_ownership.sql` | Owner-qualified links, comparison pick membership and bounded browser grants across the other eleven Roadmap tables | 01/03, reviewed exact catalog, consistent historical links/picks and owning-caller/recovery acceptance; see [record readiness](../../acceptance/ROADMAP-RECORD-READINESS.md) |
| `edge/` | Candidate `claude-proxy` and `code-exec` handlers require a verified non-anonymous user and a current explicit function grant | JWT-capable clients, per-user grants, source drift review and each owning app's deployment review |
| `90_containment.sql` | Close new admission, pause both Edge routes, pause Roadmap routines and revoke their browser execution permissions | Full shared incident only. Review the per-component results and retain individual entitlements |

The SQL runs in transactions. Session/trigger definition drift aborts the relevant
candidate before replacement. Normalized definition hashes ignore line-ending
differences, not code changes. The new private tables have RLS and no frontend or
service-role table grants; trusted operators manage mappings and Edge grants.
No real user ID, email, token, key or ownership assignment is embedded here.

## Compatibility findings and owning-app work

| Consumer | Observed contract | Required client/owner review before enforcement |
| --- | --- | --- |
| [Code_sensei](https://github.com/Celeritas7/Code_sensei) | Its `user_id` references a separate app user table. The production entry point still uses anonymous headers and a display-name lookup | [Companion PR #4](https://github.com/Celeritas7/Code_sensei/pull/4) prepares verified JWT access and account-scoped work in an opt-in staging build. It requires 01/02/05, real verified mappings and original saved-work/queue reconciliation before cutover. It is not a deployed client or a real cutover attestation |
| [HealthLog](https://github.com/Celeritas7/HealthLog) | The legacy archive stores textual user keys; current sync has a separate authenticated implementation | [Archive readiness](../../acceptance/HEALTHLOG-ARCHIVE-READINESS.md) covers all four old tables. Inspected current desktop/mobile clients use the separate UUID tables. Candidate 06 prepares read-only archive access after revised 01/02; real mapping and external-client acceptance remain required. Never cast a textual key or assign history to the first admin |
| [Eagle/Logi legacy workspace](https://github.com/Celeritas7/Logi_assy_advanced) | Shared units/progress depend on Logi projects, assemblies, versions and nodes. Eagle Advanced uses a different table family | Candidate 07 and an opt-in Logi staging client prepare verified membership and atomic parent operations. Deployed legacy writer/team/cutover remain unverified; see [corrected inventory](../../acceptance/EAGLE-WORKSPACE-READINESS.md) |
| [Roadmap_advanced](https://github.com/Celeritas7/Roadmap_advanced/blob/main/src/store/studySessions.ts) | Uses start and complete RPCs, session reads and direct undo | Candidate 08 and an opt-in staging client prepare atomic daily changes and persistent retries. Existing RPCs stay compatible; actual callers, ownership history and the broader Roadmap graph still need acceptance. See [session readiness](../../acceptance/ROADMAP-SESSION-READINESS.md) |
| Existing shared Auth clients | Four triggers enforce admission/link the shared registry/create other app settings | Legacy-approved signup keeps its current path and approved role. CP-only signup creates no legacy role/profile/settings and no CP membership; verified registration and section grants remain separate |

The candidate foundation creates no second editable browser role registry. The
legacy identity map only connects an existing app record ID to a verified Auth
UUID. It does not change that legacy record ID or infer a link from email/name.
One Code_sensei account must resolve to exactly one mapped app identity; zero or
ambiguous matches deny access. Existing unmapped/null-owned data is preserved,
and enforcement stops until it is reviewed.

Candidate 01 accepts a Code_sensei mapping only for an existing source UUID and a
confirmed Auth account. A confirmed account can own multiple reviewed HealthLog
keys. An archive key must exist in visits, clinics or dose logs when mapped; clinic-only
keys are valid. Records keep their original keys. Both mapping and lookup require
a verified non-anonymous Auth account.
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
on retry. A suppressed write produces an API error. Both RPCs also check a private pause flag. Containment retains the session ledger.

`ga_can_call_edge(name)` accepts no user ID and checks the current JWT subject.
The verified caller's client checks that grant before input processing. After
validation, the service client calls `ga_reserve_edge` with the UUID returned
by Auth. Its committed transaction authorizes one outbound attempt. It locks
the route and grant, checks expiry against the clock, and reserves quota.
Withdrawal stops subsequent reservations. A provider failure after reservation
still counts. Neither the browser nor a shared client secret can reserve a call.

The AI route retains the existing shared limit of 200 attempts per Tokyo day.
Execution starts with both limits unset and refuses all submissions until the
service owner approves positive shared and per-user daily caps. Confirm the
existing global budget function, both owning clients and their intended user
rosters first. Coordinate both release handlers with the canonical Akatsuki
repository. This review does not release a provider function. Use mocked
providers throughout acceptance. Commonplace's prompt generator needs no paid call.

## Signup behavior and containment

After the six migrations, candidate 04 checks a reviewed function fingerprint
from each migration, including U9 registration, and the four shared triggers'
bodies, bindings and firing schedule. The private signup control starts disabled.
Enabling it requires separate rollout approval and the existing shared-project
and recovery checks. Verify the hosted provider's mailbox-ownership guarantee.

In an enabled Admin Studio, open **Signup requests**. Preparing a normalized
email creates a 24-hour request. Existing verified accounts without a reservation
still use **Register a learner**. The new controls require the candidate RPCs.

The read-only `cp_admin_signup_status()` RPC reports the private control as
enabled or paused; a missing row reports unavailable. Only a verified active
Commonplace administrator may read it. **Signup requests** displays that status
on entry, after request actions and on manual reload. An older installation
without the RPC, a failed read or an invalid response displays unavailable;
an administrator permission denial clears the workspace. Preparing a request
never opens signup, and this interface supplies no enable switch. The status
describes this admission gate only, not provider readiness. These changes update
the unapplied candidate; they do not apply it or authorize rerunning it against
an existing installation.

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

For an incident affecting one component, record the approved scope and time.
Close new admission by setting the singleton signup control to disabled. Pause
a single Edge route by setting `ga_private.edge_routes.paused` for its exact
function name. Check that one row changed, that its previously entitled fixture
is denied, and that the unaffected route still works with a mock provider.
Pause Roadmap through its singleton and review both routine ACLs. Preserve the
underlying grants, identities, saved work, queues and packs. Existing admissions
and memberships can be withdrawn or suspended individually through Admin Studio.

For a full incident, execute candidate 90 standalone in one database session
with no outer transaction. Each component reports its outcome. If a control,
routine or privilege has drifted, the runner reports incomplete containment
after committing successful stops. Capture the component results and final error
in the private incident record. Verify effective access with representative
roles. Inherited routine privileges need review even when the runtime pause
blocks the caller. For a pre-candidate function still serving traffic, use the
owning application's approved stop procedure and verify that endpoint separately.

Before resuming, check the repair and the current roster, expirations and prior
withdrawals. Unpause only the approved Edge route. For Roadmap, verify both
routine definitions and ACLs, restore the intended authenticated EXECUTE grants,
then release its pause. Verify retained sessions and allowed and denied fixtures.
Keep the same study origin and namespace. Never bulk regrant user entitlements.

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

The collector accepts UTF-8 and BOM-marked UTF-16LE Windows reports. Preserve
the original report bytes. After writing private evidence, exit 0 means the
reference hash, embedded source hash and reported counts agree. Exit 2 flags a
mismatch, and exit 3 flags incomplete linkage. Exit 1 means the input or capture
failed. An operator assertion alone still yields incomplete linkage. None of
these results establishes service recovery.

For an initial Windows check without Node, `Get-FileHash -LiteralPath` with
`-Algorithm SHA256` is sufficient to identify the candidate dump. The operator
must still confirm it is the one actually used for CP3. Do not upload the raw
database, role export or user records to the public repository.

After identifying the input, finish the existing isolated restore checks:
Auth identities/FKs, effective grants/function ownership, A/B RLS execution,
private Storage bytes/download authorization and server-secret/config recovery.
Keep the completed 302-table, 20,889-row Windows comparison. Associate the exact input SHA-256 when available. Auth, RLS, private Storage and server configuration each require independent restore evidence.

## Coverage and remaining gates

Candidate 02 covers six legacy tables. Candidate 03 covers the Roadmap task
hierarchy, session ledger and two RPCs. Other candidates cover the four Auth
signup triggers and two Edge routes. It is **not a complete shared-project
authorization repair**. Remaining broad tables/functions, email-fallback role
helpers, other Edge routes, actual exposed-schema settings, affected client
cutovers and the owner identity mappings still require closure. No unverified
mapping or client-readiness attestation is supplied for live use. The additional
Code_sensei paths are covered by the unapplied
[candidate 05 preparation](../../acceptance/CODE-SENSEI-ISOLATION.md), including
exercise, attempt and game-progress tables beyond the six originally noted.
Candidate 06 adds the [complete HealthLog archive](../../acceptance/HEALTHLOG-ARCHIVE-READINESS.md)
read-only contract after revised 01/02. It does not certify current HealthLog
cache isolation or unrelated app/compute access.

The Code_sensei companion client is opt-in staging only. Real verified mappings, saved-work
reconciliation and owning-app acceptance remain required before enforcement.

Candidate 09 prepares the remaining Roadmap table grants and actual parent links.
It preserves unknown suggestion replies and retired hub-place addresses instead
of treating them as mandatory parent rows. Existing comparison import remains
an invoker function with unchanged semantics. It does not close comparison
retry/stale-edit, hub/caller, local-state or app-admission acceptance gaps.

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
