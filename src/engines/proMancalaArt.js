// Tony Hawk's Pro Mancala: drawing. The board is a real 7-ply skateboard deck with the pits routed into it (the colored
// plies show as rings in every bowl), glass gems for stones, a sunny skatepark around it with a halfpipe for each
// player, big-head skaters wearing the players' faces, and the THPS2-style chunky italic text.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const FONT='Impact,Haettenschweiler,"Arial Narrow Bold","Roboto Condensed","Arial Black",sans-serif';
const font=(px,w=900)=>`${w} ${Math.round(px)}px ${FONT}`;
function hexRGB(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return [n>>16&255,n>>8&255,n&255];}
function shade(h,k){const [r,g,b]=hexRGB(h),t=k<0?0:255,p=Math.abs(k);return `rgb(${Math.round(r+(t-r)*p)},${Math.round(g+(t-g)*p)},${Math.round(b+(t-b)*p)})`;}
function rnd(seed){let n=seed>>>0||1;return()=>{n=Math.imul(n^n>>>15,1|n)+0x6D2B79F5|0;n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};}
function canvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
function ell(g,cx,cy,rx,ry){g.beginPath();g.ellipse(cx,cy,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);}

// ------------------------------------------------------------------ THPS text: heavy condensed italic, black outline, drop
function thps(g,str,x,y,px,{fill='#fff',stroke='#000',align='center',base='middle',cond=.84,rot=0,alpha=1,maxW=0,grad=null,lw=.2,skew=-.16,glow=null,scale=1}={}){
 if(!str||alpha<=0)return 0;g.save();g.globalAlpha*=clamp(alpha,0,1);g.font=font(px);g.textAlign=align;g.textBaseline=base;g.lineJoin='round';g.miterLimit=2;
 let w=g.measureText(str).width*cond,k=scale;if(maxW&&w*k>maxW)k*=maxW/(w*k);
 g.translate(x,y);if(rot)g.rotate(rot);g.transform(cond*k,0,skew*k,k,0,0);
 if(glow){g.shadowColor=glow;g.shadowBlur=px*.5;}
 g.strokeStyle=stroke;g.lineWidth=px*lw;g.strokeText(str,px*.05,px*.07);g.strokeText(str,0,0);g.shadowBlur=0;
 if(grad){const lg=g.createLinearGradient(0,-px*.45,0,px*.45);grad.forEach((c,i)=>lg.addColorStop(i/(grad.length-1),c));g.fillStyle=lg;}else g.fillStyle=fill;
 g.fillText(str,0,0);g.restore();return w*k;}

// ------------------------------------------------------------------ glass gems (flat marbles), cached per color and size
const GEM_COLORS=['#1f5fff','#12a84b','#e3203b','#ffb21a','#9b3cf0','#12c6d6','#ff4fa8','#dfe9f2'];
const gemCache=new Map();
function gemSprite(col,r,dpr){const key=col+'|'+r.toFixed(1)+'|'+dpr;let c=gemCache.get(key);if(c)return c;
 const pad=r*.7,size=(r*2+pad*2)*dpr;c=canvas(size,size);const g=c.getContext('2d');g.scale(dpr,dpr);const o=r+pad;
 // contact shadow, then the gem's colored light pooling on the far side
 let sg=g.createRadialGradient(o+r*.28,o+r*.38,r*.2,o+r*.28,o+r*.38,r*1.25);sg.addColorStop(0,'rgba(0,0,0,.55)');sg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sg;ell(g,o+r*.28,o+r*.38,r*1.25,r*1.1);g.fill();
 const [cr,cg,cb]=hexRGB(col);sg=g.createRadialGradient(o+r*.5,o+r*.6,0,o+r*.5,o+r*.6,r*.9);sg.addColorStop(0,`rgba(${cr},${cg},${cb},.45)`);sg.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);g.fillStyle=sg;ell(g,o+r*.5,o+r*.6,r*.9,r*.8);g.fill();
 // body: deep at the rim, bright where light passes through
 const bg=g.createRadialGradient(o-r*.25,o-r*.3,r*.05,o,o,r);bg.addColorStop(0,shade(col,.55));bg.addColorStop(.45,col);bg.addColorStop(.85,shade(col,-.45));bg.addColorStop(1,shade(col,-.7));
 g.fillStyle=bg;ell(g,o,o,r,r*.94);g.fill();
 // refracted crescent opposite the light
 g.save();ell(g,o,o,r,r*.94);g.clip();const rg=g.createRadialGradient(o+r*.45,o+r*.5,0,o+r*.45,o+r*.5,r*.75);rg.addColorStop(0,shade(col,.7));rg.addColorStop(.5,`rgba(${cr},${cg},${cb},.4)`);rg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=rg;g.fillRect(o-r,o-r,r*2,r*2);
 // a few internal bubbles
 g.fillStyle='rgba(255,255,255,.35)';ell(g,o+r*.2,o-r*.1,r*.08,r*.08);g.fill();ell(g,o-r*.3,o+r*.35,r*.05,r*.05);g.fill();g.restore();
 // specular glint + window highlight
 g.fillStyle='rgba(255,255,255,.92)';ell(g,o-r*.38,o-r*.42,r*.26,r*.16);g.fill();g.fillStyle='rgba(255,255,255,.55)';ell(g,o-r*.05,o-r*.62,r*.12,r*.07);g.fill();
 g.strokeStyle=shade(col,-.75);g.lineWidth=Math.max(.6,r*.08);ell(g,o,o,r,r*.94);g.stroke();
 gemCache.set(key,c);if(gemCache.size>200)gemCache.delete(gemCache.keys().next().value);return c;}
function drawGem(g,col,x,y,r,dpr,a=1){const c=gemSprite(col,r,dpr),s=c.width/dpr;if(a<1){g.save();g.globalAlpha*=a;}g.drawImage(c,x-s/2,y-s/2,s,s);if(a<1)g.restore();}

