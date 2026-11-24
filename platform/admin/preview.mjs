import {mountAdminStudio} from './studio.mjs';
// Synthetic visual preview only. No login identities or requests are used.
const sections=[
 {id:'office',parent_id:null,title:'Office Work',kind:'hub'},
 {id:'office.excel',parent_id:'office',title:'Excel Study',kind:'section'},
 {id:'office.vba',parent_id:'office',title:'VBA and Macros',kind:'section'},
 {id:'coding',parent_id:null,title:'Coding',kind:'hub'},
 {id:'coding.python',parent_id:'coding',title:'Python',kind:'section'},
 {id:'coding.sql',parent_id:'coding',title:'SQL',kind:'section'},
 {id:'mechanical',parent_id:null,title:'Mechanical',kind:'hub'},
 {id:'mechanical.gdt',parent_id:'mechanical',title:'Geometric Dimensioning & Tolerancing',kind:'section'}
];
const members=[{user_id:'preview-owner',display_name:'Administrator',email:'Preview only · no account',role:'administrator',status:'active',revision:'0',allowed:[]},
 {user_id:'preview-learner',display_name:'Sample learner',email:'Preview only · no account',role:'learner',status:'active',revision:'0',allowed:['office.excel']}];
const profiles=new Map(),groups=[];
const api={
 async profile(id){return structuredClone({...profiles.get(id)||{profile:{},revision:'0',group_ids:[]},groups});},
 async saveProfile(id,revision,profile,group_ids){profiles.set(id,{profile:structuredClone(profile),revision:String(Number(revision)+1),group_ids:[...group_ids]});},
 async saveGroup(group){const i=groups.findIndex(g=>g.id===group.id);if(i<0)groups.push({...group,id:'preview-group-'+groups.length,revision:'1'});else groups[i]={...group,revision:String(Number(group.revision)+1)};},async load(){return structuredClone({members,sections});},async register(){throw Error('Registration requires a verified login in the activated platform. This preview does not create accounts.');},
 async save(draft){const i=members.findIndex(m=>m.user_id===draft.user_id);members[i]={...structuredClone(draft),revision:String(Number(draft.revision)+1)};},onInvalidate(){return ()=>{};},dispose(){}};
mountAdminStudio(document.querySelector('#app'),api,{preview:true});
