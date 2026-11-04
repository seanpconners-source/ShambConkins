// SUNDOWN SHOWDOWN scenery, drawn as pixel art into the low-resolution game buffer (S buffer pixels per world unit, the
// same size as the sprite sheets' pixels, so drawn scenery and the owner's sprites look like one 16-bit picture).
// Static pieces (skies, mountain strips, building fronts, rock shelves, train cars) are painted once into small cached
// canvases with plank grain, dithering and outlines; per frame they are just blitted, with the moving parts on top
// (shutters, doors, flames, wheels, smoke). Any drop-in picture in assets/sundown/ (see src/data/sundownSprites.js:
// <stage>-sky/-far/-near/-ground/-building-N, canyon-rock/-ledge-top, crate, barrel, wagon, trough, hitching-post, lamp)
// replaces the drawn version of that piece.
const SPR=require("src/data/sundownSprites.js");
const {drawText:gbDraw,textWidth:gbWidth}=require("src/pkmn/gbFont.js");
const {GY,TRAIN_ROOF,COUPLING}=require("src/engines/sundown/stages.js");
const S=4/3;   // buffer pixels per world unit (sprite sheets: .75 units per pixel)

const PAL={
 town:{sky:['#24163c','#4a2048','#8c3050','#d0583e','#f69648','#ffd27a'],sun:'#fff0b0',sunGlow:'#ffc86a',far:['#7c2c40','#9c3e48'],near:['#4a1a2e','#62243a'],ground:['#7c4a2a','#94603a','#5e341c','#b0784a'],line:'#1a0a08'},
 train:{sky:['#28407a','#3c5c9c','#6a86b8','#b4a8b0','#eea070','#ffcc84'],sun:'#fff6c8',sunGlow:'#ffd890',far:['#8a4a50','#a8605a'],near:['#6a3a2e','#84503a'],ground:['#b07a48','#c89058','#8a5a32','#d8a46a'],line:'#1a0a08'},
 canyon:{sky:['#3a1222','#6e1e2a','#a83228','#d85a2c','#f88c3a','#ffc060'],sun:'#fff2b8',sunGlow:'#ffb050',far:['#94342a','#b44a32'],near:['#6c2418','#86321e'],ground:['#8c4628','#a65a32','#6a3018','#c07040'],line:'#1a0606'},
 mission:{sky:['#03040e','#070a20','#0e1434','#18204a','#262c5e','#3a3466'],sun:'#f0eedc',sunGlow:'#7a86c0',far:['#141836','#1c2244'],near:['#0c0e24','#14162e'],ground:['#3a2a28','#4a3632','#281c1a','#5a463e'],line:'#04040c'},
};
const WOOD=[['#8a5634','#6c4024','#a46c42'],['#7a6c5a','#5c5040','#968672'],['#9a4832','#7a3422','#b45e42'],['#5e5274','#463c58','#786c90']];
const ADOBE=[['#c8946a','#a8744c','#dcae84'],['#bc8c66','#9a6c48','#d2a680'],['#d0a274','#ae8052','#e2bc90'],['#b28058','#90603c','#c89a70']];
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g];};
// cheap deterministic noise for texture
const hash=(a,b=0)=>{let h=(a*374761393+b*668265263)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296;};
// ordered 2x2 dither between two colours: share f of the second colour
function ditherRect(g,x,y,w,h,c1,c2,f){g.fillStyle=c1;g.fillRect(x,y,w,h);if(f<=0)return;g.fillStyle=c2;const m=[[0,.5],[.75,.25]];
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(f>m[yy&1][xx&1])g.fillRect(x+xx,y+yy,1,1);}

