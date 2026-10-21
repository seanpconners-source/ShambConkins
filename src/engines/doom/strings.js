// Default text for the Doom minigame when the WAD has no DEHACKED strings (the owner's own DOOM.WAD/DOOM2.WAD):
// pickup and door messages, level names, monster names for the cast call, finale backdrops. Freedoom's own text
// comes from its DEHACKED lump and replaces these. The episode finale texts below are our own short ones.
const S={
 GOTARMOR:'Picked up the armor.',GOTMEGA:'Picked up the MegaArmor!',GOTHTHBONUS:'Picked up a health bonus.',GOTARMBONUS:'Picked up an armor bonus.',
 GOTSTIM:'Picked up a stimpack.',GOTMEDINEED:'Picked up a medikit that you REALLY need!',GOTMEDIKIT:'Picked up a medikit.',GOTSUPER:'Supercharge!',
 GOTBLUECARD:'Picked up a blue keycard.',GOTYELWCARD:'Picked up a yellow keycard.',GOTREDCARD:'Picked up a red keycard.',
 GOTBLUESKUL:'Picked up a blue skull key.',GOTYELWSKUL:'Picked up a yellow skull key.',GOTREDSKULL:'Picked up a red skull key.',
 GOTINVUL:'Invulnerability!',GOTBERSERK:'Berserk!',GOTINVIS:'Partial Invisibility',GOTSUIT:'Radiation Shielding Suit',GOTMAP:'Computer Area Map',
 GOTVISOR:'Light Amplification Visor',GOTMSPHERE:'MegaSphere!',GOTCLIP:'Picked up a clip.',GOTCLIPBOX:'Picked up a box of bullets.',
 GOTROCKET:'Picked up a rocket.',GOTROCKBOX:'Picked up a box of rockets.',GOTCELL:'Picked up an energy cell.',GOTCELLBOX:'Picked up an energy cell pack.',
 GOTSHELLS:'Picked up 4 shotgun shells.',GOTSHELLBOX:'Picked up a box of shotgun shells.',GOTBACKPACK:'Picked up a backpack full of ammo!',
 GOTBFG9000:'You got the BFG9000!  Oh, yes.',GOTCHAINGUN:'You got the chaingun!',GOTCHAINSAW:'A chainsaw!  Find some meat!',
 GOTLAUNCHER:'You got the rocket launcher!',GOTPLASMA:'You got the plasma gun!',GOTSHOTGUN:'You got the shotgun!',GOTSHOTGUN2:'You got the super shotgun!',
 PD_BLUEO:'You need a blue key to activate this object',PD_REDO:'You need a red key to activate this object',PD_YELLOWO:'You need a yellow key to activate this object',
 PD_BLUEK:'You need a blue key to open this door',PD_REDK:'You need a red key to open this door',PD_YELLOWK:'You need a yellow key to open this door',
 STSTR_DQDON:'Degreelessness Mode On',STSTR_DQDOFF:'Degreelessness Mode Off',STSTR_KFAADDED:'Very Happy Ammo Added',STSTR_FAADDED:'Ammo (no keys) Added',
 STSTR_NCON:'No Clipping Mode ON',STSTR_NCOFF:'No Clipping Mode OFF',STSTR_CHOPPERS:'... doesn\'t suck - GM',
 AMSTR_FOLLOWON:'Follow Mode ON',AMSTR_FOLLOWOFF:'Follow Mode OFF',
 NIGHTMARE:'are you sure? this skill level\nisn\'t even remotely fair.\n\npress y or n.',
 CC_ZOMBIE:'ZOMBIEMAN',CC_SHOTGUN:'SHOTGUN GUY',CC_HEAVY:'HEAVY WEAPON DUDE',CC_IMP:'IMP',CC_DEMON:'DEMON',CC_LOST:'LOST SOUL',CC_CACO:'CACODEMON',
 CC_HELL:'HELL KNIGHT',CC_BARON:'BARON OF HELL',CC_ARACH:'ARACHNOTRON',CC_PAIN:'PAIN ELEMENTAL',CC_REVEN:'REVENANT',CC_MANCU:'MANCUBUS',
 CC_ARCH:'ARCH-VILE',CC_SPIDER:'THE SPIDER MASTERMIND',CC_CYBER:'THE CYBERDEMON',CC_HERO:'OUR HERO',
 BGFLATE1:'FLOOR4_8',BGFLATE2:'SFLR6_1',BGFLATE3:'MFLR8_4',BGFLATE4:'MFLR8_3',BGFLAT06:'SLIME16',BGFLAT11:'RROCK14',BGFLAT20:'RROCK07',BGFLAT30:'RROCK17',BGFLAT15:'RROCK13',BGFLAT31:'RROCK19',
 E1TEXT:'The moon base is quiet at last.\n\nBut the teleporters did not take you\nhome. They dropped you somewhere\nworse, and the walls are breathing.\n\nKeep your shotgun close.\nThe next episode is waiting.',
 E2TEXT:'The tower falls and the sky splits\nopen above you. Below the moon\nthere is only fire and stone.\n\nThere is no way back now except\nthrough. Hell had better be ready.',
 E3TEXT:'The mastermind lies in pieces.\n\nA door of light opens over green\nhills. You step through it and\nsmell the wind of home.\n\nThen you see the smoke on the horizon.',
 E4TEXT:'The last horror is broken and the\ndemons scatter back into the dark.\n\nYou have earned a rest. Somebody\nelse can take the next shift.',
 C1TEXT:'You fought your way out of the\ninfested starport. The streets\nbeyond are full of them too.\n\nReload. Keep moving.',
 C2TEXT:'The last of the survivors are\naboard and away. You stay behind\nto hold the line.\n\nThe city is theirs now. Take it back.',
 C3TEXT:'The gate to the other side stands\nopen in the heart of the city.\n\nOnly one way to close it:\ngo through.',
 C4TEXT:'The great demon falls, and the\nearth stops shaking.\n\nThe sun comes up over a world\nthat still has people in it.\nYou did that.',
 C5TEXT:'Congratulations, you found the\nsecret level. Things are about\nto get strange.',
 C6TEXT:'Even stranger. Watch your back.',
 QUITMSG:'are you sure you want to\nquit this great game?',
 QUITMSG1:'please don\'t leave, there\'s more\ndemons to toast!',QUITMSG2:'let\'s beat it -- this is turning\ninto a bloodbath!',QUITMSG3:'i wouldn\'t leave if i were you.\nthe board game is much worse.',
 QUITMSG4:'you\'re trying to say you like the\nboard game better than me, right?',QUITMSG5:'don\'t leave yet -- there\'s a\ndemon around that corner!',QUITMSG6:'ya know, next time you come in here\ni\'m gonna toast ya.',QUITMSG7:'go ahead and leave. see if i care.',
};
const D1NAMES=[
 ['Hangar','Nuclear Plant','Toxin Refinery','Command Control','Phobos Lab','Central Processing','Computer Station','Phobos Anomaly','Military Base'],
 ['Deimos Anomaly','Containment Area','Refinery','Deimos Lab','Command Center','Halls of the Damned','Spawning Vats','Tower of Babel','Fortress of Mystery'],
 ['Hell Keep','Slough of Despair','Pandemonium','House of Pain','Unholy Cathedral','Mt. Erebus','Limbo','Dis','Warrens'],
 ['Hell Beneath','Perfect Hatred','Sever the Wicked','Unruly Evil','They Will Repent','Against Thee Wickedly','And Hell Followed','Unto the Cruel','Fear']];
