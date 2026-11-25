// Only mounted inside prepareLocalStack's disposable functions directory.
const local = new URL(Deno.env.get("SUPABASE_URL")).origin;
const transport = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, options) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.origin === local) return transport(input, options);
  if (url.href === "https://api.anthropic.com/v1/messages")
    return Promise.resolve(
      Response.json({ content: [{ type: "text", text: "synthetic answer" }] }),
    );
  if (url.origin === "https://judge0-ce.p.rapidapi.com")
    return Promise.resolve(
      Response.json({
        status: { id: 3, description: "Accepted" },
        stdout: btoa("synthetic output"),
      }),
    );
  throw Error("Unexpected outgoing test request");
};
