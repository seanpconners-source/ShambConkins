// Additive supplies inspired by the uploaded item cabinet and requested worlds.
// Runtime behavior is implemented in items.js; original records stay intact.
const items=[];
const descriptions={
 bestDie:()=> 'This roll uses two dice and keeps the higher. A Lucky Roll does not add a third die.',
 badDie:()=> 'Your opponent’s next roll uses two dice and keeps the lower. Their Lucky Roll cancels this jinx. An attack ward blocks it.',
 capDie:v=> `Cap your opponent’s next base die at ${v}; bonuses still apply. An attack ward blocks it.`,
 reverseDie:()=> 'Reverse this roll’s dice: 1 becomes 6, 2 becomes 5, and 3 becomes 4 (and vice versa). Bonuses still apply.',
 fixedDie:v=> `Set your next base die to ${v}; an opponent’s die cap still applies. Movement bonuses and slowdowns still apply.`,
 mirrorDie:()=> 'Copy your opponent’s last base die for this roll; use 4 if they have not rolled yet. Bonuses still apply.',
 cache:v=> `Find ${v} different supplies, favoring items you have not found. This uses your one item action; use the finds on later turns.`,
 chooseSupply:()=> 'Preview three different supplies and choose one. Your crate and item action are spent only after you choose.',
 itemRaid:()=> 'Take a random item from your opponent’s bag, favoring one you do not carry. An attack ward blocks it. Keep this item if their bag is empty.',
 clearTraps:()=> 'Remove all hostile traps in your current realm and gain one penalty shield.',
 repairPath:()=> 'Permanently repair the nearest reachable barrier in this realm for both players. If none needs repair, gain one single-crossing pass.',
 trailPass:()=> 'Gain one pass through any locked, broken, flooded or other blocked path. Spend it at a crossing; the obstacle remains for your opponent.',
 investment:v=> `Bank up to ${v} of your points. At your next personal turn, get the deposit back plus 2. It is protected while banked; unfinished deposits pay at the expedition’s end. Keep this item if you have no points.`,
 collectionBonus:()=> 'Gain one point for each different remaining item in your bag, with a minimum of 2 and a maximum of 8.',
 bounty:v=> `Your next completed board minigame pays ${v} extra points even if you lose or tie.`,
 recruitBeacon:()=> 'Your next individual board minigame win with an eligible guest guarantees a new personal recruit. Losses, ties and practice keep the beacon; special unlock conditions still apply.',
 gamble:v=> `Flip a coin: 50% chance to gain ${v} points; otherwise lose up to ${Math.ceil(v/2)} points. Shields do not cover this voluntary gamble.`,
 gateDividend:v=> `Gain ${v} extra points when you next clear an uncleared realm.`,
 strongTrap:v=> `Plant a ${v}-point trap here for your opponent. A penalty shield or cloak blocks the loss.`,
 pushOther:v=> `Push your opponent back up to ${v} visited spaces. An attack ward blocks it.`,
 forward:v=> `Move forward ${v} spaces, then roll normally. Only your dice landing triggers an encounter.`,
 ward:v=> `Block the next ${v} opponent item attacks.`,
 cloak:v=> `Avoid point penalties for ${v} of your personal turns.`,
 rollFloor:v=> `Your base die is at least ${v} this turn.`,
 rollDouble:()=> 'Double this roll’s movement.',
 double:()=> 'Double the base reward of your next winning minigame.',
 catchup:()=> 'Gain +4 movement this roll when behind in points; otherwise +2.',
 preview:()=> 'Reveal the current realm and gain one Lucky Roll.'
};
function bundleDescription(e){return [e.cleanse?'Clear half-roll effects, lower-die jinxes and die caps.':'',e.points?`${e.points>0?'Gain':'Pay'} ${Math.abs(e.points)} points.`:'',e.boost?`This roll +${e.boost}.`:'',e.shields?`${e.shields} penalty shield${e.shields>1?'s':''}.`:'',e.ward?`${e.ward} attack ward${e.ward>1?'s':''}.`:'',e.cloak?`Avoid penalties for ${e.cloak} personal turns.`:'',e.rerolls?`Gain ${e.rerolls} Lucky Roll${e.rerolls>1?'s':''}.`:'',e.rewardBonus?`Next minigame reward +${e.rewardBonus}.`:'',e.rollFloor?`This base die is at least ${e.rollFloor}.`:'',e.rollDouble?'Double this roll’s movement.':'',e.bestDie?'Keep the better of two dice this roll.':'',e.gateDividend?`Next realm clear +${e.gateDividend} points.`:'',e.recruitBonus?'Increased guest recruitment odds after your next win.':'',e.giftBoost?`Your opponent also gains +${e.giftBoost} on their next roll.`:'',e.slow?`Half movement for ${e.slow} roll${e.slow>1?'s':''}.`:'',e.slowAfterRoll?'Halve your following roll.':''].filter(Boolean).join(' ');}
function packItems(source,rows,prefix='v43-'){const out=[];for(const[id,name,icon,kind,payload=1,role]of rows){const effects=kind==='bundle'?payload:null,value=effects?1:payload;out.push({id:prefix+id,name,source,icon,kind,value,role:role||(effects?(effects.boost||effects.rollFloor||effects.rollDouble||effects.bestDie?'movement':effects.rewardBonus||effects.gateDividend||effects.recruitBonus?'reward':effects.points?'economy':'defense'):kind),...(effects?{effects}:{}),itemPack:43,desc:effects?bundleDescription(effects):descriptions[kind](value)});}return out;}
function add(source,rows){items.push(...packItems(source,rows));}

