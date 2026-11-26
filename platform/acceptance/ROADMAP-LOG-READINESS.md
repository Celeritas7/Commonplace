# G0 — Roadmap daily-log entry recovery

2026-11-27 (Japan). **Preparation only; G0 remains open.** Commonplace #126
is merged at `a50ce5352ecb30a9e115aeb1364d2be9270e6e3d`; Roadmap #22 is merged
at `8188355d18ef825115f20f36427b6bf27edf643c`. The follow-up retains current
Commonplace main `a2922eb05db6f0c3b4805a86203e27c8a83b70e0`, including the
separately merged Excel homepage PR #127. This is the next bounded work
group after task metadata recovery. General_apps remains the backend. Hosted
SQL/Auth/deployments, signup and enrollment remain on hold. Restoration remains
deferred at its existing checkpoint; no personal records or live catalog were
queried for this change.

## Confirmed failures and scope

`TodaysLog` sends `addLog` without awaiting confirmation and immediately resets
all fields. Blur also clears the form. The old insert generates a fresh database
UUID each time, so retrying an uncertain response can create a duplicate. Its
integer parser silently truncates a fractional duration. Separately, an older
log deletion failure restores its entire prior log list and can hide a new save.

[Candidate 14](../operations/general-apps/14_roadmap_log_entries.sql) prepares
`ga_roadmap_add_log(p_entry_id, p_entry, p_request_id)` after **01 → 03 → 09 → 14**.
It is an additive create/retry contract, not a replacement of the existing table,
legacy insert/delete paths, capture flow or hub APIs. No historical log changes
or Commonplace migration additions are made during installation.

| Contract | Prepared behavior |
| --- | --- |
| Caller | Current verified, non-anonymous Auth UUID and active Roadmap control |
| Entry | Explicit stable entry UUID and request UUID; original log date, optional owned task, context, whole-minute duration and notes |
| Input | ISO calendar date, integer duration 1–1440, context at most 128 UTF-8 bytes, notes at most 16 KiB, server JSON at most 32 KiB; reject owner/date-of-creation/unknown fields |
| Parent | A new linked entry locks its current owned task; no foreign, missing or group task and no task-name inference |
| Atomic save | Entry and private creation receipt commit together, or both roll back; rejected/suppressed writes are not acknowledged |
| Replay | Same account, request, entry identity and original payload; return the current owned log instead of inserting again or overwriting later notes |
| Deletion | Optional task deletion retains the log through candidate 09. Replay returns its current null task link. A deleted/foreign log is not recreated or disclosed |

A date describes the user's calendar entry; it is not an authorization decision
or a server-clock ordering mechanism. Past-date retries remain valid after
midnight. Existing unusual/legacy values are not rewritten. New limits apply to
this API and its staging caller. Like the existing owner policy, this API is not
an application-admission allowlist: a verified user can create their own general
entry. Restricting access to Roadmap itself remains a separate G0 admission gate.

Installation validates the task/log columns, owner policies, log primary key,
owner-qualified task FK and absence of unexpected log triggers. Schema drift
stops installation. The transaction locks current verification and pause state;
committed revocation encountered during a wait is observed. Requests serialize
per owner, and entry IDs remain reserved by the private receipt even after
later deletion. Cross-owner identity collisions cannot adopt an existing row.

Receipts have RLS and no public, anonymous, authenticated or service-role table
grants. They retain the original created snapshot without cascading on source
deletion. This is creation evidence, not a history of subsequent legacy edits
or an automated restore endpoint. Review retention, account erasure and recovery
before installation; do not prune receipts while a saved retry may exist.
Candidate 90 includes the optional create API even if its pause step fails.
It does not stop unchanged direct-table writers.

## Isolated owning-client preparation

Roadmap's pinned builder patches only the ignored loopback fixture. The actual
`TodaysLog` mounts an awaited form and its store uses the new RPC. Root source,
public assets, original auth keys, hub protocol and Pages deployment remain
unchanged. No production backend configuration or credential is added.

The form retains text on blur and closes only on explicit Close or confirmed
save. Close keeps the in-page draft. A draft captures its date when opened and
keeps it across midnight. Unsubmitted drafts are in-page only; a valid Save
attempt stores the exact original-account request before transmission. Quota
failure sends nothing and leaves the visible draft. A whole-number duration is
validated without truncation. Notes are displayed as plain text, never HTML.

One unresolved log per account remains visible in **Daily log recovery**, with
its original date, duration, context and notes, Retry, explicit Discard and Reload.
The held form cannot silently alter that request. Confirmation through either
form or recovery panel clears the associated form, avoiding accidental duplicate
submission. A recovered earlier-day entry remains visible in the confirmation
panel even though the unchanged list is today-only. No history navigation is
claimed. The saved envelope is limited to 24 KiB UTF-8, below the server JSON cap.

Request and entry identities survive reload and retries. First acknowledgements
must match the requested fields; replays may contain current edited values.
Duplicate in-flight attempts share a call. Missing, foreign or malformed replies,
account A → B → A changes, mismatched stored work and failed cleanup do not clear
the retry or claim confirmation. Newer cross-tab work survives an older response
or discard. Existing safe-reload account switching preserves storage.

Only the confirmed entry is inserted/replaced locally, deduplicated by UUID.
Other logs, task state and session proof remain intact. A target changed while
confirmation is pending is retained with its retry for review. Log creation and
the complete legacy delete/rollback lifetime are serialized: a Save attempted
during deletion is stored but not transmitted until explicitly retried afterward.
Full delete/version/history semantics remain for the structural work group.
Discard is local only, never a server undo, and requires reload before a new log
so a possibly committed entry can be reviewed first. No clear-data step is used.

## Acceptance and next work

Synthetic SQL tests cover unchanged installation, exact owned/general records,
private receipts, stable identities, current-state replay, field/date/byte limits,
foreign/unverified callers, suppressed entry/history writes, collisions, deletion,
revocation, drift and containment. Disposable Supabase CI adds synthetic JWTs,
concurrent same/different requests, parent ownership changes during lock waits,
receipt rollback, current note replay, retained orphaned logs and committed
pause/verification/record-ownership revocation.

Client tests cover persistent original-day retry, malformed storage and replies,
quota failures, cross-account/cross-tab responses, explicit acknowledgement,
limits and identity preservation. Browser tests use the actual staged form,
store and recovery panel through blur, fractional-duration rejection, midnight,
lost acknowledgement/reload, successful recovery without duplicate submission,
older delete rollback and overlapping local edits. Type check/build and existing
regressions cover the integrated preview. Hosted/device acceptance remains open.

Next bounded work: **task creation/capture recovery**, followed by structural
mutations and deletion, suggestion/hub delivery, actual study callers and
account-scoped local state. Remaining shared-app/Edge admission, API/Auth/provider
evidence, deferred recovery and the explicit final G0 decision still precede
hosted rollout. These are G0 work groups, not new platform phases. Excel work,
study materials, notes/bookmarks/progress and offline packs remain unchanged.
