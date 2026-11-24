import { validateBundle, validateRecord } from "../content/contracts.mjs";
import { prepareExcelExercise } from "../content/excel-contract.mjs";
export const MATERIAL_TYPES = [
  "example",
  "explanation",
  "guided_exercise",
  "practice",
  "quiz",
  "tutorial",
  "answer_sheet",
  "project",
  "dataset",
  "code",
];
const plain = (value, keys) => {
  if (
    !value ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join() !== [...keys].sort().join()
  )
    throw Error("Missing or unsupported material fields.");
};
const text = (value, max) => {
  if (typeof value !== "string" || !value.trim() || [...value].length > max)
    throw Error("Invalid material text.");
};
export function validateMaterial(value) {
  plain(value, [
    "schema_version",
    "section_id",
    "title",
    "material_type",
    "content",
  ]);
  if (
    value.schema_version !== 1 ||
    !MATERIAL_TYPES.includes(value.material_type) ||
    typeof value.section_id !== "string" ||
    !/^[a-z][a-z0-9.-]{0,79}$/.test(value.section_id)
  )
    throw Error("Unsupported material version, type or section.");
  text(value.title, 160);
  const c = value.content;
  if (!c || typeof c !== "object") throw Error("Content required.");
  if (c.format === "bundle") {
    plain(c, ["format", "bundle"]);
    const b = validateBundle(c.bundle);
    if (b.lesson.section_id !== value.section_id)
      throw Error("Lesson section mismatch.");
    if (b.lesson.required_capabilities.includes("excel.sum.b2-b4.v1"))
      prepareExcelExercise(b);
    else if (
      b.lesson.required_capabilities.some((x) => x !== "explanation.text.v1") ||
      b.lesson.activities.some((a) => a.type !== "explanation")
    )
      throw Error("Unsupported lesson capability.");
  } else if (c.format === "dataset") {
    plain(c, ["format", "dataset"]);
    if (validateRecord(c.dataset).kind !== "dataset")
      throw Error("Dataset required.");
  } else if (c.format === "attachment") plain(c, ["format"]);
  else if (c.format === "document") {
    plain(c, ["format", "blocks"]);
    if (!Array.isArray(c.blocks) || !c.blocks.length || c.blocks.length > 60)
      throw Error("Use 1–60 content blocks.");
    for (const b of c.blocks) {
      if (b.kind === "paragraph") {
        plain(b, ["kind", "text"]);
        text(b.text, 8000);
      } else if (b.kind === "code") {
        plain(b, ["kind", "language", "text"]);
        text(b.language, 40);
        text(b.text, 12000);
      } else if (b.kind === "question") {
        plain(b, ["kind", "text", "choices"]);
        text(b.text, 2000);
        if (
          !Array.isArray(b.choices) ||
          b.choices.length < 2 ||
          b.choices.length > 8 ||
          new Set(b.choices).size !== b.choices.length
        )
          throw Error("Use 2–8 distinct choices.");
        b.choices.forEach((x) => text(x, 500));
      } else throw Error("Unsupported content block.");
    }
  } else throw Error("Unsupported content format.");
  if (new TextEncoder().encode(JSON.stringify(value)).length > 262144)
    throw Error("Material exceeds 256 KiB.");
  return structuredClone(value);
}
export function parseMaterial(source) {
  if (
    typeof source !== "string" ||
    new TextEncoder().encode(source).length > 262144
  )
    throw Error("Import exceeds 256 KiB.");
  return validateMaterial(JSON.parse(source));
}
