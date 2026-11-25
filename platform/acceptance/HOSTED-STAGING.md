# U9 — Hosted staging preparation

PR #92's real local Supabase matrix passed and is merged. This checkpoint prepares
the missing browser sign-in/client and deployable file layout. **It does not create
a project, apply migrations, configure Google, publish a website or complete hosted
acceptance.** The checked-in deployment and authentication configurations remain
`null`. Existing Commonplace login, progress and service workers are unchanged.

## Selected backend and remaining inputs

On 2026-11-25 (Japan), after PR #94 merged, the user selected **Celeritas7's Org →
Technical**, `ulgrfumbwjovbjzjiems`. Use that existing project. The previous proposal
to provision a separate project is superseded; no organization or purchase
decision is pending. Technical is a shared live backend, not a disposable staging
database. The [Technical checkpoint](TECHNICAL-TARGET.md) records the read-only
audit, existing backup evidence and remaining shared-access issues.

The seven legacy `commonplace_*` tables are in **General_apps**, not Technical.
Keep their login, progress, offline storage and deployed clients in place.

| Input | Proposed / required choice |
| --- | --- |
| Project | Selected: Technical, `ulgrfumbwjovbjzjiems`; shared-project isolation and recovery review still required |
| Region | Existing Mumbai (`ap-south-1`); no project relocation |
| Website | A separate HTTPS origin serving only the generated `public/` directory |
| Offline interval | One hour for expiry testing; this does not approve a production interval |
| Administrator | The user's verified Technical identity, confirmed by a trusted operator before bootstrap |
| Learners | Tracked test A/B for the hosted matrix after signup side effects are reviewed; the actual learner email remains unspecified |
| Google OAuth | Review existing shared provider settings; preserve current apps and add only the exact staging redirect |

No origin, private key, administrator UUID or learner email is inferred from a
query string, imported document or email match. Technical's Auth identities and
the new browser token storage remain separate from legacy General_apps.

## Prepare a reviewable package

Use a clean checkout of the selected commit with Node 22:

```sh
npm ci --prefix platform --ignore-scripts
npm run prepare:staging --prefix platform -- /private/staging-config.json /tmp/commonplace-staging-review
```

Start from [staging-config.example.json](staging-config.example.json). Its
remaining placeholders deliberately fail validation. Technical's project reference
is already set. Fill its **publishable** key, the exact HTTPS origin, offline interval and
only the public half of a separately generated P-256 offline-signing key. The
private half goes to the target's Edge secret store through a trusted operator;
never put it in this JSON, the repository, chat, a browser or a public artifact.
Preserve it securely for the later restore/rotation rehearsal. No real key is
generated automatically by the preparation command.

The command accepts the selected Technical backend but rejects General_apps and the legacy GitHub Pages
origin, non-HTTPS/path-bearing origins, secret/JWT keys, private signing-key fields,
unrecognized settings, a dirty checkout and an existing/nonempty output directory.
It makes no network requests and runs no deployment or database commands.
Acceptance by this offline builder is configuration validation, not approval of
Technical's existing shared API. `review.json` marks Technical as `shared-existing`
and always reports hosted readiness as unassessed. Unknown project references are
`unverified`, never assumed isolated.

| Output | Purpose |
| --- | --- |
| `public/` | The only directory to publish: login, Admin Studio, learner host, shared modules, Excel adapter/ribbon, icons and the pinned browser SDK |
| `public/platform/learn/shell-manifest.js` | Hashes of the generated learner shell, including its target-specific public configuration; sample and administrator pages are excluded from the offline pack |
| `public/_headers` | Static-host response rules: no-store, no-referrer, nosniff and a CSP restricted to the selected backend; ensure the chosen provider actually applies these rules |
| `server/` | Six unchanged migration files and the actual Edge dependency graphs; **never upload this directory as website content** |
| `server/edge.env.example` | Names of required server settings; private signing-key value is a deliberate placeholder |
| `server/preflight/` | Read-only shared-project catalog and Technical review notes; private operator inputs, excluded from browser/offline assets |
| `review.json` | Source commit, target scope/readiness, SDK version, dependency-lock hash, origin/namespace/interval and SHA-256 for generated/copied files |

The builder reuses the Edge source packager tested by the disposable Supabase
workflow. It relocates only the entries' relative imports and leaves shared module
bytes unchanged. The browser SDK comes from `npm ci`'s pinned package, is served
locally, and includes its license. The artifact's configuration changes are made
only in the output, never in `platform/admin/deployment.mjs` or legacy files.

