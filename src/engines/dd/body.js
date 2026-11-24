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
 fury:{y:2,t:28,h:-6,A:[90,90],B:[96,92],L:[-28,-10],R:[26,10]},
 // WEAPON SWINGS (both hands on the grip; wa = weapon angle like the limbs: 90 = straight forward, 180 = up, 270 = back;
 // wl = drawn length (a bat pointing away from the camera looks shorter)). A real swing: cock it up behind the back
 // shoulder, step in and whip it round level, finish high over the other shoulder.
 batReady:{y:1,t:6,h:0,A:[34,142],B:[42,150],L:[-14,-6],R:[14,4],wa:200,wl:1},
 batWind:{y:3,t:-14,h:-2,A:[-26,166],B:[-32,172],L:[-22,-10],R:[20,8],wa:232,wl:1},
 batHit:{y:4,t:20,h:-4,A:[40,72],B:[50,68],L:[-30,-12],R:[28,12],wa:96,wl:1},
 batFollow:{y:2,t:6,h:-8,A:[108,146],B:[118,152],L:[-16,-34],R:[22,8],wa:258,wl:.72},
 batBack:{y:4,t:18,h:-2,A:[36,40],B:[44,36],L:[-26,-10],R:[26,10],wa:72,wl:1},
 batLow:{y:5,t:24,h:2,A:[40,50],B:[46,44],L:[-26,-10],R:[26,12],wa:-20,wl:.8},
 batOver:{y:0,t:-18,h:-6,A:[150,186],B:[158,190],L:[-18,-6],R:[18,4],wa:205,wl:1},
 batSmash:{y:9,t:34,h:6,A:[96,62],B:[104,58],L:[-34,-14],R:[32,16],wa:40,wl:1},
 // the riot cop's shield, the gunman, the bottle/molotov lob, roller skates, a gut hit, the shoulder charge, the sweep
 block:{y:2,t:4,h:-2,A:[20,120],B:[64,150],L:[-16,-6],R:[16,4]},
 bash:{y:3,t:26,h:-4,A:[30,110],B:[88,100],L:[-28,-12],R:[28,10]},
 aim:{y:0,t:0,h:0,A:[78,92],B:[86,90],L:[-14,-6],R:[14,4]},
 lobC:{y:2,t:-16,h:-4,A:[30,80],B:[-50,190],L:[-20,-8],R:[18,6]},
 lob:{y:3,t:22,h:-2,A:[-10,60],B:[130,100],L:[-26,-10],R:[26,10]},
 skate1:{y:12,t:32,h:-10,A:[-50,30],B:[60,110],L:[-46,-26],R:[34,14]},
 skate2:{y:12,t:32,h:-10,A:[60,110],B:[-50,30],L:[30,10],R:[-40,-20]},
 hurtLow:{y:7,t:44,h:22,A:[40,22],B:[54,12],L:[-8,-4],R:[16,10]},
 charge:{y:6,t:42,h:-8,A:[60,84],B:[74,96],L:[-42,-74],R:[52,30]},
 sweep:{y:26,t:30,h:6,A:[70,10],B:[110,90],L:[6,-90],R:[92,94]},
 taunt:{y:0,t:-8,h:-6,A:[130,170],B:[140,175],L:[-16,-6],R:[16,4]}};
