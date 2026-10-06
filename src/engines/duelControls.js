const {portraitHTML}=require("src/assets.js");
// Each touch keeps its original owner until it is released, even if it crosses
// the centre line. Keyboard and on-screen holds are independent input sources.
function duelInputs(s,{vertical=false,horizontal=false,fire=false,fireLabel='',stacked=false}={}){
 const keyboard=[{},{}],buttons=[{},{}],keys=[{},{}],held=new Map(),groups=[];let portrait=false;
 const merge=()=>{for(let i=0;i<2;i++)for(const k of ['u','d','l','r','fire'])keys[i][k]=!!(keyboard[i][k]||buttons[i][k]);};
 const rebuild=()=>{for(const p of buttons)for(const k of ['u','d','l','r','fire'])p[k]=false;for(const value of held.values())if(value.key)buttons[value.owner][value.key]=true;merge();};
 const clear=()=>{const pending=[...held.values()];held.clear();for(const p of keyboard)for(const k of Object.keys(p))p[k]=false;rebuild();for(const h of pending)try{if(h.id>=0&&h.button.hasPointerCapture(h.id))h.button.releasePointerCapture(h.id);}catch{}};
 const opposite={u:'d',d:'u',l:'r',r:'l',fire:'fire'},mapping={w:[0,'u'],s:[0,'d'],a:[0,'l'],d:[0,'r'],' ':[0,'fire'],f:[0,'fire'],arrowup:[1,'u'],arrowdown:[1,'d'],arrowleft:[1,'l'],arrowright:[1,'r'],enter:[1,'fire']};
 for(const type of ['keydown','keyup'])s.on(document,type,ev=>{const binding=mapping[ev.key.toLowerCase()];if(!binding)return;ev.preventDefault();if(type==='keydown'&&(s.paused||!s.alive))return;keyboard[binding[0]][binding[1]]=type==='keydown';merge();});
 const directions=vertical?['u','d']:horizontal?['l','r']:['u','l','d','r'];if(fire)directions.push('fire');
 const arrows={u:'▲',d:'▼',l:'◀',r:'▶',fire:fireLabel||(s.game.engine==='bomber'?'BOMB':'FIRE')},descriptors=[];
 for(let i=0;i<2;i++)for(const k of directions)descriptors.push({text:arrows[k],id:`duel-${i}-${k}`});
 const nodes=s.controls(descriptors,'two-player-controls edge-controls'),root=document.getElementById('game-controls');s.body.classList.add('edge-duel-body');
 if(stacked)s.body.classList.add('compact-edge-body');
 for(let i=0;i<2;i++){
  const group=document.createElement('div');group.className='duel-side';group.dataset.player=String(i);groups.push(group);
  const name=document.createElement('strong');name.textContent=s.players[i].name;group.appendChild(name);
  const pad=document.createElement('div');pad.className='duel-pad'+(vertical?' vertical':horizontal?' horizontal':'');pad.setAttribute('aria-label',s.players[i].name+' directional pad');
  if(!fire){const head=document.createElement('span');head.className='duel-pad-head';head.innerHTML=portraitHTML(s.players[i].character,'portrait mini');pad.appendChild(head);}
  for(const [j,node]of nodes.slice(i*directions.length,(i+1)*directions.length).entries()){
   const k=directions[j];node.id=`duel-${i}-${k}`;node.dataset.direction=k;if(stacked&&k!=='fire')node.textContent=k==='l'?'↶':'↷';node.setAttribute('aria-label',s.players[i].name+' '+(k==='fire'?arrows[k]:stacked?(k==='l'?'rotate counterclockwise':'rotate clockwise'):{u:'up',d:'down',l:'left',r:'right'}[k]));pad.appendChild(node);
   s.on(node,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const flipped=!stacked&&(portrait?i===0:i===1);held.set(ev.pointerId,{id:ev.pointerId,owner:i,key:flipped?opposite[k]:k,button:node,fire:k==='fire'});if(ev.pointerId>=0)try{node.setPointerCapture(ev.pointerId);}catch{}rebuild();});
   s.on(node,'pointermove',ev=>{const h=held.get(ev.pointerId);if(!h||h.fire||s.paused||!s.alive)return;ev.preventDefault();if(stacked)return;const r=pad.getBoundingClientRect(),dx=(ev.clientX-r.left)/r.width-.5,dy=(ev.clientY-r.top)/r.height-.5;let direction=Math.max(Math.abs(dx),Math.abs(dy))<.14?null:Math.abs(dx)>Math.abs(dy)?dx<0?'l':'r':dy<0?'u':'d';if(direction&&!directions.includes(direction)&&!directions.includes(opposite[direction]))direction=null;h.key=direction;rebuild();});
   const release=ev=>{held.delete(ev.pointerId);rebuild();if(ev.pointerId>=0)try{if(node.hasPointerCapture(ev.pointerId))node.releasePointerCapture(ev.pointerId);}catch{}};
   s.on(node,'pointerup',release);s.on(node,'pointercancel',release);s.on(node,'lostpointercapture',release);
  }
  group.appendChild(pad);root.appendChild(group);
 }
 const layout=()=>{const next=!stacked&&(window.innerWidth||900)<600;if(next!==portrait)clear();portrait=next;s.body.classList.toggle('edge-portrait',portrait);groups.forEach((g,i)=>g.classList.toggle('opposed-player',portrait?i===0:i===1));};layout();merge();s.on(window,'resize',layout);s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 return keys;
}

