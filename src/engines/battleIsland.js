// Battle Royale (2000) · The Island, rebuilt as a top-down arena duel built on the film's rules: everyone wears an
// explosive collar, the island is a lettered grid, and every few seconds the teacher announces new DANGER ZONES:
// stay in one when it closes and your collar blows. Supply bags hold random issue weapons (pot lid, sickle, crossbow,
// Uzi, shotgun). Trees block shots. Both at once: drag like a joystick on your half to move, tap to attack (the aim
// locks onto your classmate), hold for automatic weapons. Three hearts; best of three rounds.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,sfx,makeShake,makeFx,halfPointers,keyboard,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");

const COL=['#3aa8ff','#ff5a7a'],WIN=2,GRID=4;
const WEAPONS={lid:{name:'POT LID',range:9,melee:true,cd:.5,dmg:1},sickle:{name:'SICKLE',range:11,melee:true,cd:.35,dmg:1},crossbow:{name:'CROSSBOW',speed:120,cd:1.1,dmg:2,ammo:6},uzi:{name:'UZI',speed:150,cd:.11,dmg:.34,ammo:45,auto:true,spread:.12},shotgun:{name:'SHOTGUN',speed:130,cd:.9,dmg:.5,ammo:6,pellets:5,spread:.28,range:55}};
const LOOT=['sickle','crossbow','uzi','shotgun','crossbow','uzi'];

