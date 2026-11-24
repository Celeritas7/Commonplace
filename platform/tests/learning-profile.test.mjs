import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProfile,promptProfile,IMPORT_EXPORT_BEGINNER} from '../lib/learning-profile.mjs';
import {readLearnerProfile} from '../lib/learner-profile.mjs';
test('professional template is reusable and has no identity, role or permission',()=>{
 const copy=validateProfile(IMPORT_EXPORT_BEGINNER);assert.equal(copy.difficulty,'beginner');assert.deepEqual(copy.currencies_units,['JPY','PHP']);
 assert.ok(!['email','user_id','role','allowed','display_name'].some(k=>k in copy));copy.learning_objectives.push('Custom');assert.equal(IMPORT_EXPORT_BEGINNER.learning_objectives.length,9);
});
test('profile validator rejects privilege fields, nested payloads and excessive size',()=>{
 for(const value of [{role:'administrator'},{user_id:'x'},{scenarios:[{html:'<script>'}]},{difficulty:'expert'},{occupation:'x'.repeat(2001)},{scenarios:Array(21).fill('x')},null,[]])assert.throws(()=>validateProfile(value));
 assert.deepEqual(validateProfile({background:'<script>plain untrusted text</script>'}),{background:'<script>plain untrusted text</script>'});
});
test('prompt-facing profile strips direct identifiers/links/keys and never includes an identity envelope',()=>{
 const result=promptProfile({background:'Contact person@example.invalid 10000000-0000-4000-8000-000000000001',scenarios:['See https://example.invalid/private?token=secret','sb_secret_abcdef eyJabc.def.ghi']});
 const text=JSON.stringify(result);for(const secret of ['person@example.invalid','10000000','https://','sb_secret_abcdef','eyJabc'])assert.ok(!text.includes(secret));
 assert.throws(()=>promptProfile({display_name:'Private name'}));
});
test('unicode field lengths match PostgreSQL character limits',()=>{
 assert.equal(validateProfile({background:'あ'.repeat(2000)}).background.length,2000);
 assert.equal([...validateProfile({occupation:'😀'.repeat(2000)}).occupation].length,2000);
 assert.throws(()=>validateProfile({background:'😀'.repeat(2001)}));
});
test('shared learner adapter returns only profile data and aborts stale-account responses',async()=>{
 const controller=new AbortController();let complete;const pending=new Promise(r=>complete=r);
 const client={from(){return {select(){return this;},eq(){return this;},abortSignal(){return this;},maybeSingle(){return pending;}};}};
 const context={userId:'a',ticket:{owner:'a',signal:controller.signal}};
 const read=readLearnerProfile(client,context);controller.abort();complete({data:{profile:{background:'Private'}}});await assert.rejects(()=>read,/Account changed/);
 const next=new AbortController();const fresh={from(){return {select(){return this;},eq(key,id){assert.equal(id,'b');return this;},abortSignal(){return this;},async maybeSingle(){return {data:{profile:{background:'B profile'}}};}};}};assert.deepEqual(await readLearnerProfile(fresh,{userId:'b',ticket:{owner:'b',signal:next.signal}}),{version:1,profile:{background:'B profile'}});
});
