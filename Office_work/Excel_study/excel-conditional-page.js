/* F4B session-only numeric conditional formatting. No storage or network. */
(function () {
  'use strict';
  const A=window.CommonplaceExcelConditionalFoundations;
  const scenarios=window.CommonplaceExcelScenarios.list();
  const lesson=A.list()[0], attempts=[], passedExamples=new Set();
  const $=id=>document.getElementById('f4b-'+id);
  const rows=[2,3,4], addresses=rows.map(row=>'B'+row);
  const fields=['range','operator','threshold','style'];
  const operators={lt:'less than',lte:'less than or equal to',gt:'greater than',gte:'greater than or equal to',eq:'equal to'};
  const styles={red:'light red',green:'light green',amber:'yellow'};
  let mode='guided',exercise,active=null;
  const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  const collect=keys=>Object.fromEntries(keys.map(key=>[key,$(key).value]));
  for(const s of scenarios){const option=make('option',s.title);option.value=s.id;$('scenario').append(option);}
  $('scenario').value='jp-ph-trade';
  $('question').textContent=lesson.question;
  lesson.choices.forEach((choice,i)=>{
    const label=document.createElement('label'),radio=document.createElement('input');
    radio.type='radio';radio.name='f4b-quiz';radio.value=String(i);
    label.append(radio,document.createTextNode(choice));$('choices').append(label);
  });
  function describe(rule){
    return rule ? rule.range+' · '+operators[rule.operator]+' '+rule.threshold+' '+exercise.unit+' · '+styles[rule.style] : 'No rule applied.';
  }
  function render(){
    const view=A.view(active,collect(addresses));
    for(const row of rows){
      const address='B'+row, invalid=view.invalid.includes(address), match=view.highlighted.includes(address);
      const cell=$('cell-'+row);
      for(const style of Object.keys(styles)) cell.classList.toggle('highlight-'+style,match&&view.style===style);
      cell.classList.toggle('invalid-value',invalid);
      $(address).setAttribute('aria-invalid',String(invalid));
      $('state-'+row).textContent=invalid?'Invalid value':match?'Highlighted':active?'Not highlighted':'No rule';
    }
    $('active').textContent=active?'Applied: '+describe(active):describe(null);
    const draft=collect(fields);
    let normalized=null;
    try{normalized=A.apply(draft);}catch{}
    const dirty=active ? JSON.stringify(normalized)!==JSON.stringify(active) : Object.values(draft).some(Boolean);
    $('draft-status').textContent=dirty?'Unapplied rule changes. Apply to update the worksheet.':'No unapplied rule changes.';
    $('input-status').textContent=view.invalid.length?'Check numeric values in '+view.invalid.join(', ')+'.':'All worksheet values are numeric.';
    return view;
  }
  function reset(){
    const s=scenarios.find(s=>s.id===$('scenario').value);
    exercise=A.exercise(s.id,s.version,mode);active=null;
    for(const name of ['guided','independent']){
      $(name).setAttribute('aria-pressed',String(mode===name));
      $(name).classList.toggle('secondary',mode!==name);
    }
    $('hint').hidden=mode!=='guided';
    $('context').textContent=exercise.scenario.title+' · '+exercise.unit+' · '+exercise.context;
    $('task').textContent=lesson.task+' Target: '+exercise.threshold+' '+exercise.unit+'.'+(mode==='independent'?' Keep the starting values unchanged.':'');
    $('heading').textContent='B · '+exercise.heading+' ('+exercise.unit+')';
    rows.forEach((row,i)=>{$('item-'+row).textContent=exercise.labels[i];$('B'+row).value=exercise.values['B'+row];});
    fields.forEach(field=>{$(field).value='';});
    $('feedback').textContent='';$('criteria').replaceChildren();$('quiz-feedback').textContent='';
    $('choices').querySelectorAll('input').forEach(input=>{input.checked=false;});
    render();
  }
  function changed(){ $('criteria').replaceChildren();$('feedback').textContent='';render(); }
  function showHistory(){
    $('progress').textContent='Independent examples passed: '+passedExamples.size+' / '+scenarios.length;
    $('history').replaceChildren();
    for(const a of attempts.slice(-10).reverse()){
      const li=document.createElement('li'),detail=document.createElement('details');
      detail.append(make('summary',a.scenarioTitle+' · '+a.mode+' · '+a.grade.score+'/'+a.grade.maxScore));
      detail.append(make('p',new Date(a.submittedAt).toLocaleString()+' · '+a.lesson.id+'@'+a.lesson.version));
      detail.append(make('p','Applied rule: '+(a.rule? a.rule.range+' · '+operators[a.rule.operator]+' '+a.rule.threshold+' '+a.unit+' · '+styles[a.rule.style]:'none')));
      detail.append(make('p','Highlighted: '+(a.grade.view.highlighted.join(', ')||'none')));
      const ul=document.createElement('ul');
      for(const c of a.grade.criteria) ul.append(make('li',(c.passed?'Passed: ':'Review: ')+c.label));
      detail.append(ul);
      for(const address of addresses)detail.append(make('p',address+': '+a.cells[address]));
      li.append(detail);$('history').append(li);
    }
  }
  $('scenario').addEventListener('change',reset);
  for(const name of ['guided','independent'])$(name).addEventListener('click',()=>{if(mode!==name){mode=name;reset();}});
  for(const address of addresses)$(address).addEventListener('input',changed);
  for(const field of fields)$(field).addEventListener(field==='threshold'?'input':'change',changed);
  $('apply').addEventListener('click',()=>{
    try{const candidate=A.apply(collect(fields));active=candidate;changed();$('feedback').textContent='Rule applied. The stored numbers are unchanged.';}
    catch(error){render();$('feedback').textContent='Rule not applied. Previous applied rule retained. '+error.message;}
  });
  $('clear').addEventListener('click',()=>{active=null;fields.forEach(field=>{$(field).value='';});changed();$('feedback').textContent='Rule cleared. Worksheet values and submissions retained.';});
  $('reset').addEventListener('click',reset);
  $('submit').addEventListener('click',()=>{
    if(attempts.length>=100){$('feedback').textContent='Session history is full. Earlier submissions retained; practice remains available.';return;}
    const cells=collect(addresses),grade=A.grade(exercise,active,cells);
    const attempt={id:globalThis.crypto?.randomUUID?.()??'session-'+(attempts.length+1),
      submittedAt:new Date().toISOString(),lesson:{id:lesson.id,version:lesson.version},
      runtime:lesson.runtime,rubric:lesson.rubric,scenario:{id:exercise.scenario.id,version:exercise.scenario.version},
      scenarioTitle:exercise.scenario.title,dataset:exercise.dataset,mode,unit:exercise.unit,
      rule:active,cells,grade};
    attempts.push(JSON.parse(JSON.stringify(attempt)));
    if(mode==='independent'&&grade.passed)passedExamples.add(exercise.dataset.id);
    render();$('criteria').replaceChildren();
    $('feedback').textContent='Task score: '+grade.score+' / '+grade.maxScore+' (applied rule)';
    for(const c of grade.criteria){const li=make('li',(c.passed?'Passed: ':'Review: ')+c.label);li.className=c.passed?'correct':'review';$('criteria').append(li);}
    showHistory();
  });
  $('check-quiz').addEventListener('click',()=>{
    const answer=$('choices').querySelector('input:checked');
    $('quiz-feedback').textContent=answer?(Number(answer.value)===lesson.answer?'Correct. ':'Review. ')+lesson.explanation:'Choose an answer first.';
  });
  reset();
})();
