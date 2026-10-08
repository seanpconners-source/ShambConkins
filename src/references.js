const {normalizeSource:normalizeReferenceSource, sourceMatches:referenceSourceMatches, registerReferenceSources, referenceSourceNames}=require("src/referenceSources.js");
const {ACTIVE_CATALOG:CATALOG}=require("src/contentPolicy.js");
const {CHARACTERS, characterIdentity, SPECIAL_UNLOCKS}=require("src/characters.js");
const {GENERIC,registerSourceTypes,venueFor}=require("src/venues.js");
const {ICONIC_PLACES}=require("src/data/iconicPlaces.js");
const {GAMES, EVENT_GAMES}=require("src/gameRegistry.js");
const {resolveEncounterGame}=require("src/encounterGames.js");
const {selectItemDrop}=require("src/itemDrops.js");
const {hash, pick, slug, weighted}=require("src/utils.js");
const {REFERENCE_GROUPS}=require("src/data/referencePack.js");
const {TRIVIA_QUESTIONS}=require("src/triviaCatalog.js");
const {isMovieBond, missingMovieBonds}=require("src/data/movieBonds.js");
// Shared source matching lives below both encounters and their game resolver.
function normalizeSource(source){return normalizeReferenceSource(source);}
function sourceMatches(a,b){return referenceSourceMatches(a,b);}

