// Drawing for the Sonic 3 engine (stand-in art until the sprite kit is in): the terrain is painted pixel for pixel from
// the collision tiles (terrain.js) into 256 px chunk canvases, built lazily a couple per frame and kept in a small cache,
// so what you see is exactly what you stand on. Parallax backdrop (sky, clouds, sea, far island, jungle) from cached
// strips. Objects, effects and the runners (Sonic and Tails bodies wearing the player's face) are vector drawings in
// world px. The HUD is Sonic 3's SCORE / TIME / RINGS block. Everything is drawn with the camera (camera.js): world px
// times cam.k, image smoothing off, so the chunks keep their hard pixel edges.
const CH=256,M=12;
const SP=require("src/data/sonic3Sprites.js");
// the owner's art (src/data/sonic3Sprites.js), drawn when it is in; every caller falls back to the drawn stand-in.
// spr: one frame of a sheet with its foot point at (px,py) in world px; o = {flip,alpha,rot,sx,sy}
function spr(x,name,row,fr,px,py,o={}){const S=SP.sheet(name);if(!S)return false;const d=S.def,ri=Object.keys(d.rows).indexOf(row);if(ri<0)return false;
 const n=d.rows[row],[fw,fh]=d.frame,[fx,fy]=d.foot,r=S.res;fr=((Math.floor(fr)%n)+n)%n;x.save();x.translate(px,py);if(o.rot)x.rotate(o.rot);
 x.scale((o.flip?-1:1)*(o.sx||1),o.sy||1);if(o.alpha!=null)x.globalAlpha*=o.alpha;const sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;
 x.drawImage(S.img,fr*fw*r,ri*fh*r,fw*r,fh*r,-fx,-fy,fw,fh);x.imageSmoothingEnabled=sm;x.restore();return true;}
// a picture at its own size (stored at 2x) with its anchor (ax,ay = fractions of its size) at (px,py)
function pic(x,name,px,py,ax=.5,ay=1,o={}){const im=SP.picture(name);if(!im)return false;const w=(o.w||im.width/2),h=(o.h||(o.w?im.height/2*o.w/(im.width/2):im.height/2));
 x.save();x.translate(px,py);if(o.rot)x.rotate(o.rot);if(o.flip)x.scale(-1,1);if(o.alpha!=null)x.globalAlpha*=o.alpha;const sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;
 x.drawImage(im,-w*ax,-h*ay,w,h);x.imageSmoothingEnabled=sm;x.restore();return true;}
// a picture repeated along x from x0 to x1 (clipped), top at y, scaled to height h
function stripX(x,name,x0,x1,y,h,phase=0){const im=SP.picture(name);if(!im)return false;const w=im.width/2*h/(im.height/2);x.save();x.beginPath();x.rect(x0,y-1,x1-x0,h+2);x.clip();
 const sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;let s0=x0-((x0+phase)%w+w)%w;for(let xx=s0;xx<x1;xx+=w-.5)x.drawImage(im,xx,y,w,h);x.imageSmoothingEnabled=sm;x.restore();return true;}
const hex=h=>{const n=parseInt(h.slice(1),16);return 0xff000000|(n&255)<<16|(n>>8&255)<<8|n>>16;};// ABGR for Uint32 ImageData
const PAL={
 jungle:{grassHi:'#c8f070',grass:'#58c428',grass2:'#48b020',grassLo:'#1e6e18',soilA:'#c27a34',soilB:'#a6622a',soilLine:'#7a4218',
  outline:'#2a1408',under:'#5e3214',wood:'#d29848',woodLine:'#7a4a18',
  sky:['#1c4cc8','#4c8ef0','#a8d8ff'],sea:['#2a62d8','#1a44a8'],far:'#3e9c8c',far2:'#2c7a70',jungle:'#2a7a2c',jungle2:'#1c5a22',trunk:'#5a3a1c'}};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};

// the ground textures, once their pictures are in: pixel arrays at game size + where the surface sits in each strip
// (grass: g0 = first fully solid row, blades above it; under: u0 = last fully solid row, roots below it)
let TEX=null;
function texInfo(){if(TEX)return TEX;const soil=SP.picture('jungle-soil'),grass=SP.picture('jungle-grass'),under=SP.picture('jungle-under');if(!soil||!grass||!under)return null;
 const px=(im,w,h)=>{const c=mk(w,h),g=c.getContext('2d');g.imageSmoothingEnabled=true;g.drawImage(im,0,0,w,h);return {w,h,d:new Uint32Array(g.getImageData(0,0,w,h).data.buffer)};};
 const S=px(soil,64,64),G=px(grass,Math.round(grass.width/2),Math.round(grass.height/2)),U=px(under,Math.round(under.width/2),Math.round(under.height/2));
 const full=(T,y)=>{let n=0;for(let x=0;x<T.w;x++)if((T.d[y*T.w+x]>>>24)>128)n++;return n>T.w*.97;};
 let g0=0;while(g0<G.h-1&&!full(G,g0))g0++;let u0=U.h-1;while(u0>0&&!full(U,u0))u0--;
 TEX={S,G,U,g0,u0};return TEX;}
// ---------------- terrain chunks
class TerrainArt{
 constructor(T,pal=PAL.jungle){this.T=T;this.pal=pal;this.cache=new Map();this.max=72;
  this.c={};for(const [k,v] of Object.entries(pal))if(typeof v==='string')this.c[k]=hex(v);}
 key(cx,cy){return cy*4096+cx;}
 // build the chunk now (or return the cached one); null = empty
 get(cx,cy){const k=this.key(cx,cy);if(this.cache.has(k)){const v=this.cache.get(k);this.cache.delete(k);this.cache.set(k,v);return v;}
  const v=this.build(cx,cy);this.cache.set(k,v);
  if(this.cache.size>this.max){for(const [kk,vv] of this.cache){this.cache.delete(kk);if(vv){vv.width=0;vv.height=0;}if(this.cache.size<=this.max)break;}}
  return v;}
 has(cx,cy){return this.cache.has(this.key(cx,cy));}
 build(cx,cy){const T=this.T,L=T.L,N=CH+2*M,X0=cx*CH-M,Y0=cy*CH-M,S=new Uint8Array(N*N);let any=false;
  const tx0=Math.floor(X0/16),tx1=Math.floor((X0+N-1)/16),ty0=Math.floor(Y0/16),ty1=Math.floor((Y0+N-1)/16);
  for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){const ma=L.all.mask(tx,ty),mA=L.a.mask(tx,ty),mB=L.b.mask(tx,ty),mt=L.top.mask(tx,ty);
   if(!ma&&!mA&&!mB&&!mt)continue;
   for(let r=0;r<16;r++){const gy=ty*16+r-Y0;if(gy<0||gy>=N)continue;const bits=(ma?ma[r]:0)|(mA?mA[r]:0)|(mB?mB[r]:0),tb=mt?mt[r]:0;if(!bits&&!tb)continue;
    for(let c=0;c<16;c++){const gx=tx*16+c-X0;if(gx<0||gx>=N)continue;if(bits>>c&1)S[gy*N+gx]=1;else if(tb>>c&1)S[gy*N+gx]=2;
     if(!any&&gx>=M&&gy>=M&&gx<M+CH&&gy<M+CH)any=true;}}}
  if(!any)return null;
  const can=mk(CH,CH),g=can.getContext('2d'),img=g.createImageData(CH,CH),u=new Uint32Array(img.data.buffer),C=this.c;
  const X=texInfo();if(X)this.textured=true;
  if(X){const {S:ST,G,U,g0,u0}=X,solid=(gx,gy)=>S[gy*N+gx]===1;
   for(let y=0;y<CH;y++){const gy=y+M,wy=cy*CH+y;for(let x=0;x<CH;x++){const gx=x+M,s=S[gy*N+gx],wx=cx*CH+x;
    if(s===2){u[y*CH+x]=solid(gx,gy+1)&&!solid(gx,gy-1)?C.woodLine:(wx&7)===0?C.woodLine:C.wood;continue;}
    if(!s){// air: grass blades above a surface, roots under an overhang
     let d=1;while(d<=g0&&gy+d<N&&!S[(gy+d)*N+gx])d++;
     if(d<=g0&&gy+d<N&&S[(gy+d)*N+gx]===1){const c=G.d[(g0-d)*G.w+((wx%G.w)+G.w)%G.w];if((c>>>24)>128){u[y*CH+x]=c;continue;}}
     let e=1;while(e<=U.h-1-u0&&gy-e>=0&&!S[(gy-e)*N+gx])e++;
     if(e<=U.h-1-u0&&gy-e>=0&&S[(gy-e)*N+gx]===1){const c=U.d[(u0+e)*U.w+((wx%U.w)+U.w)%U.w];if((c>>>24)>128)u[y*CH+x]=c;}
     continue;}
    let up=0;while(up<M&&gy-1-up>=0&&S[(gy-1-up)*N+gx]===1)up++;
    let dn=0;while(dn<M&&gy+1+dn<N&&S[(gy+1+dn)*N+gx]===1)dn++;
    let col;
    if(up<G.h-g0&&up<M){const c=G.d[(g0+up)*G.w+((wx%G.w)+G.w)%G.w];col=(c>>>24)>128?c:0;}
    if(!col&&dn<=u0&&dn<M){const c=U.d[(u0-dn)*U.w+((wx%U.w)+U.w)%U.w];col=(c>>>24)>128?c:0;}
    if(!col)col=ST.d[(((wy%64)+64)%64)*64+(((wx%64)+64)%64)];
    if(up>0&&(!S[gy*N+gx-1]||!S[gy*N+gx+1]))col=C.outline;
    u[y*CH+x]=col|0xff000000;}}
   g.putImageData(img,0,0);return can;}
  for(let y=0;y<CH;y++){const gy=y+M,wy=cy*CH+y;for(let x=0;x<CH;x++){const gx=x+M,s=S[gy*N+gx];if(!s)continue;const wx=cx*CH+x;
   const air=(dx,dy)=>!S[(gy+dy)*N+gx+dx];
   if(s===2){u[y*CH+x]=air(0,1)||air(0,-1)?C.woodLine:(wx&7)===0?C.woodLine:C.wood;continue;}
   let up=0;while(up<M&&S[(gy-1-up)*N+gx]===1)up++;
   const blade=(wx*13)%7<2?2:(wx*5)%3===0?1:0,gh=6+blade;let col;
   if(up===0)col=C.grassHi;else if(up<gh)col=(wx>>2&1)?C.grass:C.grass2;else if(up<gh+2)col=C.grassLo;
   else{const tile=(wx&15)===15||(wy&15)===15;col=tile?C.soilLine:((wx>>4)+(wy>>4))&1?C.soilA:C.soilB;
    if(air(0,1)||air(0,2)||air(0,3))col=C.under;}
   if(up>0&&(air(-1,0)||air(1,0)||air(0,1)))col=C.outline;
   u[y*CH+x]=col;}}
  g.putImageData(img,0,0);return can;}
 // draw what the camera sees; builds at most `budget` new chunks this frame (the rest show next frame)
 draw(x,cam,budget=2){const v=cam.view(),k=cam.k;
  // the ground pictures came in: drop the chunks drawn without them, ONCE (textured is set here; it used to be set only
  // when a chunk WITH ground was built, so a view whose first chunks were empty sky cleared the cache every frame and
  // never got to the ground: the owner's invisible ground at the start of Act 2, Nov 11)
  if(!this.textured&&texInfo()){this.textured=true;for(const [,vv] of this.cache)if(vv){vv.width=0;vv.height=0;}this.cache.clear();}
  for(let cy=Math.floor(v.y0/CH);cy<=Math.floor(v.y1/CH);cy++)for(let cx=Math.floor(v.x0/CH);cx<=Math.floor(v.x1/CH);cx++){
   if(cx<0||cy<0||cx*CH>=this.T.w||cy*CH>=this.T.h)continue;
   if(!this.has(cx,cy)){if(budget<=0)continue;budget--;}
   const c=this.get(cx,cy);if(!c)continue;
   const sx=Math.round((cx*CH-cam.x)*k),sy=Math.round((cy*CH-cam.y)*k),ex=Math.round(((cx+1)*CH-cam.x)*k),ey=Math.round(((cy+1)*CH-cam.y)*k);
   x.drawImage(c,sx,sy,ex-sx,ey-sy);}}
 warm(cam,margin=CH){const v=cam.view(margin);for(let cy=Math.floor(v.y0/CH);cy<=Math.floor(v.y1/CH);cy++)for(let cx=Math.floor(v.x0/CH);cx<=Math.floor(v.x1/CH);cx++)if(cx>=0&&cy>=0&&cx*CH<this.T.w&&cy*CH<this.T.h)this.get(cx,cy);}
}

// a darkened copy of a picture (once), for a nearer, shadier parallax layer
function darker(im,k){const c=mk(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);try{const d=g.getImageData(0,0,c.width,c.height),a=d.data;
 for(let i=0;i<a.length;i+=4){a[i]*=k;a[i+1]*=k*1.04;a[i+2]*=k*.95;}g.putImageData(d,0,0);}catch{}return c;}
