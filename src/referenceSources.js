const {ACTIVE_CATALOG:CATALOG}=require("src/contentPolicy.js");
// Keep the original display names on the content itself. These names unify the
// inconsistent catalog spellings only when matching encounters and unlocks.
const key = source => String(source || '').normalize('NFKC').replace(/[’‘]/g, "'").replace(/×/g, 'x').replace(/\s+/g, ' ').trim().toLowerCase();
const ALIASES = {
 wargames:'The Matrix',
 "bob's burgers": 'Bob’s Burgers', "wayne's world": 'Wayne’s World',
 'star trek: the next generation': 'Star Trek', 'garth marenghi': 'Garth Marenghi’s Darkplace', darkplace: 'Garth Marenghi’s Darkplace',
 'garth marenghi\'s darkplace': 'Garth Marenghi’s Darkplace', 'curb': 'Curb Your Enthusiasm',
 'tim robinson': 'I Think You Should Leave', 'hunter x hunter': 'Hunter × Hunter',
 'nirvanna the band the show/movie': 'Nirvanna the Band the Show',
 'jay & silent bob': 'Jay and Silent Bob', 'lonely island': 'The Lonely Island',
 traitors: 'The Traitors', 'fifth element': 'The Fifth Element', 'tarantino-ish': 'Tarantino',
 'kill bill / tarantino': 'Tarantino', 'goldeneye / james bond': 'James Bond', 'goldeneye 007': 'GoldenEye',
 'super mario bros.': 'Super Mario', 'super mario': 'Super Mario', 'mario kart': 'Super Mario',
 'seinfeld / frogger': 'Seinfeld', 'resident evil 2': 'Resident Evil', 'resident evil 3': 'Resident Evil', 'silent hill 2': 'Silent Hill',
 'nathan for you / dumas': 'Nathan for You', 'taskmaster-ish nonsense': 'Taskmaster',
 'the office / arcade break-room nonsense': 'The Office',
 'the rivoli / local gig nonsense': 'Nirvanna the Band the Show', 'the rivoli': 'Nirvanna the Band the Show',
 'toxic avenger': 'The Toxic Avenger', 'tron / daft punk': 'Daft Punk', 'daft punk / tron': 'Daft Punk',
 'reno 911': 'Reno 911!', 'indiana jones / spielberg': 'Spielberg', 'baseketball / matt & trey': 'Matt & Trey',
 'the breakfast club / john hughes': 'The Breakfast Club',
 'teenage mutant ninja turtles / mario bros.-style': 'Teenage Mutant Ninja Turtles',
 'chicago / 80s movie chaos': 'Chicago, Illinois', indianapolis: 'Indianapolis, Indiana',
 'yachty / yahtzee-style': 'Yachty', 'house favorite': 'House Favorite',
 'classic arcade': 'Arcade', 'arcade gear': 'Arcade', 'arcade plumbing': 'Arcade',
 'classic phone game': 'Arcade', 'fixed-shooter tribute': 'Arcade', 'paper-delivery arcade tribute': 'Arcade', 'mobile-game tribute': 'Arcade',
 'card table': 'Casino', 'poker-ish': 'Casino', 'casino night': 'Casino',
 'home pack': 'Home', mylo: 'Home', kc: 'Home', loki: 'Home',
 'gordon ramsey': 'Kitchen Nightmares', 'gordon ramsay': 'Kitchen Nightmares'
};
const DISPLAY_NAMES = new Map([...Object.values(CATALOG).flat().filter(e => e && typeof e === 'object').map(e => e.source), ...Object.values(ALIASES)].filter(Boolean).map(s => [key(s), s]));
const SOURCE_CACHE = new Map();
function normalizeSource(source) {
 const raw=String(source||'ShambConkins');if(SOURCE_CACHE.has(raw))return SOURCE_CACHE.get(raw);
 const normalized=ALIASES[key(raw)]||DISPLAY_NAMES.get(key(raw))||raw.trim();SOURCE_CACHE.set(raw,normalized);return normalized;
}

