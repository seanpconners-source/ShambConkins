// Sitabout Mini Golf in Node (src/engines/minigolf/): every hole of every course compiles, its tee and cup sit on a green,
// the cup can be reached over the greens (or through a tunnel / jump link) from the tee, physics basics hold (a putt
// stops, sand stops a ball sooner than turf, a gentle putt into the cup drops, a fast one lips out), and the CPU golfer
// holes every hole within par + 2 from the tee. Run: node tests/minigolf-sim.mjs [hole-key-regex]
import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url),cache=new Map();
function load(id){if(cache.has(id))return cache.get(id).exports;const mod={exports:{}};cache.set(id,mod);runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Float32Array,Uint8Array,Infinity,Object,Array,Number,JSON,Map,Set},{filename:id});return mod.exports;}
const P=load('src/engines/minigolf/physics.js'),{COURSES,ALL_HOLES}=load('src/engines/minigolf/courses.js'),CPU=load('src/engines/minigolf/cpu.js');
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
// physics basics on a plain lane
{const h={key:'t',par:2,tee:[30,120],cup:[30,20],greens:[{pts:P.R(18,10,24,120)},{pts:P.R(18,60,24,10),type:'sand'}]},C=P.compile(h);
 const a=P.runShot(C,{x:30,y:120},0,-60,0);check(a.kind==='stop'&&a.y<120&&a.y>70,`a soft putt rolls and stops (${a.y.toFixed(1)})`);
 const turf={key:'u',par:2,tee:[30,120],cup:[30,20],greens:[{pts:P.R(18,10,24,120)}]},b1=P.runShot(P.compile(turf),{x:30,y:80},0,-60,0),b2=P.runShot(C,{x:30,y:80},0,-60,0);check(b2.y>b1.y+5,`sand stops a ball sooner (${b1.y.toFixed(0)} vs ${b2.y.toFixed(0)})`);
 const C2=P.compile(turf);let sunk=false,lip=false;for(let v=20;v<=120;v+=2){const o=P.runShot(C2,{x:30,y:40},0,-v,0);if(o.kind==='sink')sunk=true;}
 const fast=P.runShot(C2,{x:30,y:30},0,-180,0);check(sunk,'a gentle putt at the cup drops');check(fast.kind!=='sink','a hard putt straight over the cup does not drop');
 const wall=P.runShot(C2,{x:30,y:100},-150,0,0);check(wall.walls>0&&wall.x>18&&wall.x<42,'the rails keep the ball on the green');}
check(COURSES.length===3&&COURSES.every(c=>c.holes.length===6),'three courses of six holes');
const only=process.argv[2]?new RegExp(process.argv[2]):null;
for(const h of ALL_HOLES){if(only&&!only.test(h.key))continue;const C=P.compile(h),f=P.cupField(C),t=C.topAt(...h.tee),c=C.topAt(...h.cup);
 check(!!t&&!t.g.water&&!!c&&!c.g.water,`${h.key} ${h.name}: tee and cup on a green`);
 check(f(...h.tee)<999,`${h.key}: the cup can be reached from the tee (${f(...h.tee).toFixed(0)} units)`);
 let lie={x:h.tee[0],y:h.tee[1]},T=0,n=0,res='';const t0=Date.now();
 while(n<h.par+2){const pl=CPU.planNow(C,lie,T,{fine:true,skill:1});n++;const o=pl.res;T+=o.t+2;if(o.kind==='sink'){res='sink';break;}if(o.kind==='stop')lie={x:o.x,y:o.y};else n++;}
 check(res==='sink',`${h.key}: the CPU holes it in ${n} (par ${h.par}, ${Date.now()-t0} ms)`);}
console.log(bad?`${bad} problem(s)`:'MINIGOLF SIM OK');process.exit(bad?1:0);
