// Shared helpers for the six split-screen "arena" games (src/packs/arenaPack.js):
// particles/shake/pop-up text, keyboard + multi-finger touch input, countdown, banners and synth sounds.
const {clamp}=require("src/utils.js");
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");

const PCOL=['#4aa3ff','#ff6fa8'],PDARK=['#1b5db3','#b33a73'],PLIGHT=['#bfe0ff','#ffd0e3'];
const FONT='"Arial Black",Impact,system-ui,sans-serif';
const reduced=()=>!!store.profile?.settings?.reducedMotion;

function rr(x,px,py,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();}
function outlined(x,text,px,py,{size=20,fill='#fff',stroke='#000',align='center',base='middle',lw=null,alpha=1,font=FONT}={}){
 x.save();x.globalAlpha*=alpha;x.font=`900 ${size}px ${font}`;x.textAlign=align;x.textBaseline=base;x.lineJoin='round';x.lineWidth=lw??Math.max(3,size*.2);x.strokeStyle=stroke;x.strokeText(text,px,py);x.fillStyle=fill;x.fillText(text,px,py);x.restore();
}
function heart(x,px,py,size,fill,stroke='#fff'){
 x.save();x.translate(px,py);x.scale(size/20,size/20);x.beginPath();x.moveTo(0,7);x.bezierCurveTo(-14,-2,-8,-12,0,-5);x.bezierCurveTo(8,-12,14,-2,0,7);x.closePath();x.lineWidth=2.4;x.strokeStyle=stroke;x.stroke();x.fillStyle=fill;x.fill();x.restore();
}

