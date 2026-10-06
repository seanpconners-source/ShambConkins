// Question bank for "The Newlywed Game · Spirit Level". Pure data + tiny template helpers (no DOM).
// Row = [category, question, optionA, optionB, optionC, optionD]
// Question tokens: {S} -> "you" (when the subject answers) or the subject's name; {Ss} -> "your"/"Name's"; [do|does] -> you-form|name-form.
// Option tokens:   {S} -> subject's name, {O} -> the other player's name.
const ROWS=[
// ---------- food ----------
['food','What would {S} order at a diner at 2am?','🥞 Pancakes the size of a hubcap','🍟 Disco fries drowning in gravy','☕ Coffee and a bad decision','🍳 An omelette and a lot of regret'],
['food','{S} walks into a pizzeria. The order is…','🍍 Pineapple. Fight me.','🧀 Plain cheese, no drama','🌶️ Everything on it','🥓 Meat. Only meat.'],
['food','Which gas-station snack would {S} grab at midnight?','🌭 The hot dog that has been rolling since Tuesday','🍬 Giant bag of sour gummies','🥩 Beef jerky and a slushie','🧃 Nothing. “Just looking.” Leaves with three things.'],
['food','{S} gets one last meal on Earth. It is…','🍝 Home cooking, like Mum made','🥩 A steak the size of a pillow','🌮 Tacos. So many tacos.','🎂 Birthday cake. For dinner. Obviously.'],
['food','How [do|does] {S} eat cereal?','🥣 Milk first. Fight me.','🥄 Cereal first, then milk, like a civilised person','📦 Dry, straight from the box','🌊 Soggy on purpose. Wait for it to dissolve.'],
['food','{Ss} coffee order is…','⚫ Black, like the void inside','🍬 Sugar with a tiny hint of coffee','📜 Whatever has the longest name on the menu','🍵 Tea, because coffee is “too much”'],
['food','Which kitchen disaster is {S} most likely to cause?','🚨 Setting off the smoke alarm','🥘 Forgetting the main ingredient','🐔 Mystery-temperature chicken','📞 Ordering takeout and calling it “cooking”'],
['food','What does {S} do with the pizza crust?','🍕 Eats it first like a champion','🗑️ Leaves a crime scene of crusts','🥫 Dips it in everything','👶 Saves them for “later” and forgets'],
['food','{Ss} drive-thru guilty pleasure is…','🍔 Burgers and a mountain of fries','🌮 Tacos at 1am','🍗 A fried chicken sandwich','🥞 Breakfast burritos at any hour'],
['food','{Ss} ice cream flavour is…','🍪 Cookie dough','🌿 Mint chocolate chip','🍦 Plain vanilla, with confidence','🍫 Anything with 4 candy bars crushed in'],
['food','The pizza arrives. {S} first…','📸 Takes a photo for no one','🔥 Burns the roof of their mouth immediately','🧮 Counts slices to check fairness','🏆 Claims the biggest slice'],
['food','{Ss} secret kitchen habit is…','🫙 Eating straight from the jar','🥄 Licking the spoon and putting it back','🙈 Hiding the good snacks','🌙 Cold leftovers at midnight, fridge door wide open'],
['food','What would {S} cook for a first date?','🍝 Spaghetti. Cannot go wrong. (Can go wrong.)','🥡 Takeout moved to nice plates','🧀 A cheese board, called “cooking”','🥣 Cereal. A bold move.'],
['food','{Ss} breakfast situation is…','🍳 A big, hearty fry-up','🍞 Toast and a vibe','☕ Skipped. Coffee only.','🍕 Last night’s pizza'],
['food','Is a hot dog a sandwich? {S} says…','🥪 Yes, obviously','🌮 No, it is a taco','👑 It is its own food group','🤷 Who cares, give me one'],
['food','At an all-you-can-eat buffet, {S}…','🗺️ Plans the route like a heist','🍰 Goes straight to dessert','🍟 Fills a plate with fries only','🔁 Goes back five times and calls it “sampling”'],
['food','Which Halloween candy is {S} stealing from the bowl?','🍫 Chocolate bars, no mercy','🍬 Sour everything','🌽 Candy corn, to defend its honour','🏃 A fistful of everything, then leaves'],
['food','{Ss} popcorn order is…','🧈 Butter and extra salt','🍯 Sweet kettle corn','🧀 Cheese-dust orange fingers','🔥 Hot sauce. Always the hot sauce.'],
// ---------- habits ----------
['habit','What happens when {Ss} alarm goes off?','😎 Already awake, smugly','😴 Snooze. Five times.','📣 Eight alarms, five minutes apart','😱 Wakes up panicking that it is 10 minutes late'],
['habit','In the shower, {S} mostly…','🎤 Gives a full concert','🗣️ Wins arguments that will never happen','🧊 Stands there until the hot water dies','🤯 Has the best ideas of the entire day'],
['habit','{Ss} phone battery is usually at…','🔋 80% or more. Suspicious.','⚠️ 3%, living dangerously','💀 Dead. Right now. Probably.','🔌 “I own five chargers and none work.”'],
['habit','{Ss} sleeping position is…','⭐ Starfish, takes the whole bed','🌯 Burrito, wrapped in all the blankets','🦵 One leg out at all times','🏰 Pillow fortress, drawbridge up'],
['habit','How [do|does] {S} park a car?','✨ Perfect first try','🔁 Three-point turn, minimum, sweating','🚧 Straddles the line like a rebel','🌀 Circles the lot for 20 minutes to avoid reversing'],
['habit','How many browser tabs [are|is] {S} running?','🧼 Three. Clean.','🗂️ 47. All “important”.','🦥 One. A sloth.','🧟 Too many to count. One is playing music. No idea which.'],
['habit','When packing for a trip, {S}…','🧳 Packs the night before. Calm.','⏱️ Packs five minutes before leaving','🎒 Overpacks “just in case”','🧥 Wears the same hoodie the whole trip'],
['habit','{Ss} texting style is…','⚡ Replies instantly with 14 messages','🐌 Replies 3 days later: “sorry just saw this”','🎙️ Only voice memos, four minutes each','👍 A thumbs-up, and we are done'],
['habit','When {S} is running late, they say…','📍 “I’m five minutes away.” (Still at home.)','🚗 “Traffic!”','🙏 “So sorry!” and arrives with snacks','⏰ Never late. Arrives 30 minutes early.'],
['habit','How [do|does] {S} load the dishwasher?','🧩 Perfect Tetris','🌋 Chaos, an avalanche of plates','🧽 “Soaking.” For three days.','🙅 Does not. The sink is a lifestyle.'],
['habit','The thermostat battle: {S} is…','🥶 Team Arctic','🥵 Team Tropical','🎚️ Sets it, forgets it','🕵️ Secretly changes it when nobody is looking'],
['habit','{Ss} closet is…','🌈 Colour-coordinated','🪑 Everything lives on “the chair”','🧺 A clean-ish laundry mountain','👕 Three outfits on rotation'],
['habit','Alone in an elevator with a stranger, {S}…','🔢 Stares at the floor numbers','📱 Pretends to text','☁️ Makes small talk about the weather','🫁 Holds their breath until the doors open'],
['habit','In the car, {S} sings…','🎤 Full concert, windows up','🪟 Window down, full confidence','🤫 Whispers so nobody hears','📻 Never. Okay, only when alone.'],
['habit','{S} falls asleep during…','🎬 Every movie, in the first 20 minutes','🏈 Sports','📖 Any show with subtitles','😳 Nothing. Eyes open. “I’m watching.”'],
['habit','{Ss} grocery-store behaviour is…','📝 Sticks to the list perfectly','🍪 Comes home with 12 things not on the list','🛒 Pushes the cart in the wrong direction at all times','🏃 Speed-run: in, out, done in 8 minutes'],
['habit','What does {S} do first when entering a hotel room?','🛏️ Flops on the bed','📺 Checks the TV and the remote','🧼 Inspects the bathroom like a detective','🍫 Raids the minibar'],
['habit','When {S} loses their keys, they…','😤 Blame the keys','🧠 Retrace every step out loud','🙏 Ask someone else to find them','🔑 Find them in the hand that was already holding them'],
// ---------- cringe ----------
['cringe','Which has {S} definitely done?','👋 Waved back at someone who wasn’t waving at them','🚪 Walked into a glass door','👩‍🏫 Called a teacher “Mum”','💬 Texted the wrong person'],
['cringe','{S} would get caught…','🎤 Singing into a hairbrush','🐶 Dancing alone with the dog','🐱 Doing a baby voice with the cat','🪞 Rehearsing an argument in the mirror'],
['cringe','{Ss} worst haircut era was…','🥣 The bowl cut','✂️ Self-cut during lockdown','🧪 Bleach disaster','🌟 Frosted tips'],
['cringe','The lie {S} tells most often is…','📍 “I’m on my way.”','📜 “I read the terms and conditions.”','😊 “I’m fine.”','⏱️ “Just five more minutes.”'],
['cringe','{Ss} karaoke strategy is…','🔥 A power ballad, absolutely committed','🎤 A rap they do not know','📻 Eighties hits and jazz hands','🙅 Refuses. Then will not hand over the mic.'],
['cringe','If {Ss} phone was shown on the big screen, we would see…','🔍 The search history','📝 The notes app','📸 The camera roll','💬 The group chat'],
['cringe','{Ss} wedding dance move is…','💦 The sprinkler','🕺 The shoulder shimmy','👩 The “dad dance”','🍰 Stands near the snack table'],
['cringe','What makes {S} tear up?','🐶 Dog movies','📺 A pet adoption ad','💍 Wedding speeches','📖 The last page of a book'],
['cringe','{S} just responded “you too” to…','🍽️ A waiter saying “enjoy your meal”','🎬 A cinema usher saying “enjoy the film”','✈️ “Have a safe flight”','🎂 “Happy birthday”, on their own birthday'],
['cringe','{Ss} “I’m totally an expert” topic is…','🍳 Cooking','🚗 Directions','📺 Which actor was in what','🥊 Fighting, theoretically'],
['cringe','How [do|does] {S} react when someone says “we need to talk”?','😰 Instantly rewinds the last five years','🛡️ “What did I do?” (before hearing anything)','🧊 Plays it cool, internally screaming','🍪 Gets a snack and prepares for drama'],
['cringe','{S} is caught watching…','👑 A royal-wedding documentary, twice','🐕 Puppy compilations for an hour','🏠 Home-renovation shows','🍰 Baking competitions, taking notes'],
// ---------- would you rather / dilemmas ----------
['wyr','Which superpower would {S} take?','🕊️ Flying','🫥 Invisibility','🧠 Reading minds','⏸️ Freezing time'],
['wyr','{S} would rather fight…','🦆 One horse-sized duck','🐎 100 duck-sized horses','🏃 Neither. Running away.','🤝 Neither. Negotiating with the duck.'],
['wyr','Which movie universe would {S} live in for a year?','🚀 Star Wars','🧙 Harry Potter','🦖 Jurassic Park','📎 The Office'],
['wyr','{S} gets to be an animal for a day. Which?','🐱 A cat (zero responsibilities)','🦅 An eagle','🐬 A dolphin','🦥 A sloth'],
['wyr','{S} gets a time machine. Destination?','🦕 Dinosaur era','🕺 The 1980s','🚀 The year 3000','🙈 Last night, to fix one dumb thing'],
['wyr','{S} wins $1,000,000. First purchase?','🏡 A house','✈️ A giant trip','💳 Paying off everything','🎈 A truly ridiculous inflatable'],
['wyr','Zombie apocalypse. {S} is the one who…','🎖️ Leads confidently (and wrongly)','🥫 Hides in the pantry','💥 Dies first, but gloriously','🗺️ Makes a brilliant plan that immediately fails'],
['wyr','Which talent would {S} grab instantly?','🎶 Perfect pitch','🌍 Speaking every language','😴 Never needing sleep','🚗 Perfect parallel parking'],
['wyr','Stranded on an island, {S} brings one thing:','🌶️ Hot sauce','🔪 One very good knife','🔊 A speaker and a playlist','🧑 Their favourite person (hi)'],
['wyr','{S} gets a free round-the-world ticket but only one stop. Where?','🗼 Paris','🏯 Tokyo','🏝️ A private beach, no schedule','🦘 Australia, to meet the scary wildlife'],
['wyr','{S} gets to change one rule of the world:','😴 Nap time for everyone','🍕 Pizza is a food group','💸 Birthdays are public holidays','🔇 Silence in cinemas. Forever.'],
['wyr','If {S} could swap lives with a character for one week:','🕵️ A spy','🧙 A wizard','🤠 A cowboy','🧁 A bakery owner in a small town'],
// ---------- movie & game taste ----------
['movie','What would {S} pick for movie night?','💘 A rom-com','🔪 Horror','💥 Action with explosions','🧸 An animated film, “for the kids”'],
['movie','Which villain does {S} secretly root for?','🖤 Darth Vader','🎭 The Joker','💎 Hans Gruber','🟡 Gru'],
['movie','Which sitcom boss is {S}, deep down?','📎 Michael Scott','🥓 Ron Swanson','📋 Leslie Knope','🥋 Dwight Schrute'],
['movie','At the cinema, {S} gets…','🍿 A bucket of popcorn the size of a head','🍬 Candy smuggled in a coat','🧀 Nachos from the cheese pump','🥤 A soda the size of a bucket, then needs the loo'],
['movie','The quote {S} says far too often is…','🦾 “I’ll be back.”','🧙 “You shall not pass!”','💥 “Yippee-ki-yay.”','🗣️ “That’s what she said.”'],
['movie','How [do|does] {S} watch a movie?','🍿 Pauses every 10 minutes for snacks','🗣️ Talks through the whole thing','📱 Phone in hand, second screen','⏪ Rewinds the good bits'],
['movie','{S} would be the first to die in a horror movie because they…','🔦 Split up from the group','🏚️ Check the basement “just to see”','👋 Call out “Hello? Who’s there?”','🦶 Trip over absolutely nothing'],
['movie','Which film secretly makes {S} cry?','🤠 Toy Story 3','🎈 Up','🚢 Titanic','🐶 Marley and Me'],
['movie','Which animated sidekick is {S}?','🫏 Donkey','⛄ Olaf','🐟 Dory','🧞 The Genie'],
['movie','In a heist movie, {S} is…','🧠 The mastermind','🚗 The getaway driver','💻 The hacker','🤧 The one who sneezes at the worst moment'],
['movie','Which video-game hero is {S}?','🍄 Mario','🗡️ Link','🟡 Pac-Man','🌸 Kirby'],
['movie','In Mario Kart, {S} is the one who…','🐢 Throws the blue shell with no regrets','🌈 Falls off Rainbow Road, every time','🚀 Takes every shortcut','🔙 Drives backwards “on purpose”'],
['movie','Which Paddy’s Pub gang member is {S}?','😎 Dennis, the Golden God','🥋 Mac, karate and confidence','🐭 Charlie, the glue sniffer of wisdom','🦩 Dee, the “bird”'],
['movie','{Ss} karaoke movie song is…','❄️ “Let It Go”','🥊 “Eye of the Tiger”','🚢 “My Heart Will Go On”','🐠 “Under the Sea”'],
['movie','If {S} directed a movie, the genre would be…','😂 Slapstick comedy','🕵️ A moody detective noir','🚀 A sci-fi epic','💘 A cheesy romance with a dramatic rain scene'],
// ---------- who is more likely ----------
['likely','Who is more likely to cry at a dog food commercial?','{S}','{O}','Both of us','Neither. (Liars.)'],
['likely','Who would survive longer on a desert island?','{S}','{O}','We would be fine, together','We would make it three days, tops'],
['likely','Who is more likely to get lost WITH the GPS on?','{S}','{O}','Both of us','Neither. The GPS is lost.'],
['likely','Who is more likely to talk their way out of a speeding ticket?','{S}','{O}','Both of us','Neither. Instant fine.'],
['likely','Who steals the blankets at night?','{S}','{O}','Both of us (it is a tug of war)','Neither. The cat does.'],
['likely','Who would win a staring contest?','{S}','{O}','Nobody, we would both laugh in 3 seconds','A tie. We are both stubborn.'],
['likely','Who is more likely to adopt a stray animal on a whim?','{S}','{O}','Both of us (we already have a plan)','Neither. Absolutely not.'],
['likely','Who would give up first on a 1,000-piece puzzle?','{S}','{O}','Both of us, instantly','Neither. We would finish it and be unbearable.'],
['likely','Who is more likely to laugh at the worst possible moment?','{S}','{O}','Both of us','Neither. We are professionals.'],
['likely','Who takes longer to get ready?','{S}','{O}','Both of us','Neither, we are always early (sure)'],
['likely','Who would start a fight with a goose and lose?','{S}','{O}','Both of us','Neither. Geese are terrifying.'],
['likely','Who would win a dance-off?','{S}','{O}','Both of us would lose','A tie. Both of us dance like nobody is watching.'],
['likely','Who is more likely to become famous by accident?','{S}','{O}','Both of us, for different reasons','Neither. We are too lazy.'],
['likely','Who says “I told you so” more often?','{S}','{O}','Both of us (it is a sport)','Neither. We just give looks.'],
['likely','Who would scream first in a haunted house?','{S}','{O}','Both of us, at the same time','Neither. We would run silently.'],
['likely','Who is more likely to sing in public?','{S}','{O}','Both of us, loudly','Neither. Only in the shower.'],
['likely','Who is more likely to eat the other’s leftovers “by accident”?','{S}','{O}','Both of us, shamelessly','Neither. We both label things.'],
['likely','Who spends more time choosing what to watch than watching?','{S}','{O}','Both of us. Every night.','Neither. We choose instantly. (Argue instead.)'],
// ---------- sweet ----------
['sweet','{Ss} love language is…','💬 Words of affirmation','⏳ Quality time','🎁 Thoughtful gifts','🧹 Acts of service (do the dishes, please)'],
['sweet','{Ss} perfect Sunday looks like…','🥞 Sleeping in, then pancakes','🥾 A long walk outdoors','🎬 Movies all day, blanket fort','🛍️ Brunch and a flea market'],
['sweet','Which gift would make {S} the happiest?','💌 A handwritten letter','✈️ A surprise trip','🎮 A gadget they secretly want','🍰 Their favourite food, made with love'],
['sweet','Which date night would {S} choose?','🕯️ A cozy dinner','🕹️ An arcade','🎸 A concert','🥡 Takeout and pyjamas at home'],
['sweet','When {S} is sad, they want…','🤗 A big hug','🚪 Some space','🍪 Snacks. Many.','🤡 A joke to cheer them up'],
['sweet','{S} would love to be woken up by…','☕ Coffee, brought to bed','⏰ Nothing. Natural waking at noon.','🐶 A pet licking their face','🎶 A gentle song'],
['sweet','What would {S} say is the best thing about {O}?','😄 Their laugh','🤪 Their weird sense of humour','🫶 How they look after others','🍟 Their willingness to share snacks'],
['sweet','Which compliment would {S} love most?','😂 “You are so funny.”','🧠 “You are so smart.”','💛 “You are so kind.”','😍 “You look amazing.”'],
['sweet','Their favourite thing about a rainy day:','☔ Cozy blankets and tea','🎲 A board game marathon','🎧 A moody playlist','🏃 Splashing in puddles like a kid'],
['sweet','{Ss} dream holiday is…','🏖️ A beach and a book','🏔️ A mountain cabin','🌆 A city full of museums and food','🎢 A theme park, fast passes and all'],
// ---------- spicy (silly, never rude) ----------
['spicy','Who is more likely to start a pillow fight?','{S}','{O}','Both of us','Neither. We start food fights instead.'],
['spicy','Who would win a long argument about something silly?','{S}','{O}','Neither. We would both be wrong, loudly.','Whoever says “fine” first'],
['spicy','Who hogs the remote?','{S}','{O}','Both of us (a hostage situation)','Nobody. We have two remotes. And still fight.'],
['spicy','Who steals the last fry?','{S}','{O}','Both of us at the same time','Neither. We offer it. Then say “no I insist” and eat it.'],
['spicy','{Ss} biggest harmless red flag is…','📱 Leaves the battery at 1%','👍 Replies “k”','🥛 Puts the empty milk back in the fridge','🎬 Narrates the movie out loud'],
['spicy','{Ss} guilty-pleasure TV is…','💘 Reality dating shows','🔎 True crime','🐭 Cartoons','🍰 Cooking competitions'],
['spicy','If {S} had a secret double life, it would be as…','🕵️ A spy','🎤 A pop star','🏴‍☠️ A pirate','♟️ A chess hustler in the park'],
['spicy','When {S} loses a board game, they…','🪑 Flip the table (gently)','🔁 Demand a rematch','😊 Are graceful. (Lie.)','📣 Declare the game rigged'],
['spicy','Seeing a spider, {S}…','🙀 Screams and flees','🧘 Calm “catch and release”','📞 Calls for backup','🔥 Burns down the house'],
['spicy','Who is worse at keeping a secret?','{S}','{O}','Both of us (the whole street knows)','Neither. We take secrets to the grave.'],
['spicy','Who would you want beside you in a zombie apocalypse?','{S}','{O}','Both of us, as the dream team','Neither. Going solo, with a baseball bat.'],
['spicy','When {S} spots a free sample, they…','🍪 Take one, politely','🏃 Take four and keep walking','🥢 Return. Several times. Different hat.','🙅 Walk past with willpower of steel'],
['spicy','If {S} found a wallet with $500 in it, they would…','👮 Turn it in immediately','🪪 Track down the owner, hero style','📞 Ask me what to do','😇 Give it back and keep the “reward” snacks']
];

