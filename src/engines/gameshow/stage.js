// Shared studio for the game-show games (PLINKO, THE BIG WHEEL): the set, the rising curtain, our own host and two show
// assistants (original designs, drawn here until the owner's pictures arrive via src/data/showSprites.js), contestant name
// tags with the players' faces, lit-up logos, speech bubbles, and an original game-show sound kit (music bed, crowd, fanfares,
// pegs, wheel clicker). No real show's music, logos or people.
const SS=require("src/data/showSprites.js");
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const TAU=Math.PI*2;
// ---- pictures
function cover(g,img,W,H){const k=Math.max(W/img.width,H/img.height),w=img.width*k,h=img.height*k;g.drawImage(img,(W-w)/2,(H-h)/2,w,h);}
// the studio behind everything; kind 'plinko' | 'wheel'
function drawStage(g,W,H,kind,t){const tall=H>W*1.05,pic=SS.picture(`stage-${kind}${tall?'-tall':''}`)||SS.picture(`stage-${kind}`);
 if(pic){cover(g,pic,W,H);return;}
 const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,kind==='wheel'?'#1a0a3a':'#2a0a2e');bg.addColorStop(.62,kind==='wheel'?'#3a1666':'#5a1240');bg.addColorStop(.63,'#1a1410');bg.addColorStop(1,'#060504');g.fillStyle=bg;g.fillRect(0,0,W,H);
 // big round bulb discs and colour stripes like a 70s set
 const fy=H*.63,cols=['#ff4fa0','#ffb12b','#2fd0ff','#7dff5a','#b05cff','#ff5a3c'];
 for(let i=0;i<9;i++){const x=W*(i+.5)/9,r=Math.min(W,H)*.09,y=fy*.42+Math.sin(i*1.7)*fy*.12;g.fillStyle=cols[i%6]+'55';g.beginPath();g.arc(x,y,r*1.25,0,TAU);g.fill();
  g.fillStyle=cols[(i+2)%6];g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(x-r*.3,y-r*.3,r*.45,0,TAU);g.fill();
  for(let k=0;k<12;k++){const a=k/12*TAU,on=((k+Math.floor(t*6))%3)===0;g.fillStyle=on?'#fff7c2':'#8a6a2a';g.beginPath();g.arc(x+Math.cos(a)*r*1.12,y+Math.sin(a)*r*1.12,Math.max(1.5,r*.07),0,TAU);g.fill();}}
 for(let i=0;i<14;i++){g.fillStyle=cols[i%6]+'40';g.fillRect(W*i/14,fy*.78,W/28,fy*.22);}
 // marquee bulbs along the top and the stage edge
 const bulbs=(y,n)=>{for(let i=0;i<n;i++){const on=(i+Math.floor(t*8))%4<2;g.fillStyle=on?'#fff3b0':'#6e5420';g.beginPath();g.arc(W*(i+.5)/n,y,Math.max(2,W/n*.22),0,TAU);g.fill();}};bulbs(Math.max(6,H*.012),Math.round(W/22));bulbs(fy,Math.round(W/22));
 // shiny floor with a reflection and an audience edge
 const fl=g.createLinearGradient(0,fy,0,H);fl.addColorStop(0,'#3a2c1c');fl.addColorStop(1,'#0c0805');g.fillStyle=fl;g.fillRect(0,fy+4,W,H-fy);
 g.globalAlpha=.12;g.fillStyle='#ffe9a8';for(let i=0;i<7;i++){g.beginPath();g.ellipse(W*(i+.5)/7,fy+(H-fy)*.25,W*.05,(H-fy)*.1,0,0,TAU);g.fill();}g.globalAlpha=1;
 g.fillStyle='#000';for(let i=0;i<40;i++){const x=W*(i+.5)/40,y=H-2+Math.sin(i*2.3)*3,r=W/40*.62;g.beginPath();g.arc(x,y,r,Math.PI,0);g.fill();}}
