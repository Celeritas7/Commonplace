# G0 — Roadmap comparison-edit recovery

2026-11-26 (Japan). **Preparation only.** Commonplace #119 is merged at
`ef5fd516f16cb7d5f424af79350142d3eb403a03`. The matching Roadmap staging work
starts from `93162665222b83ab03c840efd10303508f90db47` (merged #18).
Recovery/restoration remains deferred. This work does not clear G0 or enable sharing.

## Confirmed behavior and bounded correction

The current Roadmap `compareSync.updateComparison` accepts an UPDATE response
without requesting a returned row. A permission-filtered zero-row update can
therefore appear saved. The store optimistically changes weights/picks and on
failure restores its entire earlier comparisons array, potentially replacing
unrelated edits made while the request was pending. Separate comparison/item
reads and late refreshes can also replace newer state with an older snapshot.

[Candidate 10](../operations/general-apps/10_roadmap_comparison_edits.sql) adds
`ga_roadmap_edit_comparison(comparison_id, expected_updated_at, patch, request_id)`.
Only weights and product choice are accepted. Input size, weight shape/range and
choice membership are checked. A current verified, non-anonymous Auth identity
must own the locked comparison, and Roadmap's action control must not be paused.

The original server timestamp is compared under the row lock. A stale edit
returns 40001 without changing saved work; the server never guesses which
conflicting intent should win. A successful edit and its private receipt commit
together. Receipt failure or silent trigger suppression rolls the edit back.
Before/after preference values are retained in the receipt. Private receipts
have RLS and no browser or service-role table grants.

The original owner/request identity makes lost acknowledgements safe to retry.
Reusing an ID for different intent is rejected. Every replay rechecks current
authorization and returns the **current** comparison and its products, so an old
retry cannot reinstate a superseded weight or removed product. Payload equality
does not depend on the database connection's timezone. No email or authentication
token is stored in receipts.

Installation requires 01/03/09, pins reviewed comparison columns, owner policies,
membership constraints and timestamp behavior, and does not rewrite existing
records. Candidate 90 revokes the optional new API even if updating its pause row
fails; it remains compatible with backends where 10 is not installed.

## Matching opt-in client

The Roadmap staging builder pins its original inputs and changes only the
ignored synthetic copy. Existing runtime sources, personal auth storage, local
preferences and deployment remain unchanged. The loopback dummy backend and
disabled hub consumption remain in place.

- Weights/picks change on screen only after a validated acknowledgement.
  Failure never restores an old whole-array snapshot.
- Before transmission, the exact proposed edit is saved under its original
  account and comparison. Duplicate clicks share a request. A different intent
  cannot overwrite an unresolved change. Quota/storage errors stop transmission.
- Retry/refresh/discard controls are available inside the open comparison dialog
  and, when it is closed, in the shared recovery panel. Stale conflicts require
  review; retries do not silently adopt a newer timestamp or replay on a new owner.
- Refresh uses one owner-filtered PostgREST embedding with an explicit FK name.
  A refresh crossing a save or account change is discarded. Acknowledgements
  update only their comparison and products, retaining unrelated local changes.
- Account generations reject late replies even across A → B → A. Original-account
  retries remain saved. A newer retry written by another tab is never erased or
  applied as the earlier operation's result. The existing safe-reload account
  switch screen remains authoritative.
- Discarding a retry explicitly does not undo a possibly committed server save.
  Refresh retrieves the current server state before a new deliberate edit.

## Acceptance

Synthetic SQL tests cover preserved notes/products, before/after preferences,
lost acknowledgement, current-state replay, stale edits, foreign/missing choices,
wrong owners, anonymous/unverified identities, invalid/oversized patches,
failed/suppressed record and receipt writes, paused replays, legacy reimport,
source drift and containment. The whole platform suite exercises earlier
candidates and six unchanged Commonplace migrations alongside these tests.

Disposable Supabase CI adds concurrent duplicate requests, competing edits from
the same version, real JWT denial, the actual embedded-read syntax, audit-failure
rollback and replay waiting across committed pause/verification changes.
Client tests cover durable retry, invalid responses, storage failure,
cross-account replies and cross-tab changes. A browser harness uses the staged
store and actual comparison dialog to verify that failure preserves unrelated
edits, retry uses the original request, and delayed refresh cannot undo a
confirmed product pick. Physical-device and hosted results remain pending.

## Installation order and remaining boundaries

Review 01 → 03 → 09 → 10 with the matching client before its controlled cutover.
08 remains separately required for the staged daily-session path. Keep existing
receipt/history data in the recovery scope. Do not prune receipts while a
retained device retry can still exist; deleting a comparison uses its already
reviewed child-cascade semantics, including its receipts.

The legacy `roadmap_save_comparison(jsonb)` importer and direct owner-scoped
table APIs are unchanged. This candidate does not make those callers versioned
or give them reliable import retries. Legacy replacement/pick-reset semantics,
external importer contracts, suggestion/hub delivery, daily resets and other
editor failure paths retain separate acceptance work. The shared pause contains
the prepared RPCs; it does not freeze all legacy direct writes. Owner policies
are not an app-admission allowlist.

Actual caller/device acceptance, remaining shared-app/Edge entitlements,
API/Auth/provider evidence, deferred recovery and the final G0 decision remain
open. No hosted SQL, signup, enrollment or deployment is performed. Commonplace
study UI, Excel materials, saved progress and offline packs remain unchanged.