function fill(text,{you,name,other}){
 let t=String(text);
 t=t.replace(/\[([^|\]]+)\|([^\]]+)\]/g,(m,a,b)=>you?a:b);
 t=t.replace(/\{Ss\}/g,you?'your':name+'’s');
 t=t.replace(/\{S\}/g,you?'you':name);
 t=t.replace(/\{O\}/g,other);
 return t.replace(/(^|[.!?]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase());
}
// Builds a playable question: {cat,text,options:[{label}], pick(index)}; option order is shuffled by the caller.
function parse(row){return {cat:row[0],q:row[1],o:row.slice(2,6)};}
const QUESTIONS=ROWS.map(parse);
const CATEGORY_LABEL={food:'Food',habit:'Habits',cringe:'Cringe',wyr:'Dilemma',movie:'Movies & games',likely:'Who’s more likely',sweet:'Sweet',spicy:'Spicy'};

const MATCH_QUIPS=['Mind meld!','Creepy-good telepathy!','Soulmates. Confirmed.','They know you TOO well.','Same brain, two bodies.','No notes. Perfect.','Eerie. Just eerie.'];
const MISS_QUIPS=['Not even close!','Do you even KNOW them?','Awkward…','Plot twist!','Swing and a miss!','Time for couples therapy.','Who IS this stranger?!'];
const VERDICTS=[
 [100,'Soulmates','Slightly terrifying. Do you share a brain?'],
 [75,'Lovebirds','You really do know each other. Cute. Gross. Cute.'],
 [50,'Great Roommates','You know the big stuff. The snacks, however, remain a mystery.'],
 [25,'Polite Strangers','Plenty left to learn. Start with the pizza topping.'],
 [0,'Witness Protection','You have never met this person before, have you?']
];
function verdictFor(pct){for(const [min,name,line] of VERDICTS)if(pct>=min)return {name,line};return {name:VERDICTS[4][1],line:VERDICTS[4][2]};}

Object.assign(exports,{QUESTIONS,CATEGORY_LABEL,MATCH_QUIPS,MISS_QUIPS,VERDICTS,verdictFor,fill});
