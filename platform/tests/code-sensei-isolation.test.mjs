import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';
import {legacyFixture} from './shared-access-fixture.mjs';
const fixture=await readFile(new URL('./code-sensei-fixture.sql',import.meta.url),'utf8');
const candidate=await readFile(new URL('../operations/general-apps/05_code_sensei_isolation.sql',import.meta.url),'utf8');
const A='30000000-0000-4000-8000-000000000001',B='30000000-0000-4000-8000-000000000002';
const privateRows={
 code_sensei_user_notes:{topic_id:'synthetic',note_text:'retained note'},
 code_sensei_progress:{topic_id:'synthetic',roadmap_section:'practice',status:'done'},
 code_sensei_chat_history:{topic_id:'synthetic',role:'user',message:'retained chat'},
 code_sensei_revisions:{project_name:'synthetic',revision_name:'one'},
 code_sensei_streaks:{study_date:'2026-11-26'},
 code_sensei_py_projects:{id:1,project_name:'same name',view_mode:'single'},
 code_sensei_notebooks:{id:1,title:'retained notebook',url:'https://example.invalid/notebook'},
 code_sensei_exercises:{id:1,title:'retained exercise'},
 code_sensei_player:{xp:25},code_sensei_daily:{day:'2026-11-26'},
 code_sensei_wrong_answers:{challenge_id:'same question',topic_id:'synthetic',question:'Q',correct_answer:'A'}
};
async function baseline(){
 const db=await createAcceptanceDatabase(); await db.exec(legacyFixture); await db.exec(fixture);
 await db.exec(`insert into code_sensei_users(id) values('${A}'),('${B}');
 insert into authentication_mode_user_roles(id,email,role,auth_user_id) values(1,'a@example.invalid','viewer','${users.a}'),(2,'b@example.invalid','operator','${users.b}');`);
 for(const name of ['01_access_foundation.sql','02_legacy_policy_guards.sql']){
  if(name.startsWith('02'))await db.exec(`insert into ga_private.owner_links(app,legacy_id,auth_user_id) values('code-sensei','${A}','${users.a}'),('code-sensei','${B}','${users.b}');
   insert into ga_private.eagle_members values('${users.b}');
   insert into ga_private.client_cutovers values('code-sensei','synthetic client',now()),('healthlog-archive','synthetic client',now()),('eagle','synthetic client',now());`);
  await db.exec(await readFile(new URL('../operations/general-apps/'+name,import.meta.url),'utf8'));
 }
 return db;
}
async function insert(db,as,who,table,row){const keys=Object.keys(row);return (await as(who,`insert into ${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(row))).rows[0];}
const deny=call=>assert.rejects(call,e=>['42501','23502','23503'].includes(e.code));

test('Code_sensei complete private data graph isolates mapped accounts',async t=>{
 const db=await baseline(),{as}=access(db);const records={};
 try{
  // Seed before installation: the candidate must not change any saved payload.
  for(const [table,row] of Object.entries(privateRows)){
   await db.exec('reset role'); records[table]=(await db.query(`insert into ${table}(${Object.keys({...row,user_id:A}).join(',')}) values(${Object.keys({...row,user_id:A}).map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values({...row,user_id:A}))).rows[0];
  }
  const before=await db.query("select jsonb_agg(to_jsonb(t)) data from code_sensei_user_notes t");
  await db.exec(candidate);
  assert.deepEqual(await db.query("select jsonb_agg(to_jsonb(t)) data from code_sensei_user_notes t"),before);
  for(const [table,row] of Object.entries(privateRows))await t.test(table+' read/write/foreign-owner denial',async()=>{
   assert.equal((await as(users.a,`select * from ${table}`)).rows.length,1);
   assert.equal((await as(users.b,`select * from ${table}`)).rows.length,0);
   assert.equal((await as(users.fresh,`select * from ${table}`)).rows.length,0);
   await deny(()=>as(null,`select * from ${table}`));
   assert.equal((await as(users.b,`delete from ${table} where user_id=$1 returning id`,[A])).rows.length,0);
   await deny(()=>as(users.a,`update ${table} set user_id=$1 where user_id=$2`,[B,A]));
   const foreign={...row,user_id:A};delete foreign.id;
   if(['code_sensei_exercises','code_sensei_py_projects','code_sensei_notebooks'].includes(table))foreign.id=98;
   await assert.rejects(()=>insert(db,as,users.b,table,foreign),e=>e.code==='42501');
   const own={...row,user_id:B};delete own.id;
   if(table==='code_sensei_exercises'||table==='code_sensei_py_projects'||table==='code_sensei_notebooks')own.id=2;
   const saved=await insert(db,as,users.b,table,own); assert.equal(saved.user_id,B);
   assert.deepEqual((await as(users.a,`select * from ${table}`)).rows[0],records[table]);
  });
  await t.test('children and mistaken cross-exercise links stay private',async()=>{
   for(const [table,row] of [
    ['code_sensei_attempts',{id:10,exercise_id:1,attempt_number:1,result:'pass'}],
    ['code_sensei_mistakes',{id:10,exercise_id:1,attempt_id:10,language:'python',title:'retained mistake'}],
    ['code_sensei_py_files',{id:10,project_id:1,filename:'main.py',code_content:'print(1)'}],
    ['code_sensei_revision_files',{revision_id:records.code_sensei_revisions.id,filename:'main.py',language:'python',file_content:'print(1)'}]
   ]){
    const saved=await insert(db,as,users.a,table,row);
    assert.equal((await as(users.b,`select * from ${table}`)).rows.length,0);
    assert.equal((await as(users.fresh,`select * from ${table}`)).rows.length,0);
    const other={...row};delete other.id; await deny(()=>insert(db,as,users.b,table,other));
    assert.equal((await as(users.b,`delete from ${table} where id=$1 returning id`,[saved.id])).rows.length,0);
   }
   await insert(db,as,users.b,'code_sensei_attempts',{id:20,exercise_id:2,attempt_number:1});
   await deny(()=>insert(db,as,users.a,'code_sensei_mistakes',{id:30,exercise_id:1,attempt_id:20,language:'python',title:'foreign'}));
   await deny(()=>as(users.a,'update code_sensei_py_files set project_id=2 where project_id=1'));
   await as(users.a,'delete from code_sensei_attempts where id=10');
   assert.equal((await as(users.a,'select attempt_id from code_sensei_mistakes')).rows[0].attempt_id,null);
  });
  await t.test('unmapped, revoked and anonymous identities cannot resolve an owner',async()=>{
   await deny(()=>as(users.fresh,'select code_sensei_current_user_id()'));
   await db.exec("reset role; select set_config('request.jwt.claims','{\"is_anonymous\":true}',false)");
   await deny(()=>as(users.a,'select code_sensei_current_user_id()'));
   assert.equal((await as(users.a,'select * from code_sensei_py_projects')).rows.length,0);
   await db.exec("reset role; select set_config('request.jwt.claims','{}',false)");
   await db.query("delete from ga_private.owner_links where app='code-sensei' and auth_user_id=$1",[users.a]);
   await deny(()=>as(users.a,'select code_sensei_current_user_id()'));
   assert.equal((await as(users.a,'select * from code_sensei_py_projects')).rows.length,0);
   await db.exec('reset role');
   assert.equal((await db.query('select count(*)::int n from code_sensei_py_projects')).rows[0].n,2);
  });
 }finally{await db.close();}
});

