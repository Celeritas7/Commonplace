import {readFile} from 'node:fs/promises';
import {protocolFixture,readCandidate,access,users} from './roadmap-hub-protocol-support.mjs';
export {readCandidate,access,users};
export const id=n=>'23000000-0000-4000-8000-'+String(n).padStart(12,'0');
export const documentTarget={kind:'document',doc:'task_tags',path:'rm',key:'board/item/日本語'};
export const placeTarget={kind:'place',id:'synthetic-cafe'};
export const placeChange={op:'create',label:'静かな Cafe',class:'cafe',aliases:[],ord:100};
export async function writerFixture(install=true){
 const db=await protocolFixture();try{
  await db.exec(await readFile(new URL('./roadmap-shared-writer-fixture.sql',import.meta.url),'utf8'));
  if(install)await db.exec(await readCandidate('23_roadmap_shared_writers.sql'));
  return db;
 }catch(e){await db.close();throw e}
}
export async function enableWriters(db,owner=users.a){await db.exec('reset role');await db.query(`insert into ga_private.roadmap_shared_access(auth_user_id,kind,doc,path,enabled,review_ref) values
 ($1,'document','task_tags','rm',true,'Synthetic review'),($1,'document','roadmap_now','suggestion',true,'Synthetic review'),($1,'place','','',true,'Synthetic review')`,[owner]);}
export function writerApi(db,owner=users.a){const {as}=access(db);return {
 read:target=>as(owner,'select ga_roadmap_shared_read($1) r',[target]).then(r=>r.rows[0].r),
 write:(target,revision,change,request=id(1))=>as(owner,'select ga_roadmap_shared_write($1,$2,$3,$4) r',[target,revision,change,request]).then(r=>r.rows[0].r)
};}
