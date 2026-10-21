// Doom's software renderer, rebuilt in JS: front-to-back BSP walk with solid-seg clipping, wall columns (upper/lower/
// middle textures, pegging), visplanes drawn as horizontal spans, the sky, sprites clipped by wall silhouettes, masked
// middle textures, weapon sprites, spectre fuzz and the COLORMAP light tables (distance fade, fake contrast).
// The screen is an 8-bit buffer W x H (H 200 = the original resolution; W follows the screen's aspect, like the
// widescreen console/mobile ports). The 3D view fills rows 0..viewH-1.
const {pointOnLineSide}=require("src/engines/doom/level.js");
const LIGHTLEVELS=16,MAXLIGHTSCALE=48,MAXLIGHTZ=128,NUMCOLORMAPS=32,DISTMAP=2;
const SIL_BOTTOM=1,SIL_TOP=2,MAXSHORT=0x7fff,NEAR=1,MINZ=4;
const FUZZ=[1,-1,1,-1,1,1,-1,1,1,-1,1,1,1,-1,1,1,1,-1,-1,-1,-1,1,-1,-1,1,1,1,1,-1,1,-1,1,1,-1,-1,1,1,-1,-1,-1,-1,1,1,1,1,-1,1,1,-1,1];
const BAM=4294967296,TAU=Math.PI*2;
// light tables (R_InitLightTables): colormap number per light level and distance / scale
const zlight=[],scalelight=[];
for(let i=0;i<LIGHTLEVELS;i++){const start=((LIGHTLEVELS-1-i)*2)*NUMCOLORMAPS/LIGHTLEVELS;zlight[i]=new Int32Array(MAXLIGHTZ);scalelight[i]=new Int32Array(MAXLIGHTSCALE);
 for(let j=0;j<MAXLIGHTZ;j++){const scale=Math.floor(160/(j+1));let level=Math.floor(start-scale/DISTMAP);zlight[i][j]=Math.max(0,Math.min(NUMCOLORMAPS-1,level))*256;}
 for(let j=0;j<MAXLIGHTSCALE;j++){let level=Math.floor(start-j/DISTMAP);scalelight[i][j]=Math.max(0,Math.min(NUMCOLORMAPS-1,level))*256;}}
const lightIndex=(level,extra)=>Math.max(0,Math.min(LIGHTLEVELS-1,(level>>4)+extra));

