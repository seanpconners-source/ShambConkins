// A Pokémon encounter recruits the exact Bond shown, never a random unowned variant.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
function load(file, deps={}) {
 const exports={};
 const source=fs.readFileSync(file,'utf8');
 const factory=vm.runInThisContext('(function(require,exports){\n'+source+'\n})',{filename:file});
 factory(id=>{if(!Object.hasOwn(deps,id))throw new Error(file+' unexpectedly requires '+id);return deps[id];},exports);
 return exports;
}
const bonds=load('src/data/movieBonds.js');
const catalog=[{id:'sean',name:'Sean',source:'ShambConkins'},{id:'amber',name:'Amber',source:'ShambConkins'},...bonds.MOVIE_BOND_CHARACTERS];
const charMap=new Map(catalog.map(c=>[c.id,c]));
const chars={CHARACTERS:catalog,character:id=>charMap.get(id),characterIdentity:id=>id};
let saved=null;
const profile=load('src/profile.js',{
 'src/photoPairs.js':{normalizePhotoPair:()=>null,photoPairLibrary:()=>[],currentPhotoPair:()=>{},photoProfilePayload:p=>p},
 'src/contentPolicy.js':{ACTIVE_CATALOG:{characters:catalog,items:[]}},
 'src/persistence.js':{PROFILE_KEY:'test-profile',readJSON:()=>saved,writeJSON:(_key,p)=>{saved=JSON.parse(JSON.stringify(p));},
  // profile.js (Broforce durable saves) inspects the stored copy before writing.
  inspectDurableJSON:()=>saved?{status:'valid',value:JSON.parse(JSON.stringify(saved))}:{status:'missing'},
  writeDurableJSON:(_key,p)=>{saved=JSON.parse(JSON.stringify(p));return true;}},
 'src/characters.js':chars,'src/data/savoryLab.js':{LAB_TEAM:[]},'src/data/movieBonds.js':bonds,'src/solo.js':load('src/solo.js')
});
const store={profile:profile.freshProfile(),busy:false};
const makeMon=(id,lvl=6)=>({id,lvl,exp:0,hp:50,status:null,pp:{}});
// Use the real species and trainer-class calculation: trainerSpace() needs both.
const pkmnData=load('src/pkmn/pkmnData.js',{
 'src/characters.js':chars,'src/utils.js':{hash:()=>42},
 'src/data/pkmnItems.js':{PKMN_CATALOG_ITEMS:[]}
});
const D={makeMon,normalizeMon:mon=>mon,healMon:mon=>{mon.hp=50;},
 speciesFor:pkmnData.speciesFor,trainerClassFor:pkmnData.trainerClassFor,
 BAG_ITEMS:pkmnData.BAG_ITEMS};
let outcome='caught',encounterId=null,trainerSeen=null;
const B={
 battle:async ({foe})=>{encounterId=foe.team[0].id;trainerSeen=foe.character||null;return outcome==='caught'
  ?{outcome,caught:{...foe.team[0]},defeated:[]}
  :{outcome,defeated:foe.team.map(m=>m.id),caught:null};},
 isOpen:()=>false,closeGB:()=>{},say:async()=>{},gbMessages:async()=>{}
};
const PK=load('src/pkmn/pkmnRun.js',{
 'src/state.js':{store},'src/characters.js':chars,'src/profile.js':profile,
 'src/locations.js':{location:()=>null},
 'src/utils.js':{seededRandom:()=>()=>0,shuffle:xs=>xs.slice(),clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),hash:()=>42},
 'src/items.js':{pointChange:()=>({blocked:false,delta:-3})},
 'src/pkmn/pkmnData.js':D,'src/pkmn/pkmnBattle.js':B,'src/pkmn/pkmnAudio.js':{}
});
const dialogs=[];
PK.configurePkmn({unlockDialog:async(ids,owner)=>{dialogs.push({ids,owner});},saveRun:()=>{},updateBoard:()=>{}});
const run={seed:'bond-test',turn:3,board:{nodes:{here:{realm:'mind'}}}};
const player=()=>({owner:'Sean',name:'Sean',character:'sean',node:'here',points:0,pkmn:{team:[makeMon('sean')],box:[]},pkbag:{'master-ball':1}});
let p=player();
for(const id of ['bond-lazenby','bond-dalton']){
 const result=await PK.wildEncounter(run,p,{id,level:6});
 assert.equal(encounterId,id,'Encounter and battle IDs differ');
 assert.equal(result.caught.id,id,'Caught mon changed identity');
 assert.deepEqual(result.unlocked,[id],'Unlocked a different Bond');
 assert(store.profile.rosters.Sean.includes(id),'Missing from the owner roster');
 assert(p.pkmn.team.some(mon=>mon.id===id),'Caught actor missing from team');
 assert.equal(store.profile.earnedUnlocks[id],'encounter');
}
assert(!store.profile.rosters.Sean.includes('bond'),'Unexpected random Connery reward');
assert.deepEqual(dialogs.map(d=>d.ids[0]),['bond-lazenby','bond-dalton']);
const points=p.points,repeat=await PK.wildEncounter(run,p,{id:'bond-lazenby',level:6});
assert.equal(encounterId,'bond-lazenby');
assert.deepEqual(repeat.unlocked,[]);
assert.equal(p.points,points+2);
assert.equal(dialogs.length,2);
store.profile=profile.freshProfile();p=player();outcome='win';
const trainer=await PK.trainerSpace(run,p,{gym:true,trainerId:'bond-dalton',size:1});
assert.deepEqual(trainer.unlocked,['bond-dalton'],'Gym trainer reward changed variant');
assert.equal(trainerSeen,'bond-dalton','Wrong actor introduced as trainer');
assert(store.profile.rosters.Sean.includes('bond-dalton'));
assert(!store.profile.rosters.Sean.includes('bond'));
store.profile=profile.freshProfile();
for(const id of ['bond','bond-lazenby','bond-dalton'])profile.recruit(store.profile,id,'Sean','encounter');
const restored=profile.loadProfile();
for(const id of ['bond','bond-lazenby','bond-dalton'])assert(restored.rosters.Sean.includes(id),'A saved Bond variant was lost');
const faces=load('src/data/facePack.js').FACE_ASSIGNMENTS,art=load('src/data/faceArt.js').FACE_ART,hashes=new Set();
for(const id of ['bond-lazenby','bond-dalton'])for(const mood of ['normal','win']){
 const entry=art[faces[id][mood]],path=/^@@asset:(assets\/[^@]+)@@$/.exec(entry)?.[1];
 assert(path,'Missing art entry for '+id+' '+mood);
 hashes.add(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'));
}
assert.equal(hashes.size,4,'Bond actor/mood image bytes are not distinct');
console.log('POKÉMON BOND IDENTITY OK: catches, repeats, trainer wins, saves, actor artwork');
