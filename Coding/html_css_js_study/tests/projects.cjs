'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const api = require('../studio-projects.js');
const initial = { html: '<main><h1>Start here</h1></main>', css: 'h1 { color: navy; }', js: '// Keep learning.\n' };
let passed = 0;
function test(name, fn) { fn(); console.log('PASS ' + name); passed++; }
function manager(saved = {}) {
  let id = 0, time = 0;
  return api.create(saved, initial, { newId: () => 'project-' + (++id), now: () => new Date(Date.UTC(2026, 10, 19, 12, 0, time++)).toISOString() });
}
function fixture() {
  return { version: 1, project: { ...initial, html: '<h1>Edited by an older UI</h1>', futureFileField: { keep: true } },
    projects: { version: 1, activeId: 'existing', futureLibraryField: 'keep', items: [{ id: 'existing', name: 'Existing project',
      createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z', futureItemField: ['keep'], files: { ...initial, anotherFutureField: 42 } }] },
    lessons: { 'html-elements': { note: 'Preserve the lesson.', read: true } }, exercises: { future: { keep: true } } };
}

test('legacy working code becomes the first named project without changing its input record', () => {
  const saved = { version: 1, project: { ...initial, html: '<h1>My existing work</h1>' }, lessons: { notes: 'untouched' } };
  const before = JSON.stringify(saved), library = manager(saved);
  assert.equal(JSON.stringify(saved), before);
  assert.equal(library.list().length, 1);
  assert.equal(library.active().name, 'Study project');
  assert.deepEqual(library.active().files, saved.project);
  assert.equal(library.snapshot().activeId, library.active().id);
  assert.equal(JSON.stringify(saved), before);
});

test('creation and switching capture current edits and keep independent projects', () => {
  const library = manager(), first = library.active().id;
  const edited = { ...initial, html: '<h1>My saved change</h1>' };
  const result = library.create('  My blank page  ', 'blank', edited);
  assert.equal(result.ok, true); assert.equal(result.project.name, 'My blank page');
  const second = result.project.id;
  assert.notEqual(first, second);
  result.files.html = 'mutated return value';
  assert.notEqual(library.active().files.html, result.files.html);
  const blankEdits = { ...library.active().files, css: 'h1 { color: purple; }' };
  assert.deepEqual(library.switchTo(first, blankEdits).files, edited);
  assert.deepEqual(library.switchTo(second, edited).files, blankEdits);
  assert.deepEqual(edited, { ...initial, html: '<h1>My saved change</h1>' });
});

test('duplicate and rename preserve code and stable IDs without changing the original', () => {
  const library = manager(), first = library.active().id;
  const edited = { ...initial, js: 'console.log("A separate copy");' };
  const duplicate = library.duplicate('Copy for experiments', edited);
  assert.equal(duplicate.ok, true); assert.deepEqual(duplicate.files, edited);
  const copyId = duplicate.project.id;
  assert.equal(library.rename('Renamed copy').ok, true);
  assert.equal(library.active().id, copyId);
  const changedCopy = { ...edited, js: 'console.log("Only this copy changes");' };
  library.snapshot(changedCopy);
  assert.deepEqual(library.switchTo(first, changedCopy).files, edited);
  assert.equal(library.active().name, 'Study project');
  assert.equal(library.list().find(project => project.id === copyId).name, 'Renamed copy');
});

test('reopening trusts the compatibility working copy and preserves future fields', () => {
  const saved = fixture(), before = JSON.stringify(saved), library = manager(saved);
  assert.equal(JSON.stringify(saved), before);
  assert.equal(library.active().files.html, saved.project.html);
  assert.equal(library.active().files.anotherFutureField, 42);
  assert.deepEqual(library.active().files.futureFileField, { keep: true });
  const snapshot = library.snapshot({ ...initial, html: '<h1>Latest edit</h1>' });
  assert.equal(snapshot.futureLibraryField, 'keep');
  assert.deepEqual(snapshot.items[0].futureItemField, ['keep']);
  assert.equal(snapshot.items[0].files.anotherFutureField, 42);
  assert.deepEqual(snapshot.items[0].files.futureFileField, { keep: true });
  snapshot.items[0].files.html = 'mutating an exported snapshot';
  assert.equal(library.active().files.html, '<h1>Latest edit</h1>');
});

test('invalid mutations and project-count limits keep the entire previous library', () => {
  const library = manager(), before = library.snapshot();
  for (const action of [() => library.create('', 'blank', initial), () => library.rename('x'.repeat(81)),
    () => library.switchTo('missing', initial), () => library.create('Named', 'missing', initial),
    () => library.duplicate('Too large', { ...initial, js: 'x'.repeat(api.MAX_FILE + 1) })]) {
    assert.equal(action().ok, false); assert.deepEqual(library.snapshot(), before);
  }
  assert.equal(library.create('Boundary file', 'blank', { ...initial, html: 'x'.repeat(api.MAX_FILE) }).ok, true);
  while (library.list().length < api.MAX_PROJECTS) assert.equal(library.create('Another project', 'blank', library.active().files).ok, true);
  const atLimit = library.snapshot();
  assert.equal(library.duplicate('One too many', library.active().files).ok, false);
  assert.deepEqual(library.snapshot(), atLimit);
});

test('oversized unsaved drafts remain available in snapshots for recovery backups', () => {
  const library = manager(), draft = { ...initial, html: 'x'.repeat(api.MAX_FILE + 10) };
  assert.equal(library.snapshot(draft).items[0].files.html, draft.html);
  const before = library.snapshot();
  assert.equal(library.create('Do not lose the large draft', 'blank', draft).ok, false);
  assert.deepEqual(library.snapshot(), before);
});

test('all templates are independent three-file projects', () => {
  const library = manager();
  assert.deepEqual(library.templates().map(template => template.id), ['study-card', 'blank', 'personal-card']);
  for (const template of library.templates()) {
    assert.deepEqual(Object.keys(template.files).sort(), ['css', 'html', 'js']);
    for (const value of Object.values(template.files)) assert.equal(typeof value, 'string');
  }
  const templates = library.templates(); templates[0].files.html = 'changed elsewhere';
  assert.equal(library.create('Fresh study card', 'study-card', initial).files.html, initial.html);
});

test('literal special keys stay plain data without prototype effects', () => {
  const saved = fixture();
  saved.project = JSON.parse('{"html":"<h1>Safe data</h1>","css":"","js":"","__proto__":{"polluted":true}}');
  const library = manager(saved);
  const project = library.snapshot().items[0].files;
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(project, '__proto__'), true);
  assert.deepEqual(project.__proto__, { polluted: true });
});

test('website export preserves Unicode, raw closing tags and real global JavaScript exactly', () => {
  const source = {
    html: '<main><h1>日本語 · Café</h1><img alt="Local image" src="data:image/png;base64,aGVsbG8="></main>',
    css: '.label::before { content: "</style> 日本語"; }\n/* CSS stays byte-for-byte text */',
    js: 'const project = String.raw`</script>\\n日本語`;\nglobalThis.exportResult = { value: project, line: "\u2028\u2029", html: document.body.innerHTML };',
    secretSession: 'DO-NOT-EXPORT-AUTH', futureNotes: 'DO-NOT-EXPORT-NOTES'
  };
  const output = api.exportWebsite(source, 'My <page> & "title"');
  assert(output.startsWith('<!doctype html>'));
  assert(output.includes('<meta charset="utf-8">'));
  assert(output.includes('<title>My &lt;page&gt; &amp; &quot;title&quot;</title>'));
  assert(!output.includes('DO-NOT-EXPORT'));
  assert.equal((output.match(/<script>/g) || []).length, 1);
  assert.equal((output.match(/<\/script>/g) || []).length, 1);
  const bootstrap = output.match(/<script>\n([\s\S]*?)\n<\/script>/)[1];
  let css, js;
  const context = vm.createContext({ document: {
    createElement(tag) { return { tagName: tag, textContent: '' }; },
    head: { appendChild(element) { assert.equal(element.tagName, 'style'); css = element.textContent; } },
    body: { innerHTML: '', appendChild(element) { assert.equal(element.tagName, 'script'); js = element.textContent; vm.runInContext(js, context); } }
  } });
  vm.runInContext(bootstrap, context);
  assert.equal(css, source.css); assert.equal(js, source.js);
  assert.equal(context.document.body.innerHTML, source.html);
  assert.equal(context.exportResult.value, '</script>\\n日本語');
  assert.equal(context.exportResult.html, source.html);
  assert.equal(context.exportResult.line, '\u2028\u2029');
});

test('export warnings distinguish embedded images and comments from actual dependencies', () => {
  assert.deepEqual(api.exportWarnings(initial), []);
  assert.deepEqual(api.exportWarnings({ html: '<img src="data:image/png;base64,aGVsbG8=">', css: '', js: '// Nothing remote.\n' }), []);
  assert(api.exportWarnings({ ...initial, html: '<img src="photo.png">' }).some(message => /Relative file/.test(message)));
  assert(api.exportWarnings({ ...initial, js: 'fetch("https://example.com/api");' }).some(message => /internet/.test(message)));
  assert(api.exportWarnings({ ...initial, html: '<img src="//example.com/image.png">' }).some(message => /internet/.test(message)));
  assert(api.exportWarnings({ ...initial, html: '<script src="thing.js"></script>' }).some(message => /fragment/.test(message)));
});

test('download filenames remain usable without path traversal or reserved Windows names', () => {
  assert.equal(api.filename('My project'), 'My project.html');
  assert.equal(api.filename('../CON/../../page'), '..-CON-..-..-page.html');
  assert.equal(api.filename('CON'), 'project-CON.html');
  assert.equal(api.filename(''), 'web-studio-project.html');
  assert.equal(api.filename('日本語'), '日本語.html');
  assert(!/[<>:"/\\|?*\u0000-\u001f]/.test(api.filename('bad<>:"/\\|?*name')));
});

console.log('\n' + passed + ' Web Studio project/export checks passed. Browser execution and download acceptance run separately.');
