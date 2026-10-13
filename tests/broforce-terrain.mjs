// Run directly: node tests/broforce-terrain.mjs
// Load the unregistered standalone CommonJS-style module without a DOM/bundler.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {runInNewContext} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const exports={};
runInNewContext(readFileSync(resolve(root,'src/engines/broforce/terrain.js'),'utf8'),
 {exports,Uint8Array},{filename:'terrain.js',timeout:3000});
const {TILE,createTerrain,tileAt,isSolidTile,damageTerrain}=exports;
const {EMPTY,SOIL,WOOD,STONE,STEEL,VOLATILE}=TILE;
const plain=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const world=(width,height,tiles,tileSize)=>createTerrain({width,height,tiles,tileSize});

// Public API shape and input isolation.
test('frozen constants, dimensions, default HP and input copies',()=>{
 assert.deepEqual(plain(TILE),{EMPTY:0,SOIL:1,WOOD:2,STONE:3,STEEL:4,VOLATILE:5});
 assert.equal(Object.isFrozen(TILE),true);
 assert.deepEqual(Object.keys(exports).sort(),['TILE','createTerrain','damageTerrain','isSolidTile','tileAt'].sort());
 const input=new Uint8Array([EMPTY,SOIL,WOOD,STONE,STEEL,VOLATILE]);
 const w=world(6,1,input);
 assert.deepEqual([...w.hp],[0,1,1,3,255,1]);
 assert.deepEqual([...w.tiles],[...input]);
 assert.notEqual(w.tiles,input);assert.equal(w.revision,0);assert.equal(w.tileSize,16);
 damageTerrain(w,{x:24,y:8,radius:0});
 assert.equal(input[1],SOIL);assert.equal(w.tiles[1],EMPTY);
 const zero=createTerrain({width:0,height:0});assert.equal(zero.tiles.length,0);
 assert.throws(()=>world(2,2,[SOIL]),/match/);
 assert.throws(()=>world(1,1,[99]),/Invalid/);
 assert.throws(()=>createTerrain({width:2.2,height:1}),/dimensions/);
 assert.throws(()=>createTerrain({width:1,height:1,tileSize:0}),/tileSize/);
});

test('steel boundary sentinel and solid lookup',()=>{
 const w=world(2,1,[EMPTY,STONE]);
 for(const [c,r] of [[-1,0],[0,-1],[2,0],[0,1],[0.5,0],[NaN,0]]){
  assert.equal(tileAt(w,c,r),STEEL);assert.equal(isSolidTile(w,c,r),true);
 }
 assert.equal(tileAt(w,0,0),EMPTY);assert.equal(isSolidTile(w,0,0),false);
 assert.equal(tileAt(w,1,0),STONE);assert.equal(isSolidTile(w,1,0),true);
});

test('stone loses 3 HP over repeated direct hits; revision advances once per call',()=>{
 const w=world(3,1,[STONE,SOIL,STEEL]);
 for(let hp=2;hp>=1;hp--){
  const r=damageTerrain(w,{x:8,y:8,radius:0});
  assert.deepEqual(plain(r.damaged),[{col:0,row:0,type:STONE,hp}]);
  assert.deepEqual(plain(r.destroyed),[]);
  assert.deepEqual(plain(r.blasts),[{x:8,y:8,radius:0}]);
  assert.equal(w.revision,3-hp);
 }
 const last=damageTerrain(w,{x:8,y:8,radius:0});
 assert.deepEqual(plain(last.destroyed),[{col:0,row:0,type:STONE}]);
 assert.deepEqual(plain(last.damaged),[]);
 assert.equal(tileAt(w,0,0),EMPTY);assert.equal(w.hp[0],0);assert.equal(w.revision,3);
 const repeat=damageTerrain(w,{x:8,y:8,radius:0});
 assert.equal(repeat.destroyed.length,0);assert.equal(w.revision,3);
});

