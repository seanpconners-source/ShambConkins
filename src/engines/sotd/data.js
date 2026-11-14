// SEAN OF THE DEAD 2.0 data (owner, Nov 13: "badass towers with super powered upgrade paths", general zombie movies are
// fair game). Kingdom Rush style: six tower lines, tiers 1-3 in a row, then pick ONE of two apex paths (tier 4) and
// max it (tier 5). Plus the heroes' weapons, the Winchester's own upgrades, two powers and the zombie roster.
// Damage types: phys (armour cuts it), blast (half armour), fire (ignores armour, burns), true.

// Tower node fields: name, icon, cost, desc, kind + stats. Kinds:
//  spread  shotgun cone: pellets x dmg, cone (rad), kb = knockback
//  rifle   one shot: crit chance (x3), headshot (instakill non-boss chance), pierce (whole line), first (target the
//          front zombie instead of the toughest)
//  lob     arcing shot: splash radius, burn dps, pool (fire pool dps/secs/radius)
//  flame   continuous cone: dps, burn
//  crew    blockers: men, hp, dmg, rate, cleave, block (zombies held each), shoot (ranged dmg when free)
//  pulse   support aura: slow, dmg every rate, buff (nearby towers fire faster), stun every N s, vuln (extra damage taken)
//  mines   plants mines on the road: every, max, dmg, splash
//  saw     chainsaw aura: dps in radius; blast = 360° boomstick every N s
const TOWERS={
 gun:{name:'Boomstick',icon:'💥',col:'#e0a040',tiers:{
  1:{name:'Shotgun',cost:90,kind:'spread',range:80,rate:1.1,pellets:4,dmg:6,cone:.5,desc:'Point, click, boom. Hits a cone of the dead.'},
  2:{name:'Double Barrel',cost:110,kind:'spread',range:86,rate:1,pellets:6,dmg:7,cone:.55,desc:'Twice the barrels, twice the fun.'},
  3:{name:'Boomstick',cost:160,kind:'spread',range:92,rate:.9,pellets:8,dmg:9,cone:.6,kb:8,desc:'“This... is my BOOMSTICK!” Knocks them back.'},
  A4:{name:'Chainsaw Hand',cost:250,kind:'saw',range:94,dps:110,desc:'Ash swaps the hand for a chainsaw. Shreds everything next to it.',quote:'Groovy.'},
  A5:{name:'Hail to the King',cost:420,kind:'saw',range:108,dps:220,blast:{every:4,pellets:14,dmg:45},desc:'Chainsaw AND a 360° boomstick blast every 4 seconds.',quote:'Hail to the king, baby.'},
  B4:{name:'Dragon’s Breath',cost:260,kind:'spread',range:100,rate:.85,pellets:10,dmg:10,cone:.75,burn:10,kb:6,desc:'Incendiary shells: every pellet sets them on fire.'},
  B5:{name:'Phoenix Rounds',cost:430,kind:'spread',range:115,rate:.6,pellets:14,dmg:14,cone:.85,burn:24,kb:10,desc:'A wall of burning buckshot. Nothing walks through it.'}}},
 rifle:{name:'Rifles',icon:'🎯',col:'#9fc2ff',tiers:{
  1:{name:'The Winchester',cost:100,kind:'rifle',range:150,rate:1.6,dmg:32,desc:'Is it real? It’s real. Picks off the toughest one in range.'},
  2:{name:'Hunting Rifle',cost:120,kind:'rifle',range:166,rate:1.4,dmg:52,desc:'Bigger calibre, longer reach.'},
  3:{name:'Sniper Nest',cost:170,kind:'rifle',range:188,rate:1.25,dmg:80,crit:.15,desc:'15% chance of a triple-damage HEADSHOT.'},
  A4:{name:'.50 Cal Overwatch',cost:280,kind:'rifle',range:210,rate:1.4,dmg:230,pierce:true,headshot:.18,desc:'Punches through every zombie in a line. 18% instant headshots.'},
  A5:{name:'Deadshot',cost:450,kind:'rifle',range:240,rate:1.1,dmg:520,pierce:true,headshot:.4,desc:'Anti-materiel rounds. 40% of shots just end them.',quote:'Aim for the head.'},
  B4:{name:'Gatling Nest',cost:290,kind:'rifle',range:190,rate:.11,dmg:11,first:true,desc:'A belt-fed minigun. Shreds the front of the horde.'},
  B5:{name:'Twin Miniguns',cost:460,kind:'rifle',range:210,rate:.05,dmg:15,first:true,armorPierce:true,desc:'Two miniguns that ignore armour. Brrrrrrt.'}}},
 crew:{name:'Fighters',icon:'🏏',col:'#7dd36a',tiers:{
  1:{name:'Pool Cue Crew',cost:80,kind:'crew',range:62,men:2,hp:60,dmg:7,rate:.8,desc:'Two lads with pool cues. They block the road.'},
  2:{name:'Cricket Bat Lads',cost:100,kind:'crew',range:66,men:3,hp:90,dmg:10,rate:.75,desc:'Three of them now, with proper bats.'},
  3:{name:'Mall Survivors',cost:150,kind:'crew',range:70,men:3,hp:140,dmg:15,rate:.7,armor:.25,desc:'Tough survivors in sports pads. Hold the line.'},
  A4:{name:'Katana Squad',cost:260,kind:'crew',range:74,men:3,hp:170,dmg:34,rate:.45,cleave:true,desc:'Walking Dead swordfighters. Every swing cuts everything next to them.'},
  A5:{name:'Katana Masters',cost:430,kind:'crew',range:80,men:4,hp:260,dmg:60,rate:.38,cleave:true,desc:'Four blades. Heads roll.',quote:'Stay on the path.'},
  B4:{name:'Riot Squad',cost:250,kind:'crew',range:72,men:4,hp:330,dmg:14,rate:.7,armor:.5,block:2,desc:'Riot shields. Each one holds two zombies at once.'},
  B5:{name:'SWAT Team',cost:420,kind:'crew',range:78,men:4,hp:480,dmg:22,rate:.6,armor:.6,block:3,shoot:14,desc:'Armoured, holds three each, and shoots when nobody’s close.'}}},
 fire:{name:'Fire',icon:'🔥',col:'#ff7a3a',tiers:{
  1:{name:'Molotov',cost:110,kind:'lob',range:100,rate:2.2,dmg:12,splash:32,burn:5,desc:'A bottle of fire. Burns through armour.'},
  2:{name:'Petrol Bombs',cost:120,kind:'lob',range:106,rate:2,dmg:18,splash:38,burn:8,desc:'Bigger bottles, bigger fires.'},
  3:{name:'Flamethrower',cost:170,kind:'flame',range:108,dps:42,burn:8,desc:'Hoses the road with fire.'},
  A4:{name:'Napalm',cost:270,kind:'lob',range:130,rate:2.4,dmg:30,splash:46,burn:14,pool:{dps:34,t:4,r:46},desc:'Leaves pools of burning napalm on the road.'},
  A5:{name:'Scorched Earth',cost:450,kind:'lob',range:150,rate:1.8,dmg:50,splash:56,burn:22,pool:{dps:70,t:6,r:58},desc:'The whole street is on fire. Good.',quote:'I love the smell of napalm.'},
  B4:{name:'Hellfire Tank',cost:290,kind:'flame',range:120,dps:95,burn:14,desc:'A tank of fuel and a very long nozzle.'},
  B5:{name:'Inferno',cost:480,kind:'flame',range:136,dps:180,burn:26,spread:true,desc:'Burning zombies set the ones next to them on fire.'}}},
 boom:{name:'Explosives',icon:'💣',col:'#d0d0d0',tiers:{
  1:{name:'Pipe Bombs',cost:120,kind:'lob',range:110,rate:2.6,dmg:22,splash:40,blast:true,desc:'Lobs pipe bombs into the crowd.'},
  2:{name:'Grenade Launcher',cost:130,kind:'lob',range:118,rate:2.2,dmg:34,splash:44,blast:true,desc:'Faster, further, louder.'},
  3:{name:'Mortar Pit',cost:190,kind:'lob',range:155,rate:2.6,dmg:58,splash:52,blast:true,desc:'Long range shells.'},
  A4:{name:'Claymore Field',cost:260,kind:'mines',range:160,every:2.6,max:6,dmg:130,splash:42,desc:'Plants claymores on the road. Front toward enemy.'},
  A5:{name:'Minefield',cost:430,kind:'mines',range:180,every:1.3,max:10,dmg:260,splash:52,desc:'Ten mines at a time, and they’re not small.'},
  B4:{name:'Big Bertha',cost:300,kind:'lob',range:230,rate:3.4,dmg:170,splash:72,blast:true,desc:'A howitzer in the beer garden.'},
  B5:{name:'Daisy Cutter',cost:490,kind:'lob',range:260,rate:3.6,dmg:420,splash:105,blast:true,desc:'One shell, one empty street.',quote:'Fire in the hole!'}}},
 juke:{name:'Jukebox',icon:'🎵',col:'#ff7ad9',tiers:{
  1:{name:'Jukebox',cost:90,kind:'pulse',range:70,rate:1.2,dmg:4,slow:.35,desc:'Slows the dead down and thumps them on the beat.'},
  2:{name:'Pub Speakers',cost:100,kind:'pulse',range:82,rate:1.1,dmg:8,slow:.45,desc:'Louder. Slower zombies.'},
  3:{name:'Queen on Eleven',cost:150,kind:'pulse',range:92,rate:1,dmg:12,slow:.55,buff:.15,desc:'Towers nearby fire 15% faster to the beat.'},
  A4:{name:'Don’t Stop Me Now',cost:250,kind:'pulse',range:100,rate:.9,dmg:16,slow:.55,buff:.3,stun:{every:8,t:1.5},desc:'Every 8 s the whole crowd freezes for 1.5 s. Nearby towers +30% speed.'},
  A5:{name:'Bohemian Rhapsody',cost:420,kind:'pulse',range:115,rate:.8,dmg:26,slow:.6,buff:.5,stun:{every:5,t:2},desc:'Freezes them every 5 s. Nearby towers +50% speed. Galileo!'},
  B4:{name:'Air Raid Siren',cost:250,kind:'pulse',range:135,rate:1,dmg:10,slow:.5,vuln:.3,desc:'Huge range: slowed zombies take 30% more damage from everything.'},
  B5:{name:'Doomsday Siren',cost:420,kind:'pulse',range:175,rate:.9,dmg:18,slow:.6,vuln:.55,desc:'+55% damage taken across half the map.'}}}
};
const LINES=['gun','rifle','crew','fire','boom','juke'];
const node=(line,tier,branch)=>TOWERS[line].tiers[tier<=3?tier:branch+tier];

