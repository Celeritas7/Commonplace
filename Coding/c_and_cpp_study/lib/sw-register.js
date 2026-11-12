/* Registration must not wait for load: third-party requests can stall it. */
(function(){
  if (!('serviceWorker' in navigator) || !isSecureContext) return;
  var root=new URL('../',document.currentScript.src);
  navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.href,updateViaCache:'none'}).catch(function(){});
})();
