// Pinball engine (band/music tables). Real pinball rules: 3 balls each, players alternate balls, no clock; 1P = a
// whole game on your own (beat the table's replay score). Physics, rules, DMD and art live in src/engines/pinball/;
// a game picks its table with `pinballTable` (default Bucketheadland). Controls: hold the left / right half of the
// screen for that flipper; drag down and release to pull the plunger; flick a finger up to nudge (too much = TILT).
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const P=require("src/engines/pinball/physics.js");
const {createMachine}=require("src/engines/pinball/machine.js");
const {createRenderer}=require("src/engines/pinball/render.js");
const {createDMD,scoreScene,splashScene}=require("src/engines/pinball/dmd.js");
const {pinballSound,rollLevel,stopRoll}=require("src/engines/pinball/sound.js");
const TABLES={buckethead:require("src/engines/pinball/tables/buckethead.js")};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,fmt=n=>Math.round(n).toLocaleString('en-US');
const LEFT=new Set(['KeyZ','KeyA','ShiftLeft','ArrowLeft','ControlLeft']),RIGHT=new Set(['Slash','KeyL','ShiftRight','ArrowRight','ControlRight']),PLUNGE=new Set(['Enter','ArrowDown','Space','NumpadEnter']);

function highTable(id){return (store.profile?.pinballHigh?.[id]||[]).slice();}
function recordHigh(id,name,score){if(!store.profile)return -1;const book=store.profile.pinballHigh||={},list=(book[id]||[]).slice();list.push({name:String(name).toUpperCase().slice(0,12),score:Math.floor(score)});list.sort((a,b)=>b.score-a.score);const rank=list.findIndex(e=>e.score===Math.floor(score)&&e.name===String(name).toUpperCase().slice(0,12));book[id]=list.slice(0,5);saveProfile(store.profile);return rank<5?rank:-1;}