For a different source/configuration, create a fresh package and verify its
checksums. A failed build's partial directory is not deployable. Do not upload the
whole repository or the package's parent directory to a static host.

## Google sign-in and browser behavior

The new staging login lives at `/platform/auth/index.html`. It uses the existing
Supabase architecture and pinned SDK with PKCE, a project-scoped storage key and
manual callback completion. Callback parameters remain intact until the code
exchange finishes; errors are shown without echoing provider details or tokens.
It never auto-opens Google and never reads a `next`/return URL for routing.

After verifying the user with `getUser`, it reads that UUID's current membership.
Only an active administrator routes to Admin Studio. An active learner routes to
the authorized learning host, which independently checks sections/assignments.
Unregistered, suspended and revoked identities do not get an authorized workspace.
Email and editable role metadata are not authorization inputs. Direct URLs remain
subject to database policies and Edge verification.

The Account link opens explicit account controls. Sign-out first locks the saved
owner selector, then ends that browser's session; saved lessons, notes, bookmarks
and queues are retained. Online sign-in failure cannot silently unlock cached
study. Open saved study uses the existing learner/offline flow and still requires
an unexpired signed pack. Install `/platform/learn/index.html` on the iPad Home
Screen and prepare the download there; signing in in another browser does not
prove the installed app shares its PKCE verifier or storage.

For the selected target, review these distinct URLs:

| Setting | Exact destination |
| --- | --- |
| Google authorized JavaScript origin | Selected staging HTTPS origin |
| Google authorized redirect URI | `https://<selected-ref>.supabase.co/auth/v1/callback` |
| Supabase Auth Site URL | Preserve the shared project's existing value; explicit staging `redirectTo` uses the exact allowlisted URL below |
| Supabase Auth redirect allowlist / client redirectTo | `<selected-origin>/platform/auth/index.html` |

Review the existing Google audience/test accounts and only the required scopes.
Keep Google client secrets server-side. Preserve all existing apps' callback rules
and add only the exact staging redirect; do not introduce wildcards or replace the
shared Site URL/provider configuration. Confirm exact redirect matching with the
SDK's PKCE flow identifier. Browser fixtures validate ordering and URL handling;
they do not establish a real Google consent/return success.

## Hosted execution after selection

1. Recheck Technical's health and run `shared-project-catalog.sql`. Reconcile actual
   exposed schemas, shared Auth settings, Storage, functions and advisors. Resolve
   the [recorded shared-access findings](TECHNICAL-TARGET.md) with affected app
   regression tests and verify recoverable Technical database/Auth/Storage backup
   and isolated restore evidence. Do not use the empty local fixture runner on it.
2. After those prerequisites, apply all six migrations in filename order only to
   Technical, preserving unrelated migration history, and run `catalog.sql` plus
   the shared inventory. Confirm `cp_private` is not exposed. Verify the designated owner
   identity and bootstrap its UUID once using the operator-only function.
3. Set target-specific Edge settings and private signing key. Deploy only
   `material-files` and `offline-lease` from the reviewed `server/` package.
   Keep `verify_jwt = true` and test the actual target's user JWTs. Current provider
   documentation supports both legacy and asymmetric user JWTs at this gateway;
   publishable keys belong in `apikey`, not in the bearer-token header.
4. Publish only `public/` at the selected origin. Confirm headers, literal file
   routes, callback behavior, worker scope and manifest hashes from the hosted
   responses. Do not enable the existing production route or migrate its storage.
5. Run the [hosted matrix, backup/restore and device procedure](README.md), including
   A/B/admin/unregistered, raw URLs, revocation races, group changes, concurrent
   updates, Google return and iPad airplane-mode cold reopen. Record PASS/FAIL/BLOCKED
   against the exact project/origin/build. Complete Android and legacy-app checks.
6. Rehearse disabling/re-enabling this staging route with server data and device
   queues retained. Prepare a separate reviewed production activation change only
   after all release gates pass. Downloaded/exported copies cannot be recalled.

The preparation command intentionally has no deploy subcommand or automatic CI
publication. For an approved operator deployment, discover the current CLI flags
with `supabase functions deploy --help` and supply the exact target explicitly.
Never use `--prune`, broad resets or a linked default as a substitute for target
verification. A deployment failure is not evidence that an authorization test passed.

References checked: [Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google),
[PKCE code exchange](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession),
[Edge authorization headers](https://supabase.com/docs/guides/functions/auth-headers),
[Supabase changelog](https://supabase.com/changelog.md).
