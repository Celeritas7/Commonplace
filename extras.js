/* Commonplace study layer — injected by serve.py into every page. Nothing on disk is modified.
   Features: saved pages (★), reading bookmarks (🔖, multiple per page, coloured ribbons in the
   margin), text highlights, "unclear" marks, annotations. All data in localStorage; export/import. */
(function () {
  'use strict';
  if (window.__cpx) return; window.__cpx = 1;
  /* Marks are PAINTED, never inserted: every highlight/bookmark is an absolutely-positioned box in
     #cpx-layer, placed over the text with Range.getClientRects(). The page's own DOM is untouched,
     so React-rendered pages (the .dc.html modules) can re-render freely without crashing. */
  var PAGE = decodeURIComponent(location.pathname);
  var IS_HOME = PAGE === '/' || PAGE === '/index.html';
  var LSB = 'cpx.bookmarks', LSM = 'cpx.marks', LSR = 'cpx.resume';
  var RS_COLORS = { green: '#10b981', blue: '#3b82f6', red: '#ef4444', purple: '#8b5cf6', amber: '#f59e0b' };
  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function pageTitle() { return (document.title || PAGE).replace(/\s*·\s*Commonplace\s*$/, ''); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function hexA(h, a) { return 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')'; }
  function dotsHtml(attr) { return Object.keys(RS_COLORS).map(function (k) { return '<button class="cpx-dot" ' + attr + '="' + k + '" title="' + k + '" style="background:' + RS_COLORS[k] + '"></button>'; }).join(''); }
  var FONT = 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#cpx-layer{position:absolute;left:0;top:0;width:0;height:0;z-index:9989;pointer-events:none}' +
    '.cpx-r{position:absolute;pointer-events:none;border-radius:2px;box-sizing:border-box}' +
    '.cpx-r.cpx-hl{background:rgba(250,204,21,.32);box-shadow:inset 0 -2px 0 #eab308}' +
    '.cpx-r.cpx-unclear{background:rgba(239,68,68,.18);border-bottom:2px dashed #dc2626}' +
    '.cpx-r.cpx-noted{outline:1px dashed #7c3aed;outline-offset:1px}' +
    '.cpx-r.cpx-rsline{border-radius:3px}' +
    '.cpx-ribbon{position:absolute;pointer-events:auto;z-index:9990;width:16px;height:26px;clip-path:polygon(0 0,100% 0,100% 100%,50% 74%,0 100%);cursor:pointer;transition:transform .15s}' +
    '.cpx-ribbon:hover{transform:scale(1.15)}' +
    '#cpx-fab{position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;gap:8px;' + FONT + '}' +
    '#cpx-fab button{width:44px;height:44px;border-radius:50%;border:1px solid #e5e7eb;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.12);font-size:19px;cursor:pointer;line-height:1;color:#4b5563;position:relative}' +
    '#cpx-fab button:hover{border-color:#4f46e5;color:#4f46e5}' +
    '#cpx-fab button.cpx-on{background:#4f46e5;border-color:#4f46e5;color:#fff}' +
    '#cpx-fab #cpx-rs .cpx-cnt{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#059669;color:#fff;font-size:11px;font-weight:600;display:none;align-items:center;justify-content:center;padding:0 4px}' +
    '#cpx-tools{position:absolute;z-index:10000;background:#111827;color:#fff;border-radius:8px;padding:4px;display:flex;align-items:center;gap:2px;box-shadow:0 6px 20px rgba(0,0,0,.3);' + FONT + '}' +
    '#cpx-tools button{background:none;border:0;color:#fff;font-size:12.5px;padding:6px 10px;border-radius:5px;cursor:pointer;white-space:nowrap}' +
    '#cpx-tools button:hover{background:#374151}' +
    '.cpx-dot{width:20px;height:20px;border-radius:50%;border:2px solid #fff;padding:0!important;margin:0 3px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.3)}' +
    '.cpx-dot:hover{transform:scale(1.2)}' +
    '.cpx-dot.cpx-sel{outline:2px solid #111827;outline-offset:1px}' +
    '#cpx-panel{position:fixed;top:0;right:0;bottom:0;width:340px;max-width:92vw;background:#fff;border-left:1px solid #e5e7eb;box-shadow:-8px 0 30px rgba(0,0,0,.10);z-index:9998;overflow-y:auto;padding:18px 18px 30px;' + FONT + 'font-size:14px;color:#1f2937}' +
    '#cpx-panel h3{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;margin:22px 0 8px;clear:both;overflow:hidden}' +
    '#cpx-panel h3 .cpx-sw{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px}' +
    '#cpx-panel h3 .cpx-n{float:right;font-size:10.5px;letter-spacing:.6px;color:#9ca3af;background:#f3f4f6;border-radius:999px;padding:1px 7px;margin:-2px 0 0 8px}' +
    '#cpx-panel .cpx-empty{display:block;color:#9ca3af;font-size:12px;padding:2px 0 2px 16px;border-left:2px dotted #e5e7eb}' +
    '#cpx-panel .cpx-item{position:relative;border:1px solid #e9eaee;border-left:3px solid #d1d5db;border-radius:8px;padding:8px 10px 8px 31px;margin-bottom:7px;cursor:pointer;line-height:1.45;background:#fff;transition:box-shadow .12s,transform .12s}' +
    '#cpx-panel .cpx-item:hover{box-shadow:0 3px 12px rgba(17,24,39,.10);transform:translateX(-1px)}' +
    '#cpx-panel .cpx-ico{position:absolute;left:8px;top:8px;width:16px;text-align:center;font-size:11px;line-height:1.6;color:#9ca3af}' +
    '#cpx-panel .cpx-q{font-size:13px;color:#1f2937}' +
    /* per-category identity: each item echoes how that mark looks in the page */
    '#cpx-panel .cpx-k-rs{background:#f6fdfa}' +
    '#cpx-panel .cpx-k-rs .cpx-ico{font-size:12px}' +
    '#cpx-panel .cpx-k-bm{background:#f7f6ff;border-left-color:#4f46e5}' +
    '#cpx-panel .cpx-k-bm .cpx-ico{color:#4f46e5}' +
    '#cpx-panel .cpx-k-un{background:#fef6f6;border-left-color:#dc2626}' +
    '#cpx-panel .cpx-k-un .cpx-ico{color:#dc2626;font-weight:700}' +
    '#cpx-panel .cpx-k-un .cpx-q{text-decoration:underline wavy #dc2626;text-decoration-skip-ink:none;text-underline-offset:3px}' +
    '#cpx-panel .cpx-k-hl{background:#fffdf4;border-left-color:#eab308}' +
    '#cpx-panel .cpx-k-hl .cpx-ico{color:#b45309}' +
    '#cpx-panel .cpx-k-hl .cpx-q{background:#fef08a;box-shadow:0 1px 0 #eab308 inset;border-radius:2px;padding:0 2px}' +
    '#cpx-panel .cpx-tag{display:inline-block;font-size:9.5px;letter-spacing:.7px;text-transform:uppercase;font-weight:600;border-radius:3px;padding:1px 5px;margin-left:6px;vertical-align:1px;background:#ede9fe;color:#6d28d9}' +
    '#cpx-panel .cpx-item:hover{border-top-color:#dcdce6;border-right-color:#dcdce6;border-bottom-color:#dcdce6}' +
    '#cpx-panel .cpx-item small{color:#6b7280;display:block;font-size:11.5px}' +
    '#cpx-panel .cpx-note{color:#7c3aed;font-size:12.5px;margin-top:4px;white-space:pre-wrap}' +
    '#cpx-panel .cpx-x,#cpx-rsmenu .cpx-x{float:right;color:#9ca3af;border:0;background:none;cursor:pointer;font-size:14px;padding:0 2px}' +
    '#cpx-panel .cpx-x:hover,#cpx-rsmenu .cpx-x:hover{color:#dc2626}' +
    '#cpx-panel .cpx-btnrow{display:flex;gap:8px;margin-top:14px}' +
    '#cpx-panel .cpx-btnrow button{flex:1;padding:7px 0;border:1px solid #e5e7eb;background:#fff;border-radius:7px;cursor:pointer;font-size:12.5px;color:#4b5563}' +
    '#cpx-panel .cpx-btnrow button:hover{border-color:#4f46e5;color:#4f46e5}' +
    '.cpx-pip{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}' +
    '#cpx-pop{position:absolute;z-index:10001;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:12px;width:280px;' + FONT + 'font-size:13px}' +
    '#cpx-pop textarea,#cpx-pop input{width:100%;box-sizing:border-box;border:1px solid #e5e7eb;border-radius:7px;padding:7px;font:inherit}' +
    '#cpx-pop textarea{min-height:70px;resize:vertical}' +
    '#cpx-pop .cpx-row{display:flex;gap:6px;margin-top:8px;align-items:center}' +
    '#cpx-pop .cpx-row button:not(.cpx-dot){flex:1;padding:6px 0;border-radius:7px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:12.5px}' +
    '#cpx-pop .cpx-save{background:#4f46e5;border-color:#4f46e5!important;color:#fff}' +
    '#cpx-pop .cpx-del{color:#dc2626}' +
    '#cpx-rsmenu{position:fixed;right:74px;bottom:18px;z-index:10002;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.16);padding:12px;width:270px;max-height:70vh;overflow-y:auto;' + FONT + 'font-size:13px;color:#1f2937}' +
    '#cpx-rsmenu h4{margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:#6b7280}' +
    '#cpx-rsmenu .cpx-dots{display:flex;gap:4px;margin-bottom:6px}' +
    '#cpx-rsmenu .cpx-item{border:1px solid #e5e7eb;border-radius:8px;padding:7px 9px;margin-top:6px;cursor:pointer;line-height:1.4;font-size:12.5px}' +
    '#cpx-rsmenu .cpx-item:hover{border-color:#4f46e5}' +
    '#cpx-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:10002;background:#064e3b;color:#fff;border-radius:999px;padding:9px 10px 9px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 26px rgba(0,0,0,.28);' + FONT + 'font-size:13px}' +
    '#cpx-toast button{border:0;border-radius:999px;padding:6px 12px;font-size:12.5px;cursor:pointer;background:#10b981;color:#fff}' +
    '#cpx-toast button.cpx-ghost{background:rgba(255,255,255,.14);color:#d1fae5;padding:6px 10px}' +
    '.cpx-r.cpx-flash{animation:cpxflash 1.2s ease 2}' +
    '@keyframes cpxflash{50%{background:rgba(129,140,248,.55)}}';
  css.id = 'cpx-css';
  document.head.appendChild(css);
  function ensureCss() { if (!css.isConnected && document.head) document.head.appendChild(css); }

  /* ---------- text search / wrapping across nodes ---------- */
  function textNodes() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('script,style,textarea,#cpx-panel,#cpx-tools,#cpx-pop,#cpx-fab,#cpx-rsmenu,#cpx-toast,#cpx-layer,.cpx-ribbon,.katex')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var out = []; while (w.nextNode()) out.push(w.currentNode); return out;
  }
  function findOccurrence(text, occ) { // -> [{node, start, end}] or null
    if (!text) return null;
    occ = (typeof occ === 'number' && occ >= 0) ? occ : 0; // missing/NaN occ used to leave idx at -1
    var nodes = textNodes(), full = '', map = [];
    for (var i = 0; i < nodes.length; i++) { map.push({ node: nodes[i], off: full.length }); full += nodes[i].nodeValue; }
    var idx = -1, from = 0, count = -1;
    while (count < occ) { idx = full.indexOf(text, from); if (idx < 0) return null; from = idx + 1; count++; }
    if (idx < 0) return null; // never anchor to the document start
    var end = idx + text.length, segs = [];
    for (var j = 0; j < map.length; j++) {
      var s = map[j].off, e = s + map[j].node.nodeValue.length;
      if (e <= idx || s >= end) continue;
      segs.push({ node: map[j].node, start: Math.max(0, idx - s), end: Math.min(map[j].node.nodeValue.length, end - s) });
    }
    return segs.length ? segs : null;
  }
  /* ---------- paint layer ---------- */
  var layer = document.createElement('div'); layer.id = 'cpx-layer';
  layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:9989;pointer-events:none';
  function ensureLayer() { if (!layer.isConnected && document.body) document.body.appendChild(layer); }
  var painted = {}; // id -> { rects:[{l,t,w,h}], els:[div], block:{l,t} }
  function rectsOf(segs) { // page-coordinate boxes for a set of text segments
    // Measure word by word and merge words on the same line: whitespace at a soft wrap
    // otherwise yields a stray empty box at the end of the previous line.
    var raw = [], blockRect = null;
    segs.forEach(function (sg) {
      if (!sg.node.isConnected) return;
      var v = sg.node.nodeValue, s0 = Math.min(sg.start, v.length), s1 = Math.min(sg.end, v.length);
      var part = v.slice(s0, s1), re = /\S+/g, m;
      while ((m = re.exec(part))) {
        var r = document.createRange();
        try { r.setStart(sg.node, s0 + m.index); r.setEnd(sg.node, s0 + m.index + m[0].length); } catch (e) { continue; }
        var rs = r.getClientRects();
        for (var i = 0; i < rs.length; i++) { var b = rs[i]; if (b.width < 1 || !b.height) continue; raw.push({ l: b.left + window.scrollX, t: b.top + window.scrollY, w: b.width, h: b.height }); }
      }
      if (!blockRect && sg.node.parentElement) {
        var blk = sg.node.parentElement.closest('p,li,h1,h2,h3,h4,h5,h6,td,th,blockquote,dd,pre,div') || sg.node.parentElement;
        var bb = blk.getBoundingClientRect(); blockRect = { l: bb.left + window.scrollX, t: bb.top + window.scrollY };
      }
    });
    raw.sort(function (a, b) { return Math.abs(a.t - b.t) < 3 ? a.l - b.l : a.t - b.t; });
    var out = [];
    raw.forEach(function (b) {
      var c = out[out.length - 1];
      if (c && Math.abs(c.t - b.t) < 3 && b.l <= c.l + c.w + Math.max(8, b.h * 0.8)) {
        var right = Math.max(c.l + c.w, b.l + b.w); c.w = right - c.l; c.h = Math.max(c.h, b.h);
      } else out.push({ l: b.l, t: b.t, w: b.w, h: b.h });
    });
    return { rects: out, block: blockRect };
  }
  function clearDrawn(id) { var p = painted[id]; if (!p) return; p.els.forEach(function (e) { e.remove(); }); delete painted[id]; }
  function drawRects(id, geo, cls, style, title) {
    clearDrawn(id); ensureLayer();
    var els = [];
    geo.rects.forEach(function (b) {
      var d = document.createElement('div'); d.className = 'cpx-r ' + cls; d.dataset.cpxOf = id;
      d.style.cssText = 'position:absolute;pointer-events:none;left:' + b.l + 'px;top:' + b.t + 'px;width:' + b.w + 'px;height:' + b.h + 'px;' + (style || '');
      if (title) d.title = title;
      layer.appendChild(d); els.push(d);
    });
    painted[id] = { rects: geo.rects, els: els, block: geo.block };
    return painted[id];
  }
  function hitAt(x, y) { // which painted mark sits under a page-coordinate point?
    var ids = Object.keys(painted);
    for (var i = 0; i < ids.length; i++) {
      var rs = painted[ids[i]].rects;
      for (var j = 0; j < rs.length; j++) { var b = rs[j]; if (x >= b.l && x <= b.l + b.w && y >= b.t && y <= b.t + b.h) return { id: ids[i], kind: ids[i].charAt(0) === 'r' ? 'rs' : 'mark' }; }
    }
    return null;
  }
  function flash(id) { var p = painted[id]; if (!p) return; p.els.forEach(function (e) { e.classList.add('cpx-flash'); }); setTimeout(function () { p.els.forEach(function (e) { e.classList.remove('cpx-flash'); }); }, 2600); }
  function paintMark(m) {
    var segs = findOccurrence(m.text, m.occ) || findOccurrence(m.text, 0);
    if (!segs) { clearDrawn(m.id); return false; }
    var geo = rectsOf(segs); if (!geo.rects.length) { clearDrawn(m.id); return false; }
    drawRects(m.id, geo, (m.kind === 'unclear' ? 'cpx-unclear' : 'cpx-hl') + (m.note ? ' cpx-noted' : ''), '', m.note ? m.note : (m.kind === 'unclear' ? 'Marked: concept unclear' : 'Highlight'));
    return true;
  }
  function occurrenceOfRange(range, text) { // which occurrence of `text` is this selection?
    var pre = document.createRange();
    pre.setStart(document.body, 0); pre.setEnd(range.startContainer, range.startOffset);
    var before = pre.toString(), count = 0, from = 0, i;
    while ((i = before.indexOf(text, from)) >= 0) { count++; from = i + 1; }
    return count;
  }

  /* ---------- marks store ---------- */
  var allMarks = load(LSM, {});
  function pageMarks() { return allMarks[PAGE] || []; }
  function setPageMarks(arr) { if (arr.length) allMarks[PAGE] = arr; else delete allMarks[PAGE]; save(LSM, allMarks); }
  function addMark(kind, text, occ) {
    var m = { id: 'm' + Date.now() + Math.floor(Math.random() * 1e4), kind: kind, text: text, occ: occ, note: '', ts: Date.now(), title: pageTitle() };
    var arr = pageMarks(); arr.push(m); setPageMarks(arr);
    paintMark(m);
    return m;
  }
  function updateMark(id, patch) {
    var arr = pageMarks();
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) { Object.assign(arr[i], patch); break; }
    setPageMarks(arr);
  }
  function removeMark(id) { clearDrawn(id); setPageMarks(pageMarks().filter(function (m) { return m.id !== id; })); refreshPanel(); }
  function restoreMarks() { // repaint every highlight; returns how many found no text
    var missing = 0;
    pageMarks().forEach(function (m) { if (!paintMark(m)) missing++; });
    return missing;
  }

  /* ---------- reading bookmarks (multiple per page, coloured) ---------- */
  var allResume = load(LSR, {});
  Object.keys(allResume).forEach(function (p) { // migrate old single-object form
    var v = allResume[p];
    if (v && !Array.isArray(v)) allResume[p] = [Object.assign({ id: 'r' + v.ts, color: 'green', label: '' }, v)];
  });
  function pageResume() { return allResume[PAGE] || []; }
  function setPageResume(arr) { if (arr.length) allResume[PAGE] = arr; else delete allResume[PAGE]; save(LSR, allResume); }
  function rsColor(r) { return RS_COLORS[r.color] || RS_COLORS.green; }
  function rsById(id) { return pageResume().find(function (r) { return r.id === id; }); }
  function occOfNodeText(node, text) {
    var ns = textNodes(), before = null, full = '';
    for (var i = 0; i < ns.length; i++) { if (ns[i] === node) { var lead = ns[i].nodeValue.indexOf(text); before = full + ns[i].nodeValue.slice(0, lead > 0 ? lead : 0); } full += ns[i].nodeValue; }
    if (before === null) return 0;
    var c = 0, from = 0, j; while ((j = before.indexOf(text, from)) >= 0) { c++; from = j + 1; }
    return c;
  }
  function isChrome(el) { // fixed/sticky widgets, sidebars, nav — never bookmark those
    if (el.closest('aside,nav,header,footer,[role=dialog],[role=complementary]')) return true;
    for (var d = 0; el && el !== document.body && d < 8; d++, el = el.parentElement) {
      var ps = getComputedStyle(el).position; if (ps === 'fixed' || ps === 'sticky') return true;
    }
    return false;
  }
  function anchorFromScroll() { // first readable line of the main column near the top of the viewport
    var ns = textNodes(), W = window.innerWidth;
    for (var i = 0; i < ns.length; i++) {
      var v = ns[i].nodeValue; if (!v || v.trim().length < 12) continue;
      var r = document.createRange(); r.selectNodeContents(ns[i]);
      var b = r.getBoundingClientRect(); if (!b.height || b.width < 80) continue;
      if (b.bottom < 120 || b.top > window.innerHeight) continue;
      if (b.right < W * 0.3 || b.left > W * 0.7) continue; // outside the reading column
      if (isChrome(ns[i].parentElement)) continue;
      var t = v.trim().slice(0, 90); return { text: t, occ: occOfNodeText(ns[i], t) };
    }
    return null;
  }
  var pendingSel = null; // selection captured when the 🔖 button is pressed
  function captureSelection() {
    var sel = window.getSelection(); pendingSel = null;
    if (!sel || sel.isCollapsed) return;
    var text = sel.toString(); if (!text.trim() || text.length > 1200) return;
    var range = sel.getRangeAt(0);
    if (range.startContainer.parentElement && range.startContainer.parentElement.closest('#cpx-panel,#cpx-rsmenu,#cpx-pop,.katex')) return;
    pendingSel = { text: text.trim().slice(0, 90), occ: occurrenceOfRange(range, text) };
  }
  var ribbons = {}; // id -> ribbon div (lives in the paint layer, never in the page's own DOM)
  var paintTimer = null;
  function paintResume() {
    var keep = {};
    var missing = 0;
    pageResume().forEach(function (r) {
      keep[r.id] = 1;
      var segs = findOccurrence(r.text, r.occ) || findOccurrence(r.text, 0);
      var geo = segs ? rectsOf(segs) : { rects: [] };
      if (!geo.rects.length) { clearDrawn(r.id); if (ribbons[r.id]) ribbons[r.id].style.display = 'none'; missing++; return; }
      var c = rsColor(r), tip = (r.label ? r.label + ' — ' : '') + 'Bookmark, ' + new Date(r.ts).toLocaleString() + ' (click to edit)';
      drawRects(r.id, geo, 'cpx-rsline', 'background:' + hexA(c, .22) + ';box-shadow:inset 0 -3px 0 ' + c, tip);
      var rib = ribbons[r.id];
      if (!rib) { rib = document.createElement('div'); rib.className = 'cpx-ribbon'; rib.dataset.cpxRs = r.id; ribbons[r.id] = rib; }
      ensureLayer(); if (!rib.isConnected) layer.appendChild(rib);
      rib.style.display = ''; rib.style.background = c; rib.title = tip;
      var left = (geo.block ? geo.block.l : geo.rects[0].l) - 28; if (left < 4) left = 4;
      rib.style.left = left + 'px'; rib.style.top = (geo.rects[0].t - 3) + 'px';
    });
    Object.keys(ribbons).forEach(function (id) { if (!keep[id]) { ribbons[id].remove(); delete ribbons[id]; clearDrawn(id); } });
    // page JS (mascots, typewriter text, KaTeX) may render late — retry until every bookmark is anchored
    clearTimeout(paintTimer);
    if (missing) { var n = (paintResume.tries = (paintResume.tries || 0) + 1); if (n <= 4) paintTimer = setTimeout(paintResume, 700 * n); }
    else paintResume.tries = 0;
    return missing;
  }
  /* one repaint for everything — cheap enough to run after layout changes */
  var rpTimer = null, rpLast = 0;
  function repaintAll() { rpLast = Date.now(); try { ensureCss(); restoreMarks(); paintResume(); } catch (e) {} }
  function scheduleRepaint(ms) {
    if (rpTimer) return;
    var wait = Math.max(ms || 0, 250 - (Date.now() - rpLast));
    rpTimer = setTimeout(function () { rpTimer = null; repaintAll(); }, wait);
  }
  function positionRibbons() { scheduleRepaint(0); }
  window.addEventListener('resize', function () { scheduleRepaint(120); });
  window.addEventListener('load', function () { scheduleRepaint(300); });
  // inner scroll panes move the text under the paint; the window itself scrolling does not
  document.addEventListener('scroll', function (e) { if (e.target !== document && e.target !== document.documentElement && e.target !== document.body) scheduleRepaint(60); }, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleRepaint(50); });
  function addResume(text, occ, color) {
    var a = (text != null) ? { text: text, occ: occ } : anchorFromScroll();
    if (!a) { alert('Nothing to bookmark on this page yet.'); return; }
    var r = { id: 'r' + Date.now() + Math.floor(Math.random() * 1e4), text: a.text, occ: a.occ, color: color || 'green', label: '', title: pageTitle(), ts: Date.now() };
    var arr = pageResume(); arr.push(r); setPageResume(arr);
    afterResumeChange(); return r;
  }
  function updateResume(id, patch) { var arr = pageResume(); arr.forEach(function (r) { if (r.id === id) Object.assign(r, patch); }); setPageResume(arr); afterResumeChange(); }
  function removeResume(id, path) {
    if (path && path !== PAGE) { allResume[path] = (allResume[path] || []).filter(function (r) { return r.id !== id; }); if (!allResume[path].length) delete allResume[path]; save(LSR, allResume); }
    else setPageResume(pageResume().filter(function (r) { return r.id !== id; }));
    afterResumeChange();
  }
  function afterResumeChange() { paintResume(); syncFab(); refreshPanel(); refreshRsMenu(); if (IS_HOME) renderHomeSection(); }
  function jumpResume(id) {
    var list = pageResume(); if (!list.length) return;
    var r = id ? rsById(id) : list.slice().sort(function (a, b) { return b.ts - a.ts; })[0]; if (!r) return;
    var p = painted[r.id]; if (!p || !p.rects.length) { paintResume(); p = painted[r.id]; }
    if (!p || !p.rects.length) { cpxNote('That line is not on screen right now — open the section it was in.'); return; }
    window.scrollTo({ top: p.rects[0].t - 110, behavior: 'smooth' });
    flash(r.id);
  }
  function cpxNote(msg) {
    var t = document.createElement('div'); t.id = 'cpx-toast';
    t.style.background = '#374151'; t.style.padding = '9px 16px';
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function resumeToast() {
    var n = pageResume().length; if (!n || IS_HOME) return;
    var t = document.createElement('div'); t.id = 'cpx-toast';
    t.innerHTML = '<span>🔖 ' + (n === 1 ? 'You stopped reading part-way through' : n + ' bookmarks on this page') + '</span><button id="cpx-tg">Resume</button><button class="cpx-ghost" id="cpx-tx">Dismiss</button>';
    document.body.appendChild(t);
    var kill = function () { t.remove(); };
    t.querySelector('#cpx-tg').onclick = function () { jumpResume(); kill(); };
    t.querySelector('#cpx-tx').onclick = kill;
    setTimeout(function () { if (t.parentNode) { t.style.transition = 'opacity .4s'; t.style.opacity = 0; setTimeout(kill, 450); } }, 9000);
  }
  /* FAB menu: add a bookmark here (pick colour) + list on this page */
  var rsmenu = null;
  function closeRsMenu() { if (rsmenu) { rsmenu.remove(); rsmenu = null; } }
  function toggleRsMenu() { if (rsmenu) closeRsMenu(); else { rsmenu = document.createElement('div'); rsmenu.id = 'cpx-rsmenu'; document.body.appendChild(rsmenu); refreshRsMenu(); } }
  function refreshRsMenu() {
    if (!rsmenu) return;
    if (IS_HOME) { // home: no content to bookmark — show everything to continue
      var all = allResumeFlat();
      rsmenu.innerHTML = '<h4>Continue reading (' + all.length + ')</h4>' + (all.length ? all.map(function (r) {
        return '<a class="cpx-item" style="display:block;color:inherit;text-decoration:none" href="' + esc(r.path) + '#cpx-resume=' + r.id + '"><button class="cpx-x" data-rm="' + r.id + '" data-p="' + esc(r.path) + '" title="Remove">✕</button><span class="cpx-pip" style="background:' + (RS_COLORS[r.color] || RS_COLORS.green) + '"></span><b>' + esc(r.label || r.title) + '</b><br><span style="color:#6b7280">“' + esc(r.text.slice(0, 56)) + '…”</span></a>';
      }).join('') : '<div style="font-size:12px;color:#9ca3af">No bookmarks yet. Open any note and press 🔖 where you stop.</div>');
      rsmenu.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); removeResume(b.dataset.rm, b.dataset.p); }; });
      return;
    }
    var list = pageResume().slice().sort(function (a, b) { return b.ts - a.ts; });
    rsmenu.innerHTML = (pendingSel
        ? '<h4 style="color:#059669">Bookmark the selected sentence</h4><div style="font-size:12px;color:#6b7280;margin-bottom:6px">“' + esc(pendingSel.text.slice(0, 70)) + '…”</div><div style="font-size:11px;color:#9ca3af;margin-bottom:4px">Pick a colour:</div>'
        : '<h4>Bookmark where I am — pick a colour</h4>') +
      '<div class="cpx-dots">' + dotsHtml('data-add') + '</div>' +
      (pendingSel ? '' : '<div style="font-size:11.5px;color:#9ca3af">Marks the first line on screen. For an exact spot, select a sentence first, then press 🔖.</div>') +
      (list.length ? '<h4 style="margin-top:14px">On this page (' + list.length + ')</h4>' + list.map(function (r) {
        return '<div class="cpx-item" data-go="' + r.id + '"><button class="cpx-x" data-rm="' + r.id + '" title="Remove">✕</button><span class="cpx-pip" style="background:' + rsColor(r) + '"></span>' +
          (r.label ? '<b>' + esc(r.label) + '</b><br>' : '') + '<span style="color:#6b7280">“' + esc(r.text.slice(0, 56)) + '…”</span></div>';
      }).join('') : '');
    rsmenu.querySelectorAll('[data-add]').forEach(function (d) {
      d.onclick = function () {
        var s = pendingSel; pendingSel = null; window.getSelection().removeAllRanges(); closeRsMenu();
        if (s) addResume(s.text, s.occ, d.dataset.add); else addResume(null, 0, d.dataset.add);
      };
    });
    rsmenu.querySelectorAll('[data-go]').forEach(function (el) { el.addEventListener('click', function (e) { if (e.target.closest('.cpx-x')) return; closeRsMenu(); jumpResume(el.dataset.go); }); });
    rsmenu.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { removeResume(b.dataset.rm); }; });
  }
  /* popover on a ribbon / bookmarked line: recolour, label, delete */
  function openRsPop(id) {
    closePop();
    var r = rsById(id); if (!r) return;
    var pr = painted[id] && painted[id].rects[0];
    pop = document.createElement('div'); pop.id = 'cpx-pop';
    pop.innerHTML = '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:' + rsColor(r) + ';margin-bottom:6px">🔖 Reading bookmark</div>' +
      '<div style="color:#6b7280;font-size:12px;margin-bottom:8px;max-height:60px;overflow:hidden">“' + esc(r.text.slice(0, 120)) + '…”</div>' +
      '<div class="cpx-row" style="margin:0 0 8px">' + dotsHtml('data-c') + '</div>' +
      '<input placeholder="Label (optional) — e.g. Ch.3 stopped, revise">' +
      '<div class="cpx-row"><button class="cpx-save">Save</button><button class="cpx-del">Delete</button></div>';
    document.body.appendChild(pop);
    var inp = pop.querySelector('input'); inp.value = r.label || '';
    var color = r.color;
    pop.querySelectorAll('[data-c]').forEach(function (d) { d.classList.toggle('cpx-sel', d.dataset.c === color); d.onclick = function () { color = d.dataset.c; pop.querySelectorAll('[data-c]').forEach(function (x) { x.classList.toggle('cpx-sel', x === d); }); }; });
    var px = pr ? pr.l : window.innerWidth / 2 - 140 + window.scrollX, py = pr ? pr.t + pr.h : window.innerHeight / 2 + window.scrollY;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - 296, px)) + 'px';
    pop.style.top = (py + 8) + 'px';
    pop.querySelector('.cpx-save').onclick = function () { updateResume(id, { color: color, label: inp.value.trim() }); closePop(); };
    pop.querySelector('.cpx-del').onclick = function () { removeResume(id); closePop(); };
    inp.focus();
  }

  /* ---------- saved pages (★) ---------- */
  function bookmarks() { return load(LSB, []); }
  function isBookmarked() { return bookmarks().some(function (b) { return b.path === PAGE; }); }
  function toggleBookmark() {
    var list = bookmarks();
    if (isBookmarked()) list = list.filter(function (b) { return b.path !== PAGE; });
    else list.unshift({ path: PAGE, title: pageTitle(), ts: Date.now() });
    save(LSB, list); syncFab(); refreshPanel(); if (IS_HOME) renderHomeSection();
  }

  /* ---------- selection toolbar ---------- */
  var tools = null;
  function hideTools() { if (tools) { tools.remove(); tools = null; } }
  document.addEventListener('mouseup', function (e) {
    var t = e.target instanceof Element ? e.target : (e.target && e.target.parentElement);
    if (t && t.closest('#cpx-tools,#cpx-panel,#cpx-pop,#cpx-fab,#cpx-rsmenu')) return;
    setTimeout(function () {
      hideTools();
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      var text = sel.toString();
      if (!text.trim() || text.length > 1200) return;
      var range = sel.getRangeAt(0);
      if (range.startContainer.parentElement && range.startContainer.parentElement.closest('#cpx-panel,.katex')) return;
      var r = range.getBoundingClientRect();
      tools = document.createElement('div'); tools.id = 'cpx-tools';
      tools.innerHTML = '<button data-k="hl">🖊 Highlight</button><button data-k="unclear">? Unclear</button><button data-k="note">✎ Note</button><span style="width:1px;height:18px;background:#4b5563;margin:0 4px"></span><span style="font-size:12px;padding-right:2px">🔖</span>' + dotsHtml('data-c');
      document.body.appendChild(tools);
      function place() {
        tools.style.left = Math.max(8, Math.min(window.innerWidth - tools.offsetWidth - 8, r.left + window.scrollX + r.width / 2 - tools.offsetWidth / 2)) + 'px';
        tools.style.top = (r.top + window.scrollY - tools.offsetHeight - 8) + 'px';
      }
      place();
      tools.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      tools.addEventListener('click', function (ev) {
        var b = ev.target.closest('button'); if (!b) return;
        var occ = occurrenceOfRange(range, text);
        if (b.dataset.c) { sel.removeAllRanges(); hideTools(); addResume(text.trim().slice(0, 90), occ, b.dataset.c); return; }
        var k = b.dataset.k; if (!k) return;
        sel.removeAllRanges(); hideTools();
        var m = addMark(k === 'unclear' ? 'unclear' : 'hl', text, occ);
        if (k === 'note') openPop(m.id);
        refreshPanel();
      });
    }, 0);
  });
  document.addEventListener('scroll', hideTools, true);

  /* ---------- note popover ---------- */
  var pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function openPop(id) {
    closePop();
    var m = pageMarks().find(function (x) { return x.id === id; }); if (!m) return;
    var pr = painted[id] && painted[id].rects[0];
    pop = document.createElement('div'); pop.id = 'cpx-pop';
    pop.innerHTML = '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:' + (m.kind === 'unclear' ? '#dc2626' : '#a16207') + ';margin-bottom:6px">' + (m.kind === 'unclear' ? 'Concept unclear' : 'Highlight') + '</div>' +
      '<div style="color:#6b7280;font-size:12px;margin-bottom:8px;max-height:60px;overflow:hidden">“' + esc(m.text.slice(0, 160)) + (m.text.length > 160 ? '…' : '') + '”</div>' +
      '<textarea placeholder="Add an annotation…">' + esc(m.note || '') + '</textarea>' +
      '<div class="cpx-row"><button class="cpx-save">Save</button><button class="cpx-toggle">' + (m.kind === 'unclear' ? 'Mark as highlight' : 'Mark as unclear') + '</button><button class="cpx-del">Delete</button></div>';
    document.body.appendChild(pop);
    var px = pr ? pr.l : window.innerWidth / 2 - 140 + window.scrollX, py = pr ? pr.t + pr.h : window.innerHeight / 2 + window.scrollY;
    pop.style.left = Math.max(8, Math.min(window.innerWidth - 296, px)) + 'px';
    pop.style.top = (py + 8) + 'px';
    pop.querySelector('.cpx-save').onclick = function () {
      var v = pop.querySelector('textarea').value.trim();
      updateMark(id, { note: v }); paintMark(m);
      closePop(); refreshPanel();
    };
    pop.querySelector('.cpx-toggle').onclick = function () {
      updateMark(id, { kind: m.kind === 'unclear' ? 'hl' : 'unclear' }); paintMark(m);
      closePop(); refreshPanel();
    };
    pop.querySelector('.cpx-del').onclick = function () { removeMark(id); closePop(); };
    pop.querySelector('textarea').focus();
  }
  document.addEventListener('click', function (e) {
    var t = e.target instanceof Element ? e.target : (e.target && e.target.parentElement);
    if (!t) return;
    var rs = t.closest('[data-cpx-rs]');
    if (rs) { e.preventDefault(); openRsPop(rs.dataset.cpxRs); return; }
    if (!t.closest('#cpx-pop,#cpx-rsmenu,#cpx-tools,#cpx-fab,#cpx-panel,a,button,input,textarea,select')) {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        var hit = hitAt(e.pageX, e.pageY);
        if (hit) { if (hit.kind === 'rs') openRsPop(hit.id); else openPop(hit.id); return; }
      }
    }
    if (pop && !t.closest('#cpx-pop')) closePop();
    if (rsmenu && !t.closest('#cpx-rsmenu,#cpx-rs')) closeRsMenu();
  });

  /* ---------- floating buttons ---------- */
  var fab = document.createElement('div'); fab.id = 'cpx-fab';
  // critical positioning inline too, so the strip never lands mid-page if the stylesheet is dropped
  fab.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;gap:8px';
  fab.innerHTML = '<button id="cpx-rs" title="Reading bookmarks">🔖<span class="cpx-cnt"></span></button><button id="cpx-bm" title="Save this page (★)">★</button><button id="cpx-open" title="Saved pages & marks">☰</button>';
  fab.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep the text selection alive
  var fabBm = fab.querySelector('#cpx-bm'), fabRs = fab.querySelector('#cpx-rs'), fabOpen = fab.querySelector('#cpx-open');
  if (fabBm) fabBm.onclick = toggleBookmark;
  if (fabOpen) fabOpen.onclick = togglePanel;
  if (fabRs) fabRs.onclick = function (e) { e.stopPropagation(); if (!rsmenu) { captureSelection(); hideTools(); } toggleRsMenu(); };
  /* Host apps that re-render document.body (React/DC pages) delete our injected nodes.
     Re-attach instead of assuming they are still there. */
  function ensureFab() {
    if (!document.body) return false;
    if (!fab.isConnected) document.body.appendChild(fab);
    return !!fabBm;
  }
  function syncFab() {
    if (!ensureFab()) return;
    fabBm.classList.toggle('cpx-on', isBookmarked());
    var n = pageResume().length, cnt = fabRs && fabRs.querySelector('.cpx-cnt');
    if (cnt) { cnt.textContent = n; cnt.style.display = n ? 'flex' : 'none'; }
    if (fabRs) fabRs.title = n ? n + ' reading bookmark' + (n > 1 ? 's' : '') + ' on this page' : 'Bookmark where you stopped reading';
  }
  syncFab();
  /* Repaint marks after a host re-render. A plain debounce is wrong here: pages with a live
     console or animation mutate the DOM constantly, so the timer never settles. Instead only
     schedule when a mark is genuinely missing, and throttle so it always fires. */
  if (window.MutationObserver) {
    function ours(n) { var el = n && (n.nodeType === 1 ? n : n.parentElement); return !!(el && el.closest && el.closest('#cpx-layer,#cpx-fab,#cpx-panel,#cpx-tools,#cpx-pop,#cpx-rsmenu,#cpx-toast,#cpx-css')); }
    new MutationObserver(function (recs) {
      var foreign = false;
      for (var i = 0; i < recs.length; i++) { if (!ours(recs[i].target)) { foreign = true; break; } }
      if (!foreign) return;
      ensureCss(); ensureLayer();
      if (!fab.isConnected) { ensureFab(); syncFab(); }
      if (panel && !panel.isConnected) document.body.appendChild(panel);
      if (pageMarks().length || pageResume().length) scheduleRepaint(120);
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  /* ---------- side panel ---------- */
  var panel = null;
  function togglePanel() { if (panel) { panel.remove(); panel = null; } else { panel = document.createElement('div'); panel.id = 'cpx-panel'; document.body.appendChild(panel); refreshPanel(); } }
  function scrollToMark(id) {
    var p = painted[id];
    if (!p || !p.rects.length) { try { restoreMarks(); } catch (e) {} p = painted[id]; }
    if (!p || !p.rects.length) { cpxNote('That passage is not on screen right now — open the section it was in.'); return; }
    window.scrollTo({ top: p.rects[0].t - window.innerHeight / 3, behavior: 'smooth' });
    flash(id);
  }
  function allResumeFlat() {
    var out = [];
    Object.keys(allResume).forEach(function (p) { allResume[p].forEach(function (r) { out.push(Object.assign({ path: p }, r)); }); });
    return out.sort(function (a, b) { return b.ts - a.ts; });
  }
  function refreshPanel() {
    if (!panel) return;
    var bms = bookmarks(), marks = pageMarks(), rs = allResumeFlat();
    var unclear = marks.filter(function (m) { return m.kind === 'unclear'; });
    var hls = marks.filter(function (m) { return m.kind !== 'unclear'; });
    function markItem(m) {
      var un = m.kind === 'unclear';
      return '<div class="cpx-item ' + (un ? 'cpx-k-un' : 'cpx-k-hl') + '" data-goto="' + m.id + '">' +
        '<button class="cpx-x" data-rm="' + m.id + '" title="Remove">✕</button>' +
        '<span class="cpx-ico">' + (un ? '?' : '▬') + '</span>' +
        '<span class="cpx-q">' + esc(m.text.slice(0, 90)) + (m.text.length > 90 ? '…' : '') + '</span>' +
        (m.note ? '<span class="cpx-tag">note</span><div class="cpx-note">✎ ' + esc(m.note) + '</div>' : '') + '</div>';
    }
    function head(color, label, n) {
      return '<h3><span class="cpx-sw" style="background:' + color + '"></span><span class="cpx-lb">' + label + '</span>' +
        (n === null ? '' : '<span class="cpx-n">' + n + '</span>') + '</h3>';
    }
    function empty(t) { return '<small class="cpx-empty">' + t + '</small>'; }
    panel.innerHTML =
      '<button class="cpx-x" id="cpx-close" style="font-size:18px" title="Close">✕</button>' +
      head('#059669', 'Continue reading', rs.length) +
      (rs.length ? rs.map(function (r) {
        var here = r.path === PAGE, c = RS_COLORS[r.color] || RS_COLORS.green;
        return '<div class="cpx-item cpx-k-rs" data-rsgo="' + r.id + '" data-rspath="' + esc(r.path) + '" style="border-left-color:' + c + '">' +
          '<button class="cpx-x" data-rsrm="' + r.id + '" data-rspath="' + esc(r.path) + '" title="Clear">✕</button>' +
          '<span class="cpx-ico" style="color:' + c + '">🔖</span>' +
          (here ? '<span style="color:#111827">' + esc(r.label || r.title) + ' <em style="font-style:normal;color:#9ca3af">(this page)</em></span>'
                : '<a href="' + esc(r.path) + '#cpx-resume=' + r.id + '" style="color:#111827;text-decoration:none">' + esc(r.label || r.title) + '</a>') +
          '<small>“' + esc(r.text.slice(0, 60)) + '…”' + (r.label && !here ? ' · ' + esc(r.title) : '') + '</small></div>';
      }).join('') : empty('None — press 🔖 where you stop reading.')) +
      head('#4f46e5', 'Saved pages', bms.length) +
      (bms.length ? bms.map(function (b) {
        return '<div class="cpx-item cpx-k-bm"><button class="cpx-x" data-unbm="' + esc(b.path) + '" title="Remove">✕</button>' +
          '<span class="cpx-ico">★</span>' +
          '<a href="' + esc(b.path) + '" style="color:#4f46e5;text-decoration:none">' + esc(b.title) + '</a><small>' + esc(b.path) + '</small></div>';
      }).join('') : empty('None yet — press ★ on any note page.')) +
      head('#dc2626', 'Unclear on this page', unclear.length) +
      (unclear.length ? unclear.map(markItem).join('') : empty('Select text → “? Unclear”.')) +
      head('#eab308', 'Highlights &amp; notes', hls.length) +
      (hls.length ? hls.map(markItem).join('') : empty('Select text → “Highlight” or “Note”.')) +
      '<div class="cpx-btnrow"><button id="cpx-exp">Export backup</button><button id="cpx-imp">Import</button></div>' +
      '<input type="file" id="cpx-file" accept=".json" style="display:none">';
    panel.querySelector('#cpx-close').onclick = togglePanel;
    panel.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function (e) { if (e.target.closest('.cpx-x')) return; scrollToMark(el.dataset.goto); });
    });
    panel.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { removeMark(b.dataset.rm); }; });
    panel.querySelectorAll('[data-rsgo]').forEach(function (el) {
      el.addEventListener('click', function (e) { if (e.target.closest('.cpx-x,a')) return; if (el.dataset.rspath === PAGE) jumpResume(el.dataset.rsgo); else location.href = el.dataset.rspath + '#cpx-resume=' + el.dataset.rsgo; });
    });
    panel.querySelectorAll('[data-rsrm]').forEach(function (b) { b.onclick = function () { removeResume(b.dataset.rsrm, b.dataset.rspath); }; });
    panel.querySelectorAll('[data-unbm]').forEach(function (b) {
      b.onclick = function () { save(LSB, bookmarks().filter(function (x) { return x.path !== b.dataset.unbm; })); syncFab(); refreshPanel(); if (IS_HOME) renderHomeSection(); };
    });
    panel.querySelector('#cpx-exp').onclick = function () {
      var blob = new Blob([JSON.stringify({ bookmarks: bookmarks(), marks: allMarks, resume: allResume }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'commonplace-study-backup.json'; a.click();
    };
    panel.querySelector('#cpx-imp').onclick = function () { panel.querySelector('#cpx-file').click(); };
    panel.querySelector('#cpx-file').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      f.text().then(function (t) {
        var d = JSON.parse(t);
        if (d.bookmarks) save(LSB, d.bookmarks);
        if (d.marks) { allMarks = d.marks; save(LSM, allMarks); }
        if (d.resume) { allResume = d.resume; save(LSR, allResume); }
        location.reload();
      }).catch(function () { alert('Could not read that backup file.'); });
    };
  }

  /* ---------- home screen: continue reading + saved pages (self-styled; works on any home layout) ---------- */
  function renderHomeSection() {
    var old = document.getElementById('cpx-home'); if (old) old.remove();
    var bms = bookmarks(), rs = allResumeFlat();
    if (!bms.length && !rs.length) return;
    var host = document.querySelector('.wrap') || document.querySelector('main') || document.body;
    var sec = document.createElement('section'); sec.id = 'cpx-home';
    sec.style.cssText = 'max-width:1080px;margin:28px auto 8px;padding:0 24px;box-sizing:border-box;' + FONT;
    function crumbs(p) { return esc(p.replace(/^\//, '').replace(/\.html$/, '').replace(/[_\/]/g, ' / ')); }
    var h = 'font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;margin:0 0 10px;font-weight:600';
    var grid = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-bottom:22px';
    var card = 'display:block;border:1px solid rgba(0,0,0,.12);border-left-width:5px;border-radius:10px;padding:10px 12px;background:rgba(255,255,255,.7);color:#1f2937;text-decoration:none;line-height:1.4';
    sec.innerHTML =
      (rs.length ? '<h2 style="' + h + '">🔖 Continue reading</h2><div style="' + grid + '">' + rs.slice(0, 12).map(function (r) {
        var c = RS_COLORS[r.color] || RS_COLORS.green;
        return '<a style="' + card + 'border-left-color:' + c + '" href="' + esc(r.path) + '#cpx-resume=' + r.id + '"><div style="font-weight:600;font-size:14px">' + esc(r.label || r.title) + '</div><div style="font-size:12px;color:#6b7280;margin-top:2px">' + (r.label ? esc(r.title) + ' · ' : '') + '“' + esc(r.text.slice(0, 64)) + '…”</div></a>';
      }).join('') + '</div>' : '') +
      (bms.length ? '<h2 style="' + h + '">★ Saved pages</h2><div style="' + grid + '">' + bms.map(function (b) {
        return '<a style="' + card + 'border-left-color:#4f46e5" href="' + esc(b.path) + '"><div style="font-weight:600;font-size:14px">' + esc(b.title) + '</div><div style="font-size:12px;color:#6b7280;margin-top:2px">' + crumbs(b.path) + '</div></a>';
      }).join('') + '</div>' : '');
    var ref = host.querySelector('h2, section, .grid');
    while (ref && ref.parentElement && ref.parentElement !== host) ref = ref.parentElement; // climb to a top-level block
    if (ref && ref.parentElement === host) host.insertBefore(sec, ref); else host.appendChild(sec);
  }

  /* ---------- boot ---------- */
  function boot() {
    if (IS_HOME) renderHomeSection();
    // Wait a beat so KaTeX finishes rewriting the DOM before we anchor marks to text.
    setTimeout(function () {
      ensureLayer(); repaintAll(); syncFab();
      var h = /^#cpx-resume(?:=(.+))?$/.exec(location.hash);
      if (h) { history.replaceState(null, '', location.pathname); jumpResume(h[1]); setTimeout(function () { jumpResume(h[1]); }, 700); }
      else resumeToast();
    }, window.renderMathInElement ? 900 : 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
