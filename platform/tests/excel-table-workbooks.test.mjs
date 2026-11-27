import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const read = name => readFileSync(new URL('../../Office_work/Excel_study/' + name, import.meta.url), 'utf8');
const win = {};
for (const name of ['formula-syntax.js', 'excel-curriculum.js', 'excel-scenarios.js',
  'excel-formula-foundations.js', 'excel-reference-foundations.js', 'excel-table-foundations.js', 'excel-tutorial-workbooks.js'])
  new Function('window', 'TextEncoder', read(name))(win, TextEncoder);
const E = win.CommonplaceExcelTableFoundations, S = win.CommonplaceExcelScenarios, W = win.CommonplaceExcelTutorials;
const ids = ['number-formats', 'create-table', 'sort-records', 'filter-records', 'validate-entry'];
const fields = ['id', 'item', 'status', 'quantity', 'unitPrice', 'discount', 'shipDate'];
const sheetNames = ['Read me', '01 Formats', '02 Table', '03 Sort', '04 Filter', '05 Validation'];
const parse = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', parseTagValue: false });
const list = value => value == null ? [] : Array.isArray(value) ? value : [value];
const unpack = bytes => Object.fromEntries(Object.entries(unzipSync(bytes)).map(([name, data]) => [name, strFromU8(data)]));
function dataRows(xml) {
  return list(parse.parse(xml).worksheet.sheetData.row).filter(row => Number(row['@r']) >= 2 && Number(row['@r']) <= 7)
    .map(row => ({ number: Number(row['@r']), hidden: row['@hidden'] === '1', cells: list(row.c) }));
}
function cellValue(cell) {
  if (cell['@t'] !== 'inlineStr') return Number(cell.v);
  return typeof cell.is.t === 'object' ? cell.is.t['#text'] : cell.is.t;
}
function expectedState(ex) {
  let state = E.initial(ex);
  const action = a => { state = E.apply(state, a); };
  if (ex.lesson.id === ids[0]) for (const [column, format] of Object.entries({ quantity: 'integer', unitPrice: ex.currency.toLowerCase(), discount: 'percent', shipDate: 'date' }))
    action({ type: 'set-format', column, format });
  if (ex.lesson.id === ids[1]) action({ type: 'create-table', name: 'PracticeItems', range: 'A1:G7', headers: true, banded: true });
  if (ex.lesson.id === ids[2]) action({ type: 'sort', column: 'quantity', direction: 'asc' });
  if (ex.lesson.id === ids[3]) action({ type: 'filter', status: 'Ready', minimumQuantity: 5 });
  if (ex.lesson.id === ids[4]) for (const column of ['quantity', 'status']) action({ type: 'set-validation', column, enabled: true });
  return state;
}

