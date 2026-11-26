// Bounded calculation history for authorized, versioned Excel SUM assignments.
export const CALCULATION_HISTORY_LIMIT = 40;
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
        Object.keys(a).sort().join() !== "accepted,formula,id,result,submitted_at,values" ||
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
export function appendCalculation(history, values, formula, { id, submittedAt }) {
  const next = validateCalculationHistory(history);
  if (next.length >= CALCULATION_HISTORY_LIMIT) return null;
  if (!inputShape(values, formula)) throw Error("Calculation input is too long to record.");
  const evaluation = evaluate(values, formula);
  next.push({ id, submitted_at: submittedAt, values: [...values], formula, ...evaluation });
  return validateCalculationHistory(next);
}
