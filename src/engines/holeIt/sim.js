// Hole.it simulation: the hole glides over the tray, props whose footprint fits
// tip over the rim and tumble in, stacks collapse when their support is eaten,
// every swallowed prop feeds the Size meter. No DOM; tests drive it directly.
const {holeRadius,sizeNeed,propXp,kindR,kindH}=require("src/engines/holeIt/levels.js");
const G=20,CELL=2;
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const qaxis=(x,y,z,ang)=>{const s=Math.sin(ang/2);return [x*s,y*s,z*s,Math.cos(ang/2)];};
const qnorm=q=>{const l=Math.hypot(...q)||1;return q.map(v=>v/l);};
const key=(x,z)=>Math.floor(x/CELL)*100003+Math.floor(z/CELL);
const BOOSTS={grow:{name:'Grow',time:0},speed:{name:'Lightning',time:10},magnet:{name:'Magnet',time:8},freeze:{name:'Freeze',time:10}};
function createSim(def,{charges=1}={}){
 const goalKinds=new Set(def.goals.map(g=>g.k));
 const items=def.items.map((it,i)=>{const sc=it.sc||1,r=kindR(it.k)*sc,h=kindH(it.k)*sc,gk=it.gk||it.k;return {i,k:it.k,gk,sc,h0:kindH(it.k),r,h,x:it.x,z:it.z,cy:it.y+h/2,yaw:it.yaw,on:it.on,state:0,q:qaxis(0,1,0,it.yaw),vy:0,ox:0,oz:0,w:0,ax:0,az:0,spin:0,wob:0,goal:goalKinds.has(gk),xp:propXp(r),counted:false,moved:true};});
 const grid=new Map();for(const it of items){const k=key(it.x,it.z);it.cell=k;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(it.i);}
 const maxR=Math.max(.3,...items.map(it=>it.r));
 return {def,items,grid,maxR,hole:{x:def.start.x,z:def.start.z,size:1,r:holeRadius(1),rT:holeRadius(1),xp:0,vx:0,vz:0},
  goals:def.goals.map(g=>({k:g.k,need:g.need,got:0})),time:def.time,elapsed:0,falling:[],stacked:items.filter(it=>it.on>=0).map(it=>it.i),
  events:[],done:false,won:false,clearTime:0,eaten:0,charges:{grow:charges,speed:charges,magnet:charges,freeze:charges},active:{speed:0,magnet:0,freeze:0}};
}
function sizeProgress(sim){return Math.min(1,sim.hole.xp/sizeNeed(sim.hole.size,sim.def.growBase));}
function goalTotal(sim){return sim.goals.reduce((s,g)=>s+Math.min(g.got,g.need),0);}
function goalNeed(sim){return sim.goals.reduce((s,g)=>s+g.need,0);}
function useBoost(sim,id){if(sim.done||!sim.charges[id])return false;sim.charges[id]--;
 if(id==='grow'){grow(sim);}else sim.active[id]=BOOSTS[id].time;sim.events.push({type:'boost',id});return true;}
function grow(sim){const h=sim.hole;h.size++;h.rT=holeRadius(h.size);sim.events.push({type:'size',size:h.size});}
// keep the spatial grid right for props that slide on the floor (magnet, dragged by the rim)
function relocate(sim,it){const k=key(it.x,it.z);if(k===it.cell)return;const old=sim.grid.get(it.cell);if(old){const j=old.indexOf(it.i);if(j>=0)old.splice(j,1);}if(!sim.grid.has(k))sim.grid.set(k,[]);sim.grid.get(k).push(it.i);it.cell=k;}
function forEachNear(sim,x,z,rad,fn){const c0=Math.floor((x-rad)/CELL),c1=Math.floor((x+rad)/CELL),r0=Math.floor((z-rad)/CELL),r1=Math.floor((z+rad)/CELL);
 for(let cx=c0;cx<=c1;cx++)for(let cz=r0;cz<=r1;cz++){const list=sim.grid.get(cx*100003+cz);if(list)for(const i of list)fn(sim.items[i]);}}
