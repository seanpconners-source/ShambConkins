// Tony Hawk's Pro Mancala: sound. Synthesized skate sound effects (ollie pop, flip, catch, landing, grind, bail, record
// scratch, crowd, gang "HEY!", the special-meter "shing", score tally, glass gems clacking into wood) and an original
// fast skate-punk soundtrack on its own little band: double-tracked distorted power chords panned left/right, picked bass,
// skate-beat drums with snare-roll fills and crashes, a lead guitar in the choruses and gang shouts. The title has a
// snare roll + guitar build that explodes into the first chorus. No copyrighted melodies.
// Drop-ins (assets/music/, rebuilt into USER_PORTRAITS['music:<name>']):
//   thps-mancala-intro.*          title sequence song (replaces the synth intro)
//   thps-mancala.* or thps-mancala-1.* .. thps-mancala-9.*   in-game playlist (loops, replaces the synth songs)
//   thps-sfx-<name>.*             one sound effect each (names: the keys of SFX below)
// Follows the Sound and Music settings.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");

const sfxOn=()=>!!store.profile?.settings?.sound;
const musicOn=()=>!!store.profile?.settings?.music;
const R=(a,b)=>a+Math.random()*(b-a);
const mtof=n=>440*2**((n-69)/12);

let A=null,master=null,verb=null,noiseBuf=null;
function bus(){const a=audioContext();if(!a)return null;if(A===a&&master)return a;A=a;
 const comp=a.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=5;comp.attack.value=.003;comp.release.value=.2;
 master=a.createGain();master.gain.value=.55;master.connect(comp).connect(a.destination);
 // a short slap-back room (skatepark concrete) for the bigger hits
 const d=a.createDelay(.5);d.delayTime.value=.11;const fb=a.createGain();fb.gain.value=.28;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;
 verb=a.createGain();verb.gain.value=.5;verb.connect(d);d.connect(lp).connect(fb).connect(d);lp.connect(master);
 noiseBuf=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 return a;}
const env=(g,t,v,att,dur)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+att);g.gain.exponentialRampToValueAtTime(.0005,t+Math.max(att+.01,dur));};
function out(vol,wet=0){const g=A.createGain();g.gain.value=vol;g.connect(master);if(wet){const w=A.createGain();w.gain.value=wet;g.connect(w).connect(verb);}return g;}
function tone(type,f0,f1,dur,vol,{delay=0,att=.003,wet=0,dest=null}={}){const t=A.currentTime+delay,o=A.createOscillator(),g=A.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
 env(g,t,1,att,dur);o.connect(g).connect(dest||out(vol,wet));o.start(t);o.stop(t+dur+.05);return o;}
function hiss(dur,vol,{type='bandpass',f0=1500,f1=null,q=1,delay=0,att=.002,wet=0}={}){const t=A.currentTime+delay,s=A.createBufferSource(),b=A.createBiquadFilter(),g=A.createGain();s.buffer=noiseBuf;b.type=type;b.Q.value=q;b.frequency.setValueAtTime(f0,t);if(f1)b.frequency.exponentialRampToValueAtTime(f1,t+dur);
 env(g,t,1,att,dur);s.connect(b).connect(g).connect(out(vol,wet));s.start(t,Math.random()*1.5,dur+.05);return s;}
function crunchCurve(k){const c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;c[i]=Math.tanh(x*k);}return c;}
function stab(root,dur,vol,delay=0){const t=A.currentTime+delay,ws=A.createWaveShaper();ws.curve=crunchCurve(22);const lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;const g=A.createGain();env(g,t,1,.004,dur);
 ws.connect(lp).connect(g).connect(out(vol,.3));for(const iv of [0,7,12])for(const det of [-8,8]){const o=A.createOscillator();o.type='sawtooth';o.frequency.value=mtof(root+iv);o.detune.value=det;const og=A.createGain();og.gain.value=.25;o.connect(og).connect(ws);o.start(t);o.stop(t+dur+.05);}}
