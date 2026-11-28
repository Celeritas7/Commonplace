import {readFile} from 'node:fs/promises';
import {createAcceptanceDatabase,access,users} from './acceptance-fixture.mjs';
import {legacyFixture} from './shared-access-fixture.mjs';
export {access,users};
export const readCandidate=f=>readFile(new URL('../operations/general-apps/'+f,import.meta.url),'utf8');
export const address={board_id:'synthetic-board',item_key:'study:日本語',sub_id:'one',opaque:{keep:'exact'}};
export async function protocolFixture(){const db=await createAcceptanceDatabase();try{
 await db.exec(legacyFixture);
 for(const f of ['roadmap-session-fixture.sql','roadmap-records-fixture.sql','roadmap-hub-fixture.sql','roadmap-hub-protocol-fixture.sql'])await db.exec(await readFile(new URL('./'+f,import.meta.url),'utf8'));
 for(const f of ['01_access_foundation.sql','03_roadmap_session_owner.sql','09_roadmap_record_ownership.sql','15_roadmap_task_creation.sql','18_roadmap_mirror_delivery.sql','19_roadmap_completion_replies.sql'])await db.exec(await readCandidate(f));
 return db;
 }catch(e){await db.close();throw e}}
export async function putEvent(db,seq,payload={title:'Keep 日本語',done:false},addr=address,owner=users.a){await db.exec('reset role');
 await db.query("insert into akatsuki_requests(seq,user_id,from_app,to_app,kind,src_addr,payload,idempotency_key) values($1,$2,'wf','rm','task.upsert',$3,$4,$5)",[seq,owner,addr,payload,'synthetic:'+owner+':'+seq]);
}
