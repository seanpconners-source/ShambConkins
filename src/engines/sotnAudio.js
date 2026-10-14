// Castlevania · Symphony of the Night: sound. Original WebAudio synth effects modelled on the PS1 game's palette
// (sword swishes and metallic rings, wet hits, flame deaths, Warg howls, zombie groans, Mermen splashes, the castle
// gate, Death's arrival, Dracula's laugh and his demon form), all sent through one generated cathedral reverb.
// Looping ambience per area (wind, hall drone, dripping caverns, throne-room organ) runs until a music track is supplied.
// Drop-in music: assets/music/cv-symphony.(mp3|ogg|m4a|wav) for the stage and assets/music/cv-symphony-boss.* for the
// throne room; tools/build.mjs inlines them as USER_PORTRAITS['music:<name>'] and they replace the ambience drone.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");

let B=null,noiseBuf=null,voices=0;const last=new Map();
const sfxOn=()=>!!store.profile?.settings?.sound;
const musicOn=()=>!!store.profile?.settings?.music;
function impulse(a,sec,decay){const n=Math.floor(a.sampleRate*sec),buf=a.createBuffer(2,n,a.sampleRate),fade=a.sampleRate*.01;
 for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay)*Math.min(1,i/fade);}return buf;}
function bus(){const a=audioContext();if(!a)return null;if(B&&B.a===a)return B;
 try{const comp=a.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=8;comp.ratio.value=5;comp.attack.value=.002;comp.release.value=.18;comp.connect(a.destination);
  const out=a.createGain();out.gain.value=.85;out.connect(comp);
  const verb=a.createConvolver();verb.buffer=impulse(a,2.8,3.2);const wet=a.createGain();wet.gain.value=.5;verb.connect(wet);wet.connect(comp);
  const amb=a.createGain();amb.gain.value=1;amb.connect(comp);
  B={a,out,verb,amb};}catch{B=null;}return B;}
function noise(a){if(noiseBuf&&noiseBuf.sampleRate===a.sampleRate)return noiseBuf;const n=a.sampleRate*2;noiseBuf=a.createBuffer(1,n,a.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return noiseBuf;}
// route a source's gain to the dry bus and the reverb send
function route(b,node,verb){node.connect(b.out);if(verb>0){const s=b.a.createGain();s.gain.value=verb;node.connect(s);s.connect(b.verb);}}
function track(src,stopAt){voices++;src.onended=()=>{voices--;};src.stop(stopAt);}
function env(g,t,vol,att,dur){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+Math.max(.001,att));g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(att+.01,dur));}
function tone(type,f0,f1,dur,vol,{delay=0,att=.004,verb=.25,detune=0}={}){const b=bus();if(!b||voices>40)return;const a=b.a,t=a.currentTime+delay;
 const o=a.createOscillator(),g=a.createGain();o.type=type;o.detune.value=detune;o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(15,f1),t+dur);
 env(g,t,vol,att,dur);o.connect(g);route(b,g,verb);o.start(t);track(o,t+dur+.05);}
function hiss(dur,vol,{type='bandpass',f0=2000,f1=null,q=1,delay=0,att=.003,verb=.25}={}){const b=bus();if(!b||voices>40)return;const a=b.a,t=a.currentTime+delay;
 const src=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();src.buffer=noise(a);src.loop=true;src.playbackRate.value=.8+Math.random()*.4;
 f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
 env(g,t,vol,att,dur);src.connect(f);f.connect(g);route(b,g,verb);src.start(t,Math.random()*1.5);track(src,t+dur+.05);}