const lerp=(a,b,k)=>a+(b-a)*k;
const WA_REST=205;   // a weapon with no angle in the pose rests up and back over the shoulder
function blend(a,b,k){if(!b||k<=0)return a;if(k>=1)return b;const o={};for(const n of ['y','t','h','rot','lie'])o[n]=lerp(a[n]||0,b[n]||0,k);
 o.wa=lerp(a.wa??WA_REST,b.wa??WA_REST,k);o.wl=lerp(a.wl??1,b.wl??1,k);
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
 boss:{shirt:'#e8c43c',vest:'#2c2c2c',pants:'#141418',skin:'#d8a882',shoe:'#3c2c1c',belt:'#e8c43c',stripe:'#c8382f'},
 // the gangs of the story (our own looks, after the film's gangs)
 cop:{shirt:'#24345c',pants:'#1c2440',skin:'#e0b08c',shoe:'#0c0c10',belt:'#0c0c10',badge:'#e8c84c'},
 riot:{shirt:'#1c2638',vest:'#3c4658',pants:'#141c2c',skin:'#d8a882',shoe:'#0c0c10',belt:'#3c4658',badge:'#c8c8c8'},
 sarge:{shirt:'#24345c',pants:'#1c2440',skin:'#e8b894',shoe:'#0c0c10',belt:'#0c0c10',badge:'#e8c84c',stripe:'#e8c84c'},
 turnbull:{shirt:'#e8e4dc',pants:'#3c5c8c',skin:'#e8bc98',shoe:'#5c1c1c',belt:'#1c1c1c',braces:'#c8282c'},
 orphan:{shirt:'#8c8478',pants:'#4c4a44',skin:'#d8a882',shoe:'#2c2420',belt:'#2c2420',torn:1},
 fury:{shirt:'#ece8f0',pants:'#ece8f0',skin:'#e8c4a0',shoe:'#1c1c1c',belt:'#5c2c8c',pin:'#3c2c6c'},
 lizzie:{shirt:'#7c1c4c',pants:'#24242c',skin:'#e8c0a0',shoe:'#7c1c4c',belt:'#c8a43c'},
 punk:{shirt:'#e8e8e8',pants:'#4c6ca8',skin:'#e0b08c',shoe:'#c8c8c8',belt:'#4c6ca8',overalls:'#4c6ca8',stripeShirt:'#c83c3c',skates:1},
 rogue:{shirt:'#1c1c1c',vest:'#3c2c24',pants:'#2c2c34',skin:'#d8a882',shoe:'#141418',belt:'#8c8c8c'},
 riff:{shirt:'#d8d4c8',vest:'#3c3c3c',pants:'#d8d4c8',skin:'#8c5c3c',shoe:'#1c1c1c',belt:'#e8a83c'},
 // cutscene cast: the Warriors' leather vests (bare arms), Cyrus in black with a gold chain, the Hi-Hats (mime stripes), the Boppers (purple)
 warrior:{shirt:'#c89470',vest:'#6c3c1c',pants:'#2c2c38',skin:'#d8a882',shoe:'#1c1414',belt:'#3c2414',stripe:'#e8b83c',bare:true},
 cyrus:{shirt:'#141418',vest:'#2c1c34',pants:'#141418',skin:'#7c5034',shoe:'#0c0c0c',belt:'#e8c84c',stripe:'#e8c84c'},
 hihat:{shirt:'#f0f0f0',vest:'#1c1c1c',pants:'#1c1c1c',skin:'#f4f0ec',shoe:'#1c1c1c',belt:'#c82c3c'},
 bopper:{shirt:'#6c2c8c',vest:'#3c1c5c',pants:'#2c1c3c',skin:'#8c5c3c',shoe:'#1c1c1c',belt:'#e8c84c'}};
