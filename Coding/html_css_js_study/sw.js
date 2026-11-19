/* Web Studio: a small, versioned application shell, not a verified offline pack.
 * Install the shell completely before replacing an older worker. Large assets
 * and external course material are deliberately not downloaded here.
 * Bump CACHE when publishing an incompatible shell. Online requests always
 * check the network, so fixes to shared files do not depend on a version bump.
 */
const CACHE = 'html-css-js-study-shell-v2';
const LEGACY_CACHE = 'html-css-js-study-v1';
const BASE = new URL('./', self.location.href);
const CORE = [
  'index.html', 'studio.css', 'studio.css?v=1.2', 'studio.css?v=1.3', 'studio.css?v=1.4', 'studio.js?v=1.4', 'studio-store.js?v=1.4', 'studio-preview.js?v=1.4', 'studio-exercises.js', 'studio-practice.js','studio.css?v=1.5','studio.js?v=1.5','studio-store.js?v=1.5','studio-preview.js?v=1.5','studio-projects.js','studio-project-ui.js','studio.css?v=1.6','studio.js?v=1.6','studio-store.js?v=1.6','studio-preview.js?v=1.6','studio-sync-merge.js?v=1.6','studio-sync.js?v=1.6','studio-cloud.js?v=1.6', 'studio.js', 'studio-lessons.js',
  'studio-store.js', 'studio-preview.js', 'legacy-tracker.js',
  'vendor/acorn.js', 'data/course-index.js', '../../_lib/gate.js'
];
const OPTIONAL = [
  'pwa/manifest.json', 'pwa/icon-192.png', 'pwa/icon-512.png', 'pwa/icon-180.png',
  '../../extras.js', '../../_lib/progress-backup.js', '../../_lib/supabase.js',
  '../../_lib/fonts/gf-135340b0.css'
];
const ALLOWED = new Set(CORE.concat(OPTIONAL).map(path => new URL(path, BASE).pathname));
const INDEX = new URL('index.html', BASE).href;
const NETWORK_MS = 6000;
const STORAGE_MS = 3000;

function bounded(promise, milliseconds, message, onTimeout) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
      if (onTimeout) onTimeout();
    }, milliseconds);
  });
  // Race even when a transport ignores abort; no request waits indefinitely.
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function network(request) {
  const controller = new AbortController();
  const complete = fetch(request, { cache: 'no-store', signal: controller.signal }).then(async response => {
    if (response.status !== 200 || response.redirected || response.type === 'opaque') return response;
    // Include body transfer in the deadline. A server which sends headers and
    // then stalls must not leave the document or a script loading forever.
    const body = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    headers.delete('content-encoding'); // Fetch has already decoded the body.
    headers.delete('content-length');
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  });
  return bounded(complete,
    NETWORK_MS, 'Web Studio network request timed out', () => controller.abort());
}

function storage(promise) {
  return bounded(promise, STORAGE_MS, 'Web Studio cache did not respond');
}

function usable(response, pathname) {
  if (!response || response.status !== 200 || response.redirected || response.type === 'opaque') return false;
  const type = (response.headers.get('content-type') || '').toLowerCase();
  // Do not install a host's HTML error/fallback page as JavaScript or CSS.
  if (/\.js$/.test(pathname)) return /(?:javascript|ecmascript)/.test(type);
  if (/\.css$/.test(pathname)) return type.includes('text/css');
  if (/\.html$/.test(pathname) || pathname === BASE.pathname) return type.includes('text/html');
  return true;
}

async function put(key, response) {
  const cache = await storage(caches.open(CACHE));
  await storage(cache.put(key, response));
}

async function cached(key, navigation) {
  // Never use caches.match across the origin: another section can have cached
  // a different revision of a shared script. Keep lookup ownership explicit.
  for (const name of [CACHE, LEGACY_CACHE]) {
    try {
      const cache = await storage(caches.open(name));
      const hit = await storage(cache.match(key));
      if (hit) return hit;
      if (navigation && name === LEGACY_CACHE) {
        const directory = await storage(cache.match(BASE.href));
        if (directory) return directory;
      }
    } catch (_) {
      // Unavailable storage must not cause an unbounded loading state.
    }
  }
  return null;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await storage(caches.open(CACHE));
    await Promise.all(CORE.map(async path => {
      const url = new URL(path, BASE);
      const response = await network(new Request(url.href));
      if (!usable(response, url.pathname)) throw new Error('Web Studio could not install ' + path);
      await storage(cache.put(url.href, response));
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  // CacheStorage is shared by every Commonplace section. Do not delete old
  // downloads, annotation data, or even the old tracker cache during upgrade.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== BASE.origin) return;
  const isEntry = url.pathname === BASE.pathname || url.pathname === new URL(INDEX).pathname;
  const navigation = request.mode === 'navigate' && isEntry;
  if (!ALLOWED.has(url.pathname) && !navigation) return;

  // Preserve OAuth query parameters on the network request, but never persist
  // them in static entry cache keys. Asset query strings remain exact.
  const key = navigation ? INDEX : request.url;
  event.respondWith((async () => {
    let response;
    try {
      response = await network(request);
      if (usable(response, url.pathname)) {
        const copy = response.clone();
        event.waitUntil(put(key, copy).catch(() => {}));
        return response;
      }
      // Do not conceal an explicit permission error or missing file with a
      // stale success response. Transient server failures can use the cache.
      if (response.status < 500) return response;
    } catch (_) {}
    const fallback = await cached(key, navigation);
    if (fallback) return fallback;
    return response || new Response('This Web Studio file is not saved on this device. Reconnect and reload. Verified offline downloads are not available yet.', {
      status: 503,
      statusText: 'Web Studio file unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  })());
});