class Renderer{
 constructor(gfx){this.gfx=gfx;this.W=0;this.H=0;this.skytex=0;this.drawsegs=[];this.vissprites=[];this.planes=[];this.planeCount=0;this.headHook=null;}
 setSize(W,H,viewH){
  if(W===this.W&&H===this.H&&viewH===this.viewH)return;
  this.W=W;this.H=H;this.viewH=viewH;this.screen=new Uint8Array(W*H);
  this.centerx=W/2;this.centery=viewH/2;this.projection=160*H/200;this.lightK=16*200/H;this.pscale=H/200;
  this.xtoviewangle=new Float64Array(W+1);this.distscale=new Float64Array(W);
  for(let x=0;x<=W;x++)this.xtoviewangle[x]=Math.atan((this.centerx-x-.5)/this.projection);
  for(let x=0;x<W;x++)this.distscale[x]=1/Math.cos(this.xtoviewangle[x]);
  this.yslope=new Float64Array(viewH);for(let y=0;y<viewH;y++)this.yslope[y]=this.projection/Math.abs(y-this.centery+.5);
  this.ceilingclip=new Int16Array(W);this.floorclip=new Int16Array(W);this.negone=new Int16Array(W).fill(-1);this.screenh=new Int16Array(W).fill(viewH);
  this.spanstart=new Int32Array(viewH);this.clipbot=new Int16Array(W);this.cliptop=new Int16Array(W);
  this.planes=[];this.planeCount=0;this.fuzzpos=0;this.clipangle=Math.floor(Math.atan(this.centerx/this.projection)/TAU*BAM)>>>0;}
 // ---- visplanes ----
 findPlane(height,picnum,light){
  if(picnum===this.gfx.skyflatnum){height=0;light=0;}
  for(let i=0;i<this.planeCount;i++){const p=this.planes[i];if(p.height===height&&p.picnum===picnum&&p.light===light)return p;}
  return this.newPlane(height,picnum,light);}
 newPlane(height,picnum,light){let p=this.planes[this.planeCount];if(!p){p={top:new Uint16Array(this.W+2),bottom:new Uint16Array(this.W+2)};this.planes[this.planeCount]=p;}this.planeCount++;
  p.height=height;p.picnum=picnum;p.light=light;p.minx=this.W;p.maxx=-1;p.top.fill(0xffff);return p;}
 checkPlane(p,start,stop){
  let intrl,intrh,unionl,unionh;
  if(start<p.minx){intrl=p.minx;unionl=start;}else{unionl=p.minx;intrl=start;}
  if(stop>p.maxx){intrh=p.maxx;unionh=stop;}else{unionh=p.maxx;intrh=stop;}
  let x;for(x=intrl;x<=intrh;x++)if(p.top[x+1]!==0xffff)break;
  if(x>intrh){p.minx=unionl;p.maxx=unionh;return p;}
  const n=this.newPlane(p.height,p.picnum,p.light);n.minx=start;n.maxx=stop;return n;}
 // ---- main entry ----
 render(lv,view){
  const W=this.W,g=this.gfx;this.lv=lv;
  this.viewx=view.x;this.viewy=view.y;this.viewz=view.z;this.viewangle=view.angle;this.extralight=view.extralight|0;
  this.fixed=view.fixedcolormap>=0?view.fixedcolormap*256:-1;this.viewcos=Math.cos(view.angle);this.viewangleBAM=Math.floor(((view.angle/TAU)%1+1)%1*BAM)>>>0;this.viewsin=Math.sin(view.angle);
  this.basexscale=this.viewsin/this.projection;this.baseyscale=this.viewcos/this.projection;
  this.validcount=(this.validcount|0)+1;
  this.ceilingclip.fill(-1);this.floorclip.fill(this.viewH);
  this.solid=[[-1e9,-1],[W,1e9]];this.drawsegs.length=0;this.vissprites.length=0;this.planeCount=0;
  if(lv.nodes.length)this.renderNode(lv.nodes.length-1);else this.subsector(0);
  this.drawPlanes();this.drawMasked(view);}
 renderNode(bsp){
  const lv=this.lv;
  while(!(bsp&0x8000)){const n=lv.nodes[bsp];const side=this.pointOnNodeSide(n);this.renderNode(n.children[side]);
   if(!this.checkBBox(n.bbox[side^1]))return;bsp=n.children[side^1];}
  this.subsector(bsp===0xffff?0:bsp&0x7fff);}
 pointOnNodeSide(n){const x=this.viewx,y=this.viewy;if(!n.dx)return x<=n.x?(n.dy>0?1:0):(n.dy<0?1:0);if(!n.dy)return y<=n.y?(n.dx<0?1:0):(n.dx>0?1:0);return (y-n.y)*n.dx>=(x-n.x)*n.dy?1:0;}
 // is any part of the box [top,bottom,left,right] visible through the solid-seg list? (R_CheckBBox)
 checkBBox(b){
  const x=this.viewx,y=this.viewy;const bx=x<=b[2]?0:x<b[3]?1:2,by=y>=b[0]?0:y>b[1]?1:2,code=(by<<2)+bx;if(code===5)return true;
  const C=[[3,0,2,1],[3,0,2,0],[3,1,2,0],null,[2,0,2,1],null,[3,1,3,0],null,[2,0,3,1],[2,1,3,1],[2,1,3,0]][code];if(!C)return true;
  const va=this.viewangleBAM,clip=this.clipangle,clip2=clip*2;
  let a1=(pointToAngle(x,y,b[C[0]],b[C[1]])-va)>>>0,a2=(pointToAngle(x,y,b[C[2]],b[C[3]])-va)>>>0;
  const span=(a1-a2)>>>0;if(span>=0x80000000)return true;
  let t=(a1+clip)>>>0;if(t>clip2){t=(t-clip2)>>>0;if(t>=span)return false;a1=clip;}
  t=(clip-a2)>>>0;if(t>clip2){t=(t-clip2)>>>0;if(t>=span)return false;a2=(-clip)>>>0;}
  const toX=a=>{const r=(a>=0x80000000?a-BAM:a)/BAM*TAU;return Math.ceil(this.centerx-Math.tan(r)*this.projection-.5);};
  let sx1=toX(a1),sx2=toX(a2);if(sx1===sx2)return false;sx2--;sx1=Math.max(0,sx1);sx2=Math.min(this.W-1,sx2);if(sx1>sx2)return false;
  for(const [f,l] of this.solid)if(l>=sx2)return !(sx1>=f&&sx2<=l);
  return true;}
 subsector(num){
  const lv=this.lv,ss=lv.subsectors[num];if(!ss)return;const sec=ss.sector,g=this.gfx;this.frontsector=sec;
  this.floorplane=sec.floorheight<this.viewz?this.findPlane(sec.floorheight,g.flatTranslation[sec.floorpic]??sec.floorpic,sec.lightlevel):null;
  this.ceilingplane=(sec.ceilingheight>this.viewz||sec.ceilingpic===g.skyflatnum)?this.findPlane(sec.ceilingheight,sec.ceilingpic===g.skyflatnum?sec.ceilingpic:(g.flatTranslation[sec.ceilingpic]??sec.ceilingpic),sec.lightlevel):null;
  if(sec.rvalid!==this.validcount){sec.rvalid=this.validcount;this.addSprites(sec);}
  for(let i=0;i<ss.numlines;i++)this.addLine(lv.segs[ss.firstline+i]);}
 addLine(seg){
  const v1=seg.v1,v2=seg.v2,vx=this.viewx,vy=this.viewy;
  // back side faces away
  if((vx-v1.x)*(v2.y-v1.y)-(vy-v1.y)*(v2.x-v1.x)<=0)return;
  const c=this.viewcos,s=this.viewsin;
  let x1=v1.x-vx,y1=v1.y-vy,x2=v2.x-vx,y2=v2.y-vy;
  let tz1=x1*c+y1*s,tx1=x1*s-y1*c,tz2=x2*c+y2*s,tx2=x2*s-y2*c;
  let u1=0,u2=seg.len;
  if(tz1<NEAR&&tz2<NEAR)return;
  if(tz1<NEAR){const t=(NEAR-tz1)/(tz2-tz1);tx1+=t*(tx2-tx1);u1+=t*(u2-u1);tz1=NEAR;}
  else if(tz2<NEAR){const t=(NEAR-tz1)/(tz2-tz1);tx2=tx1+t*(tx2-tx1);u2=u1+t*(u2-u1);tz2=NEAR;}
  const sx1=this.centerx+tx1/tz1*this.projection,sx2=this.centerx+tx2/tz2*this.projection;if(sx2<=sx1)return;
  let xs=Math.ceil(sx1-.5),xe=Math.ceil(sx2-.5)-1;if(xe<0||xs>=this.W)return;xs=Math.max(0,xs);xe=Math.min(this.W-1,xe);if(xs>xe)return;
  this.rw={seg,sx1,sx2,iz1:1/tz1,iz2:1/tz2,uz1:u1/tz1,uz2:u2/tz2};
  const back=seg.backsector,front=seg.frontsector;
  if(!back){this.clipSolid(xs,xe);return;}
  if(back.ceilingheight<=front.floorheight||back.floorheight>=front.ceilingheight){this.clipSolid(xs,xe);return;}
  if(back.ceilingheight!==front.ceilingheight||back.floorheight!==front.floorheight){this.clipPass(xs,xe);return;}
  if(back.ceilingpic===front.ceilingpic&&back.floorpic===front.floorpic&&back.lightlevel===front.lightlevel&&!seg.sidedef.midtexture)return;
  this.clipPass(xs,xe);}
 clipSolid(first,last){
  const S=this.solid;let i=0;while(S[i][1]<first-1)i++;
  if(first<S[i][0]){if(last<S[i][0]-1){this.storeWallRange(first,last);S.splice(i,0,[first,last]);return;}this.storeWallRange(first,S[i][0]-1);S[i][0]=first;}
  if(last<=S[i][1])return;
  let j=i;while(last>=S[j+1][0]-1){this.storeWallRange(S[j][1]+1,S[j+1][0]-1);j++;if(last<=S[j][1]){S[i][1]=S[j][1];S.splice(i+1,j-i);return;}}
  this.storeWallRange(S[j][1]+1,last);S[i][1]=last;S.splice(i+1,j-i);}
 clipPass(first,last){
  const S=this.solid;let i=0;while(S[i][1]<first-1)i++;
  if(first<S[i][0]){if(last<S[i][0]-1){this.storeWallRange(first,last);return;}this.storeWallRange(first,S[i][0]-1);}
  if(last<=S[i][1])return;
  while(last>=S[i+1][0]-1){this.storeWallRange(S[i][1]+1,S[i+1][0]-1);i++;if(last<=S[i][1])return;}
  this.storeWallRange(S[i][1]+1,last);}
 // R_StoreWallRange: draw the columns start..stop of the current seg and record a drawseg for sprite clipping
 storeWallRange(start,stop){
  if(start>stop)return;
  const g=this.gfx,rw=this.rw,seg=rw.seg,side=seg.sidedef,line=seg.linedef,front=seg.frontsector,back=seg.backsector,viewz=this.viewz;
  line.flags|=256;// ML_MAPPED: seen, show on the automap
  const W=this.W,cy=this.centery,proj=this.projection,span=rw.sx2-rw.sx1;
  const izAt=x=>rw.iz1+(x+.5-rw.sx1)/span*(rw.iz2-rw.iz1),uAt=(x,iz)=>(rw.uz1+(x+.5-rw.sx1)/span*(rw.uz2-rw.uz1))/iz;
  const ds={x1:start,x2:stop,curline:seg,scale1:proj*izAt(start),silhouette:0,bsilheight:0,tsilheight:0,sprtop:null,sprtopOff:0,sprbot:null,sprbotOff:0,masked:null};
  ds.scale2=proj*izAt(stop);ds.scalestep=start<stop?(ds.scale2-ds.scale1)/(stop-start):0;
  let worldtop=front.ceilingheight-viewz,worldbottom=front.floorheight-viewz,worldhigh=0,worldlow=0;
  let midtex=0,toptex=0,bottomtex=0,masked=false,markfloor,markceiling,midmid=0,topmid=0,botmid=0;
  if(!back){
   midtex=g.texTranslation[side.midtexture];markfloor=markceiling=true;
   midmid=line.flags&16?front.floorheight+g.texHeight(side.midtexture)-viewz:worldtop;midmid+=side.rowoffset;
   ds.silhouette=SIL_TOP|SIL_BOTTOM;ds.sprtop=this.screenh;ds.sprbot=this.negone;ds.bsilheight=Infinity;ds.tsilheight=-Infinity;
  }else{
   if(front.floorheight>back.floorheight){ds.silhouette=SIL_BOTTOM;ds.bsilheight=front.floorheight;}else if(back.floorheight>viewz){ds.silhouette=SIL_BOTTOM;ds.bsilheight=Infinity;}
   if(front.ceilingheight<back.ceilingheight){ds.silhouette|=SIL_TOP;ds.tsilheight=front.ceilingheight;}else if(back.ceilingheight<viewz){ds.silhouette|=SIL_TOP;ds.tsilheight=-Infinity;}
   if(back.ceilingheight<=front.floorheight){ds.sprbot=this.negone;ds.bsilheight=Infinity;ds.silhouette|=SIL_BOTTOM;}
   if(back.floorheight>=front.ceilingheight){ds.sprtop=this.screenh;ds.tsilheight=-Infinity;ds.silhouette|=SIL_TOP;}
   worldhigh=back.ceilingheight-viewz;worldlow=back.floorheight-viewz;
   if(front.ceilingpic===g.skyflatnum&&back.ceilingpic===g.skyflatnum)worldtop=worldhigh;
   markfloor=worldlow!==worldbottom||back.floorpic!==front.floorpic||back.lightlevel!==front.lightlevel;
   markceiling=worldhigh!==worldtop||back.ceilingpic!==front.ceilingpic||back.lightlevel!==front.lightlevel;
   if(back.ceilingheight<=front.floorheight||back.floorheight>=front.ceilingheight)markceiling=markfloor=true;
   if(worldhigh<worldtop){toptex=g.texTranslation[side.toptexture];topmid=line.flags&8?worldtop:back.ceilingheight+g.texHeight(side.toptexture)-viewz;}
   if(worldlow>worldbottom){bottomtex=g.texTranslation[side.bottomtexture];botmid=line.flags&16?worldtop:worldlow;}
   topmid+=side.rowoffset;botmid+=side.rowoffset;
   if(side.midtexture){masked=true;ds.masked=new Int32Array(stop-start+1);}
  }
  const textured=midtex||toptex||bottomtex||masked;
  if(front.floorheight>=viewz)markfloor=false;
  if(front.ceilingheight<=viewz&&front.ceilingpic!==g.skyflatnum)markceiling=false;
  if(markceiling&&this.ceilingplane)this.ceilingplane=this.checkPlane(this.ceilingplane,start,stop);else if(markceiling)markceiling=false;
  if(markfloor&&this.floorplane)this.floorplane=this.checkPlane(this.floorplane,start,stop);else if(markfloor)markfloor=false;
  // light: sector level + extra light, walls along x/y axes darker/lighter (fake contrast)
  let li=(front.lightlevel>>4)+this.extralight;if(seg.v1.y===seg.v2.y)li--;else if(seg.v1.x===seg.v2.x)li++;li=Math.max(0,Math.min(15,li));const lights=scalelight[li];
  const offset=seg.offset+side.textureoffset,cc=this.ceilingclip,fc=this.floorclip,cp=this.ceilingplane,fp=this.floorplane;
  for(let x=start;x<=stop;x++){
   const iz=izAt(x),scale=proj*iz;
   let yl=Math.ceil(cy-worldtop*scale);if(yl<cc[x]+1)yl=cc[x]+1;
   if(markceiling){const top=cc[x]+1;let bottom=yl-1;if(bottom>=fc[x])bottom=fc[x]-1;if(top<=bottom){cp.top[x+1]=top;cp.bottom[x+1]=bottom;}}
   let yh=Math.floor(cy-worldbottom*scale);if(yh>=fc[x])yh=fc[x]-1;
   if(markfloor){let top=yh+1;const bottom=fc[x]-1;if(top<=cc[x])top=cc[x]+1;if(top<=bottom){fp.top[x+1]=top;fp.bottom[x+1]=bottom;}}
   let col=0,cmap=0,iscale=0;
   if(textured){col=Math.floor(offset+uAt(x,iz));cmap=this.fixed>=0?this.fixed:lights[Math.min(MAXLIGHTSCALE-1,Math.floor(scale*this.lightK))];iscale=1/scale;}
   if(midtex){this.wallColumn(x,yl,yh,midtex,col,midmid,iscale,cmap);cc[x]=this.viewH;fc[x]=-1;}
   else{
    if(toptex){let mid=Math.floor(cy-worldhigh*scale);if(mid>=fc[x])mid=fc[x]-1;if(mid>=yl){this.wallColumn(x,yl,mid,toptex,col,topmid,iscale,cmap);cc[x]=mid;}else cc[x]=yl-1;}
    else if(markceiling)cc[x]=yl-1;
    if(bottomtex){let mid=Math.ceil(cy-worldlow*scale);if(mid<=cc[x])mid=cc[x]+1;if(mid<=yh){this.wallColumn(x,mid,yh,bottomtex,col,botmid,iscale,cmap);fc[x]=mid;}else fc[x]=yh+1;}
    else if(markfloor)fc[x]=yh+1;
    if(masked)ds.masked[x-start]=col;
   }
  }
  if((ds.silhouette&SIL_TOP||masked)&&!ds.sprtop){ds.sprtop=cc.slice(start,stop+1);ds.sprtopOff=start;}
  if((ds.silhouette&SIL_BOTTOM||masked)&&!ds.sprbot){ds.sprbot=fc.slice(start,stop+1);ds.sprbotOff=start;}
  if(masked&&!(ds.silhouette&SIL_TOP)){ds.silhouette|=SIL_TOP;ds.tsilheight=-Infinity;}
  if(masked&&!(ds.silhouette&SIL_BOTTOM)){ds.silhouette|=SIL_BOTTOM;ds.bsilheight=Infinity;}
  this.drawsegs.push(ds);}
 wallColumn(x,yl,yh,texnum,col,texturemid,iscale,cmap){
  if(yl>yh)return;const t=this.gfx.tex(texnum),h=t.h,w=t.w,c=((col%w)+w)%w,base=c*h,pix=t.pix,cm=this.gfx.colormaps,scr=this.screen,W=this.W;
  let frac=texturemid+(yl-this.centery)*iscale,p=yl*W+x;
  if((h&(h-1))===0){const m=h-1;for(let y=yl;y<=yh;y++){scr[p]=cm[cmap+pix[base+(Math.floor(frac)&m)]];frac+=iscale;p+=W;}}
  else for(let y=yl;y<=yh;y++){let r=Math.floor(frac)%h;if(r<0)r+=h;scr[p]=cm[cmap+pix[base+r]];frac+=iscale;p+=W;}}
 // ---- floors, ceilings, sky ----
 drawPlanes(){
  const g=this.gfx;
  for(let i=0;i<this.planeCount;i++){const pl=this.planes[i];if(pl.minx>pl.maxx)continue;
   if(pl.picnum===g.skyflatnum){this.drawSky(pl);continue;}
   this.planeheight=Math.abs(pl.height-this.viewz);this.planezlight=zlight[lightIndex(pl.light,this.extralight)];this.flatpix=g.flat(pl.picnum);
   pl.top[pl.maxx+2]=0xffff;pl.top[pl.minx]=0xffff;
   const stop=pl.maxx+1;
   for(let x=pl.minx;x<=stop;x++)this.makeSpans(x,pl.top[x],pl.bottom[x],pl.top[x+1],pl.bottom[x+1]);}}
 makeSpans(x,t1,b1,t2,b2){
  const ss=this.spanstart;if(t1===0xffff){t1=this.viewH;b1=-1;}if(t2===0xffff){t2=this.viewH;b2=-1;}
  while(t1<t2&&t1<=b1){this.mapPlane(t1,ss[t1],x-1);t1++;}
  while(b1>b2&&b1>=t1){this.mapPlane(b1,ss[b1],x-1);b1--;}
  while(t2<t1&&t2<=b2){ss[t2]=x;t2++;}
  while(b2>b1&&b2>=t2){ss[b2]=x;b2--;}}
 mapPlane(y,x1,x2){
  if(x2<x1)return;
  const distance=this.planeheight*this.yslope[y],length=distance*this.distscale[x1],ang=this.viewangle+this.xtoviewangle[x1];
  let xf=this.viewx+Math.cos(ang)*length,yf=-this.viewy-Math.sin(ang)*length;const xs=distance*this.basexscale,ys=distance*this.baseyscale;
  const cmap=this.fixed>=0?this.fixed:this.planezlight[Math.min(MAXLIGHTZ-1,Math.floor(distance/16))];
  const cm=this.gfx.colormaps,f=this.flatpix,scr=this.screen;let p=y*this.W+x1;
  for(let x=x1;x<=x2;x++){scr[p++]=cm[cmap+f[((Math.floor(yf)&63)<<6)|(Math.floor(xf)&63)]];xf+=xs;yf+=ys;}}
 drawSky(pl){
  const t=this.gfx.tex(this.gfx.texTranslation[this.skytex]),w=t.w,h=t.h,cm=this.gfx.colormaps,cmap=this.fixed>=0?this.fixed:0,iscale=200/this.H,scr=this.screen,W=this.W;
  for(let x=pl.minx;x<=pl.maxx;x++){const top=pl.top[x+1],bot=pl.bottom[x+1];if(top===0xffff||top>bot)continue;
   let a=(this.viewangle+this.xtoviewangle[x])/TAU;a-=Math.floor(a);const col=Math.floor(a*1024)%w,base=col*h;
   let frac=100+(top-this.centery)*iscale,p=top*W+x;
   for(let y=top;y<=bot;y++){let r=Math.floor(frac)%h;if(r<0)r+=h;scr[p]=cm[cmap+t.pix[base+r]];frac+=iscale;p+=W;}}}
 // ---- sprites ----
 addSprites(sec){for(let th=sec.thinglist;th;th=th.snext)this.projectSprite(th);}
 projectSprite(th){
  const g=this.gfx,rx=th.rx??th.x,ry=th.ry??th.y,rz=th.rz??th.z;
  const trx=rx-this.viewx,try_=ry-this.viewy,tz=trx*this.viewcos+try_*this.viewsin;if(tz<MINZ)return;
  let tx=trx*this.viewsin-try_*this.viewcos;if(Math.abs(tx)>tz*4)return;
  const st=th.state;if(!st||st.sprite<0)return;const sd=g.sprites[st.sprite];const fr=sd?.frames[st.frame&0x7fff];if(!fr)return;
  let rot=0;if(fr.rotate){const ang=pointToAngle(this.viewx,this.viewy,rx,ry);rot=((ang-th.angle+0x90000000)>>>29)&7;}
  const lump=fr.lump[rot];if(lump<0)return;const flip=fr.flip[rot],patch=g.patchAt(lump);if(!patch)return;
  const xscale=this.projection/tz;
  tx-=patch.left;const x1=Math.ceil(this.centerx+tx*xscale-.5);if(x1>=this.W)return;
  tx+=patch.w;const x2=Math.ceil(this.centerx+tx*xscale-.5)-1;if(x2<0||x2<x1)return;
  const iscale=1/xscale,vis={x1:Math.max(0,x1),x2:Math.min(this.W-1,x2),gx:rx,gy:ry,gz:rz,gzt:rz+patch.top,scale:xscale,patch,thing:th,
   texturemid:rz+patch.top-this.viewz,xiscale:flip?-iscale:iscale,startfrac:flip?patch.w-1e-4:0,cmap:0,fuzz:false};
  if(vis.x1>x1)vis.startfrac+=vis.xiscale*(vis.x1-x1);
  if(th.flags&0x40000)vis.fuzz=true;// MF_SHADOW
  else if(this.fixed>=0)vis.cmap=this.fixed;
  else if(st.frame&0x8000)vis.cmap=0;
  else vis.cmap=scalelight[lightIndex(th.subsector?.sector.lightlevel??160,this.extralight)][Math.min(MAXLIGHTSCALE-1,Math.floor(xscale*this.lightK))];
  vis.rot=rot;vis.flip=flip;vis.lump=lump;
  this.vissprites.push(vis);}
 drawMasked(view){
  const vs=this.vissprites.sort((a,b)=>a.scale-b.scale);
  for(const v of vs)this.drawSprite(v);
  for(let i=this.drawsegs.length-1;i>=0;i--){const ds=this.drawsegs[i];if(ds.masked)this.renderMaskedSegRange(ds,ds.x1,ds.x2);}
  if(view.psprites)for(const ps of view.psprites)this.drawPSprite(ps,view);}
 drawSprite(spr){
  const cb=this.clipbot,ct=this.cliptop;for(let x=spr.x1;x<=spr.x2;x++){cb[x]=-2;ct[x]=-2;}
  for(let i=this.drawsegs.length-1;i>=0;i--){const ds=this.drawsegs[i];
   if(ds.x1>spr.x2||ds.x2<spr.x1||(!ds.silhouette&&!ds.masked))continue;
   const r1=Math.max(ds.x1,spr.x1),r2=Math.min(ds.x2,spr.x2);
   const lowscale=Math.min(ds.scale1,ds.scale2),scale=Math.max(ds.scale1,ds.scale2);
   if(scale<spr.scale||(lowscale<spr.scale&&!segSide(spr.gx,spr.gy,ds.curline))){if(ds.masked)this.renderMaskedSegRange(ds,r1,r2);continue;}
   let sil=ds.silhouette;if(spr.gz>=ds.bsilheight)sil&=~SIL_BOTTOM;if(spr.gzt<=ds.tsilheight)sil&=~SIL_TOP;
   if(sil&SIL_BOTTOM)for(let r=r1;r<=r2;r++)if(cb[r]===-2)cb[r]=ds.sprbot[r-ds.sprbotOff];
   if(sil&SIL_TOP)for(let r=r1;r<=r2;r++)if(ct[r]===-2)ct[r]=ds.sprtop[r-ds.sprtopOff];}
  for(let x=spr.x1;x<=spr.x2;x++){if(cb[x]===-2)cb[x]=this.viewH;if(ct[x]===-2)ct[x]=-1;}
  this.drawVisSprite(spr,ct,cb);
  if(this.headHook&&spr.thing)this.headHook(this,spr,ct,cb);}
 drawVisSprite(v,ct,cb){
  const p=v.patch,h=p.h,cm=this.gfx.colormaps,scr=this.screen,W=this.W,cy=this.centery,iscale=1/v.scale,top=cy-v.texturemid*v.scale;
  let frac=v.startfrac;
  for(let x=v.x1;x<=v.x2;x++,frac+=v.xiscale){const col=Math.floor(frac);if(col<0||col>=p.w)continue;const base=col*h;
   let yl=Math.ceil(top),yh=Math.ceil(top+h*v.scale)-1;if(yl<=ct[x])yl=ct[x]+1;if(yh>=cb[x])yh=cb[x]-1;if(yl>yh)continue;
   let r=v.texturemid+(yl-cy)*iscale;
   if(v.fuzz){if(yl<1)yl=1;if(yh>this.viewH-2)yh=this.viewH-2;r=v.texturemid+(yl-cy)*iscale;
    for(let y=yl;y<=yh;y++,r+=iscale){const ri=Math.floor(r);if(ri>=0&&ri<h&&p.mask[base+ri]){const q=y*W+x;scr[q]=cm[6*256+scr[q+FUZZ[this.fuzzpos]*W]];this.fuzzpos=(this.fuzzpos+1)%50;}}continue;}
   for(let y=yl;y<=yh;y++,r+=iscale){const ri=Math.floor(r);if(ri>=0&&ri<h&&p.mask[base+ri])scr[y*W+x]=cm[v.cmap+p.pix[base+ri]];}}}
 renderMaskedSegRange(ds,x1,x2){
  const g=this.gfx,seg=ds.curline,front=seg.frontsector,back=seg.backsector,side=seg.sidedef;if(!back)return;
  const texnum=g.texTranslation[side.midtexture],t=g.tex(texnum),cm=g.colormaps,scr=this.screen,W=this.W,cy=this.centery;
  let li=(front.lightlevel>>4)+this.extralight;if(seg.v1.y===seg.v2.y)li--;else if(seg.v1.x===seg.v2.x)li++;const lights=scalelight[Math.max(0,Math.min(15,li))];
  let mid=seg.linedef.flags&16?Math.max(front.floorheight,back.floorheight)+t.h-this.viewz:Math.min(front.ceilingheight,back.ceilingheight)-this.viewz;mid+=side.rowoffset;
  for(let x=x1;x<=x2;x++){const k=x-ds.x1,col=ds.masked[k];if(col===MAXSHORT)continue;
   const scale=ds.scale1+k*ds.scalestep,cmap=this.fixed>=0?this.fixed:lights[Math.min(MAXLIGHTSCALE-1,Math.floor(scale*this.lightK))];
   const c=((col%t.w)+t.w)%t.w,base=c*t.h,top=cy-mid*scale,iscale=1/scale;
   let yl=Math.ceil(top),yh=Math.ceil(top+t.h*scale)-1;const ct=ds.sprtop[x-ds.sprtopOff],cb=ds.sprbot[x-ds.sprbotOff];
   if(yl<=ct)yl=ct+1;if(yh>=cb)yh=cb-1;let r=mid+(yl-cy)*iscale;
   for(let y=yl;y<=yh;y++,r+=iscale){const ri=Math.floor(r);if(ri>=0&&ri<t.h&&t.mask[base+ri])scr[y*W+x]=cm[cmap+t.pix[base+ri]];}
   ds.masked[k]=MAXSHORT;}}
 // weapon sprites (R_DrawPSprite): sx/sy in 320x200 units
 drawPSprite(ps,view){
  const g=this.gfx,st=ps.state;if(!st)return;const sd=g.sprites[st.sprite],fr=sd?.frames[st.frame&0x7fff];if(!fr)return;
  const patch=g.patchAt(fr.lump[0]);if(!patch)return;const flip=fr.flip[0],sc=this.pscale;
  let tx=ps.sx-160-patch.left;const x1=Math.ceil(this.centerx+tx*sc-.5);tx+=patch.w;const x2=Math.ceil(this.centerx+tx*sc-.5)-1;if(x2<0||x1>=this.W)return;
  const vis={x1:Math.max(0,x1),x2:Math.min(this.W-1,x2),scale:sc,patch,texturemid:100+.5-(ps.sy-patch.top),xiscale:flip?-1/sc:1/sc,startfrac:flip?patch.w-1e-4:0,cmap:0,fuzz:false};
  if(vis.x1>x1)vis.startfrac+=vis.xiscale*(vis.x1-x1);
  if(view.invisible)vis.fuzz=true;else if(this.fixed>=0)vis.cmap=this.fixed;else if(st.frame&0x8000)vis.cmap=0;else vis.cmap=scalelight[lightIndex(view.sectorlight,this.extralight)][MAXLIGHTSCALE-1];
  this.drawVisSprite(vis,this.negone,this.screenh);}
 // 8-bit screen -> RGBA (palette 0..13: normal, red pain, yellow pickup, green radiation suit)
 blit(img,palette=0){const pal=this.gfx.palettes[palette]||this.gfx.palettes[0],src=this.screen,dst=new Uint32Array(img.data.buffer);for(let i=0,n=src.length;i<n;i++)dst[i]=pal[src[i]];}
}
// is the point on the back side of the seg?
function segSide(x,y,seg){const v1=seg.v1,v2=seg.v2,dx=v2.x-v1.x,dy=v2.y-v1.y;
 if(!dx)return x<=v1.x?(dy>0?1:0):(dy<0?1:0);if(!dy)return y<=v1.y?(dx<0?1:0):(dx>0?1:0);return (y-v1.y)*dx>=(x-v1.x)*dy?1:0;}
// angle from (x1,y1) to (x2,y2) as a 32-bit binary angle (0 = east, counter-clockwise)
function pointToAngle(x1,y1,x2,y2){let a=Math.atan2(y2-y1,x2-x1);if(a<0)a+=TAU;return Math.floor(a/TAU*BAM)>>>0;}
Object.assign(exports,{Renderer,pointToAngle,segSide,zlight,scalelight,BAM,TAU});