// Every reference explicitly named in the handoff gets an actual discoverable
// landmark and a playable encounter, including director/performer umbrellas.
// [source, landmark, realm, icon, cameo title, cameo body, effect]
const WORLDS = [
 ['American Psycho','Dorsia Reservation Desk','mind','🪪','A very impressive business card','A reservation, a raised watermark and a visitor with a suspicious number of videotapes.',['points',3]],
 ['Star Trek','Deep Space Nine Promenade','mind','🖖','Replicator negotiation','Quark insists that the replicator is a subscription service. You find a way around his invoice.',['points',3]],
 ['Star Wars','Mos Eisley Cantina','body','🌌','Never tell me the odds','A smuggler finds an improbable route through the traffic. Move forward two spaces.',['move',2]],
 ['South Park','Casa Bonita','mind','🧀','Casa Bonita reservation','The reservation works out. The plan used to obtain it remains deeply questionable.',['points',3]],
 ['Always Sunny','The Gang’s Back Alley','body','🍻','Dayman intervention','The Gang celebrates your victory before checking whether you actually won anything.',['points',3]],
 ['Arrested Development','The Banana Stand','mind','🍌','There is always money','You check the banana stand before somebody has a brilliant idea involving fire.',['points',4]],
 ['Mr. Show','Mr. Show’s Sketch Stage','mind','🎭','The next sketch starts here','Bob and David turn the board meeting into an increasingly elaborate sketch.',['points',3]],
 ['Kids in the Hall','The Kids’ Comedy Club','mind','✂️','I’m crushing your head','A very small head-crushing dispute distracts the entire room. Move back one space.',['move',-1]],
 ['The League','The Shiva Bowl Draft Room','mind','🏈','Shiva Bowl strategy','Your fantasy lineup accidentally contains your actual opponent. The draft is going poorly.',['steal',2]],
 ['Parks and Recreation','Pawnee City Hall','mind','🧇','Treat yourself','Donna and Tom have approved an extremely unnecessary celebration.',['points',4]],
 ['The Office','Schrute Farms','mind','🫜','Assistant to the champion','Dwight has promoted you to an unofficial position with official paperwork.',['points',3]],
 ['Bob’s Burgers','Bob’s Burgers Restaurant','body','🍔','Burger of the board','The special is a pun so bad that the restaurant gives you a loyalty bonus.',['points',3]],
 ['King of the Hill','Strickland Propane','mind','🔥','Propane and propane accessories','Hank approves of your responsible handling of an otherwise ridiculous situation.',['points',3]],
 ['Idiocracy','Brawndo Watering Station','body','🥤','It has electrolytes','The route planner has been replaced by a sports-drink advertisement. Move back two spaces.',['move',-2]],
 ['Starship Troopers','Mobile Infantry Outpost','body','🪲','Service guarantees a shortcut','The Mobile Infantry opens a route. You would like to know where the bugs went first.',['move',2]],
 ['The Fifth Element','Fhloston Paradise','spirit','🪪','Multipass accepted','Leeloo’s multipass works at a checkpoint with no conceivable connection to this board.',['move',2]],
 ['Nirvanna the Band the Show','The Rivoli Loading Door','spirit','🎸','Tonight is finally the night','Matt and Jay have a plan to play the Rivoli. The board is now part of the plan.',['points',3]],
 ['Mrs. Doubtfire','The Hillard Family Kitchen','mind','🫖','Hello, dear','An elaborate disguise buys you enough time to put everything back in order.',['points',3]],
 ['Silent Hill','Silent Hill’s Foggy Streets','spirit','🌫️','The siren sounds','The route disappears into the fog. Something metallic is following you.',['move',-2]],
 ['Metal Gear','Shadow Moses','body','📦','A perfectly ordinary box','You hide in a cardboard box. Everybody politely decides not to ask why it is moving.',['move',2]],
 ['Death Stranding','Bridges Distribution Center','spirit','📦','Keep on keeping on','A delivery connects two isolated stops. Somebody leaves you a reassuring number of likes.',['points',3]],
 ['Resident Evil','Raccoon City Police Station','body','🧟','A suspiciously specific key','The key fits a door nobody should have locked during an outbreak. Move forward two spaces.',['move',2]],
 ['Evil Dead','The Cabin in the Woods','spirit','📖','Do not read it out loud','You read it out loud. Of course you read it out loud.',['points',-3]],
 ['John Carpenter','The Carpenter Midnight Screening','spirit','🕶️','Put on the glasses','The sunglasses expose a suspicious amount of obedience propaganda on the board.',['points',3]],
 ['They Live','The Alley Behind the Broadcast','body','🕶️','All out of bubblegum','You brought the glasses. You forgot the gum. The checkpoint becomes a lengthy argument.',['move',-1]],
 ['Taskmaster','The Taskmaster Caravan','mind','📏','A sealed red envelope','All the information is on the task. Your time starts now.',['task']],
 ['30 Rock','30 Rockefeller Plaza','mind','📺','The page has a plan','Kenneth produces a cheerful itinerary that has somehow survived Jack’s budget cuts.',['move',2]],
 ['Alien','The Nostromo','body','🥚','Motion tracker sweep','The motion tracker found a safer path. You really do not want to inspect the other one.',['move',2]],
 ['Predator','The Jungle Extraction Point','body','🌴','Get to the chopper','The thermal vision makes it very clear that you should keep moving.',['move',2]],
 ['Comedy Bang Bang','The Comedy Bang Bang Studio','mind','🎙️','Character guest arrives','A guest with an increasingly implausible job takes over the interview.',['points',3]],
 ['I Think You Should Leave','The Hot Dog Car Crash','mind','🌭','We are all trying to find the guy','Your entire turn has become a meeting about a problem nobody will admit causing.',['move',-1]],
 ['Curb Your Enthusiasm','Larry’s Country Club','mind','⛳','Pretty, pretty good','A tiny social victory has produced an enormous amount of relief.',['points',3]],
 ['Flight of the Conchords','Murray’s Band Meeting','spirit','🎸','Present','Murray marks you present. That is apparently enough progress for today.',['points',3]],
 ['Garth Marenghi’s Darkplace','Darkplace Hospital','spirit','🏥','A visionary diagnosis','Garth explains the emergency in a voice-over that makes the emergency significantly worse.',['points',-3]],
 ['Human Giant','The Shutterbugs Studio','mind','📸','An impossible audition','The casting brief has become stranger with every sentence. You somehow get the role.',['points',3]],
 ['Review','Forrest’s Review Desk','mind','⭐','Five stars for poor decisions','Forrest insists that the next route must be reviewed from personal experience.',['move',-1]],
 ['Nathan for You','Summit Ice Showroom','mind','🧥','The plan','Nathan has a business solution that is technically functional and socially catastrophic.',['points',3]],
 ['The Rehearsal','The Rehearsal Warehouse','mind','🎬','Practice run','You rehearse the conversation before the conversation. The real checkpoint goes suspiciously smoothly.',['move',2]],
 ['The Traitors','The Round Table','mind','🕯️','Round table suspicion','Nobody can explain the vote, but everybody is extremely confident about it.',['steal',2]],
 ['Vanderpump Rules','SUR Restaurant','mind','🍸','It’s not about the points','The restaurant drama follows you onto the board. It is definitely about the points.',['points',-3]],
 ['Planet Coaster 2','Coaster Construction Gate','body','🎢','A coaster-sized shortcut','The new coaster carries you over a queue with deeply questionable routing.',['move',2]],
 ['Adam Sandler','Happy Gilmore’s Practice Green','body','⛳','The price is points','An aggressively unconventional practice session somehow produces results.',['points',3]],
 ['Ace Ventura','Pet Detective Headquarters','body','🐬','All righty then','A pet detective finds the missing route. Your paperwork is now covered in paw prints.',['move',2]],
 ['Cronenberg','The Videodrome Signal','spirit','📼','Long live the new board','The television signal has started interfering with your inventory and your confidence.',['points',-3]],
 ['Home Alone','The McCallister House','mind','🏠','Keep the change','You spot the traps before walking into them. The Wet Bandits are less observant.',['points',3]],
 ['Jackass','The Stunt Crew’s Lot','body','🛒','Do not try this route at home','The shopping cart shortcut was clearly somebody’s bad idea. It still gets you two spaces ahead.',['move',2]],
 ['The Lonely Island','The Lonely Island Recording Booth','spirit','🎤','A very serious music video','The production budget has been spent on the least necessary part of the video.',['points',3]],
 ['Jay and Silent Bob','The Quick Stop','mind','🏪','Snoochie boardchies','Jay has advice. Silent Bob lets the shortcut speak for itself.',['move',2]],
 ['Mortal Kombat','The Outworld Arena','body','🐉','Finish the paperwork','An intimidating tournament organizer accepts your registration. No fatality is required.',['points',3]],
 ['Troma','Tromaville','body','☢️','Toxic cleanup','Tromaville thanks you for removing something nobody wanted to identify.',['points',3]],
 ['Daft Punk','The Robot Recording Studio','spirit','🤖','One more turn','The robots have turned your detour into a perfectly timed return to the route.',['move',2]],
 ['King Gizzard','The Nonagon Door','spirit','🦎','Nonagon opens the board','The door has opened. It leads somewhere louder and slightly more complicated.',['move',2]],
 ['Osees','The Osees Soundcheck','spirit','🥁','A very loud soundcheck','You find a lost drumstick before the room begins vibrating.',['points',3]],
 ['Jackie Chan','The Ladder Warehouse','body','🪜','A ladder is a route','Jackie turns every object in the warehouse into a useful part of the escape.',['move',2]],
 ['Rambo','The Extraction Camp','body','🏹','A quiet extraction','The escape route is open. Staying behind to ask questions seems unwise.',['move',2]],
 ['Tarantino','The House of Blue Leaves','body','🗡️','A briefcase-sized mystery','Nobody tells you what is in the briefcase, but everybody agrees that finding it matters.',['points',3]],
 ['Wayne’s World','Wayne’s Basement','spirit','🎸','We’re not worthy','The basement broadcast gives your increasingly strange expedition a guest spot.',['points',3]],
 ['Austin Powers','The International Man’s Lounge','body','🕺','Groovy checkpoint','The checkpoint has accepted your credentials and an unnecessary amount of velvet.',['move',2]],
 ['Terminator','Cyberdyne Systems','body','🦾','Come with me if you want to roll','A machine from the future offers an unusually direct evacuation plan.',['move',2]],
 ['Wes Anderson','The Grand Hotel Lobby','mind','🧳','A symmetrical arrival','Your luggage and your route have been arranged with alarming precision.',['points',3]],
 ['Will Ferrell','The Newsroom Break Room','mind','📺','Stay classy','An enthusiastic announcement earns you applause and a formal complaint.',['points',3]],
 ['Zoolander','The Center for Routes','body','👔','The turn is in the computer','The route planner is investigated with remarkable confidence and very little understanding.',['move',-1]],
 ['Jurassic Park','Isla Nublar Visitor Center','body','🦖','Life finds a route','The gate has opened. You would strongly prefer to reach the next stop before the animals do.',['move',2]],
 ['Spielberg','The Adventure Studio Backlot','body','🏺','An adventure-sized detour','A dinosaur warning and an archaeological map point toward the same improbable shortcut.',['move',2]],
 ['Back to the Future','Twin Pines Mall','body','🕰️','Eighty-eight spaces per hour','Doc has modified the route planner. The road briefly belongs to a different decade.',['move',2]],
 ['Coen Brothers','The Coen Brothers’ Diner','mind','☕','A perfectly simple plan','A simple plan has acquired money, a missing object, and several very bad assumptions.',['points',3]],
 ['Superbad','The Convenience Store Checkout','mind','🪪','McLovin’s credentials','The ID is absolutely convincing to somebody who has stopped checking IDs.',['points',3]],
 ['Sean Baker','The Florida Motel Courtyard','mind','🌴','A courtyard-sized adventure','An ordinary afternoon becomes an improvised adventure around the motel.',['points',3]],
 ['Kurosawa','The Seven Samurai Village','body','⚔️','A village worth defending','The village has organized a defense. Your small contribution still counts.',['points',3]],
 ['James Bond','Q Branch','body','🕵️','Do pay attention','Q explains the gadget before you immediately use it for something else. Move forward two spaces.',['move',2]],
 ['The Warriors','Coney Island Station','body','🚇','Come out to play','The route home is open, but every station has become somebody else’s territory.',['move',-1]],
 ['Troy','The Gates of Troy','body','🛡️','A gift horse','The gate staff have questions about the unusually large wooden delivery.',['points',3]],
 ['Fargo','The Snowy Fargo Highway','mind','❄️','Oh, you betcha','A calm conversation resolves a situation that has become considerably less calm.',['points',3]],
 ['The Big Lebowski','The Dude’s Apartment','spirit','🎳','The route really tied the board together','You locate the missing rug and immediately acquire three unrelated problems.',['points',3]],
 ['Area 51','The Area 51 Security Gate','body','🛸','Clearance accepted','A classified checkpoint accepts an ID it really should have examined more closely.',['move',2]],
 ['Mars Attacks!','The Martian Landing Zone','body','🛸','Ack ack','The translator insists this is friendly. The exploding landmark suggests a second opinion.',['points',-3]],
 ['Beetlejuice','The Neitherworld Waiting Room','spirit','🪲','A number has been called','Your appointment in the afterlife is running late. So is every other appointment.',['move',-1]],
 ['Tim Burton','The Burton Moonlit Backlot','spirit','🌙','A very strange neighborhood','A striped suit, a pair of scissors, and a pumpkin king make the route difficult to misidentify.',['points',3]],
 ['Edgar Wright','The Winchester Pub','body','🍺','Wait for all this to roll over','A perfectly timed escape plan begins at the pub and becomes a sequence of terrible coincidences.',['move',2]],
 ['Kavinsky','The Nightcall Highway','spirit','🚘','Nightcall detour','A neon-lit route appears when the city lights fade.',['move',2]],
 ['Skrillex','The Dubstep Loading Dock','spirit','🔊','The drop arrives','You brace for the drop. The loading dock staff are much less prepared.',['points',3]],
 ['Knife Party','The Knife Party Dance Floor','spirit','🔊','Internet friends found the route','The dance floor is crowded. An unexpectedly useful exit opens behind the speakers.',['move',2]],
 ['Zomboy','The Zomboy Sound Booth','spirit','🧟','A bass-sized disturbance','The bass has shaken loose a forgotten prize underneath the booth.',['points',3]],
 ['Tommy Boy','Callahan Auto Parts','body','🚗','A guaranteed sale','The sales pitch goes catastrophically off script. The customer buys anyway.',['points',3]],
 ['Battle Royale','The Battle Royale Classroom','body','🎒','Roll call','The classroom has become a competition with an exceptionally bad rulebook.',['points',-3]],
 ['The Cable Guy','The Cable Installation Van','mind','📺','Free premium channels','The installation includes an invitation you did not request and cannot gracefully decline.',['move',-1]],
 ['Little Shop of Horrors','Mushnik’s Flower Shop','spirit','🪴','Feed me points','The plant has developed expensive tastes and an unsettling amount of confidence.',['points',-3]],
 ['Reno 911!','The Reno Sheriff’s Station','mind','🚓','A remarkably short briefing','The briefing was mostly a dispute about uniforms. Somehow the route is clear.',['move',2]],
 ['Super Troopers','The Highway Patrol Checkpoint','body','🚓','Meow checkpoint','The roadside conversation includes an unusual number of cat noises.',['points',3]],
 ['Crank 2','The High Voltage Substation','body','⚡','Keep the charge moving','The substation has provided a deeply impractical burst of energy.',['move',2]],
 ['Fast & Furious','Toretto’s Garage','body','🏎️','Family route','The garage opens a shortcut. Everybody agrees that it has something to do with family.',['move',2]],
 ['Black Sabbath','The Black Sabbath Rehearsal Room','spirit','🎸','Into the board','A heavy riff marks the beginning of a surprisingly useful journey.',['points',3]],
 ['Sleep','The Dopesmoker Caravan','spirit','🐪','Proceed the route','The caravan has found a slower, stranger, and ultimately rewarding way forward.',['points',3]],
 ['REZN','The REZN Sound Chamber','spirit','🌀','A resonant shortcut','The room shakes. A hidden corridor appears behind the amplifiers.',['move',2]],
 ['Primus','The Primus Bass Workshop','spirit','🎣','A very unusual bass line','The bass workshop has produced a sound and a fishing story nobody can quite explain.',['points',3]],
 ['Buckethead','The Buckethead Workshop','spirit','🪣','A bucket-sized secret','The masked guitarist reveals an unexpected path through the workshop.',['move',2]],
 ['The Mars Volta','The Mars Volta Spiral Stage','spirit','🌀','The chorus is somewhere ahead','The song takes a long detour. Your route finds its way out first.',['points',3]],
 ['Blade','The Vampire Nightclub','body','🗡️','Somebody always tries','Blade opens the exit while somebody attempts another profoundly bad vampire plan.',['move',2]],
 ['The Matrix','The Nebuchadnezzar','spirit','💊','Follow the white rabbit','The route is a simulation. The points are still distressingly important.',['move',2]],
 ['Die Hard','Nakatomi Plaza','body','🏢','Welcome to the party','The elevator is out. The improvised alternative counts as progress.',['move',2]],
 ['Schwarzenegger','The Action Hero Armory','body','💪','I’ll be back on the board','An unmistakable action hero kicks open a route with very little concern for the hinges.',['move',2]],
 ['Jean-Claude Van Damme','The Kumite Training Hall','body','🥋','A split decision','An implausible training routine earns a very plausible tournament bonus.',['points',3]],
 ['Stallone','The Philadelphia Training Steps','body','🥊','One more round','The training climb is over. You celebrate before noticing another flight of stairs.',['points',3]],
 ['Steven Seagal','The Battleship Galley','body','🚢','The cook has clearance','The ship’s cook appears considerably better prepared than the security staff.',['move',2]],
 ['90s Nickelodeon','The Nickelodeon Slime Vault','mind','🟠','An alarming amount of slime','You survive the obstacle course and leave the studio recognizably orange.',['points',3]],
 ['Dragon Ball Z','Capsule Corporation','body','🐉','A capsule-sized shortcut','Bulma’s latest invention takes up very little luggage space and far too much road.',['move',2]],
 ['Hunter × Hunter','Heavens Arena','spirit','🎣','An unusual Nen condition','The condition is strange. The reward is real. You would prefer not to ask Hisoka for advice.',['points',3]],
 ['Kitchen Nightmares','The Kitchen Rescue Pass','body','🍳','Where is the lamb sauce?','Gordon has rescued service, inspected the fridge, and loudly questioned the entire route planner.',['points',3]]
];
for(const group of REFERENCE_GROUPS)if(!WORLDS.some(w=>normalizeSource(w[0])===normalizeSource(group.source)))WORLDS.push([group.source,group.type==='music'?`${group.source} listening booth`:group.type==='game'?`${group.source} arcade night`:group.type==='comedy'||group.type==='cartoon'?`${group.source} studio door`:group.type==='horror'?`${group.source} midnight screening`:`${group.source} crossover stop`,group.realm,group.type==='music'?'🎸':group.type==='horror'?'🎞':group.type==='game'?'🕹':'✦',group.names[0],group.story||`The ${group.source} itinerary includes ${group.names.join(', ')}. The visitor booth awards three points.`,group.effect]);
registerReferenceSources(WORLDS.map(world=>world[0]));
const REQUIRED_REFERENCES = WORLDS.map(w=>w[0]);
const CAMEOS = new Map(WORLDS.map(([source,name,realm,icon,title,body,e])=>[normalizeSource(source),{source,title,body,e,realm,icon,name}]));
const SOURCE_UNIVERSE = [...new Set([...referenceSourceNames(),...REQUIRED_REFERENCES,...GAMES.map(g=>g.source)].map(normalizeSource))].sort((a,b)=>a.localeCompare(b));
const RESERVED_RECRUITS = ['loki'];
const THEMED_RECORDS={characters:CHARACTERS,items:CATALOG.items,games:[...GAMES,...EVENT_GAMES],trivia:TRIVIA_QUESTIONS,cards:CATALOG.cards};
const THEMED_CACHES=new Map();
function sourceEntries(kind,source){
 const canonical=normalizeSource(source);let cache=THEMED_CACHES.get(kind);if(!cache){cache=new Map();THEMED_CACHES.set(kind,cache);}
 if(!cache.has(canonical))cache.set(canonical,THEMED_RECORDS[kind].filter(row=>sourceMatches(row.source,canonical)));
 return cache.get(canonical);
}
function themedCharacters(source,{owned=[],includeSpecial=false}={}) {
 const existing=new Set(owned.map(characterIdentity)),seen=new Set();
 return sourceEntries('characters',source).filter(c=>{const id=characterIdentity(c.id);if(existing.has(id)||seen.has(id)||(!includeSpecial&&(RESERVED_RECRUITS.includes(c.id)||SPECIAL_UNLOCKS.includes(c.unlockBy))))return false;seen.add(id);return true;});
}
function themedItems(source) { return [...sourceEntries('items',source)]; }
function themedGames(source) { return sourceEntries('games',source).filter(game=>!game.secret); }
function themedTrivia(source) { return [...sourceEntries('trivia',source)]; }

