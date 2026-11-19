'use strict';
// Execute the actual inline bootstrap and manager with a small DOM. These
// checks cover failures before a worker or download RPC can ever begin.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const manager = fs.readFileSync(path.join(__dirname, '../offline.js'), 'utf8');
const bootstrap = html.match(/<script id="wb-offline-watchdog">([\s\S]*?)<\/script>/)?.[1];
const scriptTag = html.match(/<script src="offline\.js[^>]+>/)?.[0];
assert(bootstrap && scriptTag, 'independent offline loading recovery is required');
assert(html.indexOf('id="wb-offline-watchdog"') < html.indexOf('<script src="offline.js'), 'watchdog must start before a stalled external script request');

function harness(navigation = {}) {
  const ids = ['wb-offline-download', 'wb-offline-check', 'wb-offline-pause', 'wb-offline-status', 'wb-offline-size', 'wb-offline-progress', 'wb-offline-error', 'wb-offline-help', 'wb-offline-toggle', 'wb-offline-study', 'wb-offline'];
  const nodes = Object.fromEntries(ids.map(id => {
    const classes = new Set();
    return [id, { textContent: '', disabled: false, hidden: false, dataset: {}, addEventListener() {}, classList: {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); }
    } }];
  }));
  nodes['wb-offline-status'].textContent = 'Checking downloads…';
  nodes['wb-offline-download'].disabled = true;
  nodes['wb-offline-study'].hidden = true;
  const timers = new Map(); let nextTimer = 0, reloads = 0;
  const document = { currentScript: { src: 'https://study.test/Commonplace/Coding/html_css_js_study/offline.js?v=1.7' }, getElementById: id => nodes[id], addEventListener() {} };
  const context = vm.createContext({
    document, navigator: navigation, window: { isSecureContext: true, addEventListener() {} }, URL,
    MessageChannel: class { constructor() { const port = this.port1 = { close() {} }; this.port2 = { postMessage(data) { port.onmessage?.({ data }); } }; } },
    location: { reload() { reloads++; } },
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(bootstrap, context);
  return { context, nodes, document, timers, get reloads() { return reloads; },
    expire() { const entry = [...timers].find(([, timer]) => timer.ms === 15000); assert(entry, 'loading timeout must exist'); timers.delete(entry[0]); entry[1].fn(); }
  };
}

(async () => {
  const stalled = harness(); stalled.expire();
  assert.equal(stalled.nodes['wb-offline-status'].textContent, 'Offline controls need attention');
  assert.match(stalled.nodes['wb-offline-error'].textContent, /did not finish loading.*Repair Web Studio/);
  assert.equal(stalled.nodes['wb-offline-check'].disabled, false);
  stalled.nodes['wb-offline-check'].onclick(); assert.equal(stalled.reloads, 1);
  console.log('PASS stalled manager download leaves a bounded error and working reload control');

  const missing = harness(); vm.runInContext(scriptTag.match(/onerror="([^"]+)"/)[1], missing.context);
  assert.match(missing.nodes['wb-offline-error'].textContent, /could not load/);
  assert.equal(missing.timers.size, 0);
  assert.equal(missing.nodes['wb-offline-download'].disabled, true);
  console.log('PASS missing manager script immediately exposes repair and reload');

  const broken = harness(); const originalLookup = broken.document.getElementById;
  broken.document.getElementById = id => id === 'wb-offline-download' ? null : originalLookup(id);
  assert.throws(() => vm.runInContext(manager, broken.context));
  assert.equal(broken.context.window.WebStudioOfflineBoot.started, true);
  assert.equal(broken.context.window.WebStudioOfflineBoot.ready, false);
  broken.document.getElementById = originalLookup; broken.expire();
  assert.match(broken.nodes['wb-offline-error'].textContent, /did not finish loading/);
  console.log('PASS manager initialization failure cannot leave Checking downloads forever');

  const mounted = harness(); vm.runInContext(manager, mounted.context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(mounted.context.window.WebStudioOfflineBoot.ready, true);
  assert.equal(mounted.timers.size, 0, 'a mounted manager owns its own operation deadlines');
  const previous = mounted.nodes['wb-offline-error'].textContent;
  assert.match(previous, /HTTPS/);
  mounted.context.window.WebStudioOfflineBoot.fail('A late script callback');
  assert.equal(mounted.nodes['wb-offline-error'].textContent, previous, 'late bootstrap errors cannot overwrite a mounted manager');
  assert.equal(mounted.nodes['wb-offline-check'].disabled, false);
  console.log('PASS successful mount cancels the bootstrap watchdog and keeps its own useful setup errors');

  const root = 'https://study.test/Commonplace/Coding/html_css_js_study/';
  const savedWorker = { state: 'activated', scriptURL: root + 'sw.js?repair=1.7', postMessage(message, ports) { assert.equal(message.type, 'offline-status'); ports[0].postMessage({ ready: true, done: 1, total: 1, bytes: 100, remainingBytes: 0 }); } };
  const registration = { scope: root, active: savedWorker };
  let registerCalls = 0, lookupCalls = 0;
  const serviceWorker = { addEventListener() {}, async getRegistration(scope) { assert.equal(scope, root); lookupCalls++; return registration; }, async register() { registerCalls++; throw new Error('Offline script request'); } };
  const repairedOffline = harness({ onLine: false, serviceWorker });
  vm.runInContext(manager, repairedOffline.context); await new Promise(resolve => setImmediate(resolve));
  assert.equal(repairedOffline.nodes['wb-offline-status'].textContent, 'Ready offline');
  assert.equal(repairedOffline.nodes['wb-offline-study'].hidden, false, 'verified offline files expose the primary study action');
  assert.equal(repairedOffline.nodes['wb-offline-download'].classList.contains('wb-primary'), false, 'checking an already saved pack is secondary to starting study');
  assert.equal(registerCalls, 0, 'an already repaired worker must be reused without a network registration offline');
  assert.equal(lookupCalls, 1);
  console.log('PASS reopening offline reuses the exact-scope repair worker without fetching a different script URL');

  const verifiedReply = savedWorker.postMessage;
  let recheckPort;
  savedWorker.postMessage = (message, ports) => { recheckPort = ports[0]; };
  const recheck = repairedOffline.nodes['wb-offline-check'].onclick();
  await new Promise(resolve => setImmediate(resolve));
  assert(recheckPort, 'the recheck request should reach the saved worker');
  assert.equal(repairedOffline.nodes['wb-offline-study'].hidden, true, 'checking must not present the earlier verified result as current');
  recheckPort.postMessage({ progress: true, checking: true, ready: true, done: 1, total: 1, bytes: 100, remainingBytes: 0 });
  assert.equal(repairedOffline.nodes['wb-offline-study'].hidden, true, 'verification progress is not a completed ready result');
  recheckPort.postMessage({ error: 'Saved pack could not be verified.' });
  await recheck;
  assert.equal(repairedOffline.nodes['wb-offline-study'].hidden, true, 'a failed recheck must remove the earlier ready-only action');
  assert.equal(repairedOffline.nodes['wb-offline-download'].classList.contains('wb-primary'), true, 'download recovery becomes primary when verification fails');
  assert.equal(repairedOffline.nodes['wb-offline-status'].textContent, 'Downloads need attention');
  savedWorker.postMessage = verifiedReply;
  console.log('PASS a failed recheck removes the previous ready-only study action');

  const lostConnection = harness({ onLine: true, serviceWorker });
  vm.runInContext(manager, lostConnection.context); await new Promise(resolve => setImmediate(resolve));
  assert.equal(lostConnection.nodes['wb-offline-status'].textContent, 'Ready offline');
  assert.equal(registerCalls, 1);
  console.log('PASS a failed online registration can still verify packs through the saved section worker');

  const parentWorker = harness({ onLine: false, serviceWorker: { ...serviceWorker, async getRegistration() { return { ...registration, scope: 'https://study.test/Commonplace/' }; } } });
  vm.runInContext(manager, parentWorker.context); await new Promise(resolve => setImmediate(resolve));
  assert.equal(parentWorker.nodes['wb-offline-status'].textContent, 'Downloads need attention');
  assert.equal(parentWorker.nodes['wb-offline-study'].hidden, true, 'an unverified pack must not show the ready-only study action');
  assert.match(parentWorker.nodes['wb-offline-error'].textContent, /Offline script request/);
  console.log('PASS a parent Commonplace worker is never mistaken for Web Studio offline support');

  const oldMarkup = harness({ onLine: false, serviceWorker });
  delete oldMarkup.nodes['wb-offline-study'];
  vm.runInContext(manager, oldMarkup.context); await new Promise(resolve => setImmediate(resolve));
  assert.equal(oldMarkup.nodes['wb-offline-status'].textContent, 'Ready offline', 'current manager must still verify files with cached markup lacking the new button');
  assert.equal(oldMarkup.nodes['wb-offline-download'].disabled, false);
  assert.equal(oldMarkup.nodes['wb-offline-download'].classList.contains('wb-primary'), true, 'old markup retains its existing primary control');
  console.log('PASS cached markup without Start studying still verifies packs and keeps its existing controls');
})().catch(error => { console.error(error); process.exitCode = 1; });
