// Tony Hawk's Pro Mancala: street spots for the camera cutaways, besides the halfpipe: a handrail down a stair set, the
// stair set itself (flip it), a painted curb in a parking lot and a wooden kicker ramp. buildLine() lays the run out as
// timed parts (roll, air, grind, slam) in world units (one skater unit LU = the halfpipe's); lineState() says where the
// skater is at time t; drawSpot() paints the spot side-on with the riding surfaces seen a little from above.
const A=require("src/engines/proMancalaArt.js");
const {clamp}=A;
const LU=36,DEPTH=LU*1.3,V=880;
const STEP={rise:LU*.62,run:LU*1.1,n:8};
const TOP=-STEP.rise*STEP.n,SW=STEP.run*STEP.n;
const NAMES={stairs:'SCHOOL II · THE 8-SET',rail:'SCHOOL II · HANDRAIL',curb:'PARKING LOT · RED CURB',kicker:'THE KICKER',pipe:'THE HALFPIPE'};

function ground(L,x){
 if(L.spot==='stairs'||L.spot==='rail'){if(x<0)return TOP;if(x>=SW)return 0;return TOP+STEP.rise*(Math.floor(x/STEP.run)+1);}
 if(L.spot==='kicker'&&x>-L.kw&&x<0){const f=(x+L.kw)/L.kw;return -L.K*f*f;}
 return 0;}
function buildLine(spot,tr,bail){const L={spot,tr,bail,parts:[],T:0,name:NAMES[spot]};let t=0;
 const add=(p,d)=>{p.t0=t;p.t1=t+d;L.parts.push(p);t+=d;};
 const roll=(x0,x1)=>add({type:'roll',x0,x1},Math.abs(x1-x0)/V);
 const air=(p0,p1,h,d,r0=0,r1=0,trick=true)=>add({type:'air',p0,p1,h,r0,r1,trick},d);
 const grind=(p0,p1,d)=>add({type:'grind',p0,p1,ang:Math.atan2(p1.y-p0.y,p1.x-p0.x)},d);
 const end=x=>{if(bail)add({type:'slam',x},1.75);else roll(x,x+420);};
 if(spot==='stairs'){L.focus={x:SW/2,y:TOP/2};roll(-620,-30);air({x:-30,y:TOP},{x:SW+300,y:0},LU*2.3,1.0);end(SW+300);}
 else if(spot==='rail'){const r0={x:-12,y:TOP-LU*1.15},r1={x:SW+12,y:-LU*1.15};L.rail=[r0,r1];L.focus={x:SW/2,y:TOP/2-LU};
  roll(-620,-170);air({x:-170,y:TOP},r0,LU*1.1,.34);grind(r0,r1,.8);air(r1,{x:SW+300,y:0},LU*.9,.38,Math.atan2(r1.y-r0.y,r1.x-r0.x),0,false);end(SW+300);}
 else if(spot==='curb'){const c0={x:0,y:-LU*.5},c1={x:640,y:-LU*.5};L.curb=[c0,c1];L.focus={x:320,y:-LU};
  roll(-620,-120);air({x:-120,y:0},c0,LU*.9,.3);grind(c0,c1,.85);air(c1,{x:860,y:0},LU*.7,.33,0,0,false);end(860);}
 else{L.K=LU*1.7;L.kw=280;L.focus={x:450,y:-LU*2};roll(-900,0);air({x:0,y:-L.K},{x:980,y:0},LU*3.4,1.15,Math.atan2(-2*L.K,L.kw),0);end(980);}
 L.T=t;return L;}
function lineState(L,t){let p=L.parts[L.parts.length-1],idx=L.parts.length-1;for(let i=0;i<L.parts.length;i++)if(t<L.parts[i].t1){p=L.parts[i];idx=i;break;}
 const tau=clamp((t-p.t0)/(p.t1-p.t0),0,1);
 if(p.type==='roll'){const x=p.x0+(p.x1-p.x0)*tau,y=ground(L,x),y2=ground(L,x+4);return {mode:'roll',x,y,rot:L.spot==='kicker'?Math.atan2(y2-y,4):0,part:p,idx,tau};}
 if(p.type==='air')return {mode:'air',x:p.p0.x+(p.p1.x-p.p0.x)*tau,y:p.p0.y+(p.p1.y-p.p0.y)*tau-p.h*4*tau*(1-tau),rot:p.r0+(p.r1-p.r0)*tau,part:p,idx,tau};
 if(p.type==='grind')return {mode:'grind',x:p.p0.x+(p.p1.x-p.p0.x)*tau,y:p.p0.y+(p.p1.y-p.p0.y)*tau,rot:p.ang,part:p,idx,tau};
 // slam: tumbling forward along the ground, then lying there
 const k=clamp((t-p.t0)/.6,0,1),e=1-(1-k)*(1-k),x=p.x+260*e;
 return {mode:'slam',x,y:ground(L,x)-LU*.45-Math.sin(k*Math.PI)*LU*1.2,rot:Math.PI/2*e+(k<1?Math.sin(t*22)*.35:0),part:p,idx,tau,k};}

