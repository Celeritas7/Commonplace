import { createClient } from "@supabase/supabase-js";
import { createFileHandler } from "../../../materials/file-handler.mjs";
// Deployment supplies these server secrets. No credential is exported to a page.
const url = Deno.env.get("SUPABASE_URL")!,
  key = Deno.env.get("SUPABASE_ANON_KEY")!,
  secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
Deno.serve(
  createFileHandler({
    origin: Deno.env.get("COMMONPLACE_APP_ORIGIN"),
    clients: (authorization: string) => ({
      user: createClient(url, key, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      }),
      service: createClient(url, secret, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    }),
  }),
);
