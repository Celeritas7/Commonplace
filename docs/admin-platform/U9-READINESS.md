# U9 readiness assessment — 2026-11-25 (Japan)

**Decision: NO-GO for live multi-user activation. Local acceptance preparation is
implemented; hosted and physical-device acceptance remains open.** This is a
release-readiness decision, not a claim that a live learner accessed another app.

## Baseline and change scope

- Main baseline: `12a492f91f59a0b6ed58b5c49db56eacaebb7e99`, U8 PR #89 merged.
- U9 adds tests, a read-only catalog preflight, acceptance instructions and CI
  coverage for the administration documentation. It also fixes online saved-study
  revalidation in the central session and refreshes its public shell manifest.
  Curriculum, legacy apps, authentication settings, migrations, hosted permissions
  and production deployment are unchanged.
- `platform/admin/deployment.mjs` remains `null`. The five migration files are
  unchanged. No live accounts, keys, permissions, files or assignments were created.
- Excel PR #70 is still open/unmerged against `feat/excel-study-phase-a`; U9 tests
  the merged Phase A/reference adapter. It does not attest unmerged Phase B behavior.
- [Full acceptance and recovery procedure](../../platform/acceptance/README.md).

## Read-only hosted findings

The connected project inventory contains General_apps and Technical; no dedicated
Commonplace staging project was present. General_apps remains the legacy
Commonplace authentication/data project. Technical was not used as a substitute.

Catalog/Storage/Edge metadata on General_apps showed **zero `cp_` platform tables,
zero platform functions, no `cp_private` schema, no `cp-materials` bucket and neither
`material-files` nor `offline-lease` deployed**. The U9 catalog preflight returned
missing prerequisites, as expected for an unactivated implementation. This is not
a request to apply the migrations to that shared project.

Existing shared-project security advisories still include mutable function search
paths and API-callable definer functions outside this platform. Those notices
require contextual review; counts alone do not prove exploitability. No unrelated
function/policy was changed, no exploit was attempted, and no application records
or tokens were exported. See the provider's remediation guidance for
[function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[anonymous definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
and [authenticated definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
An RLS-without-policy notice can be intentional default denial; adding blanket
policies is not a remedy. A `cp_` prefix does not isolate new learner JWTs from the
rest of the shared project's API.

## Evidence and remaining gates

Finding U9-01: selecting **Resume saved study** while connected could choose the
previously signed cache without a fresh server check. The same state could survive
a missed online event after backgrounding. The offline branch now requires the
browser to report offline; otherwise membership/assignment checks run normally.
A targeted browser regression reproduced the online-resume failure before the
fix. Revoked online access blocks the saved pack while retaining its bytes/work.

| Gate | Status | Evidence / next requirement |
| --- | --- | --- |
| Merged U1–U8 contracts | Implemented | Existing suites plus final-state U9 checks; live bootstrap remains disabled |
| Final schema/role matrix | Local PASS | All migrations together; anonymous/unregistered/A/B/admin, metadata spoofing, direct reads/writes, Storage guard and archive denial |
| Preflight drift detection | Local PASS | Deliberately disable RLS, add excess table/column grants, expose a function and remove a required endpoint; findings are detected |
| Synthetic restore | Local PASS | PGlite dump/reload after U7→U8; all platform table rows, catalog rules, old/new work and CAS retry preserved; B/revoked access still denied |
| Worker failure recovery | Local PASS | Real worker code with deterministic Cache/network fixtures; failed updates keep the old shell and legacy caches |
| Browser regression suite | Local PASS; exact-head CI required | 48 cases: existing 45 plus three U9 recovery/revalidation cases; record the exact PR head and check results |
| Backend and canonical origin | BLOCKED | Choose an isolated staging target/origin or approve a complete shared-project isolation review; no provisioning/cost decision made |
| Hosted Auth/REST/RPC/Storage/Edge | BLOCKED | Deploy to the selected disposable target, run catalog/advisors and real JWT/direct-URL/concurrency matrix |
| Actual backup and restore | PENDING | Reconcile existing private backup evidence with the chosen target; verify required Auth and private file restoration; local snapshot test is not this gate |
| iPad/Safari/Home Screen and Android | PENDING | Real preparation, airplane-mode cold reopen, saved work, Google return, downloads, expiry, switching and recovery |
| Legacy personal-study regression | PENDING on devices | Existing installed Python/SQL/C++/BAT/Web Studio notes and packs remain usable; no clearing website data |
| Offline interval and keys | PENDING | Explicit interval, server-only private key, public-key pinning, origin/namespace and rotation procedure reviewed |
| Hosted rollback / pilot | PENDING | Disable/re-enable with retained data/queues, verified backups, no old-build overwrite or destructive schema rollback |

Local results: **109 Node/PostgreSQL checks passed** (including eleven new counted
database/recovery/worker checks) and **48 browser cases passed**. The installed full
Chromium could not launch under the environment's socket policy, and the pinned
browser download was unavailable. A separate local headless Chromium 133 runtime
completed the full suite; no project dependency was changed for that workaround.
GitHub CI runs the repository's pinned Playwright browser independently; record
its exact-head result in the PR before merging. Neither runtime substitutes for
physical iPad/Safari acceptance.

## Next checkpoint

PR #90 is merged. The follow-on checkpoint adds
[disposable full Supabase integration](../../platform/acceptance/LOCAL-STACK.md)
on a GitHub runner, using real local Auth/REST/Storage/Edge services and signed
user tokens. It requires its own successful CI result; the historical results
above do not establish that new checkpoint. It provisions no cloud resource and
keeps `deployment = null` and the original five migrations unchanged. Its real
PostgREST run found an unfiltered singleton-lock update rejected by `safeupdate`.
A sixth migration explicitly targets that lock row in ten existing functions;
it preserves function authority and data, and does not disable the guard. See the
linked checkpoint for the regression and exact CI evidence requirements.

After that, select the disposable hosted staging backend and canonical origin,
then complete the hosted matrix and backup scope together. The separate-project direction remains
the U0 recommendation; no project purchase is authorized by this report. Physical
offline UI testing can begin with the explicitly synthetic sample, but real Google
login, permissions and cross-device sync require staging. After hosted/device and
recovery evidence passes, prepare a separate concrete activation change for review.

Public legacy HTML/repository files stay public. No frontend gate retroactively
protects those bytes. Disconnected/exported tutorial copies cannot be recalled.

References rechecked: [Supabase changelog](https://supabase.com/changelog.md),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Storage authorization](https://supabase.com/docs/guides/storage/security/access-control).
