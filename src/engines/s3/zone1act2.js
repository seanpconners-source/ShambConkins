// ZONE 1, ACT 2 ("SHAMB ISLAND" level 2, design docs/sonic3/STAGE2.md): our own map in the mould of a classic second
// zone: faster, more height, set pieces you remember. Left to right:
//   start        a hill, loop 1
//   corkscrew 1  a ramp up to a raised track that twists round twice: at speed you run round it, too slow and you drop to
//                the low road under it (robots, a SEESAW that fires you up to a 1-up ledge)
//   the cliffs   two cliffs with waterfalls, red springs up the faces, a ledge over the first top, starpost
//   the hill     a WARP TUBE through it, out onto the lagoon bridge
//   lagoon       the bridge with robot FISH leaping through the planks; the lake bed under it (rings, a spring out)
//   the climb    diagonal springs on a slope up to the HIGH ROUTE (a long treetop shelf, a zip line down); the low route
//                crosses a pit on three SWINGING PLATFORMS (fall in: a red spring out)
//   double loop  two loops back to back, starpost, monkey robots, a second seesaw under a monitor ledge
//   corkscrew 2  three turns long over the lowland; the lowland has a bridge with a SPIKE LOG on it
//   finish       a waterfall drop, loop 4, the sign
// Pure data like zone1.js: buildZone1Act2() gives the terrain (built once) and a fresh list of objects for every run.
const {Terrain,arc,ease}=require("src/engines/s3/terrain.js");
const G=1500,W=22400,H=2600,R=112,BAND=24,TH=28,FOOT=40;
const CK1=G-120,LR=G+100,CL1=G-200,CL2=G-400,LB=G+300,SLT=G-220,PIT=G+250,HI=G-440,CK2=G-140,LOW2=G+80,RUN=G+100;
const LOOPS=[[1700,G],[12600,G],[13020,G],[20300,RUN]];
const CORKS=[{x0:2550,y:CK1,turns:2},{x0:15450,y:CK2,turns:3}],TURN=480,CR=64;
const E=(x0,y0,x1,y1)=>ease(x0,y0,x1,y1).slice(1);
const SURF=[[0,G],[500,G],...E(500,G,800,G-110),[950,G-110],...E(950,G-110,1250,G),[2050,G],
 // corkscrew 1: ramp up to the raised track, then the drop to the low road under it
 ...E(2050,G,2350,CK1),[2550,CK1],[2550,LR],[4000,LR],...E(4000,LR,4400,G),
 // the cliffs
 [4700,G],[4700,CL1],[5500,CL1],[5500,CL2],[6100,CL2],...E(6100,CL2,6700,G),
 // the hill with the warp tube under it
 [6900,G],...E(6900,G,7200,G-220),[7600,G-220],...E(7600,G-220,7900,G),[8100,G],
 // lagoon
 [8100,LB],[8900,LB],[8900,G],
 // the slope up, the pit, down again
 [9300,G],...E(9300,G,9800,SLT),[10100,SLT],[10100,PIT],[11000,PIT],[11000,SLT],[11400,SLT],...E(11400,SLT,11800,G),
 // double loop, then the run to corkscrew 2
 [15000,G],...E(15000,G,15300,CK2),[15450,CK2],[15450,LOW2],
 // the lowland with its lake + bridge, back up
 [16600,LOW2],[16600,LOW2+240],[17200,LOW2+240],[17200,LOW2],[17950,LOW2],...E(17950,LOW2,18300,G),
 // the waterfall drop, loop 4, the sign
 [19400,G],[19400,RUN],[20800,RUN],...E(20800,RUN,21200,G),[W,G]];
