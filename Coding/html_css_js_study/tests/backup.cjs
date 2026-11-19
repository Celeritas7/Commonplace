'use strict';
const assert = require('node:assert/strict');
const { createStore, KEY, LEGACY_KEY, JOURNAL_KEY, validate, inspectBackup } = require('../studio-store.js');
const clone = value => JSON.parse(JSON.stringify(value));
const date = '2026-11-19T12:00:00.000Z';
const files = html => ({ html, css: 'h1 { color: teal; }', js: '' });
const project = (id, html, extra = {}) => ({ id, name: id, createdAt: date, updatedAt: date, files: files(html), ...extra });
const study = (html = '<h1>Local</h1>') => ({ version: 1, project: files(html), lessons: { 'html-elements': { note: 'Local note', bookmarks: [1], read: false, answers: [1, null, null, null, null], question: 0, submitted: false } } });
const legacy = () => ({ done: { l1: 1 }, star: {}, notes: { l1: 'Local course note' }, open: {}, hide: {}, show: 'all' });
const backup = (a, b, extra = {}) => JSON.stringify({ format: 'commonplace-web-studio-backup', version: 1, exportedAt: date, records: { [KEY]: a === null ? null : JSON.stringify(a), [LEGACY_KEY]: b === null ? null : JSON.stringify(b) }, ...extra });
function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, writes: [], fail: null,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { if (this.fail?.(key, value)) throw new Error('QuotaExceededError'); this.writes.push(key); data.set(key, String(value)); },
    removeItem(key) { if (this.fail?.(key, null)) throw new Error('Storage blocked'); this.writes.push(key); data.delete(key); }
  };
}
const original = (a = study(), b = legacy()) => ({ [KEY]: JSON.stringify(a), [LEGACY_KEY]: JSON.stringify(b), 'sb-auth-token': 'SECRET-SENTINEL', 'python-pack': 'KEEP-PACK', 'cpx.highlights': 'KEEP-HIGHLIGHTS' });
const open = initial => { const storage = memory(initial); const store = createStore(storage); store.load(); return { storage, store }; };
const plan = (store, a = study('<h1>Imported</h1>'), b = legacy(), mode = 'merge', draft = study(), old = legacy()) => store.planImport(store.inspectBackup(backup(a, b)), draft, old, mode);
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }

test('optional projects preserve old records, validate limits and do not write on load', () => {
  const { store, storage } = open(original()); assert.equal(storage.writes.length, 0);
  const a = study(); a.projects = { version: 1, activeId: 'one', items: [project('one', a.project.html, { future: { keep: true } })], futureCollection: 4 };
  assert.equal(validate(a), null); assert(store.save(a).ok); assert.deepEqual(createStore(storage).load().data.projects, a.projects);
  for (const edit of [x => x.projects.items.push(clone(x.projects.items[0])), x => { x.projects.activeId = 'missing'; }, x => { x.projects.items[0].name = ' '; }, x => { x.projects.items[0].files.html = 'x'.repeat(150001); }, x => { x.projects.items[0].id = '__proto__'; }, x => { x.projects.items[0].createdAt = 'yesterday'; }]) { const bad = clone(a); edit(bad); assert(validate(bad)); }
});

test('inspection validates both raw records and drafts, excludes unrelated keys and prefers valid unsaved drafts', () => {
  const draft = study('<h1>Unsaved draft</h1>');
  const inspected = inspectBackup(backup(study(), legacy(), { currentDraft: draft })); assert(inspected.ok); assert.deepEqual(inspected.study, draft);
  for (const value of ['{bad', JSON.stringify({ format: 'other', version: 1, records: {} }), backup(study(), legacy(), { version: 2 }), backup(study(), legacy(), { error: 'Could not read data' }), backup(study(), legacy(), { currentDraft: { version: 9 } }), backup(null, null)]) assert.equal(inspectBackup(value).ok, false);
  const bad = JSON.parse(backup(study(), legacy())); bad.records['sb-auth-token'] = 'secret'; assert.equal(inspectBackup(JSON.stringify(bad)).ok, false);
  bad.records = { [KEY]: '{broken', [LEGACY_KEY]: null }; bad.currentDraft = draft; assert.equal(inspectBackup(JSON.stringify(bad)).ok, false, 'valid draft cannot hide corrupt supplied saved data');
});

