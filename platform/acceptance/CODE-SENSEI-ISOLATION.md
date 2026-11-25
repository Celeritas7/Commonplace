# G0 — Code_sensei isolation preparation

2026-11-26 (Japan). Prepared from Commonplace main `8cdd59931272d431af5f580a3a05faefd5907bbd`
and Code_sensei main `6f9ac364791c8d5e9c9ecc60ca7fe54073db65e8`.
Only hosted catalog metadata was read. No learner records, hosted writes, signup,
provider calls, enrollment or recovery operations were performed.

## Coverage

The six tables originally flagged were not the whole surface. The current catalog
contains 23 tables, including exercise attempts and game progress. No Code_sensei
views, application triggers or extra public routines referencing them were observed.

| Contract | Tables (prefix `code_sensei_`) |
| --- | --- |
| Own identity, browser read only | `users` |
| Original app UUID owner | `user_notes`, `progress`, `chat_history`, `revisions`, `streaks`, `py_projects`, `notebooks`, `exercises` |
| Original app UUID stored as text | `player`, `daily`, `wrong_answers` |
| Parent ownership | `attempts`, `mistakes`, `py_files`, `revision_files` |
| Shared curriculum, membership required | `challenges`, `course_days`, `diff_explanations`, `ecosystems`, `lesson_steps`, `lessons`, `line_explanations` |

[Candidate 05](../operations/general-apps/05_code_sensei_isolation.sql) follows
01 and 02. It is outside automatic migrations, not a seventh CP migration. It
refuses absent cutover evidence, unverified/unmapped owners, ownerless records,
orphan children, mismatched mistake/attempt links, duplicate players and unreviewed
schema/policy/RPC/privilege drift. No identity is inferred or backfilled.

RLS and effective grants separate verified owners and deny anonymous/unmapped
accounts. Original IDs and payloads remain. Owner fields become non-null and
immutable; children inherit parent ownership. A composite constraint ties mistakes
to the same exercise as their optional attempt. Daily missions and wrong answers
become unique per owner without deleting existing rows.

Shared content allows member reads. Only the existing course-day/diff-explanation
INSERT paths remain available to a mapped, verified admin/operator. No browser
shared UPDATE/DELETE can cascade into another owner's records. Review jobs and
preseed course days for viewers before activation.

Invoker RPCs retain RLS. Account-scoped receipts make offline retries idempotent
and reject a changed payload for an existing operation. Atomic project saving
rolls back the replacement if a file fails. Private receipts have their own RLS.

## Owning client and preserved work

The companion Code_sensei change supplies an explicit staging builder and tests;
its production entry points are unchanged. The generated app uses verified
Supabase sign-in, caller-only identity resolution, JWTs on private requests and
Edge entitlements. It removes name lookup and shared AI-secret transmission.

Personal responses, Compose drafts and pending operations are scoped by Auth and
legacy UUID. Switching hides the old page, stops pending responses and requires a
reload. Offline reopening uses the last verified account's seven-day local permission.
The worker retains old packs but never serves old mixed REST caches. This prevents
accidental mixing; it is not encryption or remote erasure of downloaded content.

Unscoped drafts and queues remain preserved. Draft recovery requires an explicit,
verified original owner and keeps conflicting copies. Old queues need owner and
retry reconciliation before cutover; they are not deleted or replayed blindly.

## Verification and remaining evidence

PGlite tests exercise every personal table, parent ownership, editor boundaries,
anonymous/unmapped/revoked identities, retained rows, installer rollback, retries
and transactional saves. The guarded disposable Supabase runner additionally
checks real Auth JWTs, PostgREST separation, concurrent duplicate operations and
file replacement. All fixtures are synthetic.

Client unit/browser tests cover scoped requests/storage, delayed responses,
revocation, cold offline reopen, old-cache isolation, queue retries, legacy recovery
and unchanged production files. Browser Auth is mocked; real Google/provider and
physical iPad acceptance remain separate.

G0 stays open. Reconcile current catalog/source, original owners, saved-work queues,
jobs, actual schema exposure, canonical Edge handlers and provider/device behavior
before installation. Recovery remains deferred at the user's request and required
before hosted rollout. The [G0 checkpoint](G0-READINESS.md) and
[rollout order](SIGNUP-ROLLOUT.md) still apply. Other shared applications and
remaining project-wide access gaps are not closed by this preparation.
