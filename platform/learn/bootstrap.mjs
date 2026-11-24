import { deployment, loadDeploymentClient } from "../admin/deployment.mjs";
import { createAccountStore } from "../lib/account-store.mjs";
import { mountLearningWorkspace } from "./workspace.mjs";
import { mountOfflineLearning } from "../offline/host.mjs";
import { watchShellUpdates } from "../offline/shell.mjs";
export async function bootLearningWorkspace(root) {
  watchShellUpdates().catch(() => {});
  if (!deployment) return;
  try {
    if (deployment.offline?.enabled) {
      const store = createAccountStore(
        localStorage,
        deployment.projectNamespace,
      );
      await mountOfflineLearning(root, {
        namespace: deployment.projectNamespace,
        store,
        loadClient: loadDeploymentClient,
        publicJwk: deployment.offline.publicJwk,
      });
      return;
    }
    const client = await loadDeploymentClient();
    const store = createAccountStore(localStorage, deployment.projectNamespace);
    mountLearningWorkspace(root, { enabled: true, client, store });
  } catch {
    root.replaceChildren();
    const message = document.createElement("p");
    message.className = "learn-notice learn-error";
    message.textContent =
      "The learning workspace is unavailable. Your existing study data has been kept. Reopen it from your signed-in Commonplace account.";
    root.append(message);
  }
}
