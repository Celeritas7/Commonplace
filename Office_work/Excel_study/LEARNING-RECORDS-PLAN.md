# Excel R4 — durable learning records plan

**Status: design for review; no storage or runtime change.** Reviewed on
2026-11-27 (Japan) against Commonplace main
`83aa5ee4fe57565d7e26fd2ae7c997655b5ade2d`, after R3 merged in PR #122.
R4 completes the records-planning correction before F2. The implementation
packages below are future, separately reviewable work; this document does not
raise the current 40-submission limit or make personal session history persistent.

The design selects an immutable attempt journal, separate resumable study state,
and rebuildable curriculum progress. It preserves the original evidence and
distinguishes what was recorded then from what a current rubric can check now.
Permissions, profiles, personalized assignments and reporting stay in central
Commonplace Admin Studio. There is no Excel administration system.

## 1. Decisions and current evidence

| Decision | Reason and resulting behavior |
| --- | --- |
| Store each submitted attempt independently | History can grow beyond 40 without repeatedly replacing one large progress value. Page and transfer limits bound work, not the learner's lifetime attempt count. |
| Add a companion database; leave the U8 database at version 1 | R1 can reopen an older complete shell. That shell must still be able to open its existing study and pack database. |
| Retain every original source and evaluation | Migration copies evidence; it does not prune arrays, rewrite results, select the best score or invent missing submissions. |
| Treat progress as distinct dimensions | Reading, guided practice, independent assessment, quizzes and resume position answer different questions. |
| Combine distinct attempts; compare conflicting drafts explicitly | Choosing the worksheet to resume must not discard attempts from either alternative. Same-ID/different-evidence collisions need their own visible state. |
| Deliver compatible readers/recovery before journal writes, and append transport before cloud drain | Existing snapshot synchronization and backup v1 do not supply an indefinitely growing journal. Local-only persistence can ship with complete recovery; a local save, cloud receipt and complete backup have separate statuses. |
| Keep reporting behind a separate central permission contract | Current access to profiles or assignments does not grant access to another learner's study evidence. |

### Audited baseline

These are current-source observations, not features introduced by R4.

| Surface | What is retained now | Limit or interpretation | Source |
| --- | --- | --- | --- |
| Central assigned Excel | `worksheet.attempts`: UUID, client time, three input strings, formula, calculation acceptance/result; optional activity/tool evidence; new entries have `evaluation_version: 2` | 40 total per material progress record; latest five displayed. At the cap, new entries are refused; earlier ones are not pruned. | [History validator/appender](calculation-history.mjs), [assigned UI](assigned-lesson.mjs) |
| Personal Section 1 independent assessments | In-memory UUID, start/submission times, assessment/scenario references, recorded score and criterion responses | No persistence sink; no explicit count cap. The record does not retain a full worksheet snapshot. | [Assessment adapter](excel-assessment.js), [integration handoff](ASSESSMENT.md) |
| Personal F1 tasks | In-memory title/mode/score summaries and a set of passing independent lesson/scenario keys | Refuses new task submissions at 100; latest ten displayed. Summaries lack attempt IDs, submission times and formula/cell evidence. | [F1 page controller](excel-formula-page.js) |
| Personal reading/checklist | Unowned, origin-local `commonplace_excel_preview_v1` with `read`, `open`, `tasks` | No account, curriculum version, timestamp or assessed-pass provenance. Guided completion and quiz feedback are session-only. | [Section 1 page](Section_1_Study.html), [guided controller](excel-guided.js) |
| Central progress | Exact version-1 object containing `completed`, responses and worksheet | For SUM, `completed` follows `worksheet.applied`. For other materials, it follows **Mark as studied**. Document question responses are ungraded. None establishes independent mastery. | [Progress validation](../../platform/learn/progress.mjs), [workspace](../../platform/learn/workspace.mjs), [reader](../../platform/learn/reader.mjs) |
| Owned synchronization | One current value, CAS revision, one frozen pending operation, local conflicts/history | The server retains the current value and last operation, not an append journal. JSON is limited to 65,536 bytes; client JSON and PostgreSQL JSONB sizing differ. | [Sync store](../../platform/offline/sync-store.mjs), [account store](../../platform/lib/account-store.mjs), [current U9 RPC](../../platform/supabase/migrations/20261124235058_u9_explicit_mutation_lock.sql) |
| Conflict display | Current completion, formula and cell values | Attempts, criteria, activity and style/copy evidence can differ while the displayed summaries look identical. Resolution archives alternatives locally; only the chosen current value is synchronized. | [Offline host](../../platform/offline/host.mjs), [resolve operation](../../platform/offline/sync-store.mjs) |
| Study backup v1 | Current values, conflicts/history, distinct pending/base values; project and owner binding | 10,000 records, 32 MiB UTF-8 JSON, 10,000 alternative values per record. No silent truncation. Restore prevalidates all input/access, then commits per record; interruption is retryable, not globally atomic. | [Backup bounds/copies](../../platform/offline/backup.mjs), [restore](../../platform/offline/sync-store.mjs) |
| Administration | People/access, signup requests, profiles, material library and prompt preparation | No performance-report API/view. Existing study SELECT policy is owner-only with section access. | [Admin API](../../platform/admin/api.mjs), [U1 policy](../../platform/supabase/migrations/20261124124049_u1_access_foundation.sql) |

