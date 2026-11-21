// Drop-in art for Kingpin Bowling (src/engines/kingpinBowling.js, src/engines/bowl/scene.js, src/engines/bowl/screens.js).
// Pictures go in assets/bowling/<name>.png|webp (tools/build.mjs -> USER_PORTRAITS['bowl:<name>']); a missing slot keeps
// the game's drawn art, so pictures can arrive one at a time. Templates: node tools/bowl-templates.mjs ->
// docs/bowling-sprites/templates; brief docs/bowling-sprites/GPT-SPRITE-BRIEF.md. Any picture may come at 2x (same shape).
// Our own drawings: Kingpin and The Big Lebowski in spirit, no real logos or brands, no copied movie frames.
// <era> = ocelot | starlanes | cosmic | reno | galactic (src/data/bowlAlley.js ERAS).
//  boards-<era>   512x1024  the lane wood (or synthetic) seen straight down, 39 boards across the width, tiles top to bottom
//  approach-<era> 512x512   the approach floor (where you walk up), tiles
//  masking-<era>  1600x560  the panel over ONE lane's pins (repeats over every lane); keep the bottom 80 px dark (pinsetter)
//  kickback-<era> 512x512   the side boards beside the pins
//  wall-<era>     1024x512  the side walls, tiles sideways
//  carpet-<era>   512x512   the floor behind the approach (settee area), tiles
//  ceiling-<era>  512x512   ceiling tiles
//  pins-<era>     512x1024  a pin's skin unrolled: x = around the pin, y = top (row 0) to bottom; the neck stripes belong
//                           at y 230-300 (the template shows them)
//  ball-<id>      1024x512  a ball's cover as an equirectangular wrap (like a world map); finger holes drawn by the game
//  screen-<era>   1280x720  the overhead monitor background (scores and animations draw on top)
//  logo           1200x480  KINGPIN BOWLING title lettering, transparent
//  decor-<id>     512x768   a poster / sign / object for the walls (transparent around objects)
//  toon-pin       sheet 8 x 1, cells 256x384: a cartoon bowling pin with a face: 0 stand, 1 scared, 2 knocked (tilted
//                 45 deg), 3 flying (horizontal), 4 dizzy on its back, 5 laughing, 6 crying, 7 dancing
//  toon-ball      sheet 4 x 1, cells 384x384: a cartoon bowling ball: 0 rolling, 1 angry (fire), 2 sad, 3 cool (shades)
//  toon-turkey    sheet 6 x 1, cells 384x384: a cartoon turkey: 0 stand, 1 strut, 2 gobble, 3 dance, 4 fly, 5 bow
const {USER_PORTRAITS:USER}=require("src/data/userPortraits.js");
const {ERAS,BALLS,DECOR}=require("src/data/bowlAlley.js");
const SHEETS={'toon-pin':{cell:[256,384],n:8},'toon-ball':{cell:[384,384],n:4},'toon-turkey':{cell:[384,384],n:6}};
const PICTURES={logo:{kind:'logo',size:[1200,480]}};
for(const e of ERAS){const id=e.id;
 Object.assign(PICTURES,{['boards-'+id]:{kind:'boards',size:[512,1024]},['approach-'+id]:{kind:'approach',size:[512,512]},['masking-'+id]:{kind:'masking',size:[1600,560]},
  ['kickback-'+id]:{kind:'kickback',size:[512,512]},['wall-'+id]:{kind:'wall',size:[1024,512]},['carpet-'+id]:{kind:'carpet',size:[512,512]},
  ['ceiling-'+id]:{kind:'ceiling',size:[512,512]},['pins-'+id]:{kind:'pins',size:[512,1024]},['screen-'+id]:{kind:'screen',size:[1280,720]}});}
for(const b of BALLS)PICTURES['ball-'+b.id]={kind:'ball',size:[1024,512]};
for(const d of DECOR)PICTURES['decor-'+d.id]={kind:'decor',size:[512,768]};
for(const [k,s] of Object.entries(SHEETS))PICTURES[k]={kind:'sheet',size:[s.cell[0]*s.n,s.cell[1]]};
const url=name=>USER['bowl:'+name]||null;
const has=name=>!!url(name);
const imgs=new Map();let ver=0;
// the picture once it has loaded (null until then: the drawn art stands in)
function picture(name){const u=url(name);if(!u||typeof Image==='undefined')return null;let e=imgs.get(name);
 if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;ver++;};e.img.onerror=()=>{e.bad=true;};e.img.src=u;imgs.set(name,e);}return e.ok?e.img:null;}
function preload(names){for(const n of names||[])if(has(n))picture(n);}
// wait (up to ms) for the named pictures that exist, so the first frame isn't drawn with stand-ins
function ready(names,ms=6000){preload(names);const t0=Date.now();return new Promise(res=>{const tick=()=>{const wait=names.some(n=>{const e=imgs.get(n);return e&&!e.ok&&!e.bad;});
 if(!wait||Date.now()-t0>ms)res();else setTimeout(tick,60);};tick();});}
const version=()=>ver;
Object.assign(exports,{SHEETS,PICTURES,has,url,picture,preload,ready,version});
