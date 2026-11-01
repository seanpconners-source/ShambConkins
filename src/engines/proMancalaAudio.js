// Tony Hawk's Pro Mancala: sound. Synthesized skate sound effects (ollie pop, flip whoosh, landing, grind, bail,
// crowd, the special-meter "shing", score tally, glass gems clacking into wood) and an original pop-punk / skate-punk
// soundtrack played by the pinball band engine (src/engines/pinball/music.js). No copyrighted melodies.
// Drop-ins (assets/music/, rebuilt into USER_PORTRAITS['music:<name>']):
//   thps-mancala-intro.*          title sequence song (replaces the synth intro)
//   thps-mancala.* or thps-mancala-1.* .. thps-mancala-9.*   in-game playlist (loops, replaces the synth songs)
//   thps-sfx-<name>.*             one sound effect each: ollie flip land grind bail slam crowd special combo tally
//                                 clack text whoosh roll land-combo
// Follows the Sound and Music settings.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const {createMusic}=require("src/engines/pinball/music.js");

const sfxOn=()=>!!store.profile?.settings?.sound;
const musicOn=()=>!!store.profile?.settings?.music;
const R=(a,b)=>a+Math.random()*(b-a);

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
function crunchCurve(k){const c=new Float32Array(512);for(let i=0;i<512;i++){const x=i/255.5-1;c[i]=Math.tanh(x*k);}return c;}
// distorted power chord stab (root, fifth, octave), the guitar "hit" under the title words and the big combos
function stab(root,dur,vol,delay=0){const t=A.currentTime+delay,ws=A.createWaveShaper();ws.curve=crunchCurve(20);const lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3000;const g=A.createGain();env(g,t,1,.004,dur);
 ws.connect(lp).connect(g).connect(out(vol,.3));for(const iv of [0,7,12])for(const det of [-8,8]){const o=A.createOscillator();o.type='sawtooth';o.frequency.value=440*2**((root+iv-69)/12);o.detune.value=det;const og=A.createGain();og.gain.value=.25;o.connect(og).connect(ws);o.start(t);o.stop(t+dur+.05);}}
function crash(vol=.3,delay=0,dur=1.6){hiss(dur,vol,{type:'highpass',f0:5200,q:.4,delay,wet:.4});hiss(dur*.5,vol*.6,{type:'bandpass',f0:3200,q:.6,delay,wet:.3});}