// the curtain going up (open 0 = shut, 1 = gone)
function drawCurtain(g,W,H,open,t){if(open>=1)return;const y=-H*open*open*1.05,pic=SS.picture('curtain');g.save();g.translate(0,y);
 if(pic)cover(g,pic,W,H);else{const n=Math.ceil(W/38);for(let i=0;i<n;i++){const x=i*W/n,gr=g.createLinearGradient(x,0,x+W/n,0);gr.addColorStop(0,'#6a0a1e');gr.addColorStop(.5,'#c8183a');gr.addColorStop(1,'#5a0618');g.fillStyle=gr;g.fillRect(x,0,W/n+1,H);}
  g.globalAlpha=.55;for(let i=0;i<120;i++){const sx=(i*97.3%W),sy=(i*57.1%H),tw=.5+.5*Math.sin(t*5+i);g.fillStyle=`rgba(255,240,200,${tw})`;g.fillRect(sx,sy,2,2);}g.globalAlpha=1;
  g.fillStyle='#ffd23f';g.fillRect(0,H-10,W,10);}
 g.restore();}
// ---- people. Sheets have their feet at the bottom middle; drawn figures stand on (x,y) and are h tall.
function sheetFrame(g,img,def,frame,x,y,h,flip){const fw=img.width/def.frames.length,fh=img.height,k=h/fh;g.save();g.translate(x,y);if(flip)g.scale(-1,1);
 g.drawImage(img,frame*fw,0,fw,fh,-fw*k/2,-fh*k,fw*k,fh*k);g.restore();}
// our host: a silver-haired showman in a light grey suit with a thin long microphone
function drawHost(g,x,y,h,pose='talk',t=0,flip=false){const pic=SS.picture('host');const f=Math.max(0,SS.HOST.frames.indexOf(pose));if(pic)return sheetFrame(g,pic,SS.HOST,f,x,y,h,flip);
 const u=h/100,bob=Math.sin(t*3)*u*.6;g.save();g.translate(x,y);if(flip)g.scale(-1,1);g.lineCap='round';g.lineJoin='round';
 // legs + shoes
 g.fillStyle='#8f949c';g.fillRect(-9*u,-46*u,8*u,44*u);g.fillRect(1*u,-46*u,8*u,44*u);g.fillStyle='#16120f';g.fillRect(-11*u,-4*u,11*u,4*u);g.fillRect(0,-4*u,12*u,4*u);
 // jacket
 g.fillStyle='#aab0b9';g.beginPath();g.moveTo(-15*u,-80*u+bob);g.lineTo(15*u,-80*u+bob);g.lineTo(13*u,-44*u);g.lineTo(-13*u,-44*u);g.closePath();g.fill();
 g.fillStyle='#fff';g.beginPath();g.moveTo(-4*u,-80*u+bob);g.lineTo(4*u,-80*u+bob);g.lineTo(0,-62*u);g.fill();g.fillStyle='#b0122a';g.beginPath();g.moveTo(-1.6*u,-79*u+bob);g.lineTo(1.6*u,-79*u+bob);g.lineTo(0,-64*u);g.fill();
 g.strokeStyle='#7f858e';g.lineWidth=1.2*u;g.beginPath();g.moveTo(-4*u,-80*u+bob);g.lineTo(-2*u,-55*u);g.moveTo(4*u,-80*u+bob);g.lineTo(2*u,-55*u);g.stroke();
 // arms: the mic hand always up by the mouth, the other by pose
 g.strokeStyle='#aab0b9';g.lineWidth=6*u;g.beginPath();g.moveTo(13*u,-76*u+bob);g.lineTo(17*u,-64*u);g.lineTo(8*u,-78*u+bob);g.stroke();
 g.strokeStyle='#0c0c0e';g.lineWidth=1.2*u;g.beginPath();g.moveTo(7*u,-79*u+bob);g.lineTo(5*u,-92*u+bob);g.stroke();g.fillStyle='#222';g.beginPath();g.ellipse(5*u,-93*u+bob,1.6*u,2.6*u,0,0,TAU);g.fill();
 const other=pose==='point'?[[-14*u,-76*u+bob],[-30*u,-82*u]]:pose==='cheer'?[[-14*u,-76*u+bob],[-22*u,-100*u+bob]]:[[-14*u,-76*u+bob],[-18*u,-56*u]];
 g.strokeStyle='#aab0b9';g.lineWidth=6*u;g.beginPath();g.moveTo(...other[0]);g.lineTo(...other[1]);g.stroke();g.fillStyle='#d9a47c';g.beginPath();g.arc(other[1][0],other[1][1],3*u,0,TAU);g.fill();g.beginPath();g.arc(8*u,-78*u+bob,3*u,0,TAU);g.fill();
 // head: tanned face, big silver hair, white smile
 g.fillStyle='#d9a47c';g.fillRect(-3*u,-85*u+bob,6*u,6*u);g.beginPath();g.ellipse(0,-92*u+bob,7.5*u,9*u,0,0,TAU);g.fill();
 g.fillStyle='#e9ecf1';g.beginPath();g.ellipse(0,-99*u+bob,9*u,5.5*u,0,Math.PI,TAU);g.fill();g.beginPath();g.ellipse(-7*u,-95*u+bob,2.6*u,5*u,0,0,TAU);g.fill();g.beginPath();g.ellipse(7*u,-95*u+bob,2.6*u,5*u,0,0,TAU);g.fill();
 g.fillStyle='#2a1a10';g.beginPath();g.arc(-3*u,-93*u+bob,1*u,0,TAU);g.arc(3*u,-93*u+bob,1*u,0,TAU);g.fill();
 const talk=Math.max(0,Math.sin(t*14))*1.6*u;g.fillStyle='#fff';g.beginPath();g.ellipse(0,-87.5*u+bob,3.4*u,1*u+talk*.5,0,0,TAU);g.fill();
 g.restore();}
