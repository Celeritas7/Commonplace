/* F3 fictional inventory examples. Personal practice only; no storage or account writes. */
(function (global) {
  'use strict';
  const curriculum = global.CommonplaceExcelCurriculum;
  const runtime = Object.freeze({ id: 'personal-tables', version: 1 });
  const rubric = Object.freeze({ id: 'table-foundations', version: 1 });
  const examples = {
    'general-office': {
      prefix: 'OF', currency: 'JPY',
      items: ['Notebooks', 'Desk lamps', 'Ballpoint pens', 'Storage boxes', 'Paper trays', 'Folders'],
      prices: [180, 2400, 75, 850, 650, 240],
      context: 'Prepare an office supply dispatch list. Keep item IDs, quantities, supplier discounts and planned delivery dates together.'
    },
    'jp-ph-trade': {
      prefix: 'JP', currency: 'JPY',
      items: ['Used office chairs', 'Used rice cookers', 'Used AC adapters', 'Used electric fans', 'Used bookshelves', 'Used kettles'],
      prices: [1800, 2400, 350, 1600, 4200, 950],
      context: 'Prepare used goods in Japan for shipment to Manila. Review available stock, quotation discounts and planned shipping dates before contacting buyers.'
    },
    'ph-customer-quote': {
      prefix: 'PH', currency: 'PHP',
      items: ['Used dining chairs', 'Used dining tables', 'Cable sets', 'Used electric fans', 'Used cabinets', 'Used lamps'],
      prices: [850.5, 3200, 125.75, 950, 2800, 425.25],
      context: 'Prepare a Cebu customer quotation list in Philippine pesos. Find ready items with enough stock and keep discounts and dispatch dates readable.'
    },
    'mechanical-engineering': {
      prefix: 'ME', currency: 'JPY',
      items: ['Bearings', 'Shaft couplings', 'M8 bolts', 'Mounting brackets', 'Gear housings', 'Spacers'],
      prices: [780, 2600, 18, 450, 6400, 55],
      context: 'Prepare a mechanical assembly supply list. Sort complete component records and filter parts ready for the workshop without losing their item IDs.'
    },
    'monthly-expenses': {
      prefix: 'EX', currency: 'JPY',
      items: ['Paper packs', 'Printer cartridges', 'Packing envelopes', 'Storage boxes', 'Replacement keyboards', 'Cleaning cloths'],
      prices: [520, 4800, 40, 850, 2600, 150],
      context: 'Review recurring office purchases for the monthly expense plan. Compare quantities, vendor discounts and planned delivery dates using a consistent table.'
    }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const serial = date => Date.parse(date + 'T00:00:00Z') / 86400000 + 25569;
  const instructions = {
    'number-formats': currency => 'Format Quantity as a whole number, Unit price as ' + currency + ' currency, Discount as a percentage, and Planned ship date as yyyy-mm-dd. Keep every underlying value unchanged.',
    'create-table': () => 'Create a table named PracticeItems for A1:G7. Include the existing headers and turn on banded rows. Keep all six item records unchanged.',
    'sort-records': () => 'Sort Quantity from smallest to largest. Move the complete item records together and show all six rows. Keep every item value unchanged.',
    'filter-records': () => 'Show only Ready items with Quantity at least 5. Apply both conditions together. Keep the other records in the worksheet and preserve their values.',
    'validate-entry': () => 'Enable both entry rules: Quantity must be a whole number from 0 to 10000, and Status must be Ready, Reserved or Shipped. Keep the existing item values unchanged and check them against the rules.'
  };
  function lesson(id) {
    const ref = curriculum.resolveRuntime(runtime).lessons.find(item => item.id === id);
    if (!ref) throw Error('Unknown table lesson.');
    return curriculum.resolveLesson(ref);
  }
  function exercise(id, scenarioId, version, mode = 'guided') {
    if (!['guided', 'independent'].includes(mode)) throw Error('Unknown practice mode.');
    const selected = global.CommonplaceExcelScenarios?.list().find(s => s.id === scenarioId && s.version === version);
    if (!selected || !Object.hasOwn(examples, scenarioId)) throw Error('Unknown table example or version.');
    const l = lesson(id), data = examples[scenarioId], independent = mode === 'independent';
    const quantities = independent ? [11, 3, 101, 8, 1, 23] : [10, 2, 100, 6, 0, 20];
    const statuses = ['Ready', 'Ready', 'Reserved', 'Ready', 'Shipped', 'Reserved'];
    const discounts = independent ? [0.06, 0.025, 0, 0.075, 0.1, 0.04] : [0.05, 0.02, 0, 0.1, 0.15, 0.025];
    const offsets = [4, 0, 7, 2, 1, 5], start = serial('2026-12-01') + (independent ? 14 : 0);
    const rows = data.items.map((item, i) => ({
      id: data.prefix + '-' + String(i + 1).padStart(3, '0'), item, status: statuses[i],
      quantity: quantities[i], unitPrice: data.prices[i] + (independent ? 25 * (i + 1) : 0),
      discount: discounts[i], shipDate: start + offsets[i]
    }));
    return {
      lesson: l, scenario: selected, mode, currency: data.currency, rows,
      dataset: { id: 'f3-' + scenarioId + '-' + id + '-' + mode, version: 1 },
      columns: [{ id: 'id', label: 'Item ID' }, { id: 'item', label: 'Item' },
        { id: 'status', label: 'Status' }, { id: 'quantity', label: 'Quantity' },
        { id: 'unitPrice', label: 'Unit price (' + data.currency + ')' },
        { id: 'discount', label: 'Discount' }, { id: 'shipDate', label: 'Planned ship date' }],
      context: data.context, instruction: instructions[id](data.currency),
      note: 'All records, prices, discounts and December 2026 dates are fictional. Currency formatting changes the display, not the amount or currency conversion.'
    };
  }
  function initial(ex) {
    const l = lesson(ex?.lesson?.id);
    if (ex.lesson.version !== l.version || !['JPY', 'PHP'].includes(ex.currency)) throw Error('Unsupported table exercise.');
    let state = curriculum.createTableState(runtime, clone(ex.rows));
    if (!['number-formats', 'create-table'].includes(l.id)) {
      const formats = { quantity: 'integer', unitPrice: ex.currency.toLowerCase(), discount: 'percent', shipDate: 'date' };
      for (const [column, format] of Object.entries(formats))
        state = curriculum.applyTableAction(runtime, state, { type: 'set-format', column, format });
      state = curriculum.applyTableAction(runtime, state,
        { type: 'create-table', name: 'PracticeItems', range: 'A1:G7', headers: true, banded: true });
    }
    return state;
  }
  global.CommonplaceExcelTableFoundations = Object.freeze({
    list: () => curriculum.listLessons(runtime), exercise, initial,
    apply: (state, action) => curriculum.applyTableAction(runtime, state, action),
    view: state => curriculum.tableView(runtime, state),
    format: (column, value, format) => curriculum.formatTableValue(runtime, column, value, format),
    inspect: state => curriculum.inspectTableValidation(runtime, state),
    grade: (ex, state) => curriculum.gradeTables(rubric, ex, state)
  });
})(window);
