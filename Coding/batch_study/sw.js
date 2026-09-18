/* Commonplace · Batch Scripts — offline cache.
 * Scope is the batch_study folder, but the module pulls React, support.js and the
 * fonts from ../../_lib, so those are precached too. Bump CACHE on any change.
 */
const CACHE = "batch-study-v2";
const MODULE = "The%20Modules/Module%2001%20%C2%B7%20Foundations%20-%20Folders.dc.html";

const PRECACHE = [
  "./",
  "./index.html",
  "./" + MODULE,
  "./The%20Modules/support.js",
  "./The%20Modules/Batch%20Sandbox.dc.html",
  "./The%20Modules/Batch%20Command%20Reference.dc.html",
  "./pwa/manifest.json",
  "./pwa/icon-192.png",
  "./pwa/icon-512.png",
  "./pwa/icon-180.png",
  "../../reading-sync.js",
  "../../_lib/progress-backup.js",
  "../../_lib/dc/react.production.min.js",
  "../../_lib/dc/react-dom.production.min.js",
  "../../_lib/fonts/gf-135340b0.css"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // addAll fails wholesale if one entry 404s, so add them one at a time
    await Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Same-origin GETs: serve from cache first (instant + works in airplane mode),
// refresh in the background. Supabase and the font CDN fall through to network.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) {
      fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); }).catch(() => {});
      return hit;
    }
    try {
      const r = await fetch(req);
      if (r && r.ok) c.put(req, r.clone());
      return r;
    } catch (err) {
      // navigations with nothing cached → hand back the shell
      if (req.mode === "navigate") {
        return (await c.match("./index.html")) || Response.error();
      }
      return Response.error();
    }
  })());
});
