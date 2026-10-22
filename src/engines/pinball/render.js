// Pinball renderer + camera. The playfield is drawn once into two cached layers (base under the balls, "over" =
// ramps, wireforms and the apron above them) at the play scale; each frame adds lamps, moving parts, flippers and
// balls. Camera: the table width always fills the screen width (Game Boy Pokemon Pinball style) and the view pans up
// and down with the ball; when the whole height fits it stays put. The intro starts on the whole table, then zooms in.
const {railAt}=require("src/engines/pinball/physics.js");
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;
const TAU=Math.PI*2;

function hexA(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function lampPath(x,l,grow=0){const r=l.r+grow;x.beginPath();
 if(l.shape==='arrow'){x.save();x.translate(l.x,l.y);x.rotate((l.angle||0)*Math.PI/180);x.moveTo(0,-r*1.25);x.lineTo(r,r*.7);x.lineTo(0,r*.25);x.lineTo(-r,r*.7);x.closePath();x.restore();}
 else if(l.shape==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;x.lineTo(l.x+Math.cos(a)*rr,l.y+Math.sin(a)*rr);}x.closePath();}
 else if(l.shape==='rect'){x.rect(l.x-(l.w||r*2)/2,l.y-(l.h||r)/2,l.w||r*2,l.h||r);}
 else x.arc(l.x,l.y,r,0,TAU);}
// Offset polyline (for ramp edges): returns left/right edge points at distance d.
function offsets(pts,d){const L=[],Rt=[];for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;L.push([pts[i][0]-ty*d,pts[i][1]+tx*d,pts[i][2]||0]);Rt.push([pts[i][0]+ty*d,pts[i][1]-tx*d,pts[i][2]||0]);}return [L,Rt];}
const lift=(p,k=.22)=>[p[0]-(p[2]||0)*k*.35,p[1]-(p[2]||0)*k];   // raised parts drawn slightly up-screen for depth
function poly(x,pts,close=false){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));if(close)x.closePath();}

function chromeBall(x,cx,cy,r,gold=false){
 const g=x.createRadialGradient(cx-r*.35,cy-r*.45,r*.1,cx,cy,r);
 if(gold){g.addColorStop(0,'#fffbe6');g.addColorStop(.25,'#ffd966');g.addColorStop(.6,'#b8860b');g.addColorStop(.85,'#5c3d05');g.addColorStop(1,'#2a1c02');}
 else{g.addColorStop(0,'#ffffff');g.addColorStop(.25,'#d9dde6');g.addColorStop(.6,'#7c8597');g.addColorStop(.85,'#3a404c');g.addColorStop(1,'#1b1e25');}
 x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,TAU);x.fill();
 x.fillStyle='rgba(20,22,30,.35)';x.beginPath();x.ellipse(cx,cy+r*.35,r*.85,r*.32,0,0,TAU);x.fill();
 x.fillStyle='rgba(255,255,255,.85)';x.beginPath();x.ellipse(cx-r*.38,cy-r*.42,r*.22,r*.14,-.6,0,TAU);x.fill();
}
function drawFlipper(x,f,color='#f4f1ea',rubber='#d7263d'){
 x.save();x.translate(f.x,f.y);x.rotate(f.a);
 x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.arc(3,4,f.r0,Math.PI/2,Math.PI*1.5);x.lineTo(f.len+3,4-f.r1);x.arc(f.len+3,4,f.r1,-Math.PI/2,Math.PI/2);x.closePath();x.fill();
 x.beginPath();x.arc(0,0,f.r0,Math.PI/2,Math.PI*1.5);x.lineTo(f.len,-f.r1);x.arc(f.len,0,f.r1,-Math.PI/2,Math.PI/2);x.closePath();
 const g=x.createLinearGradient(0,-f.r0,0,f.r0);g.addColorStop(0,'#ffffff');g.addColorStop(.5,color);g.addColorStop(1,'#a9a49a');x.fillStyle=g;x.fill();
 x.lineWidth=3.2;x.strokeStyle=rubber;x.stroke();
 x.fillStyle='#8d939e';x.beginPath();x.arc(0,0,4,0,TAU);x.fill();x.fillStyle='#e6e9ef';x.beginPath();x.arc(-.8,-.8,1.8,0,TAU);x.fill();
 x.restore();
}

