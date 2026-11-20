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
//  root   low knot across the path (jump; touch = stumble)
//  log    fallen trunk across the path (jump; hit = dead)
//  arch   stone beam at chest height (slide; hit = dead)
//  fire   flame jets across the path (slide; hit = dead)
//  gap    broken path (jump over; fall = dead), len metres
//  block  statue/rubble on lanes[] (move to a free lane; hit = dead, clipping the edge = stumble)
//  blades spinning blades at chest height: 'only the penitent man shall pass' (Last Crusade) (slide; hit = dead)
//  darts  poison darts shot across from the walls (Raiders' opening) (slide; hit = dead)
//  spikes a bed of spikes across the path (jump; hit = dead)
//  web    a giant cobweb with its tarantula (Raiders) (slide; touch = stumble)
const KINDS={root:{h:.4,soft:true},log:{h:.85},arch:{low:1.15},fire:{low:1.15},gap:{},block:{h:2},blades:{low:1.15},darts:{low:1.15},spikes:{h:.6},web:{low:1.15,soft:true}};
const KIND_IDS=['root','log','arch','fire','gap','block','blades','darts','spikes','web'];
const SLIDE_KINDS=new Set(['arch','fire','blades','darts','web']),JUMP_KINDS=new Set(['root','log','gap','spikes']);
// ZONES: the run passes through themed stretches of ZLEN straights each, in this order, then round again. Each has its
// own look (world.js), sky (templeRun.js) and chaser. All are real places from the films/games:
//  temple    the Chachapoyan temple (Raiders of the Lost Ark), chased by the boulder
//  jungle    the jungle outside it (Raiders), chased by the Hovitos warriors to Jock's plane
//  mines     the Pankot Palace mines (Temple of Doom), chased by a runaway mine cart
//  catacombs the catacombs under the Venice library (Last Crusade), chased by a swarm of rats
//  tomb      the Well of Souls (Raiders: 'Snakes. Why'd it have to be snakes?'), chased by a giant cobra
//  bridge    the rope bridge over the river (Temple of Doom), chased by Mola Ram's Thuggee guards
//  valley    the Lost Valley (Tomb Raider), chased by the T-Rex
// mix = obstacle weights in KIND_IDS order for the zone.
const ZONES=[
 {id:'temple',name:'THE TEMPLE',chaser:'boulder',mix:[18,14,14,6,12,22,0,12,10,0]},
 {id:'jungle',name:'HOVITOS JUNGLE',chaser:'hovitos',mix:[24,22,12,0,14,16,0,6,4,12]},
 {id:'mines',name:'PANKOT MINES',chaser:'cart',mix:[16,14,24,10,20,16,0,0,6,0]},
 {id:'catacombs',name:'VENICE CATACOMBS',chaser:'rats',mix:[10,10,14,18,12,16,14,0,10,8]},
 {id:'tomb',name:'WELL OF SOULS',chaser:'cobra',mix:[16,12,14,14,8,22,6,8,8,0]},
 {id:'bridge',name:'ROPE BRIDGE',chaser:'thuggee',mix:[12,16,12,6,26,14,8,0,6,6]},
 {id:'valley',name:'LOST VALLEY',chaser:'trex',mix:[22,24,14,4,16,20,0,0,6,6]}];
const ZLEN=5;
// the order zones come in is shuffled per run (seed), and again each time round, never the same zone twice in a row
function zoneOrder(seed){const cyc=[];let last=-1;
 return c=>{while(cyc.length<=c){const r=seededRandom(seed+':zones:'+cyc.length),o=ZONES.map((_,i)=>i);
   for(let i=o.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[o[i],o[j]]=[o[j],o[i]];}
   if(o[0]===last){const j=1+Math.floor(r()*(o.length-1));[o[0],o[j]]=[o[j],o[0]];}last=o[o.length-1];cyc.push(o);}
  return cyc[c];};}
const zoneAt=(k,order=null)=>{const z=Math.floor(k/ZLEN);return order?order(Math.floor(z/ZONES.length))[z%ZONES.length]:z%ZONES.length;};