// An umbrella can find its films/shows without treating every sibling property
// as the same theme. An Alien encounter stays Alien; a Spielberg stop can draw
// from both Jurassic Park and Indiana Jones.
const FAMILIES = {
 'James Bond': ['Goldfinger','GoldenEye','Thunderball','Casino Royale','The Spy Who Loved Me','The Man with the Golden Gun','Dr. No','Skyfall'],
 '90s Nickelodeon': ['Rugrats','Hey Arnold!',"Rocko's Modern Life",'Ren & Stimpy','Doug','Aaahh!!! Real Monsters','Kenan & Kel','Clarissa Explains It All','The Adventures of Pete & Pete','Legends of the Hidden Temple','Double Dare','Nickelodeon GUTS','Are You Afraid of the Dark?','Salute Your Shorts','Hey Dude'],
 Alien: ['Aliens'], 'Evil Dead': ['Army of Darkness'],
 Troma: ['The Toxic Avenger',"Class of Nuke 'Em High"],
 'Adam Sandler': ['Happy Gilmore'],
 'John Carpenter': ['They Live','The Thing','Halloween'],
 Cronenberg: ['The Fly','Videodrome'],
 'Tim Burton': ['Beetlejuice','Edward Scissorhands','The Nightmare Before Christmas','Batman (1989)','Batman Returns',"Pee-wee's Big Adventure"],
 'Edgar Wright': ['Shaun of the Dead','Hot Fuzz','Scott Pilgrim','Baby Driver',"The World's End"],
 'Coen Brothers': ['Fargo','The Big Lebowski','No Country for Old Men','Raising Arizona','O Brother, Where Art Thou?','The Hudsucker Proxy','The Ballad of Buster Scruggs','Barton Fink','A Serious Man'],
 'Sean Baker': ['Anora','Red Rocket','The Florida Project'],
 Kurosawa: ['Yojimbo / Sanjuro','Seven Samurai','Rashomon','Throne of Blood'],
 Tarantino: ['Kill Bill / Tarantino'], Spielberg: ['Jurassic Park','Indiana Jones / Spielberg'],
 'John Hughes': ['Home Alone','Home Alone 2','The Breakfast Club','Sixteen Candles','Pretty in Pink','Planes, Trains and Automobiles','Uncle Buck','Ferris Bueller’s Day Off'],
 Schwarzenegger: ['Terminator','Predator','Commando','Action Icons'],
 'Jean-Claude Van Damme': ['Bloodsport','Action Icons'], Stallone: ['Rambo','Rocky','Action Icons'], 'Steven Seagal': ['Under Siege','Action Icons'],
 'Matt & Trey': ['South Park','BASEketball / Matt & Trey'],
 'I Think You Should Leave': ['The Chair Company','Friendship'],
 'Tim and Eric': ['Tim and Eric / Check It Out!'],
 'Zach Cregger-ish': ['Barbarian','Bring Her Back'],
 'Daft Punk': ['TRON / Daft Punk','Daft Punk / TRON'],
 Skrillex: ['Music','Kavinsky / Skrillex / Knife Party / Zomboy'],
 Kavinsky: ['Kavinsky / Skrillex / Knife Party / Zomboy'],
 'Knife Party': ['Kavinsky / Skrillex / Knife Party / Zomboy'], Zomboy: ['Kavinsky / Skrillex / Knife Party / Zomboy']
};
const FAMILY_MEMBERS = new Map(Object.entries(FAMILIES).map(([source,members])=>[normalizeSource(source),new Set(members.map(normalizeSource))]));
function sourceMatches(a,b) {
 const left=normalizeSource(a),right=normalizeSource(b);
 return left===right || !!FAMILY_MEMBERS.get(left)?.has(right) || !!FAMILY_MEMBERS.get(right)?.has(left)
  || (left.includes(' / ') && left.split(' / ').some(s=>normalizeSource(s)===right))
  || (right.includes(' / ') && right.split(' / ').some(s=>normalizeSource(s)===left));
}

function registerReferenceSources(sources){for(const source of sources)DISPLAY_NAMES.set(key(source),source);SOURCE_CACHE.clear();}
function referenceSourceNames(){return [...DISPLAY_NAMES.values()];}

Object.assign(exports,{normalizeSource,sourceMatches,registerReferenceSources,referenceSourceNames});