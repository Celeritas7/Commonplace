/* Registration must not wait for load: third-party requests can stall it. */
(function(){
  var root=new URL('../',document.currentScript.src);
  // Visible even when the shared gate hides the study page. No data is cleared.
  function loginHelp() {
    var card=document.querySelector('#cp-gate .g-card');
    if(!card || card.querySelector('.cpp-login-help')) return;
    var help=document.createElement('p');help.className='cpp-login-help';
    help.style.cssText='font-size:13px;margin:16px 0 0';
    help.textContent='Safari and the Home Screen app keep separate sign-ins. Start sign-in and prepare downloads inside the app you use to study. ';
    var repair=document.createElement('a');repair.href=new URL('offline-repair.html?nocache=1',root).href;
    repair.textContent='Update / repair C++ setup (keeps saved work)';
    help.appendChild(repair);card.appendChild(help);
  }
  var observer=new MutationObserver(loginHelp);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',loginHelp);
  if (!('serviceWorker' in navigator) || !isSecureContext) return;
  // Keep the active worker during offline reopening, including a repair worker.
  // Starting a replacement install while disconnected can stall navigation.
  if (navigator.onLine === false) return;
  navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.href,updateViaCache:'none'}).catch(function(){});
})();
