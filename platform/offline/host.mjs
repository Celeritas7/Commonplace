import { openOwnedDatabase, ownedKey } from "./database.mjs";
import { importPublicKey } from "./lease.mjs";
import { createPackManager } from "./packs.mjs";
import { createOfflineSession } from "./session.mjs";
import { createSyncStore } from "./sync-store.mjs";
import { saveOfflineShell } from "./shell.mjs";
import { mountLearningWorkspace } from "../learn/workspace.mjs";
const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
const size = (n) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;
export async function mountOfflineLearning(
  root,
  {
    namespace,
    store,
    storage = localStorage,
    loadClient,
    publicJwk,
    origin = location.origin,
    db,
    online = () => navigator.onLine,
    preview = false,
    installShell = saveOfflineShell,
  } = {},
) {
  db = db || (await openOwnedDatabase(namespace));
  const publicKey = await importPublicKey(publicJwk);
  let context = null,
    materials = [],
    ui,
    view,
    session,
    sync,
    disposed = false,
    downloadController = null,
    summaryTimer;
  const packs = createPackManager({
    db,
    namespace,
    origin,
    publicKey,
    check: (c) => session.check(c),
    notify: () => update(),
  });
  session = createOfflineSession({
    store,
    storage,
    namespace,
    loadClient,
    packs,
    online,
    notify: () => update(),
  });
  const describe = (v) =>
    typeof v?.text === "string"
      ? v.text
      : typeof v?.bookmarked === "boolean"
        ? v.bookmarked
          ? "Bookmarked"
          : "Not bookmarked"
        : v?.worksheet
          ? `${v.completed ? "Studied" : "In progress"} · ${v.worksheet.formula || "No formula"} · Values: ${v.worksheet.values.join(", ")}`
          : v?.responses
            ? `${v.completed ? "Studied" : "In progress"} · Responses: ${v.responses.map((x) => (x === null ? "unanswered" : x + 1)).join(", ")}`
            : JSON.stringify(v);
  async function update() {
    if (!ui || disposed) return;
    const c = context;
    ui.resume.disabled = !session.marker();
    ui.connect.disabled = !online();
    ui.download.disabled = !c || c.offline || !online() || !!downloadController;
    ui.pause.hidden = !downloadController;
    ui.sync.disabled = !c || c.offline || !online();
    ui.backup.disabled = !c;
    ui.restore.disabled = !c || c.offline || !online();
    if (!c) {
      ui.syncStatus.textContent =
        "Open your account to see synchronization status.";
      ui.conflicts.replaceChildren();
      return;
    }
    try {
      const status = await sync.summary(c);
      session.check(c);
      if (context !== c) return;
      ui.syncStatus.textContent = status.conflicts.length
        ? `${status.conflicts.length} saved conflict(s) need review. Both versions have been kept.`
        : status.pending
          ? `${status.pending} change(s) waiting to sync${c.offline ? " when you reconnect" : ""}.`
          : c.offline
            ? "Studying offline. New work will stay on this device until you reconnect."
            : "No changes waiting to sync.";
      ui.conflicts.replaceChildren();
      for (const row of status.conflicts) {
        const section = el("details"),
          title =
            materials.find((m) => m.id === row.data.material)?.title ||
            "Saved study";
        section.append(
          el("summary", `${title} · ${row.data.identity.kind} conflict`),
        );
        for (const option of [
          { id: "local", source: "device", value: row.data.value },
          ...row.data.conflicts,
        ]) {
          const panel = el("div");
          panel.className = "learn-conflict";
          panel.append(
            el(
              "strong",
              option.source === "cloud"
                ? "From another device"
                : option.source === "tab"
                  ? "From another tab"
                  : option.source === "backup"
                    ? "From your backup"
                    : "On this device",
            ),
            el("pre", describe(option.value)),
          );
          if (option.value !== null) {
            const choose = el("button", "Keep this version");
            choose.onclick = async () => {
              try {
                await sync.resolve(c, row.key, option.id);
                view.refresh();
              } catch (e) {
                ui.message.textContent = e.message;
              }
            };
            panel.append(choose);
          }
          section.append(panel);
        }
        section.append(
          el(
            "p",
            "Other copies remain in your study backup history after you choose.",
          ),
        );
        ui.conflicts.append(section);
      }
    } catch {
      /* Context changed; its private controls are cleared by the host. */
    }
  }
  const schedule = () => {
    update();
    clearTimeout(summaryTimer);
    summaryTimer = setTimeout(() => {
      if (context && !context.offline && online()) syncNow().catch(() => {});
    }, 700);
  };
  sync = createSyncStore({
    db,
    store,
    namespace,
    online,
    notify: () => update(),
    denied: () => session.deny(),
  });
  async function syncNow() {
    const c = context;
    if (!c || c.offline || !online()) return;
    try {
      await sync.syncAll(c, c.client, new Set(materials.map((m) => m.id)));
      await update();
    } catch (e) {
      if (context === c) ui.message.textContent = e.message;
    }
  }
  function mount(tools) {
    tools.className = "learn-offline-tools";
    const actions = el("div");
    actions.className = "learn-actions";
    const advanced = el("details"),
      secondary = el("div");
    secondary.className = "learn-actions";
    advanced.append(el("summary", "Sync, backups and access"), secondary);
    ui = { message: el("p"), syncStatus: el("p"), conflicts: el("div") };
    ui.message.setAttribute("role", "status");
    ui.syncStatus.setAttribute("role", "status");
    for (const [key, label] of [
      ["download", "Study offline / Resume download"],
      ["pause", "Pause download"],
      ["resume", "Resume saved study"],
      ["connect", "Refresh online access"],
      ["sync", "Sync now"],
      ["backup", "Export study backup"],
      ["restore", "Restore study backup"],
      ["lock", "Lock saved study"],
    ]) {
      const b = el("button", label);
      b.type = "button";
      b.className = "learn-secondary";
      ui[key] = b;
      (["download", "pause", "resume"].includes(key)
        ? actions
        : secondary
      ).append(b);
    }
    const link = el(
      "a",
      preview ? "Open the offline sample page" : "Open the offline study page",
    );
    link.href = new URL(
      preview ? "../learn/offline-preview.html" : "../learn/index.html",
      import.meta.url,
    ).href;
    link.className = "learn-link";
    if (preview)
      tools.append(
        el(
          "p",
          "This public sample keeps all data on this device. Cloud synchronization is simulated.",
        ),
      );
    tools.append(
      actions,
      ui.message,
      ui.syncStatus,
      ui.conflicts,
      advanced,
      link,
    );
    ui.download.onclick = async () => {
      const c = context;
      if (!c || c.offline) return;
      downloadController = new AbortController();
      const controller = downloadController;
      update();
      const progress = (label) => (p) => {
        if (context === c)
          ui.message.textContent = `${label}: ${p.done}/${p.count} · ${size(p.bytes)} / ${size(p.total)} · ${size(p.total - p.bytes)} remaining`;
      };
      try {
        await installShell(progress("Saving application"), controller.signal);
        session.check(c);
        if (controller.signal.aborted)
          throw Error("Download paused. Resume to continue.");
        await navigator.storage?.persist?.().catch(() => false);
        const lease = await packs.download(
          c,
          c.client,
          progress("Saving assigned study"),
          controller.signal,
        );
        session.check(c);
        if (context === c)
          ui.message.textContent = `Ready offline · ${lease.materials.length} materials · Access until ${new Date(lease.expires_at).toLocaleString()}. ${preview ? "Reopen this sample page without a connection." : "Reopen the offline study page or add it to your Home Screen."}`;
      } catch (e) {
        if (context === c) ui.message.textContent = e.message;
      } finally {
        if (downloadController === controller) downloadController = null;
        update();
      }
    };
    ui.pause.onclick = () => downloadController?.abort();
    ui.resume.onclick = () => {
      try {
        session.resume();
        view.refresh();
      } catch (e) {
        ui.message.textContent = e.message;
      }
    };
    ui.connect.onclick = () => {
      session.connect();
      view.refresh();
    };
    ui.sync.onclick = () => syncNow();
    ui.lock.onclick = () => {
      session.lock();
      ui.message.textContent =
        "Saved study is locked. Sign in online to reopen it. Your materials and work have been kept.";
    };
    ui.backup.onclick = async () => {
      const c = context;
      if (!c) return;
      try {
        const text = await sync.backup(c);
        session.check(c);
        const url = URL.createObjectURL(
            new Blob([text], { type: "application/json" }),
          ),
          a = el("a");
        a.href = url;
        a.download = "Commonplace-study-backup.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (e) {
        if (context === c) ui.message.textContent = e.message;
      }
    };
    const file = el("input");
    file.type = "file";
    file.accept = ".json,application/json";
    file.hidden = true;
    tools.append(file);
    ui.restore.onclick = () => file.click();
    file.onchange = async () => {
      const c = context,
        chosen = file.files?.[0];
      file.value = "";
      if (!c || !chosen) return;
      try {
        if (chosen.size > 8388608) throw Error("Study backup exceeds 8 MiB.");
        const count = await sync.restore(c, await chosen.text(), c.client);
        session.check(c);
        await view.refresh();
        ui.message.textContent = `Restored ${count} study record(s). Existing competing work has been kept for review.`;
      } catch (e) {
        if (context === c) ui.message.textContent = e.message;
      }
    };
    update();
  }
  const support = {
    identity: session,
    mount,
    clear() {
      context = null;
      materials = [];
      downloadController?.abort();
      if (ui) {
        ui.message.textContent = "";
        ui.conflicts.replaceChildren();
      }
      update();
    },
    async ready(c) {
      context = c;
      update();
      if (!c.offline) {
        if (await db.get("packs", ownedKey(c.userId, "office.excel")))
          try {
            await packs.renew(c, c.client);
          } catch (e) {
            if (context === c) ui.message.textContent = e.message;
          }
      } else
        ui.message.textContent = `Saved study for ${c.displayName || "your account"}. Administrative actions require internet access.`;
    },
    assignments(c, list) {
      if (context !== c) return;
      materials = list;
      syncNow();
    },
    async openRecords(c, m, id, client) {
      const records = await sync.open(c, m, id, client);
      return {
        ...records,
        ...Object.fromEntries(
          ["saveProgress", "saveNote", "saveBookmark"].map((key) => [
            key,
            async (value) => {
              try {
                return await records[key](value);
              } finally {
                schedule();
              }
            },
          ]),
        ),
      };
    },
  };
  view = mountLearningWorkspace(root, {
    client: null,
    store,
    enabled: true,
    preview,
    online,
    support,
  });
  return {
    refresh: view.refresh,
    session,
    packs,
    sync,
    db,
    dispose() {
      disposed = true;
      clearTimeout(summaryTimer);
      downloadController?.abort();
      view();
    },
  };
}
