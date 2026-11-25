# Commonplace migration and signup rollout order

**Preparation only. Hosted changes and learner enrollment remain on hold.**
This is the current ordering guide for **General_apps (`wylxvmkcrexwfpjpbhyy`)**,
checked against merged PR #102 (`516935e9b6a2a9586585940b3c1dedb75a601a0e`).
It resolves the dependency between shared-access repairs and the six Commonplace
migrations; it does not record a new hosted audit or authorize execution.

The order is: close recovery/shared-access prerequisites, install the six
migrations, verify/bootstrap the owner, install signup candidate 04 **paused**,
stage the application, then separately approve controlled signup and acceptance.
Registering a learner, granting section access and assigning published materials
remain separate administrator actions.

The [current G0 checkpoint](G0-READINESS.md) keeps deployment on hold and records
new shared-trigger drift: the [compatibility preparation](SIGNUP-COMPATIBILITY.md)
updates candidate 04, with hosted acceptance still pending. Reuse completed
recovery work; merging the checkpoint does not
clear G0 or authorize advancing to G1.

Remaining restoration verification is deferred at the user's request while code
development and synthetic tests continue. Retain the private resume checkpoint;
complete recovery before live database/Auth changes or learner release.

## Before any hosted change

Record the selected project, source commit, exact file hashes, current migration
history, installed definitions/grants, approved change scope and recovery point.
Recheck the [shared-project inventory](shared-project-catalog.sql), actual exposed
API schemas, Auth/provider configuration and the affected applications. Preserve
the seven existing `commonplace_*` tables, existing Auth UUIDs and current study
installations. Technical is not the Commonplace target.

Use the [readiness review](GENERAL-APPS-REVIEW.md) and private recovery evidence to
identify what is already complete and what still needs proof. Reuse completed
restore work; attach the exact restore-input SHA and remaining Auth/FK, grants,
ownership, A/B RLS, private Storage bytes/download and server-configuration results.
Archive integrity or matching public-table counts alone do not close recovery.
Keep raw inventories, dumps, personal identifiers and secrets out of this repository.

The current repair candidates do not cover the whole shared API. Resolve the
remaining owning-app policies, role helpers, client cutovers and Edge entitlement
findings before issuing a new learner JWT. A private Commonplace schema, paused
Commonplace signup or a separate website origin does not isolate unrelated APIs.
The loopback-only acceptance runner must never be pointed at General_apps.

## Shared repairs are not a four-file migration sequence

All paths in this table are under [operations/general-apps](../operations/general-apps/README.md).
Their numbers do not authorize applying the directory in one batch.

| Candidate | Required ordering and evidence |
| --- | --- |
| `01_access_foundation.sql` | After shared-project/recovery approval and schema review; before its dependent policy, Roadmap and Edge repairs. Populate only verified owner mappings and explicit grants. It performs no automatic backfill. |
| `02_legacy_policy_guards.sql` | After 01, verified mappings, all required client cutovers, policy/grant baselines and Eagle membership including a confirmed writer. Unresolved mappings or unrelated-app regressions stop enforcement. |
| `03_roadmap_session_owner.sql` | After 01, reconciliation of historical task/session ownership, both reviewed RPC fingerprints and owning-client acceptance. It need not precede 02 merely because of a rollout table. |
| `edge/` | After the foundation, JWT-capable clients, explicit route grants/budgets and the owning app's release review. These are the legacy paid routes, not Commonplace's two file/lease routes. Use mock providers for local testing. |
| `04_commonplace_signup.sql` | **After all six Commonplace migrations and verified owner setup below.** It changes shared Auth trigger routines and must have its own approved window and legacy-signup regression checks. Install it paused. |
| `90_containment.sql` | Incident containment, not an installation step. Its separately committed stops affect signup, two legacy Edge routes and Roadmap. Use only the approved incident scope. |

Candidate 04 does not install candidates 01–03 or repair the remaining shared
surface. Its SQL foundation checks are distinct from the broader release gates.
In the older R1–R5 roadmap, defer 04 out of R3 until the six-migration/owner part
of R4 is complete. Preparing any of these files locally is permitted while hosted
execution remains on hold.

## Exact Commonplace migration order

