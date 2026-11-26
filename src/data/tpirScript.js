// THE PRICE IS RIGHT, the episode: every word said on the show. id -> [voice, text]. The voice tool (tools/voices/make.py)
// turns each line into assets/voices/<id>.mp3 -> vo:<id>; the game plays the clip and shows the text as a closed caption
// (a line with no clip yet is captioned only, and the show waits about as long as it takes to read it).
// GENERATED lines (also voiced, ids built by the tool and src/engines/tpir/voice.js):
//   name-<character id>   the announcer says every character's name (one per character; new characters: re-run the tool)
//   prize-<id>            the announcer describes a prize: "It's <say>!" (src/data/tpirPrizes.js)
//   arp-<id>              the host reads its price ("one thousand, ninety-nine dollars")
//   sci-<id> / sct-<id>   a showcase's set-up / the host reading its total
//   usd-<n>               the host reads 1..99 dollars (Plinko, Cliff Hangers small prizes)
//   bid-<g>-<n>           a studio contestant shouting a bid: $1 and $100..$4,000 in 50s (g = g1..g4)
//   scb-<g>-<n>           a studio contestant's showcase bid: $15,000..$60,000 in 500s
// To use your own AI voices instead: node tools/voices/script.mjs writes one script per voice (docs/voices/), you read or
// generate each in one go, then python3 tools/voices/cut.py <voice> <recording> cuts it into the clips (README there).
// Voices (Piper models, tools/voices/README.md): ann = the announcer, host = the host, g1-g4 = studio contestants, ad = commercials.
const VOICES={ann:'Announcer',host:'Host (Bob)',g1:'Contestant 1 (man)',g2:'Contestant 2 (woman)',g3:'Contestant 3 (man)',g4:'Contestant 4 (woman)',ad:'Commercial voice-over'};
const LINES={
 // ---- the open
 'intro-1':['ann','Here it comes! From Hollywood! The Price Is Right!'],
 'cod':['ann','Come on down!'],
 'first-four':['ann','You\'re the first four contestants on The Price Is Right!'],
 'next':['ann','You\'re the next contestant on The Price Is Right!'],
 'star':['ann','And now, here\'s the star of our show... Bob Barker!'],
 'welcome-1':['host','Thank you, thank you! Hello everybody, and welcome to The Price Is Right!'],
 'welcome-2':['host','Thank you very much! Hi everybody! Welcome to The Price Is Right!'],
 'welcome-3':['host','Thank you! Oh, what a nice welcome. Welcome to The Price Is Right!'],
 'welcome-tail':['host','We have a lot of prizes to give away today, so let\'s get right to it!'],
 'ann-banter-1':['ann','Bob, you look fantastic today!'],
 'host-banter-1':['host','Thank you. I\'ve been told it\'s the lighting.'],
 'ann-banter-2':['ann','Great crowd today, Bob!'],
 'host-banter-2':['host','They sure are. Some of them have been waiting outside since four in the morning!'],
 'ann-banter-3':['ann','Bob, I brought you a little something.'],
 'host-banter-3':['host','Is it a new car? ... It\'s not a new car.'],
 // ---- Contestants' Row
 'first-item':['host','Let\'s see our first item up for bids!'],
 'next-item-1':['host','Here\'s your next item up for bids!'],
 'next-item-2':['host','Let\'s see the next item up for bids.'],
 'next-item-3':['host','What\'s our next item up for bids?'],
 'bid-start':['host','Let\'s start the bidding.'],
 'bid-you':['host','What do you bid?'],
 'arp-1':['host','Actual retail price...'],
 'arp-2':['host','And the actual retail price is...'],
 'arp-3':['host','The actual retail price...'],
 'over-all':['host','Oh! Everybody\'s over! Let\'s bid again, and this time, go lower.'],
 'perfect':['host','That\'s a perfect bid! You win a five hundred dollar bonus!'],
 'come-up-1':['host','Come on up here!'],
 'come-up-2':['host','Come on up and join me!'],
 'come-up-3':['host','Come on up!'],
 'hi-1':['host','Hi! How are you? Where are you from?'],
 'hi-2':['host','Hello! Tell everybody where you\'re from.'],
 'hi-3':['host','Hi there! And where are you from?'],
 'p-banter-1':['host','I understand you brought your whole family with you today.'],
 'p-banter-2':['host','I like your T-shirt!'],
 'p-banter-3':['host','You look like you\'ve been waiting your whole life for this!'],
 'p-banter-4':['host','Are you nervous? Don\'t be nervous. It\'s only money.'],
 'p-banter-5':['host','You were jumping so high, I thought you\'d hit the lights!'],
 'p-banter-6':['host','Well, it\'s nice to have you here.'],
 'play-for-1':['host','Let\'s see what you\'re playing for!'],
 'play-for-2':['host','Here\'s what you\'re playing for!'],
 'g-from-1':['g1','I\'m from Scranton, Pennsylvania, Bob!'],
 'g-from-2':['g2','Philadelphia!'],
 'g-from-3':['g3','Hill Valley, California!'],
 'g-from-4':['g4','Springfield!'],
 'g-from-5':['g1','Hawkins, Indiana!'],
 'g-from-6':['g2','Pawnee, Indiana!'],
 'g-from-7':['g3','I\'m from Bedrock!'],
 'g-from-8':['g4','Twin Peaks, Washington!'],
 'g-hi-1':['g1','Hi Bob!'],'g-hi-2':['g2','Hi Bob!'],'g-hi-3':['g3','Hi Bob!'],'g-hi-4':['g4','Hi Bob!'],
 'g-love-2':['g2','I love you, Bob!'],'g-love-4':['g4','I love you, Bob!'],
 'g-yes-1':['g1','Yes! Yes!'],'g-yes-2':['g2','Oh my God! Yes!'],'g-yes-3':['g3','Yeah!'],'g-yes-4':['g4','Woo hoo!'],
 'g-no-1':['g1','Oh no!'],'g-no-2':['g2','Oh, come on!'],'g-no-3':['g3','Aw, man!'],'g-no-4':['g4','No!'],
 'g-dollar-1':['g1','One dollar, Bob!'],'g-dollar-2':['g2','One dollar!'],'g-dollar-3':['g3','One dollar, Bob!'],'g-dollar-4':['g4','One dollar!'],
 'g-dollar-wheel-1':['g1','Come on, dollar!'],'g-dollar-wheel-2':['g2','Come on, come on!'],'g-dollar-wheel-3':['g3','Dollar! Dollar!'],'g-dollar-wheel-4':['g4','Come on, baby!'],
 // ---- pricing games
 'win-1':['host','You won!'],'win-2':['host','Congratulations!'],'win-3':['host','You did it!'],'win-4':['host','You won it all!'],
 'lose-1':['host','Oh, I\'m sorry.'],'lose-2':['host','Oh, too bad.'],'lose-3':['host','So close!'],'lose-4':['host','Ohh, that\'s a shame.'],
 'plinko-1':['host','This is the game of Plinko! You already have one Plinko chip, and you can win four more.'],
 'plinko-2':['host','Each of these small prizes has a two digit price. One of the digits is right. Pick the right one, and you win another chip.'],
 'plinko-3':['host','Now go on up those stairs! You can win up to fifty thousand dollars!'],
 'plinko-right':['host','That\'s right! Another chip!'],
 'plinko-wrong':['host','No, the right price was...'],
 'plinko-drop':['host','Drop it whenever you\'re ready.'],
 'cliff-1':['host','This is Cliff Hangers! Our little mountain climber is going to climb that mountain.'],
 'cliff-2':['host','Guess the prices of these three small prizes. For every dollar you\'re off, he climbs one step.'],
 'cliff-3':['host','If he goes past twenty five steps, he falls off the cliff, and you lose. Let\'s play!'],
 'cliff-guess':['host','What do you think it costs?'],
 'cliff-exact':['host','Right on the money! He doesn\'t move!'],
 'cliff-win':['host','He made it! You win!'],
 'cliff-lose':['host','Oh no! There he goes!'],
 'clock-1':['host','This is the Clock Game! You have thirty seconds to guess the price of two prizes.'],
 'clock-2':['host','Every time you guess, I\'ll tell you higher, or lower. Get them both, and you win them, plus a thousand dollars!'],
 'clock-go':['host','Start the clock!'],
 'clock-higher-1':['host','Higher!'],'clock-higher-2':['host','Higher!'],
 'clock-lower-1':['host','Lower!'],'clock-lower-2':['host','Lower!'],
 'clock-right':['host','That\'s it!'],
 'clock-next':['host','Next prize!'],
 'clock-time':['host','Oh! Time ran out.'],
 'range-1':['host','This is the Range Game! The price of this prize is somewhere on this rack.'],
 'range-2':['host','When I start it, the rangefinder moves up. Stop it whenever you like. If the price is inside the window, you win!'],
 'range-go':['host','Here it goes. Stop it whenever you want.'],
 'any-1':['host','This is Any Number! There are three prices up here: the car, the prize, and the piggy bank full of money.'],
 'any-2':['host','Call out numbers, zero through nine. Whichever price you fill in first, that\'s what you win.'],
 'any-pick-1':['host','Call a number!'],'any-pick-2':['host','Next number?'],'any-pick-3':['host','Pick another one.'],
 'any-car':['host','You filled in the car! You win the car!'],
 'any-prize':['host','You filled in the prize! You win it!'],
 'any-pig':['host','You filled in the piggy bank. You win the money in the piggy bank!'],
 'hio-1':['host','This is Hole in One... or Two! Put these six grocery items in order, from the lowest price to the highest.'],
 'hio-2':['host','The more you get right, the closer you get to putt for a new car!'],
 'hio-putt':['host','Now take your best shot! Sink it, and you win the car!'],
 'hio-two':['host','You missed! But you get a second putt. That\'s the "or two"!'],
 'hio-sink':['host','It\'s in! You win the car!'],
 // ---- the Showcase Showdown
 'ssd-1':['host','It\'s time for the Showcase Showdown!'],
 'ssd-2':['host','You each get up to two spins. Whoever comes closest to one dollar, without going over, goes to the Showcase!'],
 'ssd-spin-1':['host','Give it a good pull!'],'ssd-spin-2':['host','Go ahead and spin.'],'ssd-spin-3':['host','Let\'s see you spin it!'],
 'ssd-again':['host','Do you want to spin again, or stay?'],
 'ssd-stay':['host','You\'ll stay.'],
 'ssd-dollar':['host','One dollar! You win a thousand dollars, and a bonus spin!'],
 'ssd-over':['host','Oh, you went over.'],
 'ssd-round':['host','It has to go all the way around! Try that again.'],
 'ssd-win':['host','You\'re going to the Showcase!'],
 'ssd-10k':['host','Ten thousand dollars!'],
 'ssd-25k':['host','Twenty five thousand dollars!'],
 'ssd-tie':['host','It\'s a tie! We\'ll have a spin-off.'],
 // ---- the commercial break
 'break-1':['host','Stay with us! We\'ll be right back after this.'],
 'break-2':['host','Don\'t go away! We\'ll be right back.'],
 'back':['host','Welcome back to The Price Is Right!'],
 'ad-fightmilk-1':['ad','Are you a bodyguard? Do you want to fight like a crow?'],
 'ad-fightmilk-2':['ad','Fight Milk! The first alcoholic, dairy based protein drink, for bodyguards, by bodyguards.'],
 'ad-fightmilk-3':['ad','Available today, at your local store. Look in the aisle where you buy your milk!'],
 'ad-brawndo-1':['ad','Brawndo! The Thirst Mutilator!'],
 'ad-brawndo-2':['ad','It\'s got what plants crave. It\'s got electrolytes!'],
 'ad-brawndo-3':['ad','Brawndo. Available today, at your local store!'],
 'ad-rumham-1':['ad','Planning a day at the beach? Don\'t forget the Rum Ham!'],
 'ad-rumham-2':['ad','A whole ham, soaked in a bath of rum. It\'s a meal and a party, all in one!'],
 'ad-rumham-3':['ad','Rum Ham! Available today, at Paddy\'s Pub. Look in the aisle where you buy your ham.'],
 // ---- the Showcase
 'sc-1':['host','It\'s time for the Showcase!'],
 'sc-2':['host','You were our top winner on the wheel, so you decide. Do you want to bid on this first showcase, or pass it?'],
 'sc-pass':['host','You\'ll pass it.'],
 'sc-bid':['host','You\'ll bid on it.'],
 'sc-here':['host','Here\'s your showcase!'],
 'sc-bid-ask':['host','Take your time, and give me your bid.'],
 'sc-reveal':['host','Let\'s find out the actual retail prices of these showcases.'],
 'sc-yours':['host','The actual retail price of your showcase is...'],
 'sc-over':['host','Oh, you overbid.'],
 'sc-closer':['host','You were closer. You win your showcase!'],
 'sc-both':['host','You were within two hundred fifty dollars! You win both showcases!'],
 'sc-nobody':['host','Oh, you both overbid! Nobody wins a showcase today.'],
 // ---- the end
 'family':['host','Come on, everybody! Come on down here!'],
 'signoff':['host','This is Bob Barker, reminding you: help control the pet population. Have your pets spayed or neutered. Bye bye, everybody!'],
 'credits-1':['ann','The Price Is Right is a ShambConkins production.'],
 'credits-2':['ann','Promotional consideration furnished by Fight Milk, Brawndo the Thirst Mutilator, and Paddy\'s Pub. Prizes described by your announcer.'],
 'tally':['ann','Let\'s see how everybody did today!'],
 'tally-win':['ann','Today\'s big winner...'],
 // ---- the channel guide's "choose a game" show
 'pick-1':['ann','It\'s The Price Is Right, game time! Pick a game and play along!']};
