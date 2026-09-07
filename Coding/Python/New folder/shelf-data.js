/* Shared shelf data for the Python launcher prototype.
   Written ids and read progress are prototype stand-ins; in the real page
   READ comes from localStorage "cp_py_read" = { "0.1": {pct, at} }. */
window.PYSHELF = (function () {
var NB = {
 r01:["01","Random Module","fundamentals/01_random_module.html"],
 r02:["02","For Loops","fundamentals/02_for_loops.html"],
 r03:["03","While Loops","fundamentals/03_while_loops.html"],
 r04:["04","If / Else","fundamentals/04_if_else.html"],
 r05:["05","Lists, Tuples & Dicts","fundamentals/05_lists_tuples_dicts.html"],
 r06:["06","Strings","fundamentals/06_strings.html"],
 r07:["07","Exceptions","fundamentals/07_exceptions.html"],
 r08:["08","Functions","fundamentals/08_functions.html"],
 np:["▤","NumPy","libraries/numpy.html"],
 pd:["▤","Pandas","libraries/pandas.html"],
 pdp:["✎","Pandas — Practice","libraries/pandas_practice.html"],
 mpl:["◠","Matplotlib","libraries/matplotlib.html"]
};
var PARTS = [
 {n:"0",t:"Before You Code",c:4,nb:[],lessons:["What Python is, and why it reads like English","Installing Python — Anaconda","Script, REPL, notebook","Reading a traceback without panic"]},
 {n:"I",t:"The Basics",c:7,nb:["r06"],lessons:["Names and values","Numbers, and what int really means","Strings as sequences","True, False and None","Input and print","Comments, docstrings and style","Asking a value what it is: type()"]},
 {n:"II",t:"Decisions and Loops",c:5,nb:["r04","r02","r03"],lessons:["if, elif, else","for, and what it walks over","while, break, continue","range and enumerate","Comprehensions, briefly"]},
 {n:"III",t:"Collections",c:6,nb:["r05"],lessons:["Lists","Tuples","Dictionaries","Sets","Slicing everything","Choosing a container"]},
 {n:"IV",t:"Functions",c:6,nb:["r08"]},
 {n:"V",t:"Errors and Debugging",c:4,nb:["r07"]},
 {n:"VI",t:"Files, Formats and the OS",c:4,nb:[]},
 {n:"VII",t:"Standard Library Toolbox",c:7,nb:["r01"]},
 {n:"VIII",t:"Object-Oriented Python",c:5,nb:[]},
 {n:"IX",t:"Programs People Use",c:5,nb:[]},
 {n:"X",t:"Talking to the Internet",c:4,nb:[]},
 {n:"XI",t:"Data Libraries",c:11,nb:["np","pd","pdp","mpl"]},
 {n:"XII",t:"Automating the Boring Stuff",c:7,nb:[]}
];
var R2N = {"0":0,"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9,"X":10,"XI":11,"XII":12};
function lid(p,i){ return R2N[p.n]+"."+(i+1); }
function href(p,i){ return "lessons/Py_Lesson_"+R2N[p.n]+"_"+(i+1)+".html"; }

var MODS = [
 {id:"numpy",t:"NumPy",sub:"arrays, shapes, broadcasting",nb:"np",
  lessons:["Why arrays and not lists","Shape, dtype, and the mental picture","Indexing and slicing views","Broadcasting rules","Reductions along an axis"]},
 {id:"pandas",t:"Pandas",sub:"frames, indexes, grouping",nb:"pd",
  lessons:["A frame is columns of arrays","The index is not a row number","Selecting: loc, iloc, boolean","Grouping and aggregating","Reshaping: pivot and melt","Reading real files"]},
 {id:"matplotlib",t:"Matplotlib",sub:"figures, axes, plots",nb:"mpl",lessons:[]},
 {id:"random",t:"random",sub:"stdlib · sampling and seeds",nb:"r01",lessons:[]}
];

var NBFOLDERS = [
 {id:"nb-fundamentals",t:"Fundamentals",sub:"core syntax, eight notebooks",n:8,
  items:["r01","r02","r03","r04","r05","r06","r07","r08"]},
 {id:"nb-libraries",t:"Data libraries",sub:"arrays, frames, plots",n:4,
  items:["np","pd","pdp","mpl"]},
 {id:"nb-practice",t:"Practice logs",sub:"your own runnable sets",n:9,items:[],
  links:[["●","Beginner","practice/self_practice_beginner.html"],["●","Beginner (AI study)","practice/self_practice_beginner_from_aistudy.html"],["◐","Intermediate","practice/self_practice_intermediate.html"],["◐","Intermediate (structured)","practice/self_practice_intermediate_structured.html"],["✦","Random Module","practice/random_module_practice.html"],["✦","Random Module 2","practice/random_module_practice_2.html"],["§","Section 3–14","practice/section_3_14.html"],["★","Golden Template","practice/golden_problem_template.html"],["100","100 Days","100_days/index.html"]]}
];

/* ---- prototype states ---- */
var SEED = {
 /* "live": no seeded reading — progress-adapter.js supplies the real thing */
 live:{ bookWritten:["0.1"], read:{}, mods:{} },
 fresh:{ bookWritten:["0.1"], read:{}, mods:{} },
 today:{ bookWritten:["0.1"], read:{"0.1":{pct:62,at:Date.now()-2*864e5}}, mods:{} },
 later:{ bookWritten:(function(){var a=["0.1","0.2","0.3","0.4"];for(var i=1;i<=7;i++)a.push("1."+i);for(i=1;i<=5;i++)a.push("2."+i);for(i=1;i<=4;i++)a.push("3."+i);return a})(),
   read:{"0.1":{pct:100,at:Date.now()-40*864e5},"0.2":{pct:100,at:Date.now()-38*864e5},"0.3":{pct:100,at:Date.now()-35*864e5},"0.4":{pct:100,at:Date.now()-33*864e5},"1.1":{pct:100,at:Date.now()-30*864e5},"1.2":{pct:100,at:Date.now()-28*864e5},"1.3":{pct:100,at:Date.now()-20*864e5},"1.4":{pct:100,at:Date.now()-12*864e5},"1.5":{pct:38,at:Date.now()-5*36e5}},
   mods:{numpy:{w:3,r:2},pandas:{w:1,r:0}} }
};

function state(key){
 var s = SEED[key] || SEED.today, W = {}, total = 0, read = 0, last = null;
 s.bookWritten.forEach(function(id){ W[id]=1; });
 PARTS.forEach(function(p){ total += p.c; });
 /* real reading progress wins over the seed when any is stored */
 var live = (window.PYPROGRESS && window.PYPROGRESS.read()) || {};
 var RD = Object.keys(live).length ? live : s.read;
 for (var k in RD){ if (RD[k].pct>=100) read++; if(!last||RD[k].at>last.at) last={id:k,pct:RD[k].pct,at:RD[k].at}; }
 var mods = MODS.map(function(m){
  var st = s.mods[m.id];
  return {id:m.id,t:m.t,sub:m.sub,nb:m.nb,lessons:m.lessons,c:m.lessons.length||0,w:st?st.w:0,r:st?st.r:0};
 });
 return {key:key, W:W, read:RD, last:last,
  book:{written:s.bookWritten.length, total:total, read:read}, mods:mods};
}

function ago(t){var d=Math.round((Date.now()-t)/864e5);if(d<1)return"today";if(d===1)return"yesterday";if(d<30)return d+" days ago";return Math.round(d/30)+" mo ago";}

function bookmark(S){
 var first = PARTS[0];
 if (!S.last) return {kick:"Begin",title:first.lessons[0],href:href(first,0),
   meta:'Lesson 0.1 &middot; Part 0, Before You Code &middot; <b>about 12 min</b>',cta:"Open the first lesson &rarr;"};
 var pi = +S.last.id.split(".")[0], li = +S.last.id.split(".")[1]-1, P = PARTS[pi];
 var tl = (P.lessons||[])[li] || ("Lesson "+S.last.id);
 var done = S.last.pct>=100, nextId = pi+"."+(li+2), hasNext = S.W[nextId], ntl = (P.lessons||[])[li+1];
 if (done && hasNext) return {kick:"Next",title:ntl,href:href(P,li+1),
   meta:'Lesson '+nextId+' &middot; '+P.t+' &middot; finished '+S.last.id+' '+ago(S.last.at),cta:"Continue reading &rarr;"};
 if (done) return {kick:"Re-read",title:tl,href:href(P,li),
   meta:'Lesson '+S.last.id+' &middot; '+P.t+' &middot; read '+ago(S.last.at)+' &middot; <b>next lesson not written yet</b>',cta:"Open again &rarr;"};
 return {kick:"Bookmark",title:tl,href:href(P,li),
   meta:'Lesson '+S.last.id+' &middot; '+P.t+' &middot; <span class="mark-bar"><i style="width:'+S.last.pct+'%"></i></span> <b>'+S.last.pct+'% read</b> &middot; '+ago(S.last.at),cta:"Continue reading &rarr;"};
}

/* ---- per-shelf accent + line-drawn mark (house style: thin strokes, no emoji) ---- */
var SVG = function (inner) { return '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>'; };
var SHELF = {
 "python-book":{accent:"#16352a", tint:"#dde7dd", mark:SVG('<path d="M20 11v20"/><path d="M20 11c-3-2.2-7-3-11-2.6v19.2c4-.4 8 .4 11 2.6"/><path d="M20 11c3-2.2 7-3 11-2.6v19.2c-4-.4-8 .4-11 2.6"/><path d="M12.5 14.5h4.5M12.5 18.5h4.5M23 14.5h4.5M23 18.5h4.5" stroke-width="1"/>')},
 numpy:{accent:"#2f6b4f", tint:"#dde7dd", mark:SVG('<rect x="9" y="9" width="22" height="22" rx="2"/><path d="M9 16.3h22M9 23.7h22M16.3 9v22M23.7 9v22" stroke-width="1"/><rect x="16.3" y="16.3" width="7.4" height="7.4" fill="currentColor" opacity=".18" stroke="none"/>')},
 pandas:{accent:"#a98a4b", tint:"#f4f5ec", mark:SVG('<rect x="8" y="10" width="24" height="20" rx="2"/><path d="M8 16h24"/><path d="M16 16v14M24 16v14M8 23h24" stroke-width="1"/><rect x="8" y="10" width="24" height="6" fill="currentColor" opacity=".16" stroke="none"/>')},
 matplotlib:{accent:"#3c8362", tint:"#dde7dd", mark:SVG('<path d="M10 9v22h22"/><path d="M13 26c3.4 0 4.6-11 8-11s4.6 7 8 7"/><circle cx="21" cy="15" r="1.5" fill="currentColor" stroke="none"/><path d="M10 20h2M10 14h2M17 31v-2M25 31v-2" stroke-width="1"/>')},
 random:{accent:"#234f3b", tint:"#f4f5ec", mark:SVG('<rect x="9" y="9" width="15" height="15" rx="3"/><rect x="19" y="19" width="12" height="12" rx="3"/><circle cx="13.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="19.5" cy="19.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="16.5" cy="16.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="25" cy="25" r="1.2" fill="currentColor" stroke="none"/>')},
 "nb-fundamentals":{accent:"#16352a", tint:"#dde7dd", mark:SVG('<rect x="7" y="11" width="26" height="18" rx="2.5"/><path d="M7 15.5h26" stroke-width="1"/><path d="M13 20l2.5 2.5L13 25M18.5 25.5h6"/><circle cx="10.2" cy="13.2" r=".8" fill="currentColor" stroke="none"/>')},
 "nb-libraries":{accent:"#2f6b4f", tint:"#dde7dd", mark:SVG('<path d="M20 8l11 5-11 5-11-5 11-5z"/><path d="M9 19l11 5 11-5"/><path d="M9 25l11 5 11-5"/>')},
 "nb-practice":{accent:"#a98a4b", tint:"#f4f5ec", mark:SVG('<rect x="10" y="7" width="20" height="26" rx="2"/><path d="M14 14h12M14 18.5h12M14 23h7" stroke-width="1"/><path d="M20 27.5l2.2 2.2 4.8-5"/>')}
};
function shelfMeta(id){ return SHELF[id] || {accent:"#2f6b4f", tint:"#dde7dd", mark:""}; }

return {NB:NB, PARTS:PARTS, MODS:MODS, NBFOLDERS:NBFOLDERS, R2N:R2N, lid:lid, href:href, state:state, bookmark:bookmark, ago:ago, shelfMeta:shelfMeta};
})();
