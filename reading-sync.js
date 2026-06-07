/* =============================================================================
 * Commonplace · reading-sync.js
 * Shared cloud reading-progress sync for every study / book page.
 *
 * Reuses the existing Commonplace Supabase project, table and magic-link auth
 * (the same one the SQL "exercises" page and the VBA Section 1 page already use).
 * Do NOT create a new project / table / auth flow here.
 *
 * Per-page configuration (set BEFORE this script loads):
 *
 *   window.READING_SYNC = {
 *     resourceSet: "vba_section_1",     // REQUIRED · unique per page, <subject>_<section>
 *     mode: "class" | "toggle" | "page",// how trackable units behave (default "toggle")
 *     items: "[data-track]",            // CSS selector for the trackable units
 *     pageName: "Section 1",            // optional · label used in "page" mode
 *     bar: "#reading-sync-bar",         // optional · element to mount the sync bar into
 *     onApply: function(){}             // optional · called after remote progress is applied
 *   };
 *
 * Modes
 *   class  – units already carry a `.done` class toggled by the page's own UI
 *            (e.g. the VBA concept cards). We observe + sync, and on pull we add
 *            `.done` back and fire onApply so the page can refresh its progress bar.
 *   toggle – units have no read UI of their own (article <h2> sections). We inject
 *            a small "Mark read" pill into each one and own the done-state.
 *   page   – the whole page is a single unit, marked done once the reader has
 *            scrolled through every `items` element (e.g. C/C++ lessons).
 *
 * Storage model (unchanged):
 *   table  commonplace_external_resources
 *   upsert on conflict  user_id,resource_set,item_key
 *   columns user_id, resource_set, item_key, name, url, order_index,
 *           status ("done" | "not_started"), last_attempted, updated_at
 *
 * Local-first: progress is always written to localStorage immediately; cloud
 * sync is layered on top when signed in. When the page is opened from file://
 * (no real origin) cloud sync is disabled and it falls back to device-only
 * localStorage — the read toggles still work.
 * ========================================================================== */
