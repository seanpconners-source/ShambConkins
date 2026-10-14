// Node test for the 3D kart course + physics (src/engines/kart3d/track.js, physics.js): courses close, contain the
// promised features (hills, gaps, ramps, anti-gravity loop and upside-down corkscrew), and an autopilot kart finishes
// three laps of Rainbow Road clearing both jumps without falling. Run: node tests/kart-track.mjs
import assert from 'node:assert/strict';
import {load} from './kartlib.mjs';
const T=load('src/engines/kart3d/track.js'),Ph=load('src/engines/kart3d/physics.js');
const rr=T.rainbowRoad(),ring=T.battleRing();
assert.ok(rr.closeErr<120,`Rainbow Road closes (${rr.closeErr.toFixed(1)})`);assert.ok(ring.closeErr<1,'battle ring closes');
let inverted=0,vertical=0,gap=0,glue=0;for(let i=0;i<rr.N;i++){const uy=rr.U[i*3+1];if(uy<-.9)inverted++;if(Math.abs(uy)<.2)vertical++;if(rr.gap[i])gap++;if(rr.glue[i])glue++;}
assert.ok(inverted>20,'driving upside down (loop top + corkscrew)');assert.ok(vertical>20,'vertical wall/loop sections');assert.ok(gap*T.DS>600,'gaps over the void');
for(let i=0;i<rr.N;i++)if(rr.U[i*3+1]<.2)assert.ok(rr.glue[i],`inverted/vertical sample ${i} must be anti-gravity`);
assert.equal(rr.ramps.length,2);assert.ok(rr.ramps.some(r=>r.glide),'glider ramp');assert.ok(rr.boxes.length>=16&&rr.coins.length>30&&rr.pads.length>=5);
assert.ok(rr.maxY-rr.minY>150,'real height differences');
// frames are orthonormal
for(let i=0;i<rr.N;i+=7){const v=k=>[rr[k][i*3],rr[k][i*3+1],rr[k][i*3+2]];const t=v('T'),r=v('R'),u=v('U');for(const [a,b] of [[t,r],[t,u],[r,u]])assert.ok(Math.abs(T.dot(a,b))<.02,'orthogonal frame '+i);}
// project() round-trips points above the surface
for(const s of [100,1500,3700,4400,8200]){const P=T.point(rr,s,20,12),p=T.project(rr,P,s-30);assert.ok(Math.abs(T.sdiff(rr,s,p.s))<1.5&&Math.abs(p.d-20)<1.5&&Math.abs(p.h-12)<1.5,`project at ${s}`);}
// autopilot race
const k=Ph.makeKart(rr,0),ev={};let t=0,dist=0,last=k.s;const dt=1/120;
const ctx={ev:(k,n)=>{ev[n]=(ev[n]||0)+1;}};
while(t<120&&dist<rr.L*3){Ph.stepKart(rr,k,Ph.autoInput(rr,k),dt,ctx);t+=dt;dist+=T.sdiff(rr,last,k.s);last=k.s;for(const q of [k.s,k.d,k.v,k.psi])assert.ok(Number.isFinite(q),'finite state');}
console.log('autopilot: 3 laps in',t.toFixed(1),'s',JSON.stringify(ev));
assert.ok(dist>=rr.L*3,'finished three laps');assert.ok(t<100,'race length is party-sized');
assert.equal(ev.fall||0,0,'autopilot never falls off');assert.equal(ev.ramp,3);assert.equal(ev.glide,3);assert.ok(ev.trick>=6,'jump boosts');assert.ok(ev.miniturbo>=3,'drifts give mini-turbos');
// drifting: sparks climb blue → orange → purple, release gives the matching boost
{const c=T.buildCourse({id:'pad',half:1500,rail:0,spawn:[{s:10,d:0}],pieces:[{turn:180,r:3000},{turn:180,r:3000}]}),q=Ph.makeKart(c,0);q.v=320;for(let i=0;i<20;i++)Ph.stepKart(c,q,{steer:0,drift:0},dt,{});
 const lv=[];Ph.stepKart(c,q,{steer:1,drift:1},dt,{});assert.equal(q.drift,1);for(let i=0;i<120*2.2;i++){Ph.stepKart(c,q,{steer:1,drift:1},dt,{});lv.push(q.spark);}
 assert.ok(lv.includes(1)&&lv.includes(2)&&lv.at(-1)===3,'spark levels 1→2→3');Ph.stepKart(c,q,{steer:0,drift:0},dt,{});assert.ok(q.boostT>1.3,'ultra mini-turbo');}
