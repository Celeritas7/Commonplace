import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { XMLValidator } from 'fast-xml-parser';

const read = name => readFileSync(new URL('../../Office_work/Excel_study/' + name, import.meta.url), 'utf8');
const win = {};
for (const name of ['formula-syntax.js', 'excel-curriculum.js', 'excel-scenarios.js',
  'excel-formula-foundations.js', 'excel-reference-foundations.js', 'excel-tutorial-workbooks.js'])
  new Function('window', 'TextEncoder', read(name))(win, TextEncoder);
const E = win.CommonplaceExcelReferenceFoundations;
const S = win.CommonplaceExcelScenarios;
const W = win.CommonplaceExcelTutorials;
const ids = ['relative-line-totals', 'absolute-rate', 'mixed-quotation', 'relative-unit-cost'];
const reviewed = [
  { D3: 'B3*C3', D4: 'B4*C4', D5: 'B5*C5' },
  { C3: 'B3*$F$2', C4: 'B4*$F$2', C5: 'B5*$F$2' },
  { C3: '$B3*C$2', D3: '$B3*D$2', C4: '$B4*C$2', D4: '$B4*D$2' },
  { D3: 'B3/C3', D4: 'B4/C4', D5: 'B5/C5' }
];
const sheetNames = ['Read me', '01 Line totals', '02 Fixed rate', '03 Quote grid', '04 Unit cost'];
const approx = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const unpack = bytes => Object.fromEntries(Object.entries(unzipSync(bytes)).map(([name, data]) => [name, strFromU8(data)]));
function getCell(xml, address) {
  const start = xml.indexOf('<c r="' + address + '"');
  if (start < 0) return '';
  const head = xml.indexOf('>', start);
  return xml.slice(start, xml[head - 1] === '/' ? head + 1 : xml.indexOf('</c>', head) + 4);
}
const value = (xml, address) => getCell(xml, address).match(/<v>([^<]*)<\/v>/)?.[1] ?? null;
function formulaSet(ex) {
  const { sourceCell, targetCells, formula } = ex.lesson.worksheet;
  return Object.fromEntries([sourceCell, ...targetCells].map(address => [address, E.copy(formula, sourceCell, address)]));
}
// Independent arithmetic oracle: fixtures are evaluated without the shared formula engine.
function expected(ex, lessonId) {
  const n = address => Number(ex.values[address]);
  if (lessonId === 'relative-line-totals')
    return Object.fromEntries([3, 4, 5].map(r => ['D' + r, n('B' + r) * n('C' + r)]));
  if (lessonId === 'absolute-rate')
    return Object.fromEntries([3, 4, 5].map(r => ['C' + r, n('B' + r) * n('F2')]));
  if (lessonId === 'mixed-quotation')
    return { C3: n('B3') * n('C2'), D3: n('B3') * n('D2'), C4: n('B4') * n('C2'), D4: n('B4') * n('D2') };
  return Object.fromEntries([3, 4, 5].map(r => ['D' + r, n('B' + r) / n('C' + r)]));
}

