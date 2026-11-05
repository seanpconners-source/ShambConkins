// Drop-in sprite sheets for MAJOR LEAGUE BASEBALL and the HOME RUN DERBY (src/engines/griffeyBall.js, drawn by
// src/engines/griffeyArt.js). The owner's own art goes in assets/baseball/<name>.png|webp (tools/build.mjs →
// USER_PORTRAITS['baseball:<name>']); any sheet that isn't there falls back to the drawn players, so they can arrive one at
// a time. Full spec with a template picture per sheet: docs/baseball-sprites/README.md (templates: node tools/baseball-templates.mjs).
// Layout of every animated sheet: one ROW per animation, in the order listed in `rows`, frames left to right, all frames the
// same size (`frame` [w,h] px), transparent background, no gaps. `foot` = the pixel that stands on the ground. `tall` = how
// many pixels the player is from the soles to the top of the head (the game scales the sprite so the player is the right
// height on screen). Players wear the character's face: those sheets are drawn WITHOUT a head (bare neck), and the game puts
// the face at `head` (centre, frame px) at `headSize` px across; the batting helmet / cap is drawn over it by the game unless
// the `helmet-p1|p2` / `cap-p1|p2` pictures are in. p1 = the red team (player 1), p2 = the blue team (player 2).
const SHEETS={
 // the batter at the plate, batting view: seen from behind the catcher, a right-handed batter on the LEFT of the plate
 // facing RIGHT (toward the plate). stance = waiting (a small bat waggle), swing = start of the swing .. follow-through.
 'batter-p1':{frame:[168,172],foot:[72,171],tall:150,head:[74,61],headSize:54,rows:{stance:4,swing:6},
  // sweet = the bat's sweet spot at contact (swing frames 3-4, bat level, pointing at the plate): the game stands the batter
  // so this point crosses the zone where the swing is judged. Bat length ~64 px (a real bat is ~.45 of the player's height).
  // templates only: in the stance the hands are up by the REAR shoulder (the one on the left of the picture, away from the
  // plate) and the bat rests up and back over that shoulder, clear of the face circle (yellow ring = hands, line = bat)
  sweet:[142,97],guides:{stance:{hands:[46,59],tip:[10,6]}}},
 'batter-p2':null,
 // the pitcher on the mound, batting view: facing the camera (the batter). windup = leg kick, throw = release + follow-through.
 'pitcher-p1':{frame:[96,128],foot:[48,127],tall:118,head:[48,30],headSize:40,rows:{idle:2,windup:4,throw:4}},
 'pitcher-p2':null,
 // a fielder or base runner in the field view (a high camera behind home plate), facing RIGHT (the game mirrors it).
 // Also used big on the innings menu, so draw it at full size. throw = a fielder's throw (3 frames).
 'fielder-p1':{frame:[96,128],foot:[48,127],tall:118,head:[48,30],headSize:40,rows:{stand:2,run:6,throw:3}},
 'fielder-p2':null,
 // the catcher crouched behind the plate, seen from BEHIND (back of the mask and chest protector; no face slot).
 'catcher-p1':{frame:[96,96],foot:[48,95],tall:84,rows:{idle:2,catch:2}},
 'catcher-p2':null,
 // the umpire behind the catcher, seen from behind. call = the strike-three punch-out.
 umpire:{frame:[96,128],foot:[48,127],tall:120,rows:{idle:2,call:3}},
};
for(const k of ['batter','pitcher','fielder','catcher'])SHEETS[k+'-p2']=SHEETS[k+'-p1'];
// Single pictures (any size unless noted, transparent background).
//  ball: the baseball (drawn centred at the ball's size; 64x64 is plenty).
//  helmet-p1|p2: the batting helmet seen from behind the catcher, ear flap on the RIGHT (pitcher's side); drawn over the
//   batter's face, its bottom edge at the brow line, width = 1.0 x headSize. cap-p1|p2: a ball cap, the same way, for pitchers
//   and fielders.
//  stadium: the batting-view backdrop above the outfield wall (sky, stands, crowd, scoreboard, light towers), stretched to
//   cover the top of the screen; ~1600x700, keep the important bits in the middle 60%. wall: the outfield wall with its ads,
//   a wide strip (~1600x80) stretched across the screen.
//  logo: the MAJOR LEAGUE BASEBALL title (innings menu), derby-logo: the HOME RUN DERBY title; wide, ~1200x400.
const PICTURES={ball:{},'helmet-p1':{},'helmet-p2':{},'cap-p1':{},'cap-p2':{},stadium:{},wall:{},logo:{},'derby-logo':{}};

let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const imgs=new Map();
// The loaded picture for 'baseball:<name>', or null (missing, or still loading: the caller draws its fallback meanwhile).
function picture(name){
 const url=USER['baseball:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(name,e);}
 return e.ok?e.img:null;
}
const has=name=>!!USER['baseball:'+name];
// {img, def} for an animated sheet that is in, else null
function sheet(name){const def=SHEETS[name],img=def&&picture(name);return img?{img,def}:null;}
// Frame rectangle for row `row`: a fixed index, or progress k 0..1 through the row, or time t looping at fps.
function frameOf(def,row,{t=0,fps=8,k=null,index=null}={}){
 const rows=Object.keys(def.rows),r=Math.max(0,rows.indexOf(row)),n=def.rows[rows[r]]||1;
 const f=index!=null?Math.min(n-1,Math.max(0,index)):k!=null?Math.min(n-1,Math.max(0,Math.floor(k*n))):Math.floor(t*fps)%n;
 return {sx:f*def.frame[0],sy:r*def.frame[1],w:def.frame[0],h:def.frame[1],f};
}
function preloadBaseball(){for(const k of Object.keys(USER))if(k.startsWith('baseball:'))picture(k.slice(9));}
Object.assign(exports,{SHEETS,PICTURES,picture,sheet,frameOf,has,preloadBaseball});
