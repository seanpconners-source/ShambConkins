import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {test} from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function load(relative, requireFn = () => { throw Error('Unexpected require'); }) {
  const exports = {};
  vm.runInNewContext(readFileSync(path.join(root, relative),'utf8'),
    {exports,require:requireFn,Uint8Array,Int16Array,Math,Object,Set}, {filename:relative,timeout:2000});
  return exports;
}
const terrain = load('src/engines/broforce/terrain.js');
const {generateBroforceStage: generate} = load('src/engines/broforce/stage.js', name => {
  assert.equal(name,'src/engines/broforce/terrain.js');
  return terrain;
});
const {TILE} = terrain;
const W = 12, H = 26;
function at(stage,col,row) {
  return col < 0 || row < 0 || col >= stage.width || row >= stage.height ? TILE.STEEL : stage.tiles[row * stage.width + col];
}
function clear(stage,x,y) {
  const s = stage.tileSize;
  if(x < s || y < 0 || x + W > (stage.width - 1) * s || y + H > (stage.height - 1) * s)return false;
  for(let r=Math.floor(y/s);r<=Math.floor((y+H-.001)/s);r++)
    for(let c=Math.floor(x/s);c<=Math.floor((x+W-.001)/s);c++)
      if(at(stage,c,r)!==TILE.EMPTY)return false;
  return true;
}
function grounded(stage,x,y) {
  if(!clear(stage,x,y))return false;
  const s=stage.tileSize;
  const r=Math.floor((y+H+.001)/s);
  if(Math.abs(r*s-(y+H))>.002)return false;
  for(let c=Math.floor(x/s);c<=Math.floor((x+W-.001)/s);c++)
    if(at(stage,c,r)===TILE.EMPTY)return false;
  return true;
}
function stances(stage) {
  const poses=[];
  for(let x=1;x<stage.width-1;x++){
    const xpx=x*stage.tileSize+(stage.tileSize-W)/2;
    for(let row=2;row<stage.height-1;row++){
      const y=row*stage.tileSize-H;
      if(grounded(stage,xpx,y))poses.push({col:x,row,x:xpx,y});
    }
  }
  return poses;
}
// A deliberately conservative BF-13 ballistic model: 260px/s jump, 720px/s2
// gravity, <= 125px/s horizontal, 12x26 hitbox, sampled at 120Hz.
// Check only non-destructive forward routes, including ceilings/cover geometry.
function canMove(stage,a,b) {
  const s=stage.tileSize,dx=b.x-a.x,dy=b.y-a.y;
  if(dx<=0||dx>Math.max(5*s,90))return false;
  // Walking on level solid floor is always preferable to jumping.
  if(Math.abs(dy)<.001){
    let walk=true;
    for(let i=1;i<=Math.ceil(dx/3);i++)
      if(!clear(stage,a.x+dx*i/Math.ceil(dx/3),a.y)){walk=false;break;}
    if(walk)return true;
  }
  // Walk off a shallow ledge and drop; do not require an unnecessary jump
  // into a low ceiling just because the destination floor is one tile lower.
  if(dy>0 && dy<=s && dx<=s*1.01){
    let safe=true;
    for(let i=1;i<=12;i++){
      const t=i/12;
      if(!clear(stage,a.x+dx*t,a.y)||!clear(stage,b.x,a.y+dy*t)){
        safe=false;break;
      }
    }
    if(safe)return true;
  }
  const disc=260*260+2*720*dy;
  if(disc<=0)return false;
  const flight=(260+Math.sqrt(disc))/720;
  if(dx>125*flight-1)return false;
  // Delay lateral movement until the actor is above short cover; this is a
  // conservative human jump rather than a teleported vertical clearance.
  const lag=Math.min(.10,flight*.15);
  const steps=Math.ceil(flight*120);
  for(let i=1;i<steps;i++){
    const t=i*flight/steps;
    const p=Math.max(0,Math.min(1,(t-lag)/(flight-lag)));
    const px=a.x+dx*p;
    const py=a.y-260*t+360*t*t;
    if(!clear(stage,px,py))return false;
  }
  return true;
}
function route(stage) {
  const poses=stances(stage),byCol=new Map();
  poses.forEach((p,i)=>{if(!byCol.has(p.col))byCol.set(p.col,[]);byCol.get(p.col).push(i);});
  const start=poses.findIndex(p=>Math.abs(p.x-stage.spawns[0].x)<.001 && Math.abs(p.y-stage.spawns[0].y)<.001);
  assert.ok(start>=0,'start is a standable node');
  const queue=[start], visited=new Set(queue);
  for(let head=0;head<queue.length;head++){
    const p=poses[queue[head]];
    for(let col=p.col+1;col<=Math.min(stage.width-2,p.col+5);col++){
      for(const j of byCol.get(col)||[]){
        if(visited.has(j))continue;
        if(canMove(stage,p,poses[j])){visited.add(j);queue.push(j);}
      }
    }
  }
  let furthest=0;
  const reached=new Set();
  for(const i of visited){reached.add(poses[i].col);furthest=Math.max(furthest,poses[i].col);}
  return {furthest,reached,visited:visited.size,total:poses.length};
}
function validate(stage) {
  assert.ok(stage.tiles instanceof Uint8Array);
  assert.equal(stage.tiles.length,stage.width*stage.height);
  for(const id of stage.tiles)assert.ok(Number.isInteger(id)&&id>=0&&id<=5);
  assert.deepEqual(Object.values(TILE).join(','),'0,1,2,3,4,5');
  assert.equal(terrain.createTerrain(stage).tiles.length,stage.tiles.length);
  const entries=[...stage.spawns,...stage.prisoners,...stage.enemySpawns,stage.devilSpawn,stage.extraction,...stage.checkpoints];
  for(const actor of entries){
    assert.ok(Number.isFinite(actor.x)&&Number.isFinite(actor.y));
    assert.ok(grounded(stage,actor.x,actor.y),`actor embedded/floating ${JSON.stringify(actor)} seed ${stage.seed}`);
  }
  assert.equal(stage.spawns.length,2);
  assert.equal(stage.prisoners.length,4);
  assert.equal(stage.enemySpawns.length,9);
  assert.ok(stage.spawns[0].x<stage.spawns[1].x);
  assert.ok(stage.spawns[1].x<stage.devilSpawn.x && stage.devilSpawn.x<stage.extraction.x);
  assert.ok(stage.enemySpawns.every(a=>a.x>=12*stage.tileSize),'safe start is enemy-free');
  assert.equal(new Set(stage.prisoners.map(p=>p.id)).size,4);
  assert.deepEqual(stage.prisoners.map(p=>p.id).join(','),'bf-prisoner-01,bf-prisoner-02,bf-prisoner-03,bf-prisoner-04');
  assert.equal(new Set(stage.enemySpawns.map(p=>p.id)).size,9);
  assert.ok(stage.tiles.includes(TILE.WOOD));
  assert.ok(stage.tiles.includes(TILE.STONE));
  assert.ok(stage.tiles.includes(TILE.STEEL));
  assert.ok(stage.tiles.includes(TILE.VOLATILE));
  const r=route(stage);
  const col=Math.floor(stage.extraction.x/stage.tileSize);
  assert.ok(r.reached.has(col),`extraction unreachable seed ${stage.seed} ${stage.width}x${stage.height}@${stage.tileSize}: reached col ${r.furthest} want ${col}`);
  for(const p of stage.prisoners)assert.ok(r.reached.has(Math.floor(p.x/stage.tileSize)),`prisoner unreachable seed ${stage.seed}: ${p.id}`);
  return r;
}

