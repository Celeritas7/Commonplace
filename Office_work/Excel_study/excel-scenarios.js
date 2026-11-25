/* Fictional preview scenarios. These are not profiles, permissions or assigned content. */
(function(global){
  'use strict';
  const scenarios=[
    {id:'general-office',version:1,title:'General office',context:'Count supplies in a small office warehouse.',heading:'Item',quantity:'Quantity',unit:'items',labels:['Notebooks','Pens','Folders'],values:[12,8,5],revised:10},
    {id:'jp-ph-trade',version:1,title:'Japan–Philippines second-hand trading',context:'Prepare a stock count for used goods in Japan awaiting shipment to Manila, Philippines.',heading:'Product',quantity:'Quantity',unit:'items',labels:['Used office chairs','Used rice cookers','Used electric fans'],values:[6,4,9],revised:7},
    {id:'mechanical-engineering',version:1,title:'Mechanical engineering',context:'Count components for a mechanical assembly bill of materials.',heading:'Component',quantity:'Quantity',unit:'pieces',labels:['M8 bolts','Bearings','Spacers'],values:[24,4,14],revised:8},
    {id:'monthly-expenses',version:1,title:'Finance and expenses',context:'Prepare a fictional monthly office expense summary in Japanese yen.',heading:'Expense',quantity:'Cost (JPY)',unit:'JPY',labels:['Rent','Electricity','Transport'],values:[50000,8000,12000],revised:10000}
  ];
  const copy=x=>JSON.parse(JSON.stringify(x));
  const total=s=>s.values.reduce((a,b)=>a+b,0);
  const revisedTotal=s=>s.values[0]+s.revised+s.values[2];
  const matchingTotal=s=>s.values[0]*2+s.values[2];
  function select(id){return copy(scenarios.find(s=>s.id===id)||scenarios[0]);}
  function guided(s,base){
    const [sum,format]=copy(base);
    sum.title='Calculate the total — '+s.title;
    sum.context=s.context+' Use AutoSum to add the three values.';
    sum.steps[2].instruction='Find AutoSum (Σ) in Home → Editing. Click it to calculate the total.';
    sum.steps[2].expect.state.value=String(total(s));
    sum.success='You calculated '+total(s)+' '+s.unit+' using =SUM(B2:B4).';
    format.title='Format the '+s.heading.toLowerCase()+' heading';
    format.context=s.context+' Make the heading easy to identify.';
    format.steps[0].instruction='Select cell A1, the '+s.heading+' heading.';
    format.success='The '+s.heading+' heading is bold and highlighted with a yellow background.';
    return [sum,format];
  }
  function assessments(s,base){
    const [revision,heading,matching]=copy(base),[a,b,c]=s.values,[first,second]=s.labels;
    revision.title='Update a value and recalculate';
    revision.scenario=s.context+' The value for '+second+' changes from '+b+' to '+s.revised+'.';
    revision.task='Update B3 to '+s.revised+'. Keep B2 and B4 unchanged. Calculate the revised total in B5 using SUM.';
    revision.criteria[0].label='Updated '+second+' value';
    revision.criteria[0].expected=String(s.revised);
    revision.criteria[1].label='Other values unchanged';
    revision.criteria[1].all[0].expected=String(a);
    revision.criteria[1].all[1].expected=String(c);
    revision.criteria[3].label='Calculated revised total';
    revision.criteria[3].expected=String(revisedTotal(s));
    heading.title='Format the '+s.heading.toLowerCase()+' heading';
    heading.scenario=s.context+' A colleague needs a readable heading.';
    heading.task='Make the '+s.heading+' heading in A1 bold, apply the sample yellow fill and add a border. Keep the heading text unchanged.';
    heading.criteria[3].expected=s.heading;
    matching.title='Match two values and recalculate';
    matching.scenario=s.context+' The value for '+second+' should match '+first+'.';
    matching.task='Make B3 match B2. Keep B2 and B4 unchanged. Recalculate B5 using SUM.';
    matching.criteria[0].label=second+' matches '+first;
    matching.criteria[0].expected=String(a);
    matching.criteria[1].label='Other values unchanged';
    matching.criteria[1].all[0].expected=String(a);
    matching.criteria[1].all[1].expected=String(c);
    matching.criteria[3].label='Calculated matching total';
    matching.criteria[3].expected=String(matchingTotal(s));
    return [revision,heading,matching].map(x=>({...x,scenario_id:s.id,scenario_version:s.version,scenario_title:s.title}));
  }
  function worksheet(s){
    return {title:s.title,heading:s.heading,quantity:s.quantity,rows:s.labels.map((label,i)=>[label,s.values[i]]),unit:s.unit,total:total(s)};
  }
  global.CommonplaceExcelScenarios={list:()=>copy(scenarios),select,guided,assessments,worksheet,total,revisedTotal,matchingTotal};
})(window);
