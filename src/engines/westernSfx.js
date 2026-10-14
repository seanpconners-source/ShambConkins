// Western sound effects, all synthesized with WebAudio (no samples): gunshots with a canyon echo, ricochets, revolver
// cocking / dry fire / cylinder spin, spur jingles, horse gallop, snort and whinny, a whip crack, a wooden trapdoor and
// a synthesized "Yeehaw!". Used by Hangman Unchained. Respects the Sound setting.
const {store}=require("src/state.js");
const {audioContext}=require("src/audio.js");

let bus=null,busCtx=null,noise=null;
function ctx(){if(!store.profile?.settings.sound)return null;const a=audioContext();if(!a)return null;
 if(busCtx!==a){busCtx=a;const comp=a.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=12;comp.ratio.value=5;comp.attack.value=.002;comp.release.value=.18;
  const g=a.createGain();g.gain.value=.8;comp.connect(g);g.connect(a.destination);bus=comp;
  noise=a.createBuffer(1,Math.floor(a.sampleRate*1.5),a.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
 return a;}
// building blocks ----------------------------------------------------------------------------------------------
function env(a,g,t,peak,attack,decay){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+attack+decay);}
function out(a,vol=1,pan=0){const g=a.createGain();g.gain.value=vol;let node=g;if(pan&&a.createStereoPanner){const p=a.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(bus);}else g.connect(bus);return node;}
function burst(a,dest,t,{dur=.1,peak=.6,attack=.002,type='bandpass',f=1000,f2=null,q=1,offset=Math.random()}={}){
 const n=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();n.buffer=noise;fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+dur);fl.Q.value=q;
 env(a,g,t,peak,attack,dur);n.connect(fl);fl.connect(g);g.connect(dest);n.start(t,offset*.9,dur+attack+.05);}
function osc(a,dest,t,{type='sine',f=440,f2=null,dur=.2,peak=.3,attack=.005,curve=null}={}){
 const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(curve)o.frequency.setValueCurveAtTime(curve,t,dur);else if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
 env(a,g,t,peak,attack,dur);o.connect(g);g.connect(dest);o.start(t);o.stop(t+attack+dur+.05);return o;}
// canyon echo: a feedback delay with a darkening filter, faded out after a moment
function echo(a,src,t,{time=.23,fb=.38,len=1.4,wet=.5}={}){const d=a.createDelay(1),f=a.createGain(),lp=a.createBiquadFilter(),w=a.createGain();d.delayTime.value=time;f.gain.value=fb;lp.type='lowpass';lp.frequency.value=1500;
 src.connect(d);d.connect(lp);lp.connect(f);f.connect(d);lp.connect(w);w.connect(bus);w.gain.setValueAtTime(wet,t);w.gain.setValueAtTime(wet,t+len*.6);w.gain.linearRampToValueAtTime(0,t+len);setTimeout(()=>{try{src.disconnect(d);w.disconnect();}catch{}},(len+.5)*1000);}

// sounds -------------------------------------------------------------------------------------------------------
function gunshot({vol=.9,pan=0,delay=0,far=false}={}){const a=ctx();if(!a)return;const t=a.currentTime+delay,o=out(a,vol*(far?.45:1),pan);
 burst(a,o,t,{dur:.05,peak:1,attack:.001,type:'highpass',f:2500,q:.5});
 burst(a,o,t,{dur:.32,peak:.9,attack:.002,type:'lowpass',f:far?2200:5200,f2:420,q:.7});
 osc(a,o,t,{f:170,f2:38,dur:.22,peak:.95,attack:.002});
 burst(a,o,t+.01,{dur:.6,peak:.18,attack:.01,type:'lowpass',f:900,f2:200,q:.4});
 echo(a,o,t,{time:far?.31:.24,fb:.36,wet:.45});}
function ricochet({vol=.4,pan=0,delay=0}={}){const a=ctx();if(!a)return;const t=a.currentTime+delay,o=out(a,vol,pan),f=2600+Math.random()*900;
 const curve=new Float32Array(32);for(let i=0;i<32;i++){const k=i/31;curve[i]=f*(1-k*.62)+Math.sin(k*40)*90;}
 osc(a,o,t,{type:'sine',curve,dur:.42,peak:.32,attack:.004});osc(a,o,t,{type:'triangle',f:f*1.5,f2:f*.5,dur:.3,peak:.08,attack:.004});
 burst(a,o,t,{dur:.04,peak:.5,type:'highpass',f:4000});}
