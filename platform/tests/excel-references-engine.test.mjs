import { test } from "node:test";
import assert from "node:assert/strict";
import { curriculum as C } from "../../Office_work/Excel_study/curriculum.mjs";

const RUNTIME = { id: "personal-references", version: 1 };
const RUBRIC = { id: "reference-foundations", version: 1 };
const OLD_PERSONAL = { id: "personal-formulas", version: 1 };
const OLD_ASSIGNED = { id: "assigned-sum", version: 1 };
const lesson = id => C.resolveLesson({ id, version: 1 });
const cases = [
  { id: "relative-line-totals", values: { B3: "12", C3: "300", B4: "8", C4: "500", B5: "5", C5: "800" },
    formulas: { D3: "=B3*C3", D4: "=B4*C4", D5: "=B5*C5" },
    results: { D3: 3600, D4: 4000, D5: 4000 } },
  { id: "absolute-rate", values: { B3: "3600", B4: "4000", B5: "4250", F2: "0.38" },
    formulas: { C3: "=B3*$F$2", C4: "=B4*$F$2", C5: "=B5*$F$2" },
    results: { C3: 1368, C4: 1520, C5: 1615 } },
  { id: "mixed-quotation", values: { B3: "300", B4: "500", C2: "2", D2: "5" },
    formulas: { C3: "=$B3*C$2", D3: "=$B3*D$2", C4: "=$B4*C$2", D4: "=$B4*D$2" },
    results: { C3: 600, D3: 1500, C4: 1000, D4: 2500 } },
  { id: "relative-unit-cost", values: { B3: "3600", C3: "12", B4: "4200", C4: "8", B5: "4250", C5: "5" },
    formulas: { D3: "=B3/C3", D4: "=B4/C4", D5: "=B5/C5" },
    results: { D3: 300, D4: 525, D5: 850 } },
];
const exercise = (fixture, mode = "independent") => ({ lesson: lesson(fixture.id), mode, values: { ...fixture.values } });
const flags = grade => Object.fromEntries(grade.criteria.map(({ id, passed }) => [id, passed]));

test("F2 has exact versioned lessons, runtime and criterion IDs without expanding released F1 or central capabilities", () => {
  assert.deepEqual(C.listLessons(RUNTIME).map(({ id }) => id), cases.map(({ id }) => id));
  assert.deepEqual(C.resolveRuntime(RUNTIME).lessons, cases.map(({ id }) => ({ id, version: 1 })));
  assert.deepEqual(C.listLessons(OLD_PERSONAL).map(({ id }) => id), ["sum", "average", "count", "min", "max"]);
  assert.deepEqual(C.resolveRuntime(OLD_ASSIGNED).capabilities, ["explanation.text.v1", "excel.sum.b2-b4.v1"]);
  for (const fixture of cases) {
    const current = lesson(fixture.id);
    assert.deepEqual(current.runtime, RUNTIME);
    assert.deepEqual(current.rubric, RUBRIC);
    assert.equal(current.worksheet.formula, fixture.formulas[current.worksheet.sourceCell]);
    assert.deepEqual(current.worksheet.inputCells.slice().sort(), Object.keys(fixture.values).sort());
    assert.equal(C.resolveCapability(current.capability_id).engine, "bounded-reference-arithmetic.v1");
    assert.ok(!Object.hasOwn(C.resolveCapability(current.capability_id), "activity_type"));
    assert.ok(Object.isFrozen(current.worksheet.targetCells));
    const listed = C.listLessons(RUNTIME);
    listed[0].worksheet.targetCells.push("F12");
    assert.ok(!C.listLessons(RUNTIME)[0].worksheet.targetCells.includes("F12"));
  }
  for (const runtime of [OLD_PERSONAL, OLD_ASSIGNED, { ...RUNTIME, version: 2 }, { id: "personal-references" }]) {
    assert.throws(() => C.parseReferenceFormula(runtime, "=B3*C3"));
    assert.throws(() => C.copyReferenceFormula(runtime, "=B3*C3", "D3", "D4"));
    assert.throws(() => C.evaluateReferenceFormula(runtime, "=B3*C3", cases[0].values));
  }
  assert.throws(() => C.evaluateFormula(RUNTIME, "=SUM(B2:B4)", ["1", "2", "3"]));
  assert.throws(() => C.gradeReferences({ ...RUBRIC, version: 2 }, exercise(cases[0]), cases[0].formulas, cases[0].values));
  assert.throws(() => C.gradeReferences({ id: "formula-foundations", version: 1 }, exercise(cases[0]), {}, {}));
  assert.throws(() => C.gradeReferences(RUBRIC, { ...exercise(cases[0]), lesson: { id: "sum", version: 1 } }, {}, {}));
});

