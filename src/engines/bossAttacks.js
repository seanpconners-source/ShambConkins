// BOSS FIGHT attack library. Every attack is a generator function(F,p): `yield seconds` waits (pause aware).
// F is the fight API supplied by bossFight.js (see makeF there):
//   F.W/F.H arena size, F.k tier table {dens,spd,rest,tele}, F.rand(), F.pal, F.boss {x,y,hx,hy,deadR}
//   F.alive() F.target() F.muzzle(name) F.aim(from,to) F.downs(from) (directions 'down' toward the players: [straight down] in
//   portrait, one per living player in the wide arena, where they fly on either side of the boss) F.targets() (one random player in portrait, every
//   living player in the wide arena, where the players are too far apart for one volley to threaten both) F.bullet(o) F.shot(x,y,ang,speed,o) F.minion(o)
//   F.hazard(o) F.warn(o) F.pose(name,sec) F.move(x,y,sec) F.vanish(sec) F.shake(m) F.say(text) F.sfx(n) F.clear()
// Hazard shapes: rect{x,y,w,h} circle{x,y,r} beam{x,y,a,w,len,da,wedge} with tele (warning s), dur (active s),
// vx/vy, tween{x,y,t}, follow (origin tracks the boss), pend{len,amp,period}.
// Telegraph time is never below 0.8 s for anything that can hurt without a visible warning.
const TAU=Math.PI*2,PI=Math.PI;
const K={1:{dens:.8,spd:.92,rest:1.25,tele:1.15},2:{dens:1,spd:1,rest:1,tele:1},3:{dens:1.2,spd:1.08,rest:.85,tele:.95},4:{dens:1.4,spd:1.16,rest:.72,tele:.9}};
const cnt=(F,n)=>Math.max(1,Math.round(n*F.k.dens));
// wide arena: one safe lane/gap per living player, within `reach` lanes of them (portrait callers keep their own pick)
const nearLane=(F,x,lanes,reach)=>clampN(Math.floor(clampN(x,0,F.W-1)/(F.W/lanes))+Math.round((F.rand()*2-1)*reach),0,lanes-1);
// a full-width wall with holes at gxs (each gap wide), as rect hazards sharing the options o
function gapWall(F,y,gxs,gap,o){let x0=0;for(const g of [...gxs].sort((a,b)=>a-b)){const x1=g-gap/2;if(x1-x0>4)F.hazard(Object.assign({shape:'rect',x:(x0+x1)/2,y,w:x1-x0},o));x0=Math.max(x0,g+gap/2);}
 if(F.W-x0>4)F.hazard(Object.assign({shape:'rect',x:(x0+F.W)/2,y,w:F.W-x0},o));}
const tl=(F,t)=>Math.max(.8,t*F.k.tele);
const pk=(F,p,i)=>p.pink>=1?(i>0&&i%Math.round(p.pink)===0):F.rand()<(p.pink||0);
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
const D=(p,d)=>Object.assign({},d,p);
const pinkOpts=(o,pink)=>pink?Object.assign({},o,{pink:true,kind:'orb'}):o;

function* aimed(F,pp){const p=D(pp,{n:3,rounds:3,gap:.45,pause:.5,speed:250,spread:.2,src:'mouth',kind:'orb'});const n=cnt(F,p.n);
 for(let r=0;r<p.rounds;r++){const m=F.muzzle(p.src);F.pose('fire',.25);F.sfx('shot');
  for(const t of F.targets()){const a=F.aim(m,t),pinkIdx=F.rand()<(p.pink||0)?Math.floor(F.rand()*n):-1;
   for(let j=0;j<n;j++)F.shot(m.x,m.y,a+(j-(n-1)/2)*p.spread,p.speed*F.k.spd,pinkOpts({kind:p.kind,col:p.col},j===pinkIdx));}
  yield p.gap;}
 yield p.pause;}
function* fan(F,pp){const p=D(pp,{count:7,arc:1.2,rounds:3,gap:.7,speed:230,sweep:0,src:'mouth',kind:'orb',aim:true});const n=cnt(F,p.count);
 for(let r=0;r<p.rounds;r++){const m=F.muzzle(p.src);F.pose('fire',.3);F.sfx('shot');const off=(r%2?.5:0)*p.arc/(n-1||1)+p.sweep*r;
  for(const base of p.aim?F.targets().map(t=>F.aim(m,t)):F.downs(m)){const pinkIdx=F.rand()<.3?Math.floor(F.rand()*n):-1;
   for(let j=0;j<n;j++)F.shot(m.x,m.y,base+off+(j-(n-1)/2)*p.arc/(n-1||1),p.speed*F.k.spd,pinkOpts({kind:p.kind,col:p.col},j===pinkIdx));}
  yield p.gap;}
 yield .4;}
function* spiral(F,pp){const p=D(pp,{arms:2,dur:4,rate:14,speed:200,turn:2.3,dir:1,src:'mouth',kind:'orb',pink:0});const step=1/(p.rate*F.k.dens),m=F.muzzle(p.src);let a=F.rand()*TAU,i=0;F.pose('fire',p.dur);
 for(let t=0;t<p.dur;t+=step){for(let j=0;j<p.arms;j++){const ang=a+j*TAU/p.arms;F.shot(m.x,m.y,ang,p.speed*F.k.spd,pinkOpts({kind:p.kind,col:p.col},p.pink>=1&&i%Math.round(p.pink*3)===0&&j===0));}
  a+=p.dir*p.turn*step*1.3;i++;yield step;}
 yield .5;}
function* rain(F,pp){const p=D(pp,{dur:4,rate:7,speed:230,kind:'orb',bias:.5});const step=1/(p.rate*F.k.dens);let i=0;
 for(let t=0;t<p.dur;t+=step){const tg=F.target();const x=F.rand()<p.bias?clampN(tg.x+(F.rand()-.5)*160,16,F.W-16):16+F.rand()*(F.W-32);
  F.bullet(Object.assign({x,y:-12,vx:0,vy:p.speed*F.k.spd*(.85+F.rand()*.3),kind:p.kind,col:p.col},i%11===10?{pink:true,kind:'orb'}:{}));i++;yield step;}
 yield .5;}
