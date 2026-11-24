'use strict';
// Real service-worker acceptance against an isolated HTTP origin. Production
// gate.js is served byte-for-byte; its documented localhost bypass applies.
// The account client below is a test double: no production account is used.
// Chromium/WebKit here are desktop engines, not a physical iPad/Safari test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
let playwright;
try { playwright = require('playwright'); }
catch (_) { playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules', 'playwright')); }

const ROOT = path.resolve(__dirname, '../../..');
const BASE = '/Commonplace/Coding/html_css_js_study/';
const KEY = 'commonplace_web_studio_v1';
const LEGACY = 'commonplace_wdb_v1';
const PACK = 'cp-web-studio-downloads-v1';
const engine = process.env.BROWSER || 'chromium';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const originalManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../offline-assets.json'), 'utf8'));
let manifest = originalManifest, origin, server, page;
let networkDown = false, blockedPath = '', oldWorker = false;
const replacements = new Map(), requests = [], held = new Set();
const profiles = [], contexts = [];
const contextProfiles = new Map();
const cloud = { row: null, writes: 0 };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const relativePath = value => new URL(value, 'http://fixture' + BASE).pathname;
const fixtureOldWorker = `
const CACHE = 'html-css-js-study-shell-v2';
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.put(new URL('index.html', self.location), new Response('<!doctype html><title>Older Web Studio</title><h1 id="old-shell">Older cached Web Studio</h1>', {headers:{'Content-Type':'text/html'}}));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (new URL(event.request.url).pathname.endsWith('/index.html')) event.respondWith(caches.open(CACHE).then(c => c.match(new URL('index.html', self.location))));
});`;

async function startServer() {
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://fixture');
    requests.push(url.pathname);
    if (networkDown) { req.socket.destroy(); return; }
    if (url.pathname === '/__offline_cloud') {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const value = JSON.parse(Buffer.concat(chunks).toString());
      let data = cloud.row;
      if (value.kind === 'write') {
        assert.equal(value.params.expected_owner, '851fc877-ddac-44a4-885f-f7de570f0907');
        if (value.params.expected_revision !== (cloud.row?.revision || 0)) data = { conflict: true, revision: cloud.row?.revision || 0, snapshot: cloud.row?.snapshot || null };
        else { cloud.writes++; cloud.row = { revision: (cloud.row?.revision || 0) + 1, snapshot: value.params.new_snapshot }; data = { conflict: false, ...cloud.row }; }
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ data, error: null })); return;
    }
    if (url.pathname === BASE + '__offline_harness.html') {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }).end('<!doctype html><title>Offline acceptance harness</title><h1>Isolated service worker fixture</h1>'); return;
    }
    if (url.pathname === BASE + 'sw.js' && oldWorker) {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }).end(fixtureOldWorker); return;
    }
    if (url.pathname === blockedPath) {
      // Send headers, but deliberately withhold the body. This covers an
      // interrupted transfer rather than only a request which never starts.
      res.writeHead(200, { 'Content-Type': MIME[path.extname(url.pathname)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.flushHeaders(); held.add(res); res.on('close', () => held.delete(res)); return;
    }
    if (url.pathname === BASE + 'offline-assets.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(manifest)); return;
    }
    let file;
    try { file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname.replace(/^\/Commonplace(?=\/)/, ''))); }
    catch (_) { res.writeHead(400).end(); return; }
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (replacements.has(url.pathname)) res.end(replacements.get(url.pathname));
    else fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
}

