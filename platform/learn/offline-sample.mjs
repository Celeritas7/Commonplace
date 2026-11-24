import { createSampleClient } from "./sample-client.mjs";
import { openOwnedDatabase, ownedKey } from "../offline/database.mjs";
import { createLeaseHandler } from "../offline/lease-handler.mjs";
import { canonical } from "../offline/lease.mjs";
// Entirely synthetic public preview. Its signing key and simulated cloud are
// confined to this sample namespace, never imported by live bootstrap.
export async function createOfflineSample(namespace = "sample-u8") {
  const db = await openOwnedDatabase(namespace),
    f = await createSampleClient();
  let keys = await db.get("sample", "keys");
  if (!keys) {
    keys = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    keys = await db.update("sample", "keys", (current) => current || keys);
  }
  const publicJwk = await crypto.subtle.exportKey("jwk", keys.publicKey),
    origin = "https://commonplace-sample.invalid";
  const rpc = f.client.rpc.bind(f.client),
    invoke = f.client.functions.invoke.bind(f.client.functions);
  const allowed = (target) =>
    f.state.status === "active" &&
    f.state.userId &&
    f.state.allowed.has(target) &&
    f.state.items.get(target)?.publication_state === "published" &&
    f.state.sections.some((s) => s.id === "office.excel");
  f.client.rpc = async (name, args) => {
    if (
      !["cp_offline_snapshot", "cp_sync_read", "cp_sync_write"].includes(name)
    )
      return rpc(name, args);
    f.state.calls.push(name);
    await f.state.hooks[name]?.(args);
    if (
      f.state.status !== "active" ||
      !f.state.userId ||
      args.section !== "office.excel" ||
      !f.state.sections.some((s) => s.id === args.section)
    )
      return { error: { code: "42501" } };
    if (name === "cp_offline_snapshot")
      return {
        data: {
          owner: f.state.userId,
          display_name: "Sample learner",
          section: args.section,
          profile: structuredClone(f.state.profile),
          materials: [...f.state.items.values()]
            .filter((m) => allowed(m.id))
            .map((m) => ({ ...structuredClone(m), owner_id: f.state.userId })),
        },
      };
    if (args.expected_owner !== f.state.userId || !allowed(args.target))
      return { error: { code: "42501" } };
    const key = ownedKey(
        f.state.userId,
        args.section,
        args.record_kind,
        args.record,
      ),
      row = (await db.get("sample", key)) || { revision: "0", value: null };
    if (name === "cp_sync_read")
      return { data: { revision: row.revision, value: row.value } };
    if (row.operation === args.operation) {
      if (canonical(row.value) !== canonical(args.new_value))
        return { error: { code: "22023" } };
      return {
        data: { status: "saved", revision: row.revision, value: row.value },
      };
    }
    if (row.revision !== args.expected_revision)
      return {
        data: { status: "conflict", revision: row.revision, value: row.value },
      };
    const next = {
      revision: String(BigInt(row.revision) + 1n),
      value: args.new_value,
      operation: args.operation,
    };
    await db.put("sample", key, next);
    return {
      data: { status: "saved", revision: next.revision, value: next.value },
    };
  };
  const handler = createLeaseHandler({
    origin,
    namespace,
    privateKey: keys.privateKey,
    leaseMs: 7 * 86400000,
    client: () => f.client,
  });
  f.client.functions.invoke = async (name, args) => {
    if (name !== "offline-lease") return invoke(name, args);
    await f.state.hooks.lease?.();
    // This in-process fixture does not make a network request. Browser Request
    // guards strip caller-supplied Origin; use an explicit server-shaped header bag.
    const r = await handler({
      method: "POST",
      headers: new Headers({
        Origin: origin,
        Authorization: "Bearer public-sample-only",
        "x-cp-section": args.headers["x-cp-section"],
      }),
    });
    return r.ok ? { data: await r.json() } : { error: { code: "42501" } };
  };
  return { ...f, db, namespace, publicJwk, origin };
}
