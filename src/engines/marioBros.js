// Super Mario Bros. (NES) · World 1. Two players share the phone; the runner is Mario's body (P2 is Luigi in his NES
// colours) wearing the player's head under the cap. The four stages are the NES World 1 maps (smb/smbLevels.js):
// 1-1 with its coin room, 1-2 underground with the Warp Zone above the ceiling, 1-3 in the treetops and Bowser's
// castle 1-4. Movement is the NES SMB1 physics at a fixed 60 Hz step (sub-pixel speeds from the original: walk/run
// acceleration, skid, release, speed-dependent jump gravity, air control set by the take-off speed, 4.5 px fall cap).
// Game ids / modes (s.game.marioMode):
//  'world' (smb-world-1) the full game: title menu, 3 lives, 400/300 timers, flagpoles, castles, Bowser and Toad.
//          1 PLAYER GAME = each player plays a whole game in turn (P2 sees P1's ghost); 2 PLAYER GAME = the NES
//          hand-off: Mario and Luigi swap every time one loses a life. Highest score wins.
//  'coins' (smb-coin-rush) 60 seconds each through World 1 (the flagpole leads on to the next stage), most coins wins.
//  'race'  (smb-castle-dash) time trial through 1-1 to the flagpole.
// Taking a Warp Zone pipe in 1-2 recruits a character the player has not unlocked yet (session.gameRecruits), then
// the run continues in 1-3. The game takes the whole screen; Pause/Exit/full screen float in the corner.
// Online (s.online) both phones play AT ONCE in one shared World 1, each following its own runner (P1 Mario, P2 Luigi),
// the partner drawn from snapshots with an edge arrow when off screen. One world per stage (`stageWorld`) is kept on both
// phones and changed by events: coins {cn}, tiles {tl}, block items {it} and pick-ups {ig}, enemy states {es}, Bowser {bd}/{ax}.
// World 1 is co-op: a lost life brings you back next to your partner in a bubble; out of lives you watch them and come
// back with 1 life on the next stage; the game ends when both are out or through 1-4. Reaching the flag (or the axe, or
// the Warp Zone) {gl} gives the partner 10 s, then they are pulled along; both start the next stage together {sc}. Highest
// score wins. Coin Rush = both in the same 60 s (coins taken vanish for both); Castle Dash = live race to the 1-1 flag.
const {clamp}=require("src/utils.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,PCOL,settle}=require("src/engines/arenaKit.js");
const {netField}=require("src/engines/netField.js");
const {partnerArrow}=require("src/engines/partnerArrow.js");
const {T,ROWS,TILE,SOLID,BACK,buildStage,STAGE_COUNT}=require("src/engines/smb/smbLevels.js");
const A_=require("src/engines/smb/smbArt.js");
const SA=require("src/engines/smbAudio.js");
const {C,nesText,textW}=A_;

const STEP=1/60,LIVES=3,COIN_TIME=60,RACE_CAP=150,NET_GRACE=10,BUBBLE=120;
// NES SMB1 movement in px/frame (sub-pixel values from the original game)
const PH={minWalk:.07421875,walkAcc:.037109375,runAcc:.0556640625,rel:.05078125,skid:.1015625,walk:1.5625,run:2.5625,skidTurn:.5625,backFast:1.8125,maxFall:4.5,fallReset:4};
const JUMP=[[1,-4,.125,.4375],[2.3125,-4,.1171875,.375],[Infinity,-5,.15625,.5625]];
const MEGA_T=600,FINALE_T=960;
const COMBO=[100,200,400,500,800,1000,2000,4000,5000,8000],SHELL_CHAIN=[500,800,1000,2000,4000,5000,8000];
const HF=require("src/headFacts.js");
const FACE_W=15;const HEAD_K=.72,HEAD_K_SMALL=.7;
// NES heights (owner, Nov 21: 'same view, Mario to NES size'): cap to boots, big Mario = 2 blocks, small Mario = 1 block
const NES_H_BIG=32,NES_H_SMALL=23;   // face width (brow to chin box) on big Mario, world px
const PALS=[{cap:C.red,shirt:C.brown,over:C.red,shoe:C.brown},{cap:C.green,shirt:C.green,over:C.white,shoe:C.green}];
const FIRE_PAL={cap:C.white,shirt:C.red,over:C.white,shoe:C.red},EVIL_PAL={cap:'#1c1c1c',shirt:'#5c0818',over:'#1c1c1c',shoe:'#3c0408'};
const STAR_PALS=[FIRE_PAL,{cap:'#000',shirt:C.brick,over:'#000',shoe:C.brick},{cap:C.green,shirt:C.white,over:C.green,shoe:C.brown},{cap:C.red,shirt:C.brown,over:C.red,shoe:C.brown}];
const solid=t=>SOLID[t]===1;
const isLava=t=>t===TILE.LAVA_TOP||t===TILE.LAVA;

const SWIM=t=>t==='cheep'||t==='cheepRed'||t==='blooper'||t==='ghost';
// Worlds 3-6 enemies (our own designs): walking speed, starting state, hit points for fireballs, body height
const FOES={slasher:{vx:-.3,hp:3,h:26},dreamer:{vx:-.4,h:26},imp:{vx:0,h:12},climber:{vx:-.45,h:18},penguin:{vx:-.9,h:12},icicle:{vx:0,state:'hang',h:14},
 dice:{vx:0,h:14},chip:{vx:-1.1,h:12},card:{vx:-.6,state:'fly',h:12},cactus:{vx:0,state:'still',h:22},raptor:{vx:-.5,h:18},dilo:{vx:0,state:'still',h:20},trex:{vx:-.3,hp:6,h:32},ptero:{vx:-.7,state:'fly',h:12},
 brute:{vx:-.5,hp:2,h:20},skull:{vx:0,state:'fly',h:12},floater:{vx:0,state:'fly',hp:2,h:20},angel:{vx:-.5,state:'fly',hp:2,h:20},cherub:{vx:0,state:'fly',h:18},
 // 5-1: the cloud rider follows you along the sky, throwing spiky shells that hatch into walkers you can't stomp
 rider:{vx:0,state:'fly',h:18},spiny:{vx:-.5,h:12},
 // the real game's later pieces: Bullet Bills out of cannons, Hammer Bros, lava bubbles, fish leaping over bridges
 bullet:{vx:0,state:'fly',h:14},hammerBro:{vx:0,h:24},podoboo:{vx:0,state:'wait',h:14},leaper:{vx:0,state:'fly',h:12}};
// these hurt to touch and can't be stomped (the trex just bounces you off)
const NO_STOMP=t=>SWIM(t)||t==='cactus'||t==='icicle'||t==='spiny'||t==='podoboo';
// fireballs bounce off these (they still burn up)
const FIREPROOF=new Set(['bullet','podoboo','buzzy','ghost']);
const eHeight=e=>FOES[e.type]?.h??(e.type==='goomba'||e.type==='buzzy'||e.state!=='walk'?14:22);
function spawnFoe(e,k=1){const f=FOES[e.type];if(f)return {...e,vx:f.vx*k,vy:0,alive:!e.pool,active:false,state:f.state||'walk',hp:f.hp||1,t:0,off:0,grace:0,home:e.y,frame:0,ph:0};const piranha=e.type==='piranha',para=e.type==='paraRed',sw=SWIM(e.type);return {...e,vx:piranha||para||e.type==='blooper'||e.type==='ghost'?0:e.type==='cheepRed'?-.6:e.type==='cheep'?-.35:-.5,vy:0,alive:true,active:false,state:piranha?'hidden':sw?'swim':'walk',t:0,off:0,grace:0,home:e.y,frame:0,ph:0};}
function makeWorld(st){
 const areas={};let ai=0,wn=parseInt(st.name)||1,sn=parseInt(String(st.name).split('-')[1])||1,k=1+.07*(wn-1)+.0175*(sn-1);
 for(const [name,A] of Object.entries(st.areas))areas[name]={name,def:A,ai:ai++,tiles:A.tiles.slice(),content:new Map(A.content),got:new Uint8Array(A.coins.length),enemies:A.enemies.map(e=>spawnFoe(e,k)),fbK:1+.09*(wn-1),
  lifts:A.lifts.map(l=>({...l,dx:0,dy:0})),vines:(A.vines||[]).map(v=>({...v})),k,bowser:A.bowser?{...A.bowser,vx:0,vy:0,dir:-1,hp:A.bowser.god?14:5+(wn-1),k:1+.12*(wn-1),state:'idle',t:0,fireT:150,jumpT:100,mouth:0,goal:A.bowser.x}:null,fbT:0};
 return {st,areas,items:[],fire:[],bubbles:[],yoshiRun:[],debris:[],bumps:new Map(),pops:[],multi:new Map(),fx:new Fx(),flagPos:0,castleFlag:0,flames:[],fireworks:[],bridge:null};
}
function makePlayer(i){return {i,stage:0,area:'main',x:40,y:13*T,prevY:13*T,vx:0,vy:0,grounded:true,facing:1,big:false,fire:false,star:0,inv:0,coins:0,score:0,lives:LIVES,time:400,timeAcc:0,
 dead:0,deadKind:'',pipe:null,flag:null,tf:null,crouch:false,jumping:false,gHold:.125,gFall:.4375,jumpSpd:0,runT:0,anim:0,skidding:false,combo:0,ride:null,best:0,progress:0,
 finished:false,finishT:0,lap:0,deaths:0,inCastle:false,castleT:0,auto:false,checkOn:false,over:false,done:false,warped:false,flagged:false,axe:null,stagesCleared:0,fireworksDue:0,tally:null,idle:0,bubble:0,out:false};}

async function marioBros(s){
 const mode=['race','world'].includes(s.game.marioMode)?s.game.marioMode:'coins';
 const net=s.online||null,me=net?net.me:0,them=1-me;
 const [c,g]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.updateScores();
 fullBleed(s);
 if(!await settle(s))return;
 SA.open(s);s.cleanup(()=>SA.stopAll());
 const STAGES=[...Array(STAGE_COUNT)].map((_,k)=>buildStage(k));
 const lastStage=mode==='race'?0:STAGE_COUNT-1;
 const tiles=A_.tileSets();
 const pl=[makePlayer(0),makePlayer(1)],worlds=[null,null],cams=[{x:0},{x:0}];
 const touchUI=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
 const inputs=[0,1].map(()=>({l:0,r:0,d:0,jump:0,b:0,press:0,bPress:0}));
 const pads=[{stick:null,jump:null},{stick:null,jump:null}];
 const view={sc:1,w:256,h:240,band:0,fx:0};
 let phase='title',titleT=0,menuSel=0,twoPlayer=false,cardT=0,cardKind='world',warpMsg=null,clock=0,acc=0,endT=0,winner=-1,simT=0,frames=0,turn=net?me:0,gi=0,turnText='',endText='',top=0;
 // online: one world per stage (and Coin Rush lap), kept for the whole game and changed by both phones' events
 const sharedWorlds=new Map(),wkey=(stage,lap)=>stage*16+(mode==='coins'?Math.min(15,lap|0):0);
 const stageWorld=(stage,lap)=>{const k=wkey(stage,lap);let w=sharedWorlds.get(k);if(!w){w=makeWorld(STAGES[stage]);w.key=k;sharedWorlds.set(k,w);}return w;};
 const flash=[0,0];
 // P1's run is recorded every play step and replayed as a ghost during P2's turn (not in the NES hand-off mode)
 const ghost=[],ghostAt=i=>i===1&&!twoPlayer&&gi<ghost.length?ghost[gi]:null;
 const snap=p=>({climb:!!p.climb,yoshi:p.yoshi,tongue:p.tongue,swim:p.swim,strokeT:p.strokeT,mega:p.mega,megaIn:p.megaIn,cape:p.cape,skis:p.skis,spin:p.spin,spinA:p.spinA,flyT:p.flyT,i:p.i,stage:p.stage,area:p.area,x:p.x,y:p.y,big:p.big,fire:p.fire,star:p.star,inv:0,facing:p.facing,crouch:p.crouch,dead:p.dead,vx:p.vx,grounded:p.grounded,skidding:p.skidding,anim:p.anim,
  finished:p.finished,inCastle:p.inCastle,flag:!!p.flag,pipe:p.pipe&&{kind:p.pipe.kind},tf:p.tf&&{...p.tf}});
 // warp-zone recruits: characters each player has not unlocked yet
 const {store}=require('src/state.js');
 // world select (owner, Nov 21): you may start from any world whose Bowser you have beaten at its axe (warping past a
 // world doesn't count); World 1 is always there. Not online (both phones start in World 1).
 const beatenWorlds=()=>{const b=store.profile?.smbBowsers;return Array.isArray(b)?b:[];};
 // worlds you can start from on the title: World 1 + every world you walked into by beating the Bowser before it (a world
 // reached through a warp pipe doesn't count until you beat the castle before it)
 const startList=()=>[...new Set([1,...beatenWorlds().map(n=>n+1)])].filter(n=>n>=1&&(n-1)*4<=lastStage).sort((a,b)=>a-b);
 let startW=1;const worldPick=()=>mode==='world'&&!net&&!boardCoop&&startList().length>1;
 // BOARD CO-OP (owner, Nov 21): on the board (one phone) the two of you share one run, one life each: whoever dies hands
 // the phone over and the other carries on from the same spot. It starts in the furthest world this board game has
 // reached (run.smbWorld, saved with the run) and ends when you have both died. Highest score wins.
 const boardCoop=mode==='world'&&s.origin==='board'&&!net&&!s.solo;
 const coopWorld=()=>clamp(parseInt(store.run?.smbWorld)||1,1,Math.floor(lastStage/4)+1);
 const noteWorld=p=>{if(!boardCoop||!store.run)return;const wn=parseInt(STAGES[p.stage]?.name)||1;if(!(store.run.smbWorld>=wn))store.run.smbWorld=wn;};
 const cycleWorld=d=>{const L=startList();const k=L.indexOf(startW);startW=L[(k<0?0:k+d+L.length)%L.length];sfx.bump();};
 function noteBowser(p){if(mode!=='world')return;const wn=parseInt(STAGES[p.stage]?.name)||0,pr=store.profile;if(!wn||!pr)return;const b=Array.isArray(pr.smbBowsers)?pr.smbBowsers:[];
  if(b.includes(wn))return;pr.smbBowsers=[...b,wn].sort((x,y)=>x-y);try{require('src/profile.js').saveProfile(pr);}catch{}note(p,'bowser beaten '+wn);}
 const recruitPools=s.players.map(p=>{try{return require('src/rewards.js').gameRecruitPool(s.game,store.profile,p).map(ch=>ch.id);}catch{return [];}});
 s.gameRecruits=[[],[]];
 const charName=id=>{try{return require('src/characters.js').CHARACTERS.find(ch=>ch.id===id)?.name||id;}catch{return id;}};
 const portraitCache=new Map(),portraitImg=id=>{if(portraitCache.has(id))return portraitCache.get(id);const im=new Image();try{const u=require('src/assets.js').portraitURL(id,'happy')||require('src/assets.js').portraitURL(id,'normal');if(u)im.src=u;}catch{}portraitCache.set(id,im);return im;};

 const kb=arenaKeys(s);
 kb.onDown((i,k)=>{
  if(phase==='title'){if(k==='u')menuSel=0;else if(k==='d')menuSel=1;else if((k==='l'||k==='r')&&worldPick())cycleWorld(k==='r'?1:-1);else if(k==='fire'||k==='r')startFromTitle();return;}
  if(phase==='warp'){if(warpMsg&&warpMsg.t>90&&(k==='fire'||k==='u'))warpMsg.t=9999;return;}
  if(k==='u')inputs[turn].press=1;if(k==='fire')inputs[turn].bPress=1;});
 const HELP='Touch: drag on the left side to walk, drag further to run, drag down to duck or go down a pipe, tap there to throw fireballs. Tap the right side to jump; hold it to jump higher. Keys: A/D/S or arrows, W/Up jump, Space or Enter run/fire.';
 s.hint(mode==='world'?`SUPER MARIO BROS. WORLDS 1-8: eight worlds from 1-1 to Heaven. New Dork City (2-2 is underwater: tap jump to swim), the Haunted Boardwalk (ghosts creep up behind your back; 3-2's mirrors swap left and right), Frostbite Peaks (skis: fast on ice, hit the ramps), Lost Wages (the Elvis cape: run full speed and jump to fly, hold jump to glide), the Jurassic Jungle (the mega mushroom smashes everything), Hell (Yoshi! B = tongue, hold jump to flutter) and Heaven (every power-up; God waits in 8-4), three lives each, highest score wins. 1 PLAYER GAME: each of you plays a whole game in turn (P2 races P1's ghost). 2 PLAYER GAME: like the NES, Mario and Luigi swap whenever one loses a life. Find the Warp Zone in 1-2 (run along the ceiling past the exit pipe) and someone new joins your team. Some pipes lead down to bonus rooms (try them); hit the right block and a beanstalk grows up to a cloud area full of coins (hold jump to climb). Beat a world's Bowser and the title screen lets you start from that world (tap WORLD, or left/right). ${HELP}`
  :mode==='coins'?`COIN RUSH: grab the most coins in 60 seconds, starting in World 1-1; the flagpole takes you on to the next stage. Find the coin room under the fourth pipe in 1-1 and the Warp Zone in 1-2. Players take turns; P2 sees P1's ghost. ${HELP}`
  :`CASTLE DASH: fastest through World 1-1 to the flagpole wins. Falling in a pit sends you back to the last checkpoint. Players take turns; P2 races P1's ghost. ${HELP}`);

 // ---------------- touch: the whole screen belongs to whoever's turn it is
 const toView=f=>({x:f.x/view.sc,y:f.y/view.sc-view.band});
 arenaTouch(s,{owner:()=>turn,maxFingers:3,
  onDown:f=>{
   if(phase==='title'){f.data.role='menu';const v=toView(f);if(worldPick()&&v.x>view.fx+60&&v.x<view.fx+210&&v.y>=170&&v.y<190){cycleWorld(1);return;}
    if(mode==='world'&&v.x>view.fx+60&&v.x<view.fx+210&&v.y>136&&v.y<170){menuSel=v.y<156?0:1;}startFromTitle();return;}
   if(phase==='warp'){f.data.role='menu';if(warpMsg&&warpMsg.t>90)warpMsg.t=9999;return;}
   const pd=pads[f.owner];if(f.x>s.W*.56){f.data.role='jump';pd.jump=f;inputs[f.owner].press=1;}else{f.data.role='stick';pd.stick=f;}},
  onMove:f=>{if(f.data.role!=='stick')return;const dx=f.x-f.sx,dy=f.y-f.sy,lim=60;if(Math.hypot(dx,dy)>lim){const k=lim/Math.hypot(dx,dy);f.sx=f.x-dx*k;f.sy=f.y-dy*k;}
   const v=f.samples.length>1?(f.y-f.samples[0].y)/Math.max(.016,(performance.now()-f.samples[0].t)/1000):0;if(v<-700&&!f.data.flick&&dy<-18){f.data.flick=true;inputs[f.owner].press=1;}if(dy>-6)f.data.flick=false;},
  onUp:f=>{const pd=pads[f.owner];if(pd.jump===f)pd.jump=null;if(pd.stick===f){pd.stick=null;if(f.moved<10&&f.held<220)inputs[f.owner].bPress=1;}}});
 const readInput=i=>{const [k0,k1]=kb.state,st=pads[i].stick,inp=inputs[i];let l=k0.l||k1.l,r=k0.r||k1.r,d=k0.d||k1.d,jump=k0.u||k1.u,b=k0.fire||k1.fire;
  if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(dx>10)r=1;if(dx<-10)l=1;if(Math.abs(dx)>34)b=1;if(dy>20&&Math.abs(dx)<dy)d=1;if(st.data.flick)jump=1;}
  if(pads[i].jump)jump=1;inp.l=l;inp.r=r;inp.d=d;inp.jump=jump;inp.b=b;if(bot&&i===me)botInput(inp);};

 // ---------------- sounds: the owner's NES rips (smbAudio.js), or these synth stand-ins until a file is in
 const synth={
  jump:big=>snd(big?240:320,.16,{type:'square',vol:.03,to:big?620:860}),
  coin:()=>{snd(988,.05,{type:'square',vol:.025});snd(1319,.2,{type:'square',vol:.022,delay:.05});},
  stomp:()=>snd(520,.09,{type:'square',vol:.035,to:160}),
  bump:()=>snd(140,.08,{type:'triangle',vol:.06,to:90}),
  brk:()=>{noise(.18,{vol:.07,freq:1200});snd(200,.12,{type:'square',vol:.03,to:60});},
  sprout:()=>snd(300,.35,{type:'square',vol:.03,to:900}),
  power:()=>jingle([392,523,659,784,1047,1319],{step:.05,type:'square',vol:.03,dur:.07}),
  oneup:()=>jingle([659,784,1319,1047,1175,1568],{step:.08,type:'square',vol:.03,dur:.08}),
  shrink:()=>jingle([880,659,523,392,330],{step:.06,type:'square',vol:.03,dur:.07}),
  fire:()=>snd(1400,.06,{type:'square',vol:.025,to:500}),
  kick:()=>{snd(700,.05,{type:'square',vol:.035});noise(.05,{vol:.04,freq:2400});},
  pipe:()=>jingle([300,220,300,220,300,220],{step:.07,type:'square',vol:.025,dur:.05}),
  die:()=>jingle([494,698,698,698,659,587,523],{step:.13,type:'square',vol:.03,dur:.1}),
  flag:()=>snd(1800,1.1,{type:'square',vol:.025,to:240}),
  clear:()=>jingle([523,659,784,1047,784,1047,1319],{step:.09,type:'square',vol:.035,dur:.12}),
  tick:()=>snd(1760,.03,{type:'square',vol:.015}),
  boom:()=>noise(.35,{vol:.08,freq:600}),
  bowserFire:()=>noise(.4,{vol:.05,freq:900}),
  bridge:()=>snd(160,.05,{type:'square',vol:.03,to:80}),
  bowserFall:()=>jingle([392,330,262,196,131],{step:.12,type:'triangle',vol:.05,dur:.14}),
  hurry:()=>jingle([1047,1319,1047,1319,1047,1319],{step:.06,type:'square',vol:.03,dur:.05}),
  over:()=>jingle([523,392,330,440,494,440,415,466,415,392],{step:.16,type:'triangle',vol:.05,dur:.18}),
  warp:()=>jingle([523,659,784,1047,1319,1568,2093],{step:.07,type:'square',vol:.03,dur:.09}),
  star:()=>jingle([1047,1319,1568,2093],{step:.04,type:'triangle',vol:.03})
 };
 const NES={jump:big=>SA.play(big?'jump':'jumpsmall'),coin:()=>SA.play('coin'),stomp:()=>SA.play('stompswim'),bump:()=>SA.play('bump'),brk:()=>SA.play('brick'),sprout:()=>SA.play('item'),
  power:()=>SA.play('powerup'),oneup:()=>SA.play('1up'),shrink:()=>SA.play('pipepowerdown'),fire:()=>SA.play('fireball'),kick:()=>SA.play('kickkill'),pipe:()=>SA.play('pipepowerdown'),
  die:()=>{SA.hush();return SA.play('death');},flag:()=>SA.play('flagpole'),clear:()=>SA.jingle('clear'),tick:()=>SA.play('beep'),boom:()=>SA.play('billfirework'),bowserFire:()=>SA.play('fire'),
  // the real bridge: the fireworks sound and the brick sound together
  bridge:()=>{const a=SA.play('billfirework');return SA.play('brick')||a;},bowserFall:()=>SA.play('bowserfall'),hurry:()=>SA.hurry(),over:()=>{SA.hush();return SA.play('gameover');},warp:()=>SA.play('1up'),star:()=>SA.play('powerup')};
 const sfx=Object.fromEntries(Object.keys(synth).map(k=>[k,(...a)=>{if(!NES[k](...a))synth[k](...a);}]));
 // the area's song like the cartridge: silence on the world card, at the flag, the axe and on death; the 1-2 walk-in has
 // its pipe jingle; the star's song over everything; the fast versions from 100 on the clock
 function songFor(){if(phase!=='play')return null;const p=pl[turn],w=worlds[turn];if(!w||p.dead||p.flagged||p.inCastle||p.axe)return null;
  if(p.area==='intro'){if(p.tunnel!==p.lap+1){p.tunnel=p.lap+1;SA.jingle('tunnel');}return null;}
  const ad=AR(w,p.area).def,k=ad.kind,fast=mode==='world'&&p.time<=100?'-hurry':'';
  if(ad.water&&!(p.star>0||p.mega>0)&&SA.hasSong('water'))return SA.hasSong('water'+fast)?'water'+fast:'water';// the NES underwater song when its file is in
  return (p.star>0||p.mega>0?'star':k==='under'||k==='castle'?k:UNDER_K.has(k)?'under':CASTLE_K.has(k)?'castle':'over')+fast;}
 const UNDER_K=new Set(['subway','funhouse','icecave','dig','hellcave']),CASTLE_K=new Set(['tower','bigtop','icepalace','casino','volcano','fortress','throne']);

 // ---------------- map helpers
 const AR=(w,an)=>w.areas[an];
 const tileAt=(w,an,cc,r)=>{if(r<0||r>=ROWS)return 0;const a=AR(w,an),W=a.def.W;if(cc<0||cc>=W)return TILE.HARD;return a.tiles[r*W+cc];};
 const setTile=(w,an,cc,r,t)=>{const a=AR(w,an);a.tiles[r*a.def.W+cc]=t;};
 const solidAt=(w,an,px,py)=>solid(tileAt(w,an,Math.floor(px/T),Math.floor(py/T)));
 // NES-sized bodies (owner, Nov 21: Mario was too tall for the real maps): small and crouching Mario fit a 1-block
 // gap, big Mario a 2-block one, so 1-2's low passages and the jump over Bowser under 1-4's ceiling work like the NES
 const pH=p=>p.mega>0?70:(p.big&&!p.crouch?30:15)+(p.yoshi?12:0);
 const HW=5;
 // hammer throwers: frames from a throw until the next hammer is back in the hand (the last 12 = pulling it out)
 const RELOAD=40;
 // running over a row of one-block gaps: a body already dipping into a gap gets back onto the next block only if it
 // sank less than this (full run speed sinks at most ~4.4-5.6 px, walking 6.6+ px = you fall in, like the NES)
 const GAP_TOL=5.7;
 const log=[];const note=(p,what)=>{log.push(`${clock.toFixed(1)} P${p.i+1} ${what} ${p.stage+1}:${p.area} x${Math.round(p.x)}`);if(log.length>80)log.shift();};
 const popText=(w,txt,px,py)=>w.fx.pop(px,py,txt,{color:'#fff',stroke:'#000',size:7,rise:20,life:.7});
 const addScore=(p,w,n,px,py)=>{p.score+=n;if(px!==undefined)popText(w,String(n),px,py);};
 const oneUp=(p,w,px,py)=>{if(mode==='world')p.lives=Math.min(99,p.lives+1);else p.score+=1000;if(px!==undefined)popText(w,'1UP',px,py);sfx.oneup();};
 const gainCoin=(p,w)=>{p.coins++;p.score+=200;sfx.coin();if(mode==='world'&&p.coins%100===0)oneUp(p,w,p.x,p.y-40);};
 const stageOf=p=>STAGES[p.stage];

 // generic body vs tiles (enemies, items): returns {wall,landed}
 function moveBody(b,w,an,hw,h,grav=.25,maxFall=4){
  const out={wall:false,landed:false};b.vy=Math.min(b.vy+grav,maxFall);
  b.x+=b.vx;const r0=Math.floor((b.y-h+2)/T),r1=Math.floor((b.y-1)/T);
  if(b.vx>0){const cc=Math.floor((b.x+hw)/T);for(let r=r0;r<=r1;r++)if(solid(tileAt(w,an,cc,r))){b.x=cc*T-hw-.01;out.wall=true;break;}}
  else if(b.vx<0){const cc=Math.floor((b.x-hw)/T);for(let r=r0;r<=r1;r++)if(solid(tileAt(w,an,cc,r))){b.x=(cc+1)*T+hw+.01;out.wall=true;break;}}
  const py=b.y;b.y+=b.vy;
  if(b.vy>=0){const r=Math.floor(b.y/T);if(r>=0&&r<ROWS&&py<=r*T+.5&&(solid(tileAt(w,an,Math.floor((b.x-hw+1)/T),r))||solid(tileAt(w,an,Math.floor((b.x+hw-1)/T),r)))){b.y=r*T;b.vy=0;out.landed=true;}}
  return out;
 }

 // ---------------- player events
 const hurt=(p,w)=>{if(p.inv>0||p.star>0||p.mega>0||p.dead||p.tf||p.flag||p.inCastle||p.axe||p.bubble>0)return;
  // Yoshi takes the hit (and runs off), then the cape, then the skis, before the mushroom goes
  if(p.yoshi){p.yoshi=false;p.inv=120;p.vy=-3;p.grounded=false;w.yoshiRun.push({x:p.x,y:p.y,dir:-p.facing,t:0,area:p.area});sfx.shrink();s.react(p.i,'sad');note(p,'lost yoshi');return;}
  if(p.cape||p.skis){if(p.cape)p.cape=false;else p.skis=false;p.flyT=0;p.inv=120;sfx.shrink();s.react(p.i,'sad');note(p,'lost power');return;}
  if(p.big){note(p,'shrink');p.tf={t:0,to:'small',from:p.fire?'fire':'big'};p.big=false;p.fire=false;p.inv=120;sfx.shrink();s.react(p.i,'sad');}else kill(p,'hit');};
 const kill=(p,kind)=>{if(p.dead)return;note(p,kind);p.dead=1;p.deadKind=kind;p.deaths++;p.vx=0;p.vy=0;p.big=false;p.fire=false;p.star=0;p.mega=0;p.cape=false;p.skis=false;p.yoshi=false;p.flyT=0;p.tf=null;p.ride=null;p.climb=null;p.crouch=false;sfx.die();s.react(p.i,'sad');};
 const grow=(p,to)=>{p.tf={t:0,to,from:p.fire?'fire':p.big?'big':'small'};p.big=true;if(to==='fire')p.fire=true;sfx.power();s.react(p.i,'happy');};
 const killFoe=(w,e,dir,p,n=100)=>{if(e.state==='dying')return;e.state='dying';e.vx=dir*1.1;e.vy=-3.4;e.active=true;if(p)addScore(p,w,n,e.x,e.y-16);sfx.kick();if(p&&p.i===me)esync(w,e);};

 // put the runner at the stage start or the checkpoint (the NES restarts a life there with the stage rebuilt)
 function placeRunner(p,fresh){
  const st=stageOf(p),spot=p.checkOn?st.check:st.start;
  if(net)worlds[p.i]=stageWorld(p.stage,p.lap);else if(fresh||!worlds[p.i]||worlds[p.i].st!==st)worlds[p.i]=makeWorld(st);
  Object.assign(p,{area:spot.area,x:spot.x,y:spot.y,prevY:spot.y,vx:0,vy:0,grounded:true,dead:0,deadKind:'',pipe:null,flag:null,tf:null,crouch:false,jumping:false,inv:0,star:0,climb:null,skidding:false,combo:0,ride:null,
   inCastle:false,castleT:0,auto:!!spot.auto,flagged:false,axe:null,tally:null,runT:0,facing:1});
  if(mode==='world')p.time=st.time;
  p.best=Math.max(p.best,0);cams[p.i].x=0;updateCamera(p,p.i,true);
  // a restart at the checkpoint: like the NES (enemies only appear at the right edge) nothing that stood left of the
  // restart spot or right beside it is there (a Koopa on 1-3's checkpoint tree killed a fresh life at once)
  if(p.checkOn&&!net){const a=AR(worlds[p.i],spot.area);for(const e of a.enemies)if(e.x<spot.x+72)e.alive=false;}
 }
 // coins/race: a death puts you back at the last checkpoint you passed with the world as you left it
 function respawnHere(p){const w=worlds[p.i],st=stageOf(p),spot=p.checkOn?st.check:st.start.auto?{...st.startPlay}:st.start;
  Object.assign(p,{area:spot.area,x:spot.x,y:spot.y,prevY:spot.y,vx:0,vy:0,grounded:true,dead:0,deadKind:'',pipe:null,flag:null,tf:null,crouch:false,jumping:false,inv:60,star:0,climb:null,skidding:false,combo:0,ride:null,auto:false});
  const a=AR(w,spot.area);a.enemies=a.def.enemies.filter(e=>Math.abs(e.x-spot.x)>140).map(spawnFoe);w.items=[];w.fire=[];w.flames=[];cams[p.i].x=0;updateCamera(p,p.i,true);}

 // a beanstalk grows up out of its block to the top of the screen (and on, into the cloud area if the stage has one)
 function growVine(a,c,r){if(!a.vines.some(v=>v.c===c&&v.bottom===r*T))a.vines.push({c,top:r*T,bottom:r*T,max:-3*T});}
 // head bump on a tile (from below)
 function bumpTile(p,w,an,cc,r){
  const a=AR(w,an),t=tileAt(w,an,cc,r),idx=r*a.def.W+cc,key=a.ai*1e6+idx,what=a.content.get(idx);
  if(t===TILE.QBLOCK||t===TILE.HIDDEN||(t===TILE.BRICK&&what)){
   let spent=true;
   if(what==='coin'||what==='multi'||!what){gainCoin(p,w);w.pops.push({x:cc*T+8,y:r*T-8,vy:-5,t:0,area:an});
    if(what==='multi'){const m=w.multi.get(key)||{n:0,t:simT};m.n++;w.multi.set(key,m);spent=m.n>=10||simT-m.t>4;}}
   else if(what==='vine'){growVine(a,cc,r);sfx.sprout();if(net)ev({vn:[w.key,an,cc,r]});}
   else if(what==='power'||what==='star'||what==='1up'||what==='skis'||what==='cape'||what==='mega'||what==='yoshi'){const it={type:what==='power'?(p.big?'flower':'mushroom'):what,x:cc*T+8,y:(r+1)*T,emerge:16,vx:0,vy:0,area:an,id:`${me}.${itemSeq++}`};w.items.push(it);sfx.sprout();
    if(net)ev({it:[w.key,an,it.id,it.type,it.x,it.y]});}
   if(spent){setTile(w,an,cc,r,TILE.USED);a.content.delete(idx);if(net)ev({tl:[w.key,an,idx,TILE.USED]});}
   w.bumps.set(key,0);
  }else if(t===TILE.BRICK){
   if(p.big){setTile(w,an,cc,r,0);w.bumps.delete(key);if(net)ev({tl:[w.key,an,idx,0]});for(const [dx,dy] of [[-1,-1],[1,-1],[-1,0],[1,0]])w.debris.push({x:cc*T+8+dx*4,y:r*T+8+dy*4,vx:dx*1.2,vy:-4.5-(dy?0:-1.5),t:0,area:an});addScore(p,w,50);sfx.brk();}
   else{w.bumps.set(key,0);sfx.bump();}
  }else{sfx.bump();return;}
  // whatever stands on a bumped block gets knocked
  for(const e of a.enemies)if(e.alive&&e.state!=='dying'&&e.type!=='piranha'&&e.type!=='ghost'&&Math.abs(e.y-r*T)<2&&Math.abs(e.x-(cc*T+8))<14)killFoe(w,e,e.x<cc*T+8?-1:1,p,100);
  for(const it of w.items)if(it.area===an&&!it.emerge&&Math.abs(it.y-r*T)<2&&Math.abs(it.x-(cc*T+8))<14){it.vy=-3.5;if(it.type!=='flower')it.vx=it.x<cc*T+8?-1:1;}
  a.def.coins.forEach((q,k)=>{if(!a.got[k]&&Math.abs(q.x-(cc*T+8))<4&&Math.abs(q.y-(r*T-8))<4){a.got[k]=1;if(net)ev({cn:[w.key,an,k]});gainCoin(p,w);w.pops.push({x:q.x,y:q.y,vy:-4,t:0,area:an});}});
 }

 // the sandstorm blows for about 3.5 of every 8 seconds
 const windOn=()=>(clock%8)<3.5;
 // mega Mario smashes every breakable thing his body touches (floors and the castle stay)
 const SMASHABLE=new Set([TILE.BRICK,TILE.QBLOCK,TILE.USED,TILE.HARD,TILE.PTL,TILE.PTR,TILE.PL,TILE.PR,TILE.HIDDEN]);
 function megaSmash(p,w,a){const an=p.area,W=a.def.W,c0=Math.floor((p.x-15)/T),c1=Math.floor((p.x+15)/T),r0=Math.max(2,Math.floor((p.y-72)/T)),r1=Math.floor((p.y-1)/T);let n=0;
  for(let cc=c0;cc<=c1;cc++)for(let r=r0;r<=r1;r++){if(cc<0||cc>=W)continue;const t=tileAt(w,an,cc,r);if(!SMASHABLE.has(t))continue;const idx=r*W+cc;
   setTile(w,an,cc,r,0);a.content.delete(idx);if(net)ev({tl:[w.key,an,idx,0]});n++;if(t===TILE.QBLOCK)gainCoin(p,w);
   for(const [dx,dy] of [[-1,-1],[1,-1],[-1,0],[1,0]])w.debris.push({x:cc*T+8+dx*4,y:r*T+8+dy*4,vx:dx*1.6,vy:-4.5-(dy?0:-1.5),t:0,area:an});}
  if(n){addScore(p,w,100*n);sfx.brk();}
  for(const e of a.enemies)if(e.alive&&e.state!=='dying'&&e.type==='piranha'&&Math.abs(e.x-p.x)<24)killFoe(w,e,1,p,200);}

 // ---------------- the runner
 function stepPlayer(p,w,inp){
  const press=inp.press,bPress=inp.bPress;inp.press=0;inp.bPress=0;
  p.prevY=p.y;
  if(p.inCastle){p.castleT++;return;}
  // online: back from a lost life in a bubble that floats after the partner; jump (or time) pops it
  if(p.bubble>0){p.bubble--;const q=pl[them];if(partnerIn(w,p.area)){p.x+=(q.x-p.x)*.06;p.y+=(q.y-30-p.y)*.06;}p.y=Math.min(p.y,(ROWS-3)*T);p.vx=0;p.vy=0;p.grounded=false;p.anim+=.05;
   if(press&&p.bubble<BUBBLE-30)p.bubble=0;if(p.bubble===0){p.inv=60;p.jumpSpd=0;sfx.kick();}return;}
  if(p.dead){p.dead++;if(p.deadKind==='pit'||p.deadKind==='lava'){if(p.dead>150)deathDone(p);return;}if(p.dead<30)return;if(p.dead===30)p.vy=-4.4;p.vy=Math.min(p.vy+.2,5);p.y+=p.vy;if(p.dead>190)deathDone(p);return;}
  if(p.tf){p.tf.t++;if(p.tf.t>=48)p.tf=null;return;}
  if(p.pipe){stepPipe(p,w);return;}
  if(p.flag){stepFlag(p,w);return;}
  if(p.axe){stepAxe(p,w);return;}
  if(p.inv>0)p.inv--;if(p.star>0)p.star--;if(p.throwT>0)p.throwT--;if(p.rampT>0)p.rampT--;p.spinA=p.spin?(p.spinA||0)+.28:0;
  // the mega mushroom (World 6): huge for ten seconds, smashing blocks, pipes and anything in the way
  if(p.mega>0){p.mega--;p.megaIn=Math.min(1,(p.megaIn||0)+.05);if(p.mega===0){p.inv=90;sfx.shrink();note(p,'mega over');}}
  const a=AR(w,p.area),def=a.def;
  // NES timer: one unit every 24 frames
  if(mode==='world'&&!p.auto){p.timeAcc++;if(p.timeAcc>=24){p.timeAcc=0;p.time=Math.max(0,p.time-1);if(p.time===100)sfx.hurry();if(p.time===0){kill(p,'time');return;}}}
  let dir=(inp.r?1:0)-(inp.l?1:0),jumpHeld=!!inp.jump,down=!!inp.d,jumpPress=press;
  // the funhouse mirror maze (3-2): in front of the mirrors left and right are swapped
  if(def.mirrors&&def.mirrors.some(([m0,m1])=>p.x>=m0*T&&p.x<m1*T))dir=-dir;
  if(inp.b)p.runT=10;else if(p.runT>0)p.runT--;
  let running=p.runT>0;
  if(p.auto){dir=1;jumpHeld=false;down=false;jumpPress=false;running=false;}
  if(!jumpHeld)p.jumping=false;
  // on a beanstalk: hold jump to climb, down to climb down, left or right to let go; past the top of the screen it
  // leads into the stage's cloud area
  if(p.climb){const v=p.climb.v;p.climbT=(p.climbT||0)+1;p.vx=0;p.vy=0;p.grounded=false;p.crouch=false;p.skidding=false;p.ride=null;
   if(dir&&!jumpHeld&&p.climbT>10){p.climb=null;p.facing=dir;p.vx=dir*1.25;p.vy=-2;p.jumpSpd=1.25;p.gHold=JUMP[0][2];p.gFall=JUMP[0][3];return;}
   const hh=pH(p);if(jumpHeld)p.y-=1.1;else if(down)p.y+=1.4;if(jumpHeld||down)p.anim+=.12;
   if(v){p.x=v.c*T+8-p.facing*5;if(p.y-hh<v.top+2)p.y=v.top+2+hh;
    if(def.vineTo&&p.y-hh<-T*.6&&v.top<=-T){p.climb=null;enterArea(p,def.vineTo);note(p,'cloud area');return;}
    if(p.y>=v.bottom){p.y=v.bottom;p.climb=null;}}
   return;}
  // ride a lift
  if(p.ride){const l=p.ride;if(l.wrapped){p.ride=null;p.grounded=false;p.vy=0;}else{p.x+=l.dx;p.y=l.y;}}
  // grind rails (the ski run): slide along at speed, points as you go, sparks off the skis
  if(p.ride&&p.ride.kind==='rail'){p.grindT=(p.grindT||0)+1;if(p.skis&&Math.abs(p.vx)<2)p.vx=(Math.sign(p.vx)||p.facing)*2;
   if(p.grindT===1)popText(w,'GRIND!',p.x,p.y-40);if(p.grindT%8===0){addScore(p,w,50,p.x,p.y-24);w.fx.burst(p.x-p.facing*6,p.y,{n:3,colors:['#fcf8b8','#fcfcfc','#f8a018'],speed:50,life:.25,size:1.2});}}
  else p.grindT=0;
  // underwater (2-2): no running, a slow sink, every jump press is a swim stroke; the water's surface stops you rising
  p.swim=false;
  if(def.water){p.crouch=false;p.skidding=false;p.jumping=false;
   const cap=p.grounded?1.1:1.5;if(dir){p.facing=dir;p.vx+=dir*.045;if(Math.abs(p.vx)>cap)p.vx=Math.sign(p.vx)*cap;}else p.vx-=Math.sign(p.vx)*Math.min(Math.abs(p.vx),.03);
   if(jumpPress){p.vy=p.grounded?-2.2:-2;p.grounded=false;p.ride=null;p.strokeT=24;sfx.stomp();}
   if(p.strokeT>0)p.strokeT--;
   if(!p.grounded){p.vy=Math.min(p.vy+.07,1.6);const hh=pH(p);if(p.y-hh+p.vy<3*T+1){p.vy=Math.max(0,3*T+1+hh-p.y);}}
   p.anim+=Math.abs(p.vx)*.11+(p.grounded?0:.06);p.idle=0;
   if((frames+p.i*37)%80===0)w.bubbles.push({x:p.x+p.facing*3,y:p.y-pH(p)+4,area:p.area,t:0});
  }
  else if(p.grounded){
   p.crouch=down&&p.big;
   // down a pipe (the coin room, the Warp Zone)
   if(down&&!p.ride){for(const d of def.doors)if(d.kind==='down'&&Math.abs(p.y-d.top*T)<.5&&Math.abs(p.x-(d.c+1)*T)<=8){p.pipe={kind:'down',t:0,door:d};p.vx=0;p.crouch=false;sfx.pipe();note(p,d.warp?'warp '+d.warp:'pipe');return;}}
   const sp=Math.abs(p.vx);
   // ice (World 4): slippery underfoot; on skis you go much faster and stay in control
   const ice=!!def.ice,ski=ice&&p.skis,kA=ski?1.35:ice?.5:1,REL=PH.rel*(ski?.45:ice?.22:1),SKID=PH.skid*(ski?.8:ice?.4:1);
   if(p.crouch||dir===0){p.skidding=false;if(sp<=REL)p.vx=0;else p.vx-=Math.sign(p.vx)*REL;}
   else if(p.vx!==0&&Math.sign(p.vx)!==dir){p.skidding=true;p.facing=dir;if(sp<PH.skidTurn)p.vx=0;else p.vx+=dir*SKID;}
   else{p.skidding=false;p.facing=dir;const cap=ski?(running?3.5:2.5):running?PH.run:PH.walk;
    if(sp<PH.minWalk)p.vx=dir*PH.minWalk;else if(sp<cap)p.vx=dir*Math.min(cap,sp+(running?PH.runAcc:PH.walkAcc)*kA);else if(sp>cap)p.vx=dir*Math.max(cap,sp-REL);}
   // ski jumps: hit a ramp on skis at speed and you fly (with a spin)
   if(ski&&def.ramps&&!p.rampT&&Math.abs(p.vx)>1.6){for(const rp of def.ramps)if(p.x>rp.c*T+4&&p.x<(rp.c+1)*T+2&&Math.abs(p.y-(rp.r||13)*T)<2&&Math.sign(p.vx)===1){p.vy=-(4.6+(Math.abs(p.vx)-1.6)*1.5)*(rp.big?1.25:1);p.airT=0;p.grounded=false;p.jumping=false;p.gHold=.12;p.gFall=.3;p.jumpSpd=Math.abs(p.vx);p.spin=1;p.rampT=40;addScore(p,w,200,p.x,p.y-40);popText(w,'NICE!',p.x,p.y-52);sfx.jump(true);note(p,'ramp');break;}}
   p.anim+=Math.abs(p.vx)*.11;p.idle=Math.abs(p.vx)<.01?p.idle+1:0;
   if(jumpPress){const s0=Math.abs(p.vx),j=JUMP.find(j=>s0<j[0])||JUMP[JUMP.length-1];if(p.cape&&s0>=PH.run-.1){p.flyT=150;note(p,'take off');}p.vy=j[1];p.gHold=j[2];p.gFall=j[3];p.jumpSpd=s0;p.grounded=false;p.jumping=true;p.ride=null;p.skidding=false;sfx.jump(p.big);}
  }else{
   // in the air: no friction; control strength and top speed depend on the take-off speed
   if(dir){const sp=Math.abs(p.vx),fwd=p.vx===0||Math.sign(p.vx)===dir;
    const accel=fwd?(sp<PH.walk?PH.walkAcc:PH.runAcc):(sp>=PH.walk?PH.runAcc:p.jumpSpd>=PH.backFast?PH.rel:PH.walkAcc);
    p.vx+=dir*accel;const cap=Math.max(p.jumpSpd<PH.walk?PH.walk:PH.run,p.jumpSpd);if(Math.abs(p.vx)>cap)p.vx=Math.sign(p.vx)*cap;}
   p.vy+=p.jumping&&p.vy<0?p.gHold:p.gFall;if(p.vy>=PH.maxFall)p.vy=PH.fallReset;if(p.spin)p.airT=(p.airT||0)+1;
   // the Elvis cape (World 5): take off at full run and hold jump to climb; afterwards hold jump to glide down
   // Yoshi's flutter: hold jump while falling to hover a moment
   if(p.yoshi&&!p.cape&&jumpHeld&&p.vy>0&&(p.flutter||0)<45){p.flutter=(p.flutter||0)+1;p.vy=Math.max(p.vy-.5,-.35);}
   if(p.cape){if(p.flyT>0){p.flyT--;if(jumpHeld)p.vy=Math.max(p.vy-.55,-2.3);}else if(jumpHeld&&p.vy>.75)p.vy=.75;}
  }
  // riding Yoshi: B shoots out his tongue and swallows whatever it touches
  if(bPress&&p.yoshi&&!p.tongue){p.tongue=18;sfx.kick();}
  if(p.tongue>0){p.tongue--;const reach=8+30*Math.sin((18-p.tongue)/18*Math.PI);for(const e of a.enemies){if(!e.alive||!e.active||e.state==='dying'||e.type==='trex')continue;const ex=(e.x-p.x)*p.facing;if(ex>0&&ex<reach+6&&Math.abs((e.y-6)-(p.y-14))<16){e.state='dying';e.eaten=true;e.vy=8;e.vx=0;addScore(p,w,200,e.x,e.y-16);popText(w,'YUM',e.x,e.y-26);if(p.i===me)esync(w,e);}}}
  // on skis in the air, B is a trick: a spin, paid out on landing (up to three in one jump)
  if(bPress&&p.skis&&!p.grounded&&!def.water&&!p.climb){p.spin=1;p.tricks=Math.min(3,(p.tricks||0)+1);sfx.kick();}
  else if(bPress&&!p.yoshi&&p.fire&&!p.crouch&&w.fire.filter(f=>f.area===p.area&&!f.remote).length<2){const fb={x:p.x+p.facing*8,y:p.y-pH(p)*.55,vx:p.facing*4,vy:3,t:0,area:p.area};w.fire.push(fb);p.throwT=8;sfx.fire();
   if(net)ev({fb:[w.key,p.area,Math.round(fb.x*10)/10,Math.round(fb.y*10)/10,fb.vx,Math.round(performance.now()-netT0)]});}
  // ---- move and collide
  if(p.mega>0)megaSmash(p,w,a);
  const h=pH(p),cam=cams[p.i];
  p.x+=p.vx;
  // sandstorm gusts (5-2) push you back
  if(def.wind&&!p.mega&&windOn())p.x-=p.grounded?.45:.6;
  const scrolls=def.W*T>view.w;
  if(scrolls&&p.x-HW<cam.x){p.x=cam.x+HW;if(p.vx<0)p.vx=0;}
  if(p.x+HW>def.W*T){p.x=def.W*T-HW;if(p.vx>0)p.vx=0;}
  const r0=Math.floor((p.y-h+3)/T),r1=Math.floor((p.y-5)/T);
  {const cr=Math.floor((p.x+HW)/T);for(let r=r0;r<=r1;r++)if(solid(tileAt(w,p.area,cr,r))){p.x=cr*T-HW-.01;if(p.vx>0)p.vx=0;break;}}
  {const cl=Math.floor((p.x-HW)/T);for(let r=r0;r<=r1;r++)if(solid(tileAt(w,p.area,cl,r))){p.x=(cl+1)*T+HW+.01;if(p.vx<0)p.vx=0;break;}}
  const footL=Math.floor((p.x-HW+1)/T),footR=Math.floor((p.x+HW-1)/T);
  if(p.grounded&&!p.ride){const r=Math.floor((p.y+1)/T);if(!(solid(tileAt(w,p.area,footL,r))||solid(tileAt(w,p.area,footR,r)))){p.grounded=false;p.vy=0;p.jumpSpd=Math.abs(p.vx);}}
  if(p.grounded&&p.ride){const l=p.ride;if(Math.abs(p.x-l.x)>l.w/2+HW-1){p.ride=null;p.grounded=false;p.vy=0;p.jumpSpd=Math.abs(p.vx);}}
  if(!p.grounded){
   p.y+=p.vy;
   if(p.vy>=0&&springAt(p,a,def,jumpHeld)){}
   else if(p.vy>=0){const r=Math.floor(p.y/T);
    if(r>=0&&r<ROWS&&(p.prevY<=r*T+.5?p.y-r*T<=Math.max(5,p.vy+1):p.prevY<=r*T+5&&p.y-r*T<=GAP_TOL)&&(solid(tileAt(w,p.area,footL,r))||solid(tileAt(w,p.area,footR,r)))){p.y=r*T;p.vy=0;land(p);}
    else for(const l of a.lifts){if(Math.abs(p.x-l.x)<=l.w/2+HW-1&&p.prevY<=l.y-l.dy+2&&p.y>=l.y){p.y=l.y;p.vy=0;p.ride=l;land(p);break;}}}
   else{const rh=Math.floor((p.y-h)/T);
    if(rh>=0){const cc=Math.floor(p.x/T),cl=Math.floor((p.x-HW+2)/T),cr=Math.floor((p.x+HW-2)/T),hits=c=>{const t=tileAt(w,p.area,c,rh);return solid(t)||t===TILE.HIDDEN;};
     const hit=hits(cc)?cc:hits(cl)?cl:hits(cr)?cr:null;
     if(hit!==null){p.y=(rh+1)*T+h;p.vy=1;p.jumping=false;bumpTile(p,w,p.area,hit,rh);}}}
  }
  // grab a beanstalk you jump into
  if(!p.grounded&&!p.mega&&!def.water&&a.vines.length){for(const v of a.vines)if(Math.abs(p.x-(v.c*T+8))<9&&p.y<=v.bottom+1&&p.y-h>=v.top-4){p.climb={v};p.climbT=0;p.vx=0;p.vy=0;p.jumping=false;note(p,'vine');break;}}
  p.swim=!!def.water&&!p.grounded;if(p.grounded){p.spin=0;p.flutter=0;}
  // off the end of a cloud area you drop back into the stage further on
  if(p.y-h>ROWS*T+4){if(def.fallTo){enterArea(p,def.fallTo);note(p,'back down');return;}kill(p,'pit');return;}
  if(isLava(tileAt(w,p.area,Math.floor(p.x/T),Math.floor((p.y-6)/T)))){kill(p,'lava');return;}
  // castle mazes: pass the gate on the wrong level and the castle loops you back (the right way gets a chime)
  if(def.loops&&!p.auto)for(const lp of def.loops)if(p.x>=lp.x&&p.x-p.vx-.6<lp.x){const rr=Math.floor((p.y-1)/T);
   if(rr<lp.r0||rr>lp.r1){p.x-=lp.back;cams[p.i].x=0;updateCamera(p,p.i,true);sfx.bump();p.mazeMiss=(p.mazeMiss||0)+1;w.fx.pop(p.x,p.y-40,p.mazeMiss>=2?(lp.r0<6?'WRONG WAY! TRY THE TOP PATH':'WRONG WAY! TRY THE BOTTOM PATH'):'WRONG WAY!',{color:'#fff',stroke:'#000',size:7,rise:20,life:p.mazeMiss>=2?2.2:.9});note(p,'maze loop');}
   else if(!(p.mazeOk||(p.mazeOk=new Set())).has(lp.x)){p.mazeOk.add(lp.x);p.mazeMiss=0;sfx.coin();note(p,'maze right');}}
  // progress, the checkpoint
  const st=stageOf(p);if(p.area===st.check.area&&p.x>=st.check.x)p.checkOn=true;
  if(p.area==='main')p.best=Math.max(p.best,p.x);
  // sideways pipes (the 1-2 entrance, the coin room, the 1-2 exit)
  if(p.grounded&&(dir>0)){for(const d of def.doors)if(d.kind==='side'&&p.x+HW>=d.c*T-.6&&p.x+HW<=d.c*T+6&&Math.abs(p.y-(d.r+1)*T)<1){p.pipe={kind:'side',t:0,door:d};p.vx=0;p.auto=false;sfx.pipe();note(p,'side pipe');return;}}
  // the flagpole
  const f=def.flag;
  // flying (cape) or jumping right over the pole counts as grabbing it at the very top: past it there's only the castle
  if(f&&!p.flag&&!p.flagged&&p.x+HW>=f.x-8.5&&(p.x<f.x+12&&p.y>f.top||p.x>=f.x+12)){
   if(p.y<=f.top+2){p.y=f.top+2;p.flyT=0;p.grounded=false;}
   const grab=clamp(f.base-p.y,0,10*T),pts=grab>8.5*T?5000:grab>6*T?2000:grab>4*T?800:grab>2*T?400:100;
   p.flag={t:0,phase:'slide'};p.flagged=true;p.x=f.x-6;p.vx=0;p.vy=0;p.facing=1;p.crouch=false;p.ride=null;addScore(p,w,pts,f.x+14,p.y-30);sfx.flag();note(p,'flag');
   p.fireworksDue=mode==='world'&&[1,3,6].includes(p.time%10)?p.time%10:0;
   if(mode==='race'&&!p.finished){p.finished=true;p.finishT=clock;s.react(p.i,'win');}
   goalReached(p);
  }
  // the axe behind Bowser
  if(def.axe&&!p.axe&&Math.abs(p.x-def.axe.x)<12&&p.y>def.axe.y-8&&p.y-h<def.axe.y+8){noteBowser(p);p.axe={t:0,phase:'bridge',next:def.bridge.c1};p.vx=0;p.vy=0;p.ride=null;p.grounded=true;p.y=Math.min(p.y,def.bridge.r*T);note(p,'axe');if(net)ev({ax:[w.key,p.area]});goalReached(p);}
  // walk into the castle door
  if(p.auto&&def.castle&&p.flagged&&p.x>=def.castle.door){p.inCastle=true;p.castleT=0;p.auto=false;p.vx=0;p.tally={phase:mode==='world'?'time':'flag',t:0};}
 }
 // springboards: land on one to bounce; hold jump as you land to be thrown way up
 function springAt(p,a,def,held){if(!def.springs)return false;for(let k=0;k<def.springs.length;k++){const sp=def.springs[k],top=sp.r*T-14;
   if(Math.abs(p.x-(sp.c*T+8))<=5+HW&&p.prevY<=top+3&&p.y>=top){p.y=top;a.spr=a.spr||[];a.spr[k]=12;p.vy=held?-6.3:-5.3;p.jumping=held;p.gHold=.125;p.gFall=.3;p.jumpSpd=Math.max(Math.abs(p.vx),PH.walk);p.grounded=false;p.ride=null;p.combo=0;sfx.jump(p.big);note(p,held?'spring high':'spring');return true;}}
  return false;}
 function land(p){
  // ski airtime pays out on landing
  if(p.spin&&(p.airT||0)>45){const w=worlds[p.i],at=p.airT,pts=at>80?2000:at>60?1000:500;if(w){addScore(p,w,pts,p.x,p.y-40);popText(w,at>80?'HUGE AIR!':'BIG AIR!',p.x,p.y-56);}}
  if(p.tricks){const w=worlds[p.i];if(w){addScore(p,w,500*p.tricks,p.x,p.y-24);popText(w,p.tricks>1?`TRICK x${p.tricks}!`:'TRICK!',p.x,p.y-72);}p.tricks=0;}
  p.airT=0;p.grounded=true;p.jumping=false;p.combo=0;p.skidding=false;}
 function stepPipe(p,w){
  const pp=p.pipe,d=pp.door;pp.t++;
  if(pp.kind==='down'){p.y+=.8;if(pp.t>=40){if(d.warp){p.pipe=null;warpFound(p,d.warp);return;}enterArea(p,d.to);}}
  else if(pp.kind==='side'){p.x+=.6;p.anim+=.08;if(pp.t>=36)enterArea(p,d.to);}
  else{p.y-=.8;if(p.y<=pp.top){p.y=pp.top;p.prevY=p.y;p.pipe=null;land(p);p.best=Math.max(p.best,p.x);}}
 }
 function enterArea(p,to){
  const w=worlds[p.i],a=AR(w,to.area);flash[p.i]=.6;p.pipe=null;p.ride=null;p.climb=null;
  if(to.how==='drop'){Object.assign(p,{area:to.area,x:to.x,y:to.y,prevY:to.y,vx:0,vy:0,grounded:false,jumping:false,jumpSpd:0});if(a.def.skiRun&&!p.skis){p.skis=true;popText(w,'SKIS ON!',p.x,p.y-40);}}
  else{const pipe=a.def.pipes.find(q=>q.c===to.pipe);Object.assign(p,{area:to.area,x:(pipe.c+1)*T,y:pipe.top*T+pH(p)+2,prevY:pipe.top*T,vx:0,vy:0,grounded:false,facing:1});p.pipe={kind:'up',t:0,top:pipe.top*T};sfx.pipe();}
  cams[p.i].x=0;updateCamera(p,p.i,true);note(p,'enter '+to.area);
 }
 function stepFlag(p,w){
  const f=p.flag,fl=AR(w,p.area).def.flag;f.t++;const base=fl.base;
  if(f.phase==='slide'){p.y=Math.min(base,p.y+2);w.flagPos=Math.min(base-fl.top-24,w.flagPos+2);if(p.y>=base&&w.flagPos>=base-fl.top-24){f.phase='hold';f.t=0;}}
  else if(f.phase==='hold'){if(f.t===1){p.x=fl.x+7;p.facing=-1;}if(f.t>24){p.flag=null;p.auto=true;p.facing=1;p.grounded=false;p.vy=-1;sfx.clear();}}
 }
 function stepAxe(p,w){
  const ax=p.axe,a=AR(w,p.area),def=a.def,b=a.bowser;ax.t++;
  if(ax.phase==='bridge'){if(ax.t%4===0){if(ax.next>=def.bridge.c0){setTile(w,p.area,ax.next,def.bridge.r,0);ax.next--;sfx.bridge();if(ax.next===def.bridge.c0+6)setTile(w,p.area,def.bridge.c1,def.bridge.r-1,0);}
    else{ax.phase='fall';ax.t=0;if(b&&b.state!=='dead'){b.state='fall';b.vy=0;b.t=0;sfx.bowserFall();}}}}
  else if(ax.phase==='fall'){if(ax.t>90&&(!b||b.state!=='fall'||b.y>ROWS*T+40)){ax.phase='walk';ax.t=0;p.facing=1;SA.jingle('castle-clear');}}
  else if(ax.phase==='walk'&&def.finale){ax.phase='ascend';ax.t=0;s.react(p.i,'win');}
  else if(ax.phase==='ascend'){p.vx=0;if(ax.t===360)s.react(p.i,'angry');if(ax.t>=FINALE_T){p.axe=null;stageClear(p);}}
  else if(ax.phase==='walk'){p.vx=PH.walk;p.x+=p.vx;p.anim+=.17;p.grounded=true;if(p.x>=def.toad.x-26){p.vx=0;ax.phase='toad';ax.t=0;s.react(p.i,'win');}}
  else if(ax.phase==='toad'){if(mode==='world'&&p.time>0){const n=Math.min(2,p.time);p.time-=n;p.score+=50*n;if(ax.t%3===0)sfx.tick();}
   if(ax.t>330){p.axe=null;stageClear(p);}}
 }

 // ---------------- per-player interactions (coins, enemies, items, hazards)
 function hits(p,x0,y0,x1,y1){const h=pH(p);return p.x+HW>x0&&p.x-HW<x1&&p.y>y0&&p.y-h<y1;}
 function interact(p,w,inp){
  if(p.dead||p.pipe||p.tf||p.inCastle||p.axe||p.bubble>0||p.out)return;
  const a=AR(w,p.area),def=a.def,h=pH(p),topY=p.y-h,list=def.coins,got=a.got;
  for(let k=0;k<list.length;k++){const q=list[k];if(!got[k]&&Math.abs(q.x-p.x)<11&&q.y>topY-5&&q.y<p.y+5){got[k]=1;if(net)ev({cn:[w.key,p.area,k]});gainCoin(p,w);}}
  if(p.flag)return;
  for(const e of a.enemies){
   if(!e.alive||!e.active||e.state==='dying'||e.state==='squash')continue;
   let eTop,eBot=e.y,ew=6;
   if(e.type==='piranha'){if(e.off<4)continue;eTop=e.home-e.off;eBot=e.home;ew=5;}else eTop=e.y-eHeight(e);
   if(Math.abs(p.x-e.x)>=(p.mega>0?15:HW)+ew||p.y<=eTop||topY>=eBot)continue;
   if(p.star>0){p.combo++;killFoe(w,e,e.x>p.x?1:-1,p,COMBO[Math.min(p.combo,9)]);continue;}
   if(p.mega>0){p.combo++;killFoe(w,e,e.x>p.x?1:-1,p,COMBO[Math.min(p.combo,9)]);continue;}
   // spinning a trick off a ski jump mows down whatever you hit
   if(p.spin&&p.skis&&!p.grounded){p.combo++;killFoe(w,e,e.x>p.x?1:-1,p,COMBO[Math.min(p.combo,9)]);continue;}
   if(e.type==='dreamer'&&e.state!=='walk'||e.type==='slasher'&&e.state==='down'||e.type==='podoboo'&&e.state==='wait')continue;
   if(e.type==='piranha'||NO_STOMP(e.type)){hurt(p,w);continue;}
   const stomp=p.vy>0&&p.prevY<=eTop+7;
   if(stomp){
    const n=COMBO[Math.min(p.combo,9)];if(p.combo>=10)oneUp(p,w,e.x,eTop-6);else addScore(p,w,n,e.x,eTop-6);p.combo++;sfx.stomp();
    if(e.type==='trex'){sfx.bump();}
    else if(e.type==='slasher'){e.state='down';e.t=0;}
    else if(FOES[e.type]){killFoe(w,e,e.x>p.x?1:-1,null);}
    else if(e.type==='goomba'){e.state='squash';e.t=0;}
    else if(e.type==='paraRed'){e.type='koopaRed';e.vx=p.x<e.x?.5:-.5;e.vy=0;}
    else if(e.type==='para'){e.type='koopa';e.vy=0;}
    else if(e.state==='walk'){e.state='shell';e.vx=0;e.t=0;}
    else if(e.vx!==0){e.vx=0;e.t=0;}
    else{e.vx=p.x<e.x?3:-3;e.grace=10;e.chain=0;sfx.kick();}
    e.remote=false;e.kick=me;esync(w,e);
    p.y=Math.min(p.y,eTop);p.vy=-4;p.jumping=!!inp.jump;p.grounded=false;p.ride=null;continue;
   }
   if(e.state==='shell'&&e.vx===0){e.vx=p.x<e.x?3:-3;e.grace=12;e.t=0;e.chain=0;sfx.kick();addScore(p,w,400,e.x,eTop-6);e.remote=false;e.kick=me;esync(w,e);continue;}
   if(e.state==='shell'&&e.grace>0)continue;
   hurt(p,w);
  }
  for(let k=w.items.length-1;k>=0;k--){const it=w.items[k];if(it.area!==p.area||it.emerge>8)continue;
   if(Math.abs(it.x-p.x)<13&&it.y>topY-2&&it.y-14<p.y){w.items.splice(k,1);if(net&&it.id)ev({ig:[w.key,it.id]});
    if(it.type==='1up'){oneUp(p,w,it.x,it.y-18);continue;}
    addScore(p,w,1000,it.x,it.y-18);
    if(it.type==='mushroom'){if(!p.big)grow(p,'big');else sfx.power();}
    else if(it.type==='flower'){if(!p.big)grow(p,'big');else if(!p.fire)grow(p,'fire');else sfx.power();}
    else if(it.type==='skis'){p.skis=true;sfx.power();s.react(p.i,'happy');note(p,'skis');}
    else if(it.type==='cape'){p.cape=true;if(!p.big)grow(p,'big');else sfx.power();s.react(p.i,'happy');note(p,'cape');}
    else if(it.type==='yoshi'){p.yoshi=true;sfx.oneup();popText(w,'YOSHI!',p.x,p.y-50);s.react(p.i,'win');note(p,'yoshi');}
    else if(it.type==='mega'){p.mega=MEGA_T;p.megaIn=0;p.big=true;sfx.power();s.react(p.i,'win');note(p,'mega');}
    else{p.star=600;sfx.star();s.react(p.i,'happy');}}}
  // firebars, Bowser and his flames
  for(const fb of def.firebars){const ang=fbAngle(fb,a);for(let k=0;k<fb.n;k++){const bx=fb.x+Math.cos(ang)*k*8,by=fb.y+Math.sin(ang)*k*8;if(hits(p,bx-3,by-3,bx+3,by+3)){hurt(p,w);break;}}}
  const b=a.bowser;if(b&&b.state!=='dead'&&b.state!=='fall'&&hits(p,b.x-12,b.y-30,b.x+12,b.y)){if(p.star>0||p.mega>0){b.state='dead';b.vy=-3;addScore(p,w,5000,b.x,b.y-40);if(net)ev({bd:[w.key,p.area,0]});}else hurt(p,w);}
  for(const f of w.flames)if(f.area===p.area&&(f.g?hits(p,f.x-5,f.y-5,f.x+5,f.y+5):hits(p,f.x-10,f.y-3,f.x+14,f.y+3)))hurt(p,w);
 }
 const fbAngle=(fb,a)=>{const step=Math.PI*2/32,raw=a.fbT*.04*(a.fbK||1)*fb.dir+(fb.c*.7);return Math.floor(raw/step)*step;};

 function stepWorld(w,p){
  const cam=cams[p.i],a=AR(w,p.area),an=p.area;
  // the NES freezes the world while Mario grows or shrinks; online the partner keeps playing in it, so it runs on
  if(p.tf&&!net)return;
  // online: this phone runs this area for both (see authHere); lifts and firebars run on the shared step count
  const auth=authHere(w,an);if(net){stepped.k=w.key;stepped.an=an;stepped.f=frames;}
  a.fbT=net?netStep:a.fbT+1;
  const ln=net?clamp(netStep-(a.lsN??0),0,40000):1;if(net)a.lsN=Math.max(a.lsN??0,netStep);
  for(const v of a.vines)if(v.top>v.max)v.top=Math.max(v.max,v.top-1);
  if(a.spr)for(let k=0;k<a.spr.length;k++)if(a.spr[k]>0)a.spr[k]--;
  for(const l of a.lifts){l.dx=0;l.dy=0;l.wrapped=false;l.load=onLift(p,l,an)||partnerIn(w,an)&&onLift(pl[them],l,an);}
  for(let k=0;k<ln;k++)for(const l of a.lifts){const ox=l.x,oy=l.y;let wr=false;
   if(l.kind==='loop'){l.y+=l.vy;if(l.vy>0&&l.y>ROWS*T+8){l.y=-8;wr=true;}if(l.vy<0&&l.y<-8){l.y=ROWS*T+8;wr=true;}}
   else if(l.kind==='h'){l.x+=l.vx;if(l.x<l.x0||l.x>l.x1){l.vx=-l.vx;l.x=clamp(l.x,l.x0,l.x1);}}
   else if(l.kind==='v'){l.y+=l.vy;if(l.y<l.y0||l.y>l.y1){l.vy=-l.vy;l.y=clamp(l.y,l.y0,l.y1);}}
   // a falling lift drops while somebody stands on it
   else if(l.kind==='fall'){if(l.load||l.vy>0){l.vy=Math.min((l.vy||0)+.06,2.4);l.y+=l.vy;}}
   // balance lifts hang off one rope: weight on one pulls it down and the other up; pulled to the end, the rope snaps
   else if(l.kind==='bal'){const m=a.lifts[l.mate];if(l.snap){l.vy=Math.min((l.vy||0)+.12,3);l.y+=l.vy;}
    else if(l.load&&!m.load&&l.y<l.ymax){l.y+=.75;m.y-=.75;if(l.y>=l.ymax){l.snap=m.snap=true;l.vy=m.vy=0;}}}
   l.dx+=l.x-ox;if(wr)l.wrapped=true;else l.dy+=l.y-oy;}
  for(const e of a.enemies){
   if(!e.alive)continue;
   // online the partner's screen (its real width) wakes enemies too, and an enemy is dropped only once it is behind both
   if(!e.active){if(e.x<reachR(cam,w,an)+24)e.active=true;else continue;}
   if(e.x<backX(cam,w,an)-96||e.y>ROWS*T+48){e.alive=false;continue;}
   e.frame+=STEP;
   if(e.state==='dying'){e.vy+=.25;e.x+=e.vx;e.y+=e.vy;continue;}
   if(e.state==='squash'){e.t++;if(e.t>30)e.alive=false;continue;}
   if(e.type==='piranha'){e.t++;
    if(e.state==='hidden'){if(e.t>90&&Math.abs(p.x-e.x)>26&&!(partnerIn(w,an)&&Math.abs(pl[them].x-e.x)<=26)){e.state='up';e.t=0;}}
    else if(e.state==='up'){e.off=Math.min(24,e.off+.8);if(e.off>=24){e.state='out';e.t=0;}}
    else if(e.state==='out'){if(e.t>72){e.state='down';e.t=0;}}
    else{e.off=Math.max(0,e.off-.8);if(e.off<=0){e.state='hidden';e.t=0;}}
    continue;}
   if(e.type==='paraRed'){e.ph+=.018;e.y=e.y0+(e.y1-e.y0)*(.5-.5*Math.cos(e.ph));continue;}
   if(e.type==='cheep'||e.type==='cheepRed'){e.x+=e.vx;e.ph+=.045;e.y=e.home+Math.sin(e.ph)*6;continue;}
   // boardwalk ghosts drift after the nearer runner only while that runner's back is turned; looked at, they stop and hide their face
   if(e.type==='ghost'){const tgt=partnerIn(w,an)&&Math.abs(pl[them].x-e.x)<Math.abs(p.x-e.x)?pl[them]:p,dx=tgt.x-e.x,dy=(tgt.y-(tgt.big?16:9))-(e.y-8),d=Math.hypot(dx,dy)||1;
    e.dir=Math.sign(dx)||1;e.shy=tgt.facing===-e.dir&&Math.abs(dx)>=4;
    if(!e.shy&&d<240){e.x+=dx/d*.45;e.y+=dy/d*.45;}e.y=clamp(e.y,3*T+10,13*T);continue;}
   if(e.type==='blooper'){e.t++;const tgt=partnerIn(w,an)&&Math.abs(pl[them].x-e.x)<Math.abs(p.x-e.x)?pl[them]:p;
    if(e.vy<0){e.x+=e.vx;e.y+=e.vy;e.vy+=.07;if(e.vy>=0){e.vx=0;e.t=0;}}
    else{e.vy=0;e.y+=.4;if(e.t>36&&(tgt.y-pH(tgt)<e.y-6||Math.abs(tgt.x-e.x)<40)){e.vy=-1.7;e.vx=tgt.x<e.x?-.9:.9;e.t=0;}}
    e.y=clamp(e.y,3*T+18,12*T+15);continue;}
   if(e.hit>0)e.hit--;
   if(FOES[e.type]){const tg=partnerIn(w,an)&&!pl[them].dead&&Math.abs(pl[them].x-e.x)<Math.abs(p.x-e.x)?pl[them]:p,dx=tg.x-e.x,dir=Math.sign(dx)||1;e.t++;
    switch(e.type){
     // the masked slasher: walks after you without stopping; a stomp only knocks him down for a few seconds
     case 'slasher':if(e.state==='down'){e.vx=0;if(e.t>180){e.state='walk';e.t=0;}}else e.vx=dir*.3;break;
     // the dream stalker: fades out and steps out of thin air right behind you
     case 'dreamer':if(e.state==='walk'){e.vx=dir*.4;if(e.t>220&&Math.abs(dx)<200){e.state='fade';e.t=0;}}else if(e.state==='fade'){e.vx=0;if(e.t>30){e.x=tg.x-tg.facing*36;e.y=tg.grounded?tg.y:Math.min(12*T,tg.y+20);e.vy=0;e.state='appear';e.t=0;}}else if(e.state==='appear'){e.vx=0;if(e.t>36){e.state='walk';e.t=0;}}break;
     // hoppers: the little demon and the dice
     case 'imp':case 'dice':if(e.vy===0&&e.t>(e.type==='imp'?46:38)){e.vy=e.type==='imp'?-4.2:-3.4;e.vx=dir*(e.type==='imp'?.9:.6);e.t=0;}break;
     // parka climbers and penguins turn round at ledges
     case 'climber':if(e.vy===0){const fx=e.x+Math.sign(e.vx)*8,r=Math.floor((e.y+1)/T);if(!solid(tileAt(w,an,Math.floor(fx/T),r)))e.vx=-e.vx;}e.swing=Math.abs(dx)<30;
      // and they lob their mallets at you in an arc
      e.pc??=Math.floor(e.x/T)%2;if(e.mouth>0)e.mouth--;if(e.reload>0)e.reload--;e.ham=(e.ham??50+Math.floor(e.x)%60)-1;
      if(e.ham<=0){e.ham=Math.round((128+s.random()*80)/(a.k||1));if(Math.abs(dx)<170&&Math.abs(tg.y-e.y)<90&&!(net&&!auth)){e.dir=dir;e.mouth=14;e.reload=RELOAD;const v=clamp(dx/48,-2.2,2.2);w.flames.push({x:e.x+dir*4,y:e.y-20,vx:Math.abs(v)<.8?dir*.8:v,vy:-3.8,g:.16,area:an,look:'hammer'});}}break;
     // penguins belly-slide straight off ledges and keep going
     case 'penguin':break;
     // the cloud rider stays over you (stomp him from up high), dropping spiky shells; past the end of his patch he leaves
     case 'rider':{if(e.mouth>0)e.mouth--;const gone=a.def.riderEnd&&tg.x>a.def.riderEnd,goal=gone?e.x+240:tg.x+tg.vx*30+Math.sin(e.t*.017)*56;
      e.vx=clamp((goal-e.x)*.035,-2.7,2.7);e.x+=e.vx;e.y=e.home+Math.sin(e.t*.05)*3;e.dir=dir;
      if(gone){if(e.x>reachR(cam,w,an)+40)e.alive=false;continue;}
      e.thr=(e.thr??90)-1;
      if(e.thr<=0&&!(net&&!auth)){const live=a.enemies.filter(o=>o.type==='spiny'&&o.alive).length,slot=a.enemies.find(o=>o.type==='spiny'&&!o.alive);
       if(slot&&live<3+((a.k||1)>1.3?1:0)){Object.assign(slot,{alive:true,active:true,state:'egg',x:e.x,y:e.y-4,vx:clamp(dx*.012,-1,1),vy:-3,t:0,hp:1,home:e.y,eaten:false,remote:false,grace:0,hit:0});e.mouth=20;e.thr=Math.round((120+s.random()*70)/(a.k||1));}else e.thr=40;}
      continue;}
     // a spiky shell falls, lands and walks; it can't be stomped
     case 'spiny':if(e.state==='egg'){const rr=moveBody(e,w,an,6,12,.2,4);if(rr.landed){e.state='walk';e.vx=(dx>0?1:-1)*.5*(a.k||1);}else if(rr.wall)e.vx=-e.vx;continue;}break;
     // Bullet Bill flies straight on; Hammer Bros pace, hop and lob hammers; lava bubbles leap out of the lava and
     // fall back in; the fish leap up from below the bridge in long arcs
     case 'bullet':e.x+=e.vx;e.y=e.home;e.dir=Math.sign(e.vx)||-1;if(e.x>reachR(cam,w,an)+64)e.alive=false;continue;
     case 'hammerBro':{e.dir=dir;if(e.hx===undefined)e.hx=e.x;e.vx=Math.floor(e.t/70)%2?.4:-.4;if(e.x<e.hx-14)e.vx=.4;if(e.x>e.hx+14)e.vx=-.4;
      if(e.vy===0){const fx=e.x+Math.sign(e.vx)*8,r=Math.floor((e.y+1)/T);if(!solid(tileAt(w,an,Math.floor(fx/T),r)))e.vx=0;if(e.t%150===75)e.vy=-3.6;}
      if(e.mouth>0)e.mouth--;if(e.reload>0)e.reload--;e.ham=(e.ham??30+Math.floor(e.x)%40)-1;
      if(e.ham<=0){e.ham=Math.round((70+s.random()*64)/(a.k||1));if(Math.abs(dx)<190&&!(net&&!auth)){e.mouth=12;e.reload=RELOAD;w.flames.push({x:e.x+dir*4,y:e.y-26,vx:dir*(.9+s.random()*1.1),vy:-4.3,g:.18,area:an,look:'hammer'});}}break;}
     case 'podoboo':if(e.state==='wait'){e.y=e.home+20;if(e.t>(e.wait??60+Math.floor(e.x)%90)){e.state='up';e.vy=-(e.pow||5.4);e.t=0;}continue;}
      e.vy+=.15;e.y+=e.vy;if(e.vy>0&&e.y>=e.home+20){e.state='wait';e.t=0;e.wait=70+Math.floor(e.x*7+e.t)%80;}continue;
     case 'leaper':e.vy+=.12;e.x+=e.vx;e.y+=e.vy;if(e.vy>0&&e.y>ROWS*T+12)e.alive=false;continue;
     // icicles shake, then drop when somebody walks under
     case 'icicle':if(e.state==='hang'){if(Math.abs(dx)<20&&tg.y>e.y){e.state='shake';e.t=0;}continue;}
      if(e.state==='shake'){if(e.t>24){e.state='fall';e.vy=0;}continue;}
      e.vy=Math.min(e.vy+.3,5);e.y+=e.vy;if(solid(tileAt(w,an,Math.floor(e.x/T),Math.floor(e.y/T)))){e.alive=false;for(const k of [-1,1])w.debris.push({x:e.x+k*3,y:e.y-4,vx:k*1.4,vy:-3,t:0,area:an,ice:true});}continue;
     // playing cards swoop along in a wave; pterodactyls dive at you
     case 'card':e.x+=e.vx;e.ph+=.05;e.y=e.home+Math.sin(e.ph)*14;continue;
     case 'ptero':e.x+=e.vx;if(e.state==='fly'){if(Math.abs(dx)<56&&tg.y>e.y&&e.t>70){e.state='dive';e.t=0;}}else if(e.state==='dive'){e.y+=1.7;if(e.t>36||e.y>tg.y){e.state='rise';e.t=0;}}else{e.y-=1;if(e.y<=e.home){e.y=e.home;e.state='fly';e.t=0;}}continue;
     // raptors charge when they spot you and leap over whatever is in the way
     case 'raptor':{const see=Math.abs(dx)<140&&Math.abs(tg.y-e.y)<40;e.vx=see?dir*1.5:(Math.sign(e.vx)||-1)*.5;const r2=moveBody(e,w,an,7,18);if(r2.wall){if(e.vy===0)e.vy=-5.2;else if(!see)e.vx=-e.vx;}continue;}
     // the frilled spitter stands still and spits venom at you
     case 'dilo':e.dir=dir;if(e.t>130&&Math.abs(dx)<190&&!(net&&!auth)){e.t=0;e.mouth=20;w.flames.push({x:e.x+dir*10,y:e.y-14,ty:clamp(tg.y-12,3*T,13*T),vx:dir*1.4,area:an,look:'venom'});}if(e.mouth>0)e.mouth--;e.vx=0;break;
     case 'trex':e.vx=dir*.3;break;
     // Hell: the pink brute charges; flaming skulls dash at you; the floating eye spits fireballs
     case 'brute':{const see=Math.abs(dx)<150&&Math.abs(tg.y-e.y)<40;e.vx=see?dir*1.7:(Math.sign(e.vx)||-1)*.4;break;}
     case 'skull':if(e.state==='dash'){e.x+=e.vx;e.y+=e.vy;if(e.t>40){e.state='fly';e.t=0;e.vx=0;e.vy=0;}}else{e.y=e.home+Math.sin(e.t*.06)*6;if(e.t>90&&Math.abs(dx)<170){const dy2=(tg.y-12)-e.y,d2=Math.hypot(dx,dy2)||1;e.vx=dx/d2*2.3;e.vy=dy2/d2*2.3;e.state='dash';e.t=0;e.home=e.y;}}e.y=clamp(e.y,3*T,13*T);continue;
     case 'floater':case 'angel':case 'cherub':{if(e.type==='angel'){e.x+=e.vx;e.ph+=.04;e.y=e.home+Math.sin(e.ph)*16;}else{e.y=e.home+Math.sin(e.t*.05)*8;if(e.type==='floater')e.x+=dir*.3;}e.dir=dir;
      const every=e.type==='cherub'?120:e.type==='angel'?150:160;if(e.t%every===every-1&&Math.abs(dx)<200&&!(net&&!auth)){e.mouth=20;w.flames.push({x:e.x+dir*8,y:e.y-10,ty:e.type==='cherub'?e.y-10:clamp(tg.y-12,3*T,13*T),vx:dir*(e.type==='cherub'?2.2:1.4),area:an,look:e.type==='cherub'?'arrow':e.type==='angel'?'bolt':undefined});}
      if(e.mouth>0)e.mouth--;continue;}
    }}
   // red Koopas turn round at ledges
   if(e.type==='koopaRed'&&e.state==='walk'&&e.vy===0){const fx=e.x+Math.sign(e.vx)*8,r=Math.floor((e.y+1)/T);if(!solid(tileAt(w,an,Math.floor(fx/T),r)))e.vx=-e.vx;}
   const hgt=eHeight(e),res=moveBody(e,w,an,e.type==='trex'?12:7,hgt);
   // green Paratroopas bounce along
   if(e.type==='para'&&res.landed)e.vy=-3.6;
   if(res.wall){e.vx=-e.vx;if(e.state==='shell'&&Math.abs(e.x-cam.x-view.w/2)<view.w/2+20)sfx.bump();}
   if(isLava(tileAt(w,an,Math.floor(e.x/T),Math.floor((e.y-4)/T))))e.alive=false;
   if(e.state==='shell'){if(e.grace>0)e.grace--;
    if(e.vx===0){e.t++;if(e.t>480){e.state='walk';e.vx=p.x<e.x?-.5:.5;}}
    else{if(e.x>reachR(cam,w,an)+48){e.alive=false;continue;}
     // a shell the partner kicked knocks enemies over on the phone that runs this area (its snapshots show them
     // falling here), but the points are theirs; a shell you kicked is yours to judge
     const kp=e.remote?null:p;
     if(!(net&&e.remote&&!auth))for(const o of a.enemies)if(o!==e&&o.alive&&o.active&&o.state!=='dying'&&o.state!=='squash'&&Math.abs(o.x-e.x)<14&&(o.type==='piranha'?o.off>4&&e.y>o.home-o.off&&e.y-14<o.home:Math.abs(o.y-e.y)<16)){e.chain=(e.chain||0)+1;if(e.chain>7){killFoe(w,o,Math.sign(e.vx),null);if(kp)oneUp(p,w,o.x,o.y-16);}else killFoe(w,o,Math.sign(e.vx),kp,SHELL_CHAIN[e.chain-1]);}}}
  }
  // a stomped cloud rider comes back from the right a few seconds later (until his patch runs out)
  if(a.def.rider&&auth){const rd=a.enemies.find(o=>o.type==='rider');if(rd&&!rd.alive&&p.x<(a.def.riderEnd||1e9)-160){a.riderT=(a.riderT||0)+1;if(a.riderT>420){a.riderT=0;Object.assign(rd,{alive:true,active:true,state:'fly',x:cam.x+view.w+24,y:rd.home,vx:0,vy:0,t:0,thr:120,eaten:false,grace:0});}}else a.riderT=0;}
  // Bill Blasters fire at whoever is on screen (not point blank); fish leap over the bridges while a runner is on them
  if(auth&&a.def.cannons){a.cn=a.cn||a.def.cannons.map((c,k)=>60+k*47);a.def.cannons.forEach((cn,k)=>{const cx=cn.c*T+8;if(cx<cam.x-8||cx>cam.x+view.w+8){a.cn[k]=Math.min(a.cn[k],40);return;}
    if(--a.cn[k]>0)return;a.cn[k]=Math.round((170+(k*53)%90)/(a.k||1));const d=Math.sign(p.x-cx)||-1;if(Math.abs(p.x-cx)<28)return;
    const slot=a.enemies.find(o=>o.type==='bullet'&&!o.alive);if(!slot)return;
    Object.assign(slot,{alive:true,active:true,state:'fly',x:cx+d*10,y:cn.r*T+13,home:cn.r*T+13,vx:d*1.45*(a.k||1),vy:0,t:0,hp:1,eaten:false,remote:false,grace:0,hit:0});
    w.fx.burst(cx+d*10,cn.r*T+7,{n:6,colors:['#fcfcfc','#9c9c9c'],speed:40,life:.3,size:1.6});sfx.bump();});}
  if(auth&&a.def.cheepZones){const z=a.def.cheepZones.find(([x0,x1])=>p.x>=x0&&p.x<=x1);
   if(z&&!p.dead){a.chT=(a.chT||0)+1;if(a.chT>=Math.round(64/(a.k||1))){a.chT=0;const slot=a.enemies.find(o=>o.type==='leaper'&&!o.alive);
     if(slot){const x=p.x-30+s.random()*170,d=x<p.x?1:-1;Object.assign(slot,{alive:true,active:true,state:'fly',x,y:ROWS*T+8,home:ROWS*T,vx:d*(.7+s.random()*.8),vy:-(5.6+s.random()*1.1),t:0,hp:1,eaten:false,remote:false,grace:0,hit:0});}}}}
  // walkers turn round when they meet
  const ws=a.enemies.filter(e=>e.alive&&e.active&&e.state==='walk'&&e.type!=='piranha'&&e.type!=='paraRed');
  for(let i=0;i<ws.length;i++)for(let j=i+1;j<ws.length;j++){const A=ws[i],B=ws[j];if(Math.abs(A.x-B.x)<14&&Math.abs(A.y-B.y)<10&&(B.x-A.x)*(A.vx-B.vx)>0){A.vx=-A.vx;B.vx=-B.vx;}}
  // power-ups
  for(let k=w.items.length-1;k>=0;k--){const it=w.items[k];if(it.area!==an)continue;
   if(it.emerge>0){it.y-=.5;it.emerge-=.5;if(it.emerge<=0){it.emerge=0;if(it.type==='mushroom'||it.type==='1up'||it.type==='mega')it.vx=1;if(it.type==='star'){it.vx=1.2;it.vy=-4;}}continue;}
   if(it.type==='flower'||it.type==='skis'||it.type==='cape'||it.type==='yoshi')continue;
   const res=moveBody(it,w,an,6,14,it.type==='star'?.2:.25);if(res.wall)it.vx=-it.vx;if(it.type==='star'&&res.landed)it.vy=-4.5;
   if(it.y>ROWS*T+32||it.x<backX(cam,w,an)-64)w.items.splice(k,1);}
  for(let k=w.yoshiRun.length-1;k>=0;k--){const y=w.yoshiRun[k];y.t++;y.x+=y.dir*2.4;if(y.t>150)w.yoshiRun.splice(k,1);}
  for(let k=w.bubbles.length-1;k>=0;k--){const q=w.bubbles[k];q.t++;q.y-=.6;q.x+=Math.sin(q.t*.2)*.3;if(q.y<3*T+3||q.t>400||q.area!==an)w.bubbles.splice(k,1);}
  // fireballs
  for(let k=w.fire.length-1;k>=0;k--){const f=w.fire[k];if(f.area!==an){w.fire.splice(k,1);continue;}f.t++;f.x+=f.vx;f.vy=Math.min(f.vy+.3125,3);f.y+=f.vy;let gone=false;
   if(solidAt(w,an,f.x,f.y+4)&&f.vy>0){f.y=Math.floor((f.y+4)/T)*T-4;f.vy=-3;}
   if(solidAt(w,an,f.x+Math.sign(f.vx)*4,f.y))gone=true;
   for(const e of a.enemies){if(gone||!e.alive||!e.active||e.state==='dying'||e.state==='squash')continue;const eTop=e.type==='piranha'?e.home-e.off:e.y-eHeight(e),eBot=e.type==='piranha'?e.home:e.y;
    // the partner's fireballs (online) are only shown here: their phone judges what they hit
    if(e.type==='piranha'&&e.off<4||e.type==='ghost'||e.type==='podoboo'&&e.state==='wait')continue;if(Math.abs(f.x-e.x)<(e.type==='trex'?16:10)&&f.y>eTop-4&&f.y<eBot+4){if(FIREPROOF.has(e.type)){gone=true;sfx.bump();continue;}if(!f.remote){if((e.hp||1)>1){e.hp--;e.hit=10;sfx.bump();}else killFoe(w,e,Math.sign(f.vx),p,e.type==='trex'?5000:200);}gone=true;}}
   const b=a.bowser;if(!gone&&b&&(b.state==='idle')&&Math.abs(f.x-b.x)<14&&f.y>b.y-32&&f.y<b.y){gone=true;sfx.bump();
    // online a hit on Bowser counts on the phone that runs the castle ({bh}); the 5 hits add up from both players
    if(!f.remote){b.hp--;if(net)b.lock=evA({bh:[w.key,an]});if(b.hp<=0){b.state='dead';b.fake=true;b.vy=-3;addScore(p,w,5000,b.x,b.y-40);sfx.bowserFall();if(net)ev({bd:[w.key,an,1]});}}}
   if(gone){w.fx.burst(f.x,f.y,{n:6,colors:['#fff','#fc9838','#d82800'],speed:60,life:.25,size:1.6});}
   if(gone||f.x<cam.x-16||f.x>cam.x+view.w+16||f.y>ROWS*T+16||f.t>300)w.fire.splice(k,1);}
  stepBowser(w,p,a,auth);
  for(let k=w.debris.length-1;k>=0;k--){const d=w.debris[k];d.t++;d.vy+=.3;d.x+=d.vx;d.y+=d.vy;if(d.y>ROWS*T+20)w.debris.splice(k,1);}
  for(let k=w.pops.length-1;k>=0;k--){const q=w.pops[k];q.t++;q.y+=q.vy;q.vy+=.32;if(q.t>30){w.pops.splice(k,1);popText(w,'200',q.x,q.y);}}
  for(const [k,t] of w.bumps){if(t>=10)w.bumps.delete(k);else w.bumps.set(k,t+1);}
  for(let k=w.fireworks.length-1;k>=0;k--){const f=w.fireworks[k];f.t++;if(f.t>30)w.fireworks.splice(k,1);}
  if(p.inCastle)stepCastle(p,w);
 }
 // Bowser paces on his bridge, hops, and breathes fire at the runner's height; before he is on screen his flames
 // come in from the right
 function stepBowser(w,p,a,auth=true){
  const b=a.bowser,def=a.def,cam=cams[p.i];
  for(let k=w.flames.length-1;k>=0;k--){const f=w.flames[k];f.t=(f.t||0)+1;f.x+=f.vx;if(f.g){f.vy+=f.g;f.y+=f.vy;}else if(Math.abs(f.y-f.ty)>.6)f.y+=Math.sign(f.ty-f.y)*.6;if(f.y>ROWS*T+24||f.x<cam.x-40&&f.x<backX(cam,w,p.area)-40||f.t>420||f.look==='venom'&&solidAt(w,f.area,f.x,f.y))w.flames.splice(k,1);}
  if(!b)return;
  // the fall off the bridge: a moment's hang, then down at a capped speed so you watch him drop out of the screen
  if(b.state==='fall'){b.t=(b.t||0)+1;if(b.t>18){b.vy=Math.min(b.vy+.08,2.2);b.y+=b.vy;}return;}
  if(b.state==='dead'){b.vy+=.2;b.y+=b.vy;return;}
  // online Bowser and his flames run on the phone that runs the castle; this one shows its snapshots and flames {fl}
  if(!auth){b.mouth=Math.max(0,b.mouth-1);return;}
  // online he goes after whichever runner is nearer (the partner's real screen counts for "on screen")
  const q=pl[them],qIn=partnerIn(w,p.area)&&!q.dead,tgt=qIn&&(p.out||p.dead||Math.abs(q.x-b.x)<Math.abs(p.x-b.x))?q:p;
  const onScreen=b.x<cam.x+view.w+16||qIn&&b.x<(q.cx??q.x)+(q.vw||view.w)+16;
  const flame=f=>{f.look=b.ski?'ice':b.elvis?'note':b.god?'holy':undefined;w.flames.push(f);sfx.bowserFire();if(net)ev({fl:[w.key,p.area,Math.round(f.x),Math.round(f.y),Math.round(f.ty),f.vx,Math.round(performance.now()-netT0)]});};
  if(!onScreen){if(tgt.x>def.bowserFireFrom&&!tgt.axe){b.fireT--;if(b.fireT<=0){b.fireT=Math.round((140+Math.floor(s.random()*80))/(b.k||1));const ty=Math.floor(tgt.y/T)*T-[6,22,38][Math.floor(s.random()*3)];
   flame({x:tgt===p?cam.x+view.w+12:(q.cx??q.x)+(q.vw||view.w)+12,y:ty,ty,vx:-1.1,area:p.area});}}return;}
  if(p.axe||qIn&&q.axe)return;
  b.t++;b.dir=tgt.x>b.x?1:-1;
  // pace a little left and right of home
  if(b.t%120===0)b.goal=b.home+(Math.floor(s.random()*5)-2)*T;b.x+=clamp(b.goal-b.x,-.5,.5);
  const supported=()=>{const r=Math.floor((b.y+1)/T);return solid(tileAt(w,p.area,Math.floor((b.x-8)/T),r))||solid(tileAt(w,p.area,Math.floor((b.x+8)/T),r));};
  if(b.vy!==0||!supported()){b.vy+=.12;b.y+=b.vy;const r=Math.floor(b.y/T);if(b.vy>0&&supported()&&b.y>=r*T){b.y=r*T;b.vy=0;}if(b.y>ROWS*T+40){b.state='dead';}}
  else{b.jumpT--;if(b.jumpT<=0){b.jumpT=Math.round((90+Math.floor(s.random()*120))/(b.k||1));b.vy=-3;b.y-=1;}}
  b.mouth=Math.max(0,b.mouth-1);
  b.fireT--;if(b.fireT<=0){b.fireT=Math.round((110+Math.floor(s.random()*90))/(b.k||1));b.mouth=24;const ty=clamp(tgt.y-14,4*T,b.y-10);flame({x:b.x-18,y:b.y-20,ty,vx:-1.2,area:p.area});}
 }
 function stepCastle(p,w){
  const tl=p.tally;if(!tl)return;if(tl.phase==='time'&&SA.jingleOn())return;tl.t++;
  if(tl.phase==='time'){if(p.time>0){const n=Math.min(2,p.time);p.time-=n;p.score+=50*n;if(tl.t%3===0)sfx.tick();}else{tl.phase='fireworks';tl.t=0;}}
  else if(tl.phase==='fireworks'){if(p.fireworksDue>0){if(tl.t%32===1){const fl=AR(w,p.area).def.castle;w.fireworks.push({x:fl.x+(s.random()*6-1)*T,y:(3+s.random()*4)*T,t:0});p.score+=500;sfx.boom();p.fireworksDue--;}}
   else{tl.phase='flag';tl.t=0;}}
  else if(tl.phase==='flag'){w.castleFlag=Math.min(1,w.castleFlag+.03);if(tl.t>100){p.tally=null;stageClear(p);}}
 }
 // stage finished (castle entered, Toad reached): on to the next stage, or the end of World 1
 function stageClear(p){
  p.stagesCleared++;note(p,'clear '+(p.stage+1));
  if(mode==='race'){p.inCastle=true;return;}
  if(net&&mode==='world'){netStageDone(p,p.stage>=lastStage?-1:p.stage+1);return;}
  if(p.stage>=lastStage){
   if(boardCoop){p.done=true;p.stage=lastStage;for(const q of pl)if(!q.over)q.done=true;endGame();return;}
   if(mode==='world'&&!s.solo){p.done=true;p.stage=lastStage;advanceTurn();return;}
   p.lap++;p.stage=0;
  }else p.stage++;
  p.checkOn=false;worlds[p.i]=null;startCard(p.i);
 }
 // pipe 2 of the Warp Zone goes to World 2-1 (New Dork City); 3 and 4 still lead on to 1-3
 const warpTo=n=>n>=2&&(n-1)*4<=lastStage?(n-1)*4:Math.min(2,lastStage);
 // the Warp Zone: somebody you have not unlocked yet was hiding in the pipe; then on to 1-3
 function warpFound(p,n){
  p.warped=true;let id=null;goalReached(p);
  if(!s.gameRecruits[p.i].length){const pool=recruitPools[p.i].filter(c=>!s.gameRecruits[0].includes(c)&&!s.gameRecruits[1].includes(c));if(pool.length){id=pool[Math.floor(Math.random()*pool.length)];s.gameRecruits[p.i].push(id);s.react(p.i,'win');}}
  warpMsg={i:p.i,world:n,id,name:id?charName(id):null,t:0};phase='warp';sfx.warp();note(p,'warp zone '+n+' '+(id||'-'));
 }
 const updateCamera=(p,i,snapNow=false)=>{const cam=cams[i],a=worlds[i]&&AR(worlds[i],p.area);if(!a)return;const W=a.def.W*T;
  if(W<=view.w){cam.x=(W-view.w)/2;return;}
  const tx=p.x-view.w*.44;if(tx>cam.x||snapNow)cam.x=snapNow?Math.max(0,tx):tx;
  // Bowser's bridge (like the NES): the screen stops with the axe at its right edge until Bowser has fallen, so the
  // whole fight and his fall stay in view; only the walk to Toad scrolls on
  const ax=a.def.axe;let hi=W-view.w;if(ax&&!(p.axe&&(p.axe.phase==='walk'||p.axe.phase==='toad'||p.axe.phase==='ascend')))hi=Math.min(hi,ax.x+20-view.w);
  cam.x=clamp(cam.x,0,Math.max(0,hi));};

 // ---------------- drawing
 const qFrame=()=>[0,0,0,1,2,1][Math.floor(simT*8)%6];
 const tileImg=(kind,t)=>t===TILE.QBLOCK?tiles[kind].q[qFrame()]:tiles[kind][t];
 const kindOf=def=>def.kind==='athletic'?'athletic':def.kind;
 const BG={over:C.sky,athletic:C.sky,sky:C.sky,city:C.sky,roof:'#2c1c5c',subway:'#0c3070',tower:'#141c34',pier:'#160e36',coaster:'#160e36',funhouse:'#24082c',bigtop:'#2c040c',
  snow:'#9cd0fc',skilift:'#9cd0fc',icecave:'#0c2c4c',icepalace:'#8cc0e8',strip:'#160a24',desert:'#f8a868',slots:'#2c0408',casino:'#3c0408',
  jungle:'#7cc8e8',ruins:'#7cc8e8',dig:'#2c1808',volcano:'#2c0c08',hell:'#2c0404',hellcave:'#1c0404',bones:'#2c0404',fortress:'#14141a',heaven:'#bcdcfc',gates:'#bcdcfc',throne:'#f4f0e4'};
 const LIGHT_K=new Set(['snow','skilift','icepalace','desert','heaven','gates','throne','city','jungle','ruins']);
 const PROPS=new Set(['pine','snowman','neon','cactusd','skull','fern','fence','fossil','torch','firepot','harp']);
 const NOEXT=new Set(['sky','under','castle','subway','tower','funhouse','bigtop','icecave','icepalace','casino','dig','volcano','hellcave','fortress','throne']),THEMED=new Set(['snow','skilift','icecave','icepalace','strip','desert','slots','casino','jungle','ruins','dig','volcano','hell','hellcave','bones','fortress','heaven','gates','throne']);
 const bgOf=def=>BG[def.kind]||'#000';
 function drawTiles(w,an,x0,x1,y0,y1,back){
  const a=AR(w,an),def=a.def,kind=kindOf(def),W=def.W;
  const cs=Math.floor(x0/T),ce=Math.floor(x1/T),rs=Math.max(-1,Math.floor(y0/T)),re=Math.floor(y1/T);
  for(let cc=cs;cc<=ce;cc++){
   const inside=cc>=0&&cc<W,src=clamp(cc,0,W-1);
   for(let r=rs;r<=re;r++){
    let t,bump=0;
    if(r>=0&&r<ROWS){if(!inside){if(NOEXT.has(def.kind)||r<13)continue;t=a.tiles[r*W+src];if(t!==TILE.GROUND)continue;}else{t=a.tiles[r*W+cc];const b=w.bumps.get(a.ai*1e6+r*W+cc);if(b!==undefined)bump=-Math.sin(b/10*Math.PI)*5;}}
    else if(r>=ROWS){t=a.tiles[14*W+src];if(!(t===TILE.GROUND||t===TILE.CASTLE||t===TILE.LAVA||t===TILE.HARD||t===TILE.BRICK))continue;}
    else continue;
    if(!t||t===TILE.HIDDEN||(BACK[t]===1)!==back)continue;
    g.drawImage(t===TILE.TRUNK&&kind==='roof'&&(cc*7+r*3)%5<2?tiles.roof.trunkLit:tileImg(kind,t),cc*T,r*T+bump);}}
 }
 // how much to shrink the drawing so cap-to-boots is the NES height: measured from the character's normal face (hair and
 // cap sit on the measured head, so a tall hairdo would otherwise make one player taller than the other); same formulas as head()
 const runKs=new Map();
 function runK(id,big){const key=id+'|'+big;if(runKs.has(key))return runKs.get(key);
  const fw=big?FACE_W*HEAD_K:FACE_W*.86*HEAD_K_SMALL,chin=big?-20:-10,size=(big?30:26)*(big?HEAD_K:HEAD_K_SMALL);let top=null;
  try{const fh=HF.faceHeight(id,'normal',fw),geo=HF.faceGeom(id,'normal',fw,1,chin-fh*.44,HF.flipFor(id,'normal',1));
   if(geo){const topY=Math.min(geo.head.y,geo.face.y),brow=geo.face.y+geo.face.h*.14,ch=clamp((brow-topY)/1.36,3,size*.3);top=topY+ch*.92-ch*1.08;}}catch{}
  if(top===null)top=big?-34.5:-22;
  const k=clamp((big?NES_H_BIG:NES_H_SMALL)/-top,.5,1);if(id)runKs.set(key,k);return k;}
 const caps=new Map();
 function capOf(id,bg,crouchK,fw,chin,size){const key=id+'|'+bg+'|'+crouchK;if(caps.has(key))return caps.get(key);let c=null;
  try{const fh=HF.faceHeight(id,'normal',fw),geo=HF.faceGeom(id,'normal',fw,0,chin-fh*.44,false);
   if(geo)c={bw:geo.head.w,up:(geo.face.y+geo.face.h*.14)-Math.min(geo.head.y,geo.face.y)};}catch{}
  if(id)caps.set(key,c);return c;}
 // Yoshi (World 7 on): green saddled dinosaur; tongue = how far it is out
 function drawYoshi(x,y,dir,anim,tongue){g.save();g.translate(x,y);g.scale(dir,1);const st=Math.floor(anim)%2,R=(c,X,Y,W,H)=>{g.fillStyle=c;g.fillRect(X,Y,W,H);};
  R('#e86c1c',-7,-4,5,4-st);R('#e86c1c',1,-4,5,3+st);R('#3cb83c',-9,-14,14,10);R('#fcfcfc',-6,-10,9,6);R('#e8203c',-7,-17,9,4);R('#fcfcfc',-8,-15,3,2);
  R('#3cb83c',4,-24,7,12);R('#3cb83c',6,-26,9,9);R('#3cb83c',13,-24,5,6);R('#fcfcfc',7,-30,4,5);R('#000',9,-29,2,3);R('#e8203c',-11,-20,3,3);R('#e8203c',-12,-16,3,3);
  if(tongue>0){R('#fc5c8c',15,-21,tongue,2);g.fillStyle='#fc5c8c';g.beginPath();g.arc(15+tongue,-20,2.5,0,7);g.fill();}g.restore();}
 // Mario's body (P2 in Luigi colours) with the player's head under the cap. Feet at (0,0); facing right before mirroring.
 function drawRunner(p,alpha=1){
  const i=p.i;let thr=false;g.save();g.globalAlpha*=alpha;
  if(p.inv>0&&!p.tf&&(frames>>2)%2&&alpha===1)g.globalAlpha*=.35;
  let big=p.big,pal=p.fire?FIRE_PAL:PALS[i];
  if(p.tf){const flick=(p.tf.t>>2)%2;if(p.tf.to==='small')big=flick===0;else if(p.tf.from==='small')big=flick===1;if(p.tf.to==='fire'&&flick)pal=FIRE_PAL;else if(p.tf.to==='fire')pal=PALS[i];}
  if(p.star>0)pal=STAR_PALS[(frames>>(p.star<120?3:1))%4];
  const f=p.facing,crouch=p.crouch&&big;g.translate(p.x,p.y);
  // NES scale (owner, Nov 21): big Mario stands 2 blocks tall, small Mario 1 block; the whole drawing (body, face, cap) shrinks evenly round the feet
  {const k=runK(s.players[i]?.character,big);g.scale(k,k);}
  // riding Yoshi: he is drawn under Mario, who sits up on the saddle
  if(p.yoshi&&!p.dead){drawYoshi(0,0,f,p.anim,p.tongue>0?Math.round(30*Math.sin((18-p.tongue)/18*Math.PI)):0);g.translate(0,-12);}
  // the finale: Mario rises in a golden glow with a halo... then the power turns him evil (dark aura, horns)
  const asc=p.axe&&p.axe.phase==='ascend'?p.axe.t:0;
  if(asc){g.translate(0,-Math.min(30,asc*.12));const evil=asc>360;g.fillStyle=evil?'rgba(60,0,40,'+Math.min(.75,(asc-360)/200)+')':'rgba(252,236,140,'+(.25+.15*Math.sin(asc*.1))+')';g.beginPath();g.ellipse(0,-18,22,26,0,0,7);g.fill();if(evil)pal=EVIL_PAL;}
  // mega mushroom: grows to over twice the size (blinks back down as it wears off)
  if(p.mega>0){const m=p.mega<90&&(frames>>2)%2?1:1+1.3*(p.megaIn??1);g.scale(m,m);}
  // a ski-jump spin round the middle of the body
  if(p.spin&&!p.grounded){const hm=big?-16:-8;g.translate(0,hm);g.rotate(p.spinA*f);g.translate(0,-hm);}
  // the Elvis cape: white with gold sequins, streaming out behind while flying or gliding
  if(p.cape&&!p.dead){const fly=!p.grounded,cy=big?-19:-9,len=big?14:9;g.save();g.scale(f,1);g.fillStyle='#fcfcfc';g.beginPath();g.moveTo(-3,cy);
   if(fly){g.lineTo(-3-len*1.4,cy+2+Math.sin(simT*14)*2);g.lineTo(-3-len*1.2,cy+len*.5);g.lineTo(-2,cy+len*.4);}else{g.lineTo(-7,cy+len);g.lineTo(-1,cy+len+1);g.lineTo(1,cy+2);}
   g.closePath();g.fill();g.fillStyle='#f8c838';for(let k=0;k<4;k++)g.fillRect(fly?-5-k*len*.3:-5+k,cy+2+k*(fly?1:len*.22),1.5,1.5);g.fillStyle='#d8a000';g.fillRect(-3,cy-1,5,2);g.restore();}
  if(p.dead){body(false,'dead',0);head(false,'sad',0,f);g.restore();return;}
  const run=Math.abs(p.vx);let pose='stand';
  if(p.flag||p.climb)pose='pole';else if(p.pipe&&p.pipe.kind==='side')pose='walk';
  else if(crouch)pose='crouch';else if(p.swim&&!p.pipe)pose='swim';else if(!p.grounded&&!p.pipe)pose='jump';else if(p.skidding&&p.vx!==0&&Math.sign(p.vx)!==f)pose='skid';else if(run>.05||p.auto)pose='walk';
  const frame=pose==='swim'?((p.strokeT||0)>14?1:(p.strokeT||0)>0?2:0):Math.floor(p.anim)%3;
  thr=p.throwT>0&&pose!=='crouch';g.save();g.scale(f,1);body(big,pose,frame);if(p.skis&&!p.dead){g.fillStyle='#e8203c';g.fillRect(-12,-1,24,2);g.fillRect(10,-3,3,2);g.fillStyle='#fcfcfc';g.fillRect(-9,-1,4,1);g.fillRect(3,-1,4,1);}if(thr){if(big){R(pal.shirt,4,-21,6,3);R(C.skin,10,-21,2,3);}else{R(pal.shirt,3,-10,5,2);R(C.skin,8,-10,2,2);}}g.restore();
  head(big,asc>360?'angry':p.finished||p.inCastle||p.axe?'win':p.star>0||run>2.3?'happy':'normal',crouch?1:0,f);
  if(asc){const hy=big?-40:-26;if(asc<=360){g.strokeStyle='#f8d838';g.lineWidth=2;g.beginPath();g.ellipse(0,hy-4,8,2.5,0,0,7);g.stroke();g.lineWidth=1;}else{g.fillStyle='#8c0818';for(const sx of [-1,1]){g.beginPath();g.moveTo(sx*4,hy+4);g.lineTo(sx*9,hy-8);g.lineTo(sx*7,hy+5);g.fill();}}}
  // online: the bubble a lost life comes back in
  if(p.bubble>0){const r=big?24:17,cy=big?-20:-14,wob=Math.sin(simT*5)*1.2;g.globalAlpha=.85;g.fillStyle='rgba(160,220,255,.22)';g.strokeStyle='#bfe8ff';g.lineWidth=1.5;g.beginPath();g.ellipse(0,cy,r+wob,r-wob,0,0,7);g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.ellipse(-r*.45,cy-r*.5,r*.22,r*.12,-.6,0,7);g.fill();}
  g.restore();
  function R(col,X,Y,W,H){g.fillStyle=col;g.fillRect(X,Y,W,H);}
  function body(bg,pose,fr){
   if(pose==='dead'){R(pal.shirt,-5,-10,10,6);R(C.skin,-7,-16,2,6);R(C.skin,5,-16,2,6);R(pal.over,-4,-7,8,5);R(pal.shoe,-5,-2,4,2);R(pal.shoe,1,-2,4,2);return;}
   if(!bg){
    R(pal.shirt,-4,-10,8,5);R(pal.over,-3,-7,6,5);R(pal.over,-3,-10,1,3);R(pal.over,2,-10,1,3);
    // swimming, like the NES: glide with arms out front and legs trailing; a stroke pushes the arms down and kicks
    if(pose==='swim'){
     if(fr===0){if(!thr){R(pal.shirt,4,-9,4,2);R(C.skin,8,-9,2,2);}R(pal.shirt,3,-7,4,2);R(C.skin,7,-7,2,2);R(pal.over,-5,-3,4,2);R(pal.over,-2,-3,4,2);R(pal.shoe,-8,-2,4,2);R(pal.shoe,-5,-1,3,2);return;}
     if(fr===1){if(!thr){R(pal.shirt,4,-9,2,5);R(C.skin,4,-4,2,2);}R(pal.shirt,-6,-9,2,5);R(C.skin,-6,-4,2,2);R(pal.over,-4,-3,3,2);R(pal.over,1,-3,3,2);R(pal.shoe,-7,-2,4,2);R(pal.shoe,3,-1,4,2);return;}
     if(!thr){R(pal.shirt,4,-9,3,3);R(C.skin,6,-7,2,2);}R(pal.shirt,-6,-9,2,3);R(C.skin,-6,-7,2,2);R(pal.over,-3,-3,6,1);R(pal.shoe,-6,-2,4,2);R(pal.shoe,-1,-2,4,2);return;}
    if(pose==='jump'){if(!thr){R(pal.shirt,3,-15,2,6);R(C.skin,3,-17,2,2);}R(pal.shirt,-6,-9,2,3);R(C.skin,-6,-6,2,2);R(pal.over,-4,-3,3,2);R(pal.over,1,-4,3,2);R(pal.shoe,-6,-2,4,2);R(pal.shoe,3,-4,4,2);return;}
    if(pose==='pole'){R(pal.shirt,3,-14,2,5);R(C.skin,4,-16,2,2);R(pal.shirt,-5,-12,2,4);R(C.skin,-4,-13,2,2);R(pal.shoe,-2,-2,4,2);R(pal.shoe,2,-4,3,2);return;}
    if(pose==='skid'){R(pal.shirt,-6,-11,2,4);R(C.skin,-7,-12,2,2);R(pal.shoe,1,-2,5,2);R(pal.shoe,-4,-2,3,2);R(pal.over,-2,-3,4,1);return;}
    R(pal.shirt,-6,-9,2,4);R(C.skin,-6,-5,2,2);if(!thr){R(pal.shirt,4,-9,2,4);R(C.skin,4,-5,2,2);}
    if(pose==='walk'){const L0=[[-6,2],[-3,0],[-5,3]][fr],R0=[[2,2],[0,0],[3,1]][fr];R(pal.over,-3,-3,6,1);R(pal.shoe,L0[0],-2,4,2);R(pal.shoe,R0[0],-2-(fr===2?1:0),4,2);return;}
    R(pal.over,-3,-3,6,1);R(pal.shoe,-5,-2,4,2);R(pal.shoe,1,-2,4,2);return;}
   if(pose==='crouch'){R(pal.shirt,-5,-14,10,6);R(pal.over,-5,-10,10,6);R(pal.shirt,-7,-13,2,5);R(C.skin,-7,-8,2,2);R(pal.shoe,-6,-4,5,4);R(pal.shoe,1,-4,5,4);return;}
   R(pal.shirt,-5,-20,10,8);R(pal.over,-5,-14,10,8);R(pal.over,-4,-20,2,6);R(pal.over,2,-20,2,6);R('#fcbc3c',-3,-14,1,1);R('#fcbc3c',2,-14,1,1);
   if(pose==='swim'){
    if(fr===0){if(!thr){R(pal.shirt,5,-19,7,3);R(C.skin,12,-19,2,3);}R(pal.shirt,4,-15,6,3);R(C.skin,10,-15,2,3);R(pal.over,-7,-6,5,3);R(pal.over,-3,-5,5,3);R(pal.shoe,-11,-4,5,3);R(pal.shoe,-7,-2,4,2);return;}
    if(fr===1){if(!thr){R(pal.shirt,5,-19,2,9);R(C.skin,5,-10,2,2);}R(pal.shirt,-7,-19,2,8);R(C.skin,-7,-11,2,2);R(pal.over,-5,-6,4,3);R(pal.over,1,-5,4,3);R(pal.shoe,-9,-3,5,3);R(pal.shoe,4,-2,5,3);return;}
    if(!thr){R(pal.shirt,5,-19,4,4);R(C.skin,8,-16,2,3);}R(pal.shirt,-7,-19,2,5);R(C.skin,-7,-14,2,2);R(pal.over,-5,-6,10,3);R(pal.shoe,-7,-3,5,3);R(pal.shoe,0,-3,5,3);return;}
   if(pose==='jump'){if(!thr){R(pal.shirt,5,-27,2,9);R(C.skin,5,-29,2,2);}R(pal.shirt,-7,-19,2,6);R(C.skin,-7,-13,2,2);R(pal.over,-5,-6,4,3);R(pal.over,1,-8,4,3);R(pal.shoe,-7,-3,5,3);R(pal.shoe,3,-7,5,3);return;}
   if(pose==='pole'){R(pal.shirt,4,-27,2,8);R(C.skin,5,-29,2,2);R(pal.shirt,-6,-24,2,6);R(C.skin,-5,-26,2,2);R(pal.over,-3,-6,4,3);R(pal.shoe,-3,-3,5,3);R(pal.shoe,2,-7,4,3);return;}
   if(pose==='skid'){R(pal.shirt,-8,-21,2,6);R(C.skin,-9,-22,2,2);R(pal.over,-3,-6,6,3);R(pal.shoe,1,-3,6,3);R(pal.shoe,-5,-3,4,3);return;}
   R(pal.shirt,-7,-19,2,7);R(C.skin,-7,-12,2,2);if(!thr){R(pal.shirt,5,-19,2,7);R(C.skin,5,-12,2,2);}
   if(pose==='walk'){const a=[[-7,3],[-4,1],[-6,4]][fr],b=[[3,2],[0,0],[2,1]][fr];R(pal.over,-4,-6,8,3);R(pal.shoe,a[0],-3,5,3);R(pal.shoe,b[0],-3-(fr===2?1:0),5,3);return;}
   R(pal.over,-5,-6,4,3);R(pal.over,1,-6,4,3);R(pal.shoe,-6,-3,5,3);R(pal.shoe,1,-3,5,3);}
  // the head, then a NES cap sized to it: a crown hugging the top of the head and a short brim on the facing side
  function head(bg,mood,crouchK,fc){
   // heads at NES scale (owner, Nov 21): big Mario stands ~2 blocks tall and small Mario ~1.3, like the NES sprites
   const chin0=bg?(crouchK?-14:-20):-10,size=(bg&&!crouchK?30:26)*(bg?HEAD_K:HEAD_K_SMALL),hy=chin0-size*.45,hx=fc,box={w:0,h:0},id=s.players[i]?.character;
   // like Seanic/SotN (owner, Nov 13): the FACE (src/headFacts.js) is FACE_W wide with its chin on the shirt collar, hair
   // sticks out round it, it is mirrored only when it looks against the way Mario faces, and the cap hugs the measured top
   // of the head with its brim at the brow. Without facts (online photo) the old centred picture box is used.
   const fw=bg?FACE_W*HEAD_K:FACE_W*.86*HEAD_K_SMALL,chin=chin0,fh=HF.faceHeight(id,mood,fw),fy=chin-fh*.44,geo=HF.faceGeom(id,mood,fw,hx,fy,HF.flipFor(id,mood,fc));
   let bw,topY,ch,cw,cx;
   if(geo){HF.drawFace(s,g,i,hx,fy,fw/.6,mood,fc,.6);
    // one cap per character (owner, Nov 21: the hat kept changing size): its size comes from the NORMAL face and only its
    // spot follows the face showing now (brim on its brow, centred on it), so mood pictures can't grow or shrink it
    const cap=capOf(id,bg,crouchK,fw,chin,size)||{bw:geo.head.w,up:(geo.face.y+geo.face.h*.14)-Math.min(geo.head.y,geo.face.y)};
    const brow=geo.face.y+geo.face.h*.14;bw=cap.bw;cw=Math.max(bw*1.04,fw*1.12);ch=clamp(cap.up/1.36,3,size*.3);topY=brow-ch*1.36;cx=geo.face.x+geo.face.w/2+fc*(cw*.05-.7);}
   else{s.sprite(g,i,hx,hy,size,{exact:true,mood,still:true,noBadge:true,box});
    bw=box.w||size*.62;const bh=box.h||size*.8;topY=hy-bh/2;cw=Math.min(bw*1.04,size*.84);ch=clamp(bh*.24,3.6,size*.25);cx=hx+fc*(cw*.05-.7);}
   g.fillStyle=pal.cap;g.beginPath();g.ellipse(cx,topY+ch*.92,cw/2,ch*1.08,0,Math.PI,0);g.fill();
   g.fillRect(cx-cw/2,topY+ch*.9,cw,ch*.46);
   const b0=cx+fc*cw*.08,b1=cx+fc*(cw*.5+clamp(bw*.18,2.8,6));const bh2=Math.max(1.8,ch*.38);g.fillRect(Math.min(b0,b1),topY+ch*1.36-bh2,Math.abs(b1-b0),bh2);
   // the M / L emblem on the crown (red or green letter on a white patch; ringed when the cap itself is white)
   const ex=cx+fc*cw*.1,ey=topY+ch*.5,er=Math.max(2.2,ch*.5),light=pal.cap===C.white,ink=light?pal.shirt:pal.cap;
   g.fillStyle=C.white;g.beginPath();g.arc(ex,ey,er,0,7);g.fill();if(light){g.strokeStyle=ink;g.lineWidth=Math.max(.6,er*.22);g.stroke();}
   g.fillStyle=ink;g.font=`900 ${(er*1.45).toFixed(1)}px Arial,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(i?'L':'M',ex,ey+er*.08);
  }
 }
 function drawWorld(i){
  const p=pl[i],w=worlds[i];if(!w)return;
  const cam=cams[i],a=AR(w,p.area),def=a.def,an=p.area,x0=cam.x-T,x1=cam.x+view.w+T,y0=-view.band-T,y1=view.h-view.band+T;
  const kind=kindOf(def);
  g.fillStyle=bgOf(def);g.fillRect(cam.x-2,y0,view.w+4,y1-y0);
  if(kind==='city'||kind==='roof')A_.drawSkyline(g,cam.x,view.w,kind==='roof');else if(kind==='tower')A_.drawTowerGlass(g,cam.x,view.w,y0,y1);
  else if(kind==='pier'||kind==='coaster')A_.drawCarnivalNight(g,cam.x,view.w,simT,kind==='coaster');else if(kind==='funhouse')A_.drawFunhouseBg(g,cam.x,view.w,y0,y1);else if(kind==='bigtop')A_.drawBigTopBg(g,cam.x,view.w,y0,y1,simT);
  else if(THEMED.has(kind))A_.drawThemeBg(g,cam.x,view.w,kind,simT,y0,y1,!!def.wind&&windOn());
  for(const [m0,m1] of def.mirrors||[])if(m1*T>x0&&m0*T<x1){A_.drawMirrors(g,m0*T,m1*T,3*T,13*T,simT);nesText(g,'MIRROR MAZE',m0*T+8,5*T+4,'#f8d878');}
  for(const d of def.decor){if(d.x>x1+40||d.x+120<x0)continue;if(d.gy){g.save();g.translate(0,(d.gy-13)*T);}
   if(d.type==='hill')A_.drawHill(g,d.x,d.w);else if(d.type==='bush'){g.save();g.translate(0,13*T-8);A_.drawCloud(g,d.x,0,d.n,C.bush,C.green);g.restore();}else if(d.type==='castle')A_.drawCastle(g,tiles.over[TILE.BRICK],d.x-T*1.5);else if(d.type==='stall'||d.type==='balloons'||d.type==='funsign')A_.drawPierProp(g,d,simT);else if(PROPS.has(d.type))A_.drawThemeProp(g,d,simT);else if(d.type!=='cloud')A_.drawCityProp(g,d);else A_.drawCloud(g,d.x,d.y,d.n,C.white,C.cloud);if(d.gy)g.restore();}
  if(def.castle&&def.castle.x<x1&&def.castle.x+5*T>x0){A_.drawCastleFlag(g,def.castle.x+2.5*T,w.castleFlag);A_.drawCastle(g,(tiles[kind]||tiles.over)[TILE.BRICK],def.castle.x,true,bgOf(def));}
  if(def.flag&&def.flag.x>x0-30&&def.flag.x<x1+30)A_.drawFlagpole(g,def.flag,w.flagPos);
  for(const tx of def.texts)nesText(g,tx.str,tx.x,tx.y);
  drawTiles(w,an,x0,x1,y0,y1,true);
  for(const v of a.vines)if(v.c*T>x0-16&&v.c*T<x1)A_.drawVine(g,v.c*T+8,v.top,v.bottom);
  for(const e of a.enemies)if(e.alive&&e.type==='piranha'&&e.state!=='dying'&&e.x>x0&&e.x<x1)A_.drawPiranha(g,e);
  for(const it of w.items)if(it.area===an&&it.emerge>0)A_.drawItem(g,it,simT);
  // runners sit behind the tiles: a head that pokes into a block or a pipe disappears into it
  const o=ghostAt(i);
  if(o&&o.stage===p.stage&&o.area===an&&!o.inCastle&&o.x>x0-20&&o.x<x1+20)drawRunner(o,.42);
  if(partnerIn(w,an)&&pl[them].x>x0-20&&pl[them].x<x1+20)drawRunner(pl[them]);
  if(!p.inCastle&&!p.out)drawRunner(p);
  drawTiles(w,an,x0,x1,y0,y1,false);
  // ski ramps (a big kicker is taller, with a flag)
  for(const rp of def.ramps||[]){const rx=rp.c*T,b=(rp.r||13)*T,hh=rp.big?40:28,lo=rp.big?2*T:T;if(rx+T<x0||rx-lo>x1)continue;g.fillStyle='#fcfcfc';g.beginPath();g.moveTo(rx-lo,b);g.lineTo(rx+T,b-hh);g.lineTo(rx+T,b);g.closePath();g.fill();
   g.fillStyle='#bcdcfc';g.beginPath();g.moveTo(rx-lo,b);g.lineTo(rx+T,b-hh);g.lineTo(rx+T,b-hh+3);g.lineTo(rx-lo+6,b);g.closePath();g.fill();g.fillStyle='#3c7cfc';g.fillRect(rx+T-2,b-hh,2,hh);g.fillStyle='#e8203c';g.fillRect(rx-4,b-hh/2+2,3,2);
   if(rp.big){g.fillStyle='#5c5c6c';g.fillRect(rx+T-1,b-hh-14,1,14);g.fillStyle=(simT*3|0)%2?'#e8203c':'#f8c838';g.fillRect(rx+T,b-hh-14,7,5);}}
  for(const y of w.yoshiRun)if(y.area===an)drawYoshi(y.x,y.y,y.dir,y.t*.2,0);
  if(def.axe&&!pl[i].axe)A_.drawAxe(g,def.axe.x,def.axe.y,simT,def.axe.glass);
  if(def.toad)A_.drawToad(g,def.toad.x,def.toad.y);
  // balance lifts: a rope from each up to its pulley, the two pulleys joined
  a.lifts.forEach((l,k)=>{if(l.kind!=='bal'||l.snap||l.x+80<x0||l.x-80>x1)return;g.fillStyle='#d8c8a0';g.fillRect(l.x-.5,l.rope,1,l.y-l.rope);const m=a.lifts[l.mate];
   if(k<l.mate&&!m.snap){g.fillRect(Math.min(l.x,m.x),l.rope,Math.abs(m.x-l.x),1);for(const X of [l.x,m.x]){g.fillStyle='#9c9c9c';g.beginPath();g.arc(X,l.rope,4,0,7);g.fill();g.fillStyle='#d8c8a0';}}});
  for(const l of a.lifts)if(l.x+l.w>x0&&l.x-l.w<x1)A_.drawLift(g,l);
  for(const [k,sp] of (def.springs||[]).entries())if(sp.c*T>x0-T&&sp.c*T<x1)A_.drawSpring(g,sp.c*T+8,sp.r*T,(a.spr||[])[k]||0);
  for(const cn of def.cannons||[])if(cn.c*T>x0-T&&cn.c*T<x1)A_.drawCannon(g,cn.c*T,cn.r*T,cn.h);
  for(const fb of def.firebars){if(fb.x<x0-60||fb.x>x1+60)continue;const ang=fbAngle(fb,a);for(let k=0;k<fb.n;k++)A_.drawFireball(g,fb.x+Math.cos(ang)*k*8,fb.y+Math.sin(ang)*k*8,frames+k);}
  const list=def.coins,got=a.got,ph=simT*6;
  for(let k=0;k<list.length;k++){const q=list[k];if(q.x<x0||q.x>x1)continue;if(!got[k])A_.drawCoin(g,q.x,q.y,ph);}
  for(const q of w.pops)if(q.area===an)A_.drawCoin(g,q.x,q.y,simT*14);
  for(const it of w.items)if(it.area===an&&!it.emerge)A_.drawItem(g,it,simT);
  for(const e of a.enemies){if(!e.alive||!e.active||e.eaten||e.type==='piranha'&&e.state!=='dying')continue;if(e.type==='leaper'&&!(e.x<x0-16||e.x>x1+16)){A_.drawCheep(g,{...e,type:'cheepRed',y:e.y+4});continue;}if(e.type==='podoboo'&&e.state==='wait')continue;if(FOES[e.type]&&!(e.x<x0-16||e.x>x1+16)){A_.drawFoe(g,e,simT);continue;}if(e.x<x0-16||e.x>x1+16)continue;if(e.type==='goomba')A_.drawGoomba(g,e,kind==='under');else if(e.type==='piranha')A_.drawPiranha(g,e);else if(e.type==='cheep'||e.type==='cheepRed')A_.drawCheep(g,e);else if(e.type==='blooper')A_.drawBlooper(g,e);else if(e.type==='ghost')A_.drawGhost(g,e,simT);else if(e.type==='buzzy')A_.drawBuzzy(g,e);else A_.drawKoopa(g,e);}
  if(a.bowser&&a.bowser.x<x1+40){const b=a.bowser;if(b.fake)A_.drawGoomba(g,{x:b.x,y:b.y,state:'dying',frame:0},false);else A_.drawBowser(g,b,simT);}
  for(const f of w.flames)if(f.area===an)A_.drawFlame(g,f,simT);
  for(const f of w.fire)if(f.area===an)A_.drawFireball(g,f.x,f.y,f.t);
  for(const q of w.bubbles||[])if(q.area===an){g.strokeStyle='#bcdcfc';g.lineWidth=1;g.beginPath();g.arc(q.x,q.y,2,0,7);g.stroke();}
  for(const d of w.debris){if(d.area!==an)continue;g.save();g.translate(d.x,d.y);g.rotate(d.t*.3);g.fillStyle=d.ice?'#bcecff':kind==='under'?C.teal:C.brick;g.fillRect(-3,-3,6,6);g.fillStyle='#000';g.fillRect(-3,2,6,1);g.restore();}
  for(const f of w.fireworks)A_.drawFirework(g,f);
  w.fx.draw(g);
  if(p.axe&&p.axe.phase==='ascend'){const t=p.axe.t,cx=cam.x+view.w/2,nm=(s.players[i].name||'MARIO').toUpperCase();const say=(l,y,c)=>nesText(g,l,Math.round(cx-textW(l)/2),y,c);
   if(t>40&&t<360){say(`${nm} HAS BECOME`,4*T,'#f8d838');say('A GOD!',5*T,'#f8d838');}
   if(t>380&&t<720){say('BUT ABSOLUTE POWER...',4*T,'#fc7460');if(t>500)say('CORRUPTS ABSOLUTELY.',5*T,'#fc3c3c');}
   if(t>700){g.fillStyle=`rgba(0,0,0,${Math.min(1,(t-700)/80)})`;g.fillRect(cam.x-2,-view.band-T,view.w+4,view.h+2*T);if(t>780)say('TO BE CONTINUED...',7*T,'#fcfcfc');}}
  if(p.axe&&p.axe.phase==='toad'){const cx=cam.x+view.w/2,nm=s.players[i].name;
   const l1=`THANK YOU ${nm}!`;nesText(g,l1,Math.round(cx-textW(l1)/2),5*T);
   if(p.axe.t>90){for(const [k,l] of (def.toadLines||['BUT OUR PRINCESS IS IN','ANOTHER CASTLE!']).entries())nesText(g,l,Math.round(cx-textW(l)/2),7*T+k*16);}}
 }
 const fmtRace=sec=>`${Math.floor(sec/60)}'${String(Math.floor(sec%60)).padStart(2,'0')}"${String(Math.floor(sec*100%100)).padStart(2,'0')}`;
 const stageName=p=>STAGES[p.stage].name;
 // the NES status bar: NAME / score, coins, WORLD, TIME (in game pixels, inside the 256-wide frame)
 function drawHUD(i,{time=true}={}){
  const p=pl[i],fx=view.fx,y=hudY(),name=s.players[i].name.toUpperCase().replace(/[^A-Z0-9 ]/g,'').slice(0,8)||(i?'LUIGI':'MARIO');
  // bright stages (snow, Heaven) get a soft dark band so the white status bar stays readable
  {const w=worlds[i],k=w&&AR(w,p.area)?.def.kind;if(LIGHT_K.has(k)){g.fillStyle='rgba(0,0,0,.32)';g.fillRect(fx+18,y-3,226,20);}}
  nesText(g,name,fx+24,y);nesText(g,String(p.score%1e6).padStart(6,'0'),fx+24,y+8);
  g.save();g.translate(fx+92,y+12);g.scale(.55,.55);A_.drawCoin(g,0,0,phase==='play'?Math.floor(simT*3)%2*2:0);g.restore();
  nesText(g,'×'+String(mode==='world'?p.coins%100:p.coins).padStart(2,'0'),fx+96,y+8);
  nesText(g,'WORLD',fx+144,y);nesText(g,stageName(p),fx+152,y+8);
  nesText(g,'TIME',fx+200,y);
  if(time){const t=mode==='world'?String(p.time).padStart(3,'0'):mode==='coins'?String(Math.ceil(Math.max(0,COIN_TIME-clock))).padStart(3,'0'):String(Math.floor(p.finished?p.finishT:clock)).padStart(3,'0');
   nesText(g,t,fx+208,y+8,mode==='coins'&&COIN_TIME-clock<10&&(frames>>4)%2?'#fc7460':'#fcfcfc');}
  // online: the partner's line under the bar (and where they are when it isn't here)
  if(net&&phase!=='title'){const q=pl[them],n1=s.players[them].name.toUpperCase().replace(/[^A-Z0-9 ]/g,'').slice(0,8)||(them?'LUIGI':'MARIO');
   const val=mode==='coins'?`×${String(q.coins).padStart(2,'0')}`:mode==='race'?(q.finished?fmtRace(q.finishT):`${prog(q)}%`):`${String(q.score).padStart(6,'0')} ×${q.lives}`;
   const where=q.out?' OUT':q.done?' DONE':q.stage!==p.stage?` ${STAGES[q.stage]?.name||''}`:q.area!==p.area&&!p.out?(q.area==='main'?' ▲':' ▼'):'';
   nesText(g,`${n1} ${val}${where}`,fx+24,y+20,them?'#9cfc88':'#fcbcb0');}
  // P2's target from P1's turn (not part of the NES bar; shown under it)
  if(i===1&&!twoPlayer&&phase!=='title'&&!net){const q=pl[0],n0=s.players[0].name.toUpperCase().replace(/[^A-Z0-9 ]/g,'').slice(0,8);
   const goal=mode==='coins'?`${q.coins} COINS`:mode==='race'?(q.finished?fmtRace(q.finishT):'---'):String(q.score).padStart(6,'0');
   nesText(g,`TO BEAT ${n0} ${goal}`,fx+24,y+20,'#fcbcb0');}
 }
 // the title screen: World 1-1's first screen, the logo, the menu and TOP score
 function drawTitle(){
  // the world you're about to start shows behind the menu: its first stage's opening screen (owner, Nov 21)
  const si=mode!=='world'?0:boardCoop?(coopWorld()-1)*4:worldPick()?(startW-1)*4:0,st=STAGES[si]||STAGES[0],sp=st.start||{x:40,y:13*T,area:'main'};
  if(!worlds[0]||worlds[0].st!==st)worlds[0]=makeWorld(st);
  const fx=view.fx;cams[0].x=Math.max(0,sp.x-40)-fx;Object.assign(pl[0],{stage:si,x:sp.x,y:sp.y,area:sp.area||'main'});
  g.save();g.translate(fx,0);
  drawWorld(0);if(!s.solo)drawRunner({...pl[1],stage:si,x:sp.x+24,y:sp.y,area:sp.area||'main'});
  A_.drawLogo(g,40,32);
  if(boardCoop){nesText(g,'2 PLAYER CO-OP',88,144);nesText(g,`WORLD ${coopWorld()}`,88+Math.round((textW('2 PLAYER CO-OP')-textW('WORLD 1'))/2),162,'#fc9838');}
  else{nesText(g,net?'2 PLAYER ONLINE':'1 PLAYER GAME',88,144);if(!s.solo&&!net)nesText(g,'2 PLAYER GAME',88,160);}
  const my=s.solo||net||boardCoop?144:mode==='world'?(menuSel?160:144):160;g.save();g.translate(80,my+8);A_.drawItem(g,{type:'mushroom',x:0,y:0},0);g.restore();
  if(worldPick()){const t=`WORLD ${startW}`,wx=88+Math.round((textW('2 PLAYER GAME')-textW(t))/2);nesText(g,t,wx,176,'#fc9838');
   g.fillStyle='#fc9838';const tri=(x,dir)=>{for(let k=0;k<4;k++)g.fillRect(dir>0?x+k:x+3-k,179-k,1,1+2*k);};tri(wx-12,-1);tri(wx+textW(t)+6,1);}
  nesText(g,'TOP- '+String(top).padStart(6,'0'),96,worldPick()?196:184);
  g.restore();
 }
 // black interstitial: WORLD 1-x and lives, GAME OVER, or the Warp Zone message
 function drawCard(i){
  const p=pl[i],fx=view.fx,cx=view.w/2;g.fillStyle='#000';g.fillRect(0,-view.band,view.w,view.h);
  drawHUD(i,{time:false});
  if(cardKind==='gameover'){const t='GAME OVER';nesText(g,t,Math.round(cx-textW(t)/2),120);return;}
  const t=`WORLD ${stageName(p)}`;nesText(g,t,Math.round(cx-textW(t)/2),80);{const sub=STAGES[p.stage].title;if(sub)nesText(g,sub,Math.round(cx-textW(sub)/2),140,'#fc9838');}
  const mx=Math.round(cx-24);drawRunner({...p,x:mx+8,y:128,vx:0,dead:0,grounded:true,pipe:null,flag:null,tf:null,star:0,inv:0,crouch:false,skidding:false,facing:1,auto:false,finished:false,inCastle:false,axe:null});
  if(mode==='world')nesText(g,`×  ${p.lives}`,mx+30,112);else nesText(g,s.players[i].name.slice(0,10),mx+30,112);
  if(mode==='world'&&twoPlayer){const n=s.players[i].name.toUpperCase().slice(0,10);nesText(g,`${n}'S TURN`,Math.round(cx-textW(`${n}'S TURN`)/2),160,'#fcbcb0');}
 }
 function drawWarpMsg(){
  const m=warpMsg,cx=view.w/2;g.fillStyle='#000';g.fillRect(0,-view.band,view.w,view.h);drawHUD(m.i,{time:false});
  const first=m.id?m.name.split(' ')[0].toUpperCase().slice(0,14):'',nameLines=m.id?wrap(m.name.toUpperCase(),26):[];
  const w2=warpTo(m.world)>3,head=w2?[`WARP TO WORLD ${m.world}!`,'#fc9838']:[`WE HAVEN'T MADE WORLD ${m.world} YET,`];
  const lines=m.id?[head,[w2?'AND IN THE TUNNEL':'BUT YOU FOUND'],null,...nameLines.map(l=>[l,'#fc9838']),[w2?'WAS HIDING!':'HIDING IN THE TUNNEL!'],'pic',[`${first} JOINS YOUR TEAM!`,'#fc9838']]
   :w2?[head,null,['NEXT STOP:'],[STAGES[warpTo(m.world)].title||'',`#fc9838`]]:[[`WE HAVEN'T MADE WORLD ${m.world} YET.`],null,['NOBODY ELSE IS HIDING'],['IN THIS TUNNEL.'],null,['ON TO WORLD 1-3!']];
  let y=44,chars=0;const shown=Math.floor(m.t/1.6);
  for(const l of lines){
   if(l===null){y+=8;continue;}
   if(l==='pic'){if(m.id&&shown>chars){const im=portraitImg(m.id),sz=64;if(im.complete&&im.naturalWidth){const sc=Math.min(sz/im.naturalWidth,sz/im.naturalHeight),k=Math.min(1,(shown-chars)/12);g.save();g.translate(cx,y+sz/2+4);g.scale(k,k);g.drawImage(im,-im.naturalWidth*sc/2,-im.naturalHeight*sc/2,im.naturalWidth*sc,im.naturalHeight*sc);g.restore();}}y+=76;chars+=12;continue;}
   const [txt,col='#fcfcfc']=l;nesText(g,txt.slice(0,Math.max(0,shown-chars)),Math.round(cx-textW(txt)/2),y,col);chars+=txt.length;y+=13;}
  if(shown>chars+20&&(frames>>5)%2)nesText(g,'TAP TO CONTINUE',Math.round(cx-60),y+14,'#fcbcb0');
 }
 const wrap=(str,n)=>{const out=[];let line='';for(const wd of str.split(' ')){if((line+' '+wd).trim().length>n){out.push(line);line=wd;}else line=(line+' '+wd).trim();}if(line)out.push(line);return out;};
 // touch guides float over the bottom corners
 function drawTouchGuides(i){
  if(!(touchUI||clock<6&&phase==='play'))return;const pd=pads[i],a=touchUI?1:clamp(1-clock/6,0,1),u=Math.min(s.W,s.H)/390;
  g.save();g.fillStyle='#fff';g.strokeStyle='#fff';g.lineWidth=2;
  const jr=Math.min(s.H*.13,46*u+8),pad=14,jx=s.W-jr-pad*1.6,jy=s.H-jr-pad*1.6;g.globalAlpha=(pd.jump?.38:.16)*a;g.beginPath();g.arc(jx,jy,jr,0,7);g.fill();g.globalAlpha=.6*a;outlined(g,'A',jx,jy,{size:Math.round(jr*.6),fill:'#fff',stroke:'#000'});
  if(pd.stick){const st=pd.stick;g.globalAlpha=.25;g.beginPath();g.arc(st.sx,st.sy,40,0,7);g.stroke();g.globalAlpha=.4;g.beginPath();g.arc(clamp(st.x,st.sx-44,st.sx+44),clamp(st.y,st.sy-44,st.sy+44),16,0,7);g.fill();}
  else{g.globalAlpha=.16*a;const r=Math.min(s.H*.12,44*u+6),sx=pad*1.6+r,sy=s.H-r-pad*1.6;g.beginPath();g.arc(sx,sy,r,0,7);g.stroke();g.globalAlpha=.45*a;outlined(g,pl[i].fire?'◀ ▶ · TAP 🔥':'◀  ▶',sx,sy,{size:Math.round(r*.32),fill:'#fff',stroke:'#000'});}
  g.restore();
 }
 const hudY=()=>(view.band>40?Math.round(-view.band+48/view.sc):16)+(net?Math.ceil(24/view.sc):0);   // online: clear of the duel chip
 function layoutView(){const sc=Math.min(s.W/256,s.H/240);view.sc=sc;view.w=s.W/sc;view.h=s.H/sc;view.band=view.h>240?Math.round((view.h-240)*.55):0;view.fx=Math.floor((view.w-256)/2);}

 // ---------------- flow: title → hand-off → WORLD card → play → (death / clear / warp) … → results
 // Solo: World 1 loops (rescue Toad → back to 1-1 with your lives and score) until game over;
 // Coin Rush needs a growing coin goal each round and Castle Dash a shrinking clock.
 let soloTotal=0,soloCleared=0,soloOk=false;const coinGoal=()=>15+5*soloCleared,dashCap=()=>s.solo?Math.max(45,RACE_CAP-15*soloCleared):RACE_CAP;
 const soloPoints=p=>mode==='coins'?p.coins*10:p.finished?1000+Math.max(0,Math.round((dashCap()-p.finishT)*10)):prog(p)*5;
 function soloAfter(){const p=pl[0];soloTotal+=soloPoints(p);
  if(!soloOk)return soloFinish(s,soloTotal,soloCleared,mode==='coins'?`World 1 Coin Rush solo: ${soloCleared} round${soloCleared===1?'':'s'} beaten; ${p.coins}/${coinGoal()} coins on the last.`:`World 1-1 Castle Dash solo: ${soloCleared} dash${soloCleared===1?'':'es'} in time; last run ${score(p)}.`);
  soloCleared++;soloProgress(s,soloTotal,soloCleared,mode==='coins'?`World 1 Coin Rush solo: ${soloCleared} round${soloCleared===1?'':'s'} beaten.`:`World 1-1 Castle Dash solo: ${soloCleared} dash${soloCleared===1?'':'es'} in time.`);
  pl[0]=makePlayer(0);worlds[0]=makeWorld(STAGES[0]);cams[0].x=0;beginTurn(0);}
 function startFromTitle(){if(phase!=='title'||titleT<.4)return;twoPlayer=mode==='world'&&menuSel===1&&!s.solo&&!net||boardCoop;
  if(boardCoop){const st=(coopWorld()-1)*4;for(const q of pl){q.stage=st;q.lives=1;}note(pl[0],'board co-op world '+coopWorld());}
  if(worldPick()&&startW>1){for(const q of pl)q.stage=(startW-1)*4;note(pl[0],'start world '+startW);}note(pl[0],twoPlayer?'2 player game':'1 player game');beginTurn(net?me:0);}
 async function beginTurn(i){
  // online: no hand-off; both phones show the WORLD card and start together
  if(net){phase='handoff';await nf.start('go');if(!s.alive||netStarted)return;netStarted=true;netT0=performance.now();netStep=0;clock=0;acc=0;startCard(i);return;}   // i = this phone's player
  phase='handoff';turn=i;for(const pd of pads){pd.stick=null;pd.jump=null;}for(const inp of inputs)Object.assign(inp,{l:0,r:0,d:0,jump:0,b:0,press:0,bPress:0});
  const n0=s.players[0].name,n1=s.players[1].name,me=s.players[i].name,other=s.players[1-i].name;let desc,summary=null;
  if(s.solo){desc=mode==='world'?`Play World 1 with ${LIVES} lives. Rescue Toad and the world starts over with your score and lives; keep going until game over.`:mode==='coins'?`Round ${soloCleared+1}: grab at least ${coinGoal()} coins in 60 seconds to reach the next round.`:`Dash ${soloCleared+1}: reach the flagpole within ${dashCap()} seconds to go again with less time.`;
   if(soloCleared)summary=`${soloTotal.toLocaleString()} points so far.`;}
  else if(boardCoop){const wn=stageName(pl[i]);
   desc=pl[1-i].over?`${me}, take over in World ${wn}, right where ${other} fell. One life: keep going as far as you can. Highest score wins.`
    :`Co-op from World ${wn}: one life each. ${me} goes first; when you die, ${other} carries on from the same spot. The furthest world you reach is where the next Mario game on this board starts. Highest score wins.`;
   if(pl[1-i].over)summary=`${n0}: ${pl[0].score} · ${n1}: ${pl[1].score}`;}
  else if(mode==='world'){
   if(twoPlayer)desc=pl[i].deaths===0&&pl[i].stagesCleared===0?`${me}, you are ${i?'Luigi':'Mario'}. Play until you lose a life, then hand the phone to ${other}. Three lives each; the highest score wins.`:`${me}'s turn: World ${stageName(pl[i])}, ${pl[i].lives} ${pl[i].lives===1?'life':'lives'} left.`;
   else desc=i===0?`You go first: play World 1 until you rescue Toad or run out of lives. ${n1} plays next against your ghost. Highest score wins.`:`Beat ${n0}'s score of ${pl[0].score}. ${n0}'s ghost runs beside you.`;
   if(twoPlayer&&(pl[1-i].deaths||pl[i].deaths))summary=`${n0}: ${pl[0].score} · ${n1}: ${pl[1].score}`;else if(!twoPlayer&&i)summary=`${n0}: ${pl[0].score} points, reached World ${stageName(pl[0])}.`;
  }else{
   desc=i===0?(mode==='coins'?`You go first: grab as many coins as you can in 60 seconds. ${n1} plays next against your ghost.`:`You go first: reach the flagpole as fast as you can. ${n1} plays next against your ghost.`)
    :(mode==='coins'?`Beat ${n0}'s ${pl[0].coins} coins in 60 seconds. ${n0}'s ghost runs beside you.`:`Beat ${n0}'s ${pl[0].finished?'time of '+fmtRace(pl[0].finishT):'run'}. Follow or overtake ${n0}'s ghost.`);
   if(i)summary=`${n0}: ${score(pl[0])}. ${n1}, take the controls.`;
  }
  SA.hold(true);const go=await s.pass(i,desc,'Ready',s.solo?{summary,soloTitle:mode==='world'?'World 1':mode==='coins'?`Round ${soloCleared+1}`:`Dash ${soloCleared+1}`}:{summary});SA.hold(false);if(!go)return;
  if(!twoPlayer){clock=0;gi=0;}acc=0;
  startCard(i);
 }
 function startCard(i){
  phase='card';cardKind='world';cardT=0;turn=i;const p=pl[i];noteWorld(p);
  placeRunner(p,true);
 }
 function deathDone(p){
  if(net){if(mode==='world'){p.lives--;if(p.lives<=0){p.lives=0;p.out=true;p.dead=0;note(p,'out');ev({out:1});checkNetEnd();return;}}netRespawn(p);return;}
  if(mode!=='world'){respawnHere(p);return;}
  p.lives--;
  if(boardCoop){noteWorld(p);const q=pl[1-p.i];if(!q.over&&!q.done){q.stage=p.stage;q.checkOn=p.checkOn;worlds[q.i]=null;}}
  if(p.lives<=0){p.over=true;phase='card';cardKind='gameover';cardT=0;sfx.over();return;}
  if(twoPlayer&&!pl[1-p.i].over&&!pl[1-p.i].done){beginTurn(1-p.i);return;}
  startCard(p.i);
 }
 function advanceTurn(){
  const i=turn;
  if(s.solo){const p=pl[0];return soloFinish(s,p.score,p.stagesCleared,`World 1 solo: ${p.score.toLocaleString()} points, ${p.stagesCleared} stage${p.stagesCleared===1?'':'s'} cleared${p.lap?` (loop ${p.lap+1})`:''}, game over in ${stageName(p)}.`,p.stagesCleared>0);}
  if(twoPlayer){const o=1-i;if(!pl[o].over&&!pl[o].done)beginTurn(o);else if(!pl[i].over&&!pl[i].done)startCard(i);else endGame();}
  else if(i===0)beginTurn(1);else endGame();
 }
 const score=q=>mode==='coins'?`${q.coins} coins`:mode==='race'?(q.finished?fmtRace(q.finishT):`${prog(q)}% of the way`):`${q.score} points`;
 const prog=q=>q.finished?100:Math.min(99,Math.round(clamp((q.best-40)/(STAGES[0].areas.main.flag.x-40),0,1)*100));
 function endGame(){
  phase='end';endT=0;const a=pl[0],b=pl[1];
  if(mode==='world')winner=a.score===b.score?-2:a.score>b.score?0:1;
  else if(mode==='coins')winner=a.coins===b.coins?-2:a.coins>b.coins?0:1;
  else if(a.finished&&b.finished)winner=Math.abs(a.finishT-b.finishT)<.01?-2:a.finishT<b.finishT?0:1;
  else if(a.finished||b.finished)winner=a.finished?0:1;else winner=Math.abs(a.best-b.best)<4?-2:a.best>b.best?0:1;
  endText=winner===-2?'DEAD HEAT!':mode==='race'&&pl[winner].finished?`THANK YOU ${s.players[winner].name.toUpperCase()}!`:`${s.players[winner].name.toUpperCase()} WINS!`;
  if(winner>=0)s.react(winner,'win');if(!SA.jingle('clear'))jingle([523,659,784,1047,1319],{type:'square',vol:.035,step:.1});
 }
 const turnOver=p=>mode==='coins'?clock>=COIN_TIME:mode==='race'?(p.finished&&(p.inCastle&&p.castleT>40||clock-p.finishT>6)||clock>=dashCap()||turn===1&&pl[0].finished&&!p.finished&&clock>pl[0].finishT+4):false;
 const still={l:0,r:0,d:0,jump:0,b:0,press:0,bPress:0};

 // ---------------- online: this phone's runner {f} ~20/s; world changes as events (see the top of the file)
 let itemSeq=0,graceUntil=0,nextStage=0,bot=null,netStarted=false;const theirDone=new Map();
 function ev(e){if(nf)nf.event(e);}
 const enemyRef=(w,e)=>{for(const [an,a] of Object.entries(w.areas)){const k=a.enemies.indexOf(e);if(k>=0)return [an,k];}return null;};
 function esync(w,e){if(!net||w.key==null)return;const r=enemyRef(w,e);if(r)e.lock=evA({es:[w.key,r[0],r[1],e.state,e.type,Math.round(e.x*10)/10,Math.round(e.y*10)/10,e.vx,e.vy]});}
 // an event that changes what the area's runner phone simulates: numbered, so this phone ignores snapshots older than it
 function evA(e){ev(e);return ++esOut;}
 // someone standing on a lift (the partner online: by where their phone says they are)
 const onLift=(q,l,an)=>!!q&&q.area===an&&!q.dead&&(q.ride===l||!!q.grounded&&Math.abs(q.x-l.x)<=l.w/2+HW-1&&Math.abs(q.y-l.y)<2);
 const partnerIn=(w,an)=>!!net&&!!pl[them].net&&!pl[them].out&&!pl[them].inCastle&&w&&pl[them].wk===w.key&&pl[them].area===an;
 // the partner's camera (its own screen width: a landscape phone sees twice as far as a portrait one)
 const reachR=(cam,w,an)=>partnerIn(w,an)?Math.max(cam.x+view.w,(pl[them].cx??pl[them].x)+(pl[them].vw||view.w)):cam.x+view.w;
 const backX=(cam,w,an)=>partnerIn(w,an)?Math.min(cam.x,pl[them].cx??pl[them].x-view.w*.44):cam.x;
 // ---- who runs an area. Both phones simulate the area they are in (so play stays smooth), but one of them is the
 // authority and streams its enemies, power-ups and Bowser ({ws} in the snapshot, ~10/s): player 1's phone for the area
 // it is in, player 2's phone for an area player 1's isn't in (no fresh player-1 snapshot of it for 0.7 s). The other phone
 // follows those snapshots: an enemy the authority lists is set to its state, one it lists as gone is removed, one it
 // hasn't woken yet is left alone (never a guess from silence). Changes this phone made itself (stomps, kicks, kills,
 // Bowser hits) are numbered events; a snapshot that hasn't seen them yet (ack) doesn't undo them.
 let netT0=0,netStep=0,esOut=0,esIn=0,wsSeq=0,wsF=-99;const hostSeen=new Map(),stepped={k:null,an:null,f:-99};
 const areaId=(k,an)=>k+':'+an;
 function authHere(w,an){if(!net||me===0)return true;const t=hostSeen.get(areaId(w.key,an));return !t||performance.now()-t>700;}
 const steppingHere=(k,an)=>stepped.k===k&&stepped.an===an&&frames-stepped.f<12;
 function packArea(){const p=pl[me],w=worlds[me];if(!w||w.key==null||!steppingHere(w.key,stepped.an)||frames-wsF<6)return null;const an=stepped.an;if(!authHere(w,an))return null;
  wsF=frames;const a=AR(w,an),r=n=>Math.round(n*10)/10,e=[];
  a.enemies.forEach((o,k)=>{if(o.alive&&o.active)e.push([k,o.state,o.type,r(o.x),r(o.y),+o.vx.toFixed(3),+o.vy.toFixed(3),o.t|0,r(o.off||0),+(o.ph||0).toFixed(3),o.kick??-1]);});
  const b=a.bowser;
  return {k:w.key,a:an,n:++wsSeq,ms:Math.round(performance.now()-netT0),ack:esIn,m:a.enemies.map(o=>!o.alive?0:o.active?2:1).join(''),e,
   it:w.items.filter(i=>i.area===an&&i.id&&!i.emerge).map(i=>[i.id,r(i.x),r(i.y),+i.vx.toFixed(3),+i.vy.toFixed(3)]),
   b:b?[r(b.x),r(b.y),+b.vy.toFixed(3),b.state,b.hp,b.dir,b.mouth,r(b.goal),b.fireT,b.jumpT,b.t]:0};}
 function applyArea(d){if(!d||!Number.isInteger(d.k)||typeof d.a!=='string')return;
  if(me!==0)hostSeen.set(areaId(d.k,d.a),performance.now());
  else if(steppingHere(d.k,d.a))return;   // player 1's phone runs the area it is in
  const w=W(d.k),a=w&&AR(w,d.a);if(!a||typeof d.m!=='string')return;
  const age=clamp((performance.now()-netT0-(+d.ms||0))*.06,0,20),listed=new Map((d.e||[]).map(x=>[x[0],x]));
  a.enemies.forEach((e,k)=>{const st=d.m[k];if(st===undefined||(e.lock||0)>d.ack)return;
   if(st==='0'){if(e.alive&&e.state!=='dying'&&e.state!=='squash')e.alive=false;return;}
   const x=listed.get(k);if(st!=='2'||!x)return;
   const [,state,type,sx,sy,vx,vy,t,off,ph,kick]=x,fall=state==='dying'||state==='squash';
   if(!e.alive){if(fall)return;e.alive=true;}
   const tx=sx+(state==='walk'||state==='shell'?vx*age:0);
   Object.assign(e,{active:true,state,type,vx,vy,t,off,ph,kick,remote:kick!==me});
   if(Math.abs(tx-e.x)>24||fall)e.x=tx;else e.x+=(tx-e.x)*.5;e.y=sy;});
  for(const [id,x,y,vx,vy] of d.it||[]){const it=w.items.find(i=>i.id===id&&i.area===d.a);if(!it||it.emerge)continue;const tx=x+vx*age;if(Math.abs(tx-it.x)>24)it.x=tx;else it.x+=(tx-it.x)*.5;it.y=y;it.vx=vx;it.vy=vy;}
  const b=a.bowser;if(b&&Array.isArray(d.b)&&b.state!=='dead'&&b.state!=='fall'){const [x,y,vy,state,hp,dir,mouth,goal,fireT,jumpT,t]=d.b;
   if(Math.abs(x-b.x)>24)b.x=x;else b.x+=(x-b.x)*.5;Object.assign(b,{y,vy,dir,mouth,goal,fireT,jumpT,t});if((b.lock||0)<=d.ack)b.hp=hp;
   if(state==='dead'||state==='fall'){b.state=state;if(state==='dead'&&b.vy===0)b.vy=-3;}}}
 // World 1: the first one to the goal gives the other NET_GRACE seconds; Castle Dash: the race is on the flag time
 function goalReached(p){if(!net||p.i!==me||mode==='coins')return;ev({gl:[p.stage]});}
 function netStageDone(p,next){graceUntil=0;nextStage=next;phase='stage-wait';ev({sc:[p.stage,next]});tryAdvance();}
 // both start the next stage together: wait until the partner is through too (or out of lives, or gone)
 function tryAdvance(){if(phase!=='stage-wait')return;const p=pl[me],q=pl[them];
  if(!(theirDone.has(p.stage)||q.out||nf.gone))return;
  if(nextStage<0){p.done=true;phase='net-wait';checkNetEnd();return;}
  graceUntil=0;if(p.out){p.out=false;p.lives=1;}p.stage=nextStage;p.checkOn=false;worlds[me]=null;startCard(me);}
 function checkNetEnd(){const p=pl[me],q=pl[them];if(phase==='net-end'||phase==='end')return;
  if(mode==='world'&&(p.out||p.done)&&(q.out||q.done||nf.gone)){if(p.out&&!q.out&&!q.done)return;netEnd();}}
 // a lost life: next to the partner in a bubble (same stage and area, partner up and running), else the checkpoint
 function netRespawn(p){const q=pl[them],st=stageOf(p),w=worlds[me];let spot=p.checkOn?st.check:st.start.auto?{...st.startPlay}:st.start,near=false;
  if(partnerIn(w,q.area)&&!q.dead&&!q.flag&&!q.axe&&!q.pipe){spot={area:q.area,x:q.x,y:Math.max(3*T,q.y-30)};near=true;}
  Object.assign(p,{area:spot.area,x:spot.x,y:spot.y,prevY:spot.y,vx:0,vy:0,grounded:!near,dead:0,pipe:null,climb:null,flag:null,tf:null,crouch:false,jumping:false,inv:near?0:60,star:0,skidding:false,combo:0,ride:null,auto:false,big:false,fire:false,bubble:near?BUBBLE:0});
  if(mode==='world'&&p.deadKind==='time')p.time=st.time;p.deadKind='';cams[me].x=0;updateCamera(p,me,true);}
 const PF=['big','fire','star','inv','left','crouch','grounded','skidding','finished','inCastle','flag','sidePipe','out','done','dead','auto','axe','over','climb'];
 function packP(p){const v={big:p.big,fire:p.fire,star:p.star>0,inv:p.inv>0,left:p.facing<0,crouch:p.crouch,grounded:p.grounded,skidding:p.skidding,finished:p.finished,inCastle:p.inCastle,flag:!!p.flag,sidePipe:p.pipe?.kind==='side',out:p.out,done:p.done,dead:p.dead>0,auto:p.auto,axe:!!p.axe,over:p.over,climb:!!p.climb};
  let fl=0;PF.forEach((k,j)=>{if(v[k])fl|=1<<j;});const r=n=>Math.round(n*10)/10;
  return [r(p.x),r(p.y),+p.vx.toFixed(3),+p.vy.toFixed(3),fl,p.area,p.stage,p.lap,p.score,p.coins,p.lives,Math.round(p.best),+p.finishT.toFixed(3),p.bubble,p.stagesCleared,wkey(p.stage,p.lap),p.pipe?.kind==='down'||p.pipe?.kind==='up'?Math.round(p.y):null,Math.round(cams[p.i].x),Math.round(view.w)];}
 function unpackP(a){const q=pl[them];if(!Array.isArray(a)||a.length<16)return;const first=!q.net||q.area!==a[5]||q.wk!==a[15];q.net={a,at:performance.now()};const fl=a[4],F=k=>!!(fl&1<<PF.indexOf(k));
  q.vx=a[2];q.vy=a[3];q.big=F('big');q.fire=F('fire');q.star=F('star')?60:0;q.inv=F('inv')?60:0;q.facing=F('left')?-1:1;q.crouch=F('crouch');q.grounded=F('grounded');q.skidding=F('skidding');
  if(F('finished')&&!q.finished){q.finished=true;q.finishT=a[12];}q.inCastle=F('inCastle');q.flag=F('flag')?{t:0,phase:'slide'}:null;q.pipe=F('sidePipe')?{kind:'side'}:null;q.out=F('out');q.done=F('done');q.dead=F('dead')?1:0;q.auto=F('auto');q.axe=F('axe')?{}:null;q.over=F('over');q.climb=F('climb')?{v:null}:null;
  q.area=a[5];q.stage=a[6];q.lap=a[7];q.score=a[8];q.coins=a[9];q.lives=a[10];q.best=Math.max(q.best,a[11]);q.bubble=a[13];q.stagesCleared=a[14];q.wk=a[15];if(Number.isFinite(a[17]))q.cx=a[17];if(a[18]>0)q.vw=a[18];
  if(first){q.x=a[0];q.y=a[1];}if(q.out||q.done)checkNetEnd();if(q.out)tryAdvance();}
 // the partner is shown moved on by its speed for the time since the snapshot, the jump eased out
 function stepRemote(dt){const q=pl[them],n=q.net;if(!n)return;const a=n.a,f=clamp((performance.now()-n.at)/1000,0,.25)*60;let tx=a[0]+(q.dead||q.bubble?0:q.vx*f),ty=a[1]+(q.grounded||q.dead||q.bubble?0:q.vy*f);
  const e=1-Math.exp(-dt*16);if(Math.abs(tx-q.x)>96||Math.abs(ty-q.y)>96){q.x=tx;q.y=ty;}else{q.x+=(tx-q.x)*e;q.y+=(ty-q.y)*e;}q.anim+=Math.abs(q.vx)*.11*dt*60;}
 const W=k=>sharedWorlds.get(k)||(Number.isInteger(k)&&k>=0&&Math.floor(k/16)<STAGES.length?stageWorld(Math.floor(k/16),k%16):null);
 function onNetEvent(e){
  if(e.es||e.bh)esIn++;
  if(e.cn){const w=W(e.cn[0]),a=w&&AR(w,e.cn[1]);if(a&&!a.got[e.cn[2]])a.got[e.cn[2]]=1;}
  else if(e.tl){const [k,an,idx,t]=e.tl,w=W(k),a=w&&AR(w,an);if(!a||idx<0||idx>=a.tiles.length)return;const old=a.tiles[idx];a.tiles[idx]=t;a.content.delete(idx);w.bumps.set(a.ai*1e6+idx,0);
   if(t===0&&old===TILE.BRICK){const cc=idx%a.def.W,r=Math.floor(idx/a.def.W);w.bumps.delete(a.ai*1e6+idx);for(const [dx,dy] of [[-1,-1],[1,-1],[-1,0],[1,0]])w.debris.push({x:cc*T+8+dx*4,y:r*T+8+dy*4,vx:dx*1.2,vy:-4.5-(dy?0:-1.5),t:0,area:an});}}
  else if(e.it){const [k,an,id,type,x0,y0]=e.it,w=W(k);if(w&&AR(w,an)&&!w.items.some(it=>it.id===id))w.items.push({type,x:x0,y:y0,emerge:16,vx:0,vy:0,area:an,id});}
  else if(e.ig){const w=W(e.ig[0]);if(w){const j=w.items.findIndex(it=>it.id===e.ig[1]);if(j>=0)w.items.splice(j,1);}}
  else if(e.es){const [k,an,idx,st,type,x0,y0,vx,vy]=e.es,w=W(k),a=w&&AR(w,an),en=a?.enemies[idx];if(!en||!en.alive||en.state==='dying')return;
   Object.assign(en,{state:st,type,x:x0,y:y0,vx,vy,t:0,active:true,remote:true,grace:st==='shell'&&vx?12:0,chain:0});if(st==='shell'&&vx)en.kick=them;}
  // the partner's fireball hit Bowser: counts on the phone that runs the castle (the partner's phone gives the points)
  else if(e.bh){const [k,an]=e.bh,w=W(k),b=w&&AR(w,an)?.bowser;if(b&&b.state==='idle'&&authHere(w,an)){b.hp--;if(b.hp<=0){b.state='dead';b.fake=true;b.vy=-3;sfx.bowserFall();}}}
  // Bowser's flames from the phone that runs the castle, moved on by the time they took to get here
  else if(e.fl){const [k,an,x,y,ty,vx,ms]=e.fl,w=W(k);if(!w||!AR(w,an)||(me===0?steppingHere(k,an):authHere(w,an)))return;
   const age=clamp((performance.now()-netT0-(+ms||0))*.06,0,120),f={x:x+vx*age,y,ty,vx,area:an};if(Math.abs(f.y-ty)>.6)f.y+=Math.sign(ty-f.y)*Math.min(Math.abs(ty-f.y),.6*age);w.flames.push(f);if(an===pl[me].area&&w===worlds[me])sfx.bowserFire();}
  // the partner's fireball: shown only (their phone judges what it hits)
  else if(e.fb){const [k,an,x,y,vx]=e.fb,w=W(k);if(w&&AR(w,an))w.fire.push({x,y,vx,vy:3,t:0,area:an,remote:true});}
  else if(e.vn){const [k,an,c,r]=e.vn,w=W(k),a=w&&AR(w,an);if(a)growVine(a,c,r);}
  else if(e.bd){const [k,an,fake]=e.bd,w=W(k),b=w&&AR(w,an)?.bowser;if(b&&b.state!=='dead'){b.state='dead';b.vy=-3;if(fake)b.fake=true;}}
  else if(e.ax){const [k,an]=e.ax,w=W(k),b=w&&AR(w,an)?.bowser;if(b&&b.state!=='dead'&&b.state!=='fall'){b.state='fall';b.vy=0;b.t=0;}}
  else if(e.gl){const p=pl[me];if(mode==='world'&&p.stage===e.gl[0]&&!graceUntil&&phase==='play'&&!p.out)graceUntil=clock+NET_GRACE;}
  else if(e.sc){const [st,next]=e.sc;theirDone.set(st,next);const p=pl[me];
   // out of lives: follow the partner on to the next stage (and come back with a life)
   if(p.out&&p.stage===st&&phase!=='stage-wait'){nextStage=next;phase='stage-wait';}tryAdvance();}
  else if(e.out){pl[them].out=true;checkNetEnd();tryAdvance();}}
 const nf=net?netField(s,{hz:20,pack:()=>{const o={t:+clock.toFixed(3),p:packP(pl[me])},ws=netStarted?packArea():null;if(ws)o.ws=ws;return o;},unpack:(i,d)=>{if(!d)return;unpackP(d.p);if(d.ws)applyArea(d.ws);},onEvent:onNetEvent}):null;
 // the run is over on this phone: swap finals and score the same on both
 async function netEnd(){if(phase==='net-end'||phase==='end')return;phase='net-end';endT=0;const p=pl[me];
  const mine={sc:p.score,co:p.coins,f:p.finished?1:0,t:+p.finishT.toFixed(3),b:Math.round(p.best),st:p.stage,done:p.done?1:0,cl:p.stagesCleared};nf.finish(mine);
  const o=await nf.remoteDone();if(!o||!s.alive)return;const q=pl[them];Object.assign(q,{score:o.sc,coins:o.co,finished:!!o.f,finishT:o.t,best:o.b,stage:o.st,done:!!o.done,stagesCleared:o.cl});endGame();}
 const netOver=()=>{const p=pl[me],q=pl[them];
  if(mode==='coins')return clock>=COIN_TIME;
  if(mode==='race'){if(clock>=RACE_CAP)return true;if(p.finished&&q.finished)return clock-Math.max(p.finishT,q.finishT)>3;return clock>Math.min(p.finished?p.finishT:Infinity,q.finished?q.finishT:Infinity)+NET_GRACE;}
  return false;};
 // online test bot: runs right holding B, jumps over what it bumps into
 function botInput(inp){const p=pl[me];bot.t++;inp.l=0;inp.r=1;inp.d=0;inp.b=bot.t%240<200?1:0;if(p.fire&&bot.t%20===0)inp.bPress=1;
  if(p.grounded&&Math.abs(p.vx)<.4)bot.stuck++;else bot.stuck=0;
  const w=worlds[me],foe=w&&AR(w,p.area).enemies.some(e=>e.alive&&e.active&&e.state!=='dying'&&e.state!=='squash'&&e.x-p.x>4&&e.x-p.x<46&&Math.abs(e.y-p.y)<28);
  if(p.grounded&&(foe||bot.stuck>10||bot.t%70===0||Math.random()<.01)){inp.press=1;bot.hold=foe?30:12+Math.floor(Math.random()*18);bot.stuck=0;}inp.jump=bot.hold-->0?1:0;}
 if(net)s.hint(mode==='world'?'SUPER MARIO BROS. WORLDS 1-8 TOGETHER: you both play at once, each on your own phone (P1 Mario, P2 Luigi); an arrow on the edge points to your partner. Blocks, coins, power-ups and enemies are shared: what one of you takes is gone for both. Lose a life and you float back next to your partner in a bubble (tap jump to pop it); out of lives, you watch until the next stage and come back with one life. First to the flagpole gives the other 10 seconds before they are pulled along. Highest score wins; the Warp Zone in 1-2 still recruits someone new. '+HELP
  :mode==='coins'?`COIN RUSH LIVE: both of you at once in the same World 1 for 60 seconds, each on your own phone; coins and blocks one of you takes are gone for the other. Most coins wins. ${HELP}`
  :`CASTLE DASH LIVE: race each other through World 1-1 at the same time, each on your own phone. First to the flagpole wins; the other then has 10 seconds. ${HELP}`);
 // debug hooks for tests
 const teleport=(i,X,stage)=>{const q=pl[i];if(stage!==undefined&&stage!==q.stage){q.stage=stage;q.checkOn=false;worlds[i]=net?stageWorld(stage,q.lap):makeWorld(STAGES[stage]);q.area='main';}const w=worlds[i],a=AR(w,q.area),W=a.def.W;let cc=Math.floor(X/T),r=13;
  const ok=(c,r)=>solid(a.tiles[r*W+c])&&!a.tiles[(r-1)*W+c]&&!a.tiles[(r-2)*W+c];
  outer:for(;cc<W-1;cc++)for(r=13;r>=4;r--)if(ok(cc,r))break outer;
  Object.assign(q,{x:cc*T+8,y:r*T,prevY:r*T,vx:0,vy:0,grounded:true,pipe:null,flag:null,dead:0,tf:null,ride:null,axe:null,auto:false,climb:null});q.best=Math.max(q.best,q.x);cams[i].x=0;updateCamera(q,i,true);};
 s.debug={enter:(i,to)=>enterArea(pl[i],to),audio:SA,log,get phase(){return phase;},get clock(){return clock;},get turn(){return turn;},get twoPlayer(){return twoPlayer;},get warpMsg(){return warpMsg;},ghost,pl,STAGES,worlds,cams,view,PH,setClock(v){clock=v;},teleport,
  start(sel,world){menuSel=sel;titleT=1;if(world)startW=world;startFromTitle();},get startList(){return startList();},
  toWarp(i){const q=pl[i],st=STAGES[0];const e=st.areas.main.pipes.find(p=>p.to);Object.assign(q,{area:'main',x:(e.c+1)*T,y:e.top*T,prevY:e.top*T,vx:0,vy:0,grounded:true,pipe:null,dead:0,tf:null,ride:null});cams[i].x=0;updateCamera(q,i,true);},
  toWarpZone(i,n=4){const q=pl[i];if(q.stage!==1){q.stage=1;worlds[i]=net?stageWorld(1,q.lap):makeWorld(STAGES[1]);}const pp=STAGES[1].areas.main.pipes.find(p=>p.warp===n);Object.assign(q,{area:'main',x:(pp.c+1)*T,y:pp.top*T,prevY:pp.top*T,vx:0,vy:0,grounded:true,pipe:null,dead:0,tf:null,ride:null,auto:false});cams[i].x=0;updateCamera(q,i,true);},
  spawn(i,type,x,y=13*T){const a=AR(worlds[i],pl[i].area),e=spawnFoe({type,x,y});e.active=true;a.enemies.push(e);return a.enemies.length-1;},
  power(i,kind){const q=pl[i];q.big=kind!=='small';q.fire=kind==='fire';},
  kill(i){kill(pl[i],'hit');},
  bump(i,c,r){bumpTile(pl[i],worlds[i],pl[i].area,c,r);},flames:()=>worlds[me]?.flames,
  skipCard(){if(phase==='card')cardT=99;}};

 // ---------------- main loop
 const LIVE=['play','turn-end','end','stage-wait','net-wait','net-end'];
 if(net)s.debug.bot=()=>{if(!bot){bot={t:0,stuck:0,hold:0};return 'drive';}return '';};
 worlds[0]=makeWorld(STAGES[0]);
 s.frame((dt)=>{
  if(!s.alive)return;
  SA.tick();SA.music(songFor());layoutView();
  if(net&&netStarted){nf.tick(dt);stepRemote(dt);}
  if(phase==='title'){titleT+=dt;simT+=dt;if((mode!=='world'||net||boardCoop)&&titleT>(boardCoop?2.2:3.2))startFromTitle();}
  else if(phase==='card'){cardT+=dt;const p=pl[turn];
   if(cardT>(cardKind==='gameover'?3:2.4)){if(cardKind==='gameover')advanceTurn();else{phase='play';for(const inp of inputs){inp.press=0;inp.bPress=0;}note(p,'play '+stageName(p));}}}
  else if(phase==='warp'){acc+=dt;while(acc>=STEP){acc-=STEP;warpMsg.t++;frames++;}if(warpMsg.t>720){const p=pl[warpMsg.i],m0=warpMsg.world;warpMsg=null;
   const to=warpTo(m0);if(net&&mode==='world'){p.stagesCleared++;p.inCastle=true;netStageDone(p,to);}else{p.stage=to;p.checkOn=false;p.stagesCleared++;worlds[p.i]=null;startCard(p.i);}}}
  else if(LIVE.includes(phase)){
   acc+=dt;let steps=0;const i=turn,p=pl[i];
   // online: the shared step count (lifts, firebars) ends this frame on the wall clock since the start, so both phones agree
   if(net)netStep=Math.floor((performance.now()-netT0)*.06)-Math.min(5,Math.floor(acc/STEP));
   const moving=phase==='play'||mode==='race'||!!net;
   while(acc>=STEP&&steps<5&&LIVE.includes(phase)){acc-=STEP;steps++;frames++;simT+=STEP;if(net)netStep++;
    // online Coin Rush / Castle Dash end on this clock (the partner's grace, the cap), so it keeps running in the castle
    if(phase==='play'&&(net&&mode!=='world'||!p.inCastle&&!p.axe))clock+=STEP;
    // online, out of lives: the view follows the partner until the next stage
    if(net&&p.out&&worlds[i]){const q=pl[them];if(q.net&&q.wk===worlds[i].key){p.area=q.area;p.x=q.x;p.y=q.y;}stepWorld(worlds[i],p);updateCamera(p,i);}
    else if(moving&&worlds[i]){const w=worlds[i],inp=phase==='play'?inputs[i]:still;readInput(i);stepPlayer(p,w,inp);if(worlds[i]===w&&LIVE.includes(phase)){interact(p,w,inp);stepWorld(w,p);updateCamera(p,i);}}
    if(phase==='play'&&!net){if(turn===0&&!twoPlayer&&!s.solo)ghost.push(snap(p));else if(turn===1)gi++;}
   }
   if(steps===5)acc=0;
   for(const w of worlds)w&&w.fx.update(dt);for(let k=0;k<2;k++)flash[k]=Math.max(0,flash[k]-dt*1.8);
   if(net&&phase==='play'){
    // the partner reached the goal NET_GRACE seconds ago: pulled along to the next stage
    if(mode==='world'&&graceUntil&&clock>graceUntil&&!p.out&&!p.flagged&&!p.axe&&!p.inCastle){p.dead=0;p.bubble=0;p.inCastle=true;note(p,'pulled along');netStageDone(p,p.stage>=lastStage?-1:p.stage+1);}
    else if(netOver())netEnd();}
   else if(phase==='play'&&mode!=='world'&&turnOver(p)){endT=0;
    if(turn===0||s.solo){if(s.solo)soloOk=mode==='coins'?p.coins>=coinGoal():p.finished;phase='turn-end';turnText=mode==='coins'?(s.solo?`${p.coins}/${coinGoal()} COINS`:`${p.coins} COINS`):p.finished?fmtRace(p.finishT):`${prog(p)}% OF THE WAY`;jingle(s.solo&&!soloOk?[392,330,262]:[523,659,784,1047],{type:'square',vol:.03,step:.09});}
    else endGame();}
   else if(phase==='turn-end'){endT+=dt;if(endT>2.4){if(s.solo){phase='handoff';soloAfter();return;}beginTurn(1);}}
   else if(phase==='end'){endT+=dt;if(endT>3.4){
    top=Math.max(pl[0].score,pl[1].score);
    if(mode==='coins'){const a=pl[0].coins,b=pl[1].coins;s.finish([a,b],`World 1 Coin Rush: ${s.players[0].name} ${a} coins, ${s.players[1].name} ${b} coins.`);}
    else if(mode==='world'){s.finish([pl[0].score,pl[1].score],`Worlds 1-8: ${s.players[0].name} ${pl[0].score} (${pl[0].done?'rescued Toad':'reached '+stageName(pl[0])}), ${s.players[1].name} ${pl[1].score} (${pl[1].done?'rescued Toad':'reached '+stageName(pl[1])}).`);}
    else{const sc=[prog(pl[0]),prog(pl[1])];if(winner>=0){sc[winner]=100;sc[1-winner]=Math.min(sc[1-winner],99);}s.finish(sc,`World 1-1 Castle Dash: ${s.players[0].name} ${score(pl[0])}, ${s.players[1].name} ${score(pl[1])}.`);}
    return;}}
   if(s.solo){if(mode==='world'){const p=pl[0];s.setScores([p.score,0]);soloProgress(s,p.score,p.stagesCleared,`World 1 solo: ${p.score.toLocaleString()} points, ${p.stagesCleared} stage${p.stagesCleared===1?'':'s'} cleared.`);}else s.setScores([soloTotal+(phase==='end'?0:soloPoints(pl[0])),0]);}
   else if(mode==='coins')s.setScores([pl[0].coins,pl[1].coins]);else if(mode==='race')s.setScores(pl.map(prog));else s.setScores([pl[0].score,pl[1].score]);
  }
  // draw
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#000';g.fillRect(0,0,s.W,s.H);
  g.save();g.scale(view.sc,view.sc);g.translate(0,view.band);g.imageSmoothingEnabled=false;
  if(phase==='title'){drawTitle();drawHUD(0,{time:false});}
  else if(phase==='card'||phase==='handoff'&&!worlds[turn])drawCard(turn);
  else if(phase==='warp')drawWarpMsg();
  else{const cam=cams[turn],cx=Math.round(cam.x*view.sc)/view.sc;g.save();g.translate(-cx,0);drawWorld(turn);g.restore();drawHUD(turn);
   if(net&&!pl[turn].out&&partnerIn(worlds[turn],pl[turn].area)){const q=pl[them];partnerArrow(s,g,{x:0,y:-view.band,w:view.w,h:view.h},q.x-cx,q.y-(q.big?20:12),{player:them,color:them?'#9cfc88':'#fcbcb0',label:`${Math.round(Math.abs(q.x-pl[turn].x)/T)} m`,size:11,top:hudY()+view.band+26});}
   if(flash[turn]>0){g.fillStyle=`rgba(0,0,0,${flash[turn]})`;g.fillRect(0,-view.band,view.w,view.h);}
   const p=pl[turn];if(p.dead&&p.dead>25&&mode!=='world')outlined(g,p.deadKind==='pit'?'DOWN THE PIT!':'OUCH!',view.w/2,110,{size:14,fill:'#fff',stroke:'#000'});
   if(mode==='race'&&p.finished&&phase==='play')outlined(g,`${s.players[turn].name.toUpperCase()} REACHED THE CASTLE`,view.w/2,96,{size:12,fill:'#ffe23a',stroke:'#000'});
  }
  g.restore();
  if(net&&LIVE.includes(phase)&&phase!=='end'){const p=pl[me],nm=s.players[them].name.toUpperCase(),sz=Math.min(s.W*.05,22);
   if(phase==='stage-wait'||phase==='net-wait'||phase==='net-end')outlined(g,`WAITING FOR ${nm}…`,s.W/2,s.H*.3,{size:sz,fill:'#ffe23a',stroke:'#000'});
   else if(p.out){outlined(g,`OUT OF LIVES · WATCHING ${nm}`,s.W/2,s.H*.3,{size:sz*.8,fill:'#fff',stroke:'#000'});outlined(g,'BACK WITH ONE LIFE NEXT STAGE',s.W/2,s.H*.3+sz*1.2,{size:sz*.6,fill:'#ffe23a',stroke:'#000'});}
   else{const q=pl[them],lead=mode==='world'?graceUntil:mode==='race'&&q.finished&&!p.finished?q.finishT+NET_GRACE:0;
    if(lead&&!p.flagged&&!p.inCastle){const left=Math.max(0,Math.ceil(lead-clock));outlined(g,`${nm} ${mode==='race'?'FINISHED':'REACHED THE GOAL'}!`,s.W/2,s.H*.3,{size:sz*.8,fill:'#fff',stroke:'#000'});outlined(g,String(left),s.W/2,s.H*.3+sz*1.9,{size:sz*2.4,fill:left<=3?'#fc7460':'#ffe23a',stroke:'#000'});}}}
  if(phase==='play')drawTouchGuides(turn);
  if(phase==='turn-end'||phase==='end'){const a=Math.min(1,endT*3),size=Math.min(s.W*.07,s.H*.07,46);g.save();g.globalAlpha=a;g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,s.H*.4,s.W,s.H*.2);
   if(phase==='turn-end'){outlined(g,mode==='race'&&pl[0].finished?'COURSE CLEAR!':'TIME UP',s.W/2,s.H/2-size*.3,{size,fill:'#ffe23a',stroke:'#000'});outlined(g,`${s.players[0].name.toUpperCase()}: ${turnText}`,s.W/2,s.H/2+size*.75,{size:size*.5,fill:'#fff',stroke:'#000'});}
   else{outlined(g,mode==='coins'&&endT<1.2?'TIME UP':endText,s.W/2,s.H/2-size*.3,{size,fill:'#ffe23a',stroke:'#000'});
    const sub=mode==='coins'?`${pl[0].coins} COINS  ·  ${pl[1].coins} COINS`:mode==='world'?`${pl[0].score}  ·  ${pl[1].score}`:pl.map(q=>q.finished?fmtRace(q.finishT):`${prog(q)}%`).join('  ·  ');outlined(g,sub,s.W/2,s.H/2+size*.75,{size:size*.5,fill:'#fff',stroke:'#000'});}
   g.restore();}
 });
}

// The game takes the whole screen (like Broforce): the score bar and help text go, Pause / Exit / full screen float
// in the top-right corner and the controls help folds into a chip in the top-left.
function fullBleed(s){
 const shell=s.body.closest('.game-shell'),layer=shell?.parentElement;if(!shell)return;
 shell.classList.add('smb-shell');layer?.classList.add('smb-layer');
 const css=document.createElement('style');
 css.textContent=`#game-layer.smb-layer{padding:0;height:100dvh;max-height:none}
  .game-shell.smb-shell{position:relative;max-width:none;width:100%;height:100%;border:0;border-radius:0;grid-template-rows:minmax(0,1fr);overflow:hidden;background:#000}
  .smb-shell>.game-header{position:absolute;right:max(6px,env(safe-area-inset-right));top:max(4px,env(safe-area-inset-top));z-index:12;border:0;background:transparent;padding:0;min-height:0}
  .smb-shell>.game-header>:not(.game-actions){display:none}
  .smb-shell .game-actions{gap:4px;display:flex}
  .smb-shell .game-actions button{min-height:34px;min-width:34px;padding:3px 9px;font-size:12px;background:#000a;color:#fff;border-color:#ffffff40}
  .smb-shell>#game-scorebar{display:none}
  .smb-shell>.game-body{padding:0;display:flex;gap:0;overflow:hidden;min-height:0}
  .smb-shell .canvas-frame{border:0;border-radius:0;flex:1;min-height:0;width:100%;height:100%}
  .smb-shell .game-canvas{display:block;border:0;border-radius:0;max-width:none;max-height:none}
  .smb-shell #game-status,.smb-shell #game-controls{display:none}
  .smb-shell #game-hint{position:absolute;left:max(6px,env(safe-area-inset-left));top:max(4px,env(safe-area-inset-top));z-index:12;margin:0;max-width:min(72vw,420px)}
  .smb-shell #game-hint .control-guide{background:#000a;border:1px solid #ffffff40;border-radius:8px;padding:0;color:#fff;font-size:12px}
  .smb-shell #game-hint summary{padding:7px 10px;min-height:20px;cursor:pointer}
  .smb-shell #game-hint p{margin:0;padding:0 10px 10px;max-height:50vh;overflow:auto}
  .smb-shell .pass-overlay{z-index:30}`;
 shell.appendChild(css);
 let fsBtn=null;try{const {fullscreenButton}=require('src/fullscreen.js');const html=fullscreenButton('icon','small');const actions=shell.querySelector('.game-actions');if(html&&actions){actions.insertAdjacentHTML('afterbegin',html);fsBtn=actions.firstElementChild;}}catch{}
 s.cleanup(()=>{css.remove();fsBtn?.remove();shell.classList.remove('smb-shell');layer?.classList.remove('smb-layer');});
}
Object.assign(exports,{marioBros});
