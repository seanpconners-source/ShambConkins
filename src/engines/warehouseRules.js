// Warehouse Shift rules: a Rush Hour style sliding-block car park on a 6x6 warehouse floor.
// Piece = {h:true|false, len:2|3, line:row (h) or col (v), pos:col (h) or row (v), kind}. Piece 0 is the forklift
// on the exit row; the puzzle is solved when it reaches the loading dock on the right (pos 4).
// Puzzles are generated from a seed: random clutter, BFS over every reachable layout, then the layout that is exactly
// N slides from any solved layout is chosen, so difficulty is exact and both players get identical orders.
const N=6,EXIT_ROW=2,GOAL=N-2;

function cellsOf(p,pos=p.pos){const out=[];for(let i=0;i<p.len;i++)out.push(p.h?p.line*N+pos+i:(pos+i)*N+p.line);return out;}
function occupancy(pieces,pos,skip=-1){const g=new Int8Array(N*N).fill(-1);pieces.forEach((p,i)=>{if(i!==skip)for(const k of cellsOf(p,pos[i]))g[k]=i;});return g;}
// Inclusive range a piece can slide to without passing through anything.
function slideRange(pieces,pos,i,g=occupancy(pieces,pos)){const p=pieces[i];let lo=pos[i],hi=pos[i];
 const free=v=>{const k=p.h?p.line*N+v:v*N+p.line;return g[k]===-1||g[k]===i;};
 while(lo-1>=0&&free(lo-1))lo--;while(hi+p.len<N&&free(hi+p.len))hi++;return [lo,hi];}
const keyOf=pos=>String.fromCharCode(...pos.map(v=>48+v));
function neighbors(pieces,pos){const g=occupancy(pieces,pos),out=[];
 for(let i=0;i<pieces.length;i++){const [lo,hi]=slideRange(pieces,pos,i,g);for(let v=lo;v<=hi;v++)if(v!==pos[i]){const n=pos.slice();n[i]=v;out.push(n);}}return out;}
// Every layout reachable from pos, and each one's distance (in slides) to the nearest solved layout.
function explore(pieces,pos,cap=30000){const states=[pos],index=new Map([[keyOf(pos),0]]),adj=[];
 for(let q=0;q<states.length;q++){if(states.length>cap)return null;const list=[];for(const n of neighbors(pieces,states[q])){const k=keyOf(n);let j=index.get(k);if(j===undefined){j=states.length;index.set(k,j);states.push(n);}list.push(j);}adj.push(list);}
 const dist=new Int32Array(states.length).fill(-1),queue=[];states.forEach((st,i)=>{if(st[0]===GOAL){dist[i]=0;queue.push(i);}});
 for(let q=0;q<queue.length;q++){const i=queue[q];for(const j of adj[i])if(dist[j]<0){dist[j]=dist[i]+1;queue.push(j);}}
 return {states,dist};}
function solvePath(pieces,pos){const start=keyOf(pos),prev=new Map([[start,null]]),queue=[pos];
 for(let q=0;q<queue.length;q++){const cur=queue[q];if(cur[0]===GOAL){const path=[];let k=keyOf(cur),st=cur;while(prev.get(k)){const [p,s0]=prev.get(k);path.unshift(st);st=s0;k=p;}return path;}
  if(queue.length>60000)return null;for(const n of neighbors(pieces,cur)){const k=keyOf(n);if(!prev.has(k)){prev.set(k,[keyOf(cur),cur]);queue.push(n);}}}return null;}

const KIND_CODES={forklift:'F',boxes:'b',beets:'e',sabre:'s',chili:'c',fridge:'f',hay:'y',sebring:'r',transam:'t',truck:'T',shelf:'S',boxes3:'B'};
const KIND_NAMES=Object.fromEntries(Object.entries(KIND_CODES).map(([k,v])=>[v,k]));
// Decodes a pool entry from src/data/warehouseOrders.js.
function decodeOrder(code){const [par,body]=code.split(':'),pieces=[],start=[];for(let i=0;i<body.length;i+=5){pieces.push({h:body[i]==='h',len:+body[i+1],line:+body[i+2],kind:KIND_NAMES[body[i+4]]||'boxes'});start.push(+body[i+3]);}return {par:+par,pieces,start};}
const KINDS2=['boxes','beets','sabre','chili','fridge','hay','sebring','transam','boxes','beets'];
const KINDS3=['truck','shelf','boxes3','truck'];
function randomClutter(random){const pieces=[{h:true,len:2,line:EXIT_ROW,kind:'forklift'}],pos=[Math.floor(random()*3)];
 const g=occupancy(pieces,pos),want=8+Math.floor(random()*5);
 for(let tries=0;tries<300&&pieces.length<want+1;tries++){const h=random()<.5,len=random()<.27?3:2,line=Math.floor(random()*N),at=Math.floor(random()*(N-len+1));
  if(h&&line===EXIT_ROW)continue;const p={h,len,line},cells=cellsOf(p,at);if(cells.some(k=>g[k]!==-1))continue;
  p.kind=len===3?KINDS3[Math.floor(random()*KINDS3.length)]:KINDS2[Math.floor(random()*KINDS2.length)];
  if(!h&&(p.kind==='sebring'||p.kind==='transam'||p.kind==='truck'))p.kind=len===3?'shelf':'boxes';
  for(const k of cells)g[k]=pieces.length;pieces.push(p);pos.push(at);}
 return {pieces,pos};}
// A puzzle needing exactly `target` slides (or the closest found within the attempt budget).
function makeOrder(random,target,attempts=40){let best=null;
 for(let a=0;a<attempts;a++){const {pieces,pos}=randomClutter(random),ex=explore(pieces,pos);if(!ex)continue;
  let pickI=-1,pickD=-1;ex.dist.forEach((d,i)=>{if(d<=target&&d>pickD){pickD=d;pickI=i;}else if(d===pickD&&d>0&&random()<.08)pickI=i;});
  if(pickI<0||pickD<2)continue;if(!best||pickD>best.par)best={pieces,start:ex.states[pickI].slice(),par:pickD};if(pickD===target)break;}
 return best;}
function makeOrders(seedRandom,targets=[3,5,7,9,11,13,15,17,19,22]){const out=[];let last=null;
 for(const t of targets){const o=makeOrder(seedRandom,t)||last;if(o){out.push(o);last=o;}}return out;}

Object.assign(exports,{WAREHOUSE_N:N,EXIT_ROW,GOAL,cellsOf,occupancy,slideRange,neighbors,explore,solvePath,makeOrder,makeOrders,randomClutter,KIND_CODES,decodeOrder});