// ------------------------------------------------------------------ the effects
const SFX={
 // tail snap: a wooden crack and the board slapping the ground
 ollie(){hiss(.035,.7,{type:'highpass',f0:1800,q:.7});tone('triangle',950,420,.04,.35);tone('sine',190,55,.09,.55);},
 // board flipping under the feet
 flip(){hiss(.22,.28,{type:'bandpass',f0:700,f1:2600,q:2.2,att:.03});},
 whoosh(dur=.45,up=true){hiss(dur,.35,{type:'bandpass',f0:up?350:2600,f1:up?2800:300,q:1.3,att:dur*.4});},
 // four wheels hitting concrete at once + the deck thump
 land(heavy=1){tone('sine',110,42,.16,.6*heavy);hiss(.12,.45*heavy,{type:'lowpass',f0:700,q:.6});hiss(.05,.35,{type:'bandpass',f0:2400,q:1});for(let k=0;k<3;k++)tone('triangle',R(380,620),null,.025,.08,{delay:.03+k*.025});},
 // the satisfying "you landed the combo" chirp
 'land-combo'(){[784,988,1175,1568].forEach((f,i)=>{tone('square',f,f,.09,.05,{delay:i*.045});tone('triangle',f*2,f*2,.14,.04,{delay:i*.045,wet:.3});});},
 // metal truck on a coping/rail: resonant scrape with chatter
 grind(dur=.9){const t=A.currentTime,s=A.createBufferSource(),b1=A.createBiquadFilter(),b2=A.createBiquadFilter(),g=A.createGain(),l=A.createOscillator(),lg=A.createGain();
  s.buffer=noiseBuf;s.loop=true;b1.type='bandpass';b1.frequency.value=3100;b1.Q.value=9;b2.type='bandpass';b2.frequency.value=5300;b2.Q.value=12;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.9,t+.03);g.gain.setValueAtTime(.9,t+dur-.08);g.gain.linearRampToValueAtTime(0,t+dur);
  l.frequency.value=27;lg.gain.value=.35;l.connect(lg).connect(g.gain);
  const o=out(.5,.25);s.connect(b1).connect(g);s.connect(b2).connect(g);g.connect(o);s.start(t);s.stop(t+dur+.05);l.start(t);l.stop(t+dur+.05);
  tone('sawtooth',118,108,dur,.03,{att:.02});},
 // the slam: body hits the deck, a grunt, the board clattering away and a wheel spinning down
 bail(){tone('sine',85,38,.32,.8);hiss(.32,.6,{type:'lowpass',f0:420,q:.5});oof();
  for(let k=0;k<6;k++)tone('triangle',R(260,520),null,.05,.22*(1-k/7),{delay:.12+k*R(.06,.13)});hiss(.08,.2,{type:'bandpass',f0:1800,q:2,delay:.15});
  tone('sine',1100,520,1.2,.035,{delay:.3,att:.05});},
 // the word slams of the title sequence
 slam(){SFX.ollie();tone('sine',70,30,.4,.9);hiss(.25,.5,{type:'lowpass',f0:1200,f1:120,q:.5,wet:.5});},
 // crowd roar: shaped noise plus a few "woo"s
 crowd(level=1,dur=2.2){const t=A.currentTime,s=A.createBufferSource(),b=A.createBiquadFilter(),g=A.createGain();s.buffer=noiseBuf;s.loop=true;b.type='bandpass';b.frequency.value=1300;b.Q.value=.45;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3*level,t+.35);g.gain.linearRampToValueAtTime(.18*level,t+dur*.6);g.gain.linearRampToValueAtTime(0,t+dur);s.connect(b).connect(g).connect(out(1,.2));s.start(t);s.stop(t+dur+.05);
  for(let k=0;k<Math.round(3+level*4);k++){const f=R(420,780);tone('sawtooth',f,f*R(1.3,1.7),R(.3,.6),.012*level,{delay:R(0,dur*.5),att:.08});}},
 // the special meter filling: a glittering "shing" that rises and rings
 special(){SFX.whoosh(.3,true);[1047,1319,1568,2093,2637,3136].forEach((f,i)=>{tone('sine',f,f,1.1,.07,{delay:.18+i*.04,wet:.6});tone('triangle',f*1.005,f*1.005,.7,.03,{delay:.18+i*.04,wet:.5});});
  hiss(.9,.08,{type:'highpass',f0:7000,q:.5,att:.2,delay:.2,wet:.5});},
 // COMBO!!!: power chord, crash, boom
 combo(level=1){stab(40+Math.min(5,level)*2,.7,.5);crash(.32);tone('sine',62,32,.5,.8);SFX.crowd(Math.min(1.6,.6+level*.25),1.6+level*.3);},
 // score counting up
 tally(k=0){tone('square',900+Math.min(40,k)*28,null,.028,.045);},
 // glass gem dropped into a routed wooden bowl (pitch varies a little per gem)
 clack(n=1){const f=R(2600,3900);tone('sine',f,f*.98,.06,.12);tone('sine',f*1.51,null,.03,.05);hiss(.012,.3,{type:'highpass',f0:6000,q:.5});tone('sine',R(520,700),null,.05,.08);
  if(n>1)tone('sine',f*1.12,null,.04,.06,{delay:.025});},
 // trick text popping on screen
 text(){tone('sine',540,1150,.07,.07);},
 // wheels rolling on smooth concrete, for a moment (title words, skaters going by)
 roll(dur=.7,vol=.35){hiss(dur,vol,{type:'lowpass',f0:380,q:.8,att:.08});hiss(dur,vol*.5,{type:'bandpass',f0:140,q:1.5,att:.08});for(let k=0;k<Math.floor(dur*5);k++)tone('triangle',R(200,320),null,.02,.06,{delay:k*.2+R(0,.05)});},
 // drum stick count-in for the title
 sticks(){for(let k=0;k<4;k++){tone('triangle',1800,1700,.03,.18,{delay:k*.3});hiss(.02,.2,{type:'highpass',f0:4000,delay:k*.3});}},
};
// a synthesized grunt for the slam (sawtooth through two formant filters, "uh")
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
function preload(){if(!bus())return;for(const n of Object.keys(SFX))dropIn(n);dropIn('land-combo');}

