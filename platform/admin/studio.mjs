import {accessPreview,descendants} from './api.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function mountAdminStudio(root,api,{preview=false}={}) {
 let data=null,draft=null,selected=null,busy=false,dirty=false,blocked=false,epoch=0,disposed=false;
 root.innerHTML=`<header class="masthead"><a class="brand" href="../index.html">C<span>COMMONPLACE</span></a><span class="mode"></span></header>
 <main><div class="heading"><div><p class="eyebrow">CENTRAL ADMINISTRATION</p><h1>Admin Studio</h1><p class="intro">Give each learner a focused place to study.</p></div><button id="reload" class="secondary">Reload access</button></div>
 <p id="notice" role="status" aria-live="polite"></p><div id="workspace"></div></main>`;
 root.querySelector('.mode').textContent=preview?'PREVIEW · NOTHING IS SAVED':'ADMINISTRATOR · ONLINE ONLY';
 const workspace=root.querySelector('#workspace'),notice=root.querySelector('#notice');
 const message=(text,error=false)=>{notice.textContent=text;notice.className=error?'notice error':'notice';};
 function invalidate(){epoch++;data=null;draft=null;dirty=false;blocked=true;busy=false;root.querySelector('#reload').disabled=false;workspace.replaceChildren();message('Account changed. Reload to verify administrator access.',true);}
 const unsubscribe=api.onInvalidate(invalidate);
 function lock(){for(const n of workspace.querySelectorAll('button,input,select,fieldset'))n.disabled=busy;root.querySelector('#reload').disabled=busy;const save=workspace.querySelector('#save');if(save)save.disabled=busy||blocked;}
 async function load(){
  const request=++epoch;busy=true;lock();workspace.replaceChildren();draft=null;dirty=false;
  message('Verifying administrator access…');
  try {const result=await api.load();if(disposed||request!==epoch)return;data=result;blocked=false;message(preview?'Preview uses sample records in memory. It does not contact Supabase.':'Administrator access verified. Changes take effect when you save.');render();return true;}
  catch(error){if(request===epoch){data=null;workspace.replaceChildren();message(error.message,true);}}
  finally{if(request===epoch){busy=false;lock();}}
 }
 function choose(member){
  if(dirty&&!window.confirm('Discard your unsaved changes?'))return;
  selected=member.user_id;draft=structuredClone(member);dirty=false;blocked=false;renderEditor();
  for(const row of workspace.querySelectorAll('[data-user]'))row.classList.toggle('selected',row.dataset.user===selected);
 }
 function render(){
  workspace.replaceChildren();const layout=el('div',undefined,'layout'),side=el('aside',undefined,'panel roster');
  const top=el('div',undefined,'panel-title');top.append(el('h2','People'),el('span',String(data.members.length),'count'));side.append(top);
  const search=el('input');search.type='search';search.placeholder='Search name or email';search.setAttribute('aria-label','Search people');side.append(search);
  const list=el('div',undefined,'people');side.append(list);
  function listPeople(){list.replaceChildren();const q=search.value.toLowerCase();for(const m of data.members.filter(m=>`${m.display_name} ${m.email}`.toLowerCase().includes(q))){
    const button=el('button',undefined,'person');button.type='button';button.dataset.user=m.user_id;button.classList.toggle('selected',selected===m.user_id);
    button.append(el('strong',m.display_name||'Unnamed learner'),el('span',m.email||'No login email'),el('small',m.role==='administrator'?'Designated administrator':m.status,m.status));button.onclick=()=>choose(m);list.append(button);
  }if(!list.childElementCount)list.append(el('p','No matching accounts.','muted'));}
  search.oninput=listPeople;listPeople();
  const form=el('form',undefined,'register');form.append(el('h3','Register a learner'),el('p','Use the email of an existing verified login. New learners start suspended with no section access.','muted'));
  const emailLabel=el('label','Login email'),email=el('input');email.type='email';email.required=true;email.maxLength=320;email.autocomplete='off';emailLabel.append(email);
  const nameLabel=el('label','Display name'),name=el('input');name.required=true;name.maxLength=120;nameLabel.append(name);
  const add=el('button','Register learner','secondary');add.type='submit';form.append(emailLabel,nameLabel,add);side.append(form);
  form.onsubmit=async event=>{event.preventDefault();if(busy)return;if(dirty&&!window.confirm('Discard unsaved changes before registering another learner?'))return;busy=true;lock();const request=epoch;
   try{const id=await api.register(email.value.trim(),name.value.trim());if(disposed||request!==epoch)return;selected=id;await load();const member=data?.members.find(m=>m.user_id===id);if(member)choose(member);}
   catch(error){if(request===epoch){message(error.message,true);if(error.code==='42501')invalidate();}}
   finally{if(request===epoch){busy=false;lock();}}
  };
  layout.append(side,el('section',undefined,'panel editor'));workspace.append(layout);
  const member=data.members.find(m=>m.user_id===selected);if(member){draft=structuredClone(member);renderEditor();}else workspace.querySelector('.editor').append(el('h2','Choose a learner'),el('p','Review their account status and choose the sections they can study.','muted'));
  lock();
 }
 function renderEditor(){
  const editor=workspace.querySelector('.editor');editor.replaceChildren();
  if(!draft)return;
  editor.append(el('p','ACCOUNT & ACCESS','eyebrow'),el('h2',draft.display_name||'Unnamed learner'),el('p',draft.email||'No login email','muted'));
  if(draft.role==='administrator'){editor.append(el('p','Designated administrator','badge'),el('p','This account manages Commonplace. Its role and access cannot be changed here.'));return;}
  const form=el('form');const fields=el('fieldset');fields.append(el('legend','Learner details'));
  const nameLabel=el('label','Display name'),name=el('input');name.value=draft.display_name;name.required=true;name.maxLength=120;nameLabel.append(name);
  const statusLabel=el('label','Account status'),status=el('select');for(const value of ['active','suspended','revoked']){const option=el('option',value[0].toUpperCase()+value.slice(1));option.value=value;status.append(option);}status.value=draft.status;statusLabel.append(status);
  fields.append(nameLabel,statusLabel);form.append(fields);
  const permissions=el('fieldset',undefined,'permissions');permissions.append(el('legend','Study access'),el('p','Select only the sections this learner should see. Selecting a subject includes its current study sections.','muted'));
  const previewBox=el('div',undefined,'access-preview');previewBox.setAttribute('aria-live','polite');
  function updatePreview(){previewBox.replaceChildren(el('p','LEARNER VIEW · UNSAVED PREVIEW','eyebrow'));const view=accessPreview(draft,data.sections);
   previewBox.append(el('h3',view.sections.length===1?'One focused study space':`${view.sections.length} available sections`));
   if(draft.status!=='active')previewBox.append(el('p',`Access is ${draft.status}. No study sections will be available.`));
   else if(!view.sections.length)previewBox.append(el('p','No study access. Choose at least one section to make learning available.'));
   else{const ul=el('ul');for(const s of view.sections)ul.append(el('li',s.title));previewBox.append(ul);if(view.landing)previewBox.append(el('p','Direct landing: '+view.sections[0].title,'landing'));}
  }
  function updateChecks(){for(const check of permissions.querySelectorAll('input')){const ids=check.dataset.parent?descendants(data.sections,check.dataset.parent).map(s=>s.id):[check.value];const count=ids.filter(id=>draft.allowed.includes(id)).length;check.checked=ids.length>0&&count===ids.length;check.indeterminate=count>0&&count<ids.length;}updatePreview();}
  function checkbox(labelText,ids,parent=null){const label=el('label',undefined,parent?'subject':'leaf'),check=el('input');check.type='checkbox';if(parent)check.dataset.parent=parent;else check.value=ids[0];
   check.onchange=()=>{const set=new Set(draft.allowed);for(const id of ids)check.checked?set.add(id):set.delete(id);draft.allowed=[...set].sort();dirty=true;updateChecks();};label.append(check,el('span',labelText));return label;}
  for(const hub of data.sections.filter(s=>!s.parent_id)){const leaves=descendants(data.sections,hub.id);if(!leaves.length)continue;const group=el('div',undefined,'subject-group');group.append(checkbox(hub.title,leaves.map(s=>s.id),hub.id));for(const leaf of leaves)group.append(checkbox(leaf.title,[leaf.id]));permissions.append(group);}
  form.append(permissions,previewBox);name.oninput=()=>{draft.display_name=name.value;dirty=true;};status.onchange=()=>{draft.status=status.value;dirty=true;updatePreview();};updateChecks();
  const actions=el('div',undefined,'actions'),save=el('button','Review & save access');save.id='save';save.type='submit';actions.append(save);form.append(actions);editor.append(form);
  form.onsubmit=async event=>{event.preventDefault();if(busy||blocked)return;
   const view=accessPreview(draft,data.sections);
   if(!window.confirm(`Save access for ${draft.display_name}?\nStatus: ${draft.status}\nAvailable study sections: ${view.sections.length}\n${draft.status==='active'?'Unselected sections will be hidden.':'Online study access will be blocked. Downloaded copies cannot be recalled.'}`))return;
   const submitted=structuredClone(draft),request=epoch;busy=true;lock();message('Saving access…');
   try{await api.save(submitted);if(disposed||request!==epoch)return;dirty=false;const loaded=await load();if(loaded)message('Access saved. The learner’s next online request uses these permissions.');}
   catch(error){if(request===epoch){message(error.message,true);blocked=true;if(error.code==='42501')invalidate();}}
   finally{if(request===epoch){busy=false;lock();}}
  };lock();
 }
 root.querySelector('#reload').onclick=()=>{if(!dirty||window.confirm('Discard unsaved changes and reload saved access?'))load();};
 const beforeUnload=event=>{if(dirty){event.preventDefault();event.returnValue='';}};
 const offline=()=>{invalidate();message('Admin Studio requires an internet connection. Reconnect, then reload.',true);};
 window.addEventListener('beforeunload',beforeUnload);window.addEventListener('offline',offline);
 load();
 return ()=>{disposed=true;epoch++;unsubscribe();api.dispose();window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('offline',offline);root.replaceChildren();};
}
