import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {unzipSync,strFromU8} from "fflate";
import {XMLParser,XMLValidator} from "fast-xml-parser";

const w={};
const read=name=>readFileSync(new URL("../../Office_work/Excel_study/"+name,import.meta.url),"utf8");
for(const name of ["formula-syntax.js","excel-curriculum.js","excel-scenarios.js",
  "excel-decision-foundations.js","excel-conditional-foundations.js","excel-lookup-foundations.js","excel-tutorial-workbooks.js"])
  new Function("window","TextEncoder",read(name))(w,TextEncoder);
const W=w.CommonplaceExcelTutorials,S=w.CommonplaceExcelScenarios,
  D=w.CommonplaceExcelDecisionFoundations,C=w.CommonplaceExcelConditionalFoundations,L=w.CommonplaceExcelLookupFoundations;
const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:"@",parseTagValue:false});
const parse=s=>parser.parse(s);
const list=v=>v==null?[]:Array.isArray(v)?v:[v];
const archive=file=>Object.fromEntries(Object.entries(unzipSync(file.bytes)).map(([k,v])=>[k,strFromU8(v)]));
const worksheet=(parts,n)=>parse(parts["xl/worksheets/sheet"+n+".xml"]).worksheet;
const cells=sheet=>Object.fromEntries(list(sheet.sheetData.row).flatMap(row=>list(row.c)).map(c=>[c["@r"],c]));
const text=c=>typeof c.is.t==="object"?c.is.t["#text"]:c.is.t;
const num=c=>{assert.equal(c["@t"],undefined);assert.notEqual(c.v,undefined);return Number(c.v);};
const blank=c=>{assert.equal(c.f,undefined);assert.equal(c.v,undefined);assert.equal(c.is,undefined);};