async function pinball(s){
 const table=TABLES[s.game?.pinballTable]||TABLES.buckethead,solo=!!s.solo,nP=solo?1:2;
 const [c,x]=s.canvas(390,780,{fill:true});fullBleed(s,{bg:'#07060a'});s.body.classList.add('drag-arena-body');
 const m=createMachine({table,players:nP,seed:s.seed||1,level:s.solo?.level||'normal',onSound:pinballSound});
 const R=createRenderer({def:m.def,art:table.art}),dmd=createDMD(),rules=table.rules,names=s.players.slice(0,nP).map(p=>p.name);
 const replay=rules.replay?.[s.solo?.level||'normal']||rules.replay?.normal||0;
 let phase='intro',phaseT=0,t=0,bonus=null,hintT=6,over=false,auto=false,lastFlash=null;
 const fingers=new Map(),keys={flip:[false,false],pull:false,pullT:0};let pull=0;
 const scores=()=>m.players.map(p=>p.score);
 const clear=()=>{for(const id of fingers.keys())s.release({pointerId:id});fingers.clear();keys.flip=[false,false];keys.pull=false;pull=0;};
 const flipInput=()=>{const f=[keys.flip[0],keys.flip[1]];for(const g of fingers.values())if(!g.plunger)f[g.side]=true;return f;};
 const W=()=>s.W,H=()=>s.H;
 s.hint('Hold the left or right half of the screen for that flipper (two thumbs). Ball on the plunger: drag down and let go, a longer pull shoots harder. Flick a finger up to nudge the table; too many nudges and it TILTS. Keys: Z / Shift / ← and / / Shift / → flip, hold Enter or ↓ to pull the plunger, Space nudges.');
 // ---- input
 s.on(c,'pointerdown',ev=>{if(s.paused||!(phase==='ball'))return;ev.preventDefault();const p=s.pointer(ev);fingers.set(ev.pointerId,{side:p.x<W()/2?0:1,x0:p.x,y0:p.y,t0:performance.now(),plunger:false,nudged:false,pull:0});s.capture(ev);});
 s.on(c,'pointermove',ev=>{const f=fingers.get(ev.pointerId);if(!f||s.paused)return;ev.preventDefault();const p=s.pointer(ev),dy=p.y-f.y0;
  if(!f.plunger&&m.phase==='plunge'&&dy>14&&P.ballOnPlunger(m.w,m.w.balls[0]||{}))f.plunger=true;
  if(f.plunger)f.pull=clamp((dy-8)/(H()*.2),0,1);
  else if(!f.nudged&&m.phase==='play'&&-dy>H()*.06&&performance.now()-f.t0<260){f.nudged=true;m.nudge(clamp((p.x-f.x0)*2,-160,160),-300);}});
 const up=(ev,cancel)=>{const f=fingers.get(ev.pointerId);if(!f)return;fingers.delete(ev.pointerId);s.release(ev);if(f.plunger&&!cancel&&f.pull>.04&&m.phase==='plunge')P.plunge(m.w,f.pull);};
 s.on(c,'pointerup',ev=>up(ev,false));s.on(c,'pointercancel',ev=>up(ev,true));s.on(c,'lostpointercapture',ev=>up(ev,true));
 s.on(document,'keydown',ev=>{if(s.paused||phase!=='ball')return;const k=ev.code;
  if(LEFT.has(k)){keys.flip[0]=true;ev.preventDefault();}else if(RIGHT.has(k)){keys.flip[1]=true;ev.preventDefault();}
  else if(PLUNGE.has(k)){ev.preventDefault();if(m.phase==='plunge'){if(!keys.pull){keys.pull=true;keys.pullT=0;}}else if((k==='Space'||k==='KeyN')&&!ev.repeat)m.nudge(0,-300);}
  else if(k==='KeyN'&&!ev.repeat)m.nudge(0,-300);});
 s.on(document,'keyup',ev=>{const k=ev.code;if(LEFT.has(k))keys.flip[0]=false;else if(RIGHT.has(k))keys.flip[1]=false;else if(PLUNGE.has(k)&&keys.pull){keys.pull=false;if(m.phase==='plunge')P.plunge(m.w,clamp(keys.pullT/1.1,.05,1));keys.pullT=0;}});
 s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(()=>{clear();stopRoll();});
 // ---- autopilot for tests (s.debug.auto = true): flips when a ball drops onto a flipper, plunges at 70%.
 let botHold=[0,0],botPlungeAt=0;
 function bot(dt){const f=[false,false];for(const fl of m.w.flippers){const mid=fl.x+Math.cos(fl.rest)*fl.len/2;for(const b of m.w.balls)if(b.state==='free'&&Math.abs(b.x-mid)<58&&b.y-fl.y>-70&&b.y-fl.y<20&&b.vy>40)botHold[fl.input]=.16;}
  for(let i=0;i<2;i++)if(botHold[i]>0){f[i]=true;botHold[i]-=dt;}
  if(m.phase==='plunge'){botPlungeAt+=dt;if(botPlungeAt>.8){P.plunge(m.w,.72);botPlungeAt=0;}}return f;}

 // ---- flow
 async function handoff(i,again){
  clear();phase='wait';
  const pl=m.players[i],text=solo?`${names[0]}: three balls, no clock. Replay at ${fmt(replay)}. ${rules.howTo||''}`:`${names[i]}, you're up${again?': SHOOT AGAIN':''}. Ball ${pl.ball} of ${rules.balls}. ${pl.score?`You have ${fmt(pl.score)}.`:''} Hold the left/right half of the screen to flip, drag down + release to launch, flick up to nudge.`;
  if(solo&&(pl.ball>1||again))return true;
  return s.pass(i,text,'Ready');
 }
 function startBall(){m.startBall();phase='ball';phaseT=0;R.follow(m.w,1,W(),H(),true);pinballSound('start');}
 async function next(){
  const nx=m.advance();
  if(!nx){phase='gameover';phaseT=0;pinballSound('gameOver');return;}
  if(!await handoff(nx.player,nx.again))return;if(!s.alive)return;
  if(R.cam.z<1){phase='zoom';phaseT=0;return;}startBall();
 }
 async function finishGame(){
  if(over)return;over=true;const sc=scores();
  // high scores (one line per player)
  const ranks=sc.map((v,i)=>v>0?recordHigh(table.id||'buckethead',names[i]||`P${i+1}`,v):-1);
  if(solo){const won=replay>0&&sc[0]>=replay;soloFinish(s,sc[0],won?1:0,`${table.title} · ${fmt(sc[0])}${won?' · REPLAY!':''}${ranks[0]>=0?` · high score #${ranks[0]+1}`:''}`,won);}
  else s.finish(sc,`${table.title} pinball · 3 balls each${ranks.some(r=>r>=0)?' · new high score':''}`);
 }

 s.debug={engine:'pinball',m,phase,R,dmd,auto:false,scores:scores()};
 s.frame((dtRaw)=>{
  const dt=Math.min(dtRaw,1/30);t+=dt;phaseT+=dt;
  const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.round(W()*dpr),ch=Math.round(H()*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  auto=!!s.debug?.auto;
  if(phase==='intro'){R.cam.z=0;if(phaseT>2.4){phase='zoom';phaseT=0;}}
  else if(phase==='zoom'){R.cam.z=clamp(phaseT/1.3,0,1);R.cam.y=m.def.H;if(R.cam.z>=1)startBall();}
  else if(phase==='ball'){
   if(keys.pull)keys.pullT+=dt;
   const flip=auto?bot(dt):flipInput();let pl=0;for(const g of fingers.values())if(g.plunger)pl=Math.max(pl,g.pull);if(keys.pull)pl=Math.max(pl,clamp(keys.pullT/1.1,0,1));pull=pl;
   const ev=m.tick(dt,{flip,pull:m.phase==='plunge'?pull:0});
   for(const e of ev){const snd={flip:'flip',flipDown:'flipDown',bumper:'bumper',sling:'sling',drop:'drop',standup:'standup',rollover:'rollover',spin:'spin',hole:'hole',eject:'eject',plunge:'plunge',kickback:'kick',trigger:'gate',wallHit:'wall',railEnter:null}[e.type];if(snd&&!(e.type==='wallHit'&&e.speed<700))pinballSound(snd);
    if(e.type==='bumper'||e.type==='jackpot')s.react?.(m.cur,'happy');}
   let fast=0;for(const b of m.w.balls)if(b.state==='free')fast=Math.max(fast,Math.hypot(b.vx,b.vy));rollLevel(fast);
   R.follow(m.w,dt,W(),H());hintT=Math.max(0,hintT-dt);
   s.setScores(solo?[m.players[0].score,0]:scores());if(solo)soloProgress(s,m.players[0].score,0,`${table.title} · ball ${m.players[0].ball}`);
   if(m.phase==='drained'){rollLevel(0);bonus=m.endBall();bonus.step=0;phase='bonus';phaseT=0;clear();}
  }
  else if(phase==='bonus'){const steps=bonus.lines.length+1;if(Math.floor(phaseT/.9)!==bonus.step){bonus.step=Math.floor(phaseT/.9);if(bonus.step<=steps)pinballSound('bonus');}
   if(phaseT>.9*steps+.6){phase='wait';s.setScores(solo?[m.players[0].score,0]:scores());void next();}}
  else if(phase==='gameover'){if(phaseT>2.6)void finishGame();}
  // ---- draw
  const lamps=phase==='ball'?rules.lamps(m,t):attractLamps(m.def,t,phase==='bonus'?m.p:null);
  if(phase==='bonus')bonusScene();else if(phase==='gameover')gameOverScene();else if(phase==='intro'||phase==='zoom'||phase==='wait')attractScene();
  else if(m.msg)splashScene(dmd,{lines:m.msg.lines,flash:m.msg.flash,age:m.msg.age});
  else scoreScene(dmd,{scores:scores(),cur:m.cur,ball:m.players[m.cur].ball,balls:rules.balls,names,t,credits:solo&&replay?`REPLAY ${fmt(replay)}`:''});
  const v=R.draw(x,{W:W(),H:H(),dpr,w:m.w,lamps,t,dmd,strip:null});
  overlay(v);
  s.status(`${names[m.cur]||''} · ball ${m.players[m.cur].ball}/${rules.balls} · ${fmt(m.players[m.cur].score)}`);
  Object.assign(s.debug,{phase,auto,scores:scores()});
 });
 function attractScene(){const L=rules.attract||[table.title];const i=Math.floor(t/1.6)%L.length;splashScene(dmd,{lines:phase==='wait'&&!over?[names[m.cur]||'PLAYER '+(m.cur+1),`BALL ${m.players[m.cur].ball}`]:[L[i]],age:t%1.6});}
 function bonusScene(){const i=Math.min(bonus.lines.length,Math.floor(phaseT/.9));dmd.clear();
  if(i<bonus.lines.length){const [k,v]=bonus.lines[i];dmd.fit(k,64,3,{align:'center'});dmd.fit(typeof v==='number'&&k.includes('X')?`${v}X`:fmt(v),64,14,{scale:2,align:'center'});}
  else{dmd.fit('TOTAL BONUS',64,3,{align:'center'});dmd.fit(fmt(bonus.total),64,14,{scale:2,align:'center'});}}
 function gameOverScene(){dmd.clear();dmd.text('GAME OVER',64,1,{align:'center'});const sc=scores();if(nP===1)dmd.fit(fmt(sc[0]),64,12,{scale:2,align:'center'});else sc.forEach((v,i)=>dmd.fit(`${(names[i]||'P'+(i+1)).slice(0,8)} ${fmt(v)}`,64,11+i*10,{align:'center'}));}
 function attractLamps(def,t,p){const L={},k=Math.floor(t*10);def.lamps.forEach((l,i)=>{L[l.id]=(k+i)%6<2?1:0;});if(p)for(const n of [2,3,4,5,6])L['bx'+n]=p.bonusX>=n?1:0;return L;}
 // Touch hints + plunger meter, drawn in screen space.
 function overlay(v){
  if(phase!=='ball')return;const w=W(),h=H();x.save();x.setTransform(Math.min(2,window.devicePixelRatio||1),0,0,Math.min(2,window.devicePixelRatio||1),0,0);
  if(m.phase==='plunge'){const pl=m.w.plunger,[sx,sy]=R.toScreen(v,(pl.x0+pl.x1)/2,pl.y);const mh=Math.min(110,h*.18),mx=Math.min(w-14,sx),my=clamp(sy-mh-20,v.top+10,h-mh-10);
   x.fillStyle='rgba(0,0,0,.55)';x.fillRect(mx-7,my,14,mh);x.fillStyle=pull>.85?'#ff3b30':'#ffd23f';x.fillRect(mx-5,my+2,10,(mh-4)*pull);
   if(pull<.05){x.fillStyle='rgba(255,255,255,.9)';x.font='bold 13px Arial';x.textAlign='right';x.textBaseline='middle';x.fillText('DRAG DOWN & RELEASE ⤓',mx-12,my+mh/2);}}
  if(hintT>0&&m.players[m.cur].ball===1){x.globalAlpha=Math.min(1,hintT)*.55;x.fillStyle='#fff';x.font='bold 13px Arial';x.textBaseline='bottom';x.textAlign='left';x.fillText('◀ HOLD: LEFT FLIPPER',10,h-34);x.textAlign='right';x.fillText('RIGHT FLIPPER: HOLD ▶',w-10,h-34);
   x.fillStyle='rgba(255,255,255,.25)';x.fillRect(w/2-.5,v.top+40,1,h-v.top-80);}
  x.restore();
 }
 if(!await handoff(0,false)||!s.alive)return;
 phase='intro';phaseT=0;
}
Object.assign(exports,{pinball,PINBALL_TABLES:TABLES});
