/* Fictional F4A datasets; no account, persistent storage or network. */
(function (global) {
  'use strict';
  const curriculum = global.CommonplaceExcelCurriculum;
  const scenarios = global.CommonplaceExcelScenarios;
  const runtime = Object.freeze({ id: 'personal-decisions', version: 1 });
  const rubric = Object.freeze({ id: 'decision-foundations', version: 1 });
  const data = {
    'jp-ph-trade': { labels: ['Used office chairs','Used rice cookers','Used electric fans'],
      guided: [[6,5],[4,5],[9,9]], independent: [[3,4],[8,5],[6,6]],
      unit: 'items', actual: 'Ready stock', target: 'Minimum to ship',
      context: 'Check whether each used-goods batch has enough ready stock for its Manila shipment.' },
    'ph-customer-quote': { labels: ['Used bookshelf','Used dining table','Used electric fan'],
      guided: [[1800,1500],[3200,3500],[950,950]], independent: [[1400,1500],[4200,3500],[900,900]],
      unit: 'PHP', actual: 'Quoted amount', target: 'Minimum acceptable quote',
      context: 'Check whether each fictional Cebu customer quotation meets its minimum acceptable price.' },
    'mechanical-engineering': { labels: ['M8 bolts','Bearings','Spacers'],
      guided: [[24,20],[4,8],[14,14]], independent: [[18,20],[10,8],[12,12]],
      unit: 'pieces', actual: 'Available components', target: 'Assembly requirement',
      context: 'Check whether each component has enough stock for the planned mechanical assembly.' },
    'general-office': { labels: ['Notebooks','Pens','Folders'],
      guided: [[12,10],[8,10],[5,5]], independent: [[8,10],[14,10],[6,6]],
      unit: 'items', actual: 'Supplies available', target: 'Minimum stock',
      context: 'Identify office supplies that need replenishment before a planned order.' },
    'monthly-expenses': { labels: ['Rent','Electricity','Transport'],
      guided: [[50000,48000],[8000,9000],[12000,12000]], independent: [[45000,48000],[10000,9000],[11000,11000]],
      unit: 'JPY', actual: 'Funds reserved', target: 'Estimated expense',
      context: 'Check whether fictional funds reserved for each office expense cover its estimate.' },
  };
  function exercise(scenarioId, version, mode) {
    const scenario = scenarios.list().find(s => s.id === scenarioId && s.version === version);
    if (!scenario || !Object.hasOwn(data, scenarioId) || !['guided','independent'].includes(mode))
      throw Error('Choose an exact example and practice mode.');
    const example = data[scenarioId], values = {};
    example[mode].forEach(([actual,target], i) => {
      values['B' + (i + 2)] = String(actual);
      values['C' + (i + 2)] = String(target);
    });
    return { lesson: curriculum.resolveLesson({ id: 'if-minimum-target', version: 1 }),
      scenario, mode, values, labels: [...example.labels], unit: example.unit,
      actual: example.actual, target: example.target, context: example.context,
      dataset: { id: 'f4a-' + scenarioId + '-' + mode, version: 1 } };
  }
  global.CommonplaceExcelDecisionFoundations = Object.freeze({
    list: () => curriculum.listLessons(runtime), exercise,
    evaluate: (formula, cells) => curriculum.evaluateDecisionFormula(runtime, formula, cells),
    grade: (ex, formulas, cells) => curriculum.gradeDecision(rubric, ex, formulas, cells),
  });
})(window);
