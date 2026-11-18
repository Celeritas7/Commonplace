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
  console.log('PASS: real counter execution, loop/function guards, script hashes/CSP, inline-handler rejection, syntax errors, authenticated preview messages, Stop, timeout and run cancellation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
