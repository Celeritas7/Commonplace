# G0 — Roadmap structural changes and deletion recovery

2026-11-27 (Japan). **Preparation only; G0 remains open.** Commonplace #131
is merged at `21ed39cad8805395de40db80b70d4c2e6b06a6a3`; Roadmap #24 is merged
at `35f9cb51eaa3cab32789e5ae59cf380294ff8b91`. This is the next bounded G0 work
group, not a new rollout phase. General_apps is the intended backend. Hosted
SQL/Auth/deployments, signup and enrollment remain on hold; restoration remains
deferred at its existing checkpoint. No live catalog or personal data was read.

## Problem and prepared behavior

The old task store optimistically moves/deletes rows, then restores an entire
tree after failure. Reorder sends one independent update per sibling. Inbox's
new-folder workflow inserts the folder before moving its tasks; an uncertain
reply can leave partial work or create another folder. Inbox also commits a
timed deletion when the view unmounts. Deleting a task cascades into its study
sessions, including recorded proof and feedback.

[Candidate 16](../operations/general-apps/16_roadmap_structure.sql), after
**01 → 03 → 09 → 15 → 16**, prepares
`ga_roadmap_structure(p_payload, p_request_id)`. It does not change the six
Commonplace migrations, existing public session API or legacy direct writer.

| Area | Contract |
| --- | --- |
| Identity | Verified, non-anonymous Auth UUID and active Roadmap control, locked through the transaction |
| Move/reorder | Explicit task UUIDs, original timestamps/titles, final owned group parents and integer positions; every requested change commits together |
| New folder | Explicit folder UUID, title, tags and optional owned group parent; folder and moves share one transaction |
| Deletion | Exact current subtree, including every descendant; changed/missing/foreign targets and Weekly Focus mirrors reject the whole operation |
| Study history | Sessions, daily logs, comparisons and suggestions retain their rows under the same owner with a null optional task link; proof, feedback and notes stay intact |
| Resources | Task resources leave the active view, but full original rows are retained privately with the deleted task snapshots |
| Retry | Same owner/request/payload; moves return current owned rows, deletion replay never deletes again or recreates anything |
| Limits | 1–100 distinct targets (or folder-only creation), 48 KiB UTF-8 client envelope, 64 KiB server JSON, owner tree at most 5,000 rows, deletion history at most 1 MiB; no truncation or partial splitting |

The server checks current versions after row locks, refuses cycles and invalid
parents, and serializes this endpoint with candidate 15. New descendants and
ownership changes committed while waiting are rechecked. Existing direct writers
do not participate in the owner advisory lock; live cutover must close/reconcile
those paths. This additive endpoint is not an application-admission allowlist.

Installation pins all six affected tables, owner policies, constraints, reviewed
triggers, task inbound references and the candidate 15 helper. Unexpected drift
stops installation; no source records are modified by installation. Moves or
history/receipt failures roll back all changes, including folder creation and
UUID reservations. Unsupported result rows are refused before commit.

Private receipts contain exact task and linked-record snapshots. They have RLS
and no public/anon/authenticated/service-role table privileges. Removed UUIDs
remain reserved against reuse through candidate 15. Review retention, erasure
and recovery custody before installation; never prune identities while retries
may exist. This evidence is **not a restore API or a tested restoration**.
Candidate 90 optionally revokes the new RPC even when pause containment fails.

## Isolated owning-client behavior

Roadmap's pinned staging builder changes only the ignored loopback fixture.
Root source, public assets, production auth keys, deployment and hub protocol are
unchanged. Moves, reorder and new-folder moves wait for confirmed rows instead
of optimistically changing the tree. The desktop and mobile folder forms retain
failed names; only confirmation associated with that form clears it. Another
saved request cannot be silently retried as that form's work.

Delete now prepares an account-owned review without sending it. **Tree change
recovery** lists the exact titles, including descendants. **Cancel deletion** is
a safe local undo before any attempt. **Confirm deletion** first durably records
that sending has begun. An attempted/uncertain deletion exposes Retry and
explicit Discard, never a misleading Undo. Discard cannot undo a committed
server change and requires a current-tree reload before more writes. Leaving
Inbox does not flush its deletion; unrelated Keep timers retain their existing
separate behavior. Task-resource removal and legacy log deletion are not given
new undo/restore semantics by this work.

Each saved request uses `rm-structure-v1:<owner>:<request>`. Original account,
request, payload and version preconditions survive reload. Separate tab slots,
byte checks, account epochs, exact acknowledgements and saved-byte checks prevent
silent overwrites and late cleanup. The existing safe reload on account change
is retained. Nothing clears website data, queues, notes or offline packs.

Only acknowledged target rows are applied. Unrelated edits and linked study
history remain. A newer target edit or newly visible local descendant is retained
for review rather than overwritten. Pending structural work blocks interacting
study actions, creation, metadata, resets, log/comparison saves and resource
changes before a new intent is prepared. Earlier legacy completion/resource
rollback is allowed to settle before structural preparation. These guards are
client recovery coordination, not security; server checks remain authoritative.

## Acceptance and remaining gates

Synthetic SQL/controller/browser tests cover unchanged installation, field/count/
UTF-8 limits, stale/foreign/mirrored targets, cycles, exact subtree review, durable
attempt state, duplicate clicks, uncertain reply/reload, folder deduplication,
explicit cancellation, failed/suppressed history or receipt writes, account
changes, cross-tab evidence and conflicting local edits. Browser tests drive the
actual copied Inbox, mobile MoveSheet, Group deletion and reorder handler.

Four disposable Supabase groups add real synthetic JWTs, concurrent duplicate
moves/deletes, ownership/version waits, a newly committed child during deletion,
retained notes/proof/resources, receipt rollback and committed pause/verification
revocation. CI results belong to the reviewed PR head. Physical iPad/Android,
actual external callers and hosted tests remain open.

Next bounded G0 group: **suggestion and hub delivery readiness**, followed by
actual study callers and account-scoped local-state acceptance. Remaining legacy
writers (including general completion, resource/log deletion and external import)
need explicit caller/cutover acceptance, not assumed coverage from this endpoint.
Shared-app admission, API/Auth/provider evidence, deferred recovery and the final
G0 decision still precede hosted rollout. Merging this preparation does not make
restricted learner sharing available.
