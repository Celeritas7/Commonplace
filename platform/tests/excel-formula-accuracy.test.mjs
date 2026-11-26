import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  sumResult, appendCalculation, validateCalculationHistory, practiceCriteria, practiceHistory,
} from "../../Office_work/Excel_study/calculation-history.mjs";
import { exampleBundle } from "../content/examples.mjs";
import { initialAttempt, validateAttempt, memoryStorage, studyIdentity } from "../learn/progress.mjs";
import { createAccountStore } from "../lib/account-store.mjs";
import { createSyncStore } from "../offline/sync-store.mjs";
import { createSampleClient } from "../learn/sample-client.mjs";
import { lessonFromMaterial } from "../materials/learner.mjs";
import { EXCEL_PHASE_A_CAPABILITIES } from "../content/excel-contract.mjs";
import { memoryDatabase } from "./offline-support.mjs";

// Follow the pages' library order so these checks exercise the same public
// parser/assessment dependencies as the personal-study entry points.
const directory = new URL("../../Office_work/Excel_study/", import.meta.url);
const read = (path) => readFileSync(new URL(path, directory), "utf8");
const window = {}, loaded = new Set();
for (const page of ["Section_1_Study.html", "Section_2_Study.html"]) {
  for (const [, path] of read(page).matchAll(/<script src="([^"/]+\.js)"><\/script>/g)) {
    if (loaded.has(path) || path === "excel-formula-page.js") continue;
    new Function("window", read(path))(window);
    loaded.add(path);
  }
}
const E = window.CommonplaceExcelFormulaFoundations;
const S = window.CommonplaceExcelScenarios;
const A = window.CommonplaceExcelAssessment;
const FORMULA = "=SUM(B2:B4)";
const VALUES = ["12", "8", "5"];
const id = (n) => "90000000-0000-4000-8000-" + String(n).padStart(12, "0");
const submittedAt = "2026-11-26T14:00:00.000Z";
const append = (history, formula, n, values = VALUES) => appendCalculation(
  history, values, formula, { id: id(n), submittedAt },
);
const flags = (grade) => grade.criteria.map((criterion) => criterion.passed);

test("R2 rejects split function names and cell-reference tokens in every supported formula", () => {
  for (const lesson of E.list()) {
    const fn = lesson.fn;
    for (const formula of [
      `=${fn[0]} ${fn.slice(1)}(B2:B4)`,
      `=${fn[0]}\t${fn.slice(1)}(B2:B4)`,
      `=${fn} (B2:B4)`,
      `=${fn}(B 2:B4)`,
      `=${fn}(B2:B 4)`,
      `=${fn}(B\t2:B4)`,
      `=${fn}(B2:B\n4)`,
      `=${fn}($ B2:B4)`,
      `=${fn}(B2:B$ 4)`,
    ]) {
      assert.throws(() => E.evaluate(formula, VALUES), undefined, formula);
      if (fn === "SUM") assert.throws(() => sumResult(VALUES, formula), undefined, formula);
    }
  }
});

test("R2 preserves case, delimiter spacing and absolute/mixed references within the fixed range", () => {
  for (const scenario of S.list()) {
    for (const lesson of E.list()) {
      for (const mode of ["guided", "independent"]) {
        const exercise = E.exercise(lesson.id, scenario.id, scenario.version, mode);
        const expected = E.evaluate(exercise.formula, exercise.values);
        for (const formula of [
          `=${lesson.fn.toLowerCase()}(b2:b4)`,
          ` =${lesson.fn}( B2 : B4 ) `,
          `=${lesson.fn}($B$2:$B$4)`,
          `=${lesson.fn}(B$2:$B4)`,
          `=${lesson.fn}(B4:$B$2)`,
          ` =${lesson.fn.toLowerCase()}( $b2 : b$4 ) `,
        ]) {
          assert.deepEqual(E.evaluate(formula, exercise.values), expected, `${scenario.id}: ${formula}`);
          assert.equal(E.grade(exercise, formula, exercise.values).passed, true, `${scenario.id}: ${formula}`);
          if (lesson.fn === "SUM")
            assert.equal(sumResult(exercise.values, formula), expected.result, `${scenario.id}: ${formula}`);
        }
      }
    }
  }
});

