// BF-29 isolated renderer regression. Run: node tests/broforce-theme-art.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=fs.readFileSync(path.join(root,'src/engines/broforce/themeArt.js'),'utf8');
const names=['broforce-jungle','broforce-factory','broforce-city','broforce-desert'];
const jungleCalls=[];
const out={};
const safeMath=Object.create(Math);safeMath.random=()=>{throw Error('cosmetic draw must never consume Math.random');};
vm.runInNewContext(src,{exports:out,Math:safeMath,require:(name)=>{
 assert.equal(name,'src/engines/broforce/worldArt.js');return {drawBroforceWorld:(g,options)=>{
  jungleCalls.push(options);g.fillStyle='#1b4847';g.fillRect(0,0,options.viewport.width,options.viewport.height);
 }};
},OffscreenCanvas:undefined}, {filename:'themeArt.js',timeout:10000});
assert.deepEqual(Object.keys(out),['drawBroforceEnvironment']);
const {drawBroforceEnvironment:draw}=out;
class Ctx{
 constructor(){this.hash=crypto.createHash('sha256');this.calls=0;this.tiles=0;this.depth=0;this.imageSmoothingEnabled=true;this.fillStyle='#555777';this.stack=[];this.translateXs=[];}
 log(op,...params){this.calls++;for(const v of params)if(typeof v==='number')assert(Number.isFinite(v),'bad finite canvas coordinate');
  this.hash.update(op+'|'+this.fillStyle+'|'+params.map(x=>typeof x==='number'?x.toFixed(3):String(x)).join('|')+';');}
 save(){this.stack.push([this.fillStyle,this.imageSmoothingEnabled]);this.depth++;this.log('save');}
 restore(){assert(this.stack.length,'restore without save');this.log('restore');[this.fillStyle,this.imageSmoothingEnabled]=this.stack.pop();this.depth--;}
 beginPath(){this.log('beginPath');}closePath(){this.log('closePath');}
 rect(...args){this.log('rect',...args);}clip(){this.log('clip');}
 moveTo(...args){this.log('moveTo',...args);}lineTo(...args){this.log('lineTo',...args);}fill(){this.log('fill');}
 fillRect(...args){this.log('fillRect',...args);}arc(...args){this.log('arc',...args);}
 translate(x,y){this.translateXs.push(x);this.log('translate',x,y);}
 scale(...args){this.log('scale',...args);}
 drawImage(...args){this.tiles++;this.log('drawImage',...args.slice(1));}
 digest(){assert.equal(this.depth,0,'canvas stack left altered');assert.equal(this.fillStyle,'#555777','fillStyle changed');assert.equal(this.imageSmoothingEnabled,true,'smoothing changed');return this.hash.digest('hex');}
}
function fixture(w=200,h=44){const tiles=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(y>=22&&(y>=29||((x+3*y)%9)<4))tiles[y*w+x]=1+((x+y*3)%5);
 }
 return {width:w,height:h,tileSize:16,tiles};
}
function shot(stageId,map=fixture(),camera={x:77,y:85},viewport={width:390,height:780},time=8.25,quality='high'){
 const g=new Ctx();draw(g,{stageId,map,camera,viewport,time,quality});return {g,signature:g.digest()};
}
const signatures=names.map(stageId=>shot(stageId).signature);
assert.equal(new Set(signatures).size,4,'four themes must be visually distinct');
for(let i=0;i<4;i++)assert.equal(shot(names[i]).signature,signatures[i],names[i]+' must replay deterministically');
assert.equal(jungleCalls.length,2,'jungle delegates to BF-24');
assert(jungleCalls.every(c=>c.quality==='high'),'quality forwarded to BF-24');
for(let i=1;i<4;i++){
 const id=names[i],map=fixture(),copy=map.tiles.slice(),camera={x:79,y:91,zoom:1.65},viewport={width:780,height:390};
 Object.freeze(camera);Object.freeze(viewport);
 const a=shot(id,map,camera,viewport),b=shot(id,map,{x:99,y:91,zoom:1.65},viewport);
 assert.notEqual(a.signature,b.signature,id+' must scroll with camera');
 assert.deepEqual(map.tiles,copy,'never mutate actual terrain');
 assert.deepEqual(camera,{x:79,y:91,zoom:1.65});assert.deepEqual(viewport,{width:780,height:390});
 const low=shot(id,map,{x:0,y:0},{width:1100,height:700},1,'low');
 const high=shot(id,map,{x:0,y:0},{width:1100,height:700},1,'high');
 assert(high.g.calls>low.g.calls,id+' low-quality scene should draw fewer details');
 const far=shot(id,map,{x:9999999,y:9999999});
 const farNoMap=shot(id,{width:0,height:0,tiles:[]},{x:9999999,y:9999999});
 assert.equal(far.signature,farNoMap.signature,'offscreen tiles must never render');
 assert(far.g.calls<15000,'offscreen camera art stays bounded');
 const tiny={width:1,height:1,tiles:Uint8Array.from([5]),tileSize:16};
 assert.notEqual(shot(id,tiny,{x:0,y:0}).signature,shot(id,{...tiny,tiles:Uint8Array.from([0])},{x:0,y:0}).signature,'live tile ID influences pixels');
 for(let type=0;type<=5;type++)shot(id,{...tiny,tiles:Uint8Array.from([type])},{x:0,y:0});
 for(const dimension of [{width:390,height:780},{width:780,height:390},{width:840,height:900},{width:1100,height:700}]){
  const s=shot(id,map,{x:180,y:170},dimension);assert(s.g.calls<200000,'viewport-bounded renderer '+id);}
 const big=fixture(7000,32),bigger=fixture(12000,32);
 const left=shot(id,big,{x:40000,y:60},{width:390,height:780});
 const right=shot(id,bigger,{x:40000,y:60},{width:390,height:780});
 assert.equal(left.g.calls,right.g.calls,'offscreen columns must not affect costs');
 assert(left.g.calls<60000,'large terrain must be culled');
 for(const bad of [null,{}, {width:0,height:0,tiles:[]}, {width:1,height:1,tiles:[]}, {width:1,height:1,tiles:[99]}]){
  assert.doesNotThrow(()=>shot(id,bad,{x:0,y:0}));
 }
 for(const c of [{x:-1e12,y:-1e12},{x:1e12,y:1e12},{x:NaN,y:Infinity},{x:100,y:10,zoom:.5}])shot(id,map,c);
}
assert.doesNotThrow(()=>draw(null,{stageId:'broforce-city',viewport:{width:10,height:10}}));
assert.doesNotThrow(()=>draw(new Ctx(),{stageId:'broforce-city',viewport:{width:0,height:0}}));
assert.doesNotThrow(()=>draw(new Ctx(),{stageId:'broforce-jungle',viewport:{width:15,height:15},map:null}));
assert(!src.includes('Math.random(')&&!src.includes('document.')&&!src.includes('window.')&& !src.includes('fetch('));
console.log('BF-29 theme artwork PASS (isolated mock; jungle BF-24 delegation stubbed).');
names.forEach((n,i)=>console.log(' '+n+': '+signatures[i]));

