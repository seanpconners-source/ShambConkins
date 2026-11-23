// PENALTY SHOOTOUT (The League) art slots. Every picture is optional: assets/penalty/<slot>.webp|png -> USER_PORTRAITS['pk:<slot>']
// (tools/build.mjs); a missing one is drawn by the game (src/engines/pk/art.js). Brief docs/art-for-gpt/PENALTY-ART.md,
// templates: node tools/pk-templates.mjs.
//
// FIGHTER SHEETS are HEADLESS (the game puts the player's / character's face on the FACE spot) and use one cell per pose:
//  striker-p1/p2: seen FROM BEHIND (the camera sits behind the ball), 8 cells of 256x320, feet on FOOT_S.
//  keeper-p1/p2/cpu: seen FROM THE FRONT (facing the camera), 10 cells of 320x320, body centre on MID_K; dives are drawn
//  going to the keeper's LEFT = screen RIGHT (the game mirrors them for the other side).
// 1 metre = UNIT px on every sheet (a standing player is ~1.85 m = ~200 px).
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const UNIT=108;
const STRIKER_POSES=['idle','run1','run2','run3','plant','strike','follow','cheer'];
const KEEPER_POSES=['ready','set','dive-low','dive-mid','dive-high','jump','crouch','catch','cheer','sad'];
const S_CELL=[256,320],K_CELL=[320,320],FOOT_S=[128,308],MID_K=[160,176];
// face spot (centre) + diameter in px per pose, read off the drawn poses (src/engines/pk/art.js POSE tables)
const SHEETS={
 'striker-p1':{cell:S_CELL,poses:STRIKER_POSES,what:'Player 1 striker seen from BEHIND: blue kit (shirt number 10 on the back), white shorts, blue socks, black boots; athletic. cheer = turned to face the camera, both arms up'},
 'striker-p2':{cell:S_CELL,poses:STRIKER_POSES,what:'Player 2 striker seen from BEHIND: red kit (number 9), black shorts, red socks, white boots. cheer = turned to face the camera, arms up'},
 'keeper-p1':{cell:K_CELL,poses:KEEPER_POSES,what:'Player 1 goalkeeper FACING the camera: lime-green keeper jersey with padded elbows, black shorts, big white gloves'},
 'keeper-p2':{cell:K_CELL,poses:KEEPER_POSES,what:'Player 2 goalkeeper FACING the camera: hot-pink keeper jersey, navy shorts, orange gloves'},
 'keeper-cpu':{cell:K_CELL,poses:KEEPER_POSES,what:'Opponent goalkeeper FACING the camera: yellow-and-black keeper jersey, black shorts, grey gloves'}};
const PICTURES={
 ball:{w:256,h:256,what:'match football, round, fills the square, transparent outside (the game spins it)'},
 goal:{w:1600,h:560,what:'the goal frame seen straight on: white posts + crossbar fill the picture edges, the mouth and net see-through (the game draws the net)'},
 net:{w:512,h:512,what:'white goal net mesh on transparent, repeats both ways'},
 'wall-player':{w:200,h:400,what:'defender standing in a free-kick wall FACING the camera, hands crossed in front, HEADLESS (face spot drawn on the template)'},
 adboards:{w:2048,h:128,what:'pitch-side LED ad boards strip with made-up sponsors (no real brands), repeats side to side'},
 target:{w:256,h:256,what:'glowing target ring for the challenge mode, transparent middle'},
 trophy:{w:512,h:640,what:'a big shiny tournament trophy (our own design)'},
 logo:{w:1600,h:600,what:'title logo PENALTY SHOOTOUT / THE LEAGUE, transparent'},
 'stadium-tall':{w:1080,h:1000,what:'phone upright: the stands behind the goal at night under floodlights, crowd, ends at the bottom with the pitch edge (the game draws the pitch below)'},
 'stadium-wide':{w:1920,h:640,what:'16:9 screens: the same stands, wider'},
 'stadium-fold':{w:1504,h:820,what:'near-square (Galaxy Fold open): the same stands'},
 'title-bg-tall':{w:1080,h:1920,what:'title backdrop upright: a striker standing over the ball at the penalty spot, packed stadium, night'},
 'title-bg':{w:1920,h:1080,what:'title backdrop 16:9: the same scene'},
 'title-bg-fold':{w:1504,h:1670,what:'title backdrop for the Fold: the same scene'}};
// where the game puts the face on the wall player (centre x,y + diameter)
const WALL_FACE=[100,56,64];
const imgs=new Map();let ver=0;
function picture(name){const url=USER['pk:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;ver++;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['pk:'+name];
function ready(names,ms=4000){for(const n of names)if(has(n))picture(n);const t0=Date.now();return new Promise(r=>{const go=()=>{if(names.every(n=>!has(n)||imgs.get(n)?.ok)||Date.now()-t0>ms)return r();setTimeout(go,60);};go();});}
function cellOf(sheet,pose){const d=SHEETS[sheet];if(!d)return null;const i=d.poses.indexOf(pose);if(i<0)return null;return {sx:i*d.cell[0],sy:0,w:d.cell[0],h:d.cell[1]};}
Object.assign(exports,{UNIT,STRIKER_POSES,KEEPER_POSES,S_CELL,K_CELL,FOOT_S,MID_K,SHEETS,PICTURES,WALL_FACE,picture,has,ready,cellOf,version:()=>ver});
