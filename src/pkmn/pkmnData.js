// Pokémon battle data in the style of the first generation (Red/Blue/Yellow):
// the 15 original types and their chart, classic moves plus pop-culture signature
// moves, abilities, and a deterministic "species" for every character in the game
// (types, base stats, moves by level, ability, catch rate). Nothing here touches the DOM.
const {CHARACTERS,character,characterIdentity}=require("src/characters.js");
const {hash}=require("src/utils.js");

const TYPES=['NORMAL','FIRE','WATER','ELECTRIC','GRASS','ICE','FIGHTING','POISON','GROUND','FLYING','PSYCHIC','BUG','ROCK','GHOST','DRAGON'];
// Gen 1 split: the type decides physical (ATTACK/DEFENSE) or special (SPECIAL).
const PHYSICAL=new Set(['NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST']);
const CHART={
 NORMAL:{ROCK:.5,GHOST:0},
 FIRE:{FIRE:.5,WATER:.5,GRASS:2,ICE:2,BUG:2,ROCK:.5,DRAGON:.5},
 WATER:{FIRE:2,WATER:.5,GRASS:.5,GROUND:2,ROCK:2,DRAGON:.5},
 ELECTRIC:{WATER:2,ELECTRIC:.5,GRASS:.5,GROUND:0,FLYING:2,DRAGON:.5},
 GRASS:{FIRE:.5,WATER:2,GRASS:.5,POISON:.5,GROUND:2,FLYING:.5,BUG:.5,ROCK:2,DRAGON:.5},
 ICE:{WATER:.5,GRASS:2,ICE:.5,GROUND:2,FLYING:2,DRAGON:2},
 FIGHTING:{NORMAL:2,ICE:2,POISON:.5,FLYING:.5,PSYCHIC:.5,BUG:.5,ROCK:2,GHOST:0},
 POISON:{GRASS:2,POISON:.5,GROUND:.5,BUG:2,ROCK:.5,GHOST:.5},
 GROUND:{FIRE:2,ELECTRIC:2,GRASS:.5,POISON:2,FLYING:0,BUG:.5,ROCK:2},
 FLYING:{ELECTRIC:.5,GRASS:2,FIGHTING:2,BUG:2,ROCK:.5},
 PSYCHIC:{FIGHTING:2,POISON:2,PSYCHIC:.5},
 BUG:{FIRE:.5,GRASS:2,FIGHTING:.5,POISON:2,FLYING:.5,PSYCHIC:2,GHOST:.5},
 ROCK:{FIRE:2,ICE:2,FIGHTING:.5,GROUND:.5,FLYING:2,BUG:2},
 GHOST:{NORMAL:0,PSYCHIC:2,GHOST:2},
 DRAGON:{DRAGON:2}
};
function effectiveness(moveType,types){return types.reduce((m,t)=>m*(CHART[moveType]?.[t]??1),1);}

