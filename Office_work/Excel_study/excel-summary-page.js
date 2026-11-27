/* F5A session-only conditional summary practice. No storage or network. */
(function(){
  'use strict';
  const A=window.CommonplaceExcelSummaryFoundations,scenarios=window.CommonplaceExcelScenarios.list(),lessons=A.list();
  const $=id=>document.getElementById('f5a-'+id);
  const source=[2,3,4,5,6,7].flatMap(row=>['A'+row,'B'+row,'C'+row,'D'+row]),addresses=source.concat(['F2','F3']);
  const attempts=[],passed=new Set();
  let mode='guided',exercise;
  const make=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
  const collect=()=>Object.fromEntries(addresses.map(address=>[address,$(address).value]));
  for(const [id,items] of [['scenario',scenarios],['lesson',lessons]])for(const item of items){
    const option=make('option',item.title);option.value=item.id;$(id).append(option);
  }
  $('scenario').value='jp-ph-trade';$('lesson').value='sumif-status';
  function clearResult(){
    $('result').textContent='—';$('match').textContent='';$('feedback').textContent='';
    $('criteria').replaceChildren();
    for(const address of source)$('cell-'+address).classList.remove('matched-cell');
  }
  function reset(){
    const s=scenarios.find(s=>s.id===$('scenario').value);
    exercise=A.exercise($('lesson').value,s.id,s.version,mode);
    const l=exercise.lesson;
    for(const name of ['guided','independent']){
      $(name).setAttribute('aria-pressed',String(mode===name));$(name).classList.toggle('secondary',mode!==name);
    }
    $('context').textContent=exercise.scenario.title+' · '+exercise.unit+' · '+exercise.context;
    $('task').textContent=l.task+(mode==='independent'?' Keep all starting records and criteria unchanged.':'');
    $('hint').hidden=mode!=='guided';$('explanation').textContent=l.concept;$('example').textContent=l.worksheet.formula;
    $('group-heading').textContent='C · '+exercise.groupHeading;
    $('amount-heading').textContent='D · '+exercise.heading+' ('+exercise.unit+')';
    $('criteria-note').textContent=l.fn==='SUMIFS'?'The task uses F2 and F3 together.':'The task uses F2; F3 is available for exploring other summary formulas.';
    for(const address of addresses)$(address).value=exercise.values[address];
    $('G2').value='';clearResult();
    $('question').textContent=l.question;$('choices').replaceChildren();$('quiz-feedback').textContent='';
    l.choices.forEach((choice,i)=>{
      const label=document.createElement('label'),radio=document.createElement('input');
      radio.type='radio';radio.name='f5a-quiz';radio.value=String(i);label.append(radio,document.createTextNode(choice));$('choices').append(label);
    });
  }
  function describe(formula,result,unit){
    // Label by the actually entered function, not the selected lesson.
    const count=/^(?: |\r\n)*=(?: |\r\n)*COUNTIF\(/i.test(formula);
    return String(result)+' '+(count?'matching records':unit);
  }
  function matchesText(matches){
    return matches.length?matches.map(pair=>pair.criteria.join(' + ')+(pair.amount?' → '+pair.amount:'')).join('; '):'none';
  }
  function showResult(formula,value){
    if(value.error!==null){$('result').textContent='Check formula or inputs';$('match').textContent=value.error;return;}
    const matched=new Set(value.matched.flatMap(p=>[...p.criteria,...(p.amount?[p.amount]:[])]));
    for(const address of source)$('cell-'+address).classList.toggle('matched-cell',matched.has(address));
    $('result').textContent=describe(formula,value.result,exercise.unit);
    $('match').textContent=value.matched.length+' matching position(s). Matched cells: '+matchesText(value.matched)+'.';
  }
  function history(){
    $('progress').textContent='Independent lessons and examples passed: '+passed.size+' / '+(scenarios.length*lessons.length);
    $('history').replaceChildren();
    for(const a of attempts.slice(-10).reverse()){
      const li=document.createElement('li'),details=document.createElement('details');
      details.append(make('summary',a.scenarioTitle+' · '+a.lessonTitle+' · '+a.mode+' · '+a.grade.score+'/'+a.grade.maxScore));
      details.append(make('p',new Date(a.submittedAt).toLocaleString()+' · '+a.lesson.id+'@'+a.lesson.version));
      details.append(make('p','G2: '+a.formula));
      details.append(make('p','Result: '+(a.grade.evaluated.error??describe(a.formula,a.grade.evaluated.result,a.unit))));
      details.append(make('p','Matched cells: '+matchesText(a.grade.evaluated.matched)));
      const ul=document.createElement('ul');
      for(const c of a.grade.criteria)ul.append(make('li',(c.passed?'Passed: ':'Review: ')+c.label));
      details.append(ul);
      for(const address of addresses)details.append(make('p',address+': '+a.cells[address]));
      li.append(details);$('history').append(li);
    }
  }
  for(const id of ['scenario','lesson'])$(id).addEventListener('change',reset);
  for(const name of ['guided','independent'])$(name).addEventListener('click',()=>{if(mode!==name){mode=name;reset();}});
  for(const id of [...addresses,'G2'])$(id).addEventListener('input',clearResult);
  $('reset').addEventListener('click',reset);
  $('preview').addEventListener('click',()=>{
    const formula=$('G2').value,grade=A.grade(exercise,formula,collect());clearResult();showResult(formula,grade.evaluated);
  });
  $('submit').addEventListener('click',()=>{
    if(attempts.length>=100){$('feedback').textContent='Session history is full. Earlier submissions retained; practice remains available.';return;}
    const cells=collect(),formula=$('G2').value,grade=A.grade(exercise,formula,cells),l=exercise.lesson;
    const attempt={id:globalThis.crypto?.randomUUID?.()??'session-'+(attempts.length+1),submittedAt:new Date().toISOString(),
      lesson:{id:l.id,version:l.version},lessonTitle:l.title,runtime:l.runtime,rubric:l.rubric,
      scenario:{id:exercise.scenario.id,version:exercise.scenario.version},scenarioTitle:exercise.scenario.title,
      dataset:exercise.dataset,mode,unit:exercise.unit,cells,formula,grade};
    attempts.push(JSON.parse(JSON.stringify(attempt)));
    if(mode==='independent'&&grade.passed)passed.add(exercise.dataset.id);
    clearResult();showResult(formula,grade.evaluated);$('feedback').textContent='Task score: '+grade.score+' / '+grade.maxScore;
    for(const c of grade.criteria){const li=make('li',(c.passed?'Passed: ':'Review: ')+c.label);li.className=c.passed?'correct':'review';$('criteria').append(li);}
    history();
  });
  $('check-quiz').addEventListener('click',()=>{
    const answer=$('choices').querySelector('input:checked'),l=exercise.lesson;
    $('quiz-feedback').textContent=answer?(Number(answer.value)===l.answer?'Correct. ':'Review. ')+l.explanation:'Choose an answer first.';
  });
  reset();
})();
