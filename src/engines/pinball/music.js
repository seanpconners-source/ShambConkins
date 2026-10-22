// Pinball soundtrack engine: a synthesized band played by a 16th-note sequencer with lookahead scheduling.
// Songs are data (see tables/bucketheadMusic.js): tempo, key, scale, chord progression (scale degrees, one per bar),
// 16-step drum/bass/guitar patterns, and a lead line or clean arpeggio generated from a fixed seed, so every song has
// the same original melody every time. play(name) changes song on the next bar line. Follows the Music setting.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {seededRandom}=require("src/utils.js");
const mtof=n=>440*2**((n-69)/12);

function createMusic(songs,{paused=()=>false}={}){
 let a=null,master=null,gtrBus=null,leadBus=null,noise=null,timer=0,song=null,songName='',want='',step=0,nextT=0,cycle=0;
 const melodies=new Map();
 function setup(){if(a)return true;if(!store.profile?.settings?.music)return false;a=audioContext();if(!a)return false;
  const comp=a.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=4;master=a.createGain();master.gain.value=.3;master.connect(comp).connect(a.destination);
  noise=a.createBuffer(1,a.sampleRate,a.sampleRate);const nd=noise.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  // guitar: distortion → cab-ish low-pass
  const ws=a.createWaveShaper(),curve=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;curve[i]=Math.tanh(x*24);}ws.curve=curve;ws.oversample='2x';
  const cab=a.createBiquadFilter();cab.type='lowpass';cab.frequency.value=3200;cab.Q.value=.9;const mid=a.createBiquadFilter();mid.type='peaking';mid.frequency.value=900;mid.gain.value=-4;
  gtrBus=a.createGain();gtrBus.gain.value=.5;const gOut=a.createGain();gOut.gain.value=.16;gtrBus.connect(ws).connect(mid).connect(cab).connect(gOut).connect(master);
  // lead: soft clip + echo
  const lws=a.createWaveShaper(),lc=new Float32Array(512);for(let i=0;i<512;i++){const x=i/255.5-1;lc[i]=Math.tanh(x*3);}lws.curve=lc;
  const lf=a.createBiquadFilter();lf.type='lowpass';lf.frequency.value=3800;leadBus=a.createGain();leadBus.gain.value=.5;const lOut=a.createGain();lOut.gain.value=.22;
  const dl=a.createDelay(1);dl.delayTime.value=.33;const fb=a.createGain();fb.gain.value=.3;const wet=a.createGain();wet.gain.value=.35;
  leadBus.connect(lws).connect(lf).connect(lOut).connect(master);lOut.connect(dl);dl.connect(fb).connect(dl);dl.connect(wet).connect(master);
  return true;}
 const env=(g,t,v,att,dur)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+att);g.gain.exponentialRampToValueAtTime(.0008,t+dur);};
 function osc(type,f,t,dur,dest,v,att=.004){const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);env(g,t,v,att,dur);o.connect(g).connect(dest);o.start(t);o.stop(t+dur+.05);return o;}
 function nz(t,dur,type,f,v,q=.8){const s=a.createBufferSource();s.buffer=noise;const b=a.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;const g=a.createGain();env(g,t,v,.002,dur);s.connect(b).connect(g).connect(master);s.start(t,Math.random()*.5,dur+.05);}
 const kick=t=>{const o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);env(g,t,.9,.002,.28);o.connect(g).connect(master);o.start(t);o.stop(t+.32);};
 const snare=t=>{nz(t,.15,'bandpass',1900,.55);osc('triangle',190,t,.08,master,.3);};
 const hat=(t,open)=>nz(t,open?.2:.035,'highpass',8000,open?.16:.12,.5);
 const tom=(t,f)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.6,t+.2);env(g,t,.55,.002,.25);o.connect(g).connect(master);o.start(t);o.stop(t+.3);};
 function bass(t,n,dur,v=.32){const o=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o.type='sawtooth';o.frequency.value=mtof(n);f.type='lowpass';f.Q.value=5;f.frequency.setValueAtTime(1400,t);f.frequency.exponentialRampToValueAtTime(260,t+Math.min(.3,dur));env(g,t,v,.005,dur);o.connect(f).connect(g).connect(master);o.start(t);o.stop(t+dur+.05);}
 function chord(t,n,dur,mute){const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=mute?1100:5000;const g=a.createGain();env(g,t,1,.004,mute?Math.min(dur,.12):dur);f.connect(g).connect(gtrBus);
  for(const iv of [0,7,12])for(const det of [-7,7]){const o=a.createOscillator();o.type='sawtooth';o.frequency.value=mtof(n+iv);o.detune.value=det;o.connect(f);o.start(t);o.stop(t+dur+.05);}}
 function lead(t,n,dur,type){const g=a.createGain();env(g,t,.5,.01,Math.max(.08,dur));g.connect(leadBus);
  for(const [ty,det] of [[type||'sawtooth',-5],['square',5]]){const o=a.createOscillator();o.type=ty;o.frequency.value=mtof(n);o.detune.value=det;
   if(dur>.25){const l=a.createOscillator(),lg=a.createGain();l.frequency.value=5.8;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(18,t+dur*.6);l.connect(lg).connect(o.detune);l.start(t);l.stop(t+dur+.05);}
   o.connect(g);o.start(t);o.stop(t+dur+.05);}}
 const arp=(t,n,dur)=>{osc('triangle',mtof(n),t,dur,master,.1,.003);osc('sine',mtof(n+12),t,dur*.6,leadBus,.08);};
 // single-note riff guitar (root + octave through the distortion), palm-muted or ringing
 function riffNote(t,n,dur,mute){const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=mute?1300:4200;const g=a.createGain();env(g,t,1.1,.003,mute?Math.min(dur,.13):dur);f.connect(g).connect(gtrBus);
  for(const [iv,det] of [[0,-6],[0,6],[12,0],[-12,0]]){const o=a.createOscillator();o.type='sawtooth';o.frequency.value=mtof(n+iv);o.detune.value=det;o.connect(f);o.start(t);o.stop(t+dur+.05);}}
 // church bell: inharmonic partials with a long decay
 function bell(t,n){for(const [m,v,d] of [[.5,.25,4],[1,.35,3],[2,.18,2.2],[2.76,.12,1.6],[5.4,.06,1],[8.9,.03,.6]])osc('sine',mtof(n)*m,t,d,master,v,.002);}
 function thunder(t){nz(t,2.8,'lowpass',160,.7,.4);nz(t+.05,.5,'lowpass',900,.35,.6);}
 let rain=null;
 function setRain(level){if(rain){try{rain.s.stop();}catch{}rain=null;}if(!level)return;const s=a.createBufferSource();s.buffer=noise;s.loop=true;const b=a.createBiquadFilter();b.type='bandpass';b.frequency.value=2600;b.Q.value=.6;const g=a.createGain();g.gain.value=level*.16;s.connect(b).connect(g).connect(master);s.start();rain={s};}
 const OFF={'.':null,'-':null};const semi=ch=>ch in OFF?null:parseInt(ch,16);
 // song helpers
 const deg=(s,d)=>{const L=s.scale.length,o=Math.floor(d/L);return s.root+s.scale[((d%L)+L)%L]+12*o;};
 function melody(name,s){if(melodies.has(name))return melodies.get(name);const r=seededRandom(s.lead.seed||7),dens=s.lead.density??.45,steps=s.lead.rate===8?2:1;
  const motif=()=>{const out=Array(16).fill(null);let d=0;for(let i=0;i<16;i+=steps){if(r()<dens||i===0){d=Math.max(-2,Math.min(9,d+Math.round((r()-.5)*4)));out[i]=d;}}return out;};
  const A=motif(),B=motif(),bars=[A,A.map(v=>v==null?null:v+2),A,B];melodies.set(name,bars);return bars;}
 function play16(s,i,t){
  const bar=Math.floor(i/16),k=i%16,len=s.prog.length,cd=s.prog[bar%len],dur16=60/s.bpm/4,cyc=Math.floor(bar/len);
  const D=s.drums||{};const at=(p)=>p&&p[k]&&p[k]!=='.'&&p[k]!=='-';
  if(at(D.k))kick(t);if(at(D.s))snare(t);if(at(D.h))hat(t,false);if(at(D.o))hat(t,true);if(at(D.t))tom(t,D.t[k]==='h'?180:120);
  if(s.bass&&at(s.bass)){const ch=s.bass[k],n=deg(s,cd)+(ch==='o'?12:ch==='5'?7:0);let l=1;while(k+l<16&&s.bass[k+l]==='-')l++;bass(t,n,dur16*l*.95);}
  if(s.gtr&&at(s.gtr)){const ch=s.gtr[k];let l=1;while(k+l<16&&s.gtr[k+l]==='-')l++;chord(t,deg(s,cd)+12,dur16*l*.95,ch!=='O');}
  const leadOn=s.lead&&(s.lead.on==='always'||(s.lead.on!=='never'&&cyc%2===1));
  if(leadOn){const m=melody(songName,s)[bar%4],v=m[k];if(v!=null){let l=1;while(k+l<16&&m[k+l]==null&&l<6)l++;lead(t,deg(s,cd+v)+12*(2+(s.lead.oct||0)),dur16*l*.9,s.lead.type);}}
  if(s.arp){const rate=s.arp.rate===8?2:1;if(k%rate===0){const p=s.arp.pattern,d=p[(k/rate)%p.length];arp(t,deg(s,cd+d)+12*(1+(s.arp.oct||0)),dur16*rate*1.6);}}
  // riff: one 16-char string per bar, hex semitones above root+12 ('.' rest, '-' hold; 6 = the tritone); riffRing lets notes ring
  if(s.riff){const row=s.riff[bar%s.riff.length],ch=row[k],v=semi(ch.toLowerCase());if(v!=null){let l=1;while(k+l<16&&row[k+l]==='-')l++;const n=s.root+12+(s.riffOct||0)*12+v;riffNote(t,n,dur16*l*.95,!s.riffRing);
    if(s.bass==='riff')bass(t,n-12,dur16*l*.95,.36);}}
  if(s.bell&&at(s.bell))bell(t,s.bellNote||64);
  if(s.thunder&&k===0&&Math.random()<s.thunder)thunder(t+Math.random()*.5);
 }
 function tick(){if(!a||!song)return;if(paused()){nextT=a.currentTime+.05;return;}
  while(nextT<a.currentTime+.12){
   if(want!==songName&&step%16===0){songName=want;song=songs[want]||null;step=0;setRain(song?.rain||0);if(!song)return;}
   // swing: the off-beat 8th lands late (s.swing 1 = full triplet shuffle)
   const sw=song.swing&&step%4===2?song.swing*(60/song.bpm/2)/3:0;
   try{play16(song,step,nextT+sw);}catch{}
   nextT+=60/song.bpm/4;step++;}
 }
 return {
  play(name){if(!songs[name])return;want=name;if(!setup())return;if(!song){songName=name;song=songs[name];step=0;nextT=a.currentTime+.06;setRain(song.rain||0);}if(!timer)timer=setInterval(tick,25);},
  stop(){want='';song=null;songName='';if(a)setRain(0);if(timer){clearInterval(timer);timer=0;}},
  get current(){return songName;},
 };
}
Object.assign(exports,{createMusic});
