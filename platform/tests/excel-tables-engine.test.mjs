import { test } from "node:test";
import assert from "node:assert/strict";
import { curriculum as C } from "../../Office_work/Excel_study/curriculum.mjs";

const RUNTIME = { id: "personal-tables", version: 1 };
const RUBRIC = { id: "table-foundations", version: 1 };
const IDS = ["number-formats", "create-table", "sort-records", "filter-records", "validate-entry"];
const rows = () => [
  { id: "SKU-A", item: "Used chairs", status: "Ready", quantity: 10, unitPrice: 1500.75, discount: 0.025, shipDate: 46359 },
  { id: "SKU-B", item: "Used fans", status: "Reserved", quantity: 2, unitPrice: 200, discount: 0.1, shipDate: 46357 },
  { id: "SKU-C", item: "Used rice cookers", status: "Ready", quantity: 6, unitPrice: 2000, discount: 0.075, shipDate: 46362 },
  { id: "SKU-D", item: "Used desks", status: "Shipped", quantity: 2, unitPrice: 800, discount: 0, shipDate: 46358 },
  { id: "SKU-E", item: "Used shelves", status: "Ready", quantity: 3, unitPrice: 500, discount: 0.05, shipDate: 46361 },
  { id: "SKU-F", item: "Used stools", status: "Reserved", quantity: 12, unitPrice: 100, discount: 0.2, shipDate: 46360 },
];
const initial = (data = rows()) => C.createTableState(RUNTIME, data);
const apply = (state, action) => C.applyTableAction(RUNTIME, state, action);
const table = state => apply(state, { type: "create-table", name: "PracticeItems", range: "A1:G7", headers: true, banded: true });
const ex = (id, mode = "independent", currency = "JPY", data = rows()) => ({
  lesson: C.resolveLesson({ id, version: 1 }), mode, currency, rows: data,
});
const grade = (id, state, mode = "independent", currency = "JPY", data = rows()) =>
  C.gradeTables(RUBRIC, ex(id, mode, currency, data), state);
const flags = result => Object.fromEntries(result.criteria.map(({ id, passed }) => [id, passed]));
const viewIds = state => C.tableView(RUNTIME, state).map(row => row.id);
const formatted = (state, currency = "jpy") => {
  for (const [column, format] of Object.entries({ quantity: "integer", unitPrice: currency, discount: "percent", shipDate: "date" }))
    state = apply(state, { type: "set-format", column, format });
  return state;
};

test("F3 exact definitions are frozen and do not widen earlier curriculum runtimes", () => {
  assert.deepEqual(C.listLessons(RUNTIME).map(({ id }) => id), IDS);
  assert.deepEqual(C.resolveRuntime(RUNTIME).lessons, IDS.map(id => ({ id, version: 1 })));
  assert.deepEqual(C.listLessons({ id: "personal-formulas", version: 1 }).map(({ id }) => id), ["sum", "average", "count", "min", "max"]);
  assert.deepEqual(C.listLessons({ id: "personal-references", version: 1 }).map(({ id }) => id),
    ["relative-line-totals", "absolute-rate", "mixed-quotation", "relative-unit-cost"]);
  assert.deepEqual(C.resolveRuntime({ id: "assigned-sum", version: 1 }).capabilities,
    ["explanation.text.v1", "excel.sum.b2-b4.v1"]);
  for (const id of IDS) {
    const lesson = C.resolveLesson({ id, version: 1 });
    assert.deepEqual(lesson.runtime, RUNTIME);
    assert.deepEqual(lesson.rubric, RUBRIC);
    assert.deepEqual(lesson.worksheet.columns, ["id", "item", "status", "quantity", "unitPrice", "discount", "shipDate"]);
    assert.equal(C.resolveCapability(lesson.capability_id).engine, "bounded-business-table.v1");
    assert.ok(!Object.hasOwn(C.resolveCapability(lesson.capability_id), "activity_type"));
    assert.ok(Object.isFrozen(lesson.goal));
    assert.throws(() => C.resolveLesson({ id, version: 2 }));
  }
  const detached = C.listLessons(RUNTIME);
  detached[0].goal.formats.quantity = "php";
  detached[0].worksheet.columns.push("foreign");
  assert.equal(C.listLessons(RUNTIME)[0].goal.formats.quantity, "integer");
  assert.equal(C.listLessons(RUNTIME)[0].worksheet.columns.length, 7);
  for (const runtime of [{ id: "personal-formulas", version: 1 }, { id: "assigned-sum", version: 1 },
    { id: "personal-references", version: 1 }, { ...RUNTIME, version: 2 }, { id: RUNTIME.id }]) {
    assert.throws(() => C.createTableState(runtime, rows()));
    assert.throws(() => C.applyTableAction(runtime, initial(), { type: "clear-filter" }));
    assert.throws(() => C.tableView(runtime, initial()));
    assert.throws(() => C.inspectTableValidation(runtime, initial()));
    assert.throws(() => C.formatTableValue(runtime, "quantity", 6, "integer"));
  }
  assert.throws(() => C.evaluateFormula(RUNTIME, "=SUM(B2:B4)", ["1", "2", "3"]));
  assert.throws(() => C.parseReferenceFormula(RUNTIME, "=B3*C3"));
});

