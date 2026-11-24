import { test } from "node:test";
import assert from "node:assert/strict";
import { createSampleClient } from "../learn/sample-client.mjs";
import { createAccountStore } from "../lib/account-store.mjs";
import { memoryStorage, studyIdentity } from "../learn/progress.mjs";
import { createLeaseHandler } from "../offline/lease-handler.mjs";
import { verifyLease, canonical } from "../offline/lease.mjs";
import { createPackManager } from "../offline/packs.mjs";
import { createSyncStore } from "../offline/sync-store.mjs";
import { ownedKey } from "../offline/database.mjs";
import { memoryDatabase } from "./offline-support.mjs";
async function fixture() {
  const f = await createSampleClient(),
    db = memoryDatabase(),
    storage = memoryStorage(),
    store = createAccountStore(storage, "test");
  store.switchAccount(f.state.userId);
  const c = {
    userId: f.state.userId,
    ticket: store.ticket(),
    sections: f.state.sections,
  };
  const keys = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const original = f.client.rpc.bind(f.client);
  f.client.rpc = async (name, args) =>
    name === "cp_offline_snapshot"
      ? {
          data: {
            owner: f.state.userId,
            display_name: "Sample",
            section: "office.excel",
            profile: f.state.profile,
            materials: [...f.state.items.values()]
              .filter((m) => f.state.allowed.has(m.id))
              .map((m) => ({ ...m, owner_id: f.state.userId })),
          },
        }
      : original(name, args);
  const origin = "https://test.invalid",
    handler = createLeaseHandler({
      origin,
      namespace: "test",
      privateKey: keys.privateKey,
      leaseMs: 86400000,
      client: () => f.client,
    });
  const request = () =>
    handler(
      new Request(origin, {
        method: "POST",
        headers: {
          Origin: origin,
          Authorization: "Bearer synthetic",
          "x-cp-section": "office.excel",
        },
      }),
    );
  const invoke = f.client.functions.invoke.bind(f.client.functions);
  f.client.functions.invoke = async (name, args) =>
    name === "offline-lease"
      ? { data: await (await request()).json() }
      : invoke(name, args);
  const check = (x) => {
    const t = store.ticket();
    if (
      t.owner !== x.userId ||
      t.signal !== x.ticket.signal ||
      t.signal.aborted
    )
      throw Error("Account changed");
  };
  const packs = createPackManager({
    db,
    namespace: "test",
    origin,
    publicKey: keys.publicKey,
    check,
  });
  return {
    ...f,
    db,
    storage,
    store,
    c,
    keys,
    origin,
    handler,
    request,
    packs,
    check,
  };
}
test("offline lease signatures bind owner, namespace, origin, content and a bounded expiry", async () => {
  const f = await fixture(),
    token = await (await f.request()).json(),
    options = { namespace: "test", origin: f.origin, owner: f.c.userId };
  const lease = await verifyLease(token, f.keys.publicKey, options);
  assert.equal(lease.materials.length, 3);
  for (const replacement of [
    { owner: "10000000-0000-4000-8000-000000000003" },
    { namespace: "other" },
    { origin: "https://other.invalid" },
    { now: lease.expires_at },
    { lastSeen: Date.now() + 120000 },
  ])
    await assert.rejects(() =>
      verifyLease(token, f.keys.publicKey, { ...options, ...replacement }),
    );
  await assert.rejects(
    () =>
      verifyLease(
        { ...token, payload: token.payload.replace("Sample", "Forged") },
        f.keys.publicKey,
        options,
      ),
    /signature/,
  );
  assert.equal(
    (
      await f.handler(
        new Request(f.origin, {
          method: "POST",
          headers: { Origin: "https://other.invalid" },
        }),
      )
    ).status,
    403,
  );
});
test("pack download resumes completed hashes, rejects tampered files, and never recalls saved progress", async () => {
  const f = await fixture();
  f.storage.setItem("legacy-progress", "keep");
  f.state.hooks.download = () => {
    throw Error("network interrupted");
  };
  await assert.rejects(() => f.packs.download(f.c, f.client));
  assert.equal((await f.packs.status(f.c.userId)).complete, 2);
  const oldReads = f.state.calls.filter((n) => n === "cp_read_material").length;
  delete f.state.hooks.download;
  await f.packs.download(f.c, f.client);
  assert.ok(
    f.state.calls.filter((n) => n === "cp_read_material").length - oldReads <=
      1,
  );
  const lease = await f.packs.resume(f.c.userId);
  assert.equal(lease.materials.length, 3);
  const file = lease.materials.find((m) => m.asset);
  await f.db.put(
    "files",
    ownedKey(f.c.userId, file.asset.sha256),
    new Blob(["tampered"]),
  );
  await assert.rejects(() => f.packs.resume(f.c.userId), /damaged/);
  await f.packs.download(f.c, f.client);
  await f.packs.resume(f.c.userId);
  await f.packs.block(f.c.userId);
  await assert.rejects(() => f.packs.resume(f.c.userId));
  assert.equal(f.storage.getItem("legacy-progress"), "keep");
});
test("pack responses from a previous account cannot create a ready offline pack", async () => {
  const f = await fixture();
  f.state.hooks.download = () =>
    f.store.switchAccount("10000000-0000-4000-8000-000000000003");
  await assert.rejects(
    () => f.packs.download(f.c, f.client),
    /Account changed/,
  );
  await assert.rejects(() => f.packs.resume(f.c.userId));
});
test("sync retains local/cloud and simultaneous-tab conflicts; a lost acknowledgement retries idempotently", async () => {
  const f = await fixture(),
    cloud = new Map();
  let lose = false;
  const client = {
    async rpc(name, args) {
      const k = args.record_kind + args.record,
        r = cloud.get(k) || { revision: "0", value: null };
      if (name === "cp_sync_read") return { data: structuredClone(r) };
      if (r.operation === args.operation)
        return { data: { ...structuredClone(r), status: "saved" } };
      if (args.expected_revision !== r.revision)
        return { data: { ...structuredClone(r), status: "conflict" } };
      const next = {
        revision: String(BigInt(r.revision) + 1n),
        value: args.new_value,
        operation: args.operation,
      };
      cloud.set(k, next);
      if (lose) {
        lose = false;
        throw Error("ack lost");
      }
      return { data: { ...structuredClone(next), status: "saved" } };
    },
  };
  let connected = false;
  const sync = createSyncStore({
    db: f.db,
    store: f.store,
    namespace: "test",
    online: () => connected,
  });
  const m = { ...f.state.items.get(f.state.ids.quiz), owner_id: f.c.userId },
    id = await studyIdentity(m, null);
  const a = await sync.open(f.c, m, id, client),
    b = await sync.open(f.c, m, id, client);
  await a.saveNote("first tab");
  await assert.rejects(() => b.saveNote("second tab"), /competing/);
  let status = await sync.summary(f.c);
  assert.equal(status.conflicts.length, 1);
  assert.equal(status.conflicts[0].data.conflicts[0].value.text, "second tab");
  await sync.resolve(f.c, status.conflicts[0].key, "local");
  connected = true;
  lose = true;
  await assert.rejects(
    () => sync.syncAll(f.c, client, new Set([m.id])),
    /ack lost/,
  );
  await sync.syncAll(f.c, client, new Set([m.id]));
  assert.equal(cloud.get("note" + id).revision, "1");
  assert.equal((await sync.summary(f.c)).pending, 0);
  connected = false;
  const opened = await sync.open(f.c, m, id, client);
  await opened.saveNote("offline local");
  cloud.set("note" + id, {
    revision: "2",
    value: { version: 1, text: "other device" },
  });
  connected = true;
  await sync.syncAll(f.c, client, new Set([m.id]));
  status = await sync.summary(f.c);
  assert.equal(status.conflicts.length, 1);
  assert.equal(status.conflicts[0].data.value.text, "offline local");
  assert.equal(
    status.conflicts[0].data.conflicts[0].value.text,
    "other device",
  );
  const backup = JSON.parse(await sync.backup(f.c));
  assert.equal(backup.owner, f.c.userId);
  assert.ok(backup.records.some((r) => r.history.length));
  assert.equal(
    canonical(cloud.get("note" + id).value),
    canonical({ version: 1, text: "other device" }),
  );
});

