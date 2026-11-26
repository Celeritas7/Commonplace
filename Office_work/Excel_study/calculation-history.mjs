// Bounded calculation history for authorized, versioned Excel SUM assignments.
import "./formula-syntax.js";
const syntax = globalThis.CommonplaceExcelFormulaSyntax ?? globalThis.window?.CommonplaceExcelFormulaSyntax;
export const CALCULATION_HISTORY_LIMIT = 40;
export const CALCULATION_EVALUATION_VERSION = 2;
export const PRACTICE_MODES = Object.freeze(["free", "guided-sum-v1", "independent-match-v1", "independent-format-v1", "independent-copy-v1"]);
export function validatePracticeMode(mode) {
  if (!PRACTICE_MODES.includes(mode)) throw Error("Unsupported practice mode.");
  return mode;
}
export function emptyToolState() {
  return { bold: false, fill: false, border: false, copy_used: false };
}
export function validateToolState(state) {
  const keys = ["bold", "fill", "border", "copy_used"];
  if (!state || Object.getPrototypeOf(state) !== Object.prototype ||
      Object.keys(state).length !== keys.length ||
      !keys.every(k => Object.hasOwn(state,k) && typeof state[k] === "boolean"))
    throw Error("Invalid saved worksheet tools.");
  return { ...state };
}
const toolActivity = activity => activity === "independent-format-v1" || activity === "independent-copy-v1";
// Frozen only for reading unversioned records. Never use these earlier rules
// for a new submission or current rubric; preserving them keeps old work readable.
function legacySumResult(values, formula) {
  if (
    typeof formula !== "string" ||
    !/^=SUM\(B2:B4\)$/i.test(formula.replace(/\s/g, ""))
  )
    throw Error("Enter =SUM(B2:B4) in B5.");
  if (
    !Array.isArray(values) ||
    values.length !== 3 ||
    values.some(
      (v) =>
        typeof v !== "string" ||
        !v.trim() ||
        v.length > 40 ||
        !Number.isFinite(Number(v)) ||
        Math.abs(Number(v)) > 1e12,
    )
  )
    throw Error("Enter a valid number in all three quantity cells.");
  return Number(values.reduce((sum, v) => sum + Number(v), 0).toPrecision(15));
}
export function sumResult(values, formula) {
  if (syntax.parse(formula)?.fn !== "SUM")
    throw Error("Enter a SUM formula for B2:B4. Keep SUM and each cell reference together.");
  if (!Array.isArray(values) || values.length !== 3 ||
      Object.keys(values).length !== 3 || ![0, 1, 2].every(i => Object.hasOwn(values, i)))
    throw Error("Enter a valid number in all three quantity cells.");
  const numbers = values.map(v => syntax.numericCell(v));
  return Number(numbers.reduce((sum, value) => sum + value, 0).toPrecision(15));
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validTime(text) {
  if (typeof text !== "string" || text.length !== 24) return false;
  const time = Date.parse(text);
  return Number.isFinite(time) && new Date(time).toISOString() === text;
}
function inputShape(values, formula) {
  return Array.isArray(values) && values.length === 3 &&
    Object.keys(values).length === 3 &&
    [0, 1, 2].every(i => Object.hasOwn(values, i) && typeof values[i] === "string" && values[i].length <= 40) &&
    typeof formula === "string" && formula.length <= 80;
}
function evaluate(values, formula, version = CALCULATION_EVALUATION_VERSION) {
  try { return { accepted: true, result: (version === 1 ? legacySumResult : sumResult)(values, formula) }; }
  catch { return { accepted: false, result: null }; }
}
export function validateCalculationHistory(history) {
  if (!Array.isArray(history) || history.length > CALCULATION_HISTORY_LIMIT ||
      Object.keys(history).length !== history.length)
    throw Error("Saved calculation history could not be restored.");
  const seen = new Set();
  for (const a of history) {
    const versioned = a && Object.hasOwn(a, "evaluation_version");
    const keys = ["accepted", "formula", "id", "result", "submitted_at", "values"];
    if (a && Object.hasOwn(a, "activity")) keys.push("activity");
    if (a && Object.hasOwn(a, "tool_state")) keys.push("tool_state");
    if (versioned) keys.push("evaluation_version");
    if (!a || Object.getPrototypeOf(a) !== Object.prototype ||
        Object.keys(a).sort().join() !== keys.sort().join() ||
        (versioned && a.evaluation_version !== CALCULATION_EVALUATION_VERSION) ||
        (Object.hasOwn(a, "tool_state") !== toolActivity(a.activity)) ||
        (Object.hasOwn(a, "activity") && !PRACTICE_MODES.slice(1).includes(a.activity)) ||
        typeof a.id !== "string" || !uuid.test(a.id) || seen.has(a.id.toLowerCase()) ||
        !validTime(a.submitted_at) || !inputShape(a.values, a.formula))
      throw Error("Saved calculation history could not be restored.");
    if (toolActivity(a.activity)) validateToolState(a.tool_state);
    const expected = evaluate(a.values, a.formula, versioned ? a.evaluation_version : 1);
    if (a.accepted !== expected.accepted || a.result !== expected.result)
      throw Error("Saved calculation result is inconsistent.");
    seen.add(a.id.toLowerCase());
  }
  return structuredClone(history);
}
export function reviewCalculation(attempt) {
  const current = evaluate(attempt.values, attempt.formula);
  return { ...current, changed: current.accepted !== attempt.accepted || current.result !== attempt.result };
}
export function appendCalculation(history, values, formula, { id, submittedAt, activity = "free", toolState }) {
  validatePracticeMode(activity);
  const next = validateCalculationHistory(history);
  if (next.length >= CALCULATION_HISTORY_LIMIT) return null;
  if (!inputShape(values, formula)) throw Error("Calculation input is too long to record.");
  if (toolActivity(activity)) validateToolState(toolState);
  else if (toolState !== undefined) throw Error("Unexpected tool state for activity.");
  const evaluation = evaluate(values, formula);
  next.push({ id, submitted_at: submittedAt, evaluation_version: CALCULATION_EVALUATION_VERSION,
    values: [...values], formula, ...evaluation,
    ...(activity === "free" ? {} : { activity }),
    ...(toolActivity(activity) ? { tool_state: validateToolState(toolState) } : {}) });
  return validateCalculationHistory(next);
}

/* The published SUM dataset is the only source of expected input values.
   Grading is deterministic self-practice, never authority or a private answer key. */
function baseline(rows) {
  if (!Array.isArray(rows) || rows.length !== 3 ||
      rows.some(r => !Array.isArray(r) || typeof r[1] !== "number" ||
        !Number.isFinite(r[1]) || Math.abs(r[1]) > 1e12))
    throw Error("Unsupported assigned SUM dataset.");
  return rows.map(r => String(r[1]));
}
function sameNumber(value, expected) {
  try { return syntax.numericCell(value) === Number(expected); }
  catch { return false; }
}
export function practiceCriteria(activity, rows, values, formula, toolState) {
  validatePracticeMode(activity);
  if (activity === "free") throw Error("A practice activity is required.");
  const original = baseline(rows), target = [...original];
  const inputs = Array.isArray(values) && values.length === 3 &&
    Object.keys(values).length === 3 && [0, 1, 2].every(i => Object.hasOwn(values, i))
    ? values : [];
  if (activity === "independent-match-v1" || activity === "independent-copy-v1") target[1] = original[0];
  const labels = [
    "B2 retains the original value",
    activity === "guided-sum-v1" ? "B3 retains the original value" : "B3 matches the original B2",
    "B4 retains the original value",
    "SUM formula uses B2:B4",
  ];
  const passed = target.map((v,i) => sameNumber(inputs[i],v));
  passed.push(syntax.parse(formula)?.fn === "SUM");
  if (activity === "independent-format-v1") {
    const tools = validateToolState(toolState);
    labels.splice(0, labels.length, "A1 is bold", "A1 has yellow fill", "A1 has borders", "All original numeric values preserved");
    passed.splice(0, passed.length, tools.bold, tools.fill, tools.border,
      original.every((v,i)=>sameNumber(inputs[i],v)));
  } else if (activity === "independent-copy-v1") {
    const tools = validateToolState(toolState);
    labels.push("Used Ribbon Copy B2 and Paste B3");
    passed.push(tools.copy_used);
  }
  return { score: passed.filter(Boolean).length, maxScore: labels.length,
    passed: passed.every(Boolean), criteria: labels.map((label,i)=>({label,passed:passed[i]})) };
}
export function practiceHistory(history, rows, activity) {
  return validateCalculationHistory(history)
    .filter(a => a.activity === activity)
    .map(a => ({ ...a, grade: practiceCriteria(activity, rows, a.values, a.formula, a.tool_state),
      currentEvaluation: reviewCalculation(a) }));
}
