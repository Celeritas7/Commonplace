/* Commonplace - login gate. Loaded first thing in <head> of every page (added by add_gate.py).
   Hides the page until you are signed in with an allowed email, using the same Supabase
   Google or magic-link sign-in as cloud progress sync (same session, so one sign-in covers both).

   - Allowed emails are stored only as SHA-256 hashes (ALLOW), so no address sits in the public repo.
     To allow another address: python3 -c "import hashlib;print(hashlib.sha256(b'name@example.com').hexdigest())"
     (lower-case the address first) and add the hash to ALLOW.
   - Works offline: a saved session is checked without the network.
   - Not applied on file:// or localhost, where you are on your own computer.
   - This is a curtain, not security: the site is static and the repository is public, so the files
     can still be read directly. It keeps casual visitors and shared links out. */
(function () {
  if (window.__cpGate) return; window.__cpGate = 1;
  if (location.protocol === 'file:' || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname)) return;

  var ALLOW = ['77dab744e9df8700935e23621a37fa809c50a7baa426d732b66112e43ed3fc3c'];
  var SUPABASE_URL = 'https://wylxvmkcrexwfpjpbhyy.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_e3pDOuxIdstaC7s0a680kQ_R10TrAyv';
  var SKEY = 'sb-wylxvmkcrexwfpjpbhyy-auth-token';   // supabase-js default storage key for this project
  var OK = 'cp:gate:ok';                              // the email that last passed the check
  var NEXT = 'cp:gate:next';                          // the page you asked to sign in from: {url, t}
  var ME = document.currentScript && document.currentScript.src;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function sessionEmail() {
    try {
      var s = JSON.parse(get(SKEY) || 'null'); if (!s) return null;
      var u = s.user || (s.currentSession && s.currentSession.user);
      return u && u.email ? String(u.email).toLowerCase() : null;
    } catch (e) { return null; }
  }
  var returning = /[#&](access_token|error|error_description)=/.test(location.hash) || /[?&](code|error|error_description)=/.test(location.search);
  var authParams = new URLSearchParams(location.hash.slice(1));
  var queryParams = new URLSearchParams(location.search);
  var authError = authParams.get('error_description') || authParams.get('error') || queryParams.get('error_description') || queryParams.get('error');
  function returnUrl() {
    var url = new URL(location.href);
    url.hash = '';
    ['code', 'error', 'error_code', 'error_description'].forEach(function (key) { url.searchParams.delete(key); });
    return url.href;
  }

  /* signed out in another tab: lock this one too */
  addEventListener('storage', function (e) { if (e.key === SKEY && !e.newValue) location.reload(); });

  /* "Sign out" in the ⇅ menu (progress-backup.js), once the page is unlocked. It forgets the session on
     this device only and reloads, so the sign-in screen comes back; other tabs lock via the storage event. */
  function signOut() { set(OK, null); set(NEXT, null); set(SKEY, null); location.reload(); }
  function addSignOut() {
    var tries = 0;
    (function look() {
      var menu = document.querySelector('.cpb-menu');
      if (!menu) { if (++tries < 40) setTimeout(look, 250); return; }   // the ⇅ pill appears after DOMContentLoaded
      if (menu.querySelector('[data-a="signout"]')) return;
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-a', 'signout'); b.textContent = 'Sign out';
      b.title = 'Sign out of Commonplace on this device';
      b.onclick = function (e) { e.stopPropagation(); signOut(); };   // keep the ⇅ menu's own handler out of it
      menu.appendChild(b);
    })();
  }

  /* fast path: a saved session whose email already passed */
  var em = sessionEmail();
  if (em && get(OK) === em && !returning) { addSignOut(); return; }

  /* everything below runs with the page hidden */
  var root = document.documentElement;
  root.classList.add('cp-locked');
  var st = document.createElement('style');
  st.textContent =
    'html.cp-locked,html.cp-locked body{overflow:hidden!important}' +
    'html.cp-locked body{visibility:hidden!important}' +
    '#cp-gate{visibility:visible!important;position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;' +
      'background:#f6f1e7;color:#2b241c;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '#cp-gate *{box-sizing:border-box}' +
    '#cp-gate .g-card{width:min(380px,100%);background:#fffdf7;border:1px solid #e3d8c6;border-radius:18px;padding:26px 24px 22px;box-shadow:0 18px 50px -20px rgba(60,40,10,.35)}' +
    '#cp-gate .g-mark{width:42px;height:42px;border-radius:12px;background:#2b241c;color:#fffdf7;display:flex;align-items:center;justify-content:center;font:700 20px/1 Georgia,serif;margin-bottom:14px}' +
    '#cp-gate h1{font:700 22px/1.2 Georgia,"Times New Roman",serif;margin:0 0 4px;color:#2b241c}' +
    '#cp-gate .g-sub{margin:0 0 18px;color:#7a6a55;font-size:14px}' +
    '#cp-gate label{display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#7a6a55;margin-bottom:6px}' +
    '#cp-gate input{width:100%;height:44px;border:1px solid #d8cbb8;border-radius:10px;padding:0 12px;font:inherit;background:#fff;color:#2b241c}' +
    '#cp-gate input:focus{outline:2px solid #8a5a2b;outline-offset:1px;border-color:#8a5a2b}' +
    '#cp-gate button{width:100%;height:44px;margin-top:12px;border:0;border-radius:10px;background:#2b241c;color:#fffdf7;font:600 15px/1 inherit;cursor:pointer}' +
    '#cp-gate button.g-ghost{background:transparent;color:#5a4632;border:1px solid #d8cbb8}' +
    '#cp-gate .g-google{display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#2b241c;border:1px solid #d8cbb8;margin-top:0}' +
    '#cp-gate .g-divider{display:flex;align-items:center;gap:12px;margin:18px 0;color:#7a6a55;font-size:12px}' +
    '#cp-gate .g-divider:before,#cp-gate .g-divider:after{content:"";height:1px;flex:1;background:#e3d8c6}' +
    '#cp-gate button:focus-visible{outline:2px solid #8a5a2b;outline-offset:3px}' +
    '#cp-gate button:disabled{opacity:.6;cursor:default}' +
    '#cp-gate .g-msg{margin:12px 0 0;font-size:13.5px;min-height:1.5em;color:#5a4632}' +
    '#cp-gate .g-msg.bad{color:#b42318}' +
    '#cp-gate .g-msg.good{color:#047857}';
  (document.head || root).appendChild(st);

  function unlock() {
    addSignOut();
    root.classList.remove('cp-locked');
    var g = document.getElementById('cp-gate'); if (g) g.remove();
  }

  function hex(bytes) { return Array.prototype.map.call(bytes, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function utf8(s) { return window.TextEncoder ? new TextEncoder().encode(s) : unescape(encodeURIComponent(s)).split('').map(function (c) { return c.charCodeAt(0); }); }
  /* crypto.subtle only exists on https (and localhost); plain http, such as a home-network address, uses this */
  function sha256(bytes) {
    var K = [], H = [], i, j, n = 2;
    function frac(x) { return (x - Math.floor(x)) * 4294967296 | 0; }
    for (i = 0; i < 64; n++) { for (j = 2; j * j <= n; j++) if (n % j === 0) break; if (j * j > n) { if (i < 8) H[i] = frac(Math.pow(n, 1 / 2)); K[i++] = frac(Math.pow(n, 1 / 3)); } }
    var m = Array.prototype.slice.call(bytes), l = m.length * 8;
    m.push(0x80); while (m.length % 64 !== 56) m.push(0);
    for (i = 7; i >= 0; i--) m.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    var w = [];
    for (var o = 0; o < m.length; o += 64) {
      for (i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
      for (i = 16; i < 64; i++) {
        var a = w[i - 15], b = w[i - 2];
        w[i] = (((a >>> 7 | a << 25) ^ (a >>> 18 | a << 14) ^ (a >>> 3)) + w[i - 16] + ((b >>> 17 | b << 15) ^ (b >>> 19 | b << 13) ^ (b >>> 10)) + w[i - 7]) | 0;
      }
      var h = H.slice();
      for (i = 0; i < 64; i++) {
        var e = h[4], x = h[0];
        var t1 = (h[7] + ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)) + ((e & h[5]) ^ (~e & h[6])) + K[i] + w[i]) | 0;
        var t2 = (((x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10)) + ((x & h[1]) ^ (x & h[2]) ^ (h[1] & h[2]))) | 0;
        h = [(t1 + t2) | 0, x, h[1], h[2], (h[3] + t1) | 0, e, h[5], h[6]];
      }
      for (i = 0; i < 8; i++) H[i] = (H[i] + h[i]) | 0;
    }
    var out = [];
    for (i = 0; i < 8; i++) out.push((H[i] >>> 24) & 255, (H[i] >>> 16) & 255, (H[i] >>> 8) & 255, H[i] & 255);
    return hex(out);
  }
  var sha = function (s) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', utf8(s)).then(function (b) { return hex(new Uint8Array(b)); }, function () { return sha256(utf8(s)); });
    }
    return Promise.resolve(sha256(utf8(s)));
  };
  function allowed(email) { return sha(email).then(function (h) { return ALLOW.indexOf(h) >= 0; }); }

  /* supabase client, only when we need to sign in or finish a sign-in */
  var sb = null;
  function client(cb) {
    if (sb) return cb(sb);
    function make() {
      try {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY,
          { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      } catch (e) { sb = null; }
      cb(sb);
    }
    if (window.supabase && window.supabase.createClient) return make();
    var s = document.createElement('script');
    s.src = ME ? ME.replace(/gate\.js(\?.*)?$/, 'supabase.js') : 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = make; s.onerror = function () { cb(null); };
    document.head.appendChild(s);
  }

  /* ---------- the sign-in screen ---------- */
  var ui = null;
  function screen(mode, email) {
    /* attached to <html>, not <body>, so the page's own scripts (which sweep body for floating bars) leave it alone */
    if (!ui) { ui = document.createElement('div'); ui.id = 'cp-gate'; ui.setAttribute('role', 'dialog'); ui.setAttribute('aria-label', 'Sign in'); root.appendChild(ui); }
    if (mode === 'wait') {
      ui.innerHTML = '<div class="g-card"><div class="g-mark">C</div><h1>Commonplace</h1><p class="g-sub">Checking your sign-in…</p></div>';
      return;
    }
    if (mode === 'denied') {
      ui.innerHTML = '<div class="g-card"><div class="g-mark">C</div><h1>Not allowed</h1>' +
        '<p class="g-sub">You are signed in as <b></b>, but this account cannot open Commonplace.</p>' +
        '<button type="button" class="g-ghost" data-a="out">Sign out and use another email</button></div>';
      ui.querySelector('b').textContent = email;
      ui.querySelector('[data-a="out"]').onclick = function () {
        set(OK, null);
        client(function (c) {
          var done = function () { set(SKEY, null); screen('form'); };
          if (c) c.auth.signOut().then(done, done); else done();
        });
      };
      return;
    }
    ui.innerHTML = '<div class="g-card"><div class="g-mark">C</div><h1>Commonplace</h1>' +
      '<p class="g-sub">Sign in to open your study notes.</p>' +
      '<button type="button" class="g-google" data-a="google"><span aria-hidden="true" style="font:bold 20px Arial;color:#4285f4">G</span>Continue with Google</button>' +
      '<div class="g-divider">or use email</div>' +
      '<form novalidate><label for="cp-gate-em">Email</label>' +
      '<input id="cp-gate-em" type="email" autocomplete="email" inputmode="email" required>' +
      '<button type="submit">Email me a sign-in link</button>' +
      '<p class="g-msg" role="status"></p></form></div>';
    var f = ui.querySelector('form'), inp = ui.querySelector('input'), btn = ui.querySelector('button[type="submit"]'), msg = ui.querySelector('.g-msg');
    if (email) inp.value = email;
    var google = ui.querySelector('[data-a="google"]');
    function busy(value) { google.disabled = value; btn.disabled = value; }
    function failed(message) {
      busy(false); set(NEXT, null);
      msg.className = 'g-msg bad'; msg.textContent = message;
    }
    google.onclick = function () {
      if (google.disabled) return;
      busy(true); msg.className = 'g-msg'; msg.textContent = 'Opening Google…';
      client(function (c) {
        if (!c) return failed('Could not reach the sign-in service. Check your connection.');
        var target = returnUrl();
        set(NEXT, JSON.stringify({ url: target, t: Date.now() }));
        c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: target } }).then(function (r) {
          if (r && r.error) failed(r.error.message || 'Could not start Google sign-in. Try again or use email.');
        }, function () { failed('Could not start Google sign-in. Try again or use email.'); });
      });
    };
    addEventListener('pageshow', function () { busy(false); });
    f.onsubmit = function (e) {
      e.preventDefault();
      var v = inp.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg.className = 'g-msg bad'; msg.textContent = 'Enter a valid email address.'; return; }
      if (btn.disabled) return;
      busy(true); msg.className = 'g-msg'; msg.textContent = 'Sending…';
      client(function (c) {
        if (!c) { busy(false); msg.className = 'g-msg bad'; msg.textContent = 'Could not reach the sign-in service. Check your connection.'; return; }
        /* Supabase sends the link back only to addresses on its allow-list and falls back to the home page
           otherwise, so remember this page and go back to it once the sign-in completes (see goBack) */
        set(NEXT, JSON.stringify({ url: returnUrl(), t: Date.now() }));
        c.auth.signInWithOtp({ email: v, options: { emailRedirectTo: returnUrl() } }).then(function (r) {
          busy(false);
          if (r && r.error) { msg.className = 'g-msg bad'; msg.textContent = r.error.message || 'Could not send the link.'; return; }
          msg.className = 'g-msg good'; msg.textContent = 'Check your inbox and open the link on this device. It brings you back here, signed in.';
        }, function () { busy(false); msg.className = 'g-msg bad'; msg.textContent = 'Could not send the link. Try again.'; });
      });
    };
  }

  /* after a sign-in, return to the page it was started from (within an hour, same site, not this page) */
  function goBack() {
    var n = null; try { n = JSON.parse(get(NEXT) || 'null'); } catch (e) {}
    set(NEXT, null);
    if (!returning || !n || !n.url || Date.now() - n.t > 3600e3) return false;
    var to; try { to = new URL(n.url); } catch (e) { return false; }
    if (to.origin !== location.origin || to.href === returnUrl()) return false;
    location.replace(to.href);
    return true;
  }

  /* ---------- decide ---------- */
  function check(email) {
    if (!email) { set(OK, null); return screen('form'); }
    allowed(email).then(function (yes) {
      if (yes) { set(OK, email); if (!goBack()) unlock(); }
      else { set(OK, null); set(NEXT, null); screen('denied', email); }
    }, function () { screen('form'); });
  }
  function run() {
    if (authError) {
      set(NEXT, null);
      history.replaceState(null, '', returnUrl());
      screen('form');
      var message = ui.querySelector('.g-msg');
      message.className = 'g-msg bad';
      message.textContent = 'Sign-in was not completed. ' + authError + ' Try again or use email.';
      return;
    }
    if (returning) {
      /* back from Google or the email link: let supabase-js finish the sign-in, then check */
      screen('wait');
      client(function (c) {
        if (!c) return check(sessionEmail());
        c.auth.getSession().then(function (r) {
          var u = r && r.data && r.data.session && r.data.session.user;
          check(u && u.email ? String(u.email).toLowerCase() : sessionEmail());
        }, function () { check(sessionEmail()); });
      });
      return;
    }
    if (em) { screen('wait'); check(em); } else screen('form');
  }
  if (document.body) run(); else document.addEventListener('DOMContentLoaded', run);

})();
