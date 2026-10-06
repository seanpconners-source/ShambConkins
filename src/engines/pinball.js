const {clamp, seededRandom}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
// Original table and collision code. Both humans receive this same seeded table.
function pinballTable(seed) {
 const random=seededRandom(seed);
 return { W:460,H:700,
  rails:[[25,90,25,495],[25,90,85,30],[85,30,390,30],[390,30,445,85],[445,85,445,675],
   [403,130,403,532],[25,495,95,550],[85,545,122,590],[403,495,365,550],[375,545,338,590]],
  bumpers:[{x:145,y:202},{x:310,y:202},{x:230,y:304}].map((b,i)=>({...b,r:29+(i===2?4:0),value:100,y:b.y+random()*12})),
  targets:Array.from({length:6},(_,i)=>({x:97+i*43,y:88,r:12,letter:'BUCKET'[i]})),
  rollovers:[{x:57,y:435,r:17},{x:371,y:435,r:17}]
 };
}
function newPinballBall(table) {
 return {x:424,y:638,vx:0,vy:0,r:13,age:0,launched:false,escaped:false,drained:false,
  score:0,multiplier:1,lit:Array(6).fill(false),bumperLit:[false,false,false],rolloverLit:[false,false],
  cooldowns:Array(11).fill(0),flippers:[.32,Math.PI-.32],events:[],trail:[],saveUntil:3};
}
function launchPinball(a,power=1) {
 if(a.launched||a.drained)return false;
 a.launched=true;a.vx=0;a.vy=-980*clamp(power,.75,1.12);a.age=0;a.events.push({type:'launch'});return true;
}
function reflectSegment(ball,segment,restitution=.88,velocity={x:0,y:0}) {
 const [ax,ay,bx,by]=segment,dx=bx-ax,dy=by-ay,length2=dx*dx+dy*dy;
 const t=clamp(((ball.x-ax)*dx+(ball.y-ay)*dy)/length2,0,1),px=ax+t*dx,py=ay+t*dy;
 const distance=Math.hypot(ball.x-px,ball.y-py),reach=ball.r+4;
 if(distance>=reach)return false;
 let nx=(ball.x-px)/(distance||1),ny=(ball.y-py)/(distance||1);
 if(distance<.001){const length=Math.sqrt(length2);nx=-dy/length;ny=dx/length;}
 ball.x=px+nx*(reach+.01);ball.y=py+ny*(reach+.01);
 const normal=(ball.vx-velocity.x)*nx+(ball.vy-velocity.y)*ny;
 if(normal<0){ball.vx-=(1+restitution)*normal*nx;ball.vy-=(1+restitution)*normal*ny;return true;}return false;
}
function stepPinball(a,dt,table,held=[false,false]) {
 a.events=[];
 if(!Number.isFinite(dt)||dt<=0||!a.launched||a.drained)return a;
 const steps=Math.ceil(Math.min(dt,.1)*240),h=Math.min(dt,.1)/steps;
 for(let sub=0;sub<steps&&!a.drained;sub++){
  a.age+=h;a.cooldowns=a.cooldowns.map(n=>Math.max(0,n-h));
  const angular=[];
  for(let i=0;i<2;i++){const target=i?(held[i]?Math.PI+.55:Math.PI-.32):(held[i]?-.55:.32),old=a.flippers[i];a.flippers[i]+=clamp(target-old,-9*h,9*h);angular[i]=(a.flippers[i]-old)/h;}
  a.vy+=640*h;const speed=Math.hypot(a.vx,a.vy);if(speed>1600){a.vx*=1600/speed;a.vy*=1600/speed;}
  a.x+=a.vx*h;a.y+=a.vy*h;
  // The curved plunger guide releases the ball into the playfield at the top.
  if(!a.escaped&&a.x>403&&a.y<104){a.escaped=true;a.vx=-510;a.vy=-120;a.events.push({type:'guide'});}
  for(const segment of table.rails)reflectSegment(a,segment);
  for(let i=0;i<2;i++){
   const px=i?338:122,py=590,angle=a.flippers[i],ex=px+83*Math.cos(angle),ey=py+83*Math.sin(angle);
   const t=clamp(((a.x-px)*(ex-px)+(a.y-py)*(ey-py))/(83*83),0,1),lever=83*t;
   const velocity={x:-Math.sin(angle)*angular[i]*lever,y:Math.cos(angle)*angular[i]*lever};
   if(reflectSegment(a,[px,py,ex,ey],.92,velocity))a.events.push({type:'flipper',index:i});
  }
  for(let i=0;i<table.bumpers.length;i++){
   const b=table.bumpers[i],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),reach=b.r+a.r;
   if(d>=reach)continue;const nx=dx/(d||1),ny=dy/(d||1);a.x=b.x+nx*(reach+.01);a.y=b.y+ny*(reach+.01);
   const toward=a.vx*nx+a.vy*ny;if(toward<0){a.vx-=1.7*toward*nx;a.vy-=1.7*toward*ny;}
   if(a.cooldowns[i]===0){a.vx+=nx*160;a.vy+=ny*160;a.cooldowns[i]=.2;a.score+=b.value*a.multiplier;a.bumperLit[i]=true;a.events.push({type:'bumper',index:i});}
  }
  for(let i=0;i<table.targets.length;i++){
   const t=table.targets[i];if(Math.hypot(a.x-t.x,a.y-t.y)>t.r+a.r||a.cooldowns[3+i]>0)continue;
   a.cooldowns[3+i]=.25;a.lit[i]=true;a.score+=50*a.multiplier;a.vy=Math.abs(a.vy)+80;a.events.push({type:'target',index:i});
  }
  for(let i=0;i<table.rollovers.length;i++){
   const t=table.rollovers[i];if(a.rolloverLit[i]||Math.hypot(a.x-t.x,a.y-t.y)>t.r+a.r)continue;
   a.rolloverLit[i]=true;a.score+=150*a.multiplier;a.events.push({type:'rollover',index:i});
  }
  if(a.lit.every(Boolean)||a.bumperLit.every(Boolean)&&a.rolloverLit.every(Boolean)){
   a.score+=500*a.multiplier;a.multiplier=Math.min(5,a.multiplier+1);a.lit.fill(false);a.bumperLit.fill(false);a.rolloverLit.fill(false);a.events.push({type:'jackpot'});
  }
  if(a.y>table.H+22){
   if(a.age<a.saveUntil){a.x=424;a.y=638;a.vx=0;a.vy=-980;a.escaped=false;a.saveUntil=0;a.events.push({type:'save'});}
   else{a.drained=true;a.events.push({type:'drain'});}
  }
 }
 const speed=Math.hypot(a.vx,a.vy);if(speed>1600){a.vx*=1600/speed;a.vy*=1600/speed;}
 a.trail.push({x:a.x,y:a.y});if(a.trail.length>12)a.trail.shift();return a;
}
function paintTable(x,table,a,s,player,clock,launchLeft,message) {
 const {W,H}=table,g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#11152b');g.addColorStop(.5,'#3b1749');g.addColorStop(1,'#071e29');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.fillStyle='#302344';x.fillRect(8,9,W-16,H-18);x.fillStyle='#0a1222';x.fillRect(19,25,W-38,H-50);
 x.fillStyle='#e7d9a0';x.textAlign='center';x.font='bold 23px Georgia';x.fillText('BUCKETHEADLAND',W/2,62);
 for(let i=0;i<table.targets.length;i++){const t=table.targets[i];circle(x,t.x,t.y,14,a.lit[i]?'#ffdd66':'#394655');x.fillStyle=a.lit[i]?'#382212':'#d9cfac';x.font='bold 15px Arial';x.fillText(t.letter,t.x,t.y+5);}
 // Stage floor, guitar strings and original bucket bumper illustrations.
 x.strokeStyle='#957ac344';x.lineWidth=1;for(let i=0;i<6;i++){x.beginPath();x.moveTo(175+i*19,115);x.lineTo(188+i*13,513);x.stroke();}
 x.fillStyle='#242449';x.fillRect(169,389,122,47);x.fillStyle='#dba743';x.font='bold 17px Georgia';x.fillText('SHRED THE STAGE',230,419);
 for(let i=0;i<3;i++){const b=table.bumpers[i],lit=a.bumperLit[i];circle(x,b.x,b.y,b.r+6,lit?'#ffb94f':'#86549d');circle(x,b.x,b.y,b.r,'#f7ecd5');x.fillStyle='#da4a48';x.fillRect(b.x-17,b.y-9,34,16);x.fillStyle='#362c48';x.font='bold 11px Arial';x.fillText('BUCKET',b.x,b.y+3);}
 table.rollovers.forEach((t,i)=>{circle(x,t.x,t.y,t.r,a.rolloverLit[i]?'#76ddc4':'#344650');x.fillStyle='#f2dc96';x.font='bold 10px Arial';x.fillText(i?'TOUR':'GIFT',t.x,t.y+4);});
 x.strokeStyle='#75c8d1';x.lineWidth=7;x.lineCap='round';for(const[ax,ay,bx,by]of table.rails){x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();}
 x.fillStyle='#a864be';x.font='bold 60px Georgia';x.globalAlpha=.2;x.fillText('♬',230,530);x.globalAlpha=1;
 for(let i=0;i<2;i++){const px=i?338:122,angle=a.flippers[i];x.strokeStyle=i?'#e584b1':'#66bce4';x.lineWidth=18;x.beginPath();x.moveTo(px,590);x.lineTo(px+83*Math.cos(angle),590+83*Math.sin(angle));x.stroke();circle(x,px,590,11,'#f4e6bb');}
 x.fillStyle='#bd7f9f';x.fillRect(418,665,13,21);x.strokeStyle='#c9c8ca';x.lineWidth=3;for(let i=0;i<5;i++){x.beginPath();x.moveTo(417,645+i*4);x.lineTo(432,648+i*4);x.stroke();}
 x.strokeStyle='#bff4e977';x.lineWidth=4;x.beginPath();a.trail.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
 if(!a.drained)s.sprite(x,player,a.x,a.y,46,{exact:true,mood:a.launched?'walking':'thinking'});
 x.fillStyle='#ead4a1';x.font='bold 20px monospace';x.fillText(`×${a.multiplier}  ·  ${a.launched?Math.ceil(Math.max(0,clock))+'s':'LAUNCH '+Math.ceil(Math.max(0,launchLeft))+'s'}`,230,474);
 if(!a.launched){x.fillStyle='#ffe5a8';x.font='14px Arial';x.fillText('PULL THE RIGHT PLUNGER ↓',236,151);}
 if(message){x.fillStyle='#ffe27f';x.font='bold 18px Arial';x.fillText(message,230,361);}
}
async function pinball(s) {
 const table=pinballTable(s.seed),[c,x]=s.canvas(table.W,table.H),scores=[0,0],totals=[0,0],fingers=new Map(),buttonHeld=[false,false];
 let player=0,ballNumber=0,a=newPinballBall(table),clock=22,launchLeft=3,phase='handoff',resultLeft=0,message='',messageLeft=0;
 function held(){return [0,1].map(i=>buttonHeld[i]||[...fingers.values()].some(f=>f.flipper===i));}
 function clear(){for(const id of fingers.keys())s.release({pointerId:id});fingers.clear();buttonHeld.fill(false);}
 function launch(power=1){if(s.paused||phase!=='playing')return;launchPinball(a,power);}
 function reset(){a=newPinballBall(table);clock=22;launchLeft=3;message='';clear();}
 async function next(){phase='handoff';clear();reset();if(await s.pass(player,`Bucketheadland pinball · ball ${ballNumber+1}/3. Hold both flippers with two fingers on the lower left/right, or the FLIP buttons. Pull down the right plunger and release to launch. Light BUCKET or all three bumpers plus both side lanes for a jackpot and higher multiplier. A new head-ball follows a drain; 22 seconds maximum per ball.`))phase='playing';}
 s.controls([{text:'◀ FLIP',key:'a',hold:value=>buttonHeld[0]=value},{text:'LAUNCH',click:()=>launch()},{text:'FLIP ▶',key:'l',hold:value=>buttonHeld[1]=value}],'pinball-controls');
 s.hint('A/L flippers · drag the right plunger down to launch. Both flippers can be held at once. Three alternating balls each on the same table; early drains get one ball save.');
 s.on(c,'pointerdown',ev=>{if(s.paused||phase!=='playing')return;ev.preventDefault();const p=s.pointer(ev);if(p.x>401&&!a.launched)fingers.set(ev.pointerId,{plunger:true,start:p.y,y:p.y});else fingers.set(ev.pointerId,{flipper:p.x<table.W/2?0:1});s.capture(ev);});
 s.on(c,'pointermove',ev=>{const f=fingers.get(ev.pointerId);if(!f||s.paused)return;ev.preventDefault();if(f.plunger)f.y=s.pointer(ev).y;});
 const release=(ev,cancelled)=>{const f=fingers.get(ev.pointerId);if(!f)return;fingers.delete(ev.pointerId);s.release(ev);if(f.plunger&&!cancelled&&!s.paused&&phase==='playing')launch(clamp(.75+Math.max(0,s.pointer(ev).y-f.start)/160,.75,1.12));};
 s.on(c,'pointerup',ev=>release(ev,false));s.on(c,'pointercancel',ev=>release(ev,true));s.on(c,'lostpointercapture',ev=>release(ev,true));s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 s.frame(dt=>{
  if(phase==='handoff')return;
  if(phase==='result'){resultLeft-=dt;if(resultLeft<=0){if(player===1){ballNumber++;if(ballNumber===3){s.finish(scores,'Bucketheadland · three alternating head-balls each');return;}player=0;}else player=1;void next();return;}}
  else{
   messageLeft=Math.max(0,messageLeft-dt);if(messageLeft===0)message='';
   if(!a.launched){launchLeft-=dt;if(launchLeft<=0)launch();}
   else{clock-=dt;stepPinball(a,dt,table,held());scores[player]=totals[player]+a.score;s.setScores(scores);
    for(const event of a.events){if(event.type==='jackpot'){message='JACKPOT! MULTIPLIER UP';messageLeft=1.2;s.react?.(player,'win');sound('win');}else if(event.type==='save'){message='BALL SAVED';messageLeft=.9;}else if(event.type==='bumper'||event.type==='target')sound('tap');}
    if(a.drained||clock<=0){phase='result';resultLeft=.7;totals[player]=scores[player];message=a.drained?'DRAIN! NEXT HEAD…':'BALL TIME · NEXT HEAD…';s.react?.(player,a.score?'happy':'sad');clear();}
   }
  }
  paintTable(x,table,a,s,player,clock,launchLeft,message);s.status(`${s.players[player].name} · ball ${ballNumber+1}/3 · ${scores[player]} · ×${a.multiplier} · light BUCKET for the jackpot`);s.debug={engine:'pinball',table,a,scores,player,ballNumber,phase,clock,fingers,held:held(),launch};
 });await next();
}

Object.assign(exports,{pinballTable,newPinballBall,launchPinball,stepPinball,pinball});