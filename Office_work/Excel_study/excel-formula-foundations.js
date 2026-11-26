/* F1: bounded beginner formula practice, using fictional versioned D1 data. */
(function(global){
  'use strict';
  const range="B2:B4";
  const lessons=[
    {id:"sum",fn:"SUM",title:"SUM — Add values",concept:"SUM adds numeric cells in a range. Empty cells are ignored; a zero is a number. Use SUM instead of typing a fixed total so Excel can recalculate when inputs change.",task:"Calculate the total",question:"Which formula adds all three numeric cells?",choices:["=SUM(B2:B4)","=COUNT(B2:B4)","=SUM(A2:A4)"],answer:0,explanation:"SUM(B2:B4) adds the numbers in column B from rows 2 through 4."},
    {id:"average",fn:"AVERAGE",title:"AVERAGE — Find the mean",concept:"AVERAGE adds the numeric cells and divides by the number of numeric cells. Blank cells do not contribute to the count, but zero does. A decimal answer is valid even for item counts.",task:"Find the average of the recorded values",question:"B2 contains 12, B3 is blank and B4 contains 6. What does AVERAGE(B2:B4) return?",choices:["6","9","18"],answer:1,explanation:"The sum is 18 and there are two numeric cells, so 18 ÷ 2 = 9."},
    {id:"count",fn:"COUNT",title:"COUNT — Count numeric cells",concept:"COUNT counts cells containing numbers, not the total quantity of items. A numeric zero counts as one cell. Blank cells and text in a referenced range are ignored.",task:"Count the entries with recorded numbers",question:"B2 contains 0, B3 is blank and B4 contains 5. What does COUNT(B2:B4) return?",choices:["5","1","2"],answer:2,explanation:"Zero and five are both numbers; only the blank is excluded."},
    {id:"min",fn:"MIN",title:"MIN — Find the smallest value",concept:"MIN returns the smallest numeric value in a range. It ignores blank cells. It does not tell you the corresponding product name; that requires a lookup or another method.",task:"Find the smallest recorded value",question:"Which formula finds the smallest numeric value in B2:B4?",choices:["=MIN(B2:B4)","=MAX(B2:B4)","=AVERAGE(B2:B4)"],answer:0,explanation:"MIN returns the smallest of the numeric entries."},
    {id:"max",fn:"MAX",title:"MAX — Find the largest value",concept:"MAX returns the largest numeric value in a range. It ignores blanks, and it works with negative numbers too. Use it to identify the highest quantity or cost.",task:"Find the largest recorded value",question:"The three recorded values are -7, -2 and -5. Which is MAX?",choices:["-7","-2","0"],answer:1,explanation:"-2 is the greatest number, even though all entries are negative."}
  ];
  const clone=x=>JSON.parse(JSON.stringify(x));
  function lesson(id){const l=lessons.find(x=>x.id===id);if(!l)throw Error("Unknown lesson.");return clone(l);}
  function scenario(id,version){
    const s=global.CommonplaceExcelScenarios?.list().find(x=>x.id===id&&x.version===version);
    if(!s)throw Error("Unknown scenario version.");
    return s;
  }
  function exercise(id,scenarioId,version,mode="guided"){
    if(!["guided","independent"].includes(mode))throw Error("Unknown practice mode.");
    const l=lesson(id),s=scenario(scenarioId,version),values=s.values.map(String);
    if(mode==="independent"){
      if(id==="count"||id==="average")values[1]="";
      else values[1]=String(s.revised);
    }
    const unit=l.fn==="COUNT"?"numeric cells":s.unit;
    return {lesson:l,scenario:s,mode,values,unit,formula:"="+l.fn+"("+range+")",
      instruction:l.task+" in B5 using "+l.fn+". "+(mode==="independent"?"Keep the three starting cells unchanged.":"You can change the inputs to explore how the formula behaves.")};
  }
  const syntax=global.CommonplaceExcelFormulaSyntax;
  function numeric(values){
    if(!Array.isArray(values)||values.length!==3||Object.keys(values).length!==3||![0,1,2].every(i=>Object.hasOwn(values,i)))throw Error("Three input cells are required.");
    return values.flatMap(v=>{
      const value=syntax.numericCell(v,{allowBlank:true});
      return value===null?[]:[value];
    });
  }
  function evaluate(formula,values){
    const parsed=syntax.parse(formula);
    if(!parsed)throw Error("Use SUM, AVERAGE, COUNT, MIN or MAX on B2:B4. Keep each function name and cell reference together.");
    const nums=numeric(values),fn=parsed.fn;
    if(fn==="AVERAGE"&&!nums.length)return {fn,result:null,error:"#DIV/0!"};
    const sum=nums.reduce((a,b)=>a+b,0);
    const result=fn==="SUM"?sum:fn==="AVERAGE"?sum/nums.length:fn==="COUNT"?nums.length:fn==="MIN"?(nums.length?Math.min(...nums):0):(nums.length?Math.max(...nums):0);
    return {fn,result:Number(result.toPrecision(15)),error:null};
  }
  function sameInputs(a,b){
    // Input preservation is a separate criterion even when the formula fails.
    // Validate the cells themselves before comparing numeric/blank equivalence.
    try{numeric(a);numeric(b);}catch(e){return false;}
    return a.length===b.length&&a.every((v,i)=>v.trim()===""?b[i].trim()==="":b[i].trim()!==""&&Number(v)===Number(b[i]));
  }
  function grade(ex,formula,values){
    // The rubric uses the assigned task rather than comparing a hard-coded output.
    let evaluated=null;
    try{evaluated=evaluate(formula,values);}catch(e){}
    const correct=syntax.parse(formula)?.canonical===ex.formula;
    const criteria=[{label:"Correct function and B2:B4 range",passed:correct},
      {label:"Valid calculation for the entered formula",passed:!!evaluated&&!evaluated.error}];
    if(ex.mode==="independent")criteria.push({label:"Original exercise inputs preserved",passed:sameInputs(values,ex.values)});
    const score=criteria.filter(c=>c.passed).length;
    return {score,maxScore:criteria.length,passed:score===criteria.length,criteria,evaluated};
  }
  global.CommonplaceExcelFormulaFoundations={list:()=>clone(lessons),exercise,evaluate,grade};
})(window);
