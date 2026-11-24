import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readAssignedMaterial,
  createMaterialLessonAdapter,
  downloadAssignedMaterial,
} from "../materials/learner.mjs";
import { EXCEL_PHASE_A_CAPABILITIES } from "../content/excel-contract.mjs";
import { exampleBundle } from "../content/examples.mjs";
const id = "10000000-0000-4000-8000-000000000010";
function fixture() {
  const abort = new AbortController(),
    context = {
      userId: "a",
      ticket: { owner: "a", signal: abort.signal },
      sections: [{ id: "office.excel", kind: "section" }],
    };
  const row = {
    id,
    owner_id: "a",
    publication_state: "published",
    version: 1,
    payload: {
      schema_version: 1,
      section_id: "office.excel",
      title: "SUM",
      material_type: "example",
      content: { format: "bundle", bundle: exampleBundle("trade") },
    },
  };
  const f = { row, context, abort, hold: null, error: null };
  f.client = {
    async rpc(name, args) {
      assert.equal(name, "cp_read_material");
      assert.equal(args.target, id);
      if (f.hold) await f.hold;
      return { data: row, error: f.error };
    },
    functions: {
      async invoke() {
        return { data: new Blob(["file"]) };
      },
    },
  };
  return f;
}
test("authorized central material composes the existing U4 lesson contract", async () => {
  const f = fixture();
  const result = await createMaterialLessonAdapter(
    f.client,
    "office.excel",
    EXCEL_PHASE_A_CAPABILITIES,
  )(f.context, id);
  assert.equal(result.assignment.id, "material." + id);
  assert.equal(result.bundle.scenario.id, "scenario.trade");
});
test("learner adapter rejects unpublished, wrong-owner, wrong-ID, denied sections and stale operations", async () => {
  for (const change of [
    (f) => (f.row.publication_state = "draft"),
    (f) => (f.row.owner_id = "b"),
    (f) => (f.row.id = "different"),
    (f) => (f.context.sections = []),
    (f) => (f.error = { code: "42501" }),
  ]) {
    const f = fixture();
    change(f);
    await assert.rejects(() => readAssignedMaterial(f.client, f.context, id));
  }
  const f = fixture();
  let done;
  f.hold = new Promise((r) => (done = r));
  const pending = downloadAssignedMaterial(f.client, f.context, id);
  f.abort.abort();
  done();
  await assert.rejects(() => pending, /Account changed/);
});
