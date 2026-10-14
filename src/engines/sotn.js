// Castlevania · Symphony of the Night: a dark, gory take on the PS1 game's opening, played in turns like the NES engine
// (castlevania.js): P1 runs the seeded castle, then P2 runs the same castle with P1's violet after-image as a ghost.
// The run: the moonlit approach (Wargs) with Alucard's full power, the castle gate slamming shut, Death stripping that
// power in the Entrance hall (fists, then a Short Sword on the floor), rising zombies, a Bloody Zombie, Axe Armor and
// a pot-roast wall, the Leap Stone relic (double jump), the Underground Caverns (Mermen over the water, a Claymore),
// the Marble Gallery, and the Castle Keep: Dracula ("What is a man?") teleporting with Hellfire and Dark Inferno,
// then his demon form (leaps with shockwaves, fire breath, bats; its head takes full damage). Grab the blood orb:
// fastest time wins, otherwise furthest progress. Hero moves: walk (quick acceleration, short skid), variable jump with
// coyote time and a jump buffer, Leap Stone double jump (a somersault), dive kick (down + jump in mid-air, bounces off
// what it hits), chainable backdash that a swing cancels, crouch, a three-hit combo (quick cut, lunging stab, overhead
// cleave; presses are buffered), up + attack or swipe up for the sub-weapon (hearts), hold attack and release for
// Hellfire (MP). Blue after-images trail the hero and the blade. The simulation is a fixed 60 Hz; drawing interpolates. Monsters split in half and burn; blood stains the floor. Art: sotnArt.js; sound: sotnAudio.js.
const {clamp,seededRandom}=require("src/utils.js");
const {arenaTouch,outlined,PCOL,Countdown,settle}=require("src/engines/arenaKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const A=require("src/engines/sotnArt.js");
const SA=require("src/engines/sotnAudio.js"),{sfx,ambience,music,tick,stopAll}=SA;

const STEP=1/60,VH=240,NONE=1e4,RACE_CAP=240,LEN=3400;
const WALK=1.9,JUMPV=5.7,DJUMPV=5.3,GRAV=.28,MAXFALL=6.6,HP_MAX=100,MP_MAX=50,STEP_UP=9,PH=42;
// ground/air handling: quick acceleration and a short skid (SOTN's Alucard reaches full speed in a few frames), coyote
// time and a jump buffer so jumps never get eaten, a lighter apex and a heavier fall for the floaty-but-snappy arc
const ACC=.42,FRIC=.36,TURN=.7,AIR_ACC=.3,AIR_FRIC=.12,COYOTE=6,JBUF=7,APEX=.62,FALL_G=1.18,CUT_G=2.3;
// spd scales every frame count of the combo: the Alucard Sword is quick, the Claymore heavy
const WEAPONS={alucard:{name:'Alucard Sword',dmg:42,reach:46,spd:1},fist:{name:'Fists',dmg:5,reach:16,spd:.8},
 short:{name:'Short Sword',dmg:10,reach:28,spd:.9},claymore:{name:'Claymore',dmg:20,reach:40,spd:1.3}};
// the three-hit combo: a quick cut, a lunging stab, a big overhead slash. act = live frames, cancel = when the next
// hit (or a jump / backdash / walk) may interrupt, len = full recovery. dmg/reach are multipliers of the weapon's.
const COMBO=[{n:'Slash',act:[2,5],cancel:7,len:13,dmg:.75,reach:.8,lunge:1.4,box:[-11,6],stop:2},
 {n:'Stab',act:[3,7],cancel:9,len:16,dmg:1,reach:1.32,lunge:3.1,box:[-5,5],stop:3},
 {n:'Cleave',act:[4,10],cancel:16,len:23,dmg:1.6,reach:1.08,lunge:1.6,box:[-30,13],stop:6,back:8}];
const COMBO_GAP=16; // frames after a hit ends in which another press continues the combo
const SUBS={dagger:{cost:1,name:'Dagger'},axe:{cost:3,name:'Axe'},holy:{cost:2,name:'Holy Water'},cross:{cost:3,name:'Cross'}};
const FOE={zombie:{hp:12,dmg:8,hw:7,h:37},bloody:{hp:40,dmg:12,hw:8,h:44},warg:{hp:60,dmg:14,hw:20,h:28},skeleton:{hp:18,dmg:8,hw:6,h:34},
 bat:{hp:6,dmg:6,hw:9,h:10},merman:{hp:20,dmg:10,hw:6,h:32},armor:{hp:60,dmg:14,hw:8,h:46}};
const NAMES={short:'Short Sword',claymore:'Claymore',dagger:'Dagger',axe:'Axe',holy:'Holy Water',cross:'Cross',potion:'Potion',roast:'Pot Roast',leap:'Leap Stone'};
const EXP={zombie:10,bloody:40,warg:60,skeleton:18,bat:6,merman:20,armor:60},LEVELS=[60,160,300,480,700,960];
const D1_HP=160,D2_HP=220,HELL_MP=15,CHARGE=34;
const GOTH='"Palatino Linotype","Book Antiqua",Palatino,Georgia,"Times New Roman",serif';

// ------------------------------------------------------------------ the castle (seeded details, fixed layout)
function buildCastle(rand){
 const gy=new Float32Array(LEN).fill(NONE);
 const L={gy,plats:[],blocks:[],water:[],regions:[],decor:[],candles:[],foes:[],items:[],zones:[],checks:[40],start:40,gateX:960,deathX:1010,arena:{x0:3010,x1:3380,floor:160,lockX:3046}};
 const flat=(x0,x1,y)=>{for(let x=x0;x<x1;x++)gy[x]=y;};
 const slope=(x0,x1,y0,y1)=>{for(let x=x0;x<x1;x++)gy[x]=y0+(y1-y0)*(x-x0)/(x1-x0);};
 const jit=n=>Math.round((rand()-.5)*2*n);
 const region=(kind,x0,x1,name)=>L.regions.push({kind,x0,x1,name});
 const deco=(type,x,o={})=>L.decor.push({type,x,...o});
 const candle=(kind,x,y,item)=>{const fy=kind==='lantern'?y-8:kind==='torch'?y-16:y-24;L.candles.push({kind,x,y,fx:x,fy,item});};
 const foe=(type,x,y,o={})=>L.foes.push({type,x,y,...o});
 const subs=['dagger','axe','holy','cross'],pick=a=>a[Math.floor(rand()*a.length)];
 // the approach: forest, Wargs, stone lanterns
 flat(0,200,200);slope(200,320,200,190);flat(320,430,190);slope(430,520,190,200);flat(520,920,200);
 region('forest',0,760,'Dracula\'s Castle');
 for(const x of [70,250,455,640])deco('tree',x+jit(10),{s:.8+rand()*.5});
 deco('fence',20,{w:720});for(const x of [180,520])deco('grave',x+jit(16));
 candle('lantern',140,gy[140]-26,'heart');candle('lantern',380,gy[380]-26,pick(['heart','money']));candle('lantern',610,gy[610]-26,'bigheart');
 foe('bat',300+jit(20),112);foe('warg',480+jit(16),200);foe('warg',650+jit(16),200);foe('warg',730+jit(10),200);
 // drawbridge and the gate
 region('gate',760,940,'Castle Entrance');deco('bridge',760,{w:150});deco('gatewall',860);deco('gate',920);
 // Entrance hall: Death, the stairs, the balcony, the relic altar, the pot-roast wall
 flat(920,1150,200);slope(1150,1214,200,168);flat(1214,1430,168);slope(1430,1494,168,200);flat(1494,1812,200);
 region('hall',940,1812,'Castle Entrance');
 L.items.push({type:'short',x:1088,y:200});L.items.push({type:'leap',x:1322,y:158,altar:true});
 L.plats.push({x0:1250,x1:1402,y:122});foe('skeleton',1340,122,{home:1340,range:44});
 L.blocks.push({x0:1702,x1:1718,y0:150,y1:200,kind:'crack',hp:30,item:'roast'});
 for(const [x,item] of [[1120,'heart'],[1240,pick(subs)],[1384,'bigheart'],[1530,pick(subs)],[1650,'heart'],[1770,'money']])candle('candelabra',x,gy[x],item);
 for(const x of [972,1080,1190,1300,1420,1540,1650,1760])deco('window',x);for(const x of [1030,1250,1475,1700])deco('pillar',x);
 for(const x of [1130,1360,1600])deco('banner',x);deco('statue',1270);deco('statue',1390);deco('altar',1322);
 L.zones.push({kind:'zombie',x0:1110,x1:1800,max:3,every:[90,150]});
 foe('bloody',1590+jit(20),200);foe('armor',1790,200,{home:1790});foe('bat',1460+jit(20),96);
 L.checks.push(780,1150,1500);
 // Underground Caverns: Mermen and stepping stones over black water
 slope(1812,1850,200,216);flat(1850,1950,216);flat(2350,2570,216);
 region('cave',1812,2570,'Underground Caverns');
 L.water.push({x0:1950,x1:2350,y:226});
 for(const x0 of [1995,2085,2175,2265])L.blocks.push({x0,x1:x0+40,y0:207,y1:212,kind:'stone'});
 L.items.push({type:'claymore',x:1902,y:216});
 for(const [x,y,item] of [[1880,192,'heart'],[2130,150,pick(subs)],[2420,192,'bigheart'],[2530,192,'heart']])candle('torch',x,y,item);
 for(const x of [1870,1990,2110,2230,2380,2500])deco('stalactite',x+jit(14),{h:22+rand()*26});for(const x of [1940,2360])deco('rockpillar',x);
 L.zones.push({kind:'merman',x0:1940,x1:2360,max:2,every:[100,160]});
 foe('bat',2040,104);foe('bat',2440+jit(20),110);
 L.checks.push(1840,2350);
 // Marble Gallery: the long climb to the keep
 slope(2570,2682,216,160);flat(2682,3010,160);
 region('gallery',2570,3000,'Marble Gallery');
 for(const [x,item] of [[2720,'potion'],[2860,'heart'],[2960,'bigheart']])candle('candelabra',x,gy[x],item);
 for(const x of [2600,2700,2800,2900])deco('arch',x);for(const x of [2650,2850])deco('statue',x+20);
 foe('armor',2810,160,{home:2810});foe('skeleton',2920,160,{home:2920,range:30});foe('bat',2760,70);
 L.checks.push(2600,2980);
 // Castle Keep: the throne room
 flat(3000,LEN,160);region('throne',3000,LEN,'Castle Keep');
 candle('candelabra',3062,160,'bigheart');candle('candelabra',3330,160,'potion');
 deco('stained',3160);deco('throne',3300);for(const x of [3020,3120,3240,3370])deco('pillar',x);deco('carpet',3010);
 L.blocks.push({x0:LEN-24,x1:LEN,y0:0,y1:VH,kind:'end'});
 L.end=L.arena.x0+40;
 return L;
}

// ------------------------------------------------------------------ per-player state
function spawnFoe(e){const F=FOE[e.type];return {...e,hw:F.hw,h:F.h,hp:F.hp,max:F.hp,dmg:F.dmg,vx:0,vy:0,t:0,anim:0,facing:-1,flash:0,dead:false,active:false,grounded:true,
 state:e.type==='bat'?'idle':e.type==='warg'?'idle':'walk',cd:60,home:e.home??e.x,baseY:e.y};}
function makeWorld(L,seed){return {blocks:L.blocks.map(b=>({...b})),candles:L.candles.map(c=>({...c,alive:true})),foes:L.foes.map(spawnFoe),items:L.items.map(it=>({...it,t:0,ground:true,fixed:true})),
 shots:[],eshots:[],flames:[],corpses:[],parts:[],decals:[],nums:[],ai:[],zoneT:L.zones.map(()=>70),gateShut:false,deathDone:false,scene:null,locked:false,boss:null,introDone:false,orb:false,
 rng:seededRandom(seed),shake:0,flash:0,flashCol:'255,255,255',msg:null,banner:null,area:'',bolt:null,lightT:240,thunderT:0};}
function makePlayer(i,L){return {i,x:L.start,y:L.gy[L.start],vx:0,vy:0,grounded:true,facing:1,crouch:false,usedDouble:false,dropT:0,dash:0,dashCD:0,atk:null,charge:0,cast:0,hurt:0,inv:0,
 hp:HP_MAX,maxHp:HP_MAX,lv:1,exp:0,mp:MP_MAX,hearts:10,weapon:'alucard',sub:null,leap:false,dead:0,pit:false,best:L.start,finished:false,finishT:0,anim:0,t:0,throwT:0,deaths:0,score:0,aiT:0,
 coy:0,jbuf:0,comboN:-1,comboT:99,flip:0,kick:0,land:0,sw:[]};}

// ------------------------------------------------------------------ the game
async function sotn(s){
 const [c,g]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');const FB=fullBleed(s,{bg:'#000'});s.updateScores();
 if(!await settle(s))return;
 s.cleanup(()=>stopAll());
 const L=buildCastle(s.random),seedBase=Math.floor(s.random()*1e9),AR=L.arena;
 const worlds=[makeWorld(L,seedBase),makeWorld(L,seedBase)],pl=[makePlayer(0,L),makePlayer(1,L)];
 const cams=[{x:0,w:300,look:0},{x:0,w:300,look:0}];
 const scen=new A.Scenery();
 const touchUI=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
 let phase='title',titleT=0,cd=new Countdown(3),clock=0,acc=0,endT=0,winner=-1,simT=0,frames=0,turn=0,gi=0,turnText='',endText='',stop=0;
 const ghost=[],ghostAt=i=>i===1&&gi<ghost.length?ghost[gi]:null;

 // ---------------- input
 const inputs=[0,1].map(()=>({l:0,r:0,u:0,d:0,jump:0,press:0,atk:0,atkHeld:0,sub:0,dash:0}));
 const keys={l:0,r:0,u:0,d:0,jump:0,atk:0};
 const KEYMAP={arrowleft:'l',a:'l',arrowright:'r',d:'r',arrowup:'u',w:'u',arrowdown:'d',s:'d',' ':'jump',x:'jump',k:'jump',z:'atk',j:'atk',enter:'atk',c:'dash',l:'dash',shift:'dash',v:'sub',i:'sub'};
 const onKey=down=>ev=>{if(['INPUT','TEXTAREA','SELECT'].includes(ev.target?.tagName))return;const k=KEYMAP[String(ev.key).toLowerCase()];if(!k)return;ev.preventDefault();
  if(down&&(s.paused||!s.alive||ev.repeat))return;const inp=inputs[turn];
  if(k==='dash'){if(down)inp.dash=1;return;}if(k==='sub'){if(down)inp.sub=1;return;}
  if(k==='atk'){keys.atk=down?1:0;if(down)inp.atk=1;return;}
  keys[k]=down?1:0;if(down&&k==='jump')inp.press=1;};
 const clearKeys=()=>{for(const k in keys)keys[k]=0;};
 s.on(document,'keydown',onKey(true));s.on(document,'keyup',onKey(false));s.on(window,'blur',clearKeys);s.resetOnPause?.(clearKeys);
 s.hint('SYMPHONY OF THE NIGHT: run Dracula\'s castle, slay Dracula (both forms) and grab his blood orb. Fastest wins. Touch: drag on the left to walk, down to crouch; tap the middle-right to attack: keep tapping for the three-hit combo (cut, stab, cleave); hold and let go for Hellfire, swipe up for your sub-weapon, swipe sideways to BACKDASH), far right to JUMP (again in mid-air once you find the Leap Stone; hold down and jump in mid-air to dive kick). Keys: arrows/WASD, Space/X jump, Z/J attack, C/Shift backdash, V or up + attack sub-weapon.');
 const pads={stick:null,jump:null,atk:null};
 arenaTouch(s,{owner:()=>turn,maxFingers:3,
  onDown:f=>{const inp=inputs[turn];if(f.x>s.W*.56){if(f.x>s.W*.79){f.data.role='jump';pads.jump=f;inp.press=1;}else{f.data.role='atk';pads.atk=f;inp.atk=1;}}else{f.data.role='stick';pads.stick=f;}},
  onMove:f=>{const inp=inputs[turn];if(f.data.role==='atk'){if(f.data.g)return;const dx=f.x-f.sx,dy=f.y-f.sy;
    if(dy<-26&&Math.abs(dx)<Math.abs(dy)){f.data.g=1;inp.sub=1;}else if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy)*1.3){f.data.g=1;inp.dash=1;}return;}
   if(f.data.role!=='stick')return;const dx=f.x-f.sx,dy=f.y-f.sy,lim=56,d=Math.hypot(dx,dy);if(d>lim){const k=lim/d;f.sx=f.x-dx*k;f.sy=f.y-dy*k;}},
  onUp:f=>{if(pads.jump===f)pads.jump=null;if(pads.stick===f)pads.stick=null;if(pads.atk===f)pads.atk=null;}});
 let bot=null; // tests can drive the hero: s.debug.bot=inp=>{...}
 const readInput=i=>{const inp=inputs[i],st=pads.stick;if(bot){bot(inp,i);return;}let {l,r,u,d,jump}=keys;
  if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(dx>10)r=1;if(dx<-10)l=1;if(dy<-20&&-dy>Math.abs(dx)*.7)u=1;if(dy>18&&dy>Math.abs(dx)*.6)d=1;}
  if(pads.jump)jump=1;Object.assign(inp,{l,r,u,d,jump,atkHeld:keys.atk||(pads.atk&&!pads.atk.data.g)?1:0});};

 // ---------------- terrain helpers
 const terrain=x=>{const k=Math.floor(x);return k<0||k>=LEN?NONE:L.gy[k];};
 // the highest surface under x that a falling body starting at y0 could land on
 function support(w,x,hw,y0,drop){let best=terrain(x);
  for(const b of w.blocks)if(b.y0<best&&x+hw*.6>b.x0&&x-hw*.6<b.x1&&y0<=b.y0+1)best=b.y0;
  if(!drop)for(const pf of L.plats)if(pf.y<best&&x>pf.x0&&x<pf.x1&&y0<=pf.y+1)best=pf.y;
  return best;}
 function moveBody(w,b,hw,h,{grav=GRAV,drop=false,edges=false}={}){
  const out={wall:0,landed:false};
  if(b.vx){let nx=b.x+b.vx;const lead=nx+Math.sign(b.vx)*hw,ga=terrain(lead);
   if(ga<b.y-(b.grounded?STEP_UP:.5))nx=b.x,out.wall=Math.sign(b.vx);
   for(const bl of w.blocks)if(b.y>bl.y0+.5&&b.y-h<bl.y1&&nx+hw>bl.x0&&nx-hw<bl.x1){nx=b.vx>0?bl.x0-hw-.01:bl.x1+hw+.01;out.wall=Math.sign(b.vx);}
   if(edges&&b.grounded&&support(w,lead,1,b.y,false)>b.y+12)nx=b.x,out.wall=Math.sign(b.vx);
   b.x=clamp(nx,6,LEN-6);}
  b.vy=Math.min(b.vy+grav,MAXFALL);const ny=b.y+b.vy;
  if(b.vy>=0){const sup=support(w,b.x,hw,b.y,drop);
   if(ny>=sup&&b.y<=sup+1){b.y=sup;b.vy=0;out.landed=true;}
   else if(b.grounded&&sup>b.y&&sup-b.y<=STEP_UP+2){b.y=sup;b.vy=0;out.landed=true;}
   else b.y=ny;}
  else{let top=ny;for(const bl of w.blocks)if(b.x+hw>bl.x0&&b.x-hw<bl.x1&&ny-h<bl.y1&&b.y-h>=bl.y1-.5){top=bl.y1+h;b.vy=0;}b.y=top;}
  return out;}
 const onPlatform=(p,w)=>L.plats.some(pf=>Math.abs(p.y-pf.y)<1&&p.x>pf.x0&&p.x<pf.x1)&&terrain(p.x)>p.y+4;
 const pBox=p=>({x0:p.x-5,x1:p.x+5,y0:p.y-(p.crouch?28:PH),y1:p.y});
 const fBox=e=>e.type==='bat'?{x0:e.x-9,x1:e.x+9,y0:e.y-7,y1:e.y+7}:e.type==='warg'?{x0:e.x-(e.facing>0?20:34),x1:e.x+(e.facing>0?34:20),y0:e.y-26,y1:e.y}:{x0:e.x-e.hw,x1:e.x+e.hw,y0:e.y-e.h,y1:e.y};
 const overlap=(a,b)=>a.x1>b.x0&&a.x0<b.x1&&a.y1>b.y0&&a.y0<b.y1;
 const regionAt=x=>L.regions.find(r=>x>=r.x0&&x<r.x1)||L.regions[L.regions.length-1];

 // ---------------- effects: blood, embers, dust, damage numbers
 function blood(w,x,y,n,dir=0,force=1){for(let k=0;k<n&&w.parts.length<520;k++){const a=dir?(dir>0?0:Math.PI)+(Math.random()-.5)*1.6-.5*Math.random():Math.random()*Math.PI*2;
  const v=(.8+Math.random()*2.6)*force;w.parts.push({kind:'blood',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.2*Math.random()-.4,life:90,max:90,size:.6+Math.random()*1.5});}}
 function embers(w,x,y,n,col='fire'){for(let k=0;k<n&&w.parts.length<520;k++)w.parts.push({kind:col==='bone'?'bone':'ember',x:x+(Math.random()-.5)*12,y:y+(Math.random()-.5)*10,vx:(Math.random()-.5)*(col==='bone'?3:.8),vy:col==='bone'?-1-Math.random()*2.5:-.4-Math.random()*1.1,life:30+Math.random()*30,max:60,size:.6+Math.random()*1.2,rot:Math.random()*6});}
 function dust(w,x,y,n){for(let k=0;k<n&&w.parts.length<520;k++)w.parts.push({kind:'dust',x:x+(Math.random()-.5)*10,y,vx:(Math.random()-.5)*1.4,vy:-.2-Math.random()*.6,life:24+Math.random()*16,max:40,size:1.5+Math.random()*2});}
 function splash(w,x,y){sfx.splash();for(let k=0;k<18&&w.parts.length<520;k++)w.parts.push({kind:'water',x:x+(Math.random()-.5)*8,y,vx:(Math.random()-.5)*2.4,vy:-1.5-Math.random()*3,life:40,max:40,size:.7+Math.random()*1.2});}
 function sparks(w,x,y,n,dir){for(let k=0;k<n&&w.parts.length<520;k++){const a=(dir<0?Math.PI:0)+(Math.random()-.5)*(dir?2:6.3),v=1.6+Math.random()*2.8;
  w.parts.push({kind:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:10+Math.random()*8,max:18,size:2+Math.random()*3});}
  w.parts.push({kind:'flash',x,y,life:7,max:7,size:9});}
 const num=(w,x,y,v,col='#ffffff')=>w.nums.push({x:x+(Math.random()-.5)*6,y,v:String(v),t:0,col});
 const msg=(w,text,sub='',kind='item')=>{w.msg={text,sub,t:0,kind};};
 const shake=(w,a)=>{w.shake=Math.max(w.shake,a);};

 // ---------------- the player
 const heroPose=p=>p.dead?'dead':p.hurt>0?'hurt':p.cast>0?'cast':p.atk?(p.atk.crouch?'crouchAtk':'attack'):p.kick?'kick':p.dash>0?'dash':!p.grounded?(p.vy<0?'jump':'fall'):p.crouch?'crouch':p.land>0?'land':Math.abs(p.vx)>.15?'walk':'stand';
 const snap=p=>({i:p.i,x:p.x,y:p.y,facing:p.facing,pose:heroPose(p),anim:p.anim,vx:p.vx,vy:p.vy,t:p.t,atkK:p.atk?p.atk.t/p.atk.len:0,atkN:p.atk?p.atk.n:0,flip:p.flip,land:p.land,weapon:p.atk?p.atk.w:p.weapon,dead:p.dead,best:p.best,finished:p.finished});
 function afterimage(p,w,life=18,k=.6){w.ai.push({q:snap(p),life,max:life,k});if(w.ai.length>14)w.ai.shift();}
 function kill(p,w,pit){if(p.dead||p.finished)return;p.dead=1;p.pit=pit;p.deaths++;p.atk=null;p.kick=0;p.hurt=0;p.vx=0;p.vy=0;p.dash=0;p.cast=0;
  if(!pit){blood(w,p.x,p.y-24,40,0,1.4);sfx.die();}s.react(p.i,'sad');w.flash=.5;w.flashCol='160,0,0';}
 function respawn(p){const w=worlds[p.i];let check=L.checks[0];for(const k of L.checks)if(k<=p.best+4)check=Math.max(check,k);
  if(w.locked&&!w.orb){w.locked=false;w.blocks=w.blocks.filter(b=>b.kind!=='bars');check=AR.x0-30;const B=w.boss;if(B){if(B.phase===1&&B.state!=='dying'){B.state='hidden';B.t=0;B.vis=0;B.open=0;}else if(B.phase===2&&B.state!=='die'){B.state='idle';B.t=0;B.x=AR.x1-90;B.y=AR.floor;B.vy=0;B.air=false;B.crouch=0;B.low=0;B.mouth=0;}}}
  Object.assign(p,{x:check,y:support(w,check,5,-50,true),vx:0,vy:0,grounded:true,dead:0,pit:false,atk:null,kick:0,flip:0,comboN:-1,hurt:0,crouch:false,dash:0,hp:p.maxHp,inv:100,cast:0,charge:0});
  w.foes=w.foes.filter(e=>e.boss).concat(L.foes.filter(e=>e.x>check+140).map(spawnFoe));w.eshots=[];w.shots=[];w.flames=[];w.corpses=[];w.zoneT=L.zones.map(()=>90);
  cams[p.i].x=clamp(check-cams[p.i].w*.4,0,LEN-cams[p.i].w);}
 function hurt(p,w,dmg,fromX){if(p.inv>0||p.dead||p.finished||w.scene)return;p.hp=Math.max(0,p.hp-dmg);num(w,p.x,p.y-PH-4,dmg,'#ff6a6a');blood(w,p.x,p.y-26,10+dmg,p.x<fromX?-1:1,.9);
  sfx.hit(false);sfx.grunt();s.react(p.i,'sad');shake(w,4);stop=Math.max(stop,4);
  if(p.hp<=0){kill(p,w,false);return;}
  const d=p.x<fromX?-1:1;Object.assign(p,{atk:null,kick:0,flip:0,comboN:-1,dash:0,cast:0,crouch:false,hurt:20,inv:80,grounded:false,vx:d*1.9,vy:-3.2,facing:-d});}
 // the combo: each press starts the next hit if it comes during the previous one (buffered) or soon after it
 function startAttack(p,w,dir){const n=p.comboN>=0&&p.comboN<2&&p.comboT<=COMBO_GAP?p.comboN+1:0,C=COMBO[n],W=WEAPONS[p.weapon],sp=W.spd,f=k=>Math.max(1,Math.round(k*sp));
  const slide=p.dash>0;if(dir)p.facing=dir;p.dash=0;p.kick=0;
  p.atk={t:0,n,w:p.weapon,crouch:p.grounded&&p.crouch,air:!p.grounded,hits:new Set(),act:[f(C.act[0]),f(C.act[1])],cancel:f(C.cancel),len:f(C.len),queued:false};
  p.comboN=n;p.comboT=0;p.sw=[];
  if(slide)p.vx*=.9;else if(p.grounded&&!p.atk.crouch)p.vx=p.facing*C.lunge*(p.weapon==='claymore'?.75:1);else if(!p.grounded&&n===1)p.vx+=p.facing*1.2;
  sfx.swing(p.weapon);if(n===2)setTimeout(()=>s.alive&&sfx.swing(p.weapon),40);
  if(n===1&&p.grounded&&!p.atk.crouch)dust(w,p.x-p.facing*4,p.y,3);}
 const atkBox=p=>{const a=p.atk,C=COMBO[a.n],W=WEAPONS[a.w],hy=p.y-(a.crouch?18:30),f=p.facing,x0=p.x-f*(C.back||0)+f*3,x1=p.x+f*(3+W.reach*C.reach);
  return {x0:Math.min(x0,x1),x1:Math.max(x0,x1),y0:hy+C.box[0]*(a.crouch?.6:1),y1:hy+C.box[1]};};
 function stepAttack(p,w){const a=p.atk,C=COMBO[a.n],W=WEAPONS[a.w];a.t++;
  if(a.t>=a.act[0]&&a.t<=a.act[1])hitBox(p,w,atkBox(p),Math.max(1,Math.round(W.dmg*C.dmg)),a.hits,{sword:a.w!=='fist',dir:p.facing,fin:a.n===2,stop:C.stop});
  const bl=A.bladeWorld({...snap(p),pose:a.crouch?'crouchAtk':'attack'});if(bl&&a.t<=a.act[1]+3){p.sw.push(bl);if(p.sw.length>7)p.sw.shift();}
  if(a.t>=a.len){p.atk=null;p.comboT=0;}}
 function throwSub(p,w){const k=p.sub;if(!k)return;const S=SUBS[k];if(p.hearts<S.cost||w.shots.filter(sh=>sh.own).length>=2){sfx.deny();return;}
  p.hearts-=S.cost;p.throwT=12;const f=p.facing,sh={kind:k,own:true,x:p.x+f*6,y:p.y-(p.crouch?16:30),vx:0,vy:0,g:0,t:0,f,hits:new Set()};
  if(k==='dagger'){sh.vx=f*5;sfx.dagger();}else if(k==='axe'){sh.vx=f*1.9;sh.vy=-5.4;sh.g=.2;sfx.axe();}else if(k==='holy'){sh.vx=f*2.1;sh.vy=-2.2;sh.g=.26;sfx.dagger();}else{sh.vx=f*4.4;sfx.cross();}
  w.shots.push(sh);}
 function castHellfire(p,w){p.mp-=HELL_MP;p.cast=26;p.vx=0;sfx.hellfire();shake(w,2);w.flash=Math.max(w.flash,.25);w.flashCol='255,120,40';
  for(const [k,vy] of [[0,-.7],[1,0],[2,.7]])w.shots.push({kind:'pfire',own:true,x:p.x+p.facing*8,y:p.y-30,vx:p.facing*(3.1-k*.15),vy,g:0,t:-k*4,f:p.facing,hits:new Set(),dmg:18});}
 function jump(p,w){p.vy=-JUMPV;p.grounded=false;p.coy=0;p.jbuf=0;p.usedDouble=false;p.crouch=false;p.atk=null;p.dash=0;sfx.jump();dust(w,p.x,p.y,3);}
 function stepPlayer(p,w,inp){
  const press=inp.press,atk=inp.atk,sub=inp.sub,dash=inp.dash;inp.press=0;inp.atk=0;inp.sub=0;inp.dash=0;
  p.t+=STEP;if(p.throwT>0)p.throwT--;if(p.land>0)p.land--;if(p.comboT<99&&!p.atk)p.comboT++;
  if(!p.atk&&p.sw.length)p.sw.shift();
  if(p.dead){p.dead++;if(p.dead>(p.pit?80:140))respawn(p);return;}
  if(p.finished||w.scene){p.vx=0;p.atk=null;p.kick=0;p.flip=0;p.charge=0;p.dash=0;const r=moveBody(w,p,5,PH);p.grounded=r.landed;return;}
  if(p.inv>0)p.inv--;if(p.dashCD>0)p.dashCD--;p.mp=Math.min(MP_MAX,p.mp+.07);
  if(p.hurt>0){p.hurt--;p.flip=0;const r=moveBody(w,p,5,PH);p.grounded=r.landed;if(r.landed)p.vx*=.6;afterMove(p,w);return;}
  if(p.cast>0){p.cast--;p.vx=0;const r=moveBody(w,p,5,PH);p.grounded=r.landed;afterMove(p,w);return;}
  const dir=(inp.r?1:0)-(inp.l?1:0);
  if(press)p.jbuf=JBUF;else if(p.jbuf>0)p.jbuf--;
  if(p.grounded)p.coy=COYOTE;else if(p.coy>0)p.coy--;
  // attack / sub-weapon (presses during a swing are buffered into the next hit of the combo)
  if(sub||atk&&inp.u&&p.sub){if(p.atk&&p.atk.t<p.atk.cancel+4)p.atk=null;if(!p.atk)throwSub(p,w);}
  else if(atk){if(p.atk)p.atk.queued=true;else startAttack(p,w,dir);}
  if(p.atk&&p.atk.queued&&p.atk.t>=(p.atk.n<2?p.atk.cancel:p.atk.len-1))startAttack(p,w,dir); // after the cleave a buffered press starts a new combo
  if(inp.atkHeld&&!p.atk){p.charge++;if(p.charge===CHARGE&&p.mp>=HELL_MP)sfx.charge();}
  else if(!inp.atkHeld){if(p.charge>=CHARGE&&p.mp>=HELL_MP&&!p.atk)castHellfire(p,w);p.charge=0;}
  // backdash: cancels the end of a swing, chains into another backdash, and a swing cancels it (SOTN's backdash-cancel)
  const free=!p.atk||p.atk.t>=p.atk.cancel;
  if(dash&&p.grounded&&free&&(p.dash<=5)&&p.dashCD<=0){p.atk=null;p.dash=17;p.dashCD=4;p.vx=-p.facing*4.4;p.crouch=false;sfx.dash();dust(w,p.x,p.y,4);afterimage(p,w,22);}
  if(p.atk){stepAttack(p,w);if(p.atk&&p.atk.t>=p.atk.cancel&&!p.atk.queued&&p.grounded&&dir&&!inp.d)p.atk=null;}
  if(p.atk&&p.dash)p.dash=0;
  if(p.dash>0){p.dash--;p.vx*=.9;if(p.dash%2===0)afterimage(p,w,16,.7);
   if(p.jbuf&&p.dash<12){p.dash=0;jump(p,w);p.vx=-p.facing*1.6;}}
  else if(p.kick){p.kick++;if(p.grounded||p.kick>60)p.kick=0;else{p.vx=p.facing*3.3;p.vy=Math.max(p.vy,4.6);if(p.kick%2===0)afterimage(p,w,14,.6);
   if(hitBox(p,w,{x0:p.x+(p.facing>0?0:-16),x1:p.x+(p.facing>0?16:0),y0:p.y-14,y1:p.y+4},Math.max(6,Math.round(WEAPONS[p.weapon].dmg*.6)),p.kickHits,{dir:p.facing,stop:4})){
    p.kick=0;p.vy=-4.2;p.vx=-p.facing*1.2;p.usedDouble=false;p.flip=.01;sfx.land();}}}
  else if(p.grounded){
   p.crouch=!!inp.d&&!(p.atk&&!p.atk.crouch);
   if(p.atk){p.vx*=.8;if(Math.abs(p.vx)<.05)p.vx=0;}
   else if(p.crouch)p.vx*=.6;
   else{const tv=dir*WALK;if(dir&&Math.sign(p.vx)===-dir)p.vx+=dir*TURN;
    if(dir)p.vx+=clamp(tv-p.vx,-ACC,ACC);else p.vx+=clamp(-p.vx,-FRIC,FRIC);if(dir)p.facing=dir;}
   if(p.jbuf&&p.coy>0&&free){if(p.crouch&&onPlatform(p,w)){p.jbuf=0;p.dropT=12;p.grounded=false;p.crouch=false;p.coy=0;}else jump(p,w);}
  }else{
   if(!p.atk||p.atk.air){const tv=dir*WALK;if(dir)p.vx+=clamp(tv-p.vx,-AIR_ACC*(Math.sign(p.vx)===-dir?2:1),AIR_ACC*(Math.sign(p.vx)===-dir?2:1));else p.vx+=clamp(-p.vx,-AIR_FRIC,AIR_FRIC);}
   if(dir&&!p.atk)p.facing=dir;
   if(p.jbuf&&p.coy>0&&free)jump(p,w);
   else if(press&&inp.d&&!p.atk&&p.vy>-3){p.jbuf=0;p.kick=1;p.kickHits=new Set();p.flip=0;sfx.dash();}
   else if(press&&p.leap&&!p.usedDouble&&free){p.jbuf=0;p.atk=null;p.usedDouble=true;p.vy=-DJUMPV;p.flip=.01;sfx.leap();for(let k=0;k<3;k++)afterimage(p,w);w.parts.push({kind:'ring',x:p.x,y:p.y,life:16,max:16,size:4});}}
  if(p.flip>0){p.flip+=1/26;if(p.flip>=1||p.atk||p.kick)p.flip=0;}
  if(p.dropT>0)p.dropT--;
  // gravity: lighter near the apex, heavier on the way down, and much heavier when jump is let go on the way up
  let gr=GRAV;if(!p.grounded&&!p.kick){if(p.vy<0&&!inp.jump&&!p.flip)gr*=CUT_G;else if(Math.abs(p.vy)<1.1)gr*=APEX;else if(p.vy>0)gr*=FALL_G;}
  const wasG=p.grounded,vy0=p.vy,r=moveBody(w,p,5,p.crouch?28:PH,{drop:p.dropT>0,grav:gr,edges:!!(p.atk&&p.grounded)});p.grounded=r.landed;
  if(p.grounded&&!wasG){p.usedDouble=false;p.flip=0;p.kick=0;if(p.atk?.air)p.atk=null;if(vy0>2.5){sfx.land();dust(w,p.x,p.y,vy0>5?8:4);p.land=vy0>5?7:4;}}
  if(p.grounded&&Math.abs(p.vx)>.1)p.anim+=Math.abs(p.vx)*.115;
  if((Math.abs(p.vx)>1.2||!p.grounded)&&++p.aiT%3===0)afterimage(p,w,p.grounded?12:15,p.atk?.45:p.grounded?.38:.42);
  afterMove(p,w);
 }
 function afterMove(p,w){
  for(const wa of L.water)if(p.x>wa.x0&&p.x<wa.x1&&p.y>wa.y+4&&!p.dead){splash(w,p.x,wa.y);kill(p,w,true);return;}
  if(p.y>VH+40){kill(p,w,true);return;}
  if(!w.locked||p.x<AR.x1)p.best=Math.max(p.best,Math.min(p.x,AR.x1));
  const reg=regionAt(p.x);if(reg.name!==w.area){if(w.area&&!(w.area==='Castle Entrance'&&reg.name==='Castle Entrance'))w.banner={text:reg.name,t:0};w.area=reg.name;}
  if(!w.gateShut&&p.x>L.gateX){w.gateShut=true;w.blocks.push({x0:922,x1:938,y0:96,y1:200,kind:'gate'});sfx.gate();shake(w,6);dust(w,930,200,12);}
  if(!w.deathDone&&p.x>L.deathX&&p.grounded){w.deathDone=true;w.scene={kind:'death',t:0,x:p.x};p.atk=null;p.vx=0;}
  if(!w.locked&&!w.orb&&p.x>AR.lockX&&!p.dead){w.locked=true;w.blocks.push({x0:AR.x0-16,x1:AR.x0,y0:0,y1:VH,kind:'bars'});sfx.gate();shake(w,5);
   if(!w.boss)w.boss=makeDracula();if(!w.introDone){w.introDone=true;w.scene={kind:'dracula',t:0};}}
 }
 // ---------------- pickups
 function dropItem(w,type,x,y){w.items.push({type,x,y,vy:type==='heart'?0:-2.2,x0:x,t:0,ground:false});}
 function pickUp(p,w,it){const t=it.type;
  if(t==='heart'){p.hearts++;sfx.heart();}
  else if(t==='bigheart'){p.hearts+=5;sfx.bigHeart();num(w,it.x,it.y-12,'+5','#ff8aa0');}
  else if(t==='money'){const v=[100,250,400][Math.floor(w.rng()*3)];p.score+=v;sfx.money();num(w,it.x,it.y-12,'$'+v,'#ffe08a');}
  else if(t==='potion'){const v=Math.min(40,p.maxHp-p.hp);p.hp+=v;sfx.potion();num(w,p.x,p.y-PH-6,v||'MAX','#7affb0');msg(w,'Potion','Restores 40 HP');}
  else if(t==='roast'){p.hp=p.maxHp;sfx.potion();num(w,p.x,p.y-PH-6,'MAX','#7affb0');msg(w,'Pot Roast','Hidden in the wall, as tradition demands');}
  else if(WEAPONS[t]){p.weapon=t;sfx.item();msg(w,NAMES[t],t==='claymore'?'Huge two-handed sword: slow, brutal':'A plain blade. Better than fists');}
  else if(SUBS[t]){p.sub=t;sfx.item();msg(w,NAMES[t],`Sub-weapon · ${SUBS[t].cost} heart${SUBS[t].cost>1?'s':''} a throw`);}
  else if(t==='leap'){p.leap=true;sfx.relic();msg(w,'Leap Stone','Press jump again in mid-air','relic');w.flash=.35;w.flashCol='120,255,180';}
  else if(t==='orb'){p.hp=p.maxHp;if(!p.finished){p.finished=true;p.finishT=clock;p.atk=null;sfx.orb();setTimeout(()=>s.alive&&sfx.clear(),700);s.react(p.i,'win');w.flash=.6;w.flashCol='255,60,90';}}}
 // ---------------- damage
 function dropFrom(w,x,y,rate=.35){const r=w.rng();if(r<rate)dropItem(w,r<rate*.18?'bigheart':r<rate*.3?'money':'heart',x,y);}
 function killFoe(p,w,e,o){e.dead=true;const F=FOE[e.type],H=e.h;sfx.kill();sfx.blood();stop=Math.max(stop,6);shake(w,3);
  const cutY=e.y-H*.5,dir=o.dir||(p.x<e.x?1:-1);
  if(e.type==='skeleton'){sfx.collapse();embers(w,e.x,e.y-H*.5,14,'bone');w.corpses.push({foe:{...e},x:e.x,y:e.y,h:H,part:'whole',t:0,life:40,rot:0});}
  else if(e.type==='bat'){blood(w,e.x,e.y,14,dir,1);w.corpses.push({foe:{...e},x:e.x,y:e.y,h:8,part:'whole',t:0,life:36,vy:.5,fall:true});}
  else if(o.sword){blood(w,e.x,cutY,30,dir,1.3);w.corpses.push({foe:{...e},x:e.x,y:e.y,h:H,part:'bot',t:0,life:70,rot:0,dx:0,dy:0,spurt:24});
   w.corpses.push({foe:{...e},x:e.x,y:e.y,h:H,part:'top',t:0,life:70,rot:0,vr:dir*.07,dx:0,dy:0,vx:dir*1.5,vy:-2.4,fly:true});}
  else{blood(w,e.x,cutY,22,dir,1.1);w.corpses.push({foe:{...e},x:e.x,y:e.y,h:H,part:'whole',t:0,life:60,rot:0});}
  embers(w,e.x,cutY,10);dropFrom(w,e.x,e.type==='bat'?e.y:e.y-12,e.type==='warg'||e.type==='armor'||e.type==='bloody'?.7:.35);
  p.score+=F.hp*10;p.exp+=EXP[e.type]||5;
  while(p.lv<=LEVELS.length&&p.exp>=LEVELS[p.lv-1]){p.lv++;p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+10);p.mp=MP_MAX;sfx.level();w.levelT=1;}}
 function damageFoe(p,w,e,dmg,o){e.hp-=dmg;num(w,e.x,e.y-e.h-6,dmg);const hy=e.type==='bat'?e.y:e.y-e.h*.55;blood(w,e.x,hy,6+Math.min(16,dmg/2),o.dir||0,1);sfx.hit(dmg>=20||o.fin);if(o.sword)sfx.slashHit();sparks(w,e.x-(o.dir||0)*e.hw*.5,hy,o.fin?9:5,o.dir||0);
  stop=Math.max(stop,o.stop??3);if(o.fin)shake(w,3);
  if(e.hp<=0){killFoe(p,w,e,o);return;}
  e.flash=8;if(e.type==='bloody')blood(w,e.x,hy,12,0,.8);
  if(e.type!=='armor'&&e.type!=='warg'&&e.type!=='bat'){e.x+=(o.dir||Math.sign(e.x-p.x)||1)*(o.fin?11:4);}
  if(e.type==='warg'&&e.state==='idle')wake(w,e,p);}
 function hitBox(p,w,box,dmg,hits,o={}){let any=false;
  for(const cd of w.candles)if(cd.alive&&!hits.has(cd)&&overlap(box,{x0:cd.fx-6,x1:cd.fx+6,y0:cd.fy-10,y1:cd.fy+8})){hits.add(cd);cd.alive=false;sfx.candle();embers(w,cd.fx,cd.fy,8);dropItem(w,cd.item,cd.fx,cd.fy);any=true;}
  for(const e of w.foes)if(!e.dead&&e.active&&!hits.has(e)&&!(e.state==='rise'&&e.t<14)&&overlap(box,fBox(e))){hits.add(e);damageFoe(p,w,e,dmg,o);any=true;}
  for(const b of w.blocks)if(b.kind==='crack'&&!hits.has(b)&&overlap(box,{x0:b.x0,x1:b.x1,y0:b.y0,y1:b.y1})){hits.add(b);b.hp-=dmg;sfx.wall();dust(w,(b.x0+b.x1)/2,b.y0+10,6);shake(w,2);
   if(b.hp<=0){w.blocks.splice(w.blocks.indexOf(b),1);for(let k=0;k<16;k++)w.parts.push({kind:'rubble',x:b.x0+Math.random()*16,y:b.y0+Math.random()*50,vx:(Math.random()-.5)*3,vy:-Math.random()*3,life:60,max:60,size:1.5+Math.random()*2.5});dropItem(w,b.item,(b.x0+b.x1)/2,b.y0+20);}any=true;}
  const B=w.boss;if(B&&!hits.has(B)){const r=bossHit(B,box);if(r){hits.add(B);damageBoss(p,w,B,Math.round(dmg*r),o);any=true;}}
  return any;}

 // ---------------- monsters
 function wake(w,e,p){if(e.state!=='idle')return;e.state=e.type==='bat'?'fly':'run';e.t=0;e.facing=p.x<e.x?-1:1;if(e.type==='warg')sfx.howl();else sfx.squeak();}
 function stepFoes(w,p,cam){
  const fr=!!w.scene;
  if(!fr&&!p.dead&&!w.locked&&phase==='play')L.zones.forEach((z,k)=>{if(p.x<z.x0-40||p.x>z.x1||--w.zoneT[k]>0)return;
   w.zoneT[k]=z.every[0]+Math.floor(w.rng()*(z.every[1]-z.every[0]));
   if(w.foes.filter(e=>!e.dead&&e.zone===k).length>=z.max)return;
   if(z.kind==='zombie'){for(let tries=0;tries<4;tries++){const side=w.rng()<.65?p.facing:-p.facing,x=Math.round(p.x+side*(50+w.rng()*70));
     if(x<z.x0||x>z.x1||Math.abs(terrain(x)-terrain(x+10))>2||Math.abs(terrain(x)-terrain(x-10))>2||terrain(x)>=NONE)continue;
     w.foes.push({...spawnFoe({type:'zombie',x,y:terrain(x)}),zone:k,active:true,state:'rise',t:0,facing:p.x<x?-1:1});sfx.rise();dust(w,x,terrain(x),8);if(w.rng()<.6)sfx.groan();break;}}
   else{const spots=[];for(const b of w.blocks)if(b.kind==='stone')spots.push((b.x0+b.x1)/2);spots.push(1925,2375);
    const ok=spots.filter(x=>Math.abs(x-p.x)>45&&Math.abs(x-p.x)<150);if(!ok.length)return;const tx=ok[Math.floor(w.rng()*ok.length)];
    const wa=L.water[0],sx=clamp(tx+(tx<wa.x0+10?28:tx>wa.x1-10?-28:(w.rng()<.5?-26:26)),wa.x0+6,wa.x1-6);
    w.foes.push({...spawnFoe({type:'merman',x:sx,y:wa.y}),zone:k,active:true,state:'leap',t:0,vx:(tx-sx)/42,vy:-6.6,grounded:false,facing:p.x<sx?-1:1});splash(w,sx,wa.y);}});
  for(const e of w.foes){
   if(e.dead||e.boss)continue;
   if(!e.active){if(e.x>cam.x-30&&e.x<cam.x+cam.w+30)e.active=true;else continue;}
   if(e.x<cam.x-160||e.x>cam.x+cam.w+160){if(e.zone!=null)e.dead=true;else{e.active=false;if(e.type!=='armor'&&e.type!=='skeleton'){e.state=e.type==='bat'||e.type==='warg'?'idle':'walk';e.x=L.foes.find(f=>f.x===e.home)?.x??e.x;}}continue;}
   if(e.flash>0)e.flash--;
   if(fr)continue;
   e.t++;const dx=p.x-e.x,adx=Math.abs(dx);
   switch(e.type){
    case 'zombie':{if(e.state==='rise'){if(e.t>=40){e.state='walk';e.t=0;}break;}
     if(e.t%80===1)e.facing=dx<0?-1:1;e.vx=e.facing*.45;e.anim+=.09;const r=moveBody(w,e,5,30,{edges:true});if(r.wall)e.facing=-e.facing;if(w.rng()<.003)sfx.groan();break;}
    case 'bloody':{if(e.state==='swipe'){e.vx=0;if(e.t===12)sfx.growl();if(e.t>=12&&e.t<=18&&!p.dead&&overlap(pBox(p),{x0:e.x+(e.facing>0?0:-22),x1:e.x+(e.facing>0?22:0),y0:e.y-34,y1:e.y-10}))hurt(p,w,e.dmg,e.x);if(e.t>30){e.state='walk';e.t=0;e.cd=50;}}
     else{e.facing=dx<0?-1:1;e.vx=e.facing*.5;e.anim+=.1;if(--e.cd<0&&adx<28&&!p.dead){e.state='swipe';e.t=0;}}
     moveBody(w,e,6,36,{edges:true});if(e.t%12===0)blood(w,e.x+(Math.random()-.5)*8,e.y-20-Math.random()*12,1,0,.3);if(w.rng()<.004)sfx.groan();break;}
    case 'warg':{if(e.state==='idle'){if(adx<210&&!p.dead)wake(w,e,p);break;}
     if(e.state==='run'){e.facing=dx<0?-1:1;e.vx+=clamp(e.facing*2.1-e.vx,-.12,.12);e.anim+=.22;if(--e.cd<0&&adx<80&&adx>20&&e.grounded&&!p.dead){e.state='tell';e.t=0;sfx.growl();}}
     else if(e.state==='tell'){e.vx*=.8;if(e.t>=16){e.state='lunge';e.t=0;e.vx=e.facing*4.4;e.vy=-3.3;e.grounded=false;sfx.bite();}}
     else if(e.state==='lunge'){if(e.grounded&&e.t>4){e.state='skid';e.t=0;}}
     else if(e.state==='skid'){e.vx*=.9;if(e.t>22){e.state='run';e.t=0;e.cd=40;}}
     const r=moveBody(w,e,14,26);e.grounded=r.landed;if(r.wall&&e.state==='run')e.vx=0;break;}
    case 'skeleton':{if(e.state==='throw'){e.vx=0;if(e.t===10&&!p.dead){const vx=clamp(dx/58,-2.3,2.3);w.eshots.push({kind:'bone',x:e.x,y:e.y-30,vx,vy:-4.3,g:.17,t:0,dmg:8});sfx.bones();}if(e.t>22){e.state='walk';e.t=0;e.cd=90+Math.floor(w.rng()*70);}}
     else{if(Math.abs(e.x-e.home)>(e.range||30))e.facing=Math.sign(e.home-e.x);else if(w.rng()<.01)e.facing=-e.facing;e.vx=e.facing*.4;e.anim+=.1;
      if(--e.cd<0&&adx<190&&!p.dead){e.state='throw';e.t=0;e.facing=dx<0?-1:1;}}
     const r=moveBody(w,e,5,32,{edges:true});if(r.wall)e.facing=-e.facing;break;}
    case 'bat':{if(e.state==='idle'){if(adx<120&&!p.dead)wake(w,e,p);break;}
     e.anim+=.35;e.facing=e.vx<0?-1:1;if(e.t%70===1)e.vx=(dx<0?-1:1)*1.25;e.baseY+=clamp(p.y-24-e.baseY,-.5,.5);e.x+=e.vx;e.y=e.baseY+Math.sin(e.t*.12)*10;break;}
    case 'merman':{if(e.state==='leap'){const r=moveBody(w,e,5,30);if(r.landed){e.state='walk';e.t=0;e.cd=40+Math.floor(w.rng()*30);sfx.land();}
      const wa=L.water[0];if(!r.landed&&e.vy>0&&e.y>wa.y+6&&e.x>wa.x0&&e.x<wa.x1){e.dead=true;splash(w,e.x,wa.y);}break;}
     if(e.state==='spit'){e.vx=0;if(e.t===20&&!p.dead){w.eshots.push({kind:'mfire',x:e.x+e.facing*8,y:e.y-29,vx:e.facing*2.3,vy:0,g:0,t:0,dmg:10});sfx.spit();}if(e.t>34){e.state='walk';e.t=0;e.cd=90;}}
     else{e.facing=dx<0?-1:1;e.vx=e.facing*.4;e.anim+=.12;if(--e.cd<0&&adx<170&&!p.dead){e.state='spit';e.t=0;}
      if(e.t>220){e.state='leap';e.t=0;e.vy=-5.5;e.vx=-e.facing*1.4;}}
     if(e.state!=='leap'){const r=moveBody(w,e,5,30,{edges:true});if(r.wall)e.facing=-e.facing;}break;}
    case 'armor':{if(e.state==='throw'){e.vx=0;if(e.t===20&&!p.dead){e.thrown=true;w.eshots.push({kind:'eaxe',x:e.x+e.facing*8,y:e.y-34,vx:e.facing*2.8,vy:0,g:0,t:0,dmg:14,f:e.facing,owner:e,boom:true});sfx.axe();}if(e.t>32){e.state='walk';e.t=0;e.cd=120;}}
     else{e.facing=dx<0?-1:1;const want=adx>96?e.facing*.35:adx<60?-e.facing*.3:0;e.vx=want;if(want){e.anim+=.07;if(e.t%30===0)sfx.clank();}
      if(--e.cd<0&&adx<220&&!e.thrown&&!p.dead){e.state='throw';e.t=0;}}
     moveBody(w,e,7,44,{edges:true});break;}
   }
   if(e.y>VH+30)e.dead=true;
   if(!p.dead&&!p.finished&&!(e.state==='rise'&&e.t<20)&&!(e.type==='bat'&&e.state==='idle')&&!(e.type==='warg'&&e.state==='idle')&&overlap(pBox(p),fBox(e)))hurt(p,w,e.dmg,e.x);
  }
  w.foes=w.foes.filter(e=>!e.dead||e.boss);
 }

 // ---------------- Dracula
 const makeDracula=()=>({boss:true,phase:1,hp:D1_HP,max:D1_HP,state:'throne',t:0,x:AR.x1-80,y:AR.floor,facing:-1,vis:1,open:0,flash:0,vx:0,vy:0});
 function bossHit(B,box){if(B.phase===1){if(!(B.vis>.6&&['idle','hellfire','inferno','vanish','appear'].includes(B.state)))return 0;return overlap(box,{x0:B.x-11,x1:B.x+11,y0:B.y-64,y1:B.y})?1:0;}
  if(!['idle','leap','breath','summon','recover'].includes(B.state))return 0;const H=demonHead(B);
  if(overlap(box,{x0:H.x-15,x1:H.x+15,y0:H.y-14,y1:H.y+14}))return 1;if(overlap(box,demonBody(B)))return .6;return 0;}
 const demonHead=B=>({x:B.x+B.facing*(26+(B.low||0)*10+14),y:B.y-112+(B.crouch||0)*14+(B.low||0)*32-4});
 const demonBody=B=>({x0:B.x-30,x1:B.x+32,y0:B.y-100+(B.crouch||0)*14,y1:B.y});
 function damageBoss(p,w,B,dmg,o){B.hp=Math.max(0,B.hp-dmg);B.flash=8;sfx.hit(true);if(o.sword)sfx.slashHit();stop=Math.max(stop,4);shake(w,2);
  const hp=B.phase===1?{x:B.x,y:B.y-40}:demonHead(B);num(w,hp.x,hp.y-16,dmg);blood(w,hp.x,hp.y,10+dmg/3,o.dir||0,1.1);sparks(w,hp.x,hp.y,o.fin?9:5,o.dir||0);if(o.fin)stop=Math.max(stop,6);
  if(B.hp>0)return;
  if(B.phase===1){B.state='dying';B.t=0;B.open=0;sfx.laugh(true);w.eshots=[];}
  else{B.state='die';B.t=0;w.eshots=[];for(const e of w.foes)if(e.type==='bat')e.dead=true;sfx.roar();}}
 function stepBoss(w,p){const B=w.boss;if(!B)return;if(B.flash>0)B.flash--;if(w.scene&&B.state!=='throne')return;B.t++;
  const face=()=>{B.facing=p.x<B.x?-1:1;};
  if(B.phase===1){
   switch(B.state){
    case 'throne':break;
    case 'idle':face();if(B.t>32){B.t=0;B.state=w.rng()<.55?'hellfire':'inferno';}break;
    case 'hellfire':B.open=Math.min(1,B.t/18);if(B.t===20&&!p.dead){const dx=p.x-B.x,dy=p.y-24-(B.y-40),a=Math.atan2(dy,dx);for(const da of [-.22,0,.22])w.eshots.push({kind:'hellfire',x:B.x+B.facing*10,y:B.y-40,vx:Math.cos(a+da)*2.4,vy:Math.sin(a+da)*2.4,g:0,t:0,dmg:10});sfx.fireball();sfx.hellfire();}
     if(B.t>60)B.open=Math.max(0,B.open-.08);if(B.t>80){B.state='vanish';B.t=0;}break;
    case 'inferno':B.open=Math.min(.7,B.t/30);if(B.t===32&&!p.dead){for(const da of [0,-.35]){const dx=p.x-B.x,dy=p.y-22-(B.y-36),a=Math.atan2(dy,dx)+da*B.facing;w.eshots.push({kind:'inferno',x:B.x+B.facing*12,y:B.y-36,vx:Math.cos(a)*1.75,vy:Math.sin(a)*1.75,g:0,t:0,dmg:14});}sfx.inferno();}
     if(B.t>70)B.open=Math.max(0,B.open-.06);if(B.t>88){B.state='vanish';B.t=0;}break;
    case 'vanish':if(B.t===1)sfx.teleport();B.vis=Math.max(0,1-B.t/24);if(B.t>24){B.state='hidden';B.t=0;}break;
    case 'hidden':B.vis=0;if(B.t>26&&!p.dead){const mid=(AR.x0+AR.x1)/2,side=p.x>mid?-1:1;B.x=clamp(p.x+side*(78+w.rng()*42),AR.x0+26,AR.x1-26);B.y=AR.floor;face();B.state='appear';B.t=0;sfx.appear();}break;
    case 'appear':B.vis=Math.min(1,B.t/30);if(B.t>=30){B.state='idle';B.t=0;}break;
    case 'dying':B.vis=1;if(B.t%7===0){blood(w,B.x+(Math.random()-.5)*20,B.y-20-Math.random()*40,14,0,1.4);sfx.boom();shake(w,4);}
     if(B.t===80){sfx.roar();w.flash=.9;w.flashCol='255,255,255';}
     if(B.t>110){Object.assign(B,{phase:2,hp:D2_HP,max:D2_HP,state:'rise',t:0,rise:0,x:clamp(B.x,AR.x0+70,AR.x1-70),y:AR.floor,vy:0,air:false,crouch:0,low:0,mouth:0,swipe:0});w.banner={text:'Dracula, true form',t:0,boss:true};}break;
   }
   if(B.vis>.6&&['idle','hellfire','inferno','appear'].includes(B.state)&&!p.dead&&overlap(pBox(p),{x0:B.x-9,x1:B.x+9,y0:B.y-60,y1:B.y}))hurt(p,w,10,B.x);
   return;}
  // the demon
  const D=B;
  switch(D.state){
   case 'rise':D.rise=Math.min(1,D.t/70);if(D.t%10===0){shake(w,3);dust(w,D.x+(Math.random()-.5)*60,AR.floor,6);}if(D.t>=74){D.state='idle';D.t=0;D.rise=1;}break;
   case 'idle':face();D.crouch*=.85;D.low*=.85;D.mouth*=.8;if(D.t>40){D.t=0;const bats=w.foes.filter(e=>e.type==='bat'&&!e.dead).length,r=w.rng();D.state=!bats&&r<.22?'summon':r<.6?'leap':'breath';}break;
   case 'leap':if(!D.air){D.crouch=Math.min(1,D.t/24);if(D.t===24){const tx=clamp(p.x,AR.x0+60,AR.x1-60);D.vy=-7.4;D.vx=(tx-D.x)/50;D.air=true;sfx.growl();}}
    else{D.crouch=Math.max(0,D.crouch-.08);D.vy+=.3;D.x=clamp(D.x+D.vx,AR.x0+46,AR.x1-46);D.y+=D.vy;
     if(D.y>=AR.floor&&D.vy>0){D.y=AR.floor;D.air=false;D.vy=0;D.crouch=1;sfx.stomp();shake(w,9);dust(w,D.x,AR.floor,16);
      for(const s2 of [-1,1])w.eshots.push({kind:'wave',x:D.x+s2*34,y:AR.floor,vx:s2*2.7,vy:0,g:0,t:0,dmg:14,h:14});D.state='recover';D.t=0;}}break;
   case 'recover':D.crouch=Math.max(0,1-D.t/36);if(D.t>40){D.state='idle';D.t=0;}break;
   case 'breath':if(D.t<30){D.low=Math.min(1,D.t/24);D.mouth=D.t/30;face();}
    if(D.t===30)sfx.breath();
    if([30,38,46,54].includes(D.t)&&!p.dead){const H=demonHead(D),mx=H.x+D.facing*8,my=H.y+8,a=Math.atan2(p.y-24-my,p.x-mx);w.eshots.push({kind:'breath',x:mx,y:my,vx:Math.cos(a)*2.9,vy:Math.sin(a)*2.9,g:0,t:0,dmg:12});}
    if(D.t>56)D.mouth=Math.max(0,D.mouth-.05);if(D.t>104)D.low=Math.max(0,D.low-.06);if(D.t>120){D.state='idle';D.t=0;}break;
   case 'summon':D.swipe=Math.sin(D.t/30*Math.PI);if(D.t===18){for(let k=0;k<3;k++)w.foes.push({...spawnFoe({type:'bat',x:D.x-20+k*12,y:D.y-110+k*10}),active:true,state:'fly',vx:(k-1)*.9,baseY:D.y-110+k*10,t:k*20});sfx.squeak();sfx.laugh(true);}
    if(D.t>34){D.state='idle';D.t=0;D.swipe=0;}break;
   case 'die':if(D.t%6===0){blood(w,D.x+(Math.random()-.5)*70,D.y-30-Math.random()*90,16,0,1.6);embers(w,D.x+(Math.random()-.5)*60,D.y-Math.random()*100,6);if(D.t%12===0)sfx.boom();shake(w,5);}
    if(D.t===60)sfx.roar();if(D.t>100)D.rise=Math.max(0,1-(D.t-100)/90);
    if(D.t===150){w.flash=1;w.flashCol='255,255,255';sfx.shatter();}
    if(D.t>195){D.state='gone';w.orb=true;dropItem(w,'orb',clamp(p.x+(p.x<(AR.x0+AR.x1)/2?60:-60),AR.x0+40,AR.x1-40),40);}break;
  }
  if(!['rise','die','gone'].includes(D.state)&&!p.dead&&overlap(pBox(p),demonBody(D)))hurt(p,w,12,D.x);
 }

 // ---------------- world step: projectiles, pickups, particles, scenes
 function stepWorld(w,p){const cam=cams[p.i],fr=!!w.scene;
  if(w.scene)stepScene(w,p);
  stepFoes(w,p,cam);stepBoss(w,p);
  for(let k=w.eshots.length-1;k>=0;k--){const b=w.eshots[k];if(fr)continue;b.t++;
   if(b.boom){b.vx-=b.f*.055;if(b.t>40&&b.owner&&Math.abs(b.x-b.owner.x)<10){b.owner.thrown=false;w.eshots.splice(k,1);continue;}}
   b.vy+=b.g;b.x+=b.vx;b.y+=b.vy;
   if(b.kind==='wave'&&(b.x<AR.x0-4||b.x>AR.x1+4)){w.eshots.splice(k,1);continue;}
   const r=b.kind==='inferno'?8:b.kind==='wave'?6:4,hy0=b.kind==='wave'?b.y-b.h:b.y-r,hy1=b.kind==='wave'?b.y:b.y+r;
   if(!p.dead&&!p.finished&&overlap(pBox(p),{x0:b.x-r,x1:b.x+r,y0:hy0,y1:hy1})){hurt(p,w,b.dmg,b.x);if(b.kind!=='wave'&&b.kind!=='inferno'){if(b.owner)b.owner.thrown=false;w.eshots.splice(k,1);continue;}}
   if(b.y>VH+20||b.t>420||b.x<cam.x-80||b.x>cam.x+cam.w+80){if(b.owner)b.owner.thrown=false;w.eshots.splice(k,1);}}
  for(let k=w.shots.length-1;k>=0;k--){const sh=w.shots[k];sh.t++;if(sh.t<0)continue;let gone=false;
   if(sh.kind==='cross'){sh.vx-=sh.f*.11;sh.x+=sh.vx;if(sh.t>30&&Math.sign(sh.vx)!==sh.f&&Math.abs(sh.x-p.x)<10&&Math.abs(sh.y-(p.y-24))<30)gone=true;}
   else{sh.vy+=sh.g;sh.x+=sh.vx;sh.y+=sh.vy;}
   const box={x0:sh.x-5,x1:sh.x+5,y0:sh.y-5,y1:sh.y+5};
   if(sh.kind==='holy'){const sup=support(w,sh.x,1,sh.y-sh.vy,false);if(sh.y>=sup||hitBox(p,w,box,6,sh.hits)){for(const dx of [-10,0,10]){const fy=support(w,sh.x+dx,1,sh.y-20,false);if(fy<VH)w.flames.push({x:sh.x+dx,y:fy,t:0,life:80});}sfx.holy();gone=true;}}
   else if(sh.kind==='pfire'){if(hitBox(p,w,box,sh.dmg,sh.hits))gone=true;if(sh.t%2===0)embers(w,sh.x,sh.y,1);}
   else{if(hitBox(p,w,box,sh.kind==='dagger'?10:sh.kind==='axe'?20:14,sh.hits)&&sh.kind==='dagger')gone=true;if(sh.kind==='dagger'&&terrain(sh.x)<sh.y)gone=true;}
   if(sh.x<cam.x-30||sh.x>cam.x+cam.w+30||sh.y>VH+20||sh.t>240)gone=true;
   if(gone)w.shots.splice(k,1);}
  for(let k=w.flames.length-1;k>=0;k--){const f=w.flames[k];f.t++;if(f.t%10===1)hitBox(p,w,{x0:f.x-6,x1:f.x+6,y0:f.y-18,y1:f.y},6,new Set());if(f.t>f.life)w.flames.splice(k,1);}
  for(let k=w.items.length-1;k>=0;k--){const it=w.items[k];it.t++;
   if(!it.ground){if(it.type==='heart'){it.y+=.6;it.x=it.x0+Math.sin(it.t*.08)*10;}else{it.vy=Math.min(it.vy+.16,3.5);it.y+=it.vy;}
    const sup=support(w,it.x,2,it.y-4,false);if((it.type==='heart'||it.vy>=0)&&it.y>=sup){it.y=sup;it.ground=true;}if(it.y>VH+20){w.items.splice(k,1);continue;}}
   if(!it.fixed&&it.type!=='orb'&&it.t>600){w.items.splice(k,1);continue;}
   if(!p.dead&&!w.scene&&Math.abs(it.x-p.x)<11&&it.y>p.y-PH-8&&it.y-14<p.y){w.items.splice(k,1);pickUp(p,w,it);}}
  for(let k=w.corpses.length-1;k>=0;k--){const c2=w.corpses[k];c2.t++;
   if(c2.fly){c2.vy+=.2;c2.dx+=c2.vx;c2.dy+=c2.vy;c2.rot+=c2.vr;const gyy=support(w,c2.x+c2.dx,2,c2.y+c2.dy-c2.h*.5-1,false);if(c2.y+c2.dy-c2.h*.25>gyy){c2.dy=gyy-c2.y+c2.h*.25;c2.vx*=.5;c2.vy=0;c2.vr*=.6;if(Math.abs(c2.vx)<.2){c2.fly=false;}blood(w,c2.x+c2.dx,gyy-2,4,0,.6);}}
   if(c2.fall){c2.dy=(c2.dy||0)+(c2.vy+=.2);}
   if(c2.part==='bot'&&c2.t>8)c2.rot=Math.min(.12,c2.rot+.004);
   if(c2.spurt>0){c2.spurt--;if(c2.spurt%2===0)for(let j=0;j<2;j++)w.parts.length<520&&w.parts.push({kind:'blood',x:c2.x+(Math.random()-.5)*4,y:c2.y-c2.h*.5,vx:(Math.random()-.5)*1.6,vy:-2.5-Math.random()*2.2,life:90,max:90,size:.7+Math.random()*1.3});}
   if(c2.t>20&&c2.t%4===0)embers(w,c2.x+(c2.dx||0),c2.y+(c2.dy||0)-c2.h*.4,1);
   if(c2.t>c2.life)w.corpses.splice(k,1);}
  for(let k=w.parts.length-1;k>=0;k--){const q=w.parts[k];q.life--;
   if(q.kind==='blood'||q.kind==='water'||q.kind==='rubble'||q.kind==='bone'){q.vy+=.2;q.x+=q.vx;q.y+=q.vy;
    if(q.vy>0){const sup=support(w,q.x,1,q.y-q.vy-1,false);if(q.y>=sup){if(q.kind==='blood'&&sup<NONE&&!L.water.some(wa=>q.x>wa.x0&&q.x<wa.x1)){w.decals.push({x:q.x,y:sup,r:q.size*(1.4+Math.random()*1.8),k:Math.random()});if(w.decals.length>320)w.decals.shift();}
     if(q.kind==='rubble'||q.kind==='bone'){q.y=sup;q.vy*=-.3;q.vx*=.6;if(Math.abs(q.vy)<.4)q.vy=0;}else{w.parts.splice(k,1);continue;}}}}
   else if(q.kind==='ember'||q.kind==='dust'){q.x+=q.vx;q.y+=q.vy;q.vx*=.98;}
   else if(q.kind==='spark'){q.x+=q.vx;q.y+=q.vy;q.vx*=.86;q.vy*=.86;}
   if(q.life<=0)w.parts.splice(k,1);}
  for(let k=w.nums.length-1;k>=0;k--){const n=w.nums[k];n.t++;if(n.t>50)w.nums.splice(k,1);}
  for(let k=w.ai.length-1;k>=0;k--)if(--w.ai[k].life<=0)w.ai.splice(k,1);
  // weather and ambience
  const reg=regionAt(p.x).kind;
  if((reg==='forest'||reg==='gate')&&--w.lightT<=0){w.lightT=260+Math.floor(Math.random()*360);w.flash=Math.max(w.flash,.7);w.flashCol='220,225,255';w.bolt={x:cams[p.i].x+40+Math.random()*(cams[p.i].w-80),t:0,seed:Math.random()*1e4};w.thunderT=12+Math.floor(Math.random()*30);}
  if(w.thunderT>0&&--w.thunderT===0)sfx.thunder();
  if(reg==='cave'&&Math.random()<.008)sfx.drip();
  if(w.bolt&&++w.bolt.t>14)w.bolt=null;
 }
 const DEATH_LINES=[[40,'Death','Son of Dracula... how dare you return to this castle.'],[150,'Death','You will not reach your father. Your power... I will take it all.'],[270,'Death','Now crawl.']];
 const DRAC_LINES=[[30,'Dracula','What is a man? A miserable little pile of secrets!'],[150,'Dracula','But enough talk... Have at you!']];
 function stepScene(w,p){const sc=w.scene;sc.t++;
  if(sc.kind==='death'){const t=sc.t;
   if(t===1){sfx.thunder();w.flash=.8;w.flashCol='200,200,255';}if(t===16)sfx.death();
   for(const [at] of DEATH_LINES)if(t>=at&&t<at+60&&t%3===0)sfx.blip();
   if(t===216){sfx.scythe();shake(w,4);}
   if(t===226){sfx.lose();sc.gear=[0,1,2,3].map(k=>({k,t:0}));p.weapon='fist';w.flash=.6;w.flashCol='170,90,255';}
   if(t===300)sfx.laugh(false);
   if(t>=360){w.scene=null;msg(w,'Equipment lost','Death took the Alucard Sword','lost');}}
  else if(sc.kind==='dracula'){const t=sc.t,B=w.boss;
   for(const [at] of DRAC_LINES)if(t>=at&&t<at+60&&t%3===0)sfx.blip();
   if(t===10){B.state='throne';B.vis=0;}B.vis=Math.min(1,t/30);
   if(t===240){sfx.laugh(true);}if(t>=290){w.scene=null;B.state='idle';B.t=0;w.banner={text:'Dracula',t:0,boss:true};music('boss');}}
 }
 const updateCamera=(p,i)=>{const cam=cams[i],w=worlds[i];cam.look+=((p.facing||1)*cam.w*.08-cam.look)*.04;let tx=p.x-cam.w*.5+cam.look;
  if(w.scene?.kind==='death')tx=w.scene.x-cam.w*.35;
  if(w.locked){const lo=AR.x0-10,hi=AR.x1+10-cam.w;tx=hi<lo?(AR.x0+AR.x1)/2-cam.w/2:clamp(tx,lo,hi);}
  tx=clamp(tx,0,LEN-cam.w);cam.x+=(tx-cam.x)*(Math.abs(tx-cam.x)>120?.25:.14);};

 // ---------------- render interpolation: the simulation runs at a fixed 60 Hz; drawing blends the last two steps so
 // motion stays smooth on 90/120 Hz phones and when a frame runs one step short or long
 const lerpBodies=i=>{const w=worlds[i],out=[pl[i],cams[i]];if(w.boss)out.push(w.boss);for(const a of [w.foes,w.shots,w.eshots])for(const o of a)out.push(o);return out;};
 function savePrev(i){for(const o of lerpBodies(i)){o._px=o.x;o._py=o.y;}}
 let lerped=[];
 function interp(i,al){lerped=[];if(al>=1)return;for(const o of lerpBodies(i)){if(o._px===undefined||Math.abs(o.x-o._px)>40)continue;lerped.push([o,o.x,o.y]);o.x=o._px+(o.x-o._px)*al;if(o.y!==undefined)o.y=o._py+(o.y-o._py)*al;}
  ghostAl=al;}
 function uninterp(){for(const [o,x,y] of lerped){o.x=x;o.y=y;}lerped=[];ghostAl=1;}
 let ghostAl=1;
 // ---------------- drawing
 const lay={sc:2,vw:300,ox:0,oy:0,vh:480};
 function layout(){const portrait=s.W<s.H;let sc,vw,ox=0,oy=0;
  if(portrait){vw=216;sc=s.W/vw;oy=Math.max(0,(s.H-VH*sc)*.2);}
  else{sc=s.H/VH;vw=s.W/sc;if(vw>520){vw=520;ox=(s.W-vw*sc)/2;}}
  Object.assign(lay,{sc,vw,ox,oy,vh:VH*sc});return lay;}
 let vig=null,vigKey='';
 function vignette(){const k=`${Math.round(lay.vw*lay.sc)}x${Math.round(lay.vh)}`;if(k===vigKey&&vig)return vig;vigKey=k;const W=Math.max(2,Math.round(lay.vw*lay.sc)),H=Math.max(2,Math.round(lay.vh));
  vig=document.createElement('canvas');vig.width=W;vig.height=H;const q=vig.getContext('2d'),gr=q.createRadialGradient(W/2,H*.55,Math.min(W,H)*.25,W/2,H*.55,Math.max(W,H)*.75);
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.7,'rgba(0,0,0,.35)');gr.addColorStop(1,'rgba(0,0,0,.8)');q.fillStyle=gr;q.fillRect(0,0,W,H);return vig;}
 const headFn=(i,mood)=>(gg,x,y,size)=>s.sprite(gg,i,x,y,size,{exact:true,mood});
 function drawRegionBack(w,r,cam,x0,x1){const t=simT,sk=scen;
  g.save();g.beginPath();g.rect(Math.max(r.x0,x0),0,Math.min(r.x1,x1)-Math.max(r.x0,x0),VH);g.clip();
  if(r.kind==='forest'||r.kind==='gate'){g.drawImage(sk.L.sky,cam.x-1,0,cam.w+2,VH);sk.tiled(g,'stars',cam.x,.97,x0,x1,0,.9);
   g.drawImage(sk.L.moon,cam.x+cam.w*.68-60,4,120,120);
   g.drawImage(sk.L.castle,cam.x+cam.w*.3-cam.x*.06,0,360,VH);
   if(w.bolt){const b=w.bolt;g.save();g.strokeStyle=`rgba(230,235,255,${1-b.t/14})`;g.lineWidth=1.4;g.beginPath();let bx=b.x,by=0;g.moveTo(bx,by);let sd=b.seed;while(by<150){sd=(sd*9301+49297)%233280;bx+=(sd/233280-.5)*18;by+=10+(sd%7);g.lineTo(bx,by);}g.stroke();g.restore();}
   sk.tiled(g,'hills',cam.x,.75,x0,x1);sk.tiled(g,'trees',cam.x,.45,x0,x1,0,.95);
   if(r.kind==='gate'){g.fillStyle=sk.pattern(g,'gatewall');g.fillRect(860,14,r.x1-860+40,200);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(860,14,r.x1-860+40,200);
    for(let x=860;x<r.x1+40;x+=16){g.fillStyle='#1c1820';g.fillRect(x,4,10,12);}A.glow(g,880,120,40,A.GLOW.fire,.25);}}
  else if(r.kind==='hall'){g.fillStyle=sk.pattern(g,'stone');g.fillRect(r.x0,0,r.x1-r.x0,VH);const gr=g.createLinearGradient(0,0,0,VH);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(.6,'rgba(0,0,0,.25)');gr.addColorStop(1,'rgba(40,10,0,.2)');g.fillStyle=gr;g.fillRect(x0,0,x1-x0,VH);}
  else if(r.kind==='cave'){g.fillStyle=sk.pattern(g,'rock');g.fillRect(r.x0,0,r.x1-r.x0,VH);const gr=g.createLinearGradient(0,0,0,VH);gr.addColorStop(0,'rgba(0,4,8,.85)');gr.addColorStop(.7,'rgba(0,10,20,.3)');gr.addColorStop(1,'rgba(0,20,30,.2)');g.fillStyle=gr;g.fillRect(x0,0,x1-x0,VH);}
  else if(r.kind==='gallery'){g.fillStyle=sk.pattern(g,'marble');g.fillRect(r.x0,0,r.x1-r.x0,VH);const gr=g.createLinearGradient(0,0,0,VH);gr.addColorStop(0,'rgba(0,0,10,.7)');gr.addColorStop(1,'rgba(0,0,20,.15)');g.fillStyle=gr;g.fillRect(x0,0,x1-x0,VH);}
  else if(r.kind==='throne'){g.fillStyle=sk.pattern(g,'throne');g.fillRect(r.x0,0,r.x1-r.x0,VH);const gr=g.createLinearGradient(0,0,0,VH);gr.addColorStop(0,'rgba(0,0,0,.8)');gr.addColorStop(1,'rgba(30,0,5,.2)');g.fillStyle=gr;g.fillRect(x0,0,x1-x0,VH);}
  g.restore();}
 function drawDecor(w,d,cam){const t=simT,x=d.x;
  switch(d.type){
   case 'tree':{g.save();g.translate(x,terrain(x));g.scale(d.s,d.s);g.fillStyle='#0a0710';g.strokeStyle='#0a0710';g.lineCap='round';g.lineWidth=7;g.beginPath();g.moveTo(0,0);g.lineTo(3,-90);g.stroke();
    for(const [a,l,y0,wd] of [[-2.2,40,-80,4],[-0.8,46,-70,4],[-2.6,30,-50,3],[-0.4,34,-40,3],[-1.6,30,-92,3]]){g.lineWidth=wd;g.beginPath();g.moveTo(2,y0);const ex=2+Math.cos(a)*l,ey=y0+Math.sin(a)*l;g.lineTo(ex,ey);g.stroke();g.lineWidth=wd*.5;g.beginPath();g.moveTo(ex,ey);g.lineTo(ex+Math.cos(a-.6)*l*.45,ey+Math.sin(a-.6)*l*.45);g.moveTo((2+ex)/2,(y0+ey)/2);g.lineTo((2+ex)/2+Math.cos(a+.7)*l*.35,(y0+ey)/2+Math.sin(a+.7)*l*.35);g.stroke();}
    g.restore();break;}
   case 'fence':{const xa=Math.max(x,cam.x-10),xb=Math.min(x+d.w,cam.x+cam.w+10);g.fillStyle='#16121e';for(let fx=Math.ceil(xa/9)*9;fx<xb;fx+=9){const gy0=terrain(fx);if(gy0>=NONE)continue;g.fillRect(fx,gy0-30,1.6,30);A.poly(g,[fx-1.4,gy0-30,fx+.8,gy0-35,fx+3,gy0-30],'#16121e');}
    for(const yy of [26,10]){g.beginPath();for(let fx=xa;fx<=xb;fx+=8){const gy0=terrain(fx);if(gy0<NONE)g.lineTo(fx,gy0-yy);}g.strokeStyle='#16121e';g.lineWidth=1.4;g.stroke();}break;}
   case 'grave':{const gy0=terrain(x);A.poly(g,[x-5,gy0,x-5,gy0-12,x-3,gy0-15,x+3,gy0-15,x+5,gy0-12,x+5,gy0],'#2a2632');g.fillStyle='#16121e';g.fillRect(x-.6,gy0-13,1.2,7);g.fillRect(x-2.5,gy0-11,5,1.2);break;}
   case 'bridge':{g.fillStyle='#0a0c14';g.fillRect(x,200,d.w,VH-200);g.fillStyle='rgba(60,90,120,.25)';for(let k=0;k<6;k++)g.fillRect(x+((k*37+t*8)%d.w),226+k%3*5,10,.8);
    for(let k=0;k<d.w;k+=10){g.fillStyle=k%20?'#3a2618':'#2e1e12';g.fillRect(x+k,198,10,6);g.fillStyle='#1a0e08';g.fillRect(x+k+9,198,1,6);}
    g.strokeStyle='#2a2a30';g.lineWidth=1.2;g.beginPath();g.moveTo(x,170);g.quadraticCurveTo(x+d.w*.5,200,x+d.w,120);g.stroke();break;}
   case 'gatewall':break;
   case 'gate':{g.fillStyle='#08060a';g.beginPath();g.moveTo(x-2,200);g.lineTo(x-2,120);g.arc(x+9,120,11,Math.PI,0);g.lineTo(x+20,200);g.fill();
    const shut=w.gateShut,py=shut?96:60;g.strokeStyle='#4a4450';g.lineWidth=1.6;for(let k=0;k<5;k++){g.beginPath();g.moveTo(x+1+k*4,py+(shut?24:0));g.lineTo(x+1+k*4,py+(shut?104:40));g.stroke();}
    for(let k=0;k<4;k++){g.beginPath();g.moveTo(x-1,py+(shut?40:10)+k*16);g.lineTo(x+19,py+(shut?40:10)+k*16);g.stroke();}
    g.fillStyle='#2a2430';g.fillRect(x-8,96,6,104);g.fillRect(x+20,96,6,104);A.candelabra(g,x-14,170,true,t,'torch');A.candelabra(g,x+32,170,true,t,'torch');break;}
   case 'window':{A.archWindow(g,x,46,22,58,t);A.lightShaft(g,x,52,22,140,.07);break;}
   case 'pillar':A.pillar(g,x,0,support(w,x,1,-50,true),14);break;
   case 'banner':A.banner(g,x,30,64,t);break;
   case 'statue':A.statue(g,x,terrain(x));break;
   case 'altar':{const gy0=terrain(x);g.fillStyle='#2e2838';g.fillRect(x-9,gy0-10,18,10);g.fillStyle='#4a4058';g.fillRect(x-11,gy0-12,22,3);g.fillStyle='#1a1620';g.fillRect(x-7,gy0-8,14,6);break;}
   case 'stalactite':{A.poly(g,[x-7,0,x+7,0,x+1,d.h,x-1,d.h],'#0c161c');A.poly(g,[x-3,0,x+1,0,x,d.h*.8],'#1a2a32');if((Math.floor(t*0.7+x))%5===0){const dy=((t*60+x*3)%80)/80;g.fillStyle='rgba(120,180,220,.6)';g.fillRect(x-.5,d.h+dy*(VH-d.h-30),1,2.4);}break;}
   case 'rockpillar':{g.fillStyle='#0b151b';g.fillRect(x-10,0,20,VH);g.fillStyle='#16242c';g.fillRect(x-8,0,4,VH);break;}
   case 'arch':{const gy0=terrain(x+40);g.fillStyle='#1a1a26';g.fillRect(x,30,8,gy0-30);g.fillRect(x+72,30,8,gy0-30);g.beginPath();g.moveTo(x,34);g.quadraticCurveTo(x+40,-6,x+80,34);g.lineTo(x+80,28);g.quadraticCurveTo(x+40,-14,x,28);g.fill();
    A.archWindow(g,x+26,52,28,64,t,{light:A.GLOW.moon});A.lightShaft(g,x+26,58,28,130,.06);break;}
   case 'stained':{A.archWindow(g,x,26,64,92,t,{stained:true,light:A.GLOW.red});A.lightShaft(g,x,40,64,150,.05);break;}
   case 'throne':A.throne(g,x,AR.floor);break;
   case 'carpet':{g.fillStyle='#5a0a14';g.fillRect(x,AR.floor-1.5,AR.x1-x,3);g.fillStyle='#b88a2a';g.fillRect(x,AR.floor-1.5,AR.x1-x,.6);break;}
  }}
 function drawTerrain(w,cam,x0,x1){
  for(const r of L.regions){const a=Math.max(r.x0,Math.floor(x0)),b=Math.min(r.x1,Math.ceil(x1));if(a>=b)continue;
   const key=r.kind==='forest'?'dirt':r.kind==='cave'?'caveFloor':'floorStone',top=r.kind==='forest'?'#2a3a22':r.kind==='cave'?'#2c4450':r.kind==='gallery'?'#6a6a86':r.kind==='throne'?'#5a3a42':'#5a5064';
   g.save();g.beginPath();g.rect(a,0,b-a,VH);g.clip();
   let x=a;while(x<b){while(x<b&&terrain(x)>=NONE)x+=2;if(x>=b)break;const s0=x;g.beginPath();g.moveTo(s0,VH);while(x<=b&&terrain(Math.min(x,LEN-1))<NONE){g.lineTo(x,terrain(Math.min(x,LEN-1)));x+=3;}const e=Math.min(x-3,b);g.lineTo(e,VH);g.closePath();
    g.fillStyle=scen.pattern(g,key);g.fill();g.fillStyle='rgba(0,0,0,.35)';g.fill();
    g.beginPath();for(let xx=s0;xx<=e;xx+=3)xx===s0?g.moveTo(xx,terrain(xx)):g.lineTo(xx,terrain(xx));g.strokeStyle=top;g.lineWidth=2;g.stroke();
    for(let xx=s0;xx<e;xx+=8){const y0=terrain(xx),y1=terrain(Math.min(xx+8,LEN-1));if(Math.abs(y1-y0)>2){g.fillStyle='rgba(255,255,255,.08)';g.fillRect(xx,Math.min(y0,y1),8,1.4);}}
    if(r.kind==='forest')for(let xx=s0+((s0*7)%5);xx<e;xx+=6){const y0=terrain(xx);g.fillStyle='#1c2a18';g.fillRect(xx,y0-2-(xx*13%3),1,3);}}
   g.restore();}
  for(const pf of L.plats){if(pf.x1<x0||pf.x0>x1)continue;g.fillStyle='#4a4254';g.fillRect(pf.x0,pf.y,pf.x1-pf.x0,5);g.fillStyle='#6a6076';g.fillRect(pf.x0,pf.y,pf.x1-pf.x0,1.2);g.fillStyle='#231e2a';
   for(let xx=pf.x0+6;xx<pf.x1;xx+=24){A.poly(g,[xx,pf.y+5,xx+10,pf.y+5,xx+5,pf.y+14],'#2a2432');}
   g.fillStyle='#3a3444';for(let xx=pf.x0;xx<pf.x1;xx+=10)g.fillRect(xx,pf.y-8,1.6,8);g.fillRect(pf.x0,pf.y-9,pf.x1-pf.x0,1.6);}
  for(const b of w.blocks){if(b.x1<x0||b.x0>x1)continue;
   if(b.kind==='stone'){g.fillStyle='#1a2a30';g.fillRect(b.x0+8,b.y1,b.x1-b.x0-16,VH-b.y1);g.fillStyle='#2f444c';g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0+2);g.fillStyle='#4a666e';g.fillRect(b.x0,b.y0,b.x1-b.x0,1.2);}
   else if(b.kind==='crack'){g.fillStyle=scen.pattern(g,'stone');g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0);
    g.strokeStyle='#08060a';g.lineWidth=.9;g.beginPath();g.moveTo(b.x0+4,b.y0+6);g.lineTo(b.x0+9,b.y0+18);g.lineTo(b.x0+6,b.y0+30);g.lineTo(b.x0+12,b.y0+44);g.moveTo(b.x0+9,b.y0+18);g.lineTo(b.x0+14,b.y0+22);g.stroke();}
   else if(b.kind==='bars'){g.fillStyle='#120c10';g.fillRect(b.x0,0,b.x1-b.x0,VH);g.strokeStyle='#5a5262';g.lineWidth=1.6;for(let k=0;k<4;k++){g.beginPath();g.moveTo(b.x0+2+k*4,20);g.lineTo(b.x0+2+k*4,AR.floor);g.stroke();}}
   else if(b.kind==='end'){g.fillStyle='#0e0608';g.fillRect(b.x0,0,b.x1-b.x0,VH);}}}
 function drawCandles(w,x0,x1){for(const cd of w.candles){if(cd.x<x0-20||cd.x>x1+20)continue;if(cd.kind==='torch'){g.fillStyle='#1a1418';g.fillRect(cd.x-1,cd.y-2,2,4);}
   A.candelabra(g,cd.x,cd.y,cd.alive,simT,cd.kind);if(!cd.alive&&cd.kind!=='candelabra'){}}}
 function drawWater(x0,x1){for(const wa of L.water){if(wa.x1<x0||wa.x0>x1)continue;const gr=g.createLinearGradient(0,wa.y,0,VH);gr.addColorStop(0,'rgba(20,60,80,.72)');gr.addColorStop(1,'rgba(2,10,16,.95)');g.fillStyle=gr;g.fillRect(wa.x0,wa.y,wa.x1-wa.x0,VH-wa.y);
  g.strokeStyle='rgba(140,200,230,.55)';g.lineWidth=1;g.beginPath();for(let x=wa.x0;x<=wa.x1;x+=4)g.lineTo(x,wa.y+Math.sin(x*.12+simT*2.4)*.9);g.stroke();
  for(let k=0;k<10;k++){const gx=wa.x0+((k*53+simT*10)%(wa.x1-wa.x0));g.fillStyle='rgba(180,220,255,.25)';g.fillRect(gx,wa.y+3+(k%3)*4,6,.6);}}}
 function drawParts(w){for(const q of w.parts){const a=clamp(q.life/q.max*1.5,0,1);
  if(q.kind==='blood'){g.fillStyle=q.size>1.4?'#8a0010':'#b00018';g.fillRect(q.x-q.size*.5,q.y-q.size*.5,q.size,q.size*1.3);}
  else if(q.kind==='ember'){g.globalAlpha=a;g.fillStyle=q.life%6<3?'#ffb040':'#ff5a10';g.fillRect(q.x,q.y,q.size,q.size);A.glow(g,q.x,q.y,q.size*3,A.GLOW.fire,a*.4);g.globalAlpha=1;}
  else if(q.kind==='dust'){g.globalAlpha=a*.35;g.fillStyle='#8a8090';g.beginPath();g.arc(q.x,q.y,q.size*(1.6-a*.6),0,6.3);g.fill();g.globalAlpha=1;}
  else if(q.kind==='water'){g.globalAlpha=a;g.fillStyle='#9ad0f0';g.fillRect(q.x,q.y,q.size,q.size);g.globalAlpha=1;}
  else if(q.kind==='rubble'){g.globalAlpha=a;g.fillStyle='#3a3444';g.fillRect(q.x,q.y-q.size,q.size,q.size);g.globalAlpha=1;}
  else if(q.kind==='bone'){g.globalAlpha=a;g.save();g.translate(q.x,q.y);g.rotate(q.rot+=q.vx*.1);g.fillStyle='#e8e1cc';g.fillRect(-3,-.7,6,1.4);g.restore();g.globalAlpha=1;}
  else if(q.kind==='spark'){const k=q.life/q.max;g.strokeStyle=`rgba(200,230,255,${k})`;g.lineWidth=.9;g.beginPath();g.moveTo(q.x,q.y);g.lineTo(q.x-q.vx*q.size,q.y-q.vy*q.size);g.stroke();}
  else if(q.kind==='flash'){const k=q.life/q.max;A.glow(g,q.x,q.y,q.size*(1.6-k*.6),A.GLOW.blue,k);A.glow(g,q.x,q.y,q.size*.5,A.GLOW.white,k);}
  else if(q.kind==='ring'){const k=1-q.life/q.max;g.strokeStyle=`rgba(140,255,200,${1-k})`;g.lineWidth=1.4;g.beginPath();g.ellipse(q.x,q.y,6+k*16,2+k*4,0,0,6.3);g.stroke();}}}
 // the blue sword trail (a ribbon through the last few hilt/tip positions) plus each combo hit's own flourish
 function drawSlash(p){const a=p.atk,sw=p.sw,prev=g.globalCompositeOperation;g.globalCompositeOperation='lighter';
  if(sw.length>1){const n=sw.length,big=a&&a.n===2;
   for(let k=1;k<n;k++){const P=sw[k-1],Q=sw[k],al=k/n;g.fillStyle=`rgba(${big?'90,160,255':'70,140,255'},${(big?.55:.42)*al})`;
    g.beginPath();g.moveTo(P[0],P[1]);g.lineTo(P[2],P[3]);g.lineTo(Q[2],Q[3]);g.lineTo(Q[0],Q[1]);g.closePath();g.fill();}
   g.strokeStyle='rgba(220,240,255,.85)';g.lineWidth=1.1;g.beginPath();g.moveTo(sw[0][2],sw[0][3]);for(let k=1;k<n;k++)g.lineTo(sw[k][2],sw[k][3]);g.stroke();}
  if(a){const C=COMBO[a.n],W=WEAPONS[a.w],f=p.facing,hy=p.y-(a.crouch?18:30)+(a.n===1?1:0),live=a.t>=a.act[0]&&a.t<=a.act[1]+2,k=clamp((a.t-a.act[0])/(a.act[1]-a.act[0]+2),0,1);
   if(live&&a.n===1){// the stab: a spear of blue light out past the blade
    const tip=sw[sw.length-1];let x0=p.x+f*12,y=hy;if(tip){x0=tip[2]-f*6;y=tip[3];}const x1=p.x+f*(3+W.reach*C.reach)*(.7+.3*Math.min(1,k*2)),gr=g.createLinearGradient(x0,0,x1,0);gr.addColorStop(0,'rgba(60,120,255,0)');gr.addColorStop(.7,`rgba(90,170,255,${.75*(1-k*.6)})`);gr.addColorStop(1,`rgba(230,245,255,${.95*(1-k*.5)})`);
    g.fillStyle=gr;g.beginPath();g.moveTo(x0,y-1.2);g.lineTo(x1-f*4,y-2.6);g.lineTo(x1,y);g.lineTo(x1-f*4,y+2.6);g.lineTo(x0,y+1.2);g.closePath();g.fill();A.glow(g,x1,y,8,A.GLOW.blue,.7*(1-k*.5));}
   else if(live&&a.w!=='fist'){// the cuts: a crescent, small for the first hit and a full arc for the cleave
    const big=a.n===2,R=W.reach*C.reach*(big?.95:.85),cx=p.x+f*(big?1:3),cy=hy+(big?-4:0),a0=big?-2.5:-1.1,a1=a0+(big?3.5:1.5)*Math.min(1,k*1.35);
    g.save();g.translate(cx,cy);g.scale(f,1);g.beginPath();g.arc(0,0,R,a0,a1);g.arc(0,0,R*(big?.55:.68),a1,a0,true);g.closePath();
    g.fillStyle=`rgba(${a.w==='claymore'?'200,215,255':'110,175,255'},${(big?.6:.45)*(1-k*.55)})`;g.fill();g.beginPath();g.arc(0,0,R,a0,a1);g.strokeStyle=`rgba(235,245,255,${.95*(1-k*.5)})`;g.lineWidth=big?1.8:1.2;g.stroke();g.restore();}}
  g.globalCompositeOperation=prev;}
 function drawNums(w){for(const n of w.nums){const k=n.t/50,y=n.y-Math.min(10,n.t*.9)+(n.t>12?Math.sin((n.t-12)*.3)*.6:0);outlined(g,n.v,n.x,y,{size:8,fill:n.col,stroke:'#000',alpha:k<.7?1:1-(k-.7)/.3,lw:2.2,font:GOTH});}}
 function drawDecals(w,x0,x1){for(const d of w.decals){if(d.x<x0-10||d.x>x1+10)continue;g.fillStyle=d.k<.5?'rgba(110,0,10,.85)':'rgba(70,0,6,.9)';g.beginPath();g.ellipse(d.x,d.y-.2,d.r,d.r*.28,0,0,6.3);g.fill();}}
 function drawScene(w,p,lay){const sc=w.scene;if(!sc)return;const u=lay.sc,W=lay.vw*u,X=lay.ox,Y=lay.oy,H=lay.vh;
  const dark=sc.kind==='death'?Math.min(.55,sc.t/40)*(sc.t>330?Math.max(0,1-(sc.t-330)/30):1):0;if(dark){g.fillStyle=`rgba(10,0,20,${dark})`;g.fillRect(X,Y,W,H);}
  const lines=sc.kind==='death'?DEATH_LINES:DRAC_LINES;let cur=null;for(const ln of lines)if(sc.t>=ln[0])cur=ln;
  if(cur&&!(sc.kind==='death'&&sc.t>330)){const shown=Math.floor((sc.t-cur[0])/1.6),text=cur[2].slice(0,shown),bw=W*.92,bh=Math.max(40,H*.2),bx=X+(W-bw)/2,by=Y+H-bh-H*.04;
   const gr=g.createLinearGradient(0,by,0,by+bh);gr.addColorStop(0,'rgba(20,10,60,.92)');gr.addColorStop(1,'rgba(4,0,16,.95)');g.fillStyle=gr;g.fillRect(bx,by,bw,bh);g.strokeStyle='#c9a24a';g.lineWidth=Math.max(1.5,u*.8);g.strokeRect(bx+2,by+2,bw-4,bh-4);
   const fs=Math.round(clamp(u*7.5,12,26));g.font=`italic 700 ${fs}px ${GOTH}`;g.textAlign='left';g.textBaseline='top';g.fillStyle=sc.kind==='death'?'#c7a0ff':'#ff6a6a';g.fillText(cur[1],bx+fs*.7,by+fs*.4);
   g.font=`${fs}px ${GOTH}`;g.fillStyle='#f2eee6';wrap(text,bx+fs*.7,by+fs*1.55,bw-fs*1.4,fs*1.2);}}
 function wrap(text,x,y,maxW,lh){const words=text.split(' ');let lineS='';for(const wd of words){const t2=lineS?lineS+' '+wd:wd;if(g.measureText(t2).width>maxW&&lineS){g.fillText(lineS,x,y);y+=lh;lineS=wd;}else lineS=t2;}if(lineS)g.fillText(lineS,x,y);}
 function drawWorld(i){
  const p=pl[i],w=worlds[i],cam=cams[i];layout();cam.w=lay.vw;scen.ensure(g,lay.sc);
  g.save();g.beginPath();g.rect(lay.ox,lay.oy,lay.vw*lay.sc,lay.vh);g.clip();g.fillStyle='#000';g.fillRect(lay.ox,lay.oy,lay.vw*lay.sc,lay.vh);
  const sh=w.shake>.3?w.shake:0;g.translate(lay.ox+(sh?(Math.random()-.5)*sh*lay.sc*.5:0),lay.oy+(sh?(Math.random()-.5)*sh*lay.sc*.5:0));g.scale(lay.sc,lay.sc);g.translate(-cam.x,0);
  g.lineCap='round';g.lineJoin='round';
  const x0=cam.x-4,x1=cam.x+cam.w+4;
  for(const r of L.regions)if(r.x1>x0&&r.x0<x1)drawRegionBack(w,r,cam,x0,x1);
  for(const d of L.decor)if(d.x>x0-220&&d.x<x1+40&&d.type!=='tree'&&d.type!=='fence')drawDecor(w,d,cam);
  for(const d of L.decor)if((d.type==='tree'||d.type==='fence')&&d.x>x0-120&&d.x<x1+760)drawDecor(w,d,cam);
  drawTerrain(w,cam,x0,x1);drawDecals(w,x0,x1);drawCandles(w,x0,x1);
  for(const it of w.items){if(it.altar||it.fixed&&!it.ground)continue;const bob=it.fixed?Math.sin(simT*3+it.x)*2-4:0;if(it.t>480&&!it.fixed&&it.type!=='orb'&&(frames>>2)%2)continue;A.drawPickup(g,it.type,it.x,it.y+bob,simT);}
  for(const it of w.items)if(it.altar)A.drawPickup(g,it.type,it.x,it.y-2+Math.sin(simT*3)*2,simT);
  for(const f of w.flames)A.drawHolyFlame(g,f,simT);
  for(const c2 of w.corpses)A.drawCorpse(g,c2,simT);
  for(const e of w.foes){if(e.dead||!e.active||e.boss)continue;if(e.x<x0-60||e.x>x1+60)continue;
   if(e.state==='rise'){g.save();g.beginPath();g.rect(e.x-30,0,60,e.y);g.clip();A.drawFoe(g,{...e,y:e.y+e.h*(1-clamp(e.t/36,0,1))},simT);g.restore();}
   else{if(e.flash>0&&(frames>>1)%2){g.save();g.globalAlpha=.5;A.drawFoe(g,e,simT);g.restore();}else A.drawFoe(g,e,simT);}}
  const B=w.boss;if(B&&B.state!=='gone'){if(B.phase===1){if(B.flash>0&&(frames>>1)%2)g.globalAlpha=.55;A.drawDracula(g,B,simT);g.globalAlpha=1;if(B.state==='inferno'&&B.t<32){A.glow(g,B.x-16,B.y-38,10+B.t*.4,A.GLOW.purple,.8);A.glow(g,B.x+16,B.y-38,10+B.t*.4,A.GLOW.purple,.8);}}
   else{if(B.flash>0&&(frames>>1)%2)g.globalAlpha=.6;A.drawDemon(g,B,simT);g.globalAlpha=1;}}
  // the scene's actors
  if(w.scene?.kind==='death'){const sc=w.scene,dx=sc.x+62,a=sc.t<16?0:sc.t<46?(sc.t-16)/30:sc.t>300?Math.max(0,1-(sc.t-300)/40):1;
   if(a>0)A.drawDeath(g,dx,p.y-26,simT,a,sc.t>200&&sc.t<240?Math.sin((sc.t-200)/40*Math.PI):0);
   if(sc.gear)for(const gr of sc.gear){const k=clamp((sc.t-226-gr.k*6)/40,0,1);if(k<=0||k>=1)continue;const gx=p.x+(dx-p.x)*k,gyy=p.y-30-Math.sin(k*Math.PI)*40-gr.k*6;A.glow(g,gx,gyy,10,A.GLOW.purple,1-k*.5);A.drawPickup(g,['alucard','cross','potion','holy'][gr.k],gx,gyy+6,simT);}}
  // ghost, after-images, hero
  let o=ghostAt(i);const o0=o&&gi>0?ghost[gi-1]:null;if(o0&&Math.abs(o.x-o0.x)<40)o={...o,x:o0.x+(o.x-o0.x)*ghostAl,y:o0.y+(o.y-o0.y)*ghostAl};if(o&&o.x>x0-30&&o.x<x1+30&&!o.dead){A.drawAfterimage(g,o,.9,'rgba(150,70,230,.55)');g.save();g.globalAlpha=.45;s.sprite(g,0,o.x+(o.facing||1)*.5,o.y-39+(o.pose==='crouch'||o.pose==='crouchAtk'?8:0),19,{exact:true});g.restore();}
  for(const a of w.ai){const u=a.life/(a.max||20);A.drawAfterimage(g,a.q,u*u*(a.k??.6));}
  if(!(p.inv>0&&!p.dead&&(frames>>2)%2)){const mood=p.finished?'win':p.hurt>0||p.dead?'sad':p.cast>0?'angry':undefined;
   if(p.charge>=CHARGE&&p.mp>=HELL_MP)A.glow(g,p.x,p.y-24,22+Math.sin(simT*20)*3,A.GLOW.fire,.6);
   A.glow(g,p.x,p.y-26,30,A.GLOW.moon,.12);A.drawHero(g,{...snap(p)},{head:headFn(i,mood),headSize:23});}
  drawSlash(p);
  for(const b of w.eshots)A.drawShot(g,b,simT);for(const b of w.shots)if(b.t>=0)A.drawShot(g,b,simT);
  drawParts(w);drawWater(x0,x1);
  // foreground fog outdoors and in the caverns
  const reg=regionAt(cam.x+cam.w/2).kind;if(reg==='forest'||reg==='gate'||reg==='cave'){g.globalAlpha=reg==='cave'?.5:.8;scen.tiled(g,'fog',cam.x-simT*6,1.15,x0,x1,reg==='cave'?170:158);g.globalAlpha=1;}
  drawNums(w);
  g.restore();
  // screen space: vignette, flashes, scene text, HUD
  g.drawImage(vignette(),lay.ox,lay.oy,lay.vw*lay.sc,lay.vh);
  if(w.flash>0){g.fillStyle=`rgba(${w.flashCol},${Math.min(.85,w.flash)})`;g.fillRect(lay.ox,lay.oy,lay.vw*lay.sc,lay.vh);}
  if(p.dead&&!p.pit&&p.dead>30){g.fillStyle=`rgba(90,0,0,${Math.min(.45,(p.dead-30)/80)})`;g.fillRect(lay.ox,lay.oy,lay.vw*lay.sc,lay.vh);}
  drawScene(w,p,lay);
  drawHUD(i);
 }
 // ---------------- HUD (SOTN-style status frame top-left, time top-right, boss bar, item/relic boxes, area names)
 const prog=q=>{if(q.finished)return 100;const w=worlds[q.i],B=w.boss;let b=0;if(B){b=B.phase===1?(1-B.hp/B.max)*4:4+(1-B.hp/B.max)*6;}if(w.orb)b=10;return Math.min(99,Math.round(clamp((q.best-L.start)/(L.end-L.start),0,1)*88+b));};
 const fmtRace=sec=>`${Math.floor(sec/60)}'${String(Math.floor(sec%60)).padStart(2,'0')}"${String(Math.floor(sec*100%100)).padStart(2,'0')}`;
 function gtext(str,x,y,size,col='#f2eee6',align='left',{italic=false,weight=700,base='top',stroke=true}={}){g.font=`${italic?'italic ':''}${weight} ${size}px ${GOTH}`;g.textAlign=align;g.textBaseline=base;if(stroke){g.lineJoin='round';g.lineWidth=Math.max(2,size*.18);g.strokeStyle='rgba(0,0,0,.85)';g.strokeText(str,x,y);}g.fillStyle=col;g.fillText(str,x,y);}
 function drawHUD(i){const p=pl[i],w=worlds[i],B=w.boss,X=lay.ox,Y=lay.oy,W=lay.vw*lay.sc,H=lay.vh,u=clamp(lay.sc,1.3,3.2);
  // status frame
  const ox=X+6*u,oy=Y+5*u,R=11*u;g.save();
  const fr=g.createLinearGradient(0,oy,0,oy+R*2.6);fr.addColorStop(0,'rgba(30,10,40,.8)');fr.addColorStop(1,'rgba(5,0,10,.8)');g.fillStyle=fr;g.beginPath();g.moveTo(ox+R,oy);g.lineTo(ox+R*7.6,oy);g.lineTo(ox+R*8.2,oy+R*.7);g.lineTo(ox+R*7.6,oy+R*1.4);g.lineTo(ox+R*2,oy+R*1.4);g.lineTo(ox+R*1.6,oy+R*2.4);g.lineTo(ox,oy+R*2.4);g.lineTo(ox,oy+R);g.closePath();g.fill();g.strokeStyle='#8a6a2a';g.lineWidth=Math.max(1,u*.5);g.stroke();
  // orb with the sub-weapon and the heart count
  const cx=ox+R,cy=oy+R;const og=g.createRadialGradient(cx-R*.3,cy-R*.3,R*.1,cx,cy,R);og.addColorStop(0,'#3a2050');og.addColorStop(1,'#0a0410');g.fillStyle=og;g.beginPath();g.arc(cx,cy,R,0,6.3);g.fill();g.strokeStyle='#c9a24a';g.lineWidth=Math.max(1.4,u*.8);g.stroke();
  if(p.sub){g.save();g.translate(cx,cy+R*.45);g.scale(u*.9,u*.9);A.drawPickup(g,p.sub,0,0,simT);g.restore();}
  g.save();g.translate(cx-R*.25,oy+R*2.2);g.scale(u*.7,u*.7);A.heartPath(g,0,0,7);g.fillStyle='#d8102a';g.fill();g.restore();gtext(String(p.hearts),cx+R*.05,oy+R*1.75,Math.round(7*u),'#ffd0d6');
  // HP number + bars
  const hx=ox+R*2.3;gtext('HP',hx,oy+R*.18,Math.round(5.5*u),'#c9a24a');gtext('LV'+p.lv,hx,oy+R*.82,Math.round(4.6*u),'#8ac8ff');gtext(String(Math.ceil(p.hp)),hx+R*1.15,oy-R*.02,Math.round(10*u),p.hp<30?'#ff6a6a':'#ffffff');
  const bx=hx+R*2.7,bw=R*4.4,bh=R*.34;g.fillStyle='#1a0006';g.fillRect(bx,oy+R*.32,bw,bh);g.fillStyle='#d01828';g.fillRect(bx,oy+R*.32,bw*p.hp/p.maxHp,bh);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(bx,oy+R*.32,bw*p.hp/p.maxHp,bh*.3);
  g.fillStyle='#00061a';g.fillRect(bx,oy+R*.82,bw*.8,bh*.7);g.fillStyle=p.charge>=CHARGE&&p.mp>=HELL_MP?'#ffb040':'#2a6aff';g.fillRect(bx,oy+R*.82,bw*.8*p.mp/MP_MAX,bh*.7);
  gtext(WEAPONS[p.weapon].name+(p.leap?' · Leap Stone':''),hx,oy+R*1.55,Math.round(5*u),'#bfb3d0','left',{italic:true});
  // time and area
  const ry=Y+Math.max(0,FB.top-Y);
  gtext(fmtRace(p.finished?p.finishT:clock),X+W-6*u,ry+5*u,Math.round(9*u),'#f2eee6','right');
  gtext(w.area||'',X+W-6*u,ry+16*u,Math.round(5.5*u),'#c9a24a','right',{italic:true});
  if(i===1){const q=pl[0];gtext(`Beat ${s.players[0].name}: ${q.finished?fmtRace(q.finishT):prog(q)+'%'}`,X+W-6*u,ry+24*u,Math.round(5.5*u),PCOL[0],'right');}
  // progress strip
  const roomBelow=s.H-(Y+H)>90,sw=Math.min(W*(roomBelow?.6:.3),200),sx=X+(W-sw)/2,sy=roomBelow?Y+H+8*u:Y+6*u;g.fillStyle='rgba(255,255,255,.15)';g.fillRect(sx,sy-1,sw,2);const gh=ghostAt(i),track=q=>clamp((q.best-L.start)/(L.end-L.start),0,1);
  for(const q of gh?[gh,p]:[p]){g.globalAlpha=q===p?1:.6;g.fillStyle=PCOL[q.i];g.beginPath();g.arc(sx+track(q)*sw,sy,q===p?3*u:2.2*u,0,6.3);g.fill();}g.globalAlpha=1;
  // boss bar
  if(B&&w.locked&&!w.scene&&B.state!=='gone'){const bw2=Math.min(W*.7,360),bx2=X+(W-bw2)/2,by2=Y+H-16*u;gtext(B.phase===1?'DRACULA':'DRACULA · TRUE FORM',bx2,by2-8*u,Math.round(6*u),'#ff6a6a','left',{italic:true});
   g.fillStyle='rgba(20,0,4,.85)';g.fillRect(bx2,by2,bw2,4*u);g.fillStyle='#b00018';g.fillRect(bx2,by2,bw2*B.hp/B.max,4*u);g.fillStyle='rgba(255,200,200,.35)';g.fillRect(bx2,by2,bw2*B.hp/B.max,1.2*u);g.strokeStyle='#8a6a2a';g.lineWidth=1;g.strokeRect(bx2,by2,bw2,4*u);}
  // item / relic box
  if(w.msg){const m=w.msg,a=m.t<10?m.t/10:m.t>130?Math.max(0,1-(m.t-130)/20):1;g.globalAlpha=a;
   if(m.kind==='relic'){const bw3=Math.min(W*.86,420),bh3=34*u*.8,bx3=X+(W-bw3)/2,by3=Y+H*.3;const gr=g.createLinearGradient(bx3,0,bx3+bw3,0);gr.addColorStop(0,'rgba(0,30,20,0)');gr.addColorStop(.2,'rgba(0,40,30,.9)');gr.addColorStop(.8,'rgba(0,40,30,.9)');gr.addColorStop(1,'rgba(0,30,20,0)');g.fillStyle=gr;g.fillRect(bx3,by3,bw3,bh3);
    gtext(m.text,X+W/2,by3+bh3*.12,Math.round(11*u),'#9affd0','center',{italic:true});gtext(m.sub,X+W/2,by3+bh3*.62,Math.round(6*u),'#e8fff4','center');}
   else{const fs=Math.round(7*u);g.font=`700 ${fs}px ${GOTH}`;const tw=Math.max(g.measureText(m.text).width,(g.font=`${Math.round(5*u)}px ${GOTH}`,g.measureText(m.sub).width))+fs*2,bh3=fs*2.6,bx3=X+(W-tw)/2,by3=Y+H-bh3-24*u;
    const gr=g.createLinearGradient(0,by3,0,by3+bh3);gr.addColorStop(0,m.kind==='lost'?'rgba(60,0,40,.92)':'rgba(16,24,80,.92)');gr.addColorStop(1,'rgba(2,4,20,.92)');g.fillStyle=gr;g.fillRect(bx3,by3,tw,bh3);g.strokeStyle='#c9a24a';g.lineWidth=1;g.strokeRect(bx3+1.5,by3+1.5,tw-3,bh3-3);
    gtext(m.text,X+W/2,by3+fs*.3,fs,m.kind==='lost'?'#ff9ad0':'#ffffff','center',{italic:true});gtext(m.sub,X+W/2,by3+fs*1.45,Math.round(5*u),'#c8c0e0','center',{stroke:false});}
   g.globalAlpha=1;}
  if(w.banner){const b=w.banner,a=b.t<20?b.t/20:b.t>110?Math.max(0,1-(b.t-110)/30):1;g.globalAlpha=a;const fs=Math.round((b.boss?13:10)*u);const yy=Y+H*(b.boss?.22:.18);
   g.fillStyle='rgba(0,0,0,.45)';g.fillRect(X,yy-fs*.2,W,fs*1.5);gtext(b.text,X+W/2,yy,fs,b.boss?'#ff3a4a':'#e8dcc0','center',{italic:true});g.globalAlpha=1;}
  if(w.levelT){w.levelT++;const a=w.levelT<10?w.levelT/10:Math.max(0,1-(w.levelT-70)/30);g.globalAlpha=a;gtext('LEVEL UP',X+W/2,Y+H*.27,Math.round(12*u),'#8ac8ff','center',{italic:true});g.globalAlpha=1;if(w.levelT>100)w.levelT=0;}
  if(p.dead&&p.dead>40)gtext(p.pit?'Swallowed by the dark water':'You have fallen',X+W/2,Y+H*.42,Math.round(12*u),'#d01828','center',{italic:true});
  if(p.finished&&phase==='play')gtext('Dracula is destroyed',X+W/2,Y+H*.36,Math.round(12*u),'#ff3a4a','center',{italic:true});
  // touch guides
  if(touchUI||clock<6&&phase==='play'){const a=touchUI?1:clamp(1-clock/6,0,1),below=s.H-(Y+H)>90,gy=below?Math.min(s.H-Math.min(s.H*.12,54),Math.max(Y+H+64,s.H*.8)):Y+H-26*u,rr=Math.min(s.W*.09,44,s.H*.09);
   g.save();g.lineWidth=2;g.strokeStyle='#fff';
   for(const [x,label,on] of [[s.W*.675,'SLASH',pads.atk],[s.W*.895,'JUMP',pads.jump]]){g.globalAlpha=(on?.35:.13)*a;g.fillStyle='#c9a24a';g.beginPath();g.arc(x,gy,rr,0,6.3);g.fill();g.globalAlpha=.6*a;gtext(label,x,gy,Math.round(rr*.32),'#fff','center',{base:'middle'});}
   if(below||touchUI){g.globalAlpha=.38*a;gtext('↑ sub-weapon · ↔ backdash · hold: Hellfire',s.W*.675,gy+rr+6,Math.round(Math.max(9,rr*.2)),'#d8d0e8','center');}
   const st=pads.stick;if(st){g.globalAlpha=.25;g.beginPath();g.arc(st.sx,st.sy,40,0,6.3);g.stroke();g.globalAlpha=.4;g.fillStyle='#fff';g.beginPath();g.arc(clamp(st.x,st.sx-44,st.sx+44),clamp(st.y,st.sy-44,st.sy+44),16,0,6.3);g.fill();}
   else{g.globalAlpha=.13*a;g.beginPath();g.arc(s.W*.2,gy,rr,0,6.3);g.stroke();g.globalAlpha=.55*a;gtext('◀ WALK ▶',s.W*.2,gy,Math.round(rr*.28),'#fff','center',{base:'middle'});}
   g.restore();}
  g.restore();}
 function drawTitle(t){const W=s.W,H=s.H,a=t>2.7?Math.max(0,1-(t-2.7)/.5):Math.min(1,t/.4);g.save();g.globalAlpha=a;g.fillStyle='#000';g.fillRect(0,0,W,H);
  const m=Math.min(W,H);const gr=g.createRadialGradient(W*.72,H*.24,0,W*.72,H*.24,m*.32);gr.addColorStop(0,'rgba(220,30,40,.9)');gr.addColorStop(.25,'rgba(150,0,20,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.fillStyle='#e8d8c8';g.beginPath();g.arc(W*.72,H*.24,m*.08,0,6.3);g.fill();g.fillStyle='rgba(160,0,20,.5)';g.beginPath();g.arc(W*.72,H*.24,m*.08,0,6.3);g.fill();
  if(scen.L.castle){g.save();const k=Math.min(W/360,H/VH)*.9;g.translate(W*.5-180*k,H*.62-VH*k);g.scale(k,k);g.drawImage(scen.L.castle,0,0,360,VH);g.restore();}
  g.fillStyle='#000';g.fillRect(0,H*.62,W,H*.38);
  for(let k=0;k<7;k++){const bx=W*(.1+k*.13)+Math.sin(t*2.6+k)*14,by=H*(.12+(k%3)*.06),fl=Math.sin(t*14+k)*m*.012;g.fillStyle='#08040c';g.beginPath();g.moveTo(bx,by);g.lineTo(bx-m*.03,by-m*.01+fl);g.lineTo(bx-m*.018,by+m*.006);g.lineTo(bx,by+m*.004);g.lineTo(bx+m*.018,by+m*.006);g.lineTo(bx+m*.03,by-m*.01+fl);g.closePath();g.fill();}
  const fs=Math.min(W*.1,H*.11,70);g.font=`italic 900 ${fs}px ${GOTH}`;g.textAlign='center';g.textBaseline='middle';const tg=g.createLinearGradient(0,H*.66-fs/2,0,H*.66+fs/2);tg.addColorStop(0,'#ff5a4a');tg.addColorStop(.5,'#a00010');tg.addColorStop(1,'#3a0006');
  g.lineWidth=fs*.08;g.strokeStyle='#c9a24a';g.strokeText('Castlevania',W/2,H*.68);g.fillStyle=tg;g.fillText('Castlevania',W/2,H*.68);
  g.font=`700 ${fs*.3}px ${GOTH}`;g.fillStyle='#e8dcc0';g.fillText('S Y M P H O N Y   O F   T H E   N I G H T',W/2,H*.68+fs*.72);
  for(let i=0;i<2;i++){const cx=W/2+(i?1:-1)*Math.min(W*.3,200),cy=H*.84;s.sprite(g,i,cx,cy,fs*1.05,{exact:true});g.font=`italic 700 ${fs*.24}px ${GOTH}`;g.fillStyle=PCOL[i];g.fillText(s.players[i].name,cx,cy+fs*.75);}
  g.font=`italic ${fs*.22}px ${GOTH}`;g.fillStyle='#a89ab8';g.fillText('Fastest to destroy Dracula wins',W/2,H*.94);
  g.restore();}

 const teleport=(i,X)=>{const q=pl[i],w=worlds[i];let x=X;while(x<LEN-30&&terrain(x)>=NONE)x+=4;Object.assign(q,{x,y:support(w,x,5,-50,true),vx:0,vy:0,grounded:true,dead:0,pit:false,hurt:0,atk:null,dash:0});q.best=Math.max(q.best,q.x);cams[i].x=clamp(q.x-cams[i].w*.4,0,LEN-cams[i].w);};
 s.debug={art:A,audio:SA,head:headFn,set bot(f){bot=f;},get phase(){return phase;},get clock(){return clock;},get turn(){return turn;},ghost,pl,L,worlds,cams,inputs,setClock(v){clock=v;},teleport,
  toBoss(i){teleport(i,AR.lockX+12);},skipScene(i){const w=worlds[i],sc=w.scene;if(!sc)return;w.scene=null;if(sc.kind==='death')pl[i].weapon='fist';else if(w.boss){w.boss.state='idle';w.boss.t=0;w.boss.vis=1;}},
  hurtBoss(i,n){const w=worlds[i],B=w.boss;if(B&&B.hp>0)damageBoss(pl[i],w,B,n,{});},get stop(){return stop;}};

 // ---------------- turns
 const score=q=>q.finished?fmtRace(q.finishT):`${prog(q)}% of the way`;
 async function beginTurn(i){phase='handoff';turn=i;pads.stick=null;pads.jump=null;pads.atk=null;clearKeys();for(const inp of inputs)Object.assign(inp,{l:0,r:0,u:0,d:0,jump:0,press:0,atk:0,atkHeld:0,sub:0,dash:0});
  const n0=s.players[0].name,desc=i===0?`You go first: storm Dracula's castle and destroy him as fast as you can. ${s.players[1].name} plays next against your ghost.`
   :`Beat ${n0}'s ${pl[0].finished?'time of '+fmtRace(pl[0].finishT):'run'}. ${n0}'s violet after-image runs beside you.`;
  if(!await s.pass(i,desc,'Ready — start my countdown',{summary:i?`${n0}: ${score(pl[0])}. ${s.players[1].name}, take the controls.`:null}))return;
  clock=0;acc=0;gi=0;cd=new Countdown(3);phase='count';cams[i].x=0;worlds[i].area='';ambience('wind');music('stage');}
 const turnOver=p=>p.finished&&clock-p.finishT>3||clock>=RACE_CAP||turn===1&&pl[0].finished&&!p.finished&&clock>pl[0].finishT+5;
 const still={l:0,r:0,u:0,d:0,jump:0,press:0,atk:0,atkHeld:0,sub:0,dash:0};
 const AMB={forest:'wind',gate:'wind',hall:'hall',gallery:'hall',cave:'cave',throne:'throne'};
 s.frame((dt,t)=>{
  if(!s.alive)return;tick();
  if(phase==='title'){if(!titleT){sfx.bell();setTimeout(()=>s.alive&&sfx.thunder(true),900);}titleT+=dt;if(titleT>3.2)beginTurn(0);}
  else if(phase==='count'){layout();cams[turn].w=lay.vw;updateCamera(pl[turn],turn);savePrev(turn);if(!cd.update(dt)){phase='play';for(const inp of inputs){inp.press=0;inp.atk=0;inp.sub=0;inp.dash=0;}}}
  else if(phase==='play'||phase==='turn-end'||phase==='end'){
   if(!cd.done)cd.update(dt);acc+=dt;let steps=0;const i=turn,p=pl[i],w=worlds[i];
   while(acc>=STEP&&steps<5){acc-=STEP;steps++;savePrev(i);
    if(stop>0){stop--;continue;}
    frames++;simT+=STEP;
    if(phase==='play'){if(!w.scene)clock+=STEP;readInput(i);stepPlayer(p,w,inputs[i]);stepWorld(w,p);}
    else{stepPlayer(p,w,still);stepWorld(w,p);}
    updateCamera(p,i);
    if(w.msg&&++w.msg.t>150)w.msg=null;if(w.banner&&++w.banner.t>140)w.banner=null;w.flash=Math.max(0,w.flash-.04);w.shake=Math.max(0,w.shake-.35);
    if(turn===0&&phase!=='end')ghost.push(snap(p));else if(turn===1)gi++;}
   if(steps===5)acc=0;
   if(phase==='play'){ambience(AMB[regionAt(p.x).kind]||'hall');
    if(turnOver(p)){endT=0;
     if(turn===0){phase='turn-end';turnText=p.finished?fmtRace(p.finishT):`${prog(p)}% OF THE WAY`;}
     else{phase='end';const a=pl[0],b=pl[1];
      if(a.finished&&b.finished)winner=Math.abs(a.finishT-b.finishT)<.01?-2:a.finishT<b.finishT?0:1;
      else if(a.finished||b.finished)winner=a.finished?0:1;else{const pa=prog(a),pb=prog(b);winner=pa===pb?-2:pa>pb?0:1;}
      endText=winner===-2?'A draw in the dark':pl[winner].finished?`${s.players[winner].name} destroyed Dracula`:`${s.players[winner].name} got further`;
      if(winner>=0)s.react(winner,'win');sfx.bell();}}}
   else if(phase==='turn-end'){endT+=dt;if(endT>2.6)beginTurn(1);}
   else{endT+=dt;if(endT>3.6){const sc=[prog(pl[0]),prog(pl[1])];if(winner>=0){sc[winner]=100;sc[1-winner]=Math.min(sc[1-winner],99);}
    s.finish(sc,`Symphony of the Night: ${s.players[0].name} ${score(pl[0])}, ${s.players[1].name} ${score(pl[1])}.`);return;}}
   s.setScores(pl.map(prog));}
  // draw
  g.fillStyle='#000';g.fillRect(0,0,s.W,s.H);
  if(phase!=='title'){const lerp=phase==='play'||phase==='turn-end'||phase==='end';if(lerp)interp(turn,clamp(acc/STEP,0,1));drawWorld(turn);if(lerp)uninterp();}else{layout();scen.ensure(g,lay.sc);}
  if(phase==='title')drawTitle(titleT);
  if(phase==='count'||!cd.done&&phase==='play')cd.draw(g,s.W,s.H);
  if(phase==='turn-end'||phase==='end'){const a=Math.min(1,endT*2.5),size=Math.min(s.W*.07,s.H*.07,46);g.save();g.globalAlpha=a;g.fillStyle='rgba(0,0,0,.65)';g.fillRect(0,s.H*.38,s.W,s.H*.24);
   if(phase==='turn-end'){gtext(pl[0].finished?'Dracula is destroyed':'The night is over',s.W/2,s.H/2-size*.9,size,'#ff3a4a','center',{italic:true});gtext(`${s.players[0].name}: ${turnText}`,s.W/2,s.H/2+size*.3,Math.round(size*.55),'#f2eee6','center');}
   else{gtext(endText,s.W/2,s.H/2-size*.9,size,'#ff3a4a','center',{italic:true});const sub=pl.map(q=>q.finished?fmtRace(q.finishT):`${prog(q)}%`).join('  ·  ');gtext(sub,s.W/2,s.H/2+size*.3,Math.round(size*.55),'#f2eee6','center');}
   g.restore();}
 });
}
Object.assign(exports,{sotn,buildCastle});
