// Verified cache completion precedes asynchronous activation and client claim.
// Do not report Ready offline until the saved worker controls this page.
export function waitForShellControl(workers, worker, signal, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => finish(Error(
      "Application saved, but offline control is not ready. Reopen online and resume the download."
    )), timeoutMs);
    const abort = () => finish(Error("Download paused. Resume to reuse completed files."));
    function finish(error) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      workers.removeEventListener("controllerchange", check);
      worker.removeEventListener("statechange", check);
      signal?.removeEventListener("abort", abort);
      error ? reject(error) : resolve();
    }
    function check() {
      if (signal?.aborted) return abort();
      if (worker.state === "redundant") return finish(Error(
        "Application update was replaced. Reopen online and resume the download."
      ));
      if (workers.controller === worker && worker.state === "activated") finish();
    }
    workers.addEventListener("controllerchange", check);
    worker.addEventListener("statechange", check);
    signal?.addEventListener("abort", abort, { once: true });
    check();
  });
}

export async function saveOfflineShell(progress = () => {}, signal) {
  if (!("serviceWorker" in navigator))
    throw Error("This browser cannot save the study application offline.");
  const registration = await navigator.serviceWorker.register(
    new URL("../learn/sw.js", import.meta.url),
    {
      scope: new URL("../learn/", import.meta.url).pathname,
      updateViaCache: "none",
    },
  );
  let worker =
    registration.waiting || registration.active || registration.installing;
  if (!worker)
    throw Error(
      "Offline application did not start. Retry without clearing website data.",
    );
  if (worker.state === "installing")
    await new Promise((resolve, reject) => {
      const installing = worker;
      function check() {
        if (["installed", "activating", "activated", "redundant"].includes(installing.state)) {
          installing.removeEventListener("statechange", check);
          installing.state === "redundant"
            ? reject(Error("Offline application update failed."))
            : resolve();
        }
      }
      installing.addEventListener("statechange", check);
      check();
    });
  worker = registration.waiting || registration.active || worker;
  await new Promise((resolve, reject) => {
    const channel = new MessageChannel(),
      timer = setTimeout(
        () =>
          finish(
            Error(
              "Application download timed out. Resume to reuse completed files.",
            ),
          ),
        120000,
      );
    const abort = () =>
      finish(Error("Download paused. Resume to reuse completed files."));
    let finished = false;
    function finish(error) {
      if (finished) return;
      finished = true;
      if (error) channel.port1.postMessage({ type: "cancel" });
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      channel.port1.close();
      error ? reject(error) : resolve();
    }
    signal?.addEventListener("abort", abort, { once: true });
    channel.port1.onmessage = ({ data }) => {
      if (data.type === "progress") progress(data);
      else if (data.type === "ready") finish();
      else if (data.type === "error") finish(Error(data.message));
    };
    worker.postMessage({ type: "SAVE_SHELL" }, [channel.port2]);
    if (signal?.aborted) abort();
  });
  await waitForShellControl(navigator.serviceWorker, worker, signal);
}

// Check only an already installed, exact-scope worker. Updates are offered for
// review; neither private files nor a learner's open notes are reloaded silently.
export async function watchShellUpdates() {
  if (!navigator.onLine || !navigator.serviceWorker) return;
  const scope = new URL("../learn/", import.meta.url).href;
  const registration = await navigator.serviceWorker.getRegistration(scope);
  if (!registration || registration.scope !== scope) return;
  const offer = () => {
    if (
      !registration.waiting ||
      document.getElementById("cp-application-update")
    )
      return;
    const box = document.createElement("aside");
    box.id = "cp-application-update";
    box.className = "learn-offline-tools";
    const text = document.createElement("p");
    text.textContent =
      "A study application update is available. Saved materials and progress will be kept.";
    const button = document.createElement("button");
    button.textContent = "Save application update";
    button.onclick = async () => {
      button.disabled = true;
      try {
        await saveOfflineShell(
          (p) =>
            (text.textContent = `Saving application update: ${p.done}/${p.count} files`),
        );
        text.textContent =
          "Application update saved. Reopen when you have finished your current work.";
        button.textContent = "Reopen updated application";
        button.onclick = () => location.reload();
      } catch (e) {
        text.textContent = e.message;
      } finally {
        button.disabled = false;
      }
    };
    box.append(text, button);
    document.body.prepend(box);
  };
  registration.addEventListener("updatefound", () =>
    registration.installing?.addEventListener("statechange", offer),
  );
  await registration.update();
  offer();
}
