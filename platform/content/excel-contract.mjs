import { composeLesson } from "./contracts.mjs";
import { curriculum } from "../../Office_work/Excel_study/curriculum.mjs";

// Runtime support and publication support are distinct. These exact bindings
// preserve the existing central wire contract; personal lessons do not widen it.
const curriculumRef = Object.freeze({ id: "sum", version: 1 });
const runtimeRef = Object.freeze({ id: "assigned-sum", version: 1 });
const lesson = curriculum.resolveLesson(curriculumRef);
const capability = curriculum.resolveCapability(lesson.capability_id);
const runtime = curriculum.resolveRuntime(runtimeRef);
export const EXCEL_ASSIGNED_CAPABILITIES = Object.freeze([...runtime.capabilities]);
// Compatibility for existing consumers, saved-pack and backup adapters.
export const EXCEL_PHASE_A_CAPABILITIES = EXCEL_ASSIGNED_CAPABILITIES;

export function prepareExcelExercise(input) {
  const bundle = composeLesson(input, EXCEL_ASSIGNED_CAPABILITIES);
  if (bundle.lesson.section_id !== "office.excel" ||
      !bundle.lesson.required_capabilities.includes(lesson.capability_id))
    throw Error("Excel fixed SUM contract required");
  const activities = bundle.lesson.activities.filter(a => a.type === capability.activity_type);
  const model = lesson.worksheet;
  if (activities.length !== 1 || bundle.dataset.rows.length !== model.inputCells.length ||
      bundle.dataset.columns.length !== 2 || bundle.dataset.columns[0].type !== "text" ||
      bundle.dataset.columns[1].type !== "number" ||
      activities[0].column_key !== bundle.dataset.columns[1].key)
    throw Error("Assigned SUM requires one SUM activity and three text/number rows");
  return {
    bundle,
    worksheet: {
      headers: bundle.dataset.columns.map(c => c.label),
      rows: structuredClone(bundle.dataset.rows),
      inputCells: [...model.inputCells],
      outputCell: model.outputCell,
      formula: model.formula,
    },
    activityId: activities[0].id,
    curriculumRef,
    runtimeRef,
  };
}
