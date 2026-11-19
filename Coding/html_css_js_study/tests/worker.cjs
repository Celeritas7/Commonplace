'use strict';
// Real digest/Response contracts. Browser acceptance exercises actual workers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');
const SOURCE = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
const BASE = 'https://study.test/Commonplace/Coding/html_css_js_study/';
const PACK = 'cp-web-studio-downloads-v1', META = 'cp-web-studio-offline-v1';
const sha = body => createHash('sha256').update(body).digest('hex');
const mime = url => /\.js(?:\?|$)/.test(url) ? 'application/javascript' : /\.css(?:\?|$)/.test(url) ? 'text/css' : /\.json(?:\?|$)/.test(url) ? 'application/json' : 'text/html';
const reply = (body, url, status = 200) => new Response(body, { status, headers: { 'Content-Type': mime(url) } });
function harness() {
  const stores = new Map(), listeners = {}, requests = [], deleted = [];
  const files = new Map([['index.html', '<h1>original</h1>'], ['studio.js', 'window.answer=42;'], ['studio.css', 'body{color:green}'], ['../../_lib/gate.js', 'window.gate=true;']]);
  let config = {}, skipped = 0, claimed = 0;
  const manifest = () => {
    const list = [...files].map(([url, body]) => ({ url, bytes: Buffer.byteLength(body), sha256: sha(body) }));
    return { version: 1, revision: sha(JSON.stringify(list)), bytes: list.reduce((n, f) => n + f.bytes, 0), files: list };
  };
  const cache = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async match(key) {
        if (config.hangRead) return new Promise(() => {});
        if (config.failRead) throw new Error('Storage denied');
        return entries.get(typeof key === 'string' ? key : key.url)?.clone();
      },
      async put(key, value) {
        if (config.failWrite && name === PACK) { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; }
        if (config.hangWrite && name === PACK) return new Promise(() => {});
        entries.set(typeof key === 'string' ? key : key.url, value.clone());
      }
    };
  };
  const context = vm.createContext({
    self: { location: { href: BASE + 'sw.js?repair=1.7' }, addEventListener(name, fn) { listeners[name] = fn; }, skipWaiting: async () => skipped++, clients: { claim: async () => claimed++ } },
    caches: { async open(name) { return cache(name); }, async delete(name) { deleted.push(name); return stores.delete(name); } },
    URL, Set, Map, Request, Response, Headers, AbortController, TextEncoder, Uint8Array, crypto: webcrypto,
    setTimeout: (fn, ms) => setTimeout(fn, ms > 100000 ? 10000 : Math.min(ms, 100)), clearTimeout,
    setInterval: (fn, ms) => setInterval(fn, Math.min(ms, 50)), clearInterval,
    fetch: async (request, options) => {
      const url = typeof request === 'string' ? request : request.url;
      requests.push({ url, options });
      if (config.offline) throw new Error('offline');
      if (config.hang || config.hangFile && url.includes(config.hangFile)) return new Promise(() => {});
      if (config.hangBody) return { status: 200, arrayBuffer: () => new Promise(() => {}) };
      if (url === BASE + 'offline-assets.json') return reply(JSON.stringify(config.badManifest || manifest()), url);
      if (config.failFile && url.includes(config.failFile)) return reply('temporarily unavailable', url, 503);
      const canonical = new URL(url); canonical.search = ''; canonical.hash = '';
      let body;
      if (canonical.href === BASE) body = files.get('index.html');
      else body = [...files].find(([file]) => new URL(file, BASE).href === canonical.href)?.[1];
      if (config.badBody && url.includes(config.badBody)) body = 'truncated';
      if (config.badMime && url.includes(config.badMime)) return reply(body || 'bad', BASE + 'error.html');
      return reply(body || 'missing', url, config.serverStatus || (body === undefined ? 404 : 200));
    }
  });
  vm.runInContext(SOURCE, context);
  async function lifecycle(name) { const pending = []; listeners[name]({ waitUntil(p) { pending.push(p); } }); await Promise.all(pending); }
  async function rpc(type, onProgress) {
    const messages = [], pending = [];
    listeners.message({ data: { type }, ports: [{ postMessage(value) { messages.push(value); if (value.progress && onProgress) onProgress(value); } }], waitUntil(p) { pending.push(p); } });
    await Promise.all(pending);
    return { messages, result: messages.filter(m => !m.progress).at(-1) };
  }
  async function request(url, { method = 'GET', navigate = false } = {}) {
    let pending;
    listeners.fetch({ request: navigate ? { url, method, mode: 'navigate' } : new Request(url, { method }), respondWith(p) { pending = p; } });
    return pending ? await pending : null;
  }
  async function validate(value) {
    context.testManifest = value;
    try { return await vm.runInContext('validateManifest(testManifest)', context); }
    finally { delete context.testManifest; }
  }
  return { stores, cache, files, requests, deleted, manifest, rpc, request, lifecycle, validate, configure(value) { config = value; }, get skipped() { return skipped; }, get claimed() { return claimed; } };
}
const keyFor = (h, file) => new URL(file, BASE).href + '?__cp_sha256=' + h.manifest().files.find(f => f.url === file).sha256;
(async () => {
  const h = harness();
  const generated = JSON.parse(fs.readFileSync(path.join(__dirname, '../offline-assets.json'), 'utf8'));
  assert.equal((await h.validate(generated)).revision, generated.revision, 'the real generated list and worker allowlist must agree');
  console.log('PASS generated manifest paths, size and revision accepted by production worker');
  await h.cache('cp-python-downloads-v1').put(BASE + 'unrelated', new Response('keep'));
  await h.cache('html-css-js-study-shell-v2').put(BASE + 'index.html', reply('old shell', BASE + 'index.html'));
  await h.lifecycle('install'); await h.lifecycle('activate');
  assert.equal(h.requests.length, 0, 'installation never fetches study packs');
  assert.equal(h.skipped, 1); assert.equal(h.claimed, 1); assert.deepEqual(h.deleted, []);
  const empty = (await h.rpc('offline-status')).result;
  assert.equal(empty.ready, false); assert.equal(empty.done, 0); assert.equal(empty.remainingBytes, empty.bytes);
  console.log('PASS small installation, explicit downloads, existing app caches untouched');

  h.configure({ failFile: 'studio.css' });
  const interrupted = (await h.rpc('offline-download')).result;
  assert.match(interrupted.error, /studio\.css/); assert.equal(interrupted.ready, false); assert.equal(interrupted.done, 2);
  const beforeResume = h.requests.length;
  h.configure({}); const resumed = await h.rpc('offline-download');
  assert.equal(resumed.result.ready, true); assert.equal(resumed.result.remainingBytes, 0);
  assert(resumed.messages.some(m => m.progress && m.remainingBytes > 0));
  assert(!h.requests.slice(beforeResume).some(r => /index\.html$|studio\.js$/.test(r.url)), 'verified unchanged files are not fetched again');
  assert.equal((await h.rpc('offline-status')).result.ready, true);
  console.log('PASS interrupted download resumes completed files, byte progress, saved-body verification');

  const jsKey = keyFor(h, 'studio.js');
  await h.cache(PACK).put(jsKey, reply('corrupt', BASE + 'studio.js'));
  const corrupted = (await h.rpc('offline-status')).result;
  assert.equal(corrupted.ready, false); assert.equal(corrupted.done, 3); assert(corrupted.remainingBytes > 0);
  const beforeRepair = h.requests.length;
  assert.equal((await h.rpc('offline-download')).result.ready, true);
  assert.deepEqual(h.requests.slice(beforeRepair).filter(r => !r.url.endsWith('offline-assets.json')).map(r => r.url), [BASE + 'studio.js']);
  console.log('PASS corrupt saved bytes never count as ready; repair fetches only the corrupt file');

  const originalManifest = h.manifest();
  h.files.set('index.html', '<h1>updated</h1>'); h.files.set('studio.css', 'body{color:purple}');
  h.configure({ failFile: 'studio.css' });
  assert.match((await h.rpc('offline-download')).result.error, /studio\.css/);
  h.configure({ offline: true });
  assert.equal(await (await h.request(BASE, { navigate: true })).text(), '<h1>original</h1>');
  assert.equal(await (await h.request(BASE + 'studio.css?v=1.7')).text(), 'body{color:green}');
  const partial = (await h.rpc('offline-status')).result;
  assert.equal(partial.ready, false, 'a previous complete pack cannot claim the update is ready');
  h.configure({});
  const updateBefore = h.requests.length; assert.equal((await h.rpc('offline-download')).result.ready, true);
  assert.deepEqual(h.requests.slice(updateBefore).filter(r => !r.url.endsWith('offline-assets.json')).map(r => r.url), [BASE + 'studio.css']);
  h.configure({ offline: true });
  assert.equal(await (await h.request(BASE + 'index.html')).text(), '<h1>updated</h1>');
  assert.equal(await (await h.request(BASE + 'studio.css?another-version')).text(), 'body{color:purple}');
  const oldIndexKey = BASE + 'index.html?__cp_sha256=' + originalManifest.files[0].sha256;
  assert(h.stores.get(PACK).has(oldIndexKey), 'older completed downloads survive updates');
  console.log('PASS coherent previous pack during partial update, content-addressed reuse, complete revision switch');

  h.configure({});
  await h.request(BASE + 'index.html?code=private-callback&next=book', { navigate: true });
  assert(h.requests.some(r => r.url.includes('code=private-callback')));
  assert(![...h.stores.get(PACK).keys(), ...h.stores.get(META).keys()].some(k => k.includes('private-callback')));
  assert.equal(await h.request('https://study.test/Commonplace/Coding/Python/index.html'), null);
  assert.equal(await h.request('https://drive.google.com/book'), null);
  assert.equal(await h.request(BASE + 'studio.js', { method: 'POST' }), null);
  assert.equal(await h.request(BASE + 'private-notes.json'), null);
  h.configure({ serverStatus: 404 }); assert.equal((await h.request(BASE + 'studio.js')).status, 404);
  h.configure({ serverStatus: 503 }); assert.match(await (await h.request(BASE + 'studio.js')).text(), /answer=42/);
  h.configure({ hang: true }); let start = Date.now(); assert.match(await (await h.request(BASE + 'studio.js')).text(), /answer=42/); assert(Date.now() - start < 1000);
  h.configure({ hangBody: true }); assert.match(await (await h.request(BASE + 'studio.css')).text(), /purple/);
  h.configure({ offline: true, hangRead: true }); start = Date.now(); assert.equal((await h.request(BASE + 'studio.js')).status, 503); assert(Date.now() - start < 1000);
  console.log('PASS network fixes, OAuth parameters, strict section scope, transport/body/cache deadlines');

  for (const fault of ['badBody', 'badMime', 'failWrite', 'hangWrite']) {
    const f = harness(); f.configure({ [fault]: fault.startsWith('bad') ? 'studio.js' : true });
    const result = (await f.rpc('offline-download')).result;
    assert.equal(result.ready, false); assert(result.error, fault);
    assert(!f.stores.get(META)?.has(BASE + '__offline/complete.json'));
    if (fault === 'failWrite') assert.match(result.error, /Not enough device storage/);
  }
  const invalid = harness(), brokenManifest = invalid.manifest(); brokenManifest.files[0].url = '../../Coding/Python/index.html'; invalid.configure({ badManifest: brokenManifest });
  assert.match((await invalid.rpc('offline-status')).result.error, /unrelated/);
  const forged = harness(), forgedManifest = forged.manifest(); forgedManifest.revision = 'a'.repeat(64); forged.configure({ badManifest: forgedManifest });
  assert.match((await forged.rpc('offline-status')).result.error, /integrity/);
  console.log('PASS wrong hashes/MIME, quotas, stalled saves and malformed manifests never produce ready');

  const paused = harness(); paused.configure({ hangFile: 'studio.js' });
  let pausePromise;
  const downloading = paused.rpc('offline-download', progress => {
    if (progress.file === 'studio.js' && !progress.checking && !pausePromise) pausePromise = paused.rpc('offline-pause');
  });
  const pauseResult = (await downloading).result;
  await pausePromise; assert.equal(pauseResult.paused, true); assert.equal(pauseResult.ready, false);
  paused.configure({}); assert.equal((await paused.rpc('offline-download')).result.ready, true);
  h.configure({});
  assert.equal(await (await h.cache('cp-python-downloads-v1').match(BASE + 'unrelated')).text(), 'keep');
  assert.deepEqual(h.deleted, []);
  console.log('PASS explicit pause and resume preserve completed downloads and unrelated data');
})().catch(error => { console.error(error); process.exitCode = 1; });
