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
// the cutscene cast's sheets: only the poses the story scenes use
const CAST_POSES=['stand','stand2','win','jab','walk1','walk2','walk3','run1','run2','hurt','fall','down','kneel','crouch'];
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
 // CUTSCENE CAST (src/engines/dd/cutscenes.js draws them in the story scenes; same 256 px cells, headless, faces RIGHT)
 'cast-cyrus':{poses:CAST_POSES,what:'Cyrus, the leader who calls the meeting: long dark tunic over a dark shirt with gold trim and a gold belt, dark trousers; a commanding preacher-like figure. stand = arms at the sides, win = both arms raised addressing the crowd, jab = pointing out at the crowd, fall/down = shot'},
 'gang-hihat':{poses:CAST_POSES,what:'a Hi-Hat (Conclave crowd): white long-sleeved shirt with black braces, black trousers, white gloves (mime look below the neck; the game draws the painted face and hat)'},
 'gang-bopper':{poses:CAST_POSES,what:'a Bopper (Conclave crowd): purple 70s suit with wide lapels, open purple shirt, gold chain, purple trousers'},
 'foe-riff':{poses:FOE,what:'Riff (on your side at the end): off-white martial-arts style outfit with a dark vest and an amber sash'}};
// STAGE ART per biome (src/biomes.js kinds): far = skyline/scenery behind (repeats side to side, scrolls slowly),
// wall = the back wall of the street (repeats), floor = the walkable ground band (repeats, seen from the side at an angle)
const BIOMES=['nyc','gotham','suburb','forest','jungle','beach','desert','snow','graveyard','gothic','lava','space','digital','themepark','funhouse','stage','mountains','countryside'];
// STORY AREAS (src/engines/dd/story.js kinds): the same three layers. An area with no picture uses the old biome picture
// that fits (scenes.js FALLBACK), else it is drawn. Moving trains (train, trainDawn) scroll their far layer by time.
const AREAS=['conclave','park','cemetery','elstreet','yard','tenement','burning','train','trainDawn','riverside','playground','apartment','apartment2','station','platform','station96','restroom','boardwalk','beach'];
const AREA_WHAT={station96:'the 96th Street subway platform at night (1970s): white tiled wall with the station name in mosaic, steel columns, the track pit at the back edge of the platform where trains rush past, yellow edge strip',conclave:'Van Cortlandt Park at night: a field full of gangs facing a lit stage, trees behind',park:'a park path through dark woods at night, iron fence, lamps',
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
 // story cutscene backdrops (src/engines/dd/cutscenes.js; the people are drawn over them): 1920x1080, no people in them
 'cut-conclave':{w:1920,h:1080,what:'night park in the Bronx: a low wooden stage in the middle with two tall flood lights, trees, city skyline far behind, an empty lawn in front'},
 'cut-riffs':{w:1920,h:1080,what:'night: the Riffs headquarters room, dark wood, candles, a martial-arts dojo feel, empty floor in front'},
 'cut-street':{w:1920,h:1080,what:'New York street at night, brick tenements, a lamp post, graffiti, empty sidewalk in front'},
 'cut-lizzies':{w:1920,h:1080,what:'a dim apartment party room at night: colored lights, a couch, records, empty floor in front'},
 'cut-park':{w:1920,h:1080,what:'Riverside Park at night: one lamp post, trees, a path, empty grass in front'},
 'cut-subway':{w:1920,h:1080,what:'a 1970s subway station platform at night: tiled wall, station sign, yellow edge, empty platform in front'},
 'cut-restroom':{w:1920,h:1080,what:'a grimy subway station men\'s room: tiles, stalls, sinks, empty floor in front'},
 'cut-dawn':{w:1920,h:1080,what:'inside a subway car at dawn: orange sunrise through the windows, empty floor in front'},
 'cut-coney':{w:1920,h:1080,what:'Coney Island beach at dawn: the big Ferris wheel, boardwalk, ocean, empty sand in front'},
 'cut-radio':{w:1920,h:1080,what:'a dark radio studio at night: one microphone, an ON AIR light, nothing else'},
 // the Turnbull bus that runs down the street (side view facing RIGHT, wheels on the bottom edge)
 bus:{w:1536,h:512,what:"the Turnbull AC's bus: a battered old yellow-and-black school bus covered in armour plates and graffiti, side view facing RIGHT, wheels on the bottom edge, transparent background"},
 // solid obstacles and street furniture on the floor (src/engines/dd/scenes.js drawBlock): standing on the bottom edge, filling the width,
 // seen from the front and a little above like the fighters; transparent background
 'prop-grave-1':{w:256,h:320,what:'a weathered rounded granite headstone, mossy, leaning a touch'},'prop-grave-2':{w:256,h:320,what:'a stone cross grave marker on a plinth'},
 'prop-grave-3':{w:256,h:320,what:'a tall thin obelisk headstone with a cracked corner'},'prop-grave-4':{w:320,h:256,what:'a low wide double headstone with a small stone angel'},
 'prop-hydrant':{w:192,h:256,what:'a red NYC fire hydrant, chipped paint'},'prop-meter':{w:128,h:384,what:'a 1970s single parking meter on a pole'},
 'prop-newsstand':{w:512,h:384,what:'a green metal 1970s New York newsstand kiosk with papers and magazines (made-up mastheads only)'},
 'prop-mailbox':{w:256,h:320,what:'a blue 1970s US mailbox on legs, dented'},'prop-trashcan':{w:256,h:288,what:'a dented metal garbage can with the lid half off, trash spilling'},
 'prop-phone':{w:256,h:448,what:'a 1970s New York phone booth / payphone stand, scuffed and covered in stickers'},
 'prop-bench':{w:448,h:256,what:'a park bench, wooden slats on iron legs'},'prop-lamp':{w:192,h:640,what:'an old iron street lamp post with a lit lamp at the top'},
 'prop-car':{w:640,h:320,what:'a parked 1970s sedan, side view facing RIGHT'},'prop-wreck':{w:640,h:320,what:'a burnt-out 1970s car wreck, side view, a few flames'},
 'prop-swings':{w:512,h:384,what:'an old playground swing set'},'prop-couch':{w:512,h:256,what:'a beat-up 1970s couch'},'prop-sink':{w:256,h:288,what:'a grimy public restroom sink on a pedestal'},
 'prop-hotdog':{w:512,h:384,what:'a Coney Island hot dog cart with an umbrella (made-up name only)'},'prop-pylon':{w:128,h:192,what:'an orange traffic cone'},
 // the heroes' own run cycle (owner, Nov 24: the 2-cell run looked silly): 8 frames of 256 x 256 left to right, the same headless
 // body as hero-p1/-p2, running RIGHT, feet on each cell's foot point (128, 244), a full stride for both legs
 'run-p1':{w:2048,h:256,what:'hero-p1 (Sean\'s Warrior: leather vest, bare arms, brown trousers) running right: an 8-frame run cycle (contact, down, passing, up, then the same for the other leg), headless like the sheet'},
 'run-p2':{w:2048,h:256,what:'hero-p2 (Amber\'s Warrior) running right: the same 8-frame run cycle, headless like the sheet'},
 // the cyclone spin kick (owner, Nov 24: turning the whole body round looked like a spinning cut-out, not a move): 8 frames of
 // 256 x 256, one full turn of an airborne spinning hook kick seen from the side, frame 0 facing RIGHT and turning toward the
 // camera first (0, 45, 90 = chest to the camera, ... 180 = back to the camera, ... 315); the game shows the frame for the turn
 'spin-p1':{w:2048,h:256,what:'hero-p1 (Sean\'s Warrior: leather vest, bare arms, brown trousers) doing an airborne spinning hook kick (tornado kick): 8 frames of one full turn, frame 0 facing right, kicking leg swinging out wide round the body, headless like the sheet'},
 'spin-p2':{w:2048,h:256,what:'hero-p2 (Amber\'s Warrior) doing the same airborne spinning hook kick: 8 frames of one full turn, headless like the sheet'},
 // the subway map (src/engines/dd/subwayMap.js): the station wall it hangs on (three screen shapes), the map poster itself (no stops
 // or names: the game draws the route, stops and tags at STOPS), and each chapter's gang tag beside its stop
 'map-wall':{w:1920,h:1080,what:'a grimy 1970s New York subway station wall, straight on: dirty cream tiles, a maroon tile band, soot streaks, faded spray-paint scribbles (no words), harsh fluorescent light; the middle left empty for a poster'},
 'map-wall-tall':{w:1080,h:1920,what:'the same grimy 1970s subway station wall, upright phone framing'},'map-wall-fold':{w:1504,h:1670,what:'the same grimy 1970s subway station wall, near-square framing'},
 'map-base':{w:1600,h:2000,what:'a worn 1970s-style New York City subway map poster in our own design: cream land, pale blue water, green parks, coloured subway lines; The Bronx top, Manhattan the thin island down the middle-left, Brooklyn and Queens right, Staten Island bottom left; creased, yellowed, a few stains; NO station names or text except a black title strip at the top'},
 logo:{w:1600,h:700,what:'title logo THE WARRIORS / COME OUT TO PLAY, transparent'},'title-bg':{w:1920,h:1080,what:'title backdrop: a dark city street at night, two fighters back to back'}});
