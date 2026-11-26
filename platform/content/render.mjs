import {prepareExcelExercise} from './excel-contract.mjs';
import {curriculum} from '../../Office_work/Excel_study/curriculum.mjs';
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
// Review-only renderer. Uses text nodes for all imported content; never HTML,
// eval, executable formulas, navigation URLs, private files or persistent state.
export function renderExcelPreview(root,input){
 const prepared=prepareExcelExercise(input),{bundle,worksheet}=prepared;
 root.replaceChildren();root.append(node('p','PUBLIC SAMPLE · CONTENT CONTRACT PREVIEW'),node('h2',bundle.concept.title),node('p',bundle.concept.explanation),node('h3',bundle.scenario.title),node('p',bundle.scenario.context),node('p',bundle.scenario.instructions));
 const table=node('table'),head=node('tr');head.append(node('th','Cell'),...worksheet.headers.map(h=>node('th',h)));table.append(head);
 const inputs=[];worksheet.rows.forEach((row,i)=>{const tr=node('tr'),cell=node('td'),input=node('input');input.type='number';input.value=String(row[1]);input.step='any';input.setAttribute('aria-label',worksheet.inputCells[i]);cell.append(input);inputs.push(input);tr.append(node('th',String(i+2)),node('td',row[0]),cell);table.append(tr);});
 root.append(table);const instruction=node('p',bundle.lesson.activities.find(a=>a.id===prepared.activityId).instruction),formula=node('code',worksheet.formula),calculate=node('button','Calculate total'),output=node('p');output.setAttribute('role','status');
 calculate.onclick=()=>{try{const result=curriculum.evaluateFormula(prepared.runtimeRef,worksheet.formula,inputs.map(n=>n.value));output.textContent=`${worksheet.outputCell}: ${result.result} ${bundle.dataset.columns[1].unit}`;}catch{output.textContent='Enter a valid number in all three cells.';}};root.append(instruction,formula,calculate,output);
 return prepared;
}
