'use strict';
const assert = require('node:assert/strict');
const api = require('../studio-sync.js');
const clone = value => JSON.parse(JSON.stringify(value));
const empty = () => ({ version: 1, study: null, legacy: null });
const snapshot = note => ({ version: 1, study: { version: 1, lessons: { 'html-elements': { note } } }, legacy: null });
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// These engine tests inject the merge contract. Domain-specific conflict and
// validation rules are exercised separately in sync-merge.cjs.
const merger = {
  equal,
  validate: value => value && value.version === 1 && Object.hasOwn(value, 'study') && Object.hasOwn(value, 'legacy') ? null : 'Invalid snapshot.',
  merge(base, local, remote) {
    if (equal(local, remote) || equal(remote, base) || equal(remote, empty())) return { snapshot: clone(local), conflicts: [] };
    if (equal(local, base) || equal(local, empty())) return { snapshot: clone(remote), conflicts: [] };
    const note = [local.study?.lessons?.['html-elements']?.note, remote.study?.lessons?.['html-elements']?.note].filter(Boolean).join('\n');
    return { snapshot: snapshot(note), conflicts: ['Both note versions retained.'] };
  }
};
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function fixture(options = {}) {
  const saved = options.saved || new Map(), cloud = options.cloud || new Map(), states = [], calls = { read: 0, write: 0 };
  let local = clone(options.local || snapshot('My local note')), connected = options.connected !== false;
  const transport = {
    async read(id, signal) { calls.read++; if (options.read) return options.read(id, signal, cloud); return cloud.has(id) ? clone(cloud.get(id)) : null; },
    async write(id, revision, value, signal) {
      calls.write++;
      if (options.write) return options.write(id, revision, value, signal, cloud);
      const row = cloud.get(id);
      if ((row?.revision || 0) !== revision) return { conflict: true };
      const next = { revision: revision + 1, snapshot: clone(value) }; cloud.set(id, next); return clone(next);
    }
  };
  const metadata = {
    async get(id) { if (options.get) return options.get(id, saved); return saved.has(id) ? clone(saved.get(id)) : null; },
    async set(id, data) { if (options.set) return options.set(id, data, saved); saved.set(id, clone(data)); }
  };
  const engine = api.create({ readLocal: () => { if (options.localRead) return options.localRead(local); return clone(local); }, transport, metadata,
    merger, onState: state => states.push(state), online: () => connected, timeoutMs: options.timeoutMs || 1000 });
  engine.setUser('account-a');
  return { engine, saved, cloud, states, calls, setLocal(value) { local = clone(value); }, getLocal() { return clone(local); }, online(value) { connected = value; } };
}
let passed = 0;
async function test(name, run) { await run(); console.log('PASS ' + name); passed++; }
(async () => {
  await test('fresh local work uploads and is acknowledged only after confirmed storage', async () => {
    const f = fixture(); const result = await f.engine.sync();
    assert.equal(result.status, 'synced'); assert.equal(f.calls.read, 1); assert.equal(f.calls.write, 1);
    assert.deepEqual(f.cloud.get('account-a').snapshot, f.getLocal()); assert.deepEqual(f.saved.get('account-a').base, f.getLocal());
    assert.equal(result.pending, false); f.engine.stop();
  });
  await test('offline work makes no requests and survives a reopened sync engine', async () => {
    const f = fixture({ connected: false }); assert.equal((await f.engine.sync()).status, 'offline'); assert.equal(f.calls.read, 0);
    const local = f.getLocal(); f.engine.stop();
    const reopened = fixture({ saved: f.saved, cloud: f.cloud, local });
    assert.equal((await reopened.engine.sync()).status, 'synced'); assert.deepEqual(reopened.cloud.get('account-a').snapshot, local); reopened.engine.stop();
  });
  await test('same-account requests are single flight', async () => {
    const wait = deferred(); const f = fixture({ read: () => wait.promise });
    const first = f.engine.sync(), second = f.engine.sync(); assert.equal(first, second);
    wait.resolve(null); await first; assert.equal(f.calls.read, 1); assert.equal(f.calls.write, 1); f.engine.stop();
  });
  await test('unchanged cloud work skips upload and records its baseline', async () => {
    const cloud = new Map([['account-a', { revision: 4, snapshot: snapshot('Same') }]]);
    const f = fixture({ cloud, local: snapshot('Same') });
    assert.equal((await f.engine.sync()).status, 'synced'); assert.equal(f.calls.write, 0); assert.equal(f.saved.get('account-a').revision, 4); f.engine.stop();
  });
  await test('remote edits are staged without writing local work or advancing its base', async () => {
    const old = snapshot('Original'), remote = snapshot('Changed remotely');
    const saved = new Map([['account-a', { version: 1, base: old, revision: 1 }]]), cloud = new Map([['account-a', { revision: 2, snapshot: remote }]]);
    const f = fixture({ saved, cloud, local: old }); const result = await f.engine.sync();
    assert.equal(result.status, 'incoming'); assert.deepEqual(result.snapshot, remote); assert.deepEqual(result.capturedLocal, old);
    assert.deepEqual(f.getLocal(), old); assert.deepEqual(saved.get('account-a').base, old); assert.equal(f.calls.write, 0); f.engine.stop();
  });
  await test('incoming work has a fresh preparation and a verified local application acknowledgement', async () => {
    const cloud = new Map([['account-a', { revision: 3, snapshot: snapshot('Remote note') }]]);
    const f = fixture({ cloud, local: empty() }); const plan = await f.engine.prepareApply();
    assert.equal(plan.ok, true); assert.equal(plan.userId, 'account-a'); f.setLocal(plan.snapshot);
    assert.equal((await f.engine.applied(plan.snapshot, plan)).ok, true); assert.equal(f.engine.getState().status, 'synced');
    assert.deepEqual(f.saved.get('account-a').base, plan.snapshot); assert.equal((await f.engine.applied(plan.snapshot, plan)).ok, false); f.engine.stop();
  });
  await test('incoming work pauses unchanged periodic pushes while new edits resume automatic synchronization', async () => {
    const cloud = new Map([['account-a', { revision: 3, snapshot: snapshot('Remote note') }]]);
    const f = fixture({ cloud, local: empty() }); assert.equal((await f.engine.sync()).status, 'incoming');
    const reads = f.calls.read, writes = f.calls.write;
    assert.equal((await f.engine.sync()).status, 'incoming'); assert.equal(f.calls.read, reads); assert.equal(f.calls.write, writes);
    f.setLocal(snapshot('New local note')); f.engine.changed(); assert.equal(f.engine.getState().status, 'pending');
    const result = await f.engine.sync(); assert.equal(result.status, 'incoming'); assert.equal(f.calls.read, reads + 1);
    assert.match(result.snapshot.study.lessons['html-elements'].note, /New local note/); assert.match(result.snapshot.study.lessons['html-elements'].note, /Remote note/); f.engine.stop();
  });
  await test('reviewed application cannot acknowledge mutated or unsaved work', async () => {
    const f = fixture({ local: empty(), cloud: new Map([['account-a', { revision: 1, snapshot: snapshot('Cloud') }]]) });
    let plan = await f.engine.prepareApply(); assert.equal(plan.ok, true);
    assert.equal((await f.engine.applied(snapshot('Not applied'), plan)).ok, false); assert.equal(f.saved.size, 0);
    plan = await f.engine.prepareApply(); f.setLocal(snapshot('Different saved value'));
    assert.equal((await f.engine.applied(plan.snapshot, plan)).ok, false); assert.equal(f.saved.size, 0); f.engine.stop();
  });
  await test('local changes made during upload remain pending', async () => {
    const wait = deferred(), started = deferred();
    const f = fixture({ write: async (id, revision, value, signal, cloud) => { started.resolve(); await wait.promise; const next = { revision: revision + 1, snapshot: value }; cloud.set(id, next); return next; } });
    const first = f.engine.sync(); await started.promise; f.setLocal(snapshot('Typed while uploading')); f.engine.changed(); wait.resolve();
    assert.equal((await first).status, 'pending'); assert.equal(f.saved.size, 0);
    assert.equal(f.cloud.get('account-a').snapshot.study.lessons['html-elements'].note, 'My local note');
    assert.equal(f.getLocal().study.lessons['html-elements'].note, 'Typed while uploading'); f.engine.stop();
  });
  await test('local changes during metadata saving are not falsely reported as synced', async () => {
    const started = deferred(), wait = deferred();
    const f = fixture({ set: async (id, value, saved) => { started.resolve(); await wait.promise; saved.set(id, value); } });
    const pending = f.engine.sync(); await started.promise; f.setLocal(snapshot('Newer edit')); wait.resolve();
    assert.equal((await pending).status, 'pending'); assert.notDeepEqual(f.saved.get('account-a').base, f.getLocal()); f.engine.stop();
  });
  await test('compare-and-swap conflict retries with the latest cloud revision', async () => {
    let writes = 0;
    const f = fixture({ write: async (id, revision, value, signal, cloud) => {
      writes++;
      if (writes === 1) { cloud.set(id, { revision: 1, snapshot: snapshot('Other device') }); return { conflict: true }; }
      assert.equal(revision, 1); const next = { revision: 2, snapshot: value }; cloud.set(id, next); return next;
    } });
    const result = await f.engine.sync(); assert.equal(f.calls.read, 2); assert.equal(f.calls.write, 2); assert.equal(result.status, 'incoming');
    assert.match(result.snapshot.study.lessons['html-elements'].note, /My local note/); assert.match(result.snapshot.study.lessons['html-elements'].note, /Other device/); f.engine.stop();
  });
  await test('persistent write contention ends with a visible retryable error', async () => {
    const f = fixture({ write: async () => ({ conflict: true }) });
    const result = await f.engine.sync(); assert.equal(result.status, 'error'); assert.match(result.error, /same time/); assert.equal(f.calls.write, 3); assert.equal(f.saved.size, 0); f.engine.stop();
  });
  await test('a successful-looking but unconfirmed upload never advances the baseline', async () => {
    const f = fixture({ write: async () => ({ revision: 1, snapshot: snapshot('Wrong snapshot') }) });
    const result = await f.engine.sync(); assert.equal(result.status, 'error'); assert.match(result.error, /did not confirm/); assert.equal(f.saved.size, 0); f.engine.stop();
  });
  await test('timeouts abort the transport and leave retry available', async () => {
    let signal, never = true;
    const f = fixture({ timeoutMs: 20, read: (_, requestSignal) => { signal = requestSignal; return never ? new Promise(() => {}) : null; } });
    const result = await f.engine.sync(); assert.equal(result.status, 'error'); assert.match(result.error, /timed out/); assert.equal(signal.aborted, true);
    never = false; assert.equal((await f.engine.sync()).status, 'synced'); f.engine.stop();
  });
  await test('metadata failures protect the existing local and remote records', async () => {
    const f = fixture({ get: async () => { throw new Error('IndexedDB unavailable'); } });
    const before = f.getLocal(), result = await f.engine.sync(); assert.equal(result.status, 'error'); assert.match(result.error, /IndexedDB/);
    assert.equal(f.calls.read, 0); assert.equal(f.calls.write, 0); assert.deepEqual(f.getLocal(), before); f.engine.stop();
  });
  await test('corrupt baseline metadata is not silently treated as a new installation', async () => {
    const f = fixture({ saved: new Map([['account-a', { version: 9, base: empty(), revision: 2 }]]) });
    assert.equal((await f.engine.sync()).status, 'error'); assert.equal(f.calls.read, 0); f.engine.stop();
  });
  await test('invalid remote records never replace local work or upload against an unsafe baseline', async () => {
    const f = fixture({ read: async () => ({ revision: 1, snapshot: { version: 9 } }) });
    assert.equal((await f.engine.sync()).status, 'error'); assert.equal(f.calls.write, 0); assert.equal(f.saved.size, 0); f.engine.stop();
  });
  await test('unavailable or unsaved local work blocks cloud operations', async () => {
    const f = fixture({ localRead() { throw new Error('The draft has not been saved.'); } });
    const result = await f.engine.sync(); assert.equal(result.status, 'error'); assert.match(result.error, /not been saved/); assert.equal(f.calls.read, 0); f.engine.stop();
  });
  await test('changing account aborts and ignores old-account downloads', async () => {
    const wait = deferred(), started = deferred(); let oldSignal;
    const f = fixture({ read: async (id, signal) => { if (id === 'account-a') { oldSignal = signal; started.resolve(); return wait.promise; } return null; } });
    const old = f.engine.sync(); await started.promise; f.engine.setUser('account-b'); f.setLocal(snapshot('B work'));
    assert.equal(oldSignal.aborted, true); assert.equal((await old).status, 'cancelled');
    assert.equal((await f.engine.sync()).status, 'synced'); wait.resolve({ revision: 3, snapshot: snapshot('A cloud') }); await Promise.resolve();
    assert.equal(f.engine.getState().userId, 'account-b'); assert.equal(f.saved.has('account-a'), false); assert.deepEqual(f.saved.get('account-b').base, snapshot('B work')); f.engine.stop();
  });
  await test('old-account upload completion cannot mark the new account synchronized', async () => {
    const started = deferred(), wait = deferred();
    const f = fixture({ write: async (id, revision, value) => { started.resolve(); await wait.promise; return { revision: revision + 1, snapshot: value }; } });
    const pending = f.engine.sync(); await started.promise; f.engine.setUser(null); wait.resolve();
    assert.equal((await pending).status, 'cancelled'); assert.equal(f.engine.getState().status, 'signed-out'); assert.equal(f.saved.size, 0); f.engine.stop();
  });
  await test('apply tokens are invalidated by account changes and local edits', async () => {
    const f = fixture({ local: empty(), cloud: new Map([['account-a', { revision: 1, snapshot: snapshot('Cloud') }]]) });
    const plan = await f.engine.prepareApply(); assert.equal(plan.ok, true); f.engine.setUser('account-b');
    assert.equal((await f.engine.applied(plan.snapshot, plan)).ok, false); assert.equal(f.saved.size, 0); f.engine.setUser('account-a');
    const next = await f.engine.prepareApply(); f.engine.changed(); assert.equal((await f.engine.applied(next.snapshot, next)).ok, false); f.engine.stop();
  });
  await test('signed-out and stopped engines make no cloud requests', async () => {
    const f = fixture(); f.engine.setUser(null); assert.equal((await f.engine.sync()).status, 'signed-out'); assert.equal((await f.engine.prepareApply()).ok, false);
    f.engine.stop(); f.engine.setUser('account-a'); assert.equal((await f.engine.sync()).status, 'stopped'); assert.equal(f.calls.read, 0);
  });
  console.log(passed + ' sync engine tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
