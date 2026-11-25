import { test } from "node:test";
import assert from "node:assert/strict";
import { createSampleClient } from "../learn/sample-client.mjs";
import { createAccountStore } from "../lib/account-store.mjs";
import {
  memoryStorage,
  initialAttempt,
  studyIdentity,
} from "../learn/progress.mjs";
import { createSyncStore } from "../offline/sync-store.mjs";
import { ownedKey } from "../offline/database.mjs";
import { memoryDatabase } from "./offline-support.mjs";
import { STUDY_BACKUP_LIMITS } from "../offline/backup.mjs";

const namespace = "backup-roundtrip";
const kinds = ["progress", "note", "bookmark"];
const recordKey = (r) =>
  ownedKey(r.owner, r.identity.section, r.identity.kind, r.identity.id);
const textValue = (text) => ({ version: 1, text });
function target(f, db = memoryDatabase()) {
  const store = createAccountStore(memoryStorage(), namespace);
  store.switchAccount(f.state.userId);
  const c = {
    userId: f.state.userId,
    ticket: store.ticket(),
    sections: f.state.sections,
  };
  return {
    db,
    store,
    c,
    sync: createSyncStore({ db, store, namespace, online: () => true }),
  };
}
async function fixture(count = 3) {
  const f = await createSampleClient(),
    source = target(f),
    records = [];
  const template = f.state.items.get(f.state.ids.quiz);
  for (let i = 0; i < count; i++) {
    const number = Math.floor(i / 3) + 1;
    const material = {
      ...structuredClone(template),
      id: `40000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
    };
    f.state.items.set(material.id, material);
    f.state.allowed.add(material.id);
    const kind = kinds[i % 3];
    const value =
      kind === "note"
        ? textValue(`日本からの荷物 ${number}`)
        : kind === "bookmark"
          ? { version: 1, bookmarked: true }
          : { ...initialAttempt(material), completed: true, responses: [0] };
    const r = {
      owner: source.c.userId,
      material: material.id,
      identity: {
        section: "office.excel",
        kind,
        id: await studyIdentity(material, null),
      },
      value,
      local_version: 4,
      base_revision: "8",
      base_value: null,
      dirty: true,
      pending: null,
      conflicts: [],
      history: [],
    };
    records.push(r);
    await source.db.put("study", recordKey(r), r);
  }
  return { ...f, source, records };
}
const envelope = (f, records = f.records) => ({
  format: "commonplace-u8-study",
  version: 1,
  namespace,
  owner: f.source.c.userId,
  records,
});
const copies = (r) => [
  r.value,
  ...r.conflicts.map((x) => x.value),
  ...r.history.flatMap((h) => [h.value, ...h.conflicts.map((x) => x.value)]),
];

test("1,002 exported records restore notes, bookmarks, progress and competing edits without touching packs", async () => {
  const f = await fixture(1002),
    note = f.records[1];
  note.conflicts = [
    {
      id: "synthetic-conflict",
      source: "tab",
      value: textValue("Other device edit"),
    },
  ];
  note.history = [
    {
      value: textValue("Earlier note"),
      conflicts: [
        {
          id: "synthetic-history",
          source: "cloud",
          value: textValue("Earlier cloud edit"),
          revision: "7",
        },
      ],
    },
  ];
  await f.source.db.put("study", recordKey(note), note);
  const exported = await f.source.sync.backup(f.source.c);
  assert.equal(JSON.parse(exported).records.length, 1002);
  const restored = target(f);
  for (const table of ["packs", "documents", "files"])
    await restored.db.put(table, "synthetic-existing-pack", {
      bytes: new Uint8Array([4, 2, 1]),
      complete: true,
    });
  const packs = await Promise.all(
    ["packs", "documents", "files"].map((t) => restored.db.all(t)),
  );
  assert.equal(
    await restored.sync.restore(restored.c, exported, f.client),
    1002,
  );
  for (const record of f.records) {
    const saved = await restored.db.get("study", recordKey(record));
    assert.deepEqual(saved.value, record.value);
    assert.equal(saved.base_revision, "0");
    assert.equal(saved.pending, null);
  }
  const savedNote = await restored.db.get("study", recordKey(note));
  for (const value of copies(note))
    assert.ok(
      copies(savedNote).some(
        (v) => JSON.stringify(v) === JSON.stringify(value),
      ),
    );
  const before = await restored.db.all("study");
  assert.equal(await restored.sync.restore(restored.c, exported, f.client), 0);
  assert.deepEqual(await restored.db.all("study"), before);
  assert.deepEqual(
    await Promise.all(
      ["packs", "documents", "files"].map((t) => restored.db.all(t)),
    ),
    packs,
  );
  const second = target(f);
  assert.equal(
    await second.sync.restore(
      second.c,
      await restored.sync.backup(restored.c),
      f.client,
    ),
    1002,
  );
  assert.deepEqual(
    (await second.db.get("study", recordKey(note))).value,
    note.value,
  );
  for (const value of copies(note))
    assert.ok(
      copies(await second.db.get("study", recordKey(note))).some(
        (v) => JSON.stringify(v) === JSON.stringify(value),
      ),
    );
});

test("a legacy version-1 backup above 8 MiB retains more than 1,000 alternative edits", async () => {
  const f = await fixture(),
    note = f.records[1];
  note.history = Array.from({ length: 1001 }, (_, i) => ({
    value: textValue(`${i}:` + "界".repeat(3995)),
    conflicts: [],
  }));
  await f.source.db.put("study", recordKey(note), note);
  const legacy = JSON.stringify(envelope(f), null, 2);
  assert.ok(new TextEncoder().encode(legacy).length > 8 * 1024 * 1024);
  assert.ok(legacy.length < 8 * 1024 * 1024);
  const restored = target(f);
  assert.equal(await restored.sync.restore(restored.c, legacy, f.client), 3);
  const saved = await restored.db.get("study", recordKey(note));
  assert.deepEqual(
    saved.history.map((h) => h.value),
    note.history.map((h) => h.value),
  );
  const exported = await f.source.sync.backup(f.source.c);
  const again = target(f);
  assert.equal(await again.sync.restore(again.c, exported, f.client), 3);
});

test("the record boundary round-trips; an extra record is rejected by both paths before writes", async () => {
  const f = await fixture(STUDY_BACKUP_LIMITS.records),
    restored = target(f);
  const exported = await f.source.sync.backup(f.source.c);
  assert.equal(
    await restored.sync.restore(restored.c, exported, f.client),
    STUDY_BACKUP_LIMITS.records,
  );
  const extra = structuredClone(f.records.at(-1));
  extra.identity.kind = "note";
  extra.value = textValue("Record above the limit must remain on this device");
  f.records.push(extra);
  await f.source.db.put("study", recordKey(extra), extra);
  await assert.rejects(
    () => f.source.sync.backup(f.source.c),
    /10,000 records/,
  );
  assert.deepEqual(
    (await f.source.db.get("study", recordKey(extra))).value,
    extra.value,
  );
  const empty = target(f),
    calls = f.state.calls.length;
  await assert.rejects(
    () => empty.sync.restore(empty.c, JSON.stringify(envelope(f)), f.client),
    /10,000 records/,
  );
  assert.equal(f.state.calls.length, calls);
  assert.deepEqual(await empty.db.all("study"), []);
});

test("UTF-8 byte boundary round-trips; oversized export and import fail without changing work", async () => {
  const f = await fixture(),
    note = f.records[1];
  const b = envelope(f, [note]);
  const encode = () => JSON.stringify(b, null, 2);
  const byteLength = () => new TextEncoder().encode(encode()).length;
  const emptyHistory = () => ({ value: textValue(""), conflicts: [] });
  note.history = [emptyHistory()];
  const one = byteLength();
  note.history.push(emptyHistory());
  const blankCost = byteLength() - one,
    fullText = "界".repeat(4000);
  const fullCount = Math.floor(
    (STUDY_BACKUP_LIMITS.bytes - one) / (blankCost + 12000),
  );
  note.history = Array.from({ length: fullCount }, () => ({
    value: textValue(fullText),
    conflicts: [],
  }));
  note.history.push(emptyHistory());
  let remaining = STUDY_BACKUP_LIMITS.bytes - byteLength();
  if (remaining > 12000) {
    note.history.push(emptyHistory());
    remaining = STUDY_BACKUP_LIMITS.bytes - byteLength();
  }
  assert.ok(remaining >= 0 && remaining <= 12000);
  note.history.at(-1).value.text =
    "界".repeat(Math.floor(remaining / 3)) + ["", "x", "é"][remaining % 3];
  assert.equal(byteLength(), STUDY_BACKUP_LIMITS.bytes);
  // Isolate the single large note, using the production exporter and importer.
  const large = target(f);
  await large.db.put("study", recordKey(note), note);
  const exported = await large.sync.backup(large.c);
  assert.equal(
    new TextEncoder().encode(exported).length,
    STUDY_BACKUP_LIMITS.bytes,
  );
  assert.ok(exported.length < STUDY_BACKUP_LIMITS.bytes);
  const restored = target(f);
  assert.equal(await restored.sync.restore(restored.c, exported, f.client), 1);
  assert.deepEqual(
    (await restored.db.get("study", recordKey(note))).history,
    note.history,
  );
  const empty = target(f),
    calls = f.state.calls.length;
  await assert.rejects(
    () => empty.sync.restore(empty.c, exported + " ", f.client),
    /32 MiB/,
  );
  assert.equal(f.state.calls.length, calls);
  assert.deepEqual(await empty.db.all("study"), []);
  note.history.push(emptyHistory());
  await large.db.put("study", recordKey(note), note);
  await assert.rejects(() => large.sync.backup(large.c), /32 MiB/);
  assert.equal(
    (await large.db.get("study", recordKey(note))).history.length,
    note.history.length,
  );
});

test("alternative-version limit is shared and cannot produce an unrestorable download", async () => {
  const f = await fixture(),
    note = f.records[1],
    restored = target(f);
  note.history = Array.from(
    { length: STUDY_BACKUP_LIMITS.alternatives },
    (_, i) => ({ value: textValue(`Edit ${i}`), conflicts: [] }),
  );
  await f.source.db.put("study", recordKey(note), note);
  assert.equal(
    await restored.sync.restore(
      restored.c,
      await f.source.sync.backup(f.source.c),
      f.client,
    ),
    3,
  );
  assert.deepEqual(
    (await restored.db.get("study", recordKey(note))).history,
    note.history,
  );
  note.conflicts.push({
    value: textValue("One extra edit"),
    source: "tab",
    id: "synthetic-extra",
  });
  await f.source.db.put("study", recordKey(note), note);
  await assert.rejects(
    () => f.source.sync.backup(f.source.c),
    /alternative versions/,
  );
  const empty = target(f),
    calls = f.state.calls.length;
  await assert.rejects(
    () => empty.sync.restore(empty.c, JSON.stringify(envelope(f)), f.client),
    /alternative versions/,
  );
  assert.equal(f.state.calls.length, calls);
  assert.deepEqual(await empty.db.all("study"), []);
});

test("pending, cloud, local and historical values survive without trusting old sync metadata", async () => {
  const f = await fixture(),
    note = f.records[1];
  note.pending = {
    id: "synthetic-operation",
    revision: "999",
    local_version: 3,
    value: textValue("In-flight earlier edit"),
  };
  note.base_value = textValue("Last confirmed cloud edit");
  note.conflicts = [
    {
      id: "synthetic-cloud",
      source: "cloud",
      revision: "1000",
      value: textValue("Competing cloud edit"),
    },
  ];
  await f.source.db.put("study", recordKey(note), note);
  const exported = await f.source.sync.backup(f.source.c),
    restored = target(f);
  await restored.sync.restore(restored.c, exported, f.client);
  const saved = await restored.db.get("study", recordKey(note));
  assert.equal(saved.base_revision, "0");
  assert.equal(saved.pending, null);
  assert.equal(saved.dirty, true);
  assert.deepEqual(saved.value, note.value);
  for (const value of [
    note.pending.value,
    note.base_value,
    note.conflicts[0].value,
  ])
    assert.ok(
      copies(saved).some((v) => JSON.stringify(v) === JSON.stringify(value)),
    );
  const existing = target(f),
    newer = structuredClone(note);
  newer.value = textValue("Newer local edit kept during restore");
  await existing.db.put("study", recordKey(newer), newer);
  await existing.sync.restore(existing.c, exported, f.client);
  const merged = await existing.db.get("study", recordKey(newer));
  assert.deepEqual(merged.value, newer.value);
  assert.deepEqual(merged.pending, newer.pending);
  assert.ok(
    merged.conflicts.some(
      (copy) => copy.source === "backup" && copy.value.text === note.value.text,
    ),
  );
  const again = target(f);
  await again.sync.restore(
    again.c,
    await existing.sync.backup(existing.c),
    f.client,
  );
  for (const value of [
    newer.value,
    note.value,
    note.pending.value,
    note.base_value,
    note.conflicts[0].value,
  ])
    assert.ok(
      copies(await again.db.get("study", recordKey(note))).some(
        (v) => JSON.stringify(v) === JSON.stringify(value),
      ),
    );
});

test("legacy imports still validate all records and authorization before writing; a quota interruption is retryable", async () => {
  const f = await fixture(6),
    restored = target(f);
  const original = JSON.stringify(envelope(f));
  for (const change of [
    (b) => {
      b.owner = "10000000-0000-4000-8000-000000000003";
    },
    (b) => {
      b.namespace = "another-project";
    },
    (b) => {
      b.records[4].value.text = "x".repeat(4001);
    },
    (b) => {
      b.records[5].identity.id = "wrong-identity";
    },
    (b) => {
      b.records[4].history = {};
    },
    (b) => {
      b.records.push(b.records[0]);
    },
  ]) {
    const changed = JSON.parse(original);
    change(changed);
    await assert.rejects(() =>
      restored.sync.restore(restored.c, JSON.stringify(changed), f.client),
    );
    assert.deepEqual(await restored.db.all("study"), []);
  }
  f.state.allowed.delete(f.records[5].material);
  await assert.rejects(
    () => restored.sync.restore(restored.c, original, f.client),
    /unavailable/,
  );
  assert.deepEqual(await restored.db.all("study"), []);
  f.state.allowed.add(f.records[5].material);
  const update = restored.db.update.bind(restored.db);
  let writes = 0;
  restored.db.update = async (...args) => {
    if (++writes === 2) throw Error("Synthetic quota interruption");
    return update(...args);
  };
  await assert.rejects(
    () => restored.sync.restore(restored.c, original, f.client),
    /quota/,
  );
  assert.equal((await restored.db.all("study")).length, 1);
  restored.db.update = update;
  assert.equal(await restored.sync.restore(restored.c, original, f.client), 5);
  assert.equal(await restored.sync.restore(restored.c, original, f.client), 0);
  for (const r of f.records)
    assert.deepEqual(
      (await restored.db.get("study", recordKey(r))).value,
      r.value,
    );
  const switched = target(f);
  f.state.hooks.cp_read_material = () =>
    switched.store.switchAccount("10000000-0000-4000-8000-000000000003");
  await assert.rejects(
    () => switched.sync.restore(switched.c, original, f.client),
    /Account changed/,
  );
  assert.deepEqual(await switched.db.all("study"), []);
});
