// Temple Run (Boulder Run revamp): the course. A path of straights joined by 90-degree corners (left, right or a
// T-junction where the runner picks), built ahead as the runner goes. What is ON a straight (length, obstacles, coins,
// corner type) comes from the seed and the straight's number only, so two runs on one seed meet the same things even
// when they turn different ways at T-junctions; only where it lies in the world depends on the turns taken.
// Units: metres. Lanes at -LANE, 0, +LANE across the path (u, positive = runner's right). Directions 0..3 = +Z, +X, -Z, -X.
const {seededRandom}=require("src/utils.js");

const LANE=1.05,HALF=1.7,CORNER=3.4;// lane spacing, half the path width, corner square size
const DIRS=[[0,1],[1,0],[0,-1],[-1,0]];// forward vector per direction (x,z)
// right of a direction (runner faces dir): right = dir+1
const right=d=>(d+1)%4,left=d=>(d+3)%4;

// obstacle kinds: what clears them
//  root  low knot across the path (jump; touch = stumble)
//  log   fallen trunk across the path (jump; hit = dead)
//  arch  stone beam at chest height (slide; hit = dead)
//  fire  flame jets across the path (slide; hit = dead)
//  gap   broken path (jump over; fall = dead), len metres
//  block statue/rubble on lanes[] (move to a free lane; hit = dead, clipping the edge = stumble)
const KINDS={root:{h:.4,soft:true},log:{h:.85},arch:{low:1.15},fire:{low:1.15},gap:{},block:{h:2}};

function makeCourse(seed,{stage=0}={}){
 const segs=[];// built straights
 // content of straight k, independent of direction
 function content(k){const r=seededRandom(seed+':trun:'+k),lvl=Math.min(1,k/28);
  const len=k===0?70:Math.round(36+r()*34+lvl*18);
  const turn=k===0?(r()<.5?'L':'R'):r()<.22?'T':r()<.5?'L':'R';
  const obs=[],coins=[];
  let at=k===0?26:10+r()*4;
  const end=len-9;// keep the corner run-up clear
  // room between obstacles grows with the speed you'll have by then (a jump covers ~.7 s of running)
  const gapBase=11+lvl*9;
  while(at<end){
   const p=r();let o=null;
   if(p<.2)o={kind:'root',at};
   else if(p<.36)o={kind:'log',at};
   else if(p<.52)o={kind:'arch',at};
   else if(p<.6&&lvl>.25)o={kind:'fire',at};
   else if(p<.74)o={kind:'gap',at,len:2.2+r()*(.6+lvl*1.2)};
   else{// block one or two lanes, leave at least one free
    const free=Math.floor(r()*3),two=r()<.35+lvl*.3;const lanes=[0,1,2].filter(l=>l!==free&&(two||r()<.5));
    if(!lanes.length)lanes.push((free+1)%3);o={kind:'block',at,lanes};}
   obs.push(o);
   // coins: a run of coins in one lane leading up to it, an arc over jumpables
   const lane=o.kind==='block'?[0,1,2].find(l=>!o.lanes.includes(l)):Math.floor(r()*3);
   if(r()<.75){const n=4+Math.floor(r()*4);for(let i=0;i<n;i++){const a=o.at-2.2-(n-i)*1.6;if(a>2)coins.push({at:a,lane,y:.75});}}
   if((o.kind==='log'||o.kind==='root'||o.kind==='gap')&&r()<.6){const L=o.kind==='gap'?o.len:1.2;for(let i=0;i<5;i++){const f=i/4,a=o.at-1.6+f*(L+3.2);coins.push({at:a,lane,y:.9+Math.sin(f*Math.PI)*1.4});}}
   at+=gapBase+r()*(9-lvl*3)+(o.kind==='gap'?o.len:0);}
  // a coin line through the corner run-up
  if(r()<.5)for(let i=0;i<6;i++)coins.push({at:len-8.5+i*1.1,lane:1,y:.75});
  coins.sort((a,b)=>a.at-b.at);
  // power-ups: now and then one in a clear stretch (magnet / boost / shield)
  const pows=[];
  if(k>0&&r()<.34){for(let tries=0;tries<6;tries++){const a=8+r()*Math.max(1,len-22);if(obs.some(o=>a>o.at-5&&a<o.at+(o.len||0)+5))continue;
    const q=r();pows.push({at:a,lane:Math.floor(r()*3),kind:q<.4?'magnet':q<.72?'shield':'boost',y:.95});break;}}
  return {k,len,turn,obs,coins,pows};}
 // place straight k given the direction it runs and where it starts
 function place(k,dir,x,z,s0){const c=content(k);const f=DIRS[dir];
  const seg={...c,dir,x,z,s0,s1:s0+c.len,ex:x+f[0]*c.len,ez:z+f[1]*c.len,next:null,choice:null};segs[k]=seg;return seg;}
 place(0,0,0,0,0);
 const C={segs,LANE,HALF,CORNER,DIRS,KINDS,seed,stage,
  // the straight that comes after seg when turning 'L' or 'R' (for a T the runner's pick; L/R corners only allow theirs)
  follow(seg,side){if(seg.next&&seg.choice===side)return seg.next;
   const dir=side==='L'?left(seg.dir):right(seg.dir),f=DIRS[seg.dir],g=DIRS[dir];
   // corner square: the path end + half a corner forward, then out sideways
   const cx=seg.ex+f[0]*CORNER/2,cz=seg.ez+f[1]*CORNER/2;
   const nx=cx+g[0]*CORNER/2,nz=cz+g[1]*CORNER/2;
   const n=place(seg.k+1,dir,nx,nz,seg.s1+CORNER);seg.next=n;seg.choice=side;return n;},
  get(k){return segs[k];},
  // world position + heading of a point on straight seg at distance a along it, lateral u
  pos(seg,a,u){const f=DIRS[seg.dir],r=DIRS[right(seg.dir)];return [seg.x+f[0]*a+r[0]*u,seg.z+f[1]*a+r[1]*u];},
  yaw(dir){return [0,Math.PI/2,Math.PI,-Math.PI/2][dir];},// rotation about Y that turns +Z to the direction
  laneU(l){return (l-1)*LANE;},
  // free some memory behind
  prune(k){for(let i=0;i<k-2;i++)if(segs[i])segs[i]=null;}};
 return C;}

Object.assign(exports,{makeCourse,KINDS,LANE,HALF,CORNER,DIRS});