test('steel is indestructible, even under massive repeated damage',()=>{
 const w=world(2,1,[STEEL,STONE]);
 for(let i=0;i<6;i++)damageTerrain(w,{x:8,y:8,radius:0,damage:Infinity});
 assert.equal(w.hp[0],255);assert.equal(tileAt(w,0,0),STEEL);
 assert.equal(w.revision,0);assert.equal(w.hp[1],3);
});

test('true circular tile overlap excludes corners of the bounding square',()=>{
 const w=world(3,3,new Array(9).fill(SOIL));
 const result=damageTerrain(w,{x:24,y:24,radius:9});
 assert.deepEqual(plain(result.destroyed),[
  {col:1,row:0,type:SOIL},
  {col:0,row:1,type:SOIL},{col:1,row:1,type:SOIL},{col:2,row:1,type:SOIL},
  {col:1,row:2,type:SOIL}
 ]);
 for(const i of [0,2,6,8])assert.equal(w.tiles[i],SOIL);
 assert.equal(w.revision,1);
});

test('zero-radius hits one containing tile; off-map impacts are safe',()=>{
 const w=world(2,1,[SOIL,WOOD]);
 assert.equal(damageTerrain(w,{x:-0.01,y:8,radius:0}).destroyed.length,0);
 assert.equal(damageTerrain(w,{x:0,y:8,radius:0}).destroyed.length,1);
 assert.equal(tileAt(w,1,0),WOOD);
 const hit=damageTerrain(w,{x:16,y:8,radius:0});
 assert.deepEqual(plain(hit.destroyed),[{col:1,row:0,type:WOOD}]);
 assert.equal(w.revision,2);
 assert.deepEqual(plain(damageTerrain(w,{x:999,y:999,radius:10}).destroyed),[]);
});

test('volatile blasts chain in BFS order with specified centers and damage',()=>{
 const w=world(8,1,[VOLATILE,STONE,VOLATILE,STONE,VOLATILE,STONE,VOLATILE,STONE]);
 const hit=damageTerrain(w,{x:8,y:8,radius:0});
 assert.deepEqual(plain(hit.blasts),[
  {x:8,y:8,radius:0},{x:8,y:8,radius:40},
  {x:40,y:8,radius:40},{x:72,y:8,radius:40},{x:104,y:8,radius:40}
 ]);
 assert.deepEqual(plain(hit.destroyed.filter(t=>t.type===VOLATILE).map(t=>t.col)),[0,2,4,6]);
 assert.equal(hit.destroyed.filter(t=>t.type===STONE).length,4);
 assert.deepEqual([...w.tiles],new Array(8).fill(EMPTY));
 assert.equal(w.revision,1);
});

test('multiple detonations stay row-major at each breadth-first layer',()=>{
 const tiles=new Array(5*3).fill(EMPTY);
 tiles[1*5]=VOLATILE;tiles[0*5+2]=VOLATILE;tiles[2*5+2]=VOLATILE;
 const w=world(5,3,tiles);
 const hit=damageTerrain(w,{x:8,y:24,radius:0});
 assert.deepEqual(plain(hit.blasts),[
  {x:8,y:24,radius:0},{x:8,y:24,radius:40},
  {x:40,y:8,radius:40},{x:40,y:40,radius:40}
 ]);
 assert.deepEqual(plain(hit.destroyed.map(t=>[t.col,t.row])),[[0,1],[2,0],[2,2]]);
});

test('surviving damaged tiles carry final HP, not transient earlier HP',()=>{
 const w=world(4,1,[VOLATILE,STONE,STONE,STEEL]);
 const hit=damageTerrain(w,{x:16,y:8,radius:17,damage:1});
 // First event wounds stones and triggers volatile; secondary finishes stones.
 assert.deepEqual(plain(hit.damaged),[]);
 assert.deepEqual(plain(hit.destroyed.map(t=>t.type)),[VOLATILE,STONE,STONE]);
 assert.equal(w.revision,1);
});

