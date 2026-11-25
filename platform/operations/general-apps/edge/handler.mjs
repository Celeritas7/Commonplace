import { authorizeEdge } from "./authorize.mjs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cs-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body, status) => Response.json(body, { status, headers: cors });
export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function boundedJson(message, limit, signal) {
  if (Number(message.headers.get("content-length")) > limit)
    throw new InputError("Body too large.", 413);
  if (!message.body) throw new InputError("Missing JSON body.");
  const reader = message.body.getReader(),
    chunks = [];
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    let size = 0;
    for (;;) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        cancel();
        throw new InputError("Body too large.", 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
function key(env, collection, legacy) {
  try {
    return JSON.parse(env(collection) || "{}").default || env(legacy);
  } catch {
    return env(legacy);
  }
}
export function createEdgeHandler(
  route,
  createClient,
  env,
  providerFetch = fetch,
) {
  const auth = { persistSession: false, autoRefreshToken: false };
  const caller = (header) =>
    createClient(
      env("SUPABASE_URL"),
      key(env, "SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"),
      { auth, global: { headers: { Authorization: header } } },
    );
  return async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST")
      return json({ error: "Method not allowed." }, 405);
    const admission = await authorizeEdge(req, caller, route.name);
    if (!admission.ok)
      return json(
        {
          error:
            admission.status === 503
              ? "Access verification unavailable."
              : "Verified application access required.",
        },
        admission.status,
      );
    const providerKey = env(route.secret);
    if (!providerKey) return json({ error: "Provider unavailable." }, 503);
    let payload;
    try {
      const input = await boundedJson(
        req,
        route.inputBytes,
        AbortSignal.timeout(15000),
      );
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw new InputError("Expected a JSON object.");
      payload = route.prepare(input);
    } catch (error) {
      if (error instanceof InputError)
        return json({ error: error.message }, error.status);
      return json({ error: "Invalid or incomplete request." }, 400);
    }
    try {
      const server = createClient(
        env("SUPABASE_URL"),
        key(env, "SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
        { auth },
      );
      const { data, error } = await server.rpc("ga_reserve_edge", {
        requested_function: route.name,
        verified_user: admission.user,
      });
      if (error?.code === "AK210")
        return json({ error: "Daily limit reached.", code: "AK210" }, 429);
      if (error?.code === "42501")
        return json({ error: "Access withdrawn." }, 403);
      if (error || data !== true)
        return json({ error: "Usage check unavailable." }, 503);
    } catch {
      return json({ error: "Usage check unavailable." }, 503);
    }
    try {
      const signal = AbortSignal.timeout(route.timeoutMs);
      const response = await providerFetch(route.url, {
        method: "POST",
        headers: route.headers(providerKey),
        body: JSON.stringify(payload),
        redirect: "error",
        signal,
      });
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        console.warn(route.name, "upstream status", response.status);
        return json({ error: "Provider request failed." }, 502);
      }
      return json(
        route.result(await boundedJson(response, route.outputBytes, signal)),
        200,
      );
    } catch {
      return json(
        { error: "Provider returned no usable result. Try again later." },
        502,
      );
    }
  };
}
