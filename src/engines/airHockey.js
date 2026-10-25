const {clamp}=require("src/utils.js");
const {sound, vibrate}=require("src/audio.js");
const {ownedPointers}=require("src/engines/duelControls.js");
const {circle}=require("src/engines/session.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");
const HOCKEY={width:680,height:420,puckRadius:10,paddleRadius:27,goalHalf:70,rail:10,maxPuckSpeed:1000,maxPaddleSpeed:760};
const colors=['#4d9aff','#ff78b4'];
function createHockeyState(W=680,H=420){return {paddles:[100,W-100].map(x=>({x,y:H/2,oldX:x,oldY:H/2,vx:0,vy:0,target:{x,y:H/2}})),puck:{x:W*.35,y:H/2,vx:0,vy:0},events:[],rally:0};}
function hockeyTarget(state,owner,point,W=680,H=420){const a=state.paddles[owner],r=HOCKEY.paddleRadius+HOCKEY.rail;a.target={x:clamp(point.x,owner?W/2+r:r,owner?W-r:W/2-r),y:clamp(point.y,r,H-r)};}
function hockeyServe(state,owner,W=680,H=420){state.puck={x:W*(owner ? .65 : .35),y:H/2,vx:0,vy:0};state.rally=0;}
function capPuck(p){const speed=Math.hypot(p.vx,p.vy);if(speed>HOCKEY.maxPuckSpeed){p.vx*=HOCKEY.maxPuckSpeed/speed;p.vy*=HOCKEY.maxPuckSpeed/speed;}}
function rebound(p,cx,cy,r,vx=0,vy=0,fallback=1){
 const dx=p.x-cx,dy=p.y-cy,d=Math.hypot(dx,dy),contact=r+HOCKEY.puckRadius;if(d>=contact)return false;
 const nx=d>.0001?dx/d:fallback,ny=d>.0001?dy/d:0;
 p.x=cx+nx*(contact+.03);p.y=cy+ny*(contact+.03);
 const relative=(p.vx-vx)*nx+(p.vy-vy)*ny;
 if(relative>=0)return false;
 p.vx-=(1+.94)*relative*nx;p.vy-=(1+.94)*relative*ny;
 // Small tangential friction lets a glancing swipe angle a bank shot.
 const tangent=((vx-p.vx)*-ny+(vy-p.vy)*nx)*.06;p.vx+=tangent*-ny;p.vy+=tangent*nx;capPuck(p);return relative<-8;
}
// One physics sub-step of the puck (h seconds): rails, posts, paddles, goals. Returns the scorer or null.
// only = the one paddle that can touch it (online: the paddle of the half the puck is in), -1 = both.
function puckSub(state,h,W,H,only=-1){
 const p=state.puck,R=HOCKEY.puckRadius,rail=HOCKEY.rail,goal=Math.min(HOCKEY.goalHalf,H*.23);
 capPuck(p);p.x+=p.vx*h;p.y+=p.vy*h;
 if(p.y<rail+R&&p.vy<0||p.y>H-rail-R&&p.vy>0){p.y=clamp(p.y,rail+R,H-rail-R);p.vy*=-.985;state.events.push({kind:'bank',x:p.x,y:p.y});}
 const open=Math.abs(p.y-H/2)<goal-R;
 if(!open&&(p.x<rail+R&&p.vx<0||p.x>W-rail-R&&p.vx>0)){p.x=clamp(p.x,rail+R,W-rail-R);p.vx*=-.985;state.events.push({kind:'bank',x:p.x,y:p.y});}
 for(const side of [rail,W-rail])for(const y of [H/2-goal,H/2+goal])if(rebound(p,side,y,5))state.events.push({kind:'post',x:p.x,y:p.y});
 for(let i=0;i<2;i++){if(only>=0&&i!==only)continue;const a=state.paddles[i];if(rebound(p,a.x,a.y,HOCKEY.paddleRadius,a.vx,a.vy,i?-1:1)){state.rally=(state.rally||0)+1;state.events.push({kind:'hit',owner:i,x:p.x,y:p.y});}}
 if((p.x<-R||p.x>W+R)&&Math.abs(p.y-H/2)<goal-R){const owner=p.x<0?1:0;p.scored=true;p.vx=p.vy=0;state.events.push({kind:'goal',owner});return owner;}
 // Air-table friction is small; a stopped puck waits for a real human strike.
 const drag=Math.pow(.987,h);p.vx*=drag;p.vy*=drag;
 return null;
}
function stepAirHockey(state,elapsed,W=680,H=420){
 const dt=clamp(elapsed,0,.25),p=state.puck;
 state.events=[];if(!dt)return null;
 for(let i=0;i<state.paddles.length;i++){
  const a=state.paddles[i];
  // Compatibility for old callers that supplied the new position directly.
  if(!a.target){const point={x:a.x,y:a.y};a.x=a.oldX??a.x;a.y=a.oldY??a.y;hockeyTarget(state,i,point,W,H);}
 }
 capPuck(p);const steps=Math.max(1,Math.ceil(dt*240)),h=dt/steps;
 for(let step=0;step<steps;step++){
  for(let i=0;i<2;i++){
   const a=state.paddles[i];hockeyTarget(state,i,a.target,W,H);
   const dx=a.target.x-a.x,dy=a.target.y-a.y,d=Math.hypot(dx,dy),fraction=d?Math.min(1,HOCKEY.maxPaddleSpeed*h/d):0;
   a.vx=dx*fraction/h;a.vy=dy*fraction/h;a.x+=a.vx*h;a.y+=a.vy*h;
  }
  if(p.scored)continue;
  const goal=puckSub(state,h,W,H);if(goal!==null)return goal;
 }
 for(const a of state.paddles){a.oldX=a.x;a.oldY=a.y;}
 return null;
}

