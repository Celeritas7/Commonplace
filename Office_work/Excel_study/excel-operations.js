/* Small, single-cell Excel practice engine. No system clipboard or arbitrary formulas. */
(function(global){
  'use strict';
  const formats=['excel-bold','excel-border','excel-fill','excel-wrap','excel-left','excel-center','excel-right'];
  const toggles={'Bold':'excel-bold','Borders':'excel-border','Fill Color':'excel-fill','Wrap Text':'excel-wrap'};
  const alignment={'Align Left':'excel-left','Center':'excel-center','Align Right':'excel-right'};
  const supported=new Set([...Object.keys(toggles),...Object.keys(alignment),'Copy','Cut','Paste','Clear Contents','AutoSum']);
  function create({cells,formulaCell,formula,refresh,onAutoSum}){
    const initial=new Map(cells.filter(c=>c.dataset.cell!==formulaCell&&!c.querySelector('input')).map(c=>[c,c.textContent]));
    let clipboard=null;
    const address=c=>c.dataset.cell;
    const protectedCell=c=>address(c)===formulaCell;
    const read=c=>c.querySelector('input')?.value??c.textContent;
    const getFormat=c=>formats.filter(f=>c.classList.contains(f));
    function applyFormat(c,fs){formats.forEach(f=>c.classList.toggle(f,fs.includes(f)));}
    function valid(c,value){
      if(protectedCell(c))return 'The SUM result cell is reserved for the formula exercise.';
      const input=c.querySelector('input');
      if(input?.type==='number'&&value!==''&&(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())||!Number.isFinite(Number(value))))return 'This quantity cell accepts numbers or a blank value only.';
      return '';
    }
    function write(c,value){
      const input=c.querySelector('input');
      if(input){
        input.value=input.type==='number'&&value.trim()!==''?String(Number(value)):value.trim()===''&&input.type==='number'?'':value;
        input.dispatchEvent(new Event('input',{bubbles:true}));
      }else{c.textContent=value;c.setAttribute('aria-label',address(c)+', '+(value||'blank'));}
    }
    function edit(c,value){
      if(!c)return 'Select a cell first.';
      value=String(value);
      const error=valid(c,value);if(error)return error;
      write(c,value);refresh();return address(c)+' updated.';
    }
    function clearCut(){cells.forEach(c=>c.classList.remove('excel-cut-source'));}
    function execute(tool,c){
      if(!supported.has(tool))return null;
      if(!c)return 'Select a worksheet cell first.';
      const id=address(c);
      if(toggles[tool]){
        if(tool==='Wrap Text'&&c.querySelector('input'))return 'Try Wrap Text on a text cell in column A or the Quantity heading in B1.';
        const cls=toggles[tool],on=!c.classList.contains(cls);c.classList.toggle(cls,on);
        return tool+' '+(on?'applied to ':'removed from ')+id+'.';
      }
      if(alignment[tool]){
        Object.values(alignment).forEach(f=>c.classList.toggle(f,f===alignment[tool]));return tool+' applied to '+id+'.';
      }
      if(tool==='AutoSum'){
        if(id!==formulaCell)return 'Select '+formulaCell+' (the Total cell) first. This lesson uses one fixed SUM range.';
        if(typeof onAutoSum!=='function')return 'AutoSum is not configured for this worksheet.';
        onAutoSum();return 'AutoSum entered =SUM(B2:B4). See the result in B5.';
      }
      if(tool==='Clear Contents'){
        const error=valid(c,'');if(error)return error;
        write(c,'');refresh();return id+' cleared; formatting retained.';
      }
      if(tool==='Copy'||tool==='Cut'){
        if(protectedCell(c))return 'Copying or moving formulas is not supported in this lesson.';
        clearCut();clipboard={source:c,value:read(c),format:getFormat(c),cut:tool==='Cut'};
        if(clipboard.cut)c.classList.add('excel-cut-source');
        return id+(clipboard.cut?' marked for moving. Select a destination and click Paste.':' copied. Select a destination and click Paste.');
      }
      if(tool==='Paste'){
        if(!clipboard)return 'Clipboard is empty. Select a cell and click Copy or Cut first.';
        const source=clipboard.source;
        if(clipboard.cut&&source===c){clearCut();clipboard=null;return 'Move cancelled: source and destination are the same cell.';}
        const value=clipboard.cut?read(source):clipboard.value;
        const fs=clipboard.cut?getFormat(source):clipboard.format;
        const error=valid(c,value);if(error)return error+' Clipboard retained.';
        write(c,value);applyFormat(c,fs);
        if(clipboard.cut){write(source,'');applyFormat(source,[]);clearCut();clipboard=null;}
        refresh();return 'Pasted into '+id+'.';
      }
      return null;
    }
    function reset(){
      clearCut();clipboard=null;
      cells.forEach(c=>{applyFormat(c,[]);if(initial.has(c)){c.textContent=initial.get(c);c.setAttribute('aria-label',address(c)+', '+c.textContent);}});
      refresh();
    }
    return {execute,edit,reset};
  }
  global.CommonplaceExcelOperations={create,supports:tool=>supported.has(tool)};
})(window);
