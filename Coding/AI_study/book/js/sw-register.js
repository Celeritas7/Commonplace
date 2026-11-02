/* sw-register.js — Classical ML · offline support.
 *
 * Registers study-sw.js (in the AI_study root) for the parts of the section that
 * are ours: the landing page, book/ (the reader) and notes/. It is registered
 * three times with three narrow scopes instead of once for the whole folder,
 * because JupyterLite keeps its own service-worker.js on the AI_study/ scope for
 * lab/, notebooks/, tree/ and repl/. The browser picks the most specific scope,
 * so the two never fight over a page.
 *
 * Include it from any page (the path to AI_study is worked out from this
 * script's own URL):
 *   <script src="book/js/sw-register.js"></script>            (landing page)
 *   <script src="js/sw-register.js"></script>                 (book/reader.html)
 *   <script src="../../book/js/sw-register.js"></script>      (notes/<tag>/…)
 */
(function () {
  "use strict";
  if (window.__AI_SW__ || !("serviceWorker" in navigator) || location.protocol.indexOf("http") !== 0) return;
  window.__AI_SW__ = 1;

  var me = document.currentScript && document.currentScript.src;
  if (!me) return;
  var root = me.replace(/[?#].*$/, "").replace(/book\/js\/sw-register\.js$/, "");   /* …/AI_study/ */
  if (root === me) return;
  var SW = root + "study-sw.js";
  var SCOPES = [root + "index.html", root + "book/", root + "notes/"];

  window.addEventListener("load", function () {
    SCOPES.forEach(function (scope) {
      navigator.serviceWorker.register(SW, { scope: scope }).then(function (reg) {
        if (reg.waiting) reg.waiting.postMessage("skip-waiting");
        reg.addEventListener("updatefound", function () {
          var w = reg.installing;
          if (w) w.addEventListener("statechange", function () {
            if (w.state === "installed" && navigator.serviceWorker.controller) w.postMessage("skip-waiting");
          });
        });
      }).catch(function (e) { console.warn("study-sw: " + e.message); });
    });
    /* Other sections' service workers delete every cache but their own when they
       update, so ask ours to put back anything from its core list that went missing. */
    var c = navigator.serviceWorker.controller;
    if (c && c.scriptURL === SW) c.postMessage("refill");
  });
})();
