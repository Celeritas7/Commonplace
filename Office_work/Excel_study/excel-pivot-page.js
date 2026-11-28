/* F5B session-only PivotTable simulation. No account, storage or network. */
(function(){
  'use strict';
  const A=window.CommonplaceExcelPivotFoundations,scenarios=window.CommonplaceExcelScenarios.list(),lessons=A.list();
  const $=id=>document.getElementById('f5b-'+id);
  const addresses=[2,3,4,5,6,7].flatMap(row=>['A'+row,'B'+row,'C'+row,'D'+row]);
  const fields=['rows','columns','values','filter'],attempts=[],passed=new Set();
  let mode='guided',exercise,active=null,snapshot=null;
  const make=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
  const collect=keys=>Object.fromEntries(keys.map(key=>[key,$(key).value]));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const valueName=v=>v==='sum-amount'?'Sum of Amount':'Count of Record';
  const fieldName=f=>f==='group'?exercise.groupHeading:f==='status'?'Status':'None';
  const describe=config=>'Rows: '+fieldName(config.rows)+' · Columns: '+fieldName(config.columns)+' · Values: '+valueName(config.values)+' · Status: '+(config.filter==='all'?'All':config.filter);
  for(const [id,items] of [['scenario',scenarios],['lesson',lessons]])for(const item of items){
    const option=make('option',item.title);option.value=item.id;$(id).append(option);
  }
  $('scenario').value='jp-ph-trade';$('lesson').value='pivot-group-total';
  function clearGrade(){$('criteria').replaceChildren();$('feedback').textContent='';}
  function layoutFeedback(message='',error=false,invalid=[]){
    const node=$('layout-feedback');node.className='layout-feedback'+(error?' review':'');node.textContent=message;
    for(const field of fields){if(invalid.includes(field))$(field).setAttribute('aria-invalid','true');else $(field).removeAttribute('aria-invalid');}
  }
  function draftProblem(draft){
    const missing=[];if(!draft.rows)missing.push('rows');if(!draft.values)missing.push('values');
    if(missing.length)return {message:missing.length===2?'Choose a Rows field and a Values summary first.':missing[0]==='rows'?'Choose a Rows field first.':'Choose a Values summary first.',fields:missing};
    if(draft.rows===draft.columns)return {message:'Rows and Columns must use different fields. Choose None or a different Columns field.',fields:['rows','columns']};
    if(draft.filter!=='all'&&(draft.rows==='status'||draft.columns==='status'))return {message:'Status is already in Rows or Columns. Set the report filter to All statuses, or move Status out of that axis.',fields:[draft.rows==='status'?'rows':'columns','filter']};
    return null;
  }
  function draw(view,config){
    $('result').replaceChildren();
    if(!view){$('result-note').textContent='Apply a layout to build the summary.';return;}
    $('result-note').textContent=valueName(config.values)+' · '+(config.values==='count-records'?'records':exercise.unit)+' · '+view.includedRows.length+' of 6 source records included. Blank cells mean no matching records.';
    const table=document.createElement('table');table.setAttribute('aria-label','PivotTable summary');
    const head=document.createElement('thead'),hr=document.createElement('tr');
    const heading=make('th',fieldName(config.rows));heading.scope='col';hr.append(heading);
    for(const column of view.columns){const h=make('th',column);h.scope='col';hr.append(h);}
    // A row-only PivotTable already has one summary column; do not duplicate it.
    const cross=config.columns!=='none';
    if(cross){const h=make('th','Grand Total');h.scope='col';hr.append(h);}
    head.append(hr);table.append(head);
    const body=document.createElement('tbody');
    for(const row of view.rows){
      const tr=document.createElement('tr'),label=make('th',row.label);label.scope='row';tr.append(label);
      for(const value of row.cells)tr.append(make('td',value===null?'':String(value)));
      if(cross){const total=make('td',String(row.total));total.className='pivot-total';tr.append(total);}
      body.append(tr);
    }
    table.append(body);
    const foot=document.createElement('tfoot'),fr=document.createElement('tr'),totalLabel=make('th','Grand Total');
    totalLabel.scope='row';fr.append(totalLabel);
    view.columnTotals.forEach((value,i)=>{const td=make('td',String(value));if(!cross&&i===0)td.id='f5b-grand-total';fr.append(td);});
    if(cross){const td=make('td',String(view.grandTotal));td.id='f5b-grand-total';fr.append(td);}
    foot.append(fr);table.append(foot);$('result').append(table);
  }
  function render(){
    $('refresh').disabled=$('clear').disabled=active===null;
    $('active').textContent=active?'Applied: '+describe(active):'No PivotTable created.';
    const draft=collect(fields);let normalized=null;
    try{normalized=A.layout(draft);}catch{}
    const dirty=active?!same(normalized,active):Boolean(draft.rows||draft.values||draft.columns!=='none'||draft.filter!=='all');
    $('draft-status').textContent=dirty?'Unapplied layout changes. Apply layout to update the report.':'No unapplied layout changes.';
    const current=collect(addresses);
    try{
      const valid=A.capture(current),fresh=active&&same(valid,snapshot);
      $('source-status').textContent=active?(fresh?'Source snapshot is current.':'Source changed. Refresh required; the table still uses the last captured data.'):'Source is valid. Apply a layout to create a snapshot.';
      $('source-status').className=active&&!fresh?'review':'muted';
    }catch(error){
      $('source-status').textContent='Source needs correction. '+error.message+(active?' Previous snapshot retained.':'');
      $('source-status').className='review';
    }
    draw(active?A.view(active,snapshot):null,active);
  }
  function resetFields(){$('rows').value='';$('columns').value='none';$('values').value='';$('filter').value='all';}
  function reset(){
    const s=scenarios.find(s=>s.id===$('scenario').value);
    exercise=A.exercise($('lesson').value,s.id,s.version,mode);active=null;snapshot=null;
    const lesson=exercise.lesson;
    for(const name of ['guided','independent']){
      $(name).setAttribute('aria-pressed',String(mode===name));$(name).classList.toggle('secondary',mode!==name);
    }
    $('context').textContent=exercise.scenario.title+' · '+exercise.unit+' · '+exercise.context;
    $('task').textContent=lesson.task+(mode==='independent'?' Keep all starting records unchanged.':'');
    $('hint').hidden=mode!=='guided';$('explanation').textContent=lesson.concept;$('example').textContent='Try '+describe(lesson.goal)+'.';
    $('group-heading').textContent='C · '+exercise.groupHeading;
    $('amount-heading').textContent='D · '+exercise.heading+' ('+exercise.unit+')';
    for(const id of ['rows','columns'])$(id).querySelector('option[value="group"]').textContent=exercise.groupHeading;
    for(const address of addresses)$(address).value=exercise.values[address];
    resetFields();clearGrade();layoutFeedback();
    $('question').textContent=lesson.question;$('choices').replaceChildren();$('quiz-feedback').textContent='';
    lesson.choices.forEach((choice,i)=>{
      const label=document.createElement('label'),radio=document.createElement('input');
      radio.type='radio';radio.name='f5b-quiz';radio.value=String(i);label.append(radio,document.createTextNode(choice));$('choices').append(label);
    });
    render();
  }
  function changed(){clearGrade();layoutFeedback();render();}
  function history(){
    $('progress').textContent='Independent lessons and examples passed: '+passed.size+' / '+(scenarios.length*lessons.length);
    $('history').replaceChildren();
    for(const a of attempts.slice(-10).reverse()){
      const li=document.createElement('li'),details=document.createElement('details');
      details.append(make('summary',a.scenarioTitle+' · '+a.lessonTitle+' · '+a.mode+' · '+a.grade.score+'/'+a.grade.maxScore));
      details.append(make('p',new Date(a.submittedAt).toLocaleString()+' · '+a.lesson.id+'@'+a.lesson.version));
      const layout=a.layout;
      details.append(make('p',layout?'Rows: '+layout.rows+' · Columns: '+layout.columns+' · Values: '+valueName(layout.values)+' · Filter: '+layout.filter:'No applied layout'));
      if(a.grade.view)details.append(make('p','Recorded grand total: '+a.grade.view.grandTotal+' '+(layout.values==='count-records'?'records':a.unit)));
      const ul=document.createElement('ul');
      for(const c of a.grade.criteria)ul.append(make('li',(c.passed?'Passed: ':'Review: ')+c.label));
      details.append(ul);
      if(a.grade.view){
        details.append(make('p','Recorded columns: '+a.grade.view.columns.join(' · ')));
        for(const row of a.grade.view.rows)details.append(make('p',row.label+': '+row.cells.map(v=>v===null?'blank':String(v)).join(' · ')+' · Total '+row.total));
      }
      for(const address of addresses)details.append(make('p',address+': current '+a.current[address]+' · cached '+(a.snapshot?.[address]??'none')));
      li.append(details);$('history').append(li);
    }
  }
  for(const id of ['scenario','lesson'])$(id).addEventListener('change',reset);
  for(const name of ['guided','independent'])$(name).addEventListener('click',()=>{if(mode!==name){mode=name;reset();}});
  for(const address of addresses)$(address).addEventListener(address[0]==='B'?'change':'input',changed);
  for(const field of fields)$(field).addEventListener('change',changed);
  $('apply').addEventListener('click',()=>{
    const draft=collect(fields),problem=draftProblem(draft);
    const retained=()=>active?' Previous PivotTable retained.':' No PivotTable created.';
    if(problem){layoutFeedback('Layout not applied. '+problem.message+retained(),true,problem.fields);return;}
    try{
      const next=A.layout(draft),nextSnapshot=snapshot??A.capture(collect(addresses));
      A.view(next,nextSnapshot);active=next;snapshot=nextSnapshot;changed();
      layoutFeedback('Layout applied. See the PivotTable result below. Refresh if the current source differs from the snapshot.');
    }catch(error){render();layoutFeedback('Layout not applied. '+error.message+retained(),true);}
  });
  $('refresh').addEventListener('click',()=>{
    if(!active)return;
    try{
      const next=A.capture(collect(addresses));A.view(active,next);snapshot=next;changed();
      layoutFeedback('PivotTable refreshed from the current source.');
    }catch(error){render();layoutFeedback('Refresh failed. Previous PivotTable retained. '+error.message,true);}
  });
  $('clear').addEventListener('click',()=>{active=null;snapshot=null;resetFields();changed();layoutFeedback('PivotTable cleared. Source and submissions retained.');});
  $('reset').addEventListener('click',reset);
  $('submit').addEventListener('click',()=>{
    if(attempts.length>=100){$('feedback').textContent='Session history is full. Earlier submissions retained; practice remains available.';return;}
    const current=collect(addresses),grade=A.grade(exercise,active,snapshot,current),lesson=exercise.lesson;
    const attempt={id:globalThis.crypto?.randomUUID?.()??'session-'+(attempts.length+1),submittedAt:new Date().toISOString(),
      lesson:{id:lesson.id,version:lesson.version},lessonTitle:lesson.title,runtime:lesson.runtime,rubric:lesson.rubric,
      scenario:{id:exercise.scenario.id,version:exercise.scenario.version},scenarioTitle:exercise.scenario.title,
      dataset:exercise.dataset,mode,unit:exercise.unit,layout:active,snapshot,current,grade};
    attempts.push(JSON.parse(JSON.stringify(attempt)));
    if(mode==='independent'&&grade.passed)passed.add(exercise.dataset.id);
    render();$('criteria').replaceChildren();$('feedback').textContent='Task score: '+grade.score+' / '+grade.maxScore+' (applied layout)';
    for(const c of grade.criteria){const li=make('li',(c.passed?'Passed: ':'Review: ')+c.label);li.className=c.passed?'correct':'review';$('criteria').append(li);}
    history();
  });
  $('check-quiz').addEventListener('click',()=>{
    const answer=$('choices').querySelector('input:checked'),lesson=exercise.lesson;
    $('quiz-feedback').textContent=answer?(Number(answer.value)===lesson.answer?'Correct. ':'Review. ')+lesson.explanation:'Choose an answer first.';
  });
  reset();
})();
