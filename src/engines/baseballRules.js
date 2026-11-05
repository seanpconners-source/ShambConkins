// Baseball rules and physics for the Ken Griffey-style game (engines/griffeyBall.js), kept pure so Node can test them.
// Units are feet and seconds. Home plate at (0,0), x to the right (first-base side), y out to centre field, z up.
// Bases are 90 ft apart; fences 330 ft down the lines and 400 ft to centre, 10 ft high.
const D2R=Math.PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const BASES=[{x:0,y:0},{x:63.64,y:63.64},{x:0,y:127.28},{x:-63.64,y:63.64}];   // home, 1st, 2nd, 3rd
const MOUND={x:0,y:60.5},FENCE_H=10;
const fenceAt=theta=>330+70*Math.cos(2*theta);          // theta from straight-away centre, radians; fair within ±45°
// fielding positions: P, C, 1B, 2B, SS, 3B, LF, CF, RF
const POSITIONS=[{k:'P',x:0,y:60},{k:'C',x:0,y:-4},{k:'1B',x:66,y:80},{k:'2B',x:34,y:118},{k:'SS',x:-34,y:118},{k:'3B',x:-66,y:80},{k:'LF',x:-150,y:245},{k:'CF',x:0,y:300},{k:'RF',x:150,y:245}];
const COVER=[null,2,4,3];      // who takes the throw at home/1st/2nd/3rd (index into POSITIONS; home = catcher)
COVER[0]=1;

// ---- pitches (real speeds; the game slows the flight down so a phone thumb can hit it: PITCH_SLOW)
const PITCHES={fast:{name:'FASTBALL',mph:94,breakX:0,breakY:.08,fake:false},curve:{name:'CURVE',mph:77,breakX:.55,breakY:-.75,fake:false},
 slider:{name:'SLIDER',mph:85,breakX:.8,breakY:-.2,fake:false},change:{name:'CHANGE-UP',mph:82,breakX:-.15,breakY:-.35,fake:true}};
const PITCH_SLOW=2.35,MPH=1.4667;
const pitchTime=k=>60.5/((PITCHES[k]||PITCHES.fast).mph*MPH)*PITCH_SLOW;
// where a pitch crosses the plate, in zone units (strike zone = [-1,1] x [-1,1]); aim plus the pitcher's miss
function pitchPlan(kind,aimU,aimV,control,rand){const P=PITCHES[kind]||PITCHES.fast,miss=(1.15-control)*.42;
 const u=aimU+(rand()-.5)*2*miss,v=aimV+(rand()-.5)*2*miss;return {kind,u,v,T:pitchTime(kind),bx:P.breakX,by:P.breakY};}
// the pitch's position on the way in, k = 0 (release) .. 1 (plate); the break comes late
function pitchAt(p,k){const late=k*k*k;return {u:p.u-p.bx*(1-late),v:p.v-p.by*(1-late)+(1-k)*.6,k};}
const inZone=(u,v)=>Math.abs(u)<=1&&Math.abs(v)<=1;

// ---- the swing: timing (seconds, + late) and where the bat's sweet spot was (zone units)
const WINDOW=.14;
function contact(p,dt,cu,cv,bat={power:.6,contact:.6},rand=Math.random){
 const reach=.44+.16*bat.contact,du=p.u-cu,dv=p.v-cv,d=Math.hypot(du,dv*1.25);
 if(Math.abs(dt)>WINDOW||d>reach)return {kind:'miss'};
 const qt=1-Math.abs(dt)/WINDOW,qd=1-d/reach,q=clamp(qt*.55+qd*.45,0,1);
 // timing sends it: early (dt<0) pulls it to left field (a right-handed batter), late goes the other way (theta>0 = right field)
 let theta=clamp(dt/WINDOW*66+(rand()-.5)*12,-80,80)*D2R;
 // the bat under the ball lifts it, over it chops it into the ground
 const gauss=()=>(rand()+rand()+rand()-1.5)*1.15;const phi=clamp(9+dv*44+gauss()*16+(1-qd)*(dv>0?10:-10),-30,65);
 if(q<.32)return {kind:'foul',theta:(dt<0?-1:1)*(55+rand()*30)*D2R,phi:clamp(phi+20,10,80),mph:45+rand()*20,tip:true};
 const mph=clamp(55+58*q+28*(bat.power-.5)+(bat.boost||0)+(rand()-.5)*8,40,122);
 return {kind:Math.abs(theta)>45*D2R?'foul':'fair',theta,phi,mph,q};}

