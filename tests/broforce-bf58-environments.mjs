// BF-58 -- stage-specific art, material/collision truth, deterministic Canvas costs.
// Run: node tests/broforce-bf58-environments.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/engines/broforce/themeArt.js'),'utf8');
const stages=['broforce-jungle','broforce-factory','broforce-city','broforce-desert'];
const dimensions=[{width:390,height:780},{width:780,height:390},{width:840,height:700}];
const paletteMid={
 'broforce-factory':['#60504a','#916c4f','#77777b','#788c91','#d66b37'],
 'broforce-city':['#776774','#997365','#91919b','#8497a9','#f08056'],
 'broforce-desert':['#c29569','#c0966c','#d6ad80','#9caaa7','#db7a43']
};
const baseStyle='#1a1f27';
class SpyContext {
 constructor(){
  this.fillStyle=baseStyle;this.imageSmoothingEnabled=true;this.frames=[];
  this.ops=0;this.tileDraws=0;this.colors=new Set();this.hash=crypto.createHash('sha256');
 }
 mark(op,...args){
  this.ops++;
  assert(this.ops<250000,'per-viewport draw budget exceeded');
  for(const value of args)if(typeof value==='number')assert(Number.isFinite(value),'nonfinite Canvas coordinate');
  this.hash.update(op+'|'+this.fillStyle+'|'+args.map(v=>typeof v==='number'?v.toFixed(3):String(v)).join('|')+';');
 }
 save(){this.frames.push([this.fillStyle,this.imageSmoothingEnabled]);this.mark('save');}
 restore(){
  assert(this.frames.length,'unbalanced Canvas restore');
  this.mark('restore');[this.fillStyle,this.imageSmoothingEnabled]=this.frames.pop();
 }
 fillRect(...a){this.colors.add(this.fillStyle);this.mark('fillRect',...a);}
 beginPath(){this.mark('beginPath');}closePath(){this.mark('closePath');}
 rect(...a){this.mark('rect',...a);}clip(){this.mark('clip');}
 moveTo(...a){this.mark('moveTo',...a);}lineTo(...a){this.mark('lineTo',...a);}
 arc(...a){this.mark('arc',...a);}fill(){this.colors.add(this.fillStyle);this.mark('fill');}
 translate(...a){this.mark('translate',...a);}scale(...a){this.mark('scale',...a);}
 drawImage(sprite,...a){
  this.tileDraws++;
  assert(sprite&&sprite.colors,'atlas sprite missing');
  for(const c of sprite.colors)this.colors.add(c);
  this.mark('drawImage',...a,sprite.colors.join(','));
 }
 finish(){
  assert.equal(this.frames.length,0,'Canvas state stack leaked');
  assert.equal(this.fillStyle,baseStyle,'Canvas fillStyle leaked');
  assert.equal(this.imageSmoothingEnabled,true,'Canvas smoothing leaked');
  return {signature:this.hash.digest('hex'),ops:this.ops,tiles:this.tileDraws,colors:this.colors};
 }
}
function fixture(width=100,height=40){
 const tiles=new Uint8Array(width*height);
 for(let y=20;y<height;y++)for(let x=0;x<width;x++)
  if(y>=27||(x+y*3)%7<3)tiles[y*width+x]=1+(x+y)%5;
 return {width,height,tileSize:16,tiles};
}
function tiny(values){return {width:values.length,height:1,tileSize:16,tiles:Uint8Array.from(values)};}
function harness(withAtlas){
 let allocations=0;const jungleCalls=[];
 class PixelContext {constructor(colors){this.colors=colors;this.fillStyle='';}
  fillRect(){this.colors.add(this.fillStyle);}
 }
 class Offscreen {constructor(w,h){assert.equal(w,16);assert.equal(h,16);this.colors=new Set();allocations++;}
  getContext(type){assert.equal(type,'2d');return new PixelContext(this.colors);}
 }
 const exports={};
 const safeMath=Object.create(Math);
 safeMath.random=()=>{throw Error('environment art must never consume random state');};
 vm.runInNewContext(source,{
  exports,Math:safeMath,OffscreenCanvas:withAtlas?Offscreen:undefined,
  require:(id)=>{assert.equal(id,'src/engines/broforce/worldArt.js');
   return {drawBroforceWorld:(g,opts)=>{
    jungleCalls.push(opts);
    g.fillStyle='#1b4847';g.fillRect(0,0,opts.viewport.width,opts.viewport.height);
   }};
  }
 },{filename:'themeArt.js',timeout:10000});
 const draw=exports.drawBroforceEnvironment;
 assert.equal(typeof draw,'function');
 function shot(stageId,{map=fixture(),camera={x:0,y:0},viewport=dimensions[0],time=9.25,quality='high'}={}){
  const g=new SpyContext();
  draw(g,{stageId,map,camera,viewport,time,quality});
  return g.finish();
 }
 return {shot,allocations:()=>allocations,jungleCalls};
}
assert(!source.includes('Math.random(')&&!source.includes('fetch(')&&!source.includes('document.'),
 'art cannot use unseeded random, networking, or document resources');
