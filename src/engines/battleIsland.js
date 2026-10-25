// Battle Royale (2000) · The Island, rebuilt as a top-down arena duel built on the film's rules: everyone wears an
// explosive collar, the island is a lettered grid, and every few seconds the teacher announces new DANGER ZONES:
// stay in one when it closes and your collar blows. Supply bags hold random issue weapons (pot lid, sickle, crossbow,
// Uzi, shotgun). Trees block shots. Both at once: drag like a joystick on your half to move, tap to attack (the aim
// locks onto your classmate), hold for automatic weapons. Three hearts; best of three rounds.
// Online (netField): the same seeded island, bags and danger zones on both phones (zones on the shared round clock); player
// 2's phone shows the island turned round so you start bottom left. Each phone runs its own student and judges only what
// hurts it: the other's shots (flown here from {sh}), their melee swings {m} at the distance shown here, and its own collar.
// {hit:[shot,hp]} tells the attacker it landed, {k:[cause]} = I'm down, {bag:i} = I took a bag; rounds settle with roundOutcome.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,sfx,makeShake,makeFx,halfPointers,keyboard,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField,roundOutcome}=require("src/engines/netField.js");

const COL=['#3aa8ff','#ff5a7a'],WIN=2,GRID=4;
const WEAPONS={lid:{name:'POT LID',range:9,melee:true,cd:.5,dmg:1},sickle:{name:'SICKLE',range:11,melee:true,cd:.35,dmg:1},crossbow:{name:'CROSSBOW',speed:120,cd:1.1,dmg:2,ammo:6},uzi:{name:'UZI',speed:150,cd:.11,dmg:.34,ammo:45,auto:true,spread:.12},shotgun:{name:'SHOTGUN',speed:130,cd:.9,dmg:.5,ammo:6,pellets:5,spread:.28,range:55}};
const LOOT=['sickle','crossbow','uzi','shotgun','crossbow','uzi'];

