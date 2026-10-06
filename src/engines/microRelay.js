const {clamp, seededRandom, shuffle}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
const RELAY_TASKS=Object.freeze([
 {id:'crate',title:'PUT YOUR HEAD IN THE BOX',reference:'Metal Gear · cardboard box',seconds:7,help:'Drag your head into the cardboard box, then release.'},
 {id:'memory',title:'MAKE THE FIGHT MILK',reference:'Always Sunny · Fight Milk',seconds:8,help:'Remember the three ingredients. After they hide, tap the four big ingredient buttons at the bottom in the same order.'},
 {id:'stop',title:'STOP INSIDE THE CONE',reference:'Parks and Recreation · Cones of Dunshire',seconds:7,help:'Tap anywhere on the screen to STOP when your moving head is inside the gold window.'},
 {id:'balance',title:'BALANCE THE BUSTER SWORD',reference:'Final Fantasy · Cloud’s sword',seconds:7,help:'Drag left/right to keep your head in the green balance zone for three seconds.'},
 {id:'dodge',title:'DODGE THE KITTEN MITTENS',reference:'Always Sunny · Kitten Mittens',seconds:7,help:'Drag your head left/right. Avoid the falling mittens until time runs out.'},
 {id:'bus',title:'KEEP THE BUS ABOVE 50',reference:'Speed · the bus',seconds:7,help:'Drag the pedal up/down. Keep speed above 50 without overheating the engine. The middle pedal position maintains speed.'},
 {id:'trace',title:'RESTORE THE PARK FENCE',reference:'Jurassic Park · electric fences',seconds:8,help:'Drag from START along every fence bend. Stay on the wire; shortcuts cut the power.'},
 {id:'attack',title:'ACK ACK! SAVE YOUR FRIEND',reference:'Mars Attacks! · Martians',seconds:8,help:'Tap four Martians as they pop up. Never tap your own head: that is your friend!'},
 {id:'beat',title:'KEEP THE SABBATH BEAT',reference:'Black Sabbath · rhythm section',seconds:6,help:'Tap anywhere when each of the three notes reaches the gold line. Three accurate beats; early or late taps fail.'},
 {id:'pizza',title:'FOUR SLICES FOR FOUR TURTLES',reference:'Teenage Mutant Ninja Turtles · pizza',seconds:8,help:'Make two straight crossing swipes through the center of the pizza. Cross at a right angle to make four slices.'}
]);
function relayCourse(seed){const r=seededRandom(seed);return shuffle(RELAY_TASKS,r).slice(0,5).map(t=>({...t,target:380+r()*110,sequence:shuffle([0,1,2,3],r).slice(0,3),rain:Array.from({length:12},(_,i)=>({x:50+r()*580,at:i*.5,speed:160+r()*60})),path:[{x:85,y:262},{x:220,y:164+r()*15},{x:350,y:277-r()*16},{x:478,y:171+r()*15},{x:595,y:255}],popups:Array.from({length:9},(_,i)=>({x:90+r()*490,y:165+r()*115,at:i*.73,friend:i===1||i===4})),beats:[1.2,2.5,3.8]}));}
function relayStopHit(task,position){return Math.abs(position-task.target)<=46;}
function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
function relayTraceStep(task,actor,from,to){
 const distance=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.max(1,Math.ceil(distance/8));
 for(let i=1;i<=steps;i++){const p={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps},index=actor.pathIndex;
  if(index>=task.path.length)return true;
  if(segmentDistance(p,task.path[index-1],task.path[index])>27){actor.failed=true;return false;}
  if(Math.hypot(p.x-task.path[index].x,p.y-task.path[index].y)<23)actor.pathIndex++;
 }return actor.pathIndex>=task.path.length;
}
function relayPizzaCut(points,center={x:340,y:212},radius=77){
 if(points.length<2)return null;const a=points[0],b=points.at(-1);
 if(Math.hypot(a.x-center.x,a.y-center.y)<radius*.9||Math.hypot(b.x-center.x,b.y-center.y)<radius*.9||Math.hypot(b.x-a.x,b.y-a.y)<radius*1.8||segmentDistance(center,a,b)>17||points.some(p=>segmentDistance(p,a,b)>20))return null;
 return {a,b,angle:Math.atan2(b.y-a.y,b.x-a.x)};
}
function relayCutsCross(a,b){const d=Math.abs(Math.sin(a.angle-b.angle));return d>.92;}
async function microrelay(s){
 const[c,x,W,H]=s.canvas(680,400),course=relayCourse(s.seed),scores=[0,0],history=[[],[]],ingredients=['🥛','🥚','💪','🍌'];
 let player=0,index=0,phase='handoff',clock=0,actor=null,resultLeft=0,pointer=null;
 function controls(){}
 const memoryButton=p=>p.y<H*.55?-1:clamp(Math.floor((p.x-(W/2-200))/100),0,3);
 function clearPointer(){const id=pointer;pointer=null;if(id!==null)s.release({pointerId:id});if(actor){actor.throttle=0;actor.lastPoint=null;actor.stroke=[];}}
 function beginTask(){phase='preview';clock=1.5;actor={x:course[index].id==='crate'?90:W/2,y:course[index].id==='crate'?H*.65:H-75,time:0,balance:0,remember:0,failed:false,targetX:W/2,speed:75,throttle:0,heat:0,low:0,pathIndex:1,lastPoint:null,trace:[],hits:0,hitPopups:[],beat:0,stroke:[],cuts:[]};clearPointer();controls();s.hint(course[index].help);s.active=player;s.updateScores();}
 async function beginPlayer(){phase='handoff';if(!await s.pass(player,'Five quick tasks dealt from TEN different games. Drag, trace, remember, time a beat, slice, steer or catch a target. Read each task before its clock starts. Both humans receive the SAME seeded tasks and hazards.','Ready — your time starts now'))return;index=0;beginTask();}
 function complete(won){if(phase!=='running')return;phase='result';resultLeft=1.05;const bonus=won?10+Math.min(4,Math.floor(Math.max(0,clock))):0;scores[player]+=bonus;history[player].push({id:course[index].id,won,bonus});s.setScores(scores);s.react?.(player,won?'win':'sad');sound(won?'win':'lose');clearPointer();}
 function ingredient(i){if(s.paused||phase!=='running'||course[index].id!=='memory'||actor.time<2)return;if(i!==course[index].sequence[actor.remember])return complete(false);actor.remember++;sound('tap');if(actor.remember===3)complete(true);}
 function beat(){if(s.paused||phase!=='running'||course[index].id!=='beat')return;if(Math.abs(actor.time-course[index].beats[actor.beat])>.17)return complete(false);actor.beat++;sound('tap');if(actor.beat===3)complete(true);}
 function shootAlien(p){const t=course[index],j=t.popups.findIndex(q=>actor.time>=q.at&&actor.time<q.at+.65&&Math.hypot(p.x-q.x,p.y-q.y)<38);if(j<0||actor.hitPopups.includes(j))return;if(t.popups[j].friend)return complete(false);actor.hitPopups.push(j);actor.hits++;sound('tap');if(actor.hits>=4)complete(true);}
 const steer=p=>{const id=course[index].id;if(id==='crate'){actor.x=clamp(p.x,38,W-38);actor.y=clamp(p.y,50,H-40);}else if(id==='bus')actor.throttle=clamp((315-p.y)/160,0,1);else if(id==='trace'){if(actor.lastPoint&&relayTraceStep(course[index],actor,actor.lastPoint,p))complete(true);else if(actor.failed)complete(false);if(phase==='running'){actor.lastPoint=p;actor.trace.push(p);}}else if(id==='pizza'){actor.stroke.push(p);}else actor.targetX=clamp(p.x,40,W-40);};
 s.on(c,'pointerdown',ev=>{if(s.paused||phase!=='running'||pointer!==null)return;const t=course[index],p=s.pointer(ev);if(t.id==='attack'){ev.preventDefault();shootAlien(p);return;}if(t.id==='beat'){ev.preventDefault();beat();return;}if(t.id==='stop'){ev.preventDefault();complete(relayStopHit(t,actor.x));return;}if(t.id==='memory'){ev.preventDefault();const i=memoryButton(p);if(i>=0)ingredient(i);return;}if(!['crate','balance','dodge','bus','trace','pizza'].includes(t.id))return;if(t.id==='crate'&&Math.hypot(p.x-actor.x,p.y-actor.y)>70)return;if(t.id==='trace'){if(Math.hypot(p.x-t.path[0].x,p.y-t.path[0].y)>32)return;actor.pathIndex=1;actor.trace=[];actor.lastPoint=p;}if(t.id==='pizza')actor.stroke=[];ev.preventDefault();pointer=ev.pointerId;s.capture(ev);steer(p);});
 s.on(c,'pointermove',ev=>{if(ev.pointerId===pointer&&!s.paused&&phase==='running'){ev.preventDefault();steer(s.pointer(ev));}});
 const release=(ev,cancelled)=>{if(ev.pointerId!==pointer)return;s.release(ev);if(!cancelled&&!s.paused&&phase==='running'){steer(s.pointer(ev));if(course[index].id==='crate')complete(Math.abs(actor.x-course[index].target)<53&&Math.abs(actor.y-H*.52)<54);if(course[index].id==='pizza'){const cut=relayPizzaCut(actor.stroke);if(cut&&(!actor.cuts.length||relayCutsCross(actor.cuts[0],cut))){actor.cuts.push(cut);sound('tap');if(actor.cuts.length===2)complete(true);}}}clearPointer();};
 s.on(c,'pointerup',ev=>release(ev,false));s.on(c,'pointercancel',ev=>release(ev,true));s.on(c,'lostpointercapture',ev=>release(ev,true));s.on(window,'blur',clearPointer);s.resetOnPause?.(clearPointer);s.cleanup(clearPointer);
 s.on(document,'keydown',ev=>{if(s.paused||phase!=='running'||ev.repeat)return;if(ev.key===' '&&course[index].id==='stop'){ev.preventDefault();complete(relayStopHit(course[index],actor.x));}if(ev.key===' '&&course[index].id==='beat'){ev.preventDefault();beat();}if(/^[1-4]$/.test(ev.key))ingredient(Number(ev.key)-1);});
 s.frame(dt=>{
  if(phase==='handoff')return;const t=course[index];
  if(phase==='preview'){clock-=dt;if(clock<=0){phase='running';clock=t.seconds;}}
  else if(phase==='result'){resultLeft-=dt;if(resultLeft<=0){index++;if(index===course.length){if(player===1){s.finish(scores,'Taskmaster × WarioWare · five matched microtasks each');return;}player=1;index=0;void beginPlayer();return;}beginTask();}}
  else if(phase==='running'){
   clock-=dt;actor.time+=dt;
   if(t.id==='stop')actor.x=75+(W-150)*(.5+.5*Math.sin(actor.time*2.6));
   if(t.id==='balance'){actor.x=clamp(actor.x+((pointer!==null?(actor.targetX-actor.x)*8:95)+Math.sin(actor.time*5.3)*55)*dt,35,W-35);actor.balance=Math.abs(actor.x-W/2)<42?actor.balance+dt:0;if(actor.balance>=3)complete(true);}
   if(t.id==='dodge'){actor.x+=clamp(actor.targetX-actor.x,-450*dt,450*dt);for(const drop of t.rain){const y=(actor.time-drop.at)*drop.speed-25;if(actor.time>=drop.at&&Math.hypot(drop.x-actor.x,y-actor.y)<33){actor.failed=true;complete(false);break;}}}
   if(t.id==='bus'){actor.speed=Math.max(0,actor.speed+(actor.throttle*110-55)*dt);actor.heat=clamp(actor.heat+(actor.throttle>.8?.65:-.8)*dt,0,1);actor.low=actor.speed<50?actor.low+dt:0;if(actor.low>.35||actor.heat>=1)complete(false);}
   if(t.id==='beat'&&actor.time>t.beats[actor.beat]+.17)complete(false);
   if(clock<=0&&phase==='running')complete(['dodge','bus'].includes(t.id)&&!actor.failed);
  }
  x.fillStyle='#f0dfc0';x.fillRect(0,0,W,H);x.strokeStyle='#a9463c';x.lineWidth=9;x.strokeRect(8,8,W-16,H-16);
  x.fillStyle='#743f39';x.textAlign='center';x.font='bold 23px Arial';x.fillText(t.title,W/2,43);x.font='12px Arial';x.fillText(t.reference,W/2,67);
  x.font='bold 31px monospace';x.fillText(phase==='preview'?'READ THE TASK':phase==='result'?(history[player].at(-1)?.won?'TASK COMPLETE ✓':'OH DEAR…'):Math.ceil(Math.max(0,clock))+'s',W/2,110);
  if(t.id==='crate'){x.fillStyle='#bd8d54';x.fillRect(t.target-55,H*.52-52,110,104);x.strokeStyle='#765133';x.lineWidth=4;x.strokeRect(t.target-55,H*.52-52,110,104);x.beginPath();x.moveTo(t.target-55,H*.52);x.lineTo(t.target+55,H*.52);x.stroke();x.font='16px Arial';x.fillStyle='#69432d';x.fillText('SNAKE’S BOX',t.target,H*.52+7);s.sprite(x,player,actor.x,actor.y,75,{exact:true});}
  if(t.id==='memory'){x.font='46px Arial';const sequence=actor.time<2||phase==='preview'?t.sequence.map(i=>ingredients[i]):Array.from({length:3},(_,i)=>i<actor.remember?ingredients[t.sequence[i]]:'?');sequence.forEach((icon,i)=>x.fillText(icon,W/2+(i-1)*110,210));x.font='16px Arial';x.fillText(actor.time<2||phase==='preview'?'MEMORIZE → THEN REPEAT':'YOUR INGREDIENTS, IN ORDER',W/2,264);for(let i=0;i<4;i++){const bx=W/2+(i-1.5)*100,by=H-62,live=actor.time>=2&&phase==='running';circle(x,bx,by,40,live?'#e7c27a':'#d8cdb4');x.strokeStyle='#a9463c';x.lineWidth=3;x.beginPath();x.arc(bx,by,40,0,Math.PI*2);x.stroke();x.font='38px Arial';x.fillStyle='#000';x.fillText(ingredients[i],bx,by+13);}s.sprite(x,player,52,H-62,56,{exact:true});}
  if(t.id==='stop'){x.fillStyle='#c6a363';x.fillRect(t.target-46,177,92,95);x.fillStyle='#8c683d';x.font='38px Arial';x.fillText('🔶',t.target,315);s.sprite(x,player,actor.x,223,83,{exact:true});x.strokeStyle='#80674c';x.lineWidth=4;x.beginPath();x.moveTo(65,273);x.lineTo(W-65,273);x.stroke();}
  if(t.id==='balance'){x.fillStyle='#659b76';x.fillRect(W/2-42,155,84,114);x.strokeStyle='#69747e';x.lineWidth=15;x.beginPath();x.moveTo(65,280);x.lineTo(W-65,280);x.stroke();x.font='14px Arial';x.fillStyle='#46594a';x.fillText(actor.balance.toFixed(1)+' / 3.0 seconds balanced',W/2,320);s.sprite(x,player,actor.x,215,79,{exact:true});}
  if(t.id==='dodge'){for(const drop of t.rain){const y=(actor.time-drop.at)*drop.speed-25;if(actor.time>=drop.at&&y<H+25){x.font='36px Arial';x.fillText('🧤',drop.x,y);}}s.sprite(x,player,actor.x,actor.y,78,{exact:true});}
  if(t.id==='bus'){x.fillStyle='#3e4b4e';x.fillRect(70,155,455,152);x.strokeStyle='#e8cc70';x.lineWidth=4;x.setLineDash([16,20]);x.beginPath();x.moveTo(70,285);x.lineTo(525,285);x.stroke();x.setLineDash([]);x.fillStyle='#d8ac4c';x.fillRect(145,192,232,65);x.fillStyle='#86b7ba';for(let i=0;i<4;i++)x.fillRect(166+i*43,203,34,24);circle(x,187,260,17,'#3c3333');circle(x,340,260,17,'#3c3333');s.sprite(x,player,166,183,69,{exact:true});x.fillStyle='#704b40';x.font='bold 23px monospace';x.fillText(Math.round(actor.speed)+' MPH',W/2,338);x.fillStyle='#759076';x.fillRect(575,155,40,160);x.fillStyle='#efc267';x.fillRect(575,315-actor.throttle*160,40,8);x.fillStyle='#b35344';x.fillRect(94,313,160*actor.heat,8);}
  if(t.id==='trace'){x.strokeStyle='#718584';x.lineWidth=36;x.lineJoin='round';x.beginPath();t.path.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();x.strokeStyle='#e9b24d';x.lineWidth=4;x.stroke();x.strokeStyle='#78ad7b';x.lineWidth=7;x.beginPath();actor.trace.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();t.path.forEach((p,i)=>{circle(x,p.x,p.y,11,i<actor.pathIndex?'#7ac68e':'#d6a35c');});x.fillStyle='#725548';x.font='14px Arial';x.fillText('START',t.path[0].x,305);x.fillText('POWER',t.path.at(-1).x,303);const p=actor.lastPoint||t.path[0];s.sprite(x,player,p.x,p.y-33,63,{exact:true});}
  if(t.id==='attack'){for(const[j,p]of t.popups.entries()){if(actor.time<p.at||actor.time>=p.at+.65||actor.hitPopups.includes(j))continue;if(p.friend)s.sprite(x,player,p.x,p.y,72,{exact:true,mood:'happy'});else{circle(x,p.x,p.y,31,'#9bb792');circle(x,p.x,p.y-11,23,'#dda0aa');x.strokeStyle='#6f676c';x.lineWidth=2;for(let k=0;k<4;k++){x.beginPath();x.arc(p.x+(k-1.5)*8,p.y-11,8,-1,2);x.stroke();}x.fillStyle='#fae4b6';x.fillRect(p.x-23,p.y+9,46,9);x.fillStyle='#4d585b';x.fillRect(p.x-20,p.y+12,40,2);}}x.fillStyle='#725548';x.font='18px Arial';x.fillText(`${actor.hits} / 4 Martians · spare your friend!`,W/2,339);}
  if(t.id==='beat'){x.strokeStyle='#ad8971';x.lineWidth=6;x.beginPath();x.moveTo(75,230);x.lineTo(610,230);x.stroke();x.fillStyle='#dca736';x.fillRect(152,170,8,105);t.beats.forEach((at,i)=>{if(i<actor.beat)return;const xx=156+(at-actor.time)*120;if(xx>50&&xx<630){x.fillStyle='#715886';x.font='48px Georgia';x.fillText('♪',xx,242);}});s.sprite(x,player,156,292,72,{exact:true,mood:'happy'});x.font='18px Arial';x.fillStyle='#725548';x.fillText(`${actor.beat} / 3 beats`,W/2,333);}
  if(t.id==='pizza'){circle(x,W/2,212,82,'#cba26b');circle(x,W/2,212,73,'#e9b964');for(let i=0;i<11;i++){const angle=i*2.4,r=25+(i%3)*15;circle(x,W/2+Math.cos(angle)*r,212+Math.sin(angle)*r,8,'#b55c42');}x.strokeStyle='#376857';x.lineWidth=4;for(const cut of actor.cuts){x.beginPath();x.moveTo(cut.a.x,cut.a.y);x.lineTo(cut.b.x,cut.b.y);x.stroke();}if(actor.stroke.length){x.strokeStyle='#8b8172';x.beginPath();actor.stroke.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();}s.sprite(x,player,535,270,75,{exact:true,mood:'happy'});x.font='18px Arial';x.fillStyle='#725548';x.fillText(`${actor.cuts.length} / 2 crossing cuts`,W/2,339);}
  x.fillStyle='#734638';x.font='13px Arial';x.fillText(`${s.players[player].name} · task ${index+1}/5 · ${scores[player]} points`,W/2,H-20);s.status(t.help);s.debug={engine:'microrelay',course,actor,player,index,phase,clock,history,scores};
 });
 await beginPlayer();
}

Object.assign(exports,{RELAY_TASKS,relayCourse,relayStopHit,relayTraceStep,relayPizzaCut,relayCutsCross,microrelay});