// a crude vocal: sawtooth through parallel formant filters (grunts, groans, laughs, howls, roars)
function voice(f0,f1,dur,vol,forms,{delay=0,att=.02,verb=.3,vib=0,vibRate=6,grit=0}={}){const b=bus();if(!b||voices>40)return;const a=b.a,t=a.currentTime+delay;
 const o=a.createOscillator(),g=a.createGain();o.type='sawtooth';o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(15,f1),t+dur);
 let lfo=null;if(vib){lfo=a.createOscillator();const lg=a.createGain();lfo.frequency.value=vibRate;lg.gain.value=vib;lfo.connect(lg);lg.connect(o.frequency);lfo.start(t);lfo.stop(t+dur+.05);}
 let head=o;if(grit){const sh=a.createWaveShaper(),n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/n*2-1;c[i]=Math.tanh(x*grit);}sh.curve=c;o.connect(sh);head=sh;}
 env(g,t,vol,att,dur);for(const [fq,q,gain=1] of forms){const f=a.createBiquadFilter(),fg=a.createGain();f.type='bandpass';f.frequency.value=fq;f.Q.value=q;fg.gain.value=gain;head.connect(f);f.connect(fg);fg.connect(g);}
 route(b,g,verb);o.start(t);track(o,t+dur+.05);}
const R=(a,b2)=>a+Math.random()*(b2-a);
// per-sound throttle so a crowd of zombies doesn't stack fifty groans
const sfxErrors=[];
function play(name,gap,fn){if(!sfxOn())return;const now=performance.now();if(now-(last.get(name)||-1e9)<gap)return;last.set(name,now);try{fn();}catch(e){if(sfxErrors.length<20)sfxErrors.push(name+': '+e.message);}}