function click(a,o,t,peak=.6,f=3200){burst(a,o,t,{dur:.012,peak,attack:.0008,type:'bandpass',f,q:3});osc(a,o,t,{type:'square',f:f*.35,f2:f*.2,dur:.015,peak:peak*.15,attack:.0008});}
function cock({vol=.6,delay=0}={}){const a=ctx();if(!a)return;const t=a.currentTime+delay,o=out(a,vol);click(a,o,t,.5,2400);burst(a,o,t+.02,{dur:.05,peak:.12,type:'bandpass',f:1600,q:2});click(a,o,t+.11,.75,3600);}
function dryFire({vol=.6,delay=0}={}){const a=ctx();if(!a)return;const t=a.currentTime+delay,o=out(a,vol);click(a,o,t,.8,2900);osc(a,o,t+.002,{f:900,f2:600,dur:.04,peak:.1});}
function cylinder({vol=.45,delay=0,n=14}={}){const a=ctx();if(!a)return;const t0=a.currentTime+delay,o=out(a,vol);let t=t0;for(let i=0;i<n;i++){click(a,o,t,.35+.2*(i===n-1),3000+(i%3)*300);t+=.028+i*i*.0006;}click(a,o,t+.05,.8,2200);}
function spurs({vol=.35,delay=0,steps=2,pan=0}={}){const a=ctx();if(!a)return;const o=out(a,vol,pan);
 for(let s=0;s<steps;s++){const t=a.currentTime+delay+s*.32;for(let j=0;j<3;j++){const tt=t+j*.035+Math.random()*.01;for(const [f,p]of [[3150,.22],[4720,.16],[6230,.12],[8010,.06]])osc(a,o,tt,{type:'sine',f:f*(1+(Math.random()-.5)*.03),dur:.16+Math.random()*.08,peak:p*(1-j*.25),attack:.001});}
  burst(a,o,t,{dur:.04,peak:.12,type:'lowpass',f:500});}}
function jingle(opts={}){spurs({steps:1,vol:.22,...opts});}
function gallop({vol=.55,delay=0,beats=6,pan=0,rate=.36}={}){const a=ctx();if(!a)return;const o=out(a,vol,pan);
 for(let b=0;b<beats;b++){const t=a.currentTime+delay+b*rate,k=1-Math.abs(b-beats/2)/beats*.8;
  for(const [dt,p]of [[0,.7],[.075,.55],[.15,.9]]){burst(a,o,t+dt,{dur:.06,peak:p*k,attack:.001,type:'bandpass',f:700+Math.random()*250,q:1.6});osc(a,o,t+dt,{f:140,f2:70,dur:.07,peak:p*.6*k,attack:.001});}}}
function snort({vol=.4,delay=0}={}){const a=ctx();if(!a)return;const t=a.currentTime+delay,o=out(a,vol);
 burst(a,o,t,{dur:.22,peak:.55,attack:.02,type:'bandpass',f:700,f2:420,q:1.2});burst(a,o,t+.26,{dur:.3,peak:.4,attack:.03,type:'lowpass',f:900,f2:300,q:.8});
 osc(a,o,t,{type:'sawtooth',f:90,f2:60,dur:.2,peak:.06});}
function whinny({vol=.45,delay=0}={}){const a=ctx();if(!a)return;const t=a.currentTime+delay,o=out(a,vol),dur=1.25;
 const src=a.createOscillator(),lfo=a.createOscillator(),lg=a.createGain(),g=a.createGain();src.type='sawtooth';
 src.frequency.setValueAtTime(620,t);src.frequency.linearRampToValueAtTime(1350,t+.18);src.frequency.linearRampToValueAtTime(1100,t+.5);src.frequency.exponentialRampToValueAtTime(420,t+dur);
 lfo.frequency.setValueAtTime(14,t);lfo.frequency.linearRampToValueAtTime(22,t+dur);lg.gain.setValueAtTime(40,t);lg.gain.linearRampToValueAtTime(150,t+.4);lg.gain.linearRampToValueAtTime(90,t+dur);lfo.connect(lg);lg.connect(src.frequency);
 const f1=a.createBiquadFilter(),f2=a.createBiquadFilter(),mix=a.createGain();f1.type='bandpass';f1.frequency.value=1100;f1.Q.value=4;f2.type='bandpass';f2.frequency.value=2600;f2.Q.value=5;
 src.connect(f1);src.connect(f2);f1.connect(mix);f2.connect(mix);mix.connect(g);g.connect(o);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.9,t+.06);g.gain.setValueAtTime(.8,t+.6);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 src.start(t);lfo.start(t);src.stop(t+dur+.05);lfo.stop(t+dur+.05);
 burst(a,o,t+dur-.15,{dur:.35,peak:.35,attack:.03,type:'bandpass',f:600,f2:300,q:1});}
