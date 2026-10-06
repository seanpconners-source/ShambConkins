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
 const[c,x]=s.canvas(W,H),pitches=fieldingPitches(s.seed),scores=[0,0],bases=[[false,false,false],[false,false,false]],runs=[0,0],strikes=[0,0],outs=[0,0],fingers=new Map();
 let attempt=0,batter=0,phase='windup',clock=0,aim=HOME.y,flight=null,fielder=null,message='',resultLeft=0;
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
 s.on(c,'pointerdown',ev=>{if(s.paused||phase==='result')return;const p=s.pointer(ev),owner=p.x<W/2?0:1;if([...fingers.values()].some(f=>f.owner===owner))return;ev.preventDefault();const f={owner,start:p,startField:{x:fielder.x,y:fielder.y}};fingers.set(ev.pointerId,f);s.capture(ev);steer(owner,p,f);});
 s.on(c,'pointermove',ev=>{const f=fingers.get(ev.pointerId);if(!f||s.paused)return;ev.preventDefault();steer(f.owner,s.pointer(ev),f);});
 const release=(ev,cancelled)=>{const f=fingers.get(ev.pointerId);if(!f)return;fingers.delete(ev.pointerId);s.release(ev);if(!cancelled&&!s.paused){steer(f.owner,s.pointer(ev),f);if(f.owner===batter)swing(f.owner);}};
 s.on(c,'pointerup',ev=>release(ev,false));s.on(c,'pointercancel',ev=>release(ev,true));s.on(c,'lostpointercapture',ev=>release(ev,true));
 s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 const buttons=s.controls(s.players.map((p,i)=>({text:p.name+' · SWING',click:()=>swing(i)})),'fielding-controls');
 s.shared=true;s.updateScores();s.hint('P1 owns the LEFT half, P2 the RIGHT. BAT: drag vertically to aim; release/tap as the pitch reaches the plate. FIELD: drag your half to move the fielder toward the landing ring. Roles alternate after every pitch. Clean catches +40; retrievals +10; runs +30.');
 reset();
 s.frame(dt=>{
  if(phase==='windup'||phase==='pitch')moveBaseballFielder(fielder,dt);
  if(phase==='windup'){clock+=dt;if(clock>=.7){phase='pitch';clock=0;}}
  else if(phase==='pitch'){clock+=dt;if(clock>pitches[Math.floor(attempt/2)].duration+.23)swing();}
  else if(phase==='field'){fieldingStep(flight,dt,fielder);if(flight.ended)result(fieldingAward(flight,fielder));}
  else if(phase==='result'){resultLeft-=dt;if(resultLeft<=0){attempt++;if(attempt===12){s.finish(scores,'Major League · six alternating pitches each, two human fielders');return;}reset();}}
  buttons.forEach((b,i)=>{b.disabled=phase!=='pitch'||batter!==i;});
  const pitch=pitches[Math.floor(attempt/2)],bg=x.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#164a39');bg.addColorStop(1,'#247346');x.fillStyle=bg;x.fillRect(0,0,W,H);
  x.strokeStyle='#347f51';x.lineWidth=35;for(let r=170;r<850;r+=73){x.beginPath();x.arc(HOME.x,HOME.y,r,-.55,.55);x.stroke();}
  x.strokeStyle='#cde8a3';x.lineWidth=8;x.beginPath();x.arc(HOME.x,HOME.y,690,-.43,.32);x.stroke();
  x.fillStyle='#bb8d5d';x.beginPath();x.moveTo(HOME.x,HOME.y);x.lineTo(304,423);x.lineTo(504,HOME.y);x.lineTo(304,159);x.closePath();x.fill();
  x.strokeStyle='#fff4d7';x.lineWidth=3;x.beginPath();x.moveTo(HOME.x,HOME.y);x.lineTo(824,485);x.moveTo(HOME.x,HOME.y);x.lineTo(824,51);x.stroke();
  for(const[i,[bx,by]]of [[304,423],[504,HOME.y],[304,159]].entries()){x.save();x.translate(bx,by);x.rotate(Math.PI/4);x.fillStyle=bases[batter][i]?'#f4d94f':'#fff4da';x.fillRect(-9,-9,18,18);x.restore();if(bases[batter][i])s.sprite(x,batter,bx,by-30,49,{exact:true,mood:'walking'});}
  circle(x,HOME.x+165,HOME.y,17,'#e5bd80');x.fillStyle='#f9ecd1';x.fillRect(HOME.x-10,HOME.y-10,20,20);
  x.strokeStyle='#ffc85c';x.lineWidth=3;x.strokeRect(HOME.x-15,aim-18,30,36);s.sprite(x,batter,HOME.x-31,aim+46,83,{exact:true,mood:phase==='field'?'happy':'thinking'});
  x.strokeStyle='#e8ce99';x.lineWidth=8;x.beginPath();x.moveTo(HOME.x+12,aim+20);x.lineTo(HOME.x+41,aim-18);x.stroke();
  s.sprite(x,1-batter,fielder.x,fielder.y,88,{exact:true,mood:phase==='result'&&flight?.caught?'win':'walking'});
  if(phase==='pitch'){
   const t=clamp(clock/pitch.duration,0,1.15),bx=HOME.x+165*(1-t),by=HOME.y+(pitch.target-HOME.y)*t+pitch.curve*Math.sin(Math.PI*t);
   circle(x,bx,by,6+t*5,'#fffcdf');x.strokeStyle='#b84440';x.lineWidth=2;x.beginPath();x.arc(bx,by,4+t*4,-1,1);x.stroke();
   x.fillStyle='#213739';x.fillRect(28,440,210,12);x.fillStyle=Math.abs(t-1)<.07?'#ffdf57':'#70d6bd';x.fillRect(28,440,210*clamp(t/1.15,0,1),12);
  }
  if(flight){
   const t=clamp(flight.age/flight.duration,0,1),px=HOME.x+(flight.end.x-HOME.x)*t,py=HOME.y+(flight.end.y-HOME.y)*t,altitude=Math.sin(t*Math.PI)*(flight.homeRun?125:95);
   x.strokeStyle=flight.homeRun?'#ffdc64':'#fff5c8';x.lineWidth=3;x.setLineDash([5,4]);x.beginPath();x.ellipse(flight.end.x,flight.end.y,38,21,0,0,Math.PI*2);x.stroke();x.setLineDash([]);
   circle(x,px,py,8,'#0d2e2555');if(!flight.caught||phase!=='result'){circle(x,px,py-altitude,9,'#fff9e4');x.strokeStyle='#df6758';x.lineWidth=2;x.beginPath();x.arc(px,py-altitude,6,-1,1);x.stroke();}
  }
  x.textAlign='center';x.fillStyle='#ffedb3';x.font='bold 23px Georgia';x.fillText('MAJOR LEAGUE',W/2,40);
  x.font='bold 14px Arial';for(let i=0;i<2;i++)x.fillText(`${s.players[i].name} · ${batter===i?'BAT':'FIELD'}`,i?W-155:155,73);
  x.font='bold 18px monospace';x.fillText(`PITCH ${Math.floor(attempt/2)+1}/6   ·   RUNS ${runs[0]} – ${runs[1]}`,W/2,488);
  if(message){x.fillStyle='#ffdc5b';x.font='bold 23px Arial';x.fillText(message,W/2,120);}
  s.status(`${s.players[batter].name} bats · ${s.players[1-batter].name} fields · ${strikes[batter]} strikes / ${outs[batter]} outs · ${phase==='windup'?'GET READY':phase==='pitch'?'RELEASE TO SWING':phase==='field'?'DRAG TO CATCH':message}`);
  s.debug={engine:'baseballfield',pitches,batter,attempt,phase,clock,aim,flight,fielder,bases,runs,strikes,outs,scores,fingers,swing};
 });await s.pass(0,'Major League: six matching pitches each, alternating BAT and FIELD after every pitch. Both people play at once. Stay on your own physical half. Release your aiming finger to swing at home plate; the defender drags toward the landing ring. Catches, quick retrievals and real base runners decide the match.');
}

Object.assign(exports,{fieldingPitches,baseballFlight,moveBaseballFielder,fieldingStep,fieldingAward,baseballfield});