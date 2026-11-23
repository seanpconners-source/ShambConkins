// Penalty Shootout drawn figures (stand-ins for src/data/pkSprites.js sheets, and the guides on the templates).
// Bodies are built in METRES in a body frame (origin = body centre ~1 m off the ground, +y up), turned by `rot`
// (0 upright, + leans to screen right) and drawn at u px per metre. Limbs = [upper angle, lower angle] measured
// clockwise from the body's up axis (0 up, PI/2 screen right, PI down).
const PI=Math.PI;
const KITS={
 p1:{shirt:'#2f6fe0',trim:'#e8f0ff',shorts:'#f4f6fa',socks:'#2f6fe0',boots:'#111',num:'10',skin:'#d9a27c',hair:'#3a2616'},
 p2:{shirt:'#d8343c',trim:'#ffe2e2',shorts:'#15151c',socks:'#d8343c',boots:'#f2f2f2',num:'9',skin:'#e0b08c',hair:'#6a3a1a'},
 kp1:{shirt:'#7ad21e',trim:'#1e3a06',shorts:'#111',socks:'#7ad21e',boots:'#111',glove:'#fff',skin:'#d9a27c'},
 kp2:{shirt:'#ff4fa8',trim:'#4a0a2a',shorts:'#1a2244',socks:'#ff4fa8',boots:'#111',glove:'#ff8a1e',skin:'#e0b08c'},
 kcpu:{shirt:'#ffd21e',trim:'#111',shorts:'#111',socks:'#ffd21e',boots:'#111',glove:'#9aa0a8',skin:'#c99a74'},
 wall:{shirt:'#ececec',trim:'#222',shorts:'#222',socks:'#ececec',boots:'#111',skin:'#d0a07c'}};
// keeper poses (front view). The game blends between them while a dive plays.
const KEEPER={
 ready:{rot:0,crouch:.18,la:[4.0,5.4],ra:[2.28,.88],ll:[3.36,3.24],rl:[2.92,3.04]},
 set:{rot:0,crouch:.3,la:[4.3,5.9],ra:[1.98,.38],ll:[3.5,3.2],rl:[2.78,3.08]},
 'dive-low':{rot:1.38,crouch:0,la:[.12,.05],ra:[.45,.3],ll:[3.3,3.4],rl:[2.9,3.2]},
 'dive-mid':{rot:1.0,crouch:0,la:[.35,.25],ra:[.85,.6],ll:[3.5,3.6],rl:[2.75,3.0]},
 'dive-high':{rot:.6,crouch:0,la:[.05,.02],ra:[.45,.3],ll:[3.6,3.9],rl:[2.85,3.3]},
 jump:{rot:0,crouch:0,la:[6.0,6.15],ra:[.3,.15],ll:[3.3,3.5],rl:[2.98,2.8]},
 crouch:{rot:0,crouch:.46,la:[3.6,2.9],ra:[2.7,3.4],ll:[4.1,2.6],rl:[2.2,3.7]},
 catch:{rot:0,crouch:.12,la:[3.5,1.4],ra:[2.8,4.9],ll:[3.3,3.2],rl:[2.98,3.08]},
 cheer:{rot:0,crouch:0,la:[5.75,5.95],ra:[.53,.33],ll:[3.32,3.25],rl:[2.96,3.03]},
 sad:{rot:.12,crouch:.32,la:[3.25,3.05],ra:[3.0,3.3],ll:[3.4,3.2],rl:[2.9,3.1]}};
// striker poses seen from behind (no rot: the run-up is straight at the ball)
const STRIKER={
 idle:{lean:0,la:[3.4,3.3],ra:[2.88,2.98],ll:[3.26,3.2],rl:[3.02,3.08]},
 run1:{lean:.12,la:[3.9,4.6],ra:[2.4,1.6],ll:[3.6,3.9],rl:[2.82,2.0]},
 run2:{lean:.12,la:[3.3,3.1],ra:[3.0,2.9],ll:[3.2,2.5],rl:[3.1,3.6]},
 run3:{lean:.12,la:[2.6,1.8],ra:[3.7,4.5],ll:[2.8,2.2],rl:[3.5,3.95]},
 plant:{lean:-.08,la:[4.3,4.0],ra:[1.9,1.6],ll:[3.3,3.1],rl:[2.4,2.0]},
 strike:{lean:-.15,la:[4.6,4.4],ra:[1.7,1.4],ll:[3.35,3.25],rl:[3.6,3.9]},
 follow:{lean:-.05,la:[4.2,4.6],ra:[2.2,1.9],ll:[3.3,3.2],rl:[4.2,4.0]},
 cheer:{lean:0,front:true,la:[5.7,5.9],ra:[.58,.38],ll:[3.35,3.25],rl:[2.93,3.03]}};