// a show assistant in a sparkly gown; variant 0 = blue sequins, 1 = red sequins
function drawModel(g,x,y,h,pose='present',t=0,variant=0,flip=false){const pic=SS.picture(variant?'model-2':'model')||SS.picture('model');const f=Math.max(0,SS.MODEL.frames.indexOf(pose));if(pic)return sheetFrame(g,pic,SS.MODEL,f,x,y,h,flip);
 const u=h/100,sway=Math.sin(t*2+variant)*u*.8,gown=variant?['#d81f4a','#ff7a9a']:['#1f6fd8','#8fd0ff'],hair=variant?'#3a1c0c':'#f1cf6a';g.save();g.translate(x,y);if(flip)g.scale(-1,1);
 const gr=g.createLinearGradient(-12*u,0,12*u,0);gr.addColorStop(0,gown[0]);gr.addColorStop(.5,gown[1]);gr.addColorStop(1,gown[0]);g.fillStyle=gr;
 g.beginPath();g.moveTo(-6*u+sway,-78*u);g.lineTo(6*u+sway,-78*u);g.quadraticCurveTo(7*u,-60*u,5*u,-50*u);g.lineTo(13*u,0);g.lineTo(-13*u,0);g.lineTo(-5*u,-50*u);g.quadraticCurveTo(-7*u,-60*u,-6*u+sway,-78*u);g.fill();
 for(let i=0;i<26;i++){const px=Math.sin(i*12.9)*10*u,py=-(i*37%76)*u,tw=(Math.sin(t*6+i*1.3)+1)/2;if(Math.abs(px)>(7+(-py<50?7*(50+py)/50:0))*u)continue;g.fillStyle=`rgba(255,255,255,${.25+.6*tw})`;g.fillRect(px+sway,py,1.2*u,1.2*u);}
 g.strokeStyle='#e6b38e';g.lineWidth=3.2*u;g.lineCap='round';
 const arm=pose==='wave'?[[-6*u+sway,-76*u],[-12*u,-90*u+Math.sin(t*9)*3*u]]:pose==='clap'?[[-6*u+sway,-76*u],[0,-70*u+Math.abs(Math.sin(t*10))*3*u]]:[[-6*u+sway,-76*u],[-24*u,-72*u]];
 g.beginPath();g.moveTo(...arm[0]);g.quadraticCurveTo(arm[0][0]-4*u,arm[0][1]+8*u,arm[1][0],arm[1][1]);g.stroke();
 const arm2=pose==='clap'?[0,-70*u]:[8*u,-56*u];g.beginPath();g.moveTo(6*u+sway,-76*u);g.lineTo(...arm2);g.stroke();
 g.fillStyle='#e6b38e';g.fillRect(-1.5*u+sway,-84*u,3*u,6*u);g.beginPath();g.ellipse(sway,-89*u,5.4*u,6.6*u,0,0,TAU);g.fill();
 g.fillStyle=hair;g.beginPath();g.ellipse(sway,-92*u,7.5*u,6*u,0,Math.PI*.95,TAU*1.03);g.fill();g.beginPath();g.ellipse(-5*u+sway,-84*u,3*u,9*u,.15,0,TAU);g.fill();g.beginPath();g.ellipse(5*u+sway,-84*u,3*u,9*u,-.15,0,TAU);g.fill();
 g.fillStyle='#c2183a';g.beginPath();g.ellipse(sway,-85.5*u,1.8*u,.9*u,0,0,TAU);g.fill();g.fillStyle='#22140c';g.beginPath();g.arc(-2.2*u+sway,-89.5*u,.8*u,0,TAU);g.arc(2.2*u+sway,-89.5*u,.8*u,0,TAU);g.fill();
 g.restore();}
