/* sw.js — Commonplace · Python. Lives at the Python/ root so its scope covers
 * every page. Deliberately conservative:
 *   · same-origin GETs      → stale-while-revalidate (instant, self-healing)
 *   · navigations offline   → last cached copy, else the offline card
 *   · cross-origin (Pyodide CDN, fonts) → straight to network, never cached
 *     (Pyodide is ~10 MB; caching it here would blow the storage budget and
 *      is already handled by the browser's own HTTP cache)
 * Bump VERSION to force every client to refetch.
 */
var VERSION = "cp-py-v1";
var CORE = [
  "./",
  "index.html",
  "lib/py-kb-fix.js",
  "lib/practice-engine.js",
  "lib/compose-blocks.js",
  "pwa/manifest.json"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      /* addAll rejects the whole batch on one 404 — add individually */
      return Promise.all(CORE.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === VERSION ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "skip-waiting") self.skipWaiting();
});

var OFFLINE_CARD =
  '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Offline</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;' +
  'background:#eceee4;color:#1a2820;font-family:Georgia,serif;padding:28px;text-align:center}' +
  'p{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#7a8c80}' +
  'h1{font-size:26px;font-weight:600;margin:6px 0 10px}em{color:#41564a}</style>' +
  '<div><p>Commonplace · Python</p><h1>This page is not cached yet</h1>' +
  '<em>Open it once while online and it will be here next time.</em></div>';

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;          /* CDNs: network only */
  if (url.search.indexOf("nocache") >= 0) return;

  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: false }).then(function (hit) {
        var live = fetch(req).then(function (res) {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        }).catch(function () {
          return hit || cache.match(req, { ignoreSearch: true }) || null;
        });

        if (hit) { e.waitUntil(live.catch(function () {})); return hit; }

        return live.then(function (res) {
          if (res) return res;
          if (req.mode === "navigate")
            return new Response(OFFLINE_CARD, { headers: { "Content-Type": "text/html; charset=utf-8" } });
          return new Response("", { status: 504, statusText: "Offline" });
        });
      });
    })
  );
});
