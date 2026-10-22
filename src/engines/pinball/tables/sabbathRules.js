// Black Sabbath rules. Shots: PARANOID ramp (left, reaches the diverter at the top), ELECTRIC FUNERAL ramp (right),
// the GRAVEYARD (lock / hurry-up collect), IRON MAN (toy), INTO THE VOID (disc), HEAVEN AND HELL (saucer), M-A-S-T-E-R
// standups, WAR PIGS pops, SUPERNAUT spinner, I-R-O-N lanes.
// Ladder: I-R-O-N lights Iron Man (2 hits a time); 4 lit hits → IRON MAN mode (he steps toward you, 5 hits beat him).
// D-O-O-M opens the Graveyard and swings the PARANOID diverter into it; 3 locks → WAR PIGS multiball (pops feed the
// jackpot, both ramps jackpot, super jackpot at the Graveyard). Ramps light ALBUMS at the Heaven and Hell saucer: six
// timed album modes, each its own rule; play all six → HEAVEN AND HELL (4-ball wizard). M-A-S-T-E-R raises the HAND OF
// DOOM post between the flippers (one save) and every second set lights an extra ball. A full plunge rides the arch
// onto the upper flipper: hit Iron Man within 4 s for the SUPER SKILL SHOT.
const fmt=n=>Math.round(n).toLocaleString('en-US');
const MASTER=['sM','sA','sS','sT','sE','sR'],LANES=['laneI','laneR','laneO','laneN'];
const HEAVEN=['para','funeral'],HELL=['grave','iron','void'];
const SHOT_LAMP={para:'paraArrow',funeral:'funeralArrow',grave:'graveJ',iron:'im2',void:'warPigs'};
const SHOT_NAME={para:'PARANOID',funeral:'ELECTRIC FUNERAL',grave:'GRAVEYARD',iron:'IRON MAN',void:'INTO THE VOID'};
function shotOf(e){
 if(e.type==='junction'&&e.id==='paranoid')return 'para';
 if(e.type==='rail'&&e.id==='funeral')return 'funeral';
 if(e.type==='hole')return e.id==='grave'?'grave':e.id==='heaven'?'heaven':null;
 if(e.type==='toy')return 'iron';if(e.type==='disc')return 'void';
 if(e.type==='standup')return MASTER.includes(e.id)?'target':null;
 if(e.type==='spin')return 'spin';if(e.type==='bumper')return 'pop';if(e.type==='sling'||e.type==='rollover')return 'switch';
 return null;
}
function pick(m,not){const L=['para','funeral','grave','iron','void'].filter(s=>s!==not);return L[Math.floor(m.w.random()*L.length)];}
// Six album modes. hit() returns points for a shot (0 = not part of this mode).
const ALBUMS=[
 {id:'paranoid',name:'PARANOID',short:'PARANOID',hint:'THE LIT SHOT KEEPS MOVING',time:30,goal:4,anim:'paranoid',
  start(a,m){a.lit=[pick(m)];a.move=4;},tick(a,m,dt){a.move-=dt;if(a.move<=0){a.move=4;a.lit=[pick(m,a.lit[0])];}},
  hit(m,a,s){if(!a.lit.includes(s))return 0;a.count++;a.lit=[pick(m,s)];a.move=4;return 350000+50000*a.count;}},
 {id:'master',name:'MASTER OF REALITY',short:'MASTER',hint:'SPELL M-A-S-T-E-R IN ORDER',time:35,goal:6,anim:'bats',
  start(a){a.next=0;a.lit=[];},hit(m,a,s,e){if(s!=='target')return 0;if(MASTER.indexOf(e.id)!==a.next)return 10000;a.next++;a.count++;return 200000;}},
 {id:'supernaut',name:'SUPERNAUT',short:'SUPERNAUT',hint:'SPIN THE SPINNER',time:30,goal:60,anim:'void',
  start(a){a.lit=['funeral'];},hit(m,a,s){if(s==='spin'){a.count++;return 20000;}if(s==='funeral'){a.count+=10;return 150000;}return 0;}},
 {id:'bloody',name:'SABBATH BLOODY SABBATH',short:'BLOODY',hint:'SHOOT THE GRAVEYARD BEFORE IT BLEEDS DRY',time:30,goal:1,anim:'grave',
  start(a,m){a.lit=['grave'];a.value=3000000;for(const id of m.def.drops.doom)m.w.parts[id].down=true;},tick(a,m,dt){a.value=Math.max(500000,a.value-90000*dt);},
  hit(m,a,s){if(s!=='grave')return 0;a.count++;return a.value;}},
 {id:'void',name:'INTO THE VOID',short:'THE VOID',hint:'CROSS THE DISC, SHOOT THE RAMPS',time:30,goal:8,anim:'void',
  start(a){a.lit=['para','funeral','void'];},hit(m,a,s){if(s==='void'){a.count++;return 150000;}if(s==='para'||s==='funeral'){a.count+=2;return 300000;}return 0;}},
 {id:'neversaydie',name:'NEVER SAY DIE',short:'NEVER SAY DIE',hint:'BALL SAVE IS ON: HIT EVERYTHING',time:25,goal:30,anim:'hand',
  start(a,m){a.lit=[];m.ballSave(25);},hit(m,a,s){if(['pop','switch','target','void','spin'].includes(s)){a.count++;return 25000;}if(s==='para'||s==='funeral'||s==='grave'||s==='iron'){a.count+=3;return 100000;}return 0;}},
];
const rules={
 balls:3,
 replay:{easy:1500000,normal:3000000,hard:6000000},
 ATTRACTIONS:ALBUMS,
 howTo:'Spell I-R-O-N to wake Iron Man, drop D-O-O-M to open the Graveyard, ramps light albums at Heaven and Hell.',
 newPlayer:()=>({iron:[0,0,0,0],bonusX:1,master:[0,0,0,0,0,0],masterDone:0,locks:0,lockLit:false,kickback:true,extraLit:false,extraGiven:false,
  ironLit:0,ironHits:0,ironNeed:4,ironsBeaten:0,jackpot:750000,skill:1,mystery:0,ramps:0,rampsToAlbum:3,
  albumLit:true,albums:[0,0,0,0,0,0],albumNext:0,wizardLit:false,wizards:0,hod:false}),
 startBall(m){const p=m.p;p.iron=[0,0,0,0];Object.assign(m.ball,{skillLane:1,skillOpen:true,superT:0,attr:null,ironMode:null,combo:0});m.ballSave(10);
  m.w.parts.sabbathSave.lit=p.kickback;m.w.parts.handOfDoom.on=p.hod;m.w.parts.ironMan.ty=0;m.w.parts.void.spin=3;m.w.parts.paraDiv.on=p.lockLit;
  if(p.lockLit)for(const id of m.def.drops.doom)m.w.parts[id].down=true;
  m.say(['SKILL SHOT','SOFT: LIT LANE · FULL: IRON MAN'],2.4,{anim:'skill'});},
 flip(m,input){const p=m.p;if(m.ball.skillOpen&&m.phase==='plunge'){m.ball.skillLane=(m.ball.skillLane+(input?1:3))%4;return;}
  p.iron=input?[p.iron[3],p.iron[0],p.iron[1],p.iron[2]]:[p.iron[1],p.iron[2],p.iron[3],p.iron[0]];},
 event(m,e){const p=m.p,b=m.ball,shot=shotOf(e);
  if(shot&&b.attr)rules.albumShot(m,shot,e);
  if(shot&&m.mode==='wizard')rules.wizardShot(m,shot);
  if(shot&&m.mode==='pigs')rules.pigsShot(m,shot);
  switch(e.type){
   case 'plunge':if(e.power>.92&&m.inPlay<.2)b.superT=4.5;break;
   case 'bumper':m.score(5130);m.bonus(1);if(m.mode==='pigs'){p.jackpot=Math.min(3000000,p.jackpot+25000);}break;
   case 'sling':m.score(110);break;
   case 'spin':m.score(2000);{const d=m.w.parts.void;d.spin=Math.min(9,d.spin+.12);}break;
   case 'disc':m.score(5000);if(!b.attr&&m.mode!=='wizard'&&Math.random()<.25)m.say(['INTO THE VOID'],.9,{anim:'void'});break;
   case 'rollover':{
    const lane=LANES.indexOf(e.id);
    if(lane>=0){m.score(10000);m.bonus(2);
     if(b.skillOpen&&m.inPlay<4){b.skillOpen=false;if(lane===b.skillLane){const v=250000*p.skill;p.skill++;m.score(v);m.say(['SKILL SHOT',fmt(v)],2.2,{flash:true,anim:'jackpot'});m.sfx('skill');}}
     p.iron[lane]=1;if(p.iron.every(Boolean)){p.iron=[0,0,0,0];m.score(50000);if(p.bonusX<6)p.bonusX++;p.ironLit=Math.min(4,p.ironLit+2);m.say(['I-R-O-N','IRON MAN IS LIT'],1.8,{anim:'iron'});m.sfx('award');}}
    else if(e.id==='inL'||e.id==='inR'){m.score(5000);m.bonus(1);}
    else if(e.id==='outL')m.score(5000);
    break;}
   case 'kickback':m.score(5000);p.kickback=false;m.say(['SABBATH SAVE!'],1.2,{anim:'hand'});m.sfx('kick');break;
   case 'outlane':m.score(5000);break;
   case 'post':m.score(50000);m.say(['HAND OF DOOM','SAVES YOU'],1.6,{flash:true,anim:'hand'});m.sfx('kick');p.hod=false;m.later(1.2,()=>{if(!m.p.hod)m.w.parts.handOfDoom.on=false;});break;
   case 'drop':m.score(3000);m.bonus(1);
    if(m.def.drops.doom.every(id=>m.w.parts[id].down)&&!p.lockLit&&!m.mode){p.lockLit=true;m.w.parts.paraDiv.on=true;m.score(25000);m.say(['D-O-O-M','THE GRAVEYARD IS OPEN'],2,{anim:'grave'});m.sfx('award');}
    break;
   case 'toy':rules.ironHit(m);break;
   case 'standup':{const i=MASTER.indexOf(e.id);m.score(10000);if(i<0||b.attr?.def.id==='master')break;if(!p.master[i]){p.master[i]=1;
     if(p.master.every(Boolean)){p.master.fill(0);p.masterDone++;m.score(150000);p.hod=true;m.w.parts.handOfDoom.on=true;
      if(p.masterDone%2===0&&!p.extraGiven&&!p.extraLit){p.extraLit=true;m.say(['MASTER OF REALITY','EXTRA BALL IS LIT'],2.2,{flash:true,anim:'bats'});}
      else m.say(['M-A-S-T-E-R','HAND OF DOOM IS UP'],2,{anim:'hand'});m.sfx('award');}
     else m.say(['MASTER',p.master.map((v,j)=>v?'MASTER'[j]:'-').join(' ')],1.1,{anim:'bats'});}
    break;}
   case 'railEnter':m.sfx('ramp');break;
   case 'junction':if(e.id==='paranoid')rules.ramp(m,'PARANOID','paranoid');break;
   case 'rail':if(e.id==='funeral')rules.ramp(m,'ELECTRIC FUNERAL','funeral');break;
   case 'hole':
    if(e.id==='grave'){
     if(m.mode==='pigs'&&b.superLit){b.superLit=false;const v=p.jackpot*3;m.score(v);m.say(['SUPER JACKPOT',fmt(v)],3,{flash:true,anim:'jackpot'});m.sfx('super');b.jackP=b.jackF=true;}
     else if(b.attr?.def.id==='bloody'){}   // the hurry-up collects in albumShot
     else if(p.lockLit&&!m.mode){p.locks++;p.lockLit=false;m.w.parts.paraDiv.on=false;m.score(100000);
      if(p.locks>=3){p.locks=0;rules.startPigs(m);}else{m.say([`GRAVE ${p.locks} FILLED`,p.locks===2?'ONE MORE FOR WAR PIGS':'BURY 2 MORE'],2,{anim:'lock'});m.sfx('lock');e.ball.hold.t=2;}}
     else m.score(15000);
     m.later(e.ball.hold.t+.6,()=>{if(!m.p.lockLit&&!m.mode&&m.ball.attr?.def.id!=='bloody')m.resetBank('doom');});
    }
    if(e.id==='heaven'){m.score(25000);
     if(p.extraLit){p.extraLit=false;p.extraGiven=true;m.extraBall();}
     else if(p.wizardLit&&!m.mode&&!b.attr){p.wizardLit=false;rules.startWizard(m);e.ball.hold.t=3;}
     else if(p.albumLit&&!b.attr&&!m.mode){p.albumLit=false;rules.startAlbum(m);e.ball.hold.t=3;}
     else{const awards=[['500,000',()=>m.score(500000)],['HAND OF DOOM',()=>{p.hod=true;m.w.parts.handOfDoom.on=true;}],['SABBATH SAVE LIT',()=>{p.kickback=m.w.parts.sabbathSave.lit=true;}],['IRON MAN LIT',()=>{p.ironLit=Math.min(4,p.ironLit+2);}],['BONUS X UP',()=>{p.bonusX=Math.min(6,p.bonusX+1);}],['BALL SAVE',()=>m.ballSave(15)]];
      const a=awards[(p.mystery++*5+p.ramps)%awards.length];a[1]();m.say(['HEAVEN AND HELL',a[0]],2,{anim:'cross'});m.sfx('award');e.ball.hold.t=1.8;}}
    break;
  }},
 // Ramps: points, combos, and every third lights the next album.
 ramp(m,name,anim){const p=m.p,b=m.ball;p.ramps++;b.combo=m.t-(b.lastRampT??-9)<4?b.combo+1:0;b.lastRampT=m.t;const v=50000*(1+b.combo);m.score(v);m.bonus(3);
  if(!p.albumLit&&!b.attr&&!p.wizardLit&&m.mode!=='wizard'&&--p.rampsToAlbum<=0){p.rampsToAlbum=3;p.albumLit=true;m.later(1.4,()=>m.say(['ALBUM IS LIT','AT HEAVEN AND HELL'],1.8,{anim:'cross'}));}
  if(!b.attr&&!m.mode)m.say([name,b.combo?`COMBO x${b.combo+1} ${fmt(v)}`:fmt(v)],1.3,{anim});},
 // ---- albums
 startAlbum(m){const p=m.p;let i=p.albumNext;for(let k=0;k<6&&p.albums[i];k++)i=(i+1)%6;const def=ALBUMS[i],a={i,def,t:def.time,count:0,total:0,lit:[]};def.start(a,m);m.ball.attr=a;p.albumNext=(i+1)%6;
  m.say([def.name,def.hint],3,{flash:true,anim:def.anim,mode:true});m.sfx('multiball');m.ballSave(6);},
 albumShot(m,shot,e){const a=m.ball.attr,v=a.def.hit(m,a,shot,e);if(!v)return;m.score(v);a.total+=v;
  if(a.count>=a.def.goal)rules.endAlbum(m,true);else m.say([a.def.short,fmt(v)],1.1,{anim:a.def.anim});},
 endAlbum(m,done){const p=m.p,a=m.ball.attr;if(!a)return;m.ball.attr=null;p.albums[a.i]=done?2:1;
  if(a.def.id==='bloody'&&!p.lockLit)m.resetBank('doom');
  if(done){const v=500000*(1+p.albums.filter(x=>x===2).length);m.score(v);a.total+=v;m.say([`${a.def.short} COMPLETE`,fmt(a.total)],3,{flash:true,anim:'jackpot'});m.sfx('super');}
  else m.say([`${a.def.short} TOTAL`,fmt(a.total)],2.4,{anim:a.def.anim});
  if(p.albums.every(Boolean)){p.wizardLit=true;m.later(3,()=>m.say(['EVERY ALBUM PLAYED','HEAVEN AND HELL IS LIT'],3,{flash:true,anim:'cross'}));}},
 // ---- Iron Man: lit hits build to his mode; in it he steps toward you and five hits beat him back.
 ironHit(m){const p=m.p,b=m.ball,im=b.ironMode;
  if(b.superT>0){b.superT=0;const v=1000000*p.skill;m.score(v);m.say(['SUPER SKILL SHOT',fmt(v)],2.6,{flash:true,anim:'iron'});m.sfx('super');}
  if(m.t-(p.ironLastT??-9)<(im?.8:1)){m.score(1000);return;}p.ironLastT=m.t;
  if(im){im.hits++;const v=200000*Math.min(3,p.ironsBeaten+1);m.score(v);m.sfx('jackpot');im.step=Math.max(0,im.step-10);
   if(im.hits>=5){const big=1500000*Math.min(3,p.ironsBeaten+1);p.ironsBeaten++;b.ironMode=null;m.w.parts.ironMan.ty=0;m.score(big);m.say(['IRON MAN','IS BEATEN',fmt(big)],3,{flash:true,anim:'ironDown'});m.sfx('super');}
   else m.say(['IRON MAN HIT',`${5-im.hits} MORE`],1.2,{anim:'iron'});return;}
  if(!p.ironLit){m.score(5000);return;}
  p.ironLit--;p.ironHits++;m.score(25000);
  if(p.ironHits>=p.ironNeed&&m.mode!=='wizard'){p.ironHits=0;p.ironNeed+=2;b.ironMode={t:40,hits:0,step:0,next:5};m.say(['IRON MAN','HAS AWOKEN','HIT HIM 5 TIMES'],2.8,{flash:true,anim:'iron',mode:true});m.sfx('multiball');m.ballSave(8);}
  else if(!b.attr&&m.mode!=='wizard')m.say(['IRON MAN',`${p.ironNeed-p.ironHits} MORE TO WAKE HIM`],1.2,{anim:'iron'});},
 // ---- WAR PIGS multiball: pops grow the jackpot; both ramps jackpot; then the super at the Graveyard.
 startPigs(m){m.mode='pigs';for(const id of m.def.drops.doom)m.w.parts[id].down=true;m.ball.jackP=m.ball.jackF=true;m.ball.superLit=false;m.say(['WAR PIGS','MULTIBALL'],3,{flash:true,anim:'pigs',mode:true});m.sfx('siren');m.addBalls(2);m.ballSave(12);},
 pigsShot(m,shot){const b=m.ball;if(shot==='para'&&b.jackP){b.jackP=false;rules.jackpot(m,'PARANOID');}else if(shot==='funeral'&&b.jackF){b.jackF=false;rules.jackpot(m,'FUNERAL');}},
 jackpot(m,which){const v=m.p.jackpot;m.score(v);m.say([`${which} JACKPOT`,fmt(v)],2.2,{flash:true,anim:'jackpot'});m.sfx('jackpot');if(!m.ball.jackP&&!m.ball.jackF){m.ball.superLit=true;m.say(['SUPER JACKPOT','AT THE GRAVEYARD'],2.4,{anim:'grave'});}},
 // ---- wizard: HEAVEN AND HELL
 startWizard(m){m.mode='wizard';m.ball.wiz={round:1,lit:[...HEAVEN,...HELL],total:0};m.say(['HEAVEN','AND HELL'],4,{flash:true,anim:'wizard',mode:true});m.sfx('super');m.addBalls(3);m.ballSave(20);},
 wizardShot(m,shot){const wz=m.ball.wiz;if(!wz||!wz.lit.includes(shot))return;wz.lit=wz.lit.filter(s=>s!==shot);const v=1500000*wz.round;m.score(v);wz.total+=v;
  if(!wz.lit.length){const sv=7500000*wz.round;m.score(sv);wz.total+=sv;wz.round++;wz.lit=[...HEAVEN,...HELL];m.say(['HEAVEN AND HELL',`SUPER ${fmt(sv)}`],3,{flash:true,anim:'jackpot'});m.sfx('super');}
  else{m.say([SHOT_NAME[shot],fmt(v)],1.4,{anim:'wizard'});m.sfx('jackpot');}},
 multiballEnd(m){const p=m.p;
  if(m.mode==='pigs'){m.mode=null;m.ball.superLit=false;m.say(['THE WAR IS OVER'],1.6,{anim:'pigs'});}
  else if(m.mode==='wizard'){m.mode=null;const tot=m.ball.wiz?.total||0;m.ball.wiz=null;p.wizards++;p.albums=[0,0,0,0,0,0];p.albumLit=true;m.say(['HEAVEN AND HELL TOTAL',fmt(tot)],3,{anim:'wizard'});}
  if(!p.lockLit&&!m.w.balls.some(b=>b.hold?.hole.id==='grave'))m.resetBank('doom');},
 // ---- per frame: album clocks + hurry-up, Iron Man's advance, the disc winding down
 tick(m,dt){const b=m.ball,a=b.attr,im=b.ironMode,disc=m.w.parts.void;
  if(b.superT>0)b.superT-=dt;
  if(a){a.t-=dt;a.def.tick?.(a,m,dt);if(a.t<=0)rules.endAlbum(m,false);}
  const fast=a?.def.id==='void'||a?.def.id==='supernaut'||m.mode==='wizard';disc.spin+=((fast?9:3)-disc.spin)*Math.min(1,dt*(fast?2:.15));
  if(im){im.t-=dt;im.next-=dt;if(im.next<=0){im.next=5;im.step=Math.min(25,im.step+5);}m.w.parts.ironMan.ty=im.step;
   if(im.t<=0){b.ironMode=null;m.w.parts.ironMan.ty=0;m.say(['IRON MAN','RETURNS TO HIS SLEEP'],1.8,{anim:'iron'});}}
  m.w.parts.ironMan.armed=!!im;},
 dmdMode(m){const b=m.ball,L=[];
  if(m.mode==='wizard'&&b.wiz)L.push(`HEAVEN AND HELL · ${b.wiz.lit.length} LIT`);
  if(b.attr)L.push(b.attr.def.id==='bloody'?`COLLECT ${fmt(b.attr.value)} · ${Math.ceil(b.attr.t)}`:`${b.attr.def.short} ${Math.min(b.attr.count,b.attr.def.goal)}/${b.attr.def.goal} · ${Math.ceil(b.attr.t)}`);
  if(b.ironMode)L.push(`IRON MAN ${5-b.ironMode.hits} TO GO · ${Math.ceil(b.ironMode.t)}`);
  if(m.mode==='pigs')L.push(b.superLit?'SUPER AT THE GRAVEYARD':'WAR PIGS MULTIBALL');
  return L.length?L[Math.floor(m.t/2)%L.length]:'';},
 music(m){if(m.mode==='wizard')return 'wizard';if(m.mode==='pigs')return 'warpigs';if(m.ball.ironMode)return 'ironman';if(m.ball.attr)return m.ball.attr.def.id;return 'main';},
 lamps(m,t){const p=m.p,b=m.ball,L={},blink=(f=4)=>Math.floor(t*f)%2?1:0;
  const skill=m.phase==='plunge'||b.skillOpen&&m.inPlay<4;
  LANES.forEach((id,i)=>L[id]=skill&&i===b.skillLane?blink(6):p.iron[i]);
  const master=b.attr?.def.id==='master'?b.attr.next:-1;
  MASTER.forEach((id,i)=>L[id]=master>=0?(i<master?1:i===master?blink(6):0):p.master[i]);
  for(let i=0;i<3;i++)L['lock'+i]=i<p.locks?1:i===p.locks&&p.lockLit?blink(3):0;
  for(const n of [2,3,4,5,6])L['bx'+n]=p.bonusX>=n?1:0;
  L.sabbathSave=m.w.parts.sabbathSave.lit?1:0;L.outL=0;L.inL=L.inR=0;L.hod=p.hod?blink(2):0;
  const lit=new Set([...(b.attr?.lit||[]),...(m.mode==='wizard'?b.wiz?.lit||[]:[])]);
  L.paraArrow=lit.has('para')?blink(7):m.mode==='pigs'?(b.jackP?blink(5):0):p.lockLit?blink(3):blink(1.2);
  L.funeralArrow=lit.has('funeral')?blink(7):m.mode==='pigs'?(b.jackF?blink(5):0):blink(1.2)*(t%3<1.5?1:0);
  L.paraJ=m.mode==='pigs'&&b.jackP?1:0;L.funeralJ=m.mode==='pigs'&&b.jackF?1:0;L.graveJ=lit.has('grave')||b.superLit?blink(6):p.lockLit?blink(2):0;
  L.hhEB=p.extraLit?blink(3):0;L.hhAlbum=p.wizardLit||(p.albumLit&&!b.attr&&!m.mode)?blink(4):blink(.6);
  const im=b.ironMode;for(let i=0;i<5;i++)L['im'+i]=lit.has('iron')?blink(7):im?(i<im.hits?1:i===im.hits?blink(6):0):(i<p.ironHits?1:p.ironLit&&i===p.ironHits?blink(4):0);
  for(let i=0;i<6;i++)L['al'+i]=b.attr?.i===i?blink(6):p.albums[i]===2?1:p.albums[i]===1?blink(1):0;
  L.shootAgain=m.shootAgainLamp?blink(2):0;L.warPigs=lit.has('void')?blink(7):m.mode==='wizard'?blink(10):m.mode==='pigs'?blink(8):p.locks?1:0;L.spinner=b.attr?.def.id==='supernaut'?blink(6):0;
  return L;},
 bonusLines(m){const p=m.p;return [['BONUS',m.ball.bonus*2500],['ALBUMS',p.albums.filter(x=>x===2).length*100000],['BONUS X',p.bonusX]];},
 bonusTotal(m){const p=m.p;return (m.ball.bonus*2500+p.albums.filter(x=>x===2).length*100000)*p.bonusX;},
 attract:['BLACK SABBATH','THE PARANOID MACHINE','WAR PIGS MULTIBALL','SPELL I-R-O-N'],
};
Object.assign(exports,{rules,ALBUMS,shotOf});
