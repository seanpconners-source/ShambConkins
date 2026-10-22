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
const {createMusic}=require("src/engines/pinball/music.js");
const {createLights}=require("src/engines/pinball/lights.js");
const {loadDropins}=require("src/engines/pinball/dropins.js");
const audio=require("src/audio.js");
const TABLES={buckethead:require("src/engines/pinball/tables/buckethead.js")};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,fmt=n=>Math.round(n).toLocaleString('en-US');
const LEFT=new Set(['KeyZ','KeyA','ShiftLeft','ArrowLeft','ControlLeft']),RIGHT=new Set(['Slash','KeyL','ShiftRight','ArrowRight','ControlRight']),PLUNGE=new Set(['Enter','ArrowDown','Space','NumpadEnter']);

function highTable(id){return (store.profile?.pinballHigh?.[id]||[]).slice();}
function recordHigh(id,name,score){if(!store.profile)return -1;const book=store.profile.pinballHigh||={},list=(book[id]||[]).slice();list.push({name:String(name).toUpperCase().slice(0,12),score:Math.floor(score)});list.sort((a,b)=>b.score-a.score);const rank=list.findIndex(e=>e.score===Math.floor(score)&&e.name===String(name).toUpperCase().slice(0,12));book[id]=list.slice(0,5);saveProfile(store.profile);return rank<5?rank:-1;}