function whip({vol=.6,delay=0}={}){const a=ctx();if(!a)return;const t=a.currentTime+delay,o=out(a,vol);
 burst(a,o,t,{dur:.18,peak:.18,attack:.12,type:'bandpass',f:500,f2:3000,q:.8});burst(a,o,t+.13,{dur:.03,peak:1,attack:.0008,type:'highpass',f:3000});osc(a,o,t+.13,{f:2400,f2:900,dur:.05,peak:.25,attack:.001});echo(a,o,t,{time:.19,fb:.3,wet:.3,len:.9});}
function trapdoor({vol=.8,delay=0}={}){const a=ctx();if(!a)return;const t=a.currentTime+delay,o=out(a,vol);
 osc(a,o,t,{type:'sawtooth',f:110,f2:70,dur:.35,peak:.08,attack:.05});burst(a,o,t+.32,{dur:.4,peak:.9,attack:.002,type:'lowpass',f:500,f2:120,q:.7});osc(a,o,t+.32,{f:95,f2:40,dur:.4,peak:.9,attack:.002});
 burst(a,o,t+.36,{dur:.12,peak:.35,type:'bandpass',f:1300,q:2});}
// voice synth: a sawtooth through three formant filters that glide from "ee" to "aw"
function yeehaw({vol=.6,delay=0,pitch=1}={}){const a=ctx();if(!a)return;const t=a.currentTime+delay,o=out(a,vol);
 const src=a.createOscillator(),vib=a.createOscillator(),vg=a.createGain(),g=a.createGain();src.type='sawtooth';
 const p=x=>x*pitch;src.frequency.setValueAtTime(p(260),t);src.frequency.exponentialRampToValueAtTime(p(560),t+.28);src.frequency.setValueAtTime(p(540),t+.36);
 src.frequency.exponentialRampToValueAtTime(p(600),t+.48);src.frequency.exponentialRampToValueAtTime(p(250),t+1.05);
 vib.frequency.value=6.5;vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(p(14),t+.6);vib.connect(vg);vg.connect(src.frequency);
 const F=[[270,650,9],[2300,1050,12],[3000,2500,14]],mix=a.createGain();
 F.forEach(([ee,aw,q],i)=>{const f=a.createBiquadFilter();f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(ee*(i===1?.75:1),t);f.frequency.exponentialRampToValueAtTime(ee,t+.12);f.frequency.setValueAtTime(ee,t+.34);f.frequency.exponentialRampToValueAtTime(aw,t+.56);
  const fg=a.createGain();fg.gain.value=[1,.55,.3][i]*(i?3:1.6);src.connect(f);f.connect(fg);fg.connect(mix);});
 mix.connect(g);g.connect(o);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.7,t+.06);g.gain.setValueAtTime(.7,t+.3);g.gain.exponentialRampToValueAtTime(.12,t+.4);g.gain.exponentialRampToValueAtTime(.9,t+.5);g.gain.setValueAtTime(.8,t+.8);g.gain.exponentialRampToValueAtTime(.0001,t+1.15);
 src.start(t);vib.start(t);src.stop(t+1.2);vib.stop(t+1.2);
 burst(a,o,t+.37,{dur:.1,peak:.25,attack:.02,type:'bandpass',f:1400,q:.8});// the breathy "h"
}
const SFX={gunshot,ricochet,cock,dryFire,cylinder,spurs,jingle,gallop,snort,whinny,whip,trapdoor,yeehaw};
Object.assign(exports,{SFX});
