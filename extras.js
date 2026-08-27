/* Commonplace study layer — injected by serve.py into every page. Nothing on disk is modified.
   Features: page bookmarks (quick links on home), text highlights, "unclear" marks, annotations.
   All data lives in localStorage; export/import from the panel. */
(function () {
  'use strict';
  if (window.__cpx) return; window.__cpx = 1;
  var PAGE = decodeURIComponent(location.pathname);
  var IS_HOME = PAGE === '/' || PAGE === '/index.html';
  var LSB = 'cpx.bookmarks', LSM = 'cpx.marks';
  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function pageTitle() { return (document.title || PAGE).replace(/\s*·\s*Commonplace\s*$/, ''); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.cpx-hl{background:#fef08a;border-radius:2px;cursor:pointer;box-shadow:0 1px 0 #eab308 inset}' +
    '.cpx-unclear{background:#fee2e2;border-bottom:2px wavy underline #dc2626;text-decoration:underline wavy #dc2626 2px;text-underline-offset:3px;border-radius:2px;cursor:pointer}' +
    '.cpx-hl.cpx-noted,.cpx-unclear.cpx-noted{outline:1px dashed #7c3aed;outline-offset:1px}' +
    '#cpx-fab{position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;gap:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    '#cpx-fab button{width:44px;height:44px;border-radius:50%;border:1px solid #e5e7eb;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.12);font-size:19px;cursor:pointer;line-height:1;color:#4b5563}' +
    '#cpx-fab button:hover{border-color:#4f46e5;color:#4f46e5}' +
    '#cpx-fab button.cpx-on{background:#4f46e5;border-color:#4f46e5;color:#fff}' +
    '#cpx-tools{position:absolute;z-index:10000;background:#111827;color:#fff;border-radius:8px;padding:4px;display:flex;gap:2px;box-shadow:0 6px 20px rgba(0,0,0,.3);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    '#cpx-tools button{background:none;border:0;color:#fff;font-size:12.5px;padding:6px 10px;border-radius:5px;cursor:pointer;white-space:nowrap}' +
    '#cpx-tools button:hover{background:#374151}' +
    '#cpx-panel{position:fixed;top:0;right:0;bottom:0;width:340px;max-width:92vw;background:#fff;border-left:1px solid #e5e7eb;box-shadow:-8px 0 30px rgba(0,0,0,.10);z-index:9998;overflow-y:auto;padding:18px 18px 30px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;color:#1f2937}' +
    '#cpx-panel h3{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;margin:20px 0 8px}' +
    '#cpx-panel .cpx-item{border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin-bottom:8px;cursor:pointer;line-height:1.45}' +
    '#cpx-panel .cpx-item:hover{border-color:#4f46e5}' +
    '#cpx-panel .cpx-item small{color:#6b7280;display:block;font-size:11.5px}' +
    '#cpx-panel .cpx-note{color:#7c3aed;font-size:12.5px;margin-top:4px;white-space:pre-wrap}' +
    '#cpx-panel .cpx-x{float:right;color:#9ca3af;border:0;background:none;cursor:pointer;font-size:14px;padding:0 2px}' +
    '#cpx-panel .cpx-x:hover{color:#dc2626}' +
    '#cpx-panel .cpx-btnrow{display:flex;gap:8px;margin-top:14px}' +
    '#cpx-panel .cpx-btnrow button{flex:1;padding:7px 0;border:1px solid #e5e7eb;background:#fff;border-radius:7px;cursor:pointer;font-size:12.5px;color:#4b5563}' +
    '#cpx-panel .cpx-btnrow button:hover{border-color:#4f46e5;color:#4f46e5}' +
    '#cpx-pop{position:absolute;z-index:10001;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:12px;width:280px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px}' +
    '#cpx-pop textarea{width:100%;box-sizing:border-box;min-height:70px;border:1px solid #e5e7eb;border-radius:7px;padding:7px;font:inherit;resize:vertical}' +
    '#cpx-pop .cpx-row{display:flex;gap:6px;margin-top:8px}' +
    '#cpx-pop button{flex:1;padding:6px 0;border-radius:7px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:12.5px}' +
    '#cpx-pop .cpx-save{background:#4f46e5;border-color:#4f46e5;color:#fff}' +
    '#cpx-pop .cpx-del{color:#dc2626}' +
    '.cpx-flash{animation:cpxflash 1.2s ease 2}' +
    '@keyframes cpxflash{50%{background:#c7d2fe}}';
  document.head.appendChild(css);

  /* ---------- text search / wrapping across nodes ---------- */
  function textNodes() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('script,style,textarea,#cpx-panel,#cpx-tools,#cpx-pop,#cpx-fab,.katex')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var out = []; while (w.nextNode()) out.push(w.currentNode); return out;
  }
  function findOccurrence(text, occ) { // -> [{node, start, end}] or null
    var nodes = textNodes(), full = '', map = [];
    for (var i = 0; i < nodes.length; i++) { map.push({ node: nodes[i], off: full.length }); full += nodes[i].nodeValue; }
    var idx = -1, from = 0, count = -1;
    while (count < occ) { idx = full.indexOf(text, from); if (idx < 0) return null; from = idx + 1; count++; }
    var end = idx + text.length, segs = [];
    for (var j = 0; j < map.length; j++) {
      var s = map[j].off, e = s + map[j].node.nodeValue.length;
      if (e <= idx || s >= end) continue;
      segs.push({ node: map[j].node, start: Math.max(0, idx - s), end: Math.min(map[j].node.nodeValue.length, end - s) });
    }
    return segs.length ? segs : null;
  }
  function wrapSegs(segs, mark) {
    segs.forEach(function (sg) {
      var n = sg.node, len = n.nodeValue.length;
      var target = n;
      if (sg.end < len) target.splitText(sg.end);
      if (sg.start > 0) target = target.splitText(sg.start);
      var span = document.createElement('span');
      span.className = mark.kind === 'unclear' ? 'cpx-unclear' : 'cpx-hl';
      if (mark.note) span.classList.add('cpx-noted');
      span.dataset.cpxId = mark.id;
      span.title = mark.note ? mark.note : (mark.kind === 'unclear' ? 'Marked: concept unclear' : 'Highlight');
      target.parentNode.insertBefore(span, target);
      span.appendChild(target);
    });
  }
  function unwrap(id) {
    document.querySelectorAll('[data-cpx-id="' + id + '"]').forEach(function (s) {
      while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s);
      s.remove();
    });
    document.body.normalize();
  }
  function occurrenceOfRange(range, text) { // which occurrence of `text` is this selection?
    var pre = document.createRange();
    pre.setStart(document.body, 0); pre.setEnd(range.startContainer, range.startOffset);
    var before = pre.toString(), count = 0, from = 0, i;
    while ((i = before.indexOf(text, from)) >= 0) { count++; from = i + 1; }
    return count; // marks before this point with same text
  }

  /* ---------- marks store ---------- */
  var allMarks = load(LSM, {});
  function pageMarks() { return allMarks[PAGE] || []; }
  function setPageMarks(arr) { if (arr.length) allMarks[PAGE] = arr; else delete allMarks[PAGE]; save(LSM, allMarks); }
  function addMark(kind, text, occ) {
    var m = { id: 'm' + Date.now() + Math.floor(Math.random() * 1e4), kind: kind, text: text, occ: occ, note: '', ts: Date.now(), title: pageTitle() };
    var arr = pageMarks(); arr.push(m); setPageMarks(arr);
    var segs = findOccurrence(text, occ); if (segs) wrapSegs(segs, m);
    return m;
  }
  function updateMark(id, patch) {
    var arr = pageMarks();
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) { Object.assign(arr[i], patch); break; }
    setPageMarks(arr);
  }
  function removeMark(id) { unwrap(id); setPageMarks(pageMarks().filter(function (m) { return m.id !== id; })); refreshPanel(); }
  function restoreMarks() {
    pageMarks().forEach(function (m) {
      var segs = findOccurrence(m.text, m.occ);
      if (!segs) segs = findOccurrence(m.text, 0); // fallback: first occurrence
      if (segs) wrapSegs(segs, m);
    });
  }

  /* ---------- bookmarks ---------- */
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
    if (t && t.closest('#cpx-tools,#cpx-panel,#cpx-pop,#cpx-fab')) return;
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
      tools.innerHTML = '<button data-k="hl">🖊 Highlight</button><button data-k="unclear">? Unclear</button><button data-k="note">✎ Note</button>';
      document.body.appendChild(tools);
      tools.style.left = Math.max(8, Math.min(window.innerWidth - tools.offsetWidth - 8, r.left + window.scrollX + r.width / 2 - tools.offsetWidth / 2)) + 'px';
      tools.style.top = (r.top + window.scrollY - tools.offsetHeight - 8) + 'px';
      tools.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      tools.addEventListener('click', function (ev) {
        var k = ev.target.closest('button') && ev.target.closest('button').dataset.k;
        if (!k) return;
        var occ = occurrenceOfRange(range, text);
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
    var el = document.querySelector('[data-cpx-id="' + id + '"]');
    pop = document.createElement('div'); pop.id = 'cpx-pop';
    pop.innerHTML = '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:' + (m.kind === 'unclear' ? '#dc2626' : '#a16207') + ';margin-bottom:6px">' + (m.kind === 'unclear' ? 'Concept unclear' : 'Highlight') + '</div>' +
      '<div style="color:#6b7280;font-size:12px;margin-bottom:8px;max-height:60px;overflow:hidden">“' + esc(m.text.slice(0, 160)) + (m.text.length > 160 ? '…' : '') + '”</div>' +
      '<textarea placeholder="Add an annotation…">' + esc(m.note || '') + '</textarea>' +
      '<div class="cpx-row"><button class="cpx-save">Save</button><button class="cpx-toggle">' + (m.kind === 'unclear' ? 'Mark as highlight' : 'Mark as unclear') + '</button><button class="cpx-del">Delete</button></div>';
    document.body.appendChild(pop);
    var r = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2 - 140, bottom: window.innerHeight / 2 };
    pop.style.left = Math.max(8, Math.min(window.innerWidth - 296, r.left + window.scrollX)) + 'px';
    pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
    pop.querySelector('.cpx-save').onclick = function () {
      var v = pop.querySelector('textarea').value.trim();
      updateMark(id, { note: v });
      document.querySelectorAll('[data-cpx-id="' + id + '"]').forEach(function (s) { s.classList.toggle('cpx-noted', !!v); s.title = v || ''; });
      closePop(); refreshPanel();
    };
    pop.querySelector('.cpx-toggle').onclick = function () {
      var nk = m.kind === 'unclear' ? 'hl' : 'unclear';
      updateMark(id, { kind: nk });
      document.querySelectorAll('[data-cpx-id="' + id + '"]').forEach(function (s) { s.className = (nk === 'unclear' ? 'cpx-unclear' : 'cpx-hl') + (m.note ? ' cpx-noted' : ''); });
      closePop(); refreshPanel();
    };
    pop.querySelector('.cpx-del').onclick = function () { removeMark(id); closePop(); };
    pop.querySelector('textarea').focus();
  }
  document.addEventListener('click', function (e) {
    var t = e.target instanceof Element ? e.target : (e.target && e.target.parentElement);
    if (!t) return;
    var s = t.closest('[data-cpx-id]');
    if (s) { e.preventDefault(); openPop(s.dataset.cpxId); return; }
    if (pop && !t.closest('#cpx-pop')) closePop();
  });

  /* ---------- floating buttons ---------- */
  var fab = document.createElement('div'); fab.id = 'cpx-fab';
  fab.innerHTML = '<button id="cpx-bm" title="Bookmark this page">★</button><button id="cpx-open" title="Bookmarks & marks">☰</button>';
  document.body.appendChild(fab);
  function syncFab() { document.getElementById('cpx-bm').classList.toggle('cpx-on', isBookmarked()); }
  syncFab();
  document.getElementById('cpx-bm').onclick = toggleBookmark;
  document.getElementById('cpx-open').onclick = togglePanel;

  /* ---------- side panel ---------- */
  var panel = null;
  function togglePanel() { if (panel) { panel.remove(); panel = null; } else { panel = document.createElement('div'); panel.id = 'cpx-panel'; document.body.appendChild(panel); refreshPanel(); } }
  function scrollToMark(id) {
    var el = document.querySelector('[data-cpx-id="' + id + '"]'); if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3;
    window.scrollTo({ top: y, behavior: 'smooth' });
    el.classList.add('cpx-flash'); setTimeout(function () { el.classList.remove('cpx-flash'); }, 2600);
  }
  function refreshPanel() {
    if (!panel) return;
    var bms = bookmarks(), marks = pageMarks();
    var unclear = marks.filter(function (m) { return m.kind === 'unclear'; });
    var hls = marks.filter(function (m) { return m.kind !== 'unclear'; });
    function markItem(m) {
      return '<div class="cpx-item" data-goto="' + m.id + '"><button class="cpx-x" data-rm="' + m.id + '" title="Remove">✕</button>' +
        esc(m.text.slice(0, 90)) + (m.text.length > 90 ? '…' : '') +
        (m.note ? '<div class="cpx-note">✎ ' + esc(m.note) + '</div>' : '') + '</div>';
    }
    panel.innerHTML =
      '<button class="cpx-x" id="cpx-close" style="font-size:18px" title="Close">✕</button>' +
      '<h3 style="margin-top:2px">Bookmarks</h3>' +
      (bms.length ? bms.map(function (b) {
        return '<div class="cpx-item"><button class="cpx-x" data-unbm="' + esc(b.path) + '" title="Remove">✕</button><a href="' + esc(b.path) + '" style="color:#4f46e5;text-decoration:none">' + esc(b.title) + '</a><small>' + esc(b.path) + '</small></div>';
      }).join('') : '<small style="color:#9ca3af">None yet — press ★ on any note page.</small>') +
      '<h3>Unclear on this page (' + unclear.length + ')</h3>' +
      (unclear.length ? unclear.map(markItem).join('') : '<small style="color:#9ca3af">Select text → “? Unclear”.</small>') +
      '<h3>Highlights & notes on this page (' + hls.length + ')</h3>' +
      (hls.length ? hls.map(markItem).join('') : '<small style="color:#9ca3af">Select text → “Highlight” or “Note”.</small>') +
      '<div class="cpx-btnrow"><button id="cpx-exp">Export backup</button><button id="cpx-imp">Import</button></div>' +
      '<input type="file" id="cpx-file" accept=".json" style="display:none">';
    panel.querySelector('#cpx-close').onclick = togglePanel;
    panel.querySelectorAll('[data-goto]').forEach(function (el) {
      el.addEventListener('click', function (e) { if (e.target.closest('.cpx-x')) return; scrollToMark(el.dataset.goto); });
    });
    panel.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { removeMark(b.dataset.rm); }; });
    panel.querySelectorAll('[data-unbm]').forEach(function (b) {
      b.onclick = function () { save(LSB, bookmarks().filter(function (x) { return x.path !== b.dataset.unbm; })); syncFab(); refreshPanel(); if (IS_HOME) renderHomeSection(); };
    });
    panel.querySelector('#cpx-exp').onclick = function () {
      var blob = new Blob([JSON.stringify({ bookmarks: bookmarks(), marks: allMarks }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'commonplace-study-backup.json'; a.click();
    };
    panel.querySelector('#cpx-imp').onclick = function () { panel.querySelector('#cpx-file').click(); };
    panel.querySelector('#cpx-file').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      f.text().then(function (t) {
        var d = JSON.parse(t);
        if (d.bookmarks) save(LSB, d.bookmarks);
        if (d.marks) { allMarks = d.marks; save(LSM, allMarks); }
        location.reload();
      }).catch(function () { alert('Could not read that backup file.'); });
    };
  }

  /* ---------- home screen: bookmarked notes section ---------- */
  function renderHomeSection() {
    var old = document.getElementById('cpx-home'); if (old) old.remove();
    var bms = bookmarks(); if (!bms.length) return;
    var wrap = document.querySelector('.wrap'); if (!wrap) return;
    var sec = document.createElement('div'); sec.id = 'cpx-home';
    sec.innerHTML = '<h2>Bookmarked notes</h2><div class="grid">' + bms.map(function (b) {
      return '<a class="card" href="' + esc(b.path) + '"><span class="label">★ Bookmark</span><div class="title">' + esc(b.title) + '</div><div class="summary">' + esc(b.path.replace(/^\//, '').replace(/\.html$/, '').replace(/[_\/]/g, ' / ')) + '</div></a>';
    }).join('') + '</div>';
    var firstH2 = wrap.querySelector('h2');
    if (firstH2) wrap.insertBefore(sec, firstH2); else wrap.appendChild(sec);
  }

  /* ---------- boot ---------- */
  function boot() {
    if (IS_HOME) renderHomeSection();
    // Wait a beat so KaTeX finishes rewriting the DOM before we anchor marks to text.
    setTimeout(restoreMarks, window.renderMathInElement ? 900 : 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