// heroes: level from kills (stats +11% a level, max 10) and a weapon path bought in their card
const HERO_WEAPONS=[
 {name:'Cricket Bat',dmg:16,rate:.7,reach:24,desc:'Take car. Go to Mum’s. Kill Phil…'},
 {name:'Lucille',cost:150,dmg:30,rate:.7,reach:26,kb:10,desc:'Barbed-wire baseball bat. Knocks them flying.'},
 {name:'Chainsaw',cost:300,dps:85,reach:28,desc:'Constant shredding up close.'},
 {name:'Boomstick & Chainsaw',cost:500,dps:120,reach:30,gun:{rate:1.1,range:100,pellets:7,dmg:14},desc:'Ash’s full kit: chainsaw hand plus a boomstick.'}
];
const HERO={hp:160,smash:{cd:18,r:60,dmg:60,stun:1.4}};

// the Winchester's own upgrades (tap the pub); in 2P both players pay half
const PUB={
 door:{name:'Barricade the Doors',icon:'🚪',levels:[{cost:150,pints:6,desc:'+6 pints (and the limit).'},{cost:260,pints:8,desc:'+8 more pints.'}]},
 turret:{name:'Lock-in Shotgun',icon:'🔫',levels:[{cost:200,range:80,dmg:22,rate:1,desc:'The landlord shoots from the window.'},{cost:320,range:100,dmg:44,rate:.6,desc:'Two barrels, faster.'}]},
 tab:{name:'Bar Tab',icon:'💷',levels:[{cost:200,gold:.15,desc:'+15% cash from every kill.'},{cost:350,gold:.35,desc:'+35% cash from every kill.'}]}
};
// powers (shared): tap the button, then (strike) where
const POWERS={
 bus:{name:'Armoured Bus',icon:'🚌',cd:45,dmg:280,desc:'Dawn of the Dead: a chainsaw-plated bus ploughs down the road.'},
 strike:{name:'Petrol Strike',icon:'☄️',cd:32,dmg:120,r:46,desc:'Tap the map: six fireballs rain down there.'}
};

