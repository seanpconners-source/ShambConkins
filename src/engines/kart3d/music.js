// Original space-disco race loop for the 3D kart game (composed for ShambConkins, no borrowed melody): octave bass,
// sparkling arpeggios, a square-wave lead and four-on-the-floor drums, scheduled ahead on the WebAudio clock.
// The game calls tick() every frame; tempo rises on the final lap.
const CH=[[62,66,69,73],[59,62,66,69],[55,59,62,66],[57,61,64,67],[62,66,69,73],[59,62,66,69],[55,59,62,66],[57,61,64,67]];
const ROOT=[38,35,43,45,38,35,43,45];
// lead: [bar, step, midi, length in 16ths]
const LEAD=[[0,0,78,2],[0,2,81,2],[0,4,78,2],[0,6,76,2],[0,8,74,4],[0,12,76,2],[0,14,78,2],
 [1,0,74,4],[1,4,71,4],[1,8,74,2],[1,10,78,2],[1,12,76,4],
 [2,0,74,2],[2,2,71,2],[2,4,67,4],[2,8,71,2],[2,10,74,2],[2,12,79,4],
 [3,0,78,2],[3,2,76,2],[3,4,73,4],[3,8,76,4],[3,12,81,4],
 [4,0,81,4],[4,4,78,2],[4,6,81,2],[4,8,85,4],[4,12,83,4],
 [5,0,83,2],[5,2,81,2],[5,4,78,4],[5,8,74,4],[5,12,78,4],
 [6,0,79,4],[6,4,78,2],[6,6,76,2],[6,8,74,2],[6,10,71,2],[6,12,74,4],
 [7,0,76,4],[7,4,73,2],[7,6,76,2],[7,8,69,8]];
const hz=m=>440*Math.pow(2,(m-69)/12);
function createKartMusic(ac,{transpose=0,volume=.05}={}){
 if(!ac)return null;
 const master=ac.createGain();master.gain.value=volume;master.connect(ac.destination);
 const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=9000;lp.connect(master);
 let noiseBuf=null;const nb=()=>{if(!noiseBuf){noiseBuf=ac.createBuffer(1,ac.sampleRate*.4,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}return noiseBuf;};
 const tone=(f,t,dur,type,vol,{att=.005,rel=.08,cut=0,detune=0}={})=>{const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(detune)o.detune.value=detune;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.setValueAtTime(vol,t+Math.max(att,dur-rel));g.gain.linearRampToValueAtTime(0,t+dur);
  let out=o;if(cut){const f2=ac.createBiquadFilter();f2.type='lowpass';f2.frequency.value=cut;o.connect(f2);out=f2;}out.connect(g);g.connect(lp);o.start(t);o.stop(t+dur+.02);};
 const kick=t=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(g);g.connect(lp);o.start(t);o.stop(t+.24);};
 const hiss=(t,dur,vol,freq,type='highpass')=>{const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=nb();f.type=type;f.frequency.value=freq;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(lp);s.start(t,Math.random()*.2);s.stop(t+dur+.02);};
 let step=0,next=ac.currentTime+.1,rate=1,stopped=false;
 const leadAt=new Map();for(const [b,s,m,l] of LEAD)leadAt.set(b*16+s,[m,l]);
 function play(n,t,sp){
  const bar=Math.floor(n/16)%8,s=n%16,tr=transpose;
  if(s%4===0)kick(t);if(s===4||s===12){hiss(t,.16,.35,1800,'bandpass');tone(190,t,.08,'triangle',.25);}
  if(s%4===2)hiss(t,.12,.16,7000);else hiss(t,.03,.05,9000);
  if(s%2===0){const r=ROOT[bar]+tr+(s%4===2?12:0);tone(hz(r),t,sp*1.7,'sawtooth',.32,{cut:700,rel:.04});tone(hz(r),t,sp*1.7,'square',.12,{cut:500});}
  const ch=CH[bar],a=ch[[0,1,2,3,2,1][s%6]]+tr+12;tone(hz(a),t,sp*.9,'triangle',.09,{rel:.05});
  if(s===0||s===8){for(const m of ch)tone(hz(m+tr),t,sp*7.5,'sawtooth',.035,{att:.08,rel:.3,cut:1600,detune:(m%3-1)*7});}
  const L=leadAt.get(bar*16+s);if(L){const [m,l]=L;tone(hz(m+tr),t,sp*l*.92,'square',.11,{rel:.06,cut:3200});tone(hz(m+tr+12),t,sp*l*.6,'triangle',.04);}
 }
 return {
  tick(){if(stopped)return;const now=ac.currentTime;if(next<now-.3)next=now+.05;const sp=60/152/4/rate;while(next<now+.22){play(step,next,sp);step=(step+1)%128;next+=sp;}},
  setRate(r){rate=r;},
  victory(){const t=ac.currentTime+.05;[74,78,81,86,85,86].forEach((m,i)=>tone(hz(m+transpose),t+i*.13,i===5?.7:.14,'square',.13,{cut:3500}));stopped=true;},
  stop(){stopped=true;try{master.gain.setTargetAtTime(0,ac.currentTime,.05);setTimeout(()=>{try{master.disconnect();}catch{}},400);}catch{}}
 };
}
Object.assign(exports,{createKartMusic});
