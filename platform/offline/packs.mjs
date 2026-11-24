import { canonical, digest, materialBytes, verifyLease } from "./lease.mjs";
import { ownedKey } from "./database.mjs";
import {
  readAssignedMaterial,
  downloadAssignedMaterial,
} from "../materials/learner.mjs";
export function createPackManager({
  db,
  namespace,
  origin,
  publicKey,
  check,
  now = Date.now,
  notify = () => {},
}) {
  const pk = (owner) => ownedKey(owner, "office.excel");
  const assetKey = (owner, hash) => ownedKey(owner, hash);
  async function verified(owner, ready = false) {
    const pack = await db.get("packs", pk(owner));
    if (!pack || pack.phase === "blocked" || (ready && pack.phase !== "ready"))
      throw Error(
        "No complete authorized pack. Connect and download your assigned study first.",
      );
    const lease = await verifyLease(pack.token, publicKey, {
      namespace,
      origin,
      owner,
      now: now(),
      lastSeen: pack.last_seen,
    });
    return { pack, lease };
  }
  async function cached(owner, e) {
    const body = await db.get("documents", assetKey(owner, e.body_sha256));
    if (
      typeof body !== "string" ||
      new TextEncoder().encode(body).length !== e.body_bytes ||
      (await digest(body)) !== e.body_sha256
    )
      return false;
    if (e.asset) {
      const file = await db.get("files", assetKey(owner, e.asset.sha256));
      if (
        !(file instanceof Blob) ||
        file.size !== e.asset.bytes ||
        (await digest(await file.arrayBuffer())) !== e.asset.sha256
      )
        return false;
    }
    return true;
  }
  async function status(owner) {
    const { pack, lease } = await verified(owner);
    let complete = 0,
      bytes = 0,
      total = 0;
    for (const e of lease.materials) {
      const size = e.body_bytes + (e.asset?.bytes || 0);
      total += size;
      if (await cached(owner, e)) {
        complete++;
        bytes += size;
      }
    }
    return { pack, lease, complete, bytes, total };
  }
  async function block(owner) {
    if (!owner) return;
    await db.update("packs", pk(owner), (p) =>
      p ? { ...p, phase: "blocked" } : undefined,
    );
    notify();
  }
  async function renew(c, client) {
    check(c);
    // Once online revalidation starts, an old lease must not become a fallback
    // after a denied, malformed or interrupted response. Keep its bytes for retry.
    await block(c.userId);
    check(c);
    const result = await client.functions.invoke("offline-lease", {
      body: {},
      headers: { "x-cp-section": "office.excel" },
    });
    check(c);
    if (result.error) {
      await block(c.userId);
      throw Error(
        "Offline permission could not be refreshed. Your saved work has been kept.",
      );
    }
    const lease = await verifyLease(result.data, publicKey, {
      namespace,
      origin,
      owner: c.userId,
      now: now(),
    });
    check(c);
    let complete = true;
    for (const e of lease.materials) {
      if (!(await cached(c.userId, e))) complete = false;
      check(c);
    }
    await db.put("packs", pk(c.userId), {
      token: result.data,
      phase: complete ? "ready" : "partial",
      last_seen: now(),
    });
    check(c);
    notify();
    return lease;
  }
  async function download(c, client, progress = () => {}, signal) {
    const lease = await renew(c, client),
      { pack } = await verified(c.userId),
      signature = pack.token.signature;
    const active = async () => {
      check(c);
      if (signal?.aborted)
        throw Error("Download paused. Completed files will be reused.");
      const latest = await verified(c.userId);
      if (latest.pack.token.signature !== signature)
        throw Error("Assignments changed; resume the latest pack.");
      check(c);
    };
    let done = 0,
      bytes = 0;
    const total = lease.materials.reduce(
      (n, e) => n + e.body_bytes + (e.asset?.bytes || 0),
      0,
    );
    for (const e of lease.materials) {
      await active();
      if (!(await cached(c.userId, e))) {
        let body = await db.get("documents", assetKey(c.userId, e.body_sha256));
        if (
          typeof body !== "string" ||
          (await digest(body)) !== e.body_sha256
        ) {
          const m = await readAssignedMaterial(
            client,
            c,
            e.id,
            signal || c.ticket.signal,
          );
          await active();
          body = materialBytes(m, c.userId, lease.section);
          if (
            new TextEncoder().encode(body).length !== e.body_bytes ||
            (await digest(body)) !== e.body_sha256
          )
            throw Error("Lesson changed or is incomplete. Refresh and resume.");
          await db.put("documents", assetKey(c.userId, e.body_sha256), body);
        }
        if (e.asset) {
          let file = await db.get("files", assetKey(c.userId, e.asset.sha256));
          if (
            !(file instanceof Blob) ||
            file.size !== e.asset.bytes ||
            (await digest(await file.arrayBuffer())) !== e.asset.sha256
          ) {
            file = await downloadAssignedMaterial(client, c, e.id, signal);
            await active();
            if (
              file.size !== e.asset.bytes ||
              (await digest(await file.arrayBuffer())) !== e.asset.sha256
            )
              throw Error("Tutorial integrity check failed. Resume to retry.");
            await db.put("files", assetKey(c.userId, e.asset.sha256), file);
          }
        }
      }
      await active();
      done++;
      bytes += e.body_bytes + (e.asset?.bytes || 0);
      progress({ done, count: lease.materials.length, bytes, total });
    }
    await active();
    await db.update("packs", pk(c.userId), (p) =>
      p.token.signature === signature
        ? { ...p, phase: "ready", last_seen: now() }
        : p,
    );
    notify();
    return lease;
  }
  async function resume(owner) {
    const { pack, lease } = await verified(owner, true);
    for (const e of lease.materials)
      if (!(await cached(owner, e)))
        throw Error(
          "Some saved files are missing or damaged. Connect and resume the download; your progress is kept.",
        );
    await db.update("packs", pk(owner), (p) =>
      p.token.signature === pack.token.signature
        ? { ...p, last_seen: Math.max(p.last_seen, now()) }
        : p,
    );
    return lease;
  }
  function clientFor(c, lease) {
    const valid = async () => {
      check(c);
      const fresh = await verified(c.userId, true);
      check(c);
      if (fresh.pack.token.payload !== canonical(lease))
        throw Error("Saved assignments changed. Reopen study.");
    };
    const read = async (target) => {
      await valid();
      const e = lease.materials.find((x) => x.id === target);
      if (!e) throw Error("Material unavailable offline");
      const text = await db.get("documents", assetKey(c.userId, e.body_sha256));
      await valid();
      if (typeof text !== "string" || (await digest(text)) !== e.body_sha256)
        throw Error("Saved lesson is damaged");
      return JSON.parse(text);
    };
    return {
      from(table) {
        return {
          select() {
            return this;
          },
          eq(_, id) {
            if (id !== c.userId) throw Error("Account changed");
            return this;
          },
          abortSignal() {
            return this;
          },
          async maybeSingle() {
            await valid();
            if (table !== "cp_learning_profiles")
              throw Error("Offline operation unavailable");
            return { data: { profile: structuredClone(lease.profile) } };
          },
        };
      },
      async rpc(name, args) {
        await valid();
        if (name === "cp_learner_materials" && args.section === lease.section)
          return {
            data: lease.materials.map(
              ({ id, title, material_type, version }) => ({
                id,
                title,
                material_type,
                version,
              }),
            ),
          };
        if (name === "cp_read_material")
          return { data: await read(args.target) };
        throw Error("This action requires internet access");
      },
      functions: {
        async invoke(name, { headers }) {
          if (
            name !== "material-files" ||
            headers["x-cp-action"] !== "download"
          )
            throw Error("This action requires internet access");
          const m = await read(headers["x-cp-version"]);
          if (!m.asset) throw Error("No saved tutorial");
          const file = await db.get(
            "files",
            assetKey(c.userId, m.asset.sha256),
          );
          await valid();
          if (
            !(file instanceof Blob) ||
            file.size !== m.asset.bytes ||
            (await digest(await file.arrayBuffer())) !== m.asset.sha256
          )
            throw Error("Saved file is damaged");
          return { data: file };
        },
      },
    };
  }
  return { status, renew, download, resume, block, clientFor };
}
