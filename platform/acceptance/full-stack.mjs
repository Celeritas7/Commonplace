// Disposable local Supabase integration. No hosted target or credentials accepted.
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { verifyLease } from "../offline/lease.mjs";
import { sharedAccessAcceptance } from "./shared-access-local.mjs";
import {
  assertLocalStatus,
  safeDiagnostic,
  prepareLocalStack,
  platformRoot,
  CLI_VERSION,
} from "./local-stack-support.mjs";

const exec = promisify(execFile),
  secrets = [];
const cli = process.env.CP_SUPABASE_CLI || "supabase";
const origin = "https://commonplace-acceptance.invalid",
  namespace = "commonplace-local-acceptance";
const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};
let work,
  id,
  server,
  serverLog = "",
  phase = "prerequisites",
  passed = 0;
const requireThat = (condition, message) => {
  if (!condition) throw Error(message);
};
async function run(command, args, options = {}) {
  try {
    return (
      await exec(command, args, {
        timeout: 600000,
        maxBuffer: 16 * 1024 * 1024,
        ...options,
      })
    ).stdout;
  } catch (error) {
    throw Error(safeDiagnostic(error.stderr || error.message, secrets));
  }
}
async function sql(query) {
  // Use the unique disposable container, never a connection URL from an env file.
  return new Promise((resolve, reject) => {
    const p = spawn(
      "docker",
      [
        "exec",
        "-i",
        `supabase_db_${id}`,
        "psql",
        "-X",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-t",
        "-A",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "",
      err = "";
    p.stdout.on("data", (b) => (out += b));
    p.stderr.on("data", (b) => (err += b));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0
        ? resolve(out.trim())
        : reject(Error(safeDiagnostic(err, secrets))),
    );
    p.stdin.end(query);
  });
}
async function check(name, fn) {
  phase = name;
  await fn();
  passed++;
  console.log("PASS " + name);
}
const data = (r, label) => {
  requireThat(
    !r.error,
    label +
      " returned an API error" +
      (r.error?.code ? " (" + r.error.code + ")" : "") +
      (r.error?.message
        ? ": " + safeDiagnostic(r.error.message, secrets)
        : "") +
      (r.error?.details ? ": " + safeDiagnostic(r.error.details, secrets) : ""),
  );
  return r.data;
};
const denied = (r, label, code = "42501") =>
  requireThat(r.error?.code === code, label + " did not deny with " + code);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
  requireThat(
    process.argv[2] === "--local-fixture" && process.argv.length === 3,
    "Use --local-fixture; this command creates disposable synthetic data only.",
  );
  requireThat(
    !process.env.SUPABASE_ACCESS_TOKEN &&
      !process.env.SUPABASE_PROJECT_ID &&
      !process.env.SUPABASE_PROJECT_REF &&
      !process.env.SUPABASE_DB_URL &&
      !process.env.SUPABASE_URL,
    "Remove hosted Supabase environment variables before local acceptance.",
  );
  requireThat(
    (await run(cli, ["--version"])).trim() === CLI_VERSION,
    "Supabase CLI " + CLI_VERSION + " required",
  );
  await run("docker", ["info", "--format", "{{.ServerVersion}}"]);
  id = "commonplace-u9-" + randomBytes(8).toString("hex");
  work = await mkdtemp(join(tmpdir(), "commonplace-stack-"));
  await prepareLocalStack(work, id);
  console.log("Starting disposable local Supabase (no remote connection)…");
  await run(cli, [
    "start",
    "--workdir",
    work,
    "--exclude",
    "realtime,imgproxy,mailpit,postgres-meta,studio,logflare,vector,supavisor",
  ]);
  const status = JSON.parse(
    await run(cli, ["status", "--workdir", work, "--output", "json"]),
  );
  const { url, anon, service } = assertLocalStatus(status);
  secrets.push(anon, service, status.DB_URL, status.JWT_SECRET);
  const fetchLocal = async (input, options = {}) => {
    const address = new URL(typeof input === "string" ? input : input.url);
    requireThat(address.origin === url, "HTTP probe escaped the local stack");
    return fetch(input, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
  };
  const client = (token = anon) =>
    createClient(url, anon, {
      auth: authOptions,
      global: {
        headers: { Authorization: "Bearer " + token },
        fetch: fetchLocal,
      },
    });
  const operator = createClient(url, service, {
    auth: authOptions,
    global: { fetch: fetchLocal },
  });
  const anonymous = client(),
    accounts = {};
  requireThat(
    (await sql("select count(*) from auth.users;")) === "0",
    "Local Auth is not empty; refusing to seed",
  );
  requireThat(
    (await sql("select count(*) from public.cp_memberships;")) === "0",
    "Local platform is not empty; refusing to seed",
  );
  await check("real Auth users and signed sessions", async () => {
    for (const name of ["owner", "a", "b", "unregistered"]) {
      const password = randomBytes(24).toString("base64url"),
        email = `${name}-${randomBytes(6).toString("hex")}@example.invalid`;
      secrets.push(password, email);
      const user = data(
        await operator.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
        "Synthetic Auth creation",
      ).user;
      const session = data(
        await client().auth.signInWithPassword({ email, password }),
        "Password sign-in",
      ).session;
      secrets.push(session.access_token, session.refresh_token);
      const actor = {
        id: user.id,
        email,
        token: session.access_token,
        client: client(session.access_token),
      };
      requireThat(
        data(await actor.client.auth.getUser(actor.token), "getUser").user
          .id === user.id,
        "Verified identity mismatch",
      );
      accounts[name] = actor;
    }
  });
  const { owner, a, b, unregistered } = accounts;
  requireThat(/^[a-f0-9-]{36}$/.test(owner.id), "Invalid synthetic owner ID");
  await sql(`select cp_private.bootstrap_owner('${owner.id}');`);
  const rpc = async (actor, name, args = {}) =>
    data(await actor.client.rpc(name, args), name);
  phase = "synthetic learner setup";
  for (const learner of [a, b]) {
    requireThat(
      (await rpc(owner, "cp_admin_register", {
        login_email: learner.email,
        learner_name: "Synthetic learner",
      })) === learner.id,
      "Registration did not resolve the verified Auth UUID",
    );
    requireThat(
      data(
        await learner.client.from("cp_sections").select("id"),
        "New learner access",
      ).length === 0,
      "Registration activated access automatically",
    );
    await rpc(owner, "cp_admin_save", {
      target: learner.id,
      expected_revision: 0,
      learner_name: "Synthetic learner",
      new_status: "active",
      allowed_sections: ["office.excel"],
    });
    await rpc(owner, "cp_set_learner", {
      target: learner.id,
      new_status: "active",
      new_name: "Synthetic learner",
    });
    await rpc(owner, "cp_set_section_grant", {
      target: learner.id,
      section: "office.excel",
      new_decision: "allow",
    });
  }
  await check(
    "administrator registration, access and professional profile writes",
    async () => {
      const group = await rpc(owner, "cp_admin_save_profile_group", {
        target: null,
        expected_revision: 0,
        new_name: "Synthetic trade profile",
        new_description: "Local test only",
      });
      await rpc(owner, "cp_admin_save_profile", {
        target: a.id,
        expected_revision: 0,
        new_profile: {
          background: "Synthetic import-export",
          difficulty: "beginner",
        },
        group_ids: [group],
      });
      const profile = await rpc(owner, "cp_admin_profile", { target: a.id });
      requireThat(
        profile.revision === "1" && profile.group_ids.includes(group),
        "Profile save did not persist",
      );
      requireThat(
        data(
          await a.client
            .from("cp_learning_profiles")
            .select("profile")
            .eq("user_id", a.id),
          "Own profile",
        ).length === 1,
        "A cannot read its profile",
      );
      requireThat(
        data(
          await b.client
            .from("cp_learning_profiles")
            .select("profile")
            .eq("user_id", a.id),
          "Other profile",
        ).length === 0,
        "B read A's profile",
      );
      denied(
        await a.client.rpc("cp_admin_profile", { target: b.id }),
        "Learner profile administration",
      );
    },
  );
  await check("final schema catalog through PostgreSQL 17", async () => {
    requireThat(
      (await sql(
        await readFile(join(platformRoot, "acceptance/catalog.sql"), "utf8"),
      )) === "",
      "Catalog preflight returned findings",
    );
  });
  await check(
    "anonymous, unregistered and learner administration denial",
    async () => {
      denied(await anonymous.rpc("cp_admin_directory"), "Anonymous directory");
      denied(await a.client.rpc("cp_admin_directory"), "Learner directory");
      requireThat(
        data(
          await unregistered.client.from("cp_sections").select("id"),
          "Unregistered sections",
        ).length === 0,
        "New user gained a section",
      );
      denied(
        await a.client
          .from("cp_memberships")
          .update({ role: "administrator" })
          .eq("user_id", a.id),
        "Self-promotion",
      );
      const metadata = await fetchLocal(url + "/auth/v1/user", {
        method: "PUT",
        headers: {
          apikey: anon,
          Authorization: "Bearer " + a.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { role: "administrator" } }),
      });
      requireThat(metadata.ok, "Synthetic user metadata update failed");
      denied(await a.client.rpc("cp_admin_directory"), "Metadata promotion");
    },
  );
  async function make(actor, type = "explanation", publish = true) {
    const target = await rpc(owner, "cp_admin_material_save", {
      target: null,
      expected_revision: 0,
      draft: {
        schema_version: 1,
        section_id: "office.excel",
        title: "Synthetic " + type,
        material_type: type,
        content:
          type === "tutorial"
            ? { format: "attachment" }
            : {
                format: "document",
                blocks: [
                  {
                    kind: "paragraph",
                    text: "Synthetic local acceptance content.",
                  },
                ],
              },
      },
    });
    if (publish) {
      await rpc(owner, "cp_admin_material_transition", {
        target,
        expected_revision: 1,
        next_state: "published",
        reviewed: true,
      });
      await rpc(owner, "cp_admin_material_assign", {
        target,
        expected_revision: 2,
        audience: {
          learners: [actor.id],
          groups: [],
          excluded: [],
          release_answers: false,
        },
      });
    }
    return target;
  }
  const lessonA = await make(a),
    lessonB = await make(b),
    draft = await make(a, "explanation", false),
    answers = await make(a, "answer_sheet");
  await check(
    "real REST and RPC isolate published assignments and answer release",
    async () => {
      requireThat(
        (await rpc(a, "cp_read_material", { target: lessonA })).owner_id ===
          a.id,
        "A's material owner mismatch",
      );
      for (const target of [lessonB, draft, answers])
        denied(
          await a.client.rpc("cp_read_material", { target }),
          "Unassigned/draft/answer read",
        );
      requireThat(
        data(
          await a.client
            .from("cp_material_versions")
            .select("id")
            .eq("id", lessonB),
          "Direct version read",
        ).length === 0,
        "Direct ID exposed B content",
      );
      requireThat(
        data(
          await a.client.from("cp_material_assignments").select("version_id"),
          "Assignment read",
        ).length === 0,
        "Assignment recipients exposed",
      );
    },
  );
  const operation = crypto.randomUUID(),
    write = {
      expected_owner: a.id,
      target: lessonA,
      section: "office.excel",
      record: "u9-note",
      record_kind: "note",
      expected_revision: 0,
      operation,
      new_value: { version: 1, text: "Synthetic durable note" },
    };
  await check(
    "real token CAS, retry, conflict and cross-account denial",
    async () => {
      const first = await rpc(a, "cp_sync_write", write),
        retry = await rpc(a, "cp_sync_write", write);
      requireThat(
        first.status === "saved" &&
          first.revision === "1" &&
          JSON.stringify(first) === JSON.stringify(retry),
        "Lost-ack retry changed the result",
      );
      const conflict = await rpc(a, "cp_sync_write", {
        ...write,
        operation: crypto.randomUUID(),
        new_value: { version: 1, text: "Other device" },
      });
      requireThat(
        conflict.status === "conflict" &&
          conflict.value.text === write.new_value.text,
        "Stale revision overwrote progress",
      );
      denied(
        await b.client.rpc("cp_sync_write", write),
        "B token with A owner",
      );
      requireThat(
        data(
          await b.client
            .from("cp_study_state")
            .select("record_id")
            .eq("user_id", a.id),
          "B direct state read",
        ).length === 0,
        "B saw A state",
      );
      denied(
        await a.client
          .from("cp_study_state")
          .update({ value: {} })
          .eq("user_id", a.id),
        "Raw progress write",
      );
    },
  );
  const keys = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const privateJwk = JSON.stringify(
    await crypto.subtle.exportKey("jwk", keys.privateKey),
  );
  secrets.push(privateJwk);
  const envFile = join(work, "edge.env");
  await writeFile(
    envFile,
    `COMMONPLACE_APP_ORIGIN=${origin}\nCOMMONPLACE_PROJECT_NAMESPACE=${namespace}\nCOMMONPLACE_OFFLINE_HOURS=1\nCOMMONPLACE_OFFLINE_PRIVATE_JWK=${privateJwk}\n`,
    { mode: 0o600 },
  );
  server = spawn(
    cli,
    ["functions", "serve", "--workdir", work, "--env-file", envFile],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  for (const stream of [server.stdout, server.stderr])
    stream.on("data", (b) => {
      serverLog = (serverLog + b).slice(-30000);
    });
  server.on("error", (e) => {
    serverLog += e.message;
  });
  const edge = (actor, name, headers = {}, body) =>
    fetchLocal(url + "/functions/v1/" + name, {
      method: "POST",
      headers: {
        Origin: origin,
        apikey: anon,
        Authorization: "Bearer " + (actor?.token || anon),
        ...headers,
      },
      body,
    });
  phase = "local Edge startup";
  let ready = false,
    startupStatus = "no response";
  const startupDeadline = Date.now() + 120000;
  while (Date.now() < startupDeadline) {
    try {
      const r = await edge(a, "offline-lease", {
        "x-cp-section": "office.excel",
      });
      if (r.ok) {
        ready = true;
        break;
      }
      startupStatus = "HTTP " + r.status;
      await r.arrayBuffer();
    } catch (error) {
      startupStatus = error.message;
    }
    if (server.exitCode !== null) break;
    await pause(1000);
  }
  requireThat(
    ready,
    "Edge runtime did not become ready (" +
      startupStatus +
      "): " +
      safeDiagnostic(serverLog, secrets),
  );
  const attachment = await make(a, "tutorial", false),
    text = "Local private workbook practice: 12 + 8 + 5 = 25.\n";
  const fileHeaders = {
    "x-cp-action": "upload",
    "x-cp-version": attachment,
    "x-cp-revision": "1",
    "x-cp-filename": "Acceptance.txt",
    "Content-Type": "application/octet-stream",
  };
  await check(
    "Edge upload validates the admin and stores immutable private bytes",
    async () => {
      requireThat(
        (await edge(a, "material-files", fileHeaders, text)).status === 403,
        "Learner upload accepted",
      );
      const ok = await edge(owner, "material-files", fileHeaders, text);
      requireThat(ok.ok, "Authorized upload failed (HTTP " + ok.status + ")");
      const detail = await rpc(owner, "cp_admin_material_detail", {
        target: attachment,
      });
      await rpc(owner, "cp_admin_material_transition", {
        target: attachment,
        expected_revision: detail.revision,
        next_state: "published",
        reviewed: true,
      });
      const updated = await rpc(owner, "cp_admin_material_detail", {
        target: attachment,
      });
      await rpc(owner, "cp_admin_material_assign", {
        target: attachment,
        expected_revision: updated.revision,
        audience: {
          learners: [a.id],
          groups: [],
          excluded: [],
          release_answers: false,
        },
      });
    },
  );
  const download = { "x-cp-action": "download", "x-cp-version": attachment };
  await check(
    "private download positive control and direct Storage URL/signing denial",
    async () => {
      const ok = await edge(a, "material-files", download);
      requireThat(
        ok.ok && (await ok.text()) === text,
        "Authorized file bytes did not round-trip",
      );
      requireThat(
        ok.headers.get("cache-control") === "no-store",
        "Private bytes are cacheable",
      );
      requireThat(
        (await edge(b, "material-files", download)).status === 403,
        "B downloaded A's file",
      );
      requireThat(
        [401, 403].includes(
          (await edge(null, "material-files", download)).status,
        ),
        "Anonymous file download accepted",
      );
      requireThat(
        (
          await edge(a, "material-files", {
            ...download,
            Authorization: "Bearer deliberately-invalid-token",
          })
        ).status === 401,
        "Invalid JWT file request accepted",
      );
      requireThat(
        (
          await edge(a, "material-files", {
            ...download,
            Origin: "https://wrong.invalid",
          })
        ).status === 403,
        "Wrong Origin accepted",
      );
      const asset = (await rpc(a, "cp_read_material", { target: attachment }))
        .asset;
      for (const c of [anonymous, a.client, b.client, owner.client]) {
        requireThat(
          !!(await c.storage.from("cp-materials").download(asset.path)).error,
          "Direct Storage download accepted",
        );
        requireThat(
          !!(
            await c.storage.from("cp-materials").createSignedUrl(asset.path, 60)
          ).error,
          "Client minted a signed URL",
        );
      }
      const publicURL = await fetchLocal(
        url + "/storage/v1/object/public/cp-materials/" + asset.path,
      );
      requireThat(!publicURL.ok, "Private object has a public URL");
    },
  );
  await check(
    "real Edge lease binds signed owner, origin and exact assigned content",
    async () => {
      const r = await edge(a, "offline-lease", {
        "x-cp-section": "office.excel",
      });
      requireThat(r.ok, "Lease denied for authorized A");
      const lease = await verifyLease(await r.json(), keys.publicKey, {
        namespace,
        origin,
        owner: a.id,
      });
      requireThat(
        lease.profile.background === "Synthetic import-export" &&
          lease.materials.some((m) => m.id === attachment) &&
          !lease.materials.some((m) =>
            [lessonB, draft, answers].includes(m.id),
          ),
        "Lease contents bypass assignment/release rules",
      );
      requireThat(
        (
          await edge(a, "offline-lease", {
            "x-cp-section": "office.excel",
            Origin: "https://wrong.invalid",
          })
        ).status === 403,
        "Wrong lease Origin accepted",
      );
      requireThat(
        [401, 403].includes(
          (
            await edge(null, "offline-lease", {
              "x-cp-section": "office.excel",
            })
          ).status,
        ),
        "Anonymous lease accepted",
      );
      requireThat(
        (
          await edge(a, "offline-lease", {
            "x-cp-section": "office.excel",
            Authorization: "Bearer deliberately-invalid-token",
          })
        ).status === 401,
        "Invalid JWT lease request accepted",
      );
    },
  );
  await check(
    "revocation rejects unchanged signed JWT through REST, RPC, files and leases",
    async () => {
      await rpc(owner, "cp_set_learner", {
        target: a.id,
        new_status: "revoked",
        new_name: "Synthetic learner",
      });
      // The same actor/client/token is intentionally reused: no logout or token refresh.
      denied(
        await a.client.rpc("cp_read_material", { target: lessonA }),
        "Revoked material",
      );
      denied(
        await a.client.rpc("cp_sync_write", write),
        "Revoked queued operation",
      );
      requireThat(
        data(
          await a.client.from("cp_sections").select("id"),
          "Revoked sections",
        ).length === 0,
        "Revoked token lists sections",
      );
      requireThat(
        (await edge(a, "material-files", download)).status === 403,
        "Revoked file delivered",
      );
      requireThat(
        (await edge(a, "offline-lease", { "x-cp-section": "office.excel" }))
          .status === 403,
        "Revoked lease renewed",
      );
      requireThat(
        (await sql("select count(*) from cp_study_state;")) === "1",
        "Revocation deleted study state",
      );
    },
  );
  await sharedAccessAcceptance({
    sql,
    check,
    client,
    owner,
    rpc,
    data,
    denied,
    requireThat,
    pause,
    secrets,
  });
  console.log(
    `PASS ${passed} local Supabase integration groups; hosted/device approval remains pending.`,
  );
}
try {
  await main();
} catch (error) {
  console.error(
    "FAIL " + phase + ": " + safeDiagnostic(error.message, secrets),
  );
  process.exitCode = 1;
} finally {
  server?.kill("SIGTERM");
  if (work && id) {
    // ID and workdir are freshly generated by this process. Never --all or remote.
    try {
      await run(cli, [
        "stop",
        "--workdir",
        work,
        "--project-id",
        id,
        "--no-backup",
      ]);
    } catch {
      console.error("Disposable stack cleanup needs attention.");
      process.exitCode = 1;
    }
    await rm(work, { recursive: true, force: true });
  }
}