// ------------------------------------------------------------------ sound (tiny synth, throttled)
let sndBudget=0,sndStamp=0;
function snd(freq,dur=.08,{vol=.05,type='sine',to=null,delay=0}={}){
 if(!store.profile?.settings?.sound)return;const now=performance.now();if(now-sndStamp>70){sndStamp=now;sndBudget=0;}if(++sndBudget>5)return;
 const a=audioContext();if(!a)return;
 try{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.02);}catch{}
}
let noiseBuf=null;
function noise(dur=.1,{vol=.06,freq=1800,delay=0,q=.8}={}){
 if(!store.profile?.settings?.sound)return;const now=performance.now();if(now-sndStamp>70){sndStamp=now;sndBudget=0;}if(++sndBudget>5)return;
 const a=audioContext();if(!a)return;
 try{if(!noiseBuf){noiseBuf=a.createBuffer(1,a.sampleRate*.5,a.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  const src=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),t=a.currentTime+delay;src.buffer=noiseBuf;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(f);f.connect(g);g.connect(a.destination);src.start(t,Math.random()*.2);src.stop(t+dur+.02);}catch{}
}
const jingle=(notes,{step=.08,type='triangle',vol=.05,dur=.14}={})=>notes.forEach((n,i)=>snd(n,dur,{type,vol,delay:i*step}));

// ------------------------------------------------------------------ particles, rings, pop-up text, shake
class Fx{
 constructor(){this.p=[];this.pops=[];this.rings=[];this.shakeAmt=0;}
 burst(px,py,{n=10,color='#fff',colors=null,speed=200,life=.5,size=4,gravity=0,angle=0,spread=Math.PI*2,drag=1.6,shape='circle',grow=0}={}){
  if(reduced())n=Math.ceil(n/3);if(this.p.length>420)return;
  for(let i=0;i<n;i++){const a=angle+(Math.random()-.5)*spread,v=speed*(.35+Math.random()*.75);this.p.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:life*(.6+Math.random()*.6),max:life,size:size*(.6+Math.random()*.8),color:colors?colors[Math.floor(Math.random()*colors.length)]:color,g:gravity,drag,shape,rot:Math.random()*6.28,vr:(Math.random()-.5)*10,grow});}
 }
 pop(px,py,text,{color='#fff',stroke='#1a1a2e',size=22,life=.9,rise=46}={}){this.pops.push({x:px,y:py,text,color,stroke,size,life,max:life,rise});}
 ring(px,py,{color='#fff',r0=4,r1=60,life=.35,width=4}={}){this.rings.push({x:px,y:py,color,r0,r1,life,max:life,width});}
 shake(a){if(!reduced())this.shakeAmt=Math.max(this.shakeAmt,a);}
 update(dt){
  for(const p of this.p){p.life-=dt;const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy=p.vy*d+p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;p.size+=p.grow*dt;}
  this.p=this.p.filter(p=>p.life>0);
  for(const p of this.pops)p.life-=dt;this.pops=this.pops.filter(p=>p.life>0);
  for(const r of this.rings)r.life-=dt;this.rings=this.rings.filter(r=>r.life>0);
  this.shakeAmt=Math.max(0,this.shakeAmt-dt*38);
 }
 begin(x){x.save();if(this.shakeAmt>0.2)x.translate((Math.random()-.5)*this.shakeAmt,(Math.random()-.5)*this.shakeAmt);}
 end(x){x.restore();}
 draw(x){
  for(const p of this.p){const a=clamp(p.life/p.max*1.6,0,1);x.globalAlpha=a;x.fillStyle=p.color;
   if(p.shape==='square'){x.save();x.translate(p.x,p.y);x.rotate(p.rot);x.fillRect(-p.size,-p.size,p.size*2,p.size*2);x.restore();}
   else if(p.shape==='star'){x.save();x.translate(p.x,p.y);x.rotate(p.rot);x.beginPath();for(let k=0;k<8;k++){const r=k%2?p.size*.45:p.size*1.4,an=k*Math.PI/4;x.lineTo(Math.cos(an)*r,Math.sin(an)*r);}x.closePath();x.fill();x.restore();}
   else{x.beginPath();x.arc(p.x,p.y,Math.max(.5,p.size),0,6.283);x.fill();}}
  x.globalAlpha=1;
  for(const r of this.rings){const k=1-r.life/r.max;x.globalAlpha=1-k;x.strokeStyle=r.color;x.lineWidth=r.width*(1-k*.6);x.beginPath();x.arc(r.x,r.y,r.r0+(r.r1-r.r0)*Math.sqrt(k),0,6.283);x.stroke();}
  x.globalAlpha=1;
  for(const p of this.pops){const k=1-p.life/p.max,sc=k<.15?.6+k/.15*.5:1.1-Math.min(.1,(k-.15)*.3);x.globalAlpha=clamp(p.life/p.max*2.2,0,1);outlined(x,p.text,p.x,p.y-p.rise*Math.sqrt(k),{size:p.size*sc,fill:p.color,stroke:p.stroke});}
  x.globalAlpha=1;
 }
}

// ------------------------------------------------------------------ keyboard: P1 WASD + Space, P2 arrows + Enter
function arenaKeys(s){
 const state=[{l:0,r:0,u:0,d:0,fire:0},{l:0,r:0,u:0,d:0,fire:0}],downCbs=[],upCbs=[];
 const map={a:[0,'l'],d:[0,'r'],w:[0,'u'],s:[0,'d'],' ':[0,'fire'],arrowleft:[1,'l'],arrowright:[1,'r'],arrowup:[1,'u'],arrowdown:[1,'d'],enter:[1,'fire']};
 const clear=()=>{for(const st of state)for(const k of Object.keys(st))st[k]=0;};
 const handler=type=>ev=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(ev.target?.tagName))return;
  const m=map[String(ev.key).toLowerCase()];if(!m)return;ev.preventDefault();
  if(type==='keydown'&&(s.paused||!s.alive))return;
  const [i,k]=m;if(type==='keydown'){if(ev.repeat)return;state[i][k]=1;for(const cb of downCbs)cb(i,k,ev);}else{state[i][k]=0;for(const cb of upCbs)cb(i,k,ev);}
 };
 s.on(document,'keydown',handler('keydown'));s.on(document,'keyup',handler('keyup'));s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 return {state,onDown:cb=>downCbs.push(cb),onUp:cb=>upCbs.push(cb),clear};
}

