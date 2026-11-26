import { test } from "node:test";
import assert from "node:assert/strict";
import { waitForShellControl } from "../offline/shell.mjs";

function fixture() {
  const workers = new EventTarget(), worker = new EventTarget();
  worker.state = "installed";
  workers.controller = null;
  return {workers,worker,activate(controller=worker) {
    worker.state = "activated";
    workers.controller = controller;
    worker.dispatchEvent(new Event("statechange"));
    workers.dispatchEvent(new Event("controllerchange"));
  }};
}
test("shell readiness waits for the saved worker, not just a ready message or old controller",async()=>{
  const f=fixture();
  let ready=false;
  const wait=waitForShellControl(f.workers,f.worker,undefined,1000).then(()=>{ready=true;});
  await Promise.resolve();assert.equal(ready,false);
  f.activate(new EventTarget());await Promise.resolve();assert.equal(ready,false);
  f.workers.controller=f.worker;f.workers.dispatchEvent(new Event("controllerchange"));
  await wait;assert.equal(ready,true);
});
test("already activated controlling worker resolves without waiting for a future event",async()=>{
  const f=fixture();f.activate();await waitForShellControl(f.workers,f.worker,undefined,100);
});
test("controller alone does not establish completed activation",async()=>{
  const f=fixture();f.workers.controller=f.worker;
  let ready=false;const wait=waitForShellControl(f.workers,f.worker,undefined,1000).then(()=>{ready=true;});
  await Promise.resolve();assert.equal(ready,false);f.activate();await wait;assert.equal(ready,true);
});
test("abort, redundant replacement and timeout are retryable without clearing storage",async()=>{
  const f=fixture(),controller=new AbortController();
  const waiting=waitForShellControl(f.workers,f.worker,controller.signal,1000);
  controller.abort();await assert.rejects(waiting,/paused/);
  const replacement=fixture(),next=waitForShellControl(replacement.workers,replacement.worker,undefined,1000);
  replacement.worker.state="redundant";replacement.worker.dispatchEvent(new Event("statechange"));
  await assert.rejects(next,/replaced/);
  const timeout=fixture();await assert.rejects(waitForShellControl(timeout.workers,timeout.worker,undefined,10),/control is not ready/);
  const aborted=new AbortController();aborted.abort();
  await assert.rejects(waitForShellControl(f.workers,f.worker,aborted.signal,1000),/paused/);
});