async function battleroyale(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),fx=makeFx();const wins=[0,0];let closing=[],state='wait',t=0,round=0,map=null,P=[],shots=[],bags=[],zones=new Set(),pending=new Set(),annT=8,banner=null,rand=null;
 const keys=[{},{}];
 const on=s.online||null,me=on?on.me:0,them=1-me,F=me===1,HUDY=on?40:0;let OC=null,playT0=0,annAt=7,netBot=false,shotN=0;const pendO=[],seen={x:0,y:0,at:0},cause=[null,null];
 const WW=100,WH=100;// world units; screen fit keeps it square-ish
 function genMap(){rand=seededRandom(s.seed+':island'+round);const trees=[];for(let k=0;k<26;k++){const a=rand()*Math.PI*2,r=rand()*36;const tx=50+Math.cos(a)*r,ty=50+Math.sin(a)*r*.9;if(Math.hypot(tx-50,ty-50)<9)continue;trees.push({x:tx,y:ty,r:2.4+rand()*2});}
  return {trees,rocks:Array.from({length:6},()=>({x:15+rand()*70,y:15+rand()*70,r:2+rand()*1.5})),school:{x:44,y:44,w:12,h:10}};}
 function insideIsland(px,py){const dx=(px-50)/46,dy=(py-50)/44;return dx*dx+dy*dy<1;}
 function blocked(px,py,r=2){if(!insideIsland(px,py))return true;for(const tr of map.trees)if(Math.hypot(px-tr.x,py-tr.y)<tr.r+r*.6)return true;for(const rk of map.rocks)if(Math.hypot(px-rk.x,py-rk.y)<rk.r+r*.6)return true;const sc=map.school;return px>sc.x-r&&px<sc.x+sc.w+r&&py>sc.y-r&&py<sc.y+sc.h+r;}
 const zoneOf=(px,py)=>`${'ABCD'[clamp(Math.floor(px/(WW/GRID)),0,3)]}${clamp(Math.floor(py/(WH/GRID)),0,3)+1}`;
 function setupRound(){map=genMap();map.trees=map.trees.filter(tr=>Math.hypot(tr.x-22,tr.y-70)>8&&Math.hypot(tr.x-78,tr.y-30)>8);map.rocks=map.rocks.filter(rk=>Math.hypot(rk.x-22,rk.y-70)>7&&Math.hypot(rk.x-78,rk.y-30)>7);shots=[];zones=new Set();pending=new Set();closing=[];annT=7;
  P=[0,1].map(i=>({i,x:i?78:22,y:i?30:70,hp:3,wpn:'lid',ammo:0,cd:0,aim:0,collar:0,flash:0,alive:true,step:0}));
  bags=Array.from({length:6},()=>{let bx,by;do{bx=12+rand()*76;by=12+rand()*76;}while(blocked(bx,by,3));return {x:bx,y:by,w:LOOT[Math.floor(rand()*LOOT.length)]};});
  state='fight';t=0;annAt=7;OC=null;seen.at=0;cause[0]=cause[1]=null;banner={text:`ROUND ${round+1}`,sub:'Collars armed. Good luck, class.',t:2};}
 // online: both phones start each round together; the round clock t is the time since then
 async function startRound(){setupRound();if(!on)return;state='sync';await nf.start('r'+round);if(!s.alive)return;state='fight';t=0;playT0=performance.now();OC=roundOutcome(nf,round);
  const keep=[];for(const o of pendO.splice(0))if(o[0]===round)OC.feed(o);else if(o[0]>round)keep.push(o);pendO.push(...keep);}
 // online: the round's result, once both phones have called it
 function settleRound(res){const w=res==='me'?me:res==='them'?them:-1;for(const p of P)if(p.i!==w&&p.alive){p.alive=false;fx.splat(sx(p.x),sy(p.y),{n:50,speed:320,size:5});}
  if(w>=0){wins[w]++;s.setScores(wins);s.react?.(w,'win',2);}state='roundEnd';
  banner=w<0?{text:'NOBODY SURVIVES',sub:'Both students down.',t:3}:{text:`${s.players[w].name.toUpperCase()} SURVIVES`,sub:cause[1-w]==='collar'?`${s.players[1-w].name}'s collar went off.`:'Last student standing.',t:3};}
 function los(a,b){const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/1.5);for(let k=1;k<steps;k++){const px=a.x+(b.x-a.x)*k/steps,py=a.y+(b.y-a.y)*k/steps;for(const tr of map.trees)if(Math.hypot(px-tr.x,py-tr.y)<tr.r*.8)return false;const sc=map.school;if(px>sc.x&&px<sc.x+sc.w&&py>sc.y&&py<sc.y+sc.h)return false;}return true;}
 function hurt(p,d,from){if(!p.alive||on&&(p.i!==me||OC?.R.frozen))return;p.hp=Math.max(0,p.hp-d);p.flash=.25;fx.splat(sx(p.x),sy(p.y),{n:14,speed:200,size:3});shake.kick(5);vibrate(25);s.react?.(p.i,'sad',.8);if(p.hp<=0)die(p,from);}
 function die(p,from){p.alive=false;fx.splat(sx(p.x),sy(p.y),{n:50,speed:320,size:5});noise(.8,.14,{f0:1500,f1:60});shake.kick(12);cause[p.i]=from;
  if(on){if(p.i===me){nf.event({r:round,k:[from]});OC?.die((performance.now()-playT0)/1000);nf.push();}return;}const w=1-p.i;wins[w]++;s.setScores(wins);s.react?.(w,'win',2);state='roundEnd';banner={text:`${s.players[w].name.toUpperCase()} SURVIVES`,sub:from==='collar'?`${s.players[p.i].name}'s collar went off.`:'Last student standing.',t:3};}
 function attack(p){if(state!=='fight'||!p.alive||p.cd>0)return;const o=P[1-p.i],W=WEAPONS[p.wpn];const ang=Math.atan2(o.y-p.y,o.x-p.x);p.aim=ang;p.cd=W.cd;
  if(W.melee){sfx.whoosh(700,2200,.06,.12);if(on){nf.event({r:round,m:p.wpn});return;}if(Math.hypot(o.x-p.x,o.y-p.y)<W.range&&o.alive){hurt(o,W.dmg,'hit');sfx.hit();}return;}
  if(p.ammo<=0){p.wpn='lid';voice(200,.06,.04,'square');return;}p.ammo--;const n=W.pellets||1,sent=[];for(let k=0;k<n;k++){const a=ang+(Math.random()-.5)*(W.spread||0)*2,sh={id:`${p.i}:${shotN++}`,x:p.x+Math.cos(a)*2.5,y:p.y+Math.sin(a)*2.5,vx:Math.cos(a)*W.speed,vy:Math.sin(a)*W.speed,owner:p.i,dmg:W.dmg,life:(W.range||90)/W.speed,bolt:p.wpn==='crossbow'};shots.push(sh);sent.push([sh.id,+sh.x.toFixed(2),+sh.y.toFixed(2),+sh.vx.toFixed(2),+sh.vy.toFixed(2),sh.dmg,+sh.life.toFixed(3),sh.bolt?1:0]);}
  if(on)nf.event({r:round,sh:sent});
  if(p.wpn==='crossbow')sfx.whoosh(500,1600,.08,.2);else sfx.gun();}
 const fingers=halfPointers(s,{chooseOwner:on?()=>me:undefined,up:(i,r,{cancelled})=>{if(!cancelled&&r.dist<16&&performance.now()-r.t0<280&&!OC?.R.frozen)attack(P[i]);}});
 // online player 2's island is turned round: screen directions are the world's backwards
 const FLIP={l:'r',r:'l',u:'d',d:'u'};
 keyboard(s,(i,name,down)=>{if(on){i=me;if(F&&FLIP[name])name=FLIP[name];}keys[i][name]=down;if(name==='act'&&down&&P[i]&&!OC?.R.frozen)attack(P[i]);});
 s.hint('P1 left half, P2 right half. Drag like a joystick to move; tap to attack (aim locks onto your rival; you need a clear line past trees). Hold your finger still to keep firing an Uzi. Walk over supply bags for weapons. When zones are announced, get out before they close or your collar explodes. Keys: WASD + Space, arrows + Enter.');
 let sx=X=>X,sy=Y=>Y;
 const nf=netField(s,{hz:30,
  pack:()=>{const p=P[me];return p?{r:round,x:+p.x.toFixed(2),y:+p.y.toFixed(2),hp:+p.hp.toFixed(2),w:p.wpn,a:p.ammo,ai:+p.aim.toFixed(2),c:+p.collar.toFixed(2),v:p.alive?1:0}:0;},
  unpack:(i,d)=>{if(d?.r!==round||!Number.isFinite(d.x)||!Number.isFinite(d.y))return;const p=P[them];if(!p)return;Object.assign(seen,{x:d.x,y:d.y,at:performance.now()});if(Number.isFinite(d.hp))p.hp=d.hp;if(WEAPONS[d.w])p.wpn=d.w;p.ammo=d.a|0;p.aim=+d.ai||0;p.collar=+d.c||0;},
  onEvent:e=>{if(Array.isArray(e.o)){if(OC&&e.o[0]===round)OC.feed(e.o);else if(e.o[0]>=round)pendO.push(e.o);return;}if(e.r!==round||!P.length)return;const o=P[them],m=P[me];
   if(Array.isArray(e.sh)){for(const q of e.sh){if(!Array.isArray(q))continue;const [id,qx,qy,vx,vy,dmg,life,bolt]=q;if([qx,qy,vx,vy,dmg,life].every(Number.isFinite))shots.push({id,x:qx,y:qy,vx,vy,owner:them,dmg,life,bolt:!!bolt});}if(o.wpn==='crossbow')sfx.whoosh(500,1600,.08,.2);else sfx.gun();}
   else if(e.m!==undefined){const W=WEAPONS[e.m];sfx.whoosh(700,2200,.06,.12);if(W?.melee&&o.alive&&m.alive&&state==='fight'&&Math.hypot(o.x-m.x,o.y-m.y)<W.range+1){hurt(m,W.dmg,'hit');sfx.hit();nf.event({r:round,hit:[null,m.hp]});}}
   else if(Array.isArray(e.hit)){const [id,hp]=e.hit;shots=shots.filter(q=>q.id!==id||id==null);if(Number.isFinite(hp))o.hp=hp;o.flash=.25;fx.splat(sx(o.x),sy(o.y),{n:14,speed:200,size:3});s.react?.(o.i,'sad',.8);}
   else if(Array.isArray(e.k)){if(o.alive)die(o,e.k[0]);}
   else if(e.bag!==undefined){const b=bags[e.bag|0];if(b)b.got=true;}}});
 // online: the other student eases toward its last report
 function theirStep(p,dt){p.flash=Math.max(0,p.flash-dt);if(!seen.at)return;const e=Math.min(1,dt*18),dx=seen.x-p.x,dy=seen.y-p.y;p.x+=dx*e;p.y+=dy*e;if(Math.hypot(dx,dy)>.05)p.step+=dt*10;}
 // vs CPU: student 2 flees closing zones, grabs supply bags while it only has a lid, then closes in and attacks with a clear line
 const cpu=isCpu(s);let cpuT=0,cpuStuck=0,cpuLast=null;
 function cpuThink(dt,i=1){const me=P[i],o=P[1-i],k=keys[i],rr=on?Math.random:s.random;k.l=k.r=k.u=k.d=false;if(state!=='fight'||!me?.alive||OC?.R.frozen)return;const sk=cpuSkill(s);
  const bad=(px,py)=>{const z=zoneOf(px,py);return zones.has(z)||pending.has(z);};let tx=o.x,ty=o.y,want=WEAPONS[me.wpn].melee?2.5:Math.min(WEAPONS[me.wpn].range||40,40)*.7;
  if(bad(me.x,me.y)){let best=null,bd=1e9;for(let a=0;a<GRID;a++)for(let b=0;b<GRID;b++){const cx=(a+.5)*WW/GRID,cy=(b+.5)*WH/GRID;if(bad(cx,cy)||!insideIsland(cx,cy))continue;const d=Math.hypot(cx-me.x,cy-me.y);if(d<bd){bd=d;best={x:cx,y:cy};}}if(best){tx=best.x;ty=best.y;want=0;}}
  else if(me.wpn==='lid'){const bag=bags.filter(b=>!b.got&&!bad(b.x,b.y)).sort((a,b)=>Math.hypot(a.x-me.x,a.y-me.y)-Math.hypot(b.x-me.x,b.y-me.y))[0];if(bag&&Math.hypot(bag.x-me.x,bag.y-me.y)<Math.hypot(o.x-me.x,o.y-me.y)+15){tx=bag.x;ty=bag.y;want=0;}}
  // (the online test bot, with no human to come to it, walks round the trees instead of holding its range)
  if(on&&want>2&&tx===o.x&&ty===o.y&&!los(me,o))want=2;
  let dx=tx-me.x,dy=ty-me.y;const d=Math.hypot(dx,dy);if(d<want){dx=-dx;dy=-dy;}
  if(cpuLast&&Math.hypot(me.x-cpuLast.x,me.y-cpuLast.y)<.05&&d>want+1)cpuStuck=.6;cpuLast={x:me.x,y:me.y};if(cpuStuck>0){cpuStuck-=dt;[dx,dy]=[-dy,dx];}
  if(Math.abs(d-want)>1.2||cpuStuck>0){const m=Math.hypot(dx,dy)||1;k.r=dx/m>.38;k.l=dx/m<-.38;k.d=dy/m>.38;k.u=dy/m<-.38;}
  cpuT-=dt;const od=Math.hypot(o.x-me.x,o.y-me.y),W=WEAPONS[me.wpn];
  if(cpuT<=0&&me.cd<=0&&o.alive&&(W.melee?od<W.range:od<(W.range||90)*.9&&los(me,o))){cpuT=.5-sk*.35+rr()*.25;if(rr()<.45+sk*.5)attack(me);}}
 function step(dt){
  if(on)t=(performance.now()-playT0)/1000;else t+=dt;if(on)annT=annAt-t;else annT-=dt;if(cpu)cpuThink(dt);if(on&&netBot)cpuThink(dt,me);
  if(annT<=0&&state==='fight'){const at0=on?annAt:t;if(on)annAt+=11;else annT=11;const free=[];for(let a=0;a<GRID;a++)for(let b=0;b<GRID;b++){const z=`${'ABCD'[a]}${b+1}`;if(!zones.has(z)&&!pending.has(z))free.push(z);}
   const pick=[];const nz=Math.min(free.length-3,round>0?3:2);for(let k=0;k<nz;k++){const z=free.splice(Math.floor(rand()*free.length),1)[0];if(z)pick.push(z);}
   if(pick.length){for(const z of pick)pending.add(z);banner={text:`DANGER ZONES: ${pick.join(', ')}`,sub:'Closing in 5 seconds.',t:2.6};voice(880,.2,.05,'square');voice(660,.3,.05,'square',{delay:.22});closing.push({at:at0+5,pick});}}
  for(const cl of closing)if(t>=cl.at){for(const z of cl.pick){pending.delete(z);zones.add(z);}cl.done=true;}closing=closing.filter(cl=>!cl.done);
  for(const p of P){if(!p.alive)continue;if(on&&p.i!==me){theirStep(p,dt);continue;}p.cd=Math.max(0,p.cd-dt);p.flash=Math.max(0,p.flash-dt);if(OC?.R.frozen)continue;
   let ax=(keys[p.i].r?1:0)-(keys[p.i].l?1:0),ay=(keys[p.i].d?1:0)-(keys[p.i].u?1:0);const f=[...fingers.values()].find(q=>q.i===p.i);let still=false;
   if(f){const dx=f.x-f.sx,dy=f.y-f.sy,d=Math.hypot(dx,dy);if(d>10){ax=dx/d*clamp(d/45,0,1)*(F?-1:1);ay=dy/d*clamp(d/45,0,1)*(F?-1:1);}else still=performance.now()-f.t0>300;}
   const sp=22;const nx=p.x+ax*sp*dt,ny=p.y+ay*sp*dt;if(!blocked(nx,p.y))p.x=nx;if(!blocked(p.x,ny))p.y=ny;if(ax||ay){p.step+=dt*10;p.aim=Math.atan2(ay,ax);}
   if((still||keys[p.i].act)&&WEAPONS[p.wpn].auto)attack(p);
   for(const b of bags)if(!b.got&&Math.hypot(b.x-p.x,b.y-p.y)<3.5){b.got=true;if(on)nf.event({r:round,bag:bags.indexOf(b)});p.wpn=b.w;p.ammo=WEAPONS[b.w].ammo||0;sfx.coin();banner={text:`${s.players[p.i].name}: ${WEAPONS[b.w].name}`,t:1.2,small:true,i:p.i};}
   const z=zoneOf(p.x,p.y);if(zones.has(z)){p.collar+=dt;if(Math.floor(p.collar*6)!==Math.floor((p.collar-dt)*6))voice(1800,.04,.05,'square');if(p.collar>=2.5){hurt(p,99,'collar');}}else p.collar=Math.max(0,p.collar-dt*2);}
  for(const sh of shots){sh.life-=dt;sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;if(blocked(sh.x,sh.y,.2)&&insideIsland(sh.x,sh.y)){sh.life=0;fx.spark(sx(sh.x),sy(sh.y),4,'#d8c08a',120);continue;}
   const o=P[1-sh.owner];if(on&&o.i!==me)continue;if(o.alive&&Math.hypot(o.x-sh.x,o.y-sh.y)<2.4&&!OC?.R.frozen){sh.life=0;hurt(o,sh.dmg,'hit');if(on)nf.event({r:round,hit:[sh.id,o.hp]});}}
  shots=shots.filter(sh=>sh.life>0);
 }
 s.frame(dt=>{
  const W=s.W,H=s.H;shake.step(dt);fx.step(dt);if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}
  if(state==='fight'){step(dt);if(on){nf.tick(dt);const res=OC?.tick(t);if(res)settleRound(res);}}
  if(state==='roundEnd'&&!banner){if(wins.some(v=>v>=WIN)){state='over';s.finish(wins,`Battle Royale · ${wins[0]}–${wins[1]}`);return;}round++;void startRound();}
  if(!map)return;
  const top=46+HUDY,k=Math.min(W/WW,(H-top)/WH),ox=(W-WW*k)/2,oy=top+(H-top-WH*k)/2;sx=X=>ox+(F?WW-X:X)*k;sy=Y=>oy+(F?WH-Y:Y)*k;
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#0d5a8a';x.fillRect(0,0,W,H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  for(let q=0;q<10;q++){x.strokeStyle='#ffffff14';x.lineWidth=2;x.beginPath();x.ellipse(sx(50),sy(50),(48+q*3+Math.sin(t+q)*1)*k,(46+q*3)*k,0,0,Math.PI*2);x.stroke();}
  // island
  x.fillStyle='#e8d29a';x.beginPath();x.ellipse(sx(50),sy(50),48*k,46*k,0,0,Math.PI*2);x.fill();const gr=x.createRadialGradient(sx(46),sy(44),5,sx(50),sy(50),44*k);gr.addColorStop(0,'#6fbf4a');gr.addColorStop(1,'#3f8a36');x.fillStyle=gr;x.beginPath();x.ellipse(sx(50),sy(50),45*k,43*k,0,0,Math.PI*2);x.fill();
  // grid + zones
  const cs=WW/GRID*k;for(let a=0;a<GRID;a++)for(let b=0;b<GRID;b++){const z=`${'ABCD'[a]}${b+1}`,X=ox+(F?GRID-1-a:a)*cs,Y=oy+(F?GRID-1-b:b)*cs;if(zones.has(z)){x.save();x.beginPath();x.rect(X,Y,cs,cs);x.clip();x.fillStyle='rgba(220,20,40,.38)';x.fillRect(X,Y,cs,cs);x.strokeStyle='rgba(255,60,60,.5)';x.lineWidth=3;for(let q=-cs;q<cs;q+=14){x.beginPath();x.moveTo(X+q,Y);x.lineTo(X+q+cs,Y+cs);x.stroke();}x.restore();}
   else if(pending.has(z)&&Math.floor(t*4)%2){x.fillStyle='rgba(255,200,40,.3)';x.fillRect(X,Y,cs,cs);}
   x.strokeStyle='#ffffff30';x.lineWidth=1;x.strokeRect(X,Y,cs,cs);label(x,z,X+12,Y+11,11,{fill:'#ffffffaa',stroke:'#0006',font:`800 11px ${SANS}`});}
  // school, rocks, bags, trees
  const sc=map.school,bx=Math.min(sx(sc.x),sx(sc.x+sc.w)),by=Math.min(sy(sc.y),sy(sc.y+sc.h));x.fillStyle='#c9c2b2';x.fillRect(bx,by,sc.w*k,sc.h*k);x.fillStyle='#8a4a3a';x.fillRect(bx-2,by-2,sc.w*k+4,sc.h*k*.25);x.fillStyle='#4a6a8a';for(let q=0;q<4;q++)x.fillRect(bx+(1.5+q*2.6)*k,by+4.5*k,1.6*k,2*k);
  for(const rk of map.rocks){x.fillStyle='#8a8a8a';x.beginPath();x.arc(sx(rk.x),sy(rk.y),rk.r*k,0,Math.PI*2);x.fill();}
  for(const b of bags){if(b.got)continue;x.fillStyle='#5a3a1a';rr(x,sx(b.x)-1.6*k,sy(b.y)-1.2*k,3.2*k,2.6*k,4);x.fill();x.fillStyle='#ffd23f';x.fillRect(sx(b.x)-.4*k,sy(b.y)-1.4*k,.8*k,.6*k);}
  fx.drawDecals(x);
  for(const sh of shots){x.strokeStyle=sh.bolt?'#d8c08a':'#fff6b0';x.lineWidth=sh.bolt?3:2;x.beginPath();x.moveTo(sx(sh.x),sy(sh.y));x.lineTo(sx(sh.x-sh.vx*.02),sy(sh.y-sh.vy*.02));x.stroke();}
  for(const p of P){if(!p.alive)continue;const X=sx(p.x),Y=sy(p.y),r=Math.max(13,3*k);x.fillStyle='#0004';x.beginPath();x.ellipse(X+2,Y+r*.9,r,r*.4,0,0,Math.PI*2);x.fill();
   x.fillStyle=p.flash>0?'#fff':'#1f2a44';x.beginPath();x.arc(X,Y+r*.35,r*.9,0,Math.PI*2);x.fill();x.strokeStyle=COL[p.i];x.lineWidth=2;x.stroke();
   s.sprite(x,p.i,X,Y-r*.3,r*2.2,{exact:true});
   const danger=zones.has(zoneOf(p.x,p.y));x.strokeStyle=danger&&Math.floor(t*8)%2?'#ff2020':'#555';x.lineWidth=3;x.beginPath();x.ellipse(X,Y+r*.55,r*.55,r*.2,0,0,Math.PI*2);x.stroke();
   if(p.collar>0){x.fillStyle='#ff2020';x.fillRect(X-r,Y-r*1.7,2*r*(p.collar/2.5),3);}
   for(let q=0;q<3;q++){x.fillStyle=q<p.hp?COL[p.i]:'#00000055';x.fillRect(X-r+q*(2*r/3)+1,Y-r*1.45,2*r/3-2,3);}}
  for(const tr of map.trees){x.fillStyle='#1f5a24';x.beginPath();x.arc(sx(tr.x),sy(tr.y),tr.r*k,0,Math.PI*2);x.fill();x.fillStyle='#2f7a34';x.beginPath();x.arc(sx(tr.x)-tr.r*k*.25,sy(tr.y)-tr.r*k*.25,tr.r*k*.6,0,Math.PI*2);x.fill();}
  fx.draw(x);
  x.setTransform(1,0,0,1,0,0);
  for(let i=0;i<2;i++){const p=P[i],sd=on?(i===me?0:1):i,rx=on?W-14:W-130;label(x,`${W<560?'':s.players[i].name+' · '}${WEAPONS[p.wpn].name}${WEAPONS[p.wpn].ammo?` ×${p.ammo}`:''}`,sd?rx:12,20+HUDY,14,{fill:COL[i],align:sd?'right':'left',font:`900 14px ${SANS}`});for(let q=0;q<WIN;q++){x.fillStyle=q<wins[i]?COL[i]:'#ffffff30';x.fillRect(sd?rx-10-q*14:14+q*14,32+HUDY,10,5);}}
  if(state==='sync'&&!banner)label(x,'…',W/2,H*.3,32,{fill:'#fff',stroke:'#000'});
  if(banner){label(x,banner.text,W/2,banner.small?H-30:H*.3,banner.small?16:clamp(W*.05,16,32),{fill:banner.small?COL[banner.i]:'#fff',stroke:'#000',alpha:clamp(banner.t*2,0,1)});if(banner.sub)label(x,banner.sub,W/2,H*.3+clamp(W*.045,16,28),clamp(W*.032,12,18),{fill:'#ffd23f',stroke:'#000',alpha:clamp(banner.t*2,0,1)});}
  s.debug={engine:'battleroyale',P,zones:[...zones],state,wins,round,get oc(){return OC?.R;},bot:on?()=>{netBot=true;return '';}:null};
 });
 if(!await s.pass(0,on?`Battle Royale. You wake up on the island in ${me?'red':'blue'} with an exploding collar; ${s.players[them].name} plays on the other phone. Drag to move, tap to attack, grab supply bags for weapons, and get out of announced DANGER ZONES before they close. Best of three rounds.`:`Battle Royale. ${s.players[0].name} (blue, LEFT half) and ${s.players[1].name} (red, RIGHT half) wake up on the island with exploding collars. Drag to move, tap to attack, grab supply bags for weapons, and get out of announced DANGER ZONES before they close. Best of three rounds.`,'Both ready — start the program',{countdown:3}))return;
 await startRound();
}
Object.assign(exports,{battleroyale});
