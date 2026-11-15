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
 'bro-body':{frame:[64,96],rows:{idle:2,run:6,jump:1,fall:1,climb:2,ladder:2},feet:[32,94],neck:[32,22],hand:[56,50],shoulder:[26,37],
  // the fist in every frame of the owner's sheet (measured: it rises up to 10 px while running), so the gun sits in it
  hands:{idle:[[56,51],[56,51]],run:[[56,49.7],[56,45.3],[56,45.6],[56,46.6],[56,41],[56,43]],jump:[[56,48]],fall:[[56,45]],climb:[[56,39.2],[56,40.9]]}},
 // the first four worlds' enemies
 'foe-mook':foeSheet(SMALL,{walk:4,attack:2}),'foe-bomber':foeSheet(SMALL,{walk:4,attack:2}),'foe-grenadier':foeSheet(SMALL,{walk:4,attack:2}),
 'foe-bruiser':foeSheet(BIG,{walk:4,attack:2}),'foe-dog':foeSheet([64,48],{walk:4,attack:2}),
};
const NEW_FOES={robot:SMALL,alien:[64,48],xeno:SMALL,drone:FLY,mechtank:TANK,turret:[64,48],imp:FLY,demon:BIG,skeleton:SMALL,hellhound:[64,48],cultist:SMALL,chariot:TANK,
 crawler:[64,48],shade:SMALL,tentacle:[64,128],spore:FLY,eyeball:FLY,shroom:[64,64],shelly:[64,80],plumber:SMALL,hog:[64,64],chomper:[64,96],ghost:FLY,pixel:SMALL,cannon:[64,64]};
for(const [k,f] of Object.entries(NEW_FOES))SHEETS['foe-'+k]=foeSheet(f,{walk:4,attack:2});
// where each shooter's gun / hand / barrel is in its attack frames (frame px, measured on the owner's sheets): shots start there
const FOE_MUZZLE={mook:[60,21.8],bruiser:[122,74.2],robot:[61,32.8],mechtank:[150,29.4],cultist:[60,39.4],chariot:[147,40.9],plumber:[61,59.2],cannon:[59,27.2]};
for(const [k,m] of Object.entries(FOE_MUZZLE))SHEETS['foe-'+k].muzzle=m;
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
 // one big seamless picture of the ground / rock for the whole world: each tile shows the part of it under that tile, so the
 // land reads as one piece of earth instead of a grid of blocks (cracks still go on single tiles). 1024 px = 16x16 tiles.
 PICTURES['ground-'+w]={size:[1024,1024],world:w,seamless:true};
 PICTURES['rock-'+w]={size:[1024,1024],world:w,seamless:true};
}
// ---- round 2 (Nov 14, owner: "images for everything"): guns, dead bodies, shots, effects, hazards, cracks.
// Every one falls back to the game's own drawing until a picture is in. Same scale: 4 px per world px.
const GUN_IDS=['rifle','shotgun','rocket','flame','pistols','laser','plasma','railgun','pulse','minigun','lightning','holy','fireball','boomerang','ring'];
for(const id of GUN_IDS)PICTURES['gun-'+id]={size:[112,48],anchor:[48,24],kind:'gun',note:'the '+id+' held in the bro\'s hand, side view: the grip/hand point on the red cross, barrel pointing RIGHT, muzzle at the right'};
// muzzle = the barrel tip in each gun picture (template px), measured on the owner's pictures; bullets and the flash start there
const GUN_MUZZLE={rifle:[106,11],shotgun:[110,16],rocket:[102,13],flame:[110,15.5],pistols:[96,23],laser:[110,14],plasma:[110,13.5],railgun:[110,16.5],pulse:[110,14.5],
 minigun:[110,25],lightning:[110,14.5],holy:[110,10],fireball:[110,13.5],boomerang:[48,32],ring:[106,12]};