// ---------------- parallax backdrop
class Backdrop{
 constructor(pal=PAL.jungle){this.pal=pal;this.strips=null;}
 make(){const P=this.pal,S={};
  // clouds 640x90
  {const c=mk(640,90),g=c.getContext('2d');let seed=7;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
   for(let k=0;k<9;k++){const cx=r()*640,cy=20+r()*50,w=40+r()*70;for(const [dx,dy,rr,col] of [[0,6,w*.5,'#d8ecff'],[0,0,w*.42,'#fff'],[-w*.35,6,w*.28,'#fff'],[w*.35,7,w*.3,'#f2f8ff']]){g.fillStyle=col;for(const off of [-640,0,640]){g.beginPath();g.ellipse(cx+dx+off,cy+dy,rr,rr*.42,0,0,7);g.fill();}}}
   S.clouds=c;}
  // far island 512x110
  {const c=mk(512,110),g=c.getContext('2d');g.fillStyle=P.far2;g.beginPath();g.moveTo(0,110);for(let x=0;x<=512;x+=8)g.lineTo(x,70-24*Math.sin(x/512*Math.PI*2)-10*Math.sin(x/512*Math.PI*6));g.lineTo(512,110);g.fill();
   g.fillStyle=P.far;g.beginPath();g.moveTo(0,110);for(let x=0;x<=512;x+=8)g.lineTo(x,86-14*Math.sin(x/512*Math.PI*4+1)-6*Math.sin(x/512*Math.PI*10));g.lineTo(512,110);g.fill();S.far=c;}
  // jungle 512x140: palm silhouettes over a canopy
  {const c=mk(512,140),g=c.getContext('2d');const palm=(px,base,h,col)=>{g.strokeStyle=P.trunk;g.lineWidth=5;g.beginPath();g.moveTo(px,base);g.quadraticCurveTo(px+10,base-h*.5,px+4,base-h);g.stroke();
    g.fillStyle=col;for(let k=0;k<6;k++){const a=-Math.PI/2+(k-2.5)*.55;g.beginPath();g.moveTo(px+4,base-h);g.quadraticCurveTo(px+4+Math.cos(a)*28,base-h+Math.sin(a)*28-10,px+4+Math.cos(a)*46,base-h+Math.sin(a)*46+10);g.quadraticCurveTo(px+4+Math.cos(a)*24,base-h+Math.sin(a)*24,px+4,base-h);g.fill();}};
   for(const [px,h] of [[40,90],[150,70],[230,104],[330,80],[440,96]])palm(px,140,h,P.jungle2);
   g.fillStyle=P.jungle;g.beginPath();g.moveTo(0,140);for(let x=0;x<=512;x+=4)g.lineTo(x,104-8*Math.sin(x/32)-6*Math.sin(x/11+2));g.lineTo(512,140);g.fill();S.jungle=c;}
  this.strips=S;}
 // camRef = the camera's y with the runner standing on the main floor: there the horizon sits at 42% of the view; the
 // backdrop moves 15% as much as the level when the camera rises or falls
 draw(x,cam,t,camRef){if(!this.strips)this.make();const P=this.pal,S=this.strips,W=cam.W,H=cam.H,k=cam.k;
  const hz=Math.round((cam.vh*.42-(cam.y-camRef)*.15)*k);
  const pic=n=>SP.picture(n),sky=pic('jungle-sky'),cl=pic('jungle-clouds'),isl=pic('jungle-island'),sea=pic('jungle-sea'),far=pic('jungle-far'),near=pic('jungle-near');
  if(sky&&cl&&isl&&sea&&far&&near){const sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;
   // every other tile is drawn mirrored (owner's idea): a mirrored copy always meets the tile beside it exactly, so the
   // mountains/trees no longer jump at the seams where the art's left and right edges didn't match
   const rep2=(im,f,yTop,h,drift=0)=>{const w=im.width/2*k*(h?h/(im.height/2*k):1),hh=h||im.height/2*k;if(yTop>H||yTop+hh<0)return;
    const start=(cam.x*f+drift)*k,i0=Math.floor(start/w),W1=Math.ceil(w)+1,H1=Math.ceil(hh)+1,Y=Math.round(yTop);
    for(let i=i0,xx=i0*w-start;xx<W;i++,xx+=w){const X=Math.round(xx);if(i&1){x.save();x.translate(X+W1-1,Y);x.scale(-1,1);x.drawImage(im,0,0,W1,H1);x.restore();}else x.drawImage(im,X,Y,W1,H1);}};
   const skyW=sky.width/2*k;if(hz>0){let ox=-((cam.x*.02)*k)%skyW;if(ox>0)ox-=skyW;for(let xx=ox;xx<W;xx+=skyW)x.drawImage(sky,Math.round(xx),0,Math.ceil(skyW)+1,hz+1);}
   rep2(cl,.04,hz-150*k,0,t*6);rep2(isl,.12,hz-isl.height/2*k+2*k);
   const jb=hz+110*k;if(hz<H){const sh=sea.height/2*k;for(let yy=hz,r=0;yy<jb;yy+=sh-1,r++)rep2(sea,.16+r*.04,yy,0,t*(4+r*2));
    // the near layer: the jungle-near strip has its canopies cut flat at the top (in the art; on the redo list), so the
    // far treetops are drawn again bigger and darker as the near layer until a new strip comes in
    if(!this.nearAlt)this.nearAlt=darker(far,.62);
    rep2(far,.3,jb-far.height/2*k);const nb=jb+90*k,nh=far.height/2*k*1.55;rep2(this.nearAlt,.45,nb-nh+8*k,nh);if(nb<H){x.fillStyle='#0f2a12';x.fillRect(0,Math.round(nb)-1,W,H-nb+1);}}
   x.imageSmoothingEnabled=sm;return;}
  let g=x.createLinearGradient(0,Math.min(0,hz-cam.vh*k),0,Math.max(1,hz));g.addColorStop(0,P.sky[0]);g.addColorStop(.6,P.sky[1]);g.addColorStop(1,P.sky[2]);x.fillStyle=g;x.fillRect(0,0,W,Math.max(0,hz));
  const rep=(c,f,yTop,drift=0)=>{const w=c.width*k,h=c.height*k;if(yTop>H||yTop+h<0)return;let ox=-((cam.x*f+drift)*k)%w;if(ox>0)ox-=w;for(let xx=ox;xx<W;xx+=w)x.drawImage(c,Math.round(xx),Math.round(yTop),Math.ceil(w)+1,Math.ceil(h));};
  rep(S.clouds,.04,hz-150*k,t*6);
  rep(S.far,.12,hz-(S.far.height-12)*k);
  if(hz<H){g=x.createLinearGradient(0,hz,0,hz+80*k);g.addColorStop(0,P.sea[0]);g.addColorStop(1,P.sea[1]);x.fillStyle=g;x.fillRect(0,hz,W,H-hz);
   x.fillStyle='rgba(255,255,255,.5)';for(let r=0;r<6;r++){const yy=hz+6*k+r*9*k,step=60*k;let ox=-((cam.x*(.16+r*.03)+t*(8+r*3))*k)%step;if(ox>0)ox-=step;for(let xx=ox;xx<W;xx+=step)x.fillRect(Math.round(xx+(r*17%40)*k),Math.round(yy),Math.round((10+r*2)*k),Math.max(1,Math.round(k)));}
   const jb=hz+110*k;rep(S.jungle,.3,jb-S.jungle.height*k);if(jb<H){x.fillStyle=P.jungle;x.fillRect(0,Math.round(jb)-1,W,H-jb+1);}}}
}

