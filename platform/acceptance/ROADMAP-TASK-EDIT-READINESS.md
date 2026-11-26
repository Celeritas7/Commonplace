# G0 — Roadmap task metadata recovery

2026-11-27 (Japan). **Preparation only; G0 remains open.** Commonplace #124
is merged at `3ce04448d5ba6119c92683c6c9db5e42119574bb`. Roadmap #21 is merged
at `8c5ed937950716051f42f91fe98bb7faa3ee9c48`. The follow-up also retains
Commonplace main `2cc83ec57ea42cc14fe6fb9623c8dbbdd8da8466` with the separately
merged Excel R4 planning PR #125. This bounded work group follows
that daily-reset preparation. General_apps remains the backend; hosted changes,
signup and learner enrollment remain on hold. Restoration remains deferred at
its existing checkpoint. No personal rows or hosted catalog were queried here.

## Confirmed failures and scope

Roadmap's rename handler sends a save without awaiting it, closes immediately,
and loses the visible draft on blur. Its generic single-row error handler restores
an older entire task array. Bulk updates send independent writes; one rejection
can leave some server rows committed and replace newer local work during recovery.

[Candidate 13](../operations/general-apps/13_roadmap_task_edits.sql) prepares
`ga_roadmap_edit_tasks(p_tasks, p_request_id)` after candidates **01 → 03 → 13**.
It changes existing task names, tags and expansion state. Creation/capture, moves,
reordering, deletion, daily-log forms and hub delivery retain separate work groups.
It does not replace those APIs or grant app admission to every verified account.

| Contract | Prepared behavior |
| --- | --- |
| Identity | Current confirmed, non-anonymous Auth UUID; active Roadmap control; current ownership of every target |
| Targets | 1–100 unique explicit UUIDs with original server timestamps and a nonempty patch of title, tags and/or expanded |
| Validation | 64 KiB canonical server JSON; title up to 4,096 UTF-8 bytes, 32 distinct tags of up to 80 UTF-8 bytes each, boolean expanded; no blank title/tag or arbitrary ownership, hierarchy, completion, streak or date patches |
| Mirrored tasks | Title/tags marked `wf`, `orphaned` or legacy `wf-orphan` must be edited through their owning flow. These tags cannot be introduced through this API |
| Atomicity | Lock and check every owned row; any stale/refused/suppressed write or receipt failure rolls back the entire batch |
| Preservation | Unpatched columns, hierarchy, completion, streaks and session history remain intact; private before/after snapshots commit with the edits |
| Replay | Original account/request and payload; recheck current access and return current rows, never apply an old title/tag list over a newer edit |

Installation pins existing task/session columns, owner policies/constraints,
timestamp trigger and session contracts. Drift aborts before changing records.
It adds no new columns to existing task tables. The API locks the pause and Auth
rows through commit; a pause or verification revocation committed while it waits
is observed. Task locks use a consistent order, and owner-scoped request locking
serializes duplicate receipts. Another writer changing a version during a wait
causes the entire original batch to fail.

The private receipt table has RLS and no public/anonymous/authenticated/service
role table grants. Receipts survive task deletion but cannot restore a deleted or
foreign task. Review retention, erasure and recovery before installation; do not
prune receipts while saved retries can exist. Candidate 90 revokes this optional
API even if its pause step fails. Containment does not freeze legacy direct writes.

## Isolated owning-client preparation

The Roadmap builder pins current source inputs and only patches its ignored
loopback fixture copy. Root runtime files, original auth storage, public assets,
hub protocol and deployment remain unchanged. Preparation-only changes do not
trigger the production Pages workflow. The preview disables hub consumption.

Single and bulk metadata actions use the same RPC. Mixed metadata/structural
patches are rejected rather than partially routed. A denial or missing RPC never
falls back to a direct table write. The client keeps confirmed rows visible and
stores the exact original-account batch before sending it. Client JSON is capped
at 48 KiB, leaving room below the server's canonical JSON bound. Storage refusal
sends nothing. One pending metadata batch per account must be resolved before a
different one can replace it.

The rename input survives blur and save failure, with explicit Save and Close
controls. A confirmed edit closes it; failed saves remain in the input and in
**Task edit recovery** after reload. Unsent text is an in-page draft; only a Save
attempt persists it. The recovery panel displays plain-text proposed patches,
Retry, explicit Discard and Reload current tasks. A discarded retry cannot undo
a possibly committed write; new metadata saves require a reload after discard.
A stale version remains the original version until explicitly reviewed, never
silently rebased. Reload does not clear study data or saved requests.

Acknowledgements validate request identity, task shape, ownership and targets;
first acknowledgements must contain the requested fields and a changed version.
Current-state replay can return newer values. Account generations reject late
A → B → A responses. Existing safe-reload switching hides the old app view. Newer
cross-tab saved work is not cleared by an earlier reply or stale discard.

Only acknowledged target rows are applied. Unrelated local edits remain intact;
a target changed during confirmation is kept and its saved request remains for
review. Completion/session evidence is not rebuilt from metadata. Pending daily
changes and resets are resolved in order. The timer skips pending metadata;
metadata edits cannot start over an unresolved reset. Legacy task mutations are
serialized against pending metadata, including their rollback/reload lifetime,
so their old whole-tree rollback cannot erase a newer metadata save. This is
coordination, not certification of those remaining structural paths.

## Verification and remaining work

Synthetic SQL tests exercise unchanged installation, title/tag/expansion batches,
private history, field/UTF-8/count limits, mirror ownership, stale/missing/foreign
targets, suppressed writes, rollback, replay of newer state, pause/revocation,
retained history after deletion, drift and containment. Disposable Supabase CI
adds actual synthetic JWTs, concurrent duplicates/competitors, a newer edit or
ownership transfer committed during a lock wait, history failure and pause/
verification changes. No hosted Auth identity or user material is used.

Client tests cover persistent exact retries, malformed storage/replies, quota,
duplicate saves, first versus replay acknowledgement, version conflicts, account
switching and cross-tab cleanup. The browser test uses the actual staged store,
task row and recovery panel for rename blur/failure, reload/retry, atomic tag
batches, retained sessions/streaks/unrelated edits and overlapping changes. The
previous reset browser regression also verifies that metadata waits for reset
recovery while an already-running ordinary writer remains protected.

Next bounded work: **daily-log entry recovery**, followed by task creation/capture
and structural mutations; then suggestion/hub delivery, actual study callers and
account-scoped local state. Remaining shared-app/Edge entitlements, API/Auth/
provider evidence, deferred recovery and the final G0 decision still precede any
hosted rollout. These are work groups inside G0, not new platform phases. The six
Commonplace migrations, Excel development, study materials, notes, bookmarks,
progress, offline manifests and downloaded packs are unchanged.

The subsequent [daily-log preparation](ROADMAP-LOG-READINESS.md) covers awaited
log entry forms and stable original-date retries. Creation/capture and structural
task/log mutations remain separate; no hosted cutover is implied.
