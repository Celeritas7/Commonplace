/* F5A fictional register data: no network, accounts or persistence. */
(function(global){
  'use strict';
  const curriculum=global.CommonplaceExcelCurriculum,scenarios=global.CommonplaceExcelScenarios;
  const runtime=Object.freeze({id:'personal-conditional-summaries',version:1}),
    rubric=Object.freeze({id:'conditional-summary-foundations',version:1});
  const ids=['sumif-status','sumifs-status-group','countif-status'];
  const data={
    'jp-ph-trade':{labels:['Used office chairs','Used rice cookers','Used electric fans','Sample accessories','Used bookshelves','Used tables'],
      groups:['Manila','Cebu'],groupHeading:'Destination',amounts:[1800,2400,1600,0,2500,900],unit:'JPY',heading:'Batch value',
      context:'Summarize fictional second-hand stock values for shipments from Japan to Manila and Cebu.'},
    'ph-customer-quote':{labels:['Bookshelf quote','Dining table quote','Electric fan quote','Sample accessory quote','Rice cooker quote','Chair quote'],
      groups:['Cebu','Davao'],groupHeading:'Customer city',amounts:[1800,5200,950,0,2200,1450],unit:'PHP',heading:'Quoted amount',
      context:'Summarize fictional customer quotations by status and destination city.'},
    'mechanical-engineering':{labels:['M8 bolt batch','Bearing batch','Spacer batch','Spare samples','Bracket batch','Washer batch'],
      groups:['Line-A','Line-B'],groupHeading:'Assembly line',amounts:[24,8,14,0,12,20],unit:'pieces',heading:'Batch quantity',
      context:'Summarize available component quantities by readiness and assembly line.'},
    'general-office':{labels:['Notebook batch','Pen batch','Folder batch','Display samples','Envelope batch','Paper batch'],
      groups:['Front-Office','Warehouse'],groupHeading:'Office area',amounts:[12,20,8,0,16,10],unit:'items',heading:'Batch quantity',
      context:'Summarize office supply records by readiness and office area.'},
    'monthly-expenses':{labels:['Rent estimate','Electricity estimate','Transport estimate','No-cost service','Internet estimate','Supply estimate'],
      groups:['Operations','Admin'],groupHeading:'Cost group',amounts:[50000,8000,12000,0,6500,4500],unit:'JPY',heading:'Budgeted amount',
      context:'Summarize fictional expense estimates by review status and cost group.'},
  };
  function exercise(lessonId,scenarioId,version,mode){
    const scenario=scenarios.list().find(s=>s.id===scenarioId&&s.version===version);
    if(!scenario||!Object.hasOwn(data,scenarioId)||!ids.includes(lessonId)||!['guided','independent'].includes(mode))
      throw Error('Choose an exact lesson, example and mode.');
    const ex=data[scenarioId],index=ids.indexOf(lessonId),values={};
    const statuses=mode==='guided'?['Ready','Ready','Pending','Ready','Completed','Pending']:
      ['Pending','Pending','Ready','Pending','Completed','Ready'];
    const groups=[0,1,0,0,1,1],shift=(mode==='independent'?2:0)+index;
    for(let i=0;i<6;i++){
      const src=(i+shift)%6,row=i+2;
      values['A'+row]=ex.labels[src];values['B'+row]=statuses[src];
      values['C'+row]=ex.groups[groups[src]];
      values['D'+row]=String(ex.amounts[src]===0?0:ex.amounts[src]+(mode==='independent'?index+2:index));
    }
    values.F2=mode==='guided'?'Ready':'Pending';values.F3=ex.groups[0];
    return {lesson:curriculum.resolveLesson({id:lessonId,version:1}),scenario,mode,values,
      unit:ex.unit,heading:ex.heading,groupHeading:ex.groupHeading,context:ex.context,
      dataset:{id:'f5a-'+lessonId+'-'+scenarioId+'-'+mode,version:1}};
  }
  global.CommonplaceExcelSummaryFoundations=Object.freeze({
    list:()=>curriculum.listLessons(runtime),exercise,
    evaluate:(formula,cells)=>curriculum.evaluateSummaryFormula(runtime,formula,cells),
    grade:(ex,formula,cells)=>curriculum.gradeSummary(rubric,ex,formula,cells),
  });
})(window);
