/* sw.js — Commonplace · Python. Lives at the Python/ root so its scope covers
 * every page. Deliberately conservative:
 *   · same-origin GETs      → stale-while-revalidate (instant, self-healing)
 *   · navigations offline   → last cached copy, else the offline card
 *   · cross-origin (Pyodide CDN, fonts) → straight to network, never cached
 *     (Pyodide is ~10 MB; caching it here would blow the storage budget and
 *      is already handled by the browser's own HTTP cache)
 *   · notebook pages + the Python worker → COOP/COEP added on the way out, so the
 *     page is cross-origin isolated and input() can wait on a SharedArrayBuffer
 *     (lib/py-worker-engine.js). Headers are added to the response only, never cached.
 * Bump VERSION to force every client to refetch.
 */
var VERSION = "cp-py-v40";
var CORE = [
  "./",
  "index.html",
  "shelf.html",
  "pwa/manifest.json",
  "practice/set.html",
  "practice/data/index.js",
  "css/shelf.css",
  "lessons/Py_Lesson_0_1.html",
  "lessons/Py_Lesson_0_2.html",
  "lessons/Py_Lesson_0_3.html",
  "lessons/Py_Lesson_0_4.html",
  "lessons/Py_Lesson_1_1.html",
  "lessons/Py_Lesson_1_2.html",
  "lessons/Py_Lesson_1_3.html",
  "lessons/Py_Lesson_1_4.html",
  "lessons/Py_Lesson_1_5.html",
  "lessons/Py_Lesson_1_6.html",
  "lessons/Py_Lesson_1_7.html",
  "lessons/Py_Lesson_2_1.html",
  "lessons/Py_Lesson_2_2.html",
  "lessons/Py_Lesson_2_3.html",
  "lessons/Py_Lesson_2_4.html",
  "lessons/Py_Lesson_2_5.html",
  "lessons/Py_Lesson_3_1.html",
  "lessons/Py_Lesson_3_2.html",
  "lessons/Py_Lesson_3_3.html",
  "lessons/Py_Lesson_3_4.html",
  "lessons/Py_Lesson_3_5.html",
  "lessons/Py_Lesson_3_6.html",
  "lessons/Py_Lesson_4_1.html",
  "lessons/Py_Lesson_4_2.html",
  "lessons/Py_Lesson_4_3.html",
  "lessons/Py_Lesson_4_4.html",
  "lessons/Py_Lesson_4_5.html",
  "lessons/Py_Lesson_4_6.html",
  "lessons/Py_Lesson_5_1.html",
  "lessons/Py_Lesson_5_2.html",
  "lessons/Py_Lesson_5_3.html",
  "lessons/Py_Lesson_5_4.html",
  "fundamentals/02_for_loops.html",
  "fundamentals/03_while_loops.html",
  "fundamentals/04_if_else.html",
  "fundamentals/05_lists_tuples_dicts.html",
  "fundamentals/06_strings.html",
  "fundamentals/07_exceptions.html",
  "fundamentals/08_functions.html",
  "libraries/matplotlib.html",
  "libraries/numpy.html",
  "libraries/pandas.html",
  "libraries/pandas_practice.html",
  "practice/golden_problem_template.html",
  "practice/random_module_practice.html",
  "practice/random_module_practice_2.html",
  "practice/section_3_14.html",
  "practice/self_practice_beginner.html",
  "practice/self_practice_beginner_from_aistudy.html",
  "practice/self_practice_intermediate.html",
  "practice/self_practice_intermediate_structured.html",
  "lib/compose-blocks.js",
  "lib/lesson-drills.css",
  "lib/lesson-drills.js",
  "lib/lesson-reader.js",
  "lib/notebook-player.css",
  "lib/notebook-player.js",
  "lib/py-worker-engine.js",
  "lib/py-worker.js",
  "lib/practice-engine.js",
  "lib/practice-set.css",
  "lib/practice-set.js",
  "lib/practice-sets.js",
  "lib/py-kb-fix.js",
  "lib/py-keys.js",
  "lib/python-practice-data.js",
  "lib/python-practice-section.js",
  "lib/tokens.css",
  "lib/theme.js",
  "js/today-card.js",
  "js/today.js",
  "lib/drills/0_2.js",
  "lib/drills/0_3.js",
  "lib/drills/0_4.js",
  "js/learn-shelf.js",
  "js/practice-shelf.js",
  "js/progress-adapter.js",
  "js/shelf-data.js",
  "js/shelf-page.js",
  "lib/my-scripts-data.js?v=1",
  "lib/my-scripts.js?v=3",
  "lib/sw-register.js?v=1",
  "../../reading-sync.js",
  "../../_lib/progress-backup.js",
  "../../_lib/quiz/quiz.js",
  "../../extras.js",
  "lessons/quiz/Py_Lesson_0_1.js",
  "lessons/quiz/Py_Lesson_0_2.js",
  "lessons/quiz/Py_Lesson_0_3.js",
  "lessons/quiz/Py_Lesson_0_4.js",
  "lessons/quiz/Py_Lesson_1_1.js",
  "lessons/quiz/Py_Lesson_1_2.js",
  "lessons/quiz/Py_Lesson_1_3.js",
  "lessons/quiz/Py_Lesson_1_4.js",
  "lessons/quiz/Py_Lesson_1_5.js",
  "lessons/quiz/Py_Lesson_1_6.js",
  "lessons/quiz/Py_Lesson_1_7.js",
  "lessons/quiz/Py_Lesson_2_1.js",
  "lessons/quiz/Py_Lesson_2_2.js",
  "lessons/quiz/Py_Lesson_2_3.js",
  "lessons/quiz/Py_Lesson_2_4.js",
  "lessons/quiz/Py_Lesson_2_5.js",
  "../../_lib/supabase.js",
  "../../_lib/marked.min.js",
  "../../_lib/fonts/gf-135340b0.css",
  "../../_lib/codemirror/codemirror.min.js",
  "../../_lib/codemirror/codemirror.min.css",
  "../../_lib/codemirror/mode/python/python.min.js",
  "../../_lib/codemirror/addon/edit/matchbrackets.min.js",
  "../../_lib/codemirror/addon/edit/closebrackets.min.js"
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

/* the 19 notebook pages (the fundamentals/libraries/practice entries above, minus the
   card view practice/set.html, which runs Python in the page) and the worker script */
var ISOLATE = {};
CORE.forEach(function (u) {
  if (/^(fundamentals|libraries|practice)\/[^/]+\.html$/.test(u) && u !== "practice/set.html")
    ISOLATE[new URL(u, self.location.href).pathname] = 1;
});
ISOLATE[new URL("lib/py-worker.js", self.location.href).pathname] = 1;
function isolate(req, res) {
  if (!res || !ISOLATE[new URL(req.url).pathname]) return res;
  if (res.type !== "basic" && res.type !== "default") return res;
  var h = new Headers(res.headers);
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Embedder-Policy", "require-corp");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

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

  /* my_scripts/ holds files I edit by hand (notes, .py) — network first so a
     fresh save shows up at once; fall back to the cached copy offline. */
  if (url.pathname.indexOf("/my_scripts/") !== -1) {
    e.respondWith(
      caches.open(VERSION).then(function (cache) {
        return fetch(req, { cache: "no-store" }).then(function (res) {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        }).catch(function () {
          return cache.match(req, { ignoreSearch: true }).then(function (hit) { return hit || Response.error(); });
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: false }).then(function (hit) {
        var live = fetch(req).then(function (res) {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        }).catch(function () {
          return hit || cache.match(req, { ignoreSearch: true }) || null;
        });

        if (hit) { e.waitUntil(live.catch(function () {})); return isolate(req, hit); }

        return live.then(function (res) {
          if (res) return isolate(req, res);
          if (req.mode === "navigate")
            return new Response(OFFLINE_CARD, { headers: { "Content-Type": "text/html; charset=utf-8" } });
          return new Response("", { status: 504, statusText: "Offline" });
        });
      });
    })
  );
});
