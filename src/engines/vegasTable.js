// Vegas table kit (ROADMAP G1): the drawn casino shared by the table games. Everything is drawn on the canvas here:
// the room (dark carpet, slot-machine glow, chandelier), a half-moon table (felt with its printed rules, padded rail,
// chip rack, card shoe, discard tray), the dealer (a character from the table's theme, with moods and a speech bubble,
// and a hand that reaches for the cards), playing cards (real pip layouts, court cards, themed backs), casino chips and
// chip stacks, the players' heads round the rail, and floating buttons. Sound is synthesized: card snaps, chip clacks,
// the shuffle riffle, a murmuring crowd with far-off slot machines, and an original lounge-jazz loop.
const {store}=require('src/state.js');
const {audioContext,vibrate}=require('src/audio.js');

const SUITS=['s','h','d','c'],RED={h:1,d:1},RANKS=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const CHIPS=[[1000,'#ef7d1a','#fff3e0'],[500,'#6a2c91','#f3e5ff'],[100,'#1d1d1f','#f5f5f5'],[25,'#2e8b3e','#f0fff0'],[5,'#c8202f','#fff0f0'],[1,'#ecebe6','#2a4d8f'],[.5,'#9fb4c8','#ffffff']];
const chipOf=v=>CHIPS.find(c=>c[0]===v)||CHIPS[4];
const money=v=>'$'+(Math.round(v*100)/100).toLocaleString('en-US',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});
// a stack of chips for an amount, biggest first (the way a dealer colours it up)
function breakdown(v,denoms=[500,100,25,5,1,.5]){const out=[];v=Math.round(v*2)/2;for(const d of denoms){while(v>=d-1e-9&&out.length<40){out.push(d);v=Math.round((v-d)*2)/2;}}return out;}
const ease=t=>t<0?0:t>1?1:1-(1-t)*(1-t)*(1-t);
const FONT='"SC Bangers",Impact,"Arial Black",sans-serif',BODY='"SC Nunito","Arial Rounded MT Bold",Arial,sans-serif';

// ---------- suits as paths (no font emoji surprises)
function suitPath(x,k,s,cx,cy,r){x.beginPath();
 if(s==='d'){x.moveTo(cx,cy-r);x.lineTo(cx+r*.74,cy);x.lineTo(cx,cy+r);x.lineTo(cx-r*.74,cy);x.closePath();return;}
 if(s==='h'){x.moveTo(cx,cy+r*.95);x.bezierCurveTo(cx-r*1.25,cy+.05*r,cx-r*.95,cy-r*1.05,cx,cy-r*.45);x.bezierCurveTo(cx+r*.95,cy-r*1.05,cx+r*1.25,cy+.05*r,cx,cy+r*.95);x.closePath();return;}
 if(s==='s'){x.moveTo(cx,cy-r);x.bezierCurveTo(cx+r*1.3,cy-r*.05,cx+r*.9,cy+r*.95,cx+r*.08,cy+r*.42);x.lineTo(cx+r*.32,cy+r);x.lineTo(cx-r*.32,cy+r);x.lineTo(cx-r*.08,cy+r*.42);x.bezierCurveTo(cx-r*.9,cy+r*.95,cx-r*1.3,cy-r*.05,cx,cy-r);x.closePath();return;}
 // club
 const b=r*.42;x.arc(cx,cy-r*.45,b,0,7);x.moveTo(cx-r*.48+b,cy+r*.12);x.arc(cx-r*.48,cy+r*.12,b,0,7);x.moveTo(cx+r*.48+b,cy+r*.12);x.arc(cx+r*.48,cy+r*.12,b,0,7);
 x.moveTo(cx-r*.1,cy);x.lineTo(cx+r*.1,cy);x.lineTo(cx+r*.34,cy+r);x.lineTo(cx-r*.34,cy+r);x.closePath();}
function suit(x,s,cx,cy,r,flip=false){x.save();if(flip){x.translate(cx,cy);x.rotate(Math.PI);x.translate(-cx,-cy);}x.fillStyle=RED[s]?'#c8102e':'#15151a';suitPath(x,1,s,cx,cy,r);x.fill();x.restore();}
function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();}

// ---------- cards
const PIPS={2:[[.5,0],[.5,1]],3:[[.5,0],[.5,.5],[.5,1]],4:[[0,0],[1,0],[0,1],[1,1]],5:[[0,0],[1,0],[.5,.5],[0,1],[1,1]],6:[[0,0],[1,0],[0,.5],[1,.5],[0,1],[1,1]],
 7:[[0,0],[1,0],[.5,.25],[0,.5],[1,.5],[0,1],[1,1]],8:[[0,0],[1,0],[.5,.25],[0,.5],[1,.5],[.5,.75],[0,1],[1,1]],
 9:[[0,0],[1,0],[0,1/3],[1,1/3],[.5,.5],[0,2/3],[1,2/3],[0,1],[1,1]],10:[[0,0],[1,0],[.5,1/6],[0,1/3],[1,1/3],[0,2/3],[1,2/3],[.5,5/6],[0,1],[1,1]]};
