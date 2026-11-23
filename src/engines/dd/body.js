// THE WARRIORS (Double Dragon style): the fighters' bodies. A body is drawn from a POSE (joint angles), so every move is a
// few key poses the game blends between: fluid, and the face sits on the neck in every frame. When the owner's sprite
// sheets are in (src/data/ddSprites.js), the sheet frame is drawn instead and the same pose table picks the frame.
// Units: a fighter is 100 tall, feet at (0,0), facing right (+x), y down. Angles in degrees from straight DOWN, positive =
// turned toward the way the fighter faces. Limbs use absolute angles (upper and lower part each their own).
const D2R=Math.PI/180;
const SEG={torso:30,neck:6,head:13,ua:16,fa:15,th:24,sh:25};
// key poses (y = hip drop, t = torso lean, h = head tilt, A = back arm [upper, fore], B = front arm, L = back leg [thigh,
// shin], R = front leg, rot = whole body turn (knockdowns, flips), lie = lying on the ground)
const P={
 stand:{y:0,t:4,h:0,A:[16,118],B:[26,134],L:[-13,-6],R:[13,4]},
 stand2:{y:1.5,t:6,h:2,A:[18,122],B:[28,138],L:[-13,-6],R:[13,4]},
 walk1:{y:0,t:6,h:0,A:[-6,95],B:[42,128],L:[-26,-8],R:[24,16]},
 walk2:{y:1.5,t:6,h:0,A:[12,112],B:[22,128],L:[2,-24],R:[-2,-18]},
 walk3:{y:0,t:6,h:0,A:[32,128],B:[4,105],L:[22,12],R:[-24,-44]},
 run1:{y:2,t:18,h:-4,A:[-40,60],B:[60,125],L:[-40,-75],R:[48,20]},
 run2:{y:-1,t:18,h:-4,A:[55,130],B:[-35,70],L:[45,22],R:[-38,-80]},
 jabC:{y:1,t:8,h:0,A:[18,122],B:[30,150],L:[-15,-6],R:[16,4]},
 jab:{y:1,t:14,h:-2,A:[14,120],B:[88,90],L:[-16,-6],R:[18,4]},
 cross:{y:2,t:20,h:-2,A:[86,88],B:[22,130],L:[-22,-10],R:[20,6]},
 hookC:{y:2,t:-4,h:0,A:[20,120],B:[40,150],L:[-15,-6],R:[16,4]},
 hook:{y:3,t:24,h:-4,A:[10,110],B:[92,140],L:[-24,-8],R:[22,8]},
 upC:{y:9,t:22,h:4,A:[20,115],B:[-12,30],L:[-22,-4],R:[30,-4]},
 up:{y:-5,t:-10,h:-10,A:[6,100],B:[160,172],L:[-10,-4],R:[8,0]},
 kickC:{y:1,t:-6,h:0,A:[-20,70],B:[40,110],L:[-8,-4],R:[82,-25]},
 kick:{y:0,t:-22,h:0,A:[-35,40],B:[40,95],L:[-6,-2],R:[94,92]},
 bkick:{y:0,t:32,h:-6,A:[50,120],B:[60,125],L:[-100,-96],R:[6,0]},
 elbowC:{y:1,t:-4,h:0,A:[20,130],B:[26,134],L:[-13,-6],R:[13,4]},
 elbow:{y:1,t:-12,h:-6,A:[-92,8],B:[30,120],L:[-18,-6],R:[16,4]},
 jump:{y:-6,t:8,h:0,A:[40,130],B:[70,140],L:[30,-40],R:[65,-10]},
 jkick:{y:-6,t:-16,h:0,A:[-30,50],B:[50,110],L:[20,-70],R:[76,78]},
 spin:{y:-8,t:-6,h:0,A:[-80,-60],B:[80,90],L:[-20,-40],R:[90,90]},
 kneeC:{y:2,t:14,h:4,A:[64,56],B:[72,64],L:[-12,-4],R:[40,-10]},
 knee:{y:-2,t:4,h:0,A:[60,40],B:[70,48],L:[-6,-2],R:[104,-12]},
 grab:{y:2,t:14,h:2,A:[66,56],B:[74,62],L:[-18,-6],R:[18,4]},
 throw1:{y:8,t:30,h:6,A:[110,150],B:[115,155],L:[-30,-10],R:[30,0]},
 throw2:{y:0,t:-40,h:-10,A:[190,200],B:[185,195],L:[-24,-8],R:[18,0]},
 swing1:{y:1,t:-10,h:0,A:[20,110],B:[170,200],L:[-15,-6],R:[16,4]},
 swing2:{y:3,t:26,h:-4,A:[10,110],B:[100,100],L:[-24,-8],R:[24,8]},
 toss:{y:1,t:18,h:-2,A:[14,120],B:[110,100],L:[-18,-6],R:[18,4]},
 hurt:{y:2,t:-24,h:-16,A:[-34,-10],B:[-40,-5],L:[-10,-4],R:[18,10]},
 dizzy:{y:7,t:52,h:18,A:[8,0],B:[16,8],L:[-14,-4],R:[18,8]},
 fall:{y:-6,t:-50,h:-20,A:[-60,-40],B:[-80,-50],L:[20,40],R:[40,60],rot:-30},
 down:{y:0,t:0,h:0,A:[180,180],B:[170,175],L:[0,0],R:[6,6],lie:1},
 kneel:{y:22,t:26,h:6,A:[40,10],B:[60,20],L:[8,-92],R:[82,2]},
 crouch:{y:10,t:20,h:4,A:[30,130],B:[40,140],L:[-40,0],R:[50,-10]},
 win:{y:0,t:-4,h:-8,A:[160,150],B:[20,130],L:[-14,-6],R:[14,4]},
 rise1:{y:10,t:24,h:6,A:[10,90],B:[-30,30],L:[-30,-6],R:[40,-6]},
 rise2:{y:-14,t:-12,h:-10,A:[-20,60],B:[175,180],L:[10,-50],R:[40,-20]},
 fury:{y:2,t:28,h:-6,A:[90,90],B:[96,92],L:[-28,-10],R:[26,10]}};
