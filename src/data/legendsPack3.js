// Nov 3 roster additions from the owner (ROADMAP N2): wrestling legends (Mick Foley with his three personas as
// "Mick Foley · <persona>", ready to become outfits, K8), the Whitest Kids U' Know, the Comedy Bang! Bang! / Doughboys
// crew, the Birthday Boys, the rest of Reno 911!, all of Idiocracy, Beavis and Butt-Head, ad mascots and the Klumps.
// Same row format as legendsPack2.js: [id, name, source, icon, photo page, perk, flavour line, extras].
// (Pee-wee Herman was already in the roster as `peewee`.)
const PERKS3={
 explorer:'Explorer: +1 point at every landmark.',
 competitor:'Competitor: +1 point on every minigame win.',
 survivor:'Survivor: starts every run with a shield.',
 scavenger:'Scavenger: bonus spaces pay +1 extra.'};
const ROWS3=[
 // ---- WWE
 ['stone-cold','Stone Cold Steve Austin','WWE','🍺','Stone Cold Steve Austin','competitor','Opens a can of whoop-ass, then two beers. And that’s the bottom line.'],
 ['the-undertaker','The Undertaker','WWE','⚰️','The Undertaker','survivor','Rest in peace. Sits bolt upright after every penalty.'],
 ['mick-foley','Mick Foley','WWE','🧦','Mick Foley','survivor','Thrown off the Hell in a Cell, got back up. Have a nice day!'],
 ['mick-foley-mankind','Mick Foley · Mankind','WWE','🧦','Mick Foley','survivor','Mr. Socko says hello. Survives what nobody should.'],
 ['mick-foley-cactus-jack','Mick Foley · Cactus Jack','WWE','🌵','Mick Foley','competitor','Bang bang! Barbed wire, thumbtacks, and a minigame win.'],
 ['mick-foley-dude-love','Mick Foley · Dude Love','WWE','☮️','Mick Foley','explorer','Oh, it feels so good to be the Dude. Grooves into every landmark.'],
 // ---- The Whitest Kids U' Know
 ['wk-trevor-moore','Trevor Moore','The Whitest Kids U’ Know','🎸','Trevor Moore (comedian)','competitor','Writes a song about every win, usually about the Founding Fathers.'],
 ['wk-sam-brown','Sam Brown','The Whitest Kids U’ Know','🧢','Sam Brown (comedian)','explorer','Wanders into every sketch and every landmark.'],
 ['wk-zach-cregger','Zach Cregger','The Whitest Kids U’ Know','🎬','Zach Cregger','survivor','Later made Barbarian. Knows exactly what’s in the basement.'],
 ['wk-timmy-williams','Timmy Williams','The Whitest Kids U’ Know','🥸','Timmy Williams (comedian)','scavenger','Finds a bonus in every bit.'],
 ['wk-darren-trumeter','Darren Trumeter','The Whitest Kids U’ Know','🕶️','Darren Trumeter','competitor','The fifth Kid. Quietly wins.'],
 // ---- Comedy Bang! Bang! and Doughboys
 ['scott-aukerman','Scott Aukerman','Comedy Bang! Bang!','🎙️','Scott Aukerman','explorer','Your host. Introduces every landmark like a very special guest.'],
 ['paul-f-tompkins','Paul F. Tompkins','Comedy Bang! Bang!','🎩','Paul F. Tompkins','competitor','Arrives as Cake Boss, Andrew Lloyd Webber or Ice-T. Wins as all of them.'],
 ['lauren-lapkus','Lauren Lapkus','Comedy Bang! Bang!','🙃','Lauren Lapkus','scavenger','Every improv scene ends with a surprise bonus.'],
 ['nick-wiger','Nick Wiger','Doughboys','🍔','Nick Wiger','scavenger','Rates every chain restaurant out of five forks. Takes the bonus fries.'],
 ['mike-mitchell','Mike Mitchell','Doughboys','🍕','Mike Mitchell (comedian)','competitor','The Doughboys’ other half. Eats, then wins.'],
 // ---- The Birthday Boys
 ['bb-mike-hanford','Mike Hanford','The Birthday Boys','🎂','The Birthday Boys','competitor','Birthday Boy. Blows out the candles and the competition.'],
 ['bb-tim-kalpakis','Tim Kalpakis','The Birthday Boys','🎈','The Birthday Boys','explorer','Birthday Boy. Turns up at every party landmark.'],
 ['bb-jefferson-dutton','Jefferson Dutton','The Birthday Boys','🎁','The Birthday Boys','scavenger','Birthday Boy. Always brings a present.'],
 ['bb-matt-kowalick','Matt Kowalick','The Birthday Boys','🥳','The Birthday Boys','survivor','Birthday Boy. Survives the worst party games.'],
 ['bb-chris-vanartsdalen','Chris VanArtsdalen','The Birthday Boys','🎉','The Birthday Boys','competitor','Birthday Boy. Wins the sack race.'],
 ['bb-dave-ferguson','Dave Ferguson','The Birthday Boys','🍰','The Birthday Boys','explorer','Birthday Boy. Has a slice at every stop.'],
 ['bb-mike-mitchell','Mike Mitchell (Birthday Boy)','The Birthday Boys','🎊','Mike Mitchell (comedian)','scavenger','Birthday Boy before he was a Doughboy.'],
 // ---- the rest of Reno 911!
 ['reno-clementine-johnson','Clementine Johnson','Reno 911!','🚓','Wendi McLendon-Covey','survivor','Deputy Johnson. Has seen everything twice.'],
 ['reno-raineesha-williams','Raineesha Williams','Reno 911!','👮🏾‍♀️','Niecy Nash','competitor','Deputy Williams. Takes no nonsense, takes the win.'],
 ['reno-james-garcia','James Oswaldo Garcia','Reno 911!','🚔','Carlos Alazraqui','explorer','Deputy Garcia. Patrols every landmark.'],
 ['reno-sven-jones','Sven Jones','Reno 911!','📸','Cedric Yarbrough','scavenger','Deputy Jones. Photographs the bonus as evidence.'],
 ['reno-cherisha-kimball','Cherisha Kimball','Reno 911!','🍼','Mary Birdsong','survivor','Deputy Kimball. Survives on pure chaos.'],
 ['reno-terry','Terry Bernardino','Reno 911!','🛼','Nick Swardson','explorer','Roller-skating Terry. Glides into every landmark, uninvited.'],
 // ---- Idiocracy
 ['idio-not-sure','Not Sure','Idiocracy','🤷','Luke Wilson','competitor','Joe Bauers, the most average man alive. Now the smartest. Tattoo says Not Sure.'],
 ['idio-frito','Frito Pendejo','Idiocracy','🍟','Dax Shepard','scavenger','Lawyer, went to Costco. Grabs every bonus.'],
 ['idio-rita','Rita','Idiocracy','💋','Maya Rudolph','explorer','Woke up 500 years later. Still the sharpest one in the room.'],
 ['idio-upgrayedd','Upgrayedd','Idiocracy','💎','Idiocracy','survivor','Spelled with two D’s for a double dose of this pimping. Got arrested for it.'],
 ['idio-dr-lexus','Dr. Lexus','Idiocracy','🩺','Justin Long','scavenger','Diagnoses you fancy. Takes the bonus anyway.'],
 ['idio-camacho','President Camacho','Idiocracy','🎤','Terry Crews','competitor','Five-time Ultimate Smackdown champion, porn superstar and President. Shoots the machine gun.'],
 ['idio-cabinet','Camacho’s Cabinet','Idiocracy','🏛️','Idiocracy','survivor','Secretary of State, of Defense, of Energy: the best the country had.'],
 ['idio-beef-supreme','Beef Supreme','Idiocracy','🥩','Idiocracy','competitor','Rehabilitation host. Monster truck driver. Unbeatable.'],
 // ---- Beavis and Butt-Head
 ['beavis','Beavis','Beavis and Butt-Head','🔥','Beavis and Butt-Head','competitor','Fire! Fire! Becomes the Great Cornholio after a sugar-high win.'],
 ['butt-head','Butt-Head','Beavis and Butt-Head','😏','Beavis and Butt-Head','explorer','Huh huh. This landmark is cool.'],
 // ---- ad mascots and the Klumps
 ['joe-camel','Joe Camel','Camel (cigarette)','🐪','Joe Camel','explorer','Smooth character. Very cool, very banned.'],
 ['mac-tonight','Mac Tonight','McDonald’s','🌙','Mac Tonight','scavenger','When the moon hits your eye like a big pizza pie. Brings a bonus burger.'],
 ['sherman-klump','Sherman Klump','The Nutty Professor','🧪','The Nutty Professor (1996 film)','scavenger','Professor of chemistry. Has a formula for every bonus.'],
 ['buddy-love','Buddy Love','The Nutty Professor','😎','The Nutty Professor (1996 film)','competitor','Sherman’s other self. Too smooth to lose, wears off at the worst moment.'],
 // ---- Vanderpump Rules (Nov 14, owner: 'add all vanderpump rules characters')
 ['vpr-lisa-vanderpump','Lisa Vanderpump','Vanderpump Rules','🌹','Lisa Vanderpump','scavenger','Owns SUR, a pink rosé empire and everyone’s rent. Sips, smiles, takes the bonus.'],
 ['vpr-ken-todd','Ken Todd','Vanderpump Rules','🎩','Vanderpump Rules','explorer','Lisa’s husband. Wanders off to every landmark, then can’t remember the name of it.'],
 ['vpr-giggy','Giggy','Vanderpump Rules','🐶','Vanderpump Rules','survivor','Lisa’s hairless Pomeranian. Wears a little outfit. Outlives everyone’s relationships.'],
 ['vpr-stassi-schroeder','Stassi Schroeder','Vanderpump Rules','👑','Stassi Schroeder','competitor','The original queen of SUR. Hosts a podcast about every win.'],
 ['vpr-katie-maloney','Katie Maloney','Vanderpump Rules','🍷','Katie Maloney','scavenger','Pump Rules OG, Something About Her sandwiches. Grabs the bonus with pinot.'],
 ['vpr-kristen-doute','Kristen Doute','Vanderpump Rules','🕵️','Kristen Doute','explorer','Investigates every landmark like it’s a Miami girl.'],
 ['vpr-jax-taylor','Jax Taylor','Vanderpump Rules','💪','Jax Taylor','competitor','Male model, bartender, liar. Swears he didn’t cheat on the minigame.'],
 ['vpr-tom-sandoval','Tom Sandoval','Vanderpump Rules','🎸','Tom Sandoval','competitor','Mustache, Most Extras, a lot of extras. Plays the board like it’s a TomTom grand opening.'],
 ['vpr-tom-schwartz','Tom Schwartz','Vanderpump Rules','🍕','Vanderpump Rules','survivor','Lovable himbo of Schwartz & Sandy’s. Shrugs off every penalty.'],
 ['vpr-scheana-shay','Scheana Shay','Vanderpump Rules','🎤','Scheana Shay','explorer','Good as Gold. Sings it at every landmark whether you asked or not.'],
 ['vpr-ariana-madix','Ariana Madix','Vanderpump Rules','🥪','Ariana Madix','survivor','Survived Scandoval and came out on top. Something About Her and a Love Island hosting gig.'],
 ['vpr-james-kennedy','James Kennedy','Vanderpump Rules','🎧','Vanderpump Rules','competitor','DJ James Kennedy. Drops a beat and a minigame win, then a rant.'],
 ['vpr-lala-kent','Lala Kent','Vanderpump Rules','💄','Lala Kent','scavenger','Give Them Lala. Takes the bonus and tells you about it.'],
 ['vpr-brittany-cartwright','Brittany Cartwright','Vanderpump Rules','🌽','Brittany Cartwright','explorer','Kentucky sweetheart. Excited to see every landmark, y’all.'],
 ['vpr-raquel-leviss','Raquel Leviss','Vanderpump Rules','🏆','Vanderpump Rules','survivor','Former pageant queen. The other half of Scandoval.'],
 ['vpr-peter-madrigal','Peter Madrigal','Vanderpump Rules','🍸','Vanderpump Rules','scavenger','SUR’s manager since forever. Comps you a bonus drink.'],
 ['vpr-brock-davies','Brock Davies','Vanderpump Rules','🏉','Vanderpump Rules','competitor','Rugby player, Scheana’s husband. Tackles the minigame.'],
 ['vpr-randall-emmett','Randall Emmett','Vanderpump Rules','🎬','Randall Emmett','scavenger','Movie producer. Has a part for you in a straight-to-video Bruce Willis movie.'],
 ['vpr-beau-clark','Beau Clark','Vanderpump Rules','🧔','Vanderpump Rules','survivor','Stassi’s husband. Steady, bearded, unbothered.'],
 ['vpr-max-boyens','Max Boyens','Vanderpump Rules','🍹','Vanderpump Rules','competitor','SUR bartender of the new wave. Shakes, pours, wins.'],
 ['vpr-brett-caprioni','Brett Caprioni','Vanderpump Rules','🍺','Vanderpump Rules','explorer','New-guy SUR server. Tours every landmark on his break.'],
 ['vpr-charli-burnett','Charli Burnett','Vanderpump Rules','🌸','Vanderpump Rules','scavenger','SUR server and Lala’s friend. Picks up the tips.'],
 ['vpr-dayna-kathan','Dayna Kathan','Vanderpump Rules','😂','Vanderpump Rules','competitor','Comedian waitress. Gets the last laugh and the win.'],
 ['vpr-billie-lee','Billie Lee','Vanderpump Rules','✨','Billie Lee','survivor','SUR hostess, actress and activist. Doesn’t take the drama.'],
 ['vpr-pandora-vanderpump','Pandora Vanderpump Sabo','Vanderpump Rules','👗','Vanderpump Rules','explorer','Lisa’s daughter. Grew up at every landmark Lisa owns.'],
 // ---- The Secret Lives of Mormon Wives (Nov 14, owner)
 ['mw-taylor-frankie-paul','Taylor Frankie Paul','The Secret Lives of Mormon Wives','📱','Taylor Frankie Paul','competitor','Started MomTok, soft-swung it into a scandal and a Hulu show.'],
 ['mw-demi-engemann','Demi Engemann','The Secret Lives of Mormon Wives','💅','The Secret Lives of Mormon Wives','scavenger','The bold one. Grabs every bonus and says what everyone was thinking.'],
 ['mw-jessi-ngatikaura','Jessi Ngatikaura','The Secret Lives of Mormon Wives','💇','The Secret Lives of Mormon Wives','survivor','Hair salon owner. Survived a very public DM scandal.'],
 ['mw-jen-affleck','Jen Affleck','The Secret Lives of Mormon Wives','🤰','The Secret Lives of Mormon Wives','explorer','Mom of three in her twenties. Tours every landmark with a stroller.'],
 ['mw-mikayla-matthews','Mikayla Matthews','The Secret Lives of Mormon Wives','🎀','The Secret Lives of Mormon Wives','scavenger','Young mom, cheerful chaos, a lot of kids in the background.'],
 ['mw-mayci-neeley','Mayci Neeley','The Secret Lives of Mormon Wives','😂','The Secret Lives of Mormon Wives','competitor','The funny one. Wins the minigame and the confessional.'],
 ['mw-whitney-leavitt','Whitney Leavitt','The Secret Lives of Mormon Wives','👼','The Secret Lives of Mormon Wives','survivor','MomTok’s self-declared good girl. Shrugs off every penalty with a prayer.'],
 ['mw-layla-taylor','Layla Taylor','The Secret Lives of Mormon Wives','🕶️','The Secret Lives of Mormon Wives','explorer','Moved away from Utah, came back for the drama.'],
 ['mw-miranda-mcwhorter','Miranda McWhorter','The Secret Lives of Mormon Wives','🌟','The Secret Lives of Mormon Wives','scavenger','Season two newcomer. Shows up with a bonus and a secret.'],
 ['mw-dakota-mortensen','Dakota Mortensen','The Secret Lives of Mormon Wives','🧢','The Secret Lives of Mormon Wives','competitor','Taylor’s on-again off-again. Very competitive about board games, apparently.'],
 ['mw-jordan-ngatikaura','Jordan Ngatikaura','The Secret Lives of Mormon Wives','👔','The Secret Lives of Mormon Wives','survivor','Jessi’s husband. Stays calm while the group chat burns.'],
 ['mw-zac-affleck','Zac Affleck','The Secret Lives of Mormon Wives','🩺','The Secret Lives of Mormon Wives','explorer','Jen’s husband, med student. Visits every landmark between rotations.'],
 ['mw-conner-leavitt','Conner Leavitt','The Secret Lives of Mormon Wives','🏀','The Secret Lives of Mormon Wives','competitor','Whitney’s husband. Plays to win.'],
 ['mw-marciano-brunette','Marciano Brunette','The Secret Lives of Mormon Wives','💪','The Secret Lives of Mormon Wives','scavenger','Fitness guy in Jessi’s DMs. Grabs the bonus and leaves.'],
 // ---- Weird Al (Nov 14, owner: 'add weird al to the game')
 ['weird-al','"Weird Al" Yankovic','UHF','🪗','"Weird Al" Yankovic','competitor','George Newman of Channel 62 and the king of the polka medley. Eat it, minigame.']
];
const NEW_CHARACTERS3=ROWS3.map(([id,name,source,icon,actor,perk,line,extra={}])=>({
 id,name,source,icon,actor,assetKey:'char:'+id,unlockAt:999,perkType:perk,perk:PERKS3[perk]||PERKS3.competitor,unlockPhrase:line,
 unlockHint:extra.hint||`Win minigames or visit a ${source} landmark to recruit ${name}.`
}));
Object.assign(exports,{NEW_CHARACTERS3,ROWS3});
