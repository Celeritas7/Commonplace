import { test } from "node:test";
import assert from "node:assert/strict";
import { sumResult } from "../../Office_work/Excel_study/assigned-lesson.mjs";
import { createSampleClient } from "../learn/sample-client.mjs";
import { createLearnerContext } from "../lib/learner-context.mjs";
import { createAccountStore } from "../lib/account-store.mjs";
import {
  memoryStorage,
  studyIdentity,
  openStudyRecords,
  initialAttempt,
  validateAttempt,
} from "../learn/progress.mjs";
import {
  listAssignedMaterials,
  readAssignedMaterial,
  lessonFromMaterial,
} from "../materials/learner.mjs";
import { EXCEL_PHASE_A_CAPABILITIES } from "../content/excel-contract.mjs";
async function fixture() {
  const { client, state } = await createSampleClient(),
    storage = memoryStorage(),
    store = createAccountStore(storage, "u7-test"),
    identity = createLearnerContext({ enabled: true, client, store }),
    context = await identity.refresh();
  return { client, state, storage, store, identity, context };
}
test("Excel executes only the declared SUM and validates all three numeric inputs", () => {
  assert.equal(sumResult(["12", "8", "5"], "=SUM(B2:B4)"), 25);
  assert.equal(sumResult(["1000.5", "-20", "0"], " =sum( B2:B4 ) "), 980.5);
  for (const [values, formula] of [
    [["12", "", "5"], "=SUM(B2:B4)"],
    [["12", "Infinity", "5"], "=SUM(B2:B4)"],
    [["1e13", "0", "0"], "=SUM(B2:B4)"],
    [["12", "8", "5"], "=SUM(A2:A4)"],
    [["12", "8", "5"], "window.executed=true"],
  ])
    assert.throws(() => sumResult(values, formula));
});
test("learner catalogue hides unreleased/unassigned content and rejects invalid descriptors and section requests", async () => {
  const f = await fixture();
  const rows = await listAssignedMaterials(f.client, f.context, "office.excel");
  assert.equal(rows.length, 3);
  assert.ok(!rows.some((r) => r.id === f.state.ids.answers));
  const before = f.state.calls.length;
  await assert.rejects(() =>
    listAssignedMaterials(f.client, f.context, "coding.sql"),
  );
  assert.equal(f.state.calls.length, before);
  for (const change of [
    (r) => (r[0].title = "<".repeat(161)),
    (r) => (r[0].version = 1.5),
    (r) => (r[0].id = "other"),
    (r) => (r[0].owner_id = "private"),
    (r) => r.push(r[0]),
  ]) {
    const bad = structuredClone(rows);
    change(bad);
    await assert.rejects(() =>
      listAssignedMaterials(
        { rpc: async () => ({ data: bad }) },
        f.context,
        "office.excel",
      ),
    );
  }
  f.identity.dispose();
});
test("pending catalogue and verification cannot reopen an invalidated account", async () => {
  const f = await fixture();
  let release;
  f.state.hooks.cp_learner_materials = () => new Promise((r) => (release = r));
  const loading = listAssignedMaterials(f.client, f.context, "office.excel");
  f.identity.invalidate();
  release();
  await assert.rejects(() => loading, /changed/);
  let resume;
  f.state.hooks.verify = () => new Promise((r) => (resume = r));
  const verification = f.identity.refresh();
  f.identity.invalidate();
  resume();
  await assert.rejects(() => verification, /changed/);
  assert.throws(() => f.store.ticket());
  f.identity.dispose();
});
test("authorized lesson composition reuses one server response and refuses wrong owner/state/capabilities", async () => {
  const f = await fixture(),
    material = await readAssignedMaterial(f.client, f.context, f.state.ids.sum);
  const before = f.state.calls.length;
  const lesson = await lessonFromMaterial(
    f.context,
    material,
    "office.excel",
    EXCEL_PHASE_A_CAPABILITIES,
  );
  assert.equal(lesson.bundle.scenario.id, "scenario.trade");
  assert.equal(f.state.calls.length, before);
  for (const change of [
    (m) => (m.owner_id = "other"),
    (m) => (m.publication_state = "draft"),
    (m) =>
      m.payload.content.bundle.lesson.required_capabilities.push(
        "excel.autosum.v1",
      ),
  ]) {
    const bad = structuredClone(material);
    change(bad);
    await assert.rejects(() =>
      lessonFromMaterial(
        f.context,
        bad,
        "office.excel",
        EXCEL_PHASE_A_CAPABILITIES,
      ),
    );
  }
  f.identity.dispose();
});
test("progress, notes and bookmarks are versioned, owner-scoped and leave legacy data intact", async () => {
  const f = await fixture();
  f.storage.setItem(
    "commonplace_excel_preview_v1",
    "original personal progress",
  );
  const m = await readAssignedMaterial(f.client, f.context, f.state.ids.sum),
    lesson = await lessonFromMaterial(
      f.context,
      m,
      "office.excel",
      EXCEL_PHASE_A_CAPABILITIES,
    ),
    key = await studyIdentity(m, lesson);
  assert.ok(key.length <= 160);
  const records = openStudyRecords(f.store, f.context, m, key),
    attempt = initialAttempt(m);
  attempt.worksheet.formula = "=SUM(B2:B4)";
  attempt.worksheet.applied = true;
  attempt.completed = true;
  records.saveProgress(attempt);
  records.saveNote("My inventory notes");
  records.saveBookmark(true);
  assert.equal(
    openStudyRecords(f.store, f.context, m, key).note,
    "My inventory notes",
  );
  const other = {
    ...m,
    id: "20000000-0000-4000-8000-000000000099",
    version: 2,
  };
  const otherLesson = await lessonFromMaterial(
    f.context,
    other,
    "office.excel",
    EXCEL_PHASE_A_CAPABILITIES,
  );
  assert.notEqual(await studyIdentity(other, otherLesson), key);
  f.state.emit("SIGNED_IN", "10000000-0000-4000-8000-000000000003");
  await assert.rejects(async () => records.saveNote("late write"));
  const contextB = await f.identity.refresh();
  assert.equal(openStudyRecords(f.store, contextB, m, key).note, "");
  assert.equal(openStudyRecords(f.store, contextB, m, key).bookmarked, false);
  f.state.emit("SIGNED_IN", f.context.userId);
  const contextA = await f.identity.refresh();
  const restored = openStudyRecords(f.store, contextA, m, key);
  assert.deepEqual(restored.state, attempt);
  assert.equal(restored.bookmarked, true);
  assert.equal(restored.note, "My inventory notes");
  assert.equal(
    f.storage.getItem("commonplace_excel_preview_v1"),
    "original personal progress",
  );
  f.identity.dispose();
});
test("malformed saved work is not overwritten and unrelated corrupt records do not block targeted reads", async () => {
  const f = await fixture(),
    m = await readAssignedMaterial(f.client, f.context, f.state.ids.quiz),
    key = await studyIdentity(m);
  const valid = initialAttempt(m);
  assert.throws(() => validateAttempt({ ...valid, responses: [200] }, m));
  assert.throws(() => validateAttempt({ ...valid, role: "administrator" }, m));
  f.store.put(f.context.ticket, {
    section: "office.excel",
    kind: "note",
    id: key,
    value: { version: 1, text: 42 },
  });
  const old = f.storage.getItem(f.storage.key(0));
  assert.throws(() => openStudyRecords(f.store, f.context, m, key));
  assert.equal(f.storage.getItem(f.storage.key(0)), old);
  const other = { ...m, id: "20000000-0000-4000-8000-000000000099" };
  assert.equal(
    openStudyRecords(f.store, f.context, other, await studyIdentity(other))
      .note,
    "",
  );
  f.storage.setItem(
    f.storage.key(0),
    JSON.stringify({
      section: "coding.sql",
      kind: "note",
      id: key,
      value: { version: 1, text: "wrong section" },
    }),
  );
  assert.throws(
    () =>
      f.store.get(f.context.ticket, {
        section: "office.excel",
        kind: "note",
        id: key,
      }),
    /Corrupt/,
  );
  f.identity.dispose();
});
test("attachment manifests cannot provide a script path, unsafe filename or malformed metadata", async () => {
  const f = await fixture();
  for (const change of [
    (a) => (a.filename = "x.html"),
    (a) => (a.path = "https://untrusted.invalid/file"),
    (a) => (a.bytes = -1),
    (a) => (a.sha256 = "nope"),
    (a) => (a.url = "https://untrusted.invalid"),
  ]) {
    const bad = structuredClone(f.state.items.get(f.state.ids.file));
    change(bad.asset);
    await assert.rejects(() =>
      readAssignedMaterial(
        { rpc: async () => ({ data: { ...bad, owner_id: f.context.userId } }) },
        f.context,
        bad.id,
      ),
    );
  }
  f.identity.dispose();
});

test("account storage requires explicit string namespaces and section identities", async () => {
  for (const namespace of [undefined, null, 12, {}, ["target"]])
    assert.throws(
      () => createAccountStore(memoryStorage(), namespace),
      /namespace/,
    );
  const f = await fixture();
  assert.throws(
    () =>
      f.store.put(f.context.ticket, {
        section: undefined,
        kind: "note",
        id: "one",
        value: { text: "kept" },
      }),
    /Invalid/,
  );
  assert.equal(f.storage.length, 0);
  f.identity.dispose();
});
