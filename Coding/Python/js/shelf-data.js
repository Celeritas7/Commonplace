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
 {n:"0",t:"Before You Code",c:4,nb:[],lessons:[
   "What Python is, and why it reads like English",
   "Installing Python \u2014 Anaconda, and why you already have it",
   "Three ways to run code: script, REPL, notebook",
   "Reading a traceback without panic"]},
 {n:"I",t:"The Basics",c:7,nb:["r06","r04"],lessons:[
   "Variables, names, and dynamic typing",
   "Numbers and arithmetic; //, %, **",
   "Strings \u2014 creation, indexing, slicing",
   "String methods, split, join, find, replace",
   "f-strings and formatting output",
   "input(), type conversion, and the classic bug",
   "Booleans, comparison and logical operators"]},
 {n:"II",t:"Decisions and Loops",c:5,nb:["r04","r02","r03"],lessons:[
   "if / elif / else, and nesting",
   "Truthiness, membership, and the ternary",
   "for loops and range",
   "while loops \u2014 accumulator and sentinel patterns",
   "break, continue, and loop else; nested loops and patterns"]},
 {n:"III",t:"Collections",c:6,nb:["r05"],lessons:[
   "Lists \u2014 building, mutating, growing",
   "Indexing and slicing, and the off-by-one",
   "Tuples and unpacking",
   "Dictionaries \u2014 keys, lookup, iteration",
   "Sets \u2014 membership and deduplication",
   "Comprehensions \u2014 list, dict, set"]},
 {n:"IV",t:"Functions",c:6,nb:["r08"],lessons:[
   "Defining and calling; why functions exist",
   "Parameters: positional, keyword, default",
   "*args and **kwargs",
   "Return values, multiple returns, docstrings",
   "Scope \u2014 local, global, and constants",
   "Lambdas and higher-order functions"]},
 {n:"V",t:"Errors and Debugging",c:4,nb:["r07"],lessons:[
   "try / except / else / finally",
   "Raising, custom exceptions, the hierarchy",
   "The six-step debugging routine",
   "The Mistake Bank \u2014 turning failures into drills"]},
 {n:"VI",t:"Files, Formats and the OS",c:4,nb:[],lessons:[
   "Reading and writing text files",
   "Paths that work everywhere \u2014 os and pathlib",
   "CSV \u2014 read, write, and the encoding trap",
   "JSON \u2014 load, dump, nest"]},
 {n:"VII",t:"Standard Library Toolbox",c:7,nb:["r01"],lessons:[
   "random \u2014 and how to make it repeatable",
   "math and numeric edge cases",
   "datetime and time",
   "collections \u2014 Counter, defaultdict, deque",
   "itertools \u2014 lazy combinatorics",
   "re \u2014 regular expressions, gently",
   "Scripts that behave: argparse, logging, sys"]},
 {n:"VIII",t:"Object-Oriented Python",c:5,nb:[],lessons:[
   "Why objects \u2014 the problem they solve",
   "Classes, instances, attributes, __init__",
   "Methods and state",
   "Inheritance and overriding",
   "Project \u2014 the Quiz app, refactored into objects"]},
 {n:"IX",t:"Programs People Use",c:5,nb:[],lessons:[
   "Turtle graphics \u2014 drawing with code",
   "The game loop \u2014 Snake and Pong",
   "Tkinter \u2014 windows, widgets, layout",
   "Project \u2014 Pomodoro timer and password manager",
   "Handing a script to someone else"]},
 {n:"X",t:"Talking to the Internet",c:4,nb:[],lessons:[
   "HTTP requests and JSON APIs",
   "Endpoints, parameters, and reading API docs",
   "Keys, auth and environment variables",
   "Project \u2014 an alert that runs itself"]},
 {n:"XI",t:"Data Libraries",c:11,nb:["np","pd","pdp","mpl"],lessons:[
   "NumPy \u2014 arrays, shape, dtype",
   "NumPy \u2014 vectorized operations, and why loops lose",
   "Pandas \u2014 Series and DataFrames",
   "Pandas \u2014 loading CSV, JSON, SQL",
   "Pandas \u2014 selecting, filtering, loc vs iloc",
   "Pandas \u2014 missing data, duplicates, cleaning",
   "Pandas \u2014 merge, join, concat, pivot",
   "Matplotlib \u2014 plots that explain something",
   "GroupBy \u2014 split, apply, combine",
   "Time series \u2014 dates, ranges, resampling, rolling windows",
   "Plotting with pandas and seaborn"]},
 {n:"XII",t:"Automating the Boring Stuff",c:7,nb:[],lessons:[
   "Organising files in bulk \u2014 copy, move, rename, delete",
   "Web scraping \u2014 requests and BeautifulSoup",
   "Excel spreadsheets from Python",
   "PDF and Word documents",
   "Scheduling tasks and launching programs",
   "Manipulating images",
   "Controlling the keyboard and mouse"]}
];
var R2N = {"0":0,"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9,"X":10,"XI":11,"XII":12};
function lid(p,i){ return R2N[p.n]+"."+(i+1); }
function href(p,i){ return "lessons/Py_Lesson_"+R2N[p.n]+"_"+(i+1)+".html"; }


var NBFOLDERS = [
 {id:"nb-fundamentals",t:"Fundamentals",sub:"core syntax, eight notebooks",n:8,
  items:["r01","r02","r03","r04","r05","r06","r07","r08"]},
 {id:"nb-libraries",t:"Data libraries",sub:"arrays, frames, plots",n:4,
  items:["np","pd","pdp","mpl"]},
 {id:"nb-practice",t:"Practice logs",sub:"your own runnable sets",n:9,items:[],
  links:[["●","Beginner","practice/self_practice_beginner.html"],["●","Beginner (AI study)","practice/self_practice_beginner_from_aistudy.html"],["◐","Intermediate","practice/self_practice_intermediate.html"],["◐","Intermediate (structured)","practice/self_practice_intermediate_structured.html"],["✦","Random Module","practice/random_module_practice.html"],["✦","Random Module 2","practice/random_module_practice_2.html"],["§","Section 3–14","practice/section_3_14.html"],["★","Golden Template","practice/golden_problem_template.html"],["100","100 Days","100_days/index.html"]]}
];

/* Written lessons. Regenerate with lessons/_build/build.py, which lists what is on disk. */
var SEED = {
 live:{ bookWritten:["0.1","0.2","0.3","0.4","1.1","1.2","1.3","1.4","1.5","1.6","1.7","2.1","2.2","2.3","2.4","2.5","3.1","3.2","3.3","3.4","3.5","3.6","4.1","4.2","4.3","4.4","4.5","4.6","5.1","5.2","5.3","5.4"], read:{} }
};

function state(key){
 var s = SEED[key] || SEED.live, W = {}, total = 0, read = 0, last = null;
 s.bookWritten.forEach(function(id){ W[id]=1; });
 PARTS.forEach(function(p){ total += p.c; });
 /* real reading progress wins over the seed when any is stored */
 var live = (window.PYPROGRESS && window.PYPROGRESS.read()) || {};
 var RD = Object.keys(live).length ? live : s.read;
 for (var k in RD){ if (RD[k].pct>=100) read++; if(!last||RD[k].at>last.at) last={id:k,pct:RD[k].pct,at:RD[k].at}; }
 return {key:key, W:W, read:RD, last:last,
  book:{written:s.bookWritten.length, total:total, read:read}};
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
 "nb-fundamentals":{accent:"#16352a", tint:"#dde7dd", mark:SVG('<rect x="7" y="11" width="26" height="18" rx="2.5"/><path d="M7 15.5h26" stroke-width="1"/><path d="M13 20l2.5 2.5L13 25M18.5 25.5h6"/><circle cx="10.2" cy="13.2" r=".8" fill="currentColor" stroke="none"/>')},
 "nb-libraries":{accent:"#2f6b4f", tint:"#dde7dd", mark:SVG('<path d="M20 8l11 5-11 5-11-5 11-5z"/><path d="M9 19l11 5 11-5"/><path d="M9 25l11 5 11-5"/>')},
 "nb-practice":{accent:"#a98a4b", tint:"#f4f5ec", mark:SVG('<rect x="10" y="7" width="20" height="26" rx="2"/><path d="M14 14h12M14 18.5h12M14 23h7" stroke-width="1"/><path d="M20 27.5l2.2 2.2 4.8-5"/>')}
};
function shelfMeta(id){ return SHELF[id] || {accent:"#2f6b4f", tint:"#dde7dd", mark:""}; }

return {NB:NB, PARTS:PARTS, NBFOLDERS:NBFOLDERS, R2N:R2N, lid:lid, href:href, state:state, bookmark:bookmark, ago:ago, shelfMeta:shelfMeta};
})();
