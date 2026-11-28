import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';import {legacyFixture} from './shared-access-fixture.mjs';
const read=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8'),candidate=await read('20_roadmap_study_reports.sql');
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0'),day='2026-11-26';
const schema={required:['task_id','day_key','duration','mode'],optional:['words','level','correct','test_type','source']};
async function fixture(install=true){const db=await createAcceptanceDatabase();try{
 await db.exec(legacyFixture);for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql','roadmap-hub-fixture.sql'])await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
 for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql','15_roadmap_task_creation.sql','18_roadmap_mirror_delivery.sql','19_roadmap_completion_replies.sql'])await db.exec(await read(f));
 await db.exec(`insert into roadmap_tasks(id,user_id,title,tags) values('${id(1)}','${users.a}','Keep 日本語 notes','{daily-routine}'),('${id(2)}','${users.b}','Foreign','{}');
  insert into roadmap_study_sessions(user_id,task_id,day_key,source,started_at,feedback) values('${users.a}','${id(1)}','${day}','roadmap','2026-11-26T18:50:00Z','{"note":"keep"}');`);
 for(const [ns,key,value] of [['kind','session.completed',schema],['enum','jlpt_mode',{values:['goi','kanji','self_study','srs']}],['enum','jlpt_level',{values:['N1','N2','N3','ALL']}],['enum','jlpt_test_type',{values:['kanji','reading','writing']}]])
  await db.query('insert into akatsuki_vocab(user_id,ns,id,schema) values($1,$2,$3,$4)',[users.a,ns,key,value]);
 if(install)await db.exec(candidate);return db;
 }catch(e){await db.close();throw e}}
