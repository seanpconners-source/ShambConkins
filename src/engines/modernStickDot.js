// Call of Duty: Modern Stick Dot (id office-dots-boxes): plain dots and boxes dressed as a military shooter, the same joke as
// Tony Hawk's Pro Mancala. Title sequence, mission card, a tactical map as the board. Draw a line of wire between two
// outposts; closing a box captures it, with a full-screen kill cam (rifle, sniper scope, or an AC-130 gunship view on a streak)
// and another turn. Rules, CPU and online moves are the old game's: strategyRules dotsMove, cpuBoards pickDots, netTurns {o,i}.
// All art is drawn here, all sound is synthesized (original drone and drums, no real game music or sounds).
const {newDots,dotsMove}=require('src/engines/strategyRules.js');
const {store}=require('src/state.js');
const {audioContext,holdMusic,releaseMusic,vibrate}=require('src/audio.js');
const {isCpu,cpuHotseat}=require('src/engines/cpuKit.js');
const {netTurns}=require('src/engines/classicBoards.js');
const B=require('src/engines/cpuBoards.js');
const {fullBleed}=require('src/engines/fullBleed.js');

const N=4,PCOL=['#58c8ff','#ff6a4a'],GREEN='#9dff7a',AMBER='#ffc94a';
const BLOCK='Impact,"Arial Narrow Bold","Arial Black",sans-serif',MONO='ui-monospace,Menlo,Consolas,monospace';
const PLACES=['Dunder Mifflin Compound, Scranton','Paddy’s Pub, South Philadelphia','Ten Forward, Sector 001','Springfield Tire Yard','Goon Docks, Astoria'];

function makeSound(){
 let a=null,sfx=null,mus=null,timer=null,next=0,bar=0,voices=[];
 const ready=()=>{if(!store.profile?.settings.sound&&!store.profile?.settings.music)return false;a=audioContext();if(!a)return false;if(!sfx){const comp=a.createDynamicsCompressor();comp.connect(a.destination);sfx=a.createGain();sfx.gain.value=.8;sfx.connect(comp);mus=a.createGain();mus.gain.value=.32;mus.connect(comp);}return true;};
 const noiseBuf=()=>{const b=a.createBuffer(1,a.sampleRate*.6,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;};let nb=null;
 const burst=(t,dur,v,f0,f1,type='lowpass',out=sfx)=>{nb||=noiseBuf();const n=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();n.buffer=nb;f.type=type;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+dur);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);n.connect(f).connect(g).connect(out);n.start(t);n.stop(t+dur+.02);};
 const thump=(t,f,dur,v,out=sfx,type='sine')=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f*2,t);o.frequency.exponentialRampToValueAtTime(f,t+.05);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(out);o.start(t);o.stop(t+dur+.02);};
 const CHORDS=[[73.4,110,146.8],[58.3,87.3,116.5],[87.3,130.8,174.6],[55,82.4,138.6]];
 function schedule(){if(!a)return;while(next<a.currentTime+.6){const t=next,k=bar%8;thump(t,48,.5,.5,mus);if(k===3||k===6)thump(t+.5,48,.4,.35,mus);if(k===7){thump(t+.75,60,.3,.3,mus);thump(t+.875,60,.3,.3,mus);}
    if(k===0){const ch=CHORDS[Math.floor(bar/8)%4];for(const f of ch)for(const d of [-3,3]){const o=a.createOscillator(),g=a.createGain(),l=a.createBiquadFilter();l.type='lowpass';l.frequency.value=520;o.type='sawtooth';o.frequency.value=f;o.detune.value=d*2;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.05,t+1.6);g.gain.linearRampToValueAtTime(.0001,t+8);o.connect(l).connect(g).connect(mus);o.start(t);o.stop(t+8.05);voices.push(o);}voices=voices.slice(-24);}
    next+=1;bar++;}}
 return {
  music(){if(!ready()||!store.profile.settings.music||timer)return;next=a.currentTime+.1;bar=0;schedule();timer=setInterval(schedule,250);},
  stop(){clearInterval(timer);timer=null;for(const o of voices)try{o.stop();}catch{}voices=[];},
  shot(){if(!ready())return;const t=a.currentTime;burst(t,.14,.7,5200,500);thump(t,70,.16,.6);},
  burst(n=4){if(!ready())return;const t=a.currentTime;for(let i=0;i<n;i++){burst(t+i*.085,.1,.55,5000,600);thump(t+i*.085,75,.1,.45);}},
  sniper(){if(!ready())return;const t=a.currentTime;burst(t,.5,1,3800,160);thump(t,45,.6,.9);burst(t+.32,.8,.12,900,300,'bandpass');},
  boom(){if(!ready())return;const t=a.currentTime;burst(t,.9,1,1400,60);thump(t,36,1,1);},
  tick(){if(!ready())return;const t=a.currentTime;for(const d of [0,.018])thump(t+d,2600,.03,.16,sfx,'square');},
  radio(){if(!ready())return;const t=a.currentTime;burst(t,.09,.14,2400,1500,'bandpass');thump(t+.1,1050,.07,.05,sfx,'square');},
  cock(){if(!ready())return;const t=a.currentTime;burst(t,.03,.4,6000,2500,'highpass');burst(t+.09,.04,.5,4000,1800,'highpass');},
  hit(word){if(!ready())return;const t=a.currentTime;burst(t,.5,.8,900,70);thump(t,42,.6,.9);if(word)thump(t+.02,55,.9,.4,sfx,'sawtooth');}};
}

