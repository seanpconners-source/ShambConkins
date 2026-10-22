// Bucketheadland (Buckethead, 1992 album "Bucketheadland": the theme park Buckethead dreamed up). Table 1 of the
// band-table series. Layout: left orbit with the Nunchuck spinner, Roller Coaster plastic ramp (left), Giant Robot
// wire ramp (right), three Chicken Coop pop bumpers under the B-O-T top lanes, the Coop ball lock behind three EGG
// drop targets, B-U-C-K-E-T standups, the Haunted Ride saucer, left outlane kickback. Upper right: the Giant Robot
// (a moving toy) with its tractor-beam magnet, fed by the upper flipper; the Coop is a VUK that fires the ball up a
// wireform onto that flipper. The Golden Egg captive ball sits right of the Coop.
// Rules: virtual 3-ball lock → JORDAN MULTIBALL (jackpots on both ramps, super jackpot at the Coop); 5 robot hits →
// GIANT ROBOT BATTLE (robot walks, magnet grabs the ball, 4 hits to win); Golden Egg hits raise the jackpot.
const {tableBuilder,arc,spline}=require("src/engines/pinball/build.js");

function buildTable(){
 const T=tableBuilder({id:'buckethead',name:'Bucketheadland',W:514,H:1067,gravity:1300,slope:6.5,drainY:1040});
 const m=p=>[472-p[0],p[1]];             // lower playfield mirror (centre line x 236)
 // Cabinet: left wall, top arch, right wall; shooter lane on the right.
 T.wall([[12,880],[12,256],...arc(256,256,244,180,360,36).slice(1),[500,1062]],{look:'wood',r:3});
 T.wall([[460,1062],[460,342]],{look:'rail',r:3});                 // shooter lane inner wall
 T.wall([[460,1062],[500,1062]],{look:'none',r:3});
 T.gate('shooterGate',[460,338],[499,302],[0,-1]);                  // lets the plunge out, deflects returns into play
 T.plunger(463,497,1010,{travel:36,vmin:950,vmax:3600,auto:2900});
 // Left orbit: inner wall + one-way gate at the top so plunges can't fall down the orbit.
 T.wall([[58,268],[58,560]],{look:'rail',r:4});T.post(58,560,6);
 T.gate('orbitGate',[13,232],[57,266],[0,-1]);
 T.spinner('spinner',[16,470],[54,470]);
 T.trigger('orbitL',[16,320],[54,320]);
 T.trigger('orbitR',[463,280],[497,280]);                           // ball coming down the right side = loop made
 // Top lanes B-O-T + guides.
 for(const gx of [174,218,262,306])T.wall([[gx,104],[gx,148]],{look:'rail',r:4});
 [['laneB',196],['laneO',240],['laneT',284]].forEach(([id,x],i)=>{T.rollover(id,x,126,{label:'BOT'[i]});T.lamp(id,x,98,{r:8,color:'#ffd23f',label:'BOT'[i]});});
 // Chicken Coop pop bumpers.
 T.bumper('pop1',200,212,{r:26}).bumper('pop2',282,212,{r:26}).bumper('pop3',241,278,{r:26});
 // The Coop: lock pocket behind three EGG drop targets.
 T.wall([[200,472],[200,410],[236,394],[272,410],[272,472]],{look:'plastic',r:4});   // peaked roof: nothing rests on it
 T.drops('egg',[[[204,474],[224,474]],[[226,474],[246,474]],[[248,474],[268,474]]],{labels:['E','G','G']});
 // The Coop is a VUK: the ball is kicked straight up onto a wireform that drops it on the upper flipper.
 T.hole('coop',236,436,{r:17,hold:1.2,toRail:'coopVuk',railSpeed:2600});
 T.rail('coopVuk',spline([[236,436,0],[238,428,30],[252,408,58],[290,378,76],[340,352,86],[390,338,80],[414,342,52],[420,350,24]],8),{look:'wire',width:40,noEntry:true,exit:{minOut:120}});
 [0,1,2].forEach(i=>T.lamp('lock'+i,216+i*20,506,{r:7,color:'#ff8c1a'}));
 T.lamp('coopJ',236,540,{shape:'arrow',r:12,color:'#ff2d55',label:'SUPER'});
 // Roller Coaster ramp (left plastic ramp, loops over the left orbit, drops into the left inlane).
 T.wall([[126,592],[126,526]],{look:'plastic',r:4}).wall([[174,592],[174,526]],{look:'plastic',r:4});
 T.post(126,592,5).post(174,592,5);
 T.rail('coaster',spline([[150,520,0],[146,430,26],[126,330,56],[98,236,80],[66,176,92],[34,214,96],[30,330,90],[34,500,70],[46,640,42],[72,752,12],[72,792,0]],10),{look:'plastic',width:46,color:'#e63946',exit:{minOut:600}});
 T.lamp('coasterArrow',150,616,{shape:'arrow',r:13,color:'#ff3b30',label:'COASTER'});
 T.lamp('coasterJ',150,648,{r:8,color:'#ffd23f',label:'JACKPOT'});
 // Giant Robot wire ramp (right).
 T.wall([[348,592],[348,526]],{look:'plastic',r:4}).wall([[396,592],[396,526]],{look:'plastic',r:4});
 T.post(348,592,5).post(396,592,5);
 T.rail('robot',spline([[372,520,0],[372,440,28],[380,360,52],[400,314,64],[430,302,68],[452,332,64],[454,440,55],[446,560,40],[430,680,25],[400,752,10],[400,792,0]],10),{look:'wire',width:46,exit:{minOut:600}});
 // Upper right flipper (right button) under the Giant Robot.
 T.flipper('flipU',450,380,{len:58,r0:10,r1:5.5,rest:170,up:215,input:1,wUp:50});
 // The Giant Robot: a moving toy (body capsules); its tractor-beam magnet sits in front of it.
 T.toy('giantRobot',404,214,{w:96,h:84,speed:60,label:'GIANT ROBOT',segs:[[362,250,446,250,7],[362,250,362,182,7],[446,250,446,182,7],[362,182,404,158,7],[404,158,446,182,7]]});
 T.magnet('beam',404,292,{r:34,force:7000,fling:[-650,700],holdT:1.4});
 [0,1,2,3,4].forEach(i=>T.lamp('rh'+i,372+i*16,272,{r:5,color:'#32d74b'}));
 // Golden Egg: captive ball in a closed channel, a target at the top.
 T.wall([[312,478],[312,350],[348,350],[348,478]],{look:'plastic',r:4});T.post(317,492,4).post(343,492,4);
 T.standup('eggTarget',[318,358],[342,358],{label:'EGG',color:'#ffd23f'});T.captive('egg',330,470);
 [0,1,2].forEach(i=>T.lamp('egg'+i,318+i*12,512,{r:5,color:'#ffd23f'}));
 T.lamp('robotArrow',372,616,{shape:'arrow',r:13,color:'#32d74b',label:'ROBOT'});
 T.lamp('robotJ',372,648,{r:8,color:'#ffd23f',label:'JACKPOT'});
 // B-U-C on the orbit wall, K-E-T on the shooter wall.
 [['bB',340],['bU',384],['bC',428]].forEach(([id,y],i)=>{T.standup(id,[63,y-11],[63,y+11],{label:'BUC'[i],color:'#4cc9f0'});T.lamp(id,80,y,{r:7,color:'#4cc9f0',label:'BUC'[i]});});
 [['bK',446],['bE',488],['bT',530]].forEach(([id,y],i)=>{T.standup(id,[455,y-11],[455,y+11],{label:'KET'[i],color:'#4cc9f0'});T.lamp(id,438,y,{r:7,color:'#4cc9f0',label:'KET'[i]});});
 // Haunted Ride saucer.
 T.hole('haunted',418,614,{r:16,maxSpeed:1500,hold:1,eject:[-680,880],label:'HAUNTED RIDE'});
 T.lamp('hauntedEB',418,656,{r:8,color:'#ff9f0a',label:'EXTRA BALL'});
 T.lamp('hauntedMy',418,576,{r:8,color:'#bf5af2',label:'MYSTERY'});
 // Lower playfield (left side, mirrored to the right).
 const lower=(f)=>{
  T.wall([f([12,880]),f([110,976])],{look:'wood',r:3});            // outlane floor toward the drain
  T.wall([f([50,722]),f([50,850]),f([134,930])],{look:'rail',r:3}); // outlane / inlane divider + inlane guide
  T.post(...f([50,722]),6);
 };
 lower(p=>p);lower(m);
 T.sling('slingL',[94,762],[94,830],[132,868]);T.sling('slingR',m([94,762]),m([94,830]),m([132,868]));
 T.post(94,762,6).post(...m([94,762]),6);
 T.flipper('flipL',148,946,{len:74,rest:30,up:-28,input:0});
 T.flipper('flipR',324,946,{len:74,rest:150,up:208,input:1});
 T.rollover('inL',72,812,{r:10});T.rollover('inR',400,812,{r:10});
 T.kickback('kickback',31,858,[0,-2500]);T.rollover('outR',441,858,{r:10});
 T.lamp('kickback',31,812,{r:8,color:'#ff3b30',label:'KICK'});T.lamp('outR',441,812,{r:7,color:'#ff3b30'});
 T.lamp('inL',72,780,{r:7,color:'#ffd23f'});T.lamp('inR',400,780,{r:7,color:'#ffd23f'});
 // Centre inserts: bonus X ladder, shoot again.
 ['2','3','4','5','6'].forEach((t,i)=>T.lamp('bx'+t,176+i*30,738,{r:10,color:'#ffd23f',label:t+'X'}));
 T.lamp('shootAgain',236,905,{r:13,color:'#ff3b30',label:'SHOOT AGAIN',shape:'circle'});
 T.lamp('jordan',236,620,{r:22,shape:'star',color:'#ff2d55',label:'JORDAN'});
 T.lamp('spinner',35,520,{r:7,color:'#64d2ff'});
 return T.def;
}

