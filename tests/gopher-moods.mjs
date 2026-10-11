// Focused Gopher Hunt portrait/regression checks. Run: node tests/gopher-moods.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/engines/newGames.js',import.meta.url),'utf8');
const section=source.slice(source.indexOf('// ===================================================================== Gopher Hunt'),source.indexOf('// ===================================================================== Archery'));
assert.ok(section.includes('async function gophers(s)'), 'Gopher Hunt section located');

const seed=randomSeed=>{let n=0;for(const char of randomSeed)n=(Math.imul(n,31)+char.charCodeAt(0))>>>0;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);};
async function setup(art){
 let config,drawn=[];
 const context={
  require:id=>{if(id==='src/assets.js')return {portraitMoods:id=>art[id]?.moods||[],portraitURL:(id,mood)=>art[id]?.urls[mood]||null};throw new Error('Unexpected require '+id);},
  seededRandom:seed,arcadeRounds:(_s,c)=>{config=c;},MOUNDS:undefined,
  document:{createElement:()=>({className:''})},Math,console
 };
 const factory=vm.runInNewContext(section+'\n gophers;',context);
 const session={seed:'fixed',players:[{name:'A',character:'alpha'},{name:'B',character:'beta'}],
  canvas:()=>[{},{}],body:{classList:{add(){}},insertBefore(){}},on(){},hint(){},paused:false};
 await factory(session);
 return {config,session,drawn};
}
const art={
 alpha:{moods:['win','sad','walk'],urls:{normal:'alpha-N',win:'alpha-W',sad:'alpha-S',walk:'alpha-N'}},
 beta:{moods:['win','sad'],urls:{normal:'beta-N',win:'beta-W',sad:'beta-S'}},
};
const {config}=await setup(art);
assert.equal(typeof config.step,'function');
function pattern(player){
 const a={...config.reset(player),player,time:40,score:0};
 const spawns=[],seenMoods=[];
 for(let t=0;t<150;t++){
  config.step(a,.35);a.time=Math.max(0,a.time-.35);
  for(const m of a.mounds){if(!m.kind||m.recorded)continue;m.recorded=true;spawns.push(m.kind);if(m.kind==='gopher'||m.kind==='gold'){seenMoods.push(m.mood);const own=art[player===0?'beta':'alpha'];assert.ok(own.urls[m.mood]);}}
 }
 return {spawns,seenMoods};
}
const first=pattern(0),second=pattern(1);
assert.deepEqual(first.spawns,second.spawns,'cosmetic RNG does not change matched gameplay spawns');
assert.ok(first.seenMoods.length>4,'enough popups appeared');
assert.ok(new Set(first.seenMoods).size>1,'portraits vary');
for(let i=1;i<first.seenMoods.length;i++)assert.notEqual(first.seenMoods[i],first.seenMoods[i-1],'no adjacent duplicate portrait');
for(let i=1;i<second.seenMoods.length;i++)assert.notEqual(art.alpha.urls[second.seenMoods[i]],art.alpha.urls[second.seenMoods[i-1]],'no adjacent duplicate image, including alias');
const single=await setup({
 alpha:{moods:[],urls:{normal:'alpha-N'}},
 beta:{moods:[],urls:{normal:'beta-N'}}
});
const g=single.config.reset(0);assert.equal(g.moods.join(','),'normal','single-portrait fallback');
assert.equal(g.lastMood,null);
console.log('Gopher portrait mood and matched spawn checks passed');
