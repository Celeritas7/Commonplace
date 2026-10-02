/* lesson-reader.js — drop-in for every lesson page.
   <script src="../lib/lesson-reader.js" defer></script>
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
    '.lr-s.on{background:#f3d9a4;box-shadow:0 0 0 2px #f3d9a4;color:#211b13;cursor:pointer}',
    '.lr-pop{position:fixed;z-index:2147483000;display:none;gap:4px;padding:4px;background:#211b13;border-radius:999px;box-shadow:0 10px 26px -10px rgba(0,0,0,.55);font:700 11px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.6px;-webkit-user-select:none;user-select:none;touch-action:manipulation}',
    '.lr-pop.open{display:flex}',
    '.lr-pop button{all:unset;cursor:pointer;min-height:36px;padding:0 15px;border-radius:999px;color:#f6f0e2;line-height:36px;white-space:nowrap}',
    '.lr-pop button:active{background:rgba(255,255,255,.16)}',
    '.lr-ui{position:fixed;top:10px;right:10px;z-index:99999;display:flex;gap:4px;padding:4px;background:#f6f0e2;border:1px solid #cdbfa3;border-radius:999px;box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 10px 22px -18px rgba(40,30,15,.5);font:700 11px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.5px}',
    '.lr-ui button{all:unset;cursor:pointer;min-width:34px;height:32px;padding:0 10px;border-radius:999px;color:#564b3a;text-align:center;line-height:32px}',
    '.lr-ui button.on{background:#8a2f22;color:#f6f0e2}',
    '.lr-ui button.lr-authchip{color:#1f8a4e}',
    '.lr-ui button.lr-authchip.on{color:#f6f0e2}',
    '.lr-sheet{position:fixed;left:0;right:0;bottom:0;z-index:99998;max-height:60vh;overflow:auto;background:#f6f0e2;border-top:1px solid #cdbfa3;box-shadow:0 -10px 26px -18px rgba(40,30,15,.5);padding:14px 16px calc(24px + env(safe-area-inset-bottom,0px));font-family:"EB Garamond",Georgia,serif;color:#211b13;display:none}',
    '.lr-sheet.open{display:block}',
    '.lr-sheet h3{margin:0 0 10px;font:700 11px/1 "JetBrains Mono",monospace;letter-spacing:1.5px;text-transform:uppercase;color:#8a2f22;display:flex;justify-content:space-between;align-items:center;gap:12px}',
    '.lr-sheet h3>span{white-space:nowrap}',
    '.lr-sheet h3 button{all:unset;cursor:pointer;color:#8a7c63;font-size:11px;letter-spacing:.5px}',
    '.lr-sheet li{list-style:none;display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #ddd1b8;font-size:16px;line-height:1.45}',
    '.lr-sheet li a{flex:1;color:#211b13;text-decoration:none;cursor:pointer}',
    '.lr-sheet li b{all:unset;cursor:pointer;color:#8a7c63;font:700 12px "JetBrains Mono",monospace}',
    '.lr-sheet p.empty{color:#8a7c63;font-style:italic;margin:4px 0}',
    /* Phase 0 — the account panel is hidden until its chip is tapped */
    '.lr-auth-dock{opacity:0!important;pointer-events:none!important;transform:translateY(14px)!important;transition:opacity .16s ease,transform .16s ease}',
    'html.lr-auth-open .lr-auth-dock{opacity:1!important;pointer-events:auto!important;transform:none!important}',
    /* docked, it hangs under the pill instead of fighting it for the same corner */
    '.lr-auth-dock{top:52px!important;right:10px!important;left:auto!important;bottom:auto!important}',
    '@media (max-width:600px){.lr-auth-dock{left:8px!important;right:8px!important;top:50px!important}}',
    '.lr-safe{margin-bottom:env(safe-area-inset-bottom,0px)!important}',
    /* reader mode */
    'html.lr-reader,html.lr-reader body{background:#efe7d6!important;color:#211b13!important}',
    'html.lr-reader .lr-flat{background:#f6f0e2!important;background-image:none!important;color:#211b13!important;box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 10px 26px -18px rgba(40,30,15,.5)!important;border:1px solid #cdbfa3!important;border-radius:5px!important;backdrop-filter:none!important}',
    'html.lr-reader .lr-flat *{color:inherit}',
    'html.lr-reader p,html.lr-reader li,html.lr-reader blockquote{font-family:"EB Garamond",Georgia,serif!important;font-size:var(--lr-size,19px)!important;line-height:1.5!important;color:#211b13!important;max-width:34em;letter-spacing:0!important}',
    'html.lr-reader h1,html.lr-reader h2,html.lr-reader h3{font-family:"Cormorant Garamond",Georgia,serif!important;font-weight:600!important;line-height:1.05!important;letter-spacing:-.3px!important;color:#211b13!important;background:none!important;-webkit-text-fill-color:#211b13!important}',
    'html.lr-reader h1{font-size:calc(var(--lr-size,19px)*2)!important}',
    'html.lr-reader h2{font-size:calc(var(--lr-size,19px)*1.5)!important}',
    'html.lr-reader h3{font-size:calc(var(--lr-size,19px)*1.2)!important}',
    'html.lr-reader strong{color:#8a2f22!important}',
    'html.lr-reader pre,html.lr-reader code{font-family:"JetBrains Mono",ui-monospace,monospace!important}',
    'html.lr-reader *{animation:none!important;transition:none!important}',
    /* the drill section keeps its own look even in reader mode */
    'html.lr-reader .lsd .fd-code,html.lr-reader .lsd .fd-b{font-family:"JetBrains Mono",ui-monospace,monospace!important}',
    'html.lr-reader .lsd .fd-ask,html.lr-reader .lsd .lsd-concept,html.lr-reader .lsd .fd-opt,html.lr-reader .lsd .fd-v{max-width:none}',
    /* wide screens: PC + iPad — one centered column, not a full-width stretch */
    '@media (min-width:820px){',
    ' html.lr-reader body{max-width:780px!important;margin:0 auto!important;padding:40px 32px 96px!important;box-sizing:border-box}',
    ' html.lr-reader p,html.lr-reader li,html.lr-reader blockquote{font-size:calc(var(--lr-size,19px) + 1px)!important;max-width:38em}',
    ' .lr-ui{top:14px;right:18px}',
    ' .lr-sheet{left:auto;right:18px;bottom:18px;width:420px;max-height:66vh;border:1px solid #cdbfa3;border-radius:5px}',
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
    flagBtn.textContent = '⚑ ' + flags.length;
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
  var ui = document.createElement('div'); ui.className = 'lr-ui';
  var readBtn = btn('Aa', toggleReader), minus = btn('−', function () { setSize(size - 1); }), plus = btn('+', function () { setSize(size + 1); }), flagBtn = btn('⚑ 0', function () { sheet.classList.toggle('open'); });
  ui.appendChild(readBtn); ui.appendChild(minus); ui.appendChild(plus); ui.appendChild(flagBtn); document.body.appendChild(ui);
  var sheet = document.createElement('div'); sheet.className = 'lr-sheet'; document.body.appendChild(sheet);
  function btn(t, fn) { var b = document.createElement('button'); b.textContent = t; b.onclick = fn; return b; }

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
      authChip = btn('✓', function () { setAuthOpen(!document.documentElement.classList.contains('lr-auth-open')); });
      authChip.className = 'lr-authchip';
      authChip.title = 'Account & cloud sync';
      ui.insertBefore(authChip, flagBtn);
    }
    authChip.textContent = /sign\s?out/i.test(authPanel.textContent || '') ? '✓' : '○';
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
      if (parseFloat(cs.bottom) > 160) return;
      el.classList.add('lr-safe');
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