// spin-out from a hit, star immunity
{const q=Ph.makeKart(ring,1);q.v=300;assert.ok(Ph.hit(q,'spin'));assert.ok(q.spin>0&&q.v<200);const z=Ph.makeKart(ring,0);z.star=3;assert.equal(Ph.hit(z,'spin'),false);}
// every course in the course select closes and an autopilot finishes three laps without falling off
for(const C of T.COURSES){const c=C.build();assert.ok(c.closeErr<120,`${C.id} closes`);assert.ok(c.boxes.length>=8&&c.spawn.length>=8,`${C.id} boxes and grid`);
 const q=Ph.makeKart(c,0),e={};let tt=0,dd=0,ls=q.s;while(tt<150&&dd<c.L*3){Ph.stepKart(c,q,Ph.autoInput(c,q),dt,{ev:(k,n)=>{e[n]=(e[n]||0)+1;}});tt+=dt;dd+=T.sdiff(c,ls,q.s);ls=q.s;}
 assert.ok(dd>=c.L*3,`${C.id}: three laps`);assert.equal(e.fall||0,0,`${C.id}: autopilot never falls off`);console.log(C.id,'3 laps in',tt.toFixed(1),'s');}
// the other courses are Rainbow-Road style too: anti-gravity, upside-down track, jumps over gaps, a glider and animated track characters
const HZ=load('src/engines/kart3d/hazards.js');
for(const C of T.COURSES.slice(1)){const c=C.build();let inv=0,glue=0,gap=0;for(let i=0;i<c.N;i++){if(c.U[i*3+1]<-.9)inv++;if(c.glue[i])glue++;if(c.gap[i])gap++;}
 assert.ok(inv>8&&glue*T.DS>1200,`${C.id}: inverted anti-gravity section`);assert.ok(gap*T.DS>500&&c.ramps.some(r=>r.glide),`${C.id}: jumps and a glider`);
 assert.ok(c.hazards.length>=6,`${C.id}: track characters`);
 for(const hz of c.hazards){let live=0;for(let t=0;t<12;t+=.05){const st=HZ.state(c,hz,t);for(const p of st.parts)assert.ok(Number.isFinite(p.s+p.d+p.h),'finite hazard');if(st.live)live++;}assert.ok(live>0,`${C.id} ${hz.kind} can hit`);}}
// a Thwomp squashes a kart parked under it once it slams down, and misses while it hovers
{const c=T.bowsersCastle(),hz=c.hazards.find(h=>h.kind==='thwomp'),k={s:hz.s,d:hz.d,h:0};const per=HZ.PER.thwomp,t0=per-hz.ph;
 assert.equal(HZ.touches(c,HZ.state(c,hz,t0+per*.2),k),false,'hovering thwomp misses');assert.ok(HZ.touches(c,HZ.state(c,hz,t0+per*.7),k),'landed thwomp hits');}
// off-road (grass, sand) slows the kart
{const c=T.mooMooMeadows(),q=Ph.makeKart(c,0);q.d=c.roadHalf[T.idx(c,q.s)]+20;for(let i=0;i<120*4;i++){q.d=Math.max(q.d,c.roadHalf[T.idx(c,q.s)]+20);Ph.stepKart(c,q,{steer:0,drift:0},dt,{});}assert.ok(q.offroad&&q.v<Ph.TOP*.6,'off-road speed');}
console.log('kart track OK');
