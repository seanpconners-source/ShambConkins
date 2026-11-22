// Shooter McGavin's Pro Tour: the simulated TRACKBALL. A swing is read from the finger's path over the ball (in trackball radii, y down):
// roll it DOWN (toward you) = backswing (how far = how big the swing), then roll it UP: the moment it passes the address point
// is IMPACT. Speed through impact = power, the stroke's angle off straight up = curve (up-left draws/hooks, up-right
// fades/slices, for a right-hander), a backswing that drifts sideways and comes back square = nothing (only the forward
// stroke counts). Too fast = OVER-SWING (more distance, any curve doubled). After impact, more rolling is AFTERTOUCH:
// up = topspin (runs out), down = backspin (bites), sideways = bend. Putting: same stroke, short, no curve (it pushes the line).
const FULL_SPEED=11;      // R per second through impact = 100% power (a brisk thumb flick on a phone)
const MIN_BACK=.18;       // smaller backswings are just fidgeting
function newSwing(){return {state:'address',back:0,drift:0,pts:[],y0:0,x0:0,peakY:0,impact:null};}
// feed one sample {x,y,t} (R units, y down, t seconds). Returns 'impact' once, when the forward stroke passes address.
function feed(S,p){
 if(S.state==='done')return null;
 if(!S.pts.length){S.x0=p.x;S.y0=p.y;S.peakY=p.y;}
 S.pts.push(p);if(S.pts.length>160)S.pts.shift();
 if(S.state==='address'){if(p.y-S.y0>.08)S.state='back';}
 if(S.state==='back'){if(p.y>S.peakY){S.peakY=p.y;S.drift=p.x-S.x0;}S.back=S.peakY-S.y0;
  if(S.back>MIN_BACK&&S.peakY-p.y>.1)S.state='forward';}
 if(S.state==='forward'){if(p.y>S.peakY+.05){S.peakY=p.y;S.back=S.peakY-S.y0;S.state='back';return null;}
  if(p.y<=S.y0){S.impact=impact(S,p);S.state='done';return 'impact';}}
 return null;}
// the stroke through impact: speed over the last ~90 ms, angle from the bottom of the backswing to impact (weighted to the end)
function impact(S,p){const pts=S.pts;let k=pts.length-1;while(k>0&&p.t-pts[k].t<.09)k--;const q=pts[k];
 const dt=Math.max(.012,p.t-q.t),speed=Math.hypot(p.x-q.x,p.y-q.y)/dt;
 // direction near impact (last 45% of the forward stroke)
 let j=pts.length-1;const yStart=S.peakY-(S.peakY-S.y0)*.55;while(j>0&&pts[j].y<yStart)j--;const a=pts[j];
 const ang=Math.atan2(p.x-a.x,a.y-p.y);// + = stroke leans right
 const backK=Math.min(1,S.back/1.1),power=Math.min(1.25,speed/FULL_SPEED*(.55+.45*backK));
 return {speed,ang,back:S.back,backK,power,drift:S.drift};}
// the shot numbers from an impact: curve (+ right), power; putts turn the angle into a small push off the line
function toShot(im,{putt=false,hand=1}={}){const deg=im.ang*180/Math.PI,dead=putt?1.5:2.5;
 const d=Math.abs(deg)<dead?0:deg-Math.sign(deg)*dead;
 if(putt)return {power:Math.min(1.1,im.power),curve:0,push:d*Math.PI/180*.12,over:false};
 const over=im.power>1.03;let curve=Math.max(-1.6,Math.min(1.6,d/22))*hand;if(over)curve*=1.7;
 return {power:im.power,curve,push:0,over};}
// aftertouch: a roll of (dx,dy) R during the flight window -> english [spin, side]
function english(dx,dy){return [Math.max(-.6,Math.min(.6,dy*.55)),Math.max(-.5,Math.min(.5,dx*.35))];}
// for a CPU or a replay: the trackball path that makes a given shot (so the cabinet's ball can be seen rolling)
function strokeFor(power,curve,back=1){const pts=[],T=.55,y0=0,yb=back*1.1,v=power*FULL_SPEED/(.55+.45*Math.min(1,yb/1.1)),ang=curve*22*Math.PI/180;
 for(let i=0;i<=12;i++){const t=i/12*T;pts.push({x:0,y:y0+yb*Math.sin(i/12*Math.PI/2),t});}
 const t0=T,dur=yb/(v*Math.cos(ang)||1);for(let i=1;i<=10;i++){const f=i/10;pts.push({x:Math.sin(ang)*v*dur*f,y:yb-(yb+.05)*f,t:t0+dur*f});}
 return pts;}
Object.assign(exports,{FULL_SPEED,MIN_BACK,newSwing,feed,toShot,english,strokeFor});
