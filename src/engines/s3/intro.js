// Seanic the Hedgehog: the title screen and the 1-player character select, in the style of the Mega Drive games: the logo
// bursts in out of a white flash with the hedgehog (player 1's character) rising up behind it and the fox (player 2's)
// popping up beside him, a blinking TAP TO START; then a Data Select style screen: a slanted header, a chunky TV monitor showing the chosen runner
// (wearing the player's face), arrows either side, the name plate and what that runner can do. The pictures listed in
// sonic3Sprites.js (title-bg, title-hero, title-fox, select-bg, select-monitor, select-hog, select-fox; brief in
// docs/sonic3-sprites/TITLE-SELECT-BRIEF.md) replace the drawn stand-ins as they arrive. Pure drawing; sonic3.js owns the
// flow, the music and the input.
const SP=require("src/data/sonic3Sprites.js");
const R=require("src/engines/s3/render.js");
const P=require("src/engines/s3/physics.js");
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const FONT='italic 900 %spx "Arial Black",Impact,system-ui,sans-serif';
const CHARS=[{body:'hog',name:'SEANIC',pic:'select-hog',does:'SPIN DASH · INSTA-SHIELD · TOP SPEED'},
 {body:'fox',name:'TAILS',pic:'select-fox',does:'FLIES (TAP JUMP AGAIN, HOLD TO CLIMB) · SPIN DASH'}];
