import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  emptyToolState, validateToolState, appendCalculation, validateCalculationHistory,
  practiceCriteria, practiceHistory, CALCULATION_HISTORY_LIMIT
} from "../../Office_work/Excel_study/calculation-history.mjs";
import { mountAssignedExcel } from "../../Office_work/Excel_study/assigned-lesson.mjs";
import { initialAttempt, validateAttempt, memoryStorage, studyIdentity } from "../learn/progress.mjs";
import { exampleBundle } from "../content/examples.mjs";
import { createAccountStore } from "../lib/account-store.mjs";
import { createSyncStore } from "../offline/sync-store.mjs";
import { memoryDatabase } from "./offline-support.mjs";

const FORMAT="independent-format-v1", COPY="independent-copy-v1", FORMULA="=SUM(B2:B4)";
const OWNER_A="10000000-0000-4000-8000-000000000002", OWNER_B="10000000-0000-4000-8000-000000000003";
const MATERIAL="20000000-0000-4000-8000-000000000001";
const id=n=>"30000000-0000-4000-8000-"+String(n).padStart(12,"0");
const submittedAt="2026-11-26T12:00:00.000Z";
const bundle=exampleBundle("trade"), rows=bundle.dataset.rows;
const material=(owner=OWNER_A)=>({id:MATERIAL,version:1,owner_id:owner,publication_state:"published",payload:{section_id:"office.excel",content:{format:"bundle",bundle}}});
const flags=(overrides={})=>({...emptyToolState(),...overrides});
const add=(history,activity,values,formula,n,toolState)=>appendCalculation(history,values,formula,{id:id(n),submittedAt,activity,toolState});

test("format rubric checks actual styles and original data; copy rubric checks action evidence",()=>{
  const complete=flags({bold:true,fill:true,border:true});
  assert.equal(practiceCriteria(FORMAT,rows,["12","8","5"],"",complete).score,4);
  assert.equal(practiceCriteria(FORMAT,rows,["12","9","5"],"",complete).score,3);
  assert.equal(practiceCriteria(FORMAT,rows,["12","8","5"],"",flags({bold:true})).score,2);
  assert.equal(practiceCriteria(COPY,rows,["12","12","5"],FORMULA,flags()).score,4);
  assert.equal(practiceCriteria(COPY,rows,["12","12","5"],FORMULA,flags({copy_used:true})).score,5);
  assert.equal(practiceCriteria(COPY,rows,["12","12","5"],"=SUM(B2:B3)",flags({copy_used:true})).score,4);
  const other=exampleBundle("mechanical").dataset.rows;
  const values=other.map(r=>String(r[1])); values[1]=values[0];
  assert.equal(practiceCriteria(COPY,other,values,FORMULA,flags({copy_used:true})).passed,true);
  assert.equal(practiceCriteria(COPY,other,["12","12","5"],FORMULA,flags({copy_used:true})).passed,false);
});
test("tool snapshots validate strictly, coexist with E1/E2 records and fit the shared cap",()=>{
  const old=appendCalculation([],["12","8","5"],FORMULA,{id:id(1),submittedAt});
  let history=add(old,FORMAT,["12","8","5"],"",2,flags({bold:true,fill:true,border:true}));
  history=add(history,COPY,["12","12","5"],FORMULA,3,flags({copy_used:true}));
  assert.deepEqual(validateCalculationHistory(history),history);
  assert.equal(history[0].tool_state,undefined);
  assert.equal(practiceHistory(history,rows,FORMAT)[0].grade.score,4);
  assert.equal(practiceHistory(history,rows,COPY)[0].grade.score,5);
  assert.equal(old.length,1);
  for(const bad of [null,{},flags({bold:"true"}),{...flags(),owner:OWNER_A},Object.assign(flags(),{clipboard:"12"})])
    assert.throws(()=>validateToolState(bad));
  for(const change of [
    a=>delete a.tool_state, a=>a.tool_state.fill=1, a=>a.activity="guided-sum-v1",
    a=>a.tool_state.clipboard="12", a=>a.result=99
  ]){
    const damaged=structuredClone(history);change(damaged[1]);
    assert.throws(()=>validateCalculationHistory(damaged));
  }
  assert.throws(()=>add(old,FORMAT,["12","8","5"],"",2,undefined));
  const m=material(),s=initialAttempt(m);
  s.worksheet.attempts=history;s.worksheet.practice_mode=COPY;s.worksheet.tool_state=flags({copy_used:true});
  assert.deepEqual(validateAttempt(s,m),s);
  const malformed=structuredClone(s);malformed.worksheet.tool_state.clipboard="12";
  assert.throws(()=>validateAttempt(malformed,m));
  const q={payload:{section_id:"office.excel",content:{format:"document",blocks:[{kind:"question",choices:["a","b"]}]}}};
  assert.throws(()=>validateAttempt({...initialAttempt(q),worksheet:s.worksheet},q));
  let bounded=[];
  for(let n=1;n<=CALCULATION_HISTORY_LIMIT;n++)
    bounded=add(bounded,COPY,Array(3).fill("\u0001".repeat(40)),"\u0001".repeat(80),n,flags({copy_used:true}));
  assert.equal(add(bounded,FORMAT,["12","8","5"],"",99,flags()),null);
  const full=initialAttempt(m);full.worksheet.attempts=bounded;full.worksheet.tool_state=flags({copy_used:true});
  assert.ok(new TextEncoder().encode(JSON.stringify(validateAttempt(full,m))).length<65536);
  assert.equal(bounded.length,40);
});

