'use strict';
// Phase 4: the REAL Commonplace gate and REAL Web Studio service worker run
// together on a non-localhost HTTPS origin. Only the test copy of the gate's
// allowlist is changed to a synthetic hash. No production users or data.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { execFileSync } = require('node:child_process');
let playwright;
try { playwright = require('playwright'); }
catch (_) { playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules', 'playwright')); }

const ROOT = path.resolve(__dirname, '../../..');
const HOST = 'web-studio.example.test';
const BASE = '/Commonplace/Coding/html_css_js_study/';
const APP_PATH = BASE + 'index.html';
const PACK = 'cp-web-studio-downloads-v1';
const OWNER = 'commonplace_web_studio_owner_v1';
const STUDY = 'commonplace_web_studio_v1';
const engine = process.env.BROWSER || 'chromium';
const approved = { id: 'd94f846a-21bf-4ec7-9a69-25ec70bb7d17', email: 'approved@example.test' };
const denied = { id: 'ab90119f-adb0-4e3c-a603-84c4e2ccebf0', email: 'denied@example.test' };
const hash = body => crypto.createHash('sha256').update(body).digest('hex');
const gate = fs.readFileSync(path.join(ROOT, '_lib/gate.js'), 'utf8');
const allowPattern = /var ALLOW = \[[^\]]+\];/g;
assert.equal((gate.match(allowPattern) || []).length, 1, 'the real gate must have exactly one allowlist setting');
const fixtureGate = gate.replace(allowPattern, 'var ALLOW = ["' + hash(approved.email) + '"];');
const sessionKey = gate.match(/var SKEY = '([^']+)'/)[1];
const providerOrigin = gate.match(/var SUPABASE_URL = '([^']+)'/)[1];
const manifestSource = JSON.parse(fs.readFileSync(path.join(__dirname, '../offline-assets.json'), 'utf8'));
const fixtureManifest = JSON.parse(JSON.stringify(manifestSource));
const gateEntry = fixtureManifest.files.find(entry => entry.url === '../../_lib/gate.js');
assert(gateEntry, 'real shared gate must be included in Web Studio pack');
gateEntry.bytes = Buffer.byteLength(fixtureGate);
gateEntry.sha256 = hash(fixtureGate);
fixtureManifest.bytes = fixtureManifest.files.reduce((total, file) => total + file.bytes, 0);
fixtureManifest.revision = hash(JSON.stringify(fixtureManifest.files));
assert.notEqual(fixtureManifest.revision, manifestSource.revision, 'a synthetic gate needs its own test-only verified revision');

const native = JSON.stringify({
  version: 1, language: 'html', view: 'book',
  project: { html: '<h1>Fixture study card</h1>', css: '.card { padding: 18px; }', js: '' },
  lessons: { 'html-elements': { part: 2, note: 'Saved fixture note', bookmarks: [2], read: true } }
});
const protectedSeed = {
  [STUDY]: native,
  commonplace_wdb_v1: '{"done":{"l123":1},"notes":{"l123":"Fixture course note"}}',
  'cpx.bookmarks': '[{"path":"/another-section","title":"Fixture bookmark"}]',
  'cpx.marks': '{"/another-section":[{"text":"Fixture highlight"}]}'
};
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg' };
const cloud = { row: null, writes: 0, calls: 0 };
const profiles = [], sockets = new Set();
let temp, site, proxy, origin, proxyURL, networkDown = false, context, page, activeErrors = [];

function certs() {
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'commonplace-web-https-'));
  const key = path.join(temp, 'test.key'), cert = path.join(temp, 'test.crt');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', cert, '-days', '1',
    '-subj', '/CN=' + HOST, '-addext', 'subjectAltName=DNS:' + HOST
  ], { stdio: 'ignore' });
  return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}
