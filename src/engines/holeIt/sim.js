// Hole.it simulation: the hole glides over the tray, props whose footprint fits
// tip over the rim and tumble in, stacks collapse when their support is eaten,
// every swallowed prop feeds the Size meter. No DOM; tests drive it directly.
const {holeRadius,sizeNeed,propXp,kindR,kindH}=require("src/engines/holeIt/levels.js");
const G=24,CELL=2;
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const qaxis=(x,y,z,ang)=>{const s=Math.sin(ang/2);return [x*s,y*s,z*s,Math.cos(ang/2)];};
const qnorm=q=>{const l=Math.hypot(...q)||1;return q.map(v=>v/l);};
const key=(x,z)=>Math.floor(x/CELL)*100003+Math.floor(z/CELL);
const BOOSTS={grow:{name:'Grow',time:0},speed:{name:'Lightning',time:10},magnet:{name:'Magnet',time:8},freeze:{name:'Freeze',time:10}};
function createSim(def,{charges=1}={}){
 const goalKinds=new Set(def.goals.map(g=>g.k));
 const items=def.items.map((it,i)=>{const r=kindR(it.k),h=kindH(it.k);return {i,k:it.k,r,h,x:it.x,z:it.z,cy:it.y+h/2,yaw:it.yaw,on:it.on,state:0,q:qaxis(0,1,0,it.yaw),vy:0,ox:0,oz:0,w:0,ax:0,az:0,spin:0,wob:0,goal:goalKinds.has(it.k),xp:propXp(r),counted:false,moved:true};});
 const grid=new Map();for(const it of items){const k=key(it.x,it.z);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(it.i);}
 const maxR=Math.max(.3,...items.map(it=>it.r));
 return {def,items,grid,maxR,hole:{x:def.start.x,z:def.start.z,size:1,r:holeRadius(1),rT:holeRadius(1),xp:0,vx:0,vz:0},
  goals:def.goals.map(g=>({k:g.k,need:g.need,got:0})),time:def.time,elapsed:0,falling:[],stacked:items.filter(it=>it.on>=0).map(it=>it.i),
  events:[],done:false,won:false,clearTime:0,eaten:0,charges:{grow:charges,speed:charges,magnet:charges,freeze:charges},active:{speed:0,magnet:0,freeze:0}};
}
function sizeProgress(sim){return Math.min(1,sim.hole.xp/sizeNeed(sim.hole.size));}
function goalTotal(sim){return sim.goals.reduce((s,g)=>s+Math.min(g.got,g.need),0);}
function goalNeed(sim){return sim.goals.reduce((s,g)=>s+g.need,0);}
function useBoost(sim,id){if(sim.done||!sim.charges[id])return false;sim.charges[id]--;
 if(id==='grow'){grow(sim);}else sim.active[id]=BOOSTS[id].time;sim.events.push({type:'boost',id});return true;}
function grow(sim){const h=sim.hole;h.size++;h.rT=holeRadius(h.size);sim.events.push({type:'size',size:h.size});}
function forEachNear(sim,x,z,rad,fn){const c0=Math.floor((x-rad)/CELL),c1=Math.floor((x+rad)/CELL),r0=Math.floor((z-rad)/CELL),r1=Math.floor((z+rad)/CELL);
 for(let cx=c0;cx<=c1;cx++)for(let cz=r0;cz<=r1;cz++){const list=sim.grid.get(cx*100003+cz);if(list)for(const i of list)fn(sim.items[i]);}}
function startFall(sim,it){const h=sim.hole;it.state=1;it.ox=it.x-h.x;it.oz=it.z-h.z;const l=Math.hypot(it.ox,it.oz)||1;it.ax=it.oz/l;it.az=-it.ox/l;if(l<.02){it.ax=1;it.az=0;}
 it.w=0;it.spin=(((it.i*7919)%13)/13-.5)*5;it.wob=0;sim.falling.push(it.i);}
function award(sim,it){sim.eaten++;const g=sim.goals.find(g=>g.k===it.k);if(g&&g.got<g.need)g.got++;
 const h=sim.hole;h.xp+=it.xp;let grew=false;while(h.xp>=sizeNeed(h.size)){h.xp-=sizeNeed(h.size);h.size++;h.rT=holeRadius(h.size);grew=true;}
 sim.events.push({type:'eat',k:it.k,goal:!!g,x:it.x,z:it.z});if(grew)sim.events.push({type:'size',size:h.size});
 if(!sim.done&&sim.goals.every(g=>g.got>=g.need)){sim.done=true;sim.won=true;sim.clearTime=sim.elapsed;sim.events.push({type:'win'});}}
