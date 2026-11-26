'use strict';
const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=read('Section_1_Study.html');
const checks={};
const check=(k,v)=>{checks[k]=!!v;if(!v)throw Error(k);};
const names=['excel-operations.js','excel-practice-ribbon.js','excel-guided-lessons.js','excel-guided.js','excel-assessment-lessons.js','excel-assessment.js','excel-scenarios.js'];
const win={};
for(const n of names)new Function('window',read(n))(win);
const E=win.CommonplaceExcelScenarios,A=win.CommonplaceExcelAssessment,G=win.CommonplaceExcelGuided;
const expected=[['general-office',25,27,29],['jp-ph-trade',19,22,21],['ph-customer-quote',5950,6250,4550],['mechanical-engineering',42,46,62],['monthly-expenses',70000,72000,112000]];
for(const [id,t,r,m] of expected){
  const s=E.select(id),w=E.worksheet(s),q=E.quiz(s),[rev,head,match]=E.assessments(s,win.CommonplaceExcelAssessments),[g]=E.guided(s,win.CommonplaceExcelGuidedLessons);
  check(id+' dataset',w.total===t&&w.rows.map(row=>row[1]).join()===s.values.join());
  check(id+' revised and matching totals',E.revisedTotal(s)===r&&E.matchingTotal(s)===m);
  check(id+' quiz',q.choices['abc'.indexOf(q.answer)]===t&&new Set(q.choices).size===3&&q.explanation.includes(s.unit));
  const session=G.createSession(g);session.accept({type:'select',cell:'B5'});session.accept({type:'tab',tab:'Home'});
  const e={type:'tool',tab:'Home',group:'Editing',tool:'AutoSum',cell:'B5',formula:'=SUM(B2:B4)',state:{address:'B5',value:String(t)}};
  check(id+' guide rejects wrong result',!session.accept({...e,state:{address:'B5',value:String(t+1)}}));
  check(id+' guide completion',session.accept(e)&&session.done);
  const state=(b,result)=>({formula:'=SUM(B2:B4)',cells:{A1:{value:s.heading,bold:true,fill:true,border:true},B2:{value:String(s.values[0])},B3:{value:String(b)},B4:{value:String(s.values[2])},B5:{value:String(result)}}});
  check(id+' revision grading',A.grade(rev,state(s.revised,r)).passed&&!A.grade(rev,state(s.values[1],t)).passed);
  check(id+' matching grading',A.grade(match,state(s.values[0],m)).passed);
  check(id+' formatting grading',A.grade(head,state(s.revised,r)).passed&&!A.grade(head,{...state(s.revised,r),cells:{A1:{value:'Wrong',bold:true,fill:true,border:true}}}).passed);
  const record=A.makeRecord(rev,state(s.revised,r),{attemptId:'test',startedAt:'2026-01-01',submittedAt:'2026-01-02'});
  check(id+' record identity',record.scenario_id===id&&record.scenario_version===1&&record.scenario_title===s.title&&record.score===4&&!record.user_id);
}
const mutated=E.select('jp-ph-trade');mutated.values[0]=100;check('detached sample data',E.select('jp-ph-trade').values[0]===6);
check('base definitions unchanged',win.CommonplaceExcelAssessments[0].criteria[0].expected==='10'&&win.CommonplaceExcelGuidedLessons[0].steps[2].expect.state.value==='25');
check('preserved auth and progress',html.includes('../../_lib/gate.js')&&html.includes('commonplace_excel_preview_v1'));
check('practice namespace only',html.includes('CommonplaceExcelPracticeRibbon')&&!html.includes('src="excel-ribbon.js"'));

