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
  const FORMULAS=new Set(['SUM','AVERAGE','COUNT','MIN','MAX'].map(fn=>fn+'(B2:B4)'));
  // F2 permits only these reviewed formulas at their reviewed worksheet addresses.
  // This separate path does not broaden the D2/F1 formula allowlist.
  const REFERENCE_FORMULAS={
    'relative-line-totals':{D3:'B3*C3',D4:'B4*C4',D5:'B5*C5'},
    'absolute-rate':{C3:'B3*$F$2',C4:'B4*$F$2',C5:'B5*$F$2'},
    'mixed-quotation':{C3:'$B3*C$2',D3:'$B3*D$2',C4:'$B4*C$2',D4:'$B4*D$2'},
    'relative-unit-cost':{D3:'B3/C3',D4:'B4/C4',D5:'B5/C5'}
  };
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
  function buildFormulaModel(id,version,kind){
    if(kind!=='practice'&&kind!=='solution')throw Error('Unknown workbook type.');
    const s=scenarioFor(id,version),done=kind==='solution',engine=global.CommonplaceExcelFormulaFoundations;
    if(!engine)throw Error('Formula lesson library is unavailable.');
    const lessons=engine.list();
    const readme=[
      [cell('COMMONPLACE · ESSENTIAL FORMULAS',1),cell(done?'COMPLETED SOLUTIONS':'INDEPENDENT PRACTICE',1)],
      [cell('Context',7),cell(s.title,6)],
      [cell('Situation',7),cell(s.context,6)],
      [cell('Instructions',7),cell('Use the appropriate function in B5 for each sheet. Leave starting input cells unchanged. AVERAGE and COUNT include one intentional blank; a blank is not zero.',6)],
      ...lessons.map((l,i)=>[cell(String(i+1).padStart(2,'0')+' '+l.fn,7),cell(l.concept,6)]),
      [cell('Material version',7),cell(s.id+' · scenario '+s.version+' · F1 formula foundations 1',6)]
    ];
    const sheets=lessons.map((l,i)=>{
      const ex=engine.exercise(l.id,id,version,'independent');
      const result=engine.evaluate(ex.formula,ex.values);
      if(result.error||!Number.isFinite(result.result))throw Error('Invalid reviewed exercise.');
      const rows=[[cell(s.heading,1),cell(s.quantity,1)],...s.labels.map((label,j)=>[cell(label),ex.values[j]===''?cell(null,2):number(Number(ex.values[j]))]),
        [cell('Result ('+ex.unit+')',7),done?{value:result.result,style:9,formula:ex.formula.slice(1)}:cell(null,8)],
        [],[cell('Task',7),cell(ex.instruction,6)]];
      return {name:String(i+1).padStart(2,'0')+' '+l.fn,rows,widths:[33,62],heights:[26,21,21,21,24,12,50]};
    });
    return {scenario:s,kind,filename:'Commonplace-Excel-'+s.id+'-v'+s.version+'-F1-'+kind+'.xlsx',sheets:[
      {name:'Read me',rows:readme,widths:[34,88],heights:readme.map((_,i)=>i===0?28:i===3||i>=4&&i<=8?64:34)},...sheets
    ]};
  }
  function buildReferenceModel(id,version,kind){
    if(kind!=='practice'&&kind!=='solution')throw Error('Unknown workbook type.');
    const s=scenarioFor(id,version),done=kind==='solution',engine=global.CommonplaceExcelReferenceFoundations;
    if(!engine)throw Error('Reference lesson library is unavailable.');
    const names=['01 Line totals','02 Fixed rate','03 Quote grid','04 Unit cost'];
    const ids=Object.keys(REFERENCE_FORMULAS);
    const exercises=ids.map(lessonId=>engine.exercise(lessonId,id,version,'guided'));
    const readme=[
      [cell('COMMONPLACE · CELL REFERENCES',1),cell(done?'COMPLETED SOLUTIONS':'PRACTICE WORKBOOK',1)],
      [cell('Professional context',7),cell(s.title,6)],
      [cell('Situation',7),cell(exercises[0].context,6)],
      [cell('How to use',7),cell(done?'Compare your practice with these editable source formulas and copied results. Change an input to see each dependent result update.':'Open the exercise sheets in Microsoft Excel and save a copy. Enter the source formula, then copy it into every highlighted answer cell. The source and copied answer cells are blank in this file.',6)],
      ...exercises.map((ex,i)=>[cell(names[i],7),cell(ex.lesson.concept,6)]),
      [cell('Money and quantities',7),cell('Item costs and unit costs are in JPY. Only the fixed-rate sheet converts JPY to PHP, using a fictional PHP-per-JPY rate in F2. Quantities are counts of items. All data are fictional.',6)],
      [cell('Material version',7),cell(s.id+' · scenario '+s.version+' · F2 references 1 · guided datasets 1',6)],
      [cell('Save / review',7),cell(done?'This separate answer file contains the formulas for comparison.':'Save the finished practice file on your device. Download the separate solution after trying the tasks. Commonplace does not collect changes made in Excel.',6)]
    ];
    const sheets=exercises.map((ex,i)=>{
      const columns=ex.grid.columns,outputs=[ex.lesson.worksheet.sourceCell,...ex.lesson.worksheet.targetCells];
      if(ex.lesson.id!==ids[i]||ex.lesson.version!==1||ex.dataset.version!==1)throw Error('Unsupported reference material.');
      const rows=Array.from({length:ex.grid.rows},(_,r)=>columns.map(col=>{
        const address=col+(r+1),value=ex.cells[address];
        if(outputs.includes(address)){
          if(!done)return cell(null,12);
          const formula=engine.copy(ex.lesson.worksheet.formula,ex.lesson.worksheet.sourceCell,address);
          const result=engine.evaluate(formula,ex.cells);
          if(result.error||!Number.isFinite(result.result))throw Error('Invalid reviewed reference exercise.');
          return {value:result.result,style:11,formula:formula.slice(1)};
        }
        if(Object.hasOwn(ex.values,address)){
          const numeric=Number(value);
          if(typeof value!=='string'||!Number.isFinite(numeric)||Math.abs(numeric)>1e12)throw Error('Invalid reference input.');
          return cell(numeric,ex.quantityCells.includes(address)?2:10);
        }
        return cell(value==null||value===''?null:value,r===0&&value?1:0);
      }));
      const details=[
        ['Task',ex.instruction],['Reference rule',ex.note],
        ['Units',ex.unit+' · fictional practice values; no live prices or exchange rates.'],
        ['Material version',ex.dataset.id+' · dataset '+ex.dataset.version+' · lesson '+ex.lesson.version]
      ];
      rows.push([],...details.map(([title,value])=>[cell(title,7),cell(value,6),...columns.slice(2).map(()=>cell(null))]));
      return {name:names[i],referenceLesson:ids[i],rows,
        widths:columns.length===6?[30,23,24,6,3,29]:[30,23,24,26],
        heights:[44,23,25,25,25,12,76,60,42,42],
        merges:details.map((_,j)=>'B'+(j+7)+':'+columns.at(-1)+(j+7))};
    });
    return {scenario:s,kind,filename:'Commonplace-Excel-'+s.id+'-v'+s.version+'-F2-'+kind+'.xlsx',sheets:[
      {name:'Read me',rows:readme,widths:[33,91],heights:[32,30,64,76,64,64,64,64,64,38,64]},...sheets
    ]};
  }
  // F3 has its own native table/format/filter/validation export path. Earlier
  // workbook parts remain byte-for-byte stable and keep their formula allowlists.
  const TABLE_LESSONS=['number-formats','create-table','sort-records','filter-records','validate-entry'];
  const TABLE_FIELDS=['id','item','status','quantity','unitPrice','discount','shipDate'];
  const TABLE_FORMAT_STYLES={general:0,integer:4,decimal:5,jpy:6,php:7,percent:8,date:9};
  function buildTableModel(id,version,kind){
    if(kind!=='practice'&&kind!=='solution')throw Error('Unknown workbook type.');
    const s=scenarioFor(id,version),done=kind==='solution',library=global.CommonplaceExcelTableFoundations;
    if(!library)throw Error('Table lesson library is unavailable.');
    const engine=library.forVersion(1); // Preserve the published F3 workbook data and lesson labels.
    const names=['01 Formats','02 Table','03 Sort','04 Filter','05 Validation'];
    const tableNames=[null,'PracticeItems','SortItems','FilterItems','ValidationItems'];
    const exercises=TABLE_LESSONS.map(lessonId=>engine.exercise(lessonId,id,version,'guided'));
    const sheets=exercises.map((ex,i)=>{
      if(ex.lesson.id!==TABLE_LESSONS[i]||ex.lesson.version!==1||ex.dataset.version!==1||
          !['JPY','PHP'].includes(ex.currency)||ex.rows.length!==6||
          ex.columns.map(column=>column.id).join()!==TABLE_FIELDS.join())throw Error('Unsupported table material.');
      let state=engine.initial(ex);
      if(done){
        if(i===0)for(const [column,format] of Object.entries({quantity:'integer',unitPrice:ex.currency.toLowerCase(),discount:'percent',shipDate:'date'}))
          state=engine.apply(state,{type:'set-format',column,format});
        if(i===1)state=engine.apply(state,{type:'create-table',name:'PracticeItems',range:'A1:G7',headers:true,banded:true});
        if(i===2)state=engine.apply(state,{type:'sort',column:'quantity',direction:'asc'});
        if(i===3)state=engine.apply(state,{type:'filter',status:'Ready',minimumQuantity:5});
        if(i===4)for(const column of ['quantity','status'])state=engine.apply(state,{type:'set-validation',column,enabled:true});
        if(!engine.grade(ex,state).passed)throw Error('The reviewed table solution does not satisfy its lesson.');
      }
      const byId=new Map(state.rows.map(row=>[row.id,row]));
      const visible=new Set(engine.view(state).map(row=>row.id));
      const rows=[ex.columns.map(column=>cell(column.label,1)),...state.order.map(rowId=>{
        const row=byId.get(rowId);
        return TABLE_FIELDS.map(field=>cell(row[field],Object.hasOwn(state.formats,field)?TABLE_FORMAT_STYLES[state.formats[field]]:0));
      })];
      const desktop=[
        'Select D2:D7 and use Home > Number for a whole-number display. Format E2:E7 as '+ex.currency+' currency, F2:F7 as 0.0%, and G2:G7 as yyyy-mm-dd. Check the formula bar to see unchanged values.',
        'Select A1:G7, then Home > Format as Table. Select My table has headers, use banded rows and name the table PracticeItems on Table Design.',
        'Select a Quantity cell. Use Data > Sort Smallest to Largest. Keep the full table selected so each item ID stays with its item, price, discount and date.',
        'Use the Status header filter to show Ready. Use Quantity > Number Filters > Greater Than or Equal To > 5. Data > Clear restores every row; Data > Reapply refreshes filters after edits.',
        'For D2:D7 use Data > Data Validation > Whole number > Between 0 and 10000. For C2:C7 choose List with Ready,Reserved,Shipped. Use Stop alerts and clear Ignore blank. Test direct entry; copying or deleting cells can bypass native Excel validation.'
      ];
      const notes=[['Task',ex.instruction],['In Excel',desktop[i]],
        ['Remember',i===0?'Currency symbols and date/percentage formats change the display only. They do not convert currencies or change raw values.':
          i===3?'Filtering hides records; it does not delete them. The solution keeps all six source rows, including the hidden rows.':
          i===4?'Adding validation does not repair existing entries. Use Data Validation > Circle Invalid Data to inspect them.':
          'Keep complete item records together and preserve the original values.'],
        ['Data version',ex.dataset.id+'; dataset '+ex.dataset.version+'; lesson '+ex.lesson.version]];
      rows.push([],...notes.map(([label,value])=>[cell(label,2),cell(value,3),...TABLE_FIELDS.slice(2).map(()=>cell(null))]));
      return {name:names[i],tableLesson:TABLE_LESSONS[i],rows,widths:[16,29,16,14,20,15,20],
        heights:[32,28,28,28,28,28,28,12,48,70,48,32],
        merges:notes.map((_,j)=>'B'+(j+9)+':G'+(j+9)),
        hiddenRows:state.order.map((rowId,index)=>visible.has(rowId)?null:index+2).filter(row=>row!==null),
        table:state.table?{name:tableNames[i],range:'A1:G7',headers:ex.columns.map(column=>column.label),banded:state.table.banded}:null,
        sort:state.sort,filters:state.filters,validation:state.validation};
    });
    const readme=[
      [cell('COMMONPLACE EXCEL TABLES',1),cell(done?'COMPLETED SOLUTIONS':'PRACTICE WORKBOOK',1)],
      [cell('Professional context',2),cell(s.title,3)],
      [cell('Situation',2),cell(exercises[0].context,3)],
      [cell('How to use',2),cell(done?'Compare each sheet with your completed practice. The table, filters and validation rules are editable native Excel features.':'Save a copy and complete the five sheets in order. Each sheet starts with its own six-row dataset. Use the Ribbon instructions below the data. Download the separate solution after trying the tasks.',3)],
      ...exercises.map((ex,i)=>[cell(names[i],2),cell(i===4?'Use whole-number validation for quantities from 0 to 10000, and a Ready,Reserved,Shipped list for status. Choose a status from the dropdown. The Commonplace practice checks status spelling exactly. Native Excel validation can be bypassed by copying or deleting cells; inspect existing values separately.':ex.lesson.concept,3)]),
      [cell('Data and units',2),cell('All prices, quantities, discounts and December 2026 dates are fictional. Prices use '+exercises[0].currency+'. Discount 0.05 means 5%. Dates are numeric Excel 1900-system dates displayed as yyyy-mm-dd when formatted.',3)],
      [cell('Table names',2),cell('The create-table task uses PracticeItems. The later sheets use SortItems, FilterItems and ValidationItems because Excel table names must be unique within a workbook.',3)],
      [cell('Save and review',2),cell('Downloads use the selected context’s guided starting data. Commonplace does not collect or score changes made in Excel. The solution is a separate self-study file.',3)]
    ];
    return {scenario:s,kind,filename:'Commonplace-Excel-'+s.id+'-v'+s.version+'-F3-'+kind+'.xlsx',sheets:[
      {name:'Read me',rows:readme,widths:[30,99],heights:[32,32,64,76,80,80,80,80,80,72,58,58],merges:[],hiddenRows:[],table:null},...sheets]};
  }
  function tableStylesXml(){
    const font=(color,bold=false)=>'<font>'+(bold?'<b/>':'')+'<sz val="11"/><color rgb="FF'+color+'"/><name val="Calibri"/><family val="2"/></font>';
    const xf=(fontId=0,fillId=0,numFmtId=0,wrap=false)=>'<xf numFmtId="'+numFmtId+'" fontId="'+fontId+'" fillId="'+fillId+'" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"'+(wrap?' wrapText="1"':'')+'/></xf>';
    const custom=[[164,'"JPY" #,##0'],[165,'"PHP" #,##0.00'],[166,'0.0%'],[167,'yyyy-mm-dd']];
    return XML+'<styleSheet xmlns="'+NS+'"><numFmts count="4">'+custom.map(([id,code])=>'<numFmt numFmtId="'+id+'" formatCode="'+esc(code)+'"/>').join('')+'</numFmts><fonts count="3">'+font('20362A')+font('FFFFFF',true)+font('185C37',true)+'</fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF185C37"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F1E9"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10">'+[xf(),xf(1,2,0,true),xf(2,3,0,true),xf(0,0,0,true),xf(0,0,3),xf(0,0,4),xf(0,0,164),xf(0,0,165),xf(0,0,166),xf(0,0,167)].join('')+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium4" defaultPivotStyle="PivotStyleLight16"/></styleSheet>';
  }
  function tableSheetXml(sheet,tableId){
    const rows=sheet.rows.map((row,r)=>'<row r="'+(r+1)+'" ht="'+(sheet.heights[r]||28)+'" customHeight="1"'+(sheet.hiddenRows.includes(r+1)?' hidden="1"':'')+'>'+row.map((c,i)=>{
      if(c.formula)throw Error('Formulas are outside the F3 workbook export.');
      if(!Number.isInteger(c.style)||c.style<0||c.style>9)throw Error('Unexpected table cell style.');
      const a=' r="'+String.fromCharCode(65+i)+(r+1)+'" s="'+c.style+'"';
      if(c.value===null)return '<c'+a+'/>';
      if(typeof c.value==='number'){if(!Number.isFinite(c.value))throw Error('Invalid table numeric value.');return '<c'+a+'><v>'+c.value+'</v></c>';}
      if(typeof c.value!=='string')throw Error('Invalid table text value.');
      return '<c'+a+' t="inlineStr"><is><t xml:space="preserve">'+esc(c.value)+'</t></is></c>';
    }).join('')+'</row>').join('');
    const merges=sheet.merges.length?'<mergeCells count="'+sheet.merges.length+'">'+sheet.merges.map(range=>'<mergeCell ref="'+range+'"/>').join('')+'</mergeCells>':'';
    const validations=[];
    if(sheet.validation?.quantity)validations.push('<dataValidation type="whole" operator="between" allowBlank="0" showErrorMessage="1" errorStyle="stop" errorTitle="Whole quantity required" error="Enter a whole number from 0 to 10000." sqref="D2:D7"><formula1>0</formula1><formula2>10000</formula2></dataValidation>');
    if(sheet.validation?.status)validations.push('<dataValidation type="list" allowBlank="0" showDropDown="0" showErrorMessage="1" errorStyle="stop" errorTitle="Choose a listed status" error="Choose Ready, Reserved or Shipped." sqref="C2:C7"><formula1>"Ready,Reserved,Shipped"</formula1></dataValidation>');
    const validation=validations.length?'<dataValidations count="'+validations.length+'">'+validations.join('')+'</dataValidations>':'';
    const hasFilter=sheet.filters&&(sheet.filters.status!==null||sheet.filters.minimumQuantity!==null);
    return XML+'<worksheet xmlns="'+NS+'" xmlns:r="'+REL+'">'+(hasFilter?'<sheetPr filterMode="1"/>':'')+'<sheetViews><sheetView workbookViewId="0" showGridLines="1"/></sheetViews><sheetFormatPr defaultRowHeight="28"/><cols>'+sheet.widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols><sheetData>'+rows+'</sheetData>'+merges+validation+(tableId?'<tableParts count="1"><tablePart r:id="rIdTable"/></tableParts>':'')+'</worksheet>';
  }
  function nativeTableXml(sheet,id){
    if(!sheet.table||sheet.table.range!=='A1:G7'||sheet.table.headers.length!==7||!['PracticeItems','SortItems','FilterItems','ValidationItems'].includes(sheet.table.name))throw Error('Unexpected native table.');
    const filters=[];
    if(sheet.filters.status!==null){if(sheet.filters.status!=='Ready')throw Error('Unexpected workbook status filter.');filters.push('<filterColumn colId="2"><filters><filter val="Ready"/></filters></filterColumn>');}
    if(sheet.filters.minimumQuantity!==null){if(sheet.filters.minimumQuantity!==5)throw Error('Unexpected workbook quantity filter.');filters.push('<filterColumn colId="3"><customFilters><customFilter operator="greaterThanOrEqual" val="5"/></customFilters></filterColumn>');}
    let sort='';
    if(sheet.sort){if(sheet.sort.column!=='quantity'||sheet.sort.direction!=='asc')throw Error('Unexpected workbook sort.');sort='<sortState ref="A2:G7"><sortCondition ref="D2:D7" descending="0"/></sortState>';}
    return XML+'<table xmlns="'+NS+'" id="'+id+'" name="'+sheet.table.name+'" displayName="'+sheet.table.name+'" ref="A1:G7" headerRowCount="1" totalsRowShown="0"><autoFilter ref="A1:G7">'+filters.join('')+'</autoFilter>'+sort+'<tableColumns count="7">'+sheet.table.headers.map((label,i)=>'<tableColumn id="'+(i+1)+'" name="'+esc(label)+'"/>').join('')+'</tableColumns><tableStyleInfo name="TableStyleMedium4" showFirstColumn="0" showLastColumn="0" showRowStripes="'+(sheet.table.banded?'1':'0')+'" showColumnStripes="0"/></table>';
  }
  function tableParts(model){
    const rel=(id,type,target)=>'<Relationship Id="'+id+'" Type="'+REL+'/'+type+'" Target="'+target+'"/>';
    const relationships=body=>XML+'<Relationships xmlns="'+PKG+'">'+body+'</Relationships>';
    const content=(path,type)=>'<Override PartName="/'+path+'" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.'+type+'+xml"/>';
    const tables=model.sheets.map((sheet,index)=>({sheet,index})).filter(item=>item.sheet.table).map((item,index)=>({...item,id:index+1}));
    const entries=[
      ['[Content_Types].xml',XML+'<Types xmlns="'+CT+'"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+content('xl/workbook.xml','sheet.main')+content('xl/styles.xml','styles')+model.sheets.map((_,i)=>content('xl/worksheets/sheet'+(i+1)+'.xml','worksheet')).join('')+tables.map(t=>content('xl/tables/table'+t.id+'.xml','table')).join('')+'</Types>'],
      ['_rels/.rels',relationships(rel('rId1','officeDocument','xl/workbook.xml'))],
      ['xl/workbook.xml',XML+'<workbook xmlns="'+NS+'" xmlns:r="'+REL+'"><workbookPr date1904="0"/><bookViews><workbookView activeTab="0"/></bookViews><sheets>'+model.sheets.map((sheet,i)=>'<sheet name="'+esc(sheet.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1"/></workbook>'],
      ['xl/_rels/workbook.xml.rels',relationships(model.sheets.map((_,i)=>rel('rId'+(i+1),'worksheet','worksheets/sheet'+(i+1)+'.xml')).join('')+rel('rId'+(model.sheets.length+1),'styles','styles.xml'))],
      ['xl/styles.xml',tableStylesXml()]
    ];
    model.sheets.forEach((sheet,index)=>{
      const table=tables.find(t=>t.index===index);
      entries.push(['xl/worksheets/sheet'+(index+1)+'.xml',tableSheetXml(sheet,table?.id)]);
      if(table){
        entries.push(['xl/worksheets/_rels/sheet'+(index+1)+'.xml.rels',relationships(rel('rIdTable','table','../tables/table'+table.id+'.xml'))]);
        entries.push(['xl/tables/table'+table.id+'.xml',nativeTableXml(sheet,table.id)]);
      }
    });
    return entries;
  }
  function sheetXml(sheet,reference=false){
    const rows=sheet.rows.map((row,r)=>{
      const cells=row.map((c,i)=>{
        const address=String.fromCharCode(65+i)+(r+1),a=' r="'+address+'" s="'+c.style+'"';
        if(c.formula){if(!(reference?REFERENCE_FORMULAS[sheet.referenceLesson]?.[address]===c.formula:FORMULAS.has(c.formula))||typeof c.value!=='number'||!Number.isFinite(c.value))throw Error('Unexpected formula.');return '<c'+a+'><f>'+c.formula+'</f><v>'+c.value+'</v></c>';}
        if(c.value===null)return '<c'+a+'/>';
        if(typeof c.value==='number'){if(!Number.isFinite(c.value))throw Error('Invalid numeric value.');return '<c'+a+'><v>'+c.value+'</v></c>';}
        return '<c'+a+' t="inlineStr"><is><t xml:space="preserve">'+esc(c.value)+'</t></is></c>';
      }).join('');
      return '<row r="'+(r+1)+'" ht="'+(sheet.heights[r]||20)+'" customHeight="1">'+cells+'</row>';
    }).join('');
    const merges=reference&&sheet.merges?'<mergeCells count="'+sheet.merges.length+'">'+sheet.merges.map(range=>'<mergeCell ref="'+esc(range)+'"/>').join('')+'</mergeCells>':'';
    return XML+'<worksheet xmlns="'+NS+'"><sheetViews><sheetView workbookViewId="0" showGridLines="1"/></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>'+sheet.widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols><sheetData>'+rows+'</sheetData>'+merges+'</worksheet>';
  }
  function stylesXml(unit,reference=false){
    const numeric=unit==='PHP'?4:3;
    const xf=(font=0,fill=0,border=0,fmt=0,wrap=false)=>'<xf numFmtId="'+fmt+'" fontId="'+font+'" fillId="'+fill+'" borderId="'+border+'" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"'+(wrap?' applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>':'/>');
    const font=(color,bold=false)=>'<font>'+(bold?'<b/>':'')+'<sz val="11"/><color rgb="FF'+color+'"/><name val="Calibri"/><family val="2"/></font>';
    const fill=c=>'<fill><patternFill patternType="solid"><fgColor rgb="FF'+c+'"/><bgColor indexed="64"/></patternFill></fill>';
    const edge=e=>'<'+e+' style="thin"><color rgb="FF96B4A0"/></'+e+'>';
    return XML+'<styleSheet xmlns="'+NS+'"><fonts count="3">'+font('222222')+font('FFFFFF',true)+font('185C37',true)+'</fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'+fill('185C37')+fill('FFF2B3')+fill('E3F1E8')+'</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>'+['left','right','top','bottom'].map(edge).join('')+'<diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="'+(reference?13:10)+'">'+[xf(),xf(1,2,0,0,true),xf(0,0,0,reference?3:numeric),xf(0,3,1,numeric),xf(2,4,1,numeric),xf(2,3,1,0),xf(0,0,0,0,true),xf(2,4,0,0,true),xf(0,3,1,0),xf(2,4,1,0),...(reference?[xf(0,0,0,4),xf(2,4,1,4),xf(0,3,1,4)]:[])].join('')+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }
  function parts(model,reference=false){
    const rel=(id,type,target)=>'<Relationship Id="'+id+'" Type="'+REL+'/'+type+'" Target="'+target+'"/>';
    const relationships=body=>XML+'<Relationships xmlns="'+PKG+'">'+body+'</Relationships>';
    const content=(path,type)=>'<Override PartName="/'+path+'" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.'+type+'+xml"/>';
    const entries=[
      ['[Content_Types].xml',XML+'<Types xmlns="'+CT+'"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+content('xl/workbook.xml','sheet.main')+content('xl/styles.xml','styles')+model.sheets.map((_,i)=>content('xl/worksheets/sheet'+(i+1)+'.xml','worksheet')).join('')+'</Types>'],
      ['_rels/.rels',relationships(rel('rId1','officeDocument','xl/workbook.xml'))],
      ['xl/workbook.xml',XML+'<workbook xmlns="'+NS+'" xmlns:r="'+REL+'"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'+model.sheets.map((s,i)=>'<sheet name="'+esc(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1"/></workbook>'],
      ['xl/_rels/workbook.xml.rels',relationships(model.sheets.map((_,i)=>rel('rId'+(i+1),'worksheet','worksheets/sheet'+(i+1)+'.xml')).join('')+rel('rId'+(model.sheets.length+1),'styles','styles.xml'))],
      ['xl/styles.xml',stylesXml(model.scenario.unit,reference)]
    ];
    model.sheets.forEach((s,i)=>entries.push(['xl/worksheets/sheet'+(i+1)+'.xml',sheetXml(s,reference)]));
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
  function createFormulaWorkbook(id,version,kind){
    const model=buildFormulaModel(id,version,kind);
    return {filename:model.filename,mime:MIME,bytes:zip(parts(model))};
  }
  function createReferenceWorkbook(id,version,kind){
    const model=buildReferenceModel(id,version,kind);
    return {filename:model.filename,mime:MIME,bytes:zip(parts(model,true))};
  }
  function createTableWorkbook(id,version,kind){
    const model=buildTableModel(id,version,kind);
    return {filename:model.filename,mime:MIME,bytes:zip(tableParts(model))};
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
  global.CommonplaceExcelTutorials={buildModel,createWorkbook,buildFormulaModel,createFormulaWorkbook,buildReferenceModel,createReferenceWorkbook,buildTableModel,createTableWorkbook,mount};
})(window);
