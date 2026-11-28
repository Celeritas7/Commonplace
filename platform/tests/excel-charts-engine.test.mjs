import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const w={};
for(const name of ["formula-syntax.js","excel-curriculum.js","excel-scenarios.js","excel-summary-foundations.js","excel-pivot-foundations.js","excel-chart-foundations.js"])
  new Function("window",readFileSync(new URL("../../Office_work/Excel_study/"+name,import.meta.url),"utf8"))(w);
const A=w.CommonplaceExcelChartFoundations,C=w.CommonplaceExcelCurriculum;
const ref={id:"personal-charts",version:1},rubric={id:"chart-foundations",version:1};
const fixture=(id="chart-group-amounts",mode="guided")=>A.exercise(id,"jp-ph-trade",1,mode);
const criterion=(grade,id)=>grade.criteria.find(c=>c.id===id).passed;
test("F5C exact contract and all 30 guided/independent datasets",()=>{
  assert.deepEqual(C.listLessons(ref).map(l=>l.id),["chart-group-amounts","chart-status-counts","chart-ready-report"]);
  const ids=new Set();
  for(const l of A.list())for(const s of w.CommonplaceExcelScenarios.list())for(const mode of ["guided","independent"]){
    const ex=A.exercise(l.id,s.id,s.version,mode),before=JSON.stringify(ex),c=l.goal,v=ex.values,snap=A.capture(v),view=A.view(c,snap);
    assert.deepEqual(l.rubric,rubric);
    assert.equal(C.resolveCapability(l.capability_id).engine,"bounded-business-chart.v1");
    assert.deepEqual(v,w.CommonplaceExcelPivotFoundations.exercise("pivot-group-total",s.id,s.version,mode).values);
    ids.add(ex.dataset.id);
    const matching=[2,3,4,5,6,7].filter(i=>c.filter==="all"||v["B"+i]===c.filter);
    assert.deepEqual(view.includedRows,matching);
    assert.equal(view.total,c.measure==="count-records"?matching.length:matching.reduce((sum,i)=>sum+Number(v["D"+i]),0));
    assert.equal(view.rows.reduce((sum,row)=>sum+row.value,0),view.total);
    const grade=A.grade(ex,c,snap,v,view.insight);
    assert.equal(grade.passed,true);assert.equal(grade.maxScore,mode==="guided"?7:8);
    assert.equal(criterion(A.grade(ex,c,snap,v,""),"report-insight"),false);
    assert.equal(JSON.stringify(ex),before);
  }
  assert.equal(ids.size,30);
  assert.equal(C.listLessons({id:"assigned-sum",version:1}).length,1);
  assert.equal(C.listLessons({id:"personal-pivots",version:1}).length,3);
  assert.throws(()=>C.chartView({...ref,version:2},fixture().lesson.goal,fixture().values));
  assert.throws(()=>C.chartView({id:"personal-pivots",version:1},fixture().lesson.goal,fixture().values));
  assert.throws(()=>A.exercise("chart-group-amounts","jp-ph-trade",2,"guided"));
});
test("F5C default totals, filters and record counts include zero amounts",()=>{
  const amounts=fixture(),counts=fixture("chart-status-counts"),ready=fixture("chart-ready-report");
  const cases=[[amounts,[["Cebu",5800],["Manila",3400]],9200,"row:0"],[counts,[["Completed",1],["Pending",2],["Ready",3]],6,"row:2"],[ready,[["Cebu",2400],["Manila",1800]],4200,"row:0"]];
  for(const [ex,rows,total,insight] of cases){
    const v=A.view(ex.lesson.goal,ex.values);
    assert.deepEqual(v.rows.map(r=>[r.label,r.value]),rows);
    assert.equal(v.total,total);assert.equal(v.insight,insight);
    assert.equal(v.axis.min,0);assert.equal(v.axis.zero,0);
    assert.equal(v.axis.max,Math.max(...rows.map(r=>r[1])));
  }
});
test("F5C signed axes, all-zero, tie, case variants and no-data reports",()=>{
  const ex=fixture(),c=ex.lesson.goal,v=ex.values;
  const signed={...v,D2:"-2000",D4:"0",D5:"0",D3:"1000",D6:"0",D7:"0"};
  const view=A.view(c,signed);
  assert.deepEqual(view.rows.map(r=>r.value),[1000,-2000]);
  assert.equal(view.axis.min,-2000);assert.equal(view.axis.max,1000);
  assert.ok(Math.abs(view.axis.zero-2/3)<1e-12);assert.deepEqual(view.axis.positions,[1,0]);
  const zero=Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k[0]==="D"?"0":x]));
  const z=A.view(c,zero);
  assert.equal(z.axis.zero,0);assert.deepEqual(z.axis.positions,[0,0]);assert.equal(z.insight,"tie");
  const negative={...zero,D2:"-10",D3:"-20"};
  const n=A.view(c,negative);
  assert.equal(n.axis.zero,1);assert.equal(n.axis.max,0);assert.equal(n.insight,"row:1");
  const variant=A.view(c,{...v,C2:"manila"});assert.equal(variant.rows.length,2);
  const ready=fixture("chart-ready-report"),none=Object.fromEntries(Object.entries(ready.values).map(([k,x])=>[k,k[0]==="B"?"Pending":x]));
  const empty=A.view(ready.lesson.goal,none);
  assert.deepEqual(empty.rows,[]);assert.equal(empty.total,0);assert.equal(empty.insight,"none");
  assert.equal(A.grade(ready,ready.lesson.goal,A.capture(none),none,"none").passed,true);
});
test("F5C retained snapshots and report insight use current requested data",()=>{
  const ex=fixture("chart-ready-report","independent"),c=ex.lesson.goal,v=ex.values,snap=A.capture(v),view=A.view(c,snap);
  const changed={...v,D2:String(Number(v.D2)+500)};
  const stale=A.grade(ex,c,snap,changed,view.insight);
  assert.deepEqual(stale.view,view);
  assert.equal(criterion(stale,"fresh-source"),false);assert.equal(criterion(stale,"report-insight"),false);
  const next=A.view(c,changed),fresh=A.grade(ex,c,A.capture(changed),changed,next.insight);
  assert.equal(criterion(fresh,"fresh-source"),true);assert.equal(criterion(fresh,"original-records"),false);
  const invalid={...v,D2:"bad"};
  assert.throws(()=>A.capture(invalid));
  assert.equal(criterion(A.grade(ex,c,snap,invalid,view.insight),"fresh-source"),false);
  assert.equal(A.grade(ex,null,null,v,"").score,1);
  const wrong={...c,type:"column"};
  assert.equal(criterion(A.grade(ex,wrong,snap,v,view.insight),"chart-type"),false);
  const wrongFilter={...c,filter:"all"};
  const g=A.grade(ex,wrongFilter,snap,v,A.view(wrongFilter,snap).insight);
  assert.equal(criterion(g,"report-filter"),false);assert.equal(criterion(g,"report-insight"),false);
  const spoof={...ex,lesson:{...ex.lesson,goal:wrongFilter}};
  assert.equal(criterion(A.grade(spoof,wrongFilter,snap,v,"row:0"),"report-filter"),false);
  assert.deepEqual(snap,A.capture(v));
});
test("F5C rejects invalid configuration and malformed inputs",()=>{
  const ex=fixture(),c=ex.lesson.goal,v=ex.values;
  for(const config of [{...c,type:"pie"},{...c,category:"status",filter:"Ready"},{...c,measure:"average"},{...c,extra:true},{...c,filter:"unknown"}])
    assert.throws(()=>A.config(config));
  for(const cells of [{...v,A2:""},{...v,B2:"Invalid"},{...v,D2:"bad"},{...v,C2:"*"},{...v,extra:"1"}])
    assert.throws(()=>A.capture(cells));
  assert.throws(()=>C.gradeChart({...rubric,version:2},ex,c,v,v,"row:0"));
  assert.throws(()=>A.grade({...ex,lesson:{id:"pivot-group-total",version:1}},c,v,v,"row:0"));
});
