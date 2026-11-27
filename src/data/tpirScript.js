// THE PRICE IS RIGHT, MORE TALK (owner, Nov 26: "the showcase needs to show off each item longer... things in between like 'and you'll be
// using that luggage set on your trip to Jamaica'... have Bob comment... describe the trips... Bob and the announcer say the names often...
// a parting gift... a new car is a big deal"). Everything here is spoken (src/data/tpirVoice.js turns each row into a line; the voice tool
// tools/gameshow/tpir-voice.mjs makes the clips). The text on screen is the same text, so a bubble with it plays the clip.

// the announcer's bridge between a showcase's prizes: [after the 1st prize, after the 2nd prize] per showcase id (src/data/showCatalog.js)
const SHOWCASE_TIES={
 beach:['And once you have the hang of those paddle boards, you\'ll be riding the waves in sunny Mexico!','And when you get home, you\'ll be strapping those boards to the roof of your brand new ride!'],
 paris:['Start every morning with a perfect espresso, just like they do on the Left Bank!','And when you get back from Paris, you\'ll be zipping around town, European style!'],
 rockstar:['Every rock star needs a guitar, and every guitar needs a stage. So we\'re sending you to Music City!','And when the tour is over, you\'ll be riding off into the sunset!'],
 camping:['You\'ll need all that gear, because you\'re going camping in the most famous park in America!','And you won\'t have to sleep on the ground, because you\'ll be pulling your own home on wheels!'],
 sunny:['You\'ll be pouring drinks like a pro, and you\'ll be doing it in the City of Brotherly Love!','And to get you home after last call... you won\'t be taking the bus!'],
 islands:['You\'ll be lounging in style. But first, aloha!','And while you\'re in the islands, you\'ll want something to ride the waves... so take one home!'],
 home:['And after a long day on that sectional, you\'ll sleep like a baby!','And every home needs something in the driveway!'],
 winter:['Soak those aching muscles after a long day on the slopes of Aspen!','And for getting around when the snow piles up...'],
 japan:['Practice your gaming at home, then head to the land where it all began!','And when you get back, you\'ll be driving a classic from Japan!'],
 lake:['Paddle the calm water in the morning, and cast a line in the afternoon!','And when the whole family wants to come along, there\'s room for everybody on this one!'],
 vegas:['Practice your poker face at home, then take it to the tables in Sin City!','And you\'ll cruise down the Strip in a classic American muscle car!'],
 fitness:['You\'ll ride with the best instructors in the world, and then you\'ll pump some iron!','And when you\'re in the best shape of your life, you\'ll want to hit the trails!'],
 maestro:['You\'ll be playing the classics, and then you\'re off to the Great White Way!','And for the grand finale... the grandest piano of them all!'],
 ireland:['You\'ll practice your swing, because you\'re playing the links on the Emerald Isle!','And back home, you\'ll take the scenic route with the top down!'],
 italy:['Make a perfect pizza at home, and then taste the real thing in the Eternal City!','And to zip through the streets like a Roman...'],
 cruise:['You\'ll be packed and ready, because you\'re setting sail for the Caribbean!','And once you\'re back on dry land, you\'ll be out on the water in your own boat!'],
 cowboy:['Smoke the perfect brisket, and then head out west to the wide open range!','And every cowboy needs a trusty horse... with a few hundred more horsepower!'],
 gamer:['Your new rig is ready for battle. And when you need a break, there\'s a classic waiting for you!','And to drive to the next tournament... ready, player one?'],
 wedding:['That\'s a beautiful ring, and after the big day, you\'ll honeymoon in paradise!','And the happy couple will drive off in style, cans rattling behind them!'],
 backyard:['Fire up the grill, but you\'re going to need a whole kitchen out back for this party!','And to haul in the supplies, you\'ll need a truck!'],
 roadtrip:['Pack up the gear, because this road trip goes all the way to the end of the road, in the Florida Keys!','And you\'ll be traveling in the most famous trailer on the highway!'],
 greece:['Dinner on the patio, under the stars, is just a warm-up for the Greek isles!','And back home, you\'ll go anywhere in all-wheel drive!'],
 kitchen:['Cook up a feast, and keep the perfect bottle ready to go with it!','And to really know your wine, we\'re sending you straight to the source!'],
 twins:['Two bikes, for two riders, and the doubles don\'t stop there!','You\'ll see double in the driveway too, because there\'s another one!'],
 speed:['Learn the racing line on the go-kart, then step up to two wheels and a whole lot more speed!','And for the fastest finish of all...'],
 retirement:['Put your feet up! But not for too long, because you\'re going to Alaska!','And when you get back, you\'ll tour the neighborhood, or the golf course, in style!'],
 tropics:['Soak under the stars, and then soak up the sun in the South Pacific!','And for some fun on the water...'],
 adventure:['Ride the trails at home, then explore the rainforest in Costa Rica!','And you\'ll be ready for any road, or no road at all!'],
 london:['A clock fit for Big Ben himself, and then it\'s tea time in London!','And back home, you\'ll be hauling it all in your own pickup!'],
 mountains:['Warm up in your own sauna, and then breathe the mountain air in the Swiss Alps!','And to take the mountains with you wherever you go...'],
 tinyhome:['Power and sunshine, off the grid, for the most important part of this showcase!','Your very own home on wheels!'],
 family:['Hours of fun in the backyard, and then the happiest place on Earth!','And the whole family will fit in this one!']};
