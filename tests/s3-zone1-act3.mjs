// Node test for Zone 1 Act 3 (src/engines/s3/zone1act3.js): the simple bot (hold right, jump when stuck, spin dash when
// stuck long, back up for a run-up, let go of zip lines at the end; the boss autopilot in the arena) must get from the
// start and from every route to the capsule: beat the zone boss (8 hits), the arena opens, jump on the capsule = the act
// is clear ('sign' event). Also: the boss's mace hurts, the capsule stays shut while the boss is up, the loops go round.
// Run: node tests/s3-zone1-act3.mjs [-v]
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url),cache=new Map();
function load(id){if(cache.has(id))return cache.get(id).exports;const mod={exports:{}};cache.set(id,mod);
 runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Map,WeakMap,Set,Uint8Array,Uint16Array,Uint32Array,Float32Array,Error,Object,Array,Number,JSON,Infinity,NaN,isFinite},{filename:id});return mod.exports;}
const P=load('src/engines/s3/physics.js'),O=load('src/engines/s3/objects.js'),{buildZone1Act3,G,ARENA,CAPSULE}=load('src/engines/s3/zone1act3.js');
const V=process.argv.includes('-v');
function bot(w){const b={stuck:0,last:0,mode:0,hang:0,best:0,since:0,back:0};return p=>{const fight=O.bossBot(w,p);if(fight){b.since=0;b.best=p.x;return fight;}
 const o={l:false,r:true,u:false,d:false,jump:false,jumpPress:false};
 // past the arena: walk to the capsule and hop on it
 const cap=w.objs.find(c=>c.type==='capsule');if(cap&&p.x>ARENA[1]-40&&!cap.opened){if(!p.ground){o.jump=p.ysp<0;o.r=p.x<cap.x-6;o.l=p.x>cap.x+6;return o;}o.r=p.x<cap.x-70;o.l=p.x>cap.x+70;if(Math.abs(p.x-cap.x)<=72){o.jump=o.jumpPress=true;o.r=p.x<cap.x;o.l=!o.r;}return o;}
 if(p.hang){b.hang++;const h=p.hang;const far=h.type==='zipline'?h.s>=.97*Math.hypot(h.x1-h.x0,h.y1-h.y0)||b.hang>400:(h.ang>.55&&b.hang>20);if(far){o.jump=o.jumpPress=true;b.hang=0;}return o;}b.hang=0;
 if(p.x>b.best+4){b.best=p.x;b.since=0;}else b.since++;
 if(b.back>0){b.back--;o.r=false;o.l=true;if(b.back===0)b.since=0;return o;}
 if(b.since>240&&p.ground){b.back=200;return o;}
 if(Math.abs(p.x-b.last)<.5)b.stuck++;else b.stuck=0;b.last=p.x;
 if(b.mode>0){b.mode--;o.r=false;o.d=true;if(b.mode%6===0&&b.mode>8)o.jumpPress=o.jump=true;if(b.mode===0)o.d=false;return o;}
 if(b.stuck>90&&p.ground){b.mode=40;b.stuck=0;return o;}
 if(b.stuck>12&&p.ground){o.jumpPress=true;o.jump=true;}
 if(!p.ground&&p.ysp<0)o.jump=true;return o;};}
