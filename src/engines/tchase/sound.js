// Judgment Day Chase sound, all made in WebAudio (no recordings): a running engine that follows your speed, police
// sirens and a helicopter that get louder as they come close, gun/explosion/crash effects, and an ORIGINAL industrial
// driving score (metal anvil hits, distorted bass ostinato, pads) that gets heavier with the heat and the boss.
// Not the film's theme. Honours the Sound and Music settings; hold(true) while paused, stop() on exit.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");

function makeSound(){
 let a=null,bus=null,mbus=null,noise=null,eng=null,siren=null,rotor=null,timer=null,held=false,level=0,step=0,next=0;
 const sfxOn=()=>!!store.profile?.settings?.sound,musOn=()=>!!store.profile?.settings?.music;
 function ensure(){if(a)return true;a=audioContext();if(!a)return false;
  const comp=a.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(a.destination);
  bus=a.createGain();bus.gain.value=.9;bus.connect(comp);mbus=a.createGain();mbus.gain.value=.5;mbus.connect(comp);
  noise=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return true;}
 const now=()=>a.currentTime;
 function env(g,t,vol,att,dur){g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+dur);}
 function osc(type,f,t,dur,vol,{slide=0,dest=bus,att=.004,lp=0}={}){const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+dur);
  env(g,t,vol,att,dur);let n=o;if(lp){const f2=a.createBiquadFilter();f2.type='lowpass';f2.frequency.value=lp;o.connect(f2);n=f2;}n.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.05);}
 function hiss(t,dur,vol,{type='lowpass',f=1200,f1=0,q=.8,dest=bus,att=.002}={}){const s=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();s.buffer=noise;fl.type=type;fl.frequency.setValueAtTime(f,t);if(f1)fl.frequency.exponentialRampToValueAtTime(f1,t+dur);fl.Q.value=q;
  env(g,t,vol,att,dur);s.connect(fl);fl.connect(g);g.connect(dest);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);}
 const last={};const gate=(k,ms)=>{const n=performance.now();if(n-(last[k]||0)<ms)return false;last[k]=n;return true;};
 const S={
  shotgun(){if(!gate('sg',60))return;const t=now();hiss(t,.28,.5,{f:2200,f1:300});osc('sine',90,t,.25,.5,{slide:.4});
   // the spin-cock: two clicks
   osc('square',1600,t+.32,.03,.08);osc('square',1100,t+.42,.04,.09);},
  uzi(){if(!gate('uz',55))return;const t=now();hiss(t,.06,.22,{type:'bandpass',f:2600,q:1});osc('square',180,t,.04,.07);},
  rifle(){if(!gate('ri',90))return;const t=now();hiss(t,.12,.32,{f:3000,f1:500});osc('sine',140,t,.1,.2,{slide:.5});},
  minigun(){if(!gate('mg',45))return;const t=now();hiss(t,.045,.16,{type:'bandpass',f:2000,q:1.4});osc('sawtooth',90,t,.04,.05);},
  m79(){const t=now();osc('sine',120,t,.18,.45,{slide:.5});hiss(t,.15,.25,{f:600});},
  boom(k=1){if(!gate('bm',70))return;const t=now();hiss(t,1.1*k,.7*Math.min(1,k),{f:900,f1:80});osc('sine',60,t,.8*k,.7,{slide:.4});hiss(t,.3,.3,{type:'highpass',f:3000});},
  crash(){if(!gate('cr',110))return;const t=now();hiss(t,.35,.5,{type:'bandpass',f:900,q:.7,f1:300});for(let i=0;i<4;i++)osc('square',300+Math.random()*900,t+i*.03,.06,.05);},
  scrape(){if(!gate('sc',140))return;const t=now();hiss(t,.18,.18,{type:'bandpass',f:3200,q:3});},
  screech(){if(!gate('sk',400))return;const t=now();hiss(t,.5,.14,{type:'bandpass',f:1900,q:8,f1:1400});},
  hurt(){if(!gate('hu',150))return;const t=now();osc('sawtooth',110,t,.2,.18,{slide:.6,lp:800});},
  pick(){const t=now();osc('triangle',880,t,.08,.15);osc('triangle',1320,t+.07,.12,.15);},
  card(){const t=now();[523,659,784,1046].forEach((f,i)=>osc('triangle',f,t+i*.06,.18,.14));},
  warn(){if(!gate('wa',300))return;const t=now();osc('square',880,t,.07,.09);osc('square',660,t+.1,.07,.09);},
  metal(){if(!gate('me',90))return;const t=now();hiss(t,.25,.2,{type:'bandpass',f:1500,q:6,f1:500});osc('sine',600,t,.2,.07,{slide:2});},
  freeze(){const t=now();hiss(t,2,.3,{type:'highpass',f:2500});},
  shatter(){const t=now();for(let i=0;i<26;i++)osc('triangle',2000+Math.random()*4000,t+Math.random()*.6,.06,.06);hiss(t,.6,.3,{type:'highpass',f:4000});},
  takedown(){const t=now();osc('sine',55,t,.6,.6,{slide:.5});hiss(t,.5,.3,{f:400});osc('sawtooth',220,t+.05,.4,.06,{slide:.25,lp:900});},
  nitro(){if(!gate('ni',300))return;const t=now();hiss(t,.6,.3,{type:'bandpass',f:700,f1:2400,q:1});},
  stab(){const t=now();hiss(t,.12,.3,{type:'highpass',f:2500});osc('sine',300,t,.1,.1,{slide:.4});},
  jump(){const t=now();hiss(t,.3,.15,{f:600,f1:200});},
  land(){const t=now();osc('sine',70,t,.2,.4,{slide:.5});hiss(t,.15,.2,{f:500});}};
 function sfx(name,...args){if(!sfxOn()||!ensure()||held)return;try{S[name]?.(...args);}catch{}}
 // continuous engine (two detuned saws through a lowpass) + sirens + rotor, levels set every frame
 function loops(){if(eng||!ensure())return;const t=now();
  const g=a.createGain();g.gain.value=0;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=500;
  const o1=a.createOscillator(),o2=a.createOscillator();o1.type='sawtooth';o2.type='square';o1.frequency.value=50;o2.frequency.value=25.3;o1.connect(lp);o2.connect(lp);lp.connect(g);g.connect(bus);o1.start(t);o2.start(t);eng={g,lp,o1,o2};
  const sg=a.createGain();sg.gain.value=0;const so=a.createOscillator(),lfo=a.createOscillator(),lg=a.createGain();so.type='triangle';so.frequency.value=900;lfo.frequency.value=.45;lg.gain.value=260;lfo.connect(lg);lg.connect(so.frequency);so.connect(sg);sg.connect(bus);so.start(t);lfo.start(t);siren={g:sg,o:so,lfo};
  const rg=a.createGain();rg.gain.value=0;const src=a.createBufferSource();src.buffer=noise;src.loop=true;const rf=a.createBiquadFilter();rf.type='lowpass';rf.frequency.value=300;const am=a.createGain();am.gain.value=.5;const amo=a.createOscillator(),amg=a.createGain();amo.frequency.value=17;amg.gain.value=.5;amo.connect(amg);amg.connect(am.gain);
  src.connect(rf);rf.connect(am);am.connect(rg);rg.connect(bus);src.start(t);amo.start(t);rotor={g:rg,src,amo};}
 function setLoops({speed=0,nitro=false,siren:sv=0,rotor:rv=0,on=true}={}){if(!sfxOn()||!ensure())return;loops();const t=now(),k=held||!on?0:1;
  eng.g.gain.setTargetAtTime(.07*k+(nitro?.03*k:0),t,.08);eng.o1.frequency.setTargetAtTime(45+speed*.11+(nitro?25:0),t,.1);eng.o2.frequency.setTargetAtTime(22+speed*.055,t,.1);eng.lp.frequency.setTargetAtTime(380+speed*.6+(nitro?600:0),t,.1);
  siren.g.gain.setTargetAtTime(.035*sv*k,t,.1);rotor.g.gain.setTargetAtTime(.12*rv*k,t,.1);}
 // ------------------------------------------------ music: 128 bpm, D minor, 16-step bars, 4 levels
 const STEP=60/128/4,ROOT=73.42;// D2
 const BASS=[0,0,12,0, 3,0,0,5, 0,0,12,0, -2,0,1,0];// semitones per 16th (0 = rest marker handled below)
 const BASS_ON=[1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,1,1];
 const ANVIL=[1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0];
 const KICK=[1,0,0,0, 0,0,1,0, 1,0,0,0, 0,1,0,0],SNARE=[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],HAT=[1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1];
 const CHORDS=[[0,3,7],[ -4,0,3],[ -2,2,5],[ -5,-2,2]];// Dm, Bb, C, A-ish
 function anvil(t,vol){const c=a.createOscillator(),m=a.createOscillator(),mg=a.createGain(),g=a.createGain();c.type='sine';m.type='sine';c.frequency.value=587;m.frequency.value=587*3.53;mg.gain.setValueAtTime(1600,t);mg.gain.exponentialRampToValueAtTime(30,t+.25);
  m.connect(mg);mg.connect(c.frequency);env(g,t,vol,.002,.45);c.connect(g);g.connect(mbus);c.start(t);m.start(t);c.stop(t+.5);m.stop(t+.5);hiss(t,.05,vol*.6,{type:'highpass',f:5000,dest:mbus});}
 function kick(t,v){osc('sine',120,t,.22,v,{slide:.35,dest:mbus});}
 function snare(t,v){hiss(t,.16,v,{type:'bandpass',f:1800,q:.7,dest:mbus});osc('triangle',190,t,.08,v*.4,{dest:mbus});}
 function bassNote(t,semi,dur,v){const f=ROOT*Math.pow(2,semi/12),o=a.createOscillator(),o2=a.createOscillator(),ws=a.createWaveShaper(),lp=a.createBiquadFilter(),g=a.createGain();
  o.type='sawtooth';o2.type='square';o.frequency.value=f;o2.frequency.value=f*1.005;const curve=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;curve[i]=Math.tanh(x*3);}ws.curve=curve;
  lp.type='lowpass';lp.frequency.setValueAtTime(1400,t);lp.frequency.exponentialRampToValueAtTime(300,t+dur);env(g,t,v,.005,dur);o.connect(ws);o2.connect(ws);ws.connect(lp);lp.connect(g);g.connect(mbus);o.start(t);o2.start(t);o.stop(t+dur+.05);o2.stop(t+dur+.05);}
 function pad(t,chord,dur,v){for(const s of chord){const f=ROOT*4*Math.pow(2,s/12);for(const d of [-.15,.15]){const o=a.createOscillator(),g=a.createGain(),lp=a.createBiquadFilter();o.type='sawtooth';o.frequency.value=f;o.detune.value=d*40;lp.type='lowpass';lp.frequency.value=1100;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.4);g.gain.setValueAtTime(v,t+dur-.4);g.gain.linearRampToValueAtTime(.0001,t+dur);o.connect(lp);lp.connect(g);g.connect(mbus);o.start(t);o.stop(t+dur+.05);}}}
 function lead(t,semi,dur,v){osc('square',ROOT*8*Math.pow(2,semi/12),t,dur,v,{dest:mbus,lp:2400,att:.01});}
 const LEAD=[0,3,7,10, 12,10,7,3, 2,5,9,12, 14,12,9,5];
 function schedule(){if(held||!a)return;const ahead=a.currentTime+.3;
  while(next<ahead){const i=step%16,bar=Math.floor(step/16),t=next;
   if(i===0&&bar%2===0)pad(t,CHORDS[(bar/2|0)%4],STEP*32,level>=2?.012:.016);
   if(ANVIL[i])anvil(t,(i===0?.11:.07)*(level>=1?1:.7));
   if(level>=1){if(KICK[i])kick(t,.5);if(BASS_ON[i])bassNote(t,BASS[i]+(CHORDS[(bar/2|0)%4][0]<0?CHORDS[(bar/2|0)%4][0]:0),STEP*1.6,.09);}
   if(level>=2){if(SNARE[i])snare(t,.28);if(HAT[i])hiss(t,.03,i%4===2?.07:.035,{type:'highpass',f:7000,dest:mbus});}
   if(level>=3&&i%2===0)lead(t,LEAD[(i+bar*4)%16],STEP*1.8,.035);
   step++;next+=STEP;}}
 return {sfx,setLoops,
  music(on=true){if(!musOn()||!ensure())return;if(on&&!timer){step=0;next=a.currentTime+.1;timer=setInterval(schedule,70);schedule();}else if(!on&&timer){clearInterval(timer);timer=null;}},
  level(l){level=Math.max(0,Math.min(3,l|0));},
  hold(h){held=!!h;if(a){mbus.gain.setTargetAtTime(held?0:.5,a.currentTime,.05);if(eng&&held){eng.g.gain.setTargetAtTime(0,a.currentTime,.05);siren.g.gain.setTargetAtTime(0,a.currentTime,.05);rotor.g.gain.setTargetAtTime(0,a.currentTime,.05);}if(!held)next=Math.max(next,a.currentTime+.05);}},
  stop(){if(timer){clearInterval(timer);timer=null;}if(eng){const t=a.currentTime;for(const n of [eng.o1,eng.o2,siren.o,siren.lfo,rotor.src,rotor.amo])try{n.stop(t+.05);}catch{}eng=siren=rotor=null;}}};}

Object.assign(exports,{makeSound});
