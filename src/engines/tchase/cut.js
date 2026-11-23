// Judgment Day Chase cutscenes, drawn on the canvas (a GPT still replaces the backdrop when it is in: cut-<name>
// in three shapes). Each scene = {len, draw(x,W,H,t), tap(t)?}. Letterbox bars, typed captions, faces in a comm box.
// Owner: cinematic, cutscenes, T-1000 walking out of the fire, liquid metal, the freeze and shatter.
const TS=require("src/data/tchaseSprites.js");
const {shape}=require("src/bgShape.js");
const A=require("src/engines/tchase/art.js");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>t*t*(3-2*t),seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);

function backdrop(x,W,H,name){const sh=shape(W,H),img=TS.picture(name+(sh==='wide'?'':'-'+sh))||TS.picture(name);if(!img)return false;
 const k=Math.max(W/img.width,H/img.height);x.drawImage(img,(W-img.width*k)/2,(H-img.height*k)/2,img.width*k,img.height*k);return true;}
function bars(x,W,H,a=1){const h=H*.11*a;x.fillStyle='#000';x.fillRect(0,0,W,h);x.fillRect(0,H-h,W,h);}
function caption(x,W,H,text,t,{y=H*.82,size=0,col='#fff',typed=true}={}){if(!text)return;const fs=size||clamp(Math.min(W,H*1.2)*.045,14,30),n=typed?Math.floor(clamp(t,0,1e3)*38):text.length;
 x.font=`700 ${fs}px "Arial Narrow",Arial,sans-serif`;x.textAlign='center';x.textBaseline='middle';const s=text.slice(0,n);
 const words=s.split(' '),lines=[];let line='';for(const wd of words){const tryL=line?line+' '+wd:wd;if(x.measureText(tryL).width>W*.86&&line){lines.push(line);line=wd;}else line=tryL;}lines.push(line);
 lines.forEach((l,i)=>{const yy=y+(i-(lines.length-1)/2)*fs*1.25;x.lineWidth=fs*.22;x.strokeStyle='rgba(0,0,0,.85)';x.strokeText(l,W/2,yy);x.fillStyle=col;x.fillText(l,W/2,yy);});}
// chrome title text with a hot edge
function chrome(x,text,cx,cy,fs,a=1,{glow='#ff6a00'}={}){x.save();x.globalAlpha=a;x.font=`900 ${fs}px Impact,"Arial Black",sans-serif`;x.textAlign='center';x.textBaseline='middle';
 x.shadowColor=glow;x.shadowBlur=fs*.45;x.fillStyle='#000';x.fillText(text,cx,cy);x.shadowBlur=0;
 const g=x.createLinearGradient(0,cy-fs*.5,0,cy+fs*.5);g.addColorStop(0,'#ffffff');g.addColorStop(.45,'#9fb2c8');g.addColorStop(.5,'#3b4a5c');g.addColorStop(.75,'#c9d6e6');g.addColorStop(1,'#6c7c90');
 x.fillStyle=g;x.fillText(text,cx,cy);x.lineWidth=Math.max(1,fs*.03);x.strokeStyle='rgba(20,20,30,.9)';x.strokeText(text,cx,cy);x.restore();}
function fitFs(x,text,maxW,fs){x.font=`900 ${fs}px Impact,"Arial Black",sans-serif`;const w=x.measureText(text).width;return w>maxW?fs*maxW/w:fs;}
function fireWall(x,W,H,t,y0,k=1){for(let i=0;i<40;i++){const px=(i/40)*W+Math.sin(i*7.3)*20,h=(H*.18+Math.sin(t*6+i*1.7)*H*.05)*k,g=x.createLinearGradient(0,y0,0,y0-h);g.addColorStop(0,'rgba(255,200,60,.9)');g.addColorStop(.5,'rgba(255,90,10,.6)');g.addColorStop(1,'rgba(120,20,0,0)');
 x.fillStyle=g;x.beginPath();x.moveTo(px-W/40,y0);x.quadraticCurveTo(px+Math.sin(t*4+i)*10,y0-h*1.1,px+W/40,y0);x.fill();}}
