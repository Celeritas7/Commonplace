'use strict';
const fs=require('node:fs');
const path=require('node:path');

function runGuidedIntegration(sources){
  const checks={};
  function check(name,value){checks[name]=!!value;if(!value)throw Error('Failed: '+name);}
  const attrKey=s=>s.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
  class E{
    constructor(tag='div'){
      this.tag=tag;this.children=[];this.parent=null;this.dataset={};this.attrs={};this.events={};this.className='';this.hidden=false;this.value='';this._text='';this.scrollLeft=0;
      this.classList={contains:n=>this.className.split(/\s+/).includes(n),add:n=>this.classList.toggle(n,true),remove:n=>this.classList.toggle(n,false),toggle:(n,on)=>{let set=new Set(this.className.split(/\s+/).filter(Boolean));if(on===undefined)on=!set.has(n);if(on)set.add(n);else set.delete(n);this.className=[...set].join(' ');return on;}};
    }
    get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
    set textContent(v){this._text=String(v);this.children=[];}
    append(...xs){xs.forEach(x=>{x.parent=this;this.children.push(x);});}
    prepend(x){x.parent=this;this.children.unshift(x);}
    after(x){const p=this.parent;if(p){x.parent=p;p.children.splice(p.children.indexOf(this)+1,0,x);}}
    replaceChildren(){this.children=[];this._text='';}
    setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[attrKey(k)]=String(v);}
    getAttribute(k){return k.startsWith('data-')?this.dataset[attrKey(k)]??null:this.attrs[k]??null;}
    removeAttribute(k){delete this.attrs[k];}
    addEventListener(k,f){(this.events[k]??=[]).push(f);}
    dispatchEvent(e){if(!e.target)e.target=this;(this.events[e.type]||[]).forEach(f=>f(e));if(e.bubbles&&this.parent)this.parent.dispatchEvent(e);return true;}
    fire(type,extra={}){this.dispatchEvent({type,preventDefault(){},...extra});}
    focus(){this.fire('focusin',{bubbles:true});}
    scrollIntoView(){this.scrolled=true;}
    getBoundingClientRect(){return {left:0,right:50};}
    matches(s){if(s.includes(','))return s.split(',').some(x=>this.matches(x.trim()));if(s.startsWith('.'))return this.classList.contains(s.slice(1));if(s.startsWith('['))return this.getAttribute(s.slice(1,-1))!==null;return this.tag===s;}
    closest(s){return this.matches(s)?this:this.parent?.closest(s)||null;}
    querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
    querySelector(s){return this.querySelectorAll(s)[0]||null;}
  }
  class Event{constructor(type,opts={}){this.type=type;Object.assign(this,opts);}preventDefault(){}}
  const win={},document={createElement:tag=>new E(tag)};
  sources.forEach(src=>new Function('window','document','Event','CustomEvent',src)(win,document,Event,Event));
  const make=(tag,attr,value='')=>{const el=new E(tag);if(attr)el.setAttribute(attr,value);return el;};
  const root=new E(),panel=new E();root.id='test-excel';
  const name=make('span','data-excel-name'),formula=make('input','data-excel-formula'),bar=make('input','data-excel-value'),edit=make('button','data-excel-edit'),sheet=make('div','data-excel-sheet');
  root.append(name,formula,bar,edit,sheet);
  const cells={};
  for(const [address,value] of Object.entries({A1:'Item',B1:'Quantity',A2:'Notebooks',B2:'12',A3:'Pens',B3:'8',A4:'Folders',B4:'5',A5:'Total',B5:'—'})){
    const cell=make('td','data-cell',address);cells[address]=cell;
    if(['B2','B3','B4'].includes(address)){const input=new E('input');input.type='number';input.value=value;cell.append(input);}
    else if(address==='B5'){const output=new E('output');output.textContent=value;cell.append(output);}
    else cell.textContent=value;
    sheet.append(cell);
  }
  for(const field of ['picker','start','hint','exit','context','instruction','feedback','progress','count']){
    const tag=field==='picker'?'select':field==='progress'?'progress':['start','hint','exit'].includes(field)?'button':'p';panel.append(make(tag,'data-guided-'+field));
  }
  const sim=win.CommonplaceExcelPracticeRibbon.mount(root,{formulaCell:'B5',onAutoSum:()=>{
    formula.value='=SUM(B2:B4)';cells.B5.querySelector('output').textContent=String(['B2','B3','B4'].reduce((n,id)=>n+Number(cells[id].querySelector('input').value),0));
    sim.select('B5');
  }});
  let resets=0;
  function reset(){resets++;formula.value='=SUM(B2:B4)';for(const [id,value] of [['B2','12'],['B3','8'],['B4','5']])cells[id].querySelector('input').value=value;cells.B5.querySelector('output').textContent='—';sim.reset();sim.select('B5');}
  const controller=win.CommonplaceExcelGuided.mount({root,panel,simulator:sim,lessons:win.CommonplaceExcelGuidedLessons,resetWorksheet:reset});
  const p=k=>panel.querySelector('[data-guided-'+k+']');
  const tab=t=>root.querySelectorAll('[data-excel-tab]').find(b=>b.dataset.excelTab===t);
  const tool=t=>root.querySelectorAll('[data-excel-tool]').find(b=>b.dataset.excelTool===t);
  check('initial exploration does not reset',resets===0&&!controller.active);
  p('start').fire('click');check('start resets and highlights B5',resets===1&&controller.active&&cells.B5.classList.contains('excel-guided-target')&&sim.getTab()==='View');
  p('hint').fire('click');check('hint does not advance',cells.B5.scrolled&&controller.session.index===0);
  cells.B4.fire('click');check('wrong selection does not advance',controller.session.index===0);
  cells.B5.fire('focusin');check('cell selection advances and highlights Home',controller.session.index===1&&tab('Home').classList.contains('excel-guided-target'));
  const msg=p('feedback').textContent;cells.B5.fire('click');check('duplicate click does not spoil feedback',controller.session.index===1&&p('feedback').textContent===msg);
  tab('Home').fire('click');check('Home advances and highlights AutoSum',controller.session.index===2&&tool('AutoSum').classList.contains('excel-guided-target'));
  tool('AutoSum').fire('click');check('real tool handler calculates and completes',controller.session.done&&!controller.active&&cells.B5.textContent==='25'&&p('progress').value===3);
  p('picker').value='format-header';p('picker').fire('change');p('start').fire('click');
  check('second lesson has fresh baseline',resets===2&&controller.session.index===0&&cells.A1.classList.contains('excel-guided-target'));
  cells.A1.fire('click');tab('Home').fire('click');tool('Bold').fire('click');
  check('Bold changes real worksheet state',controller.session.index===3&&cells.A1.classList.contains('excel-bold'));
  tool('Bold').fire('click');tool('Fill Color').fire('click');
  check('missing required bold blocks completion',controller.active&&controller.session.index===3&&!cells.A1.classList.contains('excel-bold'));
  tool('Bold').fire('click');tool('Fill Color').fire('click');tool('Fill Color').fire('click');
  check('correct final format completes',controller.session.done&&cells.A1.classList.contains('excel-bold')&&cells.A1.classList.contains('excel-fill'));
  p('start').fire('click');check('restart clears formats',controller.active&&!cells.A1.classList.contains('excel-bold')&&!cells.A1.classList.contains('excel-fill'));
  p('exit').fire('click');check('exit clears target without reset',!controller.active&&controller.session===null&&resets===3&&root.querySelectorAll('.excel-guided-target').length===0);
  p('start').fire('click');reset();check('external reset ends active guide',!controller.active&&controller.session===null);
  return checks;
}

const sources=['excel-operations.js','excel-practice-ribbon.js','excel-guided-lessons.js','excel-guided.js'].map(name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8'));
const checks=runGuidedIntegration(sources);
console.log(Object.keys(checks).length+' guided integration checks passed (mock DOM).');
