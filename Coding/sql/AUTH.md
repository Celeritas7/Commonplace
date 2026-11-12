# SQL sign-in return investigation

SQL uses Commonplace's shared `_lib/gate.js`, project, default Supabase storage key,
and allowed-email hashes. Its top-right account chip is another view of that same
session. It is not a separate account system.

## Findings

PR #50 fixes BAT's initial tab renderer removing the callback hash. SQL has no
such renderer: its home navigation uses ordinary anchors and modules use links.
The shared extras resume handler only rewrites `#cpx-resume`, not OAuth callbacks.
The unmodified SQL home page passed actual bundled-SDK callback processing tests
in Chromium and WebKit with mocked auth responses. BAT's cause is not established
for SQL.

Two reproducible defects are addressed:

* A restored login document did not recheck a session saved while it was away.
  Tests reproduce the retained login curtain after the real SDK saves a valid
  session, then emit a persisted pageshow. The fix checks the existing allow-list
  on pageshow, focus, visibility restoration and session storage events. Callback
  URLs still being consumed are left alone.
* SQL's worker fetched current scripts into its shell cache but preferred an old
  explicit pack on network failure. Offline reopening could therefore undo a
  login fix. It now prefers refreshed shell files, and verified pack downloads
  also replace older shell copies. Previous packs are retained.

This does not prove which condition occurred on the user's iPad. A live Google
round trip on that device has not been observed. Tests model document restoration;
they do not claim to reproduce iPadOS's external-window routing.

## Return flow and storage

The gate reads callback presence before page scripts run. Google opens through
its same-window native authorize link with the current clean page as redirect.
Supabase's real bundled client consumes the callback, fetches the user and saves
its normal localStorage session; the gate verifies the allowed email before
unlocking. SQL's chip and sync code use the same project and storage key, although
some pages create another client. The tested callbacks succeed without rewriting
or copying credentials. Query and hash callback parameters are not tab state.

Safari and a Home Screen app may have separate cookies/storage. Signing in to
Safari or a different installed section does not prove this SQL installation has
the session. If Supabase's configured redirect falls back outside SQL's scope,
that can also change the browsing context. The existing same-origin, one-hour
return target recovery remains intact; this patch does not alter server redirect
allow-lists, add a token-transfer workaround or bypass authorization.

## Updating without reinstalling

In the installed SQL app, while online, open **Study offline** or **Update / repair
SQL** on the login screen. Choose **Repair setup**, then resume/download until
**Ready offline**. Return to SQL home, complete sign-in there, close and reopen the
app. Disconnect, reopen and run `SELECT 2 + 3 AS answer;` (5). No website-data
clearing, sign-out, pack deletion or reinstall is required.

If an older login screen lacks the repair link, open the SQL offline repair URL
in the same app context. Updating in Safari alone is not sufficient evidence that
the installed app was updated.

## Automated coverage

`tests/login-return.cjs`: actual SQL home, SQLZoo, Mistake Drill and module page;
real bundled Supabase SDK; mocked user API and test-only allow-list email. Covers
restored-screen regression, callback consumption, persisted session, signed-in
reload, normal anchors, denied account, callback cancellation and separate storage
contexts. Runs in Chromium and WebKit in GitHub Actions.

`tests/offline.cjs`: actual worker, CacheStorage and SQLite in Chromium at a trusted
non-bypassed hostname (`sql.localhost`), with a previously approved session fixture.
Covers HTTP-cache clearing, offline reopen, query drafts, study-data preservation,
interruption/resume, pack integrity and repair/update from an older worker.

`tests/worker.cjs`: worker harness reproduces stale downloaded login-code fallback
and verifies its fix; checks pack integrity/resume and actual bundled SQLite with
all 19 reference queries. No live Google credentials or personal study data are
used. Local Chromium launch is blocked by this environment's socket restrictions;
browser execution is therefore performed in GitHub CI, not claimed as local or
iPad testing.
