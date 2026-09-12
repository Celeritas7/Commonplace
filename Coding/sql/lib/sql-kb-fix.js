/* sql-kb-fix.js — mobile keyboard behaviour for the SQL app.
   Drop-in: copy to sql/lib/ and add ONE tag to every page that has a SQL editor,
   AFTER the other scripts:   <script src="lib/sql-kb-fix.js"></script>
   (from Practice/ or The Modules/ use  ../lib/sql-kb-fix.js)

   Fix 1 — the on-screen keyboard now opens only when you tap inside a query box.
           Key-palette / schema / example taps no longer summon it, but they DO keep
           it open (and the caret alive) if you were already typing.
   Fix 2 — no auto-capitalised first letters, no autocorrect, no autocomplete
           in any SQL textarea, including ones created later. */
(function () {
  if (window.__sqlKbFix) return; window.__sqlKbFix = true;

  /* ---------- Fix 2: kill autocapitalize/autocorrect on every SQL textarea ---------- */
  function tame(ta) {
    if (!ta || ta.__tamed) return; ta.__tamed = 1;
    ta.setAttribute("autocapitalize", "off");
    ta.setAttribute("autocorrect", "off");
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("spellcheck", "false");
    ta.setAttribute("enterkeyhint", "enter");
  }
  function tameAll(root) {
    (root || document).querySelectorAll && (root || document).querySelectorAll("textarea").forEach(tame);
  }
  document.addEventListener("DOMContentLoaded", function () { tameAll(document); });
  tameAll(document);
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var add = muts[i].addedNodes;
      for (var j = 0; j < add.length; j++) {
        var n = add[j];
        if (n.nodeType !== 1) continue;
        if (n.tagName === "TEXTAREA") tame(n); else tameAll(n);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- Fix 1: keyboard only on a real tap inside the editor ---------- */
  var open = false, timer = 0;
  var proto = HTMLTextAreaElement.prototype;
  var nativeFocus = proto.focus;

  // a genuine tap inside a textarea is the only thing that may summon the keyboard
  document.addEventListener("pointerdown", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("textarea")) { clearTimeout(timer); open = true; }
  }, true);
  document.addEventListener("touchstart", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("textarea")) { clearTimeout(timer); open = true; }
  }, true);
  document.addEventListener("focusin", function (e) {
    if (e.target && e.target.tagName === "TEXTAREA") { clearTimeout(timer); open = true; }
  }, true);
  // leaving the editor closes the window, but with a grace period so that a palette
  // tap (blur -> click -> focus) still counts as "still typing"
  document.addEventListener("focusout", function (e) {
    if (e.target && e.target.tagName === "TEXTAREA") {
      clearTimeout(timer);
      timer = setTimeout(function () { open = false; }, 450);
    }
  }, true);

  // programmatic focus() on a textarea is honoured only while that window is open
  proto.focus = function (opts) {
    if (open || document.activeElement === this) return nativeFocus.call(this, opts);
    // keyboard stays down; caret position set by the caller is preserved
  };
})();
