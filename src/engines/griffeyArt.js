// Drawing for the Ken Griffey-style baseball game (engines/griffeyBall.js): the batting view from behind the plate (the
// stadium, the pitcher on the mound, the batter, the strike zone, the pitch coming in), the field view from above and
// behind home (grass, dirt, bases, fence, fielders and runners with the players' heads, the ball and its shadow), the
// scoreboard, the announcer's ticker and the drawn buttons. Original drawings; the look follows 16-bit baseball games.
const R=require('src/engines/baseballRules.js');
let headOf=null;try{headOf=require('src/engines/broforce.js').headCanvas;}catch{}
const head=(id,mood='normal')=>{try{return headOf?.(id,mood,128)||null;}catch{return null;}};
// the owner's drop-in sprite sheets (src/data/baseballSprites.js); each one falls back to the drawn art below
let SP=null;try{SP=require('src/data/baseballSprites.js');}catch{}
const sheetFor=name=>SP?.sheet(name)||null,pic=name=>SP?.picture(name)||null;
// draw frame `fr` of sheet `sh` with its foot at (px,py) so the player is `tallPx` high; facing -1 mirrors it.
// Returns where the face goes (screen centre + size) for sheets with a head slot.
function drawSprite(x,sh,fr,px,py,tallPx,facing=1){const d=sh.def,s=tallPx/d.tall;x.save();x.translate(px,py);x.scale(facing*s,s);
 x.imageSmoothingEnabled=true;x.drawImage(sh.img,fr.sx,fr.sy,fr.w,fr.h,-d.foot[0],-d.foot[1],fr.w,fr.h);x.restore();
 return d.head?{x:px+(d.head[0]-d.foot[0])*s*facing,y:py+(d.head[1]-d.foot[1])*s,size:d.headSize*s}:null;}
// the character's face in a sprite's head slot, with the helmet/cap picture over it if there is one
function faceAt(x,spot,id,mood,hat){if(!spot)return;const hc=head(id,mood);if(hc)x.drawImage(hc,spot.x-spot.size/2,spot.y-spot.size/2,spot.size,spot.size);
 const hp=hat&&pic(hat);if(hp){const w=spot.size*1.05,h=w*hp.height/hp.width;x.drawImage(hp,spot.x-w/2,spot.y-spot.size*.18-h,w,h);return true;}return false;}
// the ball (picture or drawn) centred at (X,Y), radius r
function ball(x,X,Y,r){const b=pic('ball');if(b){x.drawImage(b,X-r,Y-r,r*2,r*2);return;}x.fillStyle='#fff';x.strokeStyle='#c22';x.lineWidth=1;x.beginPath();x.arc(X,Y,r,0,7);x.fill();x.stroke();}
// a title picture (logo / derby-logo) fitted into a box centred at (cx,cy); false if there is none
function logo(x,name,cx,cy,maxW,maxH){const L=pic(name);if(!L)return false;const k=Math.min(maxW/L.width,maxH/L.height);x.drawImage(L,cx-L.width*k/2,cy-L.height*k/2,L.width*k,L.height*k);return true;}
const FONT='"SC Bangers",Impact,"Arial Black",sans-serif',BODY='"SC Nunito","Arial Rounded MT Bold",Arial,sans-serif';
const TEAM_COL=[['#c8202f','#ffffff','#1b2a5a'],['#1d4fbf','#ffffff','#14213d']];   // jersey, pants, cap
function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();}

// ---- the batting view layout
function batLayout(W,H){const wide=W>H*1.15,hz=H*(wide?.3:.33),zw=Math.min(W*(wide?.2:.34),H*(wide?.3:.2),180),zh=zw*1.15;
 return {W,H,wide,horizon:hz,mound:{x:W/2,y:hz+H*(wide?.14:.115)},plate:{x:W/2,y:H*(wide?.86:.8)},zone:{x:W/2,y:H*(wide?.6:.62),w:zw,h:zh}};}
