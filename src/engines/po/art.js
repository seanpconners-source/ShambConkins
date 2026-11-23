// Fight Night (Punch-Out style boxing) drawn figures: stand-ins for the src/data/poSprites.js sheets and the guides on the
// templates. Bodies live in METRES in a body frame (origin = hips, +y up), turned by `rot` (+ = clockwise on screen) and
// drawn at u px per metre. Arms = [upper angle, lower angle] clockwise from the body's up axis (0 up, PI/2 screen right,
// PI down). A glove's `z` (lz / rz) brings it toward the camera (+, bigger: a punch at you) or away (-, smaller).
const PI=Math.PI;
// body types (the sheets GPT draws): shoulder / waist / belly / height / arm thickness
const TYPES={
 lean:{sw:.33,ww:.2,belly:0,h:1,arm:1,skin:'#e6b48e'},
 heavy:{sw:.4,ww:.34,belly:.16,h:1,arm:1.15,skin:'#d79e78'},
 giant:{sw:.46,ww:.3,belly:.05,h:1.14,arm:1.3,skin:'#c98e66'},
 fast:{sw:.31,ww:.19,belly:0,h:.95,arm:.92,skin:'#b9805a'},
 champ:{sw:.42,ww:.24,belly:0,h:1.05,arm:1.22,skin:'#e8b892'}};
// opponent poses (front view, facing the camera). L = the glove on screen LEFT (the boxer's right hand).
const FOE={
 idle:{la:[3.55,.55],ra:[2.73,5.73],lz:.1,rz:.1},
 idle2:{la:[3.6,.5],ra:[2.68,5.78],lz:.1,rz:.1,dy:-.03},
 guardHigh:{la:[3.4,.2],ra:[2.88,6.08],lz:.25,rz:.25},
 guardLow:{la:[3.3,1.15],ra:[2.98,5.13],lz:.25,rz:.25,dy:-.06},
 tellJab:{la:[3.6,.55],ra:[2.4,5.2],lz:.1,rz:-.35,rot:-.08},
 jab:{la:[3.55,.55],ra:[2.6,3.0],lz:.1,rz:1.3,rot:.06,dy:-.04},
 tellHook:{la:[4.3,5.3],ra:[2.73,5.73],lz:-.45,rz:.1,rot:.2},
 hook:{la:[1.75,1.9],ra:[2.73,5.73],lz:1.0,rz:.1,rot:-.22},
 tellUpper:{la:[3.4,2.4],ra:[2.73,5.73],lz:-.25,rz:.1,rot:.1,dy:-.16},
 upper:{la:[2.6,.35],ra:[2.73,5.73],lz:1.1,rz:.1,rot:-.1,dy:.08},
 tellBody:{la:[3.55,.55],ra:[2.3,3.9],lz:.1,rz:-.3,rot:-.12,dy:-.1},
 body:{la:[3.55,.55],ra:[3.1,3.25],lz:.1,rz:1.2,rot:.1,dy:-.12},
 tellSpecial:{la:[5.4,5.9],ra:[.88,.38],lz:-.2,rz:-.2,dy:.06},
 special:{la:[2.0,1.2],ra:[4.28,5.1],lz:1.2,rz:1.2,dy:-.05},
 hurtHead:{la:[4.2,4.6],ra:[2.1,1.7],lz:-.1,rz:-.1,rot:.18,hy:.06,hx:.05},
 hurtBody:{la:[3.2,1.0],ra:[3.08,5.3],lz:.2,rz:.2,dy:-.14,crouch:.25},
 dizzy:{la:[3.4,3.2],ra:[2.9,3.1],lz:0,rz:0,rot:.1},
 block:{la:[3.4,.12],ra:[2.88,6.16],lz:.45,rz:.45,dy:-.04},
 fall:{la:[4.9,5.3],ra:[1.4,1.0],lz:-.2,rz:-.2,rot:-.5,dy:-.3},
 down:{la:[4.9,5.5],ra:[1.3,.8],lz:-.2,rz:-.2,rot:-1.45,dy:-.95},
 getup:{la:[3.8,3.6],ra:[2.5,2.7],lz:0,rz:0,rot:.05,dy:-.4,crouch:.4},
 taunt:{la:[3.55,.55],ra:[.75,.25],lz:.1,rz:-.1,rot:-.06},
 win:{la:[5.75,5.95],ra:[.53,.33],lz:0,rz:0}};
