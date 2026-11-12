# C++ login return investigation

## Findings

Inspected BAT PR #50, C++ index/playground/lesson initialization, shared gate,
real bundled Supabase 2.111.0, PWA manifest, and section service worker.
C++ does not perform BAT's startup `history.replaceState`; its book/playground
tabs do not change the URL. `extras.js` only handles its own resume hash.
Both current C++ pages completed implicit callbacks before this change in
Chromium and WebKit with immediate and delayed mocked user verification.
Therefore the specific reported iPad loop has **not** been conclusively reproduced.

A separate failure was reproduced: rejecting callback verification with the
actual SDK returned users to the ordinary login form with no error. The old
gate ignored SDK errors/absent sessions. The regression fixture is the gate
from main commit 49aad3d, with only its test allowed-email hash substituted.
The new gate explains failure and offers retry without erasing the callback.
The playground also created a second auth client using the same storage key
(two user requests and an SDK warning). It now shares the gate's client. This
was confirmed duplication, not proof that duplication caused the iPad loop.

The native Google link requests the current page as `redirect_to`, within the
installed C++ scope. A read-only live authorize request returned HTTP 302 to
Google. No real Google completion or project redirect allowlist was verified.
A provider fallback outside the section scope could still open Safari. Safari
and an installed Home Screen app have separate ongoing storage; signing into
one does not prove the other has a session. Never transfer tokens manually.

## Changes and data

The shared gate keeps the existing allowed-email hashes and session key.
Successful callback processing is left to Supabase; tabs do not touch callback
parameters. Errors/timeouts now have explicit recovery. C++ locked screens link
to the existing section-only repair. No localStorage/IndexedDB clearing, worker
unregistration, global cache deletion, or logout is added. All affected Python,
BAT, SQL and C++ manifests are regenerated after shared gate changes.

The C++ worker fetches code/pages network-first (bounded), uses verified saved
packs offline, and never caches auth endpoints. Registration bypasses HTTP
cache. Repair and updates preserve saved packs and annotations. Updated scripts
become available online; explicit resume verifies/saves their new offline bytes.

## Tests

`tests/login-return.cjs` serves actual index/playground/gate/bundled SDK; only
allowed-email digest and backend responses are fixtures. It covers immediate
and delayed success, original silent failure, new error and successful retry,
denied account, callback consumption, single client, saved session, reload and
new-page reopening. It never contacts production auth or Google.

`tests/offline-browser.cjs` uses a real local HTTP server and service worker.
Only in served test bytes, it removes the localhost gate exemption and changes
the allowed-email digest. Pack hashes are recomputed for those fixture bytes.
It seeds a local session, then tests pack interruption/resume, changed shared
gate over an older pack, repair, unrelated-cache preservation, annotations and
practice persistence, and offline lesson/playground reopening. Chromium also
clears the ordinary HTTP cache before network-disabled reopening. WebKit has
no equivalent cache-clear check here. The callback suite separately verifies
that real SDK callback processing writes the session.

Automated engines are Linux desktop Chromium and WebKit, with an iPad-sized
viewport. They are not physical iPad Safari/Home Screen or real Google tests.
See the C++ login return regression Actions run for results.

## Updating an existing installed app

Connect the iPad and open C++ from its Home Screen icon. Reload, use
**Update / repair C++ setup (keeps saved work)** on the login screen, then
**Repair setup / Retry**. Return to downloads, **Check for updates**, and
**Download / Resume** until Ready offline. Open the study page and sign in
from that same app. Close/reopen it, then repeat without Wi-Fi. Do not reinstall
or clear website data. If the new error remains, report its text and whether
Google returned inside the installed app or to Safari; do not share callback URLs.
