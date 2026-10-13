// BF-29 — original, self-contained environment renderer for four Broforce missions.
// Inputs are read-only. Terrain type 0..5 is authoritative; decorations never create collision.
const BF_THEMES={
 'broforce-factory':{sky:['#0d121d','#283340','#594037'],far:'#202b39',mid:'#303a42',near:'#34383c',dark:'#101b25',rim:'#d5a86a',glow:'#ffac54',materials:[null,['#443e3b','#60504a','#997c5e'],['#604b3e','#916c4f','#d4a074'],['#52565a','#77777b','#a6a0a0'],['#425362','#788c91','#bcc8b8'],['#71402f','#d66b37','#ffd275']]},
 'broforce-city':{sky:['#111629','#273249','#4b4254'],far:'#1e2639',mid:'#283246',near:'#323b4b',dark:'#111928',rim:'#b9bed0',glow:'#f9c482',materials:[null,['#494450','#776774','#b7a098'],['#5e4b50','#997365','#d5a78c'],['#5e606b','#91919b','#cdc4b4'],['#43546a','#8497a9','#c0c8cb'],['#6a3d45','#f08056','#ffd290']]},
 'broforce-desert':{sky:['#293447','#785e58','#d69a64'],far:'#756169',mid:'#986f63',near:'#ad846b',dark:'#443e44',rim:'#fae0ab',glow:'#ffdd92',materials:[null,['#8b674f','#c29569','#edc996'],['#795742','#c0966c','#efd09b'],['#946c59','#d6ad80','#f3ddb3'],['#5a6670','#9caaa7','#d0d2bf'],['#704a43','#db7a43','#ffe1a2']]}
};
const TAU=Math.PI*2;
function hash(x,y,z=0){let n=Math.imul(x|0,0x1f123bb5)^Math.imul(y|0,0x5f356495)^(z|0);n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0;}
function frac(x,y,z=0){return hash(x,y,z)/4294967296;}
function rect(g,c,x,y,w,h){g.fillStyle=c;g.fillRect(x,y,w,h);}
function poly(g,c,points){g.fillStyle=c;g.beginPath();g.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);g.closePath();g.fill();}
function fx(v){return Number.isFinite(v)?v:0;}
// Tile detail arrays are stable, shared across calls, and bounded: 3 biomes * 5 tiles * 4 variants.
const fragments=new Map();
function motif(theme,type,variant){const key=theme+':'+type+':'+variant;if(fragments.has(key))return fragments.get(key);
 const bits=[];for(let i=0;i<7;i++){const n=hash(type*17+i,variant*13,theme==='broforce-factory'?11:theme==='broforce-city'?31:57);bits.push([1+n%12,2+((n>>>8)%11),1+((n>>>16)%3),1+((n>>>22)%2)]);}
 fragments.set(key,bits);return bits;
}
function sky(g,W,H,c,low=false){for(let i=0;i<3;i++)rect(g,c.sky[i],0,H*i/3,W,Math.ceil(H/3)+1);
 if(!low)for(let i=0;i<12;i++){const y=Math.floor(i*H/12);rect(g,'rgba(255,240,207,.012)',0,y,W,Math.max(1,H/60));}
}
function repeat(W,camera,pace,factor,draw){const scroll=camera*factor,first=Math.floor(scroll/pace)-2;const count=Math.min(400,Math.ceil(W/pace)+5);for(let k=0;k<count;k++){const i=first+k;draw(i,Math.floor(i*pace-scroll));}}
function gear(g,x,y,r,c,accent){g.save();g.translate(x,y);g.fillStyle=c;
 g.beginPath();for(let i=0;i<24;i++){const a=i*TAU/24;const radius=(i%3===1)?r+5:r;const px=Math.cos(a)*radius,py=Math.sin(a)*radius;if(i===0)g.moveTo(px,py);else g.lineTo(px,py);}g.closePath();g.fill();
 g.fillStyle=accent;g.beginPath();g.arc(0,0,r*.58,0,TAU);g.fill();
 for(let i=0;i<6;i++){const a=i*TAU/6;rect(g,c,Math.floor(Math.cos(a)*r*.36)-2,Math.floor(Math.sin(a)*r*.36)-2,5,5);}rect(g,c,-3,-3,6,6);g.restore();}
