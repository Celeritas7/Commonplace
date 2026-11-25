# G0 — Recovery and shared-access readiness

**2026-11-25 (Japan). Read-only review complete; G0 is not cleared.**
Reviewed Commonplace `main` at `fca5040a467ea928b1f8b5e4c5cae6622c42af97`
(merged PR #103). General_apps remains the selected backend. Hosted changes,
learner enrollment and advancement to G1 remain on hold.

This checkpoint updates the earlier [General_apps review](GENERAL-APPS-REVIEW.md)
without replacing its historical evidence. Follow the
[rollout order](SIGNUP-ROLLOUT.md) after the gates below are closed. A merged
preparation PR or passing synthetic tests do not clear those gates.

## What this review established

Read current project health, migration history, public/Storage catalog,
effective browser privileges, selected helper and Auth-trigger definitions,
deployed Edge metadata and the two previously identified legacy compute
handlers. Reconciled existing private recovery reports, the current backup
sidecar, Solitro's closed recovery assessment and the latest reported Akatsuki
recovery progress. No production application/Auth rows or secret values were
read. Hosted SQL used read-only transactions with local timeouts and rollback;
no signup, RPC mutation, provider call, migration or deployment was performed.

Raw catalogs, shared-app object details, function bodies, backup hashes and
private evidence locations stay in the separate operator report. No raw backup
was downloaded or restore repeated in this checkpoint.

| Area | Current result | Limit / next evidence |
| --- | --- | --- |
| Target | General_apps is healthy; existing personal study stays in place | Health does not establish recoverability or authorization |
| Existing Commonplace | Seven legacy tables retain owner policies and RLS | Six still have excess database privileges; review consumers before a scoped correction |
| Public catalog | 302/302 tables have RLS; 37/37 views use security invoker | Broad policies on other apps still exist; these counts are not an access-control pass |
| Shared registry | Effective browser TRUNCATE is now denied; current role lookup uses verified UUID linkage rather than email fallback | Other privileges/helpers and actual caller regressions still require review; this review did not make the changes |
| Shared Auth linking | Current definitions reject conflicting UUID links and stop automatic default-role creation | Live provider/signup behavior was not exercised |
| Signup candidate 04 | **BLOCKED: three of four trigger body fingerprints differ** | Reconcile the candidate with current hardening before any installation; do not merely replace hashes |
| Shared personal data / RPCs | Previously identified permissive-policy and ownership gaps remain | Owning-app fixes, verified mappings, client cutovers and allowed/denied regression evidence are required |
| Legacy compute routes | Source still shows shared-client-secret or generic-user authentication without the proposed explicit route entitlements | Candidate handlers are preparation only; other deployed routes also need entitlement closure |
| Platform activation | Six CP migrations absent from history and no CP relations/functions/private schema, material bucket or platform routes observed; both source activation configs are null | The visible live personal app cannot yet provide the prepared Admin Studio controls |
| Gateway / provider configuration | **UNVERIFIED** | Actual exposed schemas, Google/callback configuration, mailbox verification and configuration/secret recovery need separate evidence |

All 15 deployed Edge routes currently have gateway JWT verification disabled.
That flag alone is not a vulnerability finding: handler authentication and app
entitlement must be assessed separately. Only the two previously flagged compute
handler sources were re-read here; this is not a fresh full review of all 15.
No endpoint was invoked. Policy metadata does not establish actual gateway
exposure, and absence from migration history alone is not installation proof;
the current catalog was checked as well.

## Preserve the completed recovery work

| Evidence | Retain as completed | What it does not establish |
| --- | --- | --- |
| Earlier private backup audit | Saved database/roles archive integrity and 409 Storage objects matching their saved size/hash manifest | A usable restored Supabase service or an atomic database/Storage recovery point |
| Solitro's bounded R2 rehearsal | Four checkpoints closed; reported 302 matching public COPY blocks and 20,889 rows; selected index/publication repairs | Its assessment explicitly leaves 117 Auth-dependent FKs unrestored, zero local Auth users and effective Auth/RLS/Storage/Realtime recovery unproven |
| Current backup identity | The current saved sidecar agrees with the archive identity in the earlier private audit | It does not link the older Solitro CP3 result to this different snapshot; no new archive hash was computed here |
| Akatsuki A1E | Latest reported work continues in its separate isolated recovery environment | A final Auth/FK/runtime recovery report is not yet available; reported progress is not independently verified restoration |

Do not reopen Solitro's four completed checkpoints or rerun its successful public
comparison simply to obtain a different status. Its older input and the later
Akatsuki backup remain separate evidence sets. Different sizes/dates do not imply
corruption. Resolve any missing input association from retained evidence without
editing the original report, inventing a hash or treating an operator assertion
as cryptographic proof. The existing
[local identity collector](../operations/general-apps/README.md#r1-connect-the-existing-restore-result-to-its-input)
may record that limited association; it cannot certify runtime recovery.

Continue the already active Akatsuki recovery at its recorded stopping point.
Its final private handoff should identify the exact archive, local target, Auth
table coverage and original FK/index/trigger reconciliation. Keep restored
triggers contained until their dependencies and effects have been reviewed.
Record any remaining recovery limitations explicitly; do not fabricate Auth
users or remap owners to make constraints pass. A stock PostgreSQL data restore
alone does not demonstrate Supabase sign-in or real JWT authorization.

## Signup compatibility is a new stopping point

Candidate [04_commonplace_signup.sql](../operations/general-apps/04_commonplace_signup.sql)
was prepared against earlier shared Auth definitions. Three current definitions
now differ under the candidate's exact CRLF-normalized body-hash comparison.
The fourth matches, and the four expected trigger bindings remain present.
The six-migration prerequisite is also unmet. This checkpoint compared metadata;
it did not execute candidate 04 against the hosted project.

The changed definitions include new identity checks and a requirement that the
legacy account is already correctly linked before creating default settings.
Changing only accepted fingerprints would not preserve every new invariant in
the candidate's replacement bodies. Prepare a separate compatibility change:

1. Pin the current shared definitions and their owning change record privately.
2. Reconcile the complete replacement behavior, including non-anonymous identity
   validation, unique preapproval, non-transferable UUID links, retained approved
   roles and the legacy linked-account postcondition.
3. Preserve the Commonplace-only path: paused by default, atomic reservation,
   verified completion, suspended membership and no unrelated app records.
4. Test the current hardened baseline and proposed replacement with synthetic
   identities, wrong/duplicate/conflicting links, old sessions, legacy users,
   concurrent signup and both permitted and denied Commonplace admissions.
5. Retain failure on unexpected source/binding drift. After review, install only
   in the G2 window, following all six CP migrations and verified owner setup.

No trigger fingerprint, SQL candidate, immutable migration or application code
was changed during this read-only G0 checkpoint.

## Remaining work and exit criteria

These are work groups within G0, not new platform phases. Preparation may run
alongside recovery; each hosted repair still needs its concrete approved scope.

| Order / owner | Next action | Acceptance before G0 can close |
| --- | --- | --- |
| A — Existing recovery operator / Akatsuki | Finish the ongoing Auth/FK reconciliation and attach the private final report; preserve Solitro's closed assessment | Exact snapshot and recoverable cutoff recorded; remaining Auth, effective grants/ownership, real A/B RLS, private Storage bytes/download and service/configuration recovery evidence reconciled. Any unresolved required result keeps NO-GO |
| B — Commonplace + shared Auth owner | Prepare the candidate 04 compatibility correction above | Reviewed semantics and synthetic/disposable-stack regression pass; no blind fingerprint update or rollback of shared hardening |
| C — Owning shared applications | Resolve remaining private-data policies, privileged RPC paths, role helpers, excess grants and compute entitlements; coordinate client cutovers | New Commonplace-only JWT has no unintended shared-app access; current users, jobs and saved work retain their intended behavior. Candidate 02's six tables and two Edge candidates are not complete coverage |
| D — Shared project operator | Record actual API/Auth/provider settings and recovery/configuration custody; reconcile the final current catalog and source versions | Private schemas excluded from exposure; intended signup/mailbox/callback behavior established; no unknown required dependency or unreviewed drift |
| E — Release reviewer | Review the consolidated evidence and exact next change scope | Explicit G0 decision recorded. Only then prepare the G1 installation window; do not advance automatically after merging documentation |

The immediate PC work belongs to the existing Akatsuki recovery, not a second
Commonplace restore. Candidate compatibility preparation can proceed separately
without hosted writes. Do not repeat already observed registry repairs; first
reconcile their current definitions and acceptance evidence with the owning work.

Admin Studio's user/section controls are already implemented in the platform.
They become usable after the protected foundation and staged app are activated;
learner registration and access testing follow the controlled signup checkpoint.
The personal main page is not evidence that those server controls are installed.

Existing progress, notes, bookmarks, downloaded packs and offline manifests are
unchanged. Keep the current study origins and data. Public static curriculum
remains public; already downloaded material cannot be remotely recalled.

## Verification boundary

This change contains documentation only. Validate repository links, whitespace
and unchanged offline-shell integrity, and record CI on the resulting PR head.
CI validates repository behavior, not hosted recovery or G0 clearance. Physical
iPad/Android acceptance, restored private downloads and hosted A/B tests were
not run in this checkpoint.

Provider references: [grants and RLS](https://supabase.com/docs/guides/api/securing-your-api),
[database versus Storage backups](https://supabase.com/docs/guides/platform/backups).
