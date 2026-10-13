// Broforce Mobile — original procedural jungle / outpost art, 16-pixel visual vocabulary.
// Pure draw service: world pixels in, Canvas 2D pixels out. No session or global game state.
const BF_COL={sky0:'#07121f',sky1:'#183342',haze:'#3c625b',moon:'#f3d99c',
 ridge:'#243e48',farLeaf:'#1b4847',midLeaf:'#163b35',trunk:'#112a2b',
 soil:'#40392d',wood:'#775538',stone:'#66716c',steel:'#536870',volatile:'#71533d'};
const BF_VARIANTS=4;
const BF_TAU=Math.PI*2;
// Stable, signed-coordinate-safe integer mixer (never Math.random / per-frame randomness).
function bfHash(x,y,seed=0){let h=Math.imul(x|0,0x1f123bb5)^Math.imul(y|0,0x5f356495)^seed;
 h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return (h^(h>>>16))>>>0;}
const bfFrac=(x,y,seed=0)=>bfHash(x,y,seed)/4294967296;
const bfFinite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
function bfRect(g,color,x,y,w,h){g.fillStyle=color;g.fillRect(x,y,w,h);}
function bfPoly(g,color,pts){g.fillStyle=color;g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.closePath();g.fill();}

// One tile painted in 16 x 16 source pixels. Variants are chosen by world tile position.
function bfTilePixels(g,type,v){
 const R=(c,x,y,w,h)=>bfRect(g,c,x,y,w,h);
 if(type===1){ // moist earth, shale inclusions, roots and ochre grains
  R(['#393c32','#434033','#3b3a30','#443b30'][v],0,0,16,16);
  R('#555344',0,3,16,2);R('#302e29',0,13,16,3);
  R('#625b43',2+v,6,5,2);R('#262f2b',8,10,6,2);R('#776347',v+1,4,2,1);
  R('#293d34',11-v,2,2,4);R('#90734d',12,12,2,1);R('#20332e',5,9,1,5);
  R('#8a7050',9,7,2,1);R('#514638',2,11,3,2);R('#1e302d',14,5,2,4);
 }else if(type===2){ // knotty reinforced timbers with endgrain / nails
  R(['#765037','#80583b','#735039','#7e573c'][v],0,0,16,16);
  R('#b88a5d',0,1,16,2);R('#4a342e',0,7,16,2);R('#392f30',0,15,16,1);
  R('#a8794d',2,4,9,1);R('#4e3c32',5,5,6,1);R('#ae7d51',1,11,13,1);
  R('#4b342b',10-v,10,3,3);R('#b88e64',11-v,11,1,1);
  R('#282e30',2,2,2,2);R('#a9ada2',2,2,1,1);R('#282e30',13,12,2,2);
 }else if(type===3){ // chipped local grey-green rock
  R(['#61716e','#697773','#5e706e','#667773'][v],0,0,16,16);
  R('#87948a',0,0,13,2);R('#374b4a',0,13,16,3);R('#435a57',13,1,3,12);
  bfPoly(g,'#82948c',[2,3,11,3,8,8,4,9]);
  bfPoly(g,'#465d5b',[10,8,15,5,15,13,7,15]);
  R('#b0ad8d',4+v,3,3,1);R('#334946',2,10,5,1);R('#334846',10,5,1,4);
  R('#94a69a',1,1,2,1);R('#2d4242',6,13,3,1);
 }else if(type===4){ // interlocked armour plates, bolts, scored wear
  R(['#495f66','#51676e','#4b6169','#576c70'][v],0,0,16,16);
  R('#8ea5a3',0,1,16,2);R('#203640',0,14,16,2);R('#2d434b',14,3,2,11);
  R('#758c91',2,4,11,1);R('#364b54',0,8,16,2);R('#98a6a0',0,9,13,1);
  R('#172d36',2,2,2,2);R('#d3b97a',2,2,1,1);R('#172d36',12,12,2,2);
  R('#9aa7a4',12,12,1,1);R('#344650',5+v,5,1,3);R('#b3b8a8',7,11,4,1);
 }else if(type===5){ // volatile cargo: weathered hazard shell / ember core
  R('#55443a',0,0,16,16);R('#a06e44',1,1,14,2);R('#312d31',0,13,16,3);
  R('#6d4636',2,3,12,10);R('#ec9b45',3,5,10,1);R('#2a3033',0,8,16,2);
  R('#ffb54d',5,6,2,2);R('#e96c31',7,8,4,2);R('#ffd177',9,5,3,1);
  R('#161f26',0,0,2,16);R('#b7a27b',0,0,1,12);R('#161f26',14,0,2,16);
  R('#2b272a',3,12,3,1);R('#e6b260',11-v,11,2,1);
 }
 // Micro chips break the repeated pattern without allocating randomized sprites.
 const a=bfHash(v,type,17);R(type===5?'#d77d47':'#b0a88a',2+(a%11),3+((a>>>8)%10),1,1);
}

