/* Independent self-assessment. No identity, network, or device-wide persistence. */
(function(global){
  'use strict';
  const section='office.excel';
  const maxAnswerLength=512;
  function bounded(value){
    if(typeof value==='boolean'||value===null)return value;
    return typeof value==='string'?value.slice(0,maxAnswerLength):null;
  }
  function snapshot(root){
    const cells=Object.create(null);
    for(const el of root.querySelectorAll('[data-cell]')){
      const input=el.querySelector('input');
      cells[el.dataset.cell]={
        value:bounded(input?input.value:el.textContent.trim()),
        bold:el.classList.contains('excel-bold'),
        fill:el.classList.contains('excel-fill'),
        border:el.classList.contains('excel-border')
      };
    }
    return {cells,formula:bounded(root.querySelector('[data-excel-formula]')?.value??'')};
  }
  function evaluate(criterion,state){
    if(criterion.all){
      const children=criterion.all.map(c=>evaluate(c,state));
      return {passed:children.every(c=>c.passed),response:children.map(c=>c.response)};
    }
    const actual=bounded(criterion.cell?state.cells?.[criterion.cell]?.[criterion.property]:state[criterion.property]);
    let passed=false;
    if(criterion.property==='formula'){
      const normalize=v=>typeof v==='string'?v.replace(/\s/g,'').toUpperCase():null;
      passed=typeof actual==='string'&&normalize(actual)===normalize(criterion.expected);
    }else if(typeof criterion.expected==='boolean'){
      passed=actual===criterion.expected;
    }else if(typeof criterion.expected==='string'&&/^-?\d+(?:\.\d+)?$/.test(criterion.expected)){
      passed=typeof actual==='string'&&actual.trim()!==''&&Number.isFinite(Number(actual))&&Number(actual)===Number(criterion.expected);
    }else{
      passed=actual===criterion.expected;
    }
    return {passed,response:{cell:criterion.cell??null,property:criterion.property,value:actual}};
  }
  function grade(lesson,state){
    const results=lesson.criteria.map(c=>{
      const {passed,response}=evaluate(c,state);
      return {criterion_id:c.id,skill_id:c.skill,label:c.label,passed,response};
    });
    const score=results.filter(r=>r.passed).length;
    return {score,max_score:results.length,passed:score===results.length,results};
  }
  function uuid(){
    if(global.crypto?.randomUUID)return global.crypto.randomUUID();
    const b=global.crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
    const h=Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  function makeRecord(lesson,state,{attemptId,startedAt,submittedAt}){
    const result=grade(lesson,state);
    return {schema_version:1,section,assessment_id:lesson.id,assessment_version:lesson.version,
      attempt_id:attemptId,started_at:startedAt,submitted_at:submittedAt,
      ...(lesson.scenario_id?{scenario_id:lesson.scenario_id,scenario_version:lesson.scenario_version,scenario_title:lesson.scenario_title}:{}),
      grading:'client-self-assessment',...result};
  }
  function mount({root,panel,simulator,lessons,resetWorksheet,prepare,onSubmitted}){
    if(!root||!panel||!simulator||!lessons?.length||panel.dataset.assessmentMounted)return;
    panel.dataset.assessmentMounted='true';
    const q=s=>panel.querySelector('[data-assessment-'+s+']');
    const picker=q('picker'),start=q('start'),submit=q('submit'),cancel=q('cancel');
    const scenario=q('scenario'),task=q('task'),status=q('status'),results=q('results'),history=q('history');
    let lesson=lessons[0],active=false,attempt=null,last=null;
    const records=[];
    const attemptTitles=new Map();
    const add=(parent,tag,text,cls)=>{const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.append(el);return el;};
    function populate(){picker.replaceChildren();for(const item of lessons){const opt=add(picker,'option',item.title);opt.value=item.id;}picker.value=lessons[0].id;}
    populate();
    function render(){
      scenario.textContent=lesson.scenario;task.textContent=lesson.task;
      picker.disabled=active;start.hidden=active;start.textContent=last?'Try again':'Start assessment';
      submit.hidden=!active;cancel.hidden=!active;
      root.classList.toggle('excel-assessment-active',active);
      results.replaceChildren();results.hidden=!last;
      if(last){
        add(results,'strong','Score: '+last.score+' / '+last.max_score+(last.passed?' — all criteria met':' — review and practise again'));
        const list=add(results,'ul','');
        last.results.forEach(r=>add(list,'li',(r.passed?'Correct: ':'Review: ')+r.label,r.passed?'assessment-pass':'assessment-review'));
      }
      history.replaceChildren();history.hidden=records.length===0;
      if(records.length){
        add(history,'strong','This session — '+records.length+' submitted attempt'+(records.length===1?'':'s'));
        const list=add(history,'ol','');
        records.slice().reverse().forEach(r=>add(list,'li',(r.scenario_title?r.scenario_title+' · ':'')+(attemptTitles.get(r.attempt_id)||r.assessment_id)+' — '+r.score+'/'+r.max_score));
      }
    }
    function begin(){
      active=false;last=null;attempt=null;
      // Reset only the synthetic worksheet; the reset event also exits any guided lesson.
      resetWorksheet();
      simulator.showTab('Home');simulator.select('B2');
      prepare?.(lesson);
      attempt={attemptId:uuid(),startedAt:new Date().toISOString()};
      active=true;status.textContent='Work independently in the worksheet, then submit. No target highlighting is provided.';
      render();
    }
    picker.addEventListener('change',()=>{
      if(active)return;
      lesson=lessons.find(x=>x.id===picker.value)||lessons[0];
      last=null;status.textContent='';render();
    });
    start.addEventListener('click',()=>{if(!active)begin();});
    submit.addEventListener('click',()=>{
      if(!active||!attempt)return;
      const record=makeRecord(lesson,snapshot(root),{...attempt,submittedAt:new Date().toISOString()});
      active=false;attempt=null;last=record;records.push(record);attemptTitles.set(record.attempt_id,lesson.title);
      status.textContent='Assessment submitted. Results are held for this session only; not saved to the database.';
      render();
      // Host may later supply an authorized account/material-scoped sink. Never attach identity here.
      onSubmitted?.(JSON.parse(JSON.stringify(record)));
    });
    cancel.addEventListener('click',()=>{
      if(!active)return;
      active=false;attempt=null;last=null;status.textContent='Assessment cancelled. No attempt submitted; worksheet left unchanged.';render();
    });
    root.addEventListener('excel-action',event=>{
      if(active&&event.detail?.type==='reset'){
        active=false;attempt=null;last=null;status.textContent='Worksheet reset. The unfinished assessment was cancelled.';render();
      }
    });
    render();
    return {get active(){return active;},get records(){return JSON.parse(JSON.stringify(records));},setLessons(next){if(!next?.length)return;active=false;attempt=null;last=null;lessons=next;lesson=next[0];populate();status.textContent='';render();}};
  }
  global.CommonplaceExcelAssessment={mount,grade,makeRecord,snapshot};
})(window);
