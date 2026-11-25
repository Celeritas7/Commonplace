import { authConfiguration } from "./config.mjs";
import {
  validateStagingConfiguration,
  stagingClientOptions,
} from "./configuration.mjs";
const config = validateStagingConfiguration(authConfiguration);
if (location.origin !== config.origin)
  throw Error("Open the reviewed staging address.");
// Bundled from the pinned npm package by prepare-staging; never loaded from a CDN.
const { createClient } = await import("../vendor/supabase.mjs");
export const client = createClient(
  `https://${config.project_ref}.supabase.co`,
  config.publishable_key,
  stagingClientOptions(config),
);
await client.auth.initialize();
