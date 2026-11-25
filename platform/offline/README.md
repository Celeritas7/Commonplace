# U8 — Authorized offline study and synchronization

Implemented behind the disabled platform deployment boundary. **No hosted migration, signing key, authentication setting or production deployment was changed.** Excel is the reference section; existing personal lessons, login callbacks, localStorage keys and coding/language service workers are untouched. U9 must complete hosted-account, physical-device and recovery acceptance before activation.

## Review the experience

Serve the repository and open `/platform/learn/offline-preview.html`. This is public synthetic data, with a separate sample key and simulated cloud stored on the same device. It is never imported by the live bootstrap and cannot issue live offline permissions.

1. Select **Study offline / Resume download**. Application files and assigned materials show item counts, bytes downloaded, total size and remaining bytes. Wait for **Ready offline**.
2. Disconnect, close/reopen that same sample URL, then choose **Resume saved study**. Continue the worksheet, quiz, notes and bookmarks without loading Supabase or redirecting through login.
3. Reconnect. Pending edits synchronize automatically; **Sync now** also retries. Competing notes/attempts produce a visible choice. Unchosen copies remain in backup history.
4. Export a study backup. Restoring requires an online verified account, matching project/owner and current material access. Restore fills missing records and retains differing existing values as conflicts. Repeating the same import is idempotent; partial quota interruptions can be retried.
5. **Lock saved study** closes private views and prevents offline reopening until online verification. It preserves materials and work. It is not a replacement for Supabase signout or device security.

For an activated installation, use `/platform/learn/index.html` (or `/platform/learn/`) for Home Screen installation. The root `/platform/` is an online entry and does not fall within the learner worker's scope. Safari/Home Screen and normal browser storage may differ; prepare the pack in the installation that will be used offline. Do not clear website data or delete an existing personal-study installation.

## Access and storage boundaries

| Component | Stored or enforced information |
| --- | --- |
| `cp_offline_snapshot` | Invoker/RLS snapshot of the verified owner's current section, professional profile and published assigned material; includes answer-release rules |
| `offline-lease` Edge function | Verifies the user, rechecks the snapshot after hashing, then signs the origin/project/owner/section/content manifest with a separate ECDSA P-256 key |
| Signed lease | Exact material versions, SHA-256 hashes, file metadata, issued time and expiry; never an API bearer token or administrator permission |
| IndexedDB `commonplace-u8:<namespace>` | Private bodies, file Blobs, pack receipts and transactional study/outbox/conflict records, keyed by verified owner UUID |
| `cp:u8:<namespace>:saved-owner` | Last verified saved-account selector and lock state; neither a grant nor a token |
| `cp:u8:<namespace>:saved-owner:lock` | Lock ID shared by the login and learner pages. Account changes invalidate earlier verifications. Existing selectors remain readable until the first lock. |
| `cp-u8-shell-<digest>` CacheStorage | Reviewed, hash-checked public application assets only; no profiles, private lessons, file-service responses or authentication |

The signer requires an explicit lease interval from **1 to 168 hours**. The preview uses seven days. This is a proposed maximum, **not an approved production policy**; choose the actual interval before activation. The client pins the reviewed public key and validates signature, owner, namespace, origin, expiry, clock rollback, material bounds and cached hashes. A cold offline reopen requires an explicit saved-study action. Going offline during an already verified study session can reuse its complete pack automatically. Offline context is always learner-only, including for an administrator's saved study.

Signout/account changes invalidate tickets, clear private DOM/Blob URLs and lock saved ownership. A shared storage event cancels other tabs, including pending verification. Online sync requests include `expected_owner`, which the server compares to `auth.uid()`; a token switching to account B cannot submit account A's pending note to B. Same-account token refresh does not erase work. Foreground/back-forward transitions recheck access; lease expiry closes an open offline view. No offline operation can publish, change permissions or call administrative APIs.

Online revalidation first blocks the old pack as a fallback. A denied, malformed, wrong-key or interrupted renewal leaves it blocked; saved bytes and pending progress remain available for a later authorized retry. A valid refreshed manifest removes revoked assignments immediately, reuses unchanged content hashes, and marks a pack incomplete if new assignments need downloading. No private files are downloaded automatically on ordinary refresh. The download button completes/resumes the current manifest.

Limits: 100 assigned versions, 4 MiB snapshot/lesson bounds, 10 MiB per tutorial and 100 MiB total pack. Completed lesson/file objects survive interruptions and are rechecked on resume. An interrupted individual file restarts; this is **file-level resume**, not HTTP byte-range resume. Pause aborts client transfers and rejects late results; server work already in flight may still finish. Storage-quota failures keep earlier complete objects and committed work. The browser can still evict storage; missing/corrupt bytes cannot yield Ready offline, and a new download reuses intact objects. Persistence is requested where supported, without claiming that it guarantees retention.

These measures prevent accidental cross-account display and unauthorized server delivery. They do not encrypt a shared browser profile or prevent a device owner from inspecting IndexedDB, modifying local code/clock, or copying downloaded files. Revocation cannot recall disconnected or exported bytes; an honest offline client can continue within its signed lease until expiry or its next online check. Never describe this as DRM or immediate disconnected revocation.

## Conflict-safe progress

The additive U8 migration retains every `cp_study_state` row and adds revision, material-version and operation-ID fields. It revokes direct authenticated INSERT/UPDATE/DELETE in favor of `cp_sync_read` and `cp_sync_write`; owner/section RLS reads remain. Every RPC verifies the expected authenticated owner, active section access and current published assignment. The short write transaction shares the administration mutation lock so authorization is evaluated after concurrent revocation completes. New rows require revision zero. Stale revisions return the existing value; matching operation IDs make retries idempotent after a lost acknowledgement. No physical-delete endpoint resets revision history.

