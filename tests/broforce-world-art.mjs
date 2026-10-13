// BF-24 isolated Canvas renderer regression. Run: node tests/broforce-world-art.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,'../src/engines/broforce/worldArt.js'),'utf8');
const exports={};const pureMath=Object.create(Math);
pureMath.random=()=>{throw Error('Artwork must not depend on Math.random');};
vm.runInNewContext(source,{exports,Math:pureMath,Uint8Array,Number,Object,Array,OffscreenCanvas:undefined},
 {filename:'worldArt.js',timeout:10000});
const {drawBroforceWorld}=exports;assert.equal(typeof drawBroforceWorld,'function');
assert.deepEqual(Object.keys(exports),['drawBroforceWorld']);

class MockGradient{addColorStop(offset,color){assert(Number.isFinite(offset));assert.equal(typeof color,'string');}}
class MockCtx{
 constructor(){this.calls=0;this.chunks=[];this.depth=0;this.imageSmoothingEnabled=true;this.fillStyle='#123456';}
 record(op,...args){this.calls++;if(this.chunks.length<850)this.chunks.push([op,...args.map(v=>typeof v==='number'?Number(v.toFixed(3)):String(v))]);
  for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),'non-finite canvas coordinate');}
 save(){this.depth++;this.record('save');this.stack??=[];this.stack.push([this.fillStyle,this.imageSmoothingEnabled]);}
 restore(){this.depth--;assert(this.depth>=0);this.record('restore');[this.fillStyle,this.imageSmoothingEnabled]=this.stack.pop();}
 fillRect(...v){this.record('fillRect',...v);}
 beginPath(){this.record('beginPath');}
 closePath(){this.record('closePath');}
 moveTo(...v){this.record('moveTo',...v);}
 lineTo(...v){this.record('lineTo',...v);}
 rect(...v){this.record('rect',...v);}
 clip(){this.record('clip');}
 fill(){this.record('fill');}
 arc(...v){this.record('arc',...v);}
 translate(...v){this.record('translate',...v);}
 scale(...v){this.record('scale',...v);}
 drawImage(...v){this.record('drawImage',...v.slice(1));}
 createLinearGradient(...v){this.record('linearGradient',...v);return new MockGradient();}
 createRadialGradient(...v){this.record('radialGradient',...v);return new MockGradient();}
}
const snap=(map,camera,viewport,time=13.75,quality='high')=>{
 const g=new MockCtx();drawBroforceWorld(g,{map,camera,viewport,time,quality});
 assert.equal(g.depth,0,'save/restore balance');assert.equal(g.imageSmoothingEnabled,true,'preserve ctx image smoothing');
 assert.equal(g.fillStyle,'#123456','preserve caller fillStyle');return g;
};
const makeMap=(w,h)=>{const tiles=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 if(y<Math.max(2,h*.44))continue;
 tiles[y*w+x]=x%33===0?0:1+((x*3+y*7)%5);
 }return {width:w,height:h,tileSize:16,tiles};};

const empty=snap({width:0,height:0,tiles:new Uint8Array()},{x:0,y:0},{width:390,height:780});
assert(empty.calls>0,'empty map still draws scenery');
const tiny={width:1,height:1,tileSize:16,tiles:new Uint8Array([5])};
const t0=snap(tiny,{x:0,y:0},{width:390,height:780});assert(t0.calls>empty.calls);
const t1=snap(tiny,{x:0,y:0},{width:390,height:780});assert.deepEqual(t0.chunks,t1.chunks,'same frame produces same art');
for(const id of [0,1,2,3,4,5]){
 const one={...tiny,tiles:new Uint8Array([id])};
 assert(snap(one,{x:0,y:0},{width:390,height:780}).calls>100);
}
const map=makeMap(640,100),before=map.tiles.slice(),opts={map,camera:{x:220,y:610},viewport:{width:1100,height:700},time:22};
const a=snap(...[map,opts.camera,opts.viewport,opts.time]);
const b=snap(map,{x:240,y:610},opts.viewport,opts.time);
assert.notDeepEqual(a.chunks,b.chunks,'camera x moves parallax and tiles');
assert.deepEqual(map.tiles,before,'tiles are read-only');
assert.deepEqual(opts.camera,{x:220,y:610},'camera not changed');
assert.deepEqual(opts.viewport,{width:1100,height:700},'viewport not changed');
assert(a.calls<150000,'only visible tiles are rendered');
const nearEnd=snap(map,{x:9999999,y:9999999},{width:390,height:780});
assert(nearEnd.calls<10000,'outside-map camera cannot scan the map');
const large=makeMap(8000,110),lg=snap(large,{x:70000,y:1100},{width:390,height:780});
const wider=makeMap(16000,110),wg=snap(wider,{x:70000,y:1100},{width:390,height:780});
assert(lg.calls===wg.calls,'tile render cost is independent of offscreen map width');
assert(lg.calls<50000,'only visible large-map columns are drawn');
for(const c of [{x:-1e12,y:-1e12},{x:1e12,y:1e12},{x:-9999999,y:9999999},{x:1e25,y:1e25},{x:Number.MAX_VALUE,y:Number.MAX_VALUE},{x:NaN,y:Infinity}])
 assert(snap(map,c,{width:390,height:780}).calls<10000);
const low=snap(map,{x:0,y:0},{width:390,height:780},0,'low');
const high=snap(map,{x:0,y:0},{width:390,height:780},0,'high');
assert(high.calls>low.calls,'low quality draws fewer particles / detail');
assert(snap(map,{x:0,y:0},{width:390,height:780},1).calls>0,'different valid timestamps render');
assert.doesNotThrow(()=>drawBroforceWorld(null,{map,viewport:{width:1,height:1}}));
assert.doesNotThrow(()=>drawBroforceWorld(new MockCtx(),{map,viewport:{width:0,height:0}}));
assert(!source.includes('require(')&&!source.includes('document.')&&!source.includes('window.')); // standalone service
console.log(`BF-24 world artwork OK; empty=${empty.calls}, phone=${t0.calls}, desktop=${a.calls}, large-map=${lg.calls}, low/high=${low.calls}/${high.calls}`);
