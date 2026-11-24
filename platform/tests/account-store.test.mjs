import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAccountStore} from '../lib/account-store.mjs';
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
function fixture() {
 const data=new Map([['cpx.bookmarks','legacy work'],['sb-auth-token','secret'],['cp:gate:ok','legacy marker']]);
 const storage={get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const store=createAccountStore(storage,'test-project'); store.switchAccount(a);
 return {store,data,storage,ticket:store.ticket()};
}
const r={id:'sum',section:'office.excel',kind:'progress',value:{complete:true}};
test('account switch aborts old work including A → B → A; legacy data untouched',()=>{
 const {store,ticket,data}=fixture(); store.put(ticket,r); store.switchAccount(b);
 assert.equal(ticket.signal.aborted,true); assert.deepEqual(store.list(store.ticket()),[]);
 assert.throws(()=>store.put(ticket,r),/changed/); store.switchAccount(a);
 assert.throws(()=>store.put(ticket,r),/changed/); assert.deepEqual(store.list(store.ticket()),[r]);
 store.switchAccount(null); assert.throws(()=>store.ticket(),/No account/);
 assert.equal(data.get('cpx.bookmarks'),'legacy work'); assert.equal(data.get('sb-auth-token'),'secret');
});
test('backup includes only owned study records, no authentication or global keys',()=>{
 const {store,ticket}=fixture();store.put(ticket,r);const text=store.exportBackup(ticket);
 assert.ok(!text.includes('secret'));assert.ok(!text.includes('cp:gate'));assert.deepEqual(JSON.parse(text).records,[r]);
});
test('cross-account and cross-project imports fail without writes',()=>{
 const {store,ticket,data}=fixture();store.put(ticket,r);const backup=store.exportBackup(ticket);
 store.switchAccount(b); const before=data.size;assert.throws(()=>store.importBackup(store.ticket(),backup),/mismatch/);
 store.switchAccount(a);const changed=JSON.parse(backup);changed.project='elsewhere';assert.throws(()=>store.importBackup(store.ticket(),JSON.stringify(changed)),/mismatch/);assert.equal(data.size,before);
});
test('import validates all records before writing; cannot import authority or arbitrary storage keys',()=>{
 const {store,ticket,data}=fixture();const backup=JSON.parse(store.exportBackup(ticket));
 backup.records=[r,{...r,id:'other',kind:'role',value:{role:'administrator'}}];const before=data.size;
 assert.throws(()=>store.importBackup(ticket,JSON.stringify(backup)),/Invalid/);assert.equal(data.size,before);
 backup.records=[{...r,key:'sb-auth-token'}];assert.throws(()=>store.importBackup(ticket,JSON.stringify(backup)),/Invalid/);
});
test('backup restore is idempotent and never overwrites current work',()=>{
 const {store,ticket}=fixture();store.put(ticket,r);const backup=store.exportBackup(ticket);
 store.put(ticket,{...r,value:{complete:false}});assert.deepEqual(store.importBackup(ticket,backup),{added:0,retained:1});
 assert.equal(store.list(ticket)[0].value.complete,false);
});
test('quota interruption preserves prior work and supports retry',()=>{
 const {store,ticket,storage}=fixture();const backup=JSON.parse(store.exportBackup(ticket));backup.records=[r,{...r,id:'second'}];
 const write=storage.setItem;let calls=0;storage.setItem=(k,v)=>{if(++calls===2)throw Error('Quota');write(k,v);};
 assert.throws(()=>store.importBackup(ticket,JSON.stringify(backup)),/Quota/);storage.setItem=write;
 assert.deepEqual(store.importBackup(ticket,JSON.stringify(backup)),{added:1,retained:1});assert.equal(store.list(ticket).length,2);
});
