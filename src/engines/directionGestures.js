// Screen-relative swipes and a movable held-finger direction control. Distances
// are CSS pixels, so steering does not change with canvas resolution or zoom.
function directionGestures(s,move,{players=1,repeat=0,tap=null,threshold=12,onTap=null}={}){
 const fingers=new Map(),keyboard=Array.from({length:players},()=>({})),keys=Array.from({length:players},()=>({}));
 const names=['u','d','l','r'],name=(dx,dy)=>dx<0?'l':dx>0?'r':dy<0?'u':'d';
 const rebuild=()=>{for(let i=0;i<players;i++)for(const k of names)keys[i][k]=!!keyboard[i][k];for(const f of fingers.values())if(f.direction)keys[f.owner][name(...f.direction)]=true;};
 const clear=()=>{const held=[...fingers.keys()];fingers.clear();for(const row of keyboard)for(const k of names)row[k]=false;rebuild();for(const id of held)s.release({pointerId:id});};
 s.controls([]);s.body.classList.add('drag-arena-body','gesture-arena-body');s.queueCanvasFit?.();
 const usable=()=>s.alive&&!s.paused;
 function steer(f,ev){
  if(!Number.isFinite(ev.clientX)||!Number.isFinite(ev.clientY))return;
  f.point=s.pointer(ev);const dx=ev.clientX-f.x,dy=ev.clientY-f.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<threshold)return;
  const direction=Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)];
  // Rebase after every segment: a long right drag can turn up immediately,
  // without returning to the original touch or lifting the finger.
  f.x=ev.clientX;f.y=ev.clientY;f.moved=true;
  if(!f.direction||direction.some((v,i)=>v!==f.direction[i])){f.direction=direction;f.clock=0;rebuild();move(f.owner,...direction);}
 }
 s.on(s.c,'pointerdown',ev=>{
  if(!usable()||!Number.isFinite(ev.clientX)||!Number.isFinite(ev.clientY)||ev.button>0)return;
  // vs CPU the human owns every touch, online (s.online) this phone's player does
  const point=s.pointer(ev),owner=s.online&&players>1?s.online.me:players===1||s.solo?.kind==='cpu'?0:point.x<s.W/2?0:1;
  if([...fingers.values()].some(f=>f.owner===owner))return;
  ev.preventDefault();fingers.set(ev.pointerId,{owner,x:ev.clientX,y:ev.clientY,point,direction:null,clock:0,moved:false});s.capture(ev);
 });
 s.on(s.c,'pointermove',ev=>{const f=fingers.get(ev.pointerId);if(!f||!usable())return;ev.preventDefault();steer(f,ev);});
 const release=(ev,cancelled)=>{const f=fingers.get(ev.pointerId);if(!f)return;if(!cancelled&&usable()){steer(f,ev);if(!f.moved){if(tap)move(f.owner,...tap);onTap?.(f.owner);}}fingers.delete(ev.pointerId);s.release(ev);rebuild();};
 s.on(s.c,'pointerup',ev=>release(ev,false));s.on(s.c,'pointercancel',ev=>release(ev,true));s.on(s.c,'lostpointercapture',ev=>release(ev,true));
 const bindings=players===1?{arrowup:[0,0,-1],arrowdown:[0,0,1],arrowleft:[0,-1,0],arrowright:[0,1,0],w:[0,0,-1],s:[0,0,1],a:[0,-1,0],d:[0,1,0]}:{w:[0,0,-1],s:[0,0,1],a:[0,-1,0],d:[0,1,0],arrowup:[1,0,-1],arrowdown:[1,0,1],arrowleft:[1,-1,0],arrowright:[1,1,0]};
 for(const type of ['keydown','keyup'])s.on(document,type,ev=>{if(['INPUT','TEXTAREA','SELECT'].includes(ev.target?.tagName))return;const binding=bindings[ev.key?.toLowerCase()];if(!binding)return;ev.preventDefault();const [o,dx,dy]=binding,owner=s.online&&players>1?s.online.me:o;if(type==='keydown'){if(!usable())return;keyboard[owner][name(dx,dy)]=true;rebuild();move(owner,dx,dy);}else{keyboard[owner][name(dx,dy)]=false;rebuild();}});
 if(repeat)s.frame(dt=>{for(const f of fingers.values())if(f.direction){f.clock+=dt;if(f.clock>=repeat){f.clock%=repeat;move(f.owner,...f.direction);}}});
 s.on(window,'blur',clear);s.on(window,'resize',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 return {fingers,keys,clear};
}

// Cell identities stay fixed through rotation; only their drawn coordinates
// resize, so a larger field never discards food, pellets, players or trails.
function gestureGrid(W,H,cols,rows,padding=8){
 const width=Math.max(1,W-padding*2),height=Math.max(1,H-padding*2);
 return {ox:padding,oy:padding,sx:width/cols,sy:height/rows,width,height,cols,rows};
}

function drawDirectionFeedback(x,controls){
 for(const f of controls.fingers.values())if(f.direction){const [dx,dy]=f.direction;x.save();x.globalAlpha=.8;x.fillStyle=f.owner?'#ffb1d7':'#a8dbff';x.font='bold 22px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(dx<0?'◀':dx>0?'▶':dy<0?'▲':'▼',f.point.x,f.point.y-27);x.restore();}
}

Object.assign(exports,{directionGestures,gestureGrid,drawDirectionFeedback});