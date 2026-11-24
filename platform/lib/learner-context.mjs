import {observeAuthOwner} from './auth-owner.mjs';
// Unwired U1 adapter. No default client, project URL, keys, or legacy gate hooks.
// Server RLS remains authoritative; this context is only for navigation/adapters.
export function createLearnerContext({enabled = false, client, store} = {}) {
  if (!enabled) throw Error('Commonplace platform is not enabled');
  let generation = 0, disposed = false;
  function invalidate() { generation++; store.switchAccount(null); }
  const authOwner = observeAuthOwner(client, invalidate);
  return {
    // Let a section host cancel pending verification on offline/page lifecycle
    // transitions without inventing an offline authorization lease.
    invalidate,
    async refresh() {
      if (disposed) throw Error('Context disposed');
      invalidate(); const request = generation;
      const check = () => { if (disposed || generation !== request) throw Error('Account changed'); };
      const userResult = await client.auth.getUser(); check();
      if (userResult.error || !userResult.data?.user?.id) throw Error('Verified sign-in required');
      const userId = userResult.data.user.id;
      authOwner.verified(userId);
      const member = await client.from('cp_memberships').select('user_id,role,status,display_name').eq('user_id',userId).maybeSingle(); check();
      if (member.error || member.data?.user_id !== userId || member.data.status !== 'active' ||
          !['administrator','learner'].includes(member.data.role)) throw Error('Active membership required');
      const sections = await client.from('cp_sections').select('id,parent_id,title,kind').order('id'); check();
      if (sections.error || !Array.isArray(sections.data)) throw Error('Section access unavailable');
      store.switchAccount(userId);
      const leaves = sections.data.filter(s => s.kind === 'section');
      return {userId, role: member.data.role, displayName: member.data.display_name,
        sections: sections.data, landingSection: leaves.length === 1 ? leaves[0].id : null, ticket: store.ticket()};
    },
    dispose() { disposed = true; invalidate(); authOwner.dispose(); }
  };
}
