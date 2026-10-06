const {clamp}=require("src/utils.js");
const {circle,COLORS}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
// Uniform units preserve round houses and heads while the rink fills its frame.
function curlingGeometry(width,height){const scale=Math.max(1,height)/360,W=Math.max(1,width)/scale,r=Math.min(78,W*.22);return {W,H:360,scale,r,origin:{x:W/2,y:310},house:{x:W/2,y:Math.max(r+16,72)}};}
async function curling(s){
 const[c,x]=s.canvas(680,360,{fill:true});s.body.classList.add('drag-arena-body');
 const stones=[];let g=curlingGeometry(s.W,s.H),stone,shot=0,player=0,drag=null,moving=false,shotTime=0,settling=false;
 function measure(){const next=curlingGeometry(s.W,s.H);if(next.W!==g.W){const factor=next.W/g.W;for(const st of [...stones,...(stone?[stone]:[])]){st.x*=factor;st.vx*=factor;}if(drag)drag.x*=factor;}g=next;return g;}
 const point=ev=>{measure();const p=s.pointer(ev);return {x:p.x/g.scale,y:p.y/g.scale};};
 function clear(){if(drag)s.release({pointerId:drag.id});drag=null;}
 function reset(){measure();stone={...g.origin,vx:0,vy:0,player};clear();moving=false;shotTime=0;}
 async function settle(){
  if(settling||!s.alive)return;settling=true;stone.vx=stone.vy=0;stones.push(stone);shot++;
  if(shot===6){const distance=st=>Math.hypot(st.x-g.house.x,st.y-g.house.y),eligible=stones.filter(st=>distance(st)<g.r+12).sort((a,b)=>distance(a)-distance(b)),score=[0,0];
   if(eligible.length){const win=eligible[0].player,nearestOther=Math.min(...eligible.filter(st=>st.player!==win).map(distance),Infinity);score[win]=eligible.filter(st=>st.player===win&&distance(st)<nearestOther).length;}return s.finish(score,'Six alternating curling stones · closest stones in the house score.');
  }
  player=1-player;reset();if(!await s.pass(player,'Next stone. Closest stones in the house score. You can knock the opposition away.'))return;settling=false;
 }
 s.on(c,'pointerdown',ev=>{if(moving||s.paused||settling||drag)return;const p=point(ev);if(Math.hypot(p.x-stone.x,p.y-stone.y)<60){drag={...p,id:ev.pointerId};s.capture(ev);}});
 s.on(c,'pointermove',ev=>{if(drag?.id===ev.pointerId)drag={...point(ev),id:ev.pointerId};});
 s.on(c,'pointerup',ev=>{if(drag?.id!==ev.pointerId)return;const p=point(ev);clear();if(s.paused||moving||settling)return;const dx=g.origin.x-p.x,dy=g.origin.y-p.y,l=Math.hypot(dx,dy);if(l<8)return;const speed=Math.min(150,l)*3.4;stone.vx=dx/l*speed;stone.vy=dy/l*speed;moving=true;sound('tap');});
 for(const type of ['pointercancel','lostpointercapture'])s.on(c,type,ev=>{if(drag?.id===ev.pointerId)clear();});s.resetOnPause?.(clear);s.cleanup(clear);s.on(window,'blur',clear);s.on(window,'resize',clear);
 s.hint('Six alternating stones. Drag back from your stone and release toward the house. A small pull travels a long way on ice. Knock opposing stones away.');
 s.frame(dt=>{
  measure();if(moving&&!settling){shotTime+=dt;const all=[stone,...stones];
   for(const st of all){st.x+=st.vx*dt;st.y+=st.vy*dt;st.vx*=Math.pow(.984,dt*60);st.vy*=Math.pow(.984,dt*60);if(st.x<17||st.x>g.W-17){st.x=clamp(st.x,17,g.W-17);st.vx*=-.6;}if(st.y<17||st.y>g.H-17){st.y=clamp(st.y,17,g.H-17);st.vy*=-.45;}}
   for(const st of stones){const dx=stone.x-st.x,dy=stone.y-st.y,d=Math.hypot(dx,dy);if(d<29&&d>0){const nx=dx/d,ny=dy/d,impulse=(stone.vx-st.vx)*nx+(stone.vy-st.vy)*ny;if(impulse<0){stone.vx-=impulse*nx*.85;stone.vy-=impulse*ny*.85;st.vx+=impulse*nx*.85;st.vy+=impulse*ny*.85;}stone.x+=nx*(29-d)/2;stone.y+=ny*(29-d)/2;st.x-=nx*(29-d)/2;st.y-=ny*(29-d)/2;}}
   if(shotTime>7||all.every(st=>Math.hypot(st.vx,st.vy)<5))void settle();
  }
  if(!s.alive)return;const k=g.scale;x.fillStyle='#c8d6cc';x.fillRect(0,0,s.W,s.H);
  x.strokeStyle='#829e98';x.lineWidth=3;x.strokeRect(5,5,s.W-10,s.H-10);
  for(const[r,color]of [[g.r,'#587789'],[g.r*.705,'#ede9d6'],[g.r*.385,'#a9554c']])circle(x,g.house.x*k,g.house.y*k,r*k,color);
  x.strokeStyle='#899f92';x.lineWidth=2;x.beginPath();x.moveTo(10,(g.H-85)*k);x.lineTo(s.W-10,(g.H-85)*k);x.stroke();
  for(const st of [...stones,stone]){circle(x,st.x*k,st.y*k,14*k,COLORS[st.player]);s.sprite(x,st.player,st.x*k,st.y*k,clamp(28*k,24,48),{exact:true});}
  s.marker?.(x,player,stone.x*k,stone.y*k,38);
  if(drag){x.strokeStyle='#516959';x.setLineDash([5,5]);x.beginPath();x.moveTo(g.origin.x*k,g.origin.y*k);x.lineTo((g.origin.x+(g.origin.x-drag.x)*2)*k,(g.origin.y+(g.origin.y-drag.y)*2)*k);x.stroke();x.setLineDash([]);}
  s.status(`${s.players[player].name} · stone ${Math.min(shot+1,6)}/6 · aim for the house`);s.debug={stone,stones,shot,player,moving,settling,geometry:g,drag};
 });
 reset();await s.pass(player,'Six alternating stones on a full-screen rink. Pull back gently from your stone, then release toward the house.');
}

Object.assign(exports,{curlingGeometry,curling});