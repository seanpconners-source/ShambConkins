// BF-23 standalone deterministic VFX contract test. Run: node tests/broforce-fx-art.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';
const src=readFileSync(new URL('../src/engines/broforce/fxArt.js',import.meta.url),'utf8');
const math=Object.create(Math);math.random=()=>{throw Error('global/game RNG is forbidden');};
const sandbox={exports:{},Math:math};new Script(src,{filename:'fxArt.js'}).runInContext(createContext(sandbox));
const api=sandbox.exports;
assert.deepEqual(Object.keys(api),['createBroforceFx','emitBroforceFx','advanceBroforceFx','drawBroforceFx']);
const {createBroforceFx:create,emitBroforceFx:emit,advanceBroforceFx:advance,drawBroforceFx:draw}=api;
const names=['muzzle','hit','ricochet','burst','wall-break','volatile-chain','smoke','sparks',
 'rescue','hero-swap','boss-hit','boss-death','helicopter-arrival','extraction'];
const clone=x=>JSON.parse(JSON.stringify(x));
const count=fx=>fx.particles.length+fx.rings.length+fx.flashes.length;
const check=fx=>{
 assert(fx.particles.length<=fx.maxParticles,'particle cap');
 assert(fx.rings.length<=fx.maxRings,'ring cap');
 assert(fx.flashes.length<=fx.maxFlashes,'flash cap');
 for(const p of fx.particles){
  for(const k of ['x','y','vx','vy','age','life','size','gravity','drag','rotation','spin','parallax'])
   assert(Number.isFinite(p[k]),'finite '+k);
  assert(p.age>=0&&p.age<p.life&&p.life<=1.25);
 }
 for(const p of [...fx.rings,...fx.flashes]){
  for(const k of ['x','y','age','life','radius'])assert(Number.isFinite(p[k]));
  assert(p.age>=0&&p.age<p.life);
 }
 for(const k of ['x','y'])assert(Number.isFinite(fx.shakeOffset[k]));
};
class Canvas{
 constructor(){this.ops=[];this.depth=0;this.globalAlpha=.83;this.fillStyle='#abc';
  this.strokeStyle='#def';this.lineWidth=7;this.imageSmoothingEnabled=true;}
 call(name,...args){
  for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),name+': nonfinite');
  this.ops.push([name,...args.map(a=>typeof a==='number'?+a.toFixed(3):typeof a==='string'?a:'gradient')]);
 }
 save(){this.depth++;this.stack??=[];this.stack.push([this.globalAlpha,this.fillStyle,this.strokeStyle,this.lineWidth,this.imageSmoothingEnabled]);this.call('save');}
 restore(){assert(this.depth>0,'unbalanced restore');this.depth--;[this.globalAlpha,this.fillStyle,this.strokeStyle,this.lineWidth,this.imageSmoothingEnabled]=this.stack.pop();this.call('restore');}
 fillRect(...a){this.call('fillRect',...a);}
 beginPath(){this.call('beginPath');}moveTo(...a){this.call('moveTo',...a);}lineTo(...a){this.call('lineTo',...a);}
 closePath(){this.call('closePath');}fill(){this.call('fill');}stroke(){this.call('stroke');}
 translate(...a){this.call('translate',...a);}rotate(...a){this.call('rotate',...a);}
 createRadialGradient(...a){this.call('gradient',...a);return {addColorStop:(...a)=>this.call('stop',...a)};}
}
function render(fx,{width=390,height=780,camera={x:0,y:0},layer='all'}={}){
 const c=new Canvas(),viewport=Object.freeze({width,height});const snapshot=clone(fx);
 draw(c,{fx,camera,viewport,layer,time:100});
 assert.equal(c.depth,0);assert.equal(c.globalAlpha,.83);assert.equal(c.fillStyle,'#abc');
 assert.equal(c.strokeStyle,'#def');assert.equal(c.lineWidth,7);assert.equal(c.imageSmoothingEnabled,true);
 assert.deepEqual(clone(fx),snapshot,'drawing must not change effect state');
 return c;
}
const fx=create('locked-seed');
assert(fx.maxParticles<=140);assert.equal(count(fx),0);
assert(!emit(fx,{type:'invalid',x:1,y:2}));assert(!emit(fx,{type:'burst',x:NaN,y:1}));
assert(!emit(fx,{type:'burst',x:1,y:Infinity}));
assert(!emit(fx,null));
const frozen=Object.freeze({type:'burst',x:102,y:212,dx:-1,dy:0,radius:32,intensity:1.2});
assert(emit(fx,frozen));assert.deepEqual(frozen,{type:'burst',x:102,y:212,dx:-1,dy:0,radius:32,intensity:1.2});
assert(fx.particles.length>10&&fx.flashes.length===1);
const initial=clone(fx);advance(fx,0);advance(fx,-1);advance(fx,NaN);advance(fx,Infinity);
assert.deepEqual(clone(fx),initial,'paused/invalid dt is a pure no-op');
assert(render(fx).ops.length>20);
const out=render(fx,{camera:Object.freeze({x:1000000,y:1000000})});
assert(out.ops.length<=3,'offscreen effects are culled');
for(const [width,height] of [[390,780],[780,390],[1100,700]]){
 const ctx=render(fx,{width,height,camera:Object.freeze({x:0,y:0})});
 assert(ctx.ops.length<1600,'viewport render budget '+width+'x'+height);
}
assert(render(fx,{layer:'back'}).ops.length>2);assert(render(fx,{layer:'front'}).ops.length>2);
const ct=new Canvas();ct.fillRect=()=>{throw Error('simulated context failure');};
assert.throws(()=>draw(ct,{fx,camera:{x:0,y:0},viewport:{width:390,height:780}}),/simulated context/);
assert.equal(ct.depth,0,'restore in finally on Canvas exception');
const idle=new Canvas();draw(idle,{fx,viewport:{width:0,height:0}});assert.equal(idle.ops.length,0);
draw(null,{fx,viewport:{width:390,height:780}});
for(const name of names){
 const f=create('per-event');assert(emit(f,Object.freeze({name,x:0,y:0,dx:0,dy:-1})));
 assert(count(f)>0,name+' has visible feedback');check(f);
 advance(f,.042);check(f);
 const c=render(f,{camera:{x:-190,y:-300}});assert(c.ops.length>2,name+' drawable');
 advance(f,3);assert.equal(count(f),0,name+' expires');
 assert.equal(f.shakeOffset.x,0);assert.equal(f.shakeOffset.y,0);
}
for(const options of [{quality:'low'},{reducedMotion:true},{quality:'low',reducedMotion:true}]){
 const f=create(123,options);
 for(let i=0;i<170;i++){assert(emit(f,{type:'volatile-chain',x:180,y:260,intensity:50,radius:10000}));check(f);}
 if(options.reducedMotion){assert(f.maxParticles<=28);assert(f.maxRings<=3);assert.equal(f.flashes.length,0);
  assert.equal(f.shake.power,0);}
 if(options.quality==='low')assert(f.maxParticles<=56);
 const t=clone(f);advance(f,0);assert.deepEqual(clone(f),t);
 advance(f,.05);check(f);render(f);
}
const replay=(seed)=>{
 const f=create(seed);
 for(let i=0;i<names.length;i++){
  emit(f,{type:names[i],x:210+i*2,y:340-i,dx:-1,dy:.5,intensity:1.25});advance(f,.017);
 }
 return clone(f);
};
assert.deepEqual(replay('beacon'),replay('beacon'),'same seeded cosmetic event stream');
assert.notDeepEqual(replay('beacon'),replay('different'),'different seed has independent visuals');
const a=create(1),b=create(1);emit(a,{type:'burst',x:120,y:150});
assert.equal(b.rngState,create(1).rngState,'other instances never consume RNG');
const hot=create(4242);let peak=0;
for(let i=0;i<800;i++){
 const name=names[i%names.length];
 for(let j=0;j<3;j++)emit(hot,{type:name,x:100+i%60,y:300-j*14,intensity:1.5});
 advance(hot,.016);check(hot);peak=Math.max(peak,count(hot));
 if(i%40===0)assert(render(hot,{camera:{x:70,y:200}}).ops.length<2800,'high stress draw bounded');
}
assert(peak<=142,'global object budget stays bounded');
advance(hot,12);assert.equal(count(hot),0,'event lifetime cleanup');
assert.equal(hot.shake.remaining,0);
const edge=create(9);emit(edge,{type:'boss-death',x:Number.MAX_VALUE,y:-Number.MAX_VALUE});
advance(edge,2);check(edge);render(edge,{camera:{x:-Number.MAX_VALUE,y:Number.MAX_VALUE}});
assert(!src.includes('require(')&&!src.includes('document.')&&!src.includes('window.')&&!src.includes('Math.random('));
console.log('PASS BF-23: '+names.length+' event types, seeded replay, bounded stress (800*3 events, peak '+peak+'), canvas state/exception/culling, reduced motion, all viewport sizes');