function figure(x,cx,cy,h,col='#0c0c10',chromeK=0,t=0){// a man walking, silhouette (side-on, facing the camera)
 x.save();x.translate(cx,cy);const s=h/100,sw=Math.sin(t*5)*12;x.fillStyle=col;
 x.beginPath();x.ellipse(0,-88*s,9*s,11*s,0,0,7);x.fill();x.fillRect(-14*s,-76*s,28*s,40*s);
 x.save();x.translate(-6*s,-38*s);x.rotate(sw*.02);x.fillRect(-5*s,0,10*s,38*s);x.restore();x.save();x.translate(6*s,-38*s);x.rotate(-sw*.02);x.fillRect(-5*s,0,10*s,38*s);x.restore();
 x.save();x.translate(-16*s,-74*s);x.rotate(-sw*.015);x.fillRect(-4*s,0,8*s,34*s);x.restore();x.save();x.translate(16*s,-74*s);x.rotate(sw*.015);x.fillRect(-4*s,0,8*s,34*s);x.restore();
 if(chromeK>0){x.globalCompositeOperation='lighter';const g=x.createLinearGradient(-20*s,-100*s,20*s,0);g.addColorStop(0,`rgba(200,220,255,${.5*chromeK})`);g.addColorStop(.5+.3*Math.sin(t*3),`rgba(255,255,255,${.7*chromeK})`);g.addColorStop(1,`rgba(120,140,170,${.3*chromeK})`);
  x.fillStyle=g;x.fillRect(-16*s,-100*s,32*s,100*s);x.globalCompositeOperation='source-over';}x.restore();}
function commBox(x,W,H,face,name,text,t){const bh=clamp(H*.16,70,120),y=H-H*.11-bh-8,bw=Math.min(W-24,560),bx=(W-bw)/2;
 x.fillStyle='rgba(6,10,18,.88)';A.rr(x,bx,y,bw,bh,10);x.fill();x.strokeStyle='#4fc3ff';x.lineWidth=2;x.stroke();
 const fs=bh*.8;x.save();A.rr(x,bx+8,y+8,fs,bh-16,8);x.clip();x.fillStyle='#1b2433';x.fillRect(bx+8,y+8,fs,bh-16);face?.(x,bx+8+fs/2,y+bh/2+4,fs*.82);
 x.fillStyle='rgba(120,200,255,.12)';for(let i=0;i<bh;i+=3)x.fillRect(bx+8,y+8+i,fs,1);x.restore();
 const tx=bx+fs+20,tw=bw-fs-30;x.fillStyle='#4fc3ff';x.font=`800 ${clamp(bh*.17,11,16)}px sans-serif`;x.textAlign='left';x.textBaseline='top';x.fillText(name,tx,y+10);
 const n=Math.floor(clamp(t,0,99)*40),s=text.slice(0,n),f2=clamp(bh*.2,12,19);x.font=`700 ${f2}px sans-serif`;x.fillStyle='#fff';const words=s.split(' ');let line='',ly=y+12+f2*1.2;for(const wd of words){const tl=line?line+' '+wd:wd;if(x.measureText(tl).width>tw&&line){x.fillText(line,tx,ly);line=wd;ly+=f2*1.2;}else line=tl;}x.fillText(line,tx,ly);}