const lerp=(a,b,k)=>a+(b-a)*k;
function blendPose(A,B,k){const o={};for(const key of Object.keys(A)){const a=A[key],b=B[key]??a;o[key]=Array.isArray(a)?a.map((v,i)=>lerp(v,b[i],k)):typeof a==='number'?lerp(a,b,k):k<.5?a:b;}return o;}
function frame(x,y,u,rot){const c=Math.cos(rot),s=Math.sin(rot);return (lx,ly)=>[x+(lx*c+ly*s)*u,y-(-lx*s+ly*c)*u];}
function limb(g,P,j,ang,len,w,col,end,endCol,endR){const [a1,a2]=ang,k=len/2;
 const ex=j[0]+Math.sin(a1)*k,ey=j[1]+Math.cos(a1)*k,fx=ex+Math.sin(a2)*k,fy=ey+Math.cos(a2)*k;
 const A=P(...j),B=P(ex,ey),C=P(fx,fy);g.strokeStyle=col;g.lineCap='round';g.lineJoin='round';g.lineWidth=w;g.beginPath();g.moveTo(...A);g.lineTo(...B);g.lineTo(...C);g.stroke();
 if(end){g.fillStyle=endCol;g.beginPath();g.arc(C[0],C[1],endR,0,7);g.fill();}return C;}
// keeper, front view. pose = KEEPER entry or a blend; mirror = dive to screen left. Returns {head:[x,y,d], hands:[[x,y],[x,y]]}
function drawKeeper(g,pose,x,y,u,kit=KITS.kcpu,{mirror=false,alpha=1}={}){g.save();g.globalAlpha*=alpha;
 if(mirror){g.translate(x,0);g.scale(-1,1);g.translate(-x,0);}
 const P=frame(x,y,u,pose.rot),cr=pose.crouch||0,hip=[0,-.06+cr*.2],sh=[0,.48],legL=.92*(1-cr*.45);
 // legs, then shorts, shirt, arms
 const skin=kit.skin;
 limb(g,P,[-.1,hip[1]],pose.ll,legL,.17*u,kit.socks,true,kit.boots,.1*u);limb(g,P,[.1,hip[1]],pose.rl,legL,.17*u,kit.socks,true,kit.boots,.1*u);
 limb(g,P,[-.1,hip[1]],[pose.ll[0],pose.ll[0]],legL*.42,.2*u,kit.shorts);limb(g,P,[.1,hip[1]],[pose.rl[0],pose.rl[0]],legL*.42,.2*u,kit.shorts);
 g.fillStyle=kit.shorts;poly(g,P,[[-.2,hip[1]+.12],[.2,hip[1]+.12],[.22,hip[1]-.14],[-.22,hip[1]-.14]]);
 g.fillStyle=kit.shirt;poly(g,P,[[-.25,sh[1]+.04],[.25,sh[1]+.04],[.2,hip[1]+.1],[-.2,hip[1]+.1]]);
 g.fillStyle=kit.trim;poly(g,P,[[-.25,sh[1]+.04],[.25,sh[1]+.04],[.24,sh[1]-.02],[-.24,sh[1]-.02]]);
 const hL=limb(g,P,[-.22,sh[1]],pose.la,.64,.13*u,kit.shirt,true,kit.glove||skin,.11*u),hR=limb(g,P,[.22,sh[1]],pose.ra,.64,.13*u,kit.shirt,true,kit.glove||skin,.11*u);
 const nk=P(0,.6),hd=P(0,.76);g.strokeStyle=skin;g.lineWidth=.12*u;g.beginPath();g.moveTo(...P(0,sh[1]));g.lineTo(...nk);g.stroke();
 g.restore();const mx=v=>mirror?2*x-v:v;
 return {head:[mx(hd[0]),hd[1],.36*u],hands:[[mx(hL[0]),hL[1]],[mx(hR[0]),hR[1]]],neck:[mx(nk[0]),nk[1]]};}
