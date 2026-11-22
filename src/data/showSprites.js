// Game-show art slots for PLINKO (plinko-show) and THE BIG WHEEL (big-wheel). Every picture is optional:
// assets/gameshow/<slot>.webp|png -> USER_PORTRAITS['show:<slot>'] (tools/build.mjs); a missing one is drawn by the game
// (src/engines/gameshow/stage.js). Templates: node tools/gameshow-templates.mjs -> docs/art-for-gpt/gameshow-templates,
// brief docs/art-for-gpt/GAMESHOW-ART.md. Our own studio, host and models (original designs, no real people, no show logos).
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
// people sheets: one row of poses, each frame w x h, feet at the bottom middle
const HOST={w:512,h:1024,frames:['talk','point','cheer'],feet:[256,1004]};
const MODEL={w:512,h:1024,frames:['present','wave','clap'],feet:[256,1004]};
// the Plinko board picture covers the whole board box = 2 px per board unit (board 900 x 1272 units, plinkoShow.js: pegs from
// y 150 every 74, slots from y 1102 to 1252, slot walls every 100); the game draws pegs, prizes, chips over it
const PLINKO_GEOM={w:1800,h:2544,scale:2};
// the Big Wheel cabinet picture: the turning sections are drawn inside WINDOW (x0,y0,x1,y1 in picture px), the pointer at the middle
const WHEEL_GEOM={w:900,h:1500,window:[240,150,660,1350]};
const SLOTS={
 'stage-plinko':{w:1920,h:1080,what:'the Plinko studio, wide: big colourful 70s/80s game-show set, the board stands in the middle (leave the middle 40% calm)'},
 'stage-plinko-tall':{w:1080,h:1920,what:'the same studio for upright phones'},
 'stage-wheel':{w:1920,h:1080,what:'the Big Wheel studio, wide: set with flashing bulbs, the wheel stands in the middle (leave the middle 40% calm)'},
 'stage-wheel-tall':{w:1080,h:1920,what:'the same studio for upright phones'},
 curtain:{w:1920,h:1080,what:'the sparkly studio curtain that rises at the start (fills the screen)'},
 'plinko-board':{w:1800,h:2544,what:'the Plinko board without pegs, chips or prize numbers: frame, backing, top lights, the 9 slot boxes at the bottom (game prints the prizes)'},
 'plinko-chip':{w:256,h:256,what:'one Plinko chip seen face on (a thick round puck), transparent around'},
 'plinko-logo':{w:1400,h:500,what:'the word PLINKO in big lit-up 70s game-show letters, transparent'},
 'wheel-logo':{w:1400,h:500,what:'THE BIG WHEEL in big lit-up game-show letters, transparent'},
 'wheel-frame':{w:900,h:1500,what:'the tall Big Wheel cabinet: chrome side rails, bulbs, base, with a see-through window where the turning sections show (the game draws them)'},
 host:{w:1536,h:1024,what:'our own game-show host, full body, 3 poses (talk, point, cheer), transparent'},
 model:{w:1536,h:1024,what:'show assistant 1, full body in a sparkly gown, 3 poses (present, wave, clap), transparent'},
 'model-2':{w:1536,h:1024,what:'show assistant 2, a different look, same 3 poses, transparent'},
 nametag:{w:512,h:256,what:'a contestant price-tag name tag (blank: the game writes the name), transparent'}};
const imgs=new Map();let ver=0;
function picture(name){const url=USER['show:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['show:'+name];
function ready(names=Object.keys(SLOTS),ms=6000){for(const n of names)if(has(n))picture(n);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
Object.assign(exports,{HOST,MODEL,PLINKO_GEOM,WHEEL_GEOM,SLOTS,picture,has,ready,version:()=>ver});
