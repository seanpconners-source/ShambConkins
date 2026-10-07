// Warp-zone trivia: one quiz per themed warp board (src/warpThemes.js deals them on warp trivia spaces).
// Same line format as trivia3.js: "@Source|category|Wikipedia_Page" then "d|question|correct|wrong|wrong|wrong|explanation"
// with d = e(asy) m(edium) h(ard) i(mpossible). Every quiz topic needs at least eight questions at one difficulty.
const levels={e:'easy',m:'medium',h:'hard',i:'impossible'};
const FACTS=`
@Super Mario Bros. 3|arcade|Super_Mario_Bros._3
e|Which item turns Mario into Raccoon Mario in Super Mario Bros. 3?|Super Leaf|Fire Flower|Super Mushroom|Starman|The raccoon tail lets him fly after a running start.
e|Which suit lets Mario turn into a stone statue?|Tanooki Suit|Frog Suit|Hammer Suit|Raccoon Suit|Statue Mario can't be hurt by most enemies.
e|What are Bowser's seven children in Super Mario Bros. 3 called?|The Koopalings|The Hammer Bros.|The Goombas|The Magikoopas|Each one steals a king's wand and hides on an airship.
e|On which home console was Super Mario Bros. 3 first released?|NES / Famicom|Super Nintendo|Nintendo 64|Game Boy|It launched on the Famicom in Japan in 1988.
e|Which item lets Mario skip ahead to later worlds?|Warp Whistle|P-Wing|Music Box|Anchor|Three are hidden in the game, and they open the Warp Zone.
e|What is the name of World 1?|Grass Land|Desert Land|Sky Land|Dark Land|It is the gentle opening world.
e|What does the P-Wing let Mario do?|Fly for an entire level|Breathe underwater|Throw hammers|Skip the fortress|Its power meter stays full until the level ends.
e|Which suit makes Mario a better swimmer?|Frog Suit|Tanooki Suit|Hammer Suit|Raccoon Suit|It is awkward on land but excellent in water levels.
e|Who is the first Koopaling Mario battles, in World 1?|Larry Koopa|Ludwig von Koopa|Roy Koopa|Morton Koopa Jr.|Larry waits on the World 1 airship.
e|What kind of vehicle does each Koopaling escape in at the end of a world?|An airship|A submarine|A kart|A blimp|If you fail, it flies to another spot on the map.
m|Which Koopaling rules World 7, Pipe Land?|Ludwig von Koopa|Lemmy Koopa|Iggy Koopa|Wendy O. Koopa|Ludwig guards the last airship before Dark Land.
m|What is the name of World 4?|Giant Land|Ice Land|Water Land|Pipe Land|Everything there, enemies included, is oversized.
m|What is the name of World 8, Bowser's home?|Dark Land|Lava Land|Koopa Land|Shadow Land|It is filled with tanks, battleships and Bowser's castle.
m|Which suit lets Mario throw hammers?|Hammer Suit|Tanooki Suit|Frog Suit|Fire Suit|It also blocks fireballs when Mario ducks.
m|Which 1989 film famously previewed Super Mario Bros. 3 before its North American release?|The Wizard|Big|Gremlins 2|The Goonies|Its climax is a tournament played on the then-unreleased game.
m|What is the name of the card-matching bonus game in Super Mario Bros. 3?|N-Spade|Picture Poker|Toad's Match|Lucky Seven|Two mistakes and the round is over.
m|Which miniboss guards the end of each fortress?|Boom Boom|Bowser Jr.|Kamek|Petey Piranha|He flails his arms and later sprouts wings.
m|What does the Music Box do on the world map?|Puts the wandering map enemies to sleep|Opens locked doors|Plays a warp song|Gives an extra life|Sleeping Hammer Bros. can't start a fight.
m|What is the name of World 5?|Sky Land|Cloud Land|Air Land|Star Land|Half of it is set above the clouds.
h|What does the Anchor item do?|Stops the airship from flying away|Lets Mario sink underwater|Locks a pipe|Doubles coins|It is only useful after you fail an airship.
h|Who composed the music for Super Mario Bros. 3?|Koji Kondo|Nobuo Uematsu|Hirokazu Tanaka|Yuzo Koshiro|He also wrote the original Super Mario Bros. theme.
h|Which Koopaling guards World 3, Water Land?|Wendy O. Koopa|Iggy Koopa|Lemmy Koopa|Roy Koopa|She attacks with candy-ring projectiles.
h|In which single level can Mario ride Kuribo's Goomba Shoe?|World 5-3|World 1-4|World 4-2|World 8-1|It is the only stage where the shoe appears.
h|What is Lakitu's Cloud called in the original Japanese game?|Jugem's Cloud|Kumo's Cloud|Wanwan's Cloud|Teresa's Cloud|It lets Mario skip a level on the map.
@Mario Kart|arcade|Mario_Kart
e|Which item leaves a slippery peel behind your kart?|Banana|Green Shell|Blooper|Coin|Drive over it and you spin out.
e|Which item gives a single quick burst of speed?|Mushroom|Banana|Star|Bob-omb|Triple Mushrooms give three boosts.
e|Which item makes you invincible and faster for a few seconds?|Star|Mushroom|Boo|Lightning|Anyone you touch while it lasts spins out.
e|Which shell flies in a straight line and bounces off walls?|Green Shell|Red Shell|Spiny Shell|Blue Shell|Red Shells home in on the racer ahead instead.
e|Which cloud-riding character fishes you back onto the track after a fall?|Lakitu|Toad|Boo|Shy Guy|He also waves the starting lights and flags.
m|Which item turns your kart into a self-driving missile in later games?|Bullet Bill|Bob-omb|Fire Flower|Super Horn|It debuted in Mario Kart DS.
@The Legend of Zelda|arcade|The_Legend_of_Zelda
e|What does the old man in the cave say in the 1986 Legend of Zelda?|It's dangerous to go alone! Take this.|Hey! Listen!|Excuse me, princess!|Grab the Master Sword!|He gives Link his first sword.
e|What is the name of the hero in the Legend of Zelda games?|Link|Zelda|Ganon|Navi|Many players assume the hero is called Zelda.
e|Which thrown item curves out and flies back to Link?|Boomerang|Hookshot|Bomb|Bow|It can also stun enemies.
e|What color tunic is Link best known for wearing?|Green|Red|Blue|Purple|Other tunics, like the Zora and Goron tunics, have special powers.
m|Which item lets Link latch onto a target and pull himself across gaps?|Hookshot|Boomerang|Roc's Feather|Pegasus Boots|The Longshot is its longer upgrade.
m|What does a Heart Container do?|Adds a heart to Link's maximum health|Refills one heart|Revives Link once|Doubles sword damage|Bosses usually leave one behind.
@Sonic the Hedgehog|arcade|Sonic_the_Hedgehog_(1991_video_game)
e|Which item monitor makes Sonic run faster for a while?|Speed Shoes|Shield|Super Ring|Invincibility|The music speeds up too.
e|What happens to Sonic's rings when he gets hit?|They scatter around him|They turn into coins|They double|Nothing|You have a few seconds to grab some back.
e|What does Sonic run past at the end of an act in the first game?|A spinning signpost|A flagpole|A finish banner|A checkered gate|It spins to show Sonic's face.
m|Which move, introduced in Sonic 2, lets Sonic rev up from a standstill?|Spin Dash|Peel Out|Homing Attack|Drop Dash|Hold down and tap jump to charge it.
m|What is the name of the little blue bird freed from destroyed badniks?|Flicky|Pocky|Picky|Cucky|Flicky also starred in a 1984 Sega arcade game.
@Candy Land|tabletop|Candy_Land
e|Which villain lives in Licorice Castle in Candy Land?|Lord Licorice|King Kandy|Mr. Mint|Gramma Nutt|He wants to take over the kingdom.
e|In which forest does Mr. Mint live?|Peppermint Forest|Lollipop Woods|Gumdrop Mountains|Molasses Swamp|He is often pictured with candy canes.
e|Which princess lives in the Lollipop Woods?|Princess Lolly|Princess Frostine|Princess Peach|Princess Bubblegum|She is one of the best-known Candy Land characters.
e|Which Candy Land character rules over the Ice Cream Sea?|Queen Frostine|Princess Lolly|Gramma Nutt|Lord Licorice|She started out as Princess Frostine.
e|Which company first published Candy Land in 1949?|Milton Bradley|Parker Brothers|Mattel|Kenner|Hasbro owns the game today.
e|Which sticky swamp can trap players on the classic board?|Molasses Swamp|Fudge Lagoon|Caramel Creek|Toffee Bog|Newer editions turned it into a chocolate swamp.
e|Which colorful mountain range sits on the Candy Land path?|Gumdrop Mountains|Lollipop Peaks|Marshmallow Alps|Toffee Ridge|Gumdrop Pass is a shortcut through them.
e|Why is Candy Land a favorite first game for small children?|Players need no reading or counting skills|It has no board|It uses real candy|It plays in under ten seconds|You just match the color on the card.
e|Which company owns Candy Land today?|Hasbro|Mattel|Spin Master|Ravensburger|Hasbro bought Milton Bradley in 1984.
m|What are the two classic shortcuts on the Candy Land board?|Rainbow Trail and Gumdrop Pass|Peppermint Pass and Lolly Lane|Licorice Loop and Frosting Falls|Chocolate Chute and Gumdrop Bridge|Landing on the right square sends you ahead.
m|In which city was Eleanor Abbott recovering from polio when she designed Candy Land?|San Diego|Chicago|Boston|Denver|She designed it for children in the polio ward.
m|What do the special picture cards do in Candy Land?|Send you to the pictured spot on the path|Make you skip a turn|Let you draw twice|Swap places with a rival|A late picture card can send you far backward.
m|Which 2005 animated film is based on Candy Land?|Candy Land: The Great Lollipop Adventure|Candy Land: The Movie|Sugar Rush|Gumdrop Kingdom|It was released straight to video.
m|In the older rules, what happens when you land on a licorice space?|You lose your next turn|You move back to the start|You win a bonus card|You swap with a rival|Later editions changed the rule.
m|Which gumdrop monster lives in the Gumdrop Mountains?|Jolly|Gloppy|Plumpy|Duke of Swirl|He is a friendly creature made of gumdrops.
m|What is the name of the molasses (later chocolate) monster in Candy Land?|Gloppy|Jolly|Plumpy|Mr. Mint|He lives in the swamp that slows players down.
m|How many players can play classic Candy Land?|Two to four|Exactly two|Up to eight|Only one|Each player has a gingerbread pawn.
h|Which troll-like character waits by the Gingerbread Plum Tree?|Plumpy|Jolly|Gloppy|Mr. Mint|He was part of the 1984 cast of characters.
@Chutes and Ladders|tabletop|Snakes_and_Ladders
e|Which company published Chutes and Ladders in the United States in 1943?|Milton Bradley|Parker Brothers|Hasbro|Ideal|Hasbro owns it today.
e|What do ladders do in Chutes and Ladders?|Carry you up to a higher square|Send you back to start|Let you spin again|Freeze the other player|Land on the bottom rung to climb.
e|What happens when you land at the top of a chute?|You slide down to a lower square|You climb to the top|You win immediately|You lose the game|Some chutes drop you a long way.
e|Which square do you need to reach to win Chutes and Ladders?|100|50|64|120|The board is a ten-by-ten grid.
e|In the pictures on the board, what sends a child up a ladder?|A good deed|A lucky spin|A secret password|A wrong answer|The game was designed to teach right from wrong.
e|And what sends a child sliding down a chute?|Misbehaving|Spinning a six|Being first|Landing on a corner|Pictures of naughty behavior sit at the top of each chute.
e|Which animals are the chutes replacing from the older game?|Snakes|Spiders|Rats|Eels|The older game is called Snakes and Ladders.
e|Is Chutes and Ladders a game of skill or of chance?|Pure chance|Mostly skill|Pure skill|Memory|Players never make a decision.
e|Which company owns Chutes and Ladders today?|Hasbro|Mattel|Ravensburger|Pressman|Hasbro bought Milton Bradley in 1984.
m|What did reaching the final square represent in the Indian original?|Moksha, or spiritual liberation|Becoming a king|Winning a war|The monsoon arriving|Ladders stood for virtues and snakes for vices.
m|In the Indian original, what did the ladders stand for?|Virtues|Vices|Kings|Seasons|The snakes stood for vices such as greed and anger.
m|During which era did Snakes and Ladders become popular in England?|The Victorian era|The Tudor era|The Roaring Twenties|The Middle Ages|It arrived in the 1890s.
@The Jungle Book|movies|The_Jungle_Book_(1967_film)
e|Which snake hypnotizes Mowgli in Disney's The Jungle Book?|Kaa|Shere Khan|Nagini|Sir Hiss|His song is "Trust in Me".
e|Who wrote the stories collected in The Jungle Book?|Rudyard Kipling|Lewis Carroll|Mark Twain|Charles Dickens|The book was published in 1894.
e|What kind of animal is Bagheera?|A black panther|A tiger|A bear|A wolf|He looks after Mowgli.
e|Which tiger is the villain of The Jungle Book?|Shere Khan|Rajah|Tigger|Kaa|He is terrified of fire.
m|Which actor voiced Kaa in the 1967 Disney film?|Sterling Holloway|Phil Harris|George Sanders|Louis Prima|He also voiced Winnie the Pooh.
m|Who voiced Kaa in the 2016 live-action Jungle Book?|Scarlett Johansson|Lupita Nyong'o|Cate Blanchett|Emma Stone|Andy Serkis's 2018 Mowgli cast Cate Blanchett as Kaa.
m|Which song does Baloo sing to Mowgli?|The Bare Necessities|I Wan'na Be Like You|Trust in Me|Colonel Hathi's March|It was nominated for an Oscar.
@Monopoly|tabletop|Monopoly_(game)
e|What color are the houses in classic Monopoly?|Green|Red|Blue|White|Four houses can be swapped for a hotel.
e|What color are the hotels in classic Monopoly?|Red|Green|Gold|Blue|A hotel is the most you can build on a property.
e|What must you own before you can build houses?|Every property in a color group|Two railroads|A utility|Boardwalk|Owning the full set is called a monopoly.
e|What are the two card decks in Monopoly?|Chance and Community Chest|Luck and Fortune|Bank and Jail|Fate and Fortune|Each deck has sixteen cards.
e|Which utility goes with the Electric Company?|Water Works|Gas Company|Phone Company|Power Plant|Utility rent depends on your dice roll.
m|How many spaces are on a standard Monopoly board?|40|36|44|52|Each side has nine spaces plus the corners.
m|How many color groups of properties are there?|Eight|Six|Seven|Ten|Two groups have only two properties.
m|How much do you pay to get out of jail early?|$50|$100|$20|$200|You can also roll doubles or use a card.
h|What is the name of the policeman on the Go to Jail space?|Officer Edgar Mallory|Officer Barbrady|Sergeant Pennybags|Officer Dibble|The jailed man is known as Jake the Jailbird.
h|Which company bought Parker Brothers in 1991?|Hasbro|Mattel|Milton Bradley|Tonka|Tonka owned Parker Brothers just before the sale.
@Clue|tabletop|Cluedo
e|Which Clue suspect is a military officer?|Colonel Mustard|Mr. Green|Professor Plum|Mrs. Peacock|His token is yellow.
e|Which Clue suspect's token is red?|Miss Scarlet|Mrs. Peacock|Mrs. White|Colonel Mustard|She is often the first player to move.
e|Which Clue suspect is an academic?|Professor Plum|Colonel Mustard|Mr. Green|Mrs. White|His token is purple.
e|Which Clue suspect's token is blue?|Mrs. Peacock|Miss Scarlet|Mrs. White|Mr. Green|She is an aristocrat in most versions.
e|How many suspects are in classic Clue?|Six|Five|Eight|Ten|There are also six weapons and nine rooms.
e|What three things must an accusation name?|A suspect, a weapon and a room|A suspect, a motive and a time|A weapon, a room and a time|Two suspects and a room|The answer is hidden in the case file envelope.
e|Where are the three solution cards kept during the game?|In a secret envelope|Under the board|In the dealer's hand|In the Library|Nobody looks until someone makes an accusation.
m|Which suspect replaced Mrs. White in 2016?|Dr. Orchid|Miss Peach|Madame Rose|Lady Lavender|Dr. Orchid is a scientist and Mr. Boddy's adopted daughter.
m|Which room has a secret passage to the Kitchen?|The Study|The Lounge|The Hall|The Library|The other passage links the Lounge and the Conservatory.
m|Which room has a secret passage to the Conservatory?|The Lounge|The Study|The Ballroom|The Dining Room|Taking a passage uses your whole move.
m|Which actor plays Professor Plum in the 1985 Clue movie?|Christopher Lloyd|Martin Mull|Michael McKean|Tim Curry|Lloyd also played Doc Brown that year.
m|Which actor plays Colonel Mustard in the 1985 Clue movie?|Martin Mull|Christopher Lloyd|Michael McKean|Tim Curry|The film had three alternate endings.
h|Who directed the 1985 Clue movie?|Jonathan Lynn|John Landis|John Hughes|Rob Reiner|He later directed My Cousin Vinny.
h|Which actress plays Miss Scarlet in the 1985 Clue movie?|Lesley Ann Warren|Eileen Brennan|Madeline Kahn|Colleen Camp|Eileen Brennan plays Mrs. Peacock.
`;
function parseFacts(text){let source,category,page;return text.trim().split('\n').filter(Boolean).flatMap(line=>{
 if(line.startsWith('@')){[source,category,page]=line.slice(1).split('|');return [];}
 const[difficulty,q,answer,a,b,c,explanation]=line.split('|');
 return [{source,category,difficulty:levels[difficulty],q,answers:[answer,a,b,c],correct:0,explanation,provenance:'v0.52 warp-zone trivia; subject page linked for review',citations:[{label:source,url:'https://en.wikipedia.org/wiki/'+page}]}];
});}
const WARP_TRIVIA=parseFacts(FACTS);
const WARP_TRIVIA_THEMES=[
 {tag:'smb3',title:'Grass Land to Dark Land · Super Mario Bros. 3',icon:'🍃',source:'Super Mario Bros. 3',description:'Super Leaves, Koopalings, airships, Warp Whistles and the World 1 map.',sources:['Super Mario Bros. 3']},
 {tag:'candyland',title:'Gumdrop Pass · Candy Land',icon:'🍭',source:'Candy Land',description:'King Kandy, Princess Lolly, Lord Licorice and the colour cards that ruin friendships.',sources:['Candy Land']},
 {tag:'chutes',title:'Up the Ladder · Chutes and Ladders & Kaa',icon:'🪜',source:'Chutes and Ladders',description:'Good deeds, bad deeds, Snakes and Ladders history and the python waiting on the last square.',sources:['Chutes and Ladders','The Jungle Book']},
 {tag:'monopoly',title:'Do Not Pass Go · Monopoly',icon:'🎩',source:'Monopoly',description:'Houses, hotels, railroads, jail and Rich Uncle Pennybags.',sources:['Monopoly']},
 {tag:'clue',title:'In the Library · Clue',icon:'🔎',source:'Clue',description:'Six suspects, six weapons, nine rooms and the 1985 movie.',sources:['Clue']}
];
Object.assign(exports,{WARP_TRIVIA,WARP_TRIVIA_THEMES});