for(const id of GUN_IDS)PICTURES['gun-'+id].muzzle=GUN_MUZZLE[id];
// dead bodies lying on the ground (bottom middle = where they lie). dead-bro is headless: the game puts the player's face in the circle.
const deadSize=([fw,fh])=>{const tank=fw>=160;if(tank)return [fw,fh];const w=Math.ceil(Math.max(fw*1.25,fh*1.15)/16)*16,h=Math.max(32,Math.round(Math.min(fw,fh)*.6/16)*16);return [w,h];};
const FOE_FRAMES={mook:SMALL,bomber:SMALL,grenadier:SMALL,bruiser:BIG,dog:[64,48],...NEW_FOES};
for(const [k,f] of Object.entries(FOE_FRAMES))PICTURES['dead-'+k]={size:deadSize(f),kind:'dead',note:'the '+k+' dead, lying on the ground (head to the RIGHT), blood allowed; bottom edge = the ground'};
PICTURES['dead-bro']={size:[128,64],face:[28,30,32],kind:'dead',note:'a dead bro, lying on his back, HEADLESS (the game puts the player\'s face in the circle on the left)'};
// shots: centre = the shot's position. aim = drawn turned along the flight (nose RIGHT), spin = spun by the game, flip = mirrored by direction.
const SHOTS={rocket:[48,16,'aim'],nade:[16,20,'spin'],plasma:[48,48,''],holy:[32,32,'spin'],fire:[32,32,'spin'],boomer:[48,24,'spin'],acid:[24,24,''],bone:[40,16,'spin'],hammer:[40,32,'spin'],
 shell:[32,32,''],bomb:[32,32,''],drop:[32,40,''],missile:[48,16,'aim'],bill:[48,40,'flip'],pixel:[24,24,''],orb:[24,24,'']};
for(const [k,[w,h,mode]] of Object.entries(SHOTS))PICTURES['shot-'+k]={size:[w,h],mode,kind:'shot',note:k+' projectile'+(mode==='aim'?', nose pointing RIGHT':mode==='spin'?' (the game spins it)':'')};
// bullets: the RIGHT end is the bullet's head, the rest is its streak; drawn turned along the flight
const BULLETS={'bullet-p':[32,8],'bullet-e':[32,8],laser:[64,8],rail:[96,12],pulse:[32,16],mini:[24,6],ring:[20,24]};
for(const [k,[w,h]] of Object.entries(BULLETS))PICTURES[k==='ring'?'bullet-ring':k.startsWith('bullet')?k:'bullet-'+k]={size:[w,h],kind:'bullet',note:(k==='bullet-p'?'the bros\' bullet':k==='bullet-e'?'enemy bullet':k+' shot')+': head at the RIGHT end, streak trailing left'};
// effect animations: one row, frames left to right, played once (or looped where noted). feet = the effect's anchor point.
const FX=(frame,n,anchor,note,loop)=>({frame,rows:{play:n},feet:anchor,fx:true,loop:!!loop,note});
Object.assign(SHEETS,{
 'fx-explosion':FX([128,128],8,[64,64],'explosion: flash, fireball, then smoke clearing (centre = blast centre; the game scales it to the blast)'),
 'fx-smoke':FX([64,64],6,[32,32],'smoke puff growing and fading'),
 'fx-blood':FX([64,64],6,[32,32],'blood splat from a hit'),
 'fx-gibs':FX([96,96],6,[48,48],'blown apart: blood burst with chunks flying out'),
 'fx-impact':FX([32,32],4,[16,16],'bullet hitting a wall: sparks + dust chip'),
 'fx-dust':FX([48,32],5,[24,30],'dust kicked up by feet (landing, running); bottom middle = the ground'),
 'fx-rubble':FX([64,64],6,[32,32],'a block breaking: dirt/stone chunks and a dust cloud'),
 'fx-fire':FX([48,64],6,[24,60],'a flame licking up (the flamethrower and burning ground); bottom middle = its base',true),
 'fx-rescue':FX([96,96],6,[48,48],'freeing a prisoner / new bro: bright sparkle burst'),
 'fx-muzzle':FX([48,32],3,[4,16],'muzzle flash: starts at the LEFT middle (the gun\'s muzzle), blasts RIGHT'),
 'fx-firewave':FX([64,64],4,[32,62],'a wall of fire rolling along the ground (boss shockwave)',true),
 'fx-geyser':FX([48,128],4,[24,126],'lava geyser jet shooting up from the ground',true),
 'fx-beam':FX([64,256],4,[32,128],'a boss beam, vertical; the game stretches it to the beam\'s size',true),
 'fx-pillar':FX([64,256],4,[32,254],'a fire / energy pillar erupting from the ground (bottom = ground)',true),
 'fx-lightning':FX([128,32],4,[0,16],'lightning bolt from LEFT to RIGHT; the game stretches it between two points',true),
 'portal':FX([96,96],6,[48,48],'swirling warp portal',true)});