function gy(x){for(let i=1;i<SURF.length;i++){const a=SURF[i-1],b=SURF[i];if(x<=b[0]&&b[0]>a[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return G;}
// the warp tube through the hill: centre line (the tunnel is TH above and below)
const TUBE=[[6780,G-TH],[6980,G-TH],...E(6980,G-TH,7250,G+150),[7550,G+150],...E(7550,G+150,7850,G-TH),[8020,G-TH]];
const tubePoly=L=>{const up=[],dn=[];L.forEach(([x,y],i)=>{const a=L[Math.max(0,i-1)],b=L[Math.min(L.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;up.push([x-nx*TH,y-ny*TH]);dn.push([x+nx*TH,y+ny*TH]);});return [...up,...dn.reverse()];};
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
// a loop foot (same shape as Act 1's): up the band's outer edge, then a fillet down to the ground FOOT px out
function footPoly(cx,fy,s){const cy=fy-R,RB=R+BAND,ac=Math.asin(Math.min(1,R/RB)),a0=s>0?ac:Math.PI-ac,a1=s>0?Math.PI*.17:Math.PI*.83,pts=[];
 for(let k=0;k<=12;k++){const a=a0+(a1-a0)*k/12;pts.push([cx+Math.cos(a)*RB,cy+Math.sin(a)*RB]);}
 const [tx,ty]=pts[pts.length-1],ex=tx+s*FOOT,qx=tx+s*FOOT*.12;for(let k=1;k<=10;k++){const u=k/10;pts.push([(1-u)*(1-u)*tx+2*(1-u)*u*qx+u*u*ex,(1-u)*(1-u)*ty+2*(1-u)*u*fy+u*u*fy]);}
 pts.push([ex,fy+4],[pts[0][0],fy+4]);return pts;}
let terrain=null;const LEDGES=[];
function buildTerrain(){const T=new Terrain(W,H);
 T.poly([...SURF,[W,H],[0,H]]);
 T.poly(tubePoly(TUBE),'all','cut');
 for(const [cx,fy] of LOOPS){const cy=fy-R;
  T.poly([...arc(cx,cy,R+BAND,-Math.PI/2,Math.PI/2),...arc(cx,cy,R,Math.PI/2,-Math.PI/2)],'a');
  T.poly([...arc(cx,cy,R+BAND,Math.PI/2,Math.PI*1.5),...arc(cx,cy,R,Math.PI*1.5,Math.PI/2)],'b');
  T.poly(footPoly(cx,fy,1),'a');T.poly(footPoly(cx,fy,-1),'b');}
 const ledge=(x0,x1,y,kind)=>{T.poly(rect(x0,y,x1,y+16),'top');LEDGES.push([x0,x1,y,kind]);};LEDGES.length=0;
 // where each corkscrew comes down: a landing shelf at the track's height
 for(const c of CORKS){const x1=c.x0+TURN*c.turns;ledge(x1,x1+(c.turns>2?360:290),c.y,c.turns>2?'float':undefined);}// (corkscrew 2's shelf is over the lake: no rock under it)
 ledge(3880,4060,G-200);// over the first seesaw (low road): a 1-up
 ledge(4880,5240,CL1-150);// over the first cliff top
 ledge(8100,8900,G);LEDGES.pop();// the lagoon bridge (stays planks)
 ledge(9900,11300,HI,'float');// the high route along the treetops (a floating strip: rock legs would stand in the pit)
 ledge(14380,14560,G-280);// over the second seesaw: a monitor
 ledge(16600,17200,LOW2);LEDGES.pop();// the lowland bridge (spike log on it)
 return T.build();}
const switchers=()=>LOOPS.flatMap(([cx,fy])=>{const cy=fy-R;return [{x:cx,y0:cy-R-60,y1:cy-R*.3,left:'b',right:'a'},{x:cx+R+70,y0:cy-R,y1:fy+40,left:'a',right:'a'},{x:cx-R-70,y0:cy-R,y1:fy+40,left:'a',right:'a'}];});
function objects(){const o=[],ring=(x,y)=>o.push({type:'ring',x,y}),row=(x0,y,n,dx=24)=>{for(let k=0;k<n;k++)ring(x0+k*dx,y);};
 const land=(x0,n,dx=32,up=24)=>{for(let k=0;k<n;k++)ring(x0+k*dx,gy(x0+k*dx)-up);};
 const loopRings=(cx,fy)=>{for(let k=0;k<12;k++){const a=Math.PI/2+k/12*Math.PI*2;ring(cx+Math.cos(a)*(R-19),fy-R+Math.sin(a)*(R-19));}};
 const mon=(x,y,item)=>o.push({type:'monitor',x,y:y-16,item}),bad=(kind,x,y,more)=>o.push({type:'badnik',kind,x,y,...more});
 const spring=(x,y,dir,color)=>o.push({type:'spring',x,y:y-(dir==='up'?4:8),dir,color}),spikes=(x,y,w=64)=>o.push({type:'spikes',x,y:y-8,dir:'up',w,h:16});
 // rings round a corkscrew's helix (where the runner's middle passes)
 const corkRings=(c,n)=>{for(let k=0;k<n;k++){const x=c.x0+60+k*(TURN*c.turns-120)/(n-1),a=(x-c.x0)/TURN*2*Math.PI;ring(x,c.y-CR+Math.cos(a)*(CR-19));}};
 // ---- start, the hill, loop 1
 row(250,G-24,4);land(560,8,32);row(860,G-150,4,30);mon(1100,G,'rings');loopRings(1700,G);row(1900,G-24,5);
 // ---- corkscrew 1 (raised) and the low road under it
 for(const c of CORKS)o.push({type:'corkscrew',x0:c.x0,y:c.y,turns:c.turns,turn:TURN,r:CR});
 land(2080,9,30);corkRings(CORKS[0],14);row(3540,CK1-24,8,30);
 row(2620,LR-24,6);bad('charger',2900,LR-14,{dir:-1});mon(3200,LR,'shield');row(3300,LR-24,5);bad('shooter',3650,LR-14);
 o.push({type:'seesaw',x:3920,y:LR,tilt:1});row(3900,G-224,4,26);mon(4030,G-200,'life');
 // ---- the cliffs: red springs at the foot of each face, a ledge over the first top, starpost
 row(4420,G-24,6);spring(4680,G,'up','red');row(4780,CL1-24,4);spring(4860,CL1,'up','yellow');row(4900,CL1-174,10,32);mon(5200,CL1-150,'fire');
 o.push({type:'starpost',x:5300,y:CL1-24});bad('charger',5400,CL1-14,{dir:-1});spring(5480,CL1,'up','red');
 row(5560,CL2-24,6,30);bad('thrower',5800,CL2-60);mon(6000,CL2,'shoes');land(6140,14,40);
 // ---- the hill with the warp tube under it, out onto the lagoon
 o.push({type:'tube',x:(6780+8020)/2,y:G+60,w:8020-6780,h:400,dir:1,min:8,path:TUBE});
 row(6960,G-60,4,28);row(7240,G-244,10,32);bad('flyer',7450,G-360,{w:12,h:12});
 // ---- lagoon: bridge with leaping fish, the lake bed below
 row(8160,G-24,22,30);[8300,8520,8740].forEach((x,k)=>bad('fish',x,G+70,{w:12,h:12,period:150,phase:k*48,jump:200,still:false}));
 row(8200,LB-24,12,40);mon(8500,LB,'bubble');mon(8540,LB,'rings');spring(8860,LB,'up','red');
 // ---- the climb: diagonal red springs on the slope up to the treetops; the pit with swinging platforms below
 row(8960,G-24,8,30);spring(9480,gy(9480),'ur','red');spring(9700,gy(9700),'ur','red');
 row(9960,HI-24,14,40);mon(10560,HI,'lightning');bad('flyer',10800,HI-120,{w:12,h:12});row(10900,HI-24,10,32);
 o.push({type:'zipline',x0:11240,y0:HI-40,x1:11920,y1:G-70,g0:HI,g1:gy(11926)});
 row(9840,SLT-24,6,30);
 [10330,10560,10790].forEach((x,k)=>o.push({type:'platform',move:'swing',x,y:HI+16,len:170,w:72,h:16,amp:.5,period:170,phase:k*30}));
 for(const x of [10330,10560,10790])row(x-24,HI+130,3,24);
 row(10200,PIT-24,10,40);spikes(10600,PIT);spring(10978,PIT,'up','red');row(11050,SLT-24,8,30);land(11420,10,36);
 // ---- double loop, starpost, monkeys, seesaw 2
 row(11980,G-24,8,30);loopRings(12600,G);loopRings(13020,G);o.push({type:'starpost',x:13420,y:G-24});
 row(13500,G-24,6);bad('thrower',13820,G-60);bad('thrower',14120,G-60);row(13900,G-24,6,30);
 o.push({type:'seesaw',x:14460,y:G,tilt:1});row(14400,G-304,4,30);mon(14520,G-280,'star');
 row(14650,G-24,10,30);bad('charger',14800,G-14,{dir:-1});
 // ---- corkscrew 2 and the lowland (bridge with the spike log)
 land(15030,8,30);corkRings(CORKS[1],20);row(16930,CK2-24,10,30);
 row(15520,LOW2-24,10,40);bad('charger',16000,LOW2-14,{dir:-1});mon(16300,LOW2,'rings');
 o.push({type:'spikelog',x:16900,y:LOW2,w:64,period:150});row(16640,LOW2-24,8,26);row(17020,LOW2-24,6,26);
 row(17300,LOW2-24,10,32);bad('shooter',17700,LOW2-14);land(18000,10,32);
 // ---- finish: the drop, loop 4, the sign
 row(18400,G-24,8,30);bad('flyer',18900,G-140,{w:12,h:12});row(19000,G-24,8,30);row(19460,RUN-24,10,30);loopRings(20300,RUN);row(20500,RUN-24,8);
 land(20860,10,32);bad('charger',21400,G-14,{dir:-1});row(21500,G-24,8);
 o.push({type:'sign',x:21900,y:G-16});
 return o;}
// ground scenery: bushes, flowers, totems on flat ground (seeded), away from water, pits, loops and seesaws
const WET=[[8060,8940],[10060,11040],[16560,17240],[3860,4000],[14400,14520]];
const groundProps=()=>{const o=[];let r=7331;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;
 for(let x=240;x<W-300;x+=70+rnd()*150){if(WET.some(([a,b])=>x>a-40&&x<b+40))continue;if(LOOPS.some(([cx])=>Math.abs(x-cx)<R+BAND+FOOT+20))continue;
  const y=gy(x);if(Math.abs(gy(x+24)-gy(x-24))>5)continue;const k=rnd();o.push(k<.5?{type:'bush',x,y}:k<.85?{type:'flower',x,y}:{type:'totem',x,y});}return o;};
const clearOfRock=x=>!LEDGES.some(([x0,x1,y])=>{const tall=Math.max(gy(x0+8),gy(x1-8))-y;return tall>=60&&x>x0-70&&x<x1+70;});
const loopFeet=()=>LOOPS.map(([cx,fy])=>({type:'loopfoot',cx,cy:fy-R,R,B:BAND,fy,side:1,poly:footPoly(cx,fy,1),over:true,x:cx,w:R+BAND+FOOT+20}));
const decor=()=>[
 ...loopFeet(),
 ...[180,1150,2250,4500,5350,6400,7000,9050,11600,13600,14000,15200,18500,18950,19700,21300,21700].filter(clearOfRock).filter(x=>!LOOPS.some(([cx])=>Math.abs(x-cx)<R+BAND+FOOT+30)).map((x,k)=>{const h=(x*7919+k*104729)%997;
  return {type:'palm',x,y:Math.max(gy(x-14),gy(x+14))+5,flip:h%2===1,s:.84+(h%33)/100,alt:h%3===0};}),
 ...groundProps().filter(o=>clearOfRock(o.x)),{type:'bridge',x0:8100,x1:8900,y:G,x:8100,w:800,front:true},{type:'bridge',x0:16600,x1:17200,y:LOW2,x:16600,w:600,front:true},
 ...LEDGES.flatMap(([x0,x1,y,force],k)=>{const w=x1-x0,ground=Math.max(gy(x0+8),gy((x0+x1)/2),gy(x1-8)),tall=ground-y,kind=force||(w>=500?'legs':w>=280||k%2?'tower':'float');
  if(kind==='float'||tall<60)return [{type:'land',x0,x1,y,x:x0,w,depth:w<120?36:52,front:true}];
  return [{type:'cliff',x0,x1,y,y1:ground+6,x:x0,w,legs:kind==='legs'?(w>=900?4:3):0},{type:'land',x0,x1,y,x:x0,w,depth:kind==='legs'?30:18,front:true}];}),
 {type:'hollow',pts:tubePoly(TUBE),box:[6780,G-60,8020,G+190]},
 // the cliffs pour waterfalls down their faces (behind the runner: the springs at their feet stay in view)
 {type:'waterfall',x:4652,y:CL1,w:48,h:G-CL1},{type:'waterfall',x:5452,y:CL2,w:48,h:CL1-CL2},
 {type:'lake',x:8100,y:G+60,w:800,h:LB-G-60},{type:'waterfall',x:8052,y:G,w:48,h:LB-G,front:true},{type:'waterfall',x:8900,y:G,w:44,h:LB-G,front:true},
 {type:'lake',x:16600,y:LOW2+50,w:600,h:190},{type:'waterfall',x:16552,y:LOW2,w:48,h:240,front:true},
 {type:'lake',x:10100,y:PIT-40,w:900,h:40},
 {type:'waterfall',x:19352,y:G,w:48,h:RUN-G,front:true}];
function buildZone1Act2(){if(!terrain)terrain=buildTerrain();
 return {T:terrain,objs:objects(),switchers:switchers(),decor:decor(),start:{x:120,y:G-19},bounds:{x0:0,x1:22200,y0:0,y1:H-80},bottom:H-80,ref:G+40,zone:'SHAMB ISLAND',act:2,
  marks:[[1700,'loop 1'],[3000,'corkscrew 1 / low road + seesaw'],[4700,'cliff 1 (red spring)'],[5500,'cliff 2'],[7300,'warp tube'],[8500,'lagoon: fish'],[9600,'spring slope'],
   [10600,'high route / swinging platforms'],[12800,'double loop'],[14460,'seesaw 2'],[16100,'corkscrew 2'],[16900,'spike log'],[19400,'waterfall drop'],[20300,'loop 4'],[21900,'sign']]};}
Object.assign(exports,{buildZone1Act2,G,gy,CORKS});
