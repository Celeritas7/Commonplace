import {validateRecord,composeLesson} from './contracts.mjs';
// U6 must supply a server-authorized loader (fresh membership, section,
// publication and assignment checks). There is deliberately no default fetch
// route, static fallback, trusted-local-role flag or offline authorization here.
export function createAssignedContentAdapter({sectionId,capabilities,loadAuthorizedBundle}){
 if(typeof loadAuthorizedBundle!=='function')throw Error('Authorized content loader required');
 return async function load(context,assignmentId){
  const check=()=>{if(!context?.ticket||context.ticket.owner!==context.userId||context.ticket.signal.aborted)throw Error('Account changed');
   if(!context.sections.some(s=>s.id===sectionId&&s.kind==='section'))throw Error('Section not available');};
  if(typeof assignmentId!=='string'||!/^[a-z][a-z0-9.-]{0,99}$/.test(assignmentId))throw Error('Invalid assignment ID');
  check();const envelope=await loadAuthorizedBundle({assignmentId,signal:context.ticket.signal});check();
  if(!envelope||envelope.owner_id!==context.userId||envelope.publication_state!=='published')throw Error('Authorized published content required');
  const assignment=validateRecord(envelope.assignment);
  if(assignment.kind!=='assignment'||assignment.id!==assignmentId||assignment.status!=='assigned'||assignment.section_id!==sectionId)throw Error('Assignment mismatch');
  const bundle=composeLesson(envelope.bundle,capabilities);
  if(bundle.lesson.section_id!==sectionId||bundle.lesson.id!==assignment.lesson_ref.id||bundle.lesson.version!==assignment.lesson_ref.version)throw Error('Assigned lesson version mismatch');
  return {assignment,bundle};
 };
}
