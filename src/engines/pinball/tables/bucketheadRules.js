// Bucketheadland rules. Shots: Roller Coaster ramp, Robot ramp, Nunchuck orbit, the Coop (VUK), Haunted Ride saucer,
// Giant Robot toy, B-U-C-K-E-T standups, Golden Egg captive ball, pops, spinner.
// Feature ladder: virtual 3-ball lock → JORDAN MULTIBALL; 5 robot hits → GIANT ROBOT BATTLE; B-O-T lanes light an
// ATTRACTION at the Haunted Ride (5 timed park attractions, each its own goal); play all 5 → the wizard mode
// WELCOME TO BUCKETHEADLAND (4-ball multiball, every major shot lit). m.say(..., {anim}) picks a DMD animation
// (tables/bucketheadDmd.js); rules.music(m) picks the song (tables/bucketheadMusic.js).
const fmt=n=>Math.round(n).toLocaleString('en-US');
const BUCKET=['bB','bU','bC','bK','bE','bT'];
const SHOT_LAMP={coaster:'coasterArrow',ramp:'robotArrow',orbit:'orbitArrow',coop:'coopJ',robot:'rh2'};
const SHOT_NAME={coaster:'COASTER',ramp:'ROBOT RAMP',orbit:'ORBIT',coop:'COOP',robot:'GIANT ROBOT'};
// One event → the named shot it makes (or null).
function shotOf(e){
 if(e.type==='rail')return e.id==='coaster'?'coaster':e.id==='robot'?'ramp':null;
 if(e.type==='trigger'&&e.id==='orbitL'&&e.dir<0)return 'orbit';
 if(e.type==='hole')return e.id==='coop'?'coop':e.id==='haunted'?'haunted':null;
 if(e.type==='toy')return 'robot';
 if(e.type==='standup')return e.id==='eggTarget'?'egg':BUCKET.includes(e.id)?'target':null;
 if(e.type==='spin')return 'spin';if(e.type==='bumper')return 'pop';
 return null;
}
// The five park attractions (Buckethead songs/albums). hit() returns points for a shot (0 = not part of the mode).
const ATTRACTIONS=[
 {id:'coaster',name:'ROLLER COASTER RUSH',short:'COASTER',hint:'RIDE THE COASTER 4 TIMES',time:30,goal:4,anim:'coaster',
  start(a){a.lit=['coaster'];},hit(m,a,s){if(s!=='coaster')return 0;a.count++;return 250000+75000*a.count;}},
 {id:'nunchuck',name:'NUNCHUCK FRENZY',short:'NUNCHUCKS',hint:'SPIN THE NUNCHUCK SPINNER',time:30,goal:50,anim:'nunchuck',
  start(a){a.lit=['orbit'];},hit(m,a,s){if(s==='spin'){a.count++;return 15000;}if(s==='orbit'){a.count+=5;return 150000;}return 0;}},
 {id:'bigsur',name:'BIG SUR MOON',short:'BIG SUR',hint:'HIT THE LIT SHOT',time:35,goal:4,anim:'moon',
  start(a,m){a.lit=[pickShot(m,null)];},hit(m,a,s){if(!a.lit.includes(s))return 0;a.count++;a.lit=[pickShot(m,s)];return 350000+50000*a.count;}},
 {id:'soothsayer',name:'SOOTHSAYER',short:'SOOTHSAYER',hint:'HIT ALL SIX B-U-C-K-E-T',time:35,goal:6,anim:'bucket',
  start(a){a.targets=[1,1,1,1,1,1];a.lit=[];},hit(m,a,s,e){if(s!=='target')return 0;const i=BUCKET.indexOf(e.id);if(!a.targets[i])return 20000;a.targets[i]=0;a.count++;return 175000;}},
 {id:'coop',name:'CHICKEN COOP PANIC',short:'COOP PANIC',hint:'POP BUMPERS AND THE GOLDEN EGG',time:30,goal:25,anim:'chicken',
  start(a){a.lit=[];},hit(m,a,s){if(s==='pop'){a.count++;return 30000;}if(s==='egg'){a.count+=5;return 250000;}return 0;}},
];
function pickShot(m,not){const list=['coaster','orbit','ramp','coop','robot'].filter(s=>s!==not);return list[Math.floor(m.w.random()*list.length)];}
const WIZ_SHOTS=['coaster','ramp','orbit','coop','robot'];

