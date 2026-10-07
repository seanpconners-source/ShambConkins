// The James Bond warp zone (Volcano Lair, src/warpBoards.js 'bond-lair'): its villain roster.
// Arriving in the lair recruits a random movie Bond (src/data/movieBonds.js) for each player; beating Blofeld
// there recruits one random Bond villain that neither player has yet (pickLairVillain).
const {PERKS}=require("src/data/legendsPack.js");

// Villains that only join by beating the lair boss. [id, name, source film, icon, actor (photo lookup), perk, line]
const LAIR_VILLAIN_ROWS=[
 ['zorin','Max Zorin','A View to a Kill','🐎','Christopher Walken','competitor','Nobody ever said this was going to be easy.'],
 ['hugo-drax','Hugo Drax','Moonraker','🚀','Michael Lonsdale','explorer','Look after Mr. Bond. See that some harm comes to him.'],
 ['rosa-klebb','Rosa Klebb','From Russia with Love','👞','Lotte Lenya','survivor','Training is useful, but there is no substitute for experience.'],
 ['red-grant','Red Grant','From Russia with Love','🎻','Robert Shaw','competitor','You may know the right wines, but you’re the one on your knees.'],
 ['kananga','Dr. Kananga','Live and Let Die','🐊','Yaphet Kotto','scavenger','Names is for tombstones, baby.'],
 ['largo','Emilio Largo','Thunderball','🦈','Adolfo Celi','scavenger','Vargas does not drink, does not smoke, does not make love.'],
 ['elliot-carver','Elliot Carver','Tomorrow Never Dies','📰','Jonathan Pryce','explorer','The distance between insanity and genius is measured only by success.'],
 ['franz-sanchez','Franz Sanchez','Licence to Kill','🦎','Robert Davi','scavenger','Loyalty is more important to me than money.'],
 ['nick-nack','Nick Nack','The Man with the Golden Gun','🍾','Hervé Villechaize','explorer','Welcome to the funhouse.'],
 ['may-day','May Day','A View to a Kill','🪂','Grace Jones','competitor','Bond. James Bond? Oh, the tall one.'],
 ['renard','Renard','The World Is Not Enough','🔥','Robert Carlyle','survivor','There is no point in living if you can’t feel alive.'],
 ['safin','Lyutsifer Safin','No Time to Die','🎭','Rami Malek','survivor','We both eliminate people to make the world a better place.']
];
const LAIR_VILLAIN_CHARACTERS=LAIR_VILLAIN_ROWS.map(([id,name,source,icon,actor,perk,line])=>({id,name,source,icon,actor,assetKey:'char:'+id,unlockAt:999,
 perkType:perk,perk:PERKS[perk],unlockPhrase:line,unlockBy:'boss',unlockHint:'Beat Blofeld in the Bond Volcano Lair warp zone: he hands over one Bond villain you do not have yet.'}));
// Every Bond villain the lair boss can hand out: the classic ones already in the roster plus the lair-only ones.
const BOND_VILLAIN_IDS=['blofeld','goldfinger','oddjob','bond-jaws','le-chiffre','scaramanga','dr-no','silva','trevelyan','xenia',...LAIR_VILLAIN_ROWS.map(r=>r[0])];
// A villain nobody at the table owns yet (by identity, so Jaws counts once), or null when they have them all.
// owned: the character ids each player can already pick; canRecruit: (id)=>bool from src/profile.js.
function pickLairVillain(owned,canRecruit,random=Math.random){
 const {characterIdentity}=require("src/characters.js");// lazy: characters.js loads the catalog, which loads this file
 const have=new Set(owned.map(characterIdentity));
 const pool=BOND_VILLAIN_IDS.filter(id=>!have.has(characterIdentity(id))&&canRecruit(id));
 return pool.length?pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]:null;
}
Object.assign(exports,{LAIR_VILLAIN_ROWS,LAIR_VILLAIN_CHARACTERS,BOND_VILLAIN_IDS,pickLairVillain});
