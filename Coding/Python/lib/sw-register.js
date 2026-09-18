/* sw-register.js — registers the root service worker from any page depth and
 * shows an "Install app" chip when the browser offers one.
 * Load it last:  <script src="lib/sw-register.js?v=1"></script>
 *                <script src="../lib/sw-register.js?v=1"></script>
 * The app root is derived from this script's own URL, so no per-page paths.
 */
(function () {
  "use strict";
  if (window.__CP_SW__) return;
  window.__CP_SW__ = 1;

  var me = document.currentScript && document.currentScript.src;
  if (!me) {
    var all = document.getElementsByTagName("script");
    me = all.length ? all[all.length - 1].src : "";
  }
  /* .../Python/lib/sw-register.js  →  .../Python/ */
  var root = me.replace(/[?#].*$/, "").replace(/\/lib\/sw-register\.js$/, "/");
  if (root === me) root = new URL(".", me).href;

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(root + "sw.js", { scope: root })
        .then(function (reg) {
          /* a waiting worker means a newer build is ready — take it silently */
          if (reg.waiting) reg.waiting.postMessage("skip-waiting");
          reg.addEventListener("updatefound", function () {
            var w = reg.installing;
            if (!w) return;
            w.addEventListener("statechange", function () {
              if (w.state === "installed" && navigator.serviceWorker.controller) w.postMessage("skip-waiting");
            });
          });
        })
        .catch(function (e) { console.warn("sw: " + e.message); });
    });
  }

  /* ---- install chip ---- */
  var prompt_ = null;
  function chip() {
    if (document.getElementById("cp-install")) return;
    var b = document.createElement("button");
    b.id = "cp-install";
    b.type = "button";
    b.textContent = "↓ Install app";
    b.setAttribute("style",
      "position:fixed;right:14px;bottom:14px;z-index:60;min-height:44px;padding:11px 16px;" +
      "border-radius:9px;border:1px solid #234f3b;background:#234f3b;color:#f2f7f2;" +
      'font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:600;letter-spacing:1.2px;' +
      "text-transform:uppercase;cursor:pointer;box-shadow:0 10px 26px -14px rgba(20,40,30,.7)");
    b.addEventListener("click", function () {
      if (!prompt_) return;
      prompt_.prompt();
      prompt_.userChoice && prompt_.userChoice.then(function () {});
      prompt_ = null;
      b.remove();
    });
    document.body.appendChild(b);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    prompt_ = e;
    if (document.body) chip();
    else document.addEventListener("DOMContentLoaded", chip);
  });
  window.addEventListener("appinstalled", function () {
    var b = document.getElementById("cp-install");
    if (b) b.remove();
  });
})();
