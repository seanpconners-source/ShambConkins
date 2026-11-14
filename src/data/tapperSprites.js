// Drop-in art for BANANA STAND TAPPER (src/engines/bananaTapper.js, game id banana-money-grab). The owner's own original art
// goes in assets/tapper/<name>.png|webp (tools/build.mjs → USER_PORTRAITS['tapper:<name>']); a slot that isn't there keeps the
// game's drawn art, so pictures can arrive one at a time. Spec + brief: docs/tapper-sprites/README.md and GPT-SPRITE-BRIEF.md
// (templates: node tools/tapper-templates.mjs). Any picture may come at 2x or 4x its template size (same proportions).
// LOOK (owner, Nov 14): "extremely similar to Arrested Development": clean WHITE backgrounds, plain bold sans-serif lettering,
// the show's colours (Bluth banana yellow, the stand's blue and white stripes, warm Orange County beige). Our own drawings,
// not frames or logos from the show.
const {USER_PORTRAITS:USER}=require("src/data/userPortraits.js");

// LEVELS: one bar per level, played in this order, then round again (each level longer and faster: bananaTapper quotaFor/diff). `item` slides down the bar, the customer eats
// or drinks it and slides `empty` back. `ink` = the drawn fallback's colours.
const LEVELS=[
 {id:'stand',title:'Bluth’s Original Frozen Banana',sub:'The banana stand, Newport Beach boardwalk',item:'Frozen banana',empty:'Banana stick',
  ink:{wall:'#ffffff',trim:'#2f6fd8',floor:'#efe6d2',plank:'#e2d5b8',top:'#ffd84a',topEdge:'#d9a91c',front:'#2f6fd8',front2:'#ffffff',tap:'#ffd84a'}},
 {id:'penthouse',title:'Balboa Towers',sub:'The penthouse wet bar',item:'Vodka martini',empty:'Empty glass',
  ink:{wall:'#ffffff',trim:'#9aa3ad',floor:'#f4f4f2',plank:'#dcdcd8',top:'#26292d',topEdge:'#0f1113',front:'#e9e9e6',front2:'#cfd2d6',tap:'#b9c2cc'}},
 {id:'modelhome',title:'Sudden Valley',sub:'The model home kitchen',item:'Hot ham water',empty:'Empty mug',
  ink:{wall:'#ffffff',trim:'#c9a46c',floor:'#e4d3b3',plank:'#d4bf98',top:'#cfa66a',topEdge:'#a57c43',front:'#f3ead9',front2:'#e4d6bd',tap:'#cfa66a'}},
];
const LEVEL_IDS=LEVELS.map(l=>l.id);

// SHEETS: one ROW per animation in the order of `rows`, frames left to right, every frame `frame` [w,h] px, transparent.
// People are drawn WITHOUT a head, seen from the front, standing BEHIND a bar (the game hides everything under the bar top,
// so legs are optional): the player's or the customer's face goes in the `head` circle ([x,y,diameter]); `bar` = the
// template y where the bar top cuts the body (nothing below it shows).
//  bartender-p1 / -p2: the player at the tap end. idle, pour (filling the next item), serve (slides it: arm out to the
//   LEFT, down the bar), run (hurrying to another bar), catch (grabs a returning empty), lose (arms up, a life lost).
//   p1 = Bluth Banana Stand uniform in yellow/blue, p2 = the same uniform in another colour (red/white).
//  customer-1..-4: the customers (each picks one at random; the face is any character from the game). walk (shuffling
//   RIGHT toward the bartender), push (shoved back to the LEFT, holding the item), eat (eating/drinking it), angry (reached
//   the end of the bar: banging the counter). Different outfits: Orange County casual, business suit, beach, cardigan.
const BODY={frame:[160,200],head:[80,50],headSize:68,bar:150};
const SHEETS={
 'bartender-p1':{...BODY,rows:{idle:2,pour:3,serve:2,run:4,catch:2,lose:2},who:'bartender',p:0},
 'bartender-p2':{...BODY,rows:{idle:2,pour:3,serve:2,run:4,catch:2,lose:2},who:'bartender',p:1},
 'customer-1':{...BODY,rows:{walk:4,push:2,eat:2,angry:2},who:'customer',v:0},
 'customer-2':{...BODY,rows:{walk:4,push:2,eat:2,angry:2},who:'customer',v:1},
 'customer-3':{...BODY,rows:{walk:4,push:2,eat:2,angry:2},who:'customer',v:2},
 'customer-4':{...BODY,rows:{walk:4,push:2,eat:2,angry:2},who:'customer',v:3},
};
// PICTURES: stills. `size` = template [w,h] px.
//  bg-<level> / bg-<level>-wide: the room behind the bars on tall (phone upright) / wide screens, cover-fitted; keep the
//   middle 60% calm (the bars and people sit over it), the interesting stuff along the top and edges. WHITE walls.
//  floor-<level>: seamless tile repeated on the floor between the bars (seen from slightly above).
//  bar-<level>: the bar counter seen from the front, a little from above: top surface in the top 30%, front panel below.
//   Repeats LEFT↔RIGHT seamlessly (the game tiles it along the bar).
//  tap-<level>: what the bartender serves from at the right end of each bar (banana freezer / martini shaker station /
//   ham-water pot on a hot plate), standing on the floor, bar top height at `bar` px.
//  door-<level>: where customers come in at the left end (stand: beach railing gap with a sign post, penthouse: the elevator,
//   model home: the unfinished front door).
//  item-<level> / empty-<level>: the served thing sliding along the bar (side view, sitting on its bottom edge) and the empty
//   that comes back.
//  cash: a tip on the bar ("there's always money in the banana stand"): a little stack of bills.
//  card-<level>: optional level title card (16:9) shown as the level starts; white with plain lettering works best.
//  logo: the game's title lettering, transparent.
const PICTURES={
 cash:{kind:'cash',size:[128,80]},
 logo:{kind:'logo',size:[1200,480]},
};
for(const l of LEVELS){
 PICTURES['bg-'+l.id]={kind:'bg',level:l.id,size:[1080,1920]};
 PICTURES['bg-'+l.id+'-wide']={kind:'bg',level:l.id,wide:true,size:[1920,1080]};
 PICTURES['floor-'+l.id]={kind:'floor',level:l.id,size:[512,512]};
 PICTURES['bar-'+l.id]={kind:'bar',level:l.id,size:[1024,200]};
 PICTURES['tap-'+l.id]={kind:'tap',level:l.id,size:[200,280],bar:110};
 PICTURES['door-'+l.id]={kind:'door',level:l.id,size:[240,360]};
 PICTURES['item-'+l.id]={kind:'item',level:l.id,size:[160,120]};
 PICTURES['empty-'+l.id]={kind:'empty',level:l.id,size:[160,120]};
 PICTURES['card-'+l.id]={kind:'card',level:l.id,size:[1600,900]};
}