function* laser(F,pp){const p=D(pp,{count:1,sweep:1.7,arc:1.15,w:26,tele:1.1,src:'eye'});const tele=tl(F,p.tele);let dir=F.rand()<.5?1:-1;
 for(let i=0;i<p.count;i++){const m=F.muzzle(p.src);
  F.pose('windup',tele);F.sfx('charge');
  for(const dn of F.downs(m)){const a0=dn-dir*p.arc/2,a1=dn+dir*p.arc/2;F.hazard({shape:'beam',x:m.x,y:m.y,a:a0,da:(a1-a0)/p.sweep,w:p.w,len:1400,tele,dur:p.sweep,wedge:[Math.min(a0,a1),Math.max(a0,a1)],col:F.pal[2]});}
  yield tele+p.sweep+.3;dir=-dir;}
 yield .4;}
function* dive(F,pp){const p=D(pp,{count:2,tele:.95,deadR:76,shock:true});const tele=tl(F,p.tele),b=F.boss;
 for(let i=0;i<p.count;i++){const t=F.target(),tx=clampN(t.x,70,F.W-70);F.sfx('charge');
  F.warn({shape:'rect',x:tx,y:F.H/2,w:p.deadR*2+14,h:F.H,dur:tele+.3,col:'#ff3b2f',mark:'!'});
  F.pose('windup',tele);F.move(tx,b.hy-40,tele*.85,'inout');yield tele;
  b.deadR=p.deadR;F.pose('dive',.7);F.move(tx,F.H-170,.38,'in');yield .4;F.shake(11);F.sfx('boom');
  if(p.shock){const n=cnt(F,10);for(let j=0;j<n;j++)F.shot(b.x,b.y+40,j/n*TAU,170*F.k.spd,{kind:'orb'});}
  yield .35;b.deadR=0;F.move(b.hx,b.hy,1.1,'inout');yield 1.2;}
 yield .3;}
function* minions(F,pp){const p=D(pp,{n:3,kind:'drone',hp:5,shoot:2.4,gap:.35});if(F.minionCount()>6)return;const n=cnt(F,p.n);const m=F.muzzle('center');
 for(let i=0;i<n;i++){const slotX=F.W*(i+1)/(n+1),slotY=(F.wide?150:250)+((i%2)?0:F.wide?28:36);
  F.minion({x:m.x,y:m.y,r:15,hp:p.hp,kind:p.kind,shootEvery:p.shoot*(.9+F.rand()*.3)+.3,timer:F.rand(),slot:{x:slotX,y:slotY},step:hoverStep});F.sfx('spawn');yield p.gap;}
 yield 2.5;}
function hoverStep(F,m,dt){m.sx=m.sx===undefined?F.rand()*6:m.sx;const s=m.slot;m.x+=(s.x+Math.sin(m.age*1.4+m.sx)*26-m.x)*Math.min(1,dt*3);m.y+=(s.y+Math.sin(m.age*2+m.sx)*10-m.y)*Math.min(1,dt*3);
 m.timer-=dt;if(m.timer<=0&&m.age>.8){m.timer=m.shootEvery;const t=F.nearest(m.x,m.y);if(t)F.shot(m.x,m.y,F.aim(m,t),210*F.k.spd,{kind:'orb'});}}
function homingStep(F,m,dt){const t=F.nearest(m.x,m.y);if(t){const want=Math.atan2(t.y-m.y,t.x-m.x);let d=want-m.ang;d=Math.atan2(Math.sin(d),Math.cos(d));m.ang+=clampN(d,-m.turn*dt,m.turn*dt);}
 m.x+=Math.cos(m.ang)*m.speed*dt;m.y+=Math.sin(m.ang)*m.speed*dt;if(m.age>m.life)m.hp=0,m.expire=true;}
function* homing(F,pp){const p=D(pp,{n:2,hp:3,speed:125,life:6.5,kind:'orb',gap:.7});if(F.minionCount()>7)return;const n=cnt(F,p.n);
 for(let i=0;i<n;i++){const m=F.muzzle('mouth');F.minion({x:m.x,y:m.y,r:13,hp:p.hp,kind:'orb',ang:PI/2+(i%2?.6:-.6),turn:1.5,speed:p.speed*F.k.spd,life:p.life,step:homingStep});F.sfx('spawn');yield p.gap;}
 yield 2;}
function* ring(F,pp){const p=D(pp,{count:12,rings:3,gap:.75,speed:190,twist:.25,src:'center',kind:'orb',pink:0});const n=cnt(F,p.count);let off=F.rand()*TAU;
 for(let r=0;r<p.rings;r++){const m=F.muzzle(p.src);F.pose('fire',.3);F.sfx('shot');
  for(let j=0;j<n;j++)F.shot(m.x,m.y,off+j/n*TAU,p.speed*F.k.spd,pinkOpts({kind:p.kind,col:p.col},p.pink>=1&&j%Math.round(p.pink)===0&&j>0&&r===1));
  off+=p.twist+PI/n;yield p.gap;}
 yield .5;}
function* edge(F,pp){const p=D(pp,{sides:'alt',tele:1.15,dur:2.1,w:64});const tele=tl(F,p.tele);const mk=(side,delay)=>{const x=side<0?p.w/2-2:F.W-p.w/2+2;
  F.hazard({shape:'rect',x,y:F.H/2+60,w:p.w,h:F.H,tele,dur:p.dur,col:F.pal[2],kind:'edge'});};
 F.sfx('charge');
 if(p.sides==='both'){mk(-1);mk(1);yield tele+p.dur+.4;}
 else if(p.sides==='alt'){const s=F.rand()<.5?-1:1;mk(s);yield tele+p.dur*.7;mk(-s);yield tele+p.dur+.3;}
 else{mk(p.sides==='left'?-1:1);yield tele+p.dur+.4;}}
function* gapwall(F,pp){const p=D(pp,{rows:4,gap:132,speed:185,step:1.05,h:22});const gap=p.gap*(F.k.dens>1.3?.92:1),sp=p.speed*F.k.spd,cl=x=>clampN(x,gap/2+10,F.W-gap/2-10);let gxs=(F.wide?F.alive():[F.target()]).map(t=>cl(t.x));
 for(let r=0;r<p.rows;r++){gxs=gxs.map(g=>cl(g+(F.rand()-.5)*260));const y=F.wide?60:F.boss.hy+60,lead=.7;
  for(const gx of gxs)F.warn({shape:'rect',x:gx,y:F.H/2+30,w:gap,h:F.H,dur:lead+(F.H-y)/sp,col:'#5dff9a',mark:'safe',alpha:.14});
  yield lead;F.sfx('wall');
  gapWall(F,y,gxs,gap,{h:p.h,vy:sp,tele:0,dur:(F.H-y)/sp+.5,col:F.pal[2],kind:'wall'});
  if(r%3===1)F.bullet({x:gxs[0],y,vx:0,vy:sp,pink:true,kind:'orb',r:8});
  yield p.step-lead;}
 yield 1.2;}
