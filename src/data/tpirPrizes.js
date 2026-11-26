// THE PRICE IS RIGHT, the episode (price-bid-off): what's up for grabs. Real products and real cars at about their US list
// price in NOVEMBER 2026 (the show's 'actual retail price'; round numbers where the maker sells it that way). Trips are priced
// like the show does it: a week for two, airfare and hotel. Pictures are optional: assets/gameshow/prize-<id>.webp|png
// -> show:prize-<id> (src/data/showSprites.js PRIZE slots); without one the game draws the emoji on a lit display card.
// Every line the announcer says about a prize is in `say` (voiced by tools/voices: vo:prize-<id>), and every price the host
// reads out is voiced too (vo:arp-<id>), so prices here must stay whole dollars, except GROCERY (cents, never read aloud).
const PRICES_AS_OF='November 2026';
// Contestants' Row (One Bid) and the bigger pricing-game prizes: [id, short name, what the announcer says, price, emoji]
const BIDS=[
 ['lg-oled','LG 65" OLED TV','a sixty-five inch LG OLED television, so every game looks better than real life',1999,'📺'],
 ['pool-table','Brunswick pool table','a seven foot Brunswick pool table, cues and balls included',3299,'🎱'],
 ['jukebox','Crosley Rocket jukebox','a Crosley Rocket jukebox, with a hundred of your favorite songs',1099,'🎵'],
 ['peloton','Peloton Bike','a Peloton Bike, so you can ride all the way to nowhere',1445,'🚴'],
 ['weber','Weber Genesis grill','a Weber Genesis gas grill, for the king of the backyard',1099,'🔥'],
 ['trek','his and hers Trek bikes','his and hers Trek bicycles',1198,'🚲'],
 ['lazboy','La-Z-Boy reclining sofa','a La-Z-Boy reclining sofa, for the ultimate nap',1899,'🛋️'],
 ['ps5','PlayStation 5 + two games','a PlayStation 5 with two brand new games',639,'🎮'],
 ['dyson','Dyson V15 vacuum','a Dyson V15 cordless vacuum',749,'🧹'],
 ['kitchenaid','KitchenAid stand mixer','a KitchenAid stand mixer, in candy apple red',449,'🥣'],
 ['breville','Breville espresso machine','a Breville Barista Express espresso machine',699,'☕'],
 ['callaway','Callaway golf clubs','a full set of Callaway golf clubs, with the bag',1499,'⛳'],
 ['yamaha-piano','Yamaha digital piano','a Yamaha digital piano',1199,'🎹'],
 ['canoe','Old Town canoe','an Old Town canoe, paddles and life jackets included',1299,'🛶'],
 ['celestron','Celestron telescope','a Celestron computerized telescope',899,'🔭'],
 ['nordictrack','NordicTrack treadmill','a NordicTrack treadmill',1999,'🏃'],
 ['dining-set','seven piece dining set','a seven piece dining room set',1749,'🍽️'],
 ['arcade1up','Arcade1Up Pac-Man cabinet','an Arcade1Up Pac-Man arcade cabinet',599,'🕹️'],
 ['strat','Fender Stratocaster + amp','a Fender Stratocaster guitar and amplifier',1349,'🎸'],
 ['macbook','MacBook Air','a thirteen inch MacBook Air',999,'💻'],
 ['iphone','iPhone 17 Pro','an iPhone 17 Pro',1099,'📱'],
 ['roomba','iRobot Roomba','an iRobot Roomba robot vacuum',499,'🤖'],
 ['fridge','Samsung French door fridge','a Samsung French door refrigerator',2499,'🧊'],
 ['laundry','LG washer and dryer','an LG washer and dryer',1998,'🫧'],
 ['patio','patio furniture set','a five piece patio furniture set, with umbrella',1399,'☀️'],
 ['kayaks','two Pelican kayaks','two Pelican kayaks',798,'🚣'],
 ['drums','Pearl drum kit','a Pearl five piece drum kit',899,'🥁'],
 ['massage','Osaki massage chair','an Osaki massage chair',3499,'💺'],
 ['traeger','Traeger pellet grill','a Traeger wood pellet grill',899,'🍖'],
 ['toro','Toro riding mower','a Toro riding lawn mower',2799,'🚜'],
 ['vitamix','Vitamix blender','a Vitamix blender',549,'🍹'],
 ['canon','Canon mirrorless camera','a Canon mirrorless camera with a zoom lens',1299,'📷'],
 ['wine-fridge','wine fridge + a case of wine','a wine fridge, and a case of wine to fill it',849,'🍷'],
 ['hot-tub','inflatable hot tub','an inflatable hot tub for six',599,'♨️'],
 ['air-hockey','air hockey table','an arcade air hockey table',1199,'🏒'],
 ['karaoke','karaoke system','a karaoke system, with two wireless microphones',649,'🎤']];
