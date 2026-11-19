/* Projects and scoped backup controls. Imported files are inspected before writes. */
(function(global){
 'use strict';
 const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 function mount(options){
  const root=options.root,$=selector=>root.querySelector(selector),manager=options.manager,store=options.store;
  if(!$('#wb-project-list')||!manager||!store.inspectBackup)return null;
  let inspected=null,plan=null,reading=0,imageRevision=0,applying=false;
  const recovery=()=>store.getImportRecovery();
  const pending=()=>!!recovery().pending;
  function status(message,error=false){const el=$('#wb-project-status');el.textContent=message;el.dataset.error=String(error);}
  function backupStatus(message,error=false){const el=$('#wb-backup-status');el.textContent=message;el.dataset.error=String(error);}
  function download(content,name,type){
   const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');
   link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function cancelReview(){
   if(applying||pending())return;
   reading++;imageRevision++;inspected=null;plan=null;options.setImportLock(false);
   $('#wb-backup-apply').disabled=true;$('#wb-backup-review').textContent='Choose a Web Studio study backup to inspect it. Nothing changes until you apply the reviewed import.';
   $('#wb-backup-file').value='';backupStatus('');
  }
  function summary(value){if(typeof value==='string')return value;return [(value.mode==='replace'?'After replacement:':'After merge:'),value.projects+' projects · '+value.lessonNotes+' lesson notes · '+value.legacyNotes+' course notes · '+value.attempts+' retained exercise attempts',value.projectsAdded?'New project copies: '+value.projectsAdded:'',value.notesAppended?'Notes combined: '+value.notesAppended:'',...(value.messages||[])].filter(Boolean).join('\n\n');}
  function review(){
   imageRevision++;plan=null;$('#wb-backup-apply').disabled=true;
   if(!inspected)return;
   const mode=$('#wb-backup-mode').value;
   const candidate=store.planImport(inspected,options.getSnapshot(),options.getLegacySnapshot(),mode);
   if(!candidate.ok){options.setImportLock(false);backupStatus(candidate.error,true);return;}
   plan=candidate;options.setImportLock(true);
   $('#wb-backup-review').textContent=summary(candidate.summary);
   $('#wb-backup-apply').disabled=false;
   backupStatus(mode==='merge'?'Reviewed merge. Existing conflicting code stays; imported projects are kept as separate copies.':'Reviewed replacement. Only this section’s study and course records will be replaced.');
  }
  function refresh(){
   const active=manager.active(),items=manager.list(),r=recovery();
   $('#wb-project-current').textContent=active.name;
   $('#wb-project-active').textContent='Editing: '+active.name;
   $('#wb-project-list').innerHTML=items.map(item=>'<article class="wb-project-card"><div><strong>'+escape(item.name)+'</strong><p class="wb-small">'+(item.id===active.id?'Current project':'Saved on this device')+'</p></div><button type="button" data-open-project="'+escape(item.id)+'"'+(item.id===active.id?' disabled':'')+'>Open</button></article>').join('');
   $('#wb-project-recovery').hidden=!r.pending;
   $('#wb-project-recovery-message').textContent=r.error||'A previous import did not finish. Your original records are retained. Recover them before continuing.';
   $('#wb-backup-recovery-export').hidden=!r.available;
   $('#wb-backup-recover').hidden=!r.pending;$('#wb-backup-keep-current').hidden=!r.pending;
   $('#wb-project-tools').disabled=r.pending;
   $('#wb-backup-file').disabled=r.pending;$('#wb-backup-mode').disabled=r.pending;
   $('#wb-project-list').querySelectorAll('button').forEach(button=>{if(r.pending)button.disabled=true;});
   if(r.pending){options.setImportLock(true);$('#wb-backup-apply').disabled=true;}
  }
  function commit(result,message){
   if(!result.ok){status(result.error,true);return false;}
   if(result.files)options.replaceProject(result.files);
   const ok=options.save();refresh();
   status(ok?message:'This change is only in this tab: saving failed. Export study backup before closing.',!ok);
   return ok;
  }
  const name=()=>$('#wb-project-name').value.trim();
  $('#wb-project-create').onclick=()=>{cancelReview();commit(manager.create(name(),$('#wb-project-template').value,options.getProject()),'Project created and saved on this device.');};
  $('#wb-project-duplicate').onclick=()=>{cancelReview();commit(manager.duplicate(name()||manager.active().name+' copy',options.getProject()),'Independent copy created. Your original project is kept.');};
  $('#wb-project-rename').onclick=()=>{cancelReview();commit(manager.rename(name()),'Project renamed.');};
  $('#wb-project-list').onclick=event=>{
   const button=event.target.closest('[data-open-project]');if(!button||pending())return;
   cancelReview();if(commit(manager.switchTo(button.dataset.openProject,options.getProject()),'Project opened. Your previous project’s code is kept.'))options.openPractice();
  };
  $('#wb-project-template').innerHTML=manager.templates().map(template=>'<option value="'+escape(template.id)+'">'+escape(template.name)+'</option>').join('');
  $('#wb-project-export').onclick=()=>{
   try{
    const files=options.getProject(),warnings=global.WebStudioProjects.exportWarnings(files);
    download(global.WebStudioProjects.exportWebsite(files,manager.active().name),global.WebStudioProjects.filename(manager.active().name),'text/html');
    status('Website file prepared. It contains this project’s HTML, CSS, JavaScript and embedded images only.'+(warnings.length?' '+warnings.join(' '):''));
   }catch(error){status(error.message,true);}
  };
  $('#wb-project-image').onchange=async event=>{
   const file=event.target.files[0];if(!file)return;
   cancelReview();const projectId=manager.active().id,ownImage=++imageRevision;
   try{
    if(file.size>65536)throw new Error('Choose a PNG, JPEG, GIF or WebP image under 64 KiB. Images are embedded in your HTML and backup.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const is=(at,values)=>values.every((value,i)=>bytes[at+i]===value);
    const mime=is(0,[137,80,78,71,13,10,26,10])?'image/png':is(0,[255,216,255])?'image/jpeg':is(0,[71,73,70,56])?'image/gif':is(0,[82,73,70,70])&&is(8,[87,69,66,80])?'image/webp':null;
    if(!mime)throw new Error('This file is not a supported PNG, JPEG, GIF or WebP image. SVG and other file types are not imported.');
    if(ownImage!==imageRevision||manager.active().id!==projectId)throw new Error('The active project changed while reading the image. Select the image again in the intended project.');
    const data='data:'+mime+';base64,'+btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
    const files=options.getProject(),label=escape(file.name.replace(/\.[^.]+$/,'').slice(0,80));
    files.html+='\n<img src="'+data+'" alt="'+label+'" style="max-width:100%;height:auto">\n';
    if(files.html.length>150000)throw new Error('Adding this image would exceed the 150,000-character HTML limit. Choose a smaller image.');
    options.replaceProject(files);const ok=options.save();refresh();
    status(ok?'Image inserted at the end of index.html. Edit its alt text, then Run preview.':'The image is only in this tab because saving failed. Export a study backup before closing.',!ok);
   }catch(error){status(error.message,true);}finally{event.target.value='';}
  };
  $('#wb-backup-export').onclick=options.exportStudy;
  $('#wb-backup-file').onchange=async event=>{
   const file=event.target.files[0];cancelReview();if(!file)return;
   const own=++reading;backupStatus('Reading and validating the backup…');
   try{
    if(file.size>12000000)throw new Error('This backup is larger than 12 MB. The original file has not been changed.');
    const text=await file.text();if(own!==reading)return;
    const result=store.inspectBackup(text);if(!result.ok)throw new Error(result.error);
    inspected=result;review();
   }catch(error){if(own===reading){backupStatus(error.message,true);options.setImportLock(false);}}
  };
  $('#wb-backup-mode').onchange=review;
  $('#wb-backup-cancel').onclick=cancelReview;
  $('#wb-backup-apply').onclick=()=>{
   if(!plan||applying||pending())return;
   if($('#wb-backup-mode').value==='replace'&&!global.confirm('Replace this section’s study and course records with the reviewed backup? Current notes, progress, exercises and projects in the supplied records will be replaced. A copy of the previous saved records will be retained for download. Other Commonplace sections and sign-in data stay unchanged.'))return;
   imageRevision++;applying=true;options.setImportLock(true);$('#wb-backup-apply').disabled=true;
   const result=store.applyImport(plan);
   if(result.ok){backupStatus('Import saved. Reopening Web Studio…');options.reload();return;}
   applying=false;plan=null;inspected=null;options.setImportLock(!!result.recoveryPending);
   backupStatus(result.error,true);refresh();
  };
  $('#wb-backup-recovery-export').onclick=()=>{
   const r=recovery();if(!r.available||!r.records)return;
   download(JSON.stringify({format:'commonplace-web-studio-backup',version:1,exportedAt:new Date().toISOString(),records:r.records},null,2),'web-studio-before-import.json','application/json');
  };
  $('#wb-backup-recover').onclick=()=>{
   applying=true;options.setImportLock(true);const result=store.recoverImport();
   if(result.ok){options.reload();return;}
   applying=false;backupStatus(result.error,true);refresh();
  };
  $('#wb-backup-keep-current').onclick=()=>{
   if(!global.confirm('Continue with the records currently saved on this device? This keeps any newer work from another tab and does not restore the before-import copy. That copy stays available to download.'))return;
   applying=true;options.setImportLock(true);const result=store.keepCurrentImport();
   if(result.ok){options.reload();return;}
   applying=false;backupStatus(result.error,true);refresh();
  };
  refresh();
  return {refresh,leave:cancelReview,recoveryPending:pending,isApplying:()=>applying};
 }
 global.WebStudioProjectUI={mount};
})(window);
