// Drop-in sprites and stage art for the Sonic 3 style game (src/engines/sonic3.js, drawn by src/engines/s3/render.js).
// The owner's own art goes in assets/sonic3/<name>.png|webp (tools/build.mjs → USER_PORTRAITS['s3:<name>']). Every slot
// is optional: whatever is missing keeps the game's drawn stand-in art, so the art can arrive one sheet at a time.
// Brief for Grok: docs/sonic3-sprites/GROK-SPRITE-BRIEF.md; technical page: docs/sonic3-sprites/README.md; templates
// (grid, ground points, face circles and a faint pose guide in every frame): node tools/sonic3-templates.mjs.
// The designs are our own (a tribute in feel, not copies of anyone's characters): a blue-purple hedgehog and a
// red-orange fox with three tails, both headless bodies that wear the player's face.
//
// SCALE: 1 sprite pixel = 1 world pixel (the Mega Drive's own size: the view is 224 px tall; a runner stands ~52 px
// with the face on). Art may be drawn bigger (Grok): it is scaled down to these sizes on import.
// Animated SHEETS: one ROW per animation in the order of `rows`, frames left to right, every frame `frame` [w,h] px,
// transparent background, facing RIGHT (the game mirrors them), no gaps. `foot` = the pixel that sits on the object's
// position (runners and walkers: the ground point; balls, flyers, shots, effects: the centre). `head` = the centre of the
// face circle in frame px ([x,y] or [x,y,turn in radians]), `headSize` px across; `headRows` moves it for a row (one spot,
// or a list with one spot per frame).
const TAU=Math.PI*2;
const RF=[32,58],RH=[35,22];
const SHEETS={
 // the runners: player 1 = the blue-purple hedgehog, player 2 = the red-orange three-tailed fox (our own designs)
 'runner-p1':{frame:[64,64],foot:RF,head:RH,headSize:30,
  rows:{stand:1,wait:4,lookUp:2,crouch:2,walk:8,run:8,dash:4,skid:3,push:4,balance:3,spring:2,fall:2,hurt:2,hang:4,win:4,dead:2},
  headRows:{lookUp:[[35,21],[34,19]],crouch:[[36,30],[37,36]],run:[38,23],dash:[40,24],skid:[30,23],push:[38,24],balance:[[36,23],[39,25],[36,23]],
   spring:[32,20],fall:[33,21],hurt:[[28,24],[26,26]],hang:[32,26],win:[[35,22],[34,20],[33,19],[34,20]],dead:[[32,26],[32,30]]},
  note:'headless hedgehog body; the head quills are the separate picture quills-p1'},
 // player 2: the three-tailed fox: the same rows plus flying (tails whirling overhead-behind) and tired (sinking)
 'runner-p2':{frame:[64,64],foot:RF,head:RH,headSize:30,
  rows:{stand:1,wait:4,lookUp:2,crouch:2,walk:8,run:8,dash:4,skid:3,push:4,balance:3,spring:2,fall:2,hurt:2,hang:4,win:4,dead:2,fly:4,tired:2},
  headRows:{lookUp:[[35,21],[34,19]],crouch:[[36,30],[37,36]],run:[38,23],dash:[40,24],skid:[30,23],push:[38,24],balance:[[36,23],[39,25],[36,23]],
   spring:[32,20],fall:[33,21],hurt:[[28,24],[26,26]],hang:[32,26],win:[[35,22],[34,20],[33,19],[34,20]],dead:[[32,26],[32,30]],fly:[36,24],tired:[36,27]},
  note:'headless fox body with three bushy tails'},
 // curled up: jumping, rolling, spin dash (the face sits in the middle and turns with the ball in `roll`)
 'ball-p1':{frame:[48,48],foot:[24,24],head:[24,24],headSize:21,rows:{roll:8,spindash:6},
  headRows:{roll:Array.from({length:8},(_,f)=>[24,24,+(f/8*TAU).toFixed(2)])}},
 'ball-p2':{same:'ball-p1'},
 // robots (our own designs)
 charger:{frame:[48,40],foot:[24,38],rows:{roll:4,rev:2,charge:4}},
 thrower:{frame:[48,48],foot:[24,24],rows:{idle:2,climb:4,throw:4}},
 shooter:{frame:[48,48],foot:[24,40],rows:{closed:2,open:3,spit:2}},
 flyer:{frame:[48,40],foot:[24,20],rows:{fly:4,dive:2}},
 seed:{frame:[16,16],foot:[8,8],rows:{spin:4}},
 critter:{frame:[24,24],foot:[12,22],rows:{bird:2,rabbit:2,squirrel:2}},
 // bosses: the pilot's face goes in the circle (a locked character)
 miniboss:{frame:[160,96],foot:[80,48],head:[80,36],headSize:26,rows:{hover:2,attack:4,hit:1,wreck:3}},
 boss:{frame:[192,128],foot:[96,64],head:[88,46],headSize:30,rows:{hover:2,attack:4,hit:1,wreck:3}},
 capsule:{frame:[64,72],foot:[32,68],rows:{shut:1,open:3}},
 // level objects
 ring:{frame:[16,16],foot:[8,8],rows:{spin:8,sparkle:4}},
 spring:{frame:[32,32],foot:[16,32],rows:{yellow:3,red:3,yellowDiag:3,redDiag:3},note:'points up (Diag: up-right); the game turns it'},
 monitor:{frame:[32,32],foot:[16,32],rows:{box:2,broken:1}},
 icons:{frame:[16,16],foot:[8,8],rows:{rings:1,shoes:1,star:1,fire:1,bubble:1,lightning:1,shield:1,trap:1}},
 starpost:{frame:[32,64],foot:[16,64],rows:{idle:1,spin:8,lit:2}},
 // the goal sign: only the blank face-on frame is used; the game spins it and puts the winner's face on the disc
 sign:{frame:[48,64],foot:[24,64],head:[24,18],headSize:26,rows:{done:1}},
 shields:{frame:[56,56],foot:[28,28],rows:{plain:4,fire:6,bubble:6,lightning:6,stars:4}},
 fx:{frame:[32,32],foot:[16,16],rows:{pop:5,dust:4,spindust:6,rubble:4}},
 flower:{frame:[24,32],foot:[12,32],rows:{sway:4}},
 waterfall:{frame:[64,82],foot:[0,0],rows:{flow:4},note:'rock sides + falling water + splash; the middle band tiles down'},
};
// the runner cells are wider and taller than the 64x64 the poses were planned in, so dust, tails and flung arms fit:
// same layout moved 16 px right and 16 px down inside a 96x80 cell
for(const n of ['runner-p1','runner-p2']){const d=SHEETS[n],mv=h=>h&&(Array.isArray(h[0])?h.map(mv):[h[0]+16,h[1]+16,...h.slice(2)]);
 d.frame=[96,80];d.foot=[d.foot[0]+16,d.foot[1]+16];d.head=mv(d.head);d.headRows=Object.fromEntries(Object.entries(d.headRows).map(([k,v])=>[k,mv(v)]));}