function createRenderer(table){
 const def=table.def||table,art=table.art||{},R={def,cache:null,glow:new Map()};
 const glowSprite=color=>{if(R.glow.has(color))return R.glow.get(color);const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,hexA(color,.9));g.addColorStop(.35,hexA(color,.45));g.addColorStop(1,hexA(color,0));x.fillStyle=g;x.fillRect(0,0,64,64);R.glow.set(color,c);return c;};
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
 function drawBase(x){
  art.base?.(x,def);
  // Shooter lane.
  const pl=def.plunger;if(pl){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(pl.x0,300,pl.x1-pl.x0,def.H-300);}
  // Unlit inserts.
  for(const l of def.lamps){lampPath(x,l);x.fillStyle=hexA(l.color,.22);x.fill();x.lineWidth=1;x.strokeStyle=hexA(l.color,.55);x.stroke();
   if(l.label&&l.r>=8){x.fillStyle='rgba(255,255,255,.55)';x.font=`bold ${l.label.length>3?5:Math.min(9,l.r*.9)}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(l.label,l.x,l.y+(l.label.length>3?l.r+6:0));}}
  // Magnet coils (seen through a clear insert).
  for(const mg of def.magnets){x.save();x.globalAlpha=.55;for(let i=4;i>=1;i--){x.strokeStyle=i%2?'#b87333':'#6b3f1d';x.lineWidth=3;x.beginPath();x.arc(mg.x,mg.y,mg.r*i/4.6,0,TAU);x.stroke();}x.fillStyle='#2b2f38';x.beginPath();x.arc(mg.x,mg.y,5,0,TAU);x.fill();x.restore();}
  for(const h of def.holes){if(h.toRail){x.fillStyle='rgba(255,210,63,.35)';x.beginPath();x.moveTo(h.x,h.y-h.r-14);x.lineTo(h.x-8,h.y-h.r-4);x.lineTo(h.x+8,h.y-h.r-4);x.fill();}
   x.fillStyle='#000';x.beginPath();x.arc(h.x,h.y,h.r+1,0,TAU);x.fill();const g=x.createRadialGradient(h.x,h.y-3,1,h.x,h.y,h.r+3);g.addColorStop(0,'#000');g.addColorStop(.8,'#111');g.addColorStop(1,'#9aa2b1');x.strokeStyle=g;x.lineWidth=3;x.stroke();
   if(def.parts[h.id]?.label){x.fillStyle='rgba(255,255,255,.7)';x.font='bold 6px Arial';x.textAlign='center';x.fillText(def.parts[h.id].label,h.x,h.y-h.r-6);}}
  for(const s of def.sensors.filter(s=>s.kind==='rollover'||s.kind==='kickback')){x.strokeStyle='rgba(220,225,235,.7)';x.lineWidth=1.4;x.beginPath();x.moveTo(s.x,s.y-8);x.lineTo(s.x,s.y+8);x.stroke();x.beginPath();x.ellipse(s.x,s.y,3,9,0,0,TAU);x.stroke();}
  // Bumper bodies, sling plastics.
  for(const p of Object.values(def.parts)){
   if(p.kind==='bumper'){x.fillStyle='rgba(0,0,0,.45)';x.beginPath();x.arc(p.x+3,p.y+4,p.r+4,0,TAU);x.fill();x.fillStyle='#d7dbe3';x.beginPath();x.arc(p.x,p.y,p.r+3,0,TAU);x.fill();x.fillStyle='#2b2f38';x.beginPath();x.arc(p.x,p.y,p.r,0,TAU);x.fill();}
   if(p.kind==='sling'){x.fillStyle=art.sling||'#e63946';poly(x,[p.a,p.b,p.c],true);x.fill();x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=1.5;x.stroke();art.slingArt?.(x,p);}
  }
  drawWalls(x);
 }
 function drawOver(x){
  for(const r of def.rails){
   const pts=r.pts,[L,Rt]=offsets(pts,r.width/2-6);
   // shadow
   x.save();x.globalAlpha=.3;x.strokeStyle='#000';x.lineWidth=r.look==='plastic'?r.width:16;poly(x,pts.map(p=>[p[0]+(p[2]||0)*.25+3,p[1]+(p[2]||0)*.3+4]));x.stroke();x.restore();
   if(r.look==='plastic'){const col=table.def?.parts?.[r.id]?.color||'#e63946';const Ls=L.map(p=>lift(p)),Rs=Rt.map(p=>lift(p));
    x.fillStyle=hexA(col,.28);poly(x,[...Ls,...Rs.slice().reverse()],true);x.fill();
    x.strokeStyle=hexA(col,.9);x.lineWidth=3;poly(x,Ls);x.stroke();poly(x,Rs);x.stroke();
    x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=1;poly(x,Ls.map(p=>[p[0]-1,p[1]-1]));x.stroke();
    for(let i=0;i<pts.length;i+=6){x.strokeStyle=hexA(col,.35);x.lineWidth=1;poly(x,[Ls[i],Rs[i]]);x.stroke();}}
   else{const [L2,R2]=offsets(pts,11),Ls=L2.map(p=>lift(p)),Rs=R2.map(p=>lift(p));
    for(let i=0;i<pts.length;i+=4){x.strokeStyle='#5d6573';x.lineWidth=2;poly(x,[Ls[i],Rs[i]]);x.stroke();}
    for(const e of [Ls,Rs]){x.strokeStyle='#596170';x.lineWidth=3.2;poly(x,e);x.stroke();x.strokeStyle='#f3f6fb';x.lineWidth=1.3;poly(x,e.map(p=>[p[0]-.6,p[1]-.6]));x.stroke();}}
  }
  art.over?.(x,def);
 }
 R.ensure=k=>{k=Math.min(k,Math.sqrt(14e6/(def.W*def.H)));if(R.cache&&Math.abs(R.cache.k-k)<.02)return;R.cache={k,base:layer(k,drawBase),over:layer(k,drawOver)};};

 // ---- per frame
 function drawDynamic(x,w,lamps,t){
  // lamps
  for(const l of def.lamps){const v=lamps[l.id];if(!v)continue;lampPath(x,l);x.fillStyle=hexA(l.color,.95);x.fill();x.fillStyle='rgba(255,255,255,.45)';lampPath(x,l,-l.r*.45);x.fill();
   const g=glowSprite(l.color),s=l.r*5.2;x.save();x.globalCompositeOperation='lighter';x.drawImage(g,l.x-s/2,l.y-s/2,s,s);x.restore();}
  for(const p of Object.values(w.parts)){
   if(p.kind==='drop'){const up=!p.down,[ax,ay]=p.a,[bx,by]=p.b;if(up){x.fillStyle='rgba(0,0,0,.4)';x.fillRect(ax+2,ay-1,bx-ax,9);x.fillStyle=p.flash>0?'#fff':(art.drop||'#ff9f1c');x.fillRect(ax,ay-6,bx-ax,10);x.fillStyle='#1a0d00';x.font='bold 8px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(p.label||'',(ax+bx)/2,ay-1);}else{x.fillStyle='#000';x.fillRect(ax,ay-1.5,bx-ax,3);}}
   else if(p.kind==='standup'){const [ax,ay]=p.a,[bx,by]=p.b,cx=(ax+bx)/2,cy=(ay+by)/2,vert=Math.abs(by-ay)>Math.abs(bx-ax),wv=vert?7:Math.abs(bx-ax),hv=vert?Math.abs(by-ay):7;x.fillStyle=p.flash>0?'#fff':(p.color||'#4cc9f0');x.fillRect(cx-wv/2,cy-hv/2,wv,hv);x.strokeStyle='#0b1d2a';x.lineWidth=1;x.strokeRect(cx-wv/2,cy-hv/2,wv,hv);if(p.label){x.fillStyle='#04121a';x.font='bold 7px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(p.label,cx,cy);}}
   else if(p.kind==='spinner'){const [ax,ay]=p.a,[bx,by]=p.b,c=Math.abs(Math.cos(p.angle*Math.PI)),mx=(ax+bx)/2,my=(ay+by)/2;x.fillStyle='#000a';x.fillRect(ax,my-1,bx-ax,2);x.fillStyle=`rgb(${180+70*c|0},${185+70*c|0},${195+60*c|0})`;x.fillRect(ax+2,my-6*c-1,bx-ax-4,12*c+2);x.fillStyle='#ff2d55';x.font='bold 6px Arial';x.textAlign='center';x.textBaseline='middle';if(c>.5)x.fillText('NUNCHUCK',mx,my);}
   else if(p.kind==='bumper'){const lit=p.flash>0,r=p.r*(lit?.92:1);if(lit){const g=glowSprite('#ffe66d');x.save();x.globalCompositeOperation='lighter';x.drawImage(g,p.x-p.r*2.2,p.y-p.r*2.2,p.r*4.4,p.r*4.4);x.restore();}
    art.bumperCap?art.bumperCap(x,p,r,lit,t):(x.fillStyle=lit?'#fff7c2':'#f4f1ea',x.beginPath(),x.arc(p.x,p.y,r*.8,0,TAU),x.fill());}
   else if(p.kind==='sling'){const fl=p.flash>0?4:0,[ax,ay]=p.a,[cx,cy]=p.c,mx=(ax+cx)/2,my=(ay+cy)/2,nx=-(cy-ay),ny=cx-ax,l=Math.hypot(nx,ny);x.strokeStyle='#0d0d0d';x.lineWidth=7;x.beginPath();x.moveTo(ax,ay);x.quadraticCurveTo(mx+nx/l*fl*2,my+ny/l*fl*2,cx,cy);x.stroke();x.strokeStyle='rgba(255,255,255,.25)';x.lineWidth=1.5;x.stroke();}
   else if(p.kind==='gate'){const [ax,ay]=p.a,[bx,by]=p.b;x.strokeStyle=p.flash>0?'#fff':'#c8ccd4';x.lineWidth=1.6;x.setLineDash([3,2]);poly(x,[[ax,ay],[bx,by]]);x.stroke();x.setLineDash([]);}
   else if(p.kind==='magnet'&&p.on){const g=glowSprite('#64d2ff'),s=p.r*3*(1+.1*Math.sin(t*20));x.save();x.globalCompositeOperation='lighter';x.drawImage(g,p.x-s/2,p.y-s/2,s,s);x.restore();}
   else if(p.kind==='toy'){if(art.toy)art.toy(x,p,t);else{const toy=w.toys.find(q=>q.id===p.id);x.strokeStyle=p.flash>0?'#fff':'#9aa2b1';for(const s of toy.segs){x.lineWidth=s.r*2;poly(x,[[s.ax+toy.ox,s.ay+toy.oy],[s.bx+toy.ox,s.by+toy.oy]]);x.stroke();}}}
   else if(p.kind==='diverter'&&p.on){const [ax,ay]=p.a,[bx,by]=p.b;x.strokeStyle='#d7dbe3';x.lineWidth=8;poly(x,[[ax,ay],[bx,by]]);x.stroke();}
  }
  // plunger
  const pl=w.plunger;if(pl){const top=pl.y+pl.pull*pl.travel;x.fillStyle='#b8bec9';x.fillRect(pl.x0+6,top,pl.x1-pl.x0-12,7);x.fillStyle='#e9ecf1';x.fillRect(pl.x0+8,top+1,pl.x1-pl.x0-16,2);x.strokeStyle='#8b919c';x.lineWidth=1.4;const n=7,h=def.H-top-8;for(let i=0;i<n;i++){x.beginPath();x.moveTo(pl.x0+9,top+8+i*h/n);x.lineTo(pl.x1-9,top+8+(i+.5)*h/n);x.stroke();}}
 }
 function drawBalls(x,w,onRail){
  if(!onRail)for(const b of w.captives){x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.ellipse(b.x+3,b.y+4,b.r*.95,b.r*.8,0,0,TAU);x.fill();chromeBall(x,b.x,b.y,b.r,true);}
  for(const b of w.balls){if((b.state==='rail')!==onRail)continue;const z=b.z||0,r=b.r*(1+z/260),[lx,ly]=onRail?lift([b.x,b.y,z]):[b.x,b.y];
   x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.ellipse(b.x+3+z*.25,b.y+4+z*.3,r*.95,r*.8,0,0,TAU);x.fill();
   if(b.state==='held'&&!b.hold?.hole.magnet){x.save();x.globalAlpha=.75;chromeBall(x,lx,ly,r*.9);x.restore();}else chromeBall(x,lx,ly,r);}
 }

 // ---- camera
 const cam={y:def.H,z:0,introT:0};R.cam=cam;
 // The DMD sits centred in the backbox strip, or left-aligned when it would run under the floating Pause/Exit pills.
 R.layout=(W,H)=>{const portrait=H>=W,dh=Math.round(clamp(portrait?W/4.6:H*.15,42,portrait?H*.15:H*.18)),pillW=128;let dw=Math.min(W-12,dh*4),dx=(W-dw)/2;
  if(dx+dw>W-pillW){dw=Math.min(dw,W-pillW-12);dx=8;}return {stripH:Math.round(dw/4)+10,dmd:{x:dx,w:dw,h:dw/4}};};
 R.view=(W,H)=>{const {stripH}=R.layout(W,H),aH=H-stripH,lock=W/def.W,fit=Math.min(W/def.W,aH/def.H)*.97,e=ease(clamp(cam.z,0,1)),s=lerp(fit,lock,e),vh=aH/s,
   yFit=(def.H-vh)/2,yLock=vh>=def.H?(def.H-vh)/2:clamp(cam.y,0,def.H-vh),y=lerp(yFit,yLock,e);return {s,ox:(W-def.W*s)/2,oy:stripH-y*s,top:stripH,aH,vh,y,lock};};
 // Follow the most urgent ball (lowest on the table); lead it when it is shooting up the table.
 R.follow=(w,dt,W,H,snap=false)=>{const {stripH}=R.layout(W,H),vh=(H-stripH)/(W/def.W);if(vh>=def.H){cam.y=(def.H-vh)/2;return;}
  let b=null;for(const q of w.balls)if(!b||q.y>b.y)b=q;if(!b)return;const vy=b.state==='rail'?0:b.vy,lead=vy<0?Math.max(-vh*.32,vy*.14):Math.min(vh*.12,vy*.05);
  const target=clamp(b.y+lead-vh*.56,0,def.H-vh);cam.y=snap?target:cam.y+(target-cam.y)*(1-Math.exp(-dt*7));
  const margin=Math.min(70,vh*.18);if(b.y<cam.y+margin)cam.y=b.y-margin;if(b.y>cam.y+vh-margin)cam.y=b.y-vh+margin;cam.y=clamp(cam.y,0,def.H-vh);};

 R.draw=(x,{W,H,dpr,w,lamps,t,dmd,strip})=>{
  const v=R.view(W,H);R.ensure(v.lock*dpr);
  x.setTransform(dpr,0,0,dpr,0,0);x.fillStyle='#07060a';x.fillRect(0,0,W,H);
  x.save();x.beginPath();x.rect(0,v.top,W,v.aH);x.clip();
  x.translate(v.ox,v.oy);x.scale(v.s,v.s);x.lineCap='round';x.lineJoin='round';
  x.drawImage(R.cache.base,0,0,def.W,def.H);
  drawDynamic(x,w,lamps,t);
  drawBalls(x,w,false);
  for(const f of w.flippers)drawFlipper(x,f,f.color||art.flipper,art.flipperRubber);
  x.drawImage(R.cache.over,0,0,def.W,def.H);
  drawBalls(x,w,true);
  art.overlay?.(x,def,w,t);
  x.restore();
  // Backbox strip: DMD in the middle, backglass art either side.
  const L=R.layout(W,H),dw=L.dmd.w,dh=L.dmd.h,dx=L.dmd.x,dy=(L.stripH-dh)/2;
  x.fillStyle='#000';x.fillRect(0,0,W,L.stripH);art.backbox?.(x,W,L.stripH,dx,dw,t);
  x.fillStyle='#120804';x.fillRect(dx-3,dy-3,dw+6,dh+6);dmd.paint(x,dx,dy,dw,dh);
  strip?.(x,v,L);
  return v;
 };
 R.toScreen=(v,px,py)=>[v.ox+px*v.s,v.oy+py*v.s];
 return R;
}
Object.assign(exports,{createRenderer,chromeBall,drawFlipper});
