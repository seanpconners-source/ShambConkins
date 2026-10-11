// BF-18: two-human, physical-screen-owner inputs. No world or persistence mutations.
// Call after s.canvas(...,{fill:true}); no modules.json registration until integration.
function createBroforceInputState(){
 const users=Array.from({length:2},()=>({movement:new Map(),jump:new Set(),fire:new Set(),special:new Set(),jumpEdge:false,specialEdge:false}));
 const valid=i=>i===0||i===1;
 const direction=n=>Number.isFinite(n)?Math.sign(n):0;
 function setMove(i,source,value){if(!valid(i)||source==null)return;const u=users[i],v=direction(value);if(v)u.movement.set(source,v);else u.movement.delete(source);}
 function press(i,action,source){if(!valid(i)||source==null||!['jump','fire','special'].includes(action))return;const u=users[i],held=u[action];if(held.has(source))return;if(held.size===0&&action!=='fire')u[action+'Edge']=true;held.add(source);}
 function release(i,action,source){if(valid(i)&&['jump','fire','special'].includes(action))users[i][action].delete(source);}
 function clear(){for(const u of users){u.movement.clear();u.jump.clear();u.fire.clear();u.special.clear();u.jumpEdge=false;u.specialEdge=false;}}
 function sample(){return users.map(u=>{let n=0;for(const v of u.movement.values())n+=v;const result={move:Math.sign(n),jumpPressed:u.jumpEdge,jumpHeld:u.jump.size>0,fireHeld:u.fire.size>0,specialPressed:u.specialEdge};u.jumpEdge=false;u.specialEdge=false;return result;});}
 return {setMove,press,release,clear,sample};
}

