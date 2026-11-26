# G0 — HealthLog archive access readiness

Prepared 2026-11-26. **Unapplied; G0 remains open.** This is a work group within
G0, not a new platform phase. Restoration remains deferred at the existing
private resume checkpoint. No hosted migrations, Auth writes, mappings, signup,
deployment or learner enrollment were performed.

## Evidence and scope

Reviewed Commonplace main `3516e8af80bf29a6706ce1aa52e96be0ef1a86b5` and
[HealthLog main](https://github.com/Celeritas7/HealthLog/tree/87aa0920b26b4c200c6b160516bb2f80abb126df).
Read-only General_apps catalog queries inspected HealthLog columns, constraints,
policies, privileges, views, trigger/routine dependencies and archive references
in scheduled-job commands. No health records, user rows, emails, keys or backup
contents were read. No archived-table routines, views, external foreign keys,
user triggers or scheduled commands were observed before the candidates.
Metadata/source inspection does not establish actual gateway exposure or the
absence of external clients, older downloaded HTML or dynamic SQL.

| Archive | Ownership | Before this preparation | Prepared behavior |
| --- | --- | --- | --- |
| `healthlog_clinics_old` | Original text key | Broad browser policy/grants | Verified mapped owner reads |
| `healthlog_visits_old` | Original text key, optional clinic | Candidate 02 covers only this archive table | Verified mapped owner reads |
| `healthlog_medicines_old` | Parent visit | Broad browser policy/grants | Read only through an authorized visit |
| `healthlog_dose_logs_old` | Text key and parent medicine | Broad browser policy/grants | Both the mapped key and parent chain must be authorized |

All four become read-only to browser roles. Server/operator access remains a
separate trusted privilege. Read-only fits the inspected clients: current desktop
and mobile load `healthlog-sync.js`, whose visit/medicine/dose/conflict/settings
calls use the newer UUID-owned tables. The two Temp prototypes use local data.
Neither those pages nor shared runtime scripts refer to any `_old` table.
Current views reference the newer tables and use `security_invoker=true`.
No replacement archive UI or automatic copying into current records is needed.
The companion HealthLog change adds only evidence, synthetic tests and CI.

## Candidate and dependencies

[06_healthlog_archive.sql](../operations/general-apps/06_healthlog_archive.sql)
requires the **revised** [01](../operations/general-apps/01_access_foundation.sql)
and [02](../operations/general-apps/02_legacy_policy_guards.sql), all original
keys mapped by an authorized operator, and archive-consumer evidence.

The unapplied 01 candidate now recognizes original keys in clinics and dose logs
as well as visits, so clinic-only history is not forced onto another key. The
unapplied 02 candidate accepts those valid mappings. Mapping creation and lookup
reject anonymous/unverified identities. No name/email lookup, text-to-UUID cast,
first-administrator assignment or automatic backfill is introduced. Existing
Code_sensei mapping/identity tests still run against the revised foundation.

Do not rerun 01 over an installed foundation. If an older foundation has been
installed elsewhere, stop for a separately reviewed upgrade; 06 pins the reviewed
helper definitions and refuses a mismatch. The six Commonplace migrations are
unchanged. 06 follows 01/02 as part of G0 shared-app repair, before G0 clearance;
its number does not place it after signup candidate 04. Candidate 04 still waits
for all six CP migrations and verified owner setup in G2.

The 06 transaction locks the archive, mappings and consumer evidence and checks:

- Exact columns, nullability, constraints, policies, helper bodies and trigger baseline.
- Additional archives, views, routines, external foreign keys, inheritance and rules.
- Effective browser privileges, including inherited rights and column grants.
- Every original owner key links to a confirmed non-anonymous Auth UUID.
- Clinic/visit and dose/medicine/visit relationships agree on the mapped person.
  Different legacy keys may represent that same verified person.

Any discrepancy rolls back the complete candidate without changing records.
No mismatched relationship is repaired by guessing. After installation, removing
a mapping or losing verified status hides associated rows with existing JWTs.
Commonplace administrator status does not grant HealthLog archive access.

## Acceptance evidence

- `tests/healthlog-archive.test.mjs`: the actual SQL in isolated PostgreSQL
  (PGlite), fictional A/B/administrator/unmapped accounts, original text and
  UUID-shaped keys, clinic-only/dose-only keys, full row equality, anonymous
  denial, read-only writes, current UUID-table/view compatibility, revocation,
  anonymous claims and atomic refusal on schema/policy/mapping/dependency drift.
- `acceptance/healthlog-archive-local.mjs`: disposable Supabase real Auth/JWT and
  direct PostgREST checks for all four tables. A concurrent committed mapping
  deletion must be observed by the waiting installer. It also checks unmapped
  Commonplace identities, administrator separation, denied writes, revocation
  with existing JWTs and exact archive-row preservation.
- Companion HealthLog tests exercise the actual current sync module with a fake
  transport and fictional records: pull, repeat sync, notes, medicines, costs,
  taken doses and settings. They confirm the inspected source does not call the
  archive and leaves unrelated saved data alone. Mocks do not prove hosted RLS.
- Existing platform, Code_sensei, Windows/Linux staging, browser and local-stack
  suites remain required. No production deployment is part of these workflows.

## Remaining operator evidence and limits

Before any approved installation: reconcile current source/catalog drift, finish
the deferred recovery prerequisites, inventory external/archive users and saved
HTML, verify real key mappings privately, and record the reviewed consumer
attestation. If an archive writer exists, stop: a separate authenticated write
contract must be reviewed before read-only enforcement. Do not mark a synthetic
fixture as live cutover evidence. Rehearse the whole sequence before scheduling
its locking window; it is not an online automatic migration.

This is bounded archive readiness, not a full HealthLog security certification.
The current HealthLog client still uses shared device-cache keys and merges local
work during sign-in; account switching and offline ownership need their own
owning-app review before multi-user device sharing. Its current UUID tables,
weather routines, connected-app reads and their privileges are not changed here.
Do not infer complete HealthLog or General_apps isolation from these tests.

No app runtime, study content, origin, service worker, offline pack, local cache
or saved progress is changed. Already downloaded copies cannot be recalled by
revoking a server mapping. Eagle, Roadmap, remaining shared helpers/Edge routes,
project settings and consolidated release evidence remain in the existing G0
queue. Restricted learner sharing is still on hold.
