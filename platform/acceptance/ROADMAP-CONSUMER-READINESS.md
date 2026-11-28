# G0 — Exact suggestion and study acknowledgements

Prepared 28 November 2026 (Japan), following merged Commonplace #148
(`c0d335a38028282865fb9bbba5609090e8c9e441`) and Roadmap #31
(`44fac8158c6e61a8f8e998707a86ba660e6bf0f4`). This is one bounded preparation
phase. G0 is still open. Hosted installation, Auth changes and learner enrollment
remain on hold; restoration stays deferred at its existing checkpoint.

## Problem and resulting contract

The previous prepared suggestion handler accepted a browser-supplied source,
sequence and payload. Suggestion and study handlers could clear local recovery
after application while the shared hub had not confirmed delivery. The legacy
address-based reply API can target a later request at the same address.

Candidate `22_roadmap_consumer_acknowledgements.sql` reads the exact owned stored
request and saves private evidence alongside its application receipt. Separate
acknowledgement accepts only that original sequence. It atomically marks that
request delivered, writes one terminal reply and reply sequence, advances the
cursor without rewinding it, and retains an immutable acknowledgement receipt.
Replays do not rewrite request, cursor or receipt timestamps or allocate a new
reply sequence. PostgreSQL sequence gaps after a rolled-back attempt are normal;
no failed transaction leaves a reply row or delivered flag.

| Prepared API | Accepted input and behavior |
| --- | --- |
| `ga_roadmap_receive_suggestion_event` | Original sequence, local request UUID and logical day. Stored source, address, key, vocabulary and answer determine application. The first committed receipt fixes the applied day and effect; another device cannot replay a different answer. |
| `ga_roadmap_answer_local_suggestion` | Explicit local `rm` answer with null event sequence. Reuses candidate 17; it cannot impersonate a hub delivery. |
| `ga_roadmap_receive_study_event` | Original sequence only. Reuses candidate 20's original-day, source-review, ordering and history protections. Returns both current view outcome and original receipt outcome. |
| `ga_roadmap_ack_consumer_event` | Original sequence only. Requires private receive/application evidence. For a skip follow-up it also checks the exact owned hub publication, including the opaque address, payload, clock and idempotency key. |
| `ga_roadmap_consumer_status` | Reads the checked receipt for the original owned event. A public legacy `delivered` flag alone cannot confirm the study sender. |

Terminal replies use `{protocol:'roadmap.consumer.v1', request_seq, kind, status}`.
Suggestion statuses are `applied`, `already_answered`, `unknown`; study statuses
are `reported`, `preserved`, `superseded`. They describe the recorded application
of the original request, not a guarantee that later edits have not occurred.
Current study rows can separately be `removed` on retry. Publication of a skip
means received by the hub; it does not certify that Weekly Focus applied it.
A known refused or unresolved follow-up prevents the initial acknowledgement.
Later target changes cannot rewrite the saved original acknowledgement.

## Isolation and rollout

A new private gate starts empty for each owner/source/kind; mirror permission
never enables these consumers. Candidate 20's study-source gate also remains
required. Verified, nonanonymous identities, current owner checks, pause and
source revocation apply to receive, acknowledgement and status. Unknown
suggestions record only the owner's answer log, without reading another owner's
suggestion. Application/ack receipt tables have no client grants or policies.
Installation pins the shared request/link/cursor catalog, suggestion/session
catalog, private receipt catalog and the reused implementation bodies/settings.
Unexpected drift aborts the candidate transaction.

The public candidate 17 payload API and candidate 20 receiver become private
implementation dependencies in the same installation transaction. The paired
client uses the new local answer and event APIs. **Do not install these SQL
revocations without the coordinated client cutover.** Prior unchecked receipts
and legacy delivered events require explicit reconciliation; this phase does
not silently adopt them or clear old device queues. Containment closes all five
new APIs independently. Retain receipts and local pending slots; no destructive
rollback, automatic receipt pruning or regrant of old interfaces is supplied.

The prepared Roadmap copy invokes supported suggestion/study handlers through
its actual copied client and adapter. It applies current state, flushes the view,
checks the exact server acknowledgement, then clears the original owner/sequence
retry. Lost responses, A–B–A account changes, changed saved bytes, failed view
updates and mismatched replies retain recovery. Native answers remain separate.
The prepared JLPT sender also requires the private receipt status before it marks
a report confirmed. Existing offline packs, notes, legacy keys and production
`src/`/`public/` are unchanged. Automatic hub boot, banner/suggestion generation,
shared-document and place writers remain gated.

App names, source registries, frontend guards and HTTP headers do not attest an
independent application. Legacy shared-table grants and other hub RPCs still
permit same-owner writes. These checked routes refuse inconsistent evidence but
do not secure every shared caller. App-reported study completion is not
independent learning proof. No live caller or physical-device acceptance is
claimed by this phase.

## Validation and next phase

PGlite and client contract tests cover exact events, multiple requests at one
address, replay, default denial, source/owner changes, false legacy delivery,
malformed replies, rollback, saved-byte/account changes, and receipt/caller
compatibility. Browser tests combine copied client/adapter, real handlers,
rendered state and local reload recovery. Disposable Auth/Postgres acceptance
adds concurrent receive/ack, reply rollback and committed lock waits for
revocation/ownership/verification/pause. CI results on the final PR heads are the
acceptance evidence; this workspace cannot launch Chromium because socket setup
is restricted, and it has no Docker/Supabase CLI.

Next bounded phase: shared-document and place writer contracts with explicit
version checks and conflict recovery. Then finish the sender capability or
explicit owner-authorized policy decision, actual caller inventory/cutovers,
physical-device checks, provider/recovery evidence and the final G0 decision.
Do not advance to G1 or enable restricted learner sharing from these merges.
