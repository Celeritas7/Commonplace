# G0 — Study completion reports and caller preparation

Reviewed 27 November 2026 (Japan), after Commonplace #142 merged at
`649d666470579e3043d5568c1db7888a8dfe8343` and Roadmap #28 at
`aef2f02f05679fed22416648643ccef647df590c`. This is another bounded work group
inside G0. Hosted SQL/Auth, deployments and learner enrollment remain on hold.
Restoration remains deferred at its existing checkpoint. Tests use synthetic,
disposable data; no hosted data was read or changed.

## Confirmed caller and evidence boundary

| Source | Observed behavior | Preparation |
| --- | --- | --- |
| Roadmap `src/lib/rmHub.ts`, merged #28 source | Trusts browser payload, defaults missing day to today and verification to app; refresh is not awaited | Read the actual owner-scoped hub row by sequence; no browser source, date fallback or verification parameter |
| Japanese_study_app_advanced `9dc3ecf44371d26891ee4e883eada84140fbf3e4`, `js/rmSession.js` | Sends a public key as Authorization to Roadmap's RPC; no user JWT, saved retry or checked acknowledgement body | A pinned copy is replaced only in the ignored loopback fixture with authenticated hub publication and owner-bound recovery |
| Same caller, `js/app.js:1221` and `:1498` | `finishStudy` and final SRS result call `rmComplete`; ordinary launch does not | Keep this interface and the goi/kanji/self-study/SRS result fields; do not report on app open |
| Same caller's handshake | Rereading a URL resets `t0`; missing day falls back to today; arbitrary `rm_ret` is followed | Preserve one start and original day per launch, require explicit owner/launch identities and allow only the exact Roadmap return path |
| Akatsuki R020 and its proposed JLPT adapter | Defines a daily key and transitional RPC plus stream publication | No live contract change. Candidate source registry explicitly selects daily or request keys after review; the fixture prepares one request key per launch |

The actual JLPT repository does **not** contain the proposed Akatsuki adapter.
Do not infer deployment from the adapter's comments. Other hosts in Roadmap's
legacy allowlist are not certified callers by this review. Commonplace's study
sections are not silently connected to this protocol.

The current hub allows an authenticated owner to write their own stream rows.
A matching stored event establishes an owner-scoped **report**, not independent
sender attestation or proof of learning. The existing storage value `app` is
retained for compatibility; the prepared UI says **app-reported**, including
streak descriptions. No verified assessment or admission decision may rely on it.
The private source gate records review; it does not manufacture sender authority.

## Prepared transaction and recovery

[Candidate 20](../operations/general-apps/20_roadmap_study_reports.sql) requires
01/03/09/19 and their earlier dependencies. It pins task/session columns, owner
policies, owner FK, timestamp trigger, legacy completion body and hub read catalog.
It adds an empty operator-only source registry, private receipts and per-task/day
sequence tracking. RLS is enabled; browser/service-role grants to these tables are
revoked. Containment includes the new optional RPC.

`ga_roadmap_receive_study_report(seq)` checks the verified non-anonymous account,
pause, enabled reviewed source, direction, actual hub record, exact original
address/payload, key mode, original date and owner vocabulary. Dates, durations,
counts and payload sizes are bounded. It locks the task and owned session, writes
the session and receipt atomically, and leaves task checkboxes, notes and other
study history alone. Replays return current rows without resetting completion
time. Older reports cannot overwrite later reports; newer local/legacy edits
require review. Existing app/API completion is preserved rather than adopted.
Deletion is never reversed. Current authorization is required even for replay.

The prepared Roadmap handler stores only the original sequence/task/day under
its authenticated owner. It uses a captured JWT, rejects stale account epochs,
retains retries on quota/errors, and updates the store before allowing the adapter
to acknowledge. A new local edit prevents replacement and retains recovery.
Neither the old pending keys nor existing downloaded packs are read or cleared.

The prepared JLPT module retains the existing function interface. Its new records
use separate account/launch keys in durable storage. Original `rm-handshake` and
study/PWA keys remain untouched. Publication is saved before sending, has an
explicit captured JWT, and checks the original hub record before retrying.
Queued/empty results do not confirm completion; a sent report stays pending until
the hub reports delivery. Contract blocks stay visible without automatic resend.
The fixture cannot be configured outside loopback. No token is persisted in it.

## Acceptance and remaining cutover requirements

SQL tests cover denial, rollback, exact evidence, ordering, preserved history,
deletion and installation drift. Real JWT/PostgREST tests add concurrent duplicate
receives and committed ownership, source-review, pause and Auth lock waits.
Contract/browser tests exercise the copied handler, adapter and caller module,
lost responses/reload, account A→B→A, newer edits, original-day/duration behavior,
safe return links and retained offline/legacy bytes. CI results belong to the PR
heads; they do not establish hosted or physical-device readiness.

Before caller activation, reconcile the two project identities, actual hub route,
vocabulary, sender authority and request-key contract with the owning apps.
Wire both account subscriptions and explicit recovery UI in the actual JLPT app;
move capture to the authenticated initialization point. Review legacy unsent
records without assigning them to the next signed-in account. Review the captured
token transport and removal of the old anonymous/direct writer together. Each
other study app requires its own source/caller acceptance. Never deploy just one
half or infer this approval from a preparation merge.

Next bounded work: shared hub protocol and account lifecycle, starting with
account-scoped outbox/check-in/leader behavior, now prepared in
[hub account readiness](ROADMAP-HUB-ACCOUNT-READINESS.md). Link/orphan acknowledgement,
caller cutover, remaining shared-app writers, provider evidence, deferred recovery,
devices and the final G0 decision remain open. No additional platform phase is
created here, and restricted learner sharing is not activated.
