// Sonic the Hedgehog · Green Hill Zone. Two-player platformer played in turns on the full screen: P1 runs the
// seeded act first, then P2 runs the same act with P1's recorded ghost alongside (own rings, badniks and monitors).
// Movement uses the Mega Drive physics constants (px/frame at 60 fps, fixed timestep), with loops, springs,
// spin dash, rolling, ring scatter on hits, lampposts and the end-of-act signpost. The runner is Sonic's body
// wearing the player's head. Modes: 'rings' (most rings held after 60 s) and 'race' (first to the signpost).
const {clamp}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,rr,FONT,PCOL,Countdown,settle,reduced}=require("src/engines/arenaKit.js");

const STEP=1/60;
const P={acc:.046875,dec:.5,frc:.046875,top:6,air:.09375,grv:.21875,jump:6.5,slp:.125,slpUp:.078125,slpDown:.3125,rollFrc:.0234375,rollDec:.125,maxFall:16};
const RING_TIME=60,RACE_CAP=150;
const HUD_YEL='#ffe23a',HUD_FONT='italic 900 %spx "Arial Black",Impact,system-ui,sans-serif';
const SKY=['#1458d8','#3c86f0','#8cc8ff'];
const MON_TYPES=['rings','rings','shield','shoes','star'];

// ------------------------------------------------------------------ level generation (seeded, shared by both players)
function buildLevel(rand,mode){
 const L={segs:[],loops:[],plats:[],springs:[],spikes:[],rings:[],enemies:[],monitors:[],lamps:[],decor:[],gaps:[],bridges:[],start:140,end:0,maxX:0};
 let x=0,y=0;
 const R=(a,b)=>a+rand()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1));
 const seg=(x0,x1,f,kind='ground')=>L.segs.push({x0,x1,f,kind});
 const flat=len=>{const y0=y;seg(x,x+len,()=>y0);x+=len;};
 const slope=(len,dy)=>{const x0=x,y0=y;seg(x0,x0+len,X=>y0+dy*(1-Math.cos(Math.PI*(X-x0)/len))/2);x+=len;y+=dy;};
 const hills=(len,amp,n)=>{const x0=x,y0=y;seg(x0,x0+len,X=>y0-amp*(1-Math.cos(2*Math.PI*n*(X-x0)/len))/2);x+=len;};
 const ringLine=(x0,n,gap=26,lift=28)=>{for(let k=0;k<n;k++)L.rings.push({x:x0+k*gap,lift});};
 const ringAt=(rx,ry)=>L.rings.push({x:rx,y:ry});
 const steer=()=>y>140?-1:y<-140?1:rand()<.5?-1:1;
 const lamp=()=>{flat(70);L.lamps.push({x:x-35});flat(110);};
 const chunks={
  run(){const len=RI(560,820),amp=R(22,58)*(rand()<.3?-1:1),n=RI(1,2),x0=x;hills(len,amp,n);ringLine(x0+60,RI(5,8));ringLine(x0+len*.55,RI(4,6));
   if(rand()<.6)L.enemies.push({type:'moto',x:x0+len*R(.35,.75),range:R(70,130)});if(rand()<.35)L.monitors.push({x:x0+len*R(.2,.8),type:MON_TYPES[RI(0,4)]});},
  loop(){const drop=R(90,130),x0=x;slope(300,drop);ringLine(x0+40,7,34,30);flat(150);const R0=84,cx=x+40,cy=y-R0;L.loops.push({cx,cy,R:R0,y});
   for(let k=1;k<12;k++){const a=k/12*Math.PI*2;ringAt(cx+(R0-24)*Math.sin(a),cy+(R0-24)*Math.cos(a));}flat(300);ringLine(x-220,6);},
  pit(){const x0=x,y0=y,h=R(38,50),len=170;seg(x0,x0+len,X=>y0-h*((X-x0)/len)**2);x+=len;const gap=RI(96,128);L.gaps.push({x0:x,x1:x+gap,base:y0+40});
   for(let k=0;k<6;k++){const t=(k+.5)/6;ringAt(x+gap*t,y0-h-40-Math.sin(t*Math.PI)*60);}x+=gap;y=y0+R(-6,18);flat(240);ringLine(x-200,5);},
  bridge(){flat(70);const x0=x,y0=y,len=RI(300,420),sag=9;seg(x0,x0+len,X=>y0+sag*Math.sin(Math.PI*(X-x0)/len),'bridge');L.bridges.push({x0,x1:x0+len,y:y0});x+=len;
   ringLine(x0+30,Math.floor(len/40),36,30);for(let k=0;k<RI(1,2);k++)L.enemies.push({type:'chop',x:x0+len*(k+1)/3,base:y0+70,phase:R(0,2)});flat(80);},
  badniks(){const x0=x;hills(420,R(18,34)*(rand()<.5?-1:1),1);const f0=x;flat(460);L.enemies.push({type:'moto',x:x0+210,range:90},{type:'crab',x:f0+300,range:50});
   L.enemies.push({type:'buzz',x:f0+420,lift:R(105,130)});L.spikes.push({x:f0+120,w:32});ringLine(x0+40,5);ringLine(f0+90,4,26,72);},
  springs(){const x0=x,y0=y;flat(620);const sx=x0+130;L.springs.push({x:sx,color:'yellow'});
   for(let k=0;k<3;k++){const px=x0+220+k*120,py=y0-150-k*22;L.plats.push({x:px,y:py,w:72,amp:0,ax:0});for(let j=0;j<3;j++)ringAt(px+12+j*24,py-24);}
   ringLine(sx-6,1,0,90);ringLine(sx-6,1,0,140);L.springs.push({x:x0+560,color:'red'});for(let k=0;k<5;k++)ringAt(x0+560,y0-120-k*48);if(rand()<.5)L.monitors.push({x:0,type:MON_TYPES[RI(0,4)],plat:L.plats.length-1});},
  platforms(){const y0=y,gap=RI(330,380),x0=x;flat(40);const gx=x;L.gaps.push({x0:gx,x1:gx+gap,base:y0+40});const n=3;
   for(let k=0;k<n;k++){const px=gx+28+k*(gap-80)/(n-1)-10,moving=k===1;L.plats.push({x:px,y:y0-16-k*10,w:64,ax:moving?R(26,40):0,amp:0,ph:R(0,6)});ringLine(px+8,3,24,26+k*10);}
   x=gx+gap;flat(260);ringLine(x-220,5);},
  monitors(){const x0=x;flat(440);const n=RI(2,3);for(let k=0;k<n;k++)L.monitors.push({x:x0+130+k*90,type:MON_TYPES[RI(0,4)]});ringLine(x0+20,3);},
  slopes(){const x0=x;const d=R(70,110)*steer();slope(380,d);slope(380,-d*R(.4,1));ringLine(x0+30,8,40);if(rand()<.5)L.enemies.push({type:'moto',x:x0+600,range:80});}
 };
 // opening
 flat(560);ringLine(260,6);L.monitors.push({x:470,type:'rings'});
 const want=mode==='race'?10:15,bag=[],base=['run','loop','pit','bridge','badniks','springs','platforms','monitors','slopes','loop','run'];
 while(bag.length<want){const pool=base.slice().sort(()=>rand()-.5);for(const k of pool){if(bag.length>=want)break;if(bag.at(-1)!==k)bag.push(k);}}
 if(!bag.slice(0,4).includes('loop'))bag[2]='loop';
 bag.forEach((k,i)=>{chunks[k]();if(i%2===1)lamp();});
 // goal
 flat(200);L.end=x+40;flat(560);if(mode==='rings')L.giant={x:L.end+300};L.maxX=x;flat(900);
 // decorations away from hazards
 for(let dx=80;dx<L.maxX;dx+=R(120,240)){if(L.gaps.some(g=>dx>g.x0-60&&dx<g.x1+60)||L.bridges.some(b=>dx>b.x0-40&&dx<b.x1+40)||L.loops.some(l=>Math.abs(dx-l.cx)<l.R+40))continue;const r=rand();L.decor.push({x:dx,type:r<.22?'palm':r<.52?'sun':r<.8?'flower':r<.9?'totem':'rock',v:rand()});}
 L.segs.sort((a,b)=>a.x0-b.x0);
 const g=X=>groundAt(L,X);
 for(const r of L.rings){if(r.y===undefined){const gy=g(r.x);r.y=(gy??0)-r.lift;}}
 L.rings.sort((a,b)=>a.x-b.x);
 for(const e of L.enemies){e.gy=g(e.x)??0;}
 for(const m of L.monitors){if(m.plat!==undefined){const p=L.plats[m.plat];m.x=p.x+p.w/2;m.y=p.y;}else m.y=g(m.x)??0;}
 for(const s of L.springs)s.y=g(s.x)??0;for(const s of L.spikes)s.y=g(s.x+s.w/2)??0;for(const l of L.lamps)l.y=g(l.x)??0;for(const d of L.decor)d.y=g(d.x);
 L.signY=g(L.end)??0;if(L.giant)L.giant.y=(g(L.giant.x)??0)-70;
 return L;
}
function segAt(L,x){const s=L.segs;let lo=0,hi=s.length-1;while(lo<=hi){const m=(lo+hi)>>1;if(x<s[m].x0)hi=m-1;else if(x>=s[m].x1)lo=m+1;else return s[m];}return null;}
function groundAt(L,x){const s=segAt(L,x);return s?s.f(x):null;}
function slopeAt(L,x){const a=groundAt(L,x-2),b=groundAt(L,x+2);if(a===null||b===null)return 0;return Math.atan2(b-a,4);}
function platPos(p,t){return {x:p.x+(p.ax?Math.sin(t*1.3+(p.ph||0))*p.ax:0),y:p.y};}

// ------------------------------------------------------------------ per-player world state
function makeWorld(L){
 return {got:new Uint8Array(L.rings.length),enemies:L.enemies.map(e=>({...e,hx:e.x,alive:true,x:e.x,y:e.gy,dir:-1,t:0,cd:1.2,state:0})),monitors:L.monitors.map(m=>({...m,broken:false,bounce:0})),
  lamps:new Uint8Array(L.lamps.length),shots:[],loose:[],animals:[],debris:[],spring:new Float32Array(L.springs.length),fx:new Fx(),sign:{spin:0,shown:false}};
}
function makePlayer(i,L){return {i,x:L.start,y:groundAt(L,L.start),gsp:0,vx:0,vy:0,grounded:true,on:'ground',plat:null,loop:null,theta:0,angle:0,facing:1,ball:false,rolling:false,spindash:false,rev:0,crouch:false,jumping:false,hurt:false,inv:0,star:0,shoes:0,shield:false,rings:0,score:0,dead:0,check:L.start,finished:false,finishT:0,time:0,anim:0,idle:0,skid:0,springPose:false,loopCd:0,lap:0,spin:0,wasJump:false,best:0,deaths:0};}

