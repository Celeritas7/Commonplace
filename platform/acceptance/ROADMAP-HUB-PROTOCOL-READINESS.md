# G0 — Checked mirror acknowledgements and shared protocol review

Prepared 28 November 2026 (Japan), from Commonplace #147 / main
`525e22930c51dea6fb9e9e429bc376979fc0cf40` and Roadmap #30 / main
`686ad486a993c811d80736dc28b77f5e449abb3f`. Both preceding PRs are merged.
This is one bounded G0 work group. Hosted SQL/Auth, deployments, learner signup
and enrollment remain on hold. Restoration stays deferred at the existing
checkpoint; no backup or recovery is restarted.

## Source evidence and limits

The Akatsuki source review is pinned to
[`902a6670676db8ae1cad282cb81f1ad83373038c`](https://github.com/Celeritas7/Akatsuki/tree/902a6670676db8ae1cad282cb81f1ad83373038c).
`tests/roadmap-hub-protocol-source.json` records hashes for R001, R017, R022,
the classic client and the A1A registry migration. The synthetic SQL fixture
copies the relevant table/function definitions, excludes source seed rows and
real identities, and records its own checksum. These are source findings, not a
claim that the current hosted catalog has those exact definitions.

| Contract | Reproduced source behavior | This work / remaining gate |
| --- | --- | --- |
| Link acknowledgement | An older R017 ack overwrites a newer link sequence and target | Candidate 21 derives the target from private mirror receipts; older events cannot rewind links |
| Terminal request | Legacy ack can change an already terminal status/reply and advance reply sequence repeatedly | Checked route only transitions its original pending event once; immutable acknowledgement receipt handles retry |
| Source deletion | WF sends `del`; R017 checks `deleted`; first insertion never sets orphan state | Checked route uses mirror `source_deleted`/suppression, preserves task/history, rejects ambiguous `deleted` |
| Orphan address | RM's source-app argument misses WF links; supplying WF affects all targets | Checked route touches only exact owned WF → RM link; generic orphan remains gated |
| Late reply | R017 address-based reply chooses newest request at that address | Reproduced, not enabled: remaining consumers need exact-request reply contracts |
| Sender authority | Same-owner writes can claim another `from_app`; app declarations and headers are not app attestation | Owner isolation is enforced; independent app authority remains unproven and blocks production clearance |
| Shared documents | `owner_app` and `updated_by` are client strings; stale writes receive a new sequence and replace newer state | Reproduced; copied document/place writers are gated pending server contracts and conflict handling |

A1A contract registry registration describes metadata; it grants no runtime
permission. No test here claims that an app identifier proves the caller is WF,
RM or a study app. The original shared requests/state tables and legacy hub RPCs
remain available to their existing callers in the source architecture. Candidate
21 deliberately does not revoke those shared grants globally or replace the
legacy functions for every app. That needs a coordinated caller inventory and
cutover. A malicious same-owner client can still manipulate its legacy hub data;
private evidence makes changed events refuse this checked route, not the entire
shared hub. Other owners' requests, targets and receipts remain isolated.

## Prepared receive and acknowledgement contract

`21_roadmap_hub_acknowledgements.sql` is a review candidate, not a migration to
run automatically. It depends on candidates 01/03/09/15/18/19 and their reviewed
catalog. It pins the hub request/link/cursor columns, constraints, owner/RLS
policies, lack of unexpected triggers, and the candidate 19 receiver body/settings.
Installation fails atomically on drift. Existing tasks, lessons and offline packs
are not rewritten. All new private tables have no client write policies.

1. `ga_roadmap_receive_task_event(p_seq)` authenticates a verified, nonanonymous
   owner, checks pause/mirror/protocol gates, locks the actual owned WF → RM
   `task.upsert`, retains exact event evidence, and calls candidate 19 internally.
   Returned payload/address/direction must match the saved client intent.
2. The paired loopback Roadmap client applies the confirmed current rows, preserving
   newer local edits. It flushes the subscribed view before requesting ack. Pending
   intent stays in its existing owner/sequence slot.
3. `ga_roadmap_ack_task_event(p_seq)` requires that private receive evidence and
   mirror receipt, checks the current owned pair/target, and derives link address
   and deletion state. It accepts no browser target ID, app, status or reply.
   Event, link, cursor and immutable acknowledgement receipt commit atomically.
4. Only a matching ack response clears the original local slot. Lost responses,
   reloads and account changes retain recoverable original-owner work. A retry
   first reads/applies the current server rows, then replays ack without modifying
   the prior event/link/cursor timestamps. The generic consumer does not ack again.

Outcomes are `paired`, `orphaned`, `unpaired` (no target or locally deleted target
without a link), and `superseded` (a newer mirror/completion/link already exists).
No outcome recreates a deleted task. An existing link to an unexpected target
requires reconciliation. Replaying an acknowledged event with changed evidence
or terminal state also refuses. Cursor high-water values never decrease; they
are metadata, not proof that every lower sequence was applied. The original hub
must continue selecting pending rows, including lower sequences.

The server can confirm owned writes and acknowledgements; it cannot independently
prove a human saw the screen. Browser acceptance verifies rendered task state
before the ack transport call. Client display ordering is not a security boundary.

## Scope of the paired client

Only Roadmap `access/` changes; `.staging/session-fixture` is generated and ignored.
Root runtime, Auth storage, public assets, deployment settings and automatic hub
startup remain unchanged. Legacy offline/check-in/outbox data is preserved.
The actual copied client/adapter/handler are tested together on loopback with
synthetic transport. Only WF → RM `task.upsert` uses checked acknowledgement in
that consumer. Other kinds are retained for their separate contract review,
without applying their handlers, rejecting them, or calling legacy defer/ack.
Standalone prepared suggestion and study handlers still have their prior tests;
they are not activated by this generic consumer. Direct copied `ack`, `reply`,
`orphan`, document and place mutations fail closed. Publication still means
received by the hub, not applied by a target.

## Installation and rollout prerequisites

No installation is authorized by this PR merge. Before a later approved window:

- Reconcile the live General_apps (`wylxvmkcrexwfpjpbhyy`) catalog with these source
  pins, current Roadmap/Akatsuki callers and the prior G0 recovery checkpoint.
  Do not use the Technical project or reapply the six Commonplace migrations.
- Complete the remaining shared-app authorization/caller review. Decide how
  independent app authority is enforced (trusted server capability or an explicitly
  owner-authorized model); frontend names, origin headers or registry rows are
  insufficient. Eliminate bypass paths during the coordinated cutover.
- Review existing hub links, terminal events, old receive receipts and local pending
  slots for each owner. Do not silently adopt legacy delivered events. Preserve
  uncertain records for explicit reconciliation.
- Quiesce relevant callers and coordinate candidate 21 with the new client. It
  revokes browser execution of the old three-argument mirror receiver in the same
  transaction; deploying that revocation alone would break the old prepared client.
  The old function remains a private implementation dependency of the wrapper.
- `ga_private.roadmap_hub_access` starts empty. An authorized operator may only add
  a verified owner after recorded protocol review; mirror access is also required.
  Other candidate gates remain independent. Do not bulk enable existing users.
- Retain receive/ack receipts and local pending data for retry. Establish reviewed
  retention/erasure and reconciliation rules before production; no automatic
  receipt deletion or downgrade is supplied. Containment disables both new RPCs
  independently even if another component cannot be stopped. Never restore the
  unsafe old browser grant as an automatic rollback.
- Complete physical-device, offline/account-switch and multi-device acceptance,
  provider configuration, deferred restoration and the final G0 decision before
  enabling signup or restricted learner sharing. Do not clear website data.

## Acceptance and next bounded group

Synthetic PGlite tests reproduce all seven source limitations above and test
checked receive/ack, owner/default-deny gates, changed evidence, unsafe sequences,
UTF-8/opaque-address preservation, terminal replay, out-of-order links, exact orphan
scope, local deletion, rollback and catalog drift. The existing mirror suite
retains its payload bounds/history tests. Disposable real Auth/Postgres acceptance
adds concurrent receive/ack, committed lock waits for revocation/ownership/pause,
and atomic rollback. Full Commonplace regression/offline tests remain required.
Roadmap tests cover account changes, saved-byte conflicts, delayed/lost ack,
render-before-ack, actual copied SDK/adapter behavior and writer gates.

The **next bounded G0 group** is exact-request acknowledgement/reply contracts
for the remaining prepared suggestion/study consumers. Then review shared-document
and place writers with version checks, sender capability/owner policy and all
actual callers before enabling them. This source audit provides reproducers for
those groups; it does not certify or activate them. Commonplace Admin Studio
activation and learner sharing remain held until the wider G0 gates close.


Follow-up: [candidate 22 readiness](ROADMAP-CONSUMER-ACK-READINESS.md) now prepares
the remaining suggestion/study consumer acknowledgement group. Its source review
preserves the incoming no-reply contracts; the five new APIs and paired client
remain candidates, with hosted activation and all wider G0 holds unchanged.