const COURT={11:{c:'#2a5bd7',t:'#e8b021',hat:'cap'},12:{c:'#c8102e',t:'#e8b021',hat:'tiara'},13:{c:'#2a8a4a',t:'#e8b021',hat:'crown'}};
const cardCache=new Map();
function cardImg(rank,s,w){const key=rank+s+w;let c=cardCache.get(key);if(c)return c;const h=Math.round(w*1.4),k=Math.min(2,devicePixelRatio||1);
 c=document.createElement('canvas');c.width=Math.ceil(w*k);c.height=Math.ceil(h*k);const x=c.getContext('2d');x.scale(k,k);
 rr(x,.5,.5,w-1,h-1,w*.09);x.fillStyle='#fbfaf4';x.fill();x.lineWidth=1;x.strokeStyle='#b9b2a2';x.stroke();
 const col=RED[s]?'#c8102e':'#15151a',name=RANKS[rank];x.fillStyle=col;x.textAlign='center';x.textBaseline='middle';
 const fs=Math.max(9,w*(name.length>1?.24:.27));x.font=`900 ${fs}px ${BODY}`;
 const corner=(flip)=>{x.save();if(flip){x.translate(w,h);x.rotate(Math.PI);}x.fillText(name,w*.15,h*.11);suit(x,s,w*.15,h*.23,w*.075);x.restore();};corner(false);corner(true);
 if(rank===1){suit(x,s,w/2,h/2,w*(s==='s'?.3:.24));}
 else if(rank<=10){const X0=w*.33,X1=w*.67,Y0=h*.2,Y1=h*.8,pr=w*.1;for(const [px,py] of PIPS[rank])suit(x,s,X0+(X1-X0)*px,Y0+(Y1-Y0)*py,pr,py>.55);}
 else{const C=COURT[rank],fx=w*.24,fy=h*.17,fw=w*.52,fh=h*.66;rr(x,fx,fy,fw,fh,w*.04);const g=x.createLinearGradient(0,fy,0,fy+fh);g.addColorStop(0,'#fff7dc');g.addColorStop(1,'#f3e2b0');x.fillStyle=g;x.fill();x.strokeStyle=col;x.lineWidth=Math.max(1,w*.02);x.stroke();
  // a simple court figure: robe, face, headwear, both halves like a real court card
  const half=(flip)=>{x.save();if(flip){x.translate(w,h);x.rotate(Math.PI);}x.beginPath();x.rect(fx,fy,fw,fh/2);x.clip();const cx=w/2,cy=fy+fh*.26;
   x.fillStyle=C.c;x.beginPath();x.moveTo(fx+fw*.12,fy+fh*.5);x.quadraticCurveTo(cx,cy-fh*.02,fx+fw*.88,fy+fh*.5);x.fill();
   x.fillStyle=C.t;x.fillRect(cx-fw*.06,cy+fh*.06,fw*.12,fh*.2);
   x.fillStyle='#f6d2a8';x.beginPath();x.arc(cx,cy,fw*.15,0,7);x.fill();x.strokeStyle='#5a3a1a';x.lineWidth=Math.max(.6,w*.012);x.stroke();
   x.fillStyle='#3a2a1a';x.fillRect(cx-fw*.07,cy-fw*.02,fw*.04,fw*.03);x.fillRect(cx+fw*.03,cy-fw*.02,fw*.04,fw*.03);
   x.fillStyle=C.t;x.beginPath();if(C.hat==='crown'){x.moveTo(cx-fw*.18,cy-fw*.1);x.lineTo(cx-fw*.18,cy-fw*.3);x.lineTo(cx-fw*.09,cy-fw*.2);x.lineTo(cx,cy-fw*.34);x.lineTo(cx+fw*.09,cy-fw*.2);x.lineTo(cx+fw*.18,cy-fw*.3);x.lineTo(cx+fw*.18,cy-fw*.1);}
   else if(C.hat==='tiara'){x.ellipse(cx,cy-fw*.13,fw*.18,fw*.08,0,Math.PI,0);}else{x.moveTo(cx-fw*.2,cy-fw*.1);x.quadraticCurveTo(cx,cy-fw*.42,cx+fw*.2,cy-fw*.1);}x.fill();
   suit(x,s,fx+fw*.17,fy+fh*.1,w*.06);x.restore();};half(false);half(true);
  x.strokeStyle=col;x.lineWidth=Math.max(.6,w*.012);x.beginPath();x.moveTo(fx,fy+fh/2);x.lineTo(fx+fw,fy+fh/2);x.stroke();}
 cardCache.set(key,c);return c;}
function backImg(w,theme){const key='back'+w+theme.back;let c=cardCache.get(key);if(c)return c;const h=Math.round(w*1.4),k=Math.min(2,devicePixelRatio||1);
 c=document.createElement('canvas');c.width=Math.ceil(w*k);c.height=Math.ceil(h*k);const x=c.getContext('2d');x.scale(k,k);
 rr(x,.5,.5,w-1,h-1,w*.09);x.fillStyle='#fbfaf4';x.fill();x.strokeStyle='#b9b2a2';x.stroke();
 const m=w*.07;rr(x,m,m,w-2*m,h-2*m,w*.05);x.fillStyle=theme.back;x.fill();x.save();x.clip();x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=Math.max(.6,w*.018);
 const st=w*.13;for(let i=-h;i<w+h;i+=st){x.beginPath();x.moveTo(i,0);x.lineTo(i+h,h);x.stroke();x.beginPath();x.moveTo(i+h,0);x.lineTo(i,h);x.stroke();}
 x.fillStyle=theme.back;x.beginPath();x.ellipse(w/2,h/2,w*.26,h*.16,0,0,7);x.fill();x.strokeStyle=theme.trim;x.lineWidth=Math.max(1,w*.03);x.stroke();
 suit(x,'s',w/2,h/2,w*.1);x.fillStyle=theme.trim;x.globalAlpha=.9;suitPath(x,1,'s',w/2,h/2,w*.1);x.fill();x.restore();
 cardCache.set(key,c);return c;}

