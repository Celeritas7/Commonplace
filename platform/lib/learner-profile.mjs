import {validateProfile} from './learning-profile.mjs';
// Shared adapter for future section integrations. The U1 context ticket is
// invalidated on auth events. RLS is the actual permission boundary.
export async function readLearnerProfile(client,context){
 const check=()=>{if(!context?.ticket||context.ticket.owner!==context.userId||context.ticket.signal.aborted)throw Error('Account changed.');};
 check();
 const result=await client.from('cp_learning_profiles').select('profile').eq('user_id',context.userId).abortSignal(context.ticket.signal).maybeSingle();
 check();if(result.error)throw Error('Learning profile is unavailable.');
 return {version:1,profile:validateProfile(result.data?.profile||{})};
}
