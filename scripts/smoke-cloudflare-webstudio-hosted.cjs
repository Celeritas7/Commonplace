'use strict';
// Live Cloudflare Pages smoke test, ONLY when an operator explicitly provides
// the isolated *.pages.dev root. No accounts, cookies, OAuth flows, or cloud
// writes. CacheStorage is used only in a fresh disposable browser profile.
// This does not prove signed-in study or physical iPad Home Screen acceptance.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stagingOrigin } = require('./check-cloudflare-webstudio-live.cjs');

const BASE = '/Commonplace/Coding/html_css_js_study/';
const START = BASE + 'index.html';
const PACK = 'cp-web-studio-downloads-v1';
const engine = process.env.BROWSER || 'chromium';
const offlineUrl = BASE + 'offline.html?cp-pilot-offline-smoke=1';
const origin = stagingOrigin(process.env.CLOUDFLARE_STAGING_URL || process.argv[2]);
const manifest = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../dist-cloudflare/Commonplace/Coding/html_css_js_study/offline-assets.json'), 'utf8'));
assert.equal(manifest.files.length, 58, 'Review the expected asset count if the pilot changes');

let browserContext = null, currentPage = null;
const errors = [], externalHosts = [];
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-hosted-pages-smoke-'));

async function openProfile({ offline = false } = {}) {
  let playwright;
  try { playwright = require('playwright'); }
  catch (_) { playwright = require(path.join(
    process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ||
    '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules', 'playwright')); }
  browserContext = await playwright[engine].launchPersistentContext(profile, {
    headless: true, offline, viewport: { width: 390, height: 844 },
    acceptDownloads: false
  });
  for (const extra of browserContext.pages().slice(1)) await extra.close();
  currentPage = browserContext.pages()[0] || await browserContext.newPage();
  currentPage.setDefaultTimeout(20000);
  currentPage.on('pageerror', error => errors.push(error.name));
  currentPage.on('request', request => {
    const url = new URL(request.url());
    if (/^https?:$/.test(url.protocol) && url.origin !== origin &&
        !externalHosts.includes(url.hostname)) externalHosts.push(url.hostname);
  });
  return currentPage;
}

async function controller() {
  await currentPage.waitForFunction(base => {
    const sw = navigator.serviceWorker?.controller;
    return !!sw && sw.scriptURL.startsWith(location.origin + base + 'sw.js');
  }, BASE, { timeout: 30000 });
  const data = await currentPage.evaluate(async base => {
    const registration = await navigator.serviceWorker.getRegistration(base);
    return {
      secure: isSecureContext,
      scope: registration?.scope,
      controller: navigator.serviceWorker.controller?.scriptURL,
      locked: document.documentElement.classList.contains('cp-locked')
    };
  }, BASE);
  assert.equal(data.secure, true, 'Cloudflare staging must be a secure context');
  assert.equal(data.scope, origin + BASE, 'Unexpected service-worker scope');
  assert(data.controller.startsWith(origin + BASE + 'sw.js'), 'Wrong worker controls the page');
  return data;
}

async function rpc(type) {
  return currentPage.evaluate(async ({ base, type }) => {
    const registration = await navigator.serviceWorker.getRegistration(base);
    if (!registration?.active) throw new Error('Web Studio worker is not active');
    return new Promise((resolve, reject) => {
      const port = new MessageChannel();
      let done = false;
      const timeout = setTimeout(() => {
        if (done) return;
        done = true;
        port.port1.close();
        reject(new Error('Offline worker operation exceeded its deadline'));
      }, type === 'offline-download' ? 300000 : 90000);
      port.port1.onmessage = ({ data }) => {
        if (done || data.progress) return;
        done = true;
        clearTimeout(timeout);
        port.port1.close();
        resolve(data);
      };
      port.port1.onmessageerror = () => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        port.port1.close();
        reject(new Error('Worker message could not be read'));
      };
      registration.active.postMessage({ type }, [port.port2]);
    });
  }, { base: BASE, type });
}

async function assertLocked() {
  await currentPage.locator('#cp-gate [data-a="google"]')
    .waitFor({ state: 'visible', timeout: 20000 });
  assert.equal(await currentPage.evaluate(() =>
    document.documentElement.classList.contains('cp-locked')), true,
    'Fresh signed-out visitor must remain behind the real Commonplace gate');
  // Do not click the Google link: this scenario intentionally tests no auth.
  const signIn = currentPage.locator('#cp-gate h1');
  assert.match(await signIn.textContent(), /Commonplace/i);
}

async function assertLocalOnly() {
  await currentPage.waitForFunction(() =>
    document.getElementById('wb-sync-status')?.textContent
      .includes('Cloud sync is disabled in this Cloudflare pilot'));
  assert.equal(await currentPage.locator('#wb-sync-now').isDisabled(), true,
    'Staging must never offer production progress synchronization');
}

