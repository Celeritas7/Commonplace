// Review candidate. The release source belongs to Akatsuki.
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { createEdgeHandler } from "../handler.mjs";
import { executionRoute } from "./route.mjs";

Deno.serve(
  createEdgeHandler(executionRoute, createClient, (name: string) =>
    Deno.env.get(name),
  ),
);