// input: {x,z} direction with length 0..1 (screen up = -z).
function stepSim(sim,dt,input={x:0,z:0}){
 const h=sim.hole,def=sim.def;if(dt<=0)return;
 if(!sim.done){sim.elapsed+=dt;if(sim.active.freeze>0)sim.active.freeze=Math.max(0,sim.active.freeze-dt);else sim.time=Math.max(0,sim.time-dt);
  for(const k of ['speed','magnet'])sim.active[k]=Math.max(0,sim.active[k]-dt);
  if(sim.time<=0){sim.done=true;sim.won=false;sim.events.push({type:'lose'});}}
 h.r+=(h.rT-h.r)*Math.min(1,dt*5);
 const mag=Math.min(1,Math.hypot(input.x,input.z)),speed=(2.4+h.r*2.2)*(sim.active.speed>0?1.6:1)*(sim.done?0:1);
 const tvx=mag?input.x/Math.max(1e-6,Math.hypot(input.x,input.z))*mag*speed:0,tvz=mag?input.z/Math.max(1e-6,Math.hypot(input.x,input.z))*mag*speed:0;
 h.vx+=(tvx-h.vx)*Math.min(1,dt*14);h.vz+=(tvz-h.vz)*Math.min(1,dt*14);
 const mx=Math.max(0,def.W/2-h.r*.8),mz=Math.max(0,def.D/2-h.r*.8);h.x=Math.max(-mx,Math.min(mx,h.x+h.vx*dt));h.z=Math.max(-mz,Math.min(mz,h.z+h.vz*dt));
 // resting props near the rim
 const reach=h.r+sim.maxR+(sim.active.magnet>0?h.r*3:0);
 forEachNear(sim,h.x,h.z,reach,it=>{if(it.state!==0)return;const d=Math.hypot(it.x-h.x,it.z-h.z),fits=it.r<=h.r*.96;
  if(it.on>=0){it.wob=0;return;} // still standing on something
  if(sim.active.magnet>0&&fits&&d<h.r*4&&d>h.r*.5){const pull=Math.min(d,(2.5+h.r)*dt);it.x+=(h.x-it.x)/d*pull;it.z+=(h.z-it.z)/d*pull;it.moved=true;}
  if(fits&&d<h.r-it.r*.15&&!sim.done)startFall(sim,it);
  else if(!fits&&d<h.r+it.r*.4){it.wob=Math.min(1,it.wob+dt*5);it.moved=true;}
  else if(it.wob>0){it.wob=Math.max(0,it.wob-dt*4);it.moved=true;}});
 // stacks lose their support
 if(sim.stacked.length){const keep=[];for(const i of sim.stacked){const it=sim.items[i];if(it.state!==0||it.on<0)continue;const s=sim.items[it.on];if(s.state!==0){it.state=3;it.vy=0;it.on=-1;sim.falling.push(i);}else keep.push(i);}sim.stacked=keep;}
 // falling / dropping props
 if(sim.falling.length){const keep=[];for(const i of sim.falling){const it=sim.items[i];
  if(it.state===3){it.vy-=G*dt;it.cy+=it.vy*dt;it.moved=true;if(it.cy-it.h/2<=0){const d=Math.hypot(it.x-h.x,it.z-h.z);
    if(it.r<=h.r*.96&&d<h.r-it.r*.15&&!sim.done){it.state=1;const v=it.vy;startFall(sim,it);it.vy=v;sim.falling.pop();keep.push(i);continue;}
    it.cy=it.h/2;it.vy=0;it.state=0;it.moved=true;continue;}keep.push(i);continue;}
  if(it.state!==1)continue;
  const lim=Math.max(0,h.r-it.r*.75),l=Math.hypot(it.ox,it.oz);
  if(l>lim){const k=Math.max(lim/l,1-dt*6);it.ox*=k;it.oz*=k;}else{it.ox*=1-dt*.8;it.oz*=1-dt*.8;}
  it.vy-=G*dt;it.cy+=it.vy*dt;it.w=Math.min(9,it.w+dt*30);
  it.q=qnorm(qmul(qaxis(it.ax,0,it.az,it.w*dt),it.q));if(it.spin)it.q=qnorm(qmul(qaxis(0,1,0,it.spin*dt),it.q));
  it.x=h.x+it.ox;it.z=h.z+it.oz;it.moved=true;
  if(!it.counted&&it.cy+it.h*.25<0){it.counted=true;award(sim,it);}
  if(it.cy<-(h.r*2.6+it.h)){it.state=2;continue;}
  keep.push(i);}sim.falling=keep;}
}
// Simple autopilot used by tests: head for the nearest prop that fits (goal props first).
function botInput(sim){const h=sim.hole;let best=null,bd=1e9;
 for(const it of sim.items){if(it.state!==0||it.on>=0||it.r>h.r*.96)continue;const d=Math.hypot(it.x-h.x,it.z-h.z)-(it.goal?2:0);if(d<bd){bd=d;best=it;}}
 if(!best)return {x:0,z:0};const dx=best.x-h.x,dz=best.z-h.z,l=Math.hypot(dx,dz)||1;return {x:dx/l,z:dz/l};}
Object.assign(exports,{createSim,stepSim,useBoost,sizeProgress,goalTotal,goalNeed,botInput,BOOSTS,qaxis,qmul});