const sfx={
 // Alucard
 swing:kind=>play('swing',45,()=>{if(kind==='fist'){hiss(.1,.2,{f0:1400,f1:500,q:1.4,verb:.1});return;}
  const heavy=kind==='claymore';hiss(heavy?.2:.13,heavy?.34:.26,{f0:heavy?2600:5200,f1:heavy?500:1100,q:1.3,verb:.15});
  if(kind==='alucard'){tone('sine',3150,3000,.35,.035,{delay:.02,verb:.5});tone('sine',4420,4300,.3,.025,{delay:.02,verb:.5});}
  else tone('triangle',heavy?1700:2500,heavy?1600:2400,.16,.025,{delay:.015,verb:.35});}),
 hit:heavy=>play('hit',30,()=>{tone('sine',heavy?150:190,heavy?42:60,heavy?.2:.12,.45,{verb:.12});hiss(.11,.32,{type:'lowpass',f0:2400,f1:300,q:.7,verb:.15});
  hiss(.09,.22,{f0:R(600,900),q:4.5,verb:.1});if(heavy)tone('square',90,40,.12,.06,{verb:.2});}),
 slashHit:()=>play('slashHit',30,()=>{hiss(.07,.2,{type:'highpass',f0:3200,f1:1800,q:.8,verb:.2});tone('triangle',2900,2600,.09,.03,{verb:.3});}),
 blood:()=>play('blood',60,()=>{hiss(.2,.2,{f0:R(700,1000),f1:300,q:3.5,verb:.15});hiss(.12,.12,{f0:450,q:5,delay:.04,verb:.1});}),
 kill:()=>play('kill',50,()=>{hiss(.55,.26,{f0:350,f1:2600,q:.9,att:.04,verb:.4});for(let k=0;k<6;k++)hiss(.03,.12,{type:'highpass',f0:R(2500,5000),q:2,delay:R(.05,.5),verb:.2});tone('sine',220,60,.25,.25,{verb:.2});}),
 grunt:()=>play('grunt',200,()=>voice(R(170,190),105,.24,.5,[[620,6],[1050,8,.8],[2500,10,.4]],{att:.012,verb:.25})),
 die:()=>play('die',500,()=>{voice(210,70,1.1,.55,[[650,6],[1100,8,.8],[2500,10,.3]],{att:.03,verb:.55,vib:6});hiss(.6,.15,{type:'lowpass',f0:900,f1:200,delay:.3,verb:.4});}),
 jump:()=>play('jump',60,()=>hiss(.12,.08,{f0:700,f1:1600,q:1.1,verb:.1})),
 leap:()=>play('leap',60,()=>{hiss(.18,.1,{f0:900,f1:2600,q:1.2,verb:.2});tone('sine',520,980,.18,.05,{verb:.45});tone('sine',780,1470,.18,.03,{delay:.03,verb:.45});}),
 land:()=>play('land',80,()=>{tone('sine',95,48,.08,.22,{verb:.08});hiss(.06,.1,{type:'lowpass',f0:500,q:.7,verb:.05});}),
 dash:()=>play('dash',80,()=>{hiss(.2,.16,{type:'highpass',f0:3200,f1:700,q:.7,verb:.15});hiss(.09,.1,{f0:1500,q:2,delay:.02,verb:.05});}),
 step:()=>play('step',120,()=>tone('sine',120,70,.04,.05,{verb:.15})),
 // pickups
 candle:()=>play('candle',40,()=>{tone('triangle',1900,1850,.14,.06,{verb:.4});tone('triangle',2530,2500,.12,.04,{delay:.01,verb:.4});hiss(.08,.1,{type:'highpass',f0:4500,q:1,verb:.3});hiss(.25,.08,{f0:600,f1:1500,q:1,delay:.02,verb:.3});}),
 heart:()=>play('heart',50,()=>{tone('sine',1568,1568,.07,.08,{verb:.35});tone('sine',2093,2093,.16,.07,{delay:.06,verb:.45});}),
 bigHeart:()=>play('heart',50,()=>[1319,1568,2093,2637].forEach((f,k)=>tone('sine',f,f,.16,.07,{delay:k*.05,verb:.5}))),
 money:()=>play('money',50,()=>{tone('square',1976,1976,.05,.03,{verb:.2});tone('square',2637,2637,.22,.03,{delay:.05,verb:.35});}),
 item:()=>play('item',80,()=>[1047,1319,1568,2093,2637].forEach((f,k)=>{tone('triangle',f,f,.35,.05,{delay:k*.06,verb:.6});tone('sine',f*2,f*2,.25,.015,{delay:k*.06,verb:.6});})),
 relic:()=>play('relic',300,()=>{[523,659,784,1047,1319,1568,2093,2637,3136].forEach((f,k)=>{tone('sine',f,f,.9,.045,{delay:k*.07,att:.02,verb:.8,detune:R(-6,6)});tone('triangle',f*1.5,f*1.5,.5,.012,{delay:k*.07+.02,verb:.8});});hiss(1.2,.03,{type:'highpass',f0:6000,q:.5,att:.3,verb:.7});}),
 potion:()=>play('potion',100,()=>{for(let k=0;k<7;k++)tone('sine',R(400,700),R(900,1500),.07,.05,{delay:k*.05,verb:.3});tone('sine',1047,1568,.4,.05,{delay:.3,verb:.6});}),
 orb:()=>play('orb',300,()=>{[784,988,1175,1568,1976,2349].forEach((f,k)=>tone('sine',f,f,1.4,.05,{delay:k*.09,att:.01,verb:.9}));tone('triangle',392,392,1.6,.05,{verb:.8});}),
 deny:()=>play('deny',120,()=>tone('square',180,150,.1,.035,{verb:.1})),
 blip:()=>play('blip',38,()=>tone('square',R(1150,1250),null,.025,.012,{verb:0})),
 // sub-weapons and spells
 dagger:()=>play('dagger',60,()=>{hiss(.09,.18,{type:'highpass',f0:4000,f1:2000,q:.8,verb:.15});tone('triangle',1400,2600,.08,.03,{verb:.2});}),
 axe:()=>play('axe',80,()=>{for(let k=0;k<5;k++)hiss(.07,.13,{f0:1300-k*120,q:2,delay:k*.08,verb:.2});tone('triangle',700,500,.3,.02,{verb:.3});}),
 holy:()=>play('holy',80,()=>{for(const f of [3100,4170,5230])tone('sine',f*R(.97,1.03),null,.12,.04,{verb:.5});hiss(.08,.2,{type:'highpass',f0:6000,q:.6,verb:.4});hiss(.8,.22,{type:'lowpass',f0:300,f1:1800,q:.7,att:.05,delay:.05,verb:.4});}),
 cross:()=>play('cross',80,()=>{tone('triangle',2200,2150,.5,.05,{verb:.6});tone('sine',3300,3250,.45,.03,{delay:.02,verb:.6});hiss(.15,.1,{type:'highpass',f0:5000,q:.8,verb:.3});}),
 hellfire:()=>play('hellfire',200,()=>{voice(150,95,.35,.25,[[700,5],[1150,7]],{verb:.35,grit:3});for(let k=0;k<3;k++)hiss(.35,.25,{type:'lowpass',f0:250,f1:2200,q:.9,att:.03,delay:.12+k*.1,verb:.45});tone('sawtooth',110,55,.6,.06,{delay:.1,verb:.4});}),
 charge:()=>play('charge',400,()=>{tone('sine',300,1200,.5,.04,{att:.2,verb:.5});tone('sine',450,1800,.5,.025,{att:.2,verb:.5});}),
 // monsters
 groan:()=>play('groan',700,()=>voice(R(85,105),R(65,80),R(.8,1.1),.22,[[380,5],[780,6,.7],[2300,8,.2]],{att:.15,verb:.45,vib:5,vibRate:4})),
 rise:()=>play('rise',300,()=>{hiss(.6,.16,{type:'lowpass',f0:600,f1:250,q:.8,att:.1,verb:.25});for(let k=0;k<5;k++)tone('sine',R(90,160),60,.05,.07,{delay:R(0,.5),verb:.2});}),
 howl:()=>play('howl',900,()=>{voice(390,720,.55,.2,[[800,4],[1600,6,.6],[2700,8,.2]],{att:.08,verb:.7,vib:9,vibRate:5});voice(720,520,.9,.18,[[800,4],[1500,6,.6]],{delay:.53,att:.02,verb:.8,vib:12,vibRate:5.5});hiss(1.3,.05,{f0:1200,q:1,att:.2,verb:.6});}),
 growl:()=>play('growl',300,()=>voice(R(75,90),60,.4,.3,[[300,3],[650,5,.7]],{att:.03,verb:.3,vib:25,vibRate:22,grit:4})),
 bite:()=>play('bite',100,()=>{hiss(.05,.3,{type:'highpass',f0:2500,q:.7,verb:.1});tone('square',160,80,.09,.08,{verb:.1});}),
 squeak:()=>play('squeak',250,()=>{tone('sine',3600,4400,.04,.04,{verb:.3});tone('sine',3900,4700,.05,.035,{delay:.07,verb:.3});}),
 bones:()=>play('bones',150,()=>{for(let k=0;k<6;k++)hiss(.025,.12,{f0:R(2500,4200),q:3,delay:k*.035+R(0,.01),verb:.2});}),
 collapse:()=>play('collapse',150,()=>{for(let k=0;k<12;k++)hiss(.03,.14,{f0:R(1800,4200),q:3,delay:k*.04+R(0,.02),verb:.3});tone('sine',140,60,.2,.15,{delay:.3,verb:.2});}),
 splash:()=>play('splash',150,()=>{hiss(.45,.32,{type:'lowpass',f0:3200,f1:350,q:.7,verb:.35});for(let k=0;k<5;k++)tone('sine',R(350,600),R(900,1400),.05,.05,{delay:.1+k*.06,verb:.3});}),
 fireball:()=>play('fireball',90,()=>{hiss(.3,.17,{f0:500,f1:1700,q:1,att:.02,verb:.3});tone('sawtooth',210,120,.2,.03,{verb:.2});}),
 spit:()=>play('spit',150,()=>{hiss(.12,.16,{f0:1600,f1:700,q:1.5,verb:.2});hiss(.3,.1,{f0:500,f1:1400,q:1,delay:.05,verb:.3});}),
 clank:()=>play('clank',140,()=>{tone('square',233,233,.12,.03,{verb:.4});tone('triangle',1740,1700,.15,.04,{verb:.4});tone('triangle',2610,2580,.12,.025,{verb:.4});hiss(.05,.1,{type:'highpass',f0:3000,q:.8,verb:.2});}),
 wall:()=>play('wall',120,()=>{hiss(.35,.3,{type:'lowpass',f0:1200,f1:200,q:.8,verb:.4});for(let k=0;k<6;k++)tone('sine',R(120,260),60,.06,.08,{delay:R(0,.3),verb:.3});}),
 // the castle
 gate:()=>play('gate',800,()=>{for(let k=0;k<9;k++)tone('triangle',R(900,1600),null,.05,.03,{delay:k*.045,verb:.4});
  tone('sine',72,26,1.4,.75,{delay:.42,verb:.7});hiss(1.1,.4,{type:'lowpass',f0:420,f1:90,q:.8,delay:.42,verb:.8});tone('square',55,30,.4,.08,{delay:.42,verb:.6});}),
 thunder:(far=false)=>play('thunder',600,()=>{const v=far?.35:1;hiss(.18,.45*v,{type:'highpass',f0:1800,f1:900,q:.6,verb:.5});hiss(2.6,.5*v,{type:'lowpass',f0:260,f1:60,q:.7,att:.25,delay:far?.4:.06,verb:.9});}),
 drip:()=>play('drip',300,()=>{const f=R(1300,2300);tone('sine',f,f*1.6,.06,.05,{verb:.8});}),
 death:()=>play('death',1500,()=>{hiss(1.3,.22,{f0:250,f1:3200,q:1.2,att:1.1,verb:.8});for(const f of [110,116.5,155.6,164.8])voice(f,f*.98,2.4,.06,[[650,6],[1100,8,.7]],{att:.7,delay:.4,verb:.8,vib:3,vibRate:4});}),
 laugh:(deep=false)=>play('laugh',1200,()=>{const f=deep?100:150;for(let k=0;k<6;k++)voice(f*(1-k*.03),f*.85*(1-k*.03),.13,.32,[[deep?600:720,7],[deep?1000:1180,9,.8],[2500,10,.25]],{delay:k*.19,att:.01,verb:.7,grit:deep?2.5:0});}),
 scythe:()=>play('scythe',300,()=>{hiss(.35,.3,{f0:4500,f1:600,q:1.2,verb:.5});tone('sine',1500,1450,.6,.05,{delay:.05,verb:.7});tone('sine',2250,2200,.5,.035,{delay:.05,verb:.7});}),
 lose:()=>play('lose',140,()=>[2093,1760,1397,1175,880,698].forEach((f,k)=>tone('sine',f,f*.98,.3,.04,{delay:k*.07,verb:.7}))),
 teleport:()=>play('teleport',300,()=>{for(let k=0;k<6;k++)tone('sine',2400-k*300,1200-k*150,.18,.035,{delay:k*.05,verb:.6});hiss(.6,.12,{type:'highpass',f0:3500,f1:900,q:.6,verb:.5});}),
 appear:()=>play('appear',300,()=>{hiss(.5,.14,{f0:400,f1:3000,q:1,att:.35,verb:.6});tone('sine',300,900,.45,.04,{att:.3,verb:.6});}),
 inferno:()=>play('inferno',300,()=>{voice(70,55,1,.3,[[300,3],[700,4,.7]],{att:.1,verb:.6,grit:5});hiss(.9,.3,{type:'lowpass',f0:150,f1:1100,q:.8,att:.1,verb:.6});}),
 roar:()=>play('roar',900,()=>{voice(78,42,1.7,.6,[[280,3],[640,4,.8],[1500,6,.3]],{att:.08,verb:.8,vib:14,vibRate:18,grit:6});hiss(1.6,.25,{type:'lowpass',f0:600,f1:150,q:.6,att:.1,verb:.7});}),
 stomp:()=>play('stomp',200,()=>{tone('sine',62,24,.6,.8,{verb:.5});hiss(.5,.35,{type:'lowpass',f0:320,f1:80,q:.7,verb:.6});}),
 breath:()=>play('breath',200,()=>{hiss(1,.3,{f0:450,f1:1400,q:.8,att:.08,verb:.5});voice(70,60,.9,.2,[[300,3],[700,4]],{att:.1,verb:.5,grit:4});}),
 boom:()=>play('boom',60,()=>{tone('sine',R(70,110),28,.5,.55,{verb:.6});hiss(.5,.3,{type:'lowpass',f0:R(600,1200),f1:100,q:.6,verb:.6});}),
 shatter:()=>play('shatter',300,()=>{for(let k=0;k<10;k++)tone('sine',R(2500,6000),null,R(.1,.3),.03,{delay:R(0,.25),verb:.7});hiss(.4,.25,{type:'highpass',f0:5000,f1:2000,q:.6,verb:.6});}),
 clear:()=>play('clear',2000,()=>{[[392,0],[466,.18],[587,.36],[784,.6],[740,.95],[784,1.15],[932,1.35],[1175,1.6]].forEach(([f,d])=>{tone('triangle',f,f,.5,.06,{delay:d,verb:.7});tone('sine',f/2,f/2,.6,.05,{delay:d,verb:.7});});}),
 level:()=>play('level',400,()=>{[[523,0],[659,.08],[784,.16],[1047,.24],[1319,.36]].forEach(([f,d])=>{tone('square',f,f,.18,.025,{delay:d,verb:.5});tone('triangle',f*2,f*2,.3,.03,{delay:d,verb:.6});});hiss(.6,.04,{type:'highpass',f0:6000,q:.5,att:.1,delay:.3,verb:.6});}),
 bell:()=>play('bell',500,()=>{for(const [f,v] of [[196,.12],[392,.06],[587,.04],[784,.03],[1046,.02]])tone('sine',f,f*.995,3,v,{att:.005,verb:.9});})
};