test("F3 typed initial state and returned views are detached and reject malformed record identities", () => {
  const data = rows(), before = structuredClone(data), state = initial(data);
  assert.deepEqual(data, before);
  state.rows[0].quantity = 99;
  assert.equal(data[0].quantity, 10);
  const view = C.tableView(RUNTIME, state);
  view[0].quantity = 77;
  assert.equal(state.rows[0].quantity, 99);
  for (const alter of [
    data => data.pop(), data => { data[1].id = data[0].id; },
    data => { data[0].quantity = "10"; }, data => { data[0].unitPrice = Infinity; },
    data => { data[0].discount = NaN; }, data => { data[0].shipDate = 60; },
    data => { data[0].shipDate = 46357.5; }, data => { data[0].shipDate = 2958466; },
    data => { data[0].other = true; }, data => { delete data[0].item; },
    data => { data[0].id = "constructor.toString()"; },
    data => { data[0].id = "SKU-A\n"; }, data => { data[0].id = "SKU-A\r\n"; },
    data => { data.extra = data[3]; delete data[3]; },
  ]) {
    const invalid = rows(); alter(invalid);
    const retained = structuredClone(invalid);
    assert.throws(() => initial(invalid));
    assert.deepEqual(invalid, retained);
  }
  const nullable = rows();
  for (const column of ["quantity", "unitPrice", "discount", "shipDate"]) nullable[0][column] = null;
  assert.deepEqual(initial(nullable).rows, nullable);
  const invalidOrder = initial(); invalidOrder.order[1] = invalidOrder.order[0];
  assert.throws(() => C.tableView(RUNTIME, invalidOrder));
  const sparseOrder = initial(); sparseOrder.order.extra = sparseOrder.order[3]; delete sparseOrder.order[3];
  assert.throws(() => C.tableView(RUNTIME, sparseOrder));
  const unknownVersion = initial(); unknownVersion.schema_version = 2;
  assert.throws(() => apply(unknownVersion, { type: "clear-filter" }));
});

