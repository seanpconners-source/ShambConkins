// Paddy's Pool drawing: the table seen from above (felt, cushions, rails, pockets, wear), the cue sticks, the room around
// the table, and the Pool Hall scene (the bar seen straight on, showing every upgrade). Drop-in pictures from
// src/data/poolSprites.js replace the drawn parts one by one.
const PH=require("src/engines/pool/physics.js");
const PS=require("src/data/poolSprites.js");
const {HX,HY,R}=PH;
const RAIL=5.5,CUSH=2;
function rng(seed){let a=seed>>>0||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const hexRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const shade=(h,k)=>{const [r,g,b]=hexRGB(h),f=v=>Math.max(0,Math.min(255,Math.round(k>=0?v+(255-v)*k:v*(1+k))));return `rgb(${f(r)},${f(g)},${f(b)})`;};
const rr=(g,x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
let noiseCv=null;
function noise(){if(noiseCv)return noiseCv;const S=192,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d'),im=g.createImageData(S,S),r=rng(7);
 for(let i=0;i<S*S;i++){const v=110+r()*80;im.data[i*4]=im.data[i*4+1]=im.data[i*4+2]=v;im.data[i*4+3]=255;}g.putImageData(im,0,0);return noiseCv=cv;}
// ---------------------------------------------------------------- the table, top view (draw with g already in inches)
function drawTable(g,T,{look,felt,wear=0,rough=[],id,k=8}){
 const pic=PS.picture('table-'+id);
 // shadow on the floor
 g.save();g.shadowColor='rgba(0,0,0,.65)';g.shadowBlur=6*k;g.shadowOffsetY=1.6*k;g.fillStyle='#000';rr(g,-HX-RAIL-CUSH,-HY-RAIL-CUSH,2*(HX+RAIL+CUSH),2*(HY+RAIL+CUSH),3);g.fill();g.restore();
 if(!pic)drawRails(g,look,k);
 // cushions (felt, a shade darker), then the bed
 g.fillStyle=shade(felt.color,-.28);g.fillRect(-HX-CUSH,-HY-CUSH,2*(HX+CUSH),2*(HY+CUSH));
 drawBed(g,felt,k);
 drawWear(g,wear,rough,k);
 // cushion faces: a lighter nose line and a soft shadow on the bed
 g.save();g.beginPath();g.rect(-HX,-HY,2*HX,2*HY);g.clip();const sg=(x0,y0,x1,y1)=>{const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'rgba(0,0,0,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');return gr;};
 g.fillStyle=sg(0,-HY,0,-HY+1.4);g.fillRect(-HX,-HY,2*HX,1.4);g.fillStyle=sg(0,HY,0,HY-1.4);g.fillRect(-HX,HY-1.4,2*HX,1.4);g.fillStyle=sg(-HX,0,-HX+1.4,0);g.fillRect(-HX,-HY,1.4,2*HY);g.fillStyle=sg(HX,0,HX-1.4,0);g.fillRect(HX-1.4,-HY,1.4,2*HY);g.restore();
 g.strokeStyle=shade(felt.color,.18);g.lineWidth=.18;for(const s of T.segs)if(s.kind==='nose'){g.beginPath();g.moveTo(s.a[0],s.a[1]);g.lineTo(s.b[0],s.b[1]);g.stroke();}
 drawPockets(g,T,look,felt,!!pic);
 if(pic)g.drawImage(pic,-HX-CUSH-RAIL,-HY-CUSH-RAIL,2*(HX+CUSH+RAIL),2*(HY+CUSH+RAIL));
}
function drawRails(g,look,k){
 const X=HX+CUSH+RAIL,Y=HY+CUSH+RAIL;
 const gr=g.createLinearGradient(0,-Y,0,Y);gr.addColorStop(0,shade(look.frame,.12));gr.addColorStop(.5,look.frame);gr.addColorStop(1,look.frame2);
 g.fillStyle=gr;rr(g,-X,-Y,2*X,2*Y,3.2);g.fill();
 // grain / metal sheen
 g.save();rr(g,-X,-Y,2*X,2*Y,3.2);g.clip();
 if(look.gold||look.led){const sh=g.createLinearGradient(-X,-Y,X,Y);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(.45,'rgba(255,255,255,.22)');sh.addColorStop(.55,'rgba(255,255,255,0)');g.fillStyle=sh;g.fillRect(-X,-Y,2*X,2*Y);}
 else if(!look.coin){const r=rng(11);g.lineWidth=.12;for(let i=0;i<70;i++){const y0=-Y+r()*2*Y;g.strokeStyle=`rgba(0,0,0,${.06+r()*.12})`;g.beginPath();g.moveTo(-X,y0);g.bezierCurveTo(-X/3,y0+r()*1.2-.6,X/3,y0+r()*1.2-.6,X,y0+r()*1.4-.7);g.stroke();}
  for(let i=0;i<40;i++){const x0=-X+r()*2*X;g.strokeStyle=`rgba(0,0,0,${.05+r()*.08})`;g.beginPath();g.moveTo(x0,-Y);g.bezierCurveTo(x0+r()-.5,-Y/3,x0+r()-.5,Y/3,x0+r()*1.4-.7,Y);g.stroke();}}
 if(look.wear>=2){const r=rng(31);for(let i=0;i<14;i++){const a=r()*6.28,x0=(r()<.5?-1:1)*(HX+CUSH+1+r()*4),y0=(r()*2-1)*Y;g.strokeStyle='rgba(255,230,190,.18)';g.lineWidth=.15;g.beginPath();g.moveTo(x0,y0);g.lineTo(x0+Math.cos(a)*2.5,y0+Math.sin(a)*2.5);g.stroke();}
  for(let i=0;i<5;i++){const x0=(r()*2-1)*X,y0=(r()<.5?-1:1)*(HY+CUSH+1.5+r()*3);g.fillStyle='rgba(20,8,0,.55)';g.beginPath();g.ellipse(x0,y0,.9,.5,r()*3,0,6.28);g.fill();}}
 g.restore();
 // inner lip
 g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=.5;g.strokeRect(-HX-CUSH-.2,-HY-CUSH-.2,2*(HX+CUSH)+.4,2*(HY+CUSH)+.4);
 g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=.25;rr(g,-X+.3,-Y+.3,2*X-.6,2*Y-.6,3);g.stroke();
 // sights
 const sight=(x,y)=>{if(look.led){g.fillStyle='#bfe8ff';g.shadowColor='#7fd3ff';g.shadowBlur=.8*k;g.beginPath();g.arc(x,y,.42,0,6.28);g.fill();g.shadowBlur=0;return;}
  g.fillStyle=look.gold?'#fffbe6':'#efe6d0';g.beginPath();g.moveTo(x,y-.6);g.lineTo(x+.38,y);g.lineTo(x,y+.6);g.lineTo(x-.38,y);g.closePath();g.fill();};
 const off=CUSH+RAIL*.55;for(let i=1;i<8;i++){if(i===4)continue;const x=-HX+i*HX/4;sight(x,-HY-off);sight(x,HY+off);}for(let i=1;i<4;i++){const y=-HY+i*HY/2;sight(-HX-off,y);sight(HX+off,y);}
 if(look.coin){g.fillStyle='#c9ced6';rr(g,HX+CUSH+.8,-3.2,3.8,6.4,.6);g.fill();g.fillStyle='#2a2d33';g.fillRect(HX+CUSH+2.4,-2.2,.6,4.4);g.fillStyle='#8a9099';g.font='bold 1px Arial';g.save();g.translate(HX+CUSH+4.2,0);g.rotate(Math.PI/2);g.textAlign='center';g.fillText('25¢',0,0);g.restore();
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){g.fillStyle='#d8dde6';g.beginPath();g.arc(sx*(X-1.6),sy*(Y-1.6),2.2,0,6.28);g.fill();}}
}
function drawBed(g,felt,k){
 g.fillStyle=felt.color;g.fillRect(-HX,-HY,2*HX,2*HY);
 if(felt.pattern==='camo'){const r=rng(5);for(let i=0;i<70;i++){g.fillStyle=['#2f3a1e','#6b6a3c','#3c2c1a','#7d8450'][i%4];g.globalAlpha=.55;g.beginPath();const x=-HX+r()*2*HX,y=-HY+r()*2*HY;for(let a=0;a<6.28;a+=.7){const rr2=2+r()*3;g.lineTo(x+Math.cos(a)*rr2*1.4,y+Math.sin(a)*rr2);}g.fill();}g.globalAlpha=1;}
 if(felt.pattern==='leopard'){const r=rng(9);for(let i=0;i<150;i++){const x=-HX+r()*2*HX,y=-HY+r()*2*HY,s=.9+r()*1.1;g.strokeStyle='rgba(40,20,5,.7)';g.lineWidth=.45;g.beginPath();g.ellipse(x,y,s,s*.75,r()*3,.3,5.4);g.stroke();g.fillStyle='rgba(120,70,20,.45)';g.beginPath();g.ellipse(x,y,s*.5,s*.35,0,0,6.28);g.fill();}}
 // texture
 g.save();g.globalCompositeOperation='overlay';g.globalAlpha=.32;const pat=g.createPattern(noise(),'repeat');if(pat){g.save();g.scale(.08,.08);g.fillStyle=pat;g.fillRect(-HX/.08,-HY/.08,2*HX/.08,2*HY/.08);g.restore();}g.restore();
 // lamp light: bright middle, dark ends
 const lg=g.createRadialGradient(0,0,4,0,0,HX*1.05);lg.addColorStop(0,'rgba(255,250,225,.16)');lg.addColorStop(.6,'rgba(255,250,225,.03)');lg.addColorStop(1,'rgba(0,0,0,.28)');g.fillStyle=lg;g.fillRect(-HX,-HY,2*HX,2*HY);
 // spots + head string
 g.fillStyle='rgba(255,255,255,.35)';for(const x of [-HX/2,HX/2]){g.beginPath();g.arc(x,0,.28,0,6.28);g.fill();}
}
function drawWear(g,wear,rough,k){
 if(!wear)return;const pic=PS.picture('wear-'+wear);
 g.save();g.beginPath();g.rect(-HX,-HY,2*HX,2*HY);g.clip();
 if(pic){g.globalCompositeOperation='multiply';g.drawImage(pic,-HX,-HY,2*HX,2*HY);g.restore();return;}
 const r=rng(1234+wear);
 // worn lane between the spots
 g.fillStyle=`rgba(255,255,230,${.025*wear})`;g.beginPath();g.ellipse(0,0,HX*.62,HY*.42,0,0,6.28);g.fill();
 const n=wear*5;
 for(let i=0;i<n;i++){const x=-HX+3+r()*(2*HX-6),y=-HY+3+r()*(2*HY-6);   // beer rings
  g.strokeStyle=`rgba(60,35,10,${.12+r()*.14})`;g.lineWidth=.22+r()*.2;g.beginPath();g.arc(x,y,1.3+r()*.5,0,6.28);g.stroke();if(r()<.5){g.beginPath();g.arc(x+.6,y-.4,1.35,.5,4.2);g.stroke();}}
 for(let i=0;i<wear*2;i++){const x=-HX+5+r()*(2*HX-10),y=-HY+4+r()*(2*HY-8),s=2+r()*3.5;   // spills
  g.fillStyle=`rgba(${r()<.5?'40,22,8':'20,30,10'},${.1+r()*.12})`;g.beginPath();for(let a=0;a<6.3;a+=.5){const q=s*(.6+r()*.5);g.lineTo(x+Math.cos(a)*q*1.3,y+Math.sin(a)*q);}g.closePath();g.fill();}
 for(let i=0;i<wear*3;i++){const x=-HX+2+r()*(2*HX-4),y=-HY+2+r()*(2*HY-4),a=r()*3;   // cigarette burns
  g.fillStyle='rgba(120,70,20,.28)';g.beginPath();g.ellipse(x,y,1,.5,a,0,6.28);g.fill();g.fillStyle='rgba(25,12,4,.75)';g.beginPath();g.ellipse(x,y,.55,.26,a,0,6.28);g.fill();}
 for(let i=0;i<wear*3;i++){const p=[[-HX,-HY],[HX,-HY],[-HX,HY],[HX,HY],[0,-HY],[0,HY]][Math.floor(r()*6)];   // chalk near the pockets
  g.fillStyle='rgba(70,120,210,.16)';g.beginPath();g.ellipse(p[0]*.94+(r()-.5)*4,p[1]*.9+(r()-.5)*3,1.2+r(),.7,r()*3,0,6.28);g.fill();}
 for(const q of rough){   // rips
  if(wear>=3){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(q.x,q.y,q.r*.9,q.r*.55,.4,0,6.28);g.fill();
   g.fillStyle='#cfc6b4';g.beginPath();const rr3=rng(q.x*100+q.y);for(let a=0;a<6.3;a+=.35){const d=q.r*(.25+rr3()*.45)*(Math.abs(Math.cos(a))*.7+.3);g.lineTo(q.x+Math.cos(a+.4)*d*1.6,q.y+Math.sin(a+.4)*d*.5);}g.closePath();g.fill();
   g.strokeStyle='rgba(230,230,210,.55)';g.lineWidth=.12;g.stroke();g.fillStyle='rgba(60,50,40,.35)';g.beginPath();g.ellipse(q.x+.3,q.y+.1,q.r*.25,q.r*.08,.4,0,6.28);g.fill();}
  else{g.save();g.translate(q.x,q.y);g.rotate(.4);g.fillStyle='rgba(170,175,180,.85)';for(const [w,h,a] of [[q.r*1.9,1.4,0],[q.r*1.5,1.2,.9]]){g.save();g.rotate(a);g.fillRect(-w/2,-h/2,w,h);g.strokeStyle='rgba(90,95,100,.6)';g.lineWidth=.1;g.strokeRect(-w/2,-h/2,w,h);g.restore();}g.restore();}
 }
 g.restore();
}
function drawPockets(g,T,look,felt,pic){
 for(const p of T.pockets){
  // the mouth: from the jaw points back to the hole
  g.fillStyle='#050505';g.beginPath();g.moveTo(p.mouth[0][0],p.mouth[0][1]);g.lineTo(p.jaw[0][0],p.jaw[0][1]);g.lineTo(p.jaw[1][0],p.jaw[1][1]);g.lineTo(p.mouth[1][0],p.mouth[1][1]);g.closePath();g.fill();
  // jaw faces (cushion rubber edge)
  g.strokeStyle=shade(felt.color,-.45);g.lineWidth=.35;g.beginPath();g.moveTo(p.mouth[0][0],p.mouth[0][1]);g.lineTo(p.jaw[0][0],p.jaw[0][1]);g.moveTo(p.mouth[1][0],p.mouth[1][1]);g.lineTo(p.jaw[1][0],p.jaw[1][1]);g.stroke();
  if(pic)continue;
  const hx=p.x+p.dir[0]*.4,hy=p.y+p.dir[1]*(p.kind==='side'?.2:.4),hr=p.kind==='side'?2.75:2.95;
  const liner={net:['#3a2a1c','#6b5236'],leather:['#3d220f','#8a5a2b'],drop:['#141414','#3a3a3a'],pro:['#0d0f12','#9aa6b5'],gold:['#3a2a05','#ffe08a']}[look.pockets]||['#222','#555'];
  g.fillStyle=liner[1];g.beginPath();g.arc(hx,hy,hr+.55,0,6.28);g.fill();
  const hg=g.createRadialGradient(hx,hy,.3,hx,hy,hr);hg.addColorStop(0,'#000');hg.addColorStop(.75,'#070707');hg.addColorStop(1,liner[0]);g.fillStyle=hg;g.beginPath();g.arc(hx,hy,hr,0,6.28);g.fill();
  if(look.pockets==='net'){g.strokeStyle='rgba(120,95,60,.35)';g.lineWidth=.12;for(let a=0;a<6.28;a+=.5){g.beginPath();g.moveTo(hx+Math.cos(a)*hr*.3,hy+Math.sin(a)*hr*.3);g.lineTo(hx+Math.cos(a)*hr,hy+Math.sin(a)*hr);g.stroke();}}
  if(look.pockets==='leather'||look.pockets==='gold'){g.strokeStyle=look.pockets==='gold'?'#fff1b0':'#d9b98a';g.setLineDash([.3,.3]);g.lineWidth=.1;g.beginPath();g.arc(hx,hy,hr+.3,0,6.28);g.stroke();g.setLineDash([]);}
 }
}
// ---------------------------------------------------------------- cue stick (screen px). tip at (x,y), pointing along ang
function drawCue(g,cue,x,y,ang,len,w,{alpha=1,shadow=true}={}){
 const L=cue.look||{},pic=PS.picture('cue-'+cue.id);
 g.save();g.globalAlpha=alpha;g.translate(x,y);g.rotate(ang);
 if(shadow){g.save();g.translate(w*.6,w*1.2);g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.moveTo(0,-w*.25);g.lineTo(-len,-w*.55);g.lineTo(-len,w*.55);g.lineTo(0,w*.25);g.fill();g.restore();}
 if(pic){g.drawImage(pic,-len,-w*.5,len,w);g.restore();return;}
 const tw=w*.42,bw=w*.62,taper=t=>tw+(bw-tw)*t;   // half widths along the cue
 const seg=(t0,t1,fill)=>{const x0=-len*t0,x1=-len*t1;g.fillStyle=fill;g.beginPath();g.moveTo(x0,-taper(t0)/2*2);g.lineTo(x1,-taper(t1));g.lineTo(x1,taper(t1));g.lineTo(x0,taper(t0));g.closePath();g.fill();};
 const sg=g.createLinearGradient(0,-bw,0,bw);sg.addColorStop(0,shade(L.shaft||'#e8d6b0',-.25));sg.addColorStop(.45,shade(L.shaft||'#e8d6b0',.25));sg.addColorStop(1,shade(L.shaft||'#e8d6b0',-.35));
 seg(.012,.5,sg);
 seg(0,.012,cue.chalk||'#3d78c8');seg(.012,.035,'#f4f1e8');
 seg(.5,.52,L.band||'#ccc');
 const bg=g.createLinearGradient(0,-bw,0,bw);bg.addColorStop(0,shade(L.butt||'#553',-.35));bg.addColorStop(.45,shade(L.butt||'#553',.2));bg.addColorStop(1,shade(L.butt||'#553',-.45));
 seg(.52,1,bg);
 // points / inlays on the forearm
 g.fillStyle=L.gold?'#fff1b0':shade(L.wrap||'#333',.1);for(let i=0;i<2;i++){const t0=.56,t1=.68;g.beginPath();g.moveTo(-len*t0,0);g.lineTo(-len*t1,(i?1:-1)*taper(t1)*.9);g.lineTo(-len*t1,0);g.closePath();g.fill();}
 if(L.belt){g.fillStyle='#111';g.fillRect(-len*.62,-taper(.62),len*.02,taper(.62)*2);}
 if(L.inlay){g.fillStyle='#e0e0e0';for(let i=0;i<5;i++){const t=.58+i*.022;g.beginPath();g.arc(-len*t,0,taper(t)*.35,0,6.28);g.fill();}}
 // wrap
 const wg=g.createLinearGradient(0,-bw,0,bw);wg.addColorStop(0,shade(L.wrap||'#222',-.3));wg.addColorStop(.5,shade(L.wrap||'#222',.15));wg.addColorStop(1,shade(L.wrap||'#222',-.4));
 seg(.72,.9,wg);g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=.6;for(let t=.72;t<.9;t+=.01){g.beginPath();g.moveTo(-len*t,-taper(t));g.lineTo(-len*(t+.006),taper(t));g.stroke();}
 if(L.feather){g.fillStyle='#fff';g.globalAlpha*=.8;for(let i=0;i<4;i++){g.beginPath();g.ellipse(-len*(.78+i*.03),-taper(.8)*1.6,len*.02,w*.35,-.5,0,6.28);g.fill();}g.globalAlpha=alpha;}
 if(L.nails){g.fillStyle='#aaa';for(let i=0;i<6;i++){g.fillRect(-len*(.6+i*.05),-taper(.7)*1.5,1.2,taper(.7)*.7);}}
 seg(.9,.915,L.band||'#ccc');seg(.985,1,'#111');
 if(L.warp&&false){}
 g.restore();
}
// ---------------------------------------------------------------- room (screen px)
const FLOORS=[{a:'#3a3026',b:'#2c241c',kind:'lino'},{a:'#5a3e26',b:'#4a321e',kind:'planks'},{a:'#8a5a32',b:'#734a28',kind:'planks'},{a:'#4a1218',b:'#3a0c12',kind:'carpet'},{a:'#1b1b1f',b:'#2a2a30',kind:'marble'}];
function drawFloor(g,W,H,tier,t0=0){
 const pic=PS.picture('floor-'+tier),f=FLOORS[tier]||FLOORS[0];
 if(pic){const p=g.createPattern(pic,'repeat');g.fillStyle=p;g.fillRect(0,0,W,H);return;}
 g.fillStyle=f.a;g.fillRect(0,0,W,H);const r=rng(77+tier);
 if(f.kind==='lino'){const s=42;for(let y=0;y<H;y+=s)for(let x=0;x<W;x+=s){if(((x/s)+(y/s))%2<1){g.fillStyle=f.b;g.fillRect(x,y,s,s);}}for(let i=0;i<40;i++){g.fillStyle=`rgba(10,6,2,${.15+r()*.2})`;g.beginPath();g.ellipse(r()*W,r()*H,8+r()*30,5+r()*16,r()*3,0,6.28);g.fill();}}
 else if(f.kind==='planks'){const ph=26;for(let y=0;y<H;y+=ph){let x=-r()*200;while(x<W){const w=120+r()*160;g.fillStyle=shade(r()<.5?f.a:f.b,(r()-.5)*.15);g.fillRect(x,y,w-1.5,ph-1.5);x+=w;}}g.fillStyle='rgba(0,0,0,.25)';for(let y=0;y<H;y+=ph)g.fillRect(0,y+ph-1.5,W,1.5);if(tier===1)for(let i=0;i<12;i++){g.fillStyle='rgba(10,6,2,.15)';g.beginPath();g.ellipse(r()*W,r()*H,10+r()*20,6+r()*10,0,0,6.28);g.fill();}}
 else if(f.kind==='carpet'){g.strokeStyle='rgba(212,170,80,.18)';g.lineWidth=2;const s=60;for(let y=0;y<H+s;y+=s)for(let x=0;x<W+s;x+=s){g.beginPath();g.moveTo(x,y-s/2);g.lineTo(x+s/2,y);g.lineTo(x,y+s/2);g.lineTo(x-s/2,y);g.closePath();g.stroke();g.beginPath();g.arc(x,y,4,0,6.28);g.stroke();}}
 else{const s=90;for(let y=0;y<H;y+=s)for(let x=0;x<W;x+=s){g.fillStyle=((x+y)/s)%2<1?'#202026':'#e9e4da';g.fillRect(x,y,s,s);}g.strokeStyle='rgba(212,170,60,.6)';g.lineWidth=2;for(let y=0;y<H;y+=s){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}for(let x=0;x<W;x+=s){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();}}
}
const WALLS=[{a:'#5a4630',b:'#3a2c1d',top:'#8f7a4a'},{a:'#6b5236',b:'#463421',top:'#a39264'},{a:'#7a3a26',b:'#5a2a1c',top:'#2a4a7a'},{a:'#2a1a22',b:'#1a0f15',top:'#5a2a3a'},{a:'#1a1408',b:'#0d0a04',top:'#d4a933'}];
// wall band (play screen): tier, decor list, tv tier, t = time
function drawWall(g,x0,y0,W,H,room,decor,t,face,area){
 const pic=PS.picture('wall-'+room.reno),w=WALLS[room.reno]||WALLS[0];
 if(pic){const k=Math.max(W/1600,H/320);g.drawImage(pic,x0+(W-1600*k)/2,y0+H-320*k,1600*k,320*k);}
 else{const gr=g.createLinearGradient(0,y0,0,y0+H);gr.addColorStop(0,w.top);gr.addColorStop(.35,w.a);gr.addColorStop(1,w.b);g.fillStyle=gr;g.fillRect(x0,y0,W,H);
  if(room.reno===2){g.fillStyle='rgba(0,0,0,.18)';for(let y=y0+H*.35;y<y0+H;y+=10)for(let x=x0+((y/10)%2)*14;x<x0+W;x+=28)g.fillRect(x,y,26,8);}
  else if(room.reno<2){g.fillStyle='rgba(0,0,0,.2)';for(let x=x0;x<x0+W;x+=34)g.fillRect(x,y0+H*.4,2,H*.6);}
  else if(room.reno===4){g.fillStyle='rgba(255,230,140,.12)';for(let x=x0;x<x0+W;x+=60)g.fillRect(x+4,y0+6,52,H-12);}
  g.fillStyle='rgba(0,0,0,.45)';g.fillRect(x0,y0+H-6,W,6);}
 // TVs and neon go in `area` [x,y,w,h] (the part of the strip the HUD leaves free)
 const [ax,ay,aw,ah]=area||[x0,y0,W,H];if(aw<40||ah<16)return;
 const tv=room.tv,cx=ax+aw/2,th=Math.min(ah*.8,aw*(tv===3?.12:tv===4?.18:.3));
 const screens=tv===1?[[cx-th*.7,th*.9]]:tv===2?[[cx-th*1.9,th*1.3],[cx+th*.6,th*1.3]]:tv===3?[[cx-th*3.2,th],[cx-th*2.05,th],[cx-th*.9,th],[cx+.25*th,th],[cx+1.4*th,th],[cx+2.55*th,th]]:tv===4?[[cx-th*1.9,th*3.8]]:[];
 screens.forEach(([sx,sw],i)=>{const sy=ay+(ah-th)/2;drawTvScreen(g,sx,sy,sw,th,tv,i,t,face);});
 // neon signs on the sides
 const tvW=screens.length?Math.max(...screens.map(([sx,sw])=>sx+sw))-Math.min(...screens.map(([sx])=>sx)):0,free=(aw-tvW)/2-8,nw=Math.min(free/Math.max(1,Math.ceil(decor.filter(d=>d.startsWith('neon-')).length/2)),ah*2.2);
 const ne=decor.filter(d=>d.startsWith('neon-'));if(nw>24)ne.forEach((d,i)=>{const side=i%2?1:-1,slot=Math.floor(i/2);const nx=side<0?ax+4+slot*nw:ax+aw-4-nw-slot*nw;if(slot*nw+nw>free+4)return;drawNeon(g,d,nx,ay+ah*.1,nw*.92,ah*.8,t);});
}
function drawTvScreen(g,x,y,w,h,tier,i,t,face){
 g.fillStyle=tier===1?'#2b2b2b':'#0b0b0d';rr(g,x-3,y-3,w+6,h+6,tier===1?6:2);g.fill();
 g.save();rr(g,x,y,w,h,tier===1?5:1);g.clip();
 const ch=(Math.floor(t/7)+i)%3;
 if(tier===1){const im=g.createImageData(Math.max(1,Math.round(w/3)),Math.max(1,Math.round(h/3)));for(let k=0;k<im.data.length;k+=4){const v=Math.random()*200;im.data[k]=im.data[k+1]=im.data[k+2]=v;im.data[k+3]=255;}const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').putImageData(im,0,0);g.imageSmoothingEnabled=false;g.drawImage(c,x,y,w,h);g.imageSmoothingEnabled=true;}
 else if(ch===0||tier===4&&ch!==2){g.fillStyle='#1f7a3a';g.fillRect(x,y,w,h);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1;g.strokeRect(x+w*.08,y+h*.15,w*.84,h*.7);g.beginPath();g.moveTo(x+w/2,y+h*.15);g.lineTo(x+w/2,y+h*.85);g.stroke();
  for(let k=0;k<8;k++){const px=x+w*(.2+.6*((Math.sin(t*.7+k*1.7)+1)/2)),py=y+h*(.25+.5*((Math.cos(t*.5+k*2.3)+1)/2));g.fillStyle=k<4?'#ffd23f':'#e43b3b';g.beginPath();g.arc(px,py,Math.max(1.5,h*.04),0,6.28);g.fill();}
  g.fillStyle='rgba(0,0,0,.6)';g.fillRect(x,y+h-h*.18,w,h*.18);g.fillStyle='#fff';g.font=`bold ${Math.max(7,h*.12)}px Arial`;g.textAlign='left';g.fillText('PHI 3  NYG 0',x+4,y+h-h*.04);}
 else if(ch===1){g.fillStyle='#14306b';g.fillRect(x,y,w,h);g.fillStyle='#c41e2a';g.fillRect(x,y+h*.72,w,h*.14);g.fillStyle='#fff';g.font=`bold ${Math.max(7,h*.11)}px Arial`;g.textAlign='left';const msg='PHILLY LOCAL NEWS: TRASH MAN STRIKES AGAIN · RUM HAM SIGHTING · GANG DENIES EVERYTHING · ';const off=(t*40)%(g.measureText(msg).width);g.fillText(msg+msg,x-off,y+h*.83);g.font=`bold ${Math.max(8,h*.16)}px Arial`;g.fillText('LIVE',x+5,y+h*.2);g.fillStyle='#ffd23f';g.fillRect(x+w*.55,y+h*.12,w*.38,h*.5);g.fillStyle='#14306b';g.font=`bold ${Math.max(6,h*.1)}px Arial`;g.fillText('BREAKING',x+w*.57,y+h*.42);}
 else{g.fillStyle='#111';g.fillRect(x,y,w,h);if(face)face(x+w/2,y+h*.5,Math.min(w,h)*.78);g.fillStyle='#e43b3b';g.font=`bold ${Math.max(7,h*.12)}px Arial`;g.textAlign='left';g.fillText('● LIVE',x+4,y+h*.18);}
 // glass
 const gl=g.createLinearGradient(x,y,x+w,y+h);gl.addColorStop(0,'rgba(255,255,255,.12)');gl.addColorStop(.5,'rgba(255,255,255,0)');g.fillStyle=gl;g.fillRect(x,y,w,h);
 g.restore();
}
const NEON={'neon-paddys':{text:"PADDY'S",sub:'PUB',col:'#3bff7a'},'neon-fight-milk':{text:'FIGHT',sub:'MILK',col:'#ffffff'},'neon-kitten':{text:'KITTEN',sub:'MITTENS',col:'#ff6ad5'},'neon-wolf':{text:'WOLF',sub:'COLA',col:'#ff7a1a'}};
function drawNeon(g,id,x,y,w,h,t){const n=NEON[id];if(!n)return;const pic=PS.picture('decor-'+id);if(pic){g.drawImage(pic,x,y,w,h);return;}
 const flick=id==='neon-paddys'&&Math.sin(t*13)>.93?.35:1;g.save();g.globalAlpha=flick;g.shadowColor=n.col;g.shadowBlur=Math.max(4,h*.25);g.fillStyle=n.col;g.textAlign='center';g.textBaseline='middle';
 g.font=`900 ${Math.min(h*.42,w/(n.text.length*.62))}px Arial Black, Arial`;g.fillText(n.text,x+w/2,y+h*.35);g.font=`700 ${Math.min(h*.3,w/(n.sub.length*.7))}px Arial`;g.fillText(n.sub,x+w/2,y+h*.75);g.restore();}
// ---------------------------------------------------------------- the Pool Hall scene (straight-on view of Paddy's)
const H=PS.HALL;
function hallCover(W,Hh){const k=Math.max(W/H.W,Hh/H.H);return {k,ox:(W-H.W*k)/2,oy:(Hh-H.H*k)/2};}
function drawHall(g,W,Hh,hall,t,{faces=[],feltColor,table,highlight,view,only=null}={}){
 const want=k=>!only||only===k;
 const v=view||[0,0,W,Hh],k=Math.max(v[2]/H.W,v[3]/H.H),cv={k,ox:v[0]+(v[2]-H.W*k)/2,oy:v[1]+(v[3]-H.H*k)/2};
 if(!only){g.fillStyle='#0d0907';g.fillRect(0,0,W,Hh);}g.save();g.translate(cv.ox,cv.oy);g.scale(cv.k,cv.k);
 const room=hall.room,decor=hall.decor.filter(d=>!hall.hide.includes(d)),put=(name,x,y,w,h)=>{const p=PS.picture(name);if(p){g.drawImage(p,x,y,w,h);return true;}return false;};
 // room
 if(want('room')&&!put('hall-'+room.reno,0,0,H.W,H.H)){const w=WALLS[room.reno];const gr=g.createLinearGradient(0,0,0,H.floorY);gr.addColorStop(0,w.top);gr.addColorStop(.25,w.a);gr.addColorStop(1,w.b);g.fillStyle=gr;g.fillRect(0,0,H.W,H.floorY);
  if(room.reno===2){g.fillStyle='rgba(0,0,0,.16)';for(let y=200;y<H.floorY;y+=28)for(let x=((y/28)%2)*40;x<H.W;x+=80)g.fillRect(x,y,76,24);}
  if(room.reno<2){g.fillStyle='rgba(0,0,0,.18)';for(let x=0;x<H.W;x+=70)g.fillRect(x,260,4,H.floorY-260);g.fillStyle='#2c1f12';g.fillRect(0,250,H.W,14);if(room.reno===0){g.fillStyle='rgba(70,50,10,.25)';for(let i=0;i<8;i++){g.beginPath();g.ellipse(100+i*190,120+((i*53)%60),80,40,0,0,6.28);g.fill();}g.fillStyle='#120c06';g.beginPath();g.ellipse(1010,470,28,20,.3,0,6.28);g.fill();}}
  if(room.reno===3){g.fillStyle='rgba(255,200,220,.05)';for(let y=20;y<H.floorY;y+=60)for(let x=(y/60%2)*40;x<H.W;x+=80){g.beginPath();g.ellipse(x,y,14,22,0,0,6.28);g.fill();}}
  if(room.reno===4){g.fillStyle='rgba(255,220,120,.15)';for(let x=40;x<H.W;x+=160)g.fillRect(x,40,120,H.floorY-80);g.strokeStyle='#d4a933';g.lineWidth=6;for(let x=40;x<H.W;x+=160)g.strokeRect(x,40,120,H.floorY-80);}
  g.save();g.translate(0,H.floorY);g.transform(1,0,0,.35,0,0);drawFloor(g,H.W,(H.H-H.floorY)/.35,room.reno);g.restore();
  const fs=g.createLinearGradient(0,H.floorY,0,H.floorY+60);fs.addColorStop(0,'rgba(0,0,0,.55)');fs.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=fs;g.fillRect(0,H.floorY,H.W,60);
  g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,0,H.W,18);}
 // wall decor
 const D=H.decor,dec=id=>decor.includes(id)&&want(id);
 for(const id of ['neon-paddys','neon-fight-milk','neon-kitten','neon-wolf'])if(dec(id)){const r=D[id];drawNeon(g,id,r[0],r[1],r[2],r[3],t);}
 if(dec('dartboard')){const r=D.dartboard;if(!put('decor-dartboard',...r)){const cx=r[0]+r[2]/2,cy=r[1]+r[3]/2,R0=r[2]/2;g.fillStyle='#1a1a1a';g.beginPath();g.arc(cx,cy,R0,0,6.28);g.fill();for(let i=0;i<20;i++){g.fillStyle=i%2?'#e9dfc4':'#151515';g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,R0*.82,i*.314,(i+1)*.314);g.fill();}g.strokeStyle='#c22';g.lineWidth=6;g.beginPath();g.arc(cx,cy,R0*.5,0,6.28);g.stroke();g.fillStyle='#c22';g.beginPath();g.arc(cx,cy,7,0,6.28);g.fill();}}
 if(dec('chalkboard')){const r=D.chalkboard;if(!put('decor-chalkboard',...r)){g.fillStyle='#6b4a2a';g.fillRect(...r);g.fillStyle='#1f2a24';g.fillRect(r[0]+10,r[1]+10,r[2]-20,r[3]-20);g.fillStyle='#e8e8e0';g.font='bold 22px Georgia';g.textAlign='center';g.fillText('TONIGHT',r[0]+r[2]/2,r[1]+50);g.font='18px Georgia';g.fillText('8-BALL $5',r[0]+r[2]/2,r[1]+85);g.fillText('NO SPITTING',r[0]+r[2]/2,r[1]+115);}}
 if(dec('pepe-board')){const r=D['pepe-board'];if(!put('decor-pepe-board',...r)){g.fillStyle='#b98d5a';g.fillRect(...r);const rr4=rng(3);for(let i=0;i<9;i++){g.fillStyle='#f4f0e2';g.fillRect(r[0]+10+rr4()*(r[2]-50),r[1]+10+rr4()*(r[3]-40),36,28);}g.strokeStyle='#c21';g.lineWidth=2;g.beginPath();for(let i=0;i<8;i++)g.lineTo(r[0]+20+rr4()*(r[2]-40),r[1]+15+rr4()*(r[3]-30));g.stroke();g.fillStyle='#111';g.font='bold 16px Arial';g.textAlign='center';g.fillText('PEPE SILVIA',r[0]+r[2]/2,r[1]+r[3]-8);}}
 if(dec('dennis-portrait')){const r=D['dennis-portrait'];if(!put('decor-dennis-portrait',...r)){g.fillStyle='#d4a933';g.fillRect(...r);g.fillStyle='#2a1b10';g.fillRect(r[0]+10,r[1]+10,r[2]-20,r[3]-20);if(faces[2])faces[2](r[0]+r[2]/2,r[1]+r[3]*.46,r[2]*.62);g.fillStyle='#ffd84a';g.font='bold 14px Georgia';g.textAlign='center';g.fillText('★★★★★',r[0]+r[2]/2,r[1]+r[3]-16);}}
 // TVs
 if(room.tv>0&&want('tv')){const tv=H.tv,scr=tv.screens[room.tv];if(!put('hall-tv-'+room.tv,tv.x,tv.y,tv.w,tv.h)){for(const s of scr){g.fillStyle=room.tv===1?'#3a3a3a':'#151517';rr(g,tv.x+s[0]-10,tv.y+s[1]-10,s[2]+20,s[3]+20,room.tv===1?18:6);g.fill();}if(room.tv===1){g.fillStyle='#2a2a2a';g.fillRect(tv.x+s0(scr)[0]+40,tv.y+s0(scr)[1]+s0(scr)[3]+10,s0(scr)[2]-80,30);}}
  scr.forEach((s,i)=>drawTvScreen(g,tv.x+s[0],tv.y+s[1],s[2],s[3],room.tv,i,t,faces[0]));}
 if(dec('fan')){const r=D.fan;if(!put('decor-fan',...r)){const cx=r[0]+r[2]/2,a=t*7;g.fillStyle='#3a2a1a';g.fillRect(cx-6,0,12,30);g.save();g.translate(cx,40);g.scale(1,.18);for(let i=0;i<4;i++){g.rotate(Math.PI/2);g.fillStyle='#5a4028';g.fillRect(10,-14+Math.sin(a+i)*2,r[2]*.45,28);}g.restore();g.fillStyle='#2a1e12';g.beginPath();g.ellipse(cx,42,22,12,0,0,6.28);g.fill();}}
 if(dec('jukebox')){const r=D.jukebox;if(!put('decor-jukebox',...r))drawJukebox(g,r,t);}
 if(dec('trophy-case')){const r=D['trophy-case'];if(!put('decor-trophy-case',...r)){g.fillStyle='#3a2414';g.fillRect(...r);g.fillStyle='rgba(180,220,255,.15)';g.fillRect(r[0]+10,r[1]+10,r[2]-20,r[3]-20);const n=Math.min(12,hall.stats.racks);for(let i=0;i<n;i++){const tx=r[0]+30+(i%3)*45,ty=r[1]+60+Math.floor(i/3)*55;g.fillStyle='#e6c04a';g.fillRect(tx-6,ty,12,16);g.beginPath();g.arc(tx,ty,13,Math.PI,0);g.fill();g.fillRect(tx-12,ty+16,24,6);}}}
 // bar
 if(want('bar'))drawBar(g,room.bar,t,dec('megatouch'),dec('rum-ham'));else if(dec('megatouch')||dec('rum-ham'))drawBar(g,-1,t,dec('megatouch'),dec('rum-ham'));
 // pool table
 if(want('table'))drawHallTable(g,table,feltColor,highlight==='table');
 // light over the table
 if(want('light'))drawHallLight(g,room.light,t);
 // the regulars
 if(dec('crowd'))drawCrowd(g,t,faces);
 g.restore();
 if(only)return;
 // vignette
 const vg=g.createRadialGradient(W/2,Hh*.55,Math.min(W,Hh)*.3,W/2,Hh*.55,Math.max(W,Hh)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=vg;g.fillRect(0,0,W,Hh);
}
const s0=scr=>scr[0];
function drawJukebox(g,r,t){const [x,y,w,h]=r;const gr=g.createLinearGradient(x,0,x+w,0);gr.addColorStop(0,'#5a1a0a');gr.addColorStop(.5,'#b8401a');gr.addColorStop(1,'#5a1a0a');g.fillStyle=gr;g.beginPath();g.moveTo(x,y+h);g.lineTo(x,y+w/2);g.arc(x+w/2,y+w/2,w/2,Math.PI,0);g.lineTo(x+w,y+h);g.closePath();g.fill();
 for(let i=0;i<5;i++){g.strokeStyle=`hsl(${(t*60+i*50)%360},90%,60%)`;g.lineWidth=6;g.beginPath();g.arc(x+w/2,y+w/2+10,w/2-12-i*10,Math.PI,0);g.stroke();}
 g.fillStyle='#1a0e08';g.fillRect(x+20,y+w*.75,w-40,h*.25);g.fillStyle='#ffe9b0';for(let i=0;i<6;i++)g.fillRect(x+28+i*((w-56)/6),y+w*.78,(w-56)/6-4,10);g.fillStyle='#e9c46a';g.fillRect(x+30,y+h*.62,w-60,h*.24);g.fillStyle='rgba(0,0,0,.4)';for(let i=0;i<6;i++)g.fillRect(x+34,y+h*.64+i*14,w-68,4);}
