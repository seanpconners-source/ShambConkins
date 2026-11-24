// THE WARRIORS (Double Dragon style beat 'em up) art slots. Every picture is optional: assets/warriors/<slot>.webp|png ->
// USER_PORTRAITS['ww:<slot>'] (tools/build.mjs); a missing one is drawn by the game (src/engines/dd/body.js bodies,
// src/engines/dd/scenes.js scenery). Brief docs/art-for-gpt/WARRIORS-ART.md, templates: node tools/warriors-templates.mjs.
//
// FIGHTER SHEETS: one cell per KEY POSE (src/engines/dd/body.js P, in POSES order), CELL x CELL px, 8 per row. The body is
// HEADLESS (the game puts a face on the neck), faces RIGHT, feet on the cell's FOOT point. 1 game unit = 2 px: a standing
// fighter is 200 px tall (bruisers are drawn the same size: the game scales them). The game shows the cell of the key pose
// it is in (the template draws our pose skeleton in each cell + the face circle to keep clear).
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const CELL=256,COLS=8,FOOT=[128,244],UNIT=2;
// poses that reach further one way get their feet moved over so the whole body stays in the cell
const FOOTS={down:[226,236],fall:[200,230],dizzy:[96,244],bkick:[160,244],kick:[90,244],jkick:[96,244],spin:[128,244],throw1:[110,244]};
const footOf=p=>FOOTS[p]||FOOT;
const POSES=['stand','stand2','walk1','walk2','walk3','run1','run2','jabC','jab','cross','hookC','hook','upC','up','kickC','kick','bkick',
 'elbowC','elbow','jump','jkick','spin','kneeC','knee','grab','throw1','throw2','swing1','swing2','toss','hurt','dizzy','fall','down','kneel',
 'crouch','win','rise1','rise2','fury',
 // added for the story rebuild (appended so older sheets keep their cells; a sheet without them shows the nearest old pose):
 // the weapon swing (no weapon drawn: the game draws it in the front hand), the riot shield, gun, lob, skates, a gut hit,
 // the shoulder charge, the leg sweep, a taunt
 'batReady','batWind','batHit','batFollow','batBack','batLow','batOver','batSmash','block','bash','aim','lobC','lob','skate1','skate2','hurtLow','charge','sweep','taunt'];
// which poses each sheet needs (enemies skip the hero-only moves; a missing cell falls back to the drawn body)
const HERO=POSES.filter(p=>!['block','bash','aim','lobC','lob','skate1','skate2','charge','taunt'].includes(p)),FOE=['stand','stand2','walk1','walk2','walk3','run1','run2','jabC','jab','cross','hookC','hook','kickC','kick','jump','jkick',
 'grab','swing1','swing2','toss','hurt','dizzy','fall','down','kneel','win',
 'batReady','batWind','batHit','batFollow','batBack','batLow','batOver','batSmash','block','bash','aim','lobC','lob','skate1','skate2','hurtLow','charge','crouch','taunt'];
const SHEETS={
 'hero-p1':{poses:HERO,what:'Player 1 hero: a street-fighting gang member in a sleeveless denim vest over a blue T-shirt, jeans, boots, fingerless gloves; athletic, cool, badass'},
 'hero-p2':{poses:HERO,what:'Player 2 hero: same build and poses, red T-shirt under a black leather vest, brown cargo pants, boots'},
 // THE STORY'S GANGS (our own looks after the film's gangs; headless like the rest, weapons are drawn by the game)
 'foe-cop':{poses:FOE,what:'1979 New York patrolman: navy uniform shirt with a badge, navy trousers, black belt and shoes (cap is drawn by the game on the head)'},
 'foe-riot':{poses:FOE,what:'riot cop: dark navy uniform with a padded vest, the left arm holds a tall clear riot shield in front (block/bash poses)'},
 'foe-turnbull':{poses:FOE,what:"Turnbull AC's skinhead: white T-shirt, red braces, rolled-up blue jeans, oxblood boots"},
 'foe-orphan':{poses:FOE,what:'Orphan: torn grey T-shirt, faded trousers, worn shoes; scrappy, no colours'},
 'foe-fury':{poses:FOE,what:'Baseball Fury: white pinstriped baseball uniform with a purple belt, black cleats (the bat is drawn by the game)'},
 'foe-lizzie':{poses:FOE,what:'Lizzie: plum wrap top, dark flared trousers, plum boots, gold belt'},
 'foe-punk':{poses:FOE,what:'Punk: blue denim overalls over a red-and-white striped shirt, roller skates'},
 'foe-rogue':{poses:FOE,what:'Rogue: black shirt under a brown leather vest, dark trousers, boots'},
 'foe-riff':{poses:FOE,what:'Riff (on your side at the end): off-white martial-arts style outfit with a dark vest and an amber sash'}};