// the announcer describes the trip like the show does (after "It's a trip to ...!")
const TRIP_DESC={
 'trip-hawaii':'You\'ll fly to the island of Maui, where you\'ll spend six nights at a luxurious oceanfront resort. Enjoy a sunset luau, and snorkel the crystal clear waters off Molokini!',
 'trip-paris':'You\'ll fly to the City of Lights, where you\'ll spend six nights in a charming hotel near the Champs-Elysees. Enjoy a dinner cruise on the Seine, and a private tour of the Louvre!',
 'trip-rome':'You\'ll spend seven fabulous nights in the Eternal City. Toss a coin in the Trevi Fountain, tour the Colosseum, and enjoy a cooking class with a real Roman chef!',
 'trip-london':'You\'ll fly to London, England, for six nights in a five-star hotel. See the changing of the guard at Buckingham Palace, and ride the London Eye high over the Thames!',
 'trip-ireland':'You\'ll spend a week touring the Emerald Isle, from the pubs of Dublin to the Cliffs of Moher, with nights in a real Irish castle!',
 'trip-greece':'You\'ll fly to Athens, then sail the beautiful Greek islands, with five nights in a cliffside villa on Santorini overlooking the Aegean Sea!',
 'trip-tokyo':'You\'ll fly to Tokyo, Japan, for seven nights. Ride the bullet train, visit ancient temples, and eat sushi at the famous fish market!',
 'trip-australia':'You\'ll fly to Sydney, Australia, for eight nights. See a show at the world famous Opera House, climb the Harbour Bridge, and hold a koala!',
 'trip-cancun':'You\'ll fly to Cancun, Mexico, for six nights at an all-inclusive resort on the white sand beaches of the Caribbean!',
 'trip-cabo':'You\'ll fly to Cabo San Lucas, where you\'ll spend six nights at an all-inclusive resort. Go deep sea fishing, and watch the sunset at the famous arch!',
 'trip-jamaica':'You\'ll fly to beautiful Montego Bay, Jamaica, for seven fun-filled nights at an all-inclusive resort. Climb the famous Dunn\'s River Falls, and relax on the beach!',
 'trip-bahamas':'You\'ll fly to Nassau in the Bahamas, for six nights at a luxurious island resort. Swim with the dolphins, and soak up the sun!',
 'trip-costa-rica':'You\'ll spend seven nights in the rainforest of Costa Rica. Zip line through the jungle canopy, and soak in the hot springs at the foot of a volcano!',
 'trip-tahiti':'You\'ll fly to Tahiti, then on to Bora Bora, for seven nights in a private bungalow over the crystal clear lagoon!',
 'trip-fiji':'You\'ll fly to the islands of Fiji, for seven nights at a private island resort, with snorkeling, kayaking, and spa treatments for two!',
 'trip-bali':'You\'ll fly to Bali, Indonesia, for eight nights in a private villa with your own pool. Visit the temples, and the famous rice terraces!',
 'trip-alaska':'You\'ll take seven fabulous days aboard a luxury cruise ship, sailing the Inside Passage of Alaska, with stops at four ports of call, and a front row seat to the glaciers!',
 'trip-caribbean':'You\'ll take seven fabulous days aboard a luxury cruise ship, stopping at four luxurious ports in the Caribbean. Enjoy the sun and fun on the high seas!',
 'trip-mediterranean':'You\'ll spend ten days aboard a luxury cruise ship sailing the Mediterranean, with stops in Barcelona, Monaco, Florence, and Rome!',
 'trip-nyc':'You\'ll fly to the Big Apple for five nights in a Times Square hotel, with orchestra seats to a hit Broadway show!',
 'trip-vegas':'You\'ll fly to fabulous Las Vegas, Nevada, for four nights in a suite on the Strip, with tickets to a headline show!',
 'trip-disney':'You\'ll fly to Orlando, Florida, for six nights at a Walt Disney World resort, with park tickets for the whole family!',
 'trip-aspen':'You\'ll fly to Aspen, Colorado, for six nights in a slopeside lodge, with lift tickets and ski lessons!',
 'trip-yellowstone':'You\'ll spend six nights at a lodge in Yellowstone National Park. Watch Old Faithful erupt, and see the buffalo roam!',
 'trip-napa':'You\'ll spend five nights in the heart of California wine country, with private tastings, and a hot air balloon ride over the vineyards!',
 'trip-nashville':'You\'ll spend five nights in Music City, with tickets to the Grand Ole Opry, and a tour of the Country Music Hall of Fame!',
 'trip-new-orleans':'You\'ll spend five nights in the French Quarter of New Orleans. Hear live jazz on Bourbon Street, and take a riverboat cruise on the Mississippi!',
 'trip-key-west':'You\'ll drive the Overseas Highway all the way to Key West, for five nights in a beachfront inn, with a sunset sail!',
 'trip-philly':'You\'ll spend a weekend in Philadelphia. See the Liberty Bell, eat a real cheesesteak, and spend a night at Paddy\'s Pub!',
 'trip-iceland':'You\'ll fly to Reykjavik, Iceland, for six nights. Soak in the Blue Lagoon, and chase the Northern Lights!',
 'trip-switzerland':'You\'ll fly to Zurich, then ride the train into the Swiss Alps, for seven nights in a mountain chalet!'};
