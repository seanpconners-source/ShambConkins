const {poolRack, poolCueSpot, stepPool, POOL_TABLE}=require("src/engines/pool.js");
const {clamp}=require("src/utils.js");
const {circle, COLORS}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
const {worldView}=require("src/engines/duelControls.js");
const {isCpu,isOnline,cpuSkill,cpuHotseat}=require("src/engines/cpuKit.js");
// Online (s.online): the shooter's phone rolls the balls: its aim {aim:[angle,power]} a few times a second, the shot
// {f:[angle,power,cueX,cueY]}, ball snapshots {sn} about 12 times a second (the other phone glides its balls there) and
// {fin:{b,r}} = exact resting balls + what the cue ball hit, so both phones judge the shot the same way.
function nineballOutcome({lowest,firstHit,pocketed,railAfterContact}){
 const foul=pocketed.includes(0)?'Scratch':firstHit===null?'No object ball hit':firstHit!==lowest?'Wrong first ball':!pocketed.some(n=>n>0)&&!railAfterContact?'No cushion after contact':null;
 return {foul,win:!foul&&pocketed.includes(9),keepTurn:!foul&&pocketed.some(n=>n>0),respotNine:!!foul&&pocketed.includes(9),points:foul?-5:pocketed.filter(n=>n>0).length*10};
}
function nineballSpot(balls,id=9,table=POOL_TABLE){const cy=(table.top+table.bottom)/2;for(let column=0;column<9;column++)for(const row of [0,-1,1,-2,2,-3,3]){const point={x:table.right-190-column*40,y:cy+row*34};if(point.x<table.left+13||point.y<table.top+13||point.y>table.bottom-13)continue;if(balls.every(b=>b.id===id||b.pocketed||Math.hypot(point.x-b.x,point.y-b.y)>24))return point;}return {x:table.right-30,y:cy};}
async function nineball(s){
 const[c,x]=s.canvas(680,390,{fill:true}),W=680,H=390,view=worldView(s,680,390),table=POOL_TABLE,balls=poolRack(table),cue=balls[0],scores=[0,0];let actor=0,phase='aim',angle=0,power=82,clock=14,age=0,shots=0,hand=false,placing=false,drag=null,record=null,message='';
 const net=isOnline(s)?s.online:null,theirs=()=>!!net&&actor===net.remote;if(net)s.hotseat=true;let snapT=0,aimT=0,aimSent='',fin=null;
 const pack=()=>balls.map(b=>[+b.x.toFixed(2),+b.y.toFixed(2),b.pocketed?1:0]);
 const unpack=(list,exact)=>list.forEach((v,i)=>{const b=balls[i];if(!b||!Array.isArray(v))return;b.tx=+v[0];b.ty=+v[1];b.pocketed=!!v[2];if(exact){b.x=b.tx;b.y=b.ty;b.vx=b.vy=0;}});
 const legal=()=>s.alive&&!s.paused&&phase==='aim'&&!theirs();const lowest=()=>Math.min(...balls.filter(b=>b.id>0&&!b.pocketed).map(b=>b.id));
 function fire(remote=false){if(!remote&&!legal())return;if(net&&!remote)net.send({f:[angle,power,cue.x,cue.y]});snapT=0;record={lowest:lowest(),firstHit:null,pocketed:[],railAfterContact:false};shots++;cue.vx=Math.cos(angle)*power*4.2;cue.vy=Math.sin(angle)*power*4.2;phase='rolling';age=0;hand=false;placing=false;drag=null;sound('shot');}
 async function settle(){if(phase!=='rolling')return;if(net&&!theirs()){const b=pack();unpack(b,true);net.send({fin:{b,r:record}});}phase='handoff';for(const b of balls)b.vx=b.vy=0;const outcome=nineballOutcome(record);scores[actor]=Math.max(0,scores[actor]+outcome.points);
  if(outcome.respotNine){const nine=balls.find(b=>b.id===9),spot=nineballSpot(balls);nine.x=spot.x;nine.y=spot.y;nine.pocketed=false;}
  if(outcome.win){scores[actor]+=150;s.setScores(scores);s.react?.(actor,'win');s.finish(scores,'The Color of Money · legal nine-ball win!');return;}
  if(shots>=14){s.finish(scores,'The Color of Money · 14-shot match, pocket points decide.');return;}
  hand=!!outcome.foul;if(cue.pocketed){Object.assign(cue,poolCueSpot(balls),{pocketed:false});}message=outcome.foul?`${outcome.foul}: −5. Opponent has ball in hand: touch an empty spot to place the cue ball, then pull back.`:outcome.keepTurn?'Clean pocket! Keep shooting.':'Safe shot. The turn passes.';
  if(!outcome.keepTurn)actor=1-actor;angle=Math.atan2(balls.find(b=>b.id===lowest()).y-cue.y,balls.find(b=>b.id===lowest()).x-cue.x);clock=14;power=75;s.setScores(scores);if(await s.pass(actor,message+' Hit the lowest-numbered ball first. Legal nine wins.'))phase='aim';
 }
 // Drag back from the cue ball or from anywhere on the table (pull measured from where you first touched) and release. After a foul (ball in hand), touching an empty spot places the cue ball there.
 const wp=ev=>view.toWorld(s.pointer(ev));
 const aimFrom=(d,p)=>{const dx=d.from.x-p.x,dy=d.from.y-p.y;angle=Math.atan2(dy,dx);power=clamp(Math.hypot(dx,dy),18,135);return Math.hypot(dx,dy);};
 const placeAt=p=>{if(p.x>table.left+13&&p.x<table.right-13&&p.y>table.top+13&&p.y<table.bottom-13&&balls.every(b=>b.id===0||b.pocketed||Math.hypot(b.x-p.x,b.y-p.y)>23)){cue.x=p.x;cue.y=p.y;placing=false;message='Cue placed. Aim and shoot.';return true;}return false;};
 s.on(c,'pointerdown',ev=>{if(!legal()||drag||cpu&&actor===1||theirs())return;const p=wp(ev);ev.preventDefault();if(hand&&Math.hypot(p.x-cue.x,p.y-cue.y)>55)placeAt(p);drag={id:ev.pointerId,from:Math.hypot(p.x-cue.x,p.y-cue.y)<=55?cue:{x:p.x,y:p.y}};s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(!drag||drag.id!==ev.pointerId||!legal())return;aimFrom(drag,wp(ev));});
 s.on(c,'pointerup',ev=>{if(drag?.id===ev.pointerId){const d=drag;drag=null;if(legal()){const p=wp(ev);if(Math.hypot(d.from.x-p.x,d.from.y-p.y)>12){aimFrom(d,p);fire();}}}s.release(ev);});const clear=()=>drag=null;s.on(c,'pointercancel',clear);s.resetOnPause?.(clear);
 s.on(document,'keydown',ev=>{if(!legal())return;const k=ev.key;if(k===' '||k==='Enter'){ev.preventDefault();fire();}else if(k==='ArrowLeft'||k==='a')angle-=.04;else if(k==='ArrowRight'||k==='d')angle+=.04;else if(k==='ArrowUp'||k==='w')power=clamp(power+8,18,135);else if(k==='ArrowDown'||k==='s')power=clamp(power-8,18,135);});
 s.hint('NINE-BALL: drag back anywhere like a slingshot and release (pull length is power; the dotted line is your shot). After a foul the next player has ball in hand: touch an empty spot to place the cue, then pull back. Hit the lowest number first, then pocket any ball or touch a rail. Clean pockets keep your turn. Fouls give ball in hand; a fouled nine is re-spotted. Legal nine wins.');
 s.frame(dt=>{if(phase==='aim'&&theirs())clock=Math.max(0,clock-dt);else if(phase==='rolling'&&theirs()){for(const b of balls)if(b.tx!==undefined){const a=Math.min(1,dt*14);b.x+=(b.tx-b.x)*a;b.y+=(b.ty-b.y)*a;}}
  else if(phase==='aim'){clock-=dt;if(net){aimT-=dt;const k=[+angle.toFixed(3),Math.round(power)];if(aimT<=0&&k.join()!==aimSent){aimT=.15;aimSent=k.join();net.send({aim:k});}}if(clock<=0)fire();}else if(phase==='rolling'){age+=dt;if(net){snapT-=dt;if(snapT<=0){snapT=1/12;net.send({sn:pack()});}}record.pocketed.push(...stepPool(balls,dt,table,{contact:(a,b)=>{if(record.firstHit===null&&(a===0||b===0))record.firstHit=a===0?b:a;},rail:()=>{if(record.firstHit!==null)record.railAfterContact=true;}}));if(age>.5&&(age>8||balls.every(b=>b.pocketed||Math.hypot(b.vx,b.vy)<5)))void settle();}if(!s.alive)return;
  view.begin(x,'#1a171a');x.fillStyle='#66432d';x.fillRect(19,19,W-38,340);x.fillStyle='#175745';x.fillRect(table.left,table.top,600,298);x.fillStyle='#fff0cd22';x.font='bold 25px Georgia';x.textAlign='center';x.fillText('THE COLOR OF MONEY',W/2,195);for(const p of table.pockets)circle(x,p.x,p.y,18,'#111614');
  for(const b of balls){if(b.pocketed)continue;circle(x,b.x+2,b.y+3,10,'#0006');circle(x,b.x,b.y,10,['#eee7d1','#ecc345','#567ccb','#d06054','#9772b1','#e38948','#54a67c','#b35875','#252a2b','#ecc345'][b.id]);if(b.id){if(b.id===lowest()){x.strokeStyle='#ffe19b';x.lineWidth=2;x.beginPath();x.arc(b.x,b.y,14,0,Math.PI*2);x.stroke();}circle(x,b.x,b.y,5.5,'#fff0dc');view.upright(x,b.x,b.y,()=>{x.fillStyle='#25272a';x.font='bold 8px Arial';x.textAlign='center';x.fillText(String(b.id),0,3);});}else view.upright(x,b.x,b.y,()=>{s.sprite(x,actor,0,0,20,{exact:true});s.marker?.(x,actor,0,0);});}
  if(phase==='aim'){let t=240;const dx=Math.cos(angle),dy=Math.sin(angle);for(const b of balls)if(b.id&&!b.pocketed){const along=(b.x-cue.x)*dx+(b.y-cue.y)*dy,perp=Math.abs((b.x-cue.x)*dy-(b.y-cue.y)*dx);if(along>0&&perp<20)t=Math.min(t,along-Math.sqrt(400-perp*perp));}x.strokeStyle=COLORS[actor];x.lineWidth=2;x.setLineDash([3,5]);x.beginPath();x.moveTo(cue.x,cue.y);x.lineTo(cue.x+dx*t,cue.y+dy*t);x.stroke();x.setLineDash([]);x.strokeStyle='#e4c28e';x.lineWidth=4;x.beginPath();x.moveTo(cue.x-dx*22,cue.y-dy*22);x.lineTo(cue.x-dx*(50+power),cue.y-dy*(50+power));x.stroke();circle(x,cue.x+dx*t,cue.y+dy*t,4,'#f5e4b6');}
  s.status(`${s.players[actor].name} · lowest ${lowest()} · shot ${shots+1}/14 · ${phase==='aim'?Math.ceil(clock)+'s · '+Math.round(power/135*100)+'%'+(hand?' · BALL IN HAND':''):'Rolling…'}${placing?' · TAP TO PLACE':''}`);s.debug={actor,phase,balls,record,scores,hand,placing,fire,shots,bot:net?()=>{if(!legal()||Math.random()<.6)return '';const b=balls.find(q=>q.id===lowest());if(hand){const p={x:table.left+60+Math.random()*200,y:table.top+40+Math.random()*200};placeAt(p);}angle=Math.atan2(b.y-cue.y,b.x-cue.x)+(Math.random()-.5)*.1;power=60+Math.random()*60;fire();return 'shot';}:null};
 });
 // vs CPU: the hustler plays the lowest ball into its best pocket (ghost-ball aim), places ball-in-hand behind that shot, aim error on Easy
 const cpu=isCpu(s);
 if(cpu)cpuHotseat(s,{isTurn:()=>actor===1&&phase==='aim'&&legal(),delay:1000,think:()=>{const sk=cpuSkill(s),b=balls.find(q=>q.id===lowest()),R=2*cue.r;if(!b)return;let best=null,bv=-1e9;
  for(const P of table.pockets){const dx=P.x-b.x,dy=P.y-b.y,d=Math.hypot(dx,dy),gx=b.x-dx/d*R,gy=b.y-dy/d*R;if(hand){const px=gx-dx/d*90,py=gy-dy/d*90;if(px>table.left+15&&px<table.right-15&&py>table.top+15&&py<table.bottom-15&&balls.every(q=>q===cue||q.pocketed||Math.hypot(q.x-px,q.y-py)>2.5*cue.r)){best={hand:{x:px,y:py},a:Math.atan2(dy,dx),f:clamp(d*.17+40,45,120)};break;}}
   const ax=gx-cue.x,ay=gy-cue.y,ad=Math.hypot(ax,ay),cut=Math.acos(clamp((ax*dx+ay*dy)/(ad*d),-1,1)),seg=(x1,y1,x2,y2,q)=>{const ex=x2-x1,ey=y2-y1,u=clamp(((q.x-x1)*ex+(q.y-y1)*ey)/(ex*ex+ey*ey||1),0,1);return Math.hypot(q.x-x1-ex*u,q.y-y1-ey*u);},blocked=balls.some(q=>q!==cue&&q!==b&&!q.pocketed&&(seg(cue.x,cue.y,gx,gy,q)<R||seg(b.x,b.y,P.x,P.y,q)<R));
   const v=-d-ad*.5-cut*140-(blocked?400:0);if(cut<1.25&&v>bv){bv=v;best={a:Math.atan2(ay,ax),f:clamp((ad+d)*.12+45,45,110)};}}
  if(!best)best={a:Math.atan2(b.y-cue.y,b.x-cue.x),f:70};if(best.hand)placeAt(best.hand);angle=best.a+(Math.random()-.5)*(1-sk)*.14;power=best.f;fire();}});
 if(net)void (async()=>{const wait=f=>(async()=>{while(s.alive&&!f())await new Promise(r=>setTimeout(r,50));})();for(;;){const m=await net.next();if(!m||!s.alive)return;
  if(Array.isArray(m.aim)){if(phase==='aim'&&theirs()){angle=+m.aim[0]||0;power=clamp(+m.aim[1]||75,18,135);}}
  else if(Array.isArray(m.f)){await wait(()=>phase==='aim'&&theirs());if(!s.alive)return;const [a,p,cx,cy]=m.f.map(Number);if(![a,p,cx,cy].every(Number.isFinite))continue;angle=a;power=clamp(p,18,135);cue.x=cx;cue.y=cy;for(const b of balls){b.tx=b.x;b.ty=b.y;}fire(true);}
  else if(Array.isArray(m.sn)){if(phase==='rolling'&&theirs())unpack(m.sn,false);}
  else if(m.fin&&Array.isArray(m.fin.b)){await wait(()=>phase==='rolling'&&theirs());if(!s.alive)return;unpack(m.fin.b,true);const r=m.fin.r||{};record={lowest:+r.lowest,firstHit:Number.isFinite(r.firstHit)?r.firstHit:null,pocketed:Array.isArray(r.pocketed)?r.pocketed.filter(Number.isFinite):[],railAfterContact:!!r.railAfterContact};void settle();}}})();
 await s.pass(0,'The Color of Money: a real nine-ball duel. Your face is on the cue; object balls stay readable. Hit the one first on the break.');
}

Object.assign(exports,{nineballOutcome,nineballSpot,nineball});