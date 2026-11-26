/* F1: bounded beginner formula practice, using fictional versioned D1 data. */
(function(global){
  'use strict';
  const curriculum=global.CommonplaceExcelCurriculum;
  // Exact versions keep this personal adapter stable as the catalog grows.
  const runtime={id:"personal-formulas",version:1};
  const rubric={id:"formula-foundations",version:1};
  function lesson(id){
    const ref=curriculum.resolveRuntime(runtime).lessons.find(item=>item.id===id);
    if(!ref)throw Error("Unknown lesson.");
    return curriculum.resolveLesson(ref);
  }
  function scenario(id,version){
    const s=global.CommonplaceExcelScenarios?.list().find(x=>x.id===id&&x.version===version);
    if(!s)throw Error("Unknown scenario version.");
    return s;
  }
  function exercise(id,scenarioId,version,mode="guided"){
    if(!["guided","independent"].includes(mode))throw Error("Unknown practice mode.");
    const l=lesson(id),s=scenario(scenarioId,version),values=s.values.map(String);
    if(mode==="independent"){
      if(id==="count"||id==="average")values[1]="";
      else values[1]=String(s.revised);
    }
    const unit=l.fn==="COUNT"?"numeric cells":s.unit;
    return {lesson:l,scenario:s,mode,values,unit,formula:l.worksheet.formula,
      instruction:l.task+" in "+l.worksheet.outputCell+" using "+l.fn+". "+(mode==="independent"?"Keep the three starting cells unchanged.":"You can change the inputs to explore how the formula behaves.")};
  }
  function evaluate(formula,values){
    return curriculum.evaluateFormula(runtime,formula,values);
  }
  function grade(ex,formula,values){
    return curriculum.gradeFormula(rubric,ex,formula,values);
  }
  global.CommonplaceExcelFormulaFoundations={list:()=>curriculum.listLessons(runtime),exercise,evaluate,grade};
})(window);
