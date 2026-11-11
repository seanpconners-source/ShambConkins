// Sonic 3 rebuild (roadmap R59, plan docs/sonic3/PLAN.md): the game around the engine in src/engines/s3/. For now it
// plays the engine's TEST ZONE (s3/testZone.js) so the feel can be tried on a phone; Zone 1 replaces it later.
// Players take turns like the old Sonic game: P1 runs the act, then P2 (as Tails). Score = badniks + the Sonic 3 tally
// at the sign (time bonus + 100 a ring); higher wins. 1P: one run on your own. Full screen (fullBleed), physics at a fixed
// 60 steps a second, Mega Drive camera, the owner's Sonic 3 & Knuckles sounds and Sonic 3 soundtrack (sonicAudio.js):
// the act song starts with the title card (Act 1 = Sonic 1's Green Hill Zone, the owner's pick; the Test Zone = Azure Lake), Invincibility while a
// star lasts (then the act song from the top), the 1-Up jingle over it, Act Complete at the sign (the tally waits for it),
// Game Over / Time Over, silence on the hand-off cards; a respawn starts the act song again.
// Touch: drag anywhere on the left 55% = a floating d-pad (left/right run, down = crouch/roll/spin dash charge, up =
// look up); touch the right side = jump (hold for a full jump, tap in the air for the shield move / insta-shield).
// Keys: A/D/W/S or arrows to move, Space or Enter to jump.
const {settle,arenaKeys,arenaTouch,Countdown}=require("src/engines/arenaKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish}=require("src/solo.js");
const S3=require("src/engines/sonicAudio.js");
const P=require("src/engines/s3/physics.js");
const O=require("src/engines/s3/objects.js");
const {Camera}=require("src/engines/s3/camera.js");
const {installZoom,zoomFor}=require("src/engines/s3/zoomPanel.js");
const R=require("src/engines/s3/render.js");
const {buildTestZone}=require("src/engines/s3/testZone.js");
const {buildZone1Act1}=require("src/engines/s3/zone1.js");
const {buildZone1Act2}=require("src/engines/s3/zone1act2.js");
const {buildZone1Act3}=require("src/engines/s3/zone1act3.js");
const I=require("src/engines/s3/intro.js");
const {netField}=require("src/engines/netField.js");
const {partnerArrow}=require("src/engines/partnerArrow.js");
const {faceFit,flipFor}=require("src/headFacts.js");
// a runner's face (brow to chin) is this share of the head size the body asks for (the whole picture used to fill it)
const FACE_W=.6;

// the game runs ~7% faster than the Mega Drive's 60 steps a second (owner: "maybe a tiny bit faster"); the clock still
// counts real seconds (clock is in 60ths)
const SIM_HZ=64,STEP=1000/SIM_HZ,TICK=60/SIM_HZ,TIME_CAP=10*60*60,TALLY=SIM_HZ*4.2;
// Sonic 3 time bonus by the clock at the sign
const timeBonus=f=>{const s=f/60;return s<30?50000:s<45?10000:s<60?5000:s<90?4000:s<120?3000:s<180?2000:s<240?1000:s<300?500:0;};
const PCOL=['#78b6ff','#ffb85a'],NONE={l:false,r:false,u:false,d:false,jump:false,jumpPress:false};

async function sonic3(s){
 const [c,x]=s.canvas(900,600,{fill:true});const fb=fullBleed(s,{bg:'#000'});s.body.classList.add('drag-arena-body');
 if(!await settle(s))return;
 S3.open(s);s.cleanup(()=>S3.stopAll());
 // zoom (🔍 next to Pause/Exit): per screen shape, applied live; the game holds still while the slider is open
 let held=false;installZoom(s,{hold:on=>{held=on;},onChange:z=>{if(cam){cam.resize(s.W,s.H,z);cam.clampIn();}}});
 // faces ride the body exactly: no menu bob/sway (owner: heads bounced around on their own)
 // On a runner (dir = which way the body faces) the FACE sits on the spot, FACE_W of the old picture box wide, so hair,
 // ears and hats stick out round it; a face looking against the run is mirrored (src/headFacts.js, tools/head-check.py).
 // Without facts (online photo, stand-in) the whole picture is centred as before.
 const head=(g,i,cx,cy,size,mood,dir)=>{
  if(dir===undefined)return s.sprite(g,i,cx,cy,size,{exact:true,mood,noBadge:true,still:true});
  const id=s.players[i]?.character,m=mood||s.spriteMood(i),k=s.players[i]?.large?2:1,fit=id&&faceFit(id,m,size*FACE_W*k);
  if(!fit)return s.sprite(g,i,cx,cy,size,{exact:true,mood:m,noBadge:true,still:true});
  const flip=flipFor(id,m,dir);g.save();g.translate(cx,cy);if(flip)g.scale(-1,1);
  s.sprite(g,i,fit.dx,fit.dy,fit.size/k,{exact:true,mood:m,noBadge:true,still:true});g.restore();};
 // ONLINE (s.online, owner Nov 11: "both on screen at the same time, like the previous one"): both phones run the act at
 // once, each its own runner (P1 the hedgehog, P2 the fox) on its own screen; the partner is drawn from 20 Hz snapshots
 // (edge arrow when off screen). Rings, monitors, robots and breakable walls one of you takes are gone for both. When one
 // gets through the sign the other has NET_GRACE seconds; then both swap their scores {fin} and the higher one wins.
 const net=s.online||null,me=net?net.me:0,them=1-me,NET_GRACE=10;
 const turns=net?[me]:s.solo?[0]:[0,1],score=[0,0],result=[null,null];
 let q=null,qs=null,taken=null,graceAt=null,netDone=false;// partner runner + its latest snapshot; objects taken; grace start
 // the act: Zone 1 Act 1 (Green Hill Zone song, owner Nov 11), Act 2 (Emerald Hill Zone song, owner's plan) or the Test Zone
 const ZONES={zone1:[buildZone1Act1,'Shamb Island Act 1','green-hill'],zone1act2:[buildZone1Act2,'Shamb Island Act 2','emerald-hill'],
  // Act 3 (owner, Nov 11 round 4): the Sonic 3 Act 1 song (Angel Island), the zone boss at the end
  zone1act3:[buildZone1Act3,'Shamb Island Act 3','angel-island-1']};
 const [buildZone,LABEL,ACT_SONG]=ZONES[s.game?.s3zone]||[buildTestZone,'Sonic 3 Test Zone','azure-lake'];
 let turn=0,Z=null,w=null,p=null,cam=null,art=null,back=null,fx=null,fight=false;// fight = 'mini' | 'big' while an arena is closed
 // the mini-boss's pilot (Act 1): a character neither player has unlocked yet (prefers one with real art); beating the
 // mini-boss frees them into the roster (s.gameRecruits; the launcher treats sonic3 like the cage games: no random unlock)
 s.gameRecruits=[[],[]];const pilot={id:null,name:'',head:null};
 try{const {store}=require('src/state.js'),{gameRecruitPool}=require('src/rewards.js'),{portraitURL}=require('src/assets.js'),{character}=require('src/characters.js');
  const pools=s.players.map(q=>{try{return gameRecruitPool(s.game,store.profile,q).map(c=>c.id);}catch{return [];}});if(s.solo||!pools[1])pools[1]=pools[0];
  const art=id=>{try{const u=portraitURL(id);return !!u&&!/^data:image\/svg/.test(u);}catch{return false;}};
  const both=pools[0].filter(id=>pools[1].includes(id)),cands=[both.filter(art),pools[0].filter(art),both,pools[0]].find(a=>a.length);
  if(cands){pilot.id=cands[Math.floor(s.random()*cands.length)];pilot.name=(character(pilot.id)?.name||pilot.id).toUpperCase();pilot.head=require('src/engines/broforce.js').headCanvas;pilot.head(pilot.id);}}catch{}
 const drawPilot=(g,cx,cy,size,mood)=>{if(!pilot.id||!pilot.head)return false;const hc=pilot.head(pilot.id,mood);if(!hc)return false;const k=size/Math.max(hc.width,hc.height);g.drawImage(hc,cx-hc.width*k/2,cy-hc.height*k/2,hc.width*k,hc.height*k);return true;};
 let phase='idle',frames=0,clock=0,acc=0,last=0,card=0,endF=0,overLen=150,tally=null,overText='',dbg=null;const vis={x:0,y:0};
 // which runner each player is (picked on the character select; online: P1 the hedgehog, P2 the fox); pairs[i] = that player
 // runs with the CPU fox following (the SEANIC & TAILS pick)
 const bodies=['hog','fox'],pairs=[false,false];
 const RUNNER={hog:'Seanic the hedgehog',fox:'the three-tailed fox (tap jump again in the air to fly, hold it to climb)',knux:'Knux the echidna (tap jump again in the air to glide, glide into a wall to climb it)',dark:'Shade the dark hedgehog (tap jump again near a robot: homing attack)'};
 const runnerName=i=>RUNNER[bodies[i]]+(pairs[i]?', with the CPU fox following':'');
 // ---------------- title screen + 1P character select (intro.js draws them)
 const intro={t0:0,pick:0,slideAt:0,slideDir:0,go:null,skip:null,who:0,taken:null};
 const introT=()=>(performance.now()-intro.t0)/1000;
 const waitIntro=()=>intro.skip?Promise.resolve():new Promise(r=>{intro.go=r;});
 const advance=()=>{const g=intro.go;intro.go=null;g?.();};
 function choose(d){intro.pick=I.nextFree(intro.pick,d,intro.taken);intro.slideAt=performance.now();intro.slideDir=d;S3.play('switch')||S3.play('starpost');}
 function introTap(px,py,dx){if(introT()<.45)return;
  if(phase==='title'){advance();return;}
  if(Math.abs(dx)>40){choose(dx<0?1:-1);return;}
  const h=I.selectHit(s.W,s.H,px,py);if(h==='prev')choose(-1);else if(h==='next')choose(1);else{S3.play('starpost');advance();}}
 async function introScreens(){intro.t0=performance.now();phase='title';S3.jingle('title');await waitIntro();
  // online: wait for the partner's phone, then both start the act at the same moment
  if(net){intro.waiting=true;await nf.start('go');intro.waiting=false;if(!s.alive)return false;}
  // the character select: 1P picks once; 2 players on one phone pick in turn, and player 2 can't take what player 1's pick
  // puts on screen (owner, Nov 11 round 4: no repeats on screen). Online keeps P1 the hedgehog, P2 the fox
  if(!net)for(const k of s.solo?[0]:[0,1]){S3.stopJingle();phase='select';intro.who=k;intro.taken=k?I.CHARS[intro.first].uses:null;intro.t0=performance.now();
   const want=intro.skip?(k?intro.skip.pick2??1:intro.skip.pick|0):k?1:0;intro.pick=I.nextFree(want,0,intro.taken);
   if(!intro.skip){S3.music('data-select');await waitIntro();if(!s.alive)return false;}
   const c=I.CHARS[intro.pick];bodies[k]=c.body;pairs[k]=!!c.pair;if(!k)intro.first=intro.pick;}
  S3.stopJingle();S3.music(null);press=false;phase='idle';return s.alive;}
 function introFrame(){const W=s.W,H=s.H;S3.tick();if(phase==='select')S3.music('data-select');
  // the title theme is one 15 s piece: after it ends and 4 s of quiet, it plays again
  if(phase==='title'){if(S3.nowPlaying().jingle)intro.quietAt=0;else if(!intro.quietAt)intro.quietAt=performance.now();else if(performance.now()-intro.quietAt>4000){intro.quietAt=0;S3.jingle('title');}}
  if(net&&phase==='title'&&!intro.waiting&&introT()>6)advance();// online the title moves on by itself (both phones)
  if(phase==='title')I.drawTitle(x,W,H,introT(),{head,i:0,foxI:s.players[1]?1:null,tap:!intro.waiting,
   mode:intro.waiting?`WAITING FOR ${s.players[them].name.toUpperCase()}…`:net?'ONLINE · TOGETHER':s.solo?'1 PLAYER':'2 PLAYERS'});
  else{const k=Math.max(0,1-(performance.now()-intro.slideAt)/350),who=intro.who,other=s.players[1]?1-who:who;
   I.drawSelect(x,W,H,introT(),{pick:intro.pick,slide:k*intro.slideDir,head,i:who,j:other,taken:intro.taken,who:s.solo?null:`PLAYER ${who+1} · ${s.players[who].name.toUpperCase()}`});}}
 // ---------------- input
 const kb=arenaKeys(s),inp={l:false,r:false,u:false,d:false,jump:false,jumpPress:false};let press=false;
 kb.onDown((i,k)=>{if(phase==='title'){if(k==='fire'&&introT()>.45)advance();return;}
  if(phase==='select'){if(k==='l')choose(-1);else if(k==='r')choose(1);else if(k==='fire'&&introT()>.45){S3.play('starpost');advance();}return;}
  if(k==='fire')press=true;});
 const pad={stick:null,jump:null};
 arenaTouch(s,{owner:()=>turns[turn]??0,maxFingers:3,
  onDown:f=>{if(phase==='title'||phase==='select'){f.data.role='intro';f.data.x0=f.x;return;}
   if(f.x>s.W*.55){f.data.role='jump';pad.jump=f;press=true;}else{f.data.role='stick';pad.stick=f;}},
  onMove:f=>{if(f.data.role!=='stick')return;const dx=f.x-f.sx,dy=f.y-f.sy,lim=60,d=Math.hypot(dx,dy);if(d>lim){f.sx=f.x-dx*lim/d;f.sy=f.y-dy*lim/d;}},
  onUp:f=>{if(f.data.role==='intro'){if(phase==='title'||phase==='select')introTap(f.x,f.y,f.x-f.data.x0);return;}
   if(pad.jump===f)pad.jump=null;if(pad.stick===f)pad.stick=null;}});
 function readInput(){const [a,b]=kb.state;let l=a.l||b.l,r=a.r||b.r,u=a.u||b.u,d=a.d||b.d,j=a.fire||b.fire;
  const st=pad.stick;if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(dx>12)r=1;if(dx<-12)l=1;if(dy>22&&Math.abs(dy)>Math.abs(dx)*.7)d=1;if(dy<-24&&Math.abs(dy)>Math.abs(dx)*.7)u=1;}
  if(pad.jump)j=1;
  if(dbg?.bot){const b=dbg.bot(p,frames);l=b.l;r=b.r;u=b.u;d=b.d;j=b.jump;if(b.press)press=true;}
  inp.l=!!l&&!r;inp.r=!!r&&!l;inp.u=!!u;inp.d=!!d;inp.jump=!!j||press;inp.jumpPress=press;press=false;}
 // ---------------- sounds + effects from the world's events
 const SOUND={jump:'jump',dash:'dash',tube:'dash',skid:'skid',roll:'roll','insta-shield':'insta-shield','fire-dash':'fire-dash','lightning-jump':'lightning-jump','bubble-bounce':'bubble-bounce',
  spring:'spring',explode:'explode',monitor:'explode','ring-loss':'ring-loss',die:'hurt',hurt:'hurt',shield:'shield','fire-shield':'fire-shield','bubble-shield':'bubble-shield',
  'lightning-shield':'lightning-shield',starpost:'starpost',sign:'signpost',break:'break',deflect:'bumper','boss-thud':'crash',capsule:'switch',home:'dash','air-dash':'dash',glide:'roll'};
 // what the CPU partner's events may do (sounds, pops, rings, bosses): its jumps, rolls and dashes stay quiet, its spin dash
 // doesn't hold the camera back
 const BUDDY_EV=new Set(['ring','explode','monitor','break','spring','deflect','life','boss-hit','boss-wreck','boss-boom','boss-down','boss-start','boss-fire','boss-thud','boss-reset','capsule','sign']);
 function events(){for(const e of w.drain()){if(e.p===1&&!BUDDY_EV.has(e.k))continue;
  if(e.k==='ring')S3.ring();else if(e.k==='rev')S3.rev(p.rev);else if(SOUND[e.k]){if(e.k==='ring-loss'&&e.why==='spike')S3.play('spike');S3.play(SOUND[e.k]);}
  if(e.k==='ring'){const r=e.p===1&&buddy?buddy:p;fx.sparkle(r.x,r.y-10);}
  if(e.k==='explode'){fx.puff(e.x,e.y);fx.score(e.x,e.y-12,e.pts);}
  if(e.k==='monitor')fx.puff(e.x,e.y);
  if(e.k==='break')fx.debris(e.x,e.y);
  if(e.k==='skid')fx.dust(p.x,p.y+18,Math.sign(p.gsp));
  if(e.k==='dash')cam.dash((Math.abs(p.gsp)-8)*2);
  if(e.k==='sign'&&!tally){S3.music(null);const sang=S3.jingle('act-clear');
   tally={time:timeBonus(clock),rings:(p.rings|0)*100,t:0,clock,len:Math.max(TALLY,sang?Math.ceil(S3.jingleLen('act-clear')*SIM_HZ)+20:0)};S3.play('signpost');}
  if(e.k==='life')S3.jingle('1up');
  if(e.k==='die'){overText=p.lives<=0?'GAME OVER':'';}
  // the mini-boss: the arena closes (camera locked to it, boss song), hits, the wreck, then the way on opens
  if(e.k==='boss-start'){fight=e.kind==='big'?'big':'mini';cam.setBounds({x0:e.x0,x1:e.x1});}
  if(e.k==='boss-hit'){S3.play('boss-hit');cam.dash(0);}
  if(e.k==='boss-fire')S3.play('fire-dash')||S3.play('fire-shield');
  if(e.k==='boss-wreck'){S3.play('boss-explode');fx.score(e.x,e.y-30,1000);}
  if(e.k==='boss-boom'){fx.puff(e.x,e.y);if(Math.random()<.5)S3.play('explode');}
  if(e.k==='boss-down'){fight=false;cam.setBounds({x0:Z.bounds.x0,x1:Z.bounds.x1});
   if(pilot.id){const i=turns[turn];for(const k of net?[0,1]:[i])if(!s.gameRecruits[k].includes(pilot.id))s.gameRecruits[k].push(pilot.id);fx.score(e.x,e.y-60,`${pilot.name} FREED!`);}}
  if(e.k==='boss-reset'){fight=false;cam.setBounds({x0:Z.bounds.x0,x1:Z.bounds.x1},true);}}}
 // the song this moment wants: the act song from the title card on, Invincibility while a star lasts, the Miniboss song
 // while the arena is closed
 const songFor=()=>(phase==='card'||phase==='play')&&!tally?(p.star>0&&!p.dead?'invincible':fight==='big'?'boss':fight?'miniboss':ACT_SONG):null;
 // ---------------- online: my runner out as snapshots, the partner in; shared objects as events
 const SHARED=new Set(['ring','monitor','badnik','wall']);
 const isTaken=o=>o.type==='ring'?!!o.got:o.type==='monitor'?!!o.broken:o.type==='badnik'?o.alive===false:!!o.gone;
 const flags=r=>(r.ground?1:0)|(r.rolling||r.jumping?2:0)|(r.facing<0?4:0)|(r.spindash?8:0)|(r.dead?16:0)|(r.hurt?32:0)|(r.crouch?64:0)|(r.lookUp?128:0)|(r.hang?256:0)|(tally?512:0)|(r.star>0?1024:0)|(netDone?4096:0);
 const nf=net?netField(s,{hz:20,
  pack:()=>p&&Z?{a:[Math.round(p.x),Math.round(p.y),+p.ang.toFixed(2),+p.gsp.toFixed(2),+p.xsp.toFixed(2),+p.ysp.toFixed(2),p.fly|0,p.score|0,p.rings|0,p.lives|0],b:flags(p),sh:p.shield||0}:{w:1},
  unpack:(i,d)=>{if(d&&d.a)qs={...d,at:performance.now()};},
  onEvent:e=>{if(e&&e.g!==undefined)takeRemote(e.g);}}):null;
 function takeRemote(k){const o=w?.objs[k];if(!o||!taken)return;taken[k]=1;
  if(o.type==='ring')o.got=true;else if(o.type==='monitor'){o.broken=true;o.solid=false;o.rise=0;o.giveTo=null;}
  else if(o.type==='badnik'){o.alive=false;o.gone=true;}else o.gone=true,o.solid=false;}
 function shareTaken(){if(!net||!w)return;const os=w.objs;for(let k=0;k<os.length;k++){const o=os[k];if(taken[k]||!SHARED.has(o.type)||!isTaken(o))continue;taken[k]=1;nf.event({g:k});}}
 // the partner, eased toward its last snapshot moved on by its speed (up to 6 frames ahead)
 function partnerStep(){if(!qs||!q)return;const [x0,y0,ang,gsp,xsp,ysp,fly,sc,rings,lives]=qs.a,b=qs.b,age=Math.min(6,(performance.now()-qs.at)/STEP);
  const tx=x0+xsp*age,ty=y0+ysp*age;if(Math.hypot(tx-q.x,ty-q.y)>240){q.x=tx;q.y=ty;}else{q.x+=(tx-q.x)*.45;q.y+=(ty-q.y)*.45;}
  Object.assign(q,{ang,gsp,xsp,ysp,fly,score:sc,rings,lives,ground:!!(b&1),rolling:!!(b&2),jumping:!!(b&2)&&!(b&1),facing:b&4?-1:1,spindash:!!(b&8),dead:b&16?Math.max(q.dead||0,1)+1:0,hurt:!!(b&32),crouch:!!(b&64),lookUp:!!(b&128),hang:!!(b&256),star:b&1024?60:0,shield:qs.sh||null});
  q.through=!!(b&512);q.finished=!!(b&4096);}
 // online test autopilot (the same one tests/s3-zone1.mjs drives the act with): hold right, hop when stuck, spin dash when
 // stuck longer, back up for a run-up when there is no way forward, let go of vines/zip lines at the far end
 // (the Test Zone's obstacles suit a simpler one: hold right, spin dash when stuck, hop if still stuck right after)
 const testBot=(()=>{let stuck=0,hold=0,dash=0,n=0,lastDash=-999;return r=>{n++;
  if(dash>0){dash--;return {l:false,r:dash<3,u:false,d:dash>2,jump:false,press:dash>2&&dash%5===0};}
  if(r.ground&&Math.abs(r.gsp)<1.5)stuck++;else stuck=0;let press=false;
  if(r.ground&&stuck>20){stuck=0;if(n-lastDash<160){press=true;hold=20;}else{lastDash=n;dash=28;return {l:false,r:false,u:false,d:true,jump:false,press:false};}}
  return {l:false,r:true,u:false,d:false,jump:hold-->0,press};};})();
 const zoneBot=(()=>{const b={stuck:0,last:0,mode:0,hang:0,best:0,since:0,back:0};return p=>{const fight=w&&O.bossBot(w,p);if(fight){b.since=0;b.best=p.x;return {...fight,press:fight.jumpPress};}const o={l:false,r:true,u:false,d:false,jump:false,press:false};
  // Act 3's capsule after the boss: walk up and hop onto its button
  const cap=w&&w.objs.find(c=>c.type==='capsule'&&!c.opened);if(cap&&Math.abs(p.x-cap.x)<260&&!w.objs.some(c=>c.type==='boss'&&!c.done)){if(!p.ground){o.jump=p.ysp<0;o.r=p.x<cap.x-6;o.l=p.x>cap.x+6;return o;}o.r=p.x<cap.x-70;o.l=p.x>cap.x+70;if(Math.abs(p.x-cap.x)<=72){o.jump=o.press=true;o.r=p.x<cap.x;o.l=!o.r;}return o;}
  if(p.hang){b.hang++;const h=p.hang;const far=h.type==='zipline'?h.s>=.97||b.hang>400:(h.ang>.55&&b.hang>20);if(far){o.jump=o.press=true;b.hang=0;}return o;}b.hang=0;
  if(p.x>b.best+4){b.best=p.x;b.since=0;}else b.since++;
  if(b.back>0){b.back--;o.r=false;o.l=true;if(b.back===0)b.since=0;return o;}
  if(b.since>240&&p.ground){b.back=200;return o;}
  if(Math.abs(p.x-b.last)<.5)b.stuck++;else b.stuck=0;b.last=p.x;
  if(b.mode>0){b.mode--;o.r=false;o.d=true;if(b.mode%6===0&&b.mode>8)o.press=o.jump=true;if(b.mode===0)o.d=false;return o;}
  if(b.stuck>90&&p.ground){b.mode=40;b.stuck=0;return o;}
  if(b.stuck>12&&p.ground){o.press=true;o.jump=true;}
  if(!p.ground&&p.ysp<0)o.jump=true;return o;};})();
 const zone1=!!ZONES[s.game?.s3zone],act2=s.game?.s3zone==='zone1act2',act3=s.game?.s3zone==='zone1act3';
 const netBot=zone1?zoneBot:testBot;
 // each runner's moves: the fox flies, the echidna glides + climbs (and jumps a little lower, like Knuckles), the dark
 // hedgehog homes in
 function abilities(r){r.canFly=r.body==='fox';r.canGlide=r.body==='knux';r.homing=r.body==='dark';if(r.canGlide)r.jmp=6;}
 // ---------------- the CPU fox (Sonic 3's Tails AI): presses what the leader pressed LAG frames ago and steers to where the
 // leader was then; jumps when stuck or when the leader is well above; too far behind / off the screen = flies back in
 const LAG=16,trail=[];let buddy=null,stuckB=0,farB=0;
 function buddyInput(){const b=buddy,o={l:false,r:false,u:false,d:false,jump:false,jumpPress:false};if(!b||b.flyIn||phase!=='play'||tally)return o;
  const rec=trail[Math.max(0,trail.length-1-LAG)]||{x:p.x,y:p.y};
  const dx=rec.x-b.x,dist=Math.hypot(p.x-b.x,p.y-b.y);
  if(dist>Math.max(420,cam.vw*.8)||b.y>p.y+260&&!p.dead)farB++;else farB=0;if(farB>60){b.flyIn=1;farB=0;return o;}
  Object.assign(o,{d:!!rec.d,jump:!!rec.jump,jumpPress:!!rec.jumpPress});
  if(Math.abs(dx)>18){o.r=dx>0;o.l=dx<0;}else{o.r=!!rec.r&&dx>-4;o.l=!!rec.l&&dx<4;}
  if(b.ground&&Math.abs(b.gsp)<.6&&(o.l||o.r))stuckB++;else stuckB=0;
  if(b.ground&&(stuckB>20||rec.y<b.y-56&&!rec.ground&&Math.abs(dx)<120)){o.jump=o.jumpPress=true;stuckB=0;}
  if(!b.ground&&b.ysp<0)o.jump=o.jump||Math.abs(dx)>40;return o;}
 function gameOver(text){overText=text;phase='over';S3.music(null);const sang=S3.jingle('game-over');endF=0;overLen=Math.max(150,sang?Math.ceil(S3.jingleLen('game-over')*SIM_HZ)+20:0);}
 // ---------------- a turn
 async function startTurn(k,{noCard=false}={}){turn=k;const i=turns[k],nm=s.players[i].name;
  const desc=act3&&s.solo?`Shamb Island Zone, Act 3. A fast act: a downhill loop, a warp tube, the lake, the treetops, a spike pit, then THE BOSS: keep clear of its mace, hit the pod when it sinks low and tires. Eight hits and its pilot joins your roster; then jump on the capsule.`
   :act2&&s.solo?`Shamb Island Zone, Act 2. Corkscrews, waterfall cliffs, a warp tube, leaping fish, seesaws, a double loop, and a mini-boss before the sign: dodge its flames, jump on it while it cools down, beat it and its pilot joins your roster.`
   :zone1&&s.solo?`Shamb Island Zone, Act 1. Roll tunnels, loops, high ledges, a cave, lakes and waterfalls. Reach the sign: time bonus + 100 a ring.`
   :s.solo?`Sonic 3 engine test: run the Test Zone. Loops, springs, shields, badniks, a zip line and a swing vine. Reach the sign: time bonus + 100 a ring.`
   :k===0?`${nm} runs first as ${runnerName(i)}. ${act3?'Beat the boss and open the capsule':'Reach the sign at the end'}: badniks + time bonus + 100 a ring. Then ${s.players[1].name} runs it as ${runnerName(1)}.`
   :`${nm}, you're ${runnerName(i)}. Beat ${s.players[0].name}'s ${score[0].toLocaleString()} points.`;
  if(!noCard&&!net&&!await s.pass(i,desc,'Ready',{summary:k?`${s.players[0].name}: ${score[0].toLocaleString()}`:null}))return false;
  Z=buildZone();w=new O.World(Z.T,Z.objs,{switchers:Z.switchers,bottom:Z.bottom});
  if(net){taken=new Uint8Array(w.objs.length);q=P.makeRunner(Z.start.x,Z.start.y);q.body=bodies[them];q.canFly=q.body==='fox';q.lives=3;graceAt=null;netDone=false;}
  p=P.makeRunner(Z.start.x,Z.start.y);p.body=bodies[i]||'hog';abilities(p);p.rings=0;p.lives=3;p.score=0;p.facing=1;
  // the SEANIC & TAILS pick: the CPU fox starts at the hedgehog's heels (Sonic 3: Tails follows, his rings and robots count for you)
  buddy=pairs[i]&&!net?Object.assign(P.makeRunner(Z.start.x-34,Z.start.y),{body:'fox',cpu:true,rings:0,lives:99,score:0,facing:1}):null;trail.length=0;
  cam=new Camera(Z.bounds);cam.resize(s.W,s.H,zoomFor(s.W,s.H));cam.snap(p);
  art=art||new R.TerrainArt(Z.T);back=back||new R.Backdrop();fx=new R.Fx();art.warm(cam);
  frames=0;clock=0;acc=0;last=performance.now();card=0;vis.x=vis.y=0;endF=0;tally=null;overText='';phase='card';return true;}
 function endTurn(){const i=turns[turn];score[i]=(p.score|0)+(tally?tally.time+tally.rings:0);result[i]={got:!!tally,clock:tally?tally.clock:clock,score:score[i]};
  s.setScores(score);}
 async function next(){endTurn();S3.music(null);
  if(net){phase='netwait';netDone=true;nf.push();nf.finish({sc:score[me],got:result[me].got,clock:Math.round(result[me].clock)});
   const o=await nf.remoteDone();if(!s.alive)return;
   score[them]=o?o.sc|0:0;result[them]={got:!!o?.got,clock:o?.clock||0,score:score[them]};s.setScores(score);phase='done';
   const win=score[0]===score[1]?-1:score[0]>score[1]?0:1;if(win>=0)s.react(win,'win');
   s.finish(score,`${LABEL} online: ${s.players[0].name} ${score[0].toLocaleString()}, ${s.players[1].name} ${score[1].toLocaleString()}.`);return;}
  if(turn+1<turns.length){phase='idle';if(await startTurn(turn+1))return;return;}
  phase='done';const r0=result[0];
  if(s.solo){soloFinish(s,score[0],r0.got?1:0,`${LABEL}: ${score[0].toLocaleString()} points${r0.got?` (through in ${R.fmtTime(r0.clock)})`:''}.`,r0.got);return;}
  const win=score[0]===score[1]?-1:score[0]>score[1]?0:1;if(win>=0)s.react(win,'win');
  s.finish(score,`${LABEL}: ${s.players[0].name} ${score[0].toLocaleString()}, ${s.players[1].name} ${score[1].toLocaleString()}.`);}
 // ---------------- one physics frame
 function stepFrame(){frames++;
  if(phase==='card'){card++;if(card>=100)phase='play';}
  readInput();const ctl=phase==='play'&&!tally?inp:NONE;// after the sign the runner coasts to a stop
  const px=p.x,py=p.y,roll=p.rolling;
  if(buddy){trail.push({x:p.x,y:p.y,l:ctl.l,r:ctl.r,d:ctl.d,jump:ctl.jump,jumpPress:ctl.jumpPress,ground:p.ground,gsp:p.gsp});if(trail.length>64)trail.shift();}
  w.step(buddy?[p,buddy]:[p],buddy?[ctl,buddyInput()]:[ctl]);
  if(buddy){p.rings=(p.rings|0)+(buddy.rings|0);p.score=(p.score|0)+(buddy.score|0);buddy.rings=0;buddy.score=0;}
  // a ground snap the speed doesn't explain (landing back on a loop's curve, a floor/wall mode change) is drawn eased
  // out over a few frames; the physics position stays exact
  vis.x*=.6;vis.y*=.6;if(p.ground&&!p.onObj&&!p.hang&&!p.dead&&roll===p.rolling){const ux=p.x-px-p.xsp,uy=p.y-py-p.ysp,u=Math.hypot(ux,uy);if(u>3&&u<40){vis.x-=ux;vis.y-=uy;}}
  if(Math.hypot(vis.x,vis.y)<.3)vis.x=vis.y=0;
  if(phase==='play'&&!tally&&!p.dead)clock+=TICK;
  events();fx.step();cam.update(p);
  if(net){shareTaken();partnerStep();nf.tick(STEP/1000);
   if(phase==='netwait')return null;// my run is over: the world goes on (and the partner) while we wait for their score
   // the partner got through the sign: NET_GRACE seconds to get there too
   if(phase==='play'&&!tally&&q?.through){graceAt??=clock;if(clock-graceAt>=NET_GRACE*60)return 'next';}}
  if(p.dead&&p.dead>=120&&phase==='play'){if((p.lives|0)<=0)gameOver('GAME OVER');else{O.respawn(p,{x:Z.start.x,y:Z.start.y});p.y-=1;cam.snap(p);S3.restart();if(buddy)buddy.flyIn=1;}}
  if(tally){tally.t++;if(tally.t===tally.len-60)S3.play('register');if(tally.t>=tally.len)return 'next';}
  if(phase==='over'){if(++endF>overLen)return 'next';}
  if(phase==='play'&&clock>=TIME_CAP)gameOver('TIME OVER');
  return null;}
 // ---------------- drawing
 function draw(t){const W=s.W,H=s.H;if(cam.W!==W||cam.H!==H){cam.resize(W,H,zoomFor(W,H));cam.clampIn();}
  x.save();x.imageSmoothingEnabled=false;back.draw(x,cam,t,Z.start.y-cam.vh*cam.focus);
  const k=cam.k,cx=Math.round(cam.x*k)/k,cy=Math.round(cam.y*k)/k,v=cam.view(64);
  const scenery=front=>{if(!Z.decor)return;x.save();x.scale(k,k);x.translate(-cx,-cy);for(const d of Z.decor)if(!d.over&&!!d.front===front&&(d.box?d.box[0]<v.x1&&d.box[2]>v.x0:d.x<v.x1+80&&d.x+(d.w||0)>v.x0-80))R.drawDecor(x,d,t);x.restore();};
  scenery(false);art.draw(x,cam,2);scenery(true);x.restore();
  x.save();x.scale(k,k);x.translate(-cx,-cy);
  for(const o of w.objs)if(!o.gone||o.type==='monitor'||o.kind==='thrower'){const ox=o.x??o.x0,oy=o.y??o.y0,half=o.type==='corkscrew'?o.w/2:0;if(o.type==='tube')continue;if(o.type!=='zipline'&&(ox+half<v.x0-80||ox-half>v.x1+80||(o.kind!=='thrower'&&(oy<v.y0-140||oy>v.y1+140))))continue;R.drawObject(x,o,t,{head,me:turns[turn],pilot:drawPilot});}
  for(const r of w.loose)if(r.x>v.x0&&r.x<v.x1)R.drawLoose(x,r,t);
  for(const sh of w.shots)R.drawShot(x,sh,t);
  if(net&&q&&qs)R.drawRunner(x,q,them,t,head);// the partner, behind my runner
  if(buddy)R.drawRunner(x,buddy,s.players[1]?1-turns[turn]:turns[turn],t,head);// the CPU fox, behind
  p.x+=vis.x;p.y+=vis.y;R.drawRunner(x,p,turns[turn],t,head);p.x-=vis.x;p.y-=vis.y;
  // going round the back of a corkscrew: its front half passes in front of the runner
  if(p.cork&&Math.sin(p.cork.a||0)<0)R.drawCorkscrew(x,p.cork.o,t,true);
  fx.draw(x);x.restore();
  loopFronts(k,cx,cy,v);
  if(net&&q&&qs)partnerArrow(s,x,{x:0,y:0,w:W,h:H},(q.x-cx)*k,(q.y-cy)*k,{player:them,color:PCOL[them],label:`${Math.round(Math.abs(q.x-p.x)/16)} m`,size:Math.round(Math.max(16,Math.min(26,k*9)))});
  // HUD
  const i=turns[turn];R.drawHUD(x,W,H,{score:(p.score|0)+(tally?Math.round((tally.time+tally.rings)*Math.min(1,tally.t/(tally.len-80))):0),rings:p.rings},tally?tally.clock:clock,{name:s.players[i].name.toUpperCase(),color:PCOL[i]});
  R.drawLives(x,W,H,p,i,head);
  drawPad(W,H);
  if(phase==='card')R.drawTitleCard(x,W,H,card,`${Z.zone}`,Z.act);
  if(tally&&phase!=='netwait')drawTally(W,H,i);
  if(overText&&(phase==='over'||p.dead))banner(overText,W,H);
  if(net&&phase==='netwait')banner(`WAITING FOR ${s.players[them].name.toUpperCase()}…`,W,H);
  else if(net&&phase==='play'&&!tally&&q?.through&&graceAt!==null)banner(`${s.players[them].name.toUpperCase()} IS THROUGH! ${Math.max(0,Math.ceil(NET_GRACE-(clock-graceAt)/60))}`,W,H);
 }
 // the exit side of each loop drawn OVER the runner (owner: "an entrance you're in front of and an exit in front of you"):
 // the lower right quarter of the loop's band (the terrain art again, clipped to that piece of ring) and the exit foot
 function loopFronts(k,cx,cy,v){if(!Z.decor)return;for(const d of Z.decor){if(!d.over||d.type!=='loopfoot')continue;if(d.cx-d.R-120>v.x1||d.cx+d.R+160<v.x0)continue;
  const sx=wx=>(wx-cx)*k,sy=wy=>(wy-cy)*k,n=16,a0=-.15,a1=Math.PI/2,ro=d.R+d.B+1,ri=d.R-1;
  x.save();x.beginPath();for(let j=0;j<=n;j++){const a=a0+(a1-a0)*j/n;const px=sx(d.cx+Math.cos(a)*ro),py=sy(d.cy+Math.sin(a)*ro);j?x.lineTo(px,py):x.moveTo(px,py);}
  for(let j=n;j>=0;j--){const a=a0+(a1-a0)*j/n;x.lineTo(sx(d.cx+Math.cos(a)*ri),sy(d.cy+Math.sin(a)*ri));}x.closePath();x.clip();art.draw(x,cam,0);x.restore();
  // the exit foot: its outline raised 10 px along the top (so its grass blades come along), the two ground corners as they are
  // the entrance side (owner, Nov 11): flat ground in FRONT of the runner from the outer end of the entrance foot to the
  // bottom of the loop (where the exit quarter above takes over), so the ground reads as carrying on in front of the foot
  x.save();x.scale(k,k);x.translate(-cx,-cy);R.frontGrass(x,d.cx-(d.R+d.B+44),d.cx+2,d.fy);x.restore();
  if(d.poly){const m=d.poly.length-2;x.save();x.beginPath();d.poly.forEach(([px,py],j)=>{const Y=sy(j<m?py-10:py),X=sx(px);j?x.lineTo(X,Y):x.moveTo(X,Y);});x.closePath();x.clip();art.draw(x,cam,0);x.restore();}
  else{x.save();x.scale(k,k);x.translate(-cx,-cy);R.drawDecor(x,d,0);x.restore();}}}
 const FONT='italic 900 %spx "Arial Black",Impact,system-ui,sans-serif';
 function banner(text,W,H){const sz=Math.round(Math.min(W/9,H/7,60));x.save();x.font=FONT.replace('%s',sz);x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(4,sz*.16);x.strokeStyle='#08103a';x.strokeText(text,W/2,H*.42);x.fillStyle='#fff';x.fillText(text,W/2,H*.42);x.restore();}
 function drawTally(W,H,i){const T=tally.t,sz=Math.round(Math.min(W/16,H/11,34)),k=Math.min(1,Math.max(0,(T-30)/(tally.len-110))),slide=Math.min(1,T/30);x.save();x.font=FONT.replace('%s',sz);x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(4,sz*.18);x.strokeStyle='#08103a';
  const L=(txt,col,yy,align,xx)=>{x.textAlign=align;x.strokeText(txt,xx,yy);x.fillStyle=col;x.fillText(txt,xx,yy);};
  const cxm=W/2,y0=H*.3;L(`${s.players[i].name.toUpperCase()} GOT`,'#fff',y0,'center',cxm-(1-slide)*W);L(`THROUGH ACT ${Z?.act||1}`,'#fff',y0+sz*1.2,'center',cxm+(1-slide)*W);
  const rows=[['TIME BONUS',Math.round(tally.time*(1-k))],['RING BONUS',Math.round(tally.rings*(1-k))],['TOTAL',Math.round((tally.time+tally.rings)*k)]];
  rows.forEach(([lab,val],r)=>{const yy=y0+sz*(2.8+r*1.25);L(lab,'#ffe23a',yy,'left',cxm-sz*6);L(String(val),'#fff',yy,'right',cxm+sz*6);});x.restore();}
 function drawPad(W,H){if(phase!=='play')return;const coarse=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;if(!coarse&&!pad.stick&&!pad.jump)return;
  const u=Math.min(W,H)/390,r0=44*u,st=pad.stick;x.save();
  const bx=st?st.sx:W*.16,by=st?st.sy:H-r0*1.9;x.globalAlpha=st?.45:.18;x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(bx,by,r0,0,7);x.stroke();
  x.fillStyle='#fff';x.globalAlpha=st?.55:.22;x.beginPath();x.arc(st?st.x:bx,st?st.y:by,r0*.42,0,7);x.fill();
  const jx=W-r0*1.9,jy=H-r0*1.9;x.globalAlpha=pad.jump?.55:.2;x.beginPath();x.arc(jx,jy,r0*.9,0,7);x.fill();x.globalAlpha=pad.jump?.9:.5;x.fillStyle='#08103a';x.font=`900 ${Math.round(r0*.55)}px Arial Black,Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText('JUMP',jx,jy+1);x.restore();}
 // ---------------- tests
 s.debug={get state(){return {phase,frames,clock,turn,p,w,cam,score:[...score],tally};},
  set bot(f){dbg={...(dbg||{}),bot:f};},autopilot(){dbg={...(dbg||{}),bot:zone1?zoneBot:testBot};},get boss(){const o=w?.objs.find(o=>o.type==='boss');return o?{state:o.state,hp:o.hp,active:o.active,done:o.done,x:o.x,y:o.y,fight,pilot:pilot.id,freed:s.gameRecruits.map(a=>[...a])}:null;},
  // online test harness: calling debug.bot() switches this phone's runner to an autopilot (hold right, hop when stuck)
  get bot(){return net?()=>{if(!dbg?.bot)dbg={...(dbg||{}),bot:netBot};return 'drive';}:dbg?.bot;},
  get net(){return net?{me,partner:qs?{x:qs.a[0],y:qs.a[1],through:!!(qs.b&512),done:!!(qs.b&4096)}:null,taken:taken?taken.reduce((a,v)=>a+v,0):0,graceAt,phase}:null;},teleport(px,py){Object.assign(p,{x:px,y:py,xsp:0,ysp:0,gsp:0,ground:false});cam.snap(p);},skipCard(){card=100;phase='play';},
  rings(n){p.rings=n;},player(i,body){turns[turn]=i;p.body=body||(i===1?'fox':'hog');abilities(p);},chunks:()=>art?.cache.size||0,music:()=>S3.nowPlaying(),seekSong:t=>S3.seekSong(t),SONGS:S3.SONGS,
  // tests: past the title (and the 1P select, picking CHARS[pick]: 0 hedgehog, 1 fox)
  skipIntro(pick=0,pick2){intro.skip={pick,pick2};intro.pick=pick;advance();},intro:()=>({phase,pick:intro.pick,who:intro.who,taken:intro.taken,t:introT()}),get buddy(){return buddy;},bodies:()=>({bodies:[...bodies],pairs:[...pairs]}),arrows:()=>I.selectArrows(s.W,s.H),introTap,choose,get body(){return p?.body||null;}};
 s.frame((dt,t)=>{if(!s.alive)return;if(phase==='title'||phase==='select'){introFrame();return;}if(phase==='idle'||phase==='done')return;
  const now=performance.now();acc+=held&&!net?0:Math.min(100,now-last);last=now;let n=0,res=null;// (held: the zoom card is open)
  while(acc>=STEP&&n<4&&!res){acc-=STEP;n++;res=stepFrame();}
  if(n===4)acc=0;
  S3.tick();S3.music(songFor());
  draw(t);
  if(res==='next'){phase='idle';next();}});
 if(!await introScreens())return;
 if(!await startTurn(0,{noCard:!!s.solo}))return;
}
Object.assign(exports,{sonic3});
