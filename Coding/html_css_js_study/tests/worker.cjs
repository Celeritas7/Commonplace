'use strict';
// Fetch/CacheStorage contract tests. These do not replace Safari/device tests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const SOURCE = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
const ORIGIN = 'https://study.test';
const BASE = ORIGIN + '/Commonplace/Coding/html_css_js_study/';
const CACHE = 'html-css-js-study-shell-v2';
const OLD = 'html-css-js-study-v1';
const CORE = ['index.html', 'studio.css', 'studio.js', 'studio-lessons.js', 'studio-store.js', 'studio-preview.js', 'legacy-tracker.js', 'vendor/acorn.js', 'data/course-index.js', '../../_lib/gate.js'];
const contentType = url => /\.js(?:\?|$)/.test(url) ? 'application/javascript' : /\.css(?:\?|$)/.test(url) ? 'text/css' : 'text/html';
const response = (body, url, status = 200) => new Response(body, { status, headers: { 'Content-Type': contentType(url) } });

function harness() {
  const stores = new Map(), requests = [], listeners = {}, deleted = [];
  let offline = false, hang = false, hangBody = false, badPath = '', serverStatus = 200, revision = 'initial', failWrite = false, failRead = false;
  let skipped = 0, claimed = 0;
  const cache = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const map = stores.get(name);
    return {
      async match(key) { if (failRead) throw new Error('storage unavailable'); const value = map.get(typeof key === 'string' ? key : key.url); return value?.clone(); },
      async put(key, value) { if (failWrite) throw new Error('quota exceeded'); map.set(typeof key === 'string' ? key : key.url, value.clone()); }
    };
  };
  const caches = {
    async open(name) { return cache(name); }, async keys() { return [...stores.keys()]; },
    async delete(name) { deleted.push(name); return stores.delete(name); }
  };
  const context = vm.createContext({
    self: { location: { href: BASE + 'sw.js' }, addEventListener(name, fn) { listeners[name] = fn; }, skipWaiting: async () => skipped++, clients: { claim: async () => claimed++ } },
    caches, URL, Set, Request, Response, Headers, AbortController,
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 40)), clearTimeout,
    fetch: async (req, options) => {
      requests.push({ url: req.url, options });
      if (offline) throw new Error('offline');
      // Deliberately ignore abort to test the deadline, not only fetch abort.
      if (hang) return new Promise(() => {});
      if (hangBody) return { status: 200, arrayBuffer: () => new Promise(() => {}) };
      if (badPath && req.url.includes(badPath)) return response('wrong content', 'error.html');
      return response(revision + ':' + new URL(req.url).pathname, req.url, serverStatus);
    }
  });
  vm.runInContext(SOURCE, context);
  const runEvent = async name => { const pending = []; listeners[name]({ waitUntil(p) { pending.push(p); } }); await Promise.all(pending); };
  const request = async (url, options = {}) => {
    let pending; const wait = [];
    const req = options.navigate ? { url, method: 'GET', mode: 'navigate' } : new Request(url, { method: options.method || 'GET' });
    listeners.fetch({ request: req, respondWith(p) { pending = p; }, waitUntil(p) { wait.push(p); } });
    if (!pending) return null;
    const result = await pending; await Promise.all(wait); return result;
  };
  return { stores, requests, deleted, cache, runEvent, request,
    configure(values) { ({ offline = offline, hang = hang, hangBody = hangBody, badPath = badPath, serverStatus = serverStatus, revision = revision, failWrite = failWrite, failRead = failRead } = values); },
    get skipped() { return skipped; }, get claimed() { return claimed; }
  };
}

