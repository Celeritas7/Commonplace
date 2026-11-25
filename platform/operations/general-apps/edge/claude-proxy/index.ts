// Review candidate. The release source belongs to Akatsuki.
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { createEdgeHandler } from "../handler.mjs";
import { claudeRoute } from "./route.mjs";

Deno.serve(
  createEdgeHandler(claudeRoute, createClient, (name: string) =>
    Deno.env.get(name),
  ),
);
