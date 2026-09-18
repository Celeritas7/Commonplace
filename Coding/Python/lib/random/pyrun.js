/* pyrun.js — a tiny shared CPython runner for the stepper cells.
 * Same Pyodide version and CDN fallback list as lib/practice-engine.js, so the
 * browser reuses one download across the whole app.
 *
 *   PyRun.run(src, onStatus) -> Promise<{ out:string, err:boolean }>
 *   PyRun.ready                 true once the interpreter is warm
 *
 * A cell is executed REPL-style: statements run, and if the last line is a bare
 * expression its repr is printed — so `random.random()` shows a value the way
 * the canned example did.
 */
(function () {
  "use strict";
  if (window.PyRun) return;

  var BASES = [
    "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    "https://fastly.jsdelivr.net/pyodide/v0.26.4/full/",
    "https://unpkg.com/pyodide@0.26.4/"
  ];
  var py = null, booting = null;

  var HARNESS =
    "import ast, io, contextlib, traceback\n" +
    "__cell_globals = {}\n" +
    "def __cell(src):\n" +
    "    buf = io.StringIO()\n" +
    "    try:\n" +
    "        tree = ast.parse(src)\n" +
    "    except SyntaxError as e:\n" +
    "        return 'SyntaxError: ' + str(e)\n" +
    "    if not tree.body:\n" +
    "        return ''\n" +
    "    head, last = tree.body[:-1], tree.body[-1]\n" +
    "    g = __cell_globals\n" +
    "    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):\n" +
    "        try:\n" +
    "            if head:\n" +
    "                exec(compile(ast.Module(head, []), '<cell>', 'exec'), g)\n" +
    "            if isinstance(last, ast.Expr):\n" +
    "                v = eval(compile(ast.Expression(last.value), '<cell>', 'eval'), g)\n" +
    "                if v is not None:\n" +
    "                    print(repr(v))\n" +
    "            else:\n" +
    "                exec(compile(ast.Module([last], []), '<cell>', 'exec'), g)\n" +
    "        except Exception:\n" +
    "            tb = traceback.format_exception_only(*__import__('sys').exc_info()[:2])\n" +
    "            print(''.join(tb), end='')\n" +
    "    return buf.getvalue()\n";

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = res;
      s.onerror = function () { rej(new Error("load failed: " + src)); };
      document.head.appendChild(s);
    });
  }
  function waitForGlobal(ms) {
    var t0 = Date.now();
    return new Promise(function (res, rej) {
      (function tick() {
        if (typeof window.loadPyodide === "function") return res();
        if (Date.now() - t0 > ms) return rej(new Error("loadPyodide missing"));
        setTimeout(tick, 60);
      })();
    });
  }

  function boot(onStatus) {
    if (py) return Promise.resolve(py);
    if (booting) return booting;
    booting = (async function () {
      var lastErr = null;
      for (var i = 0; i < BASES.length; i++) {
        var base = BASES[i];
        try {
          if (onStatus) onStatus(i ? "retrying CPython…" : "fetching CPython…");
          if (typeof window.loadPyodide !== "function") {
            await loadScript(base + "pyodide.js");
            await waitForGlobal(9000);
          }
          if (onStatus) onStatus("starting CPython…");
          var p = await window.loadPyodide({ indexURL: base });
          await p.runPythonAsync(HARNESS);
          py = p;
          window.PyRun.ready = true;
          return py;
        } catch (e) {
          lastErr = e;
          try { delete window.loadPyodide; } catch (_) { window.loadPyodide = undefined; }
        }
      }
      booting = null;
      throw lastErr || new Error("Pyodide unavailable");
    })();
    return booting;
  }

  window.PyRun = {
    ready: false,
    warm: function (onStatus) { return boot(onStatus); },
    run: async function (src, onStatus) {
      var p = await boot(onStatus);
      if (onStatus) onStatus("running…");
      p.globals.set("__src", src);
      var out = await p.runPythonAsync("__cell(__src)");
      var text = String(out == null ? "" : out).replace(/\s+$/, "");
      return { out: text, err: /Traceback|Error/.test(text) };
    }
  };
})();
