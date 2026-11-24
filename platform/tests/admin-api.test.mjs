import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdminAPI,accessPreview,descendants} from '../admin/api.mjs';
const sections=[{id:'office',kind:'hub',parent_id:null},{id:'office.excel',kind:'section',parent_id:'office'},{id:'office.vba',kind:'section',parent_id:'office'},{id:'office.future',kind:'planned',parent_id:'office'}];
function fixture(){let event;const calls=[];const f={online:true,error:null,hold:null,identityHold:null,user:'verified-test-id'};const client={auth:{onAuthStateChange(fn){event=fn;return {data:{subscription:{unsubscribe(){}}}};},async getUser(){const id=f.user;if(f.identityHold)await f.identityHold;return {data:{user:{id}}};}},async rpc(name,args){calls.push({name,args});if(f.hold)await f.hold;return {data:{members:[],sections:[]},error:f.error};}};f.api=createAdminAPI({client,enabled:true,online:()=>f.online});f.event=(type='SIGNED_OUT',user=f.user)=>event(type,user?{user:{id:user}}:null);f.calls=calls;return f;}
test('admin API is opt-in and refuses offline operations',async()=>{assert.throws(()=>createAdminAPI(),/not enabled/);const f=fixture();f.online=false;await assert.rejects(()=>f.api.load(),/internet/);assert.equal(f.calls.length,0);});
test('saving sends expected revision and explicit leaves without a caller role',async()=>{const f=fixture();await f.api.save({user_id:'u',revision:'123',display_name:'Test',status:'revoked',allowed:['office.excel'],role:'administrator'});assert.deepEqual(f.calls[0],{name:'cp_admin_save',args:{target:'u',expected_revision:'123',learner_name:'Test',new_status:'revoked',allowed_sections:['office.excel']}});});
test('server denial and stale edits are actionable errors',async()=>{const f=fixture();f.error={code:'42501'};await assert.rejects(()=>f.api.load(),/Administrator/);f.error={code:'40001'};await assert.rejects(()=>f.api.save({}),/another tab/);});
test('account invalidation discards a late directory response',async()=>{const f=fixture();let done;f.hold=new Promise(r=>done=r);const pending=f.api.load();await Promise.resolve();f.event();done();await assert.rejects(()=>pending,/Account changed/);});
test('same-owner auth events preserve pending requests but never bypass server authorization',async()=>{
 const f=fixture();await f.api.load();let invalidations=0;f.api.onInvalidate(()=>invalidations++);
 let done;f.hold=new Promise(r=>done=r);const pending=f.api.load();await Promise.resolve();
 for(const type of ['TOKEN_REFRESHED','SIGNED_IN','USER_UPDATED','INITIAL_SESSION','MFA_CHALLENGE_VERIFIED'])f.event(type);
 done();await pending;assert.equal(invalidations,0);
 f.error={code:'42501'};await assert.rejects(()=>f.api.profile('learner'),/Administrator/);
});
test('real account switches and signout cancel old requests even when signout carries the old user',async()=>{
 for(const [type,user] of [['SIGNED_IN','another-user'],['TOKEN_REFRESHED','another-user'],['SIGNED_OUT','verified-test-id'],['TOKEN_REFRESHED',null]]){
  const f=fixture();await f.api.load();let invalidations=0;f.api.onInvalidate(()=>invalidations++);
  let done;f.hold=new Promise(r=>done=r);const pending=f.api.load();await Promise.resolve();f.event(type,user);done();
  await assert.rejects(()=>pending,/Account changed/);assert.equal(invalidations,1);
 }
});
test('initial session during identity verification does not force an extra reload',async()=>{
 const f=fixture();let done;f.identityHold=new Promise(r=>done=r);const pending=f.api.load();f.event('INITIAL_SESSION');done();
 await pending;assert.equal(f.calls.length,1);
});
test('a conflicting initial session or silently changed verified identity cannot call admin RPCs',async()=>{
 const f=fixture();let done;f.identityHold=new Promise(r=>done=r);const pending=f.api.load();f.event('INITIAL_SESSION','another-user');done();
 await assert.rejects(()=>pending,/Account changed/);assert.equal(f.calls.length,0);
 const g=fixture();await g.api.load();g.user='another-user';await assert.rejects(()=>g.api.load(),/Account changed/);assert.equal(g.calls.length,1);
 await g.api.load();assert.equal(g.calls.length,2);
});
test('effective preview denies inactive users and offers only allowed leaves',()=>{const m={status:'active',role:'learner',allowed:['office.excel']};assert.equal(accessPreview(m,sections).landing,'office.excel');assert.deepEqual(accessPreview({...m,status:'revoked'},sections),{sections:[],landing:null});assert.deepEqual(descendants(sections,'office').map(s=>s.id),['office.excel','office.vba']);});