// ------------------------------------------------------------------ the game
async function sonic(s){
 const mode=s.game.sonicMode==='race'?'race':'rings';
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.updateScores();
 if(!await settle(s))return;
 const L=buildLevel(s.random,mode),worlds=[makeWorld(L),makeWorld(L)],pl=[makePlayer(0,L),makePlayer(1,L)];
 const cams=pl.map(p=>({x:p.x-120,y:p.y-150}));
 const touchUI=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
 const inputs=[0,1].map(()=>({l:0,r:0,d:0,jump:0,press:0}));
 const pads=[{stick:null,jump:null,jumpT:0},{stick:null,jump:null,jumpT:0}];
 let phase='title',titleT=0,cd=new Countdown(3),clock=0,acc=0,endT=0,winner=-1,simT=0,frames=0,endText='',turn=0,gi=0,turnText='';
 // P1's run is recorded every step and replayed as a ghost during P2's turn
 const ghost=[],ghostAt=i=>i===1&&gi<ghost.length?ghost[gi]:null;
 const snap=p=>({i:p.i,x:p.x,y:p.y,dead:p.dead,shield:p.shield,ball:p.ball,spin:p.spin,spindash:p.spindash,facing:p.facing,on:p.on,theta:p.theta,angle:p.angle,grounded:p.grounded,gsp:p.gsp,vx:p.vx,vy:p.vy,anim:p.anim,springPose:p.springPose,hurt:p.hurt,crouch:p.crouch,idle:p.idle,finished:p.finished,star:p.star,shoes:0,inv:0});
 const kb=arenaKeys(s);
 kb.onDown((i,k)=>{if(k==='u'||k==='fire')inputs[turn].press=1;});
 s.hint(mode==='rings'?'RING RUSH: collect the most rings in 60 seconds. Getting hit scatters your rings, so grab them back. Reach the signpost and jump into the Giant Ring to run the act again with fresh rings. Players take turns; P2 races P1’s ghost. Touch: drag on the left side to run, drag down to roll or crouch; tap the right side to jump (hold for a higher jump). Crouch + tap jump = spin dash. Keys: A/D or arrows, S/Down, W/Up, Space or Enter.':'GOAL DASH: fastest to the signpost wins. Run, roll down hills and spin dash. Falling into a pit or getting hit with no rings sends you back to the last lamppost. Players take turns; P2 races P1’s ghost. Touch: drag on the left side to run, drag down to roll or crouch; tap the right side to jump (hold for a higher jump). Crouch + tap jump = spin dash. Keys: A/D or arrows, S/Down, W/Up, Space or Enter.');

 // ---------------- touch: the whole screen belongs to whoever's turn it is
 const vp=()=>({x:0,y:0,w:s.W,h:s.H});
 arenaTouch(s,{owner:()=>turn,maxFingers:3,
  onDown:f=>{const pd=pads[f.owner];if(f.x>s.W*.56){f.data.role='jump';pd.jump=f;inputs[f.owner].press=1;pd.jumpT=performance.now();}else{f.data.role='stick';pd.stick=f;}},
  onMove:f=>{if(f.data.role!=='stick')return;const dx=f.x-f.sx,dy=f.y-f.sy,lim=56;if(Math.hypot(dx,dy)>lim){const k=lim/Math.hypot(dx,dy);f.sx=f.x-dx*k;f.sy=f.y-dy*k;}
   const v=f.samples.length>1?(f.y-f.samples[0].y)/Math.max(.016,(performance.now()-f.samples[0].t)/1000):0;if(v<-700&&!f.data.flick&&dy<-18){f.data.flick=true;inputs[f.owner].press=1;}if(dy>-6)f.data.flick=false;},
  onUp:f=>{const pd=pads[f.owner];if(pd.jump===f)pd.jump=null;if(pd.stick===f){pd.stick=null;if(f.moved<10&&f.held<200)inputs[f.owner].press=1;}}});
 const readInput=i=>{const [k0,k1]=kb.state,st=pads[i].stick,inp=inputs[i];let l=k0.l||k1.l,r=k0.r||k1.r,d=k0.d||k1.d,jump=k0.u||k0.fire||k1.u||k1.fire;
  if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(dx>11)r=1;if(dx<-11)l=1;if(dy>20)d=1;if(st.data.flick)jump=1;}
  if(pads[i].jump)jump=1;inp.l=l;inp.r=r;inp.d=d;inp.jump=jump;};

 // ---------------- sounds
 const sfx={
  ring:p=>{snd(1568,.05,{type:'square',vol:.025});snd(2093,.16,{type:'square',vol:.022,delay:.05});},
  jump:()=>snd(330,.14,{type:'square',vol:.03,to:1000}),
  rev:r=>snd(420+r*70,.14,{type:'sawtooth',vol:.025,to:1300+r*60}),
  dash:()=>{noise(.18,{vol:.05,freq:2600});snd(1100,.25,{type:'square',vol:.03,to:180});},
  roll:()=>snd(700,.12,{type:'square',vol:.02,to:300}),
  spring:()=>{snd(220,.28,{type:'square',vol:.035,to:880});snd(330,.2,{type:'triangle',vol:.03,to:1320,delay:.03});},
  pop:()=>{noise(.22,{vol:.07,freq:900});snd(180,.25,{type:'square',vol:.03,to:50});},
  hurt:()=>jingle([1760,1568,1397,1175,988,880],{step:.035,type:'square',vol:.025,dur:.08}),
  monitor:()=>{noise(.15,{vol:.06,freq:1500});snd(500,.15,{type:'square',vol:.03,to:1200});},
  lamp:()=>{snd(988,.08,{type:'square',vol:.03});snd(1319,.2,{type:'square',vol:.03,delay:.08});},
  skid:()=>noise(.2,{vol:.04,freq:3800,q:2}),
  die:()=>snd(700,.6,{type:'square',vol:.035,to:90}),
  sign:()=>jingle([784,988,1175,1568],{step:.06,type:'square',vol:.03}),
  giant:()=>jingle([523,784,1047,1319,1568,2093],{step:.05,type:'triangle',vol:.04,dur:.25}),
  shield:()=>snd(300,.3,{type:'sine',vol:.05,to:900}),
  power:()=>jingle([659,784,988,1319],{step:.07,type:'square',vol:.03})
 };

 // ---------------- physics helpers
 const topSpeed=p=>p.shoes>0?12:P.top,accel=p=>p.shoes>0?P.acc*2:P.acc;
 const halfH=p=>p.ball?14:19;
 const loopAt=(x0,x1)=>L.loops.find(l=>x0<l.cx&&x1>=l.cx);
 const toAir=(p,vx,vy)=>{p.grounded=false;p.on='air';p.plat=null;p.loop=null;p.vx=vx;p.vy=vy;p.angle=0;};
 const land=(p,gy,ang,how='ground',plat=null)=>{const tx=Math.cos(ang),ty=Math.sin(ang);p.gsp=p.vx*tx+p.vy*ty;if(Math.abs(ang)<.2)p.gsp=p.vx;p.y=gy;p.angle=ang;p.grounded=true;p.on=how;p.plat=plat;
  if(p.hurt){p.hurt=false;p.gsp=0;p.inv=120;}p.jumping=false;p.springPose=false;if(!p.rolling)p.ball=false;if(p.rolling&&!inputs[p.i].d&&Math.abs(p.gsp)<1)p.rolling=p.ball=false;};
 const center=p=>{if(p.on==='loop'){const l=p.loop,h=halfH(p);return {x:p.x-Math.sin(p.theta)*h,y:p.y-Math.cos(p.theta)*h};}return {x:p.x,y:p.y-halfH(p)};};
 const hitBox=(p,ex,ey,er)=>{const c=center(p);return Math.abs(c.x-ex)<9+er&&Math.abs(c.y-ey)<halfH(p)+er;};
 const attacking=p=>p.ball||p.star>0||p.spindash;

 const loseRings=(p,w,awayX)=>{
  const n=Math.min(p.rings,32);p.rings=0;let ang=Math.PI*.5+.4,dir=1,speed=4;
  for(let k=0;k<n;k++){if(k===16){speed=2;ang=Math.PI*.5+.4;}const a=-ang;w.loose.push({x:p.x,y:p.y-18,vx:Math.cos(a)*speed*dir,vy:Math.sin(a)*speed,t:0});if(dir<0)ang+=.39;dir=-dir;}
  if(n)sfx.hurt();
 };
 const log=[];const note=(p,what)=>{log.push(`${(clock).toFixed(1)} P${p.i+1} ${what} x${Math.round(p.x)} rings${p.rings}`);if(log.length>60)log.shift();};
 const hurt=(p,w,fromX)=>{
  if(p.inv>0||p.star>0||p.hurt||p.dead)return;note(p,'hurt');
  if(p.shield){p.shield=false;}else if(p.rings>0){loseRings(p,w,fromX);}else{kill(p,w);return;}
  const dir=fromX>p.x?-1:1;toAir(p,2*dir,-4);p.hurt=true;p.ball=p.rolling=p.spindash=false;p.inv=120;w.fx.shake(6);s.react(p.i,'sad');
 };
 const kill=(p,w)=>{if(p.dead)return;note(p,'die');p.dead=1;p.deaths++;p.grounded=false;p.on='air';p.vx=0;p.vy=-7;p.ball=false;p.rolling=false;p.spindash=false;p.shield=false;p.rings=0;sfx.die();s.react(p.i,'sad');};
 const respawn=p=>{const x0=p.check,gy=groundAt(L,x0)??0;Object.assign(p,{x:x0,y:gy,gsp:0,vx:0,vy:0,grounded:true,on:'ground',plat:null,loop:null,angle:0,dead:0,hurt:false,inv:90,ball:false,rolling:false,spindash:false,springPose:false,star:0,shoes:0});};
 const popEnemy=(p,w,e)=>{e.alive=false;p.score+=100;w.fx.burst(e.x,e.y-10,{n:14,colors:['#fff','#ffd84a','#ff7a2a'],speed:150,life:.4,size:2.4});w.fx.ring(e.x,e.y-10,{color:'#fff',r1:26});w.animals.push({x:e.x,y:e.y-10,vx:(Math.random()<.5?-1:1)*1.6,vy:-3,kind:Math.random()<.5?'flicky':'pocky',t:0});
  w.fx.pop(e.x,e.y-34,'100',{color:'#fff',size:12,rise:22});sfx.pop();if(!p.grounded&&p.vy>0)p.vy=-Math.max(3,p.vy);else if(!p.grounded)p.vy=Math.max(p.vy-1,-6);};

 function stepPlayer(p,w,inp){
  if(p.finished&&mode==='race'){inp={l:0,r:1,d:0,jump:0,press:0};}
  if(p.dead){p.vy=Math.min(p.vy+P.grv,P.maxFall);p.y+=p.vy;p.dead+=1;if(p.dead>100)respawn(p);return;}
  if(p.inv>0)p.inv--;if(p.star>0)p.star--;if(p.shoes>0)p.shoes--;if(p.loopCd>0)p.loopCd--;if(p.skid>0)p.skid--;
  const press=inp.press;inp.press=0;
  if(p.grounded){
   const ang=p.on==='loop'?-p.theta:p.on==='plat'?0:p.angle,tx=Math.cos(ang),ty=p.on==='loop'?-Math.sin(p.theta):Math.sin(ang);
   // crouch / spin dash
   if(p.spindash){if(!inp.d){p.spindash=false;p.rolling=p.ball=true;p.gsp=(8+Math.floor(p.rev)/2)*p.facing;sfx.dash();w.fx.burst(p.x-p.facing*10,p.y-3,{n:10,color:'#e9e4d0',speed:120,life:.3,size:2.5,angle:p.facing>0?Math.PI:0,spread:1});}
    else{if(press){p.rev=Math.min(8,p.rev+2);sfx.rev(p.rev);w.fx.burst(p.x-p.facing*10,p.y-2,{n:4,color:'#e9e4d0',speed:90,life:.25,size:2,angle:p.facing>0?Math.PI:0,spread:.8});}p.rev-=p.rev/32;return;}}
   p.crouch=!!inp.d&&Math.abs(p.gsp)<1&&!p.rolling;
   if(p.crouch&&press){p.spindash=true;p.rev=2;p.ball=true;sfx.rev(2);return;}
   if(press&&!p.crouch){const nx=ty,ny=-tx,v=p.on==='loop'?{x:Math.cos(p.theta)*p.gsp,y:-Math.sin(p.theta)*p.gsp}:{x:p.gsp*tx,y:p.gsp*ty};
    const up=p.on==='loop'?{x:-Math.sin(p.theta),y:-Math.cos(p.theta)}:{x:nx,y:ny};
    if(p.on==='loop'){const c=center(p);p.x=c.x;p.y=c.y+14;}
    toAir(p,v.x+up.x*P.jump,v.y+up.y*P.jump);p.ball=true;p.jumping=true;p.rolling=false;sfx.jump();return;}
   if(p.rolling){
    if(inp.l&&p.gsp>0)p.gsp-=P.rollDec;if(inp.r&&p.gsp<0)p.gsp+=P.rollDec;
    p.gsp-=Math.min(Math.abs(p.gsp),P.rollFrc)*Math.sign(p.gsp);
    p.gsp+=(Math.sign(p.gsp)===Math.sign(ty)?P.slpDown:P.slpUp)*ty;
    if(Math.abs(p.gsp)<.5&&Math.abs(ty)<.15){p.rolling=false;p.ball=false;}
   }else{
    if(Math.abs(ty)>.05||Math.abs(p.gsp)>0)p.gsp+=P.slp*ty;
    const top=topSpeed(p),a=accel(p);
    if(inp.l){if(p.gsp>0){if(p.gsp>4&&!p.skid){p.skid=14;sfx.skid();}p.gsp-=P.dec;if(p.gsp<=0)p.gsp=-.5;}else if(p.gsp>-top)p.gsp=Math.max(p.gsp-a,-top);p.facing=p.gsp<=0?-1:p.facing;}
    else if(inp.r){if(p.gsp<0){if(p.gsp<-4&&!p.skid){p.skid=14;sfx.skid();}p.gsp+=P.dec;if(p.gsp>=0)p.gsp=.5;}else if(p.gsp<top)p.gsp=Math.min(p.gsp+a,top);p.facing=p.gsp>=0?1:p.facing;}
    else p.gsp-=Math.min(Math.abs(p.gsp),a)*Math.sign(p.gsp);
    if(inp.d&&Math.abs(p.gsp)>=1){p.rolling=p.ball=true;sfx.roll();}
   }
   if(Math.abs(p.gsp)>16)p.gsp=16*Math.sign(p.gsp);
   if(p.skid&&p.anim%4<1)w.fx.burst(p.x,p.y-2,{n:1,color:'#f0ecd8',speed:40,life:.35,size:3});
   // move
   if(p.on==='loop'){const l=p.loop;p.theta+=p.gsp/l.R;
    if(p.theta>=Math.PI*2){p.on='ground';p.loop=null;p.x=l.cx+1;p.y=l.y;p.angle=0;p.loopCd=40;}
    else if(p.theta<=0){p.on='ground';p.loop=null;p.x=l.cx-1;p.y=l.y;p.angle=0;p.loopCd=40;}
    else{p.x=l.cx+l.R*Math.sin(p.theta);p.y=l.cy+l.R*Math.cos(p.theta);
     if(Math.abs(p.gsp)<2.5&&p.theta>Math.PI*.35&&p.theta<Math.PI*1.65){const c=center(p);const vx=Math.cos(p.theta)*p.gsp,vy=-Math.sin(p.theta)*p.gsp;p.x=c.x;p.y=c.y+halfH(p);toAir(p,vx,vy);}}
   }else if(p.on==='plat'){const pp=platPos(p.plat,simT),prev=platPos(p.plat,simT-STEP);p.x+=p.gsp+(pp.x-prev.x);p.y=pp.y;if(p.x<pp.x-4||p.x>pp.x+p.plat.w+4)toAir(p,p.gsp,0);}
   else{const nx=p.x+p.gsp*tx,gy=groundAt(L,nx),l=p.gsp>0&&p.loopCd<=0?loopAt(p.x,nx):null;
    if(l&&Math.abs(p.y-l.y)<6){p.on='loop';p.loop=l;p.theta=Math.max(.001,(nx-l.cx)/l.R);p.x=l.cx+l.R*Math.sin(p.theta);p.y=l.cy+l.R*Math.cos(p.theta);}
    else if(gy===null){p.x=nx;toAir(p,p.gsp*tx,p.gsp*ty);}
    else if(gy<p.y-24){p.gsp=0;}
    else{p.x=nx;p.y=gy;p.angle=slopeAt(L,nx);}}
  }else{
   // air
   if(!p.hurt){const top=topSpeed(p),a=P.air*(p.shoes>0?2:1);if(inp.l){if(p.vx>-top)p.vx=Math.max(p.vx-a,-top);p.facing=-1;}else if(inp.r){if(p.vx<top)p.vx=Math.min(p.vx+a,top);p.facing=1;}
    if(p.vy<0&&p.vy>-4)p.vx-=p.vx/32;if(p.jumping&&!inp.jump&&p.vy<-4)p.vy=-4;}
   p.vy=Math.min(p.vy+(p.hurt?.1875:P.grv),P.maxFall);
   const nx=p.x+p.vx,ny=p.y+p.vy;let landed=false;
   if(p.vy>=0)for(const pl0 of L.plats){const pp=platPos(pl0,simT);if(nx>=pp.x-6&&nx<=pp.x+pl0.w+6&&p.y<=pp.y+2&&ny>=pp.y){p.x=nx;land(p,pp.y,0,'plat',pl0);landed=true;break;}}
   if(!landed){const gy=groundAt(L,nx);
    if(gy!==null&&ny>=gy){if(p.y<=gy+14||p.vy<0&&false){p.x=nx;land(p,gy,slopeAt(L,nx));}else{p.vx=0;p.y=ny;}}
    else{p.x=nx;p.y=ny;}
    const gap=L.gaps.find(g=>p.x>g.x0-10&&p.x<g.x1+10);if(!p.grounded&&gap&&p.y>gap.base+170)kill(p,w);}
   if(p.x<20){p.x=20;p.vx=0;}
  }
  if(p.grounded&&p.x<20){p.x=20;p.gsp=0;}
  const edge=L.maxX+600;if(p.x>edge){p.x=edge;if(p.grounded)p.gsp=Math.min(p.gsp,0);else p.vx=Math.min(p.vx,0);}
  p.spin+=(p.grounded?p.gsp:Math.hypot(p.vx,p.vy)*Math.sign(p.vx||1))*.09;
  p.anim+=Math.abs(p.grounded?p.gsp:p.vx)*.08+.02;
  if(p.grounded&&Math.abs(p.gsp)<.05&&!inp.l&&!inp.r)p.idle++;else p.idle=0;
  if(!p.grounded&&p.springPose&&p.vy>0&&p.vy>2)p.springPose=false;
 }

 function interact(p,w){
  if(p.dead)return;const c=center(p),hh=halfH(p);
  // rings (sorted by x)
  let lo=0,hi=L.rings.length;while(lo<hi){const m=(lo+hi)>>1;if(L.rings[m].x<c.x-24)lo=m+1;else hi=m;}
  for(let k=lo;k<L.rings.length&&L.rings[k].x<c.x+24;k++){if(w.got[k])continue;const r=L.rings[k];if(Math.abs(r.x-c.x)<16&&Math.abs(r.y-c.y)<hh+8){w.got[k]=1;p.rings++;p.score+=10;sfx.ring();w.fx.burst(r.x,r.y,{n:5,colors:['#fff','#ffe680'],speed:70,life:.3,size:2,shape:'star'});}}
  for(let k=w.loose.length-1;k>=0;k--){const r=w.loose[k];if(r.t>40&&Math.abs(r.x-c.x)<16&&Math.abs(r.y-c.y)<hh+8){w.loose.splice(k,1);p.rings++;sfx.ring();}}
  // springs
  L.springs.forEach((sp,k)=>{if(Math.abs(c.x-sp.x)<15&&p.y>=sp.y-18&&p.y<=sp.y+4&&(p.grounded||p.vy>=0)){const v=sp.color==='red'?-16:-10;p.x=clamp(p.x,sp.x-14,sp.x+14);toAir(p,p.grounded?p.gsp*.5:p.vx,v);p.springPose=true;p.ball=false;p.rolling=false;p.jumping=false;w.spring[k]=1;sfx.spring();}});
  // spikes
  for(const sp of L.spikes){if(c.x>sp.x-8&&c.x<sp.x+sp.w+8&&p.y>sp.y-16&&p.y<=sp.y+4)hurt(p,w,c.x<sp.x+sp.w/2?sp.x+sp.w:sp.x);}
  // monitors
  for(const m of w.monitors){if(m.broken)continue;const my=m.y-15;if(Math.abs(c.x-m.x)<9+14&&Math.abs(c.y-my)<hh+14){
   if(attacking(p)||!p.grounded&&p.vy>0){m.broken=true;sfx.monitor();w.debris.push({x:m.x,y:m.y,t:0,type:m.type});w.fx.burst(m.x,my,{n:12,colors:['#ccc','#fff','#7ab8ff'],speed:140,life:.4,size:2.4,shape:'square'});
    if(!p.grounded&&p.vy>0)p.vy=-p.vy;
    setTimeout(()=>{if(!s.alive)return;if(m.type==='rings'){p.rings+=10;sfx.ring();}else if(m.type==='shield'){p.shield=true;sfx.shield();}else if(m.type==='shoes'){p.shoes=20*60;sfx.power();}else if(m.type==='star'){p.star=20*60;sfx.power();}w.fx.pop(m.x,m.y-50,m.type==='rings'?'+10 RINGS':m.type==='shield'?'SHIELD':m.type==='shoes'?'SPEED SHOES':'INVINCIBLE',{color:HUD_YEL,size:13});},450);}
   else if(p.grounded){p.x=c.x<m.x?m.x-24:m.x+24;p.gsp=0;}}}
  // lampposts
  L.lamps.forEach((l,k)=>{if(!w.lamps[k]&&p.x>l.x){w.lamps[k]=1;p.check=l.x;sfx.lamp();w.fx.burst(l.x,l.y-58,{n:10,colors:['#ff4040','#fff'],speed:90,life:.4,size:2,shape:'star'});}});
  // badniks and shots
  for(const e of w.enemies){if(!e.alive)continue;const box=e.type==='buzz'?{x:e.x,y:e.y-8,r:13}:e.type==='chop'?{x:e.x,y:e.y,r:11}:{x:e.x,y:e.y-11,r:12};
   if(hitBox(p,box.x,box.y,box.r)){if(attacking(p))popEnemy(p,w,e);else hurt(p,w,e.x);}}
  for(let k=w.shots.length-1;k>=0;k--){const b=w.shots[k];if(hitBox(p,b.x,b.y,4)){w.shots.splice(k,1);if(p.star<=0)hurt(p,w,b.x);}}
  // goal
  if(!p.finished&&p.x>=L.end){p.finished=true;p.finishT=clock;w.sign.spin=2.2;sfx.sign();p.score+=1000;if(mode==='race')s.react(p.i,'win');}
  if(L.giant&&p.x>=L.giant.x-6&&Math.abs(c.y-L.giant.y)<70){sfx.giant();p.lap++;w.got.fill(0);w.lamps.fill(0);w.monitors.forEach(m=>m.broken=false);w.enemies.forEach((e,k)=>Object.assign(e,{...L.enemies[k],hx:L.enemies[k].x,alive:true,x:L.enemies[k].x,y:L.enemies[k].gy,dir:-1,t:0,cd:1.2,state:0}));w.sign.shown=false;
   p.finished=false;const keep={rings:p.rings,score:p.score+500,lap:p.lap,shield:p.shield,shoes:p.shoes,star:p.star};respawn(p);p.check=L.start;Object.assign(p,keep);p.x=L.start;p.y=groundAt(L,L.start);p.check=L.start;flash[p.i]=1;w.fx.pop(L.start+60,p.y-60,'LAP '+(p.lap+1),{color:HUD_YEL,size:20});cams[p.i].x=p.x-120;}
 }

 function stepWorld(w,p){
  const t=simT;
  for(const e of w.enemies){if(!e.alive||Math.abs(e.x-p.x)>700)continue;e.t+=STEP;
   if(e.type==='moto'){e.x+=e.dir*.9;if(Math.abs(e.x-e.hx)>e.range)e.dir*=-1,e.x+=e.dir*2;e.y=groundAt(L,e.x)??e.y;if(Math.random()<.04)w.fx.burst(e.x-e.dir*12,e.y-8,{n:1,color:'#bbb',speed:20,life:.4,size:2.4});}
   else if(e.type==='crab'){e.cd-=STEP;if(e.state===0){e.x+=e.dir*.45;if(Math.abs(e.x-e.hx)>e.range)e.dir*=-1;e.y=groundAt(L,e.x)??e.y;if(e.cd<=0&&Math.abs(e.x-p.x)<320){e.state=1;e.cd=.7;for(const d of [-1,1])w.shots.push({x:e.x+d*14,y:e.y-20,vx:d*1.4,vy:-4.2,t:0});snd(500,.08,{type:'square',vol:.02});}}else if(e.cd<=0){e.state=0;e.cd=2.4;}}
   else if(e.type==='buzz'){e.y=(groundAt(L,e.x)??e.gy)-e.lift;if(e.state===0&&Math.abs(e.x-p.x)<360)e.state=1;if(e.state===1){e.x-=1.6;if(Math.abs(e.x-p.x-60)<30&&e.cd>0){e.cd=-1;e.state=2;e.t=0;}}
    else if(e.state===2){if(e.t>.35&&e.cd<0){e.cd=-2;const dx=-1,dy=1.2,l=Math.hypot(dx,dy);w.shots.push({x:e.x-6,y:e.y+8,vx:dx/l*2.8,vy:dy/l*2.8,t:0,g:0});snd(900,.06,{type:'square',vol:.02});}if(e.t>.9)e.state=3;}else if(e.state===3)e.x-=2.4;}
   else if(e.type==='chop'){const ph=(t*.9+e.phase)%2.4;e.y=ph<1.2?e.base-Math.sin(ph/1.2*Math.PI)*120:e.base+20;}
  }
  for(let k=w.shots.length-1;k>=0;k--){const b=w.shots[k];b.t++;b.x+=b.vx;b.y+=b.vy;if(b.g!==0)b.vy+=.12;if(b.t>240)w.shots.splice(k,1);}
  for(let k=w.loose.length-1;k>=0;k--){const r=w.loose[k];r.t++;r.vy+=.09375;r.x+=r.vx;r.y+=r.vy;const gy=groundAt(L,r.x);if(gy!==null&&r.y>gy-6&&r.vy>0){r.y=gy-6;r.vy*=-.75;}if(r.t>256)w.loose.splice(k,1);}
  for(let k=w.animals.length-1;k>=0;k--){const a=w.animals[k];a.t++;a.vy+=.2;a.x+=a.vx;a.y+=a.vy;const gy=groundAt(L,a.x);if(gy!==null&&a.y>gy&&a.vy>0){a.y=gy;a.vy=a.kind==='flicky'?-4:-3.5;}if(a.t>220)w.animals.splice(k,1);}
  for(let k=w.debris.length-1;k>=0;k--){w.debris[k].t++;}
  for(let k=0;k<w.spring.length;k++)w.spring[k]=Math.max(0,w.spring[k]-.08);
  if(w.sign.spin>0)w.sign.spin=Math.max(0,w.sign.spin-STEP);
 }

 // ---------------- drawing
 const flash=[0,0];let checker=null,checkerKey='';
 const pattern=()=>{if(checker)return checker;const cv=document.createElement('canvas');cv.width=cv.height=32;const g=cv.getContext('2d');g.fillStyle='#c26b26';g.fillRect(0,0,32,32);g.fillStyle='#8c4318';g.fillRect(0,0,16,16);g.fillRect(16,16,16,16);
  g.fillStyle='rgba(255,255,255,.08)';g.fillRect(0,16,16,2);g.fillRect(16,0,16,2);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(14,0,2,16);g.fillRect(30,16,2,16);checker=x.createPattern(cv,'repeat');return checker;};
 const drawBackground=(v,cam,t)=>{
  const g=x.createLinearGradient(0,v.y,0,v.y+v.h);g.addColorStop(0,SKY[0]);g.addColorStop(.45,SKY[1]);g.addColorStop(.62,SKY[2]);g.addColorStop(.621,'#2c64d6');g.addColorStop(1,'#1238a0');x.fillStyle=g;x.fillRect(v.x,v.y,v.w,v.h);
  const u=Math.min(v.h/224,v.w/300),horizon=v.y+v.h*.62;
  // clouds
  x.fillStyle='rgba(255,255,255,.92)';const cOff=(cam.x*.06+t*6)%(220*u);for(let k=-1;k<v.w/(220*u)+2;k++){const cx=v.x+k*220*u-cOff,cy=v.y+v.h*(.12+(k&1)*.08);x.beginPath();x.ellipse(cx,cy,34*u,10*u,0,0,7);x.ellipse(cx+22*u,cy-6*u,22*u,10*u,0,0,7);x.ellipse(cx-20*u,cy+2*u,18*u,7*u,0,0,7);x.fill();}
  // far hills with waterfalls
  const hOff=(cam.x*.18)%(300*u);x.fillStyle='#2d7c35';x.beginPath();x.moveTo(v.x,horizon);for(let px=-300*u;px<=v.w+300*u;px+=12*u){const wx=px+hOff;x.lineTo(v.x+px,horizon-(26+Math.sin(wx/(46*u))*14+Math.sin(wx/(19*u))*5)*u);}x.lineTo(v.x+v.w,horizon);x.closePath();x.fill();
  x.fillStyle='#4fae3e';x.beginPath();x.moveTo(v.x,horizon);for(let px=-300*u;px<=v.w+300*u;px+=12*u){const wx=px+hOff*1.6;x.lineTo(v.x+px,horizon-(10+Math.sin(wx/(33*u)+1)*7)*u);}x.lineTo(v.x+v.w,horizon);x.closePath();x.fill();
  const wfOff=(cam.x*.18)%(300*u);x.fillStyle='rgba(220,240,255,.8)';for(let k=-1;k<v.w/(300*u)+2;k++){const wx=v.x+k*300*u-wfOff+120*u;x.fillRect(wx,horizon-30*u,6*u,30*u);x.fillRect(wx+9*u,horizon-24*u,3*u,24*u);}
  // shimmering sea
  x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=Math.max(1,u*1.2);const sOff=(cam.x*.32)%(64*u);for(let row=0;row<6;row++){const yy=horizon+(6+row*row*5+row*6)*u;if(yy>v.y+v.h)break;x.setLineDash([12*u+row*4*u,22*u+row*6*u]);x.lineDashOffset=sOff*(1+row*.4)+Math.sin(t*2+row)*6*u;x.beginPath();x.moveTo(v.x,yy);x.lineTo(v.x+v.w,yy);x.stroke();}x.setLineDash([]);
 };
 const drawGround=(x0,x1,bottom)=>{
  const runs=[];let cur=null;for(const sg of L.segs){if(sg.x1<x0||sg.x0>x1)continue;if(sg.kind==='bridge'){cur=null;continue;}if(cur&&Math.abs(cur.x1-sg.x0)<.5)cur.x1=sg.x1;else{cur={x0:sg.x0,x1:sg.x1};runs.push(cur);}}
  for(const r of runs){const a=Math.max(r.x0,x0-8),b=Math.min(r.x1,x1+8),pts=[];for(let X=a;X<b;X+=6)pts.push([X,groundAt(L,X)]);pts.push([b,groundAt(L,Math.min(b,r.x1-.01))]);
   x.beginPath();x.moveTo(a,bottom);for(const [X,Y] of pts)x.lineTo(X,Y);x.lineTo(b,bottom);x.closePath();x.fillStyle=pattern();x.fill();
   if(r.x0>=a-1){x.fillStyle='rgba(0,0,0,.25)';x.fillRect(r.x0,groundAt(L,r.x0)+6,5,bottom);}
   if(r.x1<=b+1){x.fillStyle='rgba(0,0,0,.25)';x.fillRect(r.x1-5,groundAt(L,r.x1-.01)+6,5,bottom);}
   x.lineJoin='round';x.lineCap='round';
   x.strokeStyle='#5a2a0c';x.lineWidth=4;x.beginPath();pts.forEach(([X,Y],k)=>k?x.lineTo(X,Y+10):x.moveTo(X,Y+10));x.stroke();
   x.strokeStyle='#2c9a1c';x.lineWidth=13;x.beginPath();pts.forEach(([X,Y],k)=>k?x.lineTo(X,Y+3):x.moveTo(X,Y+3));x.stroke();
   x.strokeStyle='#1d6e12';x.lineWidth=3;x.setLineDash([3,5]);x.beginPath();pts.forEach(([X,Y],k)=>k?x.lineTo(X,Y+9):x.moveTo(X,Y+9));x.stroke();x.setLineDash([]);
   x.strokeStyle='#7fe04a';x.lineWidth=3;x.beginPath();pts.forEach(([X,Y],k)=>k?x.lineTo(X,Y-1):x.moveTo(X,Y-1));x.stroke();}
 };
 const drawBridges=(x0,x1,bottom,t)=>{for(const b of L.bridges){if(b.x1<x0||b.x0>x1)continue;
  x.fillStyle='#2c64d6';x.fillRect(b.x0,b.y+40,b.x1-b.x0,bottom-b.y);x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=2;for(let k=0;k<4;k++){const yy=b.y+48+k*16;x.setLineDash([10,14]);x.lineDashOffset=t*20*(k%2?1:-1);x.beginPath();x.moveTo(b.x0,yy);x.lineTo(b.x1,yy);x.stroke();}x.setLineDash([]);
  x.strokeStyle='#5a2a0c';x.lineWidth=2;x.beginPath();for(let X=b.x0;X<=b.x1;X+=4)x.lineTo(X,groundAt(L,Math.min(X,b.x1-.01))+2);x.stroke();
  for(let X=b.x0;X<b.x1;X+=16){const Y=groundAt(L,X+8);x.fillStyle='#9a5a22';rr(x,X+1,Y,14,9,4);x.fill();x.strokeStyle='#5a2a0c';x.lineWidth=1.5;x.stroke();x.fillStyle='#c98a3c';x.fillRect(X+4,Y+2,8,2);}
  for(const px of [b.x0-4,b.x1-4]){x.fillStyle='#7a4416';x.fillRect(px,b.y-6,8,bottom-b.y);x.fillStyle='#c98a3c';x.fillRect(px+2,b.y-6,2,60);}}};
 const drawLoop=l=>{x.save();x.beginPath();x.arc(l.cx,l.cy,l.R+30,0,Math.PI*2);x.arc(l.cx,l.cy,l.R,0,Math.PI*2,true);x.fillStyle=pattern();x.fill('evenodd');
  x.strokeStyle='#5a2a0c';x.lineWidth=3;x.beginPath();x.arc(l.cx,l.cy,l.R+30,0,Math.PI*2);x.stroke();x.strokeStyle='#2c9a1c';x.lineWidth=10;x.beginPath();x.arc(l.cx,l.cy,l.R+4,0,Math.PI*2);x.stroke();x.strokeStyle='#7fe04a';x.lineWidth=2.5;x.beginPath();x.arc(l.cx,l.cy,l.R+.5,0,Math.PI*2);x.stroke();x.restore();};
 const drawDecor=d=>{if(d.y===null)return;x.save();x.translate(d.x,d.y+2);
  if(d.type==='palm'){x.strokeStyle='#8a5320';x.lineWidth=7;x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(8,-40,2,-78);x.stroke();x.strokeStyle='#5b3210';x.lineWidth=7;x.setLineDash([3,7]);x.stroke();x.setLineDash([]);x.fillStyle='#22a83a';for(let k=0;k<5;k++){x.save();x.translate(2,-78);x.rotate(-2.6+k*.95);x.beginPath();x.ellipse(22,0,24,6,.25,0,7);x.fill();x.restore();}}
  else if(d.type==='sun'){x.strokeStyle='#1f8a25';x.lineWidth=3;x.beginPath();x.moveTo(0,0);x.lineTo(0,-34);x.stroke();const sp=Math.sin(simT*3+d.x)>0;x.fillStyle='#ffd21c';for(let k=0;k<8;k++){const a=k*Math.PI/4+(sp?.2:0);x.beginPath();x.ellipse(Math.cos(a)*8,-38+Math.sin(a)*8,5,3,a,0,7);x.fill();}x.fillStyle='#8a4a10';x.beginPath();x.arc(0,-38,5.5,0,7);x.fill();}
  else if(d.type==='flower'){x.strokeStyle='#1f8a25';x.lineWidth=2;x.beginPath();x.moveTo(0,0);x.lineTo(0,-16);x.stroke();x.fillStyle=d.v<.5?'#b048e8':'#ff5a9a';for(let k=0;k<5;k++){const a=k*1.256+simT;x.beginPath();x.arc(Math.cos(a)*4,-18+Math.sin(a)*4,3,0,7);x.fill();}x.fillStyle='#fff3a0';x.beginPath();x.arc(0,-18,2,0,7);x.fill();}
  else if(d.type==='totem'){const cols=['#e8a020','#3a6ad8','#d83a3a','#3ab858'];for(let k=0;k<4;k++){x.fillStyle=cols[k];rr(x,-11,-22-k*21,22,20,4);x.fill();x.fillStyle='#fff';x.fillRect(-7,-16-k*21,5,5);x.fillRect(2,-16-k*21,5,5);x.fillStyle='#000';x.fillRect(-6,-15-k*21,3,3);x.fillRect(3,-15-k*21,3,3);}x.fillStyle='#e8a020';x.beginPath();x.moveTo(-26,-86);x.lineTo(26,-86);x.lineTo(0,-100);x.fill();}
  else{x.fillStyle='#8a7aa8';x.beginPath();x.ellipse(0,-8,14,10,0,0,7);x.fill();x.fillStyle='#b8a8d8';x.beginPath();x.ellipse(-4,-12,6,4,0,0,7);x.fill();}
  x.restore();};
 const drawPlat=(pl0)=>{const pp=platPos(pl0,simT);x.fillStyle=pattern();x.fillRect(pp.x,pp.y,pl0.w,18);x.strokeStyle='#5a2a0c';x.lineWidth=2;x.strokeRect(pp.x,pp.y,pl0.w,18);x.fillStyle='#2c9a1c';rr(x,pp.x-3,pp.y-3,pl0.w+6,9,4);x.fill();x.fillStyle='#7fe04a';x.fillRect(pp.x,pp.y-3,pl0.w,2);};
 const drawRing=(rx,ry,t,alpha=1)=>{const w=Math.abs(Math.cos(t*4+rx*.05));x.save();x.globalAlpha=alpha;x.translate(rx,ry);x.scale(Math.max(.18,w),1);x.strokeStyle='#b07800';x.lineWidth=4.6;x.beginPath();x.arc(0,0,6.5,0,7);x.stroke();x.strokeStyle='#ffd21c';x.lineWidth=3;x.beginPath();x.arc(0,0,6.5,0,7);x.stroke();x.strokeStyle='#fff8c0';x.lineWidth=1.2;x.beginPath();x.arc(0,0,6.5,3.6,5);x.stroke();x.restore();};
 const drawSpring=(sp,k,w)=>{const comp=w.spring[k];x.save();x.translate(sp.x,sp.y);x.fillStyle='#777';x.fillRect(-14,-5,28,5);x.strokeStyle='#bbb';x.lineWidth=2;x.beginPath();for(let j=0;j<4;j++){x.moveTo(-9,-6-j*3*(1-comp*.5));x.lineTo(9,-7.5-j*3*(1-comp*.5));}x.stroke();x.fillStyle=sp.color==='red'?'#e8282c':'#ffd21c';rr(x,-15,-21+comp*6,30,7,3);x.fill();x.strokeStyle='#3a2a10';x.lineWidth=1.5;x.stroke();x.restore();};
 const drawSpikes=sp=>{x.fillStyle='#d8dcea';x.strokeStyle='#59607a';x.lineWidth=1.5;for(let k=0;k<4;k++){const X=sp.x+k*8;x.beginPath();x.moveTo(X,sp.y);x.lineTo(X+4,sp.y-16);x.lineTo(X+8,sp.y);x.closePath();x.fill();x.stroke();}x.fillStyle='#59607a';x.fillRect(sp.x-1,sp.y-2,sp.w+2,4);};
 const drawMonitor=(m,t)=>{x.save();x.translate(m.x,m.y);if(m.broken){x.fillStyle='#666';x.fillRect(-13,-6,26,6);x.restore();return;}x.fillStyle='#bfc4d0';rr(x,-14,-30,28,30,3);x.fill();x.strokeStyle='#3c4050';x.lineWidth=2;x.stroke();x.fillStyle='#222';x.fillRect(-4,-4,8,4);x.fillStyle=(t*6|0)%2?'#1a2a6a':'#0a1440';x.fillRect(-10,-26,20,17);
  x.translate(0,-17.5);if(m.type==='rings'){x.strokeStyle='#ffd21c';x.lineWidth=2.4;x.beginPath();x.arc(0,0,5,0,7);x.stroke();}else if(m.type==='shield'){x.strokeStyle='#7fd0ff';x.lineWidth=2;x.beginPath();x.arc(0,0,6,0,7);x.stroke();x.fillStyle='rgba(127,208,255,.4)';x.fill();}
  else if(m.type==='shoes'){x.fillStyle='#e8282c';x.beginPath();x.ellipse(0,1,7,4,0,0,7);x.fill();x.fillStyle='#fff';x.fillRect(-2,-2,4,6);}else{x.fillStyle='#ffe23a';x.beginPath();for(let k=0;k<10;k++){const r=k%2?2.5:6.5,a=k*Math.PI/5-Math.PI/2;x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.closePath();x.fill();}
  x.fillStyle='rgba(255,255,255,.25)';x.fillRect(-10,-8.5,6,3);x.restore();};
 const drawLamp=(l,on,t)=>{x.save();x.translate(l.x,l.y);x.fillStyle='#2a4ab8';x.fillRect(-2.5,-50,5,50);x.fillStyle='#14287a';x.fillRect(-5,-4,10,4);const a=on?t*8:0;x.fillStyle=on?'#ff3a3a':'#3a6aff';x.beginPath();x.arc(Math.sin(a)*2,-54,5.5,0,7);x.fill();x.fillStyle='rgba(255,255,255,.6)';x.beginPath();x.arc(-1.5+Math.sin(a)*2,-56,1.8,0,7);x.fill();x.restore();};
 const egg=(r)=>{x.fillStyle='#f4c890';x.beginPath();x.ellipse(0,0,r,r*1.1,0,0,7);x.fill();x.fillStyle='#e83a2a';x.beginPath();x.ellipse(0,-r*.2,r*.95,r*.4,0,Math.PI,0);x.fill();x.fillStyle='#000';x.fillRect(-r*.5,-r*.2,r*.3,r*.2);x.fillRect(r*.2,-r*.2,r*.3,r*.2);x.fillStyle='#a8521a';x.beginPath();x.ellipse(-r*.35,r*.25,r*.4,r*.12,.3,0,7);x.ellipse(r*.35,r*.25,r*.4,r*.12,-.3,0,7);x.fill();};
 const drawSign=(w,i,t)=>{x.save();x.translate(L.end,L.signY);x.fillStyle='#8a8f9e';x.fillRect(-2.5,-56,5,56);const spin=w.sign.spin,ph=spin>0?spin*14:0,cw=Math.cos(ph),shownHead=pl[i].finished||w.sign.shown;
  x.translate(0,-76);x.save();x.scale(Math.max(.08,Math.abs(cw)),1);x.fillStyle='#e8eef8';x.beginPath();x.arc(0,0,20,0,7);x.fill();x.strokeStyle='#4a5068';x.lineWidth=3;x.stroke();
  if(!shownHead||spin>0&&cw<0)egg(13);x.restore();if(shownHead&&!(spin>0&&cw<0)&&Math.abs(cw)>.35){x.save();x.scale(Math.abs(cw),1);s.sprite(x,i,0,0,30,{exact:true,mood:'win'});x.restore();}x.restore();};
 const drawGiant=t=>{const g=L.giant;x.save();x.translate(g.x,g.y);x.scale(Math.max(.15,Math.abs(Math.cos(t*1.6))),1);x.strokeStyle='#b07800';x.lineWidth=14;x.beginPath();x.arc(0,0,40,0,7);x.stroke();x.strokeStyle='#ffd21c';x.lineWidth=9;x.stroke();x.strokeStyle='#fff8c0';x.lineWidth=3;x.beginPath();x.arc(0,0,40,3.5,5.2);x.stroke();x.restore();
  x.save();x.globalAlpha=.5+.5*Math.sin(t*6);x.fillStyle='#fff';for(let k=0;k<4;k++){const a=t*2+k*1.57;x.beginPath();x.arc(g.x+Math.cos(a)*52,g.y+Math.sin(a)*52,2,0,7);x.fill();}x.restore();};
 const drawEnemy=(e,t)=>{if(!e.alive)return;x.save();x.translate(e.x,e.y);
  if(e.type==='moto'){x.scale(-e.dir,1);x.fillStyle='#777';x.beginPath();x.arc(-2,-4,4.5,0,7);x.fill();x.fillStyle='#333';x.beginPath();x.arc(-2,-4,2,0,7);x.fill();x.fillStyle='#e8282c';x.beginPath();x.ellipse(0,-13,15,9,0,Math.PI,0);x.lineTo(15,-9);x.lineTo(-15,-9);x.fill();x.fillStyle='#1a3ab8';x.beginPath();x.arc(-6,-16,3.5,0,7);x.arc(5,-17,3,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(-12,-12,3.5,0,7);x.fill();x.fillStyle='#000';x.beginPath();x.arc(-13,-12,1.6,0,7);x.fill();x.fillStyle='#aaa';x.fillRect(12,-11,6,3);}
  else if(e.type==='crab'){x.fillStyle='#e05a2a';x.beginPath();x.ellipse(0,-12,13,8,0,0,7);x.fill();x.strokeStyle='#8a2a10';x.lineWidth=2.5;for(const d of [-1,1]){x.beginPath();x.moveTo(d*9,-9);x.lineTo(d*14,-1);x.moveTo(d*4,-8);x.lineTo(d*7,0);x.stroke();x.fillStyle=e.state===1?'#ffd21c':'#e8e8e8';x.beginPath();x.arc(d*17,-20+(e.state===1?-4:0),5.5,0,7);x.fill();}x.fillStyle='#fff';x.fillRect(-6,-22,4,5);x.fillRect(2,-22,4,5);x.fillStyle='#000';x.fillRect(-5,-20,2,2);x.fillRect(3,-20,2,2);}
  else if(e.type==='buzz'){x.fillStyle='rgba(220,240,255,.65)';const fl=Math.sin(t*60)*3;x.beginPath();x.ellipse(-2,-14+fl,10,5,-.4,0,7);x.ellipse(6,-14-fl,9,4,.4,0,7);x.fill();x.fillStyle='#2a3a8a';x.beginPath();x.ellipse(0,-6,14,6,0,0,7);x.fill();x.fillStyle='#ffd21c';x.fillRect(4,-10,3,8);x.fillRect(10,-9,3,6);x.fillStyle='#d8dcea';x.beginPath();x.moveTo(14,-6);x.lineTo(e.state>=2?18:22,e.state>=2?6:-2);x.lineTo(12,-2);x.fill();x.fillStyle='#e8282c';x.beginPath();x.arc(-12,-7,4,0,7);x.fill();}
  else if(e.type==='chop'){x.fillStyle='#e8282c';x.beginPath();x.ellipse(0,0,10,12,0,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.moveTo(-6,4);for(let k=0;k<5;k++){x.lineTo(-6+k*3+1.5,k%2?8:2);}x.lineTo(6,4);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(-3,-5,3,0,7);x.fill();x.fillStyle='#000';x.beginPath();x.arc(-3,-5,1.4,0,7);x.fill();x.fillStyle='#ffd21c';x.beginPath();x.moveTo(-2,-12);x.lineTo(4,-18);x.lineTo(5,-10);x.fill();}
  x.restore();};
 const drawAnimal=a=>{x.save();x.translate(a.x,a.y);x.scale(a.vx>0?1:-1,1);if(a.kind==='flicky'){x.fillStyle='#2a8aff';x.beginPath();x.ellipse(0,-6,6,5,0,0,7);x.fill();x.fillStyle='#ffd21c';x.beginPath();x.moveTo(5,-7);x.lineTo(9,-6);x.lineTo(5,-5);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(2,-8,1.8,0,7);x.fill();}
  else{x.fillStyle='#f0e8e0';x.beginPath();x.ellipse(0,-6,6,5,0,0,7);x.fill();x.fillRect(-1,-16,2.5,8);x.fillRect(2,-15,2.5,7);x.fillStyle='#000';x.fillRect(3,-8,1.5,1.5);}x.restore();};

 // Sonic's body with the player's head on top. Feet at (0,0) in local space; facing right before mirroring.
 function drawRunner(p,alpha=1){
  const i=p.i;x.save();x.globalAlpha*=alpha;
  if(p.inv>0&&!p.hurt&&(frames>>2)%2&&alpha===1)x.globalAlpha*=.35;
  const c=center(p);
  if(p.dead){x.translate(p.x,p.y-20);x.rotate(Math.min(p.dead*.05,1.6));s.sprite(x,i,0,-6,34,{exact:true,mood:'sad'});x.restore();return;}
  if(p.shield){x.save();x.globalAlpha*=.45+.15*Math.sin(simT*8);x.fillStyle='#7fd0ff';x.beginPath();x.arc(c.x,c.y-4,27,0,7);x.fill();x.globalAlpha*=1.4;x.strokeStyle='#e8f8ff';x.lineWidth=2;x.stroke();x.restore();}
  if(p.ball){x.save();x.translate(c.x,c.y);x.rotate(p.spin);const r=14;
   x.fillStyle='#1d4fd0';x.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5,rr0=k%2?r:r+4;x.lineTo(Math.cos(a)*rr0,Math.sin(a)*rr0);}x.closePath();x.fill();
   x.fillStyle='#3a78ff';x.beginPath();x.arc(0,0,r-1,0,7);x.fill();x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=2.4;x.beginPath();x.arc(0,0,r-4,.3,1.6);x.stroke();x.beginPath();x.arc(0,0,r-4,3.4,4.7);x.stroke();
   s.sprite(x,i,0,0,22,{exact:true,mood:'angry'});x.restore();
   if(p.spindash){x.save();x.globalAlpha*=.6;x.fillStyle='#fff';for(let k=0;k<3;k++){x.beginPath();x.arc(c.x-p.facing*(16+k*7),p.y-4+Math.sin(simT*30+k)*2,3+k,0,7);x.fill();}x.restore();}
   x.restore();return;}
  const ang=p.on==='loop'?-p.theta:p.grounded?p.angle:0,f=p.facing,run=Math.abs(p.grounded?p.gsp:p.vx),cyc=p.anim;
  x.save();x.translate(p.x,p.y);x.rotate(ang);
  const peel=run>=6.5&&p.grounded;
  x.save();x.scale(f,1);
  if(p.springPose||p.hurt){// arms up / tumble
   x.strokeStyle='#1d4fd0';x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(-2,-14);x.lineTo(-4,-2);x.moveTo(2,-14);x.lineTo(4,-2);x.stroke();shoe(-4,-1,0);shoe(4,-1,0);body();x.strokeStyle='#f6c890';x.lineWidth=3.5;x.beginPath();x.moveTo(-3,-22);x.lineTo(-8,-34);x.moveTo(3,-22);x.lineTo(8,-34);x.stroke();glove(-8,-35);glove(8,-35);}
  else if(p.crouch){shoe(-3,-1,0);shoe(5,-1,0);x.fillStyle='#1d4fd0';x.beginPath();x.ellipse(0,-9,9,8,0,0,7);x.fill();x.fillStyle='#f6c890';x.beginPath();x.ellipse(3,-8,4,5,0,0,7);x.fill();glove(7,-6);}
  else if(peel){// figure-eight legs
   x.save();x.globalAlpha*=.85;x.strokeStyle='#e8282c';x.lineWidth=5;x.beginPath();x.ellipse(0,-6,9,5,0,0,7);x.stroke();x.strokeStyle='rgba(29,79,208,.6)';x.lineWidth=3;x.beginPath();x.ellipse(0,-6,6,3,0,0,7);x.stroke();x.restore();body(.25);arm(Math.sin(cyc*2)*.5,1);}
  else if(p.grounded&&run<.2){// standing (taps foot when idle)
   const tap=p.idle>180&&(p.idle>>4)%2;x.strokeStyle='#1d4fd0';x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(-2,-12);x.lineTo(-3,-3);x.moveTo(2,-12);x.lineTo(4,-3-(tap?2:0));x.stroke();shoe(-3,-1,0);shoe(5,-1-(tap?2:0),0);body();arm(-.3,-1);arm(.3,1);}
  else{const sw=Math.sin(cyc*2.2),lean=Math.min(run*.04,.25);x.strokeStyle='#1d4fd0';x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(0,-12);x.lineTo(sw*8,-2-Math.max(0,-sw)*3);x.moveTo(0,-12);x.lineTo(-sw*8,-2-Math.max(0,sw)*3);x.stroke();shoe(sw*8,-1-Math.max(0,-sw)*3,sw*.4);shoe(-sw*8,-1-Math.max(0,sw)*3,-sw*.4);body(lean);arm(-sw*.9,1);}
  x.restore();
  // quills + head (never mirrored, so faces read correctly)
  const hx=f*3,hy=-36;x.fillStyle='#1d4fd0';x.strokeStyle='#0b2a8c';x.lineWidth=1.5;x.lineJoin='round';for(let k=2;k>=0;k--){x.beginPath();x.moveTo(hx-f*4,hy-13+k*9);x.lineTo(hx-f*(27-k*3),hy-15+k*13);x.lineTo(hx-f*4,hy-3+k*9);x.closePath();x.fill();x.stroke();}
  s.sprite(x,i,hx,hy,32,{exact:true,mood:p.hurt?'sad':p.finished?'win':run>5?'happy':undefined});
  x.restore();
  if(p.star>0){x.save();for(let k=0;k<6;k++){const a=simT*9+k*1.047,r=22+Math.sin(simT*14+k)*4;x.fillStyle=k%2?'#fff':'#ffe23a';x.globalAlpha=.85;x.beginPath();x.arc(c.x+Math.cos(a)*r,c.y-4+Math.sin(a)*r,2.4,0,7);x.fill();}x.restore();}
  if(alpha===1&&p.shoes>0&&p.grounded&&run>3&&frames%3===0)worlds[i].fx.burst(p.x-p.facing*6,p.y-2,{n:1,color:'#e9e4d0',speed:30,life:.3,size:3});
  x.restore();
  function shoe(sx,sy,rot){x.save();x.translate(sx,sy);x.rotate(rot);x.fillStyle='#e8282c';x.beginPath();x.ellipse(2,-1.5,6.5,3.6,0,0,7);x.fill();x.fillStyle='#fff';x.fillRect(-1,-4.5,3,4);x.fillStyle='#9a1a1a';x.fillRect(-3,0,10,1.6);x.restore();}
  function body(l=0){x.save();x.rotate(l);x.fillStyle='#1d4fd0';x.beginPath();x.ellipse(0,-17,8.5,8,0,0,7);x.fill();x.fillStyle='#f6c890';x.beginPath();x.ellipse(3,-16,4.6,5.6,0,0,7);x.fill();x.restore();}
  function arm(a,side){x.save();x.translate(side*1,-21);x.rotate(a);x.strokeStyle='#f6c890';x.lineWidth=3.2;x.lineCap='round';x.beginPath();x.moveTo(0,0);x.lineTo(5,8);x.stroke();glove(5.5,9);x.restore();}
  function glove(gx,gy){x.fillStyle='#fff';x.beginPath();x.arc(gx,gy,3.2,0,7);x.fill();x.strokeStyle='#aaa';x.lineWidth=.8;x.stroke();}
 }

 function drawView(i,t){
  const v=vp(i),p=pl[i],w=worlds[i],cam=cams[i],sc=clamp(Math.min(v.h/200,v.w/320),.7,3.2),vw=v.w/sc,vh=v.h/sc;
  // camera
  const lead=clamp((p.grounded?p.gsp:p.vx)*16,-90,90),tx=clamp(p.x-vw*.42+lead,0,L.maxX+200-vw),ty=(p.dead?cam.y:p.y-vh*.58);
  cam.x+=(tx-cam.x)*Math.min(1,.18);cam.y+=(ty-cam.y)*Math.min(1,p.grounded?.12:.08);
  if(Math.abs(tx-cam.x)>vw)cam.x=tx;
  x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();
  drawBackground(v,cam,t);
  x.save();w.fx.begin(x);x.translate(v.x-cam.x*sc,v.y-cam.y*sc);x.scale(sc,sc);
  const x0=cam.x-40,x1=cam.x+vw+40,bottom=cam.y+vh+60;
  for(const d of L.decor)if(d.x>x0-60&&d.x<x1+60&&d.type!=='flower'&&d.type!=='sun')drawDecor(d);
  for(const l of L.loops)if(l.cx+l.R+40>x0&&l.cx-l.R-40<x1)drawLoop(l);
  drawGround(x0,x1,bottom);drawBridges(x0,x1,bottom,t);
  for(const d of L.decor)if(d.x>x0-30&&d.x<x1+30&&(d.type==='flower'||d.type==='sun'))drawDecor(d);
  for(const pl0 of L.plats){const pp=platPos(pl0,simT);if(pp.x+pl0.w>x0&&pp.x<x1)drawPlat(pl0);}
  L.lamps.forEach((l,k)=>{if(l.x>x0&&l.x<x1)drawLamp(l,w.lamps[k],t);});
  for(const sp of L.spikes)if(sp.x+sp.w>x0&&sp.x<x1)drawSpikes(sp);
  L.springs.forEach((sp,k)=>{if(sp.x>x0&&sp.x<x1)drawSpring(sp,k,w);});
  for(const m of w.monitors)if(m.x>x0&&m.x<x1)drawMonitor(m,t);
  if(L.end>x0-40&&L.end<x1+40)drawSign(w,i,t);if(L.giant&&L.giant.x>x0-60&&L.giant.x<x1+60)drawGiant(t);
  let lo=0,hi=L.rings.length;while(lo<hi){const m=(lo+hi)>>1;if(L.rings[m].x<x0)lo=m+1;else hi=m;}
  for(let k=lo;k<L.rings.length&&L.rings[k].x<x1;k++)if(!w.got[k])drawRing(L.rings[k].x,L.rings[k].y,t);
  for(const r of w.loose)drawRing(r.x,r.y,t*2,r.t>200&&(r.t>>2)%2?.3:1);
  for(const e of w.enemies)if(e.x>x0-30&&e.x<x1+30)drawEnemy(e,t);
  for(const b of w.shots){x.fillStyle=(frames>>2)%2?'#ff5a2a':'#ffe23a';x.beginPath();x.arc(b.x,b.y,3.5,0,7);x.fill();}
  for(const a of w.animals)drawAnimal(a);
  const gh=ghostAt(i);if(gh&&gh.x>x0-40&&gh.x<x1+40)drawRunner(gh,.42);
  drawRunner(p);
  w.fx.draw(x);
  w.fx.end(x);x.restore();
  if(flash[i]>0){x.fillStyle=`rgba(255,255,255,${flash[i]})`;x.fillRect(v.x,v.y,v.w,v.h);}
  drawHUD(i,v,t);
  x.restore();
 }
 const prog=q=>q.finished?100:Math.min(99,Math.round(clamp((q.best-L.start)/(L.end-L.start),0,1)*100));
 const fmtRace=sec=>{const m=Math.floor(sec/60),ss=Math.floor(sec%60),cc=Math.floor(sec*100%100);return `${m}'${String(ss).padStart(2,'0')}"${String(cc).padStart(2,'0')}`;};
 function hudText(label,val,px,py,size,warn=false){x.font=HUD_FONT.replace('%s',size);x.textAlign='left';x.textBaseline='top';x.lineJoin='round';x.lineWidth=Math.max(3,size*.28);x.strokeStyle='#08103a';x.strokeText(label,px,py);x.fillStyle=warn?'#ff3a3a':HUD_YEL;x.fillText(label,px,py);const lw=size*4.1;x.strokeText(val,px+lw,py);x.fillStyle='#fff';x.fillText(val,px+lw,py);}
 function drawHUD(i,v,t){
  const p=pl[i],u=clamp(Math.min(v.h/224,v.w/330),.6,2.2),size=Math.round(clamp(11*u,10,20)),pad=8*u;
  const timeVal=mode==='rings'?`${Math.floor(Math.max(0,RING_TIME-clock)/60)}:${String(Math.ceil(Math.max(0,RING_TIME-clock))%60).padStart(2,'0')}`:fmtRace(p.finished?p.finishT:clock);
  hudText('SCORE',String(p.score),v.x+pad,v.y+pad,size);hudText('TIME',timeVal,v.x+pad,v.y+pad+size*1.25,size,mode==='rings'&&RING_TIME-clock<10&&(frames>>4)%2);hudText('RINGS',String(p.rings),v.x+pad,v.y+pad+size*2.5,size,p.rings===0&&(frames>>4)%2);
  // name tag + progress strip
  const name=s.players[i].name.toUpperCase(),nx=v.x+v.w-pad;x.font=HUD_FONT.replace('%s',size);x.textAlign='right';x.textBaseline='top';x.lineWidth=Math.max(3,size*.28);x.strokeStyle='#08103a';x.strokeText(name,nx,v.y+pad);x.fillStyle=PCOL[i];x.fillText(name,nx,v.y+pad);
  if(mode==='rings'&&p.lap){x.font=HUD_FONT.replace('%s',Math.round(size*.8));x.strokeText(`LAP ${p.lap+1}`,nx,v.y+pad+size*1.2);x.fillStyle='#fff';x.fillText(`LAP ${p.lap+1}`,nx,v.y+pad+size*1.2);}
  const bw=Math.min(v.w*.34,220*u),bx=v.x+v.w-pad-bw,by=v.y+pad+size*2.9;x.fillStyle='rgba(8,16,58,.55)';rr(x,bx-4,by-4,bw+8,8,4);x.fill();x.fillStyle='#ffe23a';x.fillRect(bx,by-1,2,2);
  const gh=ghostAt(i);for(const q of gh?[gh,p]:[p]){const k=clamp((q.x-L.start)/(L.end-L.start),0,1),hx=bx+k*bw;x.save();x.globalAlpha=q===p?1:.6;x.fillStyle=PCOL[q.i];x.beginPath();x.arc(hx,by,q===p?5*u:3.5*u,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=1.5;x.stroke();x.restore();}
  if(i===1){const q=pl[0],goal=mode==='rings'?`${q.rings} RINGS`:q.finished?fmtRace(q.finishT):`${prog(q)}%`;x.font=HUD_FONT.replace('%s',Math.round(size*.75));x.textAlign='right';x.lineWidth=Math.max(3,size*.22);const lbl=`BEAT ${s.players[0].name.toUpperCase()}: ${goal}`;x.strokeText(lbl,nx,by+8*u);x.fillStyle=PCOL[0];x.fillText(lbl,nx,by+8*u);}
  x.fillStyle='#fff';x.font=`900 ${Math.round(size*.7)}px ${FONT}`;x.textAlign='right';x.fillText('🏁',bx+bw+4,by+5);
  if(p.dead&&p.dead>20){outlined(x,mode==='race'?'BACK TO THE LAMPPOST':'OUCH!',v.x+v.w/2,v.y+v.h*.45,{size:size*1.4,fill:'#fff',stroke:'#08103a'});}
  if(p.finished&&mode==='race'&&phase==='play'){outlined(x,`${name} GOT THROUGH`,v.x+v.w/2,v.y+v.h*.42,{size:size*1.7,fill:HUD_YEL,stroke:'#08103a'});outlined(x,fmtRace(p.finishT),v.x+v.w/2,v.y+v.h*.42+size*2,{size:size*1.2,fill:'#fff',stroke:'#08103a'});}
  // touch pad guides
  if(touchUI||clock<6&&phase==='play'){const pd=pads[i],a=touchUI?1:clamp(1-clock/6,0,1);x.save();x.globalAlpha=.18*a;x.fillStyle='#fff';x.strokeStyle='#fff';x.lineWidth=2;
   const jr=Math.min(v.h*.16,46),jx=v.x+v.w-jr-pad*1.5,jy=v.y+v.h-jr-pad*1.5;x.globalAlpha=(pd.jump?.45:.2)*a;x.beginPath();x.arc(jx,jy,jr,0,7);x.fill();x.globalAlpha=.6*a;outlined(x,'JUMP',jx,jy,{size:Math.round(jr*.42),fill:'#fff',stroke:'#08103a'});
   if(pd.stick){const st=pd.stick;x.globalAlpha=.25;x.beginPath();x.arc(st.sx,st.sy,40,0,7);x.stroke();x.globalAlpha=.4;x.beginPath();x.arc(clamp(st.x,st.sx-40,st.sx+40),clamp(st.y,st.sy-40,st.sy+40),16,0,7);x.fill();}
   else{x.globalAlpha=.16*a;const sx=v.x+v.w*.18,sy=v.y+v.h*.78;x.beginPath();x.arc(sx,sy,Math.min(v.h*.14,40),0,7);x.stroke();x.globalAlpha=.4*a;outlined(x,'◀ RUN ▶',sx,sy,{size:Math.round(size*.8),fill:'#fff',stroke:'#08103a'});}
   x.restore();}
 }
 function drawTitle(t){
  const W=s.W,H=s.H,k=t<.35?t/.35:t>2.1?Math.max(0,1-(t-2.1)/.35):1,e=1-(1-k)**3;
  x.save();x.fillStyle=`rgba(0,0,0,${.35*e})`;x.fillRect(0,0,W,H);
  x.fillStyle='#1a3ad8';x.fillRect(0,0,W*.16*e,H);x.fillStyle='#ffd21c';x.fillRect(W*(1-e),H*.7,W,H*.08);x.fillStyle='#e8282c';const rr0=Math.min(W,H)*.12;x.beginPath();x.arc(W*.78+(1-e)*W*.4,H*.6,rr0,0,7);x.fill();
  const size=Math.min(W*.075,H*.09,58);outlined(x,'GREEN HILL',W*.5-(1-e)*W,H*.36,{size,fill:'#fff',stroke:'#08103a'});outlined(x,'ZONE',W*.5+size*1.4-(1-e)*W*1.3,H*.36+size*1.05,{size,fill:'#fff',stroke:'#08103a'});
  outlined(x,mode==='rings'?'ACT 1':'ACT 2',W*.78+(1-e)*W*.4,H*.6,{size:size*.62,fill:HUD_YEL,stroke:'#08103a'});
  outlined(x,mode==='rings'?'RING RUSH · MOST RINGS IN 60 SECONDS':'GOAL DASH · FIRST TO THE SIGNPOST',W/2,H*.74,{size:Math.max(12,size*.34),fill:'#08103a',stroke:'#ffd21c',lw:2});
  x.restore();
 }

 s.debug={log,get phase(){return phase;},get clock(){return clock;},get turn(){return turn;},ghost,pl,L,worlds,setClock(v){clock=v;},teleport(i,X){const q=pl[i];q.x=X;q.y=groundAt(L,X)??q.y;q.grounded=true;q.on='ground';q.gsp=0;cams[i].x=X-150;}};
 // ---------------- turns: title → P1 hand-off → countdown → run → P2 hand-off → countdown → run vs ghost → results
 const score=q=>mode==='rings'?`${q.rings} rings`:q.finished?fmtRace(q.finishT):`${prog(q)}% of the way`;
 async function beginTurn(i){
  phase='handoff';turn=i;for(const pd of pads){pd.stick=null;pd.jump=null;}for(const inp of inputs)Object.assign(inp,{l:0,r:0,d:0,jump:0,press:0});
  const n0=s.players[0].name,desc=i===0?(mode==='rings'?`You run first: collect as many rings as you can in 60 seconds. ${s.players[1].name} runs next against your ghost.`:`You run first: reach the signpost as fast as you can. ${s.players[1].name} runs next against your ghost.`)
   :(mode==='rings'?`Beat ${n0}'s ${pl[0].rings} rings in 60 seconds. ${n0}'s ghost runs beside you.`:`Beat ${n0}'s ${pl[0].finished?'time of '+fmtRace(pl[0].finishT):'run'}. Follow or overtake ${n0}'s ghost.`);
  if(!await s.pass(i,desc,'Ready — start my countdown',{summary:i?`${n0}: ${score(pl[0])}. ${s.players[1].name}, take the controls.`:null}))return;
  clock=0;acc=0;gi=0;cd=new Countdown(3);phase='count';const p=pl[i];cams[i].x=p.x-120;cams[i].y=p.y-150;
 }
 const turnOver=p=>mode==='rings'?clock>=RING_TIME:p.finished&&clock-p.finishT>1.6||clock>=RACE_CAP||turn===1&&pl[0].finished&&!p.finished&&clock>pl[0].finishT+4;
 const still={l:0,r:0,d:0,jump:0,press:0};
 // ---------------- main loop
 s.frame((dt,t)=>{
  if(!s.alive)return;
  if(phase==='title'){titleT+=dt;if(titleT>2.45)beginTurn(0);}
  else if(phase==='count'){if(!cd.update(dt)){phase='play';for(const inp of inputs)inp.press=0;}}
  else if(phase==='play'||phase==='turn-end'||phase==='end'){
   if(!cd.done)cd.update(dt);acc+=dt;let steps=0;const p=pl[turn],w=worlds[turn];
   // rings freeze when time is up; a race keeps the finished runner jogging past the signpost
   const moving=phase==='play'||mode==='race';
   while(acc>=STEP&&steps<5){acc-=STEP;steps++;frames++;simT+=STEP;
    if(phase==='play')clock+=STEP;
    if(moving){readInput(turn);stepPlayer(p,w,phase==='play'?inputs[turn]:still);if(phase==='play')interact(p,w);stepWorld(w,p);p.best=Math.max(p.best,p.x);}
    if(turn===0&&phase!=='end')ghost.push(snap(p));else if(turn===1)gi++;
   }
   if(steps===5)acc=0;
   for(const w0 of worlds)w0.fx.update(dt);for(let i=0;i<2;i++)flash[i]=Math.max(0,flash[i]-dt*1.8);
   if(phase==='play'){
    if(turnOver(p)){endT=0;
     if(turn===0){phase='turn-end';turnText=mode==='rings'?`${p.rings} RINGS`:p.finished?fmtRace(p.finishT):`${prog(p)}% OF THE WAY`;}
     else{phase='end';const a=pl[0],b=pl[1];
      if(mode==='rings')winner=a.rings===b.rings?-2:a.rings>b.rings?0:1;
      else if(a.finished&&b.finished)winner=Math.abs(a.finishT-b.finishT)<.01?-2:a.finishT<b.finishT?0:1;
      else if(a.finished||b.finished)winner=a.finished?0:1;else winner=Math.abs(a.best-b.best)<4?-2:a.best>b.best?0:1;
      endText=winner===-2?'DEAD HEAT!':mode==='rings'?`${s.players[winner].name.toUpperCase()} WINS!`:`${s.players[winner].name.toUpperCase()} WINS THE DASH!`;
      if(winner>=0)s.react(winner,'win');jingle(mode==='rings'?[523,659,784,1047,1319]:[784,988,1175,1568,1319,1568],{type:'square',vol:.035,step:.1});}
     if(phase==='turn-end')jingle([523,659,784,1047],{type:'square',vol:.03,step:.09});}
   }else if(phase==='turn-end'){endT+=dt;if(endT>2.4)beginTurn(1);}
   else{endT+=dt;if(endT>3.4){
    if(mode==='rings'){const a=pl[0].rings,b=pl[1].rings;s.finish([a,b],`Green Hill Ring Rush: ${s.players[0].name} ${a} rings, ${s.players[1].name} ${b} rings.`);}
    else{const sc=[prog(pl[0]),prog(pl[1])];if(winner>=0){sc[winner]=100;sc[1-winner]=Math.min(sc[1-winner],99);}
     s.finish(sc,`Green Hill Goal Dash: ${s.players[0].name} ${score(pl[0])}, ${s.players[1].name} ${score(pl[1])}.`);}
    return;}}
   if(mode==='rings')s.setScores([pl[0].rings,pl[1].rings]);else s.setScores(pl.map(prog));
  }
  // draw
  x.fillStyle='#000';x.fillRect(0,0,s.W,s.H);
  drawView(turn,t);
  if(phase==='title')drawTitle(titleT);
  if(phase==='count'||!cd.done&&phase==='play')cd.draw(x,s.W,s.H);
  if(phase==='turn-end'||phase==='end'){const a=Math.min(1,endT*3),size=Math.min(s.W*.07,s.H*.07,48);x.save();x.globalAlpha=a;x.fillStyle='rgba(8,16,58,.55)';x.fillRect(0,s.H*.4,s.W,s.H*.2);
   if(phase==='turn-end'){outlined(x,mode==='rings'?'TIME UP':pl[0].finished?'GOT THROUGH!':'TIME UP',s.W/2,s.H/2-size*.3,{size,fill:HUD_YEL,stroke:'#08103a'});outlined(x,`${s.players[0].name.toUpperCase()}: ${turnText}`,s.W/2,s.H/2+size*.75,{size:size*.5,fill:'#fff',stroke:'#08103a'});}
   else{outlined(x,mode==='rings'&&endT<1.2?'TIME UP':endText,s.W/2,s.H/2-size*.3,{size,fill:HUD_YEL,stroke:'#08103a'});
    const sub=mode==='rings'?`${pl[0].rings} RINGS  ·  ${pl[1].rings} RINGS`:pl.map(q=>q.finished?fmtRace(q.finishT):`${prog(q)}%`).join('  ·  ');outlined(x,sub,s.W/2,s.H/2+size*.75,{size:size*.5,fill:'#fff',stroke:'#08103a'});}
   x.restore();}
 });
}

Object.assign(exports,{sonic,buildLevel,groundAt});
