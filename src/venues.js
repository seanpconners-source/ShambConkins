const {hash}=require("src/utils.js");
// Venue archetypes: a place that fits the kind of thing a source is. Generic stops
// ("X studio door", "X crossover stop") become a diner, dive bar, drive-in, dojo...
// [sky, ground, accent] for each scene kind.
const STYLE={
 arcade:['#2a2342','#46327a','#ff5ad1'],diner:['#bfe3ec','#7a8a92','#d6342c'],bar:['#3b2a22','#5a3a2a','#ffdd55'],studio:['#c8d4e6','#6d7a8d','#ff4747'],
 drivein:['#1b2342','#2c2f3a','#ffd36e'],cabin:['#26354a','#1f3b2f','#ffd66e'],graveyard:['#33284a','#2a2438','#e8e6f0'],asylum:['#4a5352','#2b3234','#9fd5df'],
 haunt:['#2a1d38','#1a1022','#ffd66e'],garage:['#d0c9b8','#5a5547','#ffdd55'],festival:['#2a2342','#3b3366','#ff5ad1'],clubhouse:['#a9d8e8','#3f7a46','#ffd66e'],
 playground:['#a9d8e8','#8bbf6a','#53a8e0'],warehouse:['#aeb8c2','#59626b','#ffd35a'],rooftop:['#2a3350','#1f2638','#f6dfa0'],gas:['#f2c98a','#d9a85c','#c9332b'],
 courthouse:['#cdd8e6','#a49d8a','#8a8372'],depot:['#b8d2e6','#5a3a2a','#2d6a9a'],motel:['#2a2342','#a8532f','#ff5a6e'],theater:['#1f1a24','#6b2a3a','#ffd35a'],
 ramen:['#2b2230','#8a5a3a','#e8523f'],shrine:['#cfe0ea','#7d9e83','#d6342c'],laundromat:['#cfe0ea','#3a6b8a','#7fb9d8'],pawn:['#3a3048','#5b4a6b','#ffd35a'],
 convention:['#c9bfe0','#6b4bd6','#ffd35a'],mall:['#d7d2e3','#6b4bd6','#ffffff']
};
// [kind, noun, icon] per source type (picked by a stable hash of the source name).
const BY_TYPE={
 music:[['stage','Basement Show','🎸'],['festival','Festival Field','🎪'],['garage','Rehearsal Garage','🥁'],['theater','Concert Hall','🎤'],['bar','Dive Bar Gig','🍺'],['depot','Tour Bus Depot','🚌']],
 horror:[['drivein','Haunted Drive-In','🎞'],['cabin','Cabin in the Woods','🏚'],['graveyard','Fogbound Cemetery','🪦'],['asylum','Abandoned Asylum','🏥'],['haunt','Haunted Carnival','🎡'],['motel','Roadside Motel','🛏']],
 game:[['arcade','Arcade','🕹'],['arcade','Cartridge Swap Meet','🎮'],['arcade','LAN Party Basement','🖥'],['arcade','Pizza Parlor Cabinet','🍕'],['mall','Mall Food Court','🛍']],
 comedy:[['diner','Diner','🍔'],['bar','Dive Bar','🍺'],['studio','Public-Access Studio','📺'],['laundromat','Laundromat','🧺'],['pawn','Pawn Shop','💎'],['theater','Comedy Club','🎭']],
 cartoon:[['clubhouse','Treehouse Clubhouse','🌳'],['playground','Playground','🛝'],['studio','Cartoon Lot','🎬'],['diner','Sugar Shack Diner','🍬'],['mall','Mall Arcade','🛍']],
 film:[['warehouse','Warehouse','🏭'],['rooftop','Rooftop','🏙'],['gas','Desert Gas Station','⛽'],['courthouse','Courthouse Steps','⚖'],['depot','Train Depot','🚂'],['motel','Roadside Motel','🛏'],['drivein','Drive-In Screening','🎞']],
 director:[['theater','Retrospective Theater','🎞'],['convention','Film Festival','🎬'],['studio','Soundstage','🎥'],['drivein','Drive-In Retrospective','🚗']],
 anime:[['shrine','Hilltop Shrine','⛩'],['ramen','Ramen Stand','🍜'],['arcade','Gacha Arcade','🕹'],['convention','Anime Convention','🎌']],
 character:[['convention','Fan Convention','🎟'],['diner','Meet-and-Greet Diner','🤝'],['mall','Autograph Mall','🛍'],['theater','Premiere Night','🎬']],
 property:[['diner','Diner','🍔'],['studio','Soundstage','🎥'],['bar','Local Bar','🍺'],['convention','Fan Convention','🎟']]
};
// Keyword overrides where the source's own nature is obvious.
const OVERRIDES=[
 [/kitchen|restaurant|burger|pho|banh|food|bob.s|diner|nightmares/i,['diner','Diner','🍔']],
 [/ramen|noodle|hunter|naruto|one punch|samurai|kurosawa|ninja/i,['ramen','Ramen Stand','🍜']],
 [/dragon ball|kumite|bloodsport|karate|kung|mortal kombat|van damme|seagal|jackie chan|kill bill/i,['shrine','Training Dojo','🥋']],
 [/casino|poker|roulette|blackjack|rounders|royale/i,['casino','Casino Floor','♠']],
 [/golf|gilmore|caddyshack|baseball|major league|league|basketball|baseketball/i,['park','Practice Green','⛳']],
 [/hockey|ducks/i,['hockey','Ice Rink','🏒']],
 [/bowling|lebowski|kingpin/i,['bowling','Bowling Alley','🎳']],
 [/fast.*furious|race|racing|kart|trials|crossy|rally|mad max|crank/i,['gas','Race Garage','🏁']],
 [/space|star trek|star wars|alien|mars|moonraker|tron|matrix|fifth element|terminator|robocop|total recall/i,['space','Spaceport','🚀']],
 [/chess|checkers|uno|yahtzee|mancala|guess who|battleship|card|game night|tabletop/i,['pub','Game Night Pub','🎲']],
 [/trivia|jeopardy|millionaire|feud|weakest|quiz/i,['studio','Game Show Set','🎙']],
 [/elm street|halloween|friday the 13th|scream|hellraiser|chain saw|child.s play|candyman|phantasm|evil dead|texas/i,['haunt','Haunted House','🏚']],
 [/stranger things|upside/i,['horror','The Other Side','🌫']]
];
const SOURCE_TYPES=new Map();
const norm=s=>String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
const PRIORITY=['horror','music','anime','game','cartoon','comedy','film','director','location','property','character','item','gag'];
const rank=t=>{const i=PRIORITY.indexOf(t);return i<0?99:i;};
function registerSourceTypes(pairs){for(const [source,type] of pairs){const key=norm(source),have=SOURCE_TYPES.get(key);if(!have||rank(type)<rank(have))SOURCE_TYPES.set(key,type);}}
function sourceType(source){return SOURCE_TYPES.get(norm(source))||'film';}
// Returns {kind,noun,icon,name}. `type` defaults to the registered type of the source.
function venueFor(source,type){
 const t=type||sourceType(source),text=String(source),override=OVERRIDES.find(([re])=>re.test(text));
 const [kind,noun,icon]=override?override[1]:(BY_TYPE[t]||BY_TYPE.film)[hash(text)%(BY_TYPE[t]||BY_TYPE.film).length];
 const name=text.length<=15?`${text} ${noun}`:`${noun}: ${text}`;
 return {kind,noun,icon,name};
}
const GENERIC=/ Encounter$|crossover stop| studio door| arcade night| listening booth| midnight screening|backstage roll call| studio$/i;
Object.assign(exports,{STYLE,BY_TYPE,GENERIC,registerSourceTypes,sourceType,venueFor});
