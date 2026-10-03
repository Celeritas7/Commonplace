/* sql-kb-fix.js — v3 — mobile keyboard behaviour for the SQL app.
   Replace sql/lib/sql-kb-fix.js with this file, loaded LAST:
     <script src="../lib/sql-kb-fix.js?v=3"></script>

   Rule: the soft keyboard opens ONLY on a real tap inside a query box. Nothing else
   (key-palette chips, schema sheet, examples, Clear, restored code) can open it.

   v3 changes (why v2 still popped the keyboard after palette taps):
   - v2 had a 450 ms "still typing" grace after the editor lost focus. A chip tap blurred
     the editor, then insertKey() called focus() inside that window → keyboard reopened.
     If you had hidden the keyboard (Back / hide gesture) the editor stayed focused, so
     EVERY later chip tap reopened it. The grace window is gone: focus() is honoured only
     for a genuine tap on that textarea in the last 1.2 s.
   - When the user hides the keyboard while the editor keeps focus, the editor is switched
     back to inputmode="none", so value / caret changes from chips can't bring it back.
   Also: no auto-capitalise / autocorrect / autocomplete / spellcheck in any SQL textarea.
*/
(function () {
  if (window.__sqlKbFix) return; window.__sqlKbFix = true;

  var TAP_MS = 1200; // a tap stays valid as the reason for a focus this long

  function shut(ta) { try { ta.setAttribute("inputmode", "none"); } catch (e) {} }
  function unshut(ta) { try { ta.setAttribute("inputmode", "text"); } catch (e) {} }

  function tame(ta) {
    if (!ta || ta.__tamed) return; ta.__tamed = 1;
    ta.setAttribute("autocapitalize", "off");
    ta.setAttribute("autocorrect", "off");
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("spellcheck", "false");
    ta.setAttribute("enterkeyhint", "enter");
    if (document.activeElement !== ta) shut(ta);
  }
  function tameAll(root) {
    var r = root || document;
    if (!r.querySelectorAll) return;
    var list = r.querySelectorAll("textarea");
    for (var i = 0; i < list.length; i++) tame(list[i]);
  }

  var tapAt = 0, tapEl = null;
  function tapped(ta) { return tapEl === ta && (Date.now() - tapAt) < TAP_MS; }

  function noteTap(e) {
    var t = e.target, ta = t && t.closest ? t.closest("textarea") : null;
    if (!ta) return;
    tapAt = Date.now(); tapEl = ta;
    unshut(ta); // before focus lands, or Chromium keeps the keyboard down
  }
  document.addEventListener("pointerdown", noteTap, true);
  document.addEventListener("touchstart", noteTap, true);
  document.addEventListener("mousedown", noteTap, true);

  // a focus that no tap asked for is reverted, caret kept
  document.addEventListener("focusin", function (e) {
    var ta = e.target;
    if (!ta || ta.tagName !== "TEXTAREA") return;
    if (tapped(ta)) { unshut(ta); return; }
    shut(ta);
    var s = ta.selectionStart, en = ta.selectionEnd;
    try { ta.blur(); } catch (err) {}
    try { ta.setSelectionRange(s, en); } catch (err) {}
  }, true);

  document.addEventListener("focusout", function (e) {
    var ta = e.target;
    if (ta && ta.tagName === "TEXTAREA") shut(ta);
  }, true);

  // keyboard hidden by the user while the editor keeps focus → lock it down again
  var vv = window.visualViewport, fullH = vv ? vv.height : 0;
  if (vv) vv.addEventListener("resize", function () {
    var ta = document.activeElement;
    if (vv.height > fullH) fullH = vv.height;
    var kbUp = vv.height < fullH - 120;
    if (!kbUp && ta && ta.tagName === "TEXTAREA" && !tapped(ta)) shut(ta);
  });
  window.addEventListener("orientationchange", function () { fullH = 0; setTimeout(function () { if (vv) fullH = vv.height; }, 400); });

  var proto = HTMLTextAreaElement.prototype;
  var nativeFocus = proto.focus;
  proto.focus = function (opts) {
    if (tapped(this)) return nativeFocus.call(this, opts);
    // already focused or not: do nothing — the caret set via setSelectionRange is kept
  };
  var nativeSelect = proto.select;
  if (nativeSelect) {
    proto.select = function () {
      if (tapped(this) || document.activeElement === this) return nativeSelect.call(this);
      try { this.setSelectionRange(0, this.value.length); } catch (e) {}
    };
  }

  tameAll(document);
  document.addEventListener("DOMContentLoaded", function () { tameAll(document); });
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
})();
