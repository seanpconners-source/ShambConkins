// Mario Kart (3D). Four games share this engine (kartMode):
//  'race'   Grand Prix VS: both players at once, side-by-side split screen (P1 left, P2 right), six CPU racers.
//  'gp'     Grand Prix pass & play: P1 races seven CPU racers full screen, then P2 races the same grid; best placing wins.
//  'time'   Time Trials pass & play: P1 runs three laps alone with three mushrooms, then P2 runs the same course
//           against P1's ghost; fastest total time wins.
//  'battle' Balloon Battle VS: side-by-side split screen on a floating rainbow ring.
// Races start with a course select: Rainbow Road, Moo Moo Meadows, Cheep Cheep Beach, Bowser's Castle (kart3d/track.js).
// Each player's screen is driven like Mario Kart Tour: the kart accelerates by itself, drag sideways to steer, push all
// the way to drift (blue → orange → purple sparks; let go for a mini-turbo), tap to use an item, swipe up to throw it
// ahead or down to drop it behind. Items: banana (x3), green shell (x3), red/blue shell, mushroom (x3), golden mushroom,
// star, lightning, bob-omb, blooper, coin, Bullet Bill, plus Tour's frenzy. Needs WebGL.
const {clamp,seededRandom}=require("src/utils.js");
const {soloFinish,soloProgress,cpuSkill}=require("src/solo.js");
const {arenaKeys,arenaTouch,snd,noise,jingle,PCOL,FONT,outlined,rr,settle}=require("src/engines/arenaKit.js");
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {CHARACTERS,character,characterIdentity}=require("src/characters.js");
const {portraitURL}=require("src/assets.js");
const {fullscreenSupported,toggleFullscreen,fullscreenLabel}=require("src/fullscreen.js");
const T=require("src/engines/kart3d/track.js");
const Ph=require("src/engines/kart3d/physics.js");
const HZ=require("src/engines/kart3d/hazards.js");
const {createRenderer,TILE}=require("src/engines/kart3d/render.js");
const {drawHUD}=require("src/engines/kart3d/hud.js");
const {createKartMusic}=require("src/engines/kart3d/music.js");
const {netField}=require("src/engines/netField.js");

