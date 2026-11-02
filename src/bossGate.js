// Every level ends in a castle with a boss behind the gate (like the castles at
// the end of Mario worlds). The boss is picked per run and prefers someone
// the players have not unlocked yet.
const {BOSSES,bossById,bossesForLevel,BOSS_TIERS}=require("src/data/bosses.js");
const {seededRandom}=require("src/utils.js");
const {store}=require("src/state.js");
const {characterIdentity}=require("src/characters.js");
const LEVEL_REALMS=['mind','body','spirit','horror'];
function ownedIdentities(profile){const ids=new Set();if(!profile)return ids;for(const id of [...(profile.shared||[]),...Object.values(profile.rosters||{}).flat()])ids.add(characterIdentity(id));return ids;}
function chooseLevelBoss(run,realm,profile=store.profile){
 const pool=bossesForLevel(realm);if(!pool.length)return null;
 const owned=ownedIdentities(profile),fresh=pool.filter(b=>!owned.has(characterIdentity(b.unlockId))),list=fresh.length?fresh:pool;
 return list[Math.floor(seededRandom(`${run.seed}:boss:${realm}`)()*list.length)].id;
}
// Assigns bosses to any level gate that has none yet. Safe to call repeatedly.
function ensureLevelBosses(run,profile=store.profile){
 if(!run?.board?.realms)return;
 for(const realm of LEVEL_REALMS){const data=run.board.realms[realm];if(data&&data.gate&&!data.boss){const id=chooseLevelBoss(run,realm,profile);if(id)data.boss=id;}}
}
const castleName=boss=>boss?boss.lair||`${boss.name}’s Castle`:'';
// Board boss difficulty (ROADMAP K3): Level I Mind = Easy, II Body = Medium, III Spirit = Hard, IV Horror = Extreme.
// A warp zone's boss uses the level the party warped in from (run.warp.realm, or the main-board node they return to).
// Any other realm (Upside Down) counts the levels the current player has cleared.
const TIER_BY_REALM={mind:0,body:1,spirit:2,horror:3};
function bossTierFor(run,realm){
 if(run?.warp)realm=run.warp.realm||run.mainBoard?.nodes?.[run.warp.returns?.[run.current]]?.realm||realm;
 if(realm in TIER_BY_REALM)return TIER_BY_REALM[realm];
 return Math.min(3,(run?.players?.[run.current]?.cleared||[]).filter(r=>r in TIER_BY_REALM).length);
}
Object.assign(exports,{LEVEL_REALMS,chooseLevelBoss,ensureLevelBosses,castleName,bossById,bossTierFor,BOSS_TIERS});
