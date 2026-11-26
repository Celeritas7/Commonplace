# G0 — Roadmap daily-reset recovery

2026-11-27 (Japan). **Preparation only; G0 is not cleared.** Commonplace #123
is merged at `83aa5ee4fe57565d7e26fd2ae7c997655b5ade2d`, including the separately
merged Excel #122. Roadmap #20 is merged at
`24b53aaadcac624f5a6f1e8d3694fa74f0d88f42`. General_apps remains the backend.
Hosted changes/enrollment remain on hold. Restoration remains deferred at its
existing private checkpoint; this work does not repeat it.

## Confirmed failure

The original Roadmap `runDailyReset` first unchecks every stale daily task locally,
then sends independent task updates. Its catch leaves the optimistic values in
place. The next minute's filter requires `done`, so a failed task no longer
qualifies for retry. Partial saves can leave different server/device checkboxes,
and the direct updates have no version precondition against a newer completion.

[Candidate 12](../operations/general-apps/12_roadmap_daily_reset.sql) prepares
`ga_roadmap_reset_daily_tasks(tasks, day_key, timezone, request_id)` after 01/03/08.
The original APIs and source runtime remain unchanged until a coordinated cutover.

| Rule | Prepared behavior |
| --- | --- |
| Identity | Current verified, non-anonymous Auth UUID, active Roadmap control and ownership of every locked task |
| Targets | 1–100 explicit, unique task UUIDs with their displayed server timestamps; bounded input and no arbitrary field patches |
| Eligibility | Checked daily task, exact version, and an older logical day; a current/future-day, unchecked, non-daily or changed task rejects the entire batch |
| Logical day | Existing device-local time minus four elapsed hours, with an explicit IANA timezone; the server checks its own current day after lock waits |
| Mutation | Only `done=false` and the timestamp trigger's version change; no streak adjustment, session write, completion undo or deletion |
| Failure | One stale/refused/suppressed task or failed history write rolls back every checkbox in that batch |
| Retry | Original owner/request identity, task versions, day and timezone; replay returns current owned rows and never repeats an old reset over a newer completion |

The timezone is a declared scheduling preference, not an authorization grant.
The existing elapsed-four-hours convention, including its daylight-saving
behavior, is preserved. A client clock mismatch or first delivery after the
logical day changes refuses the stale intent; the client must review it instead
of silently advancing its day. A previously committed receipt can replay on a
later day without making a new change. Future-dated task versions are not reset.

The transaction locks the control/verified identity and all target rows, orders
locks consistently, and serializes one owner's reset requests. It compares every
version before committing; any later failure rolls back earlier row changes.
Private receipts retain full before/after task snapshots with RLS and no browser
or service-role table grants. History survives later task deletion; replay of a
missing/foreign target denies access and cannot recreate it. Review retention,
account erasure and recovery before installation; do not prune receipts while a
saved retry can exist. There is no automatic historical restore endpoint.

Installation pins the task/session schema, policies, owner relationships,
timestamp trigger and reviewed daily-action API. Unexpected drift stops it.
Candidate 90 also revokes this optional endpoint if pausing itself fails.

## Matching isolated client

Roadmap's staging builder pins the original timer, task-access and day-helper
sources, replacing only the ignored synthetic copy. The timer still runs at
startup and every minute. It selects at most 100 eligible tasks per confirmed
batch; additional tasks remain eligible for the next tick. Unconfirmed resets
are retained and need explicit retry/review, rather than creating another batch
or repeatedly submitting a denied request each minute.

Before transmission, the client stores the exact batch under its original account.
A quota failure sends nothing. No checkbox is cleared until a valid acknowledgement
can be applied. Duplicate attempts share one request. Invalid/uncertain replies,
connection loss, pause and version conflicts keep the original retry across reload.
Newer work in another tab is not deleted by an older response. Account generations
reject late replies across A → B → A; existing safe-reload account switching stays
in place without clearing data.

Only acknowledged target rows are applied; unrelated local edits and the session
ledger are retained. Existing task writes are observed while in flight, and a
local edit made during reset confirmation stops that result from replacing the
edit. The saved reset remains available for review after the edit settles.
Pending daily actions and resets must be resolved in order. A reset is not routed
through the daily checkbox/undo API, which would change streak/session semantics.

The recovery panel exposes Retry, explicit Discard and Reload current tasks.
Discard cannot undo an already committed reset. It pauses new automatic resets in
that page until reload, so an old local view does not immediately recreate the
same request. Malformed owned storage is preserved for review; no clear-data step
is required. General editor rollback, capture, bulk editing and log forms retain
their separate acceptance work; observing their writes here does not fix them.

Root app sources, personal auth keys, hub consumption and deployment stay unchanged.
The preview uses a separate loopback backend/auth key and synthetic data. Its
preparation-only changes do not trigger the production Pages deployment.

## Acceptance and remaining gates

SQL tests cover unchanged installation; atomic batches; preserved titles, streaks
and app-proven session history; duplicate/uncertain retries; newer completions;
partial/suppressed writes; stale/foreign/missing targets; invalid/oversized inputs;
current/future days; pause/revocation; retained history after deletion; drift and
containment. Local Supabase CI adds real JWT requests, concurrent duplicate and
competing resets, a task edit committed while a reset waits, history-write failure
and replay blocked by committed pause/verification changes.

Client tests cover original-day persistence, storage failures, account changes,
unconfirmed/foreign rows, cross-tab changes, explicit acknowledgement and the
four-hour boundary. The browser harness drives the actual staged timer worker,
store and recovery panel through failure, no lost retry on the next tick, guarded
daily changes, successful retry, retained session evidence and overlapping edits.
Hosted/device tests and real recovery remain unperformed.

The daily path is 01 → 03 → 08 → 12. Comparison candidates 09/10/11 keep their
independent order; these are operational candidates, not additions to the six
Commonplace migrations. Next G0 work remains general task/log editor failures,
suggestion/hub delivery, actual callers and account-scoped local state, followed
by other shared-app/Edge entitlements and API/Auth/provider evidence. Existing
owner policies are not an app-admission allowlist. An explicit final G0 decision
is still required before any rollout. Commonplace/Excel study UI, materials,
progress, bookmarks, notes and offline packs are unchanged by this work.

The subsequent [task metadata preparation](ROADMAP-TASK-EDIT-READINESS.md) covers
name/tag/expansion saves and reset coordination. Daily-log recovery and the
remaining capture/structural/hub paths still need their own acceptance.
