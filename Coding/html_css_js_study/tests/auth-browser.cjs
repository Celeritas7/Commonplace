'use strict';
// Web Studio + the shared gate at a routed, non-localhost HTTPS origin.
// Only the gate's permitted-email HASH is replaced by a synthetic fixture hash;
// production gate.js, account restrictions and user data are never changed.
// Supabase and the provider redirect are deterministic test doubles. This tests
// app/gate integration, not Google's provider, production RLS or iPad storage.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
let playwright;
try { playwright = require('playwright'); }
catch (_) { playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules', 'playwright')); }

const ROOT = path.resolve(__dirname, '../../..');
const ORIGIN = 'https://web-studio.example.test';
const SECTION = '/Commonplace/Coding/html_css_js_study/index.html';
const APP = ORIGIN + SECTION;
const KEY = 'commonplace_web_studio_v1';
const OWNER = 'commonplace_web_studio_owner_v1';
const gate = fs.readFileSync(path.join(ROOT, '_lib/gate.js'), 'utf8');
const sessionKey = gate.match(/var SKEY = '([^']+)'/)[1];
const providerOrigin = gate.match(/var SUPABASE_URL = '([^']+)'/)[1];
const approved = { id: 'd94f846a-21bf-4ec7-9a69-25ec70bb7d17', email: 'approved@example.test' };
const denied = { id: 'ab90119f-adb0-4e3c-a603-84c4e2ccebf0', email: 'denied@example.test' };
const allowlist = /var ALLOW = \[[^\]]+\];/g;
assert.equal((gate.match(allowlist) || []).length, 1, 'test substitution must affect exactly the gate configuration');
const fixtureGate = gate.replace(allowlist, 'var ALLOW = ["' + crypto.createHash('sha256').update(approved.email).digest('hex') + '"];');
const native = JSON.stringify({ version: 1, language: 'html', view: 'book', project: { html: '<h1>Retain my work</h1>', css: 'h1 { color: green; }', js: '' }, lessons: { 'html-elements': { part: 2, note: 'Keep my lesson note.', bookmarks: [2], read: true } } });
const protectedSeed = {
  [KEY]: native,
  commonplace_wdb_v1: JSON.stringify({ done: { l123: 1 }, star: { l7: 1 }, notes: { l123: 'Keep the course note.' } }),
  'cpx.marks': '{"/another-section":[{"text":"Keep this highlight"}]}'
};
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const engine = process.env.BROWSER || 'chromium';
let browser, page;

