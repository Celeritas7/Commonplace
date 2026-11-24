const el = (tag, text) => {
  const n = document.createElement(tag);
  n.textContent = text;
  return n;
};
export function renderMaterial(root, material) {
  root.replaceChildren(el("h3", material.title));
  const c = material.content;
  const table = (d) => {
    const t = document.createElement("table"),
      header = document.createElement("tr");
    for (const col of d.columns) header.append(el("th", col.label));
    t.append(header);
    for (const row of d.rows) {
      const tr = document.createElement("tr");
      row.forEach((x) => tr.append(el("td", String(x))));
      t.append(tr);
    }
    root.append(t);
  };
  if (c.format === "bundle") {
    const b = c.bundle;
    root.append(
      el("p", b.concept.explanation),
      el("h4", b.scenario.title),
      el("p", b.scenario.context),
      el("p", b.scenario.instructions),
    );
    table(b.dataset);
    for (const a of b.lesson.activities) root.append(el("p", a.instruction));
  } else if (c.format === "dataset") table(c.dataset);
  else if (c.format === "document")
    for (const b of c.blocks) {
      root.append(el(b.kind === "code" ? "pre" : "p", b.text));
      if (b.choices) {
        const ul = document.createElement("ul");
        b.choices.forEach((x) => ul.append(el("li", x)));
        root.append(ul);
      }
    }
  else
    root.append(
      el(
        "p",
        "Attachment preview: review the downloaded file before publishing. Files are never executed or embedded in Admin Studio.",
      ),
    );
}
