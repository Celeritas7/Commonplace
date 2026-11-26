import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendCalculation, validateCalculationHistory, CALCULATION_HISTORY_LIMIT
} from "../../Office_work/Excel_study/calculation-history.mjs";
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
function submit(state, values, formula, n) {
  const history=append(state.worksheet.attempts??[],values,formula,n);
  const accepted=history.at(-1).accepted;
  return {...state,completed:accepted,worksheet:{values,formula,applied:accepted,attempts:history}};
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
test("assigned calculation records survive offline reopen, reconnect, account switches and material versions",async()=>{
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
  let state=submit(r.state,["12","8","5"],FORMULA,1);
  await r.saveProgress(state);
  state=submit(state,["12","10","5"],"=SUM(A2:A4)",2);
  await r.saveProgress(state);
  assert.equal(calls.length,0);
  assert.equal((await sync.summary(c)).pending,1);
  const reopened=await sync.open(c,m,record,client);
  assert.deepEqual(reopened.state.worksheet.attempts,state.worksheet.attempts);
  const reset={...initialAttempt(m),worksheet:{...initialAttempt(m).worksheet,attempts:state.worksheet.attempts}};
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
});
