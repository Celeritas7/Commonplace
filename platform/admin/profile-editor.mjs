import {PROFILE_FIELDS,validateProfile,IMPORT_EXPORT_BEGINNER} from '../lib/learning-profile.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function mountProfileEditor(root,api,target,{onDirty=()=>{},onBusy=()=>{},onDenied=()=>{}}={}){
 let disposed=false,epoch=0,busy=false,dirty=false,groupDirty=false,blocked=false,snapshot=null;
 const status=el('p','Loading professional profile…','notice');status.setAttribute('role','status');
 const content=el('div');root.append(status,content);
 const mark=()=>{dirty=true;onDirty(true);};
 function lock(value){busy=value;onBusy(value);for(const n of content.querySelectorAll('input,textarea,select,button'))n.disabled=value;const save=content.querySelector('[data-save-profile]');if(save)save.disabled=value||blocked;}
 function fail(error){status.textContent=error.message;status.className='notice error';if(error.code==='42501')onDenied();}
 async function load(){const request=++epoch;lock(true);content.replaceChildren();status.textContent='Loading professional profile…';
  try{const data=await api.profile(target);if(disposed||request!==epoch)return;snapshot=data;dirty=false;groupDirty=false;onDirty(false);blocked=false;render();status.textContent='Profiles personalize learning examples. They do not change study access.';status.className='notice';return true;}
  catch(error){if(!disposed&&request===epoch)fail(error);}
  finally{if(!disposed&&request===epoch)lock(false);}
 }
 function render(){content.replaceChildren();
  const toolbar=el('div',undefined,'profile-toolbar'),template=el('button','Use import-export beginner template','secondary');template.type='button';
  const reload=el('button','Reload profile','secondary');reload.type='button';reload.onclick=()=>{if(!dirty||window.confirm('Discard unsaved profile edits and reload?'))load();};toolbar.append(template,reload);content.append(toolbar);
  const hint=el('p','One item per line for lists (up to 20 items, 300 characters each). Other fields allow 2,000 characters. Keep personal identifiers and credentials out of learning context.','muted');content.append(hint);
  const form=el('form',undefined,'profile-form'),controls=new Map();
  for(const field of PROFILE_FIELDS){const label=el('label',field.label);let input;
   if(field.key==='difficulty'){input=el('select');for(const value of ['','beginner','intermediate','advanced','mixed']){const option=el('option',value||'Not specified');option.value=value;input.append(option);}}
   else{input=el('textarea');input.rows=field.list?4:2;input.maxLength=field.list?6020:4000;}
   input.name=field.key;input.value=field.list?(snapshot.profile[field.key]||[]).join('\n'):snapshot.profile[field.key]||'';input.oninput=mark;input.onchange=mark;controls.set(field.key,input);label.append(input);form.append(label);
  }
  template.onclick=()=>{if(!window.confirm('Replace the profile fields with the import-export beginner template? This will not change access or groups.'))return;const copy=structuredClone(IMPORT_EXPORT_BEGINNER);for(const field of PROFILE_FIELDS)controls.get(field.key).value=field.list?copy[field.key].join('\n'):copy[field.key];mark();};
  const groups=el('fieldset',undefined,'profile-groups');groups.append(el('legend','Professional profile groups'),el('p','Groups organize learners for future assignments. Membership grants no study access.','muted'));
  for(const group of snapshot.groups){const label=el('label',undefined,'leaf'),check=el('input');check.type='checkbox';check.value=group.id;check.checked=snapshot.group_ids.includes(group.id);check.onchange=mark;label.append(check,el('span',group.name));groups.append(label);}
  if(!snapshot.groups.length)groups.append(el('p','No profile groups yet. Create one below.','muted'));
  form.append(groups);const save=el('button','Save professional profile');save.type='submit';save.dataset.saveProfile='';form.append(save);content.append(form);
  form.onsubmit=async event=>{event.preventDefault();if(busy||blocked)return;if(groupDirty&&!window.confirm('Save the profile and discard unsaved group-name or description edits?'))return;let profile;
   try{profile=validateProfile(Object.fromEntries(PROFILE_FIELDS.map(field=>[field.key,field.list?controls.get(field.key).value.split('\n').map(x=>x.trim()).filter(Boolean):controls.get(field.key).value])));}catch(error){fail(error);return;}
   const ids=[...groups.querySelectorAll('input:checked')].map(n=>n.value);const request=epoch;lock(true);
   try{await api.saveProfile(target,snapshot.revision,profile,ids);if(disposed||request!==epoch)return;snapshot.profile=profile;dirty=false;onDirty(false);const loaded=await load();if(loaded&&!disposed)status.textContent='Professional profile saved. Study permissions are unchanged.';}
   catch(error){if(!disposed&&request===epoch){blocked=true;fail(error);}}
   finally{if(!disposed&&request===epoch)lock(false);}
  };
  const groupForm=el('form',undefined,'group-editor');groupForm.append(el('h3','Manage profile groups'));
  const chooseLabel=el('label','Group to edit'),choose=el('select');const fresh=el('option','Create a new group');fresh.value='';choose.append(fresh);for(const g of snapshot.groups){const option=el('option',g.name);option.value=g.id;choose.append(option);}chooseLabel.append(choose);
  const nameLabel=el('label','Group name'),name=el('input');name.required=true;name.maxLength=100;nameLabel.append(name);
  const descriptionLabel=el('label','Group description'),description=el('textarea');description.maxLength=500;description.rows=2;descriptionLabel.append(description);
  choose.onchange=()=>{if(groupDirty&&!window.confirm('Discard unsaved group details?')){choose.value=choose.dataset.previous||'';return;}choose.dataset.previous=choose.value;groupDirty=false;const g=snapshot.groups.find(g=>g.id===choose.value);name.value=g?.name||'';description.value=g?.description||'';};
  name.oninput=()=>{groupDirty=true;mark();};description.oninput=name.oninput;
  const groupSave=el('button','Save group','secondary');groupSave.type='submit';groupForm.append(chooseLabel,nameLabel,descriptionLabel,groupSave);content.append(groupForm);
  groupForm.onsubmit=async event=>{event.preventDefault();if(busy)return;
   if(dirty&&!window.confirm('Save this group and reload the profile? Other unsaved profile edits will be discarded.'))return;
   const g=snapshot.groups.find(g=>g.id===choose.value);const request=epoch;lock(true);
   try{await api.saveGroup({id:g?.id,revision:g?.revision,name:name.value.trim(),description:description.value});if(disposed||request!==epoch)return;dirty=false;onDirty(false);await load();}
   catch(error){if(!disposed&&request===epoch)fail(error);}
   finally{if(!disposed&&request===epoch)lock(false);}
  };
 }
 load();return ()=>{disposed=true;epoch++;onDirty(false);onBusy(false);root.replaceChildren();};
}