async function modernStickDot(s){
 const [c,g]=s.canvas(680,780,{fill:true}),fb=fullBleed(s,{bg:'#070a06'});
 const snd=makeSound(),calm=!!store.profile?.settings.reducedMotion,cpu=isCpu(s);
 holdMusic(6*3600);s.cleanup(()=>{snd.stop();releaseMusic();});
 let state=newDots(N),busy=true,phase='title',T=0,titleWord=0,last=null,lineAge=1,streak=0,cut=null,banner=null,shake=0,flash=0,mapCanvas=null,mapKey='',hover=null,finishing=false;
 const parts=[],pops=[],feed=[],place=PLACES[Math.floor(s.random()*PLACES.length)],clock=`06:${String(10+Math.floor(s.random()*49))}:${String(10+Math.floor(s.random()*49))}`,day=1+Math.floor(s.random()*9);
 const mapRand=(n=>()=>(n=(n*16807)%2147483647)/2147483647)(1+Math.floor(s.random()*1e9));
 const net=netTurns(s,{isTheirs:()=>!busy&&state.winner<0&&state.turn===s.online.remote,apply:m=>(m.o==='h'||m.o==='v')&&Number.isInteger(m.i)&&line(m.o,m.i,true)}),theirs=()=>!!net&&state.turn===net.remote;
 if(cpu)s.hotseat=true;
 const name=i=>String(s.players[i].name).toUpperCase().slice(0,12);
 const font=(px,fam=BLOCK,w='')=>`${w} ${px}px ${fam}`;
 function fit(text,maxW,px,fam=BLOCK){g.font=font(px,fam);const m=g.measureText(text).width;return m>maxW?Math.floor(px*maxW/m):px;}
 function text(t,x,y,px,col,{fam=BLOCK,align='center',stroke=null,lw=3}={}){g.font=font(px,fam);g.textAlign=align;g.textBaseline='middle';if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.lineJoin='round';g.strokeText(t,x,y);}g.fillStyle=col;g.fillText(t,x,y);}

 // ---- layout: the map takes all the room the HUD leaves
 function geo(){const W=s.W,H=s.H,top=Math.max(fb.top||40,44)+34,bottom=64,size=Math.max(160,Math.min(W-28,H-top-bottom)),ox=(W-size)/2,oy=top+Math.max(0,(H-top-bottom-size)/2),pad=size*.07,step=(size-pad*2)/N;return {W,H,size,ox,oy,pad,step,x0:ox+pad,y0:oy+pad};}
 const edgeOf=(o,i)=>{const G=geo(),per=o==='h'?N:N+1,r=Math.floor(i/per),col=i%per;return {ax:G.x0+col*G.step,ay:G.y0+r*G.step,bx:G.x0+(col+(o==='h'?1:0))*G.step,by:G.y0+(r+(o==='v'?1:0))*G.step};};
 function nearestEdge(px,py){const G=geo(),gx=(px-G.x0)/G.step,gy=(py-G.y0)/G.step;let best=null,bd=.44;
  for(const o of ['h','v'])state[o].forEach((own,i)=>{if(own>=0)return;const per=o==='h'?N:N+1,r=Math.floor(i/per),col=i%per,mx=col+(o==='h'?.5:0),my=r+(o==='v'?.5:0),d=Math.hypot((gx-mx)*(o==='h'?.6:1),(gy-my)*(o==='v'?.6:1));if(d<bd){bd=d;best=[o,i];}});return best;}

 // ---- the tactical map, drawn once per size
 function drawMap(G){const key=G.size+'';if(mapKey!==key){mapKey=key;mapCanvas=document.createElement('canvas');const sc=Math.min(2,window.devicePixelRatio||1),S=Math.round(G.size*sc);mapCanvas.width=mapCanvas.height=S;const m=mapCanvas.getContext('2d');
   m.fillStyle='#1c2a18';m.fillRect(0,0,S,S);for(let i=0;i<340;i++){m.fillStyle=`rgba(${mapRand()<.5?'150,170,110':'10,20,8'},${.04+mapRand()*.1})`;const r=4+mapRand()*S*.09;m.beginPath();m.ellipse(mapRand()*S,mapRand()*S,r,r*(.4+mapRand()),mapRand()*3,0,7);m.fill();}
   m.strokeStyle='rgba(205,190,140,.3)';m.lineWidth=S*.012;for(let i=0;i<3;i++){m.beginPath();let y=mapRand()*S;m.moveTo(0,y);for(let x=0;x<=S;x+=S/6){y+=(mapRand()-.5)*S*.14;m.lineTo(x,y);}m.stroke();}
   for(let i=0;i<26;i++){m.fillStyle=`rgba(190,200,170,${.14+mapRand()*.16})`;m.fillRect(mapRand()*S,mapRand()*S,S*(.015+mapRand()*.04),S*(.015+mapRand()*.03));}
   m.strokeStyle='rgba(157,255,122,.13)';m.lineWidth=1;for(let i=1;i<10;i++){m.beginPath();m.moveTo(S*i/10,0);m.lineTo(S*i/10,S);m.moveTo(0,S*i/10);m.lineTo(S,S*i/10);m.stroke();}
   m.fillStyle='rgba(0,0,0,.16)';for(let y=0;y<S;y+=3*sc)m.fillRect(0,y,S,sc);const v=m.createRadialGradient(S/2,S/2,S*.32,S/2,S/2,S*.74);v.addColorStop(0,'transparent');v.addColorStop(1,'rgba(0,0,0,.6)');m.fillStyle=v;m.fillRect(0,0,S,S);}
  g.drawImage(mapCanvas,G.ox,G.oy,G.size,G.size);g.strokeStyle='rgba(157,255,122,.55)';g.lineWidth=1.5;g.strokeRect(G.ox+.5,G.oy+.5,G.size-1,G.size-1);
  const k=G.size*.05;g.strokeStyle=GREEN;g.lineWidth=2.5;for(const [cx,cy,dx,dy] of [[G.ox,G.oy,1,1],[G.ox+G.size,G.oy,-1,1],[G.ox,G.oy+G.size,1,-1],[G.ox+G.size,G.oy+G.size,-1,-1]]){g.beginPath();g.moveTo(cx+dx*k,cy);g.lineTo(cx,cy);g.lineTo(cx,cy+dy*k);g.stroke();}}
 function drawBoard(G,dt){drawMap(G);const u=G.step;
  for(let r=0;r<N;r++)for(let col=0;col<N;col++){const own=state.boxes[r*N+col];if(own<0)continue;const x=G.x0+col*u,y=G.y0+r*u;g.fillStyle=PCOL[own]+'44';g.fillRect(x+2,y+2,u-4,u-4);s.sprite(g,own,x+u/2,y+u/2,u*.68,{exact:true,mood:'win'});g.strokeStyle=PCOL[own];g.lineWidth=2;g.beginPath();g.moveTo(x+u-u*.2,y+u-u*.1);g.lineTo(x+u-u*.2,y+u*.62);g.stroke();g.fillStyle=PCOL[own];g.beginPath();g.moveTo(x+u-u*.2,y+u*.62);g.lineTo(x+u-u*.06,y+u*.68);g.lineTo(x+u-u*.2,y+u*.74);g.fill();}
  // open lines show faintly so a tap target is obvious; a set line is wire on posts, the newest drawn by a tracer
  for(const o of ['h','v'])state[o].forEach((own,i)=>{const e=edgeOf(o,i);
   if(own<0){const mine=hover&&hover[0]===o&&hover[1]===i;g.strokeStyle=mine?'#ffffffcc':'rgba(157,255,122,.2)';g.lineWidth=mine?4:1.5;g.setLineDash([5,7]);g.beginPath();g.moveTo(e.ax,e.ay);g.lineTo(e.bx,e.by);g.stroke();g.setLineDash([]);return;}
   const fresh=last&&last.o===o&&last.i===i,f=fresh?Math.min(1,lineAge/.18):1,tx=e.ax+(e.bx-e.ax)*f,ty=e.ay+(e.by-e.ay)*f;
   g.strokeStyle='#000b';g.lineWidth=Math.max(6,u*.1);g.lineCap='round';g.beginPath();g.moveTo(e.ax,e.ay);g.lineTo(tx,ty);g.stroke();g.strokeStyle=PCOL[own];g.lineWidth=Math.max(3.5,u*.055);g.beginPath();g.moveTo(e.ax,e.ay);g.lineTo(tx,ty);g.stroke();g.lineCap='butt';
   if(fresh&&f<1){g.fillStyle='#fff6b0';g.beginPath();g.arc(tx,ty,5,0,7);g.fill();}});
  const pulse=.6+.4*Math.sin(performance.now()/300);for(let r=0;r<=N;r++)for(let col=0;col<=N;col++){const x=G.x0+col*u,y=G.y0+r*u,d=Math.max(4,u*.075);g.fillStyle='#0b1208';g.fillRect(x-d-1.5,y-d-1.5,d*2+3,d*2+3);g.fillStyle=`rgba(157,255,122,${.55+.45*pulse})`;g.fillRect(x-d,y-d,d*2,d*2);}}

 // ---- HUD: scores like a match scoreboard, whose move, the kill feed
 function drawHud(G,dt){const y=Math.max(fb.top||40,44)-34+((fb.top||40)>44?0:0),barH=30,W=G.W;
  [0,1].forEach(i=>{const left=i===0,bw=Math.min(W*.46,190),bx=left?10:W-10-bw,by=Math.max(6,(fb.top||40)+4),on=state.turn===i&&state.winner<0;g.fillStyle=on?PCOL[i]+'cc':'#000a';g.beginPath();g.moveTo(bx,by);g.lineTo(bx+bw-(left?10:0),by);g.lineTo(bx+bw-(left?0:10),by+barH);g.lineTo(bx+(left?0:10),by+barH);g.closePath();g.fill();s.sprite(g,i,bx+18,by+barH/2,26,{exact:true,mood:on?'thinking':'normal'});
   text(name(i),bx+36,by+barH/2+1,fit(name(i),bw-76,15),'#fff',{align:'left',stroke:'#000',lw:2});text(String(s.score[i]||0),bx+bw-22,by+barH/2+1,20,AMBER,{stroke:'#000',lw:3});});
  const by=G.oy+G.size+8;
  const say=phase==='end'?'':theirs()?`${name(state.turn)} IS ON THEIR PHONE`:cpu&&state.turn===1?`${name(1)} IS MOVING…`:`${name(state.turn)}: TAP BETWEEN TWO OUTPOSTS`;
  text(say,W/2,by+10,fit(say,W-24,14,MONO),GREEN,{fam:MONO});
  feed.forEach((f,i)=>{f.t-=dt;});while(feed.length&&feed[0].t<=0)feed.shift();feed.slice(-3).forEach((f,i)=>{g.globalAlpha=Math.min(1,f.t);text(f.msg,12,by+28+i*13,fit(f.msg,W*.9,11,MONO),f.col,{fam:MONO,align:'left'});g.globalAlpha=1;});}

 // ---- effects
 function spray(x,y,n,col,speed=260,grav=620){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=Math.random()*speed;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-speed*.3,life:.35+Math.random()*.6,col,sz:1.5+Math.random()*3.5,grav});}if(parts.length>500)parts.splice(0,parts.length-500);}
 function stepParts(dt){for(const p of parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.grav*dt;g.globalAlpha=Math.max(0,Math.min(1,p.life*2));g.fillStyle=p.col;g.fillRect(p.x,p.y,p.sz,p.sz);}g.globalAlpha=1;for(let i=parts.length-1;i>=0;i--)if(parts[i].life<=0)parts.splice(i,1);}
 function hitmarker(x,y,t){const k=1+t*.6;g.strokeStyle='#fff';g.lineWidth=2.5;for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){g.beginPath();g.moveTo(x+a*7*k,y+b*7*k);g.lineTo(x+a*15*k,y+b*15*k);g.stroke();}}
 function stepPops(dt){for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t+=dt;if(p.t>p.dur){pops.splice(i,1);continue;}g.globalAlpha=Math.min(1,(p.dur-p.t)*3);if(p.mark)hitmarker(p.x,p.y-26,p.t);text(p.msg,p.x,p.y-p.t*26,p.px||22,p.col||AMBER,{stroke:'#000',lw:4});g.globalAlpha=1;}}

 // ---- kill cams: full screen, tap skips
 function soldier(cx,gy,h,i,{face=1,lean=0,mood='angry',gun=true,fall=0}={}){g.save();g.translate(cx,gy);g.rotate(face*fall*1.5);g.translate(0,-h);g.rotate(face*lean);const u=h/10,cam=i?'#7a4a34':'#3f5a3a',dark=i?'#51301f':'#29402a';
  g.lineCap='round';g.lineWidth=u*1.5;g.strokeStyle=dark;g.beginPath();g.moveTo(-u*.8,u*5.4);g.lineTo(-u*1.6,u*10);g.moveTo(u*.8,u*5.4);g.lineTo(u*1.6,u*10);g.stroke();
  g.fillStyle=cam;g.fillRect(-u*1.7,u*1.7,u*3.4,u*4);g.fillStyle='#1c1c14';g.fillRect(-u*1.8,u*2.3,u*3.6,u*1.5);
  if(gun){g.strokeStyle=cam;g.lineWidth=u*1.1;g.beginPath();g.moveTo(0,u*2.5);g.lineTo(face*u*3,u*3.2);g.stroke();g.fillStyle='#14140f';g.fillRect(face>0?u*1.6:-u*6.6,u*2.7,u*5,u*.8);g.fillRect(face>0?u*2:-u*3,u*3.3,u*1,u*1.3);}
  g.lineCap='butt';s.sprite(g,i,0,0,h*.42,{exact:true,mood});g.fillStyle=dark;g.beginPath();g.ellipse(0,-h*.13,h*.2,h*.11,0,Math.PI,0);g.fill();g.restore();}
 function letterbox(W,H){const b=Math.min(H*.09,60);g.fillStyle='#000';g.fillRect(0,0,W,b);g.fillRect(0,H-b,W,b);return b;}
 function ground(W,H,gy){const sky=g.createLinearGradient(0,0,0,gy);sky.addColorStop(0,'#3d3a2a');sky.addColorStop(1,'#a58a58');g.fillStyle=sky;g.fillRect(0,0,W,gy);g.fillStyle='#5a4a30';g.beginPath();g.moveTo(0,gy);for(let i=0;i<=8;i++)g.lineTo(W*i/8,gy-(i%2?H*.09:H*.03));g.lineTo(W,gy);g.fill();g.fillStyle='#3b3020';g.fillRect(0,gy,W,H-gy);}
 const CUT={
  rifle(C,dt){const {W,H}=s,gy=H*.76,h=Math.min(H*.46,W*.44),kx=W*.2,vx=W*.8,hitAt=.55,fired=C.t>hitAt;ground(W,H,gy);
   if(C.t>.1&&C.t<hitAt+.16&&Math.floor(C.t*22)%2===0){g.fillStyle='#fff3a0';g.beginPath();g.arc(kx+h*.62,gy-h+h*.31,h*.09,0,7);g.fill();g.strokeStyle='#fff3a0cc';g.lineWidth=2;g.beginPath();g.moveTo(kx+h*.62,gy-h+h*.31);g.lineTo(vx-h*.06,gy-h+h*.36);g.stroke();}
   if(fired&&!C.hit){C.hit=1;spray(vx,gy-h*.8,calm?20:90,'#c80f18',420);snd.tick();pops.push({msg:'+100',x:W/2,y:H*.34,t:0,dur:1,mark:true,px:34});shake=calm?0:10;}
   soldier(kx,gy,h,C.killer,{mood:fired?'win':'angry'});soldier(vx,gy,h,C.victim,{face:-1,mood:fired?'sad':'think',fall:fired?Math.min(1,(C.t-hitAt)*2.4):0,gun:!fired});
   stepParts(dt);stepPops(dt);const b=letterbox(W,H);text(`${name(C.killer)} [M4] ${name(C.victim)}`,W/2,b/2,fit(`${name(C.killer)} [M4] ${name(C.victim)}`,W-20,18,MONO),AMBER,{fam:MONO});},
  sniper(C,dt){const {W,H}=s,R=Math.min(W,H)*.42,hitAt=.95,fired=C.t>hitAt,bob=fired?0:Math.sin(C.t*1.9)*R*.1,sx=W/2+Math.sin(C.t*1.3)*R*.1,sy=H/2+bob;
   ground(W,H,H*.62);soldier(W/2,H/2+R*2.3+bob+(fired?(C.t-hitAt)*H*.9:0),R*2.3,C.victim,{face:-1,mood:fired?'sad':'think',gun:false,fall:fired?Math.min(1,(C.t-hitAt)*2):0});
   if(fired&&!C.hit){C.hit=1;flash=calm?0:.8;snd.sniper();spray(W/2,H/2-R*.5,calm?30:130,'#d0121c',640,500);pops.push({msg:'HEADSHOT +150',x:W/2,y:H/2+R*.6,t:0,dur:1.2,mark:true,px:Math.min(36,W*.08),col:'#fff'});shake=calm?0:14;}
   stepParts(dt);g.fillStyle='#000';g.beginPath();g.rect(0,0,W,H);g.moveTo(sx+R,sy);g.arc(sx,sy,R,0,Math.PI*2,true);g.fill('evenodd');g.strokeStyle='#000';g.lineWidth=1.5;g.beginPath();g.moveTo(sx-R,sy);g.lineTo(sx+R,sy);g.moveTo(sx,sy-R);g.lineTo(sx,sy+R);g.stroke();for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(sx+i*R*.12,sy-5);g.lineTo(sx+i*R*.12,sy+5);g.stroke();}
   stepPops(dt);text('HOLD BREATH',W/2,H-20,13,GREEN,{fam:MONO});},
  ac130(C,dt){const {W,H}=s,cx=W/2,cy=H/2,S=Math.min(W,H);g.fillStyle='#151515';g.fillRect(0,0,W,H);g.save();g.translate(cx,cy);g.rotate(C.t*.12);C.spots||=Array.from({length:18},()=>({x:(Math.random()-.5)*S*1.2,y:(Math.random()-.5)*S*1.2,w:S*(.04+Math.random()*.1),h:S*(.04+Math.random()*.1)}));g.fillStyle='#3a3a3a';for(const b of C.spots)g.fillRect(b.x,b.y,b.w,b.h);
   C.men||=Array.from({length:7},()=>({x:(Math.random()-.5)*S*.7,y:(Math.random()-.5)*S*.7,dead:false}));for(const m of C.men){g.fillStyle=m.dead?'#666':'#f4f4f4';g.fillRect(m.x-3,m.y-4,6,8);}
   C.next??=.25;if(C.t>C.next&&C.t<C.dur-.5){C.next=C.t+.34;const m=C.men.find(m=>!m.dead);if(m){m.dead=true;C.blasts=(C.blasts||[]);C.blasts.push({x:m.x,y:m.y,t:0});snd.boom();shake=calm?0:6;}}
   for(const b of C.blasts||[]){b.t+=dt;const r=S*.14*Math.min(1,b.t*5);g.fillStyle=`rgba(255,255,255,${Math.max(0,1-b.t*1.6)})`;g.beginPath();g.arc(b.x,b.y,r,0,7);g.fill();}g.restore();
   g.strokeStyle='#fff';g.lineWidth=2;const k=S*.11;g.strokeRect(cx-k,cy-k,k*2,k*2);g.beginPath();g.moveTo(cx-S*.45,cy);g.lineTo(cx-k,cy);g.moveTo(cx+k,cy);g.lineTo(cx+S*.45,cy);g.moveTo(cx,cy-S*.45);g.lineTo(cx,cy-k);g.moveTo(cx,cy+k);g.lineTo(cx,cy+S*.45);g.stroke();
   text('AC-130 ABOVE',W/2,H*.12,fit('AC-130 ABOVE',W-30,30),'#fff',{stroke:'#000',lw:4});text('105 mm',16,H-42,16,'#fff',{fam:MONO,align:'left'});text(`${name(C.killer)} · ${C.n} IN A ROW`,W/2,H*.88,fit(`${name(C.killer)} · ${C.n} IN A ROW`,W-30,18,MONO),AMBER,{fam:MONO});if(C.t>C.dur-1)text('Good kill. Good kill.',W/2,H*.8,16,'#fff',{fam:MONO});}};
 const playCut=(kind,killer,victim,n=1)=>new Promise(done=>{cut={kind,killer,victim,n,t:0,dur:(kind==='ac130'?3:kind==='sniper'?2.2:1.8)*(calm?.6:1),done};if(kind==='rifle')snd.burst(4);if(kind==='sniper')snd.cock();if(kind==='ac130')snd.radio();});

 // ---- a move
 async function line(o,i,remote=false){if(!s.alive||busy||(!remote&&s.paused)||(theirs()&&!remote))return;const who=state.turn,move=dotsMove(state,o,i);if(!move)return;if(net&&!remote)net.send({o,i});
  busy=true;last={o,i};lineAge=0;hover=null;state=move.state;snd.shot();snd.tick();const e=edgeOf(o,i);spray((e.ax+e.bx)/2,(e.ay+e.by)/2,10,'#ffe28a',120,200);
  const score=[state.boxes.filter(v=>v===0).length,state.boxes.filter(v=>v===1).length];s.setScores(score);if(!await s.wait(240))return;
  if(move.claimed.length){streak+=move.claimed.length;const G=geo();for(const b of move.claimed){const r=Math.floor(b/N),col=b%N,x=G.x0+(col+.5)*G.step,y=G.y0+(r+.5)*G.step;spray(x,y,calm?10:40,'#ff8a3a',300);pops.push({msg:'OUTPOST TAKEN',x,y,t:0,dur:1,px:Math.min(18,G.step*.2),mark:true});}snd.hit(false);vibrate(35);feed.push({msg:`${name(who)} ︻╦╤─ ${name(1-who)}’s outpost`,col:PCOL[who],t:7});
   s.react?.(who,'win');if(!await s.wait(350))return;
   const n=streak;if(n===3)banner={big:'AC-130 INCOMING',small:`${name(who)}: 3 OUTPOSTS IN A ROW`,t:0,dur:1.3};else if(n===5)banner={big:'TACTICAL STICK',small:`${name(who)}: 5 OUTPOSTS IN A ROW`,t:0,dur:1.3};
   if(banner){snd.radio();if(!await s.wait(1100))return;}
   await playCut(n>=3?'ac130':n===2||Math.random()<.4?'sniper':'rifle',who,1-who,n);if(!s.alive)return;}
  else streak=0;
  if(state.winner>=0)return endMatch(score);
  if(!move.claimed.length&&state.turn!==who){banner={big:`${name(state.turn)}’S MOVE`,small:'',t:0,dur:.8};snd.radio();await s.wait(calm?150:420);if(!s.alive)return;}
  busy=false;}
 async function endMatch(score){phase='end';finishing=true;const tie=score[0]===score[1],win=score[0]>=score[1]?0:1;banner={big:tie?'STALEMATE':`${name(win)} WINS`,small:tie?'Both sides hold eight outposts.':`Sector secured, ${Math.max(...score)} outposts to ${Math.min(...score)}.`,t:0,dur:9};snd.boom();flash=calm?0:.6;
  await s.wait(calm?1000:2600);if(!s.alive)return;snd.stop();s.finish(score,`Modern Stick Dot · outposts ${score[0]}–${score[1]}.`);}

 s.on(c,'pointerdown',ev=>{const p=s.pointer(ev);
  if(phase==='title'){if(T>.5){T=99;}return;}
  if(cut){if(cut.t>.3)cut.t=cut.dur;return;}
  if(busy||s.paused||phase!=='play'||theirs()||(cpu&&state.turn===1))return;const m=nearestEdge(p.x,p.y);if(m)void line(m[0],m[1]);});
 s.on(c,'pointermove',ev=>{if(busy||phase!=='play'||theirs()||(cpu&&state.turn===1))return;if(ev.pointerType==='mouse'){const p=s.pointer(ev);hover=nearestEdge(p.x,p.y);}});

 // ---- title and mission card
 const WORDS=[['CALL OF DUTY',.25],['MODERN',1.05],['STICK DOT',1.6]];const TITLE_END=4.1,CARD_END=6.8;
 function drawTitle(){const {W,H}=s;g.fillStyle='#050704';g.fillRect(0,0,W,H);
  for(const [w,at] of WORDS)if(T>=at&&titleWord<WORDS.findIndex(x=>x[0]===w)+1){titleWord=WORDS.findIndex(x=>x[0]===w)+1;snd.hit(true);shake=calm?0:9;spray(W/2,H*.42,calm?8:50,'#ffd27a',360,300);}
  if(T>=WORDS[0][1]&&T<TITLE_END){const g1=g.createLinearGradient(0,H*.3,0,H*.4);g1.addColorStop(0,'#f4f6f4');g1.addColorStop(1,'#7f8a80');text('CALL OF DUTY',W/2,H*.34,fit('CALL OF DUTY',W*.86,Math.min(W*.13,H*.13)),g1,{stroke:'#000',lw:2});
   if(T>=WORDS[1][1])text('MODERN',W/2,H*.45,fit('MODERN',W*.7,Math.min(W*.09,H*.09)),'#cfd6cc',{stroke:'#000',lw:2});
   if(T>=WORDS[2][1])text('STICK DOT',W/2,H*.56,fit('STICK DOT',W*.86,Math.min(W*.17,H*.17)),GREEN,{stroke:'#0c2a06',lw:4});
   if(T>=2.6)text('A DOTS AND BOXES EXPERIENCE',W/2,H*.68,fit('A DOTS AND BOXES EXPERIENCE',W*.84,15,MONO),'#99a696',{fam:MONO});}
  if(T>=TITLE_END){const type=(str,at)=>str.slice(0,Math.max(0,Math.floor((T-at)*38)));const px=fit('Dunder Mifflin Compound, Scranton',W*.88,17,MONO),lines=[`"Connect the Dots"`,`Day ${day} - ${clock}`,`Sgt. ${s.players[0].name} & Sgt. ${s.players[1].name}`,place];
   lines.forEach((l,i)=>text(type(l,TITLE_END+i*.42),W*.07,H*.4+i*(px+10),i?px:px+6,i?GREEN:'#fff',{fam:MONO,align:'left'}));}
  stepParts(1/60);if(T>=CARD_END)beginPlay();}
 function beginPlay(){if(phase!=='title')return;phase='play';busy=false;snd.music();snd.radio();banner={big:`${name(state.turn)}’S MOVE`,small:'TAKE THE MOST OUTPOSTS',t:0,dur:1.4};}

 s.debug={engine:'stickdot',get state(){return state;},get phase(){return phase;},get busy(){return busy;},get cut(){return cut;},skip(){if(phase==='title')T=99;if(cut)cut.t=cut.dur;},line,geo,edgeOf,
  bot(){if(phase==='title'){T=99;return 'skip';}if(cut){cut.t=cut.dur;return 'skip';}if(!net||theirs()||busy||s.paused||state.winner>=0)return null;const m=B.pickDots({solo:{level:'normal',skill:.5}},state);void line(m[0],m[1]);return 'line';}};

 if(cpu)cpuHotseat(s,{isTurn:()=>phase==='play'&&state.turn===1&&state.winner<0&&!busy,think:()=>{const [o,i]=B.pickDots(s,state);return line(o,i);},delay:900});
 if(!net&&!await s.pass(0,'Dots and boxes, reporting for duty. Tap between two outposts to run a line of wire. Close a box to capture it and take another turn. Most outposts wins.','Lock and load'))return;
 snd.cock();
 s.frame((dt)=>{if(!s.alive)return;const {W,H}=s;T+=dt;lineAge+=dt;
  g.save();if(shake>0){g.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake=Math.max(0,shake-dt*34);}
  if(cut){cut.t+=dt;CUT[cut.kind](cut,dt);if(cut.t>=cut.dur){const d=cut.done;cut=null;parts.length=0;pops.length=0;d();}}
  else if(phase==='title')drawTitle();
  else{g.fillStyle='#070a06';g.fillRect(0,0,W,H);const G=geo();drawBoard(G,dt);drawHud(G,dt);stepParts(dt);stepPops(dt);
   if(banner){banner.t+=dt;const a=Math.min(1,banner.t*5,(banner.dur-banner.t)*4);if(a>0){g.globalAlpha=a;g.fillStyle='#000b';const bh=banner.small?76:50;g.fillRect(0,H/2-bh/2,W,bh);text(banner.big,W/2,H/2-(banner.small?11:0),fit(banner.big,W*.9,Math.min(38,W*.09)),'#fff',{stroke:'#000',lw:3});if(banner.small)text(banner.small,W/2,H/2+20,fit(banner.small,W*.9,14,MONO),AMBER,{fam:MONO});g.globalAlpha=1;}if(banner.t>banner.dur)banner=null;}}
  g.restore();if(flash>0){g.fillStyle=`rgba(255,255,255,${Math.min(1,flash)})`;g.fillRect(0,0,W,H);flash-=dt*2;}});
}
Object.assign(exports,{modernStickDot});