// A prop that fits tips over the rim: it keeps its offset from the hole centre (so it rides along with the hole),
// slides inward off the rim while its top tilts toward the centre, then falls and tumbles at a steady rate.
function startFall(sim,it,vy=0){const h=sim.hole;
 if(it.k==='bomb'){ // swallowing a bomb blows the hole up: the turn ends there and then
  it.state=2;if(!sim.done){sim.done=true;sim.won=false;sim.bombed=true;sim.events.push({type:'bomb',x:it.x,z:it.z});}return;}
 it.state=1;it.ox=it.x-h.x;it.oz=it.z-h.z;const l=Math.hypot(it.ox,it.oz);
 const ux=l>.02?it.ox/l:1,uz=l>.02?it.oz/l:0;it.ax=-uz;it.az=ux; // rotation axis that tips the top toward the centre
 it.vox=-h.vx*.35;it.voz=-h.vz*.35;it.vy=vy;it.w=0;it.tip=true;it.age=0;it.spin=(((it.i*7919)%13)/13-.5)*2.4;it.wob=0;sim.falling.push(it.i);}
function award(sim,it){sim.eaten++;const score=sim.def.mode==='score';const g=score?sim.goals[0]:sim.goals.find(g=>g.k===it.gk);if(g&&g.got<g.need)g.got=score?Math.min(g.need,g.got+it.xp):g.got+1;
 const h=sim.hole;h.xp+=it.xp;let grew=false;while(h.xp>=sizeNeed(h.size,sim.def.growBase)){h.xp-=sizeNeed(h.size,sim.def.growBase);h.size++;h.rT=holeRadius(h.size);grew=true;}
 sim.events.push({type:'eat',k:it.gk,goal:!!g,xp:it.xp,x:it.x,z:it.z});if(grew)sim.events.push({type:'size',size:h.size});
 if(!sim.done&&sim.goals.every(g=>g.got>=g.need)){sim.done=true;sim.won=true;sim.clearTime=sim.elapsed;sim.events.push({type:'win'});}}