/* Minimal DOM fixture: run actual page event handlers, not browser rendering. */
const key=s=>s.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.parent=null;this.dataset={};this.attrs={};this.events={};this.className='';this.value='';this.defaultValue='';this.checked=false;this.hidden=false;this._text='';this.scrollLeft=0;this.style={};
    this.classList={contains:n=>this.className.split(/\s+/).includes(n),add:(...ns)=>ns.forEach(n=>this.classList.toggle(n,true)),remove:(...ns)=>ns.forEach(n=>this.classList.toggle(n,false)),toggle:(n,on)=>{const s=new Set(this.className.split(/\s+/).filter(Boolean));if(on===undefined)on=!s.has(n);if(on)s.add(n);else s.delete(n);this.className=[...s].join(' ');return on;}};
  }
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
  set textContent(v){this._text=String(v);this.children=[];}
  get valueAsNumber(){return this.value.trim()===''?NaN:Number(this.value);}
  append(...xs){xs.forEach(x=>{x.parent=this;this.children.push(x);});}
  prepend(x){x.parent=this;this.children.unshift(x);}
  after(x){const p=this.parent;if(p){x.parent=p;p.children.splice(p.children.indexOf(this)+1,0,x);}}
  replaceChildren(){this.children=[];this._text='';}
  setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[key(k)]=String(v);if(k==='id')this.id=String(v);}
  getAttribute(k){return k.startsWith('data-')?this.dataset[key(k)]??null:k==='id'?this.id??null:this.attrs[k]??null;}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,f){(this.events[k]??=[]).push(f);}
  dispatchEvent(e){if(!e.target)e.target=this;(this.events[e.type]||[]).forEach(f=>f(e));if(e.bubbles&&this.parent)this.parent.dispatchEvent(e);return true;}
  fire(type,extra={}){this.dispatchEvent({type,preventDefault(){},...extra});}
  focus(){this.fire('focusin',{bubbles:true});}
  scrollIntoView(){}
  getBoundingClientRect(){return {left:0,right:50};}
  matches(s){if(s.includes(','))return s.split(',').some(x=>this.matches(x.trim()));if(s.startsWith('.'))return this.classList.contains(s.slice(1));if(s.startsWith('#'))return this.id===s.slice(1);if(s==='input:checked')return this.tag==='input'&&this.checked;if(s.startsWith('[')){const m=s.slice(1,-1).split('=');return this.getAttribute(m[0])!==null&&(m.length===1||this.getAttribute(m[0])===m[1].replace(/^"|"$/g,''));}return this.tag===s;}
  closest(s){return this.matches(s)?this:this.parent?.closest(s)||null;}
  querySelectorAll(s){if(s.includes(' ')&&!s.includes(',')){const i=s.indexOf(' ');return this.querySelectorAll(s.slice(0,i)).flatMap(x=>x.querySelectorAll(s.slice(i+1)));}return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  reset(){this.querySelectorAll('input').forEach(x=>{if(x.type==='radio'||x.type==='checkbox')x.checked=false;else x.value=x.defaultValue;});this.fire('reset');}
  requestSubmit(){this.fire('submit');}
}
class Event{constructor(type,opts={}){this.type=type;Object.assign(this,opts);}preventDefault(){}}
const page=new Element('body');
const add=(parent,tag,id,attrs={},value)=>{const el=new Element(tag);if(id)el.id=id;for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(value!==undefined)el.textContent=value;parent.append(el);return el;};
const doc={createElement:tag=>new Element(tag),getElementById:id=>page.querySelector('#'+id),querySelector:s=>page.querySelector(s),querySelectorAll:s=>page.querySelectorAll(s)};
const $=id=>doc.getElementById(id);
add(page,'b','ptext');add(page,'div',null,{role:'progressbar'});add(page,'div','pfill');
for(const id of ['cells','sum']){const c=add(page,'article',null,{'data-track':id});add(c,'button').className='head';add(c,'div').className='body';}
const chk=add(page,'label');chk.className='check-item';add(chk,'input',null,{'data-task':'locate'});
for(const [tag,id] of [['select','scenario-picker'],['button','scenario-apply'],['p','scenario-status'],['p','scenario-context'],['div','scenario-cell-tip'],['div','scenario-sum-tip']])add(page,tag,id);
const gp=add(page,'section','excel-guided'),ap=add(page,'section','excel-assessment');
for(const field of ['picker','start','hint','exit','context','instruction','feedback','progress','count'])add(gp,field==='picker'?'select':field==='progress'?'progress':'div',null,{['data-guided-'+field]:''});
for(const field of ['picker','start','submit','cancel','scenario','task','status','results','history'])add(ap,field==='picker'?'select':'div',null,{['data-assessment-'+field]:''});
const root=add(page,'section','excel-preview'),form=add(root,'form','practice');
add(form,'span',null,{'data-excel-name':''});
const formula=add(form,'input','formula',{'data-excel-formula':''});add(form,'input',null,{'data-excel-value':''});add(form,'button',null,{'data-excel-edit':''});
formula.value=formula.defaultValue='=SUM(B2:B4)';
const sheet=add(form,'div',null,{'data-excel-sheet':''}),table=add(sheet,'table'),cells={};
for(const [id,v] of Object.entries({A1:'Item',B1:'Quantity',A2:'Notebooks',B2:'12',A3:'Pens',B3:'8',A4:'Folders',B4:'5',A5:'Total',B5:'—'})){
 const c=add(table,'td',null,{'data-cell':id});cells[id]=c;
 if(['B2','B3','B4'].includes(id)){const x=add(c,'input',id.toLowerCase());x.type='number';x.value=x.defaultValue=v;}
 else if(id==='B5')add(c,'output','b5',{},v);else c.textContent=v;
}
add(form,'button','reset-sheet');add(form,'p','practice-feedback');
const quiz=add(page,'form','quiz'),qs=[];
for(const [i,answer] of [[1,'b'],[2,'a']]){const q=add(quiz,'fieldset',i===2?'scenario-quiz':null,{'data-answer':answer});q.className='q';add(q,'legend');for(const letter of ['a','b','c']){const lab=add(q,'label');lab.className='opt';const x=add(lab,'input');x.type='radio';x.value=letter;add(lab,'span',null,{'data-scenario-option':letter});}add(q,'div').className='explain';qs.push(q);}
add(quiz,'span','score');
let uid=0;const app={crypto:{randomUUID:()=>String(++uid)}};
for(const n of names)new Function('window','document','Event','CustomEvent',read(n))(app,doc,Event,Event);
const store={commonplace_excel_preview_v1:JSON.stringify({read:['cells'],open:[],tasks:['locate']})};
const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
new Function('window','document','localStorage',html.match(/<script>\s*([\s\S]*?)<\/script>/)[1])(app,doc,localStorage);
const choose=id=>{$('scenario-picker').value=id;$('scenario-apply').fire('click');};
const g=k=>gp.querySelector('[data-guided-'+k+']'),a=k=>ap.querySelector('[data-assessment-'+k+']');
const tab=t=>root.querySelectorAll('[data-excel-tab]').find(x=>x.dataset.excelTab===t),tool=t=>root.querySelectorAll('[data-excel-tool]').find(x=>x.dataset.excelTool===t);
check('restored reading progress',$('ptext').textContent==='Reading progress 50%');
for(const [id,t] of expected){
 choose(id);const s=E.select(id);
 check(id+' page renders worksheet',cells.A1.textContent===s.heading&&cells.A3.textContent===s.labels[1]&&$('b3').value===String(s.values[1]));
 form.requestSubmit();check(id+' page calculates sum',$('b5').textContent===String(t)&&$('practice-feedback').textContent.includes(s.unit));
 g('start').fire('click');cells.B5.fire('click');tab('Home').fire('click');tool('AutoSum').fire('click');
 check(id+' real guide completes',g('count').textContent==='3 / 3 actions completed');
 a('start').fire('click');$('b3').value=String(s.revised);$('b3').fire('input',{bubbles:true});cells.B5.fire('click');tool('AutoSum').fire('click');a('submit').fire('click');
 check(id+' actual assessment scores',a('results').textContent.includes('Score: 4 / 4')&&a('history').textContent.includes(s.title));
 const q=E.quiz(s);qs[0].querySelectorAll('input')[1].checked=true;qs[1].querySelectorAll('input')['abc'.indexOf(q.answer)].checked=true;quiz.requestSubmit();
 check(id+' dynamic quiz graded',$('score').textContent==='Score: 2 / 2');
 $('reset-sheet').fire('click');check(id+' reset uses active example',$('b3').value===String(s.values[1])&&$('b5').textContent==='—');
}
check('all five attempts retained',a('history').textContent.includes('5 submitted attempts')&&a('history').textContent.includes('General office')&&a('history').textContent.includes('Philippines customer quotation'));
g('start').fire('click');choose('jp-ph-trade');check('active guide blocks switch',$('scenario-picker').value==='monthly-expenses'&&$('scenario-status').textContent.includes('Finish or exit'));g('exit').fire('click');
a('start').fire('click');choose('jp-ph-trade');check('active assessment blocks switch',$('scenario-picker').value==='monthly-expenses');a('cancel').fire('click');
choose('jp-ph-trade');check('switch clears old quiz score and options',$('score').textContent===''&&!qs[1].querySelector('input:checked'));
check('switch preserves local reading state',$('ptext').textContent==='Reading progress 50%'&&JSON.parse(store.commonplace_excel_preview_v1).read[0]==='cells');
console.log(Object.keys(checks).length+' scenario checks passed (model + mock DOM).');
