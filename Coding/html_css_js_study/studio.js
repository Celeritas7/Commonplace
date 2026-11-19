
(()=>{
 'use strict';
 const root=document.getElementById('web-book');
 const $=s=>root.querySelector(s),all=s=>root.querySelectorAll(s);
 const {names,fileNames,chapters,initialProject}=window.WebStudioLessons;
 const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const loaded=window.WebStudioStore.load(),saved=loaded.data||{};
 const lessonIds={html:'html-elements',css:'css-spacing',js:'js-events'};
 const project={...initialProject,...saved.project};
 const state=Object.fromEntries(Object.entries(chapters).map(([key])=>{
  const old=(saved.lessons||{})[lessonIds[key]]||{};
  return [key,{part:0,file:key,note:'',answers:Array(5).fill(null),question:0,submitted:false,practised:false,read:false,prediction:null,...old,file:key,source:project,bookmarks:new Set(old.bookmarks||[]),visited:new Set([old.part||0])}];
 }));
 let practice=null,projectUI=null,importLocked=false,cloud=null,saveError=loaded.error;
 const projectManager=window.WebStudioProjects?.create(saved,initialProject);
 if(projectManager)Object.assign(project,projectManager.active().files);
 let language=saved.language||'html',view='book',textSize=saved.textSize||18,practiceOrigin=0,returnScroll=0,hasPreview=false,returnButton=null;
 const legacy=document.getElementById('legacy-course');
 const backToStudio=document.getElementById('return-studio');
 const topBack=document.getElementById('web-return-book');
 const siteNav=document.getElementById('web-site-nav');
 function focusContent(element){
  if(!element)return;
  element.tabIndex=-1;
  element.focus({preventScroll:true});
  element.scrollIntoView({block:'start',behavior:'auto'});
 }
 function focusView(){focusContent(view==='book'?$('#wb-title'):root.querySelector('[data-screen="'+view+'"] h2'));}
 function compactLayout(){return root.getBoundingClientRect().width<900;}
 function focusPart(){focusContent(current().part===8?$('#wb-finish-title'):$('#wb-part-title'));}
 function snapshot(){
  const lessons={...(saved.lessons||{})};
  for(const [key,s]of Object.entries(state))lessons[lessonIds[key]]={...(lessons[lessonIds[key]]||{}),part:s.part,note:s.note,bookmarks:[...s.bookmarks],answers:s.answers.slice(),question:s.question,submitted:s.submitted,practised:s.practised,read:s.read,prediction:s.prediction};
  return {...saved,version:1,language,view,textSize,project:{...project},lessons,...(practice?{exercises:practice.snapshot()}:{} ),...(projectManager?{projects:projectManager.snapshot(project)}:{})};
 }
 function saveStatus(error){saveError=error;const el=$('#wb-save-status');el.textContent=error||'Saved on this device';el.dataset.error=String(!!error);el.setAttribute('role',error?'alert':'status');}
 function persist(){if(importLocked)return false;try{const result=window.WebStudioStore.save(snapshot());saveStatus(result.ok?null:result.error);if(result.ok)window.dispatchEvent(new Event('web-studio-saved'));return result.ok;}catch(error){saveStatus(error.message||'Saving failed. Export your study backup before closing.');return false;}}
 function exportStudy(){
  const backup=window.WebStudioStore.exportData();backup.currentDraft=snapshot();backup.currentLegacyDraft=window.WebStudioLegacy?.snapshot?.()||null;
  const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='commonplace-web-studio-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const current=()=>state[language];
 function setText(id,value){const el=$(id);if(el)el.textContent=value;}
 function updateReadingState(){const s=current();setText('#wb-side-state',s.read?'✓ Lesson marked read':'Lesson not marked read');setText('#wb-read-state',s.read?'Marked read':'Foundation lesson');setText('#wb-bookmark-label',s.bookmarks.has(s.part)?'Bookmarked':'Bookmark');$('#wb-bookmark').setAttribute('aria-pressed',String(s.bookmarks.has(s.part)));setText('#wb-mark-read',s.read?'✓ Marked read':'Mark lesson read');$('#wb-mark-read').setAttribute('aria-pressed',String(s.read));setText('#wb-mark-note',s.read?'Lesson marked read. Check the save status above.':'You may mark it read before passing the check.');setText('#wb-practice-state',s.practised?'✓ You marked the practice as tested.':'Make a change and inspect the browser result.');$('#wb-practice-confirm').checked=s.practised;}
 function renderSources(c){
  const detail=$('#wb-source-detail');if(!detail)return;
  detail.innerHTML='<p>'+escape(c.sourceNote||'Original Commonplace sample lesson; full course content is not loaded.')+'</p>'+(c.sources||[]).map(source=>'<p><a href="'+escape(source.url)+'" target="_blank" rel="noopener noreferrer">'+escape(source.label)+'</a></p>').join('')+'<p>Reference links open online. The explanations and practice on this page are included in the app.</p>';
 }
 function renderReading(){const s=current(),c=chapters[language];renderSources(c);root.dataset.language=language;setText('#wb-contents-current',s.part===8?'Final check':(s.part+1)+' / 8 · '+names[s.part]);setText('#wb-chapter-label',c.label);setText('#wb-title',c.title);setText('#wb-objective',c.objective);all('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===language)));all('[data-part]').forEach(b=>{const p=Number(b.dataset.part);if(p===s.part)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.classList.toggle('wb-visited',s.visited.has(p));});$('#wb-reading-part').hidden=s.part===8;$('#wb-finish').hidden=s.part!==8;if(s.part<8){setText('#wb-part-label',String(s.part+1).padStart(2,'0')+' / 08');setText('#wb-part-title',names[s.part]);$('#wb-prose').innerHTML=c.parts[s.part]+(s.part===4?'<div class="wb-predict-options" aria-label="Your prediction">'+c.prediction.options.map((o,i)=>'<button class="cursor-interaction" data-prediction="'+i+'" aria-pressed="'+(s.prediction===i)+'">'+escape(o)+'</button>').join('')+'</div><p class="wb-feedback" id="wb-prediction-feedback" aria-live="polite"></p>':'');if(s.part===4&&s.prediction!==null)renderPrediction();}else renderQuiz();$('#wb-prev').disabled=s.part===0;$('#wb-next').hidden=s.part===8;setText('#wb-next',s.part===7?'Before you go →':names[s.part+1]+' →');setText('#wb-page-count',s.part===8?'Before you go':'Part '+(s.part+1)+' of 8');setText('#wb-next-chapter',language==='html'?'Next: CSS →':language==='css'?'Next: JavaScript →':'Chapter library →');updateReadingState();}
 function setView(next){
  if(projectUI?.recoveryPending())next='projects';
  if(next!=='projects')projectUI?.leave();
  if(next!=='practice')practice?.cancel();
  if(next==='course'){showCourse(true);return;}
  view=next;legacy.hidden=true;backToStudio.hidden=true;if(topBack)topBack.hidden=true;root.hidden=false;$('#wb-contents').hidden=next!=='book';root.dataset.view=next;
  document.body.dataset.webView='book';document.getElementById('legacy-export').hidden=true;
  all('[data-screen]').forEach(e=>e.hidden=e.dataset.screen!==next);all('.wb-app-tabs [data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===next||(['mistakes','projects'].includes(next)&&b.dataset.view==='practice'))));
  if(next==='notes')renderNotes();if(next==='library')renderLibrary();if(next==='mistakes')practice?.renderBank();if(next==='projects')projectUI?.refresh();
 }
 function showCourse(manual=false){if(projectUI?.recoveryPending()){setView('projects');return;}projectUI?.leave();view='course';stopPreview();root.hidden=true;legacy.hidden=false;backToStudio.hidden=false;if(topBack)topBack.hidden=false;document.body.dataset.webView='course';document.getElementById('legacy-export').hidden=false;window.WebStudioLegacy?.activate?.();const id=location.hash.slice(1);if(!manual&&/^[lxq]\d+$/.test(id))window.WebStudioLegacy?.reveal(id);if(manual){window.scrollTo({top:0,behavior:'auto'});topBack?.focus({preventScroll:true});}window.dispatchEvent(new Event('resize'));}
 function setPart(part){current().part=Math.max(0,Math.min(8,part));current().visited.add(current().part);renderReading();setView('book');if(root.getBoundingClientRect().width<830)$('#wb-contents').open=false;focusPart();}
 function selectLanguage(key){if(projectUI?.recoveryPending()||!chapters[key])return;stopPreview();language=key;renderReading();setView('book');focusView();}
 function renderPrediction(){const s=current(),p=chapters[language].prediction;if(s.prediction===null)return;setText('#wb-prediction-feedback',s.prediction===p.answer?p.correct:p.wrong);all('[data-prediction]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.prediction)===s.prediction)));}
 function renderQuiz(){const s=current(),c=chapters[language];$('#wb-quiz-question').hidden=s.submitted;$('#wb-quiz-result').hidden=!s.submitted;const score=s.answers.reduce((n,a,i)=>n+(a===c.quiz[i].correct?1:0),0);setText('#wb-check-state',s.submitted?(score>=4?'✓ Check passed · '+score+' / 5':'Keep practising · '+score+' / 5 · aim for 4 / 5'):'Aim for 4 / 5. You can retry after reviewing.');if(s.submitted){setText('#wb-quiz-score',score+' / 5');setText('#wb-quiz-summary',score>=4?'Check passed. Review any missed answer, then finish your practice.':'Review the explanations and try again. Your lesson reading mark is independent.');$('#wb-answer-review').innerHTML=c.quiz.map((q,i)=>'<div class="wb-answer-review"><strong>'+((s.answers[i]===q.correct)?'✓ ':'↺ ')+escape(q.q)+'</strong><p>Answer: '+escape(q.a[q.correct])+'. '+escape(q.why)+'</p></div>').join('');return;}const q=c.quiz[s.question];setText('#wb-quiz-count','Question '+(s.question+1)+' of 5');setText('#wb-quiz-title',q.q);$('#wb-quiz-options').innerHTML=q.a.map((a,i)=>'<label class="wb-quiz-option cursor-interaction"><input type="radio" name="wb-answer" value="'+i+'"'+(s.answers[s.question]===i?' checked':'')+'><span>'+escape(a)+'</span></label>').join('');$('#wb-quiz-dots').innerHTML=s.answers.map(a=>'<span class="wb-question-dot'+(a!==null?' answered':'')+'" aria-hidden="true"></span>').join('');$('#wb-quiz-dots').setAttribute('aria-label',s.answers.filter(a=>a!==null).length+' of 5 questions answered');$('#wb-quiz-prev').disabled=s.question===0;setText('#wb-quiz-next',s.question===4?'Check answers':'Next question →');setText('#wb-quiz-feedback','');}
 function quizNext(){const s=current();if(s.answers[s.question]===null){setText('#wb-quiz-feedback','Choose an answer before continuing.');return;}if(s.question<4)s.question++;else{const missing=s.answers.indexOf(null);if(missing!==-1)s.question=missing;else s.submitted=true;}renderQuiz();}
 function renderNotes(){const c=chapters[language];setText('#wb-note-context',c.name+' · '+c.title);$('#wb-note-editor').value=current().note;const saved=[];for(const [key,s]of Object.entries(state))for(const p of [...s.bookmarks].sort((a,b)=>a-b))saved.push('<button class="cursor-interaction" data-bookmark-language="'+key+'" data-bookmark-part="'+p+'"><span>'+escape(chapters[key].name+' · '+names[p])+'</span><span aria-hidden="true">→</span></button>');$('#wb-bookmarks-list').innerHTML=saved.length?saved.join(''):'<p class="wb-small" style="margin-top:12px">Bookmark a reading part to return directly to it.</p>';}
 function renderLibrary(){
  $('#wb-library-list').innerHTML=Object.entries(chapters).map(([key,c])=>{
   const s=state[key],score=s.answers.reduce((n,a,i)=>n+(a===c.quiz[i].correct?1:0),0);
   const check=s.submitted?(score>=4?'Check passed':'Check to retry')+' · '+score+' / 5':'Check not taken';
   return '<div class="wb-library-entry"><div><span class="wb-eyebrow">'+escape(c.name)+'</span><h3>'+escape(c.sampleTitle||c.title)+'</h3><p>'+escape(c.objective)+'</p><p class="wb-small">'+(s.read?'Reading marked done':'Reading not marked done')+' · '+check+' · '+(s.practised?'Practice marked tested':'Practice not marked tested')+'</p><p class="wb-small">Saved place: '+escape(names[s.part])+'</p>'+(practice?'<p class="wb-small">'+escape(practice.summary(key))+'</p>':'')+'</div><button class="cursor-interaction" data-language="'+key+'">'+(s.part>0?'Continue lesson':'Open lesson')+'</button></div>';
  }).join('');
 }
 function renderEditor(){const s=current();$('#wb-editor').value=project[s.file];for(const file of Object.keys(fileNames))$('#wb-editor-'+file).value=project[file];setText('#wb-editor-label','Edit '+fileNames[s.file]);all('[data-file]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.file===s.file)));setText('#wb-editor-state',(projectManager?projectManager.active().name:'One shared project')+' · '+fileNames[s.file]);setText('#wb-project-current',projectManager?projectManager.active().name:'Study project');}
 function openPractice(kind,restoring=false){practiceOrigin=current().part;returnScroll=window.scrollY;returnButton=document.activeElement;const c=chapters[language],challenge=kind==='challenge'||practiceOrigin===6;setText('#wb-return-label','Return to '+names[practiceOrigin]);setText('#wb-practice-title','My first webpage');setText('#wb-task-title',challenge?c.challengeTitle:c.taskTitle);setText('#wb-task-detail',challenge?c.challengeText:c.taskText);current().file=language;if(practice){const ex=window.WebStudioExercises.byLanguage(language);setText('#wb-task-title',ex.title);setText('#wb-task-detail',ex.goal);practice.selectLesson();}renderEditor();$('#wb-practice-confirm').checked=current().practised;setView('practice');setPane('code');const term=language==='html'?'<h1>':language==='css'?'padding':'count += ';const index=$('#wb-editor').value.indexOf(term);if(index>=0)$('#wb-editor').setSelectionRange(index,index+term.length);if(!restoring){if(compactLayout())focusContent($('#wb-practice-title'));else $('#wb-editor').focus({preventScroll:true});}}
 function returnToBook(){current().part=practiceOrigin;renderReading();setView('book');window.scrollTo({top:returnScroll,behavior:'auto'});if(returnButton?.isConnected)returnButton.focus({preventScroll:true});else $('#wb-next').focus({preventScroll:true});}
 function setPane(pane){$('#wb-work-grid').dataset.pane=pane;all('button[data-pane]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pane===pane)));}
 function runStatus(text,error=false){setText('#wb-run-status',text);$('#wb-run-status').dataset.error=String(error);}
 const preview=window.WebStudioPreview.create({container:$('#wb-preview-host'),onStatus:runStatus,onLog(message){const output=$('#wb-console');output.textContent=(output.textContent+'\n'+message).trim().slice(-6000);}});
 practice=window.WebStudioPractice?.mount({root,records:saved.exercises,preview,getLanguage:()=>language,getProject:()=>({...project}),save:persist,
  replaceProject(files){Object.assign(project,files);renderEditor();stopPreview();},
  showPreview(){$('#wb-console').textContent='';$('#wb-preview-empty').hidden=true;hasPreview=true;setPane('result');},
  finishCheck(){$('#wb-preview-empty').hidden=false;hasPreview=false;setPane('code');},
  openExercise(key){selectLanguage(key);openPractice('challenge');persist();},onResult:updateReadingState
 });
 projectUI=window.WebStudioProjectUI?.mount({root,manager:projectManager,store:window.WebStudioStore,
  getProject:()=>({...project}),getSnapshot:snapshot,getLegacySnapshot:()=>window.WebStudioLegacy?.snapshot?.()||null,save:persist,exportStudy,
  replaceProject(files){stopPreview();for(const key of Object.keys(project))delete project[key];Object.assign(project,files);renderEditor();practice?.projectChanged();},
  openPractice(){openPractice('try');persist();},setImportLock(value){importLocked=value;window.WebStudioCloudLocked=value;},reload(){location.reload();}
 });
 function stopPreview(){practice?.cancel();preview.stop();hasPreview=false;$('#wb-preview-empty').hidden=false;setPane('code');}
 function runPreview(){practice?.cancel();persist();$('#wb-console').textContent='';$('#wb-preview-empty').hidden=true;hasPreview=true;preview.run({...project});setPane('result');}
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!root.contains(b)||b.disabled)return;if(b.dataset.language){selectLanguage(b.dataset.language);return;}if(b.dataset.part!==undefined){setPart(Number(b.dataset.part));return;}if(b.dataset.view){if(b.dataset.view==='practice')openPractice('try');else if(b.dataset.view==='book'&&view==='practice')returnToBook();else {setView(b.dataset.view);if(b.dataset.view!=='course')focusView();}return;}if(b.dataset.openPractice){openPractice(b.dataset.openPractice);return;}if(b.dataset.prediction!==undefined){current().prediction=Number(b.dataset.prediction);renderPrediction();return;}if(b.dataset.file){current().file=b.dataset.file;renderEditor();return;}if(b.dataset.pane){setPane(b.dataset.pane);return;}if(b.dataset.bookmarkLanguage){selectLanguage(b.dataset.bookmarkLanguage);setPart(Number(b.dataset.bookmarkPart));}});
 $('#wb-prev').onclick=()=>setPart(current().part-1);$('#wb-next').onclick=()=>setPart(current().part+1);
 $('#wb-bookmark').onclick=()=>{const s=current();if(s.bookmarks.has(s.part))s.bookmarks.delete(s.part);else s.bookmarks.add(s.part);updateReadingState();};
 function resizeText(delta){textSize=Math.min(22,Math.max(16,textSize+delta));root.style.setProperty('--wb-reader',textSize+'px');$('#wb-font-smaller').disabled=textSize===16;$('#wb-font-larger').disabled=textSize===22;}
 $('#wb-font-smaller').onclick=()=>resizeText(-2);$('#wb-font-larger').onclick=()=>resizeText(2);
 $('#wb-quiz-options').onchange=e=>{if(e.target.name==='wb-answer'){current().answers[current().question]=Number(e.target.value);setText('#wb-quiz-feedback','Answer selected.');}};
 $('#wb-quiz-next').onclick=quizNext;$('#wb-quiz-prev').onclick=()=>{current().question=Math.max(0,current().question-1);renderQuiz();};$('#wb-quiz-retry').onclick=()=>{current().answers=Array(5).fill(null);current().question=0;current().submitted=false;renderQuiz();};
 $('#wb-mark-read').onclick=()=>{current().read=!current().read;updateReadingState();};$('#wb-next-chapter').onclick=()=>{if(language==='html')selectLanguage('css');else if(language==='css')selectLanguage('js');else setView('library');};
 $('#wb-editor').oninput=e=>{current().source[current().file]=e.target.value;$('#wb-editor-'+current().file).value=e.target.value;setText('#wb-editor-state','Edited in this session');practice?.projectChanged();if(hasPreview)runStatus('Code changed. Run preview to see the latest edit.');};
 $('#wb-run').onclick=runPreview;$('#wb-reset').onclick=()=>{if(!confirm('Restore all three starter files? Your notes, bookmarks and reading progress will stay.'))return;Object.assign(project,initialProject);renderEditor();stopPreview();practice?.projectChanged();};$('#wb-return').onclick=returnToBook;$('#wb-return-bottom').onclick=returnToBook;
 $('#wb-practice-confirm').onchange=e=>{current().practised=e.target.checked;updateReadingState();};
 $('#wb-note-editor').oninput=e=>{current().note=e.target.value;setText('#wb-note-state','Note updated. Check the save status above.');};
 const offline=show=>{$('#wb-offline').hidden=!show;$('#wb-offline-toggle').setAttribute('aria-expanded',String(show));};$('#wb-offline-toggle').onclick=()=>offline($('#wb-offline').hidden);$('#wb-offline-close').onclick=()=>offline(false);
 if(root.getBoundingClientRect().width<830)$('#wb-contents').open=false;
 $('#wb-stop').onclick=stopPreview;
 $('#wb-export').onclick=exportStudy;document.getElementById('legacy-export').onclick=exportStudy;
 $('#wb-show-course').onclick=()=>showCourse(true);
 $('#wb-split').onclick=()=>{renderEditor();const split=$('#wb-work-grid').dataset.layout!=='split';$('#wb-work-grid').dataset.layout=split?'split':'tabs';$('#wb-split').setAttribute('aria-pressed',String(split));};
 for(const file of Object.keys(fileNames))$('#wb-editor-'+file).oninput=e=>{project[file]=e.target.value;if(current().file===file)$('#wb-editor').value=e.target.value;practice?.projectChanged();if(hasPreview)runStatus('Code changed. Run preview to see the latest edit.');};
 backToStudio.onclick=()=>{setView('book');persist();focusView();};
 if(topBack)topBack.onclick=backToStudio.onclick;
 // Parent links work under /Commonplace/ and on a root-hosted copy. Save first
 // so leaving via a folder link has the same persistence as editing in place.
 siteNav?.addEventListener('click',event=>{
  if(!event.target.closest('a'))return;
  if(projectUI?.isApplying()){event.preventDefault();return;}projectUI?.leave();
  const savedNow=persist();
  const legacyError=document.getElementById('legacy-save-status').textContent.trim();
  if((!savedNow||legacyError)&&!confirm('Some study changes could not be saved. Leave anyway? Choose Cancel to stay and export a study backup.'))event.preventDefault();
 });
 for(const eventName of ['click','input','change'])root.addEventListener(eventName,event=>{if(!event.target.closest('.wb-sync-details'))persist();});
 window.addEventListener('pagehide',()=>{persist();preview.stop();});
 window.addEventListener('hashchange',()=>{if(/^#(?:[lxq]\d+|cpx-resume)/.test(location.hash))showCourse();});
 $('#wb-update').onclick=async()=>{const button=$('#wb-update');button.disabled=true;setText('#wb-update-status','Checking for updates…');try{if(!('serviceWorker' in navigator))throw new Error('App updates are not supported in this browser.');const registration=await Promise.race([navigator.serviceWorker.getRegistration('./'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Update check timed out. Try again while connected.')),10000))]);if(!registration)throw new Error('App update registration is not ready. Reload while connected and try again.');await Promise.race([registration.update(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Update check timed out. Try again while connected.')),10000))]);setText('#wb-update-status','Update check finished. If new files are ready, use Reload app.');$('#wb-reload').hidden=false;}catch(error){setText('#wb-update-status',error.message);}finally{button.disabled=false;}};
 $('#wb-reload').onclick=()=>{if(persist())location.reload();};
 if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('controllerchange',()=>{setText('#wb-update-status','Updated app files are available. Reload when you are ready.');$('#wb-reload').hidden=false;});
 renderReading();renderEditor();resizeText(0);
 if(saved.view==='practice')openPractice('try',true);else if(['notes','library',...(practice?['mistakes']:[]),...(projectUI?['projects']:[])].includes(saved.view))setView(saved.view);else setView('book');
 if(/^#(?:[lxq]\d+|cpx-resume)/.test(location.hash)||saved.view==='course')showCourse();
 if(projectUI?.recoveryPending()){setView('projects');all('.wb-language-tabs button,.wb-app-tabs button,[data-screen=projects] [data-view]').forEach(button=>button.disabled=true);}
 saveStatus(loaded.error);
 function cloudSnapshot(){
  if(importLocked||saveError)throw new Error(saveError||'Finish the backup review or recovery before syncing.');
  const recovery=window.WebStudioStore.getImportRecovery();if(recovery.pending||recovery.error)throw new Error(recovery.error||'Recover the interrupted import before syncing.');
  const legacyStatus=document.getElementById('legacy-save-status');if(legacyStatus.dataset.error==='true')throw new Error(legacyStatus.textContent);
  const exported=window.WebStudioStore.exportData();if(exported.error)throw new Error(exported.error);
  return {version:1,study:JSON.parse(exported.records.commonplace_web_studio_v1||'null'),legacy:JSON.parse(exported.records.commonplace_wdb_v1||'null')};
 }
 cloud=window.WebStudioCloud?.mount({root,readLocal:cloudSnapshot,isLocked:()=>importLocked,
  flush(){try{cloudSnapshot();return true;}catch(error){saveStatus(error.message);return false;}},
  applyLocal(incoming,captured){
   if(!window.WebStudioSyncMerge.equal(cloudSnapshot(),captured))throw new Error('Study data changed while syncing. Nothing was replaced. Retry sync.');
   const inspected=window.WebStudioStore.inspectBackup(JSON.stringify({format:'commonplace-web-studio-backup',version:1,exportedAt:new Date().toISOString(),records:{commonplace_web_studio_v1:incoming.study===null?null:JSON.stringify(incoming.study),commonplace_wdb_v1:incoming.legacy===null?null:JSON.stringify(incoming.legacy)}}));
   if((incoming.study===null&&captured.study!==null)||(incoming.legacy===null&&captured.legacy!==null))throw new Error('The account snapshot is missing a saved study record. Your existing work was kept. Export a backup before reviewing this change.');
   const plan=window.WebStudioStore.planImport(inspected,captured.study,captured.legacy,'replace');
   if(!plan.ok)throw new Error(plan.error);
   importLocked=true;window.WebStudioCloudLocked=true;stopPreview();
   const result=window.WebStudioStore.applyImport(plan);
   if(!result.ok){importLocked=!!result.recoveryPending;window.WebStudioCloudLocked=importLocked;throw new Error(result.error);}
   root.inert=true;legacy.inert=true;siteNav.inert=true;backToStudio.disabled=true;if(topBack)topBack.disabled=true;
   return cloudSnapshotAfterApply();
  },reload(){location.reload();}
 });
 if(!cloud){const status=$('#wb-sync-status'),button=$('#wb-sync-now');if(status){status.dataset.state='error';status.textContent='Account sync files could not load. Local saving is available. Reconnect and reload to retry.';}if(button){button.textContent='Reload sync files';button.onclick=()=>{if(!saveError)location.reload();};}}
 function cloudSnapshotAfterApply(){const record=window.WebStudioStore.exportData().records;return {version:1,study:JSON.parse(record.commonplace_web_studio_v1||'null'),legacy:JSON.parse(record.commonplace_wdb_v1||'null')};}

})();