function stroke(g,pts,w,col){g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.stroke();}
// draw a body; returns the head spot (screen, for the face) and the front hand (for a weapon)
// g at the fighter's feet; face = +1 right / -1 left; k = scale (screen px per unit); o = outfit; big = width factor
function drawBody(g,pose,{x,y,face=1,k=1,o=OUTFIT.thug,big=1,flash=0,alpha=1,shadow=true,z=0}){
 const J=joints(pose),lie=pose.lie||0;g.save();
 if(shadow){g.globalAlpha=.32*alpha;g.fillStyle='#000';g.beginPath();g.ellipse(x,y,22*k*big,6*k,0,0,7);g.fill();}
 g.globalAlpha=alpha;if(flash>0&&'filter' in g)g.filter=`brightness(${1+Math.min(1,flash)*1.6})`;   // hit flash: the body lights up white
 g.translate(x,y-z*k);g.scale(face*k*big,k);
 if(lie){g.translate(0,-6);g.rotate(-Math.PI/2*lie);}   // lying: whole body on its back, head behind
 if(pose.rot){g.translate(0,-48);g.rotate(pose.rot*D2R);g.translate(0,48);}
 const W=big;const dark=c=>shade(c,-.28),ol='rgba(0,0,0,.55)';
 const limb=(pts,w,col,end)=>{stroke(g,pts,w+2.4,ol);stroke(g,pts,w,col);if(end){g.fillStyle=end;g.beginPath();g.arc(pts[2][0],pts[2][1],w*.62,0,7);g.fill();}};
 // back limbs (darker), torso, front limbs
 limb(J.L,10.5,dark(o.pants));drawShoe(g,J.L[2],dark(o.shoe),J.L,o.skates);
 limb(J.A,8.5,dark(o.bare?o.skin:o.shirt),dark(o.glove||o.skin));
 // torso: a tapered quad from hips to shoulders
 const tl=(pose.t||0)*D2R,nx=Math.cos(tl),ny=Math.sin(tl);g.fillStyle=o.shirt;g.strokeStyle=ol;g.lineWidth=2.4;
 g.beginPath();g.moveTo(J.hip[0]-9*nx,J.hip[1]-9*ny+2);g.lineTo(J.top[0]-13*nx,J.top[1]-13*ny);g.quadraticCurveTo(J.top[0],J.top[1]-3,J.top[0]+13*nx,J.top[1]+13*ny);g.lineTo(J.hip[0]+9*nx,J.hip[1]+9*ny+2);g.closePath();
 g.fillStyle=o.bare?o.skin:o.shirt;g.fill();g.stroke();
 if(o.vest){g.fillStyle=o.vest;g.beginPath();g.moveTo(J.hip[0]-7*nx,J.hip[1]-7*ny);g.lineTo(J.top[0]-10*nx,J.top[1]-10*ny);g.lineTo(J.top[0]-3*nx,J.top[1]-3*ny);g.lineTo(J.hip[0]-1*nx,J.hip[1]-1*ny);g.closePath();g.fill();
  g.beginPath();g.moveTo(J.hip[0]+7*nx,J.hip[1]+7*ny);g.lineTo(J.top[0]+10*nx,J.top[1]+10*ny);g.lineTo(J.top[0]+3*nx,J.top[1]+3*ny);g.lineTo(J.hip[0]+1*nx,J.hip[1]+1*ny);g.closePath();g.fill();}
 if(o.stripe){stroke(g,[[J.top[0]-9*nx,J.top[1]-9*ny+4],[J.top[0]+9*nx,J.top[1]+9*ny+4]],2,o.stripe);}
 if(o.stripeShirt){for(let i=1;i<4;i++){const f=i/4;stroke(g,[[lerp(J.hip[0]-9*nx,J.top[0]-12*nx,f),lerp(J.hip[1]-9*ny,J.top[1]-12*ny,f)],[lerp(J.hip[0]+9*nx,J.top[0]+12*nx,f),lerp(J.hip[1]+9*ny,J.top[1]+12*ny,f)]],2,o.stripeShirt);}}
 if(o.pin){g.globalAlpha=alpha*.7;for(let i=-2;i<=2;i++)stroke(g,[[J.hip[0]+i*3.6*nx,J.hip[1]+i*3.6*ny],[J.top[0]+i*4.8*nx,J.top[1]+i*4.8*ny]],.9,o.pin);g.globalAlpha=alpha;}
 if(o.overalls){g.fillStyle=o.overalls;g.beginPath();g.moveTo(J.hip[0]-8*nx,J.hip[1]-8*ny);g.lineTo(lerp(J.hip[0],J.top[0],.62)-6*nx,lerp(J.hip[1],J.top[1],.62)-6*ny);g.lineTo(lerp(J.hip[0],J.top[0],.62)+6*nx,lerp(J.hip[1],J.top[1],.62)+6*ny);g.lineTo(J.hip[0]+8*nx,J.hip[1]+8*ny);g.closePath();g.fill();
  stroke(g,[[lerp(J.hip[0],J.top[0],.62)-5*nx,lerp(J.hip[1],J.top[1],.62)-5*ny],[J.top[0]-8*nx,J.top[1]-8*ny]],2.2,o.overalls);stroke(g,[[lerp(J.hip[0],J.top[0],.62)+5*nx,lerp(J.hip[1],J.top[1],.62)+5*ny],[J.top[0]+8*nx,J.top[1]+8*ny]],2.2,o.overalls);}
 if(o.braces){for(const sd of [-5,5])stroke(g,[[J.hip[0]+sd*nx,J.hip[1]+sd*ny],[J.top[0]+sd*1.3*nx,J.top[1]+sd*1.3*ny]],1.8,o.braces);}
 if(o.torn){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.moveTo(J.hip[0]-4*nx,J.hip[1]-4*ny-2);g.lineTo(J.hip[0]+2*nx,J.hip[1]+2*ny-7);g.lineTo(J.hip[0]+6*nx,J.hip[1]+6*ny-2);g.closePath();g.fill();}
 if(o.badge){g.fillStyle=o.badge;g.beginPath();g.arc(lerp(J.hip[0],J.top[0],.78)+5*nx,lerp(J.hip[1],J.top[1],.78)+5*ny,1.8,0,7);g.fill();}
 stroke(g,[[J.hip[0]-8*nx,J.hip[1]-8*ny],[J.hip[0]+8*nx,J.hip[1]+8*ny]],4,o.belt);
 limb(J.R,11,o.pants);drawShoe(g,J.R[2],o.shoe,J.R,o.skates);
 // neck
 stroke(g,[J.top,J.neck],6,o.skin);
 limb(J.B,9,o.bare?o.skin:o.shirt,o.glove||o.skin);
 
 g.restore();
 // head spot and the front hand in screen space
 const tr=p=>{let px=p[0],py=p[1];
  if(pose.rot){const a=pose.rot*D2R,c=Math.cos(a),s2=Math.sin(a),qy=py+48;const rx=px*c-qy*s2,ry=px*s2+qy*c;px=rx;py=ry-48;}
  if(lie){const a=-Math.PI/2*lie,c=Math.cos(a),s2=Math.sin(a);const rx=px*c-py*s2,ry=px*s2+py*c;px=rx;py=ry-6;}
  return {x:x+px*face*k*big,y:y-z*k+py*k};};
 return {head:tr(J.head),hand:tr(J.B[2]),hand2:tr(J.A[2]),wa:pose.wa,wl:pose.wl,handAng:Math.atan2(J.B[2][1]-J.B[1][1],(J.B[2][0]-J.B[1][0])*face),neck:tr(J.neck),foot:tr(J.R[2])};}