const REFERENCE_LANDMARKS = SOURCE_UNIVERSE.filter(source=>!['ShambConkins Horror','Game Mutation'].includes(source)).map(source=>{
 const known=CAMEOS.get(source),realm=known?.realm||['mind','body','spirit'][hash(source)%3];
 return {id:`ref-${slug(source)}`,name:known?.name||`${source} Encounter`,source,realm,icon:known?.icon||'✦',
  characters:themedCharacters(source).map(c=>c.id),description:known?.body||`A ${source} detour has crossed the expedition. A visitor, a recognizable souvenir, or an unexpected challenge could be waiting.`,reference:true};
});
// Replace generic stops ("X studio door", "X crossover stop") with a fitting venue.
registerSourceTypes(REFERENCE_GROUPS.map(g=>[g.source,g.type]));
for(const l of REFERENCE_LANDMARKS){if(!GENERIC.test(l.name))continue;const v=venueFor(l.source);l.name=v.name;l.venue=v.kind;l.icon=v.icon;}
// Board labels: the iconic place from each property (venue art/kind above stays).
for(const l of REFERENCE_LANDMARKS){const iconic=ICONIC_PLACES.get(l.source);if(iconic)l.name=iconic;}


function playableCard(card,source,owned) {
 if(!sourceMatches(card.source,source)||['horror','team','horrorTrap','unlockFeature','unlockDogs'].includes(card.e?.[0]))return null;
 if(card.e?.[0]==='unlockChar'&&((isMovieBond(card.e[1])?!missingMovieBonds(owned).length:owned.some(id=>characterIdentity(id)===characterIdentity(card.e[1])))||RESERVED_RECRUITS.includes(card.e[1])||!CHARACTERS.some(c=>c.id===card.e[1]&&!SPECIAL_UNLOCKS.includes(c.unlockBy))))return null;
 if(['mg','unlockGame','musicGame'].includes(card.e?.[0])&&typeof card.e[1]==='string'){
  const game=resolveEncounterGame(card.e[1],{source});
  if(!game)return null;
  return {...card,e:['mg',game.id],body:`${card.body||card.title} ${game.title} challenges both players.`};
 }
 if(card.e?.[0]==='musicCue')return {...card,body:`${card.title}. A fresh synth cue plays while the expedition keeps moving.`};
 return {...card,e:[...card.e]};
}

