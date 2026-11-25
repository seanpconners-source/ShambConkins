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
 ['safe-digits',BOB,'Use each one once. You get one try!',/^Your digits are /i,['safe'],1],
 ['safe-try',BOB,'Let\'s try it...','Let\'s try it…',['safe'],1],
 ['safe-in',BOB,'Two prizes in the safe! The combination is the price of the smaller one.',/^In the safe: /i,['safe'],1],
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
const art=n=>/^(a|an|the) /i.test(n)?n:'a '+n;
for(const [id,name] of [...SP.MID_PRIZES,...SP.GRAND_PRIZES])LINES.push([`its-${id}`,RICH,`It's ${art(name)}!`,`It's ${art(name)}!`,['row'],1]);
for(const [id,name] of SP.GRAND_PRIZES){
 LINES.push([`range-for-${id}`,BOB,`You're playing for ${name}! The range finder covers fifteen hundred dollars. Stop it when you think the price is inside.`,`You're playing for ${name}! The range finder covers $1,500. Stop it when you think the price is inside.`,['range'],1]);
 LINES.push([`cliff-won-${id}`,BOB,`He made it! You win ${name}!`,`He made it! You win ${name}!`,['cliff'],1]);}
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const EXACT=new Map(LINES.filter(l=>typeof l[3]==='string').map(l=>[norm(l[3]),l[0]]));
const PATTERNS=LINES.filter(l=>l[3] instanceof RegExp);
// the line key for a host bubble's text (null = no line for it)
function lineFor(text){const e=EXACT.get(norm(text));if(e)return e;const p=PATTERNS.find(l=>l[3].test(text));return p?p[0]:null;}
// keys a game should load (its own lines + the shared ones)
function linesFor(kind){return LINES.filter(l=>l[4]===ALL||(kind&&l[4].includes(kind))).map(l=>l[0]);}
Object.assign(exports,{LINES,VOICE_MODELS,NAMED,lineFor,linesFor,norm});
