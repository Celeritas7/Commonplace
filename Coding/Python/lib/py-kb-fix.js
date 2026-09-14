/* py-kb-fix.js — v2 mobile keyboard gate for the Python app.
   Drop-in: load it LAST on any page (after practice-engine.js / compose-blocks.js).
   Does two things, touch devices only:
     1. The soft keyboard opens ONLY after a genuine finger-tap inside a field.
        Every other focus route (programmatic .focus(), .select(), setSelectionRange
        side-effects, autofocus, palette/keyword chips) is reverted with the caret
        preserved, so inserts still land in the right place.
     2. Kills auto-capitalize / autocorrect / spellcheck on every code field,
        including ones created later (MutationObserver).
   Desktop is untouched. */
(function () {
  "use strict";
  if (window.__PY_KB_FIX__) return;
  window.__PY_KB_FIX__ = 2;

  var FIELDS = 'textarea,input[type="text"],input[type="search"],input:not([type])';
  var coarse = false;
  try {
    coarse = !!(window.matchMedia && window.matchMedia("(hover:none) and (pointer:coarse)").matches);
  } catch (e) {}

  /* ---------- part 2: no auto-capitalize anywhere ---------- */
  function tame(el) {
    if (!el || el.__pykbTamed) return;
    el.__pykbTamed = 1;
    el.setAttribute("autocapitalize", "off");
    el.setAttribute("autocorrect", "off");
    el.setAttribute("spellcheck", "false");
    if (!el.getAttribute("autocomplete")) el.setAttribute("autocomplete", "off");
    if (coarse) arm(el);
  }
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches(FIELDS)) tame(root);
    Array.prototype.forEach.call(root.querySelectorAll(FIELDS), tame);
  }

  /* ---------- part 1: tap-only keyboard gate ---------- */
  /* A field is "armed" (keyboard suppressed) via inputmode=none until a real
     pointerdown lands on it. Disarming happens in pointerdown, which fires
     before focus, so the keyboard opens normally on a genuine tap. */
  var authorized = null;   // the element the user actually tapped
  var authAt = 0;

  function arm(el) {
    if (el === authorized) return;
    if (el.getAttribute("inputmode") !== "none") {
      if (el.dataset.pykbIm == null) el.dataset.pykbIm = el.getAttribute("inputmode") || "";
      el.setAttribute("inputmode", "none");
    }
  }
  function disarm(el) {
    var orig = el.dataset.pykbIm;
    if (orig) el.setAttribute("inputmode", orig);
    else el.removeAttribute("inputmode");
  }
  function isAuth(el) {
    return el === authorized && Date.now() - authAt < 600000;
  }

  if (coarse) {
    /* a real tap on a field authorizes it */
    function tap(e) {
      if (!e.isTrusted) return;
      var el = e.target && e.target.closest ? e.target.closest(FIELDS) : null;
      if (el) {
        if (authorized && authorized !== el) arm(authorized);
        authorized = el;
        authAt = Date.now();
        disarm(el);
      } else if (authorized && !(e.target && e.target.closest && e.target.closest(".pmb-keys,.cb-pal,.nbx-keys,.cc-keys,[data-keypal]"))) {
        /* tapped somewhere that is neither a field nor a key palette → re-arm */
        var prev = authorized;
        authorized = null;
        arm(prev);
      }
    }
    document.addEventListener("pointerdown", tap, true);
    document.addEventListener("touchstart", tap, true);
    document.addEventListener("mousedown", tap, true);

    /* any focus that did NOT come from a tap is reverted, caret preserved */
    document.addEventListener("focusin", function (e) {
      var el = e.target;
      if (!el || !el.matches || !el.matches(FIELDS)) return;
      if (isAuth(el)) { disarm(el); return; }
      arm(el);
      var s = el.selectionStart, t = el.selectionEnd;
      el.blur();
      if (s != null) { try { el.selectionStart = s; el.selectionEnd = t; } catch (err) {} }
    }, true);

    document.addEventListener("focusout", function (e) {
      var el = e.target;
      if (el && el.matches && el.matches(FIELDS)) {
        if (el === authorized) { authorized = null; }
        arm(el);
      }
    }, true);

    /* patch the two programmatic focus routes so they cannot open the keyboard */
    ["HTMLTextAreaElement", "HTMLInputElement"].forEach(function (n) {
      var P = window[n] && window[n].prototype;
      if (!P || P.__pykbPatched) return;
      P.__pykbPatched = 1;
      var rawFocus = P.focus, rawSelect = P.select;
      P.focus = function (opt) {
        if (!isAuth(this)) { arm(this); return; }
        return rawFocus.call(this, opt);
      };
      P.select = function () {
        if (!isAuth(this)) { arm(this); return; }
        return rawSelect.call(this);
      };
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    scan(document);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var a = muts[i].addedNodes;
        for (var j = 0; j < a.length; j++) if (a[j].nodeType === 1) scan(a[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