async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return server.address().port;
}
async function cloudAction(req, res) {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  assert.equal(request.user, approved.id, 'only the approved synthetic account may reach cloud transport');
  cloud.calls++;
  if (request.kind === 'read') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ data: cloud.row, error: null })); return;
  }
  assert.equal(request.kind, 'write');
  if (request.params.expected_revision !== (cloud.row?.revision || 0)) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ data: { conflict: true, revision: cloud.row?.revision || 0, snapshot: cloud.row?.snapshot || null }, error: null })); return;
  }
  cloud.writes++;
  cloud.row = { revision: (cloud.row?.revision || 0) + 1, snapshot: request.params.new_snapshot };
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ data: { conflict: false, ...cloud.row }, error: null }));
}
async function servers() {
  site = https.createServer(certs(), (req, res) => {
    if (networkDown) { req.socket.destroy(); return; }
    const url = new URL(req.url, 'https://' + HOST);
    if (url.pathname === '/__fixture_cloud') { cloudAction(req, res).catch(() => res.destroy()); return; }
    if (url.pathname === BASE + 'offline-assets.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(fixtureManifest)); return;
    }
    if (url.pathname === '/Commonplace/_lib/gate.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }).end(fixtureGate); return;
    }
    let file;
    try { file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname.replace(/^\/Commonplace(?=\/)/, ''))); }
    catch (_) { res.writeHead(400).end(); return; }
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  const sitePort = await listen(site);
  origin = 'https://' + HOST + ':' + sitePort;
  proxy = http.createServer((_req, res) => res.writeHead(502).end('Only the isolated HTTPS fixture is allowed'));
  proxy.on('connect', (req, socket, head) => {
    const target = req.url.split(':');
    if (target.length !== 2 || target[0] !== HOST || Number(target[1]) !== sitePort) {
      socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); return;
    }
    const upstream = net.connect({ host: '127.0.0.1', port: sitePort });
    sockets.add(socket); sockets.add(upstream);
    socket.on('close', () => sockets.delete(socket));
    upstream.on('close', () => sockets.delete(upstream));
    upstream.once('connect', () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      socket.pipe(upstream); upstream.pipe(socket);
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
  });
  proxyURL = 'http://127.0.0.1:' + await listen(proxy);
}

