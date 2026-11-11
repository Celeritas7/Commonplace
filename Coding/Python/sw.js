/* Python shell cache plus explicit, verified offline packs.
 * Packs include the bundled Python runtime and survive shell version changes.
 * Only listed static assets are downloaded; remote APIs always use the network.
 */
importScripts('offline-assets.js', 'lib/offline-worker.js');
var VERSION = "cp-py-v49";
var CORE = [
  "offline.html",
  "lib/offline-manager.js",
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
  "lib/drills/0_1.js",
  "lib/drills/0_2.js",
  "lib/drills/0_3.js",
  "lib/drills/0_4.js",
  "lib/drills/1_1.js",
  "lib/drills/1_2.js",
  "lib/drills/1_3.js",
  "lib/drills/1_4.js",
  "lib/drills/1_5.js",
  "lib/drills/1_6.js",
  "lib/drills/1_7.js",
  "lib/drills/2_1.js",
  "lib/drills/2_2.js",
  "lib/drills/2_3.js",
  "lib/drills/2_4.js",
  "lib/drills/2_5.js",
  "lib/drills/3_1.js",
  "lib/drills/3_2.js",
  "lib/drills/3_3.js",
  "lib/drills/3_4.js",
  "lib/drills/3_5.js",
  "lib/drills/3_6.js",
  "lib/drills/4_1.js",
  "lib/drills/4_2.js",
  "lib/drills/4_3.js",
  "lib/drills/4_4.js",
  "lib/drills/4_5.js",
  "lib/drills/4_6.js",
  "lib/drills/5_1.js",
  "lib/drills/5_2.js",
  "lib/drills/5_3.js",
  "lib/drills/5_4.js",
  "js/learn-shelf.js",
  "js/practice-shelf.js",
  "js/progress-adapter.js",
  "js/shelf-data.js",
  "js/shelf-page.js",
  "lib/my-scripts-data.js?v=1",
  "lib/my-scripts.js?v=3",
  "lib/sw-register.js?v=1",
  "../../reading-sync.js",
  "../../_lib/gate.js",
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
  "lessons/quiz/Py_Lesson_3_1.js",
  "lessons/quiz/Py_Lesson_3_2.js",
  "lessons/quiz/Py_Lesson_3_3.js",
  "lessons/quiz/Py_Lesson_3_4.js",
  "lessons/quiz/Py_Lesson_3_5.js",
  "lessons/quiz/Py_Lesson_3_6.js",
  "lessons/quiz/Py_Lesson_4_1.js",
  "lessons/quiz/Py_Lesson_4_2.js",
  "lessons/quiz/Py_Lesson_4_3.js",
  "lessons/quiz/Py_Lesson_4_4.js",
  "lessons/quiz/Py_Lesson_4_5.js",
  "lessons/quiz/Py_Lesson_4_6.js",
  "lessons/quiz/Py_Lesson_5_1.js",
  "lessons/quiz/Py_Lesson_5_2.js",
  "lessons/quiz/Py_Lesson_5_3.js",
  "lessons/quiz/Py_Lesson_5_4.js",
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
      // Install only the small setup shell. Large lesson downloads are explicit,
      // so Safari does not wait on hundreds of requests before enabling setup.
      var shell = ['index.html', 'offline.html', 'lib/offline-manager.js?v=48', 'lib/sw-register.js?v=1', 'pwa/manifest.json', '../../_lib/gate.js'];
      return Promise.all(shell.map(async function (u) {
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 15000);
        try {
          var request = new Request(new URL(u, self.location.href), { cache: 'reload', signal: controller.signal });
          var response = await fetch(request);
          if (response.ok) await c.put(request, response);
        } catch (error) { /* Saved packs remain available when a shell refresh fails. */ }
        finally { clearTimeout(timeout); }
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      /* only our own old versions: caches are shared by the whole site, and other
         sections (SQL, AI study, JupyterLite …) keep their offline copies here too */
      return Promise.all(keys.map(function (k) { return k.indexOf("cp-py-") === 0 && k !== VERSION ? caches.delete(k) : null; }));
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
  '<em>Connect and open Study offline in Python to download your lessons.</em>' +
  '<p><a href="' + new URL('offline.html', self.location.href).href + '">Study offline</a></p></div>';

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || url.search.indexOf("nocache") >= 0) return;
  e.respondWith((async function () {
    var saved = await savedPackResponse(req);
    // Python binaries/packages never need a background network request after download.
    if (saved && url.pathname.indexOf('/_lib/pyodide/') !== -1) return saved;
    var cache = await caches.open(VERSION);
    var hit = await cache.match(req);
    var live = fetch(req).then(async function (res) {
      if (res && res.ok && res.type === "basic") await cache.put(req, res.clone());
      return res;
    }).catch(function () { return null; });
    if (url.pathname.indexOf('/my_scripts/') === -1 && (saved || hit)) {
      e.waitUntil(live);
      return isolate(req, saved || hit);
    }
    var res = await live;
    if (res && res.ok) return isolate(req, res);
    var fallback = saved || hit || await cache.match(req, { ignoreSearch: true });
    // Preserve the previous download during an incomplete app update.
    if (!fallback) {
      var asset = requestedAsset(req);
      if (asset) fallback = await (await caches.open(PACK_CACHE)).match(packURL(asset), { ignoreSearch: true });
    }
    if (fallback) return isolate(req, fallback);
    if (res) return res;
    if (req.mode === "navigate") return new Response(OFFLINE_CARD, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    return new Response("", { status: 504, statusText: "Offline" });
  })());
});
