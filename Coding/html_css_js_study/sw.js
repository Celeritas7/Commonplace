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
// Revision snapshots and document-to-revision pins live in Web Studio's own
// metadata cache. They contain neither OAuth parameters nor study data.
const REVISION_ROOT = new URL('__offline/revisions/', BASE).href;
const CLIENT_ROOT = new URL('__offline/clients/', BASE).href;
const revisionKey = revision => REVISION_ROOT + revision + '.json';
const clientKey = id => CLIENT_ROOT + encodeURIComponent(id) + '.json';
const STORAGE_MS = 4000;
const NETWORK_MS = 6000;
const DOWNLOAD_MS = 25000;
// Stop before the page's five-minute RPC deadline so Retry never competes
// with an invisible, still-running download.
const OPERATION_MS = 4 * 60 * 1000;
let activeDownload = null;
let completionQueue = Promise.resolve();

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
  const label = key === COMPLETE_KEY ? 'complete' : key === CANDIDATE_KEY ? 'candidate' : 'revision';
  if (!saved) throw new Error('The ' + label + ' download list could not be read back after saving. Retry or repair offline setup.');
  if (saved.revision !== manifest.revision) throw new Error('The ' + label + ' download list changed during verification (' + manifest.revision.slice(0, 12) + ' to ' + saved.revision.slice(0, 12) + '). Another check may be running. Retry when it finishes.');
}
// Preserve both generations before publishing the new complete pointer. An
// interrupted update must leave the old manifest and hashed files usable.
function promoteComplete(manifest) {
  const operation = completionQueue.then(async () => {
    const old = await readManifest(COMPLETE_KEY, true);
    if (old && old.revision !== manifest.revision) {
      await writeManifest(revisionKey(old.revision), old);
    }
    await writeManifest(revisionKey(manifest.revision), manifest);
    await writeManifest(COMPLETE_KEY, manifest);
  });
  completionQueue = operation.catch(() => {});
  return operation;
}
async function pinnedRevision(id) {
  if (!id) return null;
  const cache = await storage(caches.open(META_CACHE));
  const entry = await storage(cache.match(clientKey(id)));
  if (!entry) return null;
  const data = await storage(entry.json());
  if (!data || !/^[a-f0-9]{64}$/.test(data.revision)) {
    throw new Error('The saved page revision is invalid. Reopen Web Studio to retry.');
  }
  return data.revision;
}
async function pinRevision(id, revision) {
  if (!id || !revision) return;
  const cache = await storage(caches.open(META_CACHE));
  await storage(cache.put(clientKey(id), new Response(JSON.stringify({ revision }), {
    headers: { 'Content-Type': 'application/json' }
  })));
}
// Navigation chooses a complete revision; subsequent requests from that
// document continue to use it even after an update completes. Pins persist
// across service-worker restarts. A new navigation selects the latest pack.
async function manifestForClient(event) {
  const complete = await readManifest(COMPLETE_KEY, true);
  if (!complete) return null;
  if (event.request.mode === 'navigate') {
    await pinRevision(event.resultingClientId || event.clientId, complete.revision);
    return complete;
  }
  const revision = await pinnedRevision(event.clientId);
  if (!revision || revision === complete.revision) return complete;
  const previous = await readManifest(revisionKey(revision), true);
  if (!previous) throw new Error('This page\'s saved revision is unavailable. Save your work and reload Web Studio.');
  return previous;
}
async function currentManifest() {
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
// The candidate's readiness and the previous complete pack are different
// facts. Check the previous files again: a manifest pointer alone cannot prove
// Safari retained their bytes. These fields contain revisions, never user data.
async function withCompleteStatus(state, clientId) {
  const complete = await readManifest(COMPLETE_KEY, true);
  const different = !!complete && !!state.revision && complete.revision !== state.revision;
  const completeReady = !complete ? false :
    different ? (await inspect(complete)).status.ready : state.ready === true;
  const pageRevision = await pinnedRevision(clientId);
  return { ...state,
    completeRevision: complete ? complete.revision : null,
    completeReady,
    previousReady: different && completeReady,
    updatePending: different && state.ready !== true,
    pageRevision: pageRevision || null,
    reloadRecommended: completeReady && !!pageRevision && pageRevision !== complete.revision
  };
}
async function checkDownloads(port, clientId) {
  const manifest = await currentManifest();
  const inspected = await inspect(manifest, port);
  if (inspected.status.ready) await promoteComplete(manifest);
  return withCompleteStatus(inspected.status, clientId);
}
async function download(port, clientId) {
  if (activeDownload) throw new Error('A download is already running. Keep its screen open, or pause it before retrying.');
  const task = { paused: false, controller: null, status: null, file: '' };
  activeDownload = task;
  const heartbeat = setInterval(() => post(port, { ...(task.status || {}), ready: false, progress: true, file: task.file }), 4000);
  const deadline = setTimeout(() => { task.paused = true; if (task.controller) task.controller.abort(); }, OPERATION_MS);
  try {
    const manifest = await currentManifest(); checkTask(task);
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
    checkTask(task); await promoteComplete(manifest); checkTask(task);
    return withCompleteStatus(final.status, clientId);
  } catch (error) {
    if (task.paused || error.paused) {
      return task.status ? withCompleteStatus({ ...task.status, ready: false, paused: true }, clientId) : { ready: false, paused: true };
    }
    try { error.status = task.status ? await withCompleteStatus({ ...task.status, ready: false }, clientId) : task.status; }
    catch (_) { error.status = task.status; }
    throw error;
  } finally {
    clearInterval(heartbeat); clearTimeout(deadline);
    if (activeDownload === task) activeDownload = null;
  }
}
function unavailable(message) {
  return new Response(message, {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('message', event => {
  const type = event.data && event.data.type, port = event.ports && event.ports[0];
  if (!port || !['offline-status', 'offline-download', 'offline-pause'].includes(type)) return;
  event.waitUntil((async () => {
    try {
      // This also pins pages that loaded online just before the worker claimed
      // them. Do not overwrite a pin when a newer pack becomes complete.
      if (event.source && event.source.id && type !== 'offline-pause') {
        const revision = await pinnedRevision(event.source.id);
        if (!revision) {
          const complete = await readManifest(COMPLETE_KEY, true);
          if (complete) await pinRevision(event.source.id, complete.revision);
        }
      }
      if (type === 'offline-pause') {
        if (activeDownload) { activeDownload.paused = true; if (activeDownload.controller) activeDownload.controller.abort(); }
        post(port, { paused: true }); return;
      }
      const clientId = event.source && event.source.id || '';
      const state = type === 'offline-download' ? await download(port, clientId) : await checkDownloads(port, clientId);
      post(port, state);
    } catch (error) { post(port, { ...(error.status || {}), ready: false, error: error.message || 'Offline setup failed. Retry or repair offline setup.' }); }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !allowed(new URL(request.url))) return;
  event.respondWith((async () => {
    let manifest;
    try { manifest = await manifestForClient(event); }
    catch (error) { return unavailable('Web Studio offline storage or revision error: ' + error.message); }
    if (manifest) {
      const file = manifest.files.find(entry => fileURL(entry) === canonical(request.url));
      // An old document must never load an unlisted file from a newer live
      // deployment. The candidate pack is never used for runtime serving.
      if (!file) return unavailable('This resource is not in the saved Web Studio revision. Save your work and reload after checking for updates.');
      let saved;
      try { saved = await verifiedFile(await storage(caches.open(PACK_CACHE)), file); }
      catch (error) { return unavailable('Web Studio offline storage could not be read: ' + error.message); }
      if (saved) return saved;
      // A missing or corrupted saved file can be recovered online only when
      // the server returns EXACTLY the bytes pinned by this document.
      try {
        const live = await network(request);
        if (goodResponse(live, request.url)) {
          const data = await storage(live.arrayBuffer());
          if (data.byteLength === file.bytes && await digest(data) === file.sha256) {
            return new Response(data, { headers: live.headers });
          }
        }
      } catch (_) { /* Keep the active revision coherent on failures. */ }
      return unavailable('Saved Web Studio file ' + file.url + ' is missing or damaged. Reconnect and repair the study pack; no newer incompatible file was loaded.');
    }
    // Before the first complete download, a fresh online visit uses the live
    // release. Never assemble a page from an incomplete candidate download.
    try {
      const live = await network(request);
      if (goodResponse(live, request.url) || (live && live.status >= 400)) return live;
      return unavailable('The server returned unexpected content for a Web Studio study file. Reconnect and retry.');
    } catch (_) {
      return unavailable('This Web Studio file is not saved in a complete study pack. Reconnect, open Study offline, and download or repair the pack.');
    }
  })());
});
