const {normalizePhotoPair, photoPairLibrary, currentPhotoPair, photoProfilePayload}=require("src/photoPairs.js");
const {ACTIVE_CATALOG:CATALOG}=require("src/contentPolicy.js");
const {PROFILE_KEY, readJSON, writeJSON}=require("src/persistence.js");
const {characterIdentity}=require("src/characters.js");
const {LAB_TEAM}=require("src/data/savoryLab.js");
const {isMovieBond, missingMovieBonds}=require("src/data/movieBonds.js");
function freshProfile() { return { version: 20, starterPolicy:22, earnedUnlocks:{}, xp: 0, runs: 0, completed: 0, minigames:0, modes:['versus'], boards:['Mashup'], played: [], recentGames: [], recentTrivia: [], triviaDifficultyBag: [], recruitDryStreak:{Sean:0,Amber:0}, pairDiscoveries: [], boardUnlocks: [], shared: ['sean','amber'], rosters: { Sean: ['sean'], Amber: ['amber'] }, itemsSeen: [], itemFinds:{Sean:[],Amber:[]},recentItemFinds:{Sean:[],Amber:[]}, locations: [], settings: { sound: true, music: true, reducedMotion: false, originalLogos:true,drinkStatus:true,devMode:false,touchMode:'auto',flickSensitivity:1 }, wins: {}, best: {}, migrated: false }; }
function loadProfile() {
 const saved = readJSON(PROFILE_KEY); const p = freshProfile();
 const strings = value => Array.isArray(value) ? [...new Set(value.filter(v=>typeof v==='string'))] : [];
 const number = value => Number.isFinite(value) && value >= 0 ? value : 0;
 const ids = new Set([...CATALOG.characters.map(c=>c.id),'gordon-ramsay']);
 if (saved?.version === 20) {
  for(const key of ['xp','runs','completed','minigames'])p[key]=number(saved[key]);
  for(const key of ['played','games','recentGames','recentTrivia','itemsSeen','locations','pairDiscoveries','boardUnlocks'])p[key]=strings(saved[key]);
  p.triviaDifficultyBag=[...new Set(strings(saved.triviaDifficultyBag).filter(d=>['easy','medium','hard','impossible'].includes(d)))];
  p.minigames=Math.max(p.minigames,p.played.length);for(const owner of ['Sean','Amber'])p.recruitDryStreak[owner]=Math.min(1,number(saved.recruitDryStreak?.[owner]));
  for(const key of ['boards','modes'])if(Array.isArray(saved[key]))p[key]=strings(saved[key]);
  p.shared=strings(saved.shared).filter(id=>ids.has(id));
  for(const owner of ['Sean','Amber'])p.rosters[owner]=strings(saved.rosters?.[owner]).filter(id=>ids.has(id));
  for(const key of ['sound','music','reducedMotion','originalLogos','drinkStatus','devMode'])if(typeof saved.settings?.[key]==='boolean')p.settings[key]=saved.settings[key];
  if(Number.isFinite(saved.settings?.flickSensitivity)&&saved.settings.flickSensitivity>0)p.settings.flickSensitivity=Math.min(1.35,Math.max(.65,saved.settings.flickSensitivity));
  if(['auto','touch','pointer'].includes(saved.settings?.touchMode))p.settings.touchMode=saved.settings.touchMode;
  for(const key of ['wins','best'])if(saved[key]&&typeof saved[key]==='object'&&!Array.isArray(saved[key]))p[key]=Object.fromEntries(Object.entries(saved[key]).filter(([,v])=>Number.isFinite(v)&&v>=0));
  for(const key of ['migrated','horrorSeen','equipment'])if(saved[key]===true)p[key]=true;
  const photo=normalizePhotoPair(saved.photoHuntPair);
  if(Array.isArray(saved.photoHuntPairs)){p.photoHuntPairs=photoPairLibrary(saved);const selected=photo||p.photoHuntPairs.at(-1);if(selected)currentPhotoPair(p,selected);}else if(photo)p.photoHuntPair=photo;
  if(saved.earnedUnlocks&&typeof saved.earnedUnlocks==='object'&&!Array.isArray(saved.earnedUnlocks))p.earnedUnlocks=Object.fromEntries(Object.entries(saved.earnedUnlocks).filter(([id,value])=>ids.has(id)&&typeof value==='string'));
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
const saveProfile = profile => writeJSON(PROFILE_KEY, photoProfilePayload(profile));
function availableCharacters(profile, owner) { const unique=new Map();for(const id of [...profile.shared,...(profile.rosters[owner]||[])])if(!unique.has(characterIdentity(id)))unique.set(characterIdentity(id),id);return [...unique.values()]; }
function canRecruit(profile,id,owner=null,reason='encounter') {
 if(id==='loki'&&reason!=='pair')return false;
 const record=CATALOG.characters.find(c=>c.id===id);
 if(!record&&id!=='gordon-ramsay')return false;
 if(record?.unlockBy==='item'&&reason!=='item'||record?.unlockBy==='game-win'&&reason!=='game'||record?.unlockBy==='character-win'&&reason!=='character'||record?.unlockBy==='horror'&&reason!=='horror')return false;
 if(record?.unlockBy==='lab'){
  if(reason!=='lab'||!owner)return false;
  if(id==='uss-carson'&&!LAB_TEAM.every(c=>availableCharacters(profile,owner).includes(c)))return false;
 }
 const identity=characterIdentity(id),list=owner?profile.rosters[owner]||[]:profile.shared;
 return !list.some(c=>characterIdentity(c)===identity)&&!(owner&&profile.shared.some(c=>characterIdentity(c)===identity));
}
function recruit(profile,id,owner=null,reason='encounter') {
 if(!canRecruit(profile,id,owner,reason))return false;
 (owner?(profile.rosters[owner] ||= []):profile.shared).push(id);
 (profile.earnedUnlocks||={})[id]=reason;profile.xp+=6;saveProfile(profile);return true;
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

Object.assign(exports,{freshProfile,loadProfile,saveProfile,availableCharacters,canRecruit,recruit,canRecruitReward,recruitReward,rememberCollectibles,homePackTurn,recordGame});