async function profile({ offline = false, callbackUser = approved, previous } = {}) {
  const folder = previous || fs.mkdtempSync(path.join(os.tmpdir(), 'commonplace-web-auth-offline-'));
  if (!previous) profiles.push(folder);
  else assert(profiles.includes(previous), 'only the fixture-created browser profile may be reused');
  const ctx = await playwright[engine].launchPersistentContext(folder, {
    headless: true, offline, viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true, proxy: { server: proxyURL },
    // Chromium's service-worker TLS fetch does not inherit every page-level
    // certificate exception. Only the isolated browser gets this test flag.
    ...(engine === 'chromium' ? { args: ['--ignore-certificate-errors'] } : {}),
    acceptDownloads: true
  });
  if (!offline) await ctx.setOffline(false);
  for (const extra of ctx.pages().slice(1)) await extra.close();
  await ctx.addInitScript(({ origin, sessionKey, protectedSeed, callbackUser, approved }) => {
    if (window !== window.top || location.origin !== origin) return;
    const flag = 'web-studio-real-gate-worker-fixture';
    if (localStorage.getItem(flag) !== '1') {
      for (const [name, value] of Object.entries(protectedSeed)) localStorage.setItem(name, value);
      localStorage.setItem(flag, '1');
    }
    const returning = /[#&]access_token=/.test(location.hash) || /[?&]code=/.test(location.search);
    const callbacks = [];
    let completeReturn;
    const waitReturn = new Promise(resolve => { completeReturn = resolve; });
    const getSavedSession = () => JSON.parse(localStorage.getItem(sessionKey) || 'null');
    const state = window.__httpsFixture = { seen: [], cloudRequests: 0, consumed: false, returning };
    state.release = () => {
      state.consumedUrl = location.href;
      const session = { user: callbackUser, access_token: 'FIXTURE-ONLY' };
      localStorage.setItem(sessionKey, JSON.stringify(session));
      const url = new URL(location.href); url.hash = '';
      for (const name of ['code','error','error_code','error_description']) url.searchParams.delete(name);
      history.replaceState(null, '', url.href);
      state.consumed = true;
      completeReturn({ data: { session }, error: null });
      for (const cb of callbacks) cb('SIGNED_IN', session);
    };
    const builder = (kind, params) => {
      let signal, promise;
      const api = {
        select() { return api; }, eq() { return api; }, maybeSingle() { return api; },
        abortSignal(next) { signal = next; return api; },
        then(resolve, reject) {
          if (!promise) promise = Promise.resolve().then(async () => {
            state.cloudRequests++;
            const response = await fetch('/__fixture_cloud', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ kind, user: approved.id, params }), signal
            });
            return response.json();
          });
          return promise.then(resolve, reject);
        }
      };
      return api;
    };
    const client = {
      auth: {
        getSession() {
          state.seen.push(location.href);
          if (returning && !state.consumed) return waitReturn;
          return Promise.resolve({ data: { session: getSavedSession() }, error: null });
        },
        onAuthStateChange(callback) {
          callbacks.push(callback);
          return { data: { subscription: { unsubscribe() {} } } };
        }
      },
      from(name) {
        if (name !== 'commonplace_web_studio') throw new Error('Unexpected test table');
        return builder('read');
      },
      rpc(name, params) {
        if (name !== 'web_studio_sync_write') throw new Error('Unexpected test RPC');
        return builder('write', params);
      }
    };
    window.supabase = { createClient() { return client; } };
  }, { origin, sessionKey, protectedSeed, callbackUser, approved });

  // Route only the external OAuth provider to a synthetic same-window return.
  // The app, shared gate, real worker, static files and cloud fixture travel
  // through the HTTPS server and its proxy, never Playwright fulfill routes.
  await ctx.route('**/auth/v1/authorize*', async route => {
    const url = new URL(route.request().url());
    assert.equal(url.origin, providerOrigin);
    const target = new URL(url.searchParams.get('redirect_to'));
    assert.equal(target.origin, origin);
    target.hash = 'access_token=FIXTURE-ONLY&refresh_token=FIXTURE-ONLY&type=signup';
    const body = '<!doctype html><meta charset="utf-8"><title>Synthetic provider</title><script>location.replace(' +
      JSON.stringify(target.href) + ');</script>';
    await route.fulfill({ status: 200, contentType: 'text/html', body });
  });
  context = ctx;
  page = ctx.pages()[0] || await ctx.newPage();
  page.setDefaultTimeout(20000);
  activeErrors = [];
  page.on('pageerror', err => activeErrors.push(err.name));
  return { ctx, folder, page };
}
async function workerReady() {
  await page.waitForFunction(base => !!navigator.serviceWorker.controller &&
    navigator.serviceWorker.controller.scriptURL.startsWith(location.origin + base + 'sw.js'), BASE, { timeout: 30000 });
  const actual = await page.evaluate(async base => {
    const reg = await navigator.serviceWorker.getRegistration(base);
    return { secure: isSecureContext, host: location.hostname, protocol: location.protocol,
      scope: reg?.scope, script: navigator.serviceWorker.controller?.scriptURL };
  }, BASE);
  assert.equal(actual.protocol, 'https:');
  assert.equal(actual.host, HOST, 'login must NOT use the localhost bypass');
  assert.equal(actual.secure, true);
  assert.equal(actual.scope, origin + BASE);
  assert.match(actual.script, /\/sw\.js/);
}
async function rpc(type) {
  return page.evaluate(async ({ base, type }) => {
    const reg = await navigator.serviceWorker.getRegistration(base);
    assertRegistration(reg);
    function assertRegistration(reg) {
      if (!reg?.active) throw new Error('The real offline worker is not active');
    }
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('Real worker RPC timed out')); }, 100000);
      channel.port1.onmessage = e => {
        if (e.data.progress) return;
        clearTimeout(timeout); channel.port1.close(); resolve(e.data);
      };
      reg.active.postMessage({ type }, [channel.port2]);
    });
  }, { type, base: BASE });
}
async function waitFor(test, message, timeoutMs = 35000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await test()) return;
    await new Promise(resolve => setTimeout(resolve, 90));
  }
  assert.fail(message);
}
async function savedWork() {
  return page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])),
    ['cpx.bookmarks','cpx.marks','commonplace_wdb_v1',STUDY]);
}
async function run() {
  assert(['chromium','webkit'].includes(engine));
  await servers();
  const regular = await profile();
  await page.goto(origin + APP_PATH, { waitUntil: 'domcontentloaded' });
  await page.locator('#cp-gate [data-a=google]').waitFor({ state: 'visible' });
  await workerReady();
  const beforeCloud = cloud.calls;
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('cp-locked')), true);
  assert.equal(await page.evaluate(key => localStorage.getItem(key), OWNER), null);
  assert.equal(cloud.calls, beforeCloud);
  console.log('PASS ' + engine + ': non-localhost HTTPS, real worker control and real gate lock before approval');

  await page.locator('#cp-gate [data-a=google]').click();
  await page.waitForFunction(() => !!window.__httpsFixture?.returning && window.__httpsFixture.seen.length > 0);
  const callback = page.url();
  assert(callback.includes('access_token=FIXTURE-ONLY'), 'the controlled callback must retain OAuth fragment until the SDK consumes it');
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('cp-locked')), true);
  assert.equal(cloud.calls, beforeCloud, 'no cloud work is allowed before the gate approves');
  await page.evaluate(() => window.__httpsFixture.release());
  await page.waitForFunction(() => !document.documentElement.classList.contains('cp-locked'));
  assert.equal(await page.evaluate(() => window.__httpsFixture.consumedUrl), callback);
  await page.waitForFunction(() => document.querySelector('#wb-sync-status')?.dataset.state === 'synced');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), OWNER), approved.id);
  assert(cloud.calls > beforeCloud && cloud.writes > 0);
  assert(!page.url().includes('access_token='));
  await workerReady();
  console.log('PASS ' + engine + ': synthetic Google return preserves callback, permits approved account, and waits before sync');

  await page.locator('#wb-offline-toggle').click();
  await page.locator('#wb-offline-download').click();
  await waitFor(async () => /Ready offline|Updated pack verified/.test(await page.locator('#wb-offline-status').textContent()),
    'real HTTPS worker did not finish verifying the explicit downloaded pack', 180000);
  const full = await rpc('offline-status');
  assert.equal(full.ready, true, full.error || 'The synthetic HTTPS pack is incomplete');
  assert.equal(full.done, fixtureManifest.files.length);
  assert.equal(full.completeRevision, fixtureManifest.revision);
  assert.equal((await page.evaluate(async () => (await caches.keys()).includes('cp-web-studio-downloads-v1'))), true);
  console.log('PASS ' + engine + ': full SHA-256 verified pack through a real HTTPS worker with the synthetic gate');

  await page.locator('#wb-offline-close').click();
  await page.locator('.wb-app-tabs [data-view="notes"]').click();
  await page.locator('#wb-note-editor').fill('Approved HTTPS learner note');
  await page.locator('.wb-app-tabs [data-view="practice"]').click();
  const html = '<main class="card"><h1>Offline HTTPS page</h1><button id="counter">Clicks: 0</button></main>';
  const css = '.card { padding: 24px; }';
  const js = 'const b=document.querySelector("#counter");let n=0;b.addEventListener("click",()=>{n+=2;b.textContent="Clicks: "+n;});';
  for (const [file, source] of [['html',html],['css',css],['js',js]]) {
    await page.locator('.wb-file-tabs [data-file="' + file + '"]').click();
    await page.locator('#wb-editor').fill(source);
  }
  await page.locator('#wb-project-current').waitFor({ state: 'visible' });
  await waitFor(() => cloud.row?.snapshot?.study?.project?.js === js, 'synthetic account sync did not accept online study edits');
  const recordsBefore = await savedWork();
  const nonNative = await page.evaluate(async () => {
    await (await caches.open('cp-python-downloads-v1')).put('/fixture-do-not-touch', new Response('Preserve unrelated pack'));
    return localStorage.getItem('cpx.bookmarks');
  });
  assert.equal(nonNative, protectedSeed['cpx.bookmarks']);

  networkDown = true; await context.setOffline(true);
  await context.close();
  context = null; page = null;
  const reopened = await profile({ previous: regular.folder, offline: true });
  await page.goto(origin + APP_PATH, { waitUntil: 'domcontentloaded' });
  await workerReady();
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('cp-locked')), false);
  assert.equal(await page.locator('#cp-gate').count(), 0);
  assert.equal(await page.evaluate(() => document.body.dataset.webStudioStartup), 'ready');
  const networkFailure = await page.evaluate(async () => {
    try { await fetch('/Commonplace/Coding/html_css_js_study/__uncached_offline_probe', { cache: 'no-store' }); return false; }
    catch (_) { return true; }
  });
  assert.equal(networkFailure, true, 'the network-negative control must fail after cold restart');
  const recordsAfter = await savedWork();
  assert.equal(recordsAfter['cpx.bookmarks'], recordsBefore['cpx.bookmarks']);
  assert.equal(recordsAfter['cpx.marks'], recordsBefore['cpx.marks']);
  assert.equal(recordsAfter['commonplace_wdb_v1'], recordsBefore['commonplace_wdb_v1']);
  await page.locator('.wb-app-tabs [data-view="practice"]').click();
  await page.locator('#wb-run').click();
  const preview = page.frameLocator('#wb-preview-host iframe');
  await preview.locator('#counter').click(); await preview.locator('#counter').click();
  assert.equal(await preview.locator('#counter').textContent(), 'Clicks: 4');
  await page.locator('.wb-app-tabs [data-view="notes"]').click();
  assert.equal(await page.locator('#wb-note-editor').inputValue(), 'Approved HTTPS learner note');
  assert.equal((await rpc('offline-status')).ready, true);
  assert.equal(await page.evaluate(async () =>
    (await (await caches.open('cp-python-downloads-v1')).match('/fixture-do-not-touch')).text()
  ), 'Preserve unrelated pack');
  console.log('PASS ' + engine + ': full browser closed/reopened offline with real gate, worker, saved notes, code and preview');

  await page.locator('#wb-note-editor').fill('HTTPS note edited offline');
  assert.notEqual(cloud.row?.snapshot?.study?.lessons?.['html-elements']?.note, 'HTTPS note edited offline');
  networkDown = false; await context.setOffline(false);
  await waitFor(() => cloud.row?.snapshot?.study?.lessons?.['html-elements']?.note === 'HTTPS note edited offline',
    'offline note did not synchronize after the real HTTPS app reconnected', 50000);
  console.log('PASS ' + engine + ': offline edits sync only after reconnection and only for the approved synthetic account');

  // A session removed while disconnected must not bypass the real gate merely
  // because the asset pack is already verified and the worker controls it.
  networkDown = true; await context.setOffline(true);
  await page.evaluate(([key]) => {
    localStorage.removeItem(key); localStorage.removeItem('cp:gate:ok');
  }, [sessionKey]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#cp-gate [data-a=google]').waitFor({ state: 'visible' });
  await workerReady();
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('cp-locked')), true);
  await page.locator('#cp-gate [data-a=google]').click();
  assert.match(await page.locator('#cp-gate .g-msg').textContent(), /You are offline/);
  assert.equal(cloud.row?.snapshot?.study?.lessons?.['html-elements']?.note, 'HTTPS note edited offline');
  console.log('PASS ' + engine + ': offline signed-out learner stays locked even with verified study files');
  await context.close(); context = null; page = null;

  // A different profile with a denied synthetic account must stay locked
  // despite having an active genuine worker; no account data may be uploaded.
  networkDown = false;
  const deniedProfile = await profile({ callbackUser: denied });
  await page.goto(origin + APP_PATH, { waitUntil: 'domcontentloaded' });
  await page.locator('#cp-gate [data-a=google]').waitFor({ state: 'visible' });
  await workerReady();
  const beforeDenied = cloud.calls;
  await page.goto(origin + APP_PATH + '?code=DENIED-FIXTURE', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__httpsFixture?.returning && window.__httpsFixture.seen.length > 0);
  await page.evaluate(() => window.__httpsFixture.release());
  await page.locator('#cp-gate h1').filter({ hasText: 'Not allowed' }).waitFor();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), OWNER), null);
  assert.equal(cloud.calls, beforeDenied, 'denied account must never read or write the cloud fixture');
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('cp-locked')), true);
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).lessons['html-elements'].note, STUDY), 'Saved fixture note');
  console.log('PASS ' + engine + ': denied callback remains locked with real HTTPS worker and preserves study records');
  await context.close(); context = null; page = null;
  assert.deepEqual(activeErrors, [], 'no uncaught page errors during denied flow');
  console.log('PASS ' + engine + ': real gate + real worker HTTPS integration complete; real Google and physical iPad NOT TESTED');
}
(async () => {
  try { await run(); }
  catch (error) {
    console.error('HTTPS gate-worker fixture failed:', error);
    if (page && !page.isClosed()) {
      try {
        const diag = await page.evaluate(async base => {
          const reg = await navigator.serviceWorker?.getRegistration(base);
          return { host: location.hostname, protocol: location.protocol, secure: isSecureContext,
            locked: document.documentElement.classList.contains('cp-locked'),
            controller: navigator.serviceWorker?.controller?.scriptURL ? 'present' : 'missing',
            workerActive: reg?.active ? 'yes' : 'no', installing: reg?.installing?.state || 'none',
            workerScope: reg?.scope ? 'present' : 'none', startup: document.body?.dataset.webStudioStartup,
            offline: navigator.onLine, offlineControls:document.getElementById('wb-offline-status')?.textContent,
            offlineError:document.getElementById('wb-offline-error')?.textContent };
        }, BASE);
        console.error('Synthetic diagnostic (no tokens or local records):', JSON.stringify(diag));
      } catch (_) {}
      try {
        fs.mkdirSync('test-results', { recursive: true });
        await page.screenshot({ path: 'test-results/web-studio-gate-worker-' + engine + '.png', fullPage: true });
      } catch (_) {}
    }
    process.exitCode = 1;
  } finally {
    if (context) await context.close().catch(() => {});
    for (const socket of sockets) socket.destroy();
    if (proxy) await new Promise(resolve => proxy.close(resolve));
    if (site) await new Promise(resolve => site.close(resolve));
    for (const profilePath of profiles) fs.rmSync(profilePath, { recursive: true, force: true });
    if (temp) fs.rmSync(temp, { recursive: true, force: true });
  }
})();
