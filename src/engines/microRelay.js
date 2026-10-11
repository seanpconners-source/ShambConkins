const {clamp, seededRandom, shuffle}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {sound}=require("src/audio.js");

// Every card is a self-contained object challenge. There are no franchise-dependent rules.
const RELAY_TASKS=Object.freeze([
 {id:'box',title:'IN THE BOX',icon:'□',help:'Drag the disc into the marked box.'},
 {id:'stack',title:'BUILD A TOWER',icon:'▤',help:'Drag TWO blocks onto the platform.'},
 {id:'stop',title:'FREEZE!',icon:'◉',help:'Tap when the moving disc is inside the gold zone.'},
 {id:'balance',title:'STEADY HAND',icon:'⚖',help:'Drag and hold the disc in green for 2 seconds.'},
 {id:'dodge',title:'DON’T GET HIT',icon:'↔',help:'Drag sideways to dodge the falling balls.'},
 {id:'sort',title:'SORT THE DISCS',icon:'◐',help:'Drag each colored disc into its matching bin.'}
]);
const W=680,H=400,STEPS=7,PRACTICE_SECONDS=5;
const taskById=id=>RELAY_TASKS.find(t=>t.id===id);
function relayCourse(seed){
 const r=seededRandom(seed);
 const ids=shuffle(RELAY_TASKS.map(t=>t.id),r);
 // A seventh familiar gesture adds urgency without teaching a seventh mechanic.
 ids.push(['box','stop','sort'][Math.floor(r()*3)]);
 if(ids[6]===ids[5]){const last=ids[6];ids[6]=ids[4];ids[4]=last;}
 return ids.map((id,i)=>{
  const task=taskById(id);
  return {...task,seconds:Math.round((7.7-i*.22)*100)/100,
   target:440+r()*85,colors:Array.from({length:3},()=>r()<.5?0:1),
   drops:Array.from({length:7},(_,j)=>({x:[160,340,520][(j+Math.floor(r()*2))%3]+(r()-.5)*44,at:.65+j*.69,speed:265+r()*35}))};
 });
}
const inRect=(p,cx,cy,hw,hh)=>Math.abs(p.x-cx)<=hw&&Math.abs(p.y-cy)<=hh;
function relayBoxHit(p,t){return inRect(p,t.target,235,76,65);}
function relayStackHit(p){return inRect(p,485,245,93,89);}
function relaySortHit(p,color){return inRect(p,color===0?176:504,247,86,79);}
function relayStopHit(t,x){return Math.abs(x-t.target)<=64;}
function relayDodgeHit(d,x,y,time){const dy=(time-d.at)*d.speed+133;return time>=d.at&&Math.hypot(d.x-x,dy-y)<42;}

