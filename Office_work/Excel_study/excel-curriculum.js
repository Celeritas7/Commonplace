/* Reviewed Excel curriculum and deterministic self-assessment.
   No DOM, storage, accounts, network, scenario lookup or executable lesson data.
   Keep released definitions/engines addressable when adding a new version. */
(function (global) {
  'use strict';
  const syntax = global.CommonplaceExcelFormulaSyntax;
  if (!syntax) throw Error('Load Excel formula syntax before the curriculum.');
  const clone = value => JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  function exact(records, ref, kind) {
    if (!ref || Object.getPrototypeOf(ref) !== Object.prototype ||
        Object.keys(ref).sort().join() !== 'id,version' ||
        typeof ref.id !== 'string' || !Number.isSafeInteger(ref.version))
      throw Error('An exact ' + kind + ' ID and version are required.');
    const found = records.find(item => item.id === ref.id && item.version === ref.version);
    if (!found) throw Error('Unsupported ' + kind + ' version.');
    return found;
  }
  const worksheet = fn => ({
    inputCells: ['B2', 'B3', 'B4'], outputCell: 'B5', range: 'B2:B4',
    formula: '=' + fn + '(B2:B4)',
  });
  const formulaFunctions = ['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX'];
  const capabilities = freeze([
    { id: 'explanation.text.v1', version: 1, kind: 'explanation' },
    ...formulaFunctions.map(fn => ({
      id: 'excel.' + fn.toLowerCase() + '.b2-b4.v1', version: 1, kind: 'formula',
      fn, engine: 'bounded-aggregate.v1', worksheet: worksheet(fn),
      // Only this wire activity is accepted by today's central material schema.
      ...(fn === 'SUM' ? { activity_type: 'sum-column' } : {}),
    })),
  ]);
  const runtimes = freeze([
    { id: 'personal-formulas', version: 1, engine: 'bounded-aggregate.v1',
      input_policy: 'numbers-or-blanks',
      // Pin this release; registering a future capability must not widen v1.
      capabilities: ['explanation.text.v1', 'excel.sum.b2-b4.v1',
        'excel.average.b2-b4.v1', 'excel.count.b2-b4.v1',
        'excel.min.b2-b4.v1', 'excel.max.b2-b4.v1'],
      lessons: [{ id: 'sum', version: 1 }, { id: 'average', version: 1 },
        { id: 'count', version: 1 }, { id: 'min', version: 1 }, { id: 'max', version: 1 }],
      shape_error: 'Three input cells are required.',
      formula_error: 'Use SUM, AVERAGE, COUNT, MIN or MAX on B2:B4. Keep each function name and cell reference together.' },
    { id: 'assigned-sum', version: 1, engine: 'bounded-aggregate.v1',
      input_policy: 'required-numbers',
      capabilities: ['explanation.text.v1', 'excel.sum.b2-b4.v1'],
      lessons: [{ id: 'sum', version: 1 }],
      shape_error: 'Enter a valid number in all three quantity cells.',
      formula_error: 'Enter a SUM formula for B2:B4. Keep SUM and each cell reference together.' },
  ]);
  const rubrics = freeze([
    { id: 'formula-foundations', version: 1, engine: 'formula-foundations.v1',
      runtime: { id: 'personal-formulas', version: 1 },
      criteria: ['requested-formula', 'valid-calculation'],
      independent_criteria: ['original-inputs'] },
    { id: 'worksheet-criteria', version: 1, engine: 'worksheet-criteria.v1',
      response_limit: 512 },
    { id: 'assigned-practice', version: 1, engine: 'assigned-practice.v1',
      runtime: { id: 'assigned-sum', version: 1 },
      activities: ['guided-sum-v1', 'independent-match-v1',
        'independent-format-v1', 'independent-copy-v1'] },
  ]);
  const lessonContent = [
    {id:"sum",fn:"SUM",title:"SUM — Add values",concept:"SUM adds numeric cells in a range. Empty cells are ignored; a zero is a number. Use SUM instead of typing a fixed total so Excel can recalculate when inputs change.",task:"Calculate the total",question:"Which formula adds all three numeric cells?",choices:["=SUM(B2:B4)","=COUNT(B2:B4)","=SUM(A2:A4)"],answer:0,explanation:"SUM(B2:B4) adds the numbers in column B from rows 2 through 4."},
    {id:"average",fn:"AVERAGE",title:"AVERAGE — Find the mean",concept:"AVERAGE adds the numeric cells and divides by the number of numeric cells. Blank cells do not contribute to the count, but zero does. A decimal answer is valid even for item counts.",task:"Find the average of the recorded values",question:"B2 contains 12, B3 is blank and B4 contains 6. What does AVERAGE(B2:B4) return?",choices:["6","9","18"],answer:1,explanation:"The sum is 18 and there are two numeric cells, so 18 ÷ 2 = 9."},
    {id:"count",fn:"COUNT",title:"COUNT — Count numeric cells",concept:"COUNT counts cells containing numbers, not the total quantity of items. A numeric zero counts as one cell. Blank cells and text in a referenced range are ignored.",task:"Count the entries with recorded numbers",question:"B2 contains 0, B3 is blank and B4 contains 5. What does COUNT(B2:B4) return?",choices:["5","1","2"],answer:2,explanation:"Zero and five are both numbers; only the blank is excluded."},
    {id:"min",fn:"MIN",title:"MIN — Find the smallest value",concept:"MIN returns the smallest numeric value in a range. It ignores blank cells. It does not tell you the corresponding product name; that requires a lookup or another method.",task:"Find the smallest recorded value",question:"Which formula finds the smallest numeric value in B2:B4?",choices:["=MIN(B2:B4)","=MAX(B2:B4)","=AVERAGE(B2:B4)"],answer:0,explanation:"MIN returns the smallest of the numeric entries."},
    {id:"max",fn:"MAX",title:"MAX — Find the largest value",concept:"MAX returns the largest numeric value in a range. It ignores blanks, and it works with negative numbers too. Use it to identify the highest quantity or cost.",task:"Find the largest recorded value",question:"The three recorded values are -7, -2 and -5. Which is MAX?",choices:["-7","-2","0"],answer:1,explanation:"-2 is the greatest number, even though all entries are negative."}
  ];
  const lessons = freeze(lessonContent.map(item => ({
    ...item, version: 1,
    capability_id: 'excel.' + item.id + '.b2-b4.v1',
    runtime: { id: 'personal-formulas', version: 1 },
    rubric: { id: 'formula-foundations', version: 1 },
    worksheet: worksheet(item.fn),
  })));
  function resolveCapability(id) {
    const found = capabilities.find(item => item.id === id);
    if (!found) throw Error('Unsupported Excel capability.');
    return found;
  }
  const resolveLesson = ref => exact(lessons, ref, 'lesson');
  const resolveRuntime = ref => exact(runtimes, ref, 'runtime');
  const resolveRubric = ref => exact(rubrics, ref, 'rubric');
  function numeric(values, policy, shapeError = 'Three input cells are required.') {
    if (!Array.isArray(values) || values.length !== 3 ||
        Object.keys(values).length !== 3 ||
        ![0, 1, 2].every(i => Object.hasOwn(values, i)))
      throw Error(shapeError);
    if (!['required-numbers', 'numbers-or-blanks'].includes(policy))
      throw Error('Unsupported numeric input policy.');
    return values.flatMap(value => {
      const number = syntax.numericCell(value, { allowBlank: policy === 'numbers-or-blanks' });
      return number === null ? [] : [number];
    });
  }
  // Reviewed evaluator implementations; imported content never supplies functions.
  const aggregates = Object.freeze({
    SUM: values => values.reduce((sum, value) => sum + value, 0),
    AVERAGE: values => values.reduce((sum, value) => sum + value, 0) / values.length,
    COUNT: values => values.length,
    MIN: values => values.length ? Math.min(...values) : 0,
    MAX: values => values.length ? Math.max(...values) : 0,
  });
  function evaluateFormula(runtimeRef, formula, values) {
    const runtime = resolveRuntime(runtimeRef);
    if (runtime.engine !== 'bounded-aggregate.v1') throw Error('Unsupported formula engine.');
    const parsed = syntax.parse(formula);
    const capability = parsed && runtime.capabilities.map(resolveCapability)
      .find(item => item.kind === 'formula' && item.fn === parsed.fn &&
        item.worksheet.range === parsed.range && item.engine === runtime.engine);
    if (!capability) throw Error(runtime.formula_error);
    const numbers = numeric(values, runtime.input_policy, runtime.shape_error), fn = capability.fn;
    if (fn === 'AVERAGE' && !numbers.length) return { fn, result: null, error: '#DIV/0!' };
    return { fn, result: Number(aggregates[fn](numbers).toPrecision(15)), error: null };
  }
  function formulaMatches(actual, expected) {
    const a = syntax.parse(actual), b = syntax.parse(expected);
    return !!a && !!b && a.canonical === b.canonical;
  }
  function numberMatches(actual, expected) {
    try { return syntax.numericCell(actual) === Number(expected); }
    catch { return false; }
  }
  function sameInputs(actual, expected, policy) {
    try { numeric(actual, policy); numeric(expected, policy); }
    catch { return false; }
    return actual.every((value, index) => value.trim() === ''
      ? expected[index].trim() === ''
      : expected[index].trim() !== '' && numberMatches(value, expected[index]));
  }
  function bounded(value, limit) {
    if (typeof value === 'boolean' || value === null) return value;
    return typeof value === 'string' ? value.slice(0, limit) : null;
  }
  function checkWorksheetCriterion(criterion, state, limit, depth = 0) {
    if (!criterion || typeof criterion !== 'object' || depth > 8)
      throw Error('Unsupported worksheet criterion.');
    if (criterion.all) {
      if (!Array.isArray(criterion.all) || !criterion.all.length || criterion.all.length > 32)
        throw Error('Unsupported grouped criterion.');
      const children = criterion.all.map(child => checkWorksheetCriterion(child, state, limit, depth + 1));
      return { passed: children.every(child => child.passed), response: children.map(child => child.response) };
    }
    const actual = bounded(criterion.cell
      ? state.cells?.[criterion.cell]?.[criterion.property] : state[criterion.property], limit);
    let passed;
    if (criterion.property === 'formula') passed = formulaMatches(actual, criterion.expected);
    else if (typeof criterion.expected === 'boolean') passed = actual === criterion.expected;
    else if (typeof criterion.expected === 'string' && /^-?\d+(?:\.\d+)?$/.test(criterion.expected))
      passed = numberMatches(actual, criterion.expected);
    else passed = actual === criterion.expected;
    return { passed, response: { cell: criterion.cell ?? null, property: criterion.property, value: actual } };
  }
  function checkCriterion(rubricRef, criterion, state) {
    const rubric = resolveRubric(rubricRef);
    if (rubric.engine !== 'worksheet-criteria.v1') throw Error('A worksheet criterion rubric is required.');
    return checkWorksheetCriterion(criterion, state, rubric.response_limit);
  }
  function result(criteria) {
    const score = criteria.filter(item => item.passed).length;
    return { score, maxScore: criteria.length, passed: score === criteria.length, criteria };
  }
  function gradeFormula(rubricRef, exercise, formula, values) {
    const rubric = resolveRubric(rubricRef);
    if (rubric.engine !== 'formula-foundations.v1') throw Error('A formula lesson rubric is required.');
    const lesson = resolveLesson({ id: exercise?.lesson?.id, version: exercise?.lesson?.version });
    if (lesson.rubric.id !== rubric.id || lesson.rubric.version !== rubric.version ||
        !['guided', 'independent'].includes(exercise.mode))
      throw Error('Formula lesson and rubric do not match.');
    const runtime = resolveRuntime(rubric.runtime);
    if (!runtime.lessons.some(ref => ref.id === lesson.id && ref.version === lesson.version) ||
        !runtime.capabilities.includes(lesson.capability_id))
      throw Error('Formula lesson is not supported by this runtime version.');
    let evaluated = null;
    try { evaluated = evaluateFormula(rubric.runtime, formula, values); } catch {}
    const criteria = [
      { label: 'Correct function and B2:B4 range', passed: formulaMatches(formula, lesson.worksheet.formula) },
      { label: 'Valid calculation for the entered formula', passed: !!evaluated && !evaluated.error },
    ];
    if (exercise.mode === 'independent')
      criteria.push({ label: 'Original exercise inputs preserved', passed: sameInputs(values, exercise.values, runtime.input_policy) });
    return { ...result(criteria), evaluated };
  }
  function assignedBaseline(rows) {
    if (!Array.isArray(rows) || rows.length !== 3 ||
        Object.keys(rows).length !== 3 || ![0, 1, 2].every(i => Object.hasOwn(rows, i)) ||
        rows.some(row => !Array.isArray(row) || typeof row[1] !== 'number' ||
          !Number.isFinite(row[1]) || Math.abs(row[1]) > 1e12))
      throw Error('Unsupported assigned SUM dataset.');
    return rows.map(row => String(row[1]));
  }
  function toolEvidence(state) {
    const keys = ['bold', 'fill', 'border', 'copy_used'];
    if (!state || Object.getPrototypeOf(state) !== Object.prototype ||
        Object.keys(state).length !== keys.length ||
        !keys.every(key => Object.hasOwn(state, key) && typeof state[key] === 'boolean'))
      throw Error('Invalid saved worksheet tools.');
    return state;
  }
  function gradeAssigned(rubricRef, activity, rows, values, formula, toolState) {
    const rubric = resolveRubric(rubricRef);
    if (rubric.engine !== 'assigned-practice.v1' || !rubric.activities.includes(activity))
      throw Error('Unsupported assigned practice rubric or activity.');
    const runtime = resolveRuntime(rubric.runtime);
    const sum = runtime.capabilities.map(resolveCapability).find(item => item.kind === 'formula');
    const original = assignedBaseline(rows), target = [...original];
    const inputs = Array.isArray(values) && values.length === 3 &&
      Object.keys(values).length === 3 && [0, 1, 2].every(i => Object.hasOwn(values, i)) ? values : [];
    if (activity === 'independent-match-v1' || activity === 'independent-copy-v1')
      target[1] = original[0];
    const labels = ['B2 retains the original value',
      activity === 'guided-sum-v1' ? 'B3 retains the original value' : 'B3 matches the original B2',
      'B4 retains the original value', 'SUM formula uses B2:B4'];
    const passed = target.map((expected, index) => numberMatches(inputs[index], expected));
    passed.push(formulaMatches(formula, sum.worksheet.formula));
    if (activity === 'independent-format-v1') {
      const tools = toolEvidence(toolState);
      labels.splice(0, labels.length, 'A1 is bold', 'A1 has yellow fill', 'A1 has borders', 'All original numeric values preserved');
      passed.splice(0, passed.length, tools.bold, tools.fill, tools.border,
        original.every((expected, index) => numberMatches(inputs[index], expected)));
    } else if (activity === 'independent-copy-v1') {
      labels.push('Used Ribbon Copy B2 and Paste B3');
      passed.push(toolEvidence(toolState).copy_used);
    }
    return result(labels.map((label, index) => ({ label, passed: passed[index] })));
  }
  global.CommonplaceExcelCurriculum = Object.freeze({
    listLessons: runtimeRef => clone(runtimeRef === undefined
      ? lessons : resolveRuntime(runtimeRef).lessons.map(resolveLesson)),
    resolveLesson, resolveCapability, resolveRuntime, resolveRubric,
    evaluateFormula, gradeFormula, checkCriterion, gradeAssigned,
  });
})(typeof window === 'undefined' ? globalThis : window);
