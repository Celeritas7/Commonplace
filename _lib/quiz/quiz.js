/* Commonplace quiz layer — "Quiz me" on any reading page.
   Loaded by _lib/progress-backup.js, so every page that has the ⇅ backup circle gets it.
   Nothing on the page is modified: the quiz lives in its own overlay.

   Three question types:
     mcq    — pick one of four
     fill   — type the missing token(s) into the code / sentence
     match  — pair each term with its meaning

   Where the questions come from (all merged, authored first):
     1. An authored bank next to the page:  <page dir>/quiz/<page name>.js
        which sets  window.CP_QUIZ_BANK = [ {type:'mcq', …}, … ]      (format: _lib/quiz/README.md)
     2. Drill data the page already loaded (Python lessons: window.LESSON_DRILL_DATA).
     3. Generated from what is on the page right now — code blocks, editors, bold-lead
        definitions, term cards, two-column tables, "code  # comment" lines, headed concepts.

   Stress mode: a countdown per question, three lives, a streak multiplier. Misses go to
   localStorage 'cpq:bank' (exported with the rest of your progress by ⇅). */
(function () {
  'use strict';
  if (window.__cpQuiz) return; window.__cpQuiz = 1;

  var PAGE = decodeURIComponent(location.pathname);
  if (/(^|\/)(index\.html?)?$/i.test(PAGE) || /shelf\.html$/i.test(PAGE) || window.CP_QUIZ_OFF) return;
  var NAME = (PAGE.split('/').pop() || '').replace(/\.html?$/i, '');
  var LS_BEST = 'cpq:best:' + PAGE, LS_BANK = 'cpq:bank', LS_PREF = 'cpq:prefs';

  /* ---------------- small helpers ---------------- */
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function uniq(a) { var s = {}; return a.filter(function (x) { var k = String(x).toLowerCase(); if (s[k]) return false; s[k] = 1; return true; }); }
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function txt(el) { return norm(el ? (el.innerText || el.textContent || '') : ''); }
  function clip(s, n) {
    s = norm(s); if (s.length <= n) return s;
    var cut = s.slice(0, n), dot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
    return dot > n * 0.45 ? cut.slice(0, dot + 1) : cut.replace(/\s+\S*$/, '') + '…';
  }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function mine(el) { return !!(el.closest && el.closest('#cpq-root,#cpq-pill,#cpx-panel,#cpx-fab,#cpx-tools,.cpb-pill,script,style,noscript,[hidden],[aria-hidden="true"]')); }
  function visible(el) { return !!(el.offsetParent || el.getClientRects().length) || /^(PRE|CODE)$/.test(el.tagName); }

  /* ---------------- language model ---------------- */
  var KW = {
    sql: ('SELECT FROM WHERE GROUP_BY ORDER_BY HAVING LIMIT OFFSET JOIN LEFT_JOIN RIGHT_JOIN INNER_JOIN FULL_JOIN CROSS_JOIN ON USING AS DISTINCT ' +
      'COUNT SUM AVG MIN MAX AND OR NOT IN BETWEEN LIKE ILIKE IS_NULL IS_NOT_NULL NULL CASE WHEN THEN ELSE END UNION UNION_ALL INTERSECT EXCEPT ' +
      'EXISTS INSERT_INTO VALUES UPDATE SET DELETE CREATE_TABLE ALTER_TABLE DROP_TABLE PRIMARY_KEY FOREIGN_KEY REFERENCES DEFAULT UNIQUE CHECK ' +
      'DESC ASC WITH OVER PARTITION_BY ROW_NUMBER RANK DENSE_RANK COALESCE NULLIF ROUND CAST UPPER LOWER LENGTH SUBSTR TRIM CONCAT NOW ' +
      'EXTRACT DATE_TRUNC VIEW INDEX RETURNING LAG LEAD').split(' ').map(function (k) { return k.replace(/_/g, ' '); }),
    python: ('def return if elif else for in while break continue import from as with try except finally raise lambda yield class pass ' +
      'None True False and or not is global nonlocal assert del print len range enumerate zip sorted reversed list dict set tuple str int float ' +
      'bool sum min max abs round open input type isinstance append extend insert pop remove keys values items get split join strip replace ' +
      'upper lower format startswith endswith count index sort map filter any all self __init__ super').split(' '),
    c: ('int char float double long short unsigned signed void return if else for while do switch case break continue default struct union ' +
      'enum typedef sizeof const static extern include define printf scanf malloc calloc realloc free NULL main cout cin endl std namespace ' +
      'class public private protected virtual new delete template typename auto bool true false nullptr string vector').split(' '),
    vba: ('Sub End Function Dim As Set If Then Else ElseIf For Next Each In Do Loop While Wend With Range Cells Worksheets Workbooks Value ' +
      'MsgBox Integer Long String Double Boolean Variant Object Nothing True False And Or Not Exit Call ByVal ByRef Private Public Const').split(' ')
  };
  /* words that are only "the keyword" when called — otherwise they are just a column / variable name */
  var CALLISH = {
    sql: /^(COUNT|SUM|AVG|MIN|MAX|ROW_NUMBER|RANK|DENSE_RANK|COALESCE|NULLIF|ROUND|CAST|UPPER|LOWER|LENGTH|SUBSTR|TRIM|CONCAT|NOW|EXTRACT|DATE_TRUNC|LAG|LEAD)$/,
    python: /^(print|len|range|enumerate|zip|sorted|reversed|list|dict|set|tuple|str|int|float|bool|sum|min|max|abs|round|open|input|type|isinstance|append|extend|insert|pop|remove|keys|values|items|get|split|join|strip|replace|upper|lower|format|startswith|endswith|count|index|sort|map|filter|any|all|super)$/,
    c: /^(printf|scanf|malloc|calloc|realloc|free|main)$/,
    vba: /^(MsgBox|Range|Cells|Worksheets|Workbooks)$/
  };
  var COMMENT = { sql: /--[^\n]*/g, python: /#[^\n]*/g, c: /\/\/[^\n]*|\/\*[\s\S]*?\*\//g, vba: /'[^\n]*/g };
  var STRING = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g;
  var GENERIC_HEAD = /^(why this matters|the mental model|walk-?through|try it|predict the output|what trips people here|your turn|quick recap|what to carry forward|lessons?|what this module covers|overview|summary|introduction|intro|exercises?|practice|notes?|examples?|recap|setup|prerequisites|contents|table of contents|next steps?|references?|resources|query console|output.*|use cases|concept|drills?|quiz|checkpoint|final notes|key takeaways?|takeaways?|jump to|what'?s next|up next|next up|before you start|study the concepts|practice checklist|test your knowledge|what to remember)$/i;

  function guessLang(code) {
    var c = ' ' + code + ' ';
    var s = (c.match(/\b(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|INSERT INTO|CREATE TABLE)\b/g) || []).length +
      (/\bselect\b[\s\S]*\bfrom\b/.test(c) ? 2 : 0);
    var p = (c.match(/\b(def|elif|import|print\(|lambda|self|None|True|False)\b|:\s*\n/g) || []).length;
    var cc = (c.match(/#include|\bint main\b|printf\(|std::|;\s*\n\s*}|cout\s*<</g) || []).length;
    var v = (c.match(/\b(End Sub|Dim |MsgBox|Worksheets|ElseIf)\b/g) || []).length;
    // the folder a page lives in is a strong prior: a traceback in a Python lesson is not SQL
    if (/\/sql\//i.test(PAGE)) s += 1.5; else if (/python/i.test(PAGE)) p += 1.5; else if (/c_and_cpp/i.test(PAGE)) cc += 1.5; else if (/vba/i.test(PAGE)) v += 1.5;
    var best = Math.max(s, p, cc, v);
    if (best < 1) {
      if (/\/sql\//i.test(PAGE)) return 'sql';
      if (/python/i.test(PAGE)) return 'python';
      if (/c_and_cpp|\/c\//i.test(PAGE)) return 'c';
      if (/vba/i.test(PAGE)) return 'vba';
      return 'python';
    }
    return best === s ? 'sql' : best === p ? 'python' : best === cc ? 'c' : 'vba';
  }

  /* tokens in `code` that are worth blanking: language keywords outside strings/comments.
     SQL two-word clauses (GROUP BY, IS NOT NULL …) come back as one token. */
  function tokens(code, lang) {
    var dead = [], m, re;
    [STRING, COMMENT[lang]].forEach(function (r) { r.lastIndex = 0; while ((m = r.exec(code))) dead.push([m.index, m.index + m[0].length]); });
    function isDead(i) { for (var k = 0; k < dead.length; k++) if (i >= dead[k][0] && i < dead[k][1]) return true; return false; }
    var set = {}; KW[lang].forEach(function (k) { set[lang === 'sql' || lang === 'vba' ? k.toUpperCase() : k] = k; });
    var out = [];
    if (lang === 'sql') re = /\b(GROUP\s+BY|ORDER\s+BY|PARTITION\s+BY|IS\s+NOT\s+NULL|IS\s+NULL|UNION\s+ALL|INSERT\s+INTO|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|PRIMARY\s+KEY|FOREIGN\s+KEY|(?:LEFT|RIGHT|INNER|FULL|CROSS)(?:\s+OUTER)?\s+JOIN|[A-Za-z_][A-Za-z0-9_]*)\b/g;
    else re = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
    while ((m = re.exec(code))) {
      if (isDead(m.index)) continue;
      var w = m[0], key = lang === 'sql' || lang === 'vba' ? w.replace(/\s+/g, ' ').toUpperCase() : w;
      if (lang === 'sql') key = key.replace(/ OUTER JOIN$/, ' JOIN');
      if (!set[key]) continue;
      if (lang === 'vba') key = set[key];
      if (CALLISH[lang].test(lang === 'sql' ? key.replace(/ /g, '_') : key) && lang !== 'vba' && !/^\s*\(/.test(code.slice(m.index + w.length))) continue;
      out.push({ i: m.index, w: w, key: key });
    }
    return out;
  }

  /* ---------------- harvest the page ---------------- */
  function harvestCode() {
    var seen = {}, out = [];
    function add(code, el) {
      code = String(code || '').replace(/ /g, ' ').replace(/\s+$/, '').replace(/^\n+/, '');
      var lines = code.split('\n');
      if (code.length < 12 || lines.length > 22 || !/[A-Za-z]/.test(code) || /^\s*Traceback \(most recent/.test(code)) return;
      if (/^(>>>|\$|In \[)/.test(code)) code = code.replace(/^(>>> |\.\.\. |\$ )/gm, '');
      var k = code.replace(/\s+/g, ' ');
      if (seen[k]) return; seen[k] = 1;
      out.push({ code: code, ctx: headingFor(el) });
    }
    document.querySelectorAll('.CodeMirror').forEach(function (cm) {
      if (mine(cm)) return;
      var v = cm.CodeMirror && cm.CodeMirror.getValue ? cm.CodeMirror.getValue() : '';
      if (!v) v = Array.prototype.map.call(cm.querySelectorAll('.CodeMirror-line'), function (l) { return l.textContent; }).join('\n');
      add(v, cm);
    });
    document.querySelectorAll('pre, textarea').forEach(function (el) {
      if (mine(el) || el.closest('.CodeMirror')) return;
      if (el.tagName === 'TEXTAREA' && !/code|sql|editor|py/i.test(el.className + el.id + (el.getAttribute('spellcheck') === 'false' ? ' code' : ''))) return;
      add(el.tagName === 'TEXTAREA' ? el.value : (el.innerText || el.textContent), el);
    });
    return out;
  }
  function headingFor(el) {
    var n = el;
    for (var hops = 0; n && hops < 400; hops++) {
      if (n.previousElementSibling) { n = n.previousElementSibling; while (n.lastElementChild && !/^H[1-4]$/.test(n.tagName)) { var h = n.querySelector('h1,h2,h3,h4'); if (!h) break; var hs = n.querySelectorAll('h1,h2,h3,h4'); n = hs[hs.length - 1]; } }
      else n = n.parentElement;
      if (n && /^H[1-4]$/.test(n.tagName) && !mine(n)) { var t = cleanHead(txt(n)); if (t && t.length < 80) return GENERIC_HEAD.test(t) ? '' : t; }
    }
    return '';
  }

  /* "§ II  The SQL funnel", "A Study the concepts", "Life calculation p.350–354 🔒" → the bare title */
  function cleanHead(t) {
    return norm(t).replace(/^[^\w(]+/, '').replace(/^(?:[IVX]+|\d+(?:\.\d+)*|[A-H](?=\s+[A-Z]))[.)]?\s+/, '')
      .replace(/\s+pp?\.\s*\d+(?:\s*[–-]\s*\d+)?$/, '').replace(/[^\w)\]'"`?+*]+$/, '');
  }

  /* UI furniture, not content: nav bars, mascots, progress strips, anything pinned to the viewport */
  function chrome(el) {
    if (el.closest('nav,header,footer,aside,button,a,[role=navigation],[role=dialog],.toc,.topbar,.hud,.cobra,.progressbar,#reading-sync-bar,.eol,.next,.lr-ui,.lr-sheet')) return true;
    for (var n = el, i = 0; n && n !== document.body && i < 10; n = n.parentElement, i++) {
      var pos = getComputedStyle(n).position; if (pos === 'fixed' || pos === 'sticky') return true;
    }
    return false;
  }

  /* term ↔ meaning pairs */
  function harvestPairs() {
    var pairs = [], terms = {};
    function add(term, def, src, el) {
      if (el && chrome(el)) return;
      term = norm(term).replace(/^[^\w(\[<'"*.#]+/, '').replace(/[\s:.\-–—]+$/, '').replace(/\s*[^\w)\]'"`?+*\s]+$/, '').trim();
      if (!/[A-Za-z]{2}/.test(term) || /·|→|←/.test(term) || (src === 'card' && /\d/.test(term))) return;
      if (/^(easy|medium|hard|stretch|bonus|new|newly written|updated|optional|required|next|previous|prev|done|todo|jump to|final notes|key takeaways?|takeaways?|tl;?dr)$/i.test(term)) return;
      def = norm(def).replace(/^[\s:.\-–—|·→=]+/, '');
      if (term.length < 1 || term.length > 60 || def.length < 14 || /^\d+([.,]\d+)?%?$/.test(term)) return;
      if (/^(xp|note|tip|warning|concept|use cases|output.*|example|why|answer|hint|step \d+)$/i.test(term)) return;
      if (term.split(/\s+/).length > 9) return;
      var masked = def.replace(new RegExp('\\b' + reEsc(term) + '\\b', 'gi'), '____');
      var k = term.toLowerCase();
      if (terms[k]) { if (def.length > terms[k].raw.length) { terms[k].def = clip(masked, 170); terms[k].raw = def; } return; }
      // "LIMIT" and "LIMIT N" would be indistinguishable options — keep the first one seen
      for (var o in terms) if ((' ' + o + ' ').indexOf(' ' + k + ' ') >= 0 || (' ' + k + ' ').indexOf(' ' + o + ' ') >= 0) return;
      terms[k] = { term: term, def: clip(masked, 170), raw: def, src: src };
      pairs.push(terms[k]);
    }
    // 1. <dl>
    document.querySelectorAll('dt').forEach(function (dt) { if (mine(dt)) return; var dd = dt.nextElementSibling; if (dd && dd.tagName === 'DD') add(txt(dt), txt(dd), 'dl', dt); });
    // 2. bold / code lead:  <p><strong>Term</strong> — meaning</p>
    document.querySelectorAll('strong, b, dfn').forEach(function (b) {
      if (mine(b) || !visible(b)) return;
      var p = b.parentElement; if (!p) return;
      var whole = txt(p), lead = txt(b);
      if (!lead || whole.indexOf(lead) > 3) return;
      add(lead, whole.slice(whole.indexOf(lead) + lead.length), 'bold', p);
    });
    // 3. small cards: a short label element directly followed by a sentence (WHERE / "Keep only the rows…")
    document.querySelectorAll('div, li, article, section').forEach(function (card) {
      if (mine(card) || card.children.length < 2 || card.children.length > 4) return;
      var a = card.children[0], b = card.children[1];
      if (a.children.length > 2 || /^(H1|H2|BUTTON|A|INPUT|LABEL)$/.test(a.tagName) || card.querySelector('button,input,select,textarea,pre,.CodeMirror')) return;
      var t = txt(a), d = txt(b);
      if (t && t.length <= 34 && d.length >= 30 && d.length <= 400 && !/[.?!]$/.test(t) && txt(card).length < 520) add(t, d, 'card', card);
    });
    // 4. two-column-ish tables with prose in column 2
    document.querySelectorAll('table').forEach(function (tb) {
      if (mine(tb)) return;
      var rows = Array.prototype.filter.call(tb.querySelectorAll('tr'), function (r) { return r.querySelectorAll('td').length >= 2; });
      if (rows.length < 3) return;
      var prose = rows.filter(function (r) { var c = r.querySelectorAll('td')[1]; return /\s\S+\s/.test(txt(c)) && txt(c).length >= 14; }).length;
      if (prose < rows.length * 0.6) return;
      rows.forEach(function (r) { var c = r.querySelectorAll('td'); add(txt(c[0]), txt(c[1]), 'table', tb); });
    });
    // 5. headed concepts: "Loop with step size" → first sentence under it
    document.querySelectorAll('h2, h3, h4').forEach(function (h) {
      if (mine(h)) return;
      var t = cleanHead(txt(h));
      if (!t || GENERIC_HEAD.test(t) || /^(challenge|solution|exercise|example|step|task|problem|question|lesson|part|module|section)\b/i.test(t) || t.split(/\s+/).length > 7) return;
      var n = h.nextElementSibling, hops = 0;
      while (n && hops++ < 4) {
        var s = txt(n);
        if (/^H[1-4]$/.test(n.tagName)) break;
        if (n.tagName !== 'PRE' && s.length >= 30 && !n.querySelector('pre,.CodeMirror')) { add(t, s.replace(/^📘\s*Concept\s*/i, ''), 'heading', h); break; }
        n = n.nextElementSibling;
      }
    });
    return pairs.filter(function (p) { return p.def.replace(/____/g, '').length > 12; });
  }

  /* `x = 5   # tie x to the integer 5`  → code ↔ comment pairs */
  function commentPairs(snips) {
    var out = [], seen = {};
    snips.forEach(function (s) {
      var lang = guessLang(s.code), mark = lang === 'sql' ? '--' : lang === 'c' ? '//' : lang === 'vba' ? "'" : '#';
      s.code.split('\n').forEach(function (line) {
        var i = line.indexOf(' ' + mark); if (i < 0) return;
        var code = line.slice(0, i).trim(), com = line.slice(i + mark.length + 1).trim();
        if (code.length < 3 || code.length > 48 || code.indexOf('...') >= 0 || code.indexOf('…') >= 0 || com.length < 8 || /["']/.test(com.charAt(0)) || seen[code]) return;
        if ((code.match(/"/g) || []).length % 2 || (code.match(/'/g) || []).length % 2) return;
        seen[code] = 1; out.push({ term: code, def: com, code: true });
      });
    });
    return out;
  }

  /* ---------------- question builders ---------------- */
  function blankCode(snip, nBlanks) {
    var lang = guessLang(snip.code), toks = tokens(snip.code, lang);
    if (!toks.length) return null;
    var byKey = {}; toks.forEach(function (t) { (byKey[t.key] = byKey[t.key] || []).push(t); });
    var keys = shuffle(Object.keys(byKey));
    // prefer "interesting" keywords over ubiquitous ones
    var boring = { 'SELECT': 1, 'FROM': 1, 'print': 1, 'in': 1, 'AS': 1, 'int': 1, 'self': 1 };
    keys.sort(function (a, b) { return (boring[a] ? 1 : 0) - (boring[b] ? 1 : 0); });
    var chosen = keys.slice(0, nBlanks).map(function (k) { return pick(byKey[k]); }).sort(function (a, b) { return a.i - b.i; });
    var parts = [], last = 0;
    chosen.forEach(function (t, n) { parts.push(snip.code.slice(last, t.i), { blank: n }); last = t.i + t.w.length; });
    parts.push(snip.code.slice(last));
    return { lang: lang, parts: parts, answers: chosen.map(function (t) { return t.key; }), ctx: snip.ctx };
  }
  function lures(answer, lang, pool) {
    var cands = uniq(pool.concat(KW[lang])).filter(function (k) { return k.toLowerCase() !== answer.toLowerCase(); });
    // same rough shape first: function-ish with function-ish, short with short
    var fnish = /^(COUNT|SUM|AVG|MIN|MAX|ROUND|COALESCE|UPPER|LOWER|LENGTH|len|range|print|sorted|sum|min|max|int|str|float|list|dict|set|enumerate|zip|map|filter|printf|malloc|free)$/;
    var same = cands.filter(function (k) { return !!fnish.test(k) === !!fnish.test(answer); });
    return shuffle(same.length >= 3 ? same : cands).slice(0, 3);
  }

  function genFill(snips, n) {
    var out = [];
    shuffle(snips).forEach(function (s) {
      if (out.length >= n) return;
      var lines = s.code.split('\n').length, b = blankCode(s, lines > 4 ? 3 : lines > 1 ? 2 : 1);
      if (!b || !b.answers.length) return;
      out.push({ type: 'fill', auto: true, ask: 'Type the missing ' + (b.answers.length > 1 ? 'keywords' : 'keyword') + (b.ctx ? ' <span class="cpq-ctx">— ' + esc(b.ctx) + '</span>' : ''),
        parts: b.parts, blanks: b.answers.map(function (a) { return { a: a }; }), ci: b.lang === 'sql' || b.lang === 'vba', lang: b.lang });
    });
    return out;
  }

  function genMcq(snips, pairs, n) {
    var out = [], pool = [];
    snips.forEach(function (s) { tokens(s.code, guessLang(s.code)).forEach(function (t) { pool.push(t.key); }); });
    pool = uniq(pool);
    // concept questions: which term matches this description / what does TERM mean
    var good = pairs.filter(function (p) { return !p.code; });
    shuffle(good).forEach(function (p, i) {
      var others = shuffle(good.filter(function (o) { return o !== p; }));
      if (others.length < 3) return;
      if (i % 2 === 0) {
        out.push({ type: 'mcq', auto: true, ask: 'Which term fits this description?', quote: p.def,
          options: [p.term].concat(others.slice(0, 3).map(function (o) { return o.term; })), answer: 0, why: '<b>' + esc(p.term) + '</b> — ' + esc(clip(p.raw, 220)), plain: true });
      } else {
        out.push({ type: 'mcq', auto: true, ask: 'What does <b>' + esc(p.term) + '</b> describe?',
          options: [p.def].concat(others.slice(0, 3).map(function (o) { return o.def; })), answer: 0, plain: true });
      }
    });
    // code questions: one blank, four keyword choices
    shuffle(snips).forEach(function (s) {
      var b = blankCode(s, 1); if (!b) return;
      var ls = lures(b.answers[0], b.lang, pool); if (ls.length < 3) return;
      out.push({ type: 'mcq', auto: true, ask: 'Which keyword was in this snippet?' + (b.ctx ? ' <span class="cpq-ctx">— ' + esc(b.ctx) + '</span>' : ''),
        parts: b.parts, options: [b.answers[0]].concat(ls), answer: 0, code: true });
    });
    return shuffle(out).slice(0, n);
  }

  function genMatch(pairs, cpairs, n) {
    var out = [], prose = shuffle(pairs.filter(function (p) { return !p.code; })), code = shuffle(cpairs);
    function chunk(list, label) {
      while (list.length >= 3 && out.length < n) {
        var take = list.length >= 8 ? 4 : list.length >= 5 ? Math.min(5, list.length) : list.length;
        if (list.length - take > 0 && list.length - take < 3) take = list.length > 5 ? list.length - 3 : list.length;
        take = Math.min(take, 6);
        out.push({ type: 'match', auto: true, ask: label, pairs: list.splice(0, take).map(function (p) { return [p.term, p.def]; }), codeLeft: label.indexOf('line') > 0 });
      }
    }
    chunk(prose, 'Match each term to its meaning');
    chunk(code, 'Match each line of code to what it does');
    return out;
  }

  /* drill data already on the page (Python lessons) */
  function fromDrills() {
    var d = window.LESSON_DRILL_DATA, out = [];
    if (!Array.isArray(d)) return out;
    d.forEach(function (v) {
      if (v.d1 && v.d1.code && v.d1.blanks) {
        var parts = [], re = /\{\{(\d+)\}\}/g, m, last = 0;
        while ((m = re.exec(v.d1.code))) { parts.push(v.d1.code.slice(last, m.index), { blank: +m[1] - 1 }); last = m.index + m[0].length; }
        parts.push(v.d1.code.slice(last));
        out.push({ type: 'fill', ask: v.d1.ask, parts: parts, blanks: v.d1.blanks.map(function (b) { return { a: b.a, lures: b.lures }; }), why: v.d1.why });
      }
      if (v.d2 && v.d2.options) out.push({ type: 'mcq', ask: v.d2.ask, codeText: v.d2.code, options: v.d2.options, answer: v.d2.answer, why: v.d2.why, html: true });
    });
    return out;
  }

  /* authored bank: normalise the friendly format into the internal one */
  function fromBank(bank) {
    return (bank || []).map(function (q) {
      q = Object.assign({}, q);
      if (q.type === 'fill' && typeof q.code === 'string' && !q.parts) {
        var parts = [], re = /\{\{(\d+)\}\}/g, m, last = 0;
        while ((m = re.exec(q.code))) { parts.push(q.code.slice(last, m.index), { blank: +m[1] - 1 }); last = m.index + m[0].length; }
        parts.push(q.code.slice(last)); q.parts = parts;
        q.blanks = (q.blanks || []).map(function (b) { return typeof b === 'string' ? { a: b } : b; });
      }
      if (q.type === 'fill' && typeof q.text === 'string' && !q.parts) { // sentence blanks
        var p2 = [], re2 = /\{\{(\d+)\}\}/g, m2, l2 = 0;
        while ((m2 = re2.exec(q.text))) { p2.push(q.text.slice(l2, m2.index), { blank: +m2[1] - 1 }); l2 = m2.index + m2[0].length; }
        p2.push(q.text.slice(l2)); q.parts = p2; q.prose = true;
        q.blanks = (q.blanks || []).map(function (b) { return typeof b === 'string' ? { a: b } : b; });
      }
      if (q.type === 'mcq' && q.code) { q.codeText = q.code; delete q.code; }
      if (q.type === 'match' && q.pairs && !Array.isArray(q.pairs[0])) q.pairs = Object.keys(q.pairs).map(function (k) { return [k, q.pairs[k]]; });
      q.html = q.html !== false;
      q.ask = q.ask || q.q || '';
      return q;
    }).filter(function (q) { return /^(mcq|fill|match)$/.test(q.type); });
  }

  function buildDeck(types, count) {
    var bank = fromBank(window.CP_QUIZ_BANK).concat(fromDrills());
    var snips = harvestCode(), pairs = harvestPairs(), cpairs = commentPairs(snips);
    var want = {}; types.forEach(function (t) { want[t] = Math.ceil(count / types.length) + 2; });
    var pools = {
      mcq: bank.filter(function (q) { return q.type === 'mcq'; }).concat(want.mcq ? genMcq(snips, pairs, want.mcq * 2) : []),
      fill: bank.filter(function (q) { return q.type === 'fill'; }).concat(want.fill ? genFill(snips, want.fill * 2) : []),
      match: bank.filter(function (q) { return q.type === 'match'; }).concat(want.match ? genMatch(pairs, cpairs, want.match) : [])
    };
    // authored questions first (shuffled among themselves), then generated ones
    Object.keys(pools).forEach(function (k) {
      var a = pools[k].filter(function (q) { return !q.auto; }), g = pools[k].filter(function (q) { return q.auto; });
      pools[k] = shuffle(a).concat(shuffle(g));
    });
    var deck = [], i = 0, guard = 0;
    while (deck.length < count && guard++ < count * 6) {
      var t = types[i++ % types.length], q = pools[t].shift();
      if (q) deck.push(q);
      if (!types.some(function (x) { return pools[x].length; })) break;
    }
    return { deck: shuffle(deck), stats: { authored: bank.length, code: snips.length, pairs: pairs.length + cpairs.length } };
  }

  /* ---------------- styles ---------------- */
  var FONT = 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;';
  var MONO = 'font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;';
  var css = document.createElement('style');
  css.textContent =
    '#cpq-pill{position:fixed;left:48px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:9998;height:30px;padding:0 12px 0 10px;border-radius:999px;border:1px solid #d8cbb8;background:#fffdf7;color:#5a4632;' + FONT + 'font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);opacity:.72;display:flex;align-items:center;gap:6px}' +
    '#cpq-pill:hover{opacity:1;border-color:#8a5a2b}' +
    '#cpq-root{--bg:#fffdf8;--ink:#1f1a14;--soft:#5b5246;--mute:#8d8374;--line:#e6ddcf;--line2:#f1ebe1;--acc:#4f46e5;--acc-bg:#eef0ff;--ok:#047857;--ok-bg:#e7f6ef;--bad:#b42318;--bad-bg:#fdecea;--warn:#b45309;--code-bg:#1f2330;--code-ink:#e8e6df;' +
      'position:fixed;inset:0;z-index:2147483000;background:rgba(20,16,10,.55);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:max(16px,4vh) 16px 40px;box-sizing:border-box;' + FONT + 'color:var(--ink);font-size:15px;line-height:1.5;text-align:left}' +
    '@media (prefers-color-scheme:dark){#cpq-root{--bg:#1b1916;--ink:#f1ece4;--soft:#c9c0b2;--mute:#958b7d;--line:#3a352e;--line2:#2a2722;--acc:#8b93ff;--acc-bg:#272a4a;--ok:#4ade80;--ok-bg:#16301f;--bad:#f87171;--bad-bg:#3a1c1a;--warn:#fbbf24;--code-bg:#111318}}' +
    '#cpq-root *{box-sizing:border-box}' +
    '#cpq-card{width:100%;max-width:720px;background:var(--bg);border:1px solid var(--line);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden;position:relative}' +
    '#cpq-card.cpq-shake{animation:cpqShake .35s}@keyframes cpqShake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}' +
    '.cpq-top{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line2)}' +
    '.cpq-title{font-weight:700;font-size:14px;letter-spacing:.02em;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cpq-x{border:0;background:none;color:var(--mute);font-size:22px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:6px}.cpq-x:hover{color:var(--ink);background:var(--line2)}' +
    '.cpq-hud{display:flex;gap:10px;align-items:center;' + MONO + 'font-size:12px;color:var(--soft)}' +
    '.cpq-hud .cpq-lives{color:#e11d48;letter-spacing:1px;font-size:14px}.cpq-hud .cpq-streak{color:var(--warn);font-weight:700}' +
    '.cpq-bar{height:4px;background:var(--line2)}.cpq-bar i{display:block;height:100%;background:var(--acc);transition:width .3s}' +
    '.cpq-timer{height:6px;background:var(--line2)}.cpq-timer i{display:block;height:100%;background:#16a34a;transition:width .25s linear,background .3s}' +
    '.cpq-timer i.cpq-low{background:#dc2626}' +
    '.cpq-body{padding:22px 22px 8px}' +
    '.cpq-kind{display:inline-block;' + MONO + 'font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);background:var(--acc-bg);border-radius:999px;padding:3px 10px;margin-bottom:10px}' +
    '.cpq-ask{font-size:17px;font-weight:600;margin:0 0 14px}.cpq-ctx{font-weight:400;color:var(--mute);font-size:14px}' +
    '.cpq-quote{border-left:3px solid var(--acc);background:var(--acc-bg);padding:10px 14px;border-radius:0 10px 10px 0;margin:0 0 14px;color:var(--ink)}' +
    '.cpq-code{background:var(--code-bg);color:var(--code-ink);' + MONO + 'font-size:13.5px;line-height:1.65;padding:14px 16px;border-radius:12px;white-space:pre-wrap;word-break:break-word;margin:0 0 16px;overflow-x:auto}' +
    '.cpq-prose{font-size:16px;line-height:2.1;margin:0 0 16px}' +
    '.cpq-slot{display:inline-block;min-width:3.5em;border-bottom:2px dashed #a5b4fc;color:#a5b4fc;text-align:center;padding:0 4px}' +
    '.cpq-in{' + MONO + 'font-size:13.5px;background:#2b3043;color:#fff;border:1.5px solid #6366f1;border-radius:6px;padding:1px 6px;margin:0 1px;outline:none;min-width:4ch}' +
    '.cpq-prose .cpq-in{background:var(--acc-bg);color:var(--ink);border-color:var(--acc)}' +
    '.cpq-in:focus{box-shadow:0 0 0 3px rgba(99,102,241,.35)}' +
    '.cpq-in.cpq-ok{border-color:#22c55e;background:#14532d;color:#dcfce7}.cpq-in.cpq-bad{border-color:#ef4444;background:#7f1d1d;color:#fee2e2;text-decoration:line-through}' +
    '.cpq-prose .cpq-in.cpq-ok{background:var(--ok-bg);color:var(--ok)}.cpq-prose .cpq-in.cpq-bad{background:var(--bad-bg);color:var(--bad)}' +
    '.cpq-fix{color:#4ade80;font-weight:700;margin-left:4px}.cpq-prose .cpq-fix{color:var(--ok)}' +
    '.cpq-opts{display:grid;gap:9px;margin:0 0 14px}' +
    '.cpq-opt{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:12px;padding:11px 14px;cursor:pointer;font:inherit;transition:border-color .12s,background .12s}' +
    '.cpq-opt:hover:not([disabled]){border-color:var(--acc);background:var(--acc-bg)}' +
    '.cpq-opt .cpq-k{flex:none;width:22px;height:22px;border-radius:6px;border:1px solid var(--line);' + MONO + 'font-size:11.5px;display:flex;align-items:center;justify-content:center;color:var(--mute);margin-top:1px}' +
    '.cpq-opt.cpq-code-opt span:last-child{' + MONO + 'font-size:13.5px}' +
    '.cpq-opt.cpq-ok{border-color:var(--ok);background:var(--ok-bg)}.cpq-opt.cpq-bad{border-color:var(--bad);background:var(--bad-bg)}' +
    '.cpq-opt[disabled]{cursor:default}' +
    '.cpq-match{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:9px 12px;margin:0 0 14px}' +
    '.cpq-col{display:grid;gap:9px;align-content:start}' +
    '.cpq-tile{border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:11px;padding:9px 12px;cursor:pointer;font:inherit;font-size:14px;text-align:left;transition:all .12s;min-height:42px}' +
    '.cpq-tile.cpq-mono{' + MONO + 'font-size:13px}' +
    '.cpq-tile:hover:not([disabled]){border-color:var(--acc)}.cpq-tile.cpq-sel{border-color:var(--acc);background:var(--acc-bg);box-shadow:0 0 0 3px rgba(99,102,241,.18)}' +
    '.cpq-tile.cpq-done{opacity:.55;cursor:default}.cpq-tile.cpq-flash{border-color:var(--bad);background:var(--bad-bg);animation:cpqShake .3s}' +
    '.cpq-tile .cpq-tag{display:inline-block;min-width:18px;' + MONO + 'font-size:11px;color:#fff;border-radius:5px;padding:0 5px;margin-right:6px;text-align:center}' +
    '.cpq-col > i{font-style:normal;' + MONO + 'font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}' +
    '@media (max-width:560px){.cpq-match{gap:7px;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr)}.cpq-col{gap:7px}.cpq-tile{font-size:12.5px;padding:7px 8px;min-height:38px;word-break:break-word}.cpq-tile.cpq-mono{font-size:11.5px}.cpq-body{padding:18px 14px 6px}.cpq-ask{font-size:16px}#cpq-root{padding:10px 8px 30px}}' +
    '.cpq-why{border-radius:12px;padding:11px 14px;margin:0 0 14px;font-size:14px}.cpq-why.cpq-ok{background:var(--ok-bg);color:var(--ink);border:1px solid var(--ok)}.cpq-why.cpq-bad{background:var(--bad-bg);color:var(--ink);border:1px solid var(--bad)}' +
    '.cpq-why b.cpq-v{display:block;margin-bottom:3px}.cpq-why.cpq-ok b.cpq-v{color:var(--ok)}.cpq-why.cpq-bad b.cpq-v{color:var(--bad)}' +
    '.cpq-why code,.cpq-ask code,.cpq-opt code,.cpq-quote code{' + MONO + 'font-size:.9em;background:var(--line2);padding:0 4px;border-radius:4px}' +
    '.cpq-foot{display:flex;gap:10px;align-items:center;justify-content:flex-end;padding:12px 22px 20px;flex-wrap:wrap}' +
    '.cpq-foot .cpq-hint{margin-right:auto;color:var(--mute);font-size:12px;' + MONO + '}' +
    '.cpq-btn{border:1.5px solid var(--acc);background:var(--acc);color:#fff;border-radius:10px;padding:9px 18px;font:inherit;font-weight:600;font-size:14px;cursor:pointer}' +
    '.cpq-btn:hover{filter:brightness(1.08)}.cpq-btn.cpq-ghost{background:transparent;color:var(--acc)}.cpq-btn[disabled]{opacity:.45;cursor:default}' +
    '.cpq-setup h2{font-size:22px;margin:0 0 4px}.cpq-setup p.cpq-sub{color:var(--soft);margin:0 0 18px}' +
    '.cpq-row{margin:0 0 16px}.cpq-row > b{display:block;' + MONO + 'font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);margin-bottom:8px;font-weight:600}' +
    '.cpq-chips{display:flex;gap:8px;flex-wrap:wrap}' +
    '.cpq-chip{border:1.5px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:7px 14px;font:inherit;font-size:14px;cursor:pointer}' +
    '.cpq-chip.cpq-on{border-color:var(--acc);background:var(--acc-bg);color:var(--acc);font-weight:600}' +
    '.cpq-stress{display:flex;gap:12px;align-items:flex-start;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;cursor:pointer}' +
    '.cpq-stress.cpq-on{border-color:#e11d48;background:rgba(225,29,72,.07)}.cpq-stress input{margin-top:4px;accent-color:#e11d48}' +
    '.cpq-stress small{display:block;color:var(--soft)}' +
    '.cpq-meta{' + MONO + 'font-size:11.5px;color:var(--mute);margin-top:14px}' +
    '.cpq-score{text-align:center;padding:10px 0 4px}.cpq-score .cpq-big{font-size:52px;font-weight:800;letter-spacing:-.02em;line-height:1.1}' +
    '.cpq-score .cpq-grade{font-size:15px;color:var(--soft);margin-top:4px}' +
    '.cpq-stats{display:flex;justify-content:center;gap:22px;flex-wrap:wrap;margin:14px 0 18px;' + MONO + 'font-size:12px;color:var(--soft)}.cpq-stats b{display:block;font-size:18px;color:var(--ink)}' +
    '.cpq-review{border-top:1px solid var(--line2);padding-top:14px}.cpq-review h3{font-size:13px;' + MONO + 'letter-spacing:.1em;text-transform:uppercase;color:var(--mute);margin:0 0 10px}' +
    '.cpq-miss{border:1px solid var(--line);border-left:3px solid var(--bad);border-radius:10px;padding:9px 12px;margin-bottom:8px;font-size:14px}' +
    '.cpq-miss .cpq-a{color:var(--ok);font-weight:600}' +
    '.cpq-empty{padding:12px 0 18px;color:var(--soft)}' +
    /* lesson check: main action first; on desktop it sits on the right, on phones the buttons stack full width */
    '.cpq-foot-check{flex-direction:row-reverse;justify-content:flex-start}' +
    '@media (max-width:560px){.cpq-foot-check{flex-direction:column;align-items:stretch}.cpq-foot-check .cpq-btn{width:100%;min-height:46px}}';
  document.head.appendChild(css);

  /* ---------------- quiz state & UI ---------------- */
  var KIND = { mcq: 'Multiple choice', fill: 'Fill in the blanks', match: 'Match the pairs' };
  var TIME = { mcq: 15, fill: 35, match: 45 };
  var prefs = Object.assign({ types: ['mcq', 'fill', 'match'], count: 10, stress: false }, load(LS_PREF, {}));
  var root, card, S, tick;
  var CHECK = null;   // set by CPQuiz.check(): a fixed short quiz with a pass mark, no setup screen

  function open(skipSetup) {
    if (root) return;
    root = document.createElement('div'); root.id = 'cpq-root';
    root.innerHTML = '<div id="cpq-card" role="dialog" aria-modal="true" aria-label="Quiz"></div>';
    document.body.appendChild(root); card = root.firstChild;
    root.addEventListener('mousedown', function (e) { if (e.target === root) close(); });
    document.addEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = 'hidden';
    if (skipSetup !== true) setup();
  }
  function close() {
    clearInterval(tick);
    if (CHECK && !CHECK.reported) { var c = CHECK; CHECK = null; if (c.onCancel) try { c.onCancel(); } catch (e) {} }
    CHECK = null;
    if (!root) return;
    document.removeEventListener('keydown', onKey, true);
    root.remove(); root = card = null; S = null;
    document.documentElement.style.overflow = '';
  }
  function topBar(title, hud) {
    return '<div class="cpq-top"><div class="cpq-title">' + title + '</div>' + (hud || '') + '<button class="cpq-x" data-a="close" title="Close (Esc)">×</button></div>';
  }
  function pageTitle() { return (document.title || NAME).replace(/\s*[·|—-]\s*(Commonplace|The Python Book).*$/i, ''); }

  function setup() {
    clearInterval(tick); S = null;
    var best = load(LS_BEST, null);
    card.innerHTML = topBar('🧠 Quiz · ' + esc(pageTitle())) +
      '<div class="cpq-body cpq-setup"><h2>Test what you just read</h2><p class="cpq-sub">Questions come from this page — authored ones first, the rest generated from its code and definitions.</p>' +
      '<div class="cpq-row"><b>Question types</b><div class="cpq-chips">' +
      ['mcq', 'fill', 'match'].map(function (t) { return '<button class="cpq-chip' + (prefs.types.indexOf(t) >= 0 ? ' cpq-on' : '') + '" data-t="' + t + '">' + KIND[t] + '</button>'; }).join('') + '</div></div>' +
      '<div class="cpq-row"><b>How many</b><div class="cpq-chips">' +
      [5, 10, 20].map(function (n) { return '<button class="cpq-chip' + (prefs.count === n ? ' cpq-on' : '') + '" data-n="' + n + '">' + n + '</button>'; }).join('') + '</div></div>' +
      '<div class="cpq-row"><label class="cpq-stress' + (prefs.stress ? ' cpq-on' : '') + '"><input type="checkbox" id="cpq-st"' + (prefs.stress ? ' checked' : '') + '><span><b>🔥 Stress mode</b>' +
      '<small>A clock on every question (' + TIME.mcq + 's / ' + TIME.fill + 's / ' + TIME.match + 's), three lives, and a streak multiplier. Run out of time and it counts as wrong.</small></span></label></div>' +
      '<div class="cpq-meta" id="cpq-meta">' + (best ? 'Best on this page: ' + best.pct + '% · ' + best.score + ' pts' + (best.stress ? ' (stress)' : '') : 'No attempts on this page yet.') + '</div>' +
      '</div><div class="cpq-foot"><span class="cpq-hint">Esc closes · 1–4 picks · Enter submits</span><button class="cpq-btn" data-a="start">Start quiz →</button></div>';
    card.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'close') return close();
      if (b.dataset.t) { var i = prefs.types.indexOf(b.dataset.t); if (i >= 0) { if (prefs.types.length > 1) prefs.types.splice(i, 1); } else prefs.types.push(b.dataset.t); save(LS_PREF, prefs); return setup(); }
      if (b.dataset.n) { prefs.count = +b.dataset.n; save(LS_PREF, prefs); return setup(); }
      if (b.dataset.a === 'start') start();
    };
    card.querySelector('#cpq-st').onchange = function (e) { prefs.stress = e.target.checked; save(LS_PREF, prefs); setup(); };
  }

  function start() {
    var order = CHECK ? ['mcq', 'fill', 'match'] : ['mcq', 'fill', 'match'].filter(function (t) { return prefs.types.indexOf(t) >= 0; });
    var built = buildDeck(order, CHECK ? CHECK.count : prefs.count);
    if (CHECK) {   // a lesson check uses only written questions when there are enough of them
      var authored = fromBank(window.CP_QUIZ_BANK);
      if (authored.length >= CHECK.count) built = { deck: shuffle(authored).slice(0, CHECK.count), stats: built.stats };
    }
    if (CHECK && !built.deck.length) { var c = CHECK; c.reported = true; close(); if (c.onDone) c.onDone({ pass: true, right: 0, asked: 0, empty: true, action: 'continue' }); return; }
    if (!built.deck.length) {
      card.querySelector('#cpq-meta').innerHTML = '<span style="color:var(--bad)">Not enough material on this page for those types yet' +
        (built.stats.code || built.stats.pairs ? '' : ' — open a lesson tab or scroll the content in first') + '. Try another type, or add an authored bank (see _lib/quiz/README.md).</span>';
      return;
    }
    var stress = CHECK ? false : prefs.stress;
    S = { deck: built.deck, i: 0, score: 0, right: 0, streak: 0, bestStreak: 0, lives: stress ? 3 : Infinity, misses: [], stress: stress, t0: Date.now() };
    show();
  }

  function hud() {
    if (!S) return '';
    return '<div class="cpq-hud">' + (S.stress ? '<span class="cpq-lives">' + '♥♥♥'.slice(0, Math.max(0, S.lives)) + '<span style="opacity:.25">' + '♥♥♥'.slice(0, 3 - Math.max(0, S.lives)) + '</span></span>' : '') +
      (S.streak >= 2 ? '<span class="cpq-streak">×' + mult() + ' 🔥' + S.streak + '</span>' : '') + '<span>' + S.score + ' pts</span><span>' + (S.i + 1) + '/' + S.deck.length + '</span></div>';
  }
  function mult() { return S.streak >= 6 ? 3 : S.streak >= 3 ? 2 : 1; }

  function show() {
    clearInterval(tick);
    var q = S.deck[S.i]; S.q = q; S.answered = false;
    var html = topBar('🧠 ' + esc(pageTitle()), hud()) +
      '<div class="cpq-bar"><i style="width:' + (S.i / S.deck.length * 100) + '%"></i></div>' +
      (S.stress ? '<div class="cpq-timer"><i id="cpq-tm" style="width:100%"></i></div>' : '') +
      '<div class="cpq-body"><span class="cpq-kind">' + KIND[q.type] + '</span><div class="cpq-ask">' + (q.ask || '') + '</div>';
    if (q.quote) html += '<div class="cpq-quote">' + esc(q.quote) + '</div>';
    if (q.codeText) html += '<div class="cpq-code">' + (q.html && /<(b|i|code|span)\b/.test(q.codeText) ? q.codeText : esc(q.codeText)) + '</div>';
    if (q.type === 'mcq') html += renderMcq(q);
    else if (q.type === 'fill') html += renderFill(q);
    else html += renderMatch(q);
    html += '<div id="cpq-fb"></div></div><div class="cpq-foot"><span class="cpq-hint">' + hintFor(q) + '</span>' +
      (q.type === 'fill' ? '<button class="cpq-btn cpq-ghost" data-a="skip">I don\'t know</button><button class="cpq-btn" data-a="check">Check</button>' : '') +
      (q.type === 'match' ? '<button class="cpq-btn cpq-ghost" data-a="skip">Give up</button>' : '') + '</div>';
    card.innerHTML = html;
    card.onclick = onClick;
    if (q.type === 'fill') { var f = card.querySelector('.cpq-in'); if (f) f.focus(); }
    if (S.stress) startTimer(TIME[q.type] + (q.type === 'fill' ? 8 * Math.max(0, q.blanks.length - 1) : 0));
  }
  function hintFor(q) { return q.type === 'mcq' ? 'Keys 1–4' : q.type === 'fill' ? 'Tab between blanks · Enter checks' : 'Tap a term, then its meaning'; }

  function startTimer(sec) {
    var end = Date.now() + sec * 1000, bar = card.querySelector('#cpq-tm');
    tick = setInterval(function () {
      var left = end - Date.now();
      if (!bar || !root) return clearInterval(tick);
      bar.style.width = Math.max(0, left / (sec * 1000) * 100) + '%';
      if (left < sec * 300) bar.classList.add('cpq-low');
      if (left <= 0) { clearInterval(tick); timeUp(); }
    }, 100);
  }
  function timeUp() {
    if (!S || S.answered) return;
    var q = S.q;
    if (q.type === 'mcq') revealMcq(-1);
    else if (q.type === 'fill') checkFill(true);
    else finishMatch(true);
  }

  /* --- MCQ --- */
  function renderMcq(q) {
    var h = '';
    if (q.parts) h += '<div class="cpq-code">' + partsHtml(q.parts, function () { return '<span class="cpq-slot">?</span>'; }) + '</div>';
    var idx = shuffle(q.options.map(function (_, i) { return i; }));
    q._order = idx;
    h += '<div class="cpq-opts">' + idx.map(function (oi, n) {
      var label = q.html && !q.plain && !q.code ? q.options[oi] : esc(q.options[oi]);
      return '<button class="cpq-opt' + (q.code ? ' cpq-code-opt' : '') + '" data-o="' + oi + '"><span class="cpq-k">' + (n + 1) + '</span><span>' + label + '</span></button>';
    }).join('') + '</div>';
    return h;
  }
  function revealMcq(chosen) {
    if (S.answered) return; S.answered = true; clearInterval(tick);
    var q = S.q, ok = chosen === q.answer;
    card.querySelectorAll('.cpq-opt').forEach(function (b) {
      b.disabled = true; var o = +b.dataset.o;
      if (o === q.answer) b.classList.add('cpq-ok'); else if (o === chosen) b.classList.add('cpq-bad');
    });
    if (q.parts) { var slot = card.querySelector('.cpq-slot'); if (slot) { slot.textContent = q.options[q.answer]; slot.style.color = '#4ade80'; slot.style.borderColor = '#4ade80'; } }
    var plainAns = String(q.options[q.answer]).replace(/<[^>]+>/g, '');
    grade(ok, chosen === -1, plainAns, q.why);
  }

  /* --- fill --- */
  function partsHtml(parts, slot) {
    return parts.map(function (p) { return typeof p === 'string' ? esc(p) : slot(p.blank); }).join('');
  }
  function renderFill(q) {
    var prose = q.prose;
    var body = partsHtml(q.parts, function (n) {
      var a = (q.blanks[n] || {}).a || '';
      return '<input class="cpq-in" data-b="' + n + '" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:' + Math.max(4, a.length + 2) + 'ch" aria-label="blank ' + (n + 1) + '">';
    });
    return prose ? '<div class="cpq-prose">' + body + '</div>' : '<div class="cpq-code">' + body + '</div>';
  }
  function same(a, b, ci) {
    var x = norm(a), y = norm(b);
    if (ci) { x = x.toLowerCase(); y = y.toLowerCase(); }
    return x === y || x.replace(/\s+/g, '') === y.replace(/\s+/g, '');
  }
  function checkFill(timeout) {
    if (S.answered) return; S.answered = true; clearInterval(tick);
    var q = S.q, ins = card.querySelectorAll('.cpq-in'), allOk = true, got = 0;
    ins.forEach(function (inp) {
      var b = q.blanks[+inp.dataset.b] || { a: '' }, accepted = [b.a].concat(b.alt || []);
      var ok = accepted.some(function (a) { return same(inp.value, a, q.ci); });
      inp.readOnly = true; inp.classList.add(ok ? 'cpq-ok' : 'cpq-bad');
      if (ok) got++; else { allOk = false; inp.insertAdjacentHTML('afterend', '<span class="cpq-fix">' + esc(b.a) + '</span>'); }
    });
    grade(allOk, timeout, q.blanks.map(function (b) { return b.a; }).join(' · '), q.why, ins.length > 1 ? got + '/' + ins.length + ' blanks' : '');
  }

  /* --- match --- */
  var TAGC = ['#4f46e5', '#0891b2', '#c026d3', '#ea580c', '#16a34a', '#be123c'];
  function renderMatch(q) {
    S.m = { left: null, right: null, done: 0, mistakes: 0 };
    var L = q.pairs.map(function (p, i) { return { i: i, t: p[0] }; }), R = shuffle(q.pairs.map(function (p, i) { return { i: i, t: p[1] }; }));
    L = shuffle(L);
    return '<div class="cpq-match"><div class="cpq-col"><i>' + (q.codeLeft ? 'Code' : 'Term') + '</i>' + L.map(function (x) { return '<button class="cpq-tile' + (q.codeLeft ? ' cpq-mono' : '') + '" data-l="' + x.i + '">' + esc(x.t) + '</button>'; }).join('') +
      '</div><div class="cpq-col"><i>Meaning</i>' + R.map(function (x) { return '<button class="cpq-tile" data-r="' + x.i + '">' + esc(x.t) + '</button>'; }).join('') + '</div></div>';
  }
  function tapMatch(b) {
    if (S.answered || b.disabled) return;
    var m = S.m, side = b.dataset.l != null ? 'left' : 'right';
    card.querySelectorAll('.cpq-tile[data-' + (side === 'left' ? 'l' : 'r') + ']').forEach(function (t) { t.classList.remove('cpq-sel'); });
    m[side] = b; b.classList.add('cpq-sel');
    if (!m.left || !m.right) return;
    var l = m.left, r = m.right; m.left = m.right = null;
    l.classList.remove('cpq-sel'); r.classList.remove('cpq-sel');
    if (l.dataset.l === r.dataset.r) {
      var c = TAGC[m.done % TAGC.length];
      [l, r].forEach(function (t) { t.disabled = true; t.classList.remove('cpq-flash'); t.classList.add('cpq-done'); t.style.borderColor = c; t.insertAdjacentHTML('afterbegin', '<span class="cpq-tag" style="background:' + c + '">' + (m.done + 1) + '</span>'); });
      m.done++;
      if (m.done === S.q.pairs.length) finishMatch(false);
    } else {
      m.mistakes++;
      [l, r].forEach(function (t) { t.classList.remove('cpq-flash'); void t.offsetWidth; t.classList.add('cpq-flash'); setTimeout(function () { t.classList.remove('cpq-flash'); }, 600); });
      if (S.stress && m.mistakes >= 3) finishMatch(false, true);
    }
  }
  function finishMatch(timeout, tooMany) {
    if (S.answered) return; S.answered = true; clearInterval(tick);
    var q = S.q, m = S.m, complete = m.done === q.pairs.length;
    // reveal the rest
    q.pairs.forEach(function (p, i) {
      var l = card.querySelector('.cpq-tile[data-l="' + i + '"]'), r = card.querySelector('.cpq-tile[data-r="' + i + '"]');
      if (l && !l.disabled) { [l, r].forEach(function (t) { t.disabled = true; t.classList.remove('cpq-flash', 'cpq-sel'); t.classList.add('cpq-done'); t.style.borderColor = 'var(--bad)'; t.insertAdjacentHTML('afterbegin', '<span class="cpq-tag" style="background:var(--bad)">' + (i + 1) + '</span>'); }); }
    });
    card.querySelectorAll('.cpq-tile').forEach(function (t) { t.disabled = true; });
    var ok = complete && m.mistakes <= 1;
    var note = complete ? (m.mistakes ? m.mistakes + ' wrong pairing' + (m.mistakes > 1 ? 's' : '') : 'clean sweep') : (tooMany ? 'three wrong pairings' : timeout ? '' : 'gave up');
    grade(ok, timeout, q.pairs.map(function (p) { return p[0] + ' → ' + p[1]; }).join('\n'), q.why, note, complete && !m.mistakes ? 1 : complete ? 0.5 : 0);
  }

  /* --- scoring --- */
  function grade(ok, timeout, answerText, why, note, partial) {
    var q = S.q, pts = 0;
    if (ok) { S.right++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); pts = Math.round(10 * mult() * (partial == null ? 1 : partial)); }
    else { S.streak = 0; if (S.stress) S.lives--; recordMiss(q, answerText); }
    if (ok && S.stress) { var bar = card.querySelector('#cpq-tm'); if (bar) pts += Math.round(parseFloat(bar.style.width) / 20); }
    S.score += pts;
    if (!ok) { card.classList.remove('cpq-shake'); void card.offsetWidth; card.classList.add('cpq-shake'); }
    var head = ok ? '✓ Correct' + (pts ? ' · +' + pts : '') : timeout ? '⏱ Time\'s up' : '✗ Not quite';
    if (note) head += ' <span style="font-weight:400;color:var(--soft)">· ' + esc(note) + '</span>';
    var body = '';
    if (!ok && q.type !== 'match') body += '<div>Answer: <code>' + esc(answerText) + '</code></div>';
    if (why) body += '<div style="margin-top:4px">' + why + '</div>';
    card.querySelector('#cpq-fb').innerHTML = '<div class="cpq-why ' + (ok ? 'cpq-ok' : 'cpq-bad') + '"><b class="cpq-v">' + head + '</b>' + body + '</div>';
    var hudEl = card.querySelector('.cpq-hud'); if (hudEl) hudEl.outerHTML = hud();
    var foot = card.querySelector('.cpq-foot'), last = S.i >= S.deck.length - 1 || (S.stress && S.lives <= 0);
    foot.innerHTML = '<span class="cpq-hint">' + (S.stress && S.lives <= 0 ? 'Out of lives' : 'Enter for next') + '</span><button class="cpq-btn" data-a="next">' + (last ? 'See results' : 'Next →') + '</button>';
    foot.querySelector('button').focus();
  }
  function recordMiss(q, answer) {
    var bank = load(LS_BANK, []);
    bank.push({ page: PAGE, title: pageTitle(), type: q.type, ask: String(q.ask || '').replace(/<[^>]+>/g, ''), answer: String(answer).slice(0, 400), at: new Date().toISOString() });
    if (bank.length > 300) bank = bank.slice(-300);
    save(LS_BANK, bank);
    S.misses.push({ q: q, answer: answer });
  }

  function next() {
    if (S.i >= S.deck.length - 1 || (S.stress && S.lives <= 0)) return results();
    S.i++; show();
  }

  function results() {
    clearInterval(tick);
    if (CHECK) return checkResults();
    var asked = S.i + 1, pct = Math.round(S.right / asked * 100), secs = Math.round((Date.now() - S.t0) / 1000);
    var best = load(LS_BEST, null), isBest = !best || S.score > best.score;
    if (isBest) save(LS_BEST, { score: S.score, pct: pct, stress: S.stress, at: new Date().toISOString() });
    var grade = pct >= 90 ? 'You own this page.' : pct >= 70 ? 'Solid — skim the misses below.' : pct >= 50 ? 'Halfway there. Re-read, then run it again.' : 'Worth another read before moving on.';
    if (S.stress && S.lives <= 0) grade = 'Out of lives after ' + asked + ' of ' + S.deck.length + '. ' + grade;
    var h = topBar('🧠 Results · ' + esc(pageTitle())) + '<div class="cpq-body"><div class="cpq-score"><div class="cpq-big">' + pct + '%</div><div class="cpq-grade">' + esc(grade) + (isBest ? ' <b style="color:var(--warn)">New best!</b>' : '') + '</div></div>' +
      '<div class="cpq-stats"><span><b>' + S.right + '/' + asked + '</b>correct</span><span><b>' + S.score + '</b>points</span><span><b>' + S.bestStreak + '</b>best streak</span><span><b>' + Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2) + '</b>time</span></div>';
    if (S.misses.length) {
      h += '<div class="cpq-review"><h3>Review your misses (' + S.misses.length + ')</h3>' + S.misses.map(function (m) {
        var ask = String(m.q.ask || '').replace(/<span class="cpq-ctx">.*?<\/span>/, '');
        var ctx = m.q.quote ? '<div style="color:var(--soft);font-size:13px">“' + esc(clip(m.q.quote, 140)) + '”</div>' : '';
        if (m.q.parts) ctx += '<div class="cpq-code" style="margin:6px 0;font-size:12.5px;padding:8px 10px">' + partsHtml(m.q.parts, function (n) {
          var a = m.q.type === 'fill' ? (m.q.blanks[n] || {}).a : m.q.options[m.q.answer];
          return '<b style="color:#4ade80">' + esc(a || '') + '</b>';
        }) + '</div>';
        return '<div class="cpq-miss"><div>' + ask + '</div>' + ctx + '<div class="cpq-a" style="white-space:pre-line">' + esc(m.answer) + '</div></div>';
      }).join('') + '</div>';
    }
    h += '</div><div class="cpq-foot"><span class="cpq-hint">Misses are saved to your mistake bank</span><button class="cpq-btn cpq-ghost" data-a="setup">Change settings</button><button class="cpq-btn" data-a="again">Go again</button></div>';
    S.over = true;
    card.innerHTML = h;
    card.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 'close') close(); else if (b.dataset.a === 'again') start(); else if (b.dataset.a === 'setup') setup(); };
  }

  /* ---- lesson check: pass / review / continue ---- */
  function checkResults() {
    var c = CHECK, asked = S.i + 1, need = Math.min(c.pass, asked), pass = S.right >= need;
    var r = { pass: pass, right: S.right, asked: asked, at: Date.now() };
    var secs = [];
    S.misses.forEach(function (m) { if (m.q.sec != null && secs.indexOf(m.q.sec) < 0) secs.push(m.q.sec); });
    secs.sort(function (a, b) { return a - b; });
    var head = pass ? '✓ ' + (c.passTitle || 'Checked') : 'Not quite yet';
    var line = pass ? (S.right === asked ? 'All ' + asked + ' right.' : S.right + ' of ' + asked + ' right — good enough to move on.')
                    : S.right + ' of ' + asked + ' right. You need ' + need + '. The misses below show what to look at again.';
    var h = topBar('🧠 ' + esc(c.title || pageTitle())) + '<div class="cpq-body"><div class="cpq-score"><div class="cpq-big" style="color:var(' + (pass ? '--ok' : '--bad') + ')">' + S.right + '/' + asked + '</div>' +
      '<div class="cpq-grade"><b>' + esc(head) + '</b> · ' + esc(line) + '</div></div>';
    if (S.misses.length) {
      h += '<div class="cpq-review"><h3>What you missed (' + S.misses.length + ')</h3>' + S.misses.map(function (m) {
        var ask = String(m.q.ask || '').replace(/<span class="cpq-ctx">.*?<\/span>/, '');
        var where = m.q.sec != null && c.secName ? '<div style="color:var(--soft);font-size:12.5px;margin-top:3px">↳ ' + esc(c.secName(m.q.sec)) + '</div>' : '';
        return '<div class="cpq-miss"><div>' + ask + '</div><div class="cpq-a" style="white-space:pre-line">' + esc(m.answer) + '</div>' + where + '</div>';
      }).join('') + '</div>';
    }
    h += '</div><div class="cpq-foot cpq-foot-check">';
    if (pass) h += '<button class="cpq-btn" data-a="go">' + esc(c.continueLabel || 'Continue') + ' →</button><button class="cpq-btn cpq-ghost" data-a="again">Try again</button>';
    else h += '<button class="cpq-btn" data-a="review">' + (secs.length && c.secName ? 'Review ' + (secs.length === 1 ? 'that section' : 'those sections') : 'Review the lesson') + '</button>' +
              '<button class="cpq-btn cpq-ghost" data-a="again">Try again</button><button class="cpq-btn cpq-ghost" data-a="go">' + esc(c.anywayLabel || 'Continue anyway') + '</button>';
    h += '</div>';
    S.over = true; card.innerHTML = h;
    function report(action) { r.action = action; c.reported = true; close(); if (c.onDone) try { c.onDone(r); } catch (e) {} }
    card.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var a = b.dataset.a;
      if (a === 'close') return report('close');
      if (a === 'again') { r = null; return start(); }
      if (a === 'go') return report('continue');
      if (a === 'review') { r.sections = secs; return report('review'); }
    };
    // a pass is recorded even if the reader only closes the dialog
    if (c.onResult) try { c.onResult({ pass: pass, right: S.right, asked: asked, at: r.at }); } catch (e) {}
  }
  /* CPQuiz.check({ count, pass, title, continueLabel, anywayLabel, secName(sec), onResult(r), onDone(r), onCancel })
     A short quiz straight away (no setup, no stress); onResult fires when the score is in,
     onDone when the reader picks continue / review / close (r.action). */
  function check(opts) {
    if (root) return;
    CHECK = Object.assign({ count: 5, pass: 4 }, opts || {});
    open(true); start();
  }

  function onClick(e) {
    var b = e.target.closest('button'); if (!b) return;
    var a = b.dataset.a;
    if (a === 'close') return close();
    if (a === 'next') return next();
    if (a === 'check') return checkFill(false);
    if (a === 'skip') { if (S.q.type === 'fill') { card.querySelectorAll('.cpq-in').forEach(function (i) { i.value = ''; }); checkFill(false); } else finishMatch(false); return; }
    if (b.dataset.o != null && !S.answered) return revealMcq(+b.dataset.o);
    if (b.classList.contains('cpq-tile')) return tapMatch(b);
  }
  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return close(); }
    e.stopPropagation(); // keep page shortcuts (⌘↵ run, etc.) out of the quiz
    if (!S || S.over) { if (e.key === 'Enter' && !S && e.target.tagName !== 'BUTTON') { e.preventDefault(); start(); } return; }
    if (e.key === 'Enter') {
      if (S.answered) { e.preventDefault(); return next(); }
      if (S.q.type === 'fill') {
        e.preventDefault();
        var ins = Array.prototype.slice.call(card.querySelectorAll('.cpq-in')), at = ins.indexOf(document.activeElement);
        if (at >= 0 && at < ins.length - 1 && !ins[at + 1].value) return ins[at + 1].focus();
        return checkFill(false);
      }
    }
    if (S.q.type === 'mcq' && !S.answered && /^[1-9]$/.test(e.key)) {
      var opt = card.querySelectorAll('.cpq-opt')[+e.key - 1]; if (opt) { e.preventDefault(); revealMcq(+opt.dataset.o); }
    }
  }

  /* ---------------- entry point ---------------- */
  function boot() {
    if (document.getElementById('cpq-pill')) return;
    var pill = document.createElement('button');
    pill.id = 'cpq-pill'; pill.type = 'button'; pill.title = 'Quiz yourself on this page';
    pill.innerHTML = '<span aria-hidden="true">🧠</span>Quiz';
    pill.onclick = open;
    document.body.appendChild(pill);
  }
  window.CPQuiz = { open: open, close: close, check: check, _debug: { harvestCode: harvestCode, harvestPairs: harvestPairs, commentPairs: commentPairs, buildDeck: buildDeck } };

  // optional authored bank next to the page: <dir>/quiz/<name>.js
  if (!window.CP_QUIZ_BANK && NAME) {
    var s = document.createElement('script');
    s.src = 'quiz/' + encodeURIComponent(NAME) + '.js';
    s.onerror = function () { s.remove(); };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
