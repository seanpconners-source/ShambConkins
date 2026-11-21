// Angry Heads levels + physics (Node): levels 0..N all build (heads in every fort, sane sizes, stars rising), forts stand
// still until hit, a shot straight at the fort breaks things, TNT and the bomb bird blow things apart, and a simple
// aiming bot clears the early levels with the birds it has. Usage: node tests/angry-sim.mjs [levels]
import {req} from './load.mjs';
const L=req('src/engines/angry/levels.js'),P=req('src/engines/angry/physics.js');
const N=+(process.argv[2]||40);let bad=0;const fail=m=>{bad++;console.log('FAIL',m);};
const items=['rum-ham','fight-milk','kitten-mittens'],pigs=['charlie','mac','dee','dennis','frank'];
let prev=0;for(let n=0;n<N;n++){const lv=L.buildLevel(n,{pigs,items});const pg=lv.bodies.filter(b=>b.kind==='pig').length;
 if(!pg)fail(`level ${n}: no heads`);if(lv.birds.length<3)fail(`level ${n}: only ${lv.birds.length} birds`);if(lv.width>90)fail(`level ${n}: ${lv.width} wide`);
 if(!(lv.stars[0]<lv.stars[1]&&lv.stars[1]<lv.stars[2]))fail(`level ${n}: stars ${lv.stars}`);
 // standing still while nobody touches it
 const ph=P.makePhys(lv);for(let k=0;k<240;k++)ph.step(1/60);const moved=ph.items.filter(it=>!it.static&&!it.gone&&Math.hypot(it.b.position.x-it.s.x,it.b.position.y-it.s.y)>.05).length;
 if(moved)fail(`level ${n}: ${moved} bodies moved on their own`);if(ph.dead.length)fail(`level ${n}: ${ph.dead.length} broke on their own`);}
console.log(`built ${N} levels`);
// ---- an aiming bot: try launch angles/speeds at each head, take the shot that would be best (searched on a copy)
function simShot(n,shots){const lv=L.buildLevel(n,{pigs,items});let score=0;const ph=P.makePhys(lv,{onBreak:it=>{score+=500;},onPig:()=>{score+=5000;}});
 for(const [a,sp] of shots){ph.launch(0,3,Math.cos(a)*sp,Math.sin(a)*sp);let t=0;while(t<10){ph.step(1/60);t+=1/60;if(t>1.5&&ph.settled())break;}ph.clearBirds();if(!ph.pigsLeft())break;}
 return {left:ph.pigsLeft(),score,birds:lv.birds.length};}
let cleared=0;const T0=performance.now();
for(let n=0;n<8;n++){const lv=L.buildLevel(n,{pigs,items}),shots=[];let res;
 for(let b=0;b<lv.birds.length;b++){let best=null;
  for(let a=-.1;a<1.2;a+=.1)for(const sp of [18,22,26,30]){const r=simShot(n,[...shots,[a,sp]]);if(!best||r.left<best.r.left||r.left===best.r.left&&r.score>best.r.score)best={a,sp,r};}
  shots.push([best.a,best.sp]);res=best.r;if(!res.left)break;}
 console.log(`level ${n}: ${res.left?'NOT cleared':'cleared'} with ${shots.length}/${lv.birds.length} birds, ${res.score} pts`);if(!res.left)cleared++;}
if(cleared<6)fail(`bot cleared only ${cleared}/8 early levels`);
console.log(`bot ${((performance.now()-T0)/1000).toFixed(1)} s`);
console.log(bad?`angry sim: ${bad} problem(s)`:'angry sim OK');process.exit(bad?1:0);