function duelAction(s,owner,{text,id,hold,click}){
 const group=[...s.body.querySelectorAll('.duel-side')].find(g=>g.dataset.player===String(owner)),button=document.createElement('button');button.className='ctrl duel-extra';button.textContent=text;if(id)button.id=id;group.appendChild(button);
 const pointers=new Set(),paint=()=>hold?.(pointers.size>0),clear=()=>{pointers.clear();paint();};
 s.on(button,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();if(hold){pointers.add(ev.pointerId);if(ev.pointerId>=0)try{button.setPointerCapture(ev.pointerId);}catch{}paint();}click?.();});
 const up=ev=>{pointers.delete(ev.pointerId);paint();};s.on(button,'pointerup',up);s.on(button,'pointercancel',up);
 s.on(button,'click',ev=>{if(!ev.detail&&!s.paused&&s.alive)click?.();});s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);return button;
}

function ownedPointers(s, move, release = () => {}, chooseOwner = p => p.x<s.W/2?0:1) {
 const owners=new Map();
 const clear=()=>{const pending=[...owners];owners.clear();for(const [id,i] of pending){s.release({pointerId:id});release(i,id,{cancelled:true});}};
 s.on(s.c,'pointerdown',ev=>{
  if(s.paused || !s.alive)return; ev.preventDefault();
  const p=s.pointer(ev),i=chooseOwner(p);
  if([...owners.values()].includes(i))return;
  owners.set(ev.pointerId,i);s.capture(ev);move(i,p,ev.pointerId);
 });
 s.on(s.c,'pointermove',ev=>{const i=owners.get(ev.pointerId);if(i!==undefined&&!s.paused&&s.alive){ev.preventDefault();move(i,s.pointer(ev),ev.pointerId);}});
 const up=(ev,cancelled)=>{const i=owners.get(ev.pointerId);if(i===undefined)return;owners.delete(ev.pointerId);s.release(ev);release(i,ev.pointerId,{cancelled,point:s.pointer(ev)});};
 s.on(s.c,'pointerup',ev=>up(ev,false));s.on(s.c,'pointercancel',ev=>up(ev,true));s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 return owners;
}

// Keyboard holds without any on-screen buttons: map is {key: fn(isDown)} (keys compared lower-case, ' ' for space).
function keyHolds(s,map){
 const down=new Set(),fire=(k,v)=>{const f=map[k];if(f)f(v);};
 const clear=()=>{for(const k of [...down])fire(k,false);down.clear();};
 s.on(document,'keydown',ev=>{const k=ev.key.length>1?ev.key:ev.key.toLowerCase();if(!map[k])return;ev.preventDefault();if(s.paused||!s.alive||ev.repeat)return;down.add(k);fire(k,true);});
 s.on(document,'keyup',ev=>{const k=ev.key.length>1?ev.key:ev.key.toLowerCase();if(!map[k])return;down.delete(k);fire(k,false);});
 s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);return clear;
}
// Free multi-finger tracker for whole-screen single-player games. Returns {fingers:Map(id->{x,y,sx,sy,dx,dy,t0,moved})}.
// Callbacks: down(f), move(f), up(f,{cancelled,tap}) (tap = short press that barely moved).
function touchTrack(s,{down,move,up}={}){
 const fingers=new Map();
 const clear=()=>{const all=[...fingers.values()];fingers.clear();for(const f of all){s.release({pointerId:f.id});up?.(f,{cancelled:true,tap:false});}};
 s.on(s.c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev),f={id:ev.pointerId,x:p.x,y:p.y,sx:p.x,sy:p.y,dx:0,dy:0,t0:performance.now(),moved:0};fingers.set(ev.pointerId,f);s.capture(ev);down?.(f);});
 s.on(s.c,'pointermove',ev=>{const f=fingers.get(ev.pointerId);if(!f||s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev);f.x=p.x;f.y=p.y;f.dx=p.x-f.sx;f.dy=p.y-f.sy;f.moved=Math.max(f.moved,Math.hypot(f.dx,f.dy));move?.(f);});
 const end=(ev,cancelled)=>{const f=fingers.get(ev.pointerId);if(!f)return;fingers.delete(ev.pointerId);s.release(ev);up?.(f,{cancelled,tap:!cancelled&&f.moved<14&&performance.now()-f.t0<320});};
 s.on(s.c,'pointerup',ev=>end(ev,false));s.on(s.c,'pointercancel',ev=>end(ev,true));
 s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 return {fingers,clear};
}

Object.assign(exports,{duelInputs,duelAction,ownedPointers,keyHolds,touchTrack});