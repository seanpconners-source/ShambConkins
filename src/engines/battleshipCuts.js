// Battleship cut scenes (owner's triage note): a quick deck gun shot on a hit; on a sunk ship a torpedo, the ship going down and
// sailors with the loser's head jumping overboard. Full-screen canvas over the game, drawn here, tap skips. Purely for show:
// nothing in the game's rules or online moves waits on anything but the promise, and each phone plays its own.
const {store}=require('src/state.js');
const {sfx}=require('src/engines/partyKit.js');
const BS=require('src/data/battleshipSprites.js');
const HF=require('src/headFacts.js');
const SAILOR_FACE=.5;   // sailor's face width (brow to chin) in sailor sizes   // owner drop-in art (falls back to the drawn scenes)

function navalCut(s,{kind,shooter,victim,ship=''}){return new Promise(done=>{
 const calm=!!store.profile?.settings.reducedMotion,dur=(kind==='sunk'?3.4:1.5)*(calm?.6:1),cv=document.createElement('canvas');
 cv.className='bs-cut';cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:40;touch-action:none;background:#0a1626';(document.getElementById('game-layer')||document.body).append(cv);
 const x=cv.getContext('2d'),dpr=Math.min(1.5,window.devicePixelRatio||1);let W=0,H=0,t=0,last=performance.now(),raf=0,over=false;
 const fit=()=>{const w=cv.clientWidth||innerWidth,h=cv.clientHeight||innerHeight;if(w!==W||h!==H){W=w;H=h;cv.width=W*dpr;cv.height=H*dpr;}x.setTransform(dpr,0,0,dpr,0,0);};
 const parts=[],sailors=[];let hitDone=false,nextSailor=1.15,fired=false,gunFlash=null;
 const end=()=>{if(over)return;over=true;cancelAnimationFrame(raf);cv.remove();done();};
 s.cleanup(end);cv.addEventListener('pointerdown',()=>{if(t>.25)end();});
 const blast=(px,py,n,sp)=>{if(BS.has('boom'))n=Math.round(n*.15);for(let i=0;i<n;i++){const a=Math.random()*6.28,v=Math.random()*sp;parts.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v-sp*.25,g:240,life:.5+Math.random()*.8,col:['#fff0a0','#ffb42e','#ee4a1c','#555'][i%4],r:2+Math.random()*7});}};
 const seaY=()=>H*.64;
 const P=BS.PICTURES,fxs=[];   // fxs: drop-in boom/splash animations
 const cover=(img,x0,y0,w,h)=>{const k=Math.max(w/img.width,h/img.height),dw=img.width*k,dh=img.height*k;x.drawImage(img,x0+(w-dw)/2,y0+h-dh,dw,dh);};
 const anim=(k,px,py,sz)=>{if(BS.has(k))fxs.push({k,x:px,y:py,sz,t:0});};
 function drawFx(dt){for(const a of fxs){a.t+=dt;const sh=BS.sheet(a.k);if(!sh)continue;const f=Math.floor(a.t*16);if(f>=sh.def.rows[a.k]){a.done=1;continue;}const r=BS.frameRect(sh,a.k,f);x.drawImage(sh.img,r.sx,r.sy,r.sw,r.sh,a.x-a.sz/2,a.y+a.sz*.15-a.sz*(sh.def.foot??.5),a.sz,a.sz);}for(let i=fxs.length-1;i>=0;i--)if(fxs[i].done)fxs.splice(i,1);}
 function sky(){const sp=BS.picture('cut-sky');if(sp){x.save();x.beginPath();x.rect(0,0,W,seaY()+2);x.clip();cover(sp,0,0,W,seaY()+2);x.restore();return;}const g=x.createLinearGradient(0,0,0,seaY());g.addColorStop(0,'#172a52');g.addColorStop(.7,'#c8603a');g.addColorStop(1,'#f0a860');x.fillStyle=g;x.fillRect(0,0,W,seaY()+2);}
 function sea(front=false){const y0=seaY()+(front?H*.05:0);
  if(!front){const sp=BS.picture('cut-sea');if(sp){x.save();x.beginPath();x.rect(0,seaY(),W,H-seaY());x.clip();const k=Math.max(W/sp.width,(H-seaY())/sp.height);x.drawImage(sp,(W-sp.width*k)/2,seaY(),sp.width*k,sp.height*k);x.restore();return;}}
  else{const fp=BS.picture('cut-sea-front');if(fp){const h=H*.16,w=h*fp.width/fp.height,off=(t*40)%w;const sp=BS.picture('cut-sea');if(sp){const yb=y0+h*.5;x.save();x.beginPath();x.rect(0,yb,W,H-yb);x.clip();const k=Math.max(W/sp.width,(H-seaY())/sp.height);x.drawImage(sp,(W-sp.width*k)/2,seaY(),sp.width*k,sp.height*k);x.restore();}/* the band only covers its strip: below it the sea is painted again over anything sinking (owner: the ship showed under the waves) */for(let xx=-off;xx<W;xx+=w)x.drawImage(fp,xx,y0-h*.35,w,h);return;}}
 x.fillStyle=front?'#0c3a5e':'#14527e';x.beginPath();x.moveTo(0,H);x.lineTo(0,y0);for(let i=0;i<=W;i+=12)x.lineTo(i,y0+Math.sin(i*.03+t*(front?3:2))*(front?7:4));x.lineTo(W,y0);x.lineTo(W,H);x.fill();}
 function warship(cx,cy,L,tilt=0,burn=false){x.save();x.translate(cx,cy);x.rotate(tilt);const h=L*.13,wp=BS.picture('warship');
  if(wp){const d=P.warship,k=L/d.L;x.drawImage(wp,-d.water[0]*k,-d.water[1]*k,d.size[0]*k,d.size[1]*k);}
  else{x.fillStyle='#4c5866';x.beginPath();x.moveTo(-L/2,-h*.4);x.lineTo(L/2,-h*.6);x.lineTo(L*.42,h*.6);x.lineTo(-L*.45,h*.6);x.fill();x.fillStyle='#7a2e24';x.fillRect(-L*.44,h*.22,L*.86,h*.36);
  x.fillStyle='#667384';x.fillRect(-L*.2,-h*1.2,L*.32,h*.85);x.fillRect(-L*.08,-h*1.9,L*.14,h*.75);x.fillStyle='#39424e';x.fillRect(L*.13,-h*1.1,L*.06,h*.7);for(const k of [-.34,.28]){x.fillStyle='#39424e';x.fillRect(L*k-L*.04,-h*.7,L*.08,h*.3);x.fillRect(L*k,-h*.68,L*.12*(k<0?-1:1),h*.09);}}
  const fs=burn&&BS.sheet('ship-fire');if(fs){const d=fs.def,hgt=L*.22;for(let i=0;i<3;i++){const r=BS.frameRect(fs,'burn',Math.floor(t*10+i*2)),w=hgt*d.frame[0]/d.frame[1],fx=-L*.25+i*L*.25,fy=-h*.45;x.drawImage(fs.img,r.sx,r.sy,r.sw,r.sh,fx-w*d.foot[0]/d.frame[0],fy-hgt*d.foot[1]/d.frame[1],w,hgt);}}
  else if(burn)for(let i=0;i<3;i++){const fx=-L*.25+i*L*.25,f=1+Math.sin(t*14+i)*.2;x.fillStyle='#ff8a1f';x.beginPath();x.ellipse(fx,-h*.6,h*.3*f,h*.6*f,0,0,7);x.fill();x.fillStyle='#ffe07a';x.beginPath();x.ellipse(fx,-h*.5,h*.14*f,h*.3*f,0,0,7);x.fill();}
  x.restore();}
 function sailor(px,py,size,who,mood,rot=0,arms=0,row=null){x.save();x.translate(px,py);x.rotate(rot);const body=BS.sheet('sailor');
  if(body){const d=body.def,k=size/d.U,rw=row||'stand',fi=Math.floor(t*(rw==='swim'?6:4)+px*.01),r=BS.frameRect(body,rw,fi);x.drawImage(body.img,r.sx,r.sy,r.sw,r.sh,-d.head[0]*k,-d.head[1]*k,d.frame[0]*k,d.frame[1]*k);
   // face like Seanic/SotN: FACE wide, chin on this frame's collar, mirrored only if it looks against the sailor; cap on the brow
   const id=s.players[who]?.character,m=mood||s.spriteMood(who),nk=BS.neckAt(d,rw,fi),fw=size*SAILOR_FACE,fit=id&&HF.faceFit(id,m,fw);
   if(nk&&fit){const nx=(nk[0]-d.head[0])*k,ny=(nk[1]-d.head[1])*k,cy=ny-HF.faceHeight(id,m,fw)*.38;HF.drawFace(s,x,who,nx,cy,fw/.6,m,1,.6);
    const g=HF.faceGeom(id,m,fw,nx,cy,HF.flipFor(id,m,1)),cap=BS.picture('sailor-cap'),w=Math.max(g.head.w*1.05,fw*1.45),bx=g.face.x+g.face.w/2,by=g.face.y+g.face.h*.04;   // brim on the forehead from the face box (owner: first it sat in the middle of the face; then, from the whole-head box, it floated above the hair on some mood pictures)
    if(cap){const ch=w*cap.height/cap.width;x.drawImage(cap,bx-w/2,by-ch*.82,w,ch);}else{x.fillStyle='#fff';x.beginPath();x.ellipse(bx,by-w*.05,w*.45,w*.12,0,0,7);x.fill();}x.restore();return;}
   s.sprite(x,who,0,0,size*.8,{exact:true,mood});const cap=BS.picture('sailor-cap');if(cap){const w=size*.6;x.drawImage(cap,-w/2,-size*.34-w*.22,w,w*cap.height/cap.width);}else{x.fillStyle='#fff';x.beginPath();x.ellipse(0,-size*.34,size*.26,size*.07,0,0,7);x.fill();}x.restore();return;}
  x.fillStyle='#f2f5f8';x.fillRect(-size*.2,size*.25,size*.4,size*.55);x.fillStyle='#1f3a68';x.fillRect(-size*.2,size*.6,size*.4,size*.42);x.strokeStyle='#f2f5f8';x.lineWidth=size*.12;x.lineCap='round';x.beginPath();x.moveTo(-size*.2,size*.35);x.lineTo(-size*.48,size*(.35+arms));x.moveTo(size*.2,size*.35);x.lineTo(size*.48,size*(.35+arms));x.stroke();x.lineCap='butt';s.sprite(x,who,0,0,size*.8,{exact:true,mood});x.fillStyle='#fff';x.beginPath();x.ellipse(0,-size*.34,size*.26,size*.07,0,0,7);x.fill();x.restore();}
 function caption(big,small){const px=Math.min(W*.1,H*.09,52);x.textAlign='center';x.textBaseline='middle';x.font=`900 ${px}px Impact,"Arial Black",sans-serif`;x.lineWidth=px*.14;x.strokeStyle='#000';x.lineJoin='round';x.strokeText(big,W/2,H*.15);x.fillStyle='#ffd24d';x.fillText(big,W/2,H*.15);if(small){x.font=`800 ${px*.36}px Arial`;x.lineWidth=3;x.strokeText(small,W/2,H*.15+px*.72);x.fillStyle='#fff';x.fillText(small,W/2,H*.15+px*.72);}}
 function drawParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;x.globalAlpha=Math.min(1,p.life*1.6);x.fillStyle=p.col;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill();}x.globalAlpha=1;}
 // a hit: over the shoulder of a gunner on the deck, the shell arcs into the other ship
 function hitScene(dt){sky();sea();const L=Math.min(W*.55,H*.55),sx=W*.72,sy=seaY()+2,impact=.72;warship(sx,sy,L,0,t>impact);sea(true);
  const sz=Math.min(W,H)*.3,gx=W*.1,gy=H-sz*1.2;const dk=BS.picture('deck'),gp=BS.picture('deck-gun');if(dk)cover(dk,0,gy+sz*.5,W*.52,H-gy-sz*.5);else{x.fillStyle='#39424e';x.fillRect(0,gy+sz*.5,W*.52,H-gy);}x.save();x.translate(gx+sz*.6,gy+sz*.35);x.rotate(-.42);const kick=t>.22&&t<.42?-sz*.2*(1-(t-.22)/.2):0;if(gp){const d=P['deck-gun'],k=sz*1.1/d.size[0];x.drawImage(gp,kick-d.pivot[0]*k,-d.pivot[1]*k,d.size[0]*k,d.size[1]*k);}else{x.fillStyle='#232a33';x.fillRect(kick,-sz*.09,sz*1.1,sz*.18);}x.restore();
  sailor(gx,gy,sz,shooter,t>impact?'win':'angry',0,0,t>impact?'cheer':'stand');
  const m0x=gx+sz*.6+Math.cos(-.42)*sz*1.1,m0y=gy+sz*.35+Math.sin(-.42)*sz*1.1;
  if(t>.22&&!fired){fired=true;sfx.boom();blast(m0x,m0y,calm?4:14,160);if(BS.has('gun-flash'))gunFlash={t:0};else anim('boom',m0x,m0y,sz*.7);}
  if(gunFlash){gunFlash.t+=dt;const gs=BS.sheet('gun-flash');if(gs){const d=gs.def,f=Math.floor(gunFlash.t*16);if(f<d.rows.flash){const r=BS.frameRect(gs,'flash',f),k=sz*.9/d.frame[0];x.save();x.translate(m0x,m0y);x.rotate(-.42);x.drawImage(gs.img,r.sx,r.sy,r.sw,r.sh,-d.pivot[0]*k,-d.pivot[1]*k,d.frame[0]*k,d.frame[1]*k);x.restore();}}}
  if(t>.22&&t<impact){const k=(t-.22)/(impact-.22),px=m0x+(sx-m0x)*k,py=m0y+(sy-L*.05-m0y)*k-Math.sin(k*Math.PI)*H*.16;const sp=BS.picture('shell');if(sp){const k2=Math.min(1,k+.02),nx=m0x+(sx-m0x)*k2,ny=m0y+(sy-L*.05-m0y)*k2-Math.sin(k2*Math.PI)*H*.16,len=40;x.save();x.translate(px,py);x.rotate(Math.atan2(ny-py,nx-px));x.drawImage(sp,-len/2,-len*sp.height/sp.width/2,len,len*sp.height/sp.width);x.restore();}else{x.fillStyle='#fff6c8';x.beginPath();x.arc(px,py,4,0,7);x.fill();}}
  if(t>impact&&!hitDone){hitDone=true;sfx.boom();blast(sx,sy-L*.06,calm?12:50,320);anim('boom',sx,sy-L*.08,L*.45);}
  drawParts(dt);drawFx(dt);if(t>impact)caption('DIRECT HIT!');}
 // sunk: a torpedo runs in, the ship breaks and tips, the crew jumps
 function sunkScene(dt){sky();const L=Math.min(W*.88,H*.8),sx=W/2,impact=.95,k=Math.max(0,t-impact),tilt=Math.min(.55,k*.22),sy=seaY()+k*k*H*.035;
  sea();warship(sx,sy,L,tilt,t>impact);
  if(t<impact){const k0=t/impact,px=-20+(sx-L*.25+20)*k0,py=seaY()+H*.07;const wk=BS.picture('torpedo-wake');if(wk){const h=18;x.drawImage(wk,-20,py-h/2,px+20,h);}else{x.strokeStyle='#ffffffaa';x.lineWidth=3;x.beginPath();x.moveTo(-20,py);x.lineTo(px,py);x.stroke();}const tp=BS.picture('torpedo');if(tp){const w=56;x.drawImage(tp,px-w/2,py-w*tp.height/tp.width/2,w,w*tp.height/tp.width);}else{x.fillStyle='#10161e';x.fillRect(px-14,py-4,28,8);}}
  if(t>impact&&!hitDone){hitDone=true;sfx.boom();sfx.big?.();blast(sx-L*.2,seaY(),calm?20:110,520);anim('boom',sx-L*.2,seaY()-L*.05,L*.5);}
  if(t>nextSailor&&sailors.length<8){nextSailor=t+.26;const from=-.3+Math.random()*.6;sailors.push({x:sx+L*from,y:seaY()-L*.13,vx:(from<0?-1:1)*(40+Math.random()*90),vy:-170-Math.random()*90,rot:0,spin:(Math.random()-.5)*5,wet:false});}
  const sz=Math.min(W,H)*.13;for(const m of sailors){if(!m.wet){m.vy+=470*dt;m.x+=m.vx*dt;m.y+=m.vy*dt;m.rot+=m.spin*dt;if(m.y>seaY()+H*.03){m.wet=true;m.y=seaY()+H*.03;m.rot=0;sfx.splash();anim('splash',m.x,m.y-sz*.2,sz*1.4);for(let i=0;i<10;i++){const a=-1.57+(Math.random()-.5)*1.4,v=70+Math.random()*120;parts.push({x:m.x,y:m.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:420,life:.6,col:'#dff3ff',r:2+Math.random()*2});}}}
   sailor(m.x,m.wet?m.y+Math.sin(t*4+m.x)*3:m.y,sz,victim,'sad',m.rot,m.wet?-.45*(1+Math.sin(t*9+m.x)*.3):-.35,m.wet?'swim':'fall');}
  sea(true);drawParts(dt);drawFx(dt);
  if(t>impact)caption('ABANDON SHIP!',`${String(s.players[shooter].name).toUpperCase()} SANK THE ${String(ship).toUpperCase()}`);}
 function loop(now){if(over)return;raf=requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;if(s.paused||!s.alive)return;t+=dt;cv.dataset.t=t.toFixed(1);fit();(kind==='sunk'?sunkScene:hitScene)(dt);if(t>=dur)end();}
 fit();raf=requestAnimationFrame(loop);
});}
Object.assign(exports,{navalCut});