// contestant: the player's face over a drawn body and a price-tag name tag on the chest
function drawContestant(g,s,i,x,y,h,name,{mood='normal',color='#ff4fa0',jump=0}={}){const u=h/100;g.save();g.translate(x,y-jump*u*14);
 g.fillStyle='#2b3550';g.fillRect(-8*u,-44*u,7*u,42*u);g.fillRect(1*u,-44*u,7*u,42*u);g.fillStyle=color;g.beginPath();g.roundRect(-13*u,-80*u,26*u,38*u,5*u);g.fill();
 g.strokeStyle=color;g.lineWidth=5*u;g.lineCap='round';g.beginPath();g.moveTo(-12*u,-76*u);g.lineTo(-18*u-jump*4*u,-56*u-jump*30*u);g.moveTo(12*u,-76*u);g.lineTo(18*u+jump*4*u,-56*u-jump*30*u);g.stroke();
 if(s)s.sprite(g,i,0,-92*u,26*u,{exact:true,still:true,mood});
 nameTag(g,0,-66*u,h*.2,name);g.restore();}
function nameTag(g,x,y,w,name){const pic=SS.picture('nametag'),h=w*.5;g.save();g.translate(x,y);
 if(pic)g.drawImage(pic,-w/2,-h/2,w,h);else{g.fillStyle='#fff8dc';g.beginPath();g.moveTo(-w/2+h*.35,-h/2);g.lineTo(w/2,-h/2);g.lineTo(w/2,h/2);g.lineTo(-w/2+h*.35,h/2);g.lineTo(-w/2,0);g.closePath();g.fill();g.strokeStyle='#c8102e';g.lineWidth=Math.max(1,w*.03);g.stroke();
  g.fillStyle='#222';g.beginPath();g.arc(-w/2+h*.32,0,h*.1,0,TAU);g.fill();}
 g.fillStyle='#c8102e';g.textAlign='center';g.textBaseline='middle';const fs=Math.min(h*.62,w*1.5/Math.max(4,name.length));g.font=`900 ${fs}px "SC Bangers","SC Nunito",Impact,sans-serif`;g.fillText(name.toUpperCase(),h*.18,1);g.restore();}
