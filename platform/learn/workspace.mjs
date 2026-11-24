import { createLearnerContext } from "../lib/learner-context.mjs";
import { readLearnerProfile } from "../lib/learner-profile.mjs";
import { mountLearnerNavigation } from "../lib/learner-navigation.mjs";
import {
  listAssignedMaterials,
  readAssignedMaterial,
  lessonFromMaterial,
  downloadAssignedMaterial,
} from "../materials/learner.mjs";
import { EXCEL_PHASE_A_CAPABILITIES } from "../content/excel-contract.mjs";
import {
  studyIdentity,
  openStudyRecords,
  initialAttempt,
} from "./progress.mjs";
import { mountMaterialReader } from "./reader.mjs";
import { mountAssignedExcel } from "../../Office_work/Excel_study/assigned-lesson.mjs";
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
// This is an opt-in host for the central foundation, not a replacement for the
// legacy gate/PWAs. The server grants access; route/query/state never grant it.
export function mountLearningWorkspace(
  root,
  {
    client,
    store,
    enabled = false,
    preview = false,
    persistent = true,
    online = () => navigator.onLine,
    route = new URL(location.href),
    support = null,
  } = {},
) {
  const identity =
    support?.identity || createLearnerContext({ enabled, client, store });
  let disposed = false,
    epoch = 0,
    viewEpoch = 0,
    context = null,
    selected = null,
    sectionId = route.searchParams.get("section") || null,
    disposeMaterial = null,
    stopAbort = null;
  const requested = route.searchParams.get("material");
  const urls = new Set();
  root.innerHTML =
    '<header class="learn-header"><span class="learn-brand">C <span>COMMONPLACE</span></span><span data-mode></span></header><main class="learn-main"><div class="learn-heading"><div><p class="learn-eyebrow">YOUR LEARNING</p><h1>Learning workspace</h1></div><button data-reload class="learn-secondary">Refresh access</button></div><p data-notice role="status" aria-live="polite"></p><div data-private></div></main>';
  const area = root.querySelector("[data-private]"),
    notice = root.querySelector("[data-notice]"),
    reload = root.querySelector("[data-reload]");
  if (support?.mount) {
    const tools = el("div");
    area.before(tools);
    support.mount(tools);
  }
  root.querySelector("[data-mode]").textContent = preview
    ? "SAMPLE PREVIEW · NO ACCOUNT"
    : "ASSIGNED STUDY";
  const say = (text, error = false) => {
    notice.textContent = text;
    notice.className = error ? "learn-notice learn-error" : "learn-notice";
  };
  function clear() {
    support?.clear?.();
    viewEpoch++;
    disposeMaterial?.();
    disposeMaterial = null;
    area.replaceChildren();
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
    root.querySelector("h1").textContent = "Learning workspace";
  }
  function cancel(message) {
    epoch++;
    stopAbort?.();
    stopAbort = null;
    clear();
    context = null;
    identity.invalidate();
    reload.disabled = false;
    say(message, true);
  }
  function active(c, request, view) {
    return (
      !disposed &&
      context === c &&
      !c.ticket.signal.aborted &&
      epoch === request &&
      (view === undefined || viewEpoch === view)
    );
  }
  async function refresh() {
    if (disposed) return;
    if (!online() && !support?.identity.canResumeOffline()) {
      cancel(
        "Connect to the internet to open assigned materials. Your saved work has been kept.",
      );
      return;
    }
    stopAbort?.();
    stopAbort = null;
    const request = ++epoch;
    clear();
    context = null;
    reload.disabled = true;
    say("Checking your account and study access…");
    try {
      const c = await identity.refresh();
      if (disposed || request !== epoch) return;
      if (!online() && !c.offline) {
        cancel(
          "Connect to the internet to open assigned materials. Your saved work has been kept.",
        );
        return;
      }
      context = c;
      const source = c.client || client;
      const invalidated = () => {
        if (context === c && !disposed) {
          epoch++;
          selected = null;
          clear();
          context = null;
          reload.disabled = false;
          say("Account changed. Refresh access to continue.", true);
        }
      };
      c.ticket.signal.addEventListener("abort", invalidated, { once: true });
      stopAbort = () =>
        c.ticket.signal.removeEventListener("abort", invalidated);
      await support?.ready?.(c);
      if (!active(c, request)) return;
      const connected = c.sections.filter(
        (s) => s.kind === "section" && s.id === "office.excel",
      );
      const navigation = el("nav");
      navigation.setAttribute("aria-label", "Your study sections");
      navigation.className = "learn-actions";
      area.append(navigation);
      if (sectionId && !connected.some((s) => s.id === sectionId)) {
        say("This study section is unavailable for your account.", true);
        if (c.role === "administrator") addAdmin(navigation, c);
        return;
      }
      if (!connected.length) {
        say(
          c.sections.some((s) => s.kind === "section")
            ? "Your authorized sections are not connected to this workspace yet."
            : "No study sections have been assigned yet.",
        );
        if (c.role === "administrator") addAdmin(navigation, c);
        return;
      }
      let landing = null;
      mountLearnerNavigation(
        navigation,
        { ...c, sections: connected },
        {
          openSection: (id) => {
            landing = id;
          },
          openAdmin:
            c.role === "administrator"
              ? () => {
                  if (active(c, request))
                    location.href = new URL(
                      "../admin/index.html",
                      import.meta.url,
                    ).href;
                }
              : undefined,
        },
      );
      // Only connected, authorized leaves are rendered. A one-section learner
      // opens directly, without an Office/Coding hub or links to public lessons.
      sectionId = sectionId || landing || connected[0].id;
      for (const button of navigation.querySelectorAll("[data-section]"))
        button.onclick = () => {
          sectionId = button.dataset.section;
          selected = null;
          refresh();
        };
      const [profile, materials] = await Promise.all([
        readLearnerProfile(source, c),
        listAssignedMaterials(source, c, sectionId),
      ]);
      if (!active(c, request)) return;
      support?.assignments?.(c, materials);
      render(c, profile.profile, materials, request);
    } catch (error) {
      if (!disposed && request === epoch)
        cancel(
          support && !online()
            ? error.message
            : "Study access could not be verified. Reconnect or sign in through Commonplace, then refresh access.",
        );
    } finally {
      if (!disposed && request === epoch) reload.disabled = false;
    }
  }
  function addAdmin(parent, c) {
    const button = el("a", "Admin Studio", "learn-link");
    button.href = new URL("../admin/index.html", import.meta.url).href;
    button.onclick = (e) => {
      if (context !== c || c.ticket.signal.aborted) e.preventDefault();
    };
    parent.append(button);
  }
  function render(c, profile, materials, request) {
    root.querySelector("h1").textContent = "Excel Study";
    const focus = el("details", undefined, "learn-profile"),
      summary = el("summary", "Your learning focus");
    focus.append(summary);
    if (profile.occupation) focus.append(el("p", profile.occupation));
    const goals = el("ul");
    for (const goal of profile.learning_objectives || [])
      goals.append(el("li", goal));
    if (goals.childElementCount) focus.append(goals);
    const preferences = [
      profile.difficulty,
      profile.preferred_language,
      (profile.currencies_units || []).join(" · "),
    ].filter(Boolean);
    if (preferences.length) focus.append(el("p", preferences.join(" · ")));
    if (!focus.querySelector("p,li"))
      focus.append(
        el(
          "p",
          "Your administrator can add learning objectives and professional context.",
        ),
      );
    area.append(focus);
    const layout = el("div", undefined, "learn-layout"),
      aside = el("aside", undefined, "learn-panel learn-library"),
      reader = el("section", undefined, "learn-panel learn-reader");
    reader.setAttribute("aria-label", "Selected material");
    aside.append(
      el("h2", "Assigned materials"),
      el("p", `${materials.length} available`, "learn-muted"),
    );
    const list = el("div");
    aside.append(list);
    layout.append(aside, reader);
    area.append(layout);
    if (!materials.length) {
      reader.append(
        el(
          "p",
          "Your administrator has not assigned any published materials here yet.",
        ),
      );
      say("Your study access is current.");
      return;
    }
    for (const item of materials) {
      const button = el("button");
      button.type = "button";
      button.className = "learn-material";
      button.dataset.material = item.id;
      button.append(
        el("strong", item.title),
        el(
          "span",
          `${item.material_type.replaceAll("_", " ")} · v${item.version}`,
        ),
      );
      button.onclick = () => open(item.id);
      list.append(button);
    }
    async function open(id) {
      if (!active(c, request)) return;
      const view = ++viewEpoch;
      disposeMaterial?.();
      disposeMaterial = null;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
      reader.replaceChildren(el("p", "Opening assigned material…"));
      selected = id;
      for (const button of list.children)
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.material === id),
        );
      try {
        const material = await readAssignedMaterial(c.client || client, c, id);
        if (!active(c, request, view)) return;
        if (material.payload.section_id !== sectionId)
          throw Error("Section mismatch");
        // Compose only the freshly authorized U6 response. Never fall back to
        // public fixtures or re-download the same lesson for its worksheet model.
        const lesson =
          material.payload.content.format === "bundle"
            ? await lessonFromMaterial(
                c,
                material,
                sectionId,
                EXCEL_PHASE_A_CAPABILITIES,
              )
            : null;
        if (!active(c, request, view)) return;
        const key = await studyIdentity(material, lesson);
        if (!active(c, request, view)) return;
        let records,
          attempt = initialAttempt(material),
          note = "",
          bookmarked = false,
          savedError = "";
        try {
          records = support
            ? await support.openRecords(c, material, key, c.client || client)
            : openStudyRecords(store, c, material, key);
          if (!active(c, request, view)) return;
          attempt = records.state;
          note = records.note;
          bookmarked = records.bookmarked;
        } catch {
          savedError =
            "Existing saved work could not be restored. It has been kept; new changes will not be saved until this is resolved.";
        }
        reader.replaceChildren();
        reader.append(
          el(
            "p",
            `${material.payload.material_type.replaceAll("_", " ")} · Version ${material.version}`,
            "learn-eyebrow",
          ),
          el("h2", material.payload.title),
        );
        const content = el("div", undefined, "learn-content"),
          status = el("p");
        status.setAttribute("role", "status");
        status.className = "learn-save-status";
        const complete = el(
          "p",
          attempt.completed ? "Studied" : "In progress",
          "learn-completion",
        );
        reader.append(complete, content, status);
        async function saved(work) {
          if (!active(c, request, view)) return;
          try {
            if (!records) throw Error(savedError);
            await work();
            if (!active(c, request, view)) return;
            status.textContent = support
              ? "Saved on this device. Check synchronization status above."
              : persistent
                ? "Saved on this device for your account. Cloud sync is not active yet."
                : "Sample changes stay in memory and reset when this preview is reloaded.";
            status.className = "learn-save-status";
          } catch (error) {
            if (!active(c, request, view)) return;
            status.textContent =
              savedError ||
              (support
                ? error.message
                : "Changes could not be saved on this device. Keep this page open and copy any important notes.");
            status.className = "learn-save-status learn-error";
          }
        }
        const change = (value) => {
          if (!active(c, request, view)) return;
          attempt = value;
          complete.textContent = value.completed ? "Studied" : "In progress";
          saved(() => records.saveProgress(value));
        };
        if (attempt.worksheet) {
          disposeMaterial = mountAssignedExcel(content, lesson.bundle, {
            state: attempt.worksheet,
            onChange: (worksheet) =>
              change({ ...attempt, worksheet, completed: worksheet.applied }),
          });
        } else
          disposeMaterial = mountMaterialReader(content, material, {
            state: structuredClone(attempt),
            onChange: change,
            download: async () => {
              try {
                say("Checking permission and downloading your tutorial…");
                const blob = await downloadAssignedMaterial(
                  c.client || client,
                  c,
                  id,
                );
                if (!active(c, request, view)) return;
                const url = URL.createObjectURL(blob);
                urls.add(url);
                const link = el("a");
                link.href = url;
                link.download = material.asset.filename;
                document.body.append(link);
                link.click();
                link.remove();
                setTimeout(() => {
                  URL.revokeObjectURL(url);
                  urls.delete(url);
                }, 10000);
                say(
                  "Download started. Already downloaded copies remain on your device.",
                );
              } catch {
                if (active(c, request, view))
                  cancel(
                    "The authorized download is unavailable. Refresh access before trying again.",
                  );
              }
            },
          });
        const personal = el("section", undefined, "learn-personal"),
          bookmark = el("button", bookmarked ? "Bookmarked" : "Bookmark");
        bookmark.type = "button";
        bookmark.className = "learn-secondary";
        bookmark.setAttribute("aria-pressed", String(bookmarked));
        bookmark.onclick = () => {
          if (!active(c, request, view)) return;
          bookmarked = !bookmarked;
          bookmark.textContent = bookmarked ? "Bookmarked" : "Bookmark";
          bookmark.setAttribute("aria-pressed", String(bookmarked));
          saved(() => records.saveBookmark(bookmarked));
        };
        const label = el("label", "Your notes"),
          notes = el("textarea");
        notes.rows = 4;
        notes.maxLength = 4000;
        notes.value = note;
        notes.setAttribute("aria-label", "Your notes");
        notes.oninput = () => saved(() => records.saveNote(notes.value));
        label.append(notes);
        personal.append(bookmark, label);
        reader.append(personal);
        status.textContent =
          savedError ||
          (persistent
            ? "Progress, bookmarks and notes are saved on this device for your account."
            : "Sample work is kept in memory only.");
        if (savedError) status.className += " learn-error";
        say(
          c.offline
            ? `Studying saved assignments. Connect before ${new Date(c.expiresAt).toLocaleString()} to renew offline access.`
            : support
              ? "Your current assigned materials are available. Use Study offline to save them."
              : "Assigned materials currently require an internet connection.",
        );
      } catch {
        if (active(c, request, view))
          cancel(
            "This assigned material is unavailable or unsupported. Refresh access to load your current assignments.",
          );
      }
    }
    const target = selected || requested || materials[0].id;
    if (materials.some((m) => m.id === target)) open(target);
    else {
      reader.append(
        el(
          "p",
          "The requested material is unavailable. Choose one of your assigned materials.",
        ),
      );
      say("Your current assignments are shown.");
    }
  }
  const onOffline = () => {
    if (support) {
      support.identity.transitionOffline();
      refresh();
      return;
    }
    cancel(
      "Connect to the internet to open assigned materials. Your saved work has been kept.",
    );
  };
  const onOnline = () => {
    support?.identity.connect();
    refresh();
  };
  const onFocus = () => {
    if (document.visibilityState === "visible" && !reload.disabled) refresh();
  };
  const onHidden = () => {
    if (document.visibilityState === "hidden")
      cancel("Refresh access to resume your assigned study.");
    else refresh();
  };
  const onPageHide = () =>
    cancel("Refresh access to resume your assigned study.");
  const onPageShow = (event) => {
    if (event.persisted) refresh();
  };
  reload.onclick = () => refresh();
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  refresh();
  const dispose = () => {
    disposed = true;
    epoch++;
    stopAbort?.();
    clear();
    identity.dispose();
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    root.replaceChildren();
  };
  dispose.refresh = refresh;
  return dispose;
}