function crash(vol=.3,delay=0,dur=1.6){hiss(dur,vol,{type:'highpass',f0:5200,q:.4,delay,wet:.4});hiss(dur*.5,vol*.6,{type:'bandpass',f0:3200,q:.6,delay,wet:.3});}
// gang shout: a handful of voices through vowel formants ("HEY!" / "OI!")
function shout(t,dest,vol=.5,vowel='ey'){const F=vowel==='oi'?[[500,6],[900,7],[2400,10]]:[[620,6],[1850,9],[2600,11]];
 for(let v=0;v<5;v++){const o=A.createOscillator(),g=A.createGain(),f0=R(140,250);o.type='sawtooth';o.frequency.setValueAtTime(f0*1.12,t);o.frequency.exponentialRampToValueAtTime(f0*.9,t+.22);env(g,t+R(0,.025),1,.012,.24);
  for(const [f,q] of F){const b=A.createBiquadFilter();b.type='bandpass';b.frequency.value=f*R(.95,1.05);b.Q.value=q;const bg=A.createGain();bg.gain.value=vol*.22;g.connect(b).connect(bg).connect(dest);}o.connect(g);o.start(t);o.stop(t+.32);}
 const s=A.createBufferSource(),b=A.createBiquadFilter(),g=A.createGain();s.buffer=noiseBuf;b.type='bandpass';b.frequency.value=2200;b.Q.value=1;env(g,t,vol*.4,.004,.05);s.connect(b).connect(g).connect(dest);s.start(t,Math.random(),.1);}

