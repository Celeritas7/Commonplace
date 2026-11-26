// Called only by full-stack.mjs after its loopback/container/environment guards.
// All identities, records and attestations below belong to that disposable stack.
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { roadmapDailyAcceptance } from "./roadmap-daily-local.mjs";
import { roadmapRecordsAcceptance } from "./roadmap-records-local.mjs";
import {roadmapCreationAcceptance} from "./roadmap-task-creation-local.mjs";
import {roadmapLogAcceptance} from "./roadmap-log-entries-local.mjs";
import {roadmapTaskEditsAcceptance} from "./roadmap-task-edits-local.mjs";
import {roadmapResetAcceptance} from "./roadmap-reset-local.mjs";
import {roadmapImportAcceptance} from "./roadmap-import-local.mjs";
import { roadmapComparisonAcceptance } from "./roadmap-comparison-local.mjs";
import { legacyFixture } from "../tests/shared-access-fixture.mjs";
import { eagleWorkspaceAcceptance } from "./eagle-workspace-local.mjs";
import { eagleFixture } from "../tests/eagle-workspace-fixture.mjs";
import { healthlogArchiveAcceptance } from "./healthlog-archive-local.mjs";

export async function sharedAccessAcceptance({
  edge,
  a, b, unregistered,
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
  let actor, admission, baselineLegacy;
  const signupRow = async id => (await rpc(owner, "cp_admin_signup_directory")).find(row => row.id === id);
  const legacyA = randomUUID(), legacyB = randomUUID(), task = randomUUID(), unit = randomUUID();
  // Keep both connections alive until PostgreSQL confirms the expected blocker.
  async function withBlockedWriter(lockId, holding, waiting, expectedError) {
    const name = "cp_part2_waiter_" + lockId;
    const holder = sql(`begin; ${holding};
      select pg_advisory_xact_lock(7398,${lockId});
      do $$ begin
        for attempt in 1..300 loop
          perform pg_stat_clear_snapshot();
          exit when exists(select from pg_stat_activity where application_name='${name}'
            and pg_backend_pid()=any(pg_blocking_pids(pid)));
          if attempt=300 then raise exception 'expected waiter never blocked'; end if;
          perform pg_sleep(0.05);
        end loop;
      end $$; commit;`);
    const waiter = async () => {
      let locked = false;
      for (let attempt=0; attempt<60 && !locked; attempt++) {
        locked = await sql(`select exists(select from pg_locks where locktype='advisory'
          and classid=7398 and objid=${lockId} and granted)`) === "t";
        if (!locked) await pause(50);
      }
      requireThat(locked,"Concurrent test did not acquire its lock");
      await assert.rejects(() => sql(`set application_name='${name}'; ${waiting}`),expectedError);
    };
    const results = await Promise.allSettled([holder,waiter()]);
    for (const result of results) if (result.status === "rejected") throw result.reason;
  }

  await check("hardened legacy Auth rejects anonymous signup and retains the approved viewer role", async () => {
    await sql(legacyFixture);
    await sql(eagleFixture);
    await sql(await readFile(new URL("../tests/roadmap-session-fixture.sql",import.meta.url),"utf8"));
    await sql(await readFile(new URL("../tests/roadmap-records-fixture.sql",import.meta.url),"utf8"));
    await sql(await readFile(new URL('../tests/code-sensei-fixture.sql', import.meta.url), 'utf8'));
    await sql(await readFile(new URL('../tests/healthlog-archive-fixture.sql', import.meta.url), 'utf8'));
    const address=`legacy-baseline-${tag}@example.invalid`;
    secrets.push(address);
    await sql(`insert into public.authentication_mode_user_roles(id,email,role) values(70,'${address}','viewer')`);
    await assert.rejects(() => sql(`insert into auth.users(id,email,is_anonymous)
      values('${randomUUID()}','${address}',true)`), /not_allowed/);
    const result=data(await client().auth.signUp({email:address,password,options:{data:{role:"admin"}}}),"Hardened baseline signup");
    requireThat(result.user && /^[a-f0-9-]{36}$/.test(result.user.id),"Missing baseline identity");
    baselineLegacy=result.user.id;
    if(result.session) secrets.push(result.session.access_token,result.session.refresh_token);
    assert.equal(await sql(`select role from public.authentication_mode_user_roles where auth_user_id='${baselineLegacy}'`),"viewer");
    assert.equal(await sql(`select count(*) from public.chatak_profiles where id='${baselineLegacy}'`),"1");
    assert.equal(await sql(`select count(*) from public.alarm_settings where user_id='${baselineLegacy}'`),"1");
  });

  await check("ownership cutover observes committed mapping changes and preserves records on refusal", async () => {
    const roleHelper=await sql("select pg_get_functiondef('public.chatak_role()'::regprocedure)");
    for (const name of ["01_access_foundation.sql","03_roadmap_session_owner.sql","04_commonplace_signup.sql"])
      await sql(await candidate(name));
    assert.equal(await sql("select pg_get_functiondef('public.chatak_role()'::regprocedure)"),roleHelper);
    assert.equal(await sql(`select role from public.authentication_mode_user_roles where auth_user_id='${baselineLegacy}'`),"viewer");
    assert.equal(await sql(`select count(*) from public.chatak_profiles where id='${baselineLegacy}'`),"1");
    assert.equal(await sql(`select count(*) from public.alarm_settings where user_id='${baselineLegacy}'`),"1");
    await sql(`insert into public.code_sensei_users(id) values('${legacyA}'),('${legacyB}');
      insert into public.code_sensei_user_notes(user_id,topic_id,note_text) values('${legacyA}','fixture','A'),('${legacyB}','fixture','B');
      insert into public.healthlog_visits_old(user_id,notes,clinic_name,visit_date,concern)
       values('archive-a','A','Synthetic A','2026-01-01','Fixture'),('archive-b','B','Synthetic B','2026-01-02','Fixture');
      insert into public.authentication_mode_user_roles(id,email,role,auth_user_id)
       select n,u.email,r,u.id from (values(81,'viewer','${a.id}'::uuid),(82,'operator','${b.id}'),
        (83,'admin','${owner.id}'),(84,'admin','${unregistered.id}')) s(n,r,id) join auth.users u using(id);
      insert into ga_private.eagle_members values('${a.id}'),('${b.id}'),('${owner.id}');
      insert into public.logi_projects(id,name) values('${unit}','Early project');
      insert into public.logi_assemblies(id,project_id,name) values('${unit}','${unit}','Early assembly');
      insert into public.logi_nodes(id,assembly_id,name) values('${unit}','${unit}','Early node');
      insert into public.eagle_units(id,assembly_id,name) values('${unit}','${unit}','Early unit');
      insert into public.eagle_unit_progress(unit_id,node_id,notes) values('${unit}','${unit}','saved');
      insert into public.roadmap_tasks(id,user_id,title) values('${task}','${a.id}','Synthetic session task');
      insert into ga_private.owner_links(app,legacy_id,auth_user_id) values
       ('code-sensei','${legacyA}','${a.id}'),('code-sensei','${legacyB}','${b.id}'),
       ('healthlog-archive','archive-a','${a.id}'),('healthlog-archive','archive-b','${b.id}');
      insert into ga_private.client_cutovers values('code-sensei','synthetic fixture only',now()),
       ('healthlog-archive','synthetic fixture only',now()),('eagle','synthetic fixture only',now());`);
    const installPolicies = await candidate("02_legacy_policy_guards.sql");
    await withBlockedWriter(1,
      "delete from ga_private.owner_links where legacy_id='archive-a'",
      installPolicies,/verified owner mapping required/);
    assert.equal(await sql("select count(*) from pg_policies where policyname='ga_owner_guard'"),"0");
    assert.equal(await sql("select count(*) from public.code_sensei_user_notes"),"2");
    await sql(`insert into ga_private.owner_links(app,legacy_id,auth_user_id) values('healthlog-archive','archive-a','${a.id}')`);
    await sql(installPolicies);
    await sql(await candidate('05_code_sensei_isolation.sql'));
  });
  await check(
    "review candidates reject closed real Auth signup and enforce administrator preparation",
    async () => {
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
      assert.deepEqual(await rpc(owner, "cp_admin_signup_status"), { status: "paused" });
      denied(await client().rpc("cp_admin_signup_status"), "Anonymous signup status");
      for (const learner of [a, b, unregistered])
        denied(await learner.client.rpc("cp_admin_signup_status"), "Learner signup status");
      await sql("delete from cp_private.signup_control where id=true;");
      assert.deepEqual(await rpc(owner, "cp_admin_signup_status"), { status: "unavailable" });
      await sql("insert into cp_private.signup_control values(true,false);");
      admission = await rpc(owner, "cp_admin_prepare_signup", {
        login_email: email,
        valid_hours: 1,
      });
      assert.deepEqual(await rpc(owner, "cp_admin_signup_status"), { status: "paused" });
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
    "signed candidate Edge handlers reserve shared quota and honor route pauses with fake providers",
    async () => {
      const run = (actor, route, body) =>
        edge(
          actor,
          route,
          { "content-type": "application/json" },
          JSON.stringify(body),
        );
      const cpp = { source_code: "int main(){}" },
        ai = { messages: [{ role: "user", content: "fixture" }] };
      await sql(`update ga_private.edge_routes set daily_limit=3,user_daily_limit=2 where function_name='code-exec';
      insert into ga_private.edge_grants values('code-exec','${a.id}',now()+interval '1 day',false),
       ('code-exec','${b.id}',now()+interval '1 day',false),('claude-proxy','${a.id}',now()+interval '1 day',false);`);
      const outcomes = await Promise.all(
        Array.from({ length: 3 }, () => run(a, "code-exec", cpp)),
      );
      assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 200, 429]);
      assert.equal(
        (await outcomes.find((r) => r.ok).json()).stdout,
        "synthetic output",
      );
      assert.equal((await run(b, "code-exec", cpp)).status, 200);
      assert.equal((await run(b, "code-exec", cpp)).status, 429);
      assert.equal(
        await sql(
          `select used from ga_private.edge_user_usage where auth_user_id='${b.id}' and function_name='code-exec'`,
        ),
        "1",
      );
      assert.equal((await run(b, "claude-proxy", ai)).status, 403);
      denied(
        await a.client.rpc("ga_reserve_edge", {
          requested_function: "claude-proxy",
          verified_user: b.id,
        }),
        "Client reservation",
      );
      assert.equal(
        (await run(a, "claude-proxy", { messages: [] })).status,
        400,
      );
      assert.equal(
        (await (await run(a, "claude-proxy", ai)).json()).content[0].text,
        "synthetic answer",
      );
      await sql(
        "update ga_private.edge_routes set paused=true where function_name='claude-proxy'",
      );
      assert.equal((await run(a, "claude-proxy", ai)).status, 403);
      assert.equal(
        await sql(
          "select n from public.akatsuki_fn_budget where fn='claude-proxy'",
        ),
        "1",
      );
      await sql(
        "update ga_private.edge_routes set paused=false where function_name='claude-proxy'",
      );
      assert.equal((await run(a, "claude-proxy", ai)).status, 200);
      // Change a grant under lock while the server reservation is waiting.
      await withBlockedWriter(
        3,
        `update ga_private.edge_grants set revoked=true where function_name='claude-proxy' and auth_user_id='${a.id}'`,
        `set role service_role; select public.ga_reserve_edge('claude-proxy','${a.id}')`,
        /grant unavailable/,
      );
      assert.equal(
        await sql(
          "select n from public.akatsuki_fn_budget where fn='claude-proxy'",
        ),
        "2",
      );
    },
  );
  await check("signed clients retain their own notes, archive entries and Eagle workspace roles", async () => {
    for (const [user,legacy,marker] of [[a,legacyA,"A"],[b,legacyB,"B"]]) {
      assert.equal(await rpc(user,"code_sensei_current_user_id"),legacy);
      assert.deepEqual(data(await user.client.from("code_sensei_user_notes").select("note_text"),"Owner note"),[{note_text:marker}]);
      assert.deepEqual(data(await user.client.from("healthlog_visits_old").select("notes"),"Owner archive"),[{notes:marker}]);
    }
    assert.deepEqual(data(await a.client.from("code_sensei_user_notes").update({note_text:"wrong"}).eq("user_id",legacyB).select("id"),"Foreign update"),[]);
    denied(await a.client.from("code_sensei_user_notes").update({user_id:legacyB}).eq("user_id",legacyA),"Owner reassignment");
    assert.deepEqual(data(await b.client.from("code_sensei_user_notes").update({note_text:"B edited"}).eq("user_id",legacyB).select("note_text"),"Owner edit"),[{note_text:"B edited"}]);
    assert.equal(data(await a.client.from("eagle_unit_progress").select("id"),"Viewer read").length,1);
    assert.deepEqual(data(await a.client.from("eagle_units").delete().eq("id",unit).select("id"),"Viewer delete"),[]);
    assert.deepEqual(data(await unregistered.client.from("eagle_unit_progress").select("id"),"Unlisted shared admin"),[]);
    assert.equal(data(await b.client.from("eagle_unit_progress").update({notes:"edited"}).eq("unit_id",unit).select("id"),"Operator edit").length,1);
    assert.equal(data(await owner.client.from("eagle_unit_progress").select("id"),"Eagle admin read").length,1);
  });
  await check('Code_sensei private records and their children reject another account and an unregistered JWT', async () => {
    const created = {};
    const own = async (table, payload) => data(await a.client.from(table).insert(payload).select('*').single(), table);
    for (const [table, payload] of [
      ['code_sensei_progress',{roadmap_section:'practice',topic_id:'fixture',status:'done'}],
      ['code_sensei_chat_history',{topic_id:'fixture',role:'user',message:'Retained chat'}],
      ['code_sensei_revisions',{project_name:'fixture',revision_name:'one'}],
      ['code_sensei_streaks',{study_date:'2026-11-26'}],
      ['code_sensei_py_projects',{project_name:'fixture',view_mode:'single'}],
      ['code_sensei_notebooks',{title:'fixture',url:'https://example.invalid/notebook'}],
      ['code_sensei_exercises',{title:'fixture',category:'compose',language:'python'}],
      ['code_sensei_player',{xp:42}],['code_sensei_daily',{day:'2026-11-26'}],
      ['code_sensei_wrong_answers',{challenge_id:'fixture',topic_id:'fixture',question:'Q',correct_answer:'A'}],
    ]) created[table] = await own(table,{...payload,user_id:legacyA});
    created.code_sensei_attempts=await own('code_sensei_attempts',{exercise_id:created.code_sensei_exercises.id,attempt_number:1,code:'retained'});
    created.code_sensei_mistakes=await own('code_sensei_mistakes',{exercise_id:created.code_sensei_exercises.id,attempt_id:created.code_sensei_attempts.id,language:'python',title:'retained'});
    created.code_sensei_py_files=await own('code_sensei_py_files',{project_id:created.code_sensei_py_projects.id,filename:'main.py',code_content:'retained'});
    created.code_sensei_revision_files=await own('code_sensei_revision_files',{revision_id:created.code_sensei_revisions.id,filename:'main.py',language:'python',file_content:'retained'});
    for (const [table, row] of Object.entries(created)) {
      for (const outsider of [b,unregistered]) {
        assert.deepEqual(data(await outsider.client.from(table).select('id').eq('id',row.id),'Foreign read'),[]);
        // Some retained source tables intentionally have no DELETE policy.
        const deletion=await outsider.client.from(table).delete().eq('id',row.id).select('id');
        if(deletion.error) denied(deletion,'Foreign deletion'); else assert.deepEqual(deletion.data,[]);
      }
      assert.equal(data(await a.client.from(table).select('id').eq('id',row.id),'Retained row').length,1);
      denied(await client().from(table).select('id'),'Anonymous read');
    }
    for(const table of ['code_sensei_users','code_sensei_user_notes'])assert.deepEqual(data(await unregistered.client.from(table).select('id'),'Unmapped identity'),[]);
    for(const table of ['code_sensei_challenges','code_sensei_course_days','code_sensei_diff_explanations','code_sensei_ecosystems','code_sensei_lesson_steps','code_sensei_lessons','code_sensei_line_explanations']) {
      assert.deepEqual(data(await unregistered.client.from(table).select('*'),'Unmapped curriculum'),[]);
      denied(await client().from(table).select('id'),'Anonymous curriculum');
    }
  });
  await check('Code_sensei concurrent retries save once and failed project replacement keeps old files', async () => {
    const exercise=data(await a.client.from('code_sensei_exercises').select('id').single(),'Saved exercise').id;
    const operation={operation_id:randomUUID(),payload:{table:'code_sensei_attempts',action:'post',data:{exercise_id:exercise,attempt_number:2,code:'retry-safe'}}};
    const [first,again]=await Promise.all([rpc(a,'code_sensei_apply_offline',operation),rpc(a,'code_sensei_apply_offline',operation)]);
    assert.deepEqual(first,again);
    assert.equal(data(await a.client.from('code_sensei_attempts').select('id').eq('attempt_number',2),'Single attempt').length,1);
    const original=[{filename:'atomic.py',code_content:'retained bytes'}];
    const save={project_id:null,project_name:'Atomic',view_mode:'single',files:original};
    const project=await rpc(a,'code_sensei_save_project',save);
    const failed=await a.client.rpc('code_sensei_save_project',{...save,project_id:project,files:[...original,{filename:null,code_content:'bad'}]});
    requireThat(!!failed.error,'Invalid project replacement unexpectedly succeeded');
    denied(await b.client.rpc('code_sensei_save_project',{...save,project_id:project}),'Foreign project replacement');
    assert.deepEqual(data(await a.client.from('code_sensei_py_files').select('filename,code_content').eq('project_id',project),'Retained files'),original);
  });
  await check("signed Roadmap start, completion and undo preserve ownership through contention", async () => {
    const start = {p_task_id:task,p_day_key:"synthetic",p_source:"roadmap"};
    const [x,y] = await Promise.all([rpc(a,"roadmap_start_session",start),rpc(a,"roadmap_complete_session",start)]);
    assert.ok(x);
    assert.equal(y,x);
    denied(await b.client.rpc("roadmap_complete_session",start),"Foreign completion");
    denied(await b.client.from("roadmap_study_sessions").insert({task_id:task,day_key:"other",source:"roadmap"}),"Foreign task link","23503");
    assert.deepEqual(data(await a.client.from("roadmap_study_sessions").update({completed_at:null,verification:"manual"}).eq("id",x).select("id"),"Direct undo"),[{id:x}]);
    const moving = randomUUID();
    await sql(`insert into public.roadmap_tasks(id,user_id,title) values('${moving}','${a.id}','Synthetic transfer task')`);
    await withBlockedWriter(2,
      `update public.roadmap_tasks set user_id='${b.id}' where id='${moving}'`,
      `begin; set local role authenticated; select set_config('request.jwt.claim.sub','${a.id}',true);
       select public.roadmap_complete_session('${moving}','roadmap'); commit;`,/session access denied/);
    assert.equal(await sql(`select count(*) from public.roadmap_study_sessions where task_id='${moving}'`),"0");
  });
  await roadmapDailyAcceptance({a,b,owner,sql,check,client,data,denied,withBlockedWriter,pause});
  await roadmapRecordsAcceptance({a,b,unregistered,sql,check,client,data,denied,withBlockedWriter});
  await roadmapComparisonAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause});
  await roadmapImportAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause});
  await roadmapResetAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause});
  await roadmapTaskEditsAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause});
  await roadmapLogAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause});
  await roadmapCreationAcceptance({a,b,sql,check,client,data,denied,withBlockedWriter,pause});
  await check(
    "real Auth binds CP-only identity without legacy roles and preserves legacy viewer signup",
    async () => {
      await sql(
        "update cp_private.signup_control set enabled=true where id=true;",
      );
      assert.deepEqual(await rpc(owner, "cp_admin_signup_status"), { status: "enabled" });
      for (const flag of ["true","null"]) {
        await assert.rejects(() => sql(`insert into auth.users(id,email,is_anonymous)
          values('${randomUUID()}','${email}',${flag})`),/not_allowed/);
        requireThat((await signupRow(admission)).claimed_user_id === null,
          "Invalid identity consumed a Commonplace admission");
      }
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
      assert.deepEqual(await rpc(owner, "cp_admin_signup_status"), { status: "paused" });
      denied(await a.client.rpc("roadmap_complete_session",{p_task_id:task,p_source:"roadmap"}),"Contained completion");
      assert.equal(await sql(`select count(*) from public.roadmap_study_sessions where task_id='${task}'`),"1");
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
  await healthlogArchiveAcceptance({a,b,unregistered,owner,sql,check,client,data,denied,withBlockedWriter});
  await eagleWorkspaceAcceptance({a,b,unregistered,owner,sql,check,client,data,denied,withBlockedWriter,pause});
}
