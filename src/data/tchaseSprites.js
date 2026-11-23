// JUDGMENT DAY CHASE (Terminator 2) art slots. Every picture is optional: assets/tchase/<slot>.webp|png ->
// USER_PORTRAITS['tc:<slot>'] (tools/build.mjs); a missing one is drawn by the game (src/engines/tchase/art.js).
// Brief docs/art-for-gpt/TERMINATOR-CHASE-ART.md, templates: node tools/tchase-templates.mjs.
//
// TOP-DOWN view, the camera looks straight down, vehicles point UP (nose at the top of the cell), transparent outside.
// 2 picture pixels = 1 game unit (a car is 36 x 64 units = 72 x 128 px of body inside its cell). Riders and drivers
// are HEADLESS where a FACE spot is given: the game puts the player's (or the T-1000's) face there.
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const PX=2;
// sheets: frames side by side, every frame the same cell size
const SHEETS={
 bike:{cell:[72,128],frames:['lean-left','straight','lean-right'],face:[36,62,30],what:'the hero\'s black Harley-Davidson Fat Boy seen from straight above, nose up, with the rider (black leather jacket, broad shoulders) HEADLESS: the face spot is the top of his head. lean frames tilt the bike and rider ~12 degrees'},
 moto:{cell:[64,120],frames:['straight','lean'],what:'police motorcycle from above, nose up, white with blue stripes, light bar at the back, the officer in a dark-blue uniform and white helmet'},
 cruiser:{cell:[88,152],frames:['lights-a','lights-b'],what:'1990s police cruiser from above, nose up: black body with white doors and roof, light bar across the roof (frame a = left red lit, frame b = right blue lit), roof number, windows dark'},
 't1000-run':{cell:[80,96],frames:['run1','run2','run3','run4','run5','run6'],face:[40,30,30],what:'the T-1000 as a police officer (dark-blue uniform, black belt) running UP the screen, seen from above and a little behind, arms pumping; HEADLESS (face spot = top of the head)'},
 't1000-splash':{cell:[96,96],frames:['hit1','hit2','puddle','reform'],what:'liquid-metal T-1000 being knocked down: chrome splashes, then a silver puddle, then rising back up (chrome, reflective, no face)'},
 't1000-bike':{cell:[64,120],frames:['straight','blade'],face:[32,54,26],what:'the T-1000 on a police motorcycle from above, nose up; blade = one arm turned into a long chrome blade held out to the side; HEADLESS'},
 explosion:{cell:[192,192],frames:['1','2','3','4','5','6','7','8'],what:'big fireball from above, 8 frames from flash to smoke, orange and yellow fire, black smoke, transparent'},
 smoke:{cell:[96,96],frames:['1','2','3','4','5','6'],what:'grey smoke puff from above growing and fading, transparent'},
 fire:{cell:[96,96],frames:['1','2','3','4','5','6'],what:'burning flames from above, looping, transparent'},
 spark:{cell:[48,48],frames:['1','2','3','4'],what:'metal sparks burst, bright yellow-white, transparent'},
 muzzle:{cell:[64,64],frames:['1','2','3'],what:'gun muzzle flash pointing UP, transparent'},
 metal:{cell:[96,96],frames:['1','2','3','4','5'],what:'liquid-metal splash from a bullet hole, chrome droplets, transparent'},
 ln2:{cell:[128,128],frames:['1','2','3','4'],what:'liquid nitrogen fog cloud, icy white-blue mist, transparent'}};