function makeCourse(seed,{stage=0}={}){
 const segs=[];// built straights
 const order=zoneOrder(seed);
 // content of straight k, independent of direction
 function content(k){const r=seededRandom(seed+':trun:'+k),lvl=Math.min(1,k/28);
  const zone=zoneAt(k,order),gate=k>0&&k%ZLEN===0,mix=ZONES[zone].mix,tot=mix.reduce((x,y)=>x+y,0);
  const len=k===0?70:Math.round(36+r()*34+lvl*18+(gate?44:0));
  const turn=k===0?(r()<.5?'L':'R'):r()<.22?'T':r()<.5?'L':'R';
  const obs=[],coins=[];
  let at=k===0?26:gate?56:10+r()*4;// a zone gate gets a clear run-in so the title card can be read
  const end=len-9;// keep the corner run-up clear
  // room between obstacles grows with the speed you'll have by then (a jump covers ~.7 s of running)
  const gapBase=11+lvl*9;
  while(at<end){
   // pick a kind by the zone's weights (fire only once the run has got going)
   let p=r()*tot,ki=0;while(ki<mix.length-1&&p>=mix[ki]){p-=mix[ki];ki++;}
   // the deadlier traps only once the run has got going
   if((ki===3||ki===6||ki===7)&&lvl<=.25)ki=ki===3?1:2;
   const kind=KIND_IDS[ki];let o=null;
   if(kind==='gap')o={kind,at,len:2.2+r()*(.6+lvl*1.2)};
   else if(kind==='block'){// block one or two lanes, leave at least one free
    const free=Math.floor(r()*3),two=r()<.35+lvl*.3;const lanes=[0,1,2].filter(l=>l!==free&&(two||r()<.5));
    if(!lanes.length)lanes.push((free+1)%3);o={kind,at,lanes};}
   else o={kind,at};
   obs.push(o);
   // coins: a run of coins in one lane leading up to it, an arc over jumpables
   const lane=o.kind==='block'?[0,1,2].find(l=>!o.lanes.includes(l)):Math.floor(r()*3);
   if(r()<.75){const n=4+Math.floor(r()*4);for(let i=0;i<n;i++){const a=o.at-2.2-(n-i)*1.6;if(a>2)coins.push({at:a,lane,y:.75});}}
   if(JUMP_KINDS.has(o.kind)&&r()<.6){const L=o.kind==='gap'?o.len:1.2;for(let i=0;i<5;i++){const f=i/4,a=o.at-1.6+f*(L+3.2);coins.push({at:a,lane,y:.9+Math.sin(f*Math.PI)*1.4});}}
   at+=gapBase+r()*(9-lvl*3)+(o.kind==='gap'?o.len:0);}
  // a coin line through the corner run-up
  if(r()<.5)for(let i=0;i<6;i++)coins.push({at:len-8.5+i*1.1,lane:1,y:.75});
  coins.sort((a,b)=>a.at-b.at);
  // power-ups: now and then one in a clear stretch (magnet / boost / shield)
  const pows=[];
  if(k>0&&r()<.34){for(let tries=0;tries<6;tries++){const a=8+r()*Math.max(1,len-22);if(obs.some(o=>a>o.at-5&&a<o.at+(o.len||0)+5))continue;
    const q=r();pows.push({at:a,lane:Math.floor(r()*3),kind:q<.34?'magnet':q<.62?'shield':q<.86?'boost':'idol',y:.95});break;}}
  return {k,len,turn,obs,coins,pows,zone,gate};}
 // place straight k given the direction it runs and where it starts
 // the path must never run back into itself (a square spiral would)
 function place(k,dir,x,z,s0,side){const c=content(k);const f=DIRS[dir];
  // never three the same way in a row, and the net rotation over the last five corners stays within two quarter turns
  const ch=[side||(segs[k-1]&&segs[k-1].choice)];for(let i=2;i<=4;i++)ch.push(segs[k-i]&&segs[k-i].choice);
  const v=ch.map(x=>x==='R'?1:x==='L'?-1:0),net=v.reduce((x,y)=>x+y,0),bad=d=>(v[0]===d&&v[1]===d)||net+d>2||net+d<-2;
  const want=c.turn==='T'?null:c.turn==='R'?1:-1;
  if(want!==null&&bad(want))c.turn=want>0?'L':'R';else if(c.turn==='T'){const r=bad(1),l=bad(-1);if(r&&!l)c.turn='L';else if(l&&!r)c.turn='R';}
  const seg={...c,dir,x,z,s0,s1:s0+c.len,ex:x+f[0]*c.len,ez:z+f[1]*c.len,next:null,choice:null};segs[k]=seg;return seg;}
 place(0,0,0,0,0);
 const C={segs,order,zoneAt:k=>zoneAt(k,order),LANE,HALF,CORNER,DIRS,KINDS,ZONES,seed,stage,
  // the straight that comes after seg when turning 'L' or 'R' (for a T the runner's pick; L/R corners only allow theirs)
  follow(seg,side){if(seg.next&&seg.choice===side)return seg.next;
   const dir=side==='L'?left(seg.dir):right(seg.dir),f=DIRS[seg.dir],g=DIRS[dir];
   // corner square: the path end + half a corner forward, then out sideways
   const cx=seg.ex+f[0]*CORNER/2,cz=seg.ez+f[1]*CORNER/2;
   const nx=cx+g[0]*CORNER/2,nz=cz+g[1]*CORNER/2;
   const n=place(seg.k+1,dir,nx,nz,seg.s1+CORNER,side);seg.next=n;seg.choice=side;return n;},
  get(k){return segs[k];},
  // world position + heading of a point on straight seg at distance a along it, lateral u
  pos(seg,a,u){const f=DIRS[seg.dir],r=DIRS[right(seg.dir)];return [seg.x+f[0]*a+r[0]*u,seg.z+f[1]*a+r[1]*u];},
  yaw(dir){return [0,Math.PI/2,Math.PI,-Math.PI/2][dir];},// rotation about Y that turns +Z to the direction
  laneU(l){return (l-1)*LANE;},
  // free some memory behind
  prune(k){for(let i=0;i<k-2;i++)if(segs[i])segs[i]=null;}};
 return C;}

Object.assign(exports,{makeCourse,KINDS,KIND_IDS,SLIDE_KINDS,JUMP_KINDS,LANE,HALF,CORNER,DIRS,ZONES,ZLEN,zoneAt});