function hockeyPoint(point,portrait,H=420){return portrait?{x:point.y,y:H-point.x}:point;}
// Online (netField, no host, like Pong): one fixed table (680x420) on both phones, turned so your goal is at the bottom
// (portrait) or on the left. A paddle never reaches past the centre line, so whoever's half the puck is in is the authority
// for it: that phone steps it at 240 Hz with only its own paddle, judges goals into its own goal {g:[tick,scorer]} and hands
// the puck over when it crosses the line {c:[tick,x,y,vx,vy]}. On the other half a phone predicts with the streamed paddle;
// a hand-over replaces the puck at its tick and replays this phone's half from there with its own paddle's recorded path,
// so the result is exact (the jump is eased out). Ticks count from start(); k = point number, n = hand-over number.
// The other phone streams its paddle {p} (with its tick) and, while the puck is its, the puck {pk} ~30/s. Their half is shown
// about one delay back (paddle and puck from those samples), so their hits look right; the puck catches up over my half.
// Time-up: {tu:1} at 60 s; once both are in, every hand-over is known, goals from the replay go out, then {tu:2} ends it.
async function playAirHockey(s){
 const on=s.online||null,me=on?on.me:0,them=1-me;
 let W=680,H=420,portrait=typeof window!=='undefined'&&window.innerWidth<560;const[canvas,ctx]=s.canvas(portrait?H:W,portrait?W:H,{fill:true}),state=createHockeyState(W,H),scores=[0,0];s.body.classList.add('drag-arena-body');s.queueCanvasFit?.();
 let left=60,ready=1,serving=Math.floor(s.random()*2),lastScorer=null,elapsed=0,soundDelay=0;
 hockeyServe(state,serving,W,H);s.shared=true;s.updateScores();
 // table → screen: offline the table is the screen (turned in portrait); online it is scaled and turned per phone
 const FL=!!on&&(portrait?me===0:me===1);let M={a:1,b:0,c:0,d:1,e:0,f:0};
 const layout=()=>{
  if(!on){M=portrait?{a:0,b:1,c:-1,d:0,e:H,f:0}:{a:1,b:0,c:0,d:1,e:0,f:0};return;}
  portrait=s.H>s.W;const top=Math.min(46,s.H*.07)+40,lw=portrait?H:W,lh=portrait?W:H,sc=Math.min((s.W-8)/lw,(s.H-top-8)/lh),ox=(s.W-lw*sc)/2,oy=top+(s.H-top-8-lh*sc)/2;
  const toS=(x,y)=>{if(FL){x=W-x;y=H-y;}return portrait?{x:ox+(H-y)*sc,y:oy+x*sc}:{x:ox+x*sc,y:oy+y*sc};},o=toS(0,0),u=toS(1,0),v=toS(0,1);
  M={a:u.x-o.x,b:u.y-o.y,c:v.x-o.x,d:v.y-o.y,e:o.x,f:o.y};};
 const toTable=p=>{if(!on)return hockeyPoint(p,portrait,H);const det=M.a*M.d-M.b*M.c,x=p.x-M.e,y=p.y-M.f;return {x:(M.d*x-M.c*y)/det,y:(M.a*y-M.b*x)/det};};
 const upright=()=>ctx.rotate(-Math.atan2(M.b,M.a));layout();
 const keys=[{},{}],fingers=ownedPointers(s,(i,p)=>hockeyTarget(state,i,toTable(p),W,H),i=>{const a=state.paddles[i];a.target={x:a.x,y:a.y};},p=>on?me:toTable(p).x<W/2?0:1);
 const mapping={w:[0,'u'],s:[0,'d'],a:[0,'l'],d:[0,'r'],arrowup:[1,'u'],arrowdown:[1,'d'],arrowleft:[1,'l'],arrowright:[1,'r']};for(const type of ['keydown','keyup'])s.on(document,type,ev=>{const binding=mapping[ev.key.toLowerCase()];if(binding&&!s.paused){ev.preventDefault();keys[on?me:binding[0]][binding[1]]=type==='keydown';}});
 const clear=()=>{for(const k of keys)for(const key of Object.keys(k))k[key]=false;for(const a of state.paddles)a.target={x:a.x,y:a.y};};s.resetOnPause?.(clear);s.on(window,'blur',clear);
 s.hint(`Both humans drag a paddle on their half. Bank off the rails; strike the puck to serve. First to 7 or most in 60s. ${s.inputMode==='touch'?'Touch compatibility controls active.':''}`);
 const intro=on?`Air hockey online: your goal is at the ${portrait?'bottom':'left'}; ${s.players[them].name} plays from the other phone. Drag your paddle on your half, strike the puck into their goal. First to 7 or most in 60 seconds.`:`${s.players[0].name} plays ${portrait?'TOP':'LEFT'}; ${s.players[1].name} plays ${portrait?'BOTTOM':'RIGHT'}. Hold one finger each and move your own paddle. After a goal, the other player gets the puck. No automated opponent.`;
 if(!await s.pass(0,intro,on?'Ready — air hockey!':'Both ready — air hockey!'))return;
 const trail=[],sparks=[],cpu=isCpu(s),cpuAim={x:0,y:0};
 // vs CPU (and the online test bot): paddle i guards its goal, gets behind a puck on its half and drives it at the other goal.
 // Worked out as if it were the right paddle (mirrored for the left one).
 const rnd=on?Math.random:s.random;
 function cpuThink(dt,i=1){const a=state.paddles[i],pk=state.puck,sk=cpuSkill(s),R=HOCKEY.paddleRadius,m=v=>i?v:W-v,px=m(pk.x),pvx=i?pk.vx:-pk.vx,ax=m(a.x);let tx,ty;
  if(ready>0||px<W/2-30&&pvx<=40){tx=W-85;ty=H/2+(pk.y-H/2)*.45;}
  else if(pvx>140&&ax<px+R){tx=W-62;ty=clamp(pk.y+pk.vy*(W-62-px)/pvx,H/2-HOCKEY.goalHalf-10,H/2+HOCKEY.goalHalf+10);} // back to the goal mouth
  else{const dx=px,dy=pk.y-H/2,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
   if(ax>px+6){tx=px-ux*R*.7;ty=pk.y-uy*R*.7;}else{tx=px+ux*(R+16);ty=pk.y+uy*(R+16)+(a.y<pk.y?-R:R);}}
  tx=m(tx);cpuAim.x+=(rnd()-.5)*(1-sk)*90*dt;cpuAim.y+=(rnd()-.5)*(1-sk)*90*dt;cpuAim.x*=.97;cpuAim.y*=.97;
  const cur=a.target,step=(240+sk*560)*dt,gx=tx+cpuAim.x-cur.x,gy=ty+cpuAim.y-cur.y,gd=Math.hypot(gx,gy);
  hockeyTarget(state,i,gd>step?{x:cur.x+gx/gd*step,y:cur.y+gy/gd*step}:{x:tx+cpuAim.x,y:ty+cpuAim.y},W,H);}
 const effects=(quiet)=>{for(const event of state.events){if(event.kind==='hit'){if(!quiet)s.react?.(event.owner,'happy',.6);sparks.push({...event,age:.24});}else if(event.kind==='post'||event.kind==='bank')sparks.push({...event,age:.14});}
  if(state.events.length&&soundDelay===0&&!quiet){sound('tap');soundDelay=.06;}state.events=[];};
 const scored=goal=>{scores[goal]++;lastScorer=goal;serving=1-goal;ready=1.05;trail.length=0;s.react?.(goal,'win',1.2);s.react?.(serving,'sad',1.2);s.setScores(scores);sound('win');vibrate(18);};

 // ------------------------------------------------------------ online
 const TK=240,SGAP=10,HN=512,END=60*TK,hist=new Array(HN),off={x:0,y:0},path=[];
 const st={ho:0,jumps:[],hoj:[],ex:[]},traj=new Array(HN),sbuf=[],ps={puck:null,paddles:[null,null],events:[]};let shown=state.puck,lagT=0,lastP=null,snap=null,snapNew=false,pred=null,predT=0,t0=0,simT=0,k=0,n=0,conf=serving===me,readyUntil=TK,pend=null,netBot=false,over=0,tuSent=0,theirTu=0,finished=false;
 const rt=()=>(performance.now()-t0)/1000;
 const nf=on?netField(s,{hz:30,
  pack:()=>{const a=state.paddles[me],p=state.puck,r=v=>+v.toFixed(1);return conf&&!p.scored?{p:[Math.round(a.x),Math.round(a.y),Math.round(a.vx),Math.round(a.vy),simT],pk:[k,simT,r(p.x),r(p.y),r(p.vx),r(p.vy)]}:{p:[Math.round(a.x),Math.round(a.y),Math.round(a.vx),Math.round(a.vy),simT]};},
  unpack:(i,q)=>{const v=q?.p;if(!Array.isArray(v)||!v.every(Number.isFinite))return;path.push({x:v[0],y:v[1],vx:v[2],vy:v[3],t:v[4]|0});if(path.length>40)path.shift();lagT+=(clamp(simT-(v[4]|0),0,60)-lagT)*.15;
   if(Array.isArray(q.pk)&&q.pk[0]===k&&!conf&&q.pk.every(Number.isFinite)){snap=q.pk.slice(1);snapNew=true;}},
  onEvent:e=>{
   if(e.tu>0){theirTu=Math.max(theirTu,e.tu|0);return;}
   if(e.k!==k)return;
   if(Array.isArray(e.c)&&e.n>n&&e.c.every(Number.isFinite)){n=e.n;if(e.c[0]>simT)pend=e.c;else handOver(e.c);}
   else if(Array.isArray(e.g)&&(e.g[1]===0||e.g[1]===1))goalAt(e.g[1],e.g[0]|0);}}):null;
 const paddleTick=(a,h)=>{const dx=a.target.x-a.x,dy=a.target.y-a.y,d=Math.hypot(dx,dy),f=d?Math.min(1,HOCKEY.maxPaddleSpeed*h/d):0;a.vx=dx*f/h;a.vy=dy*f/h;a.x+=a.vx*h;a.y+=a.vy*h;};
 // one 1/240 s step of the puck at tick t (my paddle must already be where it was at t)
 const puckTick=(t,quiet)=>{const p=state.puck;if(!conf||p.scored||t<readyUntil||over)return;
  const side=p.x<W/2?0:1,goal=puckSub(state,1/TK,W,H,side);effects(quiet);rec(p,t+1);
  if(goal===null){if(conf&&side===me&&(p.x<W/2?0:1)!==me){const c=[t+1,+p.x.toFixed(2),+p.y.toFixed(2),+p.vx.toFixed(2),+p.vy.toFixed(2)];conf=false;nf.event({k,n:++n,c});snap=c;snapNew=true;pred=null;sbuf.length=0;}return;}
  // a goal on my half: mine to call once the puck is really mine; otherwise wait for the hand-over or their call
  if(conf&&goal===them){nf.event({k,g:[t,goal]});goalAt(goal,t);}};
 const goalAt=(goal,t)=>{scored(goal);k++;n=0;pend=null;readyUntil=t+Math.round(1.05*TK);hockeyServe(state,serving,W,H);conf=serving===me;off.x=off.y=0;snap=pred=null;sbuf.length=0;if(scores[goal]>=7)over=1.2;};
 // their hand-over at tick c[0]: the real puck, then my half replayed with my paddle's recorded path
 const handOver=c=>{const td=dispTick(shown),was=dispAt(td),cur=state.paddles[me],keep={x:cur.x,y:cur.y,vx:cur.vx,vy:cur.vy};
  state.puck={x:c[1],y:c[2],vx:c[3],vy:c[4]};conf=true;snap=pred=null;sbuf.push({t:c[0],x:c[1],y:c[2],s:false});if(sbuf.length>12)sbuf.shift();
  st.ho++;const k0=k;for(let t=Math.max(c[0],simT-HN+1);t<simT&&!over&&k===k0&&!state.puck.scored;t++){const h=hist[t%HN];if(h)Object.assign(cur,h);puckTick(t,true);}
  Object.assign(cur,keep);const q=dispAt(td);if(was&&q&&!was.s&&!q.s&&k===k0){off.x+=was.x-q.x;off.y+=was.y-q.y;if(st.hoj.length<400)st.hoj.push(Math.round(Math.hypot(was.x-q.x,was.y-q.y)));const d=Math.hypot(off.x,off.y);if(d>140){off.x*=140/d;off.y*=140/d;}}};
 // one tick of a predicted puck: on my half my paddle as recorded; on theirs no paddle (their hits come in their snapshots)
 const predStep=(p,t)=>{if(t<readyUntil)return;ps.puck=p;ps.paddles[me]=hist[t%HN]||state.paddles[me];ps.events.length=0;if(puckSub(ps,1/TK,W,H,p.x<W/2===!me?me:2)!==null)p.scored=true;rec(p,t+1);};
 const rec=(p,t)=>{traj[t%HN]={t,k,x:p.x,y:p.y,s:!!p.scored};},trajAt=t=>{const e=traj[(t%HN+HN)%HN];return e&&e.t===t&&e.k===k?e:null;};
 // the tick the puck is SHOWN at: on their half one delay plus a snapshot gap back (so their hits show where and when they
 // happened), catching up over my near half to now by my quarter line (so my own hits look right)
 const dispTick=p=>{const u=(them?p.x-W/2:W/2-p.x)/(W/2);return simT-Math.round((lagT+SGAP)*clamp(1+u/.5,0,1));};
 // the puck at tick t: between two of their snapshots (or their hand-over) a straight line, otherwise the recorded path
 const dispAt=t=>{for(let i=sbuf.length-1;i>0;i--){const a=sbuf[i-1],b=sbuf[i];if(a.t<=t&&t<=b.t){const f=(t-a.t)/Math.max(1,b.t-a.t);return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,s:false};}}
  if(sbuf.length&&t<sbuf[0].t)return sbuf[0];return trajAt(t);};
 // their paddle as it was lagT ticks ago (the moment their puck snapshots show), from its stamped samples
 const theirStep=dt=>{if(!path.length)return;const a=state.paddles[them],tq=simT-lagT-SGAP;let q=path[path.length-1],x=q.x,y=q.y;
  if(tq>=q.t){const k2=Math.min(.1,(tq-q.t)/TK);x+=q.vx*k2;y+=q.vy*k2;}
  else for(let i=path.length-1;i>0;i--){const b=path[i-1];if(b.t<=tq){const f=(tq-b.t)/Math.max(1,path[i].t-b.t);x=b.x+(path[i].x-b.x)*f;y=b.y+(path[i].y-b.y)*f;q=b;break;}if(i===1){x=b.x;y=b.y;}}
  const e=Math.min(1,dt*25);a.x+=(x-a.x)*e;a.y+=(y-a.y)*e;a.vx=q.vx;a.vy=q.vy;a.target={x:a.x,y:a.y};};
 const netStep=dt=>{
  nf.tick(dt);theirStep(dt);if(netBot)cpuThink(dt,me);
  const goalT=Math.min(END,Math.floor(rt()*TK)),a=state.paddles[me];let guard=0;
  while(simT<goalT&&guard++<TK/2){
   hockeyTarget(state,me,a.target,W,H);paddleTick(a,1/TK);hist[simT%HN]={x:a.x,y:a.y,vx:a.vx,vy:a.vy};
   if(pend&&pend[0]<=simT){const c=pend;pend=null;handOver(c);}
   puckTick(simT,false);simT++;}
  if(guard>=TK/2)simT=goalT;
  // the puck on their half (or not yet handed over): their latest snapshot, run on to now by physics
  if(!conf&&snap){
   if(pred){for(let t=predT;t<simT&&!pred.scored;t++)predStep(pred,t);predT=Math.max(predT,simT);}
   const td=dispTick(pred||state.puck),before=dispAt(td);
   if(snapNew){snapNew=false;
    const np={x:snap[1],y:snap[2],vx:snap[3],vy:snap[4]};rec(np,snap[0]);for(let t=Math.max(snap[0],simT-HN+1);t<simT&&!np.scored;t++)predStep(np,t);
    pred=np;predT=Math.max(snap[0],simT);sbuf.push({t:snap[0],x:snap[1],y:snap[2],s:false});if(sbuf.length>12)sbuf.shift();
    const after=dispAt(td);if(before&&after&&!before.s&&!after.s){off.x+=before.x-after.x;off.y+=before.y-after.y;if(st.jumps.length<400)st.jumps.push(Math.round(Math.hypot(before.x-after.x,before.y-after.y)));const d=Math.hypot(off.x,off.y);if(d>140){off.x*=140/d;off.y*=140/d;}}}
   state.puck=pred;}
  {const b=conf||!pred?state.puck:pred,e=dispAt(dispTick(b));shown=e?{x:e.x,y:e.y,scored:e.s}:b;}
  const kd=Math.exp(-dt*9);off.x*=kd;off.y*=kd;
  ready=Math.max(0,(readyUntil-simT)/TK);left=Math.max(0,60-simT/TK);
  if(over>0){over-=dt;if(over<=0&&!finished){finished=true;s.finish(scores.slice(),'Mighty Ducks · online air hockey');}return;}
  if(simT>=END){if(tuSent<1){tuSent=1;nf.event({tu:1});}
   if(theirTu>=1&&tuSent<2){tuSent=2;nf.event({tu:2});}
   if(theirTu>=2&&tuSent>=2&&!finished){finished=true;s.finish(scores.slice(),'Mighty Ducks · online air hockey');}}};
 if(on){await nf.start('go');if(!s.alive)return;t0=performance.now();}

 s.frame(dt=>{
  if(on)layout();
  else{const nextPortrait=s.H>s.W,nextW=nextPortrait?s.H:s.W,nextH=nextPortrait?s.W:s.H;if(nextW!==W||nextH!==H||nextPortrait!==portrait){const sx=nextW/W,sy=nextH/H;for(const a of state.paddles){a.x*=sx;a.y*=sy;a.oldX=a.x;a.oldY=a.y;a.target={x:a.x,y:a.y};}state.puck.x*=sx;state.puck.y*=sy;W=nextW;H=nextH;portrait=nextPortrait;trail.length=0;sparks.length=0;s.resetInputs?.();layout();}}
  elapsed+=dt;if(!on)left-=dt;soundDelay=Math.max(0,soundDelay-dt);
  for(let i=0;i<2;i++){
   if(on&&i!==me)continue;
   const a=state.paddles[i],k=keys[i],dx=((k.r?1:0)-(k.l?1:0))*360*dt,dy=((k.d?1:0)-(k.u?1:0))*360*dt;
   // Keyboard controls follow the displayed table after its rotation.
   if(dx||dy){const det=M.a*M.d-M.b*M.c,tx=(M.d*dx-M.c*dy)/det,ty=(M.a*dy-M.b*dx)/det,l=Math.hypot(tx,ty)||1,sp=Math.hypot(dx,dy);hockeyTarget(state,i,{x:a.x+tx/l*sp,y:a.y+ty/l*sp},W,H);}
  }
  if(cpu)cpuThink(dt);
  if(on)netStep(dt);
  else if(ready>0){ready=Math.max(0,ready-dt);stepAirHockey({...state,puck:{...state.puck,scored:true}},dt,W,H);if(!ready&&state.puck.scored)hockeyServe(state,serving,W,H);}
  else{
   const goal=stepAirHockey(state,dt,W,H);effects(false);
   if(goal!==null)scored(goal);
  }
  for(let i=sparks.length-1;i>=0;i--)if((sparks[i].age-=dt)<=0)sparks.splice(i,1);
  const pk=on?shown:state.puck,P={x:pk.x+off.x,y:pk.y+off.y};
  if(on){if(lastP&&!pk.scored){const ex=Math.hypot(P.x-lastP.x,P.y-lastP.y)-HOCKEY.maxPuckSpeed*dt;if(ex>4&&st.ex.length<400)st.ex.push(Math.round(ex));}lastP=pk.scored?null:P;}
  if(!pk.scored){trail.push(P);if(trail.length>10)trail.shift();}
  ctx.save();if(on){ctx.fillStyle='#050b18';ctx.fillRect(0,0,s.W,s.H);}ctx.transform(M.a,M.b,M.c,M.d,M.e,M.f);
  // arcade air-hockey table: dark surface, air-hole grid, neon rails, glowing goal slots, faint scores
  const surface=ctx.createLinearGradient(0,0,W,H);surface.addColorStop(0,'#0b1d3a');surface.addColorStop(.5,'#10284f');surface.addColorStop(1,'#0b1d3a');ctx.fillStyle=surface;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#5fa8ff26';for(let y=22;y<H-14;y+=18)for(let x=22+(y/18%2)*9;x<W-14;x+=18)ctx.fillRect(x,y,2,2);
  ctx.save();ctx.globalAlpha=.08;ctx.font=`900 ${H*.5}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<2;i++){ctx.save();ctx.translate(i?W*.75:W*.25,H/2);upright();ctx.fillStyle=colors[i];ctx.fillText(String(scores[i]),0,0);ctx.restore();}ctx.restore();
  ctx.save();ctx.shadowBlur=16;for(let i=0;i<2;i++){ctx.shadowColor=colors[i];ctx.strokeStyle=colors[i];ctx.lineWidth=6;ctx.beginPath();const x0=i?W/2:8,x1=i?W-8:W/2;ctx.moveTo(x0,8);ctx.lineTo(x1,8);ctx.moveTo(x0,H-8);ctx.lineTo(x1,H-8);const gx=i?W-8:8,gh=Math.min(HOCKEY.goalHalf,H*.23);ctx.moveTo(gx,8);ctx.lineTo(gx,H/2-gh);ctx.moveTo(gx,H/2+gh);ctx.lineTo(gx,H-8);ctx.stroke();}ctx.restore();
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2,10);ctx.lineTo(W/2,H-10);ctx.stroke();ctx.beginPath();ctx.arc(W/2,H/2,56,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<2;i++){ctx.strokeStyle=colors[i]+'66';ctx.beginPath();ctx.arc(i?W:0,H/2,Math.min(HOCKEY.goalHalf,H*.23)+30,i?Math.PI/2:-Math.PI/2,i?Math.PI*1.5:Math.PI/2);ctx.stroke();}
  ctx.save();ctx.translate(W/2,H/2);upright();ctx.fillStyle='#ffffff1c';ctx.textAlign='center';ctx.font='900 23px Arial';ctx.fillText('MIGHTY DUCKS',0,-8);ctx.font='700 12px Arial';ctx.fillText('QUACK · QUACK · QUACK',0,12);ctx.restore();
  for(let i=0;i<2;i++){const x=i?W-10:0,gh=Math.min(HOCKEY.goalHalf,H*.23);ctx.save();ctx.shadowColor=colors[i];ctx.shadowBlur=20;ctx.fillStyle='#000';ctx.fillRect(x,H/2-gh,10,gh*2);ctx.strokeStyle=colors[i];ctx.lineWidth=2;ctx.strokeRect(x,H/2-gh,10,gh*2);ctx.restore();}
  for(let i=0;i<trail.length;i++)circle(ctx,trail[i].x,trail[i].y,3+i/1.6,`rgba(255,230,120,${i/trail.length*.35})`);
  for(const spark of sparks){ctx.strokeStyle=colors[spark.owner??0]+'a0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(spark.x,spark.y,5+(1-spark.age/.24)*19,0,Math.PI*2);ctx.stroke();}
  for(let i=0;i<2;i++){
   const a=state.paddles[i],held=[...fingers.values()].includes(i);circle(ctx,a.x+2,a.y+4,29,'#2b466344');
   const gradient=ctx.createRadialGradient(a.x-9,a.y-10,2,a.x,a.y,28);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.4,colors[i]);gradient.addColorStop(1,i?'#9b235d':'#255497');circle(ctx,a.x,a.y,27,gradient);
   if(held){ctx.strokeStyle=colors[i];ctx.lineWidth=2;ctx.beginPath();ctx.arc(a.x,a.y,33,0,Math.PI*2);ctx.stroke();}
   ctx.save();ctx.translate(a.x,a.y);upright();s.sprite(ctx,i,0,-6,56,{mood:Math.hypot(a.vx,a.vy)>40?'walking':undefined});ctx.restore();
  }
  if(!pk.scored){ctx.save();ctx.shadowColor='#ffe678';ctx.shadowBlur=18;circle(ctx,P.x,P.y,11,'#ffe678');ctx.restore();circle(ctx,P.x,P.y,7,'#fff8d0');}
  ctx.restore();
  if(ready>0){ctx.save();ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='bold 21px Arial';ctx.fillText(lastScorer===null?'Get ready!':`${s.players[lastScorer].name} scores!`,s.W/2,s.H/2-52);ctx.font='15px Arial';ctx.fillText(`${s.players[serving].name} serves next`,s.W/2,s.H/2-26);ctx.restore();}
  else if(on&&simT>=END&&!over){ctx.save();ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='bold 21px Arial';ctx.fillText('TIME!',s.W/2,s.H/2-40);ctx.restore();}
  const held=[...fingers.values()];s.status(on?`${Math.ceil(Math.max(0,left))}s · ${scores[0]} – ${scores[1]}`:`${Math.ceil(Math.max(0,left))}s · ${scores[0]} – ${scores[1]} · ${s.players[0].name} ${held.includes(0)?'✓':'○'} · ${s.players[1].name} ${held.includes(1)?'✓':'○'}`);
  s.debug={engine:'airhockey',state,scores,keys,fingers,left,ready,serving,portrait,hockeyStep:stepAirHockey,M,get simT(){return simT;},get conf(){return conf;},get point(){return k;},net:st,bot:on?()=>{netBot=true;return '';}:null};
  if(!on&&(scores.some(score=>score>=7)||left<=0))s.finish(scores,'Mighty Ducks · two-human air hockey');
 });
}

Object.assign(exports,{HOCKEY,createHockeyState,hockeyTarget,hockeyServe,stepAirHockey,hockeyPoint,playAirHockey});