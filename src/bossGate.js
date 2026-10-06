// Every level ends in a castle with a boss behind the gate (like the castles at
// the end of Mario worlds). The boss is picked per run and prefers someone
// the players have not unlocked yet.
const {BOSSES,bossById,bossesForLevel}=require("src/data/bosses.js");
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
Object.assign(exports,{LEVEL_REALMS,chooseLevelBoss,ensureLevelBosses,castleName,bossById});
