/* node Coding/html_css_js_study/tests/preview.cjs */
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('../vendor/acorn.js');
const preview = require('../studio-preview.js');
const { instrument, guardCode, buildDocument, inspectMarkup } = preview._test;
const name = '__ws_guard_' + 'a'.repeat(48);
function execute(source) {
  const timers = [], context = { performance, setTimeout: fn => timers.push(fn), result: null };
  vm.createContext(context);
  vm.runInContext(guardCode(name) + instrument(source, name, acorn), context, { timeout: 1500 });
  return context;
}

// Minimal DOM adapter for checker logic. Actual markup parsing/computed-style
// integration is covered by the real browser suite, not this Node fixture.
async function gradeFixture(files, exerciseId, fixture = {}) {
  const events = {}, timers = new Set();
  const fire = (type, detail) => (events[type] || []).forEach(fn => fn({ preventDefault() {}, ...detail }));
  class Node { get textContent() { return this.text || ''; } set textContent(value) { this.text = String(value); } }
  class Element extends Node {
    constructor(text = '') { super(); this.text = text; this.children = {}; this.disabled = false; }
    querySelector(selector) { return this.children[selector] || null; }
    matches(selector) { assert.equal(selector, ':disabled'); return this.disabled; }
  }
  class HTMLElement extends Element {
    addEventListener(type, fn) { (this.events ||= {})[type] = fn; }
    click() { if (!this.disabled) { try { this.events?.click?.(); } catch (error) { fire('error', { message: error.message }); } } }
  }
  const button = new HTMLElement(fixture.label || 'Clicks: 0');
  button.disabled = !!fixture.disabled;
  const card = new HTMLElement(), heading = new HTMLElement(fixture.heading === undefined ? 'My reading list' : fixture.heading), paragraph = new HTMLElement(fixture.paragraph === undefined ? 'Read each day.' : fixture.paragraph);
  card.children = { h1: heading, p: paragraph, 'button#counter': button };
  if (fixture.noHeading) delete card.children.h1;
  const nodes = { 'main.card': fixture.noCard ? null : card, '#counter': fixture.noButton ? null : button, 'button#counter': fixture.noButton ? null : button };
  const computed = Object.fromEntries(['paddingTop','paddingRight','paddingBottom','paddingLeft'].map(key => [key, '32px']).concat(['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(key => [key, '12px'])));
  Object.assign(computed, fixture.computed || {});
  let deliver;
  const result = new Promise(resolve => { deliver = resolve; });
  const page = {
    performance, Element, HTMLElement, Node,
    document: { querySelector(selector) { return nodes[selector] || null; } },
    getComputedStyle() { return computed; }, console: {},
    addEventListener(type, fn) { (events[type] ||= []).push(fn); },
    setTimeout(fn, delay) { const timer = setTimeout(() => { timers.delete(timer); try { fn(); } catch (error) { fire('error', { message: error.message }); } }, delay); timers.add(timer); return timer; },
    parent: { postMessage(message) { if (message.type === 'checks' || message.type === 'error') deliver(message); } }
  };
  const document = await buildDocument(files, 'd'.repeat(48), acorn, crypto.webcrypto, null, exerciseId);
  const scripts = [...document.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  const csp = document.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.equal(scripts.length, 3);
  for (const script of scripts) assert(csp.includes("'sha256-" + crypto.createHash('sha256').update(script).digest('base64') + "'"));
  vm.createContext(page);
  scripts.forEach(script => vm.runInContext(script, page, { timeout: 1500 }));
  const timeout = setTimeout(() => deliver({ type: 'timeout' }), 1500);
  const outcome = await result;
  clearTimeout(timeout); timers.forEach(clearTimeout);
  return outcome;
}

(async () => {
  assert.equal(execute('let x=0; for(let i=0;i<10;i++) x+=i; result=x;').result, 45);
  assert.equal(execute('let x=0; do x++; while(x<3); result=x;').result, 3);
  assert.equal(execute('let x=0; for(const y of [1,2,3]) x+=y; result=x;').result, 6);
  assert.equal(execute('let x=0; outer:for(let i=0;i<3;i++){for(let j=0;j<3;j++){if(j===1)continue outer; x++;}} result=x;').result, 3);
  assert.equal(execute('const f=x=>({value:x}); result=f(2).value;').result, 2);
  assert.equal(execute('const f=x=>()=>x+1; result=f(2)();').result, 3);
  assert.equal(execute('function f(){"use strict"; return this;} result=f();').result, undefined);
  assert.equal(execute('result="</script><!--";').result, '</script><!--');
  assert.equal(execute('result="</ScRiPt>";').result, '</ScRiPt>');
  assert.equal(execute('const f=()=>`</script><!--`; result=f();').result, '</script><!--');
  assert.equal(execute('result=/<\!--/.test("<!--");').result, true);
  assert.equal(execute('<!-- a legacy comment\nresult=3;').result, 3);
  assert.equal(execute('let x=1;\r\nx++;\rresult=x;').result, 2);
  assert.throws(() => instrument('result="\0";', name, acorn), /NUL/);
  assert.throws(() => instrument('result=String.raw`</script>`;', name, acorn), /Tagged templates/);
  assert.throws(() => execute('while(true){}'), /Execution limit reached/);
  assert.throws(() => execute('for(;;);'), /Execution limit reached/);
  assert.throws(() => execute('do{}while(true);'), /Execution limit reached/);
  assert.throws(() => execute('function recurse(){return recurse();} recurse();'), /Execution limit reached|call stack/i);
  assert.throws(() => instrument('const = ;', name, acorn), /Unexpected token/);
  assert.throws(() => instrument('import x from "https://example.com/x.js"', name, acorn), /sourceType/);
  assert.throws(() => inspectMarkup('<button onclick="while(true){}">x</button>', '', null), /addEventListener/);
  assert.throws(() => inspectMarkup('<script>while(true){}</script>', '', null), /Put JavaScript/);
  assert.throws(() => inspectMarkup('<iframe src="https://example.com"></iframe>', '', null), /Embedded/);
  assert.throws(() => inspectMarkup('<p>x</p>', '.x{background:url(https://example.com/x)}', null), /External CSS/);

  const files = { html: '<button id="counter">Clicks: 0</button>', css: 'button{padding:12px}', js: 'const button=document.querySelector("#counter");let count=0;button.addEventListener("click",()=>{count+=2;button.textContent="Clicks: "+count;});' };
  const token = 'b'.repeat(48);
  const document = await buildDocument(files, token, acorn, crypto.webcrypto, null);
  const scripts = [...document.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(scripts.length, 2);
  const csp = document.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  const scriptPolicy = csp.split(';').find(x => x.trim().startsWith('script-src'));
  assert(!scriptPolicy.includes('unsafe-eval'));
  assert(!scriptPolicy.includes('unsafe-inline'));
  assert(csp.includes("connect-src 'none'"));
  assert(csp.includes("frame-src 'none'"));
  for (const script of scripts) {
    const hash = crypto.createHash('sha256').update(script).digest('base64');
    assert(scriptPolicy.includes("'sha256-" + hash + "'"));
  }
  const messages = [], button = { textContent: 'Clicks: 0', addEventListener(type, listener) { this[type] = listener; } };
  const page = { performance, setTimeout() {}, parent: { postMessage: msg => messages.push(msg) }, console: {}, addEventListener() {}, document: { querySelector(selector) { assert.equal(selector, '#counter'); return button; } } };
  vm.createContext(page);
  scripts.forEach(script => vm.runInContext(script, page));
  button.click(); button.click();
  assert.equal(button.textContent, 'Clicks: 4');
  assert.equal(messages[0].type, 'ready');
  assert.equal(messages[0].token, token);

  const runaway = await buildDocument({ html: '<p>Wait</p>', css: '', js: 'while(true){}' }, 'c'.repeat(48), acorn, crypto.webcrypto, null);
  const runawayMessages = [];
  const runawayPage = { performance, setTimeout() {}, parent: { postMessage: m => runawayMessages.push(m) }, console: {}, addEventListener() {} };
  vm.createContext(runawayPage);
  for (const m of runaway.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(m[1], runawayPage, { timeout: 1500 });
  assert(runawayMessages.some(m => m.type === 'error' && /Execution limit/.test(m.message)));

  // Mount-level behavior: a different frame/token cannot forge state; run/stop cancels prior listeners.
  const listeners = new Set(), statuses = [], logs = [], timeouts = new Map();
  let timer = 0;
  const documentStub = { createElement(tag) {
    if (tag === 'template') return { content: { querySelectorAll: () => [] }, set innerHTML(value) {} };
    return { contentWindow: {}, attributes: {}, style: {}, setAttribute(k,v) { this.attributes[k]=v; }, remove() { this.removed=true; } };
  } };
  const container = { ownerDocument: documentStub, replaceChildren(...children) { this.children=children; } };
  const host = { acorn, crypto: crypto.webcrypto, TextEncoder, Uint8Array, btoa, console,
    setTimeout(fn) { const id=++timer; timeouts.set(id,fn); return id; }, clearTimeout(id) { timeouts.delete(id); },
    addEventListener(type, fn) { if (type==='message') listeners.add(fn); }, removeEventListener(type,fn) { listeners.delete(fn); } };
  vm.createContext(host);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../studio-preview.js'),'utf8'),host);
  const runner = host.WebStudioPreview.create({container,onStatus:(message,error)=>statuses.push({message,error}),onLog:message=>logs.push(message)});
  await runner.run(files);
  const frame = container.children[0];
  assert.equal(frame.attributes.sandbox,'allow-scripts');
  assert(!frame.attributes.sandbox.includes('same-origin'));
  const ownToken=frame.srcdoc.match(/token:"([a-f0-9]{48})"/)[1];
  const receive=[...listeners][0], countBefore=statuses.length;
  receive({source:{},data:{source:'commonplace-web-preview',token:ownToken,type:'ready',message:'forged'}});
  receive({source:frame.contentWindow,data:{source:'commonplace-web-preview',token:'wrong',type:'ready',message:'forged'}});
  assert.equal(statuses.length,countBefore);
  receive({source:frame.contentWindow,data:{source:'commonplace-web-preview',token:ownToken,type:'ready',message:'Ready'}});
  assert.equal(statuses.at(-1).message,'Ready');
  receive({source:frame.contentWindow,data:{source:'commonplace-web-preview',token:ownToken,type:'log',message:'log: 4'}});
  assert.equal(logs[0],'log: 4');
  receive({source:frame.contentWindow,data:{source:'commonplace-web-preview',token:ownToken,type:'error',message:'Oops'}});
  receive({source:frame.contentWindow,data:{source:'commonplace-web-preview',token:ownToken,type:'ready',message:'Incorrect ready'}});
  assert.equal(statuses.at(-1).message,'Oops');
  runner.stop(); assert(frame.removed); assert.equal(listeners.size,0);
  await runner.run(files); [...timeouts.values()].at(-1)();
  assert.match(statuses.at(-1).message,/startup did not finish/);
  const pending=runner.run(files);runner.stop();await pending;assert.equal(container.children.length,0);
  const exerciseData = require('../studio-exercises.js');
  for (const exercise of exerciseData.list) {
    const fixture = exercise.id === 'html-reading-card' ? { label: 'Start reading' } : {};
    const good = await gradeFixture(exercise.solution, exercise.id, fixture);
    assert.equal(good.type, 'checks', exercise.id);
    assert(good.checks.every(row => row.passed), exercise.id + ' solution passes');
    assert.deepEqual(Array.from(good.checks, row => row.id), exercise.checks.map(row => row.id));
  }
  const htmlExercise = exerciseData.get('html-reading-card');
  const emptyHeading = await gradeFixture(htmlExercise.solution, htmlExercise.id, { label: 'Start reading', heading: '   ' });
  assert.equal(emptyHeading.checks.find(row => row.id === 'heading').passed, false);
  const missingHeading = await gradeFixture(htmlExercise.solution, htmlExercise.id, { label: 'Start reading', noHeading: true });
  assert.equal(missingHeading.checks.find(row => row.id === 'heading').passed, false);
  const cssExercise = exerciseData.get('css-card-spacing');
  const wrongCSS = await gradeFixture(cssExercise.solution, cssExercise.id, { computed: { paddingLeft: '24px', borderTopLeftRadius: '0px' } });
  assert.equal(wrongCSS.checks.find(row => row.id === 'padding').passed, false);
  assert.equal(wrongCSS.checks.find(row => row.id === 'corners').passed, false);
  const noCard = await gradeFixture(cssExercise.solution, cssExercise.id, { noCard: true });
  assert(noCard.checks.every(row => !row.passed));
  const jsExercise = exerciseData.get('js-count-twos');
  const wrongIncrement = await gradeFixture(jsExercise.starter, jsExercise.id);
  assert(wrongIncrement.checks.filter(row => row.id.startsWith('click-')).every(row => !row.passed));
  const staticAnswer = await gradeFixture({ ...jsExercise.solution, js: 'document.querySelector("#counter").addEventListener("click",()=>{document.querySelector("#counter").textContent="Clicks: 4";});' }, jsExercise.id);
  assert.equal(staticAnswer.checks.find(row => row.id === 'click-2').passed, true);
  assert.equal(staticAnswer.checks.find(row => row.id === 'click-3').passed, false);
  const disabled = await gradeFixture(jsExercise.solution, jsExercise.id, { disabled: true });
  assert.equal(disabled.checks[0].passed, false);
  const clickError = await gradeFixture({ ...jsExercise.solution, js: 'document.querySelector("#counter").addEventListener("click",()=>{throw new Error("broken handler");});' }, jsExercise.id);
  assert.equal(clickError.type, 'error'); assert.match(clickError.message, /broken handler/);
  const lateError = await gradeFixture({ ...jsExercise.solution, js: jsExercise.solution.js + '\nsetTimeout(()=>{throw new Error("queued failure")},30);' }, jsExercise.id);
  assert.equal(lateError.type, 'error'); assert.match(lateError.message, /queued failure/);

  // check() promises are bounded and bound to one frame/token/exercise/rubric.
  async function mountedCheck(id = 'js-count-twos') {
    const promise = runner.check(files, id);
    for (let i = 0; i < 100 && !container.children[0]; i++) await new Promise(resolve => setImmediate(resolve));
    const frame = container.children[0]; assert(frame, 'check must mount a fresh iframe');
    return { promise, frame, token: frame.srcdoc.match(/token:"([a-f0-9]{48})"/)[1], listener: [...listeners][0] };
  }
  function message(check, type, fields = {}) {
    check.listener({ source: check.frame.contentWindow, data: { source: 'commonplace-web-preview', token: check.token, type, ...fields } });
  }
  const rubric = preview._test.exerciseChecks['js-count-twos'];
  const validRows = rubric.map(([id, expected]) => ({ id, passed: true, expected, actual: expected }));
  const checked = await mountedCheck();
  let settled = false; checked.promise.then(() => { settled = true; });
  checked.listener({ source: {}, data: { source: 'commonplace-web-preview', token: checked.token, type: 'checks', exerciseId: 'js-count-twos', checks: validRows } });
  checked.listener({ source: checked.frame.contentWindow, data: { source: 'commonplace-web-preview', token: 'wrong', type: 'checks', exerciseId: 'js-count-twos', checks: validRows } });
  message(checked, 'ready', { message: 'forged pass' });
  await Promise.resolve(); assert.equal(settled, false); assert(timeouts.size > 0);
  message(checked, 'checks', { exerciseId: 'js-count-twos', checks: validRows });
  assert.equal((await checked.promise).status, 'passed'); assert(checked.frame.removed); assert.equal(listeners.size, 0);
  const partial = await mountedCheck(); message(partial, 'checks', { exerciseId: 'js-count-twos', checks: validRows.slice(0, 1) });
  assert.equal((await partial.promise).status, 'error');
  const wrongExercise = await mountedCheck(); message(wrongExercise, 'checks', { exerciseId: 'css-card-spacing', checks: validRows });
  assert.equal((await wrongExercise.promise).status, 'error');
  const wrongExpected = await mountedCheck(); message(wrongExpected, 'checks', { exerciseId: 'js-count-twos', checks: validRows.map((row, i) => i ? row : { ...row, expected: 'Anything' }) });
  assert.equal((await wrongExpected.promise).status, 'error');
  const failed = await mountedCheck(); message(failed, 'checks', { exerciseId: 'js-count-twos', checks: validRows.map((row, i) => i ? row : { ...row, passed: false, actual: 'Not found' }) });
  assert.equal((await failed.promise).status, 'failed');
  const stoppedCheck = await mountedCheck(); runner.stop(); assert.equal((await stoppedCheck.promise).status, 'cancelled');
  const replacedCheck = await mountedCheck(); await runner.run(files); assert.equal((await replacedCheck.promise).status, 'cancelled');
  const statusesBeforeStale = statuses.length; message(replacedCheck, 'checks', { exerciseId: 'js-count-twos', checks: validRows });
  assert.equal(statuses.length, statusesBeforeStale);
  const timedOutCheck = await mountedCheck(); [...timeouts.values()].at(-1)(); assert.equal((await timedOutCheck.promise).status, 'error'); assert(timedOutCheck.frame.removed);
  assert.equal((await runner.check({ ...files, js: 'const = ;' }, 'js-count-twos')).status, 'error');
  assert.equal((await runner.check(files, 'unknown')).status, 'error');
  assert.equal((await runner.check(files)).status, 'error');
  const pendingCheck = runner.check(files, 'js-count-twos'); runner.stop(); assert.equal((await pendingCheck).status, 'cancelled');
  console.log('PASS: exercise DOM/CSS/click rubrics, correct and incorrect results, queued errors, authenticated complete results, cancellation and bounded checks.');
  console.log('PASS: real counter execution, loop/function guards, script hashes/CSP, inline-handler rejection, syntax errors, authenticated preview messages, Stop, timeout and run cancellation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
