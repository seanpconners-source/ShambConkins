const {clamp}=require("src/utils.js");
const {sound, vibrate}=require("src/audio.js");
const PAINT_ANCHOR={x:500,y:40,length:465};
function paintCanPosition(can){const length=can.length||PAINT_ANCHOR.length;return {x:(can.anchorX??PAINT_ANCHOR.x)+Math.sin(can.angle)*length,y:PAINT_ANCHOR.y+Math.cos(can.angle)*length};}
function paintAim(can,p){const dx=p.x-(can.anchorX??PAINT_ANCHOR.x),dy=p.y-PAINT_ANCHOR.y;can.length=clamp(Math.hypot(dx,dy),85,530);can.angle=clamp(Math.atan2(dx,dy),-1.3,1.3);}
function paintSwingStep(can,dt){
 const steps=Math.max(1,Math.ceil(dt*180)),h=dt/steps;
 for(let i=0;i<steps;i++){can.velocity-=980/(can.length||PAINT_ANCHOR.length)*Math.sin(can.angle)*h;can.velocity*=Math.pow(.996,h*60);can.angle+=can.velocity*h;}
 can.age+=dt;return paintCanPosition(can);
}
function paintStairY(xx){return xx>=800?550:180+clamp((xx-140)/660,0,1)*370;}
function paintStairBounce(can,at,dt){
 can.bounceCool=Math.max(0,(can.bounceCool||0)-dt);
 if(can.bounceCool===0&&at.x>=140&&at.x<=930&&at.y>paintStairY(at.x)-18&&-Math.sin(can.angle)*can.velocity>0){can.velocity=-can.velocity*.62;can.bounces=(can.bounces||0)+1;can.bounceCool=.2;return true;}
 return false;
}
async function swingingPaintCans(s){
 const[c,x]=s.canvas(720,440,{fill:true});s.body.classList.add('drag-arena-body');
 const scores=[0,0];let actor=0,shots=0,phase='aim',can,targets,drag=null,clock=15,wait=0,hits=0;
 const freshTargets=()=>[{x:650,hp:2,max:2,cool:0},{x:760,hp:2,max:2,cool:0},{x:865,hp:1,max:1,cool:0}];
 function reset(){can={angle:.9,velocity:0,age:0,anchorX:500,length:465,bounces:0,bounceCool:0};phase='aim';clock=15;drag=null;hits=0;}
 const clear=()=>drag=null;s.resetOnPause?.(clear);s.cleanup(clear);s.on(window,'blur',clear);s.on(window,'resize',clear);
 function release(){if(s.paused||phase!=='aim')return false;can.velocity=0;can.age=0;phase='swing';shots++;drag=null;sound('shot');return true;}
 const point=ev=>{const p=s.pointer(ev);return {x:p.x/s.W*1000,y:p.y/s.H*620};};
 s.on(c,'pointerdown',ev=>{if(s.paused||phase!=='aim'||drag)return;const p=point(ev);ev.preventDefault();drag={id:ev.pointerId,mode:p.y<85?'hook':'can'};if(drag.mode==='hook')can.anchorX=clamp(p.x,100,920);else paintAim(can,p);s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(s.paused||drag?.id!==ev.pointerId)return;const p=point(ev);if(drag.mode==='hook')can.anchorX=clamp(p.x,100,920);else paintAim(can,p);});
 s.on(c,'pointerup',ev=>{if(drag?.id!==ev.pointerId)return;if(drag.mode==='can')release();else clear();s.release(ev);});const cancel=ev=>{if(drag?.id===ev.pointerId)clear();};s.on(c,'pointercancel',cancel);s.on(c,'lostpointercapture',cancel);
 s.on(document,'keydown',ev=>{if(s.paused||phase!=='aim')return;if(ev.key==='ArrowLeft'){ev.preventDefault();can.angle=clamp(can.angle-.08,-1.18,1.18);}if(ev.key==='ArrowRight'){ev.preventDefault();can.angle=clamp(can.angle+.08,-1.18,1.18);}if(ev.key===' '){ev.preventDefault();release();}});
 s.hint('Defend the TOP landing against the other player’s heads. First drag the hook along the TOP rail to cover any part of the stairs. Then drag anywhere below the rail to lift the can and set its rope length; release to swing. The dotted arc previews your aim. Stair impacts bounce the can back along its rope. Five swings each; 15 seconds to aim. A/D moves the hook, W/S adjusts rope length, arrows lift, Space releases.');
 s.on(document,'keydown',ev=>{if(s.paused||phase!=='aim')return;const k=ev.key.toLowerCase();if(!['a','d','w','s'].includes(k))return;ev.preventDefault();if(k==='a'||k==='d')can.anchorX=clamp(can.anchorX+(k==='a'?-35:35),100,920);else can.length=clamp(can.length+(k==='w'?-25:25),85,530);});
 async function endSwing(){
  if(phase!=='swing')return;phase='result';wait=.65;s.setScores(scores);
 }
 async function next(){
  if(phase!=='result')return;phase='handoff';
  if(shots>=5||targets.every(t=>t.hp<=0)){
   if(actor===1)return s.finish(scores,'Home Alone · rope-swing traps '+scores[0]+'–'+scores[1]);
   actor=1;shots=0;targets=freshTargets();reset();phase='handoff';
   if(await s.pass(1,`${s.players[0].name} scored ${scores[0]}. Your turn upstairs: lift the hanging paint can and release it into the opponent-head burglars. Five swings.`))phase='aim';
  }else reset();
 }
 targets=freshTargets();reset();
 s.frame(dt=>{
  if(phase==='aim'){clock-=dt;if(clock<=0)release();}
  if(phase==='swing'){
   const sub=Math.max(1,Math.ceil(dt*180));for(let j=0;j<sub;j++){
    const h=dt/sub,at=paintSwingStep(can,h);
    for(const t of targets){if(t.hp<=0)continue;t.cool=Math.max(0,t.cool-h);t.x=Math.max(160,t.x-25*h);const headY=paintStairY(t.x)-38;
     if(t.cool<=0&&Math.abs(can.velocity)>.3&&Math.hypot(at.x-t.x,at.y-headY)<55){t.hp--;t.cool=.65;t.x+=23;hits++;scores[actor]+=t.hp<=0?5:2;can.velocity*=.82;s.setScores(scores);s.react?.(actor,'happy');s.react?.(1-actor,'sad');sound('tap');vibrate(10);}
    }
    if(paintStairBounce(can,at,h))sound('tap');
   }
   if(can.age>=5.1||targets.every(t=>t.hp<=0))void endSwing();
  }
  if(phase==='result'){wait-=dt;if(wait<=0)void next();}
  if(!s.alive)return;
  const W=s.W,H=s.H,sx=W/1000,sy=H/620,px=v=>v*sx,py=v=>v*sy,at=paintCanPosition(can),bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#eed9b6');bg.addColorStop(1,'#b28d69');x.fillStyle=bg;x.fillRect(0,0,W,H);
  x.fillStyle='#5a3730';x.fillRect(0,py(550),W,H-py(550));
  for(let i=0;i<8;i++){
   const xx=140+i*82.5,yy=180+i*46.25;x.fillStyle=i%2?'#765137':'#81593c';x.fillRect(px(xx),py(yy),px(95),py(550-yy));x.fillStyle='#ccac77';x.fillRect(px(xx),py(yy),px(95),py(9));
  }
  x.fillStyle='#715139';x.fillRect(0,py(170),px(145),py(24));x.strokeStyle='#765339';x.lineWidth=3;x.beginPath();x.moveTo(px(110),py(130));x.lineTo(px(810),py(500));x.stroke();
  s.sprite(x,actor,px(82),py(112),clamp(Math.min(W,H)*.14,46,78),{exact:true,mood:phase==='swing'?'happy':'thinking'});
  for(const t of targets){if(t.hp<=0)continue;const feet=paintStairY(t.x);x.fillStyle='#39333a';x.fillRect(px(t.x-14),py(feet-21),px(28),py(21));s.sprite(x,1-actor,px(t.x),py(feet-48),clamp(Math.min(W,H)*.115,42,67),{exact:true,mood:t.cool>0?'sad':'angry'});x.fillStyle='#722c37';x.fillRect(px(t.x-27),py(feet-91),px(54),4);x.fillStyle='#fa869c';x.fillRect(px(t.x-27),py(feet-91),px(54*t.hp/t.max),4);}
  x.strokeStyle='#a78962';x.lineWidth=7;x.beginPath();x.moveTo(px(100),py(40));x.lineTo(px(920),py(40));x.stroke();
  if(phase==='aim'){const preview={...can,velocity:0,age:0,bounceCool:0};x.strokeStyle='#d48730aa';x.lineWidth=2;x.setLineDash([5,7]);x.beginPath();const first=paintCanPosition(preview);x.moveTo(px(first.x),py(first.y));for(let k=0;k<320;k++){const p=paintSwingStep(preview,1/180);paintStairBounce(preview,p,1/180);x.lineTo(px(p.x),py(p.y));}x.stroke();x.setLineDash([]);}
  x.strokeStyle='#3b352b';x.lineWidth=3;x.beginPath();x.moveTo(px(can.anchorX),py(PAINT_ANCHOR.y));x.lineTo(px(at.x),py(at.y-18));x.stroke();x.fillStyle='#574737';x.fillRect(px(can.anchorX-24),py(22),px(48),py(18));
  const canSize=clamp(Math.min(W,H)*.09,27,48);x.save();x.translate(px(at.x),py(at.y));x.rotate(-can.angle*.25);x.fillStyle='#397bab';x.fillRect(-canSize*.45,-canSize*.35,canSize*.9,canSize*.7);x.strokeStyle='#aee3f9';x.lineWidth=3;x.beginPath();x.ellipse(0,-canSize*.35,canSize*.45,canSize*.14,0,0,Math.PI*2);x.stroke();x.beginPath();x.arc(0,-canSize*.38,canSize*.28,Math.PI,0);x.stroke();x.fillStyle='#d5edeb';x.font='bold 11px monospace';x.textAlign='center';x.fillText('PAINT',0,4);x.restore();
  x.fillStyle='#392d24';x.font=`bold ${clamp(W*.03,16,23)}px monospace`;x.textAlign='left';x.fillText('HOME ALONE · STAIR TRAP',12,29);x.font='bold 12px monospace';x.fillText('DEFEND THE TOP ↘',12,51);x.textAlign='right';x.fillText(phase==='aim'?`${Math.ceil(clock)}s · LIFT & RELEASE`:`SWING ${shots}/5 · ${hits} HITS`,W-12,51);
  if(drag){x.strokeStyle='#eead36';x.lineWidth=3;x.beginPath();x.arc(px(at.x),py(at.y),canSize*.8,0,Math.PI*2);x.stroke();}
  s.status(`${s.players[actor].name} upstairs · ${Math.max(0,5-shots)} swings left · ${scores[actor]} points · ${phase==='swing'?'rope in motion':phase==='aim'?'lift the can, then release':'trap result'}`);
  s.debug={actor,phase,can,targets,shots,clock,scores,drag,anchor:{x:can.anchorX,y:PAINT_ANCHOR.y,length:can.length},position:at,hero:{x:82,y:112},release};
 });
 await s.pass(0,'Home Alone. You are upstairs; the burglars below wear your opponent’s head. Drag the hanging paint can sideways, then release it to swing on its rope. Five traps each on identical stairs.');
}

Object.assign(exports,{PAINT_ANCHOR,paintCanPosition,paintAim,paintSwingStep,paintStairY,paintStairBounce,swingingPaintCans});