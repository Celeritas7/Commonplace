/* F2 personal examples. Fictional datasets are separate from D1 and assigned material.
   No accounts, persistent records, network requests or executable lesson data. */
(function (global) {
  'use strict';
  const curriculum = global.CommonplaceExcelCurriculum;
  const runtime = Object.freeze({ id: 'personal-references', version: 1 });
  const rubric = Object.freeze({ id: 'reference-foundations', version: 1 });
  const examples = {
    'general-office': {
      labels: ['Notebooks', 'Pens', 'Folders'], quantities: [12, 20, 8],
      prices: [180, 75, 240], landed: [2520, 1800, 2160], quotes: [5, 10],
      context: 'Prepare a small office supply order, compare quantity quotations and share a fictional PHP estimate with a partner.'
    },
    'jp-ph-trade': {
      labels: ['Used office chairs', 'Used rice cookers', 'Used electric fans'],
      quantities: [6, 4, 9], prices: [1800, 2400, 1600],
      landed: [12600, 11200, 17100], quotes: [2, 5],
      context: 'Prepare used goods for shipment from Japan to Manila. Calculate stock costs, compare buyer quantities and work out unit cost including shipping.'
    },
    'ph-customer-quote': {
      labels: ['Used bookshelf', 'Used dining table', 'Used electric fan'],
      quantities: [3, 2, 5], prices: [1800, 5200, 950],
      landed: [6600, 12000, 6000], quotes: [2, 4],
      context: 'Prepare a quotation for a Cebu buyer of used Japanese household goods. These new exercises start with fictional JPY costs and include a separate PHP conversion.'
    },
    'mechanical-engineering': {
      labels: ['M8 bolts', 'Bearings', 'Spacers'], quantities: [24, 4, 14],
      prices: [18, 780, 55], landed: [600, 3600, 980], quotes: [10, 25],
      context: 'Cost a mechanical assembly bill of materials, compare procurement quantities and prepare a fictional PHP estimate for a Philippine workshop.'
    },
    'monthly-expenses': {
      labels: ['Printer paper packs', 'Local delivery trips', 'Storage boxes'],
      quantities: [8, 6, 10], prices: [520, 680, 350],
      landed: [4560, 4500, 4200], quotes: [5, 12],
      context: 'Plan recurring office purchases and delivery costs. Compare quantity options and calculate a fictional PHP estimate for shared expenses.'
    }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  function lesson(id) {
    const ref = curriculum.resolveRuntime(runtime).lessons.find(item => item.id === id);
    if (!ref) throw Error('Unknown reference lesson.');
    return curriculum.resolveLesson(ref);
  }
  function scenario(id, version) {
    const value = global.CommonplaceExcelScenarios?.list().find(item => item.id === id && item.version === version);
    if (!value || !Object.hasOwn(examples, id)) throw Error('Unknown reference example or version.');
    return value;
  }
  function exercise(id, scenarioId, version, mode = 'guided') {
    if (!['guided', 'independent'].includes(mode)) throw Error('Unknown practice mode.');
    const l = lesson(id), s = scenario(scenarioId, version), data = clone(examples[s.id]);
    // Independent work uses a separately named dataset, rather than reusing a worked answer.
    if (mode === 'independent') {
      data.quantities = data.quantities.map((value, i) => value + i + 1);
      data.prices = data.prices.map((value, i) => value + 25 * (i + 1));
      data.landed = data.landed.map((value, i) => value + 250 * (i + 1));
      data.quotes = [data.quotes[0] + 1, data.quotes[1] + 2];
    }
    const cells = {}, quantities = [], labels = {}, values = {};
    const set = (address, value, label) => {
      cells[address] = String(value);
      if (label) labels[address] = label;
    };
    let unit = 'JPY', note = 'All quantities and amounts are fictional practice data.';
    if (id === 'relative-line-totals') {
      Object.assign(cells, { A1: 'Item', B1: 'Quantity', C1: 'Unit price (JPY)', D1: 'Line total (JPY)' });
      data.labels.forEach((label, i) => {
        const row = i + 3;
        set('A' + row, label); set('B' + row, data.quantities[i], 'Quantity for ' + label);
        set('C' + row, data.prices[i], 'Unit price in JPY for ' + label); quantities.push('B' + row);
      });
    } else if (id === 'absolute-rate') {
      Object.assign(cells, { A1: 'Item', B1: 'Cost (JPY)', C1: 'Value (PHP)', F1: 'PHP per JPY (fictional)' });
      data.labels.forEach((label, i) => {
        const row = i + 3;
        set('A' + row, label); set('B' + row, data.quantities[i] * data.prices[i], 'Cost in JPY for ' + label);
      });
      set('F2', mode === 'guided' ? '0.38' : '0.41', 'Fictional PHP per 1 JPY');
      unit = 'PHP'; note = 'F2 contains fictional PHP per 1 JPY. Multiply JPY by this rate. This is not a live exchange-rate quote.';
    } else if (id === 'mixed-quotation') {
      Object.assign(cells, { A1: 'Item', B1: 'Unit price (JPY)', C1: 'Quote A (JPY)', D1: 'Quote B (JPY)', A2: 'Units per quote' });
      set('C2', data.quotes[0], 'Units in quote A'); set('D2', data.quotes[1], 'Units in quote B');
      quantities.push('C2', 'D2');
      data.labels.slice(0, 2).forEach((label, i) => {
        const row = i + 3;
        set('A' + row, label); set('B' + row, data.prices[i], 'Unit price in JPY for ' + label);
      });
      note = 'Each result is one item at the quantity above its quote column. Preserve column B for unit prices and row 2 for quantities.';
    } else if (id === 'relative-unit-cost') {
      Object.assign(cells, { A1: 'Item', B1: 'Landed cost (JPY)', C1: 'Usable units', D1: 'Unit cost (JPY)' });
      data.labels.forEach((label, i) => {
        const row = i + 3;
        set('A' + row, label); set('B' + row, data.landed[i], 'Landed cost in JPY for ' + label);
        set('C' + row, data.quantities[i], 'Usable units for ' + label); quantities.push('C' + row);
      });
      unit = 'JPY per unit'; note = 'The given landed cost already includes shipping. Divide it by the units ready for use or sale to find an average unit cost.';
    } else throw Error('Unsupported reference example.');
    l.worksheet.inputCells.forEach(address => { values[address] = cells[address]; });
    [l.worksheet.sourceCell, ...l.worksheet.targetCells].forEach(address => { cells[address] = ''; });
    return {
      lesson: l, scenario: s, mode, values, cells, cellLabels: labels, quantityCells: quantities,
      dataset: { id: 'f2-' + s.id + '-' + l.id + '-' + mode, version: 1 },
      grid: { columns: id === 'absolute-rate' ? ['A', 'B', 'C', 'D', 'E', 'F'] : ['A', 'B', 'C', 'D'], rows: 5 },
      context: data.context, unit, note, formula: l.worksheet.formula,
      instruction: l.task + ' Enter the first formula in ' + l.worksheet.sourceCell +
        ', then copy it to ' + l.worksheet.targetCells.join(', ') + '.' +
        (mode === 'independent' ? ' Keep the starting inputs unchanged.' : ' Change an input to explore how each formula responds.')
    };
  }
  global.CommonplaceExcelReferenceFoundations = Object.freeze({
    list: () => curriculum.listLessons(runtime), exercise,
    copy: (formula, from, to) => curriculum.copyReferenceFormula(runtime, formula, from, to),
    evaluate: (formula, cells) => curriculum.evaluateReferenceFormula(runtime, formula, cells),
    grade: (ex, formulas, cells) => curriculum.gradeReferences(rubric, ex, formulas, cells)
  });
})(window);