test('merge retains active code, conflicting projects, notes, bookmarks and local quiz choices', () => {
  const local = study(), incoming = study('<h1>Incoming</h1>');
  local.projects = { version: 1, activeId: 'same', items: [project('same', local.project.html)] };
  incoming.projects = { version: 1, activeId: 'same', items: [project('same', incoming.project.html)] };
  incoming.lessons['html-elements'] = { note: 'Imported note', bookmarks: [2], read: true, answers: [2, 2, 2, 2, 2], submitted: true, question: 4 };
  incoming.future = { imported: 1 };
  const old = legacy(), newOld = legacy(); newOld.notes.l1 = 'Imported course note'; newOld.done.l2 = 1;
  const { store, storage } = open(original(local, old)); const p = plan(store, incoming, newOld, 'merge', local, old);
  assert(p.ok, p.error); assert.equal(storage.writes.length, 0); assert.deepEqual(p.study.project, local.project); assert.equal(p.study.projects.items.length, 2); assert.notEqual(p.study.projects.items[1].id, 'same');
  assert.equal(p.study.projects.activeId, 'same'); assert.match(p.study.lessons['html-elements'].note, /Local note[\s\S]*Imported note/); assert.deepEqual(p.study.lessons['html-elements'].bookmarks, [1, 2]); assert.equal(p.study.lessons['html-elements'].read, true); assert.deepEqual(p.study.lessons['html-elements'].answers, local.lessons['html-elements'].answers);
  assert.match(p.legacy.notes.l1, /Local course note[\s\S]*Imported course note/); assert.equal(p.legacy.done.l2, 1); assert.equal(p.study.future.imported, 1); assert(p.summary.conflicts > 0); assert.equal(p.summary.notesAppended, 2);
  assert(store.applyImport(p).ok); for (const key of ['sb-auth-token', 'python-pack', 'cpx.highlights']) assert.equal(storage.getItem(key), original()[key]);
  assert.equal(store.getImportRecovery().pending, false); assert.deepEqual(store.getImportRecovery().records, { [KEY]: JSON.stringify(local), [LEGACY_KEY]: JSON.stringify(old) });
});

test('legacy single-project backups retain their distinct code as another project and deduplicate repeats', () => {
  const { store } = open(original()); const p = plan(store); assert(p.ok); assert.equal(p.study.projects.items.length, 2); assert.equal(p.study.projects.items[1].files.html, '<h1>Imported</h1>');
  const same = plan(store, study()); assert(same.ok); assert.equal(same.study.projects.items.length, 1);
  const full = study(); full.projects = { version: 1, activeId: 'p0', items: Array.from({ length: 20 }, (_, i) => project('p' + i, 'html' + i)) }; full.project = full.projects.items[0].files;
  const other = open(original(full)); const overflow = plan(other.store, study('distinct'), legacy(), 'merge', full); assert.equal(overflow.ok, false); assert.match(overflow.error, /20 projects/);
});

test('merge fills untouched quizzes, unions unique attempts and retains unknown fields', () => {
  const local = study(), incoming = study(); local.lessons['html-elements'].answers = Array(5).fill(null);
  incoming.lessons['html-elements'].answers = [2, 1, 0, 1, 2]; incoming.lessons['html-elements'].submitted = true;
  const attempt = (id, at) => ({ id, at, exerciseVersion: 1, status: 'failed', checks: [], files: files('<h1>x</h1>'), assisted: false });
  local.exercises = { 'html-reading-card': { attempts: [attempt('local', date)], totalAttempts: 1, future: 'keep' } };
  incoming.exercises = { 'html-reading-card': { attempts: [attempt('local', date), attempt('incoming', '2026-11-19T13:00:00.000Z')], totalAttempts: 2, hintsSeen: 2 } };
  const { store } = open(original(local)); const p = plan(store, incoming, legacy(), 'merge', local); assert(p.ok, p.error);
  assert.deepEqual(p.study.lessons['html-elements'].answers, incoming.lessons['html-elements'].answers); assert.equal(p.study.exercises['html-reading-card'].attempts.length, 2); assert.equal(p.study.exercises['html-reading-card'].future, 'keep'); assert.equal(p.study.exercises['html-reading-card'].hintsSeen, 2);
});