test('huge/infinite radii are bounded by the grid and queue cap',()=>{
 const tiles=new Array(256).fill(VOLATILE);
 const w=world(256,1,tiles);
 const hit=damageTerrain(w,{x:8,y:8,radius:Infinity});
 assert.equal(hit.destroyed.length,256);
 assert.equal(hit.blasts.length,64);
 assert.equal(hit.damaged.length,0);
 assert.equal(w.revision,1);
 assert.equal(damageTerrain(w,{x:8,y:8,radius:1e300}).destroyed.length,0);
 assert.equal(w.revision,1);
});

test('non-damaging/invalid attacks never touch revision',()=>{
 const w=world(1,1,[SOIL]);
 for(const attack of [
  {x:8,y:8,radius:9,damage:0},{x:8,y:8,radius:9,damage:-9},
  {x:8,y:8,radius:NaN},{x:8,y:8,radius:-1},
  {x:Infinity,y:8,radius:8},{x:8,y:NaN,radius:9}
 ]){
  assert.deepEqual(plain(damageTerrain(w,attack)),{destroyed:[],damaged:[],blasts:[]});
 }
 assert.equal(w.tiles[0],SOIL);assert.equal(w.revision,0);
});

test('deterministic output and terrain state across many repeated attacks',()=>{
 const width=37,height=21;
 const tiles=Array.from({length:width*height},(_,i)=>[EMPTY,SOIL,WOOD,STONE,STEEL,VOLATILE][(i*37+Math.floor(i/width)*7)%6]);
 const a=world(width,height,tiles),b=world(width,height,tiles);
 for(let i=0;i<150;i++){
  const attack={x:(i*53)%(width*16+70)-35,y:(i*29)%(height*16+50)-25,
   radius:[0,9,40,100,1e8][i%5],damage:1+i%4};
  const ar=damageTerrain(a,attack),br=damageTerrain(b,attack);
  assert.deepEqual(plain(ar),plain(br));
  assert.deepEqual([...a.tiles],[...b.tiles]);
  assert.deepEqual([...a.hp],[...b.hp]);
  assert.equal(a.revision,b.revision);
  assert.ok(ar.blasts.length<=64);
 }
});

test('non-default tile size and partial secondary damage remain consistent',()=>{
 const w=world(5,1,[VOLATILE,STONE,STEEL,STONE,EMPTY],8);
 const r=damageTerrain(w,{x:4,y:4,radius:0});
 assert.deepEqual(plain(r.blasts),[{x:4,y:4,radius:0},{x:4,y:4,radius:40}]);
 assert.deepEqual(plain(r.destroyed),[{col:0,row:0,type:VOLATILE}]);
 assert.deepEqual(plain(r.damaged),[
  {col:1,row:0,type:STONE,hp:1},{col:3,row:0,type:STONE,hp:1}
 ]);
 assert.equal(w.hp[2],255);assert.equal(w.revision,1);
});

test('radius tangencies affect adjoining cells but not diagonal outside circle',()=>{
 const w=world(3,3,new Array(9).fill(SOIL));
 const r=damageTerrain(w,{x:24,y:24,radius:8});
 assert.equal(r.destroyed.length,5);
 assert.equal(w.tiles[0],SOIL);assert.equal(w.tiles[8],SOIL);
});

test('nonzero-radius attack can enter world from negative coordinates',()=>{
 const w=world(2,1,[SOIL,WOOD]);
 const miss=damageTerrain(w,{x:-30,y:8,radius:10});
 assert.equal(miss.destroyed.length,0);assert.equal(w.revision,0);
 const hit=damageTerrain(w,{x:-30,y:8,radius:31});
 assert.deepEqual(plain(hit.destroyed),[{col:0,row:0,type:SOIL}]);
 assert.equal(tileAt(w,1,0),WOOD);
});

test('multi-tile primary blast increments revision once',()=>{
 const w=world(3,1,[STONE,STONE,STONE]);
 const hit=damageTerrain(w,{x:24,y:8,radius:30,damage:2});
 assert.equal(w.revision,1);
 assert.deepEqual(plain(hit.damaged.map(d=>d.hp)),[1,1,1]);
 assert.equal(hit.destroyed.length,0);
});

console.log('Broforce terrain: '+passed+' tests passed (including extended edge cases)');
