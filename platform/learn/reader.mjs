const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
export function mountMaterialReader(
  root,
  material,
  { state, onChange, download } = {},
) {
  let disposed = false;
  root.replaceChildren();
  const c = material.payload.content;
  const table = (data) => {
    const scroll = el("div");
    scroll.className = "learn-table-scroll";
    const t = el("table");
    t.setAttribute("aria-label", data.title);
    const header = el("tr");
    data.columns.forEach((col) => {
      const th = el("th", col.label);
      th.scope = "col";
      header.append(th);
    });
    t.append(header);
    for (const row of data.rows) {
      const tr = el("tr");
      row.forEach((v) => tr.append(el("td", String(v))));
      t.append(tr);
    }
    scroll.append(t);
    root.append(scroll);
  };
  const studied = el("button", "Mark as studied");
  studied.type = "button";
  function update() {
    studied.disabled =
      state.completed || state.responses.some((x) => x === null);
    studied.textContent = state.completed ? "Studied" : "Mark as studied";
  }
  if (c.format === "document") {
    let question = 0;
    for (const block of c.blocks) {
      if (block.kind !== "question") {
        root.append(el(block.kind === "code" ? "pre" : "p", block.text));
        continue;
      }
      const index = question++,
        field = el("fieldset");
      field.className = "learn-question";
      field.append(el("legend", block.text));
      block.choices.forEach((choice, i) => {
        const label = el("label"),
          input = el("input");
        input.type = "radio";
        input.name = "question-" + index;
        input.value = String(i);
        input.checked = state.responses[index] === i;
        input.onchange = () => {
          if (disposed) return;
          state.responses[index] = i;
          state.completed = false;
          onChange(structuredClone(state));
          update();
        };
        label.append(input, el("span", choice));
        field.append(label);
      });
      root.append(field);
    }
    if (question)
      root.append(
        el(
          "p",
          "Choose an answer for each question. Compare your responses with the answer sheet when your administrator makes it available.",
        ),
      );
  } else if (c.format === "dataset") table(c.dataset);
  else if (c.format === "bundle") {
    const b = c.bundle;
    root.append(
      el("h3", b.concept.title),
      el("p", b.concept.explanation),
      el("h4", b.scenario.title),
      el("p", b.scenario.context),
      el("p", b.scenario.instructions),
    );
    table(b.dataset);
    b.lesson.activities.forEach((a) => root.append(el("p", a.instruction)));
  } else if (c.format === "attachment") {
    root.append(
      el("p", material.asset.filename),
      el(
        "p",
        `${Math.ceil(material.asset.bytes / 1024)} KB · Assigned tutorial file`,
      ),
    );
    const button = el("button", "Download tutorial");
    button.type = "button";
    button.onclick = async () => {
      if (disposed) return;
      button.disabled = true;
      try {
        await download();
      } finally {
        if (!disposed) button.disabled = false;
      }
    };
    root.append(
      button,
      el(
        "p",
        "Open the downloaded file in a suitable app. Mark it as studied when you have finished.",
      ),
    );
  }
  studied.onclick = () => {
    if (disposed) return;
    state.completed = true;
    onChange(structuredClone(state));
    update();
  };
  root.append(studied);
  update();
  return () => {
    disposed = true;
    root.replaceChildren();
  };
}