(function () {
  "use strict";

  var CFG = window.READING_SYNC || {};
  if (!CFG.resourceSet) {
    // Nothing to do without a resource set; fail quietly so pages never break.
    return;
  }

  var SUPABASE_URL = "https://wylxvmkcrexwfpjpbhyy.supabase.co";
  var SUPABASE_KEY = "sb_publishable_e3pDOuxIdstaC7s0a680kQ_R10TrAyv";

  var RS          = CFG.resourceSet;
  var MODE        = CFG.mode || "toggle";
  var ITEMS_SEL   = CFG.items || "[data-track]";
  var PAGE_NAME   = CFG.pageName || (document.title || "").split(/[·|—-]/)[0].trim() || "This page";
  var LS_KEY      = "crs::" + RS;             // local progress map for this page
  var IS_FILE     = location.protocol === "file:";

  var sb = null, session = null, units = [], bar = null, styleDone = false;

  /* ---------------------------------------------------------------- utils -- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function pageFile() { return location.pathname.split("/").pop() || "index.html"; }
  function nowISO()   { return new Date().toISOString(); }
  function loadMap()  { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (e) { return {}; } }
  function saveMap(m) { try { localStorage.setItem(LS_KEY, JSON.stringify(m)); } catch (e) {} }
  function setLocal(key, status) { var m = loadMap(); m[key] = status; saveMap(m); }
  function getLocal(key) { return loadMap()[key] || "not_started"; }

  /* ---------------------------------------------------------------- styles - */
  function injectStyle() {
    if (styleDone) return; styleDone = true;
    var css = [
      ".rs-bar{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;",
      "font-size:12px;color:#6b7280;display:inline-flex;align-items:center;gap:7px;flex-wrap:wrap;}",
      ".rs-bar.rs-float{position:fixed;top:10px;right:12px;z-index:9999;background:rgba(255,255,255,.94);",
      "backdrop-filter:saturate(150%) blur(6px);border:1px solid #e5e7eb;border-radius:999px;",
      "padding:6px 12px;box-shadow:0 4px 14px rgba(0,0,0,.08);}",
      ".rs-ok{color:#16a34a;font-weight:700;}",
      ".rs-who{color:#374151;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      ".rs-note{color:#9ca3af;}",
      ".rs-btn{font:inherit;font-size:11px;border:1px solid #d1d5db;background:#fff;color:#374151;",
      "border-radius:6px;padding:3px 9px;cursor:pointer;}",
      ".rs-btn:hover{border-color:#4f46e5;color:#4f46e5;}",
      ".rs-email{font:inherit;font-size:11px;border:1px solid #d1d5db;border-radius:6px;",
      "padding:3px 8px;width:140px;background:#fff;color:#111827;}",
      ".rs-mark{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;",
      "border:1px solid #d1d5db;background:#fff;color:#6b7280;border-radius:999px;padding:3px 11px;",
      "cursor:pointer;margin:2px 0 10px;transition:.15s;vertical-align:middle;}",
      ".rs-mark:hover{border-color:#16a34a;color:#15803d;}",
      ".rs-mark.rs-on{background:#dcfce7;border-color:#bbf7d0;color:#15803d;font-weight:600;}",
      "@media(max-width:600px){.rs-bar.rs-float{top:auto;bottom:10px;right:8px;}.rs-email{width:118px;}}"
    ].join("");
    var s = document.createElement("style");
    s.setAttribute("data-reading-sync", "");
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ----------------------------------------------------------- sync bar UI - */
  function ensureBar() {
    if (bar) return bar;
    if (CFG.bar) bar = document.querySelector(CFG.bar);
    if (!bar) bar = document.getElementById("reading-sync-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "reading-sync-bar";
      bar.className = "rs-bar rs-float";
      (document.body || document.documentElement).appendChild(bar);
    } else {
      bar.classList.add("rs-bar");
    }
    return bar;
  }

  function renderBar() {
    var b = ensureBar();
    if (IS_FILE || !sb) {
      b.innerHTML = '<span class="rs-note">Saved on this device · open via a web address to sync</span>';
    } else if (session) {
      b.innerHTML =
        '<span class="rs-ok">✓ Synced</span>' +
        '<span class="rs-note">·</span>' +
        '<span class="rs-who">' + esc(session.user.email) + '</span>' +
        '<button class="rs-btn" id="rs-signout">Sign out</button>';
      var so = document.getElementById("rs-signout");
      if (so) so.onclick = function () { sb.auth.signOut(); };
    } else {
      b.innerHTML =
        '<span class="rs-note">Device-only ·</span>' +
        '<input class="rs-email" id="rs-email" type="email" placeholder="you@email.com" autocomplete="email">' +
        '<button class="rs-btn" id="rs-link">Sync via email</button>';
      var go = function () {
        var em = (document.getElementById("rs-email").value || "").trim();
        if (!em) return;
        var btn = document.getElementById("rs-link");
        btn.disabled = true; btn.textContent = "Sending…";
        sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.href.split("#")[0] } })
          .then(function (r) { btn.disabled = false; btn.textContent = r.error ? "Try again" : "Check inbox ✉"; },
                function ()  { btn.disabled = false; btn.textContent = "Try again"; });
      };
      document.getElementById("rs-link").onclick = go;
      var inp = document.getElementById("rs-email");
      if (inp) inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    }
    if (MODE === "page") reflectPage(); // re-apply the read flag (innerHTML reset clears it)
  }

  /* ------------------------------------------------------------- units ----- */
  function statusOf(u) {
    if (MODE === "class") return u.el.classList.contains("done") ? "done" : "not_started";
    return getLocal(u.key);
  }

  function buildUnits() {
    if (MODE === "page") {
      units = [{ key: "lesson", name: PAGE_NAME, url: pageFile(), order: 0, el: null }];
      wirePage();
      return;
    }
    var els = Array.prototype.slice.call(document.querySelectorAll(ITEMS_SEL));
    els.forEach(function (el, i) {
      var key = el.getAttribute("data-rs-key") || el.id ||
                (MODE === "class" ? "concept_" + (i + 1) : "section_" + (i + 1));
      var name = (el.querySelector(".title") ? el.querySelector(".title").textContent
                                             : el.textContent).trim().replace(/\s+/g, " ").slice(0, 200);
      var u = { key: key, name: name, url: pageFile() + (el.id ? "#" + el.id : "#" + key), order: i, el: el };
      units.push(u);
      if (MODE === "class")  wireClass(u);
      if (MODE === "toggle") wireToggle(u);
    });
  }

  // ---- class mode: page owns `.done`; observe + sync, mirror to localStorage
  function wireClass(u) {
    setLocal(u.key, statusOf(u)); // seed mirror
    var mo = new MutationObserver(function () {
      var st = statusOf(u);
      if (getLocal(u.key) !== st) { setLocal(u.key, st); syncOne(u); }
    });
    mo.observe(u.el, { attributes: true, attributeFilter: ["class"] });
  }

  // ---- toggle mode: inject a "Mark read" pill and own the done-state
  function wireToggle(u) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rs-mark";
    u._btn = btn;
    reflectToggle(u);
    btn.addEventListener("click", function () {
      var next = getLocal(u.key) === "done" ? "not_started" : "done";
      setLocal(u.key, next);
      reflectToggle(u);
      syncOne(u);
    });
    if (u.el.nextSibling) u.el.parentNode.insertBefore(btn, u.el.nextSibling);
    else u.el.parentNode.appendChild(btn);
  }
  function reflectToggle(u) {
    if (!u._btn) return;
    var done = getLocal(u.key) === "done";
    u._btn.className = "rs-mark" + (done ? " rs-on" : "");
    u._btn.innerHTML = done ? "✓ Read" : "○ Mark read";
  }

  // ---- page mode: mark done once every `items` element has been seen
  function wirePage() {
    var key = "lesson";
    function markDone() {
      if (getLocal(key) === "done") return;
      setLocal(key, "done"); reflectPage(); syncOne(units[0]);
    }
    reflectPage();
    if (getLocal(key) === "done") return;
    var secs = Array.prototype.slice.call(document.querySelectorAll(ITEMS_SEL));
    if (!secs.length || !("IntersectionObserver" in window)) {
      window.addEventListener("scroll", function onScroll() {
        if ((window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 80)) {
          window.removeEventListener("scroll", onScroll); markDone();
        }
      }, { passive: true });
      return;
    }
    var seen = {}, total = secs.length;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (e.isIntersecting) {
          seen[e.target.__rsIdx] = 1;
          if (Object.keys(seen).length >= total) { io.disconnect(); markDone(); }
        }
      });
    }, { threshold: 0.4 });
    secs.forEach(function (s, i) { s.__rsIdx = i; io.observe(s); });
  }
  function reflectPage() {
    var b = ensureBar();
    if (getLocal("lesson") === "done" && b && !b.querySelector(".rs-read-flag")) {
      var f = document.createElement("span");
      f.className = "rs-read-flag rs-ok";
      f.textContent = "✓ Read";
      b.insertBefore(f, b.firstChild);
    }
  }

  /* --------------------------------------------------------- cloud sync ---- */
  function syncOne(u) {
    if (!sb || !session) return;
    var t = nowISO();
    sb.from("commonplace_external_resources").upsert({
      user_id: session.user.id, resource_set: RS, item_key: u.key,
      name: u.name, url: u.url, order_index: u.order,
      status: statusOf(u), last_attempted: t, updated_at: t
    }, { onConflict: "user_id,resource_set,item_key" }).then(function () {}, function () {});
  }

  function applyRemoteDone(key) {
    var u = null;
    for (var i = 0; i < units.length; i++) if (units[i].key === key) { u = units[i]; break; }
    if (!u) return;
    setLocal(key, "done");
    if (MODE === "class")  { if (u.el && !u.el.classList.contains("done")) u.el.classList.add("done"); }
    if (MODE === "toggle") reflectToggle(u);
    if (MODE === "page")   reflectPage();
  }

  function pull() {
    if (!sb || !session) return;
    sb.from("commonplace_external_resources").select("item_key,status").eq("resource_set", RS)
      .then(function (res) {
        if (res.error || !res.data) return;
        var remoteDone = {};
        res.data.forEach(function (r) { if (r.status === "done") { remoteDone[r.item_key] = true; applyRemoteDone(r.item_key); } });
        if (typeof CFG.onApply === "function") { try { CFG.onApply(); } catch (e) {} }
        // push any device-only "done" the cloud hasn't seen yet
        units.forEach(function (u) { if (statusOf(u) === "done" && !remoteDone[u.key]) syncOne(u); });
      });
  }

  /* ------------------------------------------------------------- boot ------ */
  function start() {
    injectStyle();
    buildUnits();
    renderBar();
    if (!sb) return;
    sb.auth.getSession().then(function (res) { session = res.data.session || null; renderBar(); pull(); });
    sb.auth.onAuthStateChange(function (_e, s) { session = s; renderBar(); if (session) pull(); });
  }

  function withSupabase(cb) {
    if (window.supabase) return cb();
    if (IS_FILE) return cb();            // offline file:// → device-only
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = cb; s.onerror = cb;
    document.head.appendChild(s);
  }

  function init() {
    withSupabase(function () {
      if (!IS_FILE && window.supabase) {
        try {
          sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY,
            { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        } catch (e) { sb = null; }
      }
      start();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // small public hook (optional use by pages)
  window.ReadingSync = {
    markPageDone: function () {
      if (MODE === "page") { setLocal("lesson", "done"); reflectPage(); if (units[0]) syncOne(units[0]); }
    },
    config: CFG
  };
})();
