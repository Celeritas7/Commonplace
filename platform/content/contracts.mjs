// Version 1 data-only contracts. Shared by browser previews and future server
// ingestion; validation does not confer publication, assignment or authorization.
const ID=/^[a-z][a-z0-9.-]{0,99}$/;
const fail=message=>{throw Error(message);};
function object(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)fail('Expected plain object');const actual=Object.keys(v).sort();if(actual.join('|')!==[...keys].sort().join('|'))fail('Missing or unsupported fields');}
function text(v,max=2000){if(typeof v!=='string'||!v.trim()||[...v].length>max)fail('Invalid text');}
function id(v){if(typeof v!=='string'||!ID.test(v))fail('Invalid stable ID');}
function version(v){if(!Number.isSafeInteger(v)||v<1)fail('Invalid version');}
function list(v,max){if(!Array.isArray(v)||v.length<1||v.length>max)fail('Invalid list length');}
function unique(values){if(new Set(values).size!==values.length)fail('Duplicate IDs');}
function ref(v){object(v,['id','version']);id(v.id);version(v.version);}
const fields={concept:['section_id','title','explanation','objectives'],scenario:['title','context','instructions'],dataset:['title','columns','rows'],lesson:['section_id','title','concept_ref','scenario_ref','dataset_ref','required_capabilities','activities'],assignment:['section_id','lesson_ref','status']};
export function validateRecord(record){
 // Reject non-JSON values before cloning; JSON roundtrips must not hide Infinity,
 // undefined fields, sparse arrays, functions or prototype-bearing input.
 let nodes=0;const seen=new Set();
 function json(v,depth=0){if(++nodes>20000||depth>12)fail('Content too complex');if(v===null||typeof v==='string'||typeof v==='boolean')return;if(typeof v==='number'){if(!Number.isFinite(v))fail('Non-finite number');return;}if(typeof v!=='object')fail('Non-JSON value');if(seen.has(v))fail('Cyclic content');seen.add(v);if(Array.isArray(v)){if(Object.keys(v).length!==v.length)fail('Sparse or extended array');for(const x of v)json(x,depth+1);}else{if(Object.getPrototypeOf(v)!==Object.prototype)fail('Expected plain object');for(const x of Object.values(v))json(x,depth+1);}seen.delete(v);}
 json(record);if(new TextEncoder().encode(JSON.stringify(record)).length>262144)fail('Content too large');
 if(!record||!Object.hasOwn(fields,record.kind))fail('Unsupported record kind');object(record,['schema_version','kind','id','version',...fields[record.kind]]);
 if(record.schema_version!==1)fail('Unsupported schema version');id(record.id);version(record.version);if(record.section_id!==undefined)id(record.section_id);if(record.title!==undefined)text(record.title,160);
 switch(record.kind){
 case 'concept':text(record.explanation,8000);list(record.objectives,20);record.objectives.forEach(v=>text(v,500));break;
 case 'scenario':text(record.context,4000);text(record.instructions,4000);break;
 case 'dataset':{
  list(record.columns,16);record.columns.forEach(c=>{object(c,['key','label','type','unit']);id(c.key);text(c.label,80);if(!['text','number'].includes(c.type))fail('Unsupported column type');if(typeof c.unit!=='string'||[...c.unit].length>40)fail('Invalid unit');});unique(record.columns.map(c=>c.key));list(record.rows,200);
  for(const row of record.rows){if(!Array.isArray(row)||row.length!==record.columns.length)fail('Dataset row width mismatch');row.forEach((v,i)=>{if(record.columns[i].type==='number'){if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e12)fail('Invalid numeric cell');}else text(v,300);});}break;
 }
 case 'lesson':
  for(const key of ['concept_ref','scenario_ref','dataset_ref'])ref(record[key]);list(record.required_capabilities,20);record.required_capabilities.forEach(id);unique(record.required_capabilities);
  list(record.activities,50);record.activities.forEach(a=>{if(a?.type==='explanation'){object(a,['id','type','instruction']);}else if(a?.type==='sum-column'){object(a,['id','type','instruction','column_key']);id(a.column_key);}else fail('Unsupported activity');id(a.id);text(a.instruction,2000);});unique(record.activities.map(a=>a.id));break;
 case 'assignment':ref(record.lesson_ref);if(!['assigned','revoked'].includes(record.status))fail('Invalid assignment status');break;
 }
 return structuredClone(record);
}
function matches(record,reference){return record.id===reference.id&&record.version===reference.version;}
export function validateBundle(input){
 object(input,['concept','scenario','dataset','lesson']);const bundle=Object.fromEntries(Object.entries(input).map(([k,v])=>{const r=validateRecord(v);if(r.kind!==k)fail('Record kind mismatch');return [k,r];}));
 const {lesson,concept,scenario,dataset}=bundle;
 if(concept.section_id!==lesson.section_id||!matches(concept,lesson.concept_ref)||!matches(scenario,lesson.scenario_ref)||!matches(dataset,lesson.dataset_ref))fail('Content reference mismatch');
 for(const activity of lesson.activities)if(activity.type==='sum-column'&&!dataset.columns.some(c=>c.key===activity.column_key&&c.type==='number'))fail('SUM needs an existing numeric column');
 return bundle;
}
export function composeLesson(input,capabilities){
 const bundle=validateBundle(input);if(!Array.isArray(capabilities)||bundle.lesson.required_capabilities.some(c=>!capabilities.includes(c)))fail('Unsupported lesson capability');
 function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 return freeze(bundle);
}
export function progressIdentity(assignment,bundle,activityId){
 const a=validateRecord(assignment),b=validateBundle(bundle);
 if(a.kind!=='assignment'||a.section_id!==b.lesson.section_id||!matches(b.lesson,a.lesson_ref)||!b.lesson.activities.some(x=>x.id===activityId))fail('Progress reference mismatch');
 return JSON.stringify(['cp-content-v1',a.section_id,a.id,a.version,b.lesson.id,b.lesson.version,b.concept.id,b.concept.version,b.scenario.id,b.scenario.version,b.dataset.id,b.dataset.version,activityId]);
}
export function safeCSV(dataset){
 const d=validateRecord(dataset);if(d.kind!=='dataset')fail('Dataset required');
 function cell(value){let s=String(value);if(typeof value==='string'&&/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
 return [d.columns.map(c=>c.label),...d.rows].map(row=>row.map(cell).join(',')).join('\r\n');
}

export function parseBundleJSON(source){
 if(typeof source!=='string'||new TextEncoder().encode(source).length>1048576)fail('Bundle JSON too large');
 return validateBundle(JSON.parse(source));
}