// ------------------------------------------------------------------ touch: every finger belongs to the half it first touched
// Handlers get a finger object {id,owner,x,y,sx,sy,t0,moved,...}. Up to maxFingers per player.
function arenaTouch(s,{owner=p=>p.x<s.W/2?0:1,maxFingers=2,onDown,onMove,onUp,flickWindow=110}={}){
 const fingers=new Map();
 const sample=(f,p)=>{const t=performance.now();f.samples.push({x:p.x,y:p.y,t});while(f.samples.length>2&&t-f.samples[0].t>260)f.samples.shift();};
 const velocity=(f,at=performance.now())=>{
  let first=null;for(const q of f.samples)if(at-q.t<=flickWindow){first=q;break;}
  if(!first)return {x:0,y:0,speed:0};const dt=Math.max(.012,(at-first.t)/1000),vx=(f.x-first.x)/dt,vy=(f.y-first.y)/dt;return {x:vx,y:vy,speed:Math.hypot(vx,vy)};
 };
 const count=o=>{let n=0;for(const f of fingers.values())if(f.owner===o)n++;return n;};
 s.on(s.c,'pointerdown',ev=>{
  if(s.paused||!s.alive||ev.button>0)return;ev.preventDefault();
  const p=s.pointer(ev),o=owner(p);if(o<0||count(o)>=maxFingers)return;
  const f={id:ev.pointerId,owner:o,x:p.x,y:p.y,sx:p.x,sy:p.y,px:p.x,py:p.y,t0:performance.now(),moved:0,samples:[],slot:count(o),data:{}};sample(f,p);fingers.set(ev.pointerId,f);s.capture(ev);onDown?.(f);
 });
 s.on(s.c,'pointermove',ev=>{
  const f=fingers.get(ev.pointerId);if(!f||s.paused||!s.alive)return;ev.preventDefault();
  const p=s.pointer(ev);f.px=f.x;f.py=f.y;f.x=p.x;f.y=p.y;f.moved=Math.max(f.moved,Math.hypot(f.x-f.sx,f.y-f.sy));sample(f,p);onMove?.(f);
 });
 const up=(ev,cancelled)=>{
  const f=fingers.get(ev.pointerId);if(!f)return;fingers.delete(ev.pointerId);s.release(ev);
  if(!cancelled&&Number.isFinite(ev.clientX)&&!s.paused){const p=s.pointer(ev);f.x=p.x;f.y=p.y;f.moved=Math.max(f.moved,Math.hypot(f.x-f.sx,f.y-f.sy));}
  f.vel=cancelled?{x:0,y:0,speed:0}:velocity(f);f.held=performance.now()-f.t0;onUp?.(f,cancelled);
 };
 s.on(s.c,'pointerup',ev=>up(ev,false));s.on(s.c,'pointercancel',ev=>up(ev,true));s.on(s.c,'lostpointercapture',ev=>up(ev,true));
 const clear=()=>{for(const f of [...fingers.values()]){fingers.delete(f.id);s.release({pointerId:f.id});f.vel={x:0,y:0,speed:0};f.held=performance.now()-f.t0;onUp?.(f,true);}};
 s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(clear);
 return {fingers,clear,velocity,count};
}