function factory(g,W,H,cx,cy,t,low,p){sky(g,W,H,p,low);
 const horizon=H*.66-cy*.045;
 // Distinct industrial depth: red exhaust sky, foundry chimneys, overhead gantries.
 repeat(W,cx,164,.13,(i,x)=>{const y=horizon-115-frac(i,3,10)*88;
  rect(g,p.far,x,y,94,H-y);rect(g,'#39404c',x+14,y-13,21,14);rect(g,'#50535c',x+14,y-14,21,3);
  rect(g,p.far,x+52,y-47,23,49);rect(g,'#627076',x+51,y-49,25,3);
  if(i%6===0){ // distant tilted vent and warning bar: silhouette, not a ledge
   rect(g,'#41434d',x+80,y-67,5,68);rect(g,'#ba7448',x+79,y-68,9,3);
   rect(g,'rgba(255,183,94,.28)',x+81,y-55,3,13);
  }
  if(!low){for(let k=0;k<3;k++){const yy=y-50-((t*7+k*24+i*3)%95);rect(g,'rgba(194,161,144,.14)',x+48+k*6,yy,23+k*4,5+k*2);}}});
 repeat(W,cx,228,.31,(i,x)=>{const y=horizon-85+(frac(i,2,8)-.5)*33;
  rect(g,p.mid,x,y,175,H-y);rect(g,'#5d5557',x+2,y+2,169,4);
  for(let k=0;k<4;k++){rect(g,'#172936',x+8+k*42,y+20,29,21);rect(g,(hash(i,k,34)%5===0)?'#b8733c':'#47535a',x+12+k*42,y+24,18,13);}
  rect(g,'#202a34',x+132,y-33,14,34);rect(g,'#7a6b60',x+131,y-34,16,3);});
 repeat(W,cx,344,.51,(i,x)=>{const y=horizon+16;const furnaceX=x+28;
  // Open slatted furnace frame, rather than an unbroken foreground fake wall.
  rect(g,'rgba(39,47,52,.68)',x,y-62,296,156);
  for(let j=0;j<4;j++){rect(g,'rgba(108,106,102,.45)',x+12+j*76,y-58,4,148);}
  for(let j=0;j<3;j++)rect(g,'rgba(202,148,96,.33)',x+20+j*99,y-64,42,2);
  rect(g,p.dark,furnaceX,y-42,89,89);rect(g,'#6f6257',furnaceX+6,y-39,77,9);
  rect(g,'#ae6039',furnaceX+13,y-25,63,42);rect(g,'#ed9b4d',furnaceX+17,y-22,54,7);
  rect(g,'#ffd18a',furnaceX+23,y-13,34,4);rect(g,'#582e2b',furnaceX+11,y+17,69,12);
  for(let j=0;j<4;j++){rect(g,'#202e3a',x+136+j*31,y-29,24,22);rect(g,(j===2&&Math.sin(t*4+i)>0)?'#ec9d56':'#698981',x+143+j*31,y-22,6,5);}
  gear(g,x+176,y+48,21,'#192831','#52616a');gear(g,x+230,y+60,13,'#18252f','#53656a');
  // A conveyor is background machinery, not a fake playable ledge.
  rect(g,'rgba(25,39,47,.50)',x+110,y+81,170,4);
  for(let j=0;j<9;j++)rect(g,'rgba(100,116,119,.44)',x+117+j*18,y+79,3,8);
  for(let j=0;j<3;j++){const lx=x+42+j*112;rect(g,'#66757b',lx,y-73,3,14);rect(g,'#e5ab64',lx-5,y-59,14,3);}
 });
 if(!low)repeat(W,cx,154,.66,(i,x)=>{const y=horizon-55;const drift=((t*13+i*23)%100+100)%100;
  for(let j=0;j<3;j++)rect(g,'rgba(220,199,179,.13)',x+21+j*7+Math.sin(t+i+j)*6,y-drift-j*24,16+j*3,4+j*2);});
 // Aged suspended pipes and stray hot sparks are faint enough not to look solid.
 rect(g,'rgba(23,37,47,.30)',0,horizon+42,W,4);rect(g,'rgba(191,156,113,.23)',0,horizon+42,W,1);
}
function windows(g,x,y,w,h,i,low){const cols=Math.max(1,Math.floor((w-10)/20)),rows=Math.max(1,Math.floor((h-11)/23));
 for(let yy=0;yy<rows;yy++)for(let xx=0;xx<cols;xx++){const wx=x+8+xx*20,wy=y+11+yy*23,lit=hash(i+xx,yy,111)%6;
  rect(g,'#151d2b',wx,wy,10,13);if(lit===0||lit===1)rect(g,lit===0?'#c9a576':'#857b76',wx+2,wy+2,6,9);
  if(!low){rect(g,'#758093',wx+5,wy,1,12);rect(g,'#5e6679',wx,wy+8,10,1);}}}