// ---- ball flight: drag, bounces, rolling, the fence; a list of samples [t,x,y,z] at 1/60 s plus what happened
const G=32.2,DRAG=.128,REST=.36,ROLL=38;
function flight(hit,startZ=3){const v=hit.mph*MPH,ph=hit.phi*D2R,th=hit.theta||0;let vh=v*Math.cos(ph),vz=v*Math.sin(ph),dx=Math.sin(th),dy=Math.cos(th);
 let x=0,y=0,z=startZ,t=0,bounces=0,landed=null,hr=false,wall=false;const path=[[0,x,y,z]],dt=1/60;
 for(let i=0;i<2400;i++){const k=Math.exp(-DRAG*dt);
  if(z>0||vz>0){vh*=k;vz=vz*k-G*dt;x+=dx*vh*dt;y+=dy*vh*dt;z+=vz*dt;
   if(z<=0){z=0;if(landed==null)landed={t,x,y};if(Math.abs(vz)<6||bounces>4){vz=0;}else{vz=-vz*REST;vh*=.56;bounces++;}}}
  else{vh=Math.max(0,vh-ROLL*dt);x+=dx*vh*dt;y+=dy*vh*dt;}
  t+=dt;
  const r=Math.hypot(x,y),ang=Math.atan2(x,y),fair=Math.abs(ang)<=45*D2R+1e-6;
  if(fair&&r>=fenceAt(ang)&&r>100){if(z>FENCE_H&&landed==null){hr=true;path.push([t,x,y,z]);break;}
   // off the wall: back toward the infield
   if(!wall){wall=true;const back=fenceAt(ang)-1;x=Math.sin(ang)*back;y=Math.cos(ang)*back;dx=-dx;dy=-dy;vh*=.35;}}
  path.push([t,x,y,z]);if(z<=0&&vz===0&&vh<1&&i>10)break;}
 const end=path[path.length-1],ang=Math.atan2(end[1],end[2]);
 return {path,hr,wall,landed,foul:!hr&&isFoul(path),dist:landed?Math.hypot(landed.x,landed.y):Math.hypot(end[1],end[2]),T:end[0]};}
// fair or foul: where it first lands past first/third base, or where it stops in front of them
function isFoul(path){for(const [,x,y,z] of path){const r=Math.hypot(x,y),ang=Math.abs(Math.atan2(x,y));if(z<=0&&r>4){if(r>95)return ang>45*D2R;}}
 const e=path[path.length-1];return Math.abs(Math.atan2(e[1],e[2]))>45*D2R||e[2]<0;}
function ballAt(f,t){const p=f.path;if(t<=0)return {x:p[0][1],y:p[0][2],z:p[0][3]};const i=Math.min(p.length-1,Math.floor(t*60));const a=p[i],b=p[Math.min(p.length-1,i+1)],u=clamp(t*60-i,0,1);
 return {x:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u,z:a[3]+(b[3]-a[3])*u,done:i>=p.length-1};}
// the first time a fielder starting at (fx,fy), running at `speed`, can get to the ball (and how high it is then)
// `now` = time already gone in the play: only the ball's path from now on counts
function intercept(f,fx,fy,speed=27,reach=5,start=.45,now=0){for(let i=Math.max(0,Math.floor(now*60));i<f.path.length;i+=2){const [t,x,y,z]=f.path[i];if(z>8)continue;if(t<start&&z>.5)continue;const need=now+Math.max(0,Math.hypot(x-fx,y-fy)-reach)/speed+start;if(need<=t)return {t,x,y,z,air:z>.5&&(f.landed==null||t<f.landed.t)};}
 const e=f.path[f.path.length-1];return {t:Math.max(now,e[0])+Math.max(0,Math.hypot(e[1]-fx,e[2]-fy)-reach)/speed+start,x:e[1],y:e[2],z:0,air:false};}