// ---------- chips (seen from above at the table's slant: an ellipse with a rim)
const chipCache=new Map(),SQ=.56;
function chipImg(v,d){const key=v+':'+d;let c=chipCache.get(key);if(c)return c;const [,col,ink]=chipOf(v),k=Math.min(2,devicePixelRatio||1),t=d*.13,H=d*SQ+t;
 c=document.createElement('canvas');c.width=Math.ceil(d*k)+2;c.height=Math.ceil(H*k)+2;const x=c.getContext('2d');x.scale(k,k);x.translate(.5,.5);
 const rx=d/2,ry=d*SQ/2,cx=rx,cy=ry;
 x.fillStyle=shade(col,-.35);x.beginPath();x.ellipse(cx,cy+t,rx,ry,0,0,Math.PI);x.lineTo(cx-rx,cy);x.ellipse(cx,cy,rx,ry,0,Math.PI,0,true);x.fill();
 // rim stripes on the side
 x.save();x.beginPath();x.ellipse(cx,cy+t,rx,ry,0,0,Math.PI);x.lineTo(cx-rx,cy);x.ellipse(cx,cy,rx,ry,0,Math.PI,0,true);x.clip();x.fillStyle=ink;for(let i=0;i<6;i++){const a=Math.PI*(i+.5)/6,px=cx+Math.cos(a)*rx;x.fillRect(px-d*.035,cy,d*.07,t+ry);}x.restore();
 x.fillStyle=col;x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,7);x.fill();
 x.save();x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,7);x.clip();x.fillStyle=ink;for(let i=0;i<8;i++){const a=i*Math.PI/4;x.save();x.translate(cx+Math.cos(a)*rx*.86,cy+Math.sin(a)*ry*.86);x.scale(1,SQ);x.rotate(a);x.fillRect(-d*.05,-d*.1,d*.1,d*.2);x.restore();}x.restore();
 x.strokeStyle=ink;x.globalAlpha=.75;x.lineWidth=Math.max(.6,d*.03);x.beginPath();x.ellipse(cx,cy,rx*.66,ry*.66,0,0,7);x.stroke();x.globalAlpha=1;
 x.fillStyle=ink;x.font=`900 ${Math.max(6,d*.24)}px ${BODY}`;x.textAlign='center';x.textBaseline='middle';x.save();x.translate(cx,cy+d*.01);x.scale(1,SQ*1.25);x.fillText(v>=1000?'1K':v<1?'½':String(v),0,0);x.restore();
 x.fillStyle='rgba(255,255,255,.18)';x.beginPath();x.ellipse(cx-rx*.2,cy-ry*.3,rx*.5,ry*.3,0,0,7);x.fill();
 chipCache.set(key,c);return c;}
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=v=>Math.max(0,Math.min(255,Math.round(k<0?v*(1+k):v+(255-v)*k)));return `rgb(${f(r)},${f(g)},${f(b)})`;}
// draw a chip stack standing on (cx,cy); several columns when tall
function drawStack(x,amount,cx,cy,d,{max=10}={}){const chips=breakdown(amount);if(!chips.length)return;const t=d*.13,cols=[];for(const c of chips){let col=cols[cols.length-1];if(!col||col.length>=max||col[0]!==c&&col.length>=4)cols.push(col=[]);col.push(c);}
 const n=Math.min(cols.length,4),gap=d*.78,x0=cx-(n-1)*gap/2;
 // shadow
 x.fillStyle='rgba(0,0,0,.28)';x.beginPath();x.ellipse(cx,cy+d*SQ*.25,d*.45+(n-1)*gap/2,d*SQ*.42,0,0,7);x.fill();
 for(let i=0;i<n;i++){const col=cols[i],X=x0+i*gap;for(let j=0;j<col.length;j++){const img=chipImg(col[j],d);x.drawImage(img,X-d/2-.5,cy-d*SQ/2-j*t-.5,d+2,d*SQ+t+2);}}}

// ---------- heads (cut-out faces from the Broforce head kit)
let headOf=null;try{headOf=require('src/engines/broforce.js').headCanvas;}catch{}
const head=(id,mood='normal')=>{try{return headOf?.(id,mood,160)||null;}catch{return null;}};

