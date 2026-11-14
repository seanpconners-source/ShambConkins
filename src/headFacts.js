// HEAD FACTS at runtime: where the face is inside a character's picture and which way it looks, read from
// src/data/headFacts.js (written offline by tools/head-check.py; no face detection in the game). Games that paste a
// head on a body use it to sit the FACE on the neck (hair, ears and hats stick out round it instead of pushing the face
// off centre) and to mirror a head that looks against the way the body moves.
// The picture is found exactly like the game draws it: portraitURL(id,mood), then that URL is matched back to its key.
const {HEAD_FACTS}=require("src/data/headFacts.js");
const {portraitURL}=require("src/assets.js");
const {ART}=require("src/data/art.js");
const {FACE_ART}=require("src/data/faceArt.js");
const {framedFace}=require("src/suppliedPortraits.js");
require("src/data/userPortraits.js");// puts the owner's portraits into ART

let byUrl=null;
const keyOf=url=>{
 if(!byUrl){byUrl=new Map();for(const src of [FACE_ART,ART])for(const [k,v] of Object.entries(src))if(HEAD_FACTS[k]&&typeof v==='string'&&!byUrl.has(v))byUrl.set(v,k);}
 return byUrl.get(url);
};
const memo=new Map();
// {face:{x,y,w,h}, head:{x,y,w,h} (fractions of the picture), look:-1|0|1 (the face points to the picture's left /
// straight on / right), conf 0..1, found (a detector saw the face; false = guessed from the outline), aspect w/h}, or null
// when the picture has no facts (an online photo, a generated stand-in).
function headFacts(id,mood='normal'){
 let url;try{url=portraitURL(id,mood);}catch{return null;}
 if(!url)return null;
 if(memo.has(url))return memo.get(url);
 let a=HEAD_FACTS[keyOf(url)],f=a?{face:{x:a[0],y:a[1],w:a[2],h:a[3]},head:{x:a[4],y:a[5],w:a[6],h:a[7]},look:a[8],conf:a[9],found:!!a[10],aspect:a[11]||1}:null;
 // a supplied face shown through a crop frame (suppliedPortraits FACE_FRAMES, e.g. Mrs Doubtfire's normal face): the facts
 // were measured on the whole picture, so map them into the frame (owner, Nov 13: her face jumped to the chest between moods)
 if(!f){const fr=framedFace(url),b=fr&&HEAD_FACTS[fr.key];if(b){const {width:W,height:H,bounds:[L,T,R,B]}=fr.frame,fw=R-L,fh=B-T;
  const box=(x,y,w,h)=>({x:(x*W-L)/fw,y:(y*H-T)/fh,w:w*W/fw,h:h*H/fh});f={face:box(b[0],b[1],b[2],b[3]),head:box(b[4],b[5],b[6],b[7]),look:b[8],conf:b[9],found:!!b[10],aspect:fw/fh};}}
 memo.set(url,f);return f;
}
// Which way the face looks, only when the check is sure enough: -1 left, 1 right, 0 straight on / not sure.
function lookDir(id,mood,minConf=.45){const f=headFacts(id,mood);return f&&f.look&&f.conf>=minConf?f.look:0;}
// Mirror the head? body = which way the body moves or faces (-1 left, 1 right).
function flipFor(id,mood,body,minConf){const d=lookDir(id,mood,minConf);return !!d&&!!body&&d!==Math.sign(body);}
// For drawers that fit the whole picture in a square box of `size` (session.sprite, fitted <img>): the box size and the
// offset of the box centre from the face centre, so the face comes out faceW wide with its middle on the spot.
// Returns null without facts (draw the old way).
function faceFit(id,mood,faceW,{pad=3}={}){
 const f=headFacts(id,mood);if(!f||f.face.w<=0)return null;
 const ar=f.aspect,wk=ar>=1?1:ar,hk=ar>=1?1/ar:1,longest=faceW/(f.face.w*wk);
 return {size:longest+pad,dx:(.5-(f.face.x+f.face.w/2))*longest*wk,dy:(.5-(f.face.y+f.face.h/2))*longest*hk,facts:f};
}

// Draw player i's head on a body with session s: the FACE (brow to chin) is faceK x size wide with its middle on (cx,cy),
// hair/ears/hats stick out round it, and a face looking against dir (-1 left, 1 right: the way the body faces) is
// mirrored. Faces keep one size through every mood (tools/head-check.py evens them out per character). Without facts
// (an online photo, a stand-in) the whole picture is centred in `size`, the old way. Drawn still (no menu bob/sway).
function drawFace(s,g,i,cx,cy,size,mood,dir,faceK=.6){
 const id=s.players[i]?.character,m=mood||s.spriteMood(i),k=s.players[i]?.large?2:1,fit=id&&faceFit(id,m,size*faceK*k);
 if(!fit){s.sprite(g,i,cx,cy,size,{exact:true,mood:m,noBadge:true,still:true});return;}
 const flip=flipFor(id,m,dir);g.save();g.translate(cx,cy);if(flip)g.scale(-1,1);
 s.sprite(g,i,fit.dx,fit.dy,fit.size/k,{exact:true,mood:m,noBadge:true,still:true});g.restore();
}