const lerp=(a,b,k)=>a+(b-a)*k;
function blend(a,b,k){if(!b||k<=0)return a;if(k>=1)return b;const o={};for(const n of ['y','t','h','rot','lie'])o[n]=lerp(a[n]||0,b[n]||0,k);
 for(const n of ['A','B','L','R'])o[n]=[lerp(a[n][0],b[n][0],k),lerp(a[n][1],b[n][1],k)];return o;}
const v=(deg,len)=>[Math.sin(deg*D2R)*len,Math.cos(deg*D2R)*len];
// joint positions of a pose (local, facing right, feet at 0)
function joints(p){const hip=[0,-48+(p.y||0)];
 // torso points up from the hip: lean forward = +x
 const top=[hip[0]+Math.sin((p.t||0)*D2R)*SEG.torso,hip[1]-Math.cos((p.t||0)*D2R)*SEG.torso];
 const neck=[top[0]+Math.sin((p.t||0)*D2R)*SEG.neck,top[1]-Math.cos((p.t||0)*D2R)*SEG.neck];
 const head=[neck[0]+Math.sin(((p.t||0)+(p.h||0))*D2R)*SEG.head*.8,neck[1]-Math.cos(((p.t||0)+(p.h||0))*D2R)*SEG.head*.8];
 const limb=(o,[a1,a2],l1,l2)=>{const e=v(a1,l1),m=[o[0]+e[0],o[1]+e[1]],f=v(a2,l2);return [o,m,[m[0]+f[0],m[1]+f[1]]];};
 const shB=[top[0]+3,top[1]+3],shA=[top[0]-3,top[1]+3];
 return {hip,top,neck,head,A:limb(shA,p.A,SEG.ua,SEG.fa),B:limb(shB,p.B,SEG.ua,SEG.fa),L:limb([hip[0]-2,hip[1]],p.L,SEG.th,SEG.sh),R:limb([hip[0]+2,hip[1]],p.R,SEG.th,SEG.sh)};}