async function microrelay(s){
 const [canvas,ctx]=s.canvas(W,H);
 const course=relayCourse(s.seed),practice={...taskById('box'),seconds:PRACTICE_SECONDS,target:480};
 const scores=[0,0],history=[[],[]];
 let player=0,index=-1,phase='handoff',clock=0,transition=0,actor=null,pointer=null,feedback='',earned=0;
 const activeTask=()=>index<0?practice:course[index];
 const newActor=t=>({x:t.id==='box'||t.id==='stack'?130:W/2,y:235,
  targetX:W/2,elapsed:0,held:0,placed:0,sorted:0,failed:false});
 function clearPointer(){
  const old=pointer;pointer=null;
  if(old!==null)s.release({pointerId:old});
 }
 function beginCard(){
  clearPointer();phase='card';clock=index<0?1.6:.86;
  actor=newActor(activeTask());s.active=player;s.updateScores();
  s.hint('Taskmaster: follow each one-line task card. Drag, release, tap, or hold. Seven identical timed cards for each player; the practice is free.');
 }
 async function beginPlayer(){
  phase='handoff';clearPointer();
  const ok=await s.pass(player,'One free practice. Then seven quick Taskmaster challenges. Both players get the same objects, order and hazards.','Open the task envelope');
  if(!ok)return;
  index=-1;beginCard();
 }
 function complete(won,reason=''){
  if(phase!=='running')return;
  clearPointer();phase='result';transition=index<0?.74:.56;
  earned=index<0?0:won?10+Math.min(3,Math.ceil(Math.max(0,clock)/2.5)):0;
  if(index>=0){scores[player]+=earned;history[player].push({id:activeTask().id,won,earned});s.setScores(scores);}
  feedback=index<0?(won?'GOOD! PRACTICE COMPLETE':'PRACTICE OVER'):
   won?'TASK COMPLETE  +'+earned:(reason||'TASK FAILED');
  if(index>=0){s.react?.(player,won?'happy':'sad');sound(won?'win':'lose');}
  else sound('tap');
 }
 function startRunning(){phase='running';clock=activeTask().seconds;actor.elapsed=0;}
 function move(p){
  const t=activeTask();
  if(t.id==='box'||t.id==='stack'||t.id==='sort'){
   actor.x=clamp(p.x,32,W-32);actor.y=clamp(p.y,143,327);
  }else if(t.id==='balance'||t.id==='dodge')actor.targetX=clamp(p.x,40,W-40);
 }
 const currentOrigin=()=>{const t=activeTask();return t.id==='sort'?{x:340,y:235}:t.id==='stack'?{x:130,y:235}:{x:130,y:235};};
 function release(ev,cancelled=false){
  if(ev.pointerId!==pointer)return;
  const t=activeTask(),p=s.pointer(ev);
  // Clear ownership before releasing capture: lostpointercapture can fire synchronously.
  clearPointer();
  if(cancelled||s.paused||phase!=='running')return;
  if(t.id==='box'){move(p);complete(relayBoxHit(p,t), 'OUTSIDE THE BOX');}
  else if(t.id==='stack'){
   if(relayStackHit(p)){actor.placed++;sound('tap');}
   else sound('lose');
   actor.x=130;actor.y=235;
   if(actor.placed>=2)complete(true);
  }else if(t.id==='sort'){
   const color=t.colors[actor.sorted];
   if(relaySortHit(p,color)){actor.sorted++;sound('tap');}
   else {complete(false,'WRONG BIN');return;}
   actor.x=340;actor.y=235;
   if(actor.sorted>=3)complete(true);
  }
 }
 s.on(canvas,'pointerdown',ev=>{
  if(s.paused||phase!=='running'||pointer!==null)return;
  const t=activeTask(),p=s.pointer(ev);
  if(t.id==='stop'){ev.preventDefault();complete(relayStopHit(t,actor.x),'MISSED THE GOLD ZONE');return;}
  if(['box','stack','sort'].includes(t.id)){
   const origin=t.id==='sort'?{x:340,y:235}:currentOrigin();
   if(Math.hypot(p.x-origin.x,p.y-origin.y)>69)return;
  }
  ev.preventDefault();pointer=ev.pointerId;s.capture(ev);move(p);
 });
 s.on(canvas,'pointermove',ev=>{
  if(!s.paused&&phase==='running'&&ev.pointerId===pointer){ev.preventDefault();move(s.pointer(ev));}
 });
 s.on(canvas,'pointerup',ev=>release(ev));
 s.on(canvas,'pointercancel',ev=>release(ev,true));
 s.on(canvas,'lostpointercapture',ev=>release(ev,true));
 s.on(window,'blur',clearPointer);
 s.resetOnPause?.(clearPointer);s.cleanup(clearPointer);
 s.on(document,'keydown',ev=>{
  if(s.paused||phase!=='running'||ev.repeat)return;
  if((ev.key===' '||ev.key==='Enter')&&activeTask().id==='stop'){
   ev.preventDefault();complete(relayStopHit(activeTask(),actor.x),'MISSED THE GOLD ZONE');
  }
  if(['ArrowLeft','ArrowRight'].includes(ev.key)&&['balance','dodge'].includes(activeTask().id)){
   ev.preventDefault();pointer='keyboard';actor.targetX=clamp(actor.targetX+(ev.key==='ArrowLeft'?-70:70),60,W-60);
  }
 });
 function next(){
  if(index<0){index=0;beginCard();return;}
  if(++index<STEPS){beginCard();return;}
  if(player===0){player=1;void beginPlayer();return;}
  const count=i=>history[i].filter(h=>h.won).length;
  s.finish(scores,'Taskmaster: '+count(0)+' / 7 tasks versus '+count(1)+' / 7 tasks');
 }
 function advance(dt){
  if(phase==='card'){clock-=dt;if(clock<=0)startRunning();return;}
  if(phase==='result'){transition-=dt;if(transition<=0)next();return;}
  if(phase!=='running')return;
  const t=activeTask();
  clock-=dt;actor.elapsed+=dt;
  if(t.id==='stop')actor.x=80+(W-160)*(.5+.5*Math.sin(actor.elapsed*2.5-1.1));
  if(t.id==='balance'){
   // No passive win: the player must touch and actively steady the disc.
   if(pointer!==null){
    actor.x+=clamp(actor.targetX-actor.x,-560*dt,560*dt);
    if(Math.abs(actor.x-W/2)<=84)actor.held+=dt;
   }else actor.x=clamp(actor.x+Math.sin(actor.elapsed*4)*90*dt,50,W-50);
   if(actor.held>=1.8){complete(true);return;}
  }
  if(t.id==='dodge'){
   actor.x+=clamp(actor.targetX-actor.x,-730*dt,730*dt);
   for(const d of t.drops)if(relayDodgeHit(d,actor.x,284,actor.elapsed)){complete(false,'HIT!');return;}
   if(actor.elapsed>=5.5){complete(true);return;}
  }
  if(clock<=0)complete(false,'TIME UP');
 }
 function label(text,x,y,font='bold 20px Arial',color='#30261d'){
  ctx.fillStyle=color;ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y);
 }
 function rect(x,y,w,h,color,stroke){
  ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=4;ctx.strokeRect(x,y,w,h);}
 }
 function token(x,y,color='#7b97a2'){
  circle(ctx,x,y,32,color);ctx.strokeStyle='#273640';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(x,y,32,0,Math.PI*2);ctx.stroke();
  circle(ctx,x-9,y-9,7,'#ffffffbb');
 }
 function scenery(t){
  rect(27,137,626,199,'#ede0bf','#bb9b70');
  if(t.id==='box'){
   rect(t.target-76,170,152,130,'#e1b760','#977138');
   ctx.strokeStyle='#f8ebc2';ctx.setLineDash([9,8]);ctx.lineWidth=4;
   ctx.strokeRect(t.target-64,182,128,106);ctx.setLineDash([]);
   label('DROP HERE',t.target,235,'bold 17px Arial','#62431d');token(actor.x,actor.y);
  }else if(t.id==='stack'){
   rect(385,317,200,12,'#96704a');rect(390,169,188,145,'#d9c7a2','#af956b');
   label('STACK HERE',485,188,'bold 17px Arial','#785c3c');
   for(let i=0;i<actor.placed;i++){rect(442,281-i*43,86,39,['#708ba0','#b97c62'][i],'#3a464d');}
   label(actor.placed+'/2',485,159,'bold 22px Arial','#374c48');
   if(actor.placed<2){rect(actor.x-36,actor.y-24,72,48,['#708ba0','#b97c62'][actor.placed],'#364c50');}
  }else if(t.id==='stop'){
   rect(63,302,W-126,9,'#a58b62');
   rect(t.target-64,179,128,122,'#e0bd5c','#a8852c');
   label('STOP',t.target,244,'bold 21px Arial','#745115');token(actor.x,238);
  }else if(t.id==='balance'){
   rect(256,176,168,135,'#9abc8e','#4c7751');
   label('HOLD HERE',340,195,'bold 16px Arial','#365838');
   rect(80,306,520,10,'#947b60');token(actor.x,248);
   const progress=Math.min(1,actor.held/1.8);
   rect(246,327,188,7,'#d0c6ae');rect(246,327,188*progress,7,'#398e63');
   label(actor.held.toFixed(1)+' / 1.8 sec',340,153,'bold 17px Arial','#385640');
  }else if(t.id==='dodge'){
   for(const d of t.drops){
    if(actor.elapsed<d.at)continue;
    const y=(actor.elapsed-d.at)*d.speed+133;
    if(y>=132&&y<=354)circle(ctx,d.x,y,27,'#ca6f65');
   }
   rect(52,329,576,7,'#987a58');token(actor.x,284,'#779d88');
   label('SURVIVE  '+Math.max(0,5.5-actor.elapsed).toFixed(1)+' s',340,156,'bold 18px Arial','#774b3a');
  }else if(t.id==='sort'){
   rect(88,184,176,126,'#b1d0e1','#507797');
   rect(416,184,176,126,'#e8d29b','#a88136');
   label('BLUE',176,249,'bold 22px Arial','#345774');
   label('GOLD',504,249,'bold 22px Arial','#80601d');
   const color=t.colors[actor.sorted];
   token(actor.x,actor.y,color===0?'#548fbc':'#e1ac43');
   label(actor.sorted+'/3 SORTED',340,163,'bold 16px Arial','#574838');
  }
 }
 function draw(){
  const t=activeTask();
  rect(0,0,W,H,'#372f31');
  rect(11,11,W-22,H-22,'#f5ebd3','#b79a67');
  label('TASKMASTER  ·  THE ENVELOPE',W/2,30,'bold 20px Georgia','#5a3029');
  label(index<0?'FREE PRACTICE':'TASK '+(index+1)+' / '+STEPS,95,68,'bold 17px Arial','#6b483a');
  label('SCORE  '+scores[player],340,67,'bold 18px Arial','#714a2d');
  label(phase==='running'?Math.max(0,clock).toFixed(1)+'s':phase==='card'?'READY':'✓',595,70,'bold 32px monospace',clock<2&&phase==='running'?'#b3443b':'#765437');
  label(t.help,W/2,112,'bold 19px Arial','#3d3a32');
  scenery(t);
  if(phase==='card'){
   rect(101,150,478,159,'#fff7e4','#8a653d');
   label(index<0?'PRACTICE · NO POINTS':'SEALED TASK '+(index+1),340,178,'bold 18px Arial','#86613a');
   label(t.icon,340,225,'bold 43px Arial','#4b483e');
   label('YOUR TIME STARTS NOW',340,278,'bold 23px Georgia','#632d2b');
  }else if(phase==='result'){
   rect(90,179,500,111,feedback.startsWith('TASK COMPLETE')||feedback.startsWith('GOOD')?'#d3efcd':'#f6d3c7','#685a48');
   label(feedback,340,233,'bold 29px Arial',feedback.startsWith('TASK COMPLETE')||feedback.startsWith('GOOD')?'#28633d':'#8d342d');
  }else if(phase==='running'&&actor.elapsed<.65){
   rect(190,343,300,27,'#6e493c');
   label('YOUR TIME STARTS NOW',340,357,'bold 16px Arial','#fff4e2');
  }
  label(s.players[player].name+'  ·  '+(index<0?'practice round':'round '+(index+1)+' of '+STEPS),W/2,383,'bold 13px Arial','#785940');
  s.status((index<0?'Practice (unscored). ':'')+t.help);
  s.debug={engine:'microrelay',course,practice,actor,phase,index,player,clock,scores,history,pointer};
 }
 s.frame(dt=>{if(phase==='handoff')return;advance(dt);if(phase!=='handoff')draw();});
 await beginPlayer();
}
Object.assign(exports,{RELAY_TASKS,relayCourse,relayBoxHit,relayStackHit,relaySortHit,relayStopHit,relayDodgeHit,microrelay});