test("malformed renewal blocks the former lease without deleting completed bytes", async () => {
  const f = await fixture();
  await f.packs.download(f.c, f.client);
  const files = (await f.db.all("files")).length;
  f.client.functions.invoke = async () => ({
    data: { payload: "{}", signature: "AAAA" },
  });
  await assert.rejects(() => f.packs.renew(f.c, f.client));
  await assert.rejects(() => f.packs.resume(f.c.userId));
  assert.equal((await f.db.all("files")).length, files);
});

test("an edit made during a pending cloud write remains queued after its acknowledgement", async () => {
  const f = await fixture();
  let connected = false,
    release,
    enteredResolve;
  const entered = new Promise((r) => (enteredResolve = r)),
    waiting = new Promise((r) => (release = r));
  let cloud = { revision: "0", value: null },
    calls = 0;
  const client = {
    async rpc(name, args) {
      if (name === "cp_sync_read") return { data: cloud };
      if (++calls === 1) {
        enteredResolve();
        await waiting;
      }
      cloud = {
        revision: String(BigInt(cloud.revision) + 1n),
        value: args.new_value,
      };
      return { data: { ...cloud, status: "saved" } };
    },
  };
  const sync = createSyncStore({
      db: f.db,
      store: f.store,
      namespace: "test",
      online: () => connected,
    }),
    m = { ...f.state.items.get(f.state.ids.quiz), owner_id: f.c.userId },
    id = await studyIdentity(m, null);
  const records = await sync.open(f.c, m, id, client);
  await records.saveNote("First edit");
  connected = true;
  const running = sync.syncAll(f.c, client, new Set([m.id]));
  await entered;
  await records.saveNote("Second edit while saving");
  release();
  await running;
  assert.equal((await sync.summary(f.c)).pending, 1);
  assert.equal(cloud.value.text, "First edit");
  await sync.syncAll(f.c, client, new Set([m.id]));
  assert.equal(cloud.value.text, "Second edit while saving");
  assert.equal(cloud.revision, "2");
  assert.equal((await sync.summary(f.c)).pending, 0);
});
