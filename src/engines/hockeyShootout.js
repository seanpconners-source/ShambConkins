const {clamp, escapeHTML}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {ownedPointers}=require("src/engines/duelControls.js");
const {sound, vibrate}=require("src/audio.js");
function shootoutArena(W=960,H=540){
 const unit=Math.min(W,H),r=clamp(unit*.075,23,42),half=Math.min(H*.30,170);
 return {W,H,r,puckR:clamp(unit*.026,9,15),top:18,bottom:H-18,left:20,right:W-20,
  goalTop:H/2-half,goalBottom:H/2+half,keeperX:[Math.max(54,W*.09),W-Math.max(54,W*.09)],
  originX:[Math.max(85,W*.18),W-Math.max(85,W*.18)]};
}
function shootoutVelocity(dx,dy,striker=0){
 const direction=striker===0?1:-1,length=Math.hypot(dx,dy);
 if(dx*direction<9||length<12)return null;
 const speed=clamp(length*6,250,840);
 return {vx:dx/length*speed,vy:dy/length*speed};
}
// Substeps and a swept keeper-plane test keep a fast flick from skipping a save.
function shootoutStep(a,dt){
 if(!Number.isFinite(dt)||dt<=0)return null;
 const b=a.arena,p=a.puck,dir=a.striker===0?1:-1,keeper=1-a.striker;
 const steps=Math.max(1,Math.ceil(dt*240)),step=dt/steps;
 for(let n=0;n<steps;n++){
  const before=a.goalieY;a.goalieY+=clamp(a.goalieTarget-a.goalieY,-b.H*1.45*step,b.H*1.45*step);
  a.goalieY=clamp(a.goalieY,b.goalTop+b.r*.65,b.goalBottom-b.r*.65);a.goalieVelocity=(a.goalieY-before)/step;
  if(!p.flying)continue;
  a.flight+=step;const old={x:p.x,y:p.y};p.x+=p.vx*step;p.y+=p.vy*step;
  const friction=Math.pow(.999,step*60);p.vx*=friction;p.vy*=friction;
  if(p.y<b.top+b.puckR){p.y=b.top+b.puckR;p.vy=Math.abs(p.vy)*.88;}
  if(p.y>b.bottom-b.puckR){p.y=b.bottom-b.puckR;p.vy=-Math.abs(p.vy)*.88;}
  const plane=b.keeperX[keeper]-dir*(b.r*.34+b.puckR);
  if(p.vx*dir>0&&(old.x-plane)*dir<=0&&(p.x-plane)*dir>=0){
   const t=clamp((plane-old.x)/(p.x-old.x||1),0,1),crossY=old.y+(p.y-old.y)*t;
   if(Math.abs(crossY-a.goalieY)<b.r+b.puckR){p.x=plane-dir*.2;p.y=crossY;p.vx=-dir*Math.abs(p.vx)*.72;p.vy+=(crossY-a.goalieY)*5+a.goalieVelocity*.16;a.saved=true;a.saveFlash=.3;}
  }
  if(p.x>b.right||p.x<b.left){
   const target=dir>0?p.x>b.right:p.x<b.left;
   return target&&p.y>b.goalTop+b.puckR&&p.y<b.goalBottom-b.puckR?'goal':'miss';
  }
  if(a.flight>4.5||a.flight>.6&&Math.hypot(p.vx,p.vy)<40)return 'miss';
 }
 return null;
}

