// HEAD FACTS at runtime: where the face is inside a character's picture and which way it looks, read from
// src/data/headFacts.js (written offline by tools/head-check.py; no face detection in the game). Games that paste a
// head on a body use it to sit the FACE on the neck (hair, ears and hats stick out round it instead of pushing the face
// off centre) and to mirror a head that looks against the way the body moves.
// The picture is found exactly like the game draws it: portraitURL(id,mood), then that URL is matched back to its key.
const {HEAD_FACTS}=require("src/data/headFacts.js");
const {portraitURL}=require("src/assets.js");
const {ART}=require("src/data/art.js");
const {FACE_ART}=require("src/data/faceArt.js");
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
 const a=HEAD_FACTS[keyOf(url)],f=a?{face:{x:a[0],y:a[1],w:a[2],h:a[3]},head:{x:a[4],y:a[5],w:a[6],h:a[7]},look:a[8],conf:a[9],found:!!a[10],aspect:a[11]||1}:null;
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

Object.assign(exports,{headFacts,lookDir,flipFor,faceFit,drawFace});