function city(g,W,H,cx,cy,t,low,p){sky(g,W,H,p,low);
 // Purple-black far borough, mid-story apartment facades and broken skyline.
 const base=H*.69-cy*.045;
 for(let layer=0;layer<3;layer++){const pace=[105,148,212][layer],depth=[.13,.30,.56][layer];const col=[p.far,p.mid,p.near][layer];
  repeat(W,cx,pace,depth,(i,x)=>{const h=[83,129,177][layer]+frac(i,layer,17)*[96,97,123][layer];const y=base-h+layer*14,w=pace-6;
   rect(g,col,x,y,w,H-y);rect(g,'rgba(160,164,178,.24)',x,y,w,3);
   if((i&3)===0){rect(g,'#181d2b',x+19,y-16,42,16);rect(g,'#79808b',x+22,y-17,35,2);
    rect(g,'#1b2431',x+27,y-29,5,14);rect(g,'#1b2431',x+47,y-27,4,12);}
   if(layer!==0){windows(g,x,y,w,h,i,low);
    if(layer===1&&i%4===0){ // glowing district signage painted into the distant facade
     rect(g,'#2b3243',x+17,y+48,60,25);rect(g,'#ae6e72',x+21,y+51,52,3);
     rect(g,'#caad9a',x+25,y+60,7,5);rect(g,'#c49a80',x+38,y+60,21,3);
     if(!low)rect(g,'rgba(244,172,136,.16)',x+17,y+47,62,29);
    }
    // Rooftop HVAC, drainpipes and crumbling edge cracks: all behind collision plane.
    rect(g,'#222c3b',x+w-18,y-9,15,9);rect(g,'#788193',x+w-16,y-10,11,2);
    rect(g,'#172132',x+3,y+19,3,h-20);
    if(!low){for(let b=0;b<3;b++){const yy=y+31+b*37;rect(g,'rgba(204,176,170,.20)',x+1,yy,14+b*5,2);
      rect(g,'rgba(17,23,34,.44)',x+w-38,yy+11,17,2);}}
    if(layer===2){rect(g,'#242a39',x+5,y+h-39,w-11,2);for(let k=0;k<4;k++)rect(g,'#626d80',x+7+k*32,y+15,2,Math.min(70,h-20));}
   }
  });
 }
 // Distant street lights; the real traversable roads/ledges only come from map.tiles.
 repeat(W,cx,310,.62,(i,x)=>{const y=base+16;rect(g,'#253141',x+17,y-81,4,81);rect(g,'#8f8992',x+14,y-82,28,3);
  rect(g,'#dec496',x+36,y-80,7,4);if(!low){rect(g,'rgba(242,186,118,.08)',x+22,y-75,36,68);}
 });
 rect(g,'rgba(20,24,37,.21)',0,base+48,W,H-base-48);
 if(!low){repeat(W,cx,92,.15,(i,x)=>{const yy=H*.17+frac(i,7,5)*H*.25;rect(g,'rgba(216,218,235,.36)',x,yy,1,1);});}
}
function mesa(g,W,H,cx,cy,layer,color){const factor=[.12,.29,.48][layer],pace=[260,208,174][layer];const base=H*(.68+layer*.10)-cy*.05*factor;
 repeat(W,cx,pace,factor,(i,x)=>{const h=[135,104,81][layer]+frac(i,layer,16)*[95,86,66][layer];
  poly(g,color,[x-30,base,x-20,base-h*.37,x+8,base-h*.39,x+25,base-h*.82,x+43,base-h*.82,x+48,base-h,x+pace*.69,base-h,x+pace*.72,base-h*.59,x+pace*.87,base-h*.58,x+pace,base]);
  if(layer>0){rect(g,'rgba(243,200,161,.15)',x+48,base-h,pace*.38,3);rect(g,'rgba(60,55,66,.18)',x+pace*.76,base-h*.55,5,h*.53);}
 });}