// ------------------------------------------------------------------ drawing
function band(q,x0,x1,y,d,col){q.fillStyle=col;q.beginPath();q.moveTo(x0,y);q.lineTo(x1,y);q.lineTo(x1,y-d);q.lineTo(x0,y-d);q.closePath();q.fill();}
function joints(q,x0,x1,y,d,gap){q.strokeStyle='rgba(40,38,34,.35)';q.lineWidth=2;for(let x=Math.ceil(x0/gap)*gap;x<x1;x+=gap){q.beginPath();q.moveTo(x,y);q.lineTo(x-d*.25,y-d);q.stroke();}}
const CONC_TOP='#c3bdb2',CONC_FACE='#8d877d',CONC_DARK='#6f6a62';
function school(q){// brick building behind the top of the stairs, windows, a sign
 q.fillStyle='#a9573f';q.fillRect(-2600,TOP-DEPTH-900,2800,900);q.fillStyle='rgba(0,0,0,.12)';for(let y=TOP-DEPTH-900;y<TOP-DEPTH;y+=18)q.fillRect(-2600,y,2800,2);
 for(let i=0;i<9;i++)for(let j=0;j<2;j++){const wx=-2450+i*290,wy=TOP-DEPTH-760+j*330;q.fillStyle='#2b3f55';q.fillRect(wx,wy,170,210);q.fillStyle='rgba(180,220,255,.35)';q.fillRect(wx+10,wy+10,70,190);q.strokeStyle='#e8e1d0';q.lineWidth=10;q.strokeRect(wx,wy,170,210);}
 q.fillStyle='#1d3d7a';q.fillRect(-1500,TOP-DEPTH-890,900,110);A.thps(q,'PRO MANCALA HIGH',-1050,TOP-DEPTH-835,80,{fill:'#ffe14d',lw:.15,maxW:860});}
function lot(q){// parking lot: storefronts, parked cars, painted lines
 q.fillStyle='#d7c9a6';q.fillRect(-2600,-DEPTH-700,5200,700);q.fillStyle='#7a2b2b';q.fillRect(-2600,-DEPTH-700,5200,90);
 for(let i=0;i<6;i++){q.fillStyle='#3c5770';q.fillRect(-2400+i*820,-DEPTH-520,560,360);q.fillStyle='rgba(255,255,255,.25)';q.fillRect(-2380+i*820,-DEPTH-500,200,320);}
 A.thps(q,'LIQUOR · SK8 · DONUTS',0,-DEPTH-655,70,{fill:'#fff',lw:.12,maxW:2400});
 for(let i=0;i<4;i++){const cx=-1900+i*1200,cy=-DEPTH-10;q.fillStyle=['#c0392b','#2c3e50','#f1c40f','#16a085'][i];q.beginPath();q.roundRect(cx-260,cy-170,520,120,40);q.fill();q.beginPath();q.roundRect(cx-160,cy-260,300,110,40);q.fill();
  q.fillStyle='rgba(180,220,255,.6)';q.fillRect(cx-130,cy-240,110,70);q.fillRect(cx,cy-240,110,70);q.fillStyle='#111';A.ell(q,cx-160,cy-45,55,55);q.fill();A.ell(q,cx+170,cy-45,55,55);q.fill();}}
function fence(q){q.strokeStyle='rgba(70,80,90,.6)';q.lineWidth=3;for(let x=-2600;x<2600;x+=40){q.beginPath();q.moveTo(x,-DEPTH-420);q.lineTo(x+200,-DEPTH);q.moveTo(x+200,-DEPTH-420);q.lineTo(x,-DEPTH);q.stroke();}
 q.fillStyle='#5f6a75';for(let x=-2600;x<2600;x+=420)q.fillRect(x,-DEPTH-440,14,440);q.fillRect(-2600,-DEPTH-440,5200,10);}
