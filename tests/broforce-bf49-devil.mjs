// BF-49: hostile input and four stage-settings for the real BF-20 boss module.
// This is a subsystem test, not an integrated mission, extraction or rewards test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const path='src/engines/broforce/devil.js';
const source=fs.readFileSync(path,'utf8');
const exports={};
vm.runInThisContext('(function(exports){'+source+'\n})',{filename:path})(exports);
const {createBroforceDevil,advanceBroforceDevil}=exports;
const stages=[
 {id:'jungle',x:160,y:72,seed:11},
 {id:'factory',x:530,y:136,seed:12},
 {id:'city-siege',x:860,y:110,seed:13},
 {id:'desert-assault',x:1330,y:90,seed:14}
];
function people(c){return [
 {id:'Sean',owner:'Sean',x:c.x-110,y:c.y+25,w:12,h:26,alive:true,hp:1,character:'sean'},
 {id:'Amber',owner:'Amber',x:c.x-28,y:c.y+25,w:12,h:26,alive:true,hp:1,character:'amber'}
];}
const create=c=>createBroforceDevil({characterId:'locked-catalog-'+c.id,x:c.x,y:c.y,seed:c.seed});
const step=(boss,players,options={})=>advanceBroforceDevil(boss,{dt:1/60,players,...options});
function run(boss,players,n,options={}){
 const events=[];
 for(let i=0;i<n;i++){const out=step(boss,players,options);boss=out.devil;events.push(...out.events);}
 return {boss,events};
}
const eventsOf=(events,type)=>events.filter(e=>e.type===type);
function scenario(c){
 const p=people(c),original=JSON.stringify(p);
 let d=create(c),events=[];
 const advance=options=>{const out=step(d,p,options);d=out.devil;events.push(...out.events);return out;};
 const ticks=n=>{for(let i=0;i<n;i++)advance();};
 const paused=step(d,p,{active:false,dt:100,damageEvents:[{id:'lethal',damage:999}]});
 assert.strictEqual(paused.devil,d,'paused clock must not run');
 assert.deepEqual(paused.events,[]);
 ticks(75);
 assert.equal(d.mode,'windup','tell must precede attack');
 assert.equal(d.targetId,'Amber','nearest living P2 selected');
 assert(d.telegraph.remaining>0);
 assert.equal(eventsOf(events,'devil-shot').length,0,'never fire during initial tell');
 const hp=d.hp;
 advance({damageEvents:[
  {targetId:'devil',damage:6}, // no physical impact ID
  {id:'cage',targetId:'prison-cage',damage:6},
  {id:'stray',targetId:'enemy:1',damage:6},
  {id:'boss-owned',owner:'devil',targetId:'devil',damage:6},
  {id:'enemy-owned',owner:'enemy:1',targetId:'devil',damage:6},
  {projectileId:'devil:shot:1',targetId:'devil',damage:6},
  {projectileId:'enemy:shot:1',targetId:'devil',damage:6}
 ]});
 assert.equal(d.hp,hp,c.id+': damage only from real boss-routed hits');
 advance({damageEvents:[
  {id:'event-a',projectileId:'player-bullet-1',targetId:'devil',damage:3},
  {id:'event-b',projectileId:'player-bullet-1',targetId:d.characterId,damage:3},
  {id:'other',projectileId:'player-bullet-2',targetId:'cage',damage:6}
 ]});
 assert.equal(d.hp,hp-3,c.id+': same projectile with different event labels is one hit');
 ticks(16);
 advance({damageEvents:[{id:'event-c',projectileId:'player-bullet-1',targetId:'devil',damage:6}]});
 assert.equal(d.hp,hp-3,'replayed projectile is inert after iframes');
 for(let n=0;n<6;n++){ticks(16);advance({damageEvents:[{id:'fresh-'+n,targetId:'devil',damage:6}]});}
 assert.equal(d.hp,0,c.id+': actual shots eventually defeat boss');
 assert.equal(d.mode,'dying');
 assert.deepEqual(eventsOf(events,'devil-phase').map(e=>e.phase),[2,3]);
 assert.equal(eventsOf(events,'devil-defeated').length,1);
 assert.equal(eventsOf(events,'devil-defeated')[0].characterId,'locked-catalog-'+c.id);
 assert.equal(d.projectiles.length,0,'all bullets cleared at defeat');
 const dyingStart=events.length;
 ticks(90);
 assert.equal(d.mode,'dead');
 assert.equal(eventsOf(events,'devil-death-complete').length,1);
 assert.equal(eventsOf(events.slice(dyingStart),'devil-shot').length,0);
 assert(events.every(e=>e.characterId==='locked-catalog-'+c.id),'never substitute devil');
 assert(events.every(e=>!['helicopter','reward','recruit','devil-unlock'].includes(e.type)),
  'boss death is not a helicopter or reward');
 assert.equal(JSON.stringify(p),original,'no player HP/board selection mutation');
 const end=step(d,p,{damageEvents:[{id:'postmortem',damage:99}]});
 assert.strictEqual(end.devil,d);
 assert.deepEqual(end.events,[]);
 return {d,events};
}
for(const stage of stages)assert.deepEqual(scenario(stage),scenario(stage),
 stage.id+': same seed and impacts replay identically');