// ------------------------------------------------------------------ the deck (board) geometry, in deck-local px
// Index layout is the Kalah engine's: 0-5 bottom row left→right (player 1), 6 = right store, 7-12 top row right→left
// (player 2), 13 = left store.
function deckGeometry(L){const pr=L/19.7,D=pr*4.9,pitch=pr*2.18,storeRx=pr*1.15,storeRy=pr*1.9,storeX=L/2-pr*1.6,gapX=pitch*3+pr*.28;
 const pits=[];for(let i=0;i<14;i++){if(i===6)pits.push({x:storeX,y:0,rx:storeRx,ry:storeRy,store:true});else if(i===13)pits.push({x:-storeX,y:0,rx:storeRx,ry:storeRy,store:true});
  else{const col=i<6?i:12-i;pits.push({x:(col-2.5)*pitch,y:i<6?pr*1.2:-pr*1.2,rx:pr,ry:pr,store:false});}}
 return {L,D,pr,pitch,pits,gapX,edge:D*.11,wheel:D*.2};}
const PLY=['#efd09a','#e0b47a','#c62828','#efd09a','#1565c0','#e7c088','#f2d9a8','#d9a868'];
function deckPath(g,L,D){const r=D*.48;g.beginPath();g.roundRect(-L/2,-D/2,L,D,r);}
function bowl(g,cx,cy,rx,ry,seed,lt={x:-1,y:-1}){const R=rnd(seed);g.save();
 // the routed slope shows each ply as a ring, top ply outermost
 const step=.055;for(let k=0;k<PLY.length;k++){const f=1-k*step;g.fillStyle=PLY[k];ell(g,cx,cy,rx*f,ry*f);g.fill();}
 const fb=1-PLY.length*step;g.save();ell(g,cx,cy,rx*fb,ry*fb);g.clip();g.fillStyle='#e9c48e';g.fillRect(cx-rx,cy-ry,rx*2,ry*2);
 g.strokeStyle='rgba(140,82,30,.28)';g.lineWidth=Math.max(.6,rx*.03);for(let j=-6;j<=6;j++){const y0=cy+j*ry*fb/5.5+R()*2;g.beginPath();g.moveTo(cx-rx,y0);for(let s=0;s<=6;s++){const xx=cx-rx+s*rx/3;g.lineTo(xx,y0+Math.sin(s*1.3+j+R()*2)*ry*.04);}g.stroke();}
 g.restore();
 // concave shading: light from the top-left falls on the far (bottom-right) wall, the near wall is in shadow
 g.save();ell(g,cx,cy,rx,ry);g.clip();
 const lg=g.createLinearGradient(cx+lt.x*rx*.8,cy+lt.y*ry*.8,cx-lt.x*rx*.8,cy-lt.y*ry*.8);lg.addColorStop(0,'rgba(10,5,0,.72)');lg.addColorStop(.42,'rgba(10,5,0,.18)');lg.addColorStop(.7,'rgba(0,0,0,0)');lg.addColorStop(1,'rgba(255,236,200,.22)');g.fillStyle=lg;g.fillRect(cx-rx,cy-ry,rx*2,ry*2);
 const rim=g.createRadialGradient(cx-lt.x*rx*.12,cy-lt.y*ry*.14,Math.min(rx,ry)*.55,cx,cy,Math.max(rx,ry)*1.02);rim.addColorStop(0,'rgba(0,0,0,0)');rim.addColorStop(.85,'rgba(0,0,0,.25)');rim.addColorStop(1,'rgba(0,0,0,.65)');g.fillStyle=rim;g.fillRect(cx-rx,cy-ry,rx*2,ry*2);
 // varnish gloss on the lit wall
 g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=Math.max(1,rx*.07);const ga=Math.atan2(-lt.y,-lt.x);g.beginPath();g.ellipse(cx,cy,rx*.8,ry*.8,0,ga-.2*Math.PI,ga+.2*Math.PI);g.stroke();
 g.restore();
 // cut edge of the grip tape
 g.strokeStyle='#050505';g.lineWidth=Math.max(1,rx*.06);ell(g,cx,cy,rx,ry);g.stroke();
 g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1;g.beginPath();g.ellipse(cx,cy,rx+1.2,ry+1.2,0,.1*Math.PI,.9*Math.PI);g.stroke();
 g.restore();}
function bolt(g,x,y,r){const bg=g.createRadialGradient(x-r*.35,y-r*.35,0,x,y,r);bg.addColorStop(0,'#f4f6f8');bg.addColorStop(.6,'#9aa2ab');bg.addColorStop(1,'#3d434a');g.fillStyle=bg;ell(g,x,y,r,r);g.fill();
 g.fillStyle='#1d2126';g.beginPath();for(let k=0;k<6;k++){const a=k/6*TAU;g.lineTo(x+Math.cos(a)*r*.42,y+Math.sin(a)*r*.42);}g.closePath();g.fill();}
function wheel(g,x,y,w,h,col){const wg=g.createLinearGradient(x-w/2,0,x+w/2,0);wg.addColorStop(0,shade(col,-.5));wg.addColorStop(.35,shade(col,.25));wg.addColorStop(.7,col);wg.addColorStop(1,shade(col,-.55));
 g.fillStyle=wg;g.beginPath();g.roundRect(x-w/2,y-h/2,w,h,Math.min(w,h)*.42);g.fill();g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=1;g.stroke();
 g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x-w*.32,y-h*.42,w*.12,h*.84);}