// the player, seen from BEHIND (bottom of the screen). L = screen-left glove (the left hand).
const ME={
 idle:{la:[3.5,.4],ra:[2.78,5.88],lz:0,rz:0},
 jabL:{la:[3.2,.15],ra:[2.78,5.88],lz:-1,rz:0,dy:.03},
 jabR:{la:[3.5,.4],ra:[3.08,6.13],lz:0,rz:-1,dy:.03},
 bodyL:{la:[2.9,1.0],ra:[2.78,5.88],lz:-.9,rz:0,dy:-.05},
 bodyR:{la:[3.5,.4],ra:[3.38,5.28],lz:0,rz:-.9,dy:-.05},
 dodgeL:{la:[3.6,.5],ra:[2.6,5.7],lz:.1,rz:.1,dx:-.55,rot:-.32},
 dodgeR:{la:[3.68,.58],ra:[2.68,5.78],lz:.1,rz:.1,dx:.55,rot:.32},
 duck:{la:[3.3,.3],ra:[2.98,5.98],lz:.1,rz:.1,dy:-.42},
 block:{la:[3.1,.1],ra:[3.18,6.18],lz:-.2,rz:-.2,dy:-.03},
 star1:{la:[3.5,.4],ra:[2.6,3.4],lz:0,rz:.3,dy:-.15,rot:.12},
 star2:{la:[3.5,.4],ra:[2.95,.0],lz:0,rz:-1.1,dy:.12,rot:-.08},
 hurt:{la:[3.9,4.3],ra:[2.4,2.0],lz:.2,rz:.2,dy:-.05,rot:.12},
 tired:{la:[3.2,2.9],ra:[3.08,3.4],lz:.2,rz:.2,dy:-.08},
 down:{la:[4.2,4.4],ra:[2.1,1.9],lz:0,rz:0,dy:-1.1,rot:.3},
 getup:{la:[3.4,3.0],ra:[2.88,3.2],lz:0,rz:0,dy:-.55},
 win:{la:[5.75,5.95],ra:[.53,.33],lz:0,rz:0}};
const lerp=(a,b,k)=>a+(b-a)*k;
function blendPose(A,B,k){const o={};for(const key of new Set([...Object.keys(A),...Object.keys(B)])){const a=A[key]??(Array.isArray(B[key])?B[key]:0),b=B[key]??(Array.isArray(a)?a:0);o[key]=Array.isArray(a)?a.map((v,i)=>lerp(v,b[i],k)):lerp(a,b,k);}return o;}
function frame(x,y,u,rot){const c=Math.cos(rot),s=Math.sin(rot);return (lx,ly)=>[x+(lx*c+ly*s)*u,y-(-lx*s+ly*c)*u];}
function poly(g,P,pts,fill,stroke){g.beginPath();pts.forEach((p,i)=>{const q=P(...p);i?g.lineTo(...q):g.moveTo(...q);});g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke();}}
function glove(g,x,y,r,col,shine=true){const gr=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);gr.addColorStop(0,'#ffffff90');gr.addColorStop(.25,col);gr.addColorStop(1,shade(col,-.45));
 g.fillStyle=gr;g.beginPath();g.ellipse(x,y,r,r*.92,0,0,7);g.fill();g.strokeStyle='#0008';g.lineWidth=Math.max(1,r*.08);g.stroke();
 g.fillStyle='#fff';g.fillRect(x-r*.55,y+r*.55,r*1.1,r*.28);}
