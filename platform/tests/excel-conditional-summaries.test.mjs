import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {curriculum} from "../../Office_work/Excel_study/curriculum.mjs";
const w={};
for(const name of ["formula-syntax.js","excel-curriculum.js","excel-scenarios.js","excel-summary-foundations.js"])
  new Function("window",readFileSync(new URL("../../Office_work/Excel_study/"+name,import.meta.url),"utf8"))(w);
const A=w.CommonplaceExcelSummaryFoundations;
const runtime={id:"personal-conditional-summaries",version:1},rubric={id:"conditional-summary-foundations",version:1};
const sum='=SUMIF(B2:B7,F2,D2:D7)',both='=SUMIFS(D2:D7,B2:B7,F2,C2:C7,F3)',count='=COUNTIF(B2:B7,F2)';
const fixture=(id="sumif-status",mode="guided")=>A.exercise(id,"jp-ph-trade",1,mode);

test("F5A exact references preserve prior runtimes",()=>{
  assert.deepEqual(curriculum.listLessons(runtime).map(l=>l.id),["sumif-status","sumifs-status-group","countif-status"]);
  for(const l of A.list()){
    assert.deepEqual(l.rubric,rubric);
    assert.equal(curriculum.resolveCapability(l.capability_id).engine,"bounded-conditional-summary.v1");
  }
  for(const [id,n] of [["assigned-sum",1],["personal-decisions",1],["personal-conditional-formatting",1],["personal-lookups",2]]){
    assert.equal(curriculum.listLessons({id,version:1}).length,n);
    assert.throws(()=>curriculum.evaluateSummaryFormula({id,version:1},sum,fixture().values));
  }
  assert.throws(()=>curriculum.evaluateSummaryFormula({...runtime,version:2},sum,fixture().values));
});

test("F5A all 30 distinct context/mode/lesson datasets exercise zero, exact status and both AND conditions",()=>{
  const ids=new Set();
  for(const s of w.CommonplaceExcelScenarios.list())for(const l of A.list())for(const mode of ["guided","independent"]){
    const ex=A.exercise(l.id,s.id,s.version,mode),v=ex.values,before=structuredClone(ex),formula=l.worksheet.formula;
    ids.add(ex.dataset.id);
    const matching=[2,3,4,5,6,7].filter(i=>v["B"+i]===v.F2&&(l.fn!=="SUMIFS"||v["C"+i]===v.F3));
    const expected=l.fn==="COUNTIF"?matching.length:matching.reduce((a,i)=>a+Number(v["D"+i]),0);
    assert.equal(matching.length,l.fn==="SUMIFS"?2:3);
    assert.ok(matching.some(i=>v["D"+i]==="0"));
    const grade=A.grade(ex,formula,v);
    assert.equal(grade.passed,true);
    assert.equal(grade.maxScore,(l.fn==="COUNTIF"?4:5)+(mode==="independent"?1:0));
    assert.equal(grade.evaluated.result,expected);
    assert.deepEqual(grade.evaluated.matched,matching.map(i=>({criteria:l.fn==="SUMIFS"?["B"+i,"C"+i]:["B"+i],amount:l.fn==="COUNTIF"?null:"D"+i})));
    assert.deepEqual(grade,curriculum.gradeSummary(rubric,ex,formula,v));
    assert.deepEqual(ex,before);
    assert.equal(A.evaluate(formula,{...v,F2:v.F2.toLowerCase()}).result,expected);
    assert.equal(A.evaluate(formula,{...v,F2:"Absent"}).result,0);
    assert.equal(A.grade(ex,formula.replace("F2",'"'+v.F2+'"'),v).score,grade.maxScore-1);
    if(l.fn==="SUMIFS"){
      assert.equal(A.grade(ex,"=SUMIFS(D2:D7,C2:C7,F3,B2:B7,F2)",v).passed,true);
      assert.ok(A.evaluate(sum,v).result>expected);
    }
  }
  assert.equal(ids.size,30);
  assert.throws(()=>A.exercise("missing","jp-ph-trade",1,"guided"));
  assert.throws(()=>A.exercise("sumif-status","jp-ph-trade",2,"guided"));
});

test("F5A distinguishes sums and counts, accepts supported locks, and rejects unsupported or misaligned expressions",()=>{
  const v=fixture().values;
  assert.equal(A.evaluate(sum,v).result,4200);
  assert.equal(A.evaluate(both,v).result,1800);
  assert.equal(A.evaluate(count,v).result,3);
  assert.equal(A.evaluate(" = sumif( $B$2 : $B$7 , $F$2 , $D$2:$D$7 ) ",v).result,4200);
  assert.equal(A.evaluate(sum,{...v,D2:"-5",D3:"2.25"}).result,-2.75);
  assert.equal(A.evaluate(count,{...v,D7:"text"}).result,3);
  assert.equal(A.evaluate(count,{...v,F2:"Absent"}).result,0);
  assert.throws(()=>A.evaluate(sum,{...v,D7:"text"}));
  assert.throws(()=>A.evaluate(sum,{...v,D7:""}));
  assert.throws(()=>A.evaluate(sum,{...v,F2:""}));
  assert.throws(()=>A.evaluate(count,{...v,B7:"*"}));
  for(const f of ["=SUMIF(B2:B7,F2,D2:D6)","=SUMIF(B7:B2,F2,D2:D7)",'=SUMIF(B2:B7,"R*",D2:D7)',
    '=SUMIF(B2:B7,">5",D2:D7)',"=SUM IF(B2:B7,F2,D2:D7)","=COUNTIF(B 2:B7,F2)","=COUNTIF(B2:B7,F2)\n",
    "=COUNTIF(B2:B7,F2)+1","=SUMIFS(D2:D7,B2:B7,F2)","=SUMIF(B2:B7,F2)"])assert.throws(()=>A.evaluate(f,v));
  const shifted=A.evaluate("=SUMIF(B2:B6,F2,D3:D7)",v);
  assert.deepEqual(shifted.matched,[{criteria:["B2"],amount:"D3"},{criteria:["B3"],amount:"D4"},{criteria:["B5"],amount:"D6"}]);
  assert.equal(shifted.result,6500);
});

test("F5A grades criteria references and original values independently",()=>{
  const ex=fixture("sumif-status","independent"),v=ex.values;
  assert.equal(A.grade(ex,sum,v).score,6);
  assert.deepEqual(A.grade(ex,sum.replace("F2",'"Pending"'),v).criteria.map(c=>c.passed),[true,true,false,true,true,true]);
  assert.equal(A.grade(ex,sum,{...v,A2:"Changed record"}).score,5);
  assert.equal(A.grade(ex,sum,{...v,F2:"Absent"}).score,5);
  const bad=A.grade(ex,"=SUM IF(B2:B7,F2,D2:D7)",v);
  assert.deepEqual(bad.criteria.map(c=>c.passed),[false,false,false,false,false,true]);
  const tampered=structuredClone(ex);
  tampered.lesson.worksheet.sumRange="D2:D6";
  assert.equal(A.grade(tampered,sum,v).passed,true);
  assert.throws(()=>curriculum.gradeSummary({id:"lookup-foundations",version:1},ex,sum,v));
});