// ------------------------------------------------------------ moves
// [NAME, type, power, accuracy (0 = never misses), pp, effects, animation]
// effects: par|brn|psn|slp|frz|conf|flinch:<chance>, foe.<stat>±n[:chance], self.<stat>±n,
// heal, rest, drain, recoil, multi (2-5 hits), twice, level (damage = level), fixed:<n>,
// crit (high critical ratio), recharge, explode, prio, leech, haze, nothing, fail.
const MOVE_ROWS=[
 // NORMAL
 ['TACKLE','NORMAL',35,95,35,'','tackle'],['SCRATCH','NORMAL',40,100,35,'','scratch'],['POUND','NORMAL',40,100,35,'','tackle'],
 ['QUICK ATTACK','NORMAL',40,100,30,'prio','dash'],['HEADBUTT','NORMAL',70,100,15,'flinch:30','tackle'],['BODY SLAM','NORMAL',85,100,15,'par:30','tackle'],
 ['TAKE DOWN','NORMAL',90,85,20,'recoil','tackle'],['DOUBLE-EDGE','NORMAL',100,100,15,'recoil','tackle'],['HYPER BEAM','NORMAL',150,90,5,'recharge','beam'],
 ['SLASH','NORMAL',70,100,20,'crit','scratch'],['STRENGTH','NORMAL',80,100,15,'','punch'],['MEGA PUNCH','NORMAL',80,85,20,'','punch'],['MEGA KICK','NORMAL',120,75,5,'','punch'],
 ['FURY ATTACK','NORMAL',15,85,20,'multi','scratch'],['COMET PUNCH','NORMAL',18,85,15,'multi','punch'],['SWIFT','NORMAL',60,0,20,'','stars'],['BITE','NORMAL',60,100,25,'flinch:10','bite'],
 ['STOMP','NORMAL',65,100,20,'flinch:30','punch'],['HORN ATTACK','NORMAL',65,100,25,'','tackle'],['VICEGRIP','NORMAL',55,100,30,'','bite'],['SKULL BASH','NORMAL',100,100,15,'','tackle'],
 ['GROWL','NORMAL',0,100,40,'foe.atk-1','sound'],['LEER','NORMAL',0,100,30,'foe.def-1','stare'],['TAIL WHIP','NORMAL',0,100,30,'foe.def-1','wiggle'],['SCREECH','NORMAL',0,85,40,'foe.def-2','sound'],
 ['SWORDS DANCE','NORMAL',0,0,30,'self.atk+2','up'],['DEFENSE CURL','NORMAL',0,0,40,'self.def+1','up'],['HARDEN','NORMAL',0,0,30,'self.def+1','up'],['GROWTH','NORMAL',0,0,40,'self.spc+1','up'],
 ['SING','NORMAL',0,55,15,'slp','sound'],['SUPERSONIC','NORMAL',0,55,20,'conf','sound'],['GLARE','NORMAL',0,75,30,'par','stare'],['DOUBLE TEAM','NORMAL',0,0,15,'self.eva+1','up'],
 ['MINIMIZE','NORMAL',0,0,20,'self.eva+1','up'],['SMOKESCREEN','NORMAL',0,100,20,'foe.acc-1','smoke'],['SOFTBOILED','NORMAL',0,0,10,'heal','heal'],['RECOVER','NORMAL',0,0,20,'heal','heal'],
 ['SPLASH','NORMAL',0,0,40,'nothing','wiggle'],['EXPLOSION','NORMAL',170,100,5,'explode','explode'],['SELFDESTRUCT','NORMAL',130,100,5,'explode','explode'],['FOCUS ENERGY','NORMAL',0,0,30,'self.crit','up'],
 // FIRE
 ['EMBER','FIRE',40,100,25,'brn:10','fire'],['FIRE PUNCH','FIRE',75,100,15,'brn:10','punch'],['FLAMETHROWER','FIRE',95,100,15,'brn:10','fire'],['FIRE BLAST','FIRE',120,85,5,'brn:30','fire'],['FIRE SPIN','FIRE',15,70,15,'multi','fire'],
 // WATER
 ['WATER GUN','WATER',40,100,25,'','water'],['BUBBLE','WATER',20,100,30,'foe.spd-1:10','bubble'],['BUBBLEBEAM','WATER',65,100,20,'foe.spd-1:10','bubble'],['SURF','WATER',95,100,15,'','wave'],
 ['HYDRO PUMP','WATER',120,80,5,'','water'],['CRABHAMMER','WATER',90,85,10,'crit','punch'],['WATERFALL','WATER',80,100,15,'','water'],['WITHDRAW','WATER',0,0,40,'self.def+1','up'],
 // ELECTRIC
 ['THUNDERSHOCK','ELECTRIC',40,100,30,'par:10','zap'],['THUNDERPUNCH','ELECTRIC',75,100,15,'par:10','punch'],['THUNDERBOLT','ELECTRIC',95,100,15,'par:10','zap'],['THUNDER','ELECTRIC',120,70,10,'par:10','zap'],
 ['THUNDER WAVE','ELECTRIC',0,100,20,'par','zap'],
 // GRASS
 ['VINE WHIP','GRASS',35,100,10,'','whip'],['ABSORB','GRASS',20,100,20,'drain','drain'],['MEGA DRAIN','GRASS',40,100,10,'drain','drain'],['RAZOR LEAF','GRASS',55,95,25,'crit','leaf'],
 ['PETAL DANCE','GRASS',70,100,20,'','leaf'],['SOLARBEAM','GRASS',120,85,10,'','beam'],['SLEEP POWDER','GRASS',0,75,15,'slp','powder'],['STUN SPORE','GRASS',0,75,30,'par','powder'],
 ['POISONPOWDER','GRASS',0,75,35,'psn','powder'],['LEECH SEED','GRASS',0,90,10,'leech','powder'],
 // ICE
 ['ICE PUNCH','ICE',75,100,15,'frz:10','punch'],['AURORA BEAM','ICE',65,100,20,'foe.atk-1:10','beam'],['ICE BEAM','ICE',95,100,10,'frz:10','ice'],['BLIZZARD','ICE',120,90,5,'frz:10','ice'],
 ['HAZE','ICE',0,0,30,'haze','smoke'],['MIST','ICE',0,0,30,'self.def+1','smoke'],
 // FIGHTING
 ['KARATE CHOP','FIGHTING',50,100,25,'crit','punch'],['LOW KICK','FIGHTING',50,90,20,'flinch:30','punch'],['DOUBLE KICK','FIGHTING',30,100,30,'twice','punch'],['JUMP KICK','FIGHTING',70,95,25,'','punch'],
 ['ROLLING KICK','FIGHTING',60,85,15,'flinch:30','punch'],['SUBMISSION','FIGHTING',80,80,25,'recoil','tackle'],['SEISMIC TOSS','FIGHTING',0,100,20,'level','shake'],['HI JUMP KICK','FIGHTING',85,90,20,'','punch'],
 // POISON
 ['POISON STING','POISON',15,100,35,'psn:20','sting'],['ACID','POISON',40,100,30,'foe.def-1:10','bubble'],['SMOG','POISON',20,70,20,'psn:40','smoke'],['SLUDGE','POISON',65,100,20,'psn:30','bubble'],
 ['TOXIC','POISON',0,85,10,'psn','bubble'],['POISON GAS','POISON',0,55,40,'psn','smoke'],['ACID ARMOR','POISON',0,0,40,'self.def+2','up'],
 // GROUND
 ['SAND-ATTACK','GROUND',0,100,15,'foe.acc-1','smoke'],['BONE CLUB','GROUND',65,85,20,'flinch:10','punch'],['BONEMERANG','GROUND',50,90,10,'twice','stars'],['DIG','GROUND',100,100,10,'','shake'],
 ['EARTHQUAKE','GROUND',100,100,10,'','shake'],
 // FLYING
 ['GUST','FLYING',40,100,35,'','wind'],['PECK','FLYING',35,100,35,'','sting'],['WING ATTACK','FLYING',35,100,35,'','wind'],['DRILL PECK','FLYING',80,100,20,'','sting'],['FLY','FLYING',90,95,15,'','dash'],
 ['SKY ATTACK','FLYING',140,80,5,'flinch:30','dash'],['AGILITY','PSYCHIC',0,0,30,'self.spd+2','up'],
 // PSYCHIC
 ['CONFUSION','PSYCHIC',50,100,25,'conf:10','psywave'],['PSYBEAM','PSYCHIC',65,100,20,'conf:10','beam'],['PSYCHIC','PSYCHIC',90,100,10,'foe.spc-1:30','psywave'],['HYPNOSIS','PSYCHIC',0,60,20,'slp','psywave'],
 ['AMNESIA','PSYCHIC',0,0,20,'self.spc+2','up'],['BARRIER','PSYCHIC',0,0,30,'self.def+2','up'],['KINESIS','PSYCHIC',0,80,15,'foe.acc-1','psywave'],['MEDITATE','PSYCHIC',0,0,40,'self.atk+1','up'],
 ['REST','PSYCHIC',0,0,10,'rest','heal'],['DREAM EATER','PSYCHIC',100,100,15,'drain','drain'],
 // BUG
 ['LEECH LIFE','BUG',20,100,15,'drain','drain'],['PIN MISSILE','BUG',14,85,20,'multi','sting'],['TWINEEDLE','BUG',25,100,20,'twice,psn:20','sting'],['STRING SHOT','BUG',0,95,40,'foe.spd-1','web'],
 // ROCK
 ['ROCK THROW','ROCK',50,90,15,'','rock'],['ROCK SLIDE','ROCK',75,90,10,'','rock'],
 // GHOST
 ['LICK','GHOST',20,100,30,'par:30','bite'],['NIGHT SHADE','GHOST',0,100,15,'level','ghost'],['CONFUSE RAY','GHOST',0,100,10,'conf','ghost'],
 // DRAGON
 ['DRAGON RAGE','DRAGON',0,100,10,'fixed:40','fire'],['DRAGONBREATH','DRAGON',60,100,20,'par:30','fire'],

 // ---- signature moves: real shows, movies, games and bands
 ['RUM HAM','POISON',70,95,15,'psn:30','bubble'],['DAYMAN','FIRE',80,100,15,'self.spc+1:30','fire'],['NIGHTMAN','GHOST',80,100,15,'conf:20','ghost'],
 ['KITTEN MITTEN','NORMAL',20,100,20,'multi','scratch'],['FIGHT MILK','FIGHTING',0,0,10,'heal,self.atk+1','heal'],['WILDCARD','NORMAL',95,75,10,'conf:30','dash'],
 ['GOLDEN GOD','PSYCHIC',0,0,15,'self.atk+1,self.spc+1','up'],['RAT BASH','NORMAL',60,100,20,'crit','punch'],['EGG ROLL','POISON',55,100,20,'flinch:20','bubble'],
 ['PARKOUR','FIGHTING',70,95,15,'self.spd+1','dash'],['BEARS BEETS','BUG',60,100,20,'flinch:10','sting'],['WORLDS BEST','NORMAL',0,0,15,'self.atk+2','up'],
 ['IDENTITY TFT','PSYCHIC',70,90,15,'conf:20','psywave'],['FIRE DRILL','FIRE',60,100,15,'conf:30','fire'],['DEMENTORS','GHOST',60,100,15,'foe.spd-1:50','ghost'],['PRANK','NORMAL',0,90,20,'conf','wiggle'],
 ['LIL SEBASTIAN','NORMAL',80,100,10,'flinch:20','dash'],['WAFFLES','NORMAL',0,0,10,'heal','heal'],['WOODWORK','GRASS',70,100,15,'','leaf'],['MOUSE RAT','ELECTRIC',65,100,15,'conf:10','sound'],
 ['AUTHORITAH','FIGHTING',70,100,15,'flinch:20','punch'],['SCREW U GUYS','NORMAL',0,100,20,'foe.atk-1,foe.def-1','sound'],['WANNA GET HI','POISON',0,75,15,'slp','smoke'],
 ['SPEAR','NORMAL',70,0,15,'flinch:20','dash'],['FATALITY','FIGHTING',150,60,5,'','explode'],['ICE BALL','ICE',50,100,20,'frz:30','ice'],['BICYCLE KICK','FIGHTING',15,85,20,'multi','punch'],['TOASTY','FIRE',60,100,20,'brn:20','fire'],
 ['THUNDER GOD','ELECTRIC',90,90,10,'par:20','zap'],['FLYING KICK','FIGHTING',75,95,15,'','dash'],['SOUL STEAL','GHOST',70,100,10,'drain','ghost'],
 ['SERENITY NOW','PSYCHIC',0,0,10,'heal,self.spc+1','heal'],['NO SOUP 4 YOU','NORMAL',60,100,20,'flinch:30','punch'],['YADA YADA','NORMAL',20,100,20,'multi','sound'],['HELLO NEWMAN','POISON',60,100,15,'psn:20','stare'],['GIDDYUP','NORMAL',65,100,20,'self.spd+1:50','dash'],
 ['SHAKEN','PSYCHIC',0,100,15,'conf','wiggle'],['LICENSE 2 KIL','NORMAL',90,90,10,'crit','beam'],['GOLDEN GUN','NORMAL',110,80,5,'','beam'],
 ['KAMEHAMEHA','PSYCHIC',100,90,10,'','beam'],['SPIRIT BOMB','PSYCHIC',140,80,5,'','explode'],['KAIOKEN','FIGHTING',0,0,10,'self.atk+2,self.spd+1','up'],['GALICK GUN','ELECTRIC',90,100,10,'','beam'],
 ['FINAL FLASH','ELECTRIC',120,80,5,'','beam'],['SOLAR FLARE','NORMAL',0,100,15,'foe.acc-2','flash'],['DEATH BEAM','PSYCHIC',80,100,15,'crit','beam'],
 ['JAJANKEN','FIGHTING',85,95,10,'flinch:20','punch'],['GODSPEED','ELECTRIC',70,100,15,'prio,par:10','zap'],['BUNGEE GUM','NORMAL',40,100,20,'foe.spd-2','whip'],['CHAIN JAIL','PSYCHIC',0,90,10,'par','web'],
 ['PHASER','ELECTRIC',70,100,20,'par:10','beam'],['MIND MELD','PSYCHIC',80,100,15,'conf:10','psywave'],['VULCAN PINCH','FIGHTING',0,75,15,'slp','punch'],['ENGAGE','PSYCHIC',0,0,20,'self.spd+2','up'],
 ['KHAAAN','NORMAL',90,100,10,'recoil','sound'],['MAKE IT SO','NORMAL',0,0,15,'self.atk+1,self.def+1','up'],
 ['FORCE CHOKE','PSYCHIC',80,100,15,'flinch:30','psywave'],['LIGHTSABER','ELECTRIC',90,100,10,'crit','scratch'],['MIND TRICK','PSYCHIC',0,100,10,'conf','psywave'],['FORCE PUSH','PSYCHIC',60,100,20,'','psywave'],
 ['BLASTER','ELECTRIC',60,95,25,'','beam'],['FORCE LIGHTNG','ELECTRIC',95,95,10,'par:20','zap'],
 ['BT SLAM','NORMAL',70,100,15,'','tackle'],['TIMEFALL','WATER',75,100,15,'foe.spd-1:30','water'],['DELIVERY','NORMAL',80,90,15,'','tackle'],['STRAND','NORMAL',50,100,20,'foe.spd-1','whip'],
 ['EZEKIEL 2517','PSYCHIC',100,90,10,'flinch:20','psywave'],['ADRENALINE','NORMAL',0,0,10,'heal,self.spd+1','heal'],['ROYALE CHEESE','NORMAL',0,0,10,'heal','heal'],
 ['5 POINT PALM','FIGHTING',110,75,5,'','explode'],['HANZO SWORD','NORMAL',90,100,10,'crit','scratch'],['CRAZY 88','FIGHTING',15,90,20,'multi','punch'],
 ['BATARANG','FLYING',60,0,20,'','stars'],["I'M BATMAN",'NORMAL',0,0,15,'self.atk+1,self.def+1','up'],['BAM POW','FIGHTING',70,100,15,'flinch:20','punch'],
 ['HEAT VISION','FIRE',95,100,15,'brn:10','beam'],['SUPER BREATH','ICE',90,100,10,'frz:10','wind'],['FLY BY','FLYING',80,100,15,'','dash'],
 ['MORPH','NORMAL',0,0,10,'self.atk+1,self.def+1,self.spd+1','up'],['MEGAZORD','ROCK',100,90,5,'','rock'],
 ['COME OUT 2 PLAY','GHOST',0,100,15,'conf','sound'],['BASEBALL BAT','NORMAL',80,100,15,'flinch:20','punch'],
 ['NOS BOOST','NORMAL',0,0,15,'self.spd+2','up'],['FAMILY','NORMAL',0,0,10,'heal','heal'],['QUARTER MILE','NORMAL',70,100,15,'prio','dash'],
 ['QUICK DRAW','NORMAL',40,100,25,'prio','beam'],['D IS SILENT','NORMAL',80,100,15,'','beam'],
 ['SHOPPING CART','NORMAL',90,90,10,'recoil','dash'],['TASER','ELECTRIC',60,100,20,'par:30','zap'],['STUNT','NORMAL',100,80,10,'recoil','explode'],
 ['TROJAN HORSE','ROCK',90,90,10,'','rock'],['ACHILLES HEEL','NORMAL',70,100,15,'crit','sting'],
 ['VAMPIRE KILLR','NORMAL',80,100,15,'','whip'],['HOLY WATER','WATER',70,100,15,'brn:20','water'],
 ['EAR SLICE','NORMAL',60,100,20,'crit','scratch'],['MEXICAN STNDF','NORMAL',0,100,15,'foe.atk-1,foe.spd-1','stare'],
 ['BEAR JEW BAT','NORMAL',90,90,10,'flinch:20','punch'],['GORLAMI','PSYCHIC',0,100,15,'conf','sound'],
 ['GIGAWATTS','ELECTRIC',120,80,5,'par:10','zap'],['GREAT SCOTT','PSYCHIC',0,100,15,'conf','wiggle'],
 ['CLEVER GIRL','DRAGON',80,100,15,'crit','bite'],['LIFE FINDS','NORMAL',0,0,10,'heal','heal'],
 ['MCLOVIN','NORMAL',0,0,15,'self.def+2','up'],['ILL BE BACK','NORMAL',0,0,10,'rest','heal'],['TERMINATE','ELECTRIC',100,90,10,'','beam'],
 ['BULLET TIME','PSYCHIC',0,0,15,'self.eva+2','up'],['RED PILL','PSYCHIC',80,100,15,'conf:20','psywave'],['KUNG FU','FIGHTING',80,100,15,'','punch'],
 ['COWABUNGA','WATER',80,100,15,'','wave'],['PIZZA TIME','NORMAL',0,0,10,'heal','heal'],
 ['OFFER','PSYCHIC',0,100,15,'foe.atk-2','stare'],['HORSE HEAD','GHOST',80,100,10,'flinch:30','ghost'],
 ['DUDE ABIDES','NORMAL',0,0,10,'rest','heal'],['WHITE RUSSIAN','ICE',70,100,15,'slp:10','ice'],
 ['YEAH BABY','NORMAL',0,0,15,'self.atk+1,self.spd+1','up'],['MOJO','PSYCHIC',80,100,15,'drain','drain'],
 ['GAME OVER','GHOST',90,90,10,'','ghost'],['JIGSAW','PSYCHIC',0,100,10,'conf','psywave'],['MACHETE','NORMAL',90,90,10,'crit','scratch'],['DREAM DEMON','GHOST',80,100,10,'slp:20','ghost'],
 ['SHRED','FIRE',85,100,15,'conf:10','sound'],['DOOM RIFF','GHOST',90,90,10,'foe.spd-1:30','sound'],['POWER CHORD','ELECTRIC',80,100,15,'','sound'],['DRUM SOLO','NORMAL',20,100,20,'multi','punch'],
 ['BOY BAND','PSYCHIC',75,100,15,'conf:20','sound'],['FALSETTO','NORMAL',0,55,15,'slp','sound'],['BYE BYE BYE','PSYCHIC',85,95,10,'','sound'],
 ['GOOD AIM','NORMAL',80,0,15,'','beam'],['DEAD EYE','NORMAL',100,90,10,'crit','beam'],['LASSO','NORMAL',40,100,20,'foe.spd-2','whip'],
 ['ROLL A NAT 20','NORMAL',70,100,10,'crit','stars'],['BUM RUSH','NORMAL',75,100,15,'flinch:20','tackle'],['DUFF SPLASH','WATER',60,100,20,'conf:20','water'],
 ['BEER BONG','POISON',80,90,10,'conf:30','bubble'],['TRUCK NUTS','NORMAL',90,90,10,'recoil','dash'],
 // ShambConkins originals and the dogs
 ['MAD SCIENCE','POISON',80,95,15,'psn:20,conf:10','bubble'],['SAVORY BLAST','FIRE',90,100,10,'brn:10','fire'],['SPARKLE','PSYCHIC',75,100,15,'conf:20','stars'],
 ['LUCKY BREAK','NORMAL',80,100,15,'crit','stars'],['ZOOMIES','NORMAL',70,100,20,'prio','dash'],['HERDING','NORMAL',0,100,20,'foe.spd-2','wiggle'],['BORK','NORMAL',0,100,40,'foe.atk-1','sound'],
 ['BELLY RUB','NORMAL',0,0,10,'heal','heal'],['GUARD DOG','NORMAL',0,0,20,'self.def+2','up'],['TAIL WAG','NORMAL',0,100,30,'foe.def-1','wiggle'],
 // Pokémon cameo
 ['THUNDER JOLT','ELECTRIC',80,100,15,'par:20','zap'],['SMELL YA','NORMAL',0,100,20,'foe.atk-1,foe.def-1','stare'],['BLAST OFF','FLYING',90,90,10,'','stars'],['ROCK SOLID','ROCK',0,0,20,'self.def+2','up'],
 // Generic pop-culture signatures for every other show and film
 ['MONOLOGUE','PSYCHIC',0,60,15,'slp','sound'],['PLOT ARMOR','NORMAL',0,0,15,'self.def+2','up'],['JUMP SCARE','GHOST',60,100,15,'flinch:30','ghost'],['PLOT TWIST','PSYCHIC',70,100,15,'conf:30','psywave'],
 ['CATCHPHRASE','NORMAL',65,100,20,'self.atk+1:20','sound'],['STUNT DOUBLE','NORMAL',0,0,15,'self.eva+1,self.def+1','up'],['SEQUEL','NORMAL',35,90,20,'twice','tackle'],['DIRECTORS CUT','NORMAL',100,85,10,'','beam'],
 ['SLOW MO','PSYCHIC',0,100,15,'foe.spd-2','psywave'],['MONTAGE','FIGHTING',0,0,15,'self.atk+1,self.spd+1','up'],['CLIFFHANGER','ROCK',80,90,15,'','rock'],['LAUGH TRACK','NORMAL',0,100,25,'foe.atk-1,foe.def-1','sound'],
 ['MIC DROP','NORMAL',85,100,10,'recoil','punch'],['CAMEO','NORMAL',50,100,20,'prio','dash'],['SPOILER ALERT','PSYCHIC',65,100,20,'foe.spc-1:30','psywave'],['BOX OFFICE','NORMAL',70,100,15,'','stars'],
 ['REBOOT','NORMAL',0,0,10,'heal','heal'],['FAN SERVICE','NORMAL',0,0,15,'heal,self.spc+1','heal'],['ENCORE','NORMAL',60,100,20,'conf:10','sound'],['FINAL CUT','NORMAL',90,90,10,'crit','scratch']
];
const MOVES={};
for(const [name,type,power,acc,pp,fx,anim] of MOVE_ROWS){
 const m={id:name,name,type,power,acc,pp,anim,cat:power||/level|fixed/.test(fx)?(PHYSICAL.has(type)?'phys':'spec'):'status',fx:[]};
 for(const tok of fx.split(',').filter(Boolean)){
  let r;
  if((r=tok.match(/^(par|brn|psn|slp|frz|conf|flinch)(?::(\d+))?$/)))m.fx.push({kind:'status',status:r[1],chance:r[2]?+r[2]:100});
  else if((r=tok.match(/^(foe|self)\.(atk|def|spc|spd|acc|eva)([+-]\d)(?::(\d+))?$/)))m.fx.push({kind:'stat',who:r[1],stat:r[2],n:+r[3],chance:r[4]?+r[4]:100});
  else if(tok==='self.crit')m.fx.push({kind:'focus'});
  else if((r=tok.match(/^fixed:(\d+)$/)))m.fixed=+r[1];
  else m[tok]=true;
 }
 MOVES[name]=m;
}
const move=id=>MOVES[id]||MOVES.TACKLE;

