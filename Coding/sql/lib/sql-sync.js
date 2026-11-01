/* sql-sync.js — keeps the SQL book's progress, checks and Mistake Bank on every device.
   Syncs three localStorage keys with one row per user in Supabase (supabase/sql_user_state.sql):
     commonplace_module_exercises_progress · cp_sql_check · cp_sql_bank
   - Pulls and merges on sign-in, and on page load when a session exists.
   - Pushes 2 s after SQLSync.changed(). A push re-reads the row and merges first, so two
     devices never overwrite each other.
   - Merge: progress = union of "done"; checks = per module, pass:true wins and the higher
     right is kept; bank = per id, newer `updated` wins, "fixed" beats "due" on a tie.
   - Pages with a .bk-auth chip show "syncing" while it talks to Supabase. Module pages are silent.
   - Signed out or offline: does nothing, throws nothing.
   Reuses window.sb when the page has one; otherwise loads _lib/supabase.js, but only when a
   saved session exists, so signed-out readers never download the client. */
(function () {
  "use strict";
  if (window.SQLSync) return;
  var URL_ = "https://wylxvmkcrexwfpjpbhyy.supabase.co";
  var KEY_ = "sb_publishable_e3pDOuxIdstaC7s0a680kQ_R10TrAyv";
  var TOKEN = "sb-wylxvmkcrexwfpjpbhyy-auth-token";
  var TABLE = "sql_user_state";
  var K = { progress: "commonplace_module_exercises_progress", checks: "cp_sql_check", bank: "cp_sql_bank" };
  var ME = document.currentScript && document.currentScript.src;

  var sb = null, user = null, timer = 0, busy = 0, attached = false;

  /* ---------- merge rules (pure, exported for tests) ---------- */
  function mergeProgress(a, b) {
    var out = {}; a = a || {}; b = b || {};
    Object.keys(a).forEach(function (k) { out[k] = a[k]; });
    Object.keys(b).forEach(function (k) { if (b[k] === "done") out[k] = "done"; else if (!(k in out)) out[k] = b[k]; });
    return out;
  }
  function mergeChecks(a, b) {
    var out = {}; a = a || {}; b = b || {};
    Object.keys(a).concat(Object.keys(b)).forEach(function (m) {
      var x = a[m], y = b[m];
      if (!x || !y) { out[m] = x || y; return; }
      var hi = (y.right || 0) > (x.right || 0) ? y : x, r = {};
      Object.keys(hi).forEach(function (k) { r[k] = hi[k]; });
      r.pass = !!(x.pass || y.pass);
      r.at = Math.max(x.at || 0, y.at || 0) || hi.at;
      out[m] = r;
    });
    return out;
  }
  function mergeBank(a, b) {
    var by = {}, order = [];
    (a || []).concat(b || []).forEach(function (it) {
      if (!it || !it.id) return;
      var cur = by[it.id];
      if (!cur) { by[it.id] = it; order.push(it.id); return; }
      var cu = cur.updated || 0, iu = it.updated || 0;
      if (iu > cu || (iu === cu && it.state === "fixed" && cur.state !== "fixed")) by[it.id] = it;
    });
    return order.map(function (id) { return by[id]; });
  }
  function readLocal() {
    var o = {};
    try { o.progress = JSON.parse(localStorage.getItem(K.progress) || "{}") || {}; } catch (e) { o.progress = {}; }
    try { o.checks = JSON.parse(localStorage.getItem(K.checks) || "{}") || {}; } catch (e) { o.checks = {}; }
    try { o.bank = JSON.parse(localStorage.getItem(K.bank) || "[]") || []; } catch (e) { o.bank = []; }
    if (!Array.isArray(o.bank)) o.bank = [];
    return o;
  }
  function merge(local, remote) {
    remote = remote || {};
    return { progress: mergeProgress(local.progress, remote.progress), checks: mergeChecks(local.checks, remote.checks), bank: mergeBank(local.bank, remote.bank) };
  }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  /* ---------- chip ---------- */
  function chip(state) {
    if (!document.querySelector(".bk-auth") || !window.SQLBook || !user) return;
    SQLBook.auth.set(state, user.email);
  }
  function begin() { if (!busy++) chip("syncing"); }
  function end() { if (!--busy) chip("in"); }

  /* ---------- talk to Supabase ---------- */
  function fetchRow() {
    return sb.from(TABLE).select("progress,checks,bank").eq("user_id", user.id).maybeSingle()
      .then(function (res) { if (res.error) throw res.error; return res.data || null; });
  }
  // Merge remote into local; write local if it changed; push back if remote is behind.
  function sync() {
    if (!sb || !user) return Promise.resolve(false);
    begin();
    return fetchRow().then(function (row) {
      var local = readLocal(), m = merge(local, row);
      var localChanged = !same(m.progress, local.progress) || !same(m.checks, local.checks) || !same(m.bank, local.bank);
      if (localChanged) {
        try {
          localStorage.setItem(K.progress, JSON.stringify(m.progress));
          localStorage.setItem(K.checks, JSON.stringify(m.checks));
          localStorage.setItem(K.bank, JSON.stringify(m.bank));
        } catch (e) {}
        document.dispatchEvent(new CustomEvent("sqlsync:pulled", { detail: m }));
      }
      var remoteBehind = !row || !same(m.progress, row.progress || {}) || !same(m.checks, row.checks || {}) || !same(m.bank, row.bank || []);
      if (!remoteBehind) return true;
      return sb.from(TABLE).upsert({ user_id: user.id, progress: m.progress, checks: m.checks, bank: m.bank, updated_at: new Date().toISOString() })
        .then(function (res) { if (res.error) throw res.error; return true; });
    }).catch(function () { return false; })   // offline or table missing: local state stands
      .then(function (ok) { end(); return ok; });
  }

  function setUser(u) {
    var was = user && user.id;
    user = u || null;
    if (user && user.id !== was) sync();
  }
  function attach(client) {
    if (!client || !client.auth || attached) return;
    sb = client; attached = true;
    try {
      client.auth.getSession().then(function (r) { setUser(r && r.data && r.data.session ? r.data.session.user : null); }).catch(function () {});
      client.auth.onAuthStateChange(function (_e, s) { setUser(s ? s.user : null); });
    } catch (e) {}
  }
  function hasSavedSession() { try { return !!localStorage.getItem(TOKEN); } catch (e) { return false; } }
  function boot() {
    if (window.sb) return attach(window.sb);
    if (!hasSavedSession()) return;                 // signed out: nothing to sync, no client download
    var make = function () {
      if (!window.supabase || window.sb) return attach(window.sb);
      try { window.sb = window.supabase.createClient(URL_, KEY_, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }); } catch (e) { return; }
      attach(window.sb);
    };
    if (window.supabase) return make();
    if (!ME) return;
    var s = document.createElement("script");
    s.src = new URL("../../../_lib/supabase.js", ME).href;
    s.onload = make;
    s.onerror = function () {};
    document.head.appendChild(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  window.SQLSync = {
    /* Call after writing any of the three keys; pushes 2 s later. */
    changed: function () {
      if (!sb || !user) return;
      clearTimeout(timer);
      timer = setTimeout(sync, 2000);
    },
    pull: function () { return sync(); },
    signedIn: function () { return !!user; },
    attach: attach,
    merge: { progress: mergeProgress, checks: mergeChecks, bank: mergeBank, all: merge }
  };
})();
