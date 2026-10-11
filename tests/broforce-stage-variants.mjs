import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file);
  const out={};cache.set(file,out);
  vm.runInNewContext(readFileSync(path.join(ROOT,file),'utf8'),
    {exports:out,require:load,Uint8Array,Int16Array,Math,Object,Set},
    {filename:file,timeout:3000});
  return out;
}
const {generateBroforceVariant:generate,BROFORCE_STAGE_IDS:ids}=load('src/engines/broforce/stageVariants.js');
const {generateBroforceStage}=load('src/engines/broforce/stage.js');
const {TILE,createTerrain}=load('src/engines/broforce/terrain.js');
const W=12,H=26;
function at(s,c,r){return c<0||r<0||c>=s.width||r>=s.height?TILE.STEEL:s.tiles[r*s.width+c];}
function clear(s,x,y){
  if(x<s.tileSize||y<0||x+W>(s.width-1)*s.tileSize||y+H>(s.height-1)*s.tileSize)return false;
  for(let r=Math.floor(y/s.tileSize);r<=Math.floor((y+H-.001)/s.tileSize);r++)
    for(let c=Math.floor(x/s.tileSize);c<=Math.floor((x+W-.001)/s.tileSize);c++)
      if(at(s,c,r)!==TILE.EMPTY)return false;
  return true;
}
function grounded(s,x,y){
  if(!clear(s,x,y))return false;
  const row=Math.round((y+H)/s.tileSize);
  if(Math.abs(row*s.tileSize-(y+H))>.001)return false;
  for(let c=Math.floor(x/s.tileSize);c<=Math.floor((x+W-.001)/s.tileSize);c++)
    if(at(s,c,row)===TILE.EMPTY)return false;
  return true;
}
// Same BF-13 ballistic limits as the existing BF-10 navigation contract:
// 260 px/s jump, 720 px/s² gravity, <=125 px/s horizontal, 12x26 collision.
function canMove(s,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,tile=s.tileSize;
  if(dx<=0||dx>Math.max(5*tile,90))return false;
  if(Math.abs(dy)<.001){
    let walk=true;
    for(let i=1,n=Math.ceil(dx/3);i<=n;i++)
      if(!clear(s,a.x+dx*i/n,a.y)){walk=false;break;}
    if(walk)return true;
  }
  if(dy>0&&dy<=tile&&dx<=tile*1.01){
    let safe=true;
    for(let i=1;i<=12;i++){
      const t=i/12;
      if(!clear(s,a.x+dx*t,a.y)||!clear(s,b.x,a.y+dy*t)){safe=false;break;}
    }
    if(safe)return true;
  }
  const discriminant=260*260+2*720*dy;
  if(discriminant<=0)return false;
  const flight=(260+Math.sqrt(discriminant))/720;
  if(dx>125*flight-1)return false;
  const lag=Math.min(.10,flight*.15),steps=Math.ceil(flight*120);
  for(let i=1;i<steps;i++){
    const t=i*flight/steps;
    const p=Math.max(0,Math.min(1,(t-lag)/(flight-lag)));
    if(!clear(s,a.x+dx*p,a.y-260*t+360*t*t))return false;
  }
  return true;
}
function reachable(s){
  const poses=[],byCol=new Map();
  for(let col=1;col<s.width-1;col++){
    const x=col*s.tileSize+(s.tileSize-W)/2;
    for(let row=2;row<s.height-1;row++){
      const y=row*s.tileSize-H;
      if(grounded(s,x,y)){
        const n=poses.length;poses.push({col,x,y});
        if(!byCol.has(col))byCol.set(col,[]);
        byCol.get(col).push(n);
      }
    }
  }
  const origin=poses.findIndex(p=>p.x===s.spawns[0].x&&p.y===s.spawns[0].y);
  assert.ok(origin>=0,'first spawn must be walkable');
  const queue=[origin],visited=new Set(queue);
  for(let head=0;head<queue.length;head++){
    const p=poses[queue[head]];
    for(let col=p.col+1;col<=Math.min(s.width-2,p.col+5);col++){
      for(const i of byCol.get(col)||[]){
        if(!visited.has(i)&&canMove(s,p,poses[i])){visited.add(i);queue.push(i);}
      }
    }
  }
  return new Set([...visited].map(i=>poses[i].col));
}
function signature(s){let h=2166136261;for(const v of s.tiles)h=Math.imul(h^v,16777619)>>>0;return h;}
function validate(s){
  assert.equal(s.tileSize,16);
  assert.equal(s.width,180);assert.equal(s.height,24);
  assert.ok(s.tiles instanceof Uint8Array);
  assert.equal(s.tiles.length,s.width*s.height);
  for(let c=0;c<s.width;c++)for(let r=0;r<s.height;r++){
    assert.ok(at(s,c,r)>=0&&at(s,c,r)<=5);
    if(c===0||c===s.width-1||r===s.height-1)assert.equal(at(s,c,r),TILE.STEEL);
  }
  assert.equal(createTerrain(s).tiles.length,s.tiles.length);
  assert.equal(s.spawns.length,2);
  assert.equal(s.prisoners.length,4);
  assert.equal(s.enemySpawns.length,9);
  assert.equal(s.checkpoints.length,2);
  assert.equal(s.extraction.id,'bf-extraction');
  assert.equal(s.prisoners.map(p=>p.id).join(','),'bf-prisoner-01,bf-prisoner-02,bf-prisoner-03,bf-prisoner-04');
  assert.equal(new Set(s.enemySpawns.map(p=>p.id)).size,9);
  assert.ok(s.enemySpawns.every(p=>p.x>=12*16));
  const actors=[...s.spawns,...s.prisoners,...s.enemySpawns,s.devilSpawn,s.extraction,...s.checkpoints];
  for(const p of actors)assert.ok(grounded(s,p.x,p.y),
    'embedded actor '+s.stageId+' '+s.seed+' '+JSON.stringify(p));
  const route=reachable(s);
  for(const p of [...s.prisoners,s.devilSpawn,s.extraction,...s.checkpoints])
    assert.ok(route.has(Math.floor(p.x/16)),
      'unreachable '+s.stageId+' seed='+s.seed+' at '+p.x+', furthest='+Math.max(...route));
  return route;
}
test('IDs, title contract, immutable catalog and unknown-stage rejection',()=>{
  assert.equal(Object.isFrozen(ids),true);
  assert.equal([...ids].join(','),'broforce-jungle,broforce-factory,broforce-city,broforce-desert');
  assert.deepEqual(ids.map(id=>generate({stageId:id,seed:10}).title).join('|'),
    'Broforce: Jungle|Broforce: Factory|Broforce: City Siege|Broforce: Desert Assault');
  for(const bad of [undefined,null,'', 'broforce-warp', '__proto__', 'constructor'])
    assert.throws(()=>generate({stageId:bad}),{name:'RangeError'});
});
test('all variants preserve BF-10 baseline actor anchors, BF-12 tile semantics and independent arrays',()=>{
  const baseline=generateBroforceStage({seed:'baseline'});
  for(const stageId of ids){
    const a=generate({stageId,seed:'baseline'}),b=generate({stageId,seed:'baseline'});
    assert.equal(JSON.stringify(a.spawns),JSON.stringify(baseline.spawns));
    assert.equal(JSON.stringify(a.prisoners),JSON.stringify(baseline.prisoners));
    assert.equal(JSON.stringify(a.enemySpawns),JSON.stringify(baseline.enemySpawns));
    assert.equal(JSON.stringify(a.devilSpawn),JSON.stringify(baseline.devilSpawn));
    assert.deepEqual([a.extraction.x,a.extraction.y],[baseline.extraction.x,baseline.extraction.y]);
    assert.equal(JSON.stringify(a.checkpoints),JSON.stringify(baseline.checkpoints));
    assert.equal(signature(a),signature(b));
    assert.equal(JSON.stringify(a.environment),JSON.stringify(b.environment));
    assert.ok(a.environment.structures.length>=2,stageId+' has distinct geometry');
    assert.notEqual(a.tiles,b.tiles);
    assert.notEqual(a.environment,b.environment);
    assert.notEqual(a.environment.structures,b.environment.structures);
    assert.notEqual(a.spawns,b.spawns);
    const snap=Uint8Array.from(b.tiles);
    a.tiles.fill(0);a.environment.structures[0].kind='edited';a.spawns[0].x=-9;
    assert.deepEqual([...b.tiles],[...snap]);
    validate(b);
  }
});
test('four geometries are different, and seeds vary without runtime Math.random',()=>{
  const original=Math.random;
  Math.random=()=>{throw Error('unseeded random');};
  try{
    const signatures=new Set();
    for(const id of ids){
      const perId=new Set();
      for(const seed of [0,1,2,19,101,'same'])perId.add(signature(generate({stageId:id,seed})));
      assert.ok(perId.size>=5,id+' barely varies');
      signatures.add(signature(generate({stageId:id,seed:42})));
    }
    assert.equal(signatures.size,4,'biomes must have distinct tile geometry');
  }finally{Math.random=original;}
});
test('BF-13 conservative ballistic reachability on 4 biomes x 20 seeds including boundary values',()=>{
  for(const stageId of ids)for(const seed of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,42,255,4294967295,'edge'])
    validate(generate({stageId,seed}));
});
