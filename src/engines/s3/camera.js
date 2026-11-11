// The Mega Drive Sonic camera (Sonic Physics Guide, Sonic 2/3 behaviour), scaled to a phone screen. World px, one
// update per physics frame. The Mega Drive screen is 320x224: the runner may move inside a 16 px wide box (x 144..160)
// before the camera follows, at most 16 px a frame. In the air the vertical box is 64 px tall round the focus line; on the
// ground the camera keeps the runner on the focus line, moving 6 px a frame (16 when running fast). Holding up/down while
// standing pans 104 px up / 88 down after 2 seconds. A spin dash release holds the camera back: it follows the runner's
// position from some frames ago (the position history the real game keeps), so the dash shoots ahead before the camera
// catches up.
// SMOOTH (Nov 11 round 4, owner: tunnels "snap back, not smooth at all"): those rules move an IDEAL camera (ix, iy); the
// camera you see follows it with a critically damped spring that also matches its speed, so it keeps up exactly while the
// ideal moves steadily but never stops dead or jumps (out of a tube the ideal went from 16 px a frame to 0 in two frames).
// SCALE (owner, Nov 11 round 4: "looks great on Amber's phone, too zoomed in on mine... the professional way"): the
// world is drawn at the same size in CSS px on every screen (DENSITY: Amber's phone, 360x780, as it was), so a bigger
// screen shows more level instead of bigger sprites; small or very short screens zoom out to keep a minimum view, huge
// ones stop at a maximum. On top of that the player's zoom (0.6 = closer .. 1.6 = further out), remembered per screen
// shape (tall phone / near-square like an open Fold / landscape) so each screen of a folding phone keeps its own.
// FOCUS: the runner sits at 64% of the view's height, lower on tall views so no more than ~190 px of ground shows below.
const MD_W=320,MD_H=224,FOCUS_Y=.64,DENSITY=1.3,MIN_W=256,MIN_H=200,MAX_W=980,MAX_H=660,BELOW=190;
const ZOOM_MIN=.6,ZOOM_MAX=1.6;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
// which zoom a screen uses: 'tall' phones, 'square'-ish (open folding phones, tablets upright), 'wide' (landscape)
const shapeOf=(W,H)=>W/H<.66?'tall':W/H<1.25?'square':'wide';
// screen px per world px for a screen and a zoom (1 = automatic)
function scaleFor(W,H,zoom=1){let k=DENSITY;k=Math.min(k,W/MIN_W,H/MIN_H);k=Math.max(k,W/MAX_W,H/MAX_H);return clamp(k/clamp(zoom,ZOOM_MIN,ZOOM_MAX),.3,5);}
const OMEGA=.3,ACC=3;// spring rate per frame (critically damped: ~3-4 frames to settle), most speed change a frame (world px)
class Camera{
 constructor(bounds){this.b={...bounds};this.goal={...bounds};this.x=0;this.y=0;this.ix=0;this.iy=0;this.vx=0;this.vy=0;this.ivx=0;this.ivy=0;
  this.k=1;this.vw=MD_W;this.vh=MD_H;this.zoom=1;this.focus=FOCUS_Y;
  this.look=0;this.lookT=0;this.lag=0;this.hist=[];this.locked=false;}
 // screen size in CSS px; returns k (screen px per world px)
 resize(W,H,zoom=this.zoom){this.zoom=zoom;this.k=scaleFor(W,H,zoom);this.vw=W/this.k;this.vh=H/this.k;this.W=W;this.H=H;
  this.focus=Math.max(FOCUS_Y,1-BELOW/this.vh);return this.k;}
 // jump straight to the runner (start of an act, respawn)
 snap(p){this.hist.length=0;this.lag=0;this.look=0;this.lookT=0;this.ix=p.x-this.vw*(152/MD_W);this.iy=this.fy(p)-this.vh*this.focus;
  this.clampIn();this.x=this.ix;this.y=this.iy;this.vx=this.vy=this.ivx=this.ivy=0;}
 fy(p){return p.y-(p.rolling?5:0);}// the ball is 5 px lower than the standing centre: keep the view still
 // spin dash released at rev r (0..8): the camera lags 32 - 2r frames (Sonic 2 style horizontal scroll delay). Only from a
 // standstill, like the real dash: lagging behind a moving runner = the view jumping back to where it was
 dash(rev=0){const h=this.hist,n=h.length;if(n>=4&&Math.hypot(h[n-2]-h[n-4],h[n-1]-h[n-3])>2)return;this.lag=Math.max(this.lag,Math.round(32-2*clamp(rev,0,8)));}
 // change the level limits (boss arenas, Sonic 3's rising bottom edges): the camera's limits move 2 px a frame
 setBounds(b,instant=false){this.goal={...this.goal,...b};if(instant)this.b={...this.goal};}
 update(p){const vw=this.vw,vh=this.vh,ox=this.ix,oy=this.iy;
  this.hist.push(p.x,this.fy(p));if(this.hist.length>128)this.hist.splice(0,2);
  let px=p.x,py=this.fy(p);
  if(this.lag>0){const j=this.hist.length-2-2*this.lag;if(j>=0){px=this.hist[j];}this.lag--;}
  if(!this.locked){
   // horizontal box 144..160 of 320
   const L=this.ix+vw*(144/MD_W),R=this.ix+vw*(160/MD_W);
   if(px<L)this.ix-=Math.min(16,L-px);else if(px>R)this.ix+=Math.min(16,px-R);
   // look up / down (standing still only)
   const want=p.lookUp?-104:p.crouch&&!p.spindash?88:0;
   if(want&&p.ground){if(++this.lookT>=120)this.look=want<0?Math.max(want,this.look-2):Math.min(want,this.look+2);}
   else{this.lookT=0;this.look=this.look>0?Math.max(0,this.look-2):Math.min(0,this.look+2);}
   const fy=this.iy+vh*this.focus+this.look;
   if(p.ground&&!p.hang){const d=py-fy,cap=Math.abs(p.gsp)>=8?16:6;this.iy+=clamp(d,-cap,cap);}
   else{const top=fy-32,bot=fy+32,cap=p.tube?20:16;if(py<top)this.iy-=Math.min(cap,top-py);else if(py>bot)this.iy+=Math.min(cap,py-bot);}}
  this.moveBounds();this.clampIdeal();
  // the camera you see: spring toward the ideal + the ideal's own speed (feed-forward: no lag while it moves steadily)
  const tvx=this.ix-ox,tvy=this.iy-oy;this.ivx=tvx;this.ivy=tvy;
  const K=OMEGA*OMEGA,Cd=2*OMEGA;
  // speed changes capped at ACC a frame: a sudden ideal jump (dropping into a tube, landing) eases in instead of kicking
  this.vx+=clamp(K*(this.ix-this.x)+Cd*(tvx-this.vx),-ACC,ACC);this.vy+=clamp(K*(this.iy-this.y)+Cd*(tvy-this.vy),-ACC,ACC);
  this.x+=this.vx;this.y+=this.vy;
  // never more than a screen's fraction away from the rules' camera (keeps the runner on screen whatever happens)
  const mx=vw*.3,my=vh*.3;if(Math.abs(this.x-this.ix)>mx){this.x=this.ix+Math.sign(this.x-this.ix)*mx;}if(Math.abs(this.y-this.iy)>my){this.y=this.iy+Math.sign(this.y-this.iy)*my;}
  this.clampSeen();}
 moveBounds(){for(const k of ['x0','x1','y0','y1']){const a=this.b[k],g=this.goal[k];if(a!==g)this.b[k]=Math.abs(g-a)<=2?g:a+Math.sign(g-a)*2;}}
 lim(x,y){const b=this.b,vw=this.vw,vh=this.vh;
  // a view wider/taller than the level: centred / sky above (bottom edge kept)
  return [b.x1-b.x0<=vw?(b.x0+b.x1)/2-vw/2:clamp(x,b.x0,b.x1-vw),b.y1-b.y0<=vh?b.y1-vh:clamp(y,b.y0,b.y1-vh)];}
 clampIdeal(){[this.ix,this.iy]=this.lim(this.ix,this.iy);}
 clampSeen(){const [x,y]=this.lim(this.x,this.y);if(x!==this.x){this.x=x;this.vx=0;}if(y!==this.y){this.y=y;this.vy=0;}}
 // after a resize / bounds change from outside: both cameras inside the limits
 clampIn(){this.clampIdeal();this.clampSeen();}
 // world -> screen
 sx(wx){return (wx-this.x)*this.k;}
 sy(wy){return (wy-this.y)*this.k;}
 // the view rectangle in world px with a margin
 view(m=0){return {x0:this.x-m,y0:this.y-m,x1:this.x+this.vw+m,y1:this.y+this.vh+m};}
}
Object.assign(exports,{Camera,MD_W,MD_H,FOCUS_Y,shapeOf,scaleFor,ZOOM_MIN,ZOOM_MAX});
