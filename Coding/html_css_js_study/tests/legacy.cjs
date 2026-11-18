'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const fixture = require('./legacy-id-map.json');
const source = fs.readFileSync(path.join(__dirname, '../legacy-tracker.js'), 'utf8');
const courseSource = fs.readFileSync(path.join(__dirname, '../data/course-index.js'), 'utf8');
const KEY = 'commonplace_wdb_v1';

function storage(initial = {}) {
  const records = new Map(Object.entries(initial));
  return {
    writes: [], failWrite: false,
    getItem(key) { return records.has(key) ? records.get(key) : null; },
    setItem(key, value) {
      if (this.failWrite) throw new Error('QuotaExceededError');
      this.writes.push(key); records.set(key, String(value));
    }
  };
}
class Element {
  constructor(id = '') {
    this.id = id; this.dataset = {}; this.style = {}; this.value = ''; this.textContent = '';
    this.hidden = true; this.attributes = {}; this.events = {}; this.scrolled = 0;
    const classes = new Set();
    this.classList = { contains: value => classes.has(value), toggle(value, enabled) { if (enabled) classes.add(value); else classes.delete(value); } };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(name, callback) { this.events[name] = callback; }
  scrollIntoView() { this.scrolled++; }
  focus() {}
}
function boot(localStorage = storage()) {
  const ids = ['legacy-save-status', 'course', 'by', 'books', 'show', 'types', 'q', 'list', 'count', 'sDone', 'sBar', 'sSec', 'sSecNote', 'sEx', 'sNotes', 'cont'];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element(id)]));
  const rows = new Map();
  Object.defineProperty(nodes.list, 'innerHTML', {
    get() { return this._html || ''; },
    set(html) {
      this._html = html; rows.clear();
      for (const match of html.matchAll(/<div class="ln[^"]*" id="([lxq]\d+)" data-id="[^"]+">/g)) {
        const row = new Element(match[1]); row.dataset.id = match[1]; row.pen = new Element();
        row.closest = selector => selector === '.ln' ? row : null;
        row.querySelector = selector => selector === '.pen' ? row.pen : null;
        rows.set(row.id, row);
      }
    }
  });
  const document = {
    getElementById: id => nodes[id] || rows.get(id) || null,
    querySelector: () => null
  };
  const context = { window: {}, document, localStorage, setTimeout() {}, confirm: () => true, location: { hash: '#access_token=untouched-auth-callback' } };
  vm.runInNewContext(courseSource, context, { filename: 'course-index.js' });
  vm.runInNewContext(source, context, { filename: 'legacy-tracker.js' });
  return { localStorage, nodes, rows, api: context.window.WebStudioLegacy, context };
}
function note(env, id, value) {
  const row = env.rows.get(id);
  assert(row, 'The note row must be visible: ' + id);
  env.nodes.list.events.input({ target: { tagName: 'TEXTAREA', value, closest: () => row } });
}
function filter(env, show) {
  env.nodes.show.onclick({ target: { closest: () => ({ dataset: { show } }) } });
}
const decode = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
let passed = 0;
function test(name, callback) { callback(); passed++; console.log('PASS ' + name); }

test('every rendered legacy ID/title matches the frozen original mapping', () => {
  const env = boot();
  const entries = [];
  for (const match of env.nodes.list.innerHTML.matchAll(/<div class="ln[^"]*" id="([lxq]\d+)" data-id="[^"]+">([\s\S]*?)<span class="tt">([\s\S]*?)<\/span>/g)) entries.push([match[1], decode(match[3])]);
  assert.equal(entries.length, 453);
  assert.equal(new Set(entries.map(entry => entry[0])).size, 453);
  assert.equal(env.context.window.BOOTCAMP.sections.length, fixture.sectionCount);
  assert.deepEqual(entries, fixture.entries);
  assert.equal(env.localStorage.writes.length, 0, 'Rendering must not initialize storage by overwriting a record.');
});

test('opening a hidden lesson reveals its type, clears search and keeps the OAuth URL untouched', () => {
  const env = boot(storage({ [KEY]: JSON.stringify({ hide: { video: true }, show: 'star', open: {}, extra: 'keep' }) }));
  env.nodes.q.value = 'something else';
  assert.equal(env.rows.has('l1'), false);
  env.nodes.cont.events.click.call(env.nodes.cont, { preventDefault() {} });
  assert.equal(env.rows.has('l1'), true);
  assert.equal(env.rows.get('l1').scrolled, 1);
  assert.equal(env.nodes.q.value, '');
  const saved = JSON.parse(env.localStorage.getItem(KEY));
  assert.equal(saved.show, 'all');
  assert.equal(saved.hide.video, undefined);
  assert.equal(saved.open[1], 1);
  assert.equal(saved.extra, 'keep');
  assert.equal(env.context.location.hash, '#access_token=untouched-auth-callback');
  assert.equal(env.api.reveal('x1'), true);
  assert.equal(env.api.reveal('q1'), true);
  assert.equal(env.api.reveal('l99999'), false);
  assert.equal(env.api.reveal('access_token=anything'), false);
});

