import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { curriculum } from "../../Office_work/Excel_study/curriculum.mjs";
import {
  sumResult, practiceCriteria, appendCalculation, validateCalculationHistory,
  emptyToolState,
} from "../../Office_work/Excel_study/calculation-history.mjs";
import { EXCEL_PHASE_A_CAPABILITIES, prepareExcelExercise } from "../content/excel-contract.mjs";
import { progressIdentity } from "../content/contracts.mjs";
import { exampleBundle } from "../content/examples.mjs";
import { validateMaterial } from "../materials/contracts.mjs";
import { materialBytes } from "../offline/lease.mjs";
import { initialAttempt, validateAttempt, studyIdentity } from "../learn/progress.mjs";

// Load the personal adapters exactly as the real entry points do. A missing
// classic-script dependency must fail here as well as in the browser.
const directory = new URL("../../Office_work/Excel_study/", import.meta.url);
const read = (name) => readFileSync(new URL(name, directory), "utf8");
const personal = {}, loaded = new Set();
for (const page of ["Section_1_Study.html", "Section_2_Study.html"]) {
  for (const [, path] of read(page).matchAll(/<script src="([^"/]+\.js)"><\/script>/g)) {
    if (loaded.has(path) || path === "excel-formula-page.js") continue;
    new Function("window", read(path))(personal);
    loaded.add(path);
  }
}
const F1 = personal.CommonplaceExcelFormulaFoundations;
const scenarios = personal.CommonplaceExcelScenarios;
const assessments = personal.CommonplaceExcelAssessment;
const PERSONAL = { id: "personal-formulas", version: 1 };
const ASSIGNED = { id: "assigned-sum", version: 1 };
const FORMULA_RUBRIC = { id: "formula-foundations", version: 1 };
const WORKSHEET_RUBRIC = { id: "worksheet-criteria", version: 1 };
const ASSIGNED_RUBRIC = { id: "assigned-practice", version: 1 };
const SUM = "excel.sum.b2-b4.v1", FORMULA = "=SUM(B2:B4)";
const VALUES = ["12", "8", "5"];

test("R3 resolves exact versioned lessons and capabilities without a default or latest fallback", () => {
  // Catalog additions must not silently widen the already released F1 runtime.
  const lessons = curriculum.listLessons(PERSONAL);
  assert.deepEqual(lessons.map((lesson) => lesson.id), ["sum", "average", "count", "min", "max"]);
  const personalRefs = lessons.map(({ id, version }) => ({ id, version }));
  assert.deepEqual(curriculum.resolveRuntime(PERSONAL).lessons, personalRefs);
  assert.deepEqual(curriculum.resolveRuntime(ASSIGNED).lessons, [{ id: "sum", version: 1 }]);
  assert.deepEqual(curriculum.listLessons(PERSONAL), lessons);
  assert.deepEqual(curriculum.listLessons(ASSIGNED).map(({ id, version }) => ({ id, version })),
    [{ id: "sum", version: 1 }]);
  for (const ref of [null, "personal-formulas", { id: "personal-formulas" },
    { ...PERSONAL, version: 2 }, { id: "missing", version: 1 }])
    assert.throws(() => curriculum.listLessons(ref));
  for (const lesson of lessons) {
    const resolved = curriculum.resolveLesson({ id: lesson.id, version: 1 });
    assert.equal(resolved.version, 1);
    assert.deepEqual(resolved.runtime, PERSONAL);
    assert.deepEqual(resolved.rubric, FORMULA_RUBRIC);
    assert.ok(resolved.worksheet);
    assert.ok(curriculum.resolveCapability(resolved.capability_id));
    assert.deepEqual(F1.list().find((entry) => entry.id === lesson.id), resolved);
  }
  for (const resolve of [
    (ref) => curriculum.resolveLesson(ref),
    (ref) => curriculum.resolveRuntime(ref),
    (ref) => curriculum.resolveRubric(ref),
  ]) {
    for (const ref of [undefined, null, {}, "sum", { id: "sum" }, { id: "sum", version: 0 },
      { id: "sum", version: "1" }, { id: "missing", version: 1 }]) assert.throws(() => resolve(ref));
  }
  for (const version of [2, -1, null, "1"]) {
    assert.throws(() => curriculum.resolveLesson({ id: "sum", version }));
    assert.throws(() => curriculum.resolveRuntime({ ...PERSONAL, version }));
    assert.throws(() => curriculum.resolveRubric({ ...FORMULA_RUBRIC, version }));
  }
  assert.throws(() => curriculum.resolveRuntime({ ...PERSONAL, input_policy: "required-numbers" }));
  assert.throws(() => curriculum.resolveLesson({ id: "sum", version: 1, capability_id: "excel.max.b2-b4.v1" }));
  for (const capability of [undefined, null, "", "excel.sum.b2-b4", "excel.sum.b2-b4.v2", "excel.run-script.v1"])
    assert.throws(() => curriculum.resolveCapability(capability));
});

