/* Local-only practice snapshot and annotations. Never writes to cloud tables. */
(function(){
  const note=document.getElementById('offline-practice-status');
  const save=document.getElementById('offline-save-problems');
  function userId(){
    if(window.currentUser)return currentUser.id;
    try {return JSON.parse(localStorage.getItem('sb-wylxvmkcrexwfpjpbhyy-auth-token')||'null')?.user?.id||'';}catch(_){return '';}
  }
  window.cppSavedProblems=function(){
    const id=userId(); if(!id)return [];
    try{return JSON.parse(localStorage.getItem('cpp.offline.problems.'+id)||'null')?.rows||[];}catch(_){return [];}
  };
  if(save)save.onclick=function(){
    try{
      const id=userId();
      if(!id)throw new Error('Sign in online and load your problems first.');
      if(!window.cppProblemsFresh)throw new Error('Refresh your problems online first; an older snapshot will not be overwritten.');
      localStorage.setItem('cpp.offline.problems.'+id,JSON.stringify({savedAt:new Date().toISOString(),rows:window.exercises||[]}));
      note.textContent='Saved '+exercises.length+' problems on this device. Drafts stay local; Run and grading still need internet.';
    }catch(e){note.textContent='Could not save problems: '+e.message;}
  };
  function connectivity(){
    if(note)note.textContent=navigator.onLine?'Editing works offline. Load your account problems online, then save a copy here.':'Offline: write code and use saved problems. Run requires internet. Drafts are device-only.';
    if(!navigator.onLine&&window.loadExercises)loadExercises();
  }
  addEventListener('online',connectivity);addEventListener('offline',connectivity);
  connectivity();
  // Flush the app’s existing per-item drafts on iPad background/close.
  addEventListener('pagehide',()=>{if(window.__draftFlush)__draftFlush();});
})();
