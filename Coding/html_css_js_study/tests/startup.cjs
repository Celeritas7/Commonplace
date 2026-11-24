'use strict';
// Pure startup/recovery contract: the main editor and offline manager are
// deliberately absent, exactly as on a failed offline cold launch.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const studio = fs.readFileSync(path.join(__dirname, '../studio.js'), 'utf8');
const match = html.match(/<script id="wb-startup-watchdog">([\s\S]*?)<\/script>/);
assert(match, 'startup recovery must have an inline independent watchdog');
assert(html.indexOf('id="wb-startup-watchdog"') < html.indexOf('<script src="studio-store.js'));
assert(html.indexOf('id="wb-startup-recovery"') < html.indexOf('id="wb-startup-watchdog"'));
assert(html.includes('href="offline-repair.html"') && html.includes('href="offline.html"'));
assert(studio.includes('window.WebStudioStartup?.ready()'), 'main app must explicitly signal full initialization');
assert(/onerror="window.WebStudioStartup.fail\('asset','studio.js'\)"/.test(html), 'missing main script needs an immediate failure signal');

function harness({ locked = false, initialized = false, controller = true } = {}) {
  const calls = [], timers = new Map(), handlers = {};
  let n = 0, reloads = 0, focusCount = 0, observer;
  const nodes = {
    'wb-startup-recovery': { hidden: true },
    'wb-startup-message': { textContent: '' },
    'wb-startup-detail': { textContent: '' },
    'wb-startup-title': { focus() { focusCount++; } },
    'wb-startup-retry': {},
    'web-book': { dataset: { view: initialized ? 'book' : '' } },
    'wb-prose': { textContent: initialized ? 'Lesson loaded' : '' },
    'wb-editor': { oninput: initialized ? () => {} : null },
    'wb-run': { onclick: initialized ? () => {} : null }
  };
  const document = {
    getElementById(id) { return nodes[id] || null; },
    documentElement: { classList: { contains(name) { return name === 'cp-locked' && locked; } } },
    body: { dataset: {} }
  };
  const context = vm.createContext({
    window: {
      addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
      WebStudioLessons: { chapters: {} },
      WebStudioStore: { load() {} },
      WebStudioPreview: { create() {} },
      WebStudioExercises: { byLanguage() {} },
      WebStudioPractice: { mount() {} },
      WebStudioProjects: { create() {} },
      WebStudioProjectUI: { mount() {} }
    },
    document,
    navigator: { serviceWorker: controller ? { controller: { scriptURL: 'worker' } } : null },
    location: { href: 'https://study.test/Commonplace/Coding/html_css_js_study/index.html', origin: 'https://study.test', pathname: '/Commonplace/Coding/html_css_js_study/index.html', reload() { reloads++; } },
    URL,
    MutationObserver: class {
      constructor(callback) { observer = callback; }
      observe(root, options) { assert.equal(root, document.documentElement); assert.deepEqual(Array.from(options.attributeFilter), ['class']); }
    },
    setTimeout(fn, ms) { let id = ++n; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(match[1], context, { filename: 'inline-startup-watchdog.js' });
  return {
    context, nodes, timers, handlers, calls,
    get boot() { return context.window.WebStudioStartup; },
    get reloads() { return reloads; },
    get focusCount() { return focusCount; },
    unlock() { locked = false; observer(); },
    fire(type, event) { for (const fn of handlers[type] || []) fn(event); },
    expire() { const timer = [...timers.values()].find(t => t.ms === 15000); assert(timer, 'startup watchdog timeout required'); timer.fn(); }
  };
}

const good = harness({ initialized: true });
assert.equal(good.boot.checkDependencies(), true);
good.boot.ready();
assert.equal(good.boot.state, 'ready');
assert.equal(good.context.document.body.dataset.webStudioStartup, 'ready');
assert.equal(good.nodes['wb-startup-recovery'].hidden, true);
assert.equal(good.timers.size, 0);
good.boot.fail('exception');
assert.equal(good.boot.state, 'ready', 'later cloud/optional errors cannot falsely mark startup broken');
console.log('PASS fully initialized editor/lesson reports ready independently of offline download controls');

const missing = harness();
delete missing.context.window.WebStudioLessons;
assert.equal(missing.boot.checkDependencies(), false);
assert.equal(missing.boot.state, 'failed');
assert.equal(missing.boot.reason, 'dependency');
assert.match(missing.nodes['wb-startup-message'].textContent, /required learning component/i);
assert.match(missing.nodes['wb-startup-detail'].textContent, /studio-lessons.js/);
assert.equal(missing.nodes['wb-startup-recovery'].hidden, false);
missing.boot.ready();
assert.equal(missing.boot.state, 'failed');
missing.nodes['wb-startup-retry'].onclick();
assert.equal(missing.reloads, 1);
console.log('PASS missing lesson dependency exposes a working retry and recovery links');

const resource = harness();
resource.fire('error', { target: {
  tagName: 'SCRIPT',
  src: 'https://study.test/Commonplace/Coding/html_css_js_study/studio.js?access_token=private-sample'
}});
assert.equal(resource.boot.reason, 'asset');
assert.equal(resource.boot.asset, 'studio.js');
assert(!resource.nodes['wb-startup-recovery'].hidden);
assert(!resource.nodes['wb-startup-detail'].textContent.includes('private-sample'), 'do not expose OAuth callback text');
console.log('PASS missing script recovery reports sanitized asset name without URL tokens');

const crash = harness({ controller: false });
crash.fire('error', { filename: 'https://study.test/secret?token=private-sample', message: 'Private learner contents', error: new Error('Private learner contents') });
assert.equal(crash.boot.reason, 'exception');
assert(!JSON.stringify(crash.nodes).includes('Private learner contents'), 'never print raw exceptions or study data');
assert.match(crash.nodes['wb-startup-detail'].textContent, /worker is not controlling/i);
console.log('PASS startup exception is classified without exposing private content');

const stalled = harness();
stalled.expire();
assert.equal(stalled.boot.reason, 'timeout');
assert.equal(stalled.nodes['wb-startup-recovery'].hidden, false);
console.log('PASS stalled main app startup times out with independent visible recovery');

const incomplete = harness();
incomplete.boot.ready();
assert.equal(incomplete.boot.reason, 'incomplete', 'a loaded JS script is not proof of a mounted editor');
console.log('PASS ready callback requires rendered lesson and working editor/preview controls');

const login = harness({ locked: true });
login.boot.fail('asset', 'studio.js');
assert.equal(login.nodes['wb-startup-recovery'].hidden, true, 'Commonplace sign-in gate remains the visible authority');
login.unlock();
assert.equal(login.nodes['wb-startup-recovery'].hidden, false);
assert.equal(login.focusCount, 1);
console.log('PASS existing sign-in gate is never covered or bypassed by recovery, then recovery appears after unlock');
