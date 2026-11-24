export const PROFILE_FIELDS=Object.freeze([
 {key:'background',label:'Professional background'},
 {key:'occupation',label:'Current occupation'},
 {key:'industry',label:'Industry'},
 {key:'responsibilities',label:'Work responsibilities',list:true},
 {key:'existing_knowledge',label:'Existing knowledge and strengths'},
 {key:'learning_objectives',label:'Learning objectives',list:true},
 {key:'preferred_language',label:'Preferred learning language'},
 {key:'countries_markets',label:'Countries and markets',list:true},
 {key:'currencies_units',label:'Currencies and units',list:true},
 {key:'difficulty',label:'Preferred difficulty'},
 {key:'scenarios',label:'Professional scenarios',list:true},
 {key:'additional_requirements',label:'Additional learning requirements'}
]);
export function validateProfile(profile){
 if(!profile||typeof profile!=='object'||Array.isArray(profile))throw Error('Profile must be an object.');
 if(new TextEncoder().encode(JSON.stringify(profile)).length>32768)throw Error('Profile is too large.');
 const out={};
 for(const [key,value] of Object.entries(profile)){
  const field=PROFILE_FIELDS.find(f=>f.key===key);if(!field)throw Error('Unsupported profile field: '+key);
  if(field.list){if(!Array.isArray(value)||value.length>20||value.some(v=>typeof v!=='string'||[...v].length>300))throw Error(field.label+': use up to 20 lines, 300 characters per line.');out[key]=[...value];}
  else{if(typeof value!=='string'||[...value].length>2000)throw Error(field.label+': maximum 2,000 characters.');
   if(key==='difficulty'&&!['','beginner','intermediate','advanced','mixed'].includes(value))throw Error('Choose a supported difficulty.');out[key]=value;}
 }
 return out;
}
// No identity/account envelope is accepted. U5 must still show a human review
// before external copy; arbitrary free text may contain names or indirect clues.
export function promptProfile(profile){
 const clean=validateProfile(profile);
 function redact(text){return text
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email removed]')
  .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,'[identifier removed]')
  .replace(/https?:\/\/[^\s]+/gi,'[link removed]')
  .replace(/\b(?:eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sb_(?:secret|publishable)_[A-Za-z0-9_-]+)\b/g,'[credential removed]');}
 return Object.fromEntries(Object.entries(clean).map(([k,v])=>[k,Array.isArray(v)?v.map(redact):redact(v)]));
}
// Reusable scenario template, never an account or a permission grant.
export const IMPORT_EXPORT_BEGINNER=Object.freeze({
 background:'Sales and brokerage',occupation:'Working in a small Japanese import-export company dealing with second-hand products',industry:'Second-hand goods import-export',
 responsibilities:['Product inventory','Customer inquiries and sales follow-ups','Quotations, shipping and payment tracking'],
 existing_knowledge:'Communication, negotiation, customer persuasion and sales. Beginner in Excel.',
 learning_objectives:['Product inventory management','Customer inquiry tracking','Sales follow-ups','Customer quotation preparation','JPY to PHP currency conversion','Shipping and transportation costs','Profit calculations','Customer payment tracking','Monthly sales reporting'],
 preferred_language:'',countries_markets:['Japan','Philippines'],currencies_units:['JPY','PHP'],difficulty:'beginner',
 scenarios:['Prepare a quotation for second-hand Japanese products shipped to the Philippines.','Track stock, shipping costs, payments and profit for an import-export sale.'],additional_requirements:''
});
