// Node test for Zone 1 Act 1 (src/engines/s3/zone1.js): a simple bot (hold right, jump when stuck, spin dash when stuck
// for long, back up for a run-up when a slope beats it, let go of vines and zip lines at the end) must reach the end-of-act sign from the start and from the start of
// every route (plateau tops, high ledges, lake beds, the cave, the gorge floor, the hill top). Run: node tests/s3-zone1.mjs [-v]
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url),cache=new Map();
function load(id){if(cache.has(id))return cache.get(id).exports;const mod={exports:{}};cache.set(id,mod);
 runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Map,WeakMap,Set,Uint8Array,Uint16Array,Uint32Array,Float32Array,Error,Object,Array,Number,JSON,Infinity,NaN,isFinite},{filename:id});return mod.exports;}
const P=load('src/engines/s3/physics.js'),O=load('src/engines/s3/objects.js'),{buildZone1Act1,G}=load('src/engines/s3/zone1.js');
const V=process.argv.includes('-v');
function bot(){const b={stuck:0,last:0,mode:0,hang:0,best:0,since:0,back:0};return p=>{const o={l:false,r:true,u:false,d:false,jump:false,jumpPress:false};
 if(p.hang){b.hang++;const h=p.hang;const far=h.type==='zipline'?h.s>=.97||b.hang>400:(h.ang>.55&&b.hang>20);if(far){o.jump=o.jumpPress=true;b.hang=0;}return o;}b.hang=0;
 if(p.x>b.best+4){b.best=p.x;b.since=0;}else b.since++;
 if(b.back>0){b.back--;o.r=false;o.l=true;if(b.back===0)b.since=0;return o;}
 if(b.since>240&&p.ground){b.back=200;return o;}// no way forward: back up for a run-up
 if(Math.abs(p.x-b.last)<.5)b.stuck++;else b.stuck=0;b.last=p.x;
 if(b.mode>0){b.mode--;o.r=false;o.d=true;if(b.mode%6===0&&b.mode>8)o.jumpPress=o.jump=true;if(b.mode===0)o.d=false;return o;}
 if(b.stuck>90&&p.ground){b.mode=40;b.stuck=0;return o;}
 if(b.stuck>12&&p.ground){o.jumpPress=true;o.jump=true;}
 if(!p.ground&&p.ysp<0)o.jump=true;return o;};}
function run(name,sx,sy,max=60*240){const Z=buildZone1Act1(),w=new O.World(Z.T,Z.objs,{switchers:Z.switchers,bottom:Z.bottom});
 const p=P.makeRunner(sx??Z.start.x,sy??Z.start.y);p.rings=0;p.lives=99;p.score=0;p.facing=1;const b=bot();let f=0,done=false,deaths=0,maxX=0;
 for(;f<max&&!done;f++){w.step([p],[b(p)]);for(const e of w.drain()){if(e.k==='sign')done=true;if(e.k==='die')deaths++;}
  if(p.dead&&p.dead>=120)O.respawn(p,{x:sx??Z.start.x,y:sy??Z.start.y});maxX=Math.max(maxX,p.x);
  if(V&&f%300===0)console.log(name,f,Math.round(p.x),Math.round(p.y),p.rings,p.hang?'hang':'');}
 console.log(`${done?'ok  ':'FAIL'} ${name}: ${done?`sign in ${(f/60).toFixed(1)} s`:`stopped at x ${Math.round(p.x)} y ${Math.round(p.y)} (furthest ${Math.round(maxX)})`}, rings ${p.rings}, score ${p.score}, deaths ${deaths}`);
 return done;}
const Z=buildZone1Act1();console.log('tiles in the pool:',Z.T.tiles(),' objects:',Z.objs.length,' rings:',Z.objs.filter(o=>o.type==='ring').length);
let ok=true;
ok=run('from the start')&&ok;
ok=run('plateau 1 top',2760,G-219)&&ok;
ok=run('high ledge over plateau 1',2990,G-439)&&ok;
ok=run('lake 1 bed',3960,G+161)&&ok;
ok=run('plateau 2 top',4560,G-219)&&ok;
ok=run('cave',4540,G+161)&&ok;
ok=run('gorge floor',8240,G+481)&&ok;
ok=run('hill top',9860,G-279)&&ok;
ok=run('lake 2 bed',13060,G+281)&&ok;
ok=run('mesa shelf',14760,G-179)&&ok;
ok=run('mesa top',15140,G-339)&&ok;
ok=run('chasm floor',15640,G+41)&&ok;
assert.ok(ok,'every route reaches the sign');
console.log('zone 1 act 1 ok');
