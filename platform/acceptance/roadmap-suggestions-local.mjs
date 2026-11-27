import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';
export async function roadmapSuggestionsAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause}){
 const task=randomUUID(),sid='suggest-'+randomUUID(),foreign='foreign-'+randomUUID(),request=randomUUID(),seq=17000001;
 const payload={suggestion_id:sid,action:'start',reason:null,from_app:'rm',seq,day_key:'2026-11-27',at:'2026-11-27T01:00:00Z'};
 const params={p_request_id:request,p_payload:payload};
 const literal=x=>"'"+String(x).replaceAll("'","''")+"'";
 const claim=`set local role authenticated;select set_config('request.jwt.claim.sub','${a.id}',true);select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated","is_anonymous":false}',true);`;
 const call=p=>`select ga_roadmap_answer_suggestion(${literal(JSON.stringify(p.p_payload))},'${p.p_request_id}')`;
 await check('Roadmap suggestion answers and session starts commit once under concurrent JWT delivery',async()=>{
  await sql(`insert into roadmap_tasks(id,user_id,title) values('${task}','${a.id}','Synthetic suggested task');
   insert into roadmap_suggestions(id,user_id,rm_task_id,task,title,say,until) values
   ('${sid}','${a.id}','${task}','{"board_id":"rm","item_key":"local","sub_id":"task"}','Keep suggestion','Keep',now()+interval '1 day'),
   ('${foreign}','${b.id}',null,'{}','Foreign suggestion','Keep',now()+interval '1 day')`);
  const before=await sql('select jsonb_agg(to_jsonb(s) order by id) from roadmap_suggestions s');
  await sql(await readFile(new URL('../operations/general-apps/17_roadmap_suggestion_delivery.sql',import.meta.url),'utf8'));
  assert.equal(await sql('select jsonb_agg(to_jsonb(s) order by id) from roadmap_suggestions s'),before);
  let ready=false;for(let n=0;n<30;n++){const r=await a.client.rpc('ga_roadmap_answer_suggestion',{...params,p_payload:{}});if(r.error?.code==='22023'){ready=true;break}await pause(100)}assert.ok(ready);
  const responses=await Promise.all([a.client.rpc('ga_roadmap_answer_suggestion',params),a.client.rpc('ga_roadmap_answer_suggestion',{...params,p_request_id:randomUUID()})]);
  const x=data(responses[0],'First answer'),y=data(responses[1],'Concurrent delivery');assert.equal(x.receipt_id,y.receipt_id);assert.equal(x.suggestion.answer,'start');
  assert.equal(await sql(`select count(*) from roadmap_suggestion_answers where user_id='${a.id}' and seq=${seq}`),'1');
  assert.equal(await sql(`select count(*) from roadmap_study_sessions where task_id='${task}' and day_key='2026-11-27'`),'1');
  denied(await client().rpc('ga_roadmap_answer_suggestion',params),'Unsigned answer');
  const other=data(await b.client.rpc('ga_roadmap_answer_suggestion',params),'Unknown cross-owner answer');assert.equal(other.outcome,'unknown');assert.equal(other.suggestion,null);assert.equal(other.effect,null);
  assert.deepEqual(data(await b.client.from('roadmap_study_sessions').select('*').eq('task_id',task),'Isolated started session'),[]);
 });
 await check('Roadmap skips retain exact addresses and original effects after lost response or duplicate delivery',async()=>{
  const name='skip-'+randomUUID(),addr={board_id:'board',item_key:'study:日本語/Elite',sub_id:'sub',extra:{keep:'exact'}};
  await sql(`insert into roadmap_suggestions(id,user_id,task,title,say,until) values('${name}','${a.id}',${literal(JSON.stringify(addr))},'Skip','Skip',now()+interval '1 day')`);
  const p={p_request_id:randomUUID(),p_payload:{...payload,suggestion_id:name,action:'skip',reason:'Keep reason',seq:17000002}};
  const x=data(await a.client.rpc('ga_roadmap_answer_suggestion',p),'Skip answer'),y=data(await a.client.rpc('ga_roadmap_answer_suggestion',p),'Skip replay');
  assert.deepEqual(x.effect,y.effect);assert.deepEqual(x.effect.src_addr,addr);assert.equal(y.replayed,true);
  denied(await a.client.rpc('ga_roadmap_answer_suggestion',{...p,p_payload:{...p.p_payload,reason:'Changed'}}),'Changed retry','22023');
  await sql(`create function fixture_answer_receipt_fail() returns trigger language plpgsql as $$begin return null;end;$$;
   create trigger fixture_answer_receipt_fail before insert on ga_private.roadmap_answer_receipts for each row execute function fixture_answer_receipt_fail()`);
  const before=await sql(`select jsonb_agg(to_jsonb(r) order by id) from roadmap_suggestion_answers r`);
  denied(await a.client.rpc('ga_roadmap_answer_suggestion',{...p,p_request_id:randomUUID(),p_payload:{...p.p_payload,seq:17000003}}),'Lost receipt','40001');
  assert.equal(await sql(`select jsonb_agg(to_jsonb(r) order by id) from roadmap_suggestion_answers r`),before);
  await sql('drop trigger fixture_answer_receipt_fail on ga_private.roadmap_answer_receipts;drop function fixture_answer_receipt_fail()');
 });
 await check('Roadmap suggestion delivery rechecks committed ownership, pause and verification after lock waits',async()=>{
  const name='wait-'+randomUUID();await sql(`insert into roadmap_suggestions(id,user_id,task,title,say,until) values('${name}','${a.id}','{}','Wait','Wait',now())`);
  const p={p_request_id:randomUUID(),p_payload:{...payload,suggestion_id:name,seq:17000004}};
  // An owner change while FOR UPDATE waits must not reveal or change the moved row.
  await withBlockedWriter(40,`update roadmap_suggestions set user_id='${b.id}' where id='${name}'`,
   `begin;${claim}${call(p)};do $$begin if exists(select from roadmap_suggestions where id='${name}') then raise exception 'foreign row visible';end if;raise exception 'foreign suggestion safely hidden';end$$;commit;`,/foreign suggestion safely hidden/);
  assert.equal(await sql(`select answer is null from roadmap_suggestions where id='${name}'`),'t');
  await withBlockedWriter(41,'update ga_private.roadmap_control set paused=true',`begin;${claim}${call(params)};commit;`,/suggestion access denied/);
  denied(await a.client.rpc('ga_roadmap_answer_suggestion',params),'Paused replay');await sql('update ga_private.roadmap_control set paused=false');
  await withBlockedWriter(42,`update auth.users set email_confirmed_at=null where id='${a.id}'`,`begin;${claim}${call(params)};commit;`,/suggestion access denied/);
  denied(await a.client.rpc('ga_roadmap_answer_suggestion',params),'Unverified replay');await sql(`update auth.users set email_confirmed_at=now() where id='${a.id}'`);
 });
}