// outfits: shirt, pants, skin, shoe, belt, plus extras (vest, stripe)
const OUTFIT={
 p1:{shirt:'#2f6fc8',vest:'#1c2a44',pants:'#2c3c66',skin:'#e8b48c',shoe:'#1c1c22',belt:'#8c6a2c',glove:'#e8b48c',stripe:'#f2d24a'},
 p2:{shirt:'#c8382f',vest:'#3c1414',pants:'#4a3a2c',skin:'#d8a07c',shoe:'#1c1c22',belt:'#8c6a2c',glove:'#d8a07c',stripe:'#f2f2f2'},
 thug:{shirt:'#7c7c84',pants:'#2c2c34',skin:'#d8a882',shoe:'#141418',belt:'#141418'},
 bat:{shirt:'#3c7c3c',pants:'#3c3424',skin:'#c88c6c',shoe:'#141418',belt:'#5c3c1c'},
 whip:{shirt:'#a83c8c',pants:'#1c1c24',skin:'#e8bc98',shoe:'#a83c8c',belt:'#e8e8e8'},
 knife:{shirt:'#c8a43c',pants:'#2c2418',skin:'#b07c5c',shoe:'#141418',belt:'#141418'},
 brute:{shirt:'#5c3c2c',pants:'#3c2c1c',skin:'#9c6c4c',shoe:'#141418',belt:'#2c1c0c',bare:true},
 kicker:{shirt:'#1c1c1c',pants:'#e8e8e8',skin:'#e8c4a0',shoe:'#e8e8e8',belt:'#c8382f'},
 boss:{shirt:'#e8c43c',vest:'#2c2c2c',pants:'#141418',skin:'#d8a882',shoe:'#3c2c1c',belt:'#e8c43c',stripe:'#c8382f'}};
