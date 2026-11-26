# G0 — Roadmap comparison import recovery

2026-11-27 (Japan). **Preparation only; G0 remains open.** Commonplace #121
is merged at `b343566c586f960191d5f76ce5f757c4e56339fb`; Roadmap #19 is
merged at `1d34aa6217bf3f2f712a8dcd4099b8a6c927e0ae`. General_apps remains
the selected backend. Restoration stays deferred, with its existing resume note.

## Confirmed gap and prepared contract

The legacy `roadmap_save_comparison(jsonb)` discovers tasks/comparisons by title,
can create new tasks on repeated imports, and deletes/reinserts products on
replacement. It clears the owner's choice even though its original comment says
otherwise. It has no version precondition or request receipt. A failed transaction
rolls back, but retrying an uncertain successful request can still replace newer work.

[Candidate 11](../operations/general-apps/11_roadmap_comparison_imports.sql) is
additive. The old function, direct table API, runtime client and existing data stay
intact until owning callers have a separately reviewed cutover. No old import is
silently redirected to the new contract.

| Operation | New contract |
| --- | --- |
| Preview | `ga_roadmap_preview_import(comparison_id)` returns the owned study/products and an opaque revision covering **both** parent and child fields |
| Create | `ga_roadmap_import_comparison(comparison_id, task_id, null, document, request_id)` requires an explicit unused comparison UUID and an existing owned task UUID; it never creates or discovers tasks |
| Replace | Same RPC with the explicit comparison/task and preview revision; stale parent or product changes reject the whole request |
| Retry | Keep every argument, product UUID and request UUID. One owner/request identifies the original import. A confirmed replay rechecks access and returns current state, never the old imported snapshot |
| Conflict | Keep the original import, review current data and explicitly discard/reprepare if desired. Never silently exchange the expected revision |

All calls require a currently verified, non-anonymous Auth UUID and the active
Roadmap action control. Preview and import lock the parent and existing children;
the parent lock also fences new child FK insertions. Imports serialize by owner
before checking request identity, including concurrent creation. Existing direct
product changes are included in the revision even when they do not update the
parent timestamp. Replays after deletion or ownership loss deny access and never
recreate a target. Candidate 90 revokes both optional endpoints even if pausing fails.

The document permits title, need/source/notes, a nonempty products array and an
explicit choice-clearing decision. It cannot change the owner, task or weights.
Products carry stable UUIDs, not title matching. Existing IDs keep their creation
dates and omitted fields, including notes. The array replaces active membership;
omitted products are removed from that active list. If the chosen product would
be removed, the server requires `clear_missing_choice: true`. Otherwise the pick
and weights are preserved. An explicitly supplied null note clears that note.

Import validation limits 1–100 products and 256 KiB of PostgreSQL JSON text, with
bounded text/lists/extra fields, valid numeric ranges, unique IDs and HTTP(S)-only
links. Arbitrary columns, owner fields, nested executable content and empty
replacements are rejected. Text is treated as text, never evaluated. The staged
caller has a conservative 240 KiB JSON limit; a server refusal retains the retry.
These limits do not change Commonplace study-backup export/restore or old readers.

Every success atomically writes a private receipt with the exact request and full
before/after snapshots. Product failures, suppressed writes and history failures
roll back the entire replacement. The table has RLS and no public, browser or
service-role grants. History is deliberately retained after legacy deletion;
review retention, recovery and account-erasure handling before hosted installation.
Do not prune receipts while a saved retry can exist. There is no automatic restore
endpoint: restoring a historical snapshot needs a separate deliberate review.

## Owning-client preparation

The matching Roadmap `access/` builder pins the original comparison migration and
source inputs. Only its isolated loopback staging copy gains an import review
panel in the actual comparison dialog. The operator loads/pastes JSON, previews
before/proposed data, explicitly confirms a replacement, and can retry or discard
an unconfirmed request. The panel accepts replacements for the open study; the
new-create contract is tested for future external callers, without a new task UI.

The exact confirmed intent is saved under its original account/comparison before
transmission. Quota failures prevent sending. Failed/uncertain acknowledgements
retain it across reload; duplicate clicks share one request. A different intent
cannot overwrite it. Account generations reject late replies across A → B → A.
Newer cross-tab retries are never removed by an older response. Pending imports
and preference changes must be resolved in order; a late refresh cannot overwrite
a confirmed import or unrelated local edits. Discard never undoes a server commit.
Draft text before confirmation remains an unsent dialog draft; keep source files.

Original runtime sources, personal auth storage, public assets and deployment are
unchanged. The synthetic staging backend is loopback-only, with a separate auth
key and hub consumption disabled. There is no hosted credential, provider call,
real learner record or actual owning-importer cutover in this work.

## Acceptance and next gates

SQL fixtures cover preserved IDs/notes/weights/picks/history; creation/replacement;
uncertain acknowledgements; current-state replays; stale child edits; conflicting
identities/targets; invalid/oversized data; chosen-product removal; partial-write
rollback; pause/revocation; legacy deletion; drift refusal and containment.
Disposable Supabase CI adds real JWT denial, concurrent duplicate creation and
competing replacements, child edits/insertions committed while a request waits,
receipt-failure recovery, and pause/verification changes blocking an old replay.
Client tests exercise durable retry, quota/cleanup failure, malformed responses,
account switches and cross-tab changes. A browser test drives the actual staged
dialog through review, denial, retry, preserved unrelated edits and a late refresh.

Review 01 → 03 → 09 → 10 → 11 before a controlled comparison-client cutover.
Candidate 08 remains separately required for daily-session actions. Reconcile the
current hosted catalog and all original callers first; preserve legacy receipts,
product versions and pending device requests in recovery evidence. Existing SQL
console importers need explicit target/item IDs and verified-user context; do not
fake a JWT or add a user-ID override. Their original API remains available and is
not contained by these new RPC pause checks.

The next G0 owning-app work remains Roadmap editor/daily-reset failure handling,
suggestion/hub delivery and caller/account-scoped state acceptance, followed by
remaining shared-app/Edge entitlements and API/Auth/provider evidence. This bounded
import preparation does not certify all of Roadmap or create an app-admission
allowlist. Recovery, real device/caller tests and an explicit final G0 decision are
still required. Six Commonplace migrations, null activation configs, Excel,
progress/notes/bookmarks and offline packs remain unchanged. Hosted SQL,
deployment, signup and learner enrollment stay on hold.
