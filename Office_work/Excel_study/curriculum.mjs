// The same reviewed core serves classic personal pages and module-based hosts.
import "./formula-syntax.js";
import "./excel-curriculum.js";
export const curriculum = globalThis.CommonplaceExcelCurriculum ?? globalThis.window?.CommonplaceExcelCurriculum;
