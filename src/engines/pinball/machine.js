// The pinball machine: everything a real game's operating system does, shared by every table. Players and balls,
// plunger/skill-shot phase, ball save, multiball (auto-plunged balls), extra balls, tilt bob, bonus count, ball search.
// A table supplies buildTable() and a rules object (see tables/buckethead.js); rules talk to the machine through
// m.score / m.bonus / m.say / m.sfx / m.ballSave / m.addBalls / m.extraBall / m.later / m.resetBank and m.p (the
// current player's table state, kept between balls) and m.ball (state for this ball only).
const P=require("src/engines/pinball/physics.js");

function createMachine({table,players=2,seed=1,onSound=()=>{},level='normal'}){
 const def=table.buildTable(),R=table.rules;
 const m={def,R,table,w:P.createWorld(def,seed),t:0,
  players:Array.from({length:players},()=>({score:0,ball:1,extra:0,state:R.newPlayer()})),cur:0,
  ball:{bonus:0},phase:'idle',mode:null,mb:0,inPlay:0,saveUntil:0,savePending:0,pendingBalls:0,timers:[],msgs:[],msg:null,
  tiltMeter:0,tiltWarn:0,tilted:false,shootAgainLamp:false,stillT:0,level};
 Object.defineProperty(m,'p',{get:()=>m.players[m.cur].state});
 m.score=n=>{if(m.tilted)return;m.players[m.cur].score+=Math.round(n);};
 m.bonus=n=>{if(!m.tilted)m.ball.bonus+=n;};
 m.sfx=name=>onSound(name);
 // DMD splash queue: newest important message first; short queue so it never lags far behind play.
 m.say=(lines,dur=1.5,o={})=>{const msg={lines,dur,flash:!!o.flash,age:0};if(!m.msg||o.flash||m.msg.age>.4){if(m.msg&&!o.flash)m.msgs.unshift(m.msg);m.msg=msg;}else m.msgs.push(msg);if(m.msgs.length>2)m.msgs.length=2;};
 m.later=(sec,fn)=>m.timers.push({at:m.t+sec,fn});
 m.ballSave=sec=>{if(m.phase==='plunge')m.savePending=Math.max(m.savePending,sec);else m.saveUntil=Math.max(m.saveUntil,m.t+sec);};
 m.saving=()=>m.t<m.saveUntil&&!m.tilted;
 m.resetBank=bank=>P.resetBank(m.w,bank);
 m.jackpot=(...a)=>R.jackpot?.(m,...a);
 m.startJordan=()=>R.startJordan?.(m);
 m.extraBall=()=>{m.players[m.cur].extra++;m.shootAgainLamp=true;m.say(['EXTRA BALL'],2.4,{flash:true});m.sfx('knocker');};
 // Extra balls for multiball / ball save come up the shooter lane and fire on their own.
 m.addBalls=n=>{for(let i=0;i<n;i++){m.pendingBalls++;m.later(.35+i*1.1,()=>{m.pendingBalls--;P.serveBall(m.w);m.later(.45,()=>{P.plunge(m.w,(m.def.plunger.auto-m.def.plunger.vmin)/(m.def.plunger.vmax-m.def.plunger.vmin));m.sfx('autoPlunge');});});}};
 m.live=()=>m.w.balls.length+m.pendingBalls;
 m.startBall=()=>{
  m.w.balls.length=0;m.timers.length=0;m.pendingBalls=0;m.mode=null;m.ball={bonus:0};m.tilted=m.w.tilted=false;m.tiltMeter=0;m.tiltWarn=0;m.saveUntil=0;m.savePending=0;m.msgs.length=0;m.msg=null;
  m.shootAgainLamp=m.players[m.cur].extra>0;m.phase='plunge';m.inPlay=0;P.serveBall(m.w);R.startBall?.(m);m.mb=1;
 };
 m.nudge=(vx,vy)=>{if(m.phase!=='play'||m.tilted)return;P.nudge(m.w,vx,vy);m.sfx('nudge');m.tiltMeter+=1;
  if(m.tiltMeter>2.6){m.tiltMeter=.8;m.tiltWarn++;if(m.tiltWarn>=3){m.tilted=m.w.tilted=true;m.saveUntil=0;m.say(['TILT'],99,{flash:true});m.sfx('tilt');}else{m.say([m.tiltWarn===1?'DANGER':'DANGER DANGER'],1.2,{flash:true});m.sfx('danger');}}};
 m.tick=(dt,input)=>{
  m.t+=dt;if(m.phase==='play')m.inPlay+=dt;m.tiltMeter=Math.max(0,m.tiltMeter-dt*.45);
  if(m.msg){m.msg.age+=dt;if(m.msg.age>=m.msg.dur)m.msg=m.msgs.shift()||null;}
  for(const tm of m.timers.splice(0).sort((a,b)=>a.at-b.at)){if(tm.at<=m.t)tm.fn();else m.timers.push(tm);}
  if(m.phase!=='plunge'&&m.phase!=='play')return [];
  const events=P.stepWorld(m.w,dt,input).splice(0);const out=[];
  for(const e of events){
   out.push(e);
   if(e.type==='flip'){if(!m.flipT||m.flipT[e.input]!==m.w.t){(m.flipT||=[])[e.input]=m.w.t;R.flip?.(m,e.input);}continue;}
   if(e.type==='plunge'&&m.phase==='plunge'){m.phase='play';m.inPlay=0;if(m.savePending){m.saveUntil=m.t+m.savePending;m.savePending=0;}}
   if(e.type==='drain'){
    if(m.saving()&&m.phase==='play'){m.say(['BALL SAVED'],1.6,{flash:true});m.sfx('save');m.addBalls(1);continue;}
    const left=m.live();if(left===1&&m.mb>1)R.multiballEnd?.(m);
    if(left===0){m.phase='drained';m.sfx(m.tilted?'tiltDrain':'drain');}
    continue;}
   if(!m.tilted)R.event(m,e);
  }
  m.mb=m.live();
  // Ball search: a ball sitting still away from the flippers gets a nudge.
  const still=m.phase==='play'&&!input.flip[0]&&!input.flip[1]&&m.w.balls.length&&m.w.balls.every(b=>b.state==='free'&&Math.hypot(b.vx,b.vy)<6&&!P.ballOnPlunger(m.w,b));
  m.stillT=still?m.stillT+dt:0;if(m.stillT>4){m.stillT=0;for(const b of m.w.balls){b.vx+=(m.w.random()-.5)*500;b.vy-=500;}m.say(['BALL SEARCH'],1);}
  return out;
 };
 // End of ball: bonus (nothing when tilted), then extra ball or the next player. Returns the bonus breakdown.
 m.endBall=()=>{const total=m.tilted?0:R.bonusTotal(m),lines=m.tilted?[]:R.bonusLines(m);m.players[m.cur].score+=total;m.tilted=m.w.tilted=false;return {total,lines};};
 // Who plays next? Returns {player, ball} or null when the game is over (balls alternate between players).
 m.advance=()=>{const pl=m.players[m.cur];if(pl.extra>0){pl.extra--;return {player:m.cur,ball:pl.ball,again:true};}
  pl.ball++;const n=m.players.length;for(let k=1;k<=n;k++){const i=(m.cur+k)%n;if(m.players[i].ball<=R.balls){m.cur=i;return {player:i,ball:m.players[i].ball};}}return null;};
 return m;
}
Object.assign(exports,{createMachine});