function attachBroforceControls(s,{onChange}={}){
 if(!s||!s.c||!s.body||typeof s.on!=='function')throw new TypeError('BF-18 requires a mounted GameSession canvas and listeners');
 const input=createBroforceInputState(),frame=s.c.parentElement;
 if(!frame)throw new TypeError('BF-18 canvas has no frame');
 const documentRoot=s.c.ownerDocument||document,win=documentRoot.defaultView||window;
 const pointers=new Map(),keys=new Map(),zones=[],pads=[],knobs=[],buttons=[{},{}];
 let disposed=false,dimensions=null;
 const notify=()=>{if(!disposed&&typeof onChange==='function')onChange();};
 const css=(node,properties)=>Object.assign(node.style,properties);
 function node(tag,className,parent){const el=documentRoot.createElement(tag);el.className=className;if(parent)parent.appendChild(el);return el;}
 const original={framePosition:frame.style.position,canvasTouch:s.c.style.touchAction};
 if(!frame.style.position||frame.style.position==='static')frame.style.position='relative';
 s.c.style.touchAction='none';
 const hadArena=s.body.classList.contains('drag-arena-body');
 if(!hadArena)s.body.classList.add('drag-arena-body');
 const overlay=node('div','bf18-control-surface',frame);
 css(overlay,{position:'absolute',inset:'0',zIndex:'5',pointerEvents:'none',userSelect:'none',WebkitUserSelect:'none',touchAction:'none',overflow:'hidden'});
 overlay.setAttribute('role','group');overlay.setAttribute('aria-label','Broforce two-player controls');
 const symbols={jump:'↑',fire:'●',special:'★'};
 for(let i=0;i<2;i++){
  const side=node('div','bf18-side bf18-player-'+(i+1),overlay),name=s.players?.[i]?.name||'Player '+(i+1);
  zones.push(side);
  css(side,{position:'absolute',bottom:'calc(env(safe-area-inset-bottom, 0px) + 7px)',left:i===0?'max(4px,env(safe-area-inset-left,0px))':'50%',right:i===1?'max(4px,env(safe-area-inset-right,0px))':'50%',pointerEvents:'none'});
  side.setAttribute('role','group');side.setAttribute('aria-label',name+' controls');
  const label=node('span','bf18-owner',side);label.textContent=name;
  css(label,{position:'absolute',top:'-20px',left:i===0?'5px':'auto',right:i===1?'5px':'auto',font:'bold 12px system-ui,sans-serif',color:i===0?'#b9e8ff':'#ffd0db',textShadow:'0 1px 3px #061016',whiteSpace:'nowrap',pointerEvents:'none'});
  const pad=node('div','bf18-stick',side);pads.push(pad);
  pad.setAttribute('role','group');pad.setAttribute('aria-label',name+' movement stick; drag left or right');
  css(pad,{position:'absolute',bottom:'0',left:i===0?'2px':'auto',right:i===1?'2px':'auto',borderRadius:'50%',boxSizing:'border-box',border:'2px solid rgba(231,244,255,.8)',background:'rgba(6,25,38,.58)',boxShadow:'0 2px 8px #061522',pointerEvents:'auto',touchAction:'none',display:'grid',placeItems:'center'});
  const track=node('span','bf18-stick-track',pad);css(track,{position:'absolute',left:'50%',top:'50%',width:'65%',height:'1px',background:'rgba(241,245,250,.5)',transform:'translate(-50%,-50%)',pointerEvents:'none'});
  const knob=node('span','bf18-stick-knob',pad);knobs.push(knob);
  css(knob,{position:'absolute',left:'50%',top:'50%',width:'45%',height:'45%',boxSizing:'border-box',borderRadius:'50%',border:'2px solid #e8f6ff',background:i===0?'#347b9a':'#b75f7d',boxShadow:'0 1px 4px #07121b',transform:'translate(-50%,-50%)',pointerEvents:'none'});
  const cluster=node('div','bf18-actions',side);css(cluster,{position:'absolute',bottom:'0',left:i===1?'7px':'auto',right:i===0?'7px':'auto',display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gridTemplateRows:'repeat(2,minmax(0,1fr))',gap:'3px',pointerEvents:'none'});
  for(const kind of ['jump','special','fire']){
   const b=node('button','bf18-action bf18-'+kind,cluster);buttons[i][kind]=b;
   b.type='button';b.textContent=symbols[kind];b.title=name+' '+kind;
   b.setAttribute('aria-label',name+' '+kind);
   b.setAttribute('aria-pressed','false');
   css(b,{minWidth:'0',minHeight:'0',padding:'0',margin:'0',appearance:'none',WebkitAppearance:'none',border:'2px solid rgba(255,255,255,.78)',borderRadius:'50%',background:kind==='fire'?'rgba(180,55,42,.8)':kind==='jump'?'rgba(30,110,138,.8)':'rgba(127,82,155,.8)',color:'#fff',font:'bold 21px system-ui,sans-serif',boxShadow:'0 2px 5px #061522',textAlign:'center',touchAction:'none',userSelect:'none',pointerEvents:'auto',cursor:'pointer',opacity:'.89'});
   if(kind==='fire')b.style.gridColumn='2';
  }
 }
 function paint(){
  for(let i=0;i<2;i++)for(const kind of ['jump','fire','special']){
   const b=buttons[i][kind],down=[...pointers.values()].some(p=>p.owner===i&&p.kind===kind)||[...keys.values()].some(k=>k.owner===i&&k.action===kind);
   b.setAttribute('aria-pressed',String(down));b.style.opacity=down?'1':'.89';b.style.filter=down?'brightness(1.4)':'none';
  }
 }
 const ownerAt=x=>{const r=frame.getBoundingClientRect();return x<r.left+r.width/2?0:1;};
 function moveStick(p,x){
  const rect=p.target.getBoundingClientRect(),radius=Math.max(1,rect.width*.31),dx=x-(rect.left+rect.width/2),offset=Math.max(-radius,Math.min(radius,dx));
  knobs[p.owner].style.transform='translate(-50%,-50%) translateX('+offset.toFixed(1)+'px)';
  input.setMove(p.owner,p.source,Math.abs(dx)<Math.max(9,rect.width*.13)?0:Math.sign(dx));notify();
 }
 function down(ev,kind,target){
  if(disposed||s.paused||s.alive===false||pointers.has(ev.pointerId))return;
  if(ev.pointerType==='mouse'&&ev.button!==0)return;
  const owner=ownerAt(ev.clientX),source='p:'+ev.pointerId;
  if(kind!=='gesture'&&target!==pads[owner]&&target!==buttons[owner][kind])return; // no cross-player buttons
  ev.preventDefault();
  const p={owner,source,kind,target,startX:ev.clientX};pointers.set(ev.pointerId,p);
  try{if(target===s.c&&typeof s.capture==='function')s.capture(ev);else target.setPointerCapture?.(ev.pointerId);}catch{}
  if(kind==='stick')moveStick(p,ev.clientX);
  else if(kind!=='gesture')input.press(owner,kind,source);
  paint();notify();
 }
 function move(ev){const p=pointers.get(ev.pointerId);if(!p||disposed)return;ev.preventDefault();
  if(p.kind==='stick')moveStick(p,ev.clientX);
  else if(p.kind==='gesture'){const dx=ev.clientX-p.startX;input.setMove(p.owner,p.source,Math.abs(dx)<14?0:Math.sign(dx));notify();}
 }
 function end(ev){const p=pointers.get(ev.pointerId);if(!p)return;pointers.delete(ev.pointerId);ev.preventDefault?.();
  if(p.kind==='stick'||p.kind==='gesture')input.setMove(p.owner,p.source,0);
  else input.release(p.owner,p.kind,p.source);
  if(p.kind==='stick')knobs[p.owner].style.transform='translate(-50%,-50%)';
  try{if(p.target===s.c&&typeof s.release==='function')s.release(ev);else if(p.target.hasPointerCapture?.(ev.pointerId))p.target.releasePointerCapture(ev.pointerId);}catch{}
  paint();notify();
 }
 function clear(){if(disposed)return;const active=[...pointers.entries()];pointers.clear();keys.clear();input.clear();for(let i=0;i<2;i++)knobs[i].style.transform='translate(-50%,-50%)';
  for(const [id,p]of active)try{if(p.target===s.c&&typeof s.release==='function')s.release({pointerId:id});else if(p.target.hasPointerCapture?.(id))p.target.releasePointerCapture(id);}catch{}
  paint();notify();
 }
 function keyName(ev){return String(ev.key||'').toLowerCase();}
 const bindings={a:{owner:0,move:-1},d:{owner:0,move:1},w:{owner:0,action:'jump'},' ':{owner:0,action:'fire'},e:{owner:0,action:'special'},arrowleft:{owner:1,move:-1},arrowright:{owner:1,move:1},arrowup:{owner:1,action:'jump'},enter:{owner:1,action:'fire'},shift:{owner:1,action:'special'}};
 function typing(target){for(let el=target;el;el=el.parentElement){if(el.isContentEditable)return true;if(['INPUT','TEXTAREA','SELECT'].includes(String(el.tagName||'').toUpperCase()))return true;}return false;}
 function keydown(ev){const bind=bindings[keyName(ev)];if(!bind||disposed||s.paused||s.alive===false||typing(ev.target)||ev.ctrlKey||ev.altKey||ev.metaKey)return;
  const code='k:'+String(ev.code||ev.key);ev.preventDefault();if(keys.has(code))return;
  keys.set(code,bind);if(bind.action)input.press(bind.owner,bind.action,code);else input.setMove(bind.owner,code,bind.move);paint();notify();
 }
 function keyup(ev){const code='k:'+String(ev.code||ev.key),bind=keys.get(code);if(!bind)return;keys.delete(code);ev.preventDefault?.();
  if(bind.action)input.release(bind.owner,bind.action,code);else input.setMove(bind.owner,code,0);paint();notify();
 }
 function resize(){if(disposed)return;const r=frame.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);
  if(dimensions&&(Math.abs(w-dimensions[0])>3||Math.abs(h-dimensions[1])>3))clear();dimensions=[w,h];
  const half=w/2,stick=Math.max(55,Math.min(92,half*.42,h*.23)),button=Math.max(40,Math.min(56,half*.23,h*.19)),cluster=button*2+3;
  for(let i=0;i<2;i++){
   css(zones[i],{height:Math.max(stick,cluster)+'px',width:'calc(50% - max(4px, env(safe-area-inset-'+(i===0?'left':'right')+', 0px)))'});
   css(pads[i],{width:stick+'px',height:stick+'px'});
   const group=buttons[i].jump.parentElement;css(group,{width:cluster+'px',height:cluster+'px'});
   for(const b of Object.values(buttons[i]))css(b,{width:button+'px',height:button+'px',fontSize:Math.round(button*.45)+'px'});
  }
  s.queueCanvasFit?.();
 }
 for(let i=0;i<2;i++){
  s.on(pads[i],'pointerdown',ev=>down(ev,'stick',pads[i]));
  for(const kind of ['jump','fire','special'])s.on(buttons[i][kind],'pointerdown',ev=>down(ev,kind,buttons[i][kind]));
 }
 s.on(s.c,'pointerdown',ev=>down(ev,'gesture',s.c));
 // Window listeners catch cancelled gestures even if the browser loses capture.
 for(const target of [overlay,s.c,win]){
  s.on(target,'pointermove',move);s.on(target,'pointerup',end);s.on(target,'pointercancel',end);
 }
 for(let i=0;i<2;i++)for(const target of [pads[i],...Object.values(buttons[i])]){
  s.on(target,'pointermove',move);s.on(target,'pointerup',end);s.on(target,'pointercancel',end);
  s.on(target,'lostpointercapture',end);
 }
 s.on(documentRoot,'keydown',keydown);s.on(documentRoot,'keyup',keyup);
 s.on(win,'blur',clear);s.on(documentRoot,'visibilitychange',()=>{if(documentRoot.hidden)clear();});
 s.on(win,'orientationchange',()=>{clear();resize();});s.on(win,'resize',resize);
 if(typeof win.ResizeObserver==='function'){const observer=new win.ResizeObserver(resize);observer.observe(frame);s.cleanup(()=>observer.disconnect());}
 s.resetOnPause?.(clear);
 function dispose(){if(disposed)return;clear();disposed=true;overlay.remove();if(!hadArena)s.body.classList.remove('drag-arena-body');
  if(frame.style.position==='relative')frame.style.position=original.framePosition;
  if(s.c.style.touchAction==='none')s.c.style.touchAction=original.canvasTouch;
 }
 s.cleanup?.(dispose);
 resize();
 return {sample(){if(disposed||s.paused||s.alive===false){if(!disposed)clear();return [{move:0,jumpPressed:false,jumpHeld:false,fireHeld:false,specialPressed:false},{move:0,jumpPressed:false,jumpHeld:false,fireHeld:false,specialPressed:false}];}return input.sample();},resize,dispose};
}
Object.assign(exports,{createBroforceInputState,attachBroforceControls});
