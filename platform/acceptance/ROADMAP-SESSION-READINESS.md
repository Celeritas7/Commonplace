# G0 — Roadmap daily-session readiness

2026-11-26 (Japan). **Preparation only; no hosted changes or G0 clearance.**
Commonplace #112 and Logi Assembly #2 are merged. This work starts from
Commonplace `46e12f609fd0af81f499467bafa4ddd155679774` and reviews
Roadmap_advanced `8eda969197df3ba770ca4bad538d947984acaa55` (merged #17).
Existing restoration work remains deferred at its private resume checkpoint.

## Confirmed failure and prepared contract

Roadmap's daily checkbox first updates `roadmap_tasks`, then completes or undoes
`roadmap_study_sessions` in another request. A denied second write rolls the UI
back but leaves the first server write committed. Launch errors are swallowed,
and direct undo does not distinguish a matched row from a zero-row update.

Read-only General_apps metadata confirms candidate 03's two legacy function body
fingerprints still match. The task/session tables, timestamp trigger and
`roadmap_session_days` security-invoker view were inspected without reading real
records, Auth users or credentials. Exact synthetic shapes replace the reduced
fixture for the new acceptance tests.

[Candidate 08](../operations/general-apps/08_roadmap_daily_actions.sql) requires
01/revised 03 and pins the reviewed post-03 functions, table columns, owner policies,
owner constraints and timestamp trigger. It adds:

- `ga_roadmap_set_daily_task(task, expected_updated_at, done, day, request_id)`:
  one transaction updates the daily checkbox, legacy streak and owned session.
  The caller must be a verified non-anonymous Auth user and own the locked task.
  A foreign/missing task is denied; stale versions require review.
- Private owner/request receipts make an uncertain acknowledgement retry safe.
  A reused request ID with different intent fails. Replay rechecks current access
  and returns current owned rows, so an older reply cannot undo a newer action.
  The same original logical day is retained; the device's 4 AM convention stays
  intact. Receipt equality does not depend on the connection's timezone.
- A failed or silently suppressed task/session write rolls back both records and
  the receipt. Manual undo preserves launch history. Existing study-app proof,
  feedback, duration, original completion timestamp and legacy null-task sessions
  survive manual actions. No history is assigned to a new owner or deleted.
- The existing session pause also blocks new actions and replays. Candidate 90
  revokes the new RPC when installed, while still supporting a pre-08 backend.
  Revised 03 also checks verified non-anonymous identities in both existing RPCs. Their signatures and direct owner-scoped undo stay compatible.

The companion Roadmap PR prepares an **opt-in synthetic staging copy**. It uses
one atomic call for daily actions, retains a durable retry under the original
account, keeps the launch day aligned with its handshake, rejects empty success
responses, and exposes Retry/Discard controls. It updates only the acknowledged
task, preserving unrelated edits. An account change hides old in-memory views
and requests a reload without clearing data; pending actions stay with their
original owner. Original app sources, auth storage and existing saved work are
unchanged. Staging has its own auth key, a loopback dummy backend and no live hub
consumption. Preparation-only merges are excluded from the existing Pages deploy
trigger; runtime changes and explicit workflow dispatch retain deployment support.

## Acceptance and boundaries

Synthetic tests cover positive completion, failed/suppressed writes, uncertain
acknowledgements, repeated requests, stale tasks, direct foreign requests,
anonymous/unverified identities, pause, containment, proof/history preservation,
original-day retry, account switching, storage failure and schema drift. The
staging build is typechecked and built; a browser harness exercises its actual
store and recovery component. Disposable Supabase CI uses real JWT/PostgREST,
concurrent duplicate calls, proof arriving during a manual action, rollback and
concurrent pause. These are not hosted or physical-device results.

Before a real installation/cutover:

1. Resume the existing recovery checkpoint when scheduled. Retain original
   backups, identities, session rows and progress; do not repeat closed recovery
   checks or clear browser data.
2. Reconcile actual task/session and parent/child ownership before candidate 03.
   Historical mismatches must stop installation for the owner's decision.
3. Confirm every study-app caller of the existing handshake/RPCs, day semantics,
   background jobs, null-task records, and owning-client retry behavior. Preview
   uses synthetic data only; it is not evidence of those actual callers.
4. Review 01 → 03 → 08 and its matching client as one controlled change scope.
   Never deploy a client expecting 08 while only 03 is available. Review receipt
   retention/backup before pruning: deleting receipts can invalidate old retries.
5. Measure contention on realistic task histories. Compare exact installed
   definitions and test allowed/denied operations before enabling the client.
   The six Commonplace migrations, signup and learner enrollment remain on hold.

This bounded work does **not** certify the entire Roadmap application. Metadata
also shows eleven other Roadmap tables with owner policies, several task/child
links lacking composite owner constraints, and excess browser grants. Their
caller review and corrections remain in G0's shared-app group. The comparison
RPC, suggestion/hub flows, daily-reset behavior and other editors also retain
their own acceptance requirements. No broad revocation, data remapping or
unreviewed replacement of those workflows is included. Continue those remaining
shared-app safeguards, then Edge/provider evidence and the final G0 decision.

Commonplace study UI, six immutable migrations, progress and downloaded offline
packs are unchanged. Merging this preparation does not activate restricted sharing.