// Where the face and the whole head (hair, ears) land on screen when a face faceW wide is centred on (cx,cy), as boxes
// {x,y,w,h}; a mirrored head mirrors round cx. For hats and caps that must hug the real top of the head (Sundown, Mario).
// Returns null without facts.
function faceGeom(id,mood,faceW,cx,cy,flip=false){
 const fit=faceFit(id,mood,faceW);if(!fit)return null;const f=fit.facts,ar=f.aspect,wk=ar>=1?1:ar,hk=ar>=1?1/ar:1,L=fit.size-3,pw=L*wk,ph=L*hk;
 const px=cx+fit.dx-pw/2,py=cy+fit.dy-ph/2;
 const box=b=>{let x=px+b.x*pw;const w=b.w*pw;if(flip)x=2*cx-x-w;return {x,y:py+b.y*ph,w,h:b.h*ph};};
 return {face:box(f.face),head:box(f.head)};
}
// The face's height for a face faceW wide (brow to chin), or faceW x 1.25 without facts.
function faceHeight(id,mood,faceW){const fit=faceFit(id,mood,faceW);if(!fit)return faceW*1.25;const f=fit.facts,wk=f.aspect>=1?1:f.aspect,hk=f.aspect>=1?1/f.aspect:1;return faceW*(f.face.h*hk)/(f.face.w*wk);}
// drawFace for a character who is not one of the session's players (a boss, a pilot): same placement and mirroring,
// the picture loaded here (cached). Without facts the whole picture is centred, faceW/.6 across.
const IMG=new Map();
function picture(id,mood){
 let url;try{url=portraitURL(id,mood);}catch{url=null;}if(!url)return null;let im=IMG.get(url);
 if(!im){im=new Image();try{im.src=require("src/headCutouts.js").headDisplayURL(url);}catch{im.src=url;}IMG.set(url,im);}
 return im.complete&&im.naturalWidth?im:null;
}
function drawFaceById(g,id,mood,cx,cy,faceW,dir){
 const im=picture(id,mood)||picture(id,'normal');if(!im)return false;const fit=faceFit(id,mood,faceW);
 const size=fit?fit.size-3:faceW/.6,sc=size/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*sc,h=im.naturalHeight*sc;
 g.save();g.translate(cx,cy);if(fit&&flipFor(id,mood,dir))g.scale(-1,1);g.drawImage(im,(fit?fit.dx:0)-w/2,(fit?fit.dy:0)-h/2,w,h);g.restore();return true;
}

// drawFaceById, pre-drawn: the face as a small canvas already the size it shows at (a 480 px portrait shrunk to ~40 px
// every frame, a dozen times over, was what made Tapper crawl on a phone). Returns {cv,x,y} = draw cv at (cx+x,cy+y),
// or null until the picture has loaded. Cached per character, mood, size (whole px) and facing.
const SPR=new Map();
function shrinkTo(img,w,h){let src=img,sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height;
 while(sw/2>=w*1.5&&sh/2>=h*1.5){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw/2));c.height=Math.max(1,Math.round(sh/2));c.getContext('2d').drawImage(src,0,0,c.width,c.height);src=c;sw=c.width;sh=c.height;}
 return src;}
function faceSprite(id,mood,faceW,dir){
 const fw=Math.max(4,Math.round(faceW)),im=picture(id,mood)||picture(id,'normal');if(!im)return null;const fit=faceFit(id,mood,fw),flip=!!(fit&&flipFor(id,mood,dir));
 const key=id+'|'+mood+'|'+fw+'|'+(flip?1:0)+'|'+im.src.length;let e=SPR.get(key);if(e)return e;
 const size=fit?fit.size-3:fw/.6,sc=size/Math.max(im.naturalWidth,im.naturalHeight),w=Math.max(1,Math.ceil(im.naturalWidth*sc)),h=Math.max(1,Math.ceil(im.naturalHeight*sc));
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');g.imageSmoothingQuality='high';
 if(flip){g.translate(w,0);g.scale(-1,1);}g.drawImage(shrinkTo(im,w,h),0,0,w,h);
 const dx=fit?fit.dx:0;e={cv,x:(flip?-dx:dx)-w/2,y:(fit?fit.dy:0)-h/2};
 if(SPR.size>400)SPR.clear();SPR.set(key,e);return e;
}

Object.assign(exports,{headFacts,lookDir,flipFor,faceFit,drawFace,faceGeom,faceHeight,drawFaceById,faceSprite});
