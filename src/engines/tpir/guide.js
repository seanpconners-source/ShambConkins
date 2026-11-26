// THE PRICE IS RIGHT start screen (owner, Nov 26): an old 90s TV set showing the cable channel guide, exactly like the scrolling
// listings channel of the time: the promo window top left with yellow text, the clock / local forecast / "Available TODAY at your
// local store!" panel top right, the blue grid crawling up underneath (maroon movie rows, the highlighted light-blue row), slow
// monotonous lounge music, a CRT over it all. The Price Is Right is on at 9:00 AM: tap it and the set flickers to static, the green
// channel number comes up in the corner and the episode starts. "Pick a game" (channel 3) is the old menu of single pricing games.
// Pictures: tv-frame(-tall/-fold) = the set with a see-through screen (SS.TV_GEOM.screen), guide-promo-1..4 promo stills,
// ad-fightmilk/-brawndo/-rumham; all optional (drawn stand-ins).
//   runGuide(s,{onePlayer}) -> Promise<{pick:'episode'|'menu', alone:boolean}|null>
const SS=require("src/data/showSprites.js");
const {clamp}=require("src/utils.js");
const {audioContext,vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const TAU=Math.PI*2,GW=720,GH=540;
// the listings (fictional stations, real shows and films from the game's universe); a slot = half an hour from 9:00 AM
const ROWS=[
 ['2','KCBS',[['THE PRICE IS RIGHT',2,'tpir'],['THE YOUNG AND THE RESTLESS',2]]],
 ['3','GAME',[['THE PRICE IS RIGHT: PICK A GAME',4,'menu']]],
 ['4','KNBC',[['SEINFELD',1],['SEINFELD',1],['SAVED BY THE BELL',1],['SAVED BY THE BELL',1]]],
 ['5','KTLA',[['MARRIED... WITH CHILDREN',1],['CHEERS',1],['THE PRICE IS RIGHT',2,'tpir']]],
 ['7','KABC',[['THE VIEW',2],['REGIS & KATHIE LEE',2]]],
 ['11','KTTV',[['THE OFFICE',1],['THE OFFICE',1],['IT\'S ALWAYS SUNNY',1],['IT\'S ALWAYS SUNNY',1]]],
 ['13','KCOP',[['STAR TREK: THE NEXT GENERATION',2],['QUANTUM LEAP',2]]],
 ['28','KCET',[['SESAME STREET',2],['MISTER ROGERS',1],['READING RAINBOW',1]]],
 ['33','HBO',[['MOVIE: CADDYSHACK (1980)',4,'movie']]],
 ['36','TNT',[['MOVIE: THE WARRIORS (1979)',4,'movie']]],
 ['40','SHOW',[['MOVIE: IDIOCRACY (2006)',4,'movie']]],
 ['44','USA',[['MOVIE: HAPPY GILMORE (1996)',2,'movie'],['SILK STALKINGS',2]]],
 ['52','NICK',[['DOUG',1],['RUGRATS',1],['ARE YOU AFRAID OF THE DARK?',2]]],
 ['56','COMEDY',[['SOUTH PARK',1],['SOUTH PARK',1],['MYSTERY SCIENCE THEATER',2]]],
 ['60','CINE',[['MOVIE: KINGPIN (1996)',4,'movie']]],
 ['64','SCI',[['MOVIE: TERMINATOR 2 (1991)',4,'movie']]]];
const ADS=[['ad-fightmilk','FIGHT MILK','For bodyguards, by bodyguards'],['ad-brawndo','BRAWNDO','The Thirst Mutilator'],['ad-rumham','RUM HAM','A meal and a party in one']];
const WEATHER=[['TODAY','sun',74,58],['THU','part',69,55],['FRI','rain',62,51]];
// ---- the lounge music: a slow electric piano over a soft walking bass and brushes (original; plays until the guide closes)
function guideMusic(){const on=()=>!!store.profile?.settings?.music;const A=on()?audioContext():null;if(!A)return {stop(){},hiss(){}};
 const out=A.createGain();out.gain.value=.0001;out.gain.linearRampToValueAtTime(.32,A.currentTime+1.5);const lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;lp.connect(out);out.connect(A.destination);
 const note=(f,at,len,{type='sine',vol=.1,fm=0}={})=>{const o=A.createOscillator(),g=A.createGain();o.type=type;o.frequency.value=f;
  if(fm){const m=A.createOscillator(),mg=A.createGain();m.frequency.value=f*2;mg.gain.setValueAtTime(f*fm,at);mg.gain.exponentialRampToValueAtTime(f*.05+1,at+len*.6);m.connect(mg);mg.connect(o.frequency);m.start(at);m.stop(at+len+.1);}
  g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(vol,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+len);o.connect(g);g.connect(lp);o.start(at);o.stop(at+len+.05);};
 const hz=m=>440*Math.pow(2,(m-69)/12);
 // ii9 - V13 - Imaj9 - vi9 in F, two bars each; the bass walks
 const CH=[[50,53,57,60,64],[43,53,57,59,64],[41,52,55,57,60],[50,52,55,57,60]],BASS=[[38,41,45,48,43,47,50,53],[43,47,50,48,41,45,48,52],[41,45,48,47,45,48,52,50],[38,42,45,48,43,47,50,49]];
 const B=60/74;let bar=0,t0=A.currentTime+.2,stopped=false;
 function sched(){if(stopped)return;while(t0<A.currentTime+1.2){const c=CH[(bar>>1)%4],bs=BASS[(bar>>1)%4];
   if(bar%2===0){c.forEach((m,k)=>note(hz(m+12),t0+k*.012,B*3.6,{vol:.05,fm:1.2}));note(hz(c[4]+24),t0+B*2.5,B*1.2,{vol:.025,fm:.8});}
   else{c.slice(1).forEach((m,k)=>note(hz(m+12),t0+B*1.5+k*.01,B*2.2,{vol:.04,fm:1}));}
   for(let k=0;k<4;k++){note(hz(bs[(bar%2)*4+k]),t0+k*B,B*.95,{type:'triangle',vol:.13});
    const n=A.createBufferSource(),buf=A.createBuffer(1,A.sampleRate*.12,A.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
    const ng=A.createGain(),hp=A.createBiquadFilter();hp.type='highpass';hp.frequency.value=5000;ng.gain.value=k%2?.045:.025;n.buffer=buf;n.connect(hp);hp.connect(ng);ng.connect(lp);n.start(t0+k*B+(k%2?B*.66:0));}
   t0+=B*4;bar++;}}
 sched();const id=setInterval(sched,250);
 return {stop(){stopped=true;clearInterval(id);try{out.gain.cancelScheduledValues(A.currentTime);out.gain.setValueAtTime(out.gain.value,A.currentTime);out.gain.linearRampToValueAtTime(.0001,A.currentTime+.15);setTimeout(()=>out.disconnect(),400);}catch{}},
  // the channel change: a burst of TV static
  hiss(){if(!store.profile?.settings?.sound)return;const n=A.createBufferSource(),buf=A.createBuffer(1,A.sampleRate*.9,A.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
   const g=A.createGain();g.gain.setValueAtTime(.18,A.currentTime);g.gain.setValueAtTime(.18,A.currentTime+.7);g.gain.linearRampToValueAtTime(.0001,A.currentTime+.9);n.buffer=buf;n.connect(g);g.connect(A.destination);n.start();}};}
// ---- the guide picture (drawn into a 720 x 540 TV-size canvas, then put on the set's screen)
function makeGuide(){const cv=document.createElement('canvas');cv.width=GW;cv.height=GH;const g=cv.getContext('2d');
 const ROW_H=46,TOP=282,HEAD=26,CHW=112,SLOT=(GW-CHW-8)/4;
 const font=(px,w=900)=>`${w} ${px}px "Arial Narrow","Helvetica Neue",Arial,sans-serif`;
 const label=(str,x,y,px,col,{align='left',max=0,w=900}={})=>{g.font=font(px,w);if(max){const m=g.measureText(str).width;if(m>max)g.font=font(px*max/m,w);}g.textAlign=align;g.textBaseline='middle';g.fillStyle='rgba(0,0,0,.55)';g.fillText(str,x+2,y+2);g.fillStyle=col;g.fillText(str,x,y);};
 const box=(x,y,w,h,c1,c2,edge='#9ab8ff')=>{const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.fillRect(x,y,w,h);g.strokeStyle=edge;g.lineWidth=2;g.strokeRect(x+1,y+1,w-2,h-2);};
 const hits=[];
 function cover(img,x,y,w,h,z=1,px=.5,py=.5){const k=Math.max(w/img.width,h/img.height)*z,iw=img.width*k,ih=img.height*k;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.drawImage(img,x+(w-iw)*px,y+(h-ih)*py,iw,ih);g.restore();}
 function promo(t){const x=14,y=12,w=356,h=258;g.fillStyle='#000';g.fillRect(x,y,w,h);const slots=['guide-promo-1','guide-promo-2','guide-promo-3','guide-promo-4'].filter(n=>SS.picture(n));
  const per=5.5,k=Math.floor(t/per),f=(t%per)/per;let pic=slots.length?SS.picture(slots[k%slots.length]):null;
  if(pic)cover(pic,x,y,w,h,1.06+.08*f,.3+.4*f,.5);
  else{const logo=SS.picture('keyart:price-bid-off-logo');const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#2a0a5a');gr.addColorStop(1,'#c8102e');g.fillStyle=gr;g.fillRect(x,y,w,h);if(logo){const kk=Math.min(w*.8/logo.width,h*.6/logo.height);g.drawImage(logo,x+w/2-logo.width*kk/2,y+h*.42-logo.height*kk/2,logo.width*kk,logo.height*kk);}}
  // the promo text: yellow, like the guide's
  const sh=g.createLinearGradient(0,y+h*.55,0,y+h);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,10,.85)');g.fillStyle=sh;g.fillRect(x,y+h*.55,w,h*.45);
  const lines=[['THE PRICE IS RIGHT','TODAY 9:00 AM · CHANNEL 2'],['COME ON DOWN!','THE PRICE IS RIGHT · 9:00 AM'],['A NEW CAR!','THE PRICE IS RIGHT · CH 2 · 9 AM'],['SHOWCASE SHOWDOWN','TODAY 9:00 AM · CHANNEL 2']][k%4];
  label(lines[0],x+w/2,y+h-50,30,'#fff23a',{align:'center',max:w-20});label(lines[1],x+w/2,y+h-20,18,'#fff23a',{align:'center',max:w-20,w:800});
  g.strokeStyle='#cfd8ff';g.lineWidth=3;g.strokeRect(x,y,w,h);hits.push({x,y,w,h,pick:'episode'});}
 function sidePanel(t,clock){const x=382,y=12,w=GW-x-12,h=258;box(x,y,w,h,'#1c2f9e','#0a1250');const k=Math.floor(t/7)%3;
  // the clock bar is always on top
  box(x+8,y+8,w-16,52,'#3a54d8','#1a2a90','#cfe0ff');label(clock,x+20,y+34,30,'#fff');label('TUE · NOV 26',x+w-20,y+34,17,'#fff23a',{align:'right',w:800});
  const by=y+70,bh=h-78;
  if(k===0){label('NOW SHOWING',x+w/2,by+20,18,'#9fd0ff',{align:'center'});label('THE PRICE',x+w/2,by+62,34,'#fff23a',{align:'center',max:w-24});label('IS RIGHT',x+w/2,by+100,34,'#fff23a',{align:'center',max:w-24});
   label('9:00 AM  ·  CH 2  ·  KCBS',x+w/2,by+140,17,'#fff',{align:'center',w:800});label('TAP IT TO WATCH',x+w/2,by+168,15,'#9fd0ff',{align:'center',w:800});}
  else if(k===1){label('LOCAL FORECAST',x+w/2,by+18,18,'#9fd0ff',{align:'center'});const cw=(w-24)/3;
   WEATHER.forEach(([d,ic,hi,lo],i)=>{const cx=x+12+cw*(i+.5),cy=by+80;box(x+12+cw*i+3,by+34,cw-6,bh-44,'#2440c0','#10206a','#7aa0ff');label(d,cx,by+50,16,'#fff',{align:'center'});
    if(ic!=='rain'){g.fillStyle='#ffd23a';g.beginPath();g.arc(cx-(ic==='part'?8:0),cy,16,0,TAU);g.fill();for(let r=0;r<8;r++){const a=r/8*TAU+t*.4;g.strokeStyle='#ffd23a';g.lineWidth=3;g.beginPath();g.moveTo(cx-(ic==='part'?8:0)+Math.cos(a)*21,cy+Math.sin(a)*21);g.lineTo(cx-(ic==='part'?8:0)+Math.cos(a)*26,cy+Math.sin(a)*26);g.stroke();}}
    if(ic!=='sun'){g.fillStyle='#e8eef8';[[0,6,16],[14,4,13],[-14,8,12]].forEach(([dx,dy,r])=>{g.beginPath();g.arc(cx+dx+(ic==='part'?8:0),cy+dy,r,0,TAU);g.fill();});}
    if(ic==='rain'){g.strokeStyle='#7ac8ff';g.lineWidth=2;for(let r=0;r<5;r++){const yy=(t*60+r*13)%22;g.beginPath();g.moveTo(cx-16+r*8,cy+20+yy);g.lineTo(cx-19+r*8,cy+26+yy);g.stroke();}}
    label(`${hi}°`,cx,by+130,26,'#fff23a',{align:'center'});label(`${lo}°`,cx,by+158,17,'#9fd0ff',{align:'center'});});}
  else{const ad=ADS[Math.floor(t/21)%ADS.length],pic=SS.picture(ad[0]);label('Available TODAY at your',x+w/2,by+16,16,'#fff',{align:'center',w:800});label('local store!',x+w/2,by+36,16,'#fff',{align:'center',w:800});
   if(pic)cover(pic,x+14,by+50,w-28,bh-98,1.02);else{g.fillStyle='#000';g.fillRect(x+14,by+50,w-28,bh-98);}
   label(ad[1],x+w/2,by+bh-36,24,'#fff23a',{align:'center',max:w-20});label(ad[2],x+w/2,by+bh-14,14,'#fff',{align:'center',w:800,max:w-20});}}
 function grid(t){const top=TOP;// header: the time slots
  g.fillStyle='#0a1250';g.fillRect(0,top-4,GW,GH-top+4);box(4,top,CHW,HEAD,'#3a54d8','#1a2a90');label('TUE',4+CHW/2,top+HEAD/2,15,'#fff23a',{align:'center'});
  ['9:00 AM','9:30 AM','10:00 AM','10:30 AM'].forEach((s2,i)=>{box(CHW+4+i*SLOT,top,SLOT,HEAD,'#3a54d8','#1a2a90');label(s2,CHW+12+i*SLOT,top+HEAD/2,15,'#fff');});
  // the rows crawl up and wrap round
  const y0=top+HEAD+2,area=GH-y0,speed=15,total=ROWS.length*ROW_H,off=(t*speed)%total;g.save();g.beginPath();g.rect(0,y0,GW,area);g.clip();
  for(let r=0;r<ROWS.length+Math.ceil(area/ROW_H)+1;r++){const row=ROWS[r%ROWS.length],y=y0+r*ROW_H-off;if(y>GH||y+ROW_H<y0)continue;
   box(4,y+1,CHW,ROW_H-2,'#2238b8','#0e1a78','#6f8cff');label(row[0],12,y+ROW_H/2,24,'#fff');label(row[1],CHW-4,y+ROW_H/2,16,'#fff23a',{align:'right'});
   let sx=0;for(const [title,len,kind] of row[2]){const x=CHW+4+sx*SLOT,w=len*SLOT;sx+=len;
    const lit=kind==='tpir'||kind==='menu',pulse=.5+.5*Math.sin(t*4);
    if(kind==='movie')box(x,y+1,w,ROW_H-2,'#8a1e3a','#4a0c1e','#d87a98');else if(lit)box(x,y+1,w,ROW_H-2,`rgb(${120+40*pulse},${200+30*pulse},255)`,'#3a8ad8','#ffffff');else box(x,y+1,w,ROW_H-2,'#2a44c8','#132290','#7a96ff');
    label(title,x+8,y+ROW_H/2,19,lit?'#06124a':'#fff',{max:w-14});if(lit)hits.push({x,y,w,h:ROW_H,pick:kind==='tpir'?'episode':'menu'});}}
  g.restore();}
 return {cv,hits,draw(t,clock){hits.length=0;g.setTransform(1,0,0,1,0,0);g.fillStyle='#08104a';g.fillRect(0,0,GW,GH);promo(t);sidePanel(t,clock);grid(t);}};}
// ---- TV static frames (made once)
let STATIC=null;function staticFrames(){if(STATIC)return STATIC;STATIC=[0,1,2,3].map(()=>{const c=document.createElement('canvas');c.width=180;c.height=135;const g=c.getContext('2d'),im=g.createImageData(180,135);
 for(let i=0;i<im.data.length;i+=4){const v=Math.random()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}g.putImageData(im,0,0);return c;});return STATIC;}
async function runGuide(s,{onePlayer=false}={}){
 const [c,x]=s.canvas(900,560,{fill:true});fullBleed(s,{bg:'#120c08'});
 await SS.ready(['tv-frame','tv-frame-tall','tv-frame-fold','guide-promo-1','guide-promo-2','guide-promo-3','guide-promo-4',...ADS.map(a=>a[0]),'keyart:price-bid-off-logo'],3500);if(!s.alive)return null;
 const G=makeGuide(),mus=guideMusic();s.cleanup(()=>mus.stop());
 let t=0,phase='guide',phT=0,pick=null,alone=false,screen={x:0,y:0,w:0,h:0},osd=null,choice=[];
 const clockAt=()=>{const sec=Math.floor(t)%60;return `8:59:${String(sec).padStart(2,'0')}`;};
 // the set for this screen shape, laid to cover the screen; the guide goes on its screen hole
 function layout(){const W=s.W,H=s.H,sh=require("src/bgShape.js").shape(W,H),slot=sh==='tall'?'tv-frame-tall':sh==='fold'?'tv-frame-fold':'tv-frame',pic=SS.picture(slot)||SS.picture('tv-frame'),geo=SS.TV_GEOM[pic===SS.picture(slot)?slot:'tv-frame'];
  if(!pic){const w=Math.min(W*.9,(H-60)*4/3),h=w*.75;return {pic:null,screen:{x:(W-w)/2,y:(H-h)/2,w,h}};}
  // cover, but never cut the screen: zoom out until the whole screen hole fits on the phone, screen centred across
  const [sx,sy,sw,shh]=geo.screen,k0=Math.max(W/pic.width,H/pic.height),k=Math.min(k0,(W-12)/sw,(H-56)/shh);
  const fx=W/2-(sx+sw/2)*k;let fy=(H-pic.height*k)/2;if(fy+sy*k<46)fy=46-sy*k;if(fy+(sy+shh)*k>H-6)fy=H-6-(sy+shh)*k;
  return {pic,k,fx,fy,screen:{x:fx+sx*k,y:fy+sy*k,w:sw*k,h:shh*k}};}
 function draw(){const g=x,W=s.W,H=s.H;g.setTransform(s.dpr||1,0,0,s.dpr||1,0,0);g.fillStyle='#120c08';g.fillRect(0,0,W,H);const L=layout();screen=L.screen;const S=screen;
  // the room round the set: the same picture, bigger and darker, where the set doesn't reach the phone's edges
  if(L.pic){const k0=Math.max(W/L.pic.width,H/L.pic.height)*1.15;g.globalAlpha=.45;g.drawImage(L.pic,(W-L.pic.width*k0)/2,(H-L.pic.height*k0)/2,L.pic.width*k0,L.pic.height*k0);g.globalAlpha=1;g.fillStyle='rgba(10,6,4,.45)';g.fillRect(0,0,W,H);}
  // what the TV shows
  g.save();g.beginPath();g.roundRect(S.x,S.y,S.w,S.h,S.w*.05);g.clip();
  if(phase==='guide'||phase==='tune'&&phT<.25){G.draw(t,clockAt());g.imageSmoothingEnabled=true;g.drawImage(G.cv,S.x,S.y,S.w,S.h);}
  else{// static, then the blue screen with the channel number while the show comes on
   if(phase==='tune'&&phT<1.15){const fr=staticFrames()[Math.floor(t*30)%4];g.imageSmoothingEnabled=false;g.drawImage(fr,S.x,S.y,S.w,S.h);g.fillStyle=`rgba(0,0,0,${.15+.15*Math.sin(t*50)})`;g.fillRect(S.x,S.y+((t*400)%S.h),S.w,S.h*.08);}
   else{g.fillStyle='#000';g.fillRect(S.x,S.y,S.w,S.h);}}
  // CRT: scanlines, a curved-glass vignette and the reflection of the room
  g.globalAlpha=.16;g.fillStyle='#000';const step=Math.max(2,S.h/240);for(let yy=S.y;yy<S.y+S.h;yy+=step*2)g.fillRect(S.x,yy,S.w,step*.9);g.globalAlpha=1;
  const vg=g.createRadialGradient(S.x+S.w/2,S.y+S.h/2,Math.min(S.w,S.h)*.35,S.x+S.w/2,S.y+S.h/2,Math.max(S.w,S.h)*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=vg;g.fillRect(S.x,S.y,S.w,S.h);
  const rf=g.createLinearGradient(S.x,S.y,S.x+S.w*.6,S.y+S.h*.5);rf.addColorStop(0,'rgba(255,255,255,.10)');rf.addColorStop(.4,'rgba(255,255,255,.03)');rf.addColorStop(.41,'rgba(255,255,255,0)');g.fillStyle=rf;g.fillRect(S.x,S.y,S.w,S.h);
  g.globalAlpha=.04+.02*Math.sin(t*60);g.fillStyle='#fff';g.fillRect(S.x,S.y,S.w,S.h);g.globalAlpha=1;
  // the channel OSD, green, in the corner
  if(osd){const fs=S.h*.11;g.font=`900 ${fs}px "Courier New",monospace`;g.textAlign='right';g.textBaseline='top';g.fillStyle='rgba(0,0,0,.6)';g.fillText(osd,S.x+S.w*.94+3,S.y+S.h*.07+3);g.fillStyle='#3cff4a';g.shadowColor='#3cff4a';g.shadowBlur=fs*.3;g.fillText(osd,S.x+S.w*.94,S.y+S.h*.07);g.shadowBlur=0;}
  // 1 player: alone or vs the CPU, as an on-screen menu in the same green
  choice=[];if(phase==='players'){const fs=S.h*.085;g.font=`900 ${fs}px "Courier New",monospace`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#3cff4a';g.shadowColor='#3cff4a';g.shadowBlur=fs*.3;
   g.fillText('1 PLAYER',S.x+S.w/2,S.y+S.h*.3);[['PLAY ALONE',true],['VS CPU',false]].forEach(([l,v],i)=>{const by=S.y+S.h*(.5+i*.2),bw=S.w*.62,bh=fs*1.6;g.strokeStyle='#3cff4a';g.lineWidth=3;g.strokeRect(S.x+S.w/2-bw/2,by-bh/2,bw,bh);g.fillText(l,S.x+S.w/2,by);choice.push({x:S.x+S.w/2-bw/2,y:by-bh/2,w:bw,h:bh,v});});g.shadowBlur=0;}
  g.restore();
  // the set over it
  if(L.pic)g.drawImage(L.pic,L.fx,L.fy,L.pic.width*L.k,L.pic.height*L.k);else{g.strokeStyle='#5a3a1a';g.lineWidth=S.w*.05;g.strokeRect(S.x-S.w*.03,S.y-S.w*.03,S.w*1.06,S.h+S.w*.06);}
  if(phase==='guide'){const fs=clamp(Math.min(W,H)*.035,12,20);g.font=`800 ${fs}px "SC Nunito",sans-serif`;g.textAlign='center';g.textBaseline='bottom';g.fillStyle=`rgba(255,240,170,${.6+.4*Math.sin(t*3)})`;
   g.fillText('Tap THE PRICE IS RIGHT to watch',W/2,Math.min(H-8,S.y+S.h+fs*2.6));}}
 let done=null;const finished=new Promise(r=>{done=r;});
 function tune(p){if(phase!=='guide')return;pick=p;phase='tune';phT=0;mus.stop();mus.hiss();vibrate(15);}
 s.on(c,'pointerdown',ev=>{if(s.paused)return;ev.preventDefault();const pt=s.pointer(ev);
  if(phase==='players'){for(const b of choice)if(pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h){alone=b.v;vibrate(10);done({pick,alone});phase='done';}return;}
  if(phase!=='guide')return;const S=screen;if(pt.x<S.x||pt.x>S.x+S.w||pt.y<S.y||pt.y>S.y+S.h)return;const gx=(pt.x-S.x)/S.w*GW,gy=(pt.y-S.y)/S.h*GH;
  for(const h of G.hits)if(gx>=h.x&&gx<=h.x+h.w&&gy>=h.y&&gy<=h.y+h.h){tune(h.pick);return;}});
 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;phT+=dt;
  if(phase==='tune'){if(phT>.25)osd=pick==='menu'?'CH 03':'CH 02';if(phT>1.9){osd=null;if(pick==='episode'&&onePlayer){phase='players';}else{phase='done';done({pick,alone:false});}}}
  if(phase!=='done')draw();});
 s.debug={guide:true,get screen(){return screen;},get phase(){return phase;},get hits(){return G.hits;},tune:p=>tune(p||'episode'),players:v=>{if(phase==='players'){alone=!!v;phase='done';done({pick,alone});}}};
 return finished;}
Object.assign(exports,{runGuide,ROWS});