test("F3 display formats preserve raw values, distinguish currencies and render numeric Excel dates", () => {
  const state = initial(), before = structuredClone(state), display = formatted(state);
  assert.deepEqual(state, before);
  assert.deepEqual(display.rows, state.rows);
  assert.equal(C.formatTableValue(RUNTIME, "unitPrice", 1500.75, "jpy"), "JPY 1,501");
  assert.equal(C.formatTableValue(RUNTIME, "unitPrice", 1500.75, "php"), "PHP 1,500.75");
  assert.equal(C.formatTableValue(RUNTIME, "unitPrice", 1500.75, "decimal"), "1,500.75");
  assert.equal(C.formatTableValue(RUNTIME, "quantity", 2.7, "integer"), "3");
  assert.equal(C.formatTableValue(RUNTIME, "discount", 0.025, "percent"), "2.5%");
  assert.equal(C.formatTableValue(RUNTIME, "discount", 0.05, "percent"), "5.0%");
  assert.equal(C.formatTableValue(RUNTIME, "discount", 0.075, "percent"), "7.5%");
  assert.equal(C.formatTableValue(RUNTIME, "shipDate", 46357, "general"), "46357");
  assert.equal(C.formatTableValue(RUNTIME, "shipDate", 46357, "date"), "2026-12-01");
  assert.equal(C.formatTableValue(RUNTIME, "shipDate", 46812, "date"), "2028-02-29");
  assert.equal(C.formatTableValue(RUNTIME, "shipDate", 61, "date"), "1900-03-01");
  assert.equal(C.formatTableValue(RUNTIME, "shipDate", 2958465, "date"), "9999-12-31");
  assert.equal(C.formatTableValue(RUNTIME, "quantity", null, "integer"), "");
  assert.equal(C.formatTableValue(RUNTIME, "quantity", 12, "date"), "Date outside this practice");
  assert.equal(C.formatTableValue(RUNTIME, "id", "SKU-A", "general"), "SKU-A");
  assert.throws(() => C.formatTableValue(RUNTIME, "quantity", "6", "integer"));
  assert.throws(() => apply(state, { type: "set-format", column: "id", format: "integer" }));
  assert.equal(display.rows[0].unitPrice, 1500.75);
  assert.equal(display.rows[0].discount, 0.025);
  assert.equal(grade("number-formats", display).score, 6);
  assert.equal(grade("number-formats", display, "independent", "PHP").score, 5);
});

test("F3 table creation is bounded, preserves data, and independently grades name and banding", () => {
  const state = initial(), before = structuredClone(state);
  const created = table(state);
  assert.deepEqual(state, before);
  assert.deepEqual(created.rows, state.rows);
  assert.deepEqual(created.table, { name: "PracticeItems", range: "A1:G7", headers: true, banded: true });
  for (const changes of [{ name: "Bad name" }, { name: "PracticeItems\n" }, { name: "PracticeItems\r\n" },
    { name: "A1" }, { name: "R1C1" },
    { name: "R" }, { range: "A1:F7" }, { headers: false }, { banded: "yes" }])
    assert.throws(() => apply(state, { type: "create-table", name: "PracticeItems", range: "A1:G7", headers: true, banded: true, ...changes }));
  assert.deepEqual(state, before);
  const partial = apply(state, { type: "create-table", name: "OtherItems", range: "A1:G7", headers: true, banded: false });
  const result = grade("create-table", partial);
  assert.equal(result.score, 3);
  assert.equal(flags(result)["table-created"], true);
  assert.equal(flags(result)["table-name"], false);
  assert.equal(flags(result)["table-banding"], false);
  assert.equal(flags(result)["original-records"], true);
});

test("F3 sorts whole records numerically with stable ties and blanks last in either direction", () => {
  const data = rows(); data[4].quantity = null; data[5].quantity = -1;
  let state = table(initial(data)); const before = structuredClone(state);
  state = apply(state, { type: "sort", column: "quantity", direction: "asc" });
  assert.deepEqual(viewIds(state), ["SKU-F", "SKU-B", "SKU-D", "SKU-C", "SKU-A", "SKU-E"]);
  assert.deepEqual(state.rows, before.rows);
  for (const row of C.tableView(RUNTIME, state)) assert.deepEqual(row, data.find(original => original.id === row.id));
  state = apply(state, { type: "sort", column: "quantity", direction: "desc" });
  assert.deepEqual(viewIds(state), ["SKU-A", "SKU-C", "SKU-B", "SKU-D", "SKU-F", "SKU-E"]);
  assert.deepEqual(before.order, data.map(row => row.id));
  assert.deepEqual(viewIds(apply(table(initial()), { type: "sort", column: "shipDate", direction: "asc" })),
    ["SKU-B", "SKU-D", "SKU-A", "SKU-F", "SKU-E", "SKU-C"]);
  assert.deepEqual(viewIds(apply(table(initial()), { type: "sort", column: "unitPrice", direction: "asc" })),
    ["SKU-F", "SKU-B", "SKU-E", "SKU-D", "SKU-A", "SKU-C"]);
  assert.deepEqual(viewIds(apply(table(initial()), { type: "sort", column: "id", direction: "desc" })),
    ["SKU-F", "SKU-E", "SKU-D", "SKU-C", "SKU-B", "SKU-A"]);
  const tied = rows(); tied[0].item = "alpha"; tied[1].item = "ALPHA";
  assert.deepEqual(viewIds(apply(table(initial(tied)), { type: "sort", column: "item", direction: "asc" })).slice(0, 2), ["SKU-A", "SKU-B"]);
  assert.throws(() => apply(initial(), { type: "sort", column: "quantity", direction: "asc" }));
  assert.throws(() => apply(state, { type: "sort", column: "quantity", direction: "sideways" }));
});

