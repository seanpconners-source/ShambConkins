// THE WARRIORS · COME OUT TO PLAY (id warriors-brawl, engine 'brawler'): a belt-scrolling beat 'em up in the line of
// Double Dragon and Final Fight, told as the film's long night (src/engines/dd/story.js): the Conclave and the cops'
// raid, the Turnbull AC's and their bus, the Orphans, the train south, the Baseball Furies, the Lizzies, the cops at
// Union Square (catch the train!), the Punks, the dawn ride home and the Rogues on Coney Island, where the Riffs turn up
// at the last minute. Every chapter is a few AREAS with their own scenery (src/engines/dd/scenes.js), obstacles, doors
// and events (the bus, a lurching train, molotov fire, a departing train), waves that lock the screen and a boss.
// FIGHTING: punch x3 / kick x2 / punch-punch-kick chains (a hit cancels into the next move), the fighter steps in to the
// enemy it attacks (hits connect), juggles on launched enemies, dazed enemies (grab, knees, throw, uppercut), weapons
// with real swings (wind-up, level arc, follow-through, 3-swing combo), jump kicks, the cyclone, and the SPECIAL meter:
// tap = Rising Fist (homes in), stick forward = Twister, full = Warrior's Fury, while hurt/held = Breakaway. A special
// only spends the meter when it starts and can't be spammed. Levels (hearts) unlock moves like the NES game.
// Bodies are drawn from poses (src/engines/dd/body.js) until the owner's sheets are in (src/data/ddSprites.js).
// 1P Arcade: the story (solo 'levels'), continues, chapter select of the chapters reached. 2P one phone: both play the
// picked chapter in turn (board: one chapter from the seed). Online: both play the same chapter on their own phones,
// partner's progress on screen; highest score wins.
const {clamp}=require("src/utils.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
const {snd}=require("src/engines/arenaKit.js");
const {noise}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const BD=require("src/engines/dd/body.js");
const SY_=require("src/engines/dd/story.js");
const SC=require("src/engines/dd/scenes.js");
const DS=require("src/data/ddSprites.js");
const CUT=require("src/engines/dd/cutscenes.js");
const MAP=require("src/engines/dd/subwayMap.js");
const {NECKS}=require("src/data/ddNecks.js");
const {faceSprite,drawFace,faceHeight,headFacts}=require("src/headFacts.js");
// a character with a picture of their own (not the emoji card): gang members wear their gang's face only then
const hasArt=id=>{try{return !!id&&require("src/data/userPortraits.js").isRasterArt(require("src/assets.js").portraitURL(id,'normal'));}catch{return false;}};

const FACE_W=15,FACE_UP=.3,VH=380,BACK=210,DEPTH=SY_.DEPTH,FRONT=BACK+DEPTH,FIG=.9,G=980,SAVE='sc-warriors-v1';
const CH=SY_.CHAPTERS,FOES=SY_.FOES;
// levels (hearts): XP needed for each level, and what it unlocks (the NES game's move ladder)
const LV_XP=[0,25,70,140,230,340,480];   // paced over the ten chapters
const UNLOCK={2:['JUMP KICK','JUMP, then KICK in the air'],3:['HAIR GRAB + KNEES','Walk into a dazed enemy, then PUNCH / KICK'],4:['SHOULDER THROW','While holding someone: push AWAY + PUNCH, or the 3rd knee'],
 5:['BACK ELBOW','Stick AWAY from your target + PUNCH'],6:['UPPERCUT','PUNCH a dazed enemy (stand still)'],7:['CYCLONE SPIN KICK','JUMP, then KICK at the top']};
const SPECIALS=[{lv:1,bars:1,name:'RISING FIST',how:'1 bar · tap SPECIAL: dashes at the nearest enemy'},{lv:3,bars:2,name:'TWISTER',how:'2 bars · stick forward + SPECIAL'},{lv:5,bars:3,name:"WARRIOR'S FURY",how:'Full meter · tap SPECIAL: hits everyone'},
 {lv:1,bars:1,name:'BREAKAWAY',how:'1 bar · SPECIAL while hurt or held: knocks everyone back'}];
// moves: seq = [pose, seconds] key poses, act = active segments, reach = [from,to] in front (negative = behind),
// next = what PUNCH (P) / KICK (K) chains into once this one has hit, kind = what a hit does
const SPIN_W=11;
const MV={
 // spin kicks turn at SPIN_W = 11 rad/s (1.75 turns a second: readable, not a blur)
 jab:{seq:[['jabC',.04],['jab',.06],['stand',.11]],act:[1],dmg:2,reach:[-14,50],kind:'light',sfx:'p',next:{P:'cross',K:'kick'}},
 cross:{seq:[['jabC',.03],['cross',.07],['stand',.12]],act:[1],dmg:2,reach:[-14,52],kind:'light',sfx:'p',next:{P:'hook',K:'sweep'},step:40},
 hook:{seq:[['hookC',.06],['hook',.08],['stand',.18]],act:[1],dmg:4,reach:[-14,54],kind:'knock',kb:170,sfx:'P',step:50,fin:1},
 kick:{seq:[['kickC',.06],['kick',.08],['kickC',.05],['stand',.1]],act:[1],dmg:3,reach:[-14,64],kind:'push',kb:100,sfx:'k',next:{K:'kick2',P:'cross'}},
 kick2:{seq:[['kickC',.05],['kick',.09],['stand',.16]],act:[1],dmg:4,reach:[-14,66],kind:'knock',kb:180,sfx:'K',step:40,fin:1},
 sweep:{seq:[['kneel',.05],['sweep',.12],['kneel',.08],['stand',.12]],act:[1],dmg:4,reach:[-12,64],kind:'trip',kb:60,sfx:'K',fin:1},
 bkick:{seq:[['stand',.03],['bkick',.1],['stand',.15]],act:[1],dmg:3,reach:[-58,-4],kind:'knock',kb:150,sfx:'k'},
 elbow:{seq:[['elbowC',.05],['elbow',.08],['stand',.15]],act:[1],dmg:6,reach:[-46,-2],kind:'knock',kb:170,sfx:'P'},
 up:{seq:[['upC',.07],['up',.11],['stand',.2]],act:[1],dmg:7,reach:[-14,52],kind:'launch',kb:120,sfx:'U',fin:1},
 dashp:{seq:[['cross',.16],['stand',.16]],act:[0],dmg:4,reach:[-14,56],kind:'knock',kb:180,sfx:'P',lunge:[190,0],breaker:1},
 knee:{seq:[['kneeC',.06],['knee',.08],['kneeC',.1]],grab:true,dmg:3,sfx:'K'},
 throw:{seq:[['throw1',.14],['throw2',.18],['stand',.18]],grab:true,throwAt:1,dmg:7,sfx:'U'},
 // weapon combo: cock it, whip it round, follow through; backhand; overhead smash
 swing:{seq:[['batWind',.12],['batHit',.06],['batFollow',.12],['batReady',.11]],act:[1,2],actFrac:.5,dmg:4,reach:[-18,74],kind:'push',kb:80,sfx:'B',next:{P:'swing2'},wpn:1},
 swing2:{seq:[['batFollow',.04],['batBack',.07],['batLow',.11],['batReady',.11]],act:[1],dmg:4,reach:[-18,72],kind:'push',kb:80,sfx:'B',next:{P:'swing3'},wpn:1,step:30},
 swing3:{seq:[['batOver',.13],['batSmash',.07],['batSmash',.09],['batReady',.15]],act:[1],dmg:6,reach:[-10,72],kind:'knock',kb:210,sfx:'U',wpn:1,step:50,fin:1,breaker:1},
 eswing:{seq:[['batWind',.32],['batHit',.07],['batFollow',.16],['batReady',.3]],act:[1],dmg:3,reach:[-8,66],kind:'knock',kb:150,sfx:'B',tell:1,wpn:1},
 toss:{seq:[['toss',.12],['stand',.18]],spawn:'knife'},
 heave:{seq:[['throw1',.1],['throw2',.14],['stand',.18]],spawn:'carry'},
 hurl:{seq:[['throw1',.12],['throw2',.12],['stand',.16]],spawn:'weapon'},
 shoot:{seq:[['aim',.9],['aim',.1],['stand',.35]],spawn:'bullet',spawnSeg:0,aim:1},
 lobm:{seq:[['lobC',.34],['lob',.1],['stand',.3]],spawn:'lob',spawnSeg:0},
 bash:{seq:[['block',.3],['bash',.12],['block',.28]],act:[1],dmg:3,reach:[0,48],kind:'knock',kb:200,sfx:'P',lunge:[0,240],tell:1},
 charge:{seq:[['crouch',.5],['charge',.7],['stand',.4]],act:[1],dmg:5,reach:[-6,46],kind:'knock',kb:280,sfx:'U',lunge:[0,330],tell:1},
 rush:{seq:[['crouch',.42],['skate1',.62],['stand',.28]],act:[1],dmg:4,reach:[-6,44],kind:'knock',kb:240,sfx:'K',lunge:[0,380],tell:1},
 ebash:{seq:[['crouch',.32],['cross',.22],['stand',.3]],act:[1],dmg:4,reach:[4,48],kind:'knock',kb:220,sfx:'P',lunge:[0,230],tell:1},
 bgrab:{seq:[['grab',.3],['stand',.2]],act:[0],grabber:1,reach:[4,36]},
 jkickE:{seq:[['jump',.12],['jkick',.42],['stand',.12]],act:[1],dmg:3,reach:[6,52],kind:'knock',kb:160,sfx:'K',lunge:[60,170],hop:300},
 // specials
 rise:{seq:[['run1',.13],['rise1',.05],['rise2',.34],['stand',.14]],act:[2],dmg:9,reach:[-34,62],kind:'launch',kb:150,sfx:'U',inv:1,riseZ:84,special:1,home:1},
 twister:{seq:[['spin',.9],['stand',.14]],act:[0],dmg:2,reach:[-54,54],kind:'light',multi:.1,finish:'launch',sfx:'k',spin:1,lunge:[150,0],inv:1,special:1},
 burst:{seq:[['fury',.24],['stand',.16]],special:1,inv:1,burst:1},
 fury:{seq:[['fury',1.1],['win',.3]],special:1,inv:1}};
const WPN={bat:{dmg:5,uses:16,len:40,w:6,col:'#c8944c'},pipe:{dmg:6,uses:14,len:38,w:4.5,col:'#9ca4ac'},chain:{dmg:5,uses:18,len:36,w:3,col:'#bcbcbc'},stick:{dmg:5,uses:14,len:28,w:4,col:'#1c1c1c'},knife:{dmg:5,uses:3,len:14,w:3,col:'#dcdcdc'}};
const FOOD={chicken:12,burger:8,pizza:6};
// a sheet missing a newer pose shows the nearest older one
// hero sheets' swing1/swing2 have a bat painted in (owner Nov 24: a second weapon showed under the held one), so the weapon
// poses fall back to empty-handed cells and the game draws the held weapon in the measured fist (ddNecks.js)
const SHEET_ALIAS={batReady:'stand',batWind:'hookC',batHit:'cross',batFollow:'cross',batBack:'hookC',batLow:'cross',batOver:'hookC',batSmash:'cross',block:'stand',bash:'cross',aim:'jab',lobC:'throw1',lob:'toss',skate1:'run1',skate2:'run2',hurtLow:'hurt',charge:'run1',sweep:'kick',taunt:'win'};
// enemy sheets made to the older 26-pose list draw their own weapon in swing1/swing2 (Furies' bat, Lizzies' whip), while the
// game draws the held weapon itself: the newer weapon poses fall back to empty-handed ones there, so nothing shows twice
const PERSON_SHEET={p1:'hero-p1',p2:'hero-p2',cyrus:'cast-cyrus',riff:'foe-riff',rogue:'foe-rogue',orphan:'foe-orphan',fury:'foe-fury',lizzie:'foe-lizzie',punk:'foe-punk',turnbull:'foe-turnbull',cop:'foe-cop',sarge:'foe-cop',riot:'foe-riot',hihat:'gang-hihat',bopper:'gang-bopper'};
// run (owner Nov 24: run1/walk2/run2/walk2 rocked back and forth: the upright passing cell between two wide strides):
// the two stride cells alternate, a touch of bob; hero sheets with their own 8-frame run strip (run-p1/run-p2) use that
const RUN_CYCLE=['run1','run2'];
const FOE_ALIAS=Object.assign({},SHEET_ALIAS,{batReady:'stand',batWind:'hookC',batHit:'cross',batFollow:'cross',batBack:'hookC',batLow:'cross',batOver:'hookC',batSmash:'cross'});
// a cell a sheet left empty (older sheets end their last row with blank cells) counts as missing: checked once per cell
const blankCells=new WeakMap();
function blankCell(img,c){let m=blankCells.get(img);if(!m){m=new Map();blankCells.set(img,m);}const key=c.sx+','+c.sy;if(m.has(key))return m.get(key);let b=false;
 try{const cv=document.createElement('canvas');cv.width=cv.height=24;const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(img,c.sx,c.sy,DS.CELL,DS.CELL,0,0,24,24);const d=g.getImageData(0,0,24,24).data;b=true;for(let q=3;q<d.length;q+=4)if(d[q]>8){b=false;break;}}catch{}
 m.set(key,b);return b;}
const SHEET_OF={fox:'hero-p2',cop:'foe-cop',sarge:'foe-cop',riot:'foe-riot',skin:'foe-turnbull',chain:'foe-turnbull',big:'foe-turnbull',driver:'foe-turnbull',orphan:'foe-orphan',lob:'foe-orphan',orphboss:'foe-orphan',fury:'foe-fury',furyboss:'foe-fury',
 liz:'foe-lizzie',knifeliz:'foe-lizzie',gunliz:'foe-lizzie',lizboss:'foe-lizzie',punk:'foe-punk',skater:'foe-punk',punkboss:'foe-punk',rogue:'foe-rogue',bottler:'foe-rogue',luther:'foe-rogue',riff:'foe-riff'};

async function warriorsDD(s){
 const [c,x]=s.canvas(900,500,{fill:true});const fb=fullBleed(s,{bg:'#06060a'});
 const online=!!s.online,solo=!!s.solo&&!online,board=s.origin==='board',names=s.players.map(p=>p.name||'Player');
 const skill=(()=>{try{return require("src/solo.js").cpuSkill?.(s)??.5;}catch{return .5;}})();
 const DIFF=solo?.8+skill*.45:1;   // enemy damage/aggression
 // the gangs get tougher as the night goes on (owner, Nov 24): per chapter more damage and quicker attacks (HP: spawnFoe)
 const chDmg=()=>1+chapterNo*.06,chAgg=()=>1+Math.min(.5,chapterNo*.055);
 const save=(()=>{try{return JSON.parse(localStorage.getItem(SAVE)||'{}');}catch{return {};}})();
 save.reached=clamp(save.reached|0,0,CH.length-1);
 const store_=v=>{try{localStorage.setItem(SAVE,JSON.stringify(Object.assign(save,v)));}catch{}};
 const seed=String(s.seed||1);
 // locked characters this game can free (the film's cast first): a beaten boss who is one of them joins, other bosses free one
 let freePool=[];try{const rw=require('src/rewards.js');freePool=[...new Set(s.players.slice(0,solo?1:2).flatMap(p=>{try{return rw.gameRecruitPool(s.game,store.profile,p).map(ch=>ch.id);}catch{return [];}}))];}catch{}
 s.gameRecruits=[[],[]];
 // UNLOCKS (owner, Nov 24): no random joins any more. Once a chapter a locked character steps into a gang wave as a named
 // CHALLENGER (tougher than the rest); knock them out and they join you. Characters with a picture come first.
 let challenge=null;const usedCh=new Set();
 function pickChallenger(n){if(online||!freePool.length)return null;const left=freePool.filter(id=>!usedCh.has(id)&&!s.gameRecruits.flat().includes(id));if(!left.length)return null;
  const art=left.filter(hasArt),pool=art.length?art:left,id=pool[Math.floor(Math.random()*pool.length)];usedCh.add(id);
  const areas=CH[n].areas,ai=areas.length>1?1+Math.floor(Math.random()*(areas.length-1)):0,nw=(areas[ai].waves||[]).length;return nw?{n,ai,wi:Math.floor(Math.random()*nw),id}:null;}
 // ---- sounds (all our own, synthesized)
 const sfx={
  p:()=>{noise(.05,.05,{f0:2600,q:.6});snd(170,.06,{type:'square',vol:.035,to:90});},
  P:()=>{noise(.09,.08,{f0:1400});snd(120,.1,{type:'square',vol:.05,to:55});},
  k:()=>{noise(.06,.06,{f0:2000});snd(150,.07,{type:'square',vol:.04,to:80});},
  K:()=>{noise(.1,.08,{f0:1100});snd(100,.12,{type:'sawtooth',vol:.05,to:45});},
  U:()=>{noise(.14,.09,{f0:900});snd(90,.18,{type:'sawtooth',vol:.06,to:40});},
  B:()=>{noise(.08,.1,{f0:700});snd(240,.05,{type:'triangle',vol:.06,to:110});},
  swoosh:()=>noise(.12,.035,{f0:2400,type:'bandpass'}),
  S:()=>{snd(220,.3,{type:'sawtooth',vol:.05,to:880});noise(.3,.05,{f0:3000,type:'bandpass'});},
  block:()=>{snd(900,.05,{type:'square',vol:.035,to:700});noise(.05,.05,{f0:4000,type:'highpass'});},
  gun:()=>{noise(.18,.12,{f0:1600});snd(80,.15,{type:'square',vol:.06,to:30});},
  glass:()=>{noise(.2,.06,{f0:6000,type:'highpass'});[1800,2400,3100].forEach((f,i)=>snd(f,.05,{type:'triangle',vol:.02,delay:i*.03}));},
  fire:()=>noise(.4,.05,{f0:500}),
  horn:()=>{snd(220,.5,{type:'square',vol:.05});snd(277,.5,{type:'square',vol:.04});},
  whiff:()=>noise(.05,.025,{f0:3800,type:'bandpass'}),
  thud:()=>{snd(70,.16,{type:'sine',vol:.08,to:35});noise(.12,.05,{f0:400});},
  pick:()=>{snd(660,.06,{type:'square',vol:.035});snd(990,.08,{type:'square',vol:.035,delay:.06});},
  eat:()=>[523,659,784].forEach((f,i)=>snd(f,.08,{type:'triangle',vol:.05,delay:i*.07})),
  lvl:()=>[392,523,659,784,1047].forEach((f,i)=>snd(f,.1,{type:'square',vol:.04,delay:i*.08})),
  hurt:()=>snd(300,.12,{type:'square',vol:.04,to:180}),
  die:()=>snd(420,.7,{type:'triangle',vol:.06,to:60}),
  siren:()=>{for(let i=0;i<3;i++){snd(740,.28,{type:'triangle',vol:.025,to:960,delay:i*.56});snd(960,.28,{type:'triangle',vol:.025,to:740,delay:i*.56+.28});}},
  clink:()=>[2600,2900,2600].forEach((f,i)=>snd(f,.07,{type:'triangle',vol:.035,delay:i*.32})),
  clear:()=>[523,659,784,1047,784,1047,1319].forEach((f,i)=>snd(f,.13,{type:'square',vol:.045,delay:i*.11})),
  boss:()=>[110,104,98,92].forEach((f,i)=>snd(f,.3,{type:'sawtooth',vol:.06,delay:i*.28})),
  riffs:()=>[262,330,392,523,392,523,659].forEach((f,i)=>snd(f,.16,{type:'sawtooth',vol:.05,delay:i*.12}))};
 // music: an original driving street groove (bass + drums), its key and tempo per chapter, harder at a boss
 let musicOn=false,beat=0,nextBeat=0,musicK=0,musicBoss=false;const BASS=[45,45,57,45,43,43,55,43,41,41,53,41,43,43,55,47];
 function musicTick(now){if(!musicOn||s.paused)return;const bpm=128+((musicK*7)%22)+(musicBoss?14:0),spb=60/bpm/2,tr=[0,-2,3,-5,2,-3,5,-1,1,4][musicK%10];if(nextBeat===0||nextBeat<now-1)nextBeat=now;
  while(nextBeat<now+.3){const d=Math.max(0,nextBeat-now),i=beat%16,f=440*Math.pow(2,(BASS[i]+tr-69)/12);
   snd(f,spb*.9,{type:'square',vol:.022,delay:d});if(i%4===0)snd(95,.12,{type:'sine',vol:.06,to:40,delay:d});if(i%8===4)noise(.1,.035,{f0:1800,delay:d});if(i%2===1||musicBoss)noise(.03,.012,{f0:8000,type:'highpass',delay:d});
   if(musicBoss&&i%4===2)snd(f*2,spb*.5,{type:'sawtooth',vol:.012,delay:d});beat++;nextBeat+=spb;}}

 // ---- layout: the street band (world units) scaled so a fighter is about a quarter of the screen tall; controls float
 let k=1,vw=600,bandY=0,portrait=false,U=40,BTN={},stickHome={x:0,y:0};
 function layout(){const W=s.W,H=s.H,top=(fb.top||40);portrait=H>W*1.05;
  if(portrait){k=Math.min(W/400,(H-top-60)*.62/VH);bandY=top+40;}
  else if(W<H*1.4){k=Math.min(W/540,(H-top-40)*.8/VH);bandY=top+40;portrait=true;}
  else{k=Math.min(H/VH,W/720);bandY=(H-VH*k)*.5;}
  vw=W/k;U=clamp(Math.min(W,H)*.072,27,48);const m=Math.max(12,U*.4),bx=W-m,by=H-m;
  BTN={punch:{x:bx-U*3.15,y:by-U,r:U,label:'PUNCH',col:'#e84a3c'},kick:{x:bx-U,y:by-U*1.7,r:U,label:'KICK',col:'#3c8ce8'},
   jump:{x:bx-U*1.05,y:by-U*4.05,r:U*.74,label:'JUMP',col:'#4cb85c'},special:{x:bx-U*3.4,y:by-U*3.45,r:U*.74,label:'SPECIAL',col:'#e8b83c'}};
  stickHome={x:m+U*1.6,y:by-U*1.6};}
 const SX=wx=>(wx-cam.x)*k,SYw=wy=>bandY+wy*k;

 // ---- input: floating stick on the left, four buttons on the right, keys, a test bot
 const inp={sx:0,sy:0,held:{},press:{},stick:null,keys:{},btnPtr:{}};
 const pressBtn=b=>{inp.press[b]=performance.now();inp.held[b]=true;vibrate(8);};
 s.on(c,'pointerdown',ev=>{ev.preventDefault();const p=s.pointer(ev);if(ui.tap(p))return;if(!fighting())return;
  let best=null,bd=1e9;for(const [n,b] of Object.entries(BTN)){const d=Math.hypot(p.x-b.x,p.y-b.y);if(d<b.r*1.4&&d<bd){bd=d;best=n;}}
  if(best){inp.btnPtr[ev.pointerId]=best;pressBtn(best);s.capture?.(ev);return;}
  if(p.x<s.W*.5&&!inp.stick){inp.stick={id:ev.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y};s.capture?.(ev);}});
 s.on(c,'pointermove',ev=>{const p=s.pointer(ev);
  if(inp.stick&&ev.pointerId===inp.stick.id){const R=U*1.25;let dx=p.x-inp.stick.ox,dy=p.y-inp.stick.oy,l=Math.hypot(dx,dy);
   if(l>R*1.6){inp.stick.ox+=dx*(1-R*1.6/l);inp.stick.oy+=dy*(1-R*1.6/l);}inp.stick.x=p.x;inp.stick.y=p.y;return;}
  const b=inp.btnPtr[ev.pointerId];if(b){// a thumb rolling from one button onto another presses it (punch → kick)
   for(const [n,bb] of Object.entries(BTN))if(n!==b&&Math.hypot(p.x-bb.x,p.y-bb.y)<bb.r*.95){inp.held[b]=false;inp.btnPtr[ev.pointerId]=n;pressBtn(n);break;}}});
 const up=ev=>{if(inp.stick&&ev.pointerId===inp.stick.id)inp.stick=null;const b=inp.btnPtr[ev.pointerId];if(b){inp.held[b]=false;delete inp.btnPtr[ev.pointerId];}};
 s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 const KEYMAP={j:'punch',J:'punch',z:'punch',Z:'punch',k:'kick',K:'kick',x:'kick',X:'kick',' ':'jump',l:'special',L:'special',c:'special',C:'special'};
 s.on(document,'keydown',ev=>{if(ui.key(ev))return;inp.keys[ev.key]=true;const b=KEYMAP[ev.key];if(b&&!ev.repeat){ev.preventDefault();pressBtn(b);}if(ev.key.startsWith('Arrow'))ev.preventDefault();});
 s.on(document,'keyup',ev=>{inp.keys[ev.key]=false;const b=KEYMAP[ev.key];if(b)inp.held[b]=false;});
 function readStick(){let sx=0,sy=0;const K=inp.keys;if(K.ArrowLeft||K.a||K.A)sx-=1;if(K.ArrowRight||K.d||K.D)sx+=1;if(K.ArrowUp||K.w||K.W)sy-=1;if(K.ArrowDown||K.s||K.S)sy+=1;
  if(inp.stick){const R=U*1.25,dx=(inp.stick.x-inp.stick.ox)/R,dy=(inp.stick.y-inp.stick.oy)/R,l=Math.hypot(dx,dy);if(l>.18){const m=Math.min(1,l);sx=dx/l*m;sy=dy/l*m;}}
  if(bot.on)({sx,sy}=bot.stick);
  inp.sx=clamp(sx,-1,1);inp.sy=clamp(sy,-1,1);}
 // input buffer: a press is kept for `win` seconds until the fighter can use it (no lost presses)
 const took=(b,win=.24)=>{const t0=inp.press[b];if(t0&&performance.now()-t0<win*1000){inp.press[b]=0;return true;}return false;};
 const pending=(b,win=.24)=>{const t0=inp.press[b];return !!(t0&&performance.now()-t0<win*1000);};
 const bot={on:false,stick:{sx:0,sy:0},t:0};

 // ---- the world
 let A=null,cam={x:0,lockA:-1e9,lockB:1e9},F=[],items=[],props=[],shots=[],fx=[],fires=[],hero=null,wave=-1,waveQ=[],phase='title',phaseT=0,t=0,
  hitstop=0,shakeT=0,slow=0,banner=null,lvBanner=null,combo={n:0,t:0,best:0},target=null,goT=0,bossOn=false,bossF=null,run=null,partner=null,chapterNo=0,areaNo=0,mapT=0,lastCh=null,
  spCD=0,bus=null,lurch=0,escapeT=0,spawnT=0,riffsIn=false,bossT=0,story=null,fade=0,needMsgT=0,cut=0,uid=0;
 const lvQueue=[];
 const living=side=>F.filter(f=>(Array.isArray(side)?side.includes(f.side):f.side===side)&&f.st!=='dead'&&!f.gone);
 const enemiesOf=f=>f.side==='foe'?living(['hero','ally']):living('foe');
 const waveFoes=()=>living('foe').filter(f=>!f.chaser);
 function makeFighter(o){return Object.assign({x:0,d:DEPTH/2,z:0,vx:0,vd:0,vz:0,dir:1,st:'idle',stT:0,pose:{...BD.P.stand},mv:null,inv:0,flash:0,daze:[],hp:10,maxHp:10,big:1,weapon:null,carry:null,walkPh:0,jug:0,trail:[],id:'x'},o);}
 function spawnHero(){return makeFighter({side:'hero',pi:cur,o:BD.OUTFIT[cur?'p2':'p1'],hp:30,maxHp:30,x:cam.x+80,d:DEPTH*.55,dir:1,sheet:cur?'hero-p2':'hero-p1',inv:1.5,id:'hero'});}
 function spawnFoe(sp){const T=FOES[sp.type]||FOES.cop,boss=!!sp.boss;uid++;
  const side=sp.side||1;let xx=side>0?cam.x+vw+30+(uid%3)*14:cam.x-30-(uid%3)*14,dd=clamp(sp.d??DEPTH/2,A.dMin,A.dMax),entering=null;
  if(sp.door!=null&&Math.abs(sp.door-(cam.x+vw/2))<vw*.6){xx=sp.door;dd=A.dMin;entering=.6;}
  const hpK=boss?1+chapterNo*.05:1+chapterNo*.13;const f=makeFighter({side:sp.ally?'ally':'foe',type:sp.type,T,o:BD.OUTFIT[T.o]||BD.OUTFIT.thug,big:T.big||1,hp:Math.round(T.hp*hpK),x:xx,d:dd,dir:-side,
   face:T.face||(hasArt(SY_.REPS[T.gang])?SY_.REPS[T.gang]:null),head:T.head,sheet:SHEET_OF[sp.type]||'foe-thug',weapon:T.weapon?{kind:T.weapon,uses:99,foe:1}:null,ai:{cool:.9+(uid%5)*.2,hover:uid*1.7,mode:'in'},boss,shield:T.shield||0,id:'f'+uid,entering,chaser:!!sp.chaser});
  if(sp.challenger){f.face=sp.challenger;f.challenger=sp.challenger;f.hp=Math.round(f.hp*2.6)+8;f.big=Math.max(f.big,1.08);f.ai.cool=.5;
   fx.push({kind:'txt',txt:nameOf(sp.challenger).toUpperCase()+' WANTS A PIECE!',x:f.x,d:f.d,z:150,t:2.4});sfx.clink?.();}
  f.maxHp=f.hp;F.push(f);return f;}

 // ---- chapters and areas
 async function playChapter(n){chapterNo=n;musicK=CH[n].music||0;
  // the chapter card: title, place, the story so far
  await playCut(n);if(!s.alive)return 'quit';
  story={n,t:0,from:n>0?n-1:null};lastCh=n;phase='story';phaseT=0;musicOn=false;
  await new Promise(r=>{story.done=r;});if(!s.alive)return 'quit';story=null;challenge=pickChallenger(n);
  for(let ai=0;ai<CH[n].areas.length;ai++){const res=await playArea(n,ai);if(!s.alive)return 'quit';if(res!=='clear')return res;}
  return 'clear';}
 async function playArea(n,ai){areaNo=ai;A=SY_.buildArea(n,ai,seed);
  const want=['far-','wall-','floor-'].map(p=>p+A.kind).concat(SC.FALLBACK[A.kind]&&!DS.has('far-'+A.kind)?['far-','wall-','floor-'].map(p=>p+SC.FALLBACK[A.kind]):[]);
  want.push(...new Set(A.blocks.map(b=>'prop-'+b.kind)));if(A.events.some(e=>e.kind==='bus'))want.push('bus');want.push('run-p1','run-p2');
  await DS.ready(want,2500);
  cam={x:0,lockA:-1e9,lockB:1e9};F=[];shots=[];fx=[];fires=[];wave=-1;waveQ=[];bossOn=false;bossF=null;target=null;bus=null;lurch=0;riffsIn=false;bossT=0;
  items=A.items.map(i=>({...i,z:0}));props=A.props.map(p=>({...p,hp:2}));escapeT=A.escape||0;spawnT=4;
  hero=spawnHero();hero.x=60;F.push(hero);Object.assign(hero,{hp:run.hp??hero.maxHp,weapon:run.weapon||null});
  phase='card';phaseT=0;fade=1;banner={big:A.beat,small:A.sub,t:2.3};musicOn=true;musicBoss=false;
  if(A.siren)sfx.siren();if(n===CH.length-1&&ai===0)sfx.clink();
  return new Promise(r=>{run.done=r;});}
 function triggerWaves(dt){if(phase!=='play')return;
  const W=A.waves,foes=waveFoes();
  if(wave+1<W.length&&foes.length===0&&waveQ.length===0&&hero.x>=W[wave+1].at){wave++;cam.lockA=cam.lockB=cam.x;waveQ=W[wave].list.map(e=>({...e,at:t+e.delay}));goT=0;
   if(challenge&&challenge.n===chapterNo&&challenge.ai===areaNo&&challenge.wi===wave&&!challenge.on){challenge.on=1;const ty=W[wave].list.map(e=>e.type).find(ty=>FOES[ty]&&!FOES[ty].ranged&&!FOES[ty].big)||W[wave].list[0]?.type||'cop';waveQ.push({type:ty,side:-1,delay:1.4,challenger:challenge.id,at:t+1.4});}}
  if(waveQ.length){const mx=W[wave].max+2;for(let i=0;i<waveQ.length;i++){if(waveQ[i].at<=t&&foes.length<mx){spawnFoe(waveQ.splice(i,1)[0]);break;}}}
  const waveDone=wave>=0&&waveQ.length===0&&waveFoes().length===0;
  if(waveDone&&cam.lockB<1e8&&!bossOn){cam.lockA=-1e9;cam.lockB=1e9;goT=3;}
  // the boss of the area
  if(A.boss&&!bossOn&&wave===W.length-1&&waveDone&&hero.x>=A.boss.at)startBoss();
  if(A.chase){chaseStep(dt);return;}
  // the escape stage: cops keep coming from behind, the train leaves when time runs out
  if(A.escape){escapeT-=dt;spawnT-=dt;if(spawnT<=0){spawnT=8;if(living('foe').filter(f=>f.chaser).length<2&&living('foe').length<4)spawnFoe({type:uid%4===0?'riot':'cop',side:-1,d:(uid*37)%DEPTH,chaser:true});}
   if(escapeT<=0){escapeT=22;A.trainLeave=1;banner={big:'MISSED IT!',small:'Next train in 20 seconds',t:2};for(let i=0;i<3;i++)spawnFoe({type:'cop',side:i%2?-1:1,d:i*40+20,chaser:true});}
   if(A.trainLeave){A.trainLeave+=dt*400;if(A.trainLeave>1800&&escapeT<19)A.trainLeave=0;}
   A.trainOpen=!A.trainLeave;
   if(A.trainOpen&&wave===W.length-1&&waveDone&&hero.x>=A.len-320){areaClear('YOU MADE THE TRAIN!');return;}}
  else if(!A.boss&&wave===W.length-1&&waveDone&&hero.x>=A.len-150)areaClear();
  // area events: the Turnbulls' bus, the train lurching
  for(const ev of A.events)if(!ev.done&&hero.x>=ev.x){ev.done=true;
   if(ev.kind==='bus'){const fromL=(A.events.indexOf(ev)%2)===0;bus={d:clamp(hero.d,A.dMin+14,A.dMax-14),dir:fromL?1:-1,t:0,x:fromL?cam.x-40:cam.x+vw+40,hit:new Set()};sfx.horn();}
   if(ev.kind==='lurch'){lurch=.5;shakeT=.4;txt(hero,'HOLD ON!');sfx.thud();}}
  // the Rogues keep coming until the Riffs show up
  if(bossOn&&A.boss.endless&&!riffsIn){spawnT-=dt;if(spawnT<=0){spawnT=3;if(living('foe').length<4)spawnFoe({type:uid%3===0?'bottler':'rogue',side:uid%2?-1:1,d:(uid*41)%DEPTH});}}
  if(bossOn&&A.boss.riffs&&!riffsIn&&(hero.hp<hero.maxHp*.42||bossT>38))riffsArrive();
  // the Riffs' beating happens in the middle of the screen: the boss is drawn back there (also while he's being hit)
  if(riffsIn&&bossF&&bossF.hp>0&&!bossF.gone&&!['fall','down','dead','pit'].includes(bossF.st)){const c=cam.x+vw/2,dx=c-bossF.x;if(Math.abs(dx)>6)bossF.x+=Math.sign(dx)*Math.min(Math.abs(dx),110*dt);}}
 // ---- the 96th Street chase (owner: "subway platform running from the cops should be a stage... that one dude"): nothing to
 // clear, the screen keeps moving right after a head start, cops pour in from behind (and now and then one blocks the way
 // ahead); Fox runs with you until a cop drags him to the platform edge as a train comes in. Reach the far end to get away.
 function chaseStep(dt){A.chaseT=(A.chaseT||0)+dt;
  if(A.chaseT>2.5){A.push=Math.max(A.push||0,cam.x)+(28+Math.min(34,(A.chaseT-2.5)*.8))*dt;cam.lockA=Math.min(A.push,Math.max(0,A.len-vw));}
  if(A.fox&&!A.foxF&&!A.foxDone){A.foxF=spawnFoe({type:'fox',ally:true,side:-1,d:clamp(hero.d+22,A.dMin,A.dMax)});A.foxF.x=hero.x-36;A.foxF.dir=1;A.foxF.entering=null;}
  spawnT-=dt;if(spawnT<=0){spawnT=Math.max(1.4,2.6-A.chaseT*.012);if(living('foe').filter(f=>f.chaser).length<5)spawnFoe({type:uid%5===0?'riot':'cop',side:-1,d:(uid*37)%DEPTH,chaser:true});}
  A.aheadT=(A.aheadT??6)-dt;if(A.aheadT<=0){A.aheadT=7.5;if(living('foe').length<6)spawnFoe({type:'cop',side:1,d:(uid*53)%DEPTH,chaser:true});}
  // cops left far behind give up (frees room for fresh ones)
  for(const f of living('foe'))if(f.chaser&&!f.scripted&&f.x<cam.x-140)f.gone=true;
  foxMoment(dt);
  if(hero.x>=A.len-150&&!(A.foxT&&!A.foxDone))areaClear('YOU GOT AWAY!');}
 function foxMoment(dt){const fx_=A.foxF;if(!fx_||A.foxDone)return;
  if(!A.foxT&&hero.x>=A.fox){A.foxT=1e-3;const cop=spawnFoe({type:'cop',side:1,d:A.dMin,chaser:true});cop.entering=null;cop.inv=99;A.foxCop=cop;
   Object.assign(fx_,{x:Math.min(hero.x+70,cam.x+vw-90),d:A.dMin,scripted:1,inv:99,mv:null,dir:1});Object.assign(cop,{x:fx_.x+30,d:A.dMin,scripted:1,dir:-1});
   banner={big:'FOX!',small:'A cop has him at the edge of the platform! A train is coming!',t:2.6};sfx.siren();vibrate([40,40,40]);}
  if(!A.foxT)return;A.foxT+=dt;const cop=A.foxCop;
  // the train: a warning down the edge row, then it roars past in the track pit behind them
  if(A.foxT>1.6&&A.trainPass==null&&!A.foxHit){A.trainPass=cam.x-260-1920;sfx.horn();}
  if(A.trainPass!=null){A.trainPass+=1500*dt;
   if(!A.foxHit&&A.trainPass+1920>fx_.x){A.foxHit=1;shakeT=.6;A.flash=.35;fx_.gone=true;if(cop)cop.gone=true;sfx.thud();
    for(const v of F)if(!v.gone&&v.side==='foe'&&v.d<A.dMin+14&&Math.abs(v.x-fx_.x)<160){v.hp=0;knockdown(v,300,260,true,null);}
    banner={big:'FOX IS GONE',small:'No time. Keep running!',t:2.8};}
   if(A.trainPass>cam.x+vw+200){A.trainPass=null;A.foxDone=true;run.foxLost=true;}}}
 // a scripted fighter: Fox and the cop wrestling at the edge of the platform
 function scriptStep(f,dt){f.st='idle';f.vx=0;const k2=Math.floor(t*3.3+(f.type==='fox'?0:1))%2;f.forcePose=k2?'grab':'hurt';
  const o=f.type==='fox'?A.foxCop:A.foxF;if(o)f.dir=Math.sign(o.x-f.x)||f.dir;f.x+=Math.sin(t*7)*6*dt;}
 function startBoss(){bossOn=true;bossT=0;cam.x=cam.lockA=cam.lockB=Math.max(0,Math.min(A.len-vw,hero.x-vw*.35));musicBoss=true;
  bossF=spawnFoe({type:A.boss.type,boss:true,side:1,d:DEPTH/2});bossF.x=cam.x+vw+40;
  const ms=A.boss.minions.split(' ').filter(Boolean);ms.forEach((ty,i)=>{const m=spawnFoe({type:ty,side:i%2?-1:1,d:(i+1)*DEPTH/(ms.length+1)});m.hp=Math.round(m.hp*.8);});
  const T=FOES[A.boss.type];banner={big:T.name,small:T.gang,t:2.2,boss:true};sfx.boss();vibrate([40,40,40]);
  if(A.boss.line)fx.push({kind:'say',txt:A.boss.line,f:bossF,t:3.2});spawnT=4;}
 function riffsArrive(){riffsIn=true;sfx.riffs();vibrate([30,30,30,30,80]);banner={big:'THE RIFFS!',small:'They know who shot Cyrus. Now the Rogues are outnumbered.',t:3.2};
  // the Riffs march in from BOTH sides in two lines, the Rogues still standing run for it, and the boss is held in the middle of
  // the screen while the Riffs close in round him (owner: "keep him in the center while they beat him up so you can see it")
  for(let i=0;i<8;i++){const L=i<4,j=i%4,a=spawnFoe({type:'riff',ally:true,side:L?-1:1,d:A.dMin+8+(j+.5)*(A.dMax-A.dMin-16)/4});
   a.x=L?cam.x-36-j*34:cam.x+vw+36+j*34;a.inv=1.5;a.dir=L?1:-1;a.ring=(j-1.5)/1.5;}
  hero.hp=Math.min(hero.maxHp,hero.hp+hero.maxHp*.3);for(const f of living('foe'))if(!f.boss){f.ai.scared=1;f.ai.flee=Math.sign(f.x-(cam.x+vw/2))||1;}}
 function areaClear(msg){if(phase!=='play')return;phase='clear';phaseT=0;musicOn=false;sfx.clear();hero.st='win';hero.stT=0;hero.mv=null;hero.z=0;
  for(const o of living('foe'))knockdown(o,Math.sign(o.x-hero.x||1)*200,300,true,null);
  run.clearMsg=msg||(A.last?'CHAPTER CLEAR!':'AREA CLEAR!');run.outro=A.last?CH[chapterNo].outro:null;}
 function nameOf(id){try{return require("src/characters.js").CHARACTERS.find(c=>c.id===id)?.name||id;}catch{return id;}}

 // ---- moves
 function startMove(f,name){const def=MV[name];if(!def)return;f.mv={name,def,seg:0,segT:0,hit:new Set(),multiT:0,chainQ:null,landed:false};f.st='atk';f.stT=0;f.trail=[];
  if(def.inv)f.inv=Math.max(f.inv,def.seq.reduce((a,q)=>a+q[1],0));if(def.hop)f.vz=def.hop;
  if(def.act&&!def.grab&&!def.special)(def.wpn?sfx.swoosh:sfx.whiff)();
  // step in: an attack slides the fighter toward the enemy it's aimed at, so it connects (and lines up the depth)
  if(f.side!=='foe'&&def.act&&!def.grab&&!def.special){let best=null,bd=1e9;for(const v of enemiesOf(f)){if(!canBeHit(v,f))continue;const dx=(v.x-f.x)*f.dir,dd=Math.abs(v.d-f.d);
    if(dx<def.reach[0]-6||dx>def.reach[1]+42||dd>30)continue;const sc=Math.abs(dx-def.reach[1]*.55)+dd*2;if(sc<bd){bd=sc;best=v;}}f.mv.mag=best;}
  if(def.home)homeIn(f);}
 function homeIn(f){// Rising Fist: dash at the nearest enemy in reach (either way)
  let best=null,bd=180;for(const v of enemiesOf(f)){if(!canBeHit(v,f))continue;const d=Math.abs(v.x-f.x)+Math.abs(v.d-f.d)*1.5;if(d<bd){bd=d;best=v;}}
  if(best){f.dir=Math.sign(best.x-f.x)||f.dir;f.mv.home={x:best.x-f.dir*24*f.big,d:best.d};}}
 function moveStep(f,dt){const m=f.mv,def=m.def;m.segT+=dt;const seg=def.seq[m.seg];
  if(def.lunge)f.x+=(def.lunge[m.seg]||0)*f.dir*dt;
  if(def.step&&m.seg===0)f.x+=def.step*f.dir*dt;
  const actEnd=Math.max(...(def.act||[0]));
  if(m.mag&&m.seg<=actEnd){const v=m.mag;if(v.gone||v.st==='dead'){m.mag=null;}else{const want=v.x-f.dir*clamp(def.reach[1]*.55,22,44)*f.big,dx=want-f.x;
    if(dx*f.dir>0)f.x+=Math.sign(dx)*Math.min(Math.abs(dx),300*dt);else if(dx*f.dir<-6)f.x+=Math.sign(dx)*Math.min(Math.abs(dx),110*dt);f.d+=clamp(v.d-f.d,-150*dt,150*dt);}}
  if(m.home&&m.seg===0){f.x+=clamp(m.home.x-f.x,-560*dt,560*dt);f.d+=clamp(m.home.d-f.d,-220*dt,220*dt);}
  if(def.riseZ&&m.seg===2)f.z=Math.sin(Math.min(1,m.segT/seg[1])*Math.PI)*def.riseZ;
  if(def.spin){f.spinA=(f.spinA||0)+dt*SPIN_W;if(Math.floor(f.spinA/Math.PI)%2!==Math.floor((f.spinA-dt*SPIN_W)/Math.PI)%2)sfx.whiff();}
  const lastAct=def.act?def.act[def.act.length-1]:-1,active=def.act&&def.act.includes(m.seg)&&!(def.actFrac&&def.act.length>1&&m.seg===lastAct&&m.segT>seg[1]*def.actFrac);
  if(active){if(def.multi){m.multiT-=dt;if(m.multiT<=0){m.multiT=def.multi;m.hit.clear();}}attackCheck(f,def,m);}
  if(def.burst&&!m.done){m.done=true;for(const v of enemiesOf(f))if(Math.abs(v.x-f.x)<92&&Math.abs(v.d-f.d)<40&&!['dead','down','fall','gone'].includes(v.st)){v.hp-=3;knockdown(v,Math.sign(v.x-f.x||1)*240,280,v.hp<=0,f);}fx.push({kind:'ring',x:f.x,d:f.d,z:40,t:.4});shakeT=.3;}
  if(def.grabber&&m.seg===0&&m.segT>=seg[1]*.7&&!m.grabbed){m.grabbed=true;const h=hero;if(h&&canBeHit(h,f)&&Math.abs(h.d-f.d)<14&&(h.x-f.x)*f.dir>0&&(h.x-f.x)*f.dir<48){h.st='held';h.stT=0;h.heldBy=f;h.escape=0;h.mv=null;f.st='holding';f.stT=0;f.mv=null;return;}}
  if(def.grab&&m.seg===(def.throwAt??1)&&!m.done&&m.segT>seg[1]*.5){m.done=true;const v=f.grabbed;if(v){if(def.throwAt!=null){throwVictim(f,v);}else{damage(f,v,def.dmg,'light',0,def);v.st='grabbed';f.knees=(f.knees||0)+1;if(f.knees>=3){if(run.lv>=4){f.mv=null;f.st='grabbing';startMove(f,'throw');return;}releaseGrab(f,true);}}}}
  if(def.spawn&&m.seg===(def.spawnSeg??0)&&m.segT>=seg[1]&&!m.done){m.done=true;spawnShot(f,def.spawn);}
  if(m.segT>=seg[1]){m.seg++;m.segT=0;
   // a queued chain move starts as soon as the hit is out (cancel the recovery)
   if(m.chainQ&&m.seg>actEnd){const q=m.chainQ;f.mv=null;f.st='idle';startMove(f,q);return;}
   if(m.seg>=def.seq.length){f.mv=null;f.st=f.grabbed?'grabbing':'idle';f.spinA=0;if(def.special)spCD=.3;}}}
 function poseOf(f){if(f.forcePose)return f.forcePose;if(f.mv){const sg=f.mv.def.seq[Math.min(f.mv.seg,f.mv.def.seq.length-1)];return sg[0];}
  switch(f.st){case 'walk':{const ph=f.walkPh%4;return f.T?.skate?(Math.floor(f.walkPh*.7)%2?'skate1':'skate2'):['walk1','walk2','walk3','walk2'][Math.floor(ph)];}
   // run = stride, legs passing, stride, legs passing (the sheets' two run cells are both strides: flipping between them only wiggled the back leg)
   case 'run':return RUN_CYCLE[Math.floor(f.walkPh*.8)%2];case 'air':return f.airAtk==='spin'?'spin':f.airAtk?'jkick':'jump';
   case 'hurt':return f.hurtLow?'hurtLow':'hurt';case 'dizzy':case 'grabbed':return 'dizzy';case 'held':return 'hurt';case 'fall':return 'fall';case 'down':case 'dead':return 'down';case 'pit':return 'fall';
   case 'getup':return 'kneel';case 'grabbing':return 'grab';case 'holding':return 'grab';case 'win':return 'win';case 'carry':return 'throw1';
   default:return f.shield>0&&f.ai?'block':f.weapon&&f.weapon.kind!=='knife'?'batReady':Math.sin(t*3+(f.pi||0))>0?'stand':'stand2';}}
 // who can be hit: not on the ground, not getting up; a launched enemy can be juggled a couple of times by your side
 function canBeHit(v,a){if(!v||v.gone||v.inv>0||v.entering)return false;if(v.st==='fall'&&a&&a.side!=='foe'&&v.side==='foe'&&v.z>6&&v.jug<3&&!v.thrown)return true;
  return !['down','dead','getup','fall','pit','gone'].includes(v.st);}
 function attackCheck(f,def,m){const foes=enemiesOf(f);
  for(const v of foes){if(m.hit.has(v)||!canBeHit(v,f))continue;const dx=(v.x-f.x)*f.dir,dd=Math.abs(v.d-f.d),zz=Math.abs(v.z-f.z);
   const lo=def.reach[0]*f.big,hi=def.reach[1]*f.big;if(dd>(f.side!=='foe'?20:12)*Math.max(f.big,v.big)||zz>95)continue;
   if(!(dx>=Math.min(lo,hi)&&dx<=Math.max(lo,hi)))continue;
   m.hit.add(v);const kind=def.spin&&f.mv&&f.mv.seg===0&&f.mv.segT>def.seq[0][1]-.13?def.finish:def.kind;
   if(def.grabber)continue;
   let dmg=def.dmg;if(def.wpn&&f.weapon){dmg=(WPN[f.weapon.kind]?.dmg||4)*(f.mv.name==='swing3'?1.4:1)*(f.side==='foe'?.6:1);if(f.side==='hero'){f.weapon.uses--;if(f.weapon.uses<=0){f.weapon=null;txt(f,'WEAPON BROKE');}}}
   // a Riff hitting the boss: small hits that rock him on the spot (no knockdowns that would carry him off the middle)
   const ringHit=f.side==='ally'&&v.boss;if(ringHit)dmg*=.5;
   if(damage(f,v,dmg,ringHit?'light':kind,ringHit?20:def.kb||60,def)!==false){m.landed=true;if(def.sfx)sfx[def.sfx]?.();}}
  // props break when hit
  if(f.side==='hero')for(const p of props){if(m.hit.has(p))continue;const dx=(p.x-f.x)*f.dir;if(Math.abs(p.d-f.d)<16&&dx>def.reach[0]&&dx<def.reach[1]+10){m.hit.add(p);breakProp(p);}}}
 function damage(a,v,dmg,kind,kb,def={}){if(!canBeHit(v,a)&&v.st!=='grabbed')return false;
  const heroHit=a&&a.side==='hero';
  // the riot shield: blocks plain hits from the front until it cracks
  if(v.shield>0&&a&&!def.special&&kind!=='launch'&&!['dizzy','grabbed','fall','hurt'].includes(v.st)&&Math.sign(a.x-v.x)===v.dir&&!(a.z>20)){v.shield-=def.breaker||kind==='knock'?2:1;sfx.block();
   fx.push({kind:'block',x:v.x+v.dir*16,d:v.d,z:50,t:.25});a.x-=a.dir*14;hitstop=Math.max(hitstop,.04);if(heroHit)run.meter=Math.min(300,run.meter+3);
   if(v.shield<=0){txt(v,'SHIELD BROKEN!');v.shield=0;v.st='dizzy';v.stT=0;v.dazed=true;v.mv=null;}else if(v.ai)v.ai.cool=Math.min(v.ai.cool,.25);return false;}
  if(heroHit)dmg*=1+.07*(run.lv-1);else if(a&&a.side==='foe')dmg*=DIFF*chDmg();
  if(v.st==='dizzy'&&heroHit)dmg*=1.2;
  v.hp-=dmg;v.flash=.14;v.hpShow=2;
  hitstop=Math.max(hitstop,kind==='light'?.05:kind==='push'?.06:def.fin?.12:.09);spark(v,a,kind);
  if(heroHit){gainXP(kind==='light'?1:2);run.meter=Math.min(300,run.meter+(def.special?2:9));run.score+=50*Math.round(dmg)*(1+Math.min(4,Math.floor(combo.n/5)));combo.n++;combo.t=1.6;combo.best=Math.max(combo.best,combo.n);target=v;}
  else if(v.side==='hero'){run.meter=Math.min(300,run.meter+13);run.hurt=true;sfx.hurt();vibrate(25);combo.n=0;for(const o of living('foe'))if(o.ai)o.ai.cool=Math.max(o.ai.cool,.45);}
  if(v.side==='ally'&&v.hp<5)v.hp=5;   // the Riffs don't go down for good
  const dirx=Math.sign(v.x-(a?a.x:v.x))||(a?a.dir:1);
  // a juggled enemy pops up again
  if(v.st==='fall'){v.jug++;v.vz=Math.max(v.vz,230-50*v.jug);v.vx=dirx*60;if(v.hp<=0)v.dead=true;return true;}
  if(v.hp<=0){knockdown(v,dirx*Math.max(150,Math.abs(kb||0)),kind==='launch'?380:260,true,a);return true;}
  if(kind==='knock'||kind==='launch'||kind==='trip'){knockdown(v,dirx*Math.abs(kb||150),kind==='launch'?380:kind==='trip'?120:220,false,a);return true;}
  // light/push: a stagger; two quick hits = dazed (grab / uppercut window, Double Dragon's bent-over enemy). A dazed
  // enemy is not pushed away, so the next hits keep landing.
  if(v.st==='grabbed'||v.st==='held')return true;
  const still=v.st==='dizzy'||v.dazed;v.mv=null;v.st='hurt';v.stT=0;v.vx=still?0:dirx*(kind==='push'?100:25);v.dir=-dirx;v.hurtLow=kind==='push';
  v.daze=v.daze.filter(q=>t-q<1.2);v.daze.push(t);if(v.daze.length>=2&&v.side==='foe'&&!v.boss){v.dazed=true;}else if(v.boss&&v.daze.length>=4){v.dazed=true;v.daze=[];}
  return true;}
 function knockdown(v,vx,vz,dead,a){if(v.grabbedBy)releaseGrab(v.grabbedBy,false);if(v.grabbed)releaseGrab(v,false);if(v.heldBy){v.heldBy.st='idle';v.heldBy=null;}
  v.mv=null;v.st='fall';v.stT=0;v.vx=vx;v.vz=vz;v.z=Math.max(v.z,1);v.dir=-Math.sign(vx)||v.dir;v.dead=dead;v.dazed=false;v.jug=0;shakeT=Math.max(shakeT,.16);sfx.thud();
  if(v.side==='foe'&&v.weapon?.foe&&(dead||v.id.charCodeAt(v.id.length-1)%3!==0)){items.push({x:v.x,d:v.d,z:20,vz:120,kind:v.weapon.kind});v.weapon=null;}
  if(v.side==='hero'&&v.weapon){items.push({x:v.x,d:v.d,z:20,vz:120,kind:v.weapon.kind,uses:v.weapon.uses});v.weapon=null;}
  if(v.side==='hero'&&v.carry)v.carry=null;}
 function throwVictim(f,v){releaseGrab(f,false);v.x=f.x-f.dir*6;knockdown(v,-f.dir*240,300,false,f);v.thrown=true;v.hp-=MV.throw.dmg*(1+.07*(run.lv-1));v.flash=.2;gainXP(3);run.score+=400;if(v.hp<=0)v.dead=true;}
 function grabStart(f,v){f.st='grabbing';f.stT=0;f.grabbed=v;f.knees=0;v.st='grabbed';v.stT=0;v.grabbedBy=f;v.mv=null;v.dir=-f.dir;v.x=f.x+f.dir*22;v.d=f.d;}
 function releaseGrab(f,knock){const v=f.grabbed;f.grabbed=null;if(f.st==='grabbing')f.st='idle';if(!v)return;v.grabbedBy=null;if(knock)knockdown(v,f.dir*170,230,v.hp<=0,f);else if(v.st==='grabbed'){v.st='hurt';v.stT=0;}}
 function gainXP(n){if(!run)return;run.xp+=n;while(run.lv<7&&run.xp>=LV_XP[run.lv]){run.lv++;const u=UNLOCK[run.lv];sfx.lvl();vibrate([20,40,20]);
   const sp=SPECIALS.find(q=>q.lv===run.lv&&q.lv>1);const b={t:3.4,lv:run.lv,name:u?u[0]:sp?.name,how:u?u[1]:sp?.how,sp:sp&&!u?1:0};if(lvBanner)lvQueue.push(b);else lvBanner=b;if(sp&&u)lvQueue.push({t:3,lv:run.lv,name:sp.name,how:sp.how,sp:1});}}
 const txt=(f,s2)=>fx.push({kind:'txt',txt:s2,x:f.x,d:f.d,z:115,t:1});
 function spark(v,a,kind){fx.push({kind:'hit',x:v.x-(v.x-(a?a.x:v.x))*.35,d:v.d,z:v.z+60*v.big,t:.22,big:kind==='knock'||kind==='launch'});}
 function breakProp(p){if(p.broken)return;p.hp--;sfx.B();if(p.hp<=0){p.broken=true;fx.push({kind:'debris',x:p.x,d:p.d,z:20,t:.5});if(p.hides)items.push({x:p.x,d:p.d,z:10,vz:140,kind:p.hides});props=props.filter(q=>q!==p);}}
 function spawnShot(f,what){const own=f.side==='foe'?'foe':'hero';
  if(what==='knife'){shots.push({x:f.x+f.dir*24,d:f.d,z:52,vx:f.dir*360,vz:0,kind:'knife',side:own,dmg:f.side==='hero'?6:3,life:1.4});if(f.weapon&&f.side==='hero'){f.weapon.uses--;if(f.weapon.uses<=0)f.weapon=null;}sfx.whiff();}
  else if(what==='bullet'){shots.push({x:f.x+f.dir*34*f.big,d:f.d,z:62*f.big,vx:f.dir*780,vz:0,kind:'bullet',side:own,dmg:f.boss?6:5,life:1.4,flat:1});sfx.gun();fx.push({kind:'flash',x:f.x+f.dir*36*f.big,d:f.d,z:62*f.big,t:.08});}
  else if(what==='lob'){const tg=f.aimAt||hero,T=.85,kind=f.T?.ranged==='bottle'?'bottle':'molotov';shots.push({kind,x:f.x+f.dir*10,d:f.d,z:80,tx:tg.x,td:tg.d,sx:f.x+f.dir*10,sd:f.d,T,age:0,side:own,dmg:4,life:T+.1,lob:1});sfx.whiff();}
  // a weapon thrown end over end: hits the first one in its line hard, then clatters to the floor to be picked up again
  else if(what==='weapon'&&f.weapon){const w=f.weapon,W0=WPN[w.kind]||WPN.bat;shots.push({x:f.x+f.dir*22,d:f.d,z:64,vx:f.dir*430,vz:70,kind:'wpn',wkind:w.kind,uses:w.uses,side:own,dmg:W0.dmg+3,life:1.8,spin:0});f.weapon=null;sfx.U();}
  else if(what==='carry'&&f.carry){const kd=f.carry.kind;shots.push({x:f.x+f.dir*22,d:f.d,z:108*(f.big||1),vx:f.dir*(kd==='barrel'?290:330),vz:kd==='barrel'?10:0,kind:kd,side:own,dmg:kd==='rock'?7:6,life:2.6,rollAfter:kd==='barrel',hides:f.carry.hides});f.carry=null;sfx.U();}}

 function dropWeapon(sh){const u=(sh.uses||1)-1;if(u>0)items.push({x:sh.x-Math.sign(sh.vx)*10,d:sh.d,z:24,vz:140,kind:sh.wkind,uses:u});sfx.thud();}
 // ---- per-frame update
 function step(dt){t+=dt;if(hitstop>0){hitstop-=dt;return;}if(slow>0){slow-=dt;dt*=.3;}
  readStick();if(bot.on)botThink(dt);if(spCD>0)spCD-=dt;
  if(hero&&phase==='play')heroStep(hero,dt);
  if(bossOn)bossT+=dt;
  for(const f of F){if(f.scripted){if(phase==='play')scriptStep(f,dt);}else if((f.side==='foe'||f.side==='ally')&&phase==='play')foeStep(f,dt);physics(f,dt);f.inv=Math.max(0,f.inv-dt);f.flash=Math.max(0,f.flash-dt);if(f.hpShow>0)f.hpShow-=dt;
   const want=BD.P[poseOf(f)]||BD.P.stand,rate=f.mv?(f.mv.def.seq[f.mv.seg]?(2.6/Math.max(.04,f.mv.def.seq[f.mv.seg][1])):20):f.st==='walk'||f.st==='run'?14:10;
   f.pose=BD.blend(f.pose,want,1-Math.exp(-dt*rate));f.poseName=poseOf(f);}
  // shots
  for(const sh of shots){sh.life-=dt;
   if(sh.lob){sh.age+=dt;const q=Math.min(1,sh.age/sh.T);sh.x=sh.sx+(sh.tx-sh.sx)*q;sh.d=sh.sd+(sh.td-sh.sd)*q;sh.z=80*(1-q)+Math.sin(q*Math.PI)*90;
    if(q>=1&&!sh.landed){sh.landed=true;sh.life=0;if(sh.kind==='molotov'){fires.push({x:sh.x,d:sh.d,r:26,t:3.2,tick:0});sfx.fire();}else{sfx.glass();fx.push({kind:'glass',x:sh.x,d:sh.d,z:4,t:.4});
     for(const v of living(['hero','ally']))if(Math.hypot(v.x-sh.x,(v.d-sh.d)*1.5)<24)damage(null,v,sh.dmg,'push',0,{});}}continue;}
   sh.x+=sh.vx*dt;sh.z+=sh.vz*dt;if(!sh.roll&&!sh.flat)sh.vz-=G*.25*dt;if(sh.kind==='wpn')sh.spin+=dt*Math.sign(sh.vx)*18;if(sh.z<=0&&!sh.roll&&sh.rollAfter){sh.z=0;sh.vz=0;sh.roll=true;sh.vx*=.85;sfx.thud();fx.push({kind:'dust',x:sh.x,d:sh.d,z:0,t:.3});}
   if(sh.z<=0&&!sh.roll){sh.z=0;sh.life=Math.min(sh.life,.05);if(sh.kind==='wpn'&&!sh.dropped){sh.dropped=1;dropWeapon(sh);}}
   const targets=sh.side==='hero'?living('foe'):living(['hero','ally']);for(const v of targets){if(canBeHit(v,null)&&Math.abs(v.x-sh.x)<18&&Math.abs(v.d-sh.d)<(sh.kind==='bullet'?9:12)&&sh.z<v.z+115*v.big){const owner=sh.side==='hero'?hero:null;damage(owner,v,sh.dmg,'knock',sh.vx*.4,{});sfx.P();if(!sh.roll){sh.life=0;if(sh.hides)items.push({x:sh.x,d:sh.d,z:20,vz:120,kind:sh.hides});if(sh.kind==='wpn'&&!sh.dropped){sh.dropped=1;dropWeapon(sh);}}}}}
  shots=shots.filter(q=>q.life>0&&q.x>cam.x-120&&q.x<cam.x+vw+120);
  // molotov fire on the floor: burns whoever stands in it (enemies too)
  for(const fi of fires){fi.t-=dt;fi.tick-=dt;if(fi.tick<=0){fi.tick=.45;for(const v of F)if(v.st!=='dead'&&!v.gone&&v.z<10&&Math.hypot(v.x-fi.x,(v.d-fi.d)*1.6)<fi.r&&canBeHit(v,null)){damage(v.side==='foe'&&hero?hero:null,v,2,'light',0,{});v.flash=.2;}}}
  fires=fires.filter(q=>q.t>0);
  // the Turnbulls' bus: headlights flash on a row, then it ploughs through everyone in it
  if(bus){bus.t+=dt;if(bus.t>1.3){bus.x+=bus.dir*560*dt;for(const v of F){if(bus.hit.has(v)||v.st==='dead'||v.gone)continue;const rel=(v.x-bus.x)*bus.dir;
     if(Math.abs(v.d-bus.d)<24&&rel<12&&rel>-230){bus.hit.add(v);if(canBeHit(v,null)){v.hp-=v.side==='hero'?6:14;v.flash=.2;knockdown(v,bus.dir*320,320,v.hp<=0,null);if(v.side==='foe'){run.score+=300;txt(v,'ROADKILL!');}else{sfx.hurt();vibrate(40);run.hurt=true;}}}}
    if((bus.dir>0&&bus.x>cam.x+vw+300)||(bus.dir<0&&bus.x<cam.x-300))bus=null;}}
  if(lurch>0){lurch-=dt;for(const f of F)if(f.z<=0&&f.st!=='dead')f.x-=130*dt*Math.min(1,lurch*3);}
  for(const i of items){if(i.z>0||i.vz){i.vz=(i.vz||0)-G*dt;i.z=Math.max(0,i.z+i.vz*dt);if(i.z===0)i.vz=0;}}
  for(const q of fx){q.t-=dt;
   if(q.kind==='furyhit'&&!q.done&&q.t<=.02){q.done=true;const v=q.v;if(v&&!v.gone&&v.st!=='dead'){v.inv=0;if(v.st==='down'||v.st==='getup')v.st='idle';damage(hero,v,13,'launch',Math.sign(v.x-hero.x||1)*220,{special:1});sfx.U();}}}
  fx=fx.filter(q=>q.t>0);
  if(combo.t>0){combo.t-=dt;if(combo.t<=0)combo.n=0;}
  if(cut>0)cut-=dt;
  // camera: follow the hero, never back, locked during a wave
  if(hero&&phase==='play'){const want=clamp(hero.x-vw*.4,Math.max(cam.x,0),Math.max(0,A.len-vw));cam.x=clamp(want,cam.lockA,cam.lockB);if(cam.lockB<1e8)cam.x=cam.lockA;}
  triggerWaves(dt);
  if(goT>0)goT-=dt;if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}if(lvBanner){lvBanner.t-=dt;if(lvBanner.t<=0)lvBanner=lvQueue.shift()||null;}if(shakeT>0)shakeT-=dt;if(fade>0)fade=Math.max(0,fade-dt*2.5);
  // remove the beaten (now and then one drops food)
  for(const f of F)if(f.st==='dead'&&f.stT>1.1&&f.side==='foe'&&!f.gone){f.gone=true;run.score+=f.T.pts;gainXP(f.boss?10:3);if(f.challenger)freeCharacter(f.challenger,f);if(f.boss)bossBeaten(f);else if(uid%6===0)items.push({x:f.x,d:f.d,z:20,vz:150,kind:['pizza','burger'][uid%2]});}
  F=F.filter(f=>!f.gone||f.side==='hero');}
 function physics(f,dt){f.stT+=dt;if(f.entering){f.entering-=dt;f.d=Math.min(f.d+60*dt,A.dMin+30);if(f.entering<=0)f.entering=null;}
  if(f.z>0||f.vz>0){f.z+=f.vz*dt;f.vz-=G*dt;if(f.z<=0){f.z=0;land(f);}}
  if(f.st==='hurt'||f.st==='fall'||f.st==='down'||f.st==='dead'){f.x+=f.vx*dt;f.vx*=Math.exp(-dt*(f.z>0?.6:8));}
  if(f.st==='hurt'&&f.stT>.3){f.st=f.dazed?'dizzy':'idle';f.stT=0;}
  if(f.st==='dizzy'&&f.stT>1.6){f.st='idle';f.dazed=false;f.daze=[];}
  if(f.st==='down'&&f.stT>(f.side==='hero'?.7:.85)){if(f.dead){f.st='dead';f.stT=0;if(f.side==='hero')heroOut(f);}else{f.st='getup';f.stT=0;}}
  if(f.st==='getup'&&f.stT>.4){f.st='idle';f.inv=f.side==='hero'?1.2:.4;}
  if(f.st==='grabbed'&&f.grabbedBy&&f.grabbedBy.st!=='grabbing'&&f.grabbedBy.st!=='atk'){f.grabbedBy.grabbed=null;f.grabbedBy=null;f.st='idle';}
  if(f.st==='grabbing'&&f.stT>2.6)releaseGrab(f,false);
  if(f.st==='holding'&&f.stT>1.8){f.st='idle';if(hero.heldBy===f){hero.heldBy=null;hero.st='idle';}}
  if(f.st==='held'){// a bruiser has you: mash buttons to break free (or SPECIAL), he punches meanwhile
   const by=f.heldBy;if(!by||by.st!=='holding'){f.st='idle';f.heldBy=null;}else{f.x=by.x+by.dir*24;f.d=by.d;if(Math.floor(f.stT/.55)>Math.floor((f.stT-dt)/.55)&&f.stT>.3){f.hp-=2*DIFF;f.flash=.14;sfx.hurt();run.hurt=true;if(f.hp<=0){f.heldBy=null;by.st='idle';knockdown(f,by.dir*150,200,true,by);}}
    if(f.st==='held'&&(f.escape>=1||f.stT>1.8)){f.st='idle';f.heldBy=null;by.st='idle';by.stT=0;f.inv=.6;}}}
  // pits: a fighter on the ground over a hole falls in
  if(f.z===0&&!['fall','pit','dead','gone'].includes(f.st))for(const [a,b,d0,d1] of A.pits)if(f.x>a+6&&f.x<b-6&&f.d>d0+3&&f.d<d1-3){f.st='pit';f.stT=0;f.vz=0;f.mv=null;sfx.die();if(f.side==='foe'){run.score+=600;gainXP(4);fx.push({kind:'txt',txt:'BYE!',x:f.x,d:f.d,z:60,t:1});}}
  if(f.st==='pit'){f.z-=420*dt*Math.min(1,f.stT*3);if(f.stT>.8){if(f.side==='foe'){f.gone=true;if(f.boss)bossBeaten(f);}else if(f.side==='ally'){f.st='idle';f.z=0;f.x=cam.x+40;}else heroPit(f);}}
  // solid obstacles: pushed out sideways or in depth, whichever is shorter
  if(f.z<30&&f.st!=='pit')for(const b of A.blocks){const x0=b.x-10,x1=b.x+b.w+10,d0=b.d0-5,d1=b.d1+5;if(f.x>x0&&f.x<x1&&f.d>d0&&f.d<d1){const ox=Math.min(f.x-x0,x1-f.x),od=Math.min(f.d-d0,d1-f.d);
   if(od*2.2<ox){f.d=f.d-d0<d1-f.d?d0:d1;}else f.x=f.x-x0<x1-f.x?x0:x1;}}
  f.d=clamp(f.d,f.entering?0:A.dMin,A.dMax);
  if(f.side==='hero'){const lo=cam.x+14,hi=cam.lockB<1e8?cam.x+vw-14:A.len-14;f.x=clamp(f.x,lo,hi);}}
 function land(f){if(f.st==='fall'){f.st='down';f.stT=0;f.vz=0;sfx.thud();fx.push({kind:'dust',x:f.x,d:f.d,z:0,t:.35});
   if(f.thrown){f.thrown=false;for(const o of living(f.side))if(o!==f&&canBeHit(o,null)&&Math.abs(o.x-f.x)<36&&Math.abs(o.d-f.d)<16){o.hp-=3;knockdown(o,Math.sign(o.x-f.x||1)*170,210,o.hp<=0,null);}}}
  else if(f.st==='air'){if(f.side==='hero'&&f.airAtk){f.recT=f.airAtk==='spin'?.3:.32;f.runT=0;}f.st='idle';f.airAtk=null;f.vx=0;fx.push({kind:'dust',x:f.x,d:f.d,z:0,t:.25});}}
 function heroStep(h,dt){
  // the special works out of trouble too (Breakaway)
  if(['hurt','held','grabbed','dizzy'].includes(h.st)){if(spCD<=0&&pending('special')){took('special');special(h,inp.sx);}if(h.st==='held'&&(took('punch',.3)||took('kick',.3)||took('jump',.3)))h.escape+=.24;return;}
  if(['fall','down','getup','pit','dead','win'].includes(h.st))return;
  // landing from an air kick takes a moment, and the running jump kick needs a breather before the next one
  h.rjCD=Math.max(0,(h.rjCD||0)-dt);if(h.recT>0){h.recT-=dt;h.vx*=Math.max(0,1-dt*10);h.x+=h.vx*dt;return;}
  const sx=inp.sx,sy=inp.sy,mov=Math.hypot(sx,sy)>.2;
  if(Math.abs(sx)>.88){h.runT=(h.runT||0)+dt;}else h.runT=0;const running=h.runT>.2&&!h.carry;
  // a special cancels whatever you're doing (but never one special into another)
  if(pending('special')&&!(h.mv?.def.special)&&spCD<=0&&h.st!=='air'&&h.st!=='grabbing'&&h.st!=='carry'){took('special');special(h,sx);return;}
  if(h.st==='atk'){moveStep(h,dt);bufferChain(h);return;}
  if(h.st==='air'){h.vx+=sx*260*dt;h.vx=clamp(h.vx,-190,190);h.x+=h.vx*dt;h.d+=sy*50*dt;
   if(!h.airAtk&&took('kick')&&run.lv>=2){if(run.lv>=7&&Math.abs(h.vz)<190){h.airAtk='spin';h.spinT=0;h.spinA=0;sfx.K();}else{h.airAtk='jkick';sfx.k();}h.airHit=new Set();}
   if(!h.airAtk&&took('punch')){h.airAtk='jkick';h.airHit=new Set();}
   if(h.airAtk){const def=h.airAtk==='spin'?{reach:[-54,54],dmg:6,kind:'launch',kb:170}:{reach:[4,54],dmg:4,kind:'knock',kb:170};if(h.airAtk==='spin'){h.spinT+=dt;const a0=h.spinA||0;h.spinA=a0+dt*SPIN_W;h.dir=Math.cos(h.spinA)>=0?h.baseDir:-h.baseDir;if(Math.floor(h.spinA/Math.PI)!==Math.floor(a0/Math.PI))sfx.whiff();}
    for(const v of living('foe')){if(h.airHit.has(v)||!canBeHit(v,h))continue;const dx=(v.x-h.x)*(h.airAtk==='spin'?1:h.dir),dd=Math.abs(v.d-h.d);if(dd>16)continue;
     const ok=h.airAtk==='spin'?Math.abs(v.x-h.x)<54:dx>=def.reach[0]&&dx<=def.reach[1];if(ok){h.airHit.add(v);damage(h,v,def.dmg,def.kind,def.kb,def);sfx.K();}}}
   return;}
  if(h.st==='grabbing'){const v=h.grabbed;if(!v||v.st!=='grabbed'){releaseGrab(h,false);return;}v.x=h.x+h.dir*22;v.d=h.d;
   const away=Math.abs(sx)>.5&&Math.sign(sx)!==h.dir;
   if(took('kick')||took('punch'))startMove(h,run.lv>=4&&away?'throw':'knee');
   else if(away&&h.stT>.6&&run.lv<4)releaseGrab(h,false);return;}
  if(h.st==='carry'){h.x+=sx*60*dt;h.d+=sy*40*dt;if(Math.abs(sx)>.2)h.dir=Math.sign(sx);if(took('punch')||took('kick'))startMove(h,'heave');return;}
  // move with a little weight: speeds ease in and out
  const tvx=mov?sx*(running?160:84):0,tvd=mov?sy*64:0;h.vx+=(tvx-h.vx)*Math.min(1,dt*16);h.vd=(h.vd||0)+(tvd-(h.vd||0))*Math.min(1,dt*16);
  h.x+=h.vx*dt;h.d+=h.vd*dt;if(Math.abs(sx)>.2)h.dir=Math.sign(sx);
  if(mov){h.walkPh+=dt*(running?9:7);h.st=running?'run':'walk';}else h.st='idle';
  // walking into a dazed enemy grabs them (level 3) unless you're already punching
  let near=false;if(run.lv>=3&&mov&&Math.abs(sx)>.3&&!h.weapon&&!pending('punch',.15)&&!pending('kick',.15)){for(const v of living('foe'))if(v.st==='dizzy'&&!v.T.noGrab&&Math.abs(v.d-h.d)<12&&(v.x-h.x)*h.dir>0&&(v.x-h.x)*h.dir<32){near=true;h.grabT=(h.grabT||0)+dt;if(h.grabT>.12){h.grabT=0;grabStart(h,v);sfx.pick();return;}}}
  if(!near)h.grabT=0;
  // food under the feet
  for(const i of items)if(FOOD[i.kind]&&Math.abs(i.x-h.x)<22&&Math.abs(i.d-h.d)<14&&i.z===0&&h.hp<h.maxHp){h.hp=Math.min(h.maxHp,h.hp+FOOD[i.kind]);i.gone=true;sfx.eat();txt(h,'+'+FOOD[i.kind]);}
  items=items.filter(i=>!i.gone);
  const away=Math.abs(sx)>.5&&Math.sign(sx)!==h.dir;
  if(took('jump')){h.st='air';h.vz=340;h.vx=running?h.dir*180:sx*90;h.baseDir=h.dir;h.airAtk=null;h.airHit=new Set();if(running&&inp.held.kick)h.airAtk='jkick';sfx.whiff();return;}
  if(took('punch')){
   const it=items.find(i=>!FOOD[i.kind]&&Math.abs(i.x-h.x)<24&&Math.abs(i.d-h.d)<14&&i.z===0),pr=props.find(p=>p.kind==='barrel'&&Math.abs(p.x-h.x)<26&&Math.abs(p.d-h.d)<14);
   if(it&&!h.weapon){items=items.filter(q=>q!==it);if(it.kind==='rock'){h.carry={kind:'rock'};h.st='carry';}else h.weapon={kind:it.kind,uses:it.uses||WPN[it.kind]?.uses||10};sfx.pick();txt(h,it.kind.toUpperCase()+'!');return;}
   if(pr&&!h.weapon&&!enemyNear(h,40)){props=props.filter(q=>q!==pr);h.carry={kind:'barrel',hides:pr.hides};h.st='carry';sfx.pick();return;}
   autoFace(h,sx);
   if(h.weapon){startMove(h,h.weapon.kind==='knife'?'toss':'swing');return;}
   if(run.lv>=5&&away&&behindFoe(h)){startMove(h,'elbow');return;}
   if(running){startMove(h,'dashp');return;}
   const dz=living('foe').find(v=>v.st==='dizzy'&&Math.abs(v.d-h.d)<14&&(v.x-h.x)*h.dir>-6&&(v.x-h.x)*h.dir<54);
   if(run.lv>=6&&dz&&!mov){startMove(h,'up');return;}
   startMove(h,'jab');return;}
  if(took('kick')){autoFace(h,sx);if(h.weapon){startMove(h,'hurl');return;}if(away&&behindFoe(h)){startMove(h,'bkick');return;}if(running&&run.lv>=2&&h.rjCD<=0){h.st='air';h.vz=260;h.vx=h.dir*210;h.airAtk='jkick';h.airHit=new Set();h.baseDir=h.dir;h.rjCD=1.5;return;}startMove(h,'kick');return;}}
 // chains: once a move's hit is out, PUNCH/KICK queues the next (only when it connected: whiffs recover fully)
 function bufferChain(h){const m=h.mv;if(!m||m.chainQ)return;const nx=m.def.next;if(!nx)return;const actEnd=Math.max(...(m.def.act||[0]));if(m.seg<actEnd||!m.landed)return;
  let q=null;if(nx.P&&pending('punch',.3)){took('punch',.3);q=nx.P;}else if(nx.K&&pending('kick',.3)){took('kick',.3);q=nx.K;}
  if(q&&MV[q].wpn&&!h.weapon)q=null;if(q==='sweep'&&run.lv<2)q='kick';if(q)m.chainQ=q;}
 function behindFoe(h){return living('foe').some(v=>(v.x-h.x)*h.dir<0&&Math.abs(v.x-h.x)<60&&Math.abs(v.d-h.d)<18);}
 function autoFace(h,sx){const moving=Math.abs(sx)>.2;let best=null,bd=moving?80:100;for(const v of living('foe')){if(!canBeHit(v,h)&&v.st!=='dizzy')continue;if(moving&&(v.x-h.x)*Math.sign(sx)<-14)continue;const d=Math.abs(v.x-h.x)+Math.abs(v.d-h.d)*2;if(d<bd){bd=d;best=v;}}
  if(best){if(!moving)h.dir=Math.sign(best.x-h.x)||h.dir;if(Math.abs(best.d-h.d)<28)h.d+=(best.d-h.d)*.85;}}   // QoL: face and line up with the nearest enemy
 const enemyNear=(h,r)=>living('foe').some(v=>Math.abs(v.x-h.x)<r&&Math.abs(v.d-h.d)<16);
 // the special: one button, what it does is written under it; the meter is spent only when one starts, and a special
 // in progress (or the short cooldown after) ignores more presses
 function nextSpecial(h,sx){const bars=Math.floor(run.meter/100);if(bars<1)return null;
  if(['hurt','held','grabbed','dizzy'].includes(h.st))return 'burst';
  if(bars>=3&&run.lv>=5)return 'fury';if(bars>=2&&run.lv>=3&&Math.abs(sx)>.4)return 'twister';return 'rise';}
 function special(h,sx){if(h.mv?.def.special||spCD>0)return;const sp=nextSpecial(h,sx);
  if(!sp){if(t>needMsgT){needMsgT=t+1.2;txt(h,'HIT THEM TO FILL THE METER');}return;}
  const cost=sp==='fury'?300:sp==='twister'?200:100;run.meter-=cost;
  if(h.heldBy){const by=h.heldBy;h.heldBy=null;by.st='idle';by.stT=0;}if(h.grabbedBy)releaseGrab(h.grabbedBy,false);h.st='idle';h.mv=null;h.dazed=false;
  if(sp==='twister'&&Math.abs(sx)>.2)h.dir=Math.sign(sx);
  startMove(h,sp);fx.push({kind:'sp',name:sp==='rise'?'RISING FIST':sp==='twister'?'TWISTER':sp==='burst'?'BREAKAWAY':"WARRIOR'S FURY",t:1,big:sp==='fury'});sfx.S();vibrate([20,20,40]);
  if(sp==='fury')fury(h);}
 function fury(h){slow=.9;shakeT=.5;cut=1.2;
  // every enemy on screen takes a blow, one after another (on the game clock: pausing holds them)
  const list=living('foe').filter(v=>v.x>cam.x-10&&v.x<cam.x+vw+10).sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x));list.forEach((v,i)=>fx.push({kind:'furyhit',v,t:.25+i*.12}));}
 // ---- enemies (and the Riffs on your side)
 function foeStep(f,dt){if(['hurt','fall','down','getup','pit','dead','grabbed','dizzy'].includes(f.st)||f.gone||f.entering)return;
  if(f.st==='atk'){moveStep(f,dt);return;}if(f.st==='holding')return;
  const ally=f.side==='ally',T=f.T,ai=f.ai;ai.cool-=dt*(ally?1.3:DIFF*chAgg());
  // a Rogue running off once the Riffs arrive: out of the screen and gone
  if(ai.flee&&!ally&&!f.boss&&!['hurt','fall','down','dead','held','dizzy','grabbed'].includes(f.st)&&!f.mv){f.x+=ai.flee*T.sp*1.5*dt;f.dir=ai.flee;f.st='walk';f.walkPh+=dt*7;
   if(f.x<cam.x-70||f.x>cam.x+vw+70)f.gone=true;return;}
  // pick a target: the hero, or a Riff who is closer (once the Riffs are in, they all go for the boss)
  let h=null;if(ally&&riffsIn&&bossF&&bossF.hp>0&&!bossF.gone)h=bossF;else if(ally){let bd=1e9;const fs=living('foe');for(const v of fs){if(v.boss&&fs.length>1)continue;const d=Math.abs(v.x-f.x)+Math.abs(v.d-f.d)*2;if(d<bd){bd=d;h=v;}}if(!h||(f.type==='fox'&&Math.abs(h.x-f.x)>160)){if(f.type==='fox'&&hero){const gx=hero.x+(f.d<hero.d?-34:34),dx=gx-f.x;if(Math.abs(dx)>8){f.x+=Math.sign(dx)*Math.min(Math.abs(dx),T.sp*1.6*dt);f.st='run';f.walkPh+=dt*8;f.dir=Math.sign(dx);}else{f.st='idle';f.dir=hero.dir;}}else f.st='idle';return;}}
  else{h=hero;let bd=hero&&canBeHit(hero,f)?Math.abs(hero.x-f.x)+60:1e9;if(!f.boss)for(const v of living('ally')){const d=Math.abs(v.x-f.x);if(d<bd){bd=d;h=v;}}}
  if(!h||h.st==='dead'||h.st==='pit'){f.st='idle';return;}
  // scared Rogues back off once the Riffs are here
  if(ai.scared&&!ally&&!f.boss&&ai.mode==='in'&&((t*7+f.x)%11)<dt*2)ai.mode='out';
  // only a few press the attack at once (fair fights); the rest circle at a distance
  if(!ally){const attackers=living('foe').filter(o=>o.ai?.mode==='in').length,cap=(A.waves[wave]?.max||2)+(bossOn?1:0);
   if(ai.mode!=='in'&&attackers<cap&&Math.random()<dt*1.5)ai.mode='in';if(ai.mode==='in'&&attackers>cap&&!f.boss)ai.mode='out';}
  const side=Math.sign(f.x-h.x)||1,ranged=T.ranged;
  let gx=h.x+side*(ranged==='gun'?190:ranged==='knife'?150:ranged?140:(30*f.big+8)),gd=h.d;
  if(ai.mode==='out'&&!ally){ai.hover+=dt;gx=h.x+side*(120+Math.sin(ai.hover)*30);gd=DEPTH/2+Math.sin(ai.hover*.7)*DEPTH*.4;}
  // the beating: the boss walks back to the middle of the screen, the Riffs ring him (front and back rows on both sides)
  if(f.boss&&riffsIn){gx=cam.x+vw/2;gd=(A.dMin+A.dMax)/2;}
  if(ally&&riffsIn&&h===bossF){gx=h.x+side*(24*h.big+6+Math.abs(f.ring||0)*6);gd=clamp(h.d+(f.ring||0)*8,A.dMin,A.dMax);}
  gx=clamp(gx,cam.x+14,cam.x+vw-14);
  const dx=gx-f.x,dd=gd-f.d,sp=T.sp*(f.boss&&f.hp<f.maxHp*.4?1.3:1)*(ally?1:(.85+.25*DIFF))*(A.chase&&f.chaser?1.7:1);
  if(Math.abs(dx)>4||Math.abs(dd)>3){f.x+=clamp(dx,-1,1)*Math.min(Math.abs(dx),sp*dt*(Math.abs(dx)>150?1.6:1));f.d+=clamp(dd,-1,1)*Math.min(Math.abs(dd),sp*.6*dt);f.st='walk';f.walkPh+=dt*6;}else f.st='idle';
  f.dir=Math.sign(h.x-f.x)||f.dir;
  const adx=Math.abs(h.x-f.x),add=Math.abs(h.d-f.d);
  const ringWait=ally&&riffsIn&&h===bossF&&Math.abs(h.x-(cam.x+vw/2))>60;
  if((ally||ai.mode==='in')&&ai.cool<=0&&!ringWait&&canBeHit(h,f)){let mv=null;const r=Math.random();
   if(ranged==='gun'&&adx>90&&add<16)mv='shoot';
   else if(ranged==='knife'&&adx>70&&adx<240&&add<10)mv='toss';
   else if((ranged==='lob'||ranged==='bottle')&&adx>80&&adx<260){mv='lobm';f.aimAt={x:h.x,d:h.d};}
   else if(T.skate&&adx>90&&adx<300&&add<12)mv='rush';
   else if(T.charge&&adx>90&&adx<260&&add<12&&r<.6)mv='charge';
   else if(T.leap&&adx>70&&adx<140&&r<.5)mv='jkickE';
   else if(['big','driver','punkboss'].includes(f.type)&&adx<62&&add<12){mv=adx<40&&r<.4&&h===hero?'bgrab':r<.5?'ebash':'hook';}
   else if(T.shield&&adx<54&&add<12)mv=r<.6?'bash':'eswing';
   else if(T.weapon&&adx<70&&add<12)mv='eswing';
   else if(adx<46*f.big&&add<12){const opts=T.moves.filter(m=>MV[m]&&!['toss','eswing','bash','shoot','lobm'].includes(m));mv=opts[Math.floor(r*opts.length)];}
   if(f.boss&&f.hp<f.maxHp*.5&&!f.summoned&&!A.boss?.endless){f.summoned=true;const ms=A.boss.minions.split(' ').filter(Boolean).slice(0,2);ms.forEach((ty,i)=>spawnFoe({type:ty,side:i?-1:1,d:i?20:DEPTH-20}));fx.push({kind:'say',txt:'GET \'EM!',f,t:1.4});}
   if(mv){startMove(f,mv);ai.cool=(ally?.5:f.boss?(riffsIn?1.4:.6):1.05)+Math.random()*(f.boss?.6:1.1);if(Math.random()<.25&&!ally)ai.mode='out';}}}
 // ---- hero out / pit / boss
 function heroOut(h){run.lives--;if(run.lives>0){Object.assign(h,{st:'air',hp:h.maxHp,inv:2.4,dead:false,z:140,vz:0,vx:0,airAtk:null,airHit:new Set()});txt(h,'GET UP!');}else{phase='over';phaseT=0;musicOn=false;sfx.die();}}
 function heroPit(h){run.lives--;if(run.lives>0){Object.assign(h,{st:'air',hp:h.maxHp,inv:2.4,z:160,vz:0,vx:0,airAtk:null,airHit:new Set()});const p=A.pits.find(([a,b])=>h.x>a-10&&h.x<b+10);if(p)h.x=Math.max(cam.x+20,p[0]-50);}else{h.st='dead';phase='over';phaseT=0;musicOn=false;}}
 function freeCharacter(who,f){if(online||!who)return;const i=cur;if(s.gameRecruits.flat().includes(who))return;s.gameRecruits[i].push(who);fx.push({kind:'txt',txt:nameOf(who).toUpperCase()+' JOINS YOU!',x:f.x,d:f.d,z:140,t:2.8});}
 function bossBeaten(f){slow=1.2;sfx.clear();vibrate([40,60,40,60,100]);
  // freeing someone: the boss if they are a locked character, else the next locked one this game can free
  // a boss who is a locked character joins (the other unlocks are the chapter's challenger)
  if(f.face&&freePool.includes(f.face))freeCharacter(f.face,f);
  setTimeout(()=>{if(!s.alive||phase!=='play')return;areaClear(chapterNo===CH.length-1?'THE WARRIORS ARE HOME!':null);},900);}
 // ---- the test bot (online-native / tests): walk right, fight what's near, step out of gun lines
 function botThink(dt){const h=hero;if(!h||phase!=='play'){bot.stick={sx:0,sy:0};return;}bot.t-=dt;const foes=living('foe');let near=null,bd=1e9;for(const v of foes){if(v.entering)continue;if(A.escape&&v.x<h.x-40&&!(v.mv&&Math.abs(v.x-h.x)<70))continue;const d=Math.abs(v.x-h.x)+Math.abs(v.d-h.d)*2;if(d<bd){bd=d;near=v;}}
  const gun=foes.find(v=>v.mv?.name==='shoot'&&v.mv.seg===0&&Math.abs(v.d-h.d)<14);
  if(gun){bot.stick={sx:0,sy:h.d<DEPTH/2?1:-1};return;}
  if(near){const dx=near.x-h.x,dd=near.d-h.d;bot.stick={sx:Math.abs(dx)>44?Math.sign(dx):Math.abs(dx)<16?-Math.sign(dx)*.3:0,sy:Math.abs(dd)>4?Math.sign(dd)*.8:0};
   if(bot.t<=0&&Math.abs(dd)<12&&Math.abs(dx)<62){bot.t=.14;h.dir=Math.sign(dx)||1;const r=Math.random();pressBtn(run.meter>=100&&r<.07?'special':r<.62?'punch':r<.86?'kick':'jump');setTimeout(()=>{inp.held={};},60);}}
  else bot.stick={sx:1,sy:((A.dMin+A.dMax)/2-h.d)/DEPTH};
  const pit=A.pits.find(([a,b,d0,d1])=>a-h.x>0&&a-h.x<46&&h.d>d0-4&&h.d<d1+4);if(pit&&bot.stick.sx>0){if(pit[3]-pit[2]<DEPTH)bot.stick.sy=h.d-pit[2]<pit[3]-h.d?-1:1;else if(h.st!=='air')pressBtn('jump');}}

 // ---- drawing
 function draw(){layout();const W=s.W,H=s.H;x.setTransform(1,0,0,1,0,0);x.fillStyle='#06060a';x.fillRect(0,0,W,H);
  if(phase==='title'||phase==='select'){drawTitle();return;}if(phase==='story'){drawStory();return;}if(phase==='cut'){cuts.draw();return;}if(!A)return;
  const sh=shakeT>0?(Math.random()-.5)*shakeT*20:0,sway=A.moving?Math.sin(t*2.2)*1.2+Math.sin(t*7.1)*.4:0;
  x.save();x.translate(sh,bandY+sway*k);x.scale(k,k);
  SC.drawArea(x,A,cam.x,vw,BACK,FRONT,t);
  // 96th Street: the warning down the platform edge, then the train roaring past in the track pit
  if(A.chase&&A.foxT&&!A.foxHit&&Math.floor(t*8)%2){const Y=BACK+A.dMin;x.fillStyle='rgba(255,60,40,.28)';x.fillRect(0,Y-16,vw,32);x.font='900 22px "SC Bangers",Impact';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#ffd23c';x.fillText('TRAIN!',40,Y);}
  if(A.trainPass!=null){const y0=BACK*.55-6;for(let i=0;i<5;i++)SC.drawTrainSide(x,A.trainPass-cam.x+i*384,y0,BACK,t,false);
   x.fillStyle='rgba(255,250,220,.5)';x.beginPath();x.ellipse(A.trainPass-cam.x+5*384,y0+30,40,22,0,0,7);x.fill();}
  // fire patches on the floor
  for(const fi of fires){const X=fi.x-cam.x,Y=BACK+fi.d,a=Math.min(1,fi.t);x.fillStyle=`rgba(255,120,30,${.35*a})`;x.beginPath();x.ellipse(X,Y,fi.r,fi.r*.35,0,0,7);x.fill();
   for(let i=0;i<6;i++){const fx2=X+(i-2.5)*fi.r*.32,fh=10+6*Math.sin(t*14+i*1.7);x.fillStyle=`rgba(255,${150+i*12},40,${.8*a})`;x.beginPath();x.moveTo(fx2-4,Y);x.quadraticCurveTo(fx2,Y-fh*1.6,fx2+4,Y);x.fill();}}
  // the bus: warning lights on its row, then the bus itself
  if(bus){const Y=BACK+bus.d;if(bus.t<1.3&&Math.floor(t*8)%2){x.fillStyle='rgba(255,60,40,.25)';x.fillRect(0,Y-24,vw,48);x.font='900 22px "SC Bangers",Impact';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#ffd23c';x.fillText('BUS!',bus.dir>0?40:vw-40,Y);}
   if(bus.t>=1.3){const X=bus.x-cam.x,L=220,bim=DS.picture('bus');if(bim){const bw=L+20,bh=bw*bim.height/bim.width;x.save();x.translate(X,Y);x.scale(bus.dir,1);x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(-L/2+4,0,L*.55,7,0,0,7);x.fill();x.drawImage(bim,-L-6,4-bh,bw,bh);x.restore();}else{x.save();x.translate(X,Y);x.scale(bus.dir,1);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(-L,-4,L+10,10);x.fillStyle='#e8c83c';x.fillRect(-L,-70,L+8,66);x.fillStyle='#1c1c1c';x.fillRect(-L,-14,L+8,10);
    for(let i=0;i<5;i++)x.fillRect(-L+14+i*40,-62,30,22);x.fillStyle='#fff8c0';x.fillRect(2,-30,6,8);x.fillStyle='#0c0c0c';for(const wx of [-L+30,-40]){x.beginPath();x.arc(wx,-4,12,0,7);x.fill();}
    x.font='900 11px "SC Nunito",sans-serif';x.fillStyle='#1c1c1c';x.textAlign='center';x.fillText('TURNBULL AC',-L/2,-31);x.restore();}}}
  x.restore();
  if(portrait&&bandY+VH*k<H){const y0=SYw(FRONT),g2=x.createLinearGradient(0,y0,0,H);g2.addColorStop(0,'rgba(0,0,0,.2)');g2.addColorStop(1,'rgba(0,0,0,.85)');x.fillStyle=g2;x.fillRect(0,y0,W,H-y0);}
  // depth-sorted: obstacles, props, items, fighters, shots
  const list=[...A.blocks.map(b=>({d:b.d1,f:()=>drawBlockAt(b)})),...props.map(p=>({d:p.d,f:()=>drawProp(p)})),...items.map(i=>({d:i.d-.1,f:()=>drawItem(i)})),
   ...F.filter(f=>!f.gone).map(f=>({d:f.d+(f.st==='down'||f.st==='dead'?-.5:0),f:()=>drawFighter(f)})),...shots.map(q=>({d:q.d,f:()=>drawShot(q)}))].sort((a,b)=>a.d-b.d);
  x.save();x.translate(sh,sway*k);for(const e of list)e.f();for(const q of fx)drawFx(q);
  // gun lines: a red dotted line along the gunman's row while he aims
  for(const f of F)if(f.mv?.name==='shoot'&&f.mv.seg===0&&f.st==='atk'){const y=SYw(BACK+f.d)-62*f.big*k*FIG,X0=SX(f.x+f.dir*34*f.big);x.save();x.strokeStyle=`rgba(255,40,40,${.5+.4*Math.sin(t*30)})`;x.lineWidth=2;x.setLineDash([6,6]);x.beginPath();x.moveTo(X0,y);x.lineTo(f.dir>0?W:0,y);x.stroke();x.restore();}
  x.restore();
  if(cut>0){x.fillStyle=`rgba(255,200,60,${.12*cut})`;x.fillRect(0,0,W,H);}
  drawHUD();drawControls();
  if(fade>0){x.fillStyle=`rgba(0,0,0,${fade})`;x.fillRect(0,0,W,H);}}
 function drawBlockAt(b){x.save();x.translate(0,bandY);x.scale(k,k);SC.drawBlock(x,b,b.x-cam.x,BACK+b.d0,BACK+b.d1,t);x.restore();}
 // the spin kick's whirl: a fading crescent round the fighter at kick height that follows the turn; the back half is
 // drawn behind the body, the front half over it, so the leg seems to sweep round them
 function drawSwoosh(f,sx,sy,kk,front){const A=f.spinA||0,cy=sy-f.z*kk-30*kk*f.big,rx=50*kk*f.big,ry=13*kk*f.big,dirS=(f.airAtk==='spin'?f.baseDir:f.dir)||1;
  x.save();x.lineCap='round';for(let i=0;i<14;i++){const a1=A-i*.16,a2=a1-.16,mid=(a1+a2)/2,inFront=Math.sin(mid)>0;if(inFront!==front)continue;
   const al=(1-i/14)*.75;x.strokeStyle=i<3?`rgba(255,255,255,${al})`:`rgba(255,${190-i*6},${90-i*4},${al})`;x.lineWidth=(7-i*.35)*kk;
   x.beginPath();x.moveTo(sx+Math.cos(a1)*rx*dirS,cy+Math.sin(a1)*ry);x.lineTo(sx+Math.cos(a2)*rx*dirS,cy+Math.sin(a2)*ry);x.stroke();}
  x.restore();}
 // the cell of pose `name` on sheet `sheetName` (an alias when that sheet lacks it or left it blank), or null = draw the body
 function sheetCell(sheetName,name){const img=sheetName&&DS.picture(sheetName);if(!img)return null;const ok=c=>c&&c.sy+DS.CELL<=img.height&&!blankCell(img,c);
  let cell=DS.cellOf(sheetName,name);if(!ok(cell)){name=(sheetName.startsWith('hero-')?SHEET_ALIAS:FOE_ALIAS)[name]||name;cell=DS.cellOf(sheetName,name);
   if(!ok(cell)){name='stand';cell=DS.cellOf(sheetName,name);if(!ok(cell))return null;}}
  return {img,cell,name,sheet:sheetName};}
 // where the neck and head are on a drawn sheet cell (measured from the art: src/data/ddNecks.js), in screen space; the cell is
 // drawn at (ox,oy) mirrored by `face`, scaled sc, turned by rot round (ox,oy). null = this cell has no measurement
 function cellNeck(sheetName,name,ox,oy,face,sc,rot){const m=NECKS[sheetName]?.[name];if(!m)return null;const ft=DS.footOf(name),c=Math.cos(rot),sn=Math.sin(rot);
  const T=(px,py)=>{const lx=(px-ft[0])*sc*face,ly=(py-ft[1])*sc;return {x:ox+lx*c-ly*sn,y:oy+lx*sn+ly*c};};return {neck:T(m[0],m[1]),head:T(m[2],m[3]),hand:m.length>5?T(m[4],m[5]):null};}
 function drawFighter(f){const sx=SX(f.x),sy=SYw(BACK+f.d),kk=k*FIG,blink=(f.st==='dead'&&f.stT>.4&&Math.floor(t*14)%2)||(f.inv>0&&f.side==='hero'&&Math.floor(t*16)%2&&!f.mv);if(blink)return;
  if(sx<-90||sx>s.W+90)return;
  let SCL=sheetCell(f.sheet,f.poseName||'stand');
  // a hero's own 8-frame run strip (ww:run-p1/-p2) when it's in: frame by stride, the neck from the measured strip (else run1's)
  const strip=f.st==='run'&&f.sheet?.startsWith('hero-')?DS.picture('run-'+f.sheet.slice(5)):null;
  if(strip){const fr=Math.floor(f.walkPh*1.6)%8;SCL={img:strip,cell:{sx:fr*DS.CELL,sy:0},name:'run1',strip:'run-'+f.sheet.slice(5),fr};}
  const sheet=SCL?.img,cell=SCL?.cell,name=SCL?.name||f.poseName||'stand';
  let spots;const spinning=f.st==='atk'&&f.mv?.def.spin||f.airAtk==='spin',spc=Math.cos(f.spinA||0);
  // a spin kick turns the body round smoothly (x squashed by the cosine of the turn) instead of flipping every frame
  const face=spinning?(f.airAtk==='spin'?f.baseDir:f.dir)*(spc>=0?1:-1)*Math.max(.2,Math.abs(spc)):f.dir;
  if(spinning)drawSwoosh(f,sx,sy,kk,false);
  x.save();if(f.entering)x.globalAlpha=1-f.entering/.6*.7;
  if(cell){const sc=kk*f.big/DS.UNIT;x.save();x.globalAlpha*=.32;x.fillStyle='#000';x.beginPath();x.ellipse(sx,sy,22*kk*f.big,6*kk,0,0,7);x.fill();x.restore();
   // a running stride bobs: up through the stride, down as the back leg comes through
   const lift=f.st==='run'&&!SCL.strip?(name==='run1'?3:1)*kk*(.6+.4*Math.abs(Math.sin(f.walkPh*.8*Math.PI))):0,rot=0;x.save();x.translate(sx,sy-f.z*kk-lift);if(rot)x.rotate(rot);x.scale(face*sc,sc);const ft=DS.footOf(name);if(f.flash>0&&'filter' in x)x.filter=`brightness(${1+Math.min(1,f.flash*5)*1.6})`;x.drawImage(sheet,cell.sx,cell.sy,DS.CELL,DS.CELL,-ft[0],-ft[1],DS.CELL,DS.CELL);x.restore();
   const J=BD.joints(f.pose);const tp=p=>({x:sx+p[0]*face*kk*f.big,y:sy-f.z*kk+p[1]*kk*f.big});spots={head:tp(J.head),neck:tp(J.neck),hand:tp(J.B[2]),hand2:tp(J.A[2]),wa:f.pose.wa,wl:f.pose.wl};
   const cn=SCL.strip&&NECKS[SCL.strip]?.['r'+SCL.fr]?cellNeck(SCL.strip,'r'+SCL.fr,sx,sy-f.z*kk-lift,face,sc,rot):cellNeck(f.sheet,name,sx,sy-f.z*kk-lift,face,sc,rot);if(cn){spots.neck=cn.neck;spots.head=cn.head;if(cn.hand)spots.hand=cn.hand;spots.measured=1;}}
  else spots=BD.drawBody(x,f.pose,{x:sx,y:sy,face,k:kk,o:f.o,big:f.big,flash:f.flash*5,z:f.z});
  // the riot shield, a weapon, a carried barrel
  if(f.shield>0&&!['fall','down','dead'].includes(f.st)){const hx=spots.hand.x+face*4*kk,hy=spots.hand.y;x.fillStyle='rgba(160,190,220,.45)';x.strokeStyle='#2c3448';x.lineWidth=2;x.beginPath();x.roundRect(hx-4*kk,hy-34*kk,8*kk,52*kk,3*kk);x.fill();x.stroke();}
  if(spinning)drawSwoosh(f,sx,sy,kk,true);
  if(f.weapon)drawWeapon(f.weapon.kind,spots,face,kk,f);
  if(f.carry){const im=DS.picture(f.carry.kind);const w=(f.carry.kind==='barrel'?30:26)*kk;if(im)x.drawImage(im,spots.head.x-w/2,spots.head.y-w*1.5,w,w*im.height/im.width);else{x.fillStyle=f.carry.kind==='barrel'?'#7c4c1c':'#8c8c8c';x.beginPath();x.roundRect(spots.head.x-w/2,spots.head.y-w*1.6,w,w*1.1,5);x.fill();}}
  // the face on the neck: heroes and named characters wear their picture, the gangs a drawn head of their own look
  const fw=FACE_W*kk*f.big,mood=['hurt','fall','held','dizzy','grabbed','down','dead'].includes(f.st)?'sad':f.st==='win'?'win':f.st==='atk'?'angry':'normal';
  const nk=spots.neck||spots.head,ux=spots.head.x-nk.x,uy=spots.head.y-nk.y,ul=Math.hypot(ux,uy)||1;
  const fid=f.side==='hero'?s.players[f.pi]?.character:f.face;let fm=f.side==='hero'?(mood==='angry'?'happy':mood):mood;if(fid&&fm!=='normal'&&!headFacts(fid,fm))fm='normal';
  const sp=f.side!=='hero'&&fid?faceSprite(fid,fm,fw,face):null;
  const fh=(f.side==='hero'||sp)&&fid?faceHeight(fid,fm,fw):fw*1.25,cx=nk.x+ux/ul*fh*FACE_UP,cy=nk.y+uy/ul*fh*FACE_UP;spots.face={x:cx,y:cy};
  // the face turns with the neck (lying down = on its side), the chin stays on the neck
  const tilt=Math.atan2(ux,-uy);
  if(f.side==='hero'){x.save();x.translate(cx,cy);x.rotate(tilt);drawFace(s,x,f.pi,0,0,fw/.6,fm,face,.6);x.restore();}
  else if(sp){x.save();x.translate(cx,cy);x.rotate(tilt);x.drawImage(sp.cv,sp.x,sp.y);x.restore();}
  else BD.drawGangHead(x,cx,cy-fw*.08,fw*1.02,f.head||'thug',{face,tilt,mood,id:f.id});
  x.restore();
  if(f.side==='ally'&&f.st!=='dead'&&!(riffsIn&&bossF&&Math.abs(f.x-bossF.x)<90)){x.fillStyle='#e8a83c';x.font=`900 ${Math.max(8,7*kk)}px "SC Nunito",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(f.type==='fox'?'FOX':'RIFF',cx,cy-fw*1.2);}
  if(f.challenger&&f.st!=='dead'){x.font=`900 ${Math.max(9,8*kk)}px "SC Nunito",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=3;x.strokeStyle='#000';const nm=nameOf(f.challenger).toUpperCase();x.strokeText(nm,cx,cy-fw*1.25);x.fillStyle='#ff5c5c';x.fillText(nm,cx,cy-fw*1.25);}
  if(f.st==='dizzy'){for(let i=0;i<3;i++){const a=t*6+i*2.1;x.fillStyle='#ffe85c';x.font=`${10*kk}px sans-serif`;x.textAlign='center';x.fillText('★',spots.face.x+Math.cos(a)*14*kk,spots.face.y-fh*.75+Math.sin(a)*4*kk);}}
  // a telegraphed attack: a red ! over the head before it comes
  if(f.side==='foe'&&f.mv?.def.tell&&f.mv.seg===0){x.font=`900 ${Math.max(14,16*kk)}px "SC Bangers",Impact`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=`rgba(255,${80+Math.floor(80*Math.sin(t*30))},40,.95)`;x.strokeStyle='#000';x.lineWidth=3;x.strokeText('!',cx,cy-fw*1.3);x.fillText('!',cx,cy-fw*1.3);}
  // a small health bar over enemies you've just hit
  if(f.side==='foe'&&f.hpShow>0&&!f.boss&&f.st!=='dead'){const bw=26*kk,bx=cx-bw/2,by=cy-fw*1.15;x.globalAlpha=Math.min(1,f.hpShow*2);x.fillStyle='#000';x.fillRect(bx-1,by-1,bw+2,4*kk+2);x.fillStyle='#e83c3c';x.fillRect(bx,by,bw*clamp(f.hp/f.maxHp,0,1),4*kk);x.globalAlpha=1;}}
 // a weapon in the hand, pointing the way the pose says (wa); a swing leaves a fading arc behind the head of the weapon
 function drawWeapon(kind,spots,face,kk,f){const W0=WPN[kind]||WPN.bat,im=DS.picture(kind),swinging=!!(f.mv&&f.mv.def.wpn);
  const wa=(spots.wa??BD.WA_REST)*Math.PI/180,wl=spots.wl??1,L=(kind==='chain'&&swinging?W0.len*1.3:W0.len)*kk*wl,dx=Math.sin(wa)*face,dy=Math.cos(wa);
  const hx=spots.hand.x,hy=spots.hand.y,tx=hx+dx*L,ty=hy+dy*L;
  if(f.trail){if(swinging&&f.mv.def.act?.includes(f.mv.seg)){f.trail.push({hx,hy,tx,ty});if(f.trail.length>6)f.trail.shift();}else if(f.trail.length)f.trail.shift();
   if(f.trail.length>1){for(let i=1;i<f.trail.length;i++){const a=f.trail[i-1],b=f.trail[i];x.fillStyle=`rgba(255,255,255,${.12+.32*i/f.trail.length})`;x.beginPath();x.moveTo(a.hx+(a.tx-a.hx)*.35,a.hy+(a.ty-a.hy)*.35);x.lineTo(a.tx,a.ty);x.lineTo(b.tx,b.ty);x.lineTo(b.hx+(b.tx-b.hx)*.35,b.hy+(b.ty-b.hy)*.35);x.fill();}}}
  x.save();x.translate(hx,hy);x.rotate(Math.atan2(dy,dx));
  if(im){const h2=L*im.height/im.width;x.drawImage(im,-L*.12,-h2/2,L,h2);}
  else if(kind==='chain'){x.strokeStyle='#000';x.lineWidth=W0.w*kk*.9+2;x.beginPath();x.moveTo(-2,0);for(let i=1;i<=6;i++)x.lineTo(L*i/6,Math.sin(i*1.3+t*20*(swinging?1:0))*1.6*kk);x.stroke();x.strokeStyle=W0.col;x.lineWidth=W0.w*kk*.9;x.setLineDash([3*kk,1.5*kk]);x.stroke();x.setLineDash([]);}
  else{x.lineCap='round';x.strokeStyle='#000';x.lineWidth=W0.w*kk*.9+2;x.beginPath();x.moveTo(-L*.08,0);x.lineTo(L,0);x.stroke();
   if(kind==='bat'){x.strokeStyle='#9c6c34';x.lineWidth=W0.w*kk*.55;x.beginPath();x.moveTo(-L*.08,0);x.lineTo(L*.5,0);x.stroke();x.strokeStyle='#d8a45c';x.lineWidth=W0.w*kk*.95;x.beginPath();x.moveTo(L*.45,0);x.lineTo(L,0);x.stroke();}
   else{x.strokeStyle=W0.col;x.lineWidth=W0.w*kk*.9;x.beginPath();x.moveTo(-L*.08,0);x.lineTo(L,0);x.stroke();if(kind==='stick'){x.strokeStyle='#5c5c5c';x.lineWidth=2;x.beginPath();x.moveTo(L*.18,-4*kk);x.lineTo(L*.18,0);x.stroke();}}}
  x.restore();}
 function drawItem(i){const sx=SX(i.x),sy=SYw(BACK+i.d)-i.z*k,im=DS.picture(i.kind),w=(FOOD[i.kind]?18:i.kind==='knife'?16:i.kind==='rock'?18:30)*k;
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(sx,SYw(BACK+i.d),w*.5,4*k,0,0,7);x.fill();
  if(im)x.drawImage(im,sx-w/2,sy-w*im.height/im.width,w,w*im.height/im.width);
  else if(FOOD[i.kind]){x.font=`${16*k}px sans-serif`;x.textAlign='center';x.textBaseline='alphabetic';x.fillText(i.kind==='chicken'?'🍗':i.kind==='burger'?'🍔':'🍕',sx,sy-2*k);}
  else if(i.kind==='rock'){x.fillStyle='#8c8c8c';x.strokeStyle='#000';x.beginPath();x.ellipse(sx,sy-6*k,9*k,7*k,0,0,7);x.fill();x.stroke();}
  else drawWeapon(i.kind,{hand:{x:sx-w*.45,y:sy-3*k},wa:90,wl:.8},1,k,{});
  x.fillStyle=`rgba(255,255,220,${.35+.3*Math.sin(t*6)})`;x.beginPath();x.arc(sx+w*.3,sy-8*k,2*k,0,7);x.fill();}
 function drawProp(p){const sx=SX(p.x),sy=SYw(BACK+p.d),im=DS.picture(p.kind),w=(p.kind==='barrel'?24:30)*k,h=(p.kind==='barrel'?30:26)*k;
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(sx,sy,w*.6,4*k,0,0,7);x.fill();
  if(im)x.drawImage(im,sx-w/2,sy-h,w,h);else{x.fillStyle=p.kind==='barrel'?'#7c4c1c':'#a8783c';x.strokeStyle='#2c1c0c';x.lineWidth=2;x.beginPath();x.roundRect(sx-w/2,sy-h,w,h,p.kind==='barrel'?6:2);x.fill();x.stroke();
   x.strokeStyle='rgba(0,0,0,.4)';x.beginPath();if(p.kind==='barrel'){x.moveTo(sx-w/2,sy-h*.33);x.lineTo(sx+w/2,sy-h*.33);x.moveTo(sx-w/2,sy-h*.66);x.lineTo(sx+w/2,sy-h*.66);}else{x.moveTo(sx-w/2,sy-h);x.lineTo(sx+w/2,sy);x.moveTo(sx+w/2,sy-h);x.lineTo(sx-w/2,sy);}x.stroke();}}
 function drawShot(q){const sx=SX(q.x),sy=SYw(BACK+q.d),y=sy-q.z*k;x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(sx,sy,8*k,3*k,0,0,7);x.fill();
  if(q.lob){// where it will land, then the bottle tumbling there
   const TX=SX(q.tx),TY=SYw(BACK+q.td);x.strokeStyle=`rgba(255,60,40,${.5+.4*Math.sin(t*20)})`;x.lineWidth=2;x.beginPath();x.ellipse(TX,TY,16*k,6*k,0,0,7);x.stroke();
   x.save();x.translate(sx,y);x.rotate(t*12);x.fillStyle=q.kind==='molotov'?'#3c8c3c':'#5c3c1c';x.fillRect(-2.5*k,-7*k,5*k,12*k);if(q.kind==='molotov'){x.fillStyle='#ff8c2c';x.beginPath();x.arc(0,-8*k,3*k,0,7);x.fill();}x.restore();return;}
  if(q.kind==='bullet'){x.fillStyle='#ffe8a0';x.fillRect(sx-6*k,y-1*k,12*k,2*k);return;}
  if(q.kind==='wpn'){const W0=WPN[q.wkind]||WPN.bat,im=DS.picture(q.wkind),L=W0.len*k;x.save();x.translate(sx,y);x.rotate(q.spin);
   // motion blur: two faint copies behind it
   for(let g=2;g>=0;g--){x.save();x.globalAlpha=g?.18/g:1;x.rotate(-g*.35*Math.sign(q.vx));
    if(im){const h2=L*im.height/im.width;x.drawImage(im,-L/2,-h2/2,L,h2);}else{x.lineCap='round';x.strokeStyle='#000';x.lineWidth=W0.w*k+2;x.beginPath();x.moveTo(-L/2,0);x.lineTo(L/2,0);x.stroke();x.strokeStyle=W0.col;x.lineWidth=W0.w*k;x.stroke();}
    x.restore();}x.restore();return;}
  if(q.kind==='knife'){x.save();x.translate(sx,y);x.scale(Math.sign(q.vx),1);x.fillStyle='#dcdcdc';x.beginPath();x.moveTo(10*k,0);x.lineTo(-4*k,-2*k);x.lineTo(-4*k,2*k);x.fill();x.fillStyle='#3c2c1c';x.fillRect(-9*k,-1.5*k,5*k,3*k);x.restore();}
  else{const w=(q.kind==='barrel'?22:18)*k;x.save();x.translate(sx,y-w/2);x.rotate(t*10*Math.sign(q.vx));x.fillStyle=q.kind==='barrel'?'#7c4c1c':q.kind==='rock'?'#8c8c8c':'#a8783c';x.fillRect(-w/2,-w/2,w,w);x.restore();}}
 function drawFx(q){const sx=SX(q.x),sy=SYw(BACK+(q.d||0))-(q.z||0)*k;
  if(q.kind==='furyhit')return;
  if(q.kind==='say'){const f=q.f;if(!f||f.gone)return;const X=SX(f.x),Y=SYw(BACK+f.d)-118*k*FIG*f.big;x.font=`800 ${Math.max(11,10*k)}px "SC Nunito",sans-serif`;const w=x.measureText(q.txt).width+16,bx=clamp(X-w/2,6,s.W-w-6);
   x.fillStyle='rgba(255,255,255,.95)';x.strokeStyle='#000';x.lineWidth=2;x.beginPath();x.roundRect(bx,Y-26,w,22,8);x.fill();x.stroke();x.fillStyle='#1c1c1c';x.textAlign='center';x.textBaseline='middle';x.fillText(q.txt,bx+w/2,Y-15);return;}
  if(q.kind==='hit'){const im=DS.picture('fx-hit'),p=1-q.t/.22,sz=(q.big?52:38)*k;if(im){const fr=Math.min(5,Math.floor(p*6));x.drawImage(im,fr*128,0,128,128,sx-sz/2,sy-sz/2,sz,sz);return;}
   x.save();x.translate(sx,sy);x.fillStyle=`rgba(255,240,140,${1-p})`;x.beginPath();for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=(i%2?6:(q.big?20:15))*k*(.6+p);x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.fill();x.fillStyle=`rgba(255,255,255,${1-p})`;x.beginPath();x.arc(0,0,5*k*(1-p),0,7);x.fill();x.restore();}
  else if(q.kind==='block'){x.strokeStyle=`rgba(200,230,255,${Math.min(1,q.t*4)})`;x.lineWidth=2;x.beginPath();x.arc(sx,sy,(1-q.t*4)*14*k+6*k,0,7);x.stroke();}
  else if(q.kind==='flash'){x.fillStyle=`rgba(255,240,160,${Math.min(1,q.t*10)})`;x.beginPath();x.arc(sx,sy,8*k,0,7);x.fill();}
  else if(q.kind==='ring'){x.strokeStyle=`rgba(255,220,100,${Math.min(1,q.t*2.5)})`;x.lineWidth=4;x.beginPath();x.ellipse(sx,sy+30*k,Math.max(1,(1-q.t*2.5)*90*k+10),Math.max(1,(1-q.t*2.5)*30*k+4),0,0,7);x.stroke();}
  else if(q.kind==='glass'){x.fillStyle='#cce8f0';for(let i=0;i<7;i++)x.fillRect(sx+Math.cos(i*1.9)*(.4-q.t)*60*k,sy-Math.abs(Math.sin(i*1.3))*(.4-q.t)*40*k,2*k,2*k);}
  else if(q.kind==='dust'){x.fillStyle=`rgba(220,210,190,${q.t})`;for(let i=-1;i<=1;i+=2){x.beginPath();x.arc(sx+i*(12+(.35-q.t)*60)*k,sy-3*k,5*k,0,7);x.fill();}}
  else if(q.kind==='debris'){x.fillStyle='#8c6a3c';for(let i=0;i<6;i++)x.fillRect(sx+Math.cos(i)*(.5-q.t)*90*k,sy-(.5-q.t)*80*k*Math.abs(Math.sin(i*2))+(.5-q.t)**2*300*k,4*k,4*k);}
  else if(q.kind==='txt'){x.font=`900 ${Math.max(12,13*k)}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=3;x.strokeStyle='#000';x.strokeText(q.txt,sx,sy-(1-q.t)*20*k);x.fillStyle='#ffe85c';x.fillText(q.txt,sx,sy-(1-q.t)*20*k);}
  else if(q.kind==='sp'){const W=s.W,H=s.H,a=Math.min(1,q.t*3);x.save();x.globalAlpha=a;x.fillStyle=q.big?'rgba(255,200,60,.25)':'rgba(255,255,255,.1)';x.fillRect(0,0,W,H);
   x.font=`900 ${Math.min(W/9,58)}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=6;x.strokeStyle='#000';x.strokeText(q.name,W/2,SYw(BACK*.45));x.fillStyle='#ffd23c';x.fillText(q.name,W/2,SYw(BACK*.45));x.restore();}}
 const big=(str,X,Y,size,fill='#fff')=>{x.font=`900 ${size}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=size*.16;x.strokeStyle='#000';x.strokeText(str,X,Y);x.fillStyle=fill;x.fillText(str,X,Y);};
 const small=(str,X,Y,size,fill='#fff',al='center')=>{x.font=`800 ${size}px "SC Nunito",sans-serif`;x.textAlign=al;x.textBaseline='middle';x.lineWidth=size*.25;x.strokeStyle='#000a';x.strokeText(str,X,Y);x.fillStyle=fill;x.fillText(str,X,Y);};
 const fitBig=(str,X,Y,size,maxW,fill)=>{x.font=`900 ${size}px "SC Bangers",Impact,sans-serif`;const w=x.measureText(str).width;big(str,X,Y,w>maxW?size*maxW/w:size,fill);};
 const fitSmall=(str,X,Y,size,maxW,fill,al)=>{x.font=`800 ${size}px "SC Nunito",sans-serif`;const w=x.measureText(str).width;small(str,X,Y,w>maxW?size*maxW/w:size,fill,al);};
 function bar(X,Y,w,h,v,col,back='#2c0c0c'){x.fillStyle='#000';x.fillRect(X-2,Y-2,w+4,h+4);x.fillStyle=back;x.fillRect(X,Y,w,h);x.fillStyle=col;x.fillRect(X,Y,w*clamp(v,0,1),h);x.fillStyle='rgba(255,255,255,.25)';x.fillRect(X,Y,w*clamp(v,0,1),h*.35);}
 function drawHUD(){const W=s.W,H=s.H,fs=clamp(Math.min(W,H)*.032,11,16),top=portrait?(fb.top||40)+4:8,X0=10;if(!run||!hero)return;
  // you: face, name, health, meter, lives, level hearts, score
  s.sprite(x,cur,X0+fs*1.5,top+fs*1.5,fs*2.6,{exact:true,still:true,mood:hero.hp<hero.maxHp*.3?'sad':'normal',noBadge:true});
  small(names[cur].toUpperCase().slice(0,12),X0+fs*3.2,top+fs*.5,fs,'#fff','left');
  bar(X0+fs*3.2,top+fs*1.15,fs*9,fs*.7,hero.hp/hero.maxHp,hero.hp<hero.maxHp*.3&&Math.floor(t*4)%2?'#ff5c3c':'#f8d84c');
  for(let i=0;i<3;i++)bar(X0+fs*3.2+i*fs*3.05,top+fs*2.15,fs*2.85,fs*.35,clamp(run.meter/100-i,0,1),run.meter>=300?`hsl(${(t*200)%360},90%,60%)`:'#ffb83c','#1c1408');
  small(`×${run.lives}`,X0+fs*12.8,top+fs*1.5,fs,'#fff','left');
  const need=run.lv<7?LV_XP[run.lv]-LV_XP[run.lv-1]:1,have=run.lv<7?run.xp-LV_XP[run.lv-1]:1;
  small(`LV ${run.lv}`,X0+fs*3.2,top+fs*3.1,fs*.8,'#ffb8c8','left');for(let i=0;i<7;i++){const on=i<run.lv,part=i===run.lv?have/need:0;x.fillStyle=on?'#ff3c5c':'#3c1c24';x.font=`${fs*.9}px sans-serif`;x.textAlign='left';x.fillText('♥',X0+fs*5.2+i*fs*.9,top+fs*3.15);
   if(part>0){x.save();x.beginPath();x.rect(X0+fs*5.2+i*fs*.9,top+fs*2.6,fs*.9*part,fs*1.2);x.clip();x.fillStyle='#ff8ca0';x.fillText('♥',X0+fs*5.2+i*fs*.9,top+fs*3.15);x.restore();}}
  small(String(run.score).padStart(7,'0'),X0+fs*3.2,top+fs*4.15,fs*.9,'#fff','left');
  // where you are in the story
  if(!portrait||W>500)small(`${CH[chapterNo].title} · ${chapterNo+1}/${CH.length}`,W/2,top+fs*.5,fs*.78,'#ccc');
  // the last enemy you hit (or the boss): name + health
  const tg=bossF&&!bossF.gone?bossF:target&&!target.gone&&target.st!=='dead'?target:null;
  if(tg){const tw=Math.min(W*.42,fs*14),tx=portrait?W-tw-10:W-tw-10-fs*8,ty=portrait?top+fs*5:top+fs*1.2;
   if(tg.face){const sp=faceSprite(tg.face,'normal',fs*1.8,1);if(sp)x.drawImage(sp.cv,tx+sp.x+fs,ty+sp.y+fs*1.2);else BD.drawGangHead(x,tx+fs,ty+fs*1.1,fs*1.4,tg.head,{face:1,id:tg.id});}else BD.drawGangHead(x,tx+fs,ty+fs*1.1,fs*1.4,tg.head,{face:1,id:tg.id});
   small((tg.T?.name||'').toUpperCase().slice(0,20),tx+fs*2.2,ty+fs*.55,fs*.85,tg.boss?'#ff8c6c':'#fff','left');bar(tx+fs*2.2,ty+fs*1.2,tw-fs*2.4,fs*.6,tg.hp/tg.maxHp,tg.boss?'#ff5c3c':'#e8e8e8');
   if(tg.shield>0)fitSmall('SHIELD: hit from behind, grab or jump-kick',tx+fs*2.2,ty+fs*2.3,fs*.68,tw-fs*2.4,'#9cf','left');}
  if(A?.flash>0){A.flash-=1/60;x.fillStyle=`rgba(255,255,240,${Math.min(1,A.flash*2.2)})`;x.fillRect(0,0,W,H);}
  if(A?.chase&&!A.foxT)small('RUN! THE COPS ARE BEHIND YOU',W/2,top+fs*3.4,fs*1.1,'#ff5c5c');
  if(A?.escape){const tsec=Math.max(0,Math.ceil(escapeT));small(A.trainLeave?'NEXT TRAIN':`TRAIN LEAVES IN 0:${String(tsec).padStart(2,'0')}`,W/2,top+fs*2,fs*1.1,tsec<=10||A.trainLeave?'#ff5c5c':'#ffd23c');}
  if(online&&partner){small(`${names[1-cur]}: chapter ${Math.floor(partner.ms/10)+1} · ${partner.sc}`,W/2,top+fs*3.4,fs*.8,'#9cf');}
  // off-screen enemies: arrows at the edges
  for(const f of living('foe')){const X=SX(f.x);if(X>-4&&X<W+4)continue;const Y=SYw(BACK+f.d)-40*k;x.fillStyle='rgba(255,80,60,.8)';x.beginPath();if(X<0){x.moveTo(6,Y);x.lineTo(18,Y-8);x.lineTo(18,Y+8);}else{x.moveTo(W-6,Y);x.lineTo(W-18,Y-8);x.lineTo(W-18,Y+8);}x.fill();}
  // area card, boss card, GO, combo, level-up
  if(banner){const a=Math.min(1,banner.t*2);x.save();x.globalAlpha=a;const cy=SYw(BACK*.42);x.fillStyle='rgba(0,0,0,.62)';x.fillRect(0,cy-fs*3,W,fs*6.4);
   if(banner.boss&&bossF){let drawn=false;if(bossF.face){const sp=faceSprite(bossF.face,'angry',fs*4,1);if(sp){x.drawImage(sp.cv,fs*3.2+sp.x,cy+sp.y);drawn=true;}}if(!drawn)BD.drawGangHead(x,fs*3.2,cy,fs*3.2,bossF.head,{face:1,mood:'angry',id:bossF.id});}
   fitBig(banner.big,W/2,cy-fs*.6,Math.min(fs*3.2,W/9),W*.72,banner.boss?'#ff5c3c':'#ffd23c');if(banner.small)fitSmall(banner.small,W/2,cy+fs*1.9,fs*1.02,W*.9,'#fff');x.restore();}
  if(goT>0&&Math.floor(t*3)%2)big('GO ➜',W-fs*4,SYw(BACK*.75),fs*2.6,'#ffd23c');
  if(combo.n>=3){const c2=combo.n;big(`${c2} HITS!`,W-fs*5,SYw(BACK*.35),fs*(1.6+Math.min(1,c2/15)),c2>=10?'#ff5c3c':'#fff');if(c2>=5)small(c2>=20?'UNSTOPPABLE':c2>=12?'BRUTAL':c2>=8?'SAVAGE':'NICE',W-fs*5,SYw(BACK*.35)+fs*1.8,fs*.9,'#ffd23c');}
  if(lvBanner){const a=Math.min(1,lvBanner.t*2,(3.4-lvBanner.t)*4);x.save();x.globalAlpha=Math.max(0,a);const cy=SYw(FRONT)-fs*2.4;x.fillStyle='rgba(40,0,10,.82)';x.beginPath();x.roundRect(W/2-Math.min(W*.46,fs*16),cy-fs*1.9,Math.min(W*.92,fs*32),fs*3.8,10);x.fill();
   small(lvBanner.sp?'SPECIAL UNLOCKED':`LEVEL ${lvBanner.lv}!  NEW MOVE`,W/2,cy-fs*.95,fs*.85,'#ff8ca0');fitBig(lvBanner.name||'',W/2,cy+fs*.2,fs*1.5,W*.85,'#ffd23c');fitSmall(lvBanner.how||'',W/2,cy+fs*1.35,fs*.82,W*.88,'#fff');x.restore();}
  if(phase==='clear'){x.fillStyle=`rgba(0,0,0,${Math.min(.62,phaseT)})`;x.fillRect(0,0,W,H);fitBig(run.clearMsg||'CLEAR!',W/2,H*.3,Math.min(W/8,fs*4),W*.9,'#ffd23c');
   const rows=[[`Area bonus`,1500],[`Best combo ${combo.best}`,combo.best*100],[run.hurt?'Took damage':'No damage!',run.hurt?0:3000]];rows.forEach((r,i)=>{if(phaseT>.5+i*.35){small(r[0],W/2-fs*6,H*.42+i*fs*1.8,fs*1.1,'#fff','left');small('+'+r[1],W/2+fs*6,H*.42+i*fs*1.8,fs*1.1,'#ffd23c','right');}});
   if(run.outro&&phaseT>1.6)fitSmall(run.outro,W/2,H*.42+fs*6.2,fs*1.05,W*.9,'#9cf');}
  if(phase==='over'){x.fillStyle=`rgba(0,0,0,${Math.min(.7,phaseT)})`;x.fillRect(0,0,W,H);big('GAME OVER',W/2,H*.4,Math.min(W/7,fs*4.5),'#ff3c3c');fitSmall(`${names[cur]} · ${run.score} points · ${CH[chapterNo].title}`,W/2,H*.52,fs*1.05,W*.9,'#fff');}
  ui.draw();}
 function drawControls(){if(!fighting())return;
  const sk=inp.stick,R=U*1.25,cx=sk?sk.ox:stickHome.x,cy=sk?sk.oy:stickHome.y;x.save();x.globalAlpha=sk?.55:.28;x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(cx,cy,R,0,7);x.stroke();
  const kx=sk?cx+clamp(sk.x-cx,-R,R):cx,ky=sk?cy+clamp(sk.y-cy,-R,R):cy;x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.arc(kx,ky,R*.45,0,7);x.fill();x.restore();
  // context labels: what PUNCH / KICK / SPECIAL will do right now
  const h=hero,onItem=h&&!h.weapon&&items.some(i=>!FOOD[i.kind]&&Math.abs(i.x-h.x)<24&&Math.abs(i.d-h.d)<14&&i.z===0),nsp=h&&run?nextSpecial(h,inp.sx):null;
  const lab={punch:h?.carry?'THROW':onItem?'PICK UP':h?.weapon?'SWING':h?.st==='grabbing'?'KNEE':'PUNCH',kick:h?.carry||h?.weapon?'THROW':'KICK',jump:'JUMP',special:'SPECIAL'};
  for(const [n,b] of Object.entries(BTN)){const on=inp.held[n],bars=Math.floor(run.meter/100),dis=n==='special'&&(bars<1||spCD>0||h?.mv?.def.special);x.save();x.globalAlpha=dis?.32:on?.95:.62;
   x.fillStyle=on?'#fff':n==='special'&&bars>=3?`hsl(${(t*200)%360},80%,55%)`:b.col;x.strokeStyle='rgba(0,0,0,.6)';x.lineWidth=3;x.beginPath();x.arc(b.x,b.y,b.r*(on?.94:1),0,7);x.fill();x.stroke();
   x.fillStyle=on?b.col:'#fff';x.font=`900 ${b.r*.32}px "SC Nunito",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(lab[n],b.x,b.y);
   if(n==='special'){x.globalAlpha=1;for(let i=0;i<3;i++){const a0=-Math.PI/2+i*2*Math.PI/3+.08,a1=a0+2*Math.PI/3-.16,f2=clamp(run.meter/100-i,0,1);x.lineWidth=5;x.strokeStyle='rgba(0,0,0,.6)';x.beginPath();x.arc(b.x,b.y,b.r+6,a0,a1);x.stroke();
     x.strokeStyle=bars>=3?`hsl(${(t*200)%360},90%,60%)`:'#ffd23c';x.beginPath();x.arc(b.x,b.y,b.r+6,a0,a0+(a1-a0)*f2);x.stroke();}
    if(nsp&&!dis){const nm={rise:'RISING FIST',twister:'TWISTER',fury:'FURY!',burst:'BREAKAWAY'}[nsp];small(nm,b.x,b.y-b.r-15,Math.max(9,b.r*.3),'#ffd23c');}}
   x.restore();}}
 // ---- people for the cutscenes: a body from body.js and the same face rules as a fighter (players' faces, named
 // characters' pictures, the gangs' drawn heads); g = the canvas to draw on (the crowd is painted into its own)
 // a story-scene person: drawn from their sheet when it's in (the Warriors crew wear the hero sheets, each gang its own), else the drawn body
 function personSheet(p){if(p.sheet)return p.sheet;if(p.o==='warrior'){let h=0;for(const ch of String(p.id||''))h=(h*31+ch.charCodeAt(0))|0;return Math.abs(h)%2?'hero-p2':'hero-p1';}return PERSON_SHEET[p.o];}
 function drawPerson(sx,sy,kk,p,g=x){const face=p.face||1,big=p.big||1,pose=BD.P[p.pose]||BD.P.stand;
  const SC=sheetCell(personSheet(p),p.pose||'stand');let spots;
  if(SC){const sc=kk*big/DS.UNIT,ft=DS.footOf(SC.name);g.save();g.globalAlpha*=.3;g.fillStyle='#000';g.beginPath();g.ellipse(sx,sy,22*kk*big,6*kk,0,0,7);g.fill();g.restore();
   g.save();g.translate(sx,sy);g.scale(face*sc,sc);g.drawImage(SC.img,SC.cell.sx,SC.cell.sy,DS.CELL,DS.CELL,-ft[0],-ft[1],DS.CELL,DS.CELL);g.restore();
   const J=BD.joints(pose),tp=q=>({x:sx+q[0]*face*kk*big,y:sy+q[1]*kk*big});spots={head:tp(J.head),neck:tp(J.neck),hand:tp(J.B[2]),hand2:tp(J.A[2]),sheet:1};
   const cn=cellNeck(SC.sheet,SC.name,sx,sy,face,sc,0);if(cn){spots.neck=cn.neck;spots.head=cn.head;}}
  else spots=BD.drawBody(g,pose,{x:sx,y:sy,face,k:kk,o:BD.OUTFIT[p.o]||BD.OUTFIT.thug,big});
  const fw=FACE_W*kk*big,nk=spots.neck||spots.head,ux=spots.head.x-nk.x,uy=spots.head.y-nk.y,ul=Math.hypot(ux,uy)||1;
  const isP=p.pi!=null&&p.pi<s.players.length,fid=isP?s.players[p.pi]?.character:p.char;let fm=p.mood||'normal';if(fid&&fm!=='normal'&&!headFacts(fid,fm))fm='normal';
  const sp=!isP&&fid?faceSprite(fid,fm,fw,face):null,fh=(isP||sp)&&fid?faceHeight(fid,fm,fw):fw*1.25,cx=nk.x+ux/ul*fh*FACE_UP,cy=nk.y+uy/ul*fh*FACE_UP;
  const tilt=Math.atan2(ux,-uy);
  if(isP){g.save();g.translate(cx,cy);g.rotate(tilt);drawFace(s,g,p.pi,0,0,fw/.6,fm==='angry'?'happy':fm,face,.6);g.restore();}
  else if(sp){g.save();g.translate(cx,cy);g.rotate(tilt);g.drawImage(sp.cv,sp.x,sp.y);g.restore();}
  else BD.drawGangHead(g,cx,cy-fw*.08,fw*1.02,p.head||'thug',{face,tilt,mood:fm,id:p.id||'x',skin:p.skin});
  return spots;}
 function drawPortrait(C,cx,cy,size){const isP=C.pi!=null&&C.pi<s.players.length;
  if(isP){drawFace(s,x,C.pi,cx,cy,size/.6,'normal',1,.6);return;}
  const sp=C.char?faceSprite(C.char,'normal',size,1):null;if(sp){x.drawImage(sp.cv,cx+sp.x,cy+sp.y);return;}
  BD.drawGangHead(x,cx,cy,size*1.1,C.head||'thug',{face:1,id:C.id||'x',skin:C.skin});}
 const cuts=CUT.makeCuts({x,s,W:()=>s.W,H:()=>s.H,person:drawPerson,portrait:drawPortrait,sfx,noise,snd,DS,BD,names,solo:s.players.length<2||solo,get auto(){return bot.on;}});
 const seenCut=new Set();
 // a story scene before a chapter (not online or on the board: those jump straight into a fight); each one once per game
 function playCut(key){if(online||board||seenCut.has(key))return Promise.resolve();seenCut.add(key);musicOn=false;
  return DS.ready([...CUT.CUT_PICTURES.map(n=>'cut-'+n),...Object.keys(DS.SHEETS),...CUT.stagePictures(DS),...CUT.djPictures()],3000).then(()=>new Promise(r=>{phase='cut';cuts.start(key,r);}));}
 // ---- title + menus: START / CONTINUE / CHAPTERS / MOVES
 const ui={btns:[],moves:false,
  tap(p){for(const b of ui.btns)if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.act();return true;}if(ui.moves){ui.moves=false;return true;}
   if(phase==='cut'){cuts.tap(p.x,p.y);return true;}
   if(phase==='story'&&story&&story.t>.8){story.done?.();return true;}return false;},
  key(ev){if(phase==='cut'&&(ev.key==='Enter'||ev.key===' '||ev.key==='Escape')){ev.preventDefault();ev.key==='Escape'?cuts.skip():cuts.tap(s.W,s.H);return true;}if(phase==='title'&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();ui.btns[0]?.act();return true;}if(phase==='story'&&story&&(ev.key==='Enter'||ev.key===' ')&&story.t>.8){ev.preventDefault();story.done?.();return true;}return false;},
  draw(){if(ui.moves)drawMoves();}};
 let titleDone=null;
 function titleBg(){const W=s.W,H=s.H,bg=DS.picture('title-bg');
  if(bg){const sc=Math.max(W/bg.width,H/bg.height);x.drawImage(bg,(W-bg.width*sc)/2,(H-bg.height*sc)/2,bg.width*sc,bg.height*sc);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,0,W,H);return;}
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1c0c24');g.addColorStop(1,'#3c0c0c');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let i=0;i<16;i++){const bx=(i*97)%W,bh=H*(.2+((i*37)%30)/100);x.fillStyle='#0c0610';x.fillRect(bx,H*.62-bh,60,bh);}x.fillStyle='#14080c';x.fillRect(0,H*.62,W,H);
  const kk=H/400,a=BD.drawBody(x,BD.P.stand,{x:W/2-40,y:H*.66,face:1,k:kk,o:BD.OUTFIT.p1}),b2=BD.drawBody(x,BD.P.stand,{x:W/2+40,y:H*.66,face:-1,k:kk,o:BD.OUTFIT.p2});
  s.sprite(x,0,a.head.x,a.head.y,kk*28,{exact:true,still:true,noBadge:true});if(s.players[1])s.sprite(x,1,b2.head.x,b2.head.y,kk*28,{exact:true,still:true,noBadge:true});}
 function drawTitle(){const W=s.W,H=s.H,fs=clamp(Math.min(W,H)*.04,12,20),logo=DS.picture('logo');titleBg();
  const bw=Math.min(W*.7,320),bh=fs*2.4,x0=(W-bw)/2;ui.btns=[];
  // the main menu sits low; on short screens it moves up so MOVES stays on screen, and the logo fits in the space above it
  const nBtn=(save.reached||0)>0?4:2,menuH=nBtn*(bh+fs*.55)+(save.best?fs*1.2:0),menuY=Math.max(H*.3,Math.min(H*.58,H-menuH-6));
  if(logo){const room=(phase==='select'?H*.3:menuY)-H*.03-fs*.4,w=Math.min(W*.9,640,room*logo.width/logo.height),h=w*logo.height/logo.width;x.drawImage(logo,(W-w)/2,H*.03,w,h);}
  else{big('THE WARRIORS',W/2,H*.15,Math.min(W/7,fs*4.4),'#ff3c3c');small('COME OUT TO PLAY',W/2,H*.26,fs*1.2,'#ffd23c');}
  if(phase==='select'){drawSelectMap();return;}
  let y0=menuY;
  const add=(label,act,main)=>{ui.btns.push({x:x0,y:y0,w:bw,h:bh,act});x.fillStyle=main?'#e8b83c':'rgba(20,10,14,.85)';x.strokeStyle='#000';x.lineWidth=3;x.beginPath();x.roundRect(x0,y0,bw,bh,12);x.fill();x.stroke();fitSmall(label,W/2,y0+bh/2,fs*1.02,bw-14,main?'#1c0c0c':'#fff');y0+=bh+fs*.55;};
  add('START · THE CONCLAVE',()=>titleDone?.(0),true);
  if((save.reached||0)>0)add(`CONTINUE · ${CH[save.reached].title}`,()=>titleDone?.(save.reached));
  if((save.reached||0)>0)add('CHAPTERS',()=>{phase='select';});
  add('MOVES',()=>{ui.moves=true;});
  if(save.best)small(`BEST ${save.best}`,W/2,y0+fs*.3,fs*.85,'#ccc');
  ui.draw();}
 // the chapter select = the subway map (owner, Nov 24): tap a stop you've reached
 function drawSelectMap(){const W=s.W,H=s.H,fs=clamp(Math.min(W,H)*.04,12,20),reached=Math.min(CH.length-1,save.reached|0);mapT+=1/60;ui.btns=[];
  const m=MAP.drawMap(x,W,H,{chapters:CH,reached,at:reached,t:mapT,done:new Set(save.cleared||[])}),P=m.L.panel;
  for(const sp of m.spots)if(sp.reached)ui.btns.push({x:sp.x-sp.r,y:sp.y-sp.r,w:sp.r*2,h:sp.r*2,act:()=>titleDone?.(sp.i)});
  panelBox(P);const cx=P.x+P.w/2;fitBig('CHOOSE YOUR STOP',cx,P.y+P.h*.14,Math.min(fs*2.2,P.w/9,P.h*.14),P.w*.9,'#ffd23c');
  fitSmall('Tap a stop on the map you have reached',cx,P.y+P.h*.3,fs*.95,P.w*.9,'#fff');
  const bw=Math.min(P.w*.8,260),bh=Math.min(fs*2.3,P.h*.2),by=P.y+P.h-bh-fs*.6;
  [['CONTINUE · '+CH[reached].title,()=>titleDone?.(reached),true],['BACK',()=>{phase='title';}]].forEach(([l,act,main],i)=>{const yy=by-(1-i)*(bh+fs*.5);ui.btns.push({x:cx-bw/2,y:yy,w:bw,h:bh,act});x.fillStyle=main?'#e8b83c':'#3c3c44';x.beginPath();x.roundRect(cx-bw/2,yy,bw,bh,10);x.fill();fitSmall(l,cx,yy+bh/2,fs*.95,bw-12,main?'#1c0c0c':'#fff');});
  ui.draw();}
 // a dark card behind the map's text
 function panelBox(P){x.fillStyle='rgba(10,6,8,.82)';x.strokeStyle='#e8b83c';x.lineWidth=2;x.beginPath();x.roundRect(P.x,P.y,P.w,P.h,12);x.fill();x.stroke();}
 // two short lines of text in a width (the story lines on the map card)
 function wrapText(txt,cx,cy,f,w,col){x.font=`800 ${f}px "SC Nunito",sans-serif`;const words=txt.split(' ');let a='',lines=[];for(const wd of words){const t2=a?a+' '+wd:wd;if(x.measureText(t2).width>w&&a){lines.push(a);a=wd;}else a=t2;}lines.push(a);
  lines.forEach((l,i)=>fitSmall(l,cx,cy+(i-(lines.length-1)/2)*f*1.25,f,w,col));}
 // between chapters: the map shows the ride to the next stop, the chapter's story beside it (owner, Nov 24)
 function drawStory(){const W=s.W,H=s.H,fs=clamp(Math.min(W,H)*.04,12,20),C=CH[story.n];story.t+=1/60;
  const n=story.end?CH.length-1:story.n,m=MAP.drawMap(x,W,H,{chapters:CH,reached:Math.max(save.reached|0,n),at:n,from:story.end?null:story.from,t:story.t,done:new Set(save.cleared||[])}),P=m.L.panel,cx=P.x+P.w/2;
  const a=Math.min(1,story.t*2);x.save();x.globalAlpha=a;panelBox(P);const S=(txt,yk,f,col)=>fitSmall(txt,cx,P.y+P.h*yk,f,P.w*.9,col);
  if(story.end){fitBig('THE END',cx,P.y+P.h*.2,Math.min(fs*3.4,P.w/6),P.w*.9,'#ffd23c');S('The Warriors made it home to Coney Island.',.38,fs*1.02,'#fff');
   if(story.t>1)S('Can you dig it?',.5,fs*1.15,'#ff8ca0');if(story.t>1.6)S(`${names[cur]} · ${run?.score||0} points`,.62,fs,'#ccc');}
  else{S(`CHAPTER ${story.n+1}`,.12,fs*1.02,'#ff8ca0');fitBig(C.title,cx,P.y+P.h*.27,Math.min(fs*2.8,P.w/9,P.h*.15),P.w*.92,'#ffd23c');S(C.place,.4,fs*.92,'#ccc');
   C.story.forEach((ln,i)=>{if(story.t>.5+i*.6)wrapText(ln,cx,P.y+P.h*(.52+i*.17),fs*.95,P.w*.88,'#fff');});}
  if(story.t>1.4&&Math.floor(story.t*2)%2)S(story.end?'TAP TO FINISH':'TAP TO FIGHT',.9,fs*.95,'#ffd23c');x.restore();
  if(story.t>(story.end?7:6.5)||(bot.on&&story.t>.9))story.done?.();}
 function drawMoves(){const W=s.W,H=s.H,fs=clamp(Math.min(W,H)*.03,10,15);x.fillStyle='rgba(6,4,8,.95)';x.fillRect(0,0,W,H);big('MOVES',W/2,fs*2.6,fs*2.2,'#ffd23c');
  const lv=run?.lv||1,rows=[['PUNCH x3','Jab, cross, hook: each hit chains into the next',1],['KICK x2','Kick, roundhouse',1],['PUNCH PUNCH KICK','Cross into a leg sweep',2],['RUN · DASH PUNCH','Push the stick all the way · + PUNCH',1],['BACK KICK','Stick AWAY + KICK',1],
   ['WEAPONS','Stand on one + PUNCH. PUNCH x3: swing, backhand, smash',1],['THROW WEAPON','Holding one + KICK: it spins at them, then pick it back up',1],['BARRELS & ROCKS','Next to one + PUNCH to lift, PUNCH to throw',1],['SHIELDS','Riot cops block from the front: hit their back, grab, jump-kick',1],
   ...Object.entries(UNLOCK).map(([l,u])=>[u[0],u[1],+l]),...SPECIALS.map(q=>[q.name,q.how,q.lv])];
  const rh=Math.min(fs*1.6,(H-fs*7)/rows.length);rows.forEach((r,i)=>{const y=fs*4.6+i*rh,on=!run||lv>=r[2];small(r[0],W*.05,y,fs*.95,on?'#ffd23c':'#666','left');fitSmall(r[1],W*.38,y,fs*.8,W*.5,on?'#fff':'#666','left');small(`LV ${r[2]}`,W*.96,y,fs*.75,'#ff8ca0','right');});
  small('Tap anywhere to close',W/2,H-fs*1.4,fs*.85,'#999');}
 const fighting=()=>phase==='play';

 // ---- the run: chapters until game over (or the turn's chapter count)
 let cur=0;const scores=[0,0];let nf=null;
 if(online){nf=netField(s,{hz:4,pack:()=>({ms:chapterNo*10+(A?.ai||0),sc:run?.score||0,lv:run?.lv||1}),unpack:(i,d)=>{partner=d;}});}
 s.frame(dt=>{dt=Math.min(dt,.05);layout();musicTick(performance.now()/1000);if(!s.alive)return;if(!s.paused){phaseT+=dt;if(phase==='play'||phase==='clear'||phase==='over'||phase==='card')step(phase==='card'?0:dt);
   if(phase==='card'&&phaseT>1.6){phase='play';phaseT=0;}
   if(phase==='clear'&&phaseT>(run.outro?3.6:2.4)&&run.done){run.score+=1500+combo.best*100+(run.hurt?0:3000);run.hp=hero.hp;run.weapon=hero.weapon;const d=run.done;run.done=null;fade=1;d('clear');}
   if(phase==='over'&&phaseT>2.4&&run.done){const d=run.done;run.done=null;d('over');}
   nf?.tick(dt);}
  draw();});
 s.debug={get phase(){return phase;},get run(){return run;},get hero(){return hero;},get area(){return A;},get st(){return A;},get foes(){return living('foe');},get allies(){return living('ally');},MV,CH,
  set bot(v){bot.on=!!v;},get bot(){return online?()=>{bot.on=true;if(phase==='title')titleDone?.(0);}:bot.on;},
  start:(n=0)=>titleDone?.(n),press:b=>{pressBtn(b);setTimeout(()=>{inp.held[b]=false;},60);},stick:(sx,sy)=>{bot.stick={sx,sy};},
  killAll:()=>{for(const f of living('foe')){f.shield=0;f.inv=0;f.entering=null;damage(hero,f,999,'knock',100,{});}},lv:n=>{run.xp=LV_XP[n-1];run.lv=n;},meter:v=>{run.meter=v;},
  boss:()=>{if(!A?.boss)return;wave=A.waves.length-1;waveQ=[];for(const f of living('foe'))f.gone=true;hero.x=A.boss.at+5;cam.x=Math.max(0,A.boss.at-vw*.4);},
  end:()=>{if(!A)return;wave=A.waves.length-1;waveQ=[];for(const f of living('foe'))f.gone=true;hero.x=A.len-(A.escape?200:100);cam.x=Math.max(0,A.len-vw);if(A.boss&&!bossOn)startBoss();},
  give:k2=>{hero.weapon={kind:k2,uses:99};},get challenge(){return challenge;},selectMap:()=>{phase='select';},get freePool(){return freePool;},challenger:(id,dx=70)=>{const f=spawnFoe({type:'orphan',side:1,d:hero.d,challenger:id||freePool[0]});f.x=hero.x+dx;f.entering=null;return f;},spawn:(type,dx=60)=>{const f=spawnFoe({type,side:1,d:hero.d});f.x=hero.x+dx;f.entering=null;return f;},
  get cuts(){return cuts;},cut:k=>{phase="cut";cuts.start(k,()=>{phase="wait";});},  get bus(){return bus;},get riffs(){return riffsIn;},get cam(){return cam;},get k(){return k;},get vw(){return vw;}};

 async function turn(pi,startAt,count){cur=pi;const lv0=clamp(1+Math.ceil(startAt*.75),1,7);run={lives:board?2:3,lv:lv0,xp:LV_XP[lv0-1],meter:0,score:0,hurt:false};let n=startAt,cleared=0,conts=solo?2:0;
  for(;;){run.hurt=false;run.hp=null;run.weapon=null;combo.best=0;const res=await playChapter(n);if(!s.alive||res==='quit')return {score:run.score,cleared};
   if(res==='clear'){cleared++;n++;if(solo){soloProgress(s,run.score,cleared,`${CH[n-1].title} cleared · ${run.score}`);if(n>(save.reached||0))store_({reached:Math.min(n,CH.length-1)});store_({cleared:[...new Set([...(save.cleared||[]),n-1])]});}
    if(n>=CH.length){if(solo)await ending();break;}if(cleared>=count)break;continue;}
   if(conts>0){conts--;const go=await askContinue();if(go){run.lives=3;run.score=Math.floor(run.score/2);continue;}}
   break;}
  return {score:run.score,cleared,won:n>=CH.length};}
 // the end of the night: a last card, then the result
 async function ending(){await playCut('end');if(!s.alive)return;return new Promise(r=>{phase='story';story={n:CH.length-1,t:0,end:1,done:r};musicOn=false;sfx.clear();});}
 function askContinue(){return new Promise(r=>{phase='cont';ui.btns=[];
  const f=()=>{const fs=clamp(Math.min(s.W,s.H)*.04,12,20),bw=Math.min(s.W*.6,280),bh=fs*2.4,x0=(s.W-bw)/2;ui.btns=[{x:x0,y:s.H*.55,w:bw,h:bh,act:()=>done(true)},{x:x0,y:s.H*.55+bh+fs,w:bw,h:bh,act:()=>done(false)}];};f();
  const prev=ui.draw;ui.draw=()=>{f();const fs=clamp(Math.min(s.W,s.H)*.04,12,20);x.fillStyle='rgba(0,0,0,.8)';x.fillRect(0,0,s.W,s.H);big('CONTINUE?',s.W/2,s.H*.38,fs*3,'#ffd23c');fitSmall('From the start of this chapter · score halved',s.W/2,s.H*.46,fs,s.W*.9,'#fff');
   for(const [i,b] of ui.btns.entries()){x.fillStyle=i?'#3c3c44':'#e8b83c';x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,10);x.fill();small(i?'NO':'YES',s.W/2,b.y+b.h/2,fs*1.1,i?'#fff':'#000');}};
  let fin=false;const done=v=>{if(fin)return;fin=true;ui.draw=prev;ui.btns=[];r(v);};
  if(bot.on)setTimeout(()=>done(false),300);});}

 // ---- flow
 const hashS=str=>{let h=7;for(const ch of str)h=(h*31+ch.charCodeAt(0))>>>0;return h;};
 if(!online&&!board){phase='title';const n=await new Promise(r=>{titleDone=r;});ui.btns=[];
  if(solo){await s.pass(0,`${names[0]}: get the Warriors home to Coney Island. Left side = stick (all the way = run). PUNCH, KICK, JUMP, SPECIAL on the right. Chain your hits, grab weapons, fill the meter for specials.`,'Fight!');if(!s.alive)return;
   const r=await turn(0,n,Infinity);if(!s.alive)return;if(r.score>(save.best||0))store_({best:r.score});
   soloFinish(s,r.score,r.cleared,`The Warriors · ${r.cleared} chapter${r.cleared===1?'':'s'} · ${r.score} points`,r.cleared>=1);return;}
  // 2P on one phone: both play the picked chapter, highest score wins
  for(let i=0;i<2;i++){phase='wait';if(!await s.pass(i,`${names[i]}'s turn: ${CH[n].title}${i?`. Beat ${scores[0]} points.`:'. Highest score wins.'} Stick on the left, PUNCH / KICK / JUMP / SPECIAL on the right.`,'Fight!'))return;
   const r=await turn(i,n,1);if(!s.alive)return;scores[i]=r.score;}
  s.finish([...scores],`The Warriors · ${names[0]} ${scores[0]} – ${scores[1]} ${names[1]}`);return;}
 const chap=hashS(seed)%CH.length;
 if(online){phase='wait';await nf.start('go');if(!s.alive)return;cur=nf.me;const r=await turn(nf.me,chap,1);if(!s.alive)return;scores[nf.me]=r.score;nf.finish(r.score);phase='wait';
  const o=await nf.remoteDone();scores[1-nf.me]=o|0;s.finish([...scores],`The Warriors · ${scores[0]} – ${scores[1]}`);return;}
 for(let i=0;i<2;i++){phase='wait';if(!await s.pass(i,`${names[i]}'s turn: ${CH[chap].title}${i?`. Beat ${scores[0]} points.`:'. Highest score wins.'} Stick on the left, PUNCH / KICK / JUMP / SPECIAL on the right.`,'Fight!'))return;
  const r=await turn(i,chap,1);if(!s.alive)return;scores[i]=r.score;}
 s.finish([...scores],`The Warriors · ${names[0]} ${scores[0]} – ${scores[1]} ${names[1]}`);}
Object.assign(exports,{warriorsDD,brawler:warriorsDD,MV,LV_XP,UNLOCK,SPECIALS});