for(const stage of stages){
 const p=people(stage),d=create(stage);
 assert.equal(run(d,[{...p[0],downed:true},p[1]],120).boss.targetId,'Amber');
 assert.equal(run(d,[p[0],{...p[1],hp:0}],120).boss.targetId,'Sean');
 const gone=p.map(x=>({...x,alive:false,hp:0})),none=run(d,gone,180);
 assert.strictEqual(none.boss,d,'team wipe cannot advance unwarned attacks');
 assert.deepEqual(none.events,[]);
}
// Swept collision matters when a projectile crosses a one-pixel body in one tick.
{
 const base=create(stages[0]);
 const d={...base,mode:'recover',modeTimer:20,
  projectiles:[{id:'devil:shot:narrow',x:0,y:0,vx:240,vy:0,r:.1,ttl:1}]};
 const p=[{id:'Sean',owner:'Sean',x:2,y:-.5,w:1,h:1,alive:true,hp:1}];
 const hit=step(d,p);
 assert.equal(eventsOf(hit.events,'devil-hit-player').length,1);
 assert.equal(eventsOf(hit.events,'devil-hit-player')[0].sourceId,'devil:shot:narrow');
 assert.equal(hit.devil.projectiles.length,0,'one projectile one player contact');
 assert.equal(p[0].hp,1,'mission, not boss, owns actual downing');
 const cover=step(d,p,{isSolid:(col,row)=>col===0&&row===0});
 assert.equal(eventsOf(cover.events,'devil-hit-player').length,0);
 assert.equal(eventsOf(cover.events,'devil-cover-damage').length,1);
}
// Phase two must cycle the advertised fan, quake and dive after their tells.
{
 const c=stages[1],p=people(c);
 let d=run(create(c),p,85).boss;
 d=step(d,p,{damageEvents:[{id:'phase-a',targetId:'devil',damage:6}]}).devil;
 d=run(d,p,16).boss;
 d=step(d,p,{damageEvents:[{id:'phase-b',targetId:'devil',damage:6}]}).devil;
 assert.equal(d.phase,2);
 const played=run(d,p,2000),attacks=eventsOf(played.events,'devil-telegraph').map(e=>e.attack);
 assert.deepEqual([...new Set(attacks)].sort(),['dive','fan','quake']);
 assert(eventsOf(played.events,'devil-shot').length>0);
 assert(eventsOf(played.events,'devil-impact').length>0);
 assert(eventsOf(played.events,'devil-cover-damage').length>0);
 assert(played.boss.projectiles.length<=20);
}
console.log('BROFORCE BF-49 DEVIL OK: four stages, provenance, phases, telegraph, pause, sweep, terminal/replay');
