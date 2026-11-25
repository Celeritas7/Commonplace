import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createAcceptanceDatabase, access, users } from "./acceptance-fixture.mjs";
import { legacyFixture } from "./shared-access-fixture.mjs";

const candidate = await readFile(new URL("../operations/general-apps/04_commonplace_signup.sql", import.meta.url), "utf8");
const code = expected => error => error.code === expected;

test("incomplete foundation and deferred link both leave all four routines intact", async () => {
  for (const partial of [true, false]) {
    const db = await createAcceptanceDatabase({beforeU9:partial});
    try {
      await db.exec(legacyFixture);
      if (!partial) await db.exec(`
        drop trigger chatak_link_auth_user on auth.users;
        create constraint trigger chatak_link_auth_user after insert on auth.users
        deferrable initially deferred for each row execute function chatak_link_auth_user();`);
      const snapshot = async () => (await db.query(`select t.tgname, pg_get_functiondef(t.tgfoid) body
        from pg_trigger t where tgrelid='auth.users'::regclass and not tgisinternal order by 1`)).rows;
      const before = await snapshot();
      assert.equal(before.length,4);
      await assert.rejects(()=>db.exec(candidate), partial ? /complete reviewed/ : /trigger configuration/);
      await db.exec("rollback");
      assert.deepEqual(await snapshot(), before);
      assert.equal((await db.query("select to_regclass('cp_private.signup_control') installed")).rows[0].installed,null);
    } finally { await db.close(); }
  }
});

