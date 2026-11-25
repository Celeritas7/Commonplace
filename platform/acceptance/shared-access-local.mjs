// Called only by full-stack.mjs after its loopback/container/environment guards.
// All identities, records and attestations below belong to that disposable stack.
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { legacyFixture } from "../tests/shared-access-fixture.mjs";

export async function sharedAccessAcceptance({
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
}) {
  const candidate = (name) =>
    readFile(
      new URL("../operations/general-apps/" + name, import.meta.url),
      "utf8",
    );
  const tag = randomBytes(8).toString("hex");
  const email = `cp-admission-${tag}@example.invalid`,
    password = randomBytes(24).toString("base64url");
  secrets.push(email, password);
  let actor, admission;
  const signupRow = async id => (await rpc(owner, "cp_admin_signup_directory")).find(row => row.id === id);
  await check(
    "review candidates reject closed real Auth signup and enforce administrator preparation",
    async () => {
      await sql(legacyFixture);
      for (const name of [
        "01_access_foundation.sql",
        "03_roadmap_session_owner.sql",
        "04_commonplace_signup.sql",
      ])
        await sql(await candidate(name));
      await sql(
        "insert into ga_private.client_cutovers values('code-sensei','synthetic fixture only',now()),('healthlog-archive','synthetic fixture only',now()),('eagle','synthetic fixture only',now());",
      );
      await sql(await candidate("02_legacy_policy_guards.sql"));
      await sql("notify pgrst,'reload schema';");
      let visible = false;
      for (let i = 0; i < 30; i++) {
        const r = await owner.client.rpc("cp_admin_signup_directory");
        if (!r.error) {
          visible = true;
          break;
        }
        if (r.error.code !== "PGRST202") data(r, "signup schema refresh");
        await pause(250);
      }
      requireThat(visible, "Candidate RPC schema did not refresh");
      admission = await rpc(owner, "cp_admin_prepare_signup", {
        login_email: email,
        valid_hours: 1,
      });
      const refused = await client().auth.signUp({ email, password });
      requireThat(!!refused.error, "Closed admission permitted signup");
      requireThat(
        (await sql(
          `select count(*) from auth.users where email='${email}';`,
        )) === "0",
        "Closed signup created identity",
      );
      requireThat(
        (await sql(
          "select count(*) from cp_private.signup_admissions where claimed_user_id is not null;",
        )) === "0",
        "Closed signup consumed admission",
      );
    },
  );
  await check(
    "real Auth binds CP-only identity without legacy roles and preserves legacy viewer signup",
    async () => {
      await sql(
        "update cp_private.signup_control set enabled=true where id=true;",
      );
      const result = data(
        await client().auth.signUp({
          email,
          password,
          options: { data: { role: "administrator" } },
        }),
        "CP-only local signup",
      );
      requireThat(result.user && !result.session, "Signup must wait for mailbox confirmation");
      const pending = await signupRow(admission);
      requireThat(pending.state === "awaiting_confirmation", "Expected an unverified reservation");
      denied(await owner.client.rpc("cp_admin_complete_signup", {
        admission, expected_revision: pending.revision, learner_name: "Synthetic learner",
      }), "Unverified completion", "22023");

      // Only the disposable Mailpit inbox receives this synthetic confirmation.
      const options = {redirect:"error", signal:AbortSignal.timeout(5000)};
      const inbox = "http://127.0.0.1:54324/api/v1";
      let messageId;
      for (let attempt=0; attempt<40 && !messageId; attempt++) {
        const response = await fetch(inbox + "/messages", options);
        requireThat(response.ok, "Local confirmation inbox unavailable");
        const page = await response.json();
        messageId = page.messages.find(m => m.To.some(recipient => recipient.Address === email))?.ID;
        if (!messageId) await pause(100);
      }
      requireThat(!!messageId, "Synthetic confirmation was not delivered");
      const message = await (await fetch(inbox + "/message/" + encodeURIComponent(messageId), {
        redirect:"error", signal:AbortSignal.timeout(5000),
      })).json();
      const href = message.HTML.match(/href=["']([^"']*\/verify\?[^"']+)["']/i)?.[1];
      requireThat(!!href, "Missing confirmation link in local message");
      const token = new URL(href.replaceAll("&amp;", "&")).searchParams.get("token");
      requireThat(!!token, "Missing local confirmation token");
      secrets.push(token);
      const verified = data(await client().auth.verifyOtp({token_hash:token,type:"signup"}), "Mailbox confirmation");
      requireThat(verified.session && verified.user.id === result.user.id, "Confirmation changed reserved identity");
      secrets.push(verified.session.access_token, verified.session.refresh_token);
      const identity = verified.user.id;
      requireThat(/^[a-f0-9-]{36}$/.test(identity), "Invalid fixture UUID");
      actor = { id: identity, client: client(verified.session.access_token) };
      requireThat(
        data(await actor.client.auth.getUser(), "new identity verification")
          .user.id === identity,
        "New Auth identity not verified",
      );
      for (const [table, column] of [
        ["authentication_mode_user_roles", "auth_user_id"],
        ["chatak_profiles", "id"],
        ["alarm_settings", "user_id"],
        ["cp_memberships", "user_id"],
      ])
        requireThat(
          (await sql(
            `select count(*) from public.${table} where ${column}='${identity}';`,
          )) === "0",
          "Unexpected signup side effect: " + table,
        );
      denied(
        await actor.client.rpc("cp_admin_prepare_signup", {
          login_email: `spoof-${tag}@example.invalid`,
          valid_hours: 1,
        }),
        "Learner prepares signup",
      );
      requireThat(
        data(
          await actor.client.from("code_sensei_user_notes").select("id"),
          "New learner notes denial",
        ).length === 0,
        "New learner saw legacy notes",
      );
      requireThat(
        data(
          await actor.client.from("eagle_unit_progress").select("id"),
          "New learner shared workspace denial",
        ).length === 0,
        "New learner saw legacy workspace",
      );
      requireThat(
        data(
          await actor.client.rpc("ga_can_call_edge", {
            requested_function: "code-exec",
          }),
          "New learner execution denial",
        ) === false,
        "New learner gained execution entitlement",
      );
      denied(await owner.client.rpc("cp_admin_register", {login_email:email,learner_name:"Synthetic learner"}),
        "Email-only completion", "CP001");
      const ready = await signupRow(admission);
      requireThat(ready.state === "verified", "Confirmation was not reflected in the directory");
      requireThat(
        (await rpc(owner, "cp_admin_complete_signup", {
          admission, expected_revision:ready.revision,
          learner_name: "Synthetic learner",
        })) === identity,
        "Registration lost UUID binding",
      );
      requireThat(
        data(
          await actor.client.from("cp_sections").select("id"),
          "Default-deny sections",
        ).length === 0,
        "Signup granted study access",
      );
      const legacyEmail = `legacy-admission-${tag}@example.invalid`;
      secrets.push(legacyEmail);
      await sql(
        `insert into public.authentication_mode_user_roles(id,email,role) values(1,'${legacyEmail}','viewer');`,
      );
      const legacy = data(
        await client().auth.signUp({
          email: legacyEmail,
          password,
          options: { data: { role: "admin" } },
        }),
        "Legacy local signup",
      );
      requireThat(
        legacy.user && /^[a-f0-9-]{36}$/.test(legacy.user.id),
        "Invalid legacy Auth UUID",
      );
      if (legacy.session)
        secrets.push(legacy.session.access_token, legacy.session.refresh_token);
      requireThat(
        (await sql(
          `select role from public.authentication_mode_user_roles where auth_user_id='${legacy.user.id}';`,
        )) === "viewer",
        "Legacy role changed",
      );
      requireThat(
        (await sql(
          `select count(*) from public.chatak_profiles where id='${legacy.user.id}';`,
        )) === "1",
        "Legacy profile missing",
      );
      requireThat(
        (await sql(
          `select count(*) from public.alarm_settings where user_id='${legacy.user.id}';`,
        )) === "1",
        "Legacy settings missing",
      );
    },
  );
  await check("a signup waiting across the expiry deadline leaves the reservation unused", async () => {
    const address = `wait-${tag}@example.invalid`;
    const id = await rpc(owner,"cp_admin_prepare_signup",{login_email:address});
    requireThat(/^[0-9a-f-]{36}$/.test(id), "Invalid admission ID");
    secrets.push(address);
    // A signal in pg_locks proves the holder has the row. It changes the deadline
    // only after a second backend is demonstrably blocked on that same transaction.
    const holder = sql(`begin;
      select id from cp_private.signup_admissions where id='${id}' for update;
      select pg_advisory_xact_lock(7397,1);
      do $$ begin
        for attempt in 1..200 loop
          perform pg_stat_clear_snapshot();
          exit when exists(select from pg_stat_activity where application_name='cp_expiry_waiter'
            and pg_backend_pid()=any(pg_blocking_pids(pid)));
          if attempt=200 then raise exception 'expiry waiter never blocked'; end if;
          perform pg_sleep(0.05);
        end loop;
      end $$;
      update cp_private.signup_admissions set expires_at=clock_timestamp() where id='${id}';
      commit;`);
    const waiter = async () => {
      let locked = false;
      for (let attempt=0;attempt<40 && !locked;attempt++) {
        locked = await sql("select exists(select from pg_locks where locktype='advisory' and classid=7397 and objid=1 and granted)") === "t";
        if (!locked) await pause(50);
      }
      requireThat(locked, "Expiry fixture did not acquire the row");
      let refused = false;
      try {
        await sql(`begin; set local application_name='cp_expiry_waiter';
          insert into auth.users(id,email) values(gen_random_uuid(),'${address}'); commit;`);
      } catch(error) { if (!error.message.includes("not_allowed")) throw error; refused=true; }
      requireThat(refused, "Waiting signup ignored elapsed expiry");
    };
    await Promise.all([holder,waiter()]);
    requireThat((await signupRow(id)).claimed_user_id === null, "Expired claim persisted");
  });
  await check(
    "concurrent real signups claim one admission and containment retains identities and work",
    async () => {
      const concurrentEmail = `concurrent-admission-${tag}@example.invalid`;
      secrets.push(concurrentEmail);
      await rpc(owner, "cp_admin_prepare_signup", {
        login_email: concurrentEmail,
        valid_hours: 1,
      });
      const results = await Promise.all([
        client().auth.signUp({ email: concurrentEmail, password }),
        client().auth.signUp({ email: concurrentEmail, password }),
      ]);
      for (const r of results)
        if (r.data?.session)
          secrets.push(
            r.data.session.access_token,
            r.data.session.refresh_token,
          );
      requireThat(
        results.some((r) => !r.error && r.data.user),
        "No concurrent signup succeeded",
      );
      requireThat(
        (await sql(
          `select count(*) from auth.users where email='${concurrentEmail}';`,
        )) === "1",
        "Duplicate Auth identities",
      );
      requireThat(
        (await sql(
          `select count(*) from cp_private.signup_admissions s join auth.users u on u.id=s.claimed_user_id where s.email='${concurrentEmail}' and u.email=s.email;`,
        )) === "1",
        "Admission not bound once",
      );
      await sql(await candidate("90_containment.sql"));
      requireThat(
        (await sql(
          "select enabled from cp_private.signup_control where id=true;",
        )) === "f",
        "Containment did not close signup",
      );
      requireThat(
        (await sql(
          `select count(*) from auth.users where id='${actor.id}';`,
        )) === "1",
        "Containment deleted identity",
      );
      requireThat(
        (await sql("select count(*) from public.cp_study_state;")) === "1",
        "Containment deleted existing study work",
      );
    },
  );
}
