import {composeLesson} from './contracts.mjs';
// Reviewed against main 8cd37c2: Phase A supports this existing exercise,
// not the AutoSum Ribbon button or the unmerged Phase B operations in PR #70.
export const EXCEL_PHASE_A_CAPABILITIES=Object.freeze(['explanation.text.v1','excel.sum.b2-b4.v1']);
export function prepareExcelExercise(input){
 const bundle=composeLesson(input,EXCEL_PHASE_A_CAPABILITIES);
 if(bundle.lesson.section_id!=='office.excel'||!bundle.lesson.required_capabilities.includes('excel.sum.b2-b4.v1'))throw Error('Excel fixed SUM contract required');
 const sums=bundle.lesson.activities.filter(a=>a.type==='sum-column');
 if(sums.length!==1||bundle.dataset.rows.length!==3||bundle.dataset.columns.length!==2||bundle.dataset.columns[0].type!=='text'||bundle.dataset.columns[1].type!=='number'||sums[0].column_key!==bundle.dataset.columns[1].key)throw Error('Phase A requires one SUM activity and three text/number rows');
 return {bundle,worksheet:{headers:bundle.dataset.columns.map(c=>c.label),rows:structuredClone(bundle.dataset.rows),inputCells:['B2','B3','B4'],outputCell:'B5',formula:'=SUM(B2:B4)'},activityId:sums[0].id};
}