// The return value uses the normal applyEvent contract. Character/item cameos
// are actual permanent recruits/inventory drops, not decorative manifest rows.
function selectThemedEncounter(source,{owned=[],items=[],player=null,profile=null,seen=[],triviaSeen=[],realm=null,turn=1,random=Math.random}={}) {
 const canonical=normalizeSource(source),seenSet=new Set(seen),choices=[];
 const recruits=themedCharacters(canonical,{owned});
 if(recruits.length)choices.push({kind:'recruit',weight:3,entries:recruits});
 const souvenirs=themedItems(canonical);
 if(souvenirs.length)choices.push({kind:'item',weight:2,entries:souvenirs});
 const cards=sourceEntries('cards',canonical).filter(c=>(!realm||c.level==='ANY'||c.level?.toLowerCase()===realm)&&(!c.minTurn||turn>=c.minTurn)&&(!c.requiresItem||items.includes(c.requiresItem))).map(c=>playableCard(c,canonical,owned)).filter(Boolean);
 const fresh=cards.filter(c=>!seenSet.has(c.title));
 if(cards.length)choices.push({kind:'card',weight:2,entries:fresh.length?fresh:cards});
 const games=themedGames(canonical);
 if(games.length)choices.push({kind:'game',weight:1,entries:games});
 const quizzes=themedTrivia(canonical),seenQuestions=new Set(triviaSeen);
 const freshQuizzes=quizzes.filter(q=>!seenQuestions.has(q.id));
 if(quizzes.length)choices.push({kind:'trivia',weight:1,entries:freshQuizzes.length?freshQuizzes:quizzes});
 const cameo=CAMEOS.get(canonical);
 // Each named handoff property has its own fallback story even after its entire
 // local roster has joined. Sources with trivia-only content receive a quiz cue.
 if(cameo)choices.push({kind:'cameo',weight:1,entries:[cameo]});
 if(!choices.length){const trivia=themedTrivia(canonical);if(trivia.length){const question=pick(trivia,random);return {kind:'trivia',source:question.source,title:'A familiar question',body:question.q,question,e:['points',2]};}
  return {kind:'cameo',source:canonical,title:`A ${canonical} detour`,body:`A stop from ${canonical} has crossed your route. You find a souvenir from the visit.`,e:['points',3]};}
 const bucket=weighted(choices,random),entry=bucket.kind==='item'?selectItemDrop(bucket.entries,{random,profile,player:player||{items}}):pick(bucket.entries,random);
 if(bucket.kind==='trivia')return {kind:'trivia',source:entry.source,title:`${entry.source} · pop quiz`,body:entry.q,question:entry,e:['points',2]};
 if(bucket.kind==='recruit')return {kind:bucket.kind,source:entry.source,title:isMovieBond(entry.id)?'A new 007 dossier':`Meet ${entry.name}`,body:isMovieBond(entry.id)?'One random movie Bond you have not collected joins your roster. Six agents. No duplicate dossiers.':`${entry.name} from ${entry.source} joins your expedition and remains available in future runs.`,e:['unlockChar',entry.id]};
 if(bucket.kind==='item')return {kind:bucket.kind,source:entry.source,title:entry.name,body:`A recognizable souvenir from ${entry.source}: ${entry.desc}`,e:['item',entry.id]};
 if(bucket.kind==='game')return {kind:bucket.kind,source:entry.source,title:`An unexpected challenge: ${entry.title}`,body:`Both players take part in ${entry.title}.`,e:['mg',entry.id]};
 return {...entry,e:[...entry.e],kind:bucket.kind};
}