// ------------------------------------------------------------ abilities
const ABILITIES={
 'INTIMIDATE':'Lowers the foe’s ATTACK when it enters battle.',
 'STURDY':'Survives a knockout hit from full HP with 1 HP.',
 'SPEED BOOST':'SPEED rises at the end of every turn.',
 'BLAZE':'Boosts FIRE moves when HP is in the red.','TORRENT':'Boosts WATER moves when HP is in the red.','OVERGROW':'Boosts GRASS moves when HP is in the red.',
 'SWARM':'Boosts BUG moves when HP is in the red.','UNDERDOG':'Boosts moves of its own type when HP is in the red.',
 'STATIC':'Contact may paralyze the attacker.','POISON POINT':'Contact may poison the attacker.','FLAME BODY':'Contact may burn the attacker.',
 'LEVITATE':'Immune to GROUND moves.','HUGE POWER':'Doubles ATTACK.','SERENE GRACE':'Doubles the chance of added effects.',
 'INSOMNIA':'Cannot fall asleep.','KEEN EYE':'Accuracy cannot be lowered.','SHED SKIN':'May shake off a status problem each turn.',
 'GUTS':'ATTACK rises with a status problem.','PRESSURE':'The foe uses 2 PP per move.','PLOT ARMOR':'Once per battle, hangs on at 1 HP.',
 'REGENERATOR':'Heals a third of its HP when switched out.','SECOND WIND':'Restores a little HP every turn.','ROCK HEAD':'Takes no recoil damage.',
 'SUPER LUCK':'Lands critical hits more often.','OWN TEMPO':'Cannot be confused.'
};
const TYPE_ABILITIES={NORMAL:['PLOT ARMOR','GUTS','KEEN EYE','SUPER LUCK','OWN TEMPO','SECOND WIND'],FIRE:['BLAZE','FLAME BODY'],WATER:['TORRENT','SHED SKIN','SECOND WIND'],ELECTRIC:['STATIC','SPEED BOOST'],
 GRASS:['OVERGROW','REGENERATOR'],ICE:['SECOND WIND','SHED SKIN'],FIGHTING:['GUTS','INTIMIDATE','UNDERDOG'],POISON:['POISON POINT','SHED SKIN'],GROUND:['STURDY','KEEN EYE'],
 FLYING:['KEEN EYE','SPEED BOOST'],PSYCHIC:['SERENE GRACE','INSOMNIA','PRESSURE','OWN TEMPO'],BUG:['SWARM','SHED SKIN'],ROCK:['STURDY','ROCK HEAD'],GHOST:['LEVITATE','PRESSURE'],DRAGON:['INTIMIDATE','PRESSURE']};