function cone(q,x,y,s){q.fillStyle='#ff6a13';q.beginPath();q.moveTo(x,y-s);q.lineTo(x+s*.38,y);q.lineTo(x-s*.38,y);q.closePath();q.fill();q.fillStyle='#fff';q.fillRect(x-s*.22,y-s*.55,s*.44,s*.12);q.fillStyle='#222';q.fillRect(x-s*.5,y-3,s,s*.12);}
function drawSpot(q,L){const d=DEPTH,s=L.spot;
 if(s==='stairs'||s==='rail')school(q);else if(s==='curb')lot(q);else fence(q);
 // front faces (below the profile) then the surfaces seen from above
 if(s==='stairs'||s==='rail'){
  q.fillStyle=CONC_FACE;q.beginPath();q.moveTo(-3000,TOP);q.lineTo(0,TOP);for(let k=0;k<STEP.n;k++){q.lineTo(k*STEP.run,TOP+STEP.rise*(k+1));q.lineTo((k+1)*STEP.run,TOP+STEP.rise*(k+1));}q.lineTo(4000,0);q.lineTo(4000,3000);q.lineTo(-3000,3000);q.closePath();q.fill();
  q.fillStyle=CONC_DARK;q.fillRect(-3000,TOP,3000,-TOP);
  band(q,-3000,0,TOP,d,CONC_TOP);for(let k=0;k<STEP.n;k++){const y=TOP+STEP.rise*(k+1);band(q,k*STEP.run,(k+1)*STEP.run,y,d,k%2?'#c9c3b8':'#bdb7ac');q.fillStyle='rgba(255,255,255,.25)';q.fillRect(k*STEP.run,y-d,4,d);}
  band(q,SW,4000,0,d,CONC_TOP);joints(q,-3000,0,TOP,d,260);joints(q,SW,4000,0,d,260);
  if(s==='rail'){const [r0,r1]=L.rail,m=d*.5;q.strokeStyle='#5d656e';q.lineWidth=12;for(const f of [.04,.5,.96]){const px=r0.x+(r1.x-r0.x)*f,py=r0.y+(r1.y-r0.y)*f;q.beginPath();q.moveTo(px,py-m);q.lineTo(px,ground(L,px)-m);q.stroke();}
   q.lineCap='round';q.strokeStyle='#8e98a3';q.lineWidth=16;q.beginPath();q.moveTo(r0.x,r0.y-m);q.lineTo(r1.x,r1.y-m);q.stroke();q.strokeStyle='#eef3f7';q.lineWidth=5;q.beginPath();q.moveTo(r0.x,r0.y-m-4);q.lineTo(r1.x,r1.y-m-4);q.stroke();}}
 else{q.fillStyle=CONC_FACE;q.fillRect(-3000,0,7000,3000);band(q,-3000,4000,0,d,'#b8b1a5');joints(q,-3000,4000,0,d,300);
  if(s==='curb'){const [c0,c1]=L.curb,h=-c0.y;q.fillStyle='rgba(255,255,255,.7)';for(let x=-2400;x<3400;x+=520)q.fillRect(x,-d*.15,30,-d*.7);
   for(let x=c0.x,i=0;x<c1.x;x+=LU*1.2,i++){q.fillStyle=i%2?'#f2f2f2':'#d62020';q.fillRect(x,-h,Math.min(LU*1.2,c1.x-x),h);}band(q,c0.x,c1.x,-h,d,'#e05050');q.fillStyle='rgba(255,255,255,.35)';q.fillRect(c0.x,-h-d,c1.x-c0.x,4);
   q.strokeStyle='#5a1010';q.lineWidth=3;q.strokeRect(c0.x,-h,c1.x-c0.x,h);}
  else{const K=L.K,kw=L.kw;// plywood side of the kicker, then its riding surface
   q.fillStyle='#c39a5e';q.beginPath();q.moveTo(-kw,0);for(let i=0;i<=20;i++){const x=-kw+kw*i/20;q.lineTo(x,ground(L,x));}q.lineTo(0,0);q.closePath();q.fill();q.strokeStyle='rgba(90,55,20,.4)';q.lineWidth=2;for(let x=-kw+30;x<0;x+=50){q.beginPath();q.moveTo(x,0);q.lineTo(x,ground(L,x));q.stroke();}
   q.fillStyle='#9aa0a7';q.beginPath();for(let i=0;i<=20;i++){const x=-kw+kw*i/20;q.lineTo(x,ground(L,x));}for(let i=20;i>=0;i--){const x=-kw+kw*i/20;q.lineTo(x,ground(L,x)-d);}q.closePath();q.fill();
   q.fillStyle='#7d6648';q.fillRect(-6,-K-d,10,K+d);q.strokeStyle='#e6ebf0';q.lineWidth=6;q.beginPath();q.moveTo(0,-K);q.lineTo(0,-K-d);q.stroke();
   for(const cx of [520,780,1260,1500])cone(q,cx,-d*.4,LU*1.4);}}}

Object.assign(exports,{LU,DEPTH,buildLine,lineState,drawSpot,ground,NAMES});