// striker seen from behind; cheer = turned round (front). Returns {head:[x,y,d], foot:[x,y]}
function drawStriker(g,pose,x,y,u,kit=KITS.p1,{alpha=1}={}){g.save();g.globalAlpha*=alpha;
 const lean=pose.lean||0,P=frame(x,y-.98*u,u,lean),hip=[0,-.04],sh=[0,.5];
 limb(g,P,[-.1,hip[1]],pose.ll,.92,.18*u,kit.socks,true,kit.boots,.1*u);const ft=limb(g,P,[.1,hip[1]],pose.rl,.92,.18*u,kit.socks,true,kit.boots,.1*u);
 limb(g,P,[-.1,hip[1]],[pose.ll[0],pose.ll[0]],.38,.21*u,kit.shorts);limb(g,P,[.1,hip[1]],[pose.rl[0],pose.rl[0]],.38,.21*u,kit.shorts);
 g.fillStyle=kit.shorts;poly(g,P,[[-.21,hip[1]+.12],[.21,hip[1]+.12],[.23,hip[1]-.14],[-.23,hip[1]-.14]]);
 limb(g,P,[-.24,sh[1]],pose.la,.64,.12*u,kit.skin,true,kit.skin,.07*u);limb(g,P,[.24,sh[1]],pose.ra,.64,.12*u,kit.skin,true,kit.skin,.07*u);
 limb(g,P,[-.24,sh[1]],[pose.la[0],pose.la[0]],.22,.15*u,kit.shirt);limb(g,P,[.24,sh[1]],[pose.ra[0],pose.ra[0]],.22,.15*u,kit.shirt);
 g.fillStyle=kit.shirt;poly(g,P,[[-.26,sh[1]+.04],[.26,sh[1]+.04],[.21,hip[1]+.1],[-.21,hip[1]+.1]]);
 if(!pose.front){const c=P(0,.24);g.fillStyle=kit.trim;g.font=`900 ${.3*u}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(kit.num||'',c[0],c[1]);}
 const nk=P(0,.6),hd=P(0,.77);g.strokeStyle=kit.skin;g.lineWidth=.12*u;g.beginPath();g.moveTo(...P(0,sh[1]));g.lineTo(...nk);g.stroke();
 g.restore();return {head:[hd[0],hd[1],.36*u],foot:ft,neck:nk};}
// the back of a head (striker seen from behind): hair dome + ears
function backOfHead(g,x,y,d,hair='#3a2616',skin='#d9a27c'){g.fillStyle=skin;for(const s of[-1,1]){g.beginPath();g.ellipse(x+s*d*.46,y+d*.04,d*.09,d*.15,0,0,7);g.fill();}
 g.fillStyle=hair;g.beginPath();g.ellipse(x,y,d*.46,d*.52,0,0,7);g.fill();g.fillStyle='#ffffff18';g.beginPath();g.ellipse(x-d*.12,y-d*.2,d*.16,d*.1,-.5,0,7);g.fill();}
function poly(g,P,pts){g.beginPath();pts.forEach((p,i)=>{const q=P(...p);i?g.lineTo(...q):g.moveTo(...q);});g.closePath();g.fill();}
// match ball: white with dark panels, turned by spin angle
function drawBall(g,x,y,r,spin=0,img=null){if(img){g.save();g.translate(x,y);g.rotate(spin);g.drawImage(img,-r,-r,r*2,r*2);g.restore();return;}
 const gr=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);gr.addColorStop(0,'#fff');gr.addColorStop(.7,'#e6e8ec');gr.addColorStop(1,'#9aa0aa');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();
 g.save();g.beginPath();g.arc(x,y,r,0,7);g.clip();g.fillStyle='#1b1d24';for(let k=0;k<5;k++){const a=spin+k*1.2566;g.beginPath();g.arc(x+Math.cos(a)*r*.62,y+Math.sin(a)*r*.62,r*.24,0,7);g.fill();}g.beginPath();g.arc(x+Math.cos(spin*1.3)*r*.12,y+Math.sin(spin*1.3)*r*.12,r*.22,0,7);g.fill();g.restore();
 g.strokeStyle='#0005';g.lineWidth=Math.max(1,r*.08);g.beginPath();g.arc(x,y,r,0,7);g.stroke();}
// defender in the wall (front view, hands crossed)
function drawWallMan(g,x,y,u,kit=KITS.wall,jump=0){const P=frame(x,y-(.98+jump)*u,u,0);
 limb(g,P,[-.1,-.04],[3.2,3.15],.92,.18*u,kit.socks,true,kit.boots,.1*u);limb(g,P,[.1,-.04],[3.08,3.13],.92,.18*u,kit.socks,true,kit.boots,.1*u);
 g.fillStyle=kit.shorts;poly(g,P,[[-.21,.08],[.21,.08],[.23,-.18],[-.23,-.18]]);g.fillStyle=kit.shirt;poly(g,P,[[-.26,.54],[.26,.54],[.21,.06],[-.21,.06]]);
 limb(g,P,[-.24,.5],[3.0,1.9],.5,.12*u,kit.shirt,true,kit.skin,.08*u);limb(g,P,[.24,.5],[3.28,4.38],.5,.12*u,kit.shirt,true,kit.skin,.08*u);
 const nk=P(0,.6),hd=P(0,.77);g.strokeStyle=kit.skin;g.lineWidth=.12*u;g.beginPath();g.moveTo(...P(0,.5));g.lineTo(...nk);g.stroke();return {head:[hd[0],hd[1],.36*u]};}
Object.assign(exports,{KITS,KEEPER,STRIKER,blendPose,drawKeeper,drawStriker,drawWallMan,drawBall,backOfHead});
