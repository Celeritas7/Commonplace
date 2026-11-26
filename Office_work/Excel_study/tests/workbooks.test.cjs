'use strict';
const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const checks={};
function check(label,condition){if(!condition)throw Error(label);checks[label]=true;}
const win={};
new Function('window',read('excel-scenarios.js'))(win);
new Function('window','TextEncoder',read('excel-tutorial-workbooks.js'))(win,TextEncoder);
const E=win.CommonplaceExcelScenarios,W=win.CommonplaceExcelTutorials;
const expected=[['general-office',25,27,29],['jp-ph-trade',19,22,21],['ph-customer-quote',5950,6250,4550],['mechanical-engineering',42,46,62],['monthly-expenses',70000,72000,112000]];
function decode(bytes){return new TextDecoder().decode(bytes);}
function crc32(bytes){let crc=-1;for(const b of bytes){crc^=b;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (~crc)>>>0;}
function unpack(bytes){
  const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=p=>d.getUint16(p,true),u32=p=>d.getUint32(p,true);
  const end=bytes.length-22;
  if(u32(end)!==0x06054b50||u16(end+20)!==0||u16(end+8)!==u16(end+10))throw Error('ZIP end record');
  const count=u16(end+10),start=u32(end+16);let pos=start;
  if(start+u32(end+12)!==end)throw Error('ZIP central directory bounds');
  const entries={};
  for(let i=0;i<count;i++){
    if(u32(pos)!==0x02014b50||u16(pos+10)!==0||u32(pos+20)!==u32(pos+24))throw Error('ZIP central header');
    const size=u32(pos+24),nameLength=u16(pos+28),extra=u16(pos+30),comment=u16(pos+32),local=u32(pos+42);
    const name=decode(bytes.subarray(pos+46,pos+46+nameLength));
    if(name in entries||u32(local)!==0x04034b50||u16(local+8)!==0||u32(local+14)!==u32(pos+16)||u32(local+18)!==size)throw Error('ZIP local header');
    const localNameLength=u16(local+26);
    if(decode(bytes.subarray(local+30,local+30+localNameLength))!==name)throw Error('ZIP local filename mismatch');
    const begin=local+30+localNameLength+u16(local+28),data=bytes.subarray(begin,begin+size);
    if(begin+size>start||crc32(data)!==u32(pos+16))throw Error('ZIP CRC or bounds');
    entries[name]=decode(data);pos+=46+nameLength+extra+comment;
  }
  if(pos!==end)throw Error('ZIP central count');
  return entries;
}
function getCell(xml,address){
  const start=xml.indexOf('<c r="'+address+'"');
  if(start<0)return '';
  const headEnd=xml.indexOf('>',start);
  if(xml[headEnd-1]==='/')return xml.slice(start,headEnd+1);
  const end=xml.indexOf('</c>',headEnd);
  return xml.slice(start,end+4);
}
function value(xml,address){return getCell(xml,address).match(/<v>([^<]*)<\/v>/)?.[1]??null;}
for(const [id,total,revised,matching] of expected){
  const s=E.select(id);
  for(const kind of ['practice','solution']){
    const model=W.buildModel(id,s.version,kind),file=W.createWorkbook(id,s.version,kind),parts=unpack(file.bytes),tag=id+' '+kind;
    check(tag+' name and media type',file.filename==='Commonplace-Excel-'+id+'-v1-'+kind+'.xlsx'&&file.mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    check(tag+' five tabs and package parts',Object.keys(parts).length===10&&model.sheets.map(x=>x.name).join('|')==='Read me|01 Sum|02 Revise|03 Copy|04 Format');
    check(tag+' sheet relationships',model.sheets.every((_,i)=>parts['xl/_rels/workbook.xml.rels'].includes('Target="worksheets/sheet'+(i+1)+'.xml"')&&parts['[Content_Types].xml'].includes('PartName="/xl/worksheets/sheet'+(i+1)+'.xml"'))&&parts['_rels/.rels'].includes('Target="xl/workbook.xml"'));
    check(tag+' no external or executable parts',Object.keys(parts).every(p=>!/(vba|external|activex|macro)/i.test(p))&&!Object.values(parts).join('').includes('TargetMode="External"'));
    check(tag+' instructions present',parts['xl/worksheets/sheet1.xml'].includes(s.id)&&parts['xl/worksheets/sheet1.xml'].includes('Home → Editing → AutoSum')&&parts['xl/worksheets/sheet1.xml'].includes('Home → Font'));
    const sum=parts['xl/worksheets/sheet2.xml'],rev=parts['xl/worksheets/sheet3.xml'],copy=parts['xl/worksheets/sheet4.xml'],fmt=parts['xl/worksheets/sheet5.xml'];
    check(tag+' typed original inputs',s.values.every((v,i)=>value(sum,'B'+(i+2))===String(v)));
    check(tag+' revision inputs',value(rev,'B3')===String(kind==='solution'?s.revised:s.values[1])&&value(rev,'B2')===String(s.values[0])&&value(rev,'B4')===String(s.values[2]));
    check(tag+' copy inputs',value(copy,'B3')===String(kind==='solution'?s.values[0]:s.values[1])&&value(copy,'B2')===String(s.values[0])&&value(copy,'B4')===String(s.values[2]));
    check(tag+' formatting exercise',getCell(fmt,'A1').includes('s="'+(kind==='solution'?5:0)+'"')&&getCell(fmt,'A1').includes(s.heading)&&!getCell(fmt,'B5'));
    check(tag+' formula / blank separation',kind==='solution'?[sum,rev,copy].every((x,i)=>getCell(x,'B5').includes('<f>SUM(B2:B4)</f>')&&value(x,'B5')===String([total,revised,matching][i])):!Object.values(parts).join('').includes('<f>')&&[sum,rev,copy].every(x=>getCell(x,'B5')==='<c r="B5" s="3"/>'));
    check(tag+' stable generation',file.bytes.length===W.createWorkbook(id,s.version,kind).bytes.length&&crc32(file.bytes)===crc32(W.createWorkbook(id,s.version,kind).bytes));
  }
}
for(const [id,version,kind] of [['not-real',1,'practice'],['general-office',99,'practice'],['general-office',1,'macro']]){
 let error=false;try{W.createWorkbook(id,version,kind);}catch(e){error=true;}check('reject '+id+' '+version+' '+kind,error);
}
const html=read('Section_1_Study.html');
check('page hooks applied scenario',html.includes('getScenario:()=>scenario')&&html.includes('tutorials?.refresh()')&&html.includes('data-tutorial-practice')&&html.includes('data-tutorial-solution'));
check('page preserves shared login and reading key',html.includes('../../_lib/gate.js')&&html.includes('commonplace_excel_preview_v1'));
const fields={};for(const k of ['context','status','practice','solution'])fields[k]={textContent:'',events:{},addEventListener(type,fn){this.events[type]=fn;}};
const panel={dataset:{},querySelector(s){return fields[s.slice(15,-1)];}};
const downloads=[],revocations=[];let current=E.select('jp-ph-trade'),blob;
class TestBlob{constructor(chunks,options){this.bytes=chunks[0];this.type=options.type;}}
const urls={createObjectURL(file){blob=file;return 'blob:test';},revokeObjectURL(url){revocations.push(url);}};
const document={body:{append(){}},createElement(){return {click(){downloads.push({filename:this.download,blob});},remove(){}};}};
new Function('window','TextEncoder','document','Blob','URL','setTimeout',read('excel-tutorial-workbooks.js'))(win,TextEncoder,document,TestBlob,urls,fn=>fn());
const ctl=win.CommonplaceExcelTutorials.mount({panel,getScenario:()=>current});
check('initial context',fields.context.textContent.includes(current.title));
fields.practice.events.click();check('practice click downloads XLSX',downloads[0].filename.includes('jp-ph-trade')&&downloads[0].filename.endsWith('-practice.xlsx')&&downloads[0].blob.type.startsWith('application/vnd.openxmlformats'));
current=E.select('ph-customer-quote');ctl.refresh();
check('refresh updates active context and clears status',fields.context.textContent.includes(current.title)&&fields.status.textContent==='');
fields.solution.events.click();check('solution click follows current context',downloads[1].filename.includes('ph-customer-quote')&&downloads[1].filename.endsWith('-solution.xlsx')&&value(unpack(downloads[1].blob.bytes)['xl/worksheets/sheet2.xml'],'B5')==='5950');
check('download URL cleaned',revocations.length===2);
check('mount is idempotent',win.CommonplaceExcelTutorials.mount({panel,getScenario:()=>current})===undefined);
console.log(Object.keys(checks).length+' workbook checks passed (model, ZIP/OOXML parts, mock download callbacks).');