// cars: Any Number, Hole in One, showcases
const CARS=[
 ['corolla','Toyota Corolla LE','a new car! A Toyota Corolla LE',23495,'🚗'],
 ['civic','Honda Civic Sport','a new car! A Honda Civic Sport',26795,'🚙'],
 ['mustang','Ford Mustang convertible','a new car! A Ford Mustang convertible',38995,'🏎️'],
 ['wrangler','Jeep Wrangler','a new Jeep Wrangler',33190,'🚙'],
 ['miata','Mazda MX-5 Miata','a new Mazda MX-5 Miata',30500,'🏎️'],
 ['bronco','Ford Bronco','a new Ford Bronco',40990,'🚙'],
 ['mini','MINI Cooper','a new MINI Cooper',29875,'🚗'],
 ['camry','Toyota Camry','a new car! A Toyota Camry',28400,'🚗']];
// showcase extras: trips and toys
const BIG=[
 ['hawaii','a trip to Hawaii','a trip to beautiful Maui, Hawaii! Seven nights at a beachfront resort',8450,'🌺'],
 ['paris','a trip to Paris','a trip to Paris, France! Seven nights in the city of lights',9120,'🗼'],
 ['cancun','a trip to Cancun','a trip to sunny Cancun, Mexico',6280,'🏖️'],
 ['alaska','an Alaskan cruise','a seven night cruise to Alaska',7340,'🛳️'],
 ['new-york','a trip to New York City','a trip to New York City, with tickets to a Broadway show',5960,'🗽'],
 ['tokyo','a trip to Tokyo','a trip to Tokyo, Japan',10480,'🏯'],
 ['vegas','a trip to Las Vegas','a trip to Las Vegas, baby! Three nights on the Strip',3890,'🎰'],
 ['ireland','a trip to Ireland','a trip to Ireland, with a pint in a real Irish pub',7720,'☘️'],
 ['philly','a trip to Philadelphia','a trip to sunny Philadelphia, with a night at Paddy\'s Pub',2460,'🔔'],
 ['seadoo','Sea-Doo personal watercraft','a Sea-Doo personal watercraft',11299,'🌊'],
 ['pontoon','pontoon boat','a twenty foot pontoon boat',27650,'⛵'],
 ['camper','Airstream travel trailer','an Airstream travel trailer',42900,'🚐'],
 ['motorcycle','Harley-Davidson motorcycle','a Harley-Davidson motorcycle',18999,'🏍️'],
 ['piano-grand','Steinway baby grand piano','a Steinway baby grand piano',46900,'🎹'],
 ['home-theater','home theater','a complete home theater, with a hundred inch projector screen',6890,'🎬'],
 ['furs','his and hers fur coats','his and hers faux fur coats',2780,'🧥'],
 ['bedroom','bedroom set','a five piece bedroom set',4320,'🛏️'],
 ['snowmobiles','two snowmobiles','two Ski-Doo snowmobiles',23580,'❄️'],
 ['gym','home gym','a complete home gym',5640,'🏋️'],
 ['grill-island','outdoor kitchen','an outdoor kitchen, with a built in grill',8990,'🍳']];
