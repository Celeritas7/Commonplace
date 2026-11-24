import { validateProfile } from "../lib/learning-profile.mjs";
import { validateMaterial, MATERIAL_TYPES } from "../materials/contracts.mjs";
export const MAX_LEASE_MS = 7 * 86400000;
export const MAX_PACK_BYTES = 100 * 1024 * 1024;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();
export const canonical = (value) => JSON.stringify(sort(value));
function sort(v) {
  if (Array.isArray(v)) return v.map(sort);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sort(v[k])]),
    );
  return v;
}
export async function digest(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function materialBytes(m, owner, section) {
  if (
    !m ||
    m.owner_id !== owner ||
    m.publication_state !== "published" ||
    !UUID.test(m.id) ||
    !Number.isSafeInteger(m.version) ||
    m.version < 1
  )
    throw Error("Invalid saved material");
  const payload = validateMaterial(m.payload);
  if (payload.section_id !== section) throw Error("Material section mismatch");
  return canonical({
    id: m.id,
    owner_id: owner,
    publication_state: "published",
    version: m.version,
    payload,
    asset: m.asset ?? null,
  });
}
function asset(a) {
  if (a === null) return;
  if (
    !a ||
    !Number.isSafeInteger(a.bytes) ||
    a.bytes < 1 ||
    a.bytes > 10485760 ||
    !HASH.test(a.sha256) ||
    typeof a.filename !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,119}\.(xlsx|pdf|png|jpg|jpeg|txt)$/.test(
      a.filename,
    ) ||
    ![
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/pdf",
      "image/png",
      "image/jpeg",
      "text/plain",
    ].includes(a.mime) ||
    typeof a.path !== "string" ||
    a.path.split("/").length !== 2 ||
    !a.path.split("/").every((s) => UUID.test(s))
  )
    throw Error("Invalid saved attachment");
}
export function validateLease(
  m,
  { namespace, origin, owner, now = Date.now(), lastSeen = 0 } = {},
) {
  if (
    !m ||
    m.version !== 1 ||
    m.namespace !== namespace ||
    m.origin !== origin ||
    (owner && m.owner !== owner) ||
    typeof m.owner !== "string" ||
    !UUID.test(m.owner) ||
    m.section !== "office.excel" ||
    typeof m.display_name !== "string" ||
    m.display_name.length > 120 ||
    !Number.isSafeInteger(m.issued_at) ||
    !Number.isSafeInteger(m.expires_at) ||
    m.expires_at <= m.issued_at ||
    m.expires_at - m.issued_at > MAX_LEASE_MS ||
    now >= m.expires_at ||
    now < m.issued_at - 300000 ||
    now < lastSeen - 60000
  )
    throw Error(
      "Offline permission expired or the device clock changed. Connect to refresh access.",
    );
  validateProfile(m.profile);
  if (!Array.isArray(m.materials) || m.materials.length > 100)
    throw Error("Invalid offline manifest");
  const ids = new Set();
  let size = 0;
  for (const e of m.materials) {
    if (
      !e ||
      !UUID.test(e.id) ||
      ids.has(e.id) ||
      !Number.isSafeInteger(e.version) ||
      e.version < 1 ||
      typeof e.title !== "string" ||
      [...e.title].length > 160 ||
      !MATERIAL_TYPES.includes(e.material_type) ||
      !HASH.test(e.body_sha256) ||
      !Number.isSafeInteger(e.body_bytes) ||
      e.body_bytes < 1 ||
      e.body_bytes > 4194304
    )
      throw Error("Invalid offline manifest");
    asset(e.asset);
    ids.add(e.id);
    size += e.body_bytes + (e.asset?.bytes || 0);
  }
  if (size > MAX_PACK_BYTES) throw Error("Offline pack exceeds 100 MiB");
  return m;
}
const b64 = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
function un64(text) {
  if (typeof text !== "string" || !/^[A-Za-z0-9_-]+$/.test(text))
    throw Error("Invalid signed permission");
  const s = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
// Signing is used only by the Edge handler and synthetic tests. The live client
// receives a reviewed PUBLIC key and cannot issue leases with it.
export async function signLease(manifest, privateKey) {
  const payload = canonical(manifest),
    bytes = encoder.encode(payload);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    bytes,
  );
  return { payload, signature: b64(new Uint8Array(signature)) };
}
export async function verifyLease(token, publicKey, options) {
  if (
    !token ||
    typeof token.payload !== "string" ||
    encoder.encode(token.payload).length > 262144 ||
    typeof token.signature !== "string" ||
    token.signature.length > 128
  )
    throw Error("Invalid signed permission");
  if (
    !(await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      un64(token.signature),
      encoder.encode(token.payload),
    ))
  )
    throw Error("Offline permission signature is invalid");
  return validateLease(JSON.parse(token.payload), options);
}
export async function importPublicKey(jwk) {
  if (!jwk || jwk.d || jwk.kty !== "EC" || jwk.crv !== "P-256")
    throw Error("A reviewed public offline key is required");
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
}