The study adapter uses IndexedDB transactions for the current value, revision base, durable pending operation and competing versions. A second tab with an older local revision saves an alternative instead of overwriting current work. A server conflict also keeps both values until an explicit choice. Edits made while a request is pending remain dirty after its acknowledgement. Failed/denied/ambiguous uploads remain local and retry against their captured base. Only currently assigned material is drained automatically; inaccessible pending records are retained, not transferred to a new account.

The material's save indicator shows **Saving on this device…** until every pending local worksheet, note and bookmark write completes. Wait for **Saved on this device** before closing. A successful save to another field cannot hide a failed save; the affected field must save successfully or its error remains visible. This device-save indicator is separate from cloud synchronization status.

U7 progress is adopted **one already-owned record at a time**, after validating its identity and payload. Original U7 localStorage is retained; unowned legacy keys are never enumerated or copied. An unreadable record disables new saves for that material instead of replacing it. Progress remains self-reported learning state, not certified assessment results. U8 covers the existing worksheet/quiz responses, notes and bookmarks; it does not add a new highlighting UI.

Backups contain only the current owner's study values, pending metadata and conflict history. They exclude leases, private material bytes, session tokens and keys. Imported revisions/operation IDs never authorize a server write: restored records start with a fresh comparison against cloud state. Keep backups privately. Restore currently requires access to every referenced material; an administrator must restore appropriate assignments before recovering revoked material into the app. The exported JSON still preserves that work outside the app.

## Public application updates

`node platform/tools/build-offline-shell.mjs` generates the reviewed hash manifest. CI runs it with `--check`; run it after changing any reachable client/HTML/CSS/icon file or activation configuration. The worker only handles allowlisted public GETs under its learner client. API/private requests are never cached. Partial application downloads are not served as a complete offline shell.

An already installed exact-scope worker checks for updates online and offers **Save application update**. Unchanged verified assets are reused across shell versions; incomplete updates leave the old worker/caches usable. Once complete, the new worker activates and removes only older `cp-u8-shell-*` caches. Reopening updated code is an explicit action, so typed work and OAuth callback parameters are not silently discarded. Private IndexedDB data and all legacy caches remain intact.

## Activation and rollback prerequisites

1. Complete the U0 isolated-origin/backend decision and U1/U6 backup/restore gates. Include existing `cp_study_state`, all material/assignment/profile rows and private Storage bytes. Preserve device U7 records and export U8 study backups before a pilot migration.
2. Apply migrations in order in the isolated backend, including `20261124163801_u8_offline_sync.sql`. The raw-DML privilege change is intentional; confirm no outside client writes this dormant platform table. Existing personal-study tables are unaffected. Run the Supabase security/performance advisors against that target and exercise real A/B/admin/revoked JWTs. Local PGlite tests do not replace hosted advisors or JWT validation.
3. Configure and verify the existing protected material-file service. Deploy `offline-lease` with user-JWT verification and approved CORS origin. Supply server-only `COMMONPLACE_OFFLINE_PRIVATE_JWK`, `COMMONPLACE_APP_ORIGIN`, `COMMONPLACE_PROJECT_NAMESPACE`, `COMMONPLACE_OFFLINE_HOURS`, and the normal Supabase URL/public client key. This new function needs **no service-role key**. Generate/store the offline private key in a secret manager; never commit it or reuse a Supabase signing/service key.
4. Pin only its public EC JWK in the reviewed deployment configuration: `{clientModule, projectNamespace, offline:{enabled:true, publicJwk}}`. Keep the namespace and canonical origin stable. Rebuild the public shell manifest. `platform/admin/deployment.mjs` remains `null` in this PR.
5. Test actual XLSX/PDF downloads; Google callback/session persistence; first preparation, cold Home Screen reopen and foreground expiry on physical iPad/Safari; Android reopen; airplane mode; dropped transport while `navigator.onLine` is still true; revoked/expired sessions; alternate direct API requests; two devices editing; two visible tabs; worker upgrades; interrupted downloads; quota/eviction and backup restore. Transport failures while the browser still reports online fail closed; no old-pack fallback is silently opened.
6. Rehearse a small pilot with the chosen offline interval. Key rotation changes the pinned public key and invalidates renewed/updated clients' old receipts, but cannot update a disconnected installation immediately. Keep private keys out of backups intended for learners.

Rollback starts by disabling the feature/route, preserving IndexedDB, pending edits, conflict history and all server rows. Keep the additive columns and CAS endpoints available for a controlled drain if appropriate; do not drop tables, restore broad raw write privileges casually, clear devices, or silently feed newer U8 progress back into stale U7 localStorage. Export pending work before changing origins or ownership mappings. Production activation remains a separate reviewed step.

## Evidence and remaining acceptance

Automated tests cover signed-lease tampering/expiry/binding, partial download reuse/integrity, stale account responses, SQL default-deny/assignment revocation/CAS/idempotency/expected-owner checks, local/cloud/tab conflicts, cold offline Chromium reopen, notes/worksheet recovery, reconnect sync, cross-tab ownership changes, blocked renewal, expiry, backup restore and quota failure. All existing U7/Admin Studio/Excel regressions run alongside them. The historical U1–U6 raw-DML contract is tested before U8; the new database suite applies **all** migrations and verifies the replacement write boundary.

The public preview simulates authorization and cloud storage. It proves client behavior, not hosted security. Real Supabase JWT/Edge/Storage, physical iPad/Safari/Android, deployment-origin/service-worker conflicts and restore/rollback evidence remain U9 release gates. No user needs to clear website data.