const world=()=>{const Z=buildZone1Act3();return {Z,w:new O.World(Z.T,Z.objs,{switchers:Z.switchers,bottom:Z.bottom})};};
function run(name,sx,sy,max=60*240){const {Z,w}=world();
 const p=P.makeRunner(sx??Z.start.x,sy??Z.start.y);p.rings=0;p.lives=99;p.score=0;p.facing=1;const b=bot(w);let f=0,done=false,deaths=0,maxX=0,hits=0,down=false,ups=0,was=false;const seen=new Set();
 for(;f<max&&!done;f++){w.step([p],[b(p)]);for(const e of w.drain()){if(e.k==='sign')done=true;if(e.k==='die')deaths++;if(e.k==='boss-hit')hits++;if(e.k==='boss-down')down=true;if(e.k==='capsule')seen.add('capsule');}
  const u=p.ground&&Math.cos(p.ang)<-.8;if(u&&!was)ups++;was=u;
  if(p.tube)seen.add('tube');if(p.hang)seen.add(p.hang.type);if(p.y<G-380)seen.add('treetops');
  if(p.dead&&p.dead>=120)O.respawn(p,p.check||{x:sx??Z.start.x,y:sy??Z.start.y});maxX=Math.max(maxX,p.x);
  if(V&&f%120===0)console.log(name,f,Math.round(p.x),Math.round(p.y),p.rings,p.tube?'tube':p.hang?'hang':'',p.ground?'g':'air',p.gsp.toFixed(1),w.objs.find(o=>o.type==='boss')?.state);}
 if(ups)seen.add(`loops x${ups}`);
 const ok=done&&down&&hits>=8;
 console.log(`${ok?'ok  ':'FAIL'} ${name}: ${done?`act clear in ${(f/60).toFixed(1)} s`:`stopped at x ${Math.round(p.x)} y ${Math.round(p.y)} (furthest ${Math.round(maxX)})`}, boss hits ${hits}${down?' (beaten)':''}, rings ${p.rings}, deaths ${deaths}, went through: ${[...seen].join(' ')||'-'}`);
 return {ok,seen};}
const Z0=buildZone1Act3();console.log('tiles in the pool:',Z0.T.tiles(),' objects:',Z0.objs.length,' rings:',Z0.objs.filter(o=>o.type==='ring').length);
{const buried=Z0.objs.filter(o=>!['tube','zipline','boss','capsule','vine','platform'].includes(o.type)&&o.kind!=='fish'&&Z0.T.solid(Math.round(o.x),Math.round(o.y-(o.type==='monitor'?4:0)),'a',false)&&Z0.T.solid(Math.round(o.x),Math.round(o.y-(o.type==='monitor'?4:0)),'b',false));
 assert.equal(buried.length,0,'objects inside the ground: '+buried.map(o=>`${o.type} ${Math.round(o.x)},${Math.round(o.y)}`).join(' '));console.log('ok   nothing buried in the ground');}
// the capsule stays shut while the boss is up; the mace hurts
{const {w}=world(),cap=w.objs.find(o=>o.type==='capsule');const p=P.makeRunner(cap.x,cap.y-60);p.rings=5;p.ground=false;p.ysp=1;
 for(let f=0;f<120;f++){w.step([p],[{}]);w.drain();}assert.ok(!cap.opened,'the capsule stays shut while the boss is up');console.log('ok   capsule locked before the boss');}
{const {w}=world(),boss=w.objs.find(o=>o.type==='boss');const p=P.makeRunner(ARENA[0]+120,G-19);p.rings=5;let hurt=false;
 for(let f=0;f<900&&!hurt;f++){w.step([p],[{r:p.x<boss.x-60,l:p.x>boss.x+60}]);for(const e of w.drain())if(e.k==='ring-loss'||e.k==='hurt')hurt=true;}
 assert.ok(hurt,'standing under the boss gets you hit (mace or pod)');console.log('ok   the boss hurts');}
let ok=true;const went=new Set();
for(const [name,x,y] of [['from the start'],['loop 1 run',1900,1660-19],['lake bed',5100,1760-19],['plateau',6400,1300-19],['treetops',6800,1080-19],['pit floor',7600,1680-19],['loop 2 run',9400,G-19],['arena',10450,G-19]]){const r=run(name,x,y);ok=r.ok&&ok;r.seen.forEach(k=>went.add(k));}
console.log('set pieces the bots went through:',[...went].join(' '));
assert.ok(ok,'every route beats the boss and opens the capsule');
console.log('zone 1 act 3 ok');
