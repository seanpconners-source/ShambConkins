const {CATALOG}=require("src/data/content.js");
const {TACTICAL_ITEMS, CASINO_TRIVIA}=require("src/data/tacticalItems.js");
const {MIGHTY_DUCKS_CHARACTER, MIGHTY_DUCKS_TRIVIA}=require("src/data/mightyDucksPack.js");
const {TRAVEL_ITEMS}=require("src/data/travelItems.js");
const {LAB_CHARACTERS}=require("src/data/savoryLab.js");
const {ADVANCED_TRIVIA}=require("src/data/advancedTrivia.js");
const {EXPANDED_TRIVIA_V42}=require("src/data/expandedTriviaV42.js");
const {PARTY_TRIVIA}=require("src/data/partyTrivia.js");
const {ITEM_PACK_V43}=require("src/data/itemPackV43.js");
const {MOVIE_BOND_CHARACTERS, FACE_PACK_CHARACTERS}=require("src/data/movieBonds.js");
const {NEW_CHARACTERS, HORROR_IDS, PERKS}=require("src/data/legendsPack.js");
const {BOSSES, BOSS_CHARACTERS}=require("src/data/bosses.js");
const {NEW_CHARACTERS2}=require("src/data/legendsPack2.js");
const {LEGENDS_TRIVIA}=require("src/data/legendsTrivia.js");
const {TRIVIA3}=require("src/data/trivia3.js");
const {LEGENDS_ITEMS}=require("src/data/legendsItems.js");
const {POKEMON_CHARACTERS}=require("src/data/pokemonPack.js");
const {PKMN_CATALOG_ITEMS}=require("src/data/pkmnItems.js");
const {balanceItem}=require("src/data/balance.js");
// Preserve the uploaded catalog byte-for-byte. Sean has explicitly disclaimed
// Eugenia, so its inherited character, pass and four cards are inactive.
function activeContent(record){return !/eugenia/i.test([record.id,record.name,record.title,record.source,record.body].filter(Boolean).join(' '));}
function displayReference(record){if(record.source!=='WarGames')return record;return {...record,source:'The Matrix',...(record.name?{name:record.name.replace(/WOPR/g,'Matrix Construct')}:{}),...(record.title?{title:record.title.replace(/WOPR/g,'The Matrix')}:{}),...(record.desc?{desc:record.desc.replace(/WOPR/g,'Matrix')}:{}),...(record.body?{body:record.body.replace(/The WOPR would like to play something less apocalyptic this time\./,'The Matrix has opened a three-in-a-row grid in the Construct.')}: {})};}
const ACTIVE_CATALOG=Object.fromEntries(Object.entries(CATALOG).map(([key,value])=>[key,Array.isArray(value)?value.filter(activeContent).map(row=>key==='characters'&&row.id==='happy-gilmore'?{...row,source:'Happy Gilmore',unlockHint:'Win Happy Gilmore golf to add him to the winner’s roster; his original event card can also find him.'}:['items','cards','games'].includes(key)?displayReference(row):row):value]));
ACTIVE_CATALOG.items.push(...TACTICAL_ITEMS);
ACTIVE_CATALOG.items.push(...TRAVEL_ITEMS);
ACTIVE_CATALOG.items.push(...ITEM_PACK_V43);
ACTIVE_CATALOG.items.push(...LEGENDS_ITEMS);
ACTIVE_CATALOG.items.push(...PKMN_CATALOG_ITEMS);
ACTIVE_CATALOG.trivia.push(...CASINO_TRIVIA);
ACTIVE_CATALOG.items=ACTIVE_CATALOG.items.map(balanceItem);
ACTIVE_CATALOG.characters.push(MIGHTY_DUCKS_CHARACTER);
ACTIVE_CATALOG.characters.push(...LAB_CHARACTERS);
ACTIVE_CATALOG.trivia.push(...MIGHTY_DUCKS_TRIVIA);
ACTIVE_CATALOG.trivia.push(...ADVANCED_TRIVIA);
ACTIVE_CATALOG.trivia.push(...PARTY_TRIVIA,...EXPANDED_TRIVIA_V42,...LEGENDS_TRIVIA,...TRIVIA3);
// Overrides affect the active game only; the uploaded catalog stays intact.
ACTIVE_CATALOG.characters=ACTIVE_CATALOG.characters.map(c=>c.id==='bond'?MOVIE_BOND_CHARACTERS[0]:c.id==='chris-parent'?{...c,name:'Dad · Chris Conners',unlockHint:'Meet Dad at My Parents’ House or a Home encounter.'}:c.id==='angie-parent'?{...c,name:'Mom · Angie Conners',unlockHint:'Meet Mom at My Parents’ House or a Home encounter.'}:c);
ACTIVE_CATALOG.characters.push(...MOVIE_BOND_CHARACTERS.slice(1),...FACE_PACK_CHARACTERS,...NEW_CHARACTERS);
ACTIVE_CATALOG.characters.push(...NEW_CHARACTERS2);
ACTIVE_CATALOG.characters.push(...POKEMON_CHARACTERS);
// KC and Mylo always arrive together (the early family event), never one at a time.
ACTIVE_CATALOG.characters=ACTIVE_CATALOG.characters.map(c=>c.id==='kc'||c.id==='mylo'?{...c,unlockBy:'dogs',unlockHint:'KC and Mylo arrive together early in your first run.'}:c);
// Bosses: characters that only join by beating the boss (boss fights at each level gate and warp zone).
ACTIVE_CATALOG.characters.push(...BOSS_CHARACTERS.filter(r=>!ACTIVE_CATALOG.characters.some(c=>c.id===r[0])).map(([id,name,source,icon,actor,perk,line])=>{const boss=BOSSES.find(b=>b.unlockId===id);return {id,name,source,icon,actor,assetKey:'char:'+id,unlockAt:999,perkType:perk,perk:PERKS[perk],unlockPhrase:line,unlockBy:'boss',unlockHint:`Beat ${boss?boss.name:name} in a boss fight at the end of a level or in a warp zone.`};}));
ACTIVE_CATALOG.characters=ACTIVE_CATALOG.characters.map(c=>c.id==='batman89'?{...c,name:'Batman · Michael Keaton',actor:'Michael Keaton'}:c);
// The horror icons only appear in the Level IV horror route.
ACTIVE_CATALOG.characters=ACTIVE_CATALOG.characters.map(c=>HORROR_IDS.includes(c.id)?{...c,unlockBy:'horror',unlockHint:c.id==='satan'?c.unlockHint:'Only found in the Level IV horror route. Look for their landmark deep in the dark.'}:c);

Object.assign(exports,{activeContent,ACTIVE_CATALOG});