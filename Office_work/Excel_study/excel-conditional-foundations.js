/* F4B independent fictional data, separate from IF and all earlier lessons. */
(function(global) {
  'use strict';
  const curriculum = global.CommonplaceExcelCurriculum;
  const scenarios = global.CommonplaceExcelScenarios;
  const runtime = Object.freeze({ id:'personal-conditional-formatting', version:1 });
  const rubric = Object.freeze({ id:'conditional-foundations', version:1 });
  const data = {
    'jp-ph-trade': { labels:['Used office chairs','Used rice cookers','Used electric fans'],
      unit:'items', heading:'Ready stock', context:'Flag batches with too few items ready for a shipment from Japan to Manila.',
      guided:{values:[6,3,5],threshold:5}, independent:{values:[7,9,4],threshold:7} },
    'ph-customer-quote': { labels:['Used bookshelf','Used dining table','Used electric fan'],
      unit:'PHP', heading:'Offered price', context:'Flag fictional offers below the minimum accepted amount for a Cebu buyer.',
      guided:{values:[1600,900,1200],threshold:1200}, independent:{values:[1500,2100,1100],threshold:1500} },
    'mechanical-engineering': { labels:['M8 bolts','Bearings','Spacers'],
      unit:'pieces', heading:'Available components', context:'Flag component bins below a minimum stock requirement.',
      guided:{values:[20,6,12],threshold:12}, independent:{values:[15,24,9],threshold:15} },
    'general-office': { labels:['Notebooks','Pens','Folders'],
      unit:'items', heading:'Available supplies', context:'Flag low office supplies for replenishment.',
      guided:{values:[16,4,10],threshold:10}, independent:{values:[8,12,3],threshold:8} },
    'monthly-expenses': { labels:['Rent','Electricity','Transport'],
      unit:'JPY', heading:'Reserve balance', context:'Flag fictional expense reserves below a common review threshold.',
      guided:{values:[18000,6000,10000],threshold:10000}, independent:{values:[12000,20000,8000],threshold:12000} },
  };
  function exercise(id, version, mode) {
    const scenario = scenarios.list().find(s => s.id === id && s.version === version);
    if (!scenario || !Object.hasOwn(data,id) || !['guided','independent'].includes(mode))
      throw Error('Choose an exact example and practice mode.');
    const example = data[id], selected = example[mode];
    return { lesson:curriculum.resolveLesson({ id:'highlight-below-target',version:1 }),
      scenario, mode, values:Object.fromEntries(selected.values.map((v,i)=>['B'+(i+2),String(v)])),
      threshold:String(selected.threshold), labels:[...example.labels], unit:example.unit,
      heading:example.heading, context:example.context,
      dataset:{id:'f4b-'+id+'-'+mode,version:1} };
  }
  global.CommonplaceExcelConditionalFoundations = Object.freeze({
    list:()=>curriculum.listLessons(runtime), exercise,
    apply:rule=>curriculum.validateConditionalRule(runtime,rule),
    view:(rule,cells)=>curriculum.conditionalView(runtime,rule,cells),
    grade:(ex,rule,cells)=>curriculum.gradeConditional(rubric,ex,rule,cells),
  });
})(window);
