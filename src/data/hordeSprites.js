// Drop-in art for the LIVING DEAD HORDE / EVIL DEAD CABIN DEFENSE (src/engines/horde.js). The owner's own original art goes
// in assets/horde/<name>.png|webp (tools/build.mjs → USER_PORTRAITS['horde:<name>']); any slot that isn't there keeps the
// game's drawn art, so they can arrive one at a time. Spec + templates: docs/horde-sprites/README.md
// (templates: node tools/horde-templates.mjs).
// Every picture may come at 1x, 2x or 4x its template size (same proportions): the game scales it by its width.
// Theme: the Evil Dead cabin variant looks for <name>-cabin first, then <name> (ground-, building- are per theme only).
// SHEETS: one ROW per animation in the order of `rows`, frames left to right, all frames `frame` [w,h] px, transparent,
// facing RIGHT (the game mirrors), no gaps. `foot` = the pixel standing on the ground. Survivors are drawn WITHOUT a head:
// the game puts the player's face in the `head` circle (`headSize` px across). World size: 2 px per world unit.
const PX=2;   // template pixels per world unit
const SHEETS={
 'survivor-p1':{frame:[112,128],foot:[56,124],head:[56,52],headSize:104,rows:{idle:4,walk:6,hurt:2,down:2}},
 'survivor-p2':null,   // same layout as survivor-p1 (filled in below)
};
SHEETS['survivor-p2']={...SHEETS['survivor-p1']};
// Measured neck (top of the collar, template px) per frame of the owner's survivor sheets (Nov 13): the face's chin sits
// here (src/headFacts.js drawFace), so it moves with the body's bob/stride like Seanic and SotN. A sheet without
// neckRows falls back to the template's head spot.
SHEETS['survivor-p1'].neckRows={idle:[[56.5,83],[56,81.5],[56.5,79.5],[56,83.5]],walk:[[56,78.5],[55.5,79],[56.5,77.5],[56,78.5],[56,78.5],[56,78.5]],hurt:[[56,78.5],[57.5,76]],down:[[55.5,88],[56,88.5]]};
SHEETS['survivor-p2'].neckRows={idle:[[55.5,84],[56,82.5],[56,80.5],[55.5,84]],walk:[[55.5,79.5],[56,80],[55.5,78.5],[56,79.5],[55.5,80],[56,80]],hurt:[[55.5,79],[57,77.5]],down:[[56,88.5],[56.5,89.5]]};
// Enemies: one walk cycle (4 frames, played at 8 a second) in a square frame of 2 x the enemy's size; the feet sit at 44/48 of
// the frame height (flyers hover round that point). The game adds the shadow, the white hit flash and the mirror image.
const ENEMY_SIZES={shambler:46,runner:42,crawler:38,bloater:72,bat:34,spitter:48,barrel:54,charger:58,ghost:52,armored:56,
 sergeant:72,nurse:68,tarman:112,colonel:108,banshee:100,mama:140,titan:170,hunger:120};