const D2NAMES=['Entryway','Underhalls','The Gantlet','The Focus','The Waste Tunnels','The Crusher','Dead Simple','Tricks and Traps','The Pit','Refueling Base',
 '\'O\' of Destruction!','The Factory','Downtown','The Inmost Dens','Industrial Zone','Suburbs','Tenements','The Courtyard','The Citadel','Gotcha!',
 'Nirvana','The Catacombs','Barrels o\' Fun','The Chasm','Bloodfalls','The Abandoned Mines','Monster Condo','The Spirit World','The Living End','Icon of Sin','Wolfenstein','Grosse'];
D1NAMES.forEach((ep,e)=>ep.forEach((n,m)=>{S[`HUSTR_E${e+1}M${m+1}`]=`E${e+1}M${m+1}: ${n}`;}));
D2NAMES.forEach((n,i)=>{S[`HUSTR_${i+1}`]=`level ${i+1}: ${n}`;});
// vanilla par times (seconds)
const PARS={E1:[30,75,120,90,165,180,180,30,165],E2:[90,90,90,120,90,360,240,30,170],E3:[90,45,90,150,90,90,165,30,135]};
const CPARS=[30,90,120,120,90,150,120,120,270,90,210,150,150,150,210,150,420,150,210,150,240,150,180,150,150,300,330,420,300,180,120,30];
Object.assign(exports,{STRINGS:S,PARS,CPARS});
