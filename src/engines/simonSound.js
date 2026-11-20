// SIMON SOUND (owner, Nov 20: "as similar as possible" to the real 1978 toy). The real Simon plays a plain square-ish tone
// out of a small speaker for as long as a pad is lit or held: green 415 Hz, red 310 Hz, yellow 252 Hz, blue 209 Hz (an
// A-major chord: E, C#, A, E an octave down). Losing = a low 42 Hz "razz" buzz for about 1.5 s while the right pad lights.
// Synth here: square wave -> small-speaker colour (high-pass, a mid bump, low-pass) with a fast attack and short release,
// so a tone starts the instant the pad lights and stops when it goes dark.
// Drop-in recordings (optional, e.g. the owner's own toy recorded on a phone): assets/music/simon-<green|red|yellow|blue|razz>.
// (wav/mp3/...) -> music:simon-<name>; the middle of the recording loops while a pad is held. Missing = synth.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const NAMES=['green','red','yellow','blue'];
const FREQ=[415,310,252,209],RAZZ=42;
const LEVEL=.15;

function createSimonSound(){
 let a=null,bus=null;const voices=new Map(),bufs={},loading={};
 const on=()=>!!store.profile?.settings.sound;
 function ctx(){if(!on())return null;const c=audioContext();if(!c)return null;
  if(c!==a||!bus){a=c;
   const hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=110;hp.Q.value=.6;
   const mid=a.createBiquadFilter();mid.type='peaking';mid.frequency.value=950;mid.Q.value=.9;mid.gain.value=5;
   const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3000;lp.Q.value=.8;
   const g=a.createGain();g.gain.value=1;
   hp.connect(mid);mid.connect(lp);lp.connect(g);g.connect(a.destination);bus=hp;}
  return a;}
 // recordings: fetched + decoded once, the first time Simon opens
 function want(name){const url=USER['music:simon-'+name];if(!url||bufs[name]||loading[name]||typeof fetch==='undefined')return;const c=ctx();if(!c)return;
  loading[name]=1;fetch(url).then(r=>r.arrayBuffer()).then(b=>c.decodeAudioData(b)).then(buf=>{bufs[name]=buf;}).catch(()=>{});}
 function preload(){for(const n of [...NAMES,'razz'])want(n);}
 function start(id,pad){stop(id,0);const c=ctx();if(!c)return;const t=c.currentTime,name=pad<0?'razz':NAMES[pad],buf=bufs[name];
  const g=c.createGain();g.gain.setValueAtTime(0,t);
  let src;
  if(buf){src=c.createBufferSource();src.buffer=buf;src.loop=true;src.loopStart=Math.min(.08,buf.duration*.2);src.loopEnd=Math.max(src.loopStart+.02,buf.duration-.08);
   g.gain.linearRampToValueAtTime(1,t+.004);g.connect(c.destination);}
  else{src=c.createOscillator();src.type='square';src.frequency.value=pad<0?RAZZ:FREQ[pad];
   g.gain.linearRampToValueAtTime(pad<0?LEVEL*1.25:LEVEL,t+.004);g.connect(bus);}
  src.connect(g);src.start(t);voices.set(id,{src,g});}
 function stop(id,fade=.012){const v=voices.get(id);if(!v)return;voices.delete(id);const c=a;if(!c)return;const t=c.currentTime;
  try{v.g.gain.cancelScheduledValues(t);v.g.gain.setValueAtTime(v.g.gain.value,t);v.g.gain.linearRampToValueAtTime(0,t+fade);v.src.stop(t+fade+.02);}catch{}}
 function stopAll(){for(const id of [...voices.keys()])stop(id);}
 return {start,stop,stopAll,preload};
}
Object.assign(exports,{createSimonSound,FREQ,RAZZ});
