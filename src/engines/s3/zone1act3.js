// ZONE 1, ACT 3 ("SHAMB ISLAND" level 3, owner Nov 11 round 4: "a cool shorter level that plays the Sonic 3 Act 1 music,
// then it has the real boss at the end"). Our own map, short and fast, ending in the zone's big boss and a capsule (like
// the end of a Sonic 3 zone). Left to right:
//   start        a little hill, then a LONG DOWNHILL into loop 1 on the low ground
//   the hill     a WARP TUBE through it (out the far side at speed)
//   the lake     a log bridge with leaping robot fish; the lake bed underneath (rings, a red spring out)
//   the plateau  starpost, a red spring up the cliff, monkeys, a spring to the TREETOP route (one-way ledge)
//   the pit      swinging platforms over a spike pit (fall in: a red spring out), a zip line from the treetops down
//   the run      downhill into loop 2, a starpost
//   THE BOSS     a flying pod with a spiked mace (objects.js type boss, kind 'big'): 8 hits; then the CAPSULE (jump on its
//                button: the act is clear)
// Pure data like the other acts: buildZone1Act3() gives the terrain (built once) and a fresh list of objects for every run.
const {Terrain,arc,ease}=require("src/engines/s3/terrain.js");
const G=1500,W=11800,H=2400,R=112,BAND=24,TH=28,FOOT=40,OV=.35;
const DROP=G+160,LB=G+260,CL=G-200,HI=G-420,PIT=G+180;
const LOOPS=[[2300,DROP],[9900,G]];
const E=(x0,y0,x1,y1)=>ease(x0,y0,x1,y1).slice(1);
const SURF=[[0,G],[600,G],...E(600,G,900,G-80),[1100,G-80],...E(1100,G-80,1800,DROP),[2900,DROP],...E(2900,DROP,3300,G),
 // the hill with the warp tube under it
 [3500,G],...E(3500,G,3800,G-240),[4200,G-240],...E(4200,G-240,4550,G),[4900,G],
 // the lake (log bridge over it)
 [4900,LB],[5800,LB],[5800,G],
 // the plateau: up the cliff, along the top
 [6300,G],[6300,CL],[7500,CL],
 // the spike pit, then back up to the plateau height and down the slope
 [7500,PIT],[8400,PIT],[8400,CL],[8700,CL],...E(8700,CL,9300,G),
 // loop 2, the starpost, the arena, the capsule
 [W,G]];