test("F4D produces all ten valid separate XLSX packages, without answer leakage or external relationships",()=>{
  const filenames=new Set();
  for(const scenario of S.list())for(const kind of ["practice","solution"]){
    const f=W.createF4Workbook(scenario.id,scenario.version,kind),parts=archive(f),done=kind==="solution";
    filenames.add(f.filename);
    assert.equal(f.filename,"Commonplace-Excel-"+scenario.id+"-v1-F4-"+kind+".xlsx");
    assert.equal(f.mime,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.equal(Object.keys(parts).length,10);
    for(const [name,xml] of Object.entries(parts)){
      assert.equal(XMLValidator.validate(xml),true,name);
      assert.doesNotMatch(xml,/TargetMode="External"|vbaProject|externalLink|sheetProtection/);
    }
    const book=parse(parts["xl/workbook.xml"]).workbook;
    assert.deepEqual(list(book.sheets.sheet).map(s=>s["@name"]),["Read me","01 IF","02 Conditional format","03 XLOOKUP","04 VLOOKUP"]);
    assert.equal(book.calcPr["@calcMode"],"auto");
    assert.equal(book.calcPr["@fullCalcOnLoad"],"1");
    const formulas=Object.values(parts).join("\n").match(/<f>/g)??[];
    assert.equal(formulas.length,done?5:0);
    const rel=parse(parts["xl/_rels/workbook.xml.rels"]).Relationships;
    assert.equal(list(rel.Relationship).length,6);
    for(const item of list(rel.Relationship))assert.ok(Object.hasOwn(parts,"xl/"+item["@Target"]));
    const styles=parse(parts["xl/styles.xml"]).styleSheet;
    assert.equal(styles.dxfs["@count"],"1");
    assert.equal(styles.dxfs.dxf.font.color["@rgb"],"FF9C0006");
    assert.equal(styles.dxfs.dxf.fill.patternFill.fgColor["@rgb"],"FFFFC7CE");
    for(let n=1;n<=5;n++)for(const cell of Object.values(cells(worksheet(parts,n))))assert.ok(Number(cell["@s"])<Number(styles.cellXfs["@count"]));
  }
  assert.equal(filenames.size,10);
});

test("F4D IF typed values, blank practice outputs and real cached string results match guided data",()=>{
  for(const scenario of S.list())for(const kind of ["practice","solution"]){
    const ex=D.exercise(scenario.id,1,"guided"),parts=archive(W.createF4Workbook(scenario.id,1,kind)),c=cells(worksheet(parts,2));
    assert.match(text(c.B1),new RegExp(ex.unit));
    for(let row=2;row<=4;row++){
      assert.equal(text(c["A"+row]),ex.labels[row-2]);
      const a=num(c["B"+row]),b=num(c["C"+row]);
      assert.equal(a,Number(ex.values["B"+row]));assert.equal(b,Number(ex.values["C"+row]));
      const answer=c["D"+row];
      if(kind==="practice")blank(answer);
      else{
        assert.equal(answer["@t"],"str");
        assert.equal(answer.f,'IF(B'+row+'>=C'+row+',"Ready","Review")');
        assert.equal(answer.v,a>=b?"Ready":"Review");
      }
    }
  }
});

test("F4D conditional sheet preserves numeric values and includes a native rule only in the solution",()=>{
  for(const scenario of S.list())for(const kind of ["practice","solution"]){
    const ex=C.exercise(scenario.id,1,"guided"),parts=archive(W.createF4Workbook(scenario.id,1,kind)),sheet=worksheet(parts,3),c=cells(sheet);
    assert.equal(num(c.D2),Number(ex.threshold));
    for(let row=2;row<=4;row++){
      assert.equal(text(c["A"+row]),ex.labels[row-2]);
      assert.equal(num(c["B"+row]),Number(ex.values["B"+row]));
    }
    // No static red fill or data rewrite substitutes for the live conditional rule.
    assert.equal(c.B2["@s"],c.B3["@s"]);assert.equal(c.B3["@s"],c.B4["@s"]);
    if(kind==="practice")assert.equal(sheet.conditionalFormatting,undefined);
    else{
      const rule=sheet.conditionalFormatting;
      assert.equal(rule["@sqref"],"B2:B4");
      assert.equal(rule.cfRule["@type"],"cellIs");
      assert.equal(rule.cfRule["@operator"],"lessThan");
      assert.equal(rule.cfRule["@dxfId"],"0");
      assert.equal(Number(rule.cfRule.formula),Number(ex.threshold));
    }
  }
});

test("F4D XLOOKUP and VLOOKUP use separate guided catalogs, typed prices, correct native formulas and caches",()=>{
  for(const scenario of S.list())for(const kind of ["practice","solution"]){
    const parts=archive(W.createF4Workbook(scenario.id,1,kind));
    for(const [n,id,formula] of [[4,"xlookup-exact","_xlfn.XLOOKUP(E2,A2:A4,C2:C4)"],[5,"vlookup-exact","VLOOKUP(E2,A2:C4,3,FALSE)"]]){
      const ex=L.exercise(id,scenario.id,1,"guided"),c=cells(worksheet(parts,n));
      assert.equal(text(c.E2),ex.values.E2);
      for(let row=2;row<=4;row++){
        assert.equal(text(c["A"+row]),ex.values["A"+row]);
        assert.equal(text(c["B"+row]),ex.values["B"+row]);
        assert.equal(num(c["C"+row]),Number(ex.values["C"+row]));
        assert.equal(c["C"+row]["@s"],ex.unit==="PHP"?"10":"2");
      }
      const matched=[2,3,4].find(row=>text(c["A"+row])===text(c.E2));
      if(kind==="practice")blank(c.F2);
      else{assert.equal(c.F2.f,formula);assert.equal(num(c.F2),num(c["C"+matched]));}
    }
  }
});

test("F4D context units, exact version guards and deterministic generation",()=>{
  assert.deepEqual(W.f4WorkbookContext("jp-ph-trade",1),{title:"Japan–Philippines second-hand trading",units:["items","items","JPY","JPY"],sheetCount:5});
  assert.deepEqual(W.f4WorkbookContext("ph-customer-quote",1).units,["PHP","PHP","PHP","PHP"]);
  assert.deepEqual(W.f4WorkbookContext("mechanical-engineering",1).units,["pieces","pieces","JPY","JPY"]);
  for(const args of [["missing",1,"practice"],["jp-ph-trade",2,"solution"],["jp-ph-trade",1,"answers"]])assert.throws(()=>W.createF4Workbook(...args));
  const before=W.createF4Workbook("jp-ph-trade",1,"solution").bytes;
  const previous=w.CommonplaceExcelDecisionFoundations;
  try{
    w.CommonplaceExcelDecisionFoundations={...previous,exercise:(...args)=>{
      const ex=previous.exercise(...args);return {...ex,dataset:{...ex.dataset,version:2}};
    }};
    assert.throws(()=>W.createF4Workbook("jp-ph-trade",1,"solution"),/material version/);
  }finally{w.CommonplaceExcelDecisionFoundations=previous;}
  assert.deepEqual(W.createF4Workbook("jp-ph-trade",1,"solution").bytes,before);
});
