import { createClient } from "@supabase/supabase-js";
import { createLeaseHandler } from "../../../offline/lease-handler.mjs";
// Separate offline signing key. Never reuse or export Supabase JWT/service keys.
const privateKey = await crypto.subtle.importKey(
  "jwk",
  JSON.parse(Deno.env.get("COMMONPLACE_OFFLINE_PRIVATE_JWK")!),
  { name: "ECDSA", namedCurve: "P-256" },
  false,
  ["sign"],
);
Deno.serve(
  createLeaseHandler({
    origin: Deno.env.get("COMMONPLACE_APP_ORIGIN"),
    namespace: Deno.env.get("COMMONPLACE_PROJECT_NAMESPACE"),
    leaseMs: Number(Deno.env.get("COMMONPLACE_OFFLINE_HOURS")) * 3600000,
    privateKey,
    client: (authorization: string) =>
      createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      ),
  }),
);
