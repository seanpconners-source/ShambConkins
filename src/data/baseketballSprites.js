// Drop-in art for BASEketball (src/engines/baseketball.js: the movie rules game `baseketball-shootout` and the Hoop Jones
// mode `baseketball-hoop-jones`). The owner's own pictures go in assets/baseketball/<name>.png|webp (tools/build.mjs →
// USER_PORTRAITS['baseketball:<name>']); a slot that isn't there keeps the game's drawn art, so pictures can arrive one at a
// time. Templates: node tools/baseketball-templates.mjs → docs/baseketball-sprites/templates; brief GPT-SPRITE-BRIEF.md.
// Any picture may come at 2x its template size (same proportions). LOOK (owner, Nov 14): the stadium from the movie
// BASEketball (1998): a big open-air pro stadium at night, light towers, packed stands, outfield-style wall of ads, a huge
// jumbo scoreboard, a hardwood court in the middle with the base spots painted on. Our own drawings: no logos or frames
// from the film, no real brands (make up joke sponsors).
const {USER_PORTRAITS:USER}=require("src/data/userPortraits.js");

// SHEETS: one ROW per animation in the order of `rows`, frames left to right, every frame `frame` [w,h] px, transparent.
//  shooter-p1 / -p2: the shooter seen FROM BEHIND (over the shoulder, like a bar-top basketball machine): head, shoulders,
//   jersey back, arms; the body is cut off at the bottom edge of the frame. p1 = home team (Milwaukee Beers style: green and
//   gold), p2 = visitors (orange and black). `ball` = where the ball sits in the ready pose (the game draws the ball there).
//   ready (holding the ball up, 2 frames of breathing), shoot (release, 4 frames, arms extend up and forward), cheer (fists up),
//   slump (head down). The back of the jersey has a blank name bar and number area: the game writes the player's name there.
//   `nameBar` = [x,y,w,h] of that blank bar in each frame.
const SHEETS={
 'shooter-p1':{frame:[320,420],rows:{ready:2,shoot:4,cheer:2,slump:2},ball:[160,70],nameBar:[96,250,128,34],p:0},
 'shooter-p2':{frame:[320,420],rows:{ready:2,shoot:4,cheer:2,slump:2},ball:[160,70],nameBar:[96,250,128,34],p:1},
 // net: the net hanging under the rim, seen from the front; top edge = the rim's width (rim ends at x 20 and 236). Frames:
 // rest, then a swish ripple (3 frames).
 net:{frame:[256,200],rows:{rest:1,swish:3},rim:[20,236]},
};
// PICTURES: stills. `size` = template [w,h] px.
//  stadium: the whole stadium behind the court, a wide panorama (the game slides it sideways as the shooting spot changes and
//   cover-fits it). `horizon` = the y where the court's far edge meets the stands (the game lines the floor up there).
//  stadium-hoop: the Hoop Jones mode backdrop (a flashier arcade arena / bar-machine look), same layout.
//  backboard: the glass/white backboard seen straight on with the target box and the rim bracket; `rim` = [x,y] of the rim's
//   centre-front attachment point (the game draws the rim and net there). Transparent outside the board.
//  pole: the stanchion under the board (front view), top centre attaches to the board's bottom middle.
//  ball: the basketball, 256x256 (spun by the game).
//  jumbotron: the giant scoreboard frame (bulbs, steel, team colours) with a BLACK screen inside `screen` [x,y,w,h]: the game
//   draws the line score, outs, bases and the batter's face in it.
//  psych-burst: a comic 'POW' burst behind the psych-out line (transparent around it).
//  court-logo: a centre-court logo painted on the floor (seen straight down; the game lays it flat), transparent around it.
//  logo / logo-hoop: the game's title lettering for each mode, transparent.
const PICTURES={
 stadium:{kind:'bg',size:[2400,1200],horizon:780},
 'stadium-hoop':{kind:'bg',size:[2400,1200],horizon:780},
 backboard:{kind:'board',size:[600,420],rim:[300,380]},
 pole:{kind:'pole',size:[120,600]},
 ball:{kind:'ball',size:[256,256]},
 jumbotron:{kind:'jumbo',size:[1600,560],screen:[80,70,1440,420]},
 'psych-burst':{kind:'fx',size:[1000,700]},
 'court-logo':{kind:'decal',size:[800,800]},
 logo:{kind:'logo',size:[1200,480]},
 'logo-hoop':{kind:'logo',size:[1200,480]},
};
const url=name=>USER['baseketball:'+name]||null;
const has=name=>!!url(name);
const imgs=new Map();
function picture(name){
 const u=url(name);if(!u||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=u;imgs.set(name,e);}
 return e.ok?e.img:null;
}
function preloadBaseketball(){for(const k of Object.keys(USER))if(k.startsWith('baseketball:'))picture(k.slice(12));}
function sheet(name){const def=SHEETS[name],img=def&&picture(name);if(!img)return null;const cols=Math.max(...Object.values(def.rows));return {img,def,k:img.width/(cols*def.frame[0])};}
function frameRect(sh,row,f){
 const d=sh.def,names=Object.keys(d.rows),r=Math.max(0,names.indexOf(row)),n=d.rows[names[r]]||1,i=((f%n)+n)%n;
 return {sx:i*d.frame[0]*sh.k,sy:r*d.frame[1]*sh.k,sw:d.frame[0]*sh.k,sh:d.frame[1]*sh.k};
}
Object.assign(exports,{SHEETS,PICTURES,has,url,picture,preloadBaseketball,sheet,frameRect});
