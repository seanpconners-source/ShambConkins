// Drop-in table art. The owner puts files in assets/pinball/<table>/<slot>.(webp|png|jpg|svg); tools/build.mjs embeds
// them as USER_PORTRAITS['pinball:<table>:<slot>']. Slots every table understands:
//   playfield  whole playfield art, stretched to the table (514 x 1067 mm → 1028 x 2134 px is ideal)
//   backglass  the backbox picture (intro card + strip beside the DMD); any size, drawn "cover"
//   apron      the apron at the bottom (between the outlanes, under the flippers)
//   logo       the table's logo (playfield logo spot + backbox)
//   character  the hero art between the slingshots
//   bumper     pop bumper cap (square, cropped to a circle)
//   toy        the moving toy (Bucketheadland: the Giant Robot), drawn in the toy's box
// Missing slots fall back to the code-drawn art. onLoad() fires when an image finishes decoding (redraw caches).
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const SLOTS=['playfield','backglass','apron','logo','character','bumper','toy'];
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
Object.assign(exports,{loadDropins,drawCover,PINBALL_ART_SLOTS:SLOTS});
