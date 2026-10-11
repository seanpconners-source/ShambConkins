const {seededRandom,clamp}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
function sliceDistance(point,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(point.x-a.x-dx*t,point.y-a.y-dy*t);}
// All coordinates/distances are canvas logical pixels, independent of phone CSS scaling.
// A stroke needs >=10px movement at >=120px/s; idle gaps >160ms do not sweep
// across unseen space. Cap each combo at 380ms or 1.25 canvas diagonals.
// A sharp reversal (dot < -0.25) starts a fresh stroke even while held.
const SWIPE_LIMITS=Object.freeze({minMove:10,minSpeed:120,maxGapMs:160,maxStrokeMs:380,maxTravelFactor:1.25,reverseDot:-.25});
function fruitSwipeStep(drag,p,now,W,H){
 const a=drag.p,dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),limit=Math.hypot(W,H)*SWIPE_LIMITS.maxTravelFactor;
 const old=drag.stroke,expired=!!old&&(now-old.start>SWIPE_LIMITS.maxStrokeMs||now-old.last>SWIPE_LIMITS.maxGapMs);
 if(expired)drag.stroke=null;
 // Do not bridge a pause, lag spike, or long stationary hold with a teleporting cut.
 if(now-drag.at>SWIPE_LIMITS.maxGapMs||!Number.isFinite(d)||d>limit){
  drag.p=p;drag.at=now;drag.stroke=null;return {a:null,b:null,reset:!!old};
 }
 if(d<SWIPE_LIMITS.minMove)return {a:null,b:null,reset:expired};
 const speed=d*1000/Math.max(1,now-drag.at);
 if(speed<SWIPE_LIMITS.minSpeed){
  drag.p=p;drag.at=now;drag.stroke=null;return {a:null,b:null,reset:!!old};
 }
 let stroke=drag.stroke;
 const reversed=stroke?.direction&&((stroke.direction.x*dx+stroke.direction.y*dy)/(stroke.direction.length*d)<SWIPE_LIMITS.reverseDot);
 const restart=!!stroke&&(stroke.travel+d>limit||reversed);
 if(restart)stroke=null;
 if(!stroke)stroke={start:now,last:now,travel:0,direction:null};
 stroke.travel+=d;stroke.last=now;stroke.direction={x:dx,y:dy,length:d};
 drag.stroke=stroke;drag.p=p;drag.at=now;
 return {a,b:p,reset:expired||restart};
}
// Normalized launch positions and ballistic heights keep both turns fair on any screen.
function fruitCourse(seed,count=45){const random=seededRandom(seed),gravity=1.9;return Array.from({length:count},(_,i)=>{const peak=[.14,.36,.58][i%3]+random()*.14;return {time:i*.65,x:.14+random()*.72,vx:(random()-.5)*.2,vy:-Math.sqrt(2*gravity*(1.07-peak)),peak,gravity,kind:Math.floor(random()*6),bomb:random()<.14};});}
// The "fruit" is the opponent's head: whole heads fly up looking smug, sliced heads split into two sad, squished halves.
function drawHeadHalf(s,x,player,cx,cy,size,side,angle,squish){x.save();x.translate(cx,cy);x.rotate(angle);x.scale(1+squish*.18,1-squish*.22);x.beginPath();x.rect(side<0?-size:0,-size,size,size*2);x.clip();s.sprite(x,player,0,0,size,{exact:true,mood:'sad'});
 x.strokeStyle='#ffffffcc';x.lineWidth=Math.max(2,size*.05);x.beginPath();x.moveTo(0,-size*.42);x.lineTo(0,size*.42);x.stroke();x.restore();}