// ---------------- scenery (no collision): lakes behind the ground, waterfalls over cliff faces, palms
function drawDecor(x,d,t){
 // a cliff under a ledge, reaching the ground: darker checkered rock you walk in front of (drawn behind the terrain)
 if(d.type==='cliff'){const rock=SP.picture('jungle-rock');const col=(x0,x1)=>{x.save();x.beginPath();x.rect(x0,d.y+4,x1-x0,d.y1-d.y);x.clip();x.fillStyle='#9a5a26';x.fillRect(x0,d.y,x1-x0,d.y1-d.y+8);x.fillStyle='#7c4418';
   if(rock){const sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;for(let yy=d.y;yy<d.y1+8;yy+=48)for(let xx=x0-((x0%48)+48)%48;xx<x1;xx+=48)x.drawImage(rock,xx,yy,48,48);x.imageSmoothingEnabled=sm;}
   else for(let yy=Math.floor(d.y/32)*32;yy<d.y1+8;yy+=32)for(let xx=Math.floor(x0/32)*32+(((yy/32)&1)?32:0);xx<x1;xx+=64)x.fillRect(xx,yy,32,32);
   const g=x.createLinearGradient(x0,0,x1,0);g.addColorStop(0,'rgba(30,12,2,.5)');g.addColorStop(.18,'rgba(30,12,2,0)');g.addColorStop(.82,'rgba(30,12,2,0)');g.addColorStop(1,'rgba(30,12,2,.55)');x.fillStyle=g;x.fillRect(x0,d.y,x1-x0,d.y1-d.y+8);
   x.fillStyle='rgba(30,12,2,.45)';x.fillRect(x0,d.y+4,x1-x0,14);x.restore();x.strokeStyle='#2a1408';x.lineWidth=1.5;x.beginPath();x.moveTo(x0,d.y+4);x.lineTo(x0,d.y1);x.moveTo(x1,d.y+4);x.lineTo(x1,d.y1);x.stroke();};
  if(d.legs){const n=d.legs,lw=Math.min(110,(d.x1-d.x0)/(n*1.6));for(let k=0;k<n;k++){const cx=d.x0+lw/2+6+(d.x1-d.x0-lw-12)*k/(n-1);col(cx-lw/2,cx+lw/2);}
   x.fillStyle='#9a5a26';x.fillRect(d.x0+2,d.y+4,d.x1-d.x0-4,26);x.fillStyle='rgba(30,12,2,.4)';x.fillRect(d.x0+2,d.y+22,d.x1-d.x0-4,8);}
  else col(d.x0+4,d.x1-4);return;}
 // a floating chunk of land under a ledge: checkered earth with a ragged underside and a grass cap
 if(d.type==='land'&&texInfo()){const X=texInfo(),w=d.x1-d.x0,dep=d.depth||44,uh=X.U.h,gh=X.G.h;
  const soil=SP.picture('jungle-soil');x.save();x.beginPath();x.rect(d.x0,d.y,w,Math.max(2,dep-uh+X.u0));x.clip();const sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;
  for(let yy=d.y;yy<d.y+dep;yy+=64)for(let xx=d.x0-((d.x0%64)+64)%64;xx<d.x1;xx+=64)x.drawImage(soil,xx,yy,64,64);x.imageSmoothingEnabled=sm;x.restore();
  stripX(x,'jungle-under',d.x0,d.x1,d.y+Math.max(2,dep-uh+X.u0)-X.u0,uh);stripX(x,'jungle-grass',d.x0-2,d.x1+2,d.y-X.g0,gh);return;}
 if(d.type==='land'){const w=d.x1-d.x0,dep=d.depth||44,n=Math.max(2,Math.round(w/28));x.save();x.beginPath();x.moveTo(d.x0-2,d.y+2);x.lineTo(d.x1+2,d.y+2);x.lineTo(d.x1-3,d.y+dep*.55);
  for(let k=n;k>=0;k--){const xx=d.x0+4+(w-8)*k/n,lump=(k%2?dep:dep*.72)+((k*37)%9)-(Math.abs(k-n/2)/(n/2))*dep*.25;x.lineTo(xx,d.y+lump);}
  x.lineTo(d.x0+3,d.y+dep*.55);x.closePath();x.fillStyle='#c27a34';x.fill();x.save();x.clip();x.fillStyle='#a6622a';
  for(let yy=Math.floor(d.y/32)*32;yy<d.y+dep+8;yy+=32)for(let xx=Math.floor(d.x0/32)*32+(((yy/32)&1)?32:0);xx<d.x1+4;xx+=64)x.fillRect(xx,yy,32,32);
  x.fillStyle='rgba(60,28,8,.35)';x.fillRect(d.x0-4,d.y+dep*.5,w+8,dep);x.restore();x.strokeStyle='#2a1408';x.lineWidth=1.5;x.stroke();x.restore();
  x.fillStyle='#1e6e18';for(let xx=d.x0-2;xx<d.x1+2;xx+=6)x.fillRect(xx,d.y+6,4,3+((xx/6)&1)*2);
  x.fillStyle='#58c428';x.fillRect(d.x0-3,d.y-2,w+6,9);x.fillStyle='#c8f070';x.fillRect(d.x0-3,d.y-2,w+6,2);x.fillStyle='#48b020';for(let xx=d.x0;xx<d.x1;xx+=8)x.fillRect(xx,d.y+3,4,2);return;}
 if(d.type==='hollow'){x.fillStyle='#4a2a12';x.beginPath();d.pts.forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py));x.closePath();x.fill();
  x.fillStyle='#3a1f0c';const b=d.box;for(let yy=Math.floor(b[1]/32)*32;yy<b[3];yy+=32)for(let xx=Math.floor(b[0]/32)*32+((yy/32)&1)*32;xx<b[2];xx+=64){x.save();x.clip();x.fillRect(xx,yy,32,32);x.restore();}return;}
 if(d.type==='lake'){const g=x.createLinearGradient(0,d.y,0,d.y+d.h);g.addColorStop(0,'rgba(120,200,255,.85)');g.addColorStop(1,'rgba(40,110,220,.9)');x.fillStyle=g;x.fillRect(d.x,d.y,d.w,d.h);
  x.fillStyle='rgba(255,255,255,.7)';for(let k=0;k<d.w;k+=24){const xx=d.x+(k+t*18)%d.w;x.fillRect(xx,d.y+Math.sin(t*3+k)*1.5,12,2);}
  x.fillStyle='rgba(255,255,255,.18)';for(let r=1;r<4;r++)for(let k=0;k<d.w;k+=64){const xx=d.x+(k+r*23+t*(8+r*4))%d.w;x.fillRect(xx,d.y+d.h*r/4,Math.min(20,d.x+d.w-xx),2);}return;}
 if(d.type==='waterfall'&&SP.sheet('waterfall')){const W8=SP.sheet('waterfall'),r=W8.res,[fw,fh]=W8.def.frame,fr=Math.floor(t*8)%4,sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;
  const top=.08,mid=.7,bot=.22,band=fh*(mid-top)*d.w/fw,foot=fh*bot*d.w/fw,sx=fr*fw*r;x.save();x.beginPath();x.rect(d.x-4,d.y,d.w+8,d.h);x.clip();
  for(let yy=d.y;yy<d.y+d.h-foot;yy+=band-1)x.drawImage(W8.img,sx,fh*top*r,fw*r,fh*(mid-top)*r,d.x,yy,d.w,band);
  x.drawImage(W8.img,sx,fh*(1-bot)*r,fw*r,fh*bot*r,d.x,d.y+d.h-foot,d.w,foot);x.restore();x.imageSmoothingEnabled=sm;return;}
 if(d.type==='bush'){pic(x,'bush',d.x,d.y+2);return;}
 if(d.type==='totem'){pic(x,'totem',d.x,d.y+2);return;}
 if(d.type==='flower'){spr(x,'flower','sway',t*5+d.x*.01,d.x,d.y+1);return;}
 // a log bridge; `gaps` = stretches whose planks are crumbling platforms (they draw themselves and fall: owner, Nov 11)
 if(d.type==='bridge'){let a=d.x0;for(const [g0,g1] of d.gaps||[]){if(g0>a)stripX(x,'bridge',a,g0,d.y-17,26);a=Math.max(a,g1);}if(a<d.x1)stripX(x,'bridge',a,d.x1,d.y-17,26);return;}
 if(d.type==='waterfall'){x.fillStyle='#3a8af0';x.fillRect(d.x,d.y,d.w,d.h);const o=(t*220)%32;
  for(let c=0;c<d.w;c+=8){x.fillStyle=c/8%2?'rgba(170,220,255,.9)':'rgba(255,255,255,.75)';for(let yy=d.y-32+(o+c*5)%32;yy<d.y+d.h;yy+=32){const y0=Math.max(d.y,yy),y1=Math.min(d.y+d.h,yy+18);if(y1>y0)x.fillRect(d.x+c+1,y0,5,y1-y0);}}
  x.fillStyle='rgba(255,255,255,.9)';for(let k=0;k<5;k++)x.beginPath(),x.arc(d.x+d.w*(k+.5)/5+Math.sin(t*9+k)*3,d.y+d.h-3,6+Math.sin(t*12+k*2)*2,0,7),x.fill();return;}
 // a loop's foot (owner: the bases looked silly): solid soil flaring from the loop's outer band down into the ground, with a
 // grass edge, like the Mega Drive loops. side -1 = the entrance foot (drawn behind the runner), +1 = the exit foot (over)
 if(d.type==='loopfoot'&&d.poly)return;// terrain feet are painted with the ground (sonic3.js redraws the exit one over the runner)
 if(d.type==='loopfoot'){const {cx,cy,R,B,fy}=d,s=d.side,F=d.F||42,RB=R+B,n=14;
  // only above the ground line: from where the band's outer edge meets the ground, up the band to a1, then a curved fillet
  // (steep at the loop, flattening out) down to the ground F px out
  const ac=Math.asin(Math.min(1,(fy-cy)/RB)),a0=s>0?ac:Math.PI-ac,a1=s>0?Math.PI*.17:Math.PI*.83;
  const tx=cx+Math.cos(a1)*RB,ty=cy+Math.sin(a1)*RB,ex=tx+s*F,qx=tx+s*F*.12,qy=fy;
  const path=()=>{x.beginPath();for(let k=0;k<=n;k++){const a=a0+(a1-a0)*k/n,px=cx+Math.cos(a)*RB,py=cy+Math.sin(a)*RB;k?x.lineTo(px,py):x.moveTo(px,py);}x.quadraticCurveTo(qx,qy,ex,fy+1);x.closePath();};
  x.save();path();const soil=SP.picture('jungle-soil');if(soil){const pat=x.createPattern(soil,'repeat');try{pat.setTransform(new DOMMatrix().scale(.5));}catch{}x.fillStyle=pat;}else x.fillStyle='#c8692a';x.fill();
  // shade toward the loop so the foot reads as a solid block standing in front
  const g=x.createLinearGradient(tx,0,ex,0);g.addColorStop(0,'rgba(50,15,0,.28)');g.addColorStop(1,'rgba(50,15,0,0)');x.fillStyle=g;x.fill();
  // grass along the fillet: a dark rim, a light band, then blades sticking up
  x.lineCap='round';x.lineJoin='round';x.beginPath();x.moveTo(tx,ty);x.quadraticCurveTo(qx,qy,ex,fy);x.strokeStyle='#1b5a0c';x.lineWidth=9;x.stroke();x.strokeStyle='#4caf22';x.lineWidth=6;x.stroke();x.strokeStyle='#8ee04a';x.lineWidth=2;x.stroke();
  x.fillStyle='#4caf22';x.strokeStyle='#1b5a0c';x.lineWidth=1;for(let k=1;k<10;k++){const u=k/10,bx=(1-u)*(1-u)*tx+2*(1-u)*u*qx+u*u*ex,by=(1-u)*(1-u)*ty+2*(1-u)*u*qy+u*u*fy;
   x.beginPath();x.moveTo(bx-2.5,by+1);x.lineTo(bx+s*1.5,by-6-(k%3)*1.5);x.lineTo(bx+2.5,by+1);x.closePath();x.fill();x.stroke();}
  x.restore();return;}
 // palms vary (owner: repetitive): mirrored and a little bigger/smaller per tree (d.flip, d.s set by the zone)
 if(d.type==='palm'&&SP.picture('palm')){const nm=d.alt&&SP.picture('palm-2')?'palm-2':'palm',im=SP.picture(nm),s=d.s||1;pic(x,nm,d.x,d.y+3,.5,1,{w:im.width/2*s,h:im.height/2*s,flip:!!d.flip});return;}
 if(d.type==='palm'){x.fillStyle='#8a5a2a';x.fillRect(d.x-3,d.y-70,6,70);x.fillStyle='#5a3a1a';for(let k=0;k<7;k++)x.fillRect(d.x-3,d.y-66+k*10,6,2);
  x.fillStyle='#2e9a2c';for(let k=0;k<6;k++){const a=-Math.PI/2+(k-2.5)*.55+Math.sin(t*1.5+d.x)*.04;x.save();x.translate(d.x,d.y-70);x.rotate(a);x.beginPath();x.ellipse(18,0,20,5,0,0,7);x.fill();x.restore();}
  x.fillStyle='#58c428';for(let k=0;k<6;k++){const a=-Math.PI/2+(k-2.5)*.55;x.save();x.translate(d.x,d.y-70);x.rotate(a);x.beginPath();x.ellipse(16,-1,15,2.5,0,0,7);x.fill();x.restore();}return;}
}
// ---------------- objects
const ringPath=(x,cx,cy,r,ph,alpha=1)=>{const w=Math.abs(Math.cos(ph))*r;x.save();x.globalAlpha*=alpha;x.lineWidth=3;x.strokeStyle='#a86a00';x.beginPath();x.ellipse(cx,cy,Math.max(1,w),r,0,0,7);x.stroke();
 x.lineWidth=2;x.strokeStyle='#ffd23a';x.beginPath();x.ellipse(cx,cy,Math.max(.6,w-.6),r-.6,0,0,7);x.stroke();if(w>3){x.strokeStyle='#fff6c0';x.lineWidth=1;x.beginPath();x.ellipse(cx,cy,w-1,r-1,0,3.6,4.6);x.stroke();}x.restore();};
