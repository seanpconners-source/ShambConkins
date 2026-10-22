// Drop-in table art. The owner puts files in assets/pinball/<table>/<slot>.(webp|png|jpg|svg); tools/build.mjs embeds
// them as USER_PORTRAITS['pinball:<table>:<slot>']. Slots every table understands:
//   playfield  whole playfield art, stretched to the table (514 x 1067 mm → 1028 x 2134 px is ideal)
//   backglass  the backbox picture (intro card + strip beside the DMD); any size, drawn "cover"
//   apron      the apron at the bottom (between the outlanes, under the flippers)
//   logo       the table's logo (playfield logo spot + backbox)
//   character  the hero art between the slingshots
//   bumper     pop bumper cap (square, cropped to a circle)
//   toy        the moving toy (Bucketheadland: the Giant Robot), drawn in the toy's box
//   flipper-left / flipper-right  the two bottom flippers (e.g. a hand). Drawn in the flipper's own frame, so it swings
//              with it: 600 x 200 px, pivot at (120,100), flipper tip at (510,100). Draw the left one pointing right
//              (pivot on the left); the right one is its mirror (pivot at (480,100), tip at (90,100)). See drawFlipperImage.
// Missing slots fall back to the code-drawn art. onLoad() fires when an image finishes decoding (redraw caches).
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const SLOTS=['playfield','backglass','apron','logo','character','bumper','toy','flipper-left','flipper-right'];
function loadDropins(tableId,onLoad=()=>{}){
 const imgs={};
 for(const slot of SLOTS){const url=USER_PORTRAITS[`pinball:${tableId}:${slot}`];if(!url||typeof Image==='undefined')continue;
  const img=new Image();img.onload=()=>{imgs[slot]=img;onLoad(slot);};img.src=url;}
 return imgs;
}
// Draw an image to fill a rect, cropping the overflow ("cover") — or squeezing it in exactly ("stretch").
function drawCover(x,img,rx,ry,rw,rh,mode='cover'){
 if(mode==='stretch'){x.drawImage(img,rx,ry,rw,rh);return;}
 const s=Math.max(rw/img.width,rh/img.height),sw=rw/s,sh=rh/s;x.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,rx,ry,rw,rh);
}
// A drop-in toy picture stretched to its box, with a shadow and hit flash that follow its outline (transparent
// pixels get neither), so a toy that doesn't fill its box shows no dark rectangle around it.
const tints=new WeakMap();
function tinted(img,color){
 let m=tints.get(img);if(!m)tints.set(img,m={});
 if(!m[color]){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');
  g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);m[color]=c;}
 return m[color];
}
function drawToy(x,img,rx,ry,rw,rh,{shadow=.45,hit=false}={}){
 x.save();x.globalAlpha=shadow;x.drawImage(tinted(img,'#000'),rx+5,ry+6,rw,rh);x.globalAlpha=1;
 x.drawImage(img,rx,ry,rw,rh);
 if(hit){x.globalCompositeOperation='lighter';x.globalAlpha=.35;x.drawImage(tinted(img,'#fff'),rx,ry,rw,rh);}
 x.restore();
}
// A flipper picture (600 x 200 px) drawn in the flipper's frame: 390 px = the flipper's length, pivot at (120,100) for a
// left flipper; a right flipper's picture is the mirror image (pivot at (480,100)), so the art stays upright on both sides.
// A shadow in the picture's outline goes under it, like the painted flippers.
const FLIP={w:600,h:200,px:120,py:100,len:390};
function drawFlipperImage(x,f,img,right){
 const k=f.len/FLIP.len,px=right?FLIP.w-FLIP.px:FLIP.px;
 const place=(src,off)=>{x.save();x.translate(f.x+off,f.y+off*1.3);x.rotate(f.a);if(right)x.scale(-1,-1);
  x.drawImage(src,-px*k,-FLIP.py*k,FLIP.w*k,FLIP.h*k);x.restore();};
 x.save();x.globalAlpha=.35;place(tinted(img,'#000'),3);x.restore();place(img,0);
}
Object.assign(exports,{loadDropins,drawCover,drawToy,drawFlipperImage,PINBALL_ART_SLOTS:SLOTS});
