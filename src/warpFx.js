// The warp transition: the screen goes wavy, both heads spin and fly at the
// camera, the board is swapped under a white flash, then the heads land in the
// new place. Used when entering and leaving a warp zone.
const {store}=require("src/state.js");
const {portraitHTML}=require("src/assets.js");
const {tone}=require("src/audio.js");
const {escapeHTML:e}=require("src/utils.js");
let filterNode=null;
function ensureFilter(){
 if(filterNode&&filterNode.isConnected)return filterNode;
 const holder=document.createElement('div');holder.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
 holder.innerHTML='<svg width="0" height="0" aria-hidden="true"><filter id="warp-wave" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence id="warp-turb" type="turbulence" baseFrequency="0.004 0.012" numOctaves="2" seed="3" result="t"/><feDisplacementMap id="warp-disp" in="SourceGraphic" in2="t" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>';
 document.body.append(holder);filterNode=holder;return holder;
}
function wobble(app,from,to,ms,reduced){
 return new Promise(resolve=>{
  const disp=document.getElementById('warp-disp'),turb=document.getElementById('warp-turb');
  if(reduced||!disp){resolve();return;}
  const start=performance.now();app.style.filter='url(#warp-wave)';
  const step=now=>{const t=Math.min(1,(now-start)/ms),k=from+(to-from)*t;disp.setAttribute('scale',String(Math.round(k)));turb.setAttribute('baseFrequency',`${(.004+.004*Math.sin(now/180)).toFixed(4)} ${(.012+.01*Math.cos(now/230)).toFixed(4)}`);if(t<1)requestAnimationFrame(step);else resolve();};
  requestAnimationFrame(step);
 });
}
function sweep(up){for(let i=0;i<7;i++)setTimeout(()=>tone(up?220*2**(i/4):1100*2**(-i/4),.16,.04,'triangle'),i*95);}
// apply(): swap the board while the screen is covered. title/subtitle appear on landing.
async function warpTransition(apply,{title='',subtitle='',icon='🌀'}={}){
 const run=store.run,reduced=store.profile?.settings.reducedMotion,app=document.getElementById('app');
 ensureFilter();
 const fx=document.createElement('div');fx.className='warp-fx';
 fx.innerHTML=`<div class="warp-swirl"></div><div class="warp-heads">${run.players.map((p,i)=>`<span class="warp-head h${i}">${portraitHTML(p.character,'portrait','win')}</span>`).join('')}</div><div class="warp-flash"></div><div class="warp-title"><b>${e(icon)} ${e(title)}</b><small>${e(subtitle)}</small></div>`;
 document.body.append(fx);
 const heads=[...fx.querySelectorAll('.warp-head')],swirl=fx.querySelector('.warp-swirl'),flash=fx.querySelector('.warp-flash'),label=fx.querySelector('.warp-title');
 const wait=ms=>new Promise(r=>setTimeout(r,reduced?Math.min(ms,40):ms));
 if(!reduced){
  swirl.animate([{opacity:0,transform:'scale(.2) rotate(0deg)'},{opacity:1,transform:'scale(1.3) rotate(540deg)'}],{duration:1250,easing:'ease-in',fill:'forwards'});
  heads.forEach((h,i)=>h.animate([{transform:`translate(${i?'70px':'-70px'},0) scale(.5) rotate(0deg)`,opacity:1},{transform:`translate(${i?'20px':'-20px'},0) scale(1.4) rotate(${i?-720:720}deg)`,opacity:1,offset:.55},{transform:`translate(0,0) scale(9) rotate(${i?-1440:1440}deg)`,opacity:1}],{duration:1250,easing:'cubic-bezier(.5,0,.9,.4)',fill:'forwards'}));
 }
 sweep(true);
 await wobble(app,0,reduced?0:80,1250,reduced);
 flash.animate([{opacity:0},{opacity:1}],{duration:reduced?10:180,fill:'forwards'});await wait(220);
 apply();
 swirl.style.display='none';
 label.animate([{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'scale(1)'}],{duration:reduced?10:450,fill:'forwards',easing:'cubic-bezier(.2,1.5,.4,1)'});
 if(!reduced){
  heads.forEach((h,i)=>h.animate([{transform:`translate(0,0) scale(9) rotate(${i?1440:-1440}deg)`,opacity:1},{transform:`translate(${i?'70px':'-70px'},24px) scale(.9) rotate(0deg)`,opacity:1,offset:.7},{transform:`translate(${i?'70px':'-70px'},30px) scale(.5) rotate(0deg)`,opacity:1}],{duration:1100,easing:'cubic-bezier(.2,.8,.3,1)',fill:'forwards'}));
  flash.animate([{opacity:1},{opacity:0}],{duration:420,fill:'forwards'});
 }
 sweep(false);
 await wobble(app,reduced?0:80,0,1000,reduced);
 await wait(900);
 app.style.filter='';
 fx.animate([{opacity:1},{opacity:0}],{duration:reduced?10:380,fill:'forwards'});await wait(400);fx.remove();
}
Object.assign(exports,{warpTransition});