// Optional OffscreenCanvas sprites, built once. Ordinary Canvas drawing remains the fallback.
let bfSpriteCache=null;
function bfSprites(){if(bfSpriteCache)return bfSpriteCache;
 if(typeof OffscreenCanvas!=='function')return null;
 try{const sprites=new Array(6);for(let type=1;type<=5;type++){
  sprites[type]=[];for(let v=0;v<BF_VARIANTS;v++){
   const c=new OffscreenCanvas(16,16),g=c.getContext('2d');if(!g)return null;
   bfTilePixels(g,type,v);sprites[type].push(c);
  }}bfSpriteCache=sprites;return sprites;
 }catch{return null;}
}
function bfTileBase(g,sprites,type,v,x,y,T){if(sprites){g.drawImage(sprites[type][v],x,y,T,T);return;}
 // Same pixel pattern on browsers without OffscreenCanvas. Restore the caller's transform.
 g.save();g.translate(x,y);g.scale(T/16,T/16);bfTilePixels(g,type,v);g.restore();
}
function bfTileEdges(g,type,x,y,T,top,left,right,bottom,v){
 const u=T/16;
 if(top){
  if(type===1){bfRect(g,'#183d32',x,y,T,3*u);bfRect(g,'#50714b',x,y,12*u,u);
   bfRect(g,'#759052',x+(2+v)*u,y,5*u,u);bfRect(g,'#3e6b43',x+11*u,y+2*u,3*u,2*u);
   bfRect(g,'#243d32',x+3*u,y+3*u,u,3*u);}
  else if(type===2){bfRect(g,'#d4a16c',x,y,T,2*u);bfRect(g,'#3e302d',x,y+2*u,T,u);}
  else if(type===3){bfRect(g,'#a6b7aa',x,y,T,2*u);bfRect(g,'#607b6f',x+(v+3)*u,y,6*u,u);
   bfRect(g,'#4e7860',x+8*u,y,4*u,u);}
  else if(type===4){bfRect(g,'#aabeb7',x,y,T,2*u);bfRect(g,'#273941',x,y+2*u,T,u);}
  else {bfRect(g,'#ffc45b',x,y,T,2*u);bfRect(g,'#6b2b2c',x,y+2*u,T,u);}
 }
 if(left){bfRect(g,type===5?'#f09242':'#a2aba0',x,y,Math.max(u,1),T);
  bfRect(g,'rgba(4,15,19,.24)',x+u,y+3*u,u,T-3*u);}
 if(right)bfRect(g,'rgba(5,16,21,.6)',x+T-2*u,y,2*u,T);
 if(bottom)bfRect(g,'rgba(4,14,19,.53)',x,y+T-2*u,T,2*u);
 if(type===5){ // high-visibility breakable shell; pulse is an overlay, not a flashing redraw of grain
  bfRect(g,'#e6aa50',x+4*u,y+4*u,8*u,u);
  bfRect(g,'#ec6a31',x+7*u,y+7*u,3*u,3*u);
 }else if((type===1||type===2)&&top&&v===2){ // readable soft destructible debris silhouette
  bfRect(g,type===1?'#718552':'#b48959',x+T-5*u,y-2*u,3*u,2*u);
 }
}
function bfSky(g,W,H,cx,cy,time){
 bfRect(g,BF_COL.sky0,0,0,W,H);
 const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#07121f');sky.addColorStop(.44,'#173343');
 sky.addColorStop(.76,'#3b625d');sky.addColorStop(1,'#173734');bfRect(g,sky,0,0,W,H);
 const mx=W*.73-cx*.025%Math.max(1,W*.85),my=H*.2-cy*.03;
 const halo=g.createRadialGradient(mx,my,7,mx,my,Math.max(150,W*.5));
 halo.addColorStop(0,'rgba(240,206,132,.17)');halo.addColorStop(.35,'rgba(210,164,103,.06)');halo.addColorStop(1,'rgba(210,164,103,0)');bfRect(g,halo,0,0,W,H);
 g.fillStyle='#d2cfab';g.beginPath();g.arc(mx,my,Math.max(11,Math.min(24,W*.027)),0,BF_TAU);g.fill();
 g.fillStyle='#f4dcab';g.beginPath();g.arc(mx-3,my-3,Math.max(8,Math.min(20,W*.022)),0,BF_TAU);g.fill();
 for(let i=0;i<Math.ceil(W/130)+2;i++){
  const x=(i*133-((cx*.03)%133)+133)% (W+266)-66;
  const y=H*(.14+.14*bfFrac(i,4,61));
  bfRect(g,'rgba(175,210,194,.28)',Math.floor(x),Math.floor(y),2,1);
 }
 // Long, hard-edged haze veils: translucent faceted strokes instead of blur.
 for(let i=0;i<3;i++){const y=H*(.42+i*.12)+cy*.025;
  bfRect(g,'rgba(103,150,137,.075)',0,y,W,Math.max(9,H*.036));
 }
}
function bfRidges(g,W,H,cx,cy){
 for(let layer=0;layer<3;layer++){
  const scale=[.10,.22,.35][layer],step=[104,78,55][layer],scroll=cx*scale;
  const top=H*(.50+layer*.13)-cy*scale*.14;
  const first=Math.floor(scroll/step)-2, count=Math.ceil(W/step)+5;
  g.fillStyle=['#263f49','#1d4446','#1b4240'][layer];
  g.beginPath();g.moveTo(-step,H);
  for(let k=0;k<=count;k++){
   const i=first+k,x=Math.round(i*step-scroll),h=(bfFrac(i,layer,38)-.5)*H*(layer===0?.13:.11);
   g.lineTo(x,Math.round(top+h));
  }g.lineTo(W+step,H);g.closePath();g.fill();
  g.fillStyle=['#49665c','#37665b','#29594e'][layer];
  for(let k=0;k<count;k++){
   const i=first+k;if((bfHash(i,layer,93)&3)!==0)continue;
   const x=Math.round(i*step-scroll+step*.32);
   const y=Math.round(top+(bfFrac(i,layer,38)-.5)*H*.1);
   g.fillRect(x,y,Math.min(16,step*.2),2);
  }
 }
}
function bfPalm(g,x,base,size,seed,far){
 const trunk=far?'#183b3b':'#102b2d',leaf=far?'#225047':'#153e35',bright=far?'#376657':'#285b47';
 const top=base-size;
 bfRect(g,trunk,x-3,top+8,6,size-8);
 bfRect(g,'rgba(97,121,93,.24)',x-2,top+15,2,size-23);
 for(let i=-3;i<=3;i++){
  const reach=size*(.55+.13*(1-Math.abs(i)/3)),ex=x+i*reach*.36;
  const ey=top+7+Math.abs(i)*size*.12;
  bfPoly(g,leaf,[x,top+11,x+i*reach*.44,ey-4,ex+i*7,ey+size*.10,ex,ey+size*.04]);
  if((seed+i+30)%2===0)bfRect(g,bright,Math.min(x,ex),ey-4,Math.max(3,Math.abs(ex-x)*.6),2);
 }
 bfRect(g,leaf,x-9,top+8,18,5);
}
function bfJungle(g,W,H,cx,cy){
 for(let layer=0;layer<2;layer++){
  const scale=layer?.49:.30,space=layer?108:150,scroll=cx*scale,first=Math.floor(scroll/space)-2;
  const ground=H*(layer?.73:.65)-cy*scale*.08;
  for(let k=0;k<=Math.ceil(W/space)+5;k++){
   const i=first+k,x=Math.round(i*space-scroll+bfFrac(i,layer,12)*40);
   const height=(layer?116:88)+bfFrac(i,layer,8)*(layer?120:70);
   bfPalm(g,x,ground+11,height,i+layer*19,layer===0);
   if((bfHash(i,layer,8)&3)===0){
    bfRect(g,layer?'#173931':'#254b43',x-14,ground-27,33,25);
    bfRect(g,layer?'#1e473a':'#326052',x-9,ground-29,16,6);
   }
  }
 }
}
function bfOutpostUnit(g,x,y,seed,time){
 // Military-industrial forward base: exposed structural steel, catwalk, watch tower, vents.
 const lit=(bfHash(seed,7,13)&1)!==0;
 bfRect(g,'#172a31',x+32,y-18,244,76);bfRect(g,'#2c4347',x+34,y-26,240,11);
 bfRect(g,'#5c7068',x+34,y-26,240,2);
 for(let i=0;i<7;i++){const wx=x+44+i*30;
  bfRect(g,'#0f232a',wx,y-18,23,18);bfRect(g,i%3===0&&lit?'#d19a55':'#466265',wx+2,y-16,19,12);
  bfRect(g,'#263b40',wx+10,y-16,2,14);
  bfRect(g,'rgba(224,166,87,.26)',wx+3,y-15,3,10);
 }
 bfRect(g,'#152831',x,y+2,305,12);bfRect(g,'#698077',x,y+1,305,2);
 for(let k=0;k<9;k++){bfRect(g,'#354d4d',x+k*35+5,y+13,2,32);
  bfRect(g,'#6b8179',x+k*35+7,y+15,19,2);}
 // Search tower, diagonal bracing, slit windows, red obstruction beacon.
 bfRect(g,'#0e252d',x+182,y-135,64,116);bfRect(g,'#466065',x+184,y-135,4,116);
 bfRect(g,'#294248',x+240,y-135,3,116);
 bfRect(g,'#20363c',x+170,y-152,91,20);bfRect(g,'#78857a',x+170,y-153,91,3);
 bfRect(g,'#0e232c',x+182,y-146,65,12);
 bfRect(g,lit?'#dfa561':'#617b72',x+187,y-142,10,5);
 bfRect(g,lit?'#b7814b':'#425e60',x+206,y-142,11,5);
 bfRect(g,'#384b4d',x+175,y-158,80,5);
 for(let k=0;k<3;k++){bfPoly(g,'#385357',[x+188,y-125+k*27,x+239,y-100+k*27,x+239,y-97+k*27,x+188,y-122+k*27]);}
 bfRect(g,'#4b665f',x+217,y-177,2,25);bfRect(g,'#df7841',x+216,y-178,5,4);
 bfRect(g,'#6d8379',x+218,y-158,13,2);bfRect(g,'#162c31',x+209,y-107,7,42);
 // Uneven machinery silhouette, rear pipes and exhaust stacks.
 bfRect(g,'#172e36',x+15,y-71,40,46);bfRect(g,'#425b5a',x+19,y-79,7,36);
 bfRect(g,'#192e36',x+57,y-54,68,28);bfRect(g,'#64766d',x+61,y-53,54,3);
 bfRect(g,'#324b4a',x+99,y-91,15,66);bfRect(g,'#6c7970',x+98,y-93,17,4);
 bfRect(g,'#0e252b',x+130,y-65,35,40);bfRect(g,'#465e5c',x+143,y-65,3,40);
 bfRect(g,'#304347',x+276,y-36,29,57);
 // Steam columns drift in phase with time but remain reproducible from position.
 g.fillStyle='rgba(163,180,153,.16)';for(let j=0;j<5;j++){
  const d=(time*9+j*16+seed*13)%92,puffY=y-94-d;
  g.fillRect(x+103+Math.sin(j+time*.35)*9,puffY,12+j*2,6+j);
 }
 // A single small brazier: high-chroma, intentionally focused warm key light.
 bfRect(g,'#291f26',x+263,y-27,23,18);bfRect(g,'#d4823e',x+265,y-30,19,5);
 const flick=Math.sin(time*10+seed)*3;
 bfPoly(g,'#dc612e',[x+269,y-30,x+277,y-52+flick,x+281,y-42,x+283,y-30]);
 bfPoly(g,'#ffd17a',[x+273,y-30,x+278,y-46+flick,x+280,y-30]);
}
function bfOutposts(g,W,H,cx,cy,time){
 const factor=.58,period=490,scroll=cx*factor,first=Math.floor(scroll/period)-2;
 const floor=H*.68-cy*.055;
 for(let k=0;k<Math.ceil(W/period)+6;k++){
  const i=first+k,x=Math.round(i*period-scroll),y=Math.round(floor+(bfFrac(i,0,84)-.5)*H*.055);
  bfOutpostUnit(g,x,y,i,time);
 }
 // Cables and railing silhouettes knit adjacent installations together.
 bfRect(g,'rgba(19,36,39,.8)',0,floor+21,W,3);
 for(let k=0;k<W/38+2;k++)bfRect(g,'rgba(95,120,105,.38)',k*38-(scroll%38),floor+15,2,10);
}
function bfShafts(g,W,H,cx,time){
 // Wide translucent cut-out beams; no expensive shadowBlur/filter.
 const stride=460,scroll=cx*.58,first=Math.floor(scroll/stride)-1;
 for(let k=0;k<Math.ceil(W/stride)+4;k++){
  const i=first+k;if((i&1)===0)continue;
  const x=i*stride-scroll+235;const sway=Math.sin(time*.65+i)*15;
  bfPoly(g,'rgba(242,182,91,.075)',[x,H*.45,x+16,H*.45,x+125+sway,H,x-170+sway,H]);
  bfPoly(g,'rgba(240,217,142,.036)',[x+3,H*.44,x+9,H*.44,x+28+sway,H,x-41+sway,H]);
 }
}
function bfParticles(g,W,H,cx,cy,time,low){
 const cell=low?86:38;
 const first=Math.floor(cx*.75/cell)-2,count=Math.ceil(W/cell)+5;
 for(let k=0;k<count;k++){
  const i=first+k,fx=bfFrac(i,6,991),fy=bfFrac(i,5,125),x=i*cell-cx*.75+fx*cell;
  const y=((fy*H+time*(3+fx*4)-cy*.06)%(H+30)+(H+30))%(H+30);
  const alpha=.12+.18*(.5+.5*Math.sin(time*.8+i*2));
  g.fillStyle=`rgba(238,202,136,${alpha.toFixed(3)})`;g.fillRect(Math.round(x),Math.round(y),fx>.78?2:1,fx>.86?2:1);
 }
 if(!low){
  for(let i=0;i<Math.ceil(W/190)+2;i++){
   const x=i*190-(cx*.4%190)+30,y=H*.68+Math.sin(time*.3+i)*12;
   bfRect(g,'rgba(129,167,151,.10)',x,y,130,3);
  }
 }
}
function bfForeground(g,W,H,cx,cy,low){
 // Fixed near-plane silhouettes, foliage and undergrowth, never UI-sized overlays.
 const ground=H+10,spacing=86,scroll=cx*.92,first=Math.floor(scroll/spacing)-2;
 g.fillStyle='rgba(8,27,30,.55)';g.fillRect(0,H-10,W,10);
 for(let k=0;k<Math.ceil(W/spacing)+6;k++){
  const i=first+k,x=Math.floor(i*spacing-scroll+bfFrac(i,8,19)*20),h=25+bfFrac(i,2,87)*29;
  bfRect(g,'#0b2a2c',x,ground-h,3,h);
  for(let b=0;b<4;b++){
   const y=ground-h+b*7,dx=(b%2?1:-1)*(13+bfFrac(i,b,22)*15);
   bfPoly(g,'#0c3030',[x,y,x+dx,y-11,x+dx*.8,y+1,x,y+7]);
  }
  if(!low&&i%3===0){bfRect(g,'#385747',x-4,ground-h,2,4);bfRect(g,'#2a5544',x+6,ground-h+12,2,3);}
 }
}

