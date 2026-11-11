// Node test for the Sonic 3 engine's level objects (src/engines/s3/objects.js) on a flat test floor: rings, springs (up,
// side, diagonal), spikes and ring loss (Sonic 3 circles, 64-frame pickup delay, recollecting), shields absorbing a hit,
// monitors (break from above with a bounce, from the side when rolling; item after the pop), badniks (pop + bounce +
// chain score vs. getting hurt walking into one), starposts, breakable walls (stop a walker, break for a roller), one-way
// platforms, falling platforms, vines and zip lines, shield moves (fire dash, lightning jump, bubble bounce, insta-shield),
// speed shoes, death by falling. Run: node tests/s3-objects.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url),cache=new Map();
function load(id){if(cache.has(id))return cache.get(id).exports;const mod={exports:{}};cache.set(id,mod);
 runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Map,WeakMap,Set,Uint8Array,Uint16Array,Uint32Array,Float32Array,Error,Object,Array,Number,JSON,Infinity,NaN,isFinite},{filename:id});return mod.exports;}
const {Terrain}=load('src/engines/s3/terrain.js'),P=load('src/engines/s3/physics.js'),O=load('src/engines/s3/objects.js');
const FY=1000;
const floor=(gapX0,gapX1)=>{const T=new Terrain(4000,1400);if(gapX0==null)T.poly([[0,FY],[4000,FY],[4000,1400],[0,1400]]);
 else{T.poly([[0,FY],[gapX0,FY],[gapX0,1400],[0,1400]]);T.poly([[gapX1,FY],[4000,FY],[4000,1400],[gapX1,1400]]);}return T.build();};
const I=(o={})=>({l:false,r:false,u:false,d:false,jump:false,jumpPress:false,...o});
const sim=(w,ps,n,inp,each)=>{const evs=[];for(let f=0;f<n;f++){const x=typeof inp==='function'?inp(f,ps):inp;w.step(ps,Array.isArray(x)?x:[x]);const e=w.drain();evs.push(...e);each?.(f,e);}return evs;};
const runner=(x)=>{const p=P.makeRunner(x,FY-19);p.rings=0;p.lives=3;return p;};
const kinds=evs=>evs.map(e=>e.k);
let w,p,ev;

// rings: run through a line of 5
w=new O.World(floor(),[0,1,2,3,4].map(k=>({type:'ring',x:300+k*24,y:FY-16})));p=runner(200);
ev=sim(w,[p],120,I({r:true}));assert.equal(p.rings,5,'collected 5 rings');assert.equal(kinds(ev).filter(k=>k==='ring').length,5);

// up spring: yellow -10, red -16; lands back; side spring sets ground speed + control lock; diagonal throws both ways
const springTop=(color)=>{const w=new O.World(floor(),[{type:'spring',x:400,y:FY-4,dir:'up',color}]);const p=runner(400-60);let top=1e9,launched=0;
 sim(w,[p],240,f=>I({r:f<60}),(f,e)=>{if(e.some(x=>x.k==='spring'))launched++;top=Math.min(top,p.y);});return {p,h:FY-19-top,launched};};
const ys=springTop('yellow'),rs=springTop('red');
console.log('spring heights yellow',ys.h.toFixed(0),'red',rs.h.toFixed(0));
assert.ok(ys.launched>=1&&ys.h>200&&ys.h<260,`yellow spring ~228 px (${ys.h})`);assert.ok(rs.h>560&&rs.h<640,`red spring ~585 px (${rs.h})`);
w=new O.World(floor(),[{type:'spring',x:600,y:FY-16,dir:'left',w:16,h:32}]);p=runner(500);
ev=sim(w,[p],60,I({r:true}));assert.ok(kinds(ev).includes('spring')&&p.gsp<-9,`side spring sends you back (${p.gsp})`);
w=new O.World(floor(),[{type:'spring',x:400,y:FY-8,dir:'ur',color:'yellow'}]);p=runner(392);
ev=sim(w,[p],10,I({r:true}));assert.ok(!p.ground&&p.xsp>9&&p.ysp<-8,`diagonal spring (${p.xsp},${p.ysp})`);

