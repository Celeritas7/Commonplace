export function createAdminAPI({client, enabled=false, online=()=>navigator.onLine}={}) {
  if(!enabled) throw Error('Admin Studio is not enabled');
  let generation=0, stopped=false;
  const listeners=new Set();
  const {data:{subscription}}=client.auth.onAuthStateChange(()=>{generation++; for(const fn of listeners)fn();});
  async function call(name,args={}) {
    if(stopped || !online()) throw Error('Connect to the internet to use Admin Studio.');
    const start=generation;
    const user=await client.auth.getUser();
    if(start!==generation || stopped) throw Error('Account changed. Reload Admin Studio.');
    if(user.error || !user.data?.user?.id) throw Error('Sign in with the administrator account.');
    const result=await client.rpc(name,args);
    if(start!==generation || stopped) throw Error('Account changed. Reload Admin Studio.');
    if(result.error) {
      const messages={'40001':'Access changed in another tab. Reload before saving.','42501':'Administrator access is required.','23505':'This account is already registered. Select it in the learner list.','22023':'Check the verified login email and selected study sections.'};
      const error=Error(messages[result.error.code] || 'The request failed. Reload to confirm the current saved state before retrying.');
      error.code=result.error.code; throw error;
    }
    return result.data;
  }
  return {
    load:()=>call('cp_admin_directory'),
    register:(email,name)=>call('cp_admin_register',{login_email:email,learner_name:name}),
    save:(draft)=>call('cp_admin_save',{target:draft.user_id,expected_revision:draft.revision,learner_name:draft.display_name,new_status:draft.status,allowed_sections:draft.allowed}),
    onInvalidate(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
    dispose(){stopped=true;generation++;subscription.unsubscribe();listeners.clear();}
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
