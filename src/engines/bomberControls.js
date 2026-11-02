// Bomber duel touch controls (ROADMAP D5, "controls too hard"): a floating joystick per player instead of swipes.
// Put a finger down anywhere on your half and drag: the stick appears where you touched and follows if you drag far.
// Plant a bomb with a quick tap, a second finger, or the BOMB button drawn in your bottom corner, so you can plant
// while moving. Keys: P1 WASD + Space, P2 arrows + Enter (one player: either set).
// createBomberControls(s,{players}) → {vec(i) → {x,y} (each -1..1, null = idle), onBomb(fn), draw(x), clear()}.
const DEAD=9,FOLLOW=46,TAP_MS=200,TAP_PX=12;
function createBomberControls(s,{players=2}={}){
 const sticks=new Map(),keys=Array.from({length:2},()=>({u:0,d:0,l:0,r:0}));let bombCb=null;
 const solo=()=>players===1||!!s.online||s.solo?.kind==='cpu';
 const ownerAt=pt=>s.online?s.online.me:solo()?0:pt.x<s.W/2?0:1;
 const btnR=()=>Math.max(30,Math.min(46,Math.min(s.W,s.H)*.075));
 // the BOMB button sits in the owner's outer bottom corner (one player: bottom right)
 function button(i){const r=btnR(),m=r+14;return solo()?{x:s.W-m,y:s.H-m,r}:{x:i?s.W-m:m,y:s.H-m,r};}
 const usable=()=>s.alive&&!s.paused;
 const bomb=i=>{if(usable())bombCb?.(i);};
 s.controls([]);s.body.classList.add('drag-arena-body','gesture-arena-body');s.queueCanvasFit?.();
 s.on(s.c,'pointerdown',ev=>{if(!usable()||ev.button>0)return;const pt=s.pointer(ev),i=ownerAt(pt);ev.preventDefault();
  const b=button(i);if(Math.hypot(pt.x-b.x,pt.y-b.y)<b.r*1.25){b.flash=.2;flash[i]=.2;bomb(i);return;}
  // a second finger while this player is already steering = plant
  if([...sticks.values()].some(f=>f.owner===i)){bomb(i);return;}
  sticks.set(ev.pointerId,{owner:i,ox:pt.x,oy:pt.y,x:pt.x,y:pt.y,t:performance.now(),moved:false});s.capture(ev);});
 s.on(s.c,'pointermove',ev=>{const f=sticks.get(ev.pointerId);if(!f)return;ev.preventDefault();const pt=s.pointer(ev);f.x=pt.x;f.y=pt.y;
  const dx=f.x-f.ox,dy=f.y-f.oy,l=Math.hypot(dx,dy);if(l>TAP_PX)f.moved=true;if(l>FOLLOW){f.ox=f.x-dx/l*FOLLOW;f.oy=f.y-dy/l*FOLLOW;}});
 const up=(ev,cancel)=>{const f=sticks.get(ev.pointerId);if(!f)return;sticks.delete(ev.pointerId);s.release(ev);if(!cancel&&!f.moved&&performance.now()-f.t<TAP_MS)bomb(f.owner);};
 s.on(s.c,'pointerup',ev=>up(ev,false));s.on(s.c,'pointercancel',ev=>up(ev,true));s.on(s.c,'lostpointercapture',ev=>up(ev,true));
 const KB={w:[0,'u'],s:[0,'d'],a:[0,'l'],d:[0,'r'],arrowup:[1,'u'],arrowdown:[1,'d'],arrowleft:[1,'l'],arrowright:[1,'r']};
 for(const type of ['keydown','keyup'])s.on(document,type,ev=>{if(['INPUT','TEXTAREA','SELECT'].includes(ev.target?.tagName))return;const k=ev.key?.toLowerCase();
  if(type==='keydown'&&!ev.repeat&&(k===' '||k==='enter')){ev.preventDefault();bomb(solo()?(s.online?s.online.me:0):k===' '?0:1);return;}
  const b=KB[k];if(!b)return;ev.preventDefault();const i=solo()?(s.online?s.online.me:0):b[0];keys[i][b[1]]=type==='keydown'?1:0;});
 const flash=[0,0];
 function vec(i){for(const f of sticks.values())if(f.owner===i){const dx=f.x-f.ox,dy=f.y-f.oy,l=Math.hypot(dx,dy);if(l<DEAD)return null;const k=Math.min(1,l/FOLLOW);return {x:dx/l*k,y:dy/l*k};}
  const k=keys[i],x=k.r-k.l,y=k.d-k.u;return x||y?{x,y}:null;}
 function draw(g,dt=1/60){for(let i=0;i<(solo()?1:2);i++){const own=s.online?s.online.me:i,b=button(own);flash[own]=Math.max(0,flash[own]-dt);const on=flash[own]>0;
   g.save();g.globalAlpha=on?.95:.55;g.fillStyle=on?'#ffd23f':'#14141c';g.beginPath();g.arc(b.x,b.y,b.r*(on?1.08:1),0,Math.PI*2);g.fill();g.lineWidth=3;g.strokeStyle='#fff';g.stroke();
   g.globalAlpha=1;g.fillStyle=on?'#14141c':'#fff';g.font=`900 ${Math.round(b.r*.42)}px "Arial Black",system-ui`;g.textAlign='center';g.textBaseline='middle';g.fillText('BOMB',b.x,b.y+1);g.restore();}
  for(const f of sticks.values()){g.save();g.globalAlpha=.4;g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(f.ox,f.oy,FOLLOW,0,Math.PI*2);g.stroke();
   const dx=f.x-f.ox,dy=f.y-f.oy,l=Math.hypot(dx,dy)||1,k=Math.min(l,FOLLOW);g.globalAlpha=.7;g.fillStyle=f.owner?'#ef6393':'#367cde';g.beginPath();g.arc(f.ox+dx/l*k,f.oy+dy/l*k,20,0,Math.PI*2);g.fill();g.restore();}}
 function clear(){for(const id of sticks.keys())s.release({pointerId:id});sticks.clear();for(const k of keys)k.u=k.d=k.l=k.r=0;}
 s.on(window,'blur',clear);
 return {vec,onBomb:fn=>{bombCb=fn;},draw,clear,button};}
Object.assign(exports,{createBomberControls});
