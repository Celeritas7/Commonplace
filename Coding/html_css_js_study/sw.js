/* Commonplace · Web Dev Bootcamp — offline cache.
 * Scope is the html_css_js_study folder; the fonts, backup button and study layer come from
 * ../../_lib and ../../extras.js, so those are precached too. Bump CACHE on any change.
 * The study-book links go to Google Drive and are never cached.
 */
const CACHE = "html-css-js-study-v2";

const PRECACHE = [
  "./",
  "./index.html",
  "./data/course-index.js",
  "./my_apps/",
  "./my_apps/index.html",
  "./my_apps/_bundle.js",
  "./my_apps/scripts.json",
  "./my_apps/log.md",
  "./my_apps/01_part_matrix/tutorial.md",
  "./my_apps/01_part_matrix/notes.md",
  "./my_apps/02_batsmith/tutorial.md",
  "./my_apps/02_batsmith/notes.md",
  "./pwa/manifest.json",
  "./pwa/icon-192.png",
  "./pwa/icon-512.png",
  "./pwa/icon-180.png",
  "../../extras.js",
  "../../_lib/progress-backup.js",
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
    /* only our own old versions: caches are shared by the whole site */
    await Promise.all(keys.filter((k) => k.startsWith("html-css-js-study-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Same-origin GETs: cache first (instant, works offline), refreshed in the background.
// Anything else (Google Drive) goes straight to the network.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response("Offline", { status: 503, statusText: "Offline" });
  })());
});