// ------------------------------------------------------------------ ambience and drop-in music
let amb=null,ambKind=null,mus=null,musName=null,watch=0,lastTick=0,suspended=false;
const MUSIC={stage:'cv-symphony',boss:'cv-symphony-boss'};
const musicURL=k=>USER_PORTRAITS['music:'+(MUSIC[k]||k)]||USER_PORTRAITS['music:'+MUSIC.stage]||null;
function stopAmb(fade=1.2){if(!amb)return;const old=amb;amb=null;try{const t=old.a.currentTime;old.g.gain.cancelScheduledValues(t);old.g.gain.setValueAtTime(old.g.gain.value,t);old.g.gain.linearRampToValueAtTime(0,t+fade);setTimeout(()=>{for(const n of old.nodes)try{n.stop?.();n.disconnect();}catch{}},fade*1000+120);}catch{}}
function ambience(kind){if(kind===ambKind)return;ambKind=kind;stopAmb();if(!sfxOn()||!kind)return;const b=bus();if(!b)return;const a=b.a,t=a.currentTime;
 try{const g=a.createGain(),nodes=[],quiet=mus?.4:1;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(quiet,t+2.5);g.connect(b.amb);
  const noiseLoop=(type,freq,q,vol,lfoRate=0,lfoDepth=0)=>{const src=a.createBufferSource(),f=a.createBiquadFilter(),v=a.createGain();src.buffer=noise(a);src.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=q;v.gain.value=vol;
   src.connect(f);f.connect(v);v.connect(g);src.start(t,Math.random());nodes.push(src);
   if(lfoRate){const l=a.createOscillator(),lg=a.createGain();l.frequency.value=lfoRate;lg.gain.value=lfoDepth;l.connect(lg);lg.connect(f.frequency);l.start(t);nodes.push(l);
    const l2=a.createOscillator(),lg2=a.createGain();l2.frequency.value=lfoRate*.63;lg2.gain.value=vol*.6;l2.connect(lg2);lg2.connect(v.gain);l2.start(t);nodes.push(l2);}};
  const drone=(type,freq,vol,cut,trem=0)=>{const o=a.createOscillator(),f=a.createBiquadFilter(),v=a.createGain();o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=cut;v.gain.value=vol;o.connect(f);f.connect(v);v.connect(g);o.start(t);nodes.push(o);
   if(trem){const l=a.createOscillator(),lg=a.createGain();l.frequency.value=trem;lg.gain.value=vol*.5;l.connect(lg);lg.connect(v.gain);l.start(t);nodes.push(l);}};
  if(kind==='wind'){noiseLoop('bandpass',420,.8,.07,.09,260);noiseLoop('bandpass',1300,2,.018,.13,500);}
  else if(kind==='hall'){noiseLoop('lowpass',180,.7,.05);drone('sine',55,.03,200,.07);drone('sine',82.4,.018,200,.05);noiseLoop('bandpass',700,3,.006,.05,200);}
  else if(kind==='cave'){noiseLoop('lowpass',260,.7,.06,.05,90);drone('sine',49,.025,150,.04);noiseLoop('bandpass',2600,6,.004,.2,800);}
  else if(kind==='throne'){if(!mus){drone('sawtooth',65.4,.012,520,.11);drone('sawtooth',98,.009,520,.13);drone('sawtooth',77.8,.008,520,.09);drone('sine',32.7,.04,120);}noiseLoop('lowpass',200,.7,.03);}
  amb={a,g,nodes};}catch{amb=null;}}
