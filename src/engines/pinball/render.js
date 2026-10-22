// Pinball renderer + camera. The playfield is drawn once into two cached layers (base under the balls, "over" =
// ramps, wireforms and the apron above them) at the play scale; each frame adds the lighting (GI glow pools, a darkness
// pass when the GI drops, inserts at their brightness, flasher domes), moving parts, flippers and balls. Drop-in art
// (dropins.js) reaches the table art functions as `imgs`; when an image arrives the caches are rebuilt.
// Camera: the table width always fills the screen width (Game Boy Pokemon Pinball style) and the view pans up and
// down with the ball; when the whole height fits it stays put. The intro starts on the whole table, then zooms in.
const {railAt}=require("src/engines/pinball/physics.js");
const {drawFlipperImage}=require("src/engines/pinball/dropins.js");
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;
const TAU=Math.PI*2;

function hexA(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function mixHex(hex,k){const n=parseInt(hex.slice(1),16),f=c=>Math.round(c+(255-c)*k);return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;}
function lampPath(x,l,grow=0){const r=l.r+grow;x.beginPath();
 if(l.shape==='arrow'){x.save();x.translate(l.x,l.y);x.rotate((l.angle||0)*Math.PI/180);x.moveTo(0,-r*1.25);x.lineTo(r,r*.7);x.lineTo(0,r*.25);x.lineTo(-r,r*.7);x.closePath();x.restore();}
 else if(l.shape==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;x.lineTo(l.x+Math.cos(a)*rr,l.y+Math.sin(a)*rr);}x.closePath();}
 else if(l.shape==='rect'){x.rect(l.x-(l.w||r*2)/2,l.y-(l.h||r)/2,l.w||r*2,l.h||r);}
 else x.arc(l.x,l.y,r,0,TAU);}
// Offset polyline (for ramp edges): returns left/right edge points at distance d.
function offsets(pts,d){const L=[],Rt=[];for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;L.push([pts[i][0]-ty*d,pts[i][1]+tx*d,pts[i][2]||0]);Rt.push([pts[i][0]+ty*d,pts[i][1]-tx*d,pts[i][2]||0]);}return [L,Rt];}
const lift=(p,k=.22)=>[p[0]-(p[2]||0)*k*.35,p[1]-(p[2]||0)*k];   // raised parts drawn slightly up-screen for depth
function poly(x,pts,close=false){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));if(close)x.closePath();}

// Chrome ball: sky highlight on top, the dark playfield reflected underneath, a window glint, and (tint) the
// colour of the lights around it.
function chromeBall(x,cx,cy,r,gold=false,tint=null){
 const g=x.createRadialGradient(cx-r*.3,cy-r*.45,r*.08,cx,cy+r*.1,r*1.05);
 if(gold){g.addColorStop(0,'#fffbe6');g.addColorStop(.25,'#ffd966');g.addColorStop(.6,'#b8860b');g.addColorStop(.85,'#5c3d05');g.addColorStop(1,'#2a1c02');}
 else{g.addColorStop(0,'#ffffff');g.addColorStop(.22,'#e3e7ee');g.addColorStop(.5,'#8d95a5');g.addColorStop(.78,'#3c4250');g.addColorStop(1,'#15171d');}
 x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,TAU);x.fill();
 x.save();x.beginPath();x.arc(cx,cy,r,0,TAU);x.clip();
 x.fillStyle=gold?'rgba(60,30,0,.35)':'rgba(40,14,48,.45)';x.beginPath();x.ellipse(cx,cy+r*.62,r*1.1,r*.5,0,0,TAU);x.fill();   // the playfield below
 if(tint){x.fillStyle=tint;x.globalAlpha=.28;x.beginPath();x.ellipse(cx+r*.35,cy+r*.15,r*.45,r*.3,.4,0,TAU);x.fill();x.globalAlpha=1;}
 x.restore();
 x.fillStyle='rgba(255,255,255,.92)';x.beginPath();x.ellipse(cx-r*.36,cy-r*.44,r*.24,r*.13,-.6,0,TAU);x.fill();
 x.fillStyle='rgba(255,255,255,.45)';x.beginPath();x.arc(cx+r*.4,cy+r*.38,r*.09,0,TAU);x.fill();
}
function drawFlipper(x,f,color='#f4f1ea',rubber='#d7263d',text=''){
 x.save();x.translate(f.x,f.y);x.rotate(f.a);
 x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.arc(3,4,f.r0,Math.PI/2,Math.PI*1.5);x.lineTo(f.len+3,4-f.r1);x.arc(f.len+3,4,f.r1,-Math.PI/2,Math.PI/2);x.closePath();x.fill();
 x.beginPath();x.arc(0,0,f.r0,Math.PI/2,Math.PI*1.5);x.lineTo(f.len,-f.r1);x.arc(f.len,0,f.r1,-Math.PI/2,Math.PI/2);x.closePath();
 const g=x.createLinearGradient(0,-f.r0,0,f.r0);g.addColorStop(0,'#ffffff');g.addColorStop(.5,color);g.addColorStop(1,'#a9a49a');x.fillStyle=g;x.fill();
 x.lineWidth=3.2;x.strokeStyle=rubber;x.stroke();
 if(text&&f.len>60){x.save();x.fillStyle=rubber;x.font='bold 6px Arial';x.textAlign='center';x.textBaseline='middle';const flip=Math.cos(f.a)<0;if(flip){x.translate(f.len*.55,0);x.rotate(Math.PI);x.fillText(text,0,0);}else x.fillText(text,f.len*.55,0);x.restore();}
 x.fillStyle='#8d939e';x.beginPath();x.arc(0,0,4,0,TAU);x.fill();x.fillStyle='#e6e9ef';x.beginPath();x.arc(-.8,-.8,1.8,0,TAU);x.fill();
 x.restore();
}

