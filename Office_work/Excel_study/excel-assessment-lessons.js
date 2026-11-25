/* Public synthetic exercises; checks are declarative data, not executable code. */
(function(global){
  'use strict';
  global.CommonplaceExcelAssessments=[
    {id:'stock-revision',version:1,title:'Update the warehouse stock total',
      scenario:'A small warehouse is preparing supplies for a shipment. The pens quantity has increased from 8 to 10.',
      task:'Update the pens quantity in B3 to 10. Keep the other quantities unchanged. Calculate the revised total in B5 using SUM.',
      blankFormula:true,
      criteria:[
        {id:'quantity',skill:'cell-editing',label:'Updated pens quantity',cell:'B3',property:'value',expected:'10'},
        {id:'unchanged',skill:'data-accuracy',label:'Other quantities unchanged',all:[{cell:'B2',property:'value',expected:'12'},{cell:'B4',property:'value',expected:'5'}]},
        {id:'formula',skill:'sum-formula',label:'SUM formula',property:'formula',expected:'=SUM(B2:B4)'},
        {id:'total',skill:'calculation',label:'Calculated stock total',cell:'B5',property:'value',expected:'27'}
      ]},
    {id:'stock-heading',version:1,title:'Prepare a readable stock-list heading',
      scenario:'A colleague needs to identify the product-list heading quickly.',
      task:'Make the Item heading in A1 bold, apply the sample yellow fill and add a border. Keep the heading text unchanged.',
      blankFormula:false,
      criteria:[
        {id:'bold',skill:'font-bold',label:'Bold heading',cell:'A1',property:'bold',expected:true},
        {id:'fill',skill:'fill-color',label:'Highlighted heading',cell:'A1',property:'fill',expected:true},
        {id:'border',skill:'cell-borders',label:'Border applied',cell:'A1',property:'border',expected:true},
        {id:'text',skill:'data-accuracy',label:'Original heading retained',cell:'A1',property:'value',expected:'Item'}
      ]},
    {id:'stock-copy',version:1,title:'Correct two matching stock quantities',
      scenario:'A count confirms that the pens and notebooks both have the same quantity.',
      task:'Make B3 match the notebooks quantity in B2. Do not change B2 or B4. Recalculate the stock total in B5.',
      blankFormula:true,
      criteria:[
        {id:'destination',skill:'cell-editing',label:'Pens match notebooks',cell:'B3',property:'value',expected:'12'},
        {id:'source',skill:'data-accuracy',label:'Other quantities unchanged',all:[{cell:'B2',property:'value',expected:'12'},{cell:'B4',property:'value',expected:'5'}]},
        {id:'formula',skill:'sum-formula',label:'SUM formula',property:'formula',expected:'=SUM(B2:B4)'},
        {id:'total',skill:'calculation',label:'Calculated stock total',cell:'B5',property:'value',expected:'29'}
      ]}
  ];
})(window);
