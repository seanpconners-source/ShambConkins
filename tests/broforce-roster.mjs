// BF-17: pure, identity-aware per-owner Broforce roster selection.
// Exercise the real project characters/profile/state code against a controlled
// catalog, rather than replacing their recruitment or ownership decisions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(file,deps={}){
 const exported={};
 const source=fs.readFileSync(file,'utf8');
 const factory=vm.runInThisContext('(function(require,exports){\n'+source+'\n})',{filename:file});
 factory(id=>{
  if(!Object.hasOwn(deps,id))throw new Error(file+' unexpectedly requires '+id);
  return deps[id];
 },exported);
 return exported;
}
const entries=[
 ['sean','Sean','ShambConkins'],['amber','Amber','ShambConkins'],
 ['kc','KC','ShambConkins','dogs'],['mylo','Mylo','ShambConkins','dogs'],
 ['loki','Loki','ShambConkins'],
 ['michael','Michael Scott','The Office'],
 ['michael-scott','Michael Scott','The Office'],
 ['t-800','Terminator','The Terminator'],
 ['terminator','Terminator','The Terminator'],
 ['hero-a','Hero A','Example'],['hero-b','Hero B','Example'],['hero-c','Hero C','Example'],
 ...['item','game-win','lab','character-win','horror','boss','southpark'].map(kind=>['special-'+kind,'Special '+kind,'Example',kind])
];
const catalog=entries.map(([id,name,source,unlockBy])=>({id,name,source,...(unlockBy?{unlockBy}:{})}));
const content={ACTIVE_CATALOG:{characters:catalog,items:[]}};
const characters=load('src/characters.js',{'src/contentPolicy.js':content,'src/utils.js':{hash:()=>1}});
const profiles=load('src/profile.js',{'src/netHooks.js':{fx(){}},
 'src/photoPairs.js':{normalizePhotoPair:()=>null,photoPairLibrary:()=>[],currentPhotoPair:()=>{},photoProfilePayload:p=>p},
 'src/contentPolicy.js':content,
 'src/persistence.js':{PROFILE_KEY:'test-profile',readJSON:()=>null,writeJSON:()=>{}},
 'src/characters.js':characters,
 'src/data/savoryLab.js':{LAB_TEAM:[]},
 'src/data/movieBonds.js':{isMovieBond:()=>false,missingMovieBonds:()=>[]},
 'src/solo.js':load('src/solo.js')
});
const roster=load('src/engines/broforce/roster.js',{
 'src/characters.js':characters,'src/profile.js':profiles
});
const state=load('src/state.js',{'src/characters.js':characters});
const plain=values=>Array.from(values);
const makeProfile=()=>{
 const profile=profiles.freshProfile();
 profile.shared=['sean','amber','michael','loki','unknown-id'];
 profile.rosters.Sean=['hero-a','michael-scott','hero-a','not-a-character'];
 profile.rosters.Amber=['hero-b','t-800','hero-b'];
 return profile;
};
const profile=makeProfile(),saved=JSON.stringify(profile);
const playerOne=state.newPlayer('Renamed Player One','hero-a',0);
const playerTwo=state.newPlayer('Renamed Player Two','hero-b',1);
assert.equal(playerOne.owner,'Sean');
assert.equal(playerTwo.owner,'Amber');
assert.deepEqual(plain(roster.snapshotFighters(profile,playerOne.owner)),['sean','amber','michael','loki','hero-a']);
assert.deepEqual(plain(roster.snapshotFighters(profile,playerTwo.owner)),['sean','amber','michael','loki','hero-b','t-800']);
assert(!roster.snapshotFighters(profile,'Sean').includes('hero-b'),'Amber-only roster leaked to Sean');
assert(!roster.snapshotFighters(profile,'Amber').includes('hero-a'),'Sean-only roster leaked to Amber');
assert.deepEqual(plain(roster.snapshotFighters(profile,'Renamed Player One')),[],'Display names are not owner keys');
assert.deepEqual(plain(roster.snapshotFighters(null,'Sean')),[]);

assert.equal(roster.drawNextFighter(['hero-a','hero-b','hero-c'],'hero-a',()=>0),'hero-b');
assert.equal(roster.drawNextFighter(['hero-a','hero-b','hero-c'],'hero-a',()=>0.999),'hero-c');
assert.equal(roster.drawNextFighter(['michael','michael-scott','hero-c'],'michael-scott',()=>0),'hero-c',
 'Identity aliases may not repeat the current fighter');
assert.equal(roster.drawNextFighter(['hero-a','hero-a','hero-b'],'hero-a',()=>0),'hero-b');
assert.equal(roster.drawNextFighter(['hero-a'],'hero-a',()=>{throw Error('Unneeded RNG');}),'hero-a');
assert.equal(roster.drawNextFighter([],'hero-a',()=>{throw Error('Empty RNG');}),null);
assert.equal(roster.drawNextFighter(['unknown-id','hero-c'],'hero-a',()=>0),'hero-c');
assert.equal(roster.drawNextFighter(['hero-a','hero-b'],'hero-c',()=>NaN),'hero-a');
assert.equal(roster.drawNextFighter(['hero-a','hero-b'],'hero-c',()=>2),'hero-b');

const devils=plain(roster.devilCandidatePool(profile));
assert.deepEqual(devils,['hero-c','gordon-ramsay']);
assert.deepEqual(plain(roster.devilCandidatePool(profile,['Amber','Sean'])),devils);
assert(!devils.includes('hero-a')&&!devils.includes('hero-b'),'A fighter already owned by one player qualified');
assert(!devils.includes('terminator'),'Alias of Amber-owned fighter qualified');
assert(!devils.includes('loki'),'Loki must remain pair-only');
assert(!devils.some(id=>id.startsWith('special-')),'Special-unlock characters qualified');
assert.equal(roster.chooseDevil(profile,['Sean','Amber'],()=>0),'hero-c');
assert.equal(roster.chooseDevil(profile,['Sean','Amber'],()=>0.999),'gordon-ramsay');
assert.deepEqual(plain(roster.devilCandidatePool(profile,['Renamed Player One','Amber'])),[]);

const fresh=profiles.freshProfile();
const freshPool=roster.devilCandidatePool(fresh);
assert.equal(freshPool.filter(id=>characters.characterIdentity(id)===characters.characterIdentity('michael')).length,1);
assert.equal(freshPool.filter(id=>characters.characterIdentity(id)===characters.characterIdentity('t-800')).length,1);
assert(!freshPool.includes('kc')&&!freshPool.includes('mylo'),'Dog unlocks must be reserved');
for(const kind of characters.SPECIAL_UNLOCKS)assert(!freshPool.includes('special-'+kind),'Forbidden '+kind);

const exhausted=profiles.freshProfile();
exhausted.shared=characters.CHARACTERS.map(c=>c.id);
assert.deepEqual(plain(roster.devilCandidatePool(exhausted)),[]);
assert.equal(roster.chooseDevil(exhausted,['Sean','Amber'],()=>{throw Error('Empty candidate draw consumed RNG');}),null);
assert.equal(JSON.stringify(profile),saved,'Pure selection mutated the profile');
assert.equal(playerOne.character,'hero-a','Selected main character was changed');
assert.equal(playerTwo.character,'hero-b','Other player main character was changed');
console.log('BROFORCE BF-17 ROSTERS OK: ownership, aliases, special locks, seeded draws and purity');