// the Showcases: [id, theme, the announcer's set-up, prize ids (a car or a big one always last)]
const SHOWCASES=[
 ['beach','Beach Bum','You say you need a vacation? Well, pack your bags, because this showcase is a day at the beach!',['kayaks','cancun','wrangler']],
 ['paris','April in Paris','Bonjour! Our first stop is the most romantic city on Earth.',['breville','paris','mini']],
 ['rock','Rock Star','Ladies and gentlemen, are you ready to rock?',['strat','drums','motorcycle']],
 ['camping','Great Outdoors','Get away from it all, and into the great outdoors!',['canoe','traeger','camper']],
 ['sunny','It\'s Always Sunny','Pour yourself a pint, because this showcase is always sunny!',['jukebox','philly','corolla']],
 ['island','Island Getaway','Grab your grass skirt, because we\'re going to the islands!',['patio','hawaii','seadoo']],
 ['home','Home Sweet Home','There\'s no place like home, especially when it looks like this!',['lazboy','bedroom','camry']],
 ['winter','Winter Wonderland','Baby, it\'s cold outside, but this showcase will warm you right up!',['hot-tub','alaska','snowmobiles']],
 ['tokyo','Big in Japan','Konnichiwa! This showcase is big in Japan!',['ps5','tokyo','civic']],
 ['lake','Lake Life','Life is better at the lake!',['grill-island','fridge','pontoon']],
 ['vegas','Viva Las Vegas','Viva Las Vegas! Feeling lucky?',['karaoke','vegas','mustang']],
 ['fitness','Get Fit','New year, new you! Let\'s get physical!',['peloton','gym','bronco']],
 ['maestro','The Maestro','Strike up the band! This showcase is music to your ears!',['yamaha-piano','new-york','piano-grand']],
 ['ireland','Luck of the Irish','Top of the morning! Are you feeling lucky?',['callaway','ireland','miata']]];
// Hole in One: six grocery items with cents (never read aloud)
const GROCERY=[['heinz','Heinz ketchup, 32 oz',4.79,'🍅'],['jif','Jif peanut butter',3.98,'🥜'],['cheerios','Cheerios, family size',5.49,'🥣'],
 ['tide','Tide pods, 42 count',13.97,'🧺'],['spam','Spam, 12 oz',3.48,'🥫'],['oreo','Oreo cookies',4.98,'🍪'],['skippy','Skippy peanut butter',3.32,'🥜'],
 ['bounty','Bounty paper towels, 6 rolls',15.48,'🧻'],['coffee','Folgers coffee, 30 oz',13.98,'☕'],['mayo','Hellmann\'s mayo',5.27,'🫙'],
 ['ramen','Maruchan ramen, 12 pack',4.28,'🍜'],['gatorade','Gatorade, 8 pack',7.48,'🥤'],['pringles','Pringles',2.68,'🥔'],['nutella','Nutella',5.86,'🍫'],
 ['dawn','Dawn dish soap',4.47,'🧼'],['honey','Sue Bee honey',6.24,'🍯'],['pop-tarts','Pop-Tarts, 8 count',3.97,'🍓'],['velveeta','Velveeta',7.98,'🧀'],
 ['charmin','Charmin, 12 rolls',16.97,'🧻'],['eggs','a dozen eggs',3.12,'🥚'],['milk','a gallon of milk',3.89,'🥛'],['butter','Land O Lakes butter',5.68,'🧈'],
 ['crayola','Crayola crayons, 64',4.99,'🖍️'],['dr-pepper','Dr Pepper, 12 pack',7.98,'🥤']];
const pack=([id,name,say,price,emoji])=>({id,name,say,price,emoji});
const ALL=[...BIDS,...CARS,...BIG].map(pack),BY=Object.fromEntries(ALL.map(p=>[p.id,p]));
const SHOW=SHOWCASES.map(([id,theme,intro,items])=>({id,theme,intro,items:items.map(i=>BY[i])}));
for(const sc of SHOW)sc.total=sc.items.reduce((a,p)=>a+p.price,0);
const GROC=GROCERY.map(([id,name,price,emoji])=>({id,name,price,emoji}));
Object.assign(exports,{PRICES_AS_OF,BIDS:BIDS.map(pack),CARS:CARS.map(pack),BIG:BIG.map(pack),ALL,BY,SHOWCASES:SHOW,GROCERY:GROC});
