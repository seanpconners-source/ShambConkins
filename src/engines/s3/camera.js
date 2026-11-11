// The Mega Drive Sonic camera (Sonic Physics Guide, Sonic 2/3 behaviour), scaled to a phone screen. World px, one
// update per physics frame. The Mega Drive screen is 320x224: the runner may move inside a 16 px wide box (x 144..160)
// before the camera follows, at most 16 px a frame. In the air the vertical box is 64 px tall round y 96; on the ground
// the camera keeps the runner at y 96, moving 6 px a frame (16 when running fast). Holding up/down while standing pans
// 104 px up / 88 down after 2 seconds. A spin dash release holds the camera back: it follows the runner's position from
// some frames ago (the position history the real game keeps), so the dash shoots ahead before the camera catches up.
// On a phone the view is the screen size divided by k = min(H/224, W/320): landscape phones see the Mega Drive height
// and more width, portrait phones the Mega Drive width and much more height; the boxes keep the same fractions.
// Owner, Nov 11: too much ground on screen, the runner dead centre: the runner sits at 58% of the view's height (the Mega
// Drive's 96/224 = 43% left more than half a tall phone screen showing ground), and very tall portrait views zoom in a
// little (at least 480 world px tall instead of the full width-fit height).
// Nov 11 round 2 (owner): a little less ground again (.64) and zoomed out a touch (ZOOM_OUT: about 12% more level on screen)
// Nov 11 round 3 (owner): zoomed out more (.8: about a quarter more level on screen than the Mega Drive fraction)
const MD_W=320,MD_H=224,FOCUS_Y=.64,ZOOM_OUT=.8;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
class Camera{
 constructor(bounds){this.b={...bounds};this.goal={...bounds};this.x=0;this.y=0;this.k=1;this.vw=MD_W;this.vh=MD_H;
  this.look=0;this.lookT=0;this.lag=0;this.hist=[];this.locked=false;this.glide=0;}
 // screen size in CSS px; returns k (screen px per world px)
 resize(W,H){this.k=clamp(Math.max(Math.min(H/MD_H,W/MD_W),H/480)*ZOOM_OUT,.7,4);this.vw=W/this.k;this.vh=H/this.k;this.W=W;this.H=H;return this.k;}
 // jump straight to the runner (start of an act, respawn)
 snap(p){this.hist.length=0;this.lag=0;this.look=0;this.lookT=0;this.x=p.x-this.vw*(152/MD_W);this.y=this.fy(p)-this.vh*FOCUS_Y;this.clampIn();}
 fy(p){return p.y-(p.rolling?5:0);}// the ball is 5 px lower than the standing centre: keep the view still
 // spin dash released at rev r (0..8): the camera lags 32 - 2r frames (Sonic 2 style horizontal scroll delay)
 dash(rev=0){this.lag=Math.max(this.lag,Math.round(32-2*clamp(rev,0,8)));}
 // change the level limits (boss arenas, Sonic 3's rising bottom edges): the camera's limits move 2 px a frame
 setBounds(b,instant=false){this.goal={...this.goal,...b};if(instant)this.b={...this.goal};}
 update(p){const vw=this.vw,vh=this.vh;
  this.hist.push(p.x,this.fy(p));if(this.hist.length>128)this.hist.splice(0,2);
  let px=p.x,py=this.fy(p);
  if(this.lag>0){const j=this.hist.length-2-2*this.lag;if(j>=0){px=this.hist[j];}this.lag--;}
  // riding a warp tube (owner, Nov 11: "the camera was jarring"): the ball moves 11-16 px a frame through S-bends, so the
  // box rules snapped and stalled; instead the camera glides after it (eased, capped), and keeps gliding a moment after
  // the tube lets go (glide) so the hand-back to the normal rules is soft too
  if(p.tube)this.glide=24;
  if(!this.locked&&this.glide>0){this.glide--;const tx=px-vw*(152/MD_W),ty=py-vh*FOCUS_Y,e=p.tube?.16:.12;
   this.x+=clamp((tx-this.x)*e,-22,22);this.y+=clamp((ty-this.y)*e,-22,22);this.moveBounds();this.clampIn();return;}
  if(!this.locked){
   // horizontal box 144..160 of 320
   const L=this.x+vw*(144/MD_W),R=this.x+vw*(160/MD_W);
   if(px<L)this.x-=Math.min(16,L-px);else if(px>R)this.x+=Math.min(16,px-R);
   // look up / down (standing still only)
   const want=p.lookUp?-104:p.crouch&&!p.spindash?88:0;
   if(want&&p.ground){if(++this.lookT>=120)this.look=want<0?Math.max(want,this.look-2):Math.min(want,this.look+2);}
   else{this.lookT=0;this.look=this.look>0?Math.max(0,this.look-2):Math.min(0,this.look+2);}
   const fy=this.y+vh*FOCUS_Y+this.look;
   if(p.ground&&!p.hang){const d=py-fy,cap=Math.abs(p.gsp)>=8?16:6;this.y+=clamp(d,-cap,cap);}
   else{const top=fy-32,bot=fy+32;if(py<top)this.y-=Math.min(16,top-py);else if(py>bot)this.y+=Math.min(16,py-bot);}}
  this.moveBounds();this.clampIn();}
 moveBounds(){for(const k of ['x0','x1','y0','y1']){const a=this.b[k],g=this.goal[k];if(a!==g)this.b[k]=Math.abs(g-a)<=2?g:a+Math.sign(g-a)*2;}}
 clampIn(){const b=this.b,vw=this.vw,vh=this.vh;
  this.x=b.x1-b.x0<=vw?(b.x0+b.x1)/2-vw/2:clamp(this.x,b.x0,b.x1-vw);
  // a view taller than the level shows sky above (bottom edge kept)
  this.y=b.y1-b.y0<=vh?b.y1-vh:clamp(this.y,b.y0,b.y1-vh);}
 // world -> screen
 sx(wx){return (wx-this.x)*this.k;}
 sy(wy){return (wy-this.y)*this.k;}
 // the view rectangle in world px with a margin
 view(m=0){return {x0:this.x-m,y0:this.y-m,x1:this.x+this.vw+m,y1:this.y+this.vh+m};}
}
Object.assign(exports,{Camera,MD_W,MD_H,FOCUS_Y});
