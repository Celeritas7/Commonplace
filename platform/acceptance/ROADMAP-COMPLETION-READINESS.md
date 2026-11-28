# G0 — Roadmap completion requests and reply recovery

Reviewed 27 November 2026 (Japan). Follows merged Commonplace #138
(`bcd60056096df5e6bcad67fda43f08cda8d9286f`) and Roadmap #27
(`9c53551c1ca8735fa2b537c6e9e5e7f9910144f8`). This is a bounded work group inside
G0. Hosted SQL/Auth/deployment and learner enrollment remain on hold. Restoration
remains deferred at its existing checkpoint. No production database was read or
changed for this work; all acceptance data is synthetic and disposable.

## Failure addressed

The legacy handler published `task.done` before saving its local pending record.
A lost response could leave no recoverable request. Daily/item keys also prevented
a fresh completion after an earlier request closed. Replies updated the checkbox,
cleared pending state and marked a suggestion separately, while one unscoped local
cursor covered both done and skip streams. Partial failure, paging or account
switching could therefore lose recovery or overlook replies.

## Prepared server behavior

Candidate 19 requires 01/03/09/15/18, the pinned candidate 18 function and the reviewed
owner-scoped hub read catalog. Its new completion access table starts empty and
private. An operator must review each original owner, mirror pairs, pending legacy
requests, key contract and hub writer authority before enabling it in a separately
approved window. The mirror reconciliation gate and shared pause still apply.
There is no frontend operation for granting access, adopting a legacy request or
choosing another authenticated identity.

`ga_roadmap_prepare_done` saves a request and exact-address publication effect before
anything is sent. The server supplies one stable timestamp/key per request. Repeated
or concurrent clicks on an outstanding task share a canonical request. Durable aliases
keep each caller's original identity stable even if the response was lost and another
device has since closed that request. A later deliberate completion receives a fresh
UUID/key. Recovery remains readable when its task disappears, but publication is no
longer permitted for a removed/orphaned target. Existing ambiguous daily-key/outbox
records are retained for owner reconciliation; they are not automatically adopted.

`ga_roadmap_reconcile_done` accepts only the canonical request UUID. It reads the actual
owner's hub row by the stored key and verifies direction, kind, full address, payload,
reply sequence and the owner's `wf_apply_status` vocabulary. The browser supplies no
reply, target, checkbox value or cursor. A missing/unanswered row remains unpublished/
pending. A changed, malformed, foreign or unsupported reply cannot close recovery.
Task completion, the exact original suggestion's `done_at`, the ordering fence and
the receipt commit together. Completed study sessions, durations, notes and app proof
are not rewritten. The RPC does not turn a task checkbox into verified study evidence.

A private `effect_seq` now orders task.upsert and completion replies using the same
hub clock. Candidate 19 explicitly installs the pinned candidate 18 successor;
historical candidate 18 remains unchanged. Older mirror updates cannot undo a newer
completion, and old reply replays return current task data. `unknown` keeps a local
orphan, `stale` does not invent completion, and local deletion never recreates a task.
Current task/suggestion ownership is rechecked after lock waits. Pause, review
revocation and lost Auth verification also block successful-request replays.

`ga_roadmap_done_recovery` discovers at most 100 known requests, ordered by reply_seq,
then request creation. Changed replies come before unanswered requests. Per-request
receipts replace the shared local cursor for this prepared path: processing one
request cannot advance past an unrelated request or a late reply. Closed receipts
remain available for a local lost-ack retry. A failed page can be read again. The
query uses only this owner's prepared requests; it never consumes legacy skip replies.
All private tables are RLS-enabled with no API grants. Containment includes all three
new public RPCs. Installation preserves existing public study and hub rows.

## Isolated client and acceptance

Roadmap changes only `access/`. The pinned builder patches ignored loopback copies
of the real task completion handler, poller and suggestion view. Automatic hub boot
stays disabled; production source, auth keys, deployment and offline assets do not
change. The old unscoped `rm-ak-pending-done`, `rm-ak-reply-seq` and hub outbox remain
untouched. They are never assigned to whichever account signs in next.

The client stores `rm-completion-v1:<owner>:<task>` before any RPC. Every new RPC uses
a captured JWT for the original account. Account epochs, exact saved-byte checks and
unforgeable acknowledgement objects protect late responses and competing tabs. It
reconciles the server request before retrying publication, and sends only the stored
original effect. `queued`, missing and invalid results are not confirmation; AK1xx
and AK201 errors stay visible without automatic resend. Checking replies never
publishes an unsent request. Recovery discovery can restore known requests on another
device without guessing ownership. The checkbox and suggestion view update only after
confirmed server results. Newer local edits retain their retry and require a safe
reload rather than being overwritten or clearing website data.

Synthetic SQL tests cover installation, default denial, concurrent identity semantics,
alias/receipt rollback, full-address binding, malformed replies, source/reply ordering,
late replies, tombstones, ownership and revocation. Controller tests exercise lost
publication responses, reloads, closed/new identities, blocked errors, quota/corrupt
storage, forged acknowledgements and A→B→A epochs. Browser tests run the actual copied
handler, poller and recovery panel, including pending checkboxes and retained offline/
legacy bytes. Three disposable Supabase groups add real synthetic JWT concurrency,
server hub/task ownership lock waits and review/pause/Auth revocation. CI evidence
belongs to the paired PR heads, not a hosted readiness claim.

## Remaining activation gates and next work

The reviewed Akatsuki source describes daily task keys in R022, while the copied v3.7
standard specifies one key per request. Candidate 19 prepares request UUIDs; it does
not register or change that live contract. The hub's existing owner-level RLS permits
an authenticated owner to write their own stream rows: reading a matching row is
not proof of an independent WF sender. Sender authority, vocabulary/kind/key agreement,
actual target apply/reply behavior and registration need joint hosted-contract review.
Hub link orphaning/ack ordering from candidate 18 also remains open. These findings
keep automatic hub startup and production activation on hold.

The next bounded work group is **session.completed and actual study callers**:
replay-safe completion proof, original task/day/source, caller authority and existing
launch/return handshake. Remaining shared hub contracts, account-scoped legacy
outbox/check-in/leader lifecycle, legacy direct-writer cutover, deferred recovery,
physical devices and final G0 go/no-go stay on the existing roadmap. No additional
rollout phase or learner-sharing approval is created by merging this preparation.
