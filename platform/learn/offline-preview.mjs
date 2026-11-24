import { createOfflineSample } from "./offline-sample.mjs";
import { createAccountStore } from "../lib/account-store.mjs";
import { mountOfflineLearning } from "../offline/host.mjs";
import { watchShellUpdates } from "../offline/shell.mjs";
watchShellUpdates().catch(() => {});
const sample = await createOfflineSample();
await mountOfflineLearning(document.querySelector("#app"), {
  ...sample,
  preview: true,
  store: createAccountStore(localStorage, sample.namespace),
  loadClient: async () => sample.client,
});