function* strike(F,pp){const p=D(pp,{n:2,rounds:2,gap:.5,tele:1.0,r:44,puddle:0,col:null});const tele=tl(F,p.tele);const n=cnt(F,p.n);
 for(let r=0;r<p.rounds;r++){F.sfx('charge');const used=[];for(let i=0;i<n;i++){const t=F.target();const x=clampN(t.x+(i?(F.rand()-.5)*130:0),30,F.W-30),y=clampN(t.y+(i?(F.rand()-.5)*100:0),230,F.H-70);used.push([x,y]);
   F.warn({shape:'circle',x,y,r:p.r,dur:tele,col:'#ff3b2f',mark:'!'});}
  yield tele;F.shake(5);F.sfx('boom');
  for(const [x,y] of used){F.hazard({shape:'circle',x,y,r:p.r,tele:0,dur:.35,col:p.col||F.pal[2],kind:'blast'});
   if(p.puddle)F.hazard({shape:'circle',x,y,r:p.r*.8,tele:0,dur:p.puddle,col:p.col||'#43d84c',kind:'puddle'});}
  yield p.gap+.5;}
 yield .4;}
function* wave(F,pp){const p=D(pp,{dur:4,rate:11,speed:220,amp:.85,freq:1.9,kind:'orb',src:'mouth'});const step=1/(p.rate*F.k.dens);let i=0;F.pose('fire',p.dur);
 const dns=F.downs(F.muzzle(p.src));for(let t=0;t<p.dur;t+=step){const m=F.muzzle(p.src);for(const dn of dns)F.shot(m.x,m.y,dn+Math.sin(t*p.freq)*p.amp,p.speed*F.k.spd,i%12===11?{pink:true,kind:'orb'}:{kind:p.kind,col:p.col});i++;yield step;}
 yield .6;}
function* lob(F,pp){const p=D(pp,{n:4,rounds:3,gap:.7,ay:420,src:'mouth',kind:'big',spin:true});const n=cnt(F,p.n);
 for(let r=0;r<p.rounds;r++){F.pose('fire',.3);F.sfx('shot');const m=F.muzzle(p.src);
  for(let i=0;i<n;i++){const t=F.alive().length?F.alive()[i%F.alive().length]:F.target();const tx=clampN(t.x+(F.rand()-.5)*120,20,F.W-20),ty=clampN(t.y,280,F.H-40);
   const vy0=-230-F.rand()*60,T=(-vy0+Math.sqrt(vy0*vy0+2*p.ay*Math.max(40,ty-m.y)))/p.ay;
   F.bullet({x:m.x,y:m.y,vx:(tx-m.x)/T,vy:vy0,ay:p.ay,kind:p.kind,col:p.col,spin:p.spin,r:9});}
  yield p.gap;}
 yield .6;}
function* bounce(F,pp){const p=D(pp,{n:3,speed:230,bounces:3,kind:'big',gap:.45});const n=cnt(F,p.n);
 for(let i=0;i<n;i++){const m=F.muzzle('mouth');F.pose('fire',.25);F.sfx('shot');const dns=F.downs(m),a=dns[i%dns.length]+(i%2?1:-1)*(.35+F.rand()*.5);
  F.bullet({x:m.x,y:m.y,vx:Math.cos(a)*p.speed*F.k.spd,vy:Math.sin(a)*p.speed*F.k.spd,bounce:p.bounces,kind:p.kind,col:p.col,r:11,spin:true,life:9,pink:i===n-1&&F.rand()<.4});yield p.gap;}
 yield 1.3;}

// ---------------------------------------------------------------- signature moves
function* doors(F,pp){const p=D(pp,{gap:150,n:3});const tele=tl(F,1.1);F.say('Pod bay doors closing.');
 for(let i=0;i<p.n;i++){const t=F.target(),gx=clampN(t.x+(F.rand()-.5)*80,p.gap/2+16,F.W-p.gap/2-16),y=F.H/2+80,h=F.H-100;
  F.warn({shape:'rect',x:gx,y:F.H/2+40,w:p.gap,h:F.H,dur:tele+.2,col:'#5dff9a',mark:'safe',alpha:.14});F.sfx('charge');
  const lw=gx-p.gap/2,rw=F.W-gx-p.gap/2;
  F.hazard({shape:'rect',x:lw/2,y,w:lw,h,tele,dur:1.3,tween:{x:lw/2,y,t:.15,fromX:-lw},col:F.pal[2],kind:'door'});
  F.hazard({shape:'rect',x:F.W-rw/2,y,w:rw,h,tele,dur:1.3,tween:{x:F.W-rw/2,y,t:.15,fromX:F.W+rw},col:F.pal[2],kind:'door'});
  yield tele+1.6;}
 yield .3;}
function* rinka(F,pp){const p=D(pp,{n:4,gap:.55});if(F.minionCount()>7)return;const n=cnt(F,p.n);F.say('Rinka!');
 for(let i=0;i<n;i++){const left=i%2===0;F.minion({x:left?-10:F.W+10,y:260+F.rand()*180,r:14,hp:2,kind:'rinka',ang:left?0:PI,turn:1.1,speed:115*F.k.spd,life:7,step:homingStep});F.sfx('spawn');yield p.gap;}
 yield 2;}
function* wilybomb(F,pp){const p=D(pp,{n:3,gap:.5});const n=cnt(F,p.n);F.say('Wily Bomb!');
 for(let i=0;i<n;i++){const m=F.muzzle('mouth'),t=F.alive()[i%Math.max(1,F.alive().length)]||F.target();const tx=clampN(t.x+(F.rand()-.5)*80,30,F.W-30),ty=clampN(t.y-40,260,F.H-160);F.pose('fire',.25);
  F.bullet({x:m.x,y:m.y,vx:0,vy:0,kind:'bomb',r:13,life:6,tx,ty,step:bombStep});F.sfx('shot');yield p.gap;}
 yield 1.8;}
function bombStep(F,b,dt){if(b.age<.7){b.x+=(b.tx-b.x)*Math.min(1,dt*3.2);b.y+=(b.ty-b.y)*Math.min(1,dt*3.2);}
 if(b.age>1.7){b.dead=true;F.sfx('boom');const n=cnt(F,10);for(let j=0;j<n;j++)F.shot(b.x,b.y,j/n*TAU+.3,190*F.k.spd,{kind:'orb'});}}
