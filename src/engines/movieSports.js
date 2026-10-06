const {clamp, seededRandom}=require("src/utils.js");
const {circle, COLORS}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
function bowlingScore(rolls,frames=3){let index=0,total=0;for(let frame=0;frame<frames&&index<rolls.length;frame++){if(frame===frames-1){total+=rolls.slice(index).reduce((a,b)=>a+b,0);break;}const first=rolls[index];if(first===10){total+=10+(rolls[index+1]||0)+(rolls[index+2]||0);index++;}else{const second=rolls[index+1]||0;total+=first+second+(first+second===10?(rolls[index+2]||0):0);index+=2;}}return total;}
function bowlingFrameDone(rolls,last=false){if(!last)return rolls[0]===10||rolls.length>=2;if(rolls.length<2)return false;if(rolls[0]===10||rolls[0]+rolls[1]===10)return rolls.length>=3;return true;}
async function bowling(s){const[c,x]=s.canvas(680,360,{fill:true});let W=680,H=360,K=1,LH=190;const all=[[],[]],score=[0,0];let actor=0,frame=0,pins=[],ball,drag=null,phase='aim',clock=10,age=0,spin=0,aim=0,frameRolls=[],standing=10,message='';
 function rack(){pins=[];for(let row=0;row<4;row++)for(let j=0;j<=row;j++)pins.push({x:W/2+(j-row/2)*27,y:108-row*24,vx:0,vy:0,down:false});}
 function reset(){aim=0;spin=0;ball={x:W/2,y:H-34,vx:0,vy:0};phase='aim';clock=10;age=0;drag=null;standing=pins.filter(p=>!p.down).length;}
 function fire(power=1){if(s.paused||phase!=='aim')return;ball.vx=aim*420*power;ball.vy=-470*power;phase='rolling';age=0;drag=null;sound('shot');}
 async function settle(){if(phase!=='rolling')return;phase='handoff';const knocked=standing-pins.filter(p=>!p.down).length;frameRolls.push(knocked);all[actor].push(knocked);score[actor]=bowlingScore(all[actor]);s.setScores(score);message=knocked===10?'STRIKE!':frameRolls.length===2&&frameRolls[0]+frameRolls[1]===10?'SPARE!':knocked+' pins';if(/STRIKE|SPARE/.test(message)){s.react?.(actor,'win');sound('win');}
  if(!bowlingFrameDone(frameRolls,frame===2)){if(pins.every(p=>p.down))rack();reset();return;}
  frameRolls=[];if(actor===0)actor=1;else{actor=0;frame++;}if(frame===3)return s.finish(score,'Kingpin · three frames, regulation strike and spare bonuses.');rack();reset();phase='handoff';if(await s.pass(actor,`${message} Frame ${frame+1}/3. Hook changes the curve; strikes and spares earn real next-roll bonuses.`))phase='aim';
 }
 // Slingshot: touch anywhere on the lane (that is where the ball starts), pull back toward you and release. A quick flick upward also works.
 const pt=ev=>{const p=s.pointer(ev);return {x:p.x/K,y:p.y/K};};
 s.on(c,'pointerdown',ev=>{if(s.paused||phase!=='aim'||drag)return;ev.preventDefault();const p=pt(ev);ball.x=clamp(p.x,W/2-LH+16,W/2+LH-16);drag={id:ev.pointerId,start:p,p,t:performance.now()};s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(drag?.id===ev.pointerId)drag.p=pt(ev);});
 s.on(c,'pointerup',ev=>{if(drag?.id===ev.pointerId){const p=pt(ev),st=drag.start,dy=p.y-st.y,pull=Math.hypot(p.x-st.x,dy);if(dy>16){aim=clamp(-(p.x-st.x)/dy,-.65,.65);fire(clamp(.8+pull/150,.8,1.25));}else if(dy<-12){aim=clamp((p.x-st.x)/Math.abs(dy),-.65,.65);fire(1);}}drag=null;s.release(ev);});const clear=()=>drag=null;s.on(c,'pointercancel',clear);s.resetOnPause?.(clear);
 s.on(document,'keydown',ev=>{if(s.paused||phase!=='aim')return;const k=ev.key;if(k===' '||k==='Enter'){ev.preventDefault();fire(1);}else if(k==='ArrowLeft'||k==='a')ball.x=clamp(ball.x-15,W/2-LH+16,W/2+LH-16);else if(k==='ArrowRight'||k==='d')ball.x=clamp(ball.x+15,W/2-LH+16,W/2+LH-16);else if(k==='q')spin=clamp(spin-.25,-1,1);else if(k==='e')spin=clamp(spin+.25,-1,1);else if(k==='ArrowUp'||k==='w')aim=clamp(aim+.05,-.65,.65);else if(k==='ArrowDown'||k==='s')aim=clamp(aim-.05,-.65,.65);});
 s.hint('Kingpin: three alternating frames. Touch the lane where you want to start, pull back toward you like a slingshot and release (a longer pull rolls harder), or flick upward. Keyboard: arrows pick lane and angle, Q/E hook, Space bowls. Strikes + next 2 rolls; spares + next roll. Final-frame bonus balls included.');
 s.frame(dt=>{K=s.H/360;const nw=s.W/K,shift=(nw-W)/2;if(Math.abs(shift)>.01){W=nw;for(const p of pins)p.x+=shift;ball.x+=shift;if(drag)drag.start.x+=shift;}LH=Math.min(W*.28,190);x.setTransform(K,0,0,K,0,0);if(phase==='aim'){clock-=dt;if(clock<=0)fire(1);}if(phase==='rolling'){age+=dt;const steps=Math.ceil(dt*120);for(let step=0;step<steps;step++){const h=dt/steps;ball.vx+=spin*100*h;ball.x+=ball.vx*h;ball.y+=ball.vy*h;for(const p of pins){if(!p.down&&Math.hypot(ball.x-p.x,ball.y-p.y)<21){p.down=true;p.vx=ball.vx*.32+(p.x-ball.x)*7;p.vy=ball.vy*.4;}if(p.down){p.x+=p.vx*h;p.y+=p.vy*h;p.vx*=Math.pow(.96,h*60);p.vy*=Math.pow(.96,h*60);for(const other of pins)if(!other.down&&Math.hypot(p.x-other.x,p.y-other.y)<20&&Math.hypot(p.vx,p.vy)>40){other.down=true;other.vx=p.vx*.72+(other.x-p.x)*5;other.vy=p.vy*.8;p.vx*=.7;}}}}if(age>2.2||ball.y<-100||ball.x<W/2-LH*1.07||ball.x>W/2+LH*1.07)void settle();}if(!s.alive)return;
  x.fillStyle='#252033';x.fillRect(0,0,W,H);x.fillStyle='#d5a86f';x.fillRect(W/2-LH,0,LH*2,H);x.strokeStyle='#7c543733';for(let xx=W/2-LH;xx<W/2+LH;xx+=17){x.beginPath();x.moveTo(xx,0);x.lineTo(xx,H);x.stroke();}x.fillStyle='#443041';x.font='bold 26px Georgia';x.textAlign='center';x.fillText('KINGPIN',W/2,H/2+8);x.strokeStyle='#e9cf9566';x.lineWidth=4;x.beginPath();x.moveTo(W/2-LH,H-80);x.lineTo(W/2+LH,H-80);x.stroke();for(let j=0;j<5;j++){x.fillStyle='#725442';x.beginPath();x.moveTo(W/2+(j-2)*26,H-139);x.lineTo(W/2+(j-2)*26-4,H-130);x.lineTo(W/2+(j-2)*26+4,H-130);x.fill();}
  for(const p of pins){x.save();x.translate(p.x,p.y);if(p.down)x.rotate(.85);x.fillStyle=p.down?'#cec0a5':'#fff1d7';x.fillRect(-6,-13,12,24);circle(x,0,-15,5,x.fillStyle);x.fillStyle='#c35750';x.fillRect(-5,-8,10,4);x.restore();}circle(x,ball.x,ball.y,13,COLORS[actor]);s.sprite(x,actor,ball.x,ball.y,25,{exact:true});s.marker?.(x,actor,ball.x,ball.y);if(drag){const dy=drag.p.y-drag.start.y,dxp=drag.p.x-drag.start.x;let ax=0,ay=-1;if(dy>16){const l=Math.hypot(dxp,dy);ax=-dxp/l;ay=-dy/l;}else if(dy<-12){const l=Math.hypot(dxp,dy);ax=dxp/l;ay=dy/l;}x.strokeStyle='#faf0c8';x.lineWidth=2.5;x.setLineDash([3,6]);x.beginPath();x.moveTo(ball.x,ball.y);x.lineTo(ball.x+ax*330,ball.y+ay*330);x.stroke();x.setLineDash([]);if(dy>16){x.globalAlpha=.6;x.beginPath();x.moveTo(ball.x,ball.y);x.lineTo(ball.x+dxp,ball.y+dy);x.stroke();x.globalAlpha=1;}}x.font='bold 13px Arial';x.fillStyle='#e6cba0';x.fillText(message,W/2,165);
  s.status(`${s.players[actor].name} · frame ${frame+1}/3 · roll ${frameRolls.length+1}${frame===2?' (bonus balls possible)':'/2'} · hook ${spin<0?'←':spin>0?'→':'straight'} ${Math.abs(spin)} · ${phase==='aim'?Math.ceil(clock)+'s':'Pins flying!'}`);s.debug={actor,frame,phase,frameRolls,all,pins,ball,fire};
 });rack();reset();await s.pass(0,'Kingpin bowling. Three frames each, alternating at the end of a frame. Your face rides the ball. Real strike, spare and final-frame bonus scoring.');}