Object.assign(PICTURES,{
 'fx-tentacle':{size:[64,256],kind:'fx',note:'a giant tentacle rising out of the ground (boss attack); bottom = the ground'},
 'firebar-ball':{size:[24,24],kind:'fx',note:'one fireball of a spinning fire bar (the game strings several together)'},
 'ring-pickup':{size:[24,24],kind:'fx',note:'a collectible gold ring (Game World), seen face-on; the game squashes it to spin'},
 'shell-casing':{size:[16,8],kind:'fx',note:'an empty brass bullet casing'},
 'crack-1':{size:[64,64],kind:'fx',note:'cracks on a damaged block: light. Transparent except the cracks (laid over any block)'},
 'crack-2':{size:[64,64],kind:'fx',note:'cracks on a damaged block: heavy, about to break. Transparent except the cracks'}});
// ---- round 3 (Nov 15, owner): the bro holds each gun in his own arms (guns floated over the fist), a full firing cycle per gun,
// a smoother run + a slow walk, and pictures for the props that were still drawn (fire barrels, watchtowers, lamps...).
// bro-torso = the bro-body again WITHOUT ARMS (ladder rows keep theirs: both hands on the rungs). The game pins arms-<gun> on at
// `shoulder`; with no arms picture for the gun in hand the old bro-body + gun picture is drawn instead.
SHEETS['bro-torso']={frame:[64,96],rows:{idle:2,walk:8,run:8,jump:1,fall:1,climb:2,ladder:2},feet:[32,94],neck:[32,22],shoulder:[26,37],
 note:'the same headless bro as bro-body, but with NO ARMS (the shoulder is a clean rounded stump on the red cross; the arms come as a separate picture per gun). Ladder rows keep both arms on the rungs. walk = 8-frame slow walk, run = 8-frame smooth run cycle (contact, down, pass, up, for each leg), the shoulder stays on the cross in every frame'};
// bro-run: the bro-body exactly as it is (arms, fist forward, same size) with a smooth 8-frame walk and run; the gun is drawn
// in the fist as now (owner, Nov 15: GPT's separate arms came out ~40% too big, the old body looked better). Fist spots per frame
// get measured on import (`hands`), like bro-body's.
SHEETS['bro-run']={frame:[64,96],rows:{walk:8,run:8},feet:[32,94],neck:[32,22],hand:[56,50],shoulder:[26,37],
 note:'the bro-body, same arms and fist, same size: only the legs move (8-frame walk, 8-frame run), the upper body bobs a little'};
// arms + gun: both arms, hands and the gun as one piece, the shoulder on the red cross, the hand on the grip ring, the barrel tip on
// the muzzle cross. hold = 1 frame; fire = 4 frames played on every shot (kick, recover, then the gun's own cycle).
const ARMS_FIRE={rifle:'kick back + muzzle rises, recover, bolt/charging handle back, forward',shotgun:'big kick back, recover, pump slide BACK, pump slide forward',
 rocket:'tube jolts back on the shoulder, recover, back hand loads a new rocket into the rear, tube settles',flame:'nozzle jolts forward a little, pilot light flares, nozzle sways up, sways down',
 pistols:'front pistol kicks up, front recovers, back pistol kicks up, back recovers (they fire in turn)',laser:'glow brightens + small kick, recover, cooling vents open, vents close',
 plasma:'heavy kick back, recover, core glows dim, core glows bright again',railgun:'violent kick back + arms brace, slide back, rails spark, settle',
 pulse:'small kick, recover, small kick, recover (fast SMG)',minigun:'barrels spin (blur) + body shakes, spin, spin, spin (frames loop while firing)',
 lightning:'coil crackles + kick, recover, arc between the prongs, arc gone',holy:'arm swings back, arm throws forward (flask leaves the hand), empty hand, new flask in hand',
 fireball:'hand pulls back, hand thrusts forward, open palm, flower/flame back in hand',boomerang:'arm cocks back, arm whips forward (boomerang leaves), empty hand follow-through, hand ready',
 ring:'small kick, recover, rings glow, glow fades'};
