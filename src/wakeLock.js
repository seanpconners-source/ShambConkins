// Keeps the phone's screen from timing out while the game is open (Screen Wake Lock API). Locking the phone
// yourself still works; the browser drops the lock when the page is hidden, so it is asked for again on return.
// Browsers without the API (or http/file pages) simply keep their normal timeout.
let lock=null,asking=false;
async function ask(){
  if(asking||lock||typeof document==='undefined'||document.hidden||!navigator.wakeLock?.request)return;
  asking=true;
  try{lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>{lock=null;});}
  catch(e){lock=null;}
  finally{asking=false;}
}
function installWakeLock(){
  if(typeof document==='undefined'||!navigator.wakeLock?.request)return;
  void ask();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void ask();});
  // some browsers refuse until the first tap: try again on taps while no lock is held
  for(const ev of ['pointerdown','keydown'])addEventListener(ev,()=>{if(!lock)void ask();},{capture:true,passive:true});
}
Object.assign(exports,{installWakeLock});