function movieGolfCourses(seed,W=680,H=360){const random=seededRandom(seed);return ['Happy’s run-up','Caddyshack country club','The gopher shortcut'].map((name,i)=>({name,start:{x:65,y:H-73},hole:{x:W-58,y:67+random()*70},walls:Array.from({length:i+1},(_,j)=>({x:250+j*115,y:75+random()*110,w:18,h:80+random()*45})),sand:[{x:170+i*36,y:96+random()*110,r:34}],water:[{x:410-i*37,y:H-100,r:39}],gopher:{x:W*.63,y:77+i*45,r:18},par:3+i}));}
async function minigolf(s){
 const[c,x,W,H]=s.canvas(680,360),courses=movieGolfCourses(s.seed,W,H),score=[0,0];
 let actor=0,hole=0,phase='aim',clock=12,age=0,drag=null,courseClock=0,gopherCooldown=0,message='';
 const golfers=[{},{}];
 function resetHole(){courseClock=0;gopherCooldown=0;for(const g of golfers){g.ball={...courses[hole].start,vx:0,vy:0};g.lastSafe={...courses[hole].start};g.strokes=0;g.done=false;g.sunk=false;g.drive=false;}phase='aim';clock=12;age=0;drag=null;}
 function shoot(p,from){if(phase!=='aim'||s.paused||!s.alive)return;const g=golfers[actor],b=g.ball,o=from||b,dx=o.x-p.x,dy=o.y-p.y,d=Math.hypot(dx,dy);if(d<6)return;g.lastSafe={x:b.x,y:b.y};g.drive=d>120;const speed=d<=120?d*3.6:432+(Math.min(d,180)-120)*7.8;b.vx=dx/d*speed;b.vy=dy/d*speed;g.strokes++;phase='moving';age=0;drag=null;message='';s.react?.(actor,g.drive?'silly':'thinking');sound('shot');}
 async function finishStroke(sunk=false){
  if(phase!=='moving'||!s.alive)return;phase='handoff';drag=null;const finished=actor,g=golfers[finished];g.ball.vx=g.ball.vy=0;
  if(sunk||g.strokes>=7){g.done=true;g.sunk=sunk;if(sunk){score[finished]+=Math.max(10,200-20*g.strokes);s.react?.(finished,'win');sound('win');}s.setScores(score);}
  const outcome=sunk?'In the cup!':g.done?'Seven-stroke limit.':message||'Ball at rest.';
  if(golfers.every(p=>p.done)){hole++;if(hole===courses.length)return s.finish(score,'Happy Gilmore × Caddyshack · alternating strokes on three shared courses.');actor=hole%2;resetHole();phase='handoff';message=outcome+' Next hole.';}
  else{actor=golfers[1-finished].done?finished:1-finished;message=outcome;clock=12;age=0;}
  const next=golfers[actor],description=`${message} ${courses[hole].name}: ${s.players[actor].name} plays stroke ${next.strokes+1}. Your ball stays where your last shot ended. Alternate after every stroke; a player who has holed out waits.`;
  if(await s.pass(actor,description))phase='aim';
 }
 // Drag back from the ball (or from anywhere: the pull is then measured from where you first touched) and release.
 s.on(c,'pointerdown',ev=>{if(phase!=='aim'||s.paused||drag)return;const p=s.pointer(ev),b=golfers[actor].ball;ev.preventDefault();drag={id:ev.pointerId,p,o:Math.hypot(p.x-b.x,p.y-b.y)<=70?null:p};s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(drag?.id===ev.pointerId)drag.p=s.pointer(ev);});
 s.on(c,'pointerup',ev=>{if(drag?.id===ev.pointerId)shoot(s.pointer(ev),drag.o);drag=null;s.release(ev);});
 const clear=()=>drag=null;s.on(c,'pointercancel',clear);s.resetOnPause?.(clear);
 s.on(document,'keydown',ev=>{if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();const b=golfers[actor].ball,t=courses[hole].hole,dx=t.x-b.x,dy=t.y-b.y,d=Math.hypot(dx,dy)||1;shoot({x:b.x-dx/d*Math.min(120,d*.5),y:b.y-dy/d*Math.min(120,d*.5)});}});
 s.hint('Alternate after every stroke. Drag back from your ball (or anywhere on the course) like a slingshot and release; the dotted line shows the shot. Pull past the ring for a run-up drive. Space shoots toward the cup. Water adds a penalty stroke; your ball returns to its safe lie. Seven-stroke limit per player per hole.');
 resetHole();
 s.frame(dt=>{
  courseClock+=dt;gopherCooldown=Math.max(0,gopherCooldown-dt);const course=courses[hole],g=golfers[actor],b=g.ball;
  if(phase==='aim'){clock-=dt;if(clock<=0){const dx=course.hole.x-b.x,dy=course.hole.y-b.y,d=Math.hypot(dx,dy)||1;shoot({x:b.x-dx/d*75,y:b.y-dy/d*75});}}
  if(phase==='moving'){
   age+=dt;const steps=Math.ceil(dt*180);
   for(let sub=0;sub<steps&&phase==='moving';sub++){
    const h=dt/steps,old={x:b.x,y:b.y};b.x+=b.vx*h;b.y+=b.vy*h;
    const sand=course.sand.some(q=>Math.hypot(q.x-b.x,q.y-b.y)<q.r),friction=Math.pow(sand?.88:.984,h*60);b.vx*=friction;b.vy*=friction;
    if(b.x<18||b.x>W-18){b.x=clamp(b.x,18,W-18);b.vx*=-.72;}if(b.y<18||b.y>H-18){b.y=clamp(b.y,18,H-18);b.vy*=-.72;}
    for(const w of course.walls)if(b.x>w.x-8&&b.x<w.x+w.w+8&&b.y>w.y-8&&b.y<w.y+w.h+8){if(old.x<w.x-8||old.x>w.x+w.w+8){b.x=old.x;b.vx*=-.82;}else{b.y=old.y;b.vy*=-.82;}}
    if(course.water.some(q=>Math.hypot(q.x-b.x,q.y-b.y)<q.r-6)){b.x=g.lastSafe.x;b.y=g.lastSafe.y;b.vx=b.vy=0;g.strokes++;message='Splash! +1 penalty stroke; back to the safe lie.';s.react?.(actor,'sad');sound('lose');void finishStroke();break;}
    if(Math.hypot(b.x-course.hole.x,b.y-course.hole.y)<13&&Math.hypot(b.vx,b.vy)<180){void finishStroke(true);break;}
   }
   if(phase==='moving'&&(Math.hypot(b.vx,b.vy)<8||age>6))void finishStroke();
  }
  if(!s.alive)return;
  x.fillStyle='#36724c';x.fillRect(0,0,W,H);x.strokeStyle='#dbcf96';x.lineWidth=4;x.strokeRect(10,10,W-20,H-20);
  for(const q of course.sand)circle(x,q.x,q.y,q.r,'#cfb97f');for(const q of course.water){circle(x,q.x,q.y,q.r,'#487eac');x.strokeStyle='#a2d1e0';x.beginPath();x.arc(q.x,q.y,q.r-10,0,Math.PI);x.stroke();}
  for(const w of course.walls){x.fillStyle='#915f39';x.fillRect(w.x,w.y,w.w,w.h);}
  const gopher={x:course.gopher.x+Math.sin(courseClock*1.4)*25,y:course.gopher.y};x.font='26px Arial';x.textAlign='center';x.fillText('🐿',gopher.x,gopher.y+7);
  if(phase==='moving'&&gopherCooldown===0&&Math.hypot(b.x-gopher.x,b.y-gopher.y)<23){b.vx+=Math.sign(b.x-gopher.x||1)*70;b.vy+=40;gopherCooldown=.7;message='The gopher interfered!';}
  circle(x,course.hole.x,course.hole.y,12,'#111f19');x.fillStyle='#f5dfad';x.fillRect(course.hole.x,course.hole.y-38,2,38);x.fillStyle='#d77273';x.beginPath();x.moveTo(course.hole.x+2,course.hole.y-38);x.lineTo(course.hole.x+27,course.hole.y-30);x.lineTo(course.hole.x+2,course.hole.y-23);x.fill();
  for(let i=0;i<2;i++){const player=golfers[i];if(player.done)continue;circle(x,player.ball.x,player.ball.y,8,i===0?'#b8deff':'#ffc1dc');s.sprite(x,i,clamp(player.ball.x+(i?24:-24),22,W-22),clamp(player.ball.y-30,25,H-25),i===actor?44:35,{mood:i===actor?'thinking':'normal'});}
  if(drag){const o=drag.o||b,pd=Math.hypot(o.x-drag.p.x,o.y-drag.p.y);x.strokeStyle=pd>120?'#ffd34d':COLORS[actor];x.lineWidth=3;x.setLineDash([4,5]);x.beginPath();x.moveTo(b.x,b.y);x.lineTo(b.x+(o.x-drag.p.x),b.y+(o.y-drag.p.y));x.stroke();x.setLineDash([]);x.globalAlpha=.5;x.lineWidth=1.5;x.beginPath();x.arc(b.x,b.y,20,0,Math.PI*2);x.stroke();x.globalAlpha=1;}
  x.font='bold 15px Arial';x.fillStyle='#fff6d8';x.textAlign='left';x.fillText(`${s.players[0].name}: ${golfers[0].strokes}${golfers[0].done?golfers[0].sunk?' ✓':' —':''}`,22,29);x.textAlign='right';x.fillText(`${s.players[1].name}: ${golfers[1].strokes}${golfers[1].done?golfers[1].sunk?' ✓':' —':''}`,W-22,29);x.textAlign='center';x.fillText(course.name,W/2,H-22);
  const current=golfers[actor];s.status(`${s.players[actor].name} · hole ${hole+1}/3 · ${current.strokes}/7 strokes · ${phase==='aim'?Math.ceil(clock)+'s':message||'Rolling…'}`);
  s.debug={actor,hole,strokes:current.strokes,ball:current.ball,golfers,courses,phase,drive:current.drive};
 });
 await s.pass(0,'Happy Gilmore × Caddyshack. Both players share the same three courses and alternate after EACH stroke. Your ball stays on the course while the other player shoots. Water penalties, sand, banks, and a roaming gopher.');
}

Object.assign(exports,{bowlingScore,bowlingFrameDone,bowling,movieGolfCourses,minigolf});