function shade(hex,k){const n=parseInt(hex.slice(1,7),16);let r=n>>16,gg=n>>8&255,b=n&255;const f=v=>Math.round(clamp(k<0?v*(1+k):v+(255-v)*k,0,255));return '#'+[f(r),f(gg),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// arm from the shoulder: returns the glove spot [x,y] and its scale
function arm(g,P,sh,ang,len,w,skin,z,u){const [a1,a2]=ang,k=len/2,ex=sh[0]+Math.sin(a1)*k,ey=sh[1]+Math.cos(a1)*k,fl=k*(1-Math.min(.7,Math.max(0,z)*.35)),fx=ex+Math.sin(a2)*fl,fy=ey+Math.cos(a2)*fl;
 const A=P(...sh),B=P(ex,ey),C=P(fx,fy);g.strokeStyle=skin;g.lineCap='round';g.lineJoin='round';g.lineWidth=w*u;g.beginPath();g.moveTo(...A);g.lineTo(...B);g.lineTo(...C);g.stroke();
 g.strokeStyle=shade(skin,-.25);g.lineWidth=w*u*.35;g.beginPath();g.moveTo(...B);g.lineTo(...C);g.stroke();return C;}
// opponent, front view. kit = {skin,trunks,gloves,shoes,belt}; returns {head:[x,y,d], gloves:[[x,y,r],[x,y,r]]}
function drawFoe(g,pose,x,y,u,type=TYPES.heavy,kit={},{alpha=1,flash=0}={}){g.save();g.globalAlpha*=alpha;
 const T=type,H=T.h,skin=kit.skin||T.skin,cr=pose.crouch||0;u*=H;
 const P=frame(x+(pose.dx||0)*u,y-(pose.dy||0)*u,u,pose.rot||0),sw=T.sw,ww=T.ww,trunks=kit.trunks||'#c0262e',gl=kit.gloves||'#d42a2a';
 // legs (behind)
 const legL=.95*(1-cr*.4);for(const s of[-1,1]){const hip=[s*.13,-.3],kn=[s*.17,-.3-legL*.5],ft=[s*.2,-.3-legL];g.strokeStyle=skin;g.lineCap='round';g.lineWidth=.17*u;g.beginPath();g.moveTo(...P(...hip));g.lineTo(...P(...kn));g.lineTo(...P(...ft));g.stroke();
  const f=P(...ft);g.fillStyle=kit.shoes||'#202028';g.beginPath();g.ellipse(f[0],f[1],.12*u,.07*u,0,0,7);g.fill();}
 // torso
 const gr=g.createLinearGradient(...P(-sw,.4),...P(sw,.4));gr.addColorStop(0,shade(skin,-.2));gr.addColorStop(.5,shade(skin,.08));gr.addColorStop(1,shade(skin,-.25));
 poly(g,P,[[-sw,.52],[sw,.52],[ww+T.belly,.05],[ww,-.05],[-ww,-.05],[-ww-T.belly,.05]],gr,'#0005');
 // chest/abs lines
 g.strokeStyle=shade(skin,-.3);g.lineWidth=Math.max(1,u*.012);g.beginPath();g.moveTo(...P(0,.45));g.lineTo(...P(0,.1));g.stroke();for(const s of[-1,1]){g.beginPath();g.moveTo(...P(s*.05,.33));g.quadraticCurveTo(...P(s*sw*.6,.36),...P(s*sw*.8,.42));g.stroke();}
 // trunks + belt
 poly(g,P,[[-ww-.04,.0],[ww+.04,.0],[ww+.08,-.34],[.02,-.3],[-.02,-.3],[-ww-.08,-.34]],trunks,'#0006');
 poly(g,P,[[-ww-.04,.04],[ww+.04,.04],[ww+.04,-.04],[-ww-.04,-.04]],kit.belt||'#f2f2f2');
 // neck + head spot
 const nk=P(0,.6),hd=P(.0+(pose.hx||0),.78+(pose.hy||0));g.strokeStyle=skin;g.lineWidth=.17*u;g.beginPath();g.moveTo(...P(0,.48));g.lineTo(...nk);g.stroke();
 // arms + gloves (the glove nearer the camera drawn last)
 const at=T.arm,gs=[];
 const sides=[[-1,pose.la,pose.lz||0],[1,pose.ra,pose.rz||0]].sort((a,b)=>a[2]-b[2]);
 for(const [s,ang,z] of sides){const sh=[s*(sw-.04),.46],c=arm(g,P,sh,ang,.66,.15*at,skin,z,u),r=.15*at*u*(1+z*.55);
  if(flash>0){g.save();g.shadowColor='#fff27a';g.shadowBlur=r*1.2*flash;glove(g,c[0],c[1],r,gl);g.restore();}else glove(g,c[0],c[1],r,gl);gs[s<0?0:1]=[c[0],c[1],r];}
 g.restore();return {head:[hd[0],hd[1],.42*u],gloves:gs,neck:nk};}
function guardSpot(P,sh,[a1,a2]){const k=.33,ex=sh[0]+Math.sin(a1)*k,ey=sh[1]+Math.cos(a1)*k;return P(ex+Math.sin(a2)*k,ey+Math.cos(a2)*k);}
// the player from behind. kit = {skin,trunks,gloves,hair}
function drawMe(g,pose,x,y,u,kit={},opts={}){const {alpha=1,outline=false}=opts;g.save();g.globalAlpha*=alpha;
 const P=frame(x+(pose.dx||0)*u,y-(pose.dy||0)*u,u,pose.rot||0),skin=kit.skin||'#d9a27c',gl=kit.gloves||'#2f6fe0',sw=.4;
 const gr=g.createLinearGradient(...P(-sw,.3),...P(sw,.3));gr.addColorStop(0,shade(skin,-.3));gr.addColorStop(.5,shade(skin,.05));gr.addColorStop(1,shade(skin,-.3));
 // back + trunks (cut at the screen bottom)
 poly(g,P,[[-sw,.5],[sw,.5],[.27,-.05],[.3,-.6],[-.3,-.6],[-.27,-.05]],gr,outline?'#9fd2ff':'#0005');
 g.strokeStyle=shade(skin,-.35);g.lineWidth=Math.max(1,u*.012);g.beginPath();g.moveTo(...P(0,.42));g.lineTo(...P(0,-.02));g.stroke();
 for(const s of[-1,1]){g.beginPath();g.moveTo(...P(s*.08,.38));g.quadraticCurveTo(...P(s*.22,.3),...P(s*.16,.14));g.stroke();}
 poly(g,P,[[-.29,-.04],[.29,-.04],[.31,-.6],[-.31,-.6]],kit.trunks||'#2f6fe0','#0006');poly(g,P,[[-.29,0],[.29,0],[.29,-.08],[-.29,-.08]],'#f2f2f2');
 // neck + back of the head
 const nk=P(0,.6),hd=P(0,.8);g.strokeStyle=skin;g.lineWidth=.17*u;g.beginPath();g.moveTo(...P(0,.45));g.lineTo(...nk);g.stroke();
 // arms: gloves going forward (z < 0) get smaller and rise toward the target
 const gs=[],R=opts.reach;for(const [s,ang,z] of [[-1,pose.la,pose.lz||0],[1,pose.ra,pose.rz||0]]){const sh=[s*(sw-.04),.44];
  // a punch: the glove travels from its guard spot to the target (screen px) and shrinks as it goes away from us
  if(R&&R.side===s&&R.k>0){const S=P(...sh),g0=guardSpot(P,sh,ang),k=R.k,tx=g0[0]+(R.x-g0[0])*k,ty=g0[1]+(R.y-g0[1])*k,ex=(S[0]+tx)/2+s*u*.12*(1-k),ey=(S[1]+ty)/2+u*.1;
   g.strokeStyle=skin;g.lineCap='round';g.lineJoin='round';g.lineWidth=.16*u*(1-k*.35);g.beginPath();g.moveTo(...S);g.lineTo(ex,ey);g.lineTo(tx,ty);g.stroke();gs[s<0?0:1]=[tx,ty,.16*u*(1-k*.45)];continue;}
  const c=arm(g,P,sh,ang,.66,.16,skin,0,u),r=.16*u*(1+Math.max(-.55,z*.5));gs[s<0?0:1]=[c[0],c[1],r];}
 g.restore();return {head:[hd[0],hd[1],.42*u],gloves:gs,neck:nk,gl};}
function drawGloves(g,gs,col){for(const q of gs)if(q)glove(g,q[0],q[1],q[2],col);}
// back of a head (the player seen from behind)
function backOfHead(g,x,y,d,hair='#2a1a10',skin='#d9a27c'){g.fillStyle=skin;for(const s of[-1,1]){g.beginPath();g.ellipse(x+s*d*.47,y+d*.06,d*.09,d*.15,0,0,7);g.fill();}
 g.fillStyle=hair;g.beginPath();g.ellipse(x,y,d*.46,d*.52,0,0,7);g.fill();g.fillStyle='#ffffff16';g.beginPath();g.ellipse(x-d*.13,y-d*.22,d*.16,d*.1,-.5,0,7);g.fill();}
// referee (front view, own design, full figure with a plain face)
function drawRef(g,x,y,u,pose='stand',k=0){const P=frame(x,y,u,0),skin='#d7a07a';
 for(const s of[-1,1]){g.strokeStyle='#1a1a1e';g.lineCap='round';g.lineWidth=.17*u;g.beginPath();g.moveTo(...P(s*.12,-.3));g.lineTo(...P(s*.15,-1.25));g.stroke();}
 poly(g,P,[[-.3,.52],[.3,.52],[.24,-.32],[-.24,-.32]],'#f4f4f4','#0006');g.save();g.beginPath();const c=[P(-.3,.52),P(.3,.52),P(.24,-.32),P(-.24,-.32)];g.moveTo(...c[0]);c.slice(1).forEach(q=>g.lineTo(...q));g.closePath();g.clip();
 g.fillStyle='#111';for(let i=-3;i<=3;i++)poly(g,P,[[i*.1-.025,.6],[i*.1+.025,.6],[i*.1+.025,-.4],[i*.1-.025,-.4]],'#111');g.restore();
 const up=pose==='count'?[[3.3,2.4+Math.sin(k*PI)*.9]]:pose==='wave'?[[.6+Math.sin(k*12)*.4,.2]]:pose==='raise'?[[.2,.1]]:[[3.3,3.0]];
 arm(g,P,[.28,.46],up[0],.62,.11,skin,0,u);arm(g,P,[-.28,.46],[3.0,3.2],.62,.11,skin,0,u);
 g.strokeStyle=skin;g.lineWidth=.14*u;g.beginPath();g.moveTo(...P(0,.48));g.lineTo(...P(0,.62));g.stroke();
 const h=P(0,.78);g.fillStyle=skin;g.beginPath();g.ellipse(h[0],h[1],.15*u,.18*u,0,0,7);g.fill();g.fillStyle='#ddd';g.beginPath();g.ellipse(h[0],h[1]-.11*u,.15*u,.08*u,0,PI,0);g.fill();
 g.fillStyle='#222';for(const s of[-1,1]){g.beginPath();g.arc(h[0]+s*.05*u,h[1]-.01*u,.018*u,0,7);g.fill();}g.fillRect(h[0]-.04*u,h[1]+.07*u,.08*u,.015*u);
 g.fillStyle='#111';g.fillRect(...P(-.07,.55),.14*u,.05*u);}
Object.assign(exports,{TYPES,FOE,ME,blendPose,drawFoe,drawMe,drawGloves,glove,backOfHead,drawRef,shade});