test('note totals update without rerendering the textarea and notes survive reopening', () => {
  const raw = JSON.stringify({ done: { l2: 1 }, star: { q1: 1 }, notes: {}, open: {}, custom: { retained: 7 } });
  const saved = storage({ [KEY]: raw, 'cpx.marks': 'keep-highlight', 'sb-auth-token': 'keep-auth' });
  const env = boot(saved), before = env.nodes.list.innerHTML;
  note(env, 'l1', 'My original course note.');
  assert.equal(env.nodes.sNotes.textContent, '1 starred · 1 notes');
  assert.equal(env.nodes.list.innerHTML, before);
  const reopened = boot(saved).api.snapshot();
  assert.equal(reopened.notes.l1, 'My original course note.');
  assert.equal(reopened.done.l2, 1);
  assert.equal(reopened.star.q1, 1);
  assert.equal(reopened.custom.retained, 7);
  assert.equal(saved.getItem('cpx.marks'), 'keep-highlight');
  assert.equal(saved.getItem('sb-auth-token'), 'keep-auth');
  assert(saved.writes.every(key => key === KEY));
  note(env, 'l1', '');
  assert.equal(env.nodes.sNotes.textContent, '1 starred · 0 notes');
});

test('malformed JSON, nonobject records and broken maps remain unchanged after an attempted edit', () => {
  for (const raw of ['broken{', '', 'null', '[]', '{"done":[]}', '{"star":null}', '{"notes":[]}', '{"open":false}', '{"hide":"bad"}', '{"notes":{"l1":42}}']) {
    const saved = storage({ [KEY]: raw }), env = boot(saved);
    assert.equal(env.nodes['legacy-save-status'].dataset.error, 'true');
    assert.match(env.nodes['legacy-save-status'].textContent, /unchanged|could not be read/);
    filter(env, 'done');
    assert.equal(saved.getItem(KEY), raw);
    assert.equal(saved.writes.length, 0);
  }
});

test('quota errors are visible and preserve both saved data and the in-memory draft', () => {
  const raw = JSON.stringify({ notes: { l1: 'Saved before quota error' } });
  const saved = storage({ [KEY]: raw }), env = boot(saved);
  saved.failWrite = true;
  note(env, 'l1', 'Unsaved but exportable draft');
  assert.equal(saved.getItem(KEY), raw);
  assert.equal(env.nodes['legacy-save-status'].dataset.error, 'true');
  assert.match(env.nodes['legacy-save-status'].textContent, /could not be saved/);
  assert.equal(env.api.snapshot().notes.l1, 'Unsaved but exportable draft');
  saved.failWrite = false;
  note(env, 'l1', 'Retry saved successfully');
  assert.equal(env.nodes['legacy-save-status'].dataset.error, 'false');
  assert.equal(JSON.parse(saved.getItem(KEY)).notes.l1, 'Retry saved successfully');
});

test('another tab cannot silently overwrite a newer legacy record', () => {
  const saved = storage({ [KEY]: '{}' }), a = boot(saved), b = boot(saved);
  note(a, 'l1', 'Latest note');
  const latest = saved.getItem(KEY);
  note(b, 'l1', 'Stale draft');
  assert.equal(saved.getItem(KEY), latest);
  assert.equal(b.nodes['legacy-save-status'].dataset.error, 'true');
  assert.match(b.nodes['legacy-save-status'].textContent, /Another tab/);
  assert.equal(b.api.snapshot().notes.l1, 'Stale draft');
});

test('denied storage does not break the course or overwrite anything', () => {
  let writes = 0;
  const saved = { getItem() { throw new Error('SecurityError'); }, setItem() { writes++; } };
  const env = boot(saved);
  assert.equal(env.rows.size, 453);
  filter(env, 'star');
  assert.equal(writes, 0);
  assert.match(env.nodes['legacy-save-status'].textContent, /unavailable/);
});

test('completed course has no stale Continue target, and activation is read-only', () => {
  const done = Object.fromEntries(fixture.entries.map(([id]) => [id, 1]));
  const saved = storage({ [KEY]: JSON.stringify({ done }) }), env = boot(saved);
  assert.equal(env.nodes.cont.dataset.go, undefined);
  assert.equal(env.nodes.sDone.textContent, '453 / 453');
  env.api.activate();
  assert.equal(saved.writes.length, 0);
});

console.log('\n' + passed + ' legacy tracker checks passed. DOM interactions use a Node adapter; this is not a browser/device acceptance test.');