test('replace preserves missing records, records originals and requires an owned reviewed plan', () => {
  const initial = original(), { store, storage } = open(initial);
  const p = plan(store, study('replaced'), null, 'replace'); assert(p.ok); assert.equal(store.applyImport(clone(p)).ok, false); assert.equal(storage.writes.length, 0);
  assert(store.applyImport(p).ok); assert.equal(JSON.parse(storage.getItem(KEY)).project.html, 'replaced'); assert.equal(storage.getItem(LEGACY_KEY), initial[LEGACY_KEY]); assert.equal(store.applyImport(p).ok, false);
  const exported = store.exportData(); assert(exported.recovery.records[KEY].includes('Local')); assert(!JSON.stringify(exported).includes('SECRET-SENTINEL')); assert(inspectBackup(JSON.stringify(exported)).ok);
});

test('stale review and stale tabs never overwrite newer study or course data', () => {
  const { store, storage } = open(original()); const p = plan(store); storage.setItem(KEY, JSON.stringify(study('newer tab')));
  assert.equal(store.applyImport(p).code, 'conflict'); assert.equal(JSON.parse(storage.getItem(KEY)).project.html, 'newer tab'); assert.equal(plan(store).ok, false);
  const other = open(original()); const changed = legacy(); changed.notes.l1 = 'Other tab'; other.storage.setItem(LEGACY_KEY, JSON.stringify(changed)); assert.equal(plan(other.store).ok, false);
  const ownWrite = plan(other.store, study(), legacy(), 'merge', study(), changed); assert(ownWrite.ok, ownWrite.error);
});

test('quota failure before journal leaves both originals byte-for-byte untouched', () => {
  const initial = original(), { store, storage } = open(initial), p = plan(store); storage.fail = key => key === JOURNAL_KEY;
  assert.equal(store.applyImport(p).ok, false); assert.equal(storage.getItem(KEY), initial[KEY]); assert.equal(storage.getItem(LEGACY_KEY), initial[LEGACY_KEY]); assert.equal(store.getImportRecovery().pending, false);
});

test('second live-record write failure rolls back the first without losing drafts or unrelated data', () => {
  const initial = original(), { store, storage } = open(initial); const incomingLegacy = legacy(); incomingLegacy.notes.l1 = 'different'; const p = plan(store, study('new'), incomingLegacy, 'replace');
  storage.fail = (key, value) => key === LEGACY_KEY && value !== initial[LEGACY_KEY];
  const result = store.applyImport(p); assert.equal(result.ok, false); assert.equal(result.recoveryPending, false); assert.equal(storage.getItem(KEY), initial[KEY]); assert.equal(storage.getItem(LEGACY_KEY), initial[LEGACY_KEY]); assert.equal(storage.getItem('sb-auth-token'), initial['sb-auth-token']);
});

test('failed rollback blocks saves until explicit recovery restores originals and preserves null records', () => {
  const initial = { [KEY]: JSON.stringify(study()) }, { store, storage } = open(initial); const p = plan(store, study('new'), legacy(), 'replace', study(), null); assert(p.ok, p.error);
  let firstStudy = false;
  storage.fail = key => { if (key === LEGACY_KEY) return true; if (key === KEY) { if (firstStudy) return true; firstStudy = true; } return false; };
  const result = store.applyImport(p); assert.equal(result.recoveryPending, true); assert.equal(store.getImportRecovery().pending, true);
  const reopened = createStore(storage); assert.equal(reopened.load().code, 'import-recovery'); assert.equal(reopened.save(study('must not overwrite')).ok, false);
  storage.fail = null; assert(reopened.recoverImport().ok); assert.equal(storage.getItem(KEY), initial[KEY]); assert.equal(storage.getItem(LEGACY_KEY), null); assert.equal(createStore(storage).load().data.project.html, study().project.html);
});

test('recovery refuses to overwrite another tab after an interrupted import', () => {
  const { store, storage } = open(original()); const p = plan(store, study('new'), { ...legacy(), show: 'done' }, 'replace');
  storage.fail = (key, value) => key === LEGACY_KEY || (key === KEY && value === JSON.stringify(study()));
  assert.equal(store.applyImport(p).recoveryPending, true); storage.fail = null; storage.setItem(KEY, JSON.stringify(study('third-party tab')));
  assert.equal(store.recoverImport().ok, false); assert.equal(JSON.parse(storage.getItem(KEY)).project.html, 'third-party tab'); assert(store.exportData().recovery.records[KEY].includes('Local'));
});