// ------------------------------------------------------------------ countdown 3-2-1-GO (canvas side)
class Countdown{
 constructor(seconds=3){this.t=seconds+.55;this.n=seconds;this.shown=-1;this.done=false;}
 // returns true while still counting
 update(dt){
  if(this.done)return false;this.t-=dt;const n=Math.ceil(this.t-.55);
  if(n!==this.shown){this.shown=n;if(n>0)snd(440,.09,{type:'square',vol:.04});else if(n===0){snd(880,.22,{type:'square',vol:.05});snd(1320,.3,{type:'triangle',vol:.04,delay:.06});}}
  if(this.t<=0){this.done=true;return false;}return this.t>.55;
 }
 get go(){return !this.done&&this.t<=.55;}
 draw(x,W,H,{y=H*.45,size=Math.min(W,H*1.6)*.26}={}){
  if(this.done)return;x.save();
  if(this.t>.55){const n=Math.ceil(this.t-.55),u=1-((this.t-.55)%1||1)+0,sc=1+Math.max(0,.3-u)*2.4;x.fillStyle='rgba(8,10,24,.3)';x.fillRect(0,0,W,H);x.globalAlpha=u>.8?clamp((1-u)*5,0,1):clamp(u*8,0,1);outlined(x,String(n),W/2,y,{size:size*sc,fill:'#fff',stroke:'#1c2250'});}
  else{const k=clamp(this.t/.55,0,1);x.globalAlpha=clamp(k*2,0,1);outlined(x,'GO!',W/2,y,{size:size*(1.05+(1-k)*.55),fill:'#ffe566',stroke:'#7a3a00'});}
  x.restore();
 }
}

// ------------------------------------------------------------------ banners
function banner(x,W,H,title,sub='',{color='#ffe566',y=H*.45,size=null,alpha=1}={}){
 size=size||Math.min(W*.075,H*.12,64);x.save();x.globalAlpha=alpha;x.fillStyle='rgba(8,10,24,.62)';const h=sub?size*2.5:size*1.7;x.fillRect(0,y-h/2,W,h);
 outlined(x,title,W/2,y-(sub?size*.42:0),{size,fill:color,stroke:'#16122e'});if(sub)outlined(x,sub,W/2,y+size*.68,{size:size*.42,fill:'#fff',stroke:'#16122e'});x.restore();
}
const mmss=sec=>`${Math.floor(Math.max(0,sec)/60)}:${String(Math.ceil(Math.max(0,sec))%60).padStart(2,'0')}`;

// Draw a tiny hand/finger hint that fades after a few seconds ("drag", "tap", "flick").
function gestureHint(x,px,py,kind,t,{color='#fff',size=26}={}){
 const a=clamp(1-t/5,0,1);if(a<=0)return;x.save();x.globalAlpha=a*.85;x.strokeStyle=color;x.fillStyle=color;x.lineWidth=3;x.lineCap='round';
 const ph=(t*1.1)%1;
 if(kind==='drag'){const off=Math.sin(ph*6.283)*size*1.3;x.beginPath();x.arc(px+off,py,size*.45,0,6.283);x.fill();x.globalAlpha=a*.4;x.beginPath();x.moveTo(px-size*1.6,py);x.lineTo(px+size*1.6,py);x.stroke();}
 else if(kind==='tap'){const r=size*(.3+ph*.9);x.beginPath();x.arc(px,py,size*.35,0,6.283);x.fill();x.globalAlpha=a*(1-ph)*.7;x.beginPath();x.arc(px,py,r,0,6.283);x.stroke();}
 else if(kind==='flick'){const k=ph,off=-k*size*2.2;x.globalAlpha=a*(1-k*.6);x.beginPath();x.arc(px,py+off+size,size*.42,0,6.283);x.fill();x.globalAlpha=a*.35;x.beginPath();x.moveTo(px,py+size);x.lineTo(px,py-size*1.5);x.stroke();}
 x.restore();
}

// The canvas starts at a placeholder size and is fitted to its frame on the next animation frames; wait for that
// before measuring s.W/s.H for layout decisions.
async function settle(s){s.queueCanvasFit?.();for(let i=0;i<3;i++)await new Promise(r=>requestAnimationFrame(r));s.fitCanvas?.();return s.alive;}

Object.assign(exports,{settle,PCOL,PDARK,PLIGHT,FONT,rr,outlined,heart,snd,noise,jingle,Fx,arenaKeys,arenaTouch,Countdown,banner,mmss,gestureHint,reduced});
