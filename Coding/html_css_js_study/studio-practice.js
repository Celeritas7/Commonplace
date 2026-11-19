/* Guided exercise UI. All records belong to the existing Web Studio store. */
(function(global){
 'use strict';
 const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const copy=value=>JSON.parse(JSON.stringify(value));
 const same=(a,b)=>['html','css','js'].every(file=>a[file]===b[file]);
 const retained=20;
 function mount(options){
  const root=options.root,$=selector=>root.querySelector(selector),catalog=global.WebStudioExercises;
  if(!$('#wb-exercise-panel')||!catalog||typeof options.preview.check!=='function')return null;
  const records=copy(options.records||{});
  let busy=false,revision=0,notice='',noticeError=false;
  const exercise=()=>catalog.byLanguage(options.getLanguage());
  function record(ex){
   if(!Object.prototype.hasOwnProperty.call(records,ex.id))records[ex.id]={};
   const r=records[ex.id];
   if(!r.attempts)r.attempts=[];
   if(r.totalAttempts===undefined)r.totalAttempts=r.attempts.length;
   if(r.hintsSeen===undefined)r.hintsSeen=0;
   if(r.solutionViewed===undefined)r.solutionViewed=false;
   return r;
  }
  const last=ex=>record(ex).attempts.at(-1);
  const unresolved=ex=>{const a=last(ex);return !!a&&a.status!=='passed';};
  function persist(){return options.save();}
  function resultRows(ex,attempt){
   return attempt.checks.map(row=>{
    const detail=ex.checks.find(check=>check.id===row.id);
    return '<li class="wb-check-row" data-passed="'+row.passed+'"><strong>'+(row.passed?'Passed: ':'Try again: ')+escape(detail?.label||row.id)+'</strong><p>Expected: '+escape(row.expected)+'<br>Observed: '+escape(row.actual)+'</p>'+(!row.passed&&detail?'<p>'+escape(detail.why)+'</p>':'')+'</li>';
   }).join('');
  }
  function renderResult(){
   const ex=exercise(),attempt=last(ex),out=$('#wb-exercise-feedback');
   const changed=attempt&&!same(attempt.files,options.getProject());
   out.dataset.state=noticeError?'error':notice?'notice':attempt?.status||'new';
   $('#wb-exercise-message').textContent=notice||(attempt?(changed?'Code changed since your last check. Check again to assess this version.':attempt.status==='passed'?'Automatic checks passed for this code. Use Run preview to review the appearance yourself.':attempt.status==='failed'?'Some checks need another try. Review the expected and observed results below.':'The check could not complete. Fix the reported problem and retry.'):'No automatic check yet. Edit the code, then select Check exercise.');
   $('#wb-exercise-results').innerHTML=attempt?resultRows(ex,attempt):'';
   $('#wb-exercise-error').textContent=attempt?.error||'';
   $('#wb-exercise-error').hidden=!attempt?.error;
   $('#wb-exercise-previous').textContent=attempt?'Last attempt: '+new Date(attempt.at).toLocaleString()+' · '+attempt.status+(attempt.assisted?' · with help':'')+(changed?' · previous code':''):'';
   $('#wb-check-exercise').disabled=busy;
   $('#wb-check-exercise').textContent=busy?'Checking exercise…':'Check exercise';
   $('#wb-check-cancel').hidden=!busy;
   const count=catalog.list.filter(unresolved).length;
   $('#wb-mistakes-link').textContent='Mistake Bank'+(count?' ('+count+')':'');
  }
  function fileBlocks(files){return ['html','css','js'].map(file=>'<details><summary>'+escape({html:'index.html',css:'style.css',js:'script.js'}[file])+'</summary><pre><code>'+escape(files[file])+'</code></pre></details>').join('');}
  function renderHistory(){
   const ex=exercise(),r=record(ex);
   $('#wb-history-summary').textContent='Attempt history · '+r.totalAttempts;
   $('#wb-attempt-history').innerHTML=r.attempts.length?'<p class="wb-small">Showing the latest '+r.attempts.length+' of '+r.totalAttempts+' attempts. Up to '+retained+' per exercise are kept on this device; Export study backup includes retained attempts.</p>'+r.attempts.slice().reverse().map((attempt,i)=>'<details class="wb-attempt"><summary>Attempt '+(r.totalAttempts-i)+' · '+escape(attempt.status)+' · '+escape(new Date(attempt.at).toLocaleString())+(attempt.assisted?' · with help':'')+'</summary>'+(attempt.error?'<p>'+escape(attempt.error)+'</p>':'')+'<ul class="wb-check-results">'+resultRows(ex,attempt)+'</ul>'+fileBlocks(attempt.files)+'<button type="button" data-restore-attempt="'+escape(attempt.id)+'">Restore this attempt’s code</button></details>').join(''):'<p>No attempts yet. Run preview lets you experiment; Check exercise records a result.</p>';
  }
  function refresh(){
   const ex=exercise(),r=record(ex);
   $('#wb-exercise-panel').hidden=false;
   $('#wb-exercise-unavailable').hidden=true;
   $('#wb-exercise-title').textContent='Check your work';
   $('#wb-exercise-criteria').innerHTML=ex.checks.map(check=>'<li>'+escape(check.label)+'</li>').join('');
   $('#wb-exercise-hints').innerHTML=ex.hints.slice(0,r.hintsSeen).map((hint,i)=>'<p><strong>Hint '+(i+1)+':</strong> '+escape(hint)+'</p>').join('');
   $('#wb-exercise-hint').disabled=r.hintsSeen>=ex.hints.length;
   $('#wb-exercise-hint').textContent=r.hintsSeen>=ex.hints.length?'All hints shown':'Show hint '+(r.hintsSeen+1);
   $('#wb-solution-code').innerHTML=fileBlocks(ex.solution);
   $('#wb-visual-review').textContent=ex.visualReview+' This is your own review; it does not mark the automatic exercise as passed.';
   renderResult();renderHistory();
  }
  function cancel(message='Check cancelled. Your code is kept; check again when ready.'){
   revision++;
   if(busy){busy=false;options.preview.stop();options.finishCheck();notice=message;noticeError=false;renderResult();}
  }
  function projectChanged(){cancel('Code changed during the check. Check again to assess the new version.');notice='';noticeError=false;renderResult();}
  function selectLesson(){cancel();notice='';noticeError=false;$('#wb-exercise-solution').open=false;refresh();}
  async function check(){
   if(busy)return;
   const ex=exercise(),files=copy(options.getProject());
   if(['html','css','js'].reduce((n,file)=>n+files[file].length,0)>30000){notice='Keep the three files under 30,000 characters total for saved exercise checks. Run preview remains available for larger experiments.';noticeError=true;renderResult();return;}
   const own=++revision;busy=true;notice='Checking a fresh preview of your current code…';noticeError=false;renderResult();
   options.showPreview();
   let result;
   try{result=await options.preview.check(files,ex.id);}catch(error){result={status:'error',checks:[],error:error.message||'The check failed to start. Try again.'};}
   if(own!==revision)return;
   busy=false;options.finishCheck();
   if(result.status==='cancelled'){notice='Check cancelled. No attempt was recorded.';renderResult();return;}
   if(!same(files,options.getProject())||exercise().id!==ex.id){notice='Code changed during the check. Check again to assess the new version.';renderResult();return;}
   const r=record(ex),attempt={id:Date.now().toString(36)+'-'+Array.from(global.crypto.getRandomValues(new Uint8Array(8)),n=>n.toString(16).padStart(2,'0')).join(''),at:new Date().toISOString(),exerciseVersion:ex.version,status:result.status,checks:result.checks,files,assisted:r.hintsSeen>0||r.solutionViewed};
   if(result.error)attempt.error=result.error;
   r.attempts=[...r.attempts,attempt].slice(-retained);r.totalAttempts++;
   notice='';noticeError=false;
   if(!persist()){notice='This check finished, but the attempt could not be saved. Keep this page open and export a study backup from My notes.';noticeError=true;}
   refresh();options.onResult?.();
  }
  function replace(files,question){
   if(!global.confirm(question))return;
   cancel();options.replaceProject(copy(files));notice='Code loaded. Check exercise to assess it; previous results remain in history.';noticeError=false;
   persist();refresh();
  }
  function renderBank(){
   const pending=catalog.list.filter(unresolved),resolved=catalog.list.filter(ex=>record(ex).attempts.some(a=>a.status!=='passed')&&!unresolved(ex));
   $('#wb-mistakes-summary').textContent=pending.length?pending.length+' exercise'+(pending.length===1?' needs':'s need')+' another try. A passing check resolves it.':'No exercises waiting for retry. Failed checks will appear here automatically.';
   function card(ex,done){
    const attempt=last(ex),failed=attempt.checks.filter(check=>!check.passed).map(check=>ex.checks.find(detail=>detail.id===check.id)?.label||check.id);
    return '<article class="wb-mistake"><div><p class="wb-eyebrow">'+escape(ex.language.toUpperCase())+' · '+(done?'RESOLVED':'TO RETRY')+'</p><h3>'+escape(ex.title)+'</h3><p>'+escape(done?'Passed on the last checked code. New edits need a new check.':attempt.error||failed.join('; '))+'</p><p class="wb-small">'+record(ex).totalAttempts+' attempts · '+escape(new Date(attempt.at).toLocaleString())+'</p></div><button type="button" data-retry-exercise="'+ex.id+'">'+(done?'Practise again':'Retry current code')+'</button></article>';
   }
   $('#wb-mistakes-list').innerHTML=pending.map(ex=>card(ex,false)).join('');
   $('#wb-mistakes-resolved').innerHTML=resolved.length?'<h3>Resolved exercises</h3>'+resolved.map(ex=>card(ex,true)).join(''):'';
  }
  $('#wb-check-exercise').onclick=check;
  $('#wb-check-cancel').onclick=()=>cancel();
  $('#wb-exercise-hint').onclick=()=>{const r=record(exercise());r.hintsSeen=Math.min(exercise().hints.length,r.hintsSeen+1);persist();refresh();};
  $('#wb-exercise-solution').addEventListener('toggle',()=>{if($('#wb-exercise-solution').open){record(exercise()).solutionViewed=true;persist();}});
  $('#wb-exercise-starter').onclick=()=>replace(exercise().starter,'Load this exercise’s starter into all three files? Your current project code will be replaced. Notes, bookmarks, progress and attempt history will stay. Cancel to keep your code.');
  root.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.dataset.restoreAttempt){const attempt=record(exercise()).attempts.find(a=>a.id===button.dataset.restoreAttempt);if(attempt)replace(attempt.files,'Restore this attempt’s three code files? Your current project code will be replaced. Notes, bookmarks, progress and history will stay.');}
   if(button.dataset.retryExercise){const ex=catalog.get(button.dataset.retryExercise);if(ex){cancel();options.openExercise(ex.language);}}
  });
  return {snapshot:()=>copy(records),refresh,selectLesson,cancel,projectChanged,renderBank,summary:language=>{const a=last(catalog.byLanguage(language));return a?'Last exercise check: '+a.status:'Exercise not checked';}};
 }
 global.WebStudioPractice={mount};
})(window);