// ------------------------------------------------------------------ the effects
const SFX={
 // tail snap: a wooden crack and the board slapping the ground
 ollie(){hiss(.035,.7,{type:'highpass',f0:1800,q:.7});tone('triangle',950,420,.04,.35);tone('sine',190,55,.09,.55);},
 // board flipping under the feet, then the feet catching it
 flip(){hiss(.22,.28,{type:'bandpass',f0:700,f1:2600,q:2.2,att:.03});},
 catch(){tone('triangle',520,300,.035,.25);tone('triangle',470,280,.035,.22,{delay:.045});hiss(.02,.2,{type:'highpass',f0:3000,delay:.01});},
 whoosh(dur=.45,up=true){hiss(dur,.35,{type:'bandpass',f0:up?350:2600,f1:up?2800:300,q:1.3,att:dur*.4});},
 // four wheels hitting concrete at once + the deck thump
 land(heavy=1){tone('sine',110,42,.16,.6*heavy);hiss(.12,.45*heavy,{type:'lowpass',f0:700,q:.6});hiss(.05,.35,{type:'bandpass',f0:2400,q:1});for(let k=0;k<3;k++)tone('triangle',R(380,620),null,.025,.08,{delay:.03+k*.025});},
 // the satisfying "you landed the combo" chirp
 'land-combo'(){[784,988,1175,1568].forEach((f,i)=>{tone('square',f,f,.09,.05,{delay:i*.045});tone('triangle',f*2,f*2,.14,.04,{delay:i*.045,wet:.3});});},
 // metal truck on a coping/rail: resonant scrape with chatter
 grind(dur=.9){dur=Math.max(.2,dur);const t=A.currentTime,s=A.createBufferSource(),b1=A.createBiquadFilter(),b2=A.createBiquadFilter(),g=A.createGain(),l=A.createOscillator(),lg=A.createGain();
  s.buffer=noiseBuf;s.loop=true;b1.type='bandpass';b1.frequency.value=3100;b1.Q.value=9;b2.type='bandpass';b2.frequency.value=5300;b2.Q.value=12;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.9,t+.03);g.gain.setValueAtTime(.9,t+dur-.08);g.gain.linearRampToValueAtTime(0,t+dur);
  l.frequency.value=27;lg.gain.value=.35;l.connect(lg).connect(g.gain);
  const o=out(.5,.25);s.connect(b1).connect(g);s.connect(b2).connect(g);g.connect(o);s.start(t);s.stop(t+dur+.05);l.start(t);l.stop(t+dur+.05);
  tone('sawtooth',118,108,dur,.03,{att:.02});},
 // wheels sliding sideways on a revert / power slide
 revert(){hiss(.35,.3,{type:'bandpass',f0:2600,f1:1400,q:4,att:.02});},
 // the slam: body hits the deck, a grunt, the board clattering away and a wheel spinning down
 bail(){tone('sine',85,38,.32,.8);hiss(.32,.6,{type:'lowpass',f0:420,q:.5});oof();
  for(let k=0;k<6;k++)tone('triangle',R(260,520),null,.05,.22*(1-k/7),{delay:.12+k*R(.06,.13)});hiss(.08,.2,{type:'bandpass',f0:1800,q:2,delay:.15});
  tone('sine',1100,520,1.2,.035,{delay:.3,att:.05});},
 // record scratch: the music stops for a bail
 scratch(){tone('sawtooth',300,1400,.09,.12);tone('sawtooth',1300,250,.12,.12,{delay:.09});hiss(.22,.25,{type:'bandpass',f0:900,f1:3500,q:3});},
 // the word slams of the title sequence
 slam(){SFX.ollie();tone('sine',70,30,.4,.9);hiss(.25,.5,{type:'lowpass',f0:1200,f1:120,q:.5,wet:.5});},
 // crowd roar: shaped noise plus a few "woo"s
 crowd(level=1,dur=2.2){const t=A.currentTime,s=A.createBufferSource(),b=A.createBiquadFilter(),g=A.createGain();s.buffer=noiseBuf;s.loop=true;b.type='bandpass';b.frequency.value=1300;b.Q.value=.45;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3*level,t+.35);g.gain.linearRampToValueAtTime(.18*level,t+dur*.6);g.gain.linearRampToValueAtTime(0,t+dur);s.connect(b).connect(g).connect(out(1,.2));s.start(t);s.stop(t+dur+.05);
  for(let k=0;k<Math.round(3+level*4);k++){const f=R(420,780);tone('sawtooth',f,f*R(1.3,1.7),R(.3,.6),.012*level,{delay:R(0,dur*.5),att:.08});}},
 hey(){shout(A.currentTime,out(1,.3),.7);},
 // the special meter filling: a glittering "shing" that rises and rings
 special(){SFX.whoosh(.3,true);[1047,1319,1568,2093,2637,3136].forEach((f,i)=>{tone('sine',f,f,1.1,.07,{delay:.18+i*.04,wet:.6});tone('triangle',f*1.005,f*1.005,.7,.03,{delay:.18+i*.04,wet:.5});});
  hiss(.9,.08,{type:'highpass',f0:7000,q:.5,att:.2,delay:.2,wet:.5});},
 // COMBO!!!: power chord, crash, boom, the crew yelling
 combo(level=1){stab(40+Math.min(5,level)*2,.7,.5);crash(.32);tone('sine',62,32,.5,.8);SFX.crowd(Math.min(1.6,.6+level*.25),1.6+level*.3);SFX.hey();},
 // score counting up
 tally(k=0){tone('square',900+Math.min(40,k)*28,null,.028,.045);},
 // glass gem dropped into a routed wooden bowl (pitch varies a little per gem)
 clack(n=1){const f=R(2600,3900);tone('sine',f,f*.98,.06,.12);tone('sine',f*1.51,null,.03,.05);hiss(.012,.3,{type:'highpass',f0:6000,q:.5});tone('sine',R(520,700),null,.05,.08);
  if(n>1)tone('sine',f*1.12,null,.04,.06,{delay:.025});},
 // trick text popping on screen
 text(){tone('sine',540,1150,.07,.07);},
 // wheels rolling on smooth concrete, for a moment
 roll(dur=.7,vol=.35){hiss(dur,vol,{type:'lowpass',f0:380,q:.8,att:.08});hiss(dur,vol*.5,{type:'bandpass',f0:140,q:1.5,att:.08});for(let k=0;k<Math.floor(dur*5);k++)tone('triangle',R(200,320),null,.02,.06,{delay:k*.2+R(0,.05)});},
 // a skater going by: wheels swell and fade with a little Doppler
 rollby(dur=2){const t=A.currentTime,s=A.createBufferSource(),b=A.createBiquadFilter(),g=A.createGain();s.buffer=noiseBuf;s.loop=true;b.type='lowpass';b.Q.value=1.2;b.frequency.setValueAtTime(280,t);b.frequency.linearRampToValueAtTime(700,t+dur*.5);b.frequency.linearRampToValueAtTime(240,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55,t+dur*.5);g.gain.linearRampToValueAtTime(0,t+dur);s.connect(b).connect(g).connect(out(.6));s.start(t,Math.random());s.stop(t+dur+.05);
  for(let k=0;k<Math.floor(dur*4);k++)tone('triangle',R(180,300),null,.02,.05*Math.sin(Math.PI*(k/(dur*4))),{delay:k*.25});},
 // camera cut: tape click and a whip
 cam(){tone('square',1800,900,.02,.06);hiss(.18,.22,{type:'bandpass',f0:3000,f1:600,q:1.5,att:.02});},
 // drum stick count-in
 sticks(){for(let k=0;k<4;k++){tone('triangle',1800,1700,.03,.18,{delay:k*.3});hiss(.02,.2,{type:'highpass',f0:4000,delay:k*.3});}},
};
function oof(){const t=A.currentTime,o=A.createOscillator(),g=A.createGain();o.type='sawtooth';o.frequency.setValueAtTime(R(150,175),t);o.frequency.exponentialRampToValueAtTime(95,t+.24);env(g,t,1,.02,.26);
 const dest=out(.28);for(const [f,q,v] of [[640,6,1],[1150,8,.6],[2400,10,.25]]){const b=A.createBiquadFilter();b.type='bandpass';b.frequency.value=f;b.Q.value=q;const bg=A.createGain();bg.gain.value=v;g.connect(b).connect(bg).connect(dest);}
 o.connect(g);o.start(t);o.stop(t+.3);}