// ------------------------------------------------------------ species
// Damaging moves by type in three tiers (levels 1-17, 18-34, 35+), and a status move pool.
const TYPE_MOVES={
 NORMAL:[['TACKLE','SCRATCH','POUND'],['HEADBUTT','BODY SLAM','SLASH','STOMP'],['DOUBLE-EDGE','HYPER BEAM','MEGA KICK','SKULL BASH']],
 FIRE:[['EMBER'],['FIRE PUNCH','FLAMETHROWER'],['FLAMETHROWER','FIRE BLAST']],WATER:[['WATER GUN','BUBBLE'],['BUBBLEBEAM','WATERFALL','CRABHAMMER'],['SURF','HYDRO PUMP']],
 ELECTRIC:[['THUNDERSHOCK'],['THUNDERPUNCH','THUNDERBOLT'],['THUNDERBOLT','THUNDER']],GRASS:[['VINE WHIP','ABSORB'],['RAZOR LEAF','MEGA DRAIN'],['PETAL DANCE','SOLARBEAM']],
 ICE:[['ICE PUNCH','AURORA BEAM'],['AURORA BEAM','ICE BEAM'],['ICE BEAM','BLIZZARD']],FIGHTING:[['KARATE CHOP','LOW KICK','DOUBLE KICK'],['JUMP KICK','ROLLING KICK','SUBMISSION'],['HI JUMP KICK','SUBMISSION']],
 POISON:[['POISON STING','SMOG'],['ACID','SLUDGE'],['SLUDGE']],GROUND:[['BONE CLUB','BONEMERANG'],['DIG','BONEMERANG'],['EARTHQUAKE']],
 FLYING:[['GUST','PECK'],['WING ATTACK','DRILL PECK'],['FLY','DRILL PECK','SKY ATTACK']],PSYCHIC:[['CONFUSION'],['PSYBEAM','CONFUSION'],['PSYCHIC']],
 BUG:[['LEECH LIFE','TWINEEDLE'],['PIN MISSILE','TWINEEDLE'],['PIN MISSILE','TWINEEDLE']],ROCK:[['ROCK THROW'],['ROCK THROW','ROCK SLIDE'],['ROCK SLIDE']],
 GHOST:[['LICK','NIGHT SHADE'],['NIGHT SHADE','LICK'],['NIGHT SHADE']],DRAGON:[['DRAGON RAGE'],['DRAGONBREATH','DRAGON RAGE'],['DRAGONBREATH']]
};
const STATUS_MOVES={NORMAL:['GROWL','LEER','TAIL WHIP','SWORDS DANCE','DEFENSE CURL','SING','SUPERSONIC','GLARE','DOUBLE TEAM','SOFTBOILED','SCREECH','FOCUS ENERGY'],FIRE:['SMOKESCREEN','LEER'],WATER:['WITHDRAW','HAZE'],ELECTRIC:['THUNDER WAVE','AGILITY'],
 GRASS:['SLEEP POWDER','STUN SPORE','LEECH SEED','POISONPOWDER','GROWTH'],ICE:['HAZE','MIST'],FIGHTING:['MEDITATE','LEER','SWORDS DANCE'],POISON:['POISON GAS','TOXIC','ACID ARMOR'],GROUND:['SAND-ATTACK','HARDEN'],
 FLYING:['AGILITY','SAND-ATTACK'],PSYCHIC:['HYPNOSIS','AGILITY','AMNESIA','BARRIER','RECOVER','REST','KINESIS'],BUG:['STRING SHOT','HARDEN'],ROCK:['HARDEN','DEFENSE CURL'],GHOST:['CONFUSE RAY','HYPNOSIS'],DRAGON:['AGILITY','LEER']};
