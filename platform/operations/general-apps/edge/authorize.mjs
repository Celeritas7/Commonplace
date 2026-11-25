// The caller client carries the same bearer token for Auth and the grant lookup.
export async function authorizeEdge(req, createCaller, functionName) {
  if (!["code-exec", "claude-proxy"].includes(functionName))
    return { ok: false, status: 403 };
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer ([^\s]+)$/i.exec(header);
  if (!match || match[1].startsWith("sb_")) return { ok: false, status: 401 };
  try {
    const caller = createCaller(header);
    const { data, error } = await caller.auth.getUser(match[1]);
    if (error) {
      const unavailable =
        error.name === "AuthRetryableFetchError" ||
        error.status === 429 ||
        error.status >= 500;
      return { ok: false, status: unavailable ? 503 : 401 };
    }
    if (!data?.user?.id || data.user.is_anonymous)
      return { ok: false, status: 401 };
    const grant = await caller.rpc("ga_can_call_edge", {
      requested_function: functionName,
    });
    if (grant.error) return { ok: false, status: 503 };
    return grant.data === true
      ? { ok: true, user: data.user.id }
      : { ok: false, status: 403 };
  } catch {
    return { ok: false, status: 503 };
  }
}