function* riddle(F,pp){const p=D(pp,{lanes:3,rounds:3});const lanes=F.wide?Math.max(p.lanes,Math.round(F.W/140)):p.lanes,tele=tl(F,1.2),w=F.W/lanes;F.say('Riddle me this!');
 for(let r=0;r<p.rounds;r++){const safes=F.wide?F.alive().map(t=>nearLane(F,t.x,lanes,1)):[Math.floor(F.rand()*lanes)];F.sfx('charge');
  for(let i=0;i<lanes;i++){if(safes.includes(i))F.warn({shape:'rect',x:w*(i+.5),y:F.H/2+40,w:w-6,h:F.H,dur:tele+.2,col:'#5dff9a',mark:'safe',alpha:.14});
   else{F.warn({shape:'rect',x:w*(i+.5),y:F.H/2+40,w:w-6,h:F.H,dur:tele,col:'#ff3b2f',mark:'?'});
    F.hazard({shape:'rect',x:w*(i+.5),y:F.H/2+40,w:w-6,h:F.H,tele,dur:.9,col:F.pal[2],kind:'column'});}}
  yield tele+1.2;}
 yield .3;}
function* bullettime(F,pp){const p=D(pp,{rings:2,count:14});const n=cnt(F,p.count),rings=p.rings||p.n||2;F.say('Bullet time.');
 for(let r=0;r<rings;r++){const m=F.muzzle('center');F.pose('fire',.4);F.sfx('shot');
  for(let j=0;j<n;j++)F.bullet({x:m.x,y:m.y,vx:Math.cos(j/n*TAU)*200,vy:Math.sin(j/n*TAU)*200,kind:'needle',r:6,life:8,step:freezeStep,pink:j===0&&r===1});
  yield .9;}
 yield 2.2;}
function freezeStep(F,b,dt){if(b.age<.45){}else if(b.age<1.4){b.vx*=Math.pow(.02,dt);b.vy*=Math.pow(.02,dt);b.rot=undefined;}
 else if(!b.fired){b.fired=true;const t=F.nearest(b.x,b.y);const a=t?F.aim(b,t):PI/2;const sp=300*F.k.spd;b.vx=Math.cos(a)*sp;b.vy=Math.sin(a)*sp;}}
function* stab(F,pp){const p=D(pp,{n:3,gap:.55});const tele=tl(F,1),n=cnt(F,p.n)>p.n?p.n:p.n;F.say('...');
 for(let i=0;i<n;i++){const m=F.muzzle(i%2?'r':'l'),t=F.target();const a=F.aim(m,t);F.pose('windup',tele);F.sfx('charge');
  F.hazard({shape:'beam',x:m.x,y:m.y,a,w:18,len:1000,tele,dur:.3,col:'#e8f1ff',kind:'stab'});yield p.gap+.45;}
 yield tele+.3;}
function* shockwave(F,pp){const p=D(pp,{rows:2,gap:145,speed:250});const sp=p.speed*F.k.spd,gap=p.gap;const tele=tl(F,.9);F.say('Shockwave!');
 for(let r=0;r<p.rows;r++){const gxs=F.targets().map(t=>clampN(t.x+(F.rand()-.5)*160,gap/2+10,F.W-gap/2-10)),y=F.wide?60:F.boss.hy+70;F.pose('windup',tele);F.sfx('charge');
  for(const gx of gxs)F.warn({shape:'rect',x:gx,y:F.H/2+40,w:gap,h:F.H,dur:tele+(F.H-y)/sp,col:'#5dff9a',mark:'safe',alpha:.14});
  yield tele;F.shake(8);F.sfx('boom');
  gapWall(F,y,gxs,gap,{h:26,vy:sp,tele:0,dur:(F.H-y)/sp+.4,col:F.pal[2],kind:'wave'});
  yield 1.1;}
 yield 1;}
function glideDown(F,m,dt){m.y+=m.vy*dt;m.x+=(m.vx||0)*dt;}
function* glove(F,pp){const p=D(pp,{n:2});const tele=tl(F,1);F.say('I must break you.');
 for(let i=0;i<p.n;i++){const t=F.target(),x=clampN(t.x,50,F.W-50);F.warn({shape:'rect',x,y:F.H/2+40,w:84,h:F.H,dur:tele+.1,col:'#ff3b2f',mark:'!'});F.pose('windup',tele);F.sfx('charge');
  const m=F.muzzle('mouth');yield tele;F.pose('fire',.4);F.sfx('boom');F.minion({x,y:F.boss.hy+60,r:34,hp:26,kind:'glove',vy:560*F.k.spd,vx:0,step:glideDown,keep:true,age0:0});yield 1.7;}
 yield .5;}
function* puddles(F,pp){const p=D(pp,{n:3});F.say('Venom!');
 yield* strike(F,{n:Math.max(2,Math.min(4,p.n-1)),rounds:2,puddle:4.5,col:'#43d84c',r:44,tele:1});}
function* piledriver(F,pp){const p=D(pp,{n:2});const tele=tl(F,1),b=F.boss;F.say('SPINNING PILEDRIVER!');
 for(let i=0;i<p.n;i++){const t=F.target(),tx=clampN(t.x,80,F.W-80);F.warn({shape:'rect',x:tx,y:F.H/2,w:166,h:F.H,dur:tele+.3,col:'#ff3b2f',mark:'!'});F.pose('spin',tele+1.2);F.sfx('charge');
  F.move(tx,b.hy-50,tele*.85,'inout');yield tele;b.deadR=78;F.move(tx,F.H-180,.4,'in');yield .45;F.shake(12);F.sfx('boom');
  const sp=Math.PI*(F.rand()<.5?1:-1)*.33;F.hazard({shape:'beam',x:tx,y:F.H-180,a:F.rand()*TAU,da:sp*3,w:22,len:300,tele:.8,dur:1.5,col:F.pal[2],wedge:null,kind:'arm'});
  F.hazard({shape:'beam',x:tx,y:F.H-180,a:F.rand()*TAU,da:sp*3,w:22,len:300,tele:.8,dur:1.5,col:F.pal[2],kind:'arm'});
  yield .5;b.deadR=0;yield .9;F.move(b.hx,b.hy,1.1,'inout');yield 1.3;}
 yield .3;}
