// THE PRICE IS RIGHT VOICES (owner, Nov 25: "generate all the voice lines needed for the price is right game... real clips from the show
// should take priority, but any spoken lines we don't have we can make"): every line the host says in the pricing games, made with
// fish.audio text-to-speech (free s2.1-pro-free model) in the owner's two picked voices: BOB = Bob Barker, the host; RICH = Rich Fields,
// the show's announcer (come on down, prize descriptions, a new car, the Showcase). Files: assets/music/tpir-v-<key>-<n>.mp3 (n = take),
// made by tools/gameshow/tpir-voice.mjs from this list (it only makes the missing ones). The game: ST.createShowSound().speak(text)
// plays the line whose `match` is the host's speech-bubble text (exact after lowercasing and dropping punctuation, or a RegExp for lines
// with a price or a guest's name in them: those say the part without it). A real recording under the old voice keys (say-*) comes first.
// Row: [key, voice, spoken text, match (string|RegExp|null = only played by key), games (kinds; '*' = every pricing game), takes]
const SP=require("src/data/showPrizes.js");
const BOB='bob',RICH='rich';
const VOICE_MODELS={bob:'ee1f42380e6643059268337f63986907',rich:'936d41f63e424e08bd4bcd1ff8523da4'};
const ALL='*';
// the people the game usually calls by name (the players' default names): their own lines with the name in them
const NAMED=['Sean','Amber'];
const LINES=[
 // ---- the old voice keys (say-*): played by key from the games; v-<key> is the generated stand-in when no real recording is in
 ['say-come-on-down',RICH,'Come on down!',null,ALL,3],
 ['say-next-contestant',RICH,'Come on down! You\'re the next contestant on The Price Is Right!',null,ALL,2],
 ['say-actual-retail-price',BOB,'The actual retail price is...','The actual retail price is...',ALL,2],
 ['say-higher',BOB,'Higher!',null,ALL,3],['say-lower',BOB,'Lower!',null,ALL,3],
 ['say-new-car',RICH,'A new car!',null,ALL,2],
 ['say-winner',BOB,'Congratulations! You won!',null,ALL,2],
 ['say-sorry',BOB,'Oh, I\'m sorry.',null,ALL,2],
 ['say-showcase',RICH,'It\'s time for the Showcase!',null,ALL,1],
 ['say-pet-population',BOB,'Help control the pet population. Have your pets spayed or neutered. Bye-bye, everybody!',null,ALL,1],
 // ---- "let's play" per game (the title card of the pricingKit games; Plinko/Big Wheel/Cliff Hangers/Clock open with their own lines)
 ['lets-range',BOB,'Let\'s play the Range Game!',null,['range'],1],['lets-safe',BOB,'Let\'s play Safe Crackers!',null,['safe'],1],
 ['lets-race',BOB,'Let\'s play the Race Game!',null,['race'],1],['lets-punch',BOB,'Let\'s play Punch-a-Bunch!',null,['punch'],1],
 ['lets-row',BOB,'Let\'s play The Price Is Right!',null,['row'],1],
 // ---- Plinko
 ['plinko-intro-1',BOB,'Here\'s a game a whole lot of people love to watch...','Here\'s a game a whole lot of people love to watch...',['plinko'],1],
 ['plinko-intro-2',BOB,'It\'s Plinko!','It\'s PLINKO!',['plinko'],1],
 ['plinko-price',BOB,'One digit in each price is right. Pick the right one and win a Plinko chip!','One digit in each price is right. Pick the right one and win a Plinko chip!',['plinko'],1],
 ['plinko-drop',BOB,'Drag it along the top and let it go. Right down the middle is ten thousand dollars!','Drag it along the top and let it go. Right down the middle is ten thousand dollars!',['plinko'],1],
 ['plinko-big',BOB,'Ten thousand dollars!','TEN THOUSAND DOLLARS!',['plinko'],2],
 ['plinko-zero',BOB,'Ohhh, nothing on that one.','Ohhh, nothing on that one.',['plinko'],2],
 ['plinko-won',BOB,'You did it! Congratulations!',/^You won \$/i,['plinko'],1],
 ['plinko-none',BOB,'Oh, I\'m sorry. Better luck next time.','Oh, I\'m sorry. Better luck next time.',['plinko','wheel','cliff','clock'],1],
 // ---- The Big Wheel
 ['wheel-intro',BOB,'Time to spin the Big Wheel! Closest to a dollar without going over wins.','Time to spin the big wheel! Closest to a dollar without going over wins.',['wheel'],1],
 ['wheel-around',BOB,'Ooh, it has to go all the way around! Spin it again.','Ooh, it has to go all the way around! Spin it again.',['wheel'],1],
 ['wheel-again',BOB,'Do you want to spin again?',/! Do you want to spin again\?$/i,['wheel'],2],
 ['wheel-dollar',BOB,'A dollar! You win a thousand dollars!','A DOLLAR! You win a thousand dollars!',['wheel'],1],
 ['wheel-over',BOB,'Oh, you went over. I\'m sorry.','Oh, you went over. I\'m sorry.',['wheel'],2],
 ['wheel-wow',BOB,'Unbelievable!','Unbelievable!',['wheel'],2],
 ['wheel-showcase',BOB,'You\'re going to the Showcase!',/, you're going to the Showcase!$/i,['wheel'],1],
 // ---- Cliff Hangers
 ['cliff-rules',BOB,'For every dollar you\'re off, our mountain climber takes one step. Twenty-five steps are safe... one more and he goes right over the cliff!','For every dollar you\'re off, our mountain climber takes one step. Twenty-five steps are safe... one more and he goes right over the cliff!',['cliff'],1],
 ['cliff-cost',BOB,'What do you think it costs?',/What do you think it costs\?$/i,['cliff'],1],
 ['cliff-toes',BOB,'He\'s hanging on by his toenails!','He\'s hanging on by his toenails!',['cliff'],2],
 ['cliff-fell',BOB,'Oh, I\'m sorry. He took a tumble!','Oh, I\'m sorry. He took a tumble!',['cliff'],1],
 // ---- The Clock Game
 ['clock-rules',BOB,'Thirty seconds to price both prizes. Call out a price, I\'ll tell you higher or lower. Win them both, and there\'s a thousand dollars more!','Thirty seconds to price both prizes. Call out a price, I\'ll tell you higher or lower. Win them both and there\'s a thousand dollars more!',['clock'],1],
 ['clock-both',BOB,'You beat the clock! And that\'s a thousand dollars more!','You beat the clock! And that\'s a thousand dollars more!',['clock'],1],
 // ---- the Range Game
 ['range-intro-1',BOB,'The range finder is fifteen hundred dollars wide. It rises up a six thousand dollar price range...','The range finder is $1,500 wide. It rises up a $6,000 price range…',['range'],1],
 ['range-intro-2',BOB,'...and you get ONE chance to stop it. If the actual retail price is inside, you win!','…and you get ONE chance to stop it. If the actual retail price is inside, you win!',['range'],1],
 ['range-see',BOB,'Let\'s see if the actual retail price is in your range...','Let\'s see if the actual retail price is in your range…',['range'],1],
 // ---- Safe Crackers
 ['safe-intro-1',BOB,'Two prizes are going into our safe...','Two prizes are going into our safe…',['safe'],1],
 ['safe-intro-2',BOB,'The combination is the price of the smaller one. Three different digits, one try!','The combination is the price of the smaller one. Three different digits, one try!',['safe'],1],
 ['safe-digits',BOB,'Here are your three digits. Use each one once. You get one try!','Here are your three digits. Use each one once. You get one try!',['safe'],1],
 ['safe-try',BOB,'Let\'s try it...','Let\'s try it…',['safe'],1],
 // ---- the Race Game
 ['race-intro-1',BOB,'Four prizes, four price tags, and forty-five seconds on the clock...','Four prizes, four price tags, and 45 seconds on the clock…',['race'],1],
 ['race-intro-2',BOB,'Pull the lever and the board lights up how many are right. Keep going until you get all four!','Pull the lever and the board lights up how many are right. Keep going until you get all four!',['race'],1],
 ['race-go',BOB,'Four prizes, four price tags, forty-five seconds. Tag them all, pull the lever, and see how many are right!','Four prizes, four price tags, 45 seconds. Tag them all, pull the lever, and see how many are right!',['race'],1],
 // ---- Punch-a-Bunch
 ['punch-intro-1',BOB,'Fifty holes, and one of them is worth twenty-five thousand dollars!','Fifty holes, and one of them is worth $25,000!',['punch'],1],
 ['punch-intro-2',BOB,'Every price you call right, higher or lower, is a punch. Keep what you find, or throw it away and punch again!','Every price you call right, higher or lower, is a punch. Keep what you find, or throw it away and punch again!',['punch'],1],
 ['punch-rules',BOB,'Four prizes. Tell me if the real price is higher or lower, and every right answer is a punch!','Four prizes. Tell me if the real price is higher or lower, and every right answer is a punch!',['punch'],1],
 ['punch-hilo',BOB,'Is it higher, or lower?',/: is it higher or lower than /i,['punch'],2],
 ['punch-earned-1',BOB,'You\'ve earned one punch! Pick a hole, any hole!','You\'ve earned 1 punch! Pick a hole, any hole!',['punch'],1],
 ['punch-earned-2',BOB,'You\'ve earned two punches! Pick a hole, any hole!','You\'ve earned 2 punches! Pick a hole, any hole!',['punch'],1],
 ['punch-earned-3',BOB,'You\'ve earned three punches! Pick a hole, any hole!','You\'ve earned 3 punches! Pick a hole, any hole!',['punch'],1],
 ['punch-earned-4',BOB,'You\'ve earned four punches! Pick a hole, any hole!','You\'ve earned 4 punches! Pick a hole, any hole!',['punch'],1],
 ['punch-keep',BOB,'Keep it, or throw it away and punch again?',/! Keep it, or throw it away and punch again\?$/i,['punch'],2],
 ['punch-last',BOB,'That was your last punch!',/^That was your last punch/i,['punch'],1],
 ['punch-trash',BOB,'Into the trash it goes! Punch again!','Into the trash it goes! Punch again!',['punch'],2],
 // ---- Contestants' Row
 ['row-first',BOB,'Here\'s the first item up for bids!','Here\'s the first item up for bids!',['row'],1],
 ['row-next',BOB,'Here\'s the next item up for bids!','Here\'s the next item up for bids!',['row'],1],
 ['row-bid',BOB,'What\'s your bid?',/, what's your bid\?$/i,['row'],3],
 ['row-up',BOB,'Come on up here!',/, come on up here!$/i,['row'],2],
 ['row-over',BOB,'Everybody\'s over! You\'ll all have to bid again.',null,['row'],1],
 ['row-perfect',BOB,'A perfect bid! That\'s five hundred dollars more!',null,['row'],1],
];
// with the players' names (exact text wins over the generic version above)
for(const n of NAMED){const k=n.toLowerCase();
 LINES.push([`row-bid-${k}`,BOB,`${n}, what's your bid?`,`${n}, what's your bid?`,['row'],1],[`row-up-${k}`,BOB,`${n}, come on up here!`,`${n}, come on up here!`,['row'],1],
  [`down-${k}`,RICH,`${n}, come on down!`,null,['row','plinko'],1],[`wheel-showcase-${k}`,BOB,`${n}, you're going to the Showcase!`,`${n}, you're going to the Showcase!`,['wheel'],1]);}
// the prizes: the announcer presents each one on Contestants' Row ("It's a ...!"), the host names the grand prizes in the Range Game
// and Cliff Hangers (the text is built exactly the way those games build their bubbles)
// the article the announcer puts before a prize: none for 'two kayaks', 'his and hers...', '6 rolls'; 'an' before a vowel sound
const PLURAL=/\b(AirPods|boots|shoes|pillows|headphones|earbuds|sunglasses|stools|jackets|watches|dumbbells|film|batteries|towels|coats|kayaks|bikes|clubs|crayons|cookies|wipes|beans|crackers|oats|bars|chairs|beds|snowmobiles|bottles|cans|jars|rolls|boxes|packs|pods|capsules|toys)\b/i,
 KIT=/\b(set|kit|combo|bag|bed|table|machine|cabinet|system|pack|package|tracker|tree|brush|hoop)\b/i;
const art=n=>/^(a|an|the|two|three|four|five|six|his|her|pair|\d)[ -]/i.test(n)||/^\d/.test(n)||(PLURAL.test(n)&&!KIT.test(n))?n:(/^(?:[aeio]|u(?!ni|s[aeiou])|hono|heir|LG|MX|F-|S2|RZR|NFL|NBA|R2)/i.test(n)?'an ':'a ')+n;
// "It's a ...!": the announcer presents a prize (Contestants' Row, the episode's prizes and showcases): one line per catalog prize
for(const [id,name] of [...SP.BID_PRIZES,...SP.MID_PRIZES,...SP.GRAND_PRIZES,...SP.CARS,...SP.TRIPS,...SP.BIG])LINES.push([`its-${id}`,RICH,`It's ${art(name)}!`,`It's ${art(name)}!`,['prize'],1]);
// PRIZE NAMES IN THE HOST'S SENTENCES (owner, Nov 26: hundreds of prizes): a bubble with a prize name in it is said in pieces, the host's
// words around it (p-*) + the name on its own (pn-<id>), played back to back (stage.js speak -> partsFor). One clip per prize instead of
// one per sentence and prize (Safe Crackers alone would need thousands).
for(const [id,name] of [...SP.PRIZES,...SP.MID_PRIZES,...SP.GRAND_PRIZES,...SP.CARS,...SP.TRIPS,...SP.BIG,...SP.BID_PRIZES])LINES.push([`pn-${id}`,BOB,`${name}.`,null,['prize'],1]);
LINES.push(['p-safe-in',BOB,'In the safe...',null,['safe'],1],['p-and',BOB,'and...',null,ALL,1],['p-safe-combo',BOB,'The combination is the price of the...',null,['safe'],1],
 ['p-range-for',BOB,'You\'re playing for...',null,['range'],1],['p-range-rest',BOB,'The range finder covers fifteen hundred dollars. Stop it when you think the price is inside.',null,['range'],1],
 ['p-cliff-won',BOB,'He made it! You win...',null,['cliff'],1],['p-cliff-first',BOB,'First prize...',null,['cliff'],1],['p-cliff-next',BOB,'Next...',null,['cliff'],1],['p-cliff-last',BOB,'Last one...',null,['cliff'],1]);
// ---- THE EPISODE (owner, Nov 26: a whole show like the real one, src/engines/tpir/episode.js): the open, the host's entrance and banter,
// the commercial break, the Showcase, the family, the sign-off, the credits. Said in the bubble text exactly (match = text).
LINES.push(
 ['ep-intro-1',RICH,"Here it comes! From Hollywood! The Price Is Right!","Here it comes! From Hollywood! The Price Is Right!",['episode'],1],
 ['ep-first-four',RICH,"You're the first four contestants on The Price Is Right!","You're the first four contestants on The Price Is Right!",['episode'],1],
 ['ep-star',RICH,"And now, here's the star of our show... Bob Barker!","And now, here's the star of our show... Bob Barker!",['episode'],1],
 ['ep-welcome-1',BOB,"Thank you, thank you! Hello everybody, and welcome to The Price Is Right!","Thank you, thank you! Hello everybody, and welcome to The Price Is Right!",['episode'],1],
 ['ep-welcome-2',BOB,"Thank you very much! Hi everybody! Welcome to The Price Is Right!","Thank you very much! Hi everybody! Welcome to The Price Is Right!",['episode'],1],
 ['ep-welcome-3',BOB,"Thank you! Oh, what a nice welcome. Welcome to The Price Is Right!","Thank you! Oh, what a nice welcome. Welcome to The Price Is Right!",['episode'],1],
 ['ep-welcome-tail',BOB,"We have a lot of prizes to give away today, so let's get right to it!","We have a lot of prizes to give away today, so let's get right to it!",['episode'],1],
 ['ep-ann-banter-1',RICH,"Bob, you look fantastic today!","Bob, you look fantastic today!",['episode'],1],
 ['ep-host-banter-1',BOB,"Thank you. I've been told it's the lighting.","Thank you. I've been told it's the lighting.",['episode'],1],
 ['ep-ann-banter-2',RICH,"Great crowd today, Bob!","Great crowd today, Bob!",['episode'],1],
 ['ep-host-banter-2',BOB,"They sure are. Some of them have been waiting outside since four in the morning!","They sure are. Some of them have been waiting outside since four in the morning!",['episode'],1],
 ['ep-ann-banter-3',RICH,"Bob, I brought you a little something.","Bob, I brought you a little something.",['episode'],1],
 ['ep-host-banter-3',BOB,"Is it a new car? ... It's not a new car.","Is it a new car? ... It's not a new car.",['episode'],1],
 ['ep-come-up-1',BOB,"Come on up here!","Come on up here!",['episode'],1],
 ['ep-come-up-2',BOB,"Come on up and join me!","Come on up and join me!",['episode'],1],
 ['ep-come-up-3',BOB,"Come on up!","Come on up!",['episode'],1],
 ['ep-hi-1',BOB,"Hi! How are you? Where are you from?","Hi! How are you? Where are you from?",['episode'],1],
 ['ep-hi-2',BOB,"Hello! Tell everybody where you're from.","Hello! Tell everybody where you're from.",['episode'],1],
 ['ep-hi-3',BOB,"Hi there! And where are you from?","Hi there! And where are you from?",['episode'],1],
 ['ep-p-banter-1',BOB,"I understand you brought your whole family with you today.","I understand you brought your whole family with you today.",['episode'],1],
 ['ep-p-banter-2',BOB,"I like your T-shirt!","I like your T-shirt!",['episode'],1],
 ['ep-p-banter-3',BOB,"You look like you've been waiting your whole life for this!","You look like you've been waiting your whole life for this!",['episode'],1],
 ['ep-p-banter-4',BOB,"Are you nervous? Don't be nervous. It's only money.","Are you nervous? Don't be nervous. It's only money.",['episode'],1],
 ['ep-p-banter-5',BOB,"You were jumping so high, I thought you'd hit the lights!","You were jumping so high, I thought you'd hit the lights!",['episode'],1],
 ['ep-p-banter-6',BOB,"Well, it's nice to have you here.","Well, it's nice to have you here.",['episode'],1],
 ['ep-break-1',BOB,"Stay with us! We'll be right back after this.","Stay with us! We'll be right back after this.",['episode'],1],
 ['ep-break-2',BOB,"Don't go away! We'll be right back.","Don't go away! We'll be right back.",['episode'],1],
 ['ep-back',BOB,"Welcome back to The Price Is Right!","Welcome back to The Price Is Right!",['episode'],1],
 ['ep-ad-fightmilk-1',RICH,"Are you a bodyguard? Do you want to fight like a crow?","Are you a bodyguard? Do you want to fight like a crow?",['episode'],1],
 ['ep-ad-fightmilk-2',RICH,"Fight Milk! The first alcoholic, dairy based protein drink, for bodyguards, by bodyguards.","Fight Milk! The first alcoholic, dairy based protein drink, for bodyguards, by bodyguards.",['episode'],1],
 ['ep-ad-fightmilk-3',RICH,"Available today, at your local store. Look in the aisle where you buy your milk!","Available today, at your local store. Look in the aisle where you buy your milk!",['episode'],1],
 ['ep-ad-brawndo-1',RICH,"Brawndo! The Thirst Mutilator!","Brawndo! The Thirst Mutilator!",['episode'],1],
 ['ep-ad-brawndo-2',RICH,"It's got what plants crave. It's got electrolytes!","It's got what plants crave. It's got electrolytes!",['episode'],1],
 ['ep-ad-brawndo-3',RICH,"Brawndo. Available today, at your local store!","Brawndo. Available today, at your local store!",['episode'],1],
 ['ep-ad-rumham-1',RICH,"Planning a day at the beach? Don't forget the Rum Ham!","Planning a day at the beach? Don't forget the Rum Ham!",['episode'],1],
 ['ep-ad-rumham-2',RICH,"A whole ham, soaked in a bath of rum. It's a meal and a party, all in one!","A whole ham, soaked in a bath of rum. It's a meal and a party, all in one!",['episode'],1],
 ['ep-ad-rumham-3',RICH,"Rum Ham! Available today, at Paddy's Pub. Look in the aisle where you buy your ham.","Rum Ham! Available today, at Paddy's Pub. Look in the aisle where you buy your ham.",['episode'],1],
 ['ep-sc-1',BOB,"It's time for the Showcase!","It's time for the Showcase!",['episode'],1],
 ['ep-sc-2',BOB,"You were our top winner on the wheel, so you decide. Do you want to bid on this first showcase, or pass it?","You were our top winner on the wheel, so you decide. Do you want to bid on this first showcase, or pass it?",['episode'],1],
 ['ep-sc-pass',BOB,"You'll pass it.","You'll pass it.",['episode'],1],
 ['ep-sc-bid',BOB,"You'll bid on it.","You'll bid on it.",['episode'],1],
 ['ep-sc-here',BOB,"Here's your showcase!","Here's your showcase!",['episode'],1],
 ['ep-sc-bid-ask',BOB,"Take your time, and give me your bid.","Take your time, and give me your bid.",['episode'],1],
 ['ep-sc-reveal',BOB,"Let's find out the actual retail prices of these showcases.","Let's find out the actual retail prices of these showcases.",['episode'],1],
 ['ep-sc-yours',BOB,"The actual retail price of your showcase is...","The actual retail price of your showcase is...",['episode'],1],
 ['ep-sc-over',BOB,"Oh, you overbid.","Oh, you overbid.",['episode'],1],
 ['ep-sc-closer',BOB,"You were closer. You win your showcase!","You were closer. You win your showcase!",['episode'],1],
 ['ep-sc-both',BOB,"You were within two hundred fifty dollars! You win both showcases!","You were within two hundred fifty dollars! You win both showcases!",['episode'],1],
 ['ep-sc-nobody',BOB,"Oh, you both overbid! Nobody wins a showcase today.","Oh, you both overbid! Nobody wins a showcase today.",['episode'],1],
 ['ep-family',BOB,"Come on, everybody! Come on down here!","Come on, everybody! Come on down here!",['episode'],1],
 ['ep-signoff',BOB,"This is Bob Barker, reminding you: help control the pet population. Have your pets spayed or neutered. Bye bye, everybody!","This is Bob Barker, reminding you: help control the pet population. Have your pets spayed or neutered. Bye bye, everybody!",['episode'],1],
 ['ep-credits-1',RICH,"The Price Is Right is a ShambConkins production.","The Price Is Right is a ShambConkins production.",['episode'],1],
 ['ep-credits-2',RICH,"Promotional consideration furnished by Fight Milk, Brawndo the Thirst Mutilator, and Paddy's Pub. Prizes described by your announcer.","Promotional consideration furnished by Fight Milk, Brawndo the Thirst Mutilator, and Paddy's Pub. Prizes described by your announcer.",['episode'],1],
 ['ep-tally',RICH,"Let's see how everybody did today!","Let's see how everybody did today!",['episode'],1],
 ['ep-tally-win',RICH,"Today's big winner...","Today's big winner...",['episode'],1],
 ['ep-pick-1',RICH,"It's The Price Is Right, game time! Pick a game and play along!","It's The Price Is Right, game time! Pick a game and play along!",['episode'],1],
 ['ep-sc-all-yours',RICH,'And it can all be yours... if the price is right!','And it can all be yours... if the price is right!',['episode'],1],
 ['ep-sc-two',BOB,'Here\'s the second showcase!','Here\'s the second showcase!',['episode'],1],
 ['ep-car-1',RICH,'A NEW CAR!','A NEW CAR!',['episode'],2]);
// the showcases' set-ups (the announcer's skit): sci-<id>
for(const sc of SP.SHOWCASES)LINES.push([`sci-${sc.id}`,RICH,sc.intro,sc.intro,['prize'],1]);
// CALL-DOWNS BY NAME (owner, Nov 26: every character's name said by the announcer): "<Name>, come on down!" -> dn-<character id>.
// Not in LINES (the game looks the key up by id); the voice tool makes one per character (nameLines) and again for new characters.
function nameLines(){const cs=require("src/contentPolicy.js").ACTIVE_CATALOG.characters;
 return cs.filter(c=>c.name).map(c=>[`dn-${c.id}`,RICH,`${String(c.name).split(/\s+[·\/]\s+/)[0].replace(/\s*\(.*?\)\s*/g,' ').trim()}, come on down!`,null,['named'],1]);}

const NAME_ID=new Map();for(const r of SP.ALL)if(!NAME_ID.has(r[1].toLowerCase()))NAME_ID.set(r[1].toLowerCase(),r[0]);
for(const r of SP.CARS)NAME_ID.set(('a new '+r[1]).toLowerCase(),r[0]);
const pn=name=>{const id=NAME_ID.get(String(name).toLowerCase().trim());return id?'pn-'+id:null;};
// sentence templates: regex -> parts (a string = a p-* key; a number = that capture is a prize name)
const PARTS=[[/^In the safe: (.+) and (.+)! The combination is the price of the (.+)\.$/,['p-safe-in',1,'p-and',2,'p-safe-combo',3]],
 [/^You're playing for (.+)! The range finder covers \$1,500\. Stop it when you think the price is inside\.$/,['p-range-for',1,'p-range-rest']],
 [/^He made it! You win (.+)!$/,['p-cliff-won',1]],[/^First prize: (.+)\. What do you think it costs\?$/,['p-cliff-first',1,'cliff-cost']],
 [/^Next: (.+)\.$/,['p-cliff-next',1]],[/^Last one: (.+)\. He's on step \d+\.$/,['p-cliff-last',1]]];
// the keys to say a bubble in pieces (null = no template fits, or a name with no clip)
function partsFor(text){for(const [re,parts] of PARTS){const m=String(text).match(re);if(!m)continue;const out=[];for(const q of parts){const k=typeof q==='number'?pn(m[q]):q;if(!k)return null;out.push(k);}return out;}return null;}
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const EXACT=new Map(LINES.filter(l=>typeof l[3]==='string').map(l=>[norm(l[3]),l[0]]));
const PATTERNS=LINES.filter(l=>l[3] instanceof RegExp);
// the line key for a host bubble's text (null = no line for it)
function lineFor(text){const e=EXACT.get(norm(text));if(e)return e;const p=PATTERNS.find(l=>l[3].test(text));return p?p[0]:null;}
// keys a game should load (its own lines + the shared ones)
function linesFor(kind){return LINES.filter(l=>l[4]===ALL||(kind&&l[4].includes(kind))).map(l=>l[0]);}
Object.assign(exports,{LINES,VOICE_MODELS,NAMED,lineFor,linesFor,partsFor,pn,art,norm,nameLines});
