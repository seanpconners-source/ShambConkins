// Node test for Zone 1 Act 2 (src/engines/s3/zone1act2.js): the same simple bot as tests/s3-zone1.mjs (hold right, jump
// when stuck, spin dash when stuck for long, back up for a run-up, let go of zip lines at the end) must reach the sign from
// the start and from every route (corkscrew tops, the low road, cliff tops, the lake bed, the high route, the pit, the
// lowland). Also checks the new objects: the corkscrew carries a fast runner round and drops a slow one, the seesaw fires
// a runner up, the swing platforms carry, the fish leaps, the spike log hurts. Run: node tests/s3-zone1-act2.mjs [-v]
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url),cache=new Map();
function load(id){if(cache.has(id))return cache.get(id).exports;const mod={exports:{}};cache.set(id,mod);
 runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Map,WeakMap,Set,Uint8Array,Uint16Array,Uint32Array,Float32Array,Error,Object,Array,Number,JSON,Infinity,NaN,isFinite},{filename:id});return mod.exports;}
const P=load('src/engines/s3/physics.js'),O=load('src/engines/s3/objects.js'),{buildZone1Act2,G,CORKS}=load('src/engines/s3/zone1act2.js');
const V=process.argv.includes('-v');
function bot(){const b={stuck:0,last:0,mode:0,hang:0,best:0,since:0,back:0};return p=>{const o={l:false,r:true,u:false,d:false,jump:false,jumpPress:false};
 if(p.hang){b.hang++;const h=p.hang;const far=h.type==='zipline'?h.s>=.97*Math.hypot(h.x1-h.x0,h.y1-h.y0)||b.hang>400:(h.ang>.55&&b.hang>20);if(far){o.jump=o.jumpPress=true;b.hang=0;}return o;}b.hang=0;
 if(p.x>b.best+4){b.best=p.x;b.since=0;}else b.since++;
 if(b.back>0){b.back--;o.r=false;o.l=true;if(b.back===0)b.since=0;return o;}
 if(b.since>240&&p.ground){b.back=200;return o;}
 if(Math.abs(p.x-b.last)<.5)b.stuck++;else b.stuck=0;b.last=p.x;
 if(b.mode>0){b.mode--;o.r=false;o.d=true;if(b.mode%6===0&&b.mode>8)o.jumpPress=o.jump=true;if(b.mode===0)o.d=false;return o;}
 if(b.stuck>90&&p.ground){b.mode=40;b.stuck=0;return o;}
 if(b.stuck>12&&p.ground){o.jumpPress=true;o.jump=true;}
 if(!p.ground&&p.ysp<0)o.jump=true;return o;};}
const world=()=>{const Z=buildZone1Act2();return {Z,w:new O.World(Z.T,Z.objs,{switchers:Z.switchers,bottom:Z.bottom})};};
function run(name,sx,sy,max=60*240){const {Z,w}=world();
 const p=P.makeRunner(sx??Z.start.x,sy??Z.start.y);p.rings=0;p.lives=99;p.score=0;p.facing=1;const b=bot();let f=0,done=false,deaths=0,maxX=0;const seen=new Set();
 for(;f<max&&!done;f++){w.step([p],[b(p)]);for(const e of w.drain()){if(e.k==='sign')done=true;if(e.k==='die')deaths++;}
  if(p.cork)seen.add('cork');if(p.tube)seen.add('tube');if(p.hang)seen.add(p.hang.type);if(p.y<G-400)seen.add('high');
  if(p.dead&&p.dead>=120)O.respawn(p,{x:sx??Z.start.x,y:sy??Z.start.y});maxX=Math.max(maxX,p.x);
  if(V&&f%120===0)console.log(name,f,Math.round(p.x),Math.round(p.y),p.rings,p.cork?'cork':p.tube?'tube':p.hang?'hang':'',p.ground?'g':'air',p.gsp.toFixed(1));}
 console.log(`${done?'ok  ':'FAIL'} ${name}: ${done?`sign in ${(f/60).toFixed(1)} s`:`stopped at x ${Math.round(p.x)} y ${Math.round(p.y)} (furthest ${Math.round(maxX)})`}, rings ${p.rings}, deaths ${deaths}, went through: ${[...seen].join(' ')||'-'}`);
 return {done,seen};}
const Z0=buildZone1Act2();console.log('tiles in the pool:',Z0.T.tiles(),' objects:',Z0.objs.length,' rings:',Z0.objs.filter(o=>o.type==='ring').length);
// nothing placed inside the ground (owner, Nov 11: a monitor at the start was buried in the hill)
{const buried=Z0.objs.filter(o=>!['tube','zipline','corkscrew','boss','sign','vine','platform','seesaw','spikelog'].includes(o.type)&&o.kind!=='fish'&&Z0.T.solid(Math.round(o.x),Math.round(o.y-(o.type==='monitor'?4:0)),'a',false)&&Z0.T.solid(Math.round(o.x),Math.round(o.y-(o.type==='monitor'?4:0)),'b',false));
 assert.equal(buried.length,0,'objects inside the ground: '+buried.map(o=>`${o.type} ${Math.round(o.x)},${Math.round(o.y)}`).join(' '));console.log('ok   nothing buried in the ground');}
