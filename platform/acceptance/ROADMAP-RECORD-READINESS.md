# G0 — Roadmap related-record ownership readiness

2026-11-26 (Japan). **Preparation only; no hosted installation or G0 clearance.**
Commonplace #117 and Roadmap_advanced #18 are merged. This work starts from
Commonplace `7906f2dd4c6f688072304309532c7499aabd685d` and reviews Roadmap
`93162665222b83ab03c840efd10303508f90db47`. Restoration stays deferred at the
existing private checkpoint.

## Findings and prepared correction

Read-only General_apps catalog inspection confirmed the remaining eleven Roadmap
tables use authenticated UUID owner policies. Several actual parent links still
checked only the parent's ID, allowing an owned child to reference another
account's parent despite RLS. The comparison pick had no membership constraint.
The existing project-to-role foreign key attempted to clear both `role_id` and
non-null `user_id` when a role was deleted, refusing that legitimate operation.

[Candidate 09](../operations/general-apps/09_roadmap_record_ownership.sql) requires
01/03. It validates the exact reviewed columns, constraints, ordinary triggers,
owner policies and comparison/timestamp function bodies before proceeding.
Installation locks the affected tables, has bounded lock/statement timeouts, and
commits as one transaction. It performs no row rewrite, ownership assignment,
history cleanup, or identity backfill. A mismatched historical link or invalid
pick aborts the transaction, including earlier grant changes.

| Record / relationship | Prepared enforcement and retained behavior |
| --- | --- |
| Daily logs → tasks | Same owner; task deletion clears only the task link and retains the log and its owner |
| Comparisons → tasks | Same owner; task deletion retains the comparison and clears only the task link |
| Suggestions → Roadmap tasks | Same owner when linked; null local task IDs remain valid for hub suggestions |
| Task resources → tasks | Same owner; current owned-child cascade behavior is retained |
| Comparison items → comparison | Same owner; current owned-child cascade behavior is retained |
| Comparison → chosen item | Item belongs to that exact comparison and owner; deleting the item clears only the pick |
| Projects → role | Existing owner-qualified link retained; role deletion clears only `role_id`, preserving project ownership |
| Roles and role/place links | Existing owner-qualified role constraint and owner policies retained |
| Context map, settings, suggestion answers | Existing row ownership and data formats retained |

All eleven tables retain authenticated SELECT/INSERT/UPDATE/DELETE under their
existing owner policies. PUBLIC/anonymous access and unused browser TRUNCATE,
TRIGGER, REFERENCES and MAINTAIN privileges are removed. Inherited/column grants
that defeat the intended privilege set stop installation for review. The answer
identity sequence permits allocation but not browser sequence reset/read grants.
Existing service-role table access remains privileged and unchanged.

The original `roadmap_save_comparison(jsonb)` stays **SECURITY INVOKER**, with its
signature, payload and body unchanged. Its complete save/failed replacement is
tested with the new constraints. This is compatibility evidence, not a redesign
of its destructive replacement, selection-reset or concurrency semantics.
No new privileged browser RPC or app-role admission system is introduced.

## Caller distinctions that prevent damaging overconstraints

Reviewed `src/store/sync.ts`, `resourceSync.ts`, `compareSync.ts`,
`src/lib/suggester.ts`, the comparison migration, settings migration and hub
place handoff in Roadmap. Current requests use flat table reads, owner-defaulted
inserts/upserts, direct patches and the existing comparison RPC. No current
request needs the removed administrative table/sequence privileges.

- `suggestion_answers.suggestion_id` is a logged external event reference.
  `onAnswer` deliberately records unknown/expired suggestions before attempting
  an owned lookup. Adding a mandatory parent FK would reject legitimate replies.
  The existing `(user_id, seq)` retry key and null sequence behavior remain intact.
- `role_locations.location_id` is a hub-owned logical address, and retired places
  deliberately retain role links. No guessed FK to a hub table is introduced.
- `contexts_map.id` remains its existing global key. This candidate neither
  changes key semantics nor certifies new multi-user context creation.

There is no companion runtime change for 09: existing API shapes remain intact.
The earlier opt-in daily-session preview remains separate from live client
activation. Actual hub producers, import tools, background callers and device
acceptance still need owning-app evidence.

## Acceptance and safe rollout

The synthetic baseline reproduces reviewed schema, policies, triggers, identity
sequence and invoker routine using invented records only. Tests verify preserved
notes, weights, picks, histories and owners; wrong-account reads/writes and
parent links; same-owner wrong-comparison picks; explicit deletion semantics;
unknown replies and retired places; valid/failed legacy comparison import;
historical mismatch rollback; and schema/policy/trigger/function drift refusal.
Disposable Supabase CI adds real JWT/PostgREST checks, settings and reply upserts,
transaction rollback, retained history and a child insertion waiting across a
committed parent ownership change.

Before hosted use:

1. Resume the existing recovery work when scheduled, retain its evidence and
   review original ownership/picks. Do not repair an invalid link by guessing,
   deleting history or changing its owner to make installation pass.
2. Reconcile current source/catalog drift and every owning caller. Review 01 →
   03 → 09 in its approved maintenance scope; 08 remains independently required
   before enabling the atomic daily-session client.
3. Compare records and effective privileges before/after in the approved target.
   Test allowed and denied requests with real intended accounts. Failure keeps
   activation on hold; do not restore broad grants as an automatic fallback.
4. Retain 09's constraints during any routine pause. Candidate 90 pauses the
   session RPCs; it is not a whole-Roadmap data freeze and does not undo these
   constraints. Any wider containment requires its own reviewed scope.

## Remaining G0 work

This prepares ownership and grant correction for all eleven remaining Roadmap
tables; it does not certify the entire app. Comparison replacement/retry and
stale-edit handling, suggestion/hub delivery, daily-reset/editor failures,
account-scoped local state and actual session-handshake callers still need
acceptance. Broader shared-app permissions, remaining Edge entitlements,
API/Auth/provider configuration evidence, recovery and the final G0 decision
remain open. Existing owner policies are not an app-admission allowlist.

The six Commonplace migrations and both null activation configurations are
unchanged. Hosted SQL, signup, enrollment and deployments remain on hold.
Existing Commonplace/Excel study material, progress and offline packs are untouched.