const zoneXY=(B,u,v)=>({x:B.zone.x+u*B.zone.w/2,y:B.zone.y-v*B.zone.h/2});
const zoneUV=(B,px,py)=>({u:(px-B.zone.x)/(B.zone.w/2),v:-(py-B.zone.y)/(B.zone.h/2)});
// stadium, crowd, wall, grass, dirt: cached per size
const bgCache=new Map();
function battingBG(B,team){const sPic=pic('stadium'),wPic=pic('wall'),key=B.W+'x'+B.H+(sPic?'s':'')+(wPic?'w':'');let c=bgCache.get(key);if(c)return c;c=document.createElement('canvas');const k=Math.min(2,devicePixelRatio||1);c.width=Math.ceil(B.W*k);c.height=Math.ceil(B.H*k);const x=c.getContext('2d');x.scale(k,k);
 const {W,H,horizon:hz}=B;let g=x.createLinearGradient(0,0,0,hz);g.addColorStop(0,'#5fa8ff');g.addColorStop(1,'#bfe0ff');x.fillStyle=g;x.fillRect(0,0,W,hz);
 // stands: tiers of crowd dots
 x.fillStyle='#3a4a6a';x.fillRect(0,hz*.38,W,hz*.62);let seed=5;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let row=0;row<14;row++){const y=hz*.4+row*hz*.042;for(let i=0;i<W/5;i++){x.fillStyle=['#e8d0b0','#c89070','#704828','#f0e0c0','#d04040','#4060c0','#f0f0f0'][Math.floor(rnd()*7)];x.fillRect(i*5+rnd()*2,y+rnd()*2,3,3);}}
 x.fillStyle='#22301c';x.fillRect(0,hz*.95,W,hz*.05);
 // scoreboard tower and light stands
 x.fillStyle='#1a1a1a';x.fillRect(W*.47,hz*.06,W*.22,hz*.24);x.fillStyle='#f5c518';x.font=`400 ${Math.max(10,hz*.08)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText('MAJOR LEAGUE',W*.58,hz*.18);
 for(const lx of [W*.74,W*.92]){x.fillStyle='#555';x.fillRect(lx-2,hz*.05,4,hz*.4);x.fillStyle='#fffbe0';x.fillRect(lx-14,hz*.02,28,hz*.08);}
 // the outfield wall with ads
 g=x.createLinearGradient(0,hz,0,hz+H*.04);g.addColorStop(0,'#1f6b3a');g.addColorStop(1,'#154d2a');x.fillStyle=g;x.fillRect(0,hz,W,H*.04);
 const ads=['INDIANS','HARRY’S','WILD THING','JOBU RUM','DORN HOMES'];x.font=`400 ${Math.max(9,H*.022)}px ${FONT}`;ads.forEach((a,i)=>{x.fillStyle=i%2?'#f5c518':'#ffffff';x.fillText(a,W*(i+.5)/ads.length,hz+H*.021);});
 // the owner's stadium / wall pictures over the drawn ones (cover: fill the band, crop the overflow evenly)
 const cover=(img,X,Y,w,h)=>{const k=Math.max(w/img.width,h/img.height),iw=w/k,ih=h/k;x.drawImage(img,(img.width-iw)/2,(img.height-ih)/2,iw,ih,X,Y,w,h);};
 if(sPic)cover(sPic,0,0,W,hz);if(wPic)x.drawImage(wPic,0,hz,W,H*.04);
 // grass with mow stripes, then the infield dirt and the mound
 const gy=hz+H*.04;g=x.createLinearGradient(0,gy,0,H);g.addColorStop(0,'#3f9a46');g.addColorStop(1,'#2f7d36');x.fillStyle=g;x.fillRect(0,gy,W,H-gy);
 x.globalAlpha=.12;x.fillStyle='#fff';for(let i=0;i<9;i++){x.beginPath();x.moveTo(B.plate.x,B.plate.y+40);x.lineTo(W*(i/8.5)-W*.1,gy);x.lineTo(W*((i+.45)/8.5)-W*.1,gy);x.closePath();x.fill();}x.globalAlpha=1;
 x.fillStyle='#b8834e';x.beginPath();x.moveTo(B.plate.x,B.plate.y+H*.05);x.lineTo(W*.95,B.mound.y+(B.plate.y-B.mound.y)*.3);x.quadraticCurveTo(W/2,gy-H*.02,W*.05,B.mound.y+(B.plate.y-B.mound.y)*.3);x.closePath();x.fill();
 x.fillStyle='#3f9a46';x.beginPath();x.moveTo(B.plate.x,B.plate.y-H*.06);x.lineTo(W*.72,B.mound.y+(B.plate.y-B.mound.y)*.32);x.lineTo(W/2,B.mound.y+H*.012);x.lineTo(W*.28,B.mound.y+(B.plate.y-B.mound.y)*.32);x.closePath();x.fill();
 x.fillStyle='#c2905a';x.beginPath();x.ellipse(B.mound.x,B.mound.y+H*.012,W*.07,H*.018,0,0,7);x.fill();
 // foul lines and the batter's box
 x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.moveTo(B.plate.x,B.plate.y);x.lineTo(-W*.3,gy);x.moveTo(B.plate.x,B.plate.y);x.lineTo(W*1.3,gy);x.stroke();
 x.fillStyle='#b8834e';x.beginPath();x.ellipse(B.plate.x,B.plate.y+H*.02,W*.32,H*.07,0,0,7);x.fill();
 x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=2;x.strokeRect(B.plate.x-W*.25,B.plate.y-H*.03,W*.18,H*.08);x.strokeRect(B.plate.x+W*.07,B.plate.y-H*.03,W*.18,H*.08);
 x.fillStyle='#fff';x.beginPath();const pw=W*.05;x.moveTo(B.plate.x-pw,B.plate.y);x.lineTo(B.plate.x+pw,B.plate.y);x.lineTo(B.plate.x+pw,B.plate.y+pw*.3);x.lineTo(B.plate.x,B.plate.y+pw*.6);x.lineTo(B.plate.x-pw,B.plate.y+pw*.3);x.closePath();x.fill();
 bgCache.set(key,c);return c;}
// a ball player: legs, body, arms, cap on the player's head; pose: stand/windup/throw/run/crouch
function player(x,px,py,h,team,id,{pose='stand',t=0,k=0,facing=1,mood='normal',back=false,kind='fielder'}={}){const [jer,pant,cap]=TEAM_COL[team]||TEAM_COL[0],u=h/10;
 const sh=sheetFor(kind+'-p'+(team+1));
 if(sh){x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(px,py,u*2.6,u*.7,0,0,7);x.fill();
  const row=kind==='pitcher'?(pose==='windup'?'windup':pose==='throw'?'throw':'idle'):(pose==='run'?'run':pose==='throw'||pose==='windup'?'throw':'stand');
  const fr=SP.frameOf(sh.def,row,row==='windup'||row==='throw'?{k}:{t,fps:row==='run'?12:2});
  const spot=drawSprite(x,sh,fr,px,py,u*10.9,facing);if(!faceAt(x,spot,id,mood,'cap-p'+(team+1))&&spot){x.fillStyle=cap;x.beginPath();x.ellipse(spot.x,spot.y-spot.size*.18,spot.size*.4,spot.size*.17,0,Math.PI,0);x.fill();}
  return;}
 x.save();x.translate(px,py);x.scale(facing,1);
 x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(0,0,u*2.6,u*.7,0,0,7);x.fill();
 const run=pose==='run'?Math.sin(t*14):0,legA=run*.6;
 x.strokeStyle=pant;x.lineCap='round';x.lineWidth=u*1.3;x.beginPath();x.moveTo(-u*.6,-u*4);x.lineTo(-u*.8+Math.sin(legA)*u*2,-u*.2);x.moveTo(u*.6,-u*4);x.lineTo(u*.8-Math.sin(legA)*u*2,-u*.2);x.stroke();
 x.fillStyle='#111';x.fillRect(-u*1.6+Math.sin(legA)*u*2,-u*.5,u*1.4,u*.5);x.fillRect(u*.2-Math.sin(legA)*u*2,-u*.5,u*1.4,u*.5);
 x.fillStyle=jer;rr(x,-u*1.6,-u*7.4,u*3.2,u*3.8,u*.9);x.fill();x.fillStyle='rgba(255,255,255,.85)';x.font=`900 ${u*1.4}px ${BODY}`;x.textAlign='center';x.textBaseline='middle';if(back)x.fillText(String((R.hash(id)%40)+1),0,-u*5.6);
 // arms by pose
 x.strokeStyle=jer;x.lineWidth=u*1.05;x.beginPath();
 if(pose==='windup'){x.moveTo(u*1.2,-u*6.8);x.lineTo(u*1.6,-u*9.6);x.moveTo(-u*1.2,-u*6.8);x.lineTo(-u*2.4,-u*8.6);}
 else if(pose==='throw'){x.moveTo(u*1.2,-u*6.8);x.lineTo(u*3.6,-u*7.6);x.moveTo(-u*1.2,-u*6.8);x.lineTo(-u*2.6,-u*5.2);}
 else if(pose==='crouch'){x.moveTo(u*1.2,-u*6.2);x.lineTo(u*2.2,-u*4.6);x.moveTo(-u*1.2,-u*6.2);x.lineTo(-u*2.4,-u*5);}
 else{x.moveTo(u*1.2,-u*6.8);x.lineTo(u*1.8+run*u,-u*4.6);x.moveTo(-u*1.2,-u*6.8);x.lineTo(-u*1.8-run*u,-u*4.6);}x.stroke();
 x.fillStyle='#7a4a1e';x.beginPath();x.arc(pose==='throw'?-u*2.6:-u*1.9,pose==='throw'?-u*5.2:-u*4.6,u*.75,0,7);x.fill();
 const hc=head(id,mood),hs=u*4;if(hc)x.drawImage(hc,-hs/2,-u*7.2-hs*.92,hs,hs);
 x.fillStyle=cap;x.beginPath();x.ellipse(0,-u*7.2-hs*.82,hs*.4,hs*.17,0,Math.PI,0);x.fill();x.fillRect(back?-hs*.35:0,-u*7.2-hs*.84,hs*.42,hs*.06);
 x.restore();}
// the batter, from behind the catcher: a right-handed batter on the left of the plate; swing k 0..1
// the bat: knob at the hands, thin handle, thick barrel with a rounded end; `a` = angle, `flat` squashes the vertical
// part (a level swing seen from behind the catcher sweeps flat across the body)
function drawBat(x,hx,hy,a,L,u,flat=1){const dx=Math.cos(a),dy=Math.sin(a)*flat,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,nx=-uy,ny=ux,l=L*len;
 const P=(k,w)=>[hx+ux*l*k+nx*w,hy+uy*l*k+ny*w];x.save();x.fillStyle='#d9ae6a';x.strokeStyle='#4a2e12';x.lineWidth=Math.max(1,u*.18);x.lineJoin='round';x.beginPath();
 const pts=[P(0,u*.16),P(.38,u*.16),P(.62,u*.34),P(.97,u*.4),P(.97,-u*.4),P(.62,-u*.34),P(.38,-u*.16),P(0,-u*.16)];x.moveTo(...pts[0]);for(const q of pts.slice(1))x.lineTo(...q);x.closePath();x.fill();x.stroke();
 x.beginPath();x.arc(...P(.97,0),u*.4,a-Math.PI/2,a+Math.PI/2);x.fill();x.stroke();
 x.fillStyle='#222';x.beginPath();x.arc(hx,hy,u*.3,0,7);x.fill();x.restore();}
// the batter, from behind the catcher: a right-handed batter on the left of the plate. swing k 0..1 (0 = waiting);
// o.bx/o.by = where he stands in the batter's box (-1..1: toward the plate / up toward the pitcher), o.bunt = squared to bunt
function batter(x,B,team,id,swing,mood,t=0,o={}){const h=B.H*(B.wide?.3:.22),bx=o.bx||0,by=o.by||0,px=B.zone.x-B.zone.w*(B.wide?.95:.9)-h*.12+bx*B.zone.w*.3,py=B.plate.y+B.H*.02-by*B.H*.03,u=h/10,[jer,pant,cap]=TEAM_COL[team]||TEAM_COL[0];
 const sh=sheetFor('batter-p'+(team+1));
 if(sh){x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(px,py,u*3,u*.8,0,0,7);x.fill();
  const fr=swing>0?SP.frameOf(sh.def,'swing',{k:swing}):SP.frameOf(sh.def,'stance',{t,fps:3});
  const spot=drawSprite(x,sh,fr,px,py,u*11.3);if(!faceAt(x,spot,id,mood,'helmet-p'+(team+1))&&spot){const hs=spot.size,hy=spot.y+hs*.42;
   x.fillStyle=cap;x.beginPath();x.ellipse(spot.x,hy-hs*.7,hs*.43,hs*.3,0,Math.PI,0);x.fill();x.beginPath();x.ellipse(spot.x+hs*.32,hy-hs*.56,hs*.13,hs*.17,0,0,7);x.fill();}
  return;}
 x.save();x.translate(px,py);x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(0,0,u*3,u*.8,0,0,7);x.fill();
 // legs: the front foot strides toward the plate as he swings
 const st=Math.min(1,swing*2.2);x.strokeStyle=pant;x.lineCap='round';x.lineWidth=u*1.5;x.beginPath();x.moveTo(-u*.8,-u*4);x.lineTo(-u*1.9,-u*.2);x.moveTo(u*.8,-u*4);x.lineTo(u*1.5+st*u*1.1,-u*.2);x.stroke();
 x.fillStyle='#111';x.fillRect(-u*2.6,-u*.55,u*1.4,u*.55);x.fillRect(u*1+st*u*1.1,-u*.55,u*1.4,u*.55);
 // body turns a little toward the pitcher through the swing
 const turn=swing>0?Math.sin(Math.min(1,swing*1.6)*Math.PI/2):0;x.fillStyle=jer;rr(x,-u*1.8+turn*u*.4,-u*7.6,u*3.6-turn*u*.6,u*4,u);x.fill();
 if(turn<.5){x.fillStyle='#fff';x.font=`900 ${u*1.6}px ${BODY}`;x.textAlign='center';x.textBaseline='middle';x.fillText(String((R.hash(id)%40)+1),0,-u*5.8);}
 // hands and bat: cocked up behind the back shoulder; on the swing the barrel drops behind him, sweeps flat through the
 // zone toward the plate (contact at about k .5), then wraps up over the front shoulder
 let hx,hy,a,flat=1;
 if(o.bunt){hx=u*2.2;hy=-u*6;a=-.08;}
 else if(swing<=0){const w=Math.sin(t*3)*.08;hx=-u*.4;hy=-u*7.4;a=-1.95+w;}
 else if(swing<.28){const k=swing/.28;hx=-u*.4+k*u*.2;hy=-u*7.4+k*u*1.2;a=-1.95-k*1.15;}
 else if(swing<.62){const k=(swing-.28)/.34,th=Math.PI*(1-k);hx=-u*.2+k*u*2.6;hy=-u*6.2+k*u*.6;a=-th;flat=.3;}
 else{const k=(swing-.62)/.38;hx=u*2.4-k*u*1.6;hy=-u*5.6-k*u*2.2;a=-k*2.5;}
 x.strokeStyle=jer;x.lineWidth=u*1.05;x.beginPath();x.moveTo(-u*1.2,-u*7);x.lineTo(hx,hy);x.moveTo(u*1.2,-u*7);x.lineTo(hx,hy);x.stroke();
 drawBat(x,hx,hy,a,u*6.4,u,flat);
 const hc=head(id,mood),hs=u*4.2;if(hc)x.drawImage(hc,-hs/2,-u*7.4-hs*.92,hs,hs);
 // batting helmet: a shiny dome over the top of the head with the ear flap toward the pitcher
 x.fillStyle=cap;x.beginPath();x.ellipse(0,-u*7.4-hs*.7,hs*.43,hs*.3,0,Math.PI,0);x.fill();x.beginPath();x.ellipse(hs*.32,-u*7.4-hs*.56,hs*.13,hs*.17,0,0,7);x.fill();x.fillRect(-hs*.46,-u*7.4-hs*.72,hs*.4,hs*.07);
 x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.ellipse(-hs*.12,-u*7.4-hs*.86,hs*.16,hs*.07,-.3,0,7);x.fill();
 x.restore();}
function catcherUmp(x,B,team,t=0,{caught=false,call=false}={}){const h=B.H*(B.wide?.16:.12),cx=B.plate.x+B.zone.w*.15,cy=B.H+h*.05,[jer,,cap]=TEAM_COL[team]||TEAM_COL[0];
 const um=sheetFor('umpire'),ca=sheetFor('catcher-p'+(team+1));
 if(um||ca){if(um)drawSprite(x,um,SP.frameOf(um.def,call?'call':'idle',call?{t,fps:6,index:Math.min(2,Math.floor(t*6))}:{t,fps:2}),cx+h*.55,cy+h*.02,h*1.5);
  else{x.fillStyle='#1b1d24';x.beginPath();x.ellipse(cx+h*.55,cy-h*.62,h*.42,h*.62,0,0,7);x.fill();x.beginPath();x.arc(cx+h*.55,cy-h*1.28,h*.22,0,7);x.fill();}
  if(ca)drawSprite(x,ca,SP.frameOf(ca.def,caught?'catch':'idle',{t,fps:2}),cx,cy,h*1.05);
  else{x.fillStyle=jer;x.beginPath();x.ellipse(cx,cy-h*.38,h*.48,h*.42,0,0,7);x.fill();x.fillStyle=cap;x.beginPath();x.arc(cx,cy-h*.86,h*.2,0,7);x.fill();}
  return;}
 // the umpire behind, then the catcher crouched, both seen from the back
 x.fillStyle='#1b1d24';x.beginPath();x.ellipse(cx+h*.55,cy-h*.62,h*.42,h*.62,0,0,7);x.fill();x.beginPath();x.arc(cx+h*.55,cy-h*1.28,h*.22,0,7);x.fill();
 x.fillStyle=jer;x.beginPath();x.ellipse(cx,cy-h*.38,h*.48,h*.42,0,0,7);x.fill();x.fillStyle='#2a2a30';x.beginPath();x.ellipse(cx,cy-h*.42,h*.36,h*.3,0,0,7);x.fill();
 x.fillStyle=cap;x.beginPath();x.arc(cx,cy-h*.86,h*.2,0,7);x.fill();x.fillStyle='#111';x.fillRect(cx-h*.2,cy-h*.88,h*.4,h*.05);}

// ---- the field view: a camera above and behind home plate
function fieldCam(W,H,focus,span){const k=W/span;return {k,cx:W/2,cy:H*.62,fx:focus.x,fy:focus.y,tilt:.66,
 at(x,y,z=0){return {x:this.cx+(x-this.fx)*this.k,y:this.cy-(y-this.fy)*this.k*this.tilt-z*this.k*.75};}};}
function drawField(x,W,H,cam){x.fillStyle='#22301c';x.fillRect(0,0,W,H);
 // stands beyond the fence
 const P=(a,b,z)=>cam.at(a,b,z);x.fillStyle='#3a4a6a';x.beginPath();for(let i=0;i<=40;i++){const th=(-45+i*90/40)*R.D2R,r=R.fenceAt(th)+80,p=P(Math.sin(th)*r,Math.cos(th)*r);i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);}for(let i=40;i>=0;i--){const th=(-45+i*90/40)*R.D2R,r=R.fenceAt(th),p=P(Math.sin(th)*r,Math.cos(th)*r);x.lineTo(p.x,p.y);}x.closePath();x.fill();
 // fair territory grass + foul grass
 x.fillStyle='#2f7d36';x.fillRect(0,0,W,H);x.fillStyle='#3f9a46';x.beginPath();const h0=P(0,0);x.moveTo(h0.x,h0.y);for(let i=0;i<=40;i++){const th=(-45+i*90/40)*R.D2R,r=R.fenceAt(th),p=P(Math.sin(th)*r,Math.cos(th)*r);x.lineTo(p.x,p.y);}x.closePath();x.fill();
 // warning track and wall
 x.strokeStyle='#a87a48';x.lineWidth=Math.max(2,12*cam.k);x.beginPath();for(let i=0;i<=40;i++){const th=(-45+i*90/40)*R.D2R,r=R.fenceAt(th)-7,p=P(Math.sin(th)*r,Math.cos(th)*r);i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);}x.stroke();
 x.fillStyle='#1f6b3a';for(let i=0;i<40;i++){const a0=(-45+i*90/40)*R.D2R,a1=(-45+(i+1)*90/40)*R.D2R,r0=R.fenceAt(a0),r1=R.fenceAt(a1),p0=P(Math.sin(a0)*r0,Math.cos(a0)*r0),p1=P(Math.sin(a1)*r1,Math.cos(a1)*r1),q1=P(Math.sin(a1)*r1,Math.cos(a1)*r1,R.FENCE_H),q0=P(Math.sin(a0)*r0,Math.cos(a0)*r0,R.FENCE_H);x.beginPath();x.moveTo(p0.x,p0.y);x.lineTo(p1.x,p1.y);x.lineTo(q1.x,q1.y);x.lineTo(q0.x,q0.y);x.closePath();x.fill();}
 // infield dirt: the arc behind the bases and the base paths
 x.fillStyle='#b8834e';x.beginPath();for(let i=0;i<=30;i++){const th=(-45+i*3)*R.D2R,r=150,p=P(Math.sin(th)*r,Math.cos(th)*r);i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);}const pp=P(0,-12);x.lineTo(pp.x,pp.y);x.closePath();x.fill();
 x.fillStyle='#3f9a46';x.beginPath();for(const b of [[0,8],[56,63.6],[0,119],[-56,63.6]]){const p=P(b[0],b[1]);x.lineTo(p.x,p.y);}x.closePath();x.fill();
 const m=P(R.MOUND.x,R.MOUND.y);x.fillStyle='#c2905a';x.beginPath();x.ellipse(m.x,m.y,9*cam.k,9*cam.k*cam.tilt,0,0,7);x.fill();
 // foul lines
 x.strokeStyle='#fff';x.lineWidth=Math.max(1.5,cam.k*1.2);for(const s of [-1,1]){const a=P(0,0),b=P(s*Math.sin(45*R.D2R)*330,Math.cos(45*R.D2R)*330);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();}
 R.BASES.forEach((b,i)=>{const p=P(b.x,b.y),s=Math.max(4,3*cam.k);x.fillStyle='#fff';x.save();x.translate(p.x,p.y);x.scale(1,cam.tilt);x.rotate(Math.PI/4);x.fillRect(-s/2,-s/2,s,s);x.restore();});}
function ballShadow(x,cam,b){const s=cam.at(b.x,b.y,0),p=cam.at(b.x,b.y,b.z),r=Math.max(2.5,cam.k*1.1);x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(s.x,s.y,r*1.3,r*.6,0,0,7);x.fill();ball(x,p.x,p.y,r);}
// scoreboard: teams and runs, inning, count, outs, bases
function scoreboard(x,X,Y,s,{names,runs,inning,top,balls,strikes,outs,bases,innings}){const w=Math.max(150,s*9),h=s*3.4;x.save();x.fillStyle='rgba(10,14,30,.88)';rr(x,X,Y,w,h,8);x.fill();x.strokeStyle='#f5c518';x.lineWidth=1.5;x.stroke();
 x.font=`400 ${s*.95}px ${FONT}`;x.textBaseline='middle';[0,1].forEach(i=>{x.fillStyle=TEAM_COL[i][0];x.fillRect(X+6,Y+s*(.45+i*1.25),6,s);x.fillStyle='#fff';x.textAlign='left';x.fillText(names[i],X+18,Y+s*(.95+i*1.25));x.textAlign='right';x.fillText(String(runs[i]),X+w*.56,Y+s*(.95+i*1.25));});
 x.textAlign='center';x.fillStyle='#f5c518';x.fillText(`${top?'▲':'▼'}${inning}${innings?'/'+innings:''}`,X+w*.68,Y+s*.95);
 x.font=`800 ${s*.62}px ${BODY}`;x.fillStyle='#fff';x.fillText(`B${balls} S${strikes}`,X+w*.68,Y+s*2.2);
 for(let i=0;i<2;i++){x.fillStyle=i<outs?'#ff5a4a':'rgba(255,255,255,.25)';x.beginPath();x.arc(X+w*.62+i*s*.8,Y+s*2.95,s*.26,0,7);x.fill();}
 const bx=X+w*.88,by=Y+s*1.85,d=s*.55;[[d,0],[0,-d],[-d,0]].forEach(([dx,dy],i)=>{x.fillStyle=bases[i]?'#f5c518':'rgba(255,255,255,.25)';x.save();x.translate(bx+dx,by+dy);x.rotate(Math.PI/4);x.fillRect(-d*.42,-d*.42,d*.84,d*.84);x.restore();});
 x.restore();return {w,h};}
function button(x,b){const {X,Y,w,h,label,sub,tone='dark',on=true,hot=false}=b;x.save();x.globalAlpha=on?1:.4;const c=tone==='gold'?['#ffe07a','#d79a1c']:tone==='green'?['#55d07a','#1f8a3e']:tone==='red'?['#ff7a6a','#b8261a']:tone==='blue'?['#7ab8ff','#1d4fbf']:['#3a3440','#1c1820'];
 const g=x.createLinearGradient(0,Y,0,Y+h);g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=6;x.shadowOffsetY=2;rr(x,X,Y,w,h,Math.min(h*.32,12));x.fillStyle=g;x.fill();x.shadowColor='transparent';x.lineWidth=hot?3:1.4;x.strokeStyle=hot?'#fff':'rgba(255,255,255,.35)';x.stroke();
 x.fillStyle=tone==='gold'?'#2a1800':'#fff';x.textAlign='center';x.textBaseline='middle';const fs=Math.min(h*.42,w*.24,22);x.font=`400 ${fs}px ${FONT}`;x.fillText(label,X+w/2,Y+h/2-(sub?fs*.3:0));if(sub){x.font=`800 ${Math.max(8,fs*.45)}px ${BODY}`;x.fillText(sub,X+w/2,Y+h/2+fs*.5);}x.restore();return b;}
function ticker(x,W,Y,text,size,id){if(!text)return;x.save();x.font=`800 ${size}px ${BODY}`;const tw=Math.min(W-20,x.measureText(text).width+size*3.6),X=(W-tw)/2;x.fillStyle='rgba(10,14,30,.85)';rr(x,X,Y,tw,size*2,size);x.fill();x.strokeStyle='#f5c518';x.lineWidth=1.2;x.stroke();
 const hc=head(id);if(hc)x.drawImage(hc,X+2,Y-size*.4,size*2.6,size*2.6);x.fillStyle='#fff';x.textAlign='left';x.textBaseline='middle';x.fillText(text,X+size*2.9,Y+size,tw-size*3.2);x.restore();}
function bigText(x,W,Y,text,color,size){x.save();x.font=`400 ${size}px ${FONT}`;const tw=x.measureText(text).width;if(tw>W*.94)size*=W*.94/tw;x.font=`400 ${size}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=size*.14;x.strokeStyle='#120a04';x.strokeText(text,W/2,Y);x.fillStyle=color;x.fillText(text,W/2,Y);x.restore();}
Object.assign(exports,{FONT,BODY,TEAM_COL,rr,head,ball,logo,drawSprite,batLayout,zoneXY,zoneUV,battingBG,player,batter,catcherUmp,fieldCam,drawField,ballShadow,scoreboard,button,ticker,bigText});