// ------------------------------------------------------------------ soundtrack (original songs, data for the band engine)
// Bars are 16 sixteenths; '.' rest, '-' hold. Two sections per song (verse a = skate beat, chorus b = backbeat + lead).
const SKATE={k:'x...x...x...x...',s:'..x...x...x...x.',h:'x.x.x.x.x.x.x.x.'};
const BACK={k:'x.....x.x.......',s:'....x.......x...',o:'x...x...x...x...'};
const FILL={k:'x.......x.......',s:'....x...x.x.xxxx',h:'x.x.x.x.x.......',t:'........l.l.h.h.'};
const SONGS={
 // title: power-chord hits on the bar line while the words fly in, then a build
 intro:{bpm:192,root:40,scale:[0,2,4,5,7,9,11],prog:[0,0,3,4],drums:{k:'x...............',o:'x...............',t:'..........l.h.hh'},bass:'x---------------',gtr:'O---------------',lead:{on:'never'}},
 'a-a':{bpm:200,root:40,scale:[0,2,4,5,7,9,11],prog:[0,4,5,3],drums:SKATE,bass:'x.x.x.x.x.x.x.x.',gtr:'x.x.x.x.x.x.x.x.',lead:{on:'never'}},
 'a-b':{bpm:200,root:40,scale:[0,2,4,5,7,9,11],prog:[0,4,5,3],drums:BACK,bass:'x.x.x.x.x.x.x.x.',gtr:'O.O.O.O.O.O.O.O.',lead:{on:'always',seed:182,density:.42,oct:0,type:'sawtooth',rate:8}},
 'a-f':{bpm:200,root:40,scale:[0,2,4,5,7,9,11],prog:[3,4],drums:FILL,bass:'x.x.x.x.x.x.x...',gtr:'O-------x.x.x...',lead:{on:'never'}},
 'b-a':{bpm:186,root:38,scale:[0,2,4,5,7,9,11],prog:[0,5,3,4],drums:SKATE,bass:'x.x.x.x.x.x.x.x.',gtr:'x.x.O-x.x.x.O-x.',lead:{on:'never'}},
 'b-b':{bpm:186,root:38,scale:[0,2,4,5,7,9,11],prog:[3,0,4,5],drums:BACK,bass:'x.x.x.x.x.x.x.x.',gtr:'O.O.O.O.O.O.O.O.',lead:{on:'always',seed:77,density:.5,oct:0,type:'square',rate:8}},
 'b-f':{bpm:186,root:38,scale:[0,2,4,5,7,9,11],prog:[4,4],drums:FILL,bass:'x.......x.x.x.x.',gtr:'O-------O.O.O.O.',lead:{on:'never'}},
 'c-a':{bpm:212,root:43,scale:[0,2,3,5,7,8,10],prog:[0,5,2,6],drums:SKATE,bass:'xxxxxxxxxxxxxxxx',gtr:'x.x.x.x.x.x.x.x.',lead:{on:'never'}},
 'c-b':{bpm:212,root:43,scale:[0,2,3,5,7,8,10],prog:[5,2,6,4],drums:BACK,bass:'x.x.x.x.x.x.x.x.',gtr:'O.O.O.O.O.O.O.O.',lead:{on:'always',seed:900,density:.48,oct:0,type:'sawtooth',rate:8}},
 'c-f':{bpm:212,root:43,scale:[0,2,3,5,7,8,10],prog:[6,4],drums:FILL,bass:'x.x.x.x.x.x.x.x.',gtr:'O-------O-O-O-O-',lead:{on:'never'}},
};
// the "now playing" card, like the game's track names (invented bands, original songs)
const TRACKS=[{key:'a',band:'Seedcrash',song:'Kickflip the Store'},{key:'b',band:'The Kalahs',song:'Extra Turn Forever'},{key:'c',band:'Bad Pebbles',song:'Sow It Down (Live at the Warehouse)'}];
const SECTION=[['a',8],['b',8],['a',4],['f',1],['b',8],['f',1]];

function createSoundtrack(paused){
 const band=createMusic(SONGS,{paused});let mode='',track=0,startT=0,el=null,drops=null,dropIdx=0,onTrack=null;
 const ctx=()=>audioContext();
 function stopEl(){if(el){const e=el;el=null;try{e.pause();}catch{}}}
 function dropList(){if(drops)return drops;drops=[];if(USER_PORTRAITS['music:thps-mancala'])drops.push({url:USER_PORTRAITS['music:thps-mancala'],band:'',song:'Pro Mancala'});
  for(let i=1;i<10;i++){const u=USER_PORTRAITS['music:thps-mancala-'+i];if(u)drops.push({url:u,band:'',song:'Track '+i});}return drops;}
 function playEl(url,loop,onEnd){stopEl();try{const e=new Audio(url);e.loop=loop;e.volume=.75;e.onended=onEnd||null;e.play()?.catch?.(()=>{});el=e;return true;}catch{return false;}}
 function nextDrop(){const d=dropList();if(!d.length)return false;const t=d[dropIdx%d.length];dropIdx++;onTrack?.(t);return playEl(t.url,d.length===1,()=>nextDrop());}
 return {
  intro(){if(!musicOn())return;mode='intro';const u=USER_PORTRAITS['music:thps-mancala-intro'];if(u){band.stop();playEl(u,false);return;}band.play('intro');},
  main(cb){if(!musicOn())return;onTrack=cb;mode='main';if(dropList().length){band.stop();nextDrop();return;}stopEl();track=Math.floor(Math.random()*TRACKS.length);startT=ctx()?.currentTime||0;band.play(TRACKS[track].key+'-a');cb?.(TRACKS[track]);},
  // called every frame: walks the song through its sections, then on to the next song
  tick(){if(mode!=='main'||el||!band.current)return;const a=ctx();if(!a)return;const t=TRACKS[track],bpm=SONGS[t.key+'-a'].bpm,bar=240/bpm,total=SECTION.reduce((n,[,b])=>n+b,0);
   let k=Math.floor((a.currentTime-startT)/bar);if(k>=total*2){track=(track+1)%TRACKS.length;startT=a.currentTime;onTrack?.(TRACKS[track]);band.play(TRACKS[track].key+'-a');return;}
   k%=total;for(const [sec,b] of SECTION){if(k<b){band.play(t.key+'-'+sec);break;}k-=b;}},
  pause(on){if(el){try{on?el.pause():el.play()?.catch?.(()=>{});}catch{}}},
  stop(){mode='';band.stop();stopEl();},
 };
}
Object.assign(exports,{sfx,preload,createSoundtrack,TRACKS});
