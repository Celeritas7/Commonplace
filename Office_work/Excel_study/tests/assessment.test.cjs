'use strict';
const fs=require('node:fs');
const path=require('node:path');
function run(sources){
const w={crypto:{randomUUID:()=> '12345678-1234-4234-8234-123456789abc'}};
class E {
 constructor(tag='div'){this.tag=tag;this.children=[];this.events={};this.dataset={};this.classes=new Set();this.classList={contains:k=>this.classes.has(k),toggle:(k,v)=>v?this.classes.add(k):this.classes.delete(k)};this.value='';this.textContent='';this.hidden=false;}
 append(x){this.children.push(x);}
 replaceChildren(){this.children=[];}
 addEventListener(k,f){(this.events[k]??=[]).push(f);}
 fire(k,e={}){(this.events[k]||[]).forEach(f=>f(e));}
}
const document={createElement:t=>new E(t)};
sources.forEach(src=>new Function('window','document',src)(w,document));
const {grade,makeRecord,mount}=w.CommonplaceExcelAssessment;
const [stock,heading,copy]=w.CommonplaceExcelAssessments;
const state={cells:{A1:{value:'Item',bold:true,fill:true,border:true},B2:{value:'12'},B3:{value:'10'},B4:{value:'5'},B5:{value:'27'}},formula:'=SUM(B2:B4)'};
const clone=x=>JSON.parse(JSON.stringify(x));
const checks={};function check(k,v){checks[k]=!!v;if(!v)throw Error(k);}
check('stock full score',grade(stock,state).score===4&&grade(stock,state).passed);
let s=clone(state);s.cells.B3.value='8';s.cells.B5.value='25';check('partial grade',grade(stock,s).score===2&&!grade(stock,s).passed);
s=clone(state);s.cells.B2.value='13';s.cells.B4.value='4';check('same total but wrong input blocked',grade(stock,s).score===3);
s=clone(state);s.formula='=SUM(B1:B4)';check('wrong formula blocked',grade(stock,s).score===3);
s=clone(state);s.formula=' =sum( B2:B4 ) ';check('formula whitespace and case accepted',grade(stock,s).passed);
s=clone(state);s.cells.B3.value='10.0';check('equivalent numeric entry accepted',grade(stock,s).passed);
s=clone(state);s.cells.B5.value='—';check('unapplied formula rejected',grade(stock,s).score===3);
check('heading correct',grade(heading,state).passed);
s=clone(state);s.cells.A1.bold=false;s.cells.A1.value='Products';check('heading preserves data and style',grade(heading,s).score===2);
s=clone(state);s.cells.B3.value='12';s.cells.B5.value='29';check('matching stock assignment',grade(copy,s).passed);
const record=makeRecord(stock,state,{attemptId:'id-1',startedAt:'2026-01-01T00:00:00Z',submittedAt:'2026-01-01T00:01:00Z'});
check('versioned central section id',record.schema_version===1&&record.section==='office.excel'&&record.assessment_version===1);
check('captured exact responses',record.results[0].response.value==='10'&&record.results[1].response.length===2&&record.results[2].response.value==='=SUM(B2:B4)');
check('no user identity or answer keys',!('user_id'in record)&&!('email'in record)&&!JSON.stringify(record).includes('"expected"')&&record.grading==='client-self-assessment');
const root=new E(),panel=new E(),fields={};for(const k of ['picker','start','submit','cancel','scenario','task','status','results','history'])fields[k]=new E();
panel.querySelector=s=>fields[s.match(/data-assessment-(.+)\]/)[1]];
const formula={value:state.formula},cells=Object.entries(state.cells).map(([id,c])=>({dataset:{cell:id},querySelector:()=>null,textContent:c.value,classList:{contains:k=>!!c[k.replace('excel-','')]}}));
root.querySelectorAll=()=>cells;root.querySelector=()=>formula;
let resets=0,prepares=0,submitted=[],tab='',selected='';
const controller=mount({root,panel,simulator:{showTab:t=>tab=t,select:c=>selected=c},lessons:w.CommonplaceExcelAssessments,resetWorksheet:()=>{resets++;root.fire('excel-action',{detail:{type:'reset'}});},prepare:()=>prepares++,onSubmitted:r=>submitted.push(r)});
check('initial state no reset',!controller.active&&resets===0);
fields.start.fire('click');check('start active',controller.active&&resets===1&&prepares===1&&tab==='Home'&&selected==='B2');
fields.submit.fire('click');check('submit scored snapshot',!controller.active&&controller.records.length===1&&submitted.length===1&&submitted[0].score===4);
fields.submit.fire('click');check('double submit ignored',controller.records.length===1);
fields.start.fire('click');fields.cancel.fire('click');check('cancel no record',!controller.active&&controller.records.length===1);
fields.start.fire('click');root.fire('excel-action',{detail:{type:'reset'}});check('external reset cancels',!controller.active&&controller.records.length===1);
fields.picker.value='stock-heading';fields.picker.fire('change');fields.start.fire('click');fields.submit.fire('click');check('retry retains previous record',controller.records.length===2&&controller.records[1].assessment_id==='stock-heading'&&controller.records[1].passed);
submitted[0].score=0;check('sink receives copy',controller.records[0].score===4);
return checks;
}
const sources=['excel-assessment.js','excel-assessment-lessons.js'].map(name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8'));
console.log(Object.keys(run(sources)).length+' independent assessment checks passed (mock DOM).');
