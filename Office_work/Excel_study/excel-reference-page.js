/* Personal F2 practice. Session evidence only; no persistence or account writes. */
(function () {
  'use strict';
  const E = window.CommonplaceExcelReferenceFoundations;
  const S = window.CommonplaceExcelScenarios;
  const W = window.CommonplaceExcelTutorials;
  const $ = id => document.getElementById('f2-' + id);
  const records = [], passed = new Set();
  const inputControls = new Map(), formulaControls = new Map();
  const outputControls = new Map(), formulaPreviews = new Map();
  const historyLimit = 100;
  let exercise, quizChecks = 0;
  const node = (tag, text) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function options(select, items) {
    for (const item of items) {
      const option = node('option', item.title);
      option.value = item.id;
      select.append(option);
    }
  }
  function formulaValues() {
    return Object.fromEntries([...formulaControls].map(([address, input]) => [address, input.value]));
  }
  function cellValues() {
    return { ...exercise.cells,
      ...Object.fromEntries([...inputControls].map(([address, input]) => [address, input.value])),
      ...formulaValues() };
  }
  function say(text) { $('feedback').textContent = text; }
  function invalidate(message = 'Apply the formulas to calculate the current worksheet.') {
    for (const output of outputControls.values()) output.textContent = '—';
    for (const [address, preview] of formulaPreviews) preview.textContent = formulaControls.get(address)?.value || '';
    $('results').replaceChildren();
    say(message);
  }
  function resetWorksheet() {
    for (const [address, input] of inputControls) input.value = exercise.values[address];
    for (const input of formulaControls.values()) input.value = '';
    invalidate('Enter the source formula, then copy it to the destination cells.');
  }
  function renderWorksheet() {
    inputControls.clear(); formulaControls.clear(); outputControls.clear(); formulaPreviews.clear();
    const worksheet = exercise.lesson.worksheet;
    const outputs = [worksheet.sourceCell, ...worksheet.targetCells];
    const table = node('table');
    table.setAttribute('aria-label', 'Reference practice worksheet');
    table.append(node('caption', exercise.unit + ' · ' + exercise.scenario.title));
    const head = node('thead'), header = node('tr'), corner = node('th', 'Row');
    corner.scope = 'col'; header.append(corner);
    for (const column of exercise.grid.columns) {
      const th = node('th', column); th.scope = 'col'; header.append(th);
    }
    head.append(header); table.append(head);
    const body = node('tbody');
    for (let row = 1; row <= exercise.grid.rows; row++) {
      const tr = node('tr'), th = node('th', String(row)); th.scope = 'row'; tr.append(th);
      for (const column of exercise.grid.columns) {
        const address = column + row, td = node('td');
        td.dataset.cell = address;
        if (Object.hasOwn(exercise.values, address)) {
          const input = node('input');
          input.type = 'text'; input.inputMode = 'decimal'; input.maxLength = 40;
          input.autocomplete = 'off'; input.spellcheck = false;
          input.dataset.inputCell = address;
          input.setAttribute('aria-label', address + ', ' + (exercise.cellLabels?.[address] || 'input value'));
          input.addEventListener('input', () => invalidate());
          inputControls.set(address, input); td.append(input);
        } else if (outputs.includes(address)) {
          td.className = 'answer';
          const output = node('output', '—'), preview = node('code');
          output.dataset.resultCell = address; output.setAttribute('aria-label', address + ' result');
          preview.setAttribute('aria-label', address + ' entered formula');
          outputControls.set(address, output); formulaPreviews.set(address, preview);
          td.append(output, preview);
        } else {
          td.textContent = exercise.cells[address] || '';
          if (row === 1) td.className = 'column-label';
        }
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body); $('sheet').replaceChildren(table);
    $('formulas').replaceChildren();
    for (const address of outputs) {
      const source = address === worksheet.sourceCell;
      const card = node('div'); card.className = 'reference-formula' + (source ? ' source' : '');
      card.append(node('small', source ? 'Source cell' : 'Destination cell'));
      const id = source ? 'f2-source-formula' : 'f2-formula-' + address;
      const label = node('label', 'Formula ' + address); label.htmlFor = id;
      const input = node('input'); input.id = id; input.type = 'text'; input.maxLength = 80;
      input.spellcheck = false; input.autocomplete = 'off'; input.dataset.formulaCell = address;
      input.placeholder = source ? 'Enter your first formula' : 'Copy or enter a formula';
      input.addEventListener('input', () => invalidate());
      formulaControls.set(address, input); card.append(label, input); $('formulas').append(card);
    }
    $('copy').textContent = 'Copy ' + worksheet.sourceCell + ' to ' + worksheet.targetCells.join(', ');
  }
  const targetKey = ex => [ex.scenario.id, ex.scenario.version, ex.lesson.id,
    ex.lesson.version, ex.lesson.runtime.id, ex.lesson.runtime.version,
    ex.lesson.rubric.id, ex.lesson.rubric.version, ex.dataset.id, ex.dataset.version].join(':');
  function updateProgress() {
    const completed = E.list().filter(lesson => passed.has(targetKey(E.exercise(
      lesson.id, exercise.scenario.id, exercise.scenario.version, 'independent')))).length;
    $('progress').textContent = completed + ' / ' + E.list().length + ' independent reference skills passed for ' +
      exercise.scenario.title + ' · ' + records.length + ' submitted tasks · ' + quizChecks + ' quiz checks this session.';
    $('history').replaceChildren();
    for (const record of records.slice(-10).reverse()) {
      const li = node('li'), details = node('details');
      details.append(node('summary', record.scenario.title + ' · ' + record.lesson.title + ' · ' +
        record.mode + ' · ' + record.score + '/' + record.max_score));
      details.append(node('p', 'Submitted ' + new Date(record.submitted_at).toLocaleString()));
      details.append(node('pre', 'Submitted formulas\n' + Object.entries(record.formulas)
        .map(([address, formula]) => address + ': ' + (formula || '(blank)')).join('\n') +
        '\n\nInput values\n' + Object.entries(record.values)
          .map(([address, value]) => address + ': ' + (value === '' ? '(blank)' : value)).join('\n')));
      li.append(details); $('history').append(li);
    }
    $('submit').disabled = records.length >= historyLimit;
    if (records.length >= historyLimit)
      say('This session has 100 submitted tasks. They are kept in memory; the latest 10 are shown. You can still calculate and review. Reload only after you have finished reviewing.');
  }
  function start(mode) {
    const scenario = S.list().find(item => item.id === $('scenario').value);
    exercise = E.exercise($('lesson').value, scenario.id, scenario.version, mode);
    $('context').textContent = exercise.context || exercise.scenario.context;
    $('title').textContent = exercise.lesson.title;
    $('mode').textContent = mode === 'guided' ? 'Guided practice' : 'Independent self-assessment';
    $('concept').open = mode === 'guided';
    $('explain').textContent = exercise.lesson.concept;
    const worksheet = exercise.lesson.worksheet;
    $('example').textContent = 'Example: enter ' + worksheet.formula + ' in ' + worksheet.sourceCell +
      ', then copy it to ' + worksheet.targetCells.join(', ') + '.';
    $('task').textContent = exercise.instruction;
    $('note').textContent = exercise.note || 'All amounts are fictional practice data.';
    $('question').textContent = exercise.lesson.question;
    $('options').replaceChildren();
    exercise.lesson.choices.forEach((choice, index) => {
      const label = node('label'), input = node('input');
      input.type = 'radio'; input.name = 'f2-question'; input.value = String(index); input.required = true;
      label.append(input, node('span', choice)); $('options').append(label);
    });
    $('quiz-feedback').textContent = ''; $('download-status').textContent = '';
    renderWorksheet(); resetWorksheet(); updateProgress();
  }
  function calculate() {
    const formulas = formulaValues(), cells = cellValues(), issues = [];
    for (const [address, output] of outputControls) {
      try {
        const result = E.evaluate(formulas[address], cells);
        output.textContent = result.error || String(result.result);
        if (result.error) issues.push(address + ': ' + result.error);
      } catch (error) {
        output.textContent = '—'; issues.push(address + ': ' + error.message);
      }
      formulaPreviews.get(address).textContent = formulas[address];
    }
    say(issues.length ? issues.join(' · ') : 'Calculated all ' + outputControls.size + ' answer cells. Check the references, then submit the task.');
  }
  function copy() {
    const worksheet = exercise.lesson.worksheet;
    const formula = formulaControls.get(worksheet.sourceCell).value;
    try {
      // Prepare every destination before changing any cell, so a failed copy is atomic.
      const copies = worksheet.targetCells.map(address => [address, E.copy(formula, worksheet.sourceCell, address)]);
      for (const [address, value] of copies) formulaControls.get(address).value = value;
      invalidate('Copied ' + worksheet.sourceCell + ' to ' + worksheet.targetCells.join(', ') + '. Apply formulas to calculate the copied references.');
    } catch (error) { say('Copy could not be completed. ' + error.message); }
  }
  function submit() {
    if (records.length >= historyLimit) { updateProgress(); return; }
    calculate();
    try {
      const formulas = formulaValues(), cells = cellValues();
      const grade = E.grade(exercise, formulas, cells);
      const record = {
        schema_version: 1, scope: 'personal-session', attempt_id: crypto.randomUUID(),
        submitted_at: new Date().toISOString(), mode: exercise.mode,
        lesson: { id: exercise.lesson.id, version: exercise.lesson.version, title: exercise.lesson.title },
        scenario: { id: exercise.scenario.id, version: exercise.scenario.version, title: exercise.scenario.title },
        dataset: { ...exercise.dataset }, runtime: { ...exercise.lesson.runtime }, rubric: { ...exercise.lesson.rubric },
        formulas: { ...formulas }, values: Object.fromEntries([...inputControls].map(([address, input]) => [address, input.value])),
        grading: 'client-self-assessment', score: grade.score, max_score: grade.maxScore, passed: grade.passed,
        criteria: grade.criteria.map(criterion => ({ ...criterion })),
      };
      records.push(record);
      if (exercise.mode === 'independent' && grade.passed) passed.add(targetKey(exercise));
      const title = node('strong', 'Task score: ' + grade.score + ' / ' + grade.maxScore), list = node('ul');
      list.className = 'result-list';
      for (const criterion of grade.criteria) {
        const li = node('li', (criterion.passed ? 'Correct: ' : 'Review: ') + criterion.label);
        li.className = criterion.passed ? 'correct' : 'review'; li.dataset.criterion = criterion.id; list.append(li);
      }
      $('results').replaceChildren(title, list); updateProgress();
    } catch (error) { say('The task could not be recorded in this session. ' + error.message); }
  }
  function download(kind) {
    try {
      const file = W.createReferenceWorkbook(exercise.scenario.id, exercise.scenario.version, kind);
      const url = URL.createObjectURL(new Blob([file.bytes], { type: file.mime })), anchor = node('a');
      anchor.href = url; anchor.download = file.filename; document.body.append(anchor);
      try { anchor.click(); }
      finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
      $('download-status').textContent = 'Prepared ' + file.filename + '. Open it from your browser downloads.';
    } catch (error) { $('download-status').textContent = 'Workbook could not be prepared. ' + error.message; }
  }
  options($('scenario'), S.list()); options($('lesson'), E.list());
  $('scenario').value = 'jp-ph-trade'; $('lesson').value = 'relative-line-totals';
  $('scenario').addEventListener('change', () => start(exercise.mode));
  $('lesson').addEventListener('change', () => start(exercise.mode));
  $('guided').addEventListener('click', () => start('guided'));
  $('independent').addEventListener('click', () => start('independent'));
  $('copy').addEventListener('click', copy);
  $('form').addEventListener('submit', event => { event.preventDefault(); $('results').replaceChildren(); calculate(); });
  $('submit').addEventListener('click', submit);
  $('reset').addEventListener('click', resetWorksheet);
  $('quiz').addEventListener('change', () => { $('quiz-feedback').textContent = ''; });
  $('quiz').addEventListener('submit', event => {
    event.preventDefault();
    const selected = $('options').querySelector('input:checked');
    if (!selected) return;
    quizChecks++;
    $('quiz-feedback').textContent = (Number(selected.value) === exercise.lesson.answer ? 'Correct. ' : 'Review. ') + exercise.lesson.explanation;
    updateProgress();
  });
  $('download').addEventListener('click', () => download('practice'));
  $('solution').addEventListener('click', () => download('solution'));
  start('guided');
})();
