/* F4D workbook panel: selected example only, never current practice data. */
(function(){
  'use strict';
  const panel=document.querySelector('[data-f4-workbooks]');
  if(!panel)return;
  const $=id=>panel.querySelector('#f4-'+id);
  const selector=document.querySelector(panel.dataset.scenarioSelector);
  const library=window.CommonplaceExcelTutorials;
  const scenarios=window.CommonplaceExcelScenarios.list();
  function selected(){
    const scenario=scenarios.find(s=>s.id===selector.value);
    if(!scenario)throw Error('Choose a supported professional example.');
    return scenario;
  }
  function refresh(){
    $('download-status').textContent='';
    try{
      const s=selected(),context=library.f4WorkbookContext(s.id,s.version);
      $('workbook-context').textContent=context.title;
      $('workbook-units').textContent='IF: '+context.units[0]+' · Conditional formatting: '+context.units[1]+' · XLOOKUP: '+context.units[2]+' · VLOOKUP: '+context.units[3];
      $('download').disabled=$('solution').disabled=false;
    }catch(error){
      $('workbook-context').textContent='Example unavailable';
      $('workbook-units').textContent='';
      $('download').disabled=$('solution').disabled=true;
      $('download-status').textContent=error.message;
    }
  }
  function download(kind){
    try{
      const s=selected(),file=library.createF4Workbook(s.id,s.version,kind);
      const url=URL.createObjectURL(new Blob([file.bytes],{type:file.mime}));
      const link=document.createElement('a');
      link.href=url;link.download=file.filename;document.body.append(link);
      try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
      $('download-status').textContent='Prepared '+file.filename+'. Open it from your browser downloads.';
    }catch(error){$('download-status').textContent='Workbook could not be prepared. '+error.message;}
  }
  selector.addEventListener('change',refresh);
  $('download').addEventListener('click',()=>download('practice'));
  $('solution').addEventListener('click',()=>download('solution'));
  refresh();
})();