async function airshootout(s){
 const[c,x]=s.canvas(960,540,{fill:true});s.body.classList.add('hockey-shootout-body');
 const shell=document.querySelector('.game-shell');shell?.classList.add('hockey-shootout-shell');
 const board=document.createElement('div');board.className='hockey-scoreboard';
 board.innerHTML=`<div class="hockey-team team-left"><strong>${escapeHTML(s.players[0].name)}</strong><b id="hockey-score-0">0</b><div id="hockey-attempts-0" class="hockey-attempts"></div></div><div class="hockey-clock"><small id="hockey-clock-label">SHOT CLOCK</small><b id="hockey-clock">00:12</b><span id="hockey-role">MIGHTY DUCKS SHOOTOUT</span></div><div class="hockey-team team-right"><strong>${escapeHTML(s.players[1].name)}</strong><b id="hockey-score-1">0</b><div id="hockey-attempts-1" class="hockey-attempts"></div></div>`;
 s.body.insertBefore(board,s.body.firstChild);
 const scores=[0,0],shots=[0,0],marks=[[],[]];let striker=0,aimLeft=12,transition=0,result='',drag=null,anchor=null,pull=null;
 let a={arena:shootoutArena(s.W,s.H),striker,puck:{},goalieY:s.H/2,goalieTarget:s.H/2,goalieVelocity:0,flight:0,saved:false,saveFlash:0};
 function reset(){a.striker=striker;a.puck={x:a.arena.originX[striker],y:a.arena.H/2,vx:0,vy:0,flying:false};a.goalieY=a.goalieTarget=a.arena.H/2;a.flight=0;a.saved=false;a.saveFlash=0;aimLeft=12;drag=anchor=pull=null;}
 let paintedShots='';
 function scoreboard(){
  const signature=marks.map(m=>m.join(',')).join('|');if(signature!==paintedShots){paintedShots=signature;
  for(let i=0;i<2;i++){document.getElementById('hockey-score-'+i).textContent=scores[i];document.getElementById('hockey-attempts-'+i).innerHTML=Array.from({length:5},(_,j)=>`<i class="${j<marks[i].length?marks[i][j]?'scored':'missed':''}" aria-label="Attempt ${j+1}: ${j<marks[i].length?marks[i][j]?'goal':'miss':'waiting'}"></i>`).join('');}}
  document.getElementById('hockey-role').textContent=`${s.players[striker].name} shoots → ${s.players[1-striker].name} defends`;
  document.getElementById('hockey-clock-label').textContent=transition>0?result:a.puck.flying?'PUCK IN PLAY':'SHOT CLOCK';
  const left=transition>0?0:a.puck.flying?Math.max(0,4.5-a.flight):Math.max(0,aimLeft);
  document.getElementById('hockey-clock').textContent='00:'+String(Math.ceil(left)).padStart(2,'0');
  board.classList.toggle('clock-urgent',!a.puck.flying&&aimLeft<4&&transition<=0);board.classList.toggle('goal-flash',transition>0&&result==='GOAL!');
 }
 function updateRoles(){s.active=striker;s.updateScores();scoreboard();}
 function launch(v){if(!v||s.paused||!s.alive||transition>0||a.puck.flying)return;a.puck.vx=v.vx;a.puck.vy=v.vy;a.puck.flying=true;a.flight=0;drag=anchor=pull=null;sound('shot');}
 const fingers=ownedPointers(s,(owner,p,id)=>{
  if(transition>0)return;
  if(owner!==striker){a.goalieTarget=clamp(p.y,a.arena.goalTop+a.arena.r*.65,a.arena.goalBottom-a.arena.r*.65);return;}
  if(a.puck.flying)return;
  if(drag===null){drag=id;anchor={...p};pull={...p};a.puck.y=clamp(p.y,a.arena.top+55,a.arena.bottom-55);}
  else if(drag===id)pull={...p};
 },(owner,id,{cancelled,point})=>{
  if(owner!==striker||drag!==id)return;const start=anchor,end=point||pull;drag=anchor=pull=null;
  if(!cancelled&&start&&end)launch(shootoutVelocity(start.x-end.x,start.y-end.y,striker));
 });
 s.resetOnPause?.(()=>{drag=anchor=pull=null;});s.shared=true;reset();updateRoles();
 s.hint('Drag your end of the rink. Shooter: pull away from the goal and release. Goalie: drag up/down.');
 if(!await s.pass(0,'Drag only. Player one owns the LEFT end; player two owns the RIGHT end. Names appear on the scoreboard. The shooter pulls back from their puck, then releases across the ice. The other player drags up/down on their own end to defend. Swap roles every attempt; five each. A first real win recruits Emilio Estevez / Gordon Bombay.','Both ready — quack, quack!'))return;
 function resolve(goal){if(transition>0)return;shots[striker]++;marks[striker].push(goal);if(goal){scores[striker]++;s.react?.(striker,'win');s.react?.(1-striker,'sad');sound('win');vibrate(25);}else{s.react?.(striker,'sad');s.react?.(1-striker,'happy');sound('lose');}result=goal?'GOAL!':a.saved?'GREAT SAVE!':'MISSED';transition=1.15;drag=anchor=pull=null;s.resetInputs?.();s.setScores(scores);scoreboard();}
 s.frame(dt=>{
  if(a.arena.W!==s.W||a.arena.H!==s.H){const old=a.arena;a.arena=shootoutArena(s.W,s.H);a.puck.x*=s.W/old.W;a.puck.y*=s.H/old.H;a.goalieY*=s.H/old.H;a.goalieTarget*=s.H/old.H;s.resetInputs?.();}
  const b=a.arena,W=b.W,H=b.H;
  // Physics resumes at zero; a frame that overshoots the pause must not leave it negative.
  if(transition>0){transition=Math.max(0,transition-dt);if(transition===0){if(shots.every(n=>n>=5)){s.finish(scores,'The Mighty Ducks · five alternating shots each');return;}striker=1-striker;reset();updateRoles();}}
  else{if(!a.puck.flying){aimLeft-=dt;if(aimLeft<=0)resolve(false);}const outcome=transition===0?shootoutStep(a,dt):null;if(outcome)resolve(outcome==='goal');}
  a.saveFlash=Math.max(0,a.saveFlash-dt);
  x.fillStyle='#e6f5f5';x.fillRect(0,0,W,H);x.strokeStyle='#94bdc6';x.lineWidth=5;x.strokeRect(18,18,W-36,H-36);
  x.strokeStyle='#bd6877';x.lineWidth=3;x.beginPath();x.moveTo(W/2,18);x.lineTo(W/2,H-18);x.arc(W/2,H/2,Math.min(W,H)*.17,0,Math.PI*2);x.stroke();
  x.strokeStyle='#76adbd';for(const xx of [W*.32,W*.68]){x.beginPath();x.moveTo(xx,18);x.lineTo(xx,H-18);x.stroke();}
  x.fillStyle='#175b55';x.globalAlpha=.075;x.font=`bold ${Math.min(W,H)*.078}px Arial`;x.textAlign='center';x.fillText('THE MIGHTY DUCKS',W/2,H*.44);x.fillText('FLYING V',W/2,H*.57);x.globalAlpha=1;
  for(let i=0;i<2;i++){
   const gx=i?b.right:b.left;x.fillStyle='#356879';x.fillRect(gx-3,b.goalTop,6,b.goalBottom-b.goalTop);x.strokeStyle='#76a3b3';x.lineWidth=1;
   for(let yy=b.goalTop;yy<b.goalBottom;yy+=12){x.beginPath();x.moveTo(i?gx:0,yy);x.lineTo(i?W:gx,yy);x.stroke();}
   x.strokeStyle='#ca6a77';x.lineWidth=3;x.beginPath();x.arc(gx,H/2,b.r*1.7,i?Math.PI/2:-Math.PI/2,i?Math.PI*1.5:Math.PI/2);x.stroke();
  }
  const keeper=1-striker;kHead(x,keeper,b.keeperX[keeper],a.goalieY,b.r*2.1,a.saveFlash>0?'win':undefined);
  const shooterX=b.originX[striker]+(striker?1:-1)*b.r*.85;kHead(x,striker,shooterX,a.puck.flying?H/2:a.puck.y,b.r*2.0);
  const from=anchor&&pull?shootoutVelocity(anchor.x-pull.x,anchor.y-pull.y,striker):null;
  if(from&&!a.puck.flying&&transition<=0){x.strokeStyle=striker?'#a44077':'#2562a3';x.lineWidth=4;x.setLineDash([8,10]);x.beginPath();x.moveTo(a.puck.x,a.puck.y);x.lineTo(a.puck.x+from.vx*.22,a.puck.y+from.vy*.22);x.stroke();x.setLineDash([]);}
  circle(x,a.puck.x,a.puck.y,b.puckR,'#173c4a');s.sprite(x,striker,a.puck.x,a.puck.y,b.puckR*2.8,{exact:true});
  x.textAlign='center';x.font=`bold ${clamp(Math.min(W,H)*.035,11,18)}px Arial`;x.fillStyle='#286058';
  for(let i=0;i<2;i++)x.fillText(`${s.players[i].name} · ${i===striker?'PULL BACK & RELEASE':'DRAG TO DEFEND'}`,i?W*.80:W*.20,H-34);
  if(transition>0){x.fillStyle=result==='GOAL!'?'#15664f':'#765073';x.font=`bold ${clamp(Math.min(W,H)*.095,25,48)}px Arial`;x.fillText(result,W/2,H/2);}
  scoreboard();s.status(`${s.players[striker].name} shooting · ${shots[striker]+1}/5 · ${scores[0]}–${scores[1]}`);
  s.debug={engine:'airshootout',state:a,scores,shots,marks,striker,fingers,transition,aimLeft,shootoutStep,shootoutVelocity};
 });
 function kHead(ctx,owner,cx,cy,size,mood){s.sprite(ctx,owner,cx,cy,size*1.12,{exact:true,...(mood?{mood}:{})});}
}

Object.assign(exports,{shootoutArena,shootoutVelocity,shootoutStep,airshootout});