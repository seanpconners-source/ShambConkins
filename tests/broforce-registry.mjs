import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import vm from 'node:vm';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=path=>readFileSync(resolve(ROOT,path),'utf8');
function load(path,required){
 const exports={};
 vm.runInNewContext(source(path),{exports,require:required},{filename:path});
 return exports;
}
const titles={
 'broforce-jungle':'Broforce: Jungle',
 'broforce-factory':'Broforce: Factory',
 'broforce-city':'Broforce: City Siege',
 'broforce-desert':'Broforce: Desert Assault'
};
let loadCount=0;
const pack=load('src/packs/broforcePack.js',path=>{
 assert.equal(path,'src/engines/broforce.js');
 loadCount++;
 return {broforce:s=>({session:s,stage:s.game.stageId})};
});
assert.equal(loadCount,0,'engine must not be eagerly required');
assert.deepEqual(Object.keys(pack.engines),['broforce']);
assert.equal(pack.events.length,0);
assert.equal(pack.games.length,4);
for(const g of pack.games){
 assert.equal(g.title,titles[g.id]);
 assert.equal(g.stageId,g.id);
 assert.equal(g.engine,'broforce');
 assert.equal(g.source,'Broforce');
 assert.equal(g.category,'coop');
 assert.equal(g.cooperative,true);
 assert.equal(g.randomEligible,undefined,'must inherit registry’s random-eligible default');
 assert.equal(g.warpOnly,undefined);
 assert.match(g.duration,/90.*180/);
 assert.ok(g.rules.length>40);
 assert.equal(g.reward,0);
}
const ids=pack.games.map(g=>g.id);
assert.equal(new Set(ids).size,4);
const input={game:pack.games[2]};
assert.deepEqual(pack.engines.broforce(input),{session:input,stage:'broforce-city'});
assert.equal(loadCount,1);
const index=load('src/packs/index.js',path=>path==='src/packs/broforcePack.js'?pack:unrelatedWithUniqueNames(path));
function unrelatedWithUniqueNames(path){
 const key=path.split('/').at(-1).replace('.js','');
 return {engines:{[key]:()=>{}},games:[{id:key+'-game'}],events:[]};
}
assert.equal(index.packs.length,7);
assert.equal(index.games.filter(g=>ids.includes(g.id)).length,4);
assert.equal(index.engines.broforce,pack.engines.broforce);
assert.equal(new Set(index.games.map(g=>g.id)).size,index.games.length);
const randomPool=index.games.map(g=>({family:g.engine,quality:'substantial',randomEligible:true,...g}))
 .filter(g=>g.randomEligible&&g.quality==='substantial');
assert.equal(randomPool.filter(g=>ids.includes(g.id)).length,4,'all four must be in board pool');
assert.equal(index.games.filter(g=>ids.includes(g.id)).length,4,'all four must be in arcade catalog');
const duplicateGame=load.bind(null,'src/packs/index.js',path=>path.endsWith('broforcePack.js')?pack:{engines:{},games:[{id:'broforce-jungle'}]});
assert.throws(duplicateGame,/Duplicate pack game ID/);
const duplicateEngine=load.bind(null,'src/packs/index.js',path=>path.endsWith('broforcePack.js')?pack:{engines:{broforce:()=>{}},games:[]});
assert.throws(duplicateEngine,/Duplicate pack engine/);
const modules=JSON.parse(source('src/modules.json'));
const required=['src/packs/broforcePack.js','src/engines/broforce.js'];
for(const item of required)assert.equal(modules.order.filter(m=>m===item).length,1,'exactly one '+item);
const registered=modules.order.filter(m=>m.startsWith('src/engines/broforce/'));
assert.equal(new Set(registered).size,registered.length);
assert.ok(registered.includes('src/engines/broforce/terrain.js'));
assert.ok(registered.includes('src/engines/broforce/rewardPolicy.js'));
console.log('BF-35 isolated registry/manifest contract PASS (host mocked; no integrated runtime/reward assertion)');