async function until(predicate, message, ms = 20000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
  assert.fail(message);
}
async function textHas(selector, pattern) {
  await page.waitForFunction(({ selector, source, flags }) => new RegExp(source, flags).test(document.querySelector(selector)?.textContent || ''), { selector, source: pattern.source, flags: pattern.flags });
}
async function openPanel() {
  if (!await page.locator('#wb-offline').isVisible()) await page.locator('#wb-offline-toggle').click();
}
async function requireInViewport(selector, message) {
  await until(() => page.locator(selector).evaluate(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth;
  }), message, 5000);
}
async function readyController() {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
}
async function rpc(type) {
  return page.evaluate(async ({ type, base }) => {
    const registration = await navigator.serviceWorker.getRegistration(base);
    if (!registration?.active) throw new Error('No active Web Studio worker');
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('Offline acceptance RPC timed out: ' + type)); }, 90000);
      channel.port1.onmessage = ({ data }) => {
        if (data.progress) return;
        clearTimeout(timeout); channel.port1.close(); resolve(data);
      };
      registration.active.postMessage({ type }, [channel.port2]);
    });
  }, { type, base: BASE });
}
async function savedKeys() {
  return page.evaluate(async pack => (await (await caches.open(pack)).keys()).map(key => key.url).sort(), PACK);
}
async function localRecords() {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
}
async function setupContext({ profile, offline = false } = {}) {
  // Study preparation targets a normal Safari/Home Screen profile. WebKit's
  // ephemeral/private context intentionally does not retain CacheStorage over
  // reloads: https://github.com/microsoft/playwright/pull/41701 . Use a fresh,
  // isolated on-disk profile for each scenario; never a user's browser profile.
  if (!profile) { profile = fs.mkdtempSync(path.join(os.tmpdir(), 'commonplace-web-offline-' + engine + '-')); profiles.push(profile); }
  else assert(profiles.includes(profile), 'only a profile allocated by this test may be reopened');
  const ctx = await playwright[engine].launchPersistentContext(profile, { headless: true, offline, viewport: { width: 390, height: 844 } });
  contexts.push(ctx);
  contextProfiles.set(ctx, profile);
  // WebKit closes its persistent browser when its final page closes. Reuse the
  // initial blank page as the app instead of leaving an invisible keepalive;
  // the cold test below closes/restarts the entire browser on the same profile.
  for (const extra of ctx.pages().slice(1)) await extra.close();
  // Routing disables Playwright's ordinary HTTP cache. Do not intercept local
  // worker requests in WebKit: its automation transport cannot reliably route
  // a cold offline navigation through a service worker. External-only routing
  // plus no-store on every fixture response avoids the ordinary HTTP cache;
  // the actual server is also cut off during every offline check.
  await ctx.route(engine === 'webkit' ? 'https://**/*' : '**/*', route => route.continue());
  await ctx.addInitScript(({ origin }) => {
    if (window !== window.top || location.origin !== origin) return;
    const seedKey = 'offline-test-profile-seeded';
    if (!localStorage.getItem(seedKey)) {
      localStorage.setItem(seedKey, '1');
      localStorage.setItem('cpx.bookmarks', '[{"path":"/other-section","title":"Keep bookmark"}]');
      localStorage.setItem('cpx.marks', '{"/other-section":[{"text":"Keep highlight"}]}');
      localStorage.setItem('cpx.resume', '{"/other-section":[{"text":"Keep position"}]}');
      localStorage.setItem('sb-test-auth-token', 'FIXTURE-SESSION-KEEP');
      localStorage.setItem('commonplace_wdb_v1', '{"done":{"l123":1},"notes":{"l123":"Keep course note"}}');
    }
    window.__offlineBeforeAppRecord = localStorage.getItem('commonplace_web_studio_v1');
    const user = { id: '851fc877-ddac-44a4-885f-f7de570f0907', email: 'offline-learner@example.test' };
    function query(payload) {
      let signal, promise;
      const builder = {
        select() { return builder; }, eq() { return builder; }, maybeSingle() { return builder; },
        abortSignal(value) { signal = value; return builder; },
        then(resolve, reject) {
          if (!promise) promise = Promise.resolve().then(async () => {
            if (!navigator.onLine) throw new Error('Offline account fixture');
            const response = await fetch('/__offline_cloud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
            return response.json();
          });
          return promise.then(resolve, reject);
        }
      };
      return builder;
    }
    window.__cpSupabase = {
      auth: { getSession: async () => ({ data: { session: { user, access_token: 'FIXTURE-ONLY' } }, error: null }), onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; } },
      from(name) { if (name !== 'commonplace_web_studio') throw new Error('Unexpected table'); return query({ kind: 'read' }); },
      rpc(name, params) { if (name !== 'web_studio_sync_write') throw new Error('Unexpected writer'); return query({ kind: 'write', params }); }
    };
  }, { origin });
  return ctx;
}
async function openFromLauncher(ctx, action) {
  page = ctx.pages()[0] || await ctx.newPage(); page.setDefaultTimeout(25000);
  assert.equal(ctx.pages().length, 1, 'no other blank or app page may keep the worker alive');
  const launcher = await page.goto(origin + BASE + 'offline.html', { waitUntil: 'domcontentloaded' });
  assert.equal(launcher.status(), 200);
  assert(await page.getByRole('heading', { name: 'Web Studio', exact: true }).isVisible());
  assert.equal(await page.locator('link[rel=manifest]').getAttribute('href'), 'pwa/manifest.json');
  assert.equal(await page.locator('link[rel=apple-touch-icon]').getAttribute('href'), 'pwa/icon-180.png');
  await page.getByRole('link', { name: action, exact: true }).click();
  // Reopening correctly restores the selected Practice/Projects/Notes screen;
  // the Book title can therefore be hidden even when the app loaded correctly.
  await page.locator('#wb-save-status').waitFor({ state: 'visible' }); await readyController();
}
const view = name => page.locator('.wb-app-tabs [data-view="' + name + '"]').click();
async function edit(file, value) { await page.locator('.wb-file-tabs [data-file="' + file + '"]').click(); await page.locator('#wb-editor').fill(value); }
async function clearHttpCache(ctx) {
  if (engine !== 'chromium') return;
  const session = await ctx.newCDPSession(page); await session.send('Network.clearBrowserCache'); await session.detach();
}
function revise(files) {
  const entries = originalManifest.files.map(file => {
    const changed = files[file.url];
    return changed ? { url: file.url, bytes: changed.length, sha256: hash(changed) } : file;
  });
  return { version: 1, revision: hash(JSON.stringify(entries)), bytes: entries.reduce((total, file) => total + file.bytes, 0), files: entries };
}

