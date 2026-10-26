const {clamp}=require("src/utils.js");
// A relative joystick starts where the finger first lands. Each contact keeps
// its player across the middle; cancelling one never clears the other player.
function arenaGestures(s,{players=2,horizontal=false,onAction=null,onTap=null}={}){
 const fingers=new Map(),keyboard=Array.from({length:players},()=>({})),input=Array.from({length:players},()=>({x:0,y:0,fire:false}));
 const refresh=()=>{for(let i=0;i<players;i++){
  const k=keyboard[i],f=[...fingers.values()].find(f=>f.owner===i);
  input[i].x=clamp((k.r?1:0)-(k.l?1:0)+(f?clamp((f.point.x-f.origin.x)/48,-1,1):0),-1,1);
  input[i].y=horizontal?0:clamp((k.d?1:0)-(k.u?1:0)+(f?clamp((f.point.y-f.origin.y)/48,-1,1):0),-1,1);
  if(Math.abs(input[i].x)<.12)input[i].x=0;if(Math.abs(input[i].y)<.12)input[i].y=0;input[i].fire=!!k.fire;
 }};
 const clear=()=>{for(const id of fingers.keys())s.release({pointerId:id});fingers.clear();for(const k of keyboard)for(const key of Object.keys(k))k[key]=false;refresh();};
 s.controls([]);s.body.classList.add('drag-arena-body','gesture-arena-body');s.queueCanvasFit?.();
 s.on(s.c,'pointerdown',ev=>{if(s.paused||!s.alive||ev.button>0||!Number.isFinite(ev.clientX)||!Number.isFinite(ev.clientY))return;const owner=s.online?s.online.me:players===1||s.solo?.kind==='cpu'?0:s.pointer(ev).x<s.W/2?0:1;if([...fingers.values()].some(f=>f.owner===owner))return;ev.preventDefault();const point={x:ev.clientX,y:ev.clientY};fingers.set(ev.pointerId,{owner,origin:point,point,moved:false,acted:false});s.capture(ev);refresh();});
 const move=ev=>{const f=fingers.get(ev.pointerId);if(!f||s.paused||!s.alive)return;ev.preventDefault();f.point={x:ev.clientX,y:ev.clientY};const dx=f.point.x-f.origin.x,dy=f.point.y-f.origin.y;f.moved||=Math.hypot(dx,dy)>12;if(dy<-25&&!f.acted){f.acted=true;onAction?.(f.owner);}if(dy>-10)f.acted=false;refresh();};
 s.on(s.c,'pointermove',move);
 const release=(ev,cancelled)=>{const f=fingers.get(ev.pointerId);if(!f)return;if(!cancelled){move(ev);if(!s.paused&&s.alive&&!f.moved)onTap?.(f.owner);}fingers.delete(ev.pointerId);s.release(ev);refresh();};
 s.on(s.c,'pointerup',ev=>release(ev,false));s.on(s.c,'pointercancel',ev=>release(ev,true));s.on(s.c,'lostpointercapture',ev=>release(ev,true));
 const map=players===1?{a:[0,'l'],d:[0,'r'],w:[0,'u'],s:[0,'d'],arrowleft:[0,'l'],arrowright:[0,'r'],arrowup:[0,'u'],arrowdown:[0,'d'],' ':[0,'fire'],enter:[0,'fire']}:{a:[0,'l'],d:[0,'r'],w:[0,'u'],s:[0,'d'],arrowleft:[1,'l'],arrowright:[1,'r'],arrowup:[1,'u'],arrowdown:[1,'d'],' ':[0,'fire'],enter:[1,'fire']};
 for(const type of ['keydown','keyup'])s.on(document,type,ev=>{if(['INPUT','TEXTAREA','SELECT'].includes(ev.target?.tagName))return;let m=map[ev.key?.toLowerCase()];if(!m)return;if(s.online)m=[s.online.me,m[1]];ev.preventDefault();if(type==='keydown'&&(s.paused||!s.alive))return;keyboard[m[0]][m[1]]=type==='keydown';if(type==='keydown'&&!ev.repeat&&(m[1]==='fire'||horizontal&&m[1]==='u'))(m[1]==='fire'?onTap||onAction:onAction)?.(m[0]);refresh();});
 s.on(window,'blur',clear);s.on(window,'resize',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 // CPU opponent: cpu({l,r,u,d}) holds player 2's directions; cpuAct() is a jump/fire press (i: another player, e.g. an online test bot's own)
 const cpu=(keys={},i=1)=>{const k=keyboard[i];if(!k)return;for(const n of ['l','r','u','d'])k[n]=!!keys[n];refresh();},cpuAct=(i=1)=>{if(!s.paused&&s.alive)(onTap||onAction)?.(i);};
 return {input,keyboard,fingers,clear,cpu,cpuAct};
}

function gestureHint(x,s,controls){
 const r=Math.max(12,Math.min(s.W,s.H)*.045);
 for(const f of controls.fingers.values()){
  const rect=s.c.getBoundingClientRect();if(!rect.width||!rect.height)continue;const sx=s.W/rect.width,sy=s.H/rect.height,ox=(f.origin.x-rect.left)*sx,oy=(f.origin.y-rect.top)*sy,px=(f.point.x-rect.left)*sx,py=(f.point.y-rect.top)*sy;
  x.save();x.strokeStyle=f.owner?'#ffadd588':'#9bccff88';x.lineWidth=2;x.beginPath();x.arc(ox,oy,r,0,Math.PI*2);x.stroke();x.beginPath();x.moveTo(ox,oy);x.lineTo(px,py);x.stroke();x.restore();
 }
}

Object.assign(exports,{arenaGestures,gestureHint});