function music(kind){const url=kind&&musicOn()?musicURL(kind):null;if(url&&mus&&mus.url===url)return true;
 if(mus){const old=mus.el;mus=null;fadeEl(old,0,900,()=>{try{old.pause();}catch{}});}musName=kind;if(!url)return false;
 try{const el=new Audio(url);el.loop=true;el.volume=0;el.play()?.catch?.(()=>{});mus={el,url};fadeEl(el,.7,1500);
  if(amb){try{const t=amb.a.currentTime;amb.g.gain.cancelScheduledValues(t);amb.g.gain.linearRampToValueAtTime(.4,t+1);}catch{}}return true;}catch{mus=null;return false;}}
function fadeEl(el,to,ms,done){const from=el.volume,t0=performance.now();const step=()=>{const k=Math.min(1,(performance.now()-t0)/ms);try{el.volume=Math.max(0,Math.min(1,from+(to-from)*k));}catch{}if(k<1)setTimeout(step,40);else done?.();};step();}
const hasMusic=k=>!!musicURL(k);
// the game calls tick() every frame; when frames stop (pause menu, hidden tab) the loops are muted until they resume
function tick(){lastTick=performance.now();if(suspended){suspended=false;try{if(amb){const t=amb.a.currentTime;amb.g.gain.setTargetAtTime(mus?.4:1,t,.2);}mus?.el.play()?.catch?.(()=>{});}catch{}}
 if(!watch)watch=setInterval(()=>{if(!suspended&&performance.now()-lastTick>400){suspended=true;try{if(amb){const t=amb.a.currentTime;amb.g.gain.setTargetAtTime(0,t,.1);}mus?.el.pause();}catch{}}},250);}
function stopAll(){clearInterval(watch);watch=0;suspended=false;ambKind=null;stopAmb(.6);if(mus){const el=mus.el;mus=null;fadeEl(el,0,500,()=>{try{el.pause();}catch{}});}musName=null;}
const voiceCount=()=>voices;
Object.assign(exports,{sfx,ambience,music,hasMusic,tick,stopAll,MUSIC,sfxErrors,voiceCount});
