// King Gizzard & the Lizard Wizard rules. Shots: FLIGHT b741 ramp (left; over the top, or down into the Nest), the
// RATTLESNAKE (swallows the ball and carries it up into the Nest), the NONAGON INFINITY loop (left / right orbits),
// THE RATS' NEST upper playfield (R-A-T-S targets + the PLANET B scoop, worked with the mini flippers), the GIZZVERSE
// saucer (album modes), G-I-L-A drops, K-G-L-W standups, MICROTONAL pops, GAMMA KNIFE spinner.
// Ladder: every loop lights one side of the NONAGON; all nine → NONAGON INFINITY (loops pay big and the ball save is
// on). G-I-L-A lights a lock at the snake; 3 swallowed balls → RATTLESNAKE MULTIBALL (flight + snake jackpots, then
// the super jackpot up in the Nest at PLANET B). R-A-T-S lights PLANET B (escalating escape award; every second one
// lights an extra ball). Ramps and snakes light ALBUMS at the GIZZVERSE: six timed album modes; play all six →
// OMNIUM GATHERUM (4-ball wizard). K-G-L-W: bonus X + kickback. Skill shot: the plunge rides the loop over the
// Nest; shoot the snake (or the ramp, super) before it's been 7 s.
const fmt=n=>Math.round(n).toLocaleString('en-US');
const RATS=['ratR','ratA','ratT','ratS'],KGLW=['kK','kG','kL','kW'];
const SHOTS=['flight','snake','loopL','loopR','planet'];
const SHOT_LAMP={flight:'flightArrow',snake:'snakeArrow',loopL:'loopL',loopR:'loopR',planet:'planetB'};
const SHOT_NAME={flight:'FLIGHT b741',snake:'RATTLESNAKE',loopL:'LEFT LOOP',loopR:'RIGHT LOOP',planet:'PLANET B'};
// A loop = up one orbit and down the other within 3 s (the plunge only ever comes down, so it never counts).
function orbitShot(m,e){const b=e.ball,side=e.id==='orbitL'?'L':'R';if(!b)return null;
 if(e.dir<0){b.orbitUp={side,t:m.t};return null;}
 const up=b.orbitUp;b.orbitUp=null;if(up&&up.side!==side&&m.t-up.t<3)return up.side==='L'?'loopL':'loopR';return null;}
