import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { curriculum } from "../../Office_work/Excel_study/curriculum.mjs";
const w={};
for(const name of ["formula-syntax.js","excel-curriculum.js","excel-scenarios.js","excel-conditional-foundations.js"])
  new Function("window",readFileSync(new URL("../../Office_work/Excel_study/"+name,import.meta.url),"utf8"))(w);
const A=w.CommonplaceExcelConditionalFoundations;
const runtime={id:"personal-conditional-formatting",version:1},rubric={id:"conditional-foundations",version:1};
const rule=e=>({range:"B2:B4",operator:"lt",threshold:e.threshold,style:"red"});

test("F4B exact lesson and runtime do not expand IF or central publication",()=>{
  const [lesson]=curriculum.listLessons(runtime);
  assert.equal(lesson.id,"highlight-below-target");
  assert.deepEqual(lesson.rubric,rubric);
  assert.equal(curriculum.resolveCapability(lesson.capability_id).engine,"bounded-conditional.v1");
  assert.deepEqual(curriculum.listLessons({id:"personal-decisions",version:1}).map(l=>l.id),["if-minimum-target"]);
  assert.deepEqual(curriculum.listLessons({id:"assigned-sum",version:1}).map(l=>l.id),["sum"]);
  assert.throws(()=>curriculum.conditionalView({id:"personal-decisions",version:1},null,{}));
  assert.throws(()=>curriculum.conditionalView({...runtime,version:2},null,{}));
});
test("F4B all ten separate datasets include strict below, above and equal values",()=>{
  const ids=new Set();
  for(const s of w.CommonplaceExcelScenarios.list())for(const mode of ["guided","independent"]){
    const ex=A.exercise(s.id,s.version,mode),r=rule(ex),before=structuredClone(ex);
    ids.add(ex.dataset.id);
    const grade=A.grade(ex,r,ex.values);
    assert.equal(grade.maxScore,mode==="guided"?5:6);
    assert.equal(grade.passed,true);
    assert.deepEqual(grade.view.highlighted,[mode==="guided"?"B3":"B4"]);
    assert.deepEqual(grade,curriculum.gradeConditional(rubric,ex,r,ex.values));
    assert.deepEqual(ex,before);
  }
  assert.equal(ids.size,10);
  assert.throws(()=>A.exercise("unknown",1,"guided"));
  assert.throws(()=>A.exercise("jp-ph-trade",2,"guided"));
});
test("F4B criteria distinguish wrong settings from coincidentally correct highlights",()=>{
  for(const s of w.CommonplaceExcelScenarios.list())for(const mode of ["guided","independent"]){
    const ex=A.exercise(s.id,s.version,mode),r=rule(ex),max=mode==="guided"?5:6;
    assert.equal(A.grade(ex,{...r,operator:"lte"},ex.values).score,max-2);
    assert.equal(A.grade(ex,{...r,style:"green"},ex.values).score,max-1);
    assert.equal(A.grade(ex,{...r,range:mode==="guided"?"B3":"B4"},ex.values).score,max-1);
    assert.equal(A.grade(ex,{...r,threshold:String(+ex.threshold+1)},ex.values).score,max-2);
    assert.equal(A.grade(ex,null,ex.values).score,mode==="guided"?0:1);
    const changed={...ex.values,B2:String(+ex.threshold-1)};
    assert.ok(A.view(r,changed).highlighted.includes("B2"));
    assert.equal(A.grade(ex,r,changed).score,max-(mode==="independent"?1:0));
    const invalid={...ex.values,B2:"text"};
    assert.deepEqual(A.view(r,invalid).invalid,["B2"]);
    assert.equal(A.grade(ex,r,invalid).score,max-(mode==="independent"?2:1));
  }
});
test("F4B invalid rules are rejected, values remain unchanged and no fabricated highlight is accepted",()=>{
  const ex=A.exercise("jp-ph-trade",1,"independent"),r=rule(ex),applied=A.apply(r),before=structuredClone(applied);
  for(const bad of [{...r,range:"A1:B4"},{...r,range:"__proto__"},{...r,operator:"eval"},
    {...r,style:"other"},{...r,threshold:""},{...r,threshold:"0x10"},{...r,threshold:"1e13"},
    {...r,threshold:"text"},{...r,highlighted:["B2"]}])assert.throws(()=>A.apply(bad));
  assert.deepEqual(applied,before);
  assert.equal(A.apply({...r,threshold:"7.00"}).threshold,"7");
  assert.deepEqual(A.view(r,{B2:"-1",B3:"7",B4:"6.5"}).highlighted,["B2","B4"]);
  assert.deepEqual(A.view(null,ex.values).highlighted,[]);
  assert.deepEqual(A.view(r,{B2:"",B3:"5"}).invalid,["B2","B4"]);
  const tampered=structuredClone(ex);
  tampered.lesson.worksheet.goal.operator="gt";
  assert.equal(A.grade(tampered,r,ex.values).passed,true);
  assert.throws(()=>curriculum.gradeConditional({id:"decision-foundations",version:1},ex,r,ex.values));
});
