/* Reusable Excel orientation shell. Lesson owns its worksheet and calculations. */
(function(global){
  'use strict';
  const catalog=[
    {tab:'File',groups:[['Workbook',[['New','New','Create a new workbook.'],['Open','Open','Open an existing workbook.'],['Save As','Save','Save a copy with a different name or file type.'],['Print','Print','Preview and print workbook pages.']]]]},
    {tab:'Home',groups:[['Clipboard',[['Paste','▣','Insert copied content.'],['Cut','✂','Move selected content.'],['Copy','▤','Copy selected content.']]],['Font',[['Bold','B','Make selected text bold.'],['Borders','▦','Add borders to cells.'],['Fill Color','▨','Change cell background color.']]],['Alignment',[['Wrap Text','↵','Display long text on multiple lines.'],['Align Left','≡','Align contents to the left.'],['Center','≡','Center cell contents.'],['Align Right','≡','Align contents to the right.'],['Merge & Center','↔','Merge selected cells and center the content.']]],['Number',[['Number Format','0.00','Display values as numbers, dates, currency or percentages.']]],['Editing',[['AutoSum','Σ','Suggest a SUM formula for nearby numbers.'],['Clear Contents','⌫','Remove contents while keeping formatting.'],['Sort & Filter','A↓','Sort data or display matching rows.'],['Find & Select','⌕','Locate text, values or specific cells.']]]]},
    {tab:'Insert',groups:[['Tables',[['PivotTable','▦','Summarize and group data.'],['Table','▤','Convert a range into a structured Excel table.']]],['Illustrations',[['Pictures','▧','Insert images.']]],['Charts',[['Recommended Charts','▥','Choose a suitable chart for selected data.']]]]},
    {tab:'Page Layout',groups:[['Page Setup',[['Margins','▣','Set the blank space around a printed page.'],['Orientation','↻','Choose portrait or landscape.'],['Print Area','▧','Choose cells to print.']]]]},
    {tab:'Formulas',groups:[['Function Library',[['Insert Function','fx','Search for a function and enter its arguments.'],['AutoSum','Σ','Suggest a SUM formula for nearby numbers.'],['Logical','IF','Find functions such as IF and AND.'],['Lookup & Reference','⌕','Find functions such as XLOOKUP and VLOOKUP.']]],['Formula Auditing',[['Trace Precedents','→','Find the cells used by a formula.'],['Evaluate Formula','fx','Inspect a formula calculation step by step.']]]]},
    {tab:'Data',groups:[['Get & Transform Data',[['Get Data','▤','Import and transform data with Power Query.']]],['Sort & Filter',[['Sort','A↓','Arrange records in a chosen order.'],['Filter','▽','Show rows matching conditions.']]],['Data Tools',[['Text to Columns','▥','Split text into separate columns.'],['Remove Duplicates','≠','Remove duplicate records.'],['Data Validation','✓','Restrict which values can be entered.']]]]},
    {tab:'Review',groups:[['Proofing',[['Spelling','ABC','Check spelling.']]],['Notes',[['Notes','▣','Attach a note to a cell.']]],['Protect',[['Protect Sheet','▧','Restrict edits to a worksheet.']]]]},
    {tab:'View',groups:[['Show',[['Gridlines','▦','Show or hide worksheet gridlines.'],['Formula Bar','fx','Show or hide the formula bar.']]],['Zoom',[['Zoom','⌕','Change worksheet display size.']]],['Window',[['Freeze Panes','▤','Keep selected rows or columns visible while scrolling.']]]]}
  ];
  function element(tag,cls,text){
    const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;
  }
  function button(cls,text){
    const el=element('button',cls,text);el.type='button';return el;
  }
  function mount(root,options={}){
    if(!root||root.dataset.excelMounted)return;
    const worksheet=root.querySelector('[data-excel-sheet]');
    const name=root.querySelector('[data-excel-name]');
    const formula=root.querySelector('[data-excel-formula]');
    const cellValue=root.querySelector('[data-excel-value]');
    const cells=worksheet?[...worksheet.querySelectorAll('[data-cell]')]:[];
    if(!worksheet||!name||!formula||!cellValue||!cells.length)return;
    root.dataset.excelMounted='true';
    const id=root.id||'excel-simulator';
    const shell=element('div','excel-shell');
    const title=element('div','excel-title');
    title.append(element('span','excel-brand','X'),element('strong','',options.workbook||'Book1 — Excel'),element('span','excel-tag','Explore & practice'));
    const tabs=element('div','excel-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Excel Ribbon tabs');
    const ribbon=element('div','excel-ribbon');ribbon.id=id+'-ribbon';ribbon.setAttribute('role','tabpanel');ribbon.tabIndex=0;
    const guide=element('div','excel-guide');
    const path=element('div','excel-path');
    const desc=element('p','excel-description');
    const note=element('p','excel-note');
    guide.setAttribute('aria-live','polite');guide.append(path,desc,note);
    shell.append(title,tabs,ribbon,guide);
    root.prepend(shell);
    const tabButtons=[];
    let activeTab=0;
    let operations=null;
    function describe(group,tool,control){
      ribbon.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===control)));
      path.textContent=catalog[activeTab].tab+' → '+group+' → '+tool[0];
      desc.textContent=tool[2];
      const result=operations?.execute(tool[0],selected);
      note.textContent=result??'Location preview only — this operation is not simulated yet.';
    }
    function showTab(index,focus=false){
      activeTab=index;
      tabButtons.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});
      ribbon.setAttribute('aria-labelledby',tabButtons[index].id);
      ribbon.replaceChildren();
      for(const [group,tools] of catalog[index].groups){
        const panel=element('div','excel-group');
        const controls=element('div','excel-tools');
        for(const tool of tools){
          const b=button('excel-tool','');b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',tool[0]);if(global.CommonplaceExcelOperations?.supports(tool[0])){b.classList.add('excel-working');b.title='Practice tool — performs an operation';}else{b.title='Location preview only';}b.append(element('span','excel-symbol',tool[1]),element('span','excel-tool-label',tool[0]));
          b.addEventListener('click',()=>describe(group,tool,b));controls.append(b);
        }
        panel.append(controls,element('div','excel-group-label',group));ribbon.append(panel);
      }
      path.textContent=catalog[index].tab+' Ribbon';
      desc.textContent='Select a cell, then use a tool marked Practice; other tools explain their locations.';
      note.textContent='Ribbon layout is simplified from desktop Excel for Windows. Actual icons and placement can vary by version.';
      if(focus)tabButtons[index].focus();
    }
    catalog.forEach((entry,i)=>{
      const b=button('excel-tab',entry.tab);b.id=id+'-tab-'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls',ribbon.id);
      b.addEventListener('click',()=>showTab(i));
      b.addEventListener('keydown',e=>{
        let n=i;if(e.key==='ArrowRight')n=(i+1)%catalog.length;else if(e.key==='ArrowLeft')n=(i+catalog.length-1)%catalog.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=catalog.length-1;else return;
        e.preventDefault();showTab(n,true);
      });
      tabButtons.push(b);tabs.append(b);
    });
    showTab(Math.max(0,catalog.findIndex(c=>c.tab===(options.initialTab||'Home'))));
    let selected=null;
    const formulaCell=options.formulaCell||'B5';
    const editButton=root.querySelector('[data-excel-edit]');
    function refresh(){
      if(!selected)return;
      const isFormula=selected.dataset.cell===formulaCell;
      formula.hidden=!isFormula;
      cellValue.hidden=isFormula;
      const input=selected.querySelector('input');
      cellValue.value=input?input.value:selected.textContent;
      if(editButton)editButton.hidden=isFormula;
    }
    function select(address,focus=false){
      const cell=cells.find(c=>c.dataset.cell===address);if(!cell)return false;
      selected=cell;
      name.textContent=address;
      cells.forEach(c=>{c.classList.toggle('excel-selected',c===cell);if(c===cell)c.setAttribute('aria-current','true');else c.removeAttribute('aria-current');});
      refresh();
      if(focus)(cell.querySelector('input')||cell).focus();
      return true;
    }
    cells.forEach(cell=>{
      const input=cell.querySelector('input');
      if(!input){cell.tabIndex=0;cell.setAttribute('aria-label',cell.dataset.cell+', '+cell.textContent.trim());}
      cell.addEventListener('click',()=>select(cell.dataset.cell));
      cell.addEventListener('focusin',()=>select(cell.dataset.cell));
      cell.addEventListener('input',refresh);
      cell.addEventListener('keydown',e=>{
        if(e.target!==cell)return;
        const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];
        if(!d)return;
        const m=cell.dataset.cell.match(/^([A-Z])(\d+)$/);
        if(m&&select(String.fromCharCode(m[1].charCodeAt(0)+d[0])+(Number(m[2])+d[1]),true))e.preventDefault();
      });
    });
    operations=global.CommonplaceExcelOperations?.create({cells,formulaCell,formula,refresh,onAutoSum:options.onAutoSum});
    function commitEdit(){if(operations){const result=operations.edit(selected,cellValue.value);path.textContent='Formula bar → Edit cell';desc.textContent=result;note.textContent='Only sample input cells are editable; B5 is reserved for SUM.';}}
    if(editButton)editButton.addEventListener('click',commitEdit);
    cellValue.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commitEdit();}});
    const footer=element('div','excel-sheet-footer');footer.append(element('span','excel-sheet-tab',options.sheet||'Sheet1'),element('span','excel-sheet-status','Practice worksheet · one sheet'));
    worksheet.after(footer);
    select(formulaCell);
    return {select,refresh,reset:()=>operations?.reset()};
  }
  global.CommonplaceExcelRibbon={mount};
})(window);
