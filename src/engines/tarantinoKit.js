// Shared helpers for the Tarantino minigame set: film look (grain, vignette, title cards), ketchup
// particles, screen shake, synth sfx and a multi-touch "half screen" pointer router.
const {clamp}=require("src/utils.js");
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");

const CHAPTER_WORDS=['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN'];
const SERIF='Georgia, "Times New Roman", serif',SANS='"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif',MONO='ui-monospace, Menlo, Consolas, monospace';
const reduced=()=>!!store.profile?.settings.reducedMotion;
const rr=(x,px,py,w,h,r)=>{r=Math.min(r,w/2,h/2);x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();};
const lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t*t*(3-2*t),fmtMs=n=>Math.round(n)+' ms';
function label(x,text,px,py,size,{fill='#fff',stroke='#000',lw,align='center',font,alpha=1,rot=0,base='middle'}={}){
 x.save();x.globalAlpha*=alpha;x.translate(px,py);if(rot)x.rotate(rot);x.font=font||`900 ${size}px ${SANS}`;x.textAlign=align;x.textBaseline=base;x.lineJoin='round';
 if(stroke){x.strokeStyle=stroke;x.lineWidth=lw||Math.max(3,size*.16);x.strokeText(text,0,0);}x.fillStyle=fill;x.fillText(text,0,0);x.restore();
}
// ---------------------------------------------------------------- film look
const grainCache=new WeakMap();let grainTile=null;
function filmOverlay(x,W,H,t,{grain=.5,vignette=.55}={}){
 if(grain>0){
  if(!grainTile){grainTile=document.createElement('canvas');grainTile.width=grainTile.height=96;const g=grainTile.getContext('2d'),im=g.createImageData(96,96);for(let i=0;i<im.data.length;i+=4){im.data[i]=im.data[i+1]=im.data[i+2]=Math.random()*255;im.data[i+3]=Math.random()*60;}g.putImageData(im,0,0);}
  let pat=grainCache.get(x);if(!pat){pat=x.createPattern(grainTile,'repeat');grainCache.set(x,pat);}
  x.save();x.globalAlpha=grain;x.translate(-((Math.random()*96)|0),-((Math.random()*96)|0));x.fillStyle=pat;x.fillRect(0,0,W+96,H+96);x.restore();
 }
 if(vignette>0){const g=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.hypot(W,H)*.55);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${vignette})`);x.fillStyle=g;x.fillRect(0,0,W,H);}
}
function flash(x,W,H,a,color='255,255,255'){if(a>0.01){x.fillStyle=`rgba(${color},${clamp(a,0,1)})`;x.fillRect(0,0,W,H);}}
// Desaturate the frame drawn so far (black-and-white film flashes). Chrome/Safari support the 'saturation' blend.
function mono(x,W,H,amount){if(amount<=0.01)return;x.save();x.globalCompositeOperation='saturation';x.globalAlpha=clamp(amount,0,1);x.fillStyle='#808080';x.fillRect(0,0,W,H);x.restore();}
// Tarantino chapter card: black, muted yellow serif. t = seconds since the card began; returns false when finished.
function titleCard(x,W,H,t,{chapter=1,title='',sub='',life=2}={}){
 if(t>=life)return false;
 const a=t<.22?t/.22:t>life-.3?(life-t)/.3:1,u=Math.min(W,H*.8);
 x.save();x.globalAlpha=clamp(a,0,1);x.fillStyle='#050505';x.fillRect(0,0,W,H);
 const gold='#d9bd4a',cy=H/2;x.strokeStyle='#d9bd4a55';x.lineWidth=2;x.beginPath();x.moveTo(W*.12,cy-u*.2);x.lineTo(W*.88,cy-u*.2);x.moveTo(W*.12,cy+u*.2);x.lineTo(W*.88,cy+u*.2);x.stroke();
 const k=1+t*.012;x.translate(W/2,cy);x.scale(k,k);
 label(x,chapter?`CHAPTER ${CHAPTER_WORDS[chapter-1]||chapter}`:'',0,-u*.1,clamp(u*.058,12,26),{fill:'#a8946a',stroke:null,font:`italic 700 ${clamp(u*.058,12,26)}px ${SERIF}`});
 const words=title.split(' ');let lines=[title];if(title.length>13&&words.length>1){const h=Math.ceil(words.length/2);lines=[words.slice(0,h).join(' '),words.slice(h).join(' ')];}
 const fs=clamp(u*.13/(lines.length>1?1.25:1),20,70);lines.forEach((ln,i)=>label(x,ln,0,u*.055+(i-(lines.length-1)/2)*fs*1.05,fs,{fill:gold,stroke:null,font:`900 ${fs}px ${SERIF}`}));
 if(sub)label(x,sub,0,u*.2+(lines.length-1)*fs*.55,clamp(u*.04,11,18),{fill:'#9d9a8c',stroke:null,font:`italic 400 ${clamp(u*.04,11,18)}px ${SERIF}`});
 x.restore();filmOverlay(x,W,H,t,{grain:.8,vignette:.6});return true;
}
// Movie-subtitle strip.
function subtitle(x,W,H,text,a=1,y=H*.9){if(!text||a<=0)return;x.save();x.globalAlpha=clamp(a,0,1);const fs=clamp(Math.min(W,H*1.3)*.034,12,20);x.font=`700 ${fs}px ${SERIF}`;const w=Math.min(W-20,x.measureText(text).width+24);x.fillStyle='#000c';rr(x,W/2-w/2,y-fs*.9,w,fs*1.8,8);x.fill();x.fillStyle='#f4efd8';x.textAlign='center';x.textBaseline='middle';x.fillText(text,W/2,y,w-14);x.restore();}
// ---------------------------------------------------------------- particles ("ketchup" splats, sparks, text pops)
function makeFx(){
 const parts=[],decals=[],pops=[],rings=[];
 return {
  splat(px,py,{n=22,speed=300,dir=null,spread=Math.PI*2,size=5,color='#c4161c',decal=true}={}){
   for(let i=0;i<n;i++){const a=(dir===null?Math.random()*Math.PI*2:dir+(Math.random()-.5)*spread),v=speed*(.25+Math.random()*.9);parts.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v-speed*.2,r:size*(.5+Math.random()),life:.5+Math.random()*.5,max:1,g:900,color,drop:true});}
   if(decal)decals.push({x:px,y:py,life:3.5,blobs:Array.from({length:7},()=>({dx:(Math.random()-.5)*size*7,dy:(Math.random()-.5)*size*5,r:size*(.7+Math.random()*1.8)})),color});
  },
  spark(px,py,n=10,color='#ffe9a8',speed=320){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=speed*(.3+Math.random());parts.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:1.6+Math.random()*2,life:.25+Math.random()*.3,max:1,g:300,color,line:true});}},
  confetti(px,py,n=30,colors=['#ffd23f','#ff4f9a','#2fd6c9','#fff']){for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*2.2,v=200+Math.random()*420;parts.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:3+Math.random()*3,life:1.2+Math.random()*.9,max:1,g:520,color:colors[i%colors.length],rect:true,spin:Math.random()*6});}},
  pop(px,py,text,{color='#fff',size=26,life=.9,stroke='#000',rise=40}={}){pops.push({x:px,y:py,text,color,size,life,max:life,stroke,rise});},
  ring(px,py,{r=8,grow=220,life=.4,color='#fff',w=4}={}){rings.push({x:px,y:py,r,grow,life,max:life,color,w});},
  step(dt){
   for(const p of parts){p.life-=dt;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-1.2*dt;if(p.spin!==undefined)p.spin+=dt*9;}
   for(const d of decals)d.life-=dt;for(const p of pops)p.life-=dt;for(const r of rings){r.life-=dt;r.r+=r.grow*dt;}
   for(const arr of [parts,decals,pops,rings])for(let i=arr.length-1;i>=0;i--)if(arr[i].life<=0)arr.splice(i,1);
   if(parts.length>500)parts.splice(0,parts.length-500);
  },
  drawDecals(x){for(const d of decals){x.globalAlpha=clamp(d.life/1.2,0,1)*.85;x.fillStyle=d.color;for(const b of d.blobs){x.beginPath();x.arc(d.x+b.dx,d.y+b.dy,b.r,0,6.3);x.fill();}}x.globalAlpha=1;},
  draw(x){
   for(const r of rings){x.globalAlpha=clamp(r.life/r.max,0,1);x.strokeStyle=r.color;x.lineWidth=r.w;x.beginPath();x.arc(r.x,r.y,r.r,0,6.3);x.stroke();}
   for(const p of parts){x.globalAlpha=clamp(p.life*2.2,0,1);x.fillStyle=p.color;
    if(p.line){x.strokeStyle=p.color;x.lineWidth=p.r;x.beginPath();x.moveTo(p.x,p.y);x.lineTo(p.x-p.vx*.04,p.y-p.vy*.04);x.stroke();}
    else if(p.rect){x.save();x.translate(p.x,p.y);x.rotate(p.spin);x.fillRect(-p.r,-p.r*.5,p.r*2,p.r);x.restore();}
    else{const sp=Math.hypot(p.vx,p.vy);x.save();x.translate(p.x,p.y);x.rotate(Math.atan2(p.vy,p.vx));x.beginPath();x.ellipse(0,0,p.r*(1+sp/700),p.r,0,0,6.3);x.fill();x.restore();}}
   for(const p of pops){const k=1-p.life/p.max;x.globalAlpha=clamp(p.life*3,0,1);label(x,p.text,p.x,p.y-p.rise*k,p.size*(k<.12?.7+k*2.5:1),{fill:p.color,stroke:p.stroke});}
   x.globalAlpha=1;
  },
  clear(){parts.length=decals.length=pops.length=rings.length=0;}
 };
}
function makeShake(){let m=0;return {kick(v){m=Math.max(m,reduced()?v*.25:v);},step(dt){m=Math.max(0,m-dt*30);},apply(x){if(m>.3)x.translate((Math.random()-.5)*m,(Math.random()-.5)*m);},get mag(){return m;}};}
// ---------------------------------------------------------------- synth sfx (WebAudio, procedural)
let noiseBuf=null;
function ac(){try{return audioContext();}catch{return null;}}
function env(g,t0,dur,vol,attack=.004){g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(Math.max(.0002,vol),t0+attack);g.gain.exponentialRampToValueAtTime(.0001,t0+Math.max(dur,attack+.01));}
function voice(freq,dur=.12,vol=.05,type='sine',{delay=0,slide=0,dest,attack=.004,detune=0,lp=0}={}){
 const a=ac();if(!a)return;const t0=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,t0);if(detune)o.detune.value=detune;
 if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),t0+dur);env(g,t0,dur,vol,attack);let out=o;
 if(lp){const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;o.connect(f);out=f;}out.connect(g);g.connect(dest||a.destination);o.start(t0);o.stop(t0+dur+.06);
}
function noise(dur=.1,vol=.05,{delay=0,type='lowpass',f0=1500,f1=0,q=.8,dest,attack=.002}={}){
 const a=ac();if(!a)return;if(!noiseBuf||noiseBuf.sampleRate!==a.sampleRate){noiseBuf=a.createBuffer(1,a.sampleRate,a.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
 const t0=a.currentTime+delay,src=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();src.buffer=noiseBuf;src.loop=true;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t0);if(f1)f.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t0+dur);
 env(g,t0,dur,vol,attack);src.connect(f);f.connect(g);g.connect(dest||a.destination);src.start(t0,Math.random()*.5);src.stop(t0+dur+.05);
}
const sfx={
 gun(){noise(.22,.2,{f0:3200,f1:250});voice(150,.2,.16,'sine',{slide:.25});},
 gunFar(){noise(.3,.1,{f0:1800,f1:200});voice(110,.25,.08,'sine',{slide:.3});},
 click(){noise(.03,.08,{type:'highpass',f0:3000});voice(1800,.02,.03,'square');},
 draw(){voice(1320,.28,.08,'square');voice(1760,.3,.06,'square',{delay:.07});noise(.12,.1,{type:'highpass',f0:2500});},
 thump(vol=.14){voice(60,.16,vol,'sine',{slide:.6});},
 whoosh(f0=700,f1=2600,vol=.07,dur=.16){noise(dur,vol,{type:'bandpass',f0,f1,q:2.2,attack:.03});},
 shing(){voice(2300,.3,.035,'triangle');voice(3100,.22,.02,'sine',{delay:.02});noise(.14,.05,{type:'highpass',f0:4500});},
 hit(){noise(.1,.12,{f0:900,f1:200});voice(180,.1,.08,'square',{slide:.5});},
 splat(){noise(.14,.1,{type:'bandpass',f0:600,f1:200,q:1.4});voice(220,.1,.06,'sine',{slide:.4});},
 ding(f=1046){voice(f,.4,.06,'sine');voice(f*2.01,.25,.025,'sine');},
 buzz(){voice(190,.5,.025,'sawtooth',{lp:900});},
 phone(){for(let i=0;i<4;i++)voice(i%2?880:700,.07,.05,'square',{delay:i*.08});},
 groan(){voice(220,.5,.05,'sawtooth',{slide:.6,lp:600});},
 coin(){voice(988,.08,.05,'square');voice(1319,.2,.05,'square',{delay:.07});},
 fanfare(){[523,659,784,1046].forEach((f,i)=>voice(f,.22,.05,'triangle',{delay:i*.09}));}
};
// ---------------------------------------------------------------- input
// Multi-touch router: every pointer is owned by the half (or zone) it first touched; no one-finger-per-player limit.
function halfPointers(s,{down,move,up,chooseOwner}={}){
 const own=chooseOwner||(p=>p.x<s.W/2?0:1),map=new Map();
 const clear=()=>{const all=[...map.values()];map.clear();for(const r of all){s.release({pointerId:r.id});up?.(r.i,r,{cancelled:true});}};
 s.on(s.c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev),r={id:ev.pointerId,i:own(p),x:p.x,y:p.y,sx:p.x,sy:p.y,px:p.x,py:p.y,t0:performance.now(),dist:0};map.set(r.id,r);s.capture(ev);down?.(r.i,r);});
 s.on(s.c,'pointermove',ev=>{const r=map.get(ev.pointerId);if(!r||s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev);r.px=r.x;r.py=r.y;r.x=p.x;r.y=p.y;r.dist+=Math.hypot(r.x-r.px,r.y-r.py);move?.(r.i,r);});
 const end=(ev,cancelled)=>{const r=map.get(ev.pointerId);if(!r)return;map.delete(r.id);s.release(ev);if(!cancelled){const p=s.pointer(ev);r.px=r.x;r.py=r.y;r.x=p.x;r.y=p.y;}up?.(r.i,r,{cancelled});};
 s.on(s.c,'pointerup',ev=>end(ev,false));s.on(s.c,'pointercancel',ev=>end(ev,true));s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 return map;
}
// Keyboard: P1 WASD + Space, P2 arrows + Enter. map: {key: [player, name]}; fn(player,name,down)
const KEYMAP={w:[0,'u'],a:[0,'l'],s:[0,'d'],d:[0,'r'],' ':[0,'act'],f:[0,'act'],arrowup:[1,'u'],arrowleft:[1,'l'],arrowdown:[1,'d'],arrowright:[1,'r'],enter:[1,'act']};
function keyboard(s,fn,{repeat=false}={}){
 for(const type of ['keydown','keyup'])s.on(document,type,ev=>{const b=KEYMAP[ev.key.toLowerCase()];if(!b)return;ev.preventDefault();if(type==='keydown'&&(ev.repeat&&!repeat||s.paused||!s.alive))return;fn(b[0],b[1],type==='keydown');});
}
// Rolling dt scale for slow-motion beats. Call .hit(duration,scale); .scale(dt) returns real dt * scale.
function makeSlowmo(){let t=0,sc=1,total=0;return {hit(d=.5,k=.25){if(reduced())d*=.5;t=Math.max(t,d);total=Math.max(total,d);sc=k;},step(dt){if(t>0)t-=dt;if(t<=0)total=0;},get on(){return t>0;},get k(){return t>0?sc+(1-sc)*Math.pow(1-clamp(t/Math.max(.01,total),0,1),3):1;}};}
Object.assign(exports,{CHAPTER_WORDS,SERIF,SANS,MONO,reduced,rr,lerp,ease,fmtMs,label,filmOverlay,flash,mono,titleCard,subtitle,makeFx,makeShake,makeSlowmo,voice,noise,sfx,halfPointers,keyboard,ac});
