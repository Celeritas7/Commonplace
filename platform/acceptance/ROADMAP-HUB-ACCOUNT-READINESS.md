# G0 — Account-safe hub queues and background lifecycle

Prepared 28 November 2026 (Japan), following Commonplace #145, merged at
`01a163ae7db7b97250994efb272d2e62e2ca7245`, and Roadmap #29, merged at
`2312d84c3093d91fc402087132830a1243548c2e`. This is a bounded work group within
G0, not a new rollout phase or permission to share restricted learner access.
Hosted SQL/Auth, deployments and enrollment stay on hold. Restoration remains
deferred at its existing checkpoint; none of the completed recovery is repeated.

## Confirmed source and scope

The pinned Roadmap sources share `akatsuki_outbox_rm`, check-ins and context
preferences between accounts. The old client flushes with the SDK's current
account, removes contract errors, and retains an anonymous online listener.
Its global leader lock never releases, lacks account identity and falls back to
running in every tab when Web Locks is unavailable. `rmHub` has untracked timers,
listeners and caches, including location context. A late handler can acknowledge
after an account switch.

The paired Roadmap preparation changes only `access/` and generates an ignored
loopback copy of the actual client, adapter, hub wiring and suggester. Root
`src/`, `public/`, deployment workflows, personal Auth storage and existing
offline packs remain unchanged. Automatic hub startup remains disabled.
No new SQL candidate, migration, privilege or shared route is added here.

## Prepared behavior

| Area | Prepared contract | Acceptance evidence |
| --- | --- | --- |
| Durable queue | IndexedDB records keyed by verified owner, app and explicit request key; immutable full effect, atomic insert/compare and update; original ordering across tabs | Concurrent enqueue, same-key conflicts, reload, owner separation, count/UTF-8 bounds and malformed storage |
| Retry | Persist before any send; check actual original-owner hub record before retry and after publication; compare full address, payload, clock, direction, key and sequence | Lost response reconciles without publishing twice; empty/queued response and wrong evidence never confirm |
| Contract errors | Permanent blocks remain visible, stop later queued effects and are not automatically resent or deleted | Recovery panel, reload and repeat Retry retain the original block |
| Transport | Lazy SDK builders capture the original owner's current JWT, set explicit Authorization and abort signal, and reject stale responses | Account change during token lookup, RPC/query response, handler and A→B→A; anonymous/wrong-owner sessions denied |
| Background work | One visible online leader per owner/origin; cancellable waiting lock, single-flight consume, scoped timers/listeners, no unsafe fallback | Two-tab leadership, cancelled waiters, release/cleanup, stale consume cannot ack or continue to another handler |
| Context and memory | Account-scoped check-in/device/place/stuck/stale-day keys; no legacy ownership guesses; caches and suggestion view reset on stop | Real copied helpers preserve A's check-in, show none for B, and retain legacy notes/outbox/offline bytes |

`Hub queue recovery` shows only the current account's prepared records, Retry,
Refresh and contract blocks. Sent receipts are retained. **Sent means received by
the hub**, not applied by another app; target replies and study completion retain
their separate acknowledgement contracts. No new discard, implicit migration or
automatic pruning path is provided.

Limits are 1,000 retained records and 8 MiB canonical UTF-8 per owner/app, with
48 KiB per effect and 256 UTF-8 bytes per explicit request key. Both pending work
and retained sent receipts count. New work stops before sending at the limit;
existing work is not truncated. Retention/erasure and reconciliation of damaged
records need an explicit reviewed procedure before production use. Browser
storage eviction can still remove local data; this is not a database backup.

Account change/signout/pagehide invalidates the original scope, cancels requests
and stops timers/listeners; the held leader lock releases once its current tick
settles. Foreground/offline changes cancel the polling lease. An already sent
request may commit on the server; cancellation is not an undo. Returning to an
account does not revive its old scope. The wider prepared app still requires a
safe reload after account changes, preserving all saved data.

## Remaining gates

These browser guards are not authorization, encryption or independent sender
attestation. The current hub's owner-write policies, app registration, JWT/RLS,
dual-project identity mapping and route contracts still require joint review.
Other same-origin scripts can access browser storage. Web Locks coordinates tabs
on one origin, not devices; server idempotency and ordering remain necessary.
Unsupported browsers keep work saved and pause background sending.

Legacy outboxes/check-ins/cursors remain untouched and unadopted. They need an
owner-reviewed reconciliation procedure. No code guesses their owner from the
next login. Generic hub preparation does not replace the previously prepared
suggestion/completion/study-specific retry ledgers or activate actual callers.

Shared-document generation, tag guessing/corrections, banner/reminder startup and
legacy suggestion generation remain gated in the isolated boot. Their payload
ordering and account-bound callbacks are not certified by this work. The next
bounded G0 group is **shared hub protocol acceptance**, including link/orphan
acknowledgements, source/destination attribution, sender authority and remaining
document writers. Actual caller cutovers, shared-app permission fixes, provider
configuration, deferred restoration, physical devices and the final G0 decision
remain open. Commonplace Admin Studio activation and learner sharing remain held.

## Validation and rollout prerequisites

Run Roadmap's complete contract tests, fixture preparation, TypeScript/Vite build
and browser suite. Browser acceptance uses real IndexedDB and Web Locks with
synthetic mocked transport on loopback. It does not certify hosted hub SQL,
provider configuration, physical iPad/Android behavior or multi-device delivery.
Commonplace CI verifies existing platform/security/offline behavior unchanged;
this documentation adds no new database test claim.

Before any cutover: reconcile current source pins and hub catalog; accept the
remaining protocol contracts and actual callers together; decide retained-queue
limits/migration/erasure; verify Auth subscriptions for both projects; retain the
existing recovery checkpoint; test current users, denied accounts, account switch
and offline behavior on actual devices. A preparation PR merge does not authorize
any hosted action. Do not clear site data or reinstall saved study packs.

## Follow-up

The next bounded source review and checked mirror acknowledgement route are now
prepared in [Hub protocol readiness](ROADMAP-HUB-PROTOCOL-READINESS.md). That work
narrows the copied generic consumer to reviewed task mirrors; other prepared
handlers remain separately gated. Its receipt and caller-cutover requirements
apply in addition to this account lifecycle checkpoint.