// spikes: walking onto up spikes with rings: rings scatter in Sonic 3 circles, knocked back, invulnerable
// spikes are solid: walking into their side just stops you; jumping onto the points hurts
w=new O.World(floor(),[{type:'spikes',x:420,y:FY-8,dir:'up',w:32,h:16}]);p=runner(330);p.rings=40;
ev=sim(w,[p],120,I({r:true}));assert.ok(!kinds(ev).includes('ring-loss')&&p.x<420-16-9+1,`spike side blocks (${p.x})`);
p=runner(420);p.rings=40;p.y=FY-120;p.ground=false;
let scat=0;ev=sim(w,[p],40,I(),()=>{scat=Math.max(scat,w.loose.length);});
assert.ok(kinds(ev).includes('ring-loss'),'spike hit makes you drop rings');assert.equal(scat,32,'at most 32 rings scatter');
assert.equal(p.rings,0);assert.ok(p.inv>0||p.hurt,'invulnerable after the hit');
// can't regrab for 64 frames, then can; they vanish after 256
let regot=0;sim(w,[p],300,I(),(f,e)=>{for(const x of e)if(x.k==='ring'){regot++;assert.ok(f+40>=64,`ring regrabbed only after 64 frames (${f})`);}});
assert.ok(regot>0,'picked some scattered rings back up');assert.equal(w.loose.filter(r=>!r.animal).length,0,'scattered rings blink out after 256 frames');
// with no rings: dead; with a shield: shield gone, rings kept
w=new O.World(floor(),[{type:'spikes',x:420,y:FY-8,dir:'up',w:32,h:16}]);p=runner(420);p.y=FY-120;p.ground=false;
ev=sim(w,[p],60,I());assert.ok(p.dead&&kinds(ev).includes('die'),'no rings: dies on spikes');
w=new O.World(floor(),[{type:'spikes',x:420,y:FY-8,dir:'up',w:32,h:16}]);p=runner(420);p.y=FY-120;p.ground=false;p.rings=10;p.shield='fire';
ev=sim(w,[p],60,I());assert.ok(!p.dead&&p.rings===10&&p.shield===null,'shield takes the hit');

// monitors: jump on one from above -> breaks, bounces, gives the item after the pop
w=new O.World(floor(),[{type:'monitor',x:400,y:FY-16,item:'lightning'}]);p=runner(400);p.y=FY-140;p.ground=false;p.jumping=true;p.rolling=true;p.ysp=2;
let bounced=false;ev=sim(w,[p],120,I(),(f,e)=>{if(e.some(x=>x.k==='monitor'))bounced=p.ysp<0;});
assert.ok(bounced,'bounces off the monitor it breaks');
assert.ok(kinds(ev).includes('monitor'),'monitor broken from above');assert.equal(p.shield,'lightning','got the lightning shield');
// walking into a monitor: solid, stops you; rolling into it breaks it
w=new O.World(floor(),[{type:'monitor',x:400,y:FY-16,item:'rings'}]);p=runner(300);sim(w,[p],80,I({r:true}));
assert.ok(p.x<400-15-9+1&&!w.objs[0].broken,`a walker is stopped by the monitor (${p.x})`);
w=new O.World(floor(),[{type:'monitor',x:420,y:FY-16,item:'rings'}]);p=runner(200);
ev=sim(w,[p],200,f=>I({r:f<60,d:f>=60&&f<62}));assert.ok(w.objs[0].broken&&p.rings===10,`rolling breaks it (+10 rings: ${p.rings})`);
// standing on top of a monitor
w=new O.World(floor(),[{type:'monitor',x:400,y:FY-16,item:'shoes'}]);p=runner(400);p.y=FY-32-19-30;p.ground=false;
sim(w,[p],60,I());assert.ok(p.ground&&Math.abs(p.y-(FY-32-19))<.5,`stands on a monitor (${p.y})`);

// badniks: jumping on one pops it with a bounce and 100 points; a chain doubles up; walking into one hurts
w=new O.World(floor(),[{type:'badnik',kind:'shooter',x:400,y:FY-14,still:true},{type:'badnik',kind:'flyer',x:400,y:FY-100,w:12,h:12,still:true}]);p=runner(400);p.rings=5;p.y=FY-220;p.ground=false;p.jumping=true;p.rolling=true;p.ysp=1;
ev=sim(w,[p],120,I());
const pops=ev.filter(e=>e.k==='explode');console.log('badnik pops',pops.map(e=>e.pts));
assert.ok(pops.length===2&&pops[0].pts===100&&pops[1].pts===200,'two-badnik chain 100, 200');assert.equal(p.rings,5,'no damage');
w=new O.World(floor(),[{type:'badnik',kind:'charger',x:420,y:FY-14,dir:-1}]);p=runner(300);p.rings=3;
ev=sim(w,[p],80,I({r:true}));assert.ok(kinds(ev).includes('ring-loss'),'walking into a charger hurts');

// starpost: passing lights it and stores the checkpoint; respawn returns there
w=new O.World(floor(),[{type:'starpost',x:500,y:FY-24}]);p=runner(400);sim(w,[p],60,I({r:true}));
assert.ok(w.objs[0].lit&&p.check&&p.check.x===500,'starpost lit');
O.respawn(p,{x:100,y:FY-19});assert.equal(p.x,500,'respawns at the starpost');

