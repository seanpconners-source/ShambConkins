// Drop-in art for BATTLESHIP · FOG OF WAR (src/engines/partyBattleship.js + battleshipCuts.js). The owner's own original art
// goes in assets/battleship/<name>.png|webp (tools/build.mjs → USER_PORTRAITS['battleship:<name>']); a slot that isn't there
// keeps the game's drawn art, so they can arrive one at a time. Spec + templates: docs/battleship-sprites/README.md
// (templates: node tools/battleship-templates.mjs). Any picture may come at 2x or 4x its template size (same proportions):
// the game scales it by its width.
// Board pieces are drawn from ABOVE on the 8x8 grid at CELL px per cell in the templates; the game scales them to the cell.
const CELL=96;
// SHEETS: one ROW per animation in the order of `rows`, frames left to right, all frames `frame` [w,h] px, transparent, no gaps.
// sailor: the crew in the cut scenes, drawn WITHOUT a head (the player's face goes in the `head` circle, `headSize` across);
// U = template px per `size` (the game's sailor size unit). The game adds the white sailor cap (or 'sailor-cap').
const SHEETS={
 hit:{frame:[CELL,CELL],rows:{burn:4},board:true},            // a hit cell on the board: burning wreckage, looped
 boom:{frame:[128,128],rows:{boom:8},fx:true,foot:122/128},   // foot = where the blast meets the water (fraction of the frame height)                 // explosion, played once (board hits + cut scenes)
 splash:{frame:[128,128],rows:{splash:6},fx:true,foot:122/128},             // water splash, played once (board misses + sailors landing)
 sailor:{frame:[120,160],U:100,head:[60,50],headSize:80,rows:{stand:2,cheer:2,fall:2,swim:4},
  // measured collar (template px) per frame of the owner's sheet (Nov 13): the face's chin sits here (src/headFacts.js)
  neckRows:{stand:[[55,84.5],[56,84]],cheer:[[57.5,84],[58,83]],fall:[[57,80.5],[55.5,78]],swim:[[53.5,84],[53,82.5],[61.5,82.5],[57,81]]}},
};
// PICTURES: stills. `size` = template [w,h] px.
//  ship-<id>: a ship seen from above, BOW TO THE RIGHT, filling `len` cells (the game turns it for up/down). -sunk = the
//   wreck (else the game darkens the ship red); placing shows the ship tinted green/red.
//  miss: the white peg/ripple on an empty cell. grid-sea: the water under the 8x8 grid (the game draws lines and labels).
//  board-bg / board-bg-wide: the room behind the grids (portrait / landscape screens), cover-fitted.
//  cut-sky: the sunset sky of the cut scenes, cover-fitted above the horizon (64% down the screen; the sea is drawn).
//  warship: the enemy ship in side view; `water` = the waterline point (its centre), `L` = px from stern to bow.
//  deck: the foreground deck of the gun shot (bottom-left of the screen). deck-gun: the barrel, `pivot` = where it turns.
//  torpedo: side view, nose to the right. sailor-cap: the white cap on the face.
const PICTURES={
 'ship-battleship':{kind:'ship',ship:'Battleship',len:4,size:[4*CELL,CELL]},
 'ship-cruiser':{kind:'ship',ship:'Cruiser',len:3,size:[3*CELL,CELL]},
 'ship-submarine':{kind:'ship',ship:'Submarine',len:3,size:[3*CELL,CELL]},
 'ship-destroyer':{kind:'ship',ship:'Destroyer',len:2,size:[2*CELL,CELL]},
 'ship-patrol':{kind:'ship',ship:'Patrol Boat',len:2,size:[2*CELL,CELL]},
 'miss':{kind:'cell',size:[CELL,CELL]},
 'grid-sea':{kind:'sea',size:[8*CELL,8*CELL]},
 'board-bg':{kind:'bg',size:[1080,1920]},
 'board-bg-wide':{kind:'bg',size:[1920,1080]},
 'cut-sky':{kind:'sky',size:[1600,1000]},
 'warship':{kind:'warship',size:[1280,480],water:[640,380],L:1074},   // L = the owner's hull length (1200 in the template)
 'deck':{kind:'deck',size:[800,400]},
 'deck-gun':{kind:'gun',size:[440,72],pivot:[0,36]},
 'torpedo':{kind:'torpedo',size:[224,64]},
 'sailor-cap':{kind:'cap',size:[128,56]},
};
for(const [k,d] of Object.entries({...PICTURES}))if(d.kind==='ship')PICTURES[k+'-sunk']={...d,sunk:true};
const SHIP_SLOT={'Battleship':'ship-battleship','Cruiser':'ship-cruiser','Submarine':'ship-submarine','Destroyer':'ship-destroyer','Patrol Boat':'ship-patrol'};

let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const imgs=new Map();
const has=name=>!!USER['battleship:'+name];
const url=name=>USER['battleship:'+name]||null;
// The loaded picture for 'battleship:<name>', or null when missing / not loaded yet (the caller draws its own art meanwhile).
function picture(name){
 const u=USER['battleship:'+name];if(!u||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=u;imgs.set(name,e);}
 return e.ok?e.img:null;
}
function preloadBattleship(){for(const k of Object.keys(USER))if(k.startsWith('battleship:'))picture(k.slice(11));}
// {img, def, k} for a sheet that is in (k = picture px per template px), else null
function sheet(name){const def=SHEETS[name],img=def&&picture(name);if(!img)return null;const cols=Math.max(...Object.values(def.rows));return {img,def,k:img.width/(cols*def.frame[0])};}
// Neck spot [x,y] (template px) of frame f of a row, or null.
function neckAt(def,row,f){const r=def.neckRows&&def.neckRows[row];if(!r||!r.length)return null;return r[((f%r.length)+r.length)%r.length];}
function frameRect(sh,row,f){
 const rows=Object.keys(sh.def.rows),r=Math.max(0,rows.indexOf(row)),n=sh.def.rows[rows[r]]||1,[fw,fh]=sh.def.frame;
 f=((f%n)+n)%n;return {sx:f*fw*sh.k,sy:r*fh*sh.k,sw:fw*sh.k,sh:fh*sh.k,n};
}
// A tinted copy of a picture (cached): colour laid over its own pixels at `a`.
const tints=new Map();
function tinted(img,col,a){
 const key=img.src+'|'+col+'|'+a;let c=tints.get(key);if(c)return c;
 c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);
 g.globalCompositeOperation='source-atop';g.globalAlpha=a;g.fillStyle=col;g.fillRect(0,0,c.width,c.height);tints.set(key,c);return c;
}
Object.assign(exports,{CELL,SHEETS,PICTURES,SHIP_SLOT,has,url,picture,preloadBattleship,sheet,frameRect,tinted,neckAt});