async function battleroyale(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),fx=makeFx();const wins=[0,0];let closing=[],state='wait',t=0,round=0,map=null,P=[],shots=[],bags=[],zones=new Set(),pending=new Set(),annT=8,banner=null,rand=null;
 const keys=[{},{}];
 const WW=100,WH=100;// world units; screen fit keeps it square-ish
 function genMap(){rand=seededRandom(s.seed+':island'+round);const trees=[];for(let k=0;k<26;k++){const a=rand()*Math.PI*2,r=rand()*36;const tx=50+Math.cos(a)*r,ty=50+Math.sin(a)*r*.9;if(Math.hypot(tx-50,ty-50)<9)continue;trees.push({x:tx,y:ty,r:2.4+rand()*2});}
  return {trees,rocks:Array.from({length:6},()=>({x:15+rand()*70,y:15+rand()*70,r:2+rand()*1.5})),school:{x:44,y:44,w:12,h:10}};}
 function insideIsland(px,py){const dx=(px-50)/46,dy=(py-50)/44;return dx*dx+dy*dy<1;}
 function blocked(px,py,r=2){if(!insideIsland(px,py))return true;for(const tr of map.trees)if(Math.hypot(px-tr.x,py-tr.y)<tr.r+r*.6)return true;for(const rk of map.rocks)if(Math.hypot(px-rk.x,py-rk.y)<rk.r+r*.6)return true;const sc=map.school;return px>sc.x-r&&px<sc.x+sc.w+r&&py>sc.y-r&&py<sc.y+sc.h+r;}
 const zoneOf=(px,py)=>`${'ABCD'[clamp(Math.floor(px/(WW/GRID)),0,3)]}${clamp(Math.floor(py/(WH/GRID)),0,3)+1}`;
 function setupRound(){map=genMap();map.trees=map.trees.filter(tr=>Math.hypot(tr.x-22,tr.y-70)>8&&Math.hypot(tr.x-78,tr.y-30)>8);map.rocks=map.rocks.filter(rk=>Math.hypot(rk.x-22,rk.y-70)>7&&Math.hypot(rk.x-78,rk.y-30)>7);shots=[];zones=new Set();pending=new Set();closing=[];annT=7;
  P=[0,1].map(i=>({i,x:i?78:22,y:i?30:70,hp:3,wpn:'lid',ammo:0,cd:0,aim:0,collar:0,flash:0,alive:true,step:0}));
  bags=Array.from({length:6},()=>{let bx,by;do{bx=12+rand()*76;by=12+rand()*76;}while(blocked(bx,by,3));return {x:bx,y:by,w:LOOT[Math.floor(rand()*LOOT.length)]};});
  state='fight';t=0;banner={text:`ROUND ${round+1}`,sub:'Collars armed. Good luck, class.',t:2};}
 function los(a,b){const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/1.5);for(let k=1;k<steps;k++){const px=a.x+(b.x-a.x)*k/steps,py=a.y+(b.y-a.y)*k/steps;for(const tr of map.trees)if(Math.hypot(px-tr.x,py-tr.y)<tr.r*.8)return false;const sc=map.school;if(px>sc.x&&px<sc.x+sc.w&&py>sc.y&&py<sc.y+sc.h)return false;}return true;}
 function hurt(p,d,from){if(!p.alive)return;p.hp=Math.max(0,p.hp-d);p.flash=.25;fx.splat(sx(p.x),sy(p.y),{n:14,speed:200,size:3});shake.kick(5);vibrate(25);s.react?.(p.i,'sad',.8);if(p.hp<=0)die(p,from);}
 function die(p,from){p.alive=false;fx.splat(sx(p.x),sy(p.y),{n:50,speed:320,size:5});noise(.8,.14,{f0:1500,f1:60});shake.kick(12);const w=1-p.i;wins[w]++;s.setScores(wins);s.react?.(w,'win',2);state='roundEnd';banner={text:`${s.players[w].name.toUpperCase()} SURVIVES`,sub:from==='collar'?`${s.players[p.i].name}'s collar went off.`:'Last student standing.',t:3};}
 function attack(p){if(state!=='fight'||!p.alive||p.cd>0)return;const o=P[1-p.i],W=WEAPONS[p.wpn];const ang=Math.atan2(o.y-p.y,o.x-p.x);p.aim=ang;p.cd=W.cd;
  if(W.melee){sfx.whoosh(700,2200,.06,.12);if(Math.hypot(o.x-p.x,o.y-p.y)<W.range&&o.alive){hurt(o,W.dmg,'hit');sfx.hit();}return;}
  if(p.ammo<=0){p.wpn='lid';voice(200,.06,.04,'square');return;}p.ammo--;const n=W.pellets||1;for(let k=0;k<n;k++){const a=ang+(Math.random()-.5)*(W.spread||0)*2;shots.push({x:p.x+Math.cos(a)*2.5,y:p.y+Math.sin(a)*2.5,vx:Math.cos(a)*W.speed,vy:Math.sin(a)*W.speed,owner:p.i,dmg:W.dmg,life:(W.range||90)/W.speed,bolt:p.wpn==='crossbow'});}
  if(p.wpn==='crossbow')sfx.whoosh(500,1600,.08,.2);else sfx.gun();}
 const fingers=halfPointers(s,{up:(i,r,{cancelled})=>{if(!cancelled&&r.dist<16&&performance.now()-r.t0<280)attack(P[i]);}});
 keyboard(s,(i,name,down)=>{keys[i][name]=down;if(name==='act'&&down&&P[i])attack(P[i]);});
 s.hint('P1 left half, P2 right half. Drag like a joystick to move; tap to attack (aim locks onto your rival; you need a clear line past trees). Hold your finger still to keep firing an Uzi. Walk over supply bags for weapons. When zones are announced, get out before they close or your collar explodes. Keys: WASD + Space, arrows + Enter.');
 let sx=X=>X,sy=Y=>Y;
 function step(dt){
  t+=dt;annT-=dt;
  if(annT<=0&&state==='fight'){annT=11;const free=[];for(let a=0;a<GRID;a++)for(let b=0;b<GRID;b++){const z=`${'ABCD'[a]}${b+1}`;if(!zones.has(z)&&!pending.has(z))free.push(z);}
   const pick=[];const nz=Math.min(free.length-3,round>0?3:2);for(let k=0;k<nz;k++){const z=free.splice(Math.floor(rand()*free.length),1)[0];if(z)pick.push(z);}
   if(pick.length){for(const z of pick)pending.add(z);banner={text:`DANGER ZONES: ${pick.join(', ')}`,sub:'Closing in 5 seconds.',t:2.6};voice(880,.2,.05,'square');voice(660,.3,.05,'square',{delay:.22});closing.push({at:t+5,pick});}}
  for(const cl of closing)if(t>=cl.at){for(const z of cl.pick){pending.delete(z);zones.add(z);}cl.done=true;}closing=closing.filter(cl=>!cl.done);
  for(const p of P){if(!p.alive)continue;p.cd=Math.max(0,p.cd-dt);p.flash=Math.max(0,p.flash-dt);
   let ax=(keys[p.i].r?1:0)-(keys[p.i].l?1:0),ay=(keys[p.i].d?1:0)-(keys[p.i].u?1:0);const f=[...fingers.values()].find(q=>q.i===p.i);let still=false;
   if(f){const dx=f.x-f.sx,dy=f.y-f.sy,d=Math.hypot(dx,dy);if(d>10){ax=dx/d*clamp(d/45,0,1);ay=dy/d*clamp(d/45,0,1);}else still=performance.now()-f.t0>300;}
   const sp=22;const nx=p.x+ax*sp*dt,ny=p.y+ay*sp*dt;if(!blocked(nx,p.y))p.x=nx;if(!blocked(p.x,ny))p.y=ny;if(ax||ay){p.step+=dt*10;p.aim=Math.atan2(ay,ax);}
   if((still||keys[p.i].act)&&WEAPONS[p.wpn].auto)attack(p);
   for(const b of bags)if(!b.got&&Math.hypot(b.x-p.x,b.y-p.y)<3.5){b.got=true;p.wpn=b.w;p.ammo=WEAPONS[b.w].ammo||0;sfx.coin();banner={text:`${s.players[p.i].name}: ${WEAPONS[b.w].name}`,t:1.2,small:true,i:p.i};}
   const z=zoneOf(p.x,p.y);if(zones.has(z)){p.collar+=dt;if(Math.floor(p.collar*6)!==Math.floor((p.collar-dt)*6))voice(1800,.04,.05,'square');if(p.collar>=2.5){hurt(p,99,'collar');}}else p.collar=Math.max(0,p.collar-dt*2);}
  for(const sh of shots){sh.life-=dt;sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;if(blocked(sh.x,sh.y,.2)&&insideIsland(sh.x,sh.y)){sh.life=0;fx.spark(sx(sh.x),sy(sh.y),4,'#d8c08a',120);continue;}
   const o=P[1-sh.owner];if(o.alive&&Math.hypot(o.x-sh.x,o.y-sh.y)<2.4){sh.life=0;hurt(o,sh.dmg,'hit');}}
  shots=shots.filter(sh=>sh.life>0);
 }
 s.frame(dt=>{
  const W=s.W,H=s.H;shake.step(dt);fx.step(dt);if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}
  if(state==='fight')step(dt);
  if(state==='roundEnd'&&!banner){if(wins.some(v=>v>=WIN)){state='over';s.finish(wins,`Battle Royale · ${wins[0]}–${wins[1]}`);return;}round++;setupRound();}
  if(!map)return;
  const top=46,k=Math.min(W/WW,(H-top)/WH),ox=(W-WW*k)/2,oy=top+(H-top-WH*k)/2;sx=X=>ox+X*k;sy=Y=>oy+Y*k;
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#0d5a8a';x.fillRect(0,0,W,H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  for(let q=0;q<10;q++){x.strokeStyle='#ffffff14';x.lineWidth=2;x.beginPath();x.ellipse(sx(50),sy(50),(48+q*3+Math.sin(t+q)*1)*k,(46+q*3)*k,0,0,Math.PI*2);x.stroke();}
  // island
  x.fillStyle='#e8d29a';x.beginPath();x.ellipse(sx(50),sy(50),48*k,46*k,0,0,Math.PI*2);x.fill();const gr=x.createRadialGradient(sx(46),sy(44),5,sx(50),sy(50),44*k);gr.addColorStop(0,'#6fbf4a');gr.addColorStop(1,'#3f8a36');x.fillStyle=gr;x.beginPath();x.ellipse(sx(50),sy(50),45*k,43*k,0,0,Math.PI*2);x.fill();
  // grid + zones
  const cs=WW/GRID*k;for(let a=0;a<GRID;a++)for(let b=0;b<GRID;b++){const z=`${'ABCD'[a]}${b+1}`,X=ox+a*cs,Y=oy+b*cs;if(zones.has(z)){x.save();x.beginPath();x.rect(X,Y,cs,cs);x.clip();x.fillStyle='rgba(220,20,40,.38)';x.fillRect(X,Y,cs,cs);x.strokeStyle='rgba(255,60,60,.5)';x.lineWidth=3;for(let q=-cs;q<cs;q+=14){x.beginPath();x.moveTo(X+q,Y);x.lineTo(X+q+cs,Y+cs);x.stroke();}x.restore();}
   else if(pending.has(z)&&Math.floor(t*4)%2){x.fillStyle='rgba(255,200,40,.3)';x.fillRect(X,Y,cs,cs);}
   x.strokeStyle='#ffffff30';x.lineWidth=1;x.strokeRect(X,Y,cs,cs);label(x,z,X+12,Y+11,11,{fill:'#ffffffaa',stroke:'#0006',font:`800 11px ${SANS}`});}
  // school, rocks, bags, trees
  const sc=map.school;x.fillStyle='#c9c2b2';x.fillRect(sx(sc.x),sy(sc.y),sc.w*k,sc.h*k);x.fillStyle='#8a4a3a';x.fillRect(sx(sc.x)-2,sy(sc.y)-2,sc.w*k+4,sc.h*k*.25);x.fillStyle='#4a6a8a';for(let q=0;q<4;q++)x.fillRect(sx(sc.x+1.5+q*2.6),sy(sc.y+4.5),1.6*k,2*k);
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
  for(let i=0;i<2;i++){const p=P[i];label(x,`${W<560?'':s.players[i].name+' · '}${WEAPONS[p.wpn].name}${WEAPONS[p.wpn].ammo?` ×${p.ammo}`:''}`,i?W-130:12,20,14,{fill:COL[i],align:i?'right':'left',font:`900 14px ${SANS}`});for(let q=0;q<WIN;q++){x.fillStyle=q<wins[i]?COL[i]:'#ffffff30';x.fillRect(i?W-140-q*14:14+q*14,32,10,5);}}
  if(banner){label(x,banner.text,W/2,banner.small?H-30:H*.3,banner.small?16:clamp(W*.05,16,32),{fill:banner.small?COL[banner.i]:'#fff',stroke:'#000',alpha:clamp(banner.t*2,0,1)});if(banner.sub)label(x,banner.sub,W/2,H*.3+clamp(W*.045,16,28),clamp(W*.032,12,18),{fill:'#ffd23f',stroke:'#000',alpha:clamp(banner.t*2,0,1)});}
  s.debug={engine:'battleroyale',P,zones:[...zones],state,wins};
 });
 if(!await s.pass(0,`Battle Royale. ${s.players[0].name} (blue, LEFT half) and ${s.players[1].name} (red, RIGHT half) wake up on the island with exploding collars. Drag to move, tap to attack, grab supply bags for weapons, and get out of announced DANGER ZONES before they close. Best of three rounds.`,'Both ready — start the program',{countdown:3}))return;
 setupRound();
}
Object.assign(exports,{battleroyale});
