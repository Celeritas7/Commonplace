import {observeAuthOwner} from '../lib/auth-owner.mjs';
export function createAdminAPI({client, enabled=false, online=()=>navigator.onLine}={}) {
  if(!enabled) throw Error('Admin Studio is not enabled');
  let generation=0, stopped=false;
  const listeners=new Set();
  const authOwner=observeAuthOwner(client,()=>{generation++; for(const fn of listeners)fn();});
  async function operation(work) {
    if(stopped || !online()) throw Error('Connect to the internet to use Admin Studio.');
    const start=generation;
    const user=await client.auth.getUser();
    if(start!==generation || stopped) throw Error('Account changed. Reload Admin Studio.');
    if(user.error || !user.data?.user?.id) throw Error('Sign in with the administrator account.');
    authOwner.verified(user.data.user.id);
    const result=await work();
    if(start!==generation || stopped) throw Error('Account changed. Reload Admin Studio.');
    return result;
  }
  async function call(name,args={}) {
    const result=await operation(()=>client.rpc(name,args));
    if(result.error) {
      const messages={'40001':'This record changed in another tab. Reload before saving.','42501':'Administrator access is required.','23505':name==='cp_admin_save_profile_group'?'A group with this name already exists.':'This account is already registered. Select it in the learner list.','22023':name.includes('material')?'Check the material schema, saved state and selected recipients.':name.includes('profile')?'Check the profile fields, learner and selected groups.':'Check the verified login email and selected study sections.'};
      const error=Error(messages[result.error.code] || 'The request failed. Reload to confirm the current saved state before retrying.');
      error.code=result.error.code; throw error;
    }
    return result.data;
  }
  return {
    materials:()=>call('cp_admin_material_library'),
    material:id=>call('cp_admin_material_detail',{target:id}),
    saveMaterial:(id,revision,draft)=>call('cp_admin_material_save',{target:id,expected_revision:revision,draft}),
    copyMaterial:(id,revision)=>call('cp_admin_material_copy',{target:id,expected_revision:revision}),
    transitionMaterial:(id,revision,state,reviewed)=>call('cp_admin_material_transition',{target:id,expected_revision:revision,next_state:state,reviewed}),
    assignMaterial:(id,revision,audience)=>call('cp_admin_material_assign',{target:id,expected_revision:revision,audience}),
    async uploadMaterial(id,revision,file){const r=await operation(()=>client.functions.invoke('material-files',{body:file,headers:{'x-cp-action':'upload','x-cp-version':id,'x-cp-revision':revision,'x-cp-filename':file.name}}));if(r.error||!r.data?.saved)throw Error('Upload failed. Reload the saved draft before retrying; inspect the file format and size.');},
    async downloadMaterial(id){const r=await operation(()=>client.functions.invoke('material-files',{body:{},headers:{'x-cp-action':'download','x-cp-version':id}}));if(r.error||!(r.data instanceof Blob))throw Error('Authorized download is unavailable.');return r.data;},
    load:()=>call('cp_admin_directory'),
    profile:target=>call('cp_admin_profile',{target}),
    saveProfile:(target,revision,profile,groups)=>call('cp_admin_save_profile',{target,expected_revision:revision,new_profile:profile,group_ids:groups}),
    saveGroup:group=>call('cp_admin_save_profile_group',{target:group.id||null,expected_revision:group.revision||'0',new_name:group.name,new_description:group.description}),
    register:(email,name)=>call('cp_admin_register',{login_email:email,learner_name:name}),
    save:(draft)=>call('cp_admin_save',{target:draft.user_id,expected_revision:draft.revision,learner_name:draft.display_name,new_status:draft.status,allowed_sections:draft.allowed}),
    onInvalidate(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
    dispose(){stopped=true;generation++;authOwner.dispose();listeners.clear();}
  };
}
// Pure preview of the current explicit leaf model; not an authorization substitute.
export function accessPreview(member,sections) {
  if(member.status!=='active') return {sections:[],landing:null};
  const allowed=sections.filter(s=>s.kind==='section' && (member.role==='administrator'||member.allowed.includes(s.id)));
  return {sections:allowed,landing:allowed.length===1?allowed[0].id:null};
}
export function descendants(sections,parent) {
  const found=new Set([parent]); let changed=true;
  while(changed){changed=false;for(const s of sections)if(found.has(s.parent_id)&&!found.has(s.id)){found.add(s.id);changed=true;}}
  return sections.filter(s=>s.kind==='section'&&found.has(s.id));
}
