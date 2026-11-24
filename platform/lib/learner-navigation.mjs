// Consumes the fresh, RLS-filtered U1 context. The host owns protected section
// routes; this component never links learners to legacy public curriculum URLs.
export function mountLearnerNavigation(root,context,{openSection,openAdmin}={}) {
  root.replaceChildren();
  const leaves=context.sections.filter(s=>s.kind==='section');
  if(context.role==='administrator' && openAdmin){const admin=document.createElement('button');admin.textContent='Admin Studio';admin.onclick=openAdmin;root.append(admin);}
  if(leaves.length===1 && context.role==='learner'){openSection(leaves[0].id);return;}
  if(!leaves.length){const p=document.createElement('p');p.textContent='No study sections have been assigned yet.';root.append(p);return;}
  for(const section of leaves){const button=document.createElement('button');button.textContent=section.title;button.dataset.section=section.id;button.onclick=()=>openSection(section.id);root.append(button);}
}
