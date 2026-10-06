// Additional usable supplies. The uploaded catalog remains unchanged.
const TACTICAL_ITEMS=[
 ['mega-mushroom','Mega Mushroom','Super Mario','🍄','rollDouble',1,'Double this roll’s movement and grow your head for two personal turns.'],
 ['flux-overdrive','88 MPH Flux Overdrive','Back to the Future','⚡','rollDouble',1,'Double this roll’s movement.'],
 ['obey-remote','OBEY Remote','They Live','📺','slowOther',1,'Halve your opponent’s next roll. An attack ward blocks it.'],
 ['gremlin-grease','Gremlin Grease','Gremlins','🧴','slowOther',2,'Halve your opponent’s next two rolls. An attack ward blocks it.'],
 ['kamehameha-burst','Kamehameha Burst','Dragon Ball Z','💥','pushOther',5,'Push your opponent back up to five visited spaces. An attack ward blocks it.'],
 ['pac-power-pellet','Power Pellet','Pac-Man','🟡','ward',2,'Block the next two opponent item attacks.'],
 ['mib-neuralyzer','Neuralyzer','Men in Black','🔦','eraseBoost',1,'Remove your opponent’s stored movement boosts, double/triple rolls and loaded dice. An attack ward blocks it.'],
 ['taskmaster-loaded-die','Taskmaster’s Loaded Die','Taskmaster','🎲','rollFloor',4,'Your base die is at least four this turn. Bonuses still apply.'],
 ['bond-loaded-dice','Bond’s Loaded Dice','James Bond','🎲','rollFloor',5,'Your base die is at least five this turn.'],
 ['home-pack-whistle','The Home Pack Whistle','Home','🐾','cleanse',1,'Clear half-roll effects and gain +2 movement on this roll.'],
 ['soup-nazi-ladle','No Boost For You Ladle','Seinfeld','🥄','siphonBoost',1,'Take up to three of your opponent’s stored bonus spaces. An attack ward blocks it.'],
 ['fight-milk-coupon','Fight Milk Coupon','Always Sunny','🥛','bonusRisk',5,'Next minigame reward +5, but halve your next roll after this one.'],
 ['leeloo-rescue','Leeloo’s Rescue Beacon','The Fifth Element','🪪','catchup',4,'Gain +4 movement this roll when behind in points; otherwise +2.'],
 ['time-chamber-pass','Time Chamber Pass','Dragon Ball Z','⌛','rollDouble',1,'Double movement this roll, then halve your following roll.'],
 ['michael-expense-card','Dunder Mifflin Expense Card','The Office','💳','insurance',1,'Gain one attack ward and two point-penalty shields.'],
 ['spagett-ambush','Spagett Ambush','Tim & Eric','🍅','pushOther',3,'Push your opponent back up to three visited spaces. An attack ward blocks it.'],
 ['frogger-quarter','George’s Frogger Quarter','Seinfeld','🪙','reroll',2,'Gain two Lucky Rolls; they keep the better of two dice.'],
 ['doom-encore','Black Sabbath Encore','Black Sabbath','🎸','bonusRisk',7,'Next minigame reward +7, with a half roll after this turn.'],
 ['capsule-rescue-kit','Capsule Rescue Kit','Dragon Ball Z','💊','cleanse',1,'Clear half-roll effects and gain +2 movement this roll.'],
 ['clockwork-caddy','Happy’s Caddy','Happy Gilmore','⛳','rollFloor',3,'Your base die is at least three this turn.'],
].map(([id,name,source,icon,kind,value,desc])=>({id,name,source,icon,kind,value,desc}));

const CASINO_THEMES=[
 {id:'bond',source:'Casino Royale',title:'Casino Royale',tag:'007 · HIGH STAKES',color:'#104f48'},
 {id:'vegas',source:'Elvis Presley',title:'Viva Las Vegas',tag:'THE KING’S TABLE',color:'#643959'},
 {id:'hangover',source:'The Hangover',title:'The Wolfpack Casino',tag:'ONE VERY STRANGE NIGHT',color:'#235757'},
 {id:'quark',source:'Star Trek',title:'Quark’s Lucky Table',tag:'THE HOUSE ALWAYS TAKES A CUT',color:'#40503a'},
];

// Reviewable facts for the two newly requested casino themes. Article links
// are citation leads; live source retrieval was unavailable during this build.
const CASINO_TRIVIA=[
 ['Elvis Presley','music','Elvis_Presley','What nickname is Elvis Presley widely known by?','The King of Rock and Roll','The Godfather of Soul','The Boss','The Piano Man','Elvis is widely known as the King of Rock and Roll.'],
 ['Elvis Presley','music','Viva_Las_Vegas','Who stars opposite Elvis Presley in the 1964 film Viva Las Vegas?','Ann-Margret','Doris Day','Audrey Hepburn','Julie Andrews','Ann-Margret plays Rusty Martin opposite Elvis as Lucky Jackson.'],
 ['Elvis Presley','music','Graceland','What is the name of Elvis Presley’s Memphis home?','Graceland','Paisley Park','Neverland Ranch','The Dakota','Graceland is Elvis Presley’s Memphis estate.'],
 ['The Hangover','movies','The_Hangover','In The Hangover, what is the missing groom’s first name?','Doug','Alan','Stu','Phil','Doug Billings is the groom the friends are trying to find.'],
 ['The Hangover','movies','The_Hangover','Which boxer appears as himself in The Hangover?','Mike Tyson','Muhammad Ali','George Foreman','Evander Holyfield','Mike Tyson appears as himself; the group has taken his tiger.'],
 ['The Hangover','movies','The_Hangover','Which Las Vegas hotel do the friends check into in The Hangover?','Caesars Palace','The Bellagio','The Venetian','Mandalay Bay','The group checks into Caesars Palace before the bachelor-party night.'],
].map(([source,category,page,q,answer,b,c,d,explanation])=>({source,category,q,answers:[answer,b,c,d],correct:0,difficulty:'medium',explanation,citations:[{label:source,url:'https://en.wikipedia.org/wiki/'+page}],provenance:'authored casino-theme fact; reference article linked for review'}));

Object.assign(exports,{TACTICAL_ITEMS,CASINO_THEMES,CASINO_TRIVIA});