// v0.44 roster expansion. Photographs are looked up from each `actor` page at
// runtime; drop your own cropped heads into assets/portraits/ to override them
// (see assets/portraits/README.txt).
const PERKS={
 explorer:'Explorer: +1 point at every landmark.',
 competitor:'Competitor: +1 point on every minigame win.',
 scavenger:'Scavenger: a bonus supply at each realm gate.',
 survivor:'Survivor: starts with a penalty shield.'
};
// [id, name, source, icon, actor page, perk, flavour line, extras]
const ROWS=[
 ['chuck-norris','Chuck Norris','Chuck Norris','🥋','Chuck Norris','competitor','The board does not roll Chuck Norris. Chuck Norris rolls the board.'],
 ['ranger-red','Jason · Red Ranger','Power Rangers','🔴','Austin St. John','competitor','It’s morphin’ time!'],
 ['ranger-black','Zack · Black Ranger','Power Rangers','⚫','Walter Emanuel Jones','explorer','Hip-hop kido and a perfect sense of direction.'],
 ['ranger-blue','Billy · Blue Ranger','Power Rangers','🔵','David Yost','scavenger','Billy built a gadget for this. Billy always built a gadget.'],
 ['ranger-yellow','Trini · Yellow Ranger','Power Rangers','🟡','Thuy Trang','survivor','Sabre-toothed Tiger Zord reporting for defense.'],
 ['ranger-pink','Kimberly · Pink Ranger','Power Rangers','🩷','Amy Jo Johnson','explorer','Pterodactyl flyover: nothing on the map stays hidden.'],
 ['mel-gibson','Mel Gibson','Mel Gibson','🛡️','Mel Gibson','competitor','Mad Max, Martin Riggs, William Wallace. All of them hate losing.'],
 ['mk-kitana','Kitana','Mortal Kombat','🪭','Kitana','explorer','Edenian royalty. Her fans open every door.'],
 ['mk-mileena','Mileena','Mortal Kombat','🗡️','Mileena','competitor','Sai in hand, smile on the way.'],
 ['mk-jax','Jax','Mortal Kombat','🦾','Jax (Mortal Kombat)','competitor','Metal arms. Zero patience.'],
 ['mk-kano','Kano','Mortal Kombat','👁️','Kano (Mortal Kombat)','scavenger','Kano is quite good at finding things that were not his.'],
 ['mk-shang-tsung','Shang Tsung','Mortal Kombat','💀','Shang Tsung','scavenger','Hands you a souvenir. Keeps the soul as a deposit.'],
 ['mk-reptile','Reptile','Mortal Kombat','🦎','Reptile (Mortal Kombat)','survivor','Cloaks, hisses and avoids the blame.'],
 ['mk-shao-kahn','Shao Kahn','Mortal Kombat','⚔️','Shao Kahn','competitor','Emperor of Outworld. Takes the trophy as tribute.'],
 ['mk-kung-lao','Kung Lao','Mortal Kombat','🎩','Kung Lao','explorer','Razor hat. Remarkable sense of direction.'],
 ['mk-baraka','Baraka','Mortal Kombat','🔪','Baraka (Mortal Kombat)','survivor','Blades out. Nothing gets through.'],
 ['mk-ermac','Ermac','Mortal Kombat','🟥','Ermac','survivor','Many souls, one shield.'],
 ['mk-noob-saibot','Noob Saibot','Mortal Kombat','🌑','Noob Saibot','scavenger','Steps out of the shadows with something useful.'],
 ['jesus','Jesus','South Park','✝️','Jesus','survivor','Turns water into a penalty shield. Pays rent in miracles.'],
 ['nsync-justin','Justin · *NSYNC','*NSYNC','🎤','Justin Timberlake','explorer','Bringing sexy back to every landmark.'],
 ['nsync-jc','JC · *NSYNC','*NSYNC','🎶','JC Chasez','explorer','Falsetto. Every landmark is a stage.'],
 ['nsync-chris','Chris · *NSYNC','*NSYNC','🕺','Chris Kirkpatrick','scavenger','Curly-haired and resourceful.'],
 ['nsync-joey','Joey · *NSYNC','*NSYNC','🍕','Joey Fatone','competitor','Dancer, comedian, born competitor.'],
 ['nsync-lance','Lance · *NSYNC','*NSYNC','🚀','Lance Bass','survivor','Has been to training for space. Takes the penalties.'],
 ['bsb-nick','Nick · Backstreet Boys','Backstreet Boys','🎙️','Nick Carter','competitor','Larger than life. Wins as loudly as possible.'],
 ['bsb-aj','AJ · Backstreet Boys','Backstreet Boys','🧢','AJ McLean','explorer','Bad boy of the group. Knows every venue.'],
 ['bsb-howie','Howie · Backstreet Boys','Backstreet Boys','🎵','Howie Dorough','scavenger','Howie D always has something in his pockets.'],
 ['bsb-brian','Brian · Backstreet Boys','Backstreet Boys','🎸','Brian Littrell','survivor','Hits the high note and dodges the penalty.'],
 ['bsb-kevin','Kevin · Backstreet Boys','Backstreet Boys','🎬','Kevin Richardson (singer)','explorer','The elder statesman of every landmark.'],
 ['tupac','Tupac Shakur','Tupac Shakur','🎧','Tupac Shakur','competitor','All eyez on the scoreboard.'],
 ['bob-marley','Bob Marley','Bob Marley','🌿','Bob Marley','survivor','One love. Every penalty gets a shield.'],
 ['stevie-wonder','Stevie Wonder','Stevie Wonder','🎹','Stevie Wonder','scavenger','Superstition says there is a supply at every gate.'],
 ['beatles-john','John Lennon','The Beatles','🕶️','John Lennon','explorer','Imagine every landmark visited.'],
 ['beatles-paul','Paul McCartney','The Beatles','🎸','Paul McCartney','competitor','Can’t buy you love. Can win the minigame.'],
 ['beatles-george','George Harrison','The Beatles','🪕','George Harrison','scavenger','Something in the way he finds supplies.'],
 ['beatles-ringo','Ringo Starr','The Beatles','🥁','Ringo Starr','survivor','Gets by with a little help from a shield.'],
 // Special unlocks.
 ['satan','Satan','South Park','😈','Satan','scavenger','Collects a favor at every gate. Pays in sulphur.',{unlockBy:'horror',hint:'Only found in the Level IV horror route: his portal is hidden in Hell.'}],
 ['bond-64','James Bond · GoldenEye 64','GoldenEye','🕹️','','competitor','Four-player split screen. Proximity mines. Slappers only.',{unlockBy:'character-win',requires:'bond-brosnan',hint:'Play as James Bond · Pierce Brosnan and win a minigame to unlock his N64 self.'}]
];
const NEW_CHARACTERS=ROWS.map(([id,name,source,icon,actor,perk,line,extra={}])=>({
 id,name,source,icon,actor,assetKey:'char:'+id,unlockAt:999,perkType:perk,perk:PERKS[perk],unlockPhrase:line,
 unlockHint:extra.hint||`Win minigames or visit a ${source} landmark to recruit ${name}.`,
 ...(extra.unlockBy?{unlockBy:extra.unlockBy}:{}),...(extra.requires?{requires:extra.requires}:{})
}));
// Level IV characters (found only in the horror route).
const HORROR_IDS=['freddy','jason','michael-myers','ghostface','pinhead','leatherface','chucky','jigsaw','satan'];
const SOURCES=[
 ['Chuck Norris','film'],['Power Rangers','film'],['Mel Gibson','director'],['The Beatles','music'],['*NSYNC','music'],
 ['Backstreet Boys','music'],['Tupac Shakur','music'],['Bob Marley','music'],['Stevie Wonder','music']
];
Object.assign(exports,{NEW_CHARACTERS,HORROR_IDS,PERKS,SOURCES});