test('F2 has separate guided and independent versioned datasets for all four lessons in all five contexts', () => {
  assert.deepEqual(E.list().map(l => l.id), ids);
  const original = JSON.stringify(S.list()), datasets = new Set();
  for (const s of S.list()) {
    for (const id of ids) {
      const guided = E.exercise(id, s.id, s.version);
      const independent = E.exercise(id, s.id, s.version, 'independent');
      assert.notDeepEqual(independent.values, guided.values);
      for (const ex of [guided, independent]) {
        assert.deepEqual(ex.scenario, s);
        assert.deepEqual(ex.lesson.runtime, { id: 'personal-references', version: 1 });
        assert.deepEqual(ex.lesson.rubric, { id: 'reference-foundations', version: 1 });
        assert.deepEqual(Object.keys(ex.values), ex.lesson.worksheet.inputCells);
        assert.ok(Object.values(ex.values).every(v => typeof v === 'string' && Number.isFinite(Number(v))));
        for (const [address, input] of Object.entries(ex.values)) {
          assert.equal(ex.cells[address], input);
          assert.ok(ex.cellLabels[address]);
        }
        assert.equal(ex.dataset.version, 1);
        assert.equal(ex.dataset.id, `f2-${s.id}-${id}-${ex.mode}`);
        assert.ok(!datasets.has(ex.dataset.id)); datasets.add(ex.dataset.id);
        assert.equal(ex.grid.rows, 5);
        assert.deepEqual(ex.grid.columns, id === 'absolute-rate' ? ['A', 'B', 'C', 'D', 'E', 'F'] : ['A', 'B', 'C', 'D']);
        const formulas = formulaSet(ex), answers = expected(ex, id);
        for (const [address, formula] of Object.entries(formulas)) {
          assert.equal(ex.cells[address], '');
          const result = E.evaluate(formula, ex.cells);
          assert.equal(result.error, null); approx(result.result, answers[address]);
        }
        assert.equal(E.grade(ex, formulas, ex.cells).passed, true);
        assert.equal(E.grade(ex, formulas, ex.cells).criteria.length, Object.keys(formulas).length * 2 + (ex.mode === 'independent' ? 1 : 0));
      }
    }
  }
  assert.equal(datasets.size, 40);
  assert.equal(JSON.stringify(S.list()), original, 'new examples must not mutate D1 scenarios');
});

test('F2 examples have meaningful units, explicit fictional rates and isolated mutable exercise state', () => {
  const s = 'jp-ph-trade';
  assert.deepEqual(expected(E.exercise(ids[0], s, 1), ids[0]), { D3: 10800, D4: 9600, D5: 14400 });
  assert.deepEqual(expected(E.exercise(ids[1], s, 1), ids[1]), { C3: 4104, C4: 3648, C5: 5472 });
  assert.deepEqual(expected(E.exercise(ids[2], s, 1), ids[2]), { C3: 3600, D3: 9000, C4: 4800, D4: 12000 });
  assert.deepEqual(expected(E.exercise(ids[3], s, 1), ids[3]), { D3: 2100, D4: 2800, D5: 1900 });
  const fixed = E.exercise(ids[1], s, 1);
  assert.equal(fixed.cells.F2, '0.38');
  assert.match(fixed.cells.F1, /PHP per JPY.*fictional/);
  assert.match(fixed.note, /not a live exchange-rate quote/);
  assert.equal(fixed.cells.F3, undefined); assert.equal(fixed.cells.F4, undefined);
  assert.equal(E.evaluate(E.copy('=B3*F2', 'C3', 'C4'), fixed.cells).result, 0);
  const unitCost = E.exercise(ids[3], s, 1);
  assert.equal(unitCost.cells.C1, 'Usable units'); assert.equal(unitCost.unit, 'JPY per unit');
  assert.match(unitCost.note, /already includes shipping/);
  assert.match(E.exercise(ids[0], 'mechanical-engineering', 1).cells.A3, /bolt/i);
  assert.match(E.exercise(ids[0], 'ph-customer-quote', 1).context, /fictional JPY costs/);
  fixed.cells.B3 = '999'; fixed.values.F2 = '9'; fixed.scenario.title = 'Edited';
  assert.equal(E.exercise(ids[1], s, 1).cells.B3, '10800');
  assert.equal(E.exercise(ids[1], s, 1).values.F2, '0.38');
  assert.notEqual(S.list().find(x => x.id === s).title, 'Edited');
  for (const args of [['unknown', s, 1], [ids[0], '__proto__', 1], [ids[0], s, 2], [ids[0], s, '1'], [ids[0], s, 1, 'assigned']])
    assert.throws(() => E.exercise(...args));
  assert.throws(() => E.copy('=B 3*C3', 'D3', 'D4'));
  assert.equal(E.evaluate('=B3/C3', { B3: '100', C3: '' }).error, '#DIV/0!');
});

