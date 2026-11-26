import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendCalculation, validateCalculationHistory, CALCULATION_HISTORY_LIMIT, practiceCriteria, practiceHistory, validatePracticeMode
} from "../../Office_work/Excel_study/calculation-history.mjs";
import { mountAssignedExcel } from "../../Office_work/Excel_study/assigned-lesson.mjs";
import { initialAttempt, validateAttempt, memoryStorage, studyIdentity } from "../learn/progress.mjs";
import { exampleBundle } from "../content/examples.mjs";
import { createAccountStore } from "../lib/account-store.mjs";
import { createSyncStore } from "../offline/sync-store.mjs";
import { memoryDatabase } from "./offline-support.mjs";
const OWNER_A = "10000000-0000-4000-8000-000000000002";
const OWNER_B = "10000000-0000-4000-8000-000000000003";
const VERSION_A = "20000000-0000-4000-8000-000000000001";
const VERSION_B = "20000000-0000-4000-8000-000000000009";
const FORMULA = "=SUM(B2:B4)";
const id = n => "30000000-0000-4000-8000-" + String(n).padStart(12,"0");
const submittedAt = "2026-11-26T12:00:00.000Z";
const append = (h, values, formula, n) => appendCalculation(h,values,formula,{id:id(n),submittedAt});
function material(owner = OWNER_A, versionId = VERSION_A, version = 1) {
  const bundle = exampleBundle("trade");
  return {
    id: versionId, version, owner_id: owner, publication_state: "published",
    payload: { section_id: "office.excel", content: { format: "bundle", bundle } },
  };
}
async function key(m) {
  const bundle=m.payload.content.bundle;
  return studyIdentity(m,{bundle,assignment:{
    schema_version:1,kind:"assignment",id:"assignment."+m.id,version:m.version,
    section_id:"office.excel",lesson_ref:{id:bundle.lesson.id,version:bundle.lesson.version},status:"assigned"
  }});
}
function submit(state, values, formula, n, activity="free") {
  const history=appendCalculation(state.worksheet.attempts??[],values,formula,{id:id(n),submittedAt,activity});
  const accepted=history.at(-1).accepted;
  return {...state,completed:accepted,worksheet:{values,formula,applied:accepted,attempts:history,...(activity!=="free"?{practice_mode:activity}:{})}};
}
test("records successful and rejected submissions with detached, validated values",()=>{
  const first=append([],["12","8","5"],FORMULA,1);
  const second=append(first,["12","10","5"],"=SUM(A2:A4)",2);
  const third=append(second,["12","10","5"]," =sum( B2:B4 ) ",3);
  assert.equal(first.length,1);
  assert.deepEqual(third.map(a=>[a.accepted,a.result]),[[true,25],[false,null],[true,27]]);
  assert.deepEqual(third[1].values,["12","10","5"]);
  assert.equal(third[1].formula,"=SUM(A2:A4)");
  const copy=validateCalculationHistory(third);
  copy[0].values[0]="99";
  assert.equal(third[0].values[0],"12");
  for(const change of [
    h=>h[0].result=999,h=>h[1].accepted=true,h=>h[1].result=0,
    h=>h[0].owner_id=OWNER_B,h=>h[1].id=h[0].id,h=>h[0].submitted_at="yesterday",
    h=>h[0].formula="=".repeat(81),h=>h[0].values[0]="9".repeat(41),
    h=>delete h[0].values[1],h=>h[0].id="bad",h=>h[0].values[0]=12,
  ]) {const h=structuredClone(third);change(h);assert.throws(()=>validateCalculationHistory(h));}
});
test("bounded history never deletes earlier work and fits the existing record size limit",()=>{
  let h=[];
  const values=Array(3).fill("\u0001".repeat(40)),formula="\u0001".repeat(80);
  for(let n=1;n<=CALCULATION_HISTORY_LIMIT;n++)h=append(h,values,formula,n);
  assert.equal(h.length,CALCULATION_HISTORY_LIMIT);
  assert.equal(append(h,["12","8","5"],FORMULA,99),null);
  assert.equal(h[0].id,id(1));
  const m=material(),state=initialAttempt(m);
  state.worksheet.attempts=h;
  assert.ok(new TextEncoder().encode(JSON.stringify(validateAttempt(state,m))).length<65536);
  assert.throws(()=>validateCalculationHistory([...h,{...h[0],id:id(99)}]));
});
test("existing records remain readable; history is allowed only on the assigned SUM worksheet",()=>{
  const m=material(),legacy=initialAttempt(m);
  assert.deepEqual(validateAttempt(legacy,m),legacy);
  const saved=submit(legacy,["12","8","5"],FORMULA,1);
  assert.deepEqual(validateAttempt(saved,m),saved);
  const bad=structuredClone(saved);bad.worksheet.attempts[0].result=0;
  assert.throws(()=>validateAttempt(bad,m));
  const q={payload:{section_id:"office.excel",content:{format:"document",blocks:[{kind:"question",choices:["a","b"]}]}}};
  assert.deepEqual(validateAttempt(initialAttempt(q),q),initialAttempt(q));
  assert.throws(()=>validateAttempt({...initialAttempt(q),worksheet:saved.worksheet},q));
});
for(const tagged of [false,true]) test((tagged?"Tagged":"Free")+" calculation records survive offline reopen, reconnect, account switches and material versions",async()=>{
  const storage=memoryStorage(),store=createAccountStore(storage,"e1-test"),db=memoryDatabase();
  storage.setItem("commonplace_excel_preview_v1","keep legacy");
  store.switchAccount(OWNER_A);
  let c={userId:OWNER_A,ticket:store.ticket(),offline:true};
  let online=false,serverOwner=OWNER_A,loseAck=false,cloud=new Map(),calls=[];
  const client={async rpc(name,args){
    calls.push({name,args:structuredClone(args)});
    if(args.expected_owner!==serverOwner)return {error:{code:"42501"}};
    const k=JSON.stringify([args.expected_owner,args.target,args.record_kind,args.record]);
    const r=cloud.get(k)||{revision:"0",value:null};
    if(name==="cp_sync_read")return {data:structuredClone(r)};
    if(r.operation===args.operation)return {data:{...structuredClone(r),status:"saved"}};
    if(r.revision!==args.expected_revision)return {data:{...structuredClone(r),status:"conflict"}};
    const next={revision:String(BigInt(r.revision)+1n),value:structuredClone(args.new_value),operation:args.operation};
    cloud.set(k,next);
    if(loseAck){loseAck=false;throw Error("lost acknowledgement");}
    return {data:{...structuredClone(next),status:"saved"}};
  }};
  const sync=createSyncStore({db,store,namespace:"e1-test",online:()=>online});
  const m=material(),record=await key(m);
  const r=await sync.open(c,m,record,client);
  let state=submit(r.state,["12","8","5"],FORMULA,1,tagged?"guided-sum-v1":"free");
  await r.saveProgress(state);
  state=submit(state,["12","10","5"],"=SUM(A2:A4)",2,tagged?"independent-match-v1":"free");
  await r.saveProgress(state);
  assert.equal(calls.length,0);
  assert.equal((await sync.summary(c)).pending,1);
  const reopened=await sync.open(c,m,record,client);
  assert.deepEqual(reopened.state.worksheet.attempts,state.worksheet.attempts);
  assert.equal(reopened.state.worksheet.practice_mode,tagged?"independent-match-v1":undefined);
  const reset={...initialAttempt(m),worksheet:{...initialAttempt(m).worksheet,attempts:state.worksheet.attempts,...(tagged?{practice_mode:"independent-match-v1"}:{})}};
  await reopened.saveProgress(reset);
  assert.equal((await sync.open(c,m,record,client)).state.worksheet.attempts.length,2);
  online=true;c={...c,offline:false};loseAck=true;
  await assert.rejects(()=>sync.syncAll(c,client,new Set([m.id])),/lost acknowledgement/);
  await sync.syncAll(c,client,new Set([m.id]));
  assert.equal((await sync.summary(c)).pending,0);
  const writes=calls.filter(x=>x.name==="cp_sync_write");
  assert.equal(writes.length,2);
  assert.equal(writes[0].args.operation,writes[1].args.operation);
  assert.equal([...cloud.values()][0].revision,"1");
  assert.equal([...cloud.values()][0].value.worksheet.attempts.length,2);
  const backup=JSON.parse(await sync.backup(c));
  assert.equal(backup.owner,OWNER_A);
  assert.equal(backup.records.find(x=>x.identity.kind==="progress").value.worksheet.attempts.length,2);
  assert.equal(storage.getItem("commonplace_excel_preview_v1"),"keep legacy");
  const m2=material(OWNER_A,VERSION_B,2),k2=await key(m2);
  assert.notEqual(k2,record);
  const newMaterial=await sync.open(c,m2,k2,client);
  assert.equal(newMaterial.state.worksheet.attempts,undefined);
  store.switchAccount(OWNER_B);serverOwner=OWNER_B;
  const cb={userId:OWNER_B,ticket:store.ticket(),offline:false};
  const mb=material(OWNER_B),rb=await sync.open(cb,mb,await key(mb),client);
  assert.equal(rb.state.worksheet.attempts,undefined);
  await assert.rejects(async()=>r.saveProgress(state),/Account changed/);
  store.switchAccount(OWNER_A);serverOwner=OWNER_A;
  const ca={userId:OWNER_A,ticket:store.ticket(),offline:false};
  const restored=await sync.open(ca,m,record,client);
  assert.equal(restored.state.worksheet.attempts.length,2);
  assert.equal(restored.state.worksheet.attempts[1].accepted,false);
  if(tagged){
    assert.equal(restored.state.worksheet.practice_mode,"independent-match-v1");
    assert.equal(practiceHistory(restored.state.worksheet.attempts,m.payload.content.bundle.dataset.rows,"guided-sum-v1")[0].grade.score,4);
    assert.equal(practiceHistory(restored.state.worksheet.attempts,m.payload.content.bundle.dataset.rows,"independent-match-v1")[0].grade.score,2);
  }
});

