// Frank's fake-out (ROADMAP E2): after the players "take the laxative" for Frank's Shits and Ladders, the board melts and
// drips away, the screen goes black, "I don't think that was a laxative..." types itself out, and Frank's face fades in
// out of the dark before the LEVEL IV card. frankReveal() plays it here and (fx) on the other phone of an online board
// game; playFrankReveal() is what that phone runs. Tap to hurry it after the first two seconds. ~8 s.
const {fx}=require("src/netHooks.js");
const {portraitURL}=require("src/assets.js");
const {store}=require("src/state.js");
const {audioContext}=require("src/audio.js");
const LINE='I don’t think that was a laxative…';
function frankReveal(){fx('frankReveal');return playFrankReveal();}
// low drone, a falling wobble while it melts, and Frank's "heh heh heh"
function frankSound(){if(!store.profile?.settings?.sound)return;const a=audioContext();if(!a)return;try{const t=a.currentTime,out=a.createGain();out.gain.setValueAtTime(.0001,t);out.gain.exponentialRampToValueAtTime(.09,t+.6);out.gain.setValueAtTime(.09,t+6.6);out.gain.exponentialRampToValueAtTime(.0001,t+8);out.connect(a.destination);
 const melt=a.createOscillator(),mg=a.createGain();melt.type='sawtooth';melt.frequency.setValueAtTime(420,t);melt.frequency.exponentialRampToValueAtTime(60,t+2.8);const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=7;lg.gain.value=30;lfo.connect(lg);lg.connect(melt.frequency);mg.gain.value=.5;melt.connect(mg);mg.connect(out);melt.start(t);melt.stop(t+3);lfo.start(t);lfo.stop(t+3);
 for(const f of [41.2,61.7]){const d=a.createOscillator(),dg=a.createGain(),lp=a.createBiquadFilter();d.type='sawtooth';d.frequency.value=f;lp.type='lowpass';lp.frequency.value=220;dg.gain.value=.55;d.connect(lp);lp.connect(dg);dg.connect(out);d.start(t+2.4);d.stop(t+8);}
 for(let k=0;k<3;k++){const h=a.createOscillator(),hg=a.createGain(),bp=a.createBiquadFilter(),s=t+5.6+k*.24;h.type='sawtooth';h.frequency.setValueAtTime(150-k*12,s);h.frequency.exponentialRampToValueAtTime(110-k*10,s+.16);bp.type='bandpass';bp.frequency.value=700;bp.Q.value=3;hg.gain.setValueAtTime(.0001,s);hg.gain.exponentialRampToValueAtTime(.7,s+.03);hg.gain.exponentialRampToValueAtTime(.0001,s+.18);h.connect(bp);bp.connect(hg);hg.connect(out);h.start(s);h.stop(s+.2);}}catch{}}
function playFrankReveal(){return new Promise(done=>{
 const reduce=!!store.profile?.settings?.reducedMotion,D=reduce?.6:1,T={melt:2.6*D,black:3,text:3.2,face:5.2,out:7.6,end:8.2};
 document.getElementById('frank-reveal')?.remove();
 const el=document.createElement('div');el.id='frank-reveal';el.setAttribute('role','presentation');
 el.innerHTML='<canvas></canvas><p class="fr-line"></p><img class="fr-face" alt="">';document.body.append(el);document.body.classList.add('frank-melt');
 const cv=el.querySelector('canvas'),g=cv.getContext('2d'),line=el.querySelector('.fr-line'),face=el.querySelector('.fr-face');
 let src=null;try{src=portraitURL('frank','angry')||portraitURL('frank','normal');}catch{}if(src)face.src=src;
 const dpr=Math.min(2,window.devicePixelRatio||1),size=()=>{cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;};size();
 // drips: columns of brown/red/sick-green goo running down from the top, each with its own speed and wobble
 const drips=Array.from({length:Math.ceil(innerWidth/22)},(_,i)=>({x:(i+Math.random()*.6)/Math.ceil(innerWidth/22),w:.022+Math.random()*.05,v:.3+Math.random()*.6,d:Math.random()*.6,col:['#4a1d0d','#6b0f12','#3e4a12','#2a0d1c'][i%4]}));
 frankSound();let t0=performance.now(),skip=false,raf=0;const hurry=()=>{if((performance.now()-t0)/1000>2)skip=true;};el.addEventListener('pointerdown',hurry);
 const frame=()=>{let t=(performance.now()-t0)/1000;if(skip&&t<T.out){t0-=(T.out-t)*1000;t=T.out;skip=false;}
  const W=cv.width,H=cv.height;g.clearRect(0,0,W,H);
  // the melt: goo pours down, then everything goes black
  const m=Math.min(1,t/T.melt);for(const dr of drips){const len=Math.max(0,m-dr.d*m)*dr.v*1.9*H,x=dr.x*W+Math.sin(t*3+dr.x*20)*4*dpr,w=dr.w*W;g.fillStyle=dr.col;g.globalAlpha=.9;g.fillRect(x-w/2,0,w,len);g.beginPath();g.arc(x,len,w*.75,0,Math.PI*2);g.fill();}
  g.globalAlpha=Math.min(1,Math.max(0,(t-T.melt*.55)/(T.black-T.melt*.55)));g.fillStyle='#000';g.fillRect(0,0,W,H);g.globalAlpha=1;
  // the line, typed
  if(t>=T.text){const n=Math.min(LINE.length,Math.floor((t-T.text)*16));line.textContent=LINE.slice(0,n);line.style.opacity=t>T.out?String(Math.max(0,1-(t-T.out)/.5)):'1';}
  // Frank out of the dark
  if(t>=T.face){const u=Math.min(1,(t-T.face)/1.6);face.style.opacity=String(t>T.out?Math.max(0,1-(t-T.out)/.5):u*.95);face.style.transform=`translate(-50%,-50%) scale(${reduce?1:1+u*.12})`;}
  if(t>=T.end){cancelAnimationFrame(raf);el.remove();document.body.classList.remove('frank-melt');done();return;}
  raf=requestAnimationFrame(frame);};
 raf=requestAnimationFrame(frame);});}
Object.assign(exports,{frankReveal,playFrankReveal});
