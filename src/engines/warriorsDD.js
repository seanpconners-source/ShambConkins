// THE WARRIORS · COME OUT TO PLAY (id warriors-brawl, engine 'brawler'): a belt-scrolling beat 'em up that plays like the
// NES Double Dragon. Walk the street (up/down = depth), PUNCH, KICK, JUMP; enemies come in waves that lock the screen,
// then GO! to the next stretch and a boss at the end. Like the NES game you start with punch + kick and EARN moves as
// you level up (hearts): jump kick, hair grab + knees, the over-the-shoulder throw, back elbow, uppercut, the cyclone
// spin kick. On top (from the mobile fighters people love): a SPECIAL meter with three supers (Rising Fist, Twister,
// Warrior's Fury), weapons (bat, pipe, chain, whip, knives, barrels, crates, rocks), food, combos, holes to throw people into.
// Missions are the game's LOCATIONS (src/engines/dd/stages.js): the gangs wear that place's characters' faces and the boss
// is one of them (a locked one joins you when beaten). Bodies are drawn from poses (src/engines/dd/body.js) until the
// owner's sprite sheets are in (src/data/ddSprites.js).
// 1P Arcade: the campaign (solo 'levels'), continues, start from the furthest mission reached. 2P one phone: turns on the
// same missions (Arcade 2 missions each, board 1). Online: both fight the same missions at the same time on their own
// phones, partner's progress on screen; highest score wins.
const {clamp,seededRandom}=require("src/utils.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
const {snd}=require("src/engines/arenaKit.js");
const {noise}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const BD=require("src/engines/dd/body.js");
const ST=require("src/engines/dd/stages.js");
const DS=require("src/data/ddSprites.js");
const {faceSprite,drawFace,faceHeight,headFacts}=require("src/headFacts.js");

const FACE_W=15,FACE_UP=.42,VH=250,BACK=150,DEPTH=ST.DEPTH,FRONT=BACK+DEPTH,FIG=.9,G=980,SAVE='sc-warriors-v1';
// levels (hearts): XP needed for each level, and what it unlocks (the NES game's move ladder)
const LV_XP=[0,14,34,62,98,142,196];
const UNLOCK={2:['JUMP KICK','JUMP, then KICK in the air'],3:['HAIR GRAB + KNEE','Walk into a dazed enemy, then PUNCH'],4:['SHOULDER THROW','While holding someone, press KICK'],
 5:['BACK ELBOW','Hold the stick AWAY from your target + PUNCH'],6:['UPPERCUT','PUNCH a dazed enemy without moving'],7:['CYCLONE SPIN KICK','JUMP, then KICK right at the top']};
const SPECIALS=[{lv:1,bars:1,name:'RISING FIST',how:'1 bar · tap SPECIAL'},{lv:3,bars:2,name:'TWISTER',how:'2 bars · hold the stick forward + SPECIAL'},{lv:5,bars:3,name:"WARRIOR'S FURY",how:'3 bars (full) · tap SPECIAL'}];
// moves: seq = [pose, seconds] key poses, act = active segments, reach = [from,to] in front (negative = behind)
const MV={
 jab:{seq:[['jabC',.05],['jab',.07],['stand',.12]],act:[1],dmg:2,reach:[-12,48],kind:'light',sfx:'p',next:'cross'},
 cross:{seq:[['stand',.03],['cross',.07],['stand',.13]],act:[1],dmg:2,reach:[-12,50],kind:'light',sfx:'p',next:'hook'},
 hook:{seq:[['hookC',.07],['hook',.08],['stand',.2]],act:[1],dmg:3,reach:[-12,50],kind:'knock',kb:150,sfx:'P'},
 kick:{seq:[['kickC',.07],['kick',.09],['kickC',.06],['stand',.1]],act:[1],dmg:3,reach:[-12,60],kind:'push',kb:120,sfx:'k',next:'kick2'},
 kick2:{seq:[['kickC',.05],['kick',.09],['stand',.16]],act:[1],dmg:3,reach:[-12,62],kind:'knock',kb:170,sfx:'K'},
 bkick:{seq:[['stand',.03],['bkick',.1],['stand',.15]],act:[1],dmg:3,reach:[-54,-6],kind:'knock',kb:150,sfx:'k'},
 elbow:{seq:[['elbowC',.05],['elbow',.08],['stand',.15]],act:[1],dmg:6,reach:[-42,-4],kind:'knock',kb:170,sfx:'P'},
 up:{seq:[['upC',.08],['up',.11],['stand',.22]],act:[1],dmg:7,reach:[-12,48],kind:'launch',kb:130,sfx:'U'},
 dashp:{seq:[['cross',.16],['stand',.16]],act:[0],dmg:3,reach:[-12,52],kind:'knock',kb:180,sfx:'P',lunge:[170,0]},
 knee:{seq:[['kneeC',.06],['knee',.08],['kneeC',.1]],grab:true,dmg:3,sfx:'K'},
 throw:{seq:[['throw1',.14],['throw2',.18],['stand',.18]],grab:true,throwAt:1,dmg:6,sfx:'U'},
 swing:{seq:[['swing1',.1],['swing2',.1],['stand',.2]],act:[1],dmg:4,reach:[8,60],kind:'knock',kb:150,sfx:'B'},
 whip:{seq:[['swing1',.12],['swing2',.12],['stand',.24]],act:[1],dmg:3,reach:[10,78],kind:'light',sfx:'W'},
 toss:{seq:[['toss',.12],['stand',.18]],spawn:'knife'},
 heave:{seq:[['throw1',.1],['throw2',.14],['stand',.18]],spawn:'carry'},
 rise:{seq:[['rise1',.06],['rise2',.36],['stand',.16]],act:[1],dmg:8,reach:[-12,44],kind:'launch',kb:150,sfx:'S',inv:1,riseZ:80},
 twister:{seq:[['spin',.95],['stand',.15]],act:[0],dmg:2,reach:[-46,46],kind:'light',multi:.11,finish:'launch',sfx:'k',spin:1,lunge:[120,0],inv:1},
 ebash:{seq:[['crouch',.32],['cross',.22],['stand',.3]],act:[1],dmg:4,reach:[4,46],kind:'knock',kb:220,sfx:'P',lunge:[0,230]},
 bgrab:{seq:[['grab',.3],['stand',.2]],act:[0],grabber:1,reach:[4,34]},
 jkickE:{seq:[['jump',.12],['jkick',.42],['stand',.12]],act:[1],dmg:3,reach:[6,50],kind:'knock',kb:160,sfx:'K',lunge:[60,170],hop:300}};

async function warriorsDD(s){
 const [c,x]=s.canvas(900,500,{fill:true});const fb=fullBleed(s,{bg:'#06060a'});
 const online=!!s.online,solo=!!s.solo&&!online,board=s.origin==='board',nP=solo?1:2,names=s.players.map(p=>p.name||'Player');
 const skill=(()=>{try{return require("src/solo.js").cpuSkill?.(s)??.5;}catch{return .5;}})();
 const DIFF=solo?.8+skill*.5:1;   // enemy damage/aggression
 const save=(()=>{try{return JSON.parse(localStorage.getItem(SAVE)||'{}');}catch{return {};}})();
 const store_=v=>{try{localStorage.setItem(SAVE,JSON.stringify(Object.assign(save,v)));}catch{}};
 const seed=String(s.seed||1),MISS=ST.missions(seed);
 let bossPool=[];try{const rw=require('src/rewards.js');bossPool=[...new Set(s.players.slice(0,nP).flatMap(p=>{try{return rw.gameRecruitPool(s.game,store.profile,p).map(ch=>ch.id);}catch{return [];}}))];}catch{}
 s.gameRecruits=[[],[]];
 // ---- sounds (all our own, synthesized)
 const sfx={
  p:()=>{noise(.05,.05,{f0:2600,q:.6});snd(170,.06,{type:'square',vol:.035,to:90});},
  P:()=>{noise(.09,.08,{f0:1400});snd(120,.1,{type:'square',vol:.05,to:55});},
  k:()=>{noise(.06,.06,{f0:2000});snd(150,.07,{type:'square',vol:.04,to:80});},
  K:()=>{noise(.1,.08,{f0:1100});snd(100,.12,{type:'sawtooth',vol:.05,to:45});},
  U:()=>{noise(.14,.09,{f0:900});snd(90,.18,{type:'sawtooth',vol:.06,to:40});},
  B:()=>{noise(.08,.09,{f0:700});snd(210,.06,{type:'triangle',vol:.05,to:120});},
  W:()=>{noise(.05,.06,{f0:5000,type:'highpass'});snd(1400,.04,{type:'square',vol:.03,to:600});},
  S:()=>{snd(220,.3,{type:'sawtooth',vol:.05,to:880});noise(.3,.05,{f0:3000,type:'bandpass'});},
  whiff:()=>noise(.05,.025,{f0:3800,type:'bandpass'}),
  thud:()=>{snd(70,.16,{type:'sine',vol:.08,to:35});noise(.12,.05,{f0:400});},
  pick:()=>{snd(660,.06,{type:'square',vol:.035});snd(990,.08,{type:'square',vol:.035,delay:.06});},
  eat:()=>[523,659,784].forEach((f,i)=>snd(f,.08,{type:'triangle',vol:.05,delay:i*.07})),
  lvl:()=>[392,523,659,784,1047].forEach((f,i)=>snd(f,.1,{type:'square',vol:.04,delay:i*.08})),
  hurt:()=>snd(300,.12,{type:'square',vol:.04,to:180}),
  die:()=>snd(420,.7,{type:'triangle',vol:.06,to:60}),
  clear:()=>[523,659,784,1047,784,1047,1319].forEach((f,i)=>snd(f,.13,{type:'square',vol:.045,delay:i*.11})),
  boss:()=>[110,104,98,92].forEach((f,i)=>snd(f,.3,{type:'sawtooth',vol:.06,delay:i*.28}))};
 // music: an original driving street groove (bass + drums), on while fighting
 let musicOn=false,beat=0,nextBeat=0;const BASS=[45,45,57,45,43,43,55,43,41,41,53,41,43,43,55,47];
 function musicTick(now){if(!musicOn||s.paused)return;const spb=60/138/2;if(nextBeat===0)nextBeat=now;
  while(nextBeat<now+.3){const d=Math.max(0,nextBeat-now),i=beat%16,f=440*Math.pow(2,(BASS[i]-69)/12);
   snd(f,spb*.9,{type:'square',vol:.022,delay:d});if(i%4===0)snd(95,.12,{type:'sine',vol:.06,to:40,delay:d});if(i%8===4)noise(.1,.035,{f0:1800,delay:d});if(i%2===1)noise(.03,.012,{f0:8000,type:'highpass',delay:d});
   beat++;nextBeat+=spb;}}

 // ---- layout: the street band (world units) scaled to the screen; controls float in the corners / below the band
 let k=1,vw=600,bandY=0,portrait=false,U=40,BTN={},stickHome={x:0,y:0};
 function layout(){const W=s.W,H=s.H,top=(fb.top||40);portrait=H>W*1.05;
  if(portrait){k=Math.min(W/235,(H-top-60)*.64/VH,W>=560?W/480:1e9);bandY=top+46;}else if(W<H*1.4){k=Math.min(W/290,(H-top-40)*.82/VH,W>=560?W/480:1e9);bandY=top+46;portrait=true;}else{k=H/VH;bandY=0;}vw=W/k;
  U=clamp(Math.min(W,H)*.072,27,48);const m=Math.max(12,U*.4),bx=W-m,by=H-m;
  BTN={punch:{x:bx-U*3.15,y:by-U,r:U,label:'PUNCH',col:'#e84a3c'},kick:{x:bx-U,y:by-U*1.7,r:U,label:'KICK',col:'#3c8ce8'},
   jump:{x:bx-U*1.05,y:by-U*4.05,r:U*.74,label:'JUMP',col:'#4cb85c'},special:{x:bx-U*3.4,y:by-U*3.45,r:U*.74,label:'SPECIAL',col:'#e8b83c'}};
  stickHome={x:m+U*1.6,y:by-U*1.6};}
 const SX=wx=>(wx-cam.x)*k,SY=wy=>bandY+wy*k;

 // ---- input: floating stick on the left, four buttons on the right, keys, a test bot
 const inp={sx:0,sy:0,held:{},press:{},stick:null,lastTapX:0,lastTapT:0,runFlag:false,keys:{}};
 const pressBtn=b=>{inp.press[b]=performance.now();inp.held[b]=true;vibrate(8);};
 s.on(c,'pointerdown',ev=>{ev.preventDefault();const p=s.pointer(ev);if(ui.tap(p))return;
  if(!fighting())return;
  let best=null,bd=1e9;for(const [n,b] of Object.entries(BTN)){const d=Math.hypot(p.x-b.x,p.y-b.y);if(d<b.r*1.4&&d<bd){bd=d;best=n;}}
  if(best){inp.btnPtr=inp.btnPtr||{};inp.btnPtr[ev.pointerId]=best;pressBtn(best);s.capture?.(ev);return;}
  if(p.x<s.W*.5&&!inp.stick){const now=performance.now();inp.stick={id:ev.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y};s.capture?.(ev);inp.tapT=now;}});
 s.on(c,'pointermove',ev=>{const p=s.pointer(ev);
  if(inp.stick&&ev.pointerId===inp.stick.id){const R=U*1.25;let dx=p.x-inp.stick.ox,dy=p.y-inp.stick.oy,l=Math.hypot(dx,dy);
   if(l>R*1.6){inp.stick.ox+=dx*(1-R*1.6/l);inp.stick.oy+=dy*(1-R*1.6/l);dx=p.x-inp.stick.ox;dy=p.y-inp.stick.oy;}inp.stick.x=p.x;inp.stick.y=p.y;return;}
  const b=inp.btnPtr?.[ev.pointerId];if(b){// a thumb rolling from one button onto another presses it (punch → kick)
   for(const [n,bb] of Object.entries(BTN))if(n!==b&&Math.hypot(p.x-bb.x,p.y-bb.y)<bb.r*.95){inp.held[b]=false;inp.btnPtr[ev.pointerId]=n;pressBtn(n);break;}}});
 const up=ev=>{if(inp.stick&&ev.pointerId===inp.stick.id){inp.stick=null;}const b=inp.btnPtr?.[ev.pointerId];if(b){inp.held[b]=false;delete inp.btnPtr[ev.pointerId];}};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 const KEYMAP={j:'punch',J:'punch',z:'punch',k:'kick',K:'kick',x:'kick',' ':'jump',l:'special',L:'special',c:'special'};
 s.on(document,'keydown',ev=>{if(ui.key(ev))return;inp.keys[ev.key]=true;const b=KEYMAP[ev.key];if(b&&!ev.repeat){ev.preventDefault();pressBtn(b);}if(ev.key.startsWith('Arrow'))ev.preventDefault();});
 s.on(document,'keyup',ev=>{inp.keys[ev.key]=false;const b=KEYMAP[ev.key];if(b)inp.held[b]=false;});
 function readStick(){let sx=0,sy=0;const K=inp.keys;if(K.ArrowLeft||K.a||K.A)sx-=1;if(K.ArrowRight||K.d||K.D)sx+=1;if(K.ArrowUp||K.w||K.W)sy-=1;if(K.ArrowDown||K.s||K.S)sy+=1;
  if(inp.stick){const R=U*1.25,dx=(inp.stick.x-inp.stick.ox)/R,dy=(inp.stick.y-inp.stick.oy)/R,l=Math.hypot(dx,dy);if(l>.18){const m=Math.min(1,l);sx=dx/l*m;sy=dy/l*m;}}
  if(bot.on)({sx,sy}=bot.stick);
  inp.sx=clamp(sx,-1,1);inp.sy=clamp(sy,-1,1);}
 const took=(b,win=.2)=>{const t=inp.press[b];if(t&&performance.now()-t<win*1000){inp.press[b]=0;return true;}return false;};
 const bot={on:false,stick:{sx:0,sy:0},t:0};

 // ---- the world
 let st=null,cam={x:0,lockA:-1e9,lockB:1e9},F=[],items=[],props=[],shots=[],fx=[],hero=null,wave=-1,waveQ=[],phase='title',phaseT=0,t=0,
  hitstop=0,shakeT=0,slow=0,banner=null,lvBanner=null,combo={n:0,t:0},target=null,goT=0,bossOn=false,bossF=null,run=null,partner=null,missionNo=0;
 const living=side=>F.filter(f=>f.side===side&&f.st!=='dead'&&!f.gone);
 function makeFighter(o){const f=Object.assign({x:0,d:DEPTH/2,z:0,vx:0,vd:0,vz:0,dir:1,st:'idle',stT:0,pose:{...BD.P.stand},mv:null,inv:0,flash:0,daze:[],hp:10,maxHp:10,big:1,weapon:null,carry:null,cd:1,walkPh:0},o);return f;}
 function spawnHero(){const h=makeFighter({side:'hero',pi:cur,o:BD.OUTFIT[cur?'p2':'p1'],hp:30,maxHp:30,x:cam.x+80,d:DEPTH*.55,dir:1,sheet:cur?'hero-p2':'hero-p1',inv:1.5});return h;}
 function spawnFoe(sp,boss=false){const T=boss?{hp:sp.hp,sp:60,moves:['jab','cross','hook','kick2','jkickE','ebash'],pts:5000,o:'boss',name:'Boss',big:1.14,noGrab:true}:ST.FOES[sp.type];
  const side=sp.side||1,xx=side>0?cam.x+vw+30+Math.random()*30:cam.x-30-Math.random()*30;
  const hpK=1+st.n*.1;const f=makeFighter({side:'foe',type:boss?'boss':sp.type,T,o:BD.OUTFIT[T.o],big:T.big||1,hp:Math.round(T.hp*(boss?1:hpK)),x:xx,d:clamp(sp.d??Math.random()*DEPTH,4,DEPTH-4),dir:-side,
   face:sp.face,sheet:'foe-'+(boss?'boss':sp.type),weapon:T.weapon?{kind:T.weapon,uses:99,foe:1}:null,ai:{cool:.8+Math.random(),hover:Math.random()*Math.PI*2,mode:'in'},boss});f.maxHp=f.hp;F.push(f);return f;}

 // ---- missions
 async function playMission(n){st=ST.buildStage(MISS[n%MISS.length],n,seed,bossPool);missionNo=n;
  await DS.ready(['far-'+st.biome,'wall-'+st.biome,'floor-'+st.biome],2500);
  cam={x:0,lockA:-1e9,lockB:1e9};F=[];shots=[];fx=[];wave=-1;waveQ=[];bossOn=false;bossF=null;target=null;combo={n:0,t:0};
  items=st.items.map(i=>({...i,z:0}));props=st.props.map(p=>({...p,hp:2}));
  hero=spawnHero();hero.x=60;F.push(hero);Object.assign(hero,{hp:run.hp??hero.maxHp});
  phase='card';phaseT=0;banner={big:`MISSION ${n+1}`,small:st.name.toUpperCase(),sub:st.source,t:2.4};musicOn=true;
  return new Promise(r=>{run.done=r;});}
 function triggerWaves(){if(phase!=='play')return;
  if(wave+1<st.waves.length&&living('foe').length===0&&waveQ.length===0&&hero.x>=st.waves[wave+1].at-vw*.3){wave++;const W=st.waves[wave];cam.lockA=cam.lockB=cam.x;waveQ=W.list.map(e=>({...e,at:t+e.delay}));goT=0;}
  if(waveQ.length){const engaged=living('foe').length,W=st.waves[wave];for(let i=0;i<waveQ.length;i++){if(waveQ[i].at<=t&&engaged<W.max+2){spawnFoe(waveQ.splice(i,1)[0]);break;}}}
  if(wave>=0&&waveQ.length===0&&living('foe').length===0&&cam.lockB<1e8&&!bossOn){cam.lockA=-1e9;cam.lockB=1e9;goT=3.5;}
  if(!bossOn&&wave===st.waves.length-1&&waveQ.length===0&&living('foe').length===0&&hero.x>=st.boss.at){bossOn=true;cam.x=cam.lockA=cam.lockB=Math.max(0,st.len-vw);
   bossF=spawnFoe(st.boss,true);bossF.x=cam.x+vw+40;for(let i=0;i<st.boss.minions;i++){const mm=spawnFoe({type:'thug',face:pickCast(),side:i%2?-1:1});mm.hp=Math.round(mm.hp*.7);}
   banner={big:(bossF.face?nameOf(bossF.face):'THE BOSS').toUpperCase(),small:'BOSS',t:2,boss:true};sfx.boss();vibrate([40,40,40]);}}
 const pickCast=()=>st.cast.length?st.cast[Math.floor(Math.random()*st.cast.length)]:null;
 function nameOf(id){try{return require("src/characters.js").CHARACTERS.find(c=>c.id===id)?.name||id;}catch{return id;}}

 // ---- moves
 function startMove(f,name){const def=MV[name];if(!def)return;f.mv={name,def,seg:0,segT:0,hit:new Set(),multiT:0,chainQ:null};f.st='atk';f.stT=0;
  if(def.inv)f.inv=Math.max(f.inv,def.seq.reduce((a,q)=>a+q[1],0));if(def.hop){f.vz=def.hop;}if(def.act&&!def.grab)sfx.whiff();}
 function moveStep(f,dt){const m=f.mv,def=m.def;m.segT+=dt;const seg=def.seq[m.seg];
  if(def.lunge)f.x+=(def.lunge[m.seg]||0)*f.dir*dt;
  if(def.riseZ&&m.seg===1)f.z=Math.sin(Math.min(1,m.segT/seg[1])*Math.PI)*def.riseZ;
  if(def.spin){f.spinA=(f.spinA||0)+dt*22;if(Math.floor(f.spinA/Math.PI)%2!==Math.floor((f.spinA-dt*22)/Math.PI)%2)sfx.whiff();}
  if(def.act&&def.act.includes(m.seg)){if(def.multi){m.multiT-=dt;if(m.multiT<=0){m.multiT=def.multi;m.hit.clear();}}attackCheck(f,def,m);}
  if(def.grabber&&m.seg===0&&m.segT>=seg[1]*.7&&!m.grabbed){m.grabbed=true;const h=hero;if(h&&canBeHit(h)&&Math.abs(h.d-f.d)<12&&(h.x-f.x)*f.dir>0&&(h.x-f.x)*f.dir<46){h.st='held';h.stT=0;h.heldBy=f;h.escape=0;f.st='holding';f.stT=0;f.mv=null;return;}}
  if(def.grab&&m.seg===(def.throwAt??1)&&!m.done&&m.segT>seg[1]*.5){m.done=true;const v=f.grabbed;if(v){if(def.throwAt!=null){throwVictim(f,v);}else{damage(f,v,def.dmg,'light',0,def);v.st='grabbed';f.knees=(f.knees||0)+1;if(f.knees>=3){releaseGrab(f,true);}}}}
  if(def.spawn&&m.seg===0&&m.segT>=seg[1]&&!m.done){m.done=true;spawnShot(f,def.spawn);}
  if(m.segT>=seg[1]){m.seg++;m.segT=0;
   // a queued chain move starts right after the hit lands (cancel the recovery)
   if(m.chainQ&&m.seg>=Math.max(...(def.act||[0]))+1){const q=m.chainQ;f.mv=null;f.st='idle';startMove(f,q);return;}
   if(m.seg>=def.seq.length){f.mv=null;f.st=f.grabbed?'grabbing':'idle';f.spinA=0;if(def.spin&&def.finish){/* last spin hit */}}}}
 function poseOf(f){if(f.mv){const sg=f.mv.def.seq[Math.min(f.mv.seg,f.mv.def.seq.length-1)];return sg[0];}
  switch(f.st){case 'walk':{const ph=f.walkPh%4;return ['walk1','walk2','walk3','walk2'][Math.floor(ph)];}
   case 'run':return Math.floor(f.walkPh*1.4)%2?'run2':'run1';case 'air':return f.airAtk==='spin'?'spin':f.airAtk?'jkick':'jump';
   case 'hurt':return 'hurt';case 'dizzy':case 'grabbed':return 'dizzy';case 'held':return 'hurt';case 'fall':return 'fall';case 'down':case 'dead':return 'down';case 'pit':return 'fall';
   case 'getup':return 'kneel';case 'grabbing':return 'grab';case 'holding':return 'grab';case 'win':return 'win';case 'carry':return 'throw1';
   default:return Math.sin(t*3+(f.pi||0))>0?'stand':'stand2';}}
 const canBeHit=v=>v&&v.inv<=0&&!['down','dead','getup','fall','pit','gone'].includes(v.st)&&!v.gone;
 function attackCheck(f,def,m){const foes=f.side==='hero'?living('foe'):living('hero');
  for(const v of foes){if(m.hit.has(v)||!canBeHit(v))continue;const dx=(v.x-f.x)*f.dir,dd=Math.abs(v.d-f.d),zz=Math.abs(v.z-f.z);
   const lo=def.reach[0]*f.big,hi=def.reach[1]*f.big;if(dd>(f.side==='hero'?17:11)*Math.max(f.big,v.big)||zz>50)continue;
   if(!(dx>=Math.min(lo,hi)&&dx<=Math.max(lo,hi)))continue;
   m.hit.add(v);const kind=def.spin&&f.mv&&f.mv.seg===0&&f.mv.segT>def.seq[0][1]-.13?def.finish:def.kind;
   if(def.grabber)continue;
   let dmg=def.dmg;if(f.side==='hero'&&f.weapon&&f.mv.name==='swing'){dmg=WPN[f.weapon.kind]?.dmg||4;f.weapon.uses--;if(f.weapon.uses<=0){f.weapon=null;banner2('WEAPON BROKE');}}
   damage(f,v,dmg,kind,def.kb||60,def);
   if(def.sfx)sfx[def.sfx]?.();}
  // props break when hit
  if(f.side==='hero')for(const p of props){if(m.hit.has(p))continue;const dx=(p.x-f.x)*f.dir;if(Math.abs(p.d-f.d)<14&&dx>def.reach[0]&&dx<def.reach[1]+10){m.hit.add(p);breakProp(p);}}}
 const WPN={bat:{dmg:5,uses:14},pipe:{dmg:6,uses:12},chain:{dmg:5,uses:16},whip:{dmg:4,uses:16},knife:{dmg:5,uses:3}};
 function damage(a,v,dmg,kind,kb,def){if(!canBeHit(v)&&v.st!=='grabbed')return;
  const heroHit=a&&a.side==='hero';if(heroHit)dmg*=1+.07*(run.lv-1);else dmg*=DIFF*(v.side==='hero'?1:1);
  v.hp-=dmg;v.flash=.14;hitstop=kind==='light'||kind==='push'?.045:.08;spark(v,a);
  if(heroHit){gainXP(kind==='light'?1:2);run.meter=Math.min(300,run.meter+9);run.score+=50*Math.round(dmg);combo.n++;combo.t=1.4;target=v;}
  else if(v.side==='hero'){run.meter=Math.min(300,run.meter+13);run.hurt=true;sfx.hurt();vibrate(25);}
  const dirx=Math.sign(v.x-(a?a.x:v.x))||1;
  if(v.hp<=0){knockdown(v,dirx*Math.max(140,Math.abs(kb||0)),kind==='launch'?360:250,true,a);return;}
  if(kind==='knock'||kind==='launch'){knockdown(v,dirx*Math.abs(kb||150),kind==='launch'?360:220,false,a);return;}
  // light/push: a stagger; two quick hits = dazed (grab / uppercut window, Double Dragon's bent-over enemy)
  if(v.st==='grabbed')return;
  v.mv=null;v.st='hurt';v.stT=0;v.vx=dirx*(kind==='push'?160:70);v.dir=-dirx;
  v.daze=v.daze.filter(q=>t-q<1.1);v.daze.push(t);if(v.daze.length>=2&&v.side==='foe'){v.dazed=true;}}
 function knockdown(v,vx,vz,dead,a){if(v.grabbedBy)releaseGrab(v.grabbedBy,false);if(v.grabbed)releaseGrab(v,false);if(v.heldBy){v.heldBy.st='idle';v.heldBy=null;}
  v.mv=null;v.st='fall';v.stT=0;v.vx=vx;v.vz=vz;v.dir=-Math.sign(vx)||v.dir;v.dead=dead;v.dazed=false;shakeT=.18;sfx.thud();
  if(v.side==='foe'&&v.weapon?.foe&&Math.random()<.65){items.push({x:v.x,d:v.d,z:20,vz:120,kind:v.weapon.kind});v.weapon=null;}
  if(v.side==='hero'&&v.weapon){items.push({x:v.x,d:v.d,z:20,vz:120,kind:v.weapon.kind,uses:v.weapon.uses});v.weapon=null;}
  if(v.side==='hero'&&v.carry){v.carry=null;}}
 function throwVictim(f,v){releaseGrab(f,false);v.x=f.x-f.dir*6;knockdown(v,-f.dir*230,300,false,f);v.thrown=true;v.hp-=MV.throw.dmg*(1+.07*(run.lv-1));v.flash=.2;gainXP(3);run.score+=300;if(v.hp<=0)v.dead=true;}
 function grabStart(f,v){f.st='grabbing';f.stT=0;f.grabbed=v;f.knees=0;v.st='grabbed';v.stT=0;v.grabbedBy=f;v.mv=null;v.dir=-f.dir;v.x=f.x+f.dir*22;v.d=f.d;}
 function releaseGrab(f,knock){const v=f.grabbed;f.grabbed=null;if(f.st==='grabbing')f.st='idle';if(!v)return;v.grabbedBy=null;if(knock)knockdown(v,f.dir*160,220,v.hp<=0,f);else if(v.st==='grabbed'){v.st='hurt';v.stT=0;}}
 function gainXP(n){if(!run)return;run.xp+=n;while(run.lv<7&&run.xp>=LV_XP[run.lv]){run.lv++;const u=UNLOCK[run.lv];sfx.lvl();vibrate([20,40,20]);
   const sp=SPECIALS.find(q=>q.lv===run.lv);lvBanner={t:3.4,lv:run.lv,name:u?u[0]:sp?.name,how:u?u[1]:sp?.how,sp:sp&&!u?1:0};if(sp&&u)setTimeout(()=>{lvBanner={t:3,lv:run.lv,name:sp.name,how:sp.how,sp:1};},3400);}}
 const banner2=txt=>{fx.push({kind:'txt',txt,x:hero.x,d:hero.d,z:110,t:1});};
 function spark(v,a){fx.push({kind:'hit',x:v.x-(v.x-(a?a.x:v.x))*.35,d:v.d,z:v.z+60*v.big,t:.22});}
 function breakProp(p){if(p.broken)return;p.hp--;sfx.B();if(p.hp<=0){p.broken=true;fx.push({kind:'debris',x:p.x,d:p.d,z:20,t:.5});if(p.hides)items.push({x:p.x,d:p.d,z:10,vz:140,kind:p.hides});props=props.filter(q=>q!==p);}}
 function spawnShot(f,what){if(what==='knife'){shots.push({x:f.x+f.dir*24,d:f.d,z:50,vx:f.dir*360,vz:0,kind:'knife',side:f.side,dmg:f.side==='hero'?6:3,life:1.4});if(f.weapon&&f.side==='hero'){f.weapon.uses--;if(f.weapon.uses<=0)f.weapon=null;}sfx.W();}
  else if(what==='carry'&&f.carry){const kd=f.carry.kind;shots.push({x:f.x+f.dir*20,d:f.d,z:kd==='barrel'?16:70,vx:f.dir*(kd==='barrel'?280:330),vz:kd==='barrel'?0:60,kind:kd,side:f.side,dmg:kd==='rock'?7:6,life:2.2,roll:kd==='barrel',hides:f.carry.hides});f.carry=null;sfx.U();}}

 // ---- per-frame update
 function step(dt){t+=dt;if(hitstop>0){hitstop-=dt;return;}if(slow>0){slow-=dt;dt*=.3;}
  readStick();if(bot.on)botThink(dt);
  // the hero
  if(hero&&phase==='play')heroStep(hero,dt);
  for(const f of F){if(f.side==='foe'&&phase==='play')foeStep(f,dt);physics(f,dt);f.inv=Math.max(0,f.inv-dt);f.flash=Math.max(0,f.flash-dt);
   // the pose eases toward the key pose: quick for strikes, softer for walking
   const want=BD.P[poseOf(f)]||BD.P.stand,rate=f.mv?(f.mv.def.seq[f.mv.seg]?(2.6/Math.max(.04,f.mv.def.seq[f.mv.seg][1])):20):f.st==='walk'||f.st==='run'?14:10;
   f.pose=BD.blend(f.pose,want,1-Math.exp(-dt*rate));f.poseName=poseOf(f);}
  // shots
  for(const sh of shots){sh.x+=sh.vx*dt;sh.z+=sh.vz*dt;if(!sh.roll){sh.vz-=G*.25*dt;}sh.life-=dt;if(sh.z<=0&&!sh.roll){sh.z=0;sh.life=Math.min(sh.life,.05);}
   const targets=sh.side==='hero'?living('foe'):living('hero');for(const v of targets){if(canBeHit(v)&&Math.abs(v.x-sh.x)<18&&Math.abs(v.d-sh.d)<12&&sh.z<v.z+100*v.big){const owner=sh.side==='hero'?hero:null;damage(owner,v,sh.dmg,'knock',sh.vx*.5,{});sfx.P();if(!sh.roll){sh.life=0;if(sh.hides)items.push({x:sh.x,d:sh.d,z:20,vz:120,kind:sh.hides});}}}}
  shots=shots.filter(q=>q.life>0&&q.x>cam.x-80&&q.x<cam.x+vw+80);
  for(const i of items){if(i.z>0||i.vz){i.vz=(i.vz||0)-G*dt;i.z=Math.max(0,i.z+i.vz*dt);if(i.z===0)i.vz=0;}}
  for(const q of fx)q.t-=dt;fx=fx.filter(q=>q.t>0);
  if(combo.t>0){combo.t-=dt;if(combo.t<=0)combo.n=0;}
  // camera: follow the hero, never back, locked during a wave
  if(hero&&phase==='play'){const want=clamp(hero.x-vw*.4,Math.max(cam.x,0),Math.max(0,st.len-vw));cam.x=clamp(want,cam.lockA,cam.lockB);if(cam.lockB<1e8)cam.x=cam.lockA;}
  triggerWaves();
  if(goT>0)goT-=dt;if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}if(lvBanner){lvBanner.t-=dt;if(lvBanner.t<=0)lvBanner=null;}if(shakeT>0)shakeT-=dt;
  // remove the beaten
  for(const f of F)if(f.st==='dead'&&f.stT>1.1&&f.side==='foe'){f.gone=true;run.score+=f.T.pts;gainXP(f.boss?10:3);if(f.boss)bossBeaten(f);}
  F=F.filter(f=>!f.gone||f.side==='hero');}
 function physics(f,dt){f.stT+=dt;
  if(f.z>0||f.vz>0){f.z+=f.vz*dt;f.vz-=G*dt;if(f.z<=0){f.z=0;land(f);}}
  if(f.st==='hurt'||f.st==='fall'||f.st==='down'||f.st==='dead'){f.x+=f.vx*dt;f.vx*=Math.exp(-dt*(f.z>0?.6:7));}
  if(f.st==='hurt'&&f.stT>.28){f.st=f.dazed?'dizzy':'idle';f.stT=0;}
  if(f.st==='dizzy'&&f.stT>1){f.st='idle';f.dazed=false;}
  if(f.st==='down'&&f.stT>(f.side==='hero'?.75:.9)){if(f.dead){f.st='dead';f.stT=0;if(f.side==='hero')heroOut(f);}else{f.st='getup';f.stT=0;}}
  if(f.st==='getup'&&f.stT>.42){f.st='idle';f.inv=f.side==='hero'?1.2:.45;}
  if(f.st==='grabbed'&&f.grabbedBy&&f.grabbedBy.st!=='grabbing'&&f.grabbedBy.st!=='atk'){f.grabbedBy.grabbed=null;f.grabbedBy=null;f.st='idle';}
  if(f.st==='grabbing'&&f.stT>2.4)releaseGrab(f,false);
  if(f.st==='holding'&&f.stT>1.8){f.st='idle';if(hero.heldBy===f){hero.heldBy=null;hero.st='idle';}}
  if(f.st==='held'){// the bruiser has you: mash buttons to break free, he punches meanwhile
   const by=f.heldBy;if(!by||by.st!=='holding'){f.st='idle';f.heldBy=null;}else{f.x=by.x+by.dir*24;f.d=by.d;f.escape-=dt*.2;if(Math.floor(f.stT/.55)>Math.floor((f.stT-dt)/.55)&&f.stT>.3){damage(by,f,2,'light',0,{});f.st='held';}
    if(f.escape>=1||f.stT>1.8){f.st='idle';f.heldBy=null;by.st='idle';by.stT=0;f.inv=.6;}}}
  // pits: a fighter on the ground over a hole falls in
  if(f.z===0&&!['fall','pit','dead','gone'].includes(f.st))for(const [a,b] of st.pits)if(f.x>a+6&&f.x<b-6){f.st='pit';f.stT=0;f.vz=0;f.mv=null;sfx.die();if(f.side==='foe'){run.score+=500;gainXP(4);fx.push({kind:'txt',txt:'BYE!',x:f.x,d:f.d,z:60,t:1});}}
  if(f.st==='pit'){f.z-=420*dt*Math.min(1,f.stT*3);if(f.stT>.8){if(f.side==='foe'){f.gone=true;}else{heroPit(f);}}}
  f.d=clamp(f.d,2,DEPTH-2);
  if(f.side==='hero'){const lo=cam.x+14,hi=cam.lockB<1e8?cam.x+vw-14:st.len-14;f.x=clamp(f.x,lo,hi);}}
 function land(f){if(f.st==='fall'){f.st='down';f.stT=0;f.vz=0;sfx.thud();fx.push({kind:'dust',x:f.x,d:f.d,z:0,t:.35});
   if(f.thrown){f.thrown=false;for(const o of living(f.side))if(o!==f&&canBeHit(o)&&Math.abs(o.x-f.x)<34&&Math.abs(o.d-f.d)<14)knockdown(o,Math.sign(o.x-f.x)*160,200,o.hp<=0,null);}}
  else if(f.st==='air'){f.st='idle';f.airAtk=null;f.vx=0;fx.push({kind:'dust',x:f.x,d:f.d,z:0,t:.25});}
  else if(f.mv&&f.mv.def.hop){}
  else if(f.mv&&f.mv.def.riseZ){}}
 function heroStep(h,dt){if(['hurt','fall','down','getup','pit','dead','held','grabbed'].includes(h.st)){if(h.st==='held'&&(took('punch',.3)||took('kick',.3)||took('jump',.3)))h.escape+=.22;return;}
  const sx=inp.sx,sy=inp.sy,mov=Math.hypot(sx,sy)>.2;
  // running: stick pushed all the way for a moment
  if(Math.abs(sx)>.9){h.runT=(h.runT||0)+dt;}else h.runT=0;const running=h.runT>.28&&!h.carry;
  if(h.st==='atk'){moveStep(h,dt);bufferChain(h);return;}
  if(h.st==='air'){h.x+=h.vx*dt;h.d+=sy*30*dt;
   if(!h.airAtk&&took('kick')&&run.lv>=2){if(run.lv>=7&&Math.abs(h.vz)<170){h.airAtk='spin';h.spinT=0;sfx.K();}else{h.airAtk='jkick';sfx.k();}h.airHit=new Set();}
   if(!h.airAtk&&took('punch')){h.airAtk='jkick';h.airHit=new Set();}
   if(h.airAtk){const def=h.airAtk==='spin'?{reach:[-50,50],dmg:6,kind:'launch',kb:170,spin:0}:{reach:[6,50],dmg:4,kind:'knock',kb:170};if(h.airAtk==='spin'){h.spinT+=dt;h.dir=Math.floor(h.spinT/.07)%2?-h.baseDir:h.baseDir;}
    const m={hit:h.airHit};for(const v of living('foe')){if(m.hit.has(v)||!canBeHit(v))continue;const dx=(v.x-h.x)*(h.airAtk==='spin'?1:h.dir),dd=Math.abs(v.d-h.d);if(dd>12)continue;
     const ok=h.airAtk==='spin'?Math.abs(v.x-h.x)<50:dx>=def.reach[0]&&dx<=def.reach[1];if(ok){m.hit.add(v);damage(h,v,def.dmg,def.kind,def.kb*Math.sign(v.x-h.x),def);sfx.K();}}}
   return;}
  if(h.st==='grabbing'){const v=h.grabbed;if(!v||v.st!=='grabbed'){releaseGrab(h,false);return;}v.x=h.x+h.dir*22;v.d=h.d;
   if(took('kick'))startMove(h,run.lv>=4?'throw':'knee');else if(took('punch'))startMove(h,'knee');
   if(Math.abs(sx)>.6&&Math.sign(sx)!==h.dir&&h.stT>.3)releaseGrab(h,false);return;}
  if(h.st==='carry'){h.x+=sx*55*dt;h.d+=sy*35*dt;if(Math.abs(sx)>.2)h.dir=Math.sign(sx);if(took('punch')||took('kick'))startMove(h,'heave');return;}
  // move
  if(mov){h.x+=sx*(running?150:76)*dt;h.d+=sy*48*dt;if(Math.abs(sx)>.2)h.dir=Math.sign(sx);h.walkPh+=dt*(running?9:7);h.st=running?'run':'walk';}else{h.st='idle';}
  // walking into a dazed enemy grabs them (level 3)
  if(run.lv>=3&&mov&&Math.abs(sx)>.3){for(const v of living('foe'))if(v.st==='dizzy'&&!v.T.noGrab&&Math.abs(v.d-h.d)<10&&(v.x-h.x)*h.dir>0&&(v.x-h.x)*h.dir<30){grabStart(h,v);sfx.pick();return;}}
  // food under the feet
  for(const i of items)if(FOOD[i.kind]&&Math.abs(i.x-h.x)<20&&Math.abs(i.d-h.d)<12&&i.z===0){h.hp=Math.min(h.maxHp,h.hp+FOOD[i.kind]);i.gone=true;sfx.eat();fx.push({kind:'txt',txt:'+'+FOOD[i.kind],x:h.x,d:h.d,z:110,t:1});}
  items=items.filter(i=>!i.gone);
  const away=Math.abs(sx)>.5&&Math.sign(sx)!==faceTo(h);
  if(took('jump')){h.st='air';h.vz=330;h.vx=running?h.dir*170:sx*80;h.baseDir=h.dir;h.airAtk=null;if(running&&inp.held.kick)h.airAtk='jkick';sfx.whiff();return;}
  if(took('special')){special(h,sx);return;}
  if(took('punch')){autoFace(h,sx);
   if(h.weapon){startMove(h,h.weapon.kind==='knife'?'toss':'swing');return;}
   const it=items.find(i=>!FOOD[i.kind]&&Math.abs(i.x-h.x)<24&&Math.abs(i.d-h.d)<12&&i.z===0),pr=props.find(p=>p.kind==='barrel'&&Math.abs(p.x-h.x)<26&&Math.abs(p.d-h.d)<12);
   if((it||pr)&&!enemyNear(h,46)){if(it){items=items.filter(q=>q!==it);if(['rock'].includes(it.kind)){h.carry={kind:'rock'};h.st='carry';}else h.weapon={kind:it.kind,uses:it.uses||WPN[it.kind].uses};}else{props=props.filter(q=>q!==pr);h.carry={kind:'barrel',hides:pr.hides};h.st='carry';}sfx.pick();return;}
   if(run.lv>=5&&away){startMove(h,'elbow');return;}
   if(running){startMove(h,'dashp');return;}
   const dz=living('foe').find(v=>v.st==='dizzy'&&Math.abs(v.d-h.d)<10&&(v.x-h.x)*h.dir>0&&(v.x-h.x)*h.dir<42);
   if(run.lv>=6&&dz&&!mov){startMove(h,'up');return;}
   startMove(h,'jab');return;}
  if(took('kick')){autoFace(h,sx);if(away){startMove(h,'bkick');return;}if(running&&run.lv>=2){h.st='air';h.vz=260;h.vx=h.dir*200;h.airAtk='jkick';h.airHit=new Set();h.baseDir=h.dir;return;}startMove(h,'kick');return;}}
 function bufferChain(h){const m=h.mv;if(!m||m.chainQ||!m.def.next)return;const actEnd=Math.max(...(m.def.act||[0]));if(m.seg<actEnd)return;
  if(m.def.next==='kick2'?took('kick',.25):took('punch',.25))m.chainQ=m.def.next;}
 const faceTo=h=>h.dir;
 function autoFace(h,sx){const moving=Math.abs(sx)>.2;let best=null,bd=moving?70:90;for(const v of living('foe')){if(!canBeHit(v)&&v.st!=='dizzy')continue;if(moving&&(v.x-h.x)*Math.sign(sx)<-14)continue;const d=Math.abs(v.x-h.x)+Math.abs(v.d-h.d)*2;if(d<bd){bd=d;best=v;}}
  if(best){if(!moving)h.dir=Math.sign(best.x-h.x)||h.dir;if(Math.abs(best.d-h.d)<24)h.d+=(best.d-h.d)*.8;}}   // QoL: face and line up with the nearest enemy
 const enemyNear=(h,r)=>living('foe').some(v=>Math.abs(v.x-h.x)<r&&Math.abs(v.d-h.d)<14);
 function special(h,sx){const bars=Math.floor(run.meter/100);if(bars<1){fx.push({kind:'txt',txt:'NEED 1 BAR',x:h.x,d:h.d,z:110,t:.8});return;}
  if(bars>=3&&run.lv>=5){run.meter-=300;fury(h);return;}
  if(bars>=2&&run.lv>=3&&Math.abs(sx)>.4){run.meter-=200;h.dir=Math.sign(sx);startMove(h,'twister');fx.push({kind:'sp',name:'TWISTER',t:1});sfx.S();return;}
  run.meter-=100;startMove(h,'rise');fx.push({kind:'sp',name:'RISING FIST',t:1});sfx.S();}
 function fury(h){slow=.9;shakeT=.5;vibrate([30,30,60]);fx.push({kind:'sp',name:"WARRIOR'S FURY",t:1.4,big:1});sfx.S();setTimeout(()=>sfx.S(),200);
  h.inv=2;for(const v of living('foe')){if(Math.abs(v.x-h.x)<vw*.7&&v.x>cam.x-10&&v.x<cam.x+vw+10){setTimeout(()=>{if(!s.alive)return;damage(h,v,12,'launch',Math.sign(v.x-h.x)*200,{});sfx.U();},250+Math.random()*450);}}}
 const FOOD={chicken:12,burger:8,pizza:6};
 // ---- enemies
 function foeStep(f,dt){if(['hurt','fall','down','getup','pit','dead','grabbed','dizzy'].includes(f.st)||f.gone)return;
  if(f.st==='atk'){moveStep(f,dt);return;}if(f.st==='holding')return;
  const h=hero;if(!h||h.st==='dead'||h.st==='pit'){f.st='idle';return;}
  const T=f.T,ai=f.ai;ai.cool-=dt*DIFF;
  // only a few press the attack at once (fair fights, like the NES game); the rest circle at a distance
  const attackers=living('foe').filter(o=>o.ai?.mode==='in').length,cap=(st.waves[wave]?.max||2)+(bossOn?1:0);
  if(ai.mode!=='in'&&attackers<cap&&Math.random()<dt*1.5)ai.mode='in';if(ai.mode==='in'&&attackers>cap&&!f.boss)ai.mode='out';
  const side=Math.sign(f.x-h.x)||1,ranged=f.type==='knife'||f.type==='whip';
  let gx=h.x+side*(ranged?(f.type==='knife'?150:64):(30*f.big+8)),gd=h.d;
  if(ai.mode==='out'){ai.hover+=dt;gx=h.x+side*(110+Math.sin(ai.hover)*30);gd=DEPTH/2+Math.sin(ai.hover*.7)*DEPTH*.4;}
  gx=clamp(gx,cam.x+12,cam.x+vw-12);
  const dx=gx-f.x,dd=gd-f.d,sp=T.sp*(f.boss&&f.hp<f.maxHp*.4?1.35:1)*(.85+.25*DIFF);
  if(Math.abs(dx)>4||Math.abs(dd)>3){f.x+=clamp(dx,-1,1)*Math.min(Math.abs(dx),sp*dt*(Math.abs(dx)>140?1.6:1));f.d+=clamp(dd,-1,1)*Math.min(Math.abs(dd),sp*.6*dt);f.st='walk';f.walkPh+=dt*6;}else f.st='idle';
  f.dir=Math.sign(h.x-f.x)||f.dir;
  // attack when lined up
  const adx=Math.abs(h.x-f.x),add=Math.abs(h.d-f.d);
  if(ai.mode==='in'&&ai.cool<=0&&add<10&&canBeHit(h)){let mv=null;
   if(f.type==='knife'&&adx>70&&adx<230)mv='toss';
   else if(f.type==='whip'&&adx<82)mv='whip';
   else if(f.type==='bat'&&adx<62)mv='swing';
   else if(f.type==='brute'){if(adx<38&&Math.random()<.45)mv='bgrab';else if(adx<60)mv=Math.random()<.5?'ebash':'hook';}
   else if((f.type==='kicker'||f.boss)&&adx>60&&adx<120&&Math.random()<.5)mv='jkickE';
   else if(adx<44*f.big){const opts=T.moves.filter(m=>MV[m]&&!['toss','whip','swing'].includes(m));mv=opts[Math.floor(Math.random()*opts.length)];}
   if(f.boss&&f.hp<f.maxHp*.5&&!f.summoned){f.summoned=true;for(let i=0;i<2;i++)spawnFoe({type:i?'kicker':'thug',face:pickCast(),side:i?-1:1});fx.push({kind:'txt',txt:'GET HIM!',x:f.x,d:f.d,z:130,t:1.2});}
   if(mv){startMove(f,mv);ai.cool=(f.boss?.55:1)+Math.random()*(f.boss?.6:1.2);if(f.type==='kicker'&&Math.random()<.3)ai.mode='out';}}}
 // ---- hero out / pit / boss
 function heroOut(h){run.lives--;if(run.lives>0){setTimeout(()=>{if(!s.alive)return;Object.assign(h,{st:'idle',hp:h.maxHp,inv:2.2,dead:false,z:120,vz:0});h.st='air';},700);}else{phase='over';phaseT=0;musicOn=false;sfx.die();}}
 function heroPit(h){run.lives--;if(run.lives>0){Object.assign(h,{st:'air',hp:h.maxHp,inv:2.2,z:140,vz:0});const p=st.pits.find(([a,b])=>h.x>a-10&&h.x<b+10);if(p)h.x=p[0]-30;}else{h.st='dead';phase='over';phaseT=0;musicOn=false;}}
 function bossBeaten(f){slow=1.2;sfx.clear();vibrate([40,60,40,60,100]);run.score+=5000;
  if(f.face&&st.boss.unlock){const i=cur;if(!s.gameRecruits[i].includes(f.face))s.gameRecruits[i].push(f.face);fx.push({kind:'txt',txt:nameOf(f.face).toUpperCase()+' JOINS YOU!',x:f.x,d:f.d,z:140,t:2.6});}
  setTimeout(()=>{if(!s.alive||phase!=='play')return;for(const o of living('foe'))knockdown(o,Math.sign(o.x-hero.x)*200,300,true,null);hero.st='win';hero.stT=0;phase='clear';phaseT=0;musicOn=false;},900);}
 // ---- the test bot (online-native / tests): walk right, fight what's near
 function botThink(dt){const h=hero;if(!h||phase!=='play'){bot.stick={sx:0,sy:0};return;}bot.t-=dt;const foes=living('foe');let near=null,bd=1e9;for(const v of foes){const d=Math.abs(v.x-h.x)+Math.abs(v.d-h.d)*2;if(d<bd){bd=d;near=v;}}
  if(near){const dx=near.x-h.x,dd=near.d-h.d;bot.stick={sx:Math.abs(dx)>40?Math.sign(dx):Math.abs(dx)<20?-Math.sign(dx)*.3:0,sy:Math.abs(dd)>4?Math.sign(dd)*.8:0};
   if(bot.t<=0&&Math.abs(dd)<9&&Math.abs(dx)<56){bot.t=.16;h.dir=Math.sign(dx)||1;const r=Math.random();pressBtn(run.meter>=100&&r<.08?'special':r<.6?'punch':r<.85?'kick':'jump');setTimeout(()=>{inp.held={};},60);}}
  else bot.stick={sx:1,sy:(DEPTH/2-h.d)/DEPTH};}

 // ---- drawing
 function draw(){layout();const W=s.W,H=s.H;x.setTransform(1,0,0,1,0,0);x.fillStyle='#06060a';x.fillRect(0,0,W,H);
  if(phase==='title'){drawTitle();return;}if(!st)return;
  const sh=shakeT>0?(Math.random()-.5)*shakeT*24:0;
  // scenery in world units
  x.save();x.translate(sh,bandY);x.scale(k,k);
  ST.drawScenery(x,st,cam.x,vw,BACK,FRONT+(portrait?0:20),t);
  if(portrait){// below the street: the ground continues darker under the controls
   const g2=x.createLinearGradient(0,FRONT,0,FRONT+400);g2.addColorStop(0,'rgba(0,0,0,.25)');g2.addColorStop(1,'rgba(0,0,0,.85)');x.fillStyle=g2;x.fillRect(0,FRONT,vw,400);}
  x.restore();
  if(portrait&&bandY>0){const far=DS.picture('far-'+st.biome),L=ST.LOOK[st.biome]||ST.LOOK.nyc;x.fillStyle=L.sky[0];x.fillRect(0,0,W,bandY);}
  // depth-sorted: props, items, fighters, shots
  const list=[...props.map(p=>({d:p.d,f:()=>drawProp(p)})),...items.map(i=>({d:i.d-.1,f:()=>drawItem(i)})),...F.filter(f=>!f.gone).map(f=>({d:f.d+(f.st==='down'||f.st==='dead'?-.5:0),f:()=>drawFighter(f)})),...shots.map(q=>({d:q.d,f:()=>drawShot(q)}))].sort((a,b)=>a.d-b.d);
  x.save();x.translate(sh,0);for(const e of list)e.f();for(const q of fx)drawFx(q);x.restore();
  drawHUD();drawControls();}
 function drawFighter(f){const sx=SX(f.x),sy=SY(BACK+f.d),kk=k*FIG,blink=(f.st==='dead'&&f.stT>.4&&Math.floor(t*14)%2)||(f.inv>0&&f.side==='hero'&&Math.floor(t*16)%2&&f.st!=='atk');if(blink)return;
  const name=f.poseName||'stand',sheet=DS.picture(f.sheet),cell=sheet?DS.cellOf(f.sheet,name):null;let spots;
  const face=f.st==='atk'&&f.mv?.def.spin||f.airAtk==='spin'?(Math.floor(t*28)%2?1:-1)*f.dir:f.dir;
  if(cell){const sc=kk*f.big/DS.UNIT;x.save();x.globalAlpha=.32;x.fillStyle='#000';x.beginPath();x.ellipse(sx,sy,22*kk*f.big,6*kk,0,0,7);x.fill();x.restore();
   x.save();x.translate(sx,sy-f.z*kk);x.scale(face*sc,sc);const ft=DS.footOf(name);if(f.flash>0&&'filter' in x)x.filter=`brightness(${1+Math.min(1,f.flash*5)*1.6})`;x.drawImage(sheet,cell.sx,cell.sy,DS.CELL,DS.CELL,-ft[0],-ft[1],DS.CELL,DS.CELL);x.restore();
   const J=BD.joints(BD.P[name]||BD.P.stand);spots={head:{x:sx+J.head[0]*face*kk*f.big,y:sy-f.z*kk+J.head[1]*kk*f.big},neck:{x:sx+J.neck[0]*face*kk*f.big,y:sy-f.z*kk+J.neck[1]*kk*f.big},hand:{x:sx+J.B[2][0]*face*kk*f.big,y:sy-f.z*kk+J.B[2][1]*kk*f.big},handAng:0};}
  else spots=BD.drawBody(x,f.pose,{x:sx,y:sy,face,k:kk,o:f.o,big:f.big,flash:f.flash*5,z:f.z});
  // weapon or carried thing
  if(f.weapon)drawWeapon(f.weapon.kind,spots.hand.x,spots.hand.y,face,kk,f);
  if(f.carry){const im=DS.picture(f.carry.kind);const w=(f.carry.kind==='barrel'?30:26)*kk;if(im)x.drawImage(im,spots.head.x-w/2,spots.head.y-w*1.5,w,w*im.height/im.width);else{x.fillStyle=f.carry.kind==='barrel'?'#7c4c1c':'#8c8c8c';x.beginPath();x.roundRect(spots.head.x-w/2,spots.head.y-w*1.6,w,w*1.1,5);x.fill();}}
  // the face on the neck
  // the face on the neck: every face (yours and theirs) the same width (brow to chin), chin on the neck, the head tilted
  // with the body (lying poses too), turned to look the way the fighter faces (headFacts, like Seanic/SotN)
  const fw=FACE_W*kk*f.big,mood=f.st==='hurt'||f.st==='fall'||f.st==='held'?'sad':f.st==='dizzy'||f.st==='grabbed'?'sad':f.st==='down'||f.st==='dead'?'sad':f.st==='win'?'win':f.st==='atk'?'angry':'normal';
  const nk=spots.neck||spots.head,ux=spots.head.x-nk.x,uy=spots.head.y-nk.y,ul=Math.hypot(ux,uy)||1;
  const fid=f.side==='hero'?s.players[f.pi]?.character:f.face;let fm=f.side==='hero'?(mood==='angry'?'happy':mood):(mood==='angry'?'angry':mood);if(fid&&fm!=='normal'&&!headFacts(fid,fm))fm='normal';   // a mood never measured would come out at another size
  const fh=fid?faceHeight(fid,fm,fw):fw*1.25,cx=nk.x+ux/ul*fh*FACE_UP,cy=nk.y+uy/ul*fh*FACE_UP;spots.face={x:cx,y:cy};
  if(f.side==='hero')drawFace(s,x,f.pi,cx,cy,fw/.6,fm,face,.6);
  else{const sp=f.face?faceSprite(f.face,fm,fw,face):null;if(sp)x.drawImage(sp.cv,cx+sp.x,cy+sp.y);else{x.fillStyle=f.o.skin;x.strokeStyle='#000';x.lineWidth=2;x.beginPath();x.arc(cx,cy,fw*.5,0,7);x.fill();x.stroke();}}
  if(f.st==='dizzy'){for(let i=0;i<3;i++){const a=t*6+i*2.1;x.fillStyle='#ffe85c';x.font=`${10*kk}px sans-serif`;x.fillText('★',spots.face.x+Math.cos(a)*14*kk-4,spots.face.y-fh*.75+Math.sin(a)*4*kk);}}}
 function drawWeapon(kind,hx,hy,face,kk,f){const im=DS.picture(kind),L=(kind==='knife'?16:kind==='whip'?(f.mv?.name==='whip'&&f.mv.seg===1?70:22):30)*kk,a=f.ground?0:f.mv&&f.mv.seg===0?-1.6:f.mv&&f.mv.seg===1?(kind==='whip'?.05:.2):-1.1;
  x.save();x.translate(hx,hy);x.scale(face,1);x.rotate(a);
  if(im){x.drawImage(im,-L*.12,-L*im.height/im.width/2,L,L*im.height/im.width);}
  else{x.lineCap='round';x.strokeStyle='#000';x.lineWidth=(kind==='bat'?6:kind==='pipe'?5:3)*kk*.9+2;x.beginPath();x.moveTo(-3,0);x.lineTo(L,0);x.stroke();x.strokeStyle=kind==='bat'?'#c8944c':kind==='pipe'?'#9ca4ac':kind==='chain'?'#bcbcbc':kind==='whip'?'#5c3c1c':'#dcdcdc';x.lineWidth=(kind==='bat'?6:kind==='pipe'?5:3)*kk*.9;x.beginPath();x.moveTo(-3,0);x.lineTo(L,0);x.stroke();}
  x.restore();}
 function drawItem(i){const sx=SX(i.x),sy=SY(BACK+i.d)-i.z*k,im=DS.picture(i.kind),w=(FOOD[i.kind]?18:i.kind==='knife'?16:i.kind==='rock'?18:30)*k;
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(sx,SY(BACK+i.d),w*.5,4*k,0,0,7);x.fill();
  if(im)x.drawImage(im,sx-w/2,sy-w*im.height/im.width,w,w*im.height/im.width);
  else if(FOOD[i.kind]){x.font=`${16*k}px sans-serif`;x.textAlign='center';x.fillText(i.kind==='chicken'?'🍗':i.kind==='burger'?'🍔':'🍕',sx,sy-2*k);}
  else if(i.kind==='rock'){x.fillStyle='#8c8c8c';x.strokeStyle='#000';x.beginPath();x.ellipse(sx,sy-6*k,9*k,7*k,0,0,7);x.fill();x.stroke();}
  else drawWeapon(i.kind,sx-w*.4,sy-3*k,1,k,{ground:true});
  // shine so it reads as a pickup
  x.fillStyle=`rgba(255,255,220,${.35+.3*Math.sin(t*6)})`;x.beginPath();x.arc(sx+w*.3,sy-8*k,2*k,0,7);x.fill();}
 function drawProp(p){const sx=SX(p.x),sy=SY(BACK+p.d),im=DS.picture(p.kind),w=(p.kind==='barrel'?24:30)*k,h=(p.kind==='barrel'?30:26)*k;
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(sx,sy,w*.6,4*k,0,0,7);x.fill();
  if(im)x.drawImage(im,sx-w/2,sy-h,w,h);else{x.fillStyle=p.kind==='barrel'?'#7c4c1c':'#a8783c';x.strokeStyle='#2c1c0c';x.lineWidth=2;x.beginPath();x.roundRect(sx-w/2,sy-h,w,h,p.kind==='barrel'?6:2);x.fill();x.stroke();
   x.strokeStyle='rgba(0,0,0,.4)';x.beginPath();if(p.kind==='barrel'){x.moveTo(sx-w/2,sy-h*.33);x.lineTo(sx+w/2,sy-h*.33);x.moveTo(sx-w/2,sy-h*.66);x.lineTo(sx+w/2,sy-h*.66);}else{x.moveTo(sx-w/2,sy-h);x.lineTo(sx+w/2,sy);x.moveTo(sx+w/2,sy-h);x.lineTo(sx-w/2,sy);}x.stroke();}}
 function drawShot(q){const sx=SX(q.x),sy=SY(BACK+q.d),y=sy-q.z*k;x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(sx,sy,8*k,3*k,0,0,7);x.fill();
  if(q.kind==='knife'){x.save();x.translate(sx,y);x.scale(Math.sign(q.vx),1);x.fillStyle='#dcdcdc';x.beginPath();x.moveTo(10*k,0);x.lineTo(-4*k,-2*k);x.lineTo(-4*k,2*k);x.fill();x.fillStyle='#3c2c1c';x.fillRect(-9*k,-1.5*k,5*k,3*k);x.restore();}
  else{const w=(q.kind==='barrel'?22:18)*k;x.save();x.translate(sx,y-w/2);x.rotate(t*10*Math.sign(q.vx));x.fillStyle=q.kind==='barrel'?'#7c4c1c':q.kind==='rock'?'#8c8c8c':'#a8783c';x.fillRect(-w/2,-w/2,w,w);x.restore();}}
 function drawFx(q){const sx=SX(q.x),sy=SY(BACK+q.d)-q.z*k;
  if(q.kind==='hit'){const im=DS.picture('fx-hit'),p=1-q.t/.22;if(im){const fr=Math.min(5,Math.floor(p*6)),sz=40*k;x.drawImage(im,fr*128,0,128,128,sx-sz/2,sy-sz/2,sz,sz);return;}
   x.save();x.translate(sx,sy);x.fillStyle=`rgba(255,240,140,${1-p})`;x.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=(i%2?6:16)*k*(.6+p);x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.fill();x.fillStyle=`rgba(255,255,255,${1-p})`;x.beginPath();x.arc(0,0,5*k*(1-p),0,7);x.fill();x.restore();}
  else if(q.kind==='dust'){x.fillStyle=`rgba(220,210,190,${q.t})`;for(let i=-1;i<=1;i+=2){x.beginPath();x.arc(sx+i*(12+(.35-q.t)*60)*k,sy-3*k,5*k,0,7);x.fill();}}
  else if(q.kind==='debris'){x.fillStyle='#8c6a3c';for(let i=0;i<6;i++)x.fillRect(sx+Math.cos(i)*(.5-q.t)*90*k,sy-(.5-q.t)*80*k*Math.abs(Math.sin(i*2))+(.5-q.t)**2*300*k,4*k,4*k);}
  else if(q.kind==='txt'){x.font=`900 ${13*k}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.lineWidth=3;x.strokeStyle='#000';x.strokeText(q.txt,sx,sy-(1-q.t)*20*k);x.fillStyle='#ffe85c';x.fillText(q.txt,sx,sy-(1-q.t)*20*k);}
  else if(q.kind==='sp'){const W=s.W,H=s.H,a=Math.min(1,q.t*3);x.save();x.globalAlpha=a;x.fillStyle=q.big?'rgba(255,200,60,.25)':'rgba(255,255,255,.12)';x.fillRect(0,0,W,H);
   x.font=`900 ${Math.min(W/9,64)}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.lineWidth=6;x.strokeStyle='#000';x.strokeText(q.name,W/2,bandY+BACK*k*.5);x.fillStyle='#ffd23c';x.fillText(q.name,W/2,bandY+BACK*k*.5);x.restore();}}
 const big=(str,X,Y,size,fill='#fff')=>{x.font=`900 ${size}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=size*.16;x.strokeStyle='#000';x.strokeText(str,X,Y);x.fillStyle=fill;x.fillText(str,X,Y);};
 const small=(str,X,Y,size,fill='#fff',al='center')=>{x.font=`800 ${size}px "SC Nunito",sans-serif`;x.textAlign=al;x.textBaseline='middle';x.lineWidth=size*.25;x.strokeStyle='#000a';x.strokeText(str,X,Y);x.fillStyle=fill;x.fillText(str,X,Y);};
 function bar(X,Y,w,h,v,col,back='#2c0c0c'){x.fillStyle='#000';x.fillRect(X-2,Y-2,w+4,h+4);x.fillStyle=back;x.fillRect(X,Y,w,h);x.fillStyle=col;x.fillRect(X,Y,w*clamp(v,0,1),h);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(X,Y,w*clamp(v,0,1),h*.35);}
 function drawHUD(){const W=s.W,H=s.H,fs=clamp(Math.min(W,H)*.034,11,17),top=portrait?(fb.top||40)+4:8,X0=10;if(!run||!hero)return;
  // you: face, name, health, lives, level hearts, score
  s.sprite(x,cur,X0+fs*1.5,top+fs*1.5,fs*2.6,{exact:true,still:true,mood:hero.hp<hero.maxHp*.3?'sad':'normal',noBadge:true});
  small(names[cur].toUpperCase().slice(0,12),X0+fs*3.2,top+fs*.55,fs,'#fff','left');
  bar(X0+fs*3.2,top+fs*1.2,fs*9,fs*.7,hero.hp/hero.maxHp,'#f8d84c');
  small(`×${run.lives}`,X0+fs*12.8,top+fs*1.55,fs,'#fff','left');
  // level: hearts like the NES game, filling toward the next level
  const need=run.lv<7?LV_XP[run.lv]-LV_XP[run.lv-1]:1,have=run.lv<7?run.xp-LV_XP[run.lv-1]:1;
  small(`LV ${run.lv}`,X0+fs*3.2,top+fs*2.6,fs*.85,'#ffb8c8','left');for(let i=0;i<7;i++){const on=i<run.lv,part=i===run.lv?have/need:0;x.fillStyle=on?'#ff3c5c':'#3c1c24';x.font=`${fs*.95}px sans-serif`;x.textAlign='left';x.fillText('♥',X0+fs*5.4+i*fs*.95,top+fs*2.65);
   if(part>0){x.save();x.beginPath();x.rect(X0+fs*5.4+i*fs*.95,top+fs*2.1,fs*.95*part,fs*1.2);x.clip();x.fillStyle='#ff8ca0';x.fillText('♥',X0+fs*5.4+i*fs*.95,top+fs*2.65);x.restore();}}
  small(String(run.score).padStart(7,'0'),X0+fs*3.2,top+fs*3.7,fs*.9,'#fff','left');
  // the last enemy you hit (or the boss): name + health
  const tg=bossF&&!bossF.gone?bossF:target&&!target.gone&&target.st!=='dead'?target:null;
  if(tg){const tw=Math.min(W*.42,fs*14),tx=W-tw-10-(portrait?0:fs*9),ty=portrait?top+fs*4.4:top;
   if(tg.face){const sp=faceSprite(tg.face,'normal',fs*1.8,1);if(sp)x.drawImage(sp.cv,tx+sp.x+fs,ty+sp.y+fs*1.2);}
   small((tg.face?nameOf(tg.face):ST.FOES[tg.type]?.name||'').toUpperCase().slice(0,18),tx+fs*2.2,ty+fs*.55,fs*.85,tg.boss?'#ff8c6c':'#fff','left');bar(tx+fs*2.2,ty+fs*1.2,tw-fs*2.4,fs*.6,tg.hp/tg.maxHp,tg.boss?'#ff5c3c':'#e8e8e8');}
  // partner online
  if(online&&partner){small(`${names[1-cur]}: mission ${partner.ms+1} · ${partner.sc}`,W/2,top+fs*5,fs*.8,'#9cf');}
  // mission card, boss card, GO, combo, level-up
  if(banner){const a=Math.min(1,banner.t*2);x.save();x.globalAlpha=a;const cy=bandY+BACK*k*.42;x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,cy-fs*3,W,fs*6.2);
   if(banner.boss&&bossF?.face){const sp=faceSprite(bossF.face,'angry',fs*4,1);if(sp)x.drawImage(sp.cv,W/2-fs*9+sp.x,cy+sp.y);}
   big(banner.big,W/2,cy-fs*.6,Math.min(fs*3.2,W/Math.max(6,banner.big.length)*1.6),banner.boss?'#ff5c3c':'#ffd23c');small(banner.small+(banner.sub?' · '+banner.sub:''),W/2,cy+fs*1.9,fs*1.05);x.restore();}
  if(goT>0&&Math.floor(t*3)%2)big('GO ➜',W-fs*4,bandY+BACK*k*.6,fs*2.6,'#ffd23c');
  if(combo.n>=3)big(`${combo.n} HITS!`,W-fs*5,bandY+BACK*k*.3,fs*(1.6+Math.min(1,combo.n/15)),combo.n>=10?'#ff5c3c':'#fff');
  if(lvBanner){const a=Math.min(1,lvBanner.t*2,(3.4-lvBanner.t)*4);x.save();x.globalAlpha=a;const cy=bandY+FRONT*k-fs*2.4;x.fillStyle='rgba(40,0,10,.82)';x.beginPath();x.roundRect(W/2-Math.min(W*.46,fs*16),cy-fs*1.9,Math.min(W*.92,fs*32),fs*3.8,10);x.fill();
   small(lvBanner.sp?'SPECIAL UNLOCKED':`LEVEL ${lvBanner.lv}!  NEW MOVE`,W/2,cy-fs*.95,fs*.85,'#ff8ca0');big(lvBanner.name||'',W/2,cy+fs*.2,fs*1.5,'#ffd23c');small(lvBanner.how||'',W/2,cy+fs*1.35,fs*.82,'#fff');x.restore();}
  if(phase==='clear'){x.fillStyle=`rgba(0,0,0,${Math.min(.6,phaseT)})`;x.fillRect(0,0,W,H);big('MISSION CLEAR!',W/2,H*.34,Math.min(W/8,fs*4),'#ffd23c');
   const rows=[[`Mission bonus`,2000],[`Time bonus`,run.timeBonus||0],[run.hurt?'Took damage':'No damage!',run.hurt?0:3000]];rows.forEach((r,i)=>{if(phaseT>.6+i*.4){small(r[0],W/2-fs*6,H*.46+i*fs*1.8,fs*1.1,'#fff','left');small('+'+r[1],W/2+fs*6,H*.46+i*fs*1.8,fs*1.1,'#ffd23c','right');}});}
  if(phase==='over'){x.fillStyle=`rgba(0,0,0,${Math.min(.7,phaseT)})`;x.fillRect(0,0,W,H);big('GAME OVER',W/2,H*.4,Math.min(W/7,fs*4.5),'#ff3c3c');small(`${names[cur]} · ${run.score} points · mission ${missionNo+1}`,W/2,H*.52,fs*1.1);}
  ui.draw();}
 function drawControls(){if(!fighting())return;const W=s.W,H=s.H;
  // stick: where the thumb is, or a faint resting ring
  const sk=inp.stick,R=U*1.25,cx=sk?sk.ox:stickHome.x,cy=sk?sk.oy:stickHome.y;x.save();x.globalAlpha=sk?.55:.28;x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(cx,cy,R,0,7);x.stroke();
  const kx=sk?cx+clamp(sk.x-cx,-R,R):cx,ky=sk?cy+clamp(sk.y-cy,-R,R):cy;x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.arc(kx,ky,R*.45,0,7);x.fill();x.restore();
  for(const [n,b] of Object.entries(BTN)){const on=inp.held[n],bars=Math.floor(run.meter/100),dis=n==='special'&&bars<1;x.save();x.globalAlpha=dis?.3:on?.95:.62;
   x.fillStyle=on?'#fff':b.col;x.strokeStyle='rgba(0,0,0,.6)';x.lineWidth=3;x.beginPath();x.arc(b.x,b.y,b.r*(on?.94:1),0,7);x.fill();x.stroke();
   x.fillStyle=on?b.col:'#fff';x.font=`900 ${b.r*.36}px "SC Nunito",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(b.label,b.x,b.y);
   if(n==='special'){// meter ring: three bars round the button
    x.globalAlpha=1;for(let i=0;i<3;i++){const a0=-Math.PI/2+i*2*Math.PI/3+.08,a1=a0+2*Math.PI/3-.16,f2=clamp(run.meter/100-i,0,1);x.lineWidth=5;x.strokeStyle='rgba(0,0,0,.6)';x.beginPath();x.arc(b.x,b.y,b.r+6,a0,a1);x.stroke();
     x.strokeStyle=bars>=3?`hsl(${(t*200)%360},90%,60%)`:'#ffd23c';x.beginPath();x.arc(b.x,b.y,b.r+6,a0,a0+(a1-a0)*f2);x.stroke();}}
   x.restore();}}
 // ---- title + menus (1P Arcade): START / CONTINUE / MOVES
 const ui={btns:[],moves:false,
  tap(p){for(const b of ui.btns)if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.act();return true;}if(ui.moves){ui.moves=false;return true;}return false;},
  key(ev){if(phase==='title'&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();ui.btns[0]?.act();return true;}return false;},
  draw(){if(ui.moves)drawMoves();}};
 let titleDone=null;
 function drawTitle(){const W=s.W,H=s.H,fs=clamp(Math.min(W,H)*.04,12,20),bg=DS.picture('title-bg'),logo=DS.picture('logo');
  if(bg){const sc=Math.max(W/bg.width,H/bg.height);x.drawImage(bg,(W-bg.width*sc)/2,(H-bg.height*sc)/2,bg.width*sc,bg.height*sc);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,0,W,H);}
  else{const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1c0c24');g.addColorStop(1,'#3c0c0c');x.fillStyle=g;x.fillRect(0,0,W,H);
   for(let i=0;i<16;i++){const bx=(i*97)%W,bh=H*(.2+((i*37)%30)/100);x.fillStyle='#0c0610';x.fillRect(bx,H*.62-bh,60,bh);}x.fillStyle='#14080c';x.fillRect(0,H*.62,W,H);
   const a=BD.drawBody(x,BD.P.stand,{x:W/2-40,y:H*.66,face:1,k:H/400,o:BD.OUTFIT.p1}),b2=BD.drawBody(x,BD.P.stand,{x:W/2+40,y:H*.66,face:-1,k:H/400,o:BD.OUTFIT.p2});
   s.sprite(x,0,a.head.x,a.head.y,H/400*28,{exact:true,still:true,noBadge:true});if(s.players[1])s.sprite(x,1,b2.head.x,b2.head.y,H/400*28,{exact:true,still:true,noBadge:true});}
  if(logo){const w=Math.min(W*.9,640),h=w*logo.height/logo.width;x.drawImage(logo,(W-w)/2,H*.06,w,h);}
  else{big('THE WARRIORS',W/2,H*.16,Math.min(W/7,fs*4.4),'#ff3c3c');small('COME OUT TO PLAY',W/2,H*.27,fs*1.2,'#ffd23c');}
  const bw=Math.min(W*.7,320),bh=fs*2.6,x0=(W-bw)/2;let y0=H*.66;ui.btns=[];
  const add=(label,act,main)=>{ui.btns.push({x:x0,y:y0,w:bw,h:bh,act});x.fillStyle=main?'#e8b83c':'rgba(20,10,14,.85)';x.strokeStyle='#000';x.lineWidth=3;x.beginPath();x.roundRect(x0,y0,bw,bh,12);x.fill();x.stroke();small(label,W/2,y0+bh/2,fs*1.05,main?'#1c0c0c':'#fff');y0+=bh+fs*.7;};
  add('START · MISSION 1',()=>titleDone?.(0),true);
  if((save.reached||0)>0)add(`CONTINUE · MISSION ${save.reached+1}`,()=>titleDone?.(save.reached));
  add('MOVES',()=>{ui.moves=true;});
  if(save.best)small(`BEST ${save.best}`,W/2,y0+fs*.4,fs*.85,'#ccc');
  ui.draw();}
 function drawMoves(){const W=s.W,H=s.H,fs=clamp(Math.min(W,H)*.032,11,16);x.fillStyle='rgba(6,4,8,.94)';x.fillRect(0,0,W,H);big('MOVES',W/2,fs*3,fs*2.4,'#ffd23c');
  const lv=run?.lv||1,rows=[['PUNCH / KICK','Tap them: punch x3 = combo, kick x2 = roundhouse',1],['RUN','Push the stick all the way',1],['DASH PUNCH','Running + PUNCH',1],['BACK KICK','Stick AWAY + KICK',1],['WEAPONS','Stand on one + PUNCH to pick up, PUNCH to swing',1],['BARRELS & ROCKS','Next to one + PUNCH to lift, PUNCH to throw',1],
   ...Object.entries(UNLOCK).map(([l,u])=>[u[0],u[1],+l]),...SPECIALS.map(q=>[q.name,q.how,q.lv])];
  rows.forEach((r,i)=>{const y=fs*5.6+i*fs*1.7,on=!run||lv>=r[2];small(r[0],W*.08,y,fs,on?'#ffd23c':'#666','left');small(r[1],W*.4,y,fs*.85,on?'#fff':'#666','left');small(`LV ${r[2]}`,W*.94,y,fs*.8,'#ff8ca0','right');});
  small('Tap anywhere to close',W/2,H-fs*2,fs*.9,'#999');}
 const fighting=()=>phase==='play';

 // ---- the run: missions until game over (or the turn's mission count)
 let cur=0;const scores=[0,0];let nf=null;
 if(online){nf=netField(s,{hz:4,pack:()=>({ms:missionNo,sc:run?.score||0,lv:run?.lv||1}),unpack:(i,d)=>{partner=d;}});}
 s.frame(dt=>{dt=Math.min(dt,.05);layout();musicTick(performance.now()/1000);if(!s.paused){phaseT+=dt;if(phase==='play'||phase==='clear'||phase==='over'||phase==='card')step(phase==='card'?0:dt);
   if(phase==='card'&&phaseT>2.2){phase='play';phaseT=0;}
   if(phase==='clear'&&phaseT>2.6&&run.done){run.timeBonus=0;run.score+=2000+(run.hurt?0:3000);const d=run.done;run.done=null;d('clear');}
   if(phase==='over'&&phaseT>2.4&&run.done){const d=run.done;run.done=null;d('over');}
   nf?.tick(dt);}
  draw();});
 s.debug={get phase(){return phase;},get run(){return run;},get hero(){return hero;},get st(){return st;},get foes(){return living('foe');},MISS,MV,
  set bot(v){bot.on=!!v;},get bot(){return online?()=>{bot.on=true;if(phase==='title')titleDone?.(0);}:bot.on;},
  start:(n=0)=>titleDone?.(n),press:b=>{pressBtn(b);setTimeout(()=>{inp.held[b]=false;},60);},killAll:()=>{for(const f of living('foe'))damage(hero,f,999,'knock',100,{});},lv:n=>{run.xp=LV_XP[n-1];run.lv=n;},meter:v=>{run.meter=v;},
  boss:()=>{if(!st)return;wave=st.waves.length-1;waveQ=[];for(const f of living('foe'))f.gone=true;hero.x=st.boss.at+5;cam.x=Math.max(0,st.boss.at-vw*.4);}};

 async function turn(pi,startAt,count){cur=pi;run={lives:board?2:3,lv:1,xp:0,meter:0,score:0,hurt:false};let n=startAt,cleared=0,conts=solo?2:0;
  for(;;){run.hurt=false;const res=await playMission(n);if(!s.alive)return 0;
   if(res==='clear'){cleared++;n++;if(solo){soloProgress(s,run.score,cleared,`Mission ${n} cleared · ${run.score}`);if(n>(save.reached||0))store_({reached:n});}if(cleared>=count)break;continue;}
   // game over: continue? (1P: twice, from the same mission, score halved)
   if(conts>0){conts--;const go=await askContinue();if(go){run.lives=3;run.score=Math.floor(run.score/2);continue;}}
   break;}
  return {score:run.score,cleared};}
 function askContinue(){return new Promise(r=>{phase='cont';const W=s.W,H=s.H;ui.btns=[];
  const f=()=>{const fs=clamp(Math.min(s.W,s.H)*.04,12,20),bw=Math.min(s.W*.6,280),bh=fs*2.4,x0=(s.W-bw)/2;ui.btns=[{x:x0,y:s.H*.55,w:bw,h:bh,act:()=>{r(true);phase='play';}},{x:x0,y:s.H*.55+bh+fs,w:bw,h:bh,act:()=>{r(false);}}];};f();
  const prev=ui.draw;ui.draw=()=>{f();const fs=clamp(Math.min(s.W,s.H)*.04,12,20);x.fillStyle='rgba(0,0,0,.8)';x.fillRect(0,0,s.W,s.H);big('CONTINUE?',s.W/2,s.H*.38,fs*3,'#ffd23c');small('Score is halved',s.W/2,s.H*.46,fs);
   for(const [i,b] of ui.btns.entries()){x.fillStyle=i?'#3c3c44':'#e8b83c';x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,10);x.fill();small(i?'NO':'YES',s.W/2,b.y+b.h/2,fs*1.1,i?'#fff':'#000');}};
  const done=r;r=v=>{ui.draw=prev;ui.btns=[];done(v);};
  });}

 // ---- flow
 if(!online&&!board&&solo){phase='title';const n=await new Promise(r=>{titleDone=r;});ui.btns=[];
  await s.pass(0,`${names[0]}: clear the streets. Left side = stick (push it all the way to run). PUNCH, KICK, JUMP, SPECIAL on the right. Level up to learn new moves, fill the meter for specials.`,'Fight!');if(!s.alive)return;
  const r=await turn(0,n,Infinity);if(!s.alive)return;if(r.score>(save.best||0))store_({best:r.score});
  soloFinish(s,r.score,r.cleared,`The Warriors · ${r.cleared} mission${r.cleared===1?'':'s'} · ${r.score} points`,r.cleared>=1);return;}
 const count=board?1:2;
 if(online){phase='wait';await nf.start('go');if(!s.alive)return;cur=nf.me;const r=await turn(nf.me,0,count);if(!s.alive)return;scores[nf.me]=r.score;nf.finish(r.score);phase='wait';
  const o=await nf.remoteDone();scores[1-nf.me]=o|0;s.finish([...scores],`The Warriors · ${scores[0]} – ${scores[1]}`);return;}
 for(let i=0;i<2;i++){phase='wait';if(!await s.pass(i,`${names[i]}'s turn: ${count===1?'one mission':`${count} missions`}${i?`. Beat ${scores[0]} points.`:'. Highest score wins.'} Stick on the left, PUNCH / KICK / JUMP / SPECIAL on the right.`,'Fight!'))return;
  const r=await turn(i,0,count);if(!s.alive)return;scores[i]=r.score;}
 s.finish([...scores],`The Warriors · ${names[0]} ${scores[0]} – ${scores[1]} ${names[1]}`);}
Object.assign(exports,{warriorsDD,brawler:warriorsDD,MV,LV_XP,UNLOCK,SPECIALS});