// [hp, atk, def, spc, spd] weights per primary type.
const SHAPES={NORMAL:[1.1,1,.9,.8,1.1],FIRE:[.9,1,.85,1.2,1.05],WATER:[1.1,.9,1.05,1.05,.9],ELECTRIC:[.8,.9,.8,1.15,1.35],GRASS:[1,.9,1,1.15,.85],ICE:[1,.9,1,1.15,.95],FIGHTING:[1,1.35,.9,.7,1.05],
 POISON:[1,1,1,1,.95],GROUND:[1.05,1.15,1.2,.7,.8],FLYING:[.95,1.05,.85,.85,1.3],PSYCHIC:[.85,.7,.8,1.45,1.2],BUG:[.9,1.05,1.05,.8,1],ROCK:[.95,1.1,1.4,.7,.75],GHOST:[.8,.85,.8,1.35,1.1],DRAGON:[1.05,1.2,1,1.05,1]};
const ICON_TYPES=[
 ['🔥🌞☀️💥🧨🌶️🍗🍔🥓🍖☢️','FIRE'],['🌊💧🐟🦈🐙🦭⚓🌧️🚿🏖️🎣🍣🥤🥛☕🍺🍻🥃🍾🥂🍷','WATER'],['⚡🔌💡🤖🦾🛰️💻⌨️🎛️📻🔊🎧🎸🎹🎙️🎤📀📼🕹️🎮🚀👩‍🚀','ELECTRIC'],
 ['🌿🌱🍃🌵🌲🌴🥬🥦🌹🪴🍄🥔🫘🎋🌾🍀','GRASS'],['❄️⛄🧊🥶🍦⛸️🏒','ICE'],['🥊🥋👊💪✊🦵🏋️⚔️🗡️🗡🪖🎖️🏈🏀⚾🏏🛡️🥷','FIGHTING'],
 ['☠️🧪💊💉🐍🚬🧟😷💩🐀🦠⚗️🧬','POISON'],['⛰️🏜️⛏️🪨🦴🐗🐴🐎🐮🐻🏍️🚜🚚','GROUND'],['🦅🕊️🐦🦜🦇✈️🪶🪁🦋☁️🛼🛹','FLYING'],
 ['🔮🧠🧘✨🎩🪄🃏🎴🖖🙏👁️👀🧙🌙🌑🔭🎭📖📚🕶️','PSYCHIC'],['🐛🐜🕷️🦗🪲🪰🪳🐝','BUG'],['🗿🪨💎🏺🏯🏢⛪🪙💍🧱','ROCK'],
 ['👻💀🎃🧛🕯️😈👹🖤⛓️🔪🪚🩸🦷🐈‍⬛','GHOST'],['🐉🦖🦎🐲','DRAGON']
];
const SOURCE_TYPES={
 'Always Sunny':['NORMAL','POISON'],'The Office':['NORMAL','PSYCHIC'],'Mortal Kombat':['FIGHTING'],'Seinfeld':['NORMAL'],'James Bond':['NORMAL','PSYCHIC'],'GoldenEye':['NORMAL','ELECTRIC'],
 'Dragon Ball Z':['FIGHTING','PSYCHIC'],'Hunter × Hunter':['FIGHTING','PSYCHIC'],'Yu Yu Hakusho':['FIGHTING','GHOST'],'Star Trek':['PSYCHIC','ELECTRIC'],'Star Wars':['PSYCHIC','ELECTRIC'],
 'Death Stranding':['WATER','GHOST'],'Pulp Fiction':['NORMAL'],'Kill Bill':['FIGHTING'],'Superman':['FLYING','FIRE'],'Batman':['FLYING','NORMAL'],'Batman (1989)':['FLYING','NORMAL'],'Batman Returns':['FLYING','ICE'],
 'Power Rangers':['FIGHTING','ROCK'],'The Warriors':['FIGHTING'],'Fast & Furious':['NORMAL','FIRE'],'Django Unchained':['NORMAL','GROUND'],'Jackass':['NORMAL','FIGHTING'],'Troy':['FIGHTING','ROCK'],
 'Barbarian':['GHOST','GROUND'],'Castlevania':['GHOST','FIRE'],'Reservoir Dogs':['NORMAL'],'Inglourious Basterds':['NORMAL','FIGHTING'],'Battle Royale':['FIGHTING','POISON'],
 '*NSYNC':['PSYCHIC','NORMAL'],'Backstreet Boys':['PSYCHIC','NORMAL'],'Black Sabbath':['GHOST','ELECTRIC'],'REZN':['PSYCHIC','GHOST'],'Sleep':['PSYCHIC','GRASS'],'Electric Wizard':['ELECTRIC','GHOST'],
 'The Beatles':['PSYCHIC'],'Red Dead Redemption 2':['GROUND','NORMAL'],'Red Dead Redemption':['GROUND','NORMAL'],'South Park':['NORMAL','ICE'],'Parks and Recreation':['NORMAL','GRASS'],
 'Back to the Future':['ELECTRIC'],'Jurassic Park':['DRAGON','GRASS'],'Teenage Mutant Ninja Turtles':['WATER','FIGHTING'],'The Godfather':['NORMAL','GHOST'],'The Matrix':['PSYCHIC','ELECTRIC'],
 'Terminator':['ELECTRIC','ROCK'],'Alien':['BUG','POISON'],'Predator':['BUG','FIGHTING'],'Resident Evil':['POISON'],'The Thing':['ICE','GHOST'],'Saw':['GHOST'],'Evil Dead':['GHOST'],
 'Silent Hill':['GHOST'],'Beetlejuice':['GHOST','BUG'],'The Nightmare Before Christmas':['GHOST'],'Gremlins':['WATER','BUG'],'Shaun of the Dead':['POISON'],'Return of the Living Dead':['POISON','GHOST'],
 'Rugrats':['NORMAL'],'Hey Arnold!':['NORMAL'],"Rocko's Modern Life":['NORMAL','WATER'],'Doug':['NORMAL'],'Aaahh!!! Real Monsters':['GHOST','POISON'],'Ren & Stimpy':['POISON','NORMAL'],
 'Chuck Norris':['FIGHTING'],'Rambo':['FIGHTING','GROUND'],'Rocky':['FIGHTING'],'Bloodsport':['FIGHTING'],'Die Hard':['NORMAL','FIGHTING'],'Big Trouble in Little China':['FIGHTING','ELECTRIC'],
 'Scott Pilgrim':['FIGHTING','PSYCHIC'],'Cowboy Bebop':['NORMAL','FIGHTING'],'The Big Lebowski':['NORMAL','ICE'],'Fargo':['ICE','NORMAL'],'No Country for Old Men':['GROUND','GHOST'],
 'Super Mario Bros.':['FIRE','NORMAL'],'Pac-Man':['GHOST','NORMAL'],'Bomberman':['FIRE'],'Metal Gear':['ELECTRIC','FIGHTING'],'Starship Troopers':['BUG','NORMAL'],'Toy Story':['NORMAL','FLYING'],
 'Ace Ventura':['NORMAL','FLYING'],'Austin Powers':['PSYCHIC','NORMAL'],'Superbad':['NORMAL'],'Tommy Boy':['NORMAL','GROUND'],'Reno 911!':['NORMAL'],'Super Troopers':['NORMAL','GRASS'],
 'Jay and Silent Bob':['GRASS','NORMAL'],'The Goonies':['WATER','ROCK'],'Action Icons':['FIGHTING'],'Saturday Night Live':['NORMAL','PSYCHIC'],'Bob’s Burgers':['NORMAL','FIRE'],'King of the Hill':['FIRE','NORMAL'],
 'Arrested Development':['NORMAL','WATER'],'30 Rock':['NORMAL','PSYCHIC'],'Review':['PSYCHIC','NORMAL'],'Jackie Brown':['NORMAL'],'The Hateful Eight':['ICE','NORMAL'],'Once Upon a Time in Hollywood':['FIRE','NORMAL'],
 'There Will Be Blood':['GROUND','FIRE'],'The Master':['PSYCHIC','WATER'],'Bring Her Back':['GHOST','PSYCHIC'],'Ween':['PSYCHIC','POISON'],'Primus':['GROUND','PSYCHIC'],'The Mars Volta':['FIRE','PSYCHIC'],
 'Metalocalypse':['GHOST','ELECTRIC'],'Daft Punk':['ELECTRIC'],'King Gizzard':['PSYCHIC','DRAGON'],'Melvins':['GROUND','ELECTRIC'],'Mr. Bungle':['GHOST','PSYCHIC'],'Buckethead':['ELECTRIC','GHOST'],
 'Unlimited Savory Systems':['FIRE','POISON'],'Taskmaster':['PSYCHIC'],'Planet Coaster':['FLYING'],'Kitchen Nightmares':['FIRE'],'Pokémon':['NORMAL'],'Home':['NORMAL']
};
// Hand-picked for the household and a few favourites: [types, signature, ability].
const OVERRIDES={
 sean:[['POISON','PSYCHIC'],'MAD SCIENCE','PLOT ARMOR'],amber:[['PSYCHIC','ELECTRIC'],'SPARKLE','SERENE GRACE'],
 kc:[['NORMAL','FIGHTING'],'HERDING','INTIMIDATE'],mylo:[['NORMAL'],'ZOOMIES','SPEED BOOST'],loki:[['NORMAL','GHOST'],'GUARD DOG','STURDY'],
 charlie:[['POISON','GROUND'],'KITTEN MITTEN','GUTS'],mac:[['FIGHTING'],'DAYMAN','INTIMIDATE'],dee:[['NORMAL','FLYING'],'RUM HAM','KEEN EYE'],
 dennis:[['PSYCHIC','FIRE'],'GOLDEN GOD','PRESSURE'],frank:[['POISON'],'EGG ROLL','STURDY'],cricket:[['BUG','POISON'],'RAT BASH','SHED SKIN'],artemis:[['FIRE','NORMAL'],'WILDCARD','FLAME BODY'],
 michael:[['NORMAL','PSYCHIC'],'WORLDS BEST','PLOT ARMOR'],dwight:[['BUG','FIGHTING'],'BEARS BEETS','INTIMIDATE'],creed:[['GHOST','POISON'],'IDENTITY TFT','LEVITATE'],
 prisonmike:[['GHOST','FIGHTING'],'DEMENTORS','INTIMIDATE'],'jim-halpert':[['NORMAL','PSYCHIC'],'PRANK','OWN TEMPO'],'pam-beesly':[['NORMAL','GRASS'],'FIRE DRILL','SECOND WIND'],
 subzero:[['ICE','FIGHTING'],'ICE BALL','INTIMIDATE'],scorpion:[['FIRE','GHOST'],'SPEAR','PRESSURE'],raiden:[['ELECTRIC','FIGHTING'],'THUNDER GOD','STATIC'],'johnny-cage':[['FIGHTING','NORMAL'],'BICYCLE KICK','SUPER LUCK'],
 'liu-kang':[['FIGHTING','FIRE'],'FLYING KICK','BLAZE'],goro:[['FIGHTING','ROCK'],'FATALITY','HUGE POWER'],'mk-shang-tsung':[['GHOST','PSYCHIC'],'SOUL STEAL','PRESSURE'],'mk-reptile':[['DRAGON','POISON'],'TOASTY','POISON POINT'],
 goku:[['FIGHTING','PSYCHIC'],'KAMEHAMEHA','UNDERDOG'],vegeta:[['FIGHTING','ELECTRIC'],'GALICK GUN','PRESSURE'],gohan:[['PSYCHIC','FIGHTING'],'KAMEHAMEHA','SERENE GRACE'],frieza:[['ICE','PSYCHIC'],'DEATH BEAM','PRESSURE'],
 'master-roshi':[['WATER','FIGHTING'],'KAMEHAMEHA','STURDY'],krillin:[['FIGHTING'],'SOLAR FLARE','PLOT ARMOR'],
 'killua-zoldyck':[['ELECTRIC','FIGHTING'],'GODSPEED','STATIC'],'gon-freecss':[['FIGHTING','GRASS'],'JAJANKEN','GUTS'],hisoka:[['PSYCHIC','NORMAL'],'BUNGEE GUM','PRESSURE'],kurapika:[['PSYCHIC','FIGHTING'],'CHAIN JAIL','KEEN EYE'],
 picard:[['PSYCHIC','WATER'],'MAKE IT SO','PRESSURE'],spock:[['PSYCHIC'],'VULCAN PINCH','OWN TEMPO'],kirk:[['NORMAL','FIGHTING'],'KHAAAN','GUTS'],data:[['ELECTRIC','PSYCHIC'],'PHASER','STURDY'],worf:[['FIGHTING'],'PHASER','INTIMIDATE'],
 quark:[['NORMAL','WATER'],'BOX OFFICE','KEEN EYE'],'q-continuum':[['PSYCHIC'],'MIND MELD','PRESSURE'],
 vader:[['PSYCHIC','FIRE'],'FORCE CHOKE','PRESSURE'],yoda:[['PSYCHIC','GRASS'],'FORCE PUSH','SERENE GRACE'],luke:[['PSYCHIC','ELECTRIC'],'LIGHTSABER','UNDERDOG'],palpatine:[['ELECTRIC','GHOST'],'FORCE LIGHTNG','PRESSURE'],
 'han-solo':[['NORMAL','FLYING'],'BLASTER','SUPER LUCK'],chewie:[['NORMAL','FIGHTING'],'BAM POW','INTIMIDATE'],'darth-maul':[['FIGHTING','FIRE'],'LIGHTSABER','PRESSURE'],
 'jerry-seinfeld':[['NORMAL','PSYCHIC'],'YADA YADA','OWN TEMPO'],'george-costanza':[['NORMAL'],'SERENITY NOW','PLOT ARMOR'],'cosmo-kramer':[['NORMAL','ELECTRIC'],'GIDDYUP','SPEED BOOST'],
 'newman-seinfeld':[['POISON'],'HELLO NEWMAN','POISON POINT'],'soup-nazi':[['NORMAL','FIRE'],'NO SOUP 4 YOU','INTIMIDATE'],'frank-costanza':[['NORMAL','FIGHTING'],'SERENITY NOW','GUTS'],
 'pf-jules':[['PSYCHIC','NORMAL'],'EZEKIEL 2517','INTIMIDATE'],'pf-mia':[['NORMAL','PSYCHIC'],'ADRENALINE','PLOT ARMOR'],
 ron:[['GRASS','FIGHTING'],'WOODWORK','STURDY'],leslie:[['NORMAL','GRASS'],'WAFFLES','SECOND WIND'],andy:[['NORMAL','ELECTRIC'],'MOUSE RAT','PLOT ARMOR'],
 cartman:[['NORMAL','POISON'],'AUTHORITAH','GUTS'],randy:[['NORMAL','GRASS'],'SCREW U GUYS','UNDERDOG'],towlie:[['NORMAL','GRASS'],'WANNA GET HI','OWN TEMPO'],butters:[['NORMAL'],'PLOT ARMOR','STURDY'],
 'gordon-ramsay':[['FIRE'],'SAVORY BLAST','INTIMIDATE'],flarpy:[['NORMAL','FLYING'],'ZOOMIES','PLOT ARMOR'],
 'ash-ketchum':[['NORMAL'],'BLAST OFF','UNDERDOG'],pikachu:[['ELECTRIC'],'THUNDER JOLT','STATIC'],misty:[['WATER'],'BUBBLEBEAM','TORRENT'],brock:[['ROCK','GROUND'],'ROCK SOLID','STURDY'],
 'gary-oak':[['NORMAL','PSYCHIC'],'SMELL YA','PRESSURE'],'professor-oak':[['PSYCHIC','GRASS'],'MONOLOGUE','SERENE GRACE'],'jessie-rocket':[['POISON','NORMAL'],'BLAST OFF','SHED SKIN'],
 'james-rocket':[['POISON','GRASS'],'BLAST OFF','SHED SKIN'],meowth:[['NORMAL'],'SLASH','SUPER LUCK']
};
// Two or three signature candidates per source: a character gets one by hash.
const SOURCE_SIGS={
 'Always Sunny':['RUM HAM','DAYMAN','NIGHTMAN','KITTEN MITTEN','FIGHT MILK','WILDCARD'],'The Office':['PARKOUR','BEARS BEETS','WORLDS BEST','IDENTITY TFT','PRANK'],
 'Parks and Recreation':['LIL SEBASTIAN','WAFFLES','WOODWORK','MOUSE RAT'],'South Park':['AUTHORITAH','SCREW U GUYS','WANNA GET HI'],
 'Mortal Kombat':['SPEAR','FATALITY','ICE BALL','BICYCLE KICK','TOASTY','FLYING KICK','SOUL STEAL'],'Seinfeld':['SERENITY NOW','NO SOUP 4 YOU','YADA YADA','GIDDYUP'],
 'James Bond':['SHAKEN','LICENSE 2 KIL','GOLDEN GUN'],'GoldenEye':['GOLDEN GUN','LICENSE 2 KIL'],'Goldfinger':['GOLDEN GUN','SHAKEN'],'Casino Royale':['SHAKEN','LICENSE 2 KIL'],'Skyfall':['LICENSE 2 KIL'],'Dr. No':['SHAKEN'],'The Man with the Golden Gun':['GOLDEN GUN'],
 'Dragon Ball Z':['KAMEHAMEHA','SPIRIT BOMB','KAIOKEN','GALICK GUN','FINAL FLASH','SOLAR FLARE'],'Hunter × Hunter':['JAJANKEN','GODSPEED','BUNGEE GUM','CHAIN JAIL'],'Yu Yu Hakusho':['SPIRIT BOMB','KAIOKEN'],
 'Star Trek':['PHASER','MIND MELD','VULCAN PINCH','ENGAGE','KHAAAN','MAKE IT SO'],'Star Wars':['FORCE CHOKE','LIGHTSABER','MIND TRICK','FORCE PUSH','BLASTER'],
 'Death Stranding':['BT SLAM','TIMEFALL','DELIVERY','STRAND'],'Pulp Fiction':['EZEKIEL 2517','ADRENALINE','ROYALE CHEESE'],'Kill Bill':['5 POINT PALM','HANZO SWORD','CRAZY 88'],
 'Batman':['BATARANG',"I'M BATMAN",'BAM POW'],'Batman (1989)':['BATARANG',"I'M BATMAN"],'Batman Returns':['BATARANG','BAM POW'],'Superman':['HEAT VISION','SUPER BREATH','FLY BY'],
 'Power Rangers':['MORPH','MEGAZORD'],'The Warriors':['COME OUT 2 PLAY','BASEBALL BAT'],'Fast & Furious':['NOS BOOST','FAMILY','QUARTER MILE'],'Django Unchained':['QUICK DRAW','D IS SILENT'],
 'Jackass':['SHOPPING CART','TASER','STUNT'],'Troy':['TROJAN HORSE','ACHILLES HEEL'],'Castlevania':['VAMPIRE KILLR','HOLY WATER'],'Reservoir Dogs':['EAR SLICE','MEXICAN STNDF'],
 'Inglourious Basterds':['BEAR JEW BAT','GORLAMI'],'Back to the Future':['GIGAWATTS','GREAT SCOTT'],'Jurassic Park':['CLEVER GIRL','LIFE FINDS'],'Superbad':['MCLOVIN','BEER BONG'],
 'Terminator':['ILL BE BACK','TERMINATE'],'The Matrix':['BULLET TIME','RED PILL','KUNG FU'],'Teenage Mutant Ninja Turtles':['COWABUNGA','PIZZA TIME'],'The Godfather':['OFFER','HORSE HEAD'],
 'The Big Lebowski':['DUDE ABIDES','WHITE RUSSIAN'],'Austin Powers':['YEAH BABY','MOJO'],'Saw':['GAME OVER','JIGSAW'],'Black Sabbath':['DOOM RIFF','POWER CHORD'],'Sleep':['DOOM RIFF','WANNA GET HI'],
 'Electric Wizard':['DOOM RIFF','POWER CHORD'],'Metalocalypse':['SHRED','DOOM RIFF'],'REZN':['DOOM RIFF','POWER CHORD'],'Buckethead':['SHRED'],'Melvins':['DOOM RIFF','DRUM SOLO'],'The Mars Volta':['SHRED','DRUM SOLO'],
 'Primus':['POWER CHORD','DRUM SOLO'],'Ween':['POWER CHORD','ENCORE'],'King Gizzard':['SHRED','DRUM SOLO'],'The Beatles':['ENCORE','BOY BAND'],'*NSYNC':['BOY BAND','FALSETTO','BYE BYE BYE'],'Backstreet Boys':['BOY BAND','FALSETTO'],
 'Red Dead Redemption 2':['DEAD EYE','LASSO','QUICK DRAW'],'Red Dead Redemption':['DEAD EYE','LASSO'],'Clint Eastwood':['GOOD AIM','QUICK DRAW'],'Dirty Harry':['GOOD AIM'],
 'Super Troopers':['DUFF SPLASH','BEER BONG'],'Jay and Silent Bob':['WANNA GET HI','BUM RUSH'],'Tommy Boy':['TRUCK NUTS','BUM RUSH'],'ShambConkins Friends':['ROLL A NAT 20','BEER BONG','POWER CHORD'],
 'Friday the 13th':['MACHETE'],'A Nightmare on Elm Street':['DREAM DEMON'],'Unlimited Savory Systems':['SAVORY BLAST','MAD SCIENCE'],'Pokémon':['BLAST OFF','THUNDER JOLT']
};
const GENERIC_SIGS=['MONOLOGUE','PLOT ARMOR','JUMP SCARE','PLOT TWIST','CATCHPHRASE','STUNT DOUBLE','SEQUEL','DIRECTORS CUT','SLOW MO','MONTAGE','CLIFFHANGER','LAUGH TRACK','MIC DROP','CAMEO','SPOILER ALERT','BOX OFFICE','REBOOT','FAN SERVICE','ENCORE','FINAL CUT'];
const HORROR=new Set(['horror']);