// The whole deck pre-rendered. view 'side' (landscape): we look at the long front edge, so one wheel per truck shows under
// it. view 'end' (portrait, drawn turned 90°): we look at the tail end, so the near truck's two wheels show side by side
// under the tail and the far truck is hidden. The edge is drawn toward local +y (side) or +x (end); after the turn both
// point down the screen. Light always comes from the screen's top-left.
function makeDeck(geo,dpr,view='side'){const {L,D,pr,pits,edge,wheel:wh}=geo,side=view==='side',lt=side?{x:-1,y:-1}:{x:-1,y:1};
 const padX=pr*1.4+(side?0:edge+wh),padTop=pr*.8,padBot=side?edge+wh+pr*1.6:pr*1.2,w=L+padX*2,h=D+padTop+padBot;
 const c=canvas(w*dpr,h*dpr),g=c.getContext('2d');g.scale(dpr,dpr);g.translate(padX+L/2,padTop+D/2);const R=rnd(77);
 const ex=side?0:edge,ey=side?edge:0;// edge offset direction
 // soft shadow on the concrete
 g.save();const sry=side?L*.11:D*.6;g.translate(side?0:L*.03,side?D*.62:0);g.scale(1,sry/(L*.52));const sh=g.createRadialGradient(0,0,L*.1,0,0,L*.52);sh.addColorStop(0,'rgba(0,0,0,.5)');sh.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sh;ell(g,0,0,L*.52,L*.52);g.fill();g.restore();
 // trucks and wheels
 if(side){for(const sx of [-1,1]){const tx=sx*geo.gapX;g.fillStyle='#7c858f';g.beginPath();g.roundRect(tx-D*.13,D/2+edge-3,D*.26,wh*.42,3);g.fill();g.fillStyle='#b9c1ca';g.fillRect(tx-D*.1,D/2+edge-1,D*.2,wh*.16);
   wheel(g,tx,D/2+edge+wh*.48,D*.24,wh*.95,'#ffe066');}}
 else{const tx=L/2-pr*.6;g.fillStyle='#8c949c';g.fillRect(tx+edge-wh*.1,-D*.36,wh*.5,D*.72);g.fillStyle='#b9c1ca';g.fillRect(tx+edge,-D*.3,wh*.18,D*.6);
  for(const sy of [-1,1]){g.save();g.translate(tx+edge+wh*.5,sy*D*.36);g.rotate(Math.PI/2);wheel(g,0,0,D*.22,wh*.95,'#ffe066');g.restore();}}
 // edge: the 7 plies, darker further down, following the outline
 for(let k=PLY.length-1;k>=0;k--){g.save();g.translate(ex*(k+1)/PLY.length,ey*(k+1)/PLY.length);deckPath(g,L,D);g.fillStyle=shade(PLY[k],-.2-k*.045);g.fill();g.restore();}
 g.save();g.translate(ex,ey);deckPath(g,L,D);g.restore();g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=1;g.stroke();
 // grip tape: black, gritty, lit from the top-left; worn grey where feet go; tails raised and catching light
 deckPath(g,L,D);g.fillStyle='#17171a';g.fill();g.save();deckPath(g,L,D);g.clip();
 const n=Math.floor(L*D/5);for(let i=0;i<n;i++){const x=(R()-.5)*L,y=(R()-.5)*D,v=R();g.fillStyle=v<.5?'rgba(255,255,255,.07)':v<.8?'rgba(0,0,0,.35)':'rgba(255,255,255,.16)';g.fillRect(x,y,v<.9?1:1.5,v<.9?1:1.5);}
 for(const sx of [-1,1]){const tg=g.createLinearGradient(sx*L/2,0,sx*(L/2-pr*3.4),0);tg.addColorStop(0,'rgba(255,255,255,.12)');tg.addColorStop(.75,'rgba(255,255,255,0)');tg.addColorStop(.85,'rgba(0,0,0,.25)');tg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=tg;g.fillRect(sx>0?L/2-pr*3.4:-L/2,-D/2,pr*3.4,D);
  g.fillStyle='rgba(150,150,150,.09)';ell(g,sx*(geo.gapX+pr*.2),0,pr*1.6,D*.42);g.fill();}
 const lit=g.createLinearGradient(lt.x*L/2,lt.y*D/2,-lt.x*L/2,-lt.y*D/2);lit.addColorStop(0,'rgba(255,255,255,.08)');lit.addColorStop(1,'rgba(0,0,0,.25)');g.fillStyle=lit;g.fillRect(-L/2,-D/2,L,D);
 // a strip of the top-ply graphic showing through a cut in the grip, down the middle (flames)
 g.save();g.beginPath();g.rect(-geo.gapX+pr*.6,-pr*.12,geo.gapX*2-pr*1.2,pr*.24);g.clip();const fg=g.createLinearGradient(0,-pr*.12,0,pr*.12);fg.addColorStop(0,'#ffd23a');fg.addColorStop(.5,'#ff6a00');fg.addColorStop(1,'#c40000');g.fillStyle=fg;g.fillRect(-L/2,-pr,L,pr*2);g.restore();
 g.restore();
 // rounded top edge catching the light
 g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=1.2;g.save();g.translate(lt.x*.6,lt.y*.6);deckPath(g,L,D);g.restore();g.stroke();
 g.strokeStyle='#050505';g.lineWidth=1.4;deckPath(g,L,D);g.stroke();
 // bowls, bolts
 pits.forEach((p,i)=>bowl(g,p.x,p.y,p.rx,p.ry,i*31+5,lt));
 for(const sx of [-1,1])for(const bx of [-.14,.14])for(const by of [-.55,.55])bolt(g,sx*geo.gapX+bx*pr,by*pr,pr*.13);
 return {c,ox:padX+L/2,oy:padTop+D/2,w,h};}

// 90s skate-video look for the camera cutaways: barrel (fisheye) distortion from magnified concentric rings, black
// fisheye corners, scanlines, a tracking-noise band and the camcorder overlay.
function fisheye(g,src,W,H,k=.4){const cx=W/2,cy=H/2,Rm=Math.hypot(W,H)/2,N=4;g.drawImage(src,0,0,W,H);
 for(let i=1;i<=N;i++){const f=1-i/(N+1),r=Rm*f,m=1+k*(1-f*f);g.save();g.beginPath();g.arc(cx,cy,r,0,TAU);g.clip();g.translate(cx,cy);g.scale(m,m);g.drawImage(src,-cx,-cy,W,H);g.restore();}
 const vg=g.createRadialGradient(cx,cy,Math.min(W,H)*.42,cx,cy,Rm);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(.55,'rgba(0,0,0,.55)');vg.addColorStop(.8,'#000');vg.addColorStop(1,'#000');g.fillStyle=vg;g.fillRect(0,0,W,H);}