test('unreadable saved records reject merge but explicit replacement retains originals for recovery', () => {
  for (const raw of ['{bad', JSON.stringify({ version: 9 })]) {
    const initial = original(); initial[KEY] = raw; const { store, storage } = open(initial);
    assert.equal(plan(store).ok, false);
    const p = plan(store, study('restored'), legacy(), 'replace'); assert(p.ok, p.error); assert(store.applyImport(p).ok); assert.equal(store.getImportRecovery().records[KEY], raw); assert.equal(JSON.parse(storage.getItem(KEY)).project.html, 'restored');
  }
});

test('literal special keys remain data during note merge', () => {
  const incoming = JSON.parse('{"notes":{"__proto__":"Imported literal note"},"done":{"constructor":1}}');
  const { store } = open(original()); const p = plan(store, study(), incoming); assert(p.ok, p.error); assert.equal(Object.getPrototypeOf(p.legacy.notes), Object.prototype); assert.equal(p.legacy.notes.__proto__, 'Imported literal note'); assert.equal({}.polluted, undefined);
});

test('unavailable storage does not invent an interrupted import, while a malformed observed journal stays protected', () => {
  const store = createStore(() => { throw new Error('Storage blocked'); });
  assert.equal(store.load().code, 'storage-unavailable');
  assert.deepEqual(store.getImportRecovery(), { pending: false, available: false, error: 'Browser storage is unavailable. Recovery status could not be checked.' });
  const corrupt = open({ ...original(), [JOURNAL_KEY]: '{bad' }); assert.equal(corrupt.store.load().code, 'import-recovery'); assert.equal(corrupt.store.getImportRecovery().pending, true);
});

test('keeping newer current records releases recovery without rewriting live keys or losing originals', () => {
  const initial = original(), { store, storage } = open(initial); const p = plan(store, study('new'), { ...legacy(), show: 'done' }, 'replace');
  storage.fail = (key, value) => key === LEGACY_KEY || (key === KEY && value === JSON.stringify(study()));
  assert.equal(store.applyImport(p).recoveryPending, true); storage.fail = null;
  const newer = JSON.stringify(study('Newer tab work')); storage.setItem(KEY, newer);
  assert.equal(store.recoverImport().ok, false); storage.writes = [];
  assert.equal(store.keepCurrentImport().ok, true); assert.deepEqual(storage.writes, [JOURNAL_KEY]);
  assert.equal(storage.getItem(KEY), newer); assert.equal(storage.getItem(LEGACY_KEY), initial[LEGACY_KEY]); assert.equal(store.getImportRecovery().records[KEY], initial[KEY]);
  assert.equal(store.getImportRecovery().pending, false); assert.equal(createStore(storage).load().data.project.html, 'Newer tab work');
});

test('keeping current records cannot release a recovery lock over malformed live data', () => {
  const initial = original(), after = { [KEY]: JSON.stringify(study('new')), [LEGACY_KEY]: initial[LEGACY_KEY] };
  const journal = { format: 'commonplace-web-studio-import', version: 1, phase: 'pending', createdAt: date, before: { [KEY]: initial[KEY], [LEGACY_KEY]: initial[LEGACY_KEY] }, after };
  const { store, storage } = open({ ...initial, [KEY]: '{bad', [JOURNAL_KEY]: JSON.stringify(journal) });
  assert.equal(store.keepCurrentImport().ok, false); assert.equal(store.getImportRecovery().pending, true); assert.equal(storage.getItem(KEY), '{bad');
});

test('repeated conflict imports do not duplicate retained projects or renamed attempts', () => {
  const local = study(), incoming = study('incoming');
  local.projects = { version: 1, activeId: 'same', items: [project('same', local.project.html)] };
  incoming.projects = { version: 1, activeId: 'same', items: [project('same', incoming.project.html)], futureCollection: 'keep' };
  const attempt = html => ({ id: 'collision', at: date, exerciseVersion: 1, status: 'failed', checks: [], files: files(html), assisted: false });
  local.exercises = { 'html-reading-card': { attempts: [attempt('local')], totalAttempts: 1 } };
  incoming.exercises = { 'html-reading-card': { attempts: [attempt('incoming')], totalAttempts: 1 } };
  const { store } = open(original(local)); const first = plan(store, incoming, legacy(), 'merge', local); assert(first.ok, first.error); assert(store.applyImport(first).ok);
  const second = plan(store, incoming, legacy(), 'merge', first.study); assert(second.ok, second.error);
  assert.equal(second.study.projects.items.length, 2); assert.equal(second.study.exercises['html-reading-card'].attempts.length, 2); assert.equal(second.study.projects.futureCollection, 'keep');
});

console.log('\n' + count + ' project and backup checks passed.');