function shotOf(m,e){
 if(e.type==='junction'&&e.id==='flight')return 'flight';
 if(e.type==='hole')return e.id==='snake'?'snake':e.id==='planetB'?'planet':e.id==='gizzverse'?'saucer':null;
 if(e.type==='trigger')return orbitShot(m,e);
 if(e.type==='standup')return RATS.includes(e.id)?'rat':KGLW.includes(e.id)?'kglw':null;
 if(e.type==='spin')return 'spin';if(e.type==='bumper')return 'pop';if(e.type==='drop')return 'drop';
 if(e.type==='sling'||e.type==='rollover')return 'switch';
 return null;
}
function pick(m,not){const L=['flight','snake','loopL','loopR'].filter(s=>s!==not);return L[Math.floor(m.w.random()*L.length)];}
const isLoop=s=>s==='loopL'||s==='loopR';
// Six album modes. hit() returns points for a shot (0 = not part of this mode).
const ALBUMS=[
 {id:'nonagon',name:'NONAGON INFINITY',short:'NONAGON',hint:'LOOP THE LOOP, IT NEVER ENDS',time:35,goal:5,anim:'nonagon',
  start(a){a.lit=['loopL','loopR'];},hit(m,a,s){if(!isLoop(s))return 0;a.count++;return 300000+60000*a.count;}},
 {id:'banana',name:'FLYING MICROTONAL BANANA',short:'BANANA',hint:'SPIN THE GAMMA KNIFE',time:30,goal:40,anim:'banana',
  start(a){a.lit=['loopL'];},hit(m,a,s){if(s==='spin'){a.count++;return 15000;}if(s==='loopL'){a.count+=6;return 150000;}return 0;}},
 {id:'murder',name:'MURDER OF THE UNIVERSE',short:'MURDER',hint:'THE ALTERED BEAST KEEPS MOVING',time:32,goal:4,anim:'beast',
  start(a,m){a.lit=[pick(m)];a.move=4;},tick(a,m,dt){a.move-=dt;if(a.move<=0){a.move=4;a.lit=[pick(m,a.lit[0])];}},
  hit(m,a,s){if(!a.lit.includes(s))return 0;a.count++;a.lit=[pick(m,s)];a.move=4;return 350000+50000*a.count;}},
 {id:'rats',name:'INFEST THE RATS\' NEST',short:'RATS\' NEST',hint:'THE NEST TARGETS PAY BIG',time:40,goal:6,anim:'rat',nest:true,
  start(a){a.lit=['planet','snake','flight'];},hit(m,a,s){if(s==='rat'){a.count++;return 150000;}if(s==='planet'){a.count+=2;return 400000;}return 0;}},
 {id:'dragon',name:'PETRODRAGONIC APOCALYPSE',short:'DRAGON',hint:'FEED THE SNAKE BEFORE THE FIRE DIES',time:30,goal:1,anim:'dragon',
  start(a){a.lit=['snake'];a.value=3000000;},tick(a,m,dt){a.value=Math.max(500000,a.value-90000*dt);},
  hit(m,a,s){if(s!=='snake')return 0;a.count++;return a.value;}},
 {id:'fishies',name:'FISHING FOR FISHIES',short:'FISHIES',hint:'BALL SAVE IS ON: EVERY SWITCH BITES',time:25,goal:30,anim:'fish',
  start(a,m){a.lit=[];m.ballSave(25);},hit(m,a,s){if(['pop','switch','drop','spin','rat','kglw'].includes(s)){a.count++;return 25000;}if(SHOTS.includes(s)){a.count+=3;return 100000;}return 0;}},
];
const rules={
 balls:3,
 replay:{easy:1500000,normal:3000000,hard:6000000},
 ATTRACTIONS:ALBUMS,
 howTo:'Loop the orbits to build the NONAGON, drop G-I-L-A and feed the RATTLESNAKE for multiball, work the mini flippers in the RATS\' NEST.',
 newPlayer:()=>({kglw:[0,0,0,0],rats:[0,0,0,0],ratsDone:0,planetLit:false,planetValue:500000,nona:0,infinities:0,locks:0,lockLit:false,kickback:true,
  bonusX:1,extraLit:false,extraGiven:false,ramps:0,rampsToAlbum:3,albumLit:true,albums:[0,0,0,0,0,0],albumNext:0,wizardLit:false,wizards:0,skill:1,mystery:0,jackpot:750000}),
 startBall(m){const p=m.p;Object.assign(m.ball,{skillT:0,attr:null,infinity:null,combo:0,loopCombo:0});m.ballSave(10);
  m.w.parts.kickback.lit=p.kickback;if(p.lockLit)for(const id of m.def.drops.gila)m.w.parts[id].down=true;
  m.say(['SKILL SHOT','FEED THE SNAKE'],2.4,{anim:'skill'});},
 event(m,e){const p=m.p,b=m.ball,shot=shotOf(m,e);
  if(shot&&b.attr)rules.albumShot(m,shot,e);
  if(shot&&m.mode==='omnium')rules.wizardShot(m,shot);
  if(shot&&m.mode==='rattle')rules.rattleShot(m,shot);
  if(shot&&b.infinity&&isLoop(shot))rules.infinityLoop(m);
  switch(e.type){
   case 'plunge':if(m.inPlay<.2)b.skillT=7;break;
   case 'bumper':m.score(3130);m.bonus(1);if(m.mode==='rattle')p.jackpot=Math.min(3000000,p.jackpot+25000);break;
   case 'sling':m.score(110);break;
   case 'spin':m.score(1500);break;
   case 'rollover':if(e.id==='inL'||e.id==='inR'){m.score(5000);m.bonus(1);}else m.score(5000);break;
   case 'kickback':m.score(5000);p.kickback=false;m.say(['KICKBACK!'],1.2,{anim:'save'});m.sfx('kick');break;
   case 'outlane':m.score(5000);break;
   case 'drop':m.score(3000);m.bonus(1);
    if(m.def.drops.gila.every(id=>m.w.parts[id].down)&&!p.lockLit&&m.mode!=='rattle'){p.lockLit=true;m.score(25000);m.say(['G-I-L-A MONSTER','SNAKE LOCK IS LIT'],2,{anim:'gila'});m.sfx('award');}
    break;
   case 'standup':
    if(RATS.includes(e.id)){const i=RATS.indexOf(e.id);m.score(10000);m.bonus(1);if(b.attr?.def.id==='rats')break;if(!p.rats[i]){p.rats[i]=1;
      if(p.rats.every(Boolean)){p.rats.fill(0);p.planetLit=true;m.score(50000);m.say(['R-A-T-S','PLANET B IS LIT'],2,{anim:'planet'});m.sfx('award');}
      else m.say(['RATS',p.rats.map((v,j)=>v?'RATS'[j]:'-').join(' ')],1.1,{anim:'rat'});}}
    else{const i=KGLW.indexOf(e.id);m.score(10000);if(!p.kglw[i]){p.kglw[i]=1;
      if(p.kglw.every(Boolean)){p.kglw.fill(0);if(p.bonusX<6)p.bonusX++;p.kickback=m.w.parts.kickback.lit=true;m.score(75000);m.say(['K-G-L-W',`BONUS ${p.bonusX}X · KICKBACK LIT`],2,{anim:'wizard'});m.sfx('award');}
      else m.say(['KGLW',p.kglw.map((v,j)=>v?'KGLW'[j]:'-').join(' ')],1,{anim:'wizard'});}}
    break;
   case 'trigger':if(shot)rules.loop(m,shot);else m.score(2000);break;
   case 'railEnter':m.sfx('ramp');break;
   case 'junction':if(e.id==='flight')rules.ramp(m,e.to==='flightNest');break;
   case 'rail':if(e.id==='snakeBody'){m.sfx('ramp');if(!b.attr&&!m.mode)m.say(['OUT THE OTHER END','INTO THE RATS\' NEST'],1.4,{anim:'nest'});}break;
   case 'hole':
    if(e.id==='snake'){m.score(25000);m.sfx('kick');
     if(b.skillT>0)rules.skill(m,'snake');
     p.ramps++;rules.lightAlbum(m);
     if(m.mode==='rattle'||m.mode==='omnium'||b.attr){}
     else if(p.lockLit){p.locks++;p.lockLit=false;m.score(100000);
      if(p.locks>=3){p.locks=0;rules.startRattle(m);}else m.say([`SNAKE LOCK ${p.locks}`,p.locks===2?'ONE MORE FOR MULTIBALL':'2 MORE FOR MULTIBALL'],2,{anim:'lock'});
      m.later(1.2,()=>{if(!m.p.lockLit&&m.mode!=='rattle')m.resetBank('gila');});}
     else m.say(['SWALLOWED BY','THE RATTLESNAKE'],1.3,{anim:'snake'});}
    if(e.id==='planetB'){
     if(m.mode==='rattle'&&b.superLit){b.superLit=false;const v=p.jackpot*3;m.score(v);m.say(['SUPER JACKPOT',fmt(v)],3,{flash:true,anim:'jackpot'});m.sfx('super');b.jackF=b.jackS=true;}
     else if(p.planetLit&&b.attr?.def.id!=='rats'){p.planetLit=false;p.ratsDone++;const v=p.planetValue;p.planetValue+=500000;m.score(v);
      if(p.ratsDone%2===0&&!p.extraGiven&&!p.extraLit){p.extraLit=true;m.say(['ESCAPE TO VENUS',fmt(v)+' · EXTRA BALL LIT'],2.4,{flash:true,anim:'planet'});}
      else m.say(['PLANET B',fmt(v)],2,{flash:true,anim:'planet'});m.sfx('jackpot');e.ball.hold.t=1.6;}
     else m.score(25000);}
    if(e.id==='gizzverse'){m.score(25000);
     if(p.extraLit){p.extraLit=false;p.extraGiven=true;m.extraBall();}
     else if(p.wizardLit&&!m.mode&&!b.attr){p.wizardLit=false;rules.startWizard(m);e.ball.hold.t=3;}
     else if(p.albumLit&&!b.attr&&!m.mode){p.albumLit=false;rules.startAlbum(m);e.ball.hold.t=3;}
     else{const awards=[['500,000',()=>m.score(500000)],['KICKBACK LIT',()=>{p.kickback=m.w.parts.kickback.lit=true;}],['SNAKE LOCK LIT',()=>{if(m.mode!=='rattle')p.lockLit=true;}],['PLANET B LIT',()=>{p.planetLit=true;}],['BONUS X UP',()=>{p.bonusX=Math.min(6,p.bonusX+1);}],['BALL SAVE',()=>m.ballSave(15)],['3 NONAGON SIDES',()=>{p.nona=Math.min(8,p.nona+3);}]];
      const a=awards[(p.mystery++*5+p.ramps)%awards.length];a[1]();m.say(['THE GIZZVERSE',a[0]],2,{anim:'wizard'});m.sfx('award');e.ball.hold.t=1.8;}}
    break;
  }},
 skill(m,which){const p=m.p,b=m.ball;b.skillT=0;const v=(which==='flight'?1000000:500000)*p.skill;p.skill++;m.score(v);
  m.say([which==='flight'?'SUPER SKILL SHOT':'SKILL SHOT',fmt(v)],2.4,{flash:true,anim:'jackpot'});m.sfx(which==='flight'?'super':'skill');},
 // FLIGHT b741: points, combos, album ladder.
 ramp(m,toNest){const p=m.p,b=m.ball;if(b.skillT>0)rules.skill(m,'flight');p.ramps++;b.combo=m.t-(b.lastRampT??-9)<4?b.combo+1:0;b.lastRampT=m.t;const v=50000*(1+b.combo);m.score(v);m.bonus(3);
  rules.lightAlbum(m);if(!b.attr&&!m.mode)m.say([toNest?'FLIGHT b741 · NEST':'FLIGHT b741',b.combo?`COMBO x${b.combo+1} ${fmt(v)}`:fmt(v)],1.3,{anim:'flight'});},
 lightAlbum(m){const p=m.p,b=m.ball;if(!p.albumLit&&!b.attr&&!p.wizardLit&&m.mode!=='omnium'&&--p.rampsToAlbum<=0){p.rampsToAlbum=3;p.albumLit=true;m.later(1.4,()=>m.say(['ALBUM IS LIT','AT THE GIZZVERSE'],1.8,{anim:'album'}));}},
 // The NONAGON: each loop lights one side; nine → NONAGON INFINITY.
 loop(m,shot){const p=m.p,b=m.ball;b.loopCombo=m.t-(b.lastLoopT??-9)<4?b.loopCombo+1:0;b.lastLoopT=m.t;const v=75000*(1+b.loopCombo);m.score(v);m.bonus(2);m.sfx('ramp');
  if(b.infinity||b.attr||m.mode)return;
  p.nona++;if(p.nona>=9){p.nona=0;rules.startInfinity(m);return;}
  m.say([b.loopCombo?`LOOP x${b.loopCombo+1}`:'NONAGON LOOP',`${9-p.nona} SIDES TO GO · ${fmt(v)}`],1.3,{anim:'loop'});},
 startInfinity(m){const p=m.p;p.infinities++;m.ball.infinity={t:30,loops:0,total:0};m.ballSave(10);m.say(['NONAGON','INFINITY','LOOPS NEVER END'],3,{flash:true,anim:'nonagon',mode:true});m.sfx('multiball');},
 infinityLoop(m){const inf=m.ball.infinity;inf.loops++;inf.t=Math.min(30,inf.t+3);const v=250000*inf.loops*(1+m.p.infinities*.5);m.score(v);inf.total+=v;m.say([`INFINITY x${inf.loops}`,fmt(v)],1.3,{anim:'nonagon'});m.sfx('jackpot');},
 // ---- albums
 startAlbum(m){const p=m.p;let i=p.albumNext;for(let k=0;k<6&&p.albums[i];k++)i=(i+1)%6;const def=ALBUMS[i],a={i,def,t:def.time,count:0,total:0,lit:[]};def.start(a,m);m.ball.attr=a;p.albumNext=(i+1)%6;
  m.say([def.name,def.hint],3,{flash:true,anim:def.anim,mode:true});m.sfx('multiball');m.ballSave(6);},
 albumShot(m,shot,e){const a=m.ball.attr,v=a.def.hit(m,a,shot,e);if(!v)return;m.score(v);a.total+=v;
  if(a.count>=a.def.goal)rules.endAlbum(m,true);else m.say([a.def.short,fmt(v)],1.1,{anim:a.def.anim});},
 endAlbum(m,done){const p=m.p,a=m.ball.attr;if(!a)return;m.ball.attr=null;p.albums[a.i]=done?2:1;
  if(done){const v=500000*(1+p.albums.filter(x=>x===2).length);m.score(v);a.total+=v;m.say([`${a.def.short} COMPLETE`,fmt(a.total)],3,{flash:true,anim:'jackpot'});m.sfx('super');}
  else m.say([`${a.def.short} TOTAL`,fmt(a.total)],2.4,{anim:a.def.anim});
  if(p.albums.every(Boolean)){p.wizardLit=true;m.later(3,()=>m.say(['EVERY ALBUM PLAYED','OMNIUM GATHERUM IS LIT'],3,{flash:true,anim:'wizard'}));}},
 // ---- RATTLESNAKE MULTIBALL: pops grow the jackpot; flight + snake jackpots; then the super up in the Nest.
 startRattle(m){m.mode='rattle';for(const id of m.def.drops.gila)m.w.parts[id].down=true;m.ball.jackF=m.ball.jackS=true;m.ball.superLit=false;
  m.say(['RATTLESNAKE','MULTIBALL'],3,{flash:true,anim:'rattle',mode:true});m.sfx('siren');m.addBalls(2);m.ballSave(12);},
 rattleShot(m,shot){const b=m.ball;if(shot==='flight'&&b.jackF){b.jackF=false;rules.jackpot(m,'FLIGHT');}else if(shot==='snake'&&b.jackS){b.jackS=false;rules.jackpot(m,'SNAKE');}},
 jackpot(m,which){const v=m.p.jackpot;m.score(v);m.say([`${which} JACKPOT`,fmt(v)],2.2,{flash:true,anim:'jackpot'});m.sfx('jackpot');
  if(!m.ball.jackF&&!m.ball.jackS){m.ball.superLit=true;m.say(['SUPER JACKPOT','AT PLANET B'],2.4,{anim:'planet'});}},
 // ---- wizard: OMNIUM GATHERUM, every big shot lit, then again.
 startWizard(m){m.mode='omnium';m.ball.wiz={round:1,lit:[...SHOTS],total:0};m.say(['OMNIUM','GATHERUM'],4,{flash:true,anim:'wizard',mode:true});m.sfx('super');m.addBalls(3);m.ballSave(20);},
 wizardShot(m,shot){const wz=m.ball.wiz;if(!wz||!wz.lit.includes(shot))return;wz.lit=wz.lit.filter(s=>s!==shot);const v=1500000*wz.round;m.score(v);wz.total+=v;
  if(!wz.lit.length){const sv=7500000*wz.round;m.score(sv);wz.total+=sv;wz.round++;wz.lit=[...SHOTS];m.say(['OMNIUM GATHERUM',`SUPER ${fmt(sv)}`],3,{flash:true,anim:'jackpot'});m.sfx('super');}
  else{m.say([SHOT_NAME[shot],fmt(v)],1.4,{anim:'wizard'});m.sfx('jackpot');}},
 multiballEnd(m){const p=m.p;
  if(m.mode==='rattle'){m.mode=null;m.ball.superLit=false;m.say(['THE SNAKE SLEEPS'],1.6,{anim:'snake'});}
  else if(m.mode==='omnium'){m.mode=null;const tot=m.ball.wiz?.total||0;m.ball.wiz=null;p.wizards++;p.albums=[0,0,0,0,0,0];p.albumLit=true;m.say(['OMNIUM GATHERUM TOTAL',fmt(tot)],3,{anim:'wizard'});}
  if(!p.lockLit)m.resetBank('gila');},
 // ---- per frame: clocks, the hurry-up, the ramp diverter (open to the Nest when something up there is lit)
 tick(m,dt){const p=m.p,b=m.ball,a=b.attr,inf=b.infinity;
  if(b.skillT>0)b.skillT-=dt;
  if(a){a.t-=dt;a.def.tick?.(a,m,dt);if(a.t<=0)rules.endAlbum(m,false);}
  if(inf){inf.t-=dt;if(inf.t<=0){b.infinity=null;m.say(['INFINITY ENDS',fmt(inf.total)],2.2,{anim:'nonagon'});}}
  m.w.parts.flightDiv.on=!!(p.planetLit||b.superLit||a?.def.nest||(m.mode==='omnium'&&b.wiz?.lit.includes('planet')));},
 dmdMode(m){const b=m.ball,L=[];
  if(m.mode==='omnium'&&b.wiz)L.push(`OMNIUM GATHERUM · ${b.wiz.lit.length} LIT`);
  if(b.attr)L.push(b.attr.def.id==='dragon'?`SNAKE ${fmt(b.attr.value)} · ${Math.ceil(b.attr.t)}`:`${b.attr.def.short} ${Math.min(b.attr.count,b.attr.def.goal)}/${b.attr.def.goal} · ${Math.ceil(b.attr.t)}`);
  if(b.infinity)L.push(`NONAGON INFINITY · ${Math.ceil(b.infinity.t)}`);
  if(m.mode==='rattle')L.push(b.superLit?'SUPER AT PLANET B':'RATTLESNAKE MULTIBALL');
  return L.length?L[Math.floor(m.t/2)%L.length]:'';},
 music(m){if(m.mode==='omnium')return 'omnium';if(m.mode==='rattle')return 'rattlesnake';if(m.ball.infinity)return 'nonagon';if(m.ball.attr)return m.ball.attr.def.id;return 'main';},
 lamps(m,t){const p=m.p,b=m.ball,L={},blink=(f=4)=>Math.floor(t*f)%2?1:0;
  const lit=new Set([...(b.attr?.lit||[]),...(m.mode==='omnium'?b.wiz?.lit||[]:[])]);
  RATS.forEach((id,i)=>L[id]=b.attr?.def.id==='rats'?blink(6):p.rats[i]);
  KGLW.forEach((id,i)=>L[id]=p.kglw[i]);
  L.planetB=lit.has('planet')||b.superLit?blink(7):p.planetLit?blink(3):0;
  for(let i=0;i<3;i++)L['lock'+i]=i<p.locks?1:i===p.locks&&p.lockLit?blink(3):0;
  const skill=m.phase==='plunge'||b.skillT>0;
  L.snakeArrow=lit.has('snake')||skill?blink(7):m.mode==='rattle'?(b.jackS?blink(5):0):p.lockLit?blink(3):blink(1.2);
  L.flightArrow=lit.has('flight')?blink(7):m.mode==='rattle'?(b.jackF?blink(5):0):skill?blink(4):blink(1.2)*(t%3<1.5?1:0);
  L.snakeJ=m.mode==='rattle'&&b.jackS?1:0;L.flightJ=m.mode==='rattle'&&b.jackF?1:0;
  L.loopL=lit.has('loopL')||b.infinity?blink(7):blink(1)*(t%2<1?1:0);L.loopR=lit.has('loopR')||b.infinity?blink(7):blink(1)*(t%2<1?0:1);
  const spin=Math.floor(t*12)%9;for(let i=0;i<9;i++)L['nona'+i]=b.infinity||m.mode==='omnium'?(i===spin||i===(spin+3)%9||i===(spin+6)%9?1:.25):i<p.nona?1:i===p.nona?blink(3):0;
  L.infinity=b.infinity?blink(8):m.mode==='omnium'?blink(10):m.mode==='rattle'?blink(6):p.infinities?1:0;
  L.gvAlbum=p.wizardLit||(p.albumLit&&!b.attr&&!m.mode)?blink(4):blink(.6);L.gvEB=p.extraLit?blink(3):0;
  for(let i=0;i<6;i++)L['al'+i]=b.attr?.i===i?blink(6):p.albums[i]===2?1:p.albums[i]===1?blink(1):0;
  for(const n of [2,3,4,5,6])L['bx'+n]=p.bonusX>=n?1:0;
  L.kickback=m.w.parts.kickback.lit?1:0;L.outR=0;L.inL=L.inR=0;
  L.shootAgain=m.shootAgainLamp?blink(2):0;L.gamma=b.attr?.def.id==='banana'?blink(6):0;
  return L;},
 bonusLines(m){const p=m.p;return [['BONUS',m.ball.bonus*2500],['ALBUMS',p.albums.filter(x=>x===2).length*100000],['BONUS X',p.bonusX]];},
 bonusTotal(m){const p=m.p;return (m.ball.bonus*2500+p.albums.filter(x=>x===2).length*100000)*p.bonusX;},
 attract:['KING GIZZARD','& THE LIZARD WIZARD','NONAGON INFINITY','FEED THE RATTLESNAKE'],
};
Object.assign(exports,{rules,ALBUMS,shotOf});
