# G0 — Roadmap suggestion recovery and hub delivery preparation

2026-11-27 (Japan). **Preparation only; G0 remains open.** Commonplace #134
is merged at `b115ccf9b7e580f35f84d8a0cfd0113cee5851bb`; Roadmap #25 is merged
at `d3fa0faa6779d16514a08b516aa6cec4db5462b9`. This bounded work group follows
[structural recovery](ROADMAP-STRUCTURE-READINESS.md). General_apps remains the
intended backend. Hosted SQL/Auth/deployments, signup and enrollment are on hold.
Restoration stays deferred at its existing checkpoint; no new restore or live
catalog/personal-data inspection was performed.

## Findings and prepared correction

The owning `src/lib/suggester.ts` saves an answer before sending a skip or starting
a session. If that second action fails, a retry sees `answered_at` and returns,
so the follow-up can be lost. Native answers use a null stream sequence, which
does not deduplicate their logs. A saved live suggestion also returns early on
the next tick without retrying failed publication. The copied hub adapter drops
handler rejections and its shallow JSON comparison loses nested address fields.

[Candidate 17](../operations/general-apps/17_roadmap_suggestion_delivery.sql)
requires **01 → 03 → 09 → 17**, exact catalog/routine review and separate caller
acceptance. It leaves existing rows, APIs, policies and the six Commonplace
migrations intact during installation. Candidate 16 is not a SQL prerequisite;
the complete owning-client preview retains its other candidates independently.

| Area | Prepared behavior |
| --- | --- |
| Identity | Non-anonymous, verified Auth UUID; Roadmap control and Auth record stay locked through the transaction |
| Native answer | Stable per-request UUID, including null sequence events; answer log, first answer, optional session start and receipt commit together |
| Hub answer | Owner plus stream sequence deduplicates delivery across devices; changed content rejects; the first committed event retains its logical day |
| Session proof | Calls the reviewed candidate 03 start routine; completed proof, duration, feedback and notes survive; replay does not start again |
| Skip follow-up | Stores an exact address snapshot and stable `rm:answer:<receipt UUID>` publish request in the private receipt |
| Unknown suggestion | Logs the event only; does not expose or change another owner's row; no guessed parent FK |
| Competing answers | First committed answer wins; later distinct answers are logged without repeating its effects; this is not cross-device sequence scheduling |
| Legacy sequence | Existing log without a receipt requires reconciliation; it is never assumed to prove follow-up success |
| Limits | 200 UTF-8 bytes for suggestion ID, 4 KiB reason/address, 64-character app ID, safe positive integer sequence, valid logical date; 12 KiB client intent and 16 KiB server request |
| Pause/containment | Pause or identity revocation blocks new calls and replays; candidate 90 optionally revokes the new RPC |

Private receipts have RLS and no public/anon/authenticated/service-role table
privileges. They do not cascade with task deletion and retain the original
request/effect for retries. Review retention, erasure and recovery custody before
installation. Receipts are not an automatic restore facility. No source records
are rewritten, no privileged key is added, and no hub route/kind is invented.

## Isolated owning-client behavior

All Roadmap changes are under `access/`. The pinned builder changes its ignored
loopback fixture, including copies of the actual suggester, NowStrip and adapter.
Root source/public assets, production auth storage, deployment and the legacy
outbox remain unchanged. Live hub boot stays disabled, and no hosted traffic is
sent. Tests inject synthetic callbacks and RPC replies.

Before sending, the client saves `rm-suggestion-answer-v1:<owner>:<request>`.
Reload/retry preserves the original payload, date and request. A successful local
answer still waits for any required hub publish and visible local application
before acknowledgement/cleanup. `queued`, empty and malformed publish results
are not confirmation. Transient errors keep the original retry; AK1xx errors and
unresolved closed requests retain visible review state and cannot automatically
resend. A closed retry with an applied/already reply completes without inventing
a new key. Account epochs and exact saved-byte checks prevent late responses or
another tab from clearing a newer answer. Both RPCs carry a captured token for
the original account; an SDK session switch cannot send its payload as another
account. Tokens are never saved in recovery slots. Existing unscoped data is preserved,
not silently assigned to the currently signed-in account.

The actual copied handler refreshes session data before acknowledging a start;
a failed refresh leaves the retry saved. Recovery displays text using React,
without interpreting supplied markup. Saved live suggestions retry the same
document value with the original timestamp. The adapter's diff cache compares
complete nested JSON, records only confirmed writes/removals and passes permanent
rejections through. Failed `markDone` writes now throw in the copy so a reply
cursor cannot advance through that failure; the wider reply path is still gated.

## Acceptance and remaining activation gates

Synthetic SQL/controller/browser tests cover installation without record changes,
atomic rollback, completed-proof retention, request/sequence conflicts, native
and unknown replies, malformed/oversize input, foreign owners, pause/revocation,
corrupt/quota-limited storage, duplicate clicks, reload after lost replies, blocked
contract errors, concurrent tab slots and A→B→A account epochs. Adapter tests run
the real copied classic scripts and verify rejection/defer/ack behavior and full
address publication. Three disposable Supabase groups add real synthetic JWTs,
concurrent delivery, committed ownership/pause/verification waits and receipt
failure rollback. CI results belong to the exact PR head.

**This does not certify the entire hub or make learner sharing available.** The
following evidence must be completed before enabling the copied hub:

| Remaining path | Required acceptance |
| --- | --- |
| `task.upsert` mirrors and pairing | Bounded durable pairing prepared in [mirror readiness](ROADMAP-MIRROR-READINESS.md); original-link reconciliation, actual hub ack/deletion ordering and activation remain gated |
| `task.done` and replies | Replace/reconcile daily item keys with request identities as appropriate; persist pending work before send; full reply ordering/cursor and applied-view recovery |
| `session.completed` and actual study callers | Replay-safe completed proof, sender/caller contracts, original task/day/source, rejected/unknown targets and existing launch handshake |
| Shared hub state | Actual registration/vocabulary/routes, current hub SQL/error/outcome contract, multi-device publication ordering and target-side completion; no fabricated registration evidence |
| Account-scoped state | Existing `akatsuki_outbox_rm`, pending-done, reply cursor, context/check-in and leader lifecycle; reconcile original ownership before any replay, never guess or clear website data |
| Legacy direct writers | Atomic-client cutover, complete preexisting answer receipts/history reconciliation, general completion/resource/log deletion and external import acceptance |

The repository's copied Akatsuki standard remains v3.7. The Akatsuki source tree
has a newer contract-registry work stream, but no root `AKATSUKI.md` was available
at review; this is not evidence of live hub compatibility. Shared-app admission,
API/Auth/provider settings, deferred recovery, physical devices and the final G0
decision remain open. Stage these remaining hub/caller and account-state checks
next; do not start hosted rollout merely because these preparation PRs merge.