function* iceshards(F,pp){const p=D(pp,{n:4});const tele=tl(F,1),n=cnt(F,p.n);F.say('Chill.');
 for(let wv=0;wv<2;wv++){const xs=[];const t=F.target();xs.push(clampN(t.x,34,F.W-34));
  for(let i=1;i<Math.ceil(n/2)+1;i++){const x=clampN(34+F.rand()*(F.W-68),34,F.W-34);if(xs.every(v=>Math.abs(v-x)>78))xs.push(x);}
  F.sfx('charge');for(const x of xs){F.warn({shape:'rect',x,y:F.H/2+120,w:58,h:F.H-200,dur:tele,col:'#9fe8ff',mark:'!'});}
  yield tele;F.shake(6);F.sfx('boom');
  for(const x of xs){F.hazard({shape:'rect',x,y:F.H/2+120,w:56,h:F.H-200,tele:0,dur:.55,col:'#bff3ff',kind:'ice'});
   for(const d of [-1,1])F.shot(x,F.H-90,-PI/2+d*.7,200*F.k.spd,{kind:'ice'});}
  yield 1.2;}
 yield .4;}
function* slam(F,pp){const p=D(pp,{n:2});const tele=tl(F,1.2),b=F.boss;F.say('*SLAM*');
 for(let i=0;i<p.n;i++){const t=F.target(),x=clampN(t.x,70,F.W-70);F.warn({shape:'rect',x,y:F.H/2+60,w:132,h:F.H,dur:tele+.1,col:'#ff3b2f',mark:'!'});F.pose('windup',tele);F.sfx('charge');
  F.move(x,b.hy-30,tele*.8,'inout');yield tele;F.hazard({shape:'rect',x,y:F.H/2+60,w:130,h:F.H,tele:0,dur:.35,col:F.pal[2],kind:'blast'});F.shake(14);F.sfx('boom');
  const n=cnt(F,8);for(let j=0;j<n;j++){const a=(j%2?0:PI)+(j%4<2?.08:-.08)*(j>>1);F.shot(x,F.H-130,a,200*F.k.spd,{kind:'big'});}
  yield .5;F.move(b.hx,b.hy,1,'inout');yield 1.4;}
 yield .2;}
function* lockon(F,pp){const p=D(pp,{n:3});const tele=1.5,b=F.boss;F.say('*click click click*');
 for(let r=0;r<p.n;r++){const live=F.alive();if(!live.length)return;const marks=live.map((t,i)=>F.warn({shape:'circle',x:t.x,y:t.y,r:34,dur:tele+.2,col:'#ff2b2b',mark:'lock',follow:t,freeze:tele-.45}));F.pose('windup',tele);F.sfx('charge');
  yield tele;const m=F.muzzle('l');F.pose('fire',.4);F.sfx('shot');
  for(const mk of marks)for(let j=0;j<3;j++){const a=F.aim(m,mk);F.shot(m.x,m.y,a,520*F.k.spd,{kind:'bolt'});}
  yield .9;}
 yield .4;}
function* ladle(F,pp){const p=D(pp,{n:2});F.say('NO SOUP FOR YOU!');yield* laser(F,{count:p.n,sweep:2.1,w:34,arc:1.2,src:'mouth'});yield* lob(F,{n:4,rounds:2});}
function* shock(F,pp){const p=D(pp,{n:2});F.say('Time for treatment.');
 F.hazard({shape:'rect',x:32,y:F.H/2+60,w:64,h:F.H,tele:tl(F,1.2),dur:3.4,col:F.pal[2],kind:'edge'});F.hazard({shape:'rect',x:F.W-32,y:F.H/2+60,w:64,h:F.H,tele:tl(F,1.2),dur:3.4,col:F.pal[2],kind:'edge'});
 yield 1.4;yield* shockwave(F,{rows:Math.max(2,p.n-1),gap:150,speed:230});}
function* plates(F,pp){const p=D(pp,{n:5});const n=cnt(F,p.n),m0=F.muzzle('center');F.say('Hem hem.');F.pose('fire',1);
 const list=[];for(let i=0;i<n;i++){const b=F.bullet({x:m0.x,y:m0.y,vx:0,vy:0,kind:'plate',r:10,life:9,orbit:{i,n},step:orbitStep,spin:true});list.push(b);}
 yield 1.5+n*.22;yield 1;}
function orbitStep(F,b,dt){const m=F.muzzle('center'),o=b.orbit;if(b.age<1.5){const a=b.age*2.6+o.i/o.n*TAU,r=Math.min(115,b.age*160);b.x=m.x+Math.cos(a)*r;b.y=m.y+Math.sin(a)*r;b.vx=b.vy=0;}
 else if(!b.fired&&b.age>1.5+o.i*.22){b.fired=true;const t=F.nearest(b.x,b.y);const a=t?F.aim(b,t):PI/2;b.vx=Math.cos(a)*290*F.k.spd;b.vy=Math.sin(a)*290*F.k.spd;F.sfx('shot');}
 else if(!b.fired){const a=b.age*2.6+o.i/o.n*TAU;b.x=m.x+Math.cos(a)*115;b.y=m.y+Math.sin(a)*115;}}
function* hounds(F,pp){const p=D(pp,{n:4});if(F.minionCount()>7)return;const n=cnt(F,p.n),tele=tl(F,1);F.say('Release the hounds!');
 for(let i=0;i<n;i++){const t=F.alive()[i%Math.max(1,F.alive().length)]||F.target(),x=clampN(t.x+(i>1?(F.rand()-.5)*160:0),30,F.W-30);F.warn({shape:'rect',x,y:F.H/2,w:44,h:F.H,dur:tele,col:'#ff3b2f',mark:'!'});
  yield tele*.55;F.minion({x,y:-30,r:18,hp:4,kind:'hound',vy:0,wait:tele*.45,dash:430*F.k.spd,step:houndStep,keep:true});yield .5;}
 yield 2;}
function houndStep(F,m,dt){if(m.age<m.wait)return;m.y+=m.dash*dt;if(m.y>F.H+40)m.hp=0,m.expire=true;}
function* volley(F,pp){const p=D(pp,{n:3});const tele=tl(F,1),n=Math.ceil(p.n/2)+1;F.say('Fire!');
 for(let r=0;r<n;r++){const m=F.muzzle('mouth');F.pose('windup',tele);F.sfx('charge');
  for(const t of F.alive())for(const d of [-.28,0,.28])F.hazard({shape:'beam',x:m.x,y:m.y,a:F.aim(m,t)+d,w:13,len:1000,tele,dur:.14,col:'#ffe08a',kind:'stab'});
  yield tele+.7;}
 yield .3;}
