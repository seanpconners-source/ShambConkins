// Drop-in art for Sitabout Mini Golf (src/engines/puttPutt.js + src/engines/minigolf/). The owner's pictures go in
// assets/minigolf/<name>.png|webp (tools/build.mjs → USER_PORTRAITS['minigolf:<name>']); a slot that isn't there keeps the
// game's drawn art, so pictures can arrive one at a time. Templates: node tools/minigolf-templates.mjs →
// docs/minigolf-sprites/templates; brief docs/minigolf-sprites/GPT-SPRITE-BRIEF.md. Any picture may come at 2x (same
// proportions). Our own drawings only: no logos or frames from the films, no real brands.
//
// The view is a tilted top-down 3/4 view (like Golf Battle / Mini Golf King). Three kinds of pictures:
//  kind 'tile'  seamless SQUARE textures seen straight from above (the game lays them flat on the ground and repeats them;
//               `world` = how many course units one tile covers; the ball is 2 units across).
//  kind 'strip' seamless HORIZONTAL strips (repeat left to right): the rail's side face and top.
//  kind 'prop'  a thing standing up (tree, sign, windmill), drawn upright facing the camera, transparent around it.
//               `foot` = [x,y] px of the point that touches the ground (bottom middle), `w` = its width in course units.
//  kind 'flat'  a thing lying on the ground seen from above (bumper, tunnel mouth, boost pad, gator), transparent around
//               it; `w` = width in course units; drawn centred on its spot (the game squashes it into the tilt).
//  kind 'sheet' frames left to right (frame = [w,h]) for animated props, else like 'prop'/'flat'.
//  kind 'pic'   a screen picture (logo, title backdrop, scorecard paper).
const {USER_PORTRAITS:USER}=require("src/data/userPortraits.js");
const C3=['bushwood','gilmore','spaceballs'];
const PICTURES={
 // ground per course
 ...Object.fromEntries(C3.flatMap(c=>[
  [`${c}-turf`,{kind:'tile',size:[512,512],world:24,note:`${c} putting surface (carpet/felt), seen from above, subtle mowing stripes optional`}],
  [`${c}-lawn`,{kind:'tile',size:[512,512],world:40,note:c==='spaceballs'?'outer space floor around the course: dark rock/metal deck with glowing seams (seen from above)':`the ground around the course (${c==='bushwood'?'country club lawn and paths':'kitschy putt-putt park lawn with gravel'})`}],
  [`${c}-rail`,{kind:'strip',size:[512,64],note:`rail SIDE face (${c==='bushwood'?'varnished wood plank':c==='gilmore'?'painted red/white bricks':'chrome panel with blue lights'}); the game draws it on every wall`}],
  [`${c}-railtop`,{kind:'strip',size:[512,32],note:'rail TOP seen from above (a thin strip, same material, lighter)'}],
  [`${c}-cliff`,{kind:'strip',size:[512,128],note:'the side of a raised green/platform (stone, wood or metal skirt under the turf)'}],
 ])),
 sand:{kind:'tile',size:[512,512],world:24,note:'bunker sand from above, raked'},
 water:{kind:'tile',size:[512,512],world:32,note:'pond water from above (the game adds moving ripples)'},
 'water-space':{kind:'tile',size:[512,512],world:32,note:'Spaceballs liquid: glowing purple plasma from above'},
 ice:{kind:'tile',size:[512,512],world:24,note:'slick ice from above'},
 carpet:{kind:'tile',size:[512,512],world:20,note:'a bright rainbow / red carpet runner from above (Happy Place bridge, Spaceballs paths)'},
 boost:{kind:'flat',size:[256,256],w:14,note:'Ludicrous Speed boost pad: glowing chevrons pointing UP the picture'},
 // things on the green
 flag:{kind:'prop',size:[160,512],foot:[40,500],w:3.4,note:'flagstick with a waving flag (pin at x 40, bottom at y 500)'},
 cup:{kind:'flat',size:[128,128],w:5.6,note:'the cup seen from above: dark hole with a white liner rim'},
 ball:{kind:'flat',size:[256,256],w:2,note:'a white golf ball seen from above, dimples, soft shading; leave the middle plain (the player\'s face is printed there)'},
 'lost-ball':{kind:'flat',size:[128,128],w:3,note:'a lost golf ball collectible (old, scuffed, sparkly), Walkabout style'},
 bumper:{kind:'flat',size:[256,256],w:7,note:'pinball mushroom bumper from above (round, chrome ring)'},
 tunnel:{kind:'flat',size:[256,256],w:7,note:'a pipe / tunnel mouth from above (dark hole)'},
 portal:{kind:'flat',size:[256,256],w:7,note:'Spaceballs Schwartz portal ring from above (glowing)'},
 tramp:{kind:'flat',size:[256,256],w:7,note:'trampoline from above (round, springy)'},
 gopher:{kind:'sheet',size:[768,256],frame:[256,256],w:5,foot:[128,236],note:'the gopher popping out of its hole: 3 frames (head peeking, half out, fully up and grinning)'},
 'gopher-hole':{kind:'flat',size:[128,128],w:4,note:'a gopher hole from above (dirt ring, dark middle)'},
 gator:{kind:'sheet',size:[1024,256],frame:[512,256],w:16,note:'alligator swimming, seen from above, head to the RIGHT: 2 frames (tail left / tail right)'},
 spinner:{kind:'flat',size:[512,96],w:22,note:'a spinning bar seen from above, pivot in the middle'},
 slider:{kind:'flat',size:[256,96],w:16,note:'a sliding block seen from above (wood or metal crate, long side left-right)'},
 magnet:{kind:'prop',size:[512,512],foot:[256,500],w:18,note:'Mega Maid\'s giant vacuum nozzle standing over the black hole'},
 'black-hole':{kind:'flat',size:[256,256],w:14,note:'a swirling black hole on the floor (seen from above)'},
 conveyor:{kind:'tile',size:[256,256],world:12,note:'conveyor belt from above, ridges across, moving UP the picture'},
 'windmill-house':{kind:'prop',size:[640,640],foot:[320,630],w:28,door:[[272,630],[368,630]],note:'Dutch windmill house seen from the front; the DOOR opening at the bottom middle between x 272 and 368 stays open (the ball rolls through)'},
 'windmill-blades':{kind:'prop',size:[640,640],hub:[320,320],w:34,note:'the four windmill sails, hub in the middle (the game spins this picture)'},
 'clown-head':{kind:'prop',size:[640,520],foot:[320,510],w:24,mouth:[[262,510],[378,510]],note:'a giant mini-golf clown head seen from the front; the MOUTH opening at the bottom middle (x 262-378) stays open (the ball rolls in)'},
 'clown-teeth':{kind:'prop',size:[256,96],foot:[128,92],w:9.5,note:'the clown\'s teeth / jaw bar that opens and shuts the mouth'},
 // scenery
 oak:{kind:'prop',size:[512,640],foot:[256,620],w:20,note:'a big leafy oak (country club)'},
 pine:{kind:'prop',size:[384,640],foot:[192,620],w:14,note:'a pine tree'},
 bush:{kind:'prop',size:[384,256],foot:[192,240],w:10,note:'a round trimmed bush'},
 flowers:{kind:'prop',size:[384,192],foot:[192,180],w:10,note:'a flower bed'},
 cart:{kind:'prop',size:[512,384],foot:[256,370],w:14,note:'a golf cart (no brand)'},
 sign:{kind:'prop',size:[384,384],foot:[192,370],w:10,note:'a wooden sign on two posts, BLANK board (the game writes the hole name on it)'},
 palm:{kind:'prop',size:[384,640],foot:[192,620],w:16,note:'a putt-putt park palm tree'},
 castle:{kind:'prop',size:[512,512],foot:[256,500],w:18,note:'a kitschy fibreglass putt-putt castle'},
 hockey:{kind:'prop',size:[512,384],foot:[256,370],w:16,note:'a hockey net with a stick leaning on it (Happy Gilmore was a hockey player)'},
 cloud:{kind:'prop',size:[512,320],foot:[256,300],w:20,note:'a fluffy dream cloud (Happy Place)'},
 rock:{kind:'prop',size:[384,256],foot:[192,240],w:10,note:'a space rock / asteroid'},
 crystal:{kind:'prop',size:[256,384],foot:[128,370],w:7,note:'glowing space crystals'},
 beacon:{kind:'prop',size:[256,512],foot:[128,500],w:6,note:'a blinking space beacon on a pole'},
 dish:{kind:'prop',size:[384,384],foot:[192,370],w:12,note:'a satellite dish'},
 // screens
 logo:{kind:'pic',size:[1200,520],note:'SITABOUT MINI GOLF title lettering, transparent'},
 'title-bg':{kind:'pic',size:[1920,1080],note:'title screen backdrop: a sunny mini golf park at golden hour, lots of sky in the middle for the logo'},
 scorecard:{kind:'pic',size:[1024,640],note:'a paper scorecard texture (cream paper, faint pencil lines, a little coffee ring); the game writes the scores on it'},
 ...Object.fromEntries(C3.map(c=>[`${c}-card`,{kind:'pic',size:[960,540],note:`course picture for the course picker (${c==='bushwood'?'Bushwood Country Club: clubhouse, oaks, a gopher':c==='gilmore'?'Waterbury Putt-Putt: clown head, windmill, palm trees, an alligator pond':'Spaceball City Links: mini golf on a space station, planets and stars'})`}])),
};
const url=name=>USER['minigolf:'+name]||null;
const has=name=>!!url(name);
const imgs=new Map();
function picture(name){
 const u=url(name);if(!u||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=u;imgs.set(name,e);}
 return e.ok?e.img:null;
}
function preloadMinigolf(){for(const k of Object.keys(USER))if(k.startsWith('minigolf:'))picture(k.slice(9));}
Object.assign(exports,{PICTURES,has,url,picture,preloadMinigolf});
