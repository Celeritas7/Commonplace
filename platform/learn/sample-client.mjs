import { exampleBundle } from "../content/examples.mjs";
import { IMPORT_EXPORT_BEGINNER } from "../lib/learning-profile.mjs";
// Public synthetic fixtures only. Never imported by the live bootstrap and
// never used as a fallback after an authorization/network failure.
export async function createSampleClient() {
  const owner = "10000000-0000-4000-8000-000000000002";
  const ids = {
    sum: "20000000-0000-4000-8000-000000000001",
    quiz: "20000000-0000-4000-8000-000000000002",
    file: "20000000-0000-4000-8000-000000000003",
    answers: "20000000-0000-4000-8000-000000000004",
  };
  const fileText =
    "Inventory practice\nUsed cameras: 12\nAudio players: 8\nKitchen appliances: 5\nIn Excel, enter these quantities in B2:B4 and calculate their total in B5.\n";
  const bytes = new TextEncoder().encode(fileText),
    hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
  const material = (id, title, type, content, asset = null) => ({
    id,
    version: 1,
    publication_state: "published",
    payload: {
      schema_version: 1,
      section_id: "office.excel",
      title,
      material_type: type,
      content,
    },
    asset,
  });
  const items = new Map([
    [
      ids.sum,
      material(ids.sum, "Prepare a shipment to Manila", "guided_exercise", {
        format: "bundle",
        bundle: exampleBundle("trade"),
      }),
    ],
    [
      ids.quiz,
      material(ids.quiz, "Check your SUM knowledge", "quiz", {
        format: "document",
        blocks: [
          {
            kind: "paragraph",
            text: "Use what you learned in the inventory worksheet.",
          },
          {
            kind: "question",
            text: "Which formula adds the three quantities?",
            choices: ["=SUM(B2:B4)", "=SUM(A2:A4)", "=B2"],
          },
        ],
      }),
    ],
    [
      ids.file,
      material(
        ids.file,
        "Inventory practice file",
        "tutorial",
        { format: "attachment" },
        {
          filename: "Inventory-practice.txt",
          mime: "text/plain",
          bytes: bytes.length,
          sha256: hash,
          path: ids.file + "/30000000-0000-4000-8000-000000000001",
        },
      ),
    ],
    [
      ids.answers,
      material(ids.answers, "SUM answer sheet", "answer_sheet", {
        format: "document",
        blocks: [
          {
            kind: "paragraph",
            text: "The range B2:B4 contains the three quantities. SUM adds them.",
          },
        ],
      }),
    ],
  ]);
  const state = {
    userId: owner,
    role: "learner",
    status: "active",
    sections: [
      { id: "office", kind: "hub", parent_id: null, title: "Office Work" },
      {
        id: "office.excel",
        kind: "section",
        parent_id: "office",
        title: "Excel Study",
      },
    ],
    profile: structuredClone(IMPORT_EXPORT_BEGINNER),
    items,
    allowed: new Set([ids.sum, ids.quiz, ids.file]),
    hooks: {},
    calls: [],
    ids,
  };
  const listeners = new Set();
  const active = () => !!state.userId && state.status === "active";
  const allowed = (id) =>
    active() &&
    state.allowed.has(id) &&
    state.items.get(id)?.publication_state === "published" &&
    state.sections.some(
      (s) =>
        s.id === state.items.get(id)?.payload.section_id &&
        s.kind === "section",
    );
  const denied = () => ({ error: { code: "42501" }, data: null });
  const client = {
    auth: {
      onAuthStateChange(fn) {
        listeners.add(fn);
        return {
          data: {
            subscription: {
              unsubscribe() {
                listeners.delete(fn);
              },
            },
          },
        };
      },
      async getUser() {
        const id = state.userId;
        await state.hooks.verify?.();
        return { data: { user: id ? { id } : null } };
      },
    },
    from(table) {
      let target;
      return {
        select() {
          return this;
        },
        eq(_, value) {
          target = value;
          return this;
        },
        abortSignal() {
          return this;
        },
        async maybeSingle() {
          await state.hooks[table]?.();
          if (!active() || target !== state.userId) return { data: null };
          if (table === "cp_memberships")
            return {
              data: {
                user_id: target,
                role: state.role,
                status: state.status,
                display_name: "Sample learner",
              },
            };
          if (table === "cp_learning_profiles")
            return { data: { profile: structuredClone(state.profile) } };
          throw Error("Unexpected sample table");
        },
        async order() {
          return { data: active() ? structuredClone(state.sections) : [] };
        },
      };
    },
    async rpc(name, args) {
      state.calls.push(name);
      await state.hooks[name]?.(args);
      if (name === "cp_learner_materials")
        return {
          data: [...state.items.values()]
            .filter(
              (m) => m.payload.section_id === args.section && allowed(m.id),
            )
            .map((m) => ({
              id: m.id,
              title: m.payload.title,
              material_type: m.payload.material_type,
              version: m.version,
            })),
        };
      if (name === "cp_read_material")
        return allowed(args.target)
          ? {
              data: {
                ...structuredClone(state.items.get(args.target)),
                owner_id: state.userId,
              },
            }
          : denied();
      throw Error("Unexpected sample operation");
    },
    functions: {
      async invoke(name, { headers }) {
        state.calls.push(name);
        const id = headers["x-cp-version"];
        await state.hooks.download?.();
        if (
          name !== "material-files" ||
          headers["x-cp-action"] !== "download" ||
          id !== ids.file ||
          !allowed(id)
        )
          return denied();
        return {
          data: new Blob([fileText], { type: "application/octet-stream" }),
        };
      },
    },
  };
  state.emit = (event, id = state.userId) => {
    state.userId = event === "SIGNED_OUT" ? null : id;
    for (const fn of listeners)
      fn(event, state.userId ? { user: { id: state.userId } } : null);
  };
  return { client, state };
}
