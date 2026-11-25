// Shared studio for the game-show games (PLINKO, THE BIG WHEEL): the set, the rising curtain, our own host and two show
// assistants (original designs, drawn here until the owner's pictures arrive via src/data/showSprites.js), contestant name
// tags with the players' faces, lit-up logos, speech bubbles, and an original game-show sound kit (music bed, crowd, fanfares,
// pegs, wheel clicker), with the show's own sound cues from assets/music/tpir-* over it when they're in. No real show's
// logos or people.
const SS=require("src/data/showSprites.js");
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const TAU=Math.PI*2;
// ---- pictures
function cover(g,img,W,H){const k=Math.max(W/img.width,H/img.height),w=img.width*k,h=img.height*k;g.drawImage(img,(W-w)/2,(H-h)/2,w,h);}
// the studio behind everything; kind 'plinko' | 'wheel'
// a game without its own (empty) studio picture borrows another game's empty studio before the drawn one (Nov 25: GPT's first
// Range/Safe/Race/Punch studios had the props painted in, so they were held back until empty versions come)
const STAGE_BORROW={range:'wheel',race:'wheel',row:'wheel',punch:'plinko',safe:'clock'};
function drawStage(g,W,H,kind,t){const pk=k=>require("src/bgShape.js").pick(W,H,{tall:`stage-${k}-tall`,wide:`stage-${k}`,fold:`stage-${k}-fold`},SS.picture);
 const pic=pk(kind)||(STAGE_BORROW[kind]&&pk(STAGE_BORROW[kind]));
 if(pic){cover(g,pic,W,H);return;}
 if(kind==='cliff')return drawAlpine(g,W,H,t);
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
// Cliff Hangers' set (drawn until stage-cliff art arrives): a painted alpine sky backdrop framed by bulb-lit set pieces, stage floor
function drawAlpine(g,W,H,t){const fy=H*.66,sky=g.createLinearGradient(0,0,0,fy);sky.addColorStop(0,'#2a6fc0');sky.addColorStop(1,'#bfe4ff');g.fillStyle=sky;g.fillRect(0,0,W,fy);
 g.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<6;i++){const cx=((i*.21+t*.004)%1.2-.1)*W,cy=H*(.08+.07*(i%3)),r=Math.min(W,H)*.05;g.beginPath();g.arc(cx,cy,r,0,TAU);g.arc(cx+r*1.1,cy+r*.2,r*.8,0,TAU);g.arc(cx-r*1.1,cy+r*.25,r*.7,0,TAU);g.fill();}
 g.fillStyle='#d8e8f6';g.beginPath();g.moveTo(0,fy);for(let i=0;i<=8;i++)g.lineTo(W*i/8,fy-H*(.12+.1*((i*7)%3)/2));g.lineTo(W,fy);g.fill();
 g.fillStyle='#3f7a46';g.beginPath();g.moveTo(0,fy);for(let i=0;i<=12;i++)g.lineTo(W*i/12,fy-H*(.03+.025*((i*5)%3)));g.lineTo(W,fy);g.fill();
 // bulb-lit frame pillars at the sides and a marquee across the top
 const pw=Math.max(14,W*.035);for(const x0 of [0,W-pw]){g.fillStyle='#5a1a6a';g.fillRect(x0,0,pw,fy);for(let y=pw*.6;y<fy;y+=pw*.9){const on=(Math.floor(y/pw)+Math.floor(t*6))%3===0;g.fillStyle=on?'#fff3b0':'#8a6a2a';g.beginPath();g.arc(x0+pw/2,y,pw*.22,0,TAU);g.fill();}}
 const n=Math.round(W/22);for(let i=0;i<n;i++){const on=(i+Math.floor(t*8))%4<2;g.fillStyle=on?'#fff3b0':'#6e5420';g.beginPath();g.arc(W*(i+.5)/n,Math.max(6,H*.012),Math.max(2,W/n*.22),0,TAU);g.fill();}
 const fl=g.createLinearGradient(0,fy,0,H);fl.addColorStop(0,'#3a2c1c');fl.addColorStop(1,'#0c0805');g.fillStyle=fl;g.fillRect(0,fy,W,H-fy);
 g.globalAlpha=.12;g.fillStyle='#ffe9a8';for(let i=0;i<7;i++){g.beginPath();g.ellipse(W*(i+.5)/7,fy+(H-fy)*.25,W*.05,(H-fy)*.1,0,0,TAU);g.fill();}g.globalAlpha=1;}
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
// ---- sound. The show's own recordings come first (owner's pick, Nov 24: the Bob Barker era cues from a soundboard,
// assets/music/tpir-<name>.mp3 -> music:tpir-<name>, fetched the first time a show game opens: pwa LATER 'music:tpir-'),
// levelled by TPIR_GAIN (beds to ~-20 LUFS, stings by their loudest moment to ~-13). A sound whose recording isn't in
// (or hasn't decoded yet) plays the original synth kit below instead: brass + bass + drums bed, crowd, fanfares.
let USERP={};try{USERP=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const TPIR_GAIN={'applause':0.6,'first-chip':0.92,'gay-winner':4.0,'barkers-bargain-bar':0.41,'bell':0.58,'big-winner':0.33,'bumper':0.72,'buzzer-losing-horn-2':0.69,'buzzer-losing-horn':0.46,'buzzer-overbid-2':0.92,'buzzer-overbid':0.92,'buzzer-wrong':0.37,'buzzer':0.57,'check-game':0.38,'cliff-hangers-crash-2':0.52,'cliff-hangers-crash':0.50,'cliff-hangers':0.28,'come-on-down':0.35,'consolation-prize':0.46,'credit-card':0.52,'ding':0.53,'grand-game':0.29,'hurdles-gun-2':1.11,'hurdles-gun':1.02,'hurdles':0.51,'ineligible':0.45,'losing-horn':0.51,'main-street':0.50,'new-car':0.25,'one-away-horn-2':0.51,'one-away-horn':0.35,'pathfinder-bell':0.45,'pathfinder-wrong':0.72,'penny-ante':0.52,'perfect-bid':0.45,'phone-home-game':0.43,'plinko':0.51,'race-game':0.43,'range-game':0.18,'safe-crackers':0.62,'showcase-1':0.42,'showcase-2':0.38,'showcase-3':0.35,'showcase-4':0.23,'showcase-showdown':0.38,'siren':0.44,'super-ball':0.30,'switcharoo':0.46,'theme':0.34,'train-2':0.58,'train-3':0.54,'train':0.55,'tugboat-2':0.69,'tugboat-3':0.64,'tugboat':0.54,'wheel-beep':0.30,'winner':0.48};
const clipBufs={},clipLoading={};
function loadClip(a,n){const url=USERP['music:tpir-'+n];if(!url||clipBufs[n]||clipLoading[n]||typeof fetch==='undefined')return;clipLoading[n]=1;
 fetch(url).then(r=>r.arrayBuffer()).then(b=>a.decodeAudioData(b)).then(buf=>{clipBufs[n]=buf;}).catch(()=>{clipLoading[n]=0;});}
// VOICES AND THE AUDIENCE YELLING (owner, Nov 25: speech soundbites + "more crowd sounds yelling prices and chatter and cheering";
// he'll find recordings): drop-in recordings assets/music/tpir-<key>.mp3 (or several takes tpir-<key>-1, -2 ... picked at random).
// Every key is optional: a game asks for one and nothing plays when it isn't in. Keys: say-come-on-down, say-lets-play,
// say-actual-retail-price, say-higher, say-lower, say-new-car, say-winner, say-sorry, say-showcase, say-pet-population,
// crowd-shout (people yelling prices/advice), crowd-higher, crowd-lower, crowd-chatter (a murmur bed), crowd-ooh, crowd-aww, crowd-cheer.
const VOICE_KEYS=['say-come-on-down','say-lets-play','say-actual-retail-price','say-higher','say-lower','say-new-car','say-winner','say-sorry','say-showcase','say-pet-population','crowd-shout','crowd-higher','crowd-lower','crowd-chatter','crowd-ooh','crowd-aww','crowd-cheer'];
const takesOf=k=>[k,...[1,2,3,4,5,6,7,8].map(i=>k+'-'+i)].filter(n=>USERP['music:tpir-'+n]);
const SHOW_CLIPS=['theme','applause','gay-winner','come-on-down','bell','ding','buzzer','buzzer-wrong','buzzer-losing-horn','losing-horn','big-winner','winner','wheel-beep'];
// opts.song = the recording looped under play ('plinko', 'showcase-showdown'); opts.clips = more to load
// THE HOST AND THE MODELS IN EVERY PRICING GAME (owner, Nov 25: "include Bob Barker and the girls in each of the games...
// just like the real show"). The host walks in from the side of the screen whenever he talks (and stays for the intro and
// the result), a model glides in to present the prize, both cheer at a win. A game gives the spots each frame:
// spots = {host:{x,y,h,side}, model:{x,y,h,side}} (y = feet, h = full height, side -1 = comes from the left edge, 1 = right).
// Without spots they stand at the bottom corners. cast.step(dt,{host,model}) eases them in/out; cast.draw(g,W,H,t,spots).
function createCast(){const C={hv:0,mv:0,mt:0,joy:0,hostPose:'talk',modelPose:'present',variant:0};
 C.present=(secs=2.8,pose='present')=>{C.mt=Math.max(C.mt,secs);C.modelPose=pose;};
 C.cheer=(secs=2.6)=>{C.joy=secs;C.mt=Math.max(C.mt,secs);};
 C.step=(dt,{host=false,model=false}={})=>{C.mt=Math.max(0,C.mt-dt);C.joy=Math.max(0,C.joy-dt);const ht=host||C.joy>0?1:0,mt=model||C.mt>0?1:0;
  C.hv+=(ht-C.hv)*Math.min(1,dt*(ht?5:3.5));C.mv+=(mt-C.mv)*Math.min(1,dt*(mt?4.5:3));};
 C.spots=(W,H,o={})=>{const h=o.h||(W>H*1.15?H*.58:Math.min(H*.33,W*.52)),foot=o.foot??H-4;return {host:{x:h*.2,y:foot,h,side:-1},model:{x:W-h*.19,y:foot,h:h*.96,side:1}};};
 C.draw=(g,W,H,t,sp,talking=false)=>{sp=sp||C.spots(W,H);const ease=v=>1-Math.pow(1-Math.max(0,Math.min(1,v)),3);
  if(C.mv>.01){const M=sp.model,off=(1-ease(C.mv))*(M.side>0?W-M.x+M.h*.3:-(M.x+M.h*.3));g.save();g.globalAlpha=Math.min(1,C.mv*1.6);
   drawModel(g,M.x+off,M.y,M.h,C.joy>0?'clap':C.modelPose,t,C.variant,M.side<0);g.restore();}
  if(C.hv>.01){const Hs=sp.host,off=(1-ease(C.hv))*(Hs.side>0?W-Hs.x+Hs.h*.3:-(Hs.x+Hs.h*.3));g.save();g.globalAlpha=Math.min(1,C.hv*1.6);
   drawHost(g,Hs.x+off,Hs.y,Hs.h,C.joy>0?'cheer':talking?(Math.floor(t*.7)%3===2?'point':'talk'):'point',t,Hs.side>0);g.restore();}};
 // where his speech bubble goes: over his shoulder toward the middle of the screen, the tail at his mouth
 C.bubbleAt=(W,H,sp,fs)=>{sp=sp||C.spots(W,H);const Hs=sp.host,mx=Hs.x+Hs.side*-Hs.h*.02,my=Hs.y-Hs.h*.9,w=Math.min(W*.62,fs*15);
  const x=Math.max(w/2+6,Math.min(W-w/2-6,Hs.x-Hs.side*(Hs.h*.22+w*.4))),y=Math.max(fs*5,my-fs*.6);return {x,y,w,tx:mx,ty:my};};
 return C;}
function createShowSound(opts={}){const on=()=>!!store.profile?.settings?.sound;let A=null,out=null,musicOn=false,musicT=0,timer=null,noiseB=null;
 const ac=()=>{if(!on())return null;A=audioContext();if(!A)return null;if(!out){out=A.createGain();out.gain.value=.55;out.connect(A.destination);}return A;};
 let clipOut=null,bed=null,bedTimer=null,holdTo=0;const playing=new Set();
 const want=[...SHOW_CLIPS,...VOICE_KEYS.flatMap(takesOf),...(opts.song?[opts.song]:[]),...(opts.clips||[])];
 if(on()){const a=audioContext();if(a)want.forEach(n=>loadClip(a,n));}
 // play recording n now (or `at` s later); max = cut it short with a fade. Returns null if it isn't loaded (= use the synth)
 function clip(n,o={}){const a=ac(),b=clipBufs[n];if(!a||!b)return null;if(!clipOut){clipOut=a.createGain();clipOut.gain.value=1;clipOut.connect(a.destination);}
  const rate=o.rate||1,off=o.off||0,full=(b.duration-off)/rate,t0=a.currentTime+(o.at||0),src=a.createBufferSource(),g=a.createGain(),v=(TPIR_GAIN[n]??.5)*(o.vol??1),len=o.max?Math.min(o.max,full):full,fo=o.fout??.45;
  src.buffer=b;src.playbackRate.value=rate;if(o.fin){g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(v,t0+o.fin);}else g.gain.setValueAtTime(v,t0);
  if(len<full){g.gain.setValueAtTime(v,Math.max(t0+(o.fin||0),t0+len-fo));g.gain.linearRampToValueAtTime(.0001,t0+len);}
  let last=g;if(o.pan&&a.createStereoPanner){const pn=a.createStereoPanner();pn.pan.value=o.pan;g.connect(pn);last=pn;}
  src.connect(g);last.connect(clipOut);src.start(t0,off);src.stop(t0+len+.05);playing.add(src);src.onended=()=>playing.delete(src);return {end:t0+len,src,g};}
 // THE AUDIENCE: the applause recording layered with itself (owner's pick, Nov 24: 'more audience sounds'). k = how big
 // (0 polite .. 1 roaring): 1-4 copies, each from another point in the clapping, a little faster/slower and spread left/right,
 // so it sounds like a bigger house and never the same twice. Returns false when the recording isn't in (= synth applause).
 function crowd(dur=2,k=.5,o={}){const b=clipBufs.applause;if(!ac()||!b)return false;const n=1+Math.round(k*3),start=o.swell?0:1.1;
  for(let i=0;i<n;i++){const off=i===0&&o.swell?0:start+Math.random()*Math.max(.1,b.duration-start-dur-1.2);
   clip('applause',{at:(o.at||0)+i*.05*Math.random(),off,rate:.93+Math.random()*.14,pan:n>1?(i/(n-1)*2-1)*.65:0,vol:(.55+.45*k)/Math.sqrt(n)*1.25,max:dur+.9,fout:.9,fin:o.swell||i===0?0:.18});}
  return true;}
 // the looped bed: copies overlap by XF seconds with equal fades so the join doesn't click
 const XF=.6;
 function bedCopy(t0){const a=ac(),b=clipBufs[opts.song];if(!a||!b||!bed)return;const src=a.createBufferSource(),g=a.createGain(),v=(TPIR_GAIN[opts.song]??.4)*.7,d=b.duration;
  src.buffer=b;g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(v,t0+XF);g.gain.setValueAtTime(v,t0+d-XF);g.gain.linearRampToValueAtTime(.0001,t0+d);
  if(!clipOut){clipOut=a.createGain();clipOut.connect(a.destination);}src.connect(g);g.connect(clipOut);src.start(t0);src.stop(t0+d+.05);bed.srcs.push({src,g});bed.next=t0+d-XF;
  if(bed.srcs.length>3)bed.srcs.shift();}
 function bedStart(t0){const a=ac();if(!a)return false;bed={srcs:[],next:t0};bedCopy(t0);clearInterval(bedTimer);
  bedTimer=setInterval(()=>{const a2=ac();if(!bed||!a2)return;if(bed.next-a2.currentTime<1.2)bedCopy(bed.next);},250);return true;}
 function bedStop(){clearInterval(bedTimer);bedTimer=null;const a=A;if(bed&&a){const t=a.currentTime;for(const {src,g} of bed.srcs){try{g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(.0001,t+.4);src.stop(t+.45);}catch{}}}bed=null;}
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
  // the Clock Game's ticking clock: a woody tock (body + click) every second, loud enough to hear over the crowd
  tick:()=>{tone(1250,.06,{type:'triangle',vol:.11,att:.002});tone(2600,.022,{type:'square',vol:.035,att:.001});hiss(.025,{vol:.06,f:5200,q:3});},
  // the Clock Game host's calls: a quick rising / falling chirp under the HIGHER! / LOWER! callout
  higher:()=>{tone(523,.09,{type:'square',vol:.05,to:784});tone(784,.12,{type:'square',vol:.05,at:.09,to:1047});},
  lower:()=>{tone(784,.09,{type:'square',vol:.05,to:523});tone(523,.12,{type:'square',vol:.05,at:.09,to:392});}};
 // the show's recordings over the synth versions (each falls back to the synth when its file isn't in)
 const syn={...sfx},rec=(n,o)=>clip(n,o);
 Object.assign(sfx,{
  click:()=>rec('wheel-beep')||syn.click(),                                     // the Big Wheel's clicker
  ding:()=>rec('ding')||syn.ding(),
  buzz:()=>rec('buzzer')||syn.buzz(),
  slot:v=>{if(v>=10000)return sfx.jackpot(true);if(!v)return rec('losing-horn')?syn.aww(.5):syn.zero();crowd(v>=1000?2.4:v>=500?1.6:1.1,v>=1000?.7:v>=500?.4:.15,{at:.15});if(v>=1000)return rec('bell')||syn.slot(v);return rec('ding',{vol:.7})||syn.slot(v);},
  over:()=>rec('buzzer-losing-horn')?syn.aww(.5):syn.over(),
  dollar:()=>{if(rec('big-winner',{max:7}))return crowd(4,.9)||syn.cheer(3,.14);syn.dollar();crowd(3,.8);},
  jackpot:big=>{if(rec(big?'big-winner':'winner',{max:big?7:6}))return crowd(big?4:3,big?1:.8)||syn.cheer(2.6,.16);syn.jackpot();crowd(3,.8);},
  fanfare:()=>rec('bell')||syn.fanfare(),
  // the announcer's "come on down" cue: the bed waits until it's done
  comeOn:()=>{const c=rec('come-on-down');if(!c)return syn.comeOn();holdTo=c.end;syn.cheer(2.8,.12);if(bed){bedStop();bed=null;if(musicOn&&clipBufs[opts.song])bedStart(holdTo-.4);}},
  wrong:()=>rec('buzzer-wrong')||(syn.buzz(),syn.aww()),
  // the audience (the applause recording, layered): applause(seconds, how big 0..1)
  applause:(dur=2.2,k=.45)=>crowd(dur,k)||syn.applause(dur),
  cheer:(dur=1.6,vol=.13)=>{if(!crowd(dur+.6,Math.min(1,.55+vol*2)))syn.cheer(dur,vol);else syn.cheer(dur*.8,vol*.35);},
  // the show's winner: big winner cue + roaring house; now and then (1 in 6) Barker's 'the winner is... gay' line instead
  winner:()=>{if(Math.random()<1/6&&rec('gay-winner')){crowd(5,1,{at:.2});return;}if(rec('winner',{max:6}))return crowd(4.5,1,{at:.2})||syn.cheer(2.6,.16);syn.jackpot();},
  // Plinko: 'And here comes the first Plinko chip' (owner's clip, trimmed before '...actually any')
  firstChip:()=>!!rec('first-chip')});
 // music bed: an original bouncy brass vamp (I-vi-IV-V in C), quiet under the play
 const prog=[[262,330,392],[220,262,330],[175,220,262],[196,247,294]],BPM=126;
 function bar(n){const a=ac();if(!a)return;const b=60/BPM,ch=prog[n%4];for(let k=0;k<4;k++){tone(ch[0]/2,b*.45,{type:'triangle',vol:.06,at:k*b});tone(60,b*.2,{type:'sine',vol:k%2?0:.12,at:k*b,to:40});if(k%2)hiss(.08,{vol:.05,f:3000,q:.7,at:k*b});hiss(.03,{vol:.02,f:8000,q:.7,at:k*b+b/2});}
  if(n%2===0)ch.forEach(f=>brass(f*2,b*.3,b*.5,.016));else ch.forEach(f=>brass(f*2,b*.25,b*1.5,.013));}
 function music(onOff){if(onOff===musicOn)return;musicOn=onOff;clearInterval(timer);bedStop();if(!onOff||!store.profile?.settings?.music||themeOn)return;
  const a=ac();if(a&&opts.song&&clipBufs[opts.song]&&bedStart(Math.max(a.currentTime+.05,holdTo-.4)))return;
  let n=0;bar(n++);timer=setInterval(()=>{if(musicOn)bar(n++);},60/BPM*4*1000);}
 // TITLE: the show's main theme from the top while the curtain opens (owner: 'play the main theme during the title screen');
 // title(false) fades it out and lets the bed (or the synth vamp) start. Waits up to 1.5 s for the file to decode.
 let themeOn=false,themeH=null;
 async function title(onOff,{loop=false}={}){if(onOff){if(!store.profile?.settings?.music)return;themeOn=true;clearInterval(timer);bedStop();const t0=Date.now();while(!clipBufs.theme&&Date.now()-t0<1500&&themeOn)await new Promise(r=>setTimeout(r,60));
   if(!themeOn)return;themeH=clip('theme',{vol:1.15,fin:.05});if(themeH&&loop){const h=themeH,src=h.src;src.onended=()=>{playing.delete(src);if(themeOn&&themeH===h)setTimeout(()=>{if(themeOn&&themeH===h){themeOn=false;title(true,{loop:true});}},2500);};}if(!themeH){themeOn=false;const m=musicOn;musicOn=false;if(m)music(true);}return;}
  if(!themeOn)return;themeOn=false;const a=A,h=themeH;themeH=null;if(h&&a){const t=a.currentTime;try{h.g.gain.cancelScheduledValues(t);h.g.gain.setValueAtTime(h.g.gain.value,t);h.g.gain.linearRampToValueAtTime(.0001,t+1.4);h.src.stop(t+1.5);}catch{}}
  holdTo=(a?a.currentTime:0)+1;if(musicOn){musicOn=false;music(true);}}
 // one of the takes of a voice/crowd recording (null = none in: the caller carries on without it); never the same take twice running
 const lastTake={};function voice(key,o={}){const ns=takesOf(key).filter(n=>clipBufs[n]);if(!ns.length)return null;let n=ns[Math.floor(Math.random()*ns.length)];
  if(ns.length>1&&n===lastTake[key])n=ns[(ns.indexOf(n)+1)%ns.length];lastTake[key]=n;return clip(n,o);}
 // the audience murmuring under a game: the chatter recording looped if it's in, else the applause recording slowed and muffled
 // into a low rumble of voices
 let mur=null;function murmur(on){const a=ac();if(!on||!a){if(mur){try{const t=a?.currentTime||0;mur.g.gain.setTargetAtTime(.0001,t,.3);mur.src.stop(t+1.2);}catch{}mur=null;}return;}
  if(mur)return;const own=takesOf('crowd-chatter').find(n=>clipBufs[n]),b=clipBufs[own||'applause'];if(!b)return;const src=a.createBufferSource(),g=a.createGain(),lp=a.createBiquadFilter();
  src.buffer=b;src.loop=true;if(!own){src.playbackRate.value=.5;lp.type='lowpass';lp.frequency.value=620;}else{lp.type='allpass';}
  g.gain.setValueAtTime(.0001,a.currentTime);g.gain.linearRampToValueAtTime(own?(TPIR_GAIN[own]??.5)*.6:.16,a.currentTime+1.2);
  if(!clipOut){clipOut=a.createGain();clipOut.connect(a.destination);}src.connect(lp);lp.connect(g);g.connect(clipOut);src.start(a.currentTime,Math.random()*b.duration*.5);mur={src,g};}
 return {sfx,music,title,clip,crowd,voice,murmur,loaded:n=>!!clipBufs[n],stop:()=>{murmur(false);musicOn=false;themeOn=false;clearInterval(timer);bedStop();for(const src of playing){try{src.stop();}catch{}}playing.clear();}};}
Object.assign(exports,{STAGE_BORROW,createCast,drawStage,drawCurtain,drawHost,drawModel,drawContestant,nameTag,drawLogo,bubble,moneyBanner,createShowSound,cover});
