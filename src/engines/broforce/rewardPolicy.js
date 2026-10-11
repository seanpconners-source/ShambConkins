// BF-27: pure profile-state award planning; no storage, launcher or save calls.
// The caller must obtain the attempt and boarding evidence from authoritative
// persisted Broforce mission state, not from UI-provided result text.
const {CHARACTERS, characterIdentity, SPECIAL_UNLOCKS}=require('src/characters.js');
const {canRecruit}=require('src/profile.js');

const OWNERS=Object.freeze(['Sean','Amber']);
const KINDS='broforce-devil-award/v1';
const DEVIL_IDS=new Set(CHARACTERS.map(c=>c.id));
const SPECIAL=new Set(SPECIAL_UNLOCKS);
const SAFE_ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_ATTEMPT=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const has=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&
 (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const canonicalOwners=owners=>Array.isArray(owners)&&owners.length===2&&
 owners.every(o=>OWNERS.includes(o))&&new Set(owners).size===2;
const validAttempt=id=>typeof id==='string'&&SAFE_ATTEMPT.test(id);
const validDevil=id=>typeof id==='string'&&id.length<=128&&SAFE_ID.test(id)&&DEVIL_IDS.has(id);
const claimKey=(attemptId,owner)=>'bf27:'+JSON.stringify([attemptId,owner]);

function validProfile(profile){
 return isRecord(profile)&&isRecord(profile.rosters)&&Array.isArray(profile.shared)&&
 OWNERS.every(o=>Array.isArray(profile.rosters[o]))&&
 [...profile.shared,...OWNERS.flatMap(o=>profile.rosters[o])].every(id=>typeof id==='string')&&
 Number.isFinite(profile.xp)&&profile.xp>=0&&
 (profile.earnedUnlocks===undefined||isRecord(profile.earnedUnlocks))&&
 (profile.broforceClaims===undefined||isRecord(profile.broforceClaims));
}
function flags(value,owners){
 if(Array.isArray(value)&&value.length===2&&value.every(x=>typeof x==='boolean'))return [...value];
 if(isRecord(value)&&Object.keys(value).length===2&&
    owners.every(o=>has(value,o)&&typeof value[o]==='boolean'))return owners.map(o=>value[o]);
 return null;
}
function eligibleDevil(devilId){
 const record=CHARACTERS.find(c=>c.id===devilId);
 return !!record&&!SPECIAL.has(record.unlockBy)&&characterIdentity(devilId)!==characterIdentity('loki');
}
// A receipt is bound to one immutable (attempt, canonical owner, exact character).
// Check ALL receipts before making any profile change: even the other owner's
// receipt must not disagree with the attempt's single devil identity.
function checkedClaims(profile,attemptId,devilId){
 const claims=profile.broforceClaims||{};
 const entries=Object.entries(claims);
 if(entries.length>4096)throw new Error('Broforce claims limit exceeded');
 for(const [key,receipt] of entries){
  if(!key.startsWith('bf27:')||!isRecord(receipt)||
     !validAttempt(receipt.attemptId)||!OWNERS.includes(receipt.owner)||
     !validDevil(receipt.devilId)||
     claimKey(receipt.attemptId,receipt.owner)!==key)
   throw new Error('Malformed Broforce claim receipt');
  if(receipt.attemptId===attemptId&&receipt.devilId!==devilId)
   throw new Error('Conflicting devil for an already settled Broforce attempt');
 }
 return claims;
}
function emptyPlan(reason){return {kind:KINDS,eligible:false,reason,grants:[]};}

function planBroforceAwards(input={}){
 if(!isRecord(input))return emptyPlan('invalid-input');
 const {profile,origin,attemptId,devilId,boarded,aliveAtBoarding,owners=OWNERS,won}=input;
 if(!validProfile(profile))return emptyPlan('invalid-profile');
 if(!canonicalOwners(owners)||!validAttempt(attemptId))return emptyPlan('invalid-attempt');
 if(!validDevil(devilId)||!eligibleDevil(devilId))return emptyPlan('ineligible-devil');
 const boardedFlags=flags(boarded,owners),aliveFlags=flags(aliveAtBoarding,owners);
 if(!boardedFlags||!aliveFlags)return emptyPlan('invalid-boarding-evidence');
 if(origin!=='board'||won!==true)return emptyPlan('not-a-board-victory');
 const liveBoarders=owners.filter((_,i)=>boardedFlags[i]&&aliveFlags[i]);
 if(!liveBoarders.length)return emptyPlan('no-live-boarders');
 // Do not assign a substitute reward. Existing special-category gates remain
 // authoritative through real canRecruit(reason='encounter').
 const grants=liveBoarders.filter(owner=>canRecruit(profile,devilId,owner,'encounter'))
  .map(owner=>({owner,characterId:devilId}));
 return {kind:KINDS,eligible:true,reason:grants.length?'eligible':'already-owned-or-locked',
  origin:'board',won:true,attemptId,devilId,owners:[...owners],
  boarded:boardedFlags,aliveAtBoarding:aliveFlags,grants};
}

function applyBroforceAwards(profile,plan){
 if(!validProfile(profile))throw new Error('Invalid Broforce profile');
 // Profiles are persisted JSON objects; clone before any decision or mutation.
 const next=JSON.parse(JSON.stringify(profile));
 const result={profile:next,grants:[],receipts:[]};
 if(!isRecord(plan)||plan.kind!==KINDS||plan.eligible!==true)return result;
 if(!canonicalOwners(plan.owners)||!validAttempt(plan.attemptId)||
    !validDevil(plan.devilId)||!eligibleDevil(plan.devilId)||
    plan.origin!=='board'||plan.won!==true||
    !Array.isArray(plan.boarded)||!Array.isArray(plan.aliveAtBoarding)||
    !Array.isArray(plan.grants))return result;
 const boardedFlags=flags(plan.boarded,plan.owners);
 const aliveFlags=flags(plan.aliveAtBoarding,plan.owners);
 if(!boardedFlags||!aliveFlags)return result;
 const liveBoarders=plan.owners.filter((_,i)=>boardedFlags[i]&&aliveFlags[i]);
 if(!liveBoarders.length)return result;
 // Validate the entire plan before applying any entries. A plan cannot award
 // another player, another ID, or the same owner twice.
 const intended=new Set();
 for(const grant of plan.grants){
  if(!isRecord(grant)||!liveBoarders.includes(grant.owner)||
     grant.characterId!==plan.devilId||intended.has(grant.owner))return result;
  intended.add(grant.owner);
 }
 if(!intended.size)return result;
 const claims=checkedClaims(next,plan.attemptId,plan.devilId);
 const fresh=[];
 for(const owner of plan.owners){
  if(!intended.has(owner))continue;
  const key=claimKey(plan.attemptId,owner);
  if(has(claims,key))continue; // Exact replay: already awarded, including after reload.
  if(!canRecruit(next,plan.devilId,owner,'encounter'))continue;
  fresh.push({owner,characterId:plan.devilId,key});
 }
 if(!fresh.length)return result;
 if(Object.keys(claims).length+fresh.length>4096)throw new Error('Broforce claims limit exceeded');
 const safeClaims=Object.create(null);
 for(const [key,value] of Object.entries(claims))safeClaims[key]=value;
 next.broforceClaims=safeClaims;
 next.earnedUnlocks||={};
 for(const {owner,characterId,key} of fresh){
  next.rosters[owner].push(characterId);
  if(!has(next.earnedUnlocks,characterId))next.earnedUnlocks[characterId]='broforce';
  next.xp+=6; // Same one-time XP per recruit as src/profile.js:recruit.
  const receipt={attemptId:plan.attemptId,owner,devilId:characterId};
  next.broforceClaims[key]=receipt;
  result.grants.push({owner,characterId});
  result.receipts.push({key,...receipt});
 }
 // INTEGRATION: save `next` ONCE atomically with its roster + receipt map.
 // Never call recruit/recruitReward/saveProfile here; those save per grant and
 // may substitute a movie Bond. No selected board character is modified.
 return result;
}
Object.assign(exports,{planBroforceAwards,applyBroforceAwards});