test('F3 prepares 50 exact, separate mode/context/lesson datasets without changing earlier scenarios', () => {
  const before = JSON.stringify(S.list()), datasets = new Set();
  assert.deepEqual(E.list().map(l => l.id), ids);
  for (const scenario of S.list()) for (const id of ids) {
    const guided = E.exercise(id, scenario.id, 1), independent = E.exercise(id, scenario.id, 1, 'independent');
    assert.notDeepEqual(guided.rows, independent.rows);
    for (const ex of [guided, independent]) {
      assert.deepEqual(ex.scenario, scenario);
      assert.deepEqual(ex.lesson.runtime, { id: 'personal-tables', version: 1 });
      assert.deepEqual(ex.lesson.rubric, { id: 'table-foundations', version: 1 });
      assert.deepEqual(ex.columns.map(c => c.id), fields);
      assert.equal(ex.rows.length, 6);
      assert.equal(new Set(ex.rows.map(row => row.id)).size, 6);
      assert.equal(ex.dataset.version, 1);
      assert.match(ex.dataset.id, new RegExp('^f3-' + scenario.id + '-' + id + '-' + ex.mode + '$'));
      assert.equal(ex.currency, scenario.id === 'ph-customer-quote' ? 'PHP' : 'JPY');
      assert.match(ex.context, /\S/);
      assert.match(ex.note, /fictional/);
      for (const row of ex.rows) {
        for (const key of ['quantity', 'unitPrice', 'discount', 'shipDate']) assert.equal(typeof row[key], 'number');
        assert.ok(Number.isInteger(row.shipDate));
        assert.equal(new Date((row.shipDate - 25569) * 86400000).getUTCFullYear(), 2026);
      }
      assert.ok(ex.rows.some(row => row.status === 'Ready' && row.quantity < 5));
      assert.ok(ex.rows.filter(row => row.status === 'Ready' && row.quantity >= 5).length >= 2);
      const initial = E.initial(ex), saved = structuredClone(initial), completed = expectedState(ex);
      assert.equal(initial.table === null, id === ids[0] || id === ids[1]);
      assert.equal(E.grade(ex, initial).passed, false);
      assert.equal(E.grade(ex, completed).passed, true);
      assert.deepEqual(initial, saved);
      assert.deepEqual(completed.rows, ex.rows);
      datasets.add(ex.dataset.id);
    }
  }
  assert.equal(datasets.size, 50);
  assert.equal(JSON.stringify(S.list()), before);
  const detached = E.exercise(ids[0], 'jp-ph-trade', 1); detached.rows[0].item = 'Changed';
  assert.notEqual(E.exercise(ids[0], 'jp-ph-trade', 1).rows[0].item, 'Changed');
  for (const args of [['unknown', 'jp-ph-trade', 1], [ids[0], 'unknown', 1], [ids[0], 'jp-ph-trade', 2], [ids[0], 'jp-ph-trade', 1, 'unknown']])
    assert.throws(() => E.exercise(...args));
});