async function pinball(s){
 const table=TABLES[s.game?.pinballTable]||TABLES.buckethead,solo=!!s.solo,nP=solo?1:2;
 const [c,x]=s.canvas(390,780,{fill:true});fullBleed(s,{bg:'#07060a'});s.body.classList.add('drag-arena-body');
 const m=createMachine({table,players:nP,seed:s.seed||1,level:s.solo?.level||'normal',onSound:pinballSound});
 // drop-in art (assets/pinball/<table>/): rebuild the cached playfield when a picture finishes loading
 let R=null;const imgs=loadDropins(table.id||'buckethead',()=>R?.invalidate());
 R=createRenderer({def:m.def,art:table.art,imgs});const lights=createLights(m.def);
 const dmd=createDMD(),rules=table.rules,names=s.players.slice(0,nP).map(p=>p.name);
 const replay=rules.replay?.[s.solo?.level||'normal']||rules.replay?.normal||0;
 let phase='intro',phaseT=0,t=0,bonus=null,hintT=6,over=false,auto=false,highRanks=null;
 // The table's own soundtrack replaces the board score while the game runs.
 const music=createMusic(table.songs||{},{paused:()=>s.paused||!s.alive});let song=null;
 audio.stopMusic();s.cleanup(()=>{music.stop();if(store.profile?.settings.music)try{audio.startMusic();}catch{}});
 const setSong=name=>{if(name===song)return;song=name;if(name)music.play(name);else music.stop();};
 // Player faces for the DMD (redrawn now and then: portraits can arrive late).
 const faces=[],faceT=[];
 const face=i=>{if(i==null)return null;if(!faces[i]||t-(faceT[i]||0)>2){const cv=faces[i]||document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');g.clearRect(0,0,64,64);try{s.sprite(g,i,32,32,60,{exact:true,noBadge:true});}catch{}faces[i]=cv;faceT[i]=t;}return faces[i];};
 const fingers=new Map(),keys={flip:[false,false],pull:false,pullT:0};let pull=0;
 const scores=()=>m.players.map(p=>p.score);
 const clear=()=>{for(const id of fingers.keys())s.release({pointerId:id});fingers.clear();keys.flip=[false,false];keys.pull=false;pull=0;};
 const flipInput=()=>{const f=[keys.flip[0],keys.flip[1]];for(const g of fingers.values())if(!g.plunger)f[g.side]=true;return f;};
 const W=()=>s.W,H=()=>s.H;
 s.hint('Hold the left or right half of the screen for that flipper (two thumbs). Ball on the plunger: drag down and let go, a longer pull shoots harder. Flick a finger up to nudge the table; too many nudges and it TILTS. Tap the score display to switch AUTO ZOOM (the view pulls back a little while the ball flies). Keys: Z / Shift / ← and / / Shift / → flip, hold Enter or ↓ to pull the plunger, Space nudges, V toggles auto zoom.');
 // Auto zoom (speed zoom-out) is a saved setting; tapping the DMD or pressing V switches it.
 R.cam.speedZoom=!!store.profile?.settings?.pinballZoom;
 const toggleZoom=()=>{R.cam.speedZoom=!R.cam.speedZoom;if(store.profile){store.profile.settings.pinballZoom=R.cam.speedZoom;saveProfile(store.profile);}m.say(['AUTO ZOOM',R.cam.speedZoom?'ON':'OFF'],1.2);pinballSound('rollover');};
 // ---- input
 s.on(c,'pointerdown',ev=>{if(s.paused||!(phase==='ball'))return;ev.preventDefault();const p=s.pointer(ev);
  if(p.y<R.layout(W(),H()).stripH&&p.x<W()-130){toggleZoom();return;}fingers.set(ev.pointerId,{side:p.x<W()/2?0:1,x0:p.x,y0:p.y,t0:performance.now(),plunger:false,nudged:false,pull:0});s.capture(ev);});
 s.on(c,'pointermove',ev=>{const f=fingers.get(ev.pointerId);if(!f||s.paused)return;ev.preventDefault();const p=s.pointer(ev),dy=p.y-f.y0;
  if(!f.plunger&&m.phase==='plunge'&&dy>14&&P.ballOnPlunger(m.w,m.w.balls[0]||{}))f.plunger=true;
  if(f.plunger)f.pull=clamp((dy-8)/(H()*.2),0,1);
  else if(!f.nudged&&m.phase==='play'&&-dy>H()*.06&&performance.now()-f.t0<260){f.nudged=true;m.nudge(clamp((p.x-f.x0)*2,-160,160),-300);}});
 const up=(ev,cancel)=>{const f=fingers.get(ev.pointerId);if(!f)return;fingers.delete(ev.pointerId);s.release(ev);if(f.plunger&&!cancel&&f.pull>.04&&m.phase==='plunge')P.plunge(m.w,f.pull);};
 s.on(c,'pointerup',ev=>up(ev,false));s.on(c,'pointercancel',ev=>up(ev,true));s.on(c,'lostpointercapture',ev=>up(ev,true));
 s.on(document,'keydown',ev=>{if(s.paused||phase!=='ball')return;const k=ev.code;
  if(LEFT.has(k)){keys.flip[0]=true;ev.preventDefault();}else if(RIGHT.has(k)){keys.flip[1]=true;ev.preventDefault();}
  else if(PLUNGE.has(k)){ev.preventDefault();if(m.phase==='plunge'){if(!keys.pull){keys.pull=true;keys.pullT=0;}}else if((k==='Space'||k==='KeyN')&&!ev.repeat)m.nudge(0,-300);}
  else if(k==='KeyN'&&!ev.repeat)m.nudge(0,-300);
  else if(k==='KeyV'&&!ev.repeat)toggleZoom();});
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
 function startBall(){m.startBall();phase='ball';phaseT=0;R.follow(m.w,1,W(),H(),true);pinballSound('start');
  // the player's face on the DMD first, then the table's own ball-start message (skill shot)
  const pl=m.players[m.cur],first=m.msg;m.msg={lines:[nP>1?`PLAYER ${m.cur+1}`:'',(names[m.cur]||'').toUpperCase().slice(0,12),`BALL ${pl.ball}${pl.extra&&m.shootAgainLamp?' · AGAIN':''}`],dur:1.8,anim:'face',flash:false,age:0};if(first)m.msgs.unshift(first);}
 async function next(){
  const nx=m.advance();
  if(!nx){phase='gameover';phaseT=0;pinballSound('gameOver');
   // high scores go in now so the DMD can celebrate them (one line per player)
   highRanks=scores().map((v,i)=>v>0?recordHigh(table.id||'buckethead',names[i]||`P${i+1}`,v):-1);if(highRanks.some(r=>r>=0))pinballSound('knocker');return;}
  if(!await handoff(nx.player,nx.again))return;if(!s.alive)return;
  if(R.cam.z<1){phase='zoom';phaseT=0;return;}startBall();
 }
 async function finishGame(){
  if(over)return;over=true;const sc=scores(),ranks=highRanks||sc.map(()=>-1);setSong(null);
  if(solo){const won=replay>0&&sc[0]>=replay;soloFinish(s,sc[0],won?1:0,`${table.title} · ${fmt(sc[0])}${won?' · REPLAY!':''}${ranks[0]>=0?` · high score #${ranks[0]+1}`:''}`,won);}
  else s.finish(sc,`${table.title} pinball · 3 balls each${ranks.some(r=>r>=0)?' · new high score':''}`);
 }

 s.debug={engine:'pinball',m,phase,R,dmd,auto:false,scores:scores(),plunge:p=>P.plunge(m.w,p),scenes:Object.keys(table.dmdScenes||{}),song:()=>music.current};
 s.frame((dtRaw)=>{
  const dt=Math.min(dtRaw,1/30);t+=dt;phaseT+=dt;
  const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.round(W()*dpr),ch=Math.round(H()*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  auto=!!s.debug?.auto;
  if(phase==='intro'){R.cam.z=0;if(phaseT>3.2){phase='zoom';phaseT=0;}}
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
  else if(phase==='gameover'){if(phaseT>(highRanks?.some(r=>r>=0)?5:2.6))void finishGame();}
  // ---- music: attract under the intro and hand-offs, a build-up on the plunger, then whatever the rules ask for
  setSong(phase==='intro'||phase==='zoom'||phase==='gameover'?'attract':phase==='wait'?null:phase==='bonus'?null:m.phase==='plunge'?'plunge':m.tilted?null:rules.music?.(m)||'main');
  // ---- draw
  // Lights: the rules' lamps with any running light shows on top; attract shows between balls; dim for the bonus.
  const lamps=phase==='ball'?lights.apply(rules.lamps(m,t),m.shows,m.t):phase==='bonus'?bonusLamps(m.p):lights.attract(t);
  const gi=phase==='ball'?m.gi:phase==='bonus'?.15:phase==='gameover'?.4:1;
  // attract: flasher domes fire one after another; in play the rules fire them (m.flashers)
  const fl=phase==='ball'?m.flashers:attractFlash();
  const backglass=phase==='intro'?(phaseT<1.6?1:Math.max(0,1-(phaseT-1.6)/.6)):0;
  if(phase==='bonus')bonusScene();else if(phase==='gameover')gameOverScene();else if(phase==='intro'||phase==='zoom'||phase==='wait')attractScene();
  else if(m.msg)msgScene(m.msg);
  else scoreScene(dmd,{scores:scores(),cur:m.cur,ball:m.players[m.cur].ball,balls:rules.balls,names,t,credits:rules.dmdMode?.(m)||(solo&&replay?`REPLAY ${fmt(replay)}`:'')});
  const v=R.draw(x,{W:W(),H:H(),dpr,w:m.w,lamps,t,dmd,strip:null,gi,flashers:fl,flashT:phase==='ball'?m.t:t,backglass});
  overlay(v);
  s.status(`${names[m.cur]||''} · ball ${m.players[m.cur].ball}/${rules.balls} · ${fmt(m.players[m.cur].score)}`);
  Object.assign(s.debug,{phase,auto,scores:scores()});
 });
 // A message: the table's animation for msg.anim (flash inverts on the beat), else the plain splash.
 const sceneCtx=()=>({t,face,cur:m.cur,names});
 function msgScene(msg){const sc=table.dmdScenes?.[msg.anim];if(!sc)return splashScene(dmd,{lines:msg.lines,flash:msg.flash,age:msg.age});
  sc(dmd,msg.age,msg.lines,sceneCtx());if(msg.flash&&msg.age<1.2&&Math.floor(msg.age*8)%2)dmd.invert();}
 // Attract loop (intro / hand-offs): park logo, grand champion, high-score table, game rules lines.
 function attractScene(){
  if(phase==='wait'&&!over){const sc=table.dmdScenes?.face;const pl=m.players[m.cur],L=[nP>1?`PLAYER ${m.cur+1}`:'',(names[m.cur]||'').toUpperCase().slice(0,12),`BALL ${pl.ball}`];return sc?sc(dmd,phaseT,L,sceneCtx()):splashScene(dmd,{lines:L,age:phaseT});}
  const hs=highTable(table.id||'buckethead'),slot=Math.floor(t/3)%4,age=t%3,sc=table.dmdScenes||{};
  if(slot===0&&sc.ferris)return sc.ferris(dmd,age,[table.title.toUpperCase(),'NOW OPEN'],sceneCtx());
  if(slot===1&&hs[0]){dmd.clear();dmd.text('GRAND CHAMPION',64,2,{align:'center',v:10});dmd.fit(hs[0].name,64,11,{align:'center'});dmd.fit(fmt(hs[0].score),64,21,{align:'center'});dmd.sparkle(age,10,6);return;}
  if(slot===2&&hs.length>1){dmd.clear();hs.slice(1,4).forEach((e,i)=>{dmd.text(`${i+2} ${e.name.slice(0,8)}`,2,1+i*11,{v:10});dmd.text(fmt(e.score),126,1+i*11,{align:'right'});});return;}
  const L=rules.attract||[table.title];splashScene(dmd,{lines:[L[Math.floor(t/3)%L.length]],age});}
 function bonusScene(){const i=Math.min(bonus.lines.length,Math.floor(phaseT/.9));dmd.clear();
  if(i<bonus.lines.length){const [k,v]=bonus.lines[i];dmd.fit(k,64,3,{align:'center'});dmd.fit(typeof v==='number'&&k.includes('X')?`${v}X`:fmt(v),64,14,{scale:2,align:'center'});}
  else{dmd.fit('TOTAL BONUS',64,3,{align:'center'});dmd.fit(fmt(bonus.total),64,14,{scale:2,align:'center'});}}
 function gameOverScene(){
  // new high score: the knocker fires and the panel celebrates each player that made the table
  const best=(highRanks||[]).map((r,i)=>[r,i]).filter(([r])=>r>=0);
  if(best.length&&phaseT>2){const [r,i]=best[Math.floor((phaseT-2)/1.5)%best.length],sc=table.dmdScenes?.jackpot;const L=[r===0?'GRAND CHAMPION':`HIGH SCORE #${r+1}`,`${(names[i]||'').toUpperCase().slice(0,10)} ${fmt(scores()[i])}`];
   if(sc)sc(dmd,(phaseT-2)%1.5,L,sceneCtx());else splashScene(dmd,{lines:L,age:phaseT});return;}
  dmd.clear();dmd.text('GAME OVER',64,1,{align:'center'});const sc=scores();if(nP===1)dmd.fit(fmt(sc[0]),64,12,{scale:2,align:'center'});else sc.forEach((v,i)=>dmd.fit(`${(names[i]||'P'+(i+1)).slice(0,8)} ${fmt(v)}`,64,11+i*10,{align:'center'}));}
 function bonusLamps(p){const L={};for(const n of [2,3,4,5,6])L['bx'+n]=p.bonusX>=n?1:0;L.shootAgain=m.players[m.cur].extra>0?Math.floor(t*4)%2:0;return L;}
 function attractFlash(){const fs=m.def.flashers;if(!fs.length)return null;const i=Math.floor(t/1.1)%fs.length,age=t%1.1;return age<.35?{[fs[i].id]:{t0:t-age,count:3}}:null;}
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
