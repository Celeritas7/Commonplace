'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const mergeAPI = require('../studio-sync-merge.js');
const store = require('../studio-store.js');
const clone = value => JSON.parse(JSON.stringify(value));
const date = '2026-11-19T12:00:00.000Z';
const files = html => ({ html, css: 'h1 { color: teal; }', js: '' });
const project = (id, html) => ({ id, name: id, createdAt: date, updatedAt: date, files: files(html) });
const snapshot = () => ({ version: 1, study: { version: 1, language: 'html', project: files('start'), projects: { version: 1, activeId: 'one', items: [project('one', 'start')] }, lessons: { 'html-elements': { note: '', bookmarks: [0], read: false, answers: [null, null, null, null, null], question: 0, submitted: false } } }, legacy: { done: {}, star: {}, notes: {}, open: {}, hide: {} } });
const empty = { version: 1, study: null, legacy: null };
const changeCode = (value, file, text) => { value.study.project[file] = text; value.study.projects.items.find(item => item.id === value.study.projects.activeId).files[file] = text; };
const lesson = value => value.study.lessons['html-elements'];
let passed = 0;
function test(name, callback) { callback(); passed++; console.log('PASS ' + name); }
function checked(base, local, remote) {
  const inputs = [base, local, remote].map(value => value === null ? null : clone(value));
  const result = mergeAPI.merge(base, local, remote);
  assert.equal(mergeAPI.validate(result.snapshot), null);
  assert.deepEqual([base, local, remote], inputs, 'all original snapshots remain unchanged');
  return result;
}

