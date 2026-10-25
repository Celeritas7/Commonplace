/* theme.js — Commonplace · Python. Load it in <head>, before any stylesheet
   paints, so the page never flashes the wrong theme:
     <script src="lib/theme.js"></script>
   Sets <html data-theme="light|dark|system">. tokens.css does the rest.
   DEFAULT stays "light" until every Python page reads only tokens; then flip it
   to "system" so the phone's dark mode is followed automatically. */
(function () {
  var KEY = "cp-py-theme", DEFAULT = "light", ORDER = ["light", "dark", "system"];
  var root = document.documentElement;
  function read() { var t; try { t = localStorage.getItem(KEY); } catch (e) {} return ORDER.indexOf(t) >= 0 ? t : DEFAULT; }
  function isDark(t) { return t === "dark" || (t === "system" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches); }
  function syncMeta() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", isDark(root.getAttribute("data-theme")) ? "#101814" : "#234f3b");
  }
  function apply(t) { root.setAttribute("data-theme", t); syncMeta(); }
  apply(read());
  document.addEventListener("DOMContentLoaded", syncMeta);
  window.addEventListener("storage", function (e) { if (e.key === KEY) apply(read()); });
  if (window.matchMedia) { var mq = matchMedia("(prefers-color-scheme: dark)"); (mq.addEventListener ? mq.addEventListener("change", syncMeta) : mq.addListener(syncMeta)); }
  window.CPTheme = {
    get: function () { return root.getAttribute("data-theme"); },
    isDark: function () { return isDark(root.getAttribute("data-theme")); },
    set: function (t) { if (ORDER.indexOf(t) < 0) return; try { localStorage.setItem(KEY, t); } catch (e) {} apply(t); },
    cycle: function () { var i = ORDER.indexOf(this.get()); this.set(ORDER[(i + 1) % ORDER.length]); return this.get(); }
  };
})();