function drawBar(g,tier,t,mega,ham){
 const r=H.bar,pic=tier>=0&&PS.picture('hall-bar-'+tier);
 if(tier<0){}else if(pic){g.drawImage(pic,r.x,r.y,r.w,r.h);}
 else{const x=r.x,y=r.y,w=r.w;
  // back bar shelves
  const sw=['#2a1a0e','#3a2414','#4a2c16','#1a1a1f','#1a1206'][tier];g.fillStyle=sw;g.fillRect(x+20,y,w-20,300);
  if(tier>=3){const bl=g.createLinearGradient(0,y,0,y+300);bl.addColorStop(0,'rgba(255,200,120,.3)');bl.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=bl;g.fillRect(x+20,y,w-20,300);}
  const shelves=tier===0?1:tier<3?2:3,rb=rng(40+tier);
  for(let sI=0;sI<shelves;sI++){const sy=y+90+sI*80;g.fillStyle=tier===4?'#d4a933':'#5a3a1e';g.fillRect(x+20,sy,w-20,8);
   const n=tier===0?5:10+tier*2;for(let i=0;i<n;i++){const bx=x+40+i*((w-60)/n),bh=36+rb()*28,bw=Math.max(10,(w-60)/n*.6);if(tier===0&&rb()<.4)continue;g.fillStyle=['#3c6b2a','#7a4a1a','#c9a227','#6a1a1a','#2a4a7a','#d8d8d8'][Math.floor(rb()*6)];g.globalAlpha=.85;g.fillRect(bx,sy-bh,bw,bh);g.fillRect(bx+bw*.3,sy-bh-12,bw*.4,12);g.globalAlpha=1;g.fillStyle='rgba(255,255,255,.25)';g.fillRect(bx+2,sy-bh+4,2,bh-8);}}
  if(tier===4){for(let i=0;i<4;i++)for(let j=0;j<=i;j++){g.strokeStyle='#ffe9a0';g.lineWidth=3;const cx=x+w*.6+(j-i/2)*34,cy=y+40+i*34;g.beginPath();g.moveTo(cx-12,cy);g.lineTo(cx+12,cy);g.lineTo(cx,cy+18);g.closePath();g.stroke();}}
  // counter
  const cy=y+330,cg=g.createLinearGradient(0,cy,0,cy+260);const ct=['#4a2c16','#5a3418','#6b3e1a','#2a1a12','#c9a227'][tier];cg.addColorStop(0,shade(ct,.25));cg.addColorStop(.12,ct);cg.addColorStop(1,shade(ct,-.5));g.fillStyle=cg;g.fillRect(x,cy,w,r.h-330);
  g.fillStyle=tier===4?'#fff1b0':'#2a170a';g.fillRect(x-10,cy-14,w+10,22);
  if(tier>=2){for(let i=0;i<(tier===2?6:9);i++){const tx=x+60+i*40;g.fillStyle='#c9ced6';g.fillRect(tx,cy-70,8,56);g.fillStyle=['#c9a227','#2a4a7a','#7a1a1a','#3c6b2a'][i%4];g.fillRect(tx-6,cy-92,20,26);}}
  // stools
  for(let i=0;i<3;i++){const sx=x+70+i*170;g.fillStyle='#1a1a1a';g.fillRect(sx-4,cy+120,8,140);g.fillStyle=tier>=3?'#5a1a22':'#7a1a1a';g.beginPath();g.ellipse(sx,cy+120,46,16,0,0,6.28);g.fill();}
  if(tier===0){g.fillStyle='#8a6a3a';g.beginPath();g.ellipse(x+200,cy-20,26,10,0,0,6.28);g.fill();}}
 if(mega){const m=H.decor.megatouch;if(!PS.picture('decor-megatouch')){g.fillStyle='#1a1a20';g.fillRect(m[0],m[1],m[2],m[3]);g.fillStyle=`hsl(${(t*40)%360},70%,45%)`;g.fillRect(m[0]+12,m[1]+12,m[2]-24,m[3]-40);g.fillStyle='#fff';g.font='bold 13px Arial';g.textAlign='center';g.fillText('PHOTO HUNT',m[0]+m[2]/2,m[1]+m[3]-12);}else g.drawImage(PS.picture('decor-megatouch'),...m);}
 if(ham){const m=H.decor['rum-ham'];if(!PS.picture('decor-rum-ham')){g.fillStyle='#e6e6e6';g.beginPath();g.ellipse(m[0]+m[2]/2,m[1]+m[3]*.8,m[2]*.5,m[3]*.18,0,0,6.28);g.fill();g.fillStyle='#b8542a';g.beginPath();g.ellipse(m[0]+m[2]/2,m[1]+m[3]*.5,m[2]*.36,m[3]*.36,0,0,6.28);g.fill();g.fillStyle='#e0d0a0';g.fillRect(m[0]+m[2]*.8,m[1]+m[3]*.38,22,10);}else g.drawImage(PS.picture('decor-rum-ham'),...m);}
}
function drawHallTable(g,table,feltColor,glow){
 const r=H.table,fq=r.felt.map(([a,b])=>[r.x+a,r.y+b]),look=table.look,pic=PS.picture('hall-table-'+table.id);
 // felt quad
 const fg=g.createLinearGradient(0,fq[0][1],0,fq[2][1]);fg.addColorStop(0,shade(feltColor,-.2));fg.addColorStop(1,shade(feltColor,.12));g.fillStyle=fg;g.beginPath();fq.forEach(p=>g.lineTo(p[0],p[1]));g.closePath();g.fill();
 if(pic){g.drawImage(pic,r.x,r.y,r.w,r.h);}
 else{const fr=look.frame,fr2=look.frame2;
  // rails around the felt
  const out=[[fq[0][0]-34,fq[0][1]-22],[fq[1][0]+34,fq[1][1]-22],[fq[2][0]+46,fq[2][1]+18],[fq[3][0]-46,fq[3][1]+18]];
  g.fillStyle=fr;g.beginPath();out.forEach(p=>g.lineTo(p[0],p[1]));g.closePath();fq.slice().reverse().forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill('evenodd');
  g.fillStyle=shade(fr,.2);g.fillRect(out[3][0],out[3][1]-6,out[2][0]-out[3][0],8);
  // apron + legs
  const ag=g.createLinearGradient(0,out[3][1],0,out[3][1]+70);ag.addColorStop(0,fr);ag.addColorStop(1,fr2);g.fillStyle=ag;g.fillRect(out[3][0],out[3][1],out[2][0]-out[3][0],70);
  if(look.coin){g.fillStyle='#c9ced6';g.fillRect(r.x+r.w/2-40,out[3][1]+14,80,40);g.fillStyle='#222';g.fillRect(r.x+r.w/2-4,out[3][1]+20,8,28);}
  if(look.gold){g.strokeStyle='#fff1b0';g.lineWidth=4;g.strokeRect(out[3][0]+10,out[3][1]+10,out[2][0]-out[3][0]-20,50);}
  for(const lx of [out[3][0]+30,out[2][0]-70,r.x+r.w/2-20]){if(lx===r.x+r.w/2-20&&!look.gold&&!(look.wear===0&&!look.led))continue;g.fillStyle=fr2;g.fillRect(lx,out[3][1]+70,40,r.y+r.h-(out[3][1]+70));}
  if(look.wear>=2){g.save();g.translate(out[2][0]-70,out[3][1]+70);g.fillStyle='#d8c8a0';g.fillRect(4,40,32,22);g.restore();}
  // pockets
  for(const [px,py,rx] of [[fq[0][0]-10,fq[0][1]-6,22],[fq[1][0]+10,fq[1][1]-6,22],[(fq[0][0]+fq[1][0])/2,fq[0][1]-8,20],[fq[3][0]-14,fq[3][1]+6,30],[fq[2][0]+14,fq[2][1]+6,30],[(fq[2][0]+fq[3][0])/2,fq[3][1]+10,28]]){g.fillStyle='#050505';g.beginPath();g.ellipse(px,py,rx,rx*.45,0,0,6.28);g.fill();}
  // wear on the felt
  if(look.wear>=2){g.fillStyle='rgba(40,20,5,.3)';g.beginPath();g.ellipse(r.x+420,r.y+170,60,16,0,0,6.28);g.fill();g.fillStyle='#d8cfbd';g.beginPath();g.ellipse(r.x+620,r.y+120,26,5,.2,0,6.28);g.fill();}}
 // racked balls
 const bx=r.x+r.w*.64,by=r.y+r.h*.34,COLS=['#f2c12e','#1f4fbf','#d42a2a','#5b2a8a','#111114','#f07b1a','#13804a','#7a1f22','#f2c12e','#1f4fbf'];let i=0;
 for(let c=0;c<4;c++)for(let q=0;q<=c;q++){const x=bx+c*20,y=by+(q-c/2)*16;g.fillStyle=COLS[i++%COLS.length];g.beginPath();g.ellipse(x,y,10,8,0,0,6.28);g.fill();g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(x-3,y-3,2.5,0,6.28);g.fill();}
 g.fillStyle='#f5f2e6';g.beginPath();g.ellipse(r.x+r.w*.3,r.y+r.h*.36,10,8,0,0,6.28);g.fill();
 if(glow){g.strokeStyle='rgba(255,215,90,.8)';g.lineWidth=5;g.beginPath();fq.forEach(p=>g.lineTo(p[0],p[1]));g.closePath();g.stroke();}
}
function drawHallLight(g,tier,t){
 const r=H.light,cx=r.x+r.w/2,pic=PS.picture('hall-light-'+tier);
 // light cone onto the table
 const cg=g.createRadialGradient(cx,H.table.y+120,40,cx,H.table.y+120,560);const warm=['rgba(255,230,160,','rgba(255,210,140,','rgba(255,200,150,','rgba(230,240,255,','rgba(255,235,170,'][tier];
 const fl=tier===0?(Math.sin(t*17)>.9?.15:.32):.34;cg.addColorStop(0,warm+fl+')');cg.addColorStop(1,warm+'0)');g.fillStyle=cg;g.fillRect(0,0,H.W,H.H);
 if(pic){g.drawImage(pic,r.x,r.y,r.w,r.h);return;}
 g.strokeStyle='#111';g.lineWidth=4;
 if(tier===0){g.beginPath();g.moveTo(cx,0);g.lineTo(cx,250);g.stroke();g.fillStyle=Math.sin(t*17)>.9?'#887':'#fff6c8';g.shadowColor='#ffe9a0';g.shadowBlur=40;g.beginPath();g.arc(cx,268,18,0,6.28);g.fill();g.shadowBlur=0;}
 else if(tier===1){g.beginPath();g.moveTo(cx-200,0);g.lineTo(cx-200,190);g.moveTo(cx+200,0);g.lineTo(cx+200,190);g.stroke();g.fillStyle='#1d5a2a';rr(g,cx-280,190,560,70,20);g.fill();g.fillStyle='#fff';g.font='bold 34px Arial';g.textAlign='center';g.fillText("DOOKIE'S LITE",cx,238);g.fillStyle='rgba(255,240,180,.8)';g.fillRect(cx-260,256,520,6);}
 else if(tier===2){g.beginPath();g.moveTo(cx,0);g.lineTo(cx,140);g.stroke();for(let i=-1;i<=1;i++){const x=cx+i*190;g.beginPath();g.moveTo(cx,140);g.lineTo(x,180);g.stroke();const cols=['#c22','#2a6','#c92','#26c'];for(let k=0;k<8;k++){g.fillStyle=cols[k%4];g.beginPath();g.moveTo(x,180);g.arc(x,250,80,Math.PI+k*Math.PI/8,Math.PI+(k+1)*Math.PI/8);g.closePath();g.fill();}g.strokeStyle='#2a1a0a';g.lineWidth=5;g.beginPath();g.arc(x,250,80,Math.PI,0);g.stroke();g.strokeStyle='#111';g.lineWidth=4;}}
 else if(tier===3){g.beginPath();g.moveTo(cx-250,0);g.lineTo(cx-250,200);g.moveTo(cx+250,0);g.lineTo(cx+250,200);g.stroke();g.fillStyle='#22262c';rr(g,cx-300,200,600,40,10);g.fill();g.fillStyle='#e6f2ff';g.shadowColor='#bfe0ff';g.shadowBlur=30;g.fillRect(cx-280,236,560,8);g.shadowBlur=0;}
 else{g.beginPath();g.moveTo(cx,0);g.lineTo(cx,120);g.stroke();for(let ring=0;ring<3;ring++){const rw=220-ring*55,ry=150+ring*45;g.strokeStyle='#d4a933';g.lineWidth=5;g.beginPath();g.ellipse(cx,ry,rw,24,0,0,6.28);g.stroke();for(let k=0;k<14-ring*3;k++){const a=k/(14-ring*3)*6.28+t*.2,x=cx+Math.cos(a)*rw,y=ry+Math.sin(a)*24;g.fillStyle=`rgba(220,240,255,${.6+.4*Math.sin(t*3+k)})`;g.beginPath();g.moveTo(x,y);g.lineTo(x+6,y+22);g.lineTo(x-6,y+22);g.closePath();g.fill();}}}
}
function drawCrowd(g,t,faces){
 const spots=[[90,860],[260,900],[1250,880],[1440,850],[700,960],[960,960]];
 spots.forEach(([x,y],i)=>{const bob=Math.sin(t*2+i)*4,f=faces[3+i%Math.max(1,faces.length-3)]||null;g.fillStyle=['#2a3a4a','#4a2a2a','#2a4a2a','#3a3a2a','#2a2a3a','#4a3a2a'][i];g.beginPath();g.ellipse(x,y+bob+90,95,110,0,0,6.28);g.fill();
  if(f)f(x,y+bob-20,120);else{g.fillStyle='#d8b090';g.beginPath();g.arc(x,y+bob-20,50,0,6.28);g.fill();}});
}
// ---------------------------------------------------------------- small previews for the shop cards
function preview(kind,item,w,h,hall){
 const cv=document.createElement('canvas'),dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);const g=cv.getContext('2d');g.scale(dpr,dpr);
 if(kind==='table'||kind==='felt'){const T=PH.buildTable(),k=Math.min(w/104,h/60);g.translate(w/2,h/2);g.scale(k,k);const tb=kind==='table'?item:hall.table,fe=kind==='felt'?item:hall.felt;drawTable(g,T,{look:tb.look,felt:fe,wear:tb.look.wear,rough:tb.feel.rough||[],id:tb.id,k});}
 else if(kind==='cue'){drawCue(g,{...item,chalk:hall.chalk.color},w-6,h/2,0,w-12,Math.max(6,h*.22),{shadow:false});}
 else if(kind==='chalk'){g.fillStyle=item.color;rr(g,w/2-h*.3,h*.2,h*.6,h*.6,4);g.fill();g.fillStyle='rgba(255,255,255,.25)';g.fillRect(w/2-h*.3,h*.2,h*.6,h*.12);}
 else if(kind==='balls'){const ids=[1,9,8,0];const B=require("src/engines/pool/balls.js");const art=B.makeBallArt();ids.forEach((id,i)=>{const b=PH.makeBall(id,0,0);PH.rotate(b.o,[1,0,0],.5+i);PH.rotate(b.o,[0,1,0],.3);const px=Math.min(h*.32,w/10)*dpr,c=art.draw(b,px,0,item);g.drawImage(c,w*(.17+i*.22)-c.width/dpr/2,h/2-c.height/dpr/2,c.width/dpr,c.height/dpr);});}
 return cv;
}
Object.assign(exports,{drawTable,drawCue,drawFloor,drawWall,drawHall,hallCover,preview,shade,rr,RAIL,CUSH});
