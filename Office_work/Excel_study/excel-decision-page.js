/* F4A session-only worksheet UI. No storage, network or account operations. */
(function () {
  'use strict';
  const A = window.CommonplaceExcelDecisionFoundations;
  const scenarios = window.CommonplaceExcelScenarios.list();
  const $ = id => document.getElementById('f4a-' + id);
  const rows = [2,3,4], inputs = rows.flatMap(row => ['B'+row,'C'+row]);
  const outputs = rows.map(row => 'D'+row);
  const lesson = A.list()[0], attempts = [], passedExamples = new Set();
  let mode = 'guided', exercise;
  const make = (tag, text) => { const node = document.createElement(tag); node.textContent = text; return node; };
  for (const scenario of scenarios) {
    const option = make('option', scenario.title); option.value = scenario.id;
    $('scenario').append(option);
  }
  $('scenario').value = 'jp-ph-trade';
  $('question').textContent = lesson.question;
  lesson.choices.forEach((choice,i) => {
    const label = document.createElement('label'), radio = document.createElement('input');
    radio.type = 'radio'; radio.name = 'f4a-quiz'; radio.value = String(i);
    label.append(radio, document.createTextNode(choice)); $('choices').append(label);
  });
  function reset() {
    const scenario = scenarios.find(s => s.id === $('scenario').value);
    exercise = A.exercise(scenario.id, scenario.version, mode);
    $('guided').setAttribute('aria-pressed', String(mode === 'guided'));
    $('independent').setAttribute('aria-pressed', String(mode === 'independent'));
    $('guided').classList.toggle('secondary', mode !== 'guided');
    $('independent').classList.toggle('secondary', mode !== 'independent');
    $('hint').hidden = mode !== 'guided';
    $('context').textContent = exercise.scenario.title + ' · ' + exercise.unit + ' · ' + exercise.context;
    $('task').textContent = lesson.task + (mode === 'independent' ? ' Keep all starting inputs unchanged.' : ' Change a value to explore the result.');
    $('actual').textContent = 'B · ' + exercise.actual + ' (' + exercise.unit + ')';
    $('target').textContent = 'C · ' + exercise.target + ' (' + exercise.unit + ')';
    rows.forEach((row,i) => {
      $('item-'+row).textContent = exercise.labels[i];
      $('D'+row).value = ''; $('result-'+row).textContent = '—';
    });
    inputs.forEach(cell => { $(cell).value = exercise.values[cell]; });
    $('criteria').replaceChildren();
    $('feedback').textContent = '';
    $('quiz-feedback').textContent = '';
    $('choices').querySelectorAll('input').forEach(input => { input.checked = false; });
  }
  function collect(cells) { return Object.fromEntries(cells.map(cell => [cell,$(cell).value])); }
  function showResults(grade) {
    rows.forEach(row => {
      const value = grade.evaluated['D'+row];
      $('result-'+row).textContent = value.error === null ? value.result : 'Check formula/input';
    });
  }
  function showHistory() {
    $('progress').textContent = 'Independent examples passed: ' + passedExamples.size + ' / ' + scenarios.length;
    $('history').replaceChildren();
    for (const attempt of attempts.slice(-10).reverse()) {
      const li = document.createElement('li'), detail = document.createElement('details');
      detail.append(make('summary', attempt.scenarioTitle + ' · ' + attempt.mode + ' · ' + attempt.grade.score + '/' + attempt.grade.maxScore));
      detail.append(make('p', new Date(attempt.submittedAt).toLocaleString() + ' · ' + attempt.lesson.id + '@' + attempt.lesson.version));
      const ul = document.createElement('ul');
      for (const c of attempt.grade.criteria) ul.append(make('li', (c.passed ? 'Passed: ' : 'Review: ') + c.label));
      detail.append(ul);
      for (const cell of [...inputs,...outputs]) {
        detail.append(make('p', cell + ': ' + (attempt.formulas[cell] ?? attempt.cells[cell])));
      }
      li.append(detail); $('history').append(li);
    }
  }
  function check(submit) {
    const cells = collect(inputs), formulas = collect(outputs);
    const grade = A.grade(exercise, formulas, cells);
    showResults(grade); $('criteria').replaceChildren();
    if (!submit) {
      const failures = Object.values(grade.evaluated).filter(x => x.error !== null);
      $('feedback').textContent = failures.length ? failures[0].error : 'Preview complete. Change inputs or formulas, then preview again.';
      return;
    }
    if (attempts.length >= 100) {
      $('feedback').textContent = 'Session history is full. Previous submissions are retained. Preview remains available.';
      return;
    }
    // Retain the exact immutable references and submitted evidence; do not
    // recompute older outcomes as the current worksheet changes.
    const attempt = {
      id: globalThis.crypto?.randomUUID?.() ?? 'session-' + (attempts.length + 1),
      submittedAt: new Date().toISOString(), lesson: {id:lesson.id,version:lesson.version},
      runtime: lesson.runtime, rubric: lesson.rubric,
      scenario: {id:exercise.scenario.id,version:exercise.scenario.version},
      scenarioTitle: exercise.scenario.title, dataset: exercise.dataset, mode,
      cells, formulas, grade,
    };
    attempts.push(JSON.parse(JSON.stringify(attempt)));
    if (mode === 'independent' && grade.passed) passedExamples.add(exercise.dataset.id);
    $('feedback').textContent = 'Task score: ' + grade.score + ' / ' + grade.maxScore;
    for (const c of grade.criteria) {
      const item = make('li', (c.passed ? 'Passed: ' : 'Review: ') + c.label);
      item.className = c.passed ? 'correct' : 'review'; $('criteria').append(item);
    }
    showHistory();
  }
  $('scenario').addEventListener('change', reset);
  for (const name of ['guided','independent']) $(''+name).addEventListener('click', () => {
    if (mode !== name) { mode = name; reset(); }
  });
  $('preview').addEventListener('click', () => check(false));
  $('submit').addEventListener('click', () => check(true));
  $('reset').addEventListener('click', reset);
  $('check-quiz').addEventListener('click', () => {
    const answer = $('choices').querySelector('input:checked');
    $('quiz-feedback').textContent = answer ? (Number(answer.value) === lesson.answer ? 'Correct. ' : 'Review. ') + lesson.explanation : 'Choose an answer first.';
  });
  reset();
})();