test("R3 metadata cannot change the catalog, runtime policy or future resolutions", () => {
  const before = curriculum.resolveLesson({ id: "sum", version: 1 });
  const expected = structuredClone(before);
  // Both immutable definitions and detached returns satisfy the public contract.
  try { before.fn = "MAX"; } catch {}
  try { before.runtime.version = 99; } catch {}
  try { before.worksheet.outputCell = "Z99"; } catch {}
  assert.deepEqual(curriculum.resolveLesson({ id: "sum", version: 1 }), expected);
  const runtime = curriculum.resolveRuntime(ASSIGNED), snapshot = structuredClone(runtime);
  try { runtime.input_policy = "numbers-or-blanks"; } catch {}
  try { runtime.capabilities.push("excel.average.b2-b4.v1"); } catch {}
  try { runtime.lessons[0].version = 99; } catch {}
  assert.deepEqual(curriculum.resolveRuntime(ASSIGNED), snapshot);
  const list = curriculum.listLessons(), catalogSize = list.length;
  try { list.pop(); } catch {}
  assert.equal(curriculum.listLessons().length, catalogSize);
  assert.equal(curriculum.listLessons(PERSONAL).length, 5);
});

test("R3 runtime capabilities preserve the assigned required-number policy and personal blank semantics", () => {
  const personalRuntime = curriculum.resolveRuntime(PERSONAL);
  const assignedRuntime = curriculum.resolveRuntime(ASSIGNED);
  assert.equal(personalRuntime.input_policy, "numbers-or-blanks");
  assert.equal(assignedRuntime.input_policy, "required-numbers");
  assert.ok(assignedRuntime.capabilities.includes(SUM));
  assert.ok(!assignedRuntime.capabilities.includes("excel.average.b2-b4.v1"));
  assert.equal(curriculum.evaluateFormula(PERSONAL, FORMULA, ["12", "", "5"]).result, 17);
  assert.throws(() => curriculum.evaluateFormula(ASSIGNED, FORMULA, ["12", "", "5"]));
  assert.throws(() => sumResult(["12", "", "5"], FORMULA));
  assert.deepEqual(curriculum.evaluateFormula(PERSONAL, "=AVERAGE(B2:B4)", ["", "", ""]),
    { fn: "AVERAGE", result: null, error: "#DIV/0!" });
  assert.throws(() => curriculum.evaluateFormula(ASSIGNED, "=AVERAGE(B2:B4)", VALUES));
  assert.throws(() => curriculum.evaluateFormula({ ...PERSONAL, version: 2 }, FORMULA, VALUES));
  assert.throws(() => curriculum.gradeFormula({ ...FORMULA_RUBRIC, version: 2 }, {}, FORMULA, VALUES));
});

test("R3 personal F1 adapters use the shared versioned evaluation and rubric across all contexts", () => {
  for (const scenario of scenarios.list()) {
    for (const lesson of F1.list()) {
      for (const mode of ["guided", "independent"]) {
        const exercise = F1.exercise(lesson.id, scenario.id, scenario.version, mode);
        for (const formula of [exercise.formula, ` =${lesson.fn.toLowerCase()}( $B$4 : B2 ) `,
          "=SUM(B2:B4)", "=COUNT(B2:B4)"]) {
          assert.deepEqual(F1.evaluate(formula, exercise.values), curriculum.evaluateFormula(PERSONAL, formula, exercise.values));
          assert.deepEqual(F1.grade(exercise, formula, exercise.values),
            curriculum.gradeFormula(FORMULA_RUBRIC, exercise, formula, exercise.values));
        }
        const invalid = `=${lesson.fn[0]} ${lesson.fn.slice(1)}(B2:B4)`;
        assert.throws(() => F1.evaluate(invalid, exercise.values));
        assert.deepEqual(F1.grade(exercise, invalid, exercise.values),
          curriculum.gradeFormula(FORMULA_RUBRIC, exercise, invalid, exercise.values));
        if (mode === "independent")
          assert.deepEqual(F1.grade(exercise, invalid, exercise.values).criteria.map((criterion) => criterion.passed),
            [false, false, true]);
      }
    }
  }
});