// the logo: the kit slot if it's in, else the Arcade logo the build already ships
const keyImgs=new Map();
function keyPic(key){const url=USER[key];if(!url||typeof Image==='undefined')return null;let e=keyImgs.get(key);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=url;keyImgs.set(key,e);}return e.ok?e.img:null;}
const logoPic=()=>SP.picture('logo')||keyPic('keyart:sonic-logo');
const ease=k=>1-Math.pow(1-Math.max(0,Math.min(1,k)),3);
const back=k=>{k=Math.max(0,Math.min(1,k));const c=1.9;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
function text(x,str,cx,cy,sz,fill,align='center',stroke='#08103a'){x.font=FONT.replace('%s',Math.round(sz));x.textAlign=align;x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(3,sz*.2);x.strokeStyle=stroke;x.strokeText(str,cx,cy);x.fillStyle=fill;x.fillText(str,cx,cy);}
// a picture from the kit with the player's face on its head spot; h = drawn height; (cx,by) = its anchor point
function picWithFace(x,name,cx,by,h,i,head,mood){const img=SP.picture(name),d=SP.PICTURES[name];if(!img||!d)return false;const s=h/d.size[1],w=d.size[0]*s;
 const [ax,ay]=d.anchor;x.drawImage(img,cx-ax*s,by-ay*s,w,h);if(d.head){const [hx,hy,hd]=d.head;head(x,i,cx+(hx-ax)*s,by+(hy-ay)*s,hd*s,mood);}return true;}
// a game runner (the real sprite sheets or their stand-in) drawn big: feet at (fx,fy), sc = screen px per world px
const dummies={};
function runner(x,body,i,fx,fy,sc,t,head,opt={}){const p=dummies[body+(opt.fly?'f':'')]||(dummies[body+(opt.fly?'f':'')]=P.makeRunner(0,-19));
 Object.assign(p,{body,facing:opt.facing||1,gsp:opt.gsp||0,xsp:opt.gsp||0,ground:!opt.fly,fly:opt.fly?100:0,ysp:0,canFly:body==='fox',dead:0,lives:3});
 x.save();x.translate(fx,fy);x.scale(sc,sc);x.imageSmoothingEnabled=false;R.drawRunner(x,p,i,t,head);x.restore();}

// ---------------- the title screen. t = seconds since it opened
const backdrop=new R.Backdrop();
function scene(x,W,H,t,u){const bg=SP.picture('title-bg');
 if(bg){const s=Math.max(W/bg.width,H/bg.height);x.drawImage(bg,(W-bg.width*s)/2,(H-bg.height*s)/2,bg.width*s,bg.height*s);return;}
 const k=Math.max(u,H/400),vh=H/k;backdrop.draw(x,{W,H,k,vh,x:t*48,y:-vh*.18},t,0);}
function drawTitle(x,W,H,t,{head,i=0,foxI=1,mode='1 PLAYER'}){const u=Math.min(W/320,H/224);x.save();
 scene(x,W,H,t,u);
 // a soft vignette so the logo pops
 const g=x.createRadialGradient(W/2,H*.45,Math.min(W,H)*.2,W/2,H*.45,Math.max(W,H)*.75);g.addColorStop(0,'rgba(0,0,40,0)');g.addColorStop(1,'rgba(0,0,40,.45)');x.fillStyle=g;x.fillRect(0,0,W,H);
 const logo=logoPic(),lr=logo?logo.width/logo.height:2.12,lw=Math.min(W*.88,H*1.25,H*(W>H?.4:.3)*lr),lh=logo?lw*logo.height/logo.width:lw*.47,cx=W/2,cy=H*(W>H?.54:.44);
 // the hedgehog (player 1's face) rises up behind the logo, the fox (player 2's: the other player, the CPU or the online
 // friend) pops up beside him a moment later, like the Sonic 2 title
 if(t>.75){const top=cy-lh*.5,h=lh*1.15;x.save();x.beginPath();x.rect(0,0,W,cy+lh*.1);x.clip();
  if(t>1.05&&foxI!==null){const rf=ease((t-1.05)/.5),fh=h*.86,fx=cx+lw*.2,fby=top+lh*.66+(1-rf)*fh*.9;
   if(!picWithFace(x,'title-fox',fx,fby,fh,foxI,head,'win'))runner(x,'fox',foxI,fx,fby,fh/44,t,head,{facing:-1});}
  const rise=ease((t-.75)/.55),hx=foxI!==null?cx-lw*.06:cx,by=top+lh*.62+(1-rise)*h*.9;
  if(!picWithFace(x,'title-hero',hx,by,h,i,head,'win')){const sc=h/44;runner(x,'hog',i,hx,by,sc,t,head);}x.restore();}
 // the logo zooms in with a bounce out of the flash
 const z=t<.15?0:back((t-.15)/.5),sc=t<.15?0:.15+.85*z+(1-Math.min(1,(t-.15)/.5))*1.2;
 if(logo&&sc>0){x.save();x.translate(cx,cy);x.scale(sc,sc);x.imageSmoothingEnabled=true;x.drawImage(logo,-lw/2,-lh/2,lw,lh);x.restore();}
 else if(sc>0)text(x,'SEANIC',cx,cy,lw*.18*sc,'#7b6cff');
 // sparkles on the logo
 if(t>.7)for(let k=0;k<3;k++){const ph=(t*1.3+k*.37)%1.6;if(ph<.4){const a=Math.sin(ph/.4*Math.PI),sx=cx+(((k*97+Math.floor((t*1.3+k*.37)/1.6)*53)%100)/100-.5)*lw*.8,sy=cy+(((k*61+Math.floor((t*1.3+k*.37)/1.6)*29)%100)/100-.5)*lh*.6,r=lh*.08*a;
  x.fillStyle=`rgba(255,255,255,${a})`;x.beginPath();x.moveTo(sx,sy-r);x.lineTo(sx+r*.22,sy-r*.22);x.lineTo(sx+r,sy);x.lineTo(sx+r*.22,sy+r*.22);x.lineTo(sx,sy+r);x.lineTo(sx-r*.22,sy+r*.22);x.lineTo(sx-r,sy);x.lineTo(sx-r*.22,sy-r*.22);x.fill();}}
 // TAP TO START + mode
 const sz=Math.min(W/14,H/12,40);
 if(t>1.4&&Math.floor(t*2.2)%3!==2)text(x,'TAP TO START',cx,H*(W>H?.84:.8),sz,'#ffe23a');
 if(t>1.4)text(x,mode,cx,H*(W>H?.84:.8)+sz*1.25,sz*.55,'#fff');
 text(x,'© 2026 SHAMBCONKINS',cx,H-sz*.6,sz*.36,'rgba(255,255,255,.85)','center','rgba(8,16,58,.8)');
 // white flash at the start
 if(t<.45){x.fillStyle=`rgba(255,255,255,${1-t/.45})`;x.fillRect(0,0,W,H);}
 x.restore();}

// ---------------- the character select. pick = index into CHARS, slide = -1..1 (the change animation), t = seconds
// laid out top-down: header, monitor (as big as fits, room left for the arrows), name plate, what it does, TAP line
function selectLayout(W,H){const tall=H>W*1.1,m=Math.min(W,H),hh=m*.11,hy=m*.04+hh*.2,hb=hy+hh+m*.03,g=m*.03,ph=m*.1,doesH=m*.045,tapH=m*.06;
 const reserved=g+ph+g*.5+doesH+g+tapH+g*.5,mh=Math.max(40,Math.min(H-hb-reserved,(W-m*.36)*.8,W*(tall?.72:.5)*.8)),mw=mh/.8,cx=W/2;
 const top=hb+Math.max(0,(H-hb-mh-reserved)/2)*.7,cy=top+mh/2;
 const scr={x0:cx-mw*.38,y0:cy-mh*.375,x1:cx+mw*.38,y1:cy+mh*.235},plateY=cy+mh/2+g+ph/2,doesY=plateY+ph/2+g*.5+doesH/2,tapY=doesY+doesH/2+g+tapH/2;
 return {tall,m,hh,hy,mw,mh,cx,cy,scr,ph,doesY,tapY,arrowL:[cx-mw*.5-m*.08,cy],arrowR:[cx+mw*.5+m*.08,cy],plateY};}
function drawSelect(x,W,H,t,{pick,slide=0,head,i=0}){const L=selectLayout(W,H),u=Math.min(W/320,H/224),m=Math.min(W,H);x.save();
 const bg=SP.picture('select-bg');
 if(bg){const s=Math.max(W/bg.width,H/bg.height);x.drawImage(bg,(W-bg.width*s)/2,(H-bg.height*s)/2,bg.width*s,bg.height*s);}
 else{let g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#1b2d9a');g.addColorStop(1,'#0a1150');x.fillStyle=g;x.fillRect(0,0,W,H);
  // slanted stripes drifting, like the Mega Drive menus
  x.save();x.globalAlpha=.16;x.fillStyle='#6fb4ff';const st=m*.09,off=(t*m*.06)%(st*2);x.translate(-H,0);
  for(let xx=-st*2+off;xx<W+H*2;xx+=st*2){x.beginPath();x.moveTo(xx,0);x.lineTo(xx+st,0);x.lineTo(xx+st+H*.6,H);x.lineTo(xx+H*.6,H);x.fill();}x.restore();
  // checker floor band
  const fy=L.cy+L.mh*.42;x.fillStyle='#0a1150';x.fillRect(0,fy,W,H-fy);x.globalAlpha=.25;x.fillStyle='#3a5cff';const cs=m*.06;for(let yy=fy,r=0;yy<H;yy+=cs,r++)for(let xx=((r%2)*cs-(t*m*.04)%(cs*2))-cs*2;xx<W;xx+=cs*2)x.fillRect(xx,yy,cs,cs);x.globalAlpha=1;}
 // header: a slanted red bar with the words, a yellow edge
 const hh=L.hh,hw=Math.min(W*.82,m*1.2,W-hh*.5-150),hy=L.hy;x.save();x.translate(0,hy);
 x.fillStyle='#ffe23a';x.beginPath();x.moveTo(-10,0);x.lineTo(hw+hh*.5+6,0);x.lineTo(hw+6,hh+6);x.lineTo(-10,hh+6);x.fill();
 x.fillStyle='#e8102a';x.beginPath();x.moveTo(-10,0);x.lineTo(hw+hh*.5,0);x.lineTo(hw,hh);x.lineTo(-10,hh);x.fill();x.restore();
 x.font=FONT.replace('%s',Math.round(hh*.56));const tw=x.measureText('SELECT PLAYER').width,hs=Math.min(hh*.56,hh*.56*(hw-m*.06)/tw);
 text(x,'SELECT PLAYER',m*.04,hy+hh*.52,hs,'#fff','left');
 // the monitor
 const mon=SP.picture('select-monitor'),S=L.scr;
 // screen contents first (clipped), then the frame over it
 x.save();x.beginPath();x.rect(S.x0,S.y0,S.x1-S.x0,S.y1-S.y0);x.clip();
 let g=x.createLinearGradient(0,S.y0,0,S.y1);g.addColorStop(0,'#3d8cff');g.addColorStop(.7,'#bfe6ff');g.addColorStop(.7,'#2fa83a');g.addColorStop(1,'#1d6d24');x.fillStyle=g;x.fillRect(S.x0,S.y0,S.x1-S.x0,S.y1-S.y0);
 const sw=S.x1-S.x0,sh=S.y1-S.y0,show=(k,dx)=>{const c=CHARS[k],fx=(S.x0+S.x1)/2+dx*sw,fy=S.y0+sh*.86;
  if(!picWithFace(x,c.pic,fx,fy,sh*.8,i,head,'win'))runner(x,c.body,i,fx,fy,sh*.7/44,t,head,{facing:1});};
 if(slide){const k=ease(1-Math.abs(slide)),d=Math.sign(slide);show(pick,d*(1-k));show((pick+(d>0?-1:1)+CHARS.length)%CHARS.length,-d*k);}else show(pick,0);
 x.fillStyle='rgba(0,0,0,.12)';for(let yy=S.y0;yy<S.y1;yy+=Math.max(2,u*1.5))x.fillRect(S.x0,yy,sw,Math.max(1,u*.5));// scanlines
 x.restore();
 if(mon){const d=SP.PICTURES['select-monitor'],[a0,b0,a1,b1]=d.screen,sx=sw/(a1-a0),sy=sh/(b1-b0);x.drawImage(mon,S.x0-a0*sx,S.y0-b0*sy,d.size[0]*sx,d.size[1]*sy);}
 else{const {cx,cy,mw,mh}=L,bx=cx-mw/2,by=cy-mh/2,r=mw*.07;x.save();
  x.beginPath();x.roundRect?.(bx,by,mw,mh,r);x.rect(S.x1,S.y0,-(S.x1-S.x0),S.y1-S.y0);// frame with the screen cut out (even-odd)
  g=x.createLinearGradient(0,by,0,by+mh);g.addColorStop(0,'#e4e6f2');g.addColorStop(.5,'#a9adc4');g.addColorStop(1,'#6c708c');x.fillStyle=g;x.fill('evenodd');
  x.lineWidth=Math.max(3,m*.008);x.strokeStyle='#14183a';x.beginPath();x.roundRect?.(bx,by,mw,mh,r);x.stroke();x.strokeRect(S.x0,S.y0,S.x1-S.x0,S.y1-S.y0);
  x.fillStyle='rgba(255,255,255,.35)';x.fillRect(S.x0,S.y0,sw,Math.max(2,sh*.02));
  // knobs + power light under the screen
  const ky=(S.y1+by+mh)/2;for(const [kx,col] of [[cx+mw*.26,'#3a3f5c'],[cx+mw*.36,'#3a3f5c']]){x.fillStyle=col;x.beginPath();x.arc(kx,ky,mh*.045,0,7);x.fill();}
  x.fillStyle=Math.floor(t*2)%2?'#ff3a3a':'#a01010';x.beginPath();x.arc(cx-mw*.34,ky,mh*.02,0,7);x.fill();
  text(x,'SC',cx-mw*.2,ky,mh*.08,'#2a2f50','center','rgba(255,255,255,.6)');x.restore();}
 // arrows
 const ab=Math.sin(t*6)*m*.012,as=m*.055;for(const [ax,ay,dir] of [[...L.arrowL,-1],[...L.arrowR,1]]){x.fillStyle='#ffe23a';x.strokeStyle='#08103a';x.lineWidth=Math.max(3,m*.008);x.beginPath();
  x.moveTo(ax+dir*(as+ab),ay);x.lineTo(ax-dir*(as*.4-ab),ay-as);x.lineTo(ax-dir*(as*.4-ab),ay+as);x.closePath();x.fill();x.stroke();}
 // name plate + what it does
 const c=CHARS[pick],py=L.plateY,pw=Math.min(W*.7,m*.9),ph=L.ph;x.fillStyle='#08103a';x.beginPath();x.roundRect?.(W/2-pw/2,py-ph/2,pw,ph,ph*.3);x.fill();
 x.fillStyle='#ffe23a';x.beginPath();x.roundRect?.(W/2-pw/2+4,py-ph/2+4,pw-8,ph-8,ph*.25);x.fill();text(x,c.name,W/2,py+1,ph*.6,'#e8102a','center','#08103a');
 x.font=`800 ${Math.round(m*.03)}px system-ui,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';
 const dw=x.measureText(c.does).width;if(dw>W*.94)x.font=`800 ${Math.round(m*.03*W*.94/dw)}px system-ui,sans-serif`;x.fillText(c.does,W/2,L.doesY);
 if(Math.floor(t*2.2)%3!==2)text(x,'TAP THE SCREEN TO PLAY',W/2,L.tapY,m*.045,'#ffe23a');
 x.restore();}
// what a tap on the select screen means: 'prev', 'next', 'go' (the monitor or the name plate) or null
function selectHit(W,H,px,py){const L=selectLayout(W,H),m=Math.min(W,H),near=(a,r)=>Math.hypot(px-a[0],py-a[1])<r;
 if(near(L.arrowL,m*.11)||px<L.cx-L.mw*.5)return 'prev';if(near(L.arrowR,m*.11)||px>L.cx+L.mw*.5)return 'next';return 'go';}
Object.assign(exports,{CHARS,drawTitle,drawSelect,selectHit});
