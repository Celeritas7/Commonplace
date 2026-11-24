import { createSampleClient } from "./sample-client.mjs";
import { createAccountStore } from "../lib/account-store.mjs";
import { memoryStorage } from "./progress.mjs";
import { mountLearningWorkspace } from "./workspace.mjs";
const { client } = await createSampleClient();
mountLearningWorkspace(document.querySelector("#app"), {
  enabled: true,
  client,
  store: createAccountStore(memoryStorage(), "public-sample"),
  preview: true,
  persistent: false,
});