function createRenderer(table){
 const def=table.def||table,art=table.art||{},imgs=table.imgs||{},R={def,cache:null,glow:new Map()};
 R.invalidate=()=>{R.cache=null;};R.discA={};R.discT={};
 const glowSprite=color=>{if(R.glow.has(color))return R.glow.get(color);const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,hexA(color,.9));g.addColorStop(.35,hexA(color,.45));g.addColorStop(1,hexA(color,0));x.fillStyle=g;x.fillRect(0,0,64,64);R.glow.set(color,c);return c;};
 const glow=(x,color,cx,cy,size,alpha=1)=>{if(alpha<=.01)return;x.save();x.globalCompositeOperation='lighter';x.globalAlpha=Math.min(1,alpha);x.drawImage(glowSprite(color),cx-size/2,cy-size/2,size,size);x.restore();};
 function layer(k,fn){const c=document.createElement('canvas');c.width=Math.ceil(def.W*k);c.height=Math.ceil(def.H*k);const x=c.getContext('2d');x.scale(k,k);x.lineCap='round';x.lineJoin='round';fn(x);return c;}
 function drawWalls(x){
  const segs=def.segs;const by=look=>segs.filter(s=>(s.look||'')===look);
  for(const s of by('wood')){x.strokeStyle='#2a1a10';x.lineWidth=s.r*2+8;poly(x,[[s.ax,s.ay],[s.bx,s.by]]);x.stroke();}
  for(const s of by('wood')){x.strokeStyle='#c9ccd6';x.lineWidth=2;poly(x,[[s.ax,s.ay],[s.bx,s.by]]);x.stroke();}
  for(const s of by('plastic')){x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=s.r*2+3;poly(x,[[s.ax+2,s.ay+3],[s.bx+2,s.by+3]]);x.stroke();}
  for(const s of by('plastic')){x.strokeStyle=art.plastic||'#f2c14e';x.lineWidth=s.r*2+2;poly(x,[[s.ax,s.ay],[s.bx,s.by]]);x.stroke();x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=1.2;poly(x,[[s.ax-1,s.ay-1],[s.bx-1,s.by-1]]);x.stroke();}
  for(const s of by('rail')){x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=s.r*2+2;poly(x,[[s.ax+2,s.ay+3],[s.bx+2,s.by+3]]);x.stroke();x.strokeStyle='#7d8594';x.lineWidth=s.r*2;poly(x,[[s.ax,s.ay],[s.bx,s.by]]);x.stroke();x.strokeStyle='#eef1f6';x.lineWidth=s.r*.7;poly(x,[[s.ax-.6,s.ay-.6],[s.bx-.6,s.by-.6]]);x.stroke();}
  for(const s of segs.filter(s=>s.kind==='rubber'&&s.look==='rubber')){x.strokeStyle='#111';x.lineWidth=s.r*2;poly(x,[[s.ax,s.ay],[s.bx,s.by]]);x.stroke();}
  for(const s of segs.filter(s=>s.look==='post')){x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.arc(s.ax+2,s.ay+3,s.r,0,TAU);x.fill();x.fillStyle='#141414';x.beginPath();x.arc(s.ax,s.ay,s.r,0,TAU);x.fill();x.fillStyle='#c8ccd4';x.beginPath();x.arc(s.ax,s.ay,s.r*.5,0,TAU);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(s.ax-1,s.ay-1,s.r*.2,0,TAU);x.fill();}
 }
 // An unlit insert: a dark coloured lens with a bevel and a little reflection of the room.
 function insert(x,l){lampPath(x,l);const g=x.createRadialGradient(l.x,l.y,1,l.x,l.y,l.r*1.2);g.addColorStop(0,hexA(l.color,.42));g.addColorStop(1,hexA(l.color,.12));x.fillStyle=g;x.fill();
  x.lineWidth=1.4;x.strokeStyle='rgba(0,0,0,.6)';x.stroke();x.lineWidth=.7;x.strokeStyle=hexA(l.color,.6);lampPath(x,l,-.8);x.stroke();
  x.save();lampPath(x,l);x.clip();x.fillStyle='rgba(255,255,255,.18)';x.beginPath();x.ellipse(l.x-l.r*.35,l.y-l.r*.45,l.r*.55,l.r*.25,-.5,0,TAU);x.fill();x.restore();
  if(l.label&&l.r>=8){x.fillStyle='rgba(255,255,255,.6)';x.font=`bold ${l.label.length>3?5:Math.min(9,l.r*.9)}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(l.label,l.x,l.y+(l.label.length>3?l.r+6:0));}}
 function drawBase(x){
  art.base?.(x,def,imgs);
  // clear-coat sheen + vignette over the art
  x.save();x.beginPath();x.rect(0,0,def.W,def.H);const sh=x.createLinearGradient(0,0,def.W,def.H*.6);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(.45,'rgba(255,255,255,.05)');sh.addColorStop(.55,'rgba(255,255,255,0)');x.fillStyle=sh;x.fill();
  const vg=x.createRadialGradient(def.W/2,def.H*.55,def.W*.3,def.W/2,def.H*.55,def.H*.62);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');x.fillStyle=vg;x.fill();x.restore();
  const pl=def.plunger;if(pl){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(pl.x0,300,pl.x1-pl.x0,def.H-300);}
  for(const l of def.lamps)insert(x,l);
  for(const mg of def.magnets){x.save();x.globalAlpha=.55;for(let i=4;i>=1;i--){x.strokeStyle=i%2?'#b87333':'#6b3f1d';x.lineWidth=3;x.beginPath();x.arc(mg.x,mg.y,mg.r*i/4.6,0,TAU);x.stroke();}x.fillStyle='#2b2f38';x.beginPath();x.arc(mg.x,mg.y,5,0,TAU);x.fill();x.restore();}
  for(const h of def.holes){if(h.toRail){x.fillStyle='rgba(255,210,63,.35)';x.beginPath();x.moveTo(h.x,h.y-h.r-14);x.lineTo(h.x-8,h.y-h.r-4);x.lineTo(h.x+8,h.y-h.r-4);x.fill();}
   x.fillStyle='#000';x.beginPath();x.arc(h.x,h.y,h.r+1,0,TAU);x.fill();const g=x.createRadialGradient(h.x,h.y-3,1,h.x,h.y,h.r+3);g.addColorStop(0,'#000');g.addColorStop(.8,'#111');g.addColorStop(1,'#9aa2b1');x.strokeStyle=g;x.lineWidth=3;x.stroke();
   if(def.parts[h.id]?.label){x.fillStyle='rgba(255,255,255,.75)';x.font='bold 6px Arial';x.textAlign='center';x.fillText(def.parts[h.id].label,h.x,h.y-h.r-6);}}
  for(const s of def.sensors.filter(s=>s.kind==='rollover'||s.kind==='kickback')){x.strokeStyle='rgba(220,225,235,.75)';x.lineWidth=1.4;x.beginPath();x.moveTo(s.x,s.y-8);x.lineTo(s.x,s.y+8);x.stroke();x.beginPath();x.ellipse(s.x,s.y,3,9,0,0,TAU);x.stroke();}
  // ramp entrance flaps (metal lips where the plastic meets the playfield)
  for(const r of def.rails){if(r.noEntry)continue;const p0=r.pts[0],p1=r.pts[Math.min(3,r.pts.length-1)],tx=p1[0]-p0[0],ty=p1[1]-p0[1],l=Math.hypot(tx,ty)||1,nx=-ty/l,ny=tx/l,hw=r.width/2-4;
   const g=x.createLinearGradient(p0[0],p0[1]+6,p0[0],p0[1]-6);g.addColorStop(0,'#5d6573');g.addColorStop(1,'#e8ebf0');x.fillStyle=g;poly(x,[[p0[0]+nx*hw,p0[1]+ny*hw+6],[p0[0]-nx*hw,p0[1]-ny*hw+6],[p0[0]-nx*hw*.9+tx/l*10,p0[1]-ny*hw*.9+ty/l*10],[p0[0]+nx*hw*.9+tx/l*10,p0[1]+ny*hw*.9+ty/l*10]],true);x.fill();}
  for(const p of Object.values(def.parts)){
   if(p.kind==='bumper'){x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.arc(p.x+3,p.y+4,p.r+4,0,TAU);x.fill();x.fillStyle='#d7dbe3';x.beginPath();x.arc(p.x,p.y,p.r+3,0,TAU);x.fill();x.fillStyle='#2b2f38';x.beginPath();x.arc(p.x,p.y,p.r,0,TAU);x.fill();}
   if(p.kind==='sling'){x.fillStyle=art.sling||'#e63946';poly(x,[p.a,p.b,p.c],true);x.fill();x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=1.5;x.stroke();art.slingArt?.(x,p);}
  }
  drawWalls(x);
  for(const f of def.flashers){x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.arc(f.x+2,f.y+3,f.r+2,0,TAU);x.fill();x.fillStyle='#1d2027';x.beginPath();x.arc(f.x,f.y,f.r+2,0,TAU);x.fill();}
 }
 function drawOver(x){
  for(const r of def.rails){
   if(r.hidden)continue;   // drawn by the table art (e.g. a creature carrying the ball)
   const pts=r.pts,[L,Rt]=offsets(pts,r.width/2-6);
   x.save();x.globalAlpha=.3;x.strokeStyle='#000';x.lineWidth=r.look==='plastic'?r.width:16;poly(x,pts.map(p=>[p[0]+(p[2]||0)*.25+3,p[1]+(p[2]||0)*.3+4]));x.stroke();x.restore();
   if(r.look==='plastic'){const col=def.parts?.[r.id]?.color||'#e63946';const Ls=L.map(p=>lift(p)),Rs=Rt.map(p=>lift(p));
    x.fillStyle=hexA(col,.28);poly(x,[...Ls,...Rs.slice().reverse()],true);x.fill();
    // a sheen stripe down the middle of the plastic
    const mid=pts.map(p=>lift(p));x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=r.width*.25;poly(x,mid);x.stroke();
    x.strokeStyle=hexA(col,.9);x.lineWidth=3;poly(x,Ls);x.stroke();poly(x,Rs);x.stroke();
    x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=1;poly(x,Ls.map(p=>[p[0]-1,p[1]-1]));x.stroke();
    for(let i=0;i<pts.length;i+=6){x.strokeStyle=hexA(col,.35);x.lineWidth=1;poly(x,[Ls[i],Rs[i]]);x.stroke();}}
   else{const [L2,R2]=offsets(pts,11),Ls=L2.map(p=>lift(p)),Rs=R2.map(p=>lift(p));
    for(let i=0;i<pts.length;i+=4){x.strokeStyle='#5d6573';x.lineWidth=2;poly(x,[Ls[i],Rs[i]]);x.stroke();}
    for(const e of [Ls,Rs]){x.strokeStyle='#596170';x.lineWidth=3.2;poly(x,e);x.stroke();x.strokeStyle='#f3f6fb';x.lineWidth=1.3;poly(x,e.map(p=>[p[0]-.6,p[1]-.6]));x.stroke();}}
   // decal along the ramp (its label), set where the ramp is highest
   const label=def.parts?.[r.id]?.label;if(label){let hi=0;pts.forEach((p,i)=>{if((p[2]||0)>(pts[hi][2]||0))hi=i;});const i0=Math.max(1,Math.min(pts.length-2,hi-6)),a=lift(pts[i0-1]),b=lift(pts[i0+1]),p=lift(pts[i0]);
    x.save();x.translate(p[0],p[1]);let ang=Math.atan2(b[1]-a[1],b[0]-a[0]);if(Math.cos(ang)<0)ang+=Math.PI;x.rotate(ang);x.font='bold 9px Georgia';x.textAlign='center';x.textBaseline='middle';x.lineWidth=3;x.strokeStyle='rgba(0,0,0,.7)';x.strokeText(label,0,0);x.fillStyle='#fff3c4';x.fillText(label,0,0);x.restore();}
  }
  art.over?.(x,def,imgs);
 }
 R.ensure=k=>{k=Math.min(k,Math.sqrt(14e6/(def.W*def.H)));if(R.cache&&Math.abs(R.cache.k-k)<.02)return;R.cache={k,base:layer(k,drawBase),over:layer(k,drawOver)};};

 // ---- per frame
 function drawLights(x,lamps,gi){
  // darkness when the GI drops (lamps then punch through), then GI glow pools
  if(gi<.98){x.fillStyle=`rgba(0,0,8,${(1-gi)*.62})`;x.fillRect(0,0,def.W,def.H);}
  for(const b of def.gi)glow(x,b.color,b.x,b.y,b.r*2.4,gi*.32);
  for(const l of def.lamps){let v=+lamps[l.id]||0;if(v<=0)continue;v=Math.min(1,v);
   x.save();x.globalAlpha=v;lampPath(x,l);const g=x.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r*1.1);g.addColorStop(0,mixHex(l.color,.75));g.addColorStop(.45,mixHex(l.color,.15));g.addColorStop(1,l.color);x.fillStyle=g;x.fill();x.restore();
   glow(x,l.color,l.x,l.y,l.r*5.4,v);}
 }
 function drawFlashers(x,flashers,t){
  for(const f of def.flashers){const st=flashers?.[f.id],on=st&&Math.floor((t-st.t0)/.08)%2===0;
   const g=x.createRadialGradient(f.x-f.r*.3,f.y-f.r*.4,1,f.x,f.y,f.r);g.addColorStop(0,on?'#ffffff':mixHex(f.color,.35));g.addColorStop(.6,on?mixHex(f.color,.4):f.color);g.addColorStop(1,on?f.color:hexA(f.color,.6));
   x.fillStyle=g;x.beginPath();x.arc(f.x,f.y,f.r,0,TAU);x.fill();x.fillStyle='rgba(255,255,255,.5)';x.beginPath();x.ellipse(f.x-f.r*.35,f.y-f.r*.45,f.r*.3,f.r*.18,-.5,0,TAU);x.fill();
   if(on){glow(x,f.color,f.x,f.y,f.reach*2,1);glow(x,'#ffffff',f.x,f.y,f.r*5,.8);}}
 }
 function drawDynamic(x,w,t){
  for(const p of Object.values(w.parts)){
   if(p.kind==='drop'){const up=!p.down,[ax,ay]=p.a,[bx,by]=p.b;if(up){x.fillStyle='rgba(0,0,0,.4)';x.fillRect(ax+2,ay-1,bx-ax,9);const g=x.createLinearGradient(0,ay-6,0,ay+4);g.addColorStop(0,p.flash>0?'#fff':mixHex(art.drop||'#ff9f1c',.35));g.addColorStop(1,p.flash>0?'#fff':(art.drop||'#ff9f1c'));x.fillStyle=g;x.fillRect(ax,ay-6,bx-ax,10);x.fillStyle='#1a0d00';x.font='bold 8px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(p.label||'',(ax+bx)/2,ay-1);}else{x.fillStyle='#000';x.fillRect(ax,ay-1.5,bx-ax,3);}}
   else if(p.kind==='standup'){const [ax,ay]=p.a,[bx,by]=p.b,cx=(ax+bx)/2,cy=(ay+by)/2,vert=Math.abs(by-ay)>Math.abs(bx-ax),wv=vert?7:Math.abs(bx-ax),hv=vert?Math.abs(by-ay):7;x.fillStyle='rgba(0,0,0,.35)';x.fillRect(cx-wv/2+2,cy-hv/2+2,wv,hv);x.fillStyle=p.flash>0?'#fff':(p.color||'#4cc9f0');x.fillRect(cx-wv/2,cy-hv/2,wv,hv);x.fillStyle='rgba(255,255,255,.35)';x.fillRect(cx-wv/2,cy-hv/2,wv,1.5);x.strokeStyle='#0b1d2a';x.lineWidth=1;x.strokeRect(cx-wv/2,cy-hv/2,wv,hv);if(p.label){x.fillStyle='#04121a';x.font='bold 7px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(p.label,cx,cy);}}
   else if(p.kind==='spinner'){const [ax,ay]=p.a,[bx,by]=p.b,c=Math.abs(Math.cos(p.angle*Math.PI)),mx=(ax+bx)/2,my=(ay+by)/2;x.fillStyle='#000a';x.fillRect(ax,my-1,bx-ax,2);x.fillStyle=`rgb(${180+70*c|0},${185+70*c|0},${195+60*c|0})`;x.fillRect(ax+2,my-6*c-1,bx-ax-4,12*c+2);x.fillStyle='#ff2d55';x.font='bold 6px Arial';x.textAlign='center';x.textBaseline='middle';if(c>.5)x.fillText(p.label||'NUNCHUCK',mx,my);}
   else if(p.kind==='bumper'){const lit=p.flash>0,r=p.r*(lit?.92:1);if(lit)glow(x,'#ffe66d',p.x,p.y,p.r*4.4);
    art.bumperCap?art.bumperCap(x,p,r,lit,t,imgs):(x.fillStyle=lit?'#fff7c2':'#f4f1ea',x.beginPath(),x.arc(p.x,p.y,r*.8,0,TAU),x.fill());}
   else if(p.kind==='sling'){const fl=p.flash>0?4:0,[ax,ay]=p.a,[cx,cy]=p.c,mx=(ax+cx)/2,my=(ay+cy)/2,nx=-(cy-ay),ny=cx-ax,l=Math.hypot(nx,ny);x.strokeStyle='#0d0d0d';x.lineWidth=7;x.beginPath();x.moveTo(ax,ay);x.quadraticCurveTo(mx+nx/l*fl*2,my+ny/l*fl*2,cx,cy);x.stroke();x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=1.5;x.stroke();if(fl)glow(x,'#ffffff',mx,my,60,.5);}
   else if(p.kind==='gate'){const [ax,ay]=p.a,[bx,by]=p.b;x.strokeStyle=p.flash>0?'#fff':'#c8ccd4';x.lineWidth=1.6;x.setLineDash([3,2]);poly(x,[[ax,ay],[bx,by]]);x.stroke();x.setLineDash([]);}
   else if(p.kind==='magnet'&&p.on)glow(x,'#64d2ff',p.x,p.y,p.r*3*(1+.1*Math.sin(t*20)));
   else if(p.kind==='toy'){if(art.toy)art.toy(x,p,t,imgs);else{const toy=w.toys.find(q=>q.id===p.id);x.strokeStyle=p.flash>0?'#fff':'#9aa2b1';for(const s of toy.segs){x.lineWidth=s.r*2;poly(x,[[s.ax+toy.ox,s.ay+toy.oy],[s.bx+toy.ox,s.by+toy.oy]]);x.stroke();}}}
   else if(p.kind==='diverter'){const [ax,ay]=p.a,[bx,by]=p.b;
    if(ax===bx&&ay===by){// pop-up post: a rubber-ringed post when up, a flush cap when down
     if(p.on){glow(x,art.postGlow||'#ff2d2d',ax,ay,44,.6+.3*Math.sin(t*8));x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.arc(ax+2,ay+3,p.r||7,0,TAU);x.fill();x.fillStyle='#141414';x.beginPath();x.arc(ax,ay,p.r||7,0,TAU);x.fill();x.fillStyle=p.flash>0?'#fff':'#c8ccd4';x.beginPath();x.arc(ax,ay,(p.r||7)*.55,0,TAU);x.fill();}
     else{x.fillStyle='#2b2f38';x.beginPath();x.arc(ax,ay,(p.r||7)*.8,0,TAU);x.fill();x.strokeStyle='#5d6573';x.lineWidth=1;x.stroke();}}
    else if(p.on){x.strokeStyle='#d7dbe3';x.lineWidth=8;poly(x,[[ax,ay],[bx,by]]);x.stroke();}}
   else if(p.kind==='disc'){const a=(R.discA[p.id]=(R.discA[p.id]||0)+(p.spin||0)*Math.max(0,Math.min(.05,t-(R.discT[p.id]??t))));R.discT[p.id]=t;
    if(art.disc)art.disc(x,p,a,t,imgs);else{x.save();x.translate(p.x,p.y);x.rotate(a);x.fillStyle='#16101f';x.beginPath();x.arc(0,0,p.r,0,TAU);x.fill();x.strokeStyle='#8f6bd8';x.lineWidth=2;for(let i=0;i<6;i++){x.rotate(TAU/6);x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(p.r*.5,p.r*.2,p.r,0);x.stroke();}x.restore();}}
  }
  const pl=w.plunger;if(pl){const top=pl.y+pl.pull*pl.travel;x.fillStyle='#b8bec9';x.fillRect(pl.x0+6,top,pl.x1-pl.x0-12,7);x.fillStyle='#e9ecf1';x.fillRect(pl.x0+8,top+1,pl.x1-pl.x0-16,2);x.strokeStyle='#8b919c';x.lineWidth=1.4;const n=7,h=def.H-top-8;for(let i=0;i<n;i++){x.beginPath();x.moveTo(pl.x0+9,top+8+i*h/n);x.lineTo(pl.x1-9,top+8+(i+.5)*h/n);x.stroke();}}
 }
 // the colour of the brightest lit insert near a point (tints the ball's reflection)
 function nearTint(lamps,px,py){let best=null,bv=0;for(const l of def.lamps){const v=+lamps[l.id]||0;if(!v)continue;const d=Math.hypot(l.x-px,l.y-py);if(d<70&&v*(70-d)>bv){bv=v*(70-d);best=l.color;}}return best;}
 function drawBalls(x,w,onRail,lamps){
  if(!onRail)for(const b of w.captives){x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.ellipse(b.x+3,b.y+4,b.r*.95,b.r*.8,0,0,TAU);x.fill();chromeBall(x,b.x,b.y,b.r,true);}
  for(const b of w.balls){if((b.state==='rail')!==onRail||b.rail?.r.hidden)continue;const z=b.z||0,r=b.r*(1+z/260),[lx,ly]=onRail?lift([b.x,b.y,z]):[b.x,b.y];
   x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.ellipse(b.x+3+z*.25,b.y+4+z*.3,r*.95,r*.8,0,0,TAU);x.fill();
   const tint=nearTint(lamps,b.x,b.y);
   if(b.state==='held'&&!b.hold?.hole.magnet){x.save();x.globalAlpha=.75;chromeBall(x,lx,ly,r*.9,false,tint);x.restore();}else chromeBall(x,lx,ly,r,false,tint);}
 }

 // ---- camera
 // y = top of the view (mm), v = its speed, z = intro zoom (0 whole table → 1 width-locked), zo = speed zoom-out (0..~.15).
 const cam={y:def.H,v:0,z:0,zo:0,focus:null,svy:0,moving:false,speedZoom:false,introT:0};R.cam=cam;
 const flipY=Math.max(...def.flippers.map(f=>f.y));
 // The DMD sits centred in the backbox strip, or left-aligned when it would run under the floating Pause/Exit pills.
 R.layout=(W,H)=>{const portrait=H>=W,dh=Math.round(clamp(portrait?W/4.6:H*.15,42,portrait?H*.15:H*.18)),pillW=128;let dw=Math.min(W-12,dh*4),dx=(W-dw)/2;
  if(dx+dw>W-pillW){dw=Math.min(dw,W-pillW-12);dx=8;}return {stripH:Math.round(dw/4)+10,dmd:{x:dx,w:dw,h:dw/4}};};
 R.view=(W,H)=>{const {stripH}=R.layout(W,H),aH=H-stripH,lock=W/def.W*(1-cam.zo),fit=Math.min(W/def.W,aH/def.H)*.97,e=ease(clamp(cam.z,0,1)),s=lerp(fit,lock,e),vh=aH/s,
   yFit=(def.H-vh)/2,yLock=vh>=def.H?(def.H-vh)/2:clamp(cam.y,0,def.H-vh),y=lerp(yFit,yLock,e);return {s,ox:(W-def.W*s)/2,oy:stripH-y*s,top:stripH,aH,vh,y,lock:W/def.W};};
 // Where the ball will be: along its ramp/wireform for rails, at the far end of a VUK about to fire, else where it is.
 const railAhead=(b,sec)=>{const r=b.rail.r;return railAt(r,clamp(b.rail.s+b.rail.v*sec,0,r.len));};
 const urgency=b=>b.state==='rail'?railAhead(b,.5).y:b.y+Math.max(0,b.vy||0)*.4;
 // The camera is a critically damped spring (it eases in and out and never snaps) chasing a goal that only moves
 // when the ball leaves the comfortable middle of the view (dead zone). The goal leads the ball by its *smoothed*
 // velocity (bumper rattles don't shake it), runs ahead along ramps, gets to the flippers before a falling ball,
 // and in multiball follows the ball that will reach the flippers first (switching only for a clear winner).
 R.follow=(w,dt,W,H,snap=false)=>{
  const balls=w.balls;if(!balls.length)return;dt=Math.min(dt,.05);
  let best=null,bs=-1e9;for(const q of balls){const u=urgency(q);if(u>bs){bs=u;best=q;}}
  let b=balls.find(q=>q.id===cam.focus);if(!b||(best!==b&&bs>urgency(b)+90)){b=best;cam.focus=b.id;}
  // optional speed zoom: pull back a little while the ball is really flying, settle back in when it slows
  const sp=b.state==='free'?Math.hypot(b.vx,b.vy):b.state==='rail'?Math.abs(b.rail.v):0,tz=cam.speedZoom?clamp((sp-1800)/2600,0,1)*.15:0;
  cam.zo+=(tz-cam.zo)*(1-Math.exp(-dt*(tz>cam.zo?3:1.1)));
  const v=R.view(W,H),vh=v.vh;if(vh>=def.H){cam.y=(def.H-vh)/2;cam.v=0;return;}
  cam.svy+=((b.state==='free'?b.vy:0)-cam.svy)*(1-Math.exp(-dt/.22));
  let ty;
  if(b.state==='rail')ty=railAhead(b,.6).y;
  else if(b.state==='held'){ty=b.y;const h=b.hold?.hole,r=h?.toRail&&w.rails.find(q=>q.id===h.toRail);if(r&&b.hold.t<.5)ty=r.pts[r.pts.length-1][1];}
  else{const lead=cam.svy<0?-Math.min(vh*.35,cam.svy*cam.svy/(2*w.g)*.7):Math.min(vh*.25,cam.svy*.3);ty=b.y+lead;
   if(cam.svy>150&&b.y+cam.svy*.5>flipY-vh*.55)ty=Math.max(ty,flipY+30);}
  const maxY=def.H-vh;
  if(snap){cam.y=clamp(ty-vh*.55,0,maxY);cam.v=0;cam.moving=false;cam.goal=cam.y;return;}
  if(cam.goal==null)cam.goal=cam.y;
  if(ty<cam.y+vh*.28||ty>cam.y+vh*.68)cam.moving=true;
  if(cam.moving){cam.goal=ty-vh*.52;if(Math.abs(ty-(cam.y+vh*.52))<vh*.07&&Math.abs(cam.v)<250)cam.moving=false;}
  cam.goal=clamp(cam.goal,0,maxY);
  // urgent when the real ball is near (or past) an edge: a stiffer spring and more acceleration
  // tighter views (landscape, big tablets) need a quicker camera: stiffness/acceleration scale with how little shows
  const f=clamp(517/vh,1,1.5),rel=(b.y-cam.y)/vh,urgent=rel<.14||rel>.88,wn=(urgent?13:7.5)*Math.sqrt(f),amax=(urgent?14000:6000)*f;
  const a=clamp(wn*wn*(cam.goal-cam.y)-2*wn*cam.v,-amax,amax);cam.v=clamp(cam.v+a*dt,-4200*f,4200*f);cam.y+=cam.v*dt;
  // the one hard rule: a ball heading for the flippers never drops out of the bottom of the view
  if(b.state==='free'&&b.y>cam.y+vh*.94){cam.y=b.y-vh*.94;cam.v=Math.max(cam.v,b.vy);}
  if(cam.y<0||cam.y>maxY){cam.y=clamp(cam.y,0,maxY);cam.v=0;}};

 // gi: general illumination 0..1; flashers: m.flashers; backglass: 0..1 opacity of the intro backglass card.
 R.draw=(x,{W,H,dpr,w,lamps,t,dmd,strip,gi=1,flashers=null,flashT=t,backglass=0})=>{
  const v=R.view(W,H);R.ensure(v.lock*dpr);
  x.setTransform(dpr,0,0,dpr,0,0);x.fillStyle='#07060a';x.fillRect(0,0,W,H);
  x.save();x.beginPath();x.rect(0,v.top,W,v.aH);x.clip();
  x.translate(v.ox,v.oy);x.scale(v.s,v.s);x.lineCap='round';x.lineJoin='round';
  x.drawImage(R.cache.base,0,0,def.W,def.H);
  drawLights(x,lamps,gi);
  drawDynamic(x,w,t);
  // a flipper picture (e.g. a hand) may be wider than the flipper, so it goes under the balls; painted flippers go over
  const flipImg=f=>f.y===flipY&&imgs[f.input?'flipper-right':'flipper-left'];
  for(const f of w.flippers){const img=flipImg(f);if(img)drawFlipperImage(x,f,img,!!f.input);}
  drawBalls(x,w,false,lamps);
  for(const f of w.flippers)if(!flipImg(f))drawFlipper(x,f,f.color||art.flipper,art.flipperRubber,art.flipperText||'');
  x.drawImage(R.cache.over,0,0,def.W,def.H);
  if(gi<.98){x.fillStyle=`rgba(0,0,8,${(1-gi)*.4})`;x.fillRect(0,0,def.W,def.H);}
  drawFlashers(x,flashers,flashT);
  drawBalls(x,w,true,lamps);
  art.overlay?.(x,def,w,t);
  x.restore();
  // a ball outside the view gets an arrow at that edge (the camera eases after it instead of snapping)
  for(const b of w.balls){const by=b.state==='rail'?lift([b.x,b.y,b.z||0])[1]:b.y,sy=v.oy+by*v.s,sx=clamp(v.ox+b.x*v.s,12,W-12),up=sy<v.top-2,down=sy>H+2;if(!up&&!down)continue;
   const ay=up?v.top+14:H-14,d=up?-1:1,pulse=.7+.3*Math.sin(t*14);x.save();x.globalAlpha=pulse;x.fillStyle='#fff';x.strokeStyle='rgba(0,0,0,.6)';x.lineWidth=2;
   x.beginPath();x.moveTo(sx,ay+d*9);x.lineTo(sx-9,ay-d*5);x.lineTo(sx+9,ay-d*5);x.closePath();x.stroke();x.fill();x.restore();}
  if(backglass>0){x.save();x.globalAlpha=backglass;x.beginPath();x.rect(0,v.top,W,v.aH);x.clip();R.drawBackglass(x,0,v.top,W,v.aH,t);x.restore();}
  // Backbox strip: DMD in the middle, backglass art either side.
  const L=R.layout(W,H),dw=L.dmd.w,dh=L.dmd.h,dx=L.dmd.x,dy=(L.stripH-dh)/2;
  x.fillStyle='#000';x.fillRect(0,0,W,L.stripH);art.backbox?.(x,W,L.stripH,dx,dw,t,imgs);
  x.fillStyle='#120804';x.fillRect(dx-3,dy-3,dw+6,dh+6);dmd.paint(x,dx,dy,dw,dh);
  strip?.(x,v,L);
  return v;
 };
 // The backglass: the owner's picture if there is one, else the table's painted card.
 R.drawBackglass=(x,bx,by,bw,bh,t)=>{x.fillStyle='#000';x.fillRect(bx,by,bw,bh);
  if(imgs.backglass){const img=imgs.backglass,s=Math.min(bw/img.width,bh/img.height),w=img.width*s,h=img.height*s;x.drawImage(img,bx+(bw-w)/2,by+(bh-h)/2,w,h);}
  else art.backglass?.(x,bx,by,bw,bh,t,imgs);};
 R.toScreen=(v,px,py)=>[v.ox+px*v.s,v.oy+py*v.s];
 return R;
}
Object.assign(exports,{createRenderer,chromeBall,drawFlipper});