// One-off pictures: size [w,h] px, `anchor` = the pixel on the object's position. tile 'x' = repeats sideways,
// 'xy' = repeats both ways; opaque = no transparency.
const PICTURES={
 // objects
 spikes:{size:[32,32],anchor:[16,32],note:'four spikes pointing up, repeats sideways',tile:'x'},
 coconut:{size:[16,16],anchor:[8,8]},
 'rock-wall':{size:[32,64],anchor:[16,32],note:'breakable: cracked boulders'},
 platform:{size:[64,32],anchor:[32,8],note:'floating grassy ledge, flat top at the anchor line'},
 'platform-crumble':{size:[96,32],anchor:[48,8],note:'cracked ledge that falls apart'},
 'vine-rope':{size:[16,32],anchor:[8,0],tile:'xy',note:'a length of vine, repeats downwards'},
 'vine-handle':{size:[32,16],anchor:[16,4]},
 'zip-handle':{size:[24,24],anchor:[12,4],note:'pulley wheel on top, grab bar below'},
 'zip-post':{size:[16,48],anchor:[8,4]},
 bridge:{size:[32,16],anchor:[0,0],tile:'x',note:'wooden planks, one-way ledge'},
 // jungle zone terrain (Act 1): the game fills the ground shape with these
 'jungle-soil':{size:[64,64],anchor:[0,0],tile:'xy',opaque:true,note:'earth fill'},
 'jungle-grass':{size:[64,32],anchor:[0,8],tile:'x',note:'grass edge: blades above the anchor line, roots hanging below'},
 'jungle-under':{size:[64,16],anchor:[0,0],tile:'x',note:'underside edge of overhangs'},
 'jungle-rock':{size:[64,64],anchor:[0,0],tile:'xy',opaque:true,note:'stone fill for cliffs and loops'},
 // jungle props
 palm:{size:[96,160],anchor:[48,160]},
 bush:{size:[48,32],anchor:[24,32]},
 totem:{size:[32,64],anchor:[16,64]},
 'tree-trunk':{size:[32,64],anchor:[16,0],tile:'xy',note:'the trunk the thrower robot climbs, repeats downwards'},
 // jungle backdrop, far to near; all repeat sideways
 'jungle-sky':{size:[512,224],anchor:[0,0],tile:'x',opaque:true},
 'jungle-clouds':{size:[512,64],anchor:[0,0],tile:'x'},
 'jungle-sea':{size:[512,48],anchor:[0,0],tile:'x',opaque:true},
 'jungle-island':{size:[512,96],anchor:[0,96],tile:'x',note:'far mountains over the sea'},
 'jungle-far':{size:[512,128],anchor:[0,128],tile:'x',note:'far treetops'},
 'jungle-near':{size:[512,160],anchor:[0,160],tile:'x',note:'near trunks and leaves, darker'},
 // screens
 'title-card':{size:[320,224],anchor:[0,0],note:'zone title card shapes, no words'},
 // head pieces, drawn BEHIND the player's face (centre + size of the face given by `head`); they turn with the head
 'quills-p1':{size:[96,72],anchor:[62,36],head:[62,36,30],note:'the hedgehog: big quills sweeping back from behind the face'},
 'ears-p2':{size:[72,72],anchor:[36,44],head:[36,44,30],note:'the fox: two ears and cheek fur around the face'},
 logo:{size:[1100,520],anchor:[550,260],note:'SEANIC THE HEDGEHOG game logo'},
 // title screen + character select (docs/sonic3-sprites/TITLE-SELECT-BRIEF.md); src/engines/s3/intro.js draws a stand-in
 // for each until it is in. head = [x,y,size] (centre + diameter) of the plain face circle the player's face is drawn over; screen = the monitor's
 // see-through screen [x0,y0,x1,y1]. Owner's art in (Nov 11): every face circle and the screen hole matched the templates;
 // round 2 (Nov 11): full-body pictures (owner's new set; sizes/anchors/face spots measured on the imported files, so they differ from the templates); the title places them by the face
 'title-bg':{size:[1600,900],anchor:[800,450],opaque:true,note:'title screen scene behind the logo: sky, sea, jungle island; the middle kept calm for the logo'},
 'title-hero':{size:[440,608],anchor:[220,602],head:[266,183,146],note:'the hedgehog\'s title pose from behind the logo (waist up shows), wagging a finger / thumbs up'},
 'title-fox':{size:[534,640],anchor:[266,637],head:[217,214,157],note:'the three-tailed fox popping up from behind the logo beside the hedgehog (waist up shows), tails up, a wave'},
 'select-bg':{size:[1600,900],anchor:[800,450],opaque:true,note:'character select backdrop (Data Select style), no words'},
 'select-monitor':{size:[800,640],anchor:[400,320],screen:[96,80,704,470],note:'chunky TV monitor frame; the screen area see-through'},
 'select-hog':{size:[459,640],anchor:[229,637],head:[270,184,143],note:'the hedgehog standing proud, for inside the monitor'},
 'select-fox':{size:[575,640],anchor:[288,637],head:[236,199,142],note:'the fox standing, tails up, for inside the monitor'},
};
// loading: the picture for 's3:<name>' once it is in and decoded, else null (the caller draws its stand-in meanwhile)
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
let MEASURED={};try{MEASURED=require("src/data/sonic3Heads.js").HEADS||{};}catch{}
const imgs=new Map();
function picture(name){const url=USER['s3:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(name,e);}
 return e.ok?e.img:null;}
// {img,def,name,res,cols} for a sheet that is in (res = art pixels per frame pixel: sheets may be drawn bigger)
function sheet(name){const def=sheetOf(name),img=def&&picture(name);if(!img)return null;const cols=Math.max(...Object.values(def.rows));return {img,def,name,cols,res:img.width/(cols*def.frame[0])};}
// where the face goes in a frame: measured on the imported art when there is a measurement, else the template's spot
function spot(name,row,f=0){const m=MEASURED[name]&&MEASURED[name][row];if(m&&m.length){const q=m[Math.min(f,m.length-1)];return {x:q[0],y:q[1],rot:q[2]||0};}return headOf(name,row,f);}
const sheetOf=n=>{const d=SHEETS[n];return d&&d.same?SHEETS[d.same]:d;};
// the face spot of a frame: {x,y,rot} in frame px, or null when the row shows no face
function headOf(name,row,f=0){const d=sheetOf(name);if(!d||!d.head)return null;let h=d.head;
 if(d.headRows&&row in d.headRows){h=d.headRows[row];if(h===null)return null;if(Array.isArray(h[0]))h=h[Math.min(f,h.length-1)];}
 return {x:h[0],y:h[1],rot:h[2]||0};}
// where a frame sits on the sheet: [sx,sy,w,h]
function frameRect(name,row,f=0){const d=sheetOf(name);if(!d)return null;const names=Object.keys(d.rows),r=names.indexOf(row);if(r<0)return null;
 return [Math.min(f,d.rows[row]-1)*d.frame[0],r*d.frame[1],d.frame[0],d.frame[1]];}
Object.assign(exports,{SHEETS,PICTURES,sheetOf,headOf,frameRect,picture,sheet,spot});
