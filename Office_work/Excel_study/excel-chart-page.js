/* F5C chart/report simulation. Local DOM only; no persistence or network. */
(function(){
  'use strict';
  const A=window.CommonplaceExcelChartFoundations,scenarios=window.CommonplaceExcelScenarios.list(),lessons=A.list();
  const $=id=>document.getElementById('f5c-'+id);
  const addresses=[2,3,4,5,6,7].flatMap(r=>['A'+r,'B'+r,'C'+r,'D'+r]);
  const fields=['type','category','measure','filter'],attempts=[],passed=new Set();
  let mode='guided',exercise,active=null,snapshot=null,view=null;
  const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  const collect=keys=>Object.fromEntries(keys.map(key=>[key,$(key).value]));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const measure=c=>c.measure==='sum-amount'?'Total '+exercise.heading:'Record count';
  const unit=c=>c.measure==='sum-amount'?exercise.unit:'records';
  const category=c=>c.category==='group'?exercise.groupHeading:'Status';
  const type=c=>c.type==='column'?'Column chart':'Horizontal bar chart';
  const scope=c=>c.filter==='all'?'All statuses':c.filter+' only';
  const describe=c=>type(c)+' · '+measure(c)+' by '+category(c)+' · '+scope(c);
  function addOption(node,value,label){const n=make('option',label);n.value=value;node.append(n);}
  for(const [id,items] of [['scenario',scenarios],['lesson',lessons]])for(const item of items)addOption($(id),item.id,item.title);
  $('scenario').value='jp-ph-trade';$('lesson').value='chart-group-amounts';
  function clearGrade(){$('criteria').replaceChildren();$('feedback').textContent='';}
  function feedback(message='',invalid=[]){
    $('build-feedback').className='chart-feedback'+(invalid.length||/^Chart not built/.test(message)?' review':'');
    $('build-feedback').textContent=message;
    for(const f of fields){if(invalid.includes(f))$(f).setAttribute('aria-invalid','true');else $(f).removeAttribute('aria-invalid');}
  }
  function status(){
    $('clear').disabled=!active;
    let message='',valid=null;
    try{valid=A.capture(collect(addresses));if(active)A.view(active,valid);}
    catch(error){message='Source needs correction. '+error.message+(active?' Previous chart retained.':'');}
    if(!message&&active){
      const dirty=!same(collect(fields),active),stale=!same(valid,snapshot);
      message=stale||dirty?'Report is out of date. Build / refresh to apply '+(stale&&dirty?'source and settings changes':stale?'source changes':'settings changes')+'.':'Report is current.';
    }else if(!message)message='Choose chart settings, then build the report.';
    $('source-status').textContent=message;
    $('source-status').className=/out of date|needs correction/.test(message)?'review':'muted';
  }
  const NS='http://www.w3.org/2000/svg';
  function svgElement(tag,attributes,text){
    const el=document.createElementNS(NS,tag);
    for(const [k,v] of Object.entries(attributes))el.setAttribute(k,String(v));
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function renderChart(c,v){
    const root=$('chart');root.replaceChildren();
    if(!v.rows.length){root.append(make('p','No records match this report filter. No bars to plot.'));return;}
    const vertical=c.type==='column',w=560,h=vertical?280:Math.max(170,55+v.rows.length*42);
    const svg=svgElement('svg',{viewBox:'0 0 '+w+' '+h,role:'img','aria-label':describe(c)+' ('+unit(c)+'). See the data table for exact values.'});
    const add=(tag,attrs,t)=>svg.append(svgElement(tag,attrs,t));
    const text=(x,y,t,anchor='middle')=>add('text',{x,y,'text-anchor':anchor,fill:'#20362a','font-size':13},t);
    const line=(x1,y1,x2,y2)=>add('line',{x1,y1,x2,y2,stroke:'#576a5d','stroke-width':1.5});
    const z=v.axis.zero;
    if(vertical){
      const x0=70,x1=w-20,y0=24,y1=h-62,dy=y1-y0,dx=(x1-x0)/v.rows.length;
      const y=p=>y1-p*dy,zero=y(z);
      line(x0,zero,x1,zero);text(x0-8,zero+4,'0','end');
      v.rows.forEach((row,i)=>{
        const end=y(v.axis.positions[i]),x=x0+i*dx+dx*.23,bw=dx*.54;
        add('rect',{x,y:Math.min(zero,end),width:bw,height:Math.abs(end-zero),fill:'#27734d','data-category':i+1});
        if(row.value===0) add('circle',{cx:x+bw/2,cy:zero,r:3,fill:'#27734d'});
        text(x+bw/2,y1+22,String(i+1)); // Full labels and exact amounts are in the keyed data table.
      });
      text((x0+x1)/2,h-12,category(c)+' · category numbers in table');
    }else{
      const x0=60,x1=w-30,y0=20,dy=42,x=p=>x0+p*(x1-x0),zero=x(z);
      line(zero,y0,zero,y0+dy*v.rows.length);text(zero,h-10,'0');
      v.rows.forEach((row,i)=>{
        const end=x(v.axis.positions[i]),y=y0+i*dy+8;
        add('rect',{x:Math.min(zero,end),y,width:Math.abs(end-zero),height:26,fill:'#27734d','data-category':i+1});
        if(row.value===0)add('circle',{cx:zero,cy:y+13,r:3,fill:'#27734d'});
        text(x0-12,y+17,String(i+1),'end');
      });
    }
    root.append(svg);
  }
  function renderReport(){
    $('report').hidden=!active;$('empty').hidden=!!active;
    $('chart').replaceChildren();$('data').replaceChildren();$('insight').replaceChildren();
    if(!active)return;
    $('title').textContent=measure(active)+' by '+category(active)+' ('+unit(active)+')';
    $('scope').textContent='Scope: '+scope(active)+' · '+view.includedRows.length+' of 6 records included · '+type(active);
    $('total').textContent='Report total: '+view.total+' '+unit(active);
    $('chart-note').textContent=view.rows.length?'Zero baseline · axis range '+view.axis.min+' to '+view.axis.max+' '+unit(active)+'. Category numbers match the table.':'No matching records; total is zero, not a category.';
    renderChart(active,view);
    const table=document.createElement('table');table.setAttribute('aria-label','Chart values');
    const head=document.createElement('thead'),hr=document.createElement('tr');
    for(const label of ['Category number',category(active),measure(active)+' ('+unit(active)+')']){const th=make('th',label);th.scope='col';hr.append(th);}
    head.append(hr);table.append(head);const body=document.createElement('tbody');
    view.rows.forEach((row,i)=>{const tr=document.createElement('tr');const th=make('th',String(i+1));th.scope='row';tr.append(th,make('td',row.label),make('td',String(row.value)));body.append(tr);});
    table.append(body);$('data').append(table);
    addOption($('insight'),'','Choose a conclusion');
    view.rows.forEach((row,i)=>addOption($('insight'),'row:'+i,row.label));
    addOption($('insight'),'tie','Tie for highest value');addOption($('insight'),'none','No matching records');
  }
  function resetFields(){for(const f of fields)$(f).value=f==='filter'?'all':'';}
  function reset(){
    const s=scenarios.find(s=>s.id===$('scenario').value);exercise=A.exercise($('lesson').value,s.id,s.version,mode);
    active=snapshot=view=null;const l=exercise.lesson;
    for(const name of ['guided','independent']){$(name).setAttribute('aria-pressed',String(mode===name));$(name).classList.toggle('secondary',mode!==name);}
    $('context').textContent=exercise.scenario.title+' · '+exercise.unit+' · '+exercise.context;
    $('task').textContent=l.task+(mode==='independent'?' Keep all starting records unchanged.':'');
    $('hint').hidden=mode!=='guided';$('explanation').textContent=l.concept;$('example').textContent='Try '+describe(l.goal)+'.';
    $('group-heading').textContent='C · '+exercise.groupHeading;$('amount-heading').textContent='D · '+exercise.heading+' ('+exercise.unit+')';
    $('category').querySelector('option[value="group"]').textContent=exercise.groupHeading;
    for(const key of addresses)$(key).value=exercise.values[key];
    resetFields();clearGrade();feedback();renderReport();status();
    $('question').textContent=l.question;$('choices').replaceChildren();$('quiz-feedback').textContent='';
    l.choices.forEach((choice,i)=>{const label=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='f5c-quiz';radio.value=String(i);label.append(radio,document.createTextNode(choice));$('choices').append(label);});
  }
  function changed(){clearGrade();feedback();status();}
  for(const id of ['scenario','lesson'])$(id).addEventListener('change',reset);
  for(const name of ['guided','independent'])$(name).addEventListener('click',()=>{if(mode!==name){mode=name;reset();}});
  for(const key of addresses)$(key).addEventListener(key[0]==='B'?'change':'input',changed);
  for(const key of fields)$(key).addEventListener('change',changed);
  $('insight').addEventListener('change',clearGrade);
  $('build').addEventListener('click',()=>{
    const draft=collect(fields),missing=fields.filter(k=>!draft[k]),retained=active?' Previous chart retained.':' No chart created.';
    if(missing.length){feedback('Chart not built. Choose the chart type, category and measure first.'+retained,missing);return;}
    if(draft.category==='status'&&draft.filter!=='all'){feedback('Chart not built. For a Status category, use All statuses.'+retained,['category','filter']);return;}
    try{
      const c=A.config(draft),s=A.capture(collect(addresses)),v=A.view(c,s);
      active=c;snapshot=s;view=v;clearGrade();renderReport();status();feedback('Chart built from current records. Read the report below and choose a conclusion.');
    }catch(error){status();feedback('Chart not built. '+error.message+retained);}
  });
  $('clear').addEventListener('click',()=>{active=snapshot=view=null;resetFields();clearGrade();renderReport();status();feedback('Chart cleared. Source and submissions retained.');});
  $('reset').addEventListener('click',reset);
  function history(){
    $('progress').textContent='Independent lessons and examples passed: '+passed.size+' / '+(scenarios.length*lessons.length);
    $('history').replaceChildren();
    for(const a of attempts.slice(-10).reverse()){
      const li=document.createElement('li'),details=document.createElement('details');
      details.append(make('summary',a.scenarioTitle+' · '+a.lessonTitle+' · '+a.mode+' · '+a.grade.score+'/'+a.grade.maxScore));
      details.append(make('p',a.submittedAt+' · '+a.lesson.id+'@'+a.lesson.version));
      details.append(make('p',a.config?JSON.stringify(a.config):'No applied chart'));
      if(a.grade.view){
        details.append(make('p','Recorded total: '+a.grade.view.total+' '+a.unit+' · '+a.grade.view.includedRows.length+' records included'));
        for(const row of a.grade.view.rows)details.append(make('p',row.label+': '+row.value+' '+a.unit));
      }
      details.append(make('p','Recorded conclusion: '+a.conclusion));
      const ul=document.createElement('ul');for(const c of a.grade.criteria)ul.append(make('li',(c.passed?'Passed: ':'Review: ')+c.label));details.append(ul);
      for(const key of addresses)details.append(make('p',key+': current '+a.current[key]+' · captured '+(a.snapshot?.[key]??'none')));
      li.append(details);$('history').append(li);
    }
  }
  $('submit').addEventListener('click',()=>{
    if(attempts.length>=100){$('feedback').textContent='Session history is full. Earlier submissions retained; practice remains available.';return;}
    const current=collect(addresses),insight=$('insight').value,grade=A.grade(exercise,active,snapshot,current,insight),l=exercise.lesson;
    // Do not accept a report with unapplied configuration edits as a completed independent task.
    if(active&&!same(collect(fields),active)){
      $('feedback').textContent='Build / refresh the chart to apply your settings before submitting.';return;
    }
    const a={id:globalThis.crypto?.randomUUID?.()??'session-'+(attempts.length+1),submittedAt:new Date().toISOString(),
      lesson:{id:l.id,version:l.version},lessonTitle:l.title,runtime:l.runtime,rubric:l.rubric,scenario:{id:exercise.scenario.id,version:exercise.scenario.version},
      scenarioTitle:exercise.scenario.title,dataset:exercise.dataset,mode,unit:active?unit(active):exercise.unit,config:active,snapshot,current,
      insight,conclusion:$('insight').selectedOptions[0]?.textContent??'No conclusion',grade};
    attempts.push(JSON.parse(JSON.stringify(a)));
    if(mode==='independent'&&grade.passed)passed.add(exercise.dataset.id);
    $('feedback').textContent='Report score: '+grade.score+' / '+grade.maxScore;$('criteria').replaceChildren();
    for(const c of grade.criteria){const li=make('li',(c.passed?'Passed: ':'Review: ')+c.label);li.className=c.passed?'correct':'review';$('criteria').append(li);}
    history();
  });
  $('check-quiz').addEventListener('click',()=>{const answer=$('choices').querySelector('input:checked'),l=exercise.lesson;$('quiz-feedback').textContent=answer?(Number(answer.value)===l.answer?'Correct. ':'Review. ')+l.explanation:'Choose an answer first.';});
  reset();
})();
