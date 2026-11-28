import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
export async function roadmapStudyAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const task=randomUUID(),day='2026-11-26',seq=20000020;
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const payload={task_id:task,day_key:day,duration:12,mode:'srs',source:'japanese-study-app-advanced',words:8,correct:6,test_type:'reading'};
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const call=`select ga_roadmap_receive_study_report(${seq})`;
 await check('Study report applies one original-day session through concurrent authenticated requests',async()=>{
  await sql(await readFile(new URL('../operations/general-apps/20_roadmap_study_reports.sql',import.meta.url),'utf8'));
  await sql(`insert into roadmap_tasks(id,user_id,title) values('${task}','${a.id}','Synthetic study');
   insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values(${seq},'${a.id}','jlpt','rm','session.completed',${literal(JSON.stringify({task_id:task,day_key:day}))},${literal(JSON.stringify(payload))},'jlpt:session:${randomUUID()}')`);
  let ready=false;for(let n=0;n<30;n++){const r=await a.client.rpc('ga_roadmap_receive_study_report',{p_seq:seq});if(r.error?.code==='42501'){ready=true;break}await pause(100)}assert.ok(ready);
  await sql(`insert into ga_private.roadmap_study_sources values('${a.id}','jlpt','japanese-study-app-advanced',true,'request','Synthetic caller review');
   insert into akatsuki_vocab(user_id,ns,id,schema) values
   ('${a.id}','kind','session.completed','{"required":["task_id","day_key","duration","mode"],"optional":["words","level","correct","test_type","source"]}'),
   ('${a.id}','enum','jlpt_mode','{"values":["goi","kanji","self_study","srs"]}'),('${a.id}','enum','jlpt_test_type','{"values":["kanji","reading","writing"]}')`);
  const results=await Promise.all([a.client.rpc('ga_roadmap_receive_study_report',{p_seq:seq}),a.client.rpc('ga_roadmap_receive_study_report',{p_seq:seq})]);
  const first=data(results[0],'First study report'),second=data(results[1],'Concurrent study report');assert.equal(first.session.id,second.session.id);assert.equal(first.session.completed_at,second.session.completed_at);assert.equal(first.day_key,day);
  assert.equal(await sql(`select count(*) from roadmap_study_sessions where task_id='${task}'`),'1');assert.equal(await sql(`select count(*) from ga_private.roadmap_study_report_receipts where auth_user_id='${a.id}'`),'1');
  denied(await client().rpc('ga_roadmap_receive_study_report',{p_seq:seq}),'Unsigned study');denied(await b.client.rpc('ga_roadmap_receive_study_report',{p_seq:seq}),'Foreign study');
 });
 await check('Study receipts preserve later edits and reject altered stored event evidence',async()=>{
  await sql(`update roadmap_study_sessions set feedback=feedback||'{"notes":"Keep later notes"}' where task_id='${task}'`);
  const r=data(await a.client.rpc('ga_roadmap_receive_study_report',{p_seq:seq}),'Replay current study');assert.equal(r.outcome,'superseded');assert.equal(r.session.feedback.notes,'Keep later notes');
  await sql(`update akatsuki_requests set payload=payload||'{"duration":13}' where seq=${seq}`);denied(await a.client.rpc('ga_roadmap_receive_study_report',{p_seq:seq}),'Changed study evidence','40001');
  await sql(`update akatsuki_requests set payload=${literal(JSON.stringify(payload))} where seq=${seq}`);
 });
 await check('Study delivery rechecks ownership, source revocation and pause after committed lock waits',async()=>{
  await withBlockedWriter(52,`update akatsuki_requests set user_id='${b.id}' where seq=${seq}`,`begin;${claim}${call};commit;`,/study report unavailable/);
  await sql(`update akatsuki_requests set user_id='${a.id}' where seq=${seq}`);
  await withBlockedWriter(53,`update ga_private.roadmap_study_sources set enabled=false where auth_user_id='${a.id}'`,`begin;${claim}${call};commit;`,/study caller review required/);
  await sql(`update ga_private.roadmap_study_sources set enabled=true where auth_user_id='${a.id}'`);
  await withBlockedWriter(54,'update ga_private.roadmap_control set paused=true',`begin;${claim}${call};commit;`,/study report access denied/);await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(55,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim}${call};commit;`,/study report access denied/);await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
  const other=randomUUID(),otherPayload={...payload,task_id:other};
  await sql(`insert into roadmap_tasks(id,user_id,title) values('${other}','${a.id}','Synthetic ownership wait');
   insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values(${seq+10},'${a.id}','jlpt','rm','session.completed',${literal(JSON.stringify({task_id:other,day_key:day}))},${literal(JSON.stringify(otherPayload))},'jlpt:session:${randomUUID()}')`);
  await withBlockedWriter(56,`update roadmap_tasks set user_id='${b.id}' where id='${other}'`,`begin;${claim}select ga_roadmap_receive_study_report(${seq+10});commit;`,/study task unavailable/);
  assert.equal(await sql(`select count(*) from roadmap_study_sessions where task_id='${other}'`),'0');
 });
}