// ------------------------------------------------------------------ drop-in sound files (decoded once)
const DROP=new Map();
function dropURL(name){return USER_PORTRAITS['music:thps-sfx-'+name]||null;}
function dropIn(name){const url=dropURL(name);if(!url||!A)return null;let d=DROP.get(name);
 if(!d){d={buf:null};DROP.set(name,d);fetch(url).then(r=>r.arrayBuffer()).then(b=>A.decodeAudioData(b)).then(buf=>{d.buf=buf;}).catch(()=>{d.buf=false;});}
 return d.buf||null;}
function playBuffer(buf,vol=.9){const s=A.createBufferSource();s.buffer=buf;s.connect(out(vol));s.start();}
const last=new Map();
function sfx(name,...args){if(!sfxOn())return;const a=bus();if(!a)return;const now=performance.now(),gap=name==='clack'||name==='tally'?18:40;if(now-(last.get(name)||0)<gap)return;last.set(name,now);
 try{const buf=dropIn(name);if(buf){playBuffer(buf);return;}if(dropURL(name)&&DROP.get(name)?.buf===null)return;SFX[name]?.(...args);}catch{}}
function preload(){if(!bus())return;for(const n of Object.keys(SFX))dropIn(n);}

// ------------------------------------------------------------------ the band
// Sections: chords = per bar [first half, second half] in semitones above the key; drums skate (kick on the beat, snare on
// every off-beat 8th), back (pop-punk chorus backbeat), half (bridge stomp); gtr mute8 (palm-muted 8ths), open8 (ringing
// 8ths), chug16; bass eighth / walk; lead = chorus guitar melody; hey = gang shout on those bars' 4th beat. The last bar of
// every section is a snare-roll fill into a crash.
const TRACKS=[
 {band:'Seedcrash',song:'Kickflip the Store',key:40,bpm:228,seed:182,
  sec:{V:{bars:8,chords:[[0,0],[0,0],[5,5],[7,7]],drum:'skate',gtr:'mute8',bass:'eighth'},
   P:{bars:4,chords:[[9,9],[5,5],[0,0],[7,7]],drum:'back',gtr:'open8',bass:'eighth'},
   C:{bars:8,chords:[[0,0],[7,7],[9,9],[5,5]],drum:'back',gtr:'open8',bass:'eighth',lead:true,hey:[3,7]},
   B:{bars:4,chords:[[9,9],[5,5],[2,2],[7,7]],drum:'half',gtr:'chug16',bass:'eighth',oi:[1,3]}},
  order:['C','V','P','C','V','P','C','B','C','C']},
 {band:'Bad Pebbles',song:'Sow It Down',key:45,bpm:240,seed:77,
  sec:{V:{bars:8,chords:[[0,0],[7,7],[9,9],[5,5]],drum:'skate',gtr:'mute8',bass:'eighth'},
   P:{bars:4,chords:[[5,5],[7,7],[9,9],[7,7]],drum:'skate',gtr:'open8',bass:'eighth'},
   C:{bars:8,chords:[[5,5],[0,0],[7,7],[9,9]],drum:'back',gtr:'open8',bass:'eighth',lead:true,hey:[1,5]},
   B:{bars:4,chords:[[2,2],[5,5],[7,7],[7,7]],drum:'half',gtr:'chug16',bass:'eighth',oi:[0,2]}},
  order:['C','V','P','C','V','C','B','C','C']},
 {band:'The Kalahs',song:'Extra Turn Forever',key:38,bpm:216,seed:900,
  sec:{V:{bars:8,chords:[[0,0],[5,5],[0,0],[7,7]],drum:'skate',gtr:'mute8',bass:'walk'},
   P:{bars:4,chords:[[9,9],[7,7],[5,5],[7,7]],drum:'back',gtr:'open8',bass:'walk'},
   C:{bars:8,chords:[[0,7],[9,5],[0,7],[5,7]],drum:'back',gtr:'open8',bass:'eighth',lead:true,hey:[3,7]},
   B:{bars:4,chords:[[9,9],[7,7],[5,5],[7,7]],drum:'half',gtr:'chug16',bass:'walk',oi:[1,3]}},
  order:['C','V','P','C','V','P','C','B','C','C']},
];
const DRUMS={skate:{k:'x...x...x...x...',s:'..x...x...x...x.',h:'x.x.x.x.x.x.x.x.'},
 back:{k:'x.....x.x.x.....',s:'....x.......x...',r:'x.x.x.x.x.x.x.x.'},
 half:{k:'x.x.....x.x.....',s:'........x.......',h:'x.x.x.x.x.x.x.x.'}};