(async () => {
  const h = harness();
  await h.cache(OLD).put(BASE + 'index.html', response('old tracker', BASE + 'index.html'));
  await h.cache('cp-python-downloads-v1').put(ORIGIN + '/Python/large-pack', new Response('keep downloaded pack'));
  h.configure({ badPath: 'studio.js' });
  await assert.rejects(h.runEvent('install'), /could not install studio.js/);
  assert.equal(h.skipped, 0, 'a partial shell must not activate');
  assert.equal(await (await h.cache(OLD).match(BASE + 'index.html')).text(), 'old tracker');
  h.configure({ badPath: '' }); await h.runEvent('install');
  assert.equal(h.skipped, 1); assert.equal(h.stores.get(CACHE).size, CORE.length);
  assert(CORE.every(p => h.stores.get(CACHE).has(new URL(p, BASE).href)));
  assert(h.requests.every(r => r.options.cache === 'no-store'), 'HTTP cache must not conceal changed code');
  await h.runEvent('activate'); assert.equal(h.claimed, 1); assert.deepEqual(h.deleted, []);
  assert.equal(await (await h.cache('cp-python-downloads-v1').match(ORIGIN + '/Python/large-pack')).text(), 'keep downloaded pack');
  console.log('PASS complete core install; failed install retains previous worker; activation preserves every existing cache');

  h.configure({ revision: 'fixed' });
  assert.match(await (await h.request(BASE + 'index.html', { navigate: true })).text(), /^fixed:/);
  const gate = new URL('../../_lib/gate.js', BASE).href;
  assert.match(await (await h.request(gate)).text(), /^fixed:/);
  h.configure({ offline: true });
  assert.match(await (await h.request(BASE, { navigate: true })).text(), /^fixed:/);
  assert.match(await (await h.request(gate)).text(), /^fixed:/, 'offline gate retains online fix');
  h.configure({ offline: false, hang: true }); const start = Date.now();
  assert.match(await (await h.request(BASE + 'studio.js')).text(), /^initial:/);
  assert(Date.now() - start < 500, 'ignored abort still settles to cache');
  h.configure({ hang: false, hangBody: true });
  assert.match(await (await h.request(BASE + 'studio.css')).text(), /^initial:/, 'body stalls also fall back within the deadline');
  h.configure({ hangBody: false });
  console.log('PASS network-first updates and shared login fixes survive offline requests; hung transport has a deadline');

  const withQuery = BASE + 'studio.js?revision=two';
  h.configure({ revision: 'query-two' }); await h.request(withQuery);
  h.configure({ offline: true });
  assert.match(await (await h.request(withQuery)).text(), /^query-two:/);
  assert.equal((await h.request(BASE + 'studio.js?revision=three')).status, 503, 'different asset queries do not share code');
  h.configure({ offline: false, revision: 'oauth' });
  await h.request(BASE + 'index.html?code=private-callback&next=book', { navigate: true });
  assert(h.requests.some(r => r.url.includes('code=private-callback')), 'OAuth query reaches network unchanged');
  assert(![...h.stores.get(CACHE).keys()].some(k => k.includes('private-callback')), 'OAuth values do not enter cache keys');
  assert.equal(await h.request(ORIGIN + '/Commonplace/Coding/Python/index.html'), null);
  assert.equal(await h.request('https://drive.google.com/private-book'), null);
  assert.equal(await h.request(BASE + 'studio.js', { method: 'POST' }), null);
  assert.equal(await h.request(BASE + 'unlisted-private-file.json'), null);
  console.log('PASS exact asset queries, OAuth preservation without caching callback values, and strict scope');

  h.configure({ serverStatus: 404 });
  assert.equal((await h.request(BASE + 'studio.js')).status, 404, 'missing files cannot masquerade as old success');
  h.configure({ serverStatus: 503 });
  assert.match(await (await h.request(BASE + 'studio.js')).text(), /^initial:/);
  h.configure({ serverStatus: 200, revision: 'quota-safe', failWrite: true });
  assert.match(await (await h.request(BASE + 'studio.css')).text(), /^quota-safe:/);
  h.configure({ offline: true, failRead: true });
  assert.equal((await h.request(BASE + 'studio.css')).status, 503);
  const bad = harness(); bad.configure({ failWrite: true });
  await assert.rejects(bad.runEvent('install'), /quota exceeded/); assert.equal(bad.skipped, 0);
  console.log('PASS explicit 404s, transient server fallback, quota/storage errors, and failed writes without false success');
})().catch(error => { console.error(error); process.exitCode = 1; });