The goal is to permit later submissions while retaining the first 40. Attempts
refused by the existing cap, closed personal sessions and unrecorded quiz/guided
actions cannot be reconstructed. A migration must report those coverage limits.

## 2. Ownership, identity and versions

### Ownership is established by the host

Central journal access uses the existing verified account ticket, project
namespace and `office.excel` section. Recheck the ticket before and after async
work. Capture the owner with the submission; never infer it later from whichever
account is signed in when a queue drains. Owner fields in a backup or client
payload are claims to validate, not authority.

Standalone personal study gets a separate device-only workspace. Its random
installation identifier is a local grouping key, not an authenticated learner.
The shared login gate, matching names or a later sign-in cannot adopt that work
into a central account. Any future personal-to-account import requires an
explicit reviewed selection/ownership flow and a supported authorized target.
Personal F1 support alone does not authorize central publication of its lessons.
Synthetic Excel Test/preview owners remain isolated from both real scopes.

Keep current origins, installation identities, namespace, account keys and
offline packs. Safari and Home Screen installations must be tested independently;
the existing [E3 checklist](OFFLINE-SYNC.md#ipad-acceptance-checklist-fictional-sample-only)
does not establish that they share storage.

### Preserve source identities; add curriculum references

Central attempts retain the immutable material-version UUID/version, logical
assignment, complete lesson/concept/scenario/dataset/activity references and the
original `progressIdentity()` result. The current tuple and its long-key digest
are defined in [content contracts](../../platform/content/contracts.mjs);
[material adaptation](../../platform/materials/learner.mjs) makes individual/group
grant changes independent of that logical identity. Do not replace the key with
`sum@1`, a title, a profile ID or a current assignment-list position.

Personal records use exact lesson, scenario/dataset, mode and assessment
references from the reviewed adapter. Preserve these five context identities:
`jp-ph-trade@1`, `ph-customer-quote@1`, `mechanical-engineering@1`,
`general-office@1`, `monthly-expenses@1`. Titles are display metadata.

Keep these version domains separate:

| Version | Meaning |
| --- | --- |
| Journal envelope/evidence schema | How to decode and validate a retained record |
| Original material, dataset, scenario and assessment | Which content and inputs the learner actually used |
| Lesson/runtime/rubric reference | Exact behavior defined by [R3](CURRICULUM-ARCHITECTURE.md); no implicit latest-version fallback |
| Legacy `evaluation_version` | Validation of the originally recorded central calculation; absent and `2` retain their existing meanings |
| Record adapter / canonicalization version | How a known source is mapped and fingerprinted without changing it |
| Progress policy / curriculum-plan version | How evidence is summarized and which targets form the denominator |
| Backup / transport version | Recovery and exchange contracts, independently negotiated |

Unknown versions stay preserved and exportable, but are not graded or uploaded
as a supported format. A source with no rubric provenance stays explicitly
legacy/unknown. In particular, Section 1's historical assessment version `1`
does not prove which implementation graded it, and old central attempts did not
record a full historical practice grade.

## 3. Proposed record contract

This is a logical contract to turn into a schema and fixtures in a later PR.
No schema, SQL, new record kind or RPC is installed by this plan.

### Immutable attempt

| Field group | Required meaning |
| --- | --- |
| Identity | Envelope version; stable attempt UUID; source scope; exact learning target. A deliberate resubmission gets a new UUID, even with identical answers. |
| Provenance | Native or imported source, source locator/digest, adapter version and original record reference. Multiple identical source copies can point to one attempt. |
| Behavior | Activity/mode and exact curriculum/runtime/rubric refs where known. Separate free calculation, guided submission, independent assessment and quiz submission. |
| Evidence | Versioned, bounded union of submitted formula/input strings, addressed responses and observed style/copy flags, or quiz responses with exact question-set version. Preserve blanks, zero and literal formula whitespace. |
| Recorded outcome | Original calculation accepted/result and/or originally recorded criterion/score result; explicit `not_recorded` where absent. Client self-assessment provenance is retained. |
| Times | Original start/submission times only if present; separate local-record/import time. Device timestamps are descriptive and do not settle conflicts. |
| Integrity | Versioned canonical payload digest covering immutable identity, evidence and recorded outcome. Transport receipts and display labels do not change the payload hash. A hash is not proof that a learner performed an action. |

Store immutable payload separately from mutable delivery metadata, provenance
links and optional review annotations. Re-evaluation records its own rubric,
runtime, dataset identity and evidence digest; it never updates the original
accepted/result or score. If required evidence/content is unavailable, display
**Current check unavailable** with the reason.

For current F1/central graders, introduce an explicit reviewed criterion map
keyed by exact rubric version and activity before durable criteria are emitted.
Current returned criteria primarily contain labels and pass flags. Labels or
incidental array order are not long-term skill IDs. Test each map against its
released rubric; change the rubric version when meaning or grading changes.
Preserve existing Section 1 criterion IDs and its original score separately.

The first implementation must publish per-evidence field/count bounds and test
UTF-8 size with Japanese and Filipino text. Proposed initial ceilings are
32 KiB per new event, 50 events or 512 KiB per append request, and 100 events or
1 MiB per read page, whichever bound is reached first. These are design targets,
not current API promises. Verify that all released templates fit before adopting
them. Oversized/unsupported legacy sources remain archived; they are not clipped
to manufacture a conforming attempt.

### Progress and recovery records

Keep a mutable resume/draft checkpoint distinct from submitted attempts. Record
explicit reading mark/unmark actions and guided completion only when their
reviewed definitions actually occurred. A quiz submission needs an exact quiz
version and stable ID; current document selections are merely saved responses.
Do not log every navigation or autosave as an attempt.

A progress projection contains its policy version, exact target, source coverage
checkpoint, counts and evidence pointers. It is disposable/rebuildable from
retained facts and checkpoints; deleting a cached projection must never delete
attempts. Reading changes and resume choices use revision comparison, not a
monotonic OR that can never honor an unmark/reset.

The companion journal and future append protocol carry an explicit union of
`attempt`, `reading-change`, `guided-completion` and `progress-resolution` events,
each with its own bounded schema and stable event UUID. An attempt event retains
its original attempt UUID as that event identity. Other fact kinds never count
as assessment attempts. Central fact targets still require an exact authorized
material; standalone facts stay local until a separate adoption contract exists.

A reading change contains the desired marked/unmarked state and the known prior
event heads for that exact target. A causal successor replaces the displayed
state; concurrent equal choices can agree while both facts remain retained.
Concurrent contradictory choices stay unresolved until an explicit resolution
references every displayed head. Recheck that head set when saving the choice.
Do not order contradictory choices by client clock or silently OR them. Parent
references must belong to the same scope/target, have bounded counts and form an
acyclic history; pending parents are delivered before children. This metadata is
part of the new typed protocol, never an extra field in v1 progress. Resume
drafts continue to use their separate CAS checkpoint.

## 4. Local durability and old-client coexistence

### Companion database

The existing [database opener](../../platform/offline/database.mjs) calls
`indexedDB.open("commonplace-u8:" + namespace, 1)`. Upgrading that same database
would make an old shell's explicit lower-version open fail. The
[IndexedDB opening algorithm](https://w3c.github.io/IndexedDB/#opening)
defines that `VersionError` behavior.

Use a separate, versioned learning-records database per central project
namespace. Use a distinct personal device database and the same reviewed pure
record adapter where appropriate. Do not change the U8 database version, stores
or keys. The companion database needs stores/indexes for immutable attempts,
delivery intents/receipts, progress facts/checkpoints, projections, preserved
sources/collisions, and import/bridge checkpoints. Final names belong to the
implementation schema review.

Use transactions spanning the relevant companion stores; the current U8 helper
only transacts over one store. IndexedDB transactions do not span separate
databases. The draft bridge below is therefore explicitly recoverable rather
than pretending to be one atomic operation with U8.

### Save sequence

1. Capture a bounded worksheet/quiz snapshot, verified scope/target, exact
   evaluator refs and one attempt UUID. Freeze it for this submission. A save
   retry reuses those bytes and that UUID; later edits belong to another draft.
2. Validate/grade and compute canonical bytes/digest before opening the write
   transaction. Recheck ownership when it starts; do not wait for network or
   asynchronous hashing inside an active IndexedDB transaction.
3. In one companion transaction insert the attempt, append intent where
   applicable, source linkage, progress facts/projection update and a pending
   draft-bridge marker. The marker captures the U8 key, expected local revision,
   exact candidate draft and its digest. Enforce identity/digest uniqueness
   inside the transaction.
4. Report **Saved on this device** only after transaction completion. Cloud
   status remains **Waiting to sync**, **Local only** or **Synced** as applicable.
5. Independently persist the latest U8-compatible draft through its existing
   revision/ticket checks. Do not insert new journal IDs/fields or a growing array
   into the v1 payload. Mark the bridge complete only after the local U8
   transaction commits; cloud acknowledgment is a separate status.

If the bridge is interrupted, the committed attempt and its self-contained
snapshot remain available. On reopen, reconcile the pending bridge against the
captured draft revision; do not overwrite a newer draft. Offer the retained
submission as an explicit resume alternative. If U8 committed but the marker
update did not, recognize the identical candidate digest as already bridged;
otherwise retain the alternative and never retry over a newer draft. A failed
bridge means **Attempt saved; worksheet draft needs review**, not **Attempt lost**
or **Everything synced**.
New submissions are not mirrored into the old 40-item array. Old clients can
continue their existing bounded workflow; the new reader combines imported old
attempts and journal attempts by identity, without duplicating either.

A quota/transaction failure before journal commit leaves prior records and the
current draft intact, gives no durable pass credit, and retains the same pending
submission for retry while the page is open. If no storage is writable, do not
promise survival of that unsaved draft after closure; offer a direct recovery
export where possible and clearly label it unsaved. No history or complete pack
is evicted by application logic to make room. Browser persistence requests and
storage estimates are useful diagnostics, not a durability guarantee; the
[Storage Standard](https://storage.spec.whatwg.org/) separates persistent storage,
quota estimates and user-controlled clearing.

### Compatibility and rollback

Old shells keep opening their v1 database and complete cached release. They see
their existing bounded history, not new journal entries. Test this limitation
explicitly; an old shell's v1 backup is not a complete export of new journal data.
The new client must label a v1-only export as legacy coverage and offer the new
complete format after it has written journal data.

Do not rewrite an in-flight v1 operation, its UUID or base revision. Continue to
observe later v1 changes and import newly visible attempts. Turning the new
feature off stops new journal writes/drain while retaining the companion DB,
receipts, original U8 records and packs. Recovery needs a compatible journal
reader/exporter; loading an old shell alone does not expose the new history.
Never implement rollback by deleting the companion DB or downgrading its contents
into a truncated v1 array.

## 5. Additive migration and reconciliation

Migration operates only over the active verified owner's records, or within the
explicit personal-device workspace. Preserve the original data first and keep
it in place. It is a resumable copy, not a replacement or a one-time destructive
conversion.

1. Inventory and fingerprint each current value, pending snapshot, base value,
   unresolved conflict, archived resolution value and nested conflict. Include
   authorized v1 backup copies. Preserve the whole source envelope and lineage,
   not only `current.worksheet.attempts`.
2. Validate the envelope/identity and use the original evaluator for supported
   legacy attempts. Retain unknown/corrupt sources as quarantined, exportable
   recovery data. Do not coerce them into valid results or grade them by SUM.
3. Copy complete known attempts without altering UUID, strings, timestamps,
   activity, tool flags, absent evaluation markers or recorded outcomes. Add new
   provenance outside the original object. Adapter-derived associations are
   labeled as derived; they are not fields the old client recorded.
4. Commit destination records, source fingerprint and continuation checkpoint
   together in bounded transactions. An interrupted chunk is either committed
   or repeated; marking the source migrated must not precede durable copies.
5. Reconcile again on relevant legacy changes, reopening and restore. A source
   fingerprint, not a permanent global “migration complete” flag, determines
   whether there is new work. Old clients may still append to their v1 arrays.

| Encountered evidence | Required treatment |
| --- | --- |
| Same scope/target/attempt ID and same canonical payload | One retained attempt, multiple source references; no inflated count |
| Same ID with different payload or target | Preserve every variant and original source; visible identity collision; no overwrite or higher-score preference |
| Different IDs with identical answers | Distinct deliberate attempts; both count if otherwise eligible |
| Central legacy accepted/result without full practice grade | Preserve the recorded calculation; original practice score is **Not recorded**. A compatible current review is separate. |
| Section 1 record from an accessible live session | Preserve its UUID, assessment/scenario refs and criterion responses; do not fabricate a full worksheet or exact historical rubric provenance |
| F1 live-session title/score summary | Preserve as a legacy session summary with import provenance; not a full attempt with invented IDs, evidence or submission time |
| Unowned `commonplace_excel_preview_v1` | Leave it intact; a reviewed personal adapter can copy self-reported reading/checklist state into the device workspace only |
| Missing private content, unknown version, cap-refused submission or closed session | Preserve what exists and state what cannot be recovered/evaluated; do not substitute current/public data |

The new display may union distinct valid attempts from legacy alternatives, but
must retain each alternative as a source. A conflict choice or projection rebuild
never deletes those sources. Unsupported evidence is reported separately from
graded attempts, not silently counted as a failure or zero.

## 6. Future central append and read protocol

Keep `cp_sync_read` / `cp_sync_write` for mutable v1 state. The
[U9 implementation](../../platform/supabase/migrations/20261124235058_u9_explicit_mutation_lock.sql)
checks only the row's last operation; it is not permanent idempotency for all
attempts. A new protocol requires an additive schema/API review and separate
hosted approval. Existing immutable migrations are not edited.

### Append contract

The server derives owner from the authenticated caller, compares expected owner,
and rechecks current membership, section and exact material access under the
existing mutation-serialization boundary. Validate supported record schema,
target, evidence bounds and hashes; client self-scores remain self-assessment.
An offline lease, profile, imported owner field or catalog capability is not
permission to append.

Define event identity as owner plus stable UUID, with immutable event kind,
target and payload digest bound to it. Attempt events use their stable attempt
UUID; reading/completion/resolution facts use their own event IDs and validation
rules from section 3. Same UUID used for another target/kind is a collision,
not a second interpretation of the same event. Keep a durable receipt for every
accepted identity for as long as its event is retained:

| Request | Response and retained state |
| --- | --- |
| New supported identity/body | Atomically insert event and receipt; return the persisted digest and server cursor |
| Same identity/body after lost acknowledgment or intervening submissions | Return the original receipt without adding an event |
| Same identity with changed body/target | Collision response; original server event is unchanged. Preserve the local variant and returned reference in the local collision archive and backup. |
| Wrong owner, revoked target or unsupported contract | No append; keep the local intent/evidence with a reason. Do not redirect to another account, material or v1 write. |

Use per-event atomic acceptance inside a bounded batch. Return a receipt or
explicit failure for every processed event. If transport ends ambiguously,
retry the same identities/bodies; never infer success for an omitted item. A
collision pauses that event, not unrelated valid attempts. A later explicit
resolution can add a versioned annotation referencing both digests; it does not
erase or silently rewrite either variant. A locally retained rejected variant is
not described as already backed up in the cloud.

Browser roles must have no unrestricted update/delete path for journal rows.
New tables/functions need explicit grants, owner/target checks and RLS review;
new reporting views must respect their reviewed authorization contract. Current
[Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
distinguishes table grants from row policies and warns about view behavior.

### Read, pagination and acknowledgment

Read one authorized owner/material stream with a stable cursor and captured
upper checkpoint. Bound both rows and encoded bytes; provide an explicit next
cursor/completion flag. Persist downloaded events and the read checkpoint in the
same local transaction. Resume after interruption without skipping a page.
Do not use client submission time as a cursor or presume that an empty/truncated
response means no history.

The server cursor must follow commit visibility. A plain sequence allocated by
two concurrent transactions can be committed out of order. Select a transactional
counter serialized per owner/material stream, allocated with the event/receipt
and held until commit, or prove an equivalent no-omission mechanism. Page only
through the captured committed upper checkpoint. Later imports/late offline
submissions receive new cursors while retaining their original client times.

Scope checkpoints to the owner/material and authorization context. Revocation
pauses that stream and keeps its checkpoint/pending events; another account
cannot reuse them. On renewed authorization revalidate the target before resuming.
Do not advance a global cursor past hidden materials and then lose their history
when access changes. Index the actual owner/material/cursor predicates and prove
bounded traversal with representative data before release.

Cloud acknowledgment updates only the matching frozen event intent. Concurrent
new attempts or draft edits remain pending independently. Account change during
request/receipt handling aborts the view and drain; it does not reassign work.
Offline rendering continues to obey the existing saved-owner/lease boundary.
Retaining private evidence locally is not new permission to display its content.

## 7. Persistent progress and central reporting

### Progress dimensions

| Dimension | Source and defensible meaning |
| --- | --- |
| Reading | Current explicit mark/unmark for an exact content version, with legacy checklist state labeled as self-reported |
| Guided | Recorded guided submission or separately defined guided-completion fact; not independent mastery |
| Independent | Distinct submitted attempts, original outcome and latest/best eligible results under an explicit exact rubric policy |
| Quiz | Submitted response set; correctness only when a reviewed question/key/rubric version exists. Current central document choices are ungraded. |
| Free practice | Exploratory calculations; no automatic guided/independent credit |
| Resume | Last selected context/lesson and saved draft/location; no attempt or pass credit |

Each projection identifies the scope, exact target, mode, applicable rubric,
projection-policy version and source coverage. Independent pass counts refer to
distinct targets, not number of times a learner clicked Apply. Repeated backup
imports, transport retries and old/new storage mirrors do not add credit.

The initial pass policy counts a target when it has at least one retained,
non-colliding full independent pass with known exact target/rubric provenance
and sufficient evidence. Show the latest outcome separately: a later failed
retry does not erase that earlier achievement. A title-only summary, unknown
historical rubric, free calculation or newly inferred legacy score does not
qualify. A later policy may explicitly recognize compatible re-evaluated evidence,
but must name that policy and retain the distinction from recorded passes.

Use a versioned curriculum plan with an explicit target list for any denominator.
For example, “3 of 5 independent formula targets passed in JP–PH inventory,
plan v1” is defined; “60% Excel mastery” across free practice, reading and quizzes
is not. A new material, lesson, scenario, dataset, runtime or rubric version starts
separate evidence and progress. Recognition of prior learning requires an
explicit versioned equivalence decision and points back to the original evidence; it never rewrites
old keys or silently carries passes forward.

Profile/group changes may shape future assignments but do not change the
dataset, currency units, rubric or context of a previous attempt. Prioritize
inventory, quotations, customer follow-ups, fictional JPY/PHP conversion,
shipping, costs and profitability for the beginner trading learner. Retain
mechanical engineering and the other contexts as independently inspectable
evidence. Future currency exercises need the exact fictional rate dataset and
units, not a later/current rate inferred from the profile.

### Reporting belongs to Admin Studio

G/H must define a narrow, online reporting permission and endpoint in the central
platform. Current [Admin Studio](../../platform/admin/README.md) profile/access
controls are not a report authorization. Review which authorized administrators
may see which learners, sections and historical/retired assignments. Recheck
authority on every query; client-side filtering or broad SELECT grants are not
that contract. Keep the existing private notes, bookmarks, free-text profile
content and attachments out of performance responses by default.

Initial report fields should include distinct submitted attempts, independent
targets passed under a named plan/rubric, latest outcome, repeated comparable
criterion difficulties, reading marks and graded/ungraded quiz status. Attach
source coverage, last successful receipt/checkpoint and unresolved collision or
unsupported-evidence counts. A server cannot know all pending work on disconnected
devices: report **Received through this checkpoint; devices may have unsynced
work**, not an unqualified complete history. Device pending counts, when supplied,
must have a last-observed time and cannot be treated as current truth.

Use bounded summary queries and separately paginated evidence drill-downs. The
current material catalog aggregation (client ceiling 1,000) is not a history API.
Do not average unlike modes or rubrics into a single score. Client-side records
remain self-assessment; certified assessment would require a separate reviewed
server-controlled assessment design.

Archiving/revoking a material preserves records and pending work, but current
access can stop rendering, sync and restore. Historical-report access for retired
targets needs its own reviewed rule. Do not reactivate assignments, enroll a
learner or broaden permissions merely to complete a history view.

## 8. Meaningful conflict comparison

The learner should understand both what differs and what a choice will affect.
Show **Choose worksheet to continue** separately from retained attempt evidence.
Use the same evidence comparison in the central workspace; Admin Studio can
reuse its reviewed summary logic when reporting is authorized.

| Comparison layer | Required display |
| --- | --- |
| Source/target | This device, another tab, cloud or backup; exact material/lesson/scenario/rubric versions; client times labeled; unavailable source content stated |
| Current draft | Changed cells with raw text, formula, active mode, heading styles, observed copy/paste flags, studied state and question responses |
| Attempt membership | Identical shared attempts, attempts only on each side, and same-ID/different-payload collisions; counts plus paginated details |
| Outcome | Recorded calculation/criteria where available; separately labeled current review; stable criterion IDs with understandable labels |
| Action/result | Which draft will resume, all retained attempts, any unsynchronized collision variants, and where archived alternatives remain available |

Example using fictional shipment practice with assigned starting values
`12, 8, 5` and rubric `assigned-practice@1`: both saved drafts can display
`=SUM(B2:B4)` and `12, 12, 5`, yet differ as follows.

| Detail | On this device | From another device |
| --- | --- | --- |
| Shared attempt | Attempt A, identical evidence | Attempt A, identical evidence |
| Additional attempt | Attempt B: independent revision, 4/4 under the named current rubric | Attempt C: clipboard practice, 4/5 because observed copy/paste evidence is absent |
| Heading | Bold and yellow | Plain |
| Choice | Resume this draft | Resume this draft |

Keep A, B and C once each after choosing either draft. These are two different
assessment modes, so the scores are not a ranking for conflict resolution. If B
instead appears twice with different evidence, keep both variants, label the
identity collision, exclude it from unqualified pass counts and require explicit
review. Do not turn a collision into a new deliberate attempt automatically.

For an unversioned legacy `=S UM(B2:B4)` accepted by the frozen evaluator, retain
**Recorded calculation: accepted** and show **Current check: invalid formula**.
If the original full practice score was not stored, show **Not recorded**.
Compare criteria only under a reviewed compatible map. Missing rubric, dataset,
protected answer access or response evidence yields **Not comparable** with a
reason; it never triggers fallback to current/public data.

Before resolving a v1 draft conflict, durably archive and reconcile attempts from
all alternatives in the companion journal. If that fails, leave the conflict
unresolved. Capture a digest/revision of the displayed alternatives; inside the
resolution transaction verify it still matches. Another tab/cloud update forces
a refreshed comparison rather than accepting a stale choice. Then use the
existing draft CAS path and retain its original local history as well.
The current `resolve` API has no expected-comparison argument; adding and checking
that argument is a required implementation change, not existing behavior.

Use plain text DOM rendering, keyboard-accessible choices and stacked views on
narrow screens. Do not require color alone to identify changed/failed criteria.
The complete comparison must remain usable offline with currently authorized
saved evidence and label anything requiring online revalidation.

## 9. Backup, restore and retention

### Preserve v1 and introduce an explicit complete format

Continue reading valid `commonplace-u8-study` v1 files with their current shared
bounds. Preserve current values, conflicts/history and distinct pending/base
values. Imported revisions, last-operation IDs, receipts and leases never grant
write authority. Existing v1 restore requires online owner verification and
current access to every referenced material; R4 does not weaken that rule.

The existing whole-file import hash recognizes the same file, but whitespace
reformatting changes it. New event import deduplicates by stable identity plus
versioned canonical evidence digest, with file hashes retained as provenance.
Do not deduplicate different real attempts merely because their answers match.

Define a new backup format/version for the journal and its recovery metadata.
It must be visibly distinct from legacy-only v1 and include:

- A manifest with format/version, owner/scope/namespace, export-set ID, exact
  coverage/checkpoints, counts by record type, and ordered part byte/hash entries.
- Immutable attempts, collision variants, original-source provenance, progress
  facts/checkpoints, and inert pending/receipt metadata sufficient for recovery.
- The existing study values and their full alternatives/history. A set described
  as complete cannot omit notes/bookmarks or sources solely because they are not
  assessment records.
- Bounded parts processed incrementally; proposed maximum 8 MiB encoded UTF-8
  per part. Use separately hashed source fragments when one preserved legacy
  container is larger than a part, and reconstruct/validate it before use.
- A completion declaration only after every listed part is available and verified.
  Missing or corrupt parts produce an explicitly incomplete result.

Part and transfer bounds are not lifetime retention limits. Support multiple
bounded sets/checkpoints for very large exports without dropping earlier ranges;
the user-facing inventory must identify their exact coverage. Do not assemble an
unbounded array or one giant JSON string merely to count all attempts.

### Capture and restore consistently

Capture a fixed upper journal checkpoint and stable captured copies/revisions of
mutable companion receipts, provenance, collision annotations and progress
checkpoints as well as legacy study records. Use a consistent companion capture
transaction or a revision-checked staged snapshot; hashes alone do not establish
consistent coverage. Since the two databases cannot share a transaction, pause
new-client draft writes during capture, re-enumerate the legacy key inventory,
and recheck revisions/hashes after copying. Old-client additions/changes require
retrying affected captures. State the per-source cutoffs precisely. A backup is
not claimed to be one atomic cross-database/server snapshot. New submissions after a cutoff remain saved and
are identified as outside that export.

Stage imported parts outside active projections. Verify the full manifest,
part/source hashes, schema, owner and target access before marking an import set
complete. Keep per-part and per-event receipts so interruption/quota failure can
resume. Promotion is chunked and idempotent; after a crash show **Restore in
progress**, not a complete-history claim. Do not replace newer existing drafts;
retain differing imported drafts as reviewable alternatives.

For new sets containing currently inaccessible material, keep the original files
and an incomplete import report; do not expose protected work or claim a complete
restore. Authorized parts may be staged, but are not promoted until the selected
set's required checks pass. Supporting a separate recovery-only archive of
revoked material would need its own access contract. Reassignment is never an
automatic restore action.

All restored cloud receipts/revisions are inert. A supported event acquires a
fresh local delivery intent after current authorization, keeping its stable
event ID/body (the attempt ID for attempt events); server receipt matching
prevents duplicate upload. Personal
device exports do not become central-account imports. An intentional personal
restore on a replacement installation uses an isolated recovery workspace and
retains the source scope, attempt IDs and origin provenance; the new device's
random installation ID need not match the old one. Repeated import deduplicates
under the retained source scope. Any new work has its actual installation
provenance; a reviewed explicit workspace mapping may summarize both without
rewriting source identities or claiming central ownership. No backup includes
session tokens, keys, signed leases or private material/attachment bytes under this
contract. Existing packs remain separately preserved and permission-controlled.

There is no automatic age/count deletion of attempts, conflicts or source
evidence. A later retention/deletion policy or verified archive-and-remove
workflow requires a separate review; neither is
implied by paging, signing out, resetting a worksheet or completing this plan.

## 10. Delivery order and implementation gates

R4 is the plan required before F2, not an instruction to activate the platform.
After review/merge, continue **F2–F6, then G/H** in the existing curriculum order.
F2 can use the exact version/criterion contracts in this plan while truthfully
retaining current session/bounded persistence until the relevant package below
is implemented and verified. Do not advertise durable history ahead of delivery.

**2026-11-28 reconciliation:** R4 remains planning only. The six separately
reviewable implementation units below supersede the earlier combined delivery
row for central journal/conflict comparison; all existing acceptance and
preservation requirements remain in force. This does not start implementation.

| Future reviewable package | Dependencies and concrete exit evidence |
| --- | --- |
| Record schemas and recovery foundation | Exact evidence/criterion maps, journal/backup formats, compatibility fixtures, paged store API and resumable source importer; local synthetic tests; no production drain |
| Personal persistent progress | Device scope, save-failure UX, separate reading/guided/independent/quiz records, journal plus complete export/restore, five-context and legacy-state preservation |
| Central journal and reconciliation | Verified owner adapter, companion DB, old-shell coexistence, recoverable v1 draft bridge, additive migration from all current/pending/base/conflict/history sources, resumable reconciliation and same-ID collision handling with all variants retained; local/CI sample only |
| Conflict comparison and stale-choice protection | Build on the central journal; compare meaningful evidence, preserve both sides and distinct attempts, check revision and digest before applying a choice, require refreshed comparison when stale, retain offline accessibility and test LR-11; local/CI sample only |
| Central append transport | New additive migrations/APIs and bounded cursor/receipt behavior, exact grants/RLS, revocation races, local isolated stack and recovery tests; hosted installation remains a separately approved G0/G1-dependent action |
| Admin Studio reporting in G/H | Explicit report permission, exact curriculum-plan denominators, bounded summary/drill-downs, private-data exclusions, historical-access policy and freshness/coverage labels |

Before enabling any new journal writer, its compatible reader, import/export,
storage-failure handling and rollback reader must exist together. A local-only
implementation can report **Saved on this device; cloud history not enabled**.
Production sync, hosted DB changes, authentication/permission changes and learner
enrollment still require separate approval. The existing
[G0 readiness gate](../../platform/acceptance/G0-READINESS.md) remains uncleared.
The six existing platform migrations, deployed settings and all offline pack
identities are untouched by R4.

### Future acceptance matrix

These are required implementation checks, **not tests passed by this plan**.

| ID | Scenario | Required result |
| --- | --- | --- |
| LR-01 | Import 40 legacy attempts; submit 41, 100, 1,000 and 10,001; page, close/reopen offline and export/restore | Every committed identity/evidence/outcome remains available; no lifetime cap or silent pruning; more than one backup part/set works |
| LR-02 | Crash/quota failure before/after journal commit and before/after draft bridge | Correct saved/unsaved status, retained previous work, one ID on retry, newer draft not overwritten |
| LR-03 | Two tabs submit independently; repeated request; deliberate identical answers; same ID altered evidence/target | Two legitimate attempts survive, retry deduplicates, real resubmission remains distinct, collision variants retained |
| LR-04 | Lost acknowledgment, another device appends, retry original | Original durable receipt returned; no duplicate and no reliance on last-operation-only state |
| LR-05 | Interrupted source migration from current/pending/base/conflicts/history and later v1 writes | Resumes at committed checkpoints; all source locations preserved; repeat/reformatted backup does not inflate attempt counts |
| LR-06 | Mixed unversioned/R2 entries, old Section 1 grades, F1 weak summaries, unknown future versions | Original outcomes/provenance retained; missing grades/evidence labeled; current review separate; no invented history |
| LR-07 | Old pinned complete shell reopens after companion journal creation; incomplete update fallback | Existing U8 DB and packs still open; R1 remains effective; old-client limited history/export coverage documented |
| LR-08 | Account changes during save/migration/read/export/restore/receipt; sample vs personal vs real owner | No cross-account adoption, rendering or upload; each original queue/record preserved |
| LR-09 | Revocation/expiry/archive during append and paged read, followed by authorized renewal | Drain/render blocks appropriately, no hidden global-cursor gaps, pending work retained, revalidation before resume |
| LR-10 | Concurrency where cursor allocation and transaction commit would otherwise reorder | Paginated snapshot misses no accepted event; bytes/row bounds, checkpoint resume and late offline arrivals verified |
| LR-11 | Same draft values but different attempts/mode/style/copy evidence; stale comparison choice | Meaningful difference visible, every distinct attempt retained, comparison refresh required on stale revision |
| LR-12 | Reading mark/unmark including concurrent contradictory choices, quiz selections/submissions, guided completion, independent pass then failed retry, reset/cancel | Dimensions remain distinct; reading conflicts need explicit resolution; latest outcome does not erase a recorded eligible pass; ungraded documents/reading never imply mastery; cancellation creates no attempt |
| LR-13 | New lesson/material/rubric/plan version; profile/group change; every professional context | Old identities retained; explicit denominators/equivalence only; trading priority does not erase engineering evidence |
| LR-14 | v1 boundary files, v2 multi-part/missing/corrupt files, oversized source fragments, interrupted promotion | Complete recovery coverage or honest incomplete state, repeatable retry, no source deletion or imported authority |
| LR-15 | Rebuild projections; server sees only received subset; reporting allowed/denied/stale account | Deterministic counts, coverage/freshness stated, no fabricated zero/mastery, no notes/profile leakage or unauthorized reports |
| LR-16 | Same installed iPad cold reopen, Safari separately, dropped transport, low storage and recovery export | Observed device evidence recorded against source revision/origin; no clearing website data or existing icons to obtain a pass |
| LR-17 | Personal backup restored on a replacement installation, then imported again | Source scope/IDs and provenance retained in a local recovery workspace, no duplicate attempts, no central ownership claim |

## 11. Verification of this planning PR

Review the audited statements against the linked source, validate relative links,
run `git diff --check`, and run
`node platform/tools/build-offline-shell.mjs --check`. Confirm the diff contains
documentation only and the current public-shell manifest is unchanged. Record
applicable CI results on the final PR head; do not present existing regression
passes as implementation of the LR acceptance matrix above.

No new runtime tests are needed to prove that prose was added. The later storage,
transport and UI packages require the behavioral tests listed above. Physical
iPad acceptance, hosted sync/recovery, G0 clearance and live reporting are not
established by this document or by its merge.
