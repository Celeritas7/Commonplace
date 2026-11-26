import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';
import {legacyFixture} from './shared-access-fixture.mjs';
const read=name=>readFile(new URL('../operations/general-apps/'+name,import.meta.url),'utf8');
const candidate=await read('10_roadmap_comparison_edits.sql');
const id=n=>'a0000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function baseline(install=true){
 const db=await createAcceptanceDatabase();
 try{
  await db.exec(legacyFixture);
  for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql'])
   await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
  for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql'])
   await db.exec(await read(f));
  await db.exec(`insert into roadmap_comparisons(id,user_id,title,notes,weights) values
   ('${id(1)}','${users.a}','A','Keep 日本語','{"price":2}'),
   ('${id(2)}','${users.b}','B','Keep B','{"price":1}'),
   ('${id(3)}','${users.a}','Other A','Keep other A','{}');
   insert into roadmap_comparison_items(id,user_id,comparison_id,name,notes,price) values
   ('${id(4)}','${users.a}','${id(1)}','Product A','Keep item',50),
   ('${id(5)}','${users.b}','${id(2)}','Product B','Other owner',60),
   ('${id(6)}','${users.a}','${id(3)}','Other A','Other comparison',70)`);
  if(install)await db.exec(candidate);
  return db;
 }catch(e){await db.close();throw e;}
}
const snapshot=async db=>{await db.exec('reset role');return (await db.query(`select
 (select jsonb_agg(to_jsonb(c) order by id) from roadmap_comparisons c) comparisons,
 (select jsonb_agg(to_jsonb(i) order by id) from roadmap_comparison_items i) items`)).rows[0]};