function* sidedash(F,pp){const p=D(pp,{n:3});const tele=tl(F,1.1),b=F.boss;F.say('Outta my way, McFly!');let dir=F.rand()<.5?1:-1;
 for(let i=0;i<p.n;i++){const t=F.target(),y=clampN(t.y,330,F.H-110);F.warn({shape:'rect',x:F.W/2,y,w:F.W,h:176,dur:tele+.2,col:'#ff3b2f',mark:'!'});F.sfx('charge');F.pose('windup',tele);
  F.move(dir<0?F.W+200:-200,y,.45,'inout');yield .6;b.deadR=80;yield tele-.6>0?tele-.6:.01;F.pose('dive',.6);F.move(dir<0?-220:F.W+220,y,.5,'in');yield .55;b.deadR=0;dir=-dir;yield .3;}
 F.move(b.hx,b.hy,.9,'inout');yield 1.4;}
function* greatknife(F,pp){const p=D(pp,{n:2});F.say('*scrrrrape*');yield* laser(F,{count:p.n,sweep:2.5,w:46,arc:1.25,tele:1.25,src:'mouth'});yield* ring(F,{count:12,rings:2,speed:170});}
function* rocket(F,pp){const p=D(pp,{n:1});if(F.minionCount()>6)return;F.say('S.T.A.R.S....');
 for(let i=0;i<p.n;i++){const m=F.muzzle('r');F.pose('fire',.4);F.sfx('shot');
  F.minion({x:m.x,y:m.y,r:19,hp:9,kind:'rocket',ang:PI/2,turn:1.3,speed:175*F.k.spd,life:5.5,step:homingStep,onDie:(F2,mm)=>{const n=cnt(F2,12);for(let j=0;j<n;j++)F2.shot(mm.x,mm.y,j/n*TAU,190*F2.k.spd,{kind:'fire'});}});yield 1.2;}
 yield 2.2;}
function* balloons(F,pp){const p=D(pp,{n:4});if(F.minionCount()>6)return;const n=cnt(F,p.n);F.say('They float!');
 for(let i=0;i<n;i++){const m=F.muzzle('mouth');F.minion({x:m.x+(i-(n-1)/2)*20,y:m.y,r:21,hp:3,kind:'balloon',vy:75,sway:F.rand()*6,step:balloonStep,onDie:balloonPop});F.sfx('spawn');yield .45;}
 yield 2.5;}
function balloonStep(F,m,dt){m.y+=(m.vy*(m.age<.6?2.2:1))*dt;m.x+=Math.sin(m.age*1.8+m.sway)*38*dt;if(m.age>7||m.y>F.H-60){m.hp=0;m.expire=false;}}
function balloonPop(F,m){const n=cnt(F,7);for(let j=0;j<n;j++)F.shot(m.x,m.y,j/n*TAU+m.age,150*F.k.spd,j===0?{pink:true,kind:'orb'}:{kind:'balloon'});}
function* batswarm(F,pp){const p=D(pp,{n:5});if(F.minionCount()>9)return;const n=cnt(F,p.n);F.say('Children of the night!');
 for(let w=0;w<2;w++){const x0=40+F.rand()*(F.W-80);for(let i=0;i<n;i++){F.minion({x:x0,y:F.boss.hy+40,r:12,hp:1,kind:'bat',bx:x0,sway:i*.5,vy:150*F.k.spd,delay:i*.18,step:batStep,keep:true});}
  yield n*.2+.8;}
 yield 1.5;}
function batStep(F,m,dt){if(m.age<m.delay){m.hidden=true;return;}m.hidden=false;const a=m.age-m.delay;m.y+=m.vy*dt;m.x=m.bx+Math.sin(a*3+m.sway)*95;if(m.y>F.H+30){m.hp=0;m.expire=true;}}
function* spiderheads(F,pp){const p=D(pp,{n:3});if(F.minionCount()>6)return;const n=cnt(F,p.n);F.say('*skittering*');
 for(let i=0;i<n;i++){const m=F.muzzle('center');F.minion({x:m.x,y:m.y+30,r:18,hp:5,kind:'head',speed:70*F.k.spd,step:headStep,onDie:(F2,mm)=>{for(let j=0;j<7;j++)F2.shot(mm.x,mm.y,j/7*TAU,150*F2.k.spd,{kind:'orb'});}});F.sfx('spawn');yield .7;}
 yield 2.5;}
function headStep(F,m,dt){const t=F.nearest(m.x,m.y);if(!t)return;const a=Math.atan2(t.y-m.y,t.x-m.x);m.x+=Math.cos(a)*m.speed*dt*(m.age<.8?3:1);m.y+=Math.sin(a)*m.speed*dt*(m.age<.8?3:1);m.timer=(m.timer||2)-dt;
 if(m.timer<=0){m.timer=2.4;F.shot(m.x,m.y,a,200*F.k.spd,{kind:'orb'});}}
function* tentaclegrid(F,pp){const p=D(pp,{n:2});const tele=tl(F,1.3);F.say('Ph’nglui mglw’nafh...');
 for(let r=0;r<Math.max(2,p.n);r++){const rows=4,y0=300,sp=84,safe=Math.floor(F.rand()*rows);F.sfx('charge');
  for(let i=0;i<rows;i++){const y=y0+i*sp;if(i===safe)F.warn({shape:'rect',x:F.W/2,y,w:F.W,h:sp-18,dur:tele+.2,col:'#5dff9a',mark:'safe',alpha:.14});
   else{const left=(i+r)%2===0;F.warn({shape:'rect',x:F.W/2,y,w:F.W,h:sp-22,dur:tele,col:'#ff3b2f',mark:'!'});
    F.hazard({shape:'rect',x:F.W/2,y,w:F.W,h:sp-24,tele,dur:.8,tween:{x:F.W/2,y,t:.2,fromX:left?-F.W:F.W*2},col:F.pal[2],kind:'tentacle'});}}
  yield tele+1.3;}
 yield .3;}
function* flamebreath(F,pp){const p=D(pp,{n:2});const tele=tl(F,.95);F.say('GWAHAHA!');let dir=F.rand()<.5?1:-1;
 for(let s=0;s<p.n;s++){const m=F.muzzle('mouth');F.pose('windup',tele);F.sfx('charge');
  const dns=F.downs(m);for(const dn of dns)F.warn({shape:'wedge',x:m.x,y:m.y,a0:dn-.95,a1:dn+.95,len:520,dur:tele,col:'#ff7a1a'});yield tele;
  const dur=1.7,step=.075/F.k.dens;F.pose('fire',dur);let i=0;
  for(let t=0;t<dur;t+=step){const mm=F.muzzle('mouth'),f=(t/dur)*2-1;for(const dn of dns)F.shot(mm.x,mm.y,dn+dir*f*.95,300*F.k.spd,i%10===9?{pink:true,kind:'orb'}:{kind:'fire'});i++;yield step;}
  dir=-dir;yield .6;}
 yield .4;}