// lit-up logo: picture slot, or big outlined letters with chasing bulbs round a panel
function drawLogo(g,slot,text,cx,cy,w,t,{cols=['#ffe23a','#ff3d6e']}={}){const pic=SS.picture(slot);if(pic){const h=w*pic.height/pic.width;g.drawImage(pic,cx-w/2,cy-h/2,w,h);return h;}
 const h=w*.32;g.save();g.fillStyle='#14062e';g.beginPath();g.roundRect(cx-w/2,cy-h/2,w,h,h*.3);g.fill();g.lineWidth=Math.max(2,h*.05);g.strokeStyle=cols[0];g.stroke();
 const n=Math.round(w/14);for(let i=0;i<n;i++){const f=i/n,per=2*(w+h),d=f*per,on=(i+Math.floor(t*10))%3===0;let px,py;if(d<w){px=cx-w/2+d;py=cy-h/2;}else if(d<w+h){px=cx+w/2;py=cy-h/2+d-w;}else if(d<2*w+h){px=cx+w/2-(d-w-h);py=cy+h/2;}else{px=cx-w/2;py=cy+h/2-(d-2*w-h);}
  g.fillStyle=on?'#fff7c2':'#7a5a1e';g.beginPath();g.arc(px,py,Math.max(1.5,h*.035),0,TAU);g.fill();}
 const fs=Math.min(h*.72,w*1.55/Math.max(3,text.length));g.font=`900 ${fs}px "SC Bangers",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';
 g.lineWidth=fs*.14;g.strokeStyle='#000';g.strokeText(text,cx,cy+fs*.04);const gr=g.createLinearGradient(0,cy-fs/2,0,cy+fs/2);gr.addColorStop(0,'#fff7c2');gr.addColorStop(.5,cols[0]);gr.addColorStop(1,cols[1]);g.fillStyle=gr;g.fillText(text,cx,cy+fs*.04);g.restore();return h;}
// a speech bubble pointing at (px,py)
function bubble(g,x,y,text,maxW,fs,px,py){g.save();g.font=`800 ${fs}px "SC Nunito",sans-serif`;const words=text.split(' '),lines=[];let cur='';for(const w of words){const tt=cur?cur+' '+w:w;if(g.measureText(tt).width>maxW&&cur){lines.push(cur);cur=w;}else cur=tt;}if(cur)lines.push(cur);
 const bw=Math.min(maxW,Math.max(...lines.map(l=>g.measureText(l).width)))+fs*1.2,bh=lines.length*fs*1.25+fs*.8;const bx=x-bw/2,by=y-bh;
 g.fillStyle='#fff';g.strokeStyle='#14062e';g.lineWidth=2;g.beginPath();g.roundRect(bx,by,bw,bh,fs*.6);g.fill();g.stroke();
 if(px!=null){const ax=clampN(px,bx+fs,bx+bw-fs),dx=px-ax,dy=py-y,d=Math.hypot(dx,dy)||1,L=Math.min(d,fs*1.8),tx=ax+dx/d*L,ty=y+Math.max(fs*.6,dy/d*L);
  g.beginPath();g.moveTo(ax-fs*.45,y-1);g.lineTo(tx,ty);g.lineTo(ax+fs*.45,y-1);g.closePath();g.fill();g.stroke();g.fillRect(ax-fs*.5,y-2.5,fs,3);}
 g.fillStyle='#14062e';g.textAlign='center';g.textBaseline='top';lines.forEach((l,k)=>g.fillText(l,x,by+fs*.4+k*fs*1.25));g.restore();return bh;}
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
// a big flashing money / message banner
function moneyBanner(g,W,H,big,small,a=1,col='#ffe23a'){g.save();g.globalAlpha=a;const fs=Math.min(W,H)*.09,y=H*.4;g.fillStyle='rgba(20,6,46,.82)';g.fillRect(0,y-fs*1.2,W,fs*(small?2.9:2.2));
 g.font=`900 ${Math.min(fs*1.5,W*1.5/Math.max(4,big.length))}px "SC Bangers",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=fs*.14;g.strokeStyle='#000';g.strokeText(big,W/2,y);g.fillStyle=col;g.fillText(big,W/2,y);
 if(small){g.font=`800 ${fs*.42}px "SC Nunito",sans-serif`;g.fillStyle='#fff';g.fillText(small,W/2,y+fs*1.05);}g.restore();}
