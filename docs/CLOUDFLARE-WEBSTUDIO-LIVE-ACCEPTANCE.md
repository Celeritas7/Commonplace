# Cloudflare Web Studio staging — live deployment and iPad acceptance

**Status: LIVE CLOUDFLARE DEPLOYMENT UNVERIFIED; PHYSICAL iPAD NOT TESTED.**

This phase follows merged staging-packaging PR #83. The original GitHub Pages Commonplace app, production Supabase progress and existing iPad Home Screen storage are **not** changed. The Cloudflare pilot remains limited to Web Studio; it does not publish the undeployed Admin Studio or the large Python runtime.

## Evidence levels (do not conflate them)

1. **Source/build PASS:** GitHub Actions builds `dist-cloudflare/` and verifies exact SHA-256/size for the selected 58-file pack, including the local-only sync adapter.
2. **Hosted-file PASS:** after a separate Pages project exists, the read-only GitHub Action checks what Cloudflare actually serves at the **exact `*.pages.dev` hostname**. This has not run with a live hostname.
3. **Browser/iPad PASS:** the learner actually opens the hosted staging build, downloads the pack and performs a full offline cold start, preview and data-retention check. This has not been performed.
4. **Real Google/Supabase redirect PASS:** after narrow staging callback URLs are approved, an authorized account completes sign-in on the staging origin. This is separate from synthetic browser tests and is not yet verified.

Passing 1 or 2 does **not** establish 3 or 4.

## Step A — Create or inspect the isolated Cloudflare Pages site

In Cloudflare **Workers & Pages**, create a separate **Pages project** connected to `Celeritas7/Commonplace`. Use **Framework: None**, repository root `/`, build command `node scripts/build-cloudflare-webstudio.cjs`, output `dist-cloudflare`, and Node 22 where needed. Keep the existing GitHub Pages installation and domain unchanged.

Do **not** use the repository root as the Pages output or upload the entire GitHub checkout. The build includes only the selected public Web Studio assets and produces a custom `404.html`, preventing absent admin/backend/Python paths from being returned as the staging landing page.

The finished site should have a clearly labelled staging landing page at `https://<project>.pages.dev/` linking to `/Commonplace/Coding/html_css_js_study/offline.html`. Do not replace or reinstall the existing Home Screen icon to visit it.

## Pre-deployment browser test of the exact staging output

The Cloudflare pilot workflow now includes separate **Chromium** and **WebKit** jobs that build the actual `dist-cloudflare/` output, serve it on an isolated non-localhost HTTPS origin and run its original Commonplace login gate and service worker together.

These browser tests use a **synthetic previously-approved cached session**, not a real Google sign-in. They verify 58/58 pack hashing, local-only staging sync (no production account writes), code preview, notes, bookmarks, a named project, complete browser shutdown and offline cold reopening, and re-locking when the synthetic session is removed. All profiles, certificates and the restricted proxy exist only during the CI run.

**Do not mistake this for a live `pages.dev` or physical iPad result.** The live checker below still requires your separate Cloudflare Pages project URL, and real Google login needs a separate, narrow Supabase redirect configuration.

## Step B — Verify the *live* file delivery from GitHub Actions

