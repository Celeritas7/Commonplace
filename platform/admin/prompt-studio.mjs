import {MATERIAL_TYPES,PROMPT_TEMPLATES,subjectTemplate,generateTutorialPrompt} from '../prompts/generator.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function mountPromptStudio(root,api,member,sections,{onDirty=()=>{},onBusy=()=>{},onDenied=()=>{}}={}){
 let disposed=false,epoch=0,busy=false,generated=null,profileRevision=null;
 const notice=el('p','Verifying administrator access and loading the learning profile…','notice');notice.setAttribute('role','status');const body=el('div');root.append(notice,body);
 function fail(error){notice.textContent=error.message;notice.className='notice error';if(error.code==='42501')onDenied();}
 let review,copy,select,output;
 function lock(value){busy=value;onBusy(value);for(const n of body.querySelectorAll('input,select,textarea,button'))n.disabled=value;if(copy)copy.disabled=value||!generated||!review.checked;if(select)select.disabled=value||!generated;}
 function invalidateOutput(){generated=null;profileRevision=null;if(output)output.value='';if(review)review.checked=false;onDirty(true);lock(false);}
 async function start(){const request=++epoch;lock(true);
  try{const saved=await api.profile(member.user_id);if(disposed||request!==epoch)return;render(saved);notice.textContent='Generate here, review for personal details, then copy into your chosen AI tool. Nothing is sent automatically.';}
  catch(error){if(!disposed&&request===epoch)fail(error);}
  finally{if(!disposed&&request===epoch)lock(false);}
 }
 function render(saved){
  const allowed=sections.filter(s=>s.kind==='section'&&member.allowed.includes(s.id)).filter(s=>{try{subjectTemplate(s.id);return true;}catch{return false;}});
  if(!allowed.length){body.append(el('p','Assign a supported study section in Study access before creating a tutorial prompt.'));return;}
  body.append(el('h3','AI Tutorial Prompt Studio'),el('p','Learner: '+(member.display_name||'Selected learner')+'. The name and login email are excluded from the generated prompt.','muted'));
  const form=el('form',undefined,'prompt-form'),inputs={};
  function field(key,label,{options,rows=2,max=2000,value=''}={}){const wrap=el('label',label);let input;if(options){input=el('select');for(const item of options){const option=el('option',item.label);option.value=item.id;input.append(option);}}else{input=el('textarea');input.rows=rows;input.maxLength=max;}input.name=key;input.value=value||input.value;inputs[key]=input;input.oninput=invalidateOutput;input.onchange=invalidateOutput;wrap.append(input);form.append(wrap);return input;}
  field('sectionId','Study section',{options:allowed.map(s=>({id:s.id,label:s.title}))});
  field('templateId','Reusable teaching template',{options:PROMPT_TEMPLATES});
  field('topic','Topic').required=true;field('objective','Learning objective',{value:saved.profile.learning_objectives?.[0]||''}).required=true;
  field('difficulty','Difficulty',{options:['beginner','intermediate','advanced','mixed'].map(id=>({id,label:id})),value:saved.profile.difficulty||'beginner'});
  const countLabel=el('label','Number of exercises'),count=el('input');count.type='number';count.min='1';count.max='30';count.step='1';count.value='5';count.required=true;count.oninput=invalidateOutput;inputs.exerciseCount=count;countLabel.append(count);form.append(countLabel);
  field('materialType','Material type',{options:MATERIAL_TYPES.map(id=>({id,label:id}))});
  const scenarioChoice=el('label','Saved professional scenario'),scenarios=el('select');const custom=el('option','Custom scenario below');custom.value='';scenarios.append(custom);for(const [i,text] of (saved.profile.scenarios||[]).entries()){const option=el('option',text);option.value=String(i);scenarios.append(option);}scenarioChoice.append(scenarios);form.append(scenarioChoice);
  field('scenario','Professional scenario',{value:saved.profile.scenarios?.[0]||'',rows:3});scenarios.onchange=()=>{inputs.scenario.value=scenarios.value===''?'':saved.profile.scenarios[Number(scenarios.value)];invalidateOutput();};
  field('additional','Additional requirements',{rows:4,max:4000});
  const generate=el('button','Generate prompt');generate.type='submit';form.append(generate);body.append(form);
  const previewLabel=el('label','Generated prompt preview');output=el('textarea');output.readOnly=true;output.rows=22;output.className='prompt-output';previewLabel.append(output);body.append(previewLabel);
  const privacy=el('p','Review before sharing: automatic filtering is not complete anonymization. Remove names, phone numbers, employer/customer details and any remaining private information. Edit Additional requirements or the professional profile and regenerate if needed.','muted');body.append(privacy);
  const reviewed=el('label',undefined,'leaf');review=el('input');review.type='checkbox';review.onchange=()=>lock(false);reviewed.append(review,el('span','I reviewed the prompt and removed unnecessary personal details.'));body.append(reviewed);
  const actions=el('div',undefined,'profile-toolbar');copy=el('button','Copy prompt');select=el('button','Select prompt text','secondary');copy.type=select.type='button';actions.append(copy,select);body.append(actions);
  select.onclick=()=>{if(!generated)return;output.focus();output.select();notice.textContent='Prompt selected. Use your device’s Copy command after reviewing the text.';};
  form.onsubmit=async event=>{event.preventDefault();if(busy)return;invalidateOutput();const request=epoch;lock(true);
   try{const fresh=await api.profile(member.user_id);if(disposed||request!==epoch)return;
    const settings=Object.fromEntries(Object.entries(inputs).map(([k,n])=>[k,k==='exerciseCount'?Number(n.value):n.value]));
    generated=generateTutorialPrompt(settings,fresh.profile,{privateIdentifiers:[member.display_name,member.email,member.user_id]});profileRevision=fresh.revision;output.value=generated.text;review.checked=false;notice.className='notice';notice.textContent='Draft prompt generated. Review its content before copying; no AI request was made.';
   }catch(error){if(!disposed&&request===epoch)fail(error);}
   finally{if(!disposed&&request===epoch)lock(false);}
  };
  copy.onclick=async()=>{if(busy||!generated||!review.checked)return;const request=epoch,snapshot=generated.text;lock(true);
   try{const fresh=await api.profile(member.user_id);if(disposed||request!==epoch)return;if(fresh.revision!==profileRevision){invalidateOutput();throw Error('The learner profile changed. Generate and review a fresh prompt.');}
    if(!navigator.clipboard?.writeText)throw Error('Clipboard access is unavailable. Use Select prompt text and your device’s Copy command.');
    try{await navigator.clipboard.writeText(snapshot);}catch{throw Error('Clipboard access was blocked. Use Select prompt text and your device’s Copy command.');}
    if(disposed||request!==epoch)return;notice.className='notice';notice.textContent='Prompt copied. Paste it into your chosen AI tool. Generated material must remain a draft for review.';
   }catch(error){if(!disposed&&request===epoch)fail(error);}
   finally{if(!disposed&&request===epoch)lock(false);}
  };
 }
 start();return ()=>{disposed=true;epoch++;generated=null;profileRevision=null;onDirty(false);onBusy(false);root.replaceChildren();};
}
