// THE WARRIORS (Double Dragon style beat 'em up) art slots. Every picture is optional: assets/warriors/<slot>.webp|png ->
// USER_PORTRAITS['ww:<slot>'] (tools/build.mjs); a missing one is drawn by the game (src/engines/dd/body.js bodies,
// src/engines/dd/stages.js scenery). Brief docs/art-for-gpt/WARRIORS-ART.md, templates: node tools/warriors-templates.mjs.
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
 'crouch','win','rise1','rise2','fury'];
// which poses each sheet needs (enemies skip the hero-only moves; a missing cell falls back to the drawn body)
const HERO=POSES,FOE=['stand','stand2','walk1','walk2','walk3','run1','run2','jabC','jab','cross','hookC','hook','kickC','kick','jump','jkick',
 'grab','swing1','swing2','toss','hurt','dizzy','fall','down','kneel','win'];
const SHEETS={
 'hero-p1':{poses:HERO,what:'Player 1 hero: a street-fighting gang member in a sleeveless denim vest over a blue T-shirt, jeans, boots, fingerless gloves; athletic, cool, badass'},
 'hero-p2':{poses:HERO,what:'Player 2 hero: same build and poses, red T-shirt under a black leather vest, brown cargo pants, boots'},
 'foe-thug':{poses:FOE,what:'street thug: grey hoodie, dark jeans, sneakers'},
 'foe-bat':{poses:FOE,what:'slugger: green bomber jacket, carries a baseball bat in the swing poses (bat drawn in the hand)'},
 'foe-whip':{poses:FOE,what:'whip fighter: purple crop jacket, black leggings, holds a coiled whip (whip drawn in the hand, lashing out in swing2)'},
 'foe-knife':{poses:FOE,what:'knife thrower: mustard leather jacket, knife in hand in toss'},
 'foe-kicker':{poses:FOE,what:'black belt: black gi top, white pants, red belt, barefoot; sharp martial-arts kicks'},
 'foe-brute':{poses:FOE,what:'bruiser: huge bare-chested hulk, torn brown pants, belt, massive arms (still drawn 200 px tall: the game scales him up)'},
 'foe-boss':{poses:FOE,what:'mission boss: gold jacket with a black vest and red stripe, black pants, boots; looks like the leader'}};
// STAGE ART per biome (src/biomes.js kinds): far = skyline/scenery behind (repeats side to side, scrolls slowly),
// wall = the back wall of the street (repeats), floor = the walkable ground band (repeats, seen from the side at an angle)
const BIOMES=['nyc','gotham','suburb','forest','jungle','beach','desert','snow','graveyard','gothic','lava','space','digital','themepark','funhouse','stage','mountains','countryside'];
const PICTURES={};
for(const b of BIOMES){PICTURES['far-'+b]={w:2048,h:512,what:`${b}: the far scenery and sky (repeats side to side)`};
 PICTURES['wall-'+b]={w:1024,h:320,what:`${b}: the back wall / edge of the street (repeats side to side)`};
 PICTURES['floor-'+b]={w:1024,h:512,what:`${b}: the walkable ground band (repeats side to side)`};}
// items (on the ground / in hand), effects, title
Object.assign(PICTURES,{
 bat:{w:256,h:64,what:'baseball bat lying flat, handle LEFT'},pipe:{w:256,h:64,what:'lead pipe, left end = grip'},chain:{w:256,h:96,what:'heavy chain, left end = grip'},
 whip:{w:256,h:96,what:'coiled leather whip, handle LEFT'},knife:{w:128,h:48,what:'combat knife, handle LEFT, blade right'},rock:{w:128,h:96,what:'a big rock'},
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
Object.assign(exports,{CELL,COLS,FOOT,FOOTS,footOf,UNIT,POSES,SHEETS,BIOMES,PICTURES,picture,has,ready,cellOf,version:()=>ver});