// ---------- the room and the table
function roomLayer(W,H,theme,L){const c=document.createElement('canvas'),k=Math.min(1.5,devicePixelRatio||1);c.width=Math.ceil(W*k);c.height=Math.ceil(H*k);const x=c.getContext('2d');x.scale(k,k);
 let g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1d1016');g.addColorStop(.45,'#0d080c');g.addColorStop(1,'#120a08');x.fillStyle=g;x.fillRect(0,0,W,H);
 // far wall: slot-machine glow and bokeh
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<46;i++){const bx=rnd()*W,by=rnd()*L.y0*1.1,br=4+rnd()*Math.min(W,H)*.035,hue=[45,10,330,190,280][i%5];const rg=x.createRadialGradient(bx,by,0,bx,by,br);rg.addColorStop(0,`hsla(${hue},95%,65%,.38)`);rg.addColorStop(1,`hsla(${hue},95%,55%,0)`);x.fillStyle=rg;x.beginPath();x.arc(bx,by,br,0,7);x.fill();}
 // chandelier glow over the table
 const cg=x.createRadialGradient(W/2,L.y0*.2,0,W/2,L.y0*.2,Math.max(W,H)*.7);cg.addColorStop(0,'rgba(255,214,150,.22)');cg.addColorStop(1,'rgba(255,214,150,0)');x.fillStyle=cg;x.fillRect(0,0,W,H);
 // carpet below the table: the loud casino pattern
 x.save();x.beginPath();x.rect(0,L.y0,W,H-L.y0);x.clip();x.fillStyle='#3b0d17';x.fillRect(0,L.y0,W,H);const s=Math.max(26,Math.min(W,H)*.09);x.globalAlpha=.55;
 for(let yy=L.y0;yy<H+s;yy+=s)for(let xx=-s;xx<W+s;xx+=s){const o=((yy/s|0)%2)*s/2;x.fillStyle='#6b1a22';x.beginPath();x.moveTo(xx+o,yy-s*.42);x.lineTo(xx+o+s*.42,yy);x.lineTo(xx+o,yy+s*.42);x.lineTo(xx+o-s*.42,yy);x.fill();x.fillStyle='#c9952b';x.beginPath();x.arc(xx+o,yy,s*.09,0,7);x.fill();x.strokeStyle='#1b5a52';x.lineWidth=s*.05;x.beginPath();x.arc(xx+o+s/2,yy,s*.2,0,7);x.stroke();}
 x.restore();x.globalAlpha=1;g=x.createLinearGradient(0,L.y0,0,H);g.addColorStop(0,'rgba(0,0,0,.65)');g.addColorStop(.35,'rgba(0,0,0,.25)');g.addColorStop(1,'rgba(0,0,0,.6)');x.fillStyle=g;x.fillRect(0,L.y0,W,H-L.y0);
 return c;}
// arched text along the table's ellipse at fraction k of the radii
// printed lines follow a flatter curve than a tall table's rim, so they stay in the middle of the felt
function textArc(L,k){const rx=L.rx*k,ry=Math.min(L.ry*k,rx*.62);return {cx:L.cx,cy:L.y0+L.ry*k-ry,rx,ry};}
function arcText(x,text,L,k,size,color,spread=1){x.save();x.font=`900 ${size}px ${BODY}`;x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';
 const A=textArc(L,k),rx=A.rx,ry=A.ry,widths=[...text].map(ch=>x.measureText(ch).width+size*.08),total=widths.reduce((a,b)=>a+b,0)*spread;
 // walk along the bottom of the ellipse by arc length
 const N=400,pts=[];for(let i=0;i<=N;i++){const th=Math.PI*i/N;pts.push([A.cx+Math.cos(th)*rx,A.cy+Math.sin(th)*ry]);}
 const len=[0];for(let i=1;i<=N;i++)len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const mid=len[N]/2;
 let at=mid+total/2;const posAt=d=>{let i=1;while(i<N&&len[i]<d)i++;const f=(d-len[i-1])/((len[i]-len[i-1])||1),a=pts[i-1],b=pts[i];return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,Math.atan2(b[1]-a[1],b[0]-a[0])];};
 [...text].forEach((ch,i)=>{const w=widths[i]*spread,[px,py,ang]=posAt(at-w/2);x.save();x.translate(px,py);x.rotate(ang+Math.PI);x.fillText(ch,0,0);x.restore();at-=w;});x.restore();}