const GTR={mute8:'m.m.m.m.m.m.m.m.',open8:'o.o.o.o.o.o.o.o.',chug16:'mmmmmmmmo.o.mmmm'};
const MAJOR=[0,2,4,5,7,9,11];
function chordTones(c){c=((c%12)+12)%12;const i=MAJOR.indexOf(c);if(i<0)return [c,c+4,c+7];return [0,2,4].map(k=>MAJOR[(i+k)%7]+(i+k>=7?12:0));}

function createPunk(paused){
 let a=null,mb=null,gL=null,gR=null,bassIn=null,leadIn=null,dr=null,room=null,timer=0,tr=null,oi=0,bar=0,step=0,nextT=0,running=false,introBus=null,introG=null,introB=null,muted=false,melody=new Map();
 function setup(){if(a)return true;if(!musicOn())return false;a=audioContext();if(!a)return false;
  const comp=a.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=4;mb=a.createGain();mb.gain.value=.34;mb.connect(comp).connect(a.destination);
  // room for drums/guitars
  const ir=a.createBuffer(2,a.sampleRate*.9,a.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);}
  room=a.createConvolver();room.buffer=ir;const rg=a.createGain();rg.gain.value=.18;room.connect(rg).connect(mb);
  const guitar=pan=>{const inp=a.createGain(),ws=a.createWaveShaper();ws.curve=crunchCurve(30);ws.oversample='2x';const hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=110;
   const mid=a.createBiquadFilter();mid.type='peaking';mid.frequency.value=750;mid.gain.value=-6;mid.Q.value=.8;const pres=a.createBiquadFilter();pres.type='peaking';pres.frequency.value=2400;pres.gain.value=4;
   const cab=a.createBiquadFilter();cab.type='lowpass';cab.frequency.value=4200;cab.Q.value=.7;const p=a.createStereoPanner?a.createStereoPanner():a.createGain();if(p.pan)p.pan.value=pan;const g=a.createGain();g.gain.value=.16;
   inp.connect(ws).connect(hp).connect(mid).connect(pres).connect(cab).connect(p).connect(g).connect(mb);const s=a.createGain();s.gain.value=.25;g.connect(s).connect(room);return inp;};
  gL=guitar(-.8);gR=guitar(.8);
  bassIn=a.createGain();const bws=a.createWaveShaper();bws.curve=crunchCurve(3);const blp=a.createBiquadFilter();blp.type='lowpass';blp.frequency.value=1200;const bg=a.createGain();bg.gain.value=.42;bassIn.connect(bws).connect(blp).connect(bg).connect(mb);
  leadIn=a.createGain();const lws=a.createWaveShaper();lws.curve=crunchCurve(10);const llp=a.createBiquadFilter();llp.type='lowpass';llp.frequency.value=4500;const lg=a.createGain();lg.gain.value=.11;
  const dl=a.createDelay(1);dl.delayTime.value=.27;const fb=a.createGain();fb.gain.value=.28;const wet=a.createGain();wet.gain.value=.3;leadIn.connect(lws).connect(llp).connect(lg).connect(mb);lg.connect(dl);dl.connect(fb).connect(dl);dl.connect(wet).connect(mb);
  dr=a.createGain();dr.gain.value=1;dr.connect(mb);const ds=a.createGain();ds.gain.value=.35;dr.connect(ds).connect(room);
  timer=setInterval(tick,25);return true;}
 let nb=null;function noise(){if(nb)return nb;nb=a.createBuffer(1,a.sampleRate,a.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return nb;}
 function nz(t,dur,type,f,v,q=.8,dest=dr){const s=a.createBufferSource();s.buffer=noise();const b=a.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;const g=a.createGain();env(g,t,v,.001,dur);s.connect(b).connect(g).connect(dest);s.start(t,Math.random()*.5,dur+.05);}
 function osc(type,f0,f1,t,dur,v,dest=dr){const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur*.6);env(g,t,v,.002,dur);o.connect(g).connect(dest);o.start(t);o.stop(t+dur+.05);}
 const kick=(t,v=1,d=dr)=>{osc('sine',160,45,t,.22,1.1*v,d);nz(t,.012,'highpass',3000,.25*v,.7,d);};
 const snare=(t,v=1,d=dr)=>{nz(t,.16,'bandpass',1900,.7*v,.7,d);nz(t,.09,'highpass',5000,.3*v,.5,d);osc('triangle',230,170,t,.07,.45*v,d);};
 const hat=(t,v=1,open=false,d=dr)=>nz(t,open?.25:.03,'highpass',8500,(open?.18:.13)*v,.6,d);
 const ride=(t,v=1,d=dr)=>{nz(t,.35,'bandpass',6200,.09*v,2,d);osc('sine',3500,null,t,.25,.02*v,d);};
 const crashC=(t,v=1,d=dr)=>{nz(t,1.8,'highpass',4800,.32*v,.4,d);nz(t,.9,'bandpass',3000,.18*v,.6,d);};
 const tom=(t,f,v=1,d=dr)=>{osc('sine',f,f*.6,t,.28,.8*v,d);nz(t,.04,'bandpass',f*4,.15*v,1,d);};
 function power(t,root,dur,mute,v=1,dest=null){// double-tracked power chord: root, fifth, octave, each guitar its own take
  for(const [g,det,late] of [[dest||gL,-7,0],[dest||gR,6,.006]]){const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=mute?900:6000;const e=a.createGain();env(e,t+late,v,.003,mute?Math.min(dur,.1):dur);f.connect(e).connect(g);
   for(const iv of [0,7,12]){const o=a.createOscillator();o.type='sawtooth';o.frequency.value=mtof(root+iv);o.detune.value=det+R(-3,3);o.connect(f);o.start(t+late);o.stop(t+late+dur+.05);}}}
 function bassNote(t,n,dur,v=1,dest=null){const o=a.createOscillator(),o2=a.createOscillator(),g=a.createGain();o.type='sawtooth';o2.type='square';o.frequency.value=mtof(n);o2.frequency.value=mtof(n);const og=a.createGain();og.gain.value=.4;env(g,t,v,.003,dur);o.connect(g);o2.connect(og).connect(g);g.connect(dest||bassIn);o.start(t);o2.start(t);o.stop(t+dur+.05);o2.stop(t+dur+.05);}
 function leadNote(t,n,dur){const g=a.createGain();env(g,t,1,.006,Math.max(.1,dur));g.connect(leadIn);for(const [ty,det] of [['sawtooth',-4],['square',5]]){const o=a.createOscillator();o.type=ty;o.frequency.value=mtof(n);o.detune.value=det;
  if(dur>.2){const l=a.createOscillator(),lg=a.createGain();l.frequency.value=6;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(22,t+dur);l.connect(lg).connect(o.detune);l.start(t);l.stop(t+dur+.05);}o.connect(g);o.start(t);o.stop(t+dur+.05);}}
 // chorus melody: 2-bar motifs on chord tones (strong 8ths) with passing/held notes, one per song
 function motif(T,secName,barIdx){const key=T.song+secName;let m=melody.get(key);if(!m){const r=rnd(T.seed),S=T.sec[secName],bars=[];let prev=T.key+36+7;
   for(let b=0;b<4;b++){const notes=[];for(let e=0;e<8;e++){const ch=S.chords[b%S.chords.length][e<4?0:1],tones=chordTones(ch).map(x=>T.key+36+x);
     if(e%2===0||r()<.35){const cand=[...tones,...tones.map(x=>x+12)].filter(x=>Math.abs(x-prev)<=7);const pick=cand.length?cand[Math.floor(r()*cand.length)]:tones[0]+12;notes.push(pick);prev=pick;}else notes.push(r()<.55?null:prev+(r()<.5?2:-1));}
    bars.push(notes);}m=[bars[0],bars[1],bars[0],bars[2],bars[0],bars[1],bars[3],bars[2]];melody.set(key,m);}return m[barIdx%m.length];}
 function play16(t){const T=tr,name=T.order[oi],S=T.sec[name],k=step,d16=60/T.bpm/4,lastBar=bar===S.bars-1,ch=S.chords[bar%S.chords.length][k<8?0:1],root=T.key+12+ch;
  const D=DRUMS[S.drum],at=(p)=>p&&p[k]==='x';
  if(bar===0&&k===0)crashC(t,1);
  if(lastBar&&k>=8){snare(t,.45+(k-8)*.07);if(k===8||k===12)kick(t);if(k>=12)tom(t,[220,180,150,120][k-12],.7);}
  else{if(at(D.k))kick(t);if(at(D.s))snare(t);if(at(D.h))hat(t,k%4===0?1:.7);if(at(D.r))ride(t);}
  const gp=GTR[S.gtr],gc=gp[k];if(gc==='m')power(t,root,d16*1.6,true,.9);else if(gc==='o')power(t,root,d16*2.2,false,.8);
  if(lastBar&&k===15)power(t,root,d16,true,.8);
  if(k%2===0){let n=root-12;if(S.bass==='walk'&&k>=12){const nxtBar=S.chords[(bar+1)%S.chords.length][0],nt=T.key+nxtBar;n=k===12?nt+(nt>root-12?-2:2):nt+(nt>root-12?-1:1);}bassNote(t,n,d16*1.8);}
  if(S.lead&&k%2===0){const m=motif(T,name,bar),v=m[k/2];if(v!=null){let l=1;while(k/2+l<8&&m[k/2+l]==null&&l<3)l++;leadNote(t,v,d16*2*l*.92);}}
  if(S.hey&&S.hey.includes(bar%8)&&k===12)shout(t,mb,.55,'ey');if(S.oi&&S.oi.includes(bar%8)&&k===0)shout(t,mb,.5,'oi');}
 function tick(){if(!a||!running||!tr)return;if(paused()){if(!muted){muted=true;mb.gain.setTargetAtTime(0,a.currentTime,.03);}nextT=a.currentTime+.08;return;}
  if(muted){muted=false;mb.gain.setTargetAtTime(.34,a.currentTime,.05);}
  while(nextT<a.currentTime+.15){try{play16(nextT);}catch{}nextT+=60/tr.bpm/4;step++;if(step>=16){step=0;bar++;const S=tr.sec[tr.order[oi]];if(bar>=S.bars){bar=0;oi++;if(oi>=tr.order.length)oi=1;}}}}
 let track=0;
 return {
  // the title: a snare roll crescendo with guitar hits on every word, exploding into the first chorus at `boom` seconds
  intro(boom,hits){if(!setup())return null;const t0=a.currentTime+.05,T=TRACKS[track],d16=60/T.bpm/4;introBus=a.createGain();introBus.gain.value=1;introBus.connect(dr);introG=a.createGain();introG.connect(gL);introG.connect(gR);introB=a.createGain();introB.connect(bassIn);
   const roll=Math.floor((boom-.05)/d16);for(let i=0;i<roll;i++){const t=t0+i*d16,p=i/roll;snare(t,.12+.85*p*p,introBus);if(p>.85)snare(t+d16/2,.12+.85*p*p,introBus);}
   const gb=a.createGain();gb.gain.value=1;gb.connect(introBus);const feed=a.createGain();feed.gain.setValueAtTime(0,t0);feed.gain.linearRampToValueAtTime(.5,t0+hits[0]);feed.connect(introG);
   for(const iv of [12,19,24]){const o=a.createOscillator();o.type='sawtooth';o.frequency.value=mtof(T.key+12+iv);const l=a.createOscillator(),lg=a.createGain();l.frequency.value=5.5;lg.gain.value=14;l.connect(lg).connect(o.detune);o.connect(feed);o.start(t0);o.stop(t0+boom);l.start(t0);l.stop(t0+boom);}
   const steps=[0,3,5,7];hits.forEach((h,i)=>{const t=t0+h;power(t,T.key+12+steps[i],.7,false,1,introG);kick(t,1,introBus);crashC(t,.35,introBus);if(i>=2){for(let e=0;e*d16*2<(hits[i+1]??boom)-h;e++)bassNote(t+e*d16*2,T.key+steps[i],d16*1.8,.9,introB);}});
   const last=hits[hits.length-1];for(let e=1;t0+last+e*d16<t0+boom-.01;e++)power(t0+last+e*d16,T.key+12+7,d16*.9,true,.6+e*.02,introG);
   // BOOM: the band starts on the first chorus
   tr=T;oi=0;bar=0;step=0;nextT=t0+boom;running=true;return {t0,boom};},
  // straight into the songs (no title, or the title was skipped)
  main(){if(!setup())return;const skip=introBus&&nextT>a.currentTime+.1;if(introBus){for(const g of [introBus,introG,introB])try{g.gain.setTargetAtTime(0,a.currentTime,.02);}catch{}introBus=null;}
   if(!running||skip){tr=TRACKS[track];oi=0;bar=0;step=0;nextT=a.currentTime+.08;running=true;crashC(nextT,1);}},
  current(){return tr?{band:tr.band,song:tr.song}:null;},
  next(){track=(track+1)%TRACKS.length;},
  // the intro clock, from the audio clock when it runs (keeps the words on the drums)
  time(){return a?a.currentTime:null;},
  stop(){running=false;tr=null;if(timer){clearInterval(timer);timer=0;}if(mb){try{mb.gain.setTargetAtTime(0,a.currentTime,.05);}catch{}}a=null;},
 };
}
function rnd(seed){let n=seed>>>0||1;return()=>{n=Math.imul(n^n>>>15,1|n)+0x6D2B79F5|0;n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};}

