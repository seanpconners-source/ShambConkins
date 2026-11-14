// Sean of a Gun, the NEW worlds' enemies, bosses, weapons and hazards (src/engines/broforce/worlds.js builds the stages).
// broforce.js hands in a context `C` (getters for the world W, the bro P, the theme... and its own helpers: moveBody,
// hurtPlayer, queueBoom, hitF, killFoe, makeFoe, fx, sfx...) and calls these hooks only for the new worlds, so the first
// four worlds play exactly as before.
// Enemies by archetype: shooter, leaper, brute, thrower, flier (shooting, kamikaze or sneaky), tank, turret, pop-up
// (pipe plant / tentacle), stomper (jump on it), shell (kick it), teleporter, cannon. Bosses: one state machine with a
// library of attacks (volleys, leaps with shockwaves, charges, summons, warned rain, horizontal beams, ground slams,
// homing missiles, dives, bomb drops, teleports, rolling) and a drawing per boss.
// Online: player 1's phone runs enemies and bosses; enemy shots go out as {xs}, danger zones (beams, slams, rain) as {zn};
// each phone judges what hits its own bro.
const BS=require("src/data/broforceSprites.js");
const FOES2={
 // space
 robot:{arch:'shooter',hp:3,w:6,h:22,speed:24,sight:200,score:200,shot:'laser',burst:3,col:['#9aa4b4','#3a4250','#ff3a3a']},
 alien:{arch:'leaper',hp:1.5,w:7,h:10,speed:40,sight:170,score:150,col:['#3a5a2a','#a0d060','#ff3']},
 xeno:{arch:'thrower',hp:2.5,w:6,h:20,speed:22,sight:210,score:200,shot:'acid',col:['#2a2a3a','#5a8a3a','#a0ff60']},
 drone:{arch:'flier',hp:2,w:7,h:8,speed:50,sight:220,score:200,shot:'laser',col:['#5a6a7a','#c8d0dc','#ff3a3a']},
 mechtank:{arch:'tank',hp:22,w:15,h:18,speed:14,sight:260,score:1500,shot:'shell',col:['#4a5a6a','#2a323a','#ffcc33']},
 turret:{arch:'turret',hp:5,w:7,h:9,speed:0,sight:230,score:300,shot:'laser',col:['#5a5e66','#2a2e36','#ff3a3a']},
 // hell
 imp:{arch:'flier',hp:1.5,w:6,h:9,speed:55,sight:220,score:150,shot:'fire',col:['#c03018','#801008','#ffd23a']},
 demon:{arch:'brute',hp:8,w:9,h:28,speed:20,sight:200,score:500,col:['#a01818','#4a0808','#ffcc33']},
 skeleton:{arch:'thrower',hp:1.5,w:5,h:20,speed:24,sight:200,score:150,shot:'bone',col:['#e8e2cc','#8a8470','#f33']},
 hellhound:{arch:'leaper',hp:2,w:8,h:11,speed:46,sight:180,score:200,col:['#2a1008','#c03018','#ffd23a']},
 cultist:{arch:'shooter',hp:1.5,w:5,h:21,speed:24,sight:200,score:150,shot:'fire',burst:2,col:['#3a0a14','#7a1a2a','#ffb02a']},
 chariot:{arch:'tank',hp:24,w:16,h:18,speed:16,sight:260,score:1500,shot:'fireE',col:['#3a1a10','#a03018','#ffd23a']},
 // the other dimension
 crawler:{arch:'leaper',hp:1.5,w:7,h:9,speed:44,sight:170,score:150,col:['#2a1a3a','#8a4aa0','#ff4a8a']},
 shade:{arch:'teleporter',hp:2,w:5,h:22,speed:20,sight:200,score:250,col:['#0a0610','#3a1a4a','#c84aff']},
 tentacle:{arch:'popup',hp:4,w:5,h:26,speed:0,sight:70,score:300,col:['#3a1a2a','#a04a6a','#ffd0e0']},
 spore:{arch:'flier',hp:1,w:6,h:7,speed:40,sight:200,score:150,kamikaze:1,col:['#4a2a5a','#c870ff','#fff']},
 eyeball:{arch:'flier',hp:2.5,w:7,h:8,speed:36,sight:230,score:250,shot:'laserP',col:['#f0e8f0','#a0204a','#3a0010']},
 // game worlds
 shroom:{arch:'stomper',hp:1,w:7,h:12,speed:22,sight:0,score:100,col:['#a0501a','#f0d0a0','#000']},
 shelly:{arch:'stomper',hp:1,w:6,h:16,speed:20,sight:0,score:150,shell:1,col:['#2a9a2a','#f0c060','#fff']},
 plumber:{arch:'shooter',hp:2,w:6,h:20,speed:30,sight:210,score:250,shot:'fireE',burst:1,hop:1,col:['#d82a1a','#2a4ad8','#f0b080']},
 hog:{arch:'leaper',hp:1.5,w:7,h:11,speed:70,sight:240,score:200,roll:1,col:['#2a5ad8','#f0c080','#fff']},
 chomper:{arch:'popup',hp:2,w:6,h:18,speed:0,sight:60,score:200,pipe:1,col:['#2a9a2a','#d82a1a','#fff']},
 ghost:{arch:'flier',hp:3,w:8,h:9,speed:30,sight:260,score:250,shy:1,col:['#f4f4fa','#c8c8dc','#000']},
 pixel:{arch:'teleporter',hp:2,w:6,h:18,speed:20,sight:220,score:250,shot:'pixel',col:['#ff2a8a','#2affe0','#ffe02a']},
 cannon:{arch:'cannon',hp:6,w:8,h:12,speed:0,sight:280,score:300,shot:'bill',col:['#2a2a2a','#5a5a5a','#fff']},
};
const FOE2_IDS=Object.keys(FOES2);
const WEAPONS2={
 laser:{name:'LASER RIFLE',rate:.14,dmg:1.3,speed:900,life:.45,tile:.6,ext:'laser',pierce:2},
 plasma:{name:'PLASMA CANNON',rate:.55,dmg:2.6,speed:230,life:1.6,tile:0,ext:'plasma'},
 railgun:{name:'RAILGUN',rate:.9,dmg:6,speed:1700,life:.3,tile:3,ext:'rail',pierce:99},
 pulse:{name:'PULSE SMG',rate:.07,dmg:.75,speed:560,life:.33,tile:.6,ext:'pulse',spread:.14},
 minigun:{name:'MINIGUN',rate:.045,dmg:.8,speed:640,life:.5,tile:.8,ext:'mini',spread:.1},
 lightning:{name:'LIGHTNING GUN',rate:.15,dmg:1.6,range:112,ext:'zap'},
 holy:{name:'HOLY WATER',rate:.42,dmg:2,speed:230,ext:'holy'},
 fireball:{name:'FIRE FLOWER',rate:.26,dmg:1.6,speed:250,ext:'fireball'},
 boomerang:{name:'BOOMERANG',rate:.5,dmg:2.2,speed:320,ext:'boomer'},
 ring:{name:'RING BLASTER',rate:.3,dmg:1.1,speed:430,life:.6,tile:.5,ext:'ring',pellets:3,spread:.32},
};
const BOSSES={
 warmech:{hp:150,w:20,h:52,hw:20,hh:54,speed:36,attacks:[['missiles',3],['volley',3],['leap',2],['summon',1]],shot:'laser',summon:['drone'],col:['#5a6a7a','#2a323a','#ffcc33','#ff3a3a']},
 saucer:{hp:160,w:28,h:20,hw:30,hh:22,fly:1,hoverH:84,speed:60,attacks:[['drop',3],['beam',2],['summon',2],['ring',2]],shot:'laser',summon:['alien','alien'],col:['#9aa4b4','#5a6470','#6aff8a','#ff3a3a']},
 queen:{hp:280,w:24,h:56,hw:24,hh:58,speed:44,attacks:[['charge',3],['volley',2],['summon',2],['slam',2],['leap',2]],shot:'acid',summon:['alien','xeno'],col:['#1a1a24','#4a5a3a','#a0ff60','#c0c0c8']},
 cerberus:{hp:170,w:26,h:40,hw:28,hh:42,speed:46,attacks:[['volley',3],['charge',2],['leap',2],['rain',1]],shot:'fire',col:['#2a1008','#5a1a0c','#ffd23a','#ff5a1a']},
 bonedragon:{hp:180,w:30,h:26,hw:30,hh:28,fly:1,hoverH:90,speed:66,attacks:[['dive',3],['volley',3],['rain',2],['summon',1]],shot:'fire',summon:['skeleton','skeleton'],col:['#e8e2cc','#8a8470','#ff5a1a','#3a2a1a']},
 beast:{hp:340,w:30,h:72,hw:30,hh:74,speed:30,attacks:[['rain',2],['leap',2],['summon',2],['beam',2],['slam',3]],shot:'fire',summon:['imp','demon'],col:['#6a0808','#2a0202','#ffd23a','#ff3a10']},
 flower:{hp:170,w:20,h:46,hw:22,hh:48,speed:42,attacks:[['charge',3],['slam',3],['summon',2],['leap',1]],shot:'orb',summon:['crawler','crawler'],col:['#3a1a2a','#a04a6a','#ffd0e0','#3a0010']},
 voideye:{hp:175,w:22,h:22,hw:22,hh:24,fly:1,hoverH:80,speed:54,attacks:[['beam',3],['ring',3],['teleport',2],['summon',1]],shot:'laserP',summon:['spore','spore'],col:['#f0e8f0','#a0204a','#3a0010','#c84aff']},
 shadow:{hp:340,w:28,h:70,hw:28,hh:72,speed:30,attacks:[['slam',3],['rain',2],['summon',2],['beam',2],['teleport',2]],shot:'orb',summon:['shade','spore'],col:['#06040c','#2a1a3a','#c84aff','#ff2a6a']},
 shellking:{hp:175,w:22,h:44,hw:24,hh:46,speed:38,attacks:[['volley',3],['leap',3],['spin',2],['rain',2]],shot:'fireE',col:['#2a9a2a','#f0c060','#d82a1a','#fff']},
 eggbot:{hp:175,w:24,h:24,hw:24,hh:26,fly:1,hoverH:78,speed:62,attacks:[['drop',3],['dive',2],['missiles',2],['summon',1]],shot:'orb',summon:['hog','hog'],col:['#d82a1a','#c8c8d0','#f0b080','#2a2a2a']},
 glitch:{hp:320,w:24,h:52,hw:26,hh:54,speed:46,attacks:[['teleport',3],['volley',2],['beam',2],['rain',2],['slam',2],['summon',1]],shot:'pixel',summon:['pixel','ghost'],col:['#ff2a8a','#2affe0','#ffe02a','#000']},
};
const SHOT_KINDS=['laser','fire','acid','bone','fireE','shell','missile','bomb','drop','orb','laserP','pixel','bill','hammer'];
function makeExt(C){
 const T=C.T,K=C.K,rnd=Math.random;
 const zones=()=>C.W.zones||(C.W.zones=[]),arcs=()=>C.W.arcs||(C.W.arcs=[]);
 const bodyHit=(P,x0,y0,x1,y1)=>!P.dead&&!P.out&&!P.boarded&&P.x+P.w>x0&&P.x-P.w<x1&&P.y>y0&&P.y-P.h<y1;
 // ------------------------------------------------------------ enemy shots
 function enemyShot(kind,x,y,vx,vy,extra){extra=extra||{};
  const sh={ext:1,kind,x,y,vx,vy,owner:'e',life:extra.life||3,g:{acid:420,bone:420,fireE:500,shell:320,bomb:600,drop:520,hammer:520}[kind]||0,dmg:extra.dmg||1,t:0,...extra};
  if(kind==='laser'||kind==='laserP'||kind==='fire'||kind==='pixel'||kind==='orb'||kind==='bill'){sh.g=0;}
  C.W.shots.push(sh);if(C.net&&C.host)C.outbox.xs.push([SHOT_KINDS.indexOf(kind),Math.round(x),Math.round(y),Math.round(vx),Math.round(vy),sh.homing?1:0]);return sh;}
 function netShot(a){const [ki,x,y,vx,vy,h]=a;const kind=SHOT_KINDS[ki];if(!kind)return;const sh={ext:1,kind,x,y,vx,vy,owner:'e',life:3,g:{acid:420,bone:420,fireE:500,shell:320,bomb:600,drop:520,hammer:520}[kind]||0,dmg:1,t:0,remote:1};if(h)sh.homing=1.6;C.W.shots.push(sh);}
 function zone(z){zones().push({t:0,hit:false,...z});if(C.net&&C.host)C.ev({zn:[Math.round(z.x0),Math.round(z.y0),Math.round(z.x1),Math.round(z.y1),+z.warn.toFixed(2),+z.on.toFixed(2),z.kind,z.dmg||1]});}
 function netZone(a){const [x0,y0,x1,y1,warn,on,kind,dmg]=a;zones().push({x0,y0,x1,y1,warn,on,kind,dmg,t:0,hit:false});}
 // ------------------------------------------------------------ player weapons
 function fire(p,w,mx,my,remote=false){
  const W=C.W,f=p.facing,own=remote?'r':'p';
  if(w.ext==='zap'){const tg=[];const from={x:mx,y:my};let cur=from;
   for(let k=0;k<3;k++){let best=null,bd=k?60:w.range;for(const e of W.foes)if(e.alive&&e.active&&!tg.includes(e)){const ex=e.x,ey=e.y-e.h*.6;if(!k&&Math.sign(ex-mx)!==f)continue;const d=Math.hypot(ex-cur.x,ey-cur.y);if(d<bd){bd=d;best=e;}}
    if(!best)break;tg.push(best);const to={x:best.x,y:best.y-best.h*.6};arcs().push({a:cur,b:to,t:.12});if(!remote)C.hitF(best,w.dmg*(k?.7:1),cur.x);cur=to;}
   const B=W.boss;if(B&&B.alive&&B.state!=='wait'&&Math.abs(B.x-mx)<w.range+(B.hw||18)&&Math.sign(B.x-mx)===f){arcs().push({a:from,b:{x:B.x,y:B.y-(B.hh||56)*.5},t:.12});if(!remote)C.hitB(w.dmg,mx);}
   if(!tg.length&&!(B&&B.alive))arcs().push({a:from,b:{x:mx+f*w.range*.8,y:my+(rnd()-.5)*20},t:.08});
   C.snd(1200+rnd()*600,.06,{type:'sawtooth',vol:.025,to:300});return;}
  if(w.ext==='plasma'){W.shots.push({ext:1,kind:'plasma',x:mx,y:my,vx:f*w.speed,vy:0,life:w.life,owner:own,dmg:w.dmg,t:0});C.snd(300,.2,{type:'sine',vol:.04,to:900});return;}
  if(w.ext==='holy'){W.shots.push({ext:1,kind:'holy',x:mx,y:my-2,vx:f*w.speed+p.vx*.3,vy:-170,g:600,life:2,owner:own,dmg:w.dmg,t:0,spin:0});C.snd(900,.05,{type:'triangle',vol:.03});return;}
  if(w.ext==='fireball'){W.shots.push({ext:1,kind:'fireP',x:mx,y:my,vx:f*w.speed,vy:120,g:800,life:1.8,owner:own,dmg:w.dmg,t:0,bounces:0});C.snd(700,.06,{type:'square',vol:.025,to:300});return;}
  if(w.ext==='boomer'){W.shots.push({ext:1,kind:'boomer',x:mx,y:my,vx:f*w.speed,vy:0,life:1.6,owner:own,dmg:w.dmg,t:0,ox:p,hits:new Set(),f});C.snd(500,.15,{type:'triangle',vol:.03,to:800});return;}
  // straight bullets with looks (laser, rail, pulse, minigun, rings)
  const n=w.pellets||1;
  for(let k=0;k<n;k++){const sp=n>1?(k/(n-1)-.5)*w.spread:(w.spread?(rnd()-.5)*w.spread:(rnd()-.5)*.03);
   W.bullets.push({x:mx,y:my,vx:Math.cos(sp)*f*w.speed,vy:Math.sin(sp)*w.speed,life:w.life,owner:own,dmg:remote?0:w.dmg,tile:remote?0:w.tile,kind:w.ext,pierce:w.pierce||0,hits:null});}
  if(w.ext==='rail'){C.fx.shake(4);p.vx-=f*70;C.snd(140,.35,{type:'sawtooth',vol:.05,to:2400});arcs().push({a:{x:mx,y:my},b:{x:mx+f*360,y:my},t:.18,rail:1});}
  else if(w.ext==='laser')C.snd(1600,.07,{type:'square',vol:.02,to:700});
  else if(w.ext==='ring')C.snd(1800,.08,{type:'triangle',vol:.03,to:2600});
  else C.snd(w.ext==='mini'?220:400,.04,{type:'square',vol:.02});
 }
 // ------------------------------------------------------------ ext shots (both owners)
 function stepShot(sh,dt){
  const W=C.W,P=C.P;sh.t+=dt;sh.life-=dt;
  if(sh.homing&&sh.t<sh.homing&&!P.dead){const a=Math.atan2(P.y-12-sh.y,P.x-sh.x),sp=Math.hypot(sh.vx,sh.vy),cur=Math.atan2(sh.vy,sh.vx);let d=a-cur;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;const na=cur+Math.max(-3*dt,Math.min(3*dt,d));sh.vx=Math.cos(na)*sp;sh.vy=Math.sin(na)*sp;}
  if(sh.kind==='boomer'){const back=sh.t>.45;if(back&&sh.ox){const dx=sh.ox.x-sh.x,dy=sh.ox.y-14-sh.y,d=Math.hypot(dx,dy)||1;sh.vx+=(dx/d*420-sh.vx)*Math.min(1,dt*5);sh.vy+=(dy/d*420-sh.vy)*Math.min(1,dt*5);if(d<10&&sh.t>.6)sh.life=0;}else sh.vx*=1-dt*1.2;}
  sh.vy+=(sh.g||0)*dt;const nx=sh.x+sh.vx*dt,ny=sh.y+sh.vy*dt;
  const solid=C.solidAt(nx,ny);
  if(sh.kind==='fireP'||sh.kind==='fireE'){if(C.solidAt(nx,sh.y)){sh.vx=-sh.vx*.9;sh.bounces=(sh.bounces||0)+1;}else sh.x=nx;if(C.solidAt(sh.x,ny)){sh.vy=-Math.abs(sh.vy)*.78-60;if(sh.vy>-140)sh.vy=-180;sh.bounces=(sh.bounces||0)+1;}else sh.y=ny;if(sh.bounces>5)sh.life=0;}
  else if(sh.kind==='boomer'){sh.x=nx;sh.y=ny;}
  else{if(solid){impact(sh);return;}sh.x=nx;sh.y=ny;}
  if(sh.life<=0){if(['plasma','holy','shell','bomb','missile','drop','acid'].includes(sh.kind))impact(sh);return;}
  if(sh.owner==='p'||sh.owner==='r'){
   const own=sh.owner==='p';
   for(const e of W.foes)if(e.alive&&e.active&&Math.abs(sh.x-e.x)<e.w+4&&sh.y>e.y-e.h-2&&sh.y<e.y+3){
    if(sh.kind==='boomer'){if(!sh.hits.has(e)){sh.hits.add(e);if(own)C.hitF(e,sh.dmg,sh.x);}continue;}
    if(sh.kind==='fireP'){if(own)C.hitF(e,sh.dmg,sh.x);sh.life=0;C.fx.burst(sh.x,sh.y,{n:5,colors:['#ff8a1a','#ffd23a'],speed:70,life:.3,size:1.6});return;}
    impact(sh);return;}
   for(const cg of W.cages)if(!cg.open&&Math.abs(sh.x-cg.x)<9&&sh.y>cg.y-24&&sh.y<cg.y){if(own){cg.hp-=sh.dmg;if(cg.hp<=0)C.openCage(cg);}if(sh.kind!=='boomer'){impact(sh);return;}}
   const B=W.boss;if(B&&B.alive&&B.state!=='wait'&&Math.abs(sh.x-B.x)<(B.hw||18)&&sh.y>B.y-(B.hh||56)&&sh.y<B.y+2){if(sh.kind==='boomer'){if(!sh.hits.has(B)){sh.hits.add(B);if(own)C.hitB(sh.dmg,sh.x);}}else{if(own)C.hitB(sh.dmg,sh.x);impact(sh);return;}}
  }else if(bodyHit(P,sh.x-2,sh.y-2,sh.x+2,sh.y+2)){impact(sh,true);return;}
 }
 function impact(sh,onBro=false){
  sh.life=-1;const own=sh.owner==='p'||sh.owner!=='r'&&C.host;
  const boom={plasma:[26,2.5],holy:[0,0],shell:[30,3],bomb:[30,3],missile:[24,2],drop:[16,1],acid:[0,0]}[sh.kind];
  if(sh.kind==='holy'){if(own){for(let k=0;k<14;k++)C.W.flames.push({x:sh.x+(rnd()-.5)*18,y:sh.y-2,vx:(rnd()-.5)*40,vy:-20-rnd()*40,life:.9+rnd()*.6,max:1.4,dmg:.5,r:sh.owner==='r'});}C.fx.burst(sh.x,sh.y,{n:8,colors:['#bfe8ff','#fff'],speed:90,life:.4,size:1.6});C.snd(1400,.15,{type:'triangle',vol:.03,to:400});return;}
  if(sh.kind==='acid'){C.fx.burst(sh.x,sh.y,{n:7,colors:['#a0ff60','#5a8a3a'],speed:80,life:.5,size:1.8,gravity:400});if(onBro)C.hurtPlayer(sh.dmg,sh.x);return;}
  if(boom&&boom[0]){if(own)C.queueBoom(sh.x,sh.y,boom[0],boom[1],sh.owner);return;}
  C.fx.burst(sh.x,sh.y,{n:4,colors:shotCols(sh.kind),speed:70,life:.25,size:1.4});
  if(onBro)C.hurtPlayer(sh.dmg,sh.x-sh.vx*.05);
 }
 const shotCols=k=>({laser:['#ff5a5a','#fff'],laserP:['#ff6ad5','#fff'],fire:['#ff8a1a','#ffd23a'],fireE:['#ff8a1a','#ffd23a'],bone:['#e8e2cc','#fff'],pixel:['#ff2a8a','#2affe0'],orb:['#c84aff','#fff'],bill:['#222','#fff'],hammer:['#888','#ccc']}[k]||['#fff']);
 function drawShot(g,sh,time){
  g.save();g.translate(sh.x,sh.y);const k=sh.kind;
  if(k==='plasma'){const r=4+Math.sin(time*30)*.8;const gr=g.createRadialGradient(0,0,1,0,0,r*2.2);gr.addColorStop(0,'#fff');gr.addColorStop(.35,'#7af');gr.addColorStop(1,'rgba(80,120,255,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,r*2.2,0,7);g.fill();}
  else if(k==='holy'){g.rotate(sh.t*12);g.fillStyle='#bfe8ff';g.fillRect(-1.6,-3,3.2,6);g.fillStyle='#fff';g.fillRect(-1,-4.4,2,1.6);g.fillStyle='#e8c040';g.fillRect(-.4,-2,.8,3);g.fillRect(-1.2,-1.2,2.4,.8);}
  else if(k==='fireP'||k==='fireE'||k==='fire'){g.rotate(sh.t*14);g.fillStyle='#ff4a10';g.beginPath();g.arc(0,0,3,0,7);g.fill();g.fillStyle='#ffd23a';g.fillRect(-1.5,-1.5,3,3);}
  else if(k==='boomer'){g.rotate(sh.t*22);g.fillStyle='#c88a3a';g.beginPath();g.moveTo(-6,0);g.quadraticCurveTo(0,-5,6,0);g.quadraticCurveTo(0,-2,-6,0);g.fill();}
  else if(k==='acid'){g.fillStyle='#a0ff60';g.beginPath();g.arc(0,0,2.6,0,7);g.fill();g.fillStyle='#5a8a3a';g.beginPath();g.arc(-1,1,1.2,0,7);g.fill();}
  else if(k==='bone'||k==='hammer'){g.rotate(sh.t*16);g.fillStyle=k==='bone'?'#ece6d0':'#9a9a9a';g.fillRect(-4,-1,8,2);g.beginPath();g.arc(-4,0,1.6,0,7);g.arc(4,0,1.6,0,7);g.fill();if(k==='hammer'){g.fillStyle='#6a4a2a';g.fillRect(-1,-1,1.5,6);}}
  else if(k==='shell'||k==='bomb'||k==='drop'){g.fillStyle=k==='drop'?'#ff6a1a':'#2a2a2a';g.beginPath();g.arc(0,0,k==='drop'?3:3.4,0,7);g.fill();if(k==='bomb'){g.fillStyle='#f33';if((sh.t*10|0)%2)g.fillRect(-.6,-4.6,1.2,1.4);}if(k==='drop'){g.fillStyle='#ffd23a';g.beginPath();g.arc(0,0,1.4,0,7);g.fill();}}
  else if(k==='missile'){g.rotate(Math.atan2(sh.vy,sh.vx));g.fillStyle='#ccc';g.fillRect(-5,-1.4,8,2.8);g.fillStyle='#c22';g.beginPath();g.moveTo(3,-1.4);g.lineTo(6,0);g.lineTo(3,1.4);g.fill();g.fillStyle='#ffb02a';g.beginPath();g.arc(-6,0,1.6+Math.random(),0,7);g.fill();}
  else if(k==='bill'){g.scale(Math.sign(sh.vx)||1,1);g.fillStyle='#1a1a1a';g.beginPath();g.moveTo(-5,-4);g.lineTo(3,-4);g.arc(3,0,4,-Math.PI/2,Math.PI/2);g.lineTo(-5,4);g.fill();g.fillStyle='#fff';g.fillRect(0,-2,2,1.5);}
  else if(k==='pixel'){g.fillStyle=(time*20|0)%2?'#ff2a8a':'#2affe0';g.fillRect(-2.5,-2.5,5,5);}
  else{const c=shotCols(k);g.fillStyle=c[0];g.beginPath();g.arc(0,0,2.6,0,7);g.fill();g.fillStyle=c[1];g.beginPath();g.arc(0,0,1.2,0,7);g.fill();}
  g.restore();
 }
 function drawBullet(g,b){
  const k=b.kind,col={laser:'#5af',rail:'#9ef',pulse:'#c8f',mini:'#ffe08a',ring:'#ffd23a'}[k];
  if(k==='ring'){g.strokeStyle='#ffd23a';g.lineWidth=1.4;g.beginPath();g.ellipse(b.x,b.y,2.6,3.2,0,0,7);g.stroke();return;}
  g.strokeStyle=col||'#fff3a0';g.lineWidth=k==='rail'?3:k==='laser'?2:1.4;g.shadowColor=col||'#fff';g.shadowBlur=k==='rail'||k==='laser'?4:0;g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x-b.vx*(k==='laser'?.02:.012),b.y-b.vy*.012);g.stroke();g.shadowBlur=0;
 }
 // ------------------------------------------------------------ enemies
 function makeFoe2(e){const d=FOES2[e.type];Object.assign(e,{hp:d.hp,w:d.w,h:d.h,ext:1,fly:!!(e.fly||d.arch==='flier'),hidden:d.arch==='popup'?1:0,popT:rnd()*2,hx:e.x,hy:e.y});return e;}
 function updateFoe(e,dt){
  const d=FOES2[e.type],W=C.W,slow=[1.45,1.15,1][C.stageIdx||0]||1;e.flash=Math.max(0,e.flash-dt);if(e.bubble){e.bubble.t-=dt;if(e.bubble.t<=0)e.bubble=null;}
  const tg=C.foeTarget(e),mine=tg===C.P,px=tg.x,py=tg.y-12,dx=px-e.x,dy=py-(e.y-e.h*.6),alive=C.upBro(tg);
  const sight=Math.min(d.sight||200,C.viewW()*.55+30);
  const sees=alive&&d.sight>0&&Math.abs(dx)<sight&&Math.abs(dy)<100&&tg.inv<2&&(e.fly||C.los(e.x,e.y-e.h*.7,px,py));
  e.t-=dt;e.cool-=dt;e.anim+=(Math.abs(e.vx)*.1+(e.fly?3:0))*dt;
  const touch=(dmg=1,rx=e.w+3,ry=e.h)=>{if(mine&&!tg.dead&&!tg.boarded&&tg.inv<=0&&Math.abs(dx)<rx&&py>e.y-ry-8&&py<e.y+6)C.hurtPlayer(dmg,e.x);};
  if(sees&&e.state==='patrol'){e.state='attack';e.cool=(.4+rnd()*.3)*slow;e.bubble={ch:'!',t:.8};C.sfx.alert();}
  if(!sees&&e.state==='attack'){e.lost=(e.lost||0)+dt;if(e.lost>3){e.state='patrol';e.lost=0;}}else e.lost=0;
  let speed=0;
  switch(d.arch){
   case 'shooter':{
    if(e.state==='attack'){e.dir=Math.sign(dx)||e.dir;if(Math.abs(dx)>110)speed=d.speed;else if(Math.abs(dx)<50)speed=-d.speed*.8;
     if(d.hop&&e.grounded&&rnd()<.012){e.vy=-300;}
     if(sees&&e.cool<=0){e.burst=(e.burst||0)+1;const last=e.burst>=(d.burst||2);e.cool=last?(1.2+rnd()*.8)*slow:.18;if(last)e.burst=0;
      const a=Math.atan2(Math.max(-Math.abs(dx)*.6,Math.min(Math.abs(dx)*.6,dy)),Math.abs(dx));const sp=d.shot==='fireE'?180:230;
      enemyShot(d.shot,e.x+e.dir*9,e.y-e.h*.55,Math.cos(a)*e.dir*sp,d.shot==='fireE'?-60:Math.sin(a)*sp);e.muzzle=.08;C.sfx.enemy();}}
    else speed=patrol(e,d);break;}
   case 'leaper':{
    if(e.state==='attack'){e.dir=Math.sign(dx)||e.dir;speed=d.speed*(d.roll?2.4:2.2);if(e.grounded&&Math.abs(dx)<70&&(e.lunge||0)<=0){e.vy=d.roll?-200:-250;e.lunge=1.1;speed*=1.3;}e.lunge=(e.lunge||0)-dt;touch(1);}
    else speed=patrol(e,d);break;}
   case 'brute':{
    if(e.state==='attack'){e.dir=Math.sign(dx)||e.dir;if(e.charge>0){e.charge-=dt;speed=170;}else{speed=d.speed*1.6;if(Math.abs(dx)<90&&e.cool<=0){e.charge=.9;e.cool=2.4;e.bubble={ch:'!',t:.5};C.snd(90,.3,{type:'sawtooth',vol:.05,to:50});}}touch(2,e.w+4);}
    else speed=patrol(e,d);break;}
   case 'thrower':{
    if(e.state==='attack'){e.dir=Math.sign(dx)||e.dir;if(Math.abs(dx)<70)speed=-d.speed;
     if(sees&&e.cool<=0){e.cool=(1.6+rnd()*.8)*slow;const tt=.85,vx=Math.max(-230,Math.min(230,dx/tt)),vy=Math.max(-330,Math.min(-120,(dy-.5*420*tt*tt)/tt));enemyShot(d.shot,e.x+e.dir*5,e.y-e.h+2,vx,vy);}}
    else speed=patrol(e,d);break;}
   case 'flier':{
    e.vy=0;const t0=C.frames*.016+e.k;let tx,ty;
    if(e.state==='attack'){if(d.shy&&tg.facing===Math.sign(e.x-tg.x)){tx=e.x;ty=e.y;}else{tx=px-Math.sign(dx||1)*(d.kamikaze?0:70);ty=py-(d.kamikaze?0:40)+Math.sin(t0*2)*10;}}
    else{tx=e.hx+Math.sin(t0*.7)*40;ty=e.hy+Math.sin(t0*1.3)*10;}
    const ax=tx-e.x,ay=ty-(e.y-e.h),dd=Math.hypot(ax,ay)||1,sp=d.speed*(e.state==='attack'?1.4:.6);
    if(dd>4){e.x+=ax/dd*sp*dt;e.y+=ay/dd*sp*dt;}if(Math.abs(ax)>2)e.dir=Math.sign(ax);if(e.state==='attack')e.dir=Math.sign(dx)||e.dir;
    if(C.solidAt(e.x,e.y-e.h*.5)){e.y-=sp*dt*2;}
    if(d.kamikaze){if(e.state==='attack'&&Math.abs(dx)<12&&Math.abs(dy)<14){e.alive=false;C.quietDeath(e);C.queueBoom(e.x,e.y-4,30,2,'env');}}
    else if(d.shot&&sees&&e.cool<=0&&e.state==='attack'){e.cool=(1.3+rnd()*.9)*slow;const a=Math.atan2(dy,dx),sp2=d.shot==='laserP'?260:200;enemyShot(d.shot,e.x,e.y-e.h*.5,Math.cos(a)*sp2,Math.sin(a)*sp2);e.muzzle=.08;}
    if(d.shy)touch(1,8,10);
    e.vx=0;e.grounded=false;return;}
   case 'tank':{
    if(e.state==='attack'){e.dir=Math.sign(dx)||e.dir;if(Math.abs(dx)>150)speed=d.speed;else if(Math.abs(dx)<90)speed=-d.speed;
     e.aim=Math.atan2(dy,Math.abs(dx));
     if(e.cool<=0&&sees){e.cool=(2.4+rnd()*.8)*slow;const tt=1.1,vx=Math.max(-260,Math.min(260,dx/tt)),vy=(dy-.5*320*tt*tt)/tt;enemyShot(d.shot==='fireE'?'fireE':'shell',e.x+e.dir*14,e.y-15,vx,Math.max(-300,vy));C.snd(70,.4,{type:'sawtooth',vol:.06,to:40});C.fx.shake(3);e.muzzle=.12;}
     else if(sees&&(e.mg=(e.mg||0)-dt)<=0&&Math.abs(dx)<160){e.mg=.12;e.mgN=(e.mgN||0)+1;if(e.mgN>(slow>1.2?4:6)){e.mg=1.4*slow;e.mgN=0;}enemyShot('laser',e.x+e.dir*10,e.y-10,e.dir*240,(rnd()-.5)*20);}}
    else{e.dir=e.dir||1;speed=d.speed*.5;const ahead=e.x+e.dir*(e.w+3);if(C.solidAt(ahead,e.y-6)||!C.solidAt(ahead,e.y+3))e.dir*=-1;}
    touch(2,e.w+2,e.h);break;}
   case 'turret':{e.vy=0;if(e.state==='attack'){e.aim=Math.atan2(dy,dx);e.dir=Math.sign(dx)||e.dir;if(sees&&e.cool<=0){e.burst=(e.burst||0)+1;const last=e.burst>=3;e.cool=last?1.6*slow:.14;if(last)e.burst=0;enemyShot(d.shot,e.x+Math.cos(e.aim)*8,e.y-5+Math.sin(e.aim)*8,Math.cos(e.aim)*250,Math.sin(e.aim)*250);e.muzzle=.06;}}return;}
   case 'cannon':{e.vy=0;e.dir=Math.sign(dx)||e.dir;if(sees&&e.cool<=0&&Math.abs(dy)<30){e.cool=2.6;enemyShot('bill',e.x+e.dir*10,e.y-7,e.dir*150,0,{life:4,dmg:2});C.snd(90,.3,{type:'square',vol:.05,to:40});}return;}
   case 'popup':{e.vy=0;e.popT-=dt;const near=mine&&Math.abs(dx)<(d.pipe?18:60)&&Math.abs(dy)<60;
    if(e.hidden){if(e.popT<=0&&!(d.pipe&&near)){e.hidden=0;e.popT=1.6;}}else{if(e.popT<=0){e.hidden=1;e.popT=1.4+rnd();}
     if(d.pipe)touch(1,7,e.h);else{e.dir=Math.sign(dx)||e.dir;if(Math.abs(dx)<44&&Math.abs(dy)<30&&e.cool<=0){e.cool=1.2;e.whip=.35;}if(e.whip>0){e.whip-=dt;if(e.whip<.18&&mine&&Math.abs(dx)<40&&Math.sign(dx)===e.dir&&Math.abs(dy)<26)C.hurtPlayer(1,e.x);}}}
    return;}
   case 'stomper':{
    if(e.shellT!=null){speed=e.kick?240*e.kick:0;if(e.kick){for(const o of W.foes)if(o!==e&&o.alive&&o.active&&Math.abs(o.x-e.x)<o.w+e.w&&Math.abs(o.y-e.y)<10)C.killFoe(o,e.x,false);touch(1,e.w+2,10);}
     e.shellT-=dt;if(e.shellT<=0){e.alive=false;C.quietDeath(e);}
     const res=C.moveBody(e,dt,{grav:900,maxFall:420});if(res.wall)e.kick=-(e.kick||0);e.vx=speed;return;}
    speed=d.speed;const ahead=e.x+e.dir*(e.w+3);if(C.solidAt(ahead,e.y-6)||!C.solidAt(ahead,e.y+3)&&![K.PLAT,K.LADDER].includes(C.tileAt(ahead,e.y+3)))e.dir*=-1;
    touch(1,e.w+1,e.h);break;}
   case 'teleporter':{
    if(e.state==='attack'){if(e.blink>0){e.blink-=dt;if(e.blink<=0){const side=-tg.facing||1;let nx=px+side*26;if(C.solidAt(nx,tg.y-6))nx=px-side*26;e.x=nx;e.y=tg.y;e.dir=Math.sign(px-e.x)||1;e.wind=.5;C.fx.burst(e.x,e.y-10,{n:10,colors:d.col,speed:80,life:.4,size:1.6});}}
     else if(e.wind>0){e.wind-=dt;if(e.wind<=0){if(d.shot){enemyShot(d.shot,e.x+e.dir*8,e.y-12,e.dir*220,0);}else if(mine&&Math.abs(dx)<26&&Math.abs(dy)<24)C.hurtPlayer(1,e.x);e.cool=1.6+rnd();}}
     else if(e.cool<=0&&sees){e.blink=.35;C.fx.burst(e.x,e.y-10,{n:10,colors:d.col,speed:80,life:.4,size:1.6});C.snd(1200,.15,{type:'sine',vol:.03,to:200});}
     else{e.dir=Math.sign(dx)||e.dir;speed=d.speed;}}
    else speed=patrol(e,d);break;}
  }
  if(speed&&d.arch!=='stomper'){const ahead=e.x+Math.sign(speed*e.dir)*(e.w+3);const cliff=!C.solidAt(ahead,e.y+3)&&![K.PLAT,K.LADDER].includes(C.tileAt(ahead,e.y+3));if(cliff&&d.arch!=='leaper')speed=0;}
  e.vx=speed*e.dir;
  const res=C.moveBody(e,dt,{grav:900,maxFall:420});if(res.wall&&e.state==='patrol')e.dir*=-1;
  if(e.y>C.ROWS*T){e.alive=false;C.quietDeath(e);}
 }
 function patrol(e,d){if(e.t<0){e.t=1.5+rnd()*2.5;if(rnd()<.3)e.idle=1+rnd()*1.5;}if(e.idle>0){e.idle-=1/60;return 0;}const ahead=e.x+e.dir*(e.w+3);if(C.solidAt(ahead,e.y-6)||!C.solidAt(ahead,e.y+3)&&![K.PLAT,K.LADDER].includes(C.tileAt(ahead,e.y+3)))e.dir*=-1;return d.speed;}
 // a stomped shelly becomes a shell to kick; other stompers just die
 function stomp(e){const d=FOES2[e.type];if(d.shell&&e.shellT==null){e.shellT=8;e.kick=0;e.h=8;C.addScore(100,e.x,e.y-12);C.snd(600,.08,{type:'square',vol:.03,to:200});return true;}
  if(e.shellT!=null){e.kick=e.kick?0:(C.P.x<e.x?1:-1);e.shellT=6;C.snd(800,.06,{type:'square',vol:.03});return true;}
  C.killFoe(e,C.P.x,false);return true;}
 // ------------------------------------------------------------ hazards, pads, portals, rings, stomps, lava
 function updateStage(dt,time){
  const W=C.W,P=C.P;
  for(const z of zones())z.t+=dt;
  if(W.arcs)W.arcs=W.arcs.filter(a=>(a.t-=dt)>0);
  if(!P||P.dead||P.out||P.boarded){W.zones=zones().filter(z=>z.t<z.warn+z.on);return;}
  // danger zones (beams, slams, rain): each phone judges its own bro
  for(const z of zones())if(!z.hit&&z.dmg&&z.t>z.warn&&z.t<z.warn+z.on&&bodyHit(P,z.x0,z.y0,z.x1,z.y1)){z.hit=true;C.hurtPlayer(z.dmg,(z.x0+z.x1)/2);}
  W.zones=zones().filter(z=>z.t<z.warn+z.on);
  // lava, spikes, the void
  const feet=C.tileAt(P.x,P.y-2),body=C.tileAt(P.x,P.y-10);
  if(feet===K.LAVA||feet===K.SPIKE||body===K.LAVA){C.hurtPlayer(1,P.x+(rnd()-.5));P.vy=-470/Math.sqrt(C.theme.grav||1);if(feet===K.LAVA)C.fx.burst(P.x,P.y,{n:8,colors:['#ff6a1a','#ffd23a'],speed:90,life:.4,size:1.8,gravity:300});}
  // jump pads
  if(P.grounded&&C.tileAt(P.x,P.y+2)===K.PAD){P.vy=-560;P.grounded=false;C.snd(220,.25,{type:'square',vol:.04,to:880});C.fx.burst(P.x,P.y,{n:6,colors:['#ffd23a','#fff'],speed:60,life:.3,size:1.4});}
  // hazards
  for(const h of W.S.haz||[]){h.t=(h.t||0)+dt;
   if(h.k==='firebar'){h.ang=(h.ang||0)+h.spd*dt;const n=6;for(let k=1;k<=n;k++){const x=h.x+Math.cos(h.ang)*h.len*k/n,y=h.y+Math.sin(h.ang)*h.len*k/n;if(Math.abs(P.x-x)<P.w+3&&P.y>y-3&&P.y-P.h<y+3){C.hurtPlayer(1,x);break;}}}
   else if(h.k==='geyser'){const ph=((h.t+h.ph)%h.period)/h.period;h.on=ph>.62;if(h.on&&Math.abs(P.x-h.x)<8&&P.y>h.y-70&&P.y<=h.y+1)C.hurtPlayer(1,h.x);}}
  // portals (and warp pipes)
  P.portT=Math.max(0,(P.portT||0)-dt);
  if(P.portT<=0)for(const p of W.S.portals||[]){if(Math.abs(P.x-p.x)<9&&Math.abs(P.y-p.y)<12&&(!p.pipe||P.grounded&&(C.inp.d||p.y>P.y-2))){const o=W.S.portals[p.to];if(!o)continue;P.x=o.x;P.y=o.y-1;P.vx=0;P.vy=-120;P.portT=1.2;C.snd(300,.4,{type:'sine',vol:.05,to:1500});C.fx.ring(P.x,P.y-10,{color:'#c84aff',r0:4,r1:30,life:.4,width:3});break;}}
  // rings
  if(W.rings)for(const r of W.rings)if(!r.got&&Math.abs(P.x-r.x)<9&&P.y>r.y-4&&P.y-P.h<r.y+4){r.got=1;C.addScore(10);C.snd(1760,.07,{type:'triangle',vol:.03});C.snd(2640,.1,{type:'triangle',vol:.025});}
  // stomping
  if(P.vy>40)for(const e of W.foes){if(!e.alive||!e.active||!e.ext)continue;const d=FOES2[e.type];if(d.arch!=='stomper'&&!(d.arch==='leaper'&&!d.roll))continue;
   if(Math.abs(P.x-e.x)<e.w+P.w&&P.y>e.y-e.h-2&&P.y<e.y-e.h+8){if(C.net&&!C.host){C.hitF(e,9,P.x);}else stomp(e);P.vy=-260;P.inv=Math.max(P.inv,.2);break;}}
  // kicking a resting shell by walking into it
  for(const e of W.foes)if(e.alive&&e.active&&e.shellT!=null&&!e.kick&&Math.abs(P.x-e.x)<e.w+P.w&&Math.abs(P.y-e.y)<6&&P.grounded){e.kick=P.x<e.x?1:-1;e.shellT=6;C.snd(800,.06,{type:'square',vol:.03});}
 }
 // the bro bonked his head: a ? block gives something
 function bonk(p){const c=Math.floor(p.x/T),r=Math.floor((p.y-p.h-2)/T);if(C.T_AT(c,r)!==K.QBLOCK)return;C.W.tiles[r*C.MAXW+c]=K.ROCK;if(C.net)C.outbox.qb.push(r*C.MAXW+c);
  const x=(c+.5)*T,y=r*T;const roll=rnd();if(roll<.45){C.addScore(200,x,y-6,'#ffd23a');C.snd(1760,.08,{type:'triangle',vol:.04});}else C.W.pickups.push({x,y,vy:-160,vx:30,w:4,h:7,kind:roll<.75?'nade':'gun',t:12,weapon:C.theme.weapons[Math.floor(rnd()*C.theme.weapons.length)]});
  C.fx.burst(x,y,{n:6,colors:['#ffd23a','#c84c0c'],speed:80,life:.4,size:1.6});}
 function drawStage(g,time){
  const W=C.W;
  for(const h of W.S.haz||[]){
   if(h.k==='firebar'){g.fillStyle='#5a5a5a';g.beginPath();g.arc(h.x,h.y,3,0,7);g.fill();const n=6;for(let k=1;k<=n;k++){const x=h.x+Math.cos(h.ang||0)*h.len*k/n,y=h.y+Math.sin(h.ang||0)*h.len*k/n;g.fillStyle=k%2?'#ff4a10':'#ffd23a';g.beginPath();g.arc(x,y,3.2,0,7);g.fill();}}
   else if(h.k==='geyser'){g.fillStyle='#2a1a14';g.fillRect(h.x-6,h.y-3,12,3);const ph=(((h.t||0)+h.ph)%h.period)/h.period;if(ph>.45&&ph<=.62){g.fillStyle='rgba(255,120,30,.6)';for(let k=0;k<3;k++){g.beginPath();g.arc(h.x+(Math.random()-.5)*6,h.y-4-Math.random()*6,1.5,0,7);g.fill();}}
    if(h.on){for(let k=0;k<10;k++){const y=h.y-k*7-Math.random()*4;g.fillStyle=k<3?'#fff3a0':k<6?'#ffb02a':'#e8401a';g.globalAlpha=1-k*.07;g.beginPath();g.arc(h.x+(Math.random()-.5)*5,y,4-k*.2,0,7);g.fill();}g.globalAlpha=1;}}}
  for(const p of W.S.portals||[]){if(p.pipe)continue;g.save();g.translate(p.x,p.y-12);for(let k=0;k<4;k++){g.rotate(time*2+k);g.strokeStyle=['#c84aff','#5af','#ff2a8a','#fff'][k];g.globalAlpha=.7;g.lineWidth=1.6;g.beginPath();g.ellipse(0,0,7-k,11-k*1.5,0,0,5.5);g.stroke();}g.restore();g.globalAlpha=1;}
  if(W.rings)for(const r of W.rings)if(!r.got){const s=Math.abs(Math.cos(time*4+r.x*.1));g.strokeStyle='#ffd23a';g.lineWidth=1.4;g.beginPath();g.ellipse(r.x,r.y,3.2*s+.4,3.6,0,0,7);g.stroke();}
  for(const z of zones()){const on=z.t>z.warn&&z.t<z.warn+z.on;
   if(!on){const k=z.t/z.warn;g.fillStyle=`rgba(255,40,40,${.1+.25*Math.abs(Math.sin(z.t*14))})`;if(z.kind==='beam'){g.fillRect(z.x0,(z.y0+z.y1)/2-1,z.x1-z.x0,2);}else g.fillRect(z.x0,z.y1-4*k,z.x1-z.x0,4*k);continue;}
   if(z.kind==='beam'){const gr=g.createLinearGradient(0,z.y0,0,z.y1);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,z.col||'#ff4af0');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(z.x0,z.y0,z.x1-z.x0,z.y1-z.y0);g.fillStyle='#fff';g.fillRect(z.x0,(z.y0+z.y1)/2-1,z.x1-z.x0,2);}
   else if(z.kind==='slam'||z.kind==='pillar'){const e=(z.t-z.warn)/z.on,h=(z.y1-z.y0)*Math.min(1,e*4);for(let k=0;k<8;k++){g.fillStyle=z.col2||['#ff4a10','#ffb02a','#fff3a0'][k%3];g.globalAlpha=.9;g.beginPath();g.ellipse((z.x0+z.x1)/2+(Math.random()-.5)*(z.x1-z.x0)*.6,z.y1-h*k/8,(z.x1-z.x0)*.45,h/8,0,0,7);g.fill();}g.globalAlpha=1;}
   else if(z.kind==='tentacle'){const e=(z.t-z.warn)/z.on,h=(z.y1-z.y0)*Math.sin(Math.min(1,e)*Math.PI);g.strokeStyle='#3a1a2a';g.lineWidth=7;g.lineCap='round';g.beginPath();const cx=(z.x0+z.x1)/2;g.moveTo(cx,z.y1);g.quadraticCurveTo(cx+Math.sin(time*9)*8,z.y1-h*.6,cx+Math.sin(time*7)*4,z.y1-h);g.stroke();g.strokeStyle='#a04a6a';g.lineWidth=3;g.stroke();g.lineCap='butt';}}
  for(const a of W.arcs||[]){g.strokeStyle=a.rail?'#bff':'#cfe8ff';g.lineWidth=a.rail?2.5:1.4;g.shadowColor='#7cf';g.shadowBlur=6;g.beginPath();g.moveTo(a.a.x,a.a.y);const n=a.rail?1:6;for(let k=1;k<=n;k++){const t=k/n;g.lineTo(a.a.x+(a.b.x-a.a.x)*t+(k<n?(Math.random()-.5)*10:0),a.a.y+(a.b.y-a.a.y)*t+(k<n?(Math.random()-.5)*10:0));}g.stroke();g.shadowBlur=0;}
 }
 // ------------------------------------------------------------ enemy drawing (sprite sheet first, drawn art otherwise)
 function drawFoe(g,e,time){
  const d=FOES2[e.type],c=d.col,run=Math.abs(e.vx)>3,ph=e.anim||0;
  if(BS.drawFoe(g,e,time))return bubble(g,e,time);
  g.save();g.translate(e.x,e.y);g.scale(e.dir||1,1);if(e.flash>0)g.filter='brightness(3)';
  const L=run?Math.sin(ph*1.8)*3:0;
  const legs=(col,y=-8,h=8)=>{g.fillStyle=col;g.fillRect(-3+L*.6,y,3,h);g.fillRect(.5-L*.6,y,3,h);};
  switch(e.type){
   case 'robot':legs(c[1]);g.fillStyle=c[0];g.fillRect(-5,-19,10,11);g.fillStyle=c[1];g.fillRect(-5,-10,10,2);g.fillStyle=c[0];g.fillRect(-4,-26,8,7);g.fillStyle=c[2];g.fillRect(0,-24,4,2);g.fillStyle='#222';g.fillRect(1,-16,10,2.5);if(e.muzzle>0){g.fillStyle='#ff8a8a';g.beginPath();g.arc(12,-15,2.4,0,7);g.fill();}break;
   case 'alien':case 'crawler':case 'hellhound':{const cr=e.type==='crawler';g.fillStyle=c[0];g.beginPath();g.ellipse(0,-5,8,4.5,0,0,7);g.fill();for(let k=-2;k<=2;k++){g.strokeStyle=c[0];g.lineWidth=1.2;g.beginPath();g.moveTo(k*2.5,-4);g.lineTo(k*3.5+Math.sin(ph*3+k)*2,0);g.stroke();}
    g.fillStyle=c[1];g.beginPath();g.ellipse(5,-7,4,3,0,0,7);g.fill();g.fillStyle=c[2];g.fillRect(6,-8,1.5,1.5);if(e.type==='hellhound'){g.fillStyle='#ffb02a';g.beginPath();g.moveTo(9,-6);g.lineTo(13+Math.random()*2,-6);g.lineTo(9,-4);g.fill();}
    if(cr){g.strokeStyle=c[1];g.lineWidth=1;g.beginPath();g.moveTo(-7,-6);g.quadraticCurveTo(-12,-12,-9,-14);g.stroke();}break;}
   case 'xeno':legs(c[0]);g.fillStyle=c[0];g.fillRect(-4,-18,8,10);g.beginPath();g.ellipse(2,-23,7,4,-.3,0,7);g.fill();g.fillStyle=c[2];g.fillRect(6,-24,2,1.5);g.strokeStyle=c[0];g.lineWidth=2;g.beginPath();g.moveTo(-3,-10);g.quadraticCurveTo(-12,-6,-11,-16);g.stroke();break;
   case 'drone':case 'imp':case 'eyeball':case 'spore':case 'ghost':{const bob=Math.sin(time*6+e.k)*1.5;g.translate(0,-e.h+bob);
    if(e.type==='drone'){g.fillStyle=c[0];g.fillRect(-6,-3,12,6);g.fillStyle=c[1];g.fillRect(-8,-5,16,1.5);const r=Math.abs(Math.cos(time*40))*8;g.fillStyle='rgba(200,200,200,.6)';g.fillRect(-r-4,-6.5,r*2,1);g.fillStyle=c[2];g.fillRect(2,-1,3,2);}
    else if(e.type==='imp'){g.fillStyle=c[0];g.beginPath();g.ellipse(0,0,4,5,0,0,7);g.fill();const fl=Math.sin(time*20)*4;g.fillStyle=c[1];g.beginPath();g.moveTo(-2,-2);g.lineTo(-10,-6-fl);g.lineTo(-6,1);g.fill();g.beginPath();g.moveTo(2,-2);g.lineTo(10,-6-fl);g.lineTo(6,1);g.fill();g.fillStyle=c[2];g.fillRect(1,-2,1.5,1.5);g.fillStyle='#e8d8b0';g.fillRect(-2,-6,1,2);g.fillRect(2,-6,1,2);}
    else if(e.type==='eyeball'){g.fillStyle=c[0];g.beginPath();g.arc(0,0,6,0,7);g.fill();g.fillStyle=c[1];g.beginPath();g.arc(2,0,3,0,7);g.fill();g.fillStyle=c[2];g.beginPath();g.arc(2.6,0,1.4,0,7);g.fill();g.strokeStyle='#a0204a';g.lineWidth=.6;for(let k=0;k<4;k++){g.beginPath();g.moveTo(-6,k-2);g.lineTo(-10,k*2-3+Math.sin(time*5+k));g.stroke();}}
    else if(e.type==='spore'){const p2=1+Math.sin(time*8)*.15;g.scale(p2,p2);g.fillStyle=c[0];g.beginPath();g.arc(0,0,5,0,7);g.fill();g.fillStyle=c[1];for(let k=0;k<6;k++){g.beginPath();g.arc(Math.cos(k)*4,Math.sin(k)*4,1.4,0,7);g.fill();}}
    else{const look=C.P&&C.P.facing===Math.sign(e.x-C.P.x);g.fillStyle=c[0];g.beginPath();g.arc(0,0,7,Math.PI,0);g.lineTo(7,6);for(let k=0;k<4;k++)g.lineTo(5-k*4,4+(k%2)*3);g.lineTo(-7,6);g.fill();g.fillStyle=c[2];if(look){g.fillRect(-4,-3,2,2);g.fillRect(-2+3,-3,2,2);g.fillStyle='#f4a';g.fillRect(-3,1,6,1.5);}else{g.fillRect(1,-3,2,3);g.fillRect(4,-3,2,3);}}
    break;}
   case 'mechtank':case 'chariot':{const hell=e.type==='chariot';g.fillStyle=c[1];g.beginPath();g.roundRect?.(-15,-8,30,8,3);g.fill();g.fillStyle='#111';for(let k=-12;k<=12;k+=6){g.beginPath();g.arc(k+((time*20|0)%2),-3,2.4,0,7);g.fill();}
    g.fillStyle=c[0];g.fillRect(-13,-16,26,9);g.fillStyle=hell?c[2]:'#3a444e';g.fillRect(-7,-21,14,6);g.save();g.translate(4,-18);g.rotate(Math.max(-.6,Math.min(.3,e.aim||0)));g.fillStyle=c[1];g.fillRect(0,-1.6,16,3.2);if(e.muzzle>0){g.fillStyle='#ffd23a';g.beginPath();g.arc(18,0,3.2,0,7);g.fill();}g.restore();
    if(hell){g.fillStyle='#ff6a1a';for(let k=0;k<3;k++){g.beginPath();g.arc(-13+Math.random()*4,-10-Math.random()*6,1.4,0,7);g.fill();}g.fillStyle='#e8d8b0';g.fillRect(-11,-17,3,2);g.fillRect(8,-17,3,2);}else{g.fillStyle=c[2];g.fillRect(-10,-14,5,2);}break;}
   case 'turret':{g.fillStyle=c[1];g.fillRect(-6,-5,12,5);g.fillStyle=c[0];g.beginPath();g.arc(0,-5,5,Math.PI,0);g.fill();g.save();g.translate(0,-6);g.scale(e.dir||1,1);g.rotate((e.dir<0?-1:1)*Math.atan2(Math.sin(e.aim||0),Math.abs(Math.cos(e.aim||0))));g.fillStyle='#222';g.fillRect(0,-1.2,9,2.4);g.restore();g.fillStyle=c[2];g.fillRect(-1,-8,2,1.5);break;}
   case 'cannon':{g.fillStyle=c[0];g.fillRect(-6,-12,12,12);g.fillStyle=c[1];g.fillRect(-7,-13,14,3);g.fillStyle='#000';g.beginPath();g.arc(6,-7,3,0,7);g.fill();g.fillStyle=c[2];g.fillRect(-2,-9,3,3);break;}
   case 'demon':{const L2=run?Math.sin(ph*1.4)*3:0;g.fillStyle=c[1];g.fillRect(-5+L2,-11,4.5,11);g.fillRect(.5-L2,-11,4.5,11);g.fillStyle=c[0];g.beginPath();g.moveTo(-8,-26);g.lineTo(8,-26);g.lineTo(6,-10);g.lineTo(-6,-10);g.fill();g.fillStyle=c[0];g.beginPath();g.arc(1,-29,5,0,7);g.fill();
    g.fillStyle='#e8d8b0';g.beginPath();g.moveTo(-3,-32);g.lineTo(-7,-38);g.lineTo(-1,-33);g.fill();g.beginPath();g.moveTo(4,-32);g.lineTo(8,-38);g.lineTo(3,-33);g.fill();g.fillStyle=c[2];g.fillRect(2,-30,3,1.5);g.fillStyle=c[0];g.fillRect(6,-24,4,10);g.fillStyle='#222';g.fillRect(9,-15,3,3);if(e.charge>0){g.fillStyle='rgba(255,80,20,.5)';g.beginPath();g.arc(-8,-16,5,0,7);g.fill();}break;}
   case 'skeleton':legs(c[0]);g.fillStyle=c[0];for(let k=0;k<4;k++)g.fillRect(-4,-18+k*2.4,8,1.2);g.fillRect(-.6,-19,1.2,11);g.beginPath();g.arc(.5,-22,4,0,7);g.fill();g.fillStyle='#111';g.fillRect(0,-23,1.6,1.6);g.fillRect(2.4,-23,1.6,1.6);g.fillRect(.5,-20,3,.8);g.fillStyle=c[0];g.fillRect(1,-15,5,1.4);break;
   case 'cultist':legs('#1a0a0a');g.fillStyle=c[0];g.beginPath();g.moveTo(-5,-1);g.lineTo(-4,-18);g.lineTo(4,-18);g.lineTo(5,-1);g.fill();g.fillStyle=c[1];g.beginPath();g.moveTo(-4,-17);g.lineTo(0,-27);g.lineTo(4,-17);g.fill();g.fillStyle=c[2];g.fillRect(0,-21,3,1.2);g.fillStyle='#e8c040';g.fillRect(2,-15,7,1.6);if(e.muzzle>0){g.fillStyle='#ffb02a';g.beginPath();g.arc(10,-14,2.4,0,7);g.fill();}break;
   case 'shade':g.globalAlpha=.85;g.fillStyle=c[0];g.beginPath();g.moveTo(-5,0);for(let k=0;k<5;k++)g.lineTo(-5+k*2.5,-2+(k%2)*2+Math.sin(time*8+k));g.lineTo(5,0);g.lineTo(4,-18);g.quadraticCurveTo(0,-26,-4,-18);g.fill();g.fillStyle=c[2];g.fillRect(0,-19,1.5,1.5);g.fillRect(2.5,-19,1.5,1.5);
    if(e.wind>0){g.strokeStyle=c[2];g.lineWidth=1;g.beginPath();g.arc(6,-12,8,-1,1);g.stroke();}g.globalAlpha=1;break;
   case 'tentacle':case 'chomper':{if(e.hidden){g.restore();g.filter='none';return;}const pipe=e.type==='chomper',k=Math.min(1,(1.6-Math.max(0,e.popT))*4);g.translate(0,0);
    if(pipe){const h=16*k;g.fillStyle=c[0];g.fillRect(-1,-h,2,h);g.fillStyle=c[1];g.beginPath();const open=Math.abs(Math.sin(time*8))*1.2;g.ellipse(0,-h-4,5,4,0,-open*.4,Math.PI+open*.4,true);g.fill();g.fillStyle='#fff';for(let q=-3;q<4;q+=2)g.fillRect(q,-h-4,1,1);g.fillStyle=c[2];g.beginPath();g.arc(-2,-h-6,.9,0,7);g.arc(2,-h-6,.9,0,7);g.fill();}
    else{const h=24*k,sw=e.whip>0?(e.dir||1)*(1-e.whip/.35)*20:Math.sin(time*3)*4;g.strokeStyle=c[0];g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(sw*.3,-h*.6,sw,-h);g.stroke();g.strokeStyle=c[1];g.lineWidth=3;g.stroke();g.lineCap='butt';g.fillStyle=c[2];for(let q=0;q<4;q++){g.beginPath();g.arc(sw*q/4*.6,-h*q/4,.8,0,7);g.fill();}}
    break;}
   case 'shroom':{const sq=e.shellT!=null?.5:1;g.fillStyle=c[1];g.fillRect(-4,-6*sq,8,6*sq);g.fillStyle=c[0];g.beginPath();g.ellipse(0,-7*sq,7,5*sq,0,Math.PI,0);g.fill();g.fillStyle='#000';g.fillRect(-2,-5*sq,1.4,2);g.fillRect(1.5,-5*sq,1.4,2);g.fillStyle='#3a1a0a';g.fillRect(-5+L*.4,-1.5,4,1.5);g.fillRect(1-L*.4,-1.5,4,1.5);break;}
   case 'shelly':{if(e.shellT!=null){g.fillStyle=c[0];g.beginPath();g.ellipse(0,-4,6,4,0,Math.PI,0);g.fill();g.fillStyle=c[2];g.fillRect(-6,-1,12,1.5);g.strokeStyle='#1a6a1a';g.lineWidth=.8;g.beginPath();g.moveTo(-3,-6);g.lineTo(3,-2);g.moveTo(3,-6);g.lineTo(-3,-2);g.stroke();break;}
    legs(c[1],-5,5);g.fillStyle=c[0];g.beginPath();g.ellipse(-1,-9,5,6,0,0,7);g.fill();g.fillStyle=c[1];g.beginPath();g.arc(4,-14,3,0,7);g.fill();g.fillStyle='#000';g.fillRect(5,-15,1,1.5);break;}
   case 'plumber':{legs(c[1]);g.fillStyle=c[1];g.fillRect(-4,-14,8,7);g.fillStyle=c[0];g.fillRect(-4,-18,8,5);g.fillStyle=c[2];g.beginPath();g.arc(1,-21,3.6,0,7);g.fill();g.fillStyle=c[0];g.fillRect(-3,-25,7,2.6);g.fillRect(2,-23,4,1.2);g.fillStyle='#3a1a0a';g.fillRect(1,-20,4,1.4);g.fillStyle='#fff';g.fillRect(-1,-23.6,2,1.2);break;}
   case 'hog':{const ball=e.state==='attack';g.translate(0,-6);if(ball){g.rotate(time*20*(e.dir||1));g.fillStyle=c[0];g.beginPath();g.arc(0,0,5.5,0,7);g.fill();g.fillStyle='#1a3aa8';for(let k=0;k<5;k++){g.save();g.rotate(k*1.25);g.fillRect(3,-1,3,2);g.restore();}}
    else{g.fillStyle=c[0];g.beginPath();g.ellipse(0,0,5,5.5,0,0,7);g.fill();for(let k=0;k<3;k++){g.beginPath();g.moveTo(-3,-4+k*3);g.lineTo(-9,-5+k*3);g.lineTo(-3,-2+k*3);g.fill();}g.fillStyle=c[1];g.beginPath();g.ellipse(3,1,2.6,2.4,0,0,7);g.fill();g.fillStyle='#fff';g.fillRect(2,-3,2.4,2.6);g.fillStyle='#000';g.fillRect(3.4,-2.4,1,1.6);g.fillStyle='#d82a1a';g.fillRect(-4+L*.4,4,4,2);g.fillRect(1-L*.4,4,4,2);}break;}
   case 'pixel':{for(let k=0;k<14;k++){g.fillStyle=c[k%3];const gx=((k*7)%5)-2.5,gy=-3-Math.floor(k/5)*5-((k*3)%5);g.fillRect(gx*2+(Math.random()<.1?3:0),gy,3,3);}g.fillStyle='#fff';g.fillRect(1,-15,2,2);break;}
   default:legs('#333');g.fillStyle=c?c[0]:'#888';g.fillRect(-4,-18,8,10);
  }
  g.restore();g.filter='none';if(e.muzzle>0)e.muzzle-=1/60;bubble(g,e,time);
 }
 function bubble(g,e,time){if(!e.bubble)return;const y=e.y-e.h-12+Math.sin(time*12)*.8;g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.roundRect?.(e.x-4,y-6,8,9,2);g.fill();g.stroke();g.fillStyle=e.bubble.ch==='!'?'#d00':'#c90';g.font='bold 8px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(e.bubble.ch,e.x,y-1.3);}
 function drawCorpse(g,cp){const d=FOES2[cp.kind];if(!d)return false;g.save();g.translate(cp.x,cp.y-3);g.rotate(cp.rot);g.globalAlpha=Math.min(1,cp.t);g.fillStyle=d.col[0];g.fillRect(-4,-4,8,6);g.fillStyle=d.col[1];g.fillRect(-2,-6,4,3);g.restore();return true;}
 // ------------------------------------------------------------ bosses
 function makeBoss(B,kind){const d=BOSSES[kind];Object.assign(B,{kind,hp:d.hp,max:d.hp,w:d.w,h:d.h,hw:d.hw,hh:d.hh,fly:!!d.fly,att:null,cd:1});if(d.fly)B.y-=d.hoverH;return B;}
 function pickAttack(B,d){const tot=d.attacks.reduce((a,b)=>a+b[1],0);let r=rnd()*tot;for(const [a,w] of d.attacks){r-=w;if(r<=0)return a;}return d.attacks[0][0];}
 function updateBoss(B,dt){
  const d=BOSSES[B.kind],W=C.W,P=C.P,A=W.arena;B.flash=Math.max(0,B.flash-dt);B.anim+=dt;
  if(!B.alive){B.dead-=dt;return;}
  const contact=()=>{const hx=B.hw||18,hh=B.hh||56;if(!P.dead&&!P.out&&!P.boarded&&P.inv<=0&&Math.abs(P.x-B.x)<hx+P.w-2&&P.y>B.y-hh&&P.y-P.h<B.y)C.hurtPlayer(B.att==='charge'||B.att==='spin'||B.att==='dive'?2:1,B.x);};
  if(C.net&&!C.host){if(B.tx!=null){B.x+=(B.tx-B.x)*Math.min(1,dt*12);B.y+=(B.ty-B.y)*Math.min(1,dt*12);}B.att=B.state;if(B.state!=='wait')contact();return;}
  if(B.state==='wait'){if(P.x>A.x0+3*T&&!P.dead||C.net&&C.upBro(C.R)&&C.partnerHere()&&C.R.x>A.x0+3*T){B.state='intro';B.t=1.6;C.bossWakes(B);}return;}
  const tg=C.foeTarget(B),dx=tg.x-B.x,dy=(tg.y-14)-(B.y-B.h*.5);if(B.state==='intro'||B.state==='idle')B.t-=dt;if(!B.att||B.att==='idle')B.dir=Math.sign(dx)||B.dir;
  const rage=B.hp<B.max*.45?1.35:1,ground=W.S.surfAt(Math.floor(B.x/T))*T;
  const shoot=(kind,a,sp,ox=0,oy=0,extra)=>enemyShot(kind,B.x+B.dir*(B.hw||18)*.6+ox,B.y-B.h*.6+oy,Math.cos(a)*sp,Math.sin(a)*sp,extra);
  if(B.state==='intro'){if(B.t<=0){B.state='idle';B.t=1;}}
  else if(B.state==='idle'){B.att='idle';
   if(B.fly){const tx=tg.x-B.dir*40,ty=Math.min(ground,tg.y)-d.hoverH;B.x+=(tx-B.x)*Math.min(1,dt*1.4);B.y+=(ty-B.y)*Math.min(1,dt*1.6);B.vx=0;}
   else B.vx=Math.abs(dx)>40?B.dir*d.speed*rage:0;
   if(B.t<=0){const a=pickAttack(B,d);B.state=a;B.att=a;B.t=0;B.k=0;B.vx=0;B.cd=0;if(a==='summon'&&W.foes.filter(e=>e.alive&&e.summoned).length>=5){B.state='volley';B.att='volley';}}}
  else{B.t+=dt;const t=B.t,end=()=>{B.state='idle';B.att='idle';B.t=(1.1+rnd()*.7)/rage;};
   switch(B.state){
    case 'volley':{const n=Math.round(5*rage);if(t>.4&&B.k<n&&t>.4+B.k*.14){B.k++;const base=Math.atan2(dy,dx),spread=(B.k-n/2)*.12;shoot(d.shot,base+spread,d.shot==='fireE'?190:220,0,0,d.shot==='acid'?{}:null);C.sfx.enemy();}if(t>.6+n*.14)end();break;}
    case 'ring':{if(t>.5&&!B.k){B.k=1;const n=Math.round(10*rage);for(let k=0;k<n;k++){const a=k/n*Math.PI*2+B.anim;shoot(d.shot==='acid'?'orb':d.shot==='fireE'?'fire':d.shot,a,150,-B.dir*(B.hw||18)*.6,B.h*.1);}C.snd(400,.3,{type:'sine',vol:.05,to:1200});}if(t>1.2)end();break;}
    case 'missiles':{const n=Math.round(3*rage);if(t>.3&&B.k<n&&t>.3+B.k*.3){B.k++;shoot('missile',-Math.PI/2-B.dir*.5,160,0,-B.h*.3,{homing:1.6,life:4});C.snd(200,.3,{type:'sawtooth',vol:.04,to:600});}if(t>.5+n*.3)end();break;}
    case 'leap':{if(!B.jumped){B.vy=B.fly?0:-440;B.vx=Math.max(-210,Math.min(210,dx*1.1));B.jumped=true;B.grounded=false;}
     if(B.jumped&&B.grounded&&t>.2){B.jumped=false;C.fx.shake(12);C.sfx.boom(true);for(const s of [-1,1]){W.waves.push({x:B.x+s*(B.hw||18),y:B.y,dir:s,t:1.6});if(C.net)C.outbox.fw.push([Math.round(B.x+s*18),Math.round(B.y),s]);}B.vx=0;end();}
     if(t>3){B.jumped=false;end();}break;}
    case 'charge':case 'spin':{if(t<.6){B.vx=0;B.wind=1;}else{B.wind=0;B.vx=B.dir*(B.state==='spin'?260:240)*rage;if(B.hitWall){B.hitWall=0;if(B.state==='spin'&&(B.k++)<2){B.dir*=-1;}else{C.fx.shake(10);C.sfx.boom(false);end();}}if(t>3.2)end();}break;}
    case 'summon':{if(t>.6&&!B.k){B.k=1;const types=d.summon||['mook'];for(let k=0;k<2;k++){const x=Math.max(A.x0+2*T,Math.min(A.x1-2*T,B.x+(k?1:-1)*70));const e=C.makeFoe({type:types[k%types.length],x,y:ground-2},900+W.foes.length);e.summoned=true;e.active=true;e.state='attack';e.t=.6;e.hx=x;e.hy=ground-40;W.foes.push(e);C.fx.burst(x,ground-14,{n:14,colors:[d.col[2],'#fff'],speed:120,life:.5,size:2});}C.snd(150,.5,{type:'sawtooth',vol:.04,to:60});}if(t>1.4)end();break;}
    case 'rain':{if(!B.k){B.k=1;const n=Math.round(6*rage);for(let k=0;k<n;k++){const x=A.x0+2*T+rnd()*(A.x1-A.x0-4*T),y=W.S.surfAt(Math.floor(x/T))*T;zone({x0:x-7,x1:x+7,y0:y-40,y1:y,warn:.8+k*.12,on:.25,kind:'mark',dmg:0});setTimeout(()=>{if(C.W===W)enemyShot(B.kind==='shellking'?'hammer':B.kind==='bonedragon'?'bone':'drop',x,y-C.viewW()*.6,0,260,{life:3,dmg:1});},Math.round((.35+k*.12)*1000));}}
     if(t>1.8)end();break;}
    case 'beam':{if(!B.k){B.k=1;const y=Math.min(ground,tg.y)-8;zone({x0:A.x0,x1:A.x1,y0:y-7,y1:y+5,warn:.9,on:.55,kind:'beam',dmg:2,col:d.col[3]});C.snd(80,1.4,{type:'sawtooth',vol:.04,to:1600});}if(t>1.7)end();break;}
    case 'slam':{if(!B.k){B.k=1;const n=Math.round(3*rage);for(let k=0;k<n;k++){const x=k?A.x0+2*T+rnd()*(A.x1-A.x0-4*T):tg.x,y=W.S.surfAt(Math.floor(x/T))*T;zone({x0:x-8,x1:x+8,y0:y-56,y1:y,warn:.7+k*.15,on:.5,kind:['flower','shadow','queen'].includes(B.kind)?'tentacle':'pillar',dmg:1});}}if(t>1.6)end();break;}
    case 'drop':{const tx=tg.x;B.x+=(tx-B.x)*Math.min(1,dt*2);if(t>.4&&B.k<Math.round(4*rage)&&t>.4+B.k*.35){B.k++;enemyShot('bomb',B.x,B.y+4,(rnd()-.5)*40,40,{life:3,dmg:2});}if(t>2.2)end();break;}
    case 'dive':{if(t<.5){B.vy=0;}else if(!B.k){B.k=1;B.dv={x:(tg.x-B.x)/0.7,y:(tg.y-10-B.y)/0.7};}else if(t<1.2){B.x+=B.dv.x*dt;B.y+=B.dv.y*dt;}else if(t<2){B.y-=140*dt;}else end();B.vx=0;break;}
    case 'teleport':{if(t<.35)B.fade=t/.35;else if(!B.k){B.k=1;const nx=tg.x<(A.x0+A.x1)/2?A.x1-4*T:A.x0+4*T;B.x=nx;if(B.fly)B.y=ground-d.hoverH;C.fx.burst(B.x,B.y-B.h/2,{n:20,colors:[d.col[2],'#fff'],speed:150,life:.5,size:2});}else if(t<.7)B.fade=1-(t-.35)/.35;else{B.fade=0;end();}break;}
    default:end();
   }}
  if(!B.fly||B.state==='leap'){const res=C.moveBody(B,dt,{grav:900,maxFall:600});if(res.wall)B.hitWall=1;}else{B.x+=(B.vx||0)*dt;if(B.x<=A.x0+2*T||B.x>=A.x1-2*T)B.hitWall=1;}
  B.x=Math.max(A.x0+2*T,Math.min(A.x1-2*T,B.x));
  if(!B.fade||B.fade<.5)contact();
 }
 // ------------------------------------------------------------ boss drawing
 function drawBoss(g,B,time){
  if(!B.alive&&B.dead<=0)return;const d=BOSSES[B.kind],c=d.col;g.save();g.translate(B.x,B.y);
  if(B.fade)g.globalAlpha=1-B.fade;
  if(!B.alive){g.globalAlpha=Math.max(0,B.dead/3);g.translate((Math.random()-.5)*3,0);}
  if(BS.drawBoss(g,B,time)){g.restore();return;}
  g.scale(B.dir||1,1);if(B.flash>0)g.filter='brightness(2.6)';
  const br=Math.sin(B.anim*3),walk=Math.abs(B.vx||0)>5?Math.sin(B.anim*8)*4:0,wind=B.att==='charge'&&B.t<.6;
  switch(B.kind){
   case 'warmech':{g.fillStyle=c[1];g.fillRect(-12+walk,-22,8,22);g.fillRect(4-walk,-22,8,22);g.fillStyle='#111';g.fillRect(-14+walk,-4,12,4);g.fillRect(2-walk,-4,12,4);
    g.fillStyle=c[0];g.beginPath();g.roundRect?.(-18,-48,36,26,4);g.fill();g.fillStyle=c[2];g.fillRect(-16,-46,8,4);g.fillStyle='#9fd0e8';g.fillRect(4,-44,10,8);g.fillStyle=c[1];g.fillRect(14,-38,14,5);g.fillRect(14,-30,14,5);
    g.fillStyle='#444';g.fillRect(-20,-56,14,8);for(let k=0;k<3;k++){g.fillStyle='#c22';g.fillRect(-19+k*4,-55,3,2);}if(B.att==='missiles'){g.fillStyle='#ffd23a';g.beginPath();g.arc(-13,-58,3+Math.random()*2,0,7);g.fill();}break;}
   case 'saucer':{const tilt=Math.sin(time*2)*.06;g.rotate(tilt);g.fillStyle='#9fd0e8';g.globalAlpha=(g.globalAlpha||1)*.9;g.beginPath();g.ellipse(0,-14,10,8,0,Math.PI,0);g.fill();g.globalAlpha=B.fade?1-B.fade:1;g.fillStyle='#6aff8a';g.beginPath();g.arc(0,-15,4,0,7);g.fill();g.fillStyle='#000';g.fillRect(-2,-16,1.4,2);g.fillRect(1,-16,1.4,2);
    g.fillStyle=c[0];g.beginPath();g.ellipse(0,-8,30,7,0,0,7);g.fill();g.fillStyle=c[1];g.beginPath();g.ellipse(0,-6,30,4,0,0,Math.PI);g.fill();for(let k=0;k<8;k++){g.fillStyle=(time*8+k|0)%2?c[2]:c[3];g.beginPath();g.arc(-24+k*7,-7,1.6,0,7);g.fill();}
    if(B.att==='drop'){g.fillStyle='rgba(120,255,150,.15)';g.beginPath();g.moveTo(-10,-4);g.lineTo(10,-4);g.lineTo(22,60);g.lineTo(-22,60);g.fill();}break;}
   case 'queen':{g.fillStyle=c[0];g.fillRect(-10+walk,-18,6,18);g.fillRect(4-walk,-18,6,18);g.beginPath();g.ellipse(-8,-30,18,12,-.2,0,7);g.fill();g.strokeStyle=c[0];g.lineWidth=4;g.beginPath();g.moveTo(-22,-28);g.quadraticCurveTo(-40,-14+br*4,-34,-46);g.stroke();
    g.fillStyle=c[1];g.beginPath();g.moveTo(4,-38);g.lineTo(26,-60);g.lineTo(34,-52);g.lineTo(12,-30);g.fill();g.fillStyle=c[0];g.beginPath();g.ellipse(20,-50,16,7,-.7,0,7);g.fill();g.fillStyle=c[3];g.fillRect(28,-52,6,2);g.fillStyle=c[2];g.fillRect(22,-56,2,2);
    g.fillStyle=c[0];g.fillRect(4,-34,4,14);g.fillRect(10,-30,4,12);if(wind){g.fillStyle='rgba(160,255,96,.4)';g.beginPath();g.arc(30,-50,6,0,7);g.fill();}break;}
   case 'cerberus':{g.fillStyle=c[0];g.beginPath();g.ellipse(-2,-22,20,11,0,0,7);g.fill();g.fillRect(-18+walk,-14,5,14);g.fillRect(-8-walk,-14,5,14);g.fillRect(6+walk,-14,5,14);g.fillRect(14-walk,-14,5,14);
    for(let k=0;k<3;k++){const hx=10+k*5,hy=-34-Math.abs(k-1)*-6+Math.sin(time*3+k)*2-(k===1?6:0);g.fillStyle=c[1];g.beginPath();g.ellipse(hx,hy,7,6,0,0,7);g.fill();g.fillStyle=c[0];g.fillRect(hx+3,hy-1,7,4);g.fillStyle=c[2];g.fillRect(hx+1,hy-3,2,2);g.fillStyle='#e8d8b0';g.fillRect(hx+6,hy+2,1,2);g.fillRect(hx+8,hy+2,1,2);
     if(B.att==='volley'){g.fillStyle='#ff6a1a';g.beginPath();g.arc(hx+12,hy+1,2+Math.random()*2,0,7);g.fill();}}
    g.strokeStyle=c[0];g.lineWidth=3;g.beginPath();g.moveTo(-20,-24);g.quadraticCurveTo(-32,-34+br*3,-28,-44);g.stroke();break;}
   case 'bonedragon':{const fl=Math.sin(time*6)*10;g.fillStyle=c[0];for(const s of [-1,1]){g.save();g.scale(1,s===1?1:1);g.beginPath();g.moveTo(-4,-14);g.lineTo(-28,-30-fl);g.lineTo(-20,-16);g.lineTo(-30,-12-fl*.5);g.lineTo(-6,-8);g.fill();g.restore();}
    g.fillStyle=c[1];g.beginPath();g.ellipse(0,-12,14,6,0,0,7);g.fill();g.fillStyle=c[0];for(let k=0;k<5;k++)g.fillRect(-10+k*5,-16,1.5,8);g.beginPath();g.ellipse(18,-16,8,5,.2,0,7);g.fill();g.fillStyle='#111';g.fillRect(20,-18,2,2);g.fillStyle=c[2];g.fillRect(24,-14,4,2);
    g.strokeStyle=c[0];g.lineWidth=2;g.beginPath();g.moveTo(-14,-12);g.quadraticCurveTo(-28,-4,-34,-14+br*4);g.stroke();break;}
   case 'beast':{g.fillStyle=c[1];g.fillRect(-14+walk,-24,11,24);g.fillRect(3-walk,-24,11,24);g.fillStyle=c[0];g.beginPath();g.moveTo(-22,-64);g.lineTo(22,-64);g.lineTo(14,-22);g.lineTo(-14,-22);g.fill();
    g.fillStyle=c[1];g.fillRect(-28,-62,8,26);g.fillRect(20,-62,8,22);g.fillStyle=c[0];g.beginPath();g.arc(2,-72,12,0,7);g.fill();g.fillStyle='#e8d8b0';for(const s of [-1,1]){g.beginPath();g.moveTo(2+s*6,-80);g.quadraticCurveTo(2+s*22,-90,2+s*16,-104);g.quadraticCurveTo(2+s*14,-90,2+s*3,-82);g.fill();}
    g.fillStyle=c[2];g.shadowColor=c[3];g.shadowBlur=8;g.fillRect(-4,-75,5,3);g.fillRect(4,-75,5,3);g.shadowBlur=0;g.fillStyle='#200';g.fillRect(-4,-66,12,3);
    g.fillStyle='rgba(255,90,20,.25)';g.beginPath();g.arc(0,-40,40+br*3,0,7);g.fill();break;}
   case 'flower':{g.fillStyle=c[0];g.fillRect(-9+walk,-20,6,20);g.fillRect(3-walk,-20,6,20);g.beginPath();g.ellipse(0,-28,9,12,0,0,7);g.fill();g.fillRect(-2,-46,4,14);
    const open=B.att==='charge'||B.att==='slam'?1:.4+Math.abs(br)*.2;g.save();g.translate(2,-48);for(let k=0;k<5;k++){g.rotate(Math.PI*2/5);g.fillStyle=c[1];g.beginPath();g.ellipse(0,-8*open-4,4,9*open+3,0,0,7);g.fill();}g.fillStyle=c[3];g.beginPath();g.arc(0,0,5*open+2,0,7);g.fill();g.fillStyle=c[2];for(let k=0;k<8;k++){g.save();g.rotate(k*.78);g.fillRect(3*open+1,-.6,3,1.2);g.restore();}g.restore();break;}
   case 'voideye':{const pul=1+Math.sin(time*4)*.04;g.scale(pul,pul);g.fillStyle='rgba(200,74,255,.25)';g.beginPath();g.arc(0,-12,26,0,7);g.fill();g.fillStyle=c[0];g.beginPath();g.arc(0,-12,18,0,7);g.fill();
    const lk=Math.max(-1,Math.min(1,(C.P?(C.P.x-B.x)*(B.dir||1):0)/80));g.fillStyle=c[1];g.beginPath();g.arc(6*lk,-12,8,0,7);g.fill();g.fillStyle=c[2];g.beginPath();g.ellipse(7*lk,-12,3,6,0,0,7);g.fill();g.strokeStyle='#a0204a';g.lineWidth=1;for(let k=0;k<7;k++){g.beginPath();g.moveTo(-16,-12+k*3-9);g.quadraticCurveTo(-26,-8+k*4+Math.sin(time*4+k)*4,-34,-4+k*5);g.stroke();}
    if(B.att==='beam'){g.fillStyle='#fff';g.beginPath();g.arc(7*lk,-12,3,0,7);g.fill();}break;}
   case 'shadow':{g.fillStyle='rgba(10,4,20,.92)';g.beginPath();g.moveTo(-28,0);for(let k=0;k<8;k++)g.lineTo(-28+k*8,-4-Math.abs(Math.sin(time*3+k))*6);g.lineTo(28,0);g.lineTo(18,-60);g.quadraticCurveTo(0,-84,-18,-60);g.fill();
    for(let k=0;k<4;k++){g.strokeStyle='rgba(30,10,50,.9)';g.lineWidth=4;g.beginPath();g.moveTo(-14+k*9,-40);g.quadraticCurveTo(-30+k*20,-60+Math.sin(time*2+k)*10,-36+k*24,-88+Math.cos(time*2+k)*8);g.stroke();}
    g.fillStyle=c[2];g.shadowColor=c[2];g.shadowBlur=10;g.fillRect(-6,-64,4,4);g.fillRect(4,-64,4,4);g.fillStyle=c[3];g.fillRect(-8,-54,18,2);g.shadowBlur=0;break;}
   case 'shellking':{const spin=B.att==='spin'&&B.t>.6;if(spin){g.translate(0,-18);g.rotate(time*18);g.fillStyle=c[0];g.beginPath();g.arc(0,0,18,0,7);g.fill();g.fillStyle='#fff';for(let k=0;k<6;k++){g.save();g.rotate(k);g.beginPath();g.moveTo(14,-3);g.lineTo(22,0);g.lineTo(14,3);g.fill();g.restore();}break;}
    g.fillStyle=c[1];g.fillRect(-10+walk,-16,7,16);g.fillRect(3-walk,-16,7,16);g.fillStyle=c[0];g.beginPath();g.ellipse(-6,-28,16,14,0,0,7);g.fill();g.fillStyle='#fff';for(let k=0;k<5;k++){g.beginPath();g.moveTo(-18+k*6,-38);g.lineTo(-15+k*6,-46);g.lineTo(-12+k*6,-38);g.fill();}
    g.fillStyle=c[1];g.beginPath();g.ellipse(10,-36,9,10,0,0,7);g.fill();g.fillStyle=c[2];g.beginPath();g.ellipse(12,-46,8,4,0,Math.PI,0);g.fill();g.fillStyle='#000';g.fillRect(12,-40,2,2);g.fillStyle='#fff';g.fillRect(14,-32,4,2);
    g.fillStyle='#ffd23a';g.beginPath();g.moveTo(4,-48);g.lineTo(6,-56);g.lineTo(9,-50);g.lineTo(12,-57);g.lineTo(14,-49);g.lineTo(18,-55);g.lineTo(18,-46);g.lineTo(4,-46);g.fill();
    if(B.att==='volley'){g.fillStyle='#ff6a1a';g.beginPath();g.arc(22,-34,3+Math.random()*2,0,7);g.fill();}break;}
   case 'eggbot':{g.fillStyle=c[1];g.beginPath();g.ellipse(0,-6,22,8,0,0,Math.PI);g.fill();g.fillStyle='#9fd0e8';g.globalAlpha*=.8;g.beginPath();g.ellipse(0,-10,16,12,0,Math.PI,0);g.fill();g.globalAlpha=B.fade?1-B.fade:1;
    g.fillStyle=c[2];g.beginPath();g.arc(2,-16,6,0,7);g.fill();g.fillStyle=c[3];g.fillRect(-1,-14,12,2.5);g.fillStyle='#000';g.fillRect(3,-19,2,2);g.fillStyle=c[0];g.fillRect(-4,-23,10,4);
    g.fillStyle='#ffb02a';g.beginPath();g.moveTo(-6,2);g.lineTo(6,2);g.lineTo(0,10+Math.random()*4);g.fill();
    const sw=Math.sin(time*2.4)*1.1;g.strokeStyle='#888';g.lineWidth=1.2;g.beginPath();g.moveTo(0,0);g.lineTo(Math.sin(sw)*28,Math.cos(sw)*28);g.stroke();g.fillStyle='#3a3a3a';g.beginPath();g.arc(Math.sin(sw)*28,Math.cos(sw)*28,6,0,7);g.fill();break;}
   case 'glitch':{const P2=C.P;for(let k=0;k<40;k++){const gx=((k*37)%11-5)*4+(Math.random()<.15?(Math.random()-.5)*16:0),gy=-4-Math.floor(k/6)*7-((k*13)%7);g.fillStyle=c[(k+(time*6|0))%3];g.fillRect(gx,gy,5+(k%3),5);}
    if(P2){try{const img=C.headCanvas(P2.bro,'angry');g.save();g.globalAlpha*=.85;g.translate(0,-38);g.scale(1+Math.sin(time*13)*.08,1);g.drawImage(img,-14,-14,28,28);g.globalCompositeOperation='difference';g.fillStyle=c[1];g.fillRect(-14,-4+Math.sin(time*9)*10,28,3);g.restore();}catch{}}
    g.fillStyle='#fff';g.font='bold 6px monospace';g.textAlign='center';if((time*3|0)%2)g.fillText('ERR 0x'+(B.hp|0).toString(16).toUpperCase(),0,-62);break;}
  }
  g.restore();g.filter='none';
 }
 // ------------------------------------------------------------ chopper look per world
 // the new worlds' chopper bodies (called inside the heli's own transform; the game draws the ladder)
 function drawVehicle(g,H,time){const th=C.theme.decor,st=C.W&&C.theme.stagePal?.[C.stageIdx??0]?.decor||th;
  if(th==='space'){g.fillStyle='#c8d0dc';g.beginPath();g.moveTo(-26,4);g.lineTo(30,4);g.lineTo(40,-4);g.lineTo(20,-12);g.lineTo(-22,-12);g.closePath();g.fill();g.fillStyle='#5af';g.fillRect(14,-9,10,5);g.fillStyle='#ffb02a';for(const x of [-14,10]){g.beginPath();g.moveTo(x-4,4);g.lineTo(x+4,4);g.lineTo(x,12+Math.random()*6);g.fill();}g.fillStyle='#c22';g.fillRect(-20,-10,10,2);return true;}
  if(th==='pixel'){g.fillStyle='#e8e8f0';g.beginPath();g.ellipse(0,-6,28,10,0,0,7);g.fill();g.fillStyle='#d82a1a';g.fillRect(-28,-7,56,2);g.fillStyle='#3a3a3a';g.fillRect(-8,4,16,5);g.fillStyle='#000';g.font='bold 6px monospace';g.textAlign='center';g.fillText('1UP',0,-8);void st;return true;}
  return false;}
 return {FOES2,FOE2_IDS,WEAPONS2,BOSSES,SHOT_KINDS,makeFoe2,updateFoe,drawFoe,drawCorpse,makeBoss,updateBoss,drawBoss,fire,stepShot,drawShot,drawBullet,updateStage,drawStage,bonk,netShot,netZone,drawVehicle,isExtFoe:t=>!!FOES2[t]};
}
Object.assign(exports,{makeExt,FOES2,WEAPONS2,BOSSES,SHOT_KINDS});
