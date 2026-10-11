// Broforce roster decisions are pure. Recruiting and profile persistence belong
// to the normal game reward lifecycle, not this engine.
const {CHARACTERS, characterIdentity, SPECIAL_UNLOCKS}=require('src/characters.js');
const {availableCharacters, canRecruit}=require('src/profile.js');

const CHARACTER_IDS=new Set(CHARACTERS.map(c=>c.id));
const DEFAULT_OWNERS=['Sean','Amber'];

function snapshotFighters(profile,owner){
 if(!profile||!DEFAULT_OWNERS.includes(owner)||!Array.isArray(profile.shared)||!profile.rosters)return [];
 const seen=new Set(),ids=[];
 for(const id of availableCharacters(profile,owner)){
  if(!CHARACTER_IDS.has(id))continue;
  const identity=characterIdentity(id);
  if(seen.has(identity))continue;
  seen.add(identity);
  ids.push(id);
 }
 return ids;
}

function drawFrom(ids,random){
 if(!ids.length)return null;
 if(ids.length===1)return ids[0];
 const roll=Number(random());
 const index=Number.isFinite(roll)?Math.min(ids.length-1,Math.max(0,Math.floor(roll*ids.length))):0;
 return ids[index];
}

function drawNextFighter(ids,currentId,random=Math.random){
 const pool=[],seen=new Set();
 for(const id of Array.isArray(ids)?ids:[]){
  if(!CHARACTER_IDS.has(id))continue;
  const identity=characterIdentity(id);
  if(seen.has(identity))continue;
  seen.add(identity);
  pool.push(id);
 }
 if(!pool.length)return null;
 const currentIdentity=characterIdentity(currentId);
 const alternatives=pool.filter(id=>characterIdentity(id)!==currentIdentity);
 return drawFrom(alternatives.length?alternatives:pool,random);
}

function devilCandidatePool(profile,owners=DEFAULT_OWNERS){
 if(!profile||!Array.isArray(owners)||!owners.length||
    owners.some(owner=>!DEFAULT_OWNERS.includes(owner)))return [];
 const owned=new Set();
 for(const owner of new Set(owners)){
  for(const id of snapshotFighters(profile,owner))owned.add(characterIdentity(id));
 }
 const pool=[],seen=new Set(),lokiIdentity=characterIdentity('loki');
 for(const c of CHARACTERS){
  if(!c||!CHARACTER_IDS.has(c.id)||SPECIAL_UNLOCKS.includes(c.unlockBy))continue;
  const identity=characterIdentity(c.id);
  if(identity===lokiIdentity||owned.has(identity)||seen.has(identity))continue;
  if(!owners.every(owner=>canRecruit(profile,c.id,owner,'encounter')))continue;
  seen.add(identity);
  pool.push(c.id);
 }
 return pool;
}

function chooseDevil(profile,owners=DEFAULT_OWNERS,random=Math.random){
 return drawFrom(devilCandidatePool(profile,owners),random);
}

Object.assign(exports,{snapshotFighters,drawNextFighter,devilCandidatePool,chooseDevil});
