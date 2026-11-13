// Drop-in sprite sheets for SUNDOWN SHOWDOWN (src/engines/sundown.js). The owner's own original pixel art goes in
// assets/sundown/<name>.png|webp (tools/build.mjs → USER_PORTRAITS['sundown:<name>']); any sheet that isn't there falls back
// to the game's drawn art, so they can arrive one at a time. The full spec, with a template picture per sheet, is
// docs/sundown-sprites/README.md (templates: node tools/sundown-templates.mjs).
// Layout of every animated sheet: one ROW per animation, in the order listed in `rows`, frames left to right, all frames
// the same size (`frame` [w,h] in pixels), transparent background, facing RIGHT (the game mirrors it), no gaps.
// `foot` = the pixel in each frame that stands on the ground (the character's position). Characters that wear a player's
// face (cowboys) or the WANTED character's face (boss) are drawn WITHOUT a head: the game puts the head at `head` (centre,
// in frame pixels; `headRows` moves it for a row, per frame if given a list) at `headSize` pixels across.
// `scale` = world units per sprite pixel (the stage is 200 units tall, a cowboy is ~46 units).
const SHEETS={
 'cowboy-p1':{frame:[64,64],foot:[32,63],scale:.75,head:[33,13],headSize:20,
  rows:{idle:4,run:8,runShoot:8,shoot:2,shootUp:2,shootDiagUp:2,shootDiagDown:2,duck:2,duckShoot:2,jump:4,slide:3,death:6},
  headRows:{duck:[33,27],duckShoot:[33,27],slide:[[38,40],[38,40],[38,40]],death:[[33,15],[30,20],[26,30],[22,42],[20,52],[20,56]]},
  // the muzzle in each shooting row (frame pixels): bullets and the flash start here
  gun:{shoot:[60,19],runShoot:[60,18],shootUp:[27,3],shootDiagUp:[54,8],shootDiagDown:[54,45],duckShoot:[60,35]},
  // the NECK (top of the collar the face's chin rests on) in every frame of the owner's sheets (Nov 13: their bodies sit
  // higher in the frame than the template's head spot, so faces landed on the chest); measured from the art (topmost body
  // pixels round the head column), a raised arm read by eye. Rows without an entry (death) keep the old head spot.
  neckRows:{idle:[[34,10],[34,10],[34,10],[34,10]],run:[[35,10],[36,11],[38,8],[39,11],[36,10],[34,10],[36,10],[39,11]],
   runShoot:[[31,11],[32,11],[37,11],[39,12],[34,12],[32,12],[34,12],[36,13]],shoot:[[29,14],[27,14]],shootUp:[[31,16],[30,16]],
   shootDiagUp:[[29,17],[30,17]],shootDiagDown:[[28,16],[28,17]],duck:[[34,28],[36,33]],duckShoot:[[30,29],[32,31]],
   jump:[[36,20],[34,10],[34,4],[33,5]],slide:[[33,31],[35,40],[36,48]]}},
 'cowboy-p2':null,   // same layout as cowboy-p1 (filled in below)
 bandit:{frame:[64,64],foot:[32,63],scale:.75,rows:{idle:2,walk:6,shoot:2,cover:2,death:6}},
 knife:{frame:[64,64],foot:[32,63],scale:.75,rows:{run:6,slash:2,death:6}},
 dynamite:{frame:[64,64],foot:[32,63],scale:.75,rows:{idle:2,walk:6,throw:3,death:6}},
 window:{frame:[48,48],foot:[24,47],scale:.75,rows:{peek:2,shoot:2,death:4}},
 rider:{frame:[112,96],foot:[56,95],scale:.75,rows:{gallop:6,shoot:2,fall:6}},
 horse:{frame:[112,80],foot:[56,79],scale:.75,rows:{gallop:6}},
 boss:{frame:[96,96],foot:[48,95],scale:.8,head:[48,16],headSize:28,rows:{idle:4,walk:6,shoot:3,throw:3,hurt:2,death:8},
  headRows:{death:[[48,18],[44,24],[38,36],[32,52],[28,68],[26,80],[26,86],[26,88]]},
  neckRows:{idle:[[45,20],[44,18],[44,18],[45,20]],walk:[[48,19],[48,17],[50,17],[51,18],[50,15],[50,15]],shoot:[[44,27],[43,28],[44,27]],
   throw:[[46,30],[41,31],[46,31]],hurt:[[41,27],[41,35]]}},
 explosion:{frame:[64,64],foot:[32,48],scale:.9,rows:{boom:8}},
 muzzle:{frame:[24,16],foot:[2,8],scale:.75,rows:{flash:3}},
};
SHEETS['cowboy-p2']=SHEETS['cowboy-p1'];
// Single pictures (any size, drawn at `scale` units per pixel, bottom-centre on the ground unless noted).
const PICTURES={
 'hat-p1':{scale:.75},'hat-p2':{scale:.75},
 crate:{scale:.75},barrel:{scale:.75},wagon:{scale:.5},'dynamite-stick':{scale:.75,centre:true},bullet:{scale:.75,centre:true},'enemy-bullet':{scale:.75,centre:true},
 'item-gold':{scale:.75},'item-two':{scale:.75},'item-rapid':{scale:.75},
 trough:{scale:.5},'hitching-post':{scale:.5},lamp:{scale:.5},
 logo:{ui:true},poster:{ui:true},
};
// Scenery per stage, named <stage>-<part> with stage town / canyon / mission: -sky (stretched over the view), -far and -near
// (strips repeated sideways, parallax .15 and .45, bottom on the ground line), -ground (a tile repeated along the floor,
// top on the ground line), -building-1..4 (fronts placed along the road, bottom on the ground). Scenery is drawn at
// SCENE_SCALE world units per pixel (a 400 px tall picture = the whole view). Missing ones fall back to the drawn scenery.
const SCENERY=['sky','far','near','ground','building-1','building-2','building-3','building-4'];
const SCENE_SCALE=.5;
// Building fronts with art use a FIXED size per slot [width px, height px, floors], drawn at SCENE_SCALE (no stretching), so
// the balcony (floor 80 px up), the window gunmen (windows centred 60 px and 152 px up, evenly spaced: centre of window k of n
// = (k+.5)/n of the width, n = floor(width/68)) and the door (middle) land on the picture. The README lists every spot.
const BUILDING_ART={
 town:[[256,260,2],[224,260,2],[320,260,2],[192,260,2]],
 mission:[[288,250,2],[256,250,2],[224,150,1],[320,150,1]],
};
const THEME_IDS=['town','canyon','mission'];

