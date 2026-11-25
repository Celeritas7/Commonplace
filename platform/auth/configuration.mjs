const fields = [
  "version",
  "environment",
  "origin",
  "project_ref",
  "publishable_key",
  "offline_hours",
  "offline_public_jwk",
];
export function validateStagingConfiguration(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !fields.includes(key)) ||
    fields.some((key) => !Object.hasOwn(value, key)) ||
    value.version !== 1 ||
    value.environment !== "staging"
  )
    throw Error("An explicit staging configuration is required.");
  const url = new URL(value.origin);
  if (
    url.protocol !== "https:" ||
    url.origin !== value.origin ||
    url.username ||
    url.password ||
    url.hostname === "celeritas7.github.io" ||
    !/^[a-z]{20}$/.test(value.project_ref) ||
    ["wylxvmkcrexwfpjpbhyy", "ulgrfumbwjovbjzjiems"].includes(value.project_ref)
  )
    throw Error(
      "Use a separate HTTPS staging origin and isolated Supabase project.",
    );
  if (!/^sb_publishable_[A-Za-z0-9_-]{10,200}$/.test(value.publishable_key))
    throw Error("Only a publishable browser key is accepted.");
  if (
    !Number.isInteger(value.offline_hours) ||
    value.offline_hours < 1 ||
    value.offline_hours > 168
  )
    throw Error("Choose an offline interval from 1 to 168 hours.");
  const key = value.offline_public_jwk;
  if (
    !key ||
    typeof key !== "object" ||
    Array.isArray(key) ||
    Object.keys(key).some(
      (k) => !["kty", "crv", "x", "y", "ext", "key_ops"].includes(k),
    ) ||
    key.kty !== "EC" ||
    key.crv !== "P-256" ||
    !/^[A-Za-z0-9_-]{43}$/.test(key.x) ||
    !/^[A-Za-z0-9_-]{43}$/.test(key.y) ||
    (key.ext !== undefined && typeof key.ext !== "boolean") ||
    (key.key_ops !== undefined && JSON.stringify(key.key_ops) !== '["verify"]')
  )
    throw Error("Supply only the public P-256 offline verification key.");
  return structuredClone(value);
}
export const projectNamespace = (config) =>
  "commonplace-staging-" + config.project_ref;
export function stagingClientOptions(config) {
  return {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "cp:" + projectNamespace(config) + ":auth",
    },
  };
}
