import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLearnerContext} from '../lib/learner-context.mjs';
const uid='10000000-0000-4000-8000-000000000001';
function fixture() {
 let event,account=null;
 const f={status:'active',user:uid,error:null,hold:null,unsubscribed:false};
 const client={auth:{onAuthStateChange(fn){event=fn;return {data:{subscription:{unsubscribe(){f.unsubscribed=true;}}}};},
 async getUser(){if(f.hold)await f.hold;return {data:{user:{id:f.user}},error:f.error};}},
 from(table){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:{user_id:uid,role:'learner',status:f.status,display_name:'Learner'}};},
 async order(){return {data:[{id:'office',kind:'hub'},{id:'office.excel',kind:'section'}]};}};}};
 const store={switchAccount(user){account=user;},ticket(){return {owner:account};}};
 f.context=createLearnerContext({enabled:true,client,store});f.event=()=>event();f.account=()=>account;return f;
}
test('adapter is disabled by default',()=>assert.throws(()=>createLearnerContext(),/not enabled/));
test('verified active context chooses Excel-only landing without tokens',async()=>{
 const f=fixture();const result=await f.context.refresh();assert.equal(result.landingSection,'office.excel');assert.equal(f.account(),uid);
 assert.equal(result.role,'learner');assert.equal('session' in result,false);f.context.dispose();assert.equal(f.account(),null);assert.equal(f.unsubscribed,true);
});
test('revoked account and verification failure never open account storage',async()=>{
 const f=fixture();f.status='revoked';await assert.rejects(()=>f.context.refresh(),/membership/);assert.equal(f.account(),null);
 f.status='active';f.error=Error('offline');await assert.rejects(()=>f.context.refresh(),/sign-in/);assert.equal(f.account(),null);
});
test('late identity response after auth event cannot re-open old account',async()=>{
 const f=fixture();let release;f.hold=new Promise(resolve=>release=resolve);const loading=f.context.refresh();f.event();release();
 await assert.rejects(()=>loading,/Account changed/);assert.equal(f.account(),null);
});