function cactus(g,x,y,i,low){const h=24+frac(i,8,73)*32;rect(g,'#475c54',x,y-h,6,h);
 rect(g,'#64745a',x+1,y-h,1,h-3);rect(g,'#455d52',x-11,y-h*.71,4,h*.35);rect(g,'#455d52',x-11,y-h*.71,11,4);
 if(!low){rect(g,'#718163',x+9,y-h*.51,4,h*.28);rect(g,'#496958',x+5,y-h*.51,8,3);} }
function desert(g,W,H,cx,cy,t,low,p){sky(g,W,H,p,low);
 const sunX=W*.73-(cx*.02%Math.max(1,W*.4)),sunY=H*.25-cy*.005;
 rect(g,'rgba(253,215,151,.25)',sunX-33,sunY-33,66,66);rect(g,'#ffdfaa',sunX-21,sunY-21,42,42);
 for(let layer=0;layer<3;layer++)mesa(g,W,H,cx,cy,layer,[p.far,p.mid,p.near][layer]);
 // Separate dune plane with faceted wind erosion and muted irregular highlights.
 const floor=H*.84-cy*.025;repeat(W,cx,104,.66,(i,x)=>{const crest=floor-10-(frac(i,9,7)-.5)*22;
  poly(g,'#c19a78',[x-10,H,x-10,crest+19,x+21,crest,x+61,crest+14,x+108,crest+20,x+108,H]);
  rect(g,'rgba(255,223,168,.16)',x+24,crest+3,25,2);
 });
 repeat(W,cx,192,.54,(i,x)=>{const y=floor-9+(frac(i,4,24)-.5)*26;
  if(i%3!==0)cactus(g,x+34,y,i,low);else{
   for(let j=0;j<4;j++){const xx=x+17+j*6;rect(g,'#51594b',xx,y-8-j%2*3,2,9);}
  }
 });
 // Concrete firing stations in back plane, dark enough not to read as collision.
 repeat(W,cx,395,.44,(i,x)=>{const y=floor+14+(frac(i,7,39)-.5)*26;
  // Perforated ruin behind the dunes; exposed supports cannot masquerade as collision.
  rect(g,'rgba(94,79,77,.24)',x+34,y-65,153,87);
  rect(g,'#6c6663',x+37,y-63,7,84);rect(g,'#6c6663',x+172,y-63,7,84);
  rect(g,'rgba(230,193,144,.48)',x+40,y-64,35,3);
  rect(g,'rgba(55,61,69,.76)',x+42,y-45,46,7);rect(g,'rgba(55,61,69,.76)',x+111,y-45,62,7);
  for(let j=0;j<5;j++)rect(g,'rgba(45,53,58,.26)',x+44+j*28,y-20,16,3);
  rect(g,'#5d5756',x+168,y-98,8,33);rect(g,'#eee0b5',x+169,y-101,9,5);
 });
 if(!low){repeat(W,cx,144,.23,(i,x)=>{const y=H*.69+(frac(i,7,15)-.5)*H*.24;
  const shift=Math.sin(t*.4+i)*5;rect(g,'rgba(255,230,173,.10)',x+shift,y,88,2);rect(g,'rgba(255,230,173,.04)',x-shift,y+12,100,3);});}
}
function tilePixels(g,theme,type,variation){const [dark,mid,light]=BF_THEMES[theme].materials[type];
 rect(g,mid,0,0,16,16);rect(g,dark,0,12,16,4);rect(g,light,0,0,16,2);
 if(type===1){ // cinders, urban earth, or layered desert sand
  for(let y=4;y<12;y+=4){rect(g,dark,(y+variation)%5,y,11,1);rect(g,light,(y+2*variation)%7,y+1,5,1);}
  rect(g,dark,12,5,3,3);
 }else if(type===2){ // destructible planking / cargo timber
  rect(g,dark,0,7,16,2);rect(g,light,1,3,12,1);rect(g,light,4,10,9,1);
  rect(g,dark,2,2,2,2);rect(g,dark,12,11,2,2);
 }else if(type===3){ // rock/broken brick/sandstone masonry
  rect(g,dark,0,6,9,1);rect(g,dark,8,7,1,6);rect(g,dark,10,11,6,1);
  rect(g,light,2,4,6,2);rect(g,light,11,8,3,1);
  rect(g,dark,2,12,4,1);
 }else if(type===4){ // blast-resistant reinforced plate
  rect(g,dark,0,7,16,2);rect(g,light,2,3,12,1);rect(g,dark,13,2,2,3);
  for(const x of [2,12])for(const y of [3,12]){rect(g,dark,x,y,2,2);rect(g,light,x,y,1,1);}
 }else if(type===5){ // destructible volatile canister, distinct warm contrast
  rect(g,dark,0,3,2,13);rect(g,dark,14,3,2,13);rect(g,'#312c30',1,8,14,3);
  rect(g,light,4,4,8,2);rect(g,'#f3a14d',6,7,4,2);rect(g,'#fff0ae',7,11,2,1);
 }
 const flecks=motif(theme,type,variation);for(let k=0;k<flecks.length;k++){
  const f=flecks[k];if(type===5&&k>2)break;
  rect(g,k%3===0?light:dark,f[0],f[1],f[2],f[3]);
 }
}
// Static offscreen sprite sheets avoid re-rendering the same microtexture every frame.
// Lazily allocate only the active stage's 20 tile variants (not all 60 on first paint).
const spriteCache=Object.create(null);
function sprites(theme){
 if(Object.prototype.hasOwnProperty.call(spriteCache,theme))return spriteCache[theme];
 if(typeof OffscreenCanvas!=='function')return null;
 try{const cache=[];
  for(let type=1;type<=5;type++){cache[type]=[];for(let v=0;v<4;v++){
   const canvas=new OffscreenCanvas(16,16),context=canvas.getContext('2d');
   if(!context){spriteCache[theme]=null;return null;}
   tilePixels(context,theme,type,v);cache[type][v]=canvas;
  }}
  spriteCache[theme]=cache;return cache;
 }catch{spriteCache[theme]=null;return null;}
}
function terrain(g,theme,map,cx,cy,W,H){if(!map||!map.tiles||!Number.isSafeInteger(map.width)||!Number.isSafeInteger(map.height)||map.width<=0||map.height<=0)return;
 const mw=map.width,mh=map.height,tiles=map.tiles;
 if(typeof tiles.length!=='number'||tiles.length<mw*mh)return;
 const T=Number.isFinite(map.tileSize)&&map.tileSize>0?map.tileSize:16;
 const left=Math.max(0,Math.floor(cx/T)),right=Math.min(mw-1,Math.ceil((cx+W)/T)-1);
 const top=Math.max(0,Math.floor(cy/T)),bottom=Math.min(mh-1,Math.ceil((cy+H)/T)-1);
 if(left>right||top>bottom)return;
 const atlas=sprites(theme),at=(x,y)=>{
  if(x<0||y<0||x>=mw||y>=mh)return 0;
  const id=tiles[y*mw+x];return Number.isInteger(id)&&id>=1&&id<=5?id:0;
 };
 for(let r=top;r<=bottom;r++)for(let c=left;c<=right;c++){
  const id=at(c,r);if(!Number.isInteger(id)||id<1||id>5)continue;
  const x=Math.floor(c*T-cx),y=Math.floor(r*T-cy),v=hash(c,r,229)%4,u=T/16;
  if(atlas)g.drawImage(atlas[id][v],x,y,T,T);
  else{g.save();g.translate(x,y);g.scale(u,u);tilePixels(g,theme,id,v);g.restore();}
  // Edges live entirely within their actual collision tile; no unowned platforms.
  if(!at(c,r-1)){rect(g,BF_THEMES[theme].materials[id][2],x,y,T,Math.max(u,1));rect(g,'rgba(17,24,31,.40)',x,y+2*u,T,u);}
  if(!at(c-1,r))rect(g,'rgba(239,220,182,.35)',x,y,Math.max(1,u),T);
  if(!at(c+1,r))rect(g,'rgba(16,20,26,.48)',x+T-2*u,y,2*u,T);
  if(!at(c,r+1))rect(g,'rgba(14,22,29,.46)',x,y+T-2*u,T,2*u);
 }
}
/**
 * Draw an entire environment (background then current live collision terrain).
 * Camera x/y are world-pixel top-left, zoom is optional screen pixels per world pixel.
 * Rendering is cosmetic and never modifies map, camera, viewport, or session state.
 */
