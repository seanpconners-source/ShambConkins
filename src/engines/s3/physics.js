// Sonic 3 & Knuckles player physics, after the Sonic Physics Guide's description of the Mega Drive engine: values are
// pixels and pixels per frame at 60 frames a second, one step per frame. Ground speed (gsp) along the surface, ground
// angle θ (radians, anticlockwise, 0 = flat floor, π/2 = a wall on the right), four ground modes (floor, right wall,
// ceiling, left wall) that turn the sensors; floor sensors A/B under each side, push sensors at the middle, ceiling
// sensors C/D. Two collision paths (terrain.js) and plane switchers for loops. Pure: no drawing, no sound (events are
// pushed on p.ev for the game to turn into sounds/effects), so tests can run it in Node.
// acceleration (owner, Nov 11: "should build more speed faster"): 1.65x the Mega Drive's 0.046875, so top speed comes in
// about 1.2 s instead of 2 (air control the same factor); top speed, friction and the rest stay Mega Drive
const C={acc:0.0775,dec:0.5,frc:0.046875,top:6,slp:0.125,slpUp:0.078125,slpDown:0.3125,rollFrc:0.0234375,rollDec:0.125,
 air:0.155,grv:0.21875,jmp:6.5,jmpRelease:4,maxFall:16,maxSpeed:16,rollMin:1.03125,unroll:0.5,slipSpeed:2.5,lock:30,
 wr:9,hr:19,wrRoll:7,hrRoll:14,push:10};
const TAU=Math.PI*2,D=Math.PI/180;
// speed shoes double acceleration and top speed (Sonic 3 values)
const SHOES={acc:0.155,frc:0.09375,top:12,air:0.31};
const st=p=>p.shoes>0?SHOES:C;
const norm=a=>((a%TAU)+TAU)%TAU;
// ground mode from the angle (Sonic 3 splits at 45° with the floor and ceiling taking the diagonals)
const modeOf=a=>{a=norm(a);return a<=45*D||a>=315*D?0:a<135*D?1:a<=225*D?2:3;};
const MODE_ANG=[0,Math.PI/2,Math.PI,Math.PI*1.5];
// tangent (forward along the surface) and down (into the surface) for an angle, in screen coords
const r6=v=>Math.abs(v)<1e-9?0:v;
const tan=a=>[r6(Math.cos(a)),r6(-Math.sin(a))],down=a=>[r6(Math.sin(a)),r6(Math.cos(a))];

function makeRunner(x,y,opt={}){return {x,y,xsp:0,ysp:0,gsp:0,ang:0,ground:true,path:'a',rolling:false,jumping:false,
 crouch:false,lookUp:false,spindash:false,rev:0,lock:0,facing:1,airLock:false,ev:[],jmp:opt.jmp??C.jmp,frames:0,onObj:null,
 hurt:false,inv:0,shield:null,shoes:0,star:0,ability:false,bubble:false,insta:0,hang:null,spring:false};}
const radii=p=>p.rolling||!p.ground&&p.jumping?[C.wrRoll,C.hrRoll]:[C.wr,C.hr];

// distance from (x,y) along unit dir (dx,dy) to the surface: negative = (x,y) is inside the ground by that much.
// null when nothing within -16..+32 px.
function sense(T,x,y,dx,dy,path,floor){
 // axis-aligned scans in whole pixels, distances measured to the pixel edge so positions stay exact
 const ax=Math.abs(dx)>Math.abs(dy),dir=ax?Math.sign(dx):Math.sign(dy),c=ax?x:y,o=ax?y|0:x|0,ci=Math.floor(c);
 const S=k=>ax?T.solid(k,o,path,floor):T.solid(o,k,path,floor);
 if(S(ci)){for(let k=1;k<=16;k++){const r=ci-dir*k;if(!S(r))return dir>0?-(c-(r+1)):-((r)-c);}return -16;}
 for(let k=1;k<=32;k++){const r=ci+dir*k;if(S(r))return dir>0?r-c:c-(r+1);}return null;}