test('defaults, compatibility, exact deterministic replay and seed variation',()=>{
  const a=generate({seed:'jungle-a'}),b=generate({seed:'jungle-a'}),c=generate({seed:'jungle-b'});
  assert.deepEqual([a.width,a.height,a.tileSize],[180,24,16]);
  assert.deepEqual(Array.from(a.tiles),Array.from(b.tiles));
  assert.equal(JSON.stringify(a.spawns),JSON.stringify(b.spawns));
  assert.equal(JSON.stringify(a.prisoners),JSON.stringify(b.prisoners));
  assert.equal(JSON.stringify(a.enemySpawns),JSON.stringify(b.enemySpawns));
  assert.equal(JSON.stringify(a.devilSpawn),JSON.stringify(b.devilSpawn));
  assert.notDeepEqual(Array.from(a.tiles),Array.from(c.tiles));
  const frozen=Array.from(a.tiles);
  terrain.createTerrain(a).tiles.fill(0);
  assert.deepEqual(Array.from(a.tiles),frozen,'terrain must copy generated tile snapshots');
  validate(a);
});

test('96 numeric seeds all admit an unbroken traversable route',()=>{
  const signatures=new Set();
  for(let seed=0;seed<96;seed++){
    const g=generate({seed});validate(g);
    signatures.add(g.tiles.reduce((h,v)=>(Math.imul(h^v,16777619)>>>0),2166136261));
  }
  assert.ok(signatures.size>=90,'the stages actually vary');
});

test('mobile and desktop view widths, boundary sizes and varied tile sizes',()=>{
  for(const [width,height,tileSize] of [[96,16,12],[96,24,16],[120,20,24],[180,24,16],[180,32,32],[256,48,16],[384,48,32]]){
    for(const seed of [...Array(48).keys(),42,4096]){
      const g=generate({width,height,tileSize,seed});validate(g);
      assert.ok(width*tileSize>=390,'stage supports a folded-screen camera viewport');
      assert.ok(width*tileSize>=1100,'stage has meaningful desktop horizontal scroll');
    }
  }
});

test('strict allocation, seed and argument validation',()=>{
  const bad=[{width:0},{width:95},{width:385},{width:Infinity},{width:180.5},{height:15},
    {height:49},{tileSize:11},{tileSize:33},{tileSize:16.5},{seed:NaN},{seed:Infinity},
    {seed:1.5},{seed:{}},{seed:'x'.repeat(257)}];
  for(const args of bad) assert.throws(()=>generate(args),`accepted ${JSON.stringify(args)}`);
  assert.equal(generate({seed:-1}).seed,4294967295);
  assert.equal(generate({seed:0}).seed,0);
  assert.notEqual(generate({seed:'1'}).seed,generate({seed:1}).seed);
});
