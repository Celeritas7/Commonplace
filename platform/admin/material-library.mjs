import {
  MATERIAL_TYPES,
  validateMaterial,
  parseMaterial,
} from "../materials/contracts.mjs";
import { renderMaterial } from "../materials/render.mjs";
import { exampleBundle } from "../content/examples.mjs";
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
export function mountMaterialLibrary(
  root,
  api,
  directory,
  { onDirty = () => {}, onBusy = () => {}, onDenied = () => {} } = {},
) {
  let disposed = false,
    epoch = 0,
    busy = false,
    dirty = false,
    blocked = false,
    library = { versions: [], groups: [] },
    selected = null,
    snapshot = null,
    controls = {};
  const notice = el("p", "Loading the material library…", "notice");
  notice.setAttribute("role", "status");
  const body = el("div");
  root.append(notice, body);
  const sections = directory.sections.filter((s) => s.kind === "section"),
    members = directory.members.filter((m) => m.role === "learner");
  const blank = () => ({
    schema_version: 1,
    title: "",
    section_id:
      sections.find((s) => s.id === "office.excel")?.id ||
      sections[0]?.id ||
      "",
    material_type: "explanation",
    content: {
      format: "document",
      blocks: [
        { kind: "paragraph", text: "Explain the learning concept here." },
      ],
    },
  });
  let draft = blank();
  function sync() {
    for (const n of body.querySelectorAll("input,select,textarea,button"))
      n.disabled = busy;
    for (const n of body.querySelectorAll("[data-draft-field]"))
      n.disabled = busy || (!!snapshot && snapshot.state !== "draft");
    const saved = !!snapshot,
      editable = !saved || snapshot.state === "draft";
    if (controls.section) controls.section.disabled = busy || saved;
    if (controls.save) controls.save.disabled = busy || blocked || !editable;
    if (controls.publish)
      controls.publish.disabled =
        busy ||
        blocked ||
        dirty ||
        !saved ||
        snapshot.state !== "draft" ||
        !controls.review.checked ||
        snapshot.upload_pending ||
        (draft.content.format === "attachment" && !snapshot.asset);
    if (controls.upload)
      controls.upload.disabled =
        busy || blocked || dirty || !saved || !editable;
    if (controls.assign)
      controls.assign.disabled =
        busy || blocked || !saved || snapshot.state !== "published";
    for (const n of controls.audienceFields || [])
      n.disabled = busy || !saved || snapshot.state !== "published";
  }
  function lock(value) {
    busy = value;
    onBusy(value);
    sync();
  }
  function mark() {
    dirty = true;
    onDirty(true);
    if (controls.review) controls.review.checked = false;
    sync();
  }
  function error(e) {
    notice.textContent = e.message;
    notice.className = "notice error";
    if (e.code === "42501") onDenied();
  }
  function discard() {
    return !dirty || window.confirm("Discard unsaved material edits?");
  }
  async function reload(id = selected) {
    const request = ++epoch;
    lock(true);
    try {
      const [list, record] = await Promise.all([
        api.materials(),
        id ? api.material(id) : null,
      ]);
      if (disposed || request !== epoch) return;
      library = list;
      selected = id;
      snapshot = record;
      draft = record ? structuredClone(record.payload) : blank();
      dirty = false;
      blocked = false;
      onDirty(false);
      render();
      notice.className = "notice";
      notice.textContent =
        "Imports stay as drafts. Published materials require an explicit assignment and section permission.";
      return true;
    } catch (e) {
      if (!disposed && request === epoch) {
        blocked = true;
        error(e);
      }
      return false;
    } finally {
      if (!disposed && request === epoch) lock(false);
    }
  }
  async function perform(work, message, { download = false } = {}) {
    if (busy || blocked) return;
    const request = epoch;
    lock(true);
    try {
      const result = await work();
      if (disposed || request !== epoch) return;
      if (download) {
        const url = URL.createObjectURL(result),
          a = el("a");
        a.href = url;
        a.download = snapshot.asset.filename;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        dirty = false;
        onDirty(false);
        selected = typeof result === "string" ? result : selected;
        if (!(await reload(selected))) return;
      }
      if (!disposed) {
        notice.className = "notice";
        notice.textContent = message;
      }
    } catch (e) {
      if (!disposed && request === epoch) {
        blocked = true;
        error(e);
      }
    } finally {
      if (!disposed) lock(false);
    }
  }
  function render() {
    body.replaceChildren();
    controls = {};
    const toolbar = el("div", undefined, "profile-toolbar"),
      fresh = el("button", "New material", "secondary"),
      reloadButton = el("button", "Reload library", "secondary");
    fresh.onclick = () => {
      if (discard()) {
        selected = null;
        snapshot = null;
        draft = blank();
        dirty = false;
        blocked = false;
        onDirty(false);
        render();
      }
    };
    reloadButton.onclick = () => {
      if (discard()) reload();
    };
    toolbar.append(fresh, reloadButton);
    body.append(el("h2", "Material library"), toolbar);
    const layout = el("div", undefined, "material-layout"),
      list = el("aside", undefined, "material-list"),
      editor = el("section", undefined, "material-editor");
    const search = el("input");
    search.type = "search";
    search.placeholder = "Search materials";
    search.setAttribute("aria-label", "Search materials");
    list.append(search);
    const rows = el("div");
    list.append(rows);
    function listRows() {
      rows.replaceChildren();
      for (const v of library.versions.filter((v) =>
        `${v.title} ${v.section_id} ${v.state}`
          .toLowerCase()
          .includes(search.value.toLowerCase()),
      )) {
        const button = el(
          "button",
          `${v.title} · v${v.version} · ${v.state}`,
          "person",
        );
        button.setAttribute("aria-pressed", String(v.id === selected));
        button.classList.toggle("selected",v.id === selected);
        button.onclick = () => {
          if (discard()) reload(v.id);
        };
        rows.append(button);
      }
      if (!rows.childElementCount)
        rows.append(el("p", "No matching materials.", "muted"));
    }
    search.oninput = listRows;
    listRows();
    layout.append(list, editor);
    body.append(layout);
    editor.append(
      el(
        "h3",
        snapshot
          ? `Version ${snapshot.version} · ${snapshot.state}`
          : "Create a draft",
      ),
    );
    const form = el("form");
    function field(label, node) {
      const wrap = el("label", label);
      wrap.append(node);
      form.append(wrap);
      node.dataset.draftField = "";
      node.oninput = mark;
      node.onchange = mark;
      return node;
    }
    const title = field("Material title", el("input"));
    title.required = true;
    title.maxLength = 160;
    title.value = draft.title;
    const section = field("Material study section", el("select"));
    controls.section = section;
    for (const s of sections) {
      const option = el("option", s.title);
      option.value = s.id;
      section.append(option);
    }
    section.value = draft.section_id;
    const type = field("Material type", el("select"));
    for (const t of MATERIAL_TYPES) {
      const option = el("option", t.replaceAll("_", " "));
      option.value = t;
      type.append(option);
    }
    type.value = draft.material_type;
    const content = field("Structured content JSON", el("textarea"));
    content.rows = 12;
    content.value = JSON.stringify(draft.content, null, 2);
    content.spellcheck = false;
    const templates = el("div", undefined, "profile-toolbar");
    for (const [label, value] of [
      [
        "Text lesson",
        {
          format: "document",
          blocks: [
            { kind: "paragraph", text: "Explain the learning concept here." },
          ],
        },
      ],
      [
        "Excel SUM example",
        { format: "bundle", bundle: exampleBundle("trade") },
      ],
      ["Downloadable file", { format: "attachment" }],
    ]) {
      const b = el("button", label, "secondary");
      b.type = "button";
      b.dataset.draftField = "";
      b.onclick = () => {
        if (
          label === "Excel SUM example" &&
          snapshot &&
          section.value !== "office.excel"
        ) {
          error(
            Error("Create a new material in Excel Study to use this example."),
          );
          return;
        }
        if (
          dirty &&
          !window.confirm("Replace the content editor with this template?")
        )
          return;
        if (label === "Excel SUM example") section.value = "office.excel";
        content.value = JSON.stringify(value, null, 2);
        mark();
      };
      templates.append(b);
    }
    form.append(templates);
    const importLabel = el("label", "Import material JSON"),
      file = el("input");
    file.type = "file";
    file.accept = ".json,application/json";
    file.dataset.draftField = "";
    importLabel.append(file);
    form.append(importLabel);
    file.onchange = async () => {
      const chosen = file.files[0],
        request = epoch;
      if (!chosen) return;
      if (chosen.size > 262144) {
        error(Error("Import exceeds 256 KiB."));
        return;
      }
      if (
        dirty &&
        !window.confirm("Replace unsaved fields with this imported draft?")
      )
        return;
      try {
        const imported = parseMaterial(await chosen.text());
        if (disposed || request !== epoch) return;
        if (snapshot && imported.section_id !== snapshot.payload.section_id)
          throw Error("Import into a new material to change its section.");
        title.value = imported.title;
        section.value = imported.section_id;
        type.value = imported.material_type;
        content.value = JSON.stringify(imported.content, null, 2);
        mark();
        notice.textContent =
          "Import validated locally. Save a draft for server validation before publication.";
      } catch (e) {
        if (!disposed && request === epoch) error(e);
      }
    };
    const actions = el("div", undefined, "profile-toolbar"),
      preview = el("button", "Preview draft", "secondary"),
      save = el("button", "Save draft");
    preview.type = "button";
    save.type = "submit";
    controls.save = save;
    actions.append(preview, save);
    form.append(actions);
    editor.append(form);
    const previewRoot = el("div", undefined, "material-preview");
    editor.append(previewRoot);
    function read() {
      return validateMaterial({
        schema_version: 1,
        title: title.value,
        section_id: section.value,
        material_type: type.value,
        content: JSON.parse(content.value),
      });
    }
    preview.onclick = () => {
      try {
        draft = read();
        renderMaterial(previewRoot, draft);
        notice.textContent =
          "Preview only. Content and code are displayed as text and are not executed.";
      } catch (e) {
        error(e);
      }
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      try {
        const value = read();
        perform(
          () => api.saveMaterial(selected, snapshot?.revision || "0", value),
          "Draft saved. It is not available to learners.",
        );
      } catch (e) {
        error(e);
      }
    };
    if (draft.title) renderMaterial(previewRoot, draft);
    if (snapshot) {
      if (draft.content.format === "attachment") {
        editor.append(
          el(
            "p",
            "Up to 10 MiB: XLSX, static PDF, PNG/JPEG or TXT. Use English letters, numbers, spaces, hyphens or underscores in the filename.",
            "muted",
          ),
        );
        editor.append(
          el(
            "p",
            snapshot.asset
              ? `${snapshot.asset.filename} · ${snapshot.asset.bytes} bytes · validated`
              : "No validated file attached.",
            "muted",
          ),
        );
        const attachLabel = el("label", "Tutorial attachment"),
          attach = el("input");
        attach.type = "file";
        attach.accept = ".xlsx,.pdf,.png,.jpg,.jpeg,.txt";
        attach.dataset.draftField = "";
        attachLabel.append(attach);
        editor.append(attachLabel);
        const upload = el("button", "Validate & upload file", "secondary");
        controls.upload = upload;
        upload.onclick = () => {
          const f = attach.files[0];
          if (!f) {
            error(Error("Choose a tutorial file."));
            return;
          }
          perform(
            () => api.uploadMaterial(selected, snapshot.revision, f),
            "File validated and saved privately. Review it before publication.",
          );
        };
        editor.append(upload);
        if (snapshot.asset) {
          const download = el("button", "Download for review", "secondary");
          download.onclick = () =>
            perform(
              () => api.downloadMaterial(selected),
              "Downloaded for review.",
              { download: true },
            );
          editor.append(download);
        }
      }
      const reviewLabel = el("label", undefined, "leaf"),
        review = el("input");
      review.type = "checkbox";
      review.onchange = sync;
      controls.review = review;
      reviewLabel.append(
        review,
        el("span", "I reviewed this saved content and any attached file."),
      );
      editor.append(reviewLabel);
      const publish = el("button", "Publish reviewed version");
      controls.publish = publish;
      publish.onclick = () => {
        if (
          window.confirm(
            "Publish this reviewed version? Learners still need an explicit assignment and section access.",
          )
        )
          perform(
            () =>
              api.transitionMaterial(
                selected,
                snapshot.revision,
                "published",
                review.checked,
              ),
            "Version published. Choose recipients below.",
          );
      };
      editor.append(publish);
      const versionActions = el("div", undefined, "profile-toolbar"),
        copy = el("button", "Create next draft version", "secondary"),
        archive = el("button", "Archive version", "secondary");
      copy.onclick = () => {
        if (discard())
          perform(
            () => api.copyMaterial(selected, snapshot.revision),
            "A new draft version was created. Existing assignments keep their earlier version.",
          );
      };
      archive.onclick = () => {
        if (
          discard() &&
          window.confirm(
            "Archive this version and stop its authorized online access? Previously downloaded copies cannot be recalled.",
          )
        )
          perform(
            () =>
              api.transitionMaterial(
                selected,
                snapshot.revision,
                "archived",
                false,
              ),
            "Version archived.",
          );
      };
      versionActions.append(copy);
      if (snapshot.state !== "archived") versionActions.append(archive);
      editor.append(versionActions);
      const audience = el("fieldset");
      audience.append(
        el("legend", "Assignments"),
        el(
          "p",
          "Select individuals or profile groups. Exclusions override both. Group membership never grants section access.",
          "muted",
        ),
      );
      const inputs = {};
      controls.audienceFields = [];
      for (const [key, label, options] of [
        [
          "learners",
          "Assigned learners",
          members.map((m) => ({
            id: m.user_id,
            name: m.display_name || m.email,
          })),
        ],
        ["groups", "Assigned profile groups", library.groups],
        [
          "excluded",
          "Excluded learners",
          members.map((m) => ({
            id: m.user_id,
            name: m.display_name || m.email,
          })),
        ],
      ]) {
        const wrap = el("label", label),
          select = el("select");
        select.setAttribute("aria-label", label);
        select.multiple = true;
        select.size = Math.min(5, Math.max(2, options.length));
        for (const item of options) {
          const option = el("option", item.name);
          option.value = item.id;
          option.selected = snapshot.audience[key].includes(item.id);
          select.append(option);
        }
        select.onchange = mark;
        wrap.append(select);
        audience.append(wrap);
        inputs[key] = select;
        controls.audienceFields.push(select);
      }
      const releaseLabel = el("label", undefined, "leaf"),
        release = el("input");
      release.type = "checkbox";
      release.checked = snapshot.audience.release_answers;
      release.onchange = mark;
      releaseLabel.append(
        release,
        el("span", "Release answer sheets to these recipients"),
      );
      audience.append(releaseLabel);
      controls.audienceFields.push(release);
      const assign = el("button", "Save assignments");
      controls.assign = assign;
      assign.onclick = () => {
        const value = Object.fromEntries(
          Object.entries(inputs).map(([k, n]) => [
            k,
            [...n.selectedOptions].map((x) => x.value),
          ]),
        );
        value.release_answers = release.checked;
        if (value.learners.some((id) => value.excluded.includes(id))) {
          error(Error("A learner cannot be both assigned and excluded."));
          return;
        }
        if (window.confirm("Save this version’s assignments and exclusions?"))
          perform(
            () => api.assignMaterial(selected, snapshot.revision, value),
            "Assignments saved. Access also requires an active account and section permission.",
          );
      };
      audience.append(assign);
      editor.append(audience);
    }
    sync();
  }
  reload();
  return () => {
    disposed = true;
    epoch++;
    onDirty(false);
    onBusy(false);
    root.replaceChildren();
  };
}
