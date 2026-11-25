const labels = {
  pending: "Waiting for signup",
  awaiting_confirmation: "Waiting for email confirmation",
  identity_changed: "Identity changed. Review the reserved account.",
  verified: "Verified and ready to register",
  expired: "Expired",
  withdrawn: "Withdrawn",
  released: "Released for separate legacy approval",
  completed: "Registered",
};

function element(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

export function mountSignupRequests(panel, api, { onBusy, onDenied }) {
  let disposed = false;
  let busy = false;
  const status = element("p");
  status.setAttribute("role", "status");
  const availability = element("div");
  availability.className = "access-preview";
  availability.setAttribute("role", "status");
  availability.setAttribute("aria-label", "Signup availability");
  const reload = element("button", "Reload signup requests");
  reload.type = "button";
  reload.className = "secondary";
  reload.onclick = () => refresh();
  const toolbar = element("p");
  toolbar.append(reload);
  const content = element("div");
  content.dataset.managedEditor = "";
  panel.append(
    element("h2", "Signup requests"),
    availability,
    toolbar,
    status,
    content,
  );

  function showAvailability(state) {
    const messages = {
      checking: [
        "Checking signup status…",
        "Verifying whether new Commonplace account signup is allowed.",
      ],
      enabled: [
        "Signup enabled",
        "At the last check, new Commonplace-only accounts could sign up with an approved, unexpired request. Email confirmation and separate learning access are still required.",
      ],
      paused: [
        "Signup paused",
        "New Commonplace-only accounts cannot sign up. You can prepare requests, but preparing a request does not enable signup. Existing accounts and request reviews are unaffected by this pause.",
      ],
      unavailable: [
        "Signup status unavailable",
        "Signup availability could not be verified. Reload to check again before sharing signup instructions. Preparing a request does not enable signup.",
      ],
    };
    const [title, explanation] = messages[state] || messages.unavailable;
    const description = element("p", explanation);
    description.className = "intro";
    availability.replaceChildren(element("h3", title), description);
  }

  async function refresh(mutation) {
    if (disposed || busy) return;
    busy = true;
    reload.disabled = true;
    showAvailability("checking");
    status.textContent = "";
    onBusy(true);
    try {
      if (mutation) await mutation();
      if (disposed) return;
      let signupStatus = "unavailable";
      try {
        signupStatus = await api.signupStatus();
      } catch (error) {
        // Older installations may not have the read-only status RPC yet.
        // A denied administrator must still lose the entire private view.
        if (error.code === "42501") throw error;
      }
      if (disposed) return;
      const rows = await api.signups();
      if (disposed) return;
      render(rows);
      showAvailability(signupStatus);
      status.textContent = mutation ? "Saved." : "";
    } catch (error) {
      if (disposed) return;
      content.replaceChildren();
      if (error.code === "42501") {
        onDenied();
        return;
      }
      showAvailability("unavailable");
      status.textContent =
        error.code === "PGRST202"
          ? "Signup requests are unavailable on this installation."
          : error.message;
    } finally {
      if (!disposed) {
        busy = false;
        reload.disabled = false;
        onBusy(false);
      }
    }
  }

  function form(label, type, submit, action) {
    const node = element("form");
    const field = element("label", label);
    const input = element("input");
    input.type = type;
    input.required = true;
    input.maxLength = type === "email" ? 254 : 120;
    const button = element("button", submit);
    button.type = "submit";
    field.append(input);
    node.append(field, button);
    node.onsubmit = (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (value) refresh(() => action(value));
    };
    return node;
  }

  function render(rows) {
    content.replaceChildren(
      form("Login email", "email", "Prepare 24-hour request", (email) =>
        api.prepareSignup(email),
      ),
    );
    if (!rows.length) content.append(element("p", "No signup requests."));
    for (const row of rows) {
      const section = element("section");
      section.append(
        element("h3", row.email),
        element("p", labels[row.state] || "Reload to check status"),
      );
      if (row.claimed_user_id)
        section.append(
          element("p", "Reserved Auth ID: " + row.claimed_user_id),
        );
      if (!["completed", "released", "withdrawn"].includes(row.state))
        section.append(
          element("p", "Expires " + new Date(row.expires_at).toLocaleString()),
        );
      if (row.state === "verified")
        section.append(
          form(
            "Learner display name",
            "text",
            "Register suspended learner",
            (name) => api.completeSignup(row, name),
          ),
        );
      function action(decision, text) {
        const button = element("button", text);
        button.onclick = () => {
          if (window.confirm(text + " for " + row.email + "?"))
            refresh(() => api.reviewSignup(row, decision));
        };
        section.append(button);
      }
      if (!["completed", "released"].includes(row.state)) {
        if (row.state !== "withdrawn") action("withdraw", "Withdraw request");
        if (["withdrawn", "expired"].includes(row.state)) {
          action(
            "renew",
            row.claimed_user_id
              ? "Resume this Auth ID for 24 hours"
              : "Renew for 24 hours",
          );
          if (!row.claimed_user_id)
            action("release", "Release unused request for legacy approval");
        }
      }
      content.append(section);
    }
  }

  refresh();
  return () => {
    disposed = true;
  };
}
