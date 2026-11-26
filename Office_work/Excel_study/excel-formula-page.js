/* F1 preview page; no localStorage, account identifiers, network or database writes. */
(function(){
  'use strict';
  const E=window.CommonplaceExcelFormulaFoundations,S=window.CommonplaceExcelScenarios,W=window.CommonplaceExcelTutorials;
  const $=id=>document.getElementById('f1-'+id),inputs=[0,1,2].map(i=>$('value-'+i)),records=[],passed=new Set();
  const fillOptions=(el,items)=>{for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.title;el.append(option);}};
  fillOptions($('scenario'),S.list());fillOptions($('lesson'),E.list());
  $('scenario').value='general-office';$('lesson').value='sum';
  let ex;
  const values=()=>inputs.map(x=>x.value);
  function feedback(text){$('feedback').textContent=text;}
  function invalidate(){$('output').textContent='—';$('result').replaceChildren();feedback('Apply the formula to calculate the current values.');}
  function reset(){inputs.forEach((x,i)=>x.value=ex.values[i]);$('formula').value='';invalidate();}
  function updateProgress(){
    const key=ex.scenario.id+'@'+ex.scenario.version+':';
    const completed=E.list().filter(l=>passed.has(key+l.id)).length;
    $('progress').textContent=completed+' / 5 independent formula skills passed for '+ex.scenario.title+' · '+records.length+' submitted tasks this session.';
    $('history').replaceChildren();
    for(const r of records.slice(-10).reverse()){const li=document.createElement('li');li.textContent=r.scenario+' · '+r.lesson+' · '+r.mode+' · '+r.score+'/'+r.maxScore;$('history').append(li);}
  }
  function start(mode){
    const s=S.list().find(x=>x.id===$('scenario').value);
    ex=E.exercise($('lesson').value,s.id,s.version,mode);
    $('context').textContent=ex.scenario.context;
    $('title').textContent=ex.lesson.title;
    $('mode').textContent=mode==='guided'?'Guided practice':'Independent self-assessment';
    $('concept').open=mode==='guided';
    $('explain').textContent=ex.lesson.concept;
    $('example').textContent='Example formula: '+ex.formula+'. In real Excel, values recalculate automatically. Here, press Apply formula.';
    $('task').textContent=ex.instruction;
    $('heading').textContent=s.heading;$('quantity').textContent=s.quantity;
    s.labels.forEach((label,i)=>{$('label-'+i).textContent=label;inputs[i].setAttribute('aria-label','B'+(i+2)+', '+label);});
    $('question').textContent=ex.lesson.question;
    $('options').replaceChildren();
    ex.lesson.choices.forEach((choice,i)=>{
      const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');
      input.type='radio';input.name='f1-question';input.value=String(i);input.required=true;span.textContent=choice;label.append(input,span);$('options').append(label);
    });
    $('quiz-feedback').textContent='';$('download-status').textContent='';reset();updateProgress();
  }
  function selectedMode(){return ex?.mode??'guided';}
  $('scenario').addEventListener('change',()=>start(selectedMode()));$('lesson').addEventListener('change',()=>start(selectedMode()));
  $('guided').addEventListener('click',()=>start('guided'));$('independent').addEventListener('click',()=>start('independent'));
  $('reset').addEventListener('click',reset);
  inputs.forEach(x=>x.addEventListener('input',invalidate));$('formula').addEventListener('input',invalidate);
  function apply(){
    try{
      const r=E.evaluate($('formula').value,values());
      $('output').textContent=r.error??String(r.result);
      const unit=r.fn==='COUNT'?'numeric cells':ex.scenario.unit;
      feedback(r.error?'AVERAGE requires at least one numeric cell.':r.fn+' returned '+r.result+' '+unit+'.');
    }catch(e){$('output').textContent='—';feedback(e.message);}
  }
  $('form').addEventListener('submit',e=>{e.preventDefault();$('result').replaceChildren();apply();});
  $('submit').addEventListener('click',()=>{
    if(records.length>=100){feedback('Session history is full. Earlier submissions are kept; reload only when you are finished reviewing.');return;}
    apply();const r=E.grade(ex,$('formula').value,values());
    records.push({scenario:ex.scenario.title,lesson:ex.lesson.title,mode:ex.mode,score:r.score,maxScore:r.maxScore});
    if(ex.mode==='independent'&&r.passed)passed.add(ex.scenario.id+'@'+ex.scenario.version+':'+ex.lesson.id);
    const title=document.createElement('strong'),list=document.createElement('ul');
    title.textContent='Task score: '+r.score+' / '+r.maxScore;list.className='result-list';
    for(const c of r.criteria){const li=document.createElement('li');li.className=c.passed?'correct':'review';li.textContent=(c.passed?'Correct: ':'Review: ')+c.label;list.append(li);}
    $('result').replaceChildren(title,list);updateProgress();
  });
  $('quiz').addEventListener('change',()=>{$('quiz-feedback').textContent='';});
  $('quiz').addEventListener('submit',e=>{
    e.preventDefault();const selected=$('options').querySelector('input:checked');
    if(!selected)return;
    $('quiz-feedback').textContent=(Number(selected.value)===ex.lesson.answer?'Correct. ':'Review. ')+ex.lesson.explanation;
  });
  function download(kind){
    try{
      const file=W.createFormulaWorkbook(ex.scenario.id,ex.scenario.version,kind);
      const url=URL.createObjectURL(new Blob([file.bytes],{type:file.mime})),a=document.createElement('a');
      a.href=url;a.download=file.filename;document.body.append(a);
      try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
      $('download-status').textContent='Prepared '+file.filename+'. Open it from your browser downloads.';
    }catch(e){$('download-status').textContent='Workbook could not be prepared. '+e.message;}
  }
  $('download').addEventListener('click',()=>download('practice'));$('solution').addEventListener('click',()=>download('solution'));
  start('guided');
})();