// STAGE ART per biome (src/biomes.js kinds): far = skyline/scenery behind (repeats side to side, scrolls slowly),
// wall = the back wall of the street (repeats), floor = the walkable ground band (repeats, seen from the side at an angle)
const BIOMES=['nyc','gotham','suburb','forest','jungle','beach','desert','snow','graveyard','gothic','lava','space','digital','themepark','funhouse','stage','mountains','countryside'];
// STORY AREAS (src/engines/dd/story.js kinds): the same three layers. An area with no picture uses the old biome picture
// that fits (scenes.js FALLBACK), else it is drawn. Moving trains (train, trainDawn) scroll their far layer by time.
const AREAS=['conclave','park','cemetery','elstreet','yard','tenement','burning','train','trainDawn','riverside','playground','apartment','apartment2','station','platform','restroom','boardwalk','beach'];
const AREA_WHAT={conclave:'Van Cortlandt Park at night: a field full of gangs facing a lit stage, trees behind',park:'a park path through dark woods at night, iron fence, lamps',
 cemetery:'an old cemetery at night: fog, gravestones, iron fence, a mausoleum',elstreet:'a Bronx street under the elevated train tracks at night: storefronts, neon, graffiti',
 yard:'a rail yard at night: boxcars, floodlights, chain-link fence, gravel and rails',tenement:'a Bronx street of brownstone tenements at night: stoops, doorways, fire escapes',
 burning:'the same street lit orange by a burning car, smoke',train:'inside a 1970s graffiti-covered subway car (far layer = the tunnel seen through the windows)',
 trainDawn:'the same car at dawn on an elevated stretch (far layer = Brooklyn rooftops and sunrise through the windows)',riverside:'Riverside Park at night: stone wall, lamps, the river and lights beyond',
 playground:'a city playground at night: chain-link, climbing frame, swings',apartment:'a 70s party apartment: patterned wallpaper, lamps, jukebox, windows on the city',
 apartment2:'an apartment block hallway: doors, stair landing',station:'a subway platform: tiled wall with the station name, the track pit, steel columns',
 platform:'another subway platform',restroom:'a grimy subway men\'s room: tiled walls, stalls, a sink',boardwalk:'Coney Island boardwalk at dawn: game stalls, Wonder Wheel and parachute tower behind',
 beach:'Coney Island beach at dawn: sand, waves, the parachute tower far away'};
const PICTURES={};
for(const b of AREAS){PICTURES['far-'+b]={w:2048,h:512,what:`${AREA_WHAT[b]}: far scenery and sky (repeats side to side)`};
 PICTURES['wall-'+b]={w:1024,h:320,what:`${AREA_WHAT[b]}: the back wall / edge of the floor (repeats side to side)`};
 PICTURES['floor-'+b]={w:1024,h:512,what:`${AREA_WHAT[b]}: the walkable floor (repeats side to side)`};}
// (the old per-biome slots are no longer asked for; a delivered one still stands in for the areas in scenes.js FALLBACK)
if(0)for(const b of BIOMES){PICTURES['far-'+b]={w:2048,h:512,what:`${b}: the far scenery and sky (repeats side to side)`};
 PICTURES['wall-'+b]={w:1024,h:320,what:`${b}: the back wall / edge of the street (repeats side to side)`};
 PICTURES['floor-'+b]={w:1024,h:512,what:`${b}: the walkable ground band (repeats side to side)`};}
// items (on the ground / in hand), effects, title
Object.assign(PICTURES,{
 bat:{w:256,h:64,what:'baseball bat lying flat, handle LEFT'},pipe:{w:256,h:64,what:'lead pipe, left end = grip'},chain:{w:256,h:96,what:'heavy chain, left end = grip'},
 whip:{w:256,h:96,what:'coiled leather whip, handle LEFT'},stick:{w:256,h:48,what:'police nightstick with a side handle, grip LEFT'},knife:{w:128,h:48,what:'combat knife, handle LEFT, blade right'},rock:{w:128,h:96,what:'a big rock'},
 barrel:{w:160,h:192,what:'oil barrel standing'},crate:{w:192,h:160,what:'wooden crate'},
 chicken:{w:128,h:96,what:'roast chicken (restores health)'},burger:{w:128,h:96,what:'burger (health)'},pizza:{w:128,h:96,what:'pizza slice (health)'},
 'fx-hit':{w:768,h:128,what:'hit spark, 6 frames of 128x128 left to right, centred'},'fx-dust':{w:768,h:128,what:'landing dust puff, 6 frames'},
 'fx-rise':{w:768,h:256,what:'Rising Fist special: rising flame/energy column, 6 frames of 128x256'},'fx-twister':{w:768,h:256,what:'Twister special: spinning wind, 6 frames'},
 'fx-fury':{w:1024,h:256,what:'Warrior\'s Fury: speed-line energy burst, 4 frames of 256x256'},
 logo:{w:1600,h:700,what:'title logo THE WARRIORS / COME OUT TO PLAY, transparent'},'title-bg':{w:1920,h:1080,what:'title backdrop: a dark city street at night, two fighters back to back'}});
const imgs=new Map();let ver=0;
function picture(name){const url=USER['ww:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['ww:'+name];
function ready(names,ms=4000){for(const n of names)if(has(n))picture(n);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
// the cell of a pose on a sheet (null if the sheet has no such pose)
function cellOf(sheet,pose){const d=SHEETS[sheet];if(!d)return null;const i=d.poses.indexOf(pose);if(i<0)return null;return {sx:(i%COLS)*CELL,sy:Math.floor(i/COLS)*CELL};}
Object.assign(exports,{CELL,COLS,FOOT,FOOTS,footOf,UNIT,POSES,SHEETS,BIOMES,PICTURES,picture,has,ready,cellOf,AREAS,version:()=>ver});