test("actual Ribbon handlers update selected cells, score tool use and restore the saved draft",()=>{
  class Element {
    constructor(tag){
      this.tag=tag;this.children=[];this.attrs={};this.events={};this.dataset={};this.value="";this._text="";
      this.hidden=false;this.disabled=false;this.className="";this.parent=null;this.id="";
      this.classList={toggle:(key,on)=>{const set=new Set(this.className.split(/\s+/).filter(Boolean));if(on??!set.has(key))set.add(key);else set.delete(key);this.className=[...set].join(" ");}};
    }
    append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
    prepend(item){item.parent=this;this.children.unshift(item);}
    after(item){const p=this.parent;if(p){item.parent=p;p.children.splice(p.children.indexOf(this)+1,0,item);}}
    replaceChildren(...items){this.children=[];this._text="";this.append(...items);}
    get textContent(){return this._text+this.children.map(x=>x.textContent).join(" ");}
    set textContent(v){this._text=String(v);this.children=[];}
    get lastChild(){return this.children.at(-1);}
    setAttribute(k,v){this.attrs[k]=String(v);}
    removeAttribute(k){delete this.attrs[k];}
    addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
    fire(k){for(const fn of this.events[k]??[])fn({target:this,preventDefault(){}});}
    focus(){this.fire("focusin");}
    matches(s){
      if(s.startsWith("[")){const k=s.slice(1,-1).replace(/^data-/,"").replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return Object.hasOwn(this.dataset,k);}
      return this.tag===s;
    }
    querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
    querySelector(s){return this.querySelectorAll(s)[0]??null;}
  }
  const oldWindow=globalThis.window,oldDocument=globalThis.document;
  const doc={createElement:tag=>new Element(tag)}, win={};
  globalThis.window=win;globalThis.document=doc;
  try{
    new Function("window","document",readFileSync(new URL("../../Office_work/Excel_study/excel-ribbon.js",import.meta.url),"utf8"))(win,doc);
    const m=material(),root=new Element("main");
    let latest=initialAttempt(m).worksheet,changes=0;
    const mount=()=>mountAssignedExcel(root,bundle,{state:latest,onChange:s=>{latest=structuredClone(s);changes++;}});
    const find=(predicate,node=root)=>predicate(node)?node:node.children.map(c=>find(predicate,c)).find(Boolean);
    const button=text=>find(e=>e.tag==="button"&&e.textContent===text);
    const tool=text=>find(e=>e.tag==="button"&&e.attrs["aria-label"]===text);
    const cell=address=>find(e=>e.dataset.cell===address);
    const formula=()=>find(e=>e.attrs["aria-label"]==="Formula for B5");
    const inputB3=()=>cell("B3").querySelector("input");
    const submit=()=>find(e=>e.tag==="form").onsubmit({preventDefault(){}});
    let dispose=mount();
    assert.equal(changes,0);
    assert.equal(tool("Bold").attrs["data-excel-practice"],"true");
    assert.equal(tool("AutoSum").attrs["data-excel-practice"],undefined);
    button("Start heading formatting (reset worksheet)").onclick();
    tool("Bold").fire("click");
    assert.equal(latest.tool_state,undefined); // B5 selected, cannot format it.
    cell("A1").fire("click");tool("Bold").fire("click");tool("Fill Color").fire("click");
    assert.equal(cell("A1").attrs["data-practice-bold"],"true");
    assert.equal(cell("A1").attrs["data-practice-fill"],"true");
    button("Submit formatting").onclick();
    assert.ok(root.textContent.includes("Last formatting submission: 3 / 4"));
    tool("Borders").fire("click");button("Submit formatting").onclick();
    assert.ok(root.textContent.includes("Last formatting submission: 4 / 4"));
    assert.equal(latest.applied,false);
    const originalHeading=cell("A1").textContent;
    const saved=structuredClone(latest);dispose();dispose=mount();
    assert.deepEqual(latest,saved);
    assert.equal(cell("A1").attrs["data-practice-border"],"true");
    assert.equal(cell("A1").textContent,originalHeading);
    button("Start clipboard practice (reset worksheet)").onclick();
    assert.equal(cell("A1").attrs["data-practice-bold"],"false");
    cell("B3").fire("click");tool("Paste").fire("click");
    assert.equal(inputB3().value,"8");
    inputB3().value="12";inputB3().fire("input");
    formula().value=FORMULA;formula().fire("input");submit();
    assert.ok(root.textContent.includes("Last clipboard submission: 4 / 5"));
    cell("B2").fire("click");tool("Copy").fire("click");
    cell("B4").fire("click");tool("Paste").fire("click");
    assert.equal(cell("B4").querySelector("input").value,"5");
    cell("B3").fire("click");tool("Paste").fire("click");
    assert.equal(latest.tool_state.copy_used,true);
    submit();assert.ok(root.textContent.includes("Last clipboard submission: 5 / 5"));
    assert.equal(latest.attempts.length,4);
    inputB3().value="12";inputB3().fire("input");
    assert.equal(latest.tool_state,undefined); // manual edit invalidates copy evidence.
    cell("B2").fire("click");tool("Copy").fire("click");
    dispose();dispose=mount();cell("B3").fire("click");tool("Paste").fire("click");
    assert.equal(latest.tool_state,undefined); // clipboard itself not persisted.
    button("Reset worksheet").onclick();
    assert.equal(inputB3().value,"8");assert.equal(latest.attempts.length,4);
    assert.ok(root.textContent.includes("Last formatting submission: 4 / 4"));
    dispose();
  }finally{
    if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
    if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  }
});
test("format and clipboard snapshots persist through the existing offline sync and backup path",async()=>{
  const storage=memoryStorage(),store=createAccountStore(storage,"e2b-test"),db=memoryDatabase();
  store.switchAccount(OWNER_A);
  let c={userId:OWNER_A,ticket:store.ticket(),offline:true},online=false,serverOwner=OWNER_A,lose=true;
  const cloud=new Map(),calls=[];
  const client={async rpc(name,args){
    calls.push({name,args:structuredClone(args)});
    if(args.expected_owner!==serverOwner)return {error:{code:"42501"}};
    const key=JSON.stringify([args.expected_owner,args.target,args.record_kind,args.record]);
    const prior=cloud.get(key)||{revision:"0",value:null};
    if(name==="cp_sync_read")return {data:structuredClone(prior)};
    if(prior.operation===args.operation)return {data:{...structuredClone(prior),status:"saved"}};
    if(prior.revision!==args.expected_revision)return {data:{...structuredClone(prior),status:"conflict"}};
    const next={revision:String(BigInt(prior.revision)+1n),value:structuredClone(args.new_value),operation:args.operation};
    cloud.set(key,next);if(lose){lose=false;throw Error("lost acknowledgement");}
    return {data:{...structuredClone(next),status:"saved"}};
  }};
  const sync=createSyncStore({db,store,namespace:"e2b-test",online:()=>online});
  const m=material(),assignment={schema_version:1,kind:"assignment",id:"assignment."+m.id,version:1,section_id:"office.excel",lesson_ref:{id:bundle.lesson.id,version:bundle.lesson.version},status:"assigned"};
  const record=await studyIdentity(m,{bundle,assignment}),opened=await sync.open(c,m,record,client);
  const history=add(add([],FORMAT,["12","8","5"],"",1,flags({bold:true,fill:true,border:true})),COPY,["12","12","5"],FORMULA,2,flags({copy_used:true}));
  const state={...opened.state,completed:true,worksheet:{values:["12","12","5"],formula:FORMULA,applied:true,practice_mode:COPY,tool_state:flags({copy_used:true}),attempts:history}};
  await opened.saveProgress(state);
  assert.equal(calls.length,0);assert.equal((await sync.summary(c)).pending,1);
  assert.deepEqual((await sync.open(c,m,record,client)).state,state);
  c={...c,offline:false};online=true;
  await assert.rejects(()=>sync.syncAll(c,client,new Set([m.id])),/lost acknowledgement/);
  await sync.syncAll(c,client,new Set([m.id]));
  assert.equal((await sync.summary(c)).pending,0);
  assert.equal(calls.filter(x=>x.name==="cp_sync_write").length,2);
  assert.equal(calls[0].args.operation,calls[1].args.operation);
  assert.deepEqual([...cloud.values()][0].value,state);
  const backup=JSON.parse(await sync.backup(c));
  assert.deepEqual(backup.records.find(x=>x.identity.kind==="progress").value,state);
  store.switchAccount(OWNER_B);serverOwner=OWNER_B;
  const cb={userId:OWNER_B,ticket:store.ticket(),offline:false},mb=material(OWNER_B);
  assert.equal((await sync.open(cb,mb,record,client)).state.worksheet.attempts,undefined);
  await assert.rejects(async()=>opened.saveProgress(state),/Account changed/);
  store.switchAccount(OWNER_A);serverOwner=OWNER_A;
  const ca={userId:OWNER_A,ticket:store.ticket(),offline:false};
  const restored=(await sync.open(ca,m,record,client)).state;
  assert.equal(practiceHistory(restored.worksheet.attempts,rows,FORMAT)[0].grade.score,4);
  assert.equal(practiceHistory(restored.worksheet.attempts,rows,COPY)[0].grade.score,5);
});
