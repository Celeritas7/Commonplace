// Candidate shared guard. The caller client must carry the user's JWT and a
// publishable key. Never use a service-role client for the entitlement RPC.
export async function authorizeEdge(req, createCaller, functionName) {
  if (!["code-exec", "claude-proxy"].includes(functionName))
    return { ok: false, status: 403 };
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match || match[1].startsWith("sb_")) return { ok: false, status: 401 };
  try {
    const caller = createCaller(header);
    const identity = await caller.auth.getUser(match[1]);
    if (
      identity.error ||
      !identity.data?.user?.id ||
      identity.data.user.is_anonymous
    )
      return { ok: false, status: 401 };
    const access = await caller.rpc("ga_can_call_edge", {
      requested_function: functionName,
    });
    if (access.error) return { ok: false, status: 503 };
    if (access.data !== true) return { ok: false, status: 403 };
    return { ok: true, status: 200 };
  } catch {
    return { ok: false, status: 503 };
  }
}
