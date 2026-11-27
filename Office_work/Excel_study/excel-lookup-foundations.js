/* F4C exact-code catalog examples; no storage or network. */
(function(global){
  'use strict';
  const curriculum=global.CommonplaceExcelCurriculum,scenarios=global.CommonplaceExcelScenarios;
  const runtime=Object.freeze({id:'personal-lookups',version:1}),rubric=Object.freeze({id:'lookup-foundations',version:1});
  const data={
    'jp-ph-trade':{codes:['JP-204','JP-101','JP-307'],labels:['Used rice cooker','Used office chair','Used electric fan'],
      guided:[2400,1800,1600],independent:[2650,1950,1750],unit:'JPY',heading:'Unit price',
      context:'Find the Japanese yen unit price for a second-hand product before preparing a Manila shipment.'},
    'ph-customer-quote':{codes:['PH-220','PH-105','PH-309'],labels:['Used dining table','Used bookshelf','Used electric fan'],
      guided:[5200,1800,950],independent:[5600,2100,1100],unit:'PHP',heading:'Quoted unit price',
      context:'Retrieve a fictional Cebu customer quotation amount by product code.'},
    'mechanical-engineering':{codes:['ME-200','ME-100','ME-300'],labels:['Bearings','M8 bolts','Spacers'],
      guided:[420,35,80],independent:[460,40,95],unit:'JPY',heading:'Component unit cost',
      context:'Retrieve a component unit cost by its part number for a mechanical assembly.'},
    'general-office':{codes:['OF-200','OF-100','OF-300'],labels:['Pens','Notebooks','Folders'],
      guided:[75,180,240],independent:[85,200,255],unit:'JPY',heading:'Supply unit price',
      context:'Look up the price of an office supply before preparing an order.'},
    'monthly-expenses':{codes:['EX-200','EX-100','EX-300'],labels:['Electricity','Rent','Transport'],
      guided:[8000,50000,12000],independent:[9000,52000,13000],unit:'JPY',heading:'Budgeted amount',
      context:'Find the budgeted amount for an expense code in a fictional monthly budget.'},
  };
  function exercise(lessonId,scenarioId,version,mode){
    const scenario=scenarios.list().find(s=>s.id===scenarioId&&s.version===version);
    if(!scenario||!Object.hasOwn(data,scenarioId)||!['guided','independent'].includes(mode)||
        !['xlookup-exact','vlookup-exact'].includes(lessonId))throw Error('Choose an exact lesson, example and mode.');
    const example=data[scenarioId],values={};
    const order=mode==='guided'?[0,1,2]:[2,0,1];
    const amounts=example[mode].map((v,i)=>v+(lessonId==='vlookup-exact'?(i+1)*10:0));
    order.forEach((index,i)=>{const row=i+2;values['A'+row]=example.codes[index];
      values['B'+row]=example.labels[index];values['C'+row]=String(amounts[index]);});
    values.E2=example.codes[lessonId==='xlookup-exact'?(mode==='guided'?1:0):(mode==='guided'?2:1)];
    return {lesson:curriculum.resolveLesson({id:lessonId,version:1}),scenario,mode,values,
      unit:example.unit,heading:example.heading,context:example.context,
      dataset:{id:'f4c-'+lessonId+'-'+scenarioId+'-'+mode,version:1}};
  }
  global.CommonplaceExcelLookupFoundations=Object.freeze({
    list:()=>curriculum.listLessons(runtime),exercise,
    evaluate:(formula,cells)=>curriculum.evaluateLookupFormula(runtime,formula,cells),
    grade:(ex,formula,cells)=>curriculum.gradeLookup(rubric,ex,formula,cells),
  });
})(window);