let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const imgs=new Map();
// The loaded picture for 'sundown:<name>', or null (missing, or still loading: the caller draws its fallback meanwhile).
function picture(name){
 const url=USER['sundown:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(name,e);}
 return e.ok?e.img:null;
}
const has=name=>!!USER['sundown:'+name];
// {img, def} for an animated sheet that is in, else null
function sheet(name){const def=SHEETS[name],img=def&&picture(name);return img?{img,def}:null;}
// Frame rectangle for an animation row at time t (seconds) or a fixed frame index.
function frameOf(def,row,t,{fps=10,loop=true,index=null}={}){
 const rows=Object.keys(def.rows),r=Math.max(0,rows.indexOf(row));const n=def.rows[rows[r]]||1;
 const f=index!=null?Math.min(n-1,Math.max(0,index)):loop?Math.floor(t*fps)%n:Math.min(n-1,Math.floor(t*fps));
 return {sx:f*def.frame[0],sy:r*def.frame[1],w:def.frame[0],h:def.frame[1],f,row:rows[r]};
}
// Head centre (frame pixels) for a row/frame, or null when the sheet carries no head slot.
function neckAt(def,row,f){const o=def.neckRows?.[row];if(!o)return null;return o[f]||o[o.length-1];}
function headAt(def,row,f){if(!def.head)return null;const o=def.headRows?.[row];if(!o)return def.head;return Array.isArray(o[0])?(o[f]||o[o.length-1]):o;}
function preloadSundown(){for(const k of Object.keys(USER))if(k.startsWith('sundown:'))picture(k.slice(8));}
Object.assign(exports,{BUILDING_ART,SCENE_SCALE,SHEETS,PICTURES,SCENERY,THEME_IDS,picture,sheet,frameOf,headAt,neckAt,has,preloadSundown});
