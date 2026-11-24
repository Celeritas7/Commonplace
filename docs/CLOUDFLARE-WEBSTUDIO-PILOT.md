# Cloudflare Pages staging — Web Studio pilot (not a full Commonplace migration)

**Status: packaging prepared, Cloudflare deployment NOT CREATED or TESTED.** This pilot is intentionally separate from the existing GitHub Pages Commonplace app and from the unfinished centrally administered multi-user platform.

## Why a narrow pilot

The repository currently includes public study material, developer/test data, a not-yet-deployed Admin Studio foundation and large Python runtime packages. One `Coding` Python/pyodide SciPy wheel is approximately 45 MiB, above Cloudflare Pages' typical 25 MiB individual-asset limit. Copying the entire checkout to the Pages output is **not** a safe or reliable deployment strategy.

This pilot contains **Web Studio only** (HTML/CSS/JS), its exact offline study pack, the unchanged `sw.js` service worker and the minimum shared assets used by those lessons. It does **not** publish `platform/`, admin routes, Python packages, other Commonplace sections, SQL, backup dumps, tests, docs, development artifacts or local PC files.

The staged files retain the GitHub Pages path shape **`/Commonplace/Coding/html_css_js_study/`** to avoid changing relative resource URLs and service-worker scope. The Cloudflare Pages hostname will still be a **different browser origin** from `celeritas7.github.io`; browser cache, service workers, localStorage, sign-in sessions and saved work **do not migrate automatically**.

## What is and is not changed

- Source: `scripts/build-cloudflare-webstudio.cjs` and `scripts/test-cloudflare-webstudio.cjs`, new CI packaging workflow, and this documentation. No Web Studio production runtime file is edited.
- Output: **`dist-cloudflare/`** (gitignored). The build checks the source offline manifest revision, each file's size/SHA-256, path confinement and per-file size before copying.
- Only staged `studio-cloud.js` is deliberately substituted by a local-only adapter. It displays **"Cloud sync is disabled in this Cloudflare pilot"** and offers no production study-record read/write. The staged offline manifest entry and revision are recomputed so its bytes still verify. The original source manifest remains untouched.
- The **real** shared Commonplace gate, real Supabase sign-in library, lessons, exercises, UI, and service worker remain unchanged in the pilot. Sign-in still needs an approved Commonplace account; **no authentication bypass** is introduced.
- `_headers` keeps service-worker/manifest requests fresh and discourages search indexing. These headers do not make public files private. The existing static gate is a UI curtain, **not server-side learner authorization**.
- All usual Commonplace study sections and Admin Studio are out of scope for this pilot. Their links may not work on the staging origin.

## Test/build from GitHub

The workflow **Build isolated Cloudflare Web Studio staging pilot** runs:

```sh
python3 Coding/html_css_js_study/tools/build-offline.py --check
python3 Coding/html_css_js_study/tests/offline-manifest.py
node scripts/build-cloudflare-webstudio.cjs
node scripts/test-cloudflare-webstudio.cjs
```

It uploads an artifact called `commonplace-webstudio-cloudflare-pilot`, containing the actual `dist-cloudflare/` deployment directory. This action **does not deploy or create a Cloudflare project**. The artifact is useful for review or an explicitly chosen Direct Upload deployment.

## Connect a new Cloudflare Pages project (operator step)

After merging the pilot PR, use the Cloudflare dashboard:

1. Open **Workers & Pages**, create a **new Pages application**, and choose **Connect to Git** (the exact label can vary by dashboard version).
2. Authorize the desired GitHub repository and select **`Celeritas7/Commonplace`**. Do **not** alter the existing GitHub Pages site or attach your main custom domain.
3. Use a clearly separate project name, e.g. **`commonplace-webstudio-pilot`** (Cloudflare assigns the actual `*.pages.dev` hostname). Select **`main`** for the Git production branch only if you want future approved Commonplace merges to rebuild this *staging* project.
4. Framework preset: **None**. Repository/root directory: **`/`** (whole repository for build input). Build command: **`node scripts/build-cloudflare-webstudio.cjs`**. Build output directory: **`dist-cloudflare`**. Set `NODE_VERSION=22` if the environment does not already use Node 22.
5. Deploy, then open the Cloudflare-assigned `https://<your-project>.pages.dev/` landing. It should state **Web Studio staging** and link to **`/Commonplace/Coding/html_css_js_study/offline.html`**. Do **not** call the deployment ready until that live path and its study assets load.

**Authentication configuration, only when you are ready to test login:** The real shared gate sends the user back to the current staging hostname. Configure the **Supabase project's Auth → URL Configuration → Additional Redirect URLs** to allow the **exact** staging callback URL(s), including `https://<your-project>.pages.dev/Commonplace/Coding/html_css_js_study/index.html`. The launcher `offline.html` may also be a return path if sign-in starts there. Use the narrowest allowed paths supported by your auth configuration. Do **not** replace the production Site URL, change allowlisted users or put privileged keys in Pages environment variables. No Supabase settings have been changed by this PR.

## Live staging acceptance (still NOT TESTED)

1. Test in **regular Safari first** using the newly assigned Cloudflare hostname. Do not replace or uninstall the existing GitHub Pages Home Screen icon. Confirm the staging landing and the expected Web Studio footer version.
2. Sign in with an existing approved account after configuring the staging redirect URLs. The app must return to the same staging origin; there is no permission bypass.
3. Open **Study offline**, complete the manifest-verified download, verify **Ready offline** and that **Account sync says staging/cloud sync disabled**.
4. Save a clearly disposable local note and project, run the HTML/CSS/JS preview, and export a study backup if useful.
5. Disconnect the device, close the staging browser, reopen from the **same origin**, and verify local code/notes and preview again. Do not assume Safari and Home Screen apps share storage.
6. Reconnect. Local changes **must not** appear in the production Web Studio account sync because staging study sync is intentionally disabled. Export/import a study backup deliberately if you later want to transfer work.
7. Compare actual startup, download, repair, notes and preview behavior with the unchanged GitHub Pages installation. Record browser/OS, origin, version, file count, status and failure screenshots without private credentials.

Do not claim the physical iPad issue is resolved until the user reports real-device cold-reopen results. The GitHub build and Web Studio browser tests do not validate live Cloudflare distribution, real Google OAuth configuration or physical iPad storage.

## Next — verify the deployed pilot, not just the build

After connecting the separate Cloudflare Pages project, use the read-only `staging_url` input in the [GitHub pilot workflow](https://github.com/Celeritas7/Commonplace/actions/workflows/cloudflare-webstudio-pilot.yml) to compare the live `pages.dev` files against the verified staging pack. It checks all study asset hashes, actual manifest and worker cache headers, and that excluded admin/Python paths return HTTP 404. No account credentials or deployment tokens are needed.

The exact rollout checklist and unperformed iPad results are in [Cloudflare staging live acceptance](CLOUDFLARE-WEBSTUDIO-LIVE-ACCEPTANCE.md). Packaging success is not proof that Cloudflare deployment, real login, or iPad offline reopening works.

## Extending from pilot to full Commonplace

This is a **separate future review**, not automatic:
- address large Python wheels and notebook handling without breaking Python offline study;
- audit URLs, media files, excluded paths and per-file size limits for each section;
- deploy genuine server-enforced, per-learner permissions and private material storage before inviting learners;
- validate Supabase redirect URLs, sync and browser-origin migration deliberately;
- run real iPad acceptance for each enabled section.

**Rollback:** simply stop using or disable the isolated Cloudflare pilot project. GitHub Pages, the existing Home Screen installation and its local storage are unaffected. Do not clear iPad website data.
