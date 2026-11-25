'use strict';
const fs=require('node:fs');
const path=require('node:path');
function runScenarios(sources){
 const w={};for(const s of sources)new Function('window',s)(w);
 const api=w.CommonplaceExcelScenarios,checks={};const check=(k,v)=>{checks[k]=!!v;if(!v)throw Error(k);};
 const expected={'general-office':[25,27,29],'jp-ph-trade':[19,22,21],'ph-customer-quote':[5950,6250,4550],'mechanical-engineering':[42,46,62],'monthly-expenses':[70000,72000,112000]};
 const baseline=JSON.stringify([w.CommonplaceExcelGuidedLessons,w.CommonplaceExcelAssessments]);
 check('five scenarios',api.list().length===5);
 for(const s of api.list()){
  const [total,revised,matching]=expected[s.id],model=api.worksheet(s);
  const g=api.guided(s,w.CommonplaceExcelGuidedLessons),a=api.assessments(s,w.CommonplaceExcelAssessments);
  check(s.id+' worksheet model',model.total===total&&model.rows.every((r,i)=>r[0]===s.labels[i]&&r[1]===s.values[i]));
  const session=w.CommonplaceExcelGuided.createSession(g[0]);session.accept({type:'select',cell:'B5'});session.accept({type:'tab',tab:'Home'});
  const action={type:'tool',tab:'Home',group:'Editing',tool:'AutoSum',cell:'B5',formula:'=SUM(B2:B4)',state:{address:'B5',value:String(total)}};
  check(s.id+' guided rejects wrong total',!session.accept({...action,state:{address:'B5',value:String(total+1)}}));
  check(s.id+' guided correct total',session.accept(action)&&session.done);
  const state={formula:'=SUM(B2:B4)',cells:{A1:{value:s.heading,bold:true,fill:true,border:true},B2:{value:String(s.values[0])},B3:{value:String(s.revised)},B4:{value:String(s.values[2])},B5:{value:String(revised)}}};
  check(s.id+' revised assessment',w.CommonplaceExcelAssessment.grade(a[0],state).passed);
  check(s.id+' heading assessment',w.CommonplaceExcelAssessment.grade(a[1],state).passed);
  state.cells.B3.value=String(s.values[0]);state.cells.B5.value=String(matching);
  check(s.id+' matching assessment',w.CommonplaceExcelAssessment.grade(a[2],state).passed);
  const record=w.CommonplaceExcelAssessment.makeRecord(a[2],state,{attemptId:'test',startedAt:'t1',submittedAt:'t2'});
  check(s.id+' attempt identity',record.scenario_id===s.id&&record.scenario_version===1&&record.assessment_id==='stock-copy'&&record.passed);
 }
 check('base lesson data unchanged',baseline===JSON.stringify([w.CommonplaceExcelGuidedLessons,w.CommonplaceExcelAssessments]));
 const detached=api.select('jp-ph-trade');detached.values[0]=999;check('detached scenarios',api.select('jp-ph-trade').values[0]===6);
 check('unknown preview falls back to general',api.select('unknown').id==='general-office');
 return checks;
}
const sources=["excel-scenarios.js","excel-guided-lessons.js","excel-assessment-lessons.js","excel-guided.js","excel-assessment.js"].map(name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8'));
console.log(Object.keys(runScenarios(sources)).length+' scenario checks passed.');
