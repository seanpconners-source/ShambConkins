// Shooter McGavin's Pro Tour art slots. Every picture is optional: assets/golf/<slot>.webp|png -> USER_PORTRAITS['golf:<slot>']
// (tools/build.mjs); a missing one is drawn by the game (src/engines/golf/render.js, src/engines/golfGame.js).
// Templates: node tools/golf-templates.mjs -> docs/art-for-gpt/golf-templates; brief docs/art-for-gpt/GOLF-ART.md.
// Our own arcade golf game (played like the trackball golf cabinets): no Golden Tee art, names or logos.
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
// THE GOLFER: a headless body seen from behind and to the left (the camera sits behind the ball), right-handed, the ball in
// front of their feet to the right. One row of 10 frames, 256 x 384 each (sheet 2560 x 384). FEET = where the feet meet the
// ground (the game stands them there), HEAD = the face circle the game paints the player's face into [x, y, diameter].
const GOLFER={w:256,h:384,frames:['address','back1','back2','top','down','impact','follow','finish','putt','putt-through'],
 feet:[118,372],head:[[112,74,76],[110,74,76],[108,72,76],[104,72,76],[108,74,76],[112,76,76],[122,70,76],[134,64,76],[112,92,76],[112,92,76]]};
const TREES=['oak','oak2','elm','pine','pine2','birch','maple','cactus','cactus2','joshua','mesquite'];
const SLOTS={
 'golfer-p1':{w:2560,h:384,what:'player 1 golfer sheet: 10 frames (see GOLFER), headless, red/white polo, khaki trousers'},
 'golfer-p2':{w:2560,h:384,what:'player 2 golfer sheet: same poses, blue/white polo, grey trousers'},
 'sky-desert':{w:2048,h:512,what:'Bat Country Links sky: hot Nevada sky, mesas on the horizon at y 400, transparent-free'},
 'sky-park':{w:2048,h:512,what:'Bushwood sky: summer blue with clouds, a tree line on the horizon at y 400'},
 'sky-lake':{w:2048,h:512,what:'Waterbury sky: crisp blue, pine hills and a distant lake shore on the horizon at y 400'},
 'ground-detail':{w:512,h:512,what:'seamless grey grass/soil detail texture (multiplied over the course colours)'},
 water:{w:512,h:512,what:'seamless water ripple texture (light, tinted by the game)'},
 flag:{w:256,h:160,what:'the pin flag cloth, attached on its LEFT edge, transparent'},
 'control-panel':{w:1800,h:1800,what:'the cabinet control panel behind the big trackball (square; the ball sits in the middle, ring radius 464 px): plain deck, NO arrows or text (the game draws the lit arrows)'},
 trackball:{w:512,h:512,what:'the cabinet trackball seen from above: a glossy ball in a chrome ring, transparent outside'},
 logo:{w:1600,h:700,what:"title logo SHOOTER McGAVIN'S PRO TOUR, transparent"},
 'title-bg':{w:1920,h:1080,what:'title screen backdrop: a gorgeous golf hole at golden hour'},
 'tee-marker':{w:128,h:128,what:'one tee marker (a gold golf-ball-shaped marker), transparent'},
 cup:{w:256,h:256,what:'the cup seen from above at an angle: white rim, dark hole, transparent'}};
for(const t of TREES)SLOTS['tree-'+t]={w:512,h:768,what:`tree billboard "${t}": trunk base at the bottom centre (256,760), transparent around`};
const imgs=new Map();let ver=0;
function picture(name){const url=USER['golf:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['golf:'+name];
function preload(names=Object.keys(SLOTS)){for(const n of names)if(has(n))picture(n);}
function ready(names=Object.keys(SLOTS),ms=6000){preload(names);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
Object.assign(exports,{GOLFER,TREES,SLOTS,picture,has,preload,ready,version:()=>ver});
