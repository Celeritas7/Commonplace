'use strict';
const assert = require('node:assert/strict');
const { createStore, KEY, LEGACY_KEY } = require('../studio-store.js');

function memoryStorage(initial = {}) {
  const records = new Map(Object.entries(initial));
  return {
    records,
    writes: [],
    failWrite: false,
    getItem(key) { return records.has(key) ? records.get(key) : null; },
    setItem(key, value) {
      if (this.failWrite) throw new Error('QuotaExceededError');
      this.writes.push(key);
      records.set(key, String(value));
    }
  };
}
function study() {
  return {
    version: 1, language: 'html', view: 'book', textSize: 18,
    project: { html: '<h1>My page</h1>', css: 'h1 { color: blue; }', js: '' },
    lessons: {
      'html-elements': {
        part: 3, note: 'Opening and closing tags match.', bookmarks: [1, 3],
        answers: [1, null, null, null, null], question: 1,
        submitted: false, practised: true, read: false, prediction: null
      }
    }
  };
}
let passed = 0;
function test(name, callback) {
  callback();
  passed++;
  console.log('PASS ' + name);
}

test('fresh load is read-only; complete study records survive a new store instance', () => {
  const storage = memoryStorage();
  const first = createStore(storage);
  assert.deepEqual(first.load(), { data: null, error: null });
  assert.equal(storage.writes.length, 0);
  assert.deepEqual(first.save(study()), { ok: true, error: null });
  assert.deepEqual(createStore(storage).load().data, study());
});

test('old tracker, annotations and authentication records remain byte-for-byte intact', () => {
  const initial = {
    [LEGACY_KEY]: '{ "done":{"l1":1}, "star":{"l18":1}, "notes":{"q1":"Keep me"}, "future":true }',
    'cpx.bookmarks': '[{"page":"/Coding/Python/","anchor":"keep"}]',
    'cpx.marks': '{"another-section":"highlight"}',
    'cpx.resume': '{"keep":"reading position"}',
    'sb-example-auth-token': 'sensitive-test-sentinel',
    'another-section-pack': 'downloaded-test-sentinel'
  };
  const storage = memoryStorage(initial), store = createStore(storage);
  store.load();
  assert(store.save(study()).ok);
  for (const [key, value] of Object.entries(initial)) assert.equal(storage.getItem(key), value);
  assert.deepEqual(storage.writes, [KEY]);
  const exported = store.exportData();
  assert.deepEqual(Object.keys(exported.records).sort(), [KEY, LEGACY_KEY].sort());
  assert.equal(exported.records[LEGACY_KEY], initial[LEGACY_KEY]);
  assert(!JSON.stringify(exported).includes('sensitive-test-sentinel'));
  assert(!JSON.stringify(exported).includes('downloaded-test-sentinel'));
});

test('corrupt and unsupported records block saves and can be exported without alteration', () => {
  const invalid = [
    '{broken', '', 'null', '[]', '{}', '{"version":2,"privateNotes":"keep"}',
    '{"version":1,"project":[]}',
    '{"version":1,"lessons":{"html-elements":{"note":42}}}',
    '{"version":1,"lessons":{"js-events":{"answers":[0]}}}'
  ];
  for (const raw of invalid) {
    const storage = memoryStorage({ [KEY]: raw });
    const store = createStore(storage);
    assert.equal(store.load().code, 'invalid-data');
    assert.equal(store.save(study()).ok, false);
    assert.equal(storage.getItem(KEY), raw);
    assert.equal(storage.writes.length, 0);
    assert.equal(store.exportData().records[KEY], raw);
  }
});

