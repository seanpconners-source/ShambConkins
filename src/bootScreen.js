// The loading screen in index.template.html (#boot) shows while the browser reads and starts the game script. Once the
// first screen is up: fill the bar, fade it out, and remember how long this start took so the next bar is timed right.
const {VERSION}=require("src/version.js");
function bootDone(){
 const b=document.getElementById('boot');if(!b)return;
 try{localStorage.setItem('sc-boot-ms',String(Math.round(performance.now())));localStorage.setItem('sc-boot-version',VERSION);}catch{}
 b.classList.add('bt-done');setTimeout(()=>b.remove(),400);
}
Object.assign(exports,{bootDone});
