/* sql-lab service worker — network-first.
   v1 was cache-first for every GET, so once a page or script was cached the browser
   kept serving the old copy forever (stale index.html, stale lib/*.js, stale icons).
   Network-first keeps the app fresh and still works offline from cache. */
const C = 'sql-lab-v2';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const c = await caches.open(C);
    try {
      const r = await fetch(e.request);
      if (r && r.ok && new URL(e.request.url).origin === location.origin) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      const hit = await c.match(e.request);
      if (hit) return hit;
      throw err;
    }
  })());
});