After deployment, open [Build isolated Cloudflare Web Studio staging pilot](https://github.com/Celeritas7/Commonplace/actions/workflows/cloudflare-webstudio-pilot.yml), choose **Run workflow**, select **main**, and enter the actual staging **root** in the optional `staging_url` field.

For example, the accepted format is `https://your-pilot.pages.dev/`. The checker intentionally rejects GitHub Pages, Vercel, `http://`, paths, ports, URL query tokens and credentials. **Do not paste your Supabase/Google credentials into this field.**

This workflow runs the build and local contract tests, then (only when a root URL is supplied) runs `node scripts/check-cloudflare-webstudio-live.cjs`. The latter is strictly **read-only**: it sends unauthenticated GETs to the supplied `*.pages.dev` origin and verifies:

- the staging landing and search-engine opt-out header;
- worker code, correct JavaScript MIME and cache policy;
- live manifest revision and cache policy;
- **all 58 actual hosted assets**, matching SHA-256 and length exactly;
- the unchanged shared gate and **local-only** staging account-sync stub;
- that excluded `platform/`, Python, tests/docs and GitHub workflow paths return **HTTP 404**.

A failing check may indicate a stale Cloudflare deploy, wrong output directory, Pages SPA fallback, wrong MIME, missing file, or content rewriting. **Do not treat source-build PASS as hosted-file PASS**. No Cloudflare account API credentials are used. The workflow only validates; it cannot create, deploy, or configure a Cloudflare project.

If the deployed stage is connected to a *different branch* from the workflow's chosen branch, use matching revisions before comparing hashes. Updating `main` does not by itself guarantee Cloudflare has finished deploying.

## Step B2 — Browser smoke test against the actual Cloudflare hostname

The same **Run workflow** action now includes two optional jobs, **live_browser_smoke (chromium)** and **live_browser_smoke (webkit)**, after the hosted-file checker succeeds. These jobs require a non-empty `staging_url` and **never** run for ordinary PR/push builds.

They use fresh temporary browser profiles with **no sign-in session** and no Google/Supabase credentials. On the exact `https://<pilot>.pages.dev/` origin they:

- verify the real Commonplace gate is locked, startup has completed and staging account sync is disabled;
- verify the actual service worker controls the correct Web Studio scope;
- download and verify the complete public 58-file study pack using the existing worker, with no user account;
- close the entire browser and reopen the same isolated profile **offline**;
- confirm the launcher and worker still work offline while an unauthorized visitor remains locked;
- confirm an unrelated uncached request cannot reach the network.

This is a **signed-out infrastructure smoke test**, not a login bypass and **not** an approved learner's offline-study test. It does not click the Google sign-in link, read another user's notes, access production Supabase study data, or verify full lesson/practice interaction after login. The physical iPad/Home Screen test and real approved-account Google OAuth return remain outstanding.

If the live check fails because Cloudflare Pages was not deployed, uses a different build, requires Cloudflare Access, or has incorrect static headers, do not reset your original GitHub Pages app. Correct the separate staging deployment and rerun the workflow. The live browser jobs are skipped if the preceding static-file verification fails.

## Step C — Configure login only when ready to test

Web Studio uses the original Commonplace shared gate and an approved Supabase account. The pilot deliberately **disables production study progress sync** while retaining genuine sign-in. In Supabase **Auth → URL Configuration → Additional Redirect URLs**, add the exact staging callback path(s) appropriate to how you open the study page, including:

`https://<project>.pages.dev/Commonplace/Coding/html_css_js_study/index.html`

If you begin sign-in from the pilot's `offline.html`, add that path when required. Do **not** change the production Site URL, add unapproved accounts, reveal private access tokens or enable production sync in the staging build. Cloudflare Pages headers and the existing static login curtain do **not** protect private assigned lessons; this is not an approved multi-user learner deployment.

## Step D — iPad and Safari acceptance

Test the **new Cloudflare origin separately** in ordinary Safari first. Do not assume the old GitHub Pages Home Screen installation shares login, caches or localStorage with it.

1. Open the Cloudflare staging landing, follow its Web Studio link, and confirm **Version 1.7.4** or the specifically documented later revision.
2. Sign in with the approved Commonplace account in that same browser context. If Google returns to a login screen, record the exact visible error (never the callback URL or token) and stop.
3. Open **Study offline** and verify **Ready offline, 58/58 files**; confirm **Account sync** explicitly says the Cloudflare pilot is **local only**.
4. Create a disposable note/bookmark/project, run the HTML/CSS/JS practice preview, and record the resulting counter value.
5. Export a backup if needed, close the browser fully, disable Wi-Fi and mobile data, and reopen that **same Cloudflare staging origin**. Check the lesson, project, note and preview again.
6. Reconnect and repeat. Do not expect notes made in the staging origin to upload into the regular Commonplace account: this is a deliberate safety boundary.
7. Only after this Safari sequence works, consider testing a **separately added staging Home Screen icon**. Never replace the existing GitHub Pages icon or clear website data.

## Record results

| Acceptance item | Outcome |
| --- | --- |
| Cloudflare project and deployed URL | NOT VERIFIED |
| Read-only hosted-file integrity, 58 files | NOT TESTED |
| Hosted worker + manifest MIME and cache behavior | NOT TESTED |
| No admin/Python source exposed | NOT TESTED |
| Live approved login/redirect | NOT TESTED |
| Live signed-out Cloudflare browser cold startup (Chromium/WebKit) | NOT TESTED — requires staging URL |
| iPad Safari cold offline startup | NOT TESTED |
| iPad Home Screen cold offline startup | NOT TESTED |
| Practice preview, notes and bookmarks preserved | NOT TESTED |
| Staging account sync remains disabled | NOT TESTED |

**Report:** Cloudflare staging hostname, app footer version, device/iPadOS, stage where it failed, visible status and a screenshot without user data or credentials.

**Rollback:** stop using/disable the staging Pages project. The existing GitHub Pages app and its stored progress remain untouched.
