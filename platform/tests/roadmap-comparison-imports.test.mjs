import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';
import {legacyFixture} from './shared-access-fixture.mjs';
const read=name=>readFile(new URL('../operations/general-apps/'+name,import.meta.url),'utf8');
const candidate=await read('11_roadmap_comparison_imports.sql');
const id=n=>'b0000000-0000-4000-8000-'+String(n).padStart(12,'0');
const document=(items=[{id:id(4),name:'Updated A',price:55}])=>({title:'Reviewed products',items});
async function baseline(install=true){
 const db=await createAcceptanceDatabase();try{
  await db.exec(legacyFixture);
  for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql'])await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
  for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql','10_roadmap_comparison_edits.sql'])await db.exec(await read(f));
  await db.exec(`insert into roadmap_tasks(id,user_id,title,kind) values
   ('${id(8)}','${users.a}','Existing shopping task','task'),('${id(9)}','${users.b}','Foreign task','task');
   insert into roadmap_comparisons(id,user_id,task_id,title,notes,weights) values
   ('${id(1)}','${users.a}','${id(8)}','A','Keep 日本語','{"price":2}'),
   ('${id(2)}','${users.b}','${id(9)}','B','Keep B','{"price":1}'),
   ('${id(3)}','${users.a}','${id(8)}','Other A','Keep other A','{}');
   insert into roadmap_comparison_items(id,user_id,comparison_id,name,notes,price) values
   ('${id(4)}','${users.a}','${id(1)}','Product A','Keep product note',50),
   ('${id(5)}','${users.b}','${id(2)}','Product B','Other owner',60),
   ('${id(6)}','${users.a}','${id(3)}','Other A','Other comparison',70),
   ('${id(7)}','${users.a}','${id(1)}','Product removed','Recover this history',80);
   update roadmap_comparisons set chosen_item='${id(4)}' where id='${id(1)}'`);
  if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e;}
}
const snapshot=async db=>{await db.exec('reset role');return (await db.query(`select
 (select jsonb_agg(to_jsonb(t) order by id) from roadmap_tasks t) tasks,
 (select jsonb_agg(to_jsonb(c) order by id) from roadmap_comparisons c) comparisons,
 (select jsonb_agg(to_jsonb(i) order by id) from roadmap_comparison_items i) items`)).rows[0]};
