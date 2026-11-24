import {test} from 'node:test';import assert from 'node:assert/strict';
import {generateTutorialPrompt,MATERIAL_TYPES,PROMPT_TEMPLATES,subjectTemplate,sanitizePromptText} from '../prompts/generator.mjs';
import {IMPORT_EXPORT_BEGINNER} from '../lib/learning-profile.mjs';
const settings=()=>({sectionId:'office.excel',templateId:'teach-practise',topic:'SUM',objective:'Total shipment quantities',difficulty:'beginner',exerciseCount:5,materialType:'Guided exercises',scenario:'Inventory shipped to Manila',additional:''});
test('generated prompt uses profile and settings while retaining a draft-only external workflow',()=>{
 const {text}=generateTutorialPrompt(settings(),IMPORT_EXPORT_BEGINNER);for(const value of ['Japan','Philippines','JPY','PHP','Sales and brokerage','Number of exercises: 5','DRAFT','SUM(B2:B4)','Do not publish'])assert.ok(text.includes(value));assert.ok(!text.includes('undefined'));
});
test('every material type and reusable template has an output contract',()=>{
 for(const materialType of MATERIAL_TYPES)for(const template of PROMPT_TEMPLATES){const result=generateTutorialPrompt({...settings(),materialType,templateId:template.id},{});assert.ok(result.text.includes('OUTPUT REQUIREMENTS'));assert.ok(result.text.includes(materialType));}
 assert.ok(generateTutorialPrompt({...settings(),materialType:'Downloadable tutorial files'},{}).text.includes('do not invent a download link'));
 assert.ok(generateTutorialPrompt({...settings(),materialType:'Answer sheets'},{}).text.includes('unseen tasks'));
});
test('all active U0 study section families have specific guidance',()=>{
 for(const id of ['office.excel','office.vba','coding.python','coding.sql','coding.cpp','coding.bat','coding.web','coding.ai','mechanical.gdt','mechanical.hoses','maths.statistics','languages.japanese'])assert.ok(subjectTemplate(id).guidance.length>30);
 assert.throws(()=>subjectTemplate('unrecognized.section'));assert.throws(()=>subjectTemplate('office'));
 assert.ok(generateTutorialPrompt({...settings(),sectionId:'coding.sql'},{}).text.includes('SQL dialect'));
});
test('identities and recognizable credentials are filtered from every free-text input and profile',()=>{
 const privateText='Alice Example alice@example.invalid 10000000-0000-4000-8000-000000000001 sb_secret_abcdef sk-abcdefghijk eyJabc.def.ghi https://example.invalid/private';
 const s={...settings(),topic:privateText,objective:privateText,scenario:privateText,additional:privateText};
 const {text}=generateTutorialPrompt(s,{background:privateText,scenarios:[privateText]},{privateIdentifiers:['Alice Example']});
 for(const secret of ['Alice Example','alice@example.invalid','10000000-0000','sb_secret_abcdef','sk-abcdefghijk','eyJabc.def.ghi','https://'])assert.ok(!text.includes(secret),secret);
 assert.throws(()=>generateTutorialPrompt(settings(),{email:'private@example.invalid'}));
});
test('known identity removal treats regex symbols literally and does not redact unrelated word substrings',()=>{
 assert.equal(sanitizePromptText('Ann sells annually. A+B stays private.',['Ann','A+B']),'[identity removed] sells annually. [identity removed] stays private.');
});
test('invalid settings cannot generate partially accepted prompts',()=>{
 for(const patch of [{exerciseCount:0},{exerciseCount:31},{exerciseCount:2.5},{difficulty:'expert'},{templateId:'x'},{materialType:'script'},{topic:''},{additional:'x'.repeat(4001)},{role:'administrator'}])assert.throws(()=>generateTutorialPrompt({...settings(),...patch},{}));
});
