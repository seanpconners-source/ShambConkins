// Drop-in sprites and stage art for SYMPHONY OF THE NIGHT (src/engines/sotn.js, drawn by src/engines/sotnArt.js). The
// owner's own art goes in assets/sotn/<name>.png|webp (tools/build.mjs → USER_PORTRAITS['sotn:<name>']). Every slot is
// optional: whatever is missing keeps the game's drawn vector art, so the art can arrive one sheet at a time.
// Brief for ChatGPT: docs/sotn-sprites/GPT-SPRITE-BRIEF.md; technical page + import steps: docs/sotn-sprites/README.md;
// templates (grid, ground points, face circles, sword hands and a faint pose guide in every frame):
//   node tools/sotn-templates.mjs  → docs/sotn-sprites/templates/
//
// SCALE: everything is drawn at S = 0.5 world units per sprite pixel (the view is 240 units tall, so a 480 px tall picture
// fills the screen's height; the hero is ~50 units = ~100 px tall). That is 2x the PS1's own pixel size.
// Animated SHEETS: one ROW per animation in the order of `rows`, frames left to right, every frame `frame` [w,h] px,
// transparent background, facing RIGHT (the game mirrors them), no gaps. `foot` = the pixel that sits on the character's
// position (the ground point; for flyers the body's centre). The hero has NO head: the game puts the player's face at
// `head` ([x,y] centre in frame px, `headSize` px across); `headRows` moves it for a row, per frame when given a list, and
// a third number turns it (radians). The hero's sword is drawn by the game too (it changes when Death takes your gear):
// in the attack rows the sword hand sits where the template's yellow ring is, the blade along its yellow line.
const S=.5;
const TAU=Math.PI*2;
const ease=u=>u*u*(3-2*u);
// hero helpers (frame px): the standing head, a somersault round the waist, a fall onto the back
const HF=[60,122],HEAD=[61,44];
const flipHeads=n=>Array.from({length:n},(_,f)=>{const a=ease((f+.5)/n)*TAU,px=60,py=80;return [+(px+Math.cos(a)+36*Math.sin(a)).toFixed(1),+(py+Math.sin(a)-36*Math.cos(a)).toFixed(1),+a.toFixed(2)];});
const deadHeads=n=>Array.from({length:n},(_,f)=>{const k=n>1?f/(n-1):1;return [+(61+(28-61)*k).toFixed(1),+(44+(100-44)*Math.pow(k,1.6)).toFixed(1),+(-1.45*k).toFixed(2)];});
// face spots measured on the owner's hero sheet by tools/sotn/hero-heads.py (re-run it if the sheet is redrawn); the
// template's own layout (a headless body, the face circle above it) was HEAD + flipHeads/deadHeads
const HERO_HEADS={"stand":[[58,66],[57,65],[57,66],[58,66]],"walk":[[56,65],[57,66],[57,64],[56,65],[55,65],[55,66],[56,66],[55,64]],"crouch":[[61,82],[56,81]],"crouchSlash":[[61,74],[61,79],[63,80],[62,80]],"jump":[[54,64],[60,66],[57,64]],"fall":[[55,64],[52,64],[49,64]],"flip":[[59,69,0.07],[70,69,0.58],[73,77,1.46],[68,84,2.56],[55,90,3.73],[52,81,4.83],[55,69,5.7],[54,70,6.21]],"land":[[57,76],[62,70]],"dash":[[62,67],[62,67],[63,67],[64,68]],"kick":[[63,59],[64,58]],"hurt":[[64,69],[63,67]],"cast":[[59,65],[63,64],[61,61],[67,61]],"slash":[[60,61],[58,63],[59,63],[57,64]],"stab":[[51,65],[60,64],[57,65],[60,64],[59,64]],"cleave":[[57,58],[54,55],[60,62],[59,64],[59,63],[60,61]],"dead":[[58,66],[52,72,-0.29],[54,78,-0.58],[52,86,-0.87],[53,99,-1.16],[59,112,-1.45]]};
const SHEETS={
 // the hero (player 1: crimson cape lining; player 2: `hero-p2`, same layout, royal-blue lining; if only p1 is in, both use it)
 'hero-p1':{frame:[128,144],foot:HF,head:HEAD,headSize:40,
  rows:{stand:4,walk:8,crouch:2,crouchSlash:4,jump:3,fall:3,flip:8,land:2,dash:4,kick:2,hurt:2,cast:4,slash:4,stab:5,cleave:6,dead:6},
  // the owner's sheet (Nov 6) draws Alucard with a small head of his own: HERO_HEADS puts the face over it in every frame
  headRows:HERO_HEADS},
 'hero-p2':null,
 // monsters (anchor = feet on the ground, except the bat: its body's centre)
 zombie:{frame:[96,96],foot:[40,92],rows:{rise:4,walk:6}},
 bloody:{frame:[128,112],foot:[48,108],rows:{walk:6,swipe:4}},
 warg:{frame:[192,96],foot:[96,90],rows:{idle:4,run:6,tell:3,lunge:2,skid:2}},
 skeleton:{frame:[80,96],foot:[36,92],rows:{walk:6,throw:4}},
 bat:{frame:[64,48],foot:[32,24],rows:{hang:2,fly:4}},
 merman:{frame:[80,96],foot:[36,92],rows:{leap:2,walk:6,spit:4}},
 armor:{frame:[112,128],foot:[48,124],rows:{walk:4,throw:4,empty:4}},
 // Death floats: the anchor is under his robe's hem (the scythe swings round his waist)
 death:{frame:[240,200],foot:[110,176],rows:{float:4,swing:6}},
 // the vampire lord (first form) and his true form; the demon's head is the weak spot, keep it where the template shows
 dracula:{frame:[224,152],foot:[112,148],rows:{idle:4,cast:4}},
 demon:{frame:[448,352],foot:[240,344],rows:{idle:4,crouch:3,leap:2,breath:4,summon:4}},
 // candles (anchor = the template's red cross: the candelabra's foot, the lantern's post top, the torch's bracket)
 candelabra:{frame:[48,64],foot:[24,60],rows:{lit:4,out:1}},
 lantern:{frame:[32,96],foot:[16,48],rows:{lit:4,out:1}},
 torch:{frame:[32,64],foot:[16,60],rows:{lit:4,out:1}},
 // projectiles / effects (anchor = the centre)
 fireball:{frame:[32,32],foot:[16,16],rows:{burn:4}},
 inferno:{frame:[48,48],foot:[24,24],rows:{burn:4}},
 'holy-flame':{frame:[48,48],foot:[24,44],rows:{burn:3}},
 'fire-wave':{frame:[32,48],foot:[16,46],rows:{burn:3}},
};
SHEETS['hero-p2']=SHEETS['hero-p1'];
// Single PICTURES. `w` = drawn width in world units (the height follows the picture's own shape, so any resolution works);
// `at` says where it sits: 'bottom' (bottom centre on the spot: items, props), 'centre' (shots), 'grip' (swords: left end =
// pommel, crossguard 1/8 of the way in, blade pointing right; the game sizes swords by their blade length), 'top' (hanging from the spot), 'stretch' (fills a box the
// level gives), 'tile' (repeats sideways; `h` = its height in units), 'cover' (stretched over the whole view).
const PICTURES={
 // weapons and items
 'sword-alucard':{w:34.3,at:'grip'},'sword-short':{w:20.6,at:'grip'},'sword-claymore':{w:36.6,at:'grip'},
 // (items: `fit` = w is the LONGEST side, so thin pictures like a vial don't come out huge)
 heart:{w:8,at:'bottom',fit:1},bigheart:{w:12,at:'bottom',fit:1},money:{w:10,at:'bottom',fit:1},potion:{w:11,at:'bottom',fit:1},roast:{w:17,at:'bottom',fit:1},
 dagger:{w:13.7,at:'grip'},axe:{w:14,at:'centre',fit:1},'holy-water':{w:12,at:'bottom',fit:1},cross:{w:14,at:'centre',fit:1},
 'leap-stone':{w:14,at:'bottom',fit:1},'blood-orb':{w:16,at:'bottom',fit:1},bone:{w:11,at:'centre',fit:1},
 // the moonlit approach (outside): sky, moon, the castle on its crag, two repeating strips, a fog strip
 'forest-sky':{at:'cover'},moon:{w:120,at:'centre'},'castle-far':{w:360,at:'bottom'},
 'forest-far':{w:400,h:240,at:'tile'},'forest-near':{w:320,h:240,at:'tile'},fog:{w:512,h:60,at:'tile'},
 tree:{w:120,at:'bottom'},fence:{w:32,h:40,at:'tile'},grave:{w:16,at:'bottom'},bridge:{w:32,h:48,at:'tile'},
 'gate-wall':{w:64,h:200,at:'tile'},gate:{w:34,at:'bottom'},portcullis:{w:22,at:'stretch'},
 // the room walls behind everything (wide repeating strips, the view's full height; they scroll a little slower)
 'hall-back':{w:256,h:240,at:'tile'},'cave-back':{w:256,h:240,at:'tile'},'gallery-back':{w:256,h:240,at:'tile'},'throne-back':{w:256,h:240,at:'tile'},
 // floors: the top edge is the walking surface; the game follows slopes and repeats the lower half downward
 'forest-ground':{w:64,h:80,at:'tile'},'gate-ground':{w:64,h:80,at:'tile'},'hall-ground':{w:64,h:80,at:'tile'},'cave-ground':{w:64,h:80,at:'tile'},
 'gallery-ground':{w:64,h:80,at:'tile'},'throne-ground':{w:64,h:80,at:'tile'},
 balcony:{w:32,h:24,at:'tile'},'stepping-stone':{w:40,at:'stretch'},'crack-wall':{w:16,at:'stretch'},bars:{w:16,at:'stretch'},'water':{w:32,h:12,at:'tile'},
 // props in the rooms
 window:{w:34,at:'top'},pillar:{w:20,at:'stretch'},banner:{w:16,at:'top'},statue:{w:34,at:'bottom'},altar:{w:24,at:'bottom'},
 stalactite:{w:16,at:'top'},'rock-pillar':{w:22,at:'stretch'},arch:{w:80,at:'stretch'},'stained-glass':{w:70,at:'top'},
 throne:{w:42,at:'bottom'},carpet:{w:32,h:4,at:'tile'},
};

