import { validateMaterial } from "./contracts.mjs";
import { createAssignedContentAdapter } from "../content/assigned-content.mjs";
const check = (context) => {
  if (
    !context?.ticket ||
    context.ticket.owner !== context.userId ||
    context.ticket.signal.aborted
  )
    throw Error("Account changed.");
};
export async function readAssignedMaterial(client, context, id) {
  check(context);
  const result = await client.rpc("cp_read_material", { target: id });
  check(context);
  if (
    result.error ||
    result.data?.id !== id ||
    result.data?.owner_id !== context.userId ||
    result.data.publication_state !== "published"
  )
    throw Error("Assigned material is unavailable.");
  const payload = validateMaterial(result.data.payload);
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
    createAssignedContentAdapter({
      sectionId,
      capabilities,
      loadAuthorizedBundle: async () => {
        const m = await readAssignedMaterial(client, context, versionId);
        if (m.payload.content.format !== "bundle")
          throw Error("A lesson bundle is required.");
        const bundle = m.payload.content.bundle;
        // Stable per-version logical assignment; individual/group changes do not reset
        // progress. Server RPC has already evaluated the current effective assignment.
        return {
          owner_id: context.userId,
          publication_state: "published",
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
    })(context, "material." + versionId);
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