test("F2 parses supported Excel reference tokens without deleting meaningful locks or internal whitespace", () => {
  const parsed = C.parseReferenceFormula(RUNTIME, " \r\n= b3 * $f$2\r\n ");
  assert.equal(parsed.canonical, "=B3*$F$2");
  assert.deepEqual(parsed.left, { column: 2, row: 3, columnAbsolute: false, rowAbsolute: false, address: "B3", token: "B3" });
  assert.deepEqual(parsed.right, { column: 6, row: 2, columnAbsolute: true, rowAbsolute: true, address: "F2", token: "$F$2" });
  for (const formula of ["=B3*C3", "=$B3*C$2", "=$B$3/$C$3", "=F12*A1", "=B10/C11"])
    assert.ok(C.parseReferenceFormula(RUNTIME, formula), formula);
  for (const formula of [null, 7, "", "B3*C3", "=B 3*C3", "=$ B3*C3", "=B$ 3*C3", "=B3*C 3",
    "=B3\t*C3", "=B3*\nC3", "=B3*\u00a0C3", "=B3*C3\n", "=B3*C3\r", "=B3*C3\t", "=B3*C3\u00a0",
    "=B3+C3", "=B3-C3", "=B3^C3", "=B3*C3*D3", "=B3*(C3)", "=SUM(B3:C3)", "=B3*2",
    "=Sheet1!B3*C3", "=[Book]B3*C3", "=G3*C3", "=B13*C3", "=B0*C3", "=B03*C3", "=B3 C3*D3", "=B3:C3*D3",
    "=" + " ".repeat(80) + "B3*C3"])
    assert.equal(C.parseReferenceFormula(RUNTIME, formula), null, String(formula));
});

test("F2 copies relative, absolute and both mixed locks across rows and columns, including reverse directions", () => {
  for (const [formula, from, to, expected] of [
    ["=B3*C3", "D3", "D5", "=B5*C5"],
    ["=B3*$F$2", "C3", "C5", "=B5*$F$2"],
    ["=$B3*C$2", "C3", "D3", "=$B3*D$2"],
    ["=$B3*C$2", "C3", "C4", "=$B4*C$2"],
    ["=$B3*C$2", "C3", "D4", "=$B4*D$2"],
    ["=$B4*D$2", "D4", "C3", "=$B3*C$2"],
    ["=B10/C$12", "D10", "D12", "=B12/C$12"],
    ["=$F$12*$A$1", "B2", "F12", "=$F$12*$A$1"],
    [" = b3 / c3 ", "d3", "d4", "=B4/C4"],
  ]) assert.equal(C.copyReferenceFormula(RUNTIME, formula, from, to), expected);
  for (const [formula, from, to] of [
    ["=A1*B1", "B2", "A1"], ["=F12*B3", "D3", "D4"], ["=F2*B3", "D3", "E3"],
    ["=B3*C3", "G3", "D4"], ["=B3*C3", "D3", "D13"], ["=B 3*C3", "D3", "D4"],
    ["=B3*C3", "D3\n", "D4"], ["=B3*C3", "D3", "$D$4"],
  ]) assert.throws(() => C.copyReferenceFormula(RUNTIME, formula, from, to));
});

