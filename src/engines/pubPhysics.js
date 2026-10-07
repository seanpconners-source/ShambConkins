const {clamp}=require("src/utils.js");
// Paddy's Pub table games. Physics is in world units; projections only change how it is drawn.
const {sound,tone,vibrate}=require("src/audio.js");
const {PLAYER_CUPS,pubScene,neonSign,drawSoloCup,drawBall,drawCup3D,makeFx,powerArrow,flickHint,plate}=require("src/engines/pubVisuals.js");
function flickGain(value){return Number.isFinite(value)&&value>0?clamp(value,.65,1.35):1;}
const flipUnit=(W,H)=>Math.min(W*.46,H*.55);
function projectTable(point,W=680,H=430){const U=flipUnit(W,H),D=Math.min(U*.8,H*.3),scale=1/(1+point.z*.3);return {x:W/2+point.x*U*scale,y:H*.86-point.z*D*scale-point.y*U*scale,scale};}
function projectBeerTable(point,W=680,H=430){const U=Math.min(W*.32,H*.42),V=Math.min(U*1.7,H*.5),scale=1/(1+point.z*.16);return {x:W/2+point.x*U*scale,y:H*.93-point.z*H*.24*scale-point.y*V*scale,scale};}
function beerRack(){const cups=[];for(let row=0;row<4;row++)for(let col=0;col<=row;col++)cups.push({x:(col-row/2)*.43,z:2.15+row*.39,removed:false,id:cups.length});return cups;}
// Distance is the main input. A capped speed bonus prevents tiny fast swipes
// from becoming maximum-power throws. Normalize to the arena for every device.
function beerFlick(dx,dy,duration,W=680,H=430,gain=1){
 if(![dx,dy,duration,W,H].every(Number.isFinite)||W<=0||H<=0||dy<Math.max(12,H*.035))return null;
 const power=clamp((.6+dy/H*1.35+.03/clamp(duration,.18,1.5))*flickGain(gain),.68,1.48),vz=power*3.6;
 const direction=clamp((dx/W)/Math.max(.035,dy/H)*.32,-.4,.4);
 return {x:0,z:.08,y:.3,vx:direction*vz,vy:3.05+power*.12,vz,age:0,bounces:0};
}
function beerStep(ball,cups,dt){const old={...ball};ball.age+=dt;ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;ball.y+=ball.vy*dt;ball.vy-=9.8*dt;if(old.y>.21&&ball.y<=.21&&ball.vy<0){const ratio=(old.y-.21)/(old.y-ball.y),px=old.x+(ball.x-old.x)*ratio,pz=old.z+(ball.z-old.z)*ratio;for(const cup of cups.filter(c=>!c.removed)){const d=Math.hypot(px-cup.x,pz-cup.z);if(d<.19){cup.removed=true;ball.x=cup.x;ball.z=cup.z;ball.y=.12;return {kind:'cup',cup};}if(d<.235){const nx=(px-cup.x)/(d||1),nz=(pz-cup.z)/(d||1);ball.vx+=nx*1.2;ball.vz+=nz*1.2;ball.vy=Math.abs(ball.vy)*.32;ball.y=.22;ball.bounces++;return {kind:'rim'};}}}if(ball.y<.035&&ball.vy<0){if(ball.z<0||ball.z>4||Math.abs(ball.x)>1.45)return {kind:'miss'};ball.y=.035;ball.vy*=-.46;ball.vx*=.83;ball.vz*=.83;ball.bounces++;}if(ball.age>3||ball.z>4.6||Math.abs(ball.x)>2||ball.bounces>3)return {kind:'miss'};return null;}
function flipFlick(dx,dy,duration,W=680,H=430,gain=1){if(dy<14)return null;const power=clamp((dy/H*3.3+.075/clamp(duration,.1,1.5))*flickGain(gain),.45,1.6);return {x:0,y:.22,z:.2,vx:clamp(dx/W*4,-1.2,1.2),vy:2.2+power*.55,angle:0,omega:4.8+power*2.1,age:0};}
function flipStep(cup,dt){cup.age+=dt;cup.x+=cup.vx*dt;cup.y+=cup.vy*dt;cup.vy-=9.8*dt;cup.angle+=cup.omega*dt;const bottom=.19*Math.abs(Math.cos(cup.angle))+.115*Math.abs(Math.sin(cup.angle));if(cup.vy<0&&cup.y<=bottom){cup.y=bottom;const normalized=((cup.angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2),error=Math.abs(normalized-Math.PI);return {landed:true,success:error<.4&&Math.abs(cup.x)<1.1&&Math.abs(cup.vx)<.95,error};}if(cup.age>2.5||Math.abs(cup.x)>1.7)return {landed:true,success:false,error:Math.PI};return null;}
function flipCupMesh(cup,W=680,H=430){const rotation=cup.angle||0,points=[];for(const level of [1,-1])for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=level===1?.115:.08,dy=level*.19,dz=Math.sin(a)*r;points.push(projectTable({x:cup.x+Math.cos(a)*r,y:cup.y+dy*Math.cos(rotation)-dz*Math.sin(rotation),z:cup.z+dy*Math.sin(rotation)+dz*Math.cos(rotation)},W,H));}return points;}
// The cup's resting height for a given tilt (matches flipStep).
const restHeight=angle=>.19*Math.abs(Math.cos(angle))+.115*Math.abs(Math.sin(angle));
const ease=(from,to,k)=>from+(to-from)*k;
function beerCamera(W,H){return {U:Math.min(W*.32,H*.42)};}
async function beerpong(s){const[c,x]=s.canvas(680,430,{fill:true}),racks=[beerRack(),beerRack()],score=[0,0],shots=[0,0],reracks=[false,false],turns=[1,0],MAX_TURNS=40;s.body.classList.add('pub-arena-body');let actor=0,turnShots=0,turnHits=0,bonus=false,phase='aim',ball=null,drag=null,clock=18,message='Flick upward from your head-ball.',settle=0;
 const fx=makeFx(),scene=pubScene(),spills=[[],[]],sinking=[],trail=[];let rerackHit=null,lastBounces=0,lastHit=null,time=0,sunk=null;
 const beerOpts=()=>({project:projectBeerTable,wallBottom:projectBeerTable({x:0,z:4,y:0},s.W,s.H).y,accent:'#5dff8c',logo:'PADDY’S',lineZ:1.6});
 const cupScreen=(cup,W,H)=>{const top=projectBeerTable({...cup,y:.21},W,H),bottom=projectBeerTable({...cup,y:0},W,H),edge=projectBeerTable({...cup,x:cup.x+.2,y:.21},W,H);return {top,bottom,r:edge.x-top.x};};
 function toss(shot){if(s.paused||phase!=='aim'||!shot)return;ball=shot;phase='flight';shots[actor]++;drag=null;sound('shot');trail.length=0;lastBounces=0;lastHit=null;}
 async function resolve(hit){if(phase!=='flight'&&phase!=='aim')return;phase='handoff';lastHit=hit;if(hit){score[actor]++;s.react?.(actor,'win');s.react?.(1-actor,'sad');sound('win');}else{sound('lose');s.react?.(actor,'sad');}s.setScores(score);message=hit?'IN THE CUP!':'Rim, bounce or wide — no cup.';
  if(!hit){const p=ball&&ball.z>=0&&ball.z<4.4&&Math.abs(ball.x)<1.6?projectBeerTable(ball,s.W,s.H):{x:s.W/2,y:s.H*.55};fx.pop(clock<=0?'TIME!':ball?.bounces?'BRICK!':'MISS',p.x,Math.min(p.y,s.H*.8),{color:'#d9d2c3',size:clamp(s.W*.08,24,40)});}
  turnShots++;if(hit)turnHits++;
  // One full match: two shots a turn; sink both and you bring it back for a third (never a fourth).
  const cleared=score[actor]===10,again=!cleared&&(turnShots<2||turnShots===2&&turnHits===2);bonus=again&&turnShots===2;
  if(bonus){message='BRING IT BACK!';fx.pop('BRING IT BACK!',s.W/2,s.H*.42,{color:'#7dff8a',size:clamp(s.W*.1,28,58),life:1.6});fx.confetti(s.W,s.H,40);tone(880,.08,.05,'square');}
  if(!await (s.wait?s.wait(bonus?1500:hit?900:650):s.delay(bonus?1500:650)))return;
  if(cleared)return s.finish(score,'Paddy’s Pub · rack cleared · cups '+score[0]+'–'+score[1]);
  ball=null;sunk=null;clock=18;trail.length=0;
  if(again){message=bonus?'BRING IT BACK! One bonus shot.':'Second shot of the turn.';phase='aim';return;}
  turnShots=0;turnHits=0;bonus=false;actor=1-actor;
  if(actor===0&&turns[0]>=MAX_TURNS&&turns[1]>=MAX_TURNS)return s.finish(score,'Paddy’s Pub · last call · cups '+score[0]+'–'+score[1]);
  turns[actor]++;if(await s.pass(actor,message+' Two shots this turn. Sink both and you bring it back for a third.'))phase='aim';}
 function cupHit(cup){const {top,r}=cupScreen(cup,s.W,s.H);sinking.push({cup:{...cup},player:1-actor,age:0});spills[actor].push({x:cup.x,z:cup.z});sunk=cup;
  fx.burst(top.x,top.y,{count:28,speed:clamp(r*7,90,260),up:clamp(r*6,80,240),size:clamp(r*.16,2,5)});fx.ring(top.x,top.y,r,'#fff3c0',.34);fx.shake(7,.32);vibrate(30);
  const last=racks[actor].every(c=>c.removed);fx.pop(last?'RACK CLEARED!':['SPLASH!','DRINK!','CUP!','WILDCARD!'][score[actor]%4],s.W/2,s.H*.6,{color:last?'#7dff8a':'#ffd36b',size:clamp(s.W*.1,28,58)});if(last)fx.confetti(s.W,s.H,80);}
 const rerack=()=>{if(phase!=='aim'||reracks[actor])return;reracks[actor]=true;const left=racks[actor].filter(p=>!p.removed),positions=beerRack();left.forEach((p,i)=>{p.x=positions[i].x;p.z=positions[i].z;});message='Re-racked. Aim for the new triangle.';sound('tap');fx.pop('RE-RACK!',s.W/2,s.H*.6,{color:'#7fd0ff',size:clamp(s.W*.08,24,44)});};
 const rerackBox=()=>rerackHit||{x:8,y:Math.min(72,s.H*.2)+8,w:92,h:28};
 s.on(c,'pointerdown',ev=>{if(s.paused||phase!=='aim'||drag)return;ev.preventDefault();const p=s.pointer(ev),rb=rerackBox();if(!reracks[actor]&&p.x>=rb.x&&p.x<=rb.x+rb.w&&p.y>=rb.y&&p.y<=rb.y+rb.h){rerack();return;}drag={id:ev.pointerId,start:p,end:p,time:performance.now()};s.capture(ev);});s.on(c,'pointermove',ev=>{if(drag?.id===ev.pointerId)drag.end=s.pointer(ev);});s.on(c,'pointerup',ev=>{if(drag?.id!==ev.pointerId)return;const p=s.pointer(ev),start=drag.start,duration=(performance.now()-drag.time)/1000;const moved=Math.hypot(p.x-start.x,p.y-start.y);toss(moved<14?beerFlick(0,70,.45,s.W,s.H):beerFlick(p.x-start.x,start.y-p.y,duration,s.W,s.H,s.flickSensitivity));drag=null;s.release(ev);});const clear=()=>drag=null;const cancel=ev=>{if(drag?.id===ev.pointerId)clear();};s.on(c,'pointercancel',cancel);s.on(c,'lostpointercapture',cancel);s.on(window,'blur',clear);s.on(window,'resize',clear);s.resetOnPause?.(clear);
 s.hint(`Flick sensitivity ${flickGain(s.flickSensitivity).toFixed(2)}× (Settings). Flick upward anywhere on the table (or tap for a gentle centre toss). Short flicks are gentle; longer drags reach the back cups. Angle steers left/right; speed has only a small capped effect. Real 3D arcs, rim rebounds and table bounces. Two shots a turn; sink both to bring it back for a third. First to clear all ten cups wins. Tap RE-RACK (or press R) once to tighten your cups.`);
 s.on(document,'keydown',ev=>{if(ev.key.toLowerCase()==='r')rerack();});
 s.frame(dt=>{const W=s.W,H=s.H,{U}=beerCamera(W,H);time+=dt;
  if(phase==='aim'){clock-=dt;if(clock<=0){shots[actor]++;void resolve(false);}}
  if(phase==='flight'){const steps=Math.ceil(dt*180);for(let j=0;j<steps&&phase==='flight';j++){const event=beerStep(ball,racks[actor],dt/steps);if(event?.kind==='cup'){settle=.5;cupHit(event.cup);void resolve(true);}else if(event?.kind==='miss')void resolve(false);else if(event?.kind==='rim'){message='RIM!';sound('tap');tone(1900,.05,.04,'triangle');const p=projectBeerTable(ball,W,H);fx.burst(p.x,p.y,{count:10,colors:['#ffffff','#fff3c0'],speed:120,up:60,size:2,life:.4});fx.pop('RIM!',p.x,p.y-24,{color:'#fff',size:clamp(W*.06,18,30),life:.7});lastBounces=ball.bounces;}}
   if(ball&&phase==='flight'){if(ball.bounces>lastBounces){lastBounces=ball.bounces;tone(1250,.04,.035,'square');const g=projectBeerTable({...ball,y:0},W,H);fx.ring(g.x,g.y,10*g.scale,'#ffe9c0',.4);}trail.push({...ball});if(trail.length>14)trail.shift();}}else if(trail.length)trail.shift();
  settle=Math.max(0,settle-dt);fx.step(dt);for(let i=sinking.length-1;i>=0;i--){sinking[i].age+=dt;if(sinking[i].age>.75)sinking.splice(i,1);}
  const off=fx.offset();x.save();x.translate(off.x,off.y);
  scene(x,W,H,beerOpts());
  for(const spill of spills[actor]){const p=projectBeerTable({...spill,y:0},W,H),r=U*.2*p.scale;x.fillStyle='#3a1f0a55';x.beginPath();x.ellipse(p.x,p.y,r*1.25,r*.45,0,0,Math.PI*2);x.fill();x.strokeStyle='#d98a1c33';x.lineWidth=1.5;x.stroke();}
  neonSign(x,W,H,'PADDY’S PUB','★ BEER PONG ★',{y:clamp(H*.07,22,48),color:'#5dff8c',t:time});
  const oppMood=lastHit===true?'sad':lastHit===false?'win':'thinking',oppSize=clamp(U*.5,40,96),farEdge=projectBeerTable({x:0,z:4,y:0},W,H);s.sprite(x,1-actor,W/2,farEdge.y-oppSize*.42,oppSize,{exact:true,mood:oppMood});
  x.fillStyle='#24140b';x.fillRect(W/2-oppSize*.5,farEdge.y-2,oppSize,3);
  const current=ball||{x:0,z:.08,y:.3+(phase==='aim'?Math.sin(time*3)*.015:0)},items=[];
  for(const cup of racks[actor])if(!cup.removed)items.push({z:cup.z,draw:()=>{const {top,bottom,r}=cupScreen(cup,W,H);drawSoloCup(x,top.x,top.y,bottom.y,r,1-actor);}});
  for(const sk of sinking)items.push({z:sk.cup.z,draw:()=>{const k=sk.age/.75,{top,bottom,r}=cupScreen(sk.cup,W,H),wob=Math.sin(sk.age*40)*(1-k)*r*.12;drawSoloCup(x,top.x+wob,top.y+k*r*.4,bottom.y,r*(1-k*.15),sk.player,{alpha:1-k*k,glow:(1-k)*24});}});
  const hidden=sunk&&phase==='handoff';
  if(!hidden)items.push({z:current.z,draw:()=>{const p=projectBeerTable(current,W,H),shadow=projectBeerTable({...current,y:0},W,H),head=clamp(U*.42,38,84)*p.scale,lift=clamp(current.y,0,1.2);
   x.fillStyle=`rgba(0,10,5,${.42-lift*.22})`;x.beginPath();x.ellipse(shadow.x,shadow.y,head*.34*(1-lift*.3),head*.12*(1-lift*.3),0,0,Math.PI*2);x.fill();
   trail.forEach((t,i)=>{const q=projectBeerTable(t,W,H);x.fillStyle=`rgba(255,250,230,${i/trail.length*.35})`;x.beginPath();x.arc(q.x,q.y,head*.32*q.scale/p.scale*(i/trail.length),0,Math.PI*2);x.fill();});
   drawBall(x,p.x,p.y,head*.44,actor);s.sprite(x,actor,p.x,p.y,head,{exact:true,mood:phase==='flight'?'walking':settle?'win':'thinking'});}});
  if(hidden){const {top,r}=cupScreen(sunk,W,H);items.push({z:sunk.z-.01,draw:()=>{x.save();x.beginPath();x.rect(top.x-r*2,top.y-r*3,r*4,r*3);x.clip();s.sprite(x,actor,top.x,top.y-r*.35+Math.sin(time*10)*r*.08,r*1.6,{exact:true,mood:'win'});x.restore();}});}
  items.sort((a,b)=>b.z-a.z).forEach(it=>it.draw());
  if(phase==='aim'){const p=projectBeerTable(current,W,H),head=clamp(U*.42,38,84)*p.scale;
   if(!drag)flickHint(x,p.x,p.y-head*.8,clamp(U*.14,12,24),time);
   else{const preview=beerFlick(drag.end.x-drag.start.x,drag.start.y-drag.end.y,(performance.now()-drag.time)/1000,W,H,s.flickSensitivity);x.strokeStyle='#fff4be55';x.lineWidth=2;x.setLineDash([5,6]);x.beginPath();x.moveTo(drag.start.x,drag.start.y);x.lineTo(drag.end.x,drag.end.y);x.stroke();x.setLineDash([]);
    if(preview){const power=clamp((preview.vz/3.6-.68)/.8,0,1),reach=.45+power*1.5,tip=projectBeerTable({x:preview.vx/preview.vz*reach,z:.08+reach,y:0},W,H),base=projectBeerTable({x:0,z:.08,y:0},W,H);powerArrow(x,{x:base.x,y:base.y},tip,power);}}}
  const top=clamp(H*.07,22,48)+clamp(Math.min(W*.085,H*.07),14,34)*1.4;
  if(bonus&&phase==='aim')plate(x,W/2,top+clamp(W*.13,48,70),'🍺 BRING IT BACK · BONUS SHOT',{size:clamp(W*.04,13,20),color:'#7dff8a',border:'#2e9e61'});
  if(phase==='aim'&&!reracks[actor])rerackHit=plate(x,clamp(W*.13,52,90),top,'↻ RE-RACK',{size:clamp(W*.032,11,15),color:'#bfe8ff',border:'#3f7fb0'});else rerackHit=null;
  const allowed=bonus||turnShots>=2&&turnHits>=2?3:2,left=Math.max(0,allowed-turnShots),urgent=phase==='aim'&&clock<=5;
  const pipR=clamp(W*.012,4,7),pipW=pipR*2.7*allowed,clockX=W-Math.max(pipW/2,clamp(W*.11,44,80))-10,pipY=top+clamp(W*.032,11,15)*1.5;
  plate(x,clockX,top,phase==='aim'?`${Math.ceil(clock)}s`:`${left} left`,{size:clamp(W*.032,11,15),color:urgent?(Math.sin(time*12)>0?'#ff6b6b':'#fff'):'#f7d893',border:urgent?'#ff6b6b':'#7a5530'});
  x.fillStyle='#120b07b0';x.beginPath();x.roundRect?.(clockX-pipW/2-pipR,pipY-pipR*2,pipW+pipR*2,pipR*4,pipR*2);x.fill();
  for(let i=0;i<allowed;i++){const used=i<turnShots;x.fillStyle=used?'#ffffff30':i===2?'#7dff8a':PLAYER_CUPS[actor].light;x.beginPath();x.arc(clockX+(i-(allowed-1)/2)*pipR*2.7,pipY,pipR,0,Math.PI*2);x.fill();}
  fx.draw(x);x.restore();
  s.status(`${s.players[actor].name} · ${bonus?'BRING IT BACK · bonus shot':'shot '+Math.min(2,turnShots+(phase==='aim'?1:0))+'/2'} · cups ${score[0]}–${score[1]} · ${phase==='aim'?Math.ceil(clock)+'s to flick':message}`);s.debug={actor,phase,ball,racks,shots,score,turnShots,turnHits,bonus,message,toss,resolve,project:projectBeerTable};});await s.pass(0,'Paddy’s Pub beer pong. Flick your head-ball UP the table into the other player’s ten cups. Two shots per turn; sink both and you bring it back for a third. First to clear all ten cups wins. One re-rack each, and 3D rim/table physics.');
}
function flipVerdict(outcome,cup){if(outcome.success)return {pop:['FLIP!','FLIPADELPHIA!','NAILED IT!','FLIP FLIP!'][Math.floor(Math.random()*4)],message:'FLIP FLIP FLIPADELPHIA!'};if(!cup||Math.abs(cup.x)>=1.1)return {pop:'OFF THE EDGE!',message:'Off the edge. Flick straighter.'};if(outcome.error<.4&&Math.abs(cup.vx)>=.95)return {pop:'IT SLID!',message:'Landed but slid off its rim. Less sideways drift.'};if(outcome.error<.9)return {pop:'SO CLOSE!',message:'So close! Tweak the spin a touch.'};return {pop:['WHIFF!','NOPE!','BRICK!'][Math.floor(Math.random()*3)],message:'Not rim-down. Try a different flick.'};}
async function flipcup(s){const[c,x]=s.canvas(680,430,{fill:true}),score=[0,0],attempts=[0,0];let actor=0,phase='aim',cup=null,drag=null,clock=15,message='Flick up to land RIM-DOWN.',landing=null;
 const fx=makeFx(),scene=pubScene(),results=[[],[]],trail=[];let time=0,shown=null;
 const flipOpts=()=>({project:projectTable,wallBottom:projectTable({x:0,z:4,y:0},s.W,s.H).y,accent:'#ff9a3d',logo:'FLIPADELPHIA'});
 function flip(shot){if(s.paused||phase!=='aim'||!shot)return;cup=shot;phase='flight';attempts[actor]++;drag=null;sound('shot');trail.length=0;}
 async function finishFlip(outcome){if(phase!=='flight'&&phase!=='aim')return;phase='landed';landing=outcome;const verdict=flipVerdict(outcome,cup);message=verdict.message;results[actor].push(!!outcome.success);
  if(outcome.success){score[actor]++;sound('win');s.react?.(actor,'win');}else{s.react?.(actor,'sad');sound('lose');}s.setScores(score);
  const W=s.W,H=s.H,at=cup?projectTable({x:cup.x,z:cup.z,y:0},W,H):{x:W/2,y:H*.8},U=flipUnit(W,H);tone(95,.12,.07,'triangle');
  if(cup){const lying=Math.round((cup.angle-Math.PI/2)/Math.PI)*Math.PI+Math.PI/2;shown={angle:cup.angle,target:outcome.success?Math.round((cup.angle-Math.PI)/(Math.PI*2))*Math.PI*2+Math.PI:lying};}
  if(outcome.success){fx.ring(at.x,at.y,U*.2,'#ffe066',.32);fx.burst(at.x,at.y-U*.2,{count:34,colors:['#ffe066','#ff9a3d','#7dff8a','#5fd0ff','#ff5f8f'],speed:U*1.6,up:U*1.4,size:3,gravity:600,life:1});fx.shake(6,.25);vibrate(35);}
  else{fx.burst(at.x,at.y,{count:12,colors:['#c9a77a','#8a6a48'],speed:U*.6,up:U*.3,size:2,life:.5});fx.shake(3,.18);}
  fx.pop(verdict.pop,W/2,H*.38,{color:outcome.success?'#ffe066':'#d9d2c3',size:clamp(W*.1,26,56)});
  if(!await (s.wait?s.wait(850):s.delay(850)))return;if(attempts.every(n=>n>=8))return s.finish(score,'Flipadelphia · successful flips '+score[0]+'–'+score[1]);actor=1-actor;cup=null;landing=null;shown=null;clock=15;trail.length=0;if(await s.pass(actor,message+' Eight flicks each. A correct landing is upside down with the rim on the table.'))phase='aim';}
 s.on(c,'pointerdown',ev=>{if(s.paused||phase!=='aim')return;const p=s.pointer(ev);ev.preventDefault();drag={id:ev.pointerId,start:p,end:p,time:performance.now()};s.capture(ev);});s.on(c,'pointermove',ev=>{if(drag?.id===ev.pointerId)drag.end=s.pointer(ev);});s.on(c,'pointerup',ev=>{if(drag?.id!==ev.pointerId)return;const p=s.pointer(ev),d=drag;flip(Math.hypot(p.x-d.start.x,p.y-d.start.y)<14?flipFlick(0,50,.5,s.W,s.H):flipFlick(p.x-d.start.x,d.start.y-p.y,(performance.now()-d.time)/1000,s.W,s.H,s.flickSensitivity));drag=null;s.release(ev);});const clear=()=>drag=null;s.on(c,'pointercancel',clear);s.resetOnPause?.(clear);s.hint(`Flick sensitivity ${flickGain(s.flickSensitivity).toFixed(2)}× (Settings). Flick UP anywhere on the screen (or just tap for a gentle flip). Distance and speed set lift AND spin; sideways flicks can knock the cup off the table. Land upside down to score. Alternate after every attempt.`);
 s.frame(dt=>{const W=s.W,H=s.H,U=flipUnit(W,H);time+=dt;
  if(phase==='aim'){clock-=dt;if(clock<=0){attempts[actor]++;void finishFlip({success:false});}}
  if(phase==='flight'){const steps=Math.ceil(dt*180);for(let j=0;j<steps&&phase==='flight';j++){const hit=flipStep(cup,dt/steps);if(hit)void finishFlip(hit);}if(phase==='flight'){trail.push({...cup});if(trail.length>7)trail.shift();}}else if(trail.length)trail.shift();
  if(shown){shown.angle=ease(shown.angle,shown.target,Math.min(1,dt*(landing?.success?16:9)));}
  fx.step(dt);const off=fx.offset();x.save();x.translate(off.x,off.y);
  scene(x,W,H,flipOpts());
  neonSign(x,W,H,'FLIPADELPHIA','FLIP · FLIP · FLIP',{y:clamp(H*.07,22,48),color:'#ff9a3d',t:time});
  const farEdge=projectTable({x:0,z:4,y:0},W,H),oppSize=clamp(U*.42,40,90),oppMood=landing?(landing.success?'sad':'win'):'thinking';s.sprite(x,1-actor,W/2,farEdge.y-oppSize*.42,oppSize,{exact:true,mood:oppMood});
  const signBottom=clamp(H*.07,22,48)+clamp(Math.min(W*.085,H*.07),14,34)*1.4,pip=clamp(W*.022,7,12);
  for(const player of [0,1]){const cx0=player===0?pip*1.4:W-pip*1.4-7*pip*2.3,cy=signBottom+pip*.6;x.fillStyle='#120b07c0';x.beginPath();x.roundRect?.(cx0-pip*.9,cy-pip*.95,7*pip*2.3+pip*1.8,pip*3.9,pip*.6);x.fill();x.save();x.font=`800 ${clamp(W*.028,10,14)}px "Trebuchet MS",Arial`;x.textBaseline='middle';x.textAlign=player===0?'left':'right';x.fillStyle=player===actor?'#fff3c0':'#ffffff80';x.fillText(`${s.players[player].name} ${score[player]}`,player===0?cx0-pip*.6:cx0+7*pip*2.3+pip*.6,cy+pip*1.9);x.restore();
   for(let i=0;i<8;i++){const px=cx0+i*pip*2.3,r=results[player][i],col=PLAYER_CUPS[player],current=player===actor&&i===attempts[player]&&phase==='aim';x.save();x.translate(px,cy);if(r===true){x.fillStyle=col.light;x.beginPath();x.moveTo(-pip*.35,-pip*.5);x.lineTo(pip*.35,-pip*.5);x.lineTo(pip*.5,pip*.5);x.lineTo(-pip*.5,pip*.5);x.closePath();x.fill();x.strokeStyle='#fff';x.lineWidth=1.5;x.stroke();}
    else if(r===false){x.strokeStyle='#ff6b6b99';x.lineWidth=2;x.beginPath();x.moveTo(-pip*.35,-pip*.35);x.lineTo(pip*.35,pip*.35);x.moveTo(pip*.35,-pip*.35);x.lineTo(-pip*.35,pip*.35);x.stroke();}
    else{x.strokeStyle=current?'#fff3c0':'#ffffff40';x.lineWidth=current?2:1.2;x.globalAlpha=current?.6+Math.sin(time*8)*.4:1;x.beginPath();x.moveTo(-pip*.5,-pip*.5);x.lineTo(pip*.5,-pip*.5);x.lineTo(pip*.35,pip*.5);x.lineTo(-pip*.35,pip*.5);x.closePath();x.stroke();}x.restore();}}
  const current=cup||{x:0,z:.2,y:.22,angle:0},display={...current,angle:shown?shown.angle:current.angle};if(shown)display.y=Math.max(current.y,restHeight(display.angle));
  const ground=projectTable({x:display.x,z:display.z,y:0},W,H),air=clamp(display.y-.22,0,1);x.fillStyle=`rgba(0,0,0,${.45-air*.3})`;x.beginPath();x.ellipse(ground.x,ground.y,U*.16*(1-air*.4),U*.05*(1-air*.4),0,0,Math.PI*2);x.fill();
  trail.forEach((t,i)=>{x.save();x.globalAlpha=(i+1)/trail.length*.18;drawCup3D(x,flipCupMesh(t,W,H),t.angle,actor);x.restore();});
  drawCup3D(x,flipCupMesh(display,W,H),display.angle,actor);
  const p=projectTable(display,W,H),headSize=clamp(U*.24,30,70)*p.scale;x.save();x.translate(p.x,p.y);x.rotate(display.angle);s.sprite(x,actor,0,0,headSize,{exact:true,mood:landing?.success?'win':landing?'sad':'thinking'});x.restore();
  if(phase==='aim'){if(!drag)flickHint(x,p.x,p.y-U*.28,clamp(U*.1,12,22),time);
   else{x.strokeStyle='#fff4be55';x.lineWidth=2;x.setLineDash([5,6]);x.beginPath();x.moveTo(drag.start.x,drag.start.y);x.lineTo(drag.end.x,drag.end.y);x.stroke();x.setLineDash([]);
    const preview=flipFlick(drag.end.x-drag.start.x,drag.start.y-drag.end.y,(performance.now()-drag.time)/1000,W,H,s.flickSensitivity);if(preview){const power=clamp((preview.vy-2.2)/.55/1.15-.39,0,1),tip=projectTable({x:preview.vx*.35,z:.2,y:.45+power*.55},W,H);powerArrow(x,{x:p.x,y:p.y-U*.12},tip,power);}}}
  if(phase==='aim'){const urgent=clock<=5;plate(x,W/2,H-clamp(H*.05,16,26),`${s.players[actor].name.toUpperCase()} · FLIP ${Math.min(8,attempts[actor]+1)}/8 · ${Math.ceil(clock)}s`,{size:clamp(W*.03,11,15),color:urgent?(Math.sin(time*12)>0?'#ff6b6b':'#fff'):'#f7d893',border:urgent?'#ff6b6b':'#7a5530'});}
  fx.draw(x);x.restore();
  s.status(`${s.players[actor].name} · flip ${Math.min(8,attempts[actor]+(phase==='aim'?1:0))}/8 · ${phase==='aim'?Math.ceil(clock)+'s · flick up':message}`);s.debug={actor,phase,cup,score,attempts,flip,finishFlip,landing};});await s.pass(0,'Flipadelphia at Paddy’s. Flip, flip, Flipadelphia! Flick the cup into the air and land it rim-down. Your head rides the rotating cup. Eight alternating attempts each.');
}

Object.assign(exports,{flickGain,projectTable,projectBeerTable,beerRack,beerFlick,beerStep,flipFlick,flipStep,flipCupMesh,beerpong,flipcup});