test('Code_sensei shared content, offline retry and transactional project saving',async t=>{
 const db=await baseline(),{as}=access(db);
 try{
  await db.exec(candidate);
  await t.test('shared content requires membership; only verified editors can publish',async()=>{
   const row={course_name:'Synthetic',day_number:1,title:'First'};
   await deny(()=>insert(db,as,users.a,'code_sensei_course_days',row));
   await insert(db,as,users.b,'code_sensei_course_days',row);
   assert.equal((await as(users.a,'select * from code_sensei_course_days')).rows.length,1);
   assert.equal((await as(users.fresh,'select * from code_sensei_course_days')).rows.length,0);
   await deny(()=>as(users.b,'delete from code_sensei_course_days'));
   await deny(()=>as(users.b,'update code_sensei_users set name=\'forged\''));
  });
  await t.test('retry receipts prevent duplicate attempts and reject changed payloads',async()=>{
   await insert(db,as,users.a,'code_sensei_exercises',{id:1,user_id:A,title:'Exercise'});
   const operation=randomUUID(),payload={table:'code_sensei_attempts',action:'post',data:{exercise_id:1,attempt_number:1,code:'print(42)'}};
   const run=p=>as(users.a,'select code_sensei_apply_offline($1,$2) result',[operation,p]);
   const first=await run(payload); assert.deepEqual(await run(payload),first);
   assert.equal((await as(users.a,'select * from code_sensei_attempts')).rows.length,1);
   await assert.rejects(()=>run({...payload,data:{...payload.data,code:'changed'}}),e=>e.code==='22023');
   await deny(()=>as(users.b,'select code_sensei_apply_offline($1,$2)',[randomUUID(),payload]));
   const patch={table:'code_sensei_exercises',action:'patch',id:1,data:{status:'done'}};
   await as(users.a,'select code_sensei_apply_offline($1,$2)',[randomUUID(),patch]);
   assert.equal((await as(users.a,'select status from code_sensei_exercises')).rows[0].status,'done');
   assert.equal((await as(users.b,'select * from ga_private.code_sensei_receipts')).rows.length,0);
  });
  await t.test('failed replacement and foreign project access preserve original files',async()=>{
   const save=(who,id,files)=>as(who,"select code_sensei_save_project($1,'Synthetic','single',$2) id",[id,files]);
   const original=[{filename:'main.py',code_content:'retained code'}];
   const id=(await save(users.a,null,original)).rows[0].id;
   await assert.rejects(()=>save(users.a,id,[...original,{filename:null,code_content:'bad'}]));
   await deny(()=>save(users.b,id,[{filename:'wrong.py',code_content:'wrong'}]));
   assert.deepEqual((await as(users.a,'select filename,code_content from code_sensei_py_files')).rows,original);
   await save(users.a,id,[{filename:'new.py',code_content:'new code'}]);
   assert.equal((await as(users.a,'select filename from code_sensei_py_files')).rows[0].filename,'new.py');
  });
 }finally{await db.close();}
});

test('Code_sensei installer fails atomically on unreviewed data, policies and grants',async t=>{
 const db=await baseline();
 try{
  for(const [name,change,undo,expected] of [
   ['ownerless notebook',"insert into code_sensei_notebooks(id,title,url) values(90,'unassigned','https://example.invalid')",'delete from code_sensei_notebooks where id=90',/missing owner/],
   ['schema drift','alter table code_sensei_notebooks add column hidden text','alter table code_sensei_notebooks drop column hidden',/schema drift/],
   ['policy drift','create policy unreviewed on code_sensei_notebooks using(true)','drop policy unreviewed on code_sensei_notebooks',/policy drift/],
   ['inherited grants','create role fixture_reader; grant fixture_reader to anon; grant select on code_sensei_notebooks to fixture_reader','drop owned by fixture_reader; drop role fixture_reader',/unexpected effective/],
  ])await t.test(name,async()=>{
   await db.exec(change); await assert.rejects(()=>db.exec(candidate),expected);await db.exec('rollback');
   assert.equal((await db.query("select count(*)::int n from pg_policies where policyname='cs_identity_guard'")).rows[0].n,0);
   await db.exec(undo);
  });
 }finally{await db.close();}
});