const rules={
 balls:3,
 replay:{easy:1500000,normal:3000000,hard:6000000},
 ATTRACTIONS,
 newPlayer:()=>({bot:[0,0,0],bonusX:1,bucket:[0,0,0,0,0,0],bucketDone:0,locks:0,lockLit:false,kickback:true,extraLit:false,extraGiven:false,
  coasters:0,robots:0,jackpot:500000,skill:1,mystery:0,robotHits:0,robotNeed:3,robotLit:false,robotsBeaten:0,eggHits:0,
  attrLit:true,attr:[0,0,0,0,0],attrNext:0,rampsToAttr:4,wizardLit:false,wizards:0}),
 startBall(m){const p=m.p;p.bot=[0,0,0];Object.assign(m.ball,{coasterCombo:0,skillLane:1,skillOpen:true,battle:null,attr:null});m.ballSave(10);m.w.parts.kickback.lit=p.kickback;
  const beam=m.w.parts.beam;beam.on=beam.grab=false;m.w.parts.giantRobot.tx=0;
  if(p.lockLit){for(const id of m.def.drops.egg)m.w.parts[id].down=true;}
  m.say(['SKILL SHOT','HIT THE LIT LANE'],2.2,{anim:'skill'});},
 // Flipper buttons move the lit top lanes (lane change), and before the plunge they move the skill-shot lane.
 flip(m,input){const p=m.p;if(m.ball.skillOpen&&m.phase==='plunge'){m.ball.skillLane=(m.ball.skillLane+(input?1:2))%3;return;}
  p.bot=input?[p.bot[2],p.bot[0],p.bot[1]]:[p.bot[1],p.bot[2],p.bot[0]];},
 event(m,e){const p=m.p,b=m.ball,shot=shotOf(e);
  // modes see the shot first
  if(shot&&b.attr)rules.attrShot(m,shot,e);
  if(shot&&m.mode==='wizard')rules.wizardShot(m,shot);
  switch(e.type){
   case 'bumper':m.score(5130);m.bonus(1);break;
   case 'sling':m.score(110);break;
   case 'spin':m.score(m.mb>1?2500:1000);break;
   case 'trigger':
    if(e.id==='orbitL'&&e.dir<0){m.score(25000);if(!m.w.parts.kickback.lit){m.w.parts.kickback.lit=p.kickback=true;m.say(['KICKBACK','IS LIT'],1.6);m.sfx('award');}else if(!b.attr)m.say(['NUNCHUCK','ORBIT 25,000'],1.2,{anim:'nunchuck'});}
    // a real loop: up the left orbit, round the top, down the right side within 3 s (not the gate return)
    if(e.id==='orbitL'&&e.dir<0)b.loopT=m.t;
    if(e.id==='orbitR'&&e.dir>0){if(m.t-(b.loopT??-9)<3){b.loopT=-9;m.score(50000);if(!b.attr&&m.mode!=='wizard')m.say(['LOOP!','50,000'],1.1,{anim:'coaster'});}else m.score(1000);}
    break;
   case 'rollover':{
    const lane=['laneB','laneO','laneT'].indexOf(e.id);
    if(lane>=0){m.score(10000);m.bonus(2);
     if(b.skillOpen&&m.inPlay<4){b.skillOpen=false;if(lane===b.skillLane){const v=250000*p.skill;p.skill++;m.score(v);m.say(['SKILL SHOT',fmt(v)],2.2,{flash:true,anim:'jackpot'});m.sfx('skill');}}
     p.bot[lane]=1;if(p.bot.every(Boolean)){p.bot=[0,0,0];m.score(50000);if(p.bonusX<6)p.bonusX++;
      if(!p.attrLit&&!b.attr&&!p.wizardLit&&m.mode!=='wizard'){p.attrLit=true;m.say(['ATTRACTION','IS LIT'],1.8,{anim:'ferris'});}else m.say(['BOT COMPLETE',`BONUS ${p.bonusX}X`],1.8);m.sfx('award');}}
    else if(e.id==='inL'||e.id==='inR'){m.score(5000);m.bonus(1);}
    else if(e.id==='outR'){m.score(5000);}
    break;}
   case 'kickback':m.score(5000);p.kickback=false;m.say(['KICKBACK!'],1.2);m.sfx('kick');break;
   case 'outlane':m.score(5000);break;
   case 'drop':m.score(3000);m.bonus(1);
    if(m.def.drops.egg.every(id=>m.w.parts[id].down)&&!p.lockLit&&m.mode!=='wizard'){p.lockLit=true;m.score(25000);m.say(['EGGS CRACKED','LOCK IS LIT'],2,{anim:'egg'});m.sfx('award');}
    break;
   case 'toy':rules.robotHit(m);break;
   case 'magnet':m.score(50000);m.say(['TRACTOR BEAM','THE ROBOT HAS YOU'],1.4,{anim:'beam'});m.sfx('lock');break;
   case 'eject':if(e.vuk)m.sfx('kick');break;
   case 'standup':if(e.id==='eggTarget'){rules.goldenEgg(m);break;}{const i=BUCKET.indexOf(e.id);m.score(10000);if(i>=0&&!p.bucket[i]){p.bucket[i]=1;
     if(p.bucket.every(Boolean)){p.bucket.fill(0);p.bucketDone++;m.score(100000);if(!p.extraGiven&&!p.extraLit){p.extraLit=true;m.say(['B-U-C-K-E-T','EXTRA BALL IS LIT'],2.2,{flash:true,anim:'bucket'});}else m.say(['B-U-C-K-E-T','100,000'],1.6,{anim:'bucket'});m.sfx('award');}
     else if(!b.attr)m.say(['BUCKET',p.bucket.map((v,j)=>v?'BUCKET'[j]:'-').join(' ')],1.1);}
    break;}
   case 'railEnter':m.sfx('ramp');break;
   case 'rail':
    if((e.id==='coaster'||e.id==='robot')&&!p.attrLit&&!b.attr&&!p.wizardLit&&m.mode!=='wizard'&&--p.rampsToAttr<=0){p.rampsToAttr=4;p.attrLit=true;m.later(1.5,()=>m.say(['ATTRACTION','IS LIT'],1.8,{anim:'ferris'}));}
    if(e.id==='coaster'){p.coasters++;b.coasterCombo++;const v=50000+25000*(b.coasterCombo-1);m.score(v);m.bonus(3);
     if(m.mode==='jordan'&&b.jackC){b.jackC=false;m.jackpot('COASTER');}else if(!b.attr&&m.mode!=='wizard')m.say(['ROLLER COASTER',fmt(v)],1.4,{anim:'coaster'});}
    if(e.id==='robot'||e.id==='coopVuk')p.robotLit=true;
    if(e.id==='robot'){p.robots++;m.score(50000);m.bonus(3);p.jackpot=Math.min(2000000,p.jackpot+50000);
     if(m.mode==='jordan'&&b.jackR){b.jackR=false;m.jackpot('ROBOT');}else if(b.battle){m.score(100000);m.say(['ROBOT RAMP','100,000'],1.2);}else if(!b.attr&&m.mode!=='wizard')m.say(['ROBOT RAMP',p.jackpot<2000000?'JACKPOT +50,000':'JACKPOT MAXED'],1.4,{anim:'robot'});}
    if(e.id==='coopVuk')m.score(5000);
    break;
   case 'hole':
    if(e.id==='coop'){
     if(m.mode==='jordan'&&b.superLit){b.superLit=false;const v=p.jackpot*3;m.score(v);m.say(['SUPER JACKPOT',fmt(v)],3,{flash:true,anim:'jackpot'});m.sfx('super');b.jackC=b.jackR=true;}
     else if(p.lockLit&&!m.mode){p.locks++;p.lockLit=false;m.score(100000);
      if(p.locks>=3){p.locks=0;m.startJordan();}
      else{m.say([`BALL ${p.locks} LOCKED`,p.locks===2?'ONE MORE FOR JORDAN':'LOCK 2 MORE'],2,{anim:'lock'});m.sfx('lock');e.ball.hold.t=2;}}
     else m.score(15000);
     m.later(e.ball.hold.t+.6,()=>{if(!m.p.lockLit&&!m.mode)m.resetBank('egg');});
    }
    if(e.id==='haunted'){m.score(25000);
     if(p.extraLit){p.extraLit=false;p.extraGiven=true;m.extraBall();}
     else if(p.wizardLit&&!m.mode&&!b.attr){p.wizardLit=false;rules.startWizard(m);e.ball.hold.t=3;}
     else if(p.attrLit&&!b.attr&&!m.mode){p.attrLit=false;rules.startAttraction(m);e.ball.hold.t=3;}
     else{const awards=[['250,000',()=>m.score(250000)],['LIGHT LOCK',()=>{if(m.mode)return m.score(100000);p.lockLit=true;for(const id of m.def.drops.egg)m.w.parts[id].down=true;}],['KICKBACK LIT',()=>{p.kickback=m.w.parts.kickback.lit=true;}],['BONUS X UP',()=>{p.bonusX=Math.min(6,p.bonusX+1);}],['100,000',()=>m.score(100000)],['BALL SAVE',()=>m.ballSave(15)]];
      const a=awards[(p.mystery++*5+m.p.coasters+m.p.robots)%awards.length];a[1]();m.say(['HAUNTED RIDE',a[0]],2,{anim:'ghost'});m.sfx('award');e.ball.hold.t=1.8;}}
    break;
  }},
 // ---- attractions
 startAttraction(m){const p=m.p;let i=p.attrNext;for(let k=0;k<5&&p.attr[i];k++)i=(i+1)%5;
  const def=ATTRACTIONS[i],a={i,def,t:def.time,count:0,total:0,lit:[]};def.start(a,m);m.ball.attr=a;p.attrNext=(i+1)%5;
  m.say([def.name,def.hint],3,{flash:true,anim:def.anim,mode:true});m.sfx('multiball');m.ballSave(6);},
 attrShot(m,shot,e){const a=m.ball.attr,v=a.def.hit(m,a,shot,e);if(!v)return;m.score(v);a.total+=v;
  if(a.count>=a.def.goal)rules.endAttraction(m,true);
  else m.say([a.def.short,`${fmt(v)}`],1.1,{anim:a.def.anim});},
 endAttraction(m,done){const p=m.p,a=m.ball.attr;if(!a)return;m.ball.attr=null;p.attr[a.i]=done?2:1;
  if(done){const v=500000*(1+p.attr.filter(x=>x===2).length);m.score(v);a.total+=v;m.say([`${a.def.short} COMPLETE`,fmt(a.total)],3,{flash:true,anim:'jackpot'});m.sfx('super');}
  else m.say([`${a.def.short} TOTAL`,fmt(a.total)],2.4,{anim:a.def.anim});
  if(p.attr.every(Boolean)){p.wizardLit=true;m.later(3,()=>m.say(['ALL ATTRACTIONS RIDDEN','WIZARD MODE IS LIT'],3,{flash:true,anim:'ferris'}));}},
 // ---- wizard mode: WELCOME TO BUCKETHEADLAND
 startWizard(m){const p=m.p;m.mode='wizard';m.ball.wiz={round:1,lit:WIZ_SHOTS.slice(),total:0};
  m.say(['WELCOME TO','BUCKETHEADLAND'],4,{flash:true,anim:'wizard',mode:true});m.sfx('super');m.addBalls(3);m.ballSave(20);},
 wizardShot(m,shot){const wz=m.ball.wiz;if(!wz||!wz.lit.includes(shot))return;wz.lit=wz.lit.filter(s=>s!==shot);const v=1000000*wz.round;m.score(v);wz.total+=v;
  if(!wz.lit.length){const sv=5000000*wz.round;m.score(sv);wz.total+=sv;wz.round++;wz.lit=WIZ_SHOTS.slice();m.say(['BUCKETHEADLAND',`SUPER ${fmt(sv)}`],3,{flash:true,anim:'jackpot'});m.sfx('super');}
  else{m.say([SHOT_NAME[shot],fmt(v)],1.4,{anim:'wizard'});m.sfx('jackpot');}},
 // ---- Golden Egg captive ball: every hit on its target grows the jackpot; every third lights the lock.
 goldenEgg(m){const p=m.p;p.eggHits++;p.jackpot=Math.min(2000000,p.jackpot+25000);m.score(25000);m.sfx('award');
  if(m.ball.attr)return;
  if(p.eggHits%3===0){if(!p.lockLit&&!m.mode){p.lockLit=true;for(const id of m.def.drops.egg)m.w.parts[id].down=true;m.say(['GOLDEN EGG','LOCK IS LIT'],2,{flash:true,anim:'egg'});}else{m.score(250000);m.say(['GOLDEN EGG','250,000'],1.8,{flash:true,anim:'egg'});}}
  else m.say(['GOLDEN EGG',`JACKPOT ${fmt(p.jackpot)}`],1.4,{anim:'egg'});},
 // ---- Giant Robot: hits build toward the battle; in the battle the robot walks and its tractor beam grabs the ball.
 // Outside the battle a hit only counts while the robot is LIT (the Robot Ramp or the Coop VUK lights it for one hit),
 // so looping the upper flipper into it keeps the ball alive for small change but can't farm the battle.
 robotHit(m){const p=m.p,bt=m.ball.battle;
  if(m.t-(p.robotLastT??-9)<(bt?.8:1)){m.score(1000);return;}p.robotLastT=m.t;
  if(!bt&&!p.robotLit){m.score(5000);return;}if(!bt)p.robotLit=false;
  if(bt){bt.hits++;m.score(75000*Math.min(3,p.robotsBeaten+1));m.sfx('jackpot');
   if(bt.hits>=4){const v=500000*Math.min(3,p.robotsBeaten+1);p.robotsBeaten++;m.ball.battle=null;m.w.parts.beam.on=m.w.parts.beam.grab=false;m.w.parts.giantRobot.tx=0;m.score(v);m.say(['GIANT ROBOT','DEFEATED!',fmt(v)],3,{flash:true,anim:'robotDown'});m.sfx('super');if(!p.kickback){p.kickback=m.w.parts.kickback.lit=true;}}
   else m.say(['ROBOT HIT',`${4-bt.hits} MORE TO WIN`],1.3,{anim:'robot'});return;}
  p.robotHits++;m.score(15000);
  if(p.robotHits>=p.robotNeed&&m.mode!=='jordan'&&m.mode!=='wizard'){p.robotHits=0;p.robotNeed+=2;m.ball.battle={t:30,hits:0,grabCool:3};m.say(['GIANT ROBOT','BATTLE!','HIT IT 4 TIMES'],2.6,{flash:true,anim:'robot',mode:true});m.sfx('multiball');m.ballSave(8);}
  else if(!m.ball.attr&&m.mode!=='wizard')m.say(['GIANT ROBOT',`${p.robotNeed-p.robotHits} MORE FOR BATTLE`],1.2,{anim:'robot'});},
 // ---- per frame: mode clocks, the robot's walk and the beam.
 tick(m,dt){const bt=m.ball.battle,robot=m.w.parts.giantRobot,beam=m.w.parts.beam,a=m.ball.attr;
  if(a){a.t-=dt;if(a.t<=0)rules.endAttraction(m,false);}
  robot.armed=!!bt;if(!bt){robot.tx=0;beam.on=beam.grab=false;return;}
  bt.t-=dt;robot.tx=12*Math.sin(m.t*1.7);bt.grabCool-=dt;
  const holding=m.w.balls.some(b=>b.hold?.hole.id==='beam');if(holding)bt.grabCool=6;
  beam.on=beam.grab=bt.grabCool<=0;
  if(bt.t<=0){m.ball.battle=null;beam.on=beam.grab=false;m.say(['THE ROBOT','ESCAPES'],1.8,{anim:'robot'});}},
 // DMD bottom line while modes run (rotates every 2 s when several run at once).
 dmdMode(m){const b=m.ball,L=[];
  if(m.mode==='wizard'&&b.wiz)L.push(`BUCKETHEADLAND · ${b.wiz.lit.length} LIT`);
  if(b.attr)L.push(`${b.attr.def.short} ${Math.min(b.attr.count,b.attr.def.goal)}/${b.attr.def.goal} · ${Math.ceil(b.attr.t)}`);
  if(b.battle)L.push(`ROBOT ${4-b.battle.hits} TO GO · ${Math.ceil(b.battle.t)}`);
  if(m.mode==='jordan')L.push(b.superLit?'SUPER AT THE COOP':'JORDAN MULTIBALL');
  return L.length?L[Math.floor(m.t/2)%L.length]:'';},
 // Which song plays (tables/bucketheadMusic.js).
 music(m){if(m.mode==='wizard')return 'wizard';if(m.mode==='jordan')return 'jordan';if(m.ball.battle)return 'battle';if(m.ball.attr)return m.ball.attr.def.id;return 'main';},
 // Multiball: both ramps light a jackpot; after both, the super jackpot lights at the Coop.
 startJordan(m){m.mode='jordan';for(const id of m.def.drops.egg)m.w.parts[id].down=true;m.ball.jackC=m.ball.jackR=true;m.ball.superLit=false;m.say(['JORDAN','MULTIBALL'],3,{flash:true,anim:'multiball',mode:true});m.sfx('multiball');m.addBalls(2);m.ballSave(12);},
 jackpot(m,which){const v=m.p.jackpot;m.score(v);m.say([`${which} JACKPOT`,fmt(v)],2.2,{flash:true,anim:'jackpot'});m.sfx('jackpot');if(!m.ball.jackC&&!m.ball.jackR){m.ball.superLit=true;m.say(['SUPER JACKPOT','IS LIT AT THE COOP'],2.4,{anim:'egg'});}},
 multiballEnd(m){const p=m.p;
  if(m.mode==='jordan'){m.mode=null;m.ball.superLit=false;m.say(['JORDAN OVER'],1.6);}
  else if(m.mode==='wizard'){m.mode=null;const tot=m.ball.wiz?.total||0;m.ball.wiz=null;p.wizards++;p.attr=[0,0,0,0,0];p.attrLit=true;m.say(['BUCKETHEADLAND TOTAL',fmt(tot)],3,{anim:'wizard'});}
  if(!p.lockLit&&!m.w.balls.some(b=>b.hold?.hole.id==='coop'))m.resetBank('egg');},
 lamps(m,t){const p=m.p,b=m.ball,L={},blink=(f=4)=>Math.floor(t*f)%2?1:0;
  const skill=m.phase==='plunge'||b.skillOpen&&m.inPlay<4;
  ['laneB','laneO','laneT'].forEach((id,i)=>L[id]=skill&&i===b.skillLane?blink(6):p.bot[i]);
  const sooth=b.attr?.def.id==='soothsayer'?b.attr.targets:null;
  BUCKET.forEach((id,i)=>L[id]=sooth?(sooth[i]?blink(5):0):p.bucket[i]);
  for(let i=0;i<3;i++)L['lock'+i]=i<p.locks?1:i===p.locks&&p.lockLit?blink(3):0;
  for(const n of [2,3,4,5,6])L['bx'+n]=p.bonusX>=n?1:0;
  L.kickback=m.w.parts.kickback.lit?1:0;L.outR=0;L.inL=L.inR=0;
  // shot arrows: modes first, then multiball jackpots, then a gentle idle chase
  const lit=new Set([...(b.attr?.lit||[]),...(m.mode==='wizard'?b.wiz?.lit||[]:[])]);
  L.coasterArrow=lit.has('coaster')?blink(7):m.mode==='jordan'?(b.jackC?blink(5):0):blink(1.5);
  L.robotArrow=lit.has('ramp')?blink(7):m.mode==='jordan'?(b.jackR?blink(5):0):blink(1.5)*(t%3<1.5?1:0);
  L.orbitArrow=lit.has('orbit')?blink(7):0;
  L.coasterJ=m.mode==='jordan'&&b.jackC?1:0;L.robotJ=m.mode==='jordan'&&b.jackR?1:0;L.coopJ=lit.has('coop')||b.superLit?blink(6):p.lockLit?blink(2):0;
  L.hauntedEB=p.extraLit?blink(3):0;L.hauntedMy=p.wizardLit||(p.attrLit&&!b.attr&&!m.mode)?blink(4):blink(.6);
  const bt=b.battle;for(let i=0;i<5;i++)L['rh'+i]=lit.has('robot')?blink(7):bt?(i<bt.hits?1:i===bt.hits?blink(6):0):(p.robotLit&&i===Math.floor(p.robotHits*5/p.robotNeed)?blink(4):i<Math.floor(p.robotHits*5/p.robotNeed)?1:0);
  for(let i=0;i<3;i++)L['egg'+i]=i<p.eggHits%3?1:0;
  for(let i=0;i<5;i++)L['at'+i]=b.attr?.i===i?blink(6):p.attr[i]===2?1:p.attr[i]===1?blink(1):0;
  L.shootAgain=m.shootAgainLamp?blink(2):0;L.jordan=m.mode==='wizard'?blink(10):m.mode==='jordan'?blink(8):p.locks?1:0;L.spinner=m.mb>1||b.attr?.def.id==='nunchuck'?1:0;
  return L;},
 // End-of-ball bonus count (lines shown on the DMD).
 bonusLines(m){const p=m.p,units=m.ball.bonus;return [['BONUS',units*2500],['ATTRACTIONS',p.attr.filter(x=>x===2).length*100000],['BONUS X',p.bonusX]];},
 bonusTotal(m){const p=m.p;return (m.ball.bonus*2500+p.attr.filter(x=>x===2).length*100000)*p.bonusX;},
 attract:['BUCKETHEADLAND','WELCOME TO THE PARK','JORDAN MULTIBALL','SPELL B-U-C-K-E-T'],
};
Object.assign(exports,{rules,ATTRACTIONS,shotOf});
