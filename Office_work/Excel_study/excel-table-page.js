/* Personal F3 practice. Existing records and packs remain on their current paths. */
(function () {
  'use strict';
  const E = window.CommonplaceExcelTableFoundations;
  const S = window.CommonplaceExcelScenarios;
  const W = window.CommonplaceExcelTutorials;
  const $ = id => document.getElementById('f3-' + id);
  const records = [], passed = new Set(), historyLimit = 100;
  let exercise, state, quizChecks = 0;
  const steps = {
    'number-formats': 'In Excel, select the column values, then use Home → Number Format. The formula bar still shows the underlying value. A currency format does not perform an exchange-rate calculation.',
    'create-table': 'In Excel, select A1:G7, choose Home → Format as Table and confirm My table has headers. Use Table Design to name the table and choose banded rows.',
    'sort-records': 'In Excel, select a cell in the Quantity column and use Data → Sort Smallest to Largest. Sort the complete table so each item keeps all its details.',
    'filter-records': 'In Excel, use the table header filters: Status = Ready and Quantity ≥ 5. Use Data → Reapply after changing values, or clear the filters to see every record again.',
    'validate-entry': 'In Excel, use Data → Data Validation. Quantity uses Whole number between 0 and 10000, and Status uses a List. Use a Stop error alert for direct typing and inspect existing data separately.'
  };
  const panels = { 'number-formats': 'format', 'create-table': 'table',
    'sort-records': 'sort', 'filter-records': 'filter', 'validate-entry': 'validation' };
  const node = (tag, text) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  function options(select, entries) {
    select.replaceChildren();
    for (const entry of entries) {
      const option = node('option', entry.title || entry.label);
      option.value = entry.id; select.append(option);
    }
  }
  const label = column => exercise.columns.find(item => item.id === column)?.label || column;
  function display(column, value) {
    return E.format(column, value, state.formats[column] || 'general');
  }
  function say(message) { $('feedback').textContent = message; }
  function formatExample() {
    const column = $('format-column').value, row = state.rows[0];
    $('format-example').textContent = row.id + ' · ' + label(column) +
      ': stored ' + (row[column] === null ? '(blank)' : row[column]) +
      ' → displayed ' + (display(column, row[column]) || '(blank)');
  }
  function renderWorksheet() {
    const visible = E.view(state), table = node('table');
    table.setAttribute('aria-label', 'Business table practice worksheet');
    if (state.table) table.classList.add('native-table');
    if (state.table?.banded) table.classList.add('banded');
    table.append(node('caption', exercise.scenario.title + ' · ' + exercise.currency));
    const head = node('thead'), letters = node('tr'), headers = node('tr');
    letters.className = 'table-letters'; headers.className = 'table-headers';
    for (const [index, text] of ['Row', 'A', 'B', 'C', 'D', 'E', 'F', 'G'].entries()) {
      const th = node('th', text); th.scope = 'col'; letters.append(th);
      const field = index ? exercise.columns[index - 1] : null;
      const title = node('th', field ? field.label : '1'); title.scope = 'col';
      headers.append(title);
    }
    head.append(letters, headers); table.append(head);
    const body = node('tbody');
    for (const row of visible) {
      const tr = node('tr'); tr.dataset.rowId = row.id;
      const rowNumber = node('th', String(state.order.indexOf(row.id) + 2)); rowNumber.scope = 'row'; tr.append(rowNumber);
      for (const column of exercise.columns) {
        const td = node('td', display(column.id, row[column.id]));
        td.dataset.column = column.id;
        td.dataset.rawValue = row[column.id] === null ? '' : String(row[column.id]);
        if (Object.hasOwn(state.formats, column.id)) td.className = 'numeric';
        td.title = 'Stored value: ' + (row[column.id] === null ? '(blank)' : row[column.id]);
        tr.append(td);
      }
      body.append(tr);
    }
    if (!visible.length) {
      const tr = node('tr'), td = node('td', 'No records match the applied filter. Clear the filters to see all records.');
      td.colSpan = 8; td.className = 'no-matches'; tr.append(td); body.append(tr);
    }
    table.append(body); $('sheet').replaceChildren(table);
    $('table-status').textContent = state.table
      ? 'Table: ' + state.table.name + ' · ' + state.table.range + ' · headers included · banded rows ' + (state.table.banded ? 'on' : 'off')
      : 'Plain range A1:G7 · Create a table to use the sort and filter controls.';
    $('visible-count').textContent = visible.length + ' of ' + state.rows.length + ' records visible' +
      (state.filterVisibleIds === null ? ' · no filter applied.' : ' · filtered records are retained.') +
      (state.sort ? ' Last sort: ' + label(state.sort.column) + ', ' + state.sort.direction + '.' : '');
    $('rule-status').textContent = 'Current rules: Quantity ' + (state.validation.quantity ? 'whole 0–10000' : 'any bounded number or blank') +
      '; Status ' + (state.validation.status ? 'Ready / Reserved / Shipped' : 'text') + '.';
    for (const id of ['sort', 'filter', 'reapply-filter', 'clear-filter']) $(id).disabled = !state.table;
    formatExample();
  }
  function editedCellValue() {
    const row = state.rows.find(item => item.id === $('edit-row').value);
    $('edit-value').value = row[$('edit-column').value] ?? '';
    $('edit-value').inputMode = $('edit-column').value === 'quantity' ? 'decimal' : 'text';
  }
  function initializeControls() {
    options($('format-column'), exercise.columns.filter(column => Object.hasOwn(state.formats, column.id)));
    options($('sort-column'), exercise.columns);
    options($('edit-row'), state.rows.map(row => ({ id: row.id, title: row.id + ' · ' + row.item })));
    $('format-column').value = 'quantity'; $('number-format').value = state.formats.quantity;
    $('table-name').value = state.table?.name || 'PracticeItems'; $('table-range').value = 'A1:G7';
    $('table-headers').checked = true; $('table-banded').checked = state.table?.banded ?? true;
    $('sort-column').value = 'quantity'; $('sort-direction').value = 'asc';
    $('filter-status').value = ''; $('filter-minimum').value = '';
    $('validation-quantity').checked = state.validation.quantity;
    $('validation-status').checked = state.validation.status;
    $('edit-column').value = 'quantity'; editedCellValue();
    for (const panel of ['format', 'table', 'sort', 'filter', 'validation', 'edit'])
      $(panel + '-panel').open = panel === panels[exercise.lesson.id] || (panel === 'edit' && exercise.lesson.id === 'validate-entry');
  }
  function changed(message) {
    $('results').replaceChildren(); $('validation-results').replaceChildren();
    renderWorksheet(); say(message);
  }
  function apply(action, message) {
    try { state = E.apply(state, action); changed(message); }
    catch (error) { say('Change not applied. ' + error.message); }
  }
  function resetWorksheet() {
    state = E.initial(exercise); initializeControls(); changed('Worksheet reset to this task’s starting data. Submitted results are retained for this session.');
  }
  const key = ex => [ex.scenario.id, ex.scenario.version, ex.lesson.id, ex.lesson.version,
    ex.lesson.runtime.id, ex.lesson.runtime.version, ex.lesson.rubric.id, ex.lesson.rubric.version,
    ex.dataset.id, ex.dataset.version].join(':');
  function updateProgress() {
    const count = E.list().filter(lesson => passed.has(key(E.exercise(lesson.id,
      exercise.scenario.id, exercise.scenario.version, 'independent')))).length;
    $('progress').textContent = count + ' / ' + E.list().length + ' independent table skills passed for ' +
      exercise.scenario.title + ' · ' + records.length + ' submitted tasks · ' + quizChecks + ' quiz checks this session.';
    $('history').replaceChildren();
    for (const record of records.slice(-10).reverse()) {
      const li = node('li'), details = node('details');
      details.append(node('summary', record.scenario.title + ' · ' + record.lesson.title + ' · ' + record.mode + ' · ' + record.score + '/' + record.max_score));
      details.append(node('p', 'Submitted ' + new Date(record.submitted_at).toLocaleString()));
      details.append(node('pre', JSON.stringify({ dataset: record.dataset, worksheet: record.worksheet,
        criteria: record.criteria }, null, 2)));
      li.append(details); $('history').append(li);
    }
    $('submit').disabled = records.length >= historyLimit;
    if (records.length >= historyLimit) say('This session has 100 submitted tasks. All are kept in memory; the latest 10 are shown. You can still practise and review. Reload only after reviewing your results.');
  }
  function start(mode) {
    const scenario = S.list().find(item => item.id === $('scenario').value);
    exercise = E.exercise($('lesson').value, scenario.id, scenario.version, mode);
    $('workbook-context').textContent = exercise.scenario.title;
    $('context').textContent = exercise.context; $('title').textContent = exercise.lesson.title;
    $('mode').textContent = mode === 'guided' ? 'Guided practice' : 'Independent self-assessment';
    $('concept').open = mode === 'guided'; $('explain').textContent = exercise.lesson.concept;
    $('excel-steps').textContent = steps[exercise.lesson.id];
    $('task').textContent = exercise.instruction; $('note').textContent = exercise.note;
    $('question').textContent = exercise.lesson.question; $('options').replaceChildren();
    exercise.lesson.choices.forEach((choice, index) => {
      const label = node('label'), input = node('input');
      input.type = 'radio'; input.name = 'f3-question'; input.value = String(index); input.required = true;
      label.append(input, node('span', choice)); $('options').append(label);
    });
    $('quiz-feedback').textContent = ''; $('download-status').textContent = '';
    resetWorksheet(); say('Read the task, use the worksheet tools, then submit when you are ready.'); updateProgress();
  }
  function submit() {
    if (records.length >= historyLimit) { updateProgress(); return; }
    try {
      const grade = E.grade(exercise, state);
      records.push({ schema_version: 1, scope: 'personal-session', attempt_id: crypto.randomUUID(),
        submitted_at: new Date().toISOString(), mode: exercise.mode,
        lesson: { id: exercise.lesson.id, version: exercise.lesson.version, title: exercise.lesson.title },
        scenario: { id: exercise.scenario.id, version: exercise.scenario.version, title: exercise.scenario.title },
        dataset: clone(exercise.dataset), runtime: clone(exercise.lesson.runtime), rubric: clone(exercise.lesson.rubric),
        currency: exercise.currency, worksheet: clone(state), grading: 'client-self-assessment',
        score: grade.score, max_score: grade.maxScore, passed: grade.passed, criteria: clone(grade.criteria) });
      if (exercise.mode === 'independent' && grade.passed) passed.add(key(exercise));
      const list = node('ul'); list.className = 'result-list';
      for (const criterion of grade.criteria) {
        const li = node('li', (criterion.passed ? 'Correct: ' : 'Review: ') + criterion.label);
        li.dataset.criterion = criterion.id; li.className = criterion.passed ? 'correct' : 'review'; list.append(li);
      }
      $('results').replaceChildren(node('strong', 'Task score: ' + grade.score + ' / ' + grade.maxScore), list);
      say('Task submitted for this page session. Review the criteria below.'); updateProgress();
    } catch (error) { say('The task could not be recorded. ' + error.message); }
  }
  function download(kind) {
    try {
      const file = W.createTableWorkbook(exercise.scenario.id, exercise.scenario.version, kind);
      const url = URL.createObjectURL(new Blob([file.bytes], { type: file.mime })), anchor = node('a');
      anchor.href = url; anchor.download = file.filename; document.body.append(anchor);
      try { anchor.click(); } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
      $('download-status').textContent = 'Prepared ' + file.filename + '. Open it from your browser downloads.';
    } catch (error) { $('download-status').textContent = 'Workbook could not be prepared. ' + error.message; }
  }
  function onForm(id, callback) {
    $(id).addEventListener('submit', event => { event.preventDefault(); callback(); });
  }
  options($('scenario'), S.list()); options($('lesson'), E.list());
  $('scenario').value = 'jp-ph-trade'; $('lesson').value = 'number-formats';
  $('scenario').addEventListener('change', () => start(exercise.mode));
  $('lesson').addEventListener('change', () => start(exercise.mode));
  $('guided').addEventListener('click', () => start('guided'));
  $('independent').addEventListener('click', () => start('independent'));
  $('reset').addEventListener('click', resetWorksheet); $('submit').addEventListener('click', submit);
  $('format-column').addEventListener('change', () => { $('number-format').value = state.formats[$('format-column').value]; formatExample(); });
  onForm('format-form', () => apply({ type: 'set-format', column: $('format-column').value, format: $('number-format').value }, 'Display format applied. Every stored value is unchanged.'));
  onForm('table-form', () => apply({ type: 'create-table', name: $('table-name').value, range: $('table-range').value,
    headers: $('table-headers').checked, banded: $('table-banded').checked }, 'Table settings applied to all six complete records.'));
  onForm('sort-form', () => apply({ type: 'sort', column: $('sort-column').value, direction: $('sort-direction').value }, 'Sorted complete records. Each item keeps its values and identity.'));
  onForm('filter-form', () => {
    const raw = $('filter-minimum').value;
    let minimumQuantity = null;
    try { if (raw.trim() !== '') minimumQuantity = window.CommonplaceExcelFormulaSyntax.numericCell(raw); }
    catch (error) { say('Filter not applied. Enter a valid numeric minimum or leave it blank.'); return; }
    apply({ type: 'filter', status: $('filter-status').value || null, minimumQuantity }, 'Filter applied. Hidden records are retained; clear filters to show them again.');
  });
  $('reapply-filter').addEventListener('click', () => apply({ type: 'filter', ...state.filters }, 'Reapplied the current filter to the latest worksheet values.'));
  $('clear-filter').addEventListener('click', () => {
    apply({ type: 'clear-filter' }, 'Filters cleared. Every record is visible in its current order.');
    $('filter-status').value = ''; $('filter-minimum').value = '';
  });
  onForm('validation-form', () => {
    try {
      let next = E.apply(state, { type: 'set-validation', column: 'quantity', enabled: $('validation-quantity').checked });
      next = E.apply(next, { type: 'set-validation', column: 'status', enabled: $('validation-status').checked });
      state = next; changed('Entry rules applied. Existing values are retained. Use Check existing values to review them.');
    } catch (error) { say('Rules not applied. ' + error.message); }
  });
  $('check-values').addEventListener('click', () => {
    const issues = E.inspect(state), list = node('ul');
    for (const issue of issues) list.append(node('li', issue.rowId + ' · ' + label(issue.column) + ': ' + issue.message));
    $('validation-results').replaceChildren(node('p', issues.length
      ? issues.length + ' existing value(s) need correction. The worksheet values are retained.'
      : (state.validation.quantity || state.validation.status ? 'All existing values meet the enabled rules.' : 'No entry rules are enabled. Apply a rule before checking values.')), list);
  });
  $('edit-row').addEventListener('change', editedCellValue); $('edit-column').addEventListener('change', editedCellValue);
  onForm('edit-form', () => apply({ type: 'edit-cell', rowId: $('edit-row').value,
    column: $('edit-column').value, value: $('edit-value').value }, 'Cell value applied to the selected item. Reapply a filter or sort after editing its criteria.'));
  $('quiz').addEventListener('change', () => { $('quiz-feedback').textContent = ''; });
  onForm('quiz', () => {
    const selected = $('options').querySelector('input:checked'); if (!selected) return;
    quizChecks++; $('quiz-feedback').textContent = (Number(selected.value) === exercise.lesson.answer ? 'Correct. ' : 'Review. ') + exercise.lesson.explanation;
    updateProgress();
  });
  $('download').addEventListener('click', () => download('practice')); $('solution').addEventListener('click', () => download('solution'));
  start('guided');
})();
