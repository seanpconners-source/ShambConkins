const {clamp}=require("src/utils.js");
const {sound, vibrate}=require("src/audio.js");
function swordGesture(origin,point){
 const dx=point.x-origin.x,dy=point.y-origin.y;
 if(dy<-22&&-dy>Math.abs(dx)*.65)return {move:0,guard:false,slash:true};
 if(dy>22&&dy>Math.abs(dx)*.65)return {move:0,guard:true,slash:false};
 return {move:Math.abs(dx)<8?0:clamp(dx/55,-1,1),guard:false,slash:false};
}
async function touchSwordDuel(s){
 const[c,x]=s.canvas(720,430,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 const p=[{x:250,hp:3,attack:0,cool:0,struck:false,block:0},{x:750,hp:3,attack:0,cool:0,struck:false,block:0}],fingers=new Map(),keys=[{},{ }],input=[{},{}],scores=[0,0];let clock=40,done=false;
 function attack(i){if(s.paused||done||p[i].cool>0)return false;Object.assign(p[i],{attack:.4,cool:.65,struck:false});s.react?.(i,'angry',.4);sound('shot');return true;}
 function refresh(){for(let i=0;i<2;i++){
  const contact=[...fingers.values()].find(f=>f.owner===i),gesture=contact?swordGesture(contact.origin,contact.point):{move:0,guard:false};
  input[i]={move:clamp(gesture.move+((keys[i].r?1:0)-(keys[i].l?1:0)),-1,1),guard:gesture.guard||!!keys[i].guard};
 }}
 const clear=()=>{fingers.clear();for(let i=0;i<2;i++)keys[i]={};refresh();};s.resetOnPause?.(clear);s.cleanup(clear);s.on(window,'blur',clear);s.on(window,'resize',clear);
 s.on(c,'pointerdown',ev=>{if(s.paused||done||fingers.has(ev.pointerId))return;const point=s.pointer(ev),owner=point.x<s.W/2?0:1;if([...fingers.values()].some(f=>f.owner===owner))return;ev.preventDefault();fingers.set(ev.pointerId,{owner,origin:point,point,time:performance.now(),slashed:false});s.capture(ev);refresh();});
 s.on(c,'pointermove',ev=>{const f=fingers.get(ev.pointerId);if(!f||s.paused)return;f.point=s.pointer(ev);const g=swordGesture(f.origin,f.point);if(g.slash&&!f.slashed){f.slashed=true;attack(f.owner);}refresh();});
 s.on(c,'pointerup',ev=>{const f=fingers.get(ev.pointerId);if(!f)return;const point=s.pointer(ev);if(!s.paused&&!f.slashed&&Math.hypot(point.x-f.origin.x,point.y-f.origin.y)<12&&performance.now()-f.time<500)attack(f.owner);fingers.delete(ev.pointerId);s.release(ev);refresh();});
 const cancel=ev=>{fingers.delete(ev.pointerId);refresh();};s.on(c,'pointercancel',cancel);s.on(c,'lostpointercapture',cancel);
 const mapping={a:[0,'l'],d:[0,'r'],w:[0,'fire'],s:[0,'guard'],ArrowLeft:[1,'l'],ArrowRight:[1,'r'],ArrowUp:[1,'fire'],ArrowDown:[1,'guard'],' ':[0,'fire'],Enter:[1,'fire']};
 s.on(document,'keydown',ev=>{const m=mapping[ev.key];if(!m||s.paused)return;ev.preventDefault();if(m[1]==='fire'){if(!ev.repeat)attack(m[0]);}else keys[m[0]][m[1]]=true;refresh();});s.on(document,'keyup',ev=>{const m=mapping[ev.key];if(!m)return;keys[m[0]][m[1]]=false;refresh();});
 s.hint('P1 touches the LEFT half, P2 the RIGHT. Drag horizontally to walk; flick UP or tap to slash; drag DOWN and hold to block. Each finger stays with its original player across the middle. Release to stop. P1 A/D, W or Space, S block. P2 arrows, Up or Enter slash, Down block. Three hits win; 40-second limit.');
 function finish(){if(done)return;done=true;clear();s.finish(scores,'Five Point Sword Duel · '+(p[0].hp===p[1].hp?'draw':s.players[p[0].hp>p[1].hp?0:1].name+' wins'));}
 s.frame(dt=>{
  if(done)return;clock-=dt;refresh();
  for(let i=0;i<2;i++){
   const me=p[i],op=p[1-i];me.x=clamp(me.x+input[i].move*(input[i].guard?105:240)*dt,45,955);me.cool=Math.max(0,me.cool-dt);me.block=Math.max(0,me.block-dt);
   if(me.attack>0){me.attack-=dt;if(me.attack<.29&&!me.struck){me.struck=true;if(Math.abs(me.x-op.x)<145){if(input[1-i].guard){op.block=.32;sound('tap');}else{op.hp--;scores[i]++;op.x=clamp(op.x+(i===0?1:-1)*15,45,955);s.setScores(scores);s.react?.(i,'happy');s.react?.(1-i,'sad');sound('lose');vibrate(15);}}}}
  }
  if(p[0].x>p[1].x-65){const mid=(p[0].x+p[1].x)/2;p[0].x=mid-32.5;p[1].x=mid+32.5;}
  const W=s.W,H=s.H,floor=H*.85,size=clamp(Math.min(W,H)*.16,44,88),bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#25101b');bg.addColorStop(1,'#a0443c');x.fillStyle=bg;x.fillRect(0,0,W,H);
  x.fillStyle='#100d1bcc';for(let i=0;i<7;i++)x.fillRect(i*W/6-7,H*.15,14,H*.7);x.strokeStyle='#dbac6477';x.lineWidth=3;x.strokeRect(W*.09,H*.18,W*.82,H*.42);x.fillStyle='#d9ba7e';x.fillRect(0,floor,W,H-floor);x.strokeStyle='#8b644066';for(let yy=floor;yy<H;yy+=15){x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy);x.stroke();}
  x.fillStyle='#fff0bd';x.font=`bold ${clamp(W*.036,18,30)}px monospace`;x.textAlign='center';x.fillText(`${Math.ceil(clock)}s`,W/2,35);
  for(let i=0;i<2;i++){
   const me=p[i],px=me.x/1000*W,dir=i?-1:1,bodyY=floor-size*.24,swing=me.attack>0?Math.sin((.4-me.attack)/.4*Math.PI):0;
   x.save();x.translate(px,bodyY);x.scale(dir,1);x.fillStyle=i?'#762b52':'#e6ba36';x.beginPath();x.moveTo(-size*.25,-size*.65);x.lineTo(size*.23,-size*.65);x.lineTo(size*.32,0);x.lineTo(-size*.32,0);x.closePath();x.fill();x.strokeStyle='#292333';x.lineWidth=6;x.beginPath();x.moveTo(-size*.14,0);x.lineTo(-size*.22,size*.22);x.moveTo(size*.14,0);x.lineTo(size*.24,size*.22);x.stroke();
   x.strokeStyle=me.block>0?'#fff6ab':'#f7e9dc';x.lineWidth=4;x.beginPath();x.moveTo(size*.1,-size*.42);x.lineTo(size*(input[i].guard ? .28 : .25+swing*.85),-size*(input[i].guard?1.05:.94-swing*.38));x.stroke();
   if(swing>0){x.strokeStyle='#fff7c188';x.lineWidth=5;x.beginPath();x.arc(size*.2,-size*.5,size*.94,-1.1,-1.1+swing*1.6);x.stroke();}if(me.block>0){x.fillStyle='#fff4a4';x.font='bold 21px monospace';x.fillText('CLANG!',size*.5,-size*1.25);}x.restore();
   s.sprite(x,i,px,floor-size*1.07,size,{exact:true,mood:input[i].guard?'thinking':me.attack>0?'angry':'walking'});
   const barW=W*.24,barX=i?W-barW-12:12;x.fillStyle='#251628';x.fillRect(barX,12,barW,10);x.fillStyle=i?'#ff84b8':'#79b5ff';x.fillRect(barX,12,barW*Math.max(0,me.hp)/3,10);
   x.fillStyle='#fff0d7';x.font='bold 12px monospace';x.textAlign=i?'right':'left';x.fillText(`${s.players[i].name} · ${Math.max(0,me.hp)} HP`,i?W-12:12,45);
  }
  for(const f of fingers.values()){
   x.strokeStyle=f.owner?'#ff91bd88':'#77b9ff88';x.lineWidth=2;x.beginPath();x.arc(f.origin.x,f.origin.y,27,0,Math.PI*2);x.stroke();x.beginPath();x.moveTo(f.origin.x,f.origin.y);x.lineTo(f.point.x,f.point.y);x.stroke();
  }
  s.status('LEFT: '+s.players[0].name+' · drag to walk · flick/tap slash · down-hold block · RIGHT: '+s.players[1].name);
  s.debug={players:p,p,input,fingers,edgeInputs:keys,clock,attack};if(clock<=0||p.some(o=>o.hp<=0))finish();
 });
 await s.pass(0,'Both players share the arena. Touch your own half: drag to walk, flick up or tap to slash, hold down to block. Three hits or the most health after 40 seconds wins.');
}

Object.assign(exports,{swordGesture,touchSwordDuel});