# U2 — Central Admin Studio

Status: reviewable UI and isolated database implementation; **live activation remains disabled**. Built from merged U1 (`f87acbe`, PR #73). The existing main page, Google login gate, Excel lessons and offline packs are untouched.

## Review the interface

From the repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/platform/admin/preview.html`. Select **Sample learner**, change the Office Work selections, inspect the learner-view preview and use **Review & save access**. Changes exist only in that page's memory; reload the browser to reset. No login/email identity was created or invented for the intended learner. The demo uses a small illustrative section catalogue, whereas the live directory reads the full U1 catalogue.

`platform/admin/index.html` is the future live entry. Its checked-in `deployment.mjs` is `null`, so it performs no auth or database requests and shows an inactive-state message. Neither the preview nor frontend role checks secure database content; server checks below provide authorization once deployed. Preview files contain only synthetic data and should be omitted from the eventual live learner build/navigation.

## Delivered behavior

- Search registered people by display name or login email; view role and status.
- Register an **existing confirmed login** by email. The server resolves its verified UUID, rejects ambiguous/unconfirmed/unknown matches and rejects already-registered accounts. Registration starts suspended with no grants. It does not send invitations or create auth identities; those need the chosen target's reviewed invitation/sign-up flow.
- Edit learner display name, activate, suspend or revoke access. The designated administrator is read-only; no promotion/owner-transfer control exists.
- Select current study leaves grouped under subjects. Parent toggles expand to a reviewed explicit snapshot; newly introduced children do not inherit permission. Planned courses are excluded.
- Preview only the learner's effective allowed leaves. Inactive learners show none; one leaf indicates direct landing. The reusable `lib/learner-navigation.mjs` accepts fresh U1 context and renders only returned leaves, never locked cards; it invokes the host's section callback directly for a single-leaf learner and never renders an admin button for learners.
- Confirm changes before saving. A server transaction replaces status/name/grants atomically and logs the change. A revision conflict retains the unsaved draft and blocks resubmission until reload; there is no blind auto-retry.
- Clear private rows on auth invalidation/offline transition and ignore late responses. Names/emails/section titles are rendered with `textContent`, never interpolated as HTML. No admin directory or edits are persisted in localStorage, service workers or offline queues.

## Database contract

Apply both migrations in order only to the approved isolated test target initially. No hosted migration was performed during implementation.

| RPC | Input | Boundary |
| --- | --- | --- |
| `cp_admin_directory()` | None | Active administrator only; returns memberships with current auth email, string revision, explicit allowed leaves and section catalogue |
| `cp_admin_register(login_email, learner_name)` | Exact normalized login email and display name | Admin check before lookup; verified UUID association; no reactivation or auth-account creation |
| `cp_admin_save(target, expected_revision, learner_name, new_status, allowed_sections)` | UUID, revision string, display name, status, explicit leaf list | Admin check after serialized mutation lock; learner-only target; reject stale revision/invalid leaves; atomic status+grant replacement and audit |

These definer RPCs need access to private auth/directory data and administration writes unavailable to ordinary callers. Each uses a fixed empty search path, qualified object references, explicit `auth.uid()`-backed admin verification and restricted execute privileges. `auth.users` receives no new client grants. Revision triggers cover the earlier U1 mutation RPCs too, so a stale U2 tab cannot overwrite a change made through another supported path. Revisions travel as strings to avoid JavaScript integer precision loss. `cp_private` must remain outside exposed Data API schemas.

The single administrative mutation lock serializes small-platform updates. Test concurrent sessions and target transaction isolation in full PostgreSQL/Supabase before activation. Large-directory pagination, auth-email change administration, owner transfer/recovery and additional administrator roles are outside this increment.

## Verification

```sh
npm ci --prefix platform --ignore-scripts
npm test --prefix platform
cd platform
npx playwright install --with-deps chromium
npm run test:browser
```

At implementation: **30 Node/PostgreSQL checks and 6 browser tests passed**. Database coverage includes anonymous/learner denial of every new RPC, confirmed email binding, no reactivation through registration, stale-write rejection after U1 writes, atomic invalid-input rollback, owner protection and revoked access. Browser coverage includes Excel-only preview, parent selection, saved revocation, protected owner, 390px layout, text-injection resistance, retained draft on conflict, auth invalidation during loading, disabled live entry and learner-only direct landing.

The standard Playwright Chromium download was blocked by this workspace's network. Local browser tests ran against Chromium 133 supplied by `@sparticuz/chromium` in temporary tooling, using the optional `CP_CHROMIUM_PATH` test override. CI uses Playwright's normal bundled Chromium. This does not establish physical iPad/Safari acceptance. PostgreSQL tests use PGlite with auth fixtures and roles; live signed JWT/PostgREST integration remains untested.

## Activation and remaining acceptance

The U0/U1 backend/origin decision, recoverable backups, verified owner bootstrap and full-stack staging tests remain prerequisites. Do not point this UI at the shared General_apps project as a shortcut.

After those prerequisites, the deployment should provide a reviewed client module sharing the **target** login session, export that client, and set the compile-time `deployment.clientModule`. Do not source config from URL parameters or localStorage and never include a privileged key. The main application's freshly verified administrator navigation can then point to Admin Studio. No public live configuration is shipped here.

The host must wire `learner-navigation.mjs` to protected section adapters and refresh/dispose views on auth/status changes. It must not use legacy static HTML links as private content delivery. Real account creation/invitation, Google callback/device tests, private material delivery, reconnect/offline leases and cross-tab session handling remain pending. Registration has no email-sending side effect in this increment.

Revocation blocks subsequent protected database requests; it cannot recall disconnected copies or files already downloaded. Admin actions require online authorization. U3 adds professional profiles; U4/U6 add material contracts and publishing; U7 connects Excel. This studio does not add independent Excel administration.

Rollback before activation: revert the UI/code changes. After a pilot, disable the deployment boundary, retain the new records/audit and follow the U1 recovery plan rather than dropping schema or clearing study data.
