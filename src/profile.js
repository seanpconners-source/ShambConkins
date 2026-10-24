const {normalizePhotoPair, photoPairLibrary, currentPhotoPair, photoProfilePayload}=require("src/photoPairs.js");
const {ACTIVE_CATALOG:CATALOG}=require("src/contentPolicy.js");
const {PROFILE_KEY, readJSON, writeJSON, writeDurableJSON, inspectDurableJSON}=require("src/persistence.js");
const {characterIdentity}=require("src/characters.js");
const {fx}=require("src/netHooks.js");
const {cpuBlocksRecruit}=require("src/cpuHooks.js");
const {LAB_TEAM}=require("src/data/savoryLab.js");
const {isMovieBond, missingMovieBonds}=require("src/data/movieBonds.js");
const {normalizeSoloSettings, normalizeSoloBest}=require("src/solo.js");
function freshProfile() { return { version: 20, starterPolicy:22, holeItLevel:1, earnedUnlocks:{}, xp: 0, runs: 0, completed: 0, minigames:0, modes:['versus'], boards:['Mashup'], played: [], recentGames: [], recentTrivia: [], triviaDifficultyBag: [], recruitDryStreak:{Sean:0,Amber:0}, pairDiscoveries: [], boardUnlocks: [], shared: ['sean','amber'], rosters: { Sean: ['sean'], Amber: ['amber'] }, itemsSeen: [], itemFinds:{Sean:[],Amber:[]},recentItemFinds:{Sean:[],Amber:[]}, locations: [], settings: { sound: true, music: true, reducedMotion: false, originalLogos:true,drinkStatus:true,devMode:false,touchMode:'auto',flickSensitivity:1 }, wins: {}, best: {}, migrated: false }; }
function loadProfile() {
 const disk=inspectDurableJSON(PROFILE_KEY),shadow=readJSON(PROFILE_KEY);
 // With a durable BF receipt or a shadowed BF save, the readable disk copy is
 // authoritative; the legacy writeJSON memory fallback must not erase claims.
 const bfState=value=>value?.version===20&&(value.broforceClaims!==undefined||value.broforceClaimsBlocked===true);
 const saved=disk.status==='valid'&&disk.value?.version===20&&(bfState(disk.value)||bfState(shadow))?disk.value:shadow;
 const p = freshProfile();
 if(disk.status==='corrupt')p.broforceClaimsBlocked=true;
 const strings = value => Array.isArray(value) ? [...new Set(value.filter(v=>typeof v==='string'))] : [];
 const number = value => Number.isFinite(value) && value >= 0 ? value : 0;
 const ids = new Set([...CATALOG.characters.map(c=>c.id),'gordon-ramsay']);
 if (saved?.version === 20) {
  for(const key of ['xp','runs','completed','minigames'])p[key]=number(saved[key]);
  for(const key of ['played','games','recentGames','recentTrivia','itemsSeen','locations','pairDiscoveries','boardUnlocks','bossesBeaten'])p[key]=strings(saved[key]);
  p.triviaDifficultyBag=[...new Set(strings(saved.triviaDifficultyBag).filter(d=>['easy','medium','hard','impossible'].includes(d)))];
  p.minigames=Math.max(p.minigames,p.played.length);for(const owner of ['Sean','Amber'])p.recruitDryStreak[owner]=Math.min(1,number(saved.recruitDryStreak?.[owner]));
  for(const key of ['boards','modes'])if(Array.isArray(saved[key]))p[key]=strings(saved[key]);
  p.shared=strings(saved.shared).filter(id=>ids.has(id));
  for(const owner of ['Sean','Amber'])p.rosters[owner]=strings(saved.rosters?.[owner]).filter(id=>ids.has(id));
  for(const key of ['sound','music','reducedMotion','originalLogos','drinkStatus','devMode','pinballZoom'])if(typeof saved.settings?.[key]==='boolean')p.settings[key]=saved.settings[key];
  if(Number.isFinite(saved.settings?.flickSensitivity)&&saved.settings.flickSensitivity>0)p.settings.flickSensitivity=Math.min(1.35,Math.max(.65,saved.settings.flickSensitivity));
  {const v=saved.settings?.pinballView;if(v&&typeof v==='object'){const ok=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;if(ok(v.zoom,4)&&ok(v.speed,4))p.settings.pinballView={zoom:v.zoom,speed:v.speed};}}
  if(['auto','touch','pointer'].includes(saved.settings?.touchMode))p.settings.touchMode=saved.settings.touchMode;
  const solo=normalizeSoloSettings(saved.settings?.solo);if(solo)p.settings.solo=solo;
  // Title-screen character picks (names + characters for players 1/2); app.js checks they are still unlocked.
  {const v=saved.settings?.picks,ok=(a,n)=>Array.isArray(a)&&a.length===2&&a.every(x=>typeof x==='string'&&x.length&&x.length<=n);if(v&&ok(v.names,28)&&ok(v.chars,64))p.settings.picks={names:[...v.names],chars:[...v.chars]};}
  if(saved.soloBest)p.soloBest=normalizeSoloBest(saved.soloBest);
  for(const key of ['wins','best'])if(saved[key]&&typeof saved[key]==='object'&&!Array.isArray(saved[key]))p[key]=Object.fromEntries(Object.entries(saved[key]).filter(([,v])=>Number.isFinite(v)&&v>=0));
  for(const key of ['migrated','horrorSeen','equipment'])if(saved[key]===true)p[key]=true;
  if(Number.isFinite(saved.backup?.at)&&Number.isFinite(saved.backup?.mark)&&saved.backup.mark>=0)p.backup={at:saved.backup.at,mark:Math.floor(saved.backup.mark)};
  if(Number.isFinite(saved.holeItLevel)&&saved.holeItLevel>=1)p.holeItLevel=Math.min(9999,Math.floor(saved.holeItLevel));
  if(Number.isFinite(saved.holeItCoins)&&saved.holeItCoins>=0)p.holeItCoins=Math.min(1e9,Math.floor(saved.holeItCoins));
  if(saved.holeItStars&&typeof saved.holeItStars==='object'&&!Array.isArray(saved.holeItStars))p.holeItStars=Object.fromEntries(Object.entries(saved.holeItStars).filter(([n,v])=>/^\d{1,4}$/.test(n)&&[1,2,3].includes(v)));
  const photo=normalizePhotoPair(saved.photoHuntPair);
  if(Array.isArray(saved.photoHuntPairs)){p.photoHuntPairs=photoPairLibrary(saved);const selected=photo||p.photoHuntPairs.at(-1);if(selected)currentPhotoPair(p,selected);}else if(photo)p.photoHuntPair=photo;
  if(saved.photoHuntHigh&&typeof saved.photoHuntHigh.name==='string'&&Number.isFinite(saved.photoHuntHigh.score)&&saved.photoHuntHigh.score>=0)p.photoHuntHigh={name:saved.photoHuntHigh.name.slice(0,16),score:Math.floor(saved.photoHuntHigh.score),round:Number.isFinite(saved.photoHuntHigh.round)?Math.max(1,Math.floor(saved.photoHuntHigh.round)):1};
  // Pinball high-score tables, per table id: [{name, score}] best first (src/engines/pinball.js).
  if(saved.pinballHigh&&typeof saved.pinballHigh==='object'&&!Array.isArray(saved.pinballHigh)){p.pinballHigh={};for(const [id,list] of Object.entries(saved.pinballHigh).slice(0,40))if(/^[a-z0-9-]{1,32}$/.test(id)&&Array.isArray(list))p.pinballHigh[id]=list.filter(e=>e&&typeof e.name==='string'&&Number.isFinite(e.score)&&e.score>=0).slice(0,5).map(e=>({name:e.name.slice(0,12),score:Math.floor(e.score)}));}
  if(saved.bricksQuest&&typeof saved.bricksQuest==='object'&&!Array.isArray(saved.bricksQuest)){const q=saved.bricksQuest,int=(v,d)=>Number.isFinite(v)&&v>=0?Math.floor(v):d;
   p.bricksQuest={cleared:int(q.cleared,0),gems:int(q.gems,120),reward:int(q.reward,0)%10,gift:typeof q.gift==='string'?q.gift.slice(0,12):'',
    stars:Object.fromEntries(Object.entries(q.stars&&typeof q.stars==='object'?q.stars:{}).filter(([n,v])=>/^\d{1,6}$/.test(n)&&[1,2,3].includes(v)))};}
  if(saved.earnedUnlocks&&typeof saved.earnedUnlocks==='object'&&!Array.isArray(saved.earnedUnlocks))p.earnedUnlocks=Object.fromEntries(Object.entries(saved.earnedUnlocks).filter(([id,value])=>ids.has(id)&&typeof value==='string'));
  if(saved.broforceClaims!==undefined){
   const claims=validatedBroforceClaims(saved.broforceClaims);
   if(claims)p.broforceClaims=claims;
   else p.broforceClaimsBlocked=true; // Never silently reopen damaged claim keys.
  }
  if(saved.broforceClaimsBlocked===true)p.broforceClaimsBlocked=true;
 } else {
  const old = readJSON('shambconkins-profile-v6');
  if(old&&typeof old==='object'){
   p.xp=number(old.xp);p.runs=number(old.runs);p.completed=number(old.completedRuns);p.played=strings(old.played);
   p.shared.push(...strings(old.unlocked).filter(id=>ids.has(id)));
   for(const owner of ['Sean','Amber'])p.rosters[owner].push(...strings(old.rosters?.[owner]).filter(id=>ids.has(id)));
   p.itemsSeen=strings(old.itemsSeen);p.games=strings(old.games);p.migrated=true;
   p.minigames=number(old.minigames);p.boards=[...new Set([...p.boards,...strings(old.boards)])];p.modes=[...new Set([...p.modes,...strings(old.modes)])];p.horrorSeen=!!old.horrorSeen;
  }
 }
 p.itemsSeen=p.itemsSeen.filter(id=>id!=='eugenia-pass');
 const itemIds=new Set(CATALOG.items.map(i=>i.id));
 for(const owner of ['Sean','Amber']){
  p.itemFinds[owner]=strings(saved?.itemFinds?.[owner]??p.itemsSeen).filter(id=>itemIds.has(id));
  p.recentItemFinds[owner]=Array.isArray(saved?.recentItemFinds?.[owner])?saved.recentItemFinds[owner].filter(id=>typeof id==='string'&&itemIds.has(id)).slice(-32):[];
 }
 p.shared = [...new Set([...p.shared, 'sean','amber'])];
 p.rosters.Sean=[...new Set(['sean',...p.rosters.Sean])];p.rosters.Amber=[...new Set(['amber',...p.rosters.Amber])];
 // v0.20 supplied Gordon as a free starter. Remove that legacy flag once;
 // recruits recorded by the new policy keep their unlock on every later load.
 if(saved?.starterPolicy!==22&&!p.earnedUnlocks['gordon-ramsay']){
  p.shared=p.shared.filter(id=>id!=='gordon-ramsay');
  for(const owner of ['Sean','Amber'])p.rosters[owner]=p.rosters[owner].filter(id=>id!=='gordon-ramsay');
 }
 return p;
}
function validatedBroforceClaims(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const entries=Object.entries(value),ids=new Set([...CATALOG.characters.map(c=>c.id),'gordon-ramsay']),attempts=new Map(),out={};
 if(entries.length>4096)return null;
 for(const [key,r] of entries){
  if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.attemptId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(r.attemptId)||
     !['Sean','Amber'].includes(r.owner)||!ids.has(r.devilId)||key!=='bf27:'+JSON.stringify([r.attemptId,r.owner])||
     attempts.has(r.attemptId)&&attempts.get(r.attemptId)!==r.devilId)return null;
  attempts.set(r.attemptId,r.devilId);out[key]={attemptId:r.attemptId,owner:r.owner,devilId:r.devilId};
 }
 return out;
}
function saveProfile(profile,{durable=false}={}){
 const payload=photoProfilePayload(profile);
 if(profile.broforceClaims!==undefined){const claims=validatedBroforceClaims(profile.broforceClaims);if(!claims)return false;payload.broforceClaims=claims;}
 const disk=inspectDurableJSON(PROFILE_KEY);
 // Do not overwrite an unreadable or damaged profile: it might contain claims
 // that a stale in-memory writer cannot see. A backup is required for recovery.
 if(disk.status==='unavailable'||disk.status==='corrupt')return false;
 if(disk.status==='valid'&&disk.value?.version===20){
  const previous=disk.value;
  if(previous.broforceClaimsBlocked===true&&payload.broforceClaimsBlocked!==true)return false;
  if(previous.broforceClaims!==undefined){
   const oldClaims=validatedBroforceClaims(previous.broforceClaims);
   if(!oldClaims){if(payload.broforceClaimsBlocked!==true)return false;}
   else {
    const nextClaims=validatedBroforceClaims(payload.broforceClaims??{});
    if(!nextClaims)return false;
    for(const [key,receipt] of Object.entries(oldClaims)){
     const next=nextClaims[key];
     if(!next||next.attemptId!==receipt.attemptId||next.owner!==receipt.owner||next.devilId!==receipt.devilId||
        !Array.isArray(payload.rosters?.[receipt.owner])||
        !payload.rosters[receipt.owner].includes(receipt.devilId))return false;
    }
   }
  }
 }
 return durable?writeDurableJSON(PROFILE_KEY,payload):writeJSON(PROFILE_KEY,payload);
}
function availableCharacters(profile, owner) { const unique=new Map();for(const id of [...profile.shared,...(profile.rosters[owner]||[])])if(!unique.has(characterIdentity(id)))unique.set(characterIdentity(id),id);return [...unique.values()]; }
function canRecruit(profile,id,owner=null,reason='encounter') {
 if(id==='loki'&&reason!=='pair')return false;
 const record=CATALOG.characters.find(c=>c.id===id);
 if(!record&&id!=='gordon-ramsay')return false;
 if(record?.unlockBy==='item'&&reason!=='item'||record?.unlockBy==='game-win'&&reason!=='game'||record?.unlockBy==='character-win'&&reason!=='character'||record?.unlockBy==='horror'&&reason!=='horror'||record?.unlockBy==='boss'&&reason!=='boss'||record?.unlockBy==='dogs'&&reason!=='dogs'||record?.unlockBy==='southpark'&&reason!=='southpark')return false;
 if(record?.unlockBy==='lab'){
  if(reason!=='lab'||!owner)return false;
  if(id==='uss-carson'&&!LAB_TEAM.every(c=>availableCharacters(profile,owner).includes(c)))return false;
 }
 const identity=characterIdentity(id),list=owner?profile.rosters[owner]||[]:profile.shared;
 return !list.some(c=>characterIdentity(c)===identity)&&!(owner&&profile.shared.some(c=>characterIdentity(c)===identity));
}
function recruit(profile,id,owner=null,reason='encounter') {
 if(!canRecruit(profile,id,owner,reason)||cpuBlocksRecruit(owner))return false;
 (owner?(profile.rosters[owner] ||= []):profile.shared).push(id);
 (profile.earnedUnlocks||={})[id]=reason;profile.xp+=6;saveProfile(profile);fx('recruit',id,owner,reason);return true;
}
// Gameplay grants return the actual ID for portraits, messages and saved results.
// Exact grants above remain available for migrations and prerequisite fixtures.
function canRecruitReward(profile,id,owner=null,reason='encounter'){
 if(!isMovieBond(id))return canRecruit(profile,id,owner,reason);
 const owned=owner?availableCharacters(profile,owner):profile.shared;
 return missingMovieBonds(owned).some(candidate=>canRecruit(profile,candidate,owner,reason));
}
function recruitReward(profile,id,owner=null,reason='encounter',random=Math.random){
 if(isMovieBond(id)){
  const owned=owner?availableCharacters(profile,owner):profile.shared;
  const candidates=missingMovieBonds(owned).filter(candidate=>canRecruit(profile,candidate,owner,reason));
  if(!candidates.length)return null;
  const draw=Number(random());
  id=candidates[Math.min(candidates.length-1,Math.max(0,Math.floor((Number.isFinite(draw)?draw:0)*candidates.length)))];
 }
 return recruit(profile,id,owner,reason)?id:null;
}
function rememberCollectibles(profile,run){const known=new Set(CATALOG.items.map(item=>item.id));profile.itemsSeen=[...new Set([...profile.itemsSeen,...(run?.players||[]).flatMap(player=>player.items||[])].filter(id=>known.has(id)))];profile.itemFinds ||= {Sean:[],Amber:[]};for(const p of run?.players||[])profile.itemFinds[p.owner]=[...new Set([...(profile.itemFinds[p.owner]||[]),...p.items].filter(id=>known.has(id)))];}
function homePackTurn(run){return Math.max(3,Math.round((run.endless||run.maxTurns===999999?24:run.maxTurns)/3));}
function recordGame(profile, game, winner, scores) { if (!profile.played.includes(game.id)) profile.played.push(game.id); profile.minigames=(profile.minigames||0)+1; profile.recentGames = [...profile.recentGames, game.id].slice(-40); profile.xp += winner === null ? 3 : 5; if (winner !== null) profile.wins[game.id] = (profile.wins[game.id] || 0) + 1; profile.best[game.id] = Math.max(profile.best[game.id] || 0, ...scores.filter(Number.isFinite)); saveProfile(profile); }

Object.assign(exports,{freshProfile,loadProfile,saveProfile,availableCharacters,canRecruit,recruit,canRecruitReward,recruitReward,rememberCollectibles,homePackTurn,recordGame,validatedBroforceClaims});
