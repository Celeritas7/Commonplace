// Tests for the tolerance stack-up engine. Run: node dev/stack_engine.test.js
// Loads the STACK-ENGINE block straight out of dev/template.html, so it tests what ships.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const a = tpl.indexOf('// STACK-ENGINE-BEGIN'), b = tpl.indexOf('// STACK-ENGINE-END');
assert(a > 0 && b > a, 'engine markers not found in template.html');
const E = new Function(tpl.slice(a, b) +
  ';return {stackCleanChain, fmtPct, isoTol, stackRowCalc, stackCalc, stackVerdict, stackReject, stackCsv, stackReportHtml, stackHistSvg, STACK_SAMPLES, fx};')();

let n = 0;
const near = (x, y, tol, msg) => { assert(Math.abs(x - y) <= tol, (msg || '') + ': ' + x + ' vs ' + y); };
const test = (name, fn) => { fn(); n++; console.log('ok -', name); };

test('ISO 286 grades and positions', () => {
  const h7 = E.isoTol('H7', 25);
  near(h7.tol, 0.0105, 1e-12, 'H7 tol'); near(h7.shift, 0.0105, 1e-12, 'H7 shift');
  near(E.isoTol('h6', 25).shift, -0.0065, 1e-12, 'h6 shift');
  near(E.isoTol('js9', 40).tol, 0.031, 1e-12, 'js9 @ 40');
  near(E.isoTol('H7', 3).tol, 0.005, 1e-12, 'size 3 is in the <=3 bucket');
  near(E.isoTol('H7', 3.01).tol, 0.006, 1e-12, 'size 3.01 is in 3-6');
  near(E.isoTol('H7', -25).tol, 0.0105, 1e-12, 'negative nominal uses |size|');
  assert(E.isoTol('H7', 600).err, '>500 mm is outside the table');
  assert(E.isoTol('Q7', 10).err, 'unknown code');
});

test('ISO 2768 general tolerances', () => {
  near(E.isoTol('2768-m', 20).tol, 0.2, 1e-12);
  near(E.isoTol('2768-f', 19).tol, 0.1, 1e-12);
  near(E.isoTol('2768-c', 150).tol, 1.2, 1e-12);
  assert(E.isoTol('2768-v', 2).err, 'v has no value below 3 mm');
  assert(E.isoTol('2768-m', 0.3).err, 'below 0.5 mm');
});

test('worst case and RSS match the classic formulas for default rows', () => {
  const r = E.stackCalc(E.STACK_SAMPLES[0].rows, {n:0});
  near(r.nom, 0.5, 1e-12, 'nominal'); near(r.wc, 0.39, 1e-12, 'WC');
  near(r.rss, Math.sqrt(0.15**2 + 0.06**2 + 0.10**2 + 0.08**2), 1e-12, 'RSS = sqrt(sum t^2) when Cpk = 1');
  assert(!r.mc, 'n = 0 turns Monte Carlo off');
});

test('sign convention: negative nominal with + equals positive nominal with -', () => {
  const x = E.stackCalc([{nom:'10', tol:'0.1', dir:1}, {nom:'-4', tol:'0.1', dir:1}], {n:0});
  const y = E.stackCalc([{nom:'10', tol:'0.1', dir:1}, {nom:'4', tol:'0.1', dir:-1}], {n:0});
  near(x.nom, 6, 1e-12); near(y.nom, 6, 1e-12);
});

test('per-row sigma from distribution and Cpk', () => {
  const s = d => E.stackRowCalc({nom:'10', tol:'0.3', dir:1, ...d}).sigma;
  near(s({}), 0.1, 1e-12, 'normal Cpk 1');
  near(s({cpk:'1.33'}), 0.3/3.99, 1e-12, 'normal Cpk 1.33');
  near(s({dist:'uniform'}), 0.3/Math.sqrt(3), 1e-12, 'uniform');
  near(s({dist:'triangular'}), 0.3/Math.sqrt(6), 1e-12, 'triangular');
  near(s({cpk:'0'}), 0.1, 1e-12, 'invalid Cpk falls back to 1');
});

test('ISO H/h shifts move the mean, not the nominal', () => {
  const r = E.stackCalc(E.STACK_SAMPLES.find(x => x.id === 'fit').rows, {n:0, gapMin:'0'});
  near(r.nom, 0, 1e-12); near(r.mean, 0.017, 1e-12);
  near(r.wcLo, 0, 1e-12, 'H7/h6 minimum clearance is 0'); near(r.wcHi, 0.034, 1e-12, 'max clearance 34 um');
  assert(r.wcPass, 'boundary counts as pass');
});

