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

// ---- the batting view layout: the Ken Griffey camera, high behind the plate looking out at the pitcher.
// The STAGE is that game's picture (1.376 : 1) in u,v 0..1: mound at the top, the infield grass, the dirt round home with
// both batter's boxes, the plate at the bottom. It is sized so the batter's box and the far box both fit the width (tall
// phones), or the height (wide screens); a tall phone sees more field above it (the infield dirt, the outfield, the wall
// and the stands), a wide one more foul ground at the sides.
const ASPECT=1.376;
function batLayout(W,H){const wide=W>H*1.15;let Sw=W/.8,Sh=Sw/ASPECT;if(Sh>H){Sh=H;Sw=Sh*ASPECT;}
 const S={x0:(W-Sw)/2,y0:H-Sh,w:Sw,h:Sh},at=(u,v)=>({x:S.x0+u*Sw,y:S.y0+v*Sh});
 const T=.43*Sh,plate=at(.5,.84),feetY=S.y0+.85*Sh,zw=.092*Sw,zh=.3*T,zone={x:plate.x,y:feetY-.56*T,w:zw,h:zh};
 // where the outfield wall stands (tall phones only show it): the stands/stadium picture go above it
 const horizon=at(0,-.46).y;
 return {W,H,wide,S,at,T,plate,feetY,zone,mound:at(.5,.2),horizon,pw:.046*Sw};}
