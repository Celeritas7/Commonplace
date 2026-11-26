import { prepareExcelExercise } from "../../platform/content/excel-contract.mjs";
import { sumResult, appendCalculation, validateCalculationHistory, CALCULATION_HISTORY_LIMIT, validatePracticeMode, practiceCriteria, practiceHistory, reviewCalculation, emptyToolState, validateToolState } from "./calculation-history.mjs";
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
  let mode = validatePracticeMode(state.practice_mode ?? "free");
  let appliedNow = state.applied;
  let tools = validateToolState(state.tool_state ?? emptyToolState());
  // Clipboard content is deliberately session-only and scoped to this mount.
  let copied = null;
  const formatMode = "independent-format-v1", copyMode = "independent-copy-v1";
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
    "Practise SUM in B5. Home Ribbon tools marked Practice support formatting A1 and copying B2 to B3. Other tools explain their location and purpose.",
  );
  hint.className = "learn-muted";
  root.append(hint);
  const practice = el("section");
  practice.className = "learn-personal";
  practice.setAttribute("aria-label", "Assigned SUM practice");
  const practiceTitle = el("h4", "Guided and independent practice");
  const practiceMode = el("p"), practiceInstruction = el("p"), practiceStatus = el("p");
  practiceStatus.setAttribute("role", "status");
  const modeActions = el("div");
  modeActions.className = "learn-actions";
  const modeButton = text => {
    const b = el("button", text);
    b.type = "button";
    b.className = "learn-secondary";
    return b;
  };
  const guided = modeButton("Start guided SUM (reset worksheet)");
  const independent = modeButton("Start independent revision (reset worksheet)");
  const format = modeButton("Start heading formatting (reset worksheet)");
  const copy = modeButton("Start clipboard practice (reset worksheet)");
  const leave = modeButton("Leave practice mode");
  modeActions.append(guided, independent, format, copy, leave);
  const practiceResults = el("div");
  practice.append(practiceTitle, practiceMode, modeActions, practiceInstruction, practiceStatus, practiceResults);
  root.append(practice);
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
  const heading = row(1, worksheet.headers).children[1];
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
  const submitFormat = modeButton("Submit formatting");
  submitFormat.hidden = true;
  actions.append(apply, submitFormat, reset);
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
    historyHint.textContent = "The latest five submissions are shown, including formatting and clipboard practice. All recorded submissions are retained with this assigned lesson. This is practice feedback, not an exam score." +
      (history.length === CALCULATION_HISTORY_LIMIT ? " History is full; further calculations update the worksheet but are not added to history." : "");
    historyList.replaceChildren();
    for (const a of history.slice(-5).reverse()) {
      if (a.activity === formatMode) {
        const grade = practiceCriteria(formatMode, worksheet.rows, a.values, a.formula, a.tool_state);
        historyList.append(el("li", "Heading formatting · " + grade.score + "/" + grade.maxScore));
      } else {
        const current = reviewCalculation(a);
        const recorded = a.accepted ? "Result: " + a.result : "Formula or values not accepted";
        const outcome = current.changed
          ? "Earlier recorded outcome: " + recorded + " · Current check: " +
            (current.accepted ? "Result: " + current.result : "Formula or values need correction")
          : recorded;
        historyList.append(el("li", (a.formula || "(empty formula)") + " · " +
          a.values.join(", ") + " · " + outcome +
          (a.activity ? " · " + (a.activity === "guided-sum-v1" ? "Guided" : a.activity === copyMode ? "Clipboard" : "Independent") : "")));
      }
    }
  }
  renderHistory();
  const ribbon = window.CommonplaceExcelRibbon.mount(simulator, {
    workbook: bundle.lesson.title,
    sheet: bundle.dataset.title,
    formulaCell: "B5",
    practiceTools: ["Bold", "Fill Color", "Borders", "Copy", "Paste"],
    onPracticeTool: performTool,
  });
  if (!ribbon) throw Error("Excel simulator could not start.");
  const snapshot = (applied) => ({
    values: inputs.map((n) => n.value),
    formula: formula.value,
    applied,
    ...(history.length ? { attempts: structuredClone(history) } : {}),
    ...(mode !== "free" ? { practice_mode: mode } : {}),
    ...(Object.values(tools).some(Boolean) ? { tool_state: { ...tools } } : {}),
  });
  function renderTools() {
    heading.setAttribute("data-practice-bold", String(tools.bold));
    heading.setAttribute("data-practice-fill", String(tools.fill));
    heading.setAttribute("data-practice-border", String(tools.border));
  }
  function performTool(tool, address) {
    if (disposed) return "This worksheet is closed.";
    const key = { Bold: "bold", "Fill Color": "fill", Borders: "border" }[tool];
    if (key && ["bold", "fill", "border"].includes(key)) {
      if (address !== "A1") return "Select A1 to practise this heading tool.";
      tools[key] = !tools[key];
      renderTools();
      renderPractice();
      onChange(snapshot(appliedNow));
      return tool + (tools[key] ? " applied to A1." : " removed from A1.");
    }
    if (tool === "Copy") {
      if (address !== "B2") return "Select B2 to copy its value.";
      const value = inputs[0].value;
      if (!value.trim() || value.length > 40 || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 1e12)
        return "Enter a valid numeric value in B2 first.";
      copied = value;
      return "B2 copied. Select B3 and choose Paste.";
    }
    if (tool === "Paste") {
      if (address !== "B3") return "Select B3 to paste the copied value.";
      if (copied === null) return "Copy B2 first. Clipboard contents are not restored after reopening.";
      inputs[1].value = copied;
      tools.copy_used = true;
      ribbon.refresh();
      changed();
      return "B2 value pasted into B3.";
    }
    return "Location preview only.";
  }
  function renderPractice() {
    const values = inputs.map(n => n.value);
    const active = mode !== "free";
    const guide = practiceHistory(history, worksheet.rows, "guided-sum-v1");
    const assessments = practiceHistory(history, worksheet.rows, "independent-match-v1");
    const formats = practiceHistory(history, worksheet.rows, formatMode);
    const copies = practiceHistory(history, worksheet.rows, copyMode);
    const full = history.length >= CALCULATION_HISTORY_LIMIT;
    practiceMode.textContent = mode === "guided-sum-v1" ? "Mode: Guided SUM" :
      mode === "independent-match-v1" ? "Mode: Independent revision" :
      mode === formatMode ? "Mode: Heading formatting" : mode === copyMode ? "Mode: Clipboard practice" : "Mode: Free practice";
    guided.disabled = full || mode === "guided-sum-v1";
    independent.disabled = full || mode === "independent-match-v1";
    format.disabled = full || mode === formatMode;
    copy.disabled = full || mode === copyMode;
    leave.hidden = !active;
    apply.hidden = mode === formatMode;
    submitFormat.hidden = mode !== formatMode;
    submitFormat.disabled = full;
    practiceInstruction.textContent = mode === "guided-sum-v1"
      ? "Keep the original three values. Select B5, enter =SUM(B2:B4), then press Apply formula."
      : mode === "independent-match-v1"
        ? "Change B3 so it matches the original B2. Keep B2 and B4 unchanged. Calculate the total in B5."
        : mode === formatMode
          ? "Select A1. On Home → Font, use Bold, Fill Color (yellow), and Borders. Keep the three original values unchanged. Submit formatting when finished."
          : mode === copyMode
            ? "Select B2, use Home → Clipboard → Copy, select B3 and use Paste. Keep B2 and B4 unchanged. Select B5, enter SUM and apply the formula."
            : "Choose a practice mode to work with this assigned dataset. Starting a mode resets the current worksheet, not its saved history.";
    if (full) practiceInstruction.textContent += " The shared 40-submission history is full; new scored submissions are unavailable.";
    practiceStatus.textContent = "";
    if (mode === "guided-sum-v1") {
      const grade = practiceCriteria(mode, worksheet.rows, values, formula.value);
      const last = history.at(-1);
      const submitted = appliedNow && last?.activity === mode &&
        last.formula === formula.value && last.values.every((v,i)=>v===values[i]) && grade.passed;
      practiceStatus.textContent = "Guided steps: " +
        (grade.criteria.slice(0,3).every(c=>c.passed) ? "Original values verified" : "Restore the original values") +
        " · " + (grade.criteria[3].passed ? "SUM expression ready" : "Enter the SUM expression") +
        " · " + (submitted ? "Submission complete" : "Apply formula to submit");
    } else if (mode === "independent-match-v1") {
      practiceStatus.textContent = "Submit using Apply formula. Criteria are shown after a recorded submission.";
    }
    practiceResults.replaceChildren();
    if (history.some(a => !Object.hasOwn(a, "evaluation_version")))
      practiceResults.append(el("p", "Scores below use the current formula and input checks. Earlier recorded outcomes remain unchanged in Calculation history."));
    practiceResults.append(el("p", "Guided: " + guide.filter(a=>a.grade.passed).length + " passed / " + guide.length +
      " submitted · Independent: " + assessments.filter(a=>a.grade.passed).length + " passed / " + assessments.length + " submitted"));
    practiceResults.append(el("p", "Formatting: " + formats.filter(a=>a.grade.passed).length + " passed / " + formats.length + " submitted · Clipboard: " + copies.filter(a=>a.grade.passed).length + " passed / " + copies.length + " submitted"));
    const last = assessments.at(-1);
    if (last) {
      practiceResults.append(el("strong", "Last independent submission: " + last.grade.score + " / " + last.grade.maxScore));
      const list = el("ul");
      for (const c of last.grade.criteria) list.append(el("li", (c.passed ? "Correct: " : "Review: ") + c.label));
      practiceResults.append(list);
    }
    for (const [title, group] of [["Last formatting submission", formats], ["Last clipboard submission", copies]]) {
      const latest = group.at(-1);
      if (!latest) continue;
      practiceResults.append(el("strong", title + ": " + latest.grade.score + " / " + latest.grade.maxScore));
      const list = el("ul");
      for (const c of latest.grade.criteria) list.append(el("li", (c.passed ? "Correct: " : "Review: ") + c.label));
      practiceResults.append(list);
    }
    practiceResults.append(el("p", "Scores describe saved self-practice submissions, not a certified exam. Worksheet completion remains separate."));
  }
  function changed() {
    if (disposed) return;
    appliedNow = false;
    output.textContent = "—";
    feedback.textContent = "Apply the formula to calculate the current values.";
    renderPractice();
    onChange(snapshot(false));
  }
  inputs.forEach((n,i)=>n.addEventListener("input", ()=>{
    if (i === 0 || i === 1) tools.copy_used = false;
    if (i === 0) copied = null;
    changed();
  }));
  formula.addEventListener("input", changed);
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
    } catch (error) {
      appliedNow = false;
      output.textContent = "—";
      feedback.textContent = "Review the saved formula with the current checks. Earlier submissions are kept. " + error.message;
    }
  }
  form.onsubmit = (event) => {
    event.preventDefault();
    if (disposed) return;
    if (mode === formatMode) {
      feedback.textContent = "Use Submit formatting to record this exercise.";
      return;
    }
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
        activity: mode,
        ...(mode === copyMode ? { toolState: tools } : {}),
      });
      if (next) {
        history = next;
        renderHistory();
      } else feedback.textContent += " History limit reached; this calculation was not added to history.";
    } catch {
      feedback.textContent += " This calculation could not be added to history. Earlier submissions were kept.";
    }
    appliedNow = applied;
    renderPractice();
    onChange(snapshot(applied));
  };
  submitFormat.onclick = () => {
    if (disposed || mode !== formatMode || history.length >= CALCULATION_HISTORY_LIMIT) return;
    try {
      const next = appendCalculation(history, inputs.map(n=>n.value), formula.value, {
        id: crypto.randomUUID(), submittedAt: new Date().toISOString(),
        activity: formatMode, toolState: tools,
      });
      if (!next) return;
      history = next;
      renderHistory();
      renderPractice();
      feedback.textContent = "Formatting submitted. Review the four criteria above.";
      onChange(snapshot(appliedNow));
    } catch {
      feedback.textContent = "Formatting could not be recorded. Earlier submissions were kept.";
    }
  };
  function resetDraft() {
    if (disposed) return;
    inputs.forEach((n, i) => (n.value = String(worksheet.rows[i][1])));
    formula.value = "";
    copied = null;
    tools = emptyToolState();
    renderTools();
    ribbon.select("B5");
    changed();
  }
  reset.onclick = resetDraft;
  function startMode(next) {
    if (disposed || history.length >= CALCULATION_HISTORY_LIMIT || mode === next) return;
    mode = validatePracticeMode(next);
    resetDraft();
  }
  guided.onclick = () => startMode("guided-sum-v1");
  independent.onclick = () => startMode("independent-match-v1");
  format.onclick = () => startMode(formatMode);
  copy.onclick = () => startMode(copyMode);
  leave.onclick = () => {
    if (disposed || mode === "free") return;
    mode = "free";
    copied = null;
    renderPractice();
    onChange(snapshot(appliedNow));
  };
  renderTools();
  renderPractice();
  return () => {
    disposed = true;
    copied = null;
    root.replaceChildren();
  };
}
