import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { curriculum } from "../../Office_work/Excel_study/curriculum.mjs";
const w={};
for(const name of ["formula-syntax.js","excel-curriculum.js","excel-scenarios.js","excel-lookup-foundations.js"])
  new Function("window",readFileSync(new URL("../../Office_work/Excel_study/"+name,import.meta.url),"utf8"))(w);
const A=w.CommonplaceExcelLookupFoundations;
const runtime={id:"personal-lookups",version:1},rubric={id:"lookup-foundations",version:1};
const x='=XLOOKUP(E2,A2:A4,C2:C4)',v='=VLOOKUP(E2,A2:C4,3,FALSE)';
const fixture=()=>A.exercise("xlookup-exact","jp-ph-trade",1,"independent");

test("F4C new exact references do not expand released decision, conditional or assigned runtimes",()=>{
  assert.deepEqual(curriculum.listLessons(runtime).map(l=>l.id),["xlookup-exact","vlookup-exact"]);
  for(const lesson of A.list()){
    assert.deepEqual(lesson.rubric,rubric);
    assert.equal(curriculum.resolveCapability(lesson.capability_id).engine,"bounded-lookup.v1");
  }
  for(const [id,lesson] of [["personal-decisions","if-minimum-target"],["personal-conditional-formatting","highlight-below-target"],["assigned-sum","sum"]]){
    assert.deepEqual(curriculum.listLessons({id,version:1}).map(l=>l.id),[lesson]);
    assert.throws(()=>curriculum.evaluateLookupFormula({id,version:1},x,fixture().values));
  }
  assert.throws(()=>curriculum.evaluateLookupFormula({...runtime,version:2},x,fixture().values));
});

test("F4C both functions across all five contexts and both modes retrieve exact unsorted catalog amounts",()=>{
  const ids=new Set();
  for(const s of w.CommonplaceExcelScenarios.list())for(const l of A.list())for(const mode of ["guided","independent"]){
    const ex=A.exercise(l.id,s.id,s.version,mode),before=structuredClone(ex),f=ex.lesson.worksheet.formula;
    ids.add(ex.dataset.id);
    const row=[2,3,4].find(i=>ex.values["A"+i]===ex.values.E2);
    const grade=A.grade(ex,f,ex.values);
    assert.equal(grade.passed,true);
    assert.equal(grade.maxScore,mode==="guided"?5:6);
    assert.deepEqual(grade.evaluated,{result:Number(ex.values["C"+row]),error:null,matchedCell:"C"+row});
    assert.deepEqual(grade,curriculum.gradeLookup(rubric,ex,f,ex.values));
    assert.equal(A.grade(ex,l.fn==="XLOOKUP"?v:x,ex.values).score,grade.maxScore-1);
    assert.deepEqual(ex,before);
    assert.equal(A.evaluate(f,{...ex.values,E2:ex.values.E2.toLowerCase()}).result,grade.evaluated.result);
    assert.equal(A.evaluate(f,{...ex.values,["C"+row]:"0"}).result,0);
    assert.equal(A.evaluate(f,{...ex.values,["C"+row]:"123.45"}).result,123.45);
    assert.equal(A.evaluate(f,{...ex.values,A2:ex.values.E2,A3:ex.values.E2}).matchedCell,"C2");
    assert.deepEqual(A.evaluate(f,{...ex.values,E2:"MISSING-999"}),{result:null,error:"#N/A",matchedCell:null});
  }
  assert.equal(ids.size,20);
  assert.throws(()=>A.exercise("unknown","jp-ph-trade",1,"guided"));
  assert.throws(()=>A.exercise("xlookup-exact","jp-ph-trade",2,"guided"));
});

test("F4C bounded syntax requires exact matching and complete contiguous reference tokens",()=>{
  const {values}=fixture();
  assert.deepEqual(A.evaluate(' = xlookup( $E$2 , $A$2:$A$4 , $C$2:$C$4 ,,0 ) ',values),A.evaluate(x,values));
  assert.deepEqual(A.evaluate('=VLOOKUP(E2,A2:C4,3,0)',values),A.evaluate(v,values));
  for(const f of ['=VLOOKUP(E2,A2:C4,3)','=VLOOKUP(E2,A2:C4,3,TRUE)','=VLOOKUP(E2,A2:B4,3,FALSE)',
    '=XLOOKUP(E2,A2:A4,C2:C3)','=XLOOKUP(E2,A2:A4,C2:C4,,1)','=XLOOKUP(E2,A2:A4,C2:C4,,2)',
    '=X LOOKUP(E2,A2:A4,C2:C4)','=XLOOKUP(E 2,A2:A4,C2:C4)','=XLOOKUP(E2,A2:A4,C2:C4)\n',
    '=XLOOKUP(E2,A2:A4,C2:C4)+1','=XLOOKUP(E2,A4:A2,C2:C4)'])assert.throws(()=>A.evaluate(f,values));
  for(const bad of ["","*","JP-1?","A\n"," A1","123","A".repeat(25)])assert.throws(()=>A.evaluate(x,{...values,E2:bad}));
  assert.throws(()=>A.evaluate(x,{...values,A4:""}));
  assert.throws(()=>A.evaluate(x,{...values,E2:values.A3,C3:"text"}));
});

test("F4C independent criteria distinguish formula structure from correct amounts and preserve original data",()=>{
  const ex=fixture(),cells=ex.values;
  assert.equal(A.grade(ex,x,cells).score,6);
  const wrongRange=A.grade(ex,'=XLOOKUP(E2,A2:A3,C2:C3)',cells);
  assert.deepEqual(wrongRange.criteria.map(c=>c.passed),[true,true,false,false,true,true]);
  const wrongReturn=A.grade(ex,'=XLOOKUP(E2,A2:A4,B2:B4)',cells);
  assert.deepEqual(wrongReturn.criteria.map(c=>c.passed),[true,true,true,false,false,true]);
  assert.equal(A.grade(ex,x,{...cells,B2:"Changed label"}).score,5);
  const missing=A.grade(ex,x,{...cells,E2:"MISSING-999"});
  assert.deepEqual(missing.criteria.map(c=>c.passed),[true,true,true,true,false,false]);
  assert.equal(missing.evaluated.error,"#N/A");
  const invalid=A.grade(ex,'=VLOOKUP(E2,A2:C4,3,TRUE)',cells);
  assert.deepEqual(invalid.criteria.map(c=>c.passed),[false,false,false,false,false,true]);
  const tampered=structuredClone(ex);
  tampered.lesson.worksheet.returns="B2:B4";
  assert.equal(A.grade(tampered,x,cells).passed,true);
  assert.throws(()=>curriculum.gradeLookup({id:"decision-foundations",version:1},ex,x,cells));
});