test("F3 filtering combines conditions, retains records, and reapplication explicitly refreshes a changed match", () => {
  let state = apply(table(initial()), { type: "sort", column: "quantity", direction: "desc" });
  const before = structuredClone(state);
  state = apply(state, { type: "filter", status: "Ready", minimumQuantity: 5 });
  assert.deepEqual(viewIds(state), ["SKU-A", "SKU-C"]);
  assert.deepEqual(state.order, before.order);
  assert.deepEqual(state.rows, before.rows);
  assert.equal(grade("filter-records", state).score, 5);
  const filtered = structuredClone(state);
  state = apply(state, { type: "edit-cell", rowId: "SKU-A", column: "quantity", value: "1" });
  assert.deepEqual(viewIds(state), ["SKU-A", "SKU-C"]);
  assert.equal(state.rows.find(row => row.id === "SKU-A").quantity, 1);
  assert.equal(filtered.rows.find(row => row.id === "SKU-A").quantity, 10);
  const stale = flags(grade("filter-records", state));
  assert.equal(stale["filter-status"], true);
  assert.equal(stale["filter-quantity"], true);
  assert.equal(stale["matching-records-visible"], false);
  assert.equal(stale["original-records"], false);
  state = apply(state, { type: "filter", status: "Ready", minimumQuantity: 5 });
  assert.deepEqual(viewIds(state), ["SKU-C"]);
  state = apply(state, { type: "clear-filter" });
  assert.deepEqual(viewIds(state), before.order);
  assert.equal(state.rows.length, 6);
  const empty = apply(state, { type: "filter", status: "Ready", minimumQuantity: 100 });
  assert.deepEqual(viewIds(empty), []);
  assert.equal(empty.rows.length, 6);
  assert.deepEqual(viewIds(apply(empty, { type: "clear-filter" })), before.order);
  assert.throws(() => apply(state, { type: "filter", status: "Ready", minimumQuantity: "5" }));
});

test("F3 validation keeps earlier invalid values, reports each rule independently and blocks new invalid edits atomically", () => {
  const data = rows(); data[0].quantity = -2; data[1].status = "ready"; data[2].quantity = null;
  let state = initial(data);
  assert.deepEqual(C.inspectTableValidation(RUNTIME, state), []);
  state = apply(state, { type: "set-validation", column: "quantity", enabled: true });
  assert.deepEqual(C.inspectTableValidation(RUNTIME, state).map(({ rowId, column }) => [rowId, column]),
    [["SKU-A", "quantity"], ["SKU-C", "quantity"]]);
  state = apply(state, { type: "set-validation", column: "status", enabled: true });
  assert.deepEqual(state.rows, data);
  assert.equal(C.inspectTableValidation(RUNTIME, state).length, 3);
  const before = structuredClone(state);
  for (const value of ["-1", "1.5", "10001", "", "word", "0x10", "NaN", "1e13"])
    assert.throws(() => apply(state, { type: "edit-cell", rowId: "SKU-D", column: "quantity", value }));
  for (const value of ["ready", "Ready ", "", "Other"])
    assert.throws(() => apply(state, { type: "edit-cell", rowId: "SKU-D", column: "status", value }));
  assert.deepEqual(state, before);
  state = apply(state, { type: "edit-cell", rowId: "SKU-A", column: "quantity", value: "0" });
  state = apply(state, { type: "edit-cell", rowId: "SKU-B", column: "status", value: "Ready" });
  state = apply(state, { type: "edit-cell", rowId: "SKU-C", column: "quantity", value: "10000" });
  assert.deepEqual(C.inspectTableValidation(RUNTIME, state), []);
  state = apply(state, { type: "set-validation", column: "quantity", enabled: false });
  state = apply(state, { type: "edit-cell", rowId: "SKU-A", column: "quantity", value: "-1.5" });
  assert.equal(state.rows[0].quantity, -1.5);
  assert.deepEqual(C.inspectTableValidation(RUNTIME, state), []);
});

