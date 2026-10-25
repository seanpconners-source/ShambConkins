const {clamp}=require("src/utils.js");
const {PCOL,PDARK,PLIGHT,Fx,arenaKeys,arenaTouch,Countdown,banner,outlined,rr,heart,snd,noise,jingle,gestureHint}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField,roundOutcome}=require("src/engines/netField.js");
// Snowball Fight (after South Park): a top-down snowy yard. Drag to run, flick to throw, hold still to pack a big
// snowball, tap to build a snow wall. Three hearts each, best of three rounds.
// Online (netField): one fixed portrait yard (NW x NH) laid out point-symmetric from the seed. Each phone simulates in its
// own frame with its kid at the bottom: player 2's phone holds the yard turned round, and everything crossing over is
// turned with flip(). Each phone moves its own kid {r,x,y,...} 30/s and judges only snowballs that reach it ({h} back to
// the thrower, whose phone just guesses a hit and drops the ball). Walls keep damage per thrower (w.dmg) and only the
// thrower's phone counts its own balls' damage ({wd}); built walls go over as {w}. Rounds settle with roundOutcome.
const HEARTS=3,ROUND_CAP=30,WIN_ROUNDS=2,MAX_ROUNDS=4,NW=480,NH=860;
const PARKA=['#2f7bff','#ff5fa0'],PARKA_DARK=['#1b4fb5','#b83a73'];

function geo(W,H,online=false){if(online)return {u:.9,pr:18.9,bw:36,top:72,m:5.4};const u=clamp(Math.min(W/900,H/500),.72,1.3);return {u,pr:21*u,bw:40*u,top:Math.max(40,H*.09),m:6*u};}

