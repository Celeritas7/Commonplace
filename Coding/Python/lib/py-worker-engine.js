/* py-worker-engine.js — Commonplace · Python. Plugs a Web Worker into the
 * notebook player (lib/HOOKS.md §1):  NotebookPlayer.engine = { load, run, stop }.
 * Load it right after the player and before mount():
 *   <script src="../lib/notebook-player.js"></script>
 *   <script src="../lib/py-worker-engine.js"></script>
 *
 * Python runs in lib/py-worker.js, so ■ Stop can terminate it and start a fresh
 * session. input() needs a SharedArrayBuffer, which needs the page to be
 * cross-origin isolated: sw.js adds COOP/COEP to the notebook pages, so it works
 * from the second visit on (the first one, before the service worker controls
 * the page, raises a "reload once" error for input() only).
 * Without Worker support the player keeps its built-in in-page engine.
 */
(function (root) {
  "use strict";
  var P = root.NotebookPlayer;
  if (!P || typeof root.Worker !== "function") return;

  var me = document.currentScript && document.currentScript.src;
  if (!me) return;
  var WORKER = me.replace(/[?#].*$/, "").replace(/py-worker-engine\.js$/, "py-worker.js");
  /* Coding/Python/lib/ → repo root _lib/pyodide/ */
  var INDEX = new URL("../../../_lib/pyodide/", WORKER).href;
  var SEEN = "cp-py-pyodide-seen";
  var SAB_BYTES = 8 + 65536;

  var w = null, ready = null, sab = null, ctl = null, data = null;
  var nextId = 1, pending = null;   // { id, n, io, resolve, reject }
  var stopping = false;

  function seen() { try { return localStorage.getItem(SEEN) === "1"; } catch (e) { return false; } }
  function canShare() { return !!root.crossOriginIsolated && typeof root.SharedArrayBuffer === "function"; }

  function answer(text) {
    if (!ctl) return;
    var bytes = new TextEncoder().encode(String(text == null ? "" : text));
    if (bytes.length > data.length) bytes = bytes.subarray(0, data.length);
    data.set(bytes);
    Atomics.store(ctl, 1, bytes.length);
    Atomics.store(ctl, 0, 1);
    Atomics.notify(ctl, 0);
  }

  /* start a worker and resolve once its Python session is ready */
  function start(report, measure) {
    if (canShare()) { sab = new SharedArrayBuffer(SAB_BYTES); ctl = new Int32Array(sab, 0, 2); data = new Uint8Array(sab, 8); }
    else { sab = ctl = data = null; }
    var me_ = w = new Worker(WORKER);
    return new Promise(function (resolve, reject) {
      var up = false;
      me_.onmessage = function (e) {
        var m = e.data || {};
        if (me_ !== w) return;
        if (m.t === "progress") { if (report) report("downloading", { loaded: m.loaded, total: m.total }); }
        else if (m.t === "starting") { if (report) report("starting"); }
        else if (m.t === "ready") { up = true; resolve(); }
        else if (m.t === "loadfail") { var x = new Error(m.message); x.userMessage = root.navigator.onLine === false ? null : "Python did not load (" + m.message + "). Check the connection, then retry."; reject(x); }
        else onRunMessage(m);
      };
      me_.onerror = function (ev) {
        if (me_ !== w) return;
        if (ev && ev.preventDefault) ev.preventDefault();
        if (!up) { reject(new Error(ev && ev.message || "The Python worker failed to start")); return; }
        crashed();
      };
      me_.postMessage({ t: "init", indexURL: INDEX, measure: !!measure, sab: sab });
    });
  }

  function onRunMessage(m) {
    var r = pending;
    if (!r || m.id !== r.id) return;
    if (m.t === "out") r.io.out(m.s);
    else if (m.t === "err") r.io.err(m.s);
    else if (m.t === "input") {
      Promise.resolve(r.io.input(m.prompt)).then(answer, function () { answer(""); });
    } else if (m.t === "done") {
      pending = null;
      r.resolve({ repr: m.repr == null ? undefined : m.repr, figures: m.figures || [] });
    } else if (m.t === "error") {
      pending = null;
      if (m.fatal) { crashed(r.n); return; }   // the player aborts the cell via sessionRestarted
      var x = new Error("python"); x.traceback = m.traceback; r.reject(x);
    }
  }

  /* the worker died or Pyodide hit a fatal error: fresh session, then tell the player */
  function crashed(n) {
    if (stopping) return;
    var cell = n != null ? n : (pending ? pending.n : 0);
    pending = null;
    try { w.terminate(); } catch (e) {}
    ready = start(null, false);
    ready.then(function () { P.sessionRestarted({ cell: cell, reason: "crashed" }); }, function () {});
  }

  P.engine = {
    name: "worker",
    load: function (report) {
      if (!ready) ready = start(report, !seen());
      ready = ready.catch(function (e) { ready = null; try { w.terminate(); } catch (x) {} throw e; });
      return ready;
    },
    run: function (n, code, io) {
      return ready.then(function () {
        return new Promise(function (resolve, reject) {
          var id = nextId++;
          pending = { id: id, n: n, io: io, resolve: resolve, reject: reject };
          w.postMessage({ t: "run", id: id, code: code });
        });
      });
    },
    stop: function () {
      stopping = true;
      /* the stopped run is left unsettled: the player aborts it and marks the cell
         "Stopped after Ns" once the fresh session is ready (HOOKS.md §3) */
      pending = null;
      try { w.terminate(); } catch (e) {}
      ready = start(null, false);
      return ready.then(function () { stopping = false; }, function (e) { stopping = false; ready = null; throw e; });
    }
  };
})(window);
