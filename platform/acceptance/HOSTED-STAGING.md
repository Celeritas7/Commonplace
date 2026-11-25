# U9 — Hosted staging preparation

PR #92's real local Supabase matrix passed and is merged. This checkpoint prepares
the missing browser sign-in/client and deployable file layout. **It does not create
a project, apply migrations, configure Google, publish a website or complete hosted
acceptance.** The checked-in deployment and authentication configurations remain
`null`. Existing Commonplace login, progress and service workers are unchanged.

## Decisions before provisioning

The connected inventory was rechecked on 2026-11-25 (Japan): **Celeritas7's Org** is
on Free and contains General_apps and Technical. Neither is a selected staging
target. The next required user decision is the organization for a separate
Commonplace staging project. Supabase's project/cost tools require this organization
selection before quoting or provisioning. Quote any cost for the selected
organization and obtain agreement to a nonzero charge before creating anything.
Do not pause/delete either existing project to make room.

Proposed review inputs, pending that choice:

| Input | Proposed / required choice |
| --- | --- |
| Project | A new isolated `Commonplace-staging`, synthetic data only |
| Region | Tokyo (`ap-northeast-1`) for this Japan-based test; confirm availability |
| Website | A separate HTTPS origin serving only the generated `public/` directory |
| Offline interval | One hour for expiry testing; this does not approve a production interval |
| Administrator | The user's verified identity in the new project, confirmed by a trusted operator before bootstrap |
| Learners | Synthetic A/B for the matrix; the actual learner email remains unspecified |
| Google OAuth | Staging-only provider/client configuration with exact callback URLs |

No origin, private key, administrator UUID or learner email is inferred from a
query string, imported document or existing project's identity. A new project's
Auth UUIDs and token storage must remain separate from the legacy installation.

## Prepare a reviewable package

Use a clean checkout of the selected commit with Node 22:

```sh
npm ci --prefix platform --ignore-scripts
npm run prepare:staging --prefix platform -- /private/staging-config.json /tmp/commonplace-staging-review
```

Start from [staging-config.example.json](staging-config.example.json). Its
placeholders deliberately fail validation. Fill the selected isolated project
reference, its **publishable** key, the exact HTTPS origin, offline interval and
only the public half of a separately generated P-256 offline-signing key. The
private half goes to the target's Edge secret store through a trusted operator;
never put it in this JSON, the repository, chat, a browser or a public artifact.
Preserve it securely for the later restore/rotation rehearsal. No real key is
generated automatically by the preparation command.

The command rejects the two existing shared projects, the legacy GitHub Pages
origin, non-HTTPS/path-bearing origins, secret/JWT keys, private signing-key fields,
unrecognized settings, a dirty checkout and an existing/nonempty output directory.
It makes no network requests and runs no deployment or database commands.

| Output | Purpose |
| --- | --- |
| `public/` | The only directory to publish: login, Admin Studio, learner host, shared modules, Excel adapter/ribbon, icons and the pinned browser SDK |
| `public/platform/learn/shell-manifest.js` | Hashes of the generated learner shell, including its target-specific public configuration; sample and administrator pages are excluded from the offline pack |
| `public/_headers` | Static-host response rules: no-store, no-referrer, nosniff and a CSP restricted to the selected backend; ensure the chosen provider actually applies these rules |
| `server/` | Six unchanged migration files and the actual Edge dependency graphs; **never upload this directory as website content** |
| `server/edge.env.example` | Names of required server settings; private signing-key value is a deliberate placeholder |
| `review.json` | Source commit, SDK version, dependency-lock hash, origin/namespace/interval and SHA-256 for generated/copied files |

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
| Supabase Auth Site URL | Selected staging HTTPS origin |
| Supabase Auth redirect allowlist / client redirectTo | `<selected-origin>/platform/auth/index.html` |

Configure the staging OAuth audience/test accounts and only the required scopes.
Keep Google client secrets server-side. Do not reuse or broaden the legacy app's
callback rules. Confirm the provider's exact redirect matching behavior with the
SDK's PKCE flow identifier. Browser fixtures validate ordering and URL handling;
they do not establish a real Google consent/return success.

## Hosted execution after selection

1. Confirm the newly selected project is healthy and inspect tables, Auth settings,
   exposed schemas, Storage, functions and advisors. For any valued data, first
   verify its recoverable database/Auth/Storage backup and isolated restore scope.
   A fresh synthetic project still needs the later restore rehearsal before pilot
   activation. General_apps backup evidence is not this new project's evidence.
2. Apply all six migrations in filename order only to that target and run
   `catalog.sql`. Confirm `cp_private` is not exposed. Verify the designated owner
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