async function test() {
  assert(['chromium', 'webkit'].includes(engine), 'Only Chromium/WebKit are supported');
  const browser = await openProfile();
  const response = await browser.goto(origin + START, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert.equal(new URL(browser.url()).origin, origin,
    'Cloudflare Access or another redirect left the isolated staging origin');
  assert.equal(response?.status(), 200, 'Cloudflare staging index must be HTTP 200');
  await browser.waitForFunction(() => document.body.dataset.webStudioStartup === 'ready');
  await assertLocked();
  await assertLocalOnly();
  await controller();
  console.log('PASS ' + engine +
    ': hosted HTTPS Web Studio loads with real gate locked and local-only staging sync');

  const before = await rpc('offline-status');
  assert(!before.error, before.error || 'Initial saved-file check failed');
  const downloaded = before.ready ? before : await rpc('offline-download');
  assert.equal(downloaded.ready, true, downloaded.error || 'Public staging pack did not verify');
  assert.equal(downloaded.total, manifest.files.length);
  assert.equal(downloaded.done, manifest.files.length);
  assert.equal(downloaded.remainingBytes, 0);
  assert.equal(downloaded.completeRevision, manifest.revision,
    'The hosted complete revision differs from the expected staging release');
  assert.equal(await browser.evaluate(() =>
    !!document.documentElement.classList.contains('cp-locked')), true,
    'Downloading public assets must not unlock the Commonplace gate');
  assert.equal(await browser.evaluate(pack => caches.keys().then(keys => keys.includes(pack)), PACK), true);
  console.log('PASS ' + engine + ': hosted worker downloaded and verified all 58 public staging files');

  // Close the ENTIRE browser and reopen its exact disposable profile with no
  // connection. A page that merely stays open does not prove offline startup.
  await browserContext.close();
  browserContext = null;
  currentPage = null;
  const offlineBrowser = await openProfile({ offline: true });
  const reopened = await offlineBrowser.goto(origin + START, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  assert.equal(reopened?.status(), 200, 'Cold offline index must come from the saved pack');
  await offlineBrowser.waitForFunction(() => document.body.dataset.webStudioStartup === 'ready');
  await controller();
  await assertLocked();
  await assertLocalOnly();
  assert.equal(await offlineBrowser.evaluate(() => navigator.onLine), false,
    'Cold-reopened browser must genuinely be disconnected');
  const offlineState = await rpc('offline-status');
  assert.equal(offlineState.ready, true, 'Saved study pack must remain ready after browser restart');
  assert.equal(offlineState.completeRevision, manifest.revision);
  const offlineFetch = await offlineBrowser.evaluate(async relativeUrl => {
    let saved;
    try {
      const response = await fetch(relativeUrl, { cache: 'no-store' });
      saved = response.status === 200 && (await response.text()).includes('Web Studio');
    } catch (_) { saved = false; }
    let missing;
    try {
      const response = await fetch('/Commonplace/__never_cached_cloudflare_smoke', { cache: 'no-store' });
      missing = response.ok;
    } catch (_) { missing = false; }
    return { saved, missing };
  }, offlineUrl);
  assert.equal(offlineFetch.saved, true, 'Previously saved launcher is not available offline');
  assert.equal(offlineFetch.missing, false, 'Network-negative control unexpectedly succeeded');
  assert.deepEqual(errors, [], 'The staging page raised uncaught runtime errors');
  assert.deepEqual(externalHosts, [],
    'The unsigned pilot unexpectedly requested external hosts (no OAuth was requested)');
  console.log('PASS ' + engine +
    ': real hosted worker cold-reopens offline; the login gate remains locked and no network is available');
  console.log('No production sign-in or user data was used. Physical iPad: NOT TESTED.');
}

(async () => {
  try { await test(); }
  catch (error) {
    console.error('Hosted Cloudflare browser smoke test failed: ' + error.message);
    if (currentPage && !currentPage.isClosed()) {
      try {
        const data = await currentPage.evaluate(async base => {
          const worker = await navigator.serviceWorker?.getRegistration(base);
          return {
            host: location.hostname,
            locked: document.documentElement.classList.contains('cp-locked'),
            controlled: !!navigator.serviceWorker?.controller,
            active: !!worker?.active,
            startup: document.body?.dataset.webStudioStartup,
            offline: navigator.onLine
          };
        }, BASE);
        console.error('Safe diagnostic (no accounts or tokens): ' + JSON.stringify(data));
      } catch (_) {}
    }
    process.exitCode = 1;
  } finally {
    if (browserContext) await browserContext.close().catch(() => {});
    fs.rmSync(profile, { recursive: true, force: true });
  }
})();
