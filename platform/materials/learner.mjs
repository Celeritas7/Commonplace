import { validateMaterial, MATERIAL_TYPES } from "./contracts.mjs";
import { createAssignedContentAdapter } from "../content/assigned-content.mjs";
const check = (context) => {
  if (
    !context?.ticket ||
    context.ticket.owner !== context.userId ||
    context.ticket.signal.aborted
  )
    throw Error("Account changed.");
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const permitted = (context, section) =>
  context.sections.some((s) => s.id === section && s.kind === "section");
export async function listAssignedMaterials(client, context, sectionId) {
  check(context);
  if (!permitted(context, sectionId)) throw Error("Section is unavailable.");
  const request = client.rpc("cp_learner_materials", { section: sectionId });
  const result = await (request.abortSignal
    ? request.abortSignal(context.ticket.signal)
    : request);
  check(context);
  if (result.error || !Array.isArray(result.data) || result.data.length > 1000)
    throw Error("Assigned materials are unavailable.");
  const seen = new Set();
  for (const item of result.data) {
    if (
      !item ||
      Object.keys(item).sort().join() !== "id,material_type,title,version" ||
      !UUID.test(item.id) ||
      !Number.isSafeInteger(item.version) ||
      item.version < 1 ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      [...item.title].length > 160 ||
      !MATERIAL_TYPES.includes(item.material_type) ||
      seen.has(item.id)
    )
      throw Error("Invalid material catalogue.");
    seen.add(item.id);
  }
  return structuredClone(result.data);
}
function attachment(asset) {
  if (
    !asset ||
    Object.keys(asset).sort().join() !== "bytes,filename,mime,path,sha256" ||
    !Number.isInteger(asset.bytes) ||
    asset.bytes < 1 ||
    asset.bytes > 10485760 ||
    typeof asset.filename !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,119}\.(xlsx|pdf|png|jpg|jpeg|txt)$/.test(
      asset.filename,
    ) ||
    ![
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/pdf",
      "image/png",
      "image/jpeg",
      "text/plain",
    ].includes(asset.mime) ||
    typeof asset.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(asset.sha256) ||
    typeof asset.path !== "string" ||
    asset.path.split("/").length !== 2 ||
    !asset.path.split("/").every((x) => UUID.test(x))
  )
    throw Error("Invalid tutorial attachment.");
}
export async function readAssignedMaterial(client, context, id) {
  check(context);
  if (!UUID.test(id)) throw Error("Invalid material ID.");
  const request = client.rpc("cp_read_material", { target: id });
  const result = await (request.abortSignal
    ? request.abortSignal(context.ticket.signal)
    : request);
  check(context);
  if (
    result.error ||
    result.data?.id !== id ||
    result.data?.owner_id !== context.userId ||
    !Number.isSafeInteger(result.data.version) ||
    result.data.version < 1 ||
    result.data.publication_state !== "published"
  )
    throw Error("Assigned material is unavailable.");
  const payload = validateMaterial(result.data.payload);
  if (payload.content.format === "attachment") attachment(result.data.asset);
  if (
    !context.sections.some(
      (s) => s.id === payload.section_id && s.kind === "section",
    )
  )
    throw Error("Section is unavailable.");
  return { ...result.data, payload };
}
export function createMaterialLessonAdapter(client, sectionId, capabilities) {
  return async (context, versionId) =>
    lessonFromMaterial(
      context,
      await readAssignedMaterial(client, context, versionId),
      sectionId,
      capabilities,
    );
}
// Compose a material just read by the central API without downloading its JSON
// again. This validates a response; server authorization still belongs to RPCs.
export function lessonFromMaterial(context, m, sectionId, capabilities) {
  check(context);
  if (m.payload.section_id !== sectionId) throw Error("Section mismatch.");
  return createAssignedContentAdapter({
    sectionId,
    capabilities,
    loadAuthorizedBundle: async () => {
      if (m.payload.content.format !== "bundle")
        throw Error("A lesson bundle is required.");
      const bundle = m.payload.content.bundle;
      // Stable per-version logical assignment; individual/group changes do not reset
      // progress. Server RPC has already evaluated the current effective assignment.
      return {
        owner_id: m.owner_id,
        publication_state: m.publication_state,
        bundle,
        assignment: {
          schema_version: 1,
          kind: "assignment",
          id: "material." + m.id,
          version: 1,
          section_id: sectionId,
          lesson_ref: {
            id: bundle.lesson.id,
            version: bundle.lesson.version,
          },
          status: "assigned",
        },
      };
    },
  })(context, "material." + m.id);
}
export async function downloadAssignedMaterial(client, context, id) {
  await readAssignedMaterial(client, context, id);
  check(context);
  const result = await client.functions.invoke("material-files", {
    body: {},
    headers: { "x-cp-action": "download", "x-cp-version": id },
  });
  check(context);
  if (result.error || !(result.data instanceof Blob))
    throw Error("Authorized download unavailable.");
  return result.data;
}