// Pick source worlds before cards so an enormous franchise does not bury small
// comedy/music references. A persisted bag visits each world before refilling.
function selectReferenceSource(run,random=Math.random) {
 const eligible=SOURCE_UNIVERSE.filter(source=>!['ShambConkins Horror','Game Mutation'].includes(source));
 const valid=new Set(eligible);run.referenceBag=(run.referenceBag||[]).filter(source=>valid.has(source));
 if(!run.referenceBag.length)run.referenceBag=[...eligible];
 const index=Math.min(run.referenceBag.length-1,Math.floor(random()*run.referenceBag.length));
 return run.referenceBag.splice(index,1)[0];
}

const FORTUNES = {
 bonus:[
  ['Parks and Recreation','Treat yourself','Donna and Tom insist that this stop calls for a celebration.'],
  ['Always Sunny','The ham survived','Against all odds, the Rum Ham has washed safely back ashore.'],
  ['The Office','A Dundie for this route','Michael has invented a category that specifically rewards your last move.'],
  ['The Big Lebowski','The Dude abides','The lost rug has been found. It really did tie the route together.'],
  ['Star Trek','Replicator surplus','A replicator produces an unexpected bonus before Quark can charge for it.'],
  ['Dragon Ball Z','A tiny power-up','Bulma has found a capsule nobody remembered packing.'],
  ['Hunter × Hunter','A successful exam','The examiners approve of an unconventional solution.'],
  ['Arrested Development','Check the banana stand','There is always money in the banana stand. You checked in time.'],
  ['Back to the Future','Great Scott','Doc fixes the timing before your good fortune disappears from the timeline.'],
  ['King Gizzard','The door opens','Nonagon Infinity has opened a surprisingly useful door.'],
  ['30 Rock','Page program bonus','Kenneth is delighted to process a reward that Jack forgot to cancel.'],
  ['Kitchen Nightmares','Service rescued','Gordon finds the lamb sauce and approves one part of your operation.']
 ],
 penalty:[
  ['Seinfeld','No points for you','The soup counter has adopted a very strict board-game policy.'],
  ['The Office','The chili incident','Kevin’s chili has reached the floor and, somehow, your route planner.'],
  ['Always Sunny','The Gang has a plan','The plan has a budget. They have decided that you are paying it.'],
  ['Home Alone','A paint-can appointment','A hanging paint can finds you before you find the staircase.'],
  ['South Park','A terrible Casa Bonita plan','The reservation scheme has acquired consequences.'],
  ['The Matrix','A glitch in the route','The simulation has charged you for a problem it created.'],
  ['Jurassic Park','Objects are closer than they appear','The mirror is correct. The getaway has become expensive.'],
  ['The Traitors','A confident wrong vote','The table has agreed on the wrong suspect with extraordinary confidence.'],
  ['I Think You Should Leave','Nobody will admit causing this','The hot dog car investigation has become your problem.'],
  ['Evil Dead','You read the book','You read the words out loud despite an unreasonable number of warning signs.'],
  ['Garth Marenghi’s Darkplace','An imaginative diagnosis','The hospital bill reflects Garth’s unusually visionary approach to medicine.'],
  ['Mars Attacks!','Ack ack accounting','The Martian translator insists that the destruction is friendly.']
 ]
};
function themedFortune(type,random=Math.random) {
 const pool=FORTUNES[type==='penalty'?'penalty':'bonus'];const [source,title,body]=pick(pool,random);
 return {source,title,body};
}

