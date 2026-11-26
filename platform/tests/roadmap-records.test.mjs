import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';
import {legacyFixture} from './shared-access-fixture.mjs';
const read=name=>readFile(new URL('../operations/general-apps/'+name,import.meta.url),'utf8');
const fixture=await readFile(new URL('./roadmap-records-fixture.sql',import.meta.url),'utf8');
const sessionFixture=await readFile(new URL('./roadmap-session-fixture.sql',import.meta.url),'utf8');
const candidate=await read('09_roadmap_record_ownership.sql');
const tables=['roadmap_comparison_items','roadmap_comparisons','roadmap_contexts_map',
 'roadmap_daily_logs','roadmap_projects','roadmap_role_locations','roadmap_roles',
 'roadmap_suggestion_answers','roadmap_suggestions','roadmap_task_resources','roadmap_user_settings'];
const id=n=>'90000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function baseline(){
 const db=await createAcceptanceDatabase();
 try {
  await db.exec(legacyFixture);await db.exec(sessionFixture);await db.exec(fixture);
  await db.exec(await read('01_access_foundation.sql'));
  await db.exec(await read('03_roadmap_session_owner.sql'));
  await db.exec(await read('08_roadmap_daily_actions.sql'));
  for(const [owner,n] of [[users.a,1],[users.b,2]]) await db.exec(`
   insert into roadmap_tasks(id,user_id,title,tags) values('${id(n)}','${owner}','Task ${n}','{daily-routine}');
   insert into roadmap_roles(id,user_id,label) values('role','${owner}','Role');
   insert into roadmap_projects(id,user_id,role_id,label) values('project','${owner}','role','Project');
   insert into roadmap_role_locations values('role','retired-hub-place','${owner}');
   insert into roadmap_contexts_map(id,user_id,label) values('context-${n}','${owner}','Context');
   insert into roadmap_user_settings(user_id,preferences) values('${owner}','{"notes":"Keep 日本語"}');
   insert into roadmap_daily_logs(id,user_id,task_id,notes,duration_minutes) values('${id(n+10)}','${owner}','${id(n)}','Keep 日本語',37);
   insert into roadmap_comparisons(id,user_id,task_id,title,notes,weights) values('${id(n+20)}','${owner}','${id(n)}','Study','Keep 日本語','{"price":2}');
   insert into roadmap_comparison_items(id,user_id,comparison_id,name,notes,price) values('${id(n+30)}','${owner}','${id(n+20)}','Product','Keep 日本語',2500);
   update roadmap_comparisons set chosen_item='${id(n+30)}' where id='${id(n+20)}';
   insert into roadmap_suggestions(id,user_id,task,rm_task_id,title,say,until) values('suggestion-${n}','${owner}','{"source":"hub"}','${id(n)}','Task','Try',now()+interval '1 day');
   insert into roadmap_suggestion_answers(user_id,seq,suggestion_id,from_app,action,reason) values('${owner}',1,'unknown-expired-suggestion','fixture','skip','Keep 日本語');
   insert into roadmap_task_resources(id,user_id,task_id,label,url) values('${id(n+40)}','${owner}','${id(n)}','Resource','https://example.invalid/lesson');
  `);
  return db;
 }catch(e){await db.close();throw e;}
}
async function snapshot(db){
 await db.exec('reset role');const result={};
 for(const t of [...tables,'roadmap_tasks','roadmap_study_sessions','ga_private.roadmap_daily_receipts'])
  result[t]=(await db.query(`select to_jsonb(t) row from ${t} t order by to_jsonb(t)::text`)).rows;
 return result;
}
test('Roadmap record installation preserves every original row and owner',async t=>{
 const db=await baseline(),{as}=access(db);
 try {
  const before=await snapshot(db);await db.exec(candidate);assert.deepEqual(await snapshot(db),before);
  await t.test('all eleven tables retain own records and reject other accounts and unsigned callers',async()=>{
   for(const table of tables){
    const rows=(await as(users.a,`select * from ${table}`)).rows;
    assert.equal(rows.length,1,table);assert.equal(rows[0].user_id,users.a);
    assert.equal((await as(users.b,`select * from ${table} where user_id=$1`,[users.a])).rows.length,0,table);
    assert.equal((await as(users.fresh,`select * from ${table}`)).rows.length,0,table);
    assert.equal((await as(users.b,`delete from ${table} where user_id=$1 returning user_id`,[users.a])).rows.length,0,table);
    await assert.rejects(()=>as(null,`select * from ${table}`),e=>e.code==='42501',table);
    await assert.rejects(()=>as(users.a,`update ${table} set user_id=$1 where user_id=$2`,[users.b,users.a]),e=>e.code==='42501',table);
   }
   assert.deepEqual(await snapshot(db),before);
  });
  await t.test('browser grants exclude truncate, triggers, references, maintain and sequence reset',async()=>{
   await db.exec('reset role');
   for(const table of tables)for(const role of ['anon','authenticated'])for(const priv of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES','MAINTAIN']){
    const ok=(await db.query('select has_table_privilege($1,$2,$3) ok',[role,table,priv])).rows[0].ok;
    assert.equal(ok,role==='authenticated'&&['SELECT','INSERT','UPDATE','DELETE'].includes(priv),table+' '+role+' '+priv);
   }
   await assert.rejects(()=>as(users.a,'truncate roadmap_comparisons cascade'),e=>e.code==='42501');
   await assert.rejects(()=>as(users.a,"select setval('roadmap_suggestion_answers_id_seq',1)"),e=>e.code==='42501');
   const inserted=await as(users.a,"insert into roadmap_suggestion_answers(suggestion_id,from_app,action) values('unknown','fixture','skip') returning id");
   assert.ok(inserted.rows[0].id>0);
   await assert.rejects(()=>as(null,"select roadmap_save_comparison('{}')"),e=>e.code==='42501');
  });
  await t.test('actual parent links reject foreign owners on insert and update',async()=>{
   const updates=[
    ["roadmap_daily_logs","task_id",id(2)],
    ["roadmap_comparisons","task_id",id(2)],
    ["roadmap_suggestions","rm_task_id",id(2)],
    ["roadmap_task_resources","task_id",id(2)],
    ["roadmap_comparison_items","comparison_id",id(22)],
    ["roadmap_comparisons","chosen_item",id(32)]
   ];
   const old=await snapshot(db);
   for(const [table,col,parent] of updates)
    await assert.rejects(()=>as(users.a,`update ${table} set ${col}=$1 where user_id=$2`,[parent,users.a]),e=>e.code==='23503',table);
   for(const sql of [
    "insert into roadmap_daily_logs(task_id) values($1)",
    "insert into roadmap_task_resources(task_id,label,url) values($1,'Test','https://example.invalid')",
    "insert into roadmap_comparisons(task_id,title) values($1,'Test')",
    "insert into roadmap_suggestions(id,task,rm_task_id,title,say,until) values('bad','{}',$1,'Test','Test',now())"
   ]) await assert.rejects(()=>as(users.a,sql,[id(2)]),e=>e.code==='23503');
   await assert.rejects(()=>as(users.a,"insert into roadmap_comparison_items(comparison_id,name) values($1,'Test')",[id(22)]),e=>e.code==='23503');
   assert.deepEqual(await snapshot(db),old);
  });
  await t.test('a pick must belong to the same comparison, even within one account',async()=>{
   await as(users.a,"insert into roadmap_comparisons(id,title) values($1,'Second')",[id(100)]);
   await assert.rejects(()=>as(users.a,"update roadmap_comparisons set chosen_item=$1 where id=$2",[id(31),id(100)]),e=>e.code==='23503');
   await as(users.a,"update roadmap_comparisons set chosen_item=null where id=$1",[id(21)]);
   await as(users.a,"update roadmap_comparisons set chosen_item=$1 where id=$2",[id(31),id(21)]);
   await as(users.a,"delete from roadmap_comparison_items where id=$1",[id(31)]);
   const row=(await as(users.a,"select * from roadmap_comparisons where id=$1",[id(21)])).rows[0];
   assert.equal(row.chosen_item,null);assert.equal(row.user_id,users.a);assert.equal(row.notes,'Keep 日本語');
   await as(users.a,"insert into roadmap_comparison_items(id,comparison_id,name) values($1,$2,'Selected')",[id(101),id(100)]);
   await as(users.a,"update roadmap_comparisons set chosen_item=$1 where id=$2",[id(101),id(100)]);
   await as(users.a,"delete from roadmap_comparisons where id=$1",[id(100)]);
   assert.equal((await as(users.a,'select * from roadmap_comparison_items where id=$1',[id(101)])).rows.length,0);
  });
  await t.test('legacy invoker comparison import still commits completely and rolls back failed replacement',async()=>{
   const input={task_id:id(1),title:'Study',items:[{name:'Replacement',price:99}],user_id:users.b};
   const result=await as(users.a,'select roadmap_save_comparison($1) id',[input]);
   assert.equal(result.rows[0].id,id(21));
   assert.equal((await as(users.a,'select * from roadmap_comparison_items')).rows[0].user_id,users.a);
   const saved=await snapshot(db);
   await assert.rejects(()=>as(users.a,'select roadmap_save_comparison($1)',[{...input,items:[{name:'Bad',price:-1}]}]),e=>e.code==='23514');
   assert.deepEqual(await snapshot(db),saved);
   await as(users.a,"update roadmap_comparisons set weights='{\"quality\":3}' where id=$1",[id(21)]);
   await as(users.a,"delete from roadmap_comparisons where id=$1",[id(21)]);
   assert.equal((await as(users.a,'select * from roadmap_comparison_items')).rows.length,0);
   assert.equal((await as(users.b,'select * from roadmap_comparison_items')).rows.length,1);
  });
  await t.test('task and role deletion retain optional histories and ownership, cascading only owned children',async()=>{
   await as(users.a,"delete from roadmap_tasks where id=$1",[id(1)]);
   for(const [table,col] of [['roadmap_daily_logs','task_id'],['roadmap_suggestions','rm_task_id']]){
    const row=(await as(users.a,`select * from ${table}`)).rows[0];assert.equal(row[col],null);assert.equal(row.user_id,users.a);
   }
   assert.equal((await as(users.a,'select * from roadmap_task_resources')).rows.length,0);
   await as(users.a,"delete from roadmap_roles where id='role'");
   const project=(await as(users.a,'select * from roadmap_projects')).rows[0];
   assert.equal(project.role_id,null);assert.equal(project.user_id,users.a);
   assert.equal((await as(users.a,'select * from roadmap_role_locations')).rows.length,0);
   assert.equal((await as(users.b,'select * from roadmap_roles')).rows.length,1);
  });
 }finally{await db.close();}
});
test('historical cross-owner links or invalid picks stop the entire candidate without rewriting records',async t=>{
 const changes=[
  ["daily log","update roadmap_daily_logs set task_id='"+id(2)+"' where user_id='"+users.a+"'"],
  ["resource","update roadmap_task_resources set task_id='"+id(2)+"' where user_id='"+users.a+"'"],
  ["comparison","update roadmap_comparisons set task_id='"+id(2)+"' where user_id='"+users.a+"'"],
  ["item","update roadmap_comparison_items set comparison_id='"+id(22)+"' where user_id='"+users.a+"'"],
  ["suggestion","update roadmap_suggestions set rm_task_id='"+id(2)+"' where user_id='"+users.a+"'"],
  ["pick","update roadmap_comparisons set chosen_item='"+id(32)+"' where user_id='"+users.a+"'"]
 ];
 for(const [label,sql] of changes)await t.test(label,async()=>{
  const db=await baseline();try{
   await db.exec(sql);const before=await snapshot(db);
   await assert.rejects(()=>db.exec(candidate),e=>e.code==='23503');await db.exec('rollback');
   assert.deepEqual(await snapshot(db),before);
   assert.equal((await db.query("select has_table_privilege('authenticated','roadmap_daily_logs','truncate') ok")).rows[0].ok,true);
  }finally{await db.close();}
 });
});
test('schema, policy, trigger and invoker contract drift are refused atomically',async t=>{
 for(const change of [
  'alter table roadmap_daily_logs add column unexpected text',
  'alter table roadmap_daily_logs drop constraint roadmap_daily_logs_task_id_fkey',
  'alter table roadmap_comparisons disable trigger roadmap_comparisons_updated_at',
  'create policy unexpected on roadmap_daily_logs for select to authenticated using(true)',
  'alter function roadmap_save_comparison(jsonb) security definer',
  'alter function roadmap_save_comparison(jsonb) set search_path=public,pg_temp',
  'grant execute on function roadmap_save_comparison(jsonb) to authenticated with grant option'
 ])await t.test(change,async()=>{
  const db=await baseline();try{
   await db.exec(change);const before=await snapshot(db);
   await assert.rejects(()=>db.exec(candidate),/review/);await db.exec('rollback');assert.deepEqual(await snapshot(db),before);
  }finally{await db.close();}
 });
});
