# Phase 5 — Web Studio physical iPad acceptance

**Status:** IN PROGRESS — device acceptance **NOT TESTED**.  
**Recorded:** 2026-11-25 (Japan).  
**Source:** `Celeritas7/Commonplace` `main`, starting after merged PR #80.  
**Web Studio code:** v1.7.4; 58 packaged assets; 1,556,763 bytes; manifest SHA-256 revision `60d7261e8493042068fe2458b1279e0cc8865b21dbbe82fc01b8b9c1787e8ccb`.

This is a release-acceptance record, not a claim that any physical iPad has passed. Do not change the curriculum or delete a learner's local records to run this test.

## Release availability gate — check before testing

GitHub reported **Vercel: failure — "Deployment rate limited — retry in 24 hours"** on PR #80's merge commit `5fd7274b62b10307be561e6b1f14727694a263a3`. **A newer `main` commit `eb7e3d0cf84eee6975e2730540eb58d30194f694` subsequently reported Vercel: success — "Deployment has completed"** (status timestamp 2026-11-24 15:05 UTC). The earlier rate limit is therefore **not the current main-commit status**. However, this GitHub deployment status does **not** independently confirm that the hosted HTML/assets, GitHub Pages endpoint or existing installed iPad app are on Web Studio v1.7.4. The source includes a GitHub Pages app link, but **its live files and the installed Home Screen app have not been independently verified during Phase 5**.

**Use the existing installed Web Studio icon first.** Never switch hostnames or reinstall as a normal update procedure; Safari, GitHub Pages, Vercel and Home Screen contexts can use different local storage. Do not infer deployment readiness from `main` merely being merged.

Before a device PASS, confirm from inside the very browser/app used for testing:

- [ ] The actual Web Studio footer reports `Version 1.7.4` (or a newer documented release).
- [ ] The **Study offline** panel verifies **58 / 58** files, reports **Ready offline**, and has no unexpected file errors.
- [ ] Any update/download has finished; **Update incomplete · previous pack ready offline** means only the older complete pack was verified.
- [ ] If a newly verified revision requires adoption, save work, open **Updates and repair**, and use **Reload app** only after the complete pack is verified.
- [ ] If the intended origin does not show the expected release or the deployment is unavailable, mark the **deployment check FAIL / NOT VERIFIED**, keep local data intact and stop before claiming release acceptance.

A source SHA or test-only manifest revision is not required to match a browser-displayed version identifier; the pack manifest revision is for repository/release verification. Do not paste tokens, OAuth URLs, personal notes, saved HTML/JS or account IDs in any public bug report.

## Main acceptance — installed Home Screen app

**Use a disposable review project**, not valuable work, for the preview and exercise checks. Do not clear website data, unregister workers, reset downloads, reinstall the icon or remove bookmarks.

1. **Online preparation.** Connect to Wi-Fi. Open Web Studio **from the existing Home Screen icon**, not a fresh Safari tab. If the Commonplace gate appears, sign in within this installed app and confirm the app reopens the lesson rather than returning to the sign-in form.
2. **Verify saved revision.** Open **Study offline**. Check the download counts, status and revision notice. If needed, select **Check downloads** or **Download study pack / Resume download** and complete the verification. A completed pack has 58/58 files, **Ready offline**, and no error. Use **Start studying** or **Back to study** to dismiss the panel.
3. **Create distinctive disposable work.** In the HTML lesson bookmark the **Walk-through** reading part and add a note such as `Phase 5 iPad review`. Open **Practice → Projects & backup**, duplicate the Study card as `Phase 5 review`. Modify the JavaScript counter to increment by 2; run **Run preview** and confirm two clicks show **Clicks: 4**. Use **Check exercise** only for the relevant sample exercise. Optionally export a study backup before further testing.
4. **Cold offline launch.** Close Web Studio **completely**, rather than leaving its page visible. Enable Airplane Mode and verify Wi-Fi is also **off** (and cellular data, if available). Open Web Studio again using the **same Home Screen icon**. Record whether the lesson appears and whether the login gate appears.
5. **Practice offline.** Open **Practice → Run preview** using the saved review project. Confirm the counter works with no network. Check that the distinctive note, bookmark, saved code and named project are still present. Record visible errors and whether the independent startup-recovery panel appears.
6. **Reopen again offline.** Close the installed app fully and reopen again while disconnected, confirming that edits and saved reading position remain. This distinguishes a successful cold start from a previously open page.
7. **Reconnect and sync.** Reenable Wi-Fi, open the app and check **Account sync**. A successful round trip requires that the approved account syncs the changed note/project, and another device with the same account can **Load synced work** and verify the records. An **Account · new work** indicator means incoming work still awaits explicit review; it is not itself a sync failure.

