/* lesson-reader.js — drop-in for every lesson page.
   <script src="../lib/lesson-reader.js" defer></script>
   (1) Reader mode (on by default): flat paper, serif, comfortable measure.
   (2) Tap any sentence to flag it; flags persist per lesson and list in a sheet. */
(function () {
  var KEY = 'lr:flags:' + location.pathname.split('/').pop();
  var PREF = 'lr:pref';
  var pref = {}; try { pref = JSON.parse(localStorage.getItem(PREF) || '{}'); } catch (e) {}
  var flags = []; try { flags = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
  if (pref.v !== 2) { pref.reader = false; pref.v = 2; localStorage.setItem(PREF, JSON.stringify(pref)); } // clear the paper look forced by the old build
  var size = pref.size || (window.innerWidth < 520 ? 17 : 19);  // narrower screen -> smaller start, still fully adjustable
  var SH = '0 1px 0 rgba(255,255,255,.7) inset,0 10px 26px -18px rgba(40,30,15,.55)';
  var MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,monospace';

  var css = document.createElement('style');
  css.textContent = [
    '.lr-s{cursor:pointer;border-radius:2px}',
    '@media (hover:hover){.lr-s:hover{background:rgba(138,47,34,.08)}}',
    '.lr-s.on{background:#f3d9a4;box-shadow:0 0 0 2px #f3d9a4;color:#211b13!important}',

    /* ---- floating control: one thumb-reachable button, bottom right ---- */
    '.lr-fab{position:fixed;right:12px;bottom:calc(var(--lr-bar,0px) + 92px + env(safe-area-inset-bottom,0px));z-index:2147483000;width:48px;height:48px;border-radius:999px;border:1px solid #cdbfa3;background:#f6f0e2;color:#564b3a;box-shadow:' + SH + ';font:700 13px/1 ' + MONO + ';display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}',
    '.lr-fab b{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:999px;background:#8a2f22;color:#f6f0e2;font:700 10px/18px ' + MONO + ';text-align:center;display:none}',
    '.lr-fab b.show{display:block}',
    '.lr-hint{position:fixed;right:66px;bottom:calc(var(--lr-bar,0px) + 38px + env(safe-area-inset-bottom,0px));z-index:2147483000;background:#211b13;color:#f6f0e2;font:700 11px/1 ' + MONO + ';letter-spacing:.5px;padding:9px 11px;border-radius:3px;white-space:nowrap;box-shadow:0 8px 20px -12px rgba(0,0,0,.6)}',
    '.lr-panel{position:fixed;right:12px;bottom:calc(var(--lr-bar,0px) + 82px + env(safe-area-inset-bottom,0px));z-index:2147483000;width:min(216px,calc(100vw - 24px));box-sizing:border-box;background:#f6f0e2;border:1px solid #cdbfa3;border-radius:5px;box-shadow:' + SH + ';padding:6px;display:none;font:700 11px/1 ' + MONO + ';letter-spacing:.6px}',
    '.lr-panel.open{display:block}',
    '.lr-row{display:flex;gap:6px;align-items:center}',
    '.lr-row + .lr-row{margin-top:6px}',
    '.lr-panel button{all:unset;box-sizing:border-box;cursor:pointer;height:38px;min-width:38px;flex:1;border-radius:3px;border:1px solid #ddd1b8;color:#564b3a;text-align:center;line-height:36px;font:inherit;background:#fdfaf1}',
    '.lr-panel button.on{background:#8a2f22;border-color:#8a2f22;color:#f6f0e2}',
    '.lr-panel .lr-lab{color:#8a7c63;font:700 9px/1.4 ' + MONO + ';letter-spacing:1.4px;padding:2px 2px 0}',

    /* ---- flag sheet ---- */
    '.lr-sheet{position:fixed;left:0;right:0;bottom:0;z-index:2147482999;max-height:62vh;overflow:auto;box-sizing:border-box;background:#f6f0e2;border-top:1px solid #cdbfa3;box-shadow:0 -10px 26px -18px rgba(40,30,15,.5);padding:14px 16px calc(24px + env(safe-area-inset-bottom,0px));font-family:"EB Garamond",Georgia,serif;color:#211b13;display:none}',
    '.lr-sheet.open{display:block}',
    '.lr-sheet .lr-h{margin:0 0 10px;font:700 11px/1.4 ' + MONO + ';letter-spacing:1.5px;text-transform:uppercase;color:#8a2f22;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}',
    '.lr-sheet .lr-h button{all:unset;cursor:pointer;color:#8a7c63;font:700 11px/1.4 ' + MONO + ';letter-spacing:.5px}',
    '.lr-sheet .lr-list{margin:0;padding:0}',
    '.lr-sheet .lr-item{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid #ddd1b8;font:400 16px/1.45 "EB Garamond",Georgia,serif;color:#211b13}',
    '.lr-sheet .lr-item a{flex:1;color:#211b13;text-decoration:none;cursor:pointer}',
    '.lr-sheet .lr-item b{all:unset;cursor:pointer;color:#8a7c63;font:700 13px ' + MONO + ';padding:2px 6px}',
    '.lr-sheet .lr-empty{color:#8a7c63;font:italic 400 16px/1.45 "EB Garamond",Georgia,serif;margin:4px 0}',

    /* ---- comfort mode: keeps the page's own colours, fixes only reading ---- */
    'html.lr-comfy p,html.lr-comfy li,html.lr-comfy blockquote{font-size:var(--lr-size,19px)!important;line-height:1.58!important;letter-spacing:0!important;text-wrap:pretty;overflow-wrap:break-word}',
    '@media (min-width:520px){html.lr-comfy p,html.lr-comfy li,html.lr-comfy blockquote{line-height:1.62!important;max-width:36em}}',
    /* nothing may push the page sideways on mobile */
    'html.lr-comfy,html.lr-comfy body{overflow-x:hidden!important;max-width:100%!important}',
    'html.lr-comfy table{display:block;overflow-x:auto;max-width:100%}',
    'html.lr-comfy h1{font-size:clamp(26px,7.2vw,42px)!important;line-height:1.12!important;letter-spacing:-.4px!important}',
    'html.lr-comfy h2{font-size:clamp(21px,5.4vw,32px)!important;line-height:1.16!important}',
    'html.lr-comfy h3{font-size:clamp(18px,4.4vw,24px)!important;line-height:1.2!important}',
    'html.lr-comfy pre,html.lr-comfy code{font-size:calc(var(--lr-size,19px) - 4px)!important}',
    'html.lr-comfy pre{overflow-x:auto}',
    'html.lr-comfy img,html.lr-comfy svg{max-width:100%!important;height:auto}',
    '@media (min-width:820px){html.lr-comfy p,html.lr-comfy li,html.lr-comfy blockquote{max-width:38em}}',

    /* ---- reader mode (opt-in paper look) ---- */
    'html.lr-reader,html.lr-reader body{background:#efe7d6!important;color:#211b13!important}',
    'html.lr-reader body{padding:18px 14px 96px!important;box-sizing:border-box}',
    'html.lr-reader .lr-flat{background:#f6f0e2!important;background-image:none!important;color:#211b13!important;box-shadow:' + SH + '!important;border:1px solid #cdbfa3!important;border-radius:5px!important;backdrop-filter:none!important;padding:16px 18px!important;margin-left:0!important;margin-right:0!important}',
    'html.lr-reader .lr-flat *{color:inherit}',
    'html.lr-reader p,html.lr-reader li,html.lr-reader blockquote{font-family:"EB Garamond",Georgia,serif!important;font-size:var(--lr-size,19px)!important;line-height:1.5!important;color:#211b13!important;letter-spacing:0!important;margin:0 0 .7em!important;text-wrap:pretty}',
    'html.lr-reader h1,html.lr-reader h2,html.lr-reader h3{font-family:"Cormorant Garamond",Georgia,serif!important;font-weight:600!important;line-height:1.04!important;letter-spacing:-.4px!important;color:#211b13!important;background:none!important;-webkit-text-fill-color:#211b13!important;margin:0 0 .45em!important;text-transform:none!important}',
    'html.lr-reader h1{font-size:calc(var(--lr-size,19px)*1.95)!important}',
    'html.lr-reader h2{font-size:calc(var(--lr-size,19px)*1.5)!important}',
    'html.lr-reader h3{font-size:calc(var(--lr-size,19px)*1.18)!important}',
    'html.lr-reader strong{color:#8a2f22!important;font-weight:600!important}',
    'html.lr-reader em{font-style:italic!important}',
    'html.lr-reader pre,html.lr-reader code{font-family:' + MONO + '!important;font-size:calc(var(--lr-size,19px) - 4px)!important}',
    'html.lr-reader pre{background:#f1ebdb!important;border:1px solid #cdbfa3!important;border-radius:3px!important;padding:12px!important;overflow-x:auto}',
    'html.lr-reader *{animation:none!important;transition:none!important;text-shadow:none!important}',
    'html.lr-reader img,html.lr-reader svg{max-width:100%!important;height:auto}',

    /* wide screens: PC + iPad — one centred column, never a full-bleed stretch */
    '@media (min-width:820px){',
    ' html.lr-reader body{max-width:800px!important;margin:0 auto!important;padding:44px 36px 110px!important}',
    ' html.lr-reader p,html.lr-reader li,html.lr-reader blockquote{font-size:calc(var(--lr-size,19px) + 1px)!important;max-width:38em}',
    ' html.lr-reader .lr-flat{padding:24px 28px!important}',
    ' .lr-fab{right:20px;bottom:20px;width:50px;height:50px}',
    ' .lr-panel{right:20px;bottom:80px;width:230px}',
    ' .lr-sheet{left:auto;right:20px;bottom:20px;width:430px;max-height:66vh;border:1px solid #cdbfa3;border-radius:5px;box-shadow:' + SH + '}',
    '}',
    '@media (min-width:1280px){ html.lr-reader body{max-width:860px!important} }'
  ].join('\n');
  document.head.appendChild(css);

  // --- sentence wrapping ---
  var blocks = Array.prototype.slice.call(document.querySelectorAll('p, li, blockquote'))
    .filter(function (b) { return !b.closest('pre, code, .lr-fab, .lr-panel, .lr-sheet, nav, header, footer') && b.textContent.trim().length > 30 && !b.querySelector('p, li'); });
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

  // --- UI: one FAB -> small panel; flags open a sheet ---
  var fab = document.createElement('button'); fab.className = 'lr-fab'; fab.setAttribute('aria-label', 'Reading controls');
  fab.innerHTML = 'Aa<b></b>';
  var badge = fab.querySelector('b');
  var panel = document.createElement('div'); panel.className = 'lr-panel';
  panel.innerHTML =
    '<div class="lr-lab">READING</div>' +
    '<div class="lr-row"><button data-act="minus">A −</button><button data-act="plus">A +</button></div>' +
    '<div class="lr-row"><button data-act="comfy">COMFORT</button></div>' +
    '<div class="lr-row"><button data-act="reader">PAPER</button></div>' +
    '<div class="lr-lab">FLAGS</div>' +
    '<div class="lr-row"><button data-act="flags">⚑ <span data-n>0</span></button></div>';
  var sheet = document.createElement('div'); sheet.className = 'lr-sheet';
  document.body.appendChild(fab); document.body.appendChild(panel); document.body.appendChild(sheet);
  var readBtn = panel.querySelector('[data-act="reader"]'), comfyBtn = panel.querySelector('[data-act="comfy"]'), nEl = panel.querySelector('[data-n]');

  fab.onclick = function () { panel.classList.toggle('open'); };
  panel.addEventListener('click', function (e) {
    var a = (e.target.closest('button') || {}).dataset;
    if (!a) return;
    if (a.act === 'reader') toggleReader();
    if (a.act === 'comfy') toggleComfy();
    if (a.act === 'minus') setSize(size - 1);
    if (a.act === 'plus') setSize(size + 1);
    if (a.act === 'flags') { sheet.classList.toggle('open'); panel.classList.remove('open'); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.lr-fab, .lr-panel')) panel.classList.remove('open');
  });

  function paint() {
    var on = {}; flags.forEach(function (f) { on[f.id] = 1; });
    document.querySelectorAll('.lr-s').forEach(function (s) { s.classList.toggle('on', !!on[s.dataset.id]); });
    nEl.textContent = flags.length;
    badge.textContent = flags.length; badge.classList.toggle('show', flags.length > 0);
    renderSheet();
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(flags)); paint(); }
  function textOf(id) { return Array.prototype.map.call(document.querySelectorAll('.lr-s[data-id="' + id + '"]'), function (s) { return s.textContent; }).join(''); }

  document.addEventListener('click', function (e) {
    var s = e.target.closest('.lr-s'); if (!s || e.target.closest('a, button')) return;
    var id = s.dataset.id, i = flags.findIndex(function (f) { return f.id === id; });
    if (i > -1) flags.splice(i, 1); else flags.push({ id: id, text: textOf(id), at: Date.now() });
    save();
  });

  function renderSheet() {
    var h = '<div class="lr-h"><span>Flagged · ' + flags.length + '</span><span><button data-act="copy">copy</button> · <button data-act="close">close</button></span></div>';
    if (!flags.length) h += '<div class="lr-empty">Tap any sentence in the lesson to flag it.</div>';
    else h += '<div class="lr-list">' + flags.map(function (f) { return '<div class="lr-item"><a data-go="' + f.id + '">' + esc(f.text) + '</a><b data-rm="' + f.id + '">✕</b></div>'; }).join('') + '</div>';
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
      if (el.closest('.lr-fab, .lr-panel, .lr-sheet, pre, code, svg')) return;
      var cs = getComputedStyle(el);
      if (cs.backgroundImage !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent' && el.children.length)) el.classList.add('lr-flat');
    });
  }
  function toggleComfy(force) {
    var on = typeof force === 'boolean' ? force : !document.documentElement.classList.contains('lr-comfy');
    document.documentElement.classList.toggle('lr-comfy', on); comfyBtn.classList.toggle('on', on);
    if (on) fitMobile(); else unfit();
    pref.comfy = on; localStorage.setItem(PREF, JSON.stringify(pref));
  }
  var touched = [];
  var homes = [];
  function snap(el) {
    if (el.dataset.lrStyle0 === undefined) {
      el.dataset.lrStyle0 = el.getAttribute('style') || '';
      homes.push([el, el.parentElement, el.nextSibling]);
      touched.push(el);
    }
  }
  function unfit() {
    touched.forEach(function (el) {
      var s0 = el.dataset.lrStyle0;
      if (s0 === undefined) return;
      if (s0) el.setAttribute('style', s0); else el.removeAttribute('style');
      delete el.dataset.lrStyle0;
    });
    touched = [];
    homes.forEach(function (h) { if (h[1] && h[0].parentElement !== h[1]) h[1].insertBefore(h[0], h[2] && h[2].parentElement === h[1] ? h[2] : null); });
    homes = [];
    if (strip) { strip.remove(); strip = null; }
    document.documentElement.style.setProperty('--lr-bar', '0px');
  }
  var strip = null;
  function unfloat(vw) {
    var barH = 0, movers = [];
    Array.prototype.slice.call(document.querySelectorAll('body *')).forEach(function (el) {
      if (el.closest('.lr-fab,.lr-panel,.lr-sheet,.lr-hint')) return;
      var cs = getComputedStyle(el);
      var floats = cs.position === 'fixed' || ((cs.position === 'absolute' || cs.position === 'sticky') && el.offsetParent === document.body);
      if (!floats) return;                                   // in-card absolutes (progress fills, rings) stay untouched
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      var r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      var cbW, cbH;                                          // containing block: a near-full fill is never a badge
      if (cs.position === 'fixed') { cbW = document.documentElement.clientWidth; cbH = document.documentElement.clientHeight; }
      else { var op = el.offsetParent ? el.offsetParent.getBoundingClientRect() : null; cbW = op ? op.width : vw; cbH = op ? op.height : window.innerHeight; }
      if (r.width >= cbW * 0.9 && r.height >= cbH * 0.9) return;
      if (r.width > vw * 0.92 && r.height > window.innerHeight * 0.8) return;   // full-page wrapper, leave alone
      var docked = r.width > vw * 0.6 && (window.innerHeight - r.bottom) < 60;  // bottom status bar
      snap(el);
      el.style.setProperty('position', 'static', 'important');
      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('max-width', '100%', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('box-sizing', 'border-box', 'important');
      void docked;
      if (el.parentElement === document.body) movers.push(el);   // badges and status bars both dock up top
    });
    if (movers.length) {
      strip = document.createElement('div');
      strip.setAttribute('data-lr-strip', '');
      strip.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin:0 0 14px;max-width:100%';
      var anchor = document.querySelector('body > *');
      var h = document.querySelector('h1, h2, header');
      var host = h && h.closest('body > *');
      document.body.insertBefore(strip, host ? host.nextSibling : anchor);
      movers.forEach(function (el) { strip.appendChild(el); });
    }
    void barH;
    document.documentElement.style.setProperty('--lr-bar', '0px');
  }
  function fitMobile() {
    unfit();
    if (window.innerWidth >= 820 || !document.documentElement.classList.contains('lr-comfy')) return;
    var vw = document.documentElement.clientWidth;
    document.querySelectorAll('body *').forEach(function (el) {
      if (el.closest('.lr-fab,.lr-panel,.lr-sheet,.lr-hint')) return;
      var cs = getComputedStyle(el), tag = el.tagName;
      if (cs.position === 'fixed' || cs.position === 'sticky') return;
      var hit = false;
      var willPad = (tag !== 'PRE' && tag !== 'CODE' && parseFloat(cs.paddingLeft) > 16) || parseFloat(cs.paddingTop) > 24 || el.scrollWidth > vw + 2;
      if (willPad) snap(el);
      if (tag !== 'PRE' && tag !== 'CODE' && parseFloat(cs.paddingLeft) > 16) {
        el.style.setProperty('padding-left', '13px', 'important');
        el.style.setProperty('padding-right', '13px', 'important');
        hit = true;
      }
      if (parseFloat(cs.paddingTop) > 24) {
        el.style.setProperty('padding-top', '16px', 'important');
        el.style.setProperty('padding-bottom', '16px', 'important');
        hit = true;
      }
      if (el.scrollWidth > vw + 2) {
        if (tag === 'PRE' || tag === 'TABLE') { el.style.setProperty('overflow-x', 'auto', 'important'); el.style.setProperty('max-width', '100%', 'important'); }
        else { el.style.setProperty('max-width', '100%', 'important'); el.style.setProperty('box-sizing', 'border-box', 'important'); el.style.setProperty('overflow-wrap', 'break-word', 'important'); }
        hit = true;
      }
      void hit;
    });
    unfloat(vw);
  }
  var flattened = false;
  function toggleReader(force) {
    var on = typeof force === 'boolean' ? force : !document.documentElement.classList.contains('lr-reader');
    if (on && !flattened) { flatten(); flattened = true; }
    document.documentElement.classList.toggle('lr-reader', on); readBtn.classList.toggle('on', on);
    pref.reader = on; localStorage.setItem(PREF, JSON.stringify(pref));
  }
  setSize(size);
  toggleComfy(pref.comfy !== false);   // comfort ON by default — page keeps its own colours
  toggleReader(pref.reader === true);  // paper look strictly opt-in
  paint();
  if (!pref.seen) {
    var hint = document.createElement('div'); hint.className = 'lr-hint'; hint.textContent = 'READING OPTIONS →';
    document.body.appendChild(hint);
    setTimeout(function () { hint.remove(); }, 5000);
    pref.seen = 1; localStorage.setItem(PREF, JSON.stringify(pref));
  }
  var rt; function reflow() { clearTimeout(rt); rt = setTimeout(fitMobile, 200); }
  addEventListener('resize', reflow); addEventListener('orientationchange', reflow);
})();
