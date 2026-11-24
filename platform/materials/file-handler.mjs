import { inspectAttachment, MAX_FILE_BYTES, sha256 } from "./file-policy.mjs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function boundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw Error("File required.");
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_FILE_BYTES) {
        await reader.cancel();
        throw Error("File exceeds 10 MiB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return bytes;
}
export function createFileHandler({ clients, origin }) {
  if (!origin || !/^https:\/\//.test(origin))
    throw Error("An approved HTTPS application origin is required.");
  return async (request) => {
    const headers = {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    };
    const json = (status, value) =>
      new Response(JSON.stringify(value), {
        status,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    if (request.headers.get("Origin") !== origin)
      return json(403, { error: "Origin is not authorized." });
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "authorization, apikey, content-type, x-client-info, x-cp-action, x-cp-version, x-cp-revision, x-cp-filename",
        },
      });
    if (request.method !== "POST")
      return json(405, { error: "POST required." });
    let upload = null,
      service,
      attesting = false;
    try {
      const authorization = request.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer "))
        return json(401, { error: "Sign in required." });
      const pair = clients(authorization),
        userClient = pair.user;
      service = pair.service;
      const verified = await userClient.auth.getUser();
      if (verified.error || !verified.data?.user?.id)
        return json(401, { error: "Sign in required." });
      const actor = verified.data.user.id;
      const target = request.headers.get("x-cp-version"),
        action = request.headers.get("x-cp-action");
      if (!UUID.test(target || ""))
        return json(400, { error: "Invalid material ID." });
      const rpc = async (client, name, args) => {
        const r = await client.rpc(name, args);
        if (r.error)
          throw Object.assign(
            Error("Material access or revision check failed."),
            { code: r.error.code },
          );
        return r.data;
      };
      if (action === "upload") {
        // Verify admin before reading attacker-controlled bytes, then serialize and
        // verify again after inspection. No client write policy exists in Storage.
        await rpc(userClient, "cp_admin_material_detail", { target });
        const revision = request.headers.get("x-cp-revision");
        if (!/^[1-9][0-9]{0,18}$/.test(revision || ""))
          return json(400, { error: "Saved draft revision required." });
        const bytes = await boundedBody(request),
          receipt = await inspectAttachment(
            bytes,
            request.headers.get("x-cp-filename"),
          );
        upload = await rpc(userClient, "cp_admin_material_begin_upload", {
          target,
          expected_revision: revision,
        });
        const stored = await service.storage
          .from("cp-materials")
          .upload(upload.path, bytes, {
            contentType: "application/octet-stream",
            cacheControl: "0",
            upsert: false,
          });
        if (stored.error) throw Error("Private file upload failed.");
        attesting = true;
        await rpc(service, "cp_service_material_finish_upload", {
          target,
          nonce: upload.nonce,
          actor,
          receipt,
        });
        upload = null;
        return json(200, { saved: true });
      }
      if (action === "download") {
        const material = await rpc(userClient, "cp_read_material", { target }),
          asset = material.asset;
        if (!asset) throw Error("No attachment available.");
        const file = await service.storage
          .from("cp-materials")
          .download(asset.path);
        if (
          file.error ||
          !file.data ||
          file.data.size !== asset.bytes ||
          file.data.size > MAX_FILE_BYTES
        )
          throw Error("Private file is unavailable.");
        const bytes = new Uint8Array(await file.data.arrayBuffer());
        if ((await sha256(bytes)) !== asset.sha256)
          throw Error("File integrity check failed.");
        // Recheck after fetching bytes so a revocation during the download is seen.
        const fresh = await rpc(userClient, "cp_read_material", { target });
        if (
          fresh.asset?.sha256 !== asset.sha256 ||
          fresh.asset?.path !== asset.path
        )
          throw Error("Attachment changed.");
        return new Response(bytes, {
          headers: {
            ...headers,
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${asset.filename}"`,
          },
        });
      }
      return json(400, { error: "Unsupported file action." });
    } catch (error) {
      // A lost finalization response may hide a committed receipt. Keep those
      // private bytes for reconciliation rather than deleting a referenced file.
      if (
        upload &&
        service &&
        (!attesting || ["40001", "42501", "22023"].includes(error.code))
      )
        await service.storage
          .from("cp-materials")
          .remove([upload.path])
          .catch(() => {});
      return json(
        error.code === "42501" ? 403 : error.code === "40001" ? 409 : 400,
        {
          error:
            error.code === "42501"
              ? "Material access denied."
              : error.message || "File request failed.",
        },
      );
    }
  };
}
