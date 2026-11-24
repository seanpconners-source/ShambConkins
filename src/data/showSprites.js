// Game-show art slots for The Price Is Right games: PLINKO (plinko-show), THE BIG WHEEL (big-wheel), CLIFF HANGERS (cliff-hangers), THE CLOCK GAME (clock-game). Every picture is optional:
// assets/gameshow/<slot>.webp|png -> USER_PORTRAITS['show:<slot>'] (tools/build.mjs); a missing one is drawn by the game
// (src/engines/gameshow/stage.js). Templates: node tools/gameshow-templates.mjs -> docs/art-for-gpt/gameshow-templates,
// brief docs/art-for-gpt/GAMESHOW-ART.md. The owner later had GPT paint the classic-era show look (host + two assistants as
// photoreal people, Nov 23 delivery UPLOADS-GPT-2026-11-23-2100); the drawn studio/host stay as the fallback.
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
// people sheets: one row of poses, each frame w x h, feet at the bottom middle
const HOST={w:512,h:1024,frames:['talk','point','cheer'],feet:[256,1004]};
const MODEL={w:512,h:1024,frames:['present','wave','clap'],feet:[256,1004]};
// the Plinko board picture covers the whole board box = 2 px per board unit (board 900 x 1272 units, plinkoShow.js: pegs from
// y 150 every 74, slots from y 1102 to 1252, slot walls every 100); the game draws pegs, prizes, chips over it
const PLINKO_GEOM={w:1800,h:2544,scale:2};
// the Big Wheel cabinet picture: the turning sections are drawn inside WINDOW (x0,y0,x1,y1 in picture px), the pointer at the middle
const WHEEL_GEOM={w:900,h:1500,window:[240,150,660,1350]};
// CLIFF HANGERS: the mountain prop picture (transparent around it). The climber walks a straight path from step 0 (STEP0) to step 25
// (STEP25) in picture px, then the flat ledge to the cliff EDGE and falls off the right side. The game draws the step ticks and the
// numbered markers (0, 5 ... 25) along the path, so the picture has no numbers. CLIMBER: one row of poses, feet at the bottom middle,
// facing right (up the mountain). STAND: the small-prize pedestal, the game prints the guess/price in its PRICE window.
const CLIFF_GEOM={w:1600,h:1000,step0:[250,862],step25:[1240,262],edge:[1330,262]};
// unit = the game's climber size h for 1 picture px (hat top ~295 px above the feet when drawn at h 250)
const CLIMBER={w:256,h:320,frames:['stand','walk1','walk2','walk3','walk4','yodel','teeter','fall'],feet:[128,308],unit:250};
const STAND_GEOM={w:600,h:600,top:[300,250],price:[150,330,450,430]};
// THE CLOCK GAME: the big clock prop (face only; the game turns the sweep hand round CENTER, one turn = 60 s, the game uses 30), the
// sweep hand (pointing up, turned round PIVOT), the price display (the game prints the guess / the price in WINDOW), the prize platform.
const CLOCK_GEOM={w:1000,h:1000,c:[500,500],r:440};
const HAND_GEOM={w:120,h:520,pivot:[60,460],len:440};
const DISPLAY_GEOM={w:900,h:300,window:[90,70,810,230]};
const PLATFORM_GEOM={w:800,h:500,top:[400,340]};
const SLOTS={
 'stage-plinko':{w:1920,h:1080,what:'the Plinko studio, wide: big colourful 70s/80s game-show set, the board stands in the middle (leave the middle 40% calm)'},
 'stage-plinko-tall':{w:1080,h:1920,what:'the same studio for upright phones'},
 'stage-wheel':{w:1920,h:1080,what:'the Big Wheel studio, wide: set with flashing bulbs, the wheel stands in the middle (leave the middle 40% calm)'},
 'stage-wheel-tall':{w:1080,h:1920,what:'the same studio for upright phones'},
 'stage-plinko-fold':{w:1504,h:1670,what:'the same studio for near-square screens (the open Fold)'},
 'stage-wheel-fold':{w:1504,h:1670,what:'the same studio for near-square screens (the open Fold)'},
 curtain:{w:1920,h:1080,what:'the sparkly studio curtain that rises at the start (fills the screen)'},
 'plinko-board':{w:1800,h:2544,what:'the Plinko board without pegs, chips or prize numbers: frame, backing, top lights, the 9 slot boxes at the bottom (game prints the prizes)'},
 'stage-cliff':{w:1920,h:1080,what:'the Cliff Hangers studio, wide: the mountain stands on the left 60% (keep it calm there), the prize table on the right'},
 'stage-cliff-tall':{w:1080,h:1920,what:'the same studio for upright phones: the mountain stands in the top 45%'},
 'stage-cliff-fold':{w:1504,h:1670,what:'the same studio for near-square screens (the open Fold)'},
 'cliff-mountain':{w:1600,h:1000,what:'the Cliff Hangers mountain prop: a snowy alpine mountain with a climbing path from the bottom left (step 0) up to a flat ledge at the top right that ends in a sheer cliff; NO numbers (the game draws the step markers); transparent around'},
 'cliff-climber':{w:2048,h:320,what:'the little mountain climber (the yodeler) in lederhosen and an alpine hat with a feather, 8 poses facing right: STAND, WALK 1-4, YODEL (arms up), TEETER (arms windmilling on the edge), FALL; transparent'},
 'cliff-stand':{w:600,h:600,what:'a small-prize pedestal seen from the front: the prize sits on top (game draws it), a lit price display window on the front (game prints the price)'},
 'cliff-logo':{w:1400,h:500,what:'CLIFF HANGERS in big lit-up game-show letters, transparent'},
 'stage-clock':{w:1920,h:1080,what:'the Clock Game studio, wide: the big clock stands on the left 45% (keep it calm there), the prize + price display on the right'},
 'stage-clock-tall':{w:1080,h:1920,what:'the same studio for upright phones: the clock stands in the top third'},
 'stage-clock-fold':{w:1504,h:1670,what:'the same studio for near-square screens (the open Fold)'},
 'clock-face':{w:1000,h:1000,what:'the Clock Game clock seen straight on: a big round clock with a bright frame, white face, 60 second ticks and the numbers 5 to 60; NO hand (the game draws it); centre exactly in the middle; transparent around'},
 'clock-hand':{w:120,h:520,what:'the clock sweep hand pointing straight up, red, with a round hub on the pivot dot; transparent'},
 'clock-display':{w:900,h:300,what:'the Clock Game price display: a dark lit board under the prize, the game prints the guess and the price in the window'},
 'clock-platform':{w:800,h:500,what:'a glossy turntable/platform the prize stands on (the game puts the prize photo on the dot)'},
 'clock-logo':{w:1400,h:500,what:'CLOCK GAME (or THE CLOCK GAME) in big lit-up game-show letters, transparent'},
 'plinko-chip':{w:256,h:256,what:'one Plinko chip seen face on (a thick round puck), transparent around'},
 'plinko-logo':{w:1400,h:500,what:'the word PLINKO in big lit-up 70s game-show letters, transparent'},
 'wheel-logo':{w:1400,h:500,what:'THE BIG WHEEL in big lit-up game-show letters, transparent'},
 'wheel-frame':{w:900,h:1500,what:'the tall Big Wheel cabinet: chrome side rails, bulbs, base, with a see-through window where the turning sections show (the game draws them)'},
 host:{w:1536,h:1024,what:'our own game-show host, full body, 3 poses (talk, point, cheer), transparent'},
 model:{w:1536,h:1024,what:'show assistant 1, full body in a sparkly gown, 3 poses (present, wave, clap), transparent'},
 'model-2':{w:1536,h:1024,what:'show assistant 2, a different look, same 3 poses, transparent'},
 nametag:{w:512,h:256,what:'a contestant price-tag name tag (blank: the game writes the name), transparent'}};
const imgs=new Map();let ver=0;
// a name with a ':' is a whole build key (e.g. 'keyart:price-bid-off' = the Arcade background), else a show: slot
const keyOf=name=>name.includes(':')?name:'show:'+name;
function picture(name){const url=USER[keyOf(name)];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER[keyOf(name)];
function ready(names=Object.keys(SLOTS),ms=6000){for(const n of names)if(has(n))picture(n);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
Object.assign(exports,{HOST,MODEL,PLINKO_GEOM,WHEEL_GEOM,CLOCK_GEOM,HAND_GEOM,DISPLAY_GEOM,PLATFORM_GEOM,CLIFF_GEOM,CLIMBER,STAND_GEOM,SLOTS,picture,has,ready,version:()=>ver});
