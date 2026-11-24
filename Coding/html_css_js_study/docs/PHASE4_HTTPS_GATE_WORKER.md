# Phase 4 — Shared gate and worker integration on HTTPS

## Purpose

Test Web Studio's **real** `_lib/gate.js` and **real** `Coding/html_css_js_study/sw.js` in the **same Chromium/WebKit browser profile**. Earlier coverage was split: the offline browser suite exercises a true worker on localhost (where the shared gate bypasses login), while the auth browser suite uses a non-localhost HTTPS origin but disables worker registration. Passing either test alone does not establish the combined behavior.

## Isolated test origin and data

`tests/auth-offline-https.cjs` creates a temporary, self-signed TLS certificate and a local HTTPS server. The browser sees `https://web-studio.example.test:<ephemeral-port>` through a **restricted local CONNECT proxy** that only forwards that test hostname and port to the server on `127.0.0.1`. All other CONNECT targets receive 502. The hostname is deliberately **not** localhost, so the real shared login gate is active. The test verifies the HTTPS origin, registration scope, and actual `navigator.serviceWorker.controller`.

The test does not modify production `gate.js` or the production allowlist. In memory, it replaces **only the permitted-email hash** with a synthetic fixture email, then recomputes a **test-only manifest SHA-256** for that modified gate resource. The actual worker, HTML, study modules and all other downloaded assets are served as committed. A mock Supabase SDK client is provided before gate startup, and a local in-memory account endpoint substitutes for production cloud calls. The fake Google provider is intercepted only at its authorization URL and returns to the same HTTPS study page. No real Google sign-in, user account, Supabase database, public web service or production storage is contacted.

The test uses separate disposable browser profiles and a temporary local certificate; it deletes those fixture assets afterward. It never changes a real learner profile.

## Acceptance checks

1. **Signed out and controlled:** the real gate locks the page before approval, while a real worker registers and controls the document. Account sync must not read or write the cloud fixture while locked.
2. **OAuth callback:** a same-window synthetic Google return preserves callback parameters until the mock SDK consumes them. The real gate approves only the allowlisted synthetic email. Account sync starts only after unlocking.
3. **Explicit download:** the actual worker downloads and SHA-256-verifies the full test revision, including the synthetic gate resource.
4. **Offline cold reopening:** close the entire browser and reopen the same persistent profile with the connection disabled. Verify the real worker controls the page, the gate admits the previously approved saved session, an uncached network request fails, the notes and project code survive, and HTML/CSS/JavaScript preview still runs.
5. **Reconnection:** a note edited while disconnected stays local and synchronizes only after reconnecting to the same synthetic account.
6. **Signed-out offline denial:** removing session credentials while offline must show the real gate, not silently bypass authentication because study assets are verified.
7. **Disallowed account:** a synthetic callback for a non-allowlisted email remains locked; no cloud requests or existing study records are altered.
8. **Section isolation:** unrelated Commonplace downloads and annotation records survive the sequence.

## Running

The existing `.github/workflows/web-studio.yml` runs the suite once per browser in the pinned Playwright container, alongside legacy, offline, startup, projects, backup, and auth tests.

```sh
BROWSER=chromium node Coding/html_css_js_study/tests/auth-offline-https.cjs
BROWSER=webkit node Coding/html_css_js_study/tests/auth-offline-https.cjs
```

Requirements: Node.js 22, Playwright 1.65.1 matching installed browser executables, and `openssl` available to generate a disposable fixture certificate. The script never alters DNS or system-wide certificate trust. It does not read existing browser profiles.

## Boundaries and next step

A passing suite demonstrates a controlled **synthetic** combined-gate-and-worker scenario, **not** the production Google provider, production Supabase RLS, deployment CDNs, Safari/Home Screen storage behavior, iPad storage eviction, or a physical iPad. Those items remain explicitly **NOT TESTED**. The remaining physical acceptance task is: prepare and verify online in the existing Home Screen installation, close it completely, disconnect, reopen from the icon, run a preview, and check saved records and reconnection sync. Repeat separately in Safari when used.