// single pictures
const PICTURES={
 wagon:{w:96,h:160,face:[48,70,26],what:'brown 1980s station wagon from above, nose up, wood-panel sides, roof rack; the driver\'s seat area under the open sunroof = face spot (the game draws the driver\'s face)'},
 van:{w:112,h:192,face:[56,60,28],what:'navy-blue SWAT van from above, nose up, SWAT on the roof, a side door open with a minigun barrel poking out on the right; roof hatch = face spot'},
 pickup:{w:100,h:176,face:[50,62,26],what:'dark 4x4 pickup truck from above, nose up, open bed with crates; the cab roof hatch = face spot'},
 swat:{w:112,h:196,what:'enemy armored SWAT truck from above, nose up, black with grey armor plates, gun ports, light bar'},
 heli:{w:200,h:240,what:'police helicopter from above WITHOUT its main rotor (the game spins it), nose up, dark blue and white, skids, tail boom with tail rotor'},
 'heli-rotor':{w:260,h:260,what:'helicopter main rotor seen from above: 2 long dark blades crossing at the centre hub, transparent (the game spins and blurs it)'},
 towtruck:{w:140,h:300,what:'huge orange tow truck from above, nose up: big cab, amber roof lights, a boom and hook on the back, scraped and dented'},
 tanker:{w:150,h:440,what:'liquid nitrogen tanker from above, nose up: white cab at the top, long silver cylindrical tank with frost and three glowing blue valves (front left, middle right, rear centre), hazard stripes'},
 truck:{w:110,h:260,what:'civilian big-rig truck from above, nose up, red cab, long grey trailer'},
 rig:{w:120,h:300,what:'the friendly weapons rig: a black semi truck from above, nose up, its trailer open at the BACK with a lowered ramp (drive into it from behind), glowing green lights inside'},
 'civ-1':{w:88,h:150,what:'civilian sedan from above, nose up, red'},'civ-2':{w:88,h:150,what:'civilian sedan from above, nose up, white'},
 'civ-3':{w:88,h:150,what:'civilian hatchback from above, nose up, yellow'},'civ-4':{w:88,h:150,what:'civilian station car from above, nose up, green'},
 'civ-5':{w:88,h:150,what:'civilian minivan from above, nose up, light blue'},'civ-6':{w:88,h:150,what:'civilian sports car from above, nose up, black'},
 wreck:{w:96,h:160,what:'a burnt-out car wreck from above, black and rusty, smoking'},
 spikes:{w:256,h:32,what:'police spike strip lying across the road, seen from above, repeats side to side'},
 cone:{w:40,h:40,what:'orange traffic cone from above'},barrier:{w:112,h:44,what:'red and white construction barrier from above'},
 palm:{w:180,h:180,what:'palm tree crown seen from straight above, transparent'},tree:{w:180,h:180,what:'leafy tree crown from above, transparent'},
 lamp:{w:56,h:56,what:'street lamp head from above, transparent'},
 'building-1':{w:400,h:400,what:'Los Angeles building roof from above (air conditioners, vents, a water tank), fills the square'},
 'building-2':{w:400,h:400,what:'another building roof from above, different (parking deck or office roof), fills the square'},
 'building-3':{w:400,h:400,what:'a low shop roof from above with a neon sign edge, fills the square'},
 overpass:{w:1024,h:256,what:'a concrete freeway overpass seen from above crossing the picture side to side, railings on both edges, repeats side to side'},
 'ground-street':{w:1024,h:1024,what:'seamless sidewalk and storefront ground beside a 1990s LA street, from above, repeats in every direction'},
 'ground-canal':{w:1024,h:1024,what:'seamless sloped concrete storm-drain wall from above with stains and joints, repeats'},
 'ground-highway':{w:1024,h:1024,what:'seamless dry grass and dirt roadside from above at night, repeats'},
 'ground-city':{w:1024,h:1024,what:'seamless city sidewalk and plaza from above at night, repeats'},
 'ground-freeway':{w:1024,h:1024,what:'seamless freeway shoulder: gravel, oleander bushes, dry dirt, from above, repeats'},
 'asphalt-street':{w:512,h:512,what:'seamless asphalt road surface from above, no lane lines (the game paints them), repeats'},
 'asphalt-canal':{w:512,h:512,what:'seamless flat concrete storm-drain floor from above with a wet sheen, repeats'},
 'asphalt-night':{w:512,h:512,what:'seamless dark asphalt at night from above, no lines, repeats'},
 'pk-repair':{w:64,h:64,what:'glowing green wrench pickup icon'},'pk-grenade':{w:64,h:64,what:'glowing orange grenade-round pickup icon'},
 'pk-nitro':{w:64,h:64,what:'glowing blue nitro bottle pickup icon'},'pk-weapon':{w:64,h:64,what:'glowing yellow gun crate pickup icon'},
 'pk-shield':{w:64,h:64,what:'glowing purple shield pickup icon'},'pk-cash':{w:64,h:64,what:'glowing gold dollar pickup icon'},
 'gun-shotgun':{w:192,h:96,what:'lever-action shotgun side view, HUD icon, transparent'},'gun-uzi':{w:192,h:96,what:'two Uzi submachine guns, HUD icon'},
 'gun-rifle':{w:192,h:96,what:'M16 rifle side view, HUD icon'},'gun-minigun':{w:192,h:96,what:'M134 minigun side view, HUD icon'},
 'gun-m79':{w:192,h:96,what:'M79 grenade launcher side view, HUD icon'},
 logo:{w:1600,h:600,what:'title logo JUDGMENT DAY CHASE in chrome metal letters with a fiery glow, transparent (our own design, not the film logo)'},
 'title-bg':{w:1920,h:1080,what:'title backdrop 16:9: a man in a leather jacket and sunglasses on a Harley racing through a storm drain at sunset, a huge tow truck right behind him, sparks (our own art)'},
 'title-bg-tall':{w:1080,h:1920,what:'title backdrop for upright phones: the same scene'},'title-bg-fold':{w:1504,h:1670,what:'title backdrop for the Galaxy Fold: the same scene'},
 'cut-intro':{w:1920,h:1080,what:'2029 future war: a night battlefield of skulls and ruins, hunter-killer tanks with searchlights, laser fire (our own art)'},
 'cut-crash':{w:1920,h:1080,what:'a giant tow truck smashing into a freeway overpass inside a storm drain, exploding into a fireball'},
 'cut-walkout':{w:1920,h:1080,what:'a police officer silhouette walking calmly out of a wall of fire, chrome shimmer on him'},
 'cut-freeze':{w:1920,h:1080,what:'a frozen chrome man covered in frost in a white fog of liquid nitrogen, a jackknifed tanker behind'},
 'cut-mill':{w:1920,h:1080,what:'a steel mill at night with a glowing pit of molten steel, sparks and steam'},
 'cut-ending':{w:1920,h:1080,what:'a thumbs-up hand sinking into glowing molten steel (silhouette)'}};