const direct=harness(false),atlas=harness(true);
const map=fixture(),original=map.tiles.slice(),names=stages.map(stage=>direct.shot(stage).signature);
assert.equal(new Set(names).size,4,'Jungle, Factory, City Siege and Desert Assault must be distinct');
for(let i=0;i<stages.length;i++){
 const stage=stages[i];
 assert.equal(direct.shot(stage).signature,names[i],'fixed seed/camera replay drift: '+stage);
 for(const viewport of dimensions){
  const opts={map,camera:{x:73,y:91,zoom:1.5},viewport,time:4.5};
  const a=direct.shot(stage,opts),b=direct.shot(stage,opts);
  assert.equal(a.signature,b.signature,'view geometry must be deterministic: '+stage);
  assert(a.ops<250000,'scene must cull detail: '+stage);
 }
}
assert.deepEqual(map.tiles,original,'drawing must not change live collision tiles');
assert.equal(direct.jungleCalls.length,8,'Jungle should only delegate to BF-24 world art');
assert(direct.jungleCalls.every(c=>c.quality==='high'),'Jungle quality forwarding lost');
assert.equal(atlas.allocations(),0,'Jungle should not eagerly create factory/city/desert atlases');

const one=fixture();
for(const stage of stages.slice(1)){
 // Every live destructible material must be visible, 0 must be air, and its
 // current cleared value must remove pixels rather than render stale damage.
 const empty=direct.shot(stage,{map:tiny([0])});
 for(let type=1;type<=5;type++){
  const live=direct.shot(stage,{map:tiny([type])});
  assert.notEqual(live.signature,empty.signature,'invisible live material '+stage+'/'+type);
  assert(live.colors.has(paletteMid[stage][type-1]),
   'incorrect material palette '+stage+'/'+type);
  const removed=tiny([type]);removed.tiles[0]=0;
  assert.equal(direct.shot(stage,{map:removed}).signature,empty.signature,
   'broken tile must disappear immediately '+stage+'/'+type);
 }
 // An unknown adjacent tile is air for both rendering and collision-like edges.
 assert.equal(direct.shot(stage,{map:tiny([3,99])}).signature,
  direct.shot(stage,{map:tiny([3,0])}).signature,
  'invalid neighboring tile must not erase platform lip '+stage);
 // A moving camera must scroll depth, while draw never writes to the map.
 assert.notEqual(direct.shot(stage,{map:one,camera:{x:40,y:65}}).signature,
  direct.shot(stage,{map:one,camera:{x:71,y:65}}).signature,'no camera parallax '+stage);
 const before=one.tiles.slice();
 direct.shot(stage,{map:one,camera:Object.freeze({x:41,y:96,zoom:1.65}),
  viewport:Object.freeze({width:780,height:390})});
 assert.deepEqual(one.tiles,before,'map mutated during draw '+stage);
 for(const viewport of dimensions){
  const common={map:one,camera:{x:23,y:0},viewport,time:6.5};
  const high=direct.shot(stage,{...common,quality:'high'});
  const low=direct.shot(stage,{...common,quality:'low'});
  assert(high.ops>low.ops,'low-quality drawing should remove nonessential work '+stage);
 }
 // Both atlas and software fallback must faithfully observe the five live tiles.
 const painted=atlas.shot(stage,{map:tiny([1,2,3,4,5,0])});
 assert.equal(painted.tiles,5,'visible live tiles only '+stage);
 for(const color of paletteMid[stage])assert(painted.colors.has(color),'atlas material missing '+color);
 assert.equal(atlas.shot(stage,{map:tiny([1,0,3,0,5,0])}).tiles,3,
  'new broken tiles must stop drawing in atlas mode');
 const large=fixture(7000,32),larger=fixture(12000,32);
 const a=direct.shot(stage,{map:large,camera:{x:40000,y:60}});
 const b=direct.shot(stage,{map:larger,camera:{x:40000,y:60}});
 assert.equal(a.ops,b.ops,'draw work should ignore far-off terrain columns '+stage);
 assert(a.ops<60000,'Android draw budget exceeded '+stage);
 assert.equal(direct.shot(stage,{map:tiny([5]),camera:{x:900000,y:900000}}).signature,
  direct.shot(stage,{map:tiny([0]),camera:{x:900000,y:900000}}).signature,
  'offscreen terrain should be culled '+stage);
}
assert.equal(atlas.allocations(),60,'only active factory/city/desert should allocate 20 variants each');
atlas.shot('broforce-factory',{map:tiny([2])});
atlas.shot('broforce-desert',{map:tiny([2])});
assert.equal(atlas.allocations(),60,'atlas should be shared on subsequent frames');
for(const invalid of [null,{}, {width:0,height:0,tiles:[]},
 {width:1,height:1,tiles:[]},{width:1,height:1,tiles:[-4]}]){
 assert.doesNotThrow(()=>direct.shot('broforce-city',{map:invalid}));
}
assert.doesNotThrow(()=>direct.shot('broforce-desert',{camera:{x:Infinity,y:NaN}}));
console.log('BF-58 environments PASS: four stage identities, 1..5 materials, broken/invalid tiles, 3 viewport geometries, deterministic draw, parallax, lazy 20-per-stage atlases and culling.');
