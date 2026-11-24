// Auth events observe session ownership; only getUser + server authorization
// can establish access. A refreshed token for the same owner is not a switch.
export function observeAuthOwner(client, invalidate) {
  let owner;
  const {data:{subscription}} = client.auth.onAuthStateChange((event, session) => {
    const next = event === 'SIGNED_OUT' ? null : session?.user?.id || null;
    if (!next || (owner !== undefined && owner !== next)) {
      owner = next;
      invalidate();
      return;
    }
    // INITIAL_SESSION may arrive while the first getUser is pending. Remember
    // its identity for comparison without granting access or cancelling it.
    owner = next;
  });
  return {
    verified(userId) {
      if (owner !== undefined && owner !== userId) {
        // Conflicting observations require a new verification. Invalidate all
        // in-flight work even if the SDK did not deliver an account-change event.
        owner = undefined;
        invalidate();
        throw Error('Account changed. Reload to verify access.');
      }
      owner = userId;
    },
    dispose() { subscription.unsubscribe(); }
  };
}