async function fruitslice(s){
 const[c,x]=s.canvas(680,380,{fill:true});s.body.classList.add('drag-arena-body');
 const course=fruitCourse(s.seed),scores=[0,0],colors=['#ff5d73','#ffb347','#ff3b3b','#ffe066','#7ee081','#f78fb3'],moods=['happy','silly','thinking','normal','walking','happy'];
 let actor=0,phase='slice',clock=0,fruits=[],pieces=[],trail=[],drag=null,next=0,bombs=0,combo=0,shake=0,popups=[];
 const radius=()=>clamp(Math.min(s.W,s.H)*.085,22,46),target=()=>1-actor;
 function clear(){if(drag)s.release({pointerId:drag.id});drag=null;combo=0;}
 function swipe(a,b){
  if(s.paused||phase!=='slice')return;trail.push({x:b.x/s.W,y:b.y/s.H,age:0});
  for(const f of fruits){if(f.cut||sliceDistance({x:f.x*s.W,y:f.y*s.H},a,b)>radius()+3)continue;f.cut=true;
   if(f.bomb){bombs++;scores[actor]=Math.max(0,scores[actor]-25);combo=0;shake=.35;s.react?.(actor,'sad');s.react?.(target(),'happy');sound('lose');popups.push({x:f.x,y:f.y,text:'-25',color:'#ff8a5c',age:0});for(let j=0;j<16;j++)pieces.push({x:f.x,y:f.y,vx:Math.cos(j)*.3,vy:Math.sin(j)*.45,age:0,color:j%2?'#efbc64':'#ff5a36',spark:true});}
   else{combo++;const gain=10+(combo>=3?5:0);scores[actor]+=gain;sound(combo>=3?'pickup':'tap');s.react?.(target(),'sad');if(combo>=3)s.react?.(actor,'happy');
    const angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2;popups.push({x:f.x,y:f.y,text:combo>=3?`+${gain} COMBO x${combo}`:`+${gain}`,color:combo>=3?'#ffe066':'#fff',age:0});
    for(const side of [-1,1])pieces.push({x:f.x,y:f.y,vx:f.vx+side*.16,vy:f.vy-.25,age:0,side,head:true,angle,spin:side*(2.5+f.kind*.3)});
    for(let j=0;j<10;j++)pieces.push({x:f.x,y:f.y,vx:Math.cos(j*2.4)*(.12+j*.015),vy:Math.sin(j*2.4)*.3-.15,age:0,color:colors[f.kind],spark:true});}
   s.setScores(scores);
  }
 }
 async function end(){if(phase!=='slice')return;phase='handoff';clear();if(actor===1)return s.finish(scores,'Taskmaster Fruit Ninja · identical waves of opponent heads, alternating human turns.');actor=1;clock=0;fruits=[];pieces=[];trail=[];popups=[];next=0;bombs=0;if(await s.pass(1,`${s.players[0].name} scored ${scores[0]}. Now it is your turn to slice ${s.players[0].name}'s flying heads: same waves, thirty seconds. Avoid the bombs.`))phase='slice';}
 function inputMove(p){
  const segment=fruitSwipeStep(drag,p,performance.now(),s.W,s.H);
  if(segment.reset)combo=0;
  if(segment.a)swipe(segment.a,segment.b);
 }
 s.on(c,'pointerdown',ev=>{if(s.paused||phase!=='slice'||drag)return;drag={id:ev.pointerId,p:s.pointer(ev),at:performance.now(),stroke:null};combo=0;s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(drag?.id!==ev.pointerId)return;inputMove(s.pointer(ev));});
 s.on(c,'pointerup',ev=>{if(drag?.id!==ev.pointerId)return;inputMove(s.pointer(ev));clear();});
 for(const type of ['pointercancel','lostpointercapture'])s.on(c,type,ev=>{if(drag?.id===ev.pointerId)clear();});
 s.resetOnPause?.(clear);s.cleanup(clear);s.on(window,'blur',clear);s.on(window,'resize',clear);
 // Space is one discrete slice per key press, never an open-ended keyboard combo.
 s.on(document,'keydown',ev=>{if(ev.key===' '&&!ev.repeat&&!s.paused&&phase==='slice'){ev.preventDefault();clear();const f=fruits.find(f=>!f.cut&&!f.bomb);if(f)swipe({x:f.x*s.W-35,y:f.y*s.H},{x:f.x*s.W+35,y:f.y*s.H});combo=0;}});
 s.hint('Thirty seconds each on identical waves of your opponent’s flying heads. Swipe to slice them in half (+10); three heads in one swipe is a combo (+15 each). Bombs cost 25 and three bombs end your turn. Space slices one head.');
 s.frame(dt=>{
  if(drag?.stroke){
   const now=performance.now();
   if(now-drag.stroke.start>SWIPE_LIMITS.maxStrokeMs||now-drag.stroke.last>SWIPE_LIMITS.maxGapMs){drag.stroke=null;combo=0;}
  }
  if(phase==='slice'){clock+=dt;while(next<course.length&&course[next].time<=clock)fruits.push({...course[next++],y:1.07,cut:false});
   for(const f of fruits){f.x+=f.vx*dt;f.y+=f.vy*dt+.5*f.gravity*dt*dt;f.vy+=f.gravity*dt;if(f.x<.06||f.x>.94){f.x=clamp(f.x,.06,.94);f.vx*=-.7;}}
   fruits=fruits.filter(f=>!f.cut&&f.y<1.15);if(clock>=30||bombs>=3)void end();
  }
  for(const p of pieces){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=1.5*dt;p.age+=dt;}pieces=pieces.filter(p=>p.age<(p.head?1.3:.8));trail.forEach(p=>p.age+=dt);trail=trail.filter(p=>p.age<.22);popups.forEach(p=>p.age+=dt);popups=popups.filter(p=>p.age<.8);shake=Math.max(0,shake-dt);
  const W=s.W,H=s.H,r=radius(),head=r*2.35;x.save();if(shake>0)x.translate((Math.random()-.5)*shake*30,(Math.random()-.5)*shake*30);
  x.fillStyle='#523c29';x.fillRect(-20,-20,W+40,H+40);x.strokeStyle='#806449';x.lineWidth=3;for(let i=0;i<W;i+=W/9){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke();}
  x.fillStyle='#fae7b5';x.font=`bold ${clamp(W*.028,12,19)}px Georgia`;x.textAlign='center';x.fillText(`TASKMASTER · ${s.players[target()].name.toUpperCase()} HEAD BUFFET`,W/2,25);
  for(const p of pieces)if(p.spark){x.globalAlpha=Math.max(0,1-p.age/.8);circle(x,p.x*W,p.y*H,Math.max(2,r*.12),p.color);x.globalAlpha=1;}
  for(const f of fruits){if(f.bomb){circle(x,f.x*W+3,f.y*H+5,r,'#0003');x.font=`${r*1.9}px Arial`;x.textAlign='center';x.textBaseline='alphabetic';x.fillText('💣',f.x*W,f.y*H+r*.55);continue;}
   circle(x,f.x*W+4,f.y*H+6,r*.9,'#0003');x.strokeStyle=colors[f.kind];x.lineWidth=Math.max(3,r*.12);x.beginPath();x.arc(f.x*W,f.y*H,r*1.02,0,Math.PI*2);x.stroke();
   s.sprite(x,target(),f.x*W,f.y*H,head,{exact:true,mood:moods[f.kind]});}
  for(const p of pieces)if(p.head){x.globalAlpha=Math.max(0,1-Math.max(0,p.age-.7)/.6);drawHeadHalf(s,x,target(),p.x*W,p.y*H,head,p.side,p.angle+p.spin*p.age,Math.min(1,p.age*4));x.globalAlpha=1;}
  for(const p of popups){x.globalAlpha=1-p.age/.8;x.fillStyle=p.color;x.font=`bold ${clamp(r*.7,14,28)}px system-ui`;x.textAlign='center';x.textBaseline='alphabetic';x.strokeStyle='#0008';x.lineWidth=4;x.strokeText(p.text,p.x*W,p.y*H-r-p.age*40);x.fillText(p.text,p.x*W,p.y*H-r-p.age*40);x.globalAlpha=1;}
  if(trail.length>1){x.strokeStyle=actor===0?'#99e5ff':'#ffb6d8';x.lineCap='round';x.lineWidth=7;x.beginPath();x.moveTo(trail[0].x*W,trail[0].y*H);for(const p of trail.slice(1))x.lineTo(p.x*W,p.y*H);x.stroke();x.strokeStyle='#fff';x.lineWidth=2.5;x.stroke();}
  x.restore();
  s.sprite(x,actor,clamp(W*.08,30,60),56,clamp(Math.min(W,H)*.16,50,80),{exact:true,mood:combo>=3?'win':bombs&&shake>0?'sad':'thinking'});
  s.status(`${s.players[actor].name} · ${Math.ceil(Math.max(0,30-clock))}s · bombs ${bombs}/3 · score ${scores[actor]}${combo>=3?' · COMBO!':''}`);
  s.debug={actor,phase,fruits:fruits.map(f=>({...f,x:f.x*W,y:f.y*H,radius:r})),normalizedFruits:fruits,course,swipe,clock,scores,bombs,end,pieces};
 });
 await s.pass(0,`Fruit Ninja at Taskmaster’s buffet, except the fruit is ${s.players[1].name}’s head. Swipe to slice. Thirty seconds each, identical waves, combos, and dangerous bombs.`);
}

Object.assign(exports,{sliceDistance,fruitCourse,fruitSwipeStep,SWIPE_LIMITS,fruitslice});