// ---- the new objects on their own
{// corkscrew: fast in = carried round to the landing shelf; slow in = drops to the road below
 const c=CORKS[0];for(const [v,want] of [[6,'over'],[3,'drop']]){const {w}=world();const p=P.makeRunner(c.x0-40,c.y-19);p.gsp=v;p.facing=1;let rode=false,upside=false;
  for(let f=0;f<400;f++){w.step([p],[{r:v>4,l:false,u:false,d:false,jump:false,jumpPress:false}]);w.drain();if(p.cork){rode=true;if(Math.cos(p.ang)<-.9)upside=true;}}
  if(want==='over'){assert.ok(rode&&upside,'a fast runner rides the corkscrew, upside down over the top');assert.ok(p.x>c.x0+TURNS(c)&&p.y<c.y,`and comes off on the shelf (x ${Math.round(p.x)} y ${Math.round(p.y)})`);}
  else{assert.ok(!rode,'a slow runner is not carried');assert.ok(p.y>G,`and drops to the low road (y ${Math.round(p.y)})`);}
  console.log(`ok   corkscrew at ${v}: ${want}`);}}
function TURNS(c){return 480*c.turns;}
{// seesaw: land on the high end, the ball goes up, comes down and fires you
 const {Z,w}=world(),s=Z.objs.find(o=>o.type==='seesaw');const hiX=s.x-s.w/2+12;// tilt 1 = right end down, left end high
 const p=P.makeRunner(hiX,s.gy-120);p.ground=false;p.ysp=2;p.facing=1;let up=Infinity,fired=false;
 for(let f=0;f<240;f++){w.step([p],[{r:false,l:false,u:false,d:false,jump:false,jumpPress:false}]);w.drain();if(p.ysp<-9)fired=true;up=Math.min(up,p.y);}
 assert.ok(fired,'the seesaw fires the runner up');assert.ok(up<s.gy-250,`high enough (top ${Math.round(s.gy-up)} px over the ground)`);console.log(`ok   seesaw fires ${Math.round(s.gy-up)} px up`);}
{// swinging platform carries a rider
 const {Z,w}=world(),pl=Z.objs.find(o=>o.type==='platform'&&o.move==='swing');for(let f=0;f<5;f++)w.step([],[]);
 const p=P.makeRunner(pl.x,pl.y-pl.h/2-19-2);p.ground=false;p.ysp=1;let on=0,x0=null;
 for(let f=0;f<90;f++){w.step([p],[{r:false,l:false,u:false,d:false,jump:false,jumpPress:false}]);w.drain();if(p.onObj===pl){on++;x0??=p.x;}}
 assert.ok(on>60&&Math.abs(p.x-x0)>10,`a swinging platform carries its rider (${on} frames on, moved ${Math.round(Math.abs(p.x-x0))} px)`);console.log('ok   swinging platform carries');}
{// fish leap out of the water and back
 const {Z,w}=world(),fish=Z.objs.find(o=>o.kind==='fish');let top=1e9,hid=0;for(let f=0;f<300;f++){w.step([],[]);top=Math.min(top,fish.y);if(fish.hidden)hid++;}
 assert.ok(top<G-80&&hid>40,`the fish leaps above the bridge (top ${Math.round(G-top)} px over it) and hides between leaps`);console.log('ok   fish leap');}
{// spike log: standing on it while the spikes are up hurts
 const {Z,w}=world(),log=Z.objs.find(o=>o.type==='spikelog');const p=P.makeRunner(log.x,log.y-log.h/2-19-2);p.rings=5;p.ground=false;p.ysp=1;let hurt=false;
 for(let f=0;f<200&&!hurt;f++){w.step([p],[{r:false,l:false,u:false,d:false,jump:false,jumpPress:false}]);for(const e of w.drain())if(e.k==='ring-loss')hurt=true;if(p.hurt)hurt=true;}
 assert.ok(hurt,'the spike log hurts a runner standing on it when its spikes come round');console.log('ok   spike log');}
// ---- whole routes
let ok=true;const went=new Set();
const R0=run('from the start');ok=R0.done&&ok;R0.seen.forEach(k=>went.add(k));
for(const [name,x,y] of [['corkscrew 1 shelf',3540,G-120-19],['low road',2620,G+100-19],['first cliff top',4780,G-200-19],['ledge over the cliff',4900,G-350-19],['second cliff top',5560,G-400-19],
 ['lagoon bed',8200,G+300-19],['high route',9960,G-440-19],['pit',10200,G+250-19],['corkscrew 2 shelf',16930,G-140-19],['lowland',15520,G+80-19],['loop 4 run',19460,G+100-19]]){const r=run(name,x,y);ok=r.done&&ok;r.seen.forEach(k=>went.add(k));}
console.log('set pieces the bots went through:',[...went].join(' '));
assert.ok(ok,'every route reaches the sign');
console.log('zone 1 act 2 ok');
