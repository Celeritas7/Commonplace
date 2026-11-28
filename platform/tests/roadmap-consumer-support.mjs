import {protocolFixture,readCandidate,access,users} from './roadmap-hub-protocol-support.mjs';export {readCandidate,access,users};
export const id=n=>'22000000-0000-4000-8000-'+String(n).padStart(12,'0');
export const address={suggestion_id:'synthetic-answer',opaque:{keep:'日本語'}},taskAddress={board_id:'synthetic-board',item_key:'study:日本語',sub_id:'one',opaque:{keep:'exact'}};
export const suggestionPayload={suggestion_id:'synthetic-answer',action:'skip',reason:'Keep 日本語',at:'2026-11-28T01:00:00Z',app:'wf'};
export const studyPayload={task_id:id(1),day_key:'2026-11-28',duration:12,mode:'srs',source:'japanese-study-app-advanced'};
export async function consumerFixture(install=true){const db=await protocolFixture();try{
 for(const f of ['17_roadmap_suggestion_delivery.sql','20_roadmap_study_reports.sql','21_roadmap_hub_acknowledgements.sql'])await db.exec(await readCandidate(f));
 await db.query("insert into roadmap_tasks(id,user_id,title) values($1,$2,'Keep task')",[id(1),users.a]);
 await db.query("insert into roadmap_suggestions(id,user_id,rm_task_id,task,title,say,until) values('synthetic-answer',$1,$2,$3,'Keep task','Keep',now()+interval '1 day')",[users.a,id(1),taskAddress]);
 await db.exec(`insert into ga_private.roadmap_study_sources values('${users.a}','jlpt','japanese-study-app-advanced',true,'request','Synthetic review');
 insert into akatsuki_vocab(user_id,ns,id,schema) values
 ('${users.a}','kind','suggestion.answered','{"required":["suggestion_id","action","at","app"],"optional":["reason"]}'),
 ('${users.a}','enum','answer_action','{"values":["start","skip","dismiss"]}'),
 ('${users.a}','kind','session.completed','{"required":["task_id","day_key","duration","mode"],"optional":["words","level","correct","test_type","source"]}'),
 ('${users.a}','enum','jlpt_mode','{"values":["goi","kanji","self_study","srs"]}')`);
 if(install)await db.exec(await readCandidate('22_roadmap_consumer_acknowledgements.sql'));return db;
 }catch(e){await db.close();throw e}}
export async function enableConsumers(db){await db.exec(`reset role;insert into ga_private.roadmap_consumer_access(auth_user_id,kind,from_app,enabled,review_ref) values
 ('${users.a}','suggestion.answered','wf',true,'Synthetic review'),('${users.a}','session.completed','jlpt',true,'Synthetic review'),
 ('${users.b}','suggestion.answered','wf',true,'Synthetic review'),('${users.b}','session.completed','jlpt',true,'Synthetic review')`)}
export async function putConsumer(db,seq,{kind='suggestion.answered',payload=kind==='suggestion.answered'?suggestionPayload:studyPayload,addr=kind==='suggestion.answered'?address:{task_id:payload.task_id,day_key:payload.day_key},from=kind==='suggestion.answered'?'wf':'jlpt',owner=users.a,key=kind==='suggestion.answered'?from+':ans:'+payload.suggestion_id:'jlpt:session:'+id(seq)}={}){
 await db.exec('reset role');await db.query('insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values($1,$2,$3,\'rm\',$4,$5,$6,$7)',[seq,owner,from,kind,addr,payload,key]);
}
export async function publishEffect(db,result,seq){await db.exec('reset role');const e=result.effect;await db.query('insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,src_clock,payload,idempotency_key) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[seq,users.a,e.from_app,e.to_app,e.kind,e.src_addr,e.src_clock,e.payload,e.idempotency_key])}
export function consumerApi(db){const {as}=access(db);return{as,
 answer:(seq,request=id(seq),day='2026-11-28',owner=users.a)=>as(owner,'select ga_roadmap_receive_suggestion_event($1,$2,$3) r',[seq,request,day]).then(r=>r.rows[0].r),
 study:(seq,owner=users.a)=>as(owner,'select ga_roadmap_receive_study_event($1) r',[seq]).then(r=>r.rows[0].r),
 ack:(seq,owner=users.a)=>as(owner,'select ga_roadmap_ack_consumer_event($1) r',[seq]).then(r=>r.rows[0].r),
 status:(seq,owner=users.a)=>as(owner,'select ga_roadmap_consumer_status($1) r',[seq]).then(r=>r.rows[0].r)}}
export async function consumerSnapshot(db){await db.exec('reset role');const out={};for(const table of ['akatsuki_requests','akatsuki_links','akatsuki_cursors','roadmap_tasks','roadmap_suggestions','roadmap_suggestion_answers','roadmap_study_sessions','ga_private.roadmap_consumer_received','ga_private.roadmap_consumer_acknowledged'])out[table]=(await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') r from ${table} t`)).rows[0].r;return out}
