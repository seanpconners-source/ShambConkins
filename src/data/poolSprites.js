// Drop-in art for Paddy's Pool (src/engines/paddysPool.js, src/engines/pool/art.js). Pictures go in
// assets/pool/<name>.png|webp (tools/build.mjs -> USER_PORTRAITS['pool:<name>']); a missing slot keeps the game's drawn art,
// so pictures can arrive one at a time. Templates: node tools/pool-templates.mjs -> docs/pool-sprites/templates;
// brief docs/pool-sprites/GPT-SPRITE-BRIEF.md. Any picture may come at 2x its template size (same proportions).
// Look (owner, Nov 14): a modern, professional pool game set in Paddy's Pub (It's Always Sunny in Philadelphia): the first
// table is a ratty bar table (ripped felt, spills, cigarette burns); every upgrade makes the table and the bar fancier.
// Our own drawings: no logos from the show, no real brands (Wolf Cola, Fight Milk, Kitten Mittens are the show's own jokes).
const {USER_PORTRAITS:USER}=require("src/data/userPortraits.js");
const {TABLES,CUES,DECOR,ROOM}=require("src/data/poolHall.js");
// TOP VIEW (play screen), 10 px per inch. The playing bed is 88 x 44 in, the cushions 2 in, the rails 5.5 in:
//  table-<id>: the table seen straight down, 1030 x 590 (outside edge of the rails), bed centre at (515,295). TRANSPARENT
//   inside the rails (x 55..975, y 55..535: the 2 in cushions + the 88 x 44 in bed) except the six pocket holes: the game
//   paints the felt and the cushions (any felt colour) under it. Pocket holes: corners (63,63) (967,63) (63,527) (967,527),
//   sides (515,50) (515,540), about 30 px across. Diamonds (sights) on the rails.
//  wear-1/2/3: stains on the felt for the old tables (3 = Paddy's Original: rips, beer spills, cigarette burns; 2 = taped
//   rips, fewer stains; 1 = a few faint marks), 880 x 440 = the bed, transparent, multiplied over the felt colour (so draw
//   them as darkish marks; rips can show the white slate). Rips sit where the template marks them (they slow the balls).
//  cue-<id>: the cue stick lying flat, 1200 x 48, tip at the RIGHT end, butt on the left, transparent around it.
//  floor-<n> (n = room tier 0..4): floor texture around the table, 512 x 512, must tile.
//  wall-<n>: the wall strip at the top of the play screen, 1600 x 320, its bottom 40 px a skirting/shadow (bottom = floor).
// HALL (the upgrade screen, a straight-on view of the bar), 1600 x 1000 scene, everything placed by the game:
//  hall-<n>: the empty room (back wall, floor, ceiling) for room tier n.
//  hall-bar-<n>, hall-light-<n>, hall-tv-<n> (n 1..4; tier 0 of the TV is no TV): placed at HALL[slot] below; TVs have
//   BLACK screens at `screens` (the game shows sports, the news and your face on them).
//  hall-table-<id>: the pool table seen from the front and a little above, with the felt TRANSPARENT (the game fills the
//   felt quad `felt` with the chosen colour behind it).
//  decor-<id>: one picture per decoration, placed at HALL.decor[id].
//  logo: "PADDY'S POOL" title lettering, 1200 x 480, transparent.
const HALL={W:1600,H:1000,floorY:640,
 tv:{x:150,y:96,w:600,h:250,screens:[[[0,0,0,0]],[[205,40,190,150]],[[40,50,240,140],[320,50,240,140]],[[20,20,180,100],[210,20,180,100],[400,20,180,100],[20,130,180,100],[210,130,180,100],[400,130,180,100]],[[30,20,540,210]]]},
 bar:{x:1050,y:300,w:550,h:640},
 light:{x:480,y:0,w:640,h:360},
 table:{x:300,y:560,w:1000,h:400,felt:[[160,40],[840,40],[930,250],[70,250]]},
 decor:{'neon-paddys':[800,70,300,160],'neon-fight-milk':[1140,40,250,120],'neon-kitten':[1340,140,240,110],'neon-wolf':[30,300,230,120],
  jukebox:[20,440,210,380],dartboard:[310,380,130,130],chalkboard:[860,300,190,160],'pepe-board':[470,370,210,150],'dennis-portrait':[1180,170,120,150],
  fan:[640,0,320,90],'trophy-case':[150,470,170,300],megatouch:[1110,560,140,120],'rum-ham':[1330,600,150,90],crowd:[0,640,1600,360]}};
const SHEETS={};
const PICTURES={logo:{kind:'logo',size:[1200,480]},'wear-1':{kind:'wear',size:[880,440]},'wear-2':{kind:'wear',size:[880,440]},'wear-3':{kind:'wear',size:[880,440]}};
for(const t of TABLES){PICTURES['table-'+t.id]={kind:'table',size:[1030,590]};PICTURES['hall-table-'+t.id]={kind:'hall-table',size:[HALL.table.w,HALL.table.h]};}
for(const c of CUES)PICTURES['cue-'+c.id]={kind:'cue',size:[1200,48]};
for(let n=0;n<5;n++){PICTURES['floor-'+n]={kind:'floor',size:[512,512]};PICTURES['wall-'+n]={kind:'wall',size:[1600,320]};PICTURES['hall-'+n]={kind:'hall',size:[1600,1000]};}
for(const slot of ['bar','light','tv'])for(let n=slot==='tv'?1:0;n<5;n++)PICTURES[`hall-${slot}-${n}`]={kind:'hall-'+slot,size:[HALL[slot].w,HALL[slot].h]};
for(const d of DECOR)if(d.id!=='crowd'){const r=HALL.decor[d.id];PICTURES['decor-'+d.id]={kind:'decor',size:[r[2],r[3]]};}
const url=name=>USER['pool:'+name]||null;
const has=name=>!!url(name);
const imgs=new Map();
function picture(name){const u=url(name);if(!u||typeof Image==='undefined')return null;let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=u;imgs.set(name,e);}return e.ok?e.img:null;}
function preloadPool(){for(const k of Object.keys(USER))if(k.startsWith('pool:'))picture(k.slice(5));}
const pending=()=>[...imgs.values()].some(e=>!e.ok);
void ROOM;
Object.assign(exports,{HALL,SHEETS,PICTURES,has,url,picture,preloadPool,pending});