test('comparison imports keep owned work and recover one original request',async t=>{
 const db=await baseline(false),{as}=access(db);let n=30;
 const preview=async(c=id(1),actor=users.a)=>(await as(actor,'select ga_roadmap_preview_import($1) result',[c])).rows[0].result;
 const save=async(doc,rev,req=n++,c=id(1),actor=users.a,task=id(8))=>(await as(actor,
  'select ga_roadmap_import_comparison($1,$2,$3,$4,$5) result',[c,task,rev,doc,id(req)])).rows[0].result;
 try{
  const old=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),old);
  let original,first;
  await t.test('replacement retains IDs, dates, omitted notes, weights and choice; history retains removed products',async()=>{
   original=await preview();first=await save(document(),original.revision,10);
   assert.equal(first.comparison.notes,'Keep 日本語');assert.deepEqual(first.comparison.weights,{price:2});
   assert.equal(first.comparison.chosen_item,id(4));assert.equal(first.items.length,1);
   assert.equal(first.items[0].notes,'Keep product note');assert.equal(first.items[0].created_at,original.items[0].created_at);
   assert.equal(first.items[0].price,55);assert.notEqual(first.revision,original.revision);
   await db.exec('reset role');const receipt=(await db.query('select * from ga_private.roadmap_import_receipts')).rows[0];
   assert.deepEqual(receipt.before_state,original);assert.equal(receipt.before_state.items[1].notes,'Recover this history');
   assert.equal(receipt.after_state.revision,first.revision);
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_import_receipts'),e=>e.code==='42501');
  });
  await t.test('lost acknowledgement replays current state without repeating a replacement',async()=>{
   await db.exec("reset role;set timezone='Asia/Tokyo'");
   assert.equal((await save(document(),original.revision,10)).replayed,true);
   await as(users.a,'select ga_roadmap_edit_comparison($1,$2,$3,$4)',[id(1),first.comparison.updated_at,{weights:{price:3}},id(11)]);
   const current=await preview(),again=await save(document(),original.revision,10);
   assert.equal(again.revision,current.revision);assert.deepEqual(again.comparison.weights,{price:3});
   await db.exec('reset role');assert.equal((await db.query('select count(*) n from ga_private.roadmap_import_receipts')).rows[0].n,1);
   await assert.rejects(()=>save({...document(),title:'Other intent'},original.revision,10),e=>e.code==='22023');
   await db.exec("reset role;set timezone='UTC'");
  });
  await t.test('a changed product without a parent timestamp change invalidates the preview',async()=>{
   const before=await preview();await as(users.a,'update roadmap_comparison_items set notes=$1 where id=$2',['New note from another editor',id(4)]);
   assert.equal((await preview()).comparison.updated_at,before.comparison.updated_at);
   const saved=await snapshot(db);await assert.rejects(()=>save(document(),before.revision),e=>e.code==='40001');
   assert.deepEqual(await snapshot(db),saved);
  });
  await t.test('removing a chosen product requires explicit review and preserves its old history',async()=>{
   const before=await preview(),doc=document([{id:id(20),name:'New product',price:99}]);
   await assert.rejects(()=>save(doc,before.revision),e=>e.code==='22023');
   assert.equal((await preview()).revision,before.revision);
   const result=await save({...doc,clear_missing_choice:true},before.revision);
   assert.equal(result.comparison.chosen_item,null);assert.equal(result.items[0].id,id(20));
  });
  await t.test('creating with an explicit owned task never discovers or creates tasks by title',async()=>{
   const tasks=(await snapshot(db)).tasks,doc=document([{id:id(22),name:'New'}]);
   const created=await save(doc,null,12,id(21));assert.equal(created.comparison.task_id,id(8));
   assert.deepEqual((await snapshot(db)).tasks,tasks);
   assert.equal((await save(doc,null,12,id(21))).replayed,true);
   await assert.rejects(()=>save(doc,null,13,id(21)),e=>e.code==='40001');
   await assert.rejects(()=>save(document([{id:id(24),name:'New'}]),null,14,id(23),users.a,id(9)),e=>e.code==='42501');
   await assert.rejects(()=>save(document(),null,15,id(25),users.a,null),e=>e.code==='42501');
   await assert.rejects(()=>save(doc,null,12,id(26)),e=>e.code==='22023');
  });
  await t.test('foreign and missing targets, anonymous users and cross-comparison product IDs are denied',async()=>{
   const rev=(await preview()).revision,old=await snapshot(db);
   for(const actor of [users.b,users.fresh,null]){
    await assert.rejects(()=>preview(id(1),actor),e=>e.code==='42501');
    await assert.rejects(()=>save(document(),rev,60,id(1),actor),e=>e.code==='42501');
   }
   for(const item of [id(5),id(6)])await assert.rejects(()=>save({...document([{id:item,name:'Wrong'}]),clear_missing_choice:true},rev),e=>e.code==='42501');
   await assert.rejects(()=>save(document(),rev,60,id(99)),e=>e.code==='42501');
   assert.deepEqual(await snapshot(db),old);
  });
  await t.test('malformed, empty, duplicate, oversized and executable imports are rejected atomically',async()=>{
   const rev=(await preview()).revision,old=await snapshot(db),base=document([{id:id(20),name:'Retain'}]);
   for(const doc of [null,{}, {...base,user_id:users.b},{...base,weights:{price:1}},
    {...base,items:[]},{...base,items:[base.items[0],base.items[0]]},
    {...base,items:Array.from({length:101},(_,i)=>({id:id(100+i),name:'n'}))},
    {...base,notes:'日'.repeat(90000)},
    ...[{id:'bad'},{price:'4'},{rating:6},{warranty_months:1.5},{currency:null},{pros:[{}]},
     {extra:{nested:{script:'x'}}},{url:'javascript:alert(1)'},{image_url:'data:text/html,hi'},
     {comparison_id:id(3)}].map(item=>({...base,items:[{...base.items[0],...item}]}))])
    await assert.rejects(()=>save(doc,rev),e=>e.code==='22023');
   assert.deepEqual(await snapshot(db),old);
  });
  await t.test('failed and silently suppressed item or receipt writes roll the full replacement back',async()=>{
   for(const [table,event,behavior] of [
    ['roadmap_comparison_items','insert',"raise exception 'fixture item failure';"],
    ['roadmap_comparison_items','insert','return null;'],
    ['roadmap_comparison_items','delete','return null;'],
    ['ga_private.roadmap_import_receipts','insert',"raise exception 'fixture receipt failure';"],
    ['ga_private.roadmap_import_receipts','insert','return null;'],
    ['roadmap_comparisons','update','return null;'],
   ]){
    await db.exec(`reset role;create function fixture_import_failure() returns trigger language plpgsql as $$begin ${behavior} end;$$;
     create trigger fixture_failure before ${event} on ${table} for each row execute function fixture_import_failure()`);
    const before=await preview(),old=await snapshot(db),doc=document([{id:id(29),name:'Replacement'}]),req=n++;
    await assert.rejects(()=>save(doc,before.revision,req));assert.deepEqual(await snapshot(db),old);
    await db.exec(`reset role;drop trigger fixture_failure on ${table};drop function fixture_import_failure()`);
    assert.equal((await save(doc,before.revision,req)).items[0].name,'Replacement');
    // Ensure the next delete-suppression case also replaces an actual row.
    const latest=await preview();await save(document([{id:id(20),name:'Keep for next case'}]),latest.revision);
   }
  });
  await t.test('pause and verification revocation deny old receipts without changing saved work',async()=>{
   await db.exec('reset role;update ga_private.roadmap_control set paused=true');
   await assert.rejects(()=>save(document(),original.revision,10),e=>e.code==='42501');
   await assert.rejects(()=>preview(),e=>e.code==='42501');
   await db.exec(`reset role;update ga_private.roadmap_control set paused=false;update auth.users set email_confirmed_at=null where id='${users.a}'`);
   await assert.rejects(()=>save(document(),original.revision,10),e=>e.code==='42501');
   await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${users.a}';select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
   await assert.rejects(()=>preview(),e=>e.code==='42501');
   await db.exec("reset role;select set_config('request.jwt.claims','{}',false)");
  });
  await t.test('legacy deletion keeps the retained import history and an old retry cannot recreate data',async()=>{
   await as(users.a,'delete from roadmap_comparisons where id=$1',[id(1)]);
   await assert.rejects(()=>save(document(),original.revision,10),e=>e.code==='42501');
   await db.exec('reset role');assert.ok((await db.query('select count(*) n from ga_private.roadmap_import_receipts where comparison_id=$1',[id(1)])).rows[0].n>0);
  });
 }finally{await db.close();}
});
test('import preparation refuses catalog or candidate drift before any data change',async t=>{
 for(const change of [
  'alter table roadmap_comparisons add column unexpected text',
  'alter table roadmap_comparisons drop constraint roadmap_comparisons_task_id_fkey',
  'alter table roadmap_comparison_items disable row level security',
  "alter function public.ga_roadmap_edit_comparison(uuid,timestamptz,jsonb,uuid) security invoker",
 ])await t.test(change,async()=>{const db=await baseline(false);try{
  await db.exec(change);const old=await snapshot(db);await assert.rejects(()=>db.exec(candidate),/review/);await db.exec('rollback');
  assert.deepEqual(await snapshot(db),old);assert.equal((await db.query("select to_regclass('ga_private.roadmap_import_receipts') relation")).rows[0].relation,null);
 }finally{await db.close();}});
});
test('containment revokes both optional import endpoints even when pausing fails',async()=>{
 const db=await baseline();try{
  await db.exec(await read('04_commonplace_signup.sql'));await db.exec('delete from ga_private.roadmap_control');
  await assert.rejects(()=>db.exec(stop),/Containment incomplete/);await db.exec('rollback');
  for(const signature of ['ga_roadmap_preview_import(uuid)','ga_roadmap_import_comparison(uuid,uuid,text,jsonb,uuid)'])
   assert.equal((await db.query('select has_function_privilege(\'authenticated\',$1,\'execute\') ok',[signature])).rows[0].ok,false);
 }finally{await db.close();}
});
const stop=await read('90_containment.sql');