test("R3 grading pins the requested function to the exact lesson revision and rejects mismatched rubrics", () => {
  const exercise = F1.exercise("count", "jp-ph-trade", 1, "independent");
  const modified = structuredClone(exercise);
  modified.formula = "=SUM(B2:B4)";
  modified.lesson.fn = "SUM";
  modified.lesson.capability_id = SUM;
  const grade = curriculum.gradeFormula(FORMULA_RUBRIC, modified, FORMULA, exercise.values);
  assert.deepEqual(grade.criteria.map((criterion) => criterion.passed), [false, true, true]);
  modified.lesson.version = 2;
  assert.throws(() => curriculum.gradeFormula(FORMULA_RUBRIC, modified, FORMULA, exercise.values));
  assert.throws(() => curriculum.gradeFormula(ASSIGNED_RUBRIC, exercise, exercise.formula, exercise.values));
  assert.throws(() => curriculum.checkCriterion(FORMULA_RUBRIC, { property: "formula", expected: FORMULA }, { formula: FORMULA }));
  assert.throws(() => curriculum.gradeAssigned(FORMULA_RUBRIC, "guided-sum-v1",
    exampleBundle("trade").dataset.rows, VALUES, FORMULA));
});

test("R3 assigned and standalone worksheet adapters share grading without changing their rubric shapes", () => {
  for (const context of ["trade", "mechanical", "finance"]) {
    const bundle = exampleBundle(context), prepared = prepareExcelExercise(bundle);
    assert.deepEqual(prepared.curriculumRef, { id: "sum", version: 1 });
    assert.deepEqual(prepared.runtimeRef, ASSIGNED);
    const rows = prepared.worksheet.rows, values = rows.map((row) => String(row[1]));
    assert.equal(sumResult(values, FORMULA), curriculum.evaluateFormula(ASSIGNED, FORMULA, values).result);
    for (const activity of ["guided-sum-v1", "independent-match-v1", "independent-format-v1", "independent-copy-v1"]) {
      const current = [...values];
      if (["independent-match-v1", "independent-copy-v1"].includes(activity)) current[1] = current[0];
      const tools = { ...emptyToolState(), bold: true, fill: true, border: true, copy_used: true };
      for (const formula of [FORMULA, "=S UM(B2:B4)"]) {
        assert.deepEqual(practiceCriteria(activity, rows, current, formula, tools),
          curriculum.gradeAssigned(ASSIGNED_RUBRIC, activity, rows, current, formula, tools));
      }
    }
  }
  for (const scenario of scenarios.list()) {
    const lessons = scenarios.assessments(scenario, personal.CommonplaceExcelAssessments);
    const values = [scenario.values[0], scenario.revised, scenario.values[2]];
    const state = { formula: FORMULA, cells: {
      A1: { value: scenario.heading, bold: true, fill: false, border: true },
      ...Object.fromEntries(values.map((value, i) => [`B${i + 2}`, { value: String(value) }])),
      B5: { value: String(values.reduce((sum, value) => sum + value, 0)) },
    } };
    for (const lesson of lessons) {
      const graded = assessments.grade(lesson, state);
      lesson.criteria.forEach((criterion, i) => {
        const shared = curriculum.checkCriterion(WORKSHEET_RUBRIC, criterion, state);
        assert.equal(graded.results[i].passed, shared.passed);
        assert.deepEqual(graded.results[i].response, shared.response);
      });
    }
  }
  assert.throws(() => curriculum.gradeAssigned({ ...ASSIGNED_RUBRIC, version: 2 }, "guided-sum-v1", [], VALUES, FORMULA));
  assert.throws(() => curriculum.checkCriterion({ ...WORKSHEET_RUBRIC, version: 2 }, {}, {}));
});

