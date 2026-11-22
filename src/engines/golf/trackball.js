// Shooter McGavin's Pro Tour: the cabinet TRACKBALL. Two parts:
// 1) the BALL: a heavy ball in a ring. A finger on it moves it 1:1; let go and it keeps rolling and slows down (FRICTION), like a
//    real cabinet ball. Positions are in ball radii (R), y down. The swing is read from the BALL, not the finger, so you can roll
//    back, LET GO, put your finger down again and roll forward in another direction.
// 2) the SWING, read like the bar-cabinet golf games: roll it DOWN (back swing) in one of three directions A (down-left),
//    B (straight down), C (down-right), then UP (forward swing) 1 (up-left), 2 (straight up), 3 (up-right). The moment it rolls back
//    past where it started is IMPACT. Speed through impact = power. The ball STARTS on the forward direction and CURVES by the
//    angle between the back line and the forward line:
//       A1 big slice   A2 fade        A3 push (straight right)
//       B1 pull fade   B2 straight    B3 push draw
//       C1 pull (straight left)  C2 draw  C3 big hook
//    (back + forward on one line = no curve). At address, a sideways roll picks the club. After impact, more rolling is
//    AFTERTOUCH: up = topspin (runs out), down = backspin (bites), sideways = bend. Putting: straight back and through; a slanted
//    stroke pushes/pulls the line a little.
const FULL_SPEED=8;       // R per second through impact = 100% power (the big ball on the phone: a firm flick)
const MIN_BACK=.2;        // smaller backswings are just fidgeting
const FRICTION=2.4;       // 1/s: a let-go ball slows to a stop in about a second
const DZ=7*Math.PI/180;   // dead zone on the angles (a hand never rolls perfectly straight)
const deg=a=>a*180/Math.PI;
// ---- the ball
function makeBall(){return {x:0,y:0,vx:0,vy:0,held:false,fx:0,fy:0,ft:0,moveT:0};}
function grab(B,p){B.held=true;B.fx=p.x;B.fy=p.y;B.ft=p.t;B.vx*=.15;B.vy*=.15;}       // a finger on a spinning ball mostly stops it
function drag(B,p){const dt=Math.max(.004,p.t-B.ft),dx=p.x-B.fx,dy=p.y-B.fy;B.x+=dx;B.y+=dy;const k=Math.min(1,dt/.045);
 B.vx+=(Math.max(-30,Math.min(30,dx/dt))-B.vx)*k;B.vy+=(Math.max(-30,Math.min(30,dy/dt))-B.vy)*k;B.fx=p.x;B.fy=p.y;B.ft=p.t;if(dx||dy)B.moveT=p.t;return [dx,dy];}
function release(B,t){B.held=false;if(t-B.ft>.07){B.vx=0;B.vy=0;}}                  // let go after holding it still = no spin
// one step of a free ball; returns how far it rolled [dx,dy]
function step(B,dt,t){if(B.held){if(t-B.ft>.07){B.vx=0;B.vy=0;}return [0,0];}
 const dx=B.vx*dt,dy=B.vy*dt;B.x+=dx;B.y+=dy;const f=Math.exp(-FRICTION*dt);B.vx*=f;B.vy*=f;
 if(Math.hypot(B.vx,B.vy)<.06){B.vx=0;B.vy=0;}else B.moveT=t;return [dx,dy];}
const spinning=B=>B.held||Math.hypot(B.vx,B.vy)>.06;
// roll a 3x3 orientation (row-major) by a surface move (dx,dy) in R (= radians): the drawn ball turns with it
function rollRot(M,dx,dy){const a=Math.hypot(dx,dy);if(a<1e-6)return M;const ax=-dy/a,ay=dx/a,c=Math.cos(a),s=Math.sin(a),t=1-c;
 const Rm=[t*ax*ax+c,t*ax*ay,s*ay, t*ax*ay,t*ay*ay+c,-s*ax, -s*ay,s*ax,c],o=new Array(9);
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)o[i*3+j]=Rm[i*3]*M[j]+Rm[i*3+1]*M[3+j]+Rm[i*3+2]*M[6+j];return o;}
const ROT0=()=>[1,0,0,0,1,0,0,0,1];
// ---- the swing reader: feed it the BALL position {x,y,t}. Returns 'impact' once, or 'club+'/'club-' for a sideways roll at address.
function newSwing(){return {state:'address',x0:null,y0:0,bx:0,by:0,back:0,pts:[],impact:null};}
function feed(S,p){
 if(S.state==='done')return null;
 if(S.x0==null){S.x0=p.x;S.y0=p.y;S.bx=p.x;S.by=p.y;}
 S.pts.push(p);if(S.pts.length>300)S.pts.shift();
 const dx=p.x-S.x0,dy=p.y-S.y0;
 if(S.state==='address'){
  if(dy>.12&&dy>Math.abs(dx)*.35){S.state='back';S.bx=p.x;S.by=p.y;}
  else if(Math.abs(dx)>.6&&Math.abs(dy)<Math.abs(dx)*.3){recentre(S,p);return dx>0?'club+':'club-';}
  else if(dy<-.25||Math.abs(dx)>1.2)recentre(S,p);   // rolled up / sideways and back at address: nothing, start again from here
  return null;}
 if(S.state==='back'){if(p.y>=S.by){S.bx=p.x;S.by=p.y;}S.back=S.by-S.y0;
  if(S.back>MIN_BACK&&S.by-p.y>.1)S.state='forward';
  else if(S.back<=MIN_BACK&&p.y<S.y0-.05){recentre(S,p);}}
 if(S.state==='forward'){if(p.y>S.by+.05){S.bx=p.x;S.by=p.y;S.back=S.by-S.y0;S.state='back';return null;}
  if(p.y<=S.y0){S.impact=impact(S,p);S.state='done';return 'impact';}}
 return null;}
