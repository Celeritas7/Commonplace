# General_apps read-only readiness review

**2026-11-25 (Japan). Review complete; live learner activation remains NO-GO.**
Baseline: `eb194164e321437b68462df88d2af107f05fad3e` (PR #95 merged).
General_apps is the confirmed backend. This checkpoint does not select a new
project, apply the six migrations or activate the platform.

## Scope and evidence

Reviewed the live public/Storage catalog, effective browser grants, policy modes,
view options, Auth-trigger definitions and helper bodies, callable definer
functions, all 15 deployed Edge sources, advisors and migration inventory.
Checked existing private database, roles and Storage backup artifacts. No live
application rows, credentials or environment-secret values were queried. No
hosted mutation, signup, paid-function invocation or live exploit was attempted.

This public report omits affected third-party application object names, policy
expressions, backup locations and hashes. A separate private operator report
records the concrete findings and recovery identities. Do not publish raw catalog
output, deployed function bodies or backup bytes in the repository or staging
package.

| Check | Result | Meaning |
| --- | --- | --- |
| Existing Commonplace tables | Reviewed | Seven tables have owner-based row policies; anonymous identities do not satisfy the owner comparison |
| Public table RLS | 302/302 enabled | Necessary, but permissive policies elsewhere still need correction |
| Public views | 37/37 use security invoker | Underlying permissions remain relevant |
| New platform deployment | Inactive | No `cp_*` relations/functions, `cp_private`, `cp-materials` or either platform Edge route; both source activation configs remain null |
| Shared Auth onboarding | BLOCKED | A global signup gate depends on another application's role registry and creates cross-application records |
| Shared API authorization | BLOCKED | Overbroad policies and a definer ownership gap affect the trust boundary of a new learner JWT |
| Shared Edge entitlement | BLOCKED / review | Some handlers verify identities; a legacy public-client shared secret is not a user authorization boundary |
| Archived backup integrity | PASS within stated scope | Database, roles and Storage archive hashes match sidecars; all 409 archived Storage objects match their size/hash manifest |
| Exact backup restore provenance | UNRESOLVED | Earlier restore evidence has not been tied to the exact database archive verified here |
| Auth/RLS and private-file restore | PENDING | Integrity checks and previous table comparisons do not establish runtime recovery |
| Gateway/Auth configuration | UNVERIFIED | Current exposed schemas, Google/redirect settings and secret recovery were not independently attested |

## Findings that block learner activation

1. **Signup and application membership are coupled.** Four Auth insert triggers
   enforce a shared email registry, link its identity and create other app
   records. A new Commonplace-only learner cannot simply sign up and then receive
   `cp_*` membership. Adding them to another app's role registry merely to satisfy
   that gate risks unintended access. An existing approved role is retained in
   the observed normal path; the default-role code does not mean every signup
   becomes an operator. Design scoped onboarding and preserve existing users.
2. **A shared JWT reaches more than Commonplace.** Some other applications' tables
   combine effective browser grants with permissive unqualified policies. Public
   curriculum may intentionally be shared; user notes/progress require separate
   owner/application checks. Commonplace RLS cannot fix unrelated APIs. Review
   each affected application and its consumers before targeted changes.
3. **Function authority needs path-by-path checks.** One privileged UPSERT checks
   neither the target task owner nor the existing conflicting row owner. An
   owner default for new rows does not protect that conflict path. Callable
   trigger routines are not ordinary RPC entry points: the catalog now records
   return type/trigger status and Auth trigger timing to avoid false conclusions.
4. **Edge gateway flags are not authorization results.** All deployed functions
   have gateway JWT checking off, but many validate users, server secrets or
   scoped tokens in their handlers. A legacy client-shared-secret route still
   lacks a verified user boundary, and generic authenticated routes need app
   entitlement review before enrolling learners. Do not invoke paid or messaging
   handlers to test this during a read-only review.

The existing Commonplace owner policies are a positive finding, not a hosted
acceptance pass. Six legacy tables also grant more database privileges than their
REST use needs; plan least-privilege cleanup. A TRUNCATE grant does not demonstrate
a direct REST truncation route. Advisor counts are leads, not exploit counts;
blanket grant revocations or disabling all signup triggers would risk other apps.

## Recovery reconciliation

The November 22 backup set was found and inspected privately. The database dump
has a valid custom-archive header and matches its SHA-256 sidecar; its separate
TOC records Auth identities, all seven legacy Commonplace tables, policies,
functions, grants and Storage metadata. The roles export also matches its
sidecar. Neither finding proves a complete restore or safe role replay.

The Storage archive passes ZIP integrity checks. Every one of its **409 objects,
27,273,176 bytes** matches the saved manifest; before/after inventories agree.
It represents seven buckets, including three empty buckets. Current live bucket
counts/sizes agree, but live per-object bytes were not rehashed. The archive
records that an actual restore is pending and that it is not an atomic snapshot
with the database backup.

Earlier Solitro recovery evidence reported 302 matching public tables and 20,889
rows. Preserve that work. Its recorded database file size differs from the
currently archived file. First pin the SHA-256 of the exact input used by that
restore and attach its report; do not label either copy corrupt or automatically
repeat all completed work. TOC line counts and entry counts are different units.
Then close the missing Auth identity/FK, RLS runtime, grants/ownership, private
Storage download and server-configuration recovery checks on an isolated target.
No restore was performed in this checkpoint.

## Ordered next work and acceptance

| Step | Work | Exit criteria |
| --- | --- | --- |
| R1 — Pin recovery evidence | Connect the previous restore report to an exact database SHA; identify recoverable Auth/config/Storage state | Exact archive provenance recorded; isolated recovery proves Auth/FKs, ownership/grants, A/B RLS and private downloads; no raw secrets in reports |
| R2 — Prepare shared access repairs | In each owning app, define owner/application policy boundaries, scope onboarding, fix identified definer paths and Edge entitlement | Reviewable migrations with local fixtures for anonymous/unregistered/A/B/admin, spoofed metadata, conflict paths and existing-user regression; explicit rollback and dependency plan |
| R3 — Apply reviewed prerequisites | Take a fresh recovery checkpoint, then apply only the approved targeted changes | Hosted catalog/advisors reconciled; intended shared/public data still works; unrelated app and scheduler tests pass |
| R4 — Stage Commonplace | Verify owner UUID, separate HTTPS origin/redirect, signing keys and exposed-schema settings; apply six migrations and two routes in order | Default-deny learner; verified admin; `cp_private` unexposed; private material access and audit logging verified; production study still works |
| R5 — Hosted/device pilot | Execute the existing U9 matrix with tracked learner fixtures and real devices | A/B isolation, direct URLs, publication, revocation, Google return, iPad/Android offline reopen and safe switching pass; rollback demonstrated |

R1 and preparation for R2 can proceed together. Production changes and learner
enrollment remain separate from this review. The learner's real email is still
unspecified. No cross-project identity or progress transfer is required.

## Reproducible local evidence

The follow-up [R1/R2 preparation package](../operations/general-apps/README.md)
now contains guarded SQL/Edge candidates, local recovery identity capture and
regression checks. R1 still needs the exact Windows restore-input identity.
R2 client cutovers, live mappings and the remaining shared-app surface are open;
no candidate was applied to General_apps. The package remains outside automatic
migration discovery and normal staging artifacts.

`tests/shared-project-review.test.mjs` uses synthetic identities, names and records
in isolated PostgreSQL to reproduce owner-versus-unrestricted policy behavior,
signup-trigger dependencies and a privileged UPSERT conflict path. Passing these
tests demonstrates the reviewed semantics; it does **not** mean hosted problems
were fixed. `shared-project-preflight.test.mjs` verifies inventory coverage,
including trigger classification and timing. Exact-head CI results belong in the
PR; no synthetic result substitutes for hosted or physical-device acceptance.

Related: [target checkpoint](GENERAL-APPS-TARGET.md),
[U9 readiness](../../docs/admin-platform/U9-READINESS.md),
[hosted staging](HOSTED-STAGING.md),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Storage access](https://supabase.com/docs/guides/storage/security/access-control),
[definer execution advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
