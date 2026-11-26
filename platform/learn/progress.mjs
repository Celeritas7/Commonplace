import { progressIdentity } from "../content/contracts.mjs";
import { validateCalculationHistory, validatePracticeMode } from "../../Office_work/Excel_study/calculation-history.mjs";
const object = (value, keys) =>
  value &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.keys(value).sort().join() === keys.slice().sort().join();
export function memoryStorage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i],
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, String(v)),
  };
}
export async function studyIdentity(material, lesson) {
  if (material.payload.content.format === "bundle") {
    if (!lesson) throw Error("Authorized lesson required.");
    const activity =
      lesson.bundle.lesson.activities.find((a) => a.type === "sum-column") ||
      lesson.bundle.lesson.activities[0];
    return progressIdentity(lesson.assignment, lesson.bundle, activity.id);
  }
  return `material-v1:${material.id}:${material.version}`;
}
export function validateAttempt(value, material) {
  if (
    !object(value, ["version", "completed", "responses", "worksheet"]) ||
    value.version !== 1 ||
    typeof value.completed !== "boolean" ||
    !Array.isArray(value.responses)
  )
    throw Error("Saved progress could not be restored.");
  const questions =
    material.payload.content.format === "document"
      ? material.payload.content.blocks.filter((b) => b.kind === "question")
      : [];
  if (
    value.responses.length !== questions.length ||
    value.responses.some(
      (v, i) =>
        v !== null &&
        (!Number.isInteger(v) || v < 0 || v >= questions[i].choices.length),
    )
  )
    throw Error("Saved responses could not be restored.");
  const sum =
    material.payload.content.format === "bundle" &&
    material.payload.content.bundle.lesson.required_capabilities.includes(
      "excel.sum.b2-b4.v1",
    );
  if (sum) {
    const w = value.worksheet;
    if (
      (!object(w, ["values", "formula", "applied"]) &&
        !object(w, ["values", "formula", "applied", "attempts"]) &&
        !object(w, ["values", "formula", "applied", "practice_mode"]) &&
        !object(w, ["values", "formula", "applied", "attempts", "practice_mode"])) ||
      !Array.isArray(w.values) ||
      w.values.length !== 3 ||
      w.values.some((v) => typeof v !== "string" || v.length > 40) ||
      typeof w.formula !== "string" ||
      w.formula.length > 80 ||
      typeof w.applied !== "boolean"
    )
      throw Error("Saved worksheet could not be restored.");
    if (Object.hasOwn(w, "attempts")) validateCalculationHistory(w.attempts);
    if (Object.hasOwn(w, "practice_mode")) validatePracticeMode(w.practice_mode);
  } else if (value.worksheet !== null)
    throw Error("Unexpected saved worksheet.");
  return structuredClone(value);
}
export function initialAttempt(material) {
  const c = material.payload.content;
  return {
    version: 1,
    completed: false,
    responses:
      c.format === "document"
        ? c.blocks.filter((b) => b.kind === "question").map(() => null)
        : [],
    worksheet:
      c.format === "bundle" &&
      c.bundle.lesson.required_capabilities.includes("excel.sum.b2-b4.v1")
        ? {
            values: c.bundle.dataset.rows.map((r) => String(r[1])),
            formula: "",
            applied: false,
          }
        : null,
  };
}
export function openStudyRecords(store, context, material, id) {
  const identity = (kind) => ({
    section: material.payload.section_id,
    kind,
    id,
  });
  const read = (kind, validate, fallback) => {
    const row = store.get(context.ticket, identity(kind));
    return row === null ? fallback : validate(row.value);
  };
  const state = read(
    "progress",
    (v) => validateAttempt(v, material),
    initialAttempt(material),
  );
  const note = read(
    "note",
    (v) => {
      if (
        !object(v, ["version", "text"]) ||
        v.version !== 1 ||
        typeof v.text !== "string" ||
        v.text.length > 4000
      )
        throw Error("Saved notes could not be restored.");
      return v.text;
    },
    "",
  );
  const bookmarked = read(
    "bookmark",
    (v) => {
      if (
        !object(v, ["version", "bookmarked"]) ||
        v.version !== 1 ||
        typeof v.bookmarked !== "boolean"
      )
        throw Error("Saved bookmark could not be restored.");
      return v.bookmarked;
    },
    false,
  );
  return {
    state,
    note,
    bookmarked,
    saveProgress: (value) =>
      store.put(context.ticket, {
        ...identity("progress"),
        value: validateAttempt(value, material),
      }),
    saveNote: (text) => {
      if (typeof text !== "string" || text.length > 4000)
        throw Error("Notes may contain up to 4,000 characters.");
      store.put(context.ticket, {
        ...identity("note"),
        value: { version: 1, text },
      });
    },
    saveBookmark: (bookmarked) => {
      if (typeof bookmarked !== "boolean") throw Error("Invalid bookmark.");
      store.put(context.ticket, {
        ...identity("bookmark"),
        value: { version: 1, bookmarked },
      });
    },
  };
}