test('Monte Carlo agrees with RSS and repeats with the same seed', () => {
  const rows = E.STACK_SAMPLES[0].rows;
  const r1 = E.stackCalc(rows, {n:50000, seed:7}), r2 = E.stackCalc(rows, {n:50000, seed:7});
  assert.strictEqual(r1.mc.sd, r2.mc.sd, 'same seed, same answer');
  near(r1.mc.mean, r1.mean, 0.002, 'MC mean');
  near(r1.mc.sd, r1.sigma, r1.sigma*0.02, 'MC sigma within 2 %');
  assert.strictEqual(r1.mc.bins.reduce((x, y) => x + y, 0), 50000, 'every sample in a bin');
});

test('Monte Carlo uniform row never leaves its band', () => {
  const r = E.stackCalc([{nom:'5', tol:'0.2', dir:1, dist:'uniform'}], {n:20000});
  assert(r.mc.min >= 4.8 && r.mc.max <= 5.2, r.mc.min + '..' + r.mc.max);
});

test('practice samples land in the intended verdict class', () => {
  const want = {gearbox:'pass', circlip:'warn', clevis:'pass', fit:'pass', hose:'pass', six:'fail'};
  E.STACK_SAMPLES.forEach(x => {
    const r = E.stackCalc(x.rows, {gapMin:x.gapMin, gapMax:x.gapMax, n:20000, seed:1});
    const v = E.stackVerdict(r);
    const got = v.startsWith('✓') ? 'pass' : v.startsWith('⚠') ? 'warn' : v.startsWith('✕') ? 'fail' : 'other';
    assert.strictEqual(got, want[x.id], x.id + ': ' + v);
  });
});

test('report and CSV include the chain and escape HTML', () => {
  const chain = {name:'A <b> & "c"', notes:'n', gapMin:'0', gapMax:'', rows:[{name:'x<y', nom:'1', tol:'0.1', dir:1}]};
  const r = E.stackCalc(chain.rows, {gapMin:'0', n:1000});
  const html = E.stackReportHtml(chain, r, 'now');
  assert(html.includes('A &lt;b&gt; &amp; &quot;c&quot;') && html.includes('x&lt;y') && !html.includes('<b>'), 'escaped');
  assert(html.includes('<svg'), 'histogram embedded');
  const csv = E.stackCsv(chain, r);
  assert(csv.split('\r\n')[1].includes('"x<y"'), 'csv row');
  assert(csv.includes('"Worst case ±","0.1000"'), 'csv summary');
});

test('fmtPct handles tiny and zero rates', () => {
  assert.strictEqual(E.fmtPct(0), '0 %');
  assert.strictEqual(E.fmtPct(1e-11), '< 0.1 ppm');
  assert.strictEqual(E.fmtPct(8.2e-6), '8.2 ppm');
  assert.strictEqual(E.fmtPct(0.00825), '0.825 %');
});

test('fx never prints negative zero', () => {
  assert.strictEqual(E.fx(-0.00001, 3), '0.000');
  assert.strictEqual(E.fx(-0.0006, 3), '-0.001');
});

test('samples/stack-up-practice.json is the same six chains as the built-in examples', () => {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'samples', 'stack-up-practice.json'), 'utf8'));
  assert.deepStrictEqual(j.chains, E.STACK_SAMPLES.map(E.stackCleanChain), 'regenerate the JSON after editing STACK_SAMPLES');
});

test('a gap limit met exactly passes worst case even at large nominals', () => {
  const r = E.stackCalc([{nom:'12345.67', tol:'0.07', dir:1}, {nom:'12345.30', tol:'0', dir:-1}], {n:0, gapMin:'0.3'});
  assert(r.wcPass, 'wcLo ' + r.wcLo);
  assert(!E.stackCalc([{nom:'10', tol:'0.1', dir:1}], {n:0, gapMin:'9.95'}).wcPass, 'a real miss still fails');
});

test('a row without dir opens the gap, like stackCleanRow', () => {
  near(E.stackCalc([{nom:'10', tol:'0.1'}], {n:0}).nom, 10, 1e-12);
  assert.strictEqual(E.stackCleanChain({name:'', rows:[{}]}).rows[0].dir, 1);
});

test('an ISO code that cannot be applied is flagged in CSV and report', () => {
  const chain = {name:'big', gapMin:'', gapMax:'', rows:[{name:'r', nom:'600', tol:'0.1', dir:1, iso:'H7'}]};
  const r = E.stackCalc(chain.rows, {n:0});
  near(r.wc, 0.1, 1e-12, 'manual value used');
  assert(E.stackCsv(chain, r).includes('H7 NOT APPLIED'), 'csv');
  assert(E.stackReportHtml(chain, r, '').includes('not applied'), 'report');
});

console.log(n + ' tests passed');
