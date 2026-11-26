# G0 — Roadmap task creation and capture recovery

2026-11-27 (Japan). **Preparation only; G0 remains open.** Commonplace #129
is merged at `8170aab20c0b328abfe05c735ef2673efe14525a`; Roadmap #23 is merged at
`80d1584b52a37198ad906c46cef864ad295a6cbd`. This is the next bounded G0 work group,
not an added rollout phase. General_apps remains the selected backend. Hosted
SQL/Auth/deployment, signup and enrollment stay on hold. Restoration remains
deferred at its existing checkpoint. No live catalog or personal records were
queried for this work. Existing Excel work and offline study packs are preserved.

## Confirmed failures and bounded correction

The old Group add form clears its title on blur and immediately after sending an
unawaited save. Capture clears text before iterating separate root/folder/task
inserts. An uncertain network response can be retried with a fresh database UUID,
creating another task or folder; an interrupted batch can be partially saved.
Older structural operations also restore whole-tree snapshots after failure,
which can hide a task confirmed during their lifetime.

[Candidate 15](../operations/general-apps/15_roadmap_task_creation.sql) adds
`ga_roadmap_create_tasks(p_payload, p_request_id)` after **01 → 03 → 15**. It changes
no existing rows, six Commonplace migrations, session API or legacy direct writer.

| Contract | Prepared behavior |
| --- | --- |
| Caller | Current verified, non-anonymous Auth UUID; active Roadmap control locked through the transaction |
| Task | Explicit request/task UUID, title, tags and optional current owned group parent; server supplies completion, streak, timestamps and append position |
| Capture | Up to 32 explicit item UUIDs, original input text and classifications; missing Captured root/category groups and all tasks commit together |
| Folders | Reuse only current owned groups; reject ambiguous names, missing expected category/inbox tags and reserved Weekly Focus mirror tags |
| Validation | Exact fields, 4096-byte title, 32 unique tags of at most 80 UTF-8 bytes, original capture text at most 32 KiB, server JSON at most 64 KiB |
| Retry | Original account/request/payload; return current owned rows instead of an old snapshot or another insert |
| Deletion | Retain private creation evidence and globally unique UUID reservations; missing/foreign tasks or original capture groups reject replay without recreation |

Requests serialize per owner; concurrent calls through this endpoint reuse one
capture root/category folder and the same request inserts once. Existing direct
writers do not participate in that serialization. No global title uniqueness or
application admission allowlist is claimed. A verified account can create its own
root task under the existing owner policy; admission remains a separate G0 gate.

Installation pins the task columns, ownership policies, parent constraint and
reviewed update trigger. Drift stops the transaction without rewriting history.
Reused folders with unsupported nullable legacy fields stop the whole batch for
review before any task or receipt commits. The internal insert helper has no
public/client EXECUTE privilege. Private
receipts/reservations have RLS and no public, anonymous, authenticated or
service-role table grants. Rows, UUID reservations and receipt commit or roll back
together, including suppressed writes. The receipt stores newly created rows;
reused folders are not claimed as new creations. This is creation evidence, not
a complete task edit history or restore API. Review retention/account erasure
before installation; do not prune identities while saved retries can exist.
Candidate 90 optionally revokes this public RPC even if its pause step fails.

## Isolated owning-client preparation

Roadmap's pinned builder replaces only the ignored fixture's add/capture forms
and store actions. Root source, public files, existing origins/auth keys, hub
protocol and Pages deployment stay intact. The fixture still uses loopback-only
synthetic configuration. There is no paid AI or hosted integration.

A valid Save attempt persists its exact request and item UUIDs before sending.
Unsubmitted text is in-page only; blur and Close preserve it while mounted. The
recovery panel previews original text/titles and retries after reload. Normally
pending requests must be resolved before another creation. Each request uses a
separate account-owned storage slot so simultaneous tabs cannot overwrite each
other's saved envelope. The 48 KiB UTF-8 envelope cap stays below the server JSON
cap. Quota failure leaves the visible draft and sends nothing.

First acknowledgements validate every requested item and capture parent path.
Replay accepts current owned rows, including later metadata edits. Missing,
foreign or malformed replies, account A → B → A, changed saved bytes or failed
cleanup retain the retry. Positive confirmation clears only the form associated
with the same request and submitted draft. Another tab's confirmation cannot
clear different unsent text. Discard removes only that exact local retry and
requires reload before new creation; it never undoes a committed server insert.

Only returned row identities are merged into the current tree. Unrelated edits,
notes/logs and study proof remain. Target rows changed while awaiting a reply
are kept for review. The whole lifetime of legacy tree mutation/rollback is
serialized against creation, including the existing addFolder path. Old capture
automatic retries and optimistic timed Undo are absent from this preview; confirmed
tasks can be reviewed in Inbox before explicit deletion. Full structural and Undo
recovery are the next work group. No personal storage or offline data is cleared.

## Acceptance and next work

Synthetic SQL tests cover unchanged installation, single/batch creation, exact
fields, original request replay, current metadata, count/byte limits, reserved
mirror tags, foreign/unverified identities and parents, ambiguous folders,
suppressed row/receipt/identity writes, deletion, UUID reuse, revocation, drift
and containment. Four disposable Supabase groups add real synthetic JWTs,
concurrent duplicate/different requests, parent ownership waits, receipt rollback,
current-state replay, no resurrection and committed pause/verification revocation.

Controller tests cover persistence, malformed replies/storage, quota, account
changes, independent tab slots, caller mutation, explicit acknowledgement and
count/UTF-8 limits. Browser scenarios exercise the actual copied Group and
CaptureSheet, retained blur/failure drafts, uncertain save/reload, duplicate-free
retry, whole-batch capture, older delete rollback, overlapping local edits and
another form's separate draft. Type checking/build and prior regression suites
remain required. Hosted/device acceptance is still open.

The subsequent [structural task/deletion preparation](ROADMAP-STRUCTURE-READINESS.md)
now covers moves, reordering, folder creation, deletion review and retained history.
The next work remains
suggestion/hub delivery, actual study callers and account-scoped local state.
Shared-app/Edge admission, API/Auth/provider evidence, deferred recovery and an
explicit final G0 decision still precede hosted rollout. Merging preparation does
not enable restricted learner sharing.