test("R2 a different supported function earns calculation credit without earning task-function credit", () => {
  for (const scenario of S.list()) {
    for (const lesson of E.list()) {
      const exercise = E.exercise(lesson.id, scenario.id, scenario.version, "independent");
      const other = lesson.fn === "SUM" ? "COUNT" : "SUM";
      const grade = E.grade(exercise, `=${other}(B2:B4)`, exercise.values);
      assert.deepEqual(flags(grade), [false, true, true]);
      assert.equal(grade.score, 2);
      assert.equal(grade.passed, false);
    }
  }
});

test("R2 independently awards preserved exercise inputs when the formula is invalid", () => {
  for (const scenario of S.list()) {
    for (const lesson of E.list()) {
      const exercise = E.exercise(lesson.id, scenario.id, scenario.version, "independent");
      for (const formula of ["", `=${lesson.fn}(A2:A4)`, `=${lesson.fn}(B 2:B4)`]) {
        const grade = E.grade(exercise, formula, exercise.values);
        assert.deepEqual(flags(grade), [false, false, true], `${scenario.id}/${lesson.id}: ${formula}`);
        assert.equal(grade.score, 1);
        assert.equal(grade.passed, false);
      }
      const changed = [...exercise.values];
      changed[0] = String(Number(changed[0]) + 1);
      assert.equal(E.grade(exercise, exercise.formula, changed).criteria[2].passed, false);
      const malformed = [null, undefined, ["12", "8"], ["12", "8", "5", "1"], [12, "8", "5"]];
      for (const values of malformed) {
        const grade = E.grade(exercise, exercise.formula, values);
        assert.equal(grade.criteria[0].passed, true);
        assert.equal(grade.criteria[1].passed, false);
        assert.equal(grade.criteria[2].passed, false);
      }
    }
  }
});

test("R2 assigned criteria keep each valid cell's credit independent of other invalid cells", () => {
  for (const name of ["trade", "mechanical", "finance"]) {
    const rows = exampleBundle(name).dataset.rows;
    const values = rows.map((row) => String(row[1]));
    for (let i = 0; i < values.length; i++) {
      for (const invalid of ["", "not a number", "9".repeat(41)]) {
        const edited = [...values]; edited[i] = invalid;
        const expected = [true, true, true, true]; expected[i] = false;
        assert.deepEqual(flags(practiceCriteria("guided-sum-v1", rows, edited, FORMULA)), expected);
      }
    }
    assert.deepEqual(flags(practiceCriteria("guided-sum-v1", rows, values, "=S UM(B2:B4)")),
      [true, true, true, false]);
    assert.equal(practiceCriteria("guided-sum-v1", rows, values, "=sum($B$2:$B$4)").passed, true);
  }
});

test("R2 standalone assessments check formula tokens independently from cell and style criteria", () => {
  for (const scenario of S.list()) {
    const [revision, heading] = S.assessments(scenario, window.CommonplaceExcelAssessments);
    const values = [scenario.values[0], scenario.revised, scenario.values[2]];
    const state = {
      formula: " =sum( $B2 : B$4 ) ",
      cells: Object.fromEntries(values.map((value, i) => [`B${i + 2}`, { value: String(value) }])),
    };
    state.cells.B5 = { value: String(values.reduce((sum, value) => sum + value, 0)) };
    assert.equal(A.grade(revision, state).passed, true, scenario.id);
    state.formula = "=S U M(B 2:B4)";
    assert.deepEqual(A.grade(revision, state).results.map((criterion) => criterion.passed),
      [true, true, false, true]);
    state.cells.B5.value = "wrong result";
    state.formula = FORMULA;
    assert.deepEqual(A.grade(revision, state).results.map((criterion) => criterion.passed),
      [true, true, true, false]);
    const style = { formula: "malformed", cells: { A1: { value: scenario.heading, bold: true, fill: false, border: true } } };
    assert.deepEqual(A.grade(heading, style).results.map((criterion) => criterion.passed),
      [true, false, true, true]);
  }
});

