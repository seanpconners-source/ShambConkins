const {clamp}=require("src/utils.js");
const {sound, vibrate}=require("src/audio.js");
const {ownedPointers}=require("src/engines/duelControls.js");
const {circle}=require("src/engines/session.js");
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
function stepAirHockey(state,elapsed,W=680,H=420){
 const dt=clamp(elapsed,0,.25),p=state.puck,R=HOCKEY.puckRadius,rail=HOCKEY.rail,goal=Math.min(HOCKEY.goalHalf,H*.23);
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
  capPuck(p);p.x+=p.vx*h;p.y+=p.vy*h;
  if(p.y<rail+R&&p.vy<0||p.y>H-rail-R&&p.vy>0){p.y=clamp(p.y,rail+R,H-rail-R);p.vy*=-.985;state.events.push({kind:'bank',x:p.x,y:p.y});}
  const open=Math.abs(p.y-H/2)<goal-R;
  if(!open&&(p.x<rail+R&&p.vx<0||p.x>W-rail-R&&p.vx>0)){p.x=clamp(p.x,rail+R,W-rail-R);p.vx*=-.985;state.events.push({kind:'bank',x:p.x,y:p.y});}
  for(const side of [rail,W-rail])for(const y of [H/2-goal,H/2+goal])if(rebound(p,side,y,5))state.events.push({kind:'post',x:p.x,y:p.y});
  for(let i=0;i<2;i++){const a=state.paddles[i];if(rebound(p,a.x,a.y,HOCKEY.paddleRadius,a.vx,a.vy,i?-1:1)){state.rally=(state.rally||0)+1;state.events.push({kind:'hit',owner:i,x:p.x,y:p.y});}}
  if((p.x<-R||p.x>W+R)&&Math.abs(p.y-H/2)<goal-R){const owner=p.x<0?1:0;p.scored=true;p.vx=p.vy=0;state.events.push({kind:'goal',owner});return owner;}
  // Air-table friction is small; a stopped puck waits for a real human strike.
  const drag=Math.pow(.987,h);p.vx*=drag;p.vy*=drag;
 }
 for(const a of state.paddles){a.oldX=a.x;a.oldY=a.y;}
 return null;
}

