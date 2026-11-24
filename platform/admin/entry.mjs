import {deployment} from './deployment.mjs';
import {createAdminAPI} from './api.mjs';
import {mountAdminStudio} from './studio.mjs';
const root=document.querySelector('#app');
if(!deployment){
 root.innerHTML='<main class="disabled-state panel"><p class="eyebrow">COMMONPLACE</p><h1>Admin Studio</h1><p>The central administration workspace is prepared for review. Live account management has not been activated.</p><p><a href="preview.html">Explore the sample preview</a></p><p>Your current study environment is unchanged.</p></main>';
}else{
 // Host supplies its reviewed client module, sharing the target login session.
 // No changes to the legacy gate or Google callback implementation are made here.
 try{const {client}=await import(deployment.clientModule);mountAdminStudio(root,createAdminAPI({enabled:true,client}));}
 catch{root.textContent='Admin Studio could not verify access. Reopen it from your signed-in Commonplace account.';}
}
