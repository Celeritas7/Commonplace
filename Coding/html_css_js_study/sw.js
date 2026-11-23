/* Web Studio offline packs. Installation downloads only this worker.
 * Files are content-addressed and verified again before reporting Ready offline.
 * A completed revision remains available throughout an interrupted update.
 * Neither activation nor repair deletes packs, study records or other app caches.
 */
'use strict';
const BASE = new URL('./', self.location.href);
const REPO = new URL('../../', BASE);
const PACK_CACHE = 'cp-web-studio-downloads-v1';
const META_CACHE = 'cp-web-studio-offline-v1';
const MANIFEST_URL = new URL('offline-assets.json', BASE).href;
const CANDIDATE_KEY = new URL('__offline/candidate.json', BASE).href;
const COMPLETE_KEY = new URL('__offline/complete.json', BASE).href;
const STORAGE_MS = 4000;
const NETWORK_MS = 6000;
const DOWNLOAD_MS = 25000;
// Stop before the page's five-minute RPC deadline so Retry never competes
// with an invisible, still-running download.
const OPERATION_MS = 4 * 60 * 1000;
let activeDownload = null;

function bounded(promise, milliseconds, message, onTimeout) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (onTimeout) onTimeout();
      reject(new Error(message));
    }, milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
function storage(promise) { return bounded(promise, STORAGE_MS, 'Offline storage did not respond. Retry or repair offline setup.'); }
function post(port, value) { try { port.postMessage(value); } catch (_) {} }
function allowed(url) {
  if (url.origin !== BASE.origin || url.username || url.password) return false;
  const local = url.pathname.startsWith(BASE.pathname) ? url.pathname.slice(BASE.pathname.length) : null;
  if (local !== null) {
    return local === '' || /^(?:index|offline|offline-repair)\.html$/.test(local) ||
      /^(?:studio(?:-[a-z]+)*|legacy-tracker|offline)\.(?:js|css)$/.test(local) ||
      /^data\/[\w.-]+\.(?:js|json)$/.test(local) || /^vendor\/[\w.-]+\.js$/.test(local) ||
      /^pwa\/(?:manifest\.json|icon-\d+\.png)$/.test(local) ||
      /^assets\/(?:[\w.-]+\/)*[\w.-]+\.(?:png|jpe?g|webp|gif|svg|woff2?|mp3|ogg)$/.test(local);
  }
  const shared = url.pathname.startsWith(REPO.pathname) ? url.pathname.slice(REPO.pathname.length) : '';
  return /^(?:extras\.js|_lib\/(?:gate|supabase|progress-backup|autoscroll)\.js|_lib\/quiz\/quiz\.js|_lib\/fonts\/(?:[\w.-]+\.css|f\/[\w.-]+\.woff2?))$/.test(shared);
}
function canonical(requestURL) {
  const url = new URL(requestURL);
  url.search = ''; url.hash = '';
  if (url.href === BASE.href) return new URL('index.html', BASE).href;
  return url.href;
}
function fileURL(file) { return new URL(file.url, BASE).href; }
function fileKey(file) { const url = new URL(fileURL(file)); url.searchParams.set('__cp_sha256', file.sha256); return url.href; }
function goodResponse(response, url) {
  if (!response || response.status !== 200 || response.redirected || response.type === 'opaque') return false;
  const type = (response.headers.get('content-type') || '').toLowerCase();
  const pathname = new URL(url).pathname;
  if (/\.js$/.test(pathname)) return /javascript|ecmascript/.test(type);
  if (/\.css$/.test(pathname)) return type.includes('text/css');
  if (/\.html$/.test(pathname) || pathname === BASE.pathname) return type.includes('text/html');
  if (/\.json$/.test(pathname)) return type.includes('json');
  return true;
}
async function digest(bytes) {
  const value = await bounded(crypto.subtle.digest('SHA-256', bytes), STORAGE_MS, 'File verification timed out. Retry the download.');
  return Array.from(new Uint8Array(value), b => b.toString(16).padStart(2, '0')).join('');
}
async function validateManifest(value) {
  if (!value || value.version !== 1 || !/^[a-f0-9]{64}$/.test(value.revision) || !Array.isArray(value.files) || !value.files.length || value.files.length > 500) throw new Error('The download list is invalid. Check for app updates and retry.');
  let bytes = 0; const seen = new Set(), files = [];
  for (const file of value.files) {
    if (!file || typeof file.url !== 'string' || /[?#\\%:]|^\//.test(file.url) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > 16 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('The download list contains an invalid file.');
    const url = new URL(file.url, BASE);
    if (!allowed(url) || seen.has(url.href)) throw new Error('The download list includes a duplicate or unrelated file.');
    seen.add(url.href); bytes += file.bytes;
    files.push({ url: file.url, bytes: file.bytes, sha256: file.sha256 });
  }
  if (bytes !== value.bytes || bytes > 64 * 1024 * 1024 || !seen.has(new URL('index.html', BASE).href)) throw new Error('The download list has an invalid size or is missing the app.');
  if (await digest(new TextEncoder().encode(JSON.stringify(files))) !== value.revision) throw new Error('The download list failed its integrity check. Retry while connected.');
  return { version: 1, revision: value.revision, bytes, files };
}
async function network(request, milliseconds = NETWORK_MS, task) {
  const controller = new AbortController();
  if (task) task.controller = controller;
  try {
    return await bounded((async () => {
      const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
      if (response.status !== 200 || response.redirected || response.type === 'opaque') return response;
      const body = await response.arrayBuffer();
      const headers = new Headers(response.headers);
      // Fetch already decoded the body; do not preserve compressed lengths.
      headers.delete('content-encoding'); headers.delete('content-length');
      return new Response(body, { status: 200, headers });
    })(), milliseconds, 'The connection timed out. Reconnect and resume.', () => controller.abort());
  } finally { if (task && task.controller === controller) task.controller = null; }
}
async function readManifest(key, strict = false) {
  const cache = await storage(caches.open(META_CACHE));
  const response = await storage(cache.match(key));
  if (!response) return null;
  try { return await validateManifest(await storage(response.json())); }
  catch (error) {
    if (strict) throw new Error('Saved download list verification failed: ' + error.message);
    if (/storage did not respond|verification timed out/.test(error.message)) throw error;
    return null;
  }
}
async function writeManifest(key, manifest) {
  const cache = await storage(caches.open(META_CACHE));
  await storage(cache.put(key, new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } })));
  const saved = await readManifest(key, true);
  const label = key === COMPLETE_KEY ? 'complete' : 'candidate';
  if (!saved) throw new Error('The ' + label + ' download list could not be read back after saving. Retry or repair offline setup.');
  if (saved.revision !== manifest.revision) throw new Error('The ' + label + ' download list changed during verification (' + manifest.revision.slice(0, 12) + ' to ' + saved.revision.slice(0, 12) + '). Another check may be running. Retry when it finishes.');
}
async function currentManifest(requireNetwork = false) {
  let response;
  try { response = await network(new Request(MANIFEST_URL), DOWNLOAD_MS); }
  catch (_) { /* Saved list supports checking and resuming after interruption. */ }
  if (response && response.status < 500) {
    if (!goodResponse(response, MANIFEST_URL)) throw new Error('The download list is unavailable (HTTP ' + response.status + '). Check for app updates and retry.');
    let value;
    try { value = await response.json(); } catch (_) { throw new Error('The server returned an invalid download list. Reconnect and retry.'); }
    const manifest = await validateManifest(value);
    await writeManifest(CANDIDATE_KEY, manifest);
    return manifest;
  }
  if (requireNetwork) throw new Error('Could not reach the published download list. Reconnect and check for updates again.');
  const saved = await readManifest(CANDIDATE_KEY) || await readManifest(COMPLETE_KEY);
  if (!saved) throw new Error('Connect to the internet once to load the download list, then retry.');
  return saved;
}
async function verifiedFile(cache, file) {
  const response = await storage(cache.match(fileKey(file)));
  if (!goodResponse(response, fileURL(file))) return null;
  const data = await storage(response.arrayBuffer());
  if (data.byteLength !== file.bytes || await digest(data) !== file.sha256) return null;
  return new Response(data, { headers: response.headers });
}
function stateFor(manifest, done = 0, savedBytes = 0) {
  return { ready: done === manifest.files.length, done, total: manifest.files.length, bytes: manifest.bytes, remainingBytes: manifest.bytes - savedBytes, revision: manifest.revision };
}
function checkTask(task) {
  if (task && task.paused) { const error = new Error('Download paused. Completed files are kept; resume when ready.'); error.paused = true; throw error; }
}
async function inspect(manifest, port, task) {
  const cache = await storage(caches.open(PACK_CACHE));
  let done = 0, savedBytes = 0;
  const missing = [];
  for (const file of manifest.files) {
    checkTask(task);
    if (await verifiedFile(cache, file)) { done++; savedBytes += file.bytes; } else missing.push(file);
    const status = stateFor(manifest, done, savedBytes);
    if (task) task.status = status;
    if (port) post(port, { ...status, ready: false, progress: true, file: file.url, checking: true });
  }
  return { cache, missing, status: stateFor(manifest, done, savedBytes) };
}
async function checkDownloads(port, type, clientId) {
  const complete = await readManifest(COMPLETE_KEY, true);
  const local = type === 'offline-local-status';
  const manifest = local && (await readManifest(CANDIDATE_KEY) || complete)
    || await currentManifest(type === 'offline-update');
  const { status } = await inspect(manifest, port);
  // Only the downloader commits revisions. A concurrent check must never
  // roll back a newer completed download or promote an unfinished transfer.
  if (complete?.revision !== manifest.revision) {
    status.ready = false;
    if (complete) status.previousReady = (await inspect(complete)).status.ready;
  }
  if (clientId) {
    const cache = await storage(caches.open(META_CACHE));
    const record = await storage(cache.match(clientKey(clientId)));
    status.pageRevision = record && (await storage(record.json()))?.revision;
  }
  return status;
}
async function download(port) {
  if (activeDownload) throw new Error('A download is already running. Keep its screen open, or pause it before retrying.');
  const task = { paused: false, controller: null, status: null, file: '' };
  activeDownload = task;
  const heartbeat = setInterval(() => post(port, { ...(task.status || {}), ready: false, progress: true, file: task.file }), 4000);
  const deadline = setTimeout(() => { task.paused = true; if (task.controller) task.controller.abort(); }, OPERATION_MS);
  try {
    const manifest = await currentManifest(); checkTask(task);
    const complete = await readManifest(COMPLETE_KEY, true);
    task.previousReady = Boolean(complete && complete.revision !== manifest.revision && (await inspect(complete)).status.ready);
    const inspected = await inspect(manifest, port, task);
    let done = inspected.status.done, savedBytes = manifest.bytes - inspected.status.remainingBytes;
    for (const file of inspected.missing) {
      checkTask(task); task.file = file.url;
      post(port, { ...stateFor(manifest, done, savedBytes), ready: false, progress: true, file: file.url });
      try {
        const response = await network(new Request(fileURL(file)), DOWNLOAD_MS, task);
        checkTask(task);
        if (!goodResponse(response, fileURL(file))) throw new Error('File unavailable or unexpected content (HTTP ' + response.status + ')');
        const data = await storage(response.arrayBuffer());
        if (data.byteLength !== file.bytes || await digest(data) !== file.sha256) throw new Error('The app is updating or this file is incomplete. Check for app updates, then resume');
        checkTask(task);
        await storage(inspected.cache.put(fileKey(file), new Response(data, { headers: response.headers })));
        checkTask(task);
        if (!await verifiedFile(inspected.cache, file)) throw new Error('The saved file could not be verified');
      } catch (error) {
        checkTask(task);
        const reason = error.name === 'QuotaExceededError' ? 'Not enough device storage. Free space outside this app and resume; study data has not been removed' : error.message;
        throw new Error('Download paused at ' + file.url + '. ' + reason + '. Completed files are kept.');
      }
      done++; savedBytes += file.bytes;
      task.status = stateFor(manifest, done, savedBytes);
      post(port, { ...task.status, ready: false, progress: true, file: file.url });
    }
    checkTask(task);
    // Re-read every saved body, then atomically select the complete pack. A
    // terminated worker leaves the previous complete manifest untouched.
    const final = await inspect(manifest, port, task);
    if (!final.status.ready) throw new Error('Some files were removed while downloading. Resume to save the missing files.');
    checkTask(task); await writeManifest(COMPLETE_KEY, manifest); checkTask(task);
    return final.status;
  } catch (error) {
    if (task.paused || error.paused) return { ...(task.status || {}), ready: false, paused: true, previousReady: task.previousReady };
    error.status = { ...task.status, previousReady: task.previousReady }; throw error;
  } finally {
    clearInterval(heartbeat); clearTimeout(deadline);
    if (activeDownload === task) activeDownload = null;
  }
}
// Keep each navigation's selection across worker suspension and replacement.
// Only generated client IDs and public pack metadata enter this cache.
const CLIENT_PREFIX = new URL('__offline/client/', BASE).href;
function clientKey(id) { return CLIENT_PREFIX + encodeURIComponent(id); }
async function pin(cache, id, manifest) {
  await storage(cache.put(clientKey(id), new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/json', 'Date': new Date().toUTCString() }
  })));
}
async function prunePins() {
  const cache = await storage(caches.open(META_CACHE));
  const keys = (await storage(cache.keys())).filter(key => key.url.startsWith(CLIENT_PREFIX));
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  const live = new Set(clients.map(client => clientKey(client.id)));
  for (const key of keys) {
    if (live.has(key.url)) continue;
    const record = await storage(cache.match(key));
    // A navigation can be reserved but not yet visible to matchAll.
    if (record && Date.parse(record.headers.get('Date')) < Date.now() - 86400000) await storage(cache.delete(key));
  }
}
async function selectedManifest(event) {
  const cache = await storage(caches.open(META_CACHE));
  if (event.request.mode === 'navigate') {
    const manifest = await readManifest(COMPLETE_KEY, true);
    if (event.resultingClientId) await pin(cache, event.resultingClientId, manifest);
    return manifest;
  }
  if (event.clientId) {
    const record = await storage(cache.match(clientKey(event.clientId)));
    if (record) {
      const value = await storage(record.json());
      return value && validateManifest(value);
    }
    // Newly claimed online pages loaded their HTML from the deployment.
    if ('resultingClientId' in event) return null;
    // Older WebKit supplies the client ID only on subresource requests.
    const manifest = await readManifest(COMPLETE_KEY, true);
    await pin(cache, event.clientId, manifest);
    return manifest;
  }
  return readManifest(COMPLETE_KEY, true);
}
function unavailable(request, message) {
  const navigation = request.mode === 'navigate';
  const body = navigation ? '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Web Studio recovery</title><main><h1>Web Studio could not open</h1><p>' + message + '</p><p><a href="offline-repair.html">Repair offline setup</a> · <a href="index.html">Retry Web Studio</a></p></main>' : message;
  return new Response(body, { status: 503, headers: { 'Content-Type': navigation ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
async function serve(event) {
  const request = event.request, url = canonical(request.url);
  // Repair is a standalone maintenance page with no study dependencies. Fetch
  // the current repair UI online, including when an old pack cannot boot.
  const repair = url === new URL('offline-repair.html', BASE).href;
  if (repair) {
    try { const response = await network(request); if (goodResponse(response, url)) return response; } catch (_) {}
  }
  try {
    const manifest = await selectedManifest(event);
    if (manifest) {
      const file = manifest.files.find(entry => fileURL(entry) === url);
      const cache = await storage(caches.open(PACK_CACHE));
      const saved = file && await verifiedFile(cache, file);
      if (saved) return saved;
      return unavailable(request, 'A required file in this saved revision is missing or damaged. Reconnect and repair the study pack.');
    }
  } catch (_) {
    return unavailable(request, 'Web Studio could not read or verify offline storage. Retry in this app or reconnect and open Repair offline setup.');
  }
  try {
    const response = await network(request);
    if (goodResponse(response, url)) return response;
    return unavailable(request, 'The server returned an unavailable or invalid study file. Reconnect and check for updates.');
  } catch (_) {
    return unavailable(request, 'No complete study download is available in this app. Reconnect and prepare Study offline here.');
  }
}
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => { event.waitUntil(Promise.all([self.clients.claim(), prunePins().catch(() => {})])); });
self.addEventListener('message', event => {
  const type = event.data && event.data.type, port = event.ports && event.ports[0];
  if (!port || !['offline-local-status', 'offline-status', 'offline-update', 'offline-download', 'offline-pause'].includes(type)) return;
  event.waitUntil((async () => {
    try {
      if (type === 'offline-pause') {
        if (activeDownload) { activeDownload.paused = true; if (activeDownload.controller) activeDownload.controller.abort(); }
        post(port, { paused: true }); return;
      }
      const state = type === 'offline-download' ? await download(port) : await checkDownloads(port, type, event.source?.id);
      post(port, state);
    } catch (error) { post(port, { ...(error.status || {}), ready: false, error: error.message || 'Offline setup failed. Retry or repair offline setup.' }); }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !allowed(new URL(request.url))) return;
  event.respondWith(serve(event));
});