function vhs(g,W,H,t,rec){g.fillStyle='rgba(0,0,0,.13)';for(let y=(t*40)%3;y<H;y+=3)g.fillRect(0,y,W,1);
 const by=((t*.37)%1.3)*H-H*.15;g.fillStyle='rgba(255,255,255,.06)';g.fillRect(0,by,W,H*.04);for(let i=0;i<14;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*.25})`;g.fillRect(Math.random()*W,by+Math.random()*H*.04,Math.random()*W*.2,1);}
 g.fillStyle='rgba(255,40,90,.05)';g.fillRect(0,0,W,H);
 const px=Math.max(11,Math.min(W,H)*.032);g.font=`700 ${px}px "Courier New",monospace`;g.textBaseline='bottom';g.textAlign='right';g.fillStyle='rgba(255,255,255,.85)';
 const s=Math.floor(t*30),tc=`${String(Math.floor(s/1800)).padStart(2,'0')}:${String(Math.floor(s/30)%60).padStart(2,'0')}:${String(s%30).padStart(2,'0')}`;
 g.fillText((rec?'● REC  ':'PLAY ▶  ')+'SP '+tc,W-px,48+px*1.2);g.fillText('OCT 17 1999',W-px,48+px*2.4);}
// ------------------------------------------------------------------ skatepark backdrop with the halfpipes, cached
function pipeGeo(r){// a halfpipe filling rect r (side view): floor at the bottom, coping at height R
 const R=Math.min(r.h*.45,r.w*.36),F=Math.max(r.w*.04,(r.w-R*2-r.w*.15)/2),cx=r.x+r.w/2,floor=r.y+r.h-r.h*.06;
 return {R,F,cx,floor,L:F+Math.PI*R/2,plat:r.w*.07,depth:R*.24};}
function pipePoint(p,u){// arc length u (-L..L) along the riding surface → position, surface tilt, height
 const s=Math.sign(u)||1,a=Math.abs(u);if(a<=p.F)return {x:p.cx+u,y:p.floor,rot:0,phi:0};
 const phi=Math.min(Math.PI/2,(a-p.F)/p.R);return {x:p.cx+s*(p.F+p.R*Math.sin(phi)),y:p.floor-p.R*(1-Math.cos(phi)),rot:-s*phi,phi};}
function drawPipe(g,p,tag,seed){const {R,F,cx,floor,plat}=p,R2=rnd(seed),top=floor-R,vert=R*.08;
 // side panel (plywood), framed, tagged with graffiti
 g.beginPath();g.moveTo(cx-F-R-plat,floor);g.lineTo(cx-F-R-plat,top-vert);g.lineTo(cx-F-R,top-vert);g.lineTo(cx-F-R,top);g.arc(cx-F,top,R,Math.PI,Math.PI/2,true);g.lineTo(cx+F,floor);g.arc(cx+F,top,R,Math.PI/2,0,true);g.lineTo(cx+F+R,top-vert);g.lineTo(cx+F+R+plat,top-vert);g.lineTo(cx+F+R+plat,floor);g.closePath();
 const pg=g.createLinearGradient(0,top,0,floor);pg.addColorStop(0,'#cfa96f');pg.addColorStop(1,'#a77d47');g.fillStyle=pg;g.fill();
 g.save();g.clip();g.strokeStyle='rgba(90,55,20,.35)';g.lineWidth=1;for(let x=cx-F-R-plat;x<cx+F+R+plat;x+=R*.42){g.beginPath();g.moveTo(x,top-vert);g.lineTo(x,floor);g.stroke();}
 for(let i=0;i<40;i++){g.fillStyle=`rgba(80,45,10,${.05+R2()*.08})`;g.fillRect(cx-F-R-plat+R2()*(2*(F+R+plat)),top+R2()*R,R2()*R*.6,1);}
 g.restore();
 // the riding surface seen from a little above: masonite from the near edge back to the far edge, panel seams
 const dep=p.depth,N=48,near=[];for(let k=0;k<=N;k++)near.push(pipePoint(p,-p.L+2*p.L*k/N));near.unshift({x:cx-F-R,y:top-vert});near.push({x:cx+F+R,y:top-vert});
 g.beginPath();near.forEach((q,k)=>k?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));for(let k=near.length-1;k>=0;k--)g.lineTo(near[k].x,near[k].y-dep);g.closePath();
 const sg=g.createLinearGradient(0,top-vert-dep,0,floor);sg.addColorStop(0,'#c9ced4');sg.addColorStop(.5,'#9aa0a7');sg.addColorStop(1,'#7d838b');g.fillStyle=sg;g.fill();
 g.strokeStyle='rgba(40,45,52,.35)';g.lineWidth=1;for(let k=2;k<near.length-2;k+=4){g.beginPath();g.moveTo(near[k].x,near[k].y);g.lineTo(near[k].x,near[k].y-dep);g.stroke();}
 for(let i=0;i<30;i++){const q=near[2+Math.floor(R2()*(near.length-4))];g.fillStyle=`rgba(0,0,0,${.05+R2()*.08})`;g.fillRect(q.x+(R2()-.5)*6,q.y-R2()*dep,R2()*R*.25,1.2);}
 const cols=['#ff2d75','#2ee6ff','#ffe600','#7cff3a','#ff7a00'];thps(g,tag,cx,floor-dep*.5,dep*.8,{grad:[cols[seed%5],cols[(seed+2)%5]],stroke:'#111',alpha:.75,maxW:F*2+R*.4,lw:.22,skew:-.35});
 g.strokeStyle='#3d424a';g.lineWidth=Math.max(2,R*.045);g.beginPath();near.forEach((q,k)=>k?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.stroke();
 g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();near.forEach((q,k)=>k?g.lineTo(q.x,q.y-dep):g.moveTo(q.x,q.y-dep));g.stroke();
 // platform decks (with depth), coping pipes running back, rails
 for(const sx of [-1,1]){const x0=sx<0?cx-F-R-plat:cx+F+R,ty=top-vert;g.fillStyle='#8a7354';g.beginPath();g.moveTo(x0,ty);g.lineTo(x0+plat,ty);g.lineTo(x0+plat,ty-dep);g.lineTo(x0,ty-dep);g.closePath();g.fill();
  g.fillStyle='#6b5a44';g.fillRect(x0,ty,plat,R*.05);
  const x=cx+sx*(F+R);g.strokeStyle='#e6ebf0';g.lineWidth=Math.max(2.5,R*.07);g.lineCap='round';g.beginPath();g.moveTo(x,ty);g.lineTo(x,ty-dep);g.stroke();g.strokeStyle='rgba(60,66,74,.8)';g.lineWidth=1;g.beginPath();g.moveTo(x+R*.03*sx,ty);g.lineTo(x+R*.03*sx,ty-dep);g.stroke();
  const ox=cx+sx*(F+R+plat*.9);g.strokeStyle='#9aa3ad';g.lineWidth=Math.max(1.5,R*.025);g.beginPath();g.moveTo(ox,ty-dep);g.lineTo(ox,ty-dep-R*.4);g.lineTo(cx+sx*(F+R+plat*.15),ty-dep-R*.4);g.stroke();}}
// The scene: sky, palms, buildings, chain-link fence, graffiti wall, concrete with expansion joints, the two halfpipes.
function makePark(W,H,dpr,lay){const c=canvas(W*dpr,H*dpr),g=c.getContext('2d');g.scale(dpr,dpr);const R=rnd(4242),hz=lay.horizon;
 let sg=g.createLinearGradient(0,0,0,hz);sg.addColorStop(0,'#1f6fd1');sg.addColorStop(.6,'#5fb2ef');sg.addColorStop(1,'#cfeaf7');g.fillStyle=sg;g.fillRect(0,0,W,hz+2);
 // sun + haze
 const sx=W*.78,sy=hz*.28,sun=g.createRadialGradient(sx,sy,0,sx,sy,Math.max(W,H)*.25);sun.addColorStop(0,'rgba(255,250,220,.95)');sun.addColorStop(.08,'rgba(255,240,180,.7)');sun.addColorStop(1,'rgba(255,240,180,0)');g.fillStyle=sun;g.fillRect(0,0,W,hz);
 for(let i=0;i<5;i++){g.fillStyle='rgba(255,255,255,.55)';const cx=R()*W,cy=hz*(.1+R()*.4),cw=W*(.12+R()*.12);for(let k=0;k<5;k++){ell(g,cx+(k-2)*cw*.18,cy+Math.sin(k)*4,cw*.16,cw*.07);g.fill();}}
 // city line and palm trees
 g.fillStyle='#7d97b3';for(let x=0;x<W;){const bw=W*(.04+R()*.06),bh=hz*(.12+R()*.3);g.fillRect(x,hz-bh,bw,bh);x+=bw+R()*W*.01;}
 g.fillStyle='rgba(255,255,255,.18)';for(let i=0;i<60;i++)g.fillRect(R()*W,hz-R()*hz*.35,2,2);
 const palm=(x,y,h)=>{g.strokeStyle='#3a2a1c';g.lineWidth=Math.max(2,h*.04);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+h*.12,y-h*.5,x+h*.05,y-h);g.stroke();g.strokeStyle='#1f5d2e';g.lineWidth=Math.max(2,h*.05);
  for(let k=0;k<7;k++){const a=-Math.PI/2+(k-3)*.45;g.beginPath();g.moveTo(x+h*.05,y-h);g.quadraticCurveTo(x+h*.05+Math.cos(a)*h*.3,y-h+Math.sin(a)*h*.2-h*.08,x+h*.05+Math.cos(a)*h*.42,y-h+Math.sin(a)*h*.3+h*.12);g.stroke();}};
 for(let i=0;i<4;i++)palm(W*(.08+i*.29+R()*.06),hz,hz*(.5+R()*.3));
 // ground: warm concrete with perspective joints, stains, cracks
 const gg=g.createLinearGradient(0,hz,0,H);gg.addColorStop(0,'#b9b3a8');gg.addColorStop(1,'#8f897f');g.fillStyle=gg;g.fillRect(0,hz,W,H-hz);
 for(let i=0;i<Math.floor(W*(H-hz)/14);i++){const v=R();g.fillStyle=v<.5?'rgba(0,0,0,.06)':'rgba(255,255,255,.07)';g.fillRect(R()*W,hz+R()*(H-hz),1+R()*1.5,1);}
 for(let i=0;i<9;i++){g.fillStyle=`rgba(40,30,20,${.04+R()*.06})`;ell(g,R()*W,hz+R()*(H-hz),W*(.03+R()*.06),W*(.01+R()*.02));g.fill();}
 g.strokeStyle='rgba(60,55,50,.35)';g.lineWidth=1;const vp=W/2;for(let k=-8;k<=8;k++){g.beginPath();g.moveTo(vp+k*W*.04,hz);g.lineTo(vp+k*W*.4,H);g.stroke();}
 for(let y=hz+8,d=10;y<H;d*=1.35,y+=d){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
 g.strokeStyle='rgba(30,25,20,.3)';for(let i=0;i<6;i++){let x=R()*W,y=hz+R()*(H-hz);g.beginPath();g.moveTo(x,y);for(let k=0;k<5;k++){x+=(R()-.5)*30;y+=R()*14;g.lineTo(x,y);}g.stroke();}
 // chain-link fence along the horizon, with a graffiti wall section
 const fh=Math.min(hz*.32,H*.08);g.strokeStyle='rgba(70,80,90,.55)';g.lineWidth=.8;for(let x=-fh;x<W+fh;x+=7){g.beginPath();g.moveTo(x,hz-fh);g.lineTo(x+fh,hz);g.moveTo(x+fh,hz-fh);g.lineTo(x,hz);g.stroke();}
 g.fillStyle='#5f6a75';for(let x=0;x<W;x+=W/7)g.fillRect(x,hz-fh-3,3,fh+3);g.fillRect(0,hz-fh-3,W,2);
 const wx=W*.55,ww=W*.36,wh=fh*1.05;g.fillStyle='#9a9087';g.fillRect(wx,hz-wh,ww,wh);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(wx,hz-2,ww,2);
 thps(g,'SKATE OR DIE',wx+ww*.5,hz-wh*.5,wh*.7,{grad:['#ff3d7f','#ffde00'],stroke:'#111',maxW:ww*.92,rot:-.03});
 // halfpipes
 for(const p of lay.pipes)drawPipe(g,p.geo,p.tag,p.seed);
 // a ledge and a few cones near the board
 const cone=(x,y,s)=>{g.fillStyle='#ff6a13';g.beginPath();g.moveTo(x,y-s);g.lineTo(x+s*.38,y);g.lineTo(x-s*.38,y);g.closePath();g.fill();g.fillStyle='#fff';g.fillRect(x-s*.22,y-s*.55,s*.44,s*.12);g.fillStyle='#222';g.fillRect(x-s*.5,y-1,s,s*.12);};
 if(lay.cones)for(const k of lay.cones)cone(k[0],k[1],k[2]);
 // vignette, PS1-era warmth
 const vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=vg;g.fillRect(0,0,W,H);
 return c;}

// ------------------------------------------------------------------ skaters (side view, big-head mode)
// Pose: crouch 0..1, arms (two angles each), grab, board {flip: long-axis turn, shove: vertical-axis turn}, face ±1.
const OUTFITS=[{shirt:'#d62828',shirt2:'#ffffff',shorts:'#5d6b48',shoe:'#1b1b1b',deck:['#ffcc00','#ff4d00'],wheel:'#fff2a8'},
 {shirt:'#1f6feb',shirt2:'#ffe14d',shorts:'#2c2c34',shoe:'#e8e8e8',deck:['#2ee6ff','#7a2cff'],wheel:'#ffffff'},
 {shirt:'#2a9d3f',shirt2:'#111',shorts:'#7a6a50',shoe:'#5a2d0c',deck:['#ff4fa8','#ffe600'],wheel:'#ffd0e8'},
 {shirt:'#222',shirt2:'#ff7a00',shorts:'#3b5d8f',shoe:'#c11',deck:['#7cff3a','#008a4a'],wheel:'#e9ffe0'}];
function limb(g,x0,y0,x1,y1,len,bend,w,col){// two-bone limb from (x0,y0) to (x1,y1), knee pushed to side `bend`
 const dx=x1-x0,dy=y1-y0,d=Math.min(Math.hypot(dx,dy),len*2*.999),mx=(x0+x1)/2,my=(y0+y1)/2,h=Math.sqrt(Math.max(0,len*len-d*d/4)),nx=-dy/(Math.hypot(dx,dy)||1),ny=dx/(Math.hypot(dx,dy)||1);
 const kx=mx+nx*h*bend,ky=my+ny*h*bend;g.strokeStyle=col;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(x0,y0);g.lineTo(kx,ky);g.lineTo(x1,y1);g.stroke();return {kx,ky};}
function drawBoard(g,u,o,flip=0,shove=0){// deck centered at 0,0 along x, wheels below
 const len=u*3.3,cs=Math.cos(shove),cf=Math.cos(flip),sf=Math.sin(flip),th=u*.16;g.save();g.scale(cs===0?.001:cs,1);
 const face=Math.abs(sf)*u*.9;// the deck's width seen as it rolls over
 if(face>th*.6){g.fillStyle=sf>0?'#151515':(()=>{const lg=g.createLinearGradient(-len/2,0,len/2,0);lg.addColorStop(0,o.deck[0]);lg.addColorStop(1,o.deck[1]);return lg;})();
  g.beginPath();g.roundRect(-len/2,-face/2,len,face,face*.45);g.fill();g.strokeStyle='#000';g.lineWidth=1;g.stroke();}
 g.save();g.scale(1,cf===0?.001:cf);// side profile with kicked tails
 g.fillStyle='#e8c48c';g.strokeStyle='#2a1a0a';g.lineWidth=Math.max(1,u*.06);g.beginPath();g.moveTo(-len/2,-th*1.6);g.quadraticCurveTo(-len*.42,0,-len*.3,0);g.lineTo(len*.3,0);g.quadraticCurveTo(len*.42,0,len/2,-th*1.6);g.lineTo(len/2,-th*.6);g.quadraticCurveTo(len*.42,th,len*.3,th);g.lineTo(-len*.3,th);g.quadraticCurveTo(-len*.42,th,-len/2,-th*.6);g.closePath();g.fill();g.stroke();
 g.fillStyle='#8c949c';for(const sx of [-1,1])g.fillRect(sx*len*.27-u*.12,th,u*.24,u*.16);
 for(const sx of [-1,1]){g.fillStyle=o.wheel;ell(g,sx*len*.27,th+u*.3,u*.2,u*.2);g.fill();g.strokeStyle='#555';g.lineWidth=1;g.stroke();}
 g.restore();g.restore();}
function drawHead(g,head,x,y,size,rot=0,squash=1,hat=null){if(!head)return;const w=size*(head.width/Math.max(head.width,head.height)),h=size*(head.height/Math.max(head.width,head.height));g.save();g.translate(x,y);g.rotate(rot);g.scale(1/Math.sqrt(squash),squash);g.drawImage(head,-w/2,-h*.82,w,h);if(hat)drawHat(g,w,h,hat);g.restore();}
// Hats over a front-facing head photo (local space of drawHead: the picture spans y -0.82h..0.18h). Backwards cap,
// trucker cap, beanie with a pom-pom, or a vert helmet with stickers.
const HAT_COLS=[['#d62020','#ffffff'],['#1d4ed8','#ffd400'],['#111111','#ff3b8d'],['#16a34a','#111111'],['#f97316','#1f2937'],['#7c3aed','#a3e635'],['#e5e7eb','#d62020']];
function hatFor(r=Math.random){if(r()<.3)return null;const [c1,c2]=HAT_COLS[Math.floor(r()*HAT_COLS.length)];return {type:['back','trucker','beanie','helmet','back'][Math.floor(r()*5)],c1,c2};}
function drawHat(g,w,h,hat){const cx=0,base=-h*.5,top=-h*.9,hw=w*.42,lw=Math.max(1,w*.025);g.lineJoin='round';g.strokeStyle='#111';g.lineWidth=lw;
 const dome=(b,t,ww)=>{g.beginPath();g.moveTo(cx-ww,b);g.bezierCurveTo(cx-ww,t,cx+ww,t,cx+ww,b);g.closePath();};
 if(hat.type==='beanie'){dome(base+h*.04,top-h*.04,hw*1.02);g.fillStyle=hat.c1;g.fill();g.stroke();g.save();dome(base+h*.04,top-h*.04,hw*1.02);g.clip();g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=lw*1.4;for(let i=-6;i<=6;i++){g.beginPath();g.moveTo(cx+i*hw/6,base);g.lineTo(cx+i*hw/6.6,top-h*.05);g.stroke();}g.restore();
  g.fillStyle=hat.c2;g.beginPath();g.roundRect(cx-hw*1.05,base-h*.06,hw*2.1,h*.11,h*.04);g.fill();g.stroke();g.fillStyle=hat.c2;ell(g,cx,top-h*.06,w*.08,w*.08);g.fill();g.stroke();return;}
 if(hat.type==='helmet'){dome(base+h*.02,top-h*.08,hw*1.12);const gr=g.createLinearGradient(cx-hw,top,cx+hw,base);gr.addColorStop(0,shade(hat.c1,.45));gr.addColorStop(.5,hat.c1);gr.addColorStop(1,shade(hat.c1,-.35));g.fillStyle=gr;g.fill();g.stroke();
  g.fillStyle='rgba(255,255,255,.55)';ell(g,cx-hw*.35,top+h*.06,hw*.28,h*.05);g.fill();g.fillStyle=hat.c2;g.beginPath();g.roundRect(cx+hw*.15,base-h*.2,hw*.5,h*.1,h*.02);g.fill();g.fillStyle='#111';g.font=`900 ${h*.07}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('SK8',cx+hw*.4,base-h*.15);
  g.strokeStyle='#222';g.lineWidth=lw*1.5;g.beginPath();g.moveTo(cx-hw*1.05,base);g.lineTo(cx-hw*.7,base+h*.32);g.moveTo(cx+hw*1.05,base);g.lineTo(cx+hw*.7,base+h*.32);g.stroke();return;}
 // caps: crown, then (trucker) a white front panel and the bill, or (backwards) the snapback strap window
 dome(base,top,hw);g.fillStyle=hat.c1;g.fill();g.stroke();
 if(hat.type==='trucker'){g.save();dome(base,top,hw);g.clip();g.fillStyle='#f5f5f5';g.fillRect(cx-hw*.55,top,hw*1.1,base-top);g.fillStyle=hat.c1;g.font=`900 ${h*.09}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('THPS',cx,base-h*.12);g.restore();
  g.fillStyle=shade(hat.c1,-.25);g.beginPath();g.ellipse(cx,base+h*.02,hw*1.05,h*.07,0,0,Math.PI*2);g.fill();g.stroke();}
 else{g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(cx,base-h*.03,hw*.3,h*.06,0,Math.PI,0);g.fill();g.fillStyle=hat.c2;g.fillRect(cx-hw*.35,base-h*.035,hw*.7,h*.035);}
 g.fillStyle=hat.c2;ell(g,cx,top+h*.08,w*.03,w*.03);g.fill();}
// u = size unit (shin length). The skater stands on the board at the origin, up is -y; caller rotates/translates.
function drawSkater(g,u,pose,head,o){const face=pose.face||1,cr=clamp(pose.crouch??.3,0,1),hipY=-u*(2.25-cr*.85),lean=pose.lean||0;
 g.save();if(pose.spin){const k=Math.cos(pose.spin);g.scale(Math.abs(k)<.08?.08*Math.sign(k||1):k,1);}g.scale(face,1);
 // board first (under the shoes), unless it is flying on its own
 if(!pose.noBoard&&!pose.boardHeld){g.save();g.translate(0,u*.05+(pose.boardY||0));g.rotate(pose.boardRot||0);drawBoard(g,u,o,pose.flip||0,pose.shove||0);g.restore();}
 const fx=u*.7,fy=-u*.12+(pose.feetY||0),hx=lean*u*.6,shoulderY=hipY-u*1.55,sx=hx+Math.sin(lean)*u*1.2;
 // legs (socks + shorts), shoes; pose.feet moves each foot (airwalk scissor, christ air dangle)
 const F=pose.feet||[[-fx,fy],[fx,fy]];
 for(const s of [0,1])limb(g,hx+(s?1:-1)*u*.22,hipY,F[s][0],F[s][1],u*1.15,-1,u*.42,'#e9c7a3');
 g.fillStyle=o.shorts;g.beginPath();g.moveTo(hx-u*.62,hipY-u*.3);g.lineTo(hx+u*.62,hipY-u*.3);g.lineTo(hx+u*.78,hipY+u*.62);g.lineTo(hx+u*.06,hipY+u*.7);g.lineTo(hx,hipY+u*.3);g.lineTo(hx-u*.06,hipY+u*.7);g.lineTo(hx-u*.78,hipY+u*.62);g.closePath();g.fill();
 g.fillStyle='#fff';for(const [x,y] of F)g.fillRect(x-u*.17,y-u*.42,u*.34,u*.22);
 g.fillStyle=o.shoe;for(const [x,y] of F){g.beginPath();g.roundRect(x-u*.32,y-u*.24,u*.68,u*.28,u*.12);g.fill();}g.fillStyle='rgba(255,255,255,.8)';for(const [x,y] of F)g.fillRect(x-u*.3,y-u*.02,u*.64,u*.05);
 // torso (tee with a stripe), arms
 const arm=(side,a1,a2,col)=>{const ax=sx+side*u*.45,ay=shoulderY+u*.18;let ex=ax+Math.sin(a1)*u*.95,ey=ay+Math.cos(a1)*u*.95,hx2=ex+Math.sin(a1+a2)*u*.9,hy2=ey+Math.cos(a1+a2)*u*.9;
  if(pose.grab&&side===1){hx2=u*.3;hy2=-u*.1;}const m=limb(g,ax,ay,hx2,hy2,u*.92,side>0?-1:1,u*.36,'#e9c7a3');
  g.strokeStyle=col;g.lineWidth=u*.46;g.beginPath();g.moveTo(ax,ay);g.lineTo(ax+(m.kx-ax)*.5,ay+(m.ky-ay)*.5);g.stroke();g.fillStyle='#e9c7a3';ell(g,hx2,hy2,u*.2,u*.2);g.fill();};
 const A=pose.arms||[.9,-.4,-.9,.4];arm(-1,A[2],A[3],o.shirt);
 g.save();g.translate(hx,hipY);g.rotate(lean);g.fillStyle=o.shirt;g.beginPath();g.roundRect(-u*.62,-u*1.75,u*1.24,u*1.6,u*.3);g.fill();g.fillStyle=o.shirt2;g.fillRect(-u*.62,-u*1.15,u*1.24,u*.22);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.beginPath();g.roundRect(-u*.62,-u*1.75,u*1.24,u*1.6,u*.3);g.stroke();g.restore();
 arm(1,A[0],A[1],shade(o.shirt,-.12));
 // christ air: the board held out at arm's length
 if(pose.boardHeld){const b=pose.boardHeld;g.save();g.translate(b.x*u,b.y*u);g.rotate(b.rot||0);drawBoard(g,u,o,b.flip||0,0);g.restore();}
 g.restore();
 // the head: big-head mode, kept upright-ish for readability
 const hk=pose.spin?Math.cos(pose.spin):1,hxw=(sx)*face*(Math.abs(hk)<.08?.08:hk);
 if(head)drawHead(g,head,hxw,shoulderY+u*.12,u*(pose.headSize||3.1),(pose.headRot||0)+lean*.4*face,pose.squash||1,pose.hat);}
// Facing the camera for the pose shot: standing on the board (seen nose-on), hands doing the pose, big head + hat.
// kind: horns | point | arms | shaka | flex | boardup
function drawSkaterFront(g,u,kind,t,head,o,hat){const bob=Math.sin(t*9)*u*.08,hipY=-u*2.15+bob,shY=hipY-u*1.6,skin='#e9c7a3';g.save();g.lineCap='round';g.lineJoin='round';
 // board nose-on: a thin deck with two wheels, unless it is held up
 if(kind!=='boardup'){g.fillStyle='#e8c48c';g.fillRect(-u*1.1,-u*.12,u*2.2,u*.14);g.fillStyle='#151515';g.fillRect(-u*1.1,-u*.18,u*2.2,u*.07);g.fillStyle=o.wheel;ell(g,-u*.75,u*.18,u*.2,u*.2);g.fill();ell(g,u*.75,u*.18,u*.2,u*.2);g.fill();}
 for(const s of [-1,1]){limb(g,s*u*.3,hipY,s*u*.75,-u*.2,u*1.2,s,u*.44,skin);g.fillStyle='#fff';g.fillRect(s*u*.75-u*.17,-u*.62,u*.34,u*.22);g.fillStyle=o.shoe;g.beginPath();g.roundRect(s*u*.75-u*.34,-u*.42,u*.68,u*.32,u*.12);g.fill();}
 g.fillStyle=o.shorts;g.beginPath();g.moveTo(-u*.75,hipY-u*.3);g.lineTo(u*.75,hipY-u*.3);g.lineTo(u*.9,hipY+u*.75);g.lineTo(u*.08,hipY+u*.8);g.lineTo(0,hipY+u*.35);g.lineTo(-u*.08,hipY+u*.8);g.lineTo(-u*.9,hipY+u*.75);g.closePath();g.fill();
 g.fillStyle=o.shirt;g.beginPath();g.roundRect(-u*.85,shY,u*1.7,u*1.75,u*.35);g.fill();g.fillStyle=o.shirt2;g.font=`900 ${u*.55}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('SK8',0,shY+u*.8);
 // arms: shoulder → hand, a hand shape at the end
 const W=t*7,hands={horns:[[-1.5,-1.3],[1.5,-1.35]],point:[[-1.1,.3],[.2,-.35]],arms:[[-1.7,-1.6],[1.7,-1.6]],shaka:[[-1.45,-.4],[1.45,-.4]],flex:[[-1.35,-.95],[1.35,-.95]],boardup:[[-1.3,-2.2],[1.3,-2.2]]}[kind]||[[-1.4,.3],[1.4,.3]];
 if(kind==='boardup'){g.save();g.translate(0,shY-u*2.2+Math.sin(t*6)*u*.15);g.rotate(Math.sin(t*4)*.12);drawBoard(g,u*.9,o,0,0);g.restore();}
 hands.forEach(([hx,hy],i)=>{const s=i?1:-1,ax=s*u*.75,ay=shY+u*.35,x2=hx*u+(kind==='arms'||kind==='horns'?Math.sin(W+i)*u*.12:0),y2=shY+hy*u;
  limb(g,ax,ay,x2,y2,u*1.0,kind==='flex'?-s:s,u*.38,skin);g.strokeStyle=o.shirt;g.lineWidth=u*.5;g.beginPath();g.moveTo(ax,ay);g.lineTo(ax+(x2-ax)*.3,ay+(y2-ay)*.3);g.stroke();
  g.fillStyle=skin;ell(g,x2,y2,u*.24,u*.24);g.fill();g.strokeStyle=skin;g.lineWidth=u*.11;
  if(kind==='horns'){for(const f of [-.15,.15]){g.beginPath();g.moveTo(x2+f*u,y2-u*.1);g.lineTo(x2+f*u*1.6,y2-u*.6);g.stroke();}}
  else if(kind==='shaka'){g.beginPath();g.moveTo(x2,y2);g.lineTo(x2-s*u*.45,y2-u*.25);g.moveTo(x2,y2);g.lineTo(x2+s*u*.45,y2+u*.2);g.stroke();}
  else if(kind==='point'&&i===1){g.beginPath();g.moveTo(x2,y2);g.lineTo(x2+u*.15,y2+u*.55);g.stroke();}
  else if(kind==='flex'){g.fillStyle=skin;ell(g,ax+(x2-ax)*.6,ay+(y2-ay)*.6-u*.18,u*.32,u*.24);g.fill();}});
 if(head)drawHead(g,head,0,shY+u*.15,u*3.6,Math.sin(t*5)*.06,1,hat);
 g.restore();}
// A skater lying after a slam (rotated by the caller), arms and legs splayed
function drawSlammed(g,u,head,o,t){g.save();g.rotate(Math.PI/2);drawSkater(g,u,{crouch:.1,arms:[2.2,.6,-2.4,-.4],noBoard:true,lean:Math.sin(t*9)*.05},null,o);g.restore();if(head)drawHead(g,head,-u*3.2,-u*.4,u*3,-Math.PI/2+.3,1);}

// ------------------------------------------------------------------ sparks, the special trail
function spark(g,x,y,vx,vy,a){g.strokeStyle=`rgba(255,${180+Math.random()*70|0},60,${a})`;g.lineWidth=1.6;g.beginPath();g.moveTo(x,y);g.lineTo(x-vx*.03,y-vy*.03);g.stroke();}

Object.assign(exports,{thps,font,FONT,clamp,shade,rnd,GEM_COLORS,drawGem,gemSprite,deckGeometry,makeDeck,makePark,pipeGeo,pipePoint,drawSkater,drawSlammed,drawBoard,drawHead,OUTFITS,spark,ell,canvas,drawPipe,fisheye,vhs,hatFor,drawSkaterFront});
