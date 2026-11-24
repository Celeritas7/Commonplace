'use strict';
// Offline contract for the read-only Pages live checker. Never needs a site URL.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stagingOrigin, pilotFiles, matchingMime } = require('./check-cloudflare-webstudio-live.cjs');
const origin = 'https://commonplace-webstudio-pilot.pages.dev';

assert.equal(stagingOrigin(origin), origin);
assert.equal(stagingOrigin(origin + '/'), origin);
assert.equal(stagingOrigin('https://preview.commonplace-webstudio-pilot.pages.dev/'),
  'https://preview.commonplace-webstudio-pilot.pages.dev');
for (const invalid of [
  '', 'http://commonplace-webstudio-pilot.pages.dev',
  'https://celeritas7.github.io/',
  'https://commonplace-webstudio-pilot.pages.dev.evil.test/',
  'https://pages.dev/', 'https://commonplace-webstudio-pilot.pages.dev:8443/',
  'https://user:password@commonplace-webstudio-pilot.pages.dev/',
  'https://commonplace-webstudio-pilot.pages.dev/Commonplace/',
  'https://commonplace-webstudio-pilot.pages.dev/?token=secret',
  'https://commonplace-webstudio-pilot.pages.dev/#study-offline'
]) assert.throws(() => stagingOrigin(invalid), 'must reject unsafe origin: ' + invalid);
console.log('PASS live check only accepts root HTTPS *.pages.dev staging origins');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist-cloudflare/Commonplace/Coding/html_css_js_study/offline-assets.json')));
const list = pilotFiles(manifest, origin);
assert.equal(list.length, manifest.files.length);
assert(list.every(file => file.path.startsWith('/Commonplace/')));
assert(list.some(file => file.path === '/Commonplace/_lib/gate.js'));
assert(list.some(file => file.path === '/Commonplace/Coding/html_css_js_study/studio-cloud.js'));
assert(list.some(file => file.path === '/Commonplace/Coding/html_css_js_study/index.html'));
const corrupt = structuredClone(manifest);
corrupt.files[0].bytes++;
assert.throws(() => pilotFiles(corrupt, origin), /bytes|equal/);
const traversal = structuredClone(manifest);
traversal.files[0].url = '../../../platform/admin/README.md';
const { createHash } = require('node:crypto');
traversal.revision = createHash('sha256').update(JSON.stringify(traversal.files)).digest('hex');
assert.throws(() => pilotFiles(traversal, origin), /outside/);
console.log('PASS remote file plan honors staged SHA-256 manifest, expected paths and limits');

const headers = contentType => ({ headers: { get(name) { return name === 'content-type' ? contentType : null; } } });
assert(matchingMime(headers('text/javascript; charset=UTF-8'), '/test.js'));
assert(matchingMime(headers('text/css'), '/test.css'));
assert(matchingMime(headers('text/html'), '/index.html'));
assert(matchingMime(headers('application/json'), '/offline-assets.json'));
assert(!matchingMime(headers('text/html'), '/studio.js'));
assert(!matchingMime(headers('text/html'), '/studio.css'));
console.log('PASS remote checker rejects HTML fallback masquerading as scripts or styles');