for(const k of ['cut-intro','cut-crash','cut-walkout','cut-freeze','cut-mill','cut-ending']){PICTURES[k+'-tall']={w:1080,h:1920,what:PICTURES[k].what+' (upright phone version)'};PICTURES[k+'-fold']={w:1504,h:1670,what:PICTURES[k].what+' (Galaxy Fold version)'};}
const imgs=new Map();let ver=0;
function picture(name){const url=USER['tc:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['tc:'+name];
function ready(names,ms=4000){for(const n of names)if(has(n))picture(n);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
// draw frame f of a sheet centred at (x,y), size in game units (w = cell width / PX), rotated by a
function sheet(x,name,f,cx,cy,a=0,k=1){const d=SHEETS[name],img=picture(name);if(!d||!img)return false;const [cw,ch]=d.cell,i=Math.max(0,Math.min(d.frames.length-1,f|0));
 x.save();x.translate(cx,cy);if(a)x.rotate(a);x.drawImage(img,i*cw,0,cw,ch,-cw/PX/2*k,-ch/PX/2*k,cw/PX*k,ch/PX*k);x.restore();return true;}
function pic(x,name,cx,cy,a=0,k=1){const d=PICTURES[name],img=picture(name);if(!d||!img)return false;x.save();x.translate(cx,cy);if(a)x.rotate(a);x.drawImage(img,-d.w/PX/2*k,-d.h/PX/2*k,d.w/PX*k,d.h/PX*k);x.restore();return true;}
const ALL=()=>[...Object.keys(SHEETS),...Object.keys(PICTURES)];
Object.assign(exports,{PX,SHEETS,PICTURES,picture,has,ready,sheet,pic,ALL,version:()=>ver});