For a new platform installation, apply these immutable files from the same
reviewed commit, one at a time in this order. U4, U5 and U7 are application phases,
not missing migration files. Candidate 04 is not a seventh automatic migration.

| Order | File under `platform/supabase/migrations/` | Foundation supplied |
| --- | --- | --- |
| 1 — U1 | [20261124124049_u1_access_foundation.sql](../supabase/migrations/20261124124049_u1_access_foundation.sql) | UUID memberships, designated owner, section grants, study records, RLS and audit |
| 2 — U2 | [20261124132007_u2_admin_studio.sql](../supabase/migrations/20261124132007_u2_admin_studio.sql) | Admin directory/registration, revision tracking and reviewed access saves |
| 3 — U3 | [20261124133735_u3_learning_profiles.sql](../supabase/migrations/20261124133735_u3_learning_profiles.sql) | Professional profiles, groups and administrator profile operations |
| 4 — U6 | [20261124151240_u6_material_library.sql](../supabase/migrations/20261124151240_u6_material_library.sql) | Versioned materials, publication/assignment, private bucket guards and file-service contracts |
| 5 — U8 | [20261124163801_u8_offline_sync.sql](../supabase/migrations/20261124163801_u8_offline_sync.sql) | Revision-based synchronization and authorized offline snapshots |
| 6 — U9 | [20261124235058_u9_explicit_mutation_lock.sql](../supabase/migrations/20261124235058_u9_explicit_mutation_lock.sql) | Explicit singleton lock updates compatible with PostgREST `safeupdate` |

For an existing or partially installed platform, reconcile history **and actual
definitions** first. Do not replay the six files, change historical SQL, reset the
database or repair migration history merely to make a command proceed. Record
which transactions committed, stop on an unexpected state, and review the exact
remaining change separately. Do not rerun U2/U9 after candidate 04: they replace
`cp_admin_register` with the earlier contract, losing its signup-request routing
checks. Candidate 04 is also not a replayable upgrade script; an already-installed
or drifted version needs an explicit reviewed delta.

## Execution checkpoints and stopping criteria

These are future operator checkpoints, each requiring its approved scope. Passing
a repository test or merging this document is not approval to advance.

| Checkpoint | Work after approval | Required result before advancing |
| --- | --- | --- |
| G0 — Recovery and shared access | Close the prerequisites above and apply only independently approved shared repairs, with affected-app regression evidence. | Recoverable checkpoint and current shared/API/provider evidence recorded; no unresolved new-JWT exposure. |
| G1 — Six migrations and owner | Apply the exact chain above. Run the shared inventory and [Commonplace catalog](catalog.sql). Verify the user's existing confirmed Auth UUID; a trusted operator bootstraps it once if no platform owner exists. | Six-file baseline reconciled; catalog has zero findings; `cp_private` and any installed `ga_private` remain outside exposed schemas; the sole owner is correct and real non-admin calls are denied. An existing owner must match, never be silently reassigned. |
| G2 — Install signup paused | Capture the four shared Auth trigger definitions, bindings, timing and ACLs; install [candidate 04](../operations/general-apps/04_commonplace_signup.sql) only after G1. Its transaction checks the reviewed foundation and trigger fingerprints. | Private singleton exists with `enabled=false`; administrator status RPC returns `paused`; structural catalog passes again; existing-user and separately approved legacy-signup behavior is preserved. |
| G3 — Stage the application | Build/review the separate package. Configure only the approved staging origin/callback and deploy Commonplace's `material-files` and `offline-lease` routes. Publish only `public/`. | Administrator sign-in/status and route configuration are verified; source/live production activation remains unchanged; signup still reports paused. Learner file/lease authorization is tested at G5, after controlled registration. |
| G4 — Controlled signup window | Approve tracked test identities and the exact onboarding/provider path. Prepare their requests while paused. Only a trusted operator may enable the Commonplace private control for the approved window. | Fresh admin status reports `enabled`; only an approved, unexpired request can create a Commonplace-only Auth identity; original mailbox ownership is verified; no unintended legacy role/profile/settings or automatic CP membership appears. Unexpected result: close admission and stop. |
| G5 — Register and test access | Complete the reserved verified Auth UUID as a suspended learner. Separately review/save active status and explicit section leaves, publish/assign test materials and run the [hosted/device matrix](README.md). | A/B isolation, default denial, direct URLs, revocation, private files, progress, offline/account switching, backup restore and existing personal study pass. Required shared-app regressions and rollback rehearsal pass too. |
| G6 — Learner release | Review the completed evidence and separately approve the actual learner/production activation scope. | All release gates accepted; actual email supplied privately; reviewed permissions/profile/materials; no unresolved BLOCKED or unknown result. |

