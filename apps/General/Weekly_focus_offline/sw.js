/* Weekly Focus (offline build) — service worker.
   Caches every file of the app so it opens with no connection once it has been loaded
   over http(s) one time. Opening index.html straight from disk also works, just without this.
   BUMP CACHE on every change so browsers pick up the new files. */
const CACHE = "weekly-focus-offline-v3";
const ASSETS = [
  "./", "./index.html",
  "./js/config.js", "./js/info-feeds.js", "./js/weekly-focus-app.js",
  "./css/weekly-focus.css", "./css/home-screens.css",
  "./manifest.webmanifest",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.indexOf("weekly-focus-offline-") === 0 && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Weather / train feeds and anything else cross-origin go straight to the network.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // The page: network first so updates land, cached copy when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", cp)); return r; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Files: cache first, then network (and keep a copy).
  e.respondWith(
    caches.match(req).then((c) => c || fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((cache) => cache.put(req, cp)); }
      return r;
    }))
  );
});
