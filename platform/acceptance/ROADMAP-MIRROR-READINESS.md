# G0 — Roadmap task mirror delivery preparation

Reviewed 27 November 2026 (Japan). Follows Commonplace #135 / Roadmap #26,
merged as `6576bdb3f85c823137b71f8a3bdf270c5e9b7e68` /
`51a1a65ae2938ea33ca7476250dcafe916d34384`.

This is one bounded G0 work group, not a new rollout phase or a completed G0.
**Hosted changes, learner enrollment and deployment remain on hold. Restoration
remains deferred at its existing checkpoint.** General_apps
`wylxvmkcrexwfpjpbhyy` is the eventual backend; this work uses synthetic isolated
fixtures only. No production SQL, Auth settings, identities or study files change.

## Prepared server boundary

Candidate `18_roadmap_mirror_delivery.sql` requires 01/03/15 and the pinned task
catalog/helper. It installs an empty private `roadmap_mirror_access` gate. Even
verified users are denied until an operator reviews their original hub pairs,
including links whose local tasks are already gone. This is a gate for the new
mirror RPC only; it does not close existing direct writers or authorize admission.
There is deliberately no browser operation to adopt a title or choose an owner.
Review the complete `wf → rm` source address, original authenticated owner, target,
last sequence/payload and deleted state before seeding private pairs and enabling
the gate in a separately approved installation. Unsupported existing project tags
or inconsistent links require reconciliation; do not silently remap them to lang/dx.

`ga_roadmap_receive_task` locks verified Auth, control, review access and the owner's
creation/structure transaction lock. It atomically creates an unambiguous project
folder and task, reserves their UUIDs, records the exact JSON source pairing and
saves the owner/sequence receipt. Ambiguous/untagged legacy folders and unpaired
mirror rows fail closed. Client-supplied owner IDs are never accepted. Private
receipts/pairs have RLS with no API grants. The containment script includes the
optional RPC. Existing tasks, notes, logs, completed proof and offline files are
not migrated or deleted by installation.

Sequence identity belongs to the original owner. Reusing a sequence with different
address/payload is rejected. Earlier events are recorded without changing a newer
task; replay returns current rows, not a historical snapshot. Pairing survives
local deletion and prevents recreation. A first-seen source tombstone creates no
folder/task and remains suppressed on later delivery. Source deletion of an
existing mirror keeps the row and marks it orphaned; a newer active source may
reactivate that retained row, but cannot recreate a locally deleted row. Only
source-managed title/completion/tags change; other local fields and history remain.
Addresses use full JSON equality; a compact hash is only an index and collisions
fail review. Required address strings, safe positive sequences, UTF-8 byte limits
(4 KiB address, 16 KiB payload, 4 KiB title) and a 5,000-task creation cap are checked.
Replay remains possible at capacity. Pause/review revocation also denies replay.

## Isolated owning client

Roadmap changes only `access/`; its pinned builder transforms ignored copies of
`rmHub.ts` and the classic adapter. Root source/public files, deployment, Auth keys,
legacy outbox, pending-done/reply cursors and offline packs stay unchanged.
`bootHub` stays disabled. New owner/sequence recovery slots persist before send.
An uncertain result has a visible retry with the exact original payload. No token
is saved; the RPC captures the original account's JWT before sending. Epoch and
saved-byte checks reject late A→B→A responses and competing-tab cleanup.

Only validated current rows are applied. In-flight task mutation guards and target
comparison preserve newer local edits. Pair lookups use canonical full JSON and
reset on account changes. Legacy unscoped state is not attributed to the signed-in
user. A successful local retry is not a claim that the hub acknowledged delivery:
the next consume callback replays the server receipt and links the same task.

## Hub deletion and ordering remain activation blockers

Read-only source review of Akatsuki `sql/akatsuki_hub_hardening_R017.sql` found that
acknowledgement writes link sequence without a newer-sequence predicate and uses
`payload.deleted`. Roadmap's WF task path uses `payload.del`. The classic client's
`orphan()` supplies its own app (`rm`), whereas the intended source pair is `wf`.
These are repository observations, **not verification of the hosted contract**.

The isolated adapter rejects wrong senders and malformed tasks, defers failures,
and waits for visible application before acknowledgement. Stale mirror callbacks
return no pair, avoiding an obvious old-link rewrite. Deletion callbacks retain
the local orphan and **defer hub acknowledgement** rather than swallowing an orphan
failure. They do not call the unreviewed orphan helper. This deliberately blocks
stream progress through that event until the shared contract is resolved. It is
not an operational production consumer. Cross-device ack ordering, sender/route
attestation and captured-account consume/ack/leader lifecycle still need joint hub
acceptance; the local RPC cannot prove that a payload originated in Weekly Focus.
No registration, route, outbox ownership or live compatibility is invented here.

## Acceptance and next work

Synthetic SQL tests cover no-change installation, default denial, atomic pairing,
full addresses, replay/conflicting sequences, stale ordering, origin/local deletion,
UTF-8 limits, capacity, legacy ambiguity, rollback, private data and revocation.
Client/controller tests cover persistence, quota/corrupt storage, duplicate callbacks,
foreign/invalid confirmations, account epochs and competing tabs. Browser tests run
the actual copied handler and recovery component, retaining history/offline bytes
and displaying imported markup as text. Classic adapter tests exercise real consume,
reject/defer and acknowledgement calls. Three disposable Supabase groups add real
synthetic JWT concurrency and committed ownership/review/pause/Auth lock waits.
Record actual CI results on the paired PR heads, not as hosted acceptance.

Next bounded work group: **task.done requests and replies** — persist before send,
request identity, cursor/order and visible-application recovery. Then address
`session.completed` and actual study callers, shared-hub ordering/contracts,
account-scoped outbox/pending/reply/check-in/leader recovery and legacy writer
cutover. The broader G0 admission, deferred recovery, physical-device and final
go/no-go gates remain open. Merging this preparation does not enable restricted
learner sharing or authorize production rollout.