test("F3 editing targets a stable SKU after sort and does not silently re-sort or alter other fields", () => {
  let state = apply(table(initial()), { type: "sort", column: "quantity", direction: "asc" });
  const before = structuredClone(state);
  assert.equal(state.order[0], "SKU-B");
  state = apply(state, { type: "edit-cell", rowId: "SKU-B", column: "quantity", value: "99" });
  assert.deepEqual(state.order, before.order);
  assert.equal(C.tableView(RUNTIME, state)[0].id, "SKU-B");
  assert.equal(C.tableView(RUNTIME, state)[0].quantity, 99);
  assert.deepEqual(state.rows.find(row => row.id === "SKU-B"), { ...rows()[1], quantity: 99 });
  assert.equal(flags(grade("sort-records", state))["sort-setting"], true);
  assert.equal(flags(grade("sort-records", state))["numeric-row-order"], false);
  assert.equal(flags(grade("sort-records", state))["original-records"], false);
  state = apply(state, { type: "sort", column: "quantity", direction: "asc" });
  assert.equal(state.order.at(-1), "SKU-B");
  assert.throws(() => apply(state, { type: "edit-cell", rowId: "missing", column: "quantity", value: "6" }));
  assert.throws(() => apply(state, { type: "edit-cell", rowId: "SKU-B", column: "id", value: "OTHER" }));
});

test("F3 rubric pins every goal, independently grades evidence and rejects unsupported provenance", () => {
  const correct = [formatted(initial()), table(initial()),
    apply(table(initial()), { type: "sort", column: "quantity", direction: "asc" }),
    apply(table(initial()), { type: "filter", status: "Ready", minimumQuantity: 5 }),
    apply(apply(initial(), { type: "set-validation", column: "quantity", enabled: true }),
      { type: "set-validation", column: "status", enabled: true })];
  for (let i = 0; i < IDS.length; i++) {
    const result = grade(IDS[i], correct[i]);
    assert.ok(result.passed, IDS[i]);
    assert.equal(result.maxScore, [6, 5, 5, 5, 6][i]);
    assert.equal(new Set(result.criteria.map(({ id }) => id)).size, result.criteria.length);
    assert.equal(grade(IDS[i], correct[i], "guided").maxScore, result.maxScore - 1);
  }
  const original = initial(), partial = flags(grade("validate-entry", original));
  assert.equal(partial["validation:quantity"], false);
  assert.equal(partial["validation:status"], false);
  assert.equal(partial["valid-quantities"], true);
  assert.equal(partial["valid-statuses"], true);
  assert.equal(partial["original-records"], true);
  const tampered = structuredClone(ex("filter-records"));
  tampered.lesson.goal.filters = { status: null, minimumQuantity: null };
  assert.equal(flags(C.gradeTables(RUBRIC, tampered, original))["filter-status"], false);
  assert.equal(flags(C.gradeTables(RUBRIC, tampered, original))["filter-quantity"], false);
  const mismatched = initial(); mismatched.rows[0].id = "SKU-X"; mismatched.order[0] = "SKU-X";
  const identity = flags(grade("number-formats", formatted(mismatched)));
  assert.equal(identity["format:quantity"], true);
  assert.equal(identity["record-identities"], false);
  assert.equal(identity["original-records"], false);
  for (const changes of [{ mode: "other" }, { currency: "USD" }, { lesson: { id: "sum", version: 1 } },
    { lesson: { id: "number-formats", version: 2 } }, { rows: [] }])
    assert.throws(() => C.gradeTables(RUBRIC, { ...ex("number-formats"), ...changes }, original));
  assert.throws(() => C.gradeTables({ ...RUBRIC, version: 2 }, ex("number-formats"), original));
  assert.throws(() => C.gradeTables({ id: "formula-foundations", version: 1 }, ex("number-formats"), original));
  for (const action of [{ type: "delete-row", rowId: "SKU-A" }, { type: "clear-filter", extra: true },
    { type: "set-validation", column: "quantity", enabled: 1 }, { type: "set-format", column: "quantity", format: "custom" }])
    assert.throws(() => apply(original, action));
  assert.deepEqual(original, initial());
});
