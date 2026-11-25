import { InputError } from "../handler.mjs";

function content(value) {
  if (typeof value === "string" && value.trim()) return value;
  if (
    Array.isArray(value) &&
    value.length &&
    value.every(
      (b) => b?.type === "text" && typeof b.text === "string" && b.text.trim(),
    )
  )
    return value.map(({ text }) => ({ type: "text", text }));
  throw new InputError("Expected nonempty text.");
}
export const claudeRoute = {
  name: "claude-proxy",
  secret: "ANTHROPIC_API_KEY",
  url: "https://api.anthropic.com/v1/messages",
  inputBytes: 40000,
  outputBytes: 512 * 1024,
  timeoutMs: 60000,
  headers: (key) => ({
    "content-type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "server-side-fallback-2026-07-01",
  }),
  prepare(body) {
    if (!Array.isArray(body.messages) || !body.messages.length)
      throw new InputError("A conversation is required.");
    const messages = body.messages.map((m) => {
      if (!["user", "assistant"].includes(m?.role))
        throw new InputError("Invalid message role.");
      return { role: m.role, content: content(m.content) };
    });
    if (!messages.some((m) => m.role === "user"))
      throw new InputError("A user message is required.");
    const tokens = body.max_tokens === undefined ? 2000 : body.max_tokens;
    if (!Number.isInteger(tokens) || tokens < 1 || tokens > 2000)
      throw new InputError("Invalid max_tokens.");
    return {
      model: "claude-sonnet-5-5",
      max_tokens: tokens,
      messages,
      ...(body.system == null ? {} : { system: content(body.system) }),
      thinking: { type: "between_tools" },
      output_config: { effort: "low" },
      fallbacks: "default",
    };
  },
  result(data) {
    if (data?.stop_reason === "refusal" || !Array.isArray(data?.content))
      throw Error();
    const blocks = data.content.filter(
      (b) => b?.type === "text" && typeof b.text === "string" && b.text.trim(),
    );
    if (!blocks.length) throw Error();
    return {
      ...data,
      content: blocks.map(({ text }) => ({ type: "text", text })),
    };
  },
};
