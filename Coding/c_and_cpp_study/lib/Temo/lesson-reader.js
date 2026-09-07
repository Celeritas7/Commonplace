/* lesson-reader.js — drop-in for every lesson page.
   <script src="../lib/lesson-reader.js" defer></script>
   Adds: (1) Reader mode — flat paper, serif, comfortable measure; (2) tap any sentence to flag it;
   flags persist per lesson in localStorage and list in a bottom sheet. */
(function () {
  var KEY = 'lr:flags:' + location.pathname.split('/').pop();
  var PREF = 'lr:pref';
  var pref = {}; try { pref = JSON.parse(localStorage.getItem(PREF) || '{}'); } catch (e) {}
  var flags = []; try { flags = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
  var size = pref.size || 19;

  var css = document.createElement('style');
  css.textContent = [
    '.lr-s{cursor:pointer;border-radius:2px;transition:background .15s}',
    '.lr-s:hover{background:rgba(138,47,34,.08)}',
    '.lr-s.on{background:#f3d9a4;box-shadow:0 0 0 2px #f3d9a4;color:#211b13}',
    '.lr-ui{position:fixed;top:10px;right:10px;z-index:99999;display:flex;gap:4px;padding:4px;background:#f6f0e2;border:1px solid #cdbfa3;border-radius:999px;box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 10px 22px -18px rgba(40,30,15,.5);font:700 11px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.5px}',
    '.lr-ui button{all:unset;cursor:pointer;min-width:34px;height:32px;padding:0 10px;border-radius:999px;color:#564b3a;text-align:center;line-height:32px}',
    '.lr-ui button.on{background:#8a2f22;color:#f6f0e2}',
    '.lr-sheet{position:fixed;left:0;right:0;bottom:0;z-index:99998;max-height:60vh;overflow:auto;background:#f6f0e2;border-top:1px solid #cdbfa3;box-shadow:0 -10px 26px -18px rgba(40,30,15,.5);padding:14px 16px 24px;font-family:"EB Garamond",Georgia,serif;color:#211b13;display:none}',
    '.lr-sheet.open{display:block}',
    '.lr-sheet h3{margin:0 0 10px;font:700 11px/1 "JetBrains Mono",monospace;letter-spacing:1.5px;text-transform:uppercase;color:#8a2f22;display:flex;justify-content:space-between;align-items:center}',
    '.lr-sheet h3 button{all:unset;cursor:pointer;color:#8a7c63;font-size:11px;letter-spacing:.5px}',
    '.lr-sheet li{list-style:none;display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #ddd1b8;font-size:16px;line-height:1.45}',
    '.lr-sheet li a{flex:1;color:#211b13;text-decoration:none;cursor:pointer}',
    '.lr-sheet li b{all:unset;cursor:pointer;color:#8a7c63;font:700 12px "JetBrains Mono",monospace}',
    '.lr-sheet p.empty{color:#8a7c63;font-style:italic;margin:4px 0}',
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
    .filter(function (b) { return !b.closest('pre, code, .lr-ui, .lr-sheet, nav, header, footer') && b.textContent.trim().length > 30 && !b.querySelector('p, li'); });
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
    var on = {}; flags.forEach(function (f) { on[f.id] = 1; });
    document.querySelectorAll('.lr-s').forEach(function (s) { s.classList.toggle('on', !!on[s.dataset.id]); });
    flagBtn.textContent = '⚑ ' + flags.length;
    renderSheet();
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(flags)); paint(); }
  function textOf(id) { return Array.prototype.map.call(document.querySelectorAll('.lr-s[data-id="' + id + '"]'), function (s) { return s.textContent; }).join(''); }

  document.addEventListener('click', function (e) {
    var s = e.target.closest('.lr-s'); if (!s || e.target.closest('a')) return;
    var id = s.dataset.id, i = flags.findIndex(function (f) { return f.id === id; });
    if (i > -1) flags.splice(i, 1); else flags.push({ id: id, text: textOf(id), at: Date.now() });
    save();
  });

  // --- UI ---
  var ui = document.createElement('div'); ui.className = 'lr-ui';
  var readBtn = btn('Aa', toggleReader), minus = btn('−', function () { setSize(size - 1); }), plus = btn('+', function () { setSize(size + 1); }), flagBtn = btn('⚑ 0', function () { sheet.classList.toggle('open'); });
  ui.appendChild(readBtn); ui.appendChild(minus); ui.appendChild(plus); ui.appendChild(flagBtn); document.body.appendChild(ui);
  var sheet = document.createElement('div'); sheet.className = 'lr-sheet'; document.body.appendChild(sheet);
  function btn(t, fn) { var b = document.createElement('button'); b.textContent = t; b.onclick = fn; return b; }

  function renderSheet() {
    var h = '<h3><span>Flagged · ' + flags.length + '</span><span><button data-act="copy">copy</button> · <button data-act="close">close</button></span></h3>';
    if (!flags.length) h += '<p class="empty">Tap any sentence to flag it.</p>';
    else h += '<ul style="margin:0;padding:0">' + flags.map(function (f) { return '<li><a data-go="' + f.id + '">' + esc(f.text) + '</a><b data-rm="' + f.id + '">✕</b></li>'; }).join('') + '</ul>';
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
      if (el.closest('.lr-ui, .lr-sheet, pre, code, svg')) return;
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
  setSize(size); if (pref.reader) toggleReader(true); paint();
})();