// Drop-in songs (HTML audio) take over from the band when present.
function createSoundtrack(paused){
 const band=createPunk(paused);let el=null,drops=null,dropIdx=0,onTrack=null,mode='',introFile=false;
 function stopEl(){if(el){const e=el;el=null;try{e.pause();}catch{}}}
 function dropList(){if(drops)return drops;drops=[];if(USER_PORTRAITS['music:thps-mancala'])drops.push({url:USER_PORTRAITS['music:thps-mancala'],band:'',song:'Pro Mancala'});
  for(let i=1;i<10;i++){const u=USER_PORTRAITS['music:thps-mancala-'+i];if(u)drops.push({url:u,band:'',song:'Track '+i});}return drops;}
 function playEl(url,loop,onEnd){stopEl();try{const e=new Audio(url);e.loop=loop;e.volume=.75;e.onended=onEnd||null;e.play()?.catch?.(()=>{});el=e;return true;}catch{return false;}}
 function nextDrop(){const d=dropList();if(!d.length)return false;const t=d[dropIdx%d.length];dropIdx++;onTrack?.(t);return playEl(t.url,d.length===1,()=>nextDrop());}
 // a drop-in title song plays to its end before the game music starts; without one the synth snare-roll intro plays and
 // the game music (drop-in playlist or the band) takes over on EXTREME EDITION
 const api={
  intro(boom,hits,cb){onTrack=cb;if(!musicOn())return null;mode='intro';band.next();const u=USER_PORTRAITS['music:thps-mancala-intro'];
   if(u){introFile=true;playEl(u,false,()=>{introFile=false;if(mode==='wait'){mode='';api.main();}});return null;}
   const r=band.intro(boom,hits);setTimeout(()=>{if(!dropList().length&&(mode==='intro'||mode==='main'))onTrack?.(band.current());},boom*1000);return r;},
  main(cb){if(cb)onTrack=cb;if(!musicOn()||mode==='main'||mode==='wait')return;if(mode==='intro'&&introFile&&el){mode='wait';return;}
   const was=mode;mode='main';if(dropList().length){band.stop();nextDrop();return;}stopEl();band.main();if(was!=='intro')onTrack?.(band.current());},
  pause(on){if(el){try{on?el.pause():el.play()?.catch?.(()=>{});}catch{}}},
  time(){return band.time();},
  stop(){mode='';band.stop();stopEl();},
 };
 return api;
}
Object.assign(exports,{sfx,preload,createSoundtrack,TRACKS});
