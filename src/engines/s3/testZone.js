// The engine's test area ("TEST ZONE"): one short stretch with every piece the engine has so far, so the controls and
// physics can be tried on a phone before the real Zone 1. Left to right: start, a valley, the shield monitors and a
// charger, the loop (two collision paths + plane switchers), a spring up to a one-way ledge (upper route: shooter, rings,
// zip line down) over a lower route (spikes, breakable wall, thrower), a bottomless pit with a swing vine and a moving
// platform, a starpost, a flyer, a diagonal spring, a long downhill, and the end-of-act sign. Pure data: buildTestZone()
// gives the terrain (built once and reused) and a fresh list of objects for every run.
const {Terrain,arc,ease}=require("src/engines/s3/terrain.js");
const FY=1200,W=7800,H=1600,R=112,CX=2600,CY=FY-R,BAND=24,PIT0=4800,PIT1=5300,LOW=FY+200;
let terrain=null;
function buildTerrain(){const T=new Terrain(W,H);
 T.poly([[0,FY],[900,FY],...ease(900,FY,1300,FY+90).slice(1),...ease(1300,FY+90,1700,FY).slice(1),[PIT0,FY],[PIT0,H],[0,H]]);
 T.poly([[PIT1,FY],[6000,FY],...ease(6000,FY,6700,LOW).slice(1),[7600,LOW],[7600,LOW-700],[W,LOW-700],[W,H],[PIT1,H]]);
 // the loop: right half on path A, left half on path B
 T.poly([...arc(CX,CY,R+BAND,-Math.PI/2,Math.PI/2),...arc(CX,CY,R,Math.PI/2,-Math.PI/2)],'a');
 T.poly([...arc(CX,CY,R+BAND,Math.PI/2,Math.PI*1.5),...arc(CX,CY,R,Math.PI*1.5,Math.PI/2)],'b');
 // upper route: a one-way ledge you jump up through
 T.poly([[3150,FY-200],[3950,FY-200],[3950,FY-184],[3150,FY-184]],'top');
 return T.build();}
const switchers=()=>[{x:CX,y0:CY-R-60,y1:CY-R*.3,left:'b',right:'a'},{x:CX+R+70,y0:CY-R,y1:FY+40,left:'a',right:'a'},{x:CX-R-70,y0:CY-R,y1:FY+40,left:'a',right:'a'}];
function objects(){const o=[],ring=(x,y)=>o.push({type:'ring',x,y}),row=(x0,y,n,dx=24)=>{for(let k=0;k<n;k++)ring(x0+k*dx,y);};
 row(300,FY-24,6);
 o.push({type:'monitor',x:650,y:FY-16,item:'rings'});
 // rings over the valley in an arc
 for(let k=0;k<9;k++){const t=k/8,x=950+t*700;ring(x,FY+45*Math.sin(t*Math.PI)-30-60*Math.sin(t*Math.PI));}
 o.push({type:'monitor',x:1880,y:FY-16,item:'fire'},{type:'monitor',x:1950,y:FY-16,item:'bubble'},{type:'monitor',x:2020,y:FY-16,item:'lightning'});
 o.push({type:'badnik',kind:'charger',x:2250,y:FY-14,dir:-1});
 // rings round the inside of the loop
 for(let k=0;k<12;k++){const a=Math.PI/2+k/12*Math.PI*2;ring(CX+Math.cos(a)*(R-19),CY+Math.sin(a)*(R-19));}
 o.push({type:'monitor',x:2900,y:FY-16,item:'shoes'});
 // spring up to the ledge; upper route
 o.push({type:'spring',x:3090,y:FY-4,dir:'up',color:'yellow'});
 row(3300,FY-224,8,32);o.push({type:'badnik',kind:'shooter',x:3700,y:FY-214,still:false});
 o.push({type:'zipline',x0:3960,y0:FY-240,x1:4740,y1:FY-90,g1:FY});
 // lower route under it
 o.push({type:'spikes',x:3480,y:FY-8,dir:'up',w:64,h:16});
 o.push({type:'wall',x:3860,y:FY-32,w:32,h:64});row(3950,FY-24,5);
 o.push({type:'badnik',kind:'thrower',x:4300,y:FY-60});
 o.push({type:'monitor',x:4600,y:FY-16,item:'life'});
 // the pit: a swing vine and a moving platform
 o.push({type:'vine',x:5050,y:FY-240,len:120,amp:.9,period:150});
 o.push({type:'platform',x:5050,y:FY-20,w:80,h:16,move:'h',range:150,period:260});
 row(4880,FY-110,5,30);
 o.push({type:'starpost',x:5420,y:FY-24});
 o.push({type:'badnik',kind:'flyer',x:5700,y:FY-110,w:12,h:12});row(5600,FY-24,6);
 o.push({type:'spring',x:5880,y:FY-8,dir:'ur',color:'yellow'});
 // downhill: rings down the slope, a charger at the bottom
 for(let k=0;k<10;k++){const x=6050+k*64,t=Math.min(1,(x-6000)/700);ring(x,FY+(LOW-FY)*(1-Math.cos(Math.PI*t))/2-28);}
 o.push({type:'badnik',kind:'charger',x:6900,y:LOW-14,dir:-1});
 o.push({type:'platform',x:6950,y:LOW-110,w:96,h:16,move:'fall'});row(6920,LOW-140,3);
 o.push({type:'monitor',x:7100,y:LOW-16,item:'star'});
 o.push({type:'sign',x:7350,y:LOW-16});
 return o;}
function buildTestZone(){if(!terrain)terrain=buildTerrain();
 return {T:terrain,objs:objects(),switchers:switchers(),start:{x:120,y:FY-19},bounds:{x0:0,x1:7600,y0:0,y1:H-80},bottom:H-80,ref:FY+40,zone:'TEST',act:1};}
Object.assign(exports,{buildTestZone,FY});
