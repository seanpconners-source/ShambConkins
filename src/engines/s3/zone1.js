// ZONE 1, ACT 1 ("SHAMB ISLAND"): our own map, built like a classic first zone: plateaus with high ledges on top, roll
// tunnels through them, a cave route underneath, lakes with bridges, waterfalls, three loops. Left to right:
//   start       flat run, a hill, loop 1
//   plateau 1   GROUND: straight into ROLL TUNNEL 1 (an S-tube through the plateau that bursts out of a waterfall)
//               TOP: hop on the step and take the red spring: plateau top, spring up to two tiers of high ledges (1-up)
//   lake 1      top: a log bridge; bottom: the lake bed the tunnel shoots you across
//   plateau 2   TOP: starpost, robots, high ledges (speed shoes, fire shield), a zip line down the far slope
//               CAVE: under it, steps, a spike dip, a wall with a star behind it; opens out of the hillside
//   loop 2      then up to the waterfall gorge: three swing vines; the bottom has rings, spikes and a red spring out
//   the hill    GROUND: ROLL TUNNEL 2 dives under the hill and back up; TOP (step + red spring): flyers, a high ledge,
//               then a fast roll down the far slope
//   finish      spikes and robots, spring-up ledges over loop 3, a log bridge with a crumbling middle over lake 2, the sign
// Pure data: buildZone1Act1() gives the terrain (built once and reused) and a fresh list of objects for every run.
const {Terrain,arc,ease}=require("src/engines/s3/terrain.js");
const G=1500,W=18800,H=2400,R=112,BAND=24,TH=28;
const LG=G+60,P=G-200,LOW=G+180,GF=G+500,HT=G-260,LB=G+300;// loop-1 ground, plateau tops, low ground, gorge floor, hill top, lake-2 bed
const MS=G-160,MT=G-320,CH=G+60,RUN=G+100;// mesa shelf, mesa top, chasm floor, the last run
const LOOPS=[[1900,LG],[7000,LOW],[12500,G],[17200,RUN]];
const E=(x0,y0,x1,y1)=>ease(x0,y0,x1,y1).slice(1);
const SURF=[[0,G],[700,G],...E(700,G,1000,G-120),[1250,G-120],...E(1250,G-120,1600,LG),[2300,LG],...E(2300,LG,2700,P),[3900,P],[3900,LOW],[4500,LOW],[4500,P],[6000,P],
 ...E(6000,P,6600,LOW),[7400,LOW],...E(7400,LOW,7800,G),[8200,G],[8200,GF],[8900,GF],[8900,G],[9400,G],...E(9400,G,9800,HT),[10800,HT],...E(10800,HT,11200,G),
 [13000,G],[13000,LB],[13500,LB],[13500,G],[14700,G],[14700,MS],[15100,MS],[15100,MT],[15600,MT],[15600,CH],[15900,CH],[15900,MT],[16300,MT],
 ...E(16300,MT,16900,RUN),[17450,RUN],...E(17450,RUN,17750,G),[W,G]];
