'use strict';
// Validate the exact Cloudflare Pages output, not just source files.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist-cloudflare');
const STUDY = 'Commonplace/Coding/html_css_js_study/';
const repoManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'Coding/html_css_js_study/offline-assets.json'), 'utf8'));
const stageManifest = JSON.parse(fs.readFileSync(path.join(OUT, STUDY, 'offline-assets.json'), 'utf8'));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
assert.equal(stageManifest.version, 1);
assert.equal(stageManifest.files.length, repoManifest.files.length);
assert.equal(stageManifest.revision, sha(Buffer.from(JSON.stringify(stageManifest.files))));
const generated = new Set();
let bytes = 0;
for (const item of stageManifest.files) {
  assert(/^[A-Za-z0-9_./-]+$/.test(item.url) && !item.url.startsWith('/'));
  const target = path.resolve(OUT, STUDY, item.url);
  assert(target.startsWith(OUT + path.sep));
  assert(fs.existsSync(target), 'Missing Cloudflare study file: ' + item.url);
  assert(!fs.lstatSync(target).isSymbolicLink(), 'Staged file must not be a symlink');
  const data = fs.readFileSync(target);
  assert.equal(data.length, item.bytes, 'Wrong staged byte size: ' + item.url);
  assert.equal(sha(data), item.sha256, 'Wrong staged SHA-256: ' + item.url);
  assert(data.length <= 25 * 1024 * 1024, 'Staged file exceeds Pages file limit');
  const source = repoManifest.files.find(file => file.url === item.url);
  assert(source, 'Unexpected staging resource: ' + item.url);
  if (item.url !== 'studio-cloud.js') {
    assert.equal(item.sha256, source.sha256, 'Staging changed a production study asset: ' + item.url);
  } else {
    assert.notEqual(item.sha256, source.sha256, 'Cloud staging must disable production account sync');
  }
  generated.add(target);
  bytes += data.length;
}
assert.equal(bytes, stageManifest.bytes);
assert.equal(generated.size, stageManifest.files.length);
assert.notEqual(stageManifest.revision, repoManifest.revision, 'Staging override must have a new revision');
console.log('PASS staged assets retain exact hashes; only cloud-sync adapter is test-only');

const sourceGate = fs.readFileSync(path.join(ROOT, '_lib/gate.js'));
const stageGate = fs.readFileSync(path.join(OUT, 'Commonplace/_lib/gate.js'));
assert.deepEqual(stageGate, sourceGate, 'Never bypass or replace the Commonplace login gate');
const stageCloud = fs.readFileSync(path.join(OUT, STUDY, 'studio-cloud.js'), 'utf8');
assert(stageCloud.includes('Cloud sync is disabled') && stageCloud.includes('Work saves only in this browser'));
assert(stageCloud.includes('WebStudioCloud'));
assert(!stageCloud.includes('web_studio_sync_write') && !stageCloud.includes('createClient') &&
  !stageCloud.includes('/rest/v1/') && !stageCloud.includes('supabase.co'),
  'Staging sync module must not access production data');
assert.deepEqual(fs.readFileSync(path.join(OUT, STUDY, 'sw.js')),
  fs.readFileSync(path.join(ROOT, 'Coding/html_css_js_study/sw.js')),
  'Service-worker code must remain identical');
console.log('PASS real gate and unchanged offline worker; production study sync is disabled');

const page = fs.readFileSync(path.join(OUT, STUDY, 'index.html'), 'utf8');
const launcher = fs.readFileSync(path.join(OUT, STUDY, 'offline.html'), 'utf8');
assert(page.includes('Version 1.7.4'));
assert(launcher.includes('../../_lib/gate.js'));
const base = new URL('https://cloudflare-pilot.pages.dev/Commonplace/Coding/html_css_js_study/');
assert.equal(new URL('../../_lib/gate.js', base).pathname, '/Commonplace/_lib/gate.js');
assert.equal(new URL('./sw.js', base).pathname, '/Commonplace/Coding/html_css_js_study/sw.js');
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, STUDY, 'pwa/manifest.json')));
assert.equal(new URL(manifest.start_url, new URL('pwa/manifest.json', base)).href,
  new URL('index.html', base).href);
assert.equal(new URL(manifest.scope, new URL('pwa/manifest.json', base)).href, base.href);
assert(fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')
  .includes('/Commonplace/Coding/html_css_js_study/offline.html'));
console.log('PASS Cloudflare subpath preserves original scope, manifest start URL and shared script links');

const excluded = [
  'Commonplace/platform',
  'Commonplace/Coding/Python',
  'Commonplace/Coding/html_css_js_study/tests',
  'Commonplace/Coding/html_css_js_study/docs',
  'Commonplace/.github',
  'Commonplace/README.md',
  'Commonplace/_lib/quiz/quiz.js',
  'scripts',
  '.env',
  'Commonplace/Coding/html_css_js_study/studio-cloud.js.map'
];
for (const relative of excluded) {
  assert(!fs.existsSync(path.join(OUT, relative)), 'Unapproved source exposed in pilot: ' + relative);
}
const headers = fs.readFileSync(path.join(OUT, '_headers'), 'utf8');
assert(headers.includes('Cache-Control: no-store'));
assert(headers.includes('X-Content-Type-Options: nosniff'));
assert(fs.readFileSync(path.join(OUT, 'robots.txt'), 'utf8').includes('Disallow: /'));
assert(fs.readFileSync(path.join(OUT, '404.html'), 'utf8').includes('This page is not part of the isolated Web Studio staging pilot'),
  'Cloudflare pilot must include a proper static 404 instead of SPA fallback');
console.log('PASS admin/backend, Python runtime, tests and developer files excluded from pilot');
