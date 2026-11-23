// FIGHT NIGHT (Punch-Out style boxing) art slots. Every picture is optional: assets/fightnight/<slot>.webp|png ->
// USER_PORTRAITS['po:<slot>'] (tools/build.mjs); a missing one is drawn by the game (src/engines/po/art.js).
// Brief docs/art-for-gpt/FIGHT-NIGHT-ART.md, templates: node tools/po-templates.mjs.
//
// SHEETS are one row of cells, one pose per cell, 1 metre = UNIT px, anchored on the HIPS (HIP point of each sheet):
//  me-p1 / me-p2  = YOUR boxer seen FROM BEHIND (bottom of the screen), headless (the game draws the back of the head).
//  foe-<type>     = opponent bodies seen FROM THE FRONT, HEADLESS (the game puts the character's face on the neck):
//                   lean, heavy, giant, fast, champ. A sheet named foe-<character id> overrides the type for that fighter.
//  referee        = the referee, front view, full figure (own design).
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const UNIT=120;
const ME_POSES=['idle','jabL','jabR','bodyL','bodyR','dodgeL','dodgeR','duck','block','star1','star2','hurt','tired','down','getup','win'];
const FOE_POSES=['idle','idle2','guardHigh','guardLow','tellJab','jab','tellHook','hook','tellUpper','upper','tellBody','body','tellSpecial','special',
 'hurtHead','hurtBody','dizzy','block','fall','down','getup','taunt','win'];
const REF_POSES=['stand','count','wave','raise'];
const ME_CELL=[320,420],ME_HIP=[160,300],FOE_CELL=[400,560],FOE_HIP=[200,330],REF_CELL=[320,480],REF_HIP=[160,300];
const SHEETS={
 'me-p1':{cell:ME_CELL,hip:ME_HIP,poses:ME_POSES,kit:'p1',what:'Player 1 boxer seen FROM BEHIND: bare muscular back, royal-blue trunks with a white waistband, blue gloves, dark short hair'},
 'me-p2':{cell:ME_CELL,hip:ME_HIP,poses:ME_POSES,kit:'p2',what:'Player 2 boxer seen FROM BEHIND: bare back, crimson trunks with a gold waistband, red gloves'},
 'foe-lean':{cell:FOE_CELL,hip:FOE_HIP,poses:FOE_POSES,type:'lean',what:'lean, wiry boxer FACING us: purple trunks, white gloves, long arms'},
 'foe-heavy':{cell:FOE_CELL,hip:FOE_HIP,poses:FOE_POSES,type:'heavy',what:'heavyweight brawler FACING us: thick torso and gut, red trunks, dark red gloves'},
 'foe-giant':{cell:FOE_CELL,hip:FOE_HIP,poses:FOE_POSES,type:'giant',what:'towering giant FACING us: massive chest and arms, charcoal trunks, steel-grey gloves'},
 'foe-fast':{cell:FOE_CELL,hip:FOE_HIP,poses:FOE_POSES,type:'fast',what:'small quick boxer FACING us: orange trunks, blue gloves, light on his feet'},
 'foe-champ':{cell:FOE_CELL,hip:FOE_HIP,poses:FOE_POSES,type:'champ',what:'chiselled champion FACING us: red trunks with a gold stripe, red gloves, perfect physique'},
 referee:{cell:REF_CELL,hip:REF_HIP,poses:REF_POSES,what:'boxing referee, front view, own design (bald older man, black-and-white striped shirt, black bow tie, black trousers): stand, count (arm swinging down), wave (waving the fight off), raise (one arm raised high)'}};
const SHAPES={tall:[1080,1920],wide:[1920,1080],fold:[1504,1670]};
const PICTURES={};
for(const [k,label] of [['minor','MINOR CIRCUIT: a small smoky gym arena, a few hundred fans, bare bulbs'],['major','MAJOR CIRCUIT: a packed casino ballroom, chandeliers, high rollers'],['world','WORLD CIRCUIT: a huge sold-out arena, giant screens, camera flashes'],['title','TITLE FIGHT: a massive stadium at night, fireworks, lasers, flags']])
 for(const [sh,[w,h]] of Object.entries(SHAPES))PICTURES[`arena-${k}-${sh}`]={w,h,what:`${label}. The crowd and arena BEHIND the ring; the bottom 30% = the ring canvas seen from ringside (the game draws the ropes, posts and fighters over it)`};
Object.assign(PICTURES,{
 'corner-tall':{w:1080,h:1920,what:'between rounds: our corner, stool, towel, water bucket, ring post, crowd behind (no people in the corner: the game draws the trainer)'},
 'corner-wide':{w:1920,h:1080,what:'between rounds corner, 16:9'},
 belt:{w:800,h:480,what:'a gaudy championship belt, gold plate with a red jewel, our own design, transparent'},
 logo:{w:1600,h:700,what:'FIGHT NIGHT logo with "ROCKY\'S CIRCUIT" small, bold 80s boxing lettering, transparent'},
 'title-bg-tall':{w:1080,h:1920,what:'title screen upright: a boxing ring under a single hard spotlight, smoke, two gloves hanging on the ropes'},
 'title-bg-wide':{w:1920,h:1080,what:'title screen 16:9: the same'},
 'title-bg-fold':{w:1504,h:1670,what:'title screen for the Fold: the same'},
 'fx-hit':{w:768,h:128,what:'punch impact burst, 6 frames of 128x128 left to right, bright yellow/white'},
 star:{w:128,h:128,what:'a gold star (star-punch counter)'},heart:{w:128,h:128,what:'a red heart (stamina)'}});
const imgs=new Map();let ver=0;
function picture(name){const url=USER['po:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['po:'+name];
function cellOf(sheet,pose,def=SHEETS[sheet]){if(!def)return null;const i=def.poses.indexOf(pose);if(i<0)return null;return {sx:i*def.cell[0],sy:0,w:def.cell[0],h:def.cell[1],hip:def.hip};}
Object.assign(exports,{UNIT,ME_POSES,FOE_POSES,REF_POSES,SHEETS,PICTURES,picture,has,cellOf,version:()=>ver});
