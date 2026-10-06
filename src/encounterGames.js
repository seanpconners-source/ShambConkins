const {ACTIVE_CATALOG}=require("src/contentPolicy.js");
const {gameById, GAMES, EVENT_GAMES}=require("src/gameRegistry.js");
const {normalizeSource, sourceMatches}=require("src/referenceSources.js");
const {hash}=require("src/utils.js");
// Archived tap/timer reskins are not new Vault entries. Their old card and
// voucher IDs still lead to a complete, playable mechanic from the current game.
const ENCOUNTER_GAME_LINKS=Object.freeze({
 'taskmaster-7':'task-tallest-thing','flonkerton':'warehouse-shift','cones':'tm-cones',
 'bug-splat':'bug-artillery','motion-tracker':'alien-sonar-grid',
 'paint-can':'home-alone-paint-can','happy-golf':'happy-gilmore-golf','traitors':'traitors-guess-who',
 'dbz-dragon-radar':'trivia-dbz','ghostface-call':'django-hangman','hellraiser-box':'matrix-hardline-hack',
 'saw-reverse-trap':'matrix-hardline-hack','barbarian-measure':'task-tallest-thing',
 'cargo-balance':'radical-bike','coaster-brake':'radical-bike','jackass-downhill':'radical-bike',
 'chair-fight':'warriors-brawl','jackie-reflex':'warriors-brawl','kumite-reflex':'kill-bill-duel',
 'seven-samurai-duel':'kill-bill-duel','troy-spear':'bug-artillery','coin-toss':'roulette',
 'laser-table':'bond-facility','laser-timing':'bond-facility','oddjob-hat-game':'bond-facility',
 'doubtfire-kitchen':'kitchen-service','under-siege-galley':'kitchen-service',
 'bucketheadland-killswitch':'bucketheadland-pinball','war-pigs-air-raid':'mars-missile-defense',
 'robot-rock':'derezzed-cycles','robot-rhythm-long':'neon-ball-storm','scott-bass-battle':'neon-ball-storm',
 'baby-getaway':'fast-quarter-mile','bring-bowl':'alien-sonar-grid',
 'blood-rave':'evil-dead-cabin','castlevania-courtyard':'evil-dead-cabin',
 'music:gizzard-1':'neon-ball-storm'
});
const ITEM_CHALLENGE_LINKS=Object.freeze({
 'pow-block':'bomber-duel','walther':'bond-facility','bowling-ball':'lebowski-bowling',
 'samurai-sword':'kill-bill-duel','friendship-drumstick':'neon-ball-storm',
 'warriors-bottle':'warriors-brawl','vampire-killer':'evil-dead-cabin'
});
const ENGINE_LINKS=Object.freeze({
 timer:'task-tallest-thing',reaction:'terminator-scan',mash:'warriors-brawl',memory:'traitors-guess-who',
 target:'duck-hunt-turn',timing:'taskmaster-curling',runner:'crossy-chaos',rhythm:'neon-ball-storm',
 samuraiduel:'kill-bill-duel',spear:'bug-artillery',reflexrace:'warriors-brawl',spinner:'taskmaster-curling',tug:'taskmaster-sumo'
});
const ORIGINAL_GAMES=new Map(ACTIVE_CATALOG.games.map(g=>[g.id,g]));
const GAME_POOLS=new Map();
function themedChallengeGames(source){const key=normalizeSource(source);if(!GAME_POOLS.has(key))GAME_POOLS.set(key,GAMES.concat(EVENT_GAMES).filter(g=>sourceMatches(g.source,key)&&g.quality==='substantial'&&!g.secret&&g.engine!=='trivia'));return GAME_POOLS.get(key);}
function resolveEncounterGame(id,{source=null,itemId=null}={}) {
 const exact=gameById(id);if(exact)return exact;
 const linked=ENCOUNTER_GAME_LINKS[id]||ITEM_CHALLENGE_LINKS[itemId];
 if(linked)return gameById(linked)||null;
 if(id==='random')return null;
 const old=ORIGINAL_GAMES.get(id);if(!old)return null;
 const themed=themedChallengeGames(source||old.source);
 return themed.length?themed[hash(String(id))%themed.length]:gameById(ENGINE_LINKS[old.engine])||null;
}

Object.assign(exports,{ENCOUNTER_GAME_LINKS,ITEM_CHALLENGE_LINKS,resolveEncounterGame});