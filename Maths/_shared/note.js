/* Commonplace · Maths notes — shared behaviour.
   Style (paper/clean) and theme (day/night) are shared by ALL maths notes.
   Progress (ticks, checklist) is stored per note, keyed by <body data-note="A1">. */
(function(){
var NOTE=document.body.getAttribute('data-note')||'note', P='cp-maths:';
function get(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function set(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function q(s){return document.querySelector(s);} function qa(s){return document.querySelectorAll(s);}
var root=document.documentElement;

/* style + theme (also applied early by the inline head snippet to avoid a flash) */
var sb=q('#styleBtn'), tb=q('#themeBtn');
function apply(){
  var st=get(P+'style')==='clean', nt=get(P+'theme')==='night';
  if(st)root.setAttribute('data-style','clean');else root.removeAttribute('data-style');
  if(nt)root.setAttribute('data-theme','night');else root.removeAttribute('data-theme');
  if(sb)sb.textContent=st?'Style: Paper':'Style: Clean';
  if(tb)tb.textContent=nt?'◐ Day':'◐ Night';
}
if(sb)sb.onclick=function(){set(P+'style',get(P+'style')==='clean'?'paper':'clean');apply();};
if(tb)tb.onclick=function(){set(P+'theme',get(P+'theme')==='night'?'day':'night');apply();};
apply();

/* solve-by-hand ticks + score */
var probs=qa('.prob'), sc=q('#score');
function score(){if(!sc)return;var n=0;probs.forEach(function(p){if(p.classList.contains('ok'))n++;});
  sc.innerHTML='Solved <b>'+n+'</b> / '+probs.length+(n===probs.length&&n?' &nbsp;· all done':'');}
probs.forEach(function(p,i){var l=document.createElement('label');l.className='done';
  l.innerHTML='<input type="checkbox"/>I got it right';p.appendChild(l);var c=l.querySelector('input');
  var key=P+NOTE+':p'+i; c.checked=get(key)==='1';p.classList.toggle('ok',c.checked);
  c.onchange=function(){set(key,c.checked?'1':'0');p.classList.toggle('ok',c.checked);score();};});
score();

/* recall cards + checklist */
qa('.card').forEach(function(c){c.onclick=function(){c.classList.toggle('flip');};});
qa('#checklist input').forEach(function(c,i){var key=P+NOTE+':c'+i;c.checked=get(key)==='1';
  c.onchange=function(){set(key,c.checked?'1':'0');};});
})();