function stroke(g,pts,w,col){g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.stroke();}
// draw a body; returns the head spot (screen, for the face) and the front hand (for a weapon)
// g at the fighter's feet; face = +1 right / -1 left; k = scale (screen px per unit); o = outfit; big = width factor
function drawBody(g,pose,{x,y,face=1,k=1,o=OUTFIT.thug,big=1,flash=0,alpha=1,shadow=true,z=0}){
 const J=joints(pose),lie=pose.lie||0;g.save();
 if(shadow){g.globalAlpha=.32*alpha;g.fillStyle='#000';g.beginPath();g.ellipse(x,y,22*k*big,6*k,0,0,7);g.fill();}
 g.globalAlpha=alpha;g.translate(x,y-z*k);g.scale(face*k*big,k);
 if(lie){g.translate(0,-6);g.rotate(-Math.PI/2*lie);}   // lying: whole body on its back, head behind
 if(pose.rot){g.translate(0,-48);g.rotate(pose.rot*D2R);g.translate(0,48);}
 const W=big;const dark=c=>shade(c,-.28),ol='rgba(0,0,0,.55)';
 const limb=(pts,w,col,end)=>{stroke(g,pts,w+2.4,ol);stroke(g,pts,w,col);if(end){g.fillStyle=end;g.beginPath();g.arc(pts[2][0],pts[2][1],w*.62,0,7);g.fill();}};
 // back limbs (darker), torso, front limbs
 limb(J.L,10.5,dark(o.pants));drawShoe(g,J.L[2],dark(o.shoe),J.L);
 limb(J.A,8.5,dark(o.bare?o.skin:o.shirt),dark(o.glove||o.skin));
 // torso: a tapered quad from hips to shoulders
 const tl=(pose.t||0)*D2R,nx=Math.cos(tl),ny=Math.sin(tl);g.fillStyle=o.shirt;g.strokeStyle=ol;g.lineWidth=2.4;
 g.beginPath();g.moveTo(J.hip[0]-9*nx,J.hip[1]-9*ny+2);g.lineTo(J.top[0]-13*nx,J.top[1]-13*ny);g.quadraticCurveTo(J.top[0],J.top[1]-3,J.top[0]+13*nx,J.top[1]+13*ny);g.lineTo(J.hip[0]+9*nx,J.hip[1]+9*ny+2);g.closePath();
 g.fillStyle=o.bare?o.skin:o.shirt;g.fill();g.stroke();
 if(o.vest){g.fillStyle=o.vest;g.beginPath();g.moveTo(J.hip[0]-7*nx,J.hip[1]-7*ny);g.lineTo(J.top[0]-10*nx,J.top[1]-10*ny);g.lineTo(J.top[0]-3*nx,J.top[1]-3*ny);g.lineTo(J.hip[0]-1*nx,J.hip[1]-1*ny);g.closePath();g.fill();
  g.beginPath();g.moveTo(J.hip[0]+7*nx,J.hip[1]+7*ny);g.lineTo(J.top[0]+10*nx,J.top[1]+10*ny);g.lineTo(J.top[0]+3*nx,J.top[1]+3*ny);g.lineTo(J.hip[0]+1*nx,J.hip[1]+1*ny);g.closePath();g.fill();}
 if(o.stripe){stroke(g,[[J.top[0]-9*nx,J.top[1]-9*ny+4],[J.top[0]+9*nx,J.top[1]+9*ny+4]],2,o.stripe);}
 stroke(g,[[J.hip[0]-8*nx,J.hip[1]-8*ny],[J.hip[0]+8*nx,J.hip[1]+8*ny]],4,o.belt);
 limb(J.R,11,o.pants);drawShoe(g,J.R[2],o.shoe,J.R);
 // neck
 stroke(g,[J.top,J.neck],6,o.skin);
 limb(J.B,9,o.bare?o.skin:o.shirt,o.glove||o.skin);
 if(flash>0){g.globalCompositeOperation='source-atop';g.globalAlpha=flash;g.fillStyle='#fff';g.fillRect(-60,-120,120,130);}
 g.restore();
 // head spot and the front hand in screen space
 const tr=p=>{let px=p[0],py=p[1];
  if(pose.rot){const a=pose.rot*D2R,c=Math.cos(a),s2=Math.sin(a),qy=py+48;const rx=px*c-qy*s2,ry=px*s2+qy*c;px=rx;py=ry-48;}
  if(lie){const a=-Math.PI/2*lie,c=Math.cos(a),s2=Math.sin(a);const rx=px*c-py*s2,ry=px*s2+py*c;px=rx;py=ry-6;}
  return {x:x+px*face*k*big,y:y-z*k+py*k};};
 return {head:tr(J.head),hand:tr(J.B[2]),handAng:Math.atan2(J.B[2][1]-J.B[1][1],(J.B[2][0]-J.B[1][0])*face),neck:tr(J.neck),foot:tr(J.R[2])};}
function drawShoe(g,p,c,leg){const a=Math.atan2(leg[2][1]-leg[1][1],leg[2][0]-leg[1][0]);g.save();g.translate(p[0],p[1]);g.rotate(a-Math.PI/2);g.fillStyle=c;g.beginPath();g.ellipse(2.5,1,7,4,0,0,7);g.fill();g.restore();}
function shade(hex,k){const n=parseInt(hex.slice(1),16),r=n>>16,gg=(n>>8)&255,b=n&255,f=c=>Math.max(0,Math.min(255,Math.round(k<0?c*(1+k):c+(255-c)*k)));return `rgb(${f(r)},${f(gg)},${f(b)})`;}
Object.assign(exports,{P,blend,joints,drawBody,OUTFIT,shade,SEG});
