import { projectNamespace } from "./configuration.mjs";
import { createSavedOwner } from "../offline/saved-owner.mjs";
const callbackKeys = [
  "code",
  "sb_flow_id",
  "error",
  "error_code",
  "error_description",
];
// Process the callback once, before any routing or URL cleanup. Never use a
// return-to query, email or user-editable role claim as the destination/authority.
export async function finishLogin(client, { href, replace, savedOwner }) {
  const url = new URL(href),
    code = url.searchParams.get("code");
  const fragment = new URLSearchParams(url.hash.slice(1));
  const callback =
    callbackKeys.some((k) => url.searchParams.has(k)) ||
    ["access_token", "refresh_token", "error"].some((k) => fragment.has(k));
  if (callback) savedOwner?.lock();
  await client.auth.initialize();
  if (callback) {
    try {
      if (
        url.searchParams.has("error") ||
        fragment.has("error") ||
        fragment.has("access_token") ||
        fragment.has("refresh_token") ||
        !code ||
        url.searchParams.getAll("code").length !== 1
      )
        throw Error("Callback rejected");
      const flowId = url.searchParams.get("sb_flow_id");
      const result = await client.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );
      if (result.error) throw Error("Callback exchange failed");
    } catch {
      throw Error(
        "Sign-in could not finish. Try Continue with Google again in this same browser or installed app.",
      );
    } finally {
      callbackKeys.forEach((k) => url.searchParams.delete(k));
      if (
        ["access_token", "refresh_token", "error"].some((k) => fragment.has(k))
      )
        url.hash = "";
      replace(url.pathname + url.search + url.hash);
    }
  }
  const session = await client.auth.getSession();
  if (session.error)
    throw Error("Your sign-in could not be checked. Reconnect and retry.");
  if (!session.data?.session) {
    savedOwner?.lock();
    return { state: "signed-out" };
  }
  const verified = await client.auth.getUser();
  if (verified.error || !verified.data?.user?.id)
    throw Error("Your sign-in could not be verified. Reconnect and retry.");
  const userId = verified.data.user.id;
  if (savedOwner && savedOwner.read()?.owner !== userId) savedOwner.lock();
  const member = await client
    .from("cp_memberships")
    .select("role,status")
    .eq("user_id", userId)
    .maybeSingle();
  if (member.error)
    throw Error("Your access could not be checked. Reconnect and retry.");
  if (member.data?.status === "active" && member.data.role === "learner")
    return { state: "ready", path: "/platform/learn/index.html" };
  savedOwner?.lock();
  if (member.data?.status !== "active") return { state: "unassigned" };
  if (member.data.role === "administrator")
    return { state: "ready", path: "/platform/admin/index.html" };
  return { state: "unassigned" };
}
export async function lockAndSignOut(client, config, storage) {
  // Lock before the network request. Keep all saved lessons, notes and queues.
  createSavedOwner(storage, projectNamespace(config)).lock();
  const result = await client.auth.signOut({ scope: "local" });
  if (result.error)
    throw Error("Saved study is locked. Reconnect to finish signing out.");
}
export async function mountLogin(
  root,
  {
    client,
    config,
    location,
    history,
    storage,
    online = () => navigator.onLine,
  },
) {
  const savedOwner = createSavedOwner(storage, projectNamespace(config));
  root.innerHTML =
    '<main class="disabled-state panel"><p class="eyebrow">COMMONPLACE · STAGING</p><h1>Sign in to Commonplace</h1><p id="login-status" role="status">Checking your sign-in…</p><p><button id="google-login" type="button">Continue with Google</button> <button id="sign-out" type="button">Sign out</button></p><p><a id="open-workspace" hidden>Continue to your workspace</a></p><p><a id="open-saved-study" href="../learn/index.html" hidden>Open saved study</a></p><p>Prepare offline study in the same browser or Home Screen app you will use later.</p></main>';
  const status = root.querySelector("#login-status"),
    google = root.querySelector("#google-login"),
    out = root.querySelector("#sign-out"),
    savedStudy = root.querySelector("#open-saved-study");
  google.disabled = true;
  out.disabled = true;
  google.onclick = async () => {
    google.disabled = true;
    try {
      if (!online())
        throw Error(
          "You are offline. Open saved study to continue downloaded lessons.",
        );
      savedStudy.hidden = true;
      savedOwner.lock();
      status.textContent = "Opening Google…";
      const result = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: config.origin + "/platform/auth/index.html",
          queryParams: { prompt: "select_account" },
        },
      });
      if (result.error)
        throw Error("Google sign-in could not start. Reconnect and retry.");
    } catch (error) {
      status.textContent = error.message;
      google.disabled = false;
    }
  };
  out.onclick = async () => {
    out.disabled = true;
    savedStudy.hidden = true;
    try {
      await lockAndSignOut(client, config, storage);
      root.querySelector("#open-workspace").hidden = true;
      status.textContent = "Signed out. Your saved work has been kept.";
    } catch (error) {
      status.textContent = error.message;
      out.disabled = false;
    }
  };
  try {
    if (!online()) {
      savedStudy.hidden = !savedOwner.read();
      status.textContent = savedStudy.hidden
        ? "Reconnect to verify your account before opening saved study."
        : "You are offline. Open saved study to continue downloaded lessons.";
      return;
    }
    client.auth.onAuthStateChange((event, session) => {
      const previous = savedOwner.read();
      if (
        event === "SIGNED_OUT" ||
        (previous && session?.user?.id && previous.owner !== session.user.id)
      ) {
        savedStudy.hidden = true;
        savedOwner.lock();
      }
    });
    const result = await finishLogin(client, {
      savedOwner,
      href: location.href,
      replace: (path) => history.replaceState(null, "", path),
    });
    if (result.state === "ready") {
      savedStudy.hidden = !savedOwner.read();
      if (!new URL(location.href).searchParams.has("account")) {
        location.replace(config.origin + result.path);
        return;
      }
      const link = root.querySelector("#open-workspace");
      link.href = config.origin + result.path;
      link.hidden = false;
      status.textContent = "You are signed in to your authorized workspace.";
      out.disabled = false;
      return;
    }
    status.textContent =
      result.state === "unassigned"
        ? "You are signed in. Your administrator needs to activate your learning access."
        : "Use your authorized Google account to continue.";
    out.disabled = result.state !== "unassigned";
  } catch (error) {
    savedOwner.lock();
    status.textContent = error.message;
    out.disabled = false;
  } finally {
    google.disabled = !online();
  }
}
