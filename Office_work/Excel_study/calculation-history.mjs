// Bounded calculation history for authorized, versioned Excel SUM assignments.
export const CALCULATION_HISTORY_LIMIT = 40;
export const PRACTICE_MODES = Object.freeze(["free", "guided-sum-v1", "independent-match-v1"]);
export function validatePracticeMode(mode) {
  if (!PRACTICE_MODES.includes(mode)) throw Error("Unsupported practice mode.");
  return mode;
}
export function sumResult(values, formula) {
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
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validTime(text) {
  if (typeof text !== "string" || text.length !== 24) return false;
  const time = Date.parse(text);
  return Number.isFinite(time) && new Date(time).toISOString() === text;
}
function inputShape(values, formula) {
  return Array.isArray(values) && values.length === 3 &&
    Object.keys(values).length === 3 &&
    values.every((v) => typeof v === "string" && v.length <= 40) &&
    typeof formula === "string" && formula.length <= 80;
}
function evaluate(values, formula) {
  try { return { accepted: true, result: sumResult(values, formula) }; }
  catch { return { accepted: false, result: null }; }
}
export function validateCalculationHistory(history) {
  if (!Array.isArray(history) || history.length > CALCULATION_HISTORY_LIMIT ||
      Object.keys(history).length !== history.length)
    throw Error("Saved calculation history could not be restored.");
  const seen = new Set();
  for (const a of history) {
    if (!a || Object.getPrototypeOf(a) !== Object.prototype ||
        (Object.keys(a).sort().join() !== "accepted,formula,id,result,submitted_at,values" &&
          Object.keys(a).sort().join() !== "accepted,activity,formula,id,result,submitted_at,values") ||
        (Object.hasOwn(a, "activity") && !PRACTICE_MODES.slice(1).includes(a.activity)) ||
        typeof a.id !== "string" || !uuid.test(a.id) || seen.has(a.id.toLowerCase()) ||
        !validTime(a.submitted_at) || !inputShape(a.values, a.formula))
      throw Error("Saved calculation history could not be restored.");
    const expected = evaluate(a.values, a.formula);
    if (a.accepted !== expected.accepted || a.result !== expected.result)
      throw Error("Saved calculation result is inconsistent.");
    seen.add(a.id.toLowerCase());
  }
  return structuredClone(history);
}
export function appendCalculation(history, values, formula, { id, submittedAt, activity = "free" }) {
  validatePracticeMode(activity);
  const next = validateCalculationHistory(history);
  if (next.length >= CALCULATION_HISTORY_LIMIT) return null;
  if (!inputShape(values, formula)) throw Error("Calculation input is too long to record.");
  const evaluation = evaluate(values, formula);
  next.push({ id, submitted_at: submittedAt, values: [...values], formula, ...evaluation,
    ...(activity === "free" ? {} : { activity }) });
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
  return typeof value === "string" && value.trim() !== "" &&
    Number.isFinite(Number(value)) && Number(value) === Number(expected);
}
export function practiceCriteria(activity, rows, values, formula) {
  validatePracticeMode(activity);
  if (activity === "free") throw Error("A practice activity is required.");
  const original = baseline(rows), target = [...original];
  if (activity === "independent-match-v1") target[1] = original[0];
  const labels = [
    "B2 retains the original value",
    activity === "guided-sum-v1" ? "B3 retains the original value" : "B3 matches the original B2",
    "B4 retains the original value",
    "SUM formula and numeric inputs accepted",
  ];
  const passed = target.map((v,i) => sameNumber(values[i],v));
  passed.push(evaluate(values,formula).accepted);
  return { score: passed.filter(Boolean).length, maxScore: labels.length,
    passed: passed.every(Boolean), criteria: labels.map((label,i)=>({label,passed:passed[i]})) };
}
export function practiceHistory(history, rows, activity) {
  return validateCalculationHistory(history)
    .filter(a => a.activity === activity)
    .map(a => ({ ...a, grade: practiceCriteria(activity, rows, a.values, a.formula) }));
}