function referenceCoverage() {
 return SOURCE_UNIVERSE.map(source=>({source,required:REQUIRED_REFERENCES.some(s=>normalizeSource(s)===source),
  aliases:[...new Set(Object.values(CATALOG).flat().filter(e=>e&&typeof e==='object'&&normalizeSource(e.source)===source).map(e=>e.source).filter(Boolean))],
  characters:themedCharacters(source,{includeSpecial:true}).map(c=>c.id),items:themedItems(source).map(i=>i.id),
  cards:CATALOG.cards.filter(c=>sourceMatches(c.source,source)).map(c=>c.title),trivia:themedTrivia(source).length,
  activeGames:themedGames(source).map(g=>g.id),archivedGames:CATALOG.games.filter(g=>sourceMatches(g.source,source)&&!GAMES.some(active=>active.id===g.id)).map(g=>g.id),
  encounter:!['ShambConkins Horror','Game Mutation'].includes(source),landmark:REFERENCE_LANDMARKS.find(l=>l.source===source)?.id||null}));
}

Object.assign(exports,{normalizeSource,sourceMatches,REQUIRED_REFERENCES,SOURCE_UNIVERSE,RESERVED_RECRUITS,themedCharacters,themedItems,themedGames,themedTrivia,REFERENCE_LANDMARKS,selectThemedEncounter,selectReferenceSource,themedFortune,referenceCoverage});