test('unknown compatible fields are retained at the record, project and lesson levels', () => {
  const original = study();
  original.future = { value: 7 };
  original.project.assets = ['kept.png'];
  original.lessons['html-elements'].future = { first: 'keep', second: 'old' };
  original.lessons['future-lesson'] = { note: 'Do not discard' };
  const storage = memoryStorage({ [KEY]: JSON.stringify(original) }), store = createStore(storage);
  const loaded = store.load().data;
  loaded.project.html = 'A caller mutation without save';
  assert(store.save({ version: 1, project: { html: '<h1>Edited</h1>' }, lessons: {
    'html-elements': { note: 'Changed', bookmarks: [], future: { second: 'new' } }
  } }).ok);
  const saved = JSON.parse(storage.getItem(KEY));
  assert.deepEqual(saved.future, { value: 7 });
  assert.deepEqual(saved.project.assets, ['kept.png']);
  assert.equal(saved.project.css, original.project.css);
  assert.equal(saved.project.html, '<h1>Edited</h1>');
  assert.deepEqual(saved.lessons['html-elements'].bookmarks, []);
  assert.deepEqual(saved.lessons['html-elements'].future, { first: 'keep', second: 'new' });
  assert.deepEqual(saved.lessons['future-lesson'], original.lessons['future-lesson']);
});

test('a quota failure preserves the saved record and allows a later successful retry', () => {
  const storage = memoryStorage({ [KEY]: JSON.stringify(study()) }), store = createStore(storage);
  const before = storage.getItem(KEY), next = store.load().data;
  next.lessons['html-elements'].note = 'Unsaved work';
  storage.failWrite = true;
  assert.equal(store.save(next).code, 'write-failed');
  assert.equal(storage.getItem(KEY), before);
  storage.failWrite = false;
  assert(store.save(next).ok);
  assert.equal(createStore(storage).load().data.lessons['html-elements'].note, 'Unsaved work');
});

test('stale tabs cannot silently overwrite newer study records', () => {
  const storage = memoryStorage({ [KEY]: JSON.stringify(study()) });
  const a = createStore(storage), b = createStore(storage);
  const first = a.load().data, second = b.load().data;
  first.lessons['html-elements'].note = 'Latest note in tab A';
  assert(a.save(first).ok);
  const latest = storage.getItem(KEY);
  second.lessons['html-elements'].note = 'Stale note in tab B';
  assert.equal(b.save(second).code, 'conflict');
  assert.equal(storage.getItem(KEY), latest);
  assert.equal(b.exportData().records[KEY], latest);
  assert.equal(b.load().data.lessons['html-elements'].note, 'Latest note in tab A');
});

test('storage access failures are visible and cause no initialization writes', () => {
  const store = createStore(() => { throw new Error('SecurityError'); });
  assert.equal(store.load().code, 'storage-unavailable');
  assert.equal(store.save(study()).code, 'storage-unavailable');
  assert.match(store.exportData().error, /Could not read/);
});

test('bad incoming changes do not replace good data or prevent a valid retry', () => {
  const storage = memoryStorage({ [KEY]: JSON.stringify(study()) }), store = createStore(storage);
  store.load();
  const before = storage.getItem(KEY);
  assert.equal(store.save({ version: 1, language: 'wrong' }).code, 'invalid-input');
  const cyclic = study(); cyclic.extra = cyclic;
  assert.equal(store.save(cyclic).code, 'invalid-input');
  assert.equal(storage.getItem(KEY), before);
  assert(store.save({ version: 1, textSize: 20 }).ok);
});

test('literal special property names stay data and cannot modify object prototypes', () => {
  const raw = '{"version":1,"__proto__":{"polluted":"no"},"project":{"html":"ok","constructor":{"kept":true}}}';
  const storage = memoryStorage({ [KEY]: raw }), store = createStore(storage);
  store.load();
  assert(store.save({ version: 1, project: { html: 'edited' } }).ok);
  const value = JSON.parse(storage.getItem(KEY));
  assert.equal(value.__proto__.polluted, 'no');
  assert.equal({}.polluted, undefined);
  assert.deepEqual(value.project.constructor, { kept: true });
});

console.log('\n' + passed + ' Web Studio storage checks passed.');