// breakable wall: walker stops, roller at speed smashes it
w=new O.World(floor(),[{type:'wall',x:600,y:FY-32,w:32,h:64}]);p=runner(300);sim(w,[p],200,I({r:true}));
assert.ok(!w.objs[0].gone&&p.x<600-16-9+1,`walker stopped by the wall (${p.x})`);
w=new O.World(floor(),[{type:'wall',x:900,y:FY-32,w:32,h:64}]);p=runner(300);
p.x=700;ev=sim(w,[p],120,f=>I({d:f<20,jump:[3,6,9].includes(f),jumpPress:[3,6,9].includes(f)}));assert.ok(w.objs[0].gone&&kinds(ev).includes('break')&&p.x>900,`a spin dash breaks the wall (${p.x})`);

// one-way platform: jump through from below, land on top; falling platform drops away after you stand on it
w=new O.World(floor(),[{type:'platform',x:400,y:FY-70,w:96,h:16}]);p=runner(400);
sim(w,[p],90,f=>I({jump:f<40,jumpPress:f===2}));assert.ok(p.ground&&p.onObj&&Math.abs(p.y-(FY-70-8-19))<1,`on the platform (${p.y})`);
w=new O.World(floor(300,700),[{type:'platform',x:500,y:FY-40,w:96,h:16,move:'fall'}]);p=runner(500);p.y=FY-40-8-19-2;p.ground=false;
sim(w,[p],200,I());assert.ok(w.objs[0].falling&&(p.y>FY||p.dead),'falling platform drops away');

// moving platform carries you
w=new O.World(floor(300,900),[{type:'platform',x:600,y:FY-40,w:96,h:16,move:'h',range:100,period:240}]);p=runner(600);p.y=FY-40-8-19-1;p.ground=false;
const x0=p.x;sim(w,[p],60,I());assert.ok(p.onObj&&Math.abs(p.x-x0)>40,`carried sideways (${(p.x-x0).toFixed(1)})`);

// vine: grab, swing, jump off with its speed; zip line: ride down to the end and drop
w=new O.World(floor(),[{type:'vine',x:600,y:FY-260,len:120,amp:.9,period:140,phase:40}]);p=runner(600);
let grabbed=false;sim(w,[p],120,f=>I({jump:f>=2&&f<40,jumpPress:f===2}),(f,e)=>{if(e.some(x=>x.k==='grab'))grabbed=true;});
assert.ok(grabbed&&p.hang,'grabbed the vine from a jump');const hx=[];sim(w,[p],70,I(),()=>hx.push(p.x));
assert.ok(Math.max(...hx)-Math.min(...hx)>100,`swings with the vine (${(Math.max(...hx)-Math.min(...hx)).toFixed(0)} px)`);
sim(w,[p],1,I({jump:true,jumpPress:true}));assert.ok(!p.hang&&!p.ground,'jumped off the vine');
w=new O.World(floor(),[{type:'zipline',x0:300,y0:FY-130,x1:1300,y1:FY-40}]);p=runner(300);
sim(w,[p],80,f=>I({jump:f<40,jumpPress:f===2}));assert.ok(p.hang,'caught the zip line handle');
sim(w,[p],400,I());assert.ok(!p.hang&&p.x>1250,`rode the zip line to the end (${p.x.toFixed(0)})`);

// shield moves: fire dash, lightning double jump, bubble bounce, insta-shield (no shield)
const second=(shield,frames=40)=>{const w=new O.World(floor(),[]);const p=runner(400);p.shield=shield;const evs=sim(w,[p],frames,f=>I({jump:f<frames,jumpPress:f===1||f===14}));return {p,evs:kinds(evs)};};
let r=second('fire',16);assert.ok(r.evs.includes('fire-dash')&&r.p.xsp>=7.5,'fire dash');
r=second('lightning',16);assert.ok(r.evs.includes('lightning-jump')&&r.p.ysp<-5,'lightning double jump');
r=second('bubble',60);assert.ok(r.evs.includes('bubble-bounce')&&r.evs.includes('bubble-land')&&!r.p.ground,'bubble bounce off the floor');
r=second(null,16);assert.ok(r.evs.includes('insta-shield')&&r.p.insta>0,'insta-shield');

// speed shoes: top speed 12
w=new O.World(floor(),[]);p=runner(100);p.shoes=600;sim(w,[p],200,I({r:true}));assert.ok(Math.abs(p.gsp-P.SHOES.top)<1e-9,`speed shoes top ${P.SHOES.top} (${p.gsp})`);
// falling into a pit kills
w=new O.World(floor(400,800),[],{bottom:1400});p=runner(200);ev=sim(w,[p],300,I({r:true}));assert.ok(p.dead&&kinds(ev).includes('die'),'pit kills');
console.log('s3-objects OK');