let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const imgs=new Map();
// pictures that fall back to art made for another slot: the title logo is the Arcade logo unless sotn:logo is in
const ALIAS={logo:'keyart:castlevania-logo'};
// The loaded picture for 'sotn:<name>', or null (missing, or still loading: the caller draws its fallback meanwhile).
function picture(name){
 const url=USER['sotn:'+name]||(ALIAS[name]&&USER[ALIAS[name]]);if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(name,e);}
 return e.ok?e.img:null;
}
const has=name=>!!(USER['sotn:'+name]||(ALIAS[name]&&USER[ALIAS[name]]));
// {img,def,name} for an animated sheet that is in, else null
function sheet(name){const def=SHEETS[name],img=def&&picture(name);return img?{img,def,name}:null;}
const rowCount=(def,row)=>def.rows[row]||0;
// Frame rectangle for `row`: a fixed index, progress k 0..1 through the row (held at the end), or time t looping at fps.
function frameOf(def,row,{t=0,fps=8,k=null,index=null}={}){
 const rows=Object.keys(def.rows);let r=rows.indexOf(row);if(r<0)r=0;const n=def.rows[rows[r]]||1;
 let f=index!=null?index:k!=null?Math.floor(k*n):Math.floor(t*fps);
 f=index!=null||k!=null?Math.min(n-1,Math.max(0,f)):((f%n)+n)%n;
 return {sx:f*def.frame[0],sy:r*def.frame[1],w:def.frame[0],h:def.frame[1],f,row:rows[r],n};
}
// The face spot of frame fr: {x,y,size,rot} in world units relative to the anchor (facing right).
function headOf(def,fr){if(!def.head)return null;let h=def.headRows&&def.headRows[fr.row];if(h&&Array.isArray(h[0]))h=h[Math.min(fr.f,h.length-1)];h=h||def.head;
 return {x:(h[0]-def.foot[0])*S,y:(h[1]-def.foot[1])*S,size:def.headSize*S,rot:h[2]||0};}
