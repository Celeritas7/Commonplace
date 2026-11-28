# G0 — Exact-event suggestion and study acknowledgement

Prepared 28 November 2026 (Japan), following merged Commonplace #148
(`c0d335a38028282865fb9bbba5609090e8c9e441`) and Roadmap #31
(`44fac8158c6e61a8f8e998707a86ba660e6bf0f4`). Work is isolated from other chats.
This bounded group prepares candidate 22 and the matching Roadmap `access/`
client. No hosted installation, deployment, signup or learner enrollment is
approved. Restoration remains deferred at the existing checkpoint.

## Source contract and remaining limitations

Akatsuki source is pinned to
[`902a6670676db8ae1cad282cb81f1ad83373038c`](https://github.com/Celeritas7/Akatsuki/tree/902a6670676db8ae1cad282cb81f1ad83373038c).
This is source evidence, not a live General_apps catalog assertion.

| Source | SHA-256 | Contract used |
| --- | --- | --- |
| `sql/akatsuki_card_roadmap_R022.sql` | `a864b269cda4f8570af4250925adb3cce5ca7337ca7dae592a1dd60818be3c27` | Suggestion payload, action vocabulary, source IDs, key and `no_reply:true` |
| `js/akatsuki-banner.js` | `513498b5ed7482f835886c2bac57d5de1afeb9b69552dc29b74a6b37028b1d11` | Native RM callback has no hub event; other apps publish one answer per suggestion |
| `sql/akatsuki_card_jlpt_R020.sql` | `b04d9681a5cc4723cbae920db127d6fca0f582de4aec717b6ffaab51c415a745` | Study schema and original task/day; no declared response payload |
| `sql/akatsuki_card_jlpt_R020_C1.sql` | `8b1053ccb6eb2aef3a46f4db7846b027e8d41ba4a810bd7298f2c6b970b5af73` | Later source card correction, still no acknowledgement reply schema |

Neither incoming kind gains an invented reply contract. Acknowledgement changes
only the exact original event's delivery state, the monotonic RM cursor and a
private receipt. `reply` and `reply_seq` remain null. A newer request with the same
address is never selected by an address-based reply. Cursor high-water remains
metadata: the shared consumer must continue selecting every pending lower sequence.

The seven R022 suggestion source names are `wf`, `cost`, `sukkiri`, `cal`,
`scriptura`, `jlpt` and `cc`; each needs a separate owner/source/kind review gate.
Only the previously prepared JLPT study source is supported. Source strings and
registry metadata do not attest which application sent a request. Legacy owner
writes to shared hub tables/RPCs still require coordinated review and cutover.
The checked route detects changed original evidence; it does not secure every
legacy hub writer. Same-owner legacy manipulation can block retries. Other
owners cannot read or mutate the private receipts through these APIs.

The original banner optimistically marks an answer locally after publication.
Its callers have not been cut over here. The prior candidate 20 caller readiness
requirements, including the launch-based study key versus R020's historical
per-task/day key, remain open. No actual caller application is deployed by this
work. App-reported study activity is not independent proof of learning.

## Prepared APIs and ordering

Candidate `22_roadmap_consumer_acknowledgements.sql` requires reviewed candidates
17/20/21 and their prerequisites. It pins dependent function bodies/settings and
hub/suggestion/session catalog shape, policies and unexpected triggers. A mismatch
rolls installation back. New private gate and receipt tables have no client grants.

| API | Authority and result |
| --- | --- |
| `ga_roadmap_answer_local_suggestion(payload, request_id)` | Verified owner, pause control, `from_app=rm` and `seq=null`; preserves native answers without fabricating a stream event |
| `ga_roadmap_receive_suggestion_event(seq, request_id, day_key)` | Reads the actual owned event; checks source, schema, address, key, UTF-8 bounds and action vocabulary; delegates candidate 17 and retains immutable evidence/normalized answer |
| `ga_roadmap_receive_study_event(seq)` | Requires candidate 20 source review as well as the new gate; retains original task/day/event and application receipt |
| `ga_roadmap_ack_consumer_event(seq)` | Requires exact receive/application receipts, current authorization and owned target; checks original skip effect exists; atomically closes only this event and records acknowledgement |
| `ga_roadmap_consumer_status(seq)` | Reads private acknowledgement after rechecking owner, gates and original event evidence; a legacy mutable `delivered` flag alone fails |

Incoming suggestion delivery sends only its original sequence and retry identity,
plus the logical day saved by that device. The first committed receipt fixes that
day across devices. It preserves unknown-answer logging, first-answer-wins,
Unicode reason text, full opaque task addresses and native session start behavior.
Legacy receipts without new exact-event evidence require reconciliation; they are
never silently adopted. Candidate 22 revokes browser execution of the old candidate
17 payload/sequence API and candidate 20 receiver, retaining them as internal
implementation dependencies. A native wrapper replaces the local caller API.

A skip's original receipt-derived follow-up must exist under the same owner with
identical direction, kind, key, clock, address and payload before ack. A refused or
changed effect fails. This confirms durable hub publication, not that Weekly Focus
has applied it. Candidate 17's stable receipt key remains subject to its existing
WF contract/caller acceptance gate.

The isolated Roadmap flow is receive → apply current rows → flush the subscribed
view → checked ack → clear the original saved slot. Newer local work, storage
changes, account epochs, lost receive/ack responses and failures leave recoverable
owner-specific work. A committed ack can be replayed after reload without advancing
its event/cursor timestamps. Newer sessions and deleted history are not recreated
by acknowledgement. The server cannot prove someone saw the screen; render order
is a browser acceptance property, not a security boundary.

The actual copied client/adapter now accepts these two reviewed kinds alongside
WF task mirrors. It requires the handler's exact-sequence acknowledgement result
and does not call generic ack/reply/defer. Other kinds and direct document/place
writers remain gated. Automatic hub boot and root Roadmap runtime are unchanged.
The prepared JLPT caller checks both its exact stored effect (including clock)
and private acknowledgement status with its captured owner token before confirming.

## Acceptance and installation prerequisites

Synthetic SQL tests cover default deny, unauthorized users, native separation,
first-receipt replay, unpublished/changed/refused follow-ups, schema/byte limits,
changed original evidence, status-only refusal, older/newer same-address events,
monotonic cursor, rollback, revocation, dependency drift and containment. Disposable
real Auth/Postgres acceptance adds concurrent receive/ack and committed lock waits
for gate/source revocation, pause, identity, event evidence/ownership and target
ownership. Browser tests use copied SDK/adapter and real prepared handlers with
synthetic transport, checking render-before-ack, reload/lost replies, delayed account
responses, newer edits, private caller confirmation and retained offline bytes.
These do not substitute for hosted or physical-device acceptance.

Before any later approved installation:

- Reconcile the live **General_apps `wylxvmkcrexwfpjpbhyy`** catalog and dependencies.
  The Technical project is unrelated. The six Commonplace migrations are unchanged.
- Finish shared-app caller/sender authorization review and remove or contain bypass
  paths in a coordinated window. Choose trusted server capabilities or an explicitly
  owner-authorized model; frontend app names cannot grant independent authority.
- Review existing pending slots, old receiver receipts, delivered/replied events
  and follow-up keys. Preserve ambiguous data for explicit reconciliation.
- Quiesce affected prepared callers and coordinate candidate 22 with its new native,
  incoming and status clients. SQL alone would break the previous browser APIs.
  Do not automatically regrant unsafe old entry points as rollback.
- Leave `roadmap_consumer_access` empty until an authorized operator records each
  verified owner's source/kind review. Candidate 20 study source gates are additional;
  candidate 21 mirror permissions do not implicitly enable these consumers.
- Retain original private receipts and local recovery slots; define retention and
  reconciliation before production. Containment independently revokes all five new
  APIs and pauses Roadmap without deleting work, even if another component fails.
- Finish the deferred restoration, physical-device/offline/account-switch acceptance
  and remaining G0 decision before enabling signup or restricted learner sharing.
  Do not clear website data or replace personal study packs.

The next bounded group is **shared-document and place writers with version checks**,
followed by sender policy and actual caller cutovers. This phase prepares reliable
consumer acknowledgement; it does not activate Commonplace Admin Studio or clear
G0 for sharing.
