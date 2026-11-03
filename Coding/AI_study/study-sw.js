/* study-sw.js — Classical ML · offline copy of the book, the reader and the notes.
 *
 * Registered by book/js/sw-register.js on three scopes: index.html, book/ and
 * notes/. It does NOT cover lab/, notebooks/, tree/ or repl/: those belong to
 * JupyterLite's own service-worker.js, and taking them over would break it.
 *
 *   · CORE (below) is stored on install: every page plus the libraries needed to
 *     draw them (React, fonts, CodeMirror, marked, MathJax, mermaid, pdf.js).
 *   · everything else on this site that a page loads — the notebooks in files/,
 *     Pyodide and its local wheels from _lib/pyodide (numpy, pandas, scipy,
 *     scikit-learn, matplotlib …), font files, MathJax extensions — is stored the
 *     first time it is used (stale-while-revalidate).
 *   · other sites (the Pyodide CDN for packages not in _lib/pyodide, PyPI for
 *     seaborn / imbalanced-learn) go straight to the network and are never stored here.
 *   · a page that was never opened shows a small "not saved yet" card offline.
 *
 * Cache names start with "aistudy-" and only those are ever deleted here.
 * Bump VERSION whenever CORE or this file's logic changes.
 */
var VERSION = "aistudy-v4";
var CORE = [
  "index.html",
  "book/reader.html",
  "book/css/colors.css",
  "book/data/data.js",
  "book/data/study-data.js",
  "book/js/app.jsx",
  "book/js/motifs.js",
  "book/js/lab.js",
  "book/js/reader.js",
  "book/js/sw-register.js",
  "notes/index.html",
  "notes/_touch.css",
  "notes/geron/index.html",
  "notes/geron/reader.html",
  "notes/geron/vendor/pdfjs/pdf.min.js",
  "notes/geron/vendor/pdfjs/pdf.worker.min.js",
  "files/data/tennis.csv",
  "files/data/tennis-time.csv.txt",
  "notes/classical-ml/geron-ch01-ml-landscape.html",
  "notes/classical-ml/geron-ch02-end-to-end-project.html",
  "notes/classical-ml/geron-ch03-classification.html",
  "notes/classical-ml/geron-ch04-training-models.html",
  "notes/classical-ml/geron-ch05-svm.html",
  "notes/classical-ml/geron-ch06-decision-trees.html",
  "notes/classical-ml/geron-ch07-ensembles.html",
  "notes/classical-ml/geron-ch08-dimensionality-reduction.html",
  "notes/classical-ml/geron-ch09-unsupervised.html",
  "notes/classical-ml/gradient-descent.html",
  "notes/foundations/ch1-ml-landscape.html",
  "notes/projects/ch2-end-to-end-project.html",
  "../../_lib/dc/react.production.min.js",
  "../../_lib/dc/react-dom.production.min.js",
  "../../_lib/react/babel.min.js",
  "../../_lib/fonts/gf-1e9c8d7d.css",
  "../../_lib/codemirror/codemirror.min.css",
  "../../_lib/codemirror/codemirror.min.js",
  "../../_lib/codemirror/mode/python/python.min.js",
  "../../_lib/marked.min.js",
  "../../_lib/mathjax/tex-mml-chtml.js",
  "../../_lib/mermaid/mermaid.min.js",
  "../../_lib/progress-backup.js",
  "../../_lib/quiz/quiz.js",
  "../../_lib/autoscroll.js",
  "../../extras.js"
];

function refill(cache) {
  /* add only what is missing: the three registrations share one cache */
  return Promise.all(CORE.map(function (u) {
    var req = new Request(u, { cache: "reload" });
    return cache.match(req).then(function (hit) {
      return hit || cache.add(req).catch(function () {});
    });
  }));
}

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(refill).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k.indexOf("aistudy-") === 0 && k !== VERSION ? caches.delete(k) : null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "skip-waiting") self.skipWaiting();
  else if (e.data === "refill") e.waitUntil(caches.open(VERSION).then(refill));
});

var OFFLINE_CARD =
  '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Offline</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;' +
  'background:#0b0f1a;color:#e6e9f2;font-family:Georgia,serif;padding:28px;text-align:center}' +
  'p{font-family:monospace;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#8a93a8}' +
  'h1{font-size:26px;font-weight:600;margin:6px 0 10px}em{color:#b6bdcc}a{color:#5fd0e6}</style>' +
  '<div><p>Commonplace · Classical ML</p><h1>This page isn\'t saved for offline yet</h1>' +
  '<em>Open it once while online and it will be here next time.</em>' +
  '<p style="margin-top:22px"><a href="javascript:history.back()">‹ Back</a></p></div>';

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;          /* CDNs: network only */

  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(req).then(function (hit) {
        var live = fetch(req).then(function (res) {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        }).catch(function () { return null; });

        if (hit) { e.waitUntil(live); return hit; }
        return live.then(function (res) {
          if (res) return res;
          /* reader.html?nb=… : any saved copy of the page will do, the query picks the notebook */
          return cache.match(req, { ignoreSearch: true }).then(function (any) {
            if (any) return any;
            if (req.mode === "navigate")
              return new Response(OFFLINE_CARD, { headers: { "Content-Type": "text/html; charset=utf-8" } });
            return new Response("", { status: 504, statusText: "Offline" });
          });
        });
      });
    })
  );
});
