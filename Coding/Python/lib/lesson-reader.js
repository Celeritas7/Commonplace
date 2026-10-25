/* lesson-reader.js — drop-in for every lesson page.
   <script src="../lib/lesson-reader.js" defer></script>
   (0) Toolbar — a labelled bar at the bottom of the screen on phones, a labelled
       pill bottom-right on wide screens. Never over the breadcrumb/progress bar.
       Colours come from lib/tokens.css (dark theme follows automatically).
   (1) Reader mode — flat paper, serif, comfortable measure.
   (2) Tap any sentence to flag it; flags persist per lesson and list in a bottom sheet.
   (3) Phase 0 — folds the cloud-sync account panel into a chip in the top pill and
       lifts floating buttons clear of the phone's home bar.
   (4) Phase 1 — loads lib/drills/<lessonId>.js if it exists and appends a Drills
       section to the lesson. No change needed in the lesson HTML or build.py. */
(function () {
  var FILE = location.pathname.split('/').pop();
  var KEY = 'lr:flags:' + FILE;
  var PREF = 'lr:pref';
  var pref = {}; try { pref = JSON.parse(localStorage.getItem(PREF) || '{}'); } catch (e) {}
  var flags = []; try { flags = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
  var size = pref.size || 19;
  var LIB = (document.currentScript && document.currentScript.src || '../lib/lesson-reader.js').replace(/lesson-reader\.js.*$/, '');

  var css = document.createElement('style');
  css.textContent = [
    '.lr-s{border-radius:2px;transition:background .15s}',
    '.lr-s.on{background:var(--brass-soft);box-shadow:0 0 0 2px var(--brass-soft);color:var(--ink);cursor:pointer}',
    '.lr-pop{position:fixed;z-index:2147483000;display:none;gap:4px;padding:4px;background:var(--green-deep);border-radius:999px;box-shadow:var(--shadow-lg);font:700 13px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.6px;-webkit-user-select:none;user-select:none;touch-action:manipulation}',
    '.lr-pop.open{display:flex}',
    '.lr-pop button{all:unset;cursor:pointer;min-height:40px;padding:0 16px;border-radius:999px;color:var(--on-deep);line-height:40px;white-space:nowrap}',
    '.lr-pop button:active{background:rgba(255,255,255,.16)}',
    /* ---- toolbar: bottom bar on phones (every button labelled, 50px tall) ---- */
    '.lr-ui{position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;gap:2px;padding:4px 6px calc(6px + env(safe-area-inset-bottom,0px));background:var(--paper-2);border-top:1px solid var(--line);box-shadow:0 -10px 24px -20px rgba(var(--shade-rgb),.5)}',
    '.lr-ui button{all:unset;cursor:pointer;flex:1 1 0;min-width:0;min-height:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:10px;color:var(--ink);text-align:center;-webkit-tap-highlight-color:transparent}',
    '.lr-ui button .lr-g{font:600 17px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:0;height:18px;display:flex;align-items:center}',
    '.lr-ui button .lr-l{font:600 12px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.2px;color:var(--ink-mute);white-space:nowrap}',
    '.lr-ui button.on{background:var(--sage-soft)}',
    '.lr-ui button.on .lr-l{color:var(--green)}',
    '.lr-ui button:active{background:var(--sage-soft)}',
    '.lr-ui button.lr-authchip .lr-g{width:22px;height:22px;border-radius:50%;background:var(--green-deep);color:var(--on-deep);font-size:12px;justify-content:center}',
    '.lr-ui button.lr-authchip.off .lr-g{background:transparent;color:var(--ink-mute);border:1.5px solid var(--ink-mute);box-sizing:border-box}',
    /* wide screens: a labelled pill in the bottom-right corner, clear of the top bar */
    '@media (min-width:820px){',
    ' .lr-ui{left:auto;right:18px;bottom:18px;padding:4px;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow)}',
    ' .lr-ui button{flex:0 0 auto;min-width:62px;padding:0 6px}',
    '}',
    '.lr-sheet{position:fixed;left:0;right:0;bottom:calc(66px + env(safe-area-inset-bottom,0px));z-index:99998;max-height:60vh;overflow:auto;background:var(--card);border-top:1px solid var(--line);box-shadow:0 -10px 26px -18px rgba(var(--shade-rgb),.5);padding:14px 16px 20px;font-family:"EB Garamond",Georgia,serif;color:var(--ink);display:none}',
    '.lr-sheet.open{display:block}',
    '.lr-sheet h3{margin:0 0 10px;font:700 12px/1 "JetBrains Mono",monospace;letter-spacing:1.5px;text-transform:uppercase;color:var(--green);display:flex;justify-content:space-between;align-items:center;gap:12px}',
    '.lr-sheet h3>span{white-space:nowrap}',
    '.lr-sheet h3 button{all:unset;cursor:pointer;color:var(--ink-mute);font-size:12px;letter-spacing:.5px;min-height:44px;line-height:44px;padding:0 6px}',
    '.lr-sheet li{list-style:none;display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line-soft);font-size:16px;line-height:1.45}',
    '.lr-sheet li a{flex:1;color:var(--ink);text-decoration:none;cursor:pointer}',
    '.lr-sheet li b{all:unset;cursor:pointer;color:var(--ink-mute);font:700 13px "JetBrains Mono",monospace;min-width:44px;min-height:32px;text-align:center}',
    '.lr-sheet p.empty{color:var(--ink-mute);font-style:italic;margin:4px 0}',
    /* Phase 0 — the account panel is hidden until its chip is tapped */
    '.lr-auth-dock{opacity:0!important;pointer-events:none!important;transform:translateY(14px)!important;transition:opacity .16s ease,transform .16s ease}',
    'html.lr-auth-open .lr-auth-dock{opacity:1!important;pointer-events:auto!important;transform:none!important}',
    /* docked, it sits just above the toolbar */
    '.lr-auth-dock{top:auto!important;bottom:calc(74px + env(safe-area-inset-bottom,0px))!important;right:10px!important;left:auto!important}',
    '@media (max-width:600px){.lr-auth-dock{left:8px!important;right:8px!important}}',
    '.lr-safe{margin-bottom:env(safe-area-inset-bottom,0px)!important}',
    /* phones: the bottom toolbar is ~66px tall — floaters (backup ⇅, 🧠 Quiz, toasts) sit above it */
    '@media (max-width:819px){.lr-safe:not(.toast){margin-bottom:calc(66px + env(safe-area-inset-bottom,0px))!important}}',
    /* wide screens: the toolbar is a pill in the bottom-right corner, so only right-hand floaters
       (the study layer's 🔖 ★ ☰ buttons) need to sit above it */
    '@media (min-width:820px){.lr-safe.lr-right:not(.toast){margin-bottom:76px!important}}',   /* the toast already clears the bar and hides by sliding down */
    /* reader mode */
    'html.lr-reader,html.lr-reader body{background:var(--paper)!important;color:var(--ink)!important}',
    'html.lr-reader .lr-flat{background:var(--card)!important;background-image:none!important;color:var(--ink)!important;box-shadow:var(--shadow-sm)!important;border:1px solid var(--line)!important;border-radius:6px!important;backdrop-filter:none!important}',
    'html.lr-reader .lr-flat *{color:inherit}',
    'html.lr-reader .step-num,html.lr-reader .eol-n,html.lr-reader .eol-btn{color:var(--on-deep)!important}html.lr-reader .eol-n{color:var(--green)!important}html.lr-reader .eol-btn.ghost{color:var(--green)!important}',
    'html.lr-reader p,html.lr-reader li,html.lr-reader blockquote{font-family:"EB Garamond",Georgia,serif!important;font-size:var(--lr-size,19px)!important;line-height:1.5!important;color:var(--ink)!important;max-width:34em;letter-spacing:0!important}',
    'html.lr-reader h1,html.lr-reader h2,html.lr-reader h3{font-family:"Cormorant Garamond",Georgia,serif!important;font-weight:600!important;line-height:1.05!important;letter-spacing:-.3px!important;color:var(--ink)!important;background:none!important;-webkit-text-fill-color:var(--ink)!important}',
    'html.lr-reader h1{font-size:calc(var(--lr-size,19px)*2)!important}',
    'html.lr-reader h2{font-size:calc(var(--lr-size,19px)*1.5)!important}',
    'html.lr-reader h3{font-size:calc(var(--lr-size,19px)*1.2)!important}',
    'html.lr-reader strong{color:var(--green)!important}',
    'html.lr-reader pre,html.lr-reader code{font-family:"JetBrains Mono",ui-monospace,monospace!important}',
    'html.lr-reader .code pre,html.lr-reader .code code{color:var(--code-ink)!important}',
    'html.lr-reader *{animation:none!important;transition:none!important}',
    /* the drill section keeps its own look even in reader mode */
    'html.lr-reader .lsd .fd-code,html.lr-reader .lsd .fd-b{font-family:"JetBrains Mono",ui-monospace,monospace!important}',
    'html.lr-reader .lsd .fd-ask,html.lr-reader .lsd .lsd-concept,html.lr-reader .lsd .fd-opt,html.lr-reader .lsd .fd-v{max-width:none}',
    /* wide screens: PC + iPad — one centered column, not a full-width stretch */
    '@media (min-width:820px){',
    ' html.lr-reader body{max-width:780px!important;margin:0 auto!important;padding:40px 32px 96px!important;box-sizing:border-box}',
    ' html.lr-reader p,html.lr-reader li,html.lr-reader blockquote{font-size:calc(var(--lr-size,19px) + 1px)!important;max-width:38em}',
    ' .lr-sheet{left:auto;right:18px;bottom:84px;width:420px;max-height:66vh;border:1px solid var(--line);border-radius:10px}',
    '}',
    '@media (min-width:1280px){ html.lr-reader body{max-width:840px!important} }'
  ].join('\n');
  document.head.appendChild(css);

  // --- sentence wrapping ---
  var blocks = Array.prototype.slice.call(document.querySelectorAll('p, li, blockquote'))
    .filter(function (b) { return !b.closest('pre, code, .lr-ui, .lr-sheet, .lsd, nav, header, footer') && b.textContent.trim().length > 30 && !b.querySelector('p, li'); });
  var END = /([.!?…]["”’)]?)(\s+)/g;
  blocks.forEach(function (b, bi) {
    var sid = 0, walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (t) {
      if (!t.nodeValue.trim()) return;
      var parts = [], last = 0, m, txt = t.nodeValue;
      while ((m = END.exec(txt))) { parts.push([txt.slice(last, m.index + m[1].length), true]); parts.push([m[2], false]); last = m.index + m[0].length; }
      if (last < txt.length) parts.push([txt.slice(last), false]);
      var frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p[0].trim()) { frag.appendChild(document.createTextNode(p[0])); return; }
        var s = document.createElement('span'); s.className = 'lr-s'; s.dataset.id = bi + ':' + sid; s.textContent = p[0];
        frag.appendChild(s); if (p[1]) sid++;
      });
      t.parentNode.replaceChild(frag, t);
    });
  });

  function paint() {
    var on = {};
    flags.forEach(function (f) { (f.sids || [f.id]).forEach(function (s) { on[s] = 1; }); });
    document.querySelectorAll('.lr-s').forEach(function (s) { s.classList.toggle('on', !!on[s.dataset.id]); });
    setGlyph(flagBtn, '⚑'); setLabel(flagBtn, flags.length ? 'Saved · ' + flags.length : 'Saved');
    renderSheet();
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(flags)); paint(); }
  function textOf(id) { return Array.prototype.map.call(document.querySelectorAll('.lr-s[data-id="' + id + '"]'), function (s) { return s.textContent; }).join(''); }

  /* ---- bookmarking is selection-driven: nothing is saved by a stray tap ---- */
  var pop = document.createElement('div'); pop.className = 'lr-pop';
  var popBtn = document.createElement('button'); popBtn.type = 'button';
  pop.appendChild(popBtn); document.body.appendChild(pop);
  var popAction = null, curRange = null, popBelow = false;

  function vv() { return window.visualViewport || { width: window.innerWidth, height: window.innerHeight, offsetLeft: 0, offsetTop: 0 }; }
  function place(rect) {
    var v = vv(), w = pop.offsetWidth, h = pop.offsetHeight;
    var x = rect.left + rect.width / 2 - w / 2;
    x = Math.min(Math.max(v.offsetLeft + 8, x), v.offsetLeft + v.width - w - 8);
    var below = rect.bottom + 12, above = rect.top - h - 12;
    var y = popBelow ? below : above;
    if (y < v.offsetTop + 8) y = below;
    if (y + h > v.offsetTop + v.height - 8) y = above;
    y = Math.min(Math.max(v.offsetTop + 8, y), v.offsetTop + v.height - h - 8);
    pop.style.left = Math.round(x) + 'px'; pop.style.top = Math.round(y) + 'px';
  }
  function showPop(rect, label, fn) {
    popBtn.textContent = label; popAction = fn;
    pop.classList.add('open');
    place(rect);
  }
  function hidePop() { pop.classList.remove('open'); popAction = null; curRange = null; }
  function reposition() {
    if (!pop.classList.contains('open')) return;
    if (!curRange) return;
    var r = curRange.getBoundingClientRect();
    if (!r.width && !r.height) return hidePop();
    place(r);
  }
  popBtn.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    if (popAction) popAction();
    hidePop();
  });
  popBtn.addEventListener('touchend', function (e) { e.preventDefault(); popBtn.click(); }, { passive: false });

  function liveRange() {
    var s = window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return null;
    if (!s.toString().replace(/\s+/g, ' ').trim()) return null;
    var r = s.getRangeAt(0);
    var host = r.commonAncestorContainer;
    if (host.nodeType === 3) host = host.parentNode;
    if (!host || !host.closest || host.closest('.lr-ui,.lr-sheet,.lr-pop,.lsd,pre,code,input,textarea')) return null;
    return r;
  }
  function sidsIn(range) {
    var out = [];
    document.querySelectorAll('.lr-s').forEach(function (s) {
      try { if (range.intersectsNode(s)) out.push(s.dataset.id); } catch (e) {}
    });
    return out;
  }

  var selT;
  function onSelect() {
    clearTimeout(selT);
    selT = setTimeout(function () {
      var r = liveRange();
      if (!r) { if (popBtn.textContent.charAt(0) === '⚑') hidePop(); return; }
      /* the study layer (extras.js: 🔖 coloured bookmarks) handles selections when it is on the page —
         one bookmark tool, and nothing sitting on the phone's selection handles */
      if (window.__cpx) return;
      var text = window.getSelection().toString().replace(/\s+/g, ' ').trim();
      var rect = r.getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      /* touch devices put their own copy/paste menu above the selection, and the
         page nudges itself as the handles appear — sit below, and follow it */
      popBelow = matchMedia('(pointer:coarse)').matches;
      curRange = r;
      showPop(rect, '⚑ Bookmark', function () {
        var sids = sidsIn(r);
        flags.push({ id: 'b' + Date.now().toString(36), text: text, sids: sids, at: Date.now() });
        var sel = window.getSelection(); if (sel.removeAllRanges) sel.removeAllRanges();
        save();
      });
    }, 160);
  }
  document.addEventListener('selectionchange', onSelect);
  document.addEventListener('mouseup', onSelect);
  document.addEventListener('touchend', onSelect);
  window.addEventListener('scroll', reposition, { passive: true });
  window.addEventListener('resize', reposition);
  if (window.visualViewport) {
    visualViewport.addEventListener('scroll', reposition);
    visualViewport.addEventListener('resize', reposition);
  }

  /* tapping an existing highlight offers to remove it */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.lr-pop')) return;
    var s = e.target.closest('.lr-s.on');
    if (!s || e.target.closest('a')) { if (!liveRange()) hidePop(); return; }
    if (liveRange()) return;
    var sid = s.dataset.id;
    popBelow = matchMedia('(pointer:coarse)').matches;
    curRange = null;
    showPop(s.getBoundingClientRect(), '✕ Remove', function () {
      flags = flags.filter(function (f) { return (f.sids || [f.id]).indexOf(sid) < 0; });
      save();
    });
  });

  // --- UI ---
  var ui = document.createElement('div'); ui.className = 'lr-ui'; ui.setAttribute('role', 'toolbar'); ui.setAttribute('aria-label', 'Reading tools');
  var readBtn = btn('Aa', 'Reader', toggleReader),
      minus = btn('A−', 'Smaller', function () { setSize(size - 1); }),
      plus = btn('A+', 'Larger', function () { setSize(size + 1); }),
      themeBtn = btn('◐', 'Theme', cycleTheme),
      flagBtn = btn('⚑', 'Saved', function () {
        /* with the study layer on the page, bookmarks live in its 🔖 list — open that instead,
           unless there are older ⚑ bookmarks to show */
        var fab = window.__cpx && document.querySelector('#cpx-fab button');
        if (fab && !flags.length) { sheet.classList.remove('open'); setTimeout(function () { fab.click(); }, 0); return; }   // after this tap's outside-click close
        sheet.classList.toggle('open');
      });
  ui.appendChild(readBtn); ui.appendChild(minus); ui.appendChild(plus); ui.appendChild(themeBtn); ui.appendChild(flagBtn); document.body.appendChild(ui);
  var sheet = document.createElement('div'); sheet.className = 'lr-sheet'; document.body.appendChild(sheet);
  /* every button is glyph + 12px label; setLabel() changes the label, setGlyph() the glyph */
  function btn(g, l, fn) {
    var b = document.createElement('button'); b.type = 'button';
    var gs = document.createElement('span'); gs.className = 'lr-g'; gs.textContent = g;
    var ls = document.createElement('span'); ls.className = 'lr-l'; ls.textContent = l;
    b.appendChild(gs); b.appendChild(ls); b.setAttribute('aria-label', l); b.onclick = fn; return b;
  }
  function setLabel(b, l) { b.querySelector('.lr-l').textContent = l; b.setAttribute('aria-label', l); }
  function setGlyph(b, g) { b.querySelector('.lr-g').textContent = g; }
  /* theme: light → dark → system, via lib/theme.js (loaded in <head>) */
  function paintTheme() {
    var T = window.CPTheme; if (!T) { themeBtn.style.display = 'none'; return; }
    var m = T.get(); setLabel(themeBtn, m === 'dark' ? 'Dark' : m === 'system' ? 'Auto' : 'Light');
    setGlyph(themeBtn, m === 'dark' ? '●' : m === 'system' ? '◐' : '○');
  }
  function cycleTheme() { if (window.CPTheme) { window.CPTheme.cycle(); paintTheme(); } }
  paintTheme();

  function renderSheet() {
    var h = '<h3><span>Bookmarks · ' + flags.length + '</span><span><button data-act="copy">copy</button> · <button data-act="close">close</button></span></h3>';
    if (!flags.length) h += '<p class="empty">Select any text, then tap <b>⚑ Bookmark</b>.</p>';
    else h += '<ul style="margin:0;padding:0">' + flags.map(function (f) { return '<li><a data-go="' + esc((f.sids || [f.id])[0] || '') + '">' + esc(f.text) + '</a><b data-rm="' + esc(f.id) + '">✕</b></li>'; }).join('') + '</ul>';
    sheet.innerHTML = h;
  }
  sheet.addEventListener('click', function (e) {
    var t = e.target;
    if (t.dataset.act === 'close') sheet.classList.remove('open');
    if (t.dataset.act === 'copy') navigator.clipboard && navigator.clipboard.writeText(flags.map(function (f) { return '• ' + f.text; }).join('\n'));
    if (t.dataset.rm) { flags = flags.filter(function (f) { return f.id !== t.dataset.rm; }); save(); }
    if (t.dataset.go) { var el = document.querySelector('.lr-s[data-id="' + t.dataset.go + '"]'); if (el) { sheet.classList.remove('open'); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); } }
  });
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function setSize(n) { size = Math.max(15, Math.min(28, n)); document.documentElement.style.setProperty('--lr-size', size + 'px'); pref.size = size; localStorage.setItem(PREF, JSON.stringify(pref)); }
  function flatten() {
    document.querySelectorAll('body *').forEach(function (el) {
      if (el.closest('.lr-ui, .lr-sheet, .lsd, pre, code, svg')) return;
      var cs = getComputedStyle(el);
      if (cs.backgroundImage !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent' && el.children.length)) el.classList.add('lr-flat');
    });
  }
  var flattened = false;
  function toggleReader(force) {
    var on = typeof force === 'boolean' ? force : !document.documentElement.classList.contains('lr-reader');
    if (on && !flattened) { flatten(); flattened = true; }
    document.documentElement.classList.toggle('lr-reader', on); readBtn.classList.toggle('on', on);
    pref.reader = on; localStorage.setItem(PREF, JSON.stringify(pref));
  }

  /* ===== Phase 0 — account panel becomes a chip; floaters clear the home bar ===== */
  var authPanel = null, authChip = null;
  function findAuth() {
    /* reading-sync.js owns this bar; match it by id first and fall back to a
       shape match so a rename cannot silently break the fix. */
    var known = document.getElementById('reading-sync-bar');
    if (known && getComputedStyle(known).position === 'fixed') return known;
    var els = document.body.querySelectorAll('div,section,aside,footer,form');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('.lr-ui,.lr-sheet,.lsd')) continue;
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t || t.length > 170) continue;
      if (!/sign\s?out|sign\s?in/i.test(t)) continue;
      if (getComputedStyle(el).position !== 'fixed') continue;
      return el; // document order gives the outermost fixed wrapper first
    }
    return null;
  }
  function setAuthOpen(on) {
    document.documentElement.classList.toggle('lr-auth-open', on);
    if (authChip) authChip.classList.toggle('on', on);
  }
  function dockAuth() {
    var p = findAuth();
    if (!p) return;
    if (p !== authPanel) {
      authPanel = p;
      p.classList.add('lr-auth-dock', 'lr-safe');
      /* patched reading-sync collapses itself to a chip on phones; the pill's ✓
         already is that chip, so ask the bar for its expanded form */
      p.classList.add('rs-open');
    }
    if (!authChip) {
      authChip = btn('✓', 'Account', function () { setAuthOpen(!document.documentElement.classList.contains('lr-auth-open')); });
      authChip.className = 'lr-authchip';
      authChip.title = 'Account & cloud sync';
      ui.appendChild(authChip);
    }
    var signedIn = /sign\s?out/i.test(authPanel.textContent || '');
    setGlyph(authChip, signedIn ? '✓' : '○'); setLabel(authChip, signedIn ? 'Account' : 'Sign in');
    authChip.classList.toggle('off', !signedIn);
  }
  document.addEventListener('click', function (e) {
    if (!authPanel || !document.documentElement.classList.contains('lr-auth-open')) return;
    if (e.target.closest('.lr-auth-dock') || e.target === authChip) return;
    setAuthOpen(false);
  }, true);
  /* reading-sync's own collapse chip is redundant once the panel is docked */
  var hideRsToggle = document.createElement('style');
  hideRsToggle.textContent = '.lr-auth-dock .rs-toggle{display:none!important}';
  document.head.appendChild(hideRsToggle);

  /* lift fixed bottom-anchored floaters (★ bookmark, pin, toasts) above the home bar */
  function liftFloaters() {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.classList.contains('lr-safe') || el.classList.contains('lr-ui') || el.classList.contains('lr-sheet')) return;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.bottom === 'auto') return;
      if (cs.top !== 'auto' && parseFloat(cs.top) < 60) return;   // full-screen overlays (the quiz) are not floaters
      if (parseFloat(cs.bottom) > 160) return;
      el.classList.add('lr-safe');
      var r = el.getBoundingClientRect();
      if (r.left + r.width / 2 > window.innerWidth / 2) el.classList.add('lr-right');
    });
  }

  var pending = 0;
  function sweep() {
    if (pending) return;
    pending = setTimeout(function () { pending = 0; try { dockAuth(); liftFloaters(); } catch (e) { console.warn('lesson-reader sweep', e); } }, 0);
  }
  try {
    var mo = new MutationObserver(sweep);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    setTimeout(function () { mo.disconnect(); }, 25000);
  } catch (e) {}
  sweep(); setTimeout(sweep, 800); setTimeout(sweep, 2500);

  /* ===== Phase 1 — append the lesson's drills, if a drill file exists ===== */
  var LID = (FILE.match(/Py_Lesson_(\d+_\d+)\.html/i) || [])[1];
  function load(src, cb) {
    var s = document.createElement('script');
    s.src = src; s.onload = function () { cb(true); }; s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }
  function bootDrills() {
    if (!LID) return;
    load(LIB + 'drills/' + LID + '.js', function (ok) {
      if (!ok || !window.LESSON_DRILL_DATA) return;
      var link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = LIB + 'lesson-drills.css';
      document.head.appendChild(link);
      load(LIB + 'random/fd.js', function (ok2) {
        if (!ok2) return;
        load(LIB + 'lesson-drills.js', function (ok3) {
          if (ok3 && window.LESSON_DRILLS) window.LESSON_DRILLS.mount(window.LESSON_DRILL_DATA, LID);
        });
      });
    });
  }

  setSize(size); if (pref.reader) toggleReader(true); paint(); bootDrills();
})();