Close admission and verify the paused state when the approved test window ends,
including after a successful test. A fixture signup window does not authorize
leaving enrollment open; the later release must specify its own admission scope.

A fingerprint mismatch, missing table/lock, partial installation, privilege drift
or failed legacy regression is a stopping point. Do not disable triggers, weaken
fingerprints, grant broad access or turn off `safeupdate` to continue. A zero-row
catalog result checks structure, not function semantics, provider behavior or
device recovery; retain the corresponding runtime evidence as well.

## Signup, registration and study access are separate

- **Existing confirmed identity:** no new Auth signup is needed. After the same
  release gates, **People & access → Register a learner** resolves the verified
  UUID and starts it suspended with no section grants. An outstanding reservation
  routes through **Signup requests** instead; `CP001` is not a reason to bypass it.
- **New Commonplace-only identity:** **Prepare 24-hour request** records an email
  admission while signup may remain paused. Creating the Auth identity reserves
  its UUID atomically. After confirmation, **Register suspended learner** checks
  that same UUID, original email, expiry and displayed revision. It grants no
  study sections. Identity changes, expired or withdrawn requests require review.
- **Study access:** only a later administrator save activates the learner and
  grants explicit section leaves. Published assigned material is a separate
  requirement. For Excel-only access, authorize `office.excel` and no other leaf;
  a professional profile or Office Work hub label is not a permission grant.

The Commonplace control is not Supabase's project-wide signup/provider setting.
Do not alter global Auth settings to work around a paused/unavailable panel or
add a Commonplace learner to another application's role registry to bypass its
gate. Existing logins and separately approved legacy signup follow their own
rules. **Signup enabled** describes only the Commonplace admission flag; the
provider must still pass its own acceptance. **Unavailable** means status could
not be verified (including absent RPC/control), never permission to enroll.
The status RPC is read-only and requires an authenticated active administrator;
the UI has no enable switch.

## Package boundary and recovery

The [staging builder](HOSTED-STAGING.md#prepare-a-reviewable-package) copies only
the six CP migrations, the two Commonplace Edge graphs and review inputs into
`server/`. It excludes the `operations/general-apps` candidates, including 04 and
90. Prepare those separately at the same reviewed commit with explicit hashes;
do not move them into automatic migration discovery or a public website folder.
Neither building the package nor merging its source applies SQL or opens signup.

Legacy static curriculum/repository files remain public. Restricted learners must
use the authorized learner/material interfaces; hiding links or adding the new
login page does not make those legacy files private.

To stop new Commonplace admission, an authorized operator closes the existing
control and verifies the saved state plus a denied new reservation. An admitted
transaction can finish before the pause commits because signup holds a lock on
the control row. Pausing does not withdraw an existing reservation, cancel its
completion, revoke a membership or end an existing login. Withdraw the particular
request and/or suspend/revoke its learner through the appropriate admin controls
when that is the approved scope. Preserve their UUID and saved work.

Use [component containment](../operations/general-apps/README.md#signup-behavior-and-containment)
for a scoped incident. Candidate 90 is for a full shared incident and must run
standalone without an outer transaction; inspect each committed outcome and any
final incomplete-containment error. Missing components are not successful stops.
Do not use broad containment as a routine migration rollback.

For an application rollback, disable the new route/configuration while retaining
database rows, audit, Storage, device notes, queues and offline packs. Do not drop
schemas, replay old trigger bodies, delete accounts or clear website data. Already
downloaded/exported content cannot be recalled from a disconnected device.
Keep the same staging origin/namespace for recovery, reconcile saved edits and
resume only the reviewed compatible build after its approval. The existing
personal study environment remains in place throughout this preparation.