const ROT={up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2,ur:Math.PI/4,ul:-Math.PI/4,dr:Math.PI*.75,dl:-Math.PI*.75};
function drawObject(x,o,t,ctx){
 switch(o.type){
 case 'ring':if(!o.got&&!spr(x,'ring','spin',t*10+o.x*.013,o.x,o.y))ringPath(x,o.x,o.y,7,t*4+o.x*.01);return;
 case 'spring':{if(SP.sheet('spring')){const diag=['ur','ul','dr','dl'].includes(o.dir),row=(o.color==='red'?'red':'yellow')+(diag?'Diag':''),side=o.dir==='left'||o.dir==='right',h=side?o.w:o.h;
   // owner: a spring stands tall, squashes as you land on it, then shoots back up (sheet: frame 0 tall, 1 half, 2 squashed).
   // o.pop counts 10 -> 0 after a launch: squash (10-8), half (7-6), overshoot tall (5-1), tall at rest
   const pf=o.pop>7?2:o.pop>5?1:0,over=o.pop>0&&o.pop<=5?1+.12*Math.sin((5-o.pop)/5*Math.PI):1;
   x.save();x.translate(o.x,o.y);x.rotate((ROT[o.dir]||0)-(diag?Math.PI/4:0));x.translate(0,h/2);x.scale(1,over);spr(x,'spring',row,pf,0,0);x.restore();return;}
  const c=o.color==='red'?['#e83030','#901818']:['#ffd828','#b08000'];const side=o.dir==='left'||o.dir==='right';const len=side?o.h:o.w;x.save();x.translate(o.x,o.y);x.rotate(ROT[o.dir]||0);
  const ext=o.pop>0?8*Math.sin(o.pop/10*Math.PI):0,h=side?o.w:o.h;// base at +h/2, plate at -h/2 - ext
  x.fillStyle='#5a5a66';x.fillRect(-len/2,h/2-4,len,4);x.strokeStyle='#c8c8d8';x.lineWidth=2;x.beginPath();for(let k=0;k<4;k++){const yy=h/2-4-(k+.5)*(h-4+ext)/4;x.moveTo(-len*.3,yy);x.lineTo(len*.3,yy);}x.stroke();
  x.fillStyle=c[0];x.fillRect(-len/2,-h/2-ext,len,5);x.fillStyle=c[1];x.fillRect(-len/2,-h/2-ext+4,len,2);x.restore();return;}
 case 'spikes':{x.save();x.translate(o.x,o.y);x.rotate(ROT[o.dir]||0);const side=o.dir==='left'||o.dir==='right',w=side?o.h:o.w,h=side?o.w:o.h,n=Math.max(1,Math.round(w/8));
  if(stripX(x,'spikes',-w/2,w/2,-h/2-1,h+1)){x.restore();return;}
  x.fillStyle='#6a6a78';x.fillRect(-w/2,h/2-4,w,4);for(let k=0;k<n;k++){const x0=-w/2+k*w/n;x.fillStyle='#e8e8f4';x.beginPath();x.moveTo(x0,h/2-3);x.lineTo(x0+w/n/2,-h/2);x.lineTo(x0+w/n,h/2-3);x.fill();x.fillStyle='#9898a8';x.beginPath();x.moveTo(x0+w/n/2,-h/2);x.lineTo(x0+w/n,h/2-3);x.lineTo(x0+w/n/2,h/2-3);x.fill();}x.restore();return;}
 case 'monitor':{const w=o.w,h=o.h,x0=o.x-w/2,y0=o.y-h/2;
  if(SP.sheet('monitor')){if(o.broken){spr(x,'monitor','broken',0,o.x,o.y+h/2);if(o.timer>0||o.rise<40){x.save();x.translate(o.x,o.y-Math.min(o.rise||0,32));x.globalAlpha=o.timer>0?1:Math.max(0,1-((o.rise||0)-32)/8);monitorIcon(x,o.item,0,0,ctx,o.giveIdx);x.restore();}return;}
   const by=o.bump>0?-Math.sin(o.bump/8*Math.PI)*3:0,stat=((t*30)|0)%9>=7;spr(x,'monitor','box',stat?1:0,o.x,o.y+h/2+by);
   if(!stat){const sy=o.y-h*.1+by;x.fillStyle='#10121c';x.fillRect(o.x-w*.27,sy-h*.2,w*.54,h*.4);monitorIcon(x,o.item,o.x,sy,ctx,null);}return;}
  if(o.broken){x.fillStyle='#4a4a52';x.fillRect(x0+2,o.y+h/2-6,w-4,6);if(o.timer>0||o.rise<40){x.save();x.translate(o.x,o.y-Math.min(o.rise||0,32)*1);x.globalAlpha=o.timer>0?1:Math.max(0,1-((o.rise||0)-32)/8);monitorIcon(x,o.item,0,0,ctx,o.giveIdx);x.restore();}return;}
  const by=o.bump>0?-Math.sin(o.bump/8*Math.PI)*3:0;x.save();x.translate(0,by);x.fillStyle='#2c2c34';x.fillRect(x0,y0,w,h);x.fillStyle='#b8b8c8';x.fillRect(x0+2,y0+2,w-4,h-8);x.fillStyle='#1a1a22';x.fillRect(x0+4,y0+4,w-8,h-13);
  x.save();x.beginPath();x.rect(x0+4,y0+4,w-8,h-13);x.clip();if(((t*30)|0)%9<7)monitorIcon(x,o.item,o.x,y0+4+(h-13)/2,ctx,null);else{x.fillStyle='#fff';for(let k=0;k<6;k++)x.fillRect(x0+4,y0+5+k*3,w-8,1);}x.restore();
  x.fillStyle='#606070';x.fillRect(x0+6,y0+h-5,4,5);x.fillRect(x0+w-10,y0+h-5,4,5);x.restore();return;}
 case 'badnik':if(o.hidden)return;if(o.alive||o.kind==='thrower')drawBadnik(x,o,t);return;
 case 'corkscrew':drawCorkscrew(x,o,t,false);return;
 case 'boss':drawBoss(x,o,t,ctx);return;
 case 'seesaw':drawSeesaw(x,o,t);return;
 case 'spikelog':drawSpikeLog(x,o,t);return;
 case 'starpost':{if(spr(x,'starpost',o.lit?'lit':o.spin>0?'spin':'idle',o.lit?(t*4):o.spin>0?(60-o.spin)/3:0,o.x,o.y+24))return;x.fillStyle='#3848a8';x.fillRect(o.x-2,o.y-20,4,44);x.fillStyle='#202030';x.fillRect(o.x-5,o.y+20,10,4);const a=o.spin>0?o.spin*.4:0,bx=o.x+Math.sin(a)*8,by=o.y-22-Math.abs(Math.cos(a))*2;
  x.fillStyle=o.lit?'#ff3030':'#3070ff';x.beginPath();x.arc(bx,by,5,0,7);x.fill();x.fillStyle='rgba(255,255,255,.7)';x.beginPath();x.arc(bx-1.5,by-1.5,1.6,0,7);x.fill();return;}
 case 'wall':{const x0=o.x-o.w/2,y0=o.y-o.h/2;{const tile=SP.picture('jungle-rock');if(tile){x.save();x.beginPath();x.rect(x0,y0,o.w,o.h);x.clip();const sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;
   for(let yy=y0;yy<y0+o.h;yy+=32)x.drawImage(tile,x0,yy,32,32);x.imageSmoothingEnabled=sm;x.fillStyle='rgba(0,0,0,.12)';x.fillRect(x0,y0,o.w,o.h);x.restore();x.strokeStyle='#2a1a10';x.lineWidth=1.5;x.strokeRect(x0+.5,y0+.5,o.w-1,o.h-1);return;}}x.fillStyle='#8a7a6a';x.fillRect(x0,y0,o.w,o.h);x.fillStyle='#a89888';for(let yy=0;yy<o.h;yy+=16)for(let xx=(yy/16&1)*8;xx<o.w;xx+=16)x.fillRect(x0+xx,y0+yy,14,14);
  x.strokeStyle='#4a3a2a';x.lineWidth=1.5;x.strokeRect(x0+.5,y0+.5,o.w-1,o.h-1);x.beginPath();x.moveTo(x0+o.w*.3,y0);x.lineTo(x0+o.w*.5,y0+o.h*.4);x.lineTo(x0+o.w*.35,y0+o.h*.7);x.stroke();return;}
 case 'platform':{if(o.move==='swing')drawChain(x,o.px,o.py,o.x,o.y-o.h/2);
  // planks of a crumbling bridge: the bridge picture itself, shaking before it drops, then falling away
  if(o.look==='bridge'&&SP.picture('bridge')){const sh=o.drop>0&&(o.drop>>1)%2?1:0;x.save();x.translate(sh,0);if(o.falling)x.rotate(0);stripX(x,'bridge',o.x-o.w/2,o.x+o.w/2,o.y-o.h/2-17,26);x.restore();return;}if(SP.picture(o.move==='collapse'?'platform-crumble':'platform')){const nm=o.move==='collapse'?'platform-crumble':'platform',sh=o.drop>0&&(o.drop>>1)%2?1:0;pic(x,nm,o.x+sh,o.y-o.h/2-4,.5,0,{w:o.w+8});return;}
  if(o.move!=='collapse'||!(o.drop>0)){drawDecor(x,{type:'land',x0:o.x-o.w/2,x1:o.x+o.w/2,y:o.y-o.h/2,depth:o.move==='collapse'?26:34},t);if(o.move==='collapse'){x.strokeStyle='#5a3214';x.lineWidth=1;for(let xx=12;xx<o.w;xx+=18){x.beginPath();x.moveTo(o.x-o.w/2+xx,o.y-o.h/2+7);x.lineTo(o.x-o.w/2+xx+4,o.y-o.h/2+22);x.stroke();}}return;}const x0=o.x-o.w/2,y0=o.y-o.h/2;x.fillStyle=o.move==='collapse'?'#9a6a3a':'#c27a34';x.fillRect(x0,y0+4,o.w,o.h-4);x.fillStyle='#58c428';x.fillRect(x0-2,y0,o.w+4,6);x.fillStyle='#c8f070';x.fillRect(x0-2,y0,o.w+4,2);
  x.fillStyle='#1e6e18';for(let xx=0;xx<o.w;xx+=6)x.fillRect(x0+xx,y0+6,3,2);if(o.drop>0&&(o.drop>>1)%2){x.fillStyle='rgba(0,0,0,.25)';x.fillRect(x0,y0,o.w,o.h);}
  if(o.move==='collapse'){x.strokeStyle='#5a3214';x.lineWidth=1;for(let xx=12;xx<o.w;xx+=18){x.beginPath();x.moveTo(x0+xx,y0+6);x.lineTo(x0+xx+4,y0+o.h);x.stroke();}}return;}
 case 'vine':{if(SP.picture('vine-rope')){const dx=o.hx-o.x,dy=o.hy-o.y,L=Math.hypot(dx,dy);x.save();x.translate(o.x,o.y);x.rotate(Math.atan2(dy,dx));stripX(x,'vine-rope',0,L,-5,10);x.restore();
   x.fillStyle='#5a3a1a';x.fillRect(o.x-6,o.y-4,12,6);pic(x,'vine-handle',o.hx,o.hy-3,.5,.3);return;}
  x.strokeStyle='#2e7a1c';x.lineWidth=3;x.beginPath();x.moveTo(o.x,o.y);x.quadraticCurveTo((o.x+o.hx)/2+Math.sin(o.ang||0)*-8,(o.y+o.hy)/2,o.hx,o.hy);x.stroke();
  x.fillStyle='#3c9a24';for(let k=1;k<6;k++){const f=k/6,lx=o.x+(o.hx-o.x)*f,ly=o.y+(o.hy-o.y)*f;x.beginPath();x.ellipse(lx+(k%2?4:-4),ly,4,2,k%2?.5:-.5,0,7);x.fill();}
  x.fillStyle='#8a5a2a';x.fillRect(o.hx-8,o.hy-2,16,4);x.fillStyle='#5a3a1a';x.fillRect(o.x-6,o.y-4,12,6);return;}
 case 'zipline':{if(SP.picture('zip-handle')){x.strokeStyle='#c8913c';x.lineWidth=2.5;x.beginPath();x.moveTo(o.x0,o.y0);x.lineTo(o.x1,o.y1);x.stroke();
   // posts reach down to the ground (o.g0/o.g1 from the zone); a fixed 40 px left the low end floating
   const post=(px,py,g,flip)=>{const b=g??py+40;pic(x,'zip-post',px,b,.2,1,{w:16,h:Math.max(48,b-py+8),flip});};
   post(o.x0-6,o.y0,o.g0,false);post(o.x1+6,o.y1,o.g1,true);pic(x,'zip-handle',o.hx,o.hy+2,.5,.42);return;}
  x.strokeStyle='#d8c8a0';x.lineWidth=2;x.beginPath();x.moveTo(o.x0,o.y0);x.lineTo(o.x1,o.y1);x.stroke();x.fillStyle='#5a3a1a';for(const [px,py] of [[o.x0,o.y0],[o.x1,o.y1]])x.fillRect(px-4,py-4,8,40);
  x.fillStyle='#707080';x.beginPath();x.arc(o.hx,o.hy,4,0,7);x.fill();x.strokeStyle='#404050';x.lineWidth=2;x.beginPath();x.moveTo(o.hx,o.hy);x.lineTo(o.hx,o.hy+12);x.stroke();x.fillStyle='#e8c040';x.fillRect(o.hx-7,o.hy+11,14,3);return;}
 case 'sign':{const sp=o.spin>0?o.spin:0,a=sp>0?(150-sp)*.35*(sp/150):0,cw=Math.cos(a);
  if(SP.sheet('sign')){x.save();x.translate(o.x,o.y+16);x.scale(Math.abs(cw)<.08?.08:Math.abs(cw),1);spr(x,'sign','done',0,0,0);x.restore();
   if(o.hit&&cw>0&&ctx?.head){x.save();x.translate(o.x,o.y+16-41);x.scale(Math.max(.1,cw),1);ctx.head(x,o.by,0,0,30,'win');x.restore();}return;}
  x.fillStyle='#6a6a78';x.fillRect(o.x-2,o.y-16,4,32);
  x.save();x.translate(o.x,o.y-30);x.scale(Math.abs(cw)<.08?.08:cw,1);x.fillStyle='#1c38b8';x.beginPath();x.arc(0,0,16,0,7);x.fill();x.strokeStyle='#ffd23a';x.lineWidth=2;x.stroke();
  if(o.hit&&cw>0&&ctx?.head){x.restore();x.save();x.translate(o.x,o.y-30);x.scale(Math.max(.1,cw),1);ctx.head(x,o.by,0,0,26,'win');}
  else{x.fillStyle='#ffd23a';x.font='bold 18px Arial Black,Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('?',0,1);}x.restore();return;}
 }}
// ---------------- Act 2 set pieces (drawn by code until their art comes in: slots corkscrew, seesaw, seesaw-ball,
// spike-log, chain, fish in docs/sonic3-sprites/GPT-NIGHT-2026-11-11.md)
// CORKSCREW: the track's floor y = axis + cos(phase) * r, drawn as a thick earth band with a grass edge on the side the
// runner stands on. The half facing us (sin(phase) > 0) is lighter; front=true draws only that half (over a runner who
// is going round the back)
function drawCorkscrew(x,o,t,front){const r=o.r,axis=o.y-r,n=Math.ceil((o.x1-o.x0)/6),ph=xx=>(xx-o.x0)/o.turn*2*Math.PI;
 x.save();x.lineCap='round';
 if(!front){// posts at both ends down to the ground below, and a rail along the axis
  x.fillStyle='#6a4018';x.strokeStyle='#2a1408';x.lineWidth=1.5;for(const px of [o.x0+6,o.x1-6]){x.fillRect(px-6,o.y+4,12,220);x.strokeRect(px-6,o.y+4,12,220);}
  x.strokeStyle='rgba(40,20,6,.55)';x.lineWidth=5;x.beginPath();x.moveTo(o.x0,axis);x.lineTo(o.x1,axis);x.stroke();}
 for(const pass of front?[1]:[0,1]){
  for(let k=0;k<n;k++){const xa=o.x0+k*6,xb=Math.min(o.x1,xa+7),a=ph(xa+3),s=Math.sin(a);if(pass===0?s>0:s<=0)continue;
   const ya=axis+Math.cos(ph(xa))*r,yb=axis+Math.cos(ph(xb))*r,depth=.55+.45*Math.max(0,s);
   x.strokeStyle='#2a1408';x.lineWidth=17;x.beginPath();x.moveTo(xa,ya);x.lineTo(xb,yb);x.stroke();
   x.strokeStyle=`rgb(${Math.round(194*depth)},${Math.round(122*depth)},${Math.round(52*depth)})`;x.lineWidth=13;x.beginPath();x.moveTo(xa,ya);x.lineTo(xb,yb);x.stroke();
   // grass on the floor side (toward the axis), checker marks on the band
   const c=Math.cos(a),gx=0,gyo=c>0?-5:5;x.strokeStyle=`rgb(${Math.round(88*depth)},${Math.round(196*depth)},${Math.round(40*depth)})`;x.lineWidth=4;x.beginPath();x.moveTo(xa+gx,ya+gyo);x.lineTo(xb+gx,yb+gyo);x.stroke();
   if(k%4===0){x.fillStyle=`rgba(90,48,14,${.5*depth})`;x.fillRect(xa,(ya+yb)/2-2,4,4);}}}
 x.restore();}
// SEESAW: a pivot block, the plank (low end 6 px over the ground), the spiked ball on its end
function drawSeesaw(x,o,t){const w=o.w,gy=o.gy,tilt=o.tilt,ang=Math.atan2(24,w)*tilt,lift=o.lift>0?Math.sin(o.lift/10*Math.PI)*2:0;
 x.save();x.fillStyle='#5a5a66';x.strokeStyle='#22222a';x.lineWidth=1.5;x.beginPath();x.moveTo(o.x-12,gy);x.lineTo(o.x,gy-18-6);x.lineTo(o.x+12,gy);x.closePath();x.fill();x.stroke();
 x.translate(o.x,gy-6-12-lift*0);x.rotate(ang);
 x.fillStyle='#c89040';x.fillRect(-w/2,-4,w,8);x.strokeStyle='#5a3214';x.strokeRect(-w/2,-4,w,8);x.fillStyle='#e8b860';x.fillRect(-w/2,-4,w,2);
 x.fillStyle='#ffd23a';x.fillRect(-w/2,-4,8,8);x.fillRect(w/2-8,-4,8,8);x.restore();
 const b=o.ball,bx=o.x+b.side*(w/2-12),u=(bx-o.x)/(w/2),by=gy-6-24*(1-u*tilt)/2-11+b.y;
 x.save();x.translate(bx,by);x.rotate(t*(b.air?6:0));x.fillStyle='#d8d8e4';for(let k=0;k<8;k++){const a=k*Math.PI/4;x.beginPath();x.moveTo(Math.cos(a-.25)*9,Math.sin(a-.25)*9);x.lineTo(Math.cos(a)*15,Math.sin(a)*15);x.lineTo(Math.cos(a+.25)*9,Math.sin(a+.25)*9);x.fill();}
 const g=x.createRadialGradient(-3,-3,1,0,0,10);g.addColorStop(0,'#8a8aa0');g.addColorStop(1,'#2a2a38');x.fillStyle=g;x.beginPath();x.arc(0,0,10,0,7);x.fill();x.strokeStyle='#14141c';x.lineWidth=1.2;x.stroke();x.restore();}
// SPIKE LOG: a log on the bridge turning over; its row of spikes comes round to the top every turn
function drawSpikeLog(x,o,t){const w=o.w,h=o.h,cx=o.x,cy=o.y,R_=h/2;x.save();
 const spikes=[0,1,2].map(k=>o.spin+k*2*Math.PI/3);
 const spike=a=>{const c=Math.cos(a),s=Math.sin(a);if(s<-.2)return;const y0=cy-c*R_*.9,dir=-c;x.fillStyle=s>.3?'#ecebf6':'#a8a8b8';for(let j=0;j<4;j++){const sx=cx-w/2+8+j*(w-16)/3;x.beginPath();x.moveTo(sx-5,y0);x.lineTo(sx,y0+dir*11*Math.max(.25,Math.abs(c)+.2*s));x.lineTo(sx+5,y0);x.fill();}};
 for(const a of spikes)if(Math.sin(a)<.3)spike(a);
 const g=x.createLinearGradient(0,cy-R_,0,cy+R_);g.addColorStop(0,'#c88a48');g.addColorStop(.5,'#8a5424');g.addColorStop(1,'#5a3412');x.fillStyle=g;x.fillRect(cx-w/2,cy-R_,w,h);
 x.strokeStyle='#2a1408';x.lineWidth=1.5;x.strokeRect(cx-w/2,cy-R_,w,h);
 // bark rings turning
 x.strokeStyle='rgba(60,30,8,.6)';x.lineWidth=1;for(let k=0;k<3;k++){const yy=cy-Math.cos(o.spin*1+k*2.1)*R_*.8;if(Math.sin(o.spin+k*2.1)>0){x.beginPath();x.moveTo(cx-w/2+2,yy);x.lineTo(cx+w/2-2,yy);x.stroke();}}
 x.fillStyle='#d8a868';for(const ex of [cx-w/2,cx+w/2]){x.beginPath();x.ellipse(ex,cy,4,R_,0,0,7);x.fill();x.stroke();}
 for(const a of spikes)if(Math.sin(a)>=.3)spike(a);
 x.restore();}
// MINI-BOSS: the owner's sheet (hover / attack = flames out both sides / wreck), the pilot's face in the dome; flashes
// while it can't be hit. Before the fight starts it waits high over the arena; wrecked, it lies on the ground.
function drawBoss(x,o,t,ctx){const flash=o.inv>0&&(o.inv>>1)%2,mood=o.state==='wreck'||o.state==='down'||o.inv>0?'sad':'angry';
 // the sheet's flame and smoke frames were cut off at the frame edges (owner, Nov 11: "cropped in a square"), so the pod is
 // drawn from its clean frames (attack frame 0 = nozzles, no flames; the wreck frames clipped below their smoke) and the
 // flames and smoke are drawn here, as big as they need to be
 const wreck=o.state==='wreck'||o.state==='down',row=wreck?'wreck':o.state==='flame'||o.state==='windup'?'attack':'hover';
 const fr=wreck?Math.min(2,Math.floor((o.state==='down'?150:o.t)/50)):row==='attack'?0:t*8;
 x.save();if(flash)x.globalAlpha=.45;
 const pilotOn=()=>{if(o.state==='down')return;x.save();if(o.state==='wreck')x.translate(Math.sin(t*40)*1.5,0);ctx?.pilot?.(x,o.x,o.y-12,30,mood);x.restore();};
 if(wreck)bossSmoke(x,o,t,true);
 if(o.fire>0||o.state==='windup')bossJets(x,o,t);
 const clipTop=wreck?o.y-48+34:null;
 // keep the dome (the middle column) whole, cut the painted smoke in the upper corners
 if(clipTop!==null){x.save();x.beginPath();x.rect(o.x-90,clipTop,180,120);if(fr<2)x.rect(o.x-30,o.y-48,52,40);x.clip('nonzero');}// (the last wreck frame lies low: no dome up there)
 const drawn=spr(x,'miniboss',row,fr,o.x,o.y);if(clipTop!==null)x.restore();
 if(wreck)bossSmoke(x,o,t,false);
 if(drawn)pilotOn();// the sheet's dome is the face spot (head [80,36]): the face goes on top
 else{pilotOn();// stand-in: a grey pod with a blue dome and two side jets
  x.fillStyle='rgba(140,200,255,.55)';x.beginPath();x.arc(o.x,o.y-12,16,Math.PI,0);x.fill();x.strokeStyle='#14141c';x.lineWidth=1.5;x.stroke();
  x.fillStyle='#9a9ab0';x.beginPath();x.ellipse(o.x,o.y+2,26,16,0,0,7);x.fill();x.stroke();x.fillStyle='#ffd23a';x.fillRect(o.x-20,o.y-2,40,6);
  x.fillStyle='#c83a3a';for(const s of [-1,1]){x.beginPath();x.arc(o.x+s*30,o.y,8,0,7);x.fill();x.stroke();}
  if(o.fire>0){for(const s of [-1,1]){const g=x.createLinearGradient(o.x+s*36,0,o.x+s*80,0);g.addColorStop(0,'#fff6a0');g.addColorStop(.5,'#ff8a1a');g.addColorStop(1,'rgba(255,40,0,0)');x.fillStyle=g;x.beginPath();x.moveTo(o.x+s*36,o.y-6);x.lineTo(o.x+s*(80+Math.sin(t*40)*4),o.y);x.lineTo(o.x+s*36,o.y+8);x.fill();}}}
 x.restore();}
// the pod's flamethrowers: tongues of fire out of both side nozzles (as long as the hazard, 78 px from the middle);
// sputtering short during the wind-up
function bossJets(x,o,t){const wind=o.state==='windup',len=wind?10+Math.abs(Math.sin(t*40))*8:44+Math.sin(t*37)*4,ny=o.y+1;
 x.save();x.globalCompositeOperation='lighter';
 for(const s of [-1,1]){const x0=o.x+s*34;
  for(const [w,c0,c1,k] of [[11,'rgba(255,90,20,.85)','rgba(255,40,0,0)',1],[7,'rgba(255,200,60,.95)','rgba(255,120,20,0)',.82],[3.5,'rgba(255,255,220,1)','rgba(255,230,120,0)',.6]]){
   const L=len*k,g=x.createLinearGradient(x0,0,x0+s*L,0);g.addColorStop(0,c0);g.addColorStop(1,c1);x.fillStyle=g;x.beginPath();x.moveTo(x0,ny-w*.6);
   for(let i=1;i<=6;i++){const u=i/6;x.lineTo(x0+s*L*u,ny-w*(1-u*.7)+Math.sin(t*50+i*1.7)*1.6);}
   for(let i=6;i>=0;i--){const u=i/6;x.lineTo(x0+s*L*u,ny+w*(1-u*.7)+Math.sin(t*44+i*2.1)*1.6);}x.closePath();x.fill();}}
 x.restore();}
// wrecked: grey smoke puffs rising from the hull and drifting off (behind = the lower, darker ones; front = lighter ones)
function bossSmoke(x,o,t,behind){x.save();for(let k=0;k<6;k++){const ph=((t*.55+k/6)%1),sx=o.x+(k%2?16:-14)+Math.sin(t*1.3+k)*4+ph*10,sy=o.y-14-ph*80,r=5+ph*14;
  if(behind!==(k%2===0))continue;x.globalAlpha=.75*(1-ph);x.fillStyle=k%3?'#c9c4d6':'#a9a3b8';x.beginPath();x.arc(sx,sy,r,0,7);x.arc(sx+r*.6,sy+r*.25,r*.7,0,7);x.fill();
  x.strokeStyle='rgba(60,50,80,.35)';x.lineWidth=1;x.stroke();}x.restore();}
// a chain from a pivot down to a swinging platform
function drawChain(x,x0,y0,x1,y1){const n=Math.max(2,Math.round(Math.hypot(x1-x0,y1-y0)/10));x.save();x.fillStyle='#8a8a98';x.strokeStyle='#3a3a48';x.lineWidth=1;
 for(let k=0;k<=n;k++){const u=k/n,cx=x0+(x1-x0)*u,cy=y0+(y1-y0)*u;x.beginPath();x.ellipse(cx,cy,3,4.5,Math.atan2(y1-y0,x1-x0),0,7);x.fill();x.stroke();}
 x.fillStyle='#5a5a66';x.beginPath();x.arc(x0,y0,5,0,7);x.fill();x.stroke();x.restore();}
const ICON={rings:'rings',shoes:'shoes',star:'star',fire:'fire',bubble:'bubble',lightning:'lightning',eggman:'trap',plain:'shield'};
function monitorIcon(x,item,cx,cy,ctx,pi){if(item!=='life'&&spr(x,'icons',ICON[item]||'shield',0,cx,cy))return;x.save();x.translate(cx,cy);
 switch(item){
 case 'rings':ringPath(x,-3,1,5,0);ringPath(x,3,-1,5,0);break;
 case 'shoes':x.fillStyle='#e8282c';x.beginPath();x.ellipse(0,1,8,4,0,0,7);x.fill();x.fillStyle='#fff';x.fillRect(-3,-3,4,4);break;
 case 'star':x.fillStyle='#ffe23a';x.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?3:7;x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.fill();break;
 case 'life':if(ctx?.head)ctx.head(x,pi??ctx.me??0,0,0,16);else{x.fillStyle='#3a78ff';x.beginPath();x.arc(0,0,6,0,7);x.fill();}break;
 case 'fire':shieldIcon(x,'#ff7a1a','#ffd23a');break;
 case 'bubble':shieldIcon(x,'#58b8ff','#e0f4ff');break;
 case 'lightning':shieldIcon(x,'#ffe23a','#fff');x.strokeStyle='#ff9a1a';x.lineWidth=1.5;x.beginPath();x.moveTo(1,-6);x.lineTo(-2,0);x.lineTo(2,0);x.lineTo(-1,6);x.stroke();break;
 case 'eggman':x.fillStyle='#f6c890';x.beginPath();x.arc(0,0,6,0,7);x.fill();x.fillStyle='#e83030';x.fillRect(-6,-7,12,3);x.fillStyle='#5a2a10';x.fillRect(-5,1,10,2);break;
 default:shieldIcon(x,'#4a8aff','#cfe4ff');}
 x.restore();}
function shieldIcon(x,a,b){x.fillStyle=a;x.beginPath();x.arc(0,0,6.5,0,7);x.fill();x.fillStyle=b;x.beginPath();x.arc(-2,-2,2.4,0,7);x.fill();}
// our own badnik designs (Sonic 3 first-zone kinds: a charger, a tree climber that throws, a plant that spits, a flyer)
// the monkey robot's tree: a trunk from the ground up past the top of the screen, there whether or not the monkey is
// (it used to be a 180 px stub drawn with the robot, so it popped in and out and vanished with it)
function drawTrunk(x,o){if(!SP.picture('tree-trunk'))return;const bot=o.trunkY??o.y0+90;for(let yy=bot-34;yy>o.y0-700;yy-=34)pic(x,'tree-trunk',o.x+12,yy,.5,0);}
function drawBadnik(x,o,t){
 // (the monkey's tree is a palm in the zone's scenery now, behind everything: owner, Nov 11: the bare trunk stood in
 // front of other props and looked odd once the monkey was gone)
 if(o.alive===false)return;
 if(o.kind==='charger'&&SP.sheet('charger')){const row=o.state==='rev'?'rev':o.state==='charge'?'charge':'roll';spr(x,'charger',row,t*(row==='roll'?8:14),o.x,o.y+o.h,{flip:o.dir<0});return;}
 if(o.kind==='thrower'&&SP.sheet('thrower')){const cool=o.cool||0;
  spr(x,'thrower',cool>100?'throw':Math.abs(Math.cos(o.t/50))>.25?'climb':'idle',cool>100?(120-cool)/5:t*6,o.x-2,o.y,{flip:true});return;}
 if(o.kind==='shooter'&&SP.sheet('shooter')){const c=o.cool||0;spr(x,'shooter',c<14?'spit':c>80?'open':'closed',c<14?c/7:c>80?(c-80)/14:t*3,o.x,o.y+14);return;}
 if(o.kind==='flyer'&&SP.sheet('flyer')){spr(x,'flyer',o.state==='dive'?'dive':'fly',t*16,o.x,o.y,{flip:(o.dir||-1)<0});return;}
 if(o.kind==='fish'&&spr(x,'fish','leap',t*10,o.x,o.y,{rot:o.up?-Math.PI/2:Math.PI/2}))return;
 x.save();x.translate(o.x,o.y);
 if(o.kind==='fish'){// a robot piranha: nose up on the way out, nose down on the way back
  x.rotate(o.up?-Math.PI/2:Math.PI/2);x.fillStyle='#e83a3a';x.beginPath();x.ellipse(0,0,13,9,0,0,7);x.fill();x.strokeStyle='#5a0a0a';x.lineWidth=1.2;x.stroke();
  x.fillStyle='#ffe0e0';x.beginPath();x.ellipse(2,4,8,3.5,0,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.moveTo(12,-2);x.lineTo(7,1);x.lineTo(12,3);x.fill();
  x.fillStyle='#b81818';x.beginPath();x.moveTo(-11,0);x.lineTo(-19,-7);x.lineTo(-19,7);x.closePath();x.fill();x.beginPath();x.moveTo(-2,-8);x.lineTo(4,-14);x.lineTo(6,-8);x.fill();
  x.fillStyle='#fff';x.beginPath();x.arc(5,-3,3,0,7);x.fill();x.fillStyle='#000';x.fillRect(5,-4,2,2);x.fillStyle='#a0a0b0';x.fillRect(-4,-2,2,6);x.restore();return;}
 if(o.kind==='charger'){const f=o.dir<0?1:-1;x.scale(f,1);const shake=o.state==='rev'?Math.sin(t*80)*1.2:0;x.translate(shake,0);
  x.fillStyle='#283050';x.beginPath();x.arc(-7,10,4,0,7);x.arc(7,10,4,0,7);x.fill();
  x.fillStyle='#d83a2a';x.beginPath();x.ellipse(0,0,15,11,0,Math.PI,0);x.lineTo(15,8);x.lineTo(-15,8);x.fill();x.fillStyle='#ffcc3a';for(let k=-1;k<=1;k++)x.fillRect(k*7-2,-9,4,16);
  x.fillStyle='#e8e8f0';x.beginPath();x.moveTo(-14,2);x.lineTo(-24,-2);x.lineTo(-14,-5);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(-9,-3,3,0,7);x.fill();x.fillStyle='#000';x.fillRect(-11,-4,2,2);
  if(o.state==='charge'){x.fillStyle='rgba(255,255,255,.6)';for(let k=0;k<3;k++){x.beginPath();x.arc(14+k*6,6+Math.sin(t*40+k)*2,2+k,0,7);x.fill();}}}
 else if(o.kind==='thrower'){x.fillStyle='#6a4420';x.fillRect(8,-60,8,120);x.fillStyle='#4a2c10';for(let k=-60;k<60;k+=10)x.fillRect(8,k,8,2);
  x.fillStyle='#8a5a2a';x.beginPath();x.arc(0,0,9,0,7);x.fill();x.fillStyle='#f0c890';x.beginPath();x.arc(-2,1,5,0,7);x.fill();x.fillStyle='#000';x.fillRect(-4,-1,2,2);x.fillRect(0,-1,2,2);
  x.fillStyle='#e83030';x.beginPath();x.arc(0,-8,3,0,7);x.fill();x.strokeStyle='#8a5a2a';x.lineWidth=3;x.beginPath();x.moveTo(6,-3);x.lineTo(10,-8);x.stroke();}
 else if(o.kind==='shooter'){const open=(o.cool||0)>100;x.fillStyle='#2e8a2a';for(const s of [-1,1]){x.beginPath();x.ellipse(s*9,10,9,4,s*.4,0,7);x.fill();}
  x.fillStyle='#c83aa8';x.beginPath();x.arc(0,-2,10,0,7);x.fill();x.fillStyle=open?'#300a28':'#ff7ad8';x.beginPath();x.ellipse(0,-8,6,open?5:2,0,0,7);x.fill();x.fillStyle='#fff';x.fillRect(-5,-2,3,3);x.fillRect(2,-2,3,3);}
 else{const fl=Math.sin(t*50);x.fillStyle='rgba(220,240,255,.7)';x.beginPath();x.ellipse(-4,-8,7,3+fl*2,-.4,0,7);x.ellipse(5,-8,7,3-fl*2,.4,0,7);x.fill();
  x.fillStyle='#ffb020';x.beginPath();x.ellipse(0,0,10,7,0,0,7);x.fill();x.fillStyle='#202020';x.fillRect(-2,-6,3,12);x.fillRect(4,-5,2,10);x.fillStyle='#fff';x.beginPath();x.arc(-7,-1,3,0,7);x.fill();x.fillStyle='#000';x.fillRect(-8,-2,2,2);
  x.fillStyle='#606060';x.beginPath();x.moveTo(9,1);x.lineTo(14,5);x.lineTo(9,4);x.fill();}
 x.restore();}
function drawShot(x,s,t){if(s.kind==='coconut'&&pic(x,'coconut',s.x,s.y,.5,.5,{rot:t*8}))return;if(s.kind==='seed'&&spr(x,'seed','spin',t*12,s.x,s.y))return;
 if(s.kind==='coconut'){x.fillStyle='#6a4018';x.beginPath();x.arc(s.x,s.y,s.r,0,7);x.fill();x.fillStyle='#3a2008';x.fillRect(s.x-2,s.y-2,2,2);x.fillRect(s.x+1,s.y-2,2,2);return;}
 x.save();x.translate(s.x,s.y);x.rotate(t*12);x.fillStyle='#e8e060';x.beginPath();for(let k=0;k<8;k++){const a=k*Math.PI/4,r=k%2?2:s.r;x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.fill();x.restore();}
function drawLoose(x,r,t){if(r.animal&&spr(x,'critter',['bird','rabbit','squirrel'][Math.abs(Math.round(r.x0??r.x*7))%3],r.vy<0?1:0,r.x,r.y+6,{flip:r.vx<0}))return;
 if(!r.animal&&spr(x,'ring','spin',t*24+r.vx*3,r.x,r.y,{alpha:r.t>200&&(r.t>>2)%2?.3:1}))return;
 if(r.animal){x.save();x.translate(r.x,r.y);const f=r.vx<0?-1:1;x.scale(f,1);x.fillStyle='#fff';x.beginPath();x.ellipse(0,0,5,4,0,0,7);x.fill();x.fillStyle='#4a9aff';x.beginPath();x.ellipse(-1,-1,4,3,0,0,7);x.fill();
  x.fillStyle='#ff9a1a';x.fillRect(4,-1,3,2);x.fillStyle='#000';x.fillRect(1,-2,1,1);x.restore();return;}
 ringPath(x,r.x,r.y,7,t*12+r.vx,r.t>200&&(r.t>>2)%2?.3:1);}

// ---------------- the runners (our own designs, as in the sprite kit): P1 a blue-purple hedgehog with a mane of back
// quills, P2 a red-orange fox with three tails (they whirl when it flies), each wearing the player's face
// sizes (owner, Nov 11 night): hedgehog 5% smaller than the 1.1 before; the fox read bigger (ears + three tails add
// bulk; the hedgehog's quills add height), so it comes down the same way: both sheets put the face spot at the same height
// above the feet (38.0 / 38.2 of 80), so these numbers are directly comparable (tools/sonic3/runner-sizes.py prints them)
const BODY_K={hog:1.045,fox:.92},RUN_HEAD=36;
// curled up: matched by FILLED AREA, not outline width: the hedgehog's ball is spiky (outline ~31 px, filled area = a
// 26.4 px disc), the fox's is solid fur (outline 30, area 28.7), so equal outlines made the fox's ball look ~19% bigger.
// BALL_SRC = the source size that scales to BALL_D: the hedgehog's is unchanged (owner: its ball is right)
// DASH_RUN: from here the legs are the spinning circle (owner, Nov 11: it took forever to kick in at 9.5, above the
// normal top speed of 6, so it showed only with speed shoes or downhill; now it comes as you build real speed)
const BALL_D=42,BALL_SRC={hog:32.1,fox:38.8},WALK_RUN=2.2,DASH_RUN=4.6;// fox ball 10% smaller again (owner, Nov 11 round 3)
// spin dash dust: puffs kicked out behind the ball
function spinDust(x,px,py,f,t){x.save();for(let k=0;k<5;k++){const ph=(t*7+k/5)%1,d=8+ph*26,r=3+ph*6;x.globalAlpha=.85*(1-ph);x.fillStyle='#fff';
 x.beginPath();x.arc(px-f*d,py-ph*10-k%2*3,r,0,7);x.fill();x.strokeStyle='rgba(120,130,160,.55)';x.lineWidth=1;x.stroke();}x.restore();}
const looks=new WeakMap();
function lookOf(p){let L=looks.get(p);if(!L){L={spin:0,cyc:0,idle:0,tw:0};looks.set(p,L);}return L;}
// the angle the body is drawn at: follows the ground angle quickly (so the last degree or two of pixel-staircase noise
// doesn't shake the sprite) and turns back upright gently in the air instead of snapping (dropping off a loop, ramps)
function bodyAngle(p){const L=lookOf(p),want=p.dead?0:p.ground?-p.ang:0,now=performance.now(),dt=Math.min(.1,L.at?(now-L.at)/1000:1/60);L.at=now;
 if(L.da===undefined||p.dead){L.da=want;return want;}
 let d=want-L.da;d=((d+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
 L.da+=d*(1-Math.exp(-dt*(p.ground?30:9)));return L.da;}
function drawRunner(x,p,i,t,head,alpha=1){const L=lookOf(p),tails=p.body?p.body==='fox':i===1,BODY=tails?'#f0541e':'#6a48e0',DARK=tails?'#96280a':'#32208c',SKIN=tails?'#fff0d0':'#cdbcff',ARM=BODY,SCARF=tails?'#fff0d0':'#8c70ff',SHOE=tails?'#18a8a0':'#ffd428',SOLE=tails?'#0c6660':'#b08400';
 const ball=p.rolling||p.jumping||p.spindash,sp=p.ground?p.gsp:p.xsp,run=Math.abs(sp),f=p.facing||1;
 L.spin+=p.spindash?.9:(ball?(.25+Math.abs(p.ground?p.gsp:Math.hypot(p.xsp,p.ysp))*.07):0)*(p.ground?Math.sign(p.gsp)||f:f);L.cyc+=1/Math.max(1,8-run);// Mega Drive timing: each walk/run frame lasts max(1, 8 - speed) game frames (the old rate slid the feet)
 L.idle=p.ground&&run<.05&&!p.crouch&&!p.lookUp?L.idle+1:0;
 x.save();x.globalAlpha*=alpha;
 if(p.inv>0&&!p.hurt&&(p.inv>>2)%2&&alpha===1)x.globalAlpha*=.3;
 if(sprites())return;
 if(p.dead){x.translate(p.x,p.y);x.rotate(Math.min(p.dead*.05,1.4));head(x,i,0,-4,34,'sad');x.restore();return;}
 shieldUnder(x,p,t);
 if(ball){x.save();x.translate(p.x,p.y);x.rotate(L.spin);const r=13;
  x.fillStyle=DARK;x.beginPath();if(tails)x.arc(0,0,r+2,0,7);else for(let k=0;k<14;k++){const a=k*Math.PI/7,rr=k%2?r+1:r+5;x.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}x.fill();
  if(tails){x.strokeStyle=SCARF;x.lineWidth=3;for(let k=0;k<3;k++){x.beginPath();x.arc(0,0,r+1,k*2.1,k*2.1+.9);x.stroke();}}
  x.fillStyle=tails?'#ff8a4a':'#8c70ff';x.beginPath();x.arc(0,0,r-1,0,7);x.fill();x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=2.4;x.beginPath();x.arc(0,0,r-4,.3,1.6);x.stroke();x.beginPath();x.arc(0,0,r-4,3.4,4.7);x.stroke();
  head(x,i,0,0,21,'angry');x.restore();
  if(p.spindash){x.fillStyle='rgba(255,255,255,.75)';for(let k=0;k<4;k++){x.beginPath();x.arc(p.x-f*(16+k*6),p.y+10-k*1.5+Math.sin(t*40+k)*1.5,2+k*.8,0,7);x.fill();}}
  x.restore();shieldOver(x,p,t);return;}
 // standing body: feet origin at the surface below the centre, turned with the ground angle
 const ang=bodyAngle(p);x.translate(p.x,p.y);x.rotate(ang);x.translate(0,19);
 const skid=p.ground&&run>1.5&&Math.sign(p.gsp)!==f&&!p.rolling,peel=p.ground&&run>=DASH_RUN;
 x.save();x.scale(f,1);
 if(p.hang){legs(0,0);body();x.strokeStyle=ARM;x.lineWidth=3.5;x.lineCap='round';x.beginPath();x.moveTo(-3,-22);x.lineTo(-2,-35);x.moveTo(3,-22);x.lineTo(2,-35);x.stroke();glove(-2,-36);glove(2,-36);}
 else if(p.spring||p.hurt){x.strokeStyle=BODY;x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(-2,-14);x.lineTo(-4,-2);x.moveTo(2,-14);x.lineTo(4,-2);x.stroke();shoe(-4,-1,0);shoe(4,-1,0);body();x.strokeStyle=ARM;x.lineWidth=3.5;x.beginPath();x.moveTo(-3,-22);x.lineTo(-8,-34);x.moveTo(3,-22);x.lineTo(8,-34);x.stroke();glove(-8,-35);glove(8,-35);}
 else if(p.crouch){shoe(-3,-1,0);shoe(5,-1,0);x.fillStyle=BODY;x.beginPath();x.ellipse(0,-9,9,8,0,0,7);x.fill();glove(7,-6);}
 else if(skid){x.save();x.rotate(-.3);legs(-.4,.4);body(-.1);arm(-1.2,1);x.restore();}
 else if(peel){x.save();x.globalAlpha*=.85;x.strokeStyle=SHOE;x.lineWidth=5;x.beginPath();x.ellipse(0,-6,9,5,0,0,7);x.stroke();x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=3;x.beginPath();x.ellipse(0,-6,6,3,0,0,7);x.stroke();x.restore();body(.25);arm(Math.sin(L.cyc*2)*.5,1);}
 else if(p.ground&&run<.05){const tap=L.idle>180&&(L.idle>>4)%2;x.strokeStyle=BODY;x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(-2,-12);x.lineTo(-3,-3);x.moveTo(2,-12);x.lineTo(4,-3-(tap?2:0));x.stroke();shoe(-3,-1,0);shoe(5,-1-(tap?2:0),0);body(p.lookUp?-.15:0);arm(-.3,-1);arm(.3,1);}
 else{const sw=Math.sin(L.cyc*2.2)*(p.ground?1:.4),lean=Math.min(run*.04,.25);x.strokeStyle=BODY;x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(0,-12);x.lineTo(sw*8,-2-Math.max(0,-sw)*3);x.moveTo(0,-12);x.lineTo(-sw*8,-2-Math.max(0,sw)*3);x.stroke();shoe(sw*8,-1-Math.max(0,-sw)*3,sw*.4);shoe(-sw*8,-1-Math.max(0,sw)*3,-sw*.4);body(lean);arm(-sw*.9,1);}
 x.restore();
 // quills + head, not mirrored (faces stay readable)
 const hx=f*3+(skid?-f*4:0),hy=(p.crouch?-22:-36)+(p.lookUp?-2:0);x.fillStyle=BODY;x.strokeStyle=DARK;x.lineWidth=1.5;x.lineJoin='round';
 backOfHead(hx,hy,skid,true);
 // quills (hedgehog) or ears (+ the three tails for the stand-in fox body) behind the face
 function backOfHead(hx,hy,skid,withTails){const sw=Math.min(1,run/6),dir=skid?f:-f;x.fillStyle=BODY;x.strokeStyle=DARK;x.lineJoin='round';
  const piece=SP.picture(tails?'ears-p2':'quills-p1');// the owner's head piece, when it is in: drawn centred on the face
  if(piece){x.save();x.translate(hx,hy);x.scale(f,1);if(!tails)x.scale(.9,.9);/* the hedgehog's quills 10% smaller (owner, Nov 11) */const sm=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;x.drawImage(piece,-piece.width/4,-piece.height/4,piece.width/2,piece.height/2);x.imageSmoothingEnabled=sm;x.restore();if(!tails||!withTails)return;}
  if(tails&&withTails){const bx=hx-f*5,by=hy+26,spin=p.fly>0;for(let k=0;k<3;k++){const a=spin?t*(p.fly>1?26:7)+k*2.094:(k-1)*.5+Math.sin(t*5+k)*.12-sw*.25,L=20;
    const ex=bx+dir*L*(spin?Math.cos(a)*.9:Math.cos(a)),ey=by+(spin?-10+Math.sin(a)*5:Math.sin(a)*L*.8-4);
    x.strokeStyle=DARK;x.lineWidth=8.5;x.lineCap='round';x.beginPath();x.moveTo(bx,by);x.quadraticCurveTo((bx+ex)/2,(by+ey)/2-4,ex,ey);x.stroke();x.strokeStyle=BODY;x.lineWidth=6.5;x.stroke();
    x.fillStyle=SCARF;x.beginPath();x.arc(ex,ey,3.4,0,7);x.fill();}}
  else if(!tails){// the hedgehog's quills: a fan of five behind the head, sweeping back (they stream out with speed)
   x.fillStyle=BODY;x.strokeStyle=DARK;x.lineWidth=1.4;for(let k=4;k>=0;k--){const a=-1.0+k*.48+Math.sin(t*15+k)*sw*.05,len=27+sw*6-Math.abs(k-1.5)*2.5,ca=Math.cos(a),sa=Math.sin(a);
    const bx=hx+dir*ca*8,by=hy+sa*8,px=-sa*7.5,py=ca*7.5;x.beginPath();x.moveTo(bx+dir*px*-1,by-py);x.lineTo(hx+dir*ca*len,hy+sa*len+sw*2);x.lineTo(bx+dir*px,by+py);x.closePath();x.fill();x.stroke();}}
  if(tails&&!piece)for(const d of [-1,1]){const ex=hx+d*9-f*1,ey=hy-12;x.fillStyle=BODY;x.strokeStyle=DARK;x.lineWidth=1.3;x.beginPath();x.moveTo(ex-5,ey+3);x.lineTo(ex+d*2,ey-13);x.lineTo(ex+5,ey+3);x.closePath();x.fill();x.stroke();
   x.fillStyle=SCARF;x.beginPath();x.moveTo(ex-2,ey+2);x.lineTo(ex+d*1.5,ey-8);x.lineTo(ex+2.5,ey+2);x.closePath();x.fill();}}
 head(x,i,hx,hy+(p.lookUp?-1:0),32,p.hurt?'sad':skid?'angry':run>5?'happy':undefined);
 x.restore();
 if(skid&&(t*30|0)%3===0){}// dust is an effect (game)
 shieldOver(x,p,t);
 // the owner's sprite sheets (src/data/sonic3Sprites.js), when they are in: the body frame, then the face on its spot
 function sprites(){const nm='runner-p'+(tails?2:1),S=SP.sheet(nm),B=SP.sheet('ball-p'+(tails?2:1));if(!S||!B)return false;
  const frame=(Sh,row,fr,dx,dy)=>{const [fw,fh]=Sh.def.frame,ri=Object.keys(Sh.def.rows).indexOf(row),r=Sh.res;x.drawImage(Sh.img,fr*fw*r,ri*fh*r,fw*r,fh*r,dx,dy,fw,fh);};
  const was=x.imageSmoothingEnabled;x.imageSmoothingEnabled=true;
  if(ball&&!p.dead){shieldUnder(x,p,t);
   // the spin dash uses the roll frames spun fast: the sheet's spindash frames have dust painted to the cell edge, which
   // showed as straight cut lines; the dust is drawn here instead
   const row='roll',n=B.def.rows[row],TAU=Math.PI*2,fr=p.spindash?Math.floor(t*30)%n:Math.floor((((L.spin*f)%TAU)+TAU)%TAU/TAU*n)%n;
   // both balls drawn BALL_D across (owner: same size, the face the same as standing); lifted so they sit on the ground
   const bk=BALL_D/BALL_SRC[tails?'fox':'hog'],lift=BALL_D/2-14,ga=p.ground?p.ang:0,bx=p.x-Math.sin(ga)*lift,by=p.y-Math.cos(ga)*lift;
   if(p.spindash)spinDust(x,bx,by+BALL_D/2-4,f,t);
   x.save();x.translate(bx,by);x.save();x.scale(bk*f,bk);frame(B,row,fr,-B.def.foot[0],-B.def.foot[1]);x.restore();x.rotate(p.spindash?0:L.spin);head(x,i,0,0,RUN_HEAD*BODY_K[tails?'fox':'hog'],'angry');x.restore();// the face as big as standing
   x.imageSmoothingEnabled=was;x.restore();shieldOver(x,p,t);return true;}
  const N=r=>S.def.rows[r]||0,skid=p.ground&&run>1.5&&Math.sign(p.gsp)!==f&&!p.rolling;let row='stand',fr=0,upright=0;const cyc=(r,v)=>{row=r;fr=Math.floor(v)%N(r);};
  if(p.dead){row='dead';fr=p.dead>24?1:0;}
  else if(p.hang)cyc('hang',t*6);
  else if(p.fly>1&&N('fly'))cyc('fly',t*20);
  else if(p.fly===1&&N('fly'))cyc('fly',t*5);// tired: the flying frames, rotor slowed (the sheet's tired row shows three arms; owner)
  else if(p.hurt)cyc('hurt',t*7);
  else if(p.spring){row='spring';fr=1;}
  else if(!p.ground){if(p.ysp>1.5)cyc('fall',t*8);else cyc('walk',L.cyc);}
  else if(p.crouch){row='crouch';fr=1;}
  else if(skid)cyc('skid',t*10);
  else if(run>=DASH_RUN)cyc('dash',t*(16+run*1.4));// the circle legs = the full-speed run, as on the Mega Drive
  else if(run>=5.5)cyc('run',L.cyc);
  else if(run<.05){if(p.lookUp){row='lookUp';fr=1;}else if(L.idle>180)cyc('wait',L.idle/14);}
  // the sheets' walk rows are mostly feet-together frames (owner: "shuffling their feet"): past a slow walk the run
  // frames are used (real strides), leaned back a little at the low end so they read as a brisk walk. New walk rows
  // are asked for in docs/sonic3-sprites/GPT-NIGHT-2026-11-11.md; when they come in, WALK_RUN can go back up to 5.5.
  else if(run>=WALK_RUN){cyc('run',L.cyc);upright=Math.max(0,1-(run-WALK_RUN)/3.3)*.16;}
  else cyc('walk',L.cyc);
  if(!p.dead)shieldUnder(x,p,t);
  const [fx0,fy0]=S.def.foot,h=SP.spot(nm,row,fr)||{x:fx0,y:fy0-36};
  // on a corkscrew (owner, Nov 11: "like the real game"): Sonic 2 shows the runner barrel-rolling round the track's axis,
  // not spinning like a wheel: seen from the side that is a squash to a sliver and a flip upside down and back (height
  // x cos(phase), never thinner than 22%); a `cork-p1/p2` sheet (12 frames) can replace this later
  if(p.cork){const c=Math.cos(p.cork.a||0),sy=Math.sign(c||1)*Math.max(.22,Math.abs(c));x.translate(p.x,p.y);bodyAngle(p);x.scale(1,sy);x.translate(0,19);}
  else{x.translate(p.x,p.y);x.rotate(bodyAngle(p));x.translate(0,19);}if(upright)x.rotate(-f*upright);x.scale(BODY_K[tails?'fox':'hog'],BODY_K[tails?'fox':'hog']);// scaled about the feet
  x.save();x.scale(f,1);frame(S,row,fr,-fx0,-fy0);x.restore();
  const hx=(h.x-fx0)*f,hy=h.y-fy0;backOfHead(hx,hy,skid,false);
  head(x,i,hx,hy,RUN_HEAD,p.dead||p.hurt?'sad':skid?'angry':run>5?'happy':undefined);
  x.imageSmoothingEnabled=was;x.restore();if(!p.dead)shieldOver(x,p,t);return true;}
 function legs(a,b){x.strokeStyle=BODY;x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(-2,-12);x.lineTo(-3+a*6,-2);x.moveTo(2,-12);x.lineTo(3+b*6,-2);x.stroke();shoe(-3+a*6,-1,0);shoe(3+b*6,-1,0);}
 function shoe(sx,sy,rot){x.save();x.translate(sx,sy);x.rotate(rot);x.fillStyle=SHOE;x.beginPath();x.ellipse(2,-1.5,6.5,3.6,0,0,7);x.fill();x.fillStyle='#fff';x.fillRect(-1,-4.5,3,4);x.fillStyle=SOLE;x.fillRect(-3,0,10,1.6);x.restore();}
 function body(l=0){x.save();x.rotate(l);x.fillStyle=BODY;x.beginPath();x.ellipse(0,-17,8.5,8,0,0,7);x.fill();x.fillStyle=SKIN;x.beginPath();x.ellipse(3,-16,4.2,5.4,0,0,7);x.fill();x.restore();}
 function arm(a,side){x.save();x.translate(side,-21);x.rotate(a);x.strokeStyle=ARM;x.lineWidth=3.2;x.lineCap='round';x.beginPath();x.moveTo(0,0);x.lineTo(5,8);x.stroke();glove(5.5,9);x.restore();}
 function glove(gx,gy){x.fillStyle='#fff';x.beginPath();x.arc(gx,gy,3.2,0,7);x.fill();x.strokeStyle='#aaa';x.lineWidth=.8;x.stroke();}
}
// shields + invincibility: behind (glow) and in front (sparks)
function shieldUnder(x,p,t){if(!p.shield)return;const cy=p.y-(p.rolling||p.jumping?0:2);x.save();
 if(p.shield==='fire'){x.globalAlpha=.55+.15*Math.sin(t*20);const g=x.createRadialGradient(p.x,cy,4,p.x,cy,26);g.addColorStop(0,'#fff2a0');g.addColorStop(.5,'#ff8a1a');g.addColorStop(1,'rgba(255,40,0,0)');x.fillStyle=g;x.beginPath();x.arc(p.x,cy,26,0,7);x.fill();}
 else if(p.shield==='bubble'){x.globalAlpha=.35;x.fillStyle='#8ad0ff';x.beginPath();x.arc(p.x,cy,24+Math.sin(t*6)*1.5,0,7);x.fill();}
 else if(p.shield==='lightning'){x.globalAlpha=.3;x.fillStyle='#ffe88a';x.beginPath();x.arc(p.x,cy,24,0,7);x.fill();}
 else{x.globalAlpha=.35+.1*Math.sin(t*8);x.fillStyle='#7fb8ff';x.beginPath();x.arc(p.x,cy,24,0,7);x.fill();}
 x.restore();}
function shieldOver(x,p,t){const cy=p.y-(p.rolling||p.jumping?0:2);
 if(p.shield&&SP.sheet('shields')){const row=p.shield==='plain'?'plain':p.shield;spr(x,'shields',row,t*(row==='fire'?14:10),p.x,cy,{alpha:row==='fire'?.85:.6});}
 if(p.star>0&&spr(x,'shields','stars',t*12,p.x,cy))return;
 if(SP.sheet('shields'))return;
 x.save();
 if(p.shield==='bubble'){x.strokeStyle='rgba(230,248,255,.9)';x.lineWidth=2;x.beginPath();x.arc(p.x,cy,24+Math.sin(t*6)*1.5,0,7);x.stroke();x.fillStyle='rgba(255,255,255,.8)';x.beginPath();x.arc(p.x-9,cy-10,4,0,7);x.fill();}
 else if(p.shield==='lightning'){x.strokeStyle='#fff6a0';x.lineWidth=1.6;for(let k=0;k<3;k++){const a=t*7+k*2.1;x.beginPath();x.moveTo(p.x+Math.cos(a)*24,cy+Math.sin(a)*24);x.lineTo(p.x+Math.cos(a+.3)*16,cy+Math.sin(a+.3)*16);x.lineTo(p.x+Math.cos(a+.5)*25,cy+Math.sin(a+.5)*25);x.stroke();}}
 else if(p.shield==='plain'){x.strokeStyle='rgba(200,230,255,.8)';x.lineWidth=1.5;x.beginPath();x.arc(p.x,cy,24,t*4,t*4+2);x.stroke();}
 if(p.star>0){for(let k=0;k<6;k++){const a=t*9+k*1.047,r=20+Math.sin(t*14+k)*4;x.fillStyle=k%2?'#fff':'#ffe23a';x.globalAlpha=.9;x.beginPath();x.arc(p.x+Math.cos(a)*r,cy+Math.sin(a)*r,2.4,0,7);x.fill();}}
 x.restore();}

// ---------------- effects (world px): puffs, sparkles, score numbers, dust
class Fx{
 constructor(){this.list=[];}
 puff(px,py){this.list.push({k:'puff',lead:true,x:px,y:py,vx:0,vy:0,t:0,life:24,r:5});for(let k=0;k<6;k++){const a=k/6*Math.PI*2;this.list.push({k:'puff',x:px,y:py,vx:Math.cos(a)*1.2,vy:Math.sin(a)*1.2,t:0,life:24,r:5});}this.list.push({k:'flash',x:px,y:py,t:0,life:10});}
 sparkle(px,py){this.list.push({k:'spark',x:px,y:py,t:0,life:18});}
 score(px,py,n){this.list.push({k:'num',x:px,y:py,t:0,life:50,n});}
 dust(px,py,dir){this.list.push({k:'dust',x:px,y:py,vx:-dir*.6,vy:-.3,t:0,life:16});}
 debris(px,py){for(let k=0;k<8;k++)this.list.push({k:'rock',x:px+(k%4-1.5)*8,y:py+((k>>2)-.5)*16,vx:(k%4-1.5)*1.5,vy:-3-(k%3),t:0,life:60});}
 step(){for(let i=this.list.length-1;i>=0;i--){const e=this.list[i];e.t++;if(e.vx!==undefined){e.x+=e.vx;e.y+=e.vy;if(e.k==='rock')e.vy+=.25;}if(e.k==='num')e.y-=.6;if(e.t>=e.life)this.list.splice(i,1);}}
 draw(x){for(const e of this.list){const f=e.t/e.life;x.save();
  if(e.k==='puff'&&SP.sheet('fx')){if(!e.lead){x.restore();continue;}spr(x,'fx','pop',f*5,e.x,e.y);}
  else if(e.k==='flash'&&SP.sheet('fx')){}
  else if(e.k==='spark'&&spr(x,'ring','sparkle',f*4,e.x,e.y)){}
  else if(e.k==='dust'&&spr(x,'fx','dust',f*4,e.x,e.y-3,{flip:e.vx<0})){}
  else if(e.k==='rock'&&spr(x,'fx','rubble',f*4,e.x,e.y)){}
  else if(e.k==='puff'){x.globalAlpha=1-f;x.fillStyle=e.t<8?'#ffe08a':'#ffffff';x.beginPath();x.arc(e.x,e.y,e.r+f*6,0,7);x.fill();}
  else if(e.k==='flash'){x.globalAlpha=1-f;x.fillStyle='#fff';x.beginPath();x.arc(e.x,e.y,8+f*18,0,7);x.fill();}
  else if(e.k==='spark'){x.globalAlpha=1-f;x.strokeStyle='#fff';x.lineWidth=1.5;const r=3+f*8;x.beginPath();x.moveTo(e.x-r,e.y);x.lineTo(e.x+r,e.y);x.moveTo(e.x,e.y-r);x.lineTo(e.x,e.y+r);x.stroke();}
  else if(e.k==='num'){x.globalAlpha=Math.min(1,(1-f)*3);x.font='bold 11px Arial Black,Arial';x.textAlign='center';x.lineWidth=3;x.strokeStyle='#08103a';x.strokeText(e.n,e.x,e.y);x.fillStyle='#fff';x.fillText(e.n,e.x,e.y);}
  else if(e.k==='dust'){x.globalAlpha=.7*(1-f);x.fillStyle='#e8e4d0';x.beginPath();x.arc(e.x,e.y,2+f*4,0,7);x.fill();}
  else if(e.k==='rock'){x.fillStyle='#8a7a6a';x.fillRect(e.x-3,e.y-3,6,6);}
  x.restore();}}
}

// ---------------- HUD (screen px): Sonic 3's block, top left
const HUD_FONT='italic 900 %spx "Arial Black",Impact,system-ui,sans-serif';
const fmtTime=f=>{const s=Math.floor(f/60),m=Math.floor(s/60);return `${m}'${String(s%60).padStart(2,'0')}"${String(Math.floor((f%60)/60*100)).padStart(2,'0')}`;};
function drawHUD(x,W,H,p,frames,{top=0,size=null,name='',color='#fff'}={}){const u=Math.max(.7,Math.min(2,Math.min(W/330,H/240))),sz=size||Math.round(Math.max(11,Math.min(22,12*u))),pad=Math.round(8*u),lh=sz*1.3;
 const line=(label,val,yy,warn)=>{x.font=HUD_FONT.replace('%s',sz);x.textAlign='left';x.textBaseline='top';x.lineJoin='round';x.lineWidth=Math.max(3,sz*.3);x.strokeStyle='#08103a';x.strokeText(label,pad,yy);x.fillStyle=warn?'#ff3a3a':'#ffe23a';x.fillText(label,pad,yy);
  x.strokeText(val,pad+sz*4.3,yy);x.fillStyle='#fff';x.fillText(val,pad+sz*4.3,yy);};
 line('SCORE',String(p.score|0),pad+top,false);line('TIME',fmtTime(frames),pad+top+lh,false);line('RINGS',String(p.rings|0),pad+top+lh*2,(p.rings|0)===0&&(frames>>4)%2===1);
 if(name){x.font=HUD_FONT.replace('%s',Math.round(sz*.8));x.lineWidth=Math.max(3,sz*.25);x.strokeStyle='#08103a';x.strokeText(name,pad,pad+top+lh*3.1);x.fillStyle=color;x.fillText(name,pad,pad+top+lh*3.1);}
 return {bottom:pad+top+lh*4};}
// lives, bottom left: the player's face + "x N"
function drawLives(x,W,H,p,i,head,{bottom=0}={}){const u=Math.max(.7,Math.min(2,Math.min(W/330,H/240))),sz=Math.round(Math.max(11,Math.min(20,11*u))),pad=Math.round(8*u),y=H-pad-sz*1.6-bottom;
 x.save();x.fillStyle='rgba(8,16,58,.55)';x.beginPath();x.roundRect?.(pad-2,y-2,sz*4.6,sz*1.8,6);x.fill();head(x,i,pad+sz*.85,y+sz*.8,sz*1.6);
 x.font=HUD_FONT.replace('%s',sz);x.textAlign='left';x.textBaseline='middle';x.lineWidth=3;x.strokeStyle='#08103a';x.strokeText(`× ${p.lives|0}`,pad+sz*1.9,y+sz*.85);x.fillStyle='#fff';x.fillText(`× ${p.lives|0}`,pad+sz*1.9,y+sz*.85);x.restore();}
// Sonic 3 title card: the blue band from the top, yellow band from the bottom, red side bar, zone name sliding in
function drawTitleCard(x,W,H,f,zone,act){const T=f/60,inT=Math.min(1,T/.35),outT=Math.max(0,(T-2.2)/.4),e=1-Math.pow(1-inT,3),o=outT*outT;
 if(T>2.6)return false;x.save();
 const bh=H*.42;x.fillStyle='#1c38b8';x.fillRect(0,-bh+bh*e-bh*o*1.2,W,bh);x.fillStyle='#ffd21a';x.fillRect(0,H-bh*.5*e+bh*.6*o,W,bh*.5);
 x.fillStyle='#e8282c';const rw=Math.min(W*.18,90);x.fillRect(W*.12-(1-e)*W*.4-o*W*.6,0,rw,H);
 const card=SP.picture('title-card');if(card){const cw=Math.min(W*.96,1000),ch=cw*card.height/card.width;x.imageSmoothingEnabled=true;x.drawImage(card,(W-cw)/2+(1-e)*W+o*W,H*.47-ch*.62,cw,ch);}
 const sz=Math.round(Math.min(W/11,H/7,64));x.font=HUD_FONT.replace('%s',sz);x.textAlign='right';x.textBaseline='alphabetic';x.lineJoin='round';x.lineWidth=Math.max(4,sz*.16);x.strokeStyle='#08103a';
 const tx=W*.9+(1-e)*W+o*W;x.strokeText(zone,tx,H*.48);x.fillStyle='#fff';x.fillText(zone,tx,H*.48);
 x.font=HUD_FONT.replace('%s',Math.round(sz*.6));x.strokeText('ZONE',tx,H*.48+sz*.75);x.fillStyle='#fff';x.fillText('ZONE',tx,H*.48+sz*.75);
 if(act){const ax=W*.9-(1-e)*W*.2+o*W;x.font=HUD_FONT.replace('%s',Math.round(sz*1.5));x.fillStyle='#ffd21a';x.strokeText(String(act),ax,H*.48+sz*2.2);x.fillText(String(act),ax,H*.48+sz*2.2);}
 x.restore();return true;}

// flat ground drawn IN FRONT of the runner (owner, Nov 11: the loop's entrance foot should look like the ground carries on
// in front of it): the grass strip with its blades above the surface line y (they hide the shoes, like ground in front);
// the strip's solid band sits on the ground that is already there. It tiles on the same world grid as the terrain's own
// grass (stripX phase 0 = multiples of the strip width), so where it stops on flat ground the join can't be seen.
// Draw in world space (x scaled by the camera).
function frontGrass(x,x0,x1,y){const X=texInfo();if(!X||x1<=x0)return false;return stripX(x,'jungle-grass',x0,x1,y-X.g0,X.G.h);}
Object.assign(exports,{drawCorkscrew,frontGrass,PAL,TerrainArt,Backdrop,drawDecor,drawObject,drawShot,drawLoose,drawRunner,Fx,drawHUD,drawLives,drawTitleCard,fmtTime,CH});