test("signup decisions preserve identity and are scoped to one administrator revision", async t => {
  const db=await createAcceptanceDatabase();
  const {as}=access(db);
  const admin = (sql, args=[]) => as(users.admin,sql,args);
  async function system(sql,args=[]) { await db.exec("reset role"); return db.query(sql,args); }
  const prepare = async email => (await admin("select cp_admin_prepare_signup($1) id",[email])).rows[0].id;
  const get = async id => (await admin("select cp_admin_signup_directory() list")).rows[0].list.find(row=>row.id===id);
  const review = (row,decision) => admin("select cp_admin_review_signup($1,$2,$3)",[row.id,row.revision,decision]);
  const complete = (row,name="Learner") => admin("select cp_admin_complete_signup($1,$2,$3) id",[row.id,row.revision,name]);
  const insert = (id,email) => system("insert into auth.users(id,email) values($1,$2)",[id,email]);
  const confirmed = id => system("update auth.users set email_confirmed_at=now() where id=$1",[id]);
  try {
    await db.exec(legacyFixture);
    await db.exec(candidate);
    await db.query("select cp_private.bootstrap_owner($1)",[users.admin]);
    await db.exec("update cp_private.signup_control set enabled=true where id=true");

    await t.test("conflicting or ambiguous legacy approval never moves a role or creates downstream records",async()=>{
      const old=users.a, fresh=randomUUID(), address="old-address@example.invalid";
      await system("insert into authentication_mode_user_roles(id,email,role,auth_user_id) values(11,$1,'viewer',$2)",[address,old]);
      await assert.rejects(()=>insert(fresh,address),/not_allowed/);
      const original=(await system("select auth_user_id,role from authentication_mode_user_roles where id=11")).rows[0];
      assert.deepEqual(original,{auth_user_id:old,role:"viewer"});
      await system("insert into authentication_mode_user_roles(id,email,role) values(12,'two@example.invalid','viewer'),(13,'Two@example.invalid','operator')");
      await assert.rejects(()=>insert(fresh,"two@example.invalid"),/not_allowed/);
      assert.equal((await system(`select exists(select from auth.users where id=$1)
        or exists(select from authentication_mode_user_roles where auth_user_id=$1)
        or exists(select from alarm_settings where user_id=$1)
        or exists(select from chatak_profiles where id=$1) as touched`,[fresh])).rows[0].touched,false);
    });

    await t.test("two-account email change cannot register either identity through an outstanding reservation",async()=>{
      const address="change@example.invalid",person=randomUUID(),id=await prepare(address);
      await insert(person,address); await confirmed(person);
      const row=await get(id);
      assert.equal(row.state,"verified");
      await system("update auth.users set email='changed@example.invalid' where id=$1",[person]);
      await system("update auth.users set email=$1 where id=$2",[address,users.b]);
      assert.equal((await get(id)).state,"identity_changed");
      await assert.rejects(()=>complete(row),/reserved identity/);
      for (const email of [address,"changed@example.invalid"]) {
        await assert.rejects(()=>admin("select cp_admin_register($1,'Learner')",[email]),code("CP001"));
      }
      await assert.rejects(()=>admin("select cp_set_learner($1,'active','Learner')",[person]),code("CP001"));
      assert.equal((await system("select count(*)::int n from cp_memberships where user_id in ($1,$2)",[person,users.b])).rows[0].n,0);
      const existing=(await admin("select cp_admin_register('fresh@example.invalid','Existing') id")).rows[0].id;
      assert.equal(existing,users.fresh);
    });

    await t.test("withdrawal before confirmation, same-UUID recovery, failed and successful completion",async()=>{
      const email="resume@example.invalid", person=randomUUID(), id=await prepare(email);
      const unused=await get(id);
      await insert(person,email);
      const reserved=await get(id);
      assert.equal(reserved.state,"awaiting_confirmation");
      await assert.rejects(()=>review(unused,"withdraw"),code("40001"));
      await assert.rejects(()=>complete(reserved),/verified reserved identity/);
      await review(reserved,"withdraw");
      const withdrawn=await get(id);
      await confirmed(person);
      await assert.rejects(()=>complete(withdrawn),/not open/);
      await assert.rejects(()=>review(withdrawn,"release"),/unused requests/);
      await review(withdrawn,"renew");
      const renewed=await get(id);
      assert.equal(renewed.claimed_user_id,person);
      assert.equal(renewed.state,"verified");
      for (const actor of [null,users.a,users.fresh]) {
        await assert.rejects(()=>as(actor,"select cp_admin_review_signup($1,$2,'withdraw')",[id,renewed.revision]),code("42501"));
        await assert.rejects(()=>as(actor,"select cp_admin_complete_signup($1,$2,'Learner')",[id,renewed.revision]),code("42501"));
      }
      await assert.rejects(()=>complete(renewed,"x".repeat(121)),code("23514"));
      assert.equal((await get(id)).revision,renewed.revision);
      assert.equal((await complete(renewed)).rows[0].id,person);
      assert.equal((await get(id)).state,"completed");
      await assert.rejects(()=>complete(renewed),code("40001"));
      assert.deepEqual((await system("select status,role from cp_memberships where user_id=$1",[person])).rows,[{status:"suspended",role:"learner"}]);
    });

    await t.test("stale prepares and revokes preserve the latest decision",async()=>{
      const email="revision@example.invalid",id=await prepare(email),first=await get(id);
      await review(first,"withdraw");
      const withdrawn=await get(id);
      await assert.rejects(()=>prepare(email),code("40001"));
      assert.equal((await get(id)).state,"withdrawn");
      await review(withdrawn,"renew");
      await assert.rejects(()=>review(first,"withdraw"),code("40001"));
      assert.equal((await get(id)).state,"pending");
    });

    await t.test("unused withdrawn or expired requests require explicit release for a legacy viewer",async()=>{
      for (const [n,enabled] of [false,true].entries()) {
        const email="handoff-"+n+"@example.invalid",id=await prepare(email),person=randomUUID();
        const row=await get(id);
        await assert.rejects(()=>review(row,"release"),/unused requests/);
        if (enabled) await system("update cp_private.signup_admissions set expires_at=now() where id=$1",[id]);
        else await review(row,"withdraw");
        await system("update cp_private.signup_control set enabled=$1 where id=true",[enabled]);
        await system("insert into authentication_mode_user_roles(id,email,role) values($1,$2,'viewer')",[20+n,email]);
        await assert.rejects(()=>insert(person,email),/not_allowed/);
        await review(await get(id),"release");
        await insert(person,email);
        assert.equal((await get(id)).state,"released");
        assert.deepEqual((await system("select auth_user_id,role from authentication_mode_user_roles where id=$1",[20+n])).rows,[{auth_user_id:person,role:"viewer"}]);
      }
    });
  } finally { await db.close(); }
});