// ---------------------------------------------------------------- scenes
function intro(){return {len:9,draw(x,W,H,t){
 x.fillStyle='#000';x.fillRect(0,0,W,H);
 if(t<4.4){// 2029: the future war
  if(!backdrop(x,W,H,'cut-intro')){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#05070f');g.addColorStop(.6,'#2a0d12');g.addColorStop(1,'#0a0606');x.fillStyle=g;x.fillRect(0,0,W,H);
   // ruins skyline
   x.fillStyle='#07070a';for(let i=0;i<14;i++){const bx=i/14*W,bh=H*(.18+((i*37)%11)/40);x.fillRect(bx,H*.62-bh,W/16,bh);}
   // HK tank with searchlights crossing the field
   const hx=W*(1.1-t*.18),hy=H*.6;x.fillStyle='#0b0b0f';x.fillRect(hx-W*.12,hy-H*.06,W*.24,H*.07);x.fillRect(hx-W*.06,hy-H*.1,W*.1,H*.05);
   x.globalCompositeOperation='lighter';for(const d of [-1,1]){const g2=x.createLinearGradient(hx,hy-H*.08,hx+d*W*.3,H);g2.addColorStop(0,'rgba(200,220,255,.35)');g2.addColorStop(1,'rgba(200,220,255,0)');x.fillStyle=g2;x.beginPath();x.moveTo(hx,hy-H*.08);x.lineTo(hx+d*W*.18+Math.sin(t*1.3)*W*.1,H);x.lineTo(hx+d*W*.42+Math.sin(t*1.3)*W*.1,H);x.fill();}
   // laser fire
   for(let i=0;i<6;i++){const p=(t*1.7+i*.37)%1;if(p<.18){x.strokeStyle=`rgba(${i%2?120:255},${i%2?160:60},${i%2?255:60},${1-p/.18})`;x.lineWidth=3;x.beginPath();const sx=W*((i*.27)%1),sy=H*.4;x.moveTo(sx,sy);x.lineTo(sx+W*.4*(i%2?-1:1),sy+H*.4);x.stroke();}}
   x.globalCompositeOperation='source-over';
   // skulls in the foreground
   for(let i=0;i<9;i++){const sx=((i*.13+t*.03)%1.2-.1)*W,sy=H*.86+(i%3)*H*.04,r=H*.035*(1+(i%3)*.4);x.fillStyle='#d9d2c2';x.beginPath();x.ellipse(sx,sy,r,r*.85,0,0,7);x.fill();x.fillStyle='#120c0c';x.beginPath();x.arc(sx-r*.35,sy,r*.25,0,7);x.arc(sx+r*.35,sy,r*.25,0,7);x.fill();}}
  bars(x,W,H);caption(x,W,H,'LOS ANGELES · 2029 A.D.',t-.2,{y:H*.2,col:'#ff9a7a'});
  caption(x,W,H,'The machines won the war. Then they sent a killer back in time to change it.',t-1.2);}
 else if(t<5.4){x.fillStyle='#000';x.fillRect(0,0,W,H);chrome(x,'1995',W/2,H/2,Math.min(W,H)*.22,seg(t,4.4,4.7)*(1-seg(t,5.1,5.4)),{glow:'#4fc3ff'});}
 else{// title
  if(!backdrop(x,W,H,'title-bg')){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a0a08');g.addColorStop(.55,'#ff6a1a');g.addColorStop(.56,'#2b1a14');g.addColorStop(1,'#0b0807');x.fillStyle=g;x.fillRect(0,0,W,H);}
  fireWall(x,W,H,t,H,seg(t,5.4,6.5));const logo=TS.picture('logo'),a=ease(seg(t,5.6,6.6));
  if(logo){const k=Math.min(W*.86/logo.width,H*.4/logo.height)*(1.4-.4*a);x.globalAlpha=a;x.drawImage(logo,W/2-logo.width*k/2,H*.38-logo.height*k/2,logo.width*k,logo.height*k);x.globalAlpha=1;}
  else{const fs=fitFs(x,'JUDGMENT DAY',W*.9,Math.min(W,H)*.15);chrome(x,'JUDGMENT DAY',W/2,H*.34,fs*(1.3-.3*a),a);chrome(x,'CHASE',W/2,H*.34+fs*1.05,fs*.9*(1.3-.3*a),a);}
  caption(x,W,H,'HE\'LL BE BACK.',t-7,{y:H*.72,col:'#ffd23f',typed:false});}
 x.fillStyle=`rgba(255,255,255,${Math.max(0,1-(t-5.4)*4)*(t>5.4?1:0)})`;x.fillRect(0,0,W,H);}};}

function stageCard(st,n,faces){return {len:5.2,draw(x,W,H,t){
 x.fillStyle='rgba(0,0,0,.78)';x.fillRect(0,0,W,H);bars(x,W,H,ease(seg(t,0,.4)));
 const fs=fitFs(x,st.title,W*.88,Math.min(W,H)*.13),sl=(1-ease(seg(t,.1,.6)))*W*.5;
 x.font=`800 ${fs*.28}px sans-serif`;x.textAlign='center';x.fillStyle='#ff5a3a';x.fillText('STAGE '+(n+1),W/2-sl,H*.3);
 chrome(x,st.title,W/2+sl,H*.3+fs*.7,fs,1);x.font=`700 ${fs*.24}px sans-serif`;x.fillStyle='#cfd8e6';x.fillText(st.sub.toUpperCase(),W/2,H*.3+fs*1.45);
 const line=t<2.6?0:1,lt=t-(line?2.6:.8);if(t>.8)commBox(x,W,H,faces[line],line?'RADIO':'T-800',st.intro[line],lt);}};}

function crash(face){return {len:7.5,draw(x,W,H,t){
 if(t<3.4){if(!backdrop(x,W,H,'cut-crash')){// the storm drain from above: the truck races up into the overpass
   x.fillStyle='#8d8a82';x.fillRect(0,0,W,H);x.fillStyle='#a8a59c';x.fillRect(0,0,W*.25,H);x.fillRect(W*.75,0,W*.25,H);
   const oy=H*.22;x.fillStyle='#55545a';x.fillRect(0,oy-H*.07,W,H*.14);x.fillStyle='#3a393e';x.fillRect(0,oy+H*.07,W,H*.03);
   const ty=H*(1.05-ease(seg(t,0,1.6))*.72),ss=Math.min(W,H)/260;x.save();x.translate(W/2,ty);x.scale(ss,ss);A.car(x,'towtruck',{t});x.restore();
   if(t>1.6){const k=seg(t,1.6,3.4);x.globalCompositeOperation='lighter';const g=x.createRadialGradient(W/2,oy+H*.08,0,W/2,oy+H*.08,Math.max(W,H)*k);g.addColorStop(0,'rgba(255,250,210,1)');g.addColorStop(.3,'rgba(255,150,30,.9)');g.addColorStop(1,'rgba(120,20,0,0)');x.fillStyle=g;x.fillRect(0,0,W,H);x.globalCompositeOperation='source-over';}}
  bars(x,W,H);caption(x,W,H,t<1.6?'The truck can\'t stop in time...':'',t);}
 else{// the T-1000 walks out of the fire
  if(!backdrop(x,W,H,'cut-walkout')){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#120604');g.addColorStop(1,'#2d0b04');x.fillStyle=g;x.fillRect(0,0,W,H);fireWall(x,W,H,t,H*.95,1.3);}
  const k=seg(t,3.4,7),h=H*(.35+k*.4);figure(x,W/2,H*.62+h*.42,h,'#0b0a0d',seg(t,4.5,6)*(1-seg(t,6.5,7.5))+.2,t);
  if(t>5.6)face?.(x,W/2,H*.62+h*.42-h*.88,h*.24);
  fireWall(x,W,H,t+1,H,.7);bars(x,W,H);caption(x,W,H,'He walked out of the fire.',t-3.8);}}};}
function lose(face){return {len:4.5,draw(x,W,H,t){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#c9864a');g.addColorStop(1,'#5a3a24');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.fillStyle='#8a8378';x.beginPath();x.moveTo(W*.42,H*.4);x.lineTo(W*.58,H*.4);x.lineTo(W,H);x.lineTo(0,H);x.fill();
 const h=H*(.5-ease(seg(t,0,4))*.32);figure(x,W/2,H*.4+h*.95,h,'#0e1830',.3,0);face?.(x,W/2,H*.4+h*.95-h*.88,h*.22);
 bars(x,W,H);caption(x,W,H,'He stops. He watches. He will find another way.',t-.4);}};}
function down(kind){return {len:3.6,draw(x,W,H,t){x.fillStyle='#05060a';x.fillRect(0,0,W,H);const k=seg(t,0,1.2),s=Math.min(W,H)/180;
 x.save();x.translate(W/2,H*(.4+k*.15));x.rotate(t*(kind==='heliboss'?6:3));x.scale(s*(1-k*.4),s*(1-k*.4));if(kind==='heliboss')A.heli(x,{t});else A.moto(x,{t,boss:true});x.restore();
 if(t>1.1){const g=x.createRadialGradient(W/2,H*.55,0,W/2,H*.55,Math.max(W,H)*seg(t,1.1,2.6));g.addColorStop(0,'rgba(255,250,210,1)');g.addColorStop(.35,'rgba(255,140,20,.85)');g.addColorStop(1,'rgba(80,10,0,0)');x.fillStyle=g;x.fillRect(0,0,W,H);}
 bars(x,W,H);caption(x,W,H,kind==='heliboss'?'The helicopter goes down in flames.':'The police bike cartwheels into the median.',t-.2);}};}
// the finale: tanker jackknifes, the T-1000 freezes, shatters, reforms; tap when he is in the sights to fire the M79
function finale(face,onShot){let shot=null;return {len:15,qte:[9,12.5],
 tap(t){if(shot!=null||t<9||t>12.5)return false;const ok=Math.abs(Math.sin(t*2.2))<.32;shot={t,ok};onShot?.(ok);return true;},
 draw(x,W,H,t){const sh=shot;
  if(t<3){x.fillStyle='#0a0d14';x.fillRect(0,0,W,H);const s=Math.min(W,H)/320;x.save();x.translate(W/2,H*.55);x.rotate(ease(seg(t,0,1.6))*1.3);x.scale(s,s);A.car(x,'tanker',{t,valves:[]});x.restore();
   const k=seg(t,1.4,3);for(let i=0;i<30;i++){const a=i*.7,r=k*Math.max(W,H)*.6*(.3+((i*13)%10)/10);x.fillStyle=`rgba(225,245,255,${.5*k})`;x.beginPath();x.arc(W/2+Math.cos(a)*r,H*.55+Math.sin(a)*r*.6,40+i,0,7);x.fill();}
   bars(x,W,H);caption(x,W,H,'The tanker jackknifes. Liquid nitrogen everywhere.',t-.3);return;}
  if(t<7.5){if(!backdrop(x,W,H,'cut-freeze')){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#cfe6f5');g.addColorStop(1,'#7fa3c0');x.fillStyle=g;x.fillRect(0,0,W,H);}
   const fr=seg(t,3,5),h=H*.62;const shat=t>6.2;
   if(!shat){figure(x,W/2,H*.9,h,`rgb(${20+fr*200|0},${30+fr*210|0},${60+fr*190|0})`,.3+fr*.5,0);if(fr<.6)face?.(x,W/2,H*.9-h*.88,h*.22);
    x.fillStyle=`rgba(255,255,255,${fr*.5})`;for(let i=0;i<40;i++){x.fillRect(W/2-h*.15+((i*37)%30)/30*h*.3,H*.9-((i*53)%100)/100*h,2,2);}}
   else{const k=seg(t,6.2,7.5);for(let i=0;i<70;i++){const a=i*2.4,r=k*Math.max(W,H)*.55*(.2+((i*17)%10)/10);x.fillStyle=i%3?'#e8f4ff':'#9fc4e0';x.save();x.translate(W/2+Math.cos(a)*r,H*.55+Math.sin(a)*r);x.rotate(a+k*6);x.fillRect(-6,-3,12,6);x.restore();}}
   bars(x,W,H);caption(x,W,H,t<6.2?'"Hasta la vista, baby."':'',t-4.6,{col:'#fff'});
   if(t>6.15&&t<6.35){x.fillStyle='#fff';x.fillRect(0,0,W,H);}return;}
  // the steel mill: he flows back together; the sights sweep; tap to fire
  if(!backdrop(x,W,H,'cut-mill')){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#140806');g.addColorStop(.7,'#3a1206');g.addColorStop(1,'#ff7a1a');x.fillStyle=g;x.fillRect(0,0,W,H);
   x.fillStyle='#ffb347';x.globalAlpha=.6+.2*Math.sin(t*3);x.fillRect(0,H*.86,W,H*.14);x.globalAlpha=1;}
  const ref=seg(t,7.5,9),h=H*.5;
  if(!sh||!sh.ok||t<sh.t+.3){figure(x,W/2,H*.84,h*ref,'#8f9cad',1,t);if(ref>.7)face?.(x,W/2,H*.84-h*.88,h*.22);}
  else{const k=seg(t,sh.t+.3,sh.t+2.4);figure(x,W/2+k*W*.1,H*.84+k*H*.25,h*(1-k*.3),`rgb(255,${140-k*100|0},40)`,1-k,t*3);for(let i=0;i<14;i++){x.fillStyle=`rgba(255,${180+i*5},60,${1-k})`;x.beginPath();x.arc(W/2+Math.sin(i+t*4)*W*.15,H*.86-((t*80+i*30)%(H*.4)),3+i%4,0,7);x.fill();}}
  bars(x,W,H);
  if(t>=9&&t<=12.5&&!sh){const cx=W/2+Math.sin(t*2.2)*W*.32,cy=H*.84-h*.5,r=Math.min(W,H)*.09,on=Math.abs(Math.sin(t*2.2))<.32;x.strokeStyle=on?'#5dff7a':'#ff4040';x.lineWidth=3;x.beginPath();x.arc(cx,cy,r,0,7);x.moveTo(cx-r*1.4,cy);x.lineTo(cx+r*1.4,cy);x.moveTo(cx,cy-r*1.4);x.lineTo(cx,cy+r*1.4);x.stroke();
   caption(x,W,H,'TAP TO FIRE THE M79 WHEN THE SIGHTS GO GREEN',99,{y:H*.16,col:'#ffd23f',typed:false});}
  if(sh)caption(x,W,H,sh.ok?'BULLSEYE. Into the molten steel.':'Just wide... the blast still throws him into the pit.',t-sh.t);
  if(!sh&&t>12.5)caption(x,W,H,'The T-800 fires the last round.',t-12.5);}};}
function ending(score,face){return {len:7,draw(x,W,H,t){x.fillStyle='#0a0403';x.fillRect(0,0,W,H);if(!backdrop(x,W,H,'cut-ending')){x.fillStyle='#ff8a2a';x.globalAlpha=.85;x.fillRect(0,H*.7,W,H*.3);x.globalAlpha=1;
  const y=H*.7-H*.25*(1-seg(t,1,6));x.fillStyle='#111';x.fillRect(W/2-14,y,28,H*.3);x.fillRect(W/2-22,y-26,26,30);x.fillRect(W/2+2,y-58,12,38);}
 bars(x,W,H);chrome(x,'THE END?',W/2,H*.25,Math.min(W,H)*.12,seg(t,.5,1.5));caption(x,W,H,'No fate but what we make. Score '+score.toLocaleString(),t-2,{col:'#ffd23f'});}};}

Object.assign(exports,{intro,stageCard,crash,lose,down,finale,ending,chrome,caption,bars,fitFs});