// The owner's enemy sheets are drawn ART_K x their template size (Nov 13): with the survivor bodies at 2x (horde.js
// BODY_K) a 46-unit shambler only came up to the survivor's shoulders. Feet stay on the same spot; hitboxes unchanged.
const ENEMY_ART_K=1.5;
for(const [id,sz] of Object.entries(ENEMY_SIZES)){const w=sz*PX;SHEETS['enemy-'+id]={frame:[w,w],foot:[w/2,Math.round(w*44/48)],rows:{walk:4},enemy:id,sz};}
// PICTURES: one still picture each. `size` = template [w,h] px; `foot` = the ground point (props/building: bottom-centre
// anchor), `light` = where the lamp/torch glow is centred. kind: prop (type + variant in the game), building, ground (a
// seamless tile repeated over the whole map, 256 world units), gem (XP gem tier 0..3), icon (64-unit glyph box: weapons,
// passives, pickups; the game draws the card frame round it).
const PICTURES={
 'grave-1':{kind:'prop',type:'grave',v:0,size:[64,84],foot:[32,76]},
 'grave-2':{kind:'prop',type:'grave',v:1,size:[64,84],foot:[32,76]},
 'grave-3':{kind:'prop',type:'grave',v:2,size:[64,84],foot:[32,76]},
 'tree-1':{kind:'prop',type:'tree',v:0,size:[128,156],foot:[64,144]},
 'tree-2':{kind:'prop',type:'tree',v:1,size:[128,156],foot:[64,144]},
 'tree-3':{kind:'prop',type:'tree',v:2,size:[128,156],foot:[64,144]},
 'car-1':{kind:'prop',type:'car',v:0,size:[200,100],foot:[100,76]},
 'car-2':{kind:'prop',type:'car',v:1,size:[200,100],foot:[100,76]},
 'lamp':{kind:'prop',type:'lamp',v:0,size:[64,144],foot:[32,132],light:[32,36]},
 'lamp-broken':{kind:'prop',type:'lamp',v:1,size:[64,144],foot:[32,132]},
 'torch':{kind:'prop',type:'torch',v:0,size:[48,144],foot:[24,132],light:[24,36]},
 'torch-out':{kind:'prop',type:'torch',v:1,size:[48,144],foot:[24,132]},
 'barrel':{kind:'prop',type:'barrel',v:0,size:[64,80],foot:[32,68]},
 'barrel-red':{kind:'prop',type:'barrel',v:1,size:[64,80],foot:[32,68]},
 'barrel-toxic':{kind:'prop',type:'barrel',v:2,size:[64,80],foot:[32,68]},
 'crate':{kind:'prop',type:'crate',v:0,size:[72,72],foot:[36,60]},
 'bush':{kind:'prop',type:'bush',v:0,size:[88,60],foot:[44,48]},
 'bones':{kind:'prop',type:'bones',v:0,size:[56,36],foot:[28,24]},
 'rubble':{kind:'prop',type:'rubble',v:0,size:[68,40],foot:[34,28]},
 'building-dead':{kind:'building',theme:'dead',size:[600,380],foot:[300,360]},
 'building-cabin':{kind:'building',theme:'cabin',size:[600,380],foot:[300,360]},
 'ground-dead':{kind:'ground',theme:'dead',size:[512,512]},
 'ground-cabin':{kind:'ground',theme:'cabin',size:[512,512]},
 'gem-blue':{kind:'gem',tier:0,size:[56,56]},'gem-green':{kind:'gem',tier:1,size:[56,56]},
 'gem-red':{kind:'gem',tier:2,size:[56,56]},'gem-purple':{kind:'gem',tier:3,size:[56,56]},
};
// icon glyphs (hordeData ICONS ids): weapons, passives, pickups. 'growth' doubles as the brains pickup (heals) in the
// Living Dead theme, 'chicken' in the cabin.
const ICON_IDS=['boomstick','chainsaw','necro','barrel','goo','crowbar','nailgun','lantern','grenade','medics','vinyl','bolt',
 'might','armor','maxhp','recovery','cooldown','area','pspeed','duration','magnet','luck','growth','greed','revive',
 'chicken','chest','bomb','coin','skull'];
for(const id of ICON_IDS)PICTURES['icon-'+id]={kind:'icon',icon:id,size:[128,128]};

let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const imgs=new Map();
const has=name=>!!USER['horde:'+name];
// The loaded picture for 'horde:<name>' (theme copy first), or null when missing / not loaded yet.
function picture(name,theme){
 if(theme&&has(name+'-'+theme))name=name+'-'+theme;
 const url=USER['horde:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(name,e);}
 return e.ok?e.img:null;
}
// Load every horde picture that is in the build (waits at most `ms`); the engine bakes its art after this.
function loadHorde(ms=4000){
 const names=Object.keys(USER).filter(k=>k.startsWith('horde:')).map(k=>k.slice(6));
 if(!names.length||typeof Image==='undefined')return Promise.resolve();
 const all=names.map(n=>{picture(n);const e=imgs.get(n);return e.ok?null:new Promise(res=>{e.img.addEventListener('load',res,{once:true});e.img.addEventListener('error',res,{once:true});});}).filter(Boolean);
 return Promise.race([Promise.all(all),new Promise(res=>setTimeout(res,ms))]);
}
// {img, def, k} for an animated sheet that is in (k = picture px per template px), else null
function sheet(name,theme){
 const def=SHEETS[name],img=def&&picture(name,theme);if(!img)return null;
 const cols=Math.max(...Object.values(def.rows));return {img,def,k:img.width/(cols*def.frame[0])};
}
// Source rect (picture px) of frame f of a row
function frameRect(sh,row,f){
 const rows=Object.keys(sh.def.rows),r=Math.max(0,rows.indexOf(row)),n=sh.def.rows[rows[r]]||1,[fw,fh]=sh.def.frame;
 f=((f%n)+n)%n;return {sx:f*fw*sh.k,sy:r*fh*sh.k,sw:fw*sh.k,sh:fh*sh.k,n};
}
// Neck spot [x,y] (template px) of frame f of a row, or null when the sheet has none.
function neckAt(def,row,f){const r=def.neckRows&&def.neckRows[row];if(!r||!r.length)return null;return r[((f%r.length)+r.length)%r.length];}
Object.assign(exports,{PX,SHEETS,PICTURES,ENEMY_SIZES,ENEMY_ART_K,ICON_IDS,has,picture,loadHorde,sheet,frameRect,neckAt});