test('F3 produces ten native XLSX files with typed intact records, unique tables, formats, sorted rows and retained hidden rows', () => {
  for (const scenario of S.list()) for (const kind of ['practice', 'solution']) {
    const done = kind === 'solution', file = W.createTableWorkbook(scenario.id, 1, kind), parts = unpack(file.bytes);
    assert.equal(file.filename, `Commonplace-Excel-${scenario.id}-v1-F3-${kind}.xlsx`);
    assert.equal(file.mime, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(file.bytes.length > 20000 && file.bytes.length < 100000);
    for (const [path, xml] of Object.entries(parts)) assert.equal(XMLValidator.validate(xml), true, path);
    const book = parse.parse(parts['xl/workbook.xml']).workbook;
    assert.deepEqual(list(book.sheets.sheet).map(s => s['@name']), sheetNames);
    assert.equal(book.workbookPr['@date1904'], '0');
    assert.equal(Object.keys(parts).filter(path => /^xl\/tables\/table\d+\.xml$/.test(path)).length, done ? 4 : 3);
    const names = [];
    for (let index = 0; index < ids.length; index++) {
      const ex = E.exercise(ids[index], scenario.id, 1), xml = parts[`xl/worksheets/sheet${index + 2}.xml`];
      const rows = dataRows(xml);
      assert.equal(rows.length, 6, 'Filtering must keep all six records');
      const actual = rows.map(row => Object.fromEntries(row.cells.map((c, i) => [fields[i], cellValue(c)])));
      assert.deepEqual(actual.slice().sort((a, b) => a.id.localeCompare(b.id)), ex.rows.slice().sort((a, b) => a.id.localeCompare(b.id)));
      for (const row of rows) for (const cell of row.cells.slice(3)) assert.equal(cell['@t'], undefined, 'Numbers and dates must remain numeric');
      if (index === 2 && done) assert.deepEqual(actual.map(row => row.quantity), [0, 2, 6, 10, 20, 100]);
      else assert.deepEqual(actual.map(row => row.id), ex.rows.map(row => row.id));
      assert.deepEqual(rows.filter(row => !row.hidden).map(row => actual[row.number - 2].id),
        index === 3 && done ? ex.rows.filter(row => row.status === 'Ready' && row.quantity >= 5).map(row => row.id) : actual.map(row => row.id));
      assert.equal(rows.filter(row => row.hidden).length, index === 3 && done ? 4 : 0);
      const first = rows[0].cells;
      if (index === 0) assert.deepEqual(first.slice(3).map(cell => cell['@s']), done ? ['4', ex.currency === 'JPY' ? '6' : '7', '8', '9'] : ['0', '0', '0', '0']);
      const relPath = `xl/worksheets/_rels/sheet${index + 2}.xml.rels`;
      const hasTable = index >= 2 || index === 1 && done;
      assert.equal(Object.hasOwn(parts, relPath), hasTable);
      if (hasTable) {
        const relationship = parse.parse(parts[relPath]).Relationships.Relationship;
        assert.equal(relationship['@Type'], 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/table');
        const tablePath = 'xl/' + relationship['@Target'].slice(3), table = parse.parse(parts[tablePath]).table;
        assert.equal(table['@ref'], 'A1:G7'); assert.equal(table['@headerRowCount'], '1');
        assert.equal(table['@totalsRowShown'], '0'); assert.equal(table.tableStyleInfo['@showRowStripes'], '1');
        assert.equal(list(table.tableColumns.tableColumn).length, 7);
        assert.deepEqual(list(table.tableColumns.tableColumn).map(c => c['@name']), ex.columns.map(c => c.label));
        assert.ok(parts['[Content_Types].xml'].includes(`PartName="/${tablePath}"`));
        names.push(table['@name']);
        if (index === 2 && done) assert.deepEqual(table.sortState, { sortCondition: { '@ref': 'D2:D7', '@descending': '0' }, '@ref': 'A2:G7' });
        else assert.equal(table.sortState, undefined);
        const filters = list(table.autoFilter.filterColumn);
        if (index === 3 && done) {
          assert.deepEqual(filters, [{ filters: { filter: { '@val': 'Ready' } }, '@colId': '2' },
            { customFilters: { customFilter: { '@operator': 'greaterThanOrEqual', '@val': '5' } }, '@colId': '3' }]);
          assert.equal(parse.parse(xml).worksheet.sheetPr['@filterMode'], '1');
        } else assert.equal(filters.length, 0);
      }
    }
    assert.equal(new Set(names).size, names.length);
    assert.deepEqual(names, done ? ['PracticeItems', 'SortItems', 'FilterItems', 'ValidationItems'] : ['SortItems', 'FilterItems', 'ValidationItems']);
    const formats = list(parse.parse(parts['xl/styles.xml']).styleSheet.numFmts.numFmt);
    assert.deepEqual(formats.map(f => f['@formatCode']), ['"JPY" #,##0', '"PHP" #,##0.00', '0.0%', 'yyyy-mm-dd']);
    for (const xml of Object.values(parts)) {
      assert.doesNotMatch(xml, /<f[ >]|externalLink|vbaProject|<sheetProtection/);
      assert.doesNotMatch(xml, /TargetMode="External"/);
    }
  }
});

test('F3 validation solution contains native whole and list Stop rules with bounded worksheet references', () => {
  for (const scenario of S.list()) for (const kind of ['practice', 'solution']) {
    const parts = unpack(W.createTableWorkbook(scenario.id, 1, kind).bytes);
    for (let sheet = 1; sheet <= 6; sheet++) {
      const worksheet = parse.parse(parts[`xl/worksheets/sheet${sheet}.xml`]).worksheet;
      const rules = list(worksheet.dataValidations?.dataValidation);
      if (sheet !== 6 || kind === 'practice') { assert.equal(rules.length, 0); continue; }
      assert.equal(worksheet.dataValidations['@count'], '2');
      const whole = rules.find(rule => rule['@type'] === 'whole'), statuses = rules.find(rule => rule['@type'] === 'list');
      assert.equal(whole['@sqref'], 'D2:D7'); assert.equal(whole['@operator'], 'between');
      assert.equal(whole.formula1, '0'); assert.equal(whole.formula2, '10000');
      assert.equal(statuses['@sqref'], 'C2:C7'); assert.equal(statuses.formula1, '"Ready,Reserved,Shipped"');
      assert.equal(statuses['@showDropDown'], '0');
      for (const rule of rules) { assert.equal(rule['@errorStyle'], 'stop'); assert.equal(rule['@showErrorMessage'], '1'); assert.equal(rule['@allowBlank'], '0'); }
    }
  }
});

test('F3 exporter rejects unsupported contexts, versions and kinds without widening prior exporters', () => {
  for (const args of [['missing', 1, 'practice'], ['jp-ph-trade', 2, 'solution'], ['jp-ph-trade', 1, 'answers']])
    assert.throws(() => W.createTableWorkbook(...args));
  const previous = win.CommonplaceExcelTableFoundations;
  try {
    win.CommonplaceExcelTableFoundations = undefined;
    assert.throws(() => W.createTableWorkbook('jp-ph-trade', 1, 'practice'), /library/);
    assert.ok(W.createWorkbook('jp-ph-trade', 1, 'practice').bytes.length > 0);
    assert.ok(W.createFormulaWorkbook('jp-ph-trade', 1, 'practice').bytes.length > 0);
    assert.ok(W.createReferenceWorkbook('jp-ph-trade', 1, 'practice').bytes.length > 0);
  } finally { win.CommonplaceExcelTableFoundations = previous; }
});

// Captured from the reviewed D2/F1/F2 writer before adding any F3 code.
const legacyHashes = {
  "Commonplace-Excel-general-office-v1-practice.xlsx": "97898f2a786460dade99798b68e82a9b61053032eaedd9e6343a7c15e9256748",
  "Commonplace-Excel-general-office-v1-F1-practice.xlsx": "f6c695a0e4b02ce2d1c833bbf72f6d99d0ba2b93253a9094ea16031aed8e58c1",
  "Commonplace-Excel-general-office-v1-F2-practice.xlsx": "050c340f63a7e75d254587eee9cd0241a03cb5e2ba839ab393d782f1cc767d4c",
  "Commonplace-Excel-general-office-v1-solution.xlsx": "1de2054cd6ee07833c12c442a9e5ca1405c7327e3edd3c7db85154565a971692",
  "Commonplace-Excel-general-office-v1-F1-solution.xlsx": "07ad219e45e476c657b8b1c08c2016fdc3f8bd88bff36d9921ec4d208a80da78",
  "Commonplace-Excel-general-office-v1-F2-solution.xlsx": "438be965e1ed3484efe351111dbaf8114caeed89be179abc3529e6de3883af57",
  "Commonplace-Excel-jp-ph-trade-v1-practice.xlsx": "7cc1e3cedbb8e1b9789ff1c31bec56289a925aa86fafaf365aad3530bfa6c9b8",
  "Commonplace-Excel-jp-ph-trade-v1-F1-practice.xlsx": "a0e92d0646723bcb0a8f485d5ea6d544de0360a68a396bc58d45819abec058db",
  "Commonplace-Excel-jp-ph-trade-v1-F2-practice.xlsx": "ddbc3fb445405574bb3854b3e4e651093e42577bd7e7cfec1939c0873afa9a31",
  "Commonplace-Excel-jp-ph-trade-v1-solution.xlsx": "61a227af450f6c250be90369c5756164355ea0cb68f6c8b16cb957ef4e02afbc",
  "Commonplace-Excel-jp-ph-trade-v1-F1-solution.xlsx": "be885c8579b9ec95537dc473b0cb44e77ea131dfde91a7af1c8d1c1311ee9716",
  "Commonplace-Excel-jp-ph-trade-v1-F2-solution.xlsx": "ce7bf828c0729475444ea06cf5ebce13b4ee0d5e03c0ae9f10ad728f896ca3b3",
  "Commonplace-Excel-ph-customer-quote-v1-practice.xlsx": "8928b745c643f6fe61e4447066ee917e2d73808772aae4115f67bd9976c38490",
  "Commonplace-Excel-ph-customer-quote-v1-F1-practice.xlsx": "ffe5b0abf89f169cbe00cdc97aed3670f64fb26fc051be4ad4b312363bdd9df4",
  "Commonplace-Excel-ph-customer-quote-v1-F2-practice.xlsx": "29146fa27786b857d2c5741f3fd91ac0afd7b6e972349fc55021bb74c4a1e292",
  "Commonplace-Excel-ph-customer-quote-v1-solution.xlsx": "35ddac4f689c441a440d214c365a3d03990deca39996b0a404625399fd2d00ca",
  "Commonplace-Excel-ph-customer-quote-v1-F1-solution.xlsx": "194e8179925725429e61f6d2326a85c31e4db190e77d19071c501cec263bea43",
  "Commonplace-Excel-ph-customer-quote-v1-F2-solution.xlsx": "cb03295e23cf8a25612342d0b99f0471f2e4298e2cc5da28108b6d2a5cb31083",
  "Commonplace-Excel-mechanical-engineering-v1-practice.xlsx": "4026df4c1ce77d9dcc9a4bad2f4dcc09dba8cb2f56d609e2f219eec69f43081a",
  "Commonplace-Excel-mechanical-engineering-v1-F1-practice.xlsx": "c3f3eefe667d2b06f29e6d03af7ac74ea4e4eb9fb60374c3b8a8c02b2a3a83e4",
  "Commonplace-Excel-mechanical-engineering-v1-F2-practice.xlsx": "ced66d24e095fe8b959fa7b1c2d446d7944d503aaeaf1f4a3bcd514c6f4cc966",
  "Commonplace-Excel-mechanical-engineering-v1-solution.xlsx": "3d2dd93d056ab0d505783042f9587c1f4e01439fd8016564a4aeccb75c7170fc",
  "Commonplace-Excel-mechanical-engineering-v1-F1-solution.xlsx": "dcaf8398430a624c6374b3413a1f53d7588b3a8e1a5d0e774e89f73835d0747c",
  "Commonplace-Excel-mechanical-engineering-v1-F2-solution.xlsx": "672f85bfb23d1140190899a5f42e1a9676fc4a595e184b3ae239aab459299fc7",
  "Commonplace-Excel-monthly-expenses-v1-practice.xlsx": "1e09d35299cdd19d0171d5962adeabeda8539504f0fa94511cb47ec264b2e9c5",
  "Commonplace-Excel-monthly-expenses-v1-F1-practice.xlsx": "7763df7d28a4c08c341dfe5862eea262b695c398df5edae798695a5a32c8eca0",
  "Commonplace-Excel-monthly-expenses-v1-F2-practice.xlsx": "dec5092439e5eecb71bc1d9ba3c5818660c6b200c319932f207516a1734cd805",
  "Commonplace-Excel-monthly-expenses-v1-solution.xlsx": "e996215c87bbacde17d411c3eaefe9783b4d8678a1d8edb9d3605d86887601ba",
  "Commonplace-Excel-monthly-expenses-v1-F1-solution.xlsx": "f0eda8669614e950f12a705dbaddaab4ff472fa3c22a43d84fdf63176f54818b",
  "Commonplace-Excel-monthly-expenses-v1-F2-solution.xlsx": "bfd18f17ce73002c52fc2ed906fcaa8ee132740b201d9e420a3e64bc336a885b"
};
test('F3 preserves all thirty earlier D2, F1 and F2 workbook outputs byte-for-byte', () => {
  let count = 0;
  for (const s of S.list()) for (const kind of ['practice', 'solution'])
    for (const name of ['createWorkbook', 'createFormulaWorkbook', 'createReferenceWorkbook']) {
      const file = W[name](s.id, 1, kind);
      assert.equal(createHash('sha256').update(file.bytes).digest('hex'), legacyHashes[file.filename], file.filename);
      count++;
    }
  assert.equal(count, 30);
});