function gy(x){for(let i=1;i<SURF.length;i++){const a=SURF[i-1],b=SURF[i];if(x<=b[0]&&b[0]>a[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return G;}
// the warp tube through the hill: centre line (the tunnel is TH above and below)
const TUBE=[[3380,G-TH],[3560,G-TH],...E(3560,G-TH,3820,G+130),[4100,G+130],...E(4100,G+130,4400,G-TH),[4640,G-TH]];
const tubePoly=L=>{const up=[],dn=[];L.forEach(([x,y],i)=>{const a=L[Math.max(0,i-1)],b=L[Math.min(L.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;up.push([x-nx*TH,y-ny*TH]);dn.push([x+nx*TH,y+ny*TH]);});return [...up,...dn.reverse()];};
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
// a loop foot (same shape as the other acts): up the band's outer edge, then a fillet down to the ground FOOT px out
function footPoly(cx,fy,s){const cy=fy-R,RB=R+BAND,ac=Math.asin(Math.min(1,R/RB)),a0=s>0?ac:Math.PI-ac,a1=s>0?Math.PI*.17:Math.PI*.83,pts=[];
 for(let k=0;k<=12;k++){const a=a0+(a1-a0)*k/12;pts.push([cx+Math.cos(a)*RB,cy+Math.sin(a)*RB]);}
 const [tx,ty]=pts[pts.length-1],ex=tx+s*FOOT,qx=tx+s*FOOT*.12;for(let k=1;k<=10;k++){const u=k/10;pts.push([(1-u)*(1-u)*tx+2*(1-u)*u*qx+u*u*ex,(1-u)*(1-u)*ty+2*(1-u)*u*fy+u*u*fy]);}
 pts.push([ex,fy+4],[pts[0][0],fy+4]);return pts;}
let terrain=null;const LEDGES=[];
function buildTerrain(){const T=new Terrain(W,H);
 T.poly([...SURF,[W,H],[0,H]]);
 T.poly(tubePoly(TUBE),'all','cut');
 for(const [cx,fy] of LOOPS){const cy=fy-R;
  // the halves overlap OV over the top (a fast ball jumped the seam before the path switch)
  T.poly([...arc(cx,cy,R+BAND,-Math.PI/2-OV,Math.PI/2),...arc(cx,cy,R,Math.PI/2,-Math.PI/2-OV)],'a');
  T.poly([...arc(cx,cy,R+BAND,Math.PI/2,Math.PI*1.5+OV),...arc(cx,cy,R,Math.PI*1.5+OV,Math.PI/2)],'b');
  T.poly(footPoly(cx,fy,1),'a');T.poly(footPoly(cx,fy,-1),'b');}
 const ledge=(x0,x1,y,kind)=>{T.poly(rect(x0,y,x1,y+16),'top');LEDGES.push([x0,x1,y,kind]);};LEDGES.length=0;
 ledge(4900,5800,G);LEDGES.pop();// the lake's log bridge (stays planks)
 ledge(6700,7700,HI,'float');// the treetop route (floats: rock legs would stand in the pit)
 ledge(1250,1450,G-200);// over the downhill: a monitor
 return T.build();}
const switchers=()=>LOOPS.flatMap(([cx,fy])=>{const cy=fy-R;return [{x:cx,y0:cy-R-60,y1:cy-R*.3,left:'b',right:'a'},{x:cx+R+70,y0:cy-R,y1:fy+40,left:'a',right:'a'},{x:cx-R-70,y0:cy-R,y1:fy+40,left:'a',right:'a'}];});
// the boss arena and the capsule after it
const ARENA=[10600,11220],CAPSULE=11480;
function objects(){const o=[],ring=(x,y)=>o.push({type:'ring',x,y}),row=(x0,y,n,dx=24)=>{for(let k=0;k<n;k++)ring(x0+k*dx,y);};
 const land=(x0,n,dx=32,up=24)=>{for(let k=0;k<n;k++)ring(x0+k*dx,gy(x0+k*dx)-up);};
 const loopRings=(cx,fy)=>{for(let k=0;k<12;k++){const a=Math.PI/2+k/12*Math.PI*2;ring(cx+Math.cos(a)*(R-19),fy-R+Math.sin(a)*(R-19));}};
 const mon=(x,y,item)=>o.push({type:'monitor',x,y:y-16,item}),bad=(kind,x,y,more)=>o.push({type:'badnik',kind,x,y,...more});
 const spring=(x,y,dir,color)=>o.push({type:'spring',x,y:y-(dir==='up'?4:8),dir,color}),spikes=(x,y,w=64)=>o.push({type:'spikes',x,y:y-8,dir:'up',w,h:16});
 // ---- start, the downhill, loop 1
 row(240,G-24,5);land(640,8,32);row(1270,G-224,6,30);mon(1420,G-200,'shoes');
 land(1150,18,36);loopRings(2300,DROP);row(2500,DROP-24,6);bad('charger',2760,DROP-14,{dir:-1});land(2950,10,36);
 // ---- the hill with the warp tube
 o.push({type:'tube',x:(3380+4640)/2,y:G+50,w:4640-3380,h:380,dir:1,min:8,path:TUBE});
 row(3600,G-264,8,32);bad('flyer',3950,G-380,{w:12,h:12});mon(4000,G-240,'lightning');
 // ---- the lake: log bridge, fish, the lake bed
 row(4700,G-24,6);row(4960,G-24,20,40);[5100,5350,5600].forEach((x,k)=>bad('fish',x,G+70,{w:12,h:12,period:150,phase:k*50,jump:200,still:false}));
 row(5000,LB-24,14,48);mon(5400,LB,'bubble');spring(5760,LB,'up','red');
 // ---- the plateau: starpost, red spring up the cliff, monkeys, a spring to the treetops
 o.push({type:'starpost',x:6000,y:G-24});row(6080,G-24,6);spring(6270,G,'up','red');
 row(6360,CL-24,6,30);bad('thrower',6600,CL-60);spring(6680,CL,'up','yellow');row(6760,HI-24,16,48);mon(7300,HI,'fire');bad('flyer',7500,HI-110,{w:12,h:12});
 bad('charger',7100,CL-14,{dir:-1});row(7200,CL-24,8,30);
 // ---- the pit: swinging platforms over the spikes; a zip line from the treetops to the far side
 [7700,7930,8160].forEach((x,k)=>o.push({type:'platform',move:'swing',x,y:CL-170,len:150,w:72,h:16,amp:.5,period:170,phase:k*30}));
 for(const x of [7700,7930,8160])row(x-24,CL-70,3,24);
 o.push({type:'zipline',x0:7660,y0:HI-40,x1:8580,y1:CL-70,g0:HI,g1:CL});
 spikes(7700,PIT,96);spikes(7950,PIT,96);spikes(8200,PIT,96);row(7580,PIT-24,3);spring(8370,PIT,'up','red');
 row(8460,CL-24,6,30);land(8760,14,36);
 // ---- loop 2, starpost, the run to the boss
 loopRings(9900,G);row(10100,G-24,5);o.push({type:'starpost',x:10350,y:G-24});row(10420,G-24,4);mon(10520,G,'rings');// 10 rings for the fight
 // ---- THE BOSS, then the capsule
 o.push({type:'boss',kind:'big',x0:ARENA[0],x1:ARENA[1],gy:G,x:(ARENA[0]+ARENA[1])/2,y:G-190});
 o.push({type:'capsule',x:CAPSULE,y:G});
 return o;}
// ground scenery: bushes, flowers, totems on flat ground (seeded), away from water, pits, loops and the arena
const WET=[[4860,5840],[7460,8440]];
const groundProps=()=>{const o=[];let r=9127;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;
 for(let x=240;x<W-300;x+=70+rnd()*150){if(WET.some(([a,b])=>x>a-40&&x<b+40))continue;if(LOOPS.some(([cx])=>Math.abs(x-cx)<R+BAND+FOOT+20))continue;if(x>ARENA[0]-40&&x<CAPSULE+80)continue;
  const y=gy(x);if(Math.abs(gy(x+24)-gy(x-24))>5)continue;const k=rnd();o.push(k<.5?{type:'bush',x,y}:k<.85?{type:'flower',x,y}:{type:'totem',x,y});}return o;};
const clearOfRock=x=>!LEDGES.some(([x0,x1,y])=>{const tall=Math.max(gy(x0+8),gy(x1-8))-y;return tall>=60&&x>x0-70&&x<x1+70;});
const loopFeet=()=>LOOPS.map(([cx,fy])=>({type:'loopfoot',cx,cy:fy-R,R,B:BAND,fy,side:1,poly:footPoly(cx,fy,1),over:true,x:cx,w:R+BAND+FOOT+20}));
let MK=null;const MONKEYS=()=>MK||(MK=objects().filter(o=>o.kind==='thrower').map(o=>o.x+12));
const monkeyPalms=()=>MONKEYS().map(x=>({type:'palm',x,y:gy(x)+5,s:1.22,flip:false,monkey:true}));
const nearMonkey=x=>MONKEYS().some(m=>Math.abs(x-m)<70);
const decor=()=>[
 ...loopFeet(),
 ...[160,520,1000,3150,4650,6100,6450,7050,8600,9350,10450,10700,11150,11650].filter(clearOfRock).filter(x=>!LOOPS.some(([cx])=>Math.abs(x-cx)<R+BAND+FOOT+30)).map((x,k)=>{const h=(x*7919+k*104729)%997;
  return {type:'palm',x,y:Math.max(gy(x-14),gy(x+14))+5,flip:h%2===1,s:.84+(h%33)/100,alt:h%3===0};}),
 ...monkeyPalms(),...groundProps().filter(o=>clearOfRock(o.x)&&!nearMonkey(o.x)),{type:'bridge',x0:4900,x1:5800,y:G,x:4900,w:900,front:true},
 ...LEDGES.flatMap(([x0,x1,y,force],k)=>{const w=x1-x0,ground=Math.max(gy(x0+8),gy((x0+x1)/2),gy(x1-8)),tall=ground-y,kind=force||(w>=500?'legs':w>=280||k%2?'tower':'float');
  if(kind==='float'||tall<60)return [{type:'land',x0,x1,y,x:x0,w,depth:w<120?36:52,front:true}];
  return [{type:'cliff',x0,x1,y,y1:ground+6,x:x0,w,legs:kind==='legs'?(w>=900?4:3):0},{type:'land',x0,x1,y,x:x0,w,depth:kind==='legs'?30:18,front:true}];}),
 {type:'hollow',pts:tubePoly(TUBE),box:[3380,G-60,4640,G+170]},
 {type:'lake',x:4900,y:G+60,w:900,h:LB-G-60},{type:'waterfall',x:4852,y:G,w:48,h:LB-G,front:true},{type:'waterfall',x:5800,y:G,w:44,h:LB-G,front:true},
 {type:'waterfall',x:6252,y:CL,w:48,h:G-CL}];
function buildZone1Act3(){if(!terrain)terrain=buildTerrain();
 return {T:terrain,objs:objects(),switchers:switchers(),decor:decor(),start:{x:120,y:G-19},bounds:{x0:0,x1:W,y0:0,y1:H-80},bottom:H-80,ref:G+40,zone:'SHAMB ISLAND',act:3,
  marks:[[1500,'downhill'],[2300,'loop 1'],[4000,'warp tube'],[5300,'lake: fish'],[6300,'cliff (red spring)'],[7100,'treetops'],[7950,'spike pit / zip line'],[9900,'loop 2'],[10900,'BOSS'],[CAPSULE,'capsule']]};}
Object.assign(exports,{buildZone1Act3,G,gy,ARENA,CAPSULE});