test("F2 evaluates arithmetic with explicit blank, text, zero-divisor, precision and unsupported formula-cell behavior", () => {
  assert.deepEqual(C.evaluateReferenceFormula(RUNTIME, "=B3*C3", { B3: "3", C3: "0.1" }), { result: 0.3, error: null });
  assert.deepEqual(C.evaluateReferenceFormula(RUNTIME, "=B3/C3", { B3: "1", C3: "3" }), { result: 0.333333333333333, error: null });
  assert.deepEqual(C.evaluateReferenceFormula(RUNTIME, "=B3*C3", { B3: "-2.5e2", C3: "+.4" }), { result: -100, error: null });
  for (const cells of [{ B3: "7", C3: "" }, { B3: "7" }]) {
    assert.deepEqual(C.evaluateReferenceFormula(RUNTIME, "=B3*C3", cells), { result: 0, error: null });
    assert.deepEqual(C.evaluateReferenceFormula(RUNTIME, "=B3/C3", cells), { result: null, error: "#DIV/0!" });
  }
  assert.deepEqual(C.evaluateReferenceFormula(RUNTIME, "=B3/C3", { B3: "", C3: "7" }), { result: 0, error: null });
  assert.deepEqual(C.evaluateReferenceFormula(RUNTIME, "=B3/C3", { B3: "7", C3: "-0" }), { result: null, error: "#DIV/0!" });
  for (const value of ["Product", "0x10", "Infinity", "NaN", "1e13", "1".repeat(41), null, true, 7])
    assert.deepEqual(C.evaluateReferenceFormula(RUNTIME, "=B3*C3", { B3: value, C3: "2" }), { result: null, error: "#VALUE!" });
  assert.deepEqual(C.evaluateReferenceFormula(RUNTIME, "=B3/C3", { B3: "1e12", C3: "1e-309" }), { result: null, error: "#NUM!" });
  assert.throws(() => C.evaluateReferenceFormula(RUNTIME, "=B3*C3", []));
  assert.throws(() => C.evaluateReferenceFormula(RUNTIME, "=B3*C3", { B3: "=D3", C3: "2" }), /formula cells/);
  assert.throws(() => C.evaluateReferenceFormula(RUNTIME, "=B3+C3", { B3: "1", C3: "2" }), /two cell references/);
});

test("F2 expected copies and numeric outcomes are correct for all four independent lesson rubrics", () => {
  for (const fixture of cases) {
    const ex = exercise(fixture), before = structuredClone(ex);
    const graded = C.gradeReferences(RUBRIC, ex, fixture.formulas, fixture.values);
    assert.ok(graded.passed, fixture.id);
    assert.equal(graded.maxScore, Object.keys(fixture.formulas).length * 2 + 1);
    assert.equal(new Set(graded.criteria.map(({ id }) => id)).size, graded.criteria.length);
    for (const [cell, value] of Object.entries(fixture.results)) {
      assert.deepEqual(graded.evaluated[cell], { result: value, error: null });
      assert.equal(C.copyReferenceFormula(RUNTIME, ex.lesson.worksheet.formula,
        ex.lesson.worksheet.sourceCell, cell), fixture.formulas[cell]);
    }
    assert.deepEqual(ex, before);
    const guided = C.gradeReferences(RUBRIC, exercise(fixture, "guided"), fixture.formulas, fixture.values);
    assert.equal(guided.maxScore, graded.maxScore - 1);
    assert.ok(!guided.criteria.some(({ id }) => id === "original-inputs"));
  }
});

