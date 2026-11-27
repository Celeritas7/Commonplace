import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { curriculum } from "../../Office_work/Excel_study/curriculum.mjs";

const w = {};
for (const name of ["formula-syntax.js","excel-curriculum.js","excel-scenarios.js","excel-decision-foundations.js"])
  new Function("window", readFileSync(new URL("../../Office_work/Excel_study/" + name, import.meta.url), "utf8"))(w);
const adapter = w.CommonplaceExcelDecisionFoundations;
const runtime = { id: "personal-decisions", version: 1 };
const rubric = { id: "decision-foundations", version: 1 };
const correct = Object.fromEntries([2,3,4].map(row => ["D" + row, '=IF(B' + row + '>=C' + row + ',"Ready","Review")']));
test("F4A pins IF references without widening the released runtimes", () => {
  const [lesson] = curriculum.listLessons(runtime);
  assert.equal(lesson.id, "if-minimum-target");
  assert.deepEqual(lesson.rubric, rubric);
  assert.equal(curriculum.resolveCapability(lesson.capability_id).engine, "bounded-if.v1");
  assert.equal(curriculum.listLessons({ id: "assigned-sum", version: 1 }).length, 1);
  assert.equal(curriculum.listLessons({ id: "personal-tables", version: 2 }).length, 5);
  assert.throws(() => curriculum.evaluateDecisionFormula({ id: "personal-decisions", version: 2 }, correct.D2, {}));
  assert.throws(() => curriculum.evaluateDecisionFormula({ id: "assigned-sum", version: 1 }, correct.D2, {}));
});
test("F4A all five contexts have separate guided and independent datasets, including equality", () => {
  const ids = new Set();
  for (const s of w.CommonplaceExcelScenarios.list()) for (const mode of ["guided","independent"]) {
    const ex = adapter.exercise(s.id, s.version, mode);
    ids.add(ex.dataset.id);
    const grade = adapter.grade(ex, correct, ex.values);
    assert.equal(grade.maxScore, mode === "guided" ? 6 : 7);
    assert.equal(grade.passed, true);
    assert.deepEqual(Object.values(grade.evaluated).map(x => x.result),
      mode === "guided" ? ["Ready","Review","Ready"] : ["Review","Ready","Ready"]);
    assert.deepEqual(grade, curriculum.gradeDecision(rubric, ex, correct, ex.values));
    assert.equal(adapter.grade(ex, { ...correct, D4: '=IF(B4>C4,"Ready","Review")' }, ex.values).score, grade.maxScore - 2);
    assert.equal(adapter.grade(ex, { ...correct, D2: '=IF(B2>=C2,"Ready","No")' }, ex.values).score, grade.maxScore - 1);
    if (mode === "independent") assert.equal(adapter.grade(ex, correct, { ...ex.values, B2: "0" }).score, 6);
  }
  assert.equal(ids.size, 10);
  assert.throws(() => adapter.exercise("unknown", 1, "guided"));
  assert.throws(() => adapter.exercise("jp-ph-trade", 2, "guided"));
});
test("F4A bounded IF parser rejects split tokens, unsupported expressions and missing or invalid cells", () => {
  const cells = { B2: "5", C2: "5" };
  assert.deepEqual(adapter.evaluate(' = if( $c$2 <= B2 , "Ready" , "Review" ) ', cells), { condition: true, result: "Ready" });
  for (const f of ['=I F(B2>=C2,"Ready","Review")','=IF(B 2>=C2,"Ready","Review")',
    '=IF(B2>=C2,1,0)','=IF(B2>=D2,"Ready","Review")','=IF(B2>=C2,"Ready","Review")\n',
    '=IF(B2>=C2,"Ready","Review")+1','=IF(B2>=C2,"Ready","Review")\t',
    '=IF(B2>=C2,"Ready","Review")=1']) assert.throws(() => adapter.evaluate(f, cells));
  for (const value of ["", "NaN", "1e13", "0x10", "text"])
    assert.throws(() => adapter.evaluate(correct.D2, { B2: value, C2: "5" }));
  assert.throws(() => adapter.evaluate(correct.D2, { B2: "5" }));
});
test("F4A criteria are independent and recorded data is not mutated", () => {
  const ex = adapter.exercise("jp-ph-trade", 1, "independent");
  const original = structuredClone(ex);
  const formulas = { ...correct, D2: '=IF(B2>=C2,"Review","Ready")', D3: "broken" };
  const graded = adapter.grade(ex, formulas, ex.values);
  assert.deepEqual(graded.criteria.map(c => c.passed), [true,false,false,false,true,true,true]);
  assert.deepEqual(ex, original);
  assert.equal(graded.evaluated.D3.result, null);
  const altered = structuredClone(ex);
  altered.lesson.worksheet.formula = '=IF(B2<C2,"Review","Ready")';
  assert.equal(adapter.grade(altered, correct, ex.values).passed, true);
  assert.throws(() => curriculum.gradeDecision({ id: "table-foundations", version: 2 }, ex, correct, ex.values));
});