test("R2 history keeps old evaluations readable while recording new submissions under corrected syntax", () => {
  // These are literal pre-correction records, not results regenerated by the
  // new parser. Previously accepted mistakes and rejected valid syntax survive.
  const legacy = [
    { id: id(1), submitted_at: submittedAt, values: [...VALUES], formula: "=S U M(B 2:B4)", accepted: true, result: 25, activity: "guided-sum-v1" },
    { id: id(2), submitted_at: submittedAt, values: [...VALUES], formula: "=SUM($B$2:$B$4)", accepted: false, result: null, activity: "guided-sum-v1" },
  ];
  const unchanged = structuredClone(legacy);
  assert.deepEqual(validateCalculationHistory(legacy), unchanged);
  let history = append(legacy, "=S U M(B 2:B4)", 3);
  assert.equal(history[2].accepted, false);
  assert.equal(history[2].result, null);
  assert.equal(history[2].evaluation_version, 2);
  history = append(history, "=sum($B$2:$B$4)", 4);
  assert.equal(history[3].accepted, true);
  assert.equal(history[3].result, 25);
  assert.equal(history[3].evaluation_version, 2);
  assert.deepEqual(history.slice(0, 2), unchanged);
  assert.deepEqual(legacy, unchanged);
  assert.deepEqual(validateCalculationHistory(history), history);
  const reviewed = practiceHistory(history, exampleBundle("trade").dataset.rows, "guided-sum-v1");
  assert.deepEqual(reviewed.map((entry) => entry.grade.score), [3, 4], "Current criteria are recomputed from the original evidence");
  assert.equal(reviewed[0].accepted, true, "The original recorded outcome remains distinguishable from current grading");
  assert.equal(reviewed[1].accepted, false);
  for (const change of [
    (records) => { records[2].accepted = true; records[2].result = 25; },
    (records) => { records[3].result = 999; },
    (records) => { records[0].result = 999; },
  ]) {
    const tampered = structuredClone(history); change(tampered);
    assert.throws(() => validateCalculationHistory(tampered));
  }
  for (const version of [null, 1, 3, "2"]) {
    const tampered = structuredClone(history);
    tampered[3].evaluation_version = version;
    assert.throws(() => validateCalculationHistory(tampered), undefined, `Unknown evaluation version: ${version}`);
  }
  const legacyHex = {
    id: id(5), submitted_at: submittedAt, values: ["0xC", "8", "5"],
    formula: FORMULA, accepted: true, result: 25,
  };
  assert.deepEqual(validateCalculationHistory([legacyHex]), [legacyHex], "Earlier Number coercion remains readable");
  const hexHistory = append([legacyHex], FORMULA, 6, legacyHex.values);
  assert.equal(hexHistory[1].evaluation_version, 2);
  assert.equal(hexHistory[1].accepted, false, "New submissions require decimal cell values");
  assert.equal(hexHistory[1].result, null);
  assert.deepEqual(hexHistory[0], legacyHex);
  const material = {
    id: "80000000-0000-4000-8000-000000000001", version: 1,
    payload: { section_id: "office.excel", content: { format: "bundle", bundle: exampleBundle("trade") } },
  };
  const state = initialAttempt(material);
  state.worksheet = { values: [...VALUES], formula: legacy[0].formula, applied: true, attempts: history };
  assert.deepEqual(validateAttempt(state, material), state, "Saved draft and history are not rewritten");
});