function* gumdrops(F,pp){const p=D(pp,{n:4});const n=cnt(F,p.n);F.say('Gumdrop Mountain!');
 for(let i=0;i<n;i++){const m=F.muzzle('mouth');F.pose('fire',.3);F.sfx('shot');const dns=F.downs(m),a=dns[i%dns.length]+(i%2?1:-1)*(.3+F.rand()*.6);
  F.bullet({x:m.x,y:m.y,vx:Math.cos(a)*215*F.k.spd,vy:Math.sin(a)*215*F.k.spd,bounce:3,kind:'candy',col:['#ff4d8d','#4dd2ff','#ffd23c','#6cff6a'][i%4],r:13,spin:true,life:10,pink:i===n-1});yield .55;}
 yield 2;}
function* jailbars(F,pp){const p=D(pp,{n:3});const tele=tl(F,1.1);F.say('Go directly to jail!');
 for(let r=0;r<p.n;r++){const gaps=F.rand()<.5?1:2,gapW=118;const gx=[clampN(F.target().x,gapW/2+12,F.W-gapW/2-12)];if(gaps>1)gx.push(clampN(F.W-gx[0]+(F.rand()-.5)*40,gapW/2+12,F.W-gapW/2-12));
  const bars=[];for(let x=18;x<F.W-10;x+=36)if(gx.every(g=>Math.abs(x-g)>gapW/2+8))bars.push(x);F.sfx('charge');
  for(const x of bars){F.warn({shape:'rect',x,y:F.H/2+40,w:20,h:F.H,dur:tele,col:'#ff3b2f'});F.hazard({shape:'rect',x,y:F.H/2+40,w:20,h:F.H,tele,dur:1,tween:{x,y:F.H/2+40,t:.18,fromY:-F.H},col:'#d8d8d8',kind:'bar'});}
  for(const g of gx)F.warn({shape:'rect',x:g,y:F.H/2+40,w:gapW,h:F.H,dur:tele+.2,col:'#5dff9a',mark:'safe',alpha:.14});
  yield tele+1.5;}
 yield .3;}
function* hypno(F,pp){const p=D(pp,{n:3});const rings=Math.max(2,p.n);F.say('Look into my eyes...');
 for(let r=0;r<rings;r++){const live=F.alive();let cx=F.W/2,cy=430;if(live.length){cx=0;cy=0;for(const t of live){cx+=t.x;cy+=t.y;}cx/=live.length;cy/=live.length;}cy=clampN(cy,300,F.H-110);
  const R=Math.max(F.W,F.H)*.6,gapA=F.rand()*TAU,n=cnt(F,40);F.sfx('charge');
  for(let j=0;j<n;j++){const a=j/n*TAU;let d=Math.atan2(Math.sin(a-gapA),Math.cos(a-gapA));if(Math.abs(d)<.5)continue;
   F.bullet({x:cx+Math.cos(a)*R,y:cy+Math.sin(a)*R,vx:-Math.cos(a)*(R/2.6)*F.k.spd,vy:-Math.sin(a)*(R/2.6)*F.k.spd,kind:'orb',r:7,col:'#ffd23c',life:6,keep:true,pink:j%13===5});}
  F.warn({shape:'circle',x:cx+Math.cos(gapA)*60,y:cy+Math.sin(gapA)*60,r:34,dur:1.8,col:'#5dff9a',mark:'safe',alpha:.2});
  yield 1.9;}
 yield .8;}
function* flail(F,pp){const p=D(pp,{n:2});const tele=tl(F,.9),b=F.boss;F.say('*FLAILS*');
 for(let i=0;i<p.n;i++){const arms=3,base=F.rand()*TAU;F.pose('spin',tele+2.4);F.sfx('charge');
  for(let a=0;a<arms;a++)F.hazard({shape:'beam',x:b.x,y:b.y,a:base+a*TAU/arms,da:1.0*(i%2?-1:1),w:24,len:260,tele,dur:2.4,follow:true,col:F.pal[2],kind:'arm'});
  yield tele;F.move(F.rand()<.5?F.W*.28:F.W*.72,b.hy+30,1.1,'inout');yield 1.2;F.move(b.hx,b.hy,1.1,'inout');yield 1.3;}
 yield .4;}
function* passage(F,pp){const p=D(pp,{n:3});const tele=tl(F,.95),b=F.boss;F.say('A secret passage...');
 for(let i=0;i<p.n;i++){const tx=i%2?F.W*.22:F.W*.78,ty=b.hy+(i%3)*14;F.warn({shape:'circle',x:tx,y:ty,r:60,dur:tele,col:'#c58cff',mark:'!'});F.sfx('charge');F.vanish(tele*.6);yield tele*.6;
  F.move(tx,ty,.01,'inout');yield tele*.4;F.sfx('boom');
  const m=F.muzzle('mouth'),a=F.aim(m,F.target()),n=cnt(F,7);for(let j=0;j<n;j++)F.shot(m.x,m.y,a+(j-(n-1)/2)*.2,240*F.k.spd,{kind:'weapon',pink:j===(n>>1)&&i%2===1});
  yield 1;}
 F.move(b.hx,b.hy,.8,'inout');yield 1.1;}
function* energyball(F,pp){const p=D(pp,{n:1});F.say('Reflect it!');
 for(let i=0;i<p.n;i++){const m=F.muzzle('mouth'),t=F.target();F.pose('fire',.5);F.sfx('shot');
  F.bullet({x:m.x,y:m.y,vx:Math.cos(F.aim(m,t))*185*F.k.spd,vy:Math.sin(F.aim(m,t))*185*F.k.spd,kind:'big',pink:true,reflect:true,r:20,life:6});yield 3;}
 yield .4;}
function* wrecking(F,pp){const p=D(pp,{n:1});const tele=tl(F,1),b=F.boss;F.say('Ho ho ho!');
 for(let i=0;i<Math.max(1,p.n);i++){F.pose('windup',tele);F.sfx('charge');F.hazard({shape:'circle',x:b.x,y:b.y,r:38,tele,dur:4.6,follow:true,pend:{len:(300+i*70)*(F.wide?1.3:1),amp:(i%2?.95:1.05)+(F.wide?.15:0),period:2.6+i*.4,phase:i*1.6},col:F.pal[2],kind:'ball'});yield .6;}
 yield tele+4.8;}