async function fixture({ callbackUser = approved, cached = false, offline = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const unexpected = [], providerRequests = [], errors = [];
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === providerOrigin && url.pathname === '/auth/v1/authorize') {
      providerRequests.push(url.href);
      assert.equal(url.searchParams.get('provider'), 'google');
      const target = new URL(url.searchParams.get('redirect_to'));
      assert.equal(target.origin, ORIGIN, 'fake provider must return only to the isolated test origin');
      target.hash = 'access_token=FIXTURE-ONLY&refresh_token=FIXTURE-ONLY&type=signup';
      await route.fulfill({ status: 302, headers: { location: target.href }, body: '' }); return;
    }
    if (url.origin !== ORIGIN || !url.pathname.startsWith('/Commonplace/')) {
      unexpected.push(url.href); await route.abort(); return;
    }
    if (url.pathname === '/Commonplace/_lib/gate.js') {
      await route.fulfill({ contentType: 'text/javascript', body: fixtureGate }); return;
    }
    if (url.pathname === '/Commonplace/_lib/supabase.js') {
      await route.fulfill({ contentType: 'text/javascript', body: 'window.supabase={createClient:window.__fixtureCreateClient};' }); return;
    }
    const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname.replace(/^\/Commonplace/, '')));
    assert(file.startsWith(ROOT + path.sep), 'fixture resource must remain inside the checkout');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      unexpected.push(url.pathname); await route.fulfill({ status: 404, body: 'Fixture resource missing' }); return;
    }
    await route.fulfill({ contentType: MIME[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  await ctx.addInitScript(({ origin, sessionKey, approved, callbackUser, protectedSeed, cached }) => {
    if (window !== window.top || location.origin !== origin) return;
    if (localStorage.getItem('web-studio-auth-fixture-seeded') !== '1') {
      for (const [key, value] of Object.entries(protectedSeed)) localStorage.setItem(key, value);
      if (cached) {
        localStorage.setItem(sessionKey, JSON.stringify({ user: approved, access_token: 'FIXTURE-ONLY' }));
        localStorage.setItem('cp:gate:ok', approved.email);
      }
      localStorage.setItem('web-studio-auth-fixture-seeded', '1');
    }
    // This suite isolates auth. Actual installed-worker/offline transport is
    // covered by offline-browser.cjs, not by these routed fixture resources.
    if (navigator.serviceWorker) navigator.serviceWorker.register = async () => { throw new Error('Auth fixture does not install workers'); };
    const returning = /[#&]access_token=/.test(location.hash) || new URL(location.href).searchParams.has('code');
    const state = window.__authFixture = { clientOptions: [], seenUrls: [], cloudCalls: [], returning, consumed: false };
    let finishReturn, row = null;
    const listeners = [];
    const pendingReturn = new Promise(resolve => { finishReturn = resolve; });
    const savedSession = () => JSON.parse(localStorage.getItem(sessionKey) || 'null');
    state.release = () => {
      state.consumedUrl = location.href;
      const session = { user: callbackUser, access_token: 'FIXTURE-ONLY' };
      localStorage.setItem(sessionKey, JSON.stringify(session));
      const url = new URL(location.href); url.hash = '';
      ['code', 'error', 'error_code', 'error_description'].forEach(key => url.searchParams.delete(key));
      history.replaceState(null, '', url.href);
      state.consumed = true; finishReturn({ data: { session }, error: null });
      listeners.forEach(listener => listener('SIGNED_IN', session));
    };
    function query(kind, params) {
      let result;
      const builder = {
        select() { return builder; }, eq() { return builder; }, maybeSingle() { return builder; }, abortSignal() { return builder; },
        then(resolve, reject) {
          if (!result) result = Promise.resolve().then(() => {
            state.cloudCalls.push({ kind, locked: document.documentElement.classList.contains('cp-locked') });
            if (kind === 'write') row = { revision: (row?.revision || 0) + 1, snapshot: params.new_snapshot };
            return { data: row, error: null };
          });
          return result.then(resolve, reject);
        }
      };
      return builder;
    }
    const client = {
      auth: {
        getSession() {
          state.seenUrls.push(location.href);
          return returning && !state.consumed ? pendingReturn : Promise.resolve({ data: { session: savedSession() }, error: null });
        },
        onAuthStateChange(listener) { listeners.push(listener); return { data: { subscription: { unsubscribe() {} } } }; },
        signOut() { localStorage.removeItem(sessionKey); return Promise.resolve({ error: null }); }
      },
      from(name) { if (name !== 'commonplace_web_studio') throw new Error('Unexpected fixture table'); return query('read'); },
      rpc(name, params) { if (name !== 'web_studio_sync_write') throw new Error('Unexpected fixture RPC'); return query('write', params); }
    };
    window.__fixtureCreateClient = (_url, _key, options) => { state.clientOptions.push(options); return client; };
  }, { origin: ORIGIN, sessionKey, approved, callbackUser, protectedSeed, cached });
  if (offline) await ctx.setOffline(true);
  page = await ctx.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
  return { ctx, page, errors, unexpected, providerRequests };
}

async function boot(p, suffix = '') {
  await p.goto(APP + suffix);
  await p.waitForFunction(() => document.querySelector('#wb-save-status')?.textContent === 'Saved on this device');
}
async function unchanged(p) {
  assert.deepEqual(await p.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(protectedSeed)), protectedSeed);
}
async function locked(p) {
  assert(await p.evaluate(() => document.documentElement.classList.contains('cp-locked')));
  assert.equal(await p.evaluate(key => localStorage.getItem(key), OWNER), null, 'locked gate must not bind local work to an account');
  assert.deepEqual(await p.evaluate(() => window.__authFixture.cloudCalls), [], 'locked gate must not read or write cloud study data');
  await unchanged(p);
}
async function healthy(f) {
  assert.deepEqual(f.errors, [], 'auth integration has no unhandled page errors');
  assert.deepEqual(f.unexpected, [], 'auth integration must never reach an external service');
  await f.ctx.close();
}

(async () => {
  assert(['chromium', 'webkit'].includes(engine));
  browser = await playwright[engine].launch({ headless: true });
  for (const suffix of ['?from=study#access_token=FIXTURE-ONLY&refresh_token=FIXTURE-ONLY&type=signup', '?from=study&code=FIXTURE-ONLY']) {
    const f = await fixture(); const p = f.page;
    await boot(p, suffix);
    await p.waitForFunction(() => window.__authFixture.seenUrls.length > 0);
    await locked(p);
    assert.equal(p.url(), APP + suffix, 'app startup must leave callback parameters for the SDK');
    assert.equal(await p.locator('#cp-gate h1').textContent(), 'Commonplace');
    await p.evaluate(() => window.__authFixture.release());
    await p.waitForFunction(() => !document.documentElement.classList.contains('cp-locked'));
    await p.locator('#wb-title').waitFor({ state: 'visible' });
    assert.equal(await p.evaluate(() => window.__authFixture.consumedUrl), APP + suffix);
    assert.equal(p.url(), APP + '?from=study', 'only the mock SDK consumes the callback');
    assert.equal(await p.evaluate(() => localStorage.getItem('cp:gate:ok')), approved.email);
    assert.equal(await p.locator('#wb-part-title').textContent(), 'Walk-through');
    await p.waitForFunction(() => document.querySelector('#wb-sync-status').dataset.state === 'synced');
    assert.equal(await p.evaluate(key => localStorage.getItem(key), OWNER), approved.id);
    assert((await p.evaluate(() => window.__authFixture.cloudCalls)).every(call => call.locked === false));
    const options = await p.evaluate(() => window.__authFixture.clientOptions);
    assert(options.length > 0); assert(options.every(option => option.auth.persistSession && option.auth.autoRefreshToken && option.auth.detectSessionInUrl));
    await unchanged(p); await healthy(f);
  }
  console.log('PASS ' + engine + ': real app and gate preserve implicit/PKCE callback URLs until the fixture SDK consumes them; approved return unlocks before sync');

  const refused = await fixture({ callbackUser: denied });
  await boot(refused.page, '#access_token=FIXTURE-ONLY&refresh_token=FIXTURE-ONLY');
  await refused.page.evaluate(() => window.__authFixture.release());
  await refused.page.waitForFunction(() => document.querySelector('#cp-gate h1')?.textContent === 'Not allowed');
  await locked(refused.page);
  assert.equal(await refused.page.evaluate(() => localStorage.getItem('cp:gate:ok')), null);
  await healthy(refused);
  console.log('PASS ' + engine + ': a disallowed callback account remains locked with no cloud access or study-data mutation');

  const cached = await fixture({ cached: true, offline: true });
  await boot(cached.page);
  assert.equal(await cached.page.evaluate(() => navigator.onLine), false);
  await cached.page.locator('#wb-title').waitFor({ state: 'visible' });
  assert.equal(await cached.page.locator('#cp-gate').count(), 0);
  await cached.page.waitForFunction(() => document.querySelector('#wb-sync-status').dataset.state === 'offline');
  assert.deepEqual(await cached.page.evaluate(() => window.__authFixture.cloudCalls), []);
  await unchanged(cached.page); await healthy(cached);
  console.log('PASS ' + engine + ': an already approved cached session admits offline study without contacting a provider or cloud fixture');

  const signedOut = await fixture({ offline: true });
  await boot(signedOut.page);
  await signedOut.page.locator('#cp-gate [data-a=google]').click();
  await signedOut.page.waitForFunction(() => /You are offline/.test(document.querySelector('#cp-gate .g-msg')?.textContent));
  await locked(signedOut.page);
  assert.equal(signedOut.providerRequests.length, 0);
  await healthy(signedOut);
  console.log('PASS ' + engine + ': signed-out offline access stays locked and explains why sign-in needs a connection');

  const google = await fixture();
  await boot(google.page, '?from=mobile');
  const link = google.page.locator('#cp-gate [data-a=google]');
  assert.equal(await link.getAttribute('target'), '_self');
  const href = new URL(await link.getAttribute('href'));
  assert.equal(href.searchParams.get('redirect_to'), APP + '?from=mobile');
  await link.click();
  await google.page.waitForFunction(() => window.__authFixture?.returning === true && window.__authFixture.seenUrls.length > 0);
  await locked(google.page);
  assert.equal(google.providerRequests.length, 1, 'native link makes exactly one intercepted provider navigation');
  await google.page.evaluate(() => window.__authFixture.release());
  await google.page.locator('#wb-title').waitFor({ state: 'visible' });
  assert.equal(google.page.url(), APP + '?from=mobile');
  assert.equal(await google.page.evaluate(() => localStorage.getItem('cp:gate:next')), null);
  await unchanged(google.page); await healthy(google);
  console.log('PASS ' + engine + ': native same-window Google link returns through an isolated redirect fixture to the same study URL');
  console.log('PASS ' + engine + ': authentication integration complete; production Google, account allowlist and physical Safari/Home Screen acceptance remain manual');
})().catch(async error => {
  console.error(error);
  if (page && !page.isClosed()) { fs.mkdirSync('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/web-studio-auth-' + engine + '.png', fullPage: true }).catch(() => {}); }
  process.exitCode = 1;
}).finally(async () => { if (browser) await browser.close(); });