Do **not** run a live signed-out test by destroying the working iPad session; sign-out access is covered by synthetic tests. Only note real sign-in behavior if the app naturally requests authentication.

## Safari acceptance — separate context

If regular iPad Safari is also used, perform a separate fresh test on the **same origin** and in that Safari context. The installed Home Screen app's downloads and sign-in must **not** be assumed to transfer to Safari. Record each context as a separate result. Never overwrite a saved project while comparing two storage contexts.

## Acceptance results (fill only after physical testing)

| Item | Installed Home Screen | Safari | Notes / screenshot without secrets |
| --- | --- | --- | --- |
| Correct expected deployment/release | NOT TESTED | NOT TESTED | |
| Real Google return works when sign-in required | NOT TESTED | NOT TESTED | |
| Verified 58/58 pack | NOT TESTED | NOT TESTED | |
| Start studying / close download panel | NOT TESTED | NOT TESTED | |
| Cold offline reopen from icon | NOT TESTED | NOT TESTED | |
| HTML/CSS/JS preview with counter 4 | NOT TESTED | NOT TESTED | |
| Saved note, bookmark, project and reading mark | NOT TESTED | NOT TESTED | |
| Second cold reopen offline | NOT TESTED | NOT TESTED | |
| Reconnection and same-account two-device sync | NOT TESTED | NOT TESTED | |
| Backup export/review in iPad Files | NOT TESTED | NOT TESTED | |
| Offline repair without storage clearing, if required | NOT TESTED | NOT TESTED | |

**Evidence record** — fill in date, physical iPad model/iPadOS version, use mode (Home Screen/Safari), opened origin, app footer version, download status and notes on exact step of any failure. Screenshots should show only UI states; redact any personal content.

```text
Physical iPad model / iPadOS:
App context: Home Screen / Safari
Origin / app footer version:
Ready offline and file count: PASS / FAIL / NOT TESTED
Cold reopen with Wi-Fi and cellular off: PASS / FAIL / NOT TESTED
Run preview (two clicks → Clicks: 4): PASS / FAIL / NOT TESTED
Note + bookmark + project retained: PASS / FAIL / NOT TESTED
Second offline reopen: PASS / FAIL / NOT TESTED
Reconnection/sync: PASS / FAIL / NOT TESTED
Visible error message (exclude tokens or personal content):
```

## Existing automated evidence and limits

- [PR #71](https://github.com/Celeritas7/Commonplace/pull/71): verified saved-revision asset selection and regression checks.
- [PR #76](https://github.com/Celeritas7/Commonplace/pull/76): independent startup recovery on main-interface failure.
- [PR #78](https://github.com/Celeritas7/Commonplace/pull/78): safe complete-revision updates and protected reload.
- [PR #80](https://github.com/Celeritas7/Commonplace/pull/80) and [Actions run 45419024020](https://github.com/Celeritas7/Commonplace/actions/runs/45419024020): contracts and Chromium/WebKit suites passed, including **real shared gate + real worker together at a synthetic non-localhost HTTPS test origin**. The provider, accounts, certificate and cloud endpoint were test fixtures; not live Google sign-in or production RLS.

A physical iPad does not share Playwright's browser engine or session/Storage behavior. **Do not mark Phase 5 complete unless the actual installed Home Screen app passes**, or a specific failure is documented and addressed. Revisit Vercel/host deployment status after a successful deployment before calling release verification complete.

## Scope and safety

This document does not alter any application code, Supabase schema, shared gate, offline manifests, caches, practice records, projects, notes, bookmarks, highlights or account metadata. The legacy [Phase 7 report](PHASE7_VALIDATION.md) covers a historical v1.7.1 checkpoint; this is the current v1.7.4 acceptance document and does not rewrite those older observations.
