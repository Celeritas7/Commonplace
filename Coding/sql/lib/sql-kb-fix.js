/* sql-kb-fix.js — v2 — mobile keyboard behaviour for the SQL app.
   Replace sql/lib/sql-kb-fix.js with this file. Tag stays as-is, loaded LAST:
     <script src="../lib/sql-kb-fix.js"></script>

   Fix 1 — the soft keyboard opens ONLY on a real finger/mouse tap inside a query
           box. Key-palette / schema / example taps never summon it, but they do
           keep it open (and the caret alive) if you were already typing.
   Fix 2 — no auto-capitalised first letter, no autocorrect/autocomplete/spellcheck
           in any SQL textarea, including ones created later.

   v2 changes (why v1 still popped the keyboard):
   - v1 treated ANY focusin as "user opened the keyboard", so any focus route that
     bypassed the patched focus() (setSelectionRange side-effects on WebKit, .select(),
     native activation, autofocus) flipped the gate open. The gate is now driven only
     by a genuine pointer tap, and unauthorised focus is actively reverted.
   - inputmode="none" while the gate is shut, so Android/Chromium cannot even flash
     the keyboard; flipped to "text" on the tap, before focus lands.
*/
(function () {
  if (window.__sqlKbFix) return; window.__sqlKbFix = true;

  var GRACE = 450;   // ms after leaving the editor that palette taps still count as "typing"
  var TAP_MS = 1200; // ms a pointer tap stays valid as the reason for a focus

  /* ---------- Fix 2 ---------- */
  function tame(ta) {
    if (!ta || ta.__tamed) return; ta.__tamed = 1;
    ta.setAttribute("autocapitalize", "off");
    ta.setAttribute("autocorrect", "off");
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("spellcheck", "false");
    ta.setAttribute("enterkeyhint", "enter");
    shut(ta);
  }
  function tameAll(root) {
    var r = root || document;
    if (!r.querySelectorAll) return;
    var list = r.querySelectorAll("textarea");
    for (var i = 0; i < list.length; i++) tame(list[i]);
  }

  /* ---------- gate ---------- */
  var open = false;      // is the keyboard legitimately up?
  var closeTimer = 0;    // grace timer after focusout
  var tapAt = 0;         // when the last genuine tap inside a textarea happened
  var tapEl = null;      // which textarea it was on

  function shut(ta) { try { ta.setAttribute("inputmode", "none"); } catch (e) {} }
  function unshut(ta) { try { ta.setAttribute("inputmode", "text"); } catch (e) {} }

  function allowed(ta) {
    if (open) return true;                                   // already typing / inside grace
    return tapEl === ta && (Date.now() - tapAt) < TAP_MS;    // a real tap asked for this
  }

  function noteTap(e) {
    var t = e.target, ta = t && t.closest ? t.closest("textarea") : null;
    if (!ta) return;
    clearTimeout(closeTimer);
    tapAt = Date.now(); tapEl = ta; open = true;
    unshut(ta); // must happen before focus lands, or Chromium keeps the keyboard down
  }
  document.addEventListener("pointerdown", noteTap, true);
  document.addEventListener("touchstart", noteTap, true);
  document.addEventListener("mousedown", noteTap, true);

  // Enforcement: a focus we did not authorise is reverted immediately.
  document.addEventListener("focusin", function (e) {
    var ta = e.target;
    if (!ta || ta.tagName !== "TEXTAREA") return;
    if (allowed(ta)) { clearTimeout(closeTimer); open = true; unshut(ta); return; }
    shut(ta);
    var s = ta.selectionStart, en = ta.selectionEnd;   // keep the caret the caller set
    try { ta.blur(); } catch (err) {}
    try { ta.setSelectionRange(s, en); } catch (err) {}
  }, true);

  document.addEventListener("focusout", function (e) {
    var ta = e.target;
    if (!ta || ta.tagName !== "TEXTAREA") return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () { open = false; tapEl = null; shut(ta); }, GRACE);
  }, true);

  // Programmatic focus() is honoured only while the gate is open / a tap authorised it.
  var proto = HTMLTextAreaElement.prototype;
  var nativeFocus = proto.focus;
  proto.focus = function (opts) {
    if (allowed(this) || document.activeElement === this) return nativeFocus.call(this, opts);
    // keyboard stays down; the caret the caller set with setSelectionRange is preserved
  };
  // .select() is a focus route too
  var nativeSelect = proto.select;
  if (nativeSelect) {
    proto.select = function () {
      if (allowed(this) || document.activeElement === this) return nativeSelect.call(this);
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
