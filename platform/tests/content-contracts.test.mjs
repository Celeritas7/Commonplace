import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateRecord,validateBundle,composeLesson,progressIdentity,safeCSV,parseBundleJSON} from '../content/contracts.mjs';
import {exampleBundle} from '../content/examples.mjs';
import {EXCEL_PHASE_A_CAPABILITIES,prepareExcelExercise} from '../content/excel-contract.mjs';
import {createAssignedContentAdapter} from '../content/assigned-content.mjs';
import {longLesson} from './fixtures/long-lesson.mjs';
const assignment=b=>({schema_version:1,kind:'assignment',id:'assignment.sample',version:1,section_id:'office.excel',lesson_ref:{id:b.lesson.id,version:1},status:'assigned'});
test('one immutable SUM concept supports three professional scenarios and datasets',()=>{
 const samples=['trade','mechanical','finance'].map(exampleBundle);assert.deepEqual(samples[0].concept,samples[1].concept);assert.deepEqual(samples[1].concept,samples[2].concept);
 assert.deepEqual(samples.map(b=>prepareExcelExercise(b).worksheet.rows.reduce((sum,row)=>sum+row[1],0)),[25,42,100000]);
 const snapshot=composeLesson(samples[0],EXCEL_PHASE_A_CAPABILITIES);samples[0].dataset.rows[0][1]=999;assert.equal(snapshot.dataset.rows[0][1],12);assert.throws(()=>snapshot.dataset.rows.push(['x',1]));
});
test('references pin versions, dataset shape and section ownership',()=>{
 for(const alter of [b=>b.scenario.version++,b=>b.concept.section_id='coding.python',b=>b.dataset.rows[0].pop(),b=>b.dataset.columns[1].type='text',b=>b.lesson.activities[0].column_key='missing']){const b=exampleBundle('trade');alter(b);assert.throws(()=>validateBundle(b));}
});
test('strict schema rejects unknown code/URLs, future versions, duplicate IDs and non-JSON payloads',()=>{
 for(const alter of [b=>b.lesson.script='alert(1)',b=>b.lesson.url='https://example.invalid',b=>b.lesson.schema_version=2,b=>b.lesson.activities.push({...b.lesson.activities[0]}),b=>b.dataset.rows[0][1]=Infinity,b=>b.dataset.rows[0][1]=()=>1,b=>b.lesson.required_capabilities=Array(21).fill('x'),b=>b.scenario.context='x'.repeat(4001)]){const b=exampleBundle('trade');alter(b);assert.throws(()=>validateBundle(b));}
 const cyclic=exampleBundle('trade').concept;cyclic.objectives.push(cyclic);assert.throws(()=>validateRecord(cyclic));
});
test('Phase A accepts only the real fixed SUM shape and rejects unmerged Ribbon operations',()=>{
 for(const alter of [b=>b.lesson.required_capabilities.push('excel.autosum.button.v1'),b=>b.dataset.rows.push(['Extra',4]),b=>b.lesson.required_capabilities=['explanation.text.v1']]){const b=exampleBundle('trade');alter(b);assert.throws(()=>prepareExcelExercise(b));}
 assert.equal(prepareExcelExercise(exampleBundle('trade')).worksheet.formula,'=SUM(B2:B4)');
});
test('contracts also carry non-Excel explanatory lessons without Excel-specific fields',()=>{
 const b=exampleBundle('trade');b.concept.section_id=b.lesson.section_id='coding.python';b.concept.id=b.lesson.concept_ref.id='python.lists';b.lesson.required_capabilities=['explanation.text.v1'];b.lesson.activities=[{id:'read',type:'explanation',instruction:'Represent each inventory row as a Python list.'}];assert.equal(composeLesson(b,['explanation.text.v1']).lesson.section_id,'coding.python');assert.throws(()=>prepareExcelExercise(b));
});
test('progress identity distinguishes versions, scenarios and assignments while preserving short keys',async()=>{
 const a=exampleBundle('trade'),b=exampleBundle('mechanical');const first=await progressIdentity(assignment(a),a,'sum');assert.notEqual(first,await progressIdentity(assignment(b),b,'sum'));
 assert.equal(first,'["cp-content-v1","office.excel","assignment.sample",1,"excel.sum.trade",1,"excel.sum",1,"scenario.trade",1,"dataset.trade",1,"sum"]');
 const next=assignment(a);next.version=2;assert.notEqual(first,await progressIdentity(next,a,'sum'));await assert.rejects(()=>progressIdentity(next,a,'missing'));
});
test('progress keys respect the exact storage boundary and maximum-length valid content',async()=>{
 const bundle=exampleBundle('trade'),a=assignment(bundle);a.id='a'.repeat(46);
 const boundary=await progressIdentity(a,bundle,'sum');assert.equal(boundary.length,160);assert.ok(boundary.startsWith('['));
 a.id+='a';assert.match(await progressIdentity(a,bundle,'sum'),/^cp-content-v1:sha256:[0-9a-f]{64}$/);
 const fixture=longLesson(),key=await progressIdentity(fixture.assignment,fixture.bundle,fixture.activityId);
 assert.equal(key.length,85);assert.equal(key,await progressIdentity(fixture.assignment,fixture.bundle,fixture.activityId));
 for(const kind of ['assignment','lesson','concept','scenario','dataset','activity']){
  const f=longLesson();
  if(kind==='assignment')f.assignment.version--;
  else if(kind==='activity'){f.activityId='b'.repeat(100);f.bundle.lesson.activities[0].id=f.activityId;}
  else{f.bundle[kind].version--;if(kind==='lesson')f.assignment.lesson_ref.version--;else f.bundle.lesson[kind+'_ref'].version--;}
  assert.notEqual(key,await progressIdentity(f.assignment,f.bundle,f.activityId),kind);
 }
});
test('CSV export quotes cells and neutralizes leading spreadsheet formulas in text cells',()=>{
 const b=exampleBundle('trade');b.dataset.rows[0][0]='\t=HYPERLINK("bad")';b.dataset.rows[1][0]='@SUM(A1:A2)';const csv=safeCSV(b.dataset);assert.ok(csv.includes('"\'\t=HYPERLINK(""bad"")"'));assert.ok(csv.includes('"\'@SUM(A1:A2)"'));assert.ok(csv.includes('"12"'));
});
function fixture(change=()=>{}){const bundle=exampleBundle('trade'),controller=new AbortController(),envelope={owner_id:'a',publication_state:'published',assignment:assignment(bundle),bundle};change(envelope);const context={userId:'a',ticket:{owner:'a',signal:controller.signal},sections:[{id:'office.excel',kind:'section'}]};return {envelope,context,controller};}
test('assigned adapter refuses draft, revoked, wrong-owner and wrong-version responses',async()=>{
 for(const change of [e=>e.publication_state='draft',e=>e.assignment.status='revoked',e=>e.owner_id='b',e=>e.assignment.lesson_ref.version=2,e=>e.assignment.id='other']){const f=fixture(change);const load=createAssignedContentAdapter({sectionId:'office.excel',capabilities:EXCEL_PHASE_A_CAPABILITIES,loadAuthorizedBundle:async()=>f.envelope});await assert.rejects(()=>load(f.context,'assignment.sample'));}
});
test('assigned adapter accepts a matching authorized response and stops account-switch races',async()=>{
 const f=fixture();let received;const load=createAssignedContentAdapter({sectionId:'office.excel',capabilities:EXCEL_PHASE_A_CAPABILITIES,loadAuthorizedBundle:async request=>{received=request;return f.envelope;}});assert.equal((await load(f.context,'assignment.sample')).bundle.scenario.id,'scenario.trade');assert.deepEqual(Object.keys(received).sort(),['assignmentId','signal']);
 let resolve;const delayed=createAssignedContentAdapter({sectionId:'office.excel',capabilities:EXCEL_PHASE_A_CAPABILITIES,loadAuthorizedBundle:()=>new Promise(r=>resolve=r)});const pending=delayed(f.context,'assignment.sample');f.controller.abort();resolve(f.envelope);await assert.rejects(()=>pending,/Account changed/);
});
test('unavailable sections do not call the provider; no default loader can bypass authorization',async()=>{
 assert.throws(()=>createAssignedContentAdapter({sectionId:'office.excel',capabilities:[]}));const f=fixture();f.context.sections=[];let called=false;const load=createAssignedContentAdapter({sectionId:'office.excel',capabilities:[],loadAuthorizedBundle:async()=>{called=true;}});await assert.rejects(()=>load(f.context,'assignment.sample'));assert.equal(called,false);
});

test('bounded JSON parsing rejects oversized input, invalid JSON and unsafe object keys',()=>{
 assert.deepEqual(parseBundleJSON(JSON.stringify(exampleBundle('trade'))),exampleBundle('trade'));
 assert.throws(()=>parseBundleJSON(' '.repeat(1048577)));assert.throws(()=>parseBundleJSON('{bad'));
 const raw=JSON.stringify(exampleBundle('trade')).replace('"context":','"__proto__":{"role":"administrator"},"context":');assert.throws(()=>parseBundleJSON(raw));assert.equal({}.role,undefined);
});