// the surface angle where a sensor hit: seven probes across 24 px along the surface and a straight-line fit. (Two probes
// 8 px apart on whole pixels gave the angle in ~6° steps that rocked back and forth, so the runner wobbled round loops,
// worst when slow; the fit is good to about a degree, close to the Mega Drive's per-tile angles.)
const PROBES=[-12,-8,-4,0,4,8,12];
function surfAngle(T,hx,hy,mode,path,floor){const m=MODE_ANG[mode],[tx,ty]=tan(m),[nx,ny]=down(m);
 let n=0,su=0,sv=0,suu=0,suv=0;
 for(const u of PROBES){const d=sense(T,hx+tx*u-nx*8,hy+ty*u-ny*8,nx,ny,path,floor);if(d===null)continue;const v=d-8;// depth along "down" past the hit point
  n++;su+=u;sv+=v;suu+=u*u;suv+=u*v;}
 if(n<2)return m;const den=n*suu-su*su;if(Math.abs(den)<1e-9)return m;
 const k=(n*suv-su*sv)/den;// surface drops k px (along down) per px along the tangent
 // surface direction in screen coords = tangent + k * down
 const dx=tx+k*nx,dy=ty+k*ny;return norm(Math.atan2(-dy,dx));}
// ---------------- one frame
// inp = {l,r,u,d,jump (held),jumpPress (this frame)}; T = terrain; objs = plane switchers etc. (optional)
function step(p,inp,T,opt={}){p.frames++;p.ev.length=0;if(p.lock>0&&p.ground)p.lock--;
 if(p.inv>0&&!p.hurt)p.inv--;if(p.shoes>0)p.shoes--;if(p.star>0)p.star--;if(p.insta>0)p.insta--;
 if(p.hang)return p;// held by a vine/zip line: objects.js moves the runner
 if(p.ground)groundStep(p,inp,T);else airStep(p,inp,T);
 for(const s of opt.switchers||[])switcher(p,s);
 return p;}
function switcher(p,s){const was=s.side?.get(p)??(p.x<s.x?-1:1),now=p.x<s.x?-1:1;if(!s.side)s.side=new WeakMap();s.side.set(p,now);
 if(was!==now&&p.y>=s.y0&&p.y<=s.y1&&(!s.ground||p.ground))p.path=now>0?s.right:s.left;}

