/* Visible on every SQL study page; independent of auth, load events and layout breakpoints. */
(()=>{
  const root=new URL('../',document.currentScript.src);
  const link=document.createElement('a');link.href=new URL('offline.html',root);link.textContent='↓ Study offline';link.id='sql-study-offline';
  link.style.cssText='display:block;position:relative;z-index:70;padding:12px 18px;min-height:44px;box-sizing:border-box;background:#234f3b;color:white;font:600 16px system-ui;text-align:center;text-decoration:none';
  document.body.prepend(link);
  if('serviceWorker' in navigator)navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.href,updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
  // Home and free-lab query drafts were previously volatile. Exercise drafts retain their own storage.
  const editor=document.getElementById('editor'),key='cp_sql_draft:'+location.pathname;
  if(editor){try{const saved=localStorage.getItem(key);if(saved!==null)editor.value=saved;}catch(_){}
    const save=()=>{try{localStorage.setItem(key,editor.value);}catch(_){link.textContent='Study offline · draft storage is full';}};
    editor.addEventListener('input',save);document.addEventListener('click',save);window.addEventListener('pagehide',save);
  }
})();
