// Drop-in art for Sean of a Gun (our Broforce, src/engines/broforce.js + src/engines/broforce/ext.js), all eight worlds.
// Pictures go in assets/broforce/<name>.png|webp (tools/build.mjs -> USER_PORTRAITS['bf:<name>']); a missing slot keeps
// the game's drawn art, so pictures can arrive one at a time. Templates: node tools/broforce-templates.mjs ->
// docs/broforce-sprites/templates; brief docs/broforce-sprites/GPT-SPRITE-BRIEF.md.
// Scale: the game world is in "world px" (a tile is 16 world px, a soldier ~20 tall). Art is drawn at 4 px per world px
// (a tile = 64 px), pixel-art friendly but smooth art is fine too. Any picture may come at 2x (8 px per world px).
// Characters face RIGHT; the game mirrors them. Bodies are headless: the game puts the player's own face on top.
const {USER_PORTRAITS:USER}=require("src/data/userPortraits.js");
const WORLDS=['jungle','factory','city','desert','space','hell','dimension','games'];
const K=4;
// tile columns in the tiles-<world> sheet: one column per tile id (1..18), three variants down
const TILE_NAMES=['dirt','brick','steel','wood','ladder','barrel','sandbags','platform','crate','rock','lava','spikes','jump-pad','glass','q-block','pipe','goo','crystal'];
// SHEETS: rows in order, frames left to right, each frame `frame` px. feet = where the feet touch the ground (frame px).
const SMALL=[64,96],BIG=[128,128],TANK=[160,96],FLY=[64,64];
const foeSheet=(frame,rows)=>({frame,rows,feet:[frame[0]/2,frame[1]-2]});
const SHEETS={
 // the bro: headless soldier body (vest + bandolier + arms, no gun: the game draws each bro's own gun at `hand`)
 'bro-body':{frame:[64,96],rows:{idle:2,run:6,jump:1,fall:1,climb:2,ladder:2},feet:[32,94],neck:[32,22],hand:[48,50]},
 // the first four worlds' enemies
 'foe-mook':foeSheet(SMALL,{walk:4,attack:2}),'foe-bomber':foeSheet(SMALL,{walk:4,attack:2}),'foe-grenadier':foeSheet(SMALL,{walk:4,attack:2}),
 'foe-bruiser':foeSheet(BIG,{walk:4,attack:2}),'foe-dog':foeSheet([64,48],{walk:4,attack:2}),
};
const NEW_FOES={robot:SMALL,alien:[64,48],xeno:SMALL,drone:FLY,mechtank:TANK,turret:[64,48],imp:FLY,demon:BIG,skeleton:SMALL,hellhound:[64,48],cultist:SMALL,chariot:TANK,
 crawler:[64,48],shade:SMALL,tentacle:[64,128],spore:FLY,eyeball:FLY,shroom:[64,64],shelly:[64,80],plumber:SMALL,hog:[64,64],chomper:[64,96],ghost:FLY,pixel:SMALL,cannon:[64,64]};