test('equal compares structure independently of object key order', () => {
  assert(mergeAPI.equal({ a: 1, b: [{ c: null, d: true }] }, { b: [{ d: true, c: null }], a: 1 }));
  assert(!mergeAPI.equal({ a: 1 }, { a: 2 })); assert(!mergeAPI.equal([1, 2], [2, 1])); assert(!mergeAPI.equal(null, {}));
});
test('empty first sync and one populated device make no synthetic study data', () => {
  assert.deepEqual(checked(null, empty, empty).snapshot, empty);
  const existing = snapshot();
  assert.deepEqual(checked(null, empty, existing).snapshot, existing);
  assert.deepEqual(checked(null, existing, empty).snapshot, existing);
});
test('unchanged records remain exactly equivalent and retain extension fields', () => {
  const original = snapshot(); original.study.future = { keep: ['a'] };
  assert.deepEqual(checked(original, original, original), { snapshot: original, conflicts: [] });
});
test('one-sided changes and removals are propagated from the confirmed base', () => {
  const base = snapshot(); lesson(base).read = true; lesson(base).bookmarks = [0, 2]; base.legacy.done.l1 = 1; base.legacy.star.l1 = 1; base.legacy.notes.l1 = 'old';
  const local = clone(base), remote = clone(base);
  lesson(local).read = false; lesson(local).bookmarks = [2]; delete local.legacy.done.l1; local.legacy.star.l1 = false; local.legacy.notes.l1 = '';
  const result = checked(base, local, remote);
  assert.deepEqual(result.snapshot, local); assert.equal(result.conflicts.length, 0);
});
test('independent bookmark additions preserve removal of an observed bookmark', () => {
  const base = snapshot(), local = clone(base), remote = clone(base);
  lesson(local).bookmarks = [2]; lesson(remote).bookmarks = [0, 3];
  assert.deepEqual(lesson(checked(base, local, remote).snapshot).bookmarks, [2, 3]);
});
test('initial reconciliation unions existing bookmarks and independent done/star maps', () => {
  const local = snapshot(), remote = snapshot(); lesson(local).bookmarks = [1]; lesson(remote).bookmarks = [2];
  local.legacy.done.l1 = 1; remote.legacy.done.l2 = 1; remote.legacy.star.l3 = 1;
  const result = checked(null, local, remote);
  assert.deepEqual(lesson(result.snapshot).bookmarks, [1, 2]); assert.deepEqual(result.snapshot.legacy.done, { l1: 1, l2: 1 }); assert.equal(result.snapshot.legacy.star.l3, 1);
});
test('first sync preserves completion recorded on either device despite untouched false defaults', () => {
  const local = snapshot(), remote = snapshot(); lesson(remote).read = true; lesson(remote).practised = true; local.legacy.done.l1 = false; remote.legacy.done.l1 = 1; local.legacy.star.l2 = false; remote.legacy.star.l2 = true;
  const result = checked(null, local, remote).snapshot; assert(lesson(result).read); assert(lesson(result).practised); assert.equal(result.legacy.done.l1, 1); assert.equal(result.legacy.star.l2, true);
});
test('single-device note edits including empty text replace the old version', () => {
  const base = snapshot(); lesson(base).note = 'old'; const local = clone(base), remote = clone(base); lesson(remote).note = 'updated';
  assert.equal(lesson(checked(base, local, remote).snapshot).note, 'updated');
  lesson(remote).note = ''; assert.equal(lesson(checked(base, local, remote).snapshot).note, '');
});
test('concurrent lesson and course note versions are retained and repeated sync is idempotent', () => {
  const base = snapshot(), local = clone(base), remote = clone(base); lesson(base).note = 'base';
  lesson(local).note = 'local edit'; lesson(remote).note = 'remote edit'; local.legacy.notes.l1 = 'local course'; remote.legacy.notes.l1 = 'remote course';
  const first = checked(base, local, remote);
  assert.match(lesson(first.snapshot).note, /local edit[\s\S]*remote edit/); assert.match(first.snapshot.legacy.notes.l1, /local course[\s\S]*remote course/);
  assert.deepEqual(checked(base, local, first.snapshot).snapshot, first.snapshot);
  assert.deepEqual(checked(base, first.snapshot, remote).snapshot, first.snapshot);
});
test('concurrent clearing and editing of a note keeps the substantive edit', () => {
  const base = snapshot(), local = clone(base), remote = clone(base); lesson(base).note = 'old'; lesson(local).note = ''; lesson(remote).note = 'new content';
  assert.equal(lesson(checked(base, local, remote).snapshot).note, 'new content');
});
test('coherent quiz groups do not combine answers with another attempt’s submission', () => {
  const base = snapshot(), local = clone(base), remote = clone(base);
  Object.assign(lesson(local), { answers: [1, null, null, null, null], question: 1, submitted: false });
  Object.assign(lesson(remote), { answers: [2, 2, 2, 2, 2], question: 4, submitted: true });
  const result = checked(base, local, remote);
  for (const key of ['answers', 'question', 'submitted']) assert.deepEqual(lesson(result.snapshot)[key], lesson(local)[key]);
  assert(result.conflicts.some(message => /complete quiz/.test(message)));
});
test('an untouched initial quiz accepts the other device’s attempt', () => {
  const local = snapshot(), remote = snapshot(); Object.assign(lesson(remote), { answers: [2, 2, 2, 2, 2], question: 4, submitted: true });
  const result = checked(null, local, remote); assert.deepEqual(lesson(result.snapshot).answers, lesson(remote).answers); assert(lesson(result.snapshot).submitted);
});
test('different changed files merge without producing a conflict project', () => {
  const base = snapshot(), local = clone(base), remote = clone(base); changeCode(local, 'html', '<main>Local content</main>'); changeCode(remote, 'css', 'body { color: purple; }');
  const result = checked(base, local, remote);
  assert.equal(result.snapshot.study.project.html, local.study.project.html); assert.equal(result.snapshot.study.project.css, remote.study.project.css); assert.equal(result.snapshot.study.projects.items.length, 1); assert.equal(result.conflicts.length, 0);
});
test('conflicting edits to the same source file preserve both complete code versions', () => {
  const base = snapshot(), local = clone(base), remote = clone(base); changeCode(local, 'html', '<h1>Local</h1>'); changeCode(remote, 'html', '<h1>Remote</h1>'); changeCode(remote, 'js', 'console.log("Remote")');
  const result = checked(base, local, remote);
  assert.deepEqual(result.snapshot.study.project, local.study.project); assert.equal(result.snapshot.study.projects.items.length, 2);
  const retained = result.snapshot.study.projects.items.find(item => item.id !== 'one');
  assert.deepEqual(retained.files, remote.study.project); assert.match(retained.name, /other device/); assert(result.conflicts.some(message => /separate project/.test(message)));
  const repeat = checked(base, local, result.snapshot); assert.equal(repeat.snapshot.study.projects.items.length, 2); assert.deepEqual(repeat.snapshot, result.snapshot);
});
test('reciprocal device reconciliation stabilizes at two code versions without generated duplicates', () => {
  const base = snapshot(), a = clone(base), b = clone(base); changeCode(a, 'html', 'device A'); changeCode(b, 'html', 'device B');
  let right = checked(base, b, a).snapshot, left = checked(base, a, right).snapshot;
  const firstLeft = clone(left), firstRight = clone(right);
  for (let turn = 0; turn < 12; turn++) {
    right = checked(base, right, left).snapshot; left = checked(base, left, right).snapshot;
    for (const current of [left, right]) {
      assert.equal(current.study.projects.items.length, 2);
      assert.deepEqual(current.study.projects.items.map(item => item.files.html).sort(), ['device A', 'device B']);
    }
    assert.deepEqual(left, firstLeft); assert.deepEqual(right, firstRight);
  }
});
test('reciprocal reconciliation deduplicates generated copies before applying the twenty-project cap', () => {
  const base = snapshot(); base.study.projects.items.push(...Array.from({ length: 18 }, (_, i) => project('ordinary-' + i, 'ordinary ' + i)));
  const a = clone(base), b = clone(base); changeCode(a, 'html', 'device A'); changeCode(b, 'html', 'device B');
  const first = checked(base, b, a).snapshot, second = checked(base, a, first).snapshot;
  assert.equal(first.study.projects.items.length, 20); assert.equal(second.study.projects.items.length, 20);
  assert.equal(second.study.projects.items.filter(item => item.files.html === 'device A').length, 1);
});
test('intentional ordinary duplicate projects remain distinct from generated conflict copies', () => {
  const base = snapshot(), a = clone(base), b = clone(base); changeCode(a, 'html', 'device A'); changeCode(b, 'html', 'device B');
  a.study.projects.items.push(project('ordinary-copy', 'device A'));
  const first = checked(base, b, a).snapshot, second = checked(base, a, first).snapshot;
  assert.equal(second.study.projects.items.length, 3); assert(second.study.projects.items.some(item => item.id === 'ordinary-copy')); assert.equal(second.study.projects.items.filter(item => item.files.html === 'device A').length, 2);
});
test('renamed or otherwise authored generated copies are not automatically removed', () => {
  const base = snapshot(), a = clone(base), b = clone(base); changeCode(a, 'html', 'device A'); changeCode(b, 'html', 'device B');
  const first = checked(base, b, a).snapshot;
  for (const edit of [item => { item.name = 'My deliberately separate study copy'; }, item => { item.futureMemo = 'Keep this annotation'; }, item => { delete item._syncConflict; }]) {
    const other = clone(first), savedCopy = other.study.projects.items.find(item => item.id !== 'one'); edit(savedCopy);
    const second = checked(base, a, other).snapshot;
    assert.equal(second.study.projects.items.length, 3); assert(second.study.projects.items.some(item => item.id === savedCopy.id));
  }
});
test('older cached UI working-copy edits override stale active-project files', () => {
  const base = snapshot(), local = clone(base), remote = clone(base); local.study.project.html = 'old-controller edit'; changeCode(remote, 'css', 'remote style');
  const result = checked(base, local, remote); assert.equal(result.snapshot.study.projects.items[0].files.html, 'old-controller edit'); assert.equal(result.snapshot.study.project.css, 'remote style');
});
test('legacy unnamed projects remain unnamed unless a conflict needs separate versions', () => {
  const base = snapshot(); delete base.study.projects; const local = clone(base), remote = clone(base); local.study.project.html = 'local'; remote.study.project.css = 'remote';
  const result = checked(base, local, remote); assert(!result.snapshot.study.projects); assert.equal(result.snapshot.study.project.html, 'local'); assert.equal(result.snapshot.study.project.css, 'remote');
  remote.study.project.html = 'conflicting'; const conflict = checked(base, local, remote); assert.equal(conflict.snapshot.study.projects.items.length, 2);
});
test('new independent projects are unioned while the selected working project stays local', () => {
  const base = snapshot(), local = clone(base), remote = clone(base); local.study.projects.items.push(project('two', 'local second')); remote.study.projects.items.push(project('three', 'remote third')); remote.study.projects.activeId = 'three'; remote.study.project = files('remote third');
  const result = checked(base, local, remote); assert.equal(result.snapshot.study.projects.items.length, 3); assert.equal(result.snapshot.study.projects.activeId, 'one'); assert.equal(result.snapshot.study.project.html, 'start');
});
test('concurrent code retention refuses overflow rather than discarding a project', () => {
  const base = snapshot(); base.study.projects.items = Array.from({ length: 20 }, (_, i) => project(i ? 'p' + i : 'one', i ? 'content ' + i : 'start'));
  const local = clone(base), remote = clone(base); changeCode(local, 'html', 'local'); changeCode(remote, 'html', 'remote');
  const original = clone(local); assert.throws(() => mergeAPI.merge(base, local, remote), /20 projects/); assert.deepEqual(local, original);
});
const attempt = (id, second, text = id) => ({ id, at: new Date(Date.UTC(2026, 10, 19, 0, 0, second)).toISOString(), exerciseVersion: 1, status: 'failed', checks: [], files: files(text), assisted: false });
const exercise = value => value.study.exercises['html-reading-card'];
test('independent attempts combine once with monotonic counts and latest twenty history', () => {
  const base = snapshot(); base.study.exercises = { 'html-reading-card': { attempts: Array.from({ length: 20 }, (_, i) => attempt('old-' + i, i)), totalAttempts: 25, hintsSeen: 1, solutionViewed: false } };
  const local = clone(base), remote = clone(base); exercise(local).attempts.push(attempt('new-local', 21)); exercise(local).attempts.shift(); exercise(local).totalAttempts++; exercise(remote).attempts.push(attempt('new-remote', 22)); exercise(remote).attempts.shift(); exercise(remote).totalAttempts++; exercise(remote).hintsSeen = 3; exercise(remote).solutionViewed = true;
  const result = checked(base, local, remote), ex = exercise(result.snapshot);
  assert.equal(ex.attempts.length, 20); assert.equal(ex.totalAttempts, 27); assert.equal(ex.hintsSeen, 3); assert(ex.solutionViewed); assert(ex.attempts.some(item => item.id === 'new-local')); assert(ex.attempts.some(item => item.id === 'new-remote'));
  assert.deepEqual(checked(base, local, result.snapshot).snapshot, result.snapshot);
});
test('different attempts with a colliding ID retain both and are stable on retry', () => {
  const local = snapshot(), remote = snapshot(); local.study.exercises = { 'html-reading-card': { attempts: [attempt('same', 0, 'local')] } }; remote.study.exercises = { 'html-reading-card': { attempts: [attempt('same', 0, 'remote')] } };
  const result = checked(null, local, remote); assert.equal(exercise(result.snapshot).attempts.length, 2); assert.notEqual(exercise(result.snapshot).attempts[0].id, exercise(result.snapshot).attempts[1].id);
  assert.deepEqual(checked(null, local, result.snapshot).snapshot, result.snapshot);
});
test('unknown compatible fields and literal prototype keys remain own data', () => {
  const base = snapshot(), local = clone(base), remote = clone(base);
  local.study.future = { local: 1 }; remote.study.future = JSON.parse('{"remote":2,"__proto__":{"polluted":true}}'); remote.legacy.notes = JSON.parse('{"__proto__":"literal note"}');
  const result = checked(base, local, remote).snapshot; assert.equal(result.study.future.local, 1); assert.equal(result.study.future.remote, 2); assert.equal(result.study.future.__proto__.polluted, true); assert.equal(result.legacy.notes.__proto__, 'literal note'); assert.equal({}.polluted, undefined);
});
test('future lesson and exercise formats remain opaque compatible data', () => {
  const base = snapshot(), local = clone(base), remote = clone(base); local.study.lessons.future = { answers: { different: true }, local: 1 }; remote.study.lessons.future = { answers: { more: true }, remote: 2 }; local.study.exercises = { future: { attempts: ['opaque'], local: 1 } }; remote.study.exercises = { future: { attempts: ['opaque'], remote: 2 } };
  const result = checked(base, local, remote).snapshot; assert.deepEqual(result.study.lessons.future.answers, { different: true, more: true }); assert.equal(result.study.lessons.future.remote, 2); assert.deepEqual(result.study.exercises.future.attempts, ['opaque']); assert.equal(result.study.exercises.future.remote, 2);
});
test('malformed input, unsupported versions, non-JSON values and cycles fail without writes', () => {
  for (const bad of [null, {}, { ...empty, version: 2 }, { ...empty, study: { version: 3 } }, { ...empty, legacy: { notes: { l1: false } } }, { ...empty, extra: Infinity }, { ...empty, extra: undefined }, { ...empty, extra: () => {} }]) assert(mergeAPI.validate(bad));
  const circular = clone(empty); circular.extra = circular; assert(mergeAPI.validate(circular)); assert.throws(() => mergeAPI.merge(null, { version: 7 }, snapshot()), /format/);
});
test('browser UMD validation works with the browser store surface', () => {
  const memory = { getItem: () => null, setItem() {} }; const context = vm.createContext({ WebStudioStore: store.createStore(memory) });
  vm.runInContext(fs.readFileSync(require.resolve('../studio-sync-merge.js'), 'utf8'), context);
  assert.equal(context.WebStudioSyncMerge.validate(empty), null); assert.equal(context.WebStudioSyncMerge.validate(snapshot()), null); assert(context.WebStudioSyncMerge.validate({ ...empty, legacy: { notes: { l1: 1 } } }));
});
console.log('\n' + passed + ' Web Studio cloud merge checks passed.');