const glyphs=s=>[...String(s)].filter(ch=>{const n=ch.codePointAt(0);return n>0x2100&&n!==0xfe0f&&n!==0x200d;});
function iconType(icon){if(!icon)return null;const mine=glyphs(icon);for(const [list,type] of ICON_TYPES)if(glyphs(list).some(ch=>mine.includes(ch)))return type;return null;}
const KEYWORDS=[[/fire|flame|burn|hell|demon|devil|satan|chef|cook|grill/i,'FIRE'],[/water|sea|ocean|surf|fish|shark|beach|swim|pool|rain/i,'WATER'],[/robot|android|cyborg|electric|computer|tech|laser|droid/i,'ELECTRIC'],
 [/ghost|zombie|vampire|dead|undead|skull|witch|haunt|spirit|reaper|killer|slasher/i,'GHOST'],[/karate|ninja|boxer|fighter|warrior|soldier|samurai|kung|wrestl|ranger/i,'FIGHTING'],[/bird|wing|pilot|fly|bat\b/i,'FLYING'],
 [/psychic|wizard|mage|monk|guru|prophet|mind|telepath|alien|god\b/i,'PSYCHIC'],[/dragon|dino|lizard/i,'DRAGON'],[/bug|insect|spider|ant\b|fly\b|roach/i,'BUG'],[/rock|stone|golem|statue/i,'ROCK'],[/ice|snow|frost|cold|frozen/i,'ICE']];