(async () => {
  assert(['chromium', 'webkit'].includes(engine));
  await startServer();
  console.log('TEST ' + engine + ': isolated normal persistent profiles; no user profile, private-mode claim or physical iPad claim');
  let ctx = await setupContext(); await openFromLauncher(ctx, 'Prepare or check downloads');
  assert(await page.locator('#wb-offline').isVisible(), 'the launcher must open download controls directly');
  assert.equal(await page.getByRole('link', { name: 'Offline launcher and setup steps' }).getAttribute('href'), 'offline.html');
  const fresh = await rpc('offline-status'); assert(!fresh.error, fresh.error);
  assert.equal(fresh.ready, false); assert.equal(fresh.done, 0); assert.equal(fresh.remainingBytes, manifest.bytes);
  assert.equal((await savedKeys()).length, 0, 'installation must not silently download the study pack');
  assert(await page.locator('#wb-offline-download').isVisible());
  await requireInViewport('#wb-offline-close', 'the phone must show a return control without scrolling through download instructions');
  assert.equal(await page.locator('#wb-offline-study').isVisible(), false, 'Start studying must not imply a fresh pack is ready');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'offline controls overflow on a phone');
  console.log('PASS ' + engine + ': real worker installation leaves the explicit pack empty and shows mobile download controls');

  const interruptedFile = manifest.files.find(file => file.url === 'vendor/acorn.js');
  assert(interruptedFile, 'the locally bundled preview parser must be in the pack');
  blockedPath = relativePath(interruptedFile.url);
  await page.locator('#wb-offline-download').click();
  await until(() => held.size > 0, 'download did not reach the interrupted file');
  await page.locator('#wb-offline-close').click();
  assert.equal(await page.locator('#wb-offline').isVisible(), false);
  assert.equal(await page.locator('#wb-offline-toggle').getAttribute('aria-expanded'), 'false');
  await requireInViewport('#wb-part-title', 'leaving download controls must reveal the lesson on a phone');
  await openPanel();
  assert(await page.locator('#wb-offline-download').isDisabled(), 'hiding the panel must not cancel or restart its active download');
  assert(await page.locator('#wb-offline-pause').isVisible(), 'the existing transfer can still be paused after reopening its controls');
  await page.locator('#wb-offline-pause').click();
  await until(async () => !(await page.locator('#wb-offline-download').isDisabled()), 'paused download did not release its button');
  const partial = await rpc('offline-status');
  assert.equal(partial.ready, false); assert(partial.done > 0 && partial.done < partial.total);
  assert(partial.remainingBytes > 0 && partial.remainingBytes < partial.bytes);
  const completed = await savedKeys(); assert(completed.length > 0);
  const resumeStart = requests.length; blockedPath = ''; for (const response of held) response.destroy(); held.clear();
  await page.locator('#wb-offline-download').click(); await textHas('#wb-offline-status', /Ready offline/i);
  const full = await rpc('offline-status'); assert.equal(full.ready, true); assert.equal(full.remainingBytes, 0); assert.equal(full.done, manifest.files.length);
  const resumedPaths = requests.slice(resumeStart);
  for (const key of completed) assert(!resumedPaths.includes(new URL(key).pathname), 'resume downloaded an already saved unchanged file: ' + key);
  assert.equal(full.bytes, originalManifest.bytes);
  console.log('PASS ' + engine + ': interrupted body transfer pauses visibly; resume skips completed hashes and verifies the complete pack');

  assert(await page.locator('#wb-offline-study').isVisible(), 'a verified pack must offer a direct way into the lessons');
  await page.locator('#wb-offline-study').click();
  assert.equal(await page.locator('#wb-offline').isVisible(), false);
  await requireInViewport('#wb-part-title', 'Start studying must place actual lesson content on the phone screen');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'wb-part-title');
  assert.equal((await rpc('offline-status')).ready, true, 'returning to lessons must retain the verified pack');
  console.log('PASS ' + engine + ': phone download controls have an immediate exit; hiding preserves the transfer and Start studying reveals the lesson');
  await view('book');
  if (!await page.locator('#wb-contents').evaluate(element => element.open)) await page.locator('#wb-contents > summary').click();
  await page.locator('.wb-toc [data-part="2"]').click(); await page.locator('#wb-bookmark').click();
  await view('notes'); await page.locator('#wb-note-editor').fill('Offline acceptance note, before reconnect.');
  const html = '<main class="card"><h1>Offline reading desk</h1><p>Saved on this device.</p><button id="counter">Clicks: 0</button></main>';
  const css = '.card { padding: 32px; border-radius: 12px; background: #edf5ff; }';
  const js = 'const button = document.querySelector("#counter"); let count = 0; button.addEventListener("click", () => { count += 2; button.textContent = "Clicks: " + count; });';
  await view('practice'); await edit('html', html); await edit('css', css); await edit('js', js);
  await page.locator('.wb-project-bar [data-view="projects"]').click();
  await page.locator('#wb-project-name').fill('Offline counter project'); await page.locator('#wb-project-duplicate').click();
  await view('practice'); assert.equal(await page.locator('#wb-project-current').textContent(), 'Offline counter project');
  await until(() => cloud.row?.snapshot?.study?.project?.js === js && cloud.row?.snapshot?.study?.projects?.items?.some(item => item.name === 'Offline counter project'), 'connected study edits did not sync to the isolated account fixture');
  const native = await page.evaluate(key => localStorage.getItem(key), KEY);
  const protectedBefore = await page.evaluate(() => Object.fromEntries(['cpx.bookmarks', 'cpx.marks', 'cpx.resume', 'sb-test-auth-token', 'commonplace_wdb_v1'].map(key => [key, localStorage.getItem(key)])));
  await page.evaluate(async () => {
    await (await caches.open('cp-python-downloads-v1')).put('/python-preserved-pack', new Response('Do not touch other Commonplace downloads'));
    await new Promise((resolve, reject) => { const request = indexedDB.open('offline-unrelated-fixture', 1); request.onupgradeneeded = () => request.result.createObjectStore('data'); request.onerror = () => reject(request.error); request.onsuccess = () => { const db = request.result, transaction = db.transaction('data', 'readwrite'); transaction.objectStore('data').put('Keep unrelated IndexedDB', 'sentinel'); transaction.oncomplete = () => { db.close(); resolve(); }; transaction.onerror = () => reject(transaction.error); }; });
  });

  await clearHttpCache(ctx); networkDown = true; await ctx.setOffline(true);
  const profile = contextProfiles.get(ctx); await ctx.close();
  assert.equal(ctx.pages().length, 0, 'cold reopening must start after every app/blank page and the browser have closed');
  ctx = await setupContext({ profile, offline: true });
  await openFromLauncher(ctx, 'Open Web Studio');
  const installStart = await page.evaluate(async () => {
    const link = document.querySelector('link[rel=manifest]');
    const manifest = await (await fetch(link.href)).json();
    return new URL(manifest.start_url, link.href).href;
  });
  assert.equal(page.url(), installStart, 'the launcher and Home Screen icon must open the same saved app');
  console.log('PASS ' + engine + ': cold offline bookmark launch opens the installed start URL');
  assert.equal(await page.evaluate(async () => { try { await fetch('/__uncached_offline_probe', { cache: 'no-store' }); return false; } catch (_) { return true; } }), true, 'negative control: an uncached network request must fail');
  assert.equal(await page.evaluate(() => window.__offlineBeforeAppRecord), native, 'reopening must not reseed or replace saved study data');
  await view('notes'); assert.equal(await page.locator('#wb-note-editor').inputValue(), 'Offline acceptance note, before reconnect.');
  await page.locator('#wb-note-editor').fill('Written without Wi-Fi; upload after reconnect.');
  await view('book'); assert.equal(await page.locator('#wb-bookmark').getAttribute('aria-pressed'), 'true');
  await view('practice'); await page.locator('#wb-run').click(); await textHas('#wb-run-status', /Preview running/);
  assert.equal(await page.locator('#wb-project-current').textContent(), 'Offline counter project');
  const preview = page.frameLocator('#wb-preview-host iframe');
  assert.equal(await preview.locator('h1').textContent(), 'Offline reading desk');
  assert.equal(await preview.locator('.card').evaluate(element => getComputedStyle(element).padding), '32px');
  await preview.locator('#counter').click(); await preview.locator('#counter').click();
  assert.equal(await preview.locator('#counter').textContent(), 'Clicks: 4');
  await page.locator('.wb-language-tabs [data-language="js"]').click(); await view('practice');
  await page.locator('#wb-check-exercise').click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).exercises?.['js-count-twos']?.attempts?.at(-1)?.status === 'passed', KEY);
  assert(await page.locator('#wb-exercise-results .wb-check-row').count() > 0, 'offline exercise feedback is visible');
  const offlineState = await rpc('offline-status'); assert.equal(offlineState.ready, true); assert.equal(offlineState.remainingBytes, 0);
  assert.notEqual(cloud.row?.snapshot?.study?.lessons?.['html-elements']?.note, 'Written without Wi-Fi; upload after reconnect.');
  assert.deepEqual(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(protectedBefore)), protectedBefore);
  console.log('PASS ' + engine + ': cold offline browser restart without ordinary HTTP cache preserves notes/bookmarks/projects and runs real HTML, CSS, JavaScript and graded exercises');

  networkDown = false; await ctx.setOffline(false);
  await until(() => cloud.row?.snapshot?.study?.lessons?.['html-elements']?.note === 'Written without Wi-Fi; upload after reconnect.', 'queued offline note did not upload after reconnection');
  console.log('PASS ' + engine + ': offline edits remain local and synchronize after reconnection to the same fixture account');

  // Simulate publishing two changed files while retaining the old complete
  // pack. The first replacement saves; the second stalls. Offline serving must
  // remain on the old complete pack until the whole new revision verifies.
  const oldCSS = fs.readFileSync(path.join(__dirname, '../studio.css'));
  const nextCSS = Buffer.concat([oldCSS, Buffer.from('\n/* Offline acceptance: next CSS revision. */\n')]);
  const nextJS = Buffer.concat([fs.readFileSync(path.join(__dirname, '../studio.js')), Buffer.from('\n/* Offline acceptance: next JS revision. */\n')]);
  replacements.set(BASE + 'studio.css', nextCSS); replacements.set(BASE + 'studio.js', nextJS);
  manifest = revise({ 'studio.css': nextCSS, 'studio.js': nextJS });
  const outdated = await rpc('offline-status'); assert.equal(outdated.ready, false); assert.equal(outdated.remainingBytes, nextCSS.length + nextJS.length);
  assert.equal(outdated.previousReady, true, 'verified older study pack remains usable during a newer download');
  assert.equal(outdated.updatePending, true, 'newer study files are not complete yet');
  assert.equal(outdated.completeRevision, originalManifest.revision);
  const oldOnlineCSS = await page.evaluate(async base => (await fetch(base + 'studio.css?release-incomplete-online')).text(), BASE);
  assert.equal(hash(oldOnlineCSS), hash(oldCSS), 'connected study must not take newer partial deployment files into an old page');
  blockedPath = BASE + 'studio.js';
  const updating = rpc('offline-download'); await until(() => held.size > 0, 'changed JS was not requested');
  assert.equal((await rpc('offline-pause')).paused, true); const updatePartial = await updating; assert.equal(updatePartial.ready, false);
  blockedPath = ''; for (const response of held) response.destroy(); held.clear();
  networkDown = true; await ctx.setOffline(true);
  const coherentCSS = await page.evaluate(async base => (await fetch(base + 'studio.css?offline-coherence-test')).text(), BASE);
  assert.equal(hash(coherentCSS), hash(oldCSS), 'an incomplete update must not mix newly saved CSS with the old complete pack');
  await openPanel();
  await page.locator('#wb-offline-check').click();
  await textHas('#wb-offline-status', /Update incomplete.*previous pack ready offline/);
  assert(await page.locator('#wb-offline-study').isVisible(), 'learner can return to the verified previous pack');
  assert.match(await page.locator('#wb-offline-revision').textContent(), /Saved revision.*update.*not complete/);
  const blockedReload = await page.evaluate(async () => {
    const button=document.getElementById('wb-reload'); button.hidden=false; button.disabled=false;
    const oldURL=location.href; await button.onclick();
    return {urlChanged:location.href!==oldURL,disabled:button.disabled,text:document.getElementById('wb-update-status').textContent};
  });
  assert.equal(blockedReload.urlChanged,false,'the incomplete update must not trigger reload');
  assert.equal(blockedReload.disabled,true);
  assert.match(blockedReload.text,/previous saved pack is ready|incomplete/i);
  await page.locator('#wb-offline-close').click();
  console.log('PASS ' + engine + ': previous pack remains visible; update-aware reload blocks incomplete revisions without touching study work');
  networkDown = false; await ctx.setOffline(false);
  const updateResumeStart = requests.length; const updated = await rpc('offline-download'); assert.equal(updated.ready, true, updated.error); assert.equal(updated.remainingBytes, 0);
  assert.equal(updated.completeReady,true); assert.equal(updated.updatePending,false);
  assert.equal(updated.reloadRecommended,true,'the open document must report the newer complete pack as reloadable');
  assert(!requests.slice(updateResumeStart).includes(BASE + 'studio.css'), 'resume re-downloaded the already verified changed CSS');
  const stillOldCSS = await page.evaluate(async base => (await fetch(base + 'studio.css?after-update-before-reload')).text(), BASE);
  assert.equal(hash(stillOldCSS), hash(oldCSS), 'already-open document must remain pinned to the previous complete revision');
  await openPanel();
  await page.locator('#wb-offline-check').click();
  await textHas('#wb-offline-status', /Updated pack verified.*reload/);
  await page.waitForFunction(() => document.getElementById('wb-reload')?.disabled === false);
  assert.match(await page.locator('#wb-offline-revision').textContent(), /this page uses an older revision/i);
  await page.locator('#wb-offline .wb-offline-instructions').last().evaluate(element => { element.open = true; });
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.locator('#wb-reload').click()]);
  await page.locator('#wb-save-status').waitFor({ state: 'visible' });
  await readyController();
  const switchedCSS = await page.evaluate(async base => (await fetch(base + 'studio.css?after-safe-reload')).text(), BASE);
  assert.equal(hash(switchedCSS), hash(nextCSS), 'a fresh navigation must select the newly complete revision');
  console.log('PASS ' + engine + ': interrupted updates preserve old pages; an explicit reload adopts the new verified revision');

  const cssEntry = manifest.files.find(file => file.url === 'studio.css');
  await page.evaluate(async ({ pack, base, digest }) => {
    const cache = await caches.open(pack), keys = await cache.keys();
    const key = keys.find(key => new URL(key.url).pathname === base + 'studio.css' && new URL(key.url).searchParams.get('__cp_sha256') === digest);
    if (!key) throw new Error('Missing CSS cache entry');
    await cache.put(key, new Response('/* corrupted body */', { headers: { 'Content-Type': 'text/css' } }));
  }, { pack: PACK, base: BASE, digest: cssEntry.sha256 });
  const corrupt = await rpc('offline-status'); assert.equal(corrupt.ready, false); assert.equal(corrupt.remainingBytes, cssEntry.bytes);
  const repairStart = requests.length; const repaired = await rpc('offline-download'); assert.equal(repaired.ready, true, repaired.error);
  const packPaths = new Set(manifest.files.map(file => relativePath(file.url)));
  assert.deepEqual(requests.slice(repairStart).filter(url => packPaths.has(url)), [BASE + 'studio.css'], 'integrity repair should fetch only the corrupt file');
  console.log('PASS ' + engine + ': a cache entry with the right key but wrong bytes cannot report Ready; repair fetches only the damaged file');

  const beforeRepair = await localRecords(), packBeforeRepair = await savedKeys();
  await page.goto(origin + BASE + 'offline-repair.html'); await page.locator('#repair').click();
  await page.waitForFunction(() => !document.querySelector('#repair').disabled);
  assert.match(await page.locator('#result').textContent(), /Repair complete\./i, 'scoped repair must complete successfully');
  await readyController();
  assert.deepEqual(await localRecords(), beforeRepair, 'repair changed study/auth/annotation records');
  assert.deepEqual(await savedKeys(), packBeforeRepair, 'repair removed downloaded pack files');
  assert.equal(await page.evaluate(async () => (await (await caches.open('cp-python-downloads-v1')).match('/python-preserved-pack')).text()), 'Do not touch other Commonplace downloads');
  assert.equal(await page.evaluate(() => new Promise((resolve, reject) => { const request = indexedDB.open('offline-unrelated-fixture', 1); request.onerror = () => reject(request.error); request.onsuccess = () => { const db = request.result, get = db.transaction('data').objectStore('data').get('sentinel'); get.onsuccess = () => { db.close(); resolve(get.result); }; get.onerror = () => reject(get.error); }; })), 'Keep unrelated IndexedDB');
  await page.goto(origin + BASE + 'index.html'); await page.locator('#wb-save-status').waitFor({ state: 'visible' }); assert.equal((await rpc('offline-status')).ready, true);
  console.log('PASS ' + engine + ': scoped setup repair preserves downloaded packs, study/auth/annotation data and unrelated caches/IndexedDB');
  await ctx.close();

  // A separate browser profile starts controlled by an intentionally stale,
  // cache-first worker. This tests upgrade activation over old cached pages;
  // the fixture does not claim to be every historic production worker.
  manifest = originalManifest; replacements.clear(); oldWorker = true;
  const upgrade = await setupContext(); page = upgrade.pages()[0] || await upgrade.newPage(); page.setDefaultTimeout(30000);
  assert.equal(upgrade.pages().length, 1, 'the upgrade profile must not have a hidden keepalive page');
  await page.goto(origin + BASE + '__offline_harness.html');
  await page.evaluate(async base => { await navigator.serviceWorker.register(base + 'sw.js', { scope: base, updateViaCache: 'none' }); await navigator.serviceWorker.ready; }, BASE); await readyController();
  await page.goto(origin + BASE + 'index.html'); assert.equal(await page.locator('#old-shell').textContent(), 'Older cached Web Studio');
  oldWorker = false;
  await page.evaluate(async base => { const reg = await navigator.serviceWorker.getRegistration(base); await reg.update(); }, BASE);
  await page.waitForFunction(async base => {
    const reg = await navigator.serviceWorker.getRegistration(base);
    return reg?.active && !reg.installing && !reg.waiting;
  }, BASE);
  // Wait for new controller acknowledgement, rather than relying on an update
  // API resolving before activation has completed.
  await until(async () => {
    try { const result = await page.evaluate(async base => Promise.race([
      new Promise(resolve => { const channel = new MessageChannel(); channel.port1.onmessage = event => { if (!event.data.progress) { channel.port1.close(); resolve(event.data); } }; navigator.serviceWorker.controller.postMessage({ type: 'offline-status' }, [channel.port2]); }),
      new Promise(resolve => setTimeout(() => resolve(null), 1000))
    ]), BASE); return !!result && Number.isInteger(result.total); } catch (_) { return false; }
  }, 'new worker did not activate over the old cached page');
  await page.goto(origin + BASE + 'index.html'); await page.locator('#wb-save-status').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#old-shell').count(), 0);
  assert((await page.evaluate(() => caches.keys())).includes('html-css-js-study-shell-v2'), 'upgrade should not delete the older cache');
  console.log('PASS ' + engine + ': the verified-revision worker replaces a stale cache-first worker without clearing old data');
  await upgrade.close();
  console.log('PASS ' + engine + ': offline acceptance complete; physical iPad/Home Screen testing remains manual');
})().catch(async error => {
  console.error(error);
  if (page && !page.isClosed()) {
    const diagnostic = await page.evaluate(async base => {
      const registration = await navigator.serviceWorker.getRegistration(base);
      const cache = await caches.open('cp-web-studio-offline-v1'), keys = await cache.keys(), metadata = [];
      for (const key of keys) {
        try {
          const value = await (await cache.match(key)).json();
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value.files)))), byte => byte.toString(16).padStart(2, '0')).join('');
          metadata.push({ key: key.url, revision: value.revision, digest, bytes: value.bytes, files: value.files?.length });
        } catch (failure) { metadata.push({ key: key.url, error: failure.message }); }
      }
      return { url: location.href, result: document.querySelector('#result')?.textContent, online: navigator.onLine, scope: registration?.scope, active: registration?.active?.scriptURL, controller: navigator.serviceWorker.controller?.scriptURL, metadata };
    }, BASE).catch(failure => ({ diagnosticError: failure.message }));
    console.error('Offline fixture diagnostics:', JSON.stringify({ expectedRevision: manifest.revision, networkDown, blockedPath, ...diagnostic }));
  }
  if (page && !page.isClosed()) { fs.mkdirSync('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/web-studio-offline-' + engine + '.png', fullPage: true }).catch(() => {}); }
  process.exitCode = 1;
}).finally(async () => {
  for (const response of held) response.destroy();
  for (const context of contexts) await context.close().catch(() => {});
  for (const profile of profiles) fs.rmSync(profile, { recursive: true, force: true });
  if (server) await new Promise(resolve => server.close(resolve));
});
