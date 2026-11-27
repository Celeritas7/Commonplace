import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {curriculum} from "../../Office_work/Excel_study/curriculum.mjs";
const w={};
for(const name of ["formula-syntax.js","excel-curriculum.js","excel-scenarios.js","excel-summary-foundations.js","excel-pivot-foundations.js"])
  new Function("window",readFileSync(new URL("../../Office_work/Excel_study/"+name,import.meta.url),"utf8"))(w);
const A=w.CommonplaceExcelPivotFoundations;
const runtime={id:"personal-pivots",version:1},rubric={id:"pivot-foundations",version:1};
const fixture=(id="pivot-group-total",mode="guided")=>A.exercise(id,"jp-ph-trade",1,mode);

test("F5B exact references keep previous runtimes pinned",()=>{
  assert.deepEqual(curriculum.listLessons(runtime).map(l=>l.id),["pivot-group-total","pivot-status-count","pivot-filtered-total"]);
  for(const l of A.list()){
    assert.deepEqual(l.rubric,rubric);
    assert.equal(curriculum.resolveCapability(l.capability_id).engine,"bounded-pivot.v1");
  }
  for(const [id,n] of [["assigned-sum",1],["personal-conditional-summaries",3],["personal-lookups",2]]){
    assert.equal(curriculum.listLessons({id,version:1}).length,n);
    assert.throws(()=>curriculum.pivotView({id,version:1},fixture().lesson.goal,fixture().values));
  }
  assert.throws(()=>curriculum.pivotView({...runtime,version:2},fixture().lesson.goal,fixture().values));
});
test("F5B all 30 identities pin the reviewed source and grade correct grouped totals, counts and filters",()=>{
  const ids=new Set();
  for(const s of w.CommonplaceExcelScenarios.list())for(const l of A.list())for(const mode of ["guided","independent"]){
    const ex=A.exercise(l.id,s.id,s.version,mode),v=ex.values,config=l.goal,before=structuredClone(ex),snapshot=A.capture(v);
    const old=w.CommonplaceExcelSummaryFoundations.exercise("sumif-status",s.id,s.version,mode);
    assert.deepEqual(v,Object.fromEntries(Object.entries(old.values).filter(([key])=>/^[ABCD][2-7]$/.test(key))));
    ids.add(ex.dataset.id);
    const included=[2,3,4,5,6,7].filter(i=>config.filter==="all"||v["B"+i]===config.filter);
    const expected=config.values==="sum-amount"?included.reduce((sum,i)=>sum+Number(v["D"+i]),0):included.length;
    const grade=A.grade(ex,config,snapshot,v);
    assert.equal(grade.passed,true);assert.equal(grade.maxScore,mode==="guided"?6:7);
    assert.equal(grade.view.grandTotal,expected);
    assert.deepEqual(grade.view.includedRows,included);
    assert.equal(grade.view.rows.reduce((sum,row)=>sum+row.total,0),expected);
    assert.equal(grade.view.columnTotals.reduce((sum,n)=>sum+n,0),expected);
    assert.deepEqual(grade,curriculum.gradePivot(rubric,ex,config,snapshot,v));
    assert.deepEqual(ex,before);
  }
  assert.equal(ids.size,30);
  assert.throws(()=>A.exercise("unknown","jp-ph-trade",1,"guided"));
  assert.throws(()=>A.exercise("pivot-group-total","jp-ph-trade",2,"guided"));
});
test("F5B grouped cells, empty intersections, zero values, report filters and deterministic totals",()=>{
  const ex=fixture(),v=ex.values,config=ex.lesson.goal;
  assert.deepEqual(A.view(config,v).rows,[{label:"Cebu",cells:[5800],total:5800},{label:"Manila",cells:[3400],total:3400}]);
  assert.equal(A.view(config,v).grandTotal,9200);
  const grid=A.view({rows:"group",columns:"status",values:"count-records",filter:"all"},v);
  assert.deepEqual(grid.columns,["Completed","Pending","Ready"]);
  assert.deepEqual(grid.rows,[{label:"Cebu",cells:[1,1,1],total:3},{label:"Manila",cells:[null,1,2],total:3}]);
  assert.deepEqual(grid.columnTotals,[1,2,3]);assert.equal(grid.grandTotal,6);
  const filtered=A.view({...config,filter:"Ready"},v);
  assert.deepEqual(filtered.rows.map(row=>row.total),[2400,1800]);assert.equal(filtered.grandTotal,4200);
  const zero={...v,D2:"0",D4:"0",D5:"0"};
  assert.equal(A.view(config,zero).rows[1].cells[0],0);
  assert.equal(A.view(config,{...v,C2:"manila"}).rows.length,2);
  assert.equal(A.view(config,{...v,D2:"-5",D3:"2.5"}).grandTotal,4997.5);
  const none=Object.fromEntries(Object.entries(v).map(([key,val])=>[key,key[0]==="B"?"Pending":val]));
  assert.deepEqual(A.view({...config,filter:"Ready"},none),{columns:["Sum of Amount"],rows:[],columnTotals:[0],grandTotal:0,includedRows:[]});
});
test("F5B stale and invalid sources preserve the captured result and lose freshness separately",()=>{
  for(const mode of ["guided","independent"]){
    const ex=fixture("pivot-group-total",mode),v=ex.values,config=ex.lesson.goal,snapshot=A.capture(v);
    const saved=structuredClone(snapshot),original=A.view(config,snapshot),changed={...v,D2:String(+v.D2+100)};
    const stale=A.grade(ex,config,snapshot,changed);
    assert.deepEqual(stale.view,original);
    assert.deepEqual(stale.criteria.map(c=>c.passed),mode==="guided"?[true,true,true,true,false,false]:[true,true,true,true,false,false,false]);
    const refreshed=A.grade(ex,config,A.capture(changed),changed);
    assert.equal(refreshed.view.grandTotal,original.grandTotal+100);
    assert.equal(refreshed.score,6);assert.equal(refreshed.passed,mode==="guided");
    assert.deepEqual(snapshot,saved);
    const invalid={...v,D2:"bad"};
    assert.throws(()=>A.capture(invalid));
    assert.deepEqual(A.grade(ex,config,snapshot,invalid).view,original);
    assert.equal(A.grade(ex,config,snapshot,invalid).criteria.find(c=>c.id==="fresh-source").passed,false);
    assert.equal(A.grade(ex,null,null,v).score,mode==="guided"?0:1);
  }
  // A count can be numerically unchanged after an amount edit but still stale.
  const ex=fixture("pivot-status-count","guided"),changed={...ex.values,D2:"999"};
  const grade=A.grade(ex,ex.lesson.goal,A.capture(ex.values),changed);
  assert.equal(grade.criteria.find(c=>c.id==="pivot-output").passed,true);
  assert.equal(grade.criteria.find(c=>c.id==="fresh-source").passed,false);
});
test("F5B invalid layouts, invalid source shapes, and tampered goal metadata cannot bypass validation",()=>{
  const ex=fixture(),v=ex.values,config=ex.lesson.goal;
  for(const bad of [{...config,columns:"group"},{...config,rows:"status",filter:"Ready"},{...config,columns:"status",filter:"Ready"},{...config,values:"average"},{...config,extra:1},{...config,rows:"__proto__"}])assert.throws(()=>A.layout(bad));
  for(const bad of [{...v,B2:"Unknown"},{...v,A2:""},{...v,C2:"*"},{...v,D2:""},{...v,extra:"1"}])assert.throws(()=>A.capture(bad));
  const altered=structuredClone(ex);altered.lesson.goal.values="count-records";
  assert.equal(A.grade(altered,config,A.capture(v),v).passed,true);
  assert.throws(()=>curriculum.gradePivot({id:"lookup-foundations",version:1},ex,config,A.capture(v),v));
});