const THROW=118,RELEASE=.32,RUN=24.5,BATTER_START=.55;
const throwTime=(ax,ay,bx,by,arm=1)=>RELEASE+Math.hypot(ax-bx,ay-by)/(THROW*(.85+.3*arm));
// along the base path from base a toward a+1, a fraction 0..1
function onPath(a,k){const A=BASES[a%4],B=BASES[(a+1)%4];return {x:A.x+(B.x-A.x)*k,y:A.y+(B.y-A.y)*k};}

// ---- the count, outs, the inning
function newCount(){return {b:0,s:0};}
// after a pitch: result 'ball'|'strike'|'foul'|'swing' (swinging strike); returns {count,walk,k}
function tally(c,res){const n={...c};if(res==='ball'){n.b++;if(n.b>=4)return {count:newCount(),walk:true};}else if(res==='foul'){if(n.s<2)n.s++;}else{n.s++;if(n.s>=3)return {count:newCount(),k:true};}return {count:n};}
// a walk: forced runners move up one; returns {bases,runs}
function walk(bases){const b=[...bases];let runs=0;if(b[0]){if(b[1]){if(b[2])runs++;b[2]=b[1];}b[1]=b[0];}b[0]=true;return {bases:b,runs};}

// ---- ratings from a character id (stable): power, contact, speed, arm, pitching control and velocity
function hash(s){let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
function ratings(id,over){const h=hash(id),r=k=>.35+((h>>>k)&255)/255*.55;return {power:r(0),contact:r(8),speed:r(16),arm:r(24),control:.45+((h>>>4)&255)/255*.5,velo:.4+((h>>>12)&255)/255*.55,...(over||{})};}

// ---- CPU brains
// pitcher: count-aware location, mixes pitches; skill makes it hit corners
function cpuPitch(count,skill,rand){const kinds=['fast','fast','curve','slider','change'],kind=kinds[Math.floor(rand()*kinds.length)];
 const behind=count.b>=3&&count.s<2,ahead=count.s===2&&count.b<2,edge=behind?.45:ahead?1.25:.85;
 const u=(rand()<.5?-1:1)*edge*(.4+rand()*.6),v=(rand()-.5)*2*edge*(.6+.4*skill);return {kind,u,v};}
// batter: reads the pitch with some error, swings at strikes (and some balls), aims at where it will cross
function cpuSwing(p,count,skill,rand){const breaking=p.kind==='curve'||p.kind==='slider',see=(1.25-skill)*.6+(breaking?.35:0);
 // a breaking ball is read where it would have gone without the break; a change-up looks like a fastball (swing early)
 const fooled=breaking&&rand()<.55-skill*.25,eu=p.u+(fooled?p.bx*.6:0)+(rand()-.5)*see,ev=p.v+(fooled?p.by*.6:0)+(rand()-.5)*see,looks=inZone(eu,ev);
 const swing=looks?rand()<(count.s===2?.95:.82):rand()<(count.s===2?.35:.16)*(1.3-skill);if(!swing)return null;
 const sd=.05+(1-skill)*.08,early=p.kind==='change'&&rand()<.6-skill*.3?-.09:0,dt=early+(rand()+rand()+rand()-1.5)*sd*1.4;return {dt,cu:eu+(rand()-.5)*.4*(1.25-skill),cv:ev+(rand()-.5)*.4*(1.25-skill)};}

Object.assign(exports,{BASES,MOUND,FENCE_H,fenceAt,POSITIONS,COVER,PITCHES,PITCH_SLOW,pitchTime,pitchPlan,pitchAt,inZone,WINDOW,contact,flight,isFoul,ballAt,intercept,THROW,RELEASE,RUN,BATTER_START,throwTime,onPath,newCount,tally,walk,ratings,hash,cpuPitch,cpuSwing,clamp,D2R});