// ---- sound: an original 70s game-show kit (synth brass + bass + drums bed, crowd, fanfares)
function createShowSound(){const on=()=>!!store.profile?.settings?.sound;let A=null,out=null,musicOn=false,musicT=0,timer=null,noiseB=null;
 const ac=()=>{if(!on())return null;A=audioContext();if(!A)return null;if(!out){out=A.createGain();out.gain.value=.55;out.connect(A.destination);}return A;};
 const noise=()=>{if(noiseB)return noiseB;const n=A.sampleRate,b=A.createBuffer(1,n,n),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return noiseB=b;};
 function tone(f,dur,{type='square',vol=.08,to=null,at=0,att=.005,dest=null}={}){const a=ac();if(!a)return;const t0=a.currentTime+at,o=a.createOscillator(),gn=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(to)o.frequency.exponentialRampToValueAtTime(to,t0+dur);
  gn.gain.setValueAtTime(0,t0);gn.gain.linearRampToValueAtTime(vol,t0+att);gn.gain.exponentialRampToValueAtTime(.0008,t0+dur);o.connect(gn);gn.connect(dest||out);o.start(t0);o.stop(t0+dur+.05);}
 function hiss(dur,{vol=.1,f=1800,q=.8,at=0,type='bandpass',swell=false}={}){const a=ac();if(!a)return;const t0=a.currentTime+at,src=a.createBufferSource(),bf=a.createBiquadFilter(),gn=a.createGain();src.buffer=noise();src.loop=true;bf.type=type;bf.frequency.value=f;bf.Q.value=q;
  gn.gain.setValueAtTime(swell?0:vol,t0);if(swell)gn.gain.linearRampToValueAtTime(vol,t0+dur*.35);gn.gain.exponentialRampToValueAtTime(.0008,t0+dur);src.connect(bf);bf.connect(gn);gn.connect(out);src.start(t0);src.stop(t0+dur+.05);}
 const brass=(f,dur,at,vol=.05)=>{tone(f,dur,{type:'sawtooth',vol,at,att:.02});tone(f*1.005,dur,{type:'sawtooth',vol:vol*.7,at,att:.03});tone(f/2,dur,{type:'square',vol:vol*.4,at,att:.02});};
 const sfx={
  peg:(k=0)=>tone(1500+((k*137)%7)*90,.05,{type:'triangle',vol:.05}),          // a chip ticking off a peg
  click:()=>{tone(2400,.018,{type:'square',vol:.035});hiss(.03,{vol:.05,f:4000,q:2});}, // the wheel's flapper
  drop:()=>tone(660,.12,{type:'triangle',vol:.06,to:330}),
  ding:()=>{tone(1318,.5,{type:'sine',vol:.09});tone(1975,.4,{type:'sine',vol:.04,at:.02});},
  slot:v=>{if(v>=10000)return sfx.jackpot();if(!v)return sfx.zero();[523,659,784].forEach((f,i)=>tone(f*(v>=1000?1.5:1),.16,{type:'square',vol:.05,at:i*.07}));},
  zero:()=>{[392,370,349,262].forEach((f,i)=>brass(f,i===3?.7:.22,i*.24,.045));sfx.aww(.6);},
  jackpot:()=>{[523,659,784,1046,784,1046,1318].forEach((f,i)=>brass(f,i===6?.9:.14,i*.11,.05));sfx.cheer(2.6,.18);},
  fanfare:()=>{[392,523,659,784,659,784,1046].forEach((f,i)=>brass(f,i===6?.8:.13,i*.12,.045));},
  dollar:()=>{for(let i=0;i<10;i++)tone(i%2?1568:2093,.09,{type:'square',vol:.05,at:i*.08});sfx.cheer(2.4,.2);},
  over:()=>{tone(180,.55,{type:'sawtooth',vol:.08,to:120});sfx.aww(.4);},
  buzz:()=>tone(110,.45,{type:'square',vol:.07}),
  cheer:(dur=1.6,vol=.13)=>{hiss(dur,{vol,f:1600,q:.6,swell:true});for(let i=0;i<Math.round(dur*14);i++)hiss(.04,{vol:vol*.6,f:2500+Math.random()*1500,q:3,at:Math.random()*dur*.85});},
  aww:(at=0)=>{const a=ac();if(!a)return;const t0=a.currentTime+at,src=a.createBufferSource(),bf=a.createBiquadFilter(),gn=a.createGain();src.buffer=noise();src.loop=true;bf.type='bandpass';bf.Q.value=4;bf.frequency.setValueAtTime(900,t0);bf.frequency.exponentialRampToValueAtTime(380,t0+1.2);
   gn.gain.setValueAtTime(0,t0);gn.gain.linearRampToValueAtTime(.16,t0+.2);gn.gain.exponentialRampToValueAtTime(.001,t0+1.3);src.connect(bf);bf.connect(gn);gn.connect(out);src.start(t0);src.stop(t0+1.4);},
  applause:(dur=2.2)=>{for(let i=0;i<Math.round(dur*30);i++)hiss(.035,{vol:.06,f:1800+Math.random()*2200,q:2.5,at:Math.random()*dur});},
  drumroll:(dur=1.4)=>{for(let i=0;i<Math.round(dur*26);i++)hiss(.03,{vol:.04+.06*i/(dur*26),f:2600,q:1.2,at:i/26});},
  comeOn:()=>{[523,523,659,784,1046].forEach((f,i)=>brass(f,i===4?.7:.12,i*.13,.05));sfx.cheer(2.8,.16);},
  tick:()=>tone(1800,.015,{type:'square',vol:.025})};
 // music bed: an original bouncy brass vamp (I-vi-IV-V in C), quiet under the play
 const prog=[[262,330,392],[220,262,330],[175,220,262],[196,247,294]],BPM=126;
 function bar(n){const a=ac();if(!a)return;const b=60/BPM,ch=prog[n%4];for(let k=0;k<4;k++){tone(ch[0]/2,b*.45,{type:'triangle',vol:.06,at:k*b});tone(60,b*.2,{type:'sine',vol:k%2?0:.12,at:k*b,to:40});if(k%2)hiss(.08,{vol:.05,f:3000,q:.7,at:k*b});hiss(.03,{vol:.02,f:8000,q:.7,at:k*b+b/2});}
  if(n%2===0)ch.forEach(f=>brass(f*2,b*.3,b*.5,.016));else ch.forEach(f=>brass(f*2,b*.25,b*1.5,.013));}
 function music(onOff){if(onOff===musicOn)return;musicOn=onOff;clearInterval(timer);if(!onOff||!store.profile?.settings?.music)return;let n=0;bar(n++);timer=setInterval(()=>{if(musicOn)bar(n++);},60/BPM*4*1000);}
 return {sfx,music,stop:()=>{musicOn=false;clearInterval(timer);}};}
Object.assign(exports,{drawStage,drawCurtain,drawHost,drawModel,drawContestant,nameTag,drawLogo,bubble,moneyBanner,createShowSound,cover});