function groundStep(p,inp,T){let [wr,hr]=radii(p);
 // spin dash: crouch + jump revs, letting go of down releases
 if(p.spindash){if(!inp.d){p.spindash=false;p.rolling=true;p.gsp=(8+Math.floor(p.rev)/2)*p.facing;p.rev=0;p.ev.push('dash');p.crouch=false;}
  else{if(inp.jumpPress){p.rev=Math.min(8,p.rev+2);p.ev.push('rev');}p.rev-=Math.floor(p.rev/0.125)/256;if(p.rev<0)p.rev=0;return;}}
 // jump
 if(inp.jumpPress&&!p.crouch){const [nx,ny]=down(p.ang);p.xsp=p.gsp*Math.cos(p.ang)-p.jmp*nx;p.ysp=-p.gsp*Math.sin(p.ang)-p.jmp*ny;
  if(!p.rolling){p.y+=C.hr-C.hrRoll;}p.ground=false;p.jumping=true;p.rolling=true;p.ev.push('jump');p.onObj=null;return;}
 if(inp.jumpPress&&p.crouch&&Math.abs(p.gsp)<.1){p.spindash=true;p.rev=2;p.ev.push('rev');return;}
 // slope factor
 const s=Math.sin(p.ang);
 // LOOP ASSIST (owner, Nov 11: "had speed, entered the loop, stopped 20% up and fell back... needs to be fluid like the
 // real game"): on steep or upside-down track (past ~50°: loops and walls, not the hills) a moving runner loses less
 // than half the speed climbing, and a ball no rolling friction there. Pure Mega Drive numbers stalled a ball arriving at
 // 4-5 px/frame a quarter of the way up our 112 px loops; with this a roll at 4+ or a run gets round.
 const steep=(Math.abs(s)>.42||Math.cos(p.ang)<0)&&Math.abs(p.gsp)>=2,uphill=Math.sign(p.gsp)===Math.sign(s),assist=steep&&uphill?(p.rolling?.3:.42):1;
 if(p.rolling)p.gsp-=(uphill?C.slpUp*assist:C.slpDown)*s;
 else if(p.gsp!==0||Math.abs(s)>0.2)p.gsp-=C.slp*s*assist;
 // input
 const L=p.lock>0?false:inp.l,R=p.lock>0?false:inp.r;
 if(p.rolling){if(L&&p.gsp>0)p.gsp=Math.max(0,p.gsp-C.rollDec);else if(R&&p.gsp<0)p.gsp=Math.min(0,p.gsp+C.rollDec);
  if(!steep)p.gsp-=Math.min(Math.abs(p.gsp),C.rollFrc)*Math.sign(p.gsp);
  if(Math.abs(p.gsp)<C.unroll&&modeOf(p.ang)===0){p.rolling=false;p.gsp=0;p.y-=C.hr-C.hrRoll;[wr,hr]=radii(p);}}
 else{
  const S=st(p);
  if(L){if(p.gsp>0){p.gsp-=C.dec;if(p.gsp<=0)p.gsp=-0.5;if(p.gsp>4&&modeOf(p.ang)===0)p.ev.push('skid');}else if(p.gsp>-S.top)p.gsp=Math.max(-S.top,p.gsp-S.acc);p.facing=-1;}
  else if(R){if(p.gsp<0){p.gsp+=C.dec;if(p.gsp>=0)p.gsp=0.5;if(p.gsp<-4&&modeOf(p.ang)===0)p.ev.push('skid');}else if(p.gsp<S.top)p.gsp=Math.min(S.top,p.gsp+S.acc);p.facing=1;}
  else p.gsp-=Math.min(Math.abs(p.gsp),S.frc)*Math.sign(p.gsp);
  p.crouch=!!inp.d&&Math.abs(p.gsp)<.1&&modeOf(p.ang)===0;p.lookUp=!!inp.u&&Math.abs(p.gsp)<.1&&modeOf(p.ang)===0;
  if(inp.d&&Math.abs(p.gsp)>=C.rollMin){p.rolling=true;p.y+=C.hr-C.hrRoll;[wr,hr]=radii(p);p.ev.push('roll');}}
 p.gsp=Math.max(-C.maxSpeed,Math.min(C.maxSpeed,p.gsp));
 // walls ahead (push sensors) while moving, on floor-mode ground only: on a loop's walls and ceiling the cast ran into
 // the loop's own curve ahead and stopped the runner dead (rolling down the back of a loop at 9.9 -> 0)
 const mode=modeOf(p.ang);
 // the sensor drops 8 px only on flat ground (like the Mega Drive): on a slope it took the start of a loop's curve for a
 // wall at speed (10.7 -> 0 at 42°)
 if(p.gsp!==0&&mode===0){const dir=Math.sign(p.gsp),m=MODE_ANG[mode],[tx,ty]=tan(m),[nx,ny]=down(m),flat=Math.abs(Math.sin(p.ang))<.09,off=flat&&!p.rolling?8:0;
  const ox=p.x+nx*off,oy=p.y+ny*off,d=sense(T,ox,oy,tx*dir,ty*dir,p.path,false);
  const reach=C.push+Math.abs(p.gsp);
  if(d!==null&&d<reach){p.gsp=0;const gap=d-C.push;/* stop flush against the wall */p.x+=tx*dir*Math.min(0,gap);p.y+=ty*dir*Math.min(0,gap);p.ev.push('wall');}}
 // move
 p.xsp=p.gsp*Math.cos(p.ang);p.ysp=-p.gsp*Math.sin(p.ang);p.x+=p.xsp;p.y+=p.ysp;
 // standing on a solid object (monitor, platform): stay on its top while over it
 if(p.onObj){const o=p.onObj;if(o.solid!==false&&!o.gone&&Math.abs(p.x-o.x)<o.w/2+wr){p.y=o.y-o.h/2-hr;p.ang=0;return;}
  p.onObj=null;}
 // stick to the ground: floor sensors in the current mode
 const m=MODE_ANG[modeOf(p.ang)],[tx,ty]=tan(m),[nx,ny]=down(m);
 const ax=p.x-tx*wr+nx*hr,ay=p.y-ty*wr+ny*hr,bx=p.x+tx*wr+nx*hr,by=p.y+ty*wr+ny*hr;
 const da=sense(T,ax,ay,nx,ny,p.path,true),db=sense(T,bx,by,nx,ny,p.path,true);
 let d=null,hx=0,hy=0;
 if(da!==null&&(db===null||da<=db)){d=da;hx=ax+nx*da;hy=ay+ny*da;}else if(db!==null){d=db;hx=bx+nx*db;hy=by+ny*db;}
 // how far the ground may fall away and still be stuck to (Sonic 2+): by the speed across the sensors' direction
 const md0=modeOf(p.ang),snap=Math.min(Math.abs(md0===1||md0===3?p.ysp:p.xsp)+4,14);
 if(d===null||d>snap){p.ground=false;p.jumping=false;p.ev.push('leave');return;}
 p.x+=nx*d;p.y+=ny*d;
 p.ang=surfAngle(T,hx,hy,modeOf(p.ang),p.path,true);
 // too slow on a steep slope, wall or ceiling (Sonic 3 & Knuckles rules): steeper than 69° = drop off it; 35-69° =
 // slide back down (ground speed pushed .5 down the slope); either way 30 frames without control. (The old rule only
 // dropped off past 90°, so a slow runner hung on a loop's wall at ~70° with no speed before sliding back.)
 if(Math.abs(p.gsp)<C.slipSpeed&&p.lock===0){const deg=norm(p.ang)/D;
  if(deg>=35&&deg<=326){p.lock=C.lock;
   if(deg>=69&&deg<=293){p.ground=false;p.jumping=false;p.xsp=p.gsp*Math.cos(p.ang);p.ysp=-p.gsp*Math.sin(p.ang);p.ang=0;p.ev.push('fall');}
   else p.gsp+=deg<180?-.5:.5;}}}