function recentre(S,p){S.x0=p.x;S.y0=p.y;S.bx=p.x;S.by=p.y;S.back=0;S.pts=[p];S.state='address';}
// live directions while swinging (for the lit arrows): back angle (+ = toward C, the right) and forward angle (+ = toward 3)
function liveAngles(S){const out={back:null,fwd:null};if(S.state==='address'||S.x0==null)return out;
 if(S.by-S.y0>.12)out.back=Math.atan2(S.bx-S.x0,S.by-S.y0);
 if(S.state==='forward'||S.state==='done'){const p=S.pts[S.pts.length-1];if(S.by-p.y>.15)out.fwd=Math.atan2(p.x-S.bx,S.by-p.y);}
 if(S.impact){out.back=S.impact.backAng;out.fwd=S.impact.fwdAng;}return out;}
// the stroke through impact: speed over the last ~90 ms, back line = address -> bottom, forward line = the last 45% up to impact
function impact(S,p){const pts=S.pts;let k=pts.length-1;while(k>0&&p.t-pts[k].t<.09)k--;const q=pts[k];
 const dt=Math.max(.012,p.t-q.t),speed=Math.hypot(p.x-q.x,p.y-q.y)/dt;
 let j=pts.length-1;const yStart=S.by-(S.by-S.y0)*.55;while(j>0&&pts[j].y<yStart)j--;const a=pts[j];
 const fwdAng=Math.atan2(p.x-a.x,Math.max(.01,a.y-p.y)),backAng=Math.atan2(S.bx-S.x0,Math.max(.01,S.by-S.y0));
 const backK=Math.min(1,S.back/1.1),power=Math.min(1.25,speed/FULL_SPEED*(.55+.45*backK));
 return {speed,fwdAng,backAng,back:S.back,backK,power};}
// the three directions of each stroke
const BACKS=['A','B','C'],FWDS=['1','2','3'];
const letter=(a,set)=>a==null?null:set[Math.abs(a)<Math.PI/8?1:a<0?0:2];
const COMBOS={A1:'BIG SLICE',A2:'FADE',A3:'PUSH',B1:'PULL FADE',B2:'STRAIGHT',B3:'PUSH DRAW',C1:'PULL',C2:'DRAW',C3:'BIG HOOK'};
const dz=a=>Math.abs(a)<DZ?0:a-Math.sign(a)*DZ;
// the shot from an impact: power, curve (+ right, a slice), push = the start line off the aim (rad, + = left like yaw)
function toShot(im,{putt=false}={}){const b=letter(im.backAng,BACKS),f=letter(im.fwdAng,FWDS),combo=b+f;
 const start=dz(im.fwdAng);
 if(putt)return {power:Math.min(1.1,im.power),curve:0,push:-start*.04,over:false,combo,name:COMBOS[combo]};
 const over=im.power>1.03,bend=dz(-im.backAng-im.fwdAng);  // the reversed back line minus the forward line
 let curve=Math.max(-1.7,Math.min(1.7,deg(bend)/50));if(over)curve*=1.5;
 return {power:im.power,curve,push:-start*.13,over,combo,name:COMBOS[combo]};}
// aftertouch: a roll of (dx,dy) R during the flight window -> english [spin, side]
function english(dx,dy){return [Math.max(-.6,Math.min(.6,dy*.55)),Math.max(-.5,Math.min(.5,dx*.35))];}
// ball path of a stroke: back in direction backDeg (+ = toward C), forward toward fwdDeg (+ = toward 3), for the CPU's ball and tests
function strokePath(power,backDeg=0,fwdDeg=0,back=1){const pts=[],T=.5,yb=back*1.1,bx=Math.tan(backDeg*Math.PI/180)*yb;
 for(let i=0;i<=12;i++){const f=Math.sin(i/12*Math.PI/2);pts.push({x:bx*f,y:yb*f,t:i/12*T});}
 const fa=fwdDeg*Math.PI/180,v=power*FULL_SPEED/(.55+.45*Math.min(1,yb/1.1)),len=(yb+.05)/Math.cos(fa),dur=len/v;
 for(let i=1;i<=12;i++){const f=i/12;pts.push({x:bx+Math.sin(fa)*len*f,y:yb-(yb+.05)*f,t:T+dur*f});}return pts;}
// the stroke that makes a given curve: straight back, forward angle chosen so the bend gives that curve
function strokeFor(power,curve,back=1){const c=curve||0,f=c?-(Math.abs(c)*50+7)*Math.sign(c):0;return strokePath(power,0,f,back);}
// the path of one combo for the chart: start dir + bend -> points (x right, y up), unit length
function comboPath(b,f,n=14){const ba={A:-45,B:0,C:45}[b]*Math.PI/180,fa={1:-45,2:0,3:45}[f]*Math.PI/180,bend=-ba-fa,pts=[];
 let x=0,y=0,h=fa*.6;for(let i=0;i<=n;i++){pts.push([x,y]);const turn=bend*1.6/n*(i/n*1.4);h+=turn;x+=Math.sin(h)/n;y+=Math.cos(h)/n;}return pts;}
Object.assign(exports,{FULL_SPEED,MIN_BACK,FRICTION,makeBall,grab,drag,release,step,spinning,rollRot,ROT0,newSwing,feed,recentre,liveAngles,
 BACKS,FWDS,letter,COMBOS,toShot,english,strokePath,strokeFor,comboPath});
