/* F4C session-only lookup practice. No storage, account or network. */
(function(){
  'use strict';
  const A=window.CommonplaceExcelLookupFoundations,scenarios=window.CommonplaceExcelScenarios.list(),lessons=A.list();
  const $=id=>document.getElementById('f4c-'+id);
  const addresses=[2,3,4].flatMap(row=>['A'+row,'B'+row,'C'+row]).concat('E2');
  const attempts=[],passed=new Set();
  let mode='guided',exercise;
  const make=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
  const collect=()=>Object.fromEntries(addresses.map(address=>[address,$(address).value]));
  function options(target,items){
    for(const item of items){const o=make('option',item.title);o.value=item.id;$(target).append(o);}
  }
  options('scenario',scenarios);options('lesson',lessons);
  $('scenario').value='jp-ph-trade';$('lesson').value='xlookup-exact';
  function clearResult(){
    $('result').textContent='—';$('match').textContent='';$('feedback').textContent='';
    $('criteria').replaceChildren();
    for(const row of [2,3,4])$('cell-C'+row).classList.remove('matched-amount');
  }
  function reset(){
    const s=scenarios.find(s=>s.id===$('scenario').value);
    exercise=A.exercise($('lesson').value,s.id,s.version,mode);
    const l=exercise.lesson;
    for(const name of ['guided','independent']){
      $(name).setAttribute('aria-pressed',String(mode===name));$(name).classList.toggle('secondary',mode!==name);
    }
    $('context').textContent=exercise.scenario.title+' · '+exercise.unit+' · '+exercise.context;
    $('task').textContent=l.task+(mode==='independent'?' Keep the starting catalog and lookup code unchanged.':'');
    $('hint').hidden=mode!=='guided';$('explanation').textContent=l.concept;$('example').textContent=l.worksheet.formula;
    $('heading').textContent='C · '+exercise.heading+' ('+exercise.unit+')';
    for(const address of addresses)$(address).value=exercise.values[address];
    $('F2').value='';clearResult();
    $('question').textContent=l.question;$('choices').replaceChildren();$('quiz-feedback').textContent='';
    l.choices.forEach((choice,i)=>{
      const label=document.createElement('label'),radio=document.createElement('input');
      radio.type='radio';radio.name='f4c-quiz';radio.value=String(i);label.append(radio,document.createTextNode(choice));$('choices').append(label);
    });
  }
  function showResult(value){
    for(const row of [2,3,4])$('cell-C'+row).classList.toggle('matched-amount',value.error===null&&value.matchedCell==='C'+row);
    $('result').textContent=value.error===null?String(value.result)+(typeof value.result==='number'?' '+exercise.unit:''):value.error==='#N/A'?'#N/A':'Check formula or inputs';
    $('match').textContent=value.error===null?'Returned from '+value.matchedCell+'.':value.error==='#N/A'?'No exact code match in the selected range.':value.error;
  }
  function history(){
    $('progress').textContent='Independent lessons and examples passed: '+passed.size+' / '+(scenarios.length*lessons.length);
    $('history').replaceChildren();
    for(const a of attempts.slice(-10).reverse()){
      const li=document.createElement('li'),details=document.createElement('details');
      details.append(make('summary',a.scenarioTitle+' · '+a.lessonTitle+' · '+a.mode+' · '+a.grade.score+'/'+a.grade.maxScore));
      details.append(make('p',new Date(a.submittedAt).toLocaleString()+' · '+a.lesson.id+'@'+a.lesson.version));
      details.append(make('p','F2: '+a.formula));
      details.append(make('p','Result: '+(a.grade.evaluated.error??(String(a.grade.evaluated.result)+(typeof a.grade.evaluated.result==='number'?' '+a.unit:'')))));
      const ul=document.createElement('ul');
      for(const c of a.grade.criteria)ul.append(make('li',(c.passed?'Passed: ':'Review: ')+c.label));
      details.append(ul);
      for(const address of addresses)details.append(make('p',address+': '+a.cells[address]));
      li.append(details);$('history').append(li);
    }
  }
  for(const id of ['scenario','lesson'])$(id).addEventListener('change',reset);
  for(const name of ['guided','independent'])$(name).addEventListener('click',()=>{if(mode!==name){mode=name;reset();}});
  for(const id of [...addresses,'F2'])$(id).addEventListener('input',clearResult);
  $('reset').addEventListener('click',reset);
  $('preview').addEventListener('click',()=>{
    const grade=A.grade(exercise,$('F2').value,collect());clearResult();showResult(grade.evaluated);
  });
  $('submit').addEventListener('click',()=>{
    if(attempts.length>=100){$('feedback').textContent='Session history is full. Earlier submissions retained; practice remains available.';return;}
    const cells=collect(),formula=$('F2').value,grade=A.grade(exercise,formula,cells),l=exercise.lesson;
    const attempt={id:globalThis.crypto?.randomUUID?.()??'session-'+(attempts.length+1),submittedAt:new Date().toISOString(),
      lesson:{id:l.id,version:l.version},lessonTitle:l.title,runtime:l.runtime,rubric:l.rubric,
      scenario:{id:exercise.scenario.id,version:exercise.scenario.version},scenarioTitle:exercise.scenario.title,
      dataset:exercise.dataset,mode,unit:exercise.unit,cells,formula,grade};
    attempts.push(JSON.parse(JSON.stringify(attempt)));
    if(mode==='independent'&&grade.passed)passed.add(exercise.dataset.id);
    clearResult();showResult(grade.evaluated);$('feedback').textContent='Task score: '+grade.score+' / '+grade.maxScore;
    for(const c of grade.criteria){const li=make('li',(c.passed?'Passed: ':'Review: ')+c.label);li.className=c.passed?'correct':'review';$('criteria').append(li);}
    history();
  });
  $('check-quiz').addEventListener('click',()=>{
    const answer=$('choices').querySelector('input:checked'),l=exercise.lesson;
    $('quiz-feedback').textContent=answer?(Number(answer.value)===l.answer?'Correct. ':'Review. ')+l.explanation:'Choose an answer first.';
  });
  reset();
})();
