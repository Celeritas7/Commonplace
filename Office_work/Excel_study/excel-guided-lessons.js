/* Guided sample lessons. Plain data only; no executable lesson callbacks. */
(function(global){
  'use strict';
  global.CommonplaceExcelGuidedLessons=[
    {
      id:'sum-basics',title:'Calculate the total stock',context:'You have three product quantities in a small warehouse. Learn to calculate the total stock in Excel.',
      steps:[
        {instruction:'Select cell B5, where the total will appear.',expect:{type:'select',cell:'B5'}},
        {instruction:'Open the Home tab in the Ribbon.',expect:{type:'tab',tab:'Home'}},
        {instruction:'Find AutoSum (Σ) in Home → Editing. Click it to calculate the three quantities.',expect:{type:'tool',tab:'Home',group:'Editing',tool:'AutoSum',cell:'B5',formula:'=SUM(B2:B4)',state:{address:'B5',value:'25'}}}
      ],
      success:'You calculated 25 items using AutoSum. The formula is =SUM(B2:B4).'
    },
    {
      id:'format-header',title:'Make a product-list heading stand out',context:'Make the first heading easier for your colleagues to identify when reviewing a stock list.',
      steps:[
        {instruction:'Select cell A1, the Item heading.',expect:{type:'select',cell:'A1'}},
        {instruction:'Open the Home tab.',expect:{type:'tab',tab:'Home'}},
        {instruction:'In Home → Font, click Bold (B) to make the selected heading bold.',expect:{type:'tool',tab:'Home',group:'Font',tool:'Bold',cell:'A1',state:{address:'A1',bold:true}}},
        {instruction:'In Home → Font, click Fill Color to add the sample yellow background. Keep the heading bold.',expect:{type:'tool',tab:'Home',group:'Font',tool:'Fill Color',cell:'A1',state:{address:'A1',bold:true,fill:true}}}
      ],
      success:'The Item heading is bold and highlighted with a yellow background.'
    }
  ];
})(window);