const speciesCache=new Map();
function speciesFor(id){
 if(speciesCache.has(id))return speciesCache.get(id);
 const c=character(id)||{id,name:id,source:'',icon:'?'},key=c.id,identity=characterIdentity(key),h=hash('pkmn:'+identity),ov=OVERRIDES[key]||OVERRIDES[identity];
 let types=ov?.[0];
 if(!types){
  const fromIcon=iconType(c.icon),src=SOURCE_TYPES[c.source],text=c.name+' '+(c.unlockPhrase||'')+' '+(c.perk||''),kw=KEYWORDS.find(([re])=>re.test(text))?.[1];
  const first=fromIcon||kw||src?.[h%src.length]||['NORMAL','NORMAL','FIGHTING','PSYCHIC','POISON','GROUND','FLYING','WATER','FIRE','ELECTRIC','GRASS'][h%11];
  const pool=[...(src||[]),kw,c.unlockBy==='horror'?'GHOST':null].filter(t=>t&&t!==first);
  const second=pool.length&&(h>>>4)%3?pool[(h>>>8)%pool.length]:null;
  types=second?[first,second]:[first];
 }
 // Base stat total: bosses and horror icons are strong, the starters well rounded.
 const special={boss:540,horror:520,dogs:420,lab:470,'character-win':500,'game-win':490,item:480}[c.unlockBy];
 const bst=special||{sean:450,amber:450,loki:430,'gordon-ramsay':470,'gary-oak':500,pikachu:430}[key]||300+(h>>>3)%175;
 const shape=SHAPES[types[0]].map((w,i)=>w*(0.86+((h>>>(5+i*3))%9)*0.035)),sum=shape.reduce((a,b)=>a+b,0);
 const [hp,atk,def,spc,spd]=shape.map(w=>Math.max(20,Math.min(165,Math.round(bst*w/sum))));
 const pool=SOURCE_SIGS[c.source]||[];const sig=ov?.[1]||(pool.length?pool[(h>>>11)%pool.length]:GENERIC_SIGS[(h>>>11)%GENERIC_SIGS.length]);
 const abilities=TYPE_ABILITIES[types[0]],ability=ov?.[2]||(((h>>>13)%23===0)?'HUGE POWER':abilities[(h>>>14)%abilities.length]);
 const status=[...STATUS_MOVES[types[0]],...(types[1]?STATUS_MOVES[types[1]]:[])],statusMove=status[(h>>>17)%status.length];
 const dex=Math.max(0,CHARACTERS.findIndex(x=>x.id===key))+1;
 const sp={id:key,name:battleName(c),types,base:{hp,atk,def,spc,spd},bst,sig,ability,statusMove,dex,source:c.source,
  catchRate:Math.max(45,Math.min(220,Math.round(255-bst*0.42))),expYield:Math.round(bst/4.6),icon:c.icon,h};
 speciesCache.set(id,sp);return sp;
}
// Gen 1 names are capitals, at most 10 cells.
const NAME_OVERRIDES={cricket:'CRICKET','prisonmike':'PRISONMIKE','q-continuum':'Q','newman-seinfeld':'NEWMAN','cosmo-kramer':'KRAMER','pf-mia':'MIA','pf-jules':'JULES','pf-vincent':'VINCENT'};
const SKIP=new Set(['THE','DR.','DR','MR.','MR','MRS.','MS.','LORD','KING','SIR','CAPTAIN','GENERAL','BIG','LITTLE','OLD','YOUNG','UNCLE','AUNT','EMPEROR','MASTER','PROFESSOR','DARTH','MOM','DAD','LT.','SGT.']);
function battleName(c){
 if(NAME_OVERRIDES[c.id])return NAME_OVERRIDES[c.id];
 const raw=String(c.name||c.id).split('·')[0].trim().normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9 .'\-]/g,'').trim();
 if(raw.length<=10)return raw||'???';
 const words=raw.split(/\s+/);const first=words.find(w=>!SKIP.has(w)&&w.length>=3)||words[0];
 if(first.length<=10&&first.length>=3)return first;
 return raw.replace(/\s+/g,'').slice(0,10);
}