test("guided and independent criteria derive from the assigned dataset, not formula success alone",()=>{
  const rows=exampleBundle("trade").dataset.rows;
  assert.equal(practiceCriteria("guided-sum-v1",rows,["12","8","5"],FORMULA).score,4);
  assert.equal(practiceCriteria("guided-sum-v1",rows,["12","9","5"],FORMULA).score,3);
  assert.equal(practiceCriteria("independent-match-v1",rows,["12","12","5"],FORMULA).score,4);
  assert.equal(practiceCriteria("independent-match-v1",rows,["13","13","3"],FORMULA).score,1);
  assert.equal(practiceCriteria("independent-match-v1",rows,["12","12","5"],"=SUM(B1:B4)").score,3);
  const other=exampleBundle("mechanical").dataset.rows;
  assert.equal(practiceCriteria("independent-match-v1",other,[String(other[0][1]),String(other[0][1]),String(other[2][1])],FORMULA).passed,true);
  assert.equal(practiceCriteria("independent-match-v1",other,["12","12","5"],FORMULA).passed,false);
});
test("activity allowlist, legacy records and shared history cap",()=>{
  let h=append([],["12","8","5"],FORMULA,1);
  h=appendCalculation(h,["12","8","5"],FORMULA,{id:id(2),submittedAt,activity:"guided-sum-v1"});
  h=appendCalculation(h,["12","12","5"],FORMULA,{id:id(3),submittedAt,activity:"independent-match-v1"});
  assert.equal(h[0].activity,undefined);
  assert.equal(practiceHistory(h,exampleBundle("trade").dataset.rows,"independent-match-v1").length,1);
  for(const activity of ["exam","free",null,{}]){
    const invalid=structuredClone(h);invalid[1].activity=activity;
    assert.throws(()=>validateCalculationHistory(invalid));
  }
  const m=material(),s=initialAttempt(m);s.worksheet.attempts=h;s.worksheet.practice_mode="guided-sum-v1";
  assert.deepEqual(validateAttempt(s,m),s);
  s.worksheet.practice_mode="admin";
  assert.throws(()=>validateAttempt(s,m));
  assert.throws(()=>validatePracticeMode(null));
  assert.throws(()=>appendCalculation(h,["12","8","5"],FORMULA,{id:id(4),submittedAt,activity:"exam"}));
  let bounded=[];
  for(let n=1;n<=CALCULATION_HISTORY_LIMIT;n++)bounded=appendCalculation(bounded,Array(3).fill("\u0001".repeat(40)),"\u0001".repeat(80),{id:id(n),submittedAt,activity:"independent-match-v1"});
  const full=initialAttempt(m);full.worksheet.attempts=bounded;full.worksheet.practice_mode="independent-match-v1";
  assert.ok(new TextEncoder().encode(JSON.stringify(validateAttempt(full,m))).length<65536);
  assert.equal(appendCalculation(bounded,["12","12","5"],FORMULA,{id:id(99),submittedAt,activity:"independent-match-v1"}),null);
  assert.equal(bounded.length,40);
});
test("assigned renderer records actual worksheet submissions and restores mode and scores",()=>{
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.events={};this.dataset={};this.value="";this._text="";this.hidden=false;this.disabled=false;}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;this._text="";}
    get textContent(){return this._text+this.children.map(x=>x.textContent).join(" ");}
    set textContent(v){this._text=String(v);this.children=[];}
    get lastChild(){return this.children.at(-1);}
    setAttribute(k,v){this.attrs[k]=String(v);}
    addEventListener(k,fn){this.events[k]=fn;}
    fire(k){this.events[k]?.({preventDefault(){}});}
  }
  const oldWindow=globalThis.window,oldDocument=globalThis.document;
  globalThis.window={CommonplaceExcelRibbon:{mount(){return {select(){},refresh(){}};}}};
  globalThis.document={createElement:tag=>new Element(tag)};
  try{
    const m=material(),bundle=m.payload.content.bundle,root=new Element("main");
    let latest=initialAttempt(m).worksheet,changes=0;
    const mount=()=>mountAssignedExcel(root,bundle,{state:latest,onChange:s=>{latest=structuredClone(s);changes++;}});
    const find=(predicate,node=root)=>predicate(node)?node:node.children.map(c=>find(predicate,c)).find(Boolean);
    const button=text=>find(e=>e.tag==="button"&&e.textContent===text);
    const formula=()=>find(e=>e.attrs["aria-label"]==="Formula for B5");
    const inputB3=()=>find(e=>e.tag==="input"&&e.attrs["aria-label"]?.startsWith("B3,"));
    const submitForm=()=>find(e=>e.tag==="form").onsubmit({preventDefault(){}});
    let dispose=mount();
    assert.equal(changes,0);
    button("Start guided SUM (reset worksheet)").onclick();
    assert.equal(latest.practice_mode,"guided-sum-v1");
    formula().value=FORMULA;formula().fire("input");submitForm();
    assert.ok(root.textContent.includes("Submission complete"));
    assert.equal(latest.attempts[0].activity,"guided-sum-v1");
    button("Start independent revision (reset worksheet)").onclick();
    assert.equal(latest.practice_mode,"independent-match-v1");
    formula().value=FORMULA;formula().fire("input");submitForm();
    assert.ok(root.textContent.includes("Last independent submission: 3 / 4"));
    inputB3().value="12";inputB3().fire("input");submitForm();
    assert.ok(root.textContent.includes("Last independent submission: 4 / 4"));
    assert.equal(latest.attempts.length,3);
    button("Reset worksheet").onclick();
    assert.equal(latest.attempts.length,3);
    assert.equal(latest.applied,false);
    assert.equal(latest.values[1],"8");
    const saved=structuredClone(latest);dispose();dispose=mount();
    assert.deepEqual(latest,saved);
    assert.ok(root.textContent.includes("Mode: Independent revision"));
    assert.ok(root.textContent.includes("Last independent submission: 4 / 4"));
    button("Leave practice mode").onclick();
    assert.equal(latest.practice_mode,undefined);
    assert.equal(latest.attempts.length,3);
    dispose();
  }finally{
    if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
    if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  }
});