test('all ten F2 XLSX files contain the guided grid, valid XML and separated blank answers or reviewed formulas', () => {
  for (const s of S.list()) {
    for (const kind of ['practice', 'solution']) {
      const file = W.createReferenceWorkbook(s.id, s.version, kind);
      const model = W.buildReferenceModel(s.id, s.version, kind);
      const parts = unpack(file.bytes);
      assert.equal(file.filename, `Commonplace-Excel-${s.id}-v1-F2-${kind}.xlsx`);
      assert.equal(file.mime, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      assert.deepEqual(model.sheets.map(sheet => sheet.name), sheetNames);
      assert.equal(Object.keys(parts).length, 10);
      for (const [name, xml] of Object.entries(parts)) assert.equal(XMLValidator.validate(xml), true, name);
      assert.match(parts['xl/styles.xml'], /cellXfs count="13"/);
      assert.match(parts['xl/workbook.xml'], /calcMode="auto" fullCalcOnLoad="1"/);
      const joined = Object.values(parts).join('');
      assert.doesNotMatch(joined, /TargetMode="External"|vbaProject|WEBSERVICE|externalLink/);
      assert.match(parts['xl/worksheets/sheet1.xml'], /fictional PHP-per-JPY rate/);
      assert.match(parts['xl/worksheets/sheet1.xml'], new RegExp(s.id));
      ids.forEach((id, i) => {
        const ex = E.exercise(id, s.id, s.version, 'guided');
        const answers = expected(ex, id), xml = parts[`xl/worksheets/sheet${i + 2}.xml`];
        assert.match(parts['xl/_rels/workbook.xml.rels'], new RegExp(`worksheets/sheet${i + 2}\\.xml`));
        assert.match(parts['[Content_Types].xml'], new RegExp(`/xl/worksheets/sheet${i + 2}\\.xml`));
        for (const [address, input] of Object.entries(ex.values)) {
          assert.equal(value(xml, address), String(Number(input)));
          assert.match(getCell(xml, address), new RegExp(`s="${ex.quantityCells.includes(address) ? 2 : 10}"`));
        }
        for (const [address, formula] of Object.entries(reviewed[i])) {
          if (kind === 'practice') assert.equal(getCell(xml, address), `<c r="${address}" s="12"/>`);
          else {
            assert.ok(getCell(xml, address).includes(`<f>${formula}</f>`), `${id}: ${address}`);
            approx(Number(value(xml, address)), answers[address]);
          }
        }
        assert.match(xml, /mergeCells count="4"/);
        assert.match(xml, /dataset 1/);
        if (id === 'absolute-rate') {
          assert.equal(value(xml, 'F2'), '0.38');
          assert.equal(getCell(xml, 'F3'), '<c r="F3" s="0"/>');
          assert.equal(getCell(xml, 'F4'), '<c r="F4" s="0"/>');
        }
      });
      if (kind === 'practice') assert.doesNotMatch(joined, /<f>/);
      assert.deepEqual(W.createReferenceWorkbook(s.id, s.version, kind).bytes, file.bytes, 'deterministic generation');
    }
  }
  for (const args of [['unknown', 1, 'practice'], ['jp-ph-trade', 2, 'practice'], ['jp-ph-trade', 1, 'macro']])
    assert.throws(() => W.createReferenceWorkbook(...args));
});

test('F2 export rejects formulas outside its exact lesson-address allowlist and does not widen F1 export', () => {
  const originalReferences = win.CommonplaceExcelReferenceFoundations;
  const originalFormulas = win.CommonplaceExcelFormulaFoundations;
  try {
    for (const formula of ['=SUM(B2:B4)', '=WEBSERVICE("https://example.invalid")', '=B3*C4', '=B3/C3']) {
      win.CommonplaceExcelReferenceFoundations = { ...originalReferences, copy: () => formula, evaluate: () => ({ result: 1, error: null }) };
      assert.throws(() => W.createReferenceWorkbook('jp-ph-trade', 1, 'solution'), /Unexpected formula/);
    }
    win.CommonplaceExcelFormulaFoundations = {
      ...originalFormulas,
      exercise: (...args) => ({ ...originalFormulas.exercise(...args), formula: '=B3*C3' }),
      evaluate: () => ({ result: 1, error: null })
    };
    assert.throws(() => W.createFormulaWorkbook('jp-ph-trade', 1, 'solution'), /Unexpected formula/);
  } finally {
    win.CommonplaceExcelReferenceFoundations = originalReferences;
    win.CommonplaceExcelFormulaFoundations = originalFormulas;
  }
});

// SHA-256 fixtures captured from main before adding F2. Existing offline downloads
// remain byte-for-byte identical across every D2/F1 context and workbook type.
const legacy = [
  ['general-office', '97898f2a786460dade99798b68e82a9b61053032eaedd9e6343a7c15e9256748', '1de2054cd6ee07833c12c442a9e5ca1405c7327e3edd3c7db85154565a971692', 'f6c695a0e4b02ce2d1c833bbf72f6d99d0ba2b93253a9094ea16031aed8e58c1', '07ad219e45e476c657b8b1c08c2016fdc3f8bd88bff36d9921ec4d208a80da78'],
  ['jp-ph-trade', '7cc1e3cedbb8e1b9789ff1c31bec56289a925aa86fafaf365aad3530bfa6c9b8', '61a227af450f6c250be90369c5756164355ea0cb68f6c8b16cb957ef4e02afbc', 'a0e92d0646723bcb0a8f485d5ea6d544de0360a68a396bc58d45819abec058db', 'be885c8579b9ec95537dc473b0cb44e77ea131dfde91a7af1c8d1c1311ee9716'],
  ['ph-customer-quote', '8928b745c643f6fe61e4447066ee917e2d73808772aae4115f67bd9976c38490', '35ddac4f689c441a440d214c365a3d03990deca39996b0a404625399fd2d00ca', 'ffe5b0abf89f169cbe00cdc97aed3670f64fb26fc051be4ad4b312363bdd9df4', '194e8179925725429e61f6d2326a85c31e4db190e77d19071c501cec263bea43'],
  ['mechanical-engineering', '4026df4c1ce77d9dcc9a4bad2f4dcc09dba8cb2f56d609e2f219eec69f43081a', '3d2dd93d056ab0d505783042f9587c1f4e01439fd8016564a4aeccb75c7170fc', 'c3f3eefe667d2b06f29e6d03af7ac74ea4e4eb9fb60374c3b8a8c02b2a3a83e4', 'dcaf8398430a624c6374b3413a1f53d7588b3a8e1a5d0e774e89f73835d0747c'],
  ['monthly-expenses', '1e09d35299cdd19d0171d5962adeabeda8539504f0fa94511cb47ec264b2e9c5', 'e996215c87bbacde17d411c3eaefe9783b4d8678a1d8edb9d3605d86887601ba', '7763df7d28a4c08c341dfe5862eea262b695c398df5edae798695a5a32c8eca0', 'f0eda8669614e950f12a705dbaddaab4ff472fa3c22a43d84fdf63176f54818b']
];
test('all twenty existing D2/F1 XLSX outputs retain their exact bytes', () => {
  for (const [id, ...hashes] of legacy) {
    [W.createWorkbook, W.createFormulaWorkbook].forEach((create, i) => {
      ['practice', 'solution'].forEach((kind, j) => {
        const file = create(id, 1, kind);
        assert.equal(createHash('sha256').update(file.bytes).digest('hex'), hashes[i * 2 + j], file.filename);
      });
    });
  }
});
