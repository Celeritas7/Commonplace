import { authConfiguration } from "./config.mjs";
import { validateStagingConfiguration } from "./configuration.mjs";
import { mountLogin } from "./login.mjs";
const root = document.querySelector("#app");
if (authConfiguration) {
  try {
    const config = validateStagingConfiguration(authConfiguration);
    if (location.origin !== config.origin) throw Error("Wrong origin");
    const { client } = await import("./client.mjs");
    await mountLogin(root, {
      client,
      config,
      location,
      history,
      storage: localStorage,
    });
  } catch {
    root.textContent =
      "Staging sign-in is unavailable. Open your reviewed test-site address. Saved work has been kept.";
  }
}
