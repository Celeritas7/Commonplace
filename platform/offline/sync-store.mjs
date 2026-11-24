import { canonical, digest } from "./lease.mjs";
import { ownedKey } from "./database.mjs";
import {
  initialAttempt,
  validateAttempt,
  studyIdentity,
} from "../learn/progress.mjs";
import {
  readAssignedMaterial,
  lessonFromMaterial,
} from "../materials/learner.mjs";
import { EXCEL_PHASE_A_CAPABILITIES } from "../content/excel-contract.mjs";
const same = (a, b) => canonical(a) === canonical(b);
const revision = (r) =>
  typeof r === "string" && /^(0|[1-9][0-9]{0,18})$/.test(r);
function valueFor(kind, value, material) {
  if (kind === "progress") return validateAttempt(value, material);
  if (
    !value ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    value.version !== 1
  )
    throw Error("Invalid saved work");
  if (
    kind === "note" &&
    (Object.keys(value).sort().join() !== "text,version" ||
      typeof value.text !== "string" ||
      value.text.length > 4000)
  )
    throw Error("Invalid note");
  if (
    kind === "bookmark" &&
    (Object.keys(value).sort().join() !== "bookmarked,version" ||
      typeof value.bookmarked !== "boolean")
  )
    throw Error("Invalid bookmark");
  return structuredClone(value);
}
export function createSyncStore({
  db,
  store,
  namespace,
  online = () => navigator.onLine,
  notify = () => {},
  denied = () => {},
}) {
  const inflight = new Map();
  const check = (c) => {
    const t = store.ticket();
    if (
      t.owner !== c.userId ||
      t.signal !== c.ticket.signal ||
      t.signal.aborted
    )
      throw Error("Account changed");
  };
  const key = (c, i) => ownedKey(c.userId, i.section, i.kind, i.id);
  const isOwner = (row, c) =>
    row.data?.owner === c.userId && row.key === key(c, row.data.identity);
  function response(r) {
    if (
      !r ||
      !revision(r.revision) ||
      (r.value !== null &&
        (!r.value || typeof r.value !== "object" || Array.isArray(r.value)))
    )
      throw Error("Invalid synchronization response");
    return r;
  }
  async function sync(c, client, k) {
    check(c);
    if (c.offline || !online()) return;
    if (inflight.get(k)?.signal === c.ticket.signal)
      return inflight.get(k).task;
    const task = (async () => {
      const entry = await db.get("study", k);
      check(c);
      if (!entry || entry.owner !== c.userId || entry.conflicts.length) return;
      const args = {
        expected_owner: c.userId,
        target: entry.material,
        section: entry.identity.section,
        record: entry.identity.id,
        record_kind: entry.identity.kind,
      };
      let current = entry;
      if (entry.dirty || entry.pending) {
        current = await db.update("study", k, (e) => {
          if (!e.pending)
            e.pending = {
              id: crypto.randomUUID(),
              value: structuredClone(e.value),
              revision: e.base_revision,
              local_version: e.local_version,
            };
          return e;
        });
        check(c);
        const p = current.pending;
        const result = await client.rpc("cp_sync_write", {
          ...args,
          expected_revision: p.revision,
          operation: p.id,
          new_value: p.value,
        });
        check(c);
        if (result.error) {
          if (result.error.code === "42501") denied();
          throw Error("Sync unavailable; saved work remains on this device.");
        }
        const remote = response(result.data);
        if (!["saved", "conflict"].includes(remote.status))
          throw Error("Invalid sync status");
        await db.update("study", k, (e) => {
          if (e.pending?.id !== p.id) return e;
          e.pending = null;
          if (remote.status === "saved") {
            if (!same(remote.value, p.value))
              throw Error("Saved response mismatch");
            e.base_revision = remote.revision;
            e.base_value = remote.value;
            e.dirty = !same(e.value, remote.value);
          } else if (same(e.value, remote.value)) {
            e.base_revision = remote.revision;
            e.base_value = remote.value;
            e.dirty = false;
          } else
            e.conflicts.push({
              id: crypto.randomUUID(),
              source: "cloud",
              value: remote.value,
              revision: remote.revision,
            });
          return e;
        });
      } else {
        const result = await client.rpc("cp_sync_read", args);
        check(c);
        if (result.error) {
          if (result.error.code === "42501") denied();
          throw Error("Sync unavailable; saved work remains on this device.");
        }
        const remote = response(result.data);
        await db.update("study", k, (e) => {
          // A local edit may have arrived while the read was pending. Keep its known
          // base; the next CAS will merge an identical value or retain both versions.
          if (
            e.local_version !== entry.local_version ||
            e.dirty ||
            e.pending ||
            e.conflicts.length
          )
            return e;
          if (remote.value !== null && !same(e.value, remote.value)) {
            e.value = remote.value;
            e.local_version++;
          }
          e.base_revision = remote.revision;
          e.base_value = remote.value;
          return e;
        });
      }
    })().finally(() => {
      if (inflight.get(k)?.task === task) inflight.delete(k);
      notify();
    });
    inflight.set(k, { task, signal: c.ticket.signal });
    return task;
  }
  async function open(c, material, id, client) {
    check(c);
    const defaults = {
        progress: initialAttempt(material),
        note: { version: 1, text: "" },
        bookmark: { version: 1, bookmarked: false },
      },
      entries = {},
      versions = {},
      queues = {};
    for (const kind of Object.keys(defaults)) {
      const identity = { section: material.payload.section_id, kind, id },
        k = key(c, identity);
      let e = await db.get("study", k);
      check(c);
      if (!e) {
        // Adopt only this already owned U7 key. Never enumerate unowned legacy data.
        const legacy = store.get(c.ticket, identity),
          value = valueFor(kind, legacy?.value ?? defaults[kind], material);
        e = await db.update(
          "study",
          k,
          (existing) =>
            existing ?? {
              owner: c.userId,
              identity,
              material: material.id,
              value,
              local_version: 0,
              base_revision: "0",
              base_value: null,
              dirty: !!legacy,
              pending: null,
              conflicts: [],
              history: [],
            },
        );
        check(c);
      }
      if (
        e.owner !== c.userId ||
        e.material !== material.id ||
        canonical(e.identity) !== canonical(identity)
      )
        throw Error("Saved study identity mismatch");
      valueFor(kind, e.value, material); // Corrupt saved data stays untouched.
      if (!c.offline && online())
        try {
          await sync(c, client, k);
        } catch {
          check(c);
        }
      e = await db.get("study", k);
      check(c);
      entries[kind] = e;
      versions[kind] = e.local_version;
    }
    const write = (kind, value) => {
      check(c);
      value = valueFor(kind, value, material);
      const run = async () => {
        check(c);
        const e = entries[kind],
          k = key(c, e.identity);
        let conflict = false;
        const next = await db.update("study", k, (r) => {
          if (r.local_version !== versions[kind] || r.conflicts.length) {
            conflict = true;
            const draft = { id: writer, source: "tab", value };
            const old = r.conflicts.findIndex((x) => x.id === writer);
            if (old >= 0) r.conflicts[old] = draft;
            else r.conflicts.push(draft);
          } else {
            r.value = value;
            r.local_version++;
            r.dirty = !same(value, r.base_value);
          }
          return r;
        });
        check(c);
        if (!conflict) versions[kind] = next.local_version;
        notify();
        if (conflict)
          throw Error(
            "A competing version was saved. Review the saved conflicts.",
          );
        if (!c.offline && online()) sync(c, client, k).catch(() => {});
      };
      const result = (queues[kind] ?? Promise.resolve())
        .catch(() => {})
        .then(run);
      queues[kind] = result;
      return result;
    };
    const writer = crypto.randomUUID();
    return {
      state: valueFor("progress", entries.progress.value, material),
      note: valueFor("note", entries.note.value, material).text,
      bookmarked: valueFor("bookmark", entries.bookmark.value, material)
        .bookmarked,
      saveProgress: (v) => write("progress", v),
      saveNote: (text) => write("note", { version: 1, text }),
      saveBookmark: (bookmarked) =>
        write("bookmark", { version: 1, bookmarked }),
    };
  }
  async function list(c) {
    check(c);
    const rows = (await db.owned("study", c.userId)).filter((r) =>
      isOwner(r, c),
    );
    check(c);
    return rows;
  }
  return {
    open,
    async syncAll(c, client, allowed) {
      for (const row of await list(c)) {
        if (
          allowed.has(row.data.material) &&
          (row.data.dirty || row.data.pending)
        )
          await sync(c, client, row.key);
      }
      notify();
    },
    async summary(c) {
      const rows = await list(c);
      return {
        pending: rows.filter((r) => r.data.dirty || r.data.pending).length,
        conflicts: rows.filter((r) => r.data.conflicts.length),
      };
    },
    async resolve(c, k, choice) {
      check(c);
      await db.update("study", k, (e) => {
        if (!e || e.owner !== c.userId || k !== key(c, e.identity))
          throw Error("Account changed");
        const chosen =
          choice === "local"
            ? { value: e.value }
            : e.conflicts.find((x) => x.id === choice);
        if (!chosen || chosen.value === null)
          throw Error("Choose an available saved version");
        const cloud = e.conflicts.find((x) => x.source === "cloud");
        if (cloud) {
          e.base_revision = cloud.revision;
          e.base_value = cloud.value;
        }
        e.history.push({ value: e.value, conflicts: e.conflicts });
        e.value = chosen.value;
        e.local_version++;
        e.conflicts = [];
        e.pending = null;
        e.dirty = !same(e.value, e.base_value);
        return e;
      });
      check(c);
      notify();
    },
    async backup(c) {
      return JSON.stringify(
        {
          format: "commonplace-u8-study",
          version: 1,
          namespace,
          owner: c.userId,
          records: (await list(c)).map((r) => r.data),
        },
        null,
        2,
      );
    },
    async restore(c, text, client) {
      check(c);
      if (c.offline || !online())
        throw Error(
          "Connect and verify your account before restoring a backup.",
        );
      if (
        typeof text !== "string" ||
        new TextEncoder().encode(text).length > 8388608
      )
        throw Error("Study backup exceeds 8 MiB.");
      const b = JSON.parse(text);
      if (
        !b ||
        b.format !== "commonplace-u8-study" ||
        b.version !== 1 ||
        b.namespace !== namespace ||
        b.owner !== c.userId ||
        !Array.isArray(b.records) ||
        b.records.length > 1000
      )
        throw Error(
          "Backup belongs to another account/project or has an unsupported format.",
        );
      const source = await digest(text),
        seen = new Set(),
        prepared = [],
        materials = new Map();
      // Validate the complete import and recheck material authorization before writes.
      // Backup revisions, ownership claims and pending operations never grant access.
      for (const r of b.records) {
        check(c);
        if (
          r?.owner !== c.userId ||
          !r.identity ||
          !["progress", "note", "bookmark"].includes(r.identity.kind)
        )
          throw Error("Invalid backup record");
        let m = materials.get(r.material);
        if (!m) {
          m = await readAssignedMaterial(client, c, r.material);
          materials.set(r.material, m);
        }
        const lesson =
          m.payload.content.format === "bundle"
            ? await lessonFromMaterial(
                c,
                m,
                m.payload.section_id,
                EXCEL_PHASE_A_CAPABILITIES,
              )
            : null;
        const id = await studyIdentity(m, lesson),
          identity = {
            section: m.payload.section_id,
            kind: r.identity.kind,
            id,
          };
        if (!same(identity, r.identity))
          throw Error("Backup material identity mismatch");
        const k = key(c, identity);
        if (seen.has(k)) throw Error("Duplicate backup record");
        seen.add(k);
        const value = valueFor(identity.kind, r.value, m),
          copies = [];
        for (const copy of r.conflicts || []) {
          if (copy.value !== null)
            copies.push(valueFor(identity.kind, copy.value, m));
        }
        for (const h of r.history || []) {
          copies.push(valueFor(identity.kind, h.value, m));
          for (const copy of h.conflicts || [])
            if (copy.value !== null)
              copies.push(valueFor(identity.kind, copy.value, m));
        }
        if (copies.length > 1000)
          throw Error("Backup contains too many alternative versions");
        prepared.push({ k, identity, material: m.id, value, copies });
      }
      let restored = 0;
      for (const r of prepared) {
        check(c);
        await db.update("study", r.k, (old) => {
          const e = old ?? {
            owner: c.userId,
            identity: r.identity,
            material: r.material,
            value: r.value,
            local_version: 0,
            base_revision: "0",
            base_value: null,
            dirty: true,
            pending: null,
            conflicts: [],
            history: [],
          };
          if (
            e.owner !== c.userId ||
            e.material !== r.material ||
            !same(e.identity, r.identity)
          )
            throw Error("Existing record identity mismatch");
          if (e.imports?.includes(source)) return e;
          if (old && !same(e.value, r.value))
            e.conflicts.push({
              id: crypto.randomUUID(),
              source: "backup",
              value: r.value,
            });
          for (const value of r.copies)
            e.history.push({ value, conflicts: [] });
          e.imports = [...(e.imports || []), source];
          restored++;
          return e;
        });
      }
      check(c);
      notify();
      return restored;
    },
  };
}