const report=(seq=20,patch={})=>({task_id:id(1),day_key:day,duration:12,mode:'srs',source:'japanese-study-app-advanced',words:10,correct:8,test_type:'reading',...patch});
async function publish(db,seq=20,patch={},owner=users.a){await db.exec('reset role');const p=report(seq,patch);
 await db.query("insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values($1,$2,'jlpt','rm','session.completed',$3,$4,$5)",[seq,owner,{task_id:p.task_id,day_key:p.day_key,opaque:{preserve:'exact'}},p,'jlpt:session:'+id(seq)]);
}
async function enable(db){await db.exec(`reset role;insert into ga_private.roadmap_study_sources values('${users.a}','jlpt','japanese-study-app-advanced',true,'request','Synthetic review')`)}
async function rows(db){await db.exec('reset role');return (await db.query('select to_jsonb(s) s from roadmap_study_sessions s order by id')).rows.map(r=>r.s)}
test('stored study reports are isolated, replay safe, original-day and honest about existing evidence',async t=>{
 const db=await fixture(false),a=access(db);const receive=(seq=20,owner=users.a)=>a.as(owner,'select ga_roadmap_receive_study_report($1) r',[seq]).then(r=>r.rows[0].r);
 try{const baseline=await rows(db);await db.exec(candidate);assert.deepEqual(await rows(db),baseline);await publish(db);
  await t.test('empty review gate, unsigned, foreign and unverified accounts fail closed',async()=>{
   await assert.rejects(()=>receive(),e=>e.code==='42501');await enable(db);for(const owner of [null,users.b])await assert.rejects(()=>receive(20,owner),e=>e.code==='42501');
   await db.exec(`reset role;update auth.users set email_confirmed_at=null where id='${users.a}'`);await assert.rejects(()=>receive(),e=>e.code==='42501');await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${users.a}'`);
   await assert.rejects(()=>a.as(users.a,'insert into ga_private.roadmap_study_sources values($1,$2,$3,true,$4,$5)',[users.b,'jlpt','japanese-study-app-advanced','request','forged']),e=>e.code==='42501');
  });
  await t.test('receipt failure rolls back all changes, retry returns the original result without resetting time',async()=>{
   await db.exec(`reset role;create function fixture_report_fail() returns trigger language plpgsql as $$begin return null;end;$$;create trigger fixture_report_fail before insert on ga_private.roadmap_study_report_receipts for each row execute function fixture_report_fail()`);
   await assert.rejects(()=>receive(),e=>e.code==='40001');assert.deepEqual(await rows(db),baseline);await db.exec('drop trigger fixture_report_fail on ga_private.roadmap_study_report_receipts;drop function fixture_report_fail()');
   const result=await receive();assert.equal(result.outcome,'reported');assert.equal(result.session.day_key,day);assert.equal(result.session.duration_min,12);assert.equal(result.session.started_at,'2026-11-26T18:50:00+00:00');assert.equal(result.session.feedback.note,'keep');
   assert.equal(result.session.feedback.testType,'reading');const saved=await rows(db);assert.equal((await receive()).replayed,true);assert.deepEqual(await rows(db),saved);
   await db.exec('reset role');assert.equal((await db.query('select done from roadmap_tasks where id=$1',[id(1)])).rows[0].done,false);
  });
  await t.test('newer source order wins, old replays show current rows, manual edits are never overwritten',async()=>{
   await publish(db,40,{duration:18});const newest=await receive(40);assert.equal(newest.session.duration_min,18);
   assert.equal((await receive()).outcome,'superseded');await publish(db,30,{duration:2});assert.equal((await receive(30)).session.duration_min,18);
   await db.exec("reset role;update roadmap_study_sessions set feedback=feedback||'{\"local_edit\":\"keep\"}'");
   await publish(db,50,{duration:20});await assert.rejects(()=>receive(50),e=>e.code==='40001');const replay=await receive(40);assert.equal(replay.outcome,'superseded');assert.equal(replay.session.feedback.local_edit,'keep');
  });
  await t.test('direction, address, schema, source, verification claims and malformed dates do not become completion',async()=>{
   for(const [seq,p] of [[60,{day_key:'2026-02-30'}],[61,{verification:'api'}],[62,{mode:'unknown'}],[63,{duration:1441}],[64,{correct:11}],[65,{source:'other'}],[66,{task_id:id(2)}],[67,{day_key:null}],[68,{mode:null}]]){
    await publish(db,seq,p);await assert.rejects(()=>receive(seq),e=>['22023','42501'].includes(e.code));
   }
   await db.exec("reset role;update akatsuki_requests set payload=payload||'{\"duration\":11}' where seq=20");await assert.rejects(()=>receive(),e=>e.code==='40001');
   await db.exec("reset role;update akatsuki_requests set payload=payload||'{\"duration\":12}' where seq=20;update akatsuki_requests set src_addr='{}' where seq=30");await assert.rejects(()=>receive(30),e=>e.code==='22023');
   await db.exec("reset role;update akatsuki_vocab set schema='{}' where ns='kind'");await assert.rejects(()=>receive(),e=>e.code==='40001');await db.exec('reset role');await db.query("update akatsuki_vocab set schema=$1 where ns='kind'",[schema]);
  });
  await t.test('existing app/API proof and null-task history are preserved',async()=>{
   await db.exec(`reset role;insert into roadmap_study_sessions(user_id,task_id,day_key,source,verification,completed_at,duration_min,feedback) values
    ('${users.a}','${id(1)}','2026-11-25','legacy-api','api',now(),32,'{"proof":"original"}'),('${users.a}',null,'2026-11-24','legacy','app',now(),5,'{}')`);
   const before=await rows(db);await publish(db,70,{day_key:'2026-11-25'});assert.equal((await receive(70)).outcome,'preserved');assert.deepEqual(await rows(db),before);
   await publish(db,71,{day_key:'2026-11-25',duration:15});assert.equal((await receive(71)).outcome,'preserved');assert.deepEqual(await rows(db),before);
   await db.exec("reset role;update roadmap_study_sessions set completed_at=null,verification='manual' where day_key='2026-11-25'");const undone=await rows(db);
   await publish(db,69,{day_key:'2026-11-25'});assert.equal((await receive(69)).outcome,'superseded');assert.deepEqual(await rows(db),undone);
   await publish(db,72,{day_key:'2026-11-25'});await assert.rejects(()=>receive(72),e=>e.code==='40001');assert.deepEqual(await rows(db),undone);
  });
  await t.test('pause and revoked source block replays; deleted task is never recreated',async()=>{
   for(const [stop,start] of [['update ga_private.roadmap_control set paused=true','update ga_private.roadmap_control set paused=false'],['update ga_private.roadmap_study_sources set enabled=false','update ga_private.roadmap_study_sources set enabled=true']]){
    await db.exec('reset role;'+stop);await assert.rejects(()=>receive(),e=>e.code==='42501');await db.exec('reset role;'+start);
   }
   await db.exec('reset role');await db.query('delete from roadmap_tasks where id=$1',[id(1)]);await assert.rejects(()=>receive(),e=>e.code==='42501');assert.equal((await rows(db)).length,1);
  });
 }finally{await db.close()}
});
test('study report install refuses drift atomically and legacy daily keys require explicit review',async()=>{
 const db=await fixture(false);try{await db.exec('alter table roadmap_study_sessions add column unreviewed text');await assert.rejects(()=>db.exec(candidate),/baseline/);await db.exec('rollback');assert.equal((await db.query("select to_regclass('ga_private.roadmap_study_sources') r")).rows[0].r,null);
 }finally{await db.close()}
 const clean=await fixture();try{await enable(clean);await publish(clean);await clean.exec(`update akatsuki_requests set idempotency_key='jlpt:session:${id(1)}:${day}'`);const a=access(clean);
  await assert.rejects(()=>a.as(users.a,'select ga_roadmap_receive_study_report(20)'),e=>e.code==='40001');await clean.exec("reset role;update ga_private.roadmap_study_sources set key_mode='daily'");assert.equal((await a.as(users.a,'select ga_roadmap_receive_study_report(20) r')).rows[0].r.outcome,'reported');
 }finally{await clean.close()}
});