// NECKS (Nov 14, owner's art): per frame [x,y] of the collar (template px) measured on the delivered sheets (scratch
// tapnecks.py: topmost opaque pixel round the torso centre), and the shoulder width: the face's chin sits on the collar and
// its width follows the shoulders (src/engines/bananaTapper.js person()). Re-measure if a sheet is replaced.
const NECKS={"bartender-p1":{"neck":{"idle":[[80.5,80.0],[79.5,80.0]],"pour":[[72.5,81.0],[72.0,81.0],[72.0,81.0]],"serve":[[88.0,81.0],[89.0,81.0]],"run":[[80.0,78.5],[80.0,78.5],[79.5,78.5],[80.0,78.5]],"catch":[[89.0,80.5],[88.5,80.5]],"lose":[[80.0,81.0],[78.5,80.5]]},"shoulders":71.0},"bartender-p2":{"neck":{"idle":[[80.0,80.0],[79.5,80.0]],"pour":[[71.5,80.0],[72.0,80.0],[72.5,80.0]],"serve":[[80.0,80.0],[90.5,81.0]],"run":[[79.0,79.5],[79.5,79.5],[79.0,79.5],[78.5,79.5]],"catch":[[80.0,79.5],[89.5,81.0]],"lose":[[79.0,82.5],[78.5,82.5]]},"shoulders":65.0},"customer-1":{"neck":{"walk":[[81.0,80.0],[81.0,80.0],[79.0,80.0],[82.0,80.0]],"push":[[59.5,80.0],[51.5,80.0]],"eat":[[76.5,81.0],[76.0,81.0]],"angry":[[76.0,82.0],[77.5,80.0]]},"shoulders":65.8},"customer-2":{"neck":{"walk":[[78.0,80.5],[82.5,80.0],[81.0,80.0],[79.0,80.0]],"push":[[65.0,91.0],[53.0,91.0]],"eat":[[77.5,86.0],[77.5,86.0]],"angry":[[80.5,80.0],[77.5,80.5]]},"shoulders":72.5},"customer-3":{"neck":{"walk":[[81.5,88.0],[81.5,87.5],[80.0,88.0],[82.0,88.5]],"push":[[58.0,90.5],[53.5,89.5]],"eat":[[75.5,86.0],[75.5,86.0]],"angry":[[80.5,90.0],[79.5,88.5]]},"shoulders":85.8},"customer-4":{"neck":{"walk":[[79.5,81.0],[80.0,80.5],[76.5,80.5],[76.0,80.5]],"push":[[49.5,84.0],[51.5,83.5]],"eat":[[72.0,78.5],[69.5,65.0]],"angry":[[76.5,80.5],[81.5,80.5]]},"shoulders":72.2}};
function neckAt(name,row,f){const n=NECKS[name];const r=n&&n.neck[row];if(!r||!r.length)return null;return r[((f%r.length)+r.length)%r.length];}
const url=name=>USER['tapper:'+name]||null;
const has=name=>!!url(name);
const imgs=new Map();
function picture(name){
 const u=url(name);if(!u||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=u;imgs.set(name,e);}
 return e.ok?e.img:null;
}
function preloadTapper(){for(const k of Object.keys(USER))if(k.startsWith('tapper:'))picture(k.slice(7));}
function sheet(name){const def=SHEETS[name],img=def&&picture(name);if(!img)return null;const cols=Math.max(...Object.values(def.rows));return {img,def,k:img.width/(cols*def.frame[0])};}
function frameRect(sh,row,f){
 const d=sh.def,names=Object.keys(d.rows),r=Math.max(0,names.indexOf(row)),n=d.rows[names[r]]||1,i=((f%n)+n)%n;
 return {sx:i*d.frame[0]*sh.k,sy:r*d.frame[1]*sh.k,sw:d.frame[0]*sh.k,sh:d.frame[1]*sh.k};
}
Object.assign(exports,{LEVELS,LEVEL_IDS,BODY,SHEETS,PICTURES,NECKS,neckAt,has,url,picture,preloadTapper,sheet,frameRect});
