const {FACE_ART}=require("src/data/faceArt.js");
const {FACE_ASSIGNMENTS, FACE_FRAMES}=require("src/data/facePack.js");
const {characterIdentity}=require("src/characters.js");
const {ART}=require("src/data/art.js");
require("src/data/userPortraits.js");
const aliases={idle:'normal',happy:'win',winning:'win',walking:'walk',thinking:'think',losing:'sad',lose:'sad',mad:'angry'};
const framed=new Map(),framedKey=new Map();   // url -> face key, for head facts measured on the unframed picture
function suppliedPortraitURL(id,mood='normal'){
 const identity=characterIdentity(id),moods=FACE_ASSIGNMENTS[identity];if(!moods)return null;
 const normalized=aliases[mood]||mood;
 if(identity==='mylo'&&normalized!=='win')return ART['photo:char:mylo']||ART['char:mylo:normal'];
 // Keep Sean's previously approved cropped celebration/losing photos as well.
 const key=moods[normalized]||(identity==='sean'?null:moods.normal);if(!key)return null;
 const src=FACE_ART[key],frame=FACE_FRAMES[key];if(!frame)return src;
 if(!framed.has(key)){
  const [left,top,right,bottom]=frame.bounds;
  // A display viewport removes transparent padding without altering the PNG.
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${right-left}" height="${bottom-top}" viewBox="${left} ${top} ${right-left} ${bottom-top}"><image href="${src}" width="${frame.width}" height="${frame.height}"/></svg>`;
  const u='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);framed.set(key,u);framedKey.set(u,key);
 }
 return framed.get(key);
}

// {key, frame} for a framed supplied portrait URL (made by suppliedPortraitURL), else null
function framedFace(url){const key=framedKey.get(url);return key?{key,frame:FACE_FRAMES[key]}:null;}
Object.assign(exports,{suppliedPortraitURL,framedFace});