// zombies: hp, speed (world units/s), gold, pints lost, size (draw scale), armor, bite (dps vs blockers), dodge (runners
// slip past fighters and heroes: 28 Days Later)
const ZOMBIES={
 shambler:{hp:40,sp:33,gold:4,pints:1,size:1,bite:10,shirt:'#6b6f7a',pants:'#3a3a44'},
 runner:{hp:30,sp:69,gold:4,pints:1,size:.95,bite:8,dodge:true,shirt:'#b8463e',pants:'#2a2a33',name:'Runner'},
 crawler:{hp:24,sp:45,gold:3,pints:1,size:.7,bite:4,shirt:'#5a5a4a',pants:'#33302a',crawl:true,name:'Crawler'},
 riot:{hp:70,sp:30,gold:7,pints:1,size:1.05,bite:14,armor:.5,shirt:'#1e2a3a',pants:'#141c26',helmet:true,name:'Riot cop'},
 bloater:{hp:160,sp:21,gold:10,pints:2,size:1.35,bite:16,shirt:'#5d7a3e',pants:'#3b4a2a',burst:true,name:'Bloater'},
 screamer:{hp:60,sp:33,gold:8,pints:1,size:.95,bite:10,shirt:'#d0c8e0',pants:'#4a3a5a',scream:true,name:'Screamer'},
 brute:{hp:600,sp:20,gold:25,pints:3,size:1.75,bite:60,armor:.2,shirt:'#3a2a20',pants:'#201812',name:'Brute'},
 boss:{hp:9000,sp:16,gold:300,pints:12,size:2.5,bite:70,armor:.25,shirt:'#3a2a4a',pants:'#1e1428',boss:true}
};
const WAVES=[
 {shambler:10},{shambler:12,runner:4},{shambler:14,runner:6,crawler:6},{shambler:14,riot:4,runner:6},
 {shambler:16,bloater:2,crawler:8,runner:6},{shambler:18,riot:6,screamer:2,runner:8},{brute:1,shambler:20,runner:10,bloater:3},
 {shambler:24,riot:10,crawler:12,screamer:3},{brute:2,runner:16,riot:8,bloater:4},{shambler:30,brute:3,screamer:4,crawler:14},
 {runner:30,riot:16,bloater:7,screamer:3},{brute:6,shambler:34,screamer:6,riot:8},{crawler:34,runner:26,riot:18,bloater:9,brute:2},
 {brute:9,riot:24,screamer:8,runner:24},{boss:1,brute:6,shambler:36,runner:26,riot:16,screamer:6}
];
Object.assign(exports,{TOWERS,LINES,node,HERO_WEAPONS,HERO,PUB,POWERS,ZOMBIES,WAVES});
