/* Guided mode consumes semantic simulator events; lesson definitions are data, not code. */
(function(global){
  'use strict';
  function matches(expected,actual){
    if(!expected||!actual||typeof actual!=='object')return false;
    return Object.entries(expected).every(([key,value])=>
      value!==null&&typeof value==='object'?matches(value,actual[key]):actual[key]===value);
  }
  function createSession(lesson){
    if(!lesson||!Array.isArray(lesson.steps)||!lesson.steps.length)throw Error('A guided lesson needs steps');
    let index=0;
    return {
      get index(){return index;},
      get done(){return index===lesson.steps.length;},
      get step(){return lesson.steps[index]||null;},
      accept(action){
        if(index===lesson.steps.length||!matches(lesson.steps[index].expect,action))return false;
        index++;return true;
      }
    };
  }
  function mount({root,panel,simulator,lessons,resetWorksheet}){
    if(!root||!panel||!simulator||!lessons?.length||panel.dataset.guidedMounted)return;
    panel.dataset.guidedMounted='true';
    const q=s=>panel.querySelector(s);
    const picker=q('[data-guided-picker]'),start=q('[data-guided-start]'),hint=q('[data-guided-hint]'),exit=q('[data-guided-exit]');
    const context=q('[data-guided-context]'),instruction=q('[data-guided-instruction]'),feedback=q('[data-guided-feedback]'),progress=q('[data-guided-progress]'),count=q('[data-guided-count]');
    let lesson=lessons[0],session=null,active=false;
    for(const item of lessons){
      const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.title;picker.append(opt);
    }
    function clearHighlights(){root.querySelectorAll('.excel-guided-target').forEach(el=>el.classList.remove('excel-guided-target'));}
    function find(attr,value,within=root){
      return [...within.querySelectorAll('['+attr+']')].find(el=>el.getAttribute(attr)===value);
    }
    function target(){
      if(!active||!session?.step)return null;
      const e=session.step.expect;
      if(e.type==='select')return find('data-cell',e.cell);
      if(e.type==='tab')return find('data-excel-tab',e.tab);
      if(e.type==='tool'){
        const selected=root.querySelector('[data-excel-name]')?.textContent;
        if(selected!==e.cell)return find('data-cell',e.cell);
        if(simulator.getTab()!==e.tab)return find('data-excel-tab',e.tab);
        return [...root.querySelectorAll('[data-excel-tool]')].find(el=>el.dataset.excelTool===e.tool&&el.dataset.excelGroup===e.group);
      }
      return null;
    }
    function highlight(){
      clearHighlights();
      const el=target();if(!el)return null;
      el.classList.add('excel-guided-target');
      // Reveal off-screen Ribbon targets horizontally, without moving the whole page.
      const strip=el.closest('.excel-ribbon,.excel-tabs');
      if(strip){const a=el.getBoundingClientRect(),b=strip.getBoundingClientRect();
        if(a.left<b.left)strip.scrollLeft+=a.left-b.left-8;
        else if(a.right>b.right)strip.scrollLeft+=a.right-b.right+8;
      }
      return el;
    }
    function render(){
      context.textContent=lesson.context;
      const total=lesson.steps.length,completed=session?.index||0;
      progress.max=total;progress.value=completed;
      count.textContent=completed+' / '+total+' actions completed';
      instruction.textContent=session?.done?lesson.success:active?session.step.instruction:'Start a guided lesson, or explore the worksheet freely below.';
      picker.disabled=active;start.textContent=active?'Restart lesson':session?.done?'Practise again':'Start guided lesson';
      hint.hidden=!active;exit.hidden=!active;
      root.classList.toggle('excel-guided-active',active);
      highlight();
    }
    function begin(){
      active=false;clearHighlights();session=null;
      resetWorksheet();
      // Make learners explicitly find Home and select their own starting cell.
      simulator.showTab('View');simulator.select('B2');
      session=createSession(lesson);active=true;
      feedback.textContent='Follow the highlighted target. Each step advances only after the requested action succeeds.';
      render();
    }
    picker.addEventListener('change',()=>{
      lesson=lessons.find(x=>x.id===picker.value)||lessons[0];session=null;feedback.textContent='';render();
    });
    start.addEventListener('click',begin);
    hint.addEventListener('click',()=>{
      const el=highlight();if(el){
        el.scrollIntoView({block:'nearest',inline:'nearest'});
        feedback.textContent='The highlighted control is the next target. Click or tap it yourself.';
      }
    });
    exit.addEventListener('click',()=>{
      active=false;session=null;feedback.textContent='Guided mode ended. Your worksheet is unchanged; you can explore freely.';render();
    });
    root.addEventListener('excel-action',event=>{
      if(!active)return;
      const action=event.detail;
      if(action?.type==='reset'){
        active=false;session=null;feedback.textContent='Worksheet reset. Start the guided lesson again when ready.';render();return;
      }
      if(session.accept(action)){
        if(session.done){active=false;feedback.textContent='Lesson complete. All required actions were verified.';}
        else feedback.textContent='Correct — move to the next highlighted action.';
      }else if(action?.type==='tool'){
        feedback.textContent='That did not complete this step. '+session.step.instruction+' You can restart to restore the sample data.';
      }else if((action?.type==='select'||action?.type==='tab')&&action.type===session.step.expect.type){
        feedback.textContent='Follow the current instruction; this action did not advance the lesson.';
      }
      // A pointer click can follow focusin on the same cell; navigation during a tool step is also allowed.
      render();
    });
    render();
    return {get active(){return active;},get session(){return session;}};
  }
  global.CommonplaceExcelGuided={mount,createSession,matches};
})(window);
