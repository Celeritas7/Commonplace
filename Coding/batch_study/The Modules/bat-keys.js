/* BAT smart keys — grammar-driven key palette for Windows batch.
   window.BAT_KEYS = { build(ctx, ta), insert(ta, chip, replace), predict(before, full, opts), apply(v, s, e, chip, replace), keys }
   predict() is pure: same input -> same output, no DOM. Never calls focus(). ES5, no dependencies. */
(function () {
  'use strict';
  var LS_MODE = 'zk-mode-bat', IND = '    ';

  /* ---------- chips ---------- */
  function mix(a, b) { if (b) for (var k in b) a[k] = b[k]; return a; }
  function C(l, k, m, o) { return mix({ l: l, t: l, k: k, m: m }, o); }
  function kw(l, o) { return C(l, 'kw', 'word', o); }      // keyword  · lavender cap
  function fn(l, o) { return C(l, 'fn', 'word', o); }      // command  · green cap
  function ty(l, o) { return C(l, 'ty', 'word', o); }      // switch   · teal chip
  function sym(l, o) { return C(l, 'sym', 'raw', o); }     // symbol   · cream square cap
  function idp(l, o) { return C(l, 'id', 'id', o); }       // your name· round pill
  function pair(l, t, c, o) { return C(l, 'sym', 'pair', mix({ t: t, c: c }, o)); }
  function block(l) { return C(l, 'kw', 'block'); }
  var CLOSE = function () { return sym(')', { m: 'close' }); };

  function R(now, then, pad, hint, replace) {
    var seen = {}, out = [];
    (now || []).forEach(function (c) { var k = c.l.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(c); } });
    return { now: out, then: then || [], pad: !!pad, hint: hint || '', replace: replace || 0 };
  }
  function ci(arr, v) { v = v.toLowerCase(); for (var i = 0; i < arr.length; i++) if (arr[i].toLowerCase() === v) return i; return -1; }
  function front(arr, v) { var i = ci(arr, v); if (i >= 0) arr.splice(i, 1); arr.unshift(v); }

  /* ---------- lexing ---------- */
  function lex(line) {
    var out = [], i = 0, n = line.length;
    while (i < n) {
      var ch = line.charAt(i);
      if (ch === ' ' || ch === '\t') { i++; continue; }
      if (ch === '"') {
        var q = line.indexOf('"', i + 1), open = q < 0; if (open) q = n - 1;
        out.push({ v: line.slice(i, q + 1), q: 1, open: open, i: i }); i = q + 1; continue;
      }
      if (line.substr(i, 4) === '2>&1') { out.push({ v: '2>&1', op: 1, i: i }); i += 4; continue; }
      var two = line.substr(i, 2);
      if (two === '>>' || two === '&&' || two === '||' || two === '==' || two === '2>') { out.push({ v: two, op: 1, i: i }); i += 2; continue; }
      if ('()&|<>'.indexOf(ch) >= 0) { out.push({ v: ch, op: 1, i: i }); i++; continue; }
      var j = i;
      while (j < n && ' \t"()&|<>'.indexOf(line.charAt(j)) < 0 && line.substr(j, 2) !== '==') j++;
      out.push({ v: line.slice(i, j), i: i }); i = j;
    }
    return out;
  }
  function isComment(s) { return /^\s*(rem(\s|$)|::)/i.test(s); }
  function depthOf(text) {
    var d = 0;
    text.split('\n').forEach(function (L) {
      if (isComment(L)) return;
      lex(L).forEach(function (t) { if (t.op && t.v === '(') d++; else if (t.op && t.v === ')') d = Math.max(0, d - 1); });
    });
    return d;
  }
  function cmdOf(t) { return t && !t.op && !t.q ? t.v.toLowerCase().replace(/^@/, '') : ''; }

  /* the statement the caret is in: text after the last ( & && || do else on this line */
  function segment(T) {
    var stack = [], st = 0, by = 'line';
    for (var i = 0; i < T.length; i++) {
      var t = T[i];
      if (t.op) {
        if (t.v === '(') {
          var pw = i > st ? cmdOf(T[i - 1]) : '';
          if (pw === 'in' && cmdOf(T[st]) === 'for') stack.push('list');
          else { stack.push('block'); st = i + 1; by = 'block'; }
        } else if (t.v === ')') {
          if (stack.pop() !== 'list') { st = i; by = 'close'; }
        } else if (t.v === '&' || t.v === '&&' || t.v === '||') { st = i + 1; by = 'amp'; }
      } else if (!t.q) {
        var lw = t.v.toLowerCase();
        if (lw === 'do' && cmdOf(T[st]) === 'for' && stack[stack.length - 1] !== 'list') { st = i + 1; by = 'do'; }
        else if (lw === 'else' && T[st] && T[st].v === ')') { st = i + 1; by = 'else'; }
      }
    }
    return { S: T.slice(st), by: by, list: stack[stack.length - 1] === 'list' };
  }

  /* ---------- what the file defines ---------- */
  function scan(full) {
    var sc = { labels: [], vars: [], nums: {}, files: [], fvars: [], delayed: false, hasFor: false };
    full.split('\n').forEach(function (L) {
      var s = L.trim(), m;
      if (!s || isComment(s)) return;
      if (/^setlocal\b.*enabledelayedexpansion/i.test(s)) sc.delayed = true;
      if ((m = s.match(/^:([A-Za-z_][\w.\-]*)/))) { if (m[1].toLowerCase() !== 'eof') front(sc.labels, m[1]); return; }
      var re = /\bset\s+(?:(\/a)\s+|\/p\s+)?"?([A-Za-z_]\w*)\s*[-+*\/%&|^]?=/ig;
      while ((m = re.exec(s))) { front(sc.vars, m[2]); if (m[1]) sc.nums[m[2].toLowerCase()] = 1; }
      if ((m = s.match(/\bfor\b(?:\s+\/\w+)?(?:\s+"[^"]*")?\s+%%([A-Za-z])/i))) { front(sc.fvars, m[1]); sc.hasFor = true; }
      var fr = /(?:^|[\s"\\(])([A-Za-z_][\w\-]*\.[A-Za-z0-9]{1,4})(?=$|[\s"\\)>|&])/g;
      while ((m = fr.exec(s))) front(sc.files, m[1]);
    });
    return sc;
  }

  /* ---------- chip families ---------- */
  function pctVars(env) {
    var sc = env.sc, out = [], body = env.depth > 0 || env.by === 'do';
    if (sc.hasFor && body) sc.fvars.forEach(function (v) { out.push(idp('%%' + v)); });
    if (sc.delayed && body) sc.vars.forEach(function (v) { out.push(idp('!' + v + '!')); });
    sc.vars.forEach(function (v) { out.push(idp('%' + v + '%')); });
    return out;
  }
  function numFirst(env) {
    var v = env.sc.vars.slice(), n = env.sc.nums;
    return v.filter(function (x) { return n[x.toLowerCase()]; }).concat(v.filter(function (x) { return !n[x.toLowerCase()]; }));
  }
  function fileChips(env) {
    var a = env.words.slice(); env.sc.files.forEach(function (f) { if (ci(a, f) < 0) a.push(f); });
    return a.slice(0, 14).map(function (f) { return idp(f); });
  }
  function statementStarters() { return [block('('), fn('echo'), kw('set'), kw('if'), kw('call'), kw('goto'), fn('copy'), fn('del'), fn('type'), kw('exit /b')]; }
  var OPS_NUM = ['EQU', 'NEQ', 'LSS', 'LEQ', 'GTR', 'GEQ'];
  var FILECMD = {
    cd: ['/d', '..', '\\'], chdir: ['/d', '..', '\\'], dir: ['/b', '/s', '/a', '/o', '*.txt'],
    copy: ['/y'], xcopy: ['/s', '/e', '/i', '/y'], move: ['/y'], del: ['/q', '/f', '/s', '*.tmp'], erase: ['/q', '/f', '/s'],
    md: [], mkdir: [], rd: ['/s', '/q'], rmdir: ['/s', '/q'], type: [], ren: [], rename: [], find: ['/i', '/v', '/c'], findstr: ['/i', '/v', '/n']
  };

  function lineStart(env) {
    var L = [fn('echo'), kw('set'), kw('set /p'), kw('if'), kw('for'), kw('goto'), kw('call'), sym(':label', { t: ':' }),
      fn('pause'), kw('exit /b'), kw('rem'), sym('::', { t: ':: ' }), fn('cd'), fn('dir'), fn('copy'), fn('move'), fn('del'), fn('mkdir'), fn('type')];
    if (env.sc.labels.length) {
      var g = L.splice(5, 2); L.splice(1, 0, g[0], g[1]);
    }
    if (env.first && env.first.length) {
      var lead = [];
      env.first.forEach(function (c) { var j = -1; for (var q = 0; q < L.length; q++) if (L[q].l.toLowerCase() === c.toLowerCase()) j = q; lead.push(j >= 0 ? L.splice(j, 1)[0] : fn(c.toLowerCase())); });
      L = lead.concat(L);
    }
    if (!env.oneLine && env.lineNo === 0 && !/^\s*@echo off/i.test(env.full)) L.unshift(kw('@echo off', { t: '@echo off\n', m: 'raw' }));
    return R(L, env.depth > 0 ? [CLOSE()] : []);
  }

  function ctxIf(S, env) {
    var i = 1, used = {};
    while (S[i] && !S[i].op && !S[i].q && /^(not|\/i)$/i.test(S[i].v)) { used[S[i].v.toLowerCase()] = 1; i++; }
    var r = S.slice(i), THEN = [block('(')], f = cmdOf(r[0]);
    if (!r.length) {
      var a = [];
      if (!used.not) a.push(kw('not'));
      a.push(kw('exist'), kw('defined'), kw('errorlevel'));
      if (!used['/i']) a.push(ty('/i'));
      env.sc.vars.forEach(function (v) { a.push(idp('"%' + v + '%"')); });
      return R(a, THEN, false, 'condition');
    }
    var done = R(statementStarters(), []);
    if (f === 'exist') return r.length === 1 ? R(fileChips(env).concat([pair('" "', '""', 1)]), THEN, false, 'file name \u2328') : done;
    if (f === 'defined') return r.length === 1 ? R(env.sc.vars.map(function (v) { return idp(v); }), THEN, false, 'variable name') : done;
    if (f === 'errorlevel') return r.length === 1 ? R([], THEN, true, 'number') : done;
    var lm = r[0].v.match(/%([A-Za-z_]\w*)%/), numeric = !!(lm && env.sc.nums[lm[1].toLowerCase()]);
    if (r.length === 1) {
      var ops = OPS_NUM.map(function (o) { return kw(o); }), eq = sym('==');
      return R(numeric ? ops.concat([eq]) : [eq].concat(ops), THEN, false, 'compare');
    }
    if (r.length === 2) {
      var numOp = ci(OPS_NUM, r[1].v) >= 0 && numeric;
      var vals = numOp ? env.sc.vars.map(function (v) { return idp('%' + v + '%'); })
        : [pair('" "', '""', 1)].concat(env.sc.vars.map(function (v) { return idp('"%' + v + '%"'); }));
      return R(vals, THEN, numOp || numeric, 'value');
    }
    return done;
  }

  function ctxFor(S, seg, env) {
    var r = S.slice(1), k = 0, flag = null;
    if (r[k] && !r[k].op && /^\//.test(r[k].v)) { flag = r[k].v.toLowerCase(); k++; }
    if (r[k] && r[k].q) k++;
    var hasVar = r[k] && /^%%/.test(r[k].v); if (hasVar) k++;
    var hasIn = r[k] && cmdOf(r[k]) === 'in'; if (hasIn) k++;
    var open = r[k] && r[k].v === '(', closed = false;
    if (open) for (var j = k + 1; j < r.length; j++) if (r[j].v === ')') { closed = true; break; }
    if (!flag && !hasVar && !hasIn && !r.length) return R([ty('/l'), ty('/f'), ty('/d'), ty('/r'), idp('%%i')], [kw('in')], false, 'switch or loop variable');
    if (!hasVar) {
      var fv = [idp('%%i'), idp('%%f'), idp('%%a')];
      if (flag === '/f') fv.push(ty('"tokens=* delims="'), ty('"tokens=1,2 delims=,"'));
      return R(fv, [kw('in')], false, 'loop variable');
    }
    if (!hasIn) return R([kw('in')], [pair('( )', '()', 1)]);
    if (!open) {
      var a = [];
      if (flag === '/l') a.push(idp('(1,1,10)'));
      a.push(pair('( )', '()', 1));
      return R(a, [kw('do')], flag === '/l', flag === '/l' ? '(start,step,end)' : 'set of items');
    }
    if (!closed) {
      if (flag === '/l') return R([sym(',')], [sym(')')], true, 'start,step,end');
      if (flag === '/f') return R([pair("'cmd'", "''", 1), pair('"text"', '""', 1)].concat(fileChips(env)), [sym(')')], false, 'file, "string" or \'command\'');
      return R([idp('*.txt'), idp('*.*')].concat(fileChips(env), pctVars(env)), [sym(')')], false, 'files or items');
    }
    return R([kw('do')], [block('(')]);
  }

  function ctxStmt(S, seg, env) {
    if (!S.length) {
      if (seg.by === 'do' || seg.by === 'else') return R(statementStarters(), []);
      return lineStart(env);
    }
    var w0 = S[0].v, c0 = cmdOf(S[0]).replace(/\.$/, '');
    if (S[0].op && w0 === ')') return S.length === 1 ? R([block('else (')], []) : R([], []);
    var ri = -1;
    for (var i = 1; i < S.length; i++) if (S[i].op && /^(>|>>|2>|\|)$/.test(S[i].v)) ri = i;
    if (ri > 0) {
      var aft = S.slice(ri + 1);
      if (S[ri].v === '|') { if (!aft.length) return R([fn('find'), fn('findstr'), fn('more'), fn('sort')], []); }
      else if (!aft.length) return R([kw('nul')].concat(fileChips(env)), [], false, 'file name \u2328');
      else return R([sym('2>&1', { m: 'id' })], []);
      S = aft; w0 = S[0].v; c0 = cmdOf(S[0]);
    }
    var args = S.slice(1), rest = '';
    if (!S[0].op) rest = env.line.slice(S[0].i + S[0].v.length);
    switch (c0) {
      case 'echo':
        if (w0.charAt(0) === '@' && !args.length) return R([kw('off')], []);
        if (!args.length && !/\.$/.test(w0)) return R(pctVars(env).concat([sym('.', { m: 'glue' }), kw('off'), kw('on'), sym('>'), sym('>>'), kw('nul')]), [], false, 'text \u2328');
        return R(pctVars(env).concat([sym('>'), sym('>>'), sym('|')]), []);
      case 'set':
        if (/^\s*$/.test(rest)) return R([ty('/a'), ty('/p')].concat(env.sc.vars.map(function (v) { return idp(v); })), [sym('=')], false, 'variable name \u2328');
        if (/^\s+\/p\s*$/i.test(rest)) return R(env.sc.vars.map(function (v) { return idp(v + '='); }), [pair('" "', '""', 1)], false, 'name= \u2328 then a prompt');
        if (/^\s+\/p\s+[^=\s]+\s*$/i.test(rest)) return R([sym('=')], [pair('" "', '""', 1)]);
        if (/^\s+\/p\s+[^=]+=\s*$/i.test(rest)) return R([pair('" "', '""', 1)], [], false, 'prompt text');
        if (/^\s+\/p\s+[^=]+=/i.test(rest)) return R([], [], false, 'prompt text \u2328');
        if (/^\s+\/a\s*$/i.test(rest)) return R(numFirst(env).map(function (v) { return idp(v); }), [sym('=')], false, 'variable name \u2328');
        if (/^\s+\/a\s+[^=]+$/i.test(rest)) return R([sym('='), sym('+='), sym('-='), sym('*='), sym('/=')], []);
        if (/^\s+\/a\s+.*=/i.test(rest)) return R(numFirst(env).map(function (v) { return idp(v); }).concat([sym('+'), sym('-'), sym('*'), sym('/'), sym('%%', { tip: 'modulo — written %% inside a .bat file' }), sym('('), sym(')')]), [], true, 'number or variable');
        if (/^\s+[^=\s]+\s*$/.test(rest)) return R([sym('=')], []);
        return R(pctVars(env), [], false, 'value \u2328');
      case 'if': return ctxIf(S, env);
      case 'for': return ctxFor(S, seg, env);
      case 'goto':
        if (!args.length) return R(env.sc.labels.map(function (l) { return idp(l); }).concat([kw(':eof')]), [], false, env.sc.labels.length ? '' : 'label name \u2328');
        return R([], []);
      case 'call':
        if (!args.length) return R(env.sc.labels.map(function (l) { return idp(':' + l); }).concat([idp(':eof')]), [], false, env.sc.labels.length ? '' : 'label or file');
        return R(pctVars(env), [], false, 'arguments');
      case 'exit':
        if (!args.length) return R([ty('/b')], []);
        if (args.length === 1 && /^\/b$/i.test(args[0].v)) return R([sym('0', { m: 'id' }), sym('1', { m: 'id' }), idp('%errorlevel%')], [], true, 'exit code');
        return R([], []);
      case 'pause': return R([sym('>nul', { m: 'id' })], []);
      case 'setlocal': return args.length ? R([], []) : R([kw('enabledelayedexpansion')], []);
      case 'endlocal': case 'cls': return R([], []);
    }
    if (FILECMD[c0]) {
      var used = {}; args.forEach(function (a) { used[a.v.toLowerCase()] = 1; });
      var sw = FILECMD[c0].filter(function (s) { return !used[s]; }).map(function (s) { return s.charAt(0) === '/' ? ty(s) : idp(s); });
      var tail = (c0 === 'dir' || c0 === 'type' || c0 === 'find' || c0 === 'findstr') ? [sym('>'), sym('|')] : [];
      if (c0 === 'find' || c0 === 'findstr') sw.unshift(pair('"text"', '""', 1));
      return R(sw.concat(fileChips(env), pctVars(env), tail), [], false, args.length ? '' : 'path \u2328');
    }
    return R(pctVars(env).concat([sym('>'), sym('|')]), []);
  }

  function ctxLine(line, env) {
    env.line = line;
    var T = lex(line), seg = segment(T), sp = line === '' || /\s$/.test(line);
    env.by = seg.by;
    return { r: ctxStmt(seg.S, seg, env), S: seg.S, sp: sp, seg: seg };
  }

  /* %name  %%i  !name  — variable being typed */
  function varCtx(line, env) {
    var sc = env.sc, m;
    if (!/\bset\s+\/a\b/i.test(line) && (m = line.match(/(^|[^%])%%([A-Za-z]?)$/))) {
      var p = m[2].toLowerCase(), fl = sc.fvars.filter(function (v) { return v.toLowerCase().indexOf(p) === 0; });
      if (p && ci(fl, p) >= 0) return null;
      if (!fl.length) fl = p ? [] : ['i'];
      return R(fl.map(function (v) { return idp('%%' + v, { t: v, m: 'raw' }); }), [], false, 'loop variable', p.length);
    }
    var s = line.replace(/%%/g, '__'), cnt = (s.match(/%/g) || []).length;
    if (cnt % 2 === 1 && (m = s.match(/%([A-Za-z_]\w*)?$/))) {
      var q = (m[1] || '').toLowerCase(), BI = ['errorlevel', 'cd', 'date', 'time', 'random'];
      var a = sc.vars.filter(function (v) { return v.toLowerCase().indexOf(q) === 0; }).map(function (v) { return idp('%' + v + '%', { t: v + '%', m: 'raw' }); })
        .concat(BI.filter(function (v) { return v.indexOf(q) === 0 && ci(sc.vars, v) < 0; }).map(function (v) { return fn('%' + v + '%', { t: v + '%', m: 'raw' }); }));
      return R(a, [sym('%')], false, a.length ? 'variable' : 'variable name \u2328', q.length);
    }
    if (sc.delayed) {
      var c2 = (line.match(/!/g) || []).length;
      if (c2 % 2 === 1 && (m = line.match(/!([A-Za-z_]\w*)?$/))) {
        var q2 = (m[1] || '').toLowerCase();
        var b = sc.vars.filter(function (v) { return v.toLowerCase().indexOf(q2) === 0; }).map(function (v) { return idp('!' + v + '!', { t: v + '!', m: 'raw' }); });
        return R(b, [sym('!')], false, 'variable (delayed)', q2.length);
      }
    }
    return null;
  }

  function predict(before, full, opts) {
    opts = opts || {}; before = before || ''; if (full == null) full = before;
    if (!full.trim() && !opts.oneLine) return R([kw('@echo off', { t: '@echo off\n', m: 'raw' }), kw('setlocal enabledelayedexpansion', { t: 'setlocal enabledelayedexpansion\n', m: 'raw' }), kw('rem')], []);
    var nl = before.lastIndexOf('\n'), line = before.slice(nl + 1);
    var env = { sc: scan(full + (opts.scope ? '\n' + opts.scope : '')), words: opts.words || [], depth: depthOf(before), lineNo: before.split('\n').length - 1, full: full, by: 'line', line: line, oneLine: !!opts.oneLine, first: opts.first || [] };
    var tl = line.replace(/^\s+/, '');
    if (isComment(tl)) return R([], [], false, 'comment \u2328');
    if (/^:[^:\s]*$/.test(tl)) return R([], [], false, 'label name \u2328');
    var v = varCtx(line, env); if (v) return v;
    var T = lex(line), last = T[T.length - 1], sp = line === '' || /\s$/.test(line);
    if (!sp && last && !last.op && !last.q) {
      var prev = ctxLine(line.slice(0, last.i), env).r, p = last.v.toLowerCase(), pool = prev.now.concat(prev.then);
      var exact = pool.some(function (c) { return c.l.toLowerCase() === p; });
      if (!exact) {
        var f = pool.filter(function (c) { return c.l.toLowerCase().indexOf(p) === 0; });
        if (f.length) return R(f, [], false, prev.hint, last.v.length);
      }
    }
    return ctxLine(line, env).r;
  }

  /* ---------- editing (pure) ---------- */
  function lineInfo(before) {
    var ls = before.slice(before.lastIndexOf('\n') + 1);
    return { ls: ls, ind: (ls.match(/^[ \t]*/) || [''])[0], atStart: /^[ \t]*$/.test(ls) };
  }
  function apply(v, s, e, chip, rep) {
    if (s === e && rep) s = Math.max(0, s - rep);
    var before = v.slice(0, s), after = v.slice(e), t = chip.t, m = chip.m || 'raw', caret = null, li = lineInfo(before);
    var needSp = before.length > 0 && !li.atStart && !/[\s(]$/.test(before);
    if (m === 'word') { t = (needSp ? ' ' : '') + t + (/^[ \t]/.test(after) ? '' : ' '); }
    else if (m === 'id' || m === 'pair') {
      var sp = before.length > 0 && !li.atStart && !/[\s(.\[=",%!:\/\\]$/.test(before) ? ' ' : '';
      if (m === 'pair') caret = before.length + sp.length + (chip.c || 1);
      t = sp + t;
    } else if (m === 'glue') { before = before.replace(/[ \t]+$/, ''); }
    else if (m === 'block') {
      var pre = needSp ? ' ' : '';
      t = pre + t + '\n' + li.ind + IND;
      caret = before.length + t.length;
      t += '\n' + li.ind + ')';
    } else if (m === 'close' && li.atStart) {
      before = before.slice(0, before.length - li.ls.length) + li.ind.slice(0, Math.max(0, li.ind.length - IND.length));
    }
    return { v: before + t + after, p: caret != null ? caret : (before + t).length };
  }
  var keys = {
    backspace: function (v, s, e) {
      if (s !== e) return { v: v.slice(0, s) + v.slice(e), p: s };
      var b = v.slice(0, s);
      if (!b) return { v: v, p: 0 };
      var m = /\n$/.test(b) ? ['\n'] : (b.match(/(?:%%\w|%~?\w+%?|!\w+!?|2>&1|>>|==|&&|\|\||[\w.@:\/\\*\-]+|[^\w\s])?[ \t]*$/) || ['']);
      var n = m[0].length || 1;
      return { v: b.slice(0, s - n) + v.slice(s), p: s - n };
    },
    newline: function (v, s, e) {
      var b = v.slice(0, s), a = v.slice(e), li = lineInfo(b), ind = li.ind + (/\(\s*$/.test(b) ? IND : '');
      if (/^\)/.test(a) && /\(\s*$/.test(b)) { var x = '\n' + ind; return { v: b + x + '\n' + li.ind + a, p: s + x.length }; }
      return { v: b + '\n' + ind + a, p: s + 1 + ind.length };
    },
    indent: function (v, s) {
      var ls = v.lastIndexOf('\n', s - 1) + 1;
      return { v: v.slice(0, ls) + IND + v.slice(ls), p: s + IND.length };
    },
    dedent: function (v, s) {
      var ls = v.lastIndexOf('\n', s - 1) + 1, m = v.slice(ls).match(/^ {1,4}|^\t/), n = m ? m[0].length : 0;
      return { v: v.slice(0, ls) + v.slice(ls + n), p: Math.max(ls, s - n) };
    }
  };

  /* ---------- DOM ---------- */
  var FONT = "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
  var CAPB = 'display:flex;align-items:center;justify-content:center;height:38px;box-sizing:border-box;white-space:nowrap;font-family:' + FONT + ';font-size:13.5px;line-height:1;border:1px solid;';
  var CAP = {
    kw: CAPB + 'padding:0 12px;border-radius:7px;background:#251f3d;border-color:#51478a;color:#ddd4ff;box-shadow:0 2px 0 #151128;font-weight:500',
    fn: CAPB + 'padding:0 12px;border-radius:7px;background:#11271a;border-color:#2d6243;color:#96e8b6;box-shadow:0 2px 0 #08150d;font-weight:500',
    sym: CAPB + 'min-width:38px;padding:0 9px;border-radius:6px;background:#eee6d0;border-color:#c9bd9c;color:#1f1b13;box-shadow:0 2px 0 #9f9373;font-weight:700',
    id: CAPB + 'padding:0 14px;border-radius:19px;background:#0e1b29;border-color:#35557a;color:#acd6ff',
    ty: CAPB + 'padding:0 10px;border-radius:5px;background:#0d2629;border-color:#2b666d;color:#84e1ea;font-size:12.5px',
    key: CAPB + 'min-width:44px;padding:0 10px;border-radius:6px;background:#1a212c;border-color:#343f50;color:#d7dee9;box-shadow:0 2px 0 #0a0d12;font-size:15px'
  };
  var LANE = 'display:flex;align-items:center;gap:6px;overflow-x:auto;overflow-y:hidden;flex:1;min-width:0;height:48px;scrollbar-width:none;overscroll-behavior-x:contain;padding-right:10px';
  function el(tag, css, txt) { var d = document.createElement(tag); if (css) d.style.cssText = css; if (txt != null) d.textContent = txt; return d; }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function selOf(ta) {
    if (document.activeElement === ta) return [ta.selectionStart, ta.selectionEnd];
    var n = ta.value.length;
    if (ta._zk) return [Math.min(ta._zk[0], n), Math.min(ta._zk[1], n)];
    return [n, n];
  }
  function commit(ta, r) {
    var d = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (d && d.set) d.set.call(ta, r.v); else ta.value = r.v;
    try { ta.setSelectionRange(r.p, r.p); } catch (e) {}
    ta._zk = [r.p, r.p];
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function insert(ta, chip, replace) { if (!ta) return; var s = selOf(ta); commit(ta, apply(ta.value, s[0], s[1], chip, replace)); }

  var ALL = [
    ['KEYWORDS', ['set', 'set /a', 'set /p', 'if', 'not', 'exist', 'defined', 'errorlevel', 'else (', 'for', 'in', 'do', 'goto', 'call', ':eof', 'exit /b', 'setlocal', 'endlocal', 'enabledelayedexpansion', 'rem'].map(function (x) { return x === 'else (' ? block(x) : kw(x); })],
    ['COMMANDS', ['echo', 'pause', 'cls', 'cd', 'dir', 'md', 'mkdir', 'rd', 'copy', 'xcopy', 'move', 'del', 'ren', 'type', 'find', 'findstr', 'more', 'sort'].map(function (x) { return fn(x); }).concat([fn('echo.', { t: 'echo.', m: 'raw' })])],
    ['SWITCHES', ['/a', '/p', '/l', '/f', '/d', '/r', '/b', '/s', '/q', '/e', '/i', '/y', '/o'].map(function (x) { return ty(x); })],
    ['COMPARE', [sym('==')].concat(OPS_NUM.map(function (x) { return kw(x); }))],
    ['SYMBOLS', [sym('%'), sym('%%'), sym('!'), pair('" "', '""', 1), sym('('), CLOSE(), sym('>'), sym('>>'), sym('2>&1', { m: 'id' }), sym('|'), sym('&'), sym('&&'), sym('||'), kw('nul'), sym(':'), sym('::', { t: ':: ' }), kw('@echo off', { t: '@echo off\n', m: 'raw' })]]
  ];

  function build(ctx, ta) {
    ctx = ctx || {};
    var root = ctx.nodeType ? ctx : ctx.root;
    var S = { ta: null, words: ctx.words || [], first: ctx.first || [], oneLine: !!ctx.oneLine, scope: ctx.scope || '', label: ctx.label || '', mode: lsGet(LS_MODE, 'smart'), hidden: false, pred: null, raf: 0 };
    root.innerHTML = '';
    var wrap = el('div', 'font-family:' + FONT + ';background:#0b0f16;border-top:1px solid #1b2230;color:#d7dee9;user-select:none;-webkit-user-select:none');
    var head = el('div', 'display:flex;align-items:center;gap:8px;height:40px;padding:0 8px 0 12px');
    var ttl = el('span', 'font-size:10px;letter-spacing:1.4px;color:#6b7788;white-space:nowrap', 'KEY PALETTE');
    var lab = el('span', 'font-size:10px;letter-spacing:1px;color:#e8b64c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0');
    var seg = el('div', 'margin-left:auto;display:flex;border:1px solid #28313f;flex:0 0 auto');
    var bSmart = el('button', '', 'Smart'), bAll = el('button', '', 'All'), bHide = el('button', '', 'Hide');
    var segCss = 'font-family:' + FONT + ';font-size:10.5px;letter-spacing:.8px;border:0;padding:0 11px;height:30px;cursor:pointer;';
    seg.appendChild(bSmart); seg.appendChild(bAll);
    bHide.style.cssText = segCss + 'background:transparent;border:1px solid #28313f;color:#9aa7b8;flex:0 0 auto';
    head.appendChild(ttl); head.appendChild(lab); head.appendChild(seg); head.appendChild(bHide);
    var body = el('div', 'height:104px;box-sizing:border-box;padding:0 0 4px 12px');
    var rowN = el('div', 'display:flex;align-items:center;gap:8px'), rowT = el('div', 'display:flex;align-items:center;gap:8px');
    var tagCss = 'flex:0 0 38px;font-size:9.5px;letter-spacing:1.3px;';
    rowN.appendChild(el('span', tagCss + 'color:#e8b64c', 'NEXT')); rowT.appendChild(el('span', tagCss + 'color:#6b7788', 'THEN'));
    var laneN = el('div', LANE), laneT = el('div', LANE);
    rowN.appendChild(laneN); rowT.appendChild(laneT);
    var allBox = el('div', 'height:100%;overflow-y:auto;overscroll-behavior:contain;padding-right:10px;display:none');
    body.appendChild(rowN); body.appendChild(rowT); body.appendChild(allBox);
    var bar = el('div', 'display:flex;align-items:center;gap:6px;overflow-x:auto;scrollbar-width:none;height:54px;padding:0 10px;border-top:1px solid #141a24');
    wrap.appendChild(head); wrap.appendChild(body); wrap.appendChild(bar);
    root.appendChild(wrap);

    function cap(chip, onTap) {
      var b = el('button', 'flex:0 0 auto;height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;background:none;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation');
      b.type = 'button'; b.tabIndex = -1; if (chip.tip) b.title = chip.tip;
      b.appendChild(el('span', CAP[chip.k] || CAP.sym, chip.l));
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function (e) { e.preventDefault(); onTap(chip); });
      return b;
    }
    [bSmart, bAll, bHide].forEach(function (b) {
      b.type = 'button';
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    });
    function tapPredicted(chip) { if (!S.ta) return; insert(S.ta, chip, S.pred ? S.pred.replace : 0); schedule(); }
    function tapPlain(chip) { if (!S.ta) return; insert(S.ta, chip, 0); schedule(); }
    function key(name) { return function () { if (!S.ta) return; var s = selOf(S.ta); commit(S.ta, keys[name](S.ta.value, s[0], s[1])); schedule(); }; }
    function fill(lane, chips, onTap, empty) {
      lane.innerHTML = ''; lane.scrollLeft = 0;
      if (!chips.length && empty) lane.appendChild(el('span', 'font-size:14px;color:#3b465a;padding-left:4px', empty));
      chips.forEach(function (c) { lane.appendChild(cap(c, onTap)); });
    }
    function renderBar(pad) {
      bar.innerHTML = '';
      [['\u232B', 'backspace', 'Delete last token'], ['\u21B5', 'newline', 'New line (auto-indent)'], ['\u21E5', 'indent', 'Indent'], ['\u21E4', 'dedent', 'Dedent']].forEach(function (k) {
        var b = cap({ l: k[0], k: 'key', tip: k[2] }, key(k[1])); bar.appendChild(b);
      });
      bar.appendChild(el('span', 'flex:0 0 1px;height:26px;background:#28313f;margin:0 4px'));
      var syms = pad ? '1 2 3 4 5 6 7 8 9 0 .'.split(' ').map(function (d) { return sym(d); })
        : [sym('%'), sym('"'), sym('('), CLOSE(), sym('>'), sym('|')];
      syms.forEach(function (c) { bar.appendChild(cap(c, tapPlain)); });
    }
    function renderAll() {
      allBox.innerHTML = '';
      var groups = ALL.slice();
      var sc = S.ta ? scan(S.ta.value + '\n' + S.scope) : { vars: [], labels: [] };
      var mine = sc.vars.map(function (v) { return idp('%' + v + '%'); }).concat(sc.labels.map(function (l) { return idp(':' + l); }));
      if (mine.length) groups = [['YOUR NAMES', mine]].concat(groups);
      groups.forEach(function (g) {
        allBox.appendChild(el('div', 'font-size:9.5px;letter-spacing:1.3px;color:#6b7788;padding:8px 0 2px', g[0]));
        var row = el('div', 'display:flex;flex-wrap:wrap;gap:0 6px');
        g[1].forEach(function (c) { row.appendChild(cap(c, tapPlain)); });
        allBox.appendChild(row);
      });
    }
    function paintChrome() {
      var smart = S.mode !== 'all';
      bSmart.style.cssText = segCss + (smart ? 'background:#1b2230;color:#f5cd77' : 'background:transparent;color:#6b7788');
      bAll.style.cssText = segCss + (!smart ? 'background:#1b2230;color:#f5cd77' : 'background:transparent;color:#6b7788');
      bHide.textContent = S.hidden ? 'Show' : 'Hide';
      body.style.display = bar.style.display = S.hidden ? 'none' : '';
      rowN.style.display = rowT.style.display = smart ? 'flex' : 'none';
      allBox.style.display = smart ? 'none' : 'block';
      lab.textContent = S.label || '';
      wrap.style.opacity = S.ta ? '1' : '.5';
    }
    function render() {
      S.raf = 0; paintChrome();
      if (S.hidden) return;
      if (S.mode === 'all') { renderAll(); renderBar(false); return; }
      var t = S.ta, s = t ? selOf(t) : [0, 0];
      var p = S.pred = predict(t ? t.value.slice(0, s[0]) : '', t ? t.value : '', { words: S.words, scope: S.scope, oneLine: S.oneLine, first: S.first });
      fill(laneN, p.now, tapPredicted, p.hint ? '' : '\u2014');
      if (p.hint) laneN.insertBefore(el('span', 'flex:0 0 auto;font-size:11.5px;color:#9aa7b8;border:1px dashed #3b465a;border-radius:6px;padding:0 10px;height:34px;display:flex;align-items:center;white-space:nowrap', p.hint), laneN.firstChild);
      fill(laneT, p.then, tapPredicted, '\u2014');
      renderBar(p.pad);
    }
    function schedule() { if (!S.raf) S.raf = requestAnimationFrame(render); }
    function track() { if (S.ta) { if (document.activeElement === S.ta) S.ta._zk = [S.ta.selectionStart, S.ta.selectionEnd]; schedule(); } }
    var EV = ['input', 'click', 'keyup', 'select', 'focus'];
    function onSelChange() { if (S.ta && document.activeElement === S.ta) track(); }
    document.addEventListener('selectionchange', onSelChange);
    bSmart.addEventListener('click', function () { S.mode = 'smart'; lsSet(LS_MODE, 'smart'); schedule(); });
    bAll.addEventListener('click', function () { S.mode = 'all'; lsSet(LS_MODE, 'all'); schedule(); });
    bHide.addEventListener('click', function () { S.hidden = !S.hidden; schedule(); });

    var api = {
      el: wrap,
      setTarget: function (t) {
        if (t === S.ta) return api;
        if (S.ta) EV.forEach(function (e) { S.ta.removeEventListener(e, track); });
        S.ta = t || null;
        if (S.ta) EV.forEach(function (e) { S.ta.addEventListener(e, track); });
        schedule(); return api;
      },
      setWords: function (w) { w = w || []; if (w.join('\u0001') !== S.words.join('\u0001')) { S.words = w.slice(); schedule(); } return api; },
      setOneLine: function (on, first) { on = !!on; first = first || []; if (on !== S.oneLine || first.join('|') !== S.first.join('|')) { S.oneLine = on; S.first = first.slice(); schedule(); } return api; },
      setScope: function (s) { s = s || ''; if (s !== S.scope) { S.scope = s; schedule(); } return api; },
      setLabel: function (l) { l = l || ''; if (l !== S.label) { S.label = l; schedule(); } return api; },
      refresh: function () { schedule(); return api; },
      destroy: function () { api.setTarget(null); document.removeEventListener('selectionchange', onSelChange); if (S.raf) cancelAnimationFrame(S.raf); root.innerHTML = ''; }
    };
    api.setTarget(ta || null); render();
    return api;
  }

  window.BAT_KEYS = { build: build, insert: insert, predict: predict, apply: apply, keys: keys, _lex: lex, _scan: scan };
})();