const LAPS=3,RACE_CAP=200,BATTLE_TIME=100;
const GL_OPTS={antialias:true,alpha:false,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'};
const POOLS={
 first:[['banana',4],['green',3],['banana3',1],['coin',2],['bomb',1],['blooper',1],['shell3',.6]],
 second:[['mushroom',2],['mush3',2],['red',2.2],['shell3',1.2],['star',1.2],['golden',.9],['bolt',.8],['blooper',.6],['bomb',.6]],
 far:[['mush3',2],['star',2],['golden',1.4],['bullet',1.2],['bolt',1],['red',1],['blue',.7]],
 battle:[['green',3],['shell3',1.3],['banana',2],['red',2],['bomb',2],['mushroom',1],['star',.9],['blooper',.8],['banana3',.6]]};
const COUNT={banana3:3,shell3:3,mush3:3,golden:99};
const CPU_COLORS={mario:'#e8322b',luigi:'#2fbf3a',bowser:'#f0a020'},CPU_PALETTE=['#e8322b','#2fbf3a','#ffd21c','#9a5cff','#ff8a2a','#26d7c4','#f04a8a','#5a7cff'];
const GP_POINTS=[15,12,10,9,8,7,6,5];
const MODES={race:{vs:true,cpus:6,title:'GRAND PRIX · VS'},gp:{vs:false,cpus:7,title:'GRAND PRIX'},time:{vs:false,cpus:0,title:'TIME TRIALS'},duo:{vs:true,cpus:0,title:'1 V 1 RACE'},battle:{vs:true,cpus:0,title:'BALLOON BATTLE'}};
const THEME_COLORS={'rainbow-road':['#3a1a7a','#ff5ac8'],'moo-moo-meadows':['#2e7a2a','#9fdc5a'],'cheep-cheep-beach':['#1477b8','#f2dc9a'],'bowsers-castle':['#3a0c08','#ff6a1a']};
// Full-bleed: the race gets the whole screen; the players' chips and Pause/Exit float in a slim strip at the top,
// with a small full-screen toggle at the bottom centre. HUD_TOP keeps the in-game HUD clear of that strip.
const HUD_TOP=34;
function fullBleed(s){
 const shell=s.body.closest('.game-shell'),layer=shell?.parentElement;if(!shell)return;
 shell.classList.add('kt-shell');layer?.classList.add('kt-layer');const css=document.createElement('style');
 css.textContent=`#game-layer.kt-layer{padding:0;height:100dvh;max-height:none}
  .game-shell.kt-shell{position:relative;max-width:none;width:100%;height:100%;border:0;border-radius:0;grid-template-rows:minmax(0,1fr);overflow:hidden;background:#07041a}
  .kt-shell>.game-header{position:absolute;top:max(3px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:13;border:0;background:transparent;padding:0;min-height:0;box-shadow:none}
  .kt-shell>.game-header>:not(.game-actions){display:none}
  .kt-shell .game-actions{display:flex;gap:4px}
  .kt-shell .game-actions button{min-height:28px;min-width:0;padding:2px 9px;font-size:11px;line-height:1;border-radius:999px;background:#0c0828cc;color:#fff;border:1px solid #ffffff38;box-shadow:none}
  .kt-shell>#game-scorebar{position:absolute;top:max(3px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:12;width:min(560px,calc(100% - 12px));display:flex;justify-content:space-between;align-items:center;gap:6px;padding:0;margin:0;border:0;background:transparent;box-shadow:none;pointer-events:none;min-height:0}
  .kt-shell>#game-scorebar .game-mode{visibility:hidden;flex:0 0 132px;min-width:0}
  .kt-shell>#game-scorebar .game-scoreplayer{display:flex;align-items:center;gap:5px;padding:2px 8px 2px 2px;border-radius:999px;background:#0c0828aa;border:1px solid #ffffff26;color:#fff;font-size:11px;max-width:40%;min-height:0;box-shadow:none}
  .kt-shell>#game-scorebar .game-scoreplayer:nth-child(3){flex-direction:row-reverse;padding:2px 2px 2px 8px}
  .kt-shell>#game-scorebar .game-scoreplayer .portrait.tiny{width:24px;height:24px;border-width:1.5px}
  .kt-shell>#game-scorebar .game-scoreplayer b{font-size:13px}
  .kt-shell>.game-body{padding:0;display:flex;gap:0;overflow:hidden;min-height:0}
  .kt-shell .canvas-frame{border:0;border-radius:0;flex:1;min-height:0;width:100%;height:100%;background:#07041a}
  .kt-shell .game-canvas{display:block;border:0;border-radius:0;max-width:none;max-height:none;touch-action:none}
  .kt-shell #game-status,.kt-shell #game-hint,.kt-shell #game-controls{display:none}
  .kt-shell .pass-overlay{z-index:30}
  .kt-fs{position:absolute;left:50%;transform:translateX(-50%);bottom:max(5px,env(safe-area-inset-bottom));z-index:12;width:28px;height:28px;padding:0;margin:0;border:0;border-radius:8px;background:rgba(255,255,255,.16);color:#fff;opacity:.45;font:700 15px/28px Arial,sans-serif;cursor:pointer;touch-action:manipulation}
  .kt-fs:hover,.kt-fs:focus-visible{opacity:1}`;
 shell.appendChild(css);
 let fs=null;if(fullscreenSupported()){fs=document.createElement('button');fs.type='button';fs.className='kt-fs';fs.setAttribute('aria-label','Toggle full screen');fs.title='Full screen';fs.textContent=fullscreenLabel('icon');shell.appendChild(fs);
  s.on(fs,'pointerdown',e=>e.stopPropagation());s.on(fs,'click',e=>{e.preventDefault();e.stopPropagation();toggleFullscreen();});const sync=()=>{fs.textContent=fullscreenLabel('icon');};s.on(document,'fullscreenchange',sync);s.on(document,'webkitfullscreenchange',sync);}
 s.cleanup(()=>{css.remove();fs?.remove();shell.classList.remove('kt-shell');layer?.classList.remove('kt-layer');});
}
const ord=n=>n+(n===1?'st':n===2?'nd':n===3?'rd':'th');
const fmtTime=t=>`${Math.floor(t/60)}'${(t%60).toFixed(2).padStart(5,'0')}"`;
// CPU racers: any characters from the players' rosters (shared + Sean's + Amber's unlocks), shuffled; if the rosters
// are too small the rest come from the whole character list.
function pickCPUs(n,exclude,rand,profile){
 const ident=id=>{try{return characterIdentity(id);}catch{return id;}},taken=new Set(exclude.map(ident)),out=[];
 const take=list=>{const pool=[...new Set(list)].filter(id=>character(id)?.id===id&&!taken.has(ident(id)));
  while(out.length<n&&pool.length){const id=pool.splice(Math.floor(rand()*pool.length),1)[0];out.push(id);taken.add(ident(id));}};
 take([...(profile?.shared||[]),...Object.values(profile?.rosters||{}).flat()]);
 if(out.length<n)take(CHARACTERS.map(c=>c.id));return out;
}

async function kart(s){
 // online, Time Trials becomes 'duo': a 1-v-1 race, just the two of you on the track, item boxes on, no CPU racers
 const mode0=MODES[s.game.kartMode]?s.game.kartMode:'race',mode=s.online&&mode0==='time'?'duo':mode0,MD=MODES[mode];
 let gl0=null;{const probe=document.createElement('canvas');try{gl0=probe.getContext('webgl',GL_OPTS)||probe.getContext('experimental-webgl',GL_OPTS);}catch{}try{gl0?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}}
 const [cv,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=MD.vs;s.updateScores();fullBleed(s);
 if(!await settle(s))return;
 if(!gl0){x.fillStyle='#120a2e';x.fillRect(0,0,s.W,s.H);outlined(x,'MARIO KART NEEDS 3D GRAPHICS',s.W/2,s.H*.45,{size:Math.min(24,s.W*.05),fill:'#ffe23a',stroke:'#120a2e'});
  outlined(x,'This browser has WebGL turned off.',s.W/2,s.H*.55,{size:Math.min(16,s.W*.035),fill:'#fff',stroke:'#120a2e'});await s.wait(3500);s.finish([0,0],'Mario Kart needs 3D graphics (WebGL), which this browser has turned off.');return;}
 // one animation loop for the whole game; each screen (course select, race) installs its own handler
 let onFrame=null;s.frame(dt=>{if(s.alive&&onFrame)onFrame(Math.min(dt,.05));});
 // input shared by every race: keys + Mario Kart Tour touch (every finger belongs to the player whose screen it started on)
 const kb=arenaKeys(s),pads=[0,1].map(()=>({f:null,ox:0,latch:0,keyLatch:0,holdSince:-1}));
 let ctl={owner:()=>-1,keyOwner:i=>i,use:()=>{},lights:()=>0,tap:null,rad:()=>60};
 kb.onDown((i,k)=>{if(ctl.tap){ctl.key?.(k);return;}const p=ctl.keyOwner(i);if(k==='u')ctl.use(p,1);else if(k==='fire')ctl.use(p,0);if((k==='u'||k==='d'||k==='fire')&&pads[p].holdSince<0)pads[p].holdSince=ctl.lights();});
 kb.onUp((i,k)=>{const p=ctl.keyOwner(i);if(!kb.state[i].u&&!kb.state[i].d&&!kb.state[i].fire&&!pads[p].f)pads[p].holdSince=-1;});
 arenaTouch(s,{owner:p=>ctl.tap?0:ctl.owner(p),maxFingers:3,
  onDown:f=>{if(ctl.tap){ctl.tap(f.x,f.y);f.data.role='none';return;}const pd=pads[f.owner];if(pd.holdSince<0)pd.holdSince=ctl.lights();if(!pd.f){pd.f=f;pd.ox=f.x;f.data.role='steer';}else f.data.role='item';},
  onMove:f=>{const pd=pads[f.owner];if(f.data.role==='steer'){const r=ctl.rad();if(f.x-pd.ox>r)pd.ox=f.x-r;if(f.x-pd.ox<-r)pd.ox=f.x+r;
    // vertical flick with the steering thumb throws the item
    const now=performance.now();let q=null;for(const sm of f.samples)if(now-sm.t<=140){q=sm;break;}
    if(q&&!f.data.flicked){const dy=f.y-q.y,dx=f.x-q.x,dtm=Math.max(.016,(now-q.t)/1000);if(Math.abs(dy)>34&&Math.abs(dy)>Math.abs(dx)*1.4&&Math.abs(dy)/dtm>650){f.data.flicked=true;ctl.use(f.owner,dy<0?1:-1);}}
    if(f.data.flicked&&f.samples.length&&now-f.samples[f.samples.length-1].t>200)f.data.flicked=false;}},
  onUp:(f,cancelled)=>{if(f.data.role==='none')return;const pd=pads[f.owner];
   if(f.data.role==='steer'){if(pd.f===f){pd.f=null;pd.latch=0;}if(!cancelled&&!f.data.flicked){const dy=f.y-f.sy,dx=f.x-f.sx;if(f.held<260&&f.moved<14)ctl.use(f.owner,0);else if(Math.abs(dy)>40&&Math.abs(dy)>Math.abs(dx)*1.4)ctl.use(f.owner,dy<0?1:-1);}}
   else if(!cancelled){const dy=f.y-f.sy;ctl.use(f.owner,f.moved<18?0:dy<-24?1:dy>24?-1:0);}
   if(!pd.f&&!kb.state[f.owner].u&&!kb.state[f.owner].d)pd.holdSince=-1;}});
 const auto=[false,false];
 s.debug={mode,auto,pick:null};
 // online (s.online, Grand Prix VS + Balloon Battle): each phone drives its own kart on the full screen and streams it
 // (NET = the running race's pack/unpack/event, see runRace); player 1's phone picks the course and runs the CPU karts.
 const net=s.online&&MD.vs?s.online:null,me=net?net.me:-1,them=1-me;let NET=null,setupMsg=null,setupWait=null,choosing=false,botPicked=false;
 const nf=net?netField(s,{hz:20,pack:()=>NET?NET.pack():{},unpack:(i,d)=>NET?.unpack(d),onEvent:e=>{if(e?.setup){setupMsg=e.setup;setupWait?.();}else NET?.event(e);}}):null;
 // online test bot: the autopilot drives this phone's kart (and picks a course on the picking phone)
 if(net)s.debug.bot=()=>{if(choosing&&!botPicked&&s.debug.pick){botPicked=true;const c=T.COURSES[Math.floor(Math.random()*T.COURSES.length)].id;setTimeout(()=>s.debug.pick?.(c),800);return 'pick';}
  if(!auto[me]){auto[me]=true;return 'drive';}return '';};Object.defineProperty(s.debug,'phase',{get:()=>'select',configurable:true});
 s.hint({race:'GRAND PRIX VS: both of you at once, side by side (P1 left, P2 right), against six CPU racers. Pick a course, then three laps; the better-placed player wins.',
  gp:'GRAND PRIX PASS & PLAY: pick a course. P1 races seven CPU racers on the full screen, then P2 races the same grid. The better finishing place wins (same place: faster time).',
  time:'TIME TRIALS PASS & PLAY: pick a course. P1 runs three laps alone with three mushrooms, then P2 runs the same course against P1’s ghost. Fastest total time wins.',
  duo:'1 V 1 RACE: just the two of you on the track, item boxes on, no CPU racers. Player 1 picks the course; first over the line after three laps wins.',
  battle:'BALLOON BATTLE VS: side by side (P1 left, P2 right) on a floating rainbow ring. Three balloons each; shells, bananas and bob-ombs pop them, a boosting bump steals one, falling off costs one.'}[mode]+
  ' Controls on your screen, like Mario Kart Tour: the kart drives itself; drag left/right to steer; push all the way to drift (blue, orange, purple sparks) and let go for a mini-turbo. Tap to use your item, swipe up to throw it ahead, swipe down to drop it behind. Keys: P1 A/D steer, S drift, W/Space item; P2 arrows, Down drift, Up/Enter item.');

 // ---------------------------------------------------------------- course select
 function chooseCourse(){
  const list=T.COURSES.map(C=>{const c=C.build();let a=Infinity,b=-Infinity,c0=Infinity,d0=-Infinity;for(let i=0;i<c.N;i++){a=Math.min(a,c.px[i]);b=Math.max(b,c.px[i]);c0=Math.min(c0,c.pz[i]);d0=Math.max(d0,c.pz[i]);}
   const sc=1/Math.max(b-a,d0-c0),pts=[];for(let i=0;i<c.N;i+=4)pts.push([(c.px[i]-a)*sc+(1-(b-a)*sc)/2,(c.pz[i]-c0)*sc+(1-(d0-c0)*sc)/2]);return {id:C.id,name:C.name,course:c,pts};});
  choosing=true;
  return new Promise(resolve=>{let t=0,hi=0,done=false,cards=[];
   const choose=k=>{if(done||!list[k])return;done=true;choosing=false;ctl.tap=null;ctl.key=null;snd(880,.08,{type:'square',vol:.04});snd(1320,.14,{type:'square',vol:.04,delay:.06});resolve(list[k].course);};
   s.debug.pick=id=>choose(Math.max(0,list.findIndex(l=>l.id===id)));
   ctl.tap=(px,py)=>{for(const cd of cards)if(px>=cd.x&&px<=cd.x+cd.w&&py>=cd.y&&py<=cd.y+cd.h)choose(cd.k);};
   ctl.key=k=>{if(k==='l'||k==='u')hi=(hi+list.length-1)%list.length;else if(k==='r'||k==='d')hi=(hi+1)%list.length;else if(k==='fire')choose(hi);};
   onFrame=dt=>{t+=dt;if(t>30)choose(hi);const W=s.W,H=s.H;
    const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a0d3e');g.addColorStop(1,'#07041a');x.fillStyle=g;x.fillRect(0,0,W,H);
    const ts=Math.min(30,W*.06,H*.06);x.save();x.translate(0,HUD_TOP*.8);outlined(x,MD.title,W/2,ts*1.1,{size:ts*.6,fill:'#c9d4ff',stroke:'#120a2e'});outlined(x,'CHOOSE A COURSE',W/2,ts*2.1,{size:ts,fill:'#ffe23a',stroke:'#120a2e'});
    const cols=W>H*1.25?4:2,rows=Math.ceil(list.length/cols),top=ts*3.1,gap=Math.min(14,W*.025),cw=(W-gap*(cols+1))/cols,ch=Math.min((H-top-gap*(rows+1)-ts)/rows,cw*1.05);
    const top2=top+HUD_TOP*.8,ch2=Math.min((H-top2-gap*(rows+1)-ts)/rows,cw*1.05);x.restore();
    cards=list.map((l,k)=>{const cx=gap+(k%cols)*(cw+gap),cy=top2+Math.floor(k/cols)*(ch2+gap);return {k,x:cx,y:cy,w:cw,h:ch2};});
    for(const cd of cards){const l=list[cd.k],[c1,c2]=THEME_COLORS[l.id]||['#333','#999'],sel=cd.k===hi;
     x.save();const gg=x.createLinearGradient(0,cd.y,0,cd.y+cd.h);gg.addColorStop(0,c1);gg.addColorStop(1,'#0b0620');x.fillStyle=gg;rr(x,cd.x,cd.y,cd.w,cd.h,12);x.fill();
     x.lineWidth=sel?4:2;x.strokeStyle=sel?`hsl(${t*200%360},90%,65%)`:'rgba(255,255,255,.5)';x.stroke();
     const m=Math.min(cd.w,cd.h*.72)*.8,mx=cd.x+(cd.w-m)/2,my=cd.y+cd.h*.08;x.strokeStyle=c2;x.lineWidth=Math.max(3,m*.045);x.lineJoin='round';x.beginPath();l.pts.forEach(([a,b],j)=>{j?x.lineTo(mx+a*m,my+b*m):x.moveTo(mx+a*m,my+b*m);});x.closePath();x.stroke();
     x.fillStyle='#fff';const p0=l.pts[0];x.beginPath();x.arc(mx+p0[0]*m,my+p0[1]*m,Math.max(3,m*.035),0,7);x.fill();
     outlined(x,l.name.toUpperCase(),cd.x+cd.w/2,cd.y+cd.h*.9,{size:Math.min(cd.w*.085,cd.h*.1,20),fill:'#fff',stroke:'#120a2e'});x.restore();}
    outlined(x,`Tap a course · auto-pick in ${Math.max(0,Math.ceil(30-t))}`,W/2,H-ts*.6,{size:ts*.45,fill:'rgba(255,255,255,.75)',stroke:'#120a2e'});};
  });
 }

 // online: the other phone (player 1's) picks the course and sends it with the CPU racers ({setup})
 function waitCourse(){
  return new Promise(resolve=>{let t=0;const done=()=>{if(!setupMsg)return;setupWait=null;onFrame=null;resolve(T.courseById(setupMsg.c));};setupWait=done;
   onFrame=dt=>{t+=dt;const W=s.W,H=s.H,g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a0d3e');g.addColorStop(1,'#07041a');x.fillStyle=g;x.fillRect(0,0,W,H);
    const ts=Math.min(30,W*.06,H*.06);outlined(x,MD.title,W/2,H*.4,{size:ts*.6,fill:'#c9d4ff',stroke:'#120a2e'});
    outlined(x,`${s.players[them].name.toUpperCase()} IS CHOOSING A COURSE${'.'.repeat(1+Math.floor(t*2)%3)}`,W/2,H*.5,{size:Math.min(ts*.75,W*.045),fill:'#ffe23a',stroke:'#120a2e'});};
   done();});
 }

 // ---------------------------------------------------------------- one race / battle
 // opts: course, humans (player indices), cpus, seed, ghost (recording to race), record (record a ghost)
 // rival: solo vs CPU — the CPU player's character drives the first CPU kart and its result is returned.
 function runRace({course,humans,cpus,seed,ghost=null,record=false,rivalCpu=false,cpuIds:cpuIds0=null}){
  return new Promise(resolve=>{
  const battle=mode==='battle',timeTrial=mode==='time',vs=humans.length===2;
  const rand0=seededRandom(seed),cpuIds=cpuIds0?cpuIds0:rivalCpu?[s.players[1].character,...pickCPUs(cpus-1,s.players.map(p=>p.character),rand0,store.profile)]:pickCPUs(cpus,s.players.map(p=>p.character),rand0,store.profile);
  // solo: the Easy / Normal / Hard pick sets the CPU karts' top speed (the 2-player game keeps .955-.995)
  const cpuBase=s.solo?.925+.07*cpuSkill(s):.955;
  const colors=[...humans.map(p=>PCOL[p]),...cpuIds.map((id,j)=>CPU_COLORS[id]||CPU_PALETTE[j%CPU_PALETTE.length])];
  const ghostIdx=ghost?colors.length:-1;if(ghost)colors.push(PCOL[ghost.player]);
  const glc=document.createElement('canvas');let R;
  try{R=createRenderer(glc,course,{colors,battle});}catch(e){console.warn('kart: 3D renderer failed',e);resolve(null);return;}
  const cleanups=[()=>{try{R.gl.getExtension('WEBGL_lose_context')?.loseContext();}catch{}}];let ended=false;
  const endRace=result=>{if(ended)return;ended=true;onFrame=null;NET=null;for(const fn of cleanups.splice(0))try{fn();}catch{}resolve(result);};
  s.cleanup(()=>{if(!ended){ended=true;for(const fn of cleanups.splice(0))try{fn();}catch{}}});
  const rand=seededRandom(seed*7+3),itemRand=seededRandom(seed*13+5);
  // world placement of boxes and coins (time trials: an empty track)
  const place=(o,h)=>{const f=T.frame(course,o.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});o.P=[f.P[0]+f.R[0]*o.d+f.U[0]*h,f.P[1]+f.R[1]*o.d+f.U[1]*h,f.P[2]+f.R[2]*o.d+f.U[2]*h];o.T=f.T.slice();o.U=f.U.slice();o.R=f.R.slice();o.t=0;o.pop=0;return o;};
  const boxes=timeTrial?[]:course.boxes.map(b=>place({...b},13)),coins=timeTrial?[]:course.coins.map(cn=>place({...cn},8));
  // minimap (top-down XZ)
  {let a=Infinity,b=-Infinity,c0=Infinity,d0=-Infinity;for(let i=0;i<course.N;i++){a=Math.min(a,course.px[i]);b=Math.max(b,course.px[i]);c0=Math.min(c0,course.pz[i]);d0=Math.max(d0,course.pz[i]);}
   const sc=1/Math.max(b-a,d0-c0),ox=(1-(b-a)*sc)/2,oz=(1-(d0-c0)*sc)/2;course.mini=[];for(let i=0;i<course.N;i+=6)course.mini.push([ox+(course.px[i]-a)*sc,oz+(course.pz[i]-c0)*sc]);
   course.miniAt=k=>[ox+(k.P2[0]-a)*sc,oz+(k.P2[2]-c0)*sc];}
  const K=colors.slice(0,ghost?-1:colors.length).map((_,i)=>Object.assign(Ph.makeKart(course,i),{human:i<humans.length,player:i<humans.length?humans[i]:-1,cpu:i>=humans.length?cpuIds[i-humans.length]:null,lane:i>=humans.length?(rand0()-.5)*50:0,topMul:1,baseMul:i>=humans.length?cpuBase+rand0()*.04:1,items:[],rolling:false,rollT:0,frenzy:0,frenzyItem:null,frenzyCD:0,goldenT:0,balloons:3,out:false,finished:false,finishT:0,place:0,best:0,msgs:[],wrongT:0,rel:0,lapT:[]}));
  const H=K.filter(k=>k.human),kartOf=p=>H.find(k=>k.player===p);
  // online: this phone owns (drives, judges hits on) its own kart, and player 1's phone also the CPU karts; the other
  // karts are remote, shown from the owning phone's snapshots. VK = the karts that get a view on this phone.
  const on=!!net&&vs,owns=k=>!on||(k.human?k.player===me:me===0),mine=k=>k.human&&(!on||k.player===me);
  for(const k of K)k.remote=!owns(k);
  const VK=on?[kartOf(me)]:H;
  if(timeTrial){const k=K[0];k.s=T.wrapS(course,course.startS-34);k.d=0;k.prevS=k.s;k.safeS=k.s;Ph.pose(course,k);k.items=[{id:'mush3',n:3}];}
  const shells=[],bananas=[],bombs=[],parts=[];
  let phase='intro',introT=0,lights=0,clock=0,endT=0,winner=-1,endText='',simT=0,hintT=7;
  const rec=record?[]:null;let ghostPtr=0;
  // ---------------------------------------------------------------- sound
  let sfx={box:()=>jingle([880,1175,1568],{step:.04,type:'square',vol:.03}),item:()=>jingle([1319,1568],{step:.05,type:'square',vol:.03}),coin:()=>{snd(988,.05,{type:'square',vol:.03});snd(1319,.12,{type:'square',vol:.03,delay:.05});},
   boost:()=>{noise(.35,{vol:.06,freq:900});snd(180,.4,{type:'sawtooth',vol:.035,to:720});},spin:()=>{snd(620,.45,{type:'square',vol:.035,to:110});noise(.25,{vol:.06,freq:2200});},
   shell:()=>snd(320,.16,{type:'square',vol:.03,to:640}),fall:()=>snd(820,.8,{type:'triangle',vol:.04,to:110}),pop:()=>{noise(.12,{vol:.08,freq:3000});snd(1200,.08,{type:'square',vol:.03,to:300});},
   lap:()=>jingle([659,784,1047],{step:.08,type:'square',vol:.035}),final:()=>jingle([784,988,1175,1568],{step:.09,type:'square',vol:.04}),star:()=>jingle([1047,1319,1568,2093,1568,2093],{step:.06,type:'square',vol:.03}),
   light:hi=>snd(hi?1047:523,hi?.55:.28,{type:'square',vol:.045}),hop:()=>snd(300,.08,{type:'square',vol:.025,to:520}),spark:lv=>snd([0,880,1175,1568][lv],.1,{type:'triangle',vol:.03}),
   boom:()=>{noise(.6,{vol:.11,freq:400,q:.5});snd(90,.5,{type:'sawtooth',vol:.05,to:40});},wall:()=>noise(.08,{vol:.05,freq:700}),trick:()=>jingle([1175,1568],{step:.05,type:'square',vol:.03}),
   land:()=>noise(.1,{vol:.05,freq:300}),glide:()=>noise(.5,{vol:.04,freq:1500,q:.4}),zap:()=>{noise(.5,{vol:.08,freq:500});snd(1600,.4,{type:'sawtooth',vol:.03,to:200});},ink:()=>noise(.4,{vol:.06,freq:250,q:.4})};
  const SILENT=new Proxy({},{get:()=>()=>{}});
  // engine hum per player kart
  const engines=[];{const ac=store.profile?.settings?.sound?audioContext():null;if(ac)try{for(const k of H.filter(mine)){const o=ac.createOscillator(),o2=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=600;g.gain.value=0;
    o.connect(f);o2.connect(f);f.connect(g);g.connect(ac.destination);o.start();o2.start();engines.push({k,o,o2,f,g,ac});}}catch{}}
  let song=null;try{song=store.profile?.settings?.music?createKartMusic(audioContext(),{transpose:battle?3:{'moo-moo-meadows':-2,'cheep-cheep-beach':2,'bowsers-castle':-5}[course.id]||0}):null;}catch{}
  cleanups.push(()=>song?.stop());
  let lastFrame=0;const mute=()=>{for(const e of engines)try{e.g.gain.setTargetAtTime(0,e.ac.currentTime,.03);}catch{}};
  const watchdog=setInterval(()=>{if(s.paused||document.hidden||performance.now()-lastFrame>250)mute();},200);cleanups.push(()=>clearInterval(watchdog));s.resetOnPause?.(mute);
  cleanups.push(()=>{for(const e of engines)try{e.g.gain.cancelScheduledValues(0);e.g.gain.value=0;e.o.stop();e.o2.stop();e.g.disconnect();}catch{}});
  const updateEngines=()=>{for(const e of engines){const k=e.k,t=e.ac.currentTime,on=!s.paused&&s.alive&&phase!=='intro'&&!k.out&&k.lakitu<=0;
   const f=55+k.v*.24+(k.boostT>0?40:0)+(k.drift?8:0);e.o.frequency.setTargetAtTime(f,t,.05);e.o2.frequency.setTargetAtTime(f*.502,t,.05);e.f.frequency.setTargetAtTime(400+k.v*2.2,t,.08);e.g.gain.setTargetAtTime(on?.012+k.v/Ph.BOOST*.014:0,t,.08);}};
  // ---------------------------------------------------------------- messages, particles
  const msg=(k,text,color='#fff',size=22,life=1.1)=>{k.msgs=k.msgs.filter(m=>m.text!==text);k.msgs.push({text,color,size,life,t:0});if(k.msgs.length>3)k.msgs.shift();};
  const spawn=(P,o)=>{if(parts.length>700)return;parts.push(Object.assign({P:P.slice(),V:[0,0,0],life:.4,max:.4,size:4,grow:0,tile:TILE.spark,col:[1,1,1,1],add:true,fade:true,g:0,drag:2},o,{max:o.life||.4}));};
  const burst=(P,n,o)=>{for(let j=0;j<n;j++){const a=rand()*Math.PI*2,b=rand()*Math.PI-Math.PI/2,sp=(o.speed||80)*(.4+rand()*.8);spawn(P,{...o,V:[Math.cos(a)*Math.cos(b)*sp,Math.sin(b)*sp+(o.up||0),Math.sin(a)*Math.cos(b)*sp],life:(o.life||.5)*(.6+rand()*.7)});}};
  const local=(k,p)=>{const M=k._M;if(!M)return k.P2.slice();return [M[0]*p[0]+M[4]*p[1]+M[8]*p[2]+M[12],M[1]*p[0]+M[5]*p[1]+M[9]*p[2]+M[13],M[2]*p[0]+M[6]*p[1]+M[10]*p[2]+M[14]];};
  // ---------------------------------------------------------------- items
  let order=K.slice(),finishCount=0;
  const sortOrder=()=>{order=K.slice().sort((a,b)=>a.finished&&b.finished?(a.finishT-b.finishT)||(a.place-b.place):a.finished?-1:b.finished?1:b.prog-a.prog);};
  const rankOf=k=>battle?1:order.indexOf(k)+1;
  if(!battle){for(const k of K){k.rel=T.wrapS(course,k.s-course.startS);k.prog=k.rel/course.L-1;}sortOrder();}
  const aheadOf=k=>{if(battle)return K[1-k.i];let best=null,bd=Infinity;for(const o of K){if(o===k||o.finished)continue;const d=(o.prog-k.prog)*course.L;if(d>0&&d<bd){bd=d;best=o;}}return bd<1700?best:null;};
  const pick=list=>{let tot=0;for(const [,w] of list)tot+=w;let r=itemRand()*tot;for(const [id,w] of list){r-=w;if(r<=0)return id;}return list[0][0];};
  function rollItem(k){
   let pool=POOLS.battle;if(!battle){const r=rankOf(k),gap=order[0].prog-k.prog;pool=r===1?POOLS.first:r<=3&&gap<.22?POOLS.second:POOLS.far;}
   const id=pick(pool);
   if(itemRand()<(!battle&&rankOf(k)>1?.045:.02)){k.frenzy=7;k.frenzyItem=['banana','green','mushroom','red','bomb'][Math.floor(itemRand()*5)];k.inv=Math.max(k.inv,7);k.items=[];msg(k,'FRENZY!','#ff7af2',28,1.6);if(k.human)sfx.star();return;}
   if(id==='blue'&&rankOf(k)===1)return rollItem(k);
   k.items.push({id,n:COUNT[id]||1});if(k.human)sfx.item();
  }
  const rival=k=>K[1-k.i];
  const hitKart=(k,type,why)=>{if(!owns(k))return false;const ok=Ph.hit(k,type,ctx);if(ok){if(battle)loseBalloon(k);if(k.human)s.react?.(k.player,'sad');}return ok;};
  function loseBalloon(k){if(!owns(k)||k.balloons<=0)return;k.balloons--;if(on){blog.push([r3(clock),k.balloons]);if(k.balloons<=0)k.outT=clock;}sfx.pop();burst(local(k,[-11,22,0]),14,{tile:TILE.glow,col:[1,.4,.5,1],speed:120,size:4,life:.5});if(k.balloons<=0){k.out=true;msg(k,'OUT!','#ff8aa8',30,2);}if(on)nf.push();}
  function fire(k,id,dir){
   const fwd=dir!==-1;const sfx0=sfx;if(!k.human||!owns(k))sfx=SILENT;const n0=on?[shells.length,bananas.length,bombs.length]:null;
   try{fireItem(k,id,dir,fwd);}finally{sfx=sfx0;}if(n0)netFire(k,id,dir,n0);}
  // online: an item fired by a kart this phone owns goes to the other phone with the kart's place and an id per projectile
  // ({it}); that phone fires the same item from there and flies it on by the time since. Each phone judges only the karts it
  // owns: a projectile one of them takes is removed on the other phone too ({rm}), a bob-omb one of them sets off blows up there ({bm}).
  const PROJ=[shells,bananas,bombs];let pidN=0;
  function netFire(k,id,dir,n0){const made=[];PROJ.forEach((list,j)=>{for(const o of list.slice(n0[j])){o.id=me+'.'+(++pidN);made.push([j,o.id,o.target??-1]);}});
   nf.event({it:[k.i,id,dir,r1(k.s),r1(k.d),r3(k.psi),r1(k.v),r3(netNow()),made]});}
  function remoteFire([ki,id,dir,s0,d0,psi,v,t,made]){const k=K[ki];if(!k||owns(k)||!Array.isArray(made))return;
   const n0=PROJ.map(l=>l.length),pk={...k,s:s0,d:d0,psi,v},sfx0=sfx;sfx=SILENT;try{fireItem(pk,id,dir,dir!==-1);}finally{sfx=sfx0;}
   PROJ.forEach((list,j)=>{const want=made.filter(m=>m[0]===j);if(list.length>n0[j]+want.length)list.splice(n0[j]+want.length);
    want.forEach(([,pid,tg],q)=>{const o=list[n0[j]+q];if(!o)return;o.id=pid;if(tg>=0)o.target=tg;catchUp(j,o,clamp(netNow()-t,0,.5));});});}
  function catchUp(j,o,age){for(let a=0;a<age-1e-6;a+=1/60){const h=Math.min(1/60,age-a);o.t+=h;
    if(j===0){if(o.kind==='blue')break;if(moveShell(o,h)){o.dead=true;break;}}else if(o.air){if(flyItem(o,h)){o.dead=true;break;}}else{if(j===2)o.fuse-=age-a;break;}}
   if(o.dead&&j>0)PROJ[j].splice(PROJ[j].indexOf(o),1);}
  const netRm=o=>{if(on&&o.id)nf.event({rm:o.id});};
  function fireItem(k,id,dir,fwd){
   if(id==='mushroom'||id==='mush3'||id==='golden'){Ph.setBoost(k,1.15);k.v+=60;sfx.boost();msg(k,'BOOST!','#ffb02e',18,.6);if(id==='golden'&&!k.goldenT)k.goldenT=6;}
   else if(id==='star'){k.star=7.5;sfx.star();msg(k,'STAR POWER!','#ffe23a',22,1.2);}
   else if(id==='banana'||id==='banana3'){if(dir===1)bananas.push({s:k.s+12,d:k.d,h:8,vs:k.v+240,vh:150,air:true,owner:k.i,t:0});else bananas.push({s:T.wrapS(course,k.s-20),d:k.d,h:0,air:false,owner:k.i,t:0});snd(420,.1,{type:'square',vol:.03});}
   else if(id==='green'||id==='shell3'){shells.push({kind:'green',s:T.wrapS(course,k.s+(fwd?16:-18)),d:k.d,psi:fwd?k.psi:Ph.wrapA(k.psi+Math.PI),v:600,h:4,owner:k.i,t:0,bounce:0});sfx.shell();}
   else if(id==='red'){shells.push({kind:fwd?'red':'green',s:T.wrapS(course,k.s+(fwd?16:-18)),d:k.d,psi:fwd?k.psi*.3:Ph.wrapA(k.psi+Math.PI),v:fwd?560:600,h:4,owner:k.i,t:0,bounce:0,target:aheadOf(k)?.i??-1});sfx.shell();}
   else if(id==='blue'){const tg=battle?rival(k):order[0];if(tg===k){Ph.setBoost(k,1);return;}shells.push({kind:'blue',s:T.wrapS(course,k.s+10),d:k.d,psi:0,v:820,h:46,owner:k.i,t:0,target:tg.i});sfx.shell();msg(tg,'BLUE SHELL!','#6aa0ff',22,1.6);}
   else if(id==='bomb'){bombs.push(fwd?{s:k.s+14,d:k.d,h:10,vs:k.v+200,vh:170,air:true,owner:k.i,t:0,fuse:2.4}:{s:T.wrapS(course,k.s-22),d:k.d,h:0,air:false,owner:k.i,t:0,fuse:2.4});snd(240,.12,{type:'square',vol:.03});}
   else if(id==='bolt'){sfx.zap();for(const o of K)if(o!==k&&owns(o)&&o.star<=0&&o.bullet<=0&&!o.out){o.shrink=4.5;o.items=[];o.rolling=false;hitKart(o,'spin','bolt');msg(o,'ZAPPED!','#ffe23a',22,1.2);}}
   else if(id==='blooper'){sfx.ink();for(const o of K)if(o!==k&&owns(o)&&o.bullet<=0&&(battle||o.prog>=k.prog-.02)){o.ink=4.6;msg(o,'BLOOPER!','#c9a0ff',20,1);}}
   else if(id==='coin'){k.coins=Math.min(10,k.coins+2);sfx.coin();}
   else if(id==='bullet'){k.bullet=4.5;k.inv=Math.max(k.inv,4.5);sfx.boost();msg(k,'BULLET BILL!','#fff',22,1.2);}
  }
  const lastUse=[];
  function useItem(k,dir){
   if(!k||phase!=='play'||k.out||k.lakitu>0||k.falling>0||k.finished)return;
   if(k.frenzy>0){if(k.frenzyCD<=0){fire(k,k.frenzyItem,dir);k.frenzyCD=.3;}return;}
   const it=k.items[0];if(!it)return;if(k.human)lastUse[k.player]={id:it.id,dir};
   if(it.id==='golden'){fire(k,'golden',dir);return;}
   fire(k,it.id,dir);it.n--;if(it.n<=0)k.items.shift();
  }
  // ---------------------------------------------------------------- views and input routing
  const layout=()=>{const W=s.W,Hh=s.H;if(!vs||on)return [{x:0,y:0,w:W,h:Hh}];const half=Math.floor(W/2);return [{x:0,y:0,w:half-1,h:Hh},{x:half+1,y:0,w:W-half-1,h:Hh}];};
  ctl={owner:p=>on?me:vs?(p.x<s.W/2?0:1):humans[0],keyOwner:i=>on?me:vs?i:humans[0],use:(p,dir)=>useItem(kartOf(p),dir),lights:()=>lights,tap:null,rad:()=>clamp((vs&&!on?s.W/2:s.W)*.17,42,90)};
  for(const pd of pads){pd.f=null;pd.latch=0;pd.keyLatch=0;pd.holdSince=-1;}
  function readInput(k){
   const p=k.player,pd=pads[p],ks=vs&&!on?kb.state[p]:{l:kb.state[0].l||kb.state[1].l,r:kb.state[0].r||kb.state[1].r,d:kb.state[0].d||kb.state[1].d};
   if(auto[p]){if(battle){const o=rival(k),ds=T.sdiff(course,k.s,o.s),half=course.half[T.idx(course,k.s)];let want=Math.atan2(o.d-k.d,ds);if(Math.abs(k.d)>half*.62)want=Math.atan2(-k.d,80*Math.sign(Math.cos(k.psi))||80);
     return {steer:clamp(Ph.wrapA(want-k.psi)*2.5,-1,1),drift:0};}
    return Ph.autoInput(course,k,{target:autoTarget(k)});}
   let steer=(ks.r?1:0)-(ks.l?1:0);
   if(pd.f){const r=ctl.rad();let v=clamp((pd.f.x-pd.ox)/r,-1,1);v=Math.abs(v)<.08?0:Math.sign(v)*(Math.abs(v)-.08)/.92;steer=v;
    if(!pd.latch&&Math.abs(v)>=.85)pd.latch=Math.sign(v);else if(pd.latch&&v*pd.latch<-.55)pd.latch=0;}
   else pd.latch=0;
   if(ks.d){if(!pd.keyLatch&&steer)pd.keyLatch=Math.sign(steer);}else pd.keyLatch=0;
   return {steer,drift:pd.latch||pd.keyLatch||0};
  }
  // vs CPU balloon battle: the ring is a loop, so the CPU drives whichever way round reaches the human sooner (switching
  // only past the halfway mark, U-turning toward the rail, never the void) and holds the human's lane, or a box's lane when
  // it is empty-handed. Shells go out when the human is ahead and lined up, bananas/bombs drop when they follow close
  // behind, a mushroom rams in close to steal a balloon, and while the human has a star it keeps to the far side.
  // Easy aims loosely and uses items late.
  function battleBrain(k,dt){
   k.topMul=k.baseMul;const o=rival(k),sk=cpuSkill(s),L=course.L,i=T.idx(course,k.s),half=course.half[i],dd=o.d-k.d;
   const lim=side=>half*(course.rail[i]&(side>0?2:1)?.9:.6),railSide=course.rail[i]&1?-1:course.rail[i]&2?1:0;
   k.aimT=(k.aimT||0)-dt;if(k.aimT<=0){k.aimT=.3+(1-sk)*.6;k.aimErr=(Math.random()-.5)*(1-sk)*90;}
   const flee=(o.star>0||o.bullet>0)&&k.star<=0,fwd0=((o.s-k.s)%L+L)%L;
   k.huntDir=fwd0<L*.42?1:fwd0>L*.58?-1:k.huntDir||1;const dir=flee?-k.huntDir:k.huntDir;
   const fw=dir>0?fwd0:L-fwd0,back=L-fw;   // human's distance ahead / behind in the travel direction
   let target=flee?-Math.sign(o.d||1)*half:o.d+(k.aimErr||0);
   if(!flee&&!k.items.length&&k.frenzy<=0&&fw>350)for(const b of boxes){const bs=dir*T.sdiff(course,k.s,b.s);if(b.t<=0&&bs>40&&bs<260){target=b.d;break;}}
   const it=k.frenzy>0?k.frenzyItem:k.items[0]?.id;
   if(it&&phase==='play'&&Math.random()<dt*(.8+sk*2.2)){const lined=Math.abs(dd)<26+30*(1-sk),behind=back<380&&Math.abs(dd)<70,drop=['banana','banana3','bomb'].includes(it);
    const fire=['green','shell3'].includes(it)?fw>40&&fw<520&&lined:['red','blue'].includes(it)?fw>40&&fw<1000:it==='bomb'?fw>60&&fw<300&&lined
     :['mushroom','mush3','golden'].includes(it)?flee||fw>20&&fw<240&&Math.abs(dd)<40:['star','bullet'].includes(it)?fw<600:!drop;
    if(fire)useItem(k,1);else if(drop&&(behind||(k.holdT||0)>9))useItem(k,-1);else if(['green','shell3'].includes(it)&&behind&&sk>.5)useItem(k,-1);}
   k.holdT=it?(k.holdT||0)+dt:0;
   // facing the wrong way (it starts that way, or the hunt flipped): U-turn toward the railed side
   if(Math.cos(k.psi)*dir<-.2)return {steer:clamp(Ph.wrapA((railSide||-1)*Math.PI/2-k.psi)*2.5,-1,1),drift:0};
   // lane keeper (autoInput stops at 65% of the road and sits ~45 off its lane on the ring): a quarter of the curve as
   // feed-forward holds the target lane to within ~20 either way round, so it can line up with a human on the rail
   const tg=clamp(target,-lim(-1),lim(1)),look=70+k.v*.45;let turn=0;for(let a=0;a<look;a+=12)turn+=T.frame(course,k.s+a*dir,FR).kg*12;
   const want=dir>0?turn*.25+Math.atan2(tg-k.d,look):Math.PI-turn*.25-Math.atan2(tg-k.d,look);
   return {steer:clamp(Ph.wrapA(want-k.psi)*3.2,-1,1),drift:0};
  }
  const autoTarget=k=>{for(const b of boxes){const ds=T.sdiff(course,k.s,b.s);if(b.t<=0&&ds>40&&ds<260&&k.items.length<2)return b.d;}return 0;};
  // ---------------------------------------------------------------- physics events → sound / particles / banners
  const ctx={ev:(k,name,data)=>{
   const P=k.P2;if(!k.human){if(name==='lakitu'&&battle)loseBalloon(k);if(name==='hit')burst(P,6,{tile:TILE.star,add:false,col:[1,1,1,1],speed:90,up:40,size:5,life:.6,g:-80});return;}
   if(name==='miniturbo'){sfx.boost();snd([0,660,880,1175][data],.25,{type:'triangle',vol:.035,to:[0,1320,1760,2350][data]});shake(k,data*1.4);burst(local(k,[-14,5,0]),6+data*6,{tile:TILE.spark,col:[[1,1,1,1],[.4,.75,1,1],[1,.62,.15,1],[.92,.4,1,1]][data],speed:90+data*40,size:3+data,life:.35});msg(k,data===3?'ULTRA MINI-TURBO!':data===2?'SUPER MINI-TURBO!':'MINI-TURBO!',['','#5ab8ff','#ffa02e','#e46aff'][data],16,.8);}
   else if(name==='spark')sfx.spark(data);
   else if(name==='hop')sfx.hop();
   else if(name==='pad'){sfx.boost();}
   else if(name==='trick'){sfx.trick();msg(k,['NICE!','GREAT!','COOL!'][Math.floor(rand()*3)],'#7affb0',20,.8);burst(P,12,{tile:TILE.spark,col:[1,1,.6,1],speed:110,size:4,life:.45});}
   else if(name==='ramp'||name==='glide'){if(name==='glide')sfx.glide();else snd(500,.15,{type:'square',vol:.03,to:900});}
   else if(name==='land'){if(data>.3){sfx.land();shake(k,Math.min(6,data*5));burst(P,8,{tile:TILE.smoke,add:false,col:[1,1,1,.55],speed:50,size:6,grow:8,life:.5});}}
   else if(name==='wall'){sfx.wall();burst(local(k,[2,4,k.d>0?9:-9]),8,{tile:TILE.spark,col:[1,.85,.4,1],speed:140,size:3,life:.3});}
   else if(name==='hit'){sfx.spin();shake(k,data==='tumble'?7:3);if(data==='tumble')sfx.boom();burst(P,10,{tile:TILE.star,add:false,col:[1,1,1,1],speed:90,up:40,size:5,life:.7,g:-80});}
   else if(name==='fall'){sfx.fall();if(course.theme==='beach')burst(P,14,{tile:TILE.smoke,add:false,col:[.85,.95,1,.8],speed:120,up:80,size:6,grow:10,life:.7,g:-200});}
   else if(name==='lakitu'){if(battle)loseBalloon(k);cams[k.i].snap=true;}
  }};
  const shake=(k,a)=>{if(cams[k.i]&&!store.profile?.settings?.reducedMotion)cams[k.i].shake=Math.max(cams[k.i].shake||0,a);};
  // ---------------------------------------------------------------- projectiles
  const dist2=(a,b)=>{const ds=T.sdiff(course,a.s,b.s),dd=b.d-a.d;return ds*ds+dd*dd;};
  const kartHittable=k=>!k.out&&k.lakitu<=0&&k.falling<=0;
  function blockFromBehind(k,src){const it=k.items[0];if(!it)return false;if(!['banana','banana3','green','shell3','red','bomb'].includes(it.id))return false;
   const ds=T.sdiff(course,k.s,src.s);const behind=ds*Math.cos(k.psi)<0;if(!behind&&it.id!=='shell3')return false;it.n--;if(it.n<=0)k.items.shift();sfx.pop();return true;}
  const FR={P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]};
  // green/red shell flight (homing, rails, gaps); true when it is gone
  function moveShell(sh,dt){let gone=false;
   if(sh.kind==='red'&&K[sh.target]){const tg=K[sh.target],ds=T.sdiff(course,sh.s,tg.s);if(ds>0&&ds<1600&&kartHittable(tg)){const want=Math.atan2(tg.d-sh.d,Math.max(30,ds*.6));sh.psi+=clamp(Ph.wrapA(want-sh.psi),-3*dt,3*dt);}else sh.psi*=Math.pow(.2,dt);}
   const f=T.frame(course,sh.s,FR),den=Math.max(.35,1-f.kg*sh.d),ds=sh.v*Math.cos(sh.psi)/den*dt;sh.s=T.wrapS(course,sh.s+ds);sh.d+=sh.v*Math.sin(sh.psi)*dt;sh.psi=Ph.wrapA(sh.psi-f.kg*ds);
   const i=T.idx(course,sh.s),half=course.half[i],rail=course.rail[i];
   if(Math.abs(sh.d)>half-6){const side=Math.sign(sh.d);if(rail&(side>0?2:1)){sh.d=side*(half-6);sh.psi=Math.atan2(-Math.sin(sh.psi),Math.cos(sh.psi));sh.bounce++;snd(900,.04,{type:'square',vol:.02});if(sh.bounce>6)gone=true;}else if(Math.abs(sh.d)>half+4)gone=true;}
   if(course.gap[i]||sh.t>8)gone=true;
   return gone;}
  // thrown banana / bob-omb in the air; true when it lands off the track
  const flyItem=(b,dt)=>{b.s=T.wrapS(course,b.s+b.vs*dt);b.h+=b.vh*dt;b.vh-=Ph.G*dt;if(b.h<=0){b.h=0;b.air=false;if(!T.surfaceAt(course,b.s,b.d))return true;}return false;};
  function stepProjectiles(dt){
   for(const sh of shells){if(sh.dead)continue;sh.t+=dt;let gone=false;
    if(sh.kind==='blue'){const tg=K[sh.target]||order[0];const ds=T.sdiff(course,sh.s,tg.s);sh.s=T.wrapS(course,sh.s+Math.min(Math.abs(ds),sh.v*dt)*Math.sign(ds||1));sh.d+=(tg.d-sh.d)*Math.min(1,dt*3);sh.h=Math.abs(ds)<120?Math.max(4,sh.h-dt*160):46;
     if(Math.abs(ds)<16&&kartHittable(tg)){gone=true;explode(tg.s,tg.d,110,sh.owner,true);}}
    else{
     gone=moveShell(sh,dt);
     // online a shell that reaches a remote kart is gone here (that kart's phone calls the hit and removes it everywhere)
     for(const k of K){if(gone)break;if(sh.t<.3&&k.i===sh.owner)continue;if(!kartHittable(k)||Math.abs(k.h-sh.h)>22)continue;
      if(dist2(k,sh)<18*18){gone=true;if(!owns(k))continue;netRm(sh);if(k.star>0||k.bullet>0){sfx.pop();continue;}if(blockFromBehind(k,sh))continue;hitKart(k,sh.kind==='red'?'hard':'spin','shell');}}
     if(!gone)for(let q=bananas.length-1;q>=0;q--)if(!bananas[q].air&&dist2(bananas[q],sh)<16*16){bananas.splice(q,1);gone=true;sfx.pop();break;}
     if(!gone&&sh.t>.2)for(const o of shells)if(o!==sh&&!o.dead&&o.kind!=='blue'&&o.t>.2&&dist2(o,sh)<14*14){o.dead=true;gone=true;sfx.pop();break;}
    }
    if(gone)sh.dead=true;}
   for(let j=shells.length-1;j>=0;j--)if(shells[j].dead){const sh=shells[j];burst(T.point(course,sh.s,sh.d,sh.h),8,{tile:TILE.glow,col:sh.kind==='red'?[1,.3,.2,1]:sh.kind==='blue'?[.3,.5,1,1]:[.3,1,.4,1],speed:90,size:4,life:.35});shells.splice(j,1);}
   for(const list of [bananas,bombs])for(let j=list.length-1;j>=0;j--){const b=list[j];b.t+=dt;
    if(b.air&&flyItem(b,dt)){list.splice(j,1);continue;}
    if(list===bombs){if(!b.air)b.fuse-=dt;let boom=b.fuse<=0,near=false;if(b.t>.5)for(const k of K)if(owns(k)&&kartHittable(k)&&dist2(k,b)<24*24&&k.h<20)near=true;
     if(near&&!boom&&on&&b.id)nf.event({bm:b.id});if(boom||near){list.splice(j,1);explode(b.s,b.d,95,b.owner);}continue;}
    if(b.air)continue;
    for(const k of K){if(b.t<.4&&k.i===b.owner)continue;if(!owns(k)||!kartHittable(k)||k.h>12)continue;if(dist2(k,b)<15*15){list.splice(j,1);netRm(b);if(k.star<=0&&k.bullet<=0)hitKart(k,'spin','banana');else sfx.pop();break;}}}
   if(bananas.length>14)bananas.shift();
  }
  function explode(s0,d0,r,owner,blue){const P=T.point(course,s0,d0,8);sfx.boom();
   spawn(P,{tile:TILE.boom,add:false,size:30,grow:30,life:.5,col:[1,1,1,1]});burst(P,24,{tile:TILE.glow,col:blue?[.4,.6,1,1]:[1,.6,.2,1],speed:220,size:7,life:.6});burst(P,10,{tile:TILE.smoke,add:false,col:[.4,.35,.45,.7],speed:80,size:10,grow:16,life:1});
   spawn(P,{tile:TILE.ring,size:10,grow:r,life:.45,col:blue?[.5,.7,1,1]:[1,.8,.4,1]});
   for(const k of K)if(kartHittable(k)){const ds=T.sdiff(course,s0,k.s),dd=k.d-d0;if(ds*ds+dd*dd<r*r)hitKart(k,'tumble','boom');}}
  // ---------------------------------------------------------------- kart vs kart, pickups
  const hsvc=h=>{const f=n=>{const k=(n+h*6)%6;return 1-Math.max(0,Math.min(k,4-k,1))*.75;};return [f(5),f(3),f(1)];};
  // animated track characters (cows, moles, Cheep Cheeps, crabs, Thwomps, fire bars): same clock for everyone
  const hazards=course.hazards||[];let hzs=[];
  const stepHazards=()=>{const prev=hzs;hzs=hazards.map(h=>HZ.state(course,h,simT));
   hzs.forEach((st,j)=>{if(st.landed&&!prev[j]?.landed)for(const k of VK){const ds=Math.abs(T.sdiff(course,hazards[j].s,k.s));if(ds<260){shake(k,ds<120?5:2);if(ds<200)sfx.land();}}});};
  const hazardContacts=()=>{for(const k of K){if(k.remote||k.out||!kartHittable(k)||k.inv>0||k.star>0)continue;
   for(let j=0;j<hazards.length;j++){const hz=hazards[j];if(Math.abs(T.sdiff(course,hz.s,k.s))>90||!HZ.touches(course,hzs[j],k))continue;const info=HZ.KIND[hz.kind];
    if(info.hit==='squash'){k.squash=1.6;if(hitKart(k,'hard',hz.kind)&&k.human)noise(.2,{vol:.14,freq:180});}else hitKart(k,'spin',hz.kind);
    if(k.human)msg(k,info.msg,info.col,20,1);break;}}};
  function contacts(dt){
   hazardContacts();
   for(let ia=0;ia<K.length;ia++)for(let ib=ia+1;ib<K.length;ib++){const a=K[ia],b=K[ib];if(a.remote&&b.remote||a.out||b.out||!kartHittable(a)||!kartHittable(b)||Math.abs(a.h-b.h)>=16)continue;const ds=T.sdiff(course,a.s,b.s),dd=b.d-a.d,d=Math.hypot(ds,dd);
    if(d<19){const nx=ds/(d||1),ny=dd/(d||1),push=(19-d)/2+.5;if(!a.air&&!b.air){if(owns(a)){a.s=T.wrapS(course,a.s-nx*push);a.d-=ny*push;}if(owns(b)){b.s=T.wrapS(course,b.s+nx*push);b.d+=ny*push;}}
     if((a.bump||0)<=0&&(b.bump||0)<=0){a.bump=b.bump=.45;if(mine(a)||mine(b))noise(.08,{vol:.06,freq:600});
      for(const [p,q] of [[a,b],[b,a]]){if((p.star>0||p.bullet>0)&&q.star<=0&&q.bullet<=0)hitKart(q,p.bullet>0?'tumble':'hard','ram');else if(q.shrink>0&&p.shrink<=0&&q.inv<=0){q.squash=1.4;hitKart(q,'spin','squash');}}
      if(course.glue[T.idx(course,a.s)]&&course.glue[T.idx(course,b.s)]){if(owns(a))Ph.setBoost(a,.45);if(owns(b))Ph.setBoost(b,.45);msg(a,'SPIN BOOST','#5af0ff',14,.6);msg(b,'SPIN BOOST','#5af0ff',14,.6);}
      else{const va=a.v,vb=b.v;if(owns(a))a.v=vb*.6+va*.4;if(owns(b))b.v=va*.6+vb*.4;}
      if(battle)for(const [p,q] of [[a,b],[b,a]])if(p.boostT>0&&q.star<=0&&q.inv<=0&&p.balloons<3&&q.balloons>0){if(on){if(hitKart(q,'spin','steal'))nf.event({st:p.i});continue;}hitKart(q,'spin','steal');p.balloons++;msg(p,'BALLOON STOLEN!','#ff8aa8',18,1);}}}}
   for(const k of K){k.bump=Math.max(0,(k.bump||0)-dt);if(!kartHittable(k)||k.h>34)continue;
    for(const b of boxes)if(b.t<=0&&dist2(k,b)<17*17){b.t=1.8;b.pop=.25;if(mine(k))sfx.box();burst(b.P,14,{tile:TILE.glow,col:[...hsvc(rand()),1],speed:120,size:3.5,life:.45});
     if(owns(k)&&k.frenzy<=0&&k.items.length+(k.rolling?1:0)<2){k.rolling=true;k.rollT=1.05;}}
    for(const cn of coins)if(cn.t<=0&&dist2(k,cn)<15*15){cn.t=9;if(owns(k)&&k.coins<10){k.coins++;if(mine(k))sfx.coin();}burst(cn.P,6,{tile:TILE.spark,col:[1,.85,.2,1],speed:70,size:3,life:.3});}}
   for(const b of boxes){if(b.t>0)b.t-=dt;b.pop=Math.max(0,b.pop-dt);}for(const cn of coins)if(cn.t>0)cn.t-=dt;
  }
  // ---------------------------------------------------------------- per kart update
  const leadHuman=()=>Math.max(...H.map(k=>k.prog));
  function updateKart(k,dt){
   if(k.remote)applyRemote(k,dt);else{
   const racing=phase==='play'||phase==='end';
   const inp=!k.human&&racing&&battle&&!k.out?battleBrain(k,dt):!k.human&&racing?Ph.autoInput(course,k,{target:k.lane+(k.items.length<2?autoTarget(k)*.6:0)}):phase==='play'&&!k.out&&!k.finished?readInput(k):(phase==='end'||k.finished)&&!k.out?{steer:Ph.autoInput(course,k).steer,drift:0}:{steer:0,drift:0};
   if(k.out){k.v*=Math.pow(.3,dt);inp.steer=0;}
   if(k.rolling){k.rollT-=dt;if(k.rollT<=0){k.rolling=false;rollItem(k);}}
   if(k.frenzy>0){k.frenzy-=dt;k.frenzyCD-=dt;if(k.frenzy<=0){k.frenzyItem=null;}}
   if(k.goldenT>0){k.goldenT-=dt;if(k.goldenT<=0&&k.items[0]?.id==='golden')k.items.shift();}
   if(k.human&&auto[k.player]&&phase==='play'&&(k.items[0]||k.frenzy>0)&&rand()<dt*.6)useItem(k,rand()<.75?1:-1);
   if(!k.human&&!battle&&phase==='play'&&!k.finished){const gap=leadHuman()-k.prog;k.topMul=k.baseMul*(gap>.08?1.05:gap<-.12?.93:1);
    const it=k.frenzy>0?k.frenzyItem:k.items[0]?.id;if(it&&rand()<dt*.9){const back=['banana','banana3','bomb'].includes(it),tgt=aheadOf(k);if(back||['mushroom','mush3','golden','star','bolt','blooper','coin','bullet','blue'].includes(it)||tgt&&(tgt.prog-k.prog)*course.L<500)useItem(k,back?-1:1);}}
   const n=Math.max(1,Math.ceil(dt/(1/120))),h=dt/n;for(let q=0;q<n;q++)Ph.stepKart(course,k,racing?inp:{steer:0,drift:0},h,ctx);
   // laps
   if(!battle){const rel=T.wrapS(course,k.s-course.startS),L=course.L;
    if(!k.finished&&k.lakitu<=0&&k.falling<=0){if(k.rel>L*.8&&rel<L*.2&&k.half){k.lap++;k.half=false;k.lapT.push(clock);
      if(k.lap>=LAPS){k.finished=true;k.finishT=clock;k.place=++finishCount;if(on)nf.push();if(k.human){if(winner<0){winner=k.player;s.react?.(k.player,'win');}jingle([523,659,784,1047,1319],{step:.09,type:'square',vol:.04});msg(k,timeTrial?`FINISH! ${fmtTime(clock)}`:`FINISH! ${ord(k.place)}`,'#ffe23a',30,3);}}
      else if(!k.human){}else if(k.lap===LAPS-1){sfx.final();msg(k,'FINAL LAP!','#ff5a5a',28,1.8);}else{sfx.lap();msg(k,timeTrial?`LAP ${k.lap} ${fmtTime(clock-(k.lapT[k.lap-2]||0))}`:`LAP ${k.lap+1}`,'#fff',22,1.4);}}
     if(rel>L*.4&&rel<L*.62)k.half=true;}
    k.rel=rel;k.prog=k.finished?LAPS:k.lap+(rel>L*.9&&!k.half?rel/L-1:rel/L);k.best=Math.max(k.best,k.prog);
    const back=!k.air&&k.lakitu<=0&&Math.abs(k.psi)>2.1&&k.v>40;k.wrongT=back?k.wrongT+dt:0;}
   }
   for(const m of k.msgs)m.t+=dt;k.msgs=k.msgs.filter(m=>m.t<m.life);
   // particles from the kart
   if(k._M&&k.falling<=0&&k.lakitu<=0&&(k.human||rand()<.5)){
    if(k.drift&&!k.air){const lv=k.spark,col=[[1,.95,.7,.9],[.35,.7,1,1],[1,.6,.15,1],[.9,.35,1,1]][lv];for(const z of [-9,9])if(rand()<(lv?.9:.5)){const P=local(k,[-8,1,z]);spawn(P,{tile:TILE.spark,col,size:lv?3.4+lv:2.2,life:.22,V:[(rand()-.5)*60-k.F[0]*40,30+rand()*50,(rand()-.5)*60-k.F[2]*40],g:-140});}}
    if(k.boostT>0||k.bullet>0)for(const z of [-2.6,2.6])spawn(local(k,[-15,6.6,z]),{tile:TILE.flame,col:k.bullet>0?[1,.9,.7,1]:[1,.75,.4,1],size:5+rand()*3,grow:-3,life:.16,V:[-k.F[0]*90,-k.F[1]*90,-k.F[2]*90]});
    if(k.star>0&&rand()<.7)spawn(local(k,[(rand()-.5)*24,rand()*20,(rand()-.5)*20]),{tile:TILE.spark,col:[...hsvc(rand()),1],size:3,life:.35});
    if(k.glue>.5&&!k.air&&rand()<.6)for(const z of [-9,9])spawn(local(k,[-8,1,z]),{tile:TILE.glow,col:[.3,.9,1,.6],size:3,life:.25});
    if(k.offroad&&!k.air&&k.v>80&&rand()<.7)spawn(local(k,[-9,1,(rand()-.5)*18]),{tile:TILE.smoke,add:false,col:course.theme==='meadow'?[.45,.7,.3,.7]:[.95,.88,.68,.7],size:3,grow:8,life:.4,V:[(rand()-.5)*40,30+rand()*30,(rand()-.5)*40],g:-120});
    if((k.spin>0||k.tumble>0)&&rand()<.5)spawn(local(k,[0,3,0]),{tile:TILE.smoke,add:false,col:[1,1,1,.5],size:5,grow:10,life:.5,V:[0,20,0]});}
  }
  // ---------------------------------------------------------------- online: snapshots of the karts this phone owns
  // {t: shared race time, k: [kart...]} ~20/s; a remote kart is shown from the newest one, moved on along the track by its
  // speed for the time since (track space, so it follows curves and loops), with the jump at each new snapshot eased out.
  function packK(k){const a=[k.i,r1(k.s),r1(k.d),r3(k.psi),r1(k.v),r3(k.hop||0),r3(k.visYaw),r3(k.steer||0),k.drift||0,(k.air?1:0)|(k.glide?2:0)|(k.out?4:0)|(k.finished?8:0),
    r3(k.spin),r3(k.spinA||0),r3(k.tumble),r3(k.lakitu),r3(k.falling),r3(k.star),r3(k.bullet),r3(k.shrink),r3(k.squash),r3(k.inv),r3(k.boostT),r3(k.glue),r3(k.trick),r3(k.frenzy),
    k.balloons,r3(k.prog),k.finished?r3(k.finishT):k.out?r3(k.outT??clock):-1,k.lap,k.spark||0,k.items[0]?.id||0,r1(k.h)];
   if(k.air||k.falling>0)a.push(...k.P.map(r1),...k.V.map(r1));return a;}
  const target=(k,a,age)=>{const v=a[4],psi=a[3],ag=k.lakitu>0||k.falling>0?0:age;return [T.wrapS(course,a[1]+v*Math.cos(psi)*ag),a[2]+v*Math.sin(psi)*ag];};
  function applySnap(k,a,t){
   const fl=a[9];k.v=a[4];k.hop=a[5];k.steer=a[7];k.drift=a[8];k.air=!!(fl&1);k.glide=!!(fl&2);k.out=!!(fl&4);
   [k.spin,k.spinA,k.tumble,k.lakitu,k.falling,k.star,k.bullet,k.shrink,k.squash,k.inv,k.boostT,k.glue,k.trick,k.frenzy]=a.slice(10,24);
   k.balloons=a[24];k.prog=k.best=a[25];k.lap=a[27];k.spark=a[28];k.items=a[29]?[{id:a[29],n:1}]:[];k.h=a[30];
   if(fl&8&&!k.finished){k.finished=true;k.finishT=a[26];k.place=++finishCount;}if(k.out&&k.outT==null)k.outT=a[26];
   const [s1,d1]=target(k,a,clamp(netNow()-t,0,.3));
   if(k.snap){k.errS=T.sdiff(course,s1,k.s);k.errD=k.d-d1;if(Math.abs(k.errS)>140||Math.abs(k.errD)>70||k.air)k.errS=k.errD=0;}else{k.errS=k.errD=0;}
   k.snap={a,t};}
  function applyRemote(k,dt){if(!k.snap)return;const a=k.snap.a,age=clamp(netNow()-k.snap.t,0,.3),e=Math.exp(-dt*9);k.errS*=e;k.errD*=e;
   const [s1,d1]=target(k,a,age);k.s=T.wrapS(course,s1+k.errS);k.d=d1+k.errD;k.psi=a[3];
   if((k.air||k.falling>0)&&a.length>=37){const V=a.slice(34,37),P=a.slice(31,34);k.V=[V[0],V[1]-Ph.G*age,V[2]];k.P=[P[0]+V[0]*age,P[1]+V[1]*age-.5*Ph.G*age*age,P[2]+V[2]*age];}
   Ph.pose(course,k);k.visYaw=a[6];}
  const r1=v=>Math.round((v||0)*10)/10,r3=v=>Math.round((v||0)*1000)/1000;
  const INTRO=2.4,COUNT=4/1.2;let started=!on,netT0=0;const blog=[[0,3]];   // blog: this phone's balloons over time (battle)
  const wall=()=>started&&on?(performance.now()-netT0)/1000:0,netNow=()=>on?(started?wall()-INTRO-COUNT:-99):clock;
  if(on){NET={pack:()=>started?{t:r3(netNow()),k:K.filter(owns).map(packK)}:{},
   unpack:d=>{if(!d||!Array.isArray(d.k))return;for(const a of d.k){const k=K[a?.[0]];if(k&&!owns(k)&&Array.isArray(a)&&a.length>=31)applySnap(k,a,+d.t||0);}},
   event:e=>{if(Array.isArray(e.it))remoteFire(e.it);
    else if(e.rm!=null){for(const list of PROJ){const j=list.findIndex(o=>o.id===e.rm);if(j>=0){const o=list[j];list.splice(j,1);if(list===shells)burst(T.point(course,o.s,o.d,o.h),8,{tile:TILE.glow,col:[1,1,1,1],speed:90,size:4,life:.35});}}}
    else if(e.bm!=null){const j=bombs.findIndex(o=>o.id===e.bm);if(j>=0){const b=bombs[j];bombs.splice(j,1);explode(b.s,b.d,95,b.owner);}}
    else if(e.st!=null){const k=K[e.st];if(k&&owns(k)&&!k.out&&k.balloons<3&&phase==='play'){k.balloons++;blog.push([r3(clock),k.balloons]);msg(k,'BALLOON STOLEN!','#ff8aa8',18,1);nf.push();}}}};
   nf.start('race').then(()=>{if(ended)return;netT0=performance.now();started=true;});}
  // ---------------------------------------------------------------- cameras
  const cams=K.map(k=>({E:[k.P2[0]-k.F[0]*55+k.N[0]*22,k.P2[1]-k.F[1]*55+k.N[1]*22,k.P2[2]-k.F[2]*55+k.N[2]*22],F:k.F.slice(),N:k.N.slice(),fov:0,snap:false}));
  const lerp3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  function cameraFor(k,dt,view){
   const cm=cams[k.i],aspect=view.w/view.h;
   // keep about 75° across in tall split views, a little narrower on wide screens
   const base=aspect<.95?Math.min(109*Math.PI/180,2*Math.atan(Math.tan(40.5*Math.PI/180)/aspect)):(aspect<1.25?80:aspect<1.7?72:64)*Math.PI/180;
   cm.fov+=((k.boostT>0||k.bullet>0?.12:0)-cm.fov)*Math.min(1,dt*4);
   if(phase==='intro'){const e=Math.min(1,introT/2.4),a=Math.PI*(1-(e*e*(3-2*e))),r=70-20*e;const F=k.F,N=k.N,Rv=k.R;
    const E=[k.P2[0]+(F[0]*Math.cos(a)+Rv[0]*Math.sin(a)*.6)*r+N[0]*(18+20*(1-e)),k.P2[1]+(F[1]*Math.cos(a)+Rv[1]*Math.sin(a)*.6)*r+N[1]*(18+20*(1-e)),k.P2[2]+(F[2]*Math.cos(a)+Rv[2]*Math.sin(a)*.6)*r+N[2]*(18+20*(1-e))];
    cm.E=E;cm.O=[E[0]-k.P2[0],E[1]-k.P2[1],E[2]-k.P2[2]];cm.F=k.F.slice();cm.N=k.N.slice();return {eye:E,target:[k.P2[0]+N[0]*10,k.P2[1]+N[1]*10,k.P2[2]+N[2]*10],up:N,fov:base};}
   if(k.falling>0){return {eye:cm.E,target:k.P2,up:cm.N,fov:base};}
   const a1=cm.snap?1:1-Math.exp(-dt*(k.air?3:7)),a2=cm.snap?1:1-Math.exp(-dt*5);
   cm.F=T.norm(lerp3(cm.F,k.F,a1));cm.N=T.norm(lerp3(cm.N,k.N,a2));
   // higher eye + a target raised to nearly eye height: the view looks almost level while the kart (seen steeply from above) sits low on screen.
   // Speed zoom: the whole rig (eye and aim point) dollies back as the kart speeds up and in again as it slows, so the speed is felt
   // while the kart keeps its place low on the screen. cm.zoom eases toward the speed, so boosts pull the camera back smoothly.
   const tall=aspect<.95,mid=aspect<1.25,back=tall?64:66,up=tall?48:mid?32:30,fw=tall?120:90,uw=tall?28:mid?21:18;
   const zoomTo=Math.min(1.6,1+Math.max(0,k.v)/Ph.TOP*.32+(k.boostT>0?.1:0));cm.zoom=cm.snap||!cm.zoom?zoomTo:cm.zoom+(zoomTo-cm.zoom)*(1-Math.exp(-dt*(zoomTo>cm.zoom?5:2.5)));const z=cm.zoom;
   const want=[(-cm.F[0]*back+cm.N[0]*up)*z,(-cm.F[1]*back+cm.N[1]*up)*z,(-cm.F[2]*back+cm.N[2]*up)*z];
   cm.O=cm.snap||!cm.O?want:lerp3(cm.O,want,1-Math.exp(-dt*14));cm.snap=false;cm.E=[k.P2[0]+cm.O[0],k.P2[1]+cm.O[1],k.P2[2]+cm.O[2]];
   let eye=cm.E;if(cm.shake>.05){const a=cm.shake;eye=[cm.E[0]+(rand()-.5)*a,cm.E[1]+(rand()-.5)*a,cm.E[2]+(rand()-.5)*a];cm.shake*=Math.pow(.02,dt);}
   const fz=fw*z,uz=uw*z;
   return {eye,target:[k.P2[0]+cm.F[0]*fz+cm.N[0]*uz,k.P2[1]+cm.F[1]*fz+cm.N[1]*uz,k.P2[2]+cm.F[2]*fz+cm.N[2]*uz],up:cm.N,fov:base+cm.fov};
  }
  // ---------------------------------------------------------------- heads (portrait textures)
  const headCv=H.map(()=>{const c2=document.createElement('canvas');c2.width=c2.height=128;return c2;}),headKey=H.map(()=>'');let headTimer=0;
  function refreshHeads(force){H.forEach((k,j)=>{const mood=k.spin>0||k.tumble>0||k.falling>0||k.lakitu>0||k.out?'sad':k.finished&&(k.place===1||timeTrial)?'win':k.star>0||k.boostT>.5||k.trick>0?'happy':'normal';
   if(!force&&headKey[j]===mood)return;headKey[j]=mood;const g=headCv[j].getContext('2d');g.clearRect(0,0,128,128);s.sprite(g,k.player,64,64,124,{exact:true,mood:mood==='normal'?undefined:mood});R.setHead(k.i,headCv[j]);});}
  function loadHead(i,id,player){
   if(player!=null){const c2=document.createElement('canvas');c2.width=c2.height=128;const paint=()=>{if(ended)return;const g=c2.getContext('2d');g.clearRect(0,0,128,128);s.sprite(g,player,64,64,124,{exact:true});R.setHead(i,c2);};paint();setTimeout(paint,600);setTimeout(paint,2000);return;}
   const img=new Image(),cv2=document.createElement('canvas');cv2.width=cv2.height=128;const g=cv2.getContext('2d');
   const emoji=()=>{if(ended)return;const e=document.createElement('canvas');e.width=e.height=128;const g2=e.getContext('2d');g2.font='96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';g2.textAlign='center';g2.textBaseline='middle';g2.fillText(character(id)?.icon||'🙂',64,70);R.setHead(i,e);};
   img.onload=()=>{if(ended)return;g.clearRect(0,0,128,128);const sc=Math.min(124/img.naturalWidth,124/img.naturalHeight);g.drawImage(img,64-img.naturalWidth*sc/2,64-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);if(!R.setHead(i,cv2))emoji();};
   img.onerror=emoji;emoji();
   try{const src=portraitURL(id,'normal');if(src){if(/^https?:/.test(src))img.crossOrigin='anonymous';img.src=src;}}catch{}}
  {const warm=document.createElement('canvas').getContext('2d');for(const k of H)for(const m of ['sad','win','happy',undefined])s.sprite(warm,k.player,64,64,124,{exact:true,mood:m});}// start loading every mood's portrait
  refreshHeads(true);for(const k of K)if(!k.human)loadHead(k.i,k.cpu);if(ghost)loadHead(ghostIdx,null,ghost.player);
  // ---------------------------------------------------------------- ghost replay (time trials)
  function ghostPose(){if(!ghost||!ghost.frames.length)return null;const fr=ghost.frames;while(ghostPtr<fr.length-2&&fr[ghostPtr+1].t<=clock)ghostPtr++;
   const a=fr[ghostPtr],b=fr[Math.min(fr.length-1,ghostPtr+1)],u=b.t>a.t?clamp((clock-a.t)/(b.t-a.t),0,1):0;
   const F=T.norm(lerp3(a.F,b.F,u)),N=T.norm(lerp3(a.N,b.N,u));
   return {ghost:true,i:ghostIdx,P2:lerp3(a.P,b.P,u),F,N,R:T.cross(F,N),visYaw:a.vy+(b.vy-a.vy)*u,steer:a.st,glue:a.g,drift:0,spin:0,tumble:0,shrink:0,squash:0,star:0,frenzy:0,bullet:0,glide:a.gl,items:[],trick:0,lakitu:0,falling:0,inv:0,balloons:0,done:clock>fr[fr.length-1].t+1};}
  // ---------------------------------------------------------------- debug hooks for tests
  Object.defineProperties(s.debug,Object.getOwnPropertyDescriptors({get phase(){return phase;},get clock(){return clock;},K,course,shells,bananas,bombs,humans,
   give(p,id){const k=kartOf(p)||K[p];if(k)k.items=[{id,n:COUNT[id]||1}];},use(p,dir=0){useItem(kartOf(p)||K[p],dir);},skip(){if(phase==='intro'){phase='count';}if(phase==='count'){lights=4;phase='play';}},
   teleport(p,s0,d=0){const k=kartOf(p)||K[p];if(!k)return;k.s=T.wrapS(course,s0);k.d=d;k.air=false;k.falling=0;k.lakitu=0;k.rel=T.wrapS(course,k.s-course.startS);cams[k.i].snap=true;},
   finishLap(p){const k=kartOf(p)||K[p];k.lap=LAPS-1;k.half=true;s.debug.teleport(p,course.startS-30);k.rel=T.wrapS(course,k.s-course.startS);},
   get headOK(){return R.headOK.slice();},get lastUse(){return lastUse;},get particles(){return parts.length;},get ghost(){return ghost?ghost.frames.length:0;}}));
  // ---------------------------------------------------------------- main loop
  onFrame=dt=>{
   lastFrame=performance.now();simT=on?wall():simT+dt;R.tick(dt);stepHazards();
   headTimer-=dt;if(headTimer<=0){headTimer=simT<6?.5:1;refreshHeads(true);}else refreshHeads(false);
   // online the intro, the lights and the race clock all run on the shared start time from nf.start
   if(phase==='intro'){introT=on?wall():introT+dt;if(introT>INTRO)phase='count';}
   else if(phase==='count'){const before=Math.floor(lights);lights=on?Math.min(4,(wall()-INTRO)*1.2):lights+dt*1.2;const now=Math.floor(lights);if(now!==before&&now>=1&&now<=4)sfx.light(now>=4);
    if(lights>=4){phase='play';for(const k of VK){const p=k.player,pd=pads[p],held=pd.f||(vs&&!on?[p]:[0,1]).some(q=>kb.state[q].u||kb.state[q].d||kb.state[q].fire)||auto[p];if(held&&pd.holdSince>=2&&pd.holdSince<4||auto[p]){Ph.setBoost(k,1);k.v=200;msg(k,'ROCKET START!','#ffb02e',20,1.1);sfx.boost();}}
     for(const k of K)if(!k.human&&owns(k)&&rand()<.5){Ph.setBoost(k,.8);k.v=180;}}}
   else{
    if(phase==='play'){clock=on?Math.max(clock,netNow()):clock+dt;hintT-=dt;}
    for(const k of K)updateKart(k,dt);stepProjectiles(dt);contacts(dt);if(!battle)sortOrder();
    if(rec&&phase==='play'){const k=K[0];rec.push({t:clock,P:k.P2.slice(),F:k.F.slice(),N:k.N.slice(),vy:k.visYaw,st:k.steer,g:k.glue,gl:k.glide});}
    if(phase==='play'){
     // online each phone's race ends when its own kart finishes / is out, or its clock passes the other kart's finish / out
     const mk=on?kartOf(me):null,tk=on?kartOf(them):null;
     const done=on?(battle?mk.out||tk.out&&tk.outT!=null&&clock>=tk.outT||clock>=BATTLE_TIME:mk.finished||tk.finished&&clock>=tk.finishT||clock>=RACE_CAP)
      :battle?(K.some(k=>k.out)||clock>=BATTLE_TIME):vs?(winner>=0||clock>=RACE_CAP):(H[0].finished||clock>=RACE_CAP);
     if(done){phase='end';endT=0;song?.victory();
      if(on){const N=p=>s.players[p].name.toUpperCase();endText=battle?(mk.out?`${N(them)} WINS THE BATTLE!`:tk.out?`${N(me)} WINS THE BATTLE!`:'TIME UP!'):mk.finished?'FINISH!':tk.finished?`${N(them)} FINISHED FIRST!`:'TIME UP!';
       jingle([523,659,784,1047],{step:.1,type:'square',vol:.04});}
      else if(battle){const a=K[0].balloons,b=K[1].balloons;endText=a===b?'DRAW!':`${s.players[a>b?0:1].name.toUpperCase()} WINS THE BATTLE!`;jingle([523,659,784,1047],{step:.1,type:'square',vol:.04});}
      else if(vs){if(winner<0){const a=K[0].best,b=K[1].best;winner=Math.abs(a-b)<.002?-2:a>b?0:1;}endText=winner===-2?'PHOTO FINISH!':`${s.players[winner].name.toUpperCase()} WINS THE CUP!`;}
      else{const k=H[0];endText=k.finished?(timeTrial?`${fmtTime(k.finishT)}`:`${ord(k.place)} PLACE!`):'TIME UP!';}}}
    else{endT+=dt;if(endT>3.2){
     const res={course,ghost:rec?{player:humans[0],frames:rec}:null,humans:H.map(k=>({player:k.player,finished:k.finished,place:k.finished?k.place:rankOf(k),finishT:k.finished?k.finishT:Infinity,prog:k.best,balloons:k.balloons,lapT:k.lapT.slice()}))};
     if(on){const k=kartOf(me);res.net=battle?{log:blog,o:k.out?r3(k.outT):-1}:{f:k.finished?1:0,t:k.finished?r3(k.finishT):-1,p:r3(k.best),c:me===0?K.filter(q=>!q.human).map(q=>q.finished?r3(q.finishT):-1):null};}
     if(rivalCpu){const k=K[humans.length];if(k)res.rival={finished:k.finished,place:k.finished?k.place:rankOf(k),finishT:k.finished?k.finishT:Infinity,balloons:k.balloons};}
     endRace(res);return;}}
   }
   for(let j=parts.length-1;j>=0;j--){const p=parts[j];p.life-=dt;if(p.life<=0){parts.splice(j,1);continue;}const dr=Math.exp(-p.drag*dt);p.V[0]*=dr;p.V[1]=p.V[1]*dr+(p.g||0)*dt;p.V[2]*=dr;p.P[0]+=p.V[0]*dt;p.P[1]+=p.V[1]*dt;p.P[2]+=p.V[2]*dt;}
   if(on&&started)nf.tick(dt);
   updateEngines();if(phase!=='intro'&&phase!=='end'&&!s.paused)song?.tick();if(!battle)song?.setRate(H.some(k=>k.lap===LAPS-1&&!k.finished)?1.08:1);
   if(battle)s.setScores([K[0].balloons,K[1].balloons]);else if(vs){ s.setScores(K.slice(0,2).map(k=>k.finished?100:Math.min(99,Math.round(clamp(k.best/LAPS,0,1)*100))));}
   // render each player's view into the GL canvas, then composite + HUD
   const W=s.W,Hh=s.H;R.resize(W,Hh);
   if(R.lost()){x.fillStyle='#120a2e';x.fillRect(0,0,W,Hh);return;}
   const views=layout();
   const gp=ghostPose();
   const scene={course,karts:K,view:-1,boxes,coins,particles:parts,blink:false,ghost:gp&&!gp.done?gp:null,
    hazards:hzs.map((st,j)=>({kind:hazards[j].kind,st,parts:st.parts.map(p=>{const f=T.frame(course,p.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});
     return {P:[f.P[0]+f.R[0]*p.d+f.U[0]*p.h,f.P[1]+f.R[1]*p.d+f.U[1]*p.h,f.P[2]+f.R[2]*p.d+f.U[2]*p.h],G:[f.P[0]+f.R[0]*p.d,f.P[1]+f.R[1]*p.d,f.P[2]+f.R[2]*p.d],T:f.T.slice(),R:f.R.slice(),U:f.U.slice(),h:p.h};})})),
    shells:shells.map(sh=>{const f=T.frame(course,sh.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]}),cp=Math.cos(sh.psi),sp=Math.sin(sh.psi);const F=[f.T[0]*cp+f.R[0]*sp,f.T[1]*cp+f.R[1]*sp,f.T[2]*cp+f.R[2]*sp];
     return {kind:sh.kind,P:[f.P[0]+f.R[0]*sh.d+f.U[0]*(sh.h+1),f.P[1]+f.R[1]*sh.d+f.U[1]*(sh.h+1),f.P[2]+f.R[2]*sh.d+f.U[2]*(sh.h+1)],F,N:f.U.slice(),R:T.cross(F,f.U)};}),
    bananas:bananas.map(b=>{const f=T.frame(course,b.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});return {P:[f.P[0]+f.R[0]*b.d+f.U[0]*b.h,f.P[1]+f.R[1]*b.d+f.U[1]*b.h,f.P[2]+f.R[2]*b.d+f.U[2]*b.h],N:f.U.slice()};}),
    bombs:bombs.map(b=>{const f=T.frame(course,b.s,{P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]});return {P:[f.P[0]+f.R[0]*b.d+f.U[0]*b.h,f.P[1]+f.R[1]*b.d+f.U[1]*b.h,f.P[2]+f.R[2]*b.d+f.U[2]*b.h],N:f.U.slice(),fuse:b.fuse};})};
   const camsNow=views.map((v,j)=>cameraFor(VK[j],dt,v));const proj=[];
   for(let j=0;j<views.length;j++){scene.view=VK[j].i;R.renderView(views[j],camsNow[j],scene,W,Hh);proj[j]=K.map(k=>k._head?R.project(k._head.P):null);}
   x.drawImage(glc,0,0,W,Hh);
   for(let j=0;j<views.length;j++){const v=views[j],k=VK[j];x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();
    // heads drawn in 2D only when the portrait could not become a texture (cross-origin photo)
    for(const q of H)if(!R.headOK[q.i]&&proj[j][q.i]&&q._head){const p=proj[j][q.i],sz=q._head.size*2*v.h/(2*Math.tan(camsNow[j].fov/2)*p.w);if(sz>4&&sz<v.h)s.sprite(x,q.player,p.x,p.y,sz,{exact:true});}
    const ht=HUD_TOP+(on?30:0);   // online: clear of the duel chip
    drawHUD(x,{x:v.x,y:v.y+ht,w:v.w,h:v.h-ht},{k,i:k.player,mode:battle?'battle':timeTrial?'time':'race',laps:LAPS,rank:rankOf(k),total:K.length,t:simT,phase,lights,clock,course,other:on?kartOf(them):vs?H[1-j]:null,karts:K,pad:{f:pads[k.player].f,ox:pads[k.player].ox,latch:pads[k.player].latch},msgs:k.msgs,rad:ctl.rad(),battleTime:BATTLE_TIME,foe:battle&&!vs?K[1]:battle&&on?kartOf(them):null,foeName:on?s.players[them].name:null,
     names:s.players.map(p=>p.name),hint:phase==='play'||phase==='count'?Math.min(1,hintT):0,wrongWay:k.wrongT>1,ghostBest:ghost?ghost.total:null});
    x.restore();}
   if(on&&!started)outlined(x,`WAITING FOR ${s.players[them].name.toUpperCase()}…`,W/2,Hh*.3,{size:Math.min(W*.05,24),fill:'#ffe23a',stroke:'#120a2e'});
   if(vs&&!on){const hx=Math.floor(W/2);x.fillStyle='#120a2e';x.fillRect(hx-1,0,2,Hh);x.fillStyle='#ffe23a';x.fillRect(hx-.5,0,1,Hh);}
   if(phase==='end'){const a=Math.min(1,endT*3),size=Math.min(W*.06,Hh*.065,44);x.save();x.globalAlpha=a;x.fillStyle='rgba(18,10,46,.6)';x.fillRect(0,Hh*.42,W,Hh*.16);
    x.font=`900 ${size}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=size*.2;x.strokeStyle='#120a2e';x.lineJoin='round';x.strokeText(endText,W/2,Hh/2);x.fillStyle='#ffe23a';x.fillText(endText,W/2,Hh/2);x.restore();}
  };
  });
 }

 // ---------------------------------------------------------------- game flow
 const seed=Math.floor(s.random()*1e9);
 const course=mode==='battle'?T.battleRing():net&&me!==0?await waitCourse():await chooseCourse();
 if(!s.alive)return;
 const P=s.players.map(p=>p.name);
 if(s.solo)return soloKart(course,seed);
 // online player 1's phone picks the CPU racers (from its own roster) and sends them with the course
 let cpuIds=null;if(net&&mode!=='battle'){if(me===0){cpuIds=pickCPUs(MD.cpus,s.players.map(p=>p.character),seededRandom(seed),store.profile);nf.event({setup:{c:course.id,cpus:cpuIds}});}else cpuIds=setupMsg.cpus;}
 if(MD.vs){
  const r=await runRace({course,humans:[0,1],cpus:MD.cpus,seed,cpuIds});if(!r||!s.alive)return;
  const [a,b]=net?await netResults(r):r.humans;if(!a||!s.alive)return;
  if(mode==='battle')return s.finish([a.balloons,b.balloons],`Balloon Battle: ${P[0]} ${a.balloons} balloons left, ${P[1]} ${b.balloons}.`);
  const prog=h=>h.finished?100:Math.min(99,Math.round(clamp(h.prog/LAPS,0,1)*100)),sc=[prog(a),prog(b)];
  if(a.finished||b.finished){const w=!b.finished||a.finished&&a.finishT<=b.finishT?0:1;sc[w]=100;sc[1-w]=Math.min(sc[1-w],99);}
  const desc=h=>h.finished?`${ord(h.place)} in ${fmtTime(h.finishT)}`:`lap ${Math.min(LAPS,Math.floor(Math.max(0,h.prog))+1)}`;
  return s.finish(sc,`${course.name} ${mode==='duo'?'1 v 1 race':'Grand Prix'}: ${P[0]} ${desc(a)}, ${P[1]} ${desc(b)}.`);
 }
 const res=[];let ghost=null;
 for(const t of [0,1]){
  const other=1-t;
  const text=mode==='time'?(t===0?`Time Trials · ${course.name}. ${P[t]} first: three laps alone with three mushrooms. ${P[other]}, look away!`:`${P[t]}'s turn on ${course.name}. Beat ${P[other]}'s ${fmtTime(res[0].finishT)} — their ghost races with you.`)
   :(t===0?`Grand Prix · ${course.name}. ${P[t]} races seven CPU racers first; ${P[other]} races the same grid next.`:`${P[t]}'s turn: same grid on ${course.name}. ${P[other]} finished ${res[0].finished?ord(res[0].place):'outside the top 8'}.`);
  if(!await s.pass(t,text,`${P[t]} — start your engine`))return;
  const r=await runRace({course,humans:[t],cpus:MD.cpus,seed,ghost:mode==='time'&&t===1?ghost:null,record:mode==='time'&&t===0});
  if(!r||!s.alive)return;res[t]=r.humans[0];if(r.ghost){ghost=r.ghost;ghost.total=res[0].finishT;}
 }
 const [a,b]=res;
 if(mode==='time'){const ta=a.finishT,tb=b.finishT,sc=ta===tb?[100,100]:ta<tb?[100,99]:[99,100];
  const d=h=>h.finished?fmtTime(h.finishT):'did not finish';return s.finish(sc,`${course.name} time trial: ${P[0]} ${d(a)}, ${P[1]} ${d(b)}.`);}
 const pts=h=>GP_POINTS[Math.min(7,Math.max(0,h.place-1))]||0;let sa=pts(a),sb=pts(b);
 if(sa===sb&&a.finishT!==b.finishT){if(a.finishT<b.finishT)sa++;else sb++;}
 const d=h=>h.finished?`${ord(h.place)} (${fmtTime(h.finishT)})`:`${ord(h.place)}, did not finish`;
 s.finish([sa,sb],`${course.name} Grand Prix: ${P[0]} ${d(a)}, ${P[1]} ${d(b)}.`);

 // online: both phones swap their final {fin} and score the same two results. Race: finish times on the shared clock
 // (P1 wins a tie), places counted against the CPU finish times from player 1's phone. Battle: the battle ends at the
 // first out (or time-up); each kart keeps the balloons its log shows at that moment.
 async function netResults(r){
  const F=[];F[me]=r.net;nf.finish(r.net);F[them]=await nf.remoteDone();if(!F[them])return [];
  if(mode==='battle'){const E=Math.min(...F.map(f=>f.o>=0?f.o:Infinity),BATTLE_TIME),bal=f=>{let b=3;for(const [t,n] of f.log||[])if(t<=E)b=n;return b;};return F.map(f=>({balloons:bal(f)}));}
  const cpuT=(F[0].c||[]).filter(t=>t>=0),h=F.map(f=>({finished:!!f.f,finishT:f.f?f.t:Infinity,prog:f.p}));
  h.forEach((q,j)=>{const o=h[1-j];q.place=!q.finished?0:1+cpuT.filter(t=>t<q.finishT).length+(o.finished&&(o.finishT<q.finishT||o.finishT===q.finishT&&j===1)?1:0);});
  return h;
 }
 // ---------------------------------------------------------------- solo (1P arcade)
 // race: one Grand Prix vs 7 CPUs; the CPU player's character is your rival — finish ahead of it to win.
 // gp: course after course; a podium (top 3) moves you on, anything lower ends the cup run.
 // time: lap the course again and again against your own ghost; every new record moves you on.
 async function soloKart(first,seed0){
  const name=s.players[0].name,pts=h=>GP_POINTS[Math.min(7,Math.max(0,h.place-1))]||0,rv=s.players[1];
  if(mode==='race'){
   if(!await s.pass(0,`Grand Prix · ${first.name}. Seven CPU racers; ${rv.name} is your rival: finish ahead of them to win.`,`${name} — start your engine`,{soloTitle:first.name}))return;
   const r=await runRace({course:first,humans:[0],cpus:MD.cpus+1,seed:seed0,rivalCpu:true});if(!r||!s.alive)return;
   const me=r.humans[0],them=r.rival||{place:8,finished:false},d=h=>h.finished?`${ord(h.place)} (${fmtTime(h.finishT)})`:`${ord(h.place)}, did not finish`;
   const sc=[pts(me),pts(them)];if(sc[0]===sc[1])sc[me.place<them.place?0:1]++;
   return s.finish(sc,`${first.name} Grand Prix: ${name} ${d(me)}, ${rv.name} ${d(them)}.`);}
  // battle: one Balloon Battle against a CPU kart driven by the rival's character; more balloons left wins.
  if(mode==='battle'){
   if(!await s.pass(0,`Balloon Battle on the rainbow ring. ${rv.name} is a CPU kart out to pop your three balloons: pop theirs first. Shells, bananas and bob-ombs pop balloons; a boosting bump steals one.`,`${name} — start your engine`,{soloTitle:'Balloon Battle'}))return;
   const r=await runRace({course:first,humans:[0],cpus:1,seed:seed0,rivalCpu:true});if(!r||!s.alive)return;
   const me=r.humans[0].balloons,them=r.rival?.balloons??0,b=n=>`${n} balloon${n===1?'':'s'}`;
   return s.finish([me,them],`Balloon Battle: ${name} ${b(me)} left, ${rv.name} ${b(them)}.`);}
  let course=first,idx=Math.max(0,T.COURSES.findIndex(C=>C.name===first.name)),total=0,cleared=0,ghost=null,best=Infinity,seed=seed0;
  for(;;){
   const text=mode==='time'?(ghost?`Time Trials · ${course.name}. Beat your record of ${fmtTime(best)}; your ghost races with you.`:`Time Trials · ${course.name}. Three laps alone with three mushrooms. Then race your own ghost: every new record keeps the run going.`)
    :`Grand Prix race ${cleared+1} · ${course.name}. Seven CPU racers. Finish in the top 3 to move on to the next course.`;
   if(!await s.pass(0,text,`${name} — start your engine`,{soloTitle:mode==='time'?`Lap attack ${cleared+1}`:`Race ${cleared+1}`,summary:cleared?`${total.toLocaleString()} points so far.`:null}))return;
   const r=await runRace({course,humans:[0],cpus:MD.cpus,seed,ghost,record:mode==='time'});if(!r||!s.alive)return;const me=r.humans[0];
   if(mode==='time'){const ok=me.finished&&me.finishT<best;if(me.finished)total+=Math.round(100000/me.finishT);
    if(!ok){s.setScores([total,0]);return soloFinish(s,total,cleared,`${course.name} time trial solo: ${cleared} record${cleared===1?'':'s'}; best ${best<Infinity?fmtTime(best):'no finish'}${me.finished&&best<Infinity?`, last ${fmtTime(me.finishT)}`:''}.`,cleared>0);}
    best=me.finishT;if(r.ghost){ghost=r.ghost;ghost.total=best;}cleared++;s.setScores([total,0]);soloProgress(s,total,cleared,`${course.name} time trial solo: best ${fmtTime(best)} after ${cleared} record${cleared===1?'':'s'}.`);continue;}
   total+=pts(me);s.setScores([total,0]);
   if(!me.finished||me.place>3)return soloFinish(s,total,cleared,`Grand Prix solo: ${cleared} podium${cleared===1?'':'s'}; ${course.name} ended ${me.finished?ord(me.place):'without a finish'}.`);
   cleared++;soloProgress(s,total,cleared,`Grand Prix solo: ${cleared} podium${cleared===1?'':'s'}, ${total} points.`);
   idx=(idx+1)%T.COURSES.length;course=T.COURSES[idx].build();seed=Math.floor(s.random()*1e9);}
 }
}
Object.assign(exports,{kart});
