import { InputError } from "../handler.mjs";

function encode(value, maxBytes) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > maxBytes)
    throw new InputError("Code or input is too large.", 413);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function decode(value) {
  if (value == null) return "";
  if (typeof value !== "string") throw Error();
  return new TextDecoder().decode(
    Uint8Array.from(atob(value), (c) => c.charCodeAt(0)),
  );
}
export const executionRoute = {
  name: "code-exec",
  secret: "JUDGE0_RAPIDAPI_KEY",
  url: "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true",
  inputBytes: 256 * 1024,
  outputBytes: 512 * 1024,
  timeoutMs: 30000,
  headers: (key) => ({
    "content-type": "application/json",
    "x-rapidapi-key": key,
    "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
  }),
  prepare({ source_code, stdin = "" }) {
    if (
      typeof source_code !== "string" ||
      !source_code.trim() ||
      typeof stdin !== "string"
    )
      throw new InputError("Code and input must be text.");
    return {
      language_id: 54,
      source_code: encode(source_code, 128 * 1024),
      stdin: encode(stdin, 32 * 1024),
    };
  },
  result(r) {
    const id = r?.status?.id;
    // Only terminal learner outcomes may reach the playground's grading path.
    if (
      !Number.isInteger(id) ||
      id < 3 ||
      id > 12 ||
      typeof r.status.description !== "string"
    )
      throw Error();
    return {
      status: { id, description: r.status.description },
      stdout: decode(r.stdout),
      stderr: decode(r.stderr),
      compile_output: decode(r.compile_output),
      message: decode(r.message),
      exit_code: typeof r.exit_code === "number" ? r.exit_code : null,
      time: r.time ?? null,
      memory: r.memory ?? null,
    };
  },
};