test("R2 old and corrected attempts survive offline reopen, retry, synchronization and backup restoration", async () => {
  const namespace = "r2-formula-history", f = await createSampleClient();
  const store = createAccountStore(memoryStorage(), namespace), db = memoryDatabase();
  store.switchAccount(f.state.userId);
  let online = false;
  let context = { userId: f.state.userId, ticket: store.ticket(), sections: f.state.sections, offline: true };
  const m = { ...f.state.items.get(f.state.ids.sum), owner_id: f.state.userId };
  const lesson = await lessonFromMaterial(context, m, "office.excel", EXCEL_PHASE_A_CAPABILITIES);
  const identity = await studyIdentity(m, lesson);
  const originalRPC = f.client.rpc.bind(f.client), cloud = new Map();
  let loseAcknowledgement = true;
  const writes = [];
  f.client.rpc = async (name, args) => {
    if (!["cp_sync_read", "cp_sync_write"].includes(name)) return originalRPC(name, args);
    assert.equal(args.expected_owner, f.state.userId);
    const key = args.record_kind + ":" + args.record;
    const row = cloud.get(key) ?? { revision: "0", value: null };
    if (name === "cp_sync_read") return { data: structuredClone(row) };
    writes.push(structuredClone(args));
    if (row.operation === args.operation) return { data: { ...structuredClone(row), status: "saved" } };
    if (row.revision !== args.expected_revision) return { data: { ...structuredClone(row), status: "conflict" } };
    const next = { revision: String(BigInt(row.revision) + 1n), operation: args.operation, value: structuredClone(args.new_value) };
    cloud.set(key, next);
    if (loseAcknowledgement) { loseAcknowledgement = false; throw Error("Synthetic lost acknowledgment"); }
    return { data: { ...structuredClone(next), status: "saved" } };
  };
  const sync = createSyncStore({ db, store, namespace, online: () => online });
  const records = await sync.open(context, m, identity, f.client);
  const legacy = {
    id: id(7), submitted_at: submittedAt, values: [...VALUES], formula: "=S U M(B 2:B4)",
    accepted: true, result: 25,
  };
  let state = { ...records.state, completed: true, worksheet: {
    values: [...VALUES], formula: legacy.formula, applied: true, attempts: [legacy],
  } };
  await records.saveProgress(state);
  await records.saveNote("Keep the shipment calculation note");
  await records.saveBookmark(true);
  await db.put("packs", "existing-pack", { phase: "ready", owner: f.state.userId });
  const existingPacks = await db.all("packs");

  const reopened = await sync.open(context, m, identity, f.client);
  assert.deepEqual(reopened.state, state);
  let history = append(reopened.state.worksheet.attempts, legacy.formula, 8);
  history = append(history, "=sum($B$2:$B$4)", 9);
  state = { ...state, worksheet: { ...state.worksheet, formula: history[2].formula, attempts: history } };
  await reopened.saveProgress(state);
  assert.deepEqual((await sync.open(context, m, identity, f.client)).state, state);
  assert.equal(writes.length, 0, "Offline edits remain local");

  online = true; context = { ...context, offline: false };
  await assert.rejects(() => sync.syncAll(context, f.client, new Set([m.id])), /lost acknowledgment/);
  await sync.syncAll(context, f.client, new Set([m.id]));
  assert.equal((await sync.summary(context)).pending, 0);
  const progressWrites = writes.filter((write) => write.record_kind === "progress");
  assert.equal(progressWrites.length, 2);
  assert.equal(progressWrites[0].operation, progressWrites[1].operation);
  assert.deepEqual(cloud.get("progress:" + identity).value.worksheet.attempts, history);
  assert.deepEqual(history[0], legacy);
  assert.deepEqual(history.map((entry) => entry.accepted), [true, false, true]);

  const backup = await sync.backup(context);
  const restoredDB = memoryDatabase(), restoredStore = createAccountStore(memoryStorage(), namespace);
  restoredStore.switchAccount(f.state.userId);
  const restoredContext = { ...context, ticket: restoredStore.ticket() };
  const restoredSync = createSyncStore({ db: restoredDB, store: restoredStore, namespace, online: () => true });
  assert.equal(await restoredSync.restore(restoredContext, backup, f.client), 3);
  assert.equal(await restoredSync.restore(restoredContext, backup, f.client), 0);
  const restored = await restoredSync.open({ ...restoredContext, offline: true }, m, identity, f.client);
  assert.deepEqual(restored.state, state);
  assert.equal(restored.note, "Keep the shipment calculation note");
  assert.equal(restored.bookmarked, true);
  assert.deepEqual(await db.all("packs"), existingPacks);
});