test("F2 grading preserves independent formula, calculation and input credit when another criterion fails", () => {
  const fixture = cases[0], ex = exercise(fixture);
  let graded = C.gradeReferences(RUBRIC, ex, { ...fixture.formulas, D3: "=B 3*C3" }, fixture.values);
  assert.equal(graded.score, 5);
  assert.equal(flags(graded)["reference-pattern:D3"], false);
  assert.equal(flags(graded)["valid-calculation:D3"], false);
  assert.equal(flags(graded)["original-inputs"], true);
  assert.equal(flags(graded)["valid-calculation:D4"], true);
  graded = C.gradeReferences(RUBRIC, ex, fixture.formulas, { ...fixture.values, B3: "wrong" });
  assert.equal(flags(graded)["reference-pattern:D3"], true);
  assert.equal(flags(graded)["valid-calculation:D3"], false);
  assert.equal(flags(graded)["valid-calculation:D4"], true);
  assert.equal(flags(graded)["original-inputs"], false);
  graded = C.gradeReferences(RUBRIC, ex, fixture.formulas, { ...fixture.values, B3: "0" });
  assert.equal(flags(graded)["valid-calculation:D3"], true);
  assert.equal(flags(graded)["original-inputs"], false);
  const division = cases[3];
  graded = C.gradeReferences(RUBRIC, exercise(division), division.formulas, { ...division.values, C3: "0" });
  assert.equal(flags(graded)["reference-pattern:D3"], true);
  assert.equal(flags(graded)["valid-calculation:D3"], false);
  assert.equal(flags(graded)["valid-calculation:D4"], true);
  assert.equal(graded.evaluated.D3.error, "#DIV/0!");
  assert.equal(C.gradeReferences(RUBRIC, ex, null, fixture.values).score, 1);
});

test("F2 accepts reversed multiplication operands but checks exact reference locks and division order", () => {
  for (const fixture of cases.slice(0, 3)) {
    const reversed = Object.fromEntries(Object.entries(fixture.formulas).map(([cell, formula]) => {
      const [left, right] = formula.slice(1).split("*");
      return [cell, ` = ${right.toLowerCase()} * ${left.toLowerCase()} `];
    }));
    assert.ok(C.gradeReferences(RUBRIC, exercise(fixture), reversed, fixture.values).passed, fixture.id);
  }
  const mixed = cases[2];
  const wrongLocks = { ...mixed.formulas, C3: "=B3*C2" };
  const wrongGrade = C.gradeReferences(RUBRIC, exercise(mixed), wrongLocks, mixed.values);
  assert.equal(flags(wrongGrade)["reference-pattern:C3"], false);
  assert.equal(flags(wrongGrade)["valid-calculation:C3"], true);
  assert.equal(flags(wrongGrade)["original-inputs"], true);
  const division = cases[3];
  const reversedDivision = C.gradeReferences(RUBRIC, exercise(division), { ...division.formulas, D3: "=C3/B3" }, division.values);
  assert.equal(flags(reversedDivision)["reference-pattern:D3"], false);
  assert.equal(flags(reversedDivision)["valid-calculation:D3"], true);
});

test("F2 grading pins the lesson and rejects circular/chained output references instead of reading blank cached answers", () => {
  const fixture = cases[0], ex = structuredClone(exercise(fixture));
  ex.formula = "=B3/C3";
  ex.lesson.worksheet.formula = "=B3/C3";
  assert.equal(flags(C.gradeReferences(RUBRIC, ex, { ...fixture.formulas, D3: "=B3/C3" }, fixture.values))["reference-pattern:D3"], false);
  for (const formula of ["=D3*B3", "=D4*B3"]) {
    const graded = C.gradeReferences(RUBRIC, exercise(fixture), { ...fixture.formulas, D3: formula },
      { ...fixture.values, D3: "", D4: "" });
    assert.equal(flags(graded)["valid-calculation:D3"], false);
    assert.match(graded.evaluated.D3.error, /formula cells/);
    assert.equal(flags(graded)["valid-calculation:D4"], true);
  }
  ex.lesson.version = 2;
  assert.throws(() => C.gradeReferences(RUBRIC, ex, fixture.formulas, fixture.values));
  assert.throws(() => C.gradeReferences(RUBRIC, { ...exercise(fixture), values: { B3: "12" } }, {}, {}));
  assert.throws(() => C.gradeReferences(RUBRIC, { ...exercise(fixture), mode: "unknown" }, {}, {}));
});