for(const [k,f] of Object.entries(NEW_FOES))SHEETS['foe-'+k]=foeSheet(f,{walk:4,attack:2});
// bosses: 320 x 320 frames (80 world px), feet at the bottom middle (fliers: the middle of the frame is the body)
const BOSS_KINDS=['devil','warmech','saucer','queen','cerberus','bonedragon','beast','flower','voideye','shadow','shellking','eggbot','glitch'];
const BIG_BOSS={beast:[400,400],shadow:[400,400]};
for(const b of BOSS_KINDS){const f=BIG_BOSS[b]||[320,320];SHEETS['boss-'+b]={frame:f,rows:{idle:2,move:4,attack:3},feet:[f[0]/2,f[1]-4]};}
// PICTURES: stills. size = template px.
const PICTURES={
 'cage':{size:[96,128]},'cage-gold':{size:[96,128]},'flag':{size:[96,192]},'flag-up':{size:[96,192]},'pickup-nade':{size:[48,48]},'pickup-gun':{size:[64,48]},
};
for(const w of WORLDS){
 PICTURES['tiles-'+w]={size:[64*TILE_NAMES.length,192],world:w};
 PICTURES['top-'+w]={size:[192,36],world:w};
 PICTURES['sky-'+w]={size:[1600,900],world:w};
 PICTURES['far-'+w]={size:[2400,600],world:w};
 PICTURES['mid-'+w]={size:[2400,600],world:w};
 PICTURES['vehicle-'+w]={size:[256,128],world:w};
 PICTURES['tree-'+w]={size:[128,224],world:w};
}
const url=name=>USER['bf:'+name]||null;
const has=name=>!!url(name);
const imgs=new Map();
function picture(name){const u=url(name);if(!u||typeof Image==='undefined')return null;let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=u;imgs.set(name,e);}return e.ok?e.img:null;}
function preload(){for(const k of Object.keys(USER))if(k.startsWith('bf:'))picture(k.slice(3));}
function sheet(name){const def=SHEETS[name],img=def&&picture(name);if(!img)return null;const cols=Math.max(...Object.values(def.rows));return {img,def,k:img.width/(cols*def.frame[0])};}
function frameRect(sh,row,f){const d=sh.def,names=Object.keys(d.rows),r=Math.max(0,names.indexOf(row)),n=d.rows[names[r]]||1,i=((f%n)+n)%n;return {sx:i*d.frame[0]*sh.k,sy:r*d.frame[1]*sh.k,sw:d.frame[0]*sh.k,sh:d.frame[1]*sh.k};}
// draw one frame with its feet at (x,y) in world px, mirrored when dir < 0
function drawFrame(g,sh,row,f,x,y,dir=1){const r=frameRect(sh,row,f),d=sh.def;g.save();g.translate(x,y);g.scale((dir<0?-1:1)/K,1/K);g.drawImage(sh.img,r.sx,r.sy,r.sw,r.sh,-d.feet[0],-d.feet[1],d.frame[0],d.frame[1]);g.restore();}
function drawFoe(g,e,time){const sh=sheet('foe-'+e.type);if(!sh)return false;if(e.hidden)return true;
 const atk=e.muzzle>0||e.state==='attack'&&(e.charge>0||e.whip>0||e.wind>0||e.lunge>.8);const row=atk&&sh.def.rows.attack?'attack':'walk';
 const f=row==='attack'?Math.floor(time*10):Math.floor((e.anim||0)*1.6+(e.fly?time*8:0));
 if(e.flash>0)g.filter='brightness(3)';drawFrame(g,sh,row,f,e.x,e.y,e.dir||1);g.filter='none';return true;}
// bosses: called with the context already at the boss's feet
function drawBoss(g,B,time){const sh=sheet('boss-'+(B.kind||'devil'));if(!sh)return false;
 const att=B.att&&B.att!=='idle'&&B.att!=='walk'||B.state&&!['idle','walk','wait','intro'].includes(B.state),moving=Math.abs(B.vx||0)>5;
 const row=att?'attack':moving?'move':'idle',f=Math.floor(time*(row==='move'?8:5));
 if(B.flash>0)g.filter='brightness(2.6)';const r=frameRect(sh,row,f),d=sh.def;g.save();g.scale((B.dir<0?-1:1)/K,1/K);g.drawImage(sh.img,r.sx,r.sy,r.sw,r.sh,-d.feet[0],-d.feet[1],d.frame[0],d.frame[1]);g.restore();g.filter='none';return true;}
// a tile from the world's sheet: returns [img,sx,sy,sw,sh] or null
function tile(world,id,variant){const img=picture('tiles-'+world);if(!img)return null;const cw=img.width/TILE_NAMES.length,ch=img.height/3;return [img,(id-1)*cw,(variant%3)*ch,cw,ch];}
Object.assign(exports,{WORLDS,K,TILE_NAMES,SHEETS,PICTURES,BOSS_KINDS,has,url,picture,preload,sheet,frameRect,drawFrame,drawFoe,drawBoss,tile});
