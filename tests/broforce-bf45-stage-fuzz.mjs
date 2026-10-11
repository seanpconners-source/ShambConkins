// BF-45: Four deterministic biomes, two-player navigation and real physics/destruction.
// Shared collision and conservative ballistic traversal rules mirror BF-10's regression test.
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
    {exports:out,require:load,Uint8Array,Int16Array,Math,Object,Set,Map},
    {filename:file,timeout:3000});
  return out;
}
const {generateBroforceVariant:generate,BROFORCE_STAGE_IDS:ids}=load('src/engines/broforce/stageVariants.js');
const {generateBroforceStage}=load('src/engines/broforce/stage.js');
const {TILE,createTerrain,tileAt,isSolidTile,damageTerrain}=load('src/engines/broforce/terrain.js');
const {createBody,advanceBody}=load('src/engines/broforce/physics.js');
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
function reachable(s,player=0){
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
  const origin=poses.findIndex(p=>p.x===s.spawns[player].x&&p.y===s.spawns[player].y);
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
  const cols=new Set([...visited].map(i=>poses[i].col));
  cols.reachablePoses=[...visited].map(i=>poses[i]);
  return cols;
}
function signature(s){let h=2166136261;for(const v of s.tiles)h=Math.imul(h^v,16777619)>>>0;return h;}