add('Always Sunny',[
 ['rat-stick','Charlie’s Rat Stick','🧹','clearTraps'],
 ['golden-god-boombox','Golden God Boombox','📻','bounty',4],
 ['jersey-sunblock','Jersey Shore Sunblock','🧴','bundle',{cloak:2,shields:1}]
]);
add('Seinfeld',[
 ['marble-rye','Marble Rye','🍞','bundle',{points:3,boost:2}],
 ['serenity-tape','Serenity Now Tape','📼','bundle',{cleanse:true,ward:1}],
 ['festivus-pole','Festivus Pole','🪄','repairPath']
]);
add('The Office',[
 ['pretzel-day','Pretzel Day Pass','🥨','bestDie'],
 ['jello-stapler','Stapler in Jell-O','🍮','capDie',2],
 ['boss-mug','World’s Best Boss Mug','☕','recruitBeacon']
]);
add('Parks and Recreation',[
 ['pawnee-waffles','Pawnee Waffle Platter','🧇','bundle',{points:3,shields:1,boost:1}],
 ['li-l-sebastian-ticket','Li’l Sebastian Benefit Ticket','🐎','gateDividend',5],
 ['ron-mustache-comb','Ron’s Mustache Comb','🪮','bundle',{ward:1,boost:3}]
]);
add('Arrested Development',[
 ['blue-man-paint','Blue Man Paint','🔵','bundle',{cloak:2,rerolls:1}],
 ['forget-me-now','Forget-Me-Now','💊','badDie'],
 ['loose-seal-glove','Loose Seal Glove','🦭','bundle',{points:2,ward:2}]
]);
add('South Park',[
 ['chefs-chocolate-balls','Chef’s Chocolate Salty Balls','🍫','bundle',{points:2,rewardBonus:4}],
 ['towelie-towel','Towelie’s Towel','🧺','bundle',{cleanse:true,rerolls:1}],
 ['cartman-chili','Cartman’s Chili Pot','🍲','itemRaid']
]);
add('Bob’s Burgers',[
 ['louise-hat','Louise’s Rabbit-Ear Hat','🐰','bestDie'],
 ['tina-friend-fiction','Tina’s Friend Fiction','📓','bounty',4],
 ['linda-wine-shoes','Linda’s Wine Shoes','🍷','bundle',{points:6,slow:1}]
]);
add('King of the Hill',[
 ['pocket-sand','Dale’s Pocket Sand','🏜️','badDie'],
 ['bobbys-purse','Bobby’s Purse','👜','bundle',{ward:2,boost:1}],
 ['peggy-boggle','Peggy’s Boggle Trophy','🏆','mirrorDie']
]);
add('30 Rock',[
 ['tracy-egot','Tracy’s EGOT Necklace','🏅','recruitBeacon'],
 ['night-cheese','Liz’s Night Cheese','🧀','collectionBonus'],
 ['peacock-cufflinks','Jack’s Peacock Cufflinks','🦚','investment',3]
]);
add('Taskmaster',[
 ['golden-greg-head','Golden Greg Head','👑','gateDividend',5],
 ['red-green-potato','Red-Green Potato','🥔','reverseDie'],
 ['taskmaster-rubber-duck','Taskmaster Rubber Duck','🦆','clearTraps']
]);
add('I Think You Should Leave',[
 ['dan-flashes-shirt','Dan Flashes Shirt','👕','collectionBonus'],
 ['karl-havoc-costume','Karl Havoc Costume','🥸','bundle',{ward:3,slow:1}],
 ['turbo-team-voucher','Turbo Team Voucher','🏃','capDie',2]
]);
add('Curb Your Enthusiasm',[
 ['spite-store-cup','Spite Store Coffee Cup','☕','investment',3],
 ['latte-larry-key','Latte Larry’s Fire Exit Key','🔑','repairPath'],
 ['pretty-good-card','Pretty, Pretty Good Card','👍','catchup']
]);
add('Nathan for You',[
 ['summit-ice-jacket','Summit Ice Jacket','🧥','cloak',3],
 ['dumb-starbucks-cup','Dumb Starbucks Cup','🥤','chooseSupply'],
 ['gas-rebate-receipt','Gas Rebate Receipt','🧾','investment',3]
]);
add('The Rehearsal',[
 ['orange-juice-prop','Rehearsal Orange Juice','🧃','mirrorDie'],
 ['bar-replica-plan','Bar Replica Blueprint','📐','preview'],
 ['door-city-key','Door City Key','🚪','trailPass']
]);
add('Mrs. Doubtfire',[
 ['doubtfire-oven-gloves','Doubtfire’s Oven Gloves','🧤','clearTraps'],
 ['hillard-recipes','Hillard Family Recipe Book','📚','cache',2],
 ['hello-dear-mask','Hello, Dear Disguise Kit','🎭','bundle',{cleanse:true,ward:2}]
]);
add('Jay and Silent Bob',[
 ['snoogans-beanie','Snoogans Beanie','🧢','itemRaid'],
 ['mallrats-sailboat','Mallrats Sailboat Picture','⛵','preview'],
 ['moobys-card','Mooby’s Loyalty Card','🐮','investment',3]
]);
add('The Big Lebowski',[
 ['white-russian','White Russian','🥛','bundle',{points:3,shields:1}],
 ['walters-toe','Walter’s Suspicious Toe','🦶','badDie'],
 ['dude-bathrobe','The Dude’s Bathrobe','🧖','ward',2]
]);
add('Fargo',[
 ['paul-bunyan-keyring','Paul Bunyan Keyring','🪓','trailPass'],
 ['marge-duck-stamp','Marge’s Duck Stamp','🦆','bestDie'],
 ['mike-lunch-receipt','Mike Yanagita’s Lunch Receipt','🧾','investment',2]
]);
add('Jurassic Park',[
 ['amber-resin','Amber Resin Specimen','🦟','gateDividend',5],
 ['nedry-cryo-pack','Nedry’s Cryo Backpack','🎒','cache',2],
 ['sattler-flashlight','Sattler’s Emergency Flashlight','🔦','bundle',{cleanse:true,shields:2}]
]);
add('Back to the Future',[
 ['sports-almanac','Grays Sports Almanac','📔','mirrorDie'],
 ['mr-fusion','Mr. Fusion','♻️','bestDie'],
 ['docs-lightning-rod','Doc’s Lightning Rod','⚡','bundle',{rollDouble:1,slowAfterRoll:1}]
]);
add('Men in Black',[
 ['noisy-cricket','Noisy Cricket','🔫','capDie',2],
 ['worm-guys-coffee','Worm Guys’ Coffee','☕','bundle',{rollFloor:4,points:2}],
 ['orions-galaxy','Orion’s Galaxy Marble','🌌','gateDividend',5]
]);
add('The Matrix',[
 ['training-disk','Construct Training Disk','💿','recruitBeacon'],
 ['trinity-bike-key','Trinity’s Motorcycle Key','🏍️','forward',4],
 ['white-rabbit','White Rabbit Tattoo','🐇','chooseSupply']
]);
add('Star Wars',[
 ['r2-repair-kit','R2-D2’s Repair Kit','🤖','repairPath'],
 ['jedi-holocron','Jedi Holocron','🔮','bestDie'],
 ['hans-sabacc-deck','Han’s Sabacc Deck','🃏','gamble',8]
]);
add('Star Trek',[
 ['replicator-rations','Replicator Rations','🍱','cache',2],
 ['bajoran-orb','Bajoran Orb','🔮','reverseDie'],
 ['latinum-slip','Gold-Pressed Latinum Slip','🪙','investment',3]
]);
add('Alien',[
 ['nostromo-fire-kit','Nostromo Fire Kit','🔥','clearTraps'],
 ['ripley-loader-glove','Ripley’s Loader Glove','🦾','trailPass'],
 ['facehugger-egg','Facehugger Egg','🥚','badDie']
]);
add('Predator',[
 ['thermal-scope','Thermal Scope','🔭','preview'],
 ['smart-disc','Predator Smart Disc','💿','itemRaid'],
 ['yautja-med-kit','Yautja Med Kit','🩹','bundle',{cleanse:true,ward:1}]
]);
add('Evil Dead',[
 ['kandarian-dagger','Kandarian Dagger','🗡️','clearTraps'],
 ['s-mart-badge','S-Mart Employee Badge','🏷️','cache',2],
 ['ash-gauntlet','Ash’s Mechanical Gauntlet','🦾','trailPass']
]);
add('Home Alone',[
 ['kevin-bb-gun','Kevin’s BB Gun','🔫','pushOther',4],
 ['tar-bucket','Tar Bucket','🪣','badDie'],
 ['kevin-micro-machines','Kevin’s Micro Machines','🚙','strongTrap',7]
]);
add('They Live',[
 ['bubblegum-pack','Last Pack of Bubblegum','🫧','bundle',{cloak:1,boost:3}],
 ['obey-sticker','OBEY Sticker','📜','capDie',2],
 ['wrist-teleporter','Wrist Teleporter','⌚','forward',4]
]);
add('The Fifth Element',[
 ['korben-taxi-key','Korben’s Taxi Key','🚕','fixedDie',5],
 ['ruby-rod-mic','Ruby Rhod’s Microphone','🎤','bounty',4],
 ['diva-ticket','Diva’s Blue Ticket','🎫','bundle',{rewardBonus:3,gateDividend:3}]
]);
add('Wayne’s World',[
 ['excalibur-pick','Excalibur Guitar Pick','🎸','bounty',4],
 ['waynes-aaa-pass','Wayne’s AAA Backstage Clip','🎟️','recruitBeacon'],
 ['schwing-meter','Schwing Meter','📟','gamble',8]
]);
add('Austin Powers',[
 ['austin-mojo','Austin’s Mojo Vial','🧪','gamble',8],
 ['cryogenic-capsule','Cryogenic Capsule','🧊','investment',3],
 ['fembot-shield','Fembot Shield Circuit','🤖','bundle',{ward:2,rewardBonus:2}]
]);
add('Zoolander',[
 ['magnum-mirror','Magnum Mirror','🪞','mirrorDie'],
 ['derelicte-bag','Derelicte Bag','🛍️','chooseSupply'],
 ['blue-steel-dryer','Blue Steel Hairdryer','💨','trailPass']
]);
add('Happy Gilmore',[
 ['chubbs-hand','Chubbs’ Wooden Hand','🖐️','rollFloor',5],
 ['shooter-trophy','Shooter’s Breakfast Trophy','🏆','badDie'],
 ['subway-card','Happy’s Subway Card','🥪','cache',2]
]);
add('The Mighty Ducks',[
 ['flying-v-book','Flying V Playbook','🏒','bundle',{boost:5,giftBoost:2}],
 ['bombay-whistle','Bombay’s Whistle','📣','bundle',{cleanse:true,bestDie:1}],
 ['ducks-jersey','Ducks Jersey','🦆','bundle',{ward:1,recruitBonus:true}]
]);
add('James Bond',[
 ['aston-eject-button','Aston Martin Eject Button','🔴','pushOther',4],
 ['q-laser-pen','Q’s Laser Pen','🖊️','repairPath'],
 ['felix-poker-chip','Felix’s Poker Chip','🎰','investment',3]
]);
add('Fast & Furious',[
 ['nos-canister','NOS Canister','🧯','bundle',{rollDouble:1,slowAfterRoll:1}],
 ['corona-cooler','Family’s Corona Cooler','🍺','bundle',{points:3,ward:1}],
 ['family-photo','Family Photo','🖼️','recruitBeacon']
]);
add('Teenage Mutant Ninja Turtles',[
 ['sewer-pizza','Sewer Pizza Box','🍕','bundle',{points:3,boost:2}],
 ['shell-cell','Donatello’s Shell Cell','📱','repairPath'],
 ['casey-stick','Casey’s Hockey Stick','🏒','bundle',{ward:2,boost:2}]
]);
add('Super Mario Bros.',[
 ['fire-flower','Fire Flower','🌼','clearTraps'],
 ['starman','Starman','⭐','bundle',{ward:2,cloak:1}],
 ['lakitu-cloud','Lakitu’s Cloud','☁️','trailPass']
]);
add('The Legend of Zelda',[
 ['hookshot','Hookshot','🪝','trailPass'],
 ['fairy-bottle','Fairy in a Bottle','🧚','bundle',{cleanse:true,ward:1}],
 ['rupee-wallet','Rupee Wallet','💎','collectionBonus']
]);
add('Resident Evil',[
 ['first-aid-spray','First Aid Spray','🧴','bundle',{cleanse:true,shields:2}],
 ['jill-lockpick','Jill’s Lockpick','🔑','repairPath'],
 ['ink-ribbon','Ink Ribbon','📼','investment',3]
]);
add('Metal Gear',[
 ['fulton-balloon','Fulton Balloon','🎈','itemRaid'],
 ['snake-bandana','Snake’s Infinite Bandana','🧣','bounty',4],
 ['octocamo','OctoCamo Suit','🦎','bundle',{ward:1,cloak:2}]
]);
add('Dragon Ball Z',[
 ['capsule-case','Capsule Corp Case','💼','chooseSupply'],
 ['flying-nimbus','Flying Nimbus','☁️','trailPass'],
 ['seven-dragon-balls','Seven Dragon Balls','🔮','recruitBeacon']
]);
add('Hunter × Hunter',[
 ['greed-island-binder','Greed Island Binder','📕','collectionBonus'],
 ['gons-fishing-rod','Gon’s Fishing Rod','🎣','itemRaid'],
 ['biscuit-cookie','Biscuit’s Training Cookie','🍪','bundle',{bestDie:1,slowAfterRoll:1}]
]);
add('Final Fantasy',[
 ['phoenix-down','Phoenix Down','🪶','bundle',{cleanse:true,ward:2}],
 ['chocobo-lure','Chocobo Lure','🐥','fixedDie',6],
 ['materia-orb','Mystery Materia Orb','🟢','gamble',8]
]);
add('Death Stranding',[
 ['container-spray','Container Repair Spray','🧴','repairPath'],
 ['fragile-umbrella','Fragile’s Umbrella','☂️','forward',5],
 ['likes-token','Bridges Likes Token','👍','investment',3]
]);
add('Daft Punk',[
 ['robot-visor','Encore Robot Visor','🤖','mirrorDie'],
 ['get-lucky-record','Get Lucky Record Token','💿','bestDie'],
 ['harder-better-pedal','Harder, Better Pedal','🎛️','bundle',{rewardBonus:5,slow:1}]
]);
add('Black Sabbath',[
 ['iron-man-badge','Iron Man Backstage Badge','🎟️','ward',2],
 ['war-pigs-snare','War Pigs Snare','🥁','strongTrap',7],
 ['paranoid-earplugs','Paranoid Earplugs','🎧','bundle',{cleanse:true,rollFloor:3}]
]);

const ITEM_PACK_V43=items;

Object.assign(exports,{ITEM_PACK_V43,packItems});