function hockeyPoint(point,portrait,H=420){return portrait?{x:point.y,y:H-point.x}:point;}
async function playAirHockey(s){
 let W=680,H=420,portrait=typeof window!=='undefined'&&window.innerWidth<560;const[canvas,ctx]=s.canvas(portrait?H:W,portrait?W:H,{fill:true}),state=createHockeyState(W,H),scores=[0,0];s.body.classList.add('drag-arena-body');s.queueCanvasFit?.();
 let left=60,ready=1,serving=Math.floor(s.random()*2),lastScorer=null,elapsed=0,soundDelay=0;
 hockeyServe(state,serving,W,H);s.shared=true;s.updateScores();
 const keys=[{},{}],fingers=ownedPointers(s,(i,p)=>hockeyTarget(state,i,hockeyPoint(p,portrait,H),W,H),i=>{const a=state.paddles[i];a.target={x:a.x,y:a.y};},p=>hockeyPoint(p,portrait,H).x<W/2?0:1);
 const mapping={w:[0,'u'],s:[0,'d'],a:[0,'l'],d:[0,'r'],arrowup:[1,'u'],arrowdown:[1,'d'],arrowleft:[1,'l'],arrowright:[1,'r']};for(const type of ['keydown','keyup'])s.on(document,type,ev=>{const binding=mapping[ev.key.toLowerCase()];if(binding&&!s.paused){ev.preventDefault();keys[binding[0]][binding[1]]=type==='keydown';}});
 const clear=()=>{for(const k of keys)for(const key of Object.keys(k))k[key]=false;for(const a of state.paddles)a.target={x:a.x,y:a.y};};s.resetOnPause?.(clear);s.on(window,'blur',clear);
 s.hint(`Both humans drag a paddle on their half. Bank off the rails; strike the puck to serve. First to 7 or most in 60s. ${s.inputMode==='touch'?'Touch compatibility controls active.':''}`);
 if(!await s.pass(0,`${s.players[0].name} plays ${portrait?'TOP':'LEFT'}; ${s.players[1].name} plays ${portrait?'BOTTOM':'RIGHT'}. Hold one finger each and move your own paddle. After a goal, the other player gets the puck. No automated opponent.`,'Both ready — air hockey!'))return;
 const trail=[],sparks=[];
 s.frame(dt=>{
  const nextPortrait=s.H>s.W,nextW=nextPortrait?s.H:s.W,nextH=nextPortrait?s.W:s.H;if(nextW!==W||nextH!==H||nextPortrait!==portrait){const sx=nextW/W,sy=nextH/H;for(const a of state.paddles){a.x*=sx;a.y*=sy;a.oldX=a.x;a.oldY=a.y;a.target={x:a.x,y:a.y};}state.puck.x*=sx;state.puck.y*=sy;W=nextW;H=nextH;portrait=nextPortrait;trail.length=0;sparks.length=0;s.resetInputs?.();}
  elapsed+=dt;left-=dt;soundDelay=Math.max(0,soundDelay-dt);
  for(let i=0;i<2;i++){
   const a=state.paddles[i],k=keys[i],dx=((k.r?1:0)-(k.l?1:0))*360*dt,dy=((k.d?1:0)-(k.u?1:0))*360*dt;
   // Keyboard controls follow the displayed table after its portrait rotation.
   if(dx||dy)hockeyTarget(state,i,{x:a.x+(portrait?dy:dx),y:a.y+(portrait?-dx:dy)},W,H);
  }
  if(ready>0){ready=Math.max(0,ready-dt);stepAirHockey({...state,puck:{...state.puck,scored:true}},dt,W,H);if(!ready&&state.puck.scored)hockeyServe(state,serving,W,H);}
  else{
   const goal=stepAirHockey(state,dt,W,H);
   for(const event of state.events){if(event.kind==='hit'){s.react?.(event.owner,'happy',.6);sparks.push({...event,age:.24});}else if(event.kind==='post'||event.kind==='bank')sparks.push({...event,age:.14});}
   if(state.events.length&&soundDelay===0){sound('tap');soundDelay=.06;}
   if(goal!==null){scores[goal]++;lastScorer=goal;serving=1-goal;ready=1.05;trail.length=0;s.react?.(goal,'win',1.2);s.react?.(serving,'sad',1.2);s.setScores(scores);sound('win');vibrate(18);}
  }
  for(let i=sparks.length-1;i>=0;i--)if((sparks[i].age-=dt)<=0)sparks.splice(i,1);
  if(!state.puck.scored){trail.push({x:state.puck.x,y:state.puck.y});if(trail.length>10)trail.shift();}
  ctx.save();if(portrait){ctx.translate(H,0);ctx.rotate(Math.PI/2);}
  // arcade air-hockey table: dark surface, air-hole grid, neon rails, glowing goal slots, faint scores
  const surface=ctx.createLinearGradient(0,0,W,H);surface.addColorStop(0,'#0b1d3a');surface.addColorStop(.5,'#10284f');surface.addColorStop(1,'#0b1d3a');ctx.fillStyle=surface;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#5fa8ff26';for(let y=22;y<H-14;y+=18)for(let x=22+(y/18%2)*9;x<W-14;x+=18)ctx.fillRect(x,y,2,2);
  ctx.save();ctx.globalAlpha=.08;ctx.font=`900 ${H*.5}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<2;i++){ctx.save();ctx.translate(i?W*.75:W*.25,H/2);if(portrait)ctx.rotate(-Math.PI/2);ctx.fillStyle=colors[i];ctx.fillText(String(scores[i]),0,0);ctx.restore();}ctx.restore();
  ctx.save();ctx.shadowBlur=16;for(let i=0;i<2;i++){ctx.shadowColor=colors[i];ctx.strokeStyle=colors[i];ctx.lineWidth=6;ctx.beginPath();const x0=i?W/2:8,x1=i?W-8:W/2;ctx.moveTo(x0,8);ctx.lineTo(x1,8);ctx.moveTo(x0,H-8);ctx.lineTo(x1,H-8);const gx=i?W-8:8,gh=Math.min(HOCKEY.goalHalf,H*.23);ctx.moveTo(gx,8);ctx.lineTo(gx,H/2-gh);ctx.moveTo(gx,H/2+gh);ctx.lineTo(gx,H-8);ctx.stroke();}ctx.restore();
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2,10);ctx.lineTo(W/2,H-10);ctx.stroke();ctx.beginPath();ctx.arc(W/2,H/2,56,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<2;i++){ctx.strokeStyle=colors[i]+'66';ctx.beginPath();ctx.arc(i?W:0,H/2,Math.min(HOCKEY.goalHalf,H*.23)+30,i?Math.PI/2:-Math.PI/2,i?Math.PI*1.5:Math.PI/2);ctx.stroke();}
  ctx.save();ctx.translate(W/2,H/2);if(portrait)ctx.rotate(-Math.PI/2);ctx.fillStyle='#ffffff1c';ctx.textAlign='center';ctx.font='900 23px Arial';ctx.fillText('MIGHTY DUCKS',0,-8);ctx.font='700 12px Arial';ctx.fillText('QUACK · QUACK · QUACK',0,12);ctx.restore();
  for(let i=0;i<2;i++){const x=i?W-10:0,gh=Math.min(HOCKEY.goalHalf,H*.23);ctx.save();ctx.shadowColor=colors[i];ctx.shadowBlur=20;ctx.fillStyle='#000';ctx.fillRect(x,H/2-gh,10,gh*2);ctx.strokeStyle=colors[i];ctx.lineWidth=2;ctx.strokeRect(x,H/2-gh,10,gh*2);ctx.restore();}
  for(let i=0;i<trail.length;i++)circle(ctx,trail[i].x,trail[i].y,3+i/1.6,`rgba(255,230,120,${i/trail.length*.35})`);
  for(const spark of sparks){ctx.strokeStyle=colors[spark.owner??0]+'a0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(spark.x,spark.y,5+(1-spark.age/.24)*19,0,Math.PI*2);ctx.stroke();}
  for(let i=0;i<2;i++){
   const a=state.paddles[i],held=[...fingers.values()].includes(i);circle(ctx,a.x+2,a.y+4,29,'#2b466344');
   const gradient=ctx.createRadialGradient(a.x-9,a.y-10,2,a.x,a.y,28);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.4,colors[i]);gradient.addColorStop(1,i?'#9b235d':'#255497');circle(ctx,a.x,a.y,27,gradient);
   if(held){ctx.strokeStyle=colors[i];ctx.lineWidth=2;ctx.beginPath();ctx.arc(a.x,a.y,33,0,Math.PI*2);ctx.stroke();}
   ctx.save();ctx.translate(a.x,a.y);if(portrait)ctx.rotate(-Math.PI/2);s.sprite(ctx,i,0,-6,56,{mood:Math.hypot(a.vx,a.vy)>40?'walking':undefined});ctx.restore();
  }
  if(!state.puck.scored){const p=state.puck;ctx.save();ctx.shadowColor='#ffe678';ctx.shadowBlur=18;circle(ctx,p.x,p.y,11,'#ffe678');ctx.restore();circle(ctx,p.x,p.y,7,'#fff8d0');}
  ctx.restore();
  if(ready>0){ctx.save();ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='bold 21px Arial';ctx.fillText(lastScorer===null?'Get ready!':`${s.players[lastScorer].name} scores!`,s.W/2,s.H/2-52);ctx.font='15px Arial';ctx.fillText(`${s.players[serving].name} serves next`,s.W/2,s.H/2-26);ctx.restore();}
  const held=[...fingers.values()];s.status(`${Math.ceil(Math.max(0,left))}s · ${scores[0]} – ${scores[1]} · ${s.players[0].name} ${held.includes(0)?'✓':'○'} · ${s.players[1].name} ${held.includes(1)?'✓':'○'}`);
  s.debug={engine:'airhockey',state,scores,keys,fingers,left,ready,serving,portrait,hockeyStep:stepAirHockey};
  if(scores.some(score=>score>=7)||left<=0)s.finish(scores,'Mighty Ducks · two-human air hockey');
 });
}

Object.assign(exports,{HOCKEY,createHockeyState,hockeyTarget,hockeyServe,stepAirHockey,hockeyPoint,playAirHockey});