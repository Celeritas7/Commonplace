/* sql-engine-boot.js — resilient sql.js loader.
   Drop-in replacement for  <script src="…/_lib/sqljs/sql-wasm.js"></script>
   Usage: <script src="<path>/lib/sql-engine-boot.js" data-local="<path to>/_lib/sqljs/"></script>

   Why: if _lib/sqljs/sql-wasm.js 404s (wrong depth, not deployed), initSqlJs is
   undefined, the page's boot call throws synchronously, no .catch ever runs, and
   the LED sits on "booting engine…" forever. This shim defines initSqlJs up front,
   loads the real engine from the local copy or the CDN, and rejects loudly if both fail. */
(function () {
  var me = document.currentScript;
  var LOCAL = (me && me.getAttribute("data-local")) || "";
  var CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/";
  var realInit = null, base = "", pending = null;

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.async = false;
      s.onload = res;
      s.onerror = function () { rej(new Error("could not load " + src)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function capture(b) {
    base = b;
    realInit = window.initSqlJs; // sql-wasm.js has just overwritten the shim
    window.initSqlJs = shim;     // put the shim back for later callers
  }

  function ensure() {
    if (pending) return pending;
    var chain = LOCAL
      ? load(LOCAL + "sql-wasm.js").then(function () { capture(LOCAL); })
          .catch(function () { return load(CDN + "sql-wasm.js").then(function () { capture(CDN); }); })
      : load(CDN + "sql-wasm.js").then(function () { capture(CDN); });
    pending = chain.then(function () {
      if (typeof realInit !== "function") throw new Error("sql.js loaded but initSqlJs is missing");
      return realInit;
    });
    return pending;
  }

  function shim(cfg) {
    return ensure().then(function (init) {
      var o = {}, k;
      for (k in (cfg || {})) o[k] = cfg[k];
      o.locateFile = function (f) { return base + f; }; // always match the base that actually loaded
      return init(o);
    });
  }

  window.initSqlJs = shim;
  window.SQLJS_BASE = function () { return base; };
  ensure().catch(function (e) { console.error("[sql-engine-boot]", e.message); });
})();