function tableLayer(W,H,theme,L,{rules=[],ins=''}={}){const c=document.createElement('canvas'),k=Math.min(2,devicePixelRatio||1);c.width=Math.ceil(W*k);c.height=Math.ceil(H*k);const x=c.getContext('2d');x.scale(k,k);
 const {cx,y0,rx,ry,rail}=L,shape=(grow=0)=>{x.beginPath();x.moveTo(cx-rx-grow,y0-grow*.2);x.lineTo(cx+rx+grow,y0-grow*.2);x.ellipse(cx,y0,rx+grow,ry+grow,0,0,Math.PI);x.closePath();};
 // shadow under the table, the rail (padded leather), the wood trim, then the felt
 x.save();x.shadowColor='rgba(0,0,0,.7)';x.shadowBlur=rail*1.6;x.shadowOffsetY=rail*.5;shape(rail);x.fillStyle=theme.rail;x.fill();x.restore();
 let g=x.createRadialGradient(cx,y0+ry*.4,ry*.4,cx,y0+ry*.4,ry+rail*1.2);g.addColorStop(0,shade(theme.rail,.25));g.addColorStop(1,shade(theme.rail,-.35));shape(rail);x.fillStyle=g;x.fill();
 // rail stitching + shine
 x.save();x.setLineDash([rail*.18,rail*.16]);x.strokeStyle='rgba(255,230,190,.35)';x.lineWidth=Math.max(1,rail*.05);x.beginPath();x.ellipse(cx,y0,rx+rail*.55,ry+rail*.55,0,0,Math.PI);x.stroke();x.restore();
 x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=rail*.22;x.beginPath();x.ellipse(cx,y0,rx+rail*.4,ry+rail*.4,0,.15*Math.PI,.85*Math.PI);x.stroke();
 shape(rail*.12);x.fillStyle=theme.trim;x.fill();
 g=x.createRadialGradient(cx,y0+ry*.35,ry*.05,cx,y0+ry*.35,Math.max(rx,ry)*1.05);g.addColorStop(0,shade(theme.felt,.12));g.addColorStop(.7,theme.felt);g.addColorStop(1,theme.felt2);shape(0);x.fillStyle=g;x.fill();
 // felt grain
 x.save();shape(0);x.clip();x.globalAlpha=.06;for(let i=0;i<900;i++){x.fillStyle=i%2?'#fff':'#000';x.fillRect(Math.random()*W,y0+Math.random()*ry,1.2,1.2);}x.restore();
 // straight edge (dealer side) with the chip rack
 x.fillStyle=shade(theme.rail,-.2);x.fillRect(cx-rx-rail*.4,y0-rail*.5,2*rx+rail*.8,rail*.55);
 const rw=Math.min(rx*.9,L.cw*5.2),rh=L.cw*.6,rxx=cx-rw/2,ryy=y0-rail*.35;x.fillStyle='#120c08';rr(x,rxx,ryy,rw,rh,rh*.2);x.fill();
 const cols=10,cwid=rw/cols;for(let i=0;i<cols;i++){const v=[1,5,5,25,25,100,100,500,500,1000][i],[,col]=chipOf(v);const gg=x.createLinearGradient(0,ryy,0,ryy+rh);gg.addColorStop(0,shade(col,.25));gg.addColorStop(1,shade(col,-.4));x.fillStyle=gg;x.fillRect(rxx+i*cwid+cwid*.12,ryy+rh*.12,cwid*.76,rh*.8);x.fillStyle='rgba(255,255,255,.35)';for(let j=1;j<6;j++)x.fillRect(rxx+i*cwid+cwid*.12,ryy+rh*.12+j*rh*.13,cwid*.76,1);}
 // printed rules in the band: the table's name, the insurance strip, then the payout lines, sized to fit
 {const [k0,k1]=L.band,bandPx=(k1-k0)*ry,u=Math.max(7,Math.min(L.cw*.34,bandPx/7.2)),at=f=>k0+(k1-k0)*f;x.globalAlpha=.92;
  const big=bandPx>u*6.4;let f0=0;if(big){x.fillStyle=theme.trim;x.font=`400 ${u*1.5}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(theme.name,cx,y0+ry*at(0)+u*.9);x.font=`800 ${u*.62}px ${BODY}`;x.fillStyle=theme.ink;x.fillText(theme.sub,cx,y0+ry*at(0)+u*2);f0=(u*2.7)/bandPx;}
  const rows=[];if(ins)rows.push(['ins',ins]);rules.forEach((r,i)=>rows.push([i?'small':'big',r]));const step=(1-f0)/(rows.length+.2);
  rows.forEach(([kind,text],i)=>{const kk=at(f0+step*(i+.65));if(kind==='ins'){x.strokeStyle=theme.trim;x.lineWidth=Math.max(1,u*.1);for(const d of [-1,1]){const A=textArc(L,kk+d*u*.75/ry);x.beginPath();x.ellipse(A.cx,A.cy,A.rx,A.ry,0,.12*Math.PI,.88*Math.PI);x.stroke();}arcText(x,text,L,kk,u*.78,theme.trim,1.12);}
   else arcText(x,text,L,kk,kind==='big'?u:u*.74,kind==='big'?theme.trim:theme.ink,1.05);});x.globalAlpha=1;}
 // betting circles
 for(const sp of L.spots){x.strokeStyle=theme.trim;x.lineWidth=Math.max(1.2,L.cw*.035);x.globalAlpha=.85;x.beginPath();x.ellipse(sp.bx,sp.by,L.cw*.5,L.cw*.5*SQ*1.1,0,0,7);x.stroke();x.globalAlpha=.25;x.beginPath();x.ellipse(sp.bx,sp.by,L.cw*.38,L.cw*.38*SQ*1.1,0,0,7);x.stroke();x.globalAlpha=1;}
 // shoe (dealer's left = screen right) and discard tray
 const sw=L.cw*1.15,sh=L.cw*.9;x.save();x.translate(L.shoe.x,L.shoe.y);x.rotate(-.12);x.fillStyle='#0b0b0d';rr(x,-sw/2,-sh/2,sw,sh,sh*.15);x.fill();x.fillStyle='rgba(255,255,255,.08)';rr(x,-sw/2+2,-sh/2+2,sw-4,sh*.35,sh*.1);x.fill();
 x.fillStyle=theme.back;x.fillRect(-sw*.38,-sh*.32,sw*.62,sh*.64);x.fillStyle='#fbfaf4';x.fillRect(-sw*.42,-sh*.32,sw*.05,sh*.64);x.fillStyle='#d4af37';x.fillRect(sw*.25,-sh*.4,sw*.12,sh*.8);x.restore();
 x.save();x.translate(L.discard.x,L.discard.y);x.rotate(.1);x.fillStyle='rgba(0,0,0,.45)';rr(x,-sw*.45,-sh*.5,sw*.9,sh,sh*.12);x.fill();x.strokeStyle='rgba(255,255,255,.15)';x.stroke();x.restore();
 return c;}

// layout of the table for a screen; 5 seats round the rail (index 0 = screen left). The shoe sits at the dealer's left.
// Tall screens: the controls are a strip under the table. Wide screens: a column on the right, the table uses the height.
function tableLayout(W,H,top){const wide=W>H*1.15,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const pw=wide?clamp(W*.27,190,320):W,panelH=wide?H:clamp(H*.255,150,215),TW=wide?W-pw:W,B=wide?H:H-panelH,panel=wide?{x:TW,y:0,w:pw,h:H}:{x:0,y:B,w:W,h:panelH};
 const hd=wide?clamp(H*.16,40,100):clamp(W*.2,44,96),headY=hd*.62+6,y0=headY+hd*.78,ph=wide?clamp(H*.12,30,64):clamp(W*.13,30,62);
 const cw=Math.round(Math.max(26,Math.min(wide?TW*.075:W*.118,(B-y0-ph*1.1)/4.9,70))),ch=cw*1.4,cx=TW/2;
 const betY=B-ph*1.1-cw*.3,ry=Math.max(60,(betY-y0)/.84),rx=wide?Math.min(TW/2-8,ry*2.2):TW*.6,rail=Math.max(8,Math.min(rx,ry)*.07);
 const cmax=Math.min(Math.cos(.13*Math.PI),(cx-cw*.8)/(.82*rx)),th0=Math.acos(Math.max(.05,cmax)),spots=[];
 const dealerCards={x:cx,y:y0+rail*.4+ch*.62};
 // seats evenly spaced by distance along the rail (equal angles bunch up at the bottom of a tall table)
 const N=240,arc=[0],P=t=>[cx+Math.cos(t)*rx*.82,y0+Math.sin(t)*ry*.84],ths=[];for(let i=1;i<=N;i++){const a=P(Math.PI-th0-(i-1)*(Math.PI-2*th0)/N),b=P(Math.PI-th0-i*(Math.PI-2*th0)/N);arc.push(arc[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
 for(let i=0;i<5;i++){const goal=arc[N]*i/4;let j=0;while(j<N&&arc[j]<goal)j++;ths.push(Math.PI-th0-j*(Math.PI-2*th0)/N);}
 for(let i=0;i<5;i++){const th=ths[i],c=Math.cos(th),sn=Math.sin(th),bx=cx+c*rx*.82,by=y0+sn*ry*.84;
  let nx=cx-bx,ny=dealerCards.y+ch-by;const nl=Math.hypot(nx,ny)||1;nx/=nl;ny/=nl;
  let ox=-nx*.5,oy=-ny*.5+.5;const ol=Math.hypot(ox,oy)||1;ox/=ol;oy/=ol;const hdist=cw*.55+ph*.82;
  const hx=clamp(bx+ox*hdist,ph*.6,TW-ph*.6),hy=Math.min(B-ph*.95,by+oy*hdist);
  spots.push({th,bx,by,nx,ny,tx:-ny,ty:nx,hx,hy,ang:Math.atan2(ny,nx)+Math.PI/2});}
 // the printed rules go in the band between the dealer's cards and the players' cards
 const mid=spots[2],inner=mid.by-(cw*.5+ch*1.12)-ch*.1,k0=(dealerCards.y+ch*.64+4-y0)/ry,k1=Math.max(k0+.02,(inner-y0)/ry);
 return {W,H,TW,wide,panel,panelH,B,cx,y0,rx,ry,rail,hd,headY,ph,cw,ch,spots,band:[k0,k1],dealerCards,
  shoe:{x:cx+Math.min(rx*.62,TW/2-cw),y:y0+cw*.62},discard:{x:cx-Math.min(rx*.62,TW/2-cw),y:y0+cw*.62}};}

// ---------- dealer (behind the table's straight edge)
const OUTFIT={bond:['#141418','#f5f5f5','#141418'],vegas:['#f4f1ea','#e7c35a','#f4f1ea'],hangover:['#1f1f22','#c22','#f0f0f0'],quark:['#7a4a1e','#c98a2a','#3f6e7a']};
function drawDealer(x,L,theme,id,mood,hand,T){const {cx,y0,hd,headY}=L,[coat,acc,shirt]=OUTFIT[theme.id]||OUTFIT.bond,sw=hd*1.5;
 x.save();x.fillStyle=coat;x.beginPath();x.moveTo(cx-sw*.75,y0+2);x.quadraticCurveTo(cx-sw*.7,headY+hd*.45,cx,headY+hd*.42);x.quadraticCurveTo(cx+sw*.7,headY+hd*.45,cx+sw*.75,y0+2);x.closePath();x.fill();
 x.fillStyle=shirt;x.beginPath();x.moveTo(cx-hd*.2,headY+hd*.4);x.lineTo(cx,y0);x.lineTo(cx+hd*.2,headY+hd*.4);x.fill();
 x.fillStyle=acc;x.beginPath();x.moveTo(cx,headY+hd*.5);x.lineTo(cx-hd*.14,headY+hd*.44);x.lineTo(cx-hd*.14,headY+hd*.58);x.closePath();x.moveTo(cx,headY+hd*.5);x.lineTo(cx+hd*.14,headY+hd*.44);x.lineTo(cx+hd*.14,headY+hd*.58);x.closePath();x.fill();
 // arms: the right hand (screen left of centre is their right) reaches for the shoe and the card being dealt
 const arm=(sx,hx,hy)=>{x.strokeStyle=coat;x.lineCap='round';x.lineWidth=hd*.2;x.beginPath();x.moveTo(sx,headY+hd*.6);x.quadraticCurveTo((sx+hx)/2,y0+hd*.05,hx,hy);x.stroke();x.fillStyle=shirt;x.beginPath();x.arc(hx,hy,hd*.11,0,7);x.fill();x.fillStyle='#f0c8a0';x.beginPath();x.arc(hx,hy+hd*.04,hd*.09,0,7);x.fill();};
 arm(cx-sw*.45,cx-hd*.55,y0+hd*.12);arm(cx+sw*.45,hand.x,hand.y);
 const hc=head(id,mood);if(hc){const bob=Math.sin(T*1.7)*hd*.015,s=hd*1.25;x.drawImage(hc,cx-s/2,headY-s*.55+bob,s,s);}
 x.restore();}
function bubble(x,text,px,py,size,{dir=1,max=220}={}){x.save();x.font=`800 ${size}px ${BODY}`;const words=String(text).split(' '),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(x.measureText(t).width>max&&cur){lines.push(cur);cur=w;}else cur=t;}if(cur)lines.push(cur);
 const w=Math.max(...lines.map(l=>x.measureText(l).width))+size*1.2,h=lines.length*size*1.2+size*.7,bx=Math.max(4,Math.min(x.canvas.width/(x.getTransform().a||1)-w-4,px-(dir>0?size:w-size))),by=py-h-size*.6;
 x.fillStyle='rgba(255,255,255,.96)';x.strokeStyle='#111';x.lineWidth=2;rr(x,bx,by,w,h,size*.6);x.fill();x.stroke();x.beginPath();x.moveTo(px-size*.4,by+h-1);x.lineTo(px,py-size*.15);x.lineTo(px+size*.4,by+h-1);x.fill();
 x.fillStyle='#111';x.textAlign='left';x.textBaseline='top';lines.forEach((l,i)=>x.fillText(l,bx+size*.6,by+size*.4+i*size*1.2));x.restore();}
// a floating, rounded button; returns its hit box
function button(x,b){const {X,Y,w,h,label,sub,tone='dark',on=true,hot=false}=b;x.save();x.globalAlpha=on?1:.38;
 const g=x.createLinearGradient(0,Y,0,Y+h),c=tone==='gold'?['#ffe07a','#d79a1c']:tone==='green'?['#55d07a','#1f8a3e']:tone==='red'?['#ff7a6a','#b8261a']:['#3a3440','#1c1820'];g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);
 x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=8;x.shadowOffsetY=3;rr(x,X,Y,w,h,Math.min(h*.32,14));x.fillStyle=g;x.fill();x.shadowColor='transparent';x.lineWidth=hot?3:1.5;x.strokeStyle=hot?'#fff':tone==='dark'?'rgba(255,255,255,.35)':'rgba(0,0,0,.35)';x.stroke();
 x.fillStyle=tone==='gold'?'#2a1800':'#fff';x.textAlign='center';x.textBaseline='middle';const fs=Math.min(h*.42,w*.2,24);x.font=`400 ${fs}px ${FONT}`;x.fillText(label,X+w/2,Y+h/2-(sub?fs*.32:0));
 if(sub){x.font=`800 ${Math.max(8,fs*.42)}px ${BODY}`;x.globalAlpha=on?.85:.3;x.fillText(sub,X+w/2,Y+h/2+fs*.5);}x.restore();return b;}

// ---------- sound
function tableSound(s){let a=null,bus=null,mus=null,nb=null,amb=null,music=null;
 const sfxOn=()=>!!store.profile?.settings.sound,musOn=()=>!!store.profile?.settings.music;
 const ok=()=>{a=audioContext();if(!a)return false;if(!bus){bus=a.createGain();bus.gain.value=.55;bus.connect(a.destination);mus=a.createGain();mus.gain.value=.16;mus.connect(a.destination);}return true;};
 const noiseBuf=()=>nb||=(()=>{const b=a.createBuffer(1,a.sampleRate*2,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;})();
 const burst=(t,dur,v,f,q=1,type='bandpass',out=bus)=>{const n=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();n.buffer=noiseBuf();fl.type=type;fl.frequency.value=f;fl.Q.value=q;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);n.connect(fl).connect(g).connect(out);n.start(t,Math.random()*1.5);n.stop(t+dur+.02);};
 const tone=(f,t,d,v,type='sine',out=bus)=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(out);o.start(t);o.stop(t+d+.05);};
 const S={
  card(){if(!sfxOn()||!ok())return;const t=a.currentTime;burst(t,.06,.5,2600,1.4);burst(t+.012,.05,.25,5200,2);},
  slide(){if(!sfxOn()||!ok())return;const t=a.currentTime;burst(t,.16,.18,1800,.8,'highpass');},
  flip(){if(!sfxOn()||!ok())return;const t=a.currentTime;burst(t,.05,.4,3400,2);},
  chips(n=3){if(!sfxOn()||!ok())return;const t=a.currentTime;for(let i=0;i<Math.min(8,n);i++){const tt=t+i*.035+Math.random()*.012;tone(3800+Math.random()*900,tt,.05,.08,'triangle');burst(tt,.03,.22,6200,3);}},
  riffle(){if(!sfxOn()||!ok())return;const t=a.currentTime;for(let i=0;i<34;i++)burst(t+i*.022,.03,.18+.1*Math.sin(i/34*Math.PI),2000+i*60,2);burst(t+.85,.18,.4,1500,.7);},
  win(big=false){if(!sfxOn()||!ok())return;const t=a.currentTime;(big?[523,659,784,1047,1319]:[659,784,1047]).forEach((f,i)=>tone(f,t+i*.07,.3,.12,'triangle'));if(big)S.crowd(1.6);},
  lose(){if(!sfxOn()||!ok())return;const t=a.currentTime;[330,294].forEach((f,i)=>tone(f,t+i*.14,.25,.08,'triangle'));},
  bust(){if(!sfxOn()||!ok())return;const t=a.currentTime;tone(196,t,.32,.12,'sawtooth');tone(185,t+.12,.36,.1,'sawtooth');},
  crowd(k=1){if(!sfxOn()||!ok())return;const t=a.currentTime;burst(t,1.4,.08*k,700,.6);burst(t+.1,1.2,.06*k,1200,.8);},
  tap(){vibrate(8);},
  // murmuring room + a slot machine paying out somewhere far away
  ambience(on){if(!on){try{amb?.n.stop();}catch{}clearInterval(amb?.id);amb=null;return;}if(amb||!sfxOn()||!ok())return;const n=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();n.buffer=noiseBuf();n.loop=true;f.type='bandpass';f.frequency.value=520;f.Q.value=.5;g.gain.value=.018;n.connect(f).connect(g).connect(bus);n.start();
   const id=setInterval(()=>{if(!s.alive||s.paused||!a)return;const t=a.currentTime;g.gain.setTargetAtTime(.012+Math.random()*.014,t,.8);if(Math.random()<.22){const base=1200+Math.random()*900;for(let i=0;i<9;i++)tone(base*(1+(i%3)*.25),t+i*.09,.08,.012,'square');}},1400);amb={n,id};},
  // original lounge jazz: ii-V-I-VI in C, walking bass, Rhodes-like comping, brushes; scheduled a little ahead
  music(on){if(!on){if(music){clearInterval(music.id);music=null;}return;}if(music||!musOn()||!ok())return;
   const bpm=96,beat=60/bpm,bars=[[50,[62,65,69,72]],[43,[59,62,65,69]],[48,[64,67,71,74]],[45,[61,64,67,70]],[50,[60,65,69,72]],[43,[59,62,65,68]],[48,[64,67,71,76]],[48,[60,64,67,71]]];
   const mt=n=>440*Math.pow(2,(n-69)/12);let next=a.currentTime+.15,step=0;
   const rhodes=(n,t,d,v)=>{tone(mt(n),t,d,v,'sine',mus);tone(mt(n)*2.002,t,d*.5,v*.25,'sine',mus);};
   const id=setInterval(()=>{if(!a||!s.alive)return;if(s.paused){next=a.currentTime+.15;return;}while(next<a.currentTime+.5){const bar=bars[(step>>2)%bars.length],b=step%4,swing=b%2?beat*.08:0,t=next+swing;
     const walk=[0,4,7,b===3?11:9][b];tone(mt(bar[0]+walk-12),t,beat*.9,.22,'triangle',mus);
     if(b===0||b===2&&Math.random()<.6)bar[1].forEach((n,i)=>rhodes(n,t+i*.008+(b===2?beat*.5:0),beat*1.6,.045));
     burst(t,beat*.5,b%2?.05:.025,6500,.6,'highpass',mus);if(b%2)burst(t+beat*.66,.05,.03,7000,.8,'highpass',mus);
     if(b===3&&Math.random()<.5){const m=bar[1][3]+12;rhodes(m,t,beat*.8,.03);}
     next+=beat;step++;}},120);music={id};},
  stop(){S.ambience(false);S.music(false);}};
 s.cleanup(()=>S.stop());return S;}

Object.assign(exports,{SUITS,RANKS,CHIPS,chipOf,money,breakdown,ease,FONT,BODY,suit,rr,cardImg,backImg,chipImg,drawStack,SQ,head,roomLayer,tableLayer,tableLayout,drawDealer,bubble,button,tableSound,shade});