// each chapter's gang tag on the map: our own spray-painted / patch style logo for that gang or place, transparent
const MAP_TAGS={conclave:'THE CONCLAVE: a gold sunburst patch',turnbull:"TURNBULL AC'S: a skinhead gang patch with a bus",orphans:'ORPHANS: a scruffy stencil tag',train1:'THE TRAIN SOUTH: a subway car stencil',
 furies:'BASEBALL FURIES: a baseball bat crossed with a baseball',lizzies:'LIZZIES: a pink lipstick kiss tag',union:'UNION SQUARE: a station sign stencil',punks:'PUNKS: a roller skate tag',ride:'THE RIDE HOME: a dawn sun tag',coney:'CONEY ISLAND: a Ferris wheel tag'};
for(const [id,w] of Object.entries(MAP_TAGS))PICTURES['map-tag-'+id]={w:512,h:192,what:`${w}, written out in big hand-painted letters (only the words given), transparent background`};
const imgs=new Map();let ver=0;
// the build lowercases file names (far-trainDawn.webp -> ww:far-traindawn)
const key=name=>'ww:'+name.toLowerCase();
function picture(name){const url=USER[key(name)];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER[key(name)];
function ready(names,ms=4000){for(const n of names)if(has(n))picture(n);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
// the cell of a pose on a sheet (null if the sheet has no such pose)
function cellOf(sheet,pose){const d=SHEETS[sheet];if(!d)return null;const i=d.poses.indexOf(pose);if(i<0)return null;return {sx:(i%COLS)*CELL,sy:Math.floor(i/COLS)*CELL};}
Object.assign(exports,{CAST_POSES,CELL,COLS,FOOT,FOOTS,footOf,UNIT,POSES,SHEETS,BIOMES,PICTURES,picture,has,ready,cellOf,AREAS,version:()=>ver});
