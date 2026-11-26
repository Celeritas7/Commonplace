import { prepareExcelExercise } from "../../platform/content/excel-contract.mjs";
import { sumResult, appendCalculation, validateCalculationHistory, CALCULATION_HISTORY_LIMIT } from "./calculation-history.mjs";
export { sumResult } from "./calculation-history.mjs";
const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
// Excel owns this renderer. All identity, profiles, assignments and persistence
// are supplied by the central host. Reuse the existing Phase A Ribbon as-is.
export function mountAssignedExcel(
  root,
  bundle,
  { state, onChange = () => {} } = {},
) {
  const prepared = prepareExcelExercise(bundle),
    { worksheet } = prepared;
  if (!window.CommonplaceExcelRibbon?.mount)
    throw Error("Excel simulator is unavailable. Reload the workspace.");
  let disposed = false;
  let history = validateCalculationHistory(state.attempts ?? []);
  root.replaceChildren();
  root.append(
    el("h3", bundle.concept.title),
    el("p", bundle.concept.explanation),
    el("h4", bundle.scenario.title),
    el("p", bundle.scenario.context),
    el("p", bundle.scenario.instructions),
  );
  for (const activity of bundle.lesson.activities)
    root.append(el("p", activity.instruction));
  const hint = el(
    "p",
    "Practise the SUM formula in B5. The Ribbon tools explain their location and purpose.",
  );
  hint.className = "learn-muted";
  root.append(hint);
  const simulator = el("section");
  simulator.id = "assigned-excel-simulator";
  simulator.dataset.excelSimulator = "";
  simulator.setAttribute("aria-label", "Excel interface simulator");
  const form = el("form"),
    bar = el("div");
  bar.className = "assigned-formula-row";
  const name = el("span", "B5");
  name.dataset.excelName = "";
  name.className = "excel-name";
  name.setAttribute("aria-label", "Selected cell");
  name.setAttribute("aria-live", "polite");
  const formula = el("input");
  formula.type = "text";
  formula.maxLength = 80;
  formula.autocomplete = "off";
  formula.spellcheck = false;
  formula.dataset.excelFormula = "";
  formula.setAttribute("aria-label", "Formula for B5");
  formula.value = state.formula;
  const cellValue = el("span");
  cellValue.dataset.excelValue = "";
  cellValue.hidden = true;
  cellValue.className = "excel-value";
  cellValue.setAttribute("aria-label", "Selected cell contents");
  bar.append(name, el("span", "fx"), formula, cellValue);
  form.append(bar);
  const sheet = el("div");
  sheet.dataset.excelSheet = "";
  sheet.className = "assigned-sheet-scroll";
  const table = el("table");
  table.setAttribute("aria-label", bundle.dataset.title);
  const head = el("thead"),
    tr = el("tr");
  for (const label of ["", "A", "B"]) {
    const th = el("th", label);
    th.scope = "col";
    if (!label) th.setAttribute("aria-label", "Row numbers");
    tr.append(th);
  }
  head.append(tr);
  table.append(head);
  const body = el("tbody");
  const row = (number, values) => {
    const r = el("tr"),
      th = el("th", String(number));
    th.scope = "row";
    r.append(th);
    values.forEach((value, index) => {
      const cell = el("td");
      cell.dataset.cell = String.fromCharCode(65 + index) + number;
      if (typeof value === "string") cell.textContent = value;
      else cell.append(value);
      r.append(cell);
    });
    body.append(r);
    return r;
  };
  row(1, worksheet.headers);
  const inputs = worksheet.rows.map((r, i) => {
    const input = el("input");
    input.type = "number";
    input.step = "any";
    input.min = "-1000000000000";
    input.max = "1000000000000";
    input.value = state.values[i];
    input.setAttribute("aria-label", `${worksheet.inputCells[i]}, ${r[0]}`);
    row(i + 2, [r[0], input]);
    return input;
  });
  const output = el("output", "—");
  output.setAttribute("aria-label", "B5 total");
  row(5, ["Total", output]).lastChild.className = "assigned-result";
  table.append(body);
  sheet.append(table);
  form.append(sheet);
  const actions = el("div");
  actions.className = "learn-actions";
  const apply = el("button", "Apply formula");
  apply.type = "submit";
  const reset = el("button", "Reset worksheet");
  reset.type = "button";
  reset.className = "learn-secondary";
  actions.append(apply, reset);
  form.append(actions);
  const feedback = el(
    "p",
    "Enter the formula, then apply it to the three quantities.",
  );
  feedback.setAttribute("role", "status");
  feedback.className = "assigned-feedback";
  form.append(feedback);
  simulator.append(form);
  root.append(simulator);
  const historyPanel = el("details");
  historyPanel.className = "learn-personal";
  const historyTitle = el("summary"), historyList = el("ol"), historyHint = el("p");
  historyHint.className = "learn-muted";
  historyPanel.append(historyTitle, historyHint, historyList);
  root.append(historyPanel);
  function renderHistory() {
    historyTitle.textContent = "Calculation history (" + history.length + "/" + CALCULATION_HISTORY_LIMIT + ")";
    historyHint.textContent = "The latest five submissions are shown. All recorded submissions are retained with this assigned lesson. This is practice feedback, not an exam score." +
      (history.length === CALCULATION_HISTORY_LIMIT ? " History is full; further calculations update the worksheet but are not added to history." : "");
    historyList.replaceChildren();
    for (const a of history.slice(-5).reverse()) {
      historyList.append(el("li", (a.formula || "(empty formula)") + " · " +
        a.values.join(", ") + " · " + (a.accepted ? "Result: " + a.result : "Formula or values not accepted")));
    }
  }
  renderHistory();
  const ribbon = window.CommonplaceExcelRibbon.mount(simulator, {
    workbook: bundle.lesson.title,
    sheet: bundle.dataset.title,
    formulaCell: "B5",
  });
  if (!ribbon) throw Error("Excel simulator could not start.");
  const snapshot = (applied) => ({
    values: inputs.map((n) => n.value),
    formula: formula.value,
    applied,
    ...(history.length ? { attempts: structuredClone(history) } : {}),
  });
  function changed() {
    if (disposed) return;
    output.textContent = "—";
    feedback.textContent = "Apply the formula to calculate the current values.";
    onChange(snapshot(false));
  }
  for (const n of [...inputs, formula]) n.addEventListener("input", changed);
  function calculate() {
    const total = sumResult(
      inputs.map((n) => n.value),
      formula.value,
    );
    output.textContent = String(total);
    feedback.textContent = `B5: ${total}${bundle.dataset.columns[1].unit ? " " + bundle.dataset.columns[1].unit : ""}. SUM applied successfully.`;
  }
  if (state.applied) {
    try {
      calculate();
    } catch {
      output.textContent = "—";
    }
  }
  form.onsubmit = (event) => {
    event.preventDefault();
    if (disposed) return;
    ribbon.select("B5");
    let applied = false;
    try {
      calculate();
      applied = true;
    } catch (e) {
      output.textContent = "—";
      feedback.textContent = e.message;
    }
    try {
      const next = appendCalculation(history, inputs.map((n) => n.value), formula.value, {
        id: crypto.randomUUID(),
        submittedAt: new Date().toISOString(),
      });
      if (next) {
        history = next;
        renderHistory();
      } else feedback.textContent += " History limit reached; this calculation was not added to history.";
    } catch {
      feedback.textContent += " This calculation could not be added to history. Earlier submissions were kept.";
    }
    onChange(snapshot(applied));
  };
  reset.onclick = () => {
    if (disposed) return;
    inputs.forEach((n, i) => (n.value = String(worksheet.rows[i][1])));
    formula.value = "";
    ribbon.select("B5");
    changed();
  };
  return () => {
    disposed = true;
    root.replaceChildren();
  };
}