// Blofeld's piranha-pool trapdoors: the floor is split into panels, all but one or two drop open.
function* trapdoor(F,pp){const p=D(pp,{n:3});const tele=tl(F,1.25);F.say('Allow me to show you the piranhas.');
 const wd=F.wide,cols=wd?Math.round(F.W/140):3,rows=wd?3:2,y0=wd?90:250,y1=F.H-50,tw=F.W/cols,th=(y1-y0)/rows,cell=t=>Math.min(cols-1,Math.floor(clampN(t.x,0,F.W-1)/tw))+cols*Math.min(rows-1,Math.floor(clampN(t.y-y0,0,y1-y0-1)/th));
 for(let r=0;r<p.n;r++){let safes;
  if(wd){safes=F.alive().map(t=>{const c0=cell(t),r0=Math.floor(c0/cols);let c;do{c=nearLane(F,t.x,cols,1)+cols*clampN(r0+Math.round(F.rand()*2-1),0,rows-1);}while(c===c0);return c;});while(safes.length<Math.round(cols*rows/5))safes.push(Math.floor(F.rand()*cols*rows));}
  else{const t=F.target(),near=cell(t);let safe=Math.floor(F.rand()*cols*rows);if(safe===near)safe=(safe+1+Math.floor(F.rand()*(cols*rows-1)))%(cols*rows);safes=[safe];if(r%2&&F.k.dens<1.3)safes.push((safe+3)%(cols*rows));}
  F.sfx('charge');F.pose('fire',.4);
  for(let i=0;i<cols*rows;i++){const x=(i%cols+.5)*tw,y=y0+(Math.floor(i/cols)+.5)*th;
   if(wd&&Math.abs(x-F.boss.x)<tw/2+60&&y<F.boss.hy+150)continue;
   if(safes.includes(i))F.warn({shape:'rect',x,y,w:tw-8,h:th-8,dur:tele+.3,col:'#5dff9a',mark:'safe',alpha:.16});
   else F.hazard({shape:'rect',x,y,w:tw-6,h:th-6,tele,dur:1.1,col:'#1b6f8a',kind:'trapdoor'});}
  yield tele;F.shake(6);F.sfx('boom');yield 1.6;}
 yield .4;}

// Mecha-Streisand's Triangle of Zinthar: three beams 120 degrees apart spin out of the chest, leaving wedges to hide in.
function* zinthar(F,pp){const p=D(pp,{n:1});const tele=tl(F,1.3);F.say('Behold the Triangle of Zinthar!');
 for(let r=0;r<p.n;r++){const m=F.muzzle('center'),dir=r%2?-1:1,a0=F.rand()*TAU,spin=dir*(.55+.1*F.k.spd),dur=2.6;
  F.pose('windup',tele);F.sfx('charge');
  for(let j=0;j<3;j++)F.hazard({shape:'beam',x:m.x,y:m.y,a:a0+j*TAU/3,da:spin,w:24,len:1400,tele,dur,col:F.pal[2]});
  yield tele+dur+.35;}
 yield .4;}

// Death's sickles: spinning blades fan out of the robe, slow down, then turn and home in.
function* sickles(F,pp){const p=D(pp,{n:4,hp:2,speed:115,life:6});if(F.minionCount()>8)return;const n=cnt(F,p.n);F.say('Your soul is mine!');F.sfx('charge');F.pose('windup',.6);yield .6;
 for(let i=0;i<n;i++){const m=F.muzzle('center'),ang=PI/2+(i-(n-1)/2)*.55;F.minion({x:m.x,y:m.y,r:13,hp:p.hp,kind:'sickle',ang,turn:0,speed:p.speed*1.7*F.k.spd,base:p.speed*F.k.spd,life:p.life,step:sickleStep});}
 F.sfx('spawn');F.pose('fire',.4);yield 2.8;}
function sickleStep(F,m,dt){if(m.age<.7)m.speed=Math.max(20,m.speed-dt*m.speed*2.4);else{m.turn=1.6;m.speed=Math.min(m.base,m.speed+dt*120);}homingStep(F,m,dt);}

const PATTERNS={aimed,fan,spiral,rain,laser,dive,minions,homing,ring,edge,gapwall,strike,wave,lob,bounce,
 doors,rinka,wilybomb,riddle,bullettime,stab,shockwave,glove,puddles,piledriver,iceshards,slam,lockon,ladle,shock,plates,hounds,volley,sidedash,greatknife,rocket,balloons,batswarm,spiderheads,tentaclegrid,flamebreath,gumdrops,jailbars,hypno,flail,passage,energyball,wrecking,trapdoor,zinthar,sickles};
const SIGNATURES={doors:'POD BAY DOORS',rinka:'RINKA SWARM',wilybomb:'WILY BOMB',riddle:'RIDDLE ME THIS',bullettime:'BULLET TIME',stab:'LIQUID BLADE',shockwave:'SHOCKWAVE',glove:'IRON GLOVE',puddles:'VENOM PUDDLES',piledriver:'SPINNING PILEDRIVER',iceshards:'ICE ERUPTION',slam:'MOUNTAIN SLAM',lockon:'PLASMA LOCK-ON',ladle:'SOUP LADLE',shock:'SHOCK THERAPY',plates:'KITTEN PLATES',hounds:'RELEASE THE HOUNDS',volley:'ROYAL VOLLEY',sidedash:'HOVERBOARD RUSH',greatknife:'GREAT KNIFE',rocket:'ROCKET LAUNCHER',balloons:'FLOATING BALLOONS',batswarm:'BAT SWARM',spiderheads:'SPIDER HEADS',tentaclegrid:'TENTACLE GRID',flamebreath:'FLAME BREATH',gumdrops:'GUMDROP BOUNCE',jailbars:'GO TO JAIL',hypno:'HYPNO RINGS',flail:'SPIN FLAIL',passage:'SECRET PASSAGE',energyball:'REFLECT THE ORB',wrecking:'WRECKING BALL',trapdoor:'PIRANHA TRAPDOORS',zinthar:'TRIANGLE OF ZINTHAR',sickles:'DEATH’S SICKLES'};
Object.assign(exports,{PATTERNS,SIGNATURES,K,TAU});
