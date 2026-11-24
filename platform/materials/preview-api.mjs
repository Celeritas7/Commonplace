import { validateMaterial } from "./contracts.mjs";
// Synthetic memory model for reviewing the UI. Never a security implementation.
export function materialPreviewAPI(getGroups) {
  const rows = [];
  const find = (id, revision) => {
    const r = rows.find((x) => x.id === id);
    if (!r || (revision !== undefined && r.revision !== revision))
      throw Object.assign(Error("Material changed. Reload."), {
        code: "40001",
      });
    return r;
  };
  const audience = () => ({
    learners: [],
    groups: [],
    excluded: [],
    release_answers: false,
  });
  return {
    async materials() {
      return {
        groups: structuredClone(getGroups()),
        versions: rows.map((r) => ({
          id: r.id,
          material_id: r.material_id,
          version: r.version,
          title: r.payload.title,
          section_id: r.payload.section_id,
          material_type: r.payload.material_type,
          state: r.state,
          revision: r.revision,
        })),
      };
    },
    async material(id) {
      return structuredClone(find(id));
    },
    async saveMaterial(id, revision, payload) {
      validateMaterial(payload);
      if (id) {
        const r = find(id, revision);
        if (r.state !== "draft") throw Error("Draft required.");
        r.payload = structuredClone(payload);
        r.revision = String(Number(r.revision) + 1);
        return id;
      }
      id = crypto.randomUUID();
      rows.unshift({
        id,
        material_id: crypto.randomUUID(),
        version: 1,
        revision: "1",
        state: "draft",
        payload: structuredClone(payload),
        asset: null,
        upload_pending: false,
        audience: audience(),
      });
      return id;
    },
    async copyMaterial(id, revision) {
      const r = find(id, revision),
        copy = structuredClone(r);
      copy.id = crypto.randomUUID();
      copy.version =
        Math.max(
          ...rows
            .filter((x) => x.material_id === r.material_id)
            .map((x) => x.version),
        ) + 1;
      copy.state = "draft";
      copy.revision = "1";
      copy.audience = audience();
      rows.unshift(copy);
      return copy.id;
    },
    async transitionMaterial(id, revision, state, reviewed) {
      const r = find(id, revision);
      if (
        state === "published" &&
        (r.state !== "draft" ||
          !reviewed ||
          (r.payload.content.format === "attachment" && !r.asset))
      )
        throw Error("Review a complete draft.");
      r.state = state;
      r.revision = String(Number(r.revision) + 1);
    },
    async assignMaterial(id, revision, values) {
      const r = find(id, revision);
      if (r.state !== "published") throw Error("Publish first.");
      r.audience = structuredClone(values);
      r.revision = String(Number(r.revision) + 1);
    },
    async uploadMaterial() {
      throw Error(
        "Private file uploads require the approved backend. This public preview does not store your files.",
      );
    },
    async downloadMaterial() {
      throw Error("No private file service is connected in this preview.");
    },
  };
}