function createScenery(){
 const cache=new Map();
 const memo=(key,make)=>{let c=cache.get(key);if(!c){c=make();cache.set(key,c);}return c;};
 function sky(id,pw,ph){return memo(`sky:${id}:${pw}:${ph}`,()=>{const p=PAL[id],[c,g]=mk(pw,ph),n=p.sky.length-1;
   for(let y=0;y<ph;y++){const t=y/(ph*.86)*n,i=Math.min(n-1,Math.floor(t)),f=Math.min(1,t-i);g.fillStyle=f<.5?p.sky[i]:p.sky[i+1];if(f>.25&&f<.75&&(y&1))g.fillStyle=p.sky[i+(f<.5?1:0)];g.fillRect(0,y,pw,1);}
   if(id==='mission'){for(let k=0;k<160;k++){const x=Math.floor(hash(k,1)*pw),y=Math.floor(hash(k,2)*ph*.7);g.fillStyle=hash(k,3)<.15?'#ffffff':'#aab0d8';g.fillRect(x,y,1,1);}}
   else{g.fillStyle='#ffffff22';for(let k=0;k<5;k++){const y=Math.floor(ph*(.18+k*.1)),x=Math.floor(hash(k,9)*pw*.8),w=Math.floor(40+hash(k,4)*120);g.fillRect(x,y,w,2);g.fillRect(x+8,y+2,w-20,1);}}
   return c;});}
 // a repeating mountain strip (tile width 512 px); kind far = mesas/buttes, near = hills/rooftops/cliffs
 function strip(id,kind,ph){return memo(`strip:${id}:${kind}:${ph}`,()=>{const p=PAL[id],[c,g]=mk(512,ph),cols=p[kind],base=Math.round(GY*S);
   g.fillStyle=cols[0];
   if(kind==='far'){let x=0;while(x<512){const w=40+Math.floor(hash(x,7)*70),h=Math.round((id==='canyon'?70:46)+hash(x,8)*(id==='canyon'?60:40));const top=base-h;
     g.fillStyle=cols[0];g.fillRect(x,top,w,h);g.fillRect(x-6,top+8,w+12,h-8);g.fillRect(x-12,top+20,w+24,h-20);
     g.fillStyle=cols[1];g.fillRect(x+w-4,top,4,h);g.fillRect(x+w+2,top+8,4,h-8);g.fillRect(x,top,w,2);x+=w+30+Math.floor(hash(x,5)*50);}}
   else{for(let x=0;x<512;x++){const h=Math.round(18+10*Math.sin(x/37)+7*Math.sin(x/13+1)+(id==='canyon'?22*Math.max(0,Math.sin(x/61)):0));g.fillStyle=cols[0];g.fillRect(x,base-h,1,h);if(Math.sin(x/37)>.6){g.fillStyle=cols[1];g.fillRect(x,base-h,1,2);}}
    if(id==='town'||id==='mission'){g.fillStyle=cols[1];for(let x=0;x<512;x+=60+Math.floor(hash(x,3)*40)){const h=18+Math.floor(hash(x,4)*16),w=22+Math.floor(hash(x,6)*18);g.fillRect(x,base-h-20,w,h+20);if(id==='mission'){g.fillRect(x+w/2-3,base-h-30,6,12);}}
     if(id==='town'){g.fillStyle=cols[1];g.fillRect(300,base-78,4,58);g.fillRect(318,base-78,4,58);g.fillRect(292,base-92,38,18);}}}
   return c;});}
 // pixel-art building front, painted once
 function front(b){return memo(`bld:${b.style}:${b.hue}:${b.w}:${b.h}:${b.floors}:${b.sign}`,()=>{
   const w=Math.round(b.w*S),h=Math.round(b.h*S),[c,g]=mk(w+10,h+4),town=b.style==='town',pal=town?WOOD[b.hue]:ADOBE[b.hue],ox=5;
   const wall=pal[0],dark=pal[1],lite=pal[2],line='#1a0a08';
   const roofPx=Math.round((GY-b.roofY)*S),top=h-roofPx;   // facade above the walkable roof line
   if(town){
    g.fillStyle=wall;g.fillRect(ox,0,w,h);
    for(let x=0;x<w;x+=5){g.fillStyle=dark;g.fillRect(ox+x,0,1,h);if(hash(x,b.hue)<.3){g.fillStyle=lite;g.fillRect(ox+x+2,Math.floor(hash(x,2)*h),1,3);}}
    for(let y=6;y<h;y+=Math.round(9+hash(y,1)*6)){g.fillStyle='#0002';g.fillRect(ox,y,w,1);}
    // false-front cornice and sign board
    g.fillStyle=dark;g.fillRect(ox-3,0,w+6,4);g.fillStyle=lite;g.fillRect(ox-3,0,w+6,1);g.fillStyle=line;g.fillRect(ox-3,4,w+6,1);
    const sw=Math.min(w-10,gbWidth(b.sign)+10);g.fillStyle='#2a160c';g.fillRect(ox+w/2-sw/2,7,sw,13);g.fillStyle='#4a2a16';g.fillRect(ox+w/2-sw/2+1,8,sw-2,11);
    if(gbWidth(b.sign)<=w-14)gbDraw(g,b.sign,Math.round(ox+w/2-gbWidth(b.sign)/2),10,'#f4dca0');
    g.fillStyle=line;g.fillRect(ox,top-2,w,2);
   }else{
    // adobe: plaster with dithered patches, rounded parapet, wooden beams poking out
    g.fillStyle=wall;g.beginPath();g.moveTo(ox,8);g.quadraticCurveTo(ox+w/2,-4,ox+w,8);g.lineTo(ox+w,h);g.lineTo(ox,h);g.fill();
    for(let k=0;k<w*h/90;k++){const x=Math.floor(hash(k,b.hue+20)*w),y=8+Math.floor(hash(k,b.hue+21)*(h-8));g.fillStyle=hash(k,5)<.5?dark:lite;g.fillRect(ox+x,y,2,1);}
    for(let x=10;x<w-6;x+=22){g.fillStyle='#4a2c18';g.fillRect(ox+x,top-5,5,4);g.fillStyle='#2a1a0c';g.fillRect(ox+x,top-2,5,1);}
    const sw=Math.min(w-14,gbWidth(b.sign)+8);g.fillStyle='#3a2414';g.fillRect(ox+w/2-sw/2,12,sw,11);if(gbWidth(b.sign)<=w-16)gbDraw(g,b.sign,Math.round(ox+w/2-gbWidth(b.sign)/2),14,'#ffd890');
   }
   g.fillStyle='#0004';g.fillRect(ox+w-3,0,3,h);g.fillStyle=line;g.fillRect(ox-1,0,1,h);g.fillRect(ox+w,0,1,h);
   // door (opening drawn per frame), its frame
   const dx=Math.round((b.door-b.x)*S)+ox,dh=Math.round(30*S),dw=Math.round(18*S);g.fillStyle=line;g.fillRect(dx-dw/2-2,h-dh-2,dw+4,dh+2);g.fillStyle=dark;g.fillRect(dx-dw/2-1,h-dh-1,dw+2,dh+1);
   if(!town){g.fillStyle=line;g.beginPath();g.arc(dx,h-dh+4,dw/2+2,Math.PI,0);g.fill();}
   // window frames (openings drawn per frame)
   for(const wn of b.wins){const wx=Math.round((wn.x-b.x)*S)+ox,wy=Math.round((wn.y-(GY-b.h))*S),ww=Math.round(18*S),wh=Math.round(18*S);
    g.fillStyle=line;g.fillRect(wx-ww/2-2,wy-wh/2-2,ww+4,wh+4);g.fillStyle=town?'#c8b088':'#6a4a2c';g.fillRect(wx-ww/2-1,wy+wh/2,ww+2,2);}
   // balcony: posts down to the street, floor, rail with balusters
   if(b.floors===2){const by=h-Math.round(40*S);g.fillStyle='#3a2212';
    for(let x=-4;x<=w+4;x+=Math.max(30,Math.round(w/3))){g.fillRect(ox+x-1,by,3,h-by);g.fillRect(ox+x-1,by-Math.round(30*S),3,Math.round(30*S));}
    g.fillStyle='#5a3418';g.fillRect(ox-6,by,w+12,5);g.fillStyle='#8a5a30';g.fillRect(ox-6,by,w+12,1);g.fillStyle=line;g.fillRect(ox-6,by+5,w+12,1);
    g.fillStyle='#4a2a14';g.fillRect(ox-6,by-15,w+12,2);for(let x=-5;x<w+6;x+=4)g.fillRect(ox+x,by-13,1,13);
    g.fillStyle='#3a2212';g.fillRect(ox-8,by-Math.round(30*S)-3,w+16,3);}
   return c;});}
 // a canyon shelf: layered red rock from its top down to the road
 function shelf(l){return memo(`ledge:${Math.round(l.w)}:${Math.round(l.y)}`,()=>{const w=Math.round(l.w*S),h=Math.round((GY-l.y)*S)+2,[c,g]=mk(w+16,h),p=PAL.canyon;
   for(let y=0;y<h;y++){const band=Math.floor(y/7)%3,inset=Math.max(0,Math.round(8-y*.08));g.fillStyle=['#8a3a24','#7a301e','#9a4428'][band];g.fillRect(inset,y,w+16-inset*2,1);}
   for(let k=0;k<w*h/60;k++){const x=Math.floor(hash(k,l.w)*w)+8,y=Math.floor(hash(k,l.y)*h);g.fillStyle=hash(k,3)<.5?'#5e2414':'#b25a34';g.fillRect(x,y,hash(k,4)<.5?2:1,1);}
   g.fillStyle='#c8683c';g.fillRect(6,0,w+4,3);g.fillStyle='#e8905a';g.fillRect(8,0,w,1);g.fillStyle='#3a1208';g.fillRect(6,3,w+4,1);
   g.fillStyle='#2a0c0499';g.fillRect(w+8,0,6,h);return c;});}
 // train cars
 function car(cr){return memo(`car:${cr.kind}:${cr.w}`,()=>{const w=Math.round(cr.w*S),roof=Math.round((GY-(cr.cabY??cr.y))*S),h=roof+6,[c,g]=mk(w+4,h+8),line='#140808';
   const body=h-Math.round(12*S);   // wheels/frame below
   if(cr.kind==='box'){g.fillStyle='#7a2a1e';g.fillRect(2,0,w,body);for(let x=2;x<w;x+=6){g.fillStyle='#5e1e14';g.fillRect(x,2,1,body-2);}
    g.fillStyle='#4a160e';g.fillRect(2,0,w,3);g.fillStyle='#9a3c2a';g.fillRect(2,0,w,1);g.fillStyle='#2a0c08';g.fillRect(w/2-14,0,4,2);
    const dw=Math.round(w*.26);g.fillStyle='#5a1c12';g.fillRect(w/2-dw/2,8,dw,body-12);g.fillStyle=line;g.strokeStyle=line;g.lineWidth=1;g.strokeRect(w/2-dw/2+.5,8.5,dw,body-12);g.beginPath();g.moveTo(w/2-dw/2,8);g.lineTo(w/2+dw/2,body-4);g.moveTo(w/2+dw/2,8);g.lineTo(w/2-dw/2,body-4);g.stroke();
    gbDraw(g,'S.R.R.',8,Math.round(body/2)-2,'#e8c890');}
   else if(cr.kind==='flat'){g.fillStyle='#5a3418';g.fillRect(2,body-10,w,10);g.fillStyle='#8a5a30';g.fillRect(2,body-10,w,2);for(let x=2;x<w;x+=10){g.fillStyle='#3a2210';g.fillRect(x,body-8,1,8);}}
   else if(cr.kind==='coal'){g.fillStyle='#2a2a30';g.fillRect(2,8,w,body-8);g.fillStyle='#16161a';for(let x=2;x<w;x+=3)g.fillRect(x,6-Math.round(3*Math.abs(Math.sin(x/9))),3,4);g.fillStyle='#48484e';g.fillRect(2,8,w,1);}
   else if(cr.kind==='tank'){g.fillStyle='#3a3a44';g.beginPath();g.roundRect?.(4,6,w-4,body-8,10);g.fill();g.fillStyle='#5a5a66';g.fillRect(10,9,w-16,3);g.fillStyle='#2a2a32';g.fillRect(w/2-6,0,12,7);gbDraw(g,'WATER',Math.round(w/2-20),Math.round(body/2),'#c8c8d0');}
   else if(cr.kind==='engine'){g.fillStyle='#1a1a22';g.fillRect(2,24,w*.62,body-24);g.fillStyle='#2a2a36';g.fillRect(2,26,w*.62,3);
    for(let x=10;x<w*.6;x+=22){g.fillStyle='#b88a30';g.fillRect(x,24,2,body-24);}
    g.fillStyle='#7a1a14';g.fillRect(w*.62,0,w*.36,body);g.fillStyle='#5a120e';g.fillRect(w*.62,0,w*.36,4);g.fillStyle='#ffd27a';g.fillRect(w*.7,10,w*.2,14);g.fillStyle=line;g.fillRect(w*.7+w*.1-1,10,2,14);
    g.fillStyle='#1a1a22';g.fillRect(w*.08,0,16,26);g.fillRect(w*.08-4,0,24,5);g.fillStyle='#b88a30';g.fillRect(w*.08-4,5,24,2);
    g.fillStyle='#3a3a44';g.beginPath();g.moveTo(2,body);g.lineTo(-2,body+10);g.lineTo(14,body);g.fill();}
   g.fillStyle=line;g.fillRect(2,body,w,3);g.fillStyle='#2a2a30';g.fillRect(2,body+3,w,4);
   return c;});}

 // ----------------------------------------------------------------- per frame
 // ctx: {g, pw, ph, cam, T, W (world), trainX (train stage ground scroll)}
 function backdrop(ctx){const {g,pw,ph,cam,T,W}=ctx,id=W.id,p=PAL[id];
  const own=SPR.picture(`${id}-sky`);if(own){g.drawImage(own,0,0,pw,ph);}else g.drawImage(sky(id,pw,ph),0,0);
  if(!own){const sx=Math.round(pw*.7-cam*S*.02),sy=Math.round(ph*(id==='mission'?.22:.6));g.fillStyle=p.sunGlow;g.globalAlpha=.35;g.beginPath();g.arc(sx,sy,id==='mission'?22:44,0,7);g.fill();g.globalAlpha=1;g.fillStyle=p.sun;g.beginPath();g.arc(sx,sy,id==='mission'?13:28,0,7);g.fill();
   if(id!=='mission'){g.fillStyle=p.sky[3];for(let k=0;k<3;k++)g.fillRect(sx-30,sy-8+k*9,60,2);}}
  const run=id==='train'?T*420:0;
  for(const [kind,par] of [['far',.12],['near',.35]]){const pic=SPR.picture(`${id}-${kind}`);
   if(pic){const sc=SPR.SCENE_SCALE*S,w=pic.width*sc,h=pic.height*sc,off=(((cam+run)*par*S)%w+w)%w;for(let x=-off;x<pw;x+=w)g.drawImage(pic,Math.round(x),Math.round(GY*S-h),Math.ceil(w)+1,Math.round(h));}
   else{const st=strip(id,kind,ph),off=(((cam+run)*par*S)%512+512)%512;for(let x=-off;x<pw;x+=512)g.drawImage(st,Math.round(x),0);}}
 }
 function ground(ctx){const {g,pw,ph,cam,T,W}=ctx,p=PAL[W.id],y0=Math.round(GY*S),run=W.id==='train'?T*420:0;
  const pic=SPR.picture(`${W.id}-ground`);
  if(pic){const sc=SPR.SCENE_SCALE*S,w=pic.width*sc,h=Math.max(pic.height*sc,ph-y0),off=(((cam+run)*S)%w+w)%w;for(let x=-off;x<pw;x+=w)g.drawImage(pic,Math.round(x),y0,Math.ceil(w)+1,Math.ceil(h));return;}
  g.fillStyle=p.ground[0];g.fillRect(0,y0,pw,ph-y0);g.fillStyle=p.ground[2];g.fillRect(0,y0,pw,2);g.fillStyle=p.ground[3];g.fillRect(0,y0+2,pw,1);
  // ruts, pebbles, tufts scroll with the street (a blur of ties under the train)
  const off=(cam+run)*S;
  if(W.id==='train'){for(let x=-((off*1)%24);x<pw;x+=24){g.fillStyle='#5a3a22';g.fillRect(Math.round(x),y0+6,14,3);}g.fillStyle='#8a8a92';g.fillRect(0,y0+4,pw,1);g.fillRect(0,y0+10,pw,1);
   for(let k=0;k<12;k++){const x=((hash(k,5)*pw*3-off*1.4)%pw+pw)%pw;g.fillStyle=p.ground[3];g.fillRect(Math.round(x),y0+16+Math.floor(hash(k,6)*20),18,1);}return;}
  for(let k=0;k<90;k++){const wx=Math.floor((cam*S)/600)*600+k*23;const x=Math.round(wx-off+((Math.floor(cam*S/600)+k)%2)*7),y=y0+6+Math.floor(hash(k+Math.floor(cam*S/600)*90,3)*(ph-y0-10));if(x<-4||x>pw)continue;
   g.fillStyle=hash(k,8)<.5?p.ground[2]:p.ground[3];g.fillRect(x,y,2+Math.floor(hash(k,9)*3),1);}
  g.fillStyle=p.ground[1];g.fillRect(0,y0+Math.round(14*S),pw,2);g.fillRect(0,y0+Math.round(20*S),pw,1);
 }
 // everything standing in the world behind the actors
 function world(ctx){const {g,pw,cam,T,W}=ctx,x0=cam-40,x1=cam+pw/S+40,bx=wx=>Math.round((wx-cam)*S),by=wy=>Math.round(wy*S);
  if(W.id==='train')return trainCars(ctx);
  for(const l of W.ledges){if(l.x>x1||l.x+l.w<x0)continue;const rock=SPR.picture('canyon-rock'),top=SPR.picture('canyon-ledge-top');
   if(rock||top){const X=bx(l.x),Y=by(l.y),w=Math.round(l.w*S),h=by(GY)-Y;if(rock){const sc=SPR.SCENE_SCALE*S,rw=rock.width*sc,rh=rock.height*sc;g.save();g.beginPath();g.rect(X,Y,w,h);g.clip();for(let yy=Y;yy<Y+h;yy+=rh)for(let xx=X;xx<X+w;xx+=rw)g.drawImage(rock,Math.round(xx),Math.round(yy),Math.ceil(rw),Math.ceil(rh));g.restore();}else g.drawImage(shelf(l),X-8,Y);
    if(top){const sc=SPR.SCENE_SCALE*S,tw=top.width*sc,th=top.height*sc;for(let xx=X-4;xx<X+w+4;xx+=tw)g.drawImage(top,Math.round(xx),Math.round(Y-th*.25),Math.ceil(tw),Math.ceil(th));}continue;}
   g.drawImage(shelf(l),bx(l.x)-8,by(l.y));}
  for(const b of W.bld){if(b.x>x1||b.x+b.w<x0)continue;const X=bx(b.x),Y=by(GY-b.h);
   const own=b.own&&SPR.picture(`${b.style}-building-${b.hue+1}`);
   if(own){g.drawImage(own,X,Y,Math.round(b.w*S),Math.round(b.h*S));}else g.drawImage(front(b),X-5,Y);
   // windows: glass or dark, shutters swing open for a gunman, broken glass stays broken
   for(const wn of b.wins){const wx=bx(wn.x),wy=by(wn.y),ww=Math.round(18*S),wh=ww;if(own&&wn.open<.05&&!wn.broken)continue;
    g.fillStyle=W.night?'#c8782a':wn.broken?'#120808':'#5a7a96';g.fillRect(wx-ww/2,wy-wh/2,ww,wh);
    if(!W.night&&!wn.broken){g.fillStyle='#8aaac2';g.fillRect(wx-ww/2+2,wy-wh/2+2,4,wh-6);g.fillStyle='#22303c';g.fillRect(wx-1,wy-wh/2,2,wh);g.fillRect(wx-ww/2,wy-1,ww,2);}
    if(wn.broken){g.fillStyle='#c8d8e4';for(let k=0;k<5;k++)g.fillRect(wx-ww/2+Math.floor(hash(k,wn.x)*ww),wy-wh/2+(k%2?0:wh-3),2,3);}
    if(wn.open>0){g.fillStyle='#0a0606';g.fillRect(wx-ww/2,wy-wh/2,ww,wh);}
    const sh=Math.round((1-wn.open)*ww/2),pal=b.style==='town'?WOOD[b.hue]:ADOBE[b.hue];
    if(wn.open>0&&wn.open<1||!own){g.fillStyle=pal[1];g.fillRect(wx-ww/2-Math.round(wn.open*7),wy-wh/2,Math.max(2,sh),wh);g.fillRect(wx+ww/2-Math.max(2,sh)+Math.round(wn.open*7),wy-wh/2,Math.max(2,sh),wh);}}
   // door: dark when open, saloon half-doors swing
   const dx=bx(b.door),dw=Math.round(18*S),dh=Math.round(30*S),dy=by(GY)-dh,open=T-b.doorT<1.1;
   if(open||!own){g.fillStyle=open?'#060404':W.night?'#7a3e18':'#1a0e08';g.fillRect(dx-dw/2,dy,dw,dh);}
   if(!own&&/SALOON|CANTINA/.test(b.sign)){const sw=open?Math.sin(Math.min(1,(T-b.doorT)*3)*Math.PI):Math.sin(T*1.4+b.x)*.08,pal=WOOD[b.hue];g.fillStyle=pal[1];
    const hw=Math.round(dw/2*(1-Math.abs(sw)*.7));g.fillRect(dx-dw/2,dy+8,hw,16);g.fillRect(dx+dw/2-hw,dy+8,hw,16);g.fillStyle=pal[2];g.fillRect(dx-dw/2,dy+8,hw,1);g.fillRect(dx+dw/2-hw,dy+8,hw,1);}
   else if(!own&&!open){const pal=b.style==='town'?WOOD[b.hue]:ADOBE[b.hue];g.fillStyle=pal[1];g.fillRect(dx-dw/2,dy,dw,dh);g.fillStyle='#0003';g.fillRect(dx-1,dy,2,dh);g.fillStyle='#d8b040';g.fillRect(dx+dw/2-5,dy+dh/2,2,2);}
   if(W.night&&b.wins.length){const tx=bx(b.x+b.w-5),ty=by(GY-34);g.fillStyle='#2a1810';g.fillRect(tx-1,ty,2,8);g.fillStyle=Math.floor(T*12+b.x)%3?'#ffd27a':'#ffb04a';g.fillRect(tx-2,ty-4,4,4);g.globalAlpha=.12;g.fillStyle='#ffb04a';g.beginPath();g.arc(tx,ty-2,26,0,7);g.fill();g.globalAlpha=1;}
  }
  if(W.tower)drawTower(ctx);
  for(const d of W.decor){if(d.x>x1||(d.x2??d.x)<x0)continue;decor(ctx,d);}
 }
 function drawTower(ctx){const {g,cam,T,W}=ctx,t=W.tower,X=Math.round((t.x-cam)*S),w=Math.round(t.w*S),top=Math.round((GY-150)*S),bot=Math.round(GY*S),pal=ADOBE[0];
  g.fillStyle=pal[1];g.fillRect(X-6,top+20,w+12,bot-top-20);g.fillStyle=pal[0];g.fillRect(X,top+20,w,bot-top-20);
  for(let k=0;k<w*(bot-top)/80;k++){g.fillStyle=hash(k,77)<.5?pal[1]:pal[2];g.fillRect(X+Math.floor(hash(k,78)*w),top+20+Math.floor(hash(k,79)*(bot-top-20)),2,1);}
  g.fillStyle=pal[0];g.beginPath();g.moveTo(X+8,top+22);g.quadraticCurveTo(X+w/2,top-14,X+w-8,top+22);g.fill();g.fillStyle='#d8c070';g.fillRect(X+w/2-1,top-26,2,14);g.fillRect(X+w/2-6,top-21,12,2);
  // arches with the bell at the top, landings inside
  for(const [y,h] of [[GY-110,24],[GY-76,24],[GY-40,28]]){const ay=Math.round((y-h)*S),ah=Math.round(h*S);g.fillStyle='#0c0a14';g.fillRect(X+14,ay+8,w-28,ah-8);g.beginPath();g.arc(X+w/2,ay+10,(w-28)/2,Math.PI,0);g.fill();
   g.fillStyle='#4a2c18';g.fillRect(X+8,Math.round(y*S),w-16,4);}
  const bell=Math.round((GY-136)*S);g.fillStyle='#b8902a';g.beginPath();g.moveTo(X+w/2-8,bell+14);g.quadraticCurveTo(X+w/2,bell-6+Math.sin(T*3)*1,X+w/2+8,bell+14);g.fill();}
 function decor(ctx,d){const {g,cam,T,W}=ctx,X=Math.round((d.x-cam)*S),Y=Math.round(GY*S),night=W.night;
  const own=SPR.picture(d.kind==='post'?'hitching-post':d.kind);if(own&&/^(trough|post|lamp)$/.test(d.kind)){const w=own.width*SPR.SCENE_SCALE*S,h=own.height*SPR.SCENE_SCALE*S;g.drawImage(own,Math.round(X-w/2),Math.round(Y-h),Math.round(w),Math.round(h));return;}
  if(d.kind==='trough'){g.fillStyle='#3a2210';g.fillRect(X-17,Y-13,34,13);g.fillStyle='#5a3418';g.fillRect(X-16,Y-12,32,11);g.fillStyle=night?'#2a4a6a':'#5a9ac4';g.fillRect(X-15,Y-11,30,3);g.fillStyle='#8a5a30';g.fillRect(X-16,Y-12,32,1);}
  else if(d.kind==='post'){g.fillStyle='#2a1608';g.fillRect(X-17,Y-22,4,22);g.fillRect(X+13,Y-22,4,22);g.fillStyle='#5a3418';g.fillRect(X-18,Y-21,36,3);g.fillStyle='#8a5a30';g.fillRect(X-18,Y-21,36,1);}
  else if(d.kind==='lamp'||d.kind==='torch'){const h=d.kind==='lamp'?62:40;g.fillStyle='#1a1a1a';g.fillRect(X-1,Y-h,3,h);
   const fl=Math.floor(T*10+d.x)%3;if(d.kind==='lamp'){g.fillStyle='#2a2a2a';g.fillRect(X-5,Y-h-9,11,9);g.fillStyle=night?['#ffd27a','#ffc050','#ffe4a0'][fl]:'#fff2c8';g.fillRect(X-3,Y-h-7,7,5);}
   else{g.fillStyle=['#ff9a2a','#ffd04a','#ff6a1a'][fl];g.fillRect(X-3,Y-h-8+fl,7,8-fl);g.fillStyle='#fff0a0';g.fillRect(X-1,Y-h-4,3,3);}
   if(night){g.globalAlpha=.14;g.fillStyle='#ffb04a';g.beginPath();g.arc(X,Y-h-4,34+fl*2,0,7);g.fill();g.globalAlpha=1;}}
  else if(d.kind==='cactus'){const h=26+Math.floor(hash(d.x,1)*14);g.fillStyle='#2e6a34';g.fillRect(X-3,Y-h,6,h);g.fillRect(X-10,Y-h*.62,4,h*.32);g.fillRect(X-10,Y-h*.38,8,3);g.fillRect(X+6,Y-h*.82,4,h*.36);g.fillRect(X+2,Y-h*.5,8,3);g.fillStyle='#4a9050';g.fillRect(X-2,Y-h,2,h);}
  else if(d.kind==='cave'){const w=34,h=30;g.fillStyle='#1a0604';g.beginPath();g.moveTo(X-w/2,Math.round((GY-40)*S));g.lineTo(X-w/2,Math.round((GY-40)*S)-h+10);g.quadraticCurveTo(X,Math.round((GY-40)*S)-h-8,X+w/2,Math.round((GY-40)*S)-h+10);g.lineTo(X+w/2,Math.round((GY-40)*S));g.fill();}
  else if(d.kind==='rope'){const x2=Math.round((d.x2-cam)*S),y=Math.round(d.y*S);g.fillStyle='#6a4a24';for(let x=X;x<x2;x+=6){const sag=Math.round(Math.sin((x-X)/(x2-X)*Math.PI)*3);g.fillRect(x,y+sag,5,3);g.fillStyle='#3a2410';g.fillRect(x+5,y+sag,1,3);g.fillStyle='#6a4a24';}
   g.strokeStyle='#c8a070';g.lineWidth=1;g.beginPath();g.moveTo(X,y-14);g.quadraticCurveTo((X+x2)/2,y-6,x2,y-14);g.stroke();}
 }
 function trainCars(ctx){const {g,cam,T,W}=ctx,bx=wx=>Math.round((wx-cam)*S),by=wy=>Math.round(wy*S);
  for(const cr of W.cars){if(cr.x>cam+ctx.pw/S+40||cr.x+cr.w<cam-40)continue;const X=bx(cr.x),Y=by(cr.cabY??cr.y);g.drawImage(car(cr),X-2,Y);
   // couplings, wheels turning, smoke from the engine
   g.fillStyle='#2a2a30';g.fillRect(X+Math.round(cr.w*S),by(COUPLING)-2,Math.round(18*S),4);
   const wy=by(GY)-7;for(const fx of [.14,.3,.7,.86]){const wx=X+Math.round(cr.w*S*fx);g.fillStyle='#1a1a20';g.beginPath();g.arc(wx,wy,7,0,7);g.fill();g.fillStyle='#5a5a66';const a=T*24+fx*9;g.fillRect(wx+Math.round(Math.cos(a)*5)-1,wy+Math.round(Math.sin(a)*5)-1,3,3);g.fillRect(wx-1,wy-1,2,2);}
   if(cr.kind==='engine'){const sx=X+Math.round(cr.w*S*.08)+8,sy=Y;for(let k=0;k<6;k++){const t=(T*1.6+k/6)%1;g.fillStyle=`rgba(${200-k*10},${200-k*10},${210-k*10},${.7*(1-t)})`;g.beginPath();g.arc(sx-t*90,sy-8-t*30,5+t*16,0,7);g.fill();}}}
 }
 // crates, barrels, powder kegs, wagons (the owner's pictures when there)
 function props(ctx){const {g,cam,T,W}=ctx,x1=cam+ctx.pw/S+40;
  for(const b of W.boxes){if(b.dead||b.kind==='cab'||b.x>x1||b.x+b.w<cam-40)continue;const X=Math.round((b.x-cam)*S),Y=Math.round((b.y-b.h)*S),w=Math.round(b.w*S),h=Math.round(b.h*S),hit=b.flash>0;
   const pic=SPR.picture(b.kind==='keg'?'keg':b.kind);
   if(b.kind==='wagon'){if(pic){const ww=Math.round(b.w*S),hh=Math.round(ww*pic.height/pic.width);g.drawImage(pic,X,Math.round(b.y*S)-hh,ww,hh);continue;}
    const bed=Math.round((b.y-b.h)*S);g.fillStyle='#e8dcc0';g.beginPath();g.moveTo(X+6,bed);for(let i=0;i<=3;i++){const ax=X+6+i*(w-12)/3;g.quadraticCurveTo(ax-(w-12)/6,bed-30,ax,bed);}g.fill();
    g.fillStyle='#b8a888';for(let i=1;i<3;i++)g.fillRect(Math.round(X+6+i*(w-12)/3),bed-18,1,18);
    g.fillStyle='#6a3e1e';g.fillRect(X,bed,w,14);g.fillStyle='#9a6234';g.fillRect(X,bed,w,2);g.fillStyle='#3a2210';g.fillRect(X,bed+13,w,2);
    for(const fx of [14,w-14]){g.strokeStyle='#2a1608';g.lineWidth=2;g.beginPath();g.arc(X+fx,Math.round(b.y*S)-10,10,0,7);g.stroke();for(let a=0;a<6;a++){g.beginPath();g.moveTo(X+fx,Math.round(b.y*S)-10);g.lineTo(X+fx+Math.cos(a*1.05)*10,Math.round(b.y*S)-10+Math.sin(a*1.05)*10);g.stroke();}}continue;}
   if(pic&&b.kind!=='keg'){g.drawImage(pic,X,Y,w,h);if(hit){g.globalAlpha=.5;g.fillStyle='#fff';g.fillRect(X,Y,w,h);g.globalAlpha=1;}continue;}
   if(b.kind==='crate'){g.fillStyle='#2a160a';g.fillRect(X,Y,w,h);g.fillStyle=hit?'#e8c08a':'#a8703c';g.fillRect(X+1,Y+1,w-2,h-2);g.fillStyle='#7a4a24';g.fillRect(X+3,Y+3,w-6,h-6);g.fillStyle=hit?'#e8c08a':'#a8703c';
    for(let k=0;k<w-6;k++){g.fillRect(X+3+k,Y+3+Math.round(k*(h-7)/(w-6)),2,1);}g.fillStyle='#c88a50';g.fillRect(X+1,Y+1,w-2,1);
    if(b.hp<3){g.fillStyle='#1a0c04';g.fillRect(X+w/2,Y+2,1,h/2);g.fillRect(X+w/2-3,Y+h/2,4,1);}}
   else if(b.kind==='barrel'||b.kind==='keg'){const keg=b.kind==='keg',c1=keg?'#a82020':'#8a5228',c2=keg?'#d83a2a':'#a86a38',c3=keg?'#6a1010':'#5a3418';
    g.fillStyle='#1a0a04';g.fillRect(X+1,Y,w-2,h);g.fillRect(X,Y+2,w,h-4);g.fillStyle=hit?'#fff':c1;g.fillRect(X+2,Y+1,w-4,h-2);g.fillRect(X+1,Y+3,w-2,h-6);
    g.fillStyle=c2;g.fillRect(X+4,Y+2,3,h-4);g.fillStyle=c3;g.fillRect(X+w-5,Y+2,2,h-4);g.fillStyle='#3a3a3a';g.fillRect(X+1,Y+4,w-2,2);g.fillRect(X+1,Y+h-6,w-2,2);
    if(keg){g.fillStyle='#f4e0a0';gbDraw(g,'TNT',X+Math.round(w/2)-12,Y+Math.round(h/2)-4,'#f4e0a0');if(Math.floor(T*6)%2){g.fillStyle='#ffd04a';g.fillRect(X+w/2,Y-3,2,3);}}}
   else{g.fillStyle='#3a2210';g.fillRect(X,Y,w,h);g.fillStyle='#6a4024';g.fillRect(X+1,Y+1,w-2,h-2);}
  }
 }
 return {backdrop,ground,world,props,clear:()=>cache.clear()};
}
Object.assign(exports,{createScenery,S,PAL,hash});
