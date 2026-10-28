/* py-worker.js — Commonplace · Python. Pyodide in a Web Worker, driven by
 * lib/py-worker-engine.js (the page side). One worker = one Python session;
 * Stop terminates the worker, so a runaway loop can always be killed.
 *
 * Messages in:   {t:"init", indexURL, measure, sab}   {t:"run", id, code}
 * Messages out:  {t:"progress", loaded, total}  {t:"starting"}  {t:"ready"}  {t:"loadfail", message}
 *                {t:"out"|"err", id, s}  {t:"input", id, prompt}
 *                {t:"done", id, repr, figures}  {t:"error", id, traceback, fatal}
 *
 * input(): the page answers through a SharedArrayBuffer — ctl[0] is the flag the
 * worker waits on, ctl[1] the answer's byte length, the bytes follow at offset 8.
 * Without one (page not cross-origin isolated yet) input() raises a clear error.
 */
"use strict";

var py = null, ctl = null, buf = null, runId = 0;

var SHIM =
  "import builtins, os, sys\n" +
  "os.environ['MPLBACKEND']='AGG'\n" +
  "def __input(prompt=''):\n" +
  "    if not __nbw_can_input:\n" +
  "        raise RuntimeError('input() needs this page to be reloaded once (the first visit sets it up). Reload, then run the cell again.')\n" +
  "    return str(__nbw_input(str(prompt)))\n" +
  "builtins.input=__input\n";
/* same capture as FIGCODE in notebook-player.js's built-in engine */
var FIGCODE =
  "def __nbx_capture_figs():\n" +
  "    import sys\n" +
  "    if 'matplotlib' not in sys.modules: return []\n" +
  "    import matplotlib.pyplot as plt, io, base64\n" +
  "    out=[]\n" +
  "    for n in plt.get_fignums():\n" +
  "        f=plt.figure(n); b=io.BytesIO(); f.savefig(b,format='png',bbox_inches='tight')\n" +
  "        out.append(base64.b64encode(b.getvalue()).decode())\n" +
  "    plt.close('all'); return out\n" +
  "__nbx_capture_figs()\n";

/* the core files loadPyodide fetches; sizes are the fallback when a response has no Content-Length */
var CORE = [["pyodide.asm.js", 1229099], ["pyodide.asm.wasm", 10088051], ["python_stdlib.zip", 2341872], ["pyodide-lock.json", 113800]];

/* first run only: fetch the core files ourselves to report bytes; loadPyodide then
   gets them from the service-worker / HTTP cache */
function measure(base) {
  var total = 0, loaded = 0;
  CORE.forEach(function (f) { total += f[1]; });
  function tick() { postMessage({ t: "progress", loaded: loaded, total: total }); }
  tick();
  return Promise.all(CORE.map(function (f) {
    return fetch(base + f[0]).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + f[0]);
      var len = +r.headers.get("Content-Length");
      if (len && len !== f[1]) { total += len - f[1]; }
      if (!r.body || !r.body.getReader) return r.arrayBuffer().then(function (b) { loaded += b.byteLength; tick(); });
      var rd = r.body.getReader();
      return (function pump() {
        return rd.read().then(function (x) {
          if (x.done) return;
          loaded += x.value.byteLength; tick();
          return pump();
        });
      })();
    });
  }));
}

function ask(prompt) {
  Atomics.store(ctl, 0, 0);
  postMessage({ t: "input", id: runId, prompt: prompt });
  Atomics.wait(ctl, 0, 0);
  var n = ctl[1];
  return new TextDecoder().decode(buf.slice(0, n));
}

function init(m) {
  if (m.sab) { ctl = new Int32Array(m.sab, 0, 2); buf = new Uint8Array(m.sab, 8); }
  (m.measure ? measure(m.indexURL) : Promise.resolve()).then(function () {
    postMessage({ t: "starting" });
    importScripts(m.indexURL + "pyodide.js");
    return loadPyodide({ indexURL: m.indexURL });
  }).then(function (p) {
    py = p;
    p.globals.set("__nbw_can_input", !!ctl);
    p.globals.set("__nbw_input", ask);
    if (ctl) p.setStdin({ stdin: function () { return ask(""); } });
    return p.runPythonAsync(SHIM);
  }).then(function () {
    postMessage({ t: "ready" });
  }, function (e) {
    postMessage({ t: "loadfail", message: e && e.message ? e.message : String(e) });
  });
}

function run(m) {
  var id = runId = m.id;
  py.setStdout({ batched: function (s) { postMessage({ t: "out", id: id, s: s }); } });
  py.setStderr({ batched: function (s) { postMessage({ t: "err", id: id, s: s }); } });
  py.loadPackagesFromImports(m.code).catch(function () {}).then(function () {
    return py.runPythonAsync(m.code);
  }).then(function (res) {
    var repr = null;
    if (res !== undefined && res !== null) {
      try { var b = py.pyimport("builtins"); repr = b.repr(res); b.destroy(); } catch (e) { repr = String(res); }
      if (typeof res.destroy === "function") { try { res.destroy(); } catch (e) {} }
    }
    return py.runPythonAsync(FIGCODE).then(function (fp) {
      var figs = fp.toJs(); fp.destroy();
      postMessage({ t: "done", id: id, repr: repr, figures: figs });
    });
  }).catch(function (e) {
    var tb = e && e.message ? e.message : String(e);
    postMessage({ t: "error", id: id, traceback: tb, fatal: /fatal error/i.test(tb) });
  });
}

self.onmessage = function (e) {
  var m = e.data || {};
  if (m.t === "init") init(m);
  else if (m.t === "run") run(m);
};