function savedMaterial() {
  return { id: "20000000-0000-4000-8000-000000000001", owner_id: "10000000-0000-4000-8000-000000000002",
    publication_state: "published", version: 1,
    payload: { schema_version: 1, section_id: "office.excel", title: "Prepare a shipment to Manila",
      material_type: "guided_exercise", content: { format: "bundle", bundle: exampleBundle("trade") } } };
}

test("R3 legacy SUM material bytes and progress identity stay stable when curriculum metadata is resolved", async () => {
  const material = savedMaterial(), original = structuredClone(material);
  const bytes = materialBytes(material, material.owner_id, "office.excel");
  // Canonical bytes of this pre-R3 published fixture; runtime metadata belongs
  // to the application and must not leak into old signed material payloads.
  assert.equal(Buffer.byteLength(bytes), 1754);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "f4f61a9f2f9d1fa8d41e53d4c57a30f023dec7e466d99972892b8157f558cbb8");
  const bundle = material.payload.content.bundle;
  const assignment = { schema_version: 1, kind: "assignment", id: "assignment.sample", version: 1,
    section_id: "office.excel", lesson_ref: { id: bundle.lesson.id, version: 1 }, status: "assigned" };
  const expectedIdentity = '["cp-content-v1","office.excel","assignment.sample",1,"excel.sum.trade",1,"excel.sum",1,"scenario.trade",1,"dataset.trade",1,"sum"]';
  assert.equal(await progressIdentity(assignment, bundle, "sum"), expectedIdentity);
  assert.equal(await studyIdentity(material, { assignment, bundle }), expectedIdentity);
  prepareExcelExercise(bundle);
  curriculum.resolveCapability(SUM);
  curriculum.resolveRuntime(ASSIGNED);
  assert.deepEqual(material, original);
  assert.equal(materialBytes(material, material.owner_id, "office.excel"), bytes);
  assert.deepEqual(validateMaterial(material.payload), material.payload);
  assert.deepEqual(EXCEL_PHASE_A_CAPABILITIES, ["explanation.text.v1", SUM]);
});

test("R3 unsupported or future central capabilities fail without mutating saved material", () => {
  for (const capability of ["excel.average.b2-b4.v1", "excel.sum.b2-b4.v2", "excel.run-script.v1"]) {
    const material = savedMaterial();
    material.payload.content.bundle.lesson.required_capabilities = ["explanation.text.v1", capability];
    const original = structuredClone(material);
    assert.throws(() => prepareExcelExercise(material.payload.content.bundle));
    assert.throws(() => validateMaterial(material.payload));
    assert.throws(() => materialBytes(material, material.owner_id, "office.excel"));
    assert.deepEqual(material, original);
  }
});

test("R3 shared current grading preserves unversioned and R2 evaluations in saved worksheets", () => {
  const material = savedMaterial(), state = initialAttempt(material);
  const legacy = { id: "30000000-0000-4000-8000-000000000001", submitted_at: "2026-11-26T14:00:00.000Z",
    values: [...VALUES], formula: "=S U M(B 2:B4)", accepted: true, result: 25, activity: "guided-sum-v1" };
  const history = appendCalculation([legacy], VALUES, "=sum($B$2:$B$4)", {
    id: "30000000-0000-4000-8000-000000000002", submittedAt: "2026-11-26T14:01:00.000Z", activity: "guided-sum-v1",
  });
  assert.equal(history[1].evaluation_version, 2);
  assert.equal(history[1].accepted, true);
  state.worksheet = { values: [...VALUES], formula: legacy.formula, applied: true, attempts: history };
  const original = structuredClone(state);
  assert.deepEqual(validateCalculationHistory(history), history);
  assert.deepEqual(validateAttempt(state, material), original);
  const grade = curriculum.gradeAssigned(ASSIGNED_RUBRIC, "guided-sum-v1",
    material.payload.content.bundle.dataset.rows, legacy.values, legacy.formula);
  assert.equal(grade.score, 3);
  assert.deepEqual(state, original);
  assert.deepEqual(history[0], legacy);
  assert.ok(!Object.hasOwn(history[0], "evaluation_version"));
});
