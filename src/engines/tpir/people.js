// People for THE EPISODE's own scenes (tpir/showcase.js, tpir/episode.js): a contestant standing on the show's photo bodies (cr-body-N,
// the Contestants' Row sheets) or a family member (family-N, headless sheets the winner's family runs down in), with a real face on
// the neck: a player's own (drawFace) or a guest's character picture (faceSprite). Who = {p: player index} or {id: character id}.
const SS=require("src/data/showSprites.js");
const {faceSprite,headFacts,drawFace}=require("src/headFacts.js");
const AUD=require("src/engines/gameshow/audience.js");
const TAU=Math.PI*2;
function face(g,s,who,cx,cy,fw,mood='normal',dir=1){
 if(who&&who.p!=null){drawFace(s,g,who.p,cx,cy,fw/.6,mood,dir,.6);return;}
 const id=who&&who.id,sp=id?faceSprite(id,headFacts(id,mood)?mood:'normal',fw,dir):null;
 if(sp){g.drawImage(sp.cv,cx+sp.x,cy+sp.y);return;}
 g.fillStyle='#f1c7a3';g.beginPath();g.ellipse(cx,cy,fw*.5,fw*.62,0,0,TAU);g.fill();g.fillStyle='#4a2c18';g.beginPath();g.ellipse(cx,cy-fw*.38,fw*.55,fw*.32,0,Math.PI,TAU);g.fill();}
// a contestant (body sheet cr-body-1..4) standing with feet at (fx,fy), h tall; pose = a CR_BODY frame name
function contestant(g,s,who,fx,fy,h,{body=0,pose='stand',mood='normal',dir=1,t=0}={}){const D=SS.CR_BODY,img=SS.picture('cr-body-'+(1+body%4));
 let jump=pose==='jump'?Math.abs(Math.sin(t*7))*.12*h:0;fy-=jump;
 if(img){const nf=Math.max(1,Math.round(img.width/D.w)),fi=Math.max(0,D.frames.slice(0,nf).indexOf(pose)),fw=img.width/nf,k=h/D.unit,sp=(D.spots&&D.spots[fi])||D.spot;
  g.drawImage(img,fi*fw,0,fw,img.height,fx-D.feet[0]*k,fy-D.feet[1]*k,fw*k,img.height*k);face(g,s,who,fx+(sp[0]-D.feet[0])*k,fy+(sp[1]-D.feet[1])*k+h*AUD.FACE_DROP,D.faceW*h,mood,dir);return;}
 AUD.drawnBody(g,['#e63946','#3a86ff','#ffbe0b','#06d6a0'][body%4],fx,fy,h,pose==='stand'?'stand':pose,t);face(g,s,who,fx,fy-D.face[1]*h,D.faceW*h,mood,dir);}
// a family member: sheet family-1..4 (8 poses: run1-4 jump hug cheer wave), the kid's face sits lower (template: +60 px)
function family(g,s,who,n,fx,fy,h,pose,t,dir=1,mood='win'){const F=SS.FAMILY,img=SS.picture('family-'+n),fi=Math.max(0,F.frames.indexOf(pose)),k=h/F.h;
 if(img){g.save();g.translate(fx,fy);if(dir<0)g.scale(-1,1);g.drawImage(img,fi*F.w,0,F.w,F.h,-F.feet[0]*k,-F.feet[1]*k,F.w*k,F.h*k);g.restore();
  const sy=F.spot[1]+(n===4?60:0),cx=fx+(F.spot[0]-F.feet[0])*k*dir,cy=fy+(sy-F.feet[1])*k+h*.012;face(g,s,who,cx,cy,F.faceW*F.w*k*1.55,mood,dir);return;}
 const hh=h*(n===4?.7:.9);AUD.drawnBody(g,['#ff4fa0','#ffbe0b','#3a86ff','#06d6a0'][(n-1)%4],fx,fy,hh,pose.startsWith('run')?'run':pose==='hug'||pose==='wave'?'cheer':pose,t);face(g,s,who,fx,fy-SS.CR_BODY.face[1]*hh,SS.CR_BODY.faceW*hh,mood,dir);}
Object.assign(exports,{face,contestant,family});
