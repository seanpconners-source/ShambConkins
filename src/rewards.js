const {CHARACTERS, characterIdentity, SPECIAL_UNLOCKS}=require("src/characters.js");
const {availableCharacters}=require("src/profile.js");
const {sourceMatches}=require("src/references.js");
const {canRecruitReward}=require("src/profile.js");
// These are the original personal game-win rewards, in their discovery order.
// A pending named reward takes priority over the ordinary themed recruit roll.
const LEGACY_GAME_RECRUITS = Object.freeze({
 'office-hockey-shootout': Object.freeze(['emilio-estevez']),
 'rink-rivals': Object.freeze(['emilio-estevez']),
 'office-air-hockey': Object.freeze(['emilio-estevez']),
 'happy-gilmore-golf': Object.freeze(['happy-gilmore']),
 'kingpin-bowling': Object.freeze(['ref-roymunson','ref-erniemccracken']),
 'color-of-money': Object.freeze(['ref-fasteddiefelson','ref-vincentlauria']),
 'crossy-chaos': Object.freeze(['george-costanza']),
 'pac-maze-duel': Object.freeze(['pac-man', 'blinky']),
 'bomber-duel': Object.freeze(['bomberman']),
 'space-swarm': Object.freeze(['mars-attacker']),
 'dragonheart-slay': Object.freeze(['draco']),
 'cable-channel-surf': Object.freeze(['chip-douglas']),
 'audrey-feed': Object.freeze(['audrey-ii', 'seymour-krelborn']),
 'pipe-panic': Object.freeze(['mario', 'luigi']),
 'sewer-clash': Object.freeze(['leonardo-tmnt', 'donatello-tmnt', 'raphael-tmnt', 'michelangelo-tmnt'])
});

function ownedIdentities(profile, player) {
 return new Set(availableCharacters(profile, player.owner).map(characterIdentity));
}

function nextLegacyRecruit(game, profile, player) {
 const owned = ownedIdentities(profile, player);
 const id = (LEGACY_GAME_RECRUITS[game.id] || (game.engine==='galaga'?['mars-attacker']:[])).find(id => !owned.has(characterIdentity(id)));
 return id ? CHARACTERS.find(c => c.id === id) || null : null;
}

function gameHasGuaranteedRecruit(game, profile, player) {
 return !!nextLegacyRecruit(game, profile, player);
}

function gameRecruitPool(game, profile, player) {
 const legacy = nextLegacyRecruit(game, profile, player);
 if (legacy) return [legacy];
 const owned = ownedIdentities(profile, player);
 const identities = new Set();
 const eligible=CHARACTERS.filter(c => {
  const identity = characterIdentity(c.id);
  if (identity === characterIdentity('loki') || SPECIAL_UNLOCKS.includes(c.unlockBy) || owned.has(identity) || identities.has(identity) || !canRecruitReward(profile,c.id,player.owner,'game')) return false;
  identities.add(identity);
  return true;
 });
 const themed=eligible.filter(c=>sourceMatches(c.source,game.source));return themed.length?themed:eligible;
}

function recruitmentChance(profile,player,guaranteed=false){
 if(guaranteed||player.recruitGuarantee||(profile.recruitDryStreak?.[player.owner]||0)>=1)return 1;
 return player.recruitBonus||player.triviaRecruitBonus ? .9:.65;
}

function foodGame(game){return /food|flavor|fruit|banana|audrey|burger|dinner|kitchen|melon|feed/i.test([game.id,game.title,...(game.tags||[])].join(' '));}

Object.assign(exports,{LEGACY_GAME_RECRUITS,gameHasGuaranteedRecruit,gameRecruitPool,recruitmentChance,foodGame});