const ARMS={frame:[160,80],shoulder:[32,28],grip:[62,42]};   // grip = shoulder + (30,14), the reach of the current body's arm
for(const id of GUN_IDS){const gm=GUN_MUZZLE[id],ga=[48,24];
 SHEETS['arms-'+id]={frame:ARMS.frame,rows:{hold:1,fire:4},feet:ARMS.shoulder,shoulder:ARMS.shoulder,grip:ARMS.grip,muzzle:[ARMS.grip[0]+gm[0]-ga[0],ARMS.grip[1]+gm[1]-ga[1]],gun:id,
  note:'both arms holding the '+id+' (same gun picture as gun-'+id+', grip in the hand on the ring, barrel tip on the muzzle cross). hold: aiming forward. fire: '+ARMS_FIRE[id]};}
// the owner approved a different shotgun for the arms (double-bell scatter cannon): its mouths sit higher (measured)
SHEETS['arms-shotgun'].muzzle=[118,22.5];
// props: bottom middle = where it stands (props drawn by the game until a picture is in). Sheets loop.
Object.assign(PICTURES,{
 'prop-tower':{size:[192,384],anchor:[96,384],kind:'prop',note:'wooden enemy watchtower with a roofed lookout platform at the top, ladder up one leg; the game stretches it to the tower\'s width/height'},
 'prop-lamp':{size:[32,64],anchor:[16,0],kind:'prop',note:'a hanging cage lamp (bulb in a wire cage) on a short cord; TOP middle = where it hangs (the game adds the glow)'},
 'prop-post':{size:[24,64],anchor:[12,64],kind:'prop',note:'one wooden fence post (the game strings a rope between two)'},
 'prop-wire':{size:[96,32],anchor:[0,32],kind:'prop',note:'a stretch of coiled barbed wire on the ground; tiles left-to-right seamlessly'},
 'prop-searchlight':{size:[64,192],anchor:[32,192],kind:'prop',note:'a searchlight on a tall pole, lamp head at the top facing up-left (the game draws the beam)'},
 'prop-helipad':{size:[256,24],anchor:[128,24],kind:'prop',note:'a flat helipad slab seen from the side with a yellow H marking on the front edge'},
 'prop-sign':{size:[112,96],anchor:[56,96],kind:'prop',note:'a wooden arrow sign on a post pointing RIGHT, blank board (the game writes the text)'},
 'firebar-base':{size:[32,32],kind:'prop',note:'the bolted metal hub a spinning fire bar turns on'}});
Object.assign(SHEETS,{
 'prop-brazier':{frame:[64,96],rows:{burn:4},feet:[32,94],loop:true,kind:'prop',note:'a rusty oil-drum fire barrel with flames roaring out of the top (4-frame flame loop)'},
 'prop-banner':{frame:[96,128],rows:{wave:4},feet:[4,126],loop:true,kind:'prop',note:'an enemy war banner on a pole (pole at the LEFT edge), cloth waving in 4 frames'}});
// a prop: '<name>-<world>' first (optional per-world look), else the generic one
function prop(name,world){return world&&picture(name+'-'+world)?name+'-'+world:name;}
function propSheet(name,world){return world&&sheet(name+'-'+world)?sheet(name+'-'+world):sheet(name);}
// draw one frame of an effect sheet: anchor at (x,y) world px, progress 0..1 (or seconds when looping), size = frame width in world px
function drawFx(g,name,x,y,prog,{size,rot=0,flip=1,alpha=1,sw,sh}={}){const s=sheet(name);if(!s)return false;const d=s.def,n=d.rows.play||1;
 const f=d.loop?Math.floor(prog*10)%n:Math.min(n-1,Math.floor(Math.max(0,prog)*n)),r=frameRect(s,'play',f),k=size?size/d.frame[0]:1/K,kx=sw?sw/d.frame[0]:k,ky=sh?sh/d.frame[1]:k;
 g.save();g.globalAlpha*=alpha;g.translate(x,y);if(rot)g.rotate(rot);g.scale(kx*flip,ky);g.drawImage(s.img,r.sx,r.sy,r.sw,r.sh,-d.feet[0],-d.feet[1],d.frame[0],d.frame[1]);g.restore();return true;}
// a still picture centred (or by its anchor) at (x,y), size in world px from the template size
function drawPic(g,name,x,y,{rot=0,flip=1,alpha=1,scale=1,anchor}={}){const img=picture(name);if(!img)return false;const pd=PICTURES[name],[w,h]=pd.size,a=anchor||pd.anchor||[w/2,h/2];
 g.save();g.globalAlpha*=alpha;g.translate(x,y);if(rot)g.rotate(rot);g.scale(flip*scale/K,scale/K);g.drawImage(img,-a[0],-a[1],w,h);g.restore();return true;}
const url=name=>USER['bf:'+name]||null;
const has=name=>!!url(name);
const imgs=new Map();
function picture(name){const u=url(name);if(!u||typeof Image==='undefined')return null;let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=u;imgs.set(name,e);}return e.ok?e.img:null;}
function preload(names){for(const n of names||[])if(has(n))picture(n);}
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
// ---- big ground: the owner's ground-/rock-<world> picture, else one made here from the tiles sheet (patches of the tile's
// middle, feathered and scattered with random flips, wrapping round so it tiles) so the stand-in already hides the grid.
const MACRO_ID={1:'ground',10:'rock'},macros=new Map();
function macro(world,id){const kind=MACRO_ID[id];if(!kind)return null;const pic=picture(kind+'-'+world);
 if(pic)return {img:pic,s:pic.width/16};   // source px per tile
 const key=world+':'+id;if(macros.has(key))return macros.get(key);
 const sheet=picture('tiles-'+world);if(!sheet||typeof document==='undefined')return null;
 const cw=sheet.width/TILE_NAMES.length,ch=sheet.height/3,N=8,S=Math.round(cw*N),cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d');
 let seed=(world.length*977+id*131)>>>0;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const src=(v,dx,dy,dw,dh)=>g.drawImage(sheet,(id-1)*cw,v*ch,cw,ch,dx,dy,dw,dh);
 for(let r=0;r<N;r++)for(let c=0;c<N;c++){g.save();g.translate((c+.5)*cw,(r+.5)*cw);g.scale(rnd()<.5?-1:1,rnd()<.5?-1:1);src((rnd()*3)|0,-cw/2,-cw/2,cw,cw);g.restore();}
 // feathered patches cut from the middle of each variant
 const patch=[0,1,2].map(v=>{const p=document.createElement('canvas'),P=Math.round(cw*1.1);p.width=p.height=P;const q=p.getContext('2d'),i=cw*.16;
  q.drawImage(sheet,(id-1)*cw+i,v*ch+i,cw-2*i,ch-2*i,0,0,P,P);q.globalCompositeOperation='destination-in';const rg=q.createRadialGradient(P/2,P/2,P*.18,P/2,P/2,P/2);
  rg.addColorStop(0,'rgba(0,0,0,1)');rg.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=rg;q.fillRect(0,0,P,P);return p;});
 for(let n=0;n<N*N*3;n++){const p=patch[(rnd()*3)|0],sc=.8+rnd()*.6,P=p.width*sc,x=rnd()*S,y=rnd()*S,fx=rnd()<.5?-1:1,fy=rnd()<.5?-1:1,rot=((rnd()*4)|0)*Math.PI/2;
  for(const ox of [-S,0,S])for(const oy of [-S,0,S]){const cx=x+ox,cy=y+oy;if(cx<-P||cy<-P||cx>S+P||cy>S+P)continue;g.save();g.translate(cx,cy);g.rotate(rot);g.scale(fx,fy);g.drawImage(p,-P/2,-P/2,P,P);g.restore();}}
 const m={img:cv,s:cw};macros.set(key,m);return m;}
Object.assign(exports,{prop,propSheet,GUN_MUZZLE,macro,drawFx,drawPic,GUN_IDS,SHOTS,WORLDS,K,TILE_NAMES,SHEETS,PICTURES,BOSS_KINDS,has,url,picture,preload,sheet,frameRect,drawFrame,drawFoe,drawBoss,tile});