// input: {x,z} direction with length 0..1 (screen up = -z).
function stepSim(sim,dt,input={x:0,z:0}){
 const h=sim.hole,def=sim.def;if(dt<=0)return;
 if(!sim.done){sim.elapsed+=dt;if(sim.active.freeze>0)sim.active.freeze=Math.max(0,sim.active.freeze-dt);else sim.time=Math.max(0,sim.time-dt);
  for(const k of ['speed','magnet'])sim.active[k]=Math.max(0,sim.active[k]-dt);
  if(sim.time<=0){sim.done=true;sim.won=false;sim.events.push({type:'lose'});}}
 // springy growth: a quick swell with a small overshoot
 h.rv=(h.rv||0)+((h.rT-h.r)*90-(h.rv||0)*13)*dt;h.r+=h.rv*dt;
 const mag=Math.min(1,Math.hypot(input.x,input.z)),speed=(2.4+h.r*2.2)*(sim.active.speed>0?1.6:1)*(sim.done?0:1);
 const tvx=mag?input.x/Math.max(1e-6,Math.hypot(input.x,input.z))*mag*speed:0,tvz=mag?input.z/Math.max(1e-6,Math.hypot(input.x,input.z))*mag*speed:0;
 h.vx+=(tvx-h.vx)*Math.min(1,dt*14);h.vz+=(tvz-h.vz)*Math.min(1,dt*14);
 const mx=Math.max(0,def.W/2-h.r*.8),mz=Math.max(0,def.D/2-h.r*.8);h.x=Math.max(-mx,Math.min(mx,h.x+h.vx*dt));h.z=Math.max(-mz,Math.min(mz,h.z+h.vz*dt));
 // walled grass islands: the rim slides along their walls
 for(const o of def.islands||[]){const m=h.r*.85,x0=o[0]-m,x1=o[2]+m,z0=o[1]-m,z1=o[3]+m;if(h.x>x0&&h.x<x1&&h.z>z0&&h.z<z1){const dl=h.x-x0,dr=x1-h.x,dt2=h.z-z0,db=z1-h.z,mn=Math.min(dl,dr,dt2,db);if(mn===dl){h.x=x0;h.vx=Math.min(0,h.vx);}else if(mn===dr){h.x=x1;h.vx=Math.max(0,h.vx);}else if(mn===dt2){h.z=z0;h.vz=Math.min(0,h.vz);}else{h.z=z1;h.vz=Math.max(0,h.vz);}}}
 // resting props near the rim
 const reach=h.r+sim.maxR+(sim.active.magnet>0?h.r*3:0);
 forEachNear(sim,h.x,h.z,reach,it=>{if(it.state!==0)return;const d=Math.hypot(it.x-h.x,it.z-h.z),fits=it.r<=h.r*.96;
  if(it.on>=0){it.wob=0;return;} // still standing on something
  if(sim.active.magnet>0&&fits&&d<h.r*4&&d>h.r*.5){const pull=Math.min(d,(2.5+h.r)*dt);it.x+=(h.x-it.x)/d*pull;it.z+=(h.z-it.z)/d*pull;it.moved=true;relocate(sim,it);}
  if(fits&&d<h.r-it.r*.15&&!sim.done){it.cy=it.h/2;startFall(sim,it);}
  else if(!fits&&d<h.r+it.r*.35){
   // Too big: it sags into the mouth resting on the rim, leans toward the centre, and the moving rim drags it along a little.
   it.wob=Math.min(1,it.wob+dt*4);const over=Math.max(0,Math.min(1,(h.r+it.r*.35-d)/h.r));
   if(d>1e-4&&d<h.r){const pull=Math.min(d,(1.1+h.r*.6)*dt*it.wob);it.x+=(h.x-it.x)/d*pull;it.z+=(h.z-it.z)/d*pull;relocate(sim,it);}
   const sink=Math.min(it.h*.42,Math.pow(h.r/it.r,2)*it.h*.5)*over*it.wob;it.cy=it.h/2-sink;it.lean=it.wob*(.06+.3*Math.min(1,d/h.r));it.moved=true;}
  else if(it.wob>0){it.wob=Math.max(0,it.wob-dt*4);it.cy+=(it.h/2-it.cy)*Math.min(1,dt*8);it.lean=(it.lean||0)*it.wob;it.moved=true;}});
 // stacks lose their support
 if(sim.stacked.length){const keep=[];for(const i of sim.stacked){const it=sim.items[i];if(it.state!==0||it.on<0)continue;const s=sim.items[it.on];if(s.state!==0){it.state=3;it.vy=0;it.on=-1;sim.falling.push(i);}else keep.push(i);}sim.stacked=keep;}
 // falling / dropping props
 if(sim.falling.length){const keep=[];for(const i of sim.falling){const it=sim.items[i];
  if(it.state===3){it.vy-=G*dt;it.cy+=it.vy*dt;it.moved=true;if(it.cy-it.h/2<=0){const d=Math.hypot(it.x-h.x,it.z-h.z);
    if(it.r<=h.r*.96&&d<h.r-it.r*.15&&!sim.done){startFall(sim,it,it.vy);sim.falling.pop();keep.push(i);continue;}
    it.cy=it.h/2;it.vy=0;it.state=0;it.moved=true;continue;}keep.push(i);continue;}
  if(it.state!==1)continue;
  it.age+=dt;const lim=Math.max(0,h.r*.97-it.r*.55),l=Math.hypot(it.ox,it.oz)||1e-6,ux=it.ox/l,uz=it.oz/l,lever=it.h*.5+it.r*.5;
  if(it.tip){ // still resting partly on the rim: slide inward, bottom drops slowly, the tilt builds up
   const over=Math.max(0,Math.min(1,(l-lim)/(it.r*.9+.01))),ain=3.5+9*over;
   it.vox-=ux*ain*dt;it.voz-=uz*ain*dt;it.vy-=G*(1-over*.75)*dt;it.w=Math.min(7,it.w+G*.8/lever*(.35+over)*dt);
   if(l<=lim||it.cy-it.h/2<-it.h*.35||it.age>.6)it.tip=false;}
  else{ // free fall inside the throat: bounce softly off the wall, tumble at a steady rate
   it.vy-=G*dt;if(l>lim){it.ox=ux*lim;it.oz=uz*lim;const vr=it.vox*ux+it.voz*uz;if(vr>0){it.vox-=ux*vr*1.4;it.voz-=uz*vr*1.4;it.w*=.92;}}
   const damp=Math.max(0,1-dt*1.2);it.vox*=damp;it.voz*=damp;it.w+=(3.2-it.w)*Math.min(1,dt*1.5);}
  it.ox+=it.vox*dt;it.oz+=it.voz*dt;it.cy+=it.vy*dt;
  it.q=qnorm(qmul(qaxis(it.ax,0,it.az,it.w*dt),it.q));if(it.spin)it.q=qnorm(qmul(qaxis(0,1,0,it.spin*dt),it.q));
  it.x=h.x+it.ox;it.z=h.z+it.oz;it.moved=true;
  if(!it.counted&&it.cy+it.h*.4<0){it.counted=true;award(sim,it);}
  if(it.cy<-(h.r*3.2+it.h*1.5)||it.age>3.5){it.state=2;continue;}
  keep.push(i);}sim.falling=keep;}
}
// Simple autopilot used by tests: head for the nearest prop that fits (goal props first).
// It remembers its target and gives up on one it cannot reach (an island in the way) for a few seconds.
function botInput(sim,dt=1/30){const h=sim.hole,b=sim.bot||(sim.bot={t:null,best:1e9,stuck:0,skip:new Map(),clock:0,aim:''});b.clock+=dt;
 if(b.t&&(b.t.state!==0||b.t.r>h.r*.96))b.t=null;
 if(!b.t){let bd=1e9;for(const it of sim.items){if(it.k==='bomb'||it.state!==0||it.on>=0||it.r>h.r*.96||(b.skip.get(it.i)||0)>b.clock)continue;const d=Math.hypot(it.x-h.x,it.z-h.z)-(it.goal?2:0);if(d<bd){bd=d;b.t=it;}}}
 if(!b.t)return {x:Math.cos(b.clock*.7),z:Math.sin(b.clock*.9)};
 // no-go boxes for the hole's centre: islands (it slides along them) and every bomb that would fit (never get that close)
 const obs=[];for(const o of sim.def.islands||[]){const m=h.r*.85;obs.push([o[0]-m,o[1]-m,o[2]+m,o[3]+m,.5]);}
 // bombs that fit now (or right after the next size-up) get a no-go circle as wide as the hole's reach
 const bombs=[];for(const it of sim.items)if(it.k==='bomb'&&it.state===0&&it.r<=h.r*1.1)bombs.push({x:it.x,z:it.z,R:(it.r<=h.r*.96?h.r*1.08:h.r*1.2)+.15+Math.hypot(h.vx,h.vz)*.06});
 let tx=b.t.x,tz=b.t.z,aim='t'+b.t.i;
 // aim at the closest spot the hole can actually reach (props hugging a wall, an island or a bomb)
 const mx0=Math.max(0,sim.def.W/2-h.r*.8),mz0=Math.max(0,sim.def.D/2-h.r*.8);{const mx=mx0,mz=mz0;tx=Math.max(-mx,Math.min(mx,tx));tz=Math.max(-mz,Math.min(mz,tz));
  for(const R of obs){if(tx>R[0]&&tx<R[2]&&tz>R[1]&&tz<R[3]){const c=[[R[0]-.05-tx,0],[R[2]+.05-tx,0],[0,R[1]-.05-tz],[0,R[3]+.05-tz]].sort((a,b)=>Math.abs(a[0]+a[1])-Math.abs(b[0]+b[1]))[0];tx+=c[0];tz+=c[1];}}
  for(const o of bombs){const ex=tx-o.x,ez=tz-o.z,d=Math.hypot(ex,ez);if(d<o.R+.08){ // approach from the far side (or round the circle if a wall is there)
   const a0=Math.atan2(d?ez:0,d?ex:1);for(let k=0;k<24;k++){const a=a0+(k%2?1:-1)*Math.ceil(k/2)*Math.PI/12,px=o.x+Math.cos(a)*(o.R+.1),pz=o.z+Math.sin(a)*(o.R+.1);if(Math.abs(px)<=mx0&&Math.abs(pz)<=mz0){tx=px;tz=pz;break;}}}}}
 // something in the way: shortest path over its (tray-clamped) corners, then head for the first corner on it
 const mx=sim.def.W/2-h.r*.8,mz=sim.def.D/2-h.r*.8,cl=(v,M)=>Math.max(-M,Math.min(M,v));
 for(const R of obs){const hit=(ax,az,bx,bz)=>segHitsRect(ax,az,bx,bz,R[0],R[1],R[2],R[3]);if(!hit(h.x,h.z,tx,tz))continue;const c=R[4];
  const P=[[h.x,h.z],...[[R[0]-c,R[1]-c],[R[2]+c,R[1]-c],[R[2]+c,R[3]+c],[R[0]-c,R[3]+c]].map(([x,z])=>[cl(x,mx),cl(z,mz)]),[tx,tz]],n=P.length,dist=Array(n).fill(1e9),prev=Array(n).fill(-1),done=Array(n).fill(false);dist[0]=0;
  for(let k=0;k<n;k++){let u=-1;for(let v=0;v<n;v++)if(!done[v]&&(u<0||dist[v]<dist[u]))u=v;if(dist[u]>=1e9)break;done[u]=true;
   for(let v=0;v<n;v++)if(!done[v]&&!hit(P[u][0],P[u][1],P[v][0],P[v][1])){const d=dist[u]+Math.hypot(P[v][0]-P[u][0],P[v][1]-P[u][1]);if(d<dist[v]){dist[v]=d;prev[v]=u;}}}
  if(dist[n-1]<1e9){let v=n-1;while(prev[v]>0)v=prev[v];if(v!==n-1&&Math.hypot(P[v][0]-h.x,P[v][1]-h.z)>.2){tx=P[v][0];tz=P[v][1];aim='c'+v+R[0].toFixed(1);}}
  break;}
 if(aim!==b.aim){b.aim=aim;b.best=1e9;b.stuck=0;}
 const d=Math.hypot(tx-h.x,tz-h.z);if(d<b.best-.05){b.best=d;b.stuck=0;}else if((b.stuck+=dt)>.8){b.skip.set(b.t.i,b.clock+5);b.t=null;b.aim='';}
 let dx=tx-h.x,dz=tz-h.z,l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
 // slide around bomb circles instead of driving into them
 for(const o of bombs){const ux=o.x-h.x,uz=o.z-h.z,dd=Math.hypot(ux,uz)||1e-6,nx=ux/dd,nz=uz/dd;if(dd>o.R+.7)continue;const toward=dx*nx+dz*nz;
  if(toward>0){dx-=toward*nx;dz-=toward*nz;const ll=Math.hypot(dx,dz);if(ll<.2){dx=-nz;dz=nx;}else{dx/=ll;dz/=ll;}}if(dd<o.R+.12){dx-=nx*.8;dz-=nz*.8;}}
 l=Math.hypot(dx,dz)||1;const slow=Math.min(1,d/(h.r*.6)+.25);return {x:dx/l*slow,z:dz/l*slow};}
// does segment (ax,az)-(bx,bz) pass through the rectangle's interior?
function segHitsRect(ax,az,bx,bz,x0,z0,x1,z1){let t0=0,t1=1;const dx=bx-ax,dz=bz-az;for(const [p,q] of [[-dx,ax-x0],[dx,x1-ax],[-dz,az-z0],[dz,z1-az]]){if(Math.abs(p)<1e-9){if(q<0)return false;continue;}const r=q/p;if(p<0){if(r>t1)return false;if(r>t0)t0=r;}else{if(r<t0)return false;if(r<t1)t1=r;}}return t0<t1;}
Object.assign(exports,{createSim,stepSim,useBoost,sizeProgress,goalTotal,goalNeed,botInput,BOOSTS,qaxis,qmul});
