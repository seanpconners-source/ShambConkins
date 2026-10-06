const {seededRandom,clamp}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
function sliceDistance(point,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(point.x-a.x-dx*t,point.y-a.y-dy*t);}
// Normalized launch positions and ballistic heights keep both turns fair on any screen.
function fruitCourse(seed,count=45){const random=seededRandom(seed),gravity=1.9;return Array.from({length:count},(_,i)=>{const peak=[.14,.36,.58][i%3]+random()*.14;return {time:i*.65,x:.14+random()*.72,vx:(random()-.5)*.2,vy:-Math.sqrt(2*gravity*(1.07-peak)),peak,gravity,kind:Math.floor(random()*6),bomb:random()<.14};});}
async function fruitslice(s){
 const[c,x]=s.canvas(680,380,{fill:true});s.body.classList.add('drag-arena-body');
 const course=fruitCourse(s.seed),scores=[0,0],icons=['🍉','🍊','🍎','🍋','🥝','🍑'],colors=['#d96375','#e8a257','#ba443d','#ecd668','#7dbe70','#eea491'];
 let actor=0,phase='slice',clock=0,fruits=[],pieces=[],trail=[],drag=null,next=0,bombs=0,combo=0;
 const radius=()=>clamp(Math.min(s.W,s.H)*.07,15,34);
 function clear(){if(drag)s.release({pointerId:drag.id});drag=null;combo=0;}
 function swipe(a,b){
  if(s.paused||phase!=='slice')return;trail.push({x:b.x/s.W,y:b.y/s.H,age:0});
  for(const f of fruits){if(f.cut||sliceDistance({x:f.x*s.W,y:f.y*s.H},a,b)>radius()+3)continue;f.cut=true;
   if(f.bomb){bombs++;scores[actor]=Math.max(0,scores[actor]-25);combo=0;s.react?.(actor,'sad');sound('lose');for(let j=0;j<12;j++)pieces.push({x:f.x,y:f.y,vx:Math.cos(j)*.23,vy:Math.sin(j)*.4,age:0,color:'#efbc64',spark:true});}
   else{combo++;scores[actor]+=10+(combo>=3?5:0);sound('tap');for(const side of [-1,1])pieces.push({x:f.x,y:f.y,vx:f.vx+side*.14,vy:f.vy-.2,age:0,kind:f.kind,side,color:colors[f.kind]});}
   s.setScores(scores);
  }
 }
 async function end(){if(phase!=='slice')return;phase='handoff';clear();if(actor===1)return s.finish(scores,'Taskmaster Fruit Ninja · identical varied fruit waves, alternating human turns.');actor=1;clock=0;fruits=[];pieces=[];trail=[];next=0;bombs=0;if(await s.pass(1,`Player 1 scored ${scores[0]}. Same high, middle and low fruit waves for you. Swipe to slice. Thirty seconds.`))phase='slice';}
 s.on(c,'pointerdown',ev=>{if(s.paused||phase!=='slice'||drag)return;drag={id:ev.pointerId,p:s.pointer(ev)};combo=0;s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(drag?.id!==ev.pointerId)return;const p=s.pointer(ev);swipe(drag.p,p);drag.p=p;});
 s.on(c,'pointerup',ev=>{if(drag?.id!==ev.pointerId)return;swipe(drag.p,s.pointer(ev));clear();});
 for(const type of ['pointercancel','lostpointercapture'])s.on(c,type,ev=>{if(drag?.id===ev.pointerId)clear();});
 s.resetOnPause?.(clear);s.cleanup(clear);s.on(window,'blur',clear);s.on(window,'resize',clear);
 s.on(document,'keydown',ev=>{if(ev.key===' '&&!s.paused&&phase==='slice'){ev.preventDefault();const f=fruits.find(f=>!f.cut&&!f.bomb);if(f)swipe({x:f.x*s.W-35,y:f.y*s.H},{x:f.x*s.W+35,y:f.y*s.H});}});
 s.hint('Thirty seconds each on identical waves. Fruit arcs vary from low to near the top. Swipe through three fruits for a combo. Avoid bombs. Space slices one fruit.');
 s.frame(dt=>{
  if(phase==='slice'){clock+=dt;while(next<course.length&&course[next].time<=clock)fruits.push({...course[next++],y:1.07,cut:false});
   for(const f of fruits){f.x+=f.vx*dt;f.y+=f.vy*dt+.5*f.gravity*dt*dt;f.vy+=f.gravity*dt;if(f.x<.06||f.x>.94){f.x=clamp(f.x,.06,.94);f.vx*=-.7;}}
   fruits=fruits.filter(f=>!f.cut&&f.y<1.15);if(clock>=30||bombs>=3)void end();
  }
  for(const p of pieces){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=1.5*dt;p.age+=dt;}pieces=pieces.filter(p=>p.age<1);trail.forEach(p=>p.age+=dt);trail=trail.filter(p=>p.age<.22);
  const W=s.W,H=s.H,r=radius();x.fillStyle='#523c29';x.fillRect(0,0,W,H);x.strokeStyle='#806449';x.lineWidth=3;for(let i=0;i<W;i+=W/9){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke();}
  x.fillStyle='#fae7b5';x.font=`bold ${clamp(W*.028,12,19)}px Georgia`;x.textAlign='center';x.fillText('TASKMASTER · THE MELON BUFFET',W/2,25);
  for(const f of fruits){circle(x,f.x*W+3,f.y*H+5,r,'#0003');x.font=`${r*1.9}px Arial`;x.textAlign='center';x.fillText(f.bomb?'💣':icons[f.kind],f.x*W,f.y*H+r*.55);}
  for(const p of pieces){x.save();x.translate(p.x*W,p.y*H);x.rotate(p.side*p.age*4||0);x.globalAlpha=1-p.age;if(p.spark)circle(x,0,0,3,p.color);else{x.fillStyle=p.color;x.beginPath();x.arc(0,0,r,p.side===1?-Math.PI/2:Math.PI/2,p.side===1?Math.PI/2:Math.PI*1.5);x.closePath();x.fill();x.fillStyle='#ffecca';x.fillRect(-1,-r*.8,3,r*1.6);}x.restore();}
  if(trail.length>1){x.strokeStyle=actor===0?'#99e5ff':'#ffb6d8';x.lineWidth=5;x.beginPath();x.moveTo(trail[0].x*W,trail[0].y*H);for(const p of trail.slice(1))x.lineTo(p.x*W,p.y*H);x.stroke();}
  s.sprite(x,actor,clamp(W*.08,24,55),50,clamp(Math.min(W,H)*.16,38,65),{exact:true,mood:combo>=3?'win':'thinking'});
  s.status(`${s.players[actor].name} · ${Math.ceil(Math.max(0,30-clock))}s · bombs ${bombs}/3 · score ${scores[actor]}${combo>=3?' · COMBO!':''}`);
  s.debug={actor,phase,fruits:fruits.map(f=>({...f,x:f.x*W,y:f.y*H,radius:r})),normalizedFruits:fruits,course,swipe,clock,scores,bombs,end};
 });
 await s.pass(0,'Fruit Ninja at Taskmaster’s melon buffet. Swipe high, middle and low arcs. Thirty seconds each, identical waves, combos, and dangerous bombs.');
}

Object.assign(exports,{sliceDistance,fruitCourse,fruitslice});