/** Render a viewport. map.tiles is row-major: tiles[row * map.width + col]. */
function drawBroforceWorld(ctx,{map,camera,viewport,time=0,quality='high'}={}){
 if(!ctx||typeof ctx.save!=='function'||typeof ctx.restore!=='function'||!map||!viewport)return;
 const W=bfFinite(viewport.width),H=bfFinite(viewport.height);
 if(W<=0||H<=0)return;
 const cx=bfFinite(camera?.x),cy=bfFinite(camera?.y),t=bfFinite(time);
 const width=Math.max(0,Math.floor(bfFinite(map.width))),height=Math.max(0,Math.floor(bfFinite(map.height)));
 const T=Number.isFinite(map.tileSize)&&map.tileSize>0?map.tileSize:16;
 const tiles=map.tiles,low=quality==='low',sprite=bfSprites();
 ctx.save();
 try{
  ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();ctx.imageSmoothingEnabled=false;
  bfSky(ctx,W,H,cx,Math.max(-H*.6,Math.min(H*.6,cy*.12)),t);
  bfRidges(ctx,W,H,cx,cy);bfJungle(ctx,W,H,cx,cy);
  bfShafts(ctx,W,H,cx,t);bfOutposts(ctx,W,H,cx,cy,t);
  bfParticles(ctx,W,H,cx,cy,t,low);
  if(width&&height&&tiles&&typeof tiles.length==='number'){
   const left=Math.max(0,Math.floor(cx/T)),right=Math.min(width-1,Math.floor((cx+W-0.00001)/T));
   const top=Math.max(0,Math.floor(cy/T)),bottom=Math.min(height-1,Math.floor((cy+H-0.00001)/T));
   if(left<=right&&top<=bottom){
    const at=(x,y)=>x<0||y<0||x>=width||y>=height?0:tiles[y*width+x]||0;
    for(let row=top;row<=bottom;row++){
     const y=Math.floor(row*T-cy);
     for(let col=left;col<=right;col++){
      const type=at(col,row);if(type<1||type>5)continue;
      const x=Math.floor(col*T-cx),variation=bfHash(col,row,0x19b4)&3;
      bfTileBase(ctx,sprite,type,variation,x,y,T);
      bfTileEdges(ctx,type,x,y,T,!at(col,row-1),!at(col-1,row),!at(col+1,row),!at(col,row+1),variation);
     }
    }
   }
  }
  bfForeground(ctx,W,H,cx,cy,low);
 }finally{ctx.restore();}
}
Object.assign(exports,{drawBroforceWorld});
