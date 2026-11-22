// Atari 2600 sound (TIA) for our Atari-style games. The TIA makes sound from a 31.4 kHz clock divided by AUDF+1, shaped by
// AUDC (pure square, /6 square, 4-bit and 5-bit poly buzz, 9-bit noise, /31 bass) at 16 volume steps. A sound effect is a
// list of 60 Hz frames [audc,audf,vol] (how 2600 games drove the chip); tiaPlay renders it sample by sample at the TIA's own
// rate into an AudioBuffer, so the buzz and grit are the real waveforms, not a filtered oscillator.
const {audioContext}=(()=>{try{return require("src/audio.js");}catch{return {};}})();
const RATE=31440;
let poly4=null,poly5=null,poly9=null;
function polys(){if(poly4)return;const mk=(bits,taps)=>{const n=(1<<bits)-1,out=new Uint8Array(n);let r=(1<<bits)-1;for(let i=0;i<n;i++){out[i]=r&1;const b=((r>>taps[0])^(r>>taps[1]))&1;r=(r>>1)|(b<<(bits-1));}return out;};
 poly4=mk(4,[0,1]);poly5=mk(5,[0,2]);poly9=mk(9,[0,4]);}
const DIV31=Uint8Array.from({length:31},(_,i)=>i<18?1:0);
// one channel: returns a function giving the next output bit each TIA tick
function channel(){let cnt=0,p4=0,p5=0,p9=0,d31=0,bit=0,d6=0;
 return (audc,audf)=>{if(++cnt<=audf)return bit;cnt=0;audc&=15;
  if(audc===0||audc===11)return bit=1;
  if(audc===4||audc===5)return bit^=1;
  if(audc===12||audc===13){if(++d6>=3){d6=0;bit^=1;}return bit;}
  if(audc===8){p9=(p9+1)%poly9.length;return bit=poly9[p9];}
  if(audc===1){p4=(p4+1)%poly4.length;return bit=poly4[p4];}
  if(audc===2){d31=(d31+1)%31;if(DIV31[d31]!==DIV31[(d31+30)%31]){p4=(p4+1)%poly4.length;}return bit=poly4[p4];}
  if(audc===3){p5=(p5+1)%poly5.length;if(poly5[p5]){p4=(p4+1)%poly4.length;}return bit=poly4[p4];}
  if(audc===6||audc===10){d31=(d31+1)%31;return bit=DIV31[d31];}
  if(audc===7||audc===9){p5=(p5+1)%poly5.length;return bit=poly5[p5];}
  if(audc===14){d31=(d31+1)%31;if(DIV31[d31]!==DIV31[(d31+30)%31]&&++d6>=3){d6=0;bit^=1;}return bit;}
  if(audc===15){p5=(p5+1)%poly5.length;if(poly5[p5]&&++d6>=3){d6=0;bit^=1;}return bit;}
  return bit;};}
const cache=new Map();
function render(frames){const key=JSON.stringify(frames);if(cache.has(key))return cache.get(key);polys();
 const per=Math.round(RATE/60),data=new Float32Array(per*frames.length),ch=channel();let k=0;
 for(const [audc,audf,vol] of frames)for(let i=0;i<per;i++)data[k++]=(ch(audc,audf)?1:-1)*(vol/15);
 if(cache.size>60)cache.clear();cache.set(key,data);return data;}
// frames: [[audc,audf,vol],...] (one per 1/60 s); repeat a frame with [audc,audf,vol,n]
function expand(frames){const out=[];for(const f of frames){for(let i=0;i<(f[3]||1);i++)out.push([f[0],f[1],f[2]]);}return out;}
function tiaPlay(frames,{gain=.16,on=true}={}){if(!on)return;let a=null;try{a=(audioContext||require("src/audio.js").audioContext)();}catch{}if(!a)return;
 try{const st=require("src/state.js").store;if(st?.profile&&st.profile.settings&&st.profile.settings.sound===false)return;}catch{}
 const data=render(expand(frames)),buf=a.createBuffer(1,data.length,RATE);buf.copyToChannel(data,0);
 const src=a.createBufferSource(),g=a.createGain(),lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=9000;g.gain.value=gain;
 src.buffer=buf;src.connect(lp);lp.connect(g);g.connect(a.destination);src.start();}
Object.assign(exports,{tiaPlay,RATE,render,expand});