function drawShoe(g,p,c,leg,skates){const a=Math.atan2(leg[2][1]-leg[1][1],leg[2][0]-leg[1][0]);g.save();g.translate(p[0],p[1]);g.rotate(a-Math.PI/2);g.fillStyle=c;g.beginPath();g.ellipse(2.5,1,7,4,0,0,7);g.fill();
 if(skates){g.fillStyle='#e8c83c';for(const wx of [-2.5,7])g.beginPath(),g.arc(wx,5.4,2.2,0,7),g.fill();}g.restore();}
function shade(hex,k){const n=parseInt(hex.slice(1),16),r=n>>16,gg=(n>>8)&255,b=n&255,f=c=>Math.max(0,Math.min(255,Math.round(k<0?c*(1+k):c+(255-c)*k)));return `rgb(${f(r)},${f(gg)},${f(b)})`;}
// ---- drawn heads for the gangs (no photo face): our own cartoon heads, one look per gang, varied by the fighter's id.
// cx,cy = face centre on screen, w = face width, face = +1/-1 the way it looks, tilt = head angle (radians), mood
const SKINS=['#f0c8a4','#e0b08c','#c89470','#a8744c','#8c5c3c','#6c442c'],HAIRS=['#1c140c','#3c2414','#6c4424','#a8743c','#d8b070','#8c2c1c','#2c2c2c'];
function headLook(id){const h=hashStr(String(id||'x'));return {skin:SKINS[h%SKINS.length],hair:HAIRS[(h>>3)%HAIRS.length],v:(h>>6)%4};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function drawGangHead(g,cx,cy,w,style,{face=1,tilt=0,mood='normal',id='x',skin}={}){const L=headLook(id),sk=skin||L.skin,rx=w*.5,ry=w*.62,ol='rgba(0,0,0,.7)';
 g.save();g.translate(cx,cy);g.rotate(tilt);g.scale(face,1);g.lineWidth=Math.max(1,w*.07);g.strokeStyle=ol;
 const hairBack=(col,len)=>{g.fillStyle=col;g.beginPath();g.ellipse(-rx*.25,ry*.1,rx*1.02,ry*(1+len),0,Math.PI*.95,Math.PI*2.05);g.lineTo(-rx*.9,ry*(.6+len));g.closePath();g.fill();};
 if(style==='lizzie')hairBack(L.v%2?'#6c1c14':L.hair,.7);
 // ear, head, nose
 g.fillStyle=style==='fury'?'#f4f4f0':sk;g.beginPath();g.ellipse(0,0,rx,ry,0,0,7);g.fill();g.stroke();
 g.fillStyle=sk;g.beginPath();g.ellipse(-rx*.18,ry*.08,rx*.16,ry*.2,0,0,7);g.fill();
 g.fillStyle=style==='fury'?'#f4f4f0':sk;g.beginPath();g.moveTo(rx*.86,-ry*.05);g.lineTo(rx*1.14,ry*.18);g.lineTo(rx*.86,ry*.26);g.fill();
 // face paint (the Furies): black round the eyes, a coloured slash
 if(style==='fury'){g.fillStyle='#1c1c24';g.beginPath();g.ellipse(rx*.42,-ry*.12,rx*.3,ry*.2,-.3,0,7);g.fill();g.fillStyle=['#7c2cc8','#c82c3c','#2c8cc8','#e8a82c'][L.v];g.beginPath();g.moveTo(rx*.05,ry*.1);g.lineTo(rx*.8,ry*.42);g.lineTo(rx*.7,ry*.55);g.lineTo(-rx*.05,ry*.25);g.fill();}
 // eye, brow, mouth
 const angry=mood==='angry',sad=mood==='sad'||mood==='hurt';
 g.fillStyle=style==='fury'?'#fff':'#1c1410';g.beginPath();g.arc(rx*.44,-ry*.12,w*.06,0,7);g.fill();
 g.strokeStyle='#1c1410';g.lineWidth=Math.max(1,w*.07);g.beginPath();g.moveTo(rx*.18,-ry*(angry?.36:.42));g.lineTo(rx*.72,-ry*(angry?.24:sad?.42:.36));g.stroke();
 g.beginPath();if(sad){g.arc(rx*.5,ry*.52,rx*.18,Math.PI*1.1,Math.PI*1.9);}else{g.moveTo(rx*.3,ry*.42);g.lineTo(rx*.72,ry*(angry?.46:.38));}g.stroke();
 if(style==='sarge'||style==='driver'||(style==='rogue'&&L.v===1)){g.fillStyle=style==='sarge'?'#5c3c24':L.hair;g.beginPath();g.ellipse(rx*.62,ry*.3,rx*.34,ry*.09,0,0,7);g.fill();}
 if(style==='driver'||(style==='rogue'&&L.v===2)){g.fillStyle=L.hair;g.beginPath();g.moveTo(rx*.1,ry*.35);g.quadraticCurveTo(rx*.7,ry*1.05,rx*.95,ry*.5);g.lineTo(rx*.6,ry*.62);g.closePath();g.fill();}
 g.lineWidth=Math.max(1,w*.07);g.strokeStyle=ol;
 // hair / hats per gang
 const cap=(col,brim,band)=>{g.fillStyle=col;g.beginPath();g.ellipse(-rx*.05,-ry*.42,rx*1.04,ry*.6,0,Math.PI,Math.PI*2);g.closePath();g.fill();g.stroke();
  g.fillStyle=brim;g.beginPath();g.moveTo(rx*.2,-ry*.48);g.quadraticCurveTo(rx*1.2,-ry*.6,rx*1.45,-ry*.36);g.lineTo(rx*.3,-ry*.36);g.closePath();g.fill();g.stroke();if(band){g.fillStyle=band;g.fillRect(-rx*.9,-ry*.52,rx*1.8,ry*.1);}};
 if(style==='cop'||style==='sarge'){cap('#1c2440','#0c0c14','#0c0c14');g.fillStyle='#e8c84c';g.beginPath();g.arc(rx*.42,-ry*.72,w*.09,0,7);g.fill();}
 else if(style==='riot'){g.fillStyle='#2c3448';g.beginPath();g.ellipse(-rx*.05,-ry*.18,rx*1.18,ry*.95,0,Math.PI*.92,Math.PI*2.12);g.closePath();g.fill();g.stroke();
  g.fillStyle='rgba(160,200,230,.38)';g.beginPath();g.moveTo(rx*.15,-ry*.45);g.lineTo(rx*1.2,-ry*.45);g.lineTo(rx*1.15,ry*.35);g.lineTo(rx*.15,ry*.3);g.closePath();g.fill();g.stroke();}
 else if(style==='bald'||style==='driver'){g.fillStyle='rgba(60,40,30,.22)';g.beginPath();g.ellipse(-rx*.05,-ry*.38,rx*.92,ry*.5,0,Math.PI,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(rx*.12,-ry*.62,rx*.3,ry*.12,-.3,0,7);g.fill();}
 else if(style==='scruffy'){g.fillStyle=L.hair;g.beginPath();g.moveTo(-rx*1.05,ry*.1);for(let i=0;i<=7;i++){const a=Math.PI+i/7*Math.PI,r=(i%2?1.08:1.25);g.lineTo(Math.cos(a)*rx*r,-ry*.12+Math.sin(a)*ry*r*.9);}g.lineTo(rx*.6,-ry*.3);g.closePath();g.fill();
  if(L.v===0){g.fillStyle='#5c6c3c';g.beginPath();g.ellipse(-rx*.05,-ry*.5,rx*1.02,ry*.5,0,Math.PI,Math.PI*2);g.fill();g.stroke();}}
 else if(style==='fury')cap(L.v%2?'#3c2c6c':'#1c1c24','#1c1c24',null);
 else if(style==='lizzie'){g.fillStyle=L.v%2?'#6c1c14':L.hair;g.beginPath();g.ellipse(-rx*.1,-ry*.4,rx*1.1,ry*.62,0,Math.PI*.98,Math.PI*2.02);g.lineTo(rx*.95,-ry*.1);g.quadraticCurveTo(rx*.5,-ry*.5,0,-ry*.45);g.closePath();g.fill();
  g.fillStyle='#e8c84c';g.beginPath();g.arc(-rx*.18,ry*.38,w*.06,0,7);g.fill();}
 else if(style==='punk'){g.fillStyle=L.hair;g.beginPath();g.ellipse(-rx*.05,-ry*.4,rx*1,ry*.55,0,Math.PI,Math.PI*2);g.fill();g.fillStyle=['#c83c3c','#3c5cc8','#2c2c2c','#e8c83c'][L.v];g.beginPath();g.ellipse(-rx*.05,-ry*.52,rx*1.04,ry*.36,0,Math.PI,Math.PI*2);g.closePath();g.fill();g.stroke();
  g.beginPath();g.moveTo(-rx*.95,-ry*.5);g.lineTo(-rx*1.5,-ry*.3);g.lineTo(-rx*1.3,-ry*.6);g.fill();}
 else if(style==='rogue'){g.fillStyle=L.hair;g.beginPath();g.moveTo(-rx*1.02,ry*.1);g.quadraticCurveTo(-rx*1.1,-ry*1.1,rx*.4,-ry*1.02);g.quadraticCurveTo(rx*1.05,-ry*.9,rx*.9,-ry*.42);g.quadraticCurveTo(rx*.2,-ry*.56,-rx*.4,-ry*.4);g.lineTo(-rx*.55,ry*.2);g.closePath();g.fill();g.fillRect(-rx*.05,-ry*.2,rx*.12,ry*.45);}
 else if(style==='cyrus'){g.fillStyle='#141010';g.beginPath();g.ellipse(-rx*.05,-ry*.36,rx*1.0,ry*.6,0,Math.PI*.96,Math.PI*2.04);g.closePath();g.fill();
  g.beginPath();g.moveTo(rx*.05,ry*.2);g.quadraticCurveTo(rx*.6,ry*1.08,rx*.98,ry*.32);g.lineTo(rx*.7,ry*.5);g.quadraticCurveTo(rx*.4,ry*.6,rx*.2,ry*.3);g.closePath();g.fill();
  g.fillStyle='#0c0c10';g.beginPath();g.roundRect(rx*.12,-ry*.3,rx*.86,ry*.32,ry*.08);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.fillRect(rx*.3,-ry*.24,rx*.2,ry*.06);}
 else if(style==='hihat'){g.fillStyle='#1c1c1c';g.beginPath();g.ellipse(rx*.42,-ry*.12,rx*.14,ry*.12,0,0,7);g.fill();g.fillStyle='#c82c3c';g.beginPath();g.ellipse(rx*.52,ry*.42,rx*.18,ry*.07,0,0,7);g.fill();
  g.fillStyle='#141414';g.fillRect(-rx*.95,-ry*.62,rx*1.9,ry*.14);g.fillRect(-rx*.62,-ry*1.5,rx*1.24,ry*.92);g.fillStyle='#c82c3c';g.fillRect(-rx*.62,-ry*.78,rx*1.24,ry*.12);}
 else if(style==='riff'){g.fillStyle='rgba(30,20,10,.3)';g.beginPath();g.ellipse(-rx*.05,-ry*.38,rx*.92,ry*.5,0,Math.PI,Math.PI*2);g.fill();g.fillStyle='#f0ece0';g.fillRect(-rx,-ry*.58,rx*2,ry*.2);}
 else{g.fillStyle=L.hair;g.beginPath();g.ellipse(-rx*.08,-ry*.38,rx*1.02,ry*.56,0,Math.PI*.96,Math.PI*2.04);g.closePath();g.fill();}
 g.restore();}
Object.assign(exports,{P,blend,joints,drawBody,OUTFIT,shade,SEG,drawGangHead,headLook,WA_REST});