// Draws a frame with its anchor at (x,y), facing f (1 right, -1 left). `tint` = a colour: the frame's silhouette in it
// (after-images and ghosts). `scale` multiplies the size.
const tints=new Map();
function tinted(sh,fr,col){const key=sh.name+'|'+fr.sx+','+fr.sy+'|'+col;let c=tints.get(key);if(c)return c;
 c=document.createElement('canvas');c.width=fr.w;c.height=fr.h;const q=c.getContext('2d');q.drawImage(sh.img,fr.sx,fr.sy,fr.w,fr.h,0,0,fr.w,fr.h);
 q.globalCompositeOperation='source-in';q.fillStyle=col;q.fillRect(0,0,fr.w,fr.h);if(tints.size>400)tints.clear();tints.set(key,c);return c;}
function drawFrame(g,sh,fr,x,y,f=1,{tint=null,scale=1}={}){const d=sh.def,k=S*scale;g.save();g.translate(x,y);g.scale((f<0?-1:1)*k,k);
 const prev=g.imageSmoothingEnabled;g.imageSmoothingEnabled=false;
 if(tint)g.drawImage(tinted(sh,fr,tint),-d.foot[0],-d.foot[1],fr.w,fr.h);else g.drawImage(sh.img,fr.sx,fr.sy,fr.w,fr.h,-d.foot[0],-d.foot[1],fr.w,fr.h);
 g.imageSmoothingEnabled=prev;g.restore();}
