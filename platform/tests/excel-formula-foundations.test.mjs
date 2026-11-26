import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=name=>readFileSync(new URL("../../Office_work/Excel_study/"+name,import.meta.url),"utf8");
const win={};
for(const name of ["excel-scenarios.js","excel-formula-foundations.js","excel-tutorial-workbooks.js"])
  new Function("window","TextEncoder",read(name))(win,TextEncoder);
const E=win.CommonplaceExcelFormulaFoundations,S=win.CommonplaceExcelScenarios,W=win.CommonplaceExcelTutorials;
const expected=[
 ["general-office",[25,25/3,3,5,12],[27,8.5,2,5,12]],
 ["jp-ph-trade",[19,19/3,3,4,9],[22,7.5,2,6,9]],
 ["ph-customer-quote",[5950,5950/3,3,950,3200],[6250,1375,2,950,3500]],
 ["mechanical-engineering",[42,14,3,4,24],[46,19,2,8,24]],
 ["monthly-expenses",[70000,70000/3,3,8000,50000],[72000,31000,2,10000,50000]]
];
function approx(actual,expected){assert.ok(Math.abs(actual-expected)<1e-8);}
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

test("all five formula lessons use the correct guided and independent results for every scenario",()=>{
  assert.equal(E.list().length,5);assert.equal(S.list().length,5);
  for(const [id,guided,independent] of expected){
    for(const [mode,answers] of [["guided",guided],["independent",independent]]){
      E.list().forEach((lesson,i)=>{
        const ex=E.exercise(lesson.id,id,1,mode), result=E.evaluate(ex.formula,ex.values);
        approx(result.result,answers[i]);
        assert.equal(result.error,null);
        assert.equal(E.grade(ex,ex.formula,ex.values).passed,true);
        assert.equal(ex.unit,lesson.fn==="COUNT"?"numeric cells":ex.scenario.unit);
        assert.equal(ex.values[1]==="",mode==="independent"&&["count","average"].includes(lesson.id));
        assert.ok(lesson.choices.length===3&&lesson.answer>=0&&lesson.answer<3);
      });
    }
  }
});
test("numeric blanks, zero, negative numbers and errors behave like reviewed Excel functions",()=>{
  const calc=(fn,values)=>E.evaluate("="+fn+"(B2:B4)",values);
  assert.equal(calc("COUNT",["0","","5"]).result,2);
  assert.equal(calc("AVERAGE",["0","","6"]).result,3);
  assert.equal(calc("AVERAGE",["12","","6"]).result,9);
  assert.equal(calc("SUM",["12","","6"]).result,18);
  assert.equal(calc("MIN",["-7","-2","-5"]).result,-7);
  assert.equal(calc("MAX",["-7","-2","-5"]).result,-2);
  for(const fn of ["SUM","COUNT","MIN","MAX"])assert.equal(calc(fn,["","",""]).result,0);
  assert.deepEqual(calc("AVERAGE",["","",""]),{fn:"AVERAGE",result:null,error:"#DIV/0!"});
  assert.equal(E.evaluate(" = sum( B2:B4 ) ",["1.5","2e1","-3"]).result,18.5);
  for(const f of ["SUM(B2:B4)","=SUM(A2:A4)","=SUM(B2:B5)","=B2+B3","=WEBSERVICE(\"https://example.invalid\")","=SUM(B2:B4)+1","=COUNTIF(B2:B4,1)"])assert.throws(()=>E.evaluate(f,["12","8","5"]));
  for(const values of [["Infinity","1","2"],["1e13","1","2"],["0x10","1","2"],["NaN","1","2"],["x","1","2"],["1","2"],[1,"2","3"]])assert.throws(()=>calc("SUM",values));
});
test("independent rubric distinguishes function correctness, valid calculation and unchanged inputs",()=>{
  const ex=E.exercise("count","general-office",1,"independent");
  assert.equal(E.grade(ex,"=COUNT(B2:B4)",ex.values).score,3);
  assert.equal(E.grade(ex,"=SUM(B2:B4)",ex.values).score,1);
  assert.equal(E.grade(ex,"=COUNT(B2:B4)",["12","0","5"]).score,2);
  assert.equal(E.grade(ex,"=COUNT(A2:A4)",ex.values).passed,false);
  const avg=E.exercise("average","general-office",1,"guided");
  assert.equal(E.grade(avg,avg.formula,["","",""]).score,1);
  assert.equal(E.grade(avg,avg.formula,["12","0","6"]).passed,true);
  const detached=E.list();detached[0].fn="EVIL";assert.equal(E.list()[0].fn,"SUM");
  assert.throws(()=>E.exercise("unknown","general-office",1));
  assert.throws(()=>E.exercise("sum","general-office",2));
  assert.throws(()=>E.exercise("sum","not-real",1));
  assert.throws(()=>E.exercise("sum","general-office",1,"admin"));
});
test("all ten F1 XLSX files have valid ZIP directories, CRCs, formula and blank answer separation",()=>{
  for(const [id,,answers] of expected){
    for(const kind of ["practice","solution"]){
      const model=W.buildFormulaModel(id,1,kind),file=W.createFormulaWorkbook(id,1,kind),parts=unpack(file.bytes);
      assert.equal(model.sheets.length,6);
      assert.equal(Object.keys(parts).length,11);
      assert.equal(file.filename,"Commonplace-Excel-"+id+"-v1-F1-"+kind+".xlsx");
      assert.equal(file.mime,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      assert.ok(parts["xl/styles.xml"].includes('cellXfs count="10"'));
      assert.ok(parts["xl/worksheets/sheet1.xml"].includes("a blank is not zero"));
      assert.ok(!Object.values(parts).join("").includes('TargetMode="External"'));
      E.list().forEach((lesson,i)=>{
        const ex=E.exercise(lesson.id,id,1,"independent"),sheet=i+2;
        const xml=parts["xl/worksheets/sheet"+sheet+".xml"];
        assert.ok(parts["xl/_rels/workbook.xml.rels"].includes('Target="worksheets/sheet'+sheet+'.xml"'));
        assert.ok(parts["[Content_Types].xml"].includes('PartName="/xl/worksheets/sheet'+sheet+'.xml"'));
        ex.values.forEach((v,j)=>assert.equal(value(xml,"B"+(j+2)),v===""?null:v));
        if(kind==="practice")assert.equal(getCell(xml,"B5"),'<c r="B5" s="8"/>');
        else {
          assert.ok(getCell(xml,"B5").includes("<f>"+lesson.fn+"(B2:B4)</f>"));
          approx(Number(value(xml,"B5")),answers[i]);
        }
        if(["average","count"].includes(lesson.id))assert.equal(getCell(xml,"B3"),'<c r="B3" s="2"/>');
      });
      if(kind==="practice")assert.ok(!Object.values(parts).join("").includes("<f>"));
    }
  }
  assert.throws(()=>W.createFormulaWorkbook("general-office",1,"macro"));
});
test("F1 page keeps shared gate and does not write independent storage; original D2 worksheet remains compatible",()=>{
  for(const name of ["index.html","Section_2_Study.html","Section_1_Study.html"])assert.ok(read(name).includes("../../_lib/gate.js"));
  const ui=read("excel-formula-page.js");assert.ok(!/(localStorage\s*\.|indexedDB\s*\.|serviceWorker\s*\.|fetch\s*\()/.test(ui));
  const old=W.createWorkbook("jp-ph-trade",1,"solution"),parts=unpack(old.bytes);
  assert.equal(Object.keys(parts).length,10);
  assert.equal(value(parts["xl/worksheets/sheet2.xml"],"B5"),"19");
  assert.ok(getCell(parts["xl/worksheets/sheet2.xml"],"B5").includes("<f>SUM(B2:B4)</f>"));
});