const SEEDS=[...Array.from({length:96},(_,i)=>i),4294967295,2147483647,-1,'adversarial-edge'];
const EXPECTED={
  'broforce-jungle':{theme:'jungle',biome:'rainforest',obstacle:'wood-outpost'},
  'broforce-factory':{theme:'factory',biome:'industrial',obstacle:'steel-catwalk'},
  'broforce-city':{theme:'city',biome:'urban',obstacle:'tenement-roof'},
  'broforce-desert':{theme:'desert',biome:'badlands',obstacle:'watchtower'}
};
function context(id,seed,phase,fn){
  try{return fn();}catch(e){e.message='BF-45 stage='+id+' seed='+JSON.stringify(seed)+' '+phase+': '+e.message;throw e;}
}
function assertActors(stage,route,origin){
  const required=[stage.spawns[origin],...stage.prisoners,
    ...stage.enemySpawns,stage.devilSpawn,stage.extraction,...stage.checkpoints];
  for(const actor of required){
    assert.ok(grounded(stage,actor.x,actor.y),'embedded '+JSON.stringify(actor));
    assert.ok(route.reachablePoses.some(p=>p.x===actor.x&&p.y===actor.y),
      'unreachable exact actor pose '+JSON.stringify(actor));
  }
  // Right-directed graph intentionally cannot return from P2 to the P1 spawn.
  if(origin===0)assert.ok(route.reachablePoses.some(p=>p.x===stage.spawns[1].x&&
    p.y===stage.spawns[1].y),'P1 cannot reach co-op P2 start');
}
function physicsSmoke(stage){
  const world=createTerrain(stage);
  const solid=(col,row)=>isSolidTile(world,col,row);
  for(const [i,p] of stage.spawns.entries()){
    let b=createBody(p);
    for(let step=0;step<15;step++)
      b=advanceBody(b,{move:0,jumpHeld:false},1/60,solid,{tileSize:16});
    assert.ok(b.onGround&&Math.abs(b.x-p.x)<.001&&Math.abs(b.y-p.y)<.005,
      'P'+(i+1)+' does not settle on BF-13 floor');
    let peak=b.y;
    for(let step=0;step<75;step++){
      b=advanceBody(b,{move:0,jumpHeld:true,jumpPressed:step===0},1/60,solid,{tileSize:16});
      peak=Math.min(peak,b.y);
      assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y),'invalid physics position');
    }
    assert.ok(peak<=p.y-32,'P'+(i+1)+' cannot clear short cover with BF-13 jump');
    assert.ok(b.onGround&&Math.abs(b.y-p.y)<.005,'P'+(i+1)+' did not land');
    for(let step=0;step<24;step++)
      b=advanceBody(b,{move:1,jumpHeld:false},1/60,solid,{tileSize:16});
    assert.ok(b.x>p.x+10,'P'+(i+1)+' blocked immediately leaving spawn');
    assert.ok(b.x+b.w<(stage.width-1)*16,'P'+(i+1)+' exceeded bounds');
  }
  // Destructive scenery changes only this combat copy, not generated level data.
  const index=stage.tiles.findIndex(v=>v===TILE.WOOD);
  assert.ok(index>=0,'no destructible scenery');
  const c=index%stage.width,r=Math.floor(index/stage.width);
  const hit=damageTerrain(world,{x:(c+.5)*16,y:(r+.5)*16,radius:0,damage:3});
  assert.ok(hit.destroyed.some(t=>t.col===c&&t.row===r),'BF-12 cannot destroy cover');
  assert.equal(tileAt(world,c,r),TILE.EMPTY);
  assert.equal(stage.tiles[index],TILE.WOOD,'damage mutated generated stage');
  assert.equal(tileAt(world,0,r),TILE.STEEL,'steel world boundary compromised');
}
test('BF-45 4x100 seeded layouts: exact P1/P2 paths, biome geometry, BF-13 and BF-12',()=>{
  assert.equal(ids.length,4);
  const signatures=new Map(ids.map(id=>[id,new Set()]));
  const slow={ms:0,stage:null,seed:null};
  const start=process.hrtime.bigint();
  for(const seed of SEEDS){
    const perSeed=new Set();
    for(const id of ids)context(id,seed,'route/physics/destruction',()=>{
      const started=process.hrtime.bigint(),s=generate({stageId:id,seed});
      const twin=generate({stageId:id,seed}),base=generateBroforceStage({seed});
      const exp=EXPECTED[id];
      assert.equal(s.stageId,id);assert.equal(s.theme,exp.theme);
      assert.equal(s.environment.biome,exp.biome);
      assert.ok(s.environment.weather&&s.environment.landmark);
      assert.equal(s.tileSize,16);assert.equal(s.width,180);assert.equal(s.height,24);
      assert.ok(s.tiles instanceof Uint8Array);
      assert.equal(s.tiles.length,s.width*s.height);
      assert.deepEqual(s.spawns,base.spawns,'variant moved player anchor');
      assert.deepEqual(s.prisoners,base.prisoners,'variant moved prisoner anchor');
      assert.deepEqual(s.enemySpawns,base.enemySpawns,'variant moved enemy anchor');
      assert.deepEqual(s.devilSpawn,base.devilSpawn,'variant moved boss arena');
      assert.deepEqual(s.checkpoints,base.checkpoints,'variant moved checkpoint');
      assert.equal(s.extraction.x,base.extraction.x);assert.equal(s.extraction.y,base.extraction.y);
      assert.equal(s.extraction.id,'bf-extraction');
      assert.equal(signature(s),signature(twin),'nondeterministic tiles');
      assert.equal(JSON.stringify(s.environment),JSON.stringify(twin.environment),'nondeterministic metadata');
      assert.notStrictEqual(s.tiles,twin.tiles,'shared mutable terrain');
      const sig=signature(s);perSeed.add(sig);signatures.get(id).add(sig);
      let changes=0;for(let i=0;i<s.tiles.length;i++)if(s.tiles[i]!==base.tiles[i])changes++;
      assert.ok(changes>=25,'lack of nontrivial biome changes: '+changes);
      assert.ok(s.environment.structures.some(x=>x.kind===exp.obstacle),'missing special obstacle');
      const detour=s.environment.structures.find(x=>x.id==='bf-'+exp.theme+'-detour');
      assert.ok(detour,'missing alternate detour');
      for(let col=0;col<s.width;col++)for(let row=0;row<s.height;row++){
        const tile=at(s,col,row);
        assert.ok(tile>=TILE.EMPTY&&tile<=TILE.VOLATILE,'unknown tile ID');
        if(col===0||col===s.width-1||row===s.height-1)assert.equal(tile,TILE.STEEL,'weak outer boundary');
      }
      const a=reachable(s,0),b=reachable(s,1);
      assertActors(s,a,0);assertActors(s,b,1);
      for(const r of [a,b])assert.ok(r.reachablePoses.some(p=>
        p.y+H===detour.y&&p.x>=detour.x&&p.x<detour.x+detour.width),
        'alternate route inaccessible for a player');
      physicsSmoke(s);
      const ms=Number(process.hrtime.bigint()-started)/1e6;
      if(ms>slow.ms)Object.assign(slow,{ms,stage:id,seed});
    });
    assert.equal(perSeed.size,4,'the four layouts match under seed '+JSON.stringify(seed));
  }
  for(const id of ids)assert.ok(signatures.get(id).size>=95,
    'insufficient seed variation: '+id+' '+signatures.get(id).size);
  assert.equal(ids.length*SEEDS.length,400);
  console.log('BF-45 PASS: 400 stages, 800 exact-pose routes, 800 player jump/walk probes, 400 terrain-damage checks. Slowest '+slow.stage+' seed='+JSON.stringify(slow.seed)+' '+slow.ms.toFixed(2)+'ms; total '+(Number(process.hrtime.bigint()-start)/1e6).toFixed(2)+'ms. Limits: 180x24 tiles, 16px; zero skipped seeds.');
});
