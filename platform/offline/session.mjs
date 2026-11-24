import { createLearnerContext } from "../lib/learner-context.mjs";
export function createOfflineSession({
  store,
  storage,
  namespace,
  loadClient,
  packs,
  online = () => navigator.onLine,
  notify = () => {},
}) {
  const markerKey = "cp:u8:" + namespace + ":saved-owner";
  let client,
    clientPromise,
    identity,
    subscription,
    current = null,
    generation = 0,
    disposed = false,
    offlineMode = false,
    expiry;
  const marker = () => {
    try {
      const m = JSON.parse(storage.getItem(markerKey));
      return m?.unlocked === true && typeof m.owner === "string" ? m : null;
    } catch {
      return null;
    }
  };
  let observedOwner = marker()?.owner;
  const lock = () => {
    try {
      storage.setItem(markerKey, JSON.stringify({ unlocked: false }));
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
              storage.setItem(markerKey, JSON.stringify({ unlocked: false }));
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
    if (offlineMode) {
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
    try {
      const source = await getClient();
      if (disposed || request !== generation) throw Error("Account changed");
      const c = await identity.refresh();
      if (disposed || request !== generation || c.ticket.signal.aborted)
        throw Error("Account changed");
      storage.setItem(
        markerKey,
        JSON.stringify({ owner: c.userId, unlocked: true }),
      );
      observedOwner = c.userId;
      c.client = source;
      c.offline = false;
      current = c;
      return c;
    } catch (e) {
      if (request === generation && online()) {
        const m = marker();
        try {
          if (m) await packs.block(m.owner);
        } finally {
          lock();
        }
      }
      throw e;
    }
  }
  function changed(event) {
    if (event.key === markerKey && marker()?.owner !== observedOwner) {
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
        if (m) await packs.block(m.owner);
      } catch {
        /* Still lock the selector and active view. */
      } finally {
        lock();
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