test('comparison preferences are acknowledged, version checked and safely replayed',async t=>{
 const db=await baseline(false),{as}=access(db);
 const row=async()=>(await as(users.a,'select * from roadmap_comparisons where id=$1',[id(1)])).rows[0];
 const edit=async(req,stamp,patch,actor=users.a,comparison=id(1))=>
  (await as(actor,'select ga_roadmap_edit_comparison($1,$2,$3,$4) result',[comparison,stamp,patch,id(req)])).rows[0].result;
 try{
  const before=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),before);
  const initial=(await row()).updated_at;let first;
  await t.test('confirmed patch preserves notes, products and a private before/after record',async()=>{
   first=await edit(10,initial,{weights:{price:3},chosen_item:id(4)});
   assert.equal(first.comparison.chosen_item,id(4));assert.deepEqual(first.comparison.weights,{price:3});
   assert.equal(first.comparison.notes,'Keep 日本語');assert.equal(first.items[0].notes,'Keep item');
   assert.equal(first.comparison.user_id,undefined);assert.equal(first.items[0].user_id,undefined);
   await db.exec('reset role');
   const receipt=(await db.query('select * from ga_private.roadmap_comparison_receipts')).rows[0];
   assert.deepEqual(receipt.before_edit.weights,{price:2});assert.deepEqual(receipt.after_edit.weights,{price:3});
   await assert.rejects(()=>as(users.a,'select * from ga_private.roadmap_comparison_receipts'),e=>e.code==='42501');
  });
  await t.test('lost acknowledgement retries once and old replays return current values',async()=>{
   await db.exec("reset role;set timezone='Asia/Tokyo'");
   assert.equal((await edit(10,initial,{chosen_item:id(4),weights:{price:3}})).replayed,true);
   await db.exec("reset role;set timezone='UTC'");
   await edit(11,first.comparison.updated_at,{chosen_item:null});
   const replay=await edit(10,initial,{weights:{price:3},chosen_item:id(4)});
   assert.equal(replay.comparison.chosen_item,null);assert.deepEqual(replay.comparison.weights,{price:3});
   await db.exec('reset role');assert.equal((await db.query('select count(*) n from ga_private.roadmap_comparison_receipts')).rows[0].n,2);
   await assert.rejects(()=>edit(10,initial,{weights:{price:1}}),e=>e.code==='22023');
  });
  await t.test('stale, foreign, anonymous and wrong-comparison choices never change saved rows',async()=>{
   const old=await snapshot(db),stamp=(await row()).updated_at;
   await assert.rejects(()=>edit(12,initial,{weights:{price:1}}),e=>e.code==='40001');
   for(const choice of [id(5),id(6),id(99)])await assert.rejects(()=>edit(12,stamp,{chosen_item:choice}),e=>e.code==='42501');
   for(const actor of [users.b,users.fresh,null])await assert.rejects(()=>edit(10,initial,{weights:{price:3},chosen_item:id(4)},actor),e=>e.code==='42501');
   assert.deepEqual(await snapshot(db),old);
  });
  await t.test('arbitrary fields, invalid weights and oversized requests are rejected',async()=>{
   const stamp=(await row()).updated_at,old=await snapshot(db);
   for(const patch of [{},{notes:'not allowed'},{user_id:users.b},{weights:null},{weights:{price:4}},
    {weights:{price:1.5}},{weights:{price:'3'}},{chosen_item:'bad'},{chosen_item:4},
    {weights:{['a'.repeat(9000)]:1}}])
    await assert.rejects(()=>edit(13,stamp,patch),e=>e.code==='22023');
   assert.deepEqual(await snapshot(db),old);
  });
  await t.test('failed or suppressed receipt writes roll back the preference patch',async()=>{
   for(const behavior of ["raise exception 'synthetic failure';","return null;"]){
    await db.exec(`reset role;create function fixture_receipt_failure() returns trigger language plpgsql as $$begin ${behavior} end;$$;
     create trigger fixture_failure before insert on ga_private.roadmap_comparison_receipts for each row execute function fixture_receipt_failure()`);
    const old=await snapshot(db),stamp=(await row()).updated_at;
    await assert.rejects(()=>edit(14,stamp,{weights:{price:0}}));assert.deepEqual(await snapshot(db),old);
    await db.exec('reset role;drop trigger fixture_failure on ga_private.roadmap_comparison_receipts;drop function fixture_receipt_failure()');
   }
   const stamp=(await row()).updated_at;await edit(14,stamp,{weights:{price:0}});
  });
  await t.test('silent comparison suppression is not a successful save',async()=>{
   await db.exec(`reset role;create function fixture_comparison_failure() returns trigger language plpgsql as $$begin return null;end;$$;
    create trigger fixture_failure before update on roadmap_comparisons for each row execute function fixture_comparison_failure()`);
   const old=await snapshot(db),stamp=(await row()).updated_at;
   await assert.rejects(()=>edit(15,stamp,{weights:{price:1}}),e=>e.code==='42501');
   assert.deepEqual(await snapshot(db),old);
   await db.exec('reset role;drop trigger fixture_failure on roadmap_comparisons;drop function fixture_comparison_failure()');
  });
  await t.test('pause and revoked verification block replays with existing identity claims',async()=>{
   await db.exec('reset role;update ga_private.roadmap_control set paused=true');
   await assert.rejects(()=>edit(10,initial,{weights:{price:3},chosen_item:id(4)}),e=>e.code==='42501');
   await db.exec(`reset role;update ga_private.roadmap_control set paused=false;update auth.users set email_confirmed_at=null where id='${users.a}'`);
   await assert.rejects(()=>edit(10,initial,{weights:{price:3},chosen_item:id(4)}),e=>e.code==='42501');
   await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${users.a}';select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
   await assert.rejects(()=>edit(10,initial,{weights:{price:3},chosen_item:id(4)}),e=>e.code==='42501');
   await db.exec("reset role;select set_config('request.jwt.claims','{}',false)");
  });
  await t.test('legacy reimport remains separate and an old preference replay cannot reinstate a removed item',async()=>{
   const input={task_title:'New task',title:'Legacy',items:[{name:'Legacy item',price:25}]};
   const imported=(await as(users.a,'select roadmap_save_comparison($1) id',[input])).rows[0].id;
   const importedRow=(await as(users.a,'select * from roadmap_comparisons where id=$1',[imported])).rows[0];
   const item=(await as(users.a,'select id from roadmap_comparison_items where comparison_id=$1',[imported])).rows[0].id;
   await edit(16,importedRow.updated_at,{chosen_item:item},users.a,imported);
   await as(users.a,'select roadmap_save_comparison($1)',[{...input,task_id:importedRow.task_id,items:[{name:'New import',price:27}]}]);
   const current=await edit(16,importedRow.updated_at,{chosen_item:item},users.a,imported);
   assert.equal(current.comparison.chosen_item,null);assert.equal(current.items[0].name,'New import');assert.notEqual(current.items[0].id,item);
  });
 }finally{await db.close();}
});
test('comparison API installation refuses changed schema, owner policies and membership constraints',async t=>{
 for(const change of ['alter table roadmap_comparisons add column unknown text',
  'alter table roadmap_comparisons drop constraint ga_comparison_chosen_item',
  'create policy unexpected on roadmap_comparisons for select to authenticated using(true)',
  'alter table roadmap_comparisons disable trigger roadmap_comparisons_updated_at']){
  await t.test(change,async()=>{const db=await baseline(false);try{
   await db.exec(change);const old=await snapshot(db);await assert.rejects(()=>db.exec(candidate),/review/);
   await db.exec('rollback');assert.deepEqual(await snapshot(db),old);
  }finally{await db.close();}});
 }
});
test('shared containment revokes comparison editing even if the pause row is missing',async()=>{
 const db=await baseline();try{
  await db.exec(await read('04_commonplace_signup.sql'));await db.exec('delete from ga_private.roadmap_control');
  await assert.rejects(()=>db.exec(awaitStop),/Containment incomplete/);await db.exec('rollback');
  assert.equal((await db.query("select has_function_privilege('authenticated','ga_roadmap_edit_comparison(uuid,timestamptz,jsonb,uuid)','execute') ok")).rows[0].ok,false);
 }finally{await db.close();}
});
const awaitStop=await read('90_containment.sql');