function airStep(p,inp,T){
 const S=st(p);
 // the second press in a jump: the shield's move, or the insta-shield without one (Sonic 3 & Knuckles)
 // the fox (p.canFly): a second press with no shield starts flying: slow sink, hold jump to climb, 5.5 s then tired
 // (like Sonic 3's Tails the fox has no shield moves: with any shield the second press still flies; owner: no fly with a bubble)
 if(p.canFly&&inp.jumpPress&&p.jumping&&!p.ability&&!p.hurt){p.ability=true;p.fly=330;p.jumping=false;p.rolling=false;p.y-=C.hr-C.hrRoll;p.ev.push('fly');}
 else if(inp.jumpPress&&p.jumping&&!p.ability&&!p.hurt&&p.star===0){p.ability=true;
  if(p.shield==='fire'){p.xsp=8*p.facing;p.ysp=0;p.ev.push('fire-dash');}
  else if(p.shield==='lightning'){p.ysp=-5.5;p.ev.push('lightning-jump');}
  else if(p.shield==='bubble'){p.xsp=0;p.ysp=8;p.bubble=true;p.ev.push('bubble-bounce');}
  else if(!p.shield){p.insta=16;p.ev.push('insta-shield');}}
 // air control (none while knocked back)
 if(!p.hurt){
  if(inp.r&&!p.airLock){if(p.xsp<S.top)p.xsp=Math.min(S.top,p.xsp+S.air);p.facing=1;}
  if(inp.l&&!p.airLock){if(p.xsp>-S.top)p.xsp=Math.max(-S.top,p.xsp-S.air);p.facing=-1;}
  if(p.ysp<0&&p.ysp>-4)p.xsp-=Math.trunc(p.xsp/0.125)/256;
  if(p.jumping&&!inp.jump&&p.ysp<-C.jmpRelease)p.ysp=-C.jmpRelease;}
 p.x+=p.xsp;p.y+=p.ysp;
 if(p.fly>0&&!p.hurt){if(p.fly>1)p.fly--;p.xsp=Math.max(-4,Math.min(4,p.xsp));if(inp.jump&&p.fly>1){if(p.ysp>-1)p.ysp-=0.125;}else p.ysp=Math.min(p.fly>1?2:4,p.ysp+0.03125);}
 else p.ysp=Math.min(C.maxFall,p.ysp+(p.hurt?0.1875:C.grv));
 const [wr,hr]=radii(p);
 // walls (push sensors at the middle)
 for(const dir of [-1,1]){if(dir<0&&p.xsp>0||dir>0&&p.xsp<0)continue;const d=sense(T,p.x,p.y,dir,0,p.path,false);
  if(d!==null&&d<C.push){p.x-=dir*(C.push-d);if(Math.sign(p.xsp)===dir)p.xsp=0;}}
 // ceiling
 if(p.ysp<0){let best=null,hx=0;for(const sx of [-wr,wr]){const d=sense(T,p.x+sx,p.y-hr,0,-1,p.path,false);if(d!==null&&d<0&&(best===null||d<best)){best=d;hx=p.x+sx;}}
  if(best!==null){const ang=surfAngle(T,hx,p.y-hr-best,2,p.path,false),deg=ang/D;
   if(deg>=91&&deg<=135||deg>=225&&deg<=269){p.ang=ang;p.y-=best;p.gsp=p.ysp*-Math.sign(Math.sin(ang));p.ground=true;p.jumping=false;p.ev.push('land');return;}
   p.y-=best;p.ysp=0;}}
 // floor
 if(p.ysp>=0){let best=null,hx=0,hy=0;for(const sx of [-wr,wr]){const d=sense(T,p.x+sx,p.y+hr,0,1,p.path,true);if(d!==null&&(best===null||d<best)){best=d;hx=p.x+sx;hy=p.y+hr+d;}}
  if(best!==null&&best<0&&best>=-(p.ysp+8)){p.y+=best;const ang=surfAngle(T,hx,hy,0,p.path,true);land(p,ang);}}
}
// landing: ground speed from the air speed and how steep the ground is (Sonic Physics Guide rules)
function land(p,ang){const deg=norm(ang)/D,a=deg>180?360-deg:deg;
 // bubble shield: bounce straight back up off the ground, still curled
 if(p.bubble){p.bubble=false;p.ability=false;const [nx,ny]=down(ang);p.xsp=p.xsp-7.5*nx;p.ysp=-7.5*ny;p.jumping=true;p.ev.push('bubble-land');return;}
 if(p.hurt){p.hurt=false;p.xsp=0;p.ysp=0;p.gsp=0;p.ang=ang;p.ground=true;p.jumping=false;p.rolling=false;p.inv=120;p.ev.push('land');return;}
 if(a<=23)p.gsp=p.xsp;
 else if(a<=45)p.gsp=Math.abs(p.xsp)>Math.abs(p.ysp)?p.xsp:p.ysp*0.5*-Math.sign(Math.sin(ang));
 else p.gsp=Math.abs(p.xsp)>Math.abs(p.ysp)?p.xsp:p.ysp*-Math.sign(Math.sin(ang));
 const wasBall=p.jumping||p.rolling;p.fly=0;p.ang=ang;p.ground=true;p.jumping=false;p.lock=0;p.ability=false;p.spring=false;
 if(wasBall){p.rolling=false;p.y-=C.hr-C.hrRoll;}
 p.ev.push('land');}
// bounce off a spring or anything else that throws you: vx/vy in screen px/frame
function launch(p,vx,vy,{roll=false}={}){if(vx!==null&&vx!==undefined)p.xsp=vx;p.ysp=vy;
 if(!p.rolling&&roll&&p.ground)p.y+=C.hr-C.hrRoll;if(p.rolling&&!roll)p.y-=C.hr-C.hrRoll;
 p.fly=0;p.ground=false;p.jumping=false;p.rolling=roll;p.spindash=false;p.crouch=false;p.onObj=null;p.ability=false;p.bubble=false;p.spring=!roll;}
// knocked back by a hit: away from the danger, up 4, no control until landing
function knock(p,fromX){const dir=p.x<fromX?-1:1;if(p.rolling||p.jumping)p.y-=C.hr-C.hrRoll;p.xsp=2*dir;p.ysp=-4;p.ground=false;p.jumping=false;p.rolling=false;
 p.fly=0;p.spindash=false;p.hurt=true;p.inv=120;p.onObj=null;p.bubble=false;p.ability=false;p.hang=null;}
Object.assign(exports,{C,SHOES,step,makeRunner,modeOf,radii,sense,launch,land,knock,down});
