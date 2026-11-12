/* BAT only: small bootstrap; explicit packs survive upgrades and repairs. */
const SHELL = 'cp-bat-shell-v1', PACK = 'cp-bat-downloads-v1';
const root = new URL('./', self.location.href);
const shellFiles = ['offline.html', 'offline-manager.js', 'index.html', '../../_lib/gate.js'];
function key(url) {
  const u = new URL(url); u.search = ''; u.hash = '';
  if (u.pathname.endsWith('/')) u.pathname += 'index.html';
  return u.href;
}
async function live(request, ms = 5000) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), ms);
  try { return await fetch(request, {cache:'no-store', signal:controller.signal}); }
  finally { clearTimeout(timer); }
}
self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(SHELL);
  await Promise.all(shellFiles.map(async f => {
    const u = new URL(f, root).href;
    try { const r = await live(u, 10000); if (r.ok) await c.put(key(u), r); } catch (_) {}
  }));
  await self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== root.origin || u.searchParams.has('bat-network')) return;
  e.respondWith((async () => {
    const pack = await caches.open(PACK), shell = await caches.open(SHELL);
    // Network first: even an old saved page can receive fixes. Saved packs are
    // replaced only by verified explicit downloads, never background responses.
    try {
      const response = await live(req);
      if (response.ok) return response;
      const saved = await pack.match(key(u)) || await shell.match(key(u));
      return saved || response;
    } catch (_) {
      const saved = await pack.match(key(u)) || await shell.match(key(u));
      if (saved) return saved;
      if (req.mode === 'navigate') return new Response('<!doctype html><meta name="viewport" content="width=device-width"><h1>Page not downloaded</h1><p>Reconnect and prepare BAT downloads.</p><a href="'+new URL('offline.html',root)+'">Study offline</a>', {headers:{'Content-Type':'text/html'}});
      return new Response('Not downloaded', {status:503});
    }
  })());
});