// grouped for picking one at random
const POOLS={welcome:['welcome-1','welcome-2','welcome-3'],banter:[['ann-banter-1','host-banter-1'],['ann-banter-2','host-banter-2'],['ann-banter-3','host-banter-3']],
 nextItem:['next-item-1','next-item-2','next-item-3'],arp:['arp-1','arp-2','arp-3'],comeUp:['come-up-1','come-up-2','come-up-3'],hi:['hi-1','hi-2','hi-3'],
 pBanter:['p-banter-1','p-banter-2','p-banter-3','p-banter-4','p-banter-5','p-banter-6'],playFor:['play-for-1','play-for-2'],
 gFrom:['g-from-1','g-from-2','g-from-3','g-from-4','g-from-5','g-from-6','g-from-7','g-from-8'],
 win:['win-1','win-2','win-3'],lose:['lose-1','lose-2','lose-3','lose-4'],spin:['ssd-spin-1','ssd-spin-2','ssd-spin-3'],
 higher:['clock-higher-1','clock-higher-2'],lower:['clock-lower-1','clock-lower-2'],anyPick:['any-pick-1','any-pick-2','any-pick-3'],brk:['break-1','break-2']};
const ADS={fightmilk:{item:'fight-milk',lines:['ad-fightmilk-1','ad-fightmilk-2','ad-fightmilk-3'],title:'FIGHT MILK',tag:'For bodyguards, by bodyguards.',col:['#f3efe2','#c0392b']},
 brawndo:{item:'brawndo',lines:['ad-brawndo-1','ad-brawndo-2','ad-brawndo-3'],title:'BRAWNDO',tag:'The Thirst Mutilator! It\'s got electrolytes.',col:['#2bd13b','#0a3d12']},
 rumham:{item:'rum-ham',lines:['ad-rumham-1','ad-rumham-2','ad-rumham-3'],title:'RUM HAM',tag:'A meal and a party, all in one.',col:['#f2a65a','#5a2a10']}};
// guest bid amounts that have a voice: $1, $100-$4,000 in 50s; showcase bids $15,000-$60,000 in 500s
const BID_STEPS=[1,...Array.from({length:79},(_,i)=>100+i*50)];
const SC_STEPS=Array.from({length:91},(_,i)=>15000+i*500);
// numbers in words, the way the host reads a price
function words(n){n=Math.round(n);const one=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],
 ten=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
 const lt100=x=>x<20?one[x]:ten[Math.floor(x/10)]+(x%10?' '+one[x%10]:''),lt1000=x=>x<100?lt100(x):one[Math.floor(x/100)]+' hundred'+(x%100?' '+lt100(x%100):'');
 if(n<1000)return lt1000(n);const th=Math.floor(n/1000),r=n%1000;return lt1000(th)+' thousand'+(r?(r<100?' and ':', ')+lt1000(r):'');}
const dollars=n=>words(n)+(n===1?' dollar':' dollars');
Object.assign(exports,{VOICES,LINES,POOLS,ADS,BID_STEPS,SC_STEPS,words,dollars});