const zoneXY=(B,u,v)=>({x:B.zone.x+u*B.zone.w/2,y:B.zone.y-v*B.zone.h/2});
const zoneUV=(B,px,py)=>({u:(px-B.zone.x)/(B.zone.w/2),v:-(py-B.zone.y)/(B.zone.h/2)});
// the field colours of the 16-bit game: rich green infield grass, orange clay, white chalk
const GRASS=['#4f9426','#468a20'],CLAY=['#c97f35','#bb722c'],CHALK='#f4f1e8';
const bgCache=new Map();
function battingBG(B,team){const sPic=pic('stadium'),wPic=pic('wall'),key=B.W+'x'+B.H+(sPic?'s':'')+(wPic?'w':'');let c=bgCache.get(key);if(c)return c;c=document.createElement('canvas');const k=Math.min(2,devicePixelRatio||1);c.width=Math.ceil(B.W*k);c.height=Math.ceil(B.H*k);const x=c.getContext('2d');x.scale(k,k);
 const {W,H,S}=B,P=(u,v)=>[S.x0+u*S.w,S.y0+v*S.h],U0=-S.x0/S.w-.05,U1=(W-S.x0)/S.w+.05,V0=-S.y0/S.h-.05;
 const poly=(pts,fill)=>{x.beginPath();pts.forEach((p,i)=>{const q=P(p[0],p[1]);i?x.lineTo(...q):x.moveTo(...q);});x.closePath();x.fillStyle=fill;x.fill();};
 const curve=(f,v1,fill)=>{x.beginPath();const n=40;for(let i=0;i<=n;i++){const u=U0+(U1-U0)*i/n;const q=P(u,f(u));i?x.lineTo(...q):x.moveTo(...q);}x.lineTo(...P(U1,v1));x.lineTo(...P(U0,v1));x.closePath();x.fillStyle=fill;x.fill();};
 // 1. clay everywhere, 2. grass: the infield (round at the bottom, toward home) and everything beyond it
 x.fillStyle=CLAY[0];x.fillRect(0,0,W,H);
 x.fillStyle=GRASS[0];x.beginPath();x.moveTo(...P(U0,V0));x.lineTo(...P(U1,V0));x.lineTo(...P(U1,.2));
 for(let i=0;i<=48;i++){const a=i/48*Math.PI,q=P(.5+.76*Math.cos(a),.2+.41*Math.sin(a));x.lineTo(...q);}x.lineTo(...P(U0,.2));x.closePath();x.fill();
 // mowing bands across the grass, wider toward the camera
 x.save();x.clip();for(let i=0;i<14;i++){const v0=-.9+i*i*.0105,v1=-.9+(i+.5)*(i+.5)*.0105;if(i%2)continue;poly([[U0,v0],[U1,v0],[U1,v1],[U0,v1]],GRASS[1]);}x.restore();
 // 3. the infield dirt arc beyond the mound (only its ends show on a wide screen, as in the game) and second base
 const inner=u=>.24*(u-.47)**2-.007,outer=u=>.3*(u-.47)**2-.16;
 x.beginPath();for(let i=0;i<=40;i++){const u=U0+(U1-U0)*i/40,q=P(u,inner(u));i?x.lineTo(...q):x.moveTo(...q);}for(let i=40;i>=0;i--){const u=U0+(U1-U0)*i/40;x.lineTo(...P(u,outer(u)));}x.closePath();x.fillStyle=CLAY[1];x.fill();
 {const [bx,by]=P(.47,-.095),s=S.w*.018;x.save();x.translate(bx,by);x.scale(1,.42);x.rotate(Math.PI/4);x.fillStyle=CHALK;x.fillRect(-s/2,-s/2,s,s);x.restore();}
 // 4. the outfield: warning track, the wall (with ads), the stands or the owner's stadium picture (tall phones)
 const wallY=P(0,-.46)[1];
 if(wallY>0){const trk=P(0,-.43)[1],wy0=wallY-S.h*.07;x.fillStyle=CLAY[1];x.fillRect(0,wallY,W,trk-wallY);
  let g=x.createLinearGradient(0,0,0,wy0);g.addColorStop(0,'#5fa8ff');g.addColorStop(1,'#bfe0ff');x.fillStyle=g;x.fillRect(0,0,W,wy0);
  x.fillStyle='#3a4a6a';x.fillRect(0,wy0*.38,W,wy0*.62);let seed=5;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let row=0;row<14;row++){const y=wy0*.4+row*wy0*.042;for(let i=0;i<W/5;i++){x.fillStyle=['#e8d0b0','#c89070','#704828','#f0e0c0','#d04040','#4060c0','#f0f0f0'][Math.floor(rnd()*7)];x.fillRect(i*5+rnd()*2,y+rnd()*2,3,3);}}
  const cover=(img,X,Y,w,h)=>{const k=Math.max(w/img.width,h/img.height),iw=w/k,ih=h/k;x.drawImage(img,(img.width-iw)/2,(img.height-ih)/2,iw,ih,X,Y,w,h);};
  if(sPic)cover(sPic,0,0,W,wy0);
  g=x.createLinearGradient(0,wy0,0,wallY);g.addColorStop(0,'#1f6b3a');g.addColorStop(1,'#154d2a');x.fillStyle=g;x.fillRect(0,wy0,W,wallY-wy0);
  if(wPic)x.drawImage(wPic,0,wy0,W,wallY-wy0);else{const ads=['INDIANS','HARRY’S','WILD THING','JOBU RUM','DORN HOMES'];x.font=`400 ${Math.max(9,(wallY-wy0)*.5)}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';ads.forEach((a,i)=>{x.fillStyle=i%2?'#f5c518':'#ffffff';x.fillText(a,W*(i+.5)/ads.length,(wy0+wallY)/2);});}}
 // 5. the mound and the rubber
 {const [mx,my]=P(.5,.2);x.fillStyle=CLAY[0];x.beginPath();x.ellipse(mx,my,S.w*.175,S.h*.057,0,0,7);x.fill();x.fillStyle='rgba(255,230,190,.16)';x.beginPath();x.ellipse(mx,my-S.h*.008,S.w*.12,S.h*.03,0,0,7);x.fill();
  x.fillStyle=CHALK;x.fillRect(mx-S.w*.022,my-S.h*.016,S.w*.044,S.h*.009);}
 // 6. the foul-ground grass outside the lines by the boxes, and the foul lines (they stop at the batter's boxes)
 for(const s of [-1,1]){const f=u=>s<0?u:1-u;poly([[f(.13),.655],[f(-1.2),-.07],[f(-1.2),1.7],[f(0),.76]],GRASS[1]);}
 x.strokeStyle=CHALK;x.lineWidth=Math.max(2,S.w*.0075);x.lineCap='butt';for(const s of [-1,1]){const f=u=>s<0?u:1-u;x.beginPath();x.moveTo(...P(f(.233),.735));x.lineTo(...P(f(-1.2),.735-1.433*.73));x.stroke();}
 // 7. clay texture: speckles, then the two batter's boxes and home plate
 {let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647,top=Math.max(0,wallY),n=Math.round(W*(H-top)/90),d=Math.max(1.5,S.w/300);for(let i=0;i<n;i++){x.fillStyle=rnd()<.5?'rgba(0,0,0,.07)':'rgba(255,240,200,.07)';x.fillRect(rnd()*W,top+rnd()*(H-top),d,d);}}
 x.lineWidth=Math.max(2,S.w*.008);x.lineJoin='miter';
 for(const b of [[[.233,.735],[.40,.735],[.39,1.02],[.155,1.02]],[[.60,.735],[.767,.735],[.845,1.02],[.61,1.02]]]){x.beginPath();b.forEach((p,i)=>{const q=P(p[0],p[1]);i?x.lineTo(...q):x.moveTo(...q);});x.strokeStyle=CHALK;x.stroke();}
 {const pw=B.pw,[px,py]=P(.5,.84),ph=S.h*.022;x.fillStyle='#8f8a7e';x.beginPath();x.moveTo(px-pw,py-ph*.6);x.lineTo(px+pw,py-ph*.6);x.lineTo(px+pw,py+ph*.55);x.lineTo(px,py+ph*1.35);x.lineTo(px-pw,py+ph*.55);x.closePath();x.fill();
  x.fillStyle=CHALK;x.beginPath();x.moveTo(px-pw,py-ph);x.lineTo(px+pw,py-ph);x.lineTo(px+pw,py+ph*.15);x.lineTo(px,py+ph*.9);x.lineTo(px-pw,py+ph*.15);x.closePath();x.fill();}
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
// the batter, from behind the catcher: a right-handed batter in the LEFT box facing the plate. swing k 0..1 (0 = waiting);
// o.bx/o.by = where he stands in the batter's box (-1..1: toward the plate / up toward the pitcher), o.bunt = squared to
// bunt. He is placed so his bat's sweet spot at contact crosses the zone exactly where the game judges it (sweetU).
function batter(x,B,team,id,swing,mood,t=0,o={}){const bx=o.bx||0,by=o.by||0,T=B.T,[jer,pant,cap]=TEAM_COL[team]||TEAM_COL[0];
 const zx=B.zone.x+(-.2+1.05*bx)*B.zone.w/2,lift=by*B.S.h*.02,sh=sheetFor('batter-p'+(team+1));
 if(sh){const d=sh.def,sw=d.sweet||[d.foot[0]+48,d.foot[1]-84],s=T/d.tall,px=zx-(sw[0]-d.foot[0])*s,py=B.zone.y+(d.foot[1]-sw[1])*s-lift;
  x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(px,py,T*.2,T*.045,0,0,7);x.fill();
  const fr=swing>0?SP.frameOf(d,'swing',{k:swing}):SP.frameOf(d,'stance',{t,fps:3});
  // the face sits on his shoulders BEHIND the bat: face and helmet first, the (headless) sheet over them
  const spot=d.head?{x:px+(d.head[0]-d.foot[0])*s,y:py+(d.head[1]-d.foot[1])*s,size:d.headSize*s}:null;
  if(spot&&!faceAt(x,spot,id,mood,'helmet-p'+(team+1)))helmetDome(x,spot,cap);
  drawSprite(x,sh,fr,px,py,T);return;}
 const h=T/1.15,u=h/10;x.save();x.translate(zx-u*6.2,B.zone.y+u*5.9-lift);x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(0,0,u*3,u*.8,0,0,7);x.fill();
 // legs: the front foot strides toward the plate as he swings
 const st=Math.min(1,swing*2.2);x.strokeStyle=pant;x.lineCap='round';x.lineWidth=u*1.5;x.beginPath();x.moveTo(-u*.8,-u*4);x.lineTo(-u*1.9,-u*.2);x.moveTo(u*.8,-u*4);x.lineTo(u*1.5+st*u*1.1,-u*.2);x.stroke();
 x.fillStyle='#111';x.fillRect(-u*2.6,-u*.55,u*1.4,u*.55);x.fillRect(u*1+st*u*1.1,-u*.55,u*1.4,u*.55);
 const turn=swing>0?Math.sin(Math.min(1,swing*1.6)*Math.PI/2):0;x.fillStyle=jer;rr(x,-u*1.8+turn*u*.4,-u*7.6,u*3.6-turn*u*.6,u*4,u);x.fill();
 if(turn<.5){x.fillStyle='#fff';x.font=`900 ${u*1.6}px ${BODY}`;x.textAlign='center';x.textBaseline='middle';x.fillText(String((R.hash(id)%40)+1),0,-u*5.8);}
 const hc=head(id,mood),hs=u*4.2;if(hc)x.drawImage(hc,-hs/2,-u*7.4-hs*.92,hs,hs);
 x.fillStyle=cap;x.beginPath();x.ellipse(0,-u*7.4-hs*.7,hs*.43,hs*.3,0,Math.PI,0);x.fill();x.beginPath();x.ellipse(hs*.32,-u*7.4-hs*.56,hs*.13,hs*.17,0,0,7);x.fill();
 // hands and bat (drawn after the head: the bat passes in front of it), cocked up over the back shoulder; on the swing the
 // barrel drops, sweeps flat through the zone toward the plate (contact at about k .45), then wraps up over the front shoulder
 let hx,hy,a,flat=1;
 if(o.bunt){hx=u*2.2;hy=-u*6;a=-.08;}
 else if(swing<=0){const w=Math.sin(t*3)*.08;hx=-u*1.2;hy=-u*6.8;a=-2.1+w;}
 else if(swing<.28){const k=swing/.28;hx=-u*1.2+k*u*1;hy=-u*6.8+k*u*.8;a=-2.1-k*1;}
 else if(swing<.62){const k=(swing-.28)/.34,th=Math.PI*(1-k);hx=-u*.2+k*u*2.6;hy=-u*6+k*u*.4;a=-th;flat=.3;}
 else{const k=(swing-.62)/.38;hx=u*2.4-k*u*1.6;hy=-u*5.6-k*u*2.2;a=-k*2.5;}
 x.strokeStyle=jer;x.lineWidth=u*1.05;x.beginPath();x.moveTo(-u*1.2,-u*7);x.lineTo(hx,hy);x.moveTo(u*1.2,-u*7);x.lineTo(hx,hy);x.stroke();
 drawBat(x,hx,hy,a,u*7.4,u,flat);x.restore();}
// the drawn batting helmet over a face spot (when there is no helmet picture); facing -1 = ear flap on the left
function helmetDome(x,spot,cap,facing=1){const hs=spot.size,hy=spot.y+hs*.42;x.fillStyle=cap;x.beginPath();x.ellipse(spot.x,hy-hs*.7,hs*.43,hs*.3,0,Math.PI,0);x.fill();
 x.beginPath();x.ellipse(spot.x+hs*.32*facing,hy-hs*.56,hs*.13,hs*.17,0,0,7);x.fill();x.fillStyle='rgba(255,255,255,.3)';x.beginPath();x.ellipse(spot.x-hs*.12*facing,hy-hs*.86,hs*.16,hs*.07,-.3*facing,0,7);x.fill();}
// a batter standing in his stance, for the title/innings card (the batter sheet when it is in, else the drawn player)
function standee(x,cx,fy,T,team,id,t=0,facing=1){const sh=sheetFor('batter-p'+(team+1));if(!sh)return player(x,cx,fy,T/1.09,team,id,{t,facing});
 const d=sh.def,s=T/d.tall,fr=SP.frameOf(d,'stance',{t,fps:3}),spot={x:cx+(d.head[0]-d.foot[0])*s*facing,y:fy+(d.head[1]-d.foot[1])*s,size:d.headSize*s};
 x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(cx,fy,T*.22,T*.05,0,0,7);x.fill();
 if(!faceAt(x,spot,id,'normal','helmet-p'+(team+1)))helmetDome(x,spot,(TEAM_COL[team]||TEAM_COL[0])[2],facing);drawSprite(x,sh,fr,cx,fy,T,facing);}
// the catcher's mitt seen from behind the catcher (the camera is his view, so he is not drawn): it comes up to where the
// pitch is going and the ball disappears into it. `shut` 0..1 squeezes it on the catch.
function mitt(x,X,Y,s,shut=0){x.save();x.translate(X,Y);x.scale(1+shut*.06,1-shut*.1);x.lineWidth=Math.max(1,s*.06);x.strokeStyle='#2a1406';
 x.fillStyle='#5e3213';x.beginPath();x.ellipse(-s*.52,s*.12,s*.2,s*.34,-.45,0,7);x.fill();x.stroke();
 x.fillStyle='#74401a';x.beginPath();x.ellipse(0,0,s*.56,s*.5,0,0,7);x.fill();x.stroke();
 x.fillStyle='#8c5424';x.beginPath();x.ellipse(-s*.06,-s*.08,s*.34,s*.27,0,0,7);x.fill();
 x.strokeStyle='#e8d6a8';x.lineWidth=Math.max(1,s*.045);x.setLineDash([s*.09,s*.08]);x.beginPath();x.ellipse(0,0,s*.47,s*.41,0,Math.PI*1.05,Math.PI*1.95);x.stroke();x.setLineDash([]);
 x.fillStyle='#3a1c08';rr(x,-s*.26,s*.4,s*.52,s*.2,s*.05);x.fill();x.restore();}
function catcherUmp(x,B,team,t=0,{caught=false}={}){}
// ---- the HUD as the 16-bit game lays it out: teams and runs, the inning and the pitcher top left; balls/strikes/outs and
// the batter bottom left; the bases bottom right. Chunky text with a hard shadow, white labels, gold numbers.
const GOLD='#f8d878',INK='#151008';
function hudText(x,text,X,Y,size,color='#fff',align='left'){x.font=`900 ${size}px ${BODY}`;x.textAlign=align;x.textBaseline='alphabetic';x.fillStyle=INK;x.fillText(text,X+size*.09,Y+size*.09);x.fillStyle=color;x.fillText(text,X,Y);return x.measureText(text).width;}
function hudTop(x,X,Y,z,o){const lh=z*1.12;x.save();
 o.teams.forEach((t,i)=>{const yy=Y+lh*(i+1);if(o.batting===i)hudText(x,'▸',X-z*.75,yy,z,GOLD);hudText(x,t.abbr,X,yy,z);hudText(x,String(t.runs),X+z*6.4,yy,z,GOLD,'right');});
 let yy=Y+lh*3.25,w=hudText(x,o.top?'TOP':'BOT',X,yy,z);w+=hudText(x,' of the ',X+w,yy,Math.max(9,z*.66));hudText(x,ordinal(o.inning),X+w+z*.15,yy,z,GOLD);
 if(o.pitcher){yy+=lh*1.25;const w2=hudText(x,'P ',X,yy,z);hudText(x,o.pitcher.name,X+w2,yy,z,GOLD);yy+=lh*.95;hudText(x,o.pitcher.line,X+w2,yy,z*.86,GOLD);}
 x.restore();return yy;}
function ordinal(n){const s=n%100>10&&n%100<14?'TH':['TH','ST','ND','RD'][n%10]||'TH';return n+s;}
function hudCount(x,X,Y,z,{b,s,o}){x.save();const r=z*.36;[['B',b,3,'#f0a838'],['S',s,2,'#48d048'],['O',o,2,'#5070f0']].forEach(([l,n,m,c],i)=>{const yy=Y+i*z*1.02;hudText(x,l,X,yy,z);
 for(let k=0;k<m;k++){const cx=X+z*1.15+k*r*2.5,cy=yy-z*.34;x.beginPath();x.arc(cx,cy,r,0,7);x.fillStyle=k<n?c:'rgba(10,16,10,.65)';x.fill();x.lineWidth=Math.max(1,z*.08);x.strokeStyle=INK;x.stroke();}});x.restore();}
function hudBatter(x,X,Y,z,bt){if(!bt)return;x.save();const lh=z*1.02;hudText(x,`${bt.spot}. ${bt.pos}`,X,Y,z);hudText(x,'#'+bt.num,X+z*5.2,Y,z,GOLD);hudText(x,bt.name,X,Y+lh,z,GOLD);hudText(x,bt.line,X,Y+lh*2,z*.86,GOLD);x.restore();}
function hudBases(x,cx,cy,s,bases){x.save();const b=[[0,s],[s,0],[0,-s],[-s,0]];x.strokeStyle=CHALK;x.lineWidth=Math.max(1.5,s*.07);x.fillStyle='rgba(0,0,0,.18)';x.beginPath();b.forEach((p,i)=>i?x.lineTo(cx+p[0],cy+p[1]):x.moveTo(cx+p[0],cy+p[1]));x.closePath();x.fill();x.stroke();
 x.beginPath();x.arc(cx,cy+s*.9,s*1.25,-Math.PI*.75,-Math.PI*.25);x.stroke();
 [1,2,3].forEach(i=>{const p=b[i],q=s*.2;x.save();x.translate(cx+p[0],cy+p[1]);x.rotate(Math.PI/4);x.fillStyle=bases[i-1]?'#ffd23f':CHALK;x.fillRect(-q,-q,q*2,q*2);x.strokeStyle=INK;x.lineWidth=Math.max(1,s*.05);x.strokeRect(-q,-q,q*2,q*2);x.restore();});
 x.fillStyle=CHALK;x.beginPath();const q=s*.16;x.moveTo(cx-q,cy+s-q);x.lineTo(cx+q,cy+s-q);x.lineTo(cx+q,cy+s);x.lineTo(cx,cy+s+q);x.lineTo(cx-q,cy+s);x.closePath();x.fill();x.restore();}
// ---- the field view: a camera above and behind home plate
function fieldCam(W,H,focus,span){const k=W/span;return {k,cx:W/2,cy:H*.62,fx:focus.x,fy:focus.y,tilt:.66,
 at(x,y,z=0){return {x:this.cx+(x-this.fx)*this.k,y:this.cy-(y-this.fy)*this.k*this.tilt-z*this.k*.75};}};}
function drawField(x,W,H,cam){x.fillStyle='#22301c';x.fillRect(0,0,W,H);
 // stands beyond the fence
 const P=(a,b,z)=>cam.at(a,b,z);x.fillStyle='#3a4a6a';x.beginPath();for(let i=0;i<=40;i++){const th=(-45+i*90/40)*R.D2R,r=R.fenceAt(th)+80,p=P(Math.sin(th)*r,Math.cos(th)*r);i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);}for(let i=40;i>=0;i--){const th=(-45+i*90/40)*R.D2R,r=R.fenceAt(th),p=P(Math.sin(th)*r,Math.cos(th)*r);x.lineTo(p.x,p.y);}x.closePath();x.fill();
 // fair territory grass + foul grass
 x.fillStyle=GRASS[1];x.fillRect(0,0,W,H);x.fillStyle=GRASS[0];x.beginPath();const h0=P(0,0);x.moveTo(h0.x,h0.y);for(let i=0;i<=40;i++){const th=(-45+i*90/40)*R.D2R,r=R.fenceAt(th),p=P(Math.sin(th)*r,Math.cos(th)*r);x.lineTo(p.x,p.y);}x.closePath();x.fill();
 // warning track and wall
 x.strokeStyle=CLAY[1];x.lineWidth=Math.max(2,12*cam.k);x.beginPath();for(let i=0;i<=40;i++){const th=(-45+i*90/40)*R.D2R,r=R.fenceAt(th)-7,p=P(Math.sin(th)*r,Math.cos(th)*r);i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);}x.stroke();
 x.fillStyle='#1f6b3a';for(let i=0;i<40;i++){const a0=(-45+i*90/40)*R.D2R,a1=(-45+(i+1)*90/40)*R.D2R,r0=R.fenceAt(a0),r1=R.fenceAt(a1),p0=P(Math.sin(a0)*r0,Math.cos(a0)*r0),p1=P(Math.sin(a1)*r1,Math.cos(a1)*r1),q1=P(Math.sin(a1)*r1,Math.cos(a1)*r1,R.FENCE_H),q0=P(Math.sin(a0)*r0,Math.cos(a0)*r0,R.FENCE_H);x.beginPath();x.moveTo(p0.x,p0.y);x.lineTo(p1.x,p1.y);x.lineTo(q1.x,q1.y);x.lineTo(q0.x,q0.y);x.closePath();x.fill();}
 // infield dirt: the arc behind the bases and the base paths
 x.fillStyle=CLAY[0];x.beginPath();for(let i=0;i<=30;i++){const th=(-45+i*3)*R.D2R,r=150,p=P(Math.sin(th)*r,Math.cos(th)*r);i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y);}const pp=P(0,-12);x.lineTo(pp.x,pp.y);x.closePath();x.fill();
 x.fillStyle=GRASS[0];x.beginPath();for(const b of [[0,8],[56,63.6],[0,119],[-56,63.6]]){const p=P(b[0],b[1]);x.lineTo(p.x,p.y);}x.closePath();x.fill();
 const m=P(R.MOUND.x,R.MOUND.y);x.fillStyle=CLAY[1];x.beginPath();x.ellipse(m.x,m.y,9*cam.k,9*cam.k*cam.tilt,0,0,7);x.fill();
 // foul lines
 x.strokeStyle=CHALK;x.lineWidth=Math.max(1.5,cam.k*1.2);for(const s of [-1,1]){const a=P(0,0),b=P(s*Math.sin(45*R.D2R)*330,Math.cos(45*R.D2R)*330);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();}
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
Object.assign(exports,{FONT,BODY,TEAM_COL,GRASS,CLAY,CHALK,GOLD,rr,head,ball,logo,drawSprite,mitt,standee,hudText,hudTop,hudCount,hudBatter,hudBases,ordinal,batLayout,zoneXY,zoneUV,battingBG,player,batter,catcherUmp,fieldCam,drawField,ballShadow,scoreboard,button,ticker,bigText});
