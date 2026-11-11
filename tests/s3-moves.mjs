// Node test for the new runners' moves (owner, Nov 11 round 4): the echidna GLIDES (second jump press; slow sink, speeds up,
// let go = drop, lands in a slide), CLIMBS a wall it glides into (up/down, pulls up over the top, jumps off), the dark
// hedgehog's HOMING ATTACK locks onto a robot ahead and pops it (and air-dashes with nothing in reach), and the CPU partner
// (Sonic 3 Tails) is never killed: a pit sends it flying back in. Run: node tests/s3-moves.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url),cache=new Map();
function load(id){if(cache.has(id))return cache.get(id).exports;const mod={exports:{}};cache.set(id,mod);
 runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Map,WeakMap,Set,Uint8Array,Uint16Array,Uint32Array,Float32Array,Error,Object,Array,Number,JSON,Infinity,NaN,isFinite},{filename:id});return mod.exports;}
const {Terrain}=load('src/engines/s3/terrain.js'),P=load('src/engines/s3/physics.js'),O=load('src/engines/s3/objects.js');
const FY=1200,T=new Terrain(4000,1600);
// flat floor, a 300 px wall at x 2000 with a shelf on top, a pit from 3000 to 3400
T.poly([[0,FY],[2000,FY],[2000,FY-300],[3000,FY-300],[3000,1600+0],[0,1600]]);T.poly([[3400,FY],[4000,FY],[4000,1600],[3400,1600]]);T.build();
const I=(o={})=>({l:false,r:false,u:false,d:false,jump:false,jumpPress:false,...o});
const knux=()=>{const p=P.makeRunner(1500,FY-19);p.canGlide=true;p.jmp=6;p.facing=1;p.rings=0;p.lives=3;return p;};
let ok=0;const pass=m=>{ok++;console.log('ok   '+m);};
// 1. glide: jump, press again, hold: flies level-ish, speeds up, then into the wall = grab
{const w=new O.World(T,[]),p=knux();let glided=0,minYs=9,grab=false;
 w.step([p],[I({jump:true,jumpPress:true})]);
 for(let f=0;f<300&&!grab;f++){const press=f===14;w.step([p],[I({r:true,jump:true,jumpPress:press})]);w.drain();if(p.glide){glided++;minYs=Math.min(minYs,p.ysp);}if(p.climb)grab=true;}
 assert.ok(glided>20,`glides (${glided} frames)`);assert.ok(grab,'gliding into the wall grabs it');assert.equal(p.climb,1);pass(`glide ${glided} frames, grabbed the wall at x ${Math.round(p.x)}`);
 // climb up to the top: pulled up onto the shelf
 let top=false;for(let f=0;f<500&&!top;f++){w.step([p],[I({u:true})]);w.drain();if(!p.climb&&p.y<FY-300)top=true;}
 for(let f=0;f<40;f++){w.step([p],[I({r:true})]);w.drain();}
 assert.ok(top&&p.ground&&Math.abs(p.y-(FY-300-19))<2,`climbed over the top onto the shelf (y ${p.y.toFixed(1)}, ground ${p.ground})`);pass('climbed up the wall and over the top');}
// 2. climb then jump off: pushed away from the wall
{const w=new O.World(T,[]),p=knux();p.x=1985;p.y=FY-120;p.ground=false;p.climb=1;
 w.step([p],[I({jump:true,jumpPress:true})]);assert.ok(!p.climb&&p.xsp<0&&p.ysp<0,'jumping off the wall: away and up');pass('jumps off the wall');}
// 3. let go of jump while gliding = drop (no more glide), landing from a glide = slide to a stop with no control
{const w=new O.World(T,[]),p=knux();w.step([p],[I({jump:true,jumpPress:true})]);
 for(let f=0;f<14;f++){w.step([p],[I({jump:true})]);}w.step([p],[I({jump:true,jumpPress:true})]);for(let f=0;f<10;f++)w.step([p],[I({jump:true})]);
 assert.ok(p.glide);w.step([p],[I({})]);assert.ok(!p.glide&&p.drop,'letting go of jump drops');pass('let go = drop');
 const q=knux();q.x=600;w.step([q],[I({jump:true,jumpPress:true})]);for(let f=0;f<10;f++)w.step([q],[I({jump:true})]);w.step([q],[I({jump:true,jumpPress:true})]);
 let slid=false;for(let f=0;f<300;f++){w.step([q],[I({jump:true,l:true})]);if(q.slide)slid=true;if(slid&&!q.slide)break;}
 assert.ok(slid&&!q.slide&&Math.abs(q.gsp)<.1,'a glide that meets the floor slides to a stop');pass('glide landing slides to a stop');}
// 4. homing attack: a robot ahead and below gets popped
{const bad={type:'badnik',kind:'charger',x:1700,y:FY-14,w:14,h:14,still:true};const w=new O.World(T,[bad]),p=P.makeRunner(1560,FY-19);p.homing=true;p.facing=1;p.rings=0;p.score=0;
 w.step([p],[I({jump:true,jumpPress:true})]);for(let f=0;f<10;f++)w.step([p],[I({jump:true})]);w.step([p],[I({jump:true,jumpPress:true})]);
 let popped=false;for(let f=0;f<60&&!popped;f++){w.step([p],[I({})]);for(const e of w.drain())if(e.k==='explode')popped=true;}
 assert.ok(popped,'the homing attack pops the robot');pass('homing attack hits the robot');
 // nothing in reach = air dash ahead
 const q=P.makeRunner(500,FY-19);q.homing=true;q.facing=1;w.step([q],[I({jump:true,jumpPress:true})]);for(let f=0;f<10;f++)w.step([q],[I({jump:true})]);w.step([q],[I({jump:true,jumpPress:true})]);
 assert.ok(q.xsp>=8.9,`air dash with nothing to home in on (xsp ${q.xsp.toFixed(1)})`);pass('air dash');}
// 5. the CPU partner: a fall into the pit = flies back in to the leader (never dies)
{const w=new O.World(T,[]),lead=P.makeRunner(3600,FY-19),b=P.makeRunner(3200,FY-100);lead.rings=0;lead.lives=3;b.cpu=true;b.lives=99;b.rings=0;b.ground=false;
 let flew=false;for(let f=0;f<600;f++){w.step([lead,b],[I({}),I({})]);w.drain();if(b.flyIn)flew=true;if(flew&&!b.flyIn)break;}
 assert.ok(flew&&!b.flyIn&&!b.dead&&Math.abs(b.x-lead.x)<40,`the CPU fox flew back to the leader (x ${Math.round(b.x)} vs ${Math.round(lead.x)}, dead ${b.dead})`);pass('CPU partner flies back in after a pit');
 b.rings=0;O.hurt(b,w,1,b.x+5,'boss');assert.ok(!b.dead,'a hit only knocks the CPU partner back');pass('CPU partner survives hits');}
console.log(`s3-moves OK (${ok} checks)`);
