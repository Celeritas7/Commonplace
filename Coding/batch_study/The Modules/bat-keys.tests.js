/* Headless test table for bat-keys.js. `now` = expected first chips in order; `then` = exact THEN lane. */
(function () {
  var T = [
    { name: 'empty file', b: '', now: ['@echo off', 'setlocal enabledelayedexpansion', 'rem'], then: [] },
    { name: 'line start', b: '@echo off\n', now: ['echo', 'set', 'set /p', 'if', 'for'], then: [] },
    { name: 'labels move goto up', b: '@echo off\n:start\necho hi\n', now: ['echo', 'goto', 'call'], then: [] },
    { name: 'first line offers @echo off', b: '@echo', now: ['@echo off'], replace: 5 },
    { name: 'half-typed command', b: '@echo off\nec', now: ['echo'], replace: 2 },
    { name: 'set', b: '@echo off\nset ', now: ['/a', '/p'], then: ['='], hint: 'variable name' },
    { name: 'set /p', b: 'set name=Bob\nset /p ', now: ['name='], then: ['" "'] },
    { name: 'set /p name=', b: 'set name=Bob\nset /p name=', now: ['" "'], then: [] },
    { name: 'set /a arithmetic', b: 'set /a n=5\nset /a n=', now: ['n', '+', '-', '*', '/'], then: [], pad: true },
    { name: 'echo', b: 'set name=Bob\necho ', now: ['%name%', '.', 'off', 'on', '>', '>>', 'nul'], then: [] },
    { name: '% opens variable list', b: 'set name=Bob\necho %na', now: ['%name%'], then: ['%'], replace: 2 },
    { name: 'if', b: 'set name=Bob\nif ', now: ['not', 'exist', 'defined', 'errorlevel', '/i', '"%name%"'], then: ['('] },
    { name: 'if compare (text)', b: 'set name=Bob\nif "%name%" ', now: ['==', 'EQU', 'NEQ'], then: ['('] },
    { name: 'if compare (number first)', b: 'set /a n=1\nif %n% ', now: ['EQU', 'NEQ', 'LSS'], then: ['('] },
    { name: 'if condition complete', b: 'set name=Bob\nif "%name%"=="Bob" ', now: ['(', 'echo', 'set'], then: [] },
    { name: 'after ) → else (', b: 'if exist a.txt (\n    echo yes\n)', now: ['else ('], then: [] },
    { name: 'inside a block', b: 'if exist a.txt (\n    ', now: ['echo', 'set'], then: [')'] },
    { name: 'for', b: 'for ', now: ['/l', '/f', '/d', '/r', '%%i'], then: ['in'] },
    { name: 'for /l %%i', b: 'for /l %%i ', now: ['in'], then: ['( )'] },
    { name: 'for /l … in', b: 'for /l %%i in ', now: ['(1,1,10)', '( )'], then: ['do'], pad: true },
    { name: 'for /l list', b: 'for /l %%i in (1,', now: [','], then: [')'], pad: true },
    { name: 'for … ) → do', b: 'for %%f in (*.txt) ', now: ['do'], then: ['('] },
    { name: 'after do', b: 'for %%f in (*.txt) do ', now: ['(', 'echo'], then: [] },
    { name: '%% loop variable', b: 'for %%f in (*.txt) do echo %%', now: ['%%f'], then: [] },
    { name: 'goto labels (recent first)', b: ':start\n:done\ngoto ', now: ['done', 'start', ':eof'], then: [] },
    { name: 'call :label', b: ':start\ncall ', now: [':start', ':eof'], then: [] },
    { name: 'label line', b: ':', now: [], hint: 'label name' },
    { name: 'redirect', b: 'dir >', now: ['nul'] },
    { name: 'pipe', b: 'dir | ', now: ['find', 'findstr', 'more', 'sort'] },
    { name: 'exit', b: 'exit ', now: ['/b'] },
    { name: 'exit /b', b: 'exit /b ', now: ['0', '1', '%errorlevel%'], pad: true },
    { name: 'delayed !var!', b: 'setlocal enabledelayedexpansion\nset n=0\nfor %%i in (1 2) do (\n    echo !', now: ['!n!'], then: ['!'] },
    { name: 'problem words', b: 'del ', words: ['notes.tmp'], now: ['/q', '/f', '/s', '*.tmp', 'notes.tmp'] },
    { name: 'one-liner, empty', b: '', oneLine: true, first: ['COPY'], now: ['copy', 'echo', 'set'], then: [] },
    { name: 'one-liner, half word', b: 'co', oneLine: true, first: ['COPY'], now: ['copy'], replace: 2 }
  ];
  var INS = [
    { name: 'word spacing', v: 'echo', chip: { l: 'off', t: 'off', m: 'word' }, want: 'echo off ' },
    { name: 'echo. glues', v: 'echo ', chip: { l: '.', t: '.', m: 'glue' }, want: 'echo.' },
    { name: 'block opens', v: 'if exist a.txt', chip: { l: '(', t: '(', m: 'block' }, want: 'if exist a.txt (\n    |\n)' },
    { name: 'pair caret inside', v: 'set /p name=', chip: { l: '" "', t: '""', m: 'pair', c: 1 }, want: 'set /p name="|"' },
    { name: ') dedents', v: 'if x (\n    echo\n    ', chip: { l: ')', t: ')', m: 'close' }, want: 'if x (\n    echo\n)' },
    { name: 'replace half word', v: '@echo off\nec', chip: { l: 'echo', t: 'echo', m: 'word' }, rep: 2, want: '@echo off\necho ' }
  ];
  function labels(a) { return a.map(function (c) { return c.l; }); }
  window.BAT_KEYS_RUN = function (K) {
    var rows = T.map(function (t) {
      var p = K.predict(t.b, t.b, { words: t.words || [], oneLine: t.oneLine, first: t.first }), got = labels(p.now), gt = labels(p.then), why = [];
      for (var i = 0; i < t.now.length; i++) if (got[i] !== t.now[i]) { why.push('NEXT[' + i + '] ' + JSON.stringify(got[i]) + ' ≠ ' + JSON.stringify(t.now[i])); break; }
      if (!t.now.length && got.length) why.push('NEXT should be empty');
      if (t.then && gt.join('|') !== t.then.join('|')) why.push('THEN ' + JSON.stringify(gt));
      if (t.pad != null && p.pad !== t.pad) why.push('pad ' + p.pad);
      if (t.hint && p.hint.indexOf(t.hint) < 0) why.push('hint "' + p.hint + '"');
      if (t.replace != null && p.replace !== t.replace) why.push('replace ' + p.replace);
      return { kind: 'predict', name: t.name, input: t.b, expNow: t.now.join('  '), expThen: (t.then || []).join('  '), gotNow: got.slice(0, 7).join('  '), gotThen: gt.join('  '), ok: !why.length, why: why.join(' · ') };
    });
    INS.forEach(function (t) {
      var s = t.v.length, r = K.apply(t.v, s, s, t.chip, t.rep || 0);
      var out = t.want.indexOf('|') >= 0 ? r.v.slice(0, r.p) + '|' + r.v.slice(r.p) : r.v;
      rows.push({ kind: 'insert', name: t.name, input: t.v, expNow: t.want, expThen: '', gotNow: out, gotThen: '', ok: out === t.want, why: out === t.want ? '' : 'got ' + JSON.stringify(out) });
    });
    return rows;
  };
})();