async function snow(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.queueCanvasFit?.();s.shared=true;s.updateScores();
 const fx=new Fx(),rnd=s.random;
 const on=s.online||null,me=on?on.me:0,them=1-me,HUDY=on?40:0;let W=on?NW:s.W,H=on?NH:s.H,g=geo(W,H,!!on),sc=1,offx=0,offy=0;
 let sw0=s.W,sh0=s.H;const fit=()=>{if(!on)return;sc=Math.min(s.W/NW,(s.H-HUDY)/NH);offx=(s.W-NW*sc)/2;offy=HUDY+(s.H-HUDY-NH*sc)/2;};fit();
 // online: the yard as the other phone holds it (an involution: point mirror of the playing field)
 const flip=(px,py)=>[W-px,g.top+H-py];
 let walls=[],trees=[],balls=[],tracks=[],flakes=[],round=1,wins=[0,0],phase='intro',phaseT=0,roundT=ROUND_CAP,note='',time=0,hint=0;
 const intro=new Countdown(3),ps=[0,1].map(i=>({i,x:0,y:0,vx:0,vy:0,fx:i?-1:1,fy:0,hp:HEARTS,pack:0,loaded:0,cool:0,stun:0,inv:0,cover:0,build:0,joy:null,hurt:0,thrown:0,hits:0,kx:0,ky:0}));
 const kb=arenaKeys(s);
 // flakes for ambience
 for(let k=0;k<60;k++)flakes.push({x:Math.random(),y:Math.random(),z:.3+Math.random()*.7,ph:Math.random()*6});

 // ---------------------------------------------------------------- layout (mirrored so both sides are identical)
 const buildLayout=()=>{
  g=geo(W,H,!!on);walls=[];trees=[];balls=[];tracks=[];const R=seededLayout();
  if(on){netLayout(R);return;}
  const add=(nx,ny,hp=3)=>{for(const mx of [0,1]){const px=(mx?1-nx:nx)*W,py=ny*H;walls.push({x:px,y:py,w:g.bw,h:g.bw,hp,max:hp,shake:0});}};
  for(const [nx,ny] of R.forts)add(nx,ny);
  for(const [nx,ny] of R.mid){walls.push({x:nx*W,y:ny*H,w:g.bw,h:g.bw,hp:3,max:3,shake:0});walls.push({x:(1-nx)*W,y:(1-ny)*H,w:g.bw,h:g.bw,hp:3,max:3,shake:0});}
  for(const [nx,ny] of R.trees){trees.push({x:nx*W,y:ny*H,r:g.bw*.5});trees.push({x:(1-nx)*W,y:ny*H,r:g.bw*.5});}
  ps[0].x=W*.1;ps[1].x=W*.9;for(const p of ps){p.y=H*.55;p.vx=p.vy=0;p.hp=HEARTS;p.pack=0;p.loaded=0;p.cool=0;p.stun=0;p.inv=0;p.cover=0;p.build=0;p.fx=p.i?-1:1;p.fy=0;p.kx=p.ky=0;}
 };
 // online: the same seeded pieces laid along the portrait yard (u across, v from player 1's end), each with its point
 // mirror, in player 1's frame; player 2's phone turns it round. Walls get ids so damage events find them.
 const netLayout=R=>{
  const fh=H-g.top,P=(u,v)=>{const q=[u*W,g.top+(1-v)*fh];return me?flip(q[0],q[1]):q;};let n=0;
  const wall=(u,v)=>{const [px,py]=P(u,v);walls.push({id:'L'+(n++),x:px,y:py,w:g.bw,h:g.bw,hp:3,max:3,dmg:[0,0],shake:0});};
  for(const [nx,ny] of [...R.forts,...R.mid]){wall(ny,nx);wall(1-ny,1-nx);}
  for(const [nx,ny] of R.trees)for(const [u,v] of [[ny,nx],[1-ny,1-nx]]){const [px,py]=P(clamp(u,.06,.94),v);trees.push({x:px,y:py,r:g.bw*.5});}
  for(const p of ps){const [px,py]=P(p.i?.45:.55,p.i?.92:.08);p.x=px;p.y=py;p.vx=p.vy=0;p.hp=HEARTS;p.pack=0;p.loaded=0;p.cool=0;p.stun=0;p.inv=0;p.cover=0;p.build=0;p.fx=0;p.fy=p.i===me?-1:1;p.kx=p.ky=0;p.hurt=0;}
  seen.at=0;wallN=0;ballN=0;
 };
 const layoutRand=()=>{const r=rnd;return r;};
 const seededLayout=()=>{const r=layoutRand(),pick=()=>r(),forts=[[.25,.34],[.25,.72],[.31,.53]],mid=[],tr=[];
  forts[0][1]+=(pick()-.5)*.08;forts[1][1]+=(pick()-.5)*.08;
  const nm=2+Math.floor(pick()*2);for(let k=0;k<nm;k++)mid.push([.43+pick()*.1,.2+pick()*.65]);
  tr.push([.1+pick()*.07,.17],[.1+pick()*.07,.9],[.2,.98-pick()*.05]);return {forts,mid,trees:tr};};

 // ---------------------------------------------------------------- helpers
 const wallHit=(px,py,r,w)=>{const nx=clamp(px,w.x-w.w/2,w.x+w.w/2),ny=clamp(py,w.y-w.h/2,w.y+w.h/2);return Math.hypot(px-nx,py-ny)<r;};
 const blocked=(px,py,r,skip=null)=>{for(const w of walls)if(w!==skip&&wallHit(px,py,r,w))return true;for(const t of trees)if(Math.hypot(px-t.x,py-t.y)<r+t.r)return true;return false;};
 const bounds=(p)=>{p.x=clamp(p.x,g.pr+g.m,W-g.pr-g.m);p.y=clamp(p.y,g.top+g.pr+(on?g.m:0),H-g.pr-g.m);};
 const pushOut=(p)=>{for(const w of walls){const nx=clamp(p.x,w.x-w.w/2,w.x+w.w/2),ny=clamp(p.y,w.y-w.h/2,w.y+w.h/2);let dx=p.x-nx,dy=p.y-ny,d=Math.hypot(dx,dy);if(d<g.pr){if(d<.001){dx=p.x-w.x;dy=p.y-w.y;d=Math.hypot(dx,dy)||1;}p.x+=dx/d*(g.pr-d);p.y+=dy/d*(g.pr-d);}}
  for(const t of trees){const dx=p.x-t.x,dy=p.y-t.y,d=Math.hypot(dx,dy);if(d<g.pr+t.r){p.x+=dx/d*(g.pr+t.r-d);p.y+=dy/d*(g.pr+t.r-d);}}};

 const throwBall=(p,dx,dy)=>{
  if(phase!=='play'||p.stun>0||p.cool>0||on&&OC?.R.frozen)return false;let l=Math.hypot(dx,dy);if(l<.01){dx=p.fx;dy=p.fy;l=1;}dx/=l;dy/=l;
  const foe=ps[1-p.i];let ax=foe.x-p.x,ay=foe.y-p.y,al=Math.hypot(ax,ay)||1;ax/=al;ay/=al;
  const dot=dx*ax+dy*ay;if(dot>.985){const t=.35;dx=dx*(1-t)+ax*t;dy=dy*(1-t)+ay*t;l=Math.hypot(dx,dy);dx/=l;dy/=l;}
  const big=p.loaded>=.45,size=big?.55+p.loaded*.5:0;
  const ball={id:`${p.i}:${ballN++}`,x:p.x+dx*g.pr,y:p.y+dy*g.pr,vx:dx*(big?470:600)*g.u,vy:dy*(big?470:600)*g.u,r:(big?10+size*10:6.5)*g.u,big,owner:p.i,life:big?1.5:1.15,age:0,spin:Math.random()*6};balls.push(ball);
  if(on)nf.event({r:round,t:[ball.id,+ball.x.toFixed(1),+ball.y.toFixed(1),+ball.vx.toFixed(1),+ball.vy.toFixed(1),+ball.r.toFixed(2),big?1:0]});
  p.fx=dx;p.fy=dy;p.cool=big?.55:.32;p.loaded=0;p.pack=0;p.thrown++;
  noise(.12,{vol:.06,freq:big?500:1400});snd(big?160:300,.12,{type:'sine',to:big?80:150,vol:.04});
  fx.burst(p.x+dx*g.pr,p.y+dy*g.pr,{n:big?9:4,color:'#fff',speed:120,life:.3,size:3*g.u,angle:Math.atan2(dy,dx),spread:1.2});
  return true;
 };
 const buildWall=p=>{
  if(phase!=='play'||p.stun>0||p.build>0||on&&OC?.R.frozen)return;
  const alive=walls.filter(w=>w.owner===p.i).length;let gone=null;if(alive>=4){const oldest=walls.find(w=>w.owner===p.i);if(oldest){walls.splice(walls.indexOf(oldest),1);gone=oldest.id??null;}}
  let dx=p.fx,dy=p.fy;if(!dx&&!dy)dx=p.i?-1:1;const d=g.pr+g.bw*.5+3,px=p.x+dx*d,py=p.y+dy*d;
  const w={id:`${p.i}w${wallN++}`,x:px,y:py,w:g.bw,h:g.bw,hp:2,max:2,dmg:[0,0],shake:.3,owner:p.i};
  if(px<g.bw/2||px>W-g.bw/2||py<g.top+g.bw/2||py>H-g.bw/2||ps.some(q=>wallHit(q.x,q.y,g.pr,w))||blocked(px,py,g.bw*.45)){snd(140,.1,{type:'square',vol:.03});fx.pop(p.x,p.y-g.pr*2.2,'no room',{size:14*g.u+4,color:'#fff'});return;}
  walls.push(w);p.build=1.1;if(on)nf.event({r:round,w:[w.id,+px.toFixed(1),+py.toFixed(1),gone]});noise(.14,{vol:.06,freq:600});snd(220,.1,{type:'triangle',vol:.04,to:330});fx.burst(px,py,{n:10,color:'#fff',colors:['#fff','#cfe8ff'],speed:110,life:.4,size:3*g.u,gravity:80});
 };
 const hurt=(p,b)=>{
  if(p.inv>0||phase!=='play')return false;p.hp--;p.hits++;
  const l=Math.hypot(b.vx,b.vy)||1;p.kx=b.vx/l*(b.big?420:230)*g.u;p.ky=b.vy/l*(b.big?420:230)*g.u;
  hurtFx(p,b.big,b.owner);if(on){nf.event({r:round,h:[b.id,p.hp,b.big?1:0]});if(p.hp<=0)OC?.die(rt(),0);nf.push();}return true;
 };
 const hurtFx=(p,big,owner)=>{
  const b={big,owner};p.inv=.8;p.stun=b.big?.5:.28;p.cover=2.8;p.hurt=.5;
  fx.burst(p.x,p.y-g.pr,{n:b.big?26:14,colors:['#fff','#e8f4ff','#bcdcff'],speed:260,life:.55,size:4.5*g.u,gravity:150});fx.ring(p.x,p.y-g.pr,{color:'#fff',r1:g.pr*2.4,life:.3,width:5});
  fx.pop(p.x,p.y-g.pr*3,['SPLAT!','FWAP!','OH MY GOD!','POOF!'][Math.floor(Math.random()*4)],{color:'#fff',stroke:'#2a4a7a',size:Math.max(17,g.u*24)});
  fx.shake(b.big?14:7);noise(.2,{vol:.09,freq:900});snd(b.big?100:160,.2,{type:'sawtooth',to:50,vol:.05});s.react?.(p.i,'sad');s.react?.(b.owner,'happy');
  try{navigator.vibrate?.(b.big?40:20);}catch{}
 };

 // ---------------------------------------------------------------- touch + keyboard
 const touch=arenaTouch(s,{
  maxFingers:2,
  onDown:f=>{const p=ps[f.owner];if(!p.joy||!touch?.fingers.has(p.joy.id)){p.joy={id:f.id,ax:f.x,ay:f.y};}f.data.role=p.joy.id===f.id?'move':'aux';},
  onMove:f=>{const p=ps[f.owner];if(p.joy?.id===f.id){const dx=f.x-p.joy.ax,dy=f.y-p.joy.ay,d=Math.hypot(dx,dy),lim=70*g.u;if(d>lim){p.joy.ax=f.x-dx/d*lim;p.joy.ay=f.y-dy/d*lim;}}},
  onUp:(f,cancelled)=>{
   const p=ps[f.owner];if(p.joy?.id===f.id)p.joy=null;if(cancelled||phase!=="play")return;
   if(f.vel.speed>520){throwBall(p,f.vel.x,f.vel.y);}
   else if(f.moved<16&&f.held<240&&p.loaded<.2)buildWall(p);
  }
 });
 const keyHold=[0,0];
 kb.onDown((i,k)=>{if(k==='fire')keyHold[i]=.001;});
 kb.onUp((i,k)=>{if(k==='fire'&&keyHold[i]>0){const p=ps[i];if(keyHold[i]>.45){p.loaded=p.pack;}throwBall(p,p.fx,p.fy);keyHold[i]=0;p.pack=0;}});
 for(const [i,key] of [[0,'e'],[1,'.']])s.on(document,'keydown',ev=>{if(ev.key.toLowerCase()===key&&!ev.repeat&&!s.paused){ev.preventDefault();buildWall(ps[on?me:i]);}});
 s.hint('Snowy yard, three hearts each. DRAG your half to run. FLICK (swipe fast and lift) to throw a snowball that way. HOLD a finger still to pack a bigger snowball, then flick to throw it: it smashes walls and knocks back. TAP to build a snow wall in front of you. Best of three rounds. P1: WASD, Space throws (hold = big), E builds. P2: arrows, Enter throws, . builds.');

 // ---------------------------------------------------------------- update
 const startRound=()=>{buildLayout();phase='ready';phaseT=1.25;roundT=ROUND_CAP;note=`ROUND ${round}`;snd(330,.12,{type:'square',vol:.04});};
 const endRound=(winner,why)=>{
  phase='roundover';phaseT=2.1;if(winner>=0){wins[winner]++;note=`${s.players[winner].name} takes round ${round}`;s.react?.(winner,'win');jingle([523,659,784],{vol:.05});}else note=`Round ${round}: a draw`;
  s.setScores(wins.slice());void why;
 };
 // vs CPU: kid 2 keeps a throwing distance, sidesteps snowballs coming its way and throws with lead when the line is clear
 const cpu=isCpu(s);let cpuT=.8,cpuStrafe=1,cpuStrafeT=0;
 const clearShot=(a,b)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/(g.pr*.8));for(let q=1;q<n;q++)if(blocked(a.x+(b.x-a.x)*q/n,a.y+(b.y-a.y)*q/n,4))return false;return true;};
 function cpuThink(dt,i=1){const p=ps[i],o=ps[1-i],sk=cpuSkill(s),key=(k,v)=>{if(on)kb.state[i][k]=v?1:0;else kb.cpu(k,v);};if(phase!=='play'){for(const k of ['l','r','u','d'])key(k,false);return;}
  let dx=o.x-p.x,dy=o.y-p.y;const d=Math.hypot(dx,dy)||1,want=W*.36;let mx=(d-want)/d*dx*.02,my=dy/d*.6;
  cpuStrafeT-=dt;if(cpuStrafeT<=0){cpuStrafeT=.8+Math.random()*1.2;cpuStrafe=Math.random()<.5?-1:1;}my+=cpuStrafe*.7;
  for(const b of balls){if(b.owner!==1-i)continue;const rx=p.x-b.x,ry=p.y-b.y,dist=Math.hypot(rx,ry),app=(rx*b.vx+ry*b.vy)/(dist*Math.hypot(b.vx,b.vy)||1);if(dist<220*g.u&&app>.85&&Math.random()<.3+sk*.7){const side=(-b.vy*rx+b.vx*ry)>0?1:-1;mx+=-b.vy/Math.hypot(b.vx,b.vy)*side*2;my+=b.vx/Math.hypot(b.vx,b.vy)*side*2;}}
  key('r',mx>.3);key('l',mx<-.3);key('d',my>.3);key('u',my<-.3);
  cpuT-=dt;if(cpuT<=0&&p.cool<=0&&p.stun<=0){cpuT=.7+(1-sk)*.9+Math.random()*.5;const lead=d/(600*g.u),tx=o.x+o.vx*lead*sk,ty=o.y+o.vy*lead*sk,err=(1-sk)*.35;if(clearShot(p,{x:tx,y:ty})||Math.random()<.2){const a=Math.atan2(ty-p.y,tx-p.x)+(Math.random()-.5)*err;throwBall(p,Math.cos(a),Math.sin(a));}}}
 // ---------------------------------------------------------------- online
 let OC=null,playT0=0,netBot=false,wallN=0,ballN=0;const pendO=[],seen={x:0,y:0,vx:0,vy:0,at:0};
 const rt=()=>(performance.now()-playT0)/1000;
 const wallDmg=(w,by,n)=>{if(!on){w.hp-=n;return;}w.dmg[by]+=n;w.hp=w.max-w.dmg[0]-w.dmg[1];};
 const clearWalls=()=>{for(let k=walls.length-1;k>=0;k--)if(walls[k].hp<=0){const o=walls[k];fx.burst(o.x,o.y,{n:22,colors:['#fff','#cfe8ff','#9fc8f2'],speed:230,life:.6,size:5*g.u,gravity:200,shape:'square'});fx.ring(o.x,o.y,{color:'#cfe8ff',r1:g.bw,life:.3});fx.shake(5);snd(120,.2,{type:'sawtooth',to:50,vol:.04});walls.splice(k,1);}};
 const nf=netField(s,{hz:30,
  pack:()=>{const p=ps[me];return {r:round,x:+p.x.toFixed(1),y:+p.y.toFixed(1),vx:Math.round(p.vx),vy:Math.round(p.vy),f:[+p.fx.toFixed(2),+p.fy.toFixed(2)],l:+p.loaded.toFixed(2),hp:p.hp};},
  unpack:(i,d)=>{if(d?.r!==round||![d.x,d.y].every(Number.isFinite))return;const p=ps[them],[fx2,fy2]=flip(d.x,d.y);Object.assign(seen,{x:fx2,y:fy2,vx:-(+d.vx||0),vy:-(+d.vy||0),at:performance.now()});
   if(Array.isArray(d.f)){p.fx=-(+d.f[0]||0);p.fy=-(+d.f[1]||0);}p.loaded=+d.l||0;if(Number.isFinite(d.hp))p.hp=d.hp;},
  onEvent:e=>{
   if(Array.isArray(e.o)){if(OC&&e.o[0]===round)OC.feed(e.o);else if(e.o[0]>=round)pendO.push(e.o);return;}
   if(e.r!==round)return;const p=ps[them];
   if(Array.isArray(e.t)){const [id,bx,by,vx,vy,r,big]=e.t;if([bx,by,vx,vy,r].every(Number.isFinite)){const [px,py]=flip(bx,by);balls.push({id,x:px,y:py,vx:-vx,vy:-vy,r,big:!!big,owner:them,life:big?1.5:1.15,age:0,spin:Math.random()*6});
     noise(.12,{vol:.05,freq:big?500:1400});fx.burst(px,py,{n:big?9:4,color:'#fff',speed:120,life:.3,size:3*g.u,angle:Math.atan2(-vy,-vx),spread:1.2});p.cool=big?.55:.32;}}
   else if(Array.isArray(e.h)){const [id,hp,big]=e.h;const k=balls.findIndex(b=>b.id===id);if(k>=0)balls.splice(k,1);if(Number.isFinite(hp))p.hp=Math.max(0,hp);p.hits++;hurtFx(p,!!big,me);}
   else if(Array.isArray(e.wd)){for(const [id,v] of e.wd){const w=walls.find(q=>q.id===id);if(w&&Number.isFinite(v)&&v>w.dmg[them]){w.dmg[them]=v;w.hp=w.max-w.dmg[0]-w.dmg[1];w.shake=.25;}}clearWalls();}
   else if(Array.isArray(e.w)){const [id,wx,wy,gone]=e.w;if(gone!=null){const k=walls.findIndex(q=>q.id===gone);if(k>=0)walls.splice(k,1);}
    if(Number.isFinite(wx)&&Number.isFinite(wy)){const [px,py]=flip(wx,wy);walls.push({id,x:px,y:py,w:g.bw,h:g.bw,hp:2,max:2,dmg:[0,0],shake:.3,owner:them});noise(.14,{vol:.05,freq:600});fx.burst(px,py,{n:10,color:'#fff',colors:['#fff','#cfe8ff'],speed:110,life:.4,size:3*g.u,gravity:80});}}}});
 // the other kid on this phone: eased toward its last snapshot, run a little ahead by its speed
 const theirStep=(p,dt)=>{if(!seen.at)return;const k=Math.min(.1,(performance.now()-seen.at)/1000),tx=seen.x+seen.vx*k,ty=seen.y+seen.vy*k,e=Math.min(1,dt*18);
  p.x+=(tx-p.x)*e;p.y+=(ty-p.y)*e;p.vx=seen.vx;p.vy=seen.vy;if(Math.hypot(p.vx,p.vy)>40*g.u&&Math.random()<dt*9)tracks.push({x:p.x,y:p.y+g.pr*.9,a:1,rot:Math.atan2(p.vy,p.vx)});};
 const update=dt=>{
  time+=dt;if(cpu)cpuThink(dt);if(netBot)cpuThink(dt,me);
  if(phase==='intro'){if(!intro.update(dt))startRound();}
  else if(phase==='ready'){phaseT-=dt;if(phaseT<=0){phase='play';snd(660,.2,{type:'square',vol:.05});
   if(on){playT0=performance.now();OC=roundOutcome(nf,round);const keep=[];for(const o of pendO.splice(0))if(o[0]===round)OC.feed(o);else if(o[0]>round)keep.push(o);pendO.push(...keep);}}}
  else if(phase==='play'&&on){
   // online: the round ends once both phones have called it (roundOutcome); a time-up between two kids still standing goes to hearts
   roundT=Math.max(0,roundT-dt);if(roundT<=0)OC.timeUp(ps[me].hp);const res=OC.tick(rt(),()=>ps[me].hp);
   if(res){const a=+OC.R.extra||0,b=+OC.R.theirExtra||0;endRound(res==='me'?me:res==='them'?them:a===b?-1:a>b?me:them);}}
  else if(phase==='play'){
   roundT-=dt;
   const d=ps.findIndex(p=>p.hp<=0);
   if(d>=0)endRound(1-d);else if(roundT<=0){roundT=0;endRound(ps[0].hp===ps[1].hp?-1:ps[0].hp>ps[1].hp?0:1);}
  }
  else if(phase==='roundover'||phase==='gameover'){
   phaseT-=dt;if(phaseT<=0){
    if(phase==='gameover'){s.finish([wins[0]*10+ps[0].hp,wins[1]*10+ps[1].hp],`Snowball Fight: ${wins[0]}–${wins[1]} in rounds`);return;}
    if(wins.some(w=>w>=WIN_ROUNDS)||round>=MAX_ROUNDS){phase='gameover';phaseT=2.2;const w=wins[0]===wins[1]?-1:wins[0]>wins[1]?0:1;note=w<0?'A TIE!':`${s.players[w].name} wins!`;jingle([523,659,784,1047,1319],{vol:.05,step:.09});}
    else if(on){round++;phase='sync';void nf.start('r'+round).then(()=>{if(s.alive)startRound();});}
    else{round++;startRound();}
   }
  }
  const live=phase==='play';
  for(const p of ps){
   p.cool=Math.max(0,p.cool-dt);p.stun=Math.max(0,p.stun-dt);p.inv=Math.max(0,p.inv-dt);p.cover=Math.max(0,p.cover-dt);p.build=Math.max(0,p.build-dt);p.hurt=Math.max(0,p.hurt-dt);
   if(on&&p.i!==me){if(phase==='play'||phase==='roundover')theirStep(p,dt);continue;}
   if(on&&OC?.R.frozen&&phase==='play'){p.vx*=Math.exp(-14*dt);p.vy*=Math.exp(-14*dt);continue;}
   let mx=0,my=0;
   const k=kb.state[p.i];mx+=k.r-k.l;my+=k.d-k.u;
   if(live&&p.stun<=0){
    if(p.joy){const f=touch.fingers.get(p.joy.id);if(f){const dx=f.x-p.joy.ax,dy=f.y-p.joy.ay,d=Math.hypot(dx,dy),dz=9*g.u;if(d>dz){const m=Math.min(1,(d-dz)/(34*g.u));mx+=dx/d*m;my+=dy/d*m;}}}
    // pack: any stationary finger of this player
    let packing=false;for(const f of touch.fingers.values())if(f.owner===p.i&&f.moved<14&&performance.now()-f.t0>180)packing=true;
    if(keyHold[p.i]>0){keyHold[p.i]+=dt;if(keyHold[p.i]>.3)packing=true;}
    if(packing){p.pack=Math.min(1,p.pack+dt/1.05);p.loaded=Math.max(p.loaded,p.pack);if(p.pack>=1&&!p.full){p.full=true;snd(880,.1,{type:'triangle',vol:.04});fx.ring(p.x,p.y-g.pr*2,{color:'#fff',r1:g.pr*2.2});}if(Math.random()<.4)fx.burst(p.x+p.fx*g.pr,p.y,{n:1,color:'#fff',speed:60,life:.3,size:2.5*g.u});}
    else{p.pack=Math.max(0,p.pack-dt*.5);p.full=p.pack>=1;}
    const l=Math.hypot(mx,my);if(l>.05){const sp=205*g.u*(p.loaded>.4?.72:1)*Math.min(1,l);p.vx=mx/l*sp;p.vy=my/l*sp;p.fx=mx/l;p.fy=my/l;}else{p.vx*=Math.exp(-14*dt);p.vy*=Math.exp(-14*dt);}
    p.x+=p.vx*dt;p.y+=p.vy*dt;if(Math.hypot(p.vx,p.vy)>40*g.u&&Math.random()<dt*9)tracks.push({x:p.x,y:p.y+g.pr*.9,a:1,rot:Math.atan2(p.vy,p.vx)});
   }else{p.vx=p.kx;p.vy=p.ky;p.x+=p.kx*dt;p.y+=p.ky*dt;p.kx*=Math.exp(-6*dt);p.ky*=Math.exp(-6*dt);}
   pushOut(p);bounds(p);
   if(!live&&phase!=='ready'){}
  }
  // balls
  for(let i=balls.length-1;i>=0;i--){
   const b=balls[i];b.age+=dt;b.life-=dt;const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/(b.r*.8))),h=dt/steps;let dead=false;
   for(let st=0;st<steps&&!dead;st++){
    b.x+=b.vx*h;b.y+=b.vy*h;
    if(b.x<0||b.x>W||b.y<g.top*.6||b.y>H){dead=true;fx.burst(clamp(b.x,0,W),clamp(b.y,0,H),{n:5,color:'#fff',speed:90,life:.3,size:2.5*g.u});break;}
    for(const t of trees)if(Math.hypot(b.x-t.x,b.y-t.y)<b.r+t.r*.8){dead=true;fx.burst(b.x,b.y,{n:8,color:'#fff',speed:110,life:.35,size:3*g.u,gravity:60});noise(.06,{vol:.03,freq:1500});break;}
    if(dead)break;
    for(let wi=walls.length-1;wi>=0;wi--){const w=walls[wi];if(wallHit(b.x,b.y,b.r,w)){
     // online only the thrower's phone counts its balls' damage (and tells the other phone); theirs just splat here
     const count=!on||b.owner===me,hitW=[];if(count){wallDmg(w,b.owner,b.big?3:1);hitW.push(w);}w.shake=.25;dead=true;fx.burst(b.x,b.y,{n:b.big?16:8,colors:['#fff','#cfe8ff'],speed:150,life:.4,size:3.5*g.u,gravity:120});noise(.09,{vol:.05,freq:1000});
     if(b.big&&count)for(const o of walls)if(o!==w&&Math.hypot(o.x-w.x,o.y-w.y)<g.bw*1.7){wallDmg(o,b.owner,1);hitW.push(o);}
     if(on&&hitW.length)nf.event({r:round,wd:hitW.filter(o=>o.id).map(o=>[o.id,o.dmg[me]])});
     clearWalls();
     break;}}
    if(dead)break;
    const q=ps[1-b.owner];if(Math.hypot(b.x-q.x,b.y-q.y)<b.r+g.pr*.92&&q.inv<=0&&phase==='play'){
     // online: a ball only hurts the kid on its own phone; one reaching the other kid here is a guessed hit (their phone calls it)
     if(!on)hurt(q,b);else if(q.i===me){if(!OC?.R.frozen)hurt(q,b);else continue;}else fx.burst(b.x,b.y,{n:6,color:'#fff',speed:90,life:.3,size:3*g.u});
     dead=true;break;}
   }
   if(dead||b.life<=0){if(!dead)fx.burst(b.x,b.y,{n:5,color:'#fff',speed:70,life:.3,size:2.5*g.u});balls.splice(i,1);}
  }
  for(const w of walls)w.shake=Math.max(0,w.shake-dt);
  for(const t of tracks)t.a-=dt*.35;tracks=tracks.filter(t=>t.a>0);if(tracks.length>160)tracks.splice(0,tracks.length-160);
  for(const f of flakes){f.y+=dt*.04*f.z;f.x+=Math.sin(time*.7+f.ph)*dt*.01;if(f.y>1)f.y=0;}
  fx.update(dt);if(on&&phase!=='sync'&&phase!=='intro')nf.tick(dt);
  s.setScores(wins.slice());
 };

 // ---------------------------------------------------------------- draw
 const drawTree=(t)=>{
  x.fillStyle='#00000026';x.beginPath();x.ellipse(t.x,t.y+t.r*.9,t.r*1.1,t.r*.4,0,0,6.283);x.fill();
  x.fillStyle='#5a3a22';x.fillRect(t.x-t.r*.18,t.y+t.r*.2,t.r*.36,t.r*.8);
  for(let k=0;k<3;k++){const w=t.r*(1.5-k*.32),y=t.y+t.r*(.45-k*.75);x.fillStyle=k%2?'#1f6b3d':'#2a8a4f';x.beginPath();x.moveTo(t.x-w,y);x.lineTo(t.x+w,y);x.lineTo(t.x,y-t.r*1.1);x.closePath();x.fill();x.fillStyle='#f4fbff';x.beginPath();x.moveTo(t.x-w*.55,y-t.r*.45);x.lineTo(t.x+w*.55,y-t.r*.45);x.lineTo(t.x,y-t.r*1.1);x.closePath();x.fill();}
 };
 const drawWall=(w)=>{
  const sh=w.shake>0?Math.sin(time*80)*2:0,px=w.x-w.w/2+sh,py=w.y-w.h/2,hr=w.hp/w.max;
  x.fillStyle='#00000026';x.beginPath();x.ellipse(w.x,w.y+w.h*.5,w.w*.6,w.h*.2,0,0,6.283);x.fill();
  const gr=x.createLinearGradient(0,py,0,py+w.h);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#a9cdee');
  rr(x,px,py,w.w,w.h,w.w*.3);x.fillStyle=gr;x.fill();x.lineWidth=2.5;x.strokeStyle='#6a9ccc';x.stroke();
  x.strokeStyle='#8fb6dc';x.lineWidth=1.6;x.beginPath();x.moveTo(px+w.w*.1,py+w.h*.5);x.lineTo(px+w.w*.9,py+w.h*.5);x.moveTo(px+w.w*.5,py+w.h*.08);x.lineTo(px+w.w*.5,py+w.h*.5);x.stroke();
  if(hr<1){x.strokeStyle='#5d86b0';x.lineWidth=2;x.beginPath();x.moveTo(px+w.w*.25,py+w.h*.2);x.lineTo(px+w.w*.45,py+w.h*.45);x.lineTo(px+w.w*.35,py+w.h*.7);x.moveTo(px+w.w*.7,py+w.h*.25);x.lineTo(px+w.w*.6,py+w.h*.55);x.stroke();}
 };
 const drawPlayer=(p)=>{
  const i=p.i,pr=g.pr,wob=Math.sin(time*14+i)*(Math.hypot(p.vx,p.vy)>30*g.u?1.6:0),hs=pr*2.75,flash=p.inv>0&&Math.floor(time*20)%2===0&&p.hurt<=0;
  if(flash)x.globalAlpha=.55;
  x.fillStyle='#00000030';x.beginPath();x.ellipse(p.x,p.y+pr*1.15,pr*1.1,pr*.4,0,0,6.283);x.fill();
  // legs
  x.fillStyle='#3a2a1c';for(const sg of [-1,1]){x.beginPath();x.ellipse(p.x+sg*pr*.45,p.y+pr*1.05+(sg>0?wob:-wob)*.5,pr*.38,pr*.28,0,0,6.283);x.fill();}
  // parka body
  const bg=x.createLinearGradient(0,p.y-pr*.3,0,p.y+pr*1.1);bg.addColorStop(0,PARKA[i]);bg.addColorStop(1,PARKA_DARK[i]);x.fillStyle=bg;x.beginPath();x.ellipse(p.x,p.y+pr*.45,pr*1.05,pr*.95,0,0,6.283);x.fill();x.strokeStyle='#0d1830';x.lineWidth=2;x.stroke();
  x.fillStyle='#ffffff55';x.fillRect(p.x-pr*.05,p.y+pr*.05,pr*.1,pr*.95);
  // mittens
  x.fillStyle=PARKA_DARK[i];for(const sg of [-1,1]){x.beginPath();x.arc(p.x+sg*pr*1.05+p.fx*pr*.3*(sg>0?1:0),p.y+pr*.45+p.fy*pr*.3,pr*.3,0,6.283);x.fill();}
  // fur hood
  x.fillStyle='#f6f2ea';x.beginPath();x.ellipse(p.x,p.y-pr*.5+wob*.3,hs*.46,hs*.44,0,0,6.283);x.fill();x.strokeStyle='#cfc7b8';x.lineWidth=2;x.stroke();
  s.sprite(x,i,p.x,p.y-pr*.52+wob*.3,hs*.8,{exact:true,mood:p.hurt>0?'sad':p.loaded>.4?'angry':p.cool>0?'win':'walking'});
  // snow splat on the face
  if(p.cover>0){const a=clamp(p.cover/.8,0,1),sx=p.x,sy=p.y-pr*.6;x.globalAlpha=a*(flash?.55:1);x.fillStyle='#fff';x.strokeStyle='#bcd8f2';x.lineWidth=2;x.beginPath();x.ellipse(sx,sy-pr*.1,hs*.36,hs*.3,0,0,6.283);x.fill();x.stroke();
   for(const [ox,oy,r] of [[-.3,.28,.12],[.05,.4,.16],[.32,.25,.1],[-.1,.5,.09]]){x.beginPath();x.arc(sx+ox*hs,sy+oy*hs*.9,r*hs*.5,0,6.283);x.fill();}x.fillStyle='#d9ebfb';x.beginPath();x.arc(sx-hs*.1,sy-hs*.12,hs*.07,0,6.283);x.arc(sx+hs*.14,sy-hs*.05,hs*.05,0,6.283);x.fill();x.globalAlpha=flash?.55:1;}
  // packed snowball above the head
  if(p.loaded>.05){const r=(7+p.loaded*16)*g.u,bx=p.x+p.fx*pr*.6,by=p.y-pr*2.5-r*.2+Math.sin(time*8)*1.5;x.fillStyle='#00000022';x.beginPath();x.ellipse(bx,by+r*1.05,r*.8,r*.25,0,0,6.283);x.fill();const bg2=x.createRadialGradient(bx-r*.3,by-r*.3,r*.1,bx,by,r);bg2.addColorStop(0,'#fff');bg2.addColorStop(1,p.loaded>=1?'#ffe7a0':'#b6d5f0');x.fillStyle=bg2;x.beginPath();x.arc(bx,by,r,0,6.283);x.fill();x.strokeStyle=p.loaded>=1?'#ffb300':'#7fa7cf';x.lineWidth=2;x.stroke();}
  x.globalAlpha=1;
  // hearts
  for(let h=0;h<HEARTS;h++)heart(x,p.x+(h-1)*pr*.95,p.y-pr*3.0-(p.loaded>.05?pr*1.0:0),pr*.78,h<p.hp?'#ff3b4e':'#5a6280',h<p.hp?'#fff':'#9aa3c0');
 };
 const draw=()=>{
  // online: the fixed yard scaled into the screen below the duel chip
  if(on){x.clearRect(0,0,s.W,s.H);x.fillStyle='#16223a';x.fillRect(0,0,s.W,s.H);x.save();x.translate(offx,offy);x.scale(sc,sc);x.beginPath();x.rect(0,0,W,H);x.clip();}
  x.clearRect(0,0,W,H);fx.begin(x);
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#cfe6f8');bg.addColorStop(.12,'#f1f8ff');bg.addColorStop(1,'#dcecfa');x.fillStyle=bg;x.fillRect(-20,-20,W+40,H+40);
  // sky band + houses
  x.fillStyle='#8fb6dc';x.fillRect(0,0,W,g.top*.55);x.fillStyle='#b5d3ee';for(let k=0;k<7;k++){const hx=(k+.5)*W/7,hw=W/9;x.fillStyle=['#e38b6a','#8aa7d8','#e8c868','#a88ac8'][k%4];x.fillRect(hx-hw/2,g.top*.18,hw,g.top*.4);x.fillStyle='#fff';x.beginPath();x.moveTo(hx-hw/2-3,g.top*.18);x.lineTo(hx,g.top*.0);x.lineTo(hx+hw/2+3,g.top*.18);x.closePath();x.fill();}
  // drifts
  x.fillStyle='#ffffff';for(let k=0;k<14;k++){const dx=((k*173)%W),dy=g.top+((k*97)%(H-g.top));x.globalAlpha=.55;x.beginPath();x.ellipse(dx,dy,30*g.u+(k%3)*14,9*g.u,0,0,6.283);x.fill();}x.globalAlpha=1;
  // half tint + center line
  const TINT=['#4aa3ff10','#ff6fa810'];x.strokeStyle='#8fb6dc66';x.lineWidth=3;x.setLineDash([12,12]);x.beginPath();
  if(on){const mid=(g.top+H)/2;x.fillStyle=TINT[them];x.fillRect(0,g.top*.55,W,mid-g.top*.55);x.fillStyle=TINT[me];x.fillRect(0,mid,W,H-mid);x.moveTo(0,mid);x.lineTo(W,mid);}
  else{x.fillStyle=TINT[0];x.fillRect(0,g.top*.55,W/2,H);x.fillStyle=TINT[1];x.fillRect(W/2,g.top*.55,W/2,H);x.moveTo(W/2,g.top*.55);x.lineTo(W/2,H);}
  x.stroke();x.setLineDash([]);
  for(const t of tracks){x.globalAlpha=t.a*.4;x.fillStyle='#8fb0d0';x.beginPath();x.ellipse(t.x,t.y,5*g.u,2.5*g.u,t.rot,0,6.283);x.fill();}x.globalAlpha=1;
  // depth-sorted things
  const things=[...walls.map(w=>({y:w.y+w.h/2,d:()=>drawWall(w)})),...trees.map(t=>({y:t.y+t.r,d:()=>drawTree(t)})),...ps.map(p=>({y:p.y+g.pr,d:()=>drawPlayer(p)}))];
  things.sort((a,b)=>a.y-b.y);for(const t of things)t.d();
  // snowballs (with a fake arc)
  for(const b of balls){const lift=Math.sin(Math.min(1,b.age*2.2)*Math.PI*.5)*b.r*1.1;x.fillStyle='#0000001c';x.beginPath();x.ellipse(b.x,b.y+b.r*.9,b.r*.9,b.r*.35,0,0,6.283);x.fill();
   x.strokeStyle='#ffffff88';x.lineWidth=b.r*.8;x.lineCap='round';x.beginPath();x.moveTo(b.x-b.vx*.035,b.y-lift-b.vy*.035);x.lineTo(b.x,b.y-lift);x.stroke();
   const gr=x.createRadialGradient(b.x-b.r*.3,b.y-lift-b.r*.3,b.r*.1,b.x,b.y-lift,b.r);gr.addColorStop(0,'#fff');gr.addColorStop(1,b.big?'#9ec6ea':'#c6dff4');x.fillStyle=gr;x.beginPath();x.arc(b.x,b.y-lift,b.r,0,6.283);x.fill();x.strokeStyle='#6a9ccc';x.lineWidth=1.5;x.stroke();}
  // falling flakes
  x.fillStyle='#ffffff';for(const f of flakes){x.globalAlpha=.35+f.z*.5;x.beginPath();x.arc(f.x*W,f.y*H,1.2+f.z*1.8,0,6.283);x.fill();}x.globalAlpha=1;
  fx.draw(x);fx.end(x);
  // HUD
  const bar=g.top*.55;x.fillStyle='#16223acc';x.fillRect(0,0,W,bar);
  const fs=clamp(bar*.55,11,18);
  for(const p of ps){const left=on?p.i===me:p.i===0,bx=left?10:W-10;x.textAlign=left?'left':'right';
   for(let h=0;h<HEARTS;h++)heart(x,left?bx+14+h*(fs*1.5):bx-14-h*(fs*1.5),bar/2,fs*1.05,h<p.hp?'#ff3b4e':'#5a6280',h<p.hp?'#fff':'#9aa3c0');
   for(let r=0;r<WIN_ROUNDS;r++){x.fillStyle=r<wins[p.i]?'#ffe566':'#ffffff33';x.beginPath();x.arc(left?bx+fs*5.2+r*fs*1.1:bx-fs*5.2-r*fs*1.1,bar/2,fs*.4,0,6.283);x.fill();}}
  outlined(x,String(Math.ceil(roundT)),W/2,bar/2,{size:fs*1.25,fill:roundT<6?'#ff8a7a':'#fff',stroke:'#16223a'});
  if(phase==='intro'){for(const p of ps)if(time<5.5&&(!on||p.i===me)){gestureHint(x,p.x+(p.i?-1:1)*W*.1,H*.78,'drag',time,{size:g.u*22});outlined(x,'DRAG TO RUN',p.x+(p.i?-1:1)*W*.1,H*.88,{size:Math.max(12,g.u*15),fill:PLIGHT[p.i],stroke:'#16223a'});}intro.draw(x,W,H);}
  if(phase==='ready')banner(x,W,H,note,'FLICK to throw · HOLD to pack · TAP to build',{color:'#ffe566',size:Math.min(W*.07,H*.11,56)});
  if(phase==='play'&&roundT>ROUND_CAP-1)outlined(x,'FIGHT!',W/2,H*.4,{size:Math.min(W*.1,H*.16,80),fill:'#ffe566',stroke:'#7a3a00',alpha:clamp(ROUND_CAP-roundT,0,1)>0?1-(ROUND_CAP-roundT):0});
  if(phase==='roundover')banner(x,W,H,note,`${wins[0]} – ${wins[1]}`,{color:'#ffe566',size:Math.min(W*.06,H*.1,48)});
  if(phase==='gameover')banner(x,W,H,note,`${wins[0]} – ${wins[1]} in rounds`,{color:'#ffe566'});
  if(phase==='sync')outlined(x,'…',W/2,H*.4,{size:48,fill:'#ffe566',stroke:'#16223a'});
  if(on)x.restore();
 };
 s.debug={engine:'snow',ps,get balls(){return balls;},get walls(){return walls;},trees,wins,fx,touch,kb,get phase(){return phase;},get round(){return round;},geo:()=>g,bot:on?()=>{netBot=true;if(phase==='play'&&Math.random()<.05)buildWall(ps[me]);return '';}:null,get oc(){return OC?.R;}};
 buildLayout();phase='intro';draw();
 if(!await s.pass(0,on?`Snowball Fight online: you're the ${me?'pink':'blue'} kid at the bottom of the yard; ${s.players[them].name} throws from the top on the other phone. Drag to run, flick to throw, hold still to pack a huge snowball, tap to build a wall. Three hearts, best of three rounds.`:'Snowball Fight: a South Park yard, three hearts each. Drag to run, flick to throw, hold still to pack a huge snowball, tap to build a wall. Best of three rounds.','Both ready — fire!'))return;
 if(on){await nf.start('r1');if(!s.alive)return;}
 s.frame(dt=>{
  if(on&&(s.W!==sw0||s.H!==sh0)){sw0=s.W;sh0=s.H;fit();touch.clear();for(const p of ps)p.joy=null;}
  if(!on&&(s.W!==W||s.H!==H)){const sx=s.W/W,sy=s.H/H;for(const p of ps){p.x*=sx;p.y*=sy;p.joy=null;}for(const o of [...walls,...trees,...balls,...tracks]){o.x*=sx;o.y*=sy;}W=s.W;H=s.H;g=geo(W,H);for(const w of walls){w.w=g.bw;w.h=g.bw;}for(const t of trees)t.r=g.bw*.5;touch.clear();}
  update(Math.min(dt,.033));draw();
  s.status(`Round ${round} · ${s.players[0].name} ${'♥'.repeat(ps[0].hp)} vs ${s.players[1].name} ${'♥'.repeat(ps[1].hp)}`);
 });
}
Object.assign(exports,{snow});