// the walking surface at x (the top surface: tunnels and the cave are under it)
function gy(x){for(let i=1;i<SURF.length;i++){const a=SURF[i-1],b=SURF[i];if(x<=b[0]&&b[0]>a[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return G;}
// roll tunnels: centre lines (the tunnel is TH above and below)
const TUBE1=[[2280,LG-TH],[2560,LG-TH],...E(2560,LG-TH,2860,LG+300),[2960,LG+300],...E(2960,LG+300,3180,LG+130),...E(3180,LG+130,3420,LG+360),[3520,LG+360],...E(3520,LG+360,3800,LOW-TH),[3930,LOW-TH]];
const TUBE2=[[9380,G-TH],[9700,G-TH],...E(9700,G-TH,9980,G+280),[10080,G+280],...E(10080,G+280,10300,G+90),...E(10300,G+90,10520,G+300),[10600,G+300],...E(10600,G+300,10900,G-TH),[11260,G-TH]];
const TUBE3=[[14640,G-TH],[15620,G-TH]],TUBE4=[[15880,CH-TH],[16800,CH-TH]];
const tubeY=(L,x)=>{for(let i=1;i<L.length;i++){const a=L[i-1],b=L[i];if(x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return L[L.length-1][1];};
const tubePoly=L=>{const up=[],dn=[];L.forEach(([x,y],i)=>{const a=L[Math.max(0,i-1)],b=L[Math.min(L.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;up.push([x-nx*TH,y-ny*TH]);dn.push([x+nx*TH,y+ny*TH]);});return [...up,...dn.reverse()];};
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
let terrain=null;const LEDGES=[],BRIDGE_Y=new Set();
function buildTerrain(){const T=new Terrain(W,H);
 T.poly([...SURF,[W,H],[0,H]]);
 for(const L of [TUBE1,TUBE2,TUBE3,TUBE4])T.poly(tubePoly(L),'all','cut');
 T.poly(rect(4498,P+70,4640,P+140),'all','cut');// the secret room behind the waterfall
 // the cave under plateau 2: steps up and down, a dip
 T.poly(rect(4498,LG,6600,LOW),'all','cut');T.poly(rect(5350,LOW-2,5650,LOW+70),'all','cut');
 T.poly(rect(4800,LOW-40,4960,LOW+2));T.poly(rect(4880,LOW-76,4960,LOW-38));T.poly(rect(5900,LOW-40,6060,LOW+2));
 for(const [cx,fy] of LOOPS){const cy=fy-R;
  T.poly([...arc(cx,cy,R+BAND,-Math.PI/2,Math.PI/2),...arc(cx,cy,R,Math.PI/2,-Math.PI/2)],'a');
  T.poly([...arc(cx,cy,R+BAND,Math.PI/2,Math.PI*1.5),...arc(cx,cy,R,Math.PI*1.5,Math.PI/2)],'b');
  // the loop's feet (owner: the bases looked silly): solid ground flaring out of the band, on the same collision path as
  // that half (exit foot = path A like the right half, entrance foot = path B), so the runner passes them exactly as it
  // passes the band; painted by the terrain art like any ground
  T.poly(footPoly(cx,fy,1),'a');T.poly(footPoly(cx,fy,-1),'b');}
 const ledge=(x0,x1,y)=>{T.poly(rect(x0,y,x1,y+16),'top');LEDGES.push([x0,x1,y]);};LEDGES.length=0;
 ledge(2180,2270,LG-70);ledge(9280,9370,G-70);// the steps with the red springs
 ledge(2960,3400,P-220);ledge(3560,3860,P-400);// high ledges over plateau 1
 ledge(3900,4500,P);LEDGES.pop();// log bridge over lake 1 (stays planks)
 ledge(4800,5200,P-220);ledge(5450,5800,P-260);// high ledges over plateau 2
 ledge(10000,10400,HT-220);// over the hill
 ledge(11900,12200,G-220);ledge(12260,12740,G-440);// over loop 3
 ledge(13000,13180,G);ledge(13320,13500,G);LEDGES.pop();LEDGES.pop();// log bridge over lake 2 (the middle crumbles)
 ledge(380,480,G-80);ledge(500,600,G-160);ledge(620,720,G-240);// the stairs at the start
 ledge(5850,6150,P-480);// third tier over plateau 2
 ledge(14560,14650,G-70);// the step before the mesa
 return T.build();}
const switchers=()=>LOOPS.flatMap(([cx,fy])=>{const cy=fy-R;return [{x:cx,y0:cy-R-60,y1:cy-R*.3,left:'b',right:'a'},{x:cx+R+70,y0:cy-R,y1:fy+40,left:'a',right:'a'},{x:cx-R-70,y0:cy-R,y1:fy+40,left:'a',right:'a'}];});
function objects(){const o=[],ring=(x,y)=>o.push({type:'ring',x,y}),row=(x0,y,n,dx=24)=>{for(let k=0;k<n;k++)ring(x0+k*dx,y);};
 const land=(x0,n,dx=32,up=24)=>{for(let k=0;k<n;k++)ring(x0+k*dx,gy(x0+k*dx)-up);};
 const inTube=(L,x0,n,dx=40)=>{for(let k=0;k<n;k++)ring(x0+k*dx,tubeY(L,x0+k*dx)+6);};
 const loopRings=(cx,fy)=>{for(let k=0;k<12;k++){const a=Math.PI/2+k/12*Math.PI*2;ring(cx+Math.cos(a)*(R-19),fy-R+Math.sin(a)*(R-19));}};
 const mon=(x,y,item)=>o.push({type:'monitor',x,y:y-16,item}),bad=(kind,x,y,more)=>o.push({type:'badnik',kind,x,y,...more});
 const spring=(x,y,dir,color)=>o.push({type:'spring',x,y:y-(dir==='up'?4:8),dir,color}),spikes=(x,y,w=64)=>o.push({type:'spikes',x,y:y-8,dir:'up',w,h:16});
 const plat=(x,y,more)=>o.push({type:'platform',x,y,w:80,h:16,...more});
 // ---- start, the hill, loop 1
 row(260,G-24,4);bad('charger',860,gy(860)-14,{dir:-1});
 row(395,G-104,3,30);row(515,G-184,3,30);row(635,G-264,3,30);plat(860,G-250,{move:'h',range:70,period:200});mon(1060,G-120,'shield');land(720,26,32);mon(1120,G-120,'rings');loopRings(1900,LG);row(2060,LG-24,4);
 // ---- plateau 1, ground: roll tunnel 1
 o.push({type:'tube',x:(2440+3900)/2,y:LG+180,w:3900-2440,h:500,dir:1,min:7,path:TUBE1});inTube(TUBE1,2480,34);
 // ---- plateau 1, top
 spring(2225,LG-70,'ur','red');row(2760,P-24,5,32);spring(2930,P,'up','yellow');bad('shooter',3120,P-14);bad('thrower',3500,P-60);row(3180,P-24,8,32);
 row(2990,P-244,12,32);mon(3360,P-220,'lightning');plat(3480,P-300,{move:'v',range:70,period:200});row(3590,P-424,8,32);mon(3820,P-400,'life');
 // ---- lake 1: bridge on top, lake bed below
 row(3960,P-90,16,32);spikes(4100,P);spikes(4330,P);bad('flyer',4200,P-150,{w:12,h:12});
 [3980,4160,4340,4520,4700].forEach((x,k)=>o.push({type:'platform',x,y:P-390+k*36,w:80,h:16,move:'collapse'}));row(3970,P-420,24,32);// crumbling sky route
 mon(4590,P+140,'rings');mon(4625,P+140,'rings');row(3980,LOW-24,14,32);
 // ---- plateau 2, top
 o.push({type:'starpost',x:4600,y:P-24});spring(4760,P,'up','yellow');spikes(5300,P);bad('thrower',5560,P-60);bad('charger',5900,P-14,{dir:-1});row(5080,P-24,6,32);
 row(4830,P-244,10,32);mon(5160,P-220,'shoes');plat(5320,P-240,{move:'h',range:60,period:220});row(5480,P-284,9,32);mon(5760,P-260,'fire');spring(5790,P-260,'up','yellow');row(5870,P-504,9,32);mon(6120,P-480,'life');
 o.push({type:'zipline',x0:6010,y0:P-40,x1:6690,y1:LOW-70,g0:gy(6004),g1:gy(6696)});
 // ---- plateau 2, cave
 row(4540,LOW-24,8);mon(4920,LOW-76,'bubble');bad('charger',5150,LOW-14,{dir:1});row(5380,LOW+40,10,26);spikes(5500,LOW+70);
 o.push({type:'wall',x:5760,y:LOW-32,w:32,h:64});mon(5840,LOW,'star');row(6090,LOW-24,10);
 // ---- loop 2, uphill, the waterfall gorge
 land(6030,16,32);loopRings(7000,LOW);row(7160,LOW-24,6);land(7420,12,32);mon(7900,G,'rings');bad('shooter',8060,G-14);
 [8310,8550,8790].forEach((x,k)=>o.push({type:'vine',x,y:G-200,len:120,amp:.9,period:150,phase:k*50}));for(let k=0;k<3;k++)row(8280+k*240,G-150,3,30);
 row(8260,GF-24,6);spikes(8440,GF);bad('charger',8580,GF-14,{dir:1});spikes(8700,GF);mon(8790,GF,'rings');spring(8884,GF,'up','red');
 // ---- the hill, ground: roll tunnel 2
 o.push({type:'starpost',x:9000,y:G-24});row(9060,G-24,6);
 o.push({type:'tube',x:(9540+11080)/2,y:G+150,w:11080-9540,h:440,dir:1,min:7,path:TUBE2});inTube(TUBE2,9580,36);
 // ---- the hill, top
 spring(9325,G-70,'ur','red');row(9860,HT-24,4,32);spring(9970,HT,'up','yellow');bad('flyer',10180,HT-120,{w:12,h:12});bad('shooter',10500,HT-14);row(10560,HT-24,7,32);
 row(10030,HT-244,11,32);mon(10360,HT-220,'lightning');land(10830,12,32);
 // ---- the last stretch
 row(11260,G-24,5);spikes(11480,G);bad('charger',11620,G-14,{dir:-1});bad('thrower',11760,G-60);
 spring(11860,G,'up','yellow');row(11930,G-244,8,32);spring(12170,G-220,'up','yellow');row(12290,G-464,13,32);mon(12700,G-440,'life');bad('flyer',12050,G-330,{w:12,h:12});
 loopRings(12500,G);row(12680,G-24,8);
 // ---- lake 2: the bridge's middle crumbles; a red spring on the lake bed
 [13215,13285].forEach(x=>o.push({type:'platform',x,y:G+8,w:70,h:16,move:'collapse'}));row(13030,G-24,18,26);
 row(13080,LB-24,10);mon(13380,LB,'rings');spring(13484,LB,'up','red');
 bad('charger',13800,G-14,{dir:-1});row(13900,G-24,8);o.push({type:'starpost',x:14200,y:G-24});
 // ---- the mesa, ground: two straight roll tunnels with the chasm between them
 o.push({type:'tube',x:(14770+15590)/2,y:G-TH,w:15590-14770,h:80,dir:1,min:8,path:TUBE3});inTube(TUBE3,14800,20);
 spring(15622,CH,'up','red');row(15670,CH-24,8,26);mon(15800,CH,'bubble');
 o.push({type:'tube',x:(15930+16690)/2,y:CH-TH,w:16690-15930,h:80,dir:1,min:8,path:TUBE4});inTube(TUBE4,15960,18);
 // ---- the mesa, top: springs up the two cliffs, robots, vines over the chasm, crumbling edges
 spring(14605,G-70,'up','yellow');row(14740,MS-24,8,32);bad('shooter',14900,MS-14);spring(15060,MS,'up','yellow');
 row(15140,MT-24,10,32);bad('thrower',15330,MT-60);mon(15500,MT,'lightning');
 [15690,15810].forEach((x,k)=>o.push({type:'vine',x,y:MT-200,len:120,amp:.9,period:150,phase:k*60}));
 row(15930,MT-24,8,32);bad('flyer',16100,MT-120,{w:12,h:12});mon(16240,MT,'shoes');land(16320,20,32);
 // ---- the last run: loop 4 and the sign
 loopRings(17200,RUN);row(17360,RUN-24,4);land(17470,10,32);bad('charger',17950,G-14,{dir:-1});row(18000,G-24,8);
 o.push({type:'sign',x:18350,y:G-16});
 return o;}
// ground scenery: bushes, flowers and stone totems on flat ground (seeded, away from lakes and gaps)
const WET=[[3880,4520],[8180,8920],[12980,13520],[15540,15960],[5000,5700]];
const groundProps=()=>{const o=[];let r=4242;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;
 for(let x=240;x<W-300;x+=70+rnd()*150){if(WET.some(([a,b])=>x>a-40&&x<b+40))continue;const y=gy(x);if(Math.abs(gy(x+24)-gy(x-24))>5)continue;
  const k=rnd();o.push(k<.5?{type:'bush',x,y}:k<.85?{type:'flower',x,y}:{type:'totem',x,y});}return o;};
// scenery standing on the ground keeps clear of the ledges built with rock under them (towers and legs): a palm at the
// start stood in the stairs' rock with the ledge tops drawn over it (owner, Nov 11: "looks bad")
const clearOfRock=x=>!LEDGES.some(([x0,x1,y])=>{const tall=Math.max(gy(x0+8),gy(x1-8))-y;return tall>=60&&x>x0-70&&x<x1+70;});
// a loop foot's outline: up the band's outer edge from the ground to ~30° below level, then a fillet (steep at the loop,
// flattening out) down to the ground FOOT px further out, closed along the ground
const FOOT=40;
function footPoly(cx,fy,s){const cy=fy-R,RB=R+BAND,ac=Math.asin(Math.min(1,R/RB)),a0=s>0?ac:Math.PI-ac,a1=s>0?Math.PI*.17:Math.PI*.83,pts=[];
 for(let k=0;k<=12;k++){const a=a0+(a1-a0)*k/12;pts.push([cx+Math.cos(a)*RB,cy+Math.sin(a)*RB]);}
 const [tx,ty]=pts[pts.length-1],ex=tx+s*FOOT,qx=tx+s*FOOT*.12;for(let k=1;k<=10;k++){const u=k/10;pts.push([(1-u)*(1-u)*tx+2*(1-u)*u*qx+u*u*ex,(1-u)*(1-u)*ty+2*(1-u)*u*fy+u*u*fy]);}
 pts.push([ex,fy+4],[pts[0][0],fy+4]);return pts;}
// exit feet are redrawn over the runner (with the band's lower right quarter; sonic3.js loopFronts)
const loopFeet=()=>LOOPS.map(([cx,fy])=>({type:'loopfoot',cx,cy:fy-R,R,B:BAND,fy,side:1,poly:footPoly(cx,fy,1),over:true,x:cx,w:R+BAND+FOOT+20}));
const decor=()=>[
 ...loopFeet(),
 ...[180,460,1080,1700,2800,3300,4700,5400,5900,7600,8050,9100,9900,10700,11400,13650,14000,14450,16000,17600,18100,18500].filter(clearOfRock).map((x,k)=>{const h=(x*7919+k*104729)%997;// a fixed little hash per tree: mirror + size (owner: repetitive)
  // on a slope the trunk stands on the LOWER side, so its cut-off base never shows above the ground (owner)
  return {type:'palm',x,y:Math.max(gy(x-14),gy(x+14))+5,flip:h%2===1,s:.84+(h%33)/100,alt:h%3===0};}),// alt = the second palm (palm-2) once it's in
 ...groundProps().filter(o=>clearOfRock(o.x)),{type:'bridge',x0:3900,x1:4500,y:P,x:3900,w:600,front:true},{type:'bridge',x0:13000,x1:13500,y:G,x:13000,w:500,front:true},
 // ledges come three ways: a floating chunk, a tower of rock down to the ground, or a long shelf on rock legs
 ...LEDGES.flatMap(([x0,x1,y],k)=>{const w=x1-x0,ground=Math.max(gy(x0+8),gy((x0+x1)/2),gy(x1-8)),tall=ground-y,kind=w>=500?'legs':w>=280||k%2?'tower':'float';
  if(kind==='float'||tall<60)return [{type:'land',x0,x1,y,x:x0,w,depth:w<120?36:52,front:true}];
  return [{type:'cliff',x0,x1,y,y1:ground+6,x:x0,w,legs:kind==='legs'?(w>=900?4:3):0},{type:'land',x0,x1,y,x:x0,w,depth:kind==='legs'?30:18,front:true}];}),
 {type:'hollow',pts:tubePoly(TUBE1),box:[2280,LG-60,3930,LG+400]},{type:'hollow',pts:tubePoly(TUBE2),box:[9380,G-60,11260,G+340]},
 {type:'hollow',pts:tubePoly(TUBE3),box:[14640,G-60,15620,G]},{type:'hollow',pts:tubePoly(TUBE4),box:[15880,CH-60,16800,CH]},{type:'hollow',pts:rect(4498,P+70,4640,P+140),box:[4498,P+70,4640,P+140]},
 {type:'hollow',pts:rect(4498,LG,6600,LOW),box:[4498,LG,6600,LOW]},{type:'hollow',pts:rect(5350,LOW-2,5650,LOW+70),box:[5350,LOW-2,5650,LOW+70]},
 {type:'lake',x:3900,y:LG+20,w:600,h:LOW-LG-20},{type:'waterfall',x:3836,y:P,w:64,h:LOW-P,front:true},{type:'waterfall',x:4500,y:P,w:48,h:LG-P,front:true},
 {type:'lake',x:8200,y:GF-90,w:700,h:90},{type:'waterfall',x:8136,y:G,w:64,h:GF-G,front:true},{type:'waterfall',x:8900,y:G,w:48,h:GF-G,front:true},
 {type:'lake',x:13000,y:G+40,w:500,h:LB-G-40},{type:'waterfall',x:12952,y:G,w:48,h:LB-G,front:true},
 {type:'lake',x:15600,y:CH-70,w:300,h:70},{type:'waterfall',x:15552,y:MT,w:48,h:CH-MT,front:true},{type:'waterfall',x:15900,y:MT,w:40,h:CH-MT-60,front:true}];
function buildZone1Act1(){if(!terrain)terrain=buildTerrain();
 return {T:terrain,objs:objects(),switchers:switchers(),decor:decor(),start:{x:120,y:G-19},bounds:{x0:0,x1:18600,y0:0,y1:H-80},bottom:H-80,ref:G+40,zone:'SHAMB ISLAND',act:1,
  marks:[[1900,'loop 1'],[2225,'step + spring: top route'],[3100,'roll tunnel 1 (inside the plateau)'],[4200,'lake 1 + bridge'],[5300,'high ledges / cave below'],[7000,'loop 2'],[8550,'waterfall gorge: vines'],
   [9325,'step + spring: top'],[10200,'roll tunnel 2 (under the hill)'],[12500,'loop 3 + ledges'],[13250,'lake 2: crumbling bridge'],[14900,'mesa: step + spring up / tunnel below'],[15750,'chasm'],[17200,'loop 4'],[18350,'sign'],[550,'stairs'],[4580,'secret room']]};}
Object.assign(exports,{buildZone1Act1,G,gy});