function drawBroforceEnvironment(ctx,{stageId,map,camera,viewport,time=0,quality='high'}={}){
 if(!ctx||typeof ctx.save!=='function'||typeof ctx.restore!=='function'||!viewport)return;
 const width=viewport.width,height=viewport.height;if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return;
 const zoom=Number.isFinite(camera?.zoom)&&camera.zoom>0?Math.max(.1,Math.min(8,camera.zoom)):1;
 const W=width/zoom,H=height/zoom,cx=fx(camera?.x),cy=fx(camera?.y),t=fx(time),low=quality==='low';
 const theme=BF_THEMES[stageId]?stageId:'broforce-jungle';
 ctx.save();try{
  ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();ctx.imageSmoothingEnabled=false;
  if(zoom!==1)ctx.scale(zoom,zoom);
  if(theme==='broforce-jungle'){
   // BF-24 is the canonical jungle atlas; no factory/city/desert draw ever calls it.
   const {drawBroforceWorld}=require('src/engines/broforce/worldArt.js');
   drawBroforceWorld(ctx,{map:map||{width:0,height:0,tiles:[]},camera:{x:cx,y:cy},viewport:{width:W,height:H},time:t,quality});
  }else{
   const palette=BF_THEMES[theme];
   if(theme==='broforce-factory')factory(ctx,W,H,cx,cy,t,low,palette);
   else if(theme==='broforce-city')city(ctx,W,H,cx,cy,t,low,palette);
   else desert(ctx,W,H,cx,cy,t,low,palette);
   terrain(ctx,theme,map,cx,cy,W,H);
  }
 }finally{ctx.restore();}
}
Object.assign(exports,{drawBroforceEnvironment});