// Moves at a level: [secondary/normal attack, primary attack, status move, signature].
function tierAt(level){return level<18?0:level<35?1:2;}
function movesAt(id,level){
 const sp=speciesFor(id),t=tierAt(level),[t1,t2]=sp.types,pickFrom=(type,salt)=>{const list=TYPE_MOVES[type][t];return list[(sp.h>>>salt)%list.length];};
 const first=pickFrom(t2||'NORMAL',19),second=pickFrom(t1,21);
 const out=[];for(const m of [first,second,sp.statusMove,sp.sig])if(MOVES[m]&&!out.includes(m))out.push(m);
 if(out.length<4)for(const m of ['TACKLE','QUICK ATTACK','GROWL','LEER'])if(out.length<4&&!out.includes(m))out.push(m);
 return out;
}

// ------------------------------------------------------------ stats and experience
const STAT_KEYS=['hp','atk','def','spc','spd'];
function statsAt(id,level,dv=8){
 const b=speciesFor(id).base;
 const calc=(base)=>Math.floor((base+dv)*2*level/100);
 return {hp:calc(b.hp)+level+10,atk:calc(b.atk)+5,def:calc(b.def)+5,spc:calc(b.spc)+5,spd:calc(b.spd)+5};
}
const expFor=level=>level<=1?0:level**3;
function levelForExp(exp){let l=1;while(l<100&&expFor(l+1)<=exp)l++;return l;}
// Experience is boosted over Gen 1 so a team grows across one evening's run.
function expGain(foeId,foeLevel,trainer,share=1){const y=speciesFor(foeId).expYield;return Math.max(1,Math.floor(y*foeLevel/7*(trainer?1.5:1)*2.2/Math.max(1,share)));}

// A party member as saved in a run: {id, lvl, exp, hp, status, pp:{MOVE:left}}.
function makeMon(id,level){const s=statsAt(id,level);return {id,lvl:level,exp:expFor(level),hp:s.hp,status:null,pp:{}};}
function ppLeft(mon,m){const max=move(m).pp;const v=mon.pp?.[m];return Number.isFinite(v)?Math.max(0,Math.min(max,v)):max;}
function healMon(mon){mon.hp=statsAt(mon.id,mon.lvl).hp;mon.status=null;mon.pp={};return mon;}
function validMon(m){return m&&typeof m.id==='string'&&CHARACTERS.some(c=>c.id===m.id)&&Number.isInteger(m.lvl)&&m.lvl>=1&&m.lvl<=100&&Number.isFinite(m.hp)&&m.hp>=0&&Number.isFinite(m.exp);}
function normalizeMon(m){if(!validMon(m))return null;const max=statsAt(m.id,m.lvl).hp;return {id:m.id,lvl:m.lvl,exp:Math.max(m.exp,expFor(m.lvl)),hp:Math.min(max,Math.round(m.hp)),status:['par','brn','psn','slp','frz'].includes(m.status)?m.status:null,slp:Number.isFinite(m.slp)?m.slp:0,pp:m.pp&&typeof m.pp==='object'?Object.fromEntries(Object.entries(m.pp).filter(([k,v])=>MOVES[k]&&Number.isFinite(v))):{}};}

// ------------------------------------------------------------ items
// Battle bag items (Gen 1 names, including the ELIXER spelling).
const BAG_ITEMS={
 'poke-ball':{name:'POKé BALL',ball:1},'great-ball':{name:'GREAT BALL',ball:1.5},'ultra-ball':{name:'ULTRA BALL',ball:2},'master-ball':{name:'MASTER BALL',ball:255},
 'potion':{name:'POTION',heal:20},'super-potion':{name:'SUPER POTION',heal:50},'hyper-potion':{name:'HYPER POTION',heal:200},'max-potion':{name:'MAX POTION',heal:9999},
 'full-restore':{name:'FULL RESTORE',heal:9999,cure:'all'},'revive':{name:'REVIVE',revive:.5},'max-revive':{name:'MAX REVIVE',revive:1},
 'antidote':{name:'ANTIDOTE',cure:'psn'},'parlyz-heal':{name:'PARLYZ HEAL',cure:'par'},'awakening':{name:'AWAKENING',cure:'slp'},'burn-heal':{name:'BURN HEAL',cure:'brn'},'ice-heal':{name:'ICE HEAL',cure:'frz'},'full-heal':{name:'FULL HEAL',cure:'all'},
 'x-attack':{name:'X ATTACK',boost:'atk'},'x-defend':{name:'X DEFEND',boost:'def'},'x-speed':{name:'X SPEED',boost:'spd'},'x-special':{name:'X SPECIAL',boost:'spc'},'x-accuracy':{name:'X ACCURACY',boost:'acc'},
 'dire-hit':{name:'DIRE HIT',focus:true},'rare-candy':{name:'RARE CANDY',candy:true},'ether':{name:'ETHER',pp:10},'elixer':{name:'ELIXER',pp:99},'poke-doll':{name:'POKé DOLL',flee:true}
};
const BAG_ORDER=Object.keys(BAG_ITEMS);
const {PKMN_CATALOG_ITEMS}=require("src/data/pkmnItems.js");

// Trainer classes (the Gen 1 roster of who stands on every route).
const TRAINER_CLASSES=['YOUNGSTER','LASS','BUG CATCHER','HIKER','SUPER NERD','GAMBLER','ROCKER','JUGGLER','BIKER','BURGLAR','SCIENTIST','BEAUTY','COOLTRAINER','BLACKBELT','CHANNELER','SAILOR','FISHER','GENTLEMAN','ENGINEER','PSYCHIC','CUE BALL','BIRD KEEPER','TAMER','POKéMANIAC'];
function trainerClassFor(id){const sp=speciesFor(id),t=sp.types[0];const byType={BUG:'BUG CATCHER',GROUND:'HIKER',ROCK:'HIKER',FIGHTING:'BLACKBELT',GHOST:'CHANNELER',WATER:'SAILOR',PSYCHIC:'PSYCHIC',FLYING:'BIRD KEEPER',ELECTRIC:'ENGINEER',POISON:'SCIENTIST',FIRE:'BURGLAR',DRAGON:'COOLTRAINER',ICE:'BEAUTY',GRASS:'LASS'};return sp.h%3===0?TRAINER_CLASSES[(sp.h>>>3)%TRAINER_CLASSES.length]:byType[t]||TRAINER_CLASSES[(sp.h>>>5)%TRAINER_CLASSES.length];}

Object.assign(exports,{TYPES,PHYSICAL,CHART,effectiveness,MOVES,move,ABILITIES,speciesFor,battleName,movesAt,tierAt,statsAt,STAT_KEYS,expFor,levelForExp,expGain,makeMon,ppLeft,healMon,validMon,normalizeMon,BAG_ITEMS,BAG_ORDER,PKMN_CATALOG_ITEMS,TRAINER_CLASSES,trainerClassFor});
