// Microgame Rush: shared drawing / geometry helpers. DOM-free so microgames can be unit-tested in Node.
// Microgame contract (see rushGames*.js): {id,verb,theme,kind,source,caption,duration,bg,boss?,timeout?,
//  init(r,rng,speed,player,boss)->st, update(st,dt), draw(x,st,r), down/move/up(st,p,id), hint(st)->descriptor}
// The engine adds to st: g,player,r,rng,speed,boss,t,result,at. Games set st.result='win'|'lose'.
// Games must not use st.rng inside update (both halves must see the identical round): pre-roll in init.
const {clamp}=require("src/utils.js");
const TAU=Math.PI*2;
const COL={ink:'#1b1530',white:'#ffffff',cream:'#fff3d1',yellow:'#ffd93d',orange:'#ff9a3c',red:'#f0443a',pink:'#ff7eb6',purple:'#8f5cf5',blue:'#2f9bff',sky:'#7fd8ff',teal:'#27d3c3',green:'#39d97b',lime:'#b9e83c',brown:'#a8683a',tan:'#e9b97a',grey:'#9aa3b5',dark:'#2a2347',navy:'#1d2b6b'};
const ink=COL.ink;
// The engine installs real implementations; Node tests keep the no-ops.
const hooks={head(x,p,cx,cy,size,mood){},sfx(name){}};
const head=(x,p,cx,cy,size,mood)=>hooks.head(x,p,cx,cy,size,mood);
const sfx=name=>hooks.sfx(name);
function paint(x,fill,lw=4){if(fill){x.fillStyle=fill;x.fill();}if(lw){x.lineWidth=lw;x.strokeStyle=ink;x.lineJoin='round';x.lineCap='round';x.stroke();}}
function circ(x,cx,cy,r,fill,lw=4){x.beginPath();x.arc(cx,cy,Math.max(.1,r),0,TAU);paint(x,fill,lw);}
function ell(x,cx,cy,rx,ry,fill,lw=4,rot=0){x.beginPath();x.ellipse(cx,cy,Math.max(.1,rx),Math.max(.1,ry),rot,0,TAU);paint(x,fill,lw);}
function rrect(x,px,py,w,h,r,fill,lw=4){r=Math.max(0,Math.min(r,Math.abs(w)/2,Math.abs(h)/2));x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();paint(x,fill,lw);}
const boxC=(x,cx,cy,w,h,r,fill,lw)=>rrect(x,cx-w/2,cy-h/2,w,h,r,fill,lw);
function poly(x,pts,fill,lw=4){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();paint(x,fill,lw);}
function path(x,pts,color,w){x.lineJoin=x.lineCap='round';x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.strokeStyle=ink;x.lineWidth=w+6;x.stroke();x.strokeStyle=color;x.lineWidth=w;x.stroke();}
function star(x,cx,cy,r1,r2,n,rot,fill,lw=4){x.beginPath();for(let i=0;i<n*2;i++){const r=i%2?r2:r1,a=rot+i*Math.PI/n-Math.PI/2;x[i?'lineTo':'moveTo'](cx+Math.cos(a)*r,cy+Math.sin(a)*r);}x.closePath();paint(x,fill,lw);}
function rays(x,cx,cy,r,n,rot,color){x.fillStyle=color;for(let i=0;i<n;i+=1){const a=rot+i*TAU/n,b=a+TAU/n/2;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.lineTo(cx+Math.cos(b)*r,cy+Math.sin(b)*r);x.closePath();x.fill();}}
function txt(x,str,cx,cy,size,fill=COL.white,o={}){x.save();x.translate(cx,cy);if(o.rot)x.rotate(o.rot);if(o.scale)x.scale(o.scale,o.scale);x.font=`900 ${Math.round(size)}px "Arial Black",Impact,Arial,sans-serif`;x.textAlign=o.align||'center';x.textBaseline='middle';x.lineJoin='round';const lw=o.lw??Math.max(3,size*.2);if(lw){x.lineWidth=lw;x.strokeStyle=o.stroke||ink;x.strokeText(str,0,0);}x.fillStyle=fill;x.fillText(str,0,0);x.restore();}
// Cap with a letter badge sitting on top of a head drawn at (cx,cy,size).
function cap(x,cx,cy,size,color=COL.red,letter=''){const ty=cy-size*.33;x.beginPath();x.ellipse(cx,ty,size*.34,size*.22,0,Math.PI,TAU);x.closePath();paint(x,color,3);rrect(x,cx-size*.06,ty-size*.03,size*.5,size*.09,size*.045,color,3);if(letter){circ(x,cx,ty-size*.1,size*.1,COL.white,2);txt(x,letter,cx,ty-size*.09,size*.13,COL.red,{lw:0});}}
function band(x,cx,cy,size,color=COL.red){rrect(x,cx-size*.32,cy-size*.3,size*.64,size*.09,size*.04,color,3);}
const lerp=(a,b,t)=>a+(b-a)*t;
const ramp=(speed,a,b)=>a+(b-a)*clamp((speed-1)/.6,0,1.2);
const easeOutBack=t=>{t=clamp(t,0,1);const c=1.9;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
// Does segment a-b touch circle c,r?
function segCirc(ax,ay,bx,by,cx,cy,r){const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;let t=l2?((cx-ax)*dx+(cy-ay)*dy)/l2:0;t=clamp(t,0,1);return dist(ax+dx*t,ay+dy*t,cx,cy)<=r;}
const inRect=(p,px,py,w,h)=>p.x>=px&&p.x<=px+w&&p.y>=py&&p.y<=py+h;
// Wobble used for idle cartoon motion.
const wob=(t,f=6,a=1)=>Math.sin(t*f)*a;
// Soft flat background with a sunburst and dots.
function backdrop(x,r,color,t=0,accent){x.fillStyle=color;x.fillRect(0,0,r.w,r.h);if(accent!==false){x.save();x.globalAlpha=.13;rays(x,r.w/2,r.h*.55,Math.hypot(r.w,r.h),14,t*.15,accent||'#fff');x.restore();}}
function ground(x,r,y,color,top){x.fillStyle=color;x.fillRect(-4,y,r.w+8,r.h-y+4);x.fillStyle=top||ink;x.fillRect(-4,y,r.w+8,4);}
// Hint overlay: kind tap|drag|swipe|hold|circle at local coordinates.
function drawHint(x,h,p){if(!h)return;const k=(p*3)%1,a=Math.sin(p*Math.PI),size=h.size||26;x.save();x.globalAlpha=clamp(a*1.6,0,1);
 if(h.kind==='tap'||h.kind==='hold'){const rr=size*(.4+k*1.1);x.lineWidth=5;x.strokeStyle=COL.white;x.beginPath();x.arc(h.x,h.y,rr,0,TAU);x.stroke();circ(x,h.x,h.y,size*.28,COL.yellow,4);if(h.kind==='tap')arrow(x,h.x,h.y-size*1.3-Math.abs(Math.sin(p*18))*6,Math.PI/2,size);}
 else if(h.kind==='circle'){x.lineWidth=7;x.strokeStyle=COL.white;x.beginPath();x.arc(h.x,h.y,size*1.2,-1,3.6);x.stroke();const ea=3.6;arrowHead(x,h.x+Math.cos(ea)*size*1.2,h.y+Math.sin(ea)*size*1.2,ea+Math.PI/2,size*.6);}
 else{const t=(p*2)%1,ex=h.x2??h.x,ey=h.y2??h.y,px=lerp(h.x,ex,t),py=lerp(h.y,ey,t);x.setLineDash([10,9]);x.lineWidth=6;x.strokeStyle=COL.white;x.beginPath();x.moveTo(h.x,h.y);x.lineTo(ex,ey);x.stroke();x.setLineDash([]);arrowHead(x,ex,ey,Math.atan2(ey-h.y,ex-h.x),size*.7);circ(x,px,py,size*.3,COL.yellow,4);}
 x.restore();}
function arrowHead(x,px,py,ang,s){x.save();x.translate(px,py);x.rotate(ang);poly(x,[[s*.5,0],[-s*.4,-s*.5],[-s*.4,s*.5]],COL.white,3);x.restore();}
function arrow(x,px,py,ang,s){x.save();x.translate(px,py);x.rotate(ang+Math.PI);poly(x,[[0,0],[-s*.4,-s*.4],[-s*.15,-s*.4],[-s*.15,-s*.9],[s*.15,-s*.9],[s*.15,-s*.4],[s*.4,-s*.4]],COL.white,3);x.restore();}
Object.assign(exports,{COL,TAU,hooks,head,sfx,paint,circ,ell,rrect,boxC,poly,path,star,rays,txt,cap,lerp,ramp,easeOutBack,easeOut,dist,segCirc,band,inRect,wob,backdrop,ground,drawHint,arrow,arrowHead,clamp});
