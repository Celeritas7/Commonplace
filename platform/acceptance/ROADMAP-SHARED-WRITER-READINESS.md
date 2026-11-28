# G0 — Shared document and place versions

Prepared 28 November 2026 (Japan), following merged Commonplace #151
(`bf20eef991f55ba21d98b429e770304680d3a7f7`) and Roadmap #33
(`34cfab4be9f98f101fd3056a50747baaeee10c8b`). Implementation starts from
Commonplace main `a5763c7` (also includes Excel #152). This is a bounded
preparation phase. G0, hosted installation and learner enrollment remain on
hold. Restoration remains deferred.

## Problem and prepared behavior

The copied document SDK performs a blind upsert or delete-mark update. Its
last-value cache has no server version. Legacy place RPCs likewise edit or retire
a place without checking the version the user reviewed. A delayed save can
therefore overwrite a newer document or place change.

Candidate `23_roadmap_shared_writers.sql` adds two owner-authorized RPCs:

| API | Contract |
| --- | --- |
| `ga_roadmap_shared_read(target)` | Returns the exact owned row, its opaque whole-row revision and complete target identity. An absent row has a null revision. |
| `ga_roadmap_shared_write(target, expected_revision, change, request_id)` | Checks that reviewed revision under a target lock. A mismatch returns current data and a conflict without writing. A successful mutation and its private immutable receipt commit together. |

Documents are limited to Roadmap's `task_tags/rm` items and
`roadmap_now/suggestion` scalar. Existing rows must belong to `rm`. Put and
remove are explicit operations. Removal retains the previous value in a
tombstone, including when removing an absent item; a stale null-version create
cannot restore it.

Place creation requires an explicit stable ID and a reviewed absent target.
Edit accepts label, class, ordering and additional aliases. Renaming retains old
names; coordinates, radius, creator and creation time are preserved. Retirement
and restoration are separate explicit operations. There is no implicit restore
or hard delete. Colliding live names/aliases are refused. The prepared place
class list is the pinned R023 list; changed vocabulary needs separate review.

The revision includes every row column, including sequence, tombstone,
coordinates and timestamps. Short relation locks serialize these operations with
legacy writers too, including missing-row creation and place-name collisions.
This is deliberately conservative for small shared document/place tables;
contention can produce a retryable refusal. Finer locks require an inventory and
coordinated migration of all writers.

An exact request retry returns its original application revision alongside the
**current** owned row. It never applies the old change again, restores a removed
row, or hides a later retirement. Reusing a saved request UUID with changed identity,
expected revision or nested content is refused. Private receipts are retained.

## Review gates and limits

The per-owner document/path or place gate starts empty. Every read, write and
receipt replay rechecks it, verified nonanonymous identity and the shared pause.
New private tables have no client grants or policies. Containment revokes both
RPCs without clearing data or recovery.

Installation pins the source-derived state/place catalog, policies, trigger and
slug function. Unexpected drift aborts the transaction. The document trigger
changes only to qualify its sequence and use an empty search path, so it works
under the new definer. App ownership and clock semantics remain. No historical
user rows are backfilled. The synthetic source is recorded in
`tests/roadmap-shared-writer-source.json`.

The APIs provide owner-authorized version checks. An app name does not prove
independent sender authority. Existing shared-table grants and legacy document,
place, location and restore RPCs are **not revoked or certified** here; they can
still change current data after a prepared save. Global writer safety needs their
coordinated cutover. Passing this preparation does not authorize installation.

## Prepared client and recovery

Only Roadmap `access/` changes. Its synthetic copied hub exposes explicit
`reviewShared`, `prepareShared`, `saveShared` and `confirmShared` operations.
Legacy implicit `put/remove/addPlace/editPlace/retirePlace` calls remain gated:
they cannot invent a reviewed version. Automatic suggestion generation, banner
and tag guesses stay off. Production source and deployment are unchanged.

The account-bound client persists the full intent before sending. Web Locks
serialize per-account changes across tabs; unsupported browsers pause saving.
Each complete target has an atomic saved slot. Nested-value mismatch, quota
failure, altered bytes, malformed server reply or A–B–A account transition
retains recovery. No legacy storage is adopted or cleared.

Recovery renders the current confirmed row before closing a successful save.
Conflicts show the latest value and original draft. Reapplying is an explicit
user action with a **new** request UUID and the reviewed revision; another
intervening edit conflicts again. Keeping current data sends no mutation. Both
decisions retain the old intent in visible saved draft history. History is
bounded and never silently pruned; storage refusal retains the pending draft.
Recovery is not a server rollback or a cross-device cancellation.

## Evidence and next phase

Node/PGlite tests cover replay, nested conflicts, tombstones, retained place
coordinates/aliases, retirement/restoration, default denial, private grants,
receipt rollback, catalog drift and containment. Client tests cover exact
snapshot/result proofs, local persistence, explicit resolution, account changes,
quota and two-controller contention. Browser tests use the copied hub, prepared
controller and recovery component, including lost replies through reload,
render-before-clear and two real tabs. Disposable Auth/Postgres tests add
concurrent retries/competing versions and committed legacy-edit, access,
verification and pause lock waits. Final-head CI is the acceptance evidence.

Next bounded phase: inventory remaining live shared writers and define the
sender-capability or explicit owner-authorized policy before coordinated caller
cutovers. Then complete physical-device, provider/recovery and final G0 evidence.
These preparations do not authorize G1 or restricted learner sharing.
