/* Small, dependency-free XLSX writer for the five reviewed fictional D1 scenarios.
   No arbitrary formulas, files, URLs, account data or external requests. */
(function(global){
  'use strict';
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG='http://schemas.openxmlformats.org/package/2006/relationships';
  const CT='http://schemas.openxmlformats.org/package/2006/content-types';
  const XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const SUM='SUM(B2:B4)';
  const esc=value=>String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const cell=(value,style=0)=>({value,style});
  const number=v=>cell(v,2);
  function scenarioFor(id,version){
    const catalog=global.CommonplaceExcelScenarios;
    if(!catalog)throw Error('The scenario library is unavailable.');
    const s=catalog.list().find(x=>x.id===id&&x.version===version);
    if(!s)throw Error('Unknown tutorial example or version.');
    if(!/^[a-z0-9-]+$/.test(s.id)||s.values.length!==3||s.labels.length!==3||[...s.values,s.revised].some(v=>!Number.isSafeInteger(v)||Math.abs(v)>1e12))throw Error('Unsupported sample data.');
    return s;
  }
  function buildModel(id,version,kind){
    if(kind!=='practice'&&kind!=='solution')throw Error('Unknown workbook type.');
    const s=scenarioFor(id,version),done=kind==='solution';
    const total=values=>values.reduce((a,b)=>a+b,0);
    const instructionRows=[
      [cell('COMMONPLACE · EXCEL STUDY',1),cell(done?'COMPLETED SOLUTIONS':'PRACTICE WORKBOOK',1)],
      [cell('Professional context',7),cell(s.title,6)],
      [cell('Situation',7),cell(s.context,6)],
      [cell('How to use',7),cell(done?'Compare your independently completed workbook with these worked examples. The formulas and formatting are editable.':'Open the exercise tabs in Microsoft Excel. Save a copy before working; type or use Ribbon tools in the highlighted answer cells. The Format tab deliberately starts with a plain A1 heading.',6)],
      [cell('01 Sum',7),cell('Select B5. Use Home → Editing → AutoSum (Σ), then confirm the range B2:B4, or enter a SUM formula and press Enter.',6)],
      [cell('02 Revise',7),cell('Update B3 ('+s.labels[1]+') to '+s.revised+'. Keep B2 and B4 unchanged. Recalculate B5 with SUM.',6)],
      [cell('03 Copy',7),cell('Select B2. Use Home → Clipboard → Copy. Select B3 and use Paste. Keep B2 and B4 unchanged. Calculate B5 with SUM.',6)],
      [cell('04 Format',7),cell('Select A1 only. Use Home → Font → Bold, Fill Color (choose yellow), and Borders (choose All Borders). Keep the heading text unchanged.',6)],
      [cell('Units',7),cell(s.unit+' — the numbers are fictional practice values, not actual prices or exchange rates.',6)],
      [cell('Material version',7),cell(s.id+' · scenario '+s.version+' · tutorial 1',6)],
      [cell('Save / review',7),cell(done?'This is the separate answer file, not the file to submit.':'Save the finished practice file on your device. Download the separate solution after trying all four tasks. Commonplace does not collect changes made in Excel.',6)]
    ];
    function exercise(name,action){
      const values=s.values.slice();
      if(done&&action==='revise')values[1]=s.revised;
      if(done&&action==='copy')values[1]=values[0];
      const format=action==='format';
      const rows=[[cell(s.heading,format?(done?5:0):1),cell(s.quantity,format?0:1)],...s.labels.map((label,i)=>[cell(label),cell(values[i],!done&&i===1&&(action==='revise'||action==='copy')?3:2)])];
      if(!format)rows.push([cell('Total ('+s.unit+')',4),done?{value:total(values),style:4,formula:SUM}:cell(null,3)]);
      rows.push([], [cell('Task',7),cell(action==='sum'?'Calculate the total in B5.':action==='revise'?'Change B3 to '+s.revised+', then calculate B5.':action==='copy'?'Copy B2 into B3, then calculate B5.':'Make A1 bold, yellow and bordered without changing its text.',6)], [cell('Tool location',7),cell(action==='sum'||action==='revise'?'Home → Editing → AutoSum; confirm B2:B4.':action==='copy'?'Home → Clipboard → Copy / Paste; then Home → Editing → AutoSum.':'Home → Font → Bold / Fill Color / Borders.',6)]);
      return {name,rows,widths:[32,55],heights:rows.map((_,i)=>i===0?25:i>=rows.length-2?42:20)};
    }
    return {scenario:s,kind,filename:'Commonplace-Excel-'+s.id+'-v'+s.version+'-'+kind+'.xlsx',sheets:[
      {name:'Read me',rows:instructionRows,widths:[25,85],heights:[29,27,55,60,48,45,48,48,35,26,56]},
      exercise('01 Sum','sum'),exercise('02 Revise','revise'),exercise('03 Copy','copy'),exercise('04 Format','format')
    ]};
  }
  function sheetXml(sheet){
    const rows=sheet.rows.map((row,r)=>{
      const cells=row.map((c,i)=>{
        const address=String.fromCharCode(65+i)+(r+1),a=' r="'+address+'" s="'+c.style+'"';
        if(c.formula){if(c.formula!==SUM||typeof c.value!=='number')throw Error('Unexpected formula.');return '<c'+a+'><f>'+SUM+'</f><v>'+c.value+'</v></c>';}
        if(c.value===null)return '<c'+a+'/>';
        if(typeof c.value==='number'){if(!Number.isFinite(c.value))throw Error('Invalid numeric value.');return '<c'+a+'><v>'+c.value+'</v></c>';}
        return '<c'+a+' t="inlineStr"><is><t xml:space="preserve">'+esc(c.value)+'</t></is></c>';
      }).join('');
      return '<row r="'+(r+1)+'" ht="'+(sheet.heights[r]||20)+'" customHeight="1">'+cells+'</row>';
    }).join('');
    return XML+'<worksheet xmlns="'+NS+'"><sheetViews><sheetView workbookViewId="0" showGridLines="1"/></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>'+sheet.widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols><sheetData>'+rows+'</sheetData></worksheet>';
  }
  function stylesXml(unit){
    const numeric=unit==='PHP'?4:3;
    const xf=(font=0,fill=0,border=0,fmt=0,wrap=false)=>'<xf numFmtId="'+fmt+'" fontId="'+font+'" fillId="'+fill+'" borderId="'+border+'" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"'+(wrap?' applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>':'/>');
    const font=(color,bold=false)=>'<font>'+(bold?'<b/>':'')+'<sz val="11"/><color rgb="FF'+color+'"/><name val="Calibri"/><family val="2"/></font>';
    const fill=c=>'<fill><patternFill patternType="solid"><fgColor rgb="FF'+c+'"/><bgColor indexed="64"/></patternFill></fill>';
    const edge=e=>'<'+e+' style="thin"><color rgb="FF96B4A0"/></'+e+'>';
    return XML+'<styleSheet xmlns="'+NS+'"><fonts count="3">'+font('222222')+font('FFFFFF',true)+font('185C37',true)+'</fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'+fill('185C37')+fill('FFF2B3')+fill('E3F1E8')+'</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>'+['left','right','top','bottom'].map(edge).join('')+'<diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8">'+[xf(),xf(1,2,0,0,true),xf(0,0,0,numeric),xf(0,3,1,numeric),xf(2,4,1,numeric),xf(2,3,1,0),xf(0,0,0,0,true),xf(2,4,0,0,true)].join('')+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }
  function parts(model){
    const rel=(id,type,target)=>'<Relationship Id="'+id+'" Type="'+REL+'/'+type+'" Target="'+target+'"/>';
    const relationships=body=>XML+'<Relationships xmlns="'+PKG+'">'+body+'</Relationships>';
    const content=(path,type)=>'<Override PartName="/'+path+'" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.'+type+'+xml"/>';
    const entries=[
      ['[Content_Types].xml',XML+'<Types xmlns="'+CT+'"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+content('xl/workbook.xml','sheet.main')+content('xl/styles.xml','styles')+model.sheets.map((_,i)=>content('xl/worksheets/sheet'+(i+1)+'.xml','worksheet')).join('')+'</Types>'],
      ['_rels/.rels',relationships(rel('rId1','officeDocument','xl/workbook.xml'))],
      ['xl/workbook.xml',XML+'<workbook xmlns="'+NS+'" xmlns:r="'+REL+'"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'+model.sheets.map((s,i)=>'<sheet name="'+esc(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1"/></workbook>'],
      ['xl/_rels/workbook.xml.rels',relationships(model.sheets.map((_,i)=>rel('rId'+(i+1),'worksheet','worksheets/sheet'+(i+1)+'.xml')).join('')+rel('rId'+(model.sheets.length+1),'styles','styles.xml'))],
      ['xl/styles.xml',stylesXml(model.scenario.unit)]
    ];
    model.sheets.forEach((s,i)=>entries.push(['xl/worksheets/sheet'+(i+1)+'.xml',sheetXml(s)]));
    return entries;
  }
  const crcTable=Uint32Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=(n&1)?(0xedb88320^(n>>>1)):(n>>>1);return n>>>0;});
  function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
  function join(chunks){const bytes=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}return bytes;}
  // ZIP method 0 (stored), UTF-8 file names, fixed DOS date. Bounded, known parts only.
  function zip(entries){
    const encoder=new TextEncoder(),locals=[],directory=[];let offset=0,dirSize=0;
    const record=n=>{const bytes=new Uint8Array(n),view=new DataView(bytes.buffer);return {bytes,u16:(p,v)=>view.setUint16(p,v,true),u32:(p,v)=>view.setUint32(p,v,true)};};
    for(const [path,xml] of entries){
      const name=encoder.encode(path),data=encoder.encode(xml),crc=crc32(data);
      const local=record(30);local.u32(0,0x04034b50);local.u16(4,20);local.u16(6,0x800);local.u16(12,0x21);local.u32(14,crc);local.u32(18,data.length);local.u32(22,data.length);local.u16(26,name.length);
      const central=record(46);central.u32(0,0x02014b50);central.u16(4,20);central.u16(6,20);central.u16(8,0x800);central.u16(14,0x21);central.u32(16,crc);central.u32(20,data.length);central.u32(24,data.length);central.u16(28,name.length);central.u32(42,offset);
      locals.push(local.bytes,name,data);directory.push(central.bytes,name);
      offset+=30+name.length+data.length;dirSize+=46+name.length;
    }
    const end=record(22);end.u32(0,0x06054b50);end.u16(8,entries.length);end.u16(10,entries.length);end.u32(12,dirSize);end.u32(16,offset);
    return join([...locals,...directory,end.bytes]);
  }
  function createWorkbook(id,version,kind){
    const model=buildModel(id,version,kind);
    return {filename:model.filename,mime:MIME,bytes:zip(parts(model))};
  }
  function download(file){
    const url=URL.createObjectURL(new Blob([file.bytes],{type:file.mime}));
    const a=document.createElement('a');a.href=url;a.download=file.filename;
    document.body.append(a);
    try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  }
  function mount({panel,getScenario}){
    if(!panel||panel.dataset.tutorialMounted)return;
    const context=panel.querySelector('[data-tutorial-context]'),status=panel.querySelector('[data-tutorial-status]');
    const practice=panel.querySelector('[data-tutorial-practice]'),solution=panel.querySelector('[data-tutorial-solution]');
    if(!context||!status||!practice||!solution)return;
    panel.dataset.tutorialMounted='true';
    function refresh(){const s=getScenario();context.textContent='Current example: '+s.title+' · '+s.unit+' · 5 worksheets per file';status.textContent='';}
    function handle(kind){
      try{const s=getScenario(),file=createWorkbook(s.id,s.version,kind);download(file);status.textContent='Prepared '+file.filename+'. Open it from your browser downloads.';}
      catch(e){status.textContent='Could not prepare this workbook. '+(e.message||'Try again.');}
    }
    practice.addEventListener('click',()=>handle('practice'));solution.addEventListener('click',()=>handle('solution'));
    refresh();return {refresh};
  }
  global.CommonplaceExcelTutorials={buildModel,createWorkbook,mount};
})(window);