// ---------------------------------------------------------------- rules
const fmt=n=>Math.round(n).toLocaleString('en-US');
const rules={
 balls:3,
 replay:{easy:3000000,normal:6000000,hard:12000000},
 newPlayer:()=>({bot:[0,0,0],bonusX:1,bucket:[0,0,0,0,0,0],bucketDone:0,locks:0,lockLit:false,kickback:true,extraLit:false,extraGiven:false,coasters:0,robots:0,jackpot:500000,skill:1,mystery:0,robotHits:0,robotNeed:5,robotsBeaten:0,eggHits:0}),
 startBall(m){const p=m.p;p.bot=[0,0,0];m.ball.coasterCombo=0;m.ball.skillLane=1;m.ball.skillOpen=true;m.ball.battle=null;m.ballSave(10);m.w.parts.kickback.lit=p.kickback;
  const beam=m.w.parts.beam;beam.on=beam.grab=false;m.w.parts.giantRobot.tx=0;
  if(p.lockLit){for(const id of m.def.drops.egg)m.w.parts[id].down=true;}
  m.say(['SKILL SHOT','HIT THE LIT LANE'],2.2);},
 // Flipper buttons move the lit top lanes (lane change), and before the plunge they move the skill-shot lane.
 flip(m,input){const p=m.p;if(m.ball.skillOpen&&m.phase==='plunge'){m.ball.skillLane=(m.ball.skillLane+(input?1:2))%3;return;}
  p.bot=input?[p.bot[2],p.bot[0],p.bot[1]]:[p.bot[1],p.bot[2],p.bot[0]];},
 event(m,e){const p=m.p,b=m.ball;
  switch(e.type){
   case 'bumper':m.score(5130);m.bonus(1);break;
   case 'sling':m.score(110);break;
   case 'spin':m.score(m.mb>1?2500:1000);break;
   case 'trigger':
    if(e.id==='orbitL'&&e.dir<0){m.score(25000);if(!m.w.parts.kickback.lit){m.w.parts.kickback.lit=p.kickback=true;m.say(['KICKBACK','IS LIT'],1.6);m.sfx('award');}else m.say(['NUNCHUCK','ORBIT 25,000'],1.2);}
    if(e.id==='orbitR'&&e.dir>0)m.score(10000);
    break;
   case 'rollover':{
    const lane=['laneB','laneO','laneT'].indexOf(e.id);
    if(lane>=0){m.score(10000);m.bonus(2);
     if(b.skillOpen&&m.inPlay<4){b.skillOpen=false;if(lane===b.skillLane){const v=250000*p.skill;p.skill++;m.score(v);m.say(['SKILL SHOT',fmt(v)],2.2,{flash:true});m.sfx('skill');}}
     p.bot[lane]=1;if(p.bot.every(Boolean)){p.bot=[0,0,0];m.score(50000);if(p.bonusX<6){p.bonusX++;m.say(['BOT COMPLETE',`BONUS ${p.bonusX}X`],1.8);}else m.say(['BOT COMPLETE','50,000'],1.5);m.sfx('award');}}
    else if(e.id==='inL'||e.id==='inR'){m.score(5000);m.bonus(1);}
    else if(e.id==='outR'){m.score(5000);m.say(['OUTLANE','...'],1);}
    break;}
   case 'kickback':m.score(5000);p.kickback=false;m.say(['KICKBACK!'],1.2);m.sfx('kick');break;
   case 'outlane':m.score(5000);break;
   case 'drop':m.score(3000);m.bonus(1);
    if(m.def.drops.egg.every(id=>m.w.parts[id].down)&&!p.lockLit){p.lockLit=true;m.score(25000);m.say(['EGGS CRACKED','LOCK IS LIT'],2);m.sfx('award');}
    break;
   case 'toy':rules.robotHit(m);break;
   case 'magnet':m.score(50000);m.say(['TRACTOR BEAM','THE ROBOT HAS YOU'],1.4);m.sfx('lock');break;
   case 'eject':if(e.vuk)m.sfx('kick');break;
   case 'standup':if(e.id==='eggTarget'){rules.goldenEgg(m);break;}{const i=['bB','bU','bC','bK','bE','bT'].indexOf(e.id);m.score(10000);if(i>=0&&!p.bucket[i]){p.bucket[i]=1;
     if(p.bucket.every(Boolean)){p.bucket.fill(0);p.bucketDone++;m.score(100000);if(!p.extraGiven&&!p.extraLit){p.extraLit=true;m.say(['B-U-C-K-E-T','EXTRA BALL IS LIT'],2.2,{flash:true});}else m.say(['B-U-C-K-E-T','100,000'],1.6);m.sfx('award');}
     else m.say(['BUCKET',p.bucket.map((v,j)=>v?'BUCKET'[j]:'-').join(' ')],1.1);}
    break;}
   case 'railEnter':m.sfx('ramp');break;
   case 'railFail':break;
   case 'rail':
    if(e.id==='coaster'){p.coasters++;b.coasterCombo++;const v=50000+25000*(b.coasterCombo-1);m.score(v);m.bonus(3);
     if(m.mode==='jordan'&&b.jackC){b.jackC=false;m.jackpot('COASTER');}else m.say(['ROLLER COASTER',fmt(v)],1.4);}
    if(e.id==='robot'){p.robots++;m.score(50000);m.bonus(3);p.jackpot=Math.min(2000000,p.jackpot+50000);
     if(m.mode==='jordan'&&b.jackR){b.jackR=false;m.jackpot('ROBOT');}else if(b.battle){m.score(100000);m.say(['ROBOT RAMP','100,000'],1.2);}else m.say(['ROBOT RAMP',p.jackpot<2000000?'JACKPOT +50,000':'JACKPOT MAXED'],1.4);}
    if(e.id==='coopVuk')m.score(5000);
    break;
   case 'hole':
    if(e.id==='coop'){
     if(m.mode==='jordan'&&b.superLit){b.superLit=false;const v=p.jackpot*3;m.score(v);m.say(['SUPER JACKPOT',fmt(v)],3,{flash:true});m.sfx('super');b.jackC=b.jackR=true;}
     else if(p.lockLit&&m.mode!=='jordan'){p.locks++;p.lockLit=false;m.score(100000);
      if(p.locks>=3){p.locks=0;m.startJordan();}
      else{m.say([`BALL ${p.locks} LOCKED`,p.locks===2?'ONE MORE FOR JORDAN':'LOCK 2 MORE'],2);m.sfx('lock');e.ball.hold.t=2;}}
     else m.score(15000);
     m.later(e.ball.hold.t+.6,()=>{if(!m.p.lockLit&&m.mode!=='jordan')m.resetBank('egg');});
    }
    if(e.id==='haunted'){m.score(25000);
     if(p.extraLit){p.extraLit=false;p.extraGiven=true;m.extraBall();}
     else{const awards=[['250,000',()=>m.score(250000)],['LIGHT LOCK',()=>{p.lockLit=true;for(const id of m.def.drops.egg)m.w.parts[id].down=true;}],['KICKBACK LIT',()=>{p.kickback=m.w.parts.kickback.lit=true;}],['BONUS X UP',()=>{p.bonusX=Math.min(6,p.bonusX+1);}],['100,000',()=>m.score(100000)],['BALL SAVE',()=>m.ballSave(15)]];
      const a=awards[(p.mystery++*5+m.p.coasters+m.p.robots)%awards.length];a[1]();m.say(['HAUNTED RIDE',a[0]],2);m.sfx('award');e.ball.hold.t=1.8;}}
    break;
  }},
 // Golden Egg captive ball: every hit on its target grows the jackpot; every third lights the lock.
 goldenEgg(m){const p=m.p;p.eggHits++;p.jackpot=Math.min(2000000,p.jackpot+25000);m.score(25000);m.sfx('award');
  if(p.eggHits%3===0){if(!p.lockLit&&m.mode!=='jordan'){p.lockLit=true;for(const id of m.def.drops.egg)m.w.parts[id].down=true;m.say(['GOLDEN EGG','LOCK IS LIT'],2,{flash:true});}else{m.score(250000);m.say(['GOLDEN EGG','250,000'],1.8,{flash:true});}}
  else m.say(['GOLDEN EGG',`JACKPOT ${fmt(p.jackpot)}`],1.4);},
 // Giant Robot: hits build toward the battle; in the battle the robot walks and its tractor beam grabs the ball.
 robotHit(m){const p=m.p,bt=m.ball.battle;
  if(bt){bt.hits++;m.score(75000*(p.robotsBeaten+1));m.sfx('jackpot');
   if(bt.hits>=4){const v=500000*(p.robotsBeaten+1);p.robotsBeaten++;m.ball.battle=null;m.w.parts.beam.on=m.w.parts.beam.grab=false;m.w.parts.giantRobot.tx=0;m.score(v);m.say(['GIANT ROBOT','DEFEATED!',fmt(v)],3,{flash:true});m.sfx('super');if(!p.kickback){p.kickback=m.w.parts.kickback.lit=true;}}
   else m.say(['ROBOT HIT',`${4-bt.hits} MORE TO WIN`],1.3);return;}
  p.robotHits++;m.score(15000);
  if(p.robotHits>=p.robotNeed&&m.mode!=='jordan'){p.robotHits=0;p.robotNeed+=2;m.ball.battle={t:30,hits:0,grabCool:3};m.say(['GIANT ROBOT','BATTLE!','HIT IT 4 TIMES'],2.6,{flash:true});m.sfx('multiball');m.ballSave(8);}
  else m.say(['GIANT ROBOT',`${p.robotNeed-p.robotHits} MORE FOR BATTLE`],1.2);},
 // Per-frame: the battle clock, the robot's walk and the beam.
 tick(m,dt){const bt=m.ball.battle,robot=m.w.parts.giantRobot,beam=m.w.parts.beam;
  robot.armed=!!bt;if(!bt){robot.tx=0;beam.on=beam.grab=false;return;}
  bt.t-=dt;robot.tx=12*Math.sin(m.t*1.7);bt.grabCool-=dt;
  const holding=m.w.balls.some(b=>b.hold?.hole.id==='beam');if(holding)bt.grabCool=6;
  beam.on=beam.grab=bt.grabCool<=0;
  if(bt.t<=0){m.ball.battle=null;beam.on=beam.grab=false;m.say(['THE ROBOT','ESCAPES'],1.8);}},
 dmdMode(m){const bt=m.ball.battle;if(bt)return `ROBOT ${4-bt.hits} TO GO · ${Math.ceil(bt.t)}`;if(m.mode==='jordan')return 'JORDAN MULTIBALL';return '';},
 // Multiball: both ramps light a jackpot; after both, the super jackpot lights at the Coop.
 startJordan(m){m.mode='jordan';for(const id of m.def.drops.egg)m.w.parts[id].down=true;m.ball.jackC=m.ball.jackR=true;m.ball.superLit=false;m.say(['JORDAN','MULTIBALL'],3,{flash:true});m.sfx('multiball');m.addBalls(2);m.ballSave(12);},
 jackpot(m,which){const v=m.p.jackpot;m.score(v);m.say([`${which} JACKPOT`,fmt(v)],2.2,{flash:true});m.sfx('jackpot');if(!m.ball.jackC&&!m.ball.jackR){m.ball.superLit=true;m.say(['SUPER JACKPOT','IS LIT AT THE COOP'],2.4);}},
 multiballEnd(m){if(m.mode==='jordan'){m.mode=null;m.ball.superLit=false;m.say(['JORDAN OVER'],1.6);if(!m.p.lockLit&&!m.w.balls.some(b=>b.hold?.hole.id==='coop'))m.resetBank('egg');}},
 lamps(m,t){const p=m.p,b=m.ball,L={},blink=(f=4)=>Math.floor(t*f)%2?1:0;
  const skill=m.phase==='plunge'||b.skillOpen&&m.inPlay<4;
  ['laneB','laneO','laneT'].forEach((id,i)=>L[id]=skill&&i===b.skillLane?blink(6):p.bot[i]);
  ['bB','bU','bC','bK','bE','bT'].forEach((id,i)=>L[id]=p.bucket[i]);
  for(let i=0;i<3;i++)L['lock'+i]=i<p.locks?1:i===p.locks&&p.lockLit?blink(3):0;
  for(const n of [2,3,4,5,6])L['bx'+n]=p.bonusX>=n?1:0;
  L.kickback=m.w.parts.kickback.lit?1:0;L.outR=0;L.inL=L.inR=0;
  L.coasterArrow=m.mode==='jordan'?(b.jackC?blink(5):0):blink(1.5);L.robotArrow=m.mode==='jordan'?(b.jackR?blink(5):0):blink(1.5)*(t%3<1.5?1:0);
  L.coasterJ=m.mode==='jordan'&&b.jackC?1:0;L.robotJ=m.mode==='jordan'&&b.jackR?1:0;L.coopJ=b.superLit?blink(6):p.lockLit?blink(2):0;
  L.hauntedEB=p.extraLit?blink(3):0;L.hauntedMy=p.extraLit?0:blink(.8);
  const bt=b.battle;for(let i=0;i<5;i++)L['rh'+i]=bt?(i<bt.hits?1:i===bt.hits?blink(6):0):(i<Math.floor(p.robotHits*5/p.robotNeed)?1:0);
  for(let i=0;i<3;i++)L['egg'+i]=i<p.eggHits%3?1:0;
  L.shootAgain=m.shootAgainLamp?blink(2):0;L.jordan=m.mode==='jordan'?blink(8):p.locks?1:0;L.spinner=m.mb>1?1:0;
  return L;},
 // End-of-ball bonus count (lines shown on the DMD).
 bonusLines(m){const p=m.p,units=m.ball.bonus;return [['BONUS',units*2500],['BONUS X',p.bonusX]];},
 bonusTotal(m){return m.ball.bonus*2500*m.p.bonusX;},
 attract:['BUCKETHEADLAND','WELCOME TO THE PARK','JORDAN MULTIBALL','SPELL B-U-C-K-E-T'],
};
const {art}=require("src/engines/pinball/tables/bucketheadArt.js");
Object.assign(exports,{buildTable,rules,art,id:'buckethead',title:'Bucketheadland'});
