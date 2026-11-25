import { createLearnerContext } from "../lib/learner-context.mjs";
import { createSavedOwner } from "./saved-owner.mjs";
export function createOfflineSession({
  store,
  storage,
  namespace,
  loadClient,
  packs,
  online = () => navigator.onLine,
  notify = () => {},
}) {
  const savedOwner = createSavedOwner(storage, namespace);
  let client,
    clientPromise,
    identity,
    subscription,
    current = null,
    generation = 0,
    disposed = false,
    offlineMode = false,
    expiry;
  const marker = savedOwner.read;
  let observedOwner = marker()?.owner;
  const lock = () => {
    try {
      savedOwner.lock();
    } finally {
      observedOwner = undefined;
      offlineMode = false;
      invalidate();
      notify();
    }
  };
  function invalidate() {
    generation++;
    clearTimeout(expiry);
    current = null;
    if (identity) identity.invalidate();
    else store.switchAccount(null);
  }
  function check(c) {
    const ticket = store.ticket(),
      m = marker();
    if (
      disposed ||
      ticket.signal !== c.ticket.signal ||
      ticket.signal.aborted ||
      m?.owner !== c.userId
    )
      throw Error("Account changed");
  }
  async function getClient() {
    if (!clientPromise)
      clientPromise = (async () => {
        client = await loadClient();
        if (disposed) throw Error("Workspace closed");
        identity = createLearnerContext({ enabled: true, client, store });
        subscription = client.auth.onAuthStateChange((event, session) => {
          const next = session?.user?.id;
          if (event === "SIGNED_OUT") lock();
          else if (next && marker()?.owner && marker().owner !== next) {
            if (event === "INITIAL_SESSION" && !current) {
              // Retire the previous saved selector, while U1 verifies this initial
              // identity with getUser. No private view/ticket has been opened yet.
              storage.setItem(
                savedOwner.key,
                JSON.stringify({ unlocked: false }),
              );
              observedOwner = undefined;
              offlineMode = false;
              notify();
            } else lock();
          }
        }).data.subscription;
      })().catch((error) => {
        clientPromise = null;
        throw error;
      });
    await clientPromise;
    return client;
  }
  async function refresh() {
    invalidate();
    const request = generation;
    // A saved-study selection (or a missed online event after backgrounding)
    // must never suppress fresh authorization while the browser is online.
    if (offlineMode && !online()) {
      const m = marker();
      if (!m) throw Error("Sign in online before opening saved study.");
      const lease = await packs.resume(m.owner);
      if (disposed || generation !== request || marker()?.owner !== m.owner)
        throw Error("Account changed");
      store.switchAccount(m.owner);
      const c = {
        userId: m.owner,
        role: "learner",
        displayName: lease.display_name,
        offline: true,
        expiresAt: lease.expires_at,
        sections: [
          {
            id: lease.section,
            title: "Excel Study",
            kind: "section",
            parent_id: null,
          },
        ],
        landingSection: lease.section,
        ticket: store.ticket(),
      };
      c.client = packs.clientFor(c, lease);
      current = c;
      expiry = setTimeout(
        () => {
          invalidate();
          notify();
        },
        Math.max(0, lease.expires_at - Date.now()),
      );
      return c;
    }
    if (!online())
      throw Error(
        "Choose Resume saved study to open your downloaded materials.",
      );
    const verifiedUnder = savedOwner.lockId();
    try {
      const source = await getClient();
      if (disposed || request !== generation) throw Error("Account changed");
      const c = await identity.refresh();
      if (disposed || request !== generation || c.ticket.signal.aborted)
        throw Error("Account changed");
      savedOwner.select(c.userId, verifiedUnder);
      observedOwner = c.userId;
      c.client = source;
      c.offline = false;
      current = c;
      return c;
    } catch (e) {
      if (
        request === generation &&
        online() &&
        verifiedUnder === savedOwner.lockId()
      ) {
        const m = marker();
        try {
          lock();
        } finally {
          if (m) await packs.block(m.owner);
        }
      }
      throw e;
    }
  }
  function changed(event) {
    if (
      (event.key === savedOwner.key || event.key === savedOwner.lockKey) &&
      marker()?.owner !== observedOwner
    ) {
      observedOwner = marker()?.owner;
      offlineMode = false;
      invalidate();
      notify();
    }
  }
  window.addEventListener("storage", changed);
  return {
    refresh,
    invalidate,
    check,
    marker,
    lock,
    canResumeOffline: () => offlineMode,
    resume() {
      if (!marker()) throw Error("Sign in online to prepare offline study.");
      offlineMode = true;
    },
    connect() {
      offlineMode = false;
    },
    transitionOffline() {
      if (current && marker()?.owner === current.userId) offlineMode = true;
    },
    async deny() {
      const m = marker();
      try {
        lock();
      } finally {
        if (m) await packs.block(m.owner).catch(() => {});
      }
    },
    dispose() {
      disposed = true;
      invalidate();
      identity?.dispose();
      subscription?.unsubscribe();
      window.removeEventListener("storage", changed);
    },
  };
}
