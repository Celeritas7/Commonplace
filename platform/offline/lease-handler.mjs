import {
  canonical,
  digest,
  materialBytes,
  signLease,
  validateLease,
  MAX_LEASE_MS,
} from "./lease.mjs";
export function createLeaseHandler({
  client,
  origin,
  namespace,
  privateKey,
  leaseMs,
  now = Date.now,
}) {
  if (
    !/^https:\/\//.test(origin || "") ||
    new URL(origin).origin !== origin ||
    !/^[a-z0-9-]{1,80}$/.test(namespace || "") ||
    !privateKey ||
    !Number.isSafeInteger(leaseMs) ||
    leaseMs < 3600000 ||
    leaseMs > MAX_LEASE_MS
  )
    throw Error(
      "Reviewed offline origin, namespace, key and lease interval required",
    );
  return async (request) => {
    const headers = {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    };
    const json = (status, data) =>
      new Response(JSON.stringify(data), { status, headers });
    if (request.headers.get("Origin") !== origin)
      return json(403, { error: "Origin unavailable" });
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "authorization, apikey, content-type, x-client-info, x-cp-section",
        },
      });
    if (request.method !== "POST") return json(405, { error: "POST required" });
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer "))
        return json(401, { error: "Sign in required" });
      const user = client(authorization),
        verified = await user.auth.getUser();
      if (verified.error || !verified.data?.user?.id)
        return json(401, { error: "Sign in required" });
      const section = request.headers.get("x-cp-section");
      if (section !== "office.excel")
        return json(400, { error: "Section unavailable" });
      const snapshot = async () => {
        const r = await user.rpc("cp_offline_snapshot", { section });
        if (r.error) throw Error("Current assigned study unavailable");
        return r.data;
      };
      const s = await snapshot();
      if (
        s.owner !== verified.data.user.id ||
        s.section !== section ||
        !Array.isArray(s.materials) ||
        s.materials.length > 100
      )
        throw Error("Invalid snapshot");
      const materials = [];
      for (const m of s.materials) {
        const text = materialBytes(m, s.owner, section);
        materials.push({
          id: m.id,
          version: m.version,
          title: m.payload.title,
          material_type: m.payload.material_type,
          body_sha256: await digest(text),
          body_bytes: new TextEncoder().encode(text).length,
          asset: m.asset ?? null,
        });
      }
      // Detect assignment/profile/publication changes during hashing; never renew
      // a lease from a stale snapshot while revocation is being processed.
      if (canonical(await snapshot()) !== canonical(s))
        throw Error("Assignments changed; retry");
      const issued_at = now(),
        manifest = {
          version: 1,
          namespace,
          origin,
          owner: s.owner,
          display_name: s.display_name,
          section,
          profile: s.profile,
          issued_at,
          expires_at: issued_at + leaseMs,
          materials,
        };
      validateLease(manifest, { namespace, origin, now: issued_at });
      return json(200, await signLease(manifest, privateKey));
    } catch {
      return json(403, {
        error:
          "Offline access could not be authorized. Refresh your study access.",
      });
    }
  };
}
