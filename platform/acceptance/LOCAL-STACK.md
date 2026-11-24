# U9 — Disposable Supabase integration

The earlier acceptance suite used PGlite and controlled browser/worker fixtures.
This checkpoint runs the same five migrations and real Edge handlers through
Supabase's local Docker services. It exercises actual signed Auth sessions,
PostgREST authorization and private Storage delivery before choosing a cloud
staging target. Production activation remains disabled.

## Run

Use Node 22, Docker Engine and **Supabase CLI 3.3.0** on a development machine or
an isolated CI runner. Ports 54321 and 54322 must be available. The pinned
`Admin platform local Supabase` workflow installs these prerequisites on Ubuntu.
From the repository root:

```sh
npm ci --prefix platform --ignore-scripts
npm run test:stack --prefix platform
```

`CP_SUPABASE_CLI` may specify the CLI executable path. There is no target URL,
project-reference, database-URL or credential argument. Remove hosted Supabase
environment variables first; the runner deliberately refuses them. Docker or
image/dependency registry unavailability is a failed prerequisite, not a pass.
The first run downloads local service images and npm dependencies. No hosted
project, account, subscription or cloud resource is created.

The runner creates a random project ID and a temporary directory outside the
repository. It applies byte-identical migration copies to an empty local database,
then creates four confirmed synthetic `example.invalid` Auth identities. Only the
temporary operator uses the local service credential for identity creation and
the database owner for bootstrapping the synthetic administrator. All learner and
administrator API assertions use ordinary signed user JWTs and the public client
key. Neither a production administrator nor a real learner email is needed.

The API and database must be the expected loopback endpoints. HTTP redirects and
off-origin requests are rejected. Configurations with remote targets are refused.
Generated passwords, keys and tokens are kept in memory or a mode-0600 temporary
Edge environment file; diagnostic output redacts credentials. No credentials,
Auth exports, database dumps or private logs are uploaded as artifacts.

Both Edge entries are packaged with their actual shared module graphs below the
local functions mount. Shared modules and migrations retain their original bytes;
only relative imports in the two entry files are relocated. Original source
checksums are recorded in the temporary package. Both functions retain gateway
JWT verification. An ephemeral P-256 key signs offline leases; no production key
is reused. This packaging is for testing, not a hosted deployment command.

The runner stops only its own random project with `--no-backup` and removes its
temporary directory in `finally`, including after assertion failures. It never
uses `--all`, `link`, `db push`, `config push`, hosted deployment or database reset.
If the process/machine is forcibly killed, automatic cleanup cannot be guaranteed;
the CI runner itself is disposable. Do not use the test config to host an app.

## Required evidence

Nine integration groups must pass. Every negative file test follows a successful
authorized upload/download, so an absent endpoint cannot produce a false pass.

| Group | Required result |
| --- | --- |
| Auth | Four real local identities sign in and `getUser` verifies their signed sessions |
| Catalog | The final schema passes the read-only preflight in PostgreSQL 17 |
| Administration | Anonymous and learner operations deny; unregistered users see no sections; direct writes and user-metadata role spoofing cannot promote a learner |
| Content | A reads its assigned published lesson; B-only content, drafts and unreleased answers deny through RPC/REST; assignment recipients remain private |
| Synchronization | Real token writes save once, repeat safely, report conflicts and reject another owner's UUID; direct writes cannot bypass CAS |
| Upload | Learner upload denies; administrator upload stores validated immutable bytes in the private bucket |
| Download | A receives the exact bytes with `no-store`; B, anonymous, invalid JWT and wrong Origin deny; direct download, signed-URL creation and public object URL cannot expose the file |
| Lease | The real Edge response verifies against the temporary public key and binds owner, origin and assigned content; wrong Origin, anonymous and invalid JWT deny |
| Revocation | Reusing A's unchanged JWT after revocation denies REST/RPC reads, queued writes, file delivery and lease renewal while retaining study state |

Record the source commit and CI run URL in the PR. Only a completed successful
`local-supabase-acceptance` job establishes this checkpoint. The ordinary Node,
browser and Deno suites remain required separately. Do not weaken policies or use
service credentials to make a learner assertion pass.

## Remaining acceptance

This is full local service integration, **not hosted staging acceptance**. It does
not establish cloud gateway/JWT-key configuration, HTTPS/canonical origin, Google
OAuth, physical iPad/Safari/Android behavior, the hosted concurrent-request matrix,
an actual Auth/Storage backup restore, or production rollout/rollback. The local
stack's pinned CLI and upstream service versions can also differ from the eventual
hosted target. Follow [the hosted and device runbook](README.md) before activation.

The connected organization had two existing projects and no selected staging
project when this checkpoint began. A separate hosted target and its cost/origin
decision remain open. This PR does not use a shared project as a substitute.
