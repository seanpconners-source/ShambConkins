const {clamp, seededRandom}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {baseballHit, advanceBases}=require("src/engines/mobile.js");
const {sound}=require("src/audio.js");
const W=960,H=520,HOME={x:104,y:292};
function fieldingPitches(seed) {
 const random=seededRandom(seed);
 return Array.from({length:6},()=>({duration:1.05+random()*.4,target:HOME.y+(random()-.5)*82,
  curve:(random()-.5)*76,scatter:(random()-.5)*.8,fielderY:260+(random()-.5)*90}));
}
function baseballFlight(pitch,contact,aim) {
 const angle=clamp(pitch.scatter+(aim-pitch.target)*.012,-.6,.6),distance=contact.bases===4?745:contact.bases===2?545:contact.kind==='FLY OUT'?500:395;
 const duration=contact.bases===4?2.35:contact.kind==='FLY OUT'?2.05:contact.bases===2?1.8:1.35;
 return {start:{...HOME},end:{x:HOME.x+Math.cos(angle)*distance,y:clamp(HOME.y+Math.sin(angle)*distance,64,H-42)},
  age:0,duration,contact:{...contact},homeRun:contact.bases===4,ended:false,caught:false,ground:false};
}
function moveBaseballFielder(fielder,dt) {
 if(!Number.isFinite(dt)||dt<=0)return fielder;
 const step=Math.min(dt,.1),dx=fielder.target.x-fielder.x,dy=fielder.target.y-fielder.y,d=Math.hypot(dx,dy),move=Math.min(d,280*step);
 if(d){fielder.x+=dx/d*move;fielder.y+=dy/d*move;}
 fielder.x=clamp(fielder.x,220,W-35);fielder.y=clamp(fielder.y,64,H-42);return fielder;
}
function fieldingStep(flight,dt,fielder) {
 if(flight.ended||!Number.isFinite(dt)||dt<=0)return flight;
 const step=Math.min(dt,.1);moveBaseballFielder(fielder,step);flight.age+=step;
 if(flight.age>=flight.duration){flight.ended=true;flight.caught=!flight.homeRun&&Math.hypot(fielder.x-flight.end.x,fielder.y-flight.end.y)<=38;flight.ground=!flight.caught&&!flight.homeRun;}
 return flight;
}
function fieldingAward(flight,fielder) {
 if(!flight.ended)return null;
 if(flight.caught)return {kind:'CAUGHT! YOU’RE OUT',bases:0,bat:0,field:40,out:true};
 if(flight.homeRun)return {kind:'HOME RUN!',bases:4,bat:100,field:0,out:false};
 const original=flight.contact.bases||2,close=Math.hypot(fielder.x-flight.end.x,fielder.y-flight.end.y)<105;
 const bases=close?1:original;
 return {kind:close?'QUICK RETRIEVAL · SINGLE':bases===2?'DOUBLE!':'SINGLE!',bases,bat:bases===2?45:25,field:close?10:0,out:false};
}
async function baseballfield(s) {
 const[c,x]=s.canvas(W,H,{fill:true}),pitches=fieldingPitches(s.seed),scores=[0,0],bases=[[false,false,false],[false,false,false]],runs=[0,0],strikes=[0,0],outs=[0,0],fingers=new Map();
 let T=0,attempt=0,batter=0,phase='windup',clock=0,aim=HOME.y,flight=null,fielder=null,message='',resultLeft=0;
 let view={k:1,cx:W/2,cy:H/2,rot:false};
 const toWorld=p=>{const dx=p.x-view.cx,dy=p.y-view.cy;return view.rot?{x:-dy/view.k+W/2,y:dx/view.k+H/2}:{x:dx/view.k+W/2,y:dy/view.k+H/2};};
 function clear(){const ids=[...fingers.keys()];fingers.clear();for(const id of ids)s.release({pointerId:id});if(fielder)fielder.target={x:fielder.x,y:fielder.y};}
 function reset(){batter=attempt%2;phase='windup';clock=0;aim=HOME.y;flight=null;message='';clear();const p=pitches[Math.floor(attempt/2)];fielder={x:560,y:p.fielderY,target:{x:560,y:p.fielderY}};}
 function result(award){
  if(phase==='result')return;phase='result';resultLeft=1.05;message=award.kind;clear();
  scores[batter]+=award.bat||0;scores[1-batter]+=award.field||0;
  if(award.out){outs[batter]++;strikes[batter]=0;}
  else if(award.bases){const advanced=advanceBases(bases[batter],award.bases);bases[batter]=advanced.bases;runs[batter]+=advanced.runs;scores[batter]+=advanced.runs*30;strikes[batter]=0;}
  else if(award.kind==='STRIKE'){strikes[batter]++;if(strikes[batter]===3){outs[batter]++;strikes[batter]=0;message='STRIKE THREE!';}}
  else if(award.kind==='FOUL')strikes[batter]=Math.min(2,strikes[batter]+1);
  if(outs[batter]===3){outs[batter]=0;bases[batter]=[false,false,false];message+=' · NEXT INNING';}
  s.setScores(scores);s.react?.(batter,award.bat?'happy':'sad');if(award.field)s.react?.(1-batter,'win');sound(award.bat||award.field?'win':'lose');
 }
 function swing(owner=batter){
  if(owner!==batter||phase!=='pitch'||s.paused||!s.alive)return false;
  const pitch=pitches[Math.floor(attempt/2)],contact=baseballHit(pitch,clock,aim);sound('shot');
  if(['STRIKE','FOUL'].includes(contact.kind))result({kind:contact.kind,bases:0,bat:0,field:contact.kind==='STRIKE'?5:0});
  else{flight=baseballFlight(pitch,contact,aim);phase='field';clock=0;message='CHASE THE LANDING RING!';}return true;
 }
 function steer(owner,p,f){
  if(owner===batter){if(['windup','pitch'].includes(phase))aim=clamp(p.y,HOME.y-68,HOME.y+68);}
  else{fielder.target={x:clamp(f.startField.x+(p.x-f.start.x)*1.9,220,W-35),y:clamp(f.startField.y+(p.y-f.start.y)*1.2,64,H-42)};}
 }
 s.on(c,'pointerdown',ev=>{if(s.paused||phase==='result')return;const p=toWorld(s.pointer(ev)),owner=p.x<W/2?0:1;if([...fingers.values()].some(f=>f.owner===owner))return;ev.preventDefault();const f={owner,start:p,startField:{x:fielder.x,y:fielder.y}};fingers.set(ev.pointerId,f);s.capture(ev);steer(owner,p,f);});
 s.on(c,'pointermove',ev=>{const f=fingers.get(ev.pointerId);if(!f||s.paused)return;ev.preventDefault();steer(f.owner,toWorld(s.pointer(ev)),f);});
 const release=(ev,cancelled)=>{const f=fingers.get(ev.pointerId);if(!f)return;fingers.delete(ev.pointerId);s.release(ev);if(!cancelled&&!s.paused){steer(f.owner,toWorld(s.pointer(ev)),f);if(f.owner===batter)swing(f.owner);}};
 s.on(c,'pointerup',ev=>release(ev,false));s.on(c,'pointercancel',ev=>release(ev,true));s.on(c,'lostpointercapture',ev=>release(ev,true));
 s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 s.on(document,'keydown',ev=>{if(ev.key===' '){ev.preventDefault();swing(0);}else if(ev.key==='Enter'){ev.preventDefault();swing(1);}});
 s.shared=true;s.updateScores();s.hint('P1 owns the LEFT half, P2 the RIGHT (bottom/top when the phone is upright). BAT: drag across the plate to aim; release (or tap) as the pitch reaches the plate. Keyboard: Space (P1) / Enter (P2) swings. FIELD: drag your half to move the fielder toward the landing ring. Roles alternate after every pitch. Clean catches +40; retrievals +10; runs +30.');
 reset();
 s.frame(dt=>{
  T+=dt;
  if(phase==='windup'||phase==='pitch')moveBaseballFielder(fielder,dt);
  if(phase==='windup'){clock+=dt;if(clock>=.7){phase='pitch';clock=0;}}
  else if(phase==='pitch'){clock+=dt;if(clock>pitches[Math.floor(attempt/2)].duration+.23)swing();}
  else if(phase==='field'){fieldingStep(flight,dt,fielder);if(flight.ended)result(fieldingAward(flight,fielder));}
  else if(phase==='result'){resultLeft-=dt;if(resultLeft<=0){attempt++;if(attempt===12){s.finish(scores,'Major League · six alternating pitches each, two human fielders');return;}reset();}}
  const pitch=pitches[Math.floor(attempt/2)],cw=c.width,ch=c.height,rot=ch>cw*1.05;
  view=rot?{k:Math.min(cw/(H*1.02),ch/(W*.98)),cx:cw/2,cy:ch/2-ch*.02,rot}:{k:Math.min(cw/W,ch/(H*1.02)),cx:cw/2,cy:ch/2+ch*.01,rot};
  const UP=rot?{x:1,y:0}:{x:0,y:-1},RT=rot?{x:0,y:1}:{x:1,y:0},upright=(wx,wy,fn)=>{x.save();x.translate(wx,wy);if(rot)x.rotate(Math.PI/2);fn();x.restore();};
  const head=(i,wx,wy,size,mood)=>upright(wx,wy,()=>s.sprite(x,i,0,0,size,{exact:true,mood}));
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#10161c';x.fillRect(0,0,cw,ch);
  x.save();x.translate(view.cx,view.cy);if(rot)x.rotate(-Math.PI/2);x.scale(view.k,view.k);x.translate(-W/2,-H/2);
  // grandstand beyond the wall: dark seats speckled with the crowd
  x.fillStyle='#1b2430';x.fillRect(-1200,-1200,W+2600,H+2400);
  const crowd=['#c84a3a','#e6e1d0','#3a5aa8','#d8b048','#8a8f9a','#2c3440'];for(let i=0;i<900;i++){const ang=-.95+((i*0.6180339)%1)*1.9,r=730+((i*0.4142)%1)*520;x.fillStyle=crowd[i%6];x.fillRect(HOME.x+Math.cos(ang)*r,HOME.y+Math.sin(ang)*r+Math.sin(T*6+i)*(message.includes('HOME')?3:0.6),5,5);}
  // outfield grass with mowed stripes, warning track, padded wall, foul poles
  x.save();x.beginPath();x.moveTo(HOME.x,HOME.y);x.arc(HOME.x,HOME.y,700,-.75,.75);x.closePath();x.clip();
  x.fillStyle='#2d7a3c';x.fillRect(-400,-400,W+800,H+800);x.fillStyle='#358a45';for(let k=-12;k<12;k+=2){x.save();x.translate(HOME.x,HOME.y);x.rotate(Math.PI/4);x.fillRect(k*48,-900,48,1800);x.restore();}
  x.save();x.translate(HOME.x,HOME.y);x.rotate(-Math.PI/4);x.fillStyle='#ffffff10';for(let k=-12;k<12;k+=2)x.fillRect(k*48,-900,48,1800);x.restore();
  x.strokeStyle='#9c6b3e';x.lineWidth=34;x.beginPath();x.arc(HOME.x,HOME.y,683,-.75,.75);x.stroke();x.restore();
  x.strokeStyle='#14462a';x.lineWidth=18;x.beginPath();x.arc(HOME.x,HOME.y,709,-.7,.7);x.stroke();x.strokeStyle='#f4d94f';x.lineWidth=3;x.beginPath();x.arc(HOME.x,HOME.y,718,-.7,.7);x.stroke();
  x.fillStyle='#f4f0e0';x.font='bold 15px Arial';x.textAlign='center';x.textBaseline='middle';for(const [ang,t] of [[-.42,'400'],[0,'420'],[.42,'400']]){upright(HOME.x+Math.cos(ang)*709,HOME.y+Math.sin(ang)*709,()=>x.fillText(t,0,1));}
  x.strokeStyle='#f4d94f';x.lineWidth=5;for(const ang of [-.7,.7]){const r0=700,r1=760;x.beginPath();x.moveTo(HOME.x+Math.cos(ang)*r0,HOME.y+Math.sin(ang)*r0);x.lineTo(HOME.x+Math.cos(ang)*r1,HOME.y+Math.sin(ang)*r1);x.stroke();}
  // infield: dirt arc, grass diamond, base paths, mound, batter's boxes
  x.fillStyle='#b98252';x.beginPath();x.moveTo(HOME.x,HOME.y);x.arc(HOME.x,HOME.y,330,-Math.PI/4-.02,Math.PI/4+.02);x.closePath();x.fill();
  x.fillStyle='#35884a';x.beginPath();x.moveTo(HOME.x+34,HOME.y);x.lineTo(304-6,423-36);x.lineTo(504-34,HOME.y);x.lineTo(304-6,159+36);x.closePath();x.fill();
  circle(x,HOME.x,HOME.y,40,'#b98252');circle(x,HOME.x+165,HOME.y,22,'#c48c5a');x.fillStyle='#fff';x.fillRect(HOME.x+160,HOME.y-10,6,20);
  x.strokeStyle='#fff8e6';x.lineWidth=3;x.beginPath();x.moveTo(HOME.x,HOME.y);x.lineTo(HOME.x+Math.cos(.785)*760,HOME.y+Math.sin(.785)*760);x.moveTo(HOME.x,HOME.y);x.lineTo(HOME.x+Math.cos(-.785)*760,HOME.y+Math.sin(-.785)*760);x.stroke();
  x.strokeStyle='#ffffffaa';x.lineWidth=2;x.strokeRect(HOME.x-24,HOME.y-34,16,24);x.strokeRect(HOME.x-24,HOME.y+10,16,24);
  for(const[i,[bx,by]]of [[304,423],[504,HOME.y],[304,159]].entries()){x.save();x.translate(bx,by);x.rotate(Math.PI/4);x.fillStyle='#0004';x.fillRect(-9,-7,20,20);x.fillStyle=bases[batter][i]?'#f4d94f':'#fffaf0';x.fillRect(-10,-10,20,20);x.restore();if(bases[batter][i])head(batter,bx+UP.x*30,by+UP.y*30,52,'walking');}
  x.fillStyle='#fffaf0';x.beginPath();x.moveTo(HOME.x-9,HOME.y-9);x.lineTo(HOME.x+3,HOME.y-9);x.lineTo(HOME.x+11,HOME.y);x.lineTo(HOME.x+3,HOME.y+9);x.lineTo(HOME.x-9,HOME.y+9);x.closePath();x.fill();
  // pitcher: Wild Thing on the mound
  const wind=phase==='windup'?Math.sin(clock*9)*6:0;x.fillStyle='#e8e4dc';x.beginPath();x.ellipse(HOME.x+170,HOME.y,13,10,0,0,Math.PI*2);x.fill();x.fillStyle='#c8202a';x.beginPath();x.arc(HOME.x+170+wind*.3,HOME.y,7,0,Math.PI*2);x.fill();
  // strike zone + bat + batter
  x.strokeStyle=phase==='pitch'?'#ffd84a':'#ffd84a88';x.lineWidth=3;x.strokeRect(HOME.x-15,aim-18,30,36);
  head(batter,HOME.x-34,aim+42,90,phase==='field'?'happy':'thinking');
  x.strokeStyle='#5a3618';x.lineWidth=9;x.lineCap='round';x.beginPath();x.moveTo(HOME.x+10,aim+20);x.lineTo(HOME.x+44,aim-20);x.stroke();x.strokeStyle='#e0b878';x.lineWidth=6;x.stroke();x.lineCap='butt';
  // fielder with glove
  x.fillStyle='#0005';x.beginPath();x.ellipse(fielder.x,fielder.y+4,26,9,0,0,Math.PI*2);x.fill();
  head(1-batter,fielder.x+UP.x*16,fielder.y+UP.y*16,92,phase==='result'&&flight?.caught?'win':'walking');
  x.fillStyle='#8a4a20';x.beginPath();x.arc(fielder.x+RT.x*38+UP.x*4,fielder.y+RT.y*38+UP.y*4,12,0,Math.PI*2);x.fill();x.strokeStyle='#5a2a10';x.lineWidth=2;x.stroke();
  if(phase==='pitch'){
   const t=clamp(clock/pitch.duration,0,1.15),bx=HOME.x+165*(1-t),by=HOME.y+(pitch.target-HOME.y)*t+pitch.curve*Math.sin(Math.PI*t);
   x.save();x.shadowColor='#fff';x.shadowBlur=10;circle(x,bx,by,6+t*5,'#fffcdf');x.restore();x.strokeStyle='#b84440';x.lineWidth=2;x.beginPath();x.arc(bx,by,4+t*4,-1,1);x.stroke();
  }
  if(flight){
   const t=clamp(flight.age/flight.duration,0,1),px=HOME.x+(flight.end.x-HOME.x)*t,py=HOME.y+(flight.end.y-HOME.y)*t,altitude=Math.sin(t*Math.PI)*(flight.homeRun?125:95);
   x.strokeStyle=flight.homeRun?'#ffdc64':'#fff5c8';x.lineWidth=3;x.setLineDash([6,5]);x.lineDashOffset=-T*30;x.beginPath();x.ellipse(flight.end.x,flight.end.y,38,rot?38:21,0,0,Math.PI*2);x.stroke();x.setLineDash([]);
   const sz=1+altitude/110;circle(x,px,py,8,'#0d2e2555');if(!flight.caught||phase!=='result'){const bx2=px+UP.x*altitude,by2=py+UP.y*altitude;x.save();x.shadowColor='#fff';x.shadowBlur=12;circle(x,bx2,by2,9*sz,'#fff9e4');x.restore();x.strokeStyle='#df6758';x.lineWidth=2;x.beginPath();x.arc(bx2,by2,6*sz,-1,1);x.stroke();}
  }
  x.restore();
  // screen-space HUD: scoreboard, role labels, timing meter, call
  const u=Math.max(.75,Math.min(cw,ch)/520),top=58*u;
  const sbW=Math.min(cw-24,300*u),sbH=46*u,sbX=(cw-sbW)/2,sbY=rot?54:ch-sbH-46*u;
  x.fillStyle='#0b2a1ae6';x.fillRect(sbX,sbY,sbW,sbH);x.strokeStyle='#f4d94f';x.lineWidth=2;x.strokeRect(sbX+1,sbY+1,sbW-2,sbH-2);
  x.textBaseline='middle';x.textAlign='left';x.fillStyle='#ffe9a8';x.font=`bold ${13*u}px monospace`;x.fillText(`PITCH ${Math.floor(attempt/2)+1}/6`,sbX+10*u,sbY+sbH*.32);x.fillText(`RUNS ${runs[0]}–${runs[1]}`,sbX+10*u,sbY+sbH*.72);
  x.textAlign='right';const dots=(n,m,col)=>Array.from({length:m},(_,k)=>k<n?'●':'○').join('');x.fillStyle='#fff';x.fillText('S '+dots(strikes[batter],2),sbX+sbW-10*u,sbY+sbH*.32);x.fillStyle='#ff8a6a';x.fillText('O '+dots(outs[batter],2),sbX+sbW-10*u,sbY+sbH*.72);
  x.font=`bold ${13*u}px Arial`;x.fillStyle='#ffedb3';
  if(rot){x.textAlign='left';x.fillText(`${s.players[1].name} · ${batter===1?'BAT':'FIELD'} ↑ top half`,12,sbY+sbH+16*u);x.fillText(`${s.players[0].name} · ${batter===0?'BAT':'FIELD'} ↓ bottom half`,12,ch-52*u);}
  else{x.textAlign='center';for(let i=0;i<2;i++)x.fillText(`${s.players[i].name} · ${batter===i?'BAT':'FIELD'}`,i?cw*.86:cw*.14,ch-60*u);}
  if(phase==='pitch'){const t=clamp(clock/pitch.duration,0,1.15),mw=Math.min(cw*.5,220*u),mx=(cw-mw)/2,my=rot?ch-82*u:sbY-30*u;x.fillStyle='#000a';x.fillRect(mx-2,my-2,mw+4,12*u+4);x.fillStyle=Math.abs(t-1)<.07?'#ffdf57':'#70d6bd';x.fillRect(mx,my,mw*clamp(t/1.15,0,1),12*u);x.fillStyle='#fff';x.fillRect(mx+mw/1.15-1,my-3,3,12*u+6);}
  if(message){x.textAlign='center';x.font=`900 ${Math.min(30*u,cw/16)}px Arial`;x.lineWidth=5*u;x.strokeStyle='#081a10';const my2=rot?sbY+sbH+48*u:top+20*u;x.strokeText(message,cw/2,my2);x.fillStyle=message.includes('HOME')?'#ffdc5b':message.includes('OUT')||message.includes('STRIKE')?'#ff8a6a':'#fff3c0';x.fillText(message,cw/2,my2);}
  s.status(`${s.players[batter].name} bats · ${s.players[1-batter].name} fields · ${strikes[batter]} strikes / ${outs[batter]} outs · ${phase==='windup'?'GET READY':phase==='pitch'?'RELEASE TO SWING':phase==='field'?'DRAG TO CATCH':message}`);
  s.debug={engine:'baseballfield',pitches,batter,attempt,phase,clock,aim,flight,fielder,bases,runs,strikes,outs,scores,fingers,swing};
 });await s.pass(0,'Major League: six matching pitches each, alternating BAT and FIELD after every pitch. Both people play at once. Stay on your own physical half. Release your aiming finger to swing at home plate; the defender drags toward the landing ring. Catches, quick retrievals and real base runners decide the match.');
}

Object.assign(exports,{fieldingPitches,baseballFlight,moveBaseballFielder,fieldingStep,fieldingAward,baseballfield});