// world size {w,h} of a picture drawn at its spec'd width (or S per px when no width is set)
function sizeOf(name,img){const p=PICTURES[name]||{};if(p.fit&&p.w){const k=p.w/Math.max(img.width,img.height);return {w:img.width*k,h:img.height*k};}const w=p.w||img.width*S;return {w,h:w*img.height/img.width};}
// Draws a picture by its spec: bottom-centre / centre / top-centre on (x,y), scaled by sc, turned by rot, mirrored by f.
function drawPicture(g,name,x,y,{sc=1,rot=0,f=1,at=null,alpha=1}={}){const img=picture(name);if(!img)return false;const {w,h}=sizeOf(name,img),W=w*sc,H=h*sc,a=at||(PICTURES[name]||{}).at;
 g.save();g.translate(x,y);if(rot)g.rotate(rot);if(f<0)g.scale(-1,1);if(alpha<1)g.globalAlpha*=alpha;
 g.drawImage(img,-W/2,a==='bottom'?-H:a==='top'?0:-H/2,W,H);g.restore();return true;}
// A picture stretched into a box (world units).
function drawBox(g,name,x0,y0,x1,y1){const img=picture(name);if(!img)return false;g.drawImage(img,x0,y0,x1-x0,y1-y0);return true;}
// A repeating strip: tiles of `w` x `h` units from x0 to x1 (world), top at y. `follow` = how much it moves with the camera
// (0 = fixed to the world like the floor, .97 = far away, nearly still on screen). Returns false when the picture isn't in.
function drawStrip(g,name,x0,x1,y,{camX=0,follow=0,w=null,h=null,alpha=1}={}){const img=picture(name);if(!img)return false;const p=PICTURES[name]||{};
 const tw=w||p.w||img.width*S,th=h||p.h||tw*img.height/img.width,base=camX*follow;let sx=x0-((((x0-base)%tw)+tw)%tw);
 const pa=g.globalAlpha;g.globalAlpha=pa*alpha;for(;sx<x1;sx+=tw)g.drawImage(img,sx,y,tw+.05,th);g.globalAlpha=pa;return true;}
function preloadSotn(){for(const k of Object.keys(USER))if(k.startsWith('sotn:'))picture(k.slice(5));}
Object.assign(exports,{S,SHEETS,PICTURES,picture,sheet,has,frameOf,headOf,drawFrame,drawPicture,drawBox,drawStrip,sizeOf,rowCount,preloadSotn});