// the announcer on a car / a big finisher, after "It's a new ...!"
const CAR_DESC=['It comes with a backup camera, Bluetooth, heated seats, and alloy wheels!','It comes with a touchscreen, Apple CarPlay, keyless entry, and that new car smell!',
 'Fully loaded, with a sunroof, a premium sound system, and lane assist!','It comes with all-wheel drive, a power liftgate, and room for the whole family!'];
// Bob's little comments while a showcase is presented / bid on
const BOB_COMMENTS=['Isn\'t that something?','Oh, that\'s a beautiful showcase!','I\'d bid on that one myself!','Now that\'s a showcase!','Wow! Look at that!','Oh, that\'s nice. Very nice.'];
// a player who's out: the host and the announcer say goodbye like the show
const GOODBYE=['Thank you so much for playing The Price Is Right!','You\'ll go home with a lifetime supply of Rice-A-Roni, the San Francisco treat, and a copy of The Price Is Right home game! Thanks for playing!'];
// the parting gifts (owner, Nov 27: not always Rice-A-Roni, always the home game): [prize photo id, the announcer's line]
const HOME_GAME='tpir-home-game';
const PARTING=[['rice-a-roni',GOODBYE[1]],
 ...[['spam','a year\'s supply of Spam'],['crest-strips','a year\'s supply of Crest 3D Whitestrips'],['kraft-mac','a year\'s supply of Kraft Macaroni and Cheese'],
  ['charmin-case','a year\'s supply of Charmin toilet paper'],['pop-tarts-case','a year\'s supply of Pop-Tarts'],['folgers-case','a year\'s supply of Folgers coffee'],
  ['ramen-case','a year\'s supply of Maruchan ramen noodles'],['oreo-case','a year\'s supply of Oreo cookies']].map(([id,g])=>[id,`You'll go home with ${g}, and a copy of The Price Is Right home game! Thanks for playing!`,g])];
// a new car! (the host's line after the name; the announcer's shout is 'A NEW CAR!')
const NEW_CAR=['you just won a NEW CAR!'];
// the host with a name in front: "<name>, " + one of these (each its own clip, the name its own clip: tpirVoice nm-*)
const WITH_NAME=['what\'s your bid?','come on up here!','you\'re going to the Showcase!','thank you for playing The Price Is Right!','you just won a NEW CAR!',
 'it\'s your turn!','spin the wheel!','here\'s your showcase!','congratulations!','you did it!','oh, I\'m sorry.','come on down!','you\'re our big winner today!','here we go!','step up to the wheel!',
 'you were our top winner on the wheel, so you decide. Do you want to bid on this showcase, or pass it?'];
// higher or lower than $N (Punch-a-Bunch): one clip per amount
const HL_MAX=120;
Object.assign(exports,{SHOWCASE_TIES,TRIP_DESC,CAR_DESC,BOB_COMMENTS,GOODBYE,PARTING,HOME_GAME,NEW_CAR,WITH_NAME,HL_MAX});
