// Public synthetic examples. These are review fixtures, never published learner
// assignments and never a replacement for the existing curriculum/progress.
const base=(kind,id)=>({schema_version:1,kind,id,version:1});
export const SUM_CONCEPT={...base('concept','excel.sum'),section_id:'office.excel',title:'Add a range with SUM',explanation:'SUM adds the numeric values in a range of cells. The calculation stays the same when the professional context changes.',objectives:['Identify a numeric range.','Use =SUM(B2:B4) to add three values.']};
const variants={
 trade:{title:'Prepare a shipment to Manila',context:'You track second-hand Japanese products for shipment to the Philippines.',instructions:'Find the total quantity available for this shipment.',valueLabel:'Quantity',unit:'items',rows:[['Used cameras',12],['Audio players',8],['Kitchen appliances',5]]},
 mechanical:{title:'Plan an assembly',context:'You prepare components for a mechanical assembly.',instructions:'Find the total number of components required.',valueLabel:'Components',unit:'pieces',rows:[['Mounting brackets',6],['Fasteners',24],['Spacers',12]]},
 finance:{title:'Review monthly operating expenses',context:'You summarize a small company’s monthly operating expenses.',instructions:'Find the total operating expenses in JPY.',valueLabel:'Expense',unit:'JPY',rows:[['Rent',80000],['Utilities',12000],['Supplies',8000]]}
};
export function exampleBundle(key){
 const v=variants[key];if(!v)throw Error('Unknown example');
 const scenario={...base('scenario','scenario.'+key),title:v.title,context:v.context,instructions:v.instructions};
 const dataset={...base('dataset','dataset.'+key),title:v.title,columns:[{key:'item',label:'Item',type:'text',unit:''},{key:'value',label:v.valueLabel,type:'number',unit:v.unit}],rows:structuredClone(v.rows)};
 const lesson={...base('lesson','excel.sum.'+key),section_id:'office.excel',title:v.title,concept_ref:{id:SUM_CONCEPT.id,version:1},scenario_ref:{id:scenario.id,version:1},dataset_ref:{id:dataset.id,version:1},required_capabilities:['explanation.text.v1','excel.sum.b2-b4.v1'],activities:[{id:'sum',type:'sum-column',instruction:'Enter =SUM(B2:B4) in B5.',column_key:'value'}]};
 return {concept:structuredClone(SUM_CONCEPT),scenario,dataset,lesson};
}
