// Small WebAudio sequencer: lead + bass + chords/arpeggio + synthesized drums, with
// tempo, swing, looping and a per-level playlist (tracks in src/data/musicTracks.js).
// Also: distorted metal riffs for the level title cards and a string-quartet chord.
// Pure engine: src/audio.js owns the AudioContext/settings and calls configureMusic().
const {TRACKS,PLAYLISTS,METAL}=require("src/data/musicTracks.js");
const NOTE={c:0,d:2,e:4,f:5,g:7,a:9,b:11};
const hz=m=>440*2**((m-69)/12);
const acc=a=>a==='#'?1:a==='b'?-1:0;
function parseNotes(str,len=1){
 const events=[];let at=0;
 for(const tok of String(str).split(/\s+/)){if(!tok||tok==='|')continue;const [n,d]=tok.split(':'),dur=+(d||len);
  const m=n.match(/^([a-g])(#|b)?(-?\d)$/);if(m)events.push({at,dur,midi:12*(+m[3]+1)+NOTE[m[1]]+acc(m[2])});at+=dur;}
 return {events,length:at};
}
const QUAL={'':[0,4,7],m:[0,3,7],'7':[0,4,7,10],m7:[0,3,7,10],maj7:[0,4,7,11],dim:[0,3,6,9],'5':[0,7,12],sus4:[0,5,7]};
function parseChord(s){const m=String(s).match(/^([A-G])(#|b)?(.*)$/)||['','C','',''];return {root:(NOTE[m[1].toLowerCase()]+acc(m[2])+12)%12,tones:QUAL[m[3]]||QUAL['']};}
const compiled={};
function compile(id){
 if(compiled[id])return compiled[id];const t=TRACKS[id];if(!t)return null;
 const mel=parseNotes(t.notes,t.len||1),at={};for(const e of mel.events)(at[e.at]||=[]).push(e);
 const bass=/\d/.test(t.bass||'')?parseNotes(t.bass,1):null,bassAt={};if(bass)for(const e of bass.events)(bassAt[e.at]||=[]).push(e);
 return compiled[id]={id,...t,length:mel.length,at,bassAt,chordList:t.chords.split(/\s+/).map(parseChord)};
}
// ---- Drum patterns (one character per sixteenth; patterns repeat) ----
const DRUMS={
 rag:{k:'x.......x.......',s:'....x.......x...',h:'..x...x...x...x.'},
 march:{k:'x...x...',s:'..x...xx',h:'x.x.x.x.'},
 three:{k:'x.....',s:'...x..',h:'x.x.xx'},
 galop:{k:'x...x...',s:'..x...x.',h:'xxxxxxxx'},
 rock:{k:'x.x...x.x.x...x.',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},
 habanera:{k:'x..x....',s:'....x...',h:'x.x.x.x.'},
 six:{k:'x.....x.....',s:'...x.....x.x',h:'x.xx.xx.xx.x'},
 sixsoft:{k:'x...........',s:'......x.....',h:'x.x.x.x.x.x.'},
 doom:{k:'x.......x.x.....',s:'........x.......',h:'x...x...x...x...'},
 disco:{k:'x...x...x...x...',s:'....x.......x...',h:'..o...o...o...o.'},
 shuffle:{k:'x.....x...x.....',s:'....x.......x..x',h:'x..xx..xx..xx..x'},
 buzz:{k:'x.x.x.x.x.x.x.x.',s:'....x.......x...',h:'xxxxxxxxxxxxxxxx'},
 sparse:{k:'x.........x.....',s:'........x.......',h:'....x.......x...'}
};
// ---- Bass styles: (step within chord, chord) -> [semitone, sixteenths] or null ----
const BASS={
 oompah:s=>s%4===0?[s%8?7:0,2]:null,
 walk:s=>s%4===0?[[0,4,7,9][(s/4)%4],3]:null,
 octave:s=>s%2===0?[s%4?12:0,1]:null,
 drive:s=>s%2===0?[0,2]:null,
 pulse:s=>s%2===0?[0,1]:null,
 gallop:s=>s%4===0?[s%8?7:0,2]:s%4===2||s%4===3?[0,1]:null,
 gallop6:s=>s%3===0?[s%6?7:0,s%3?1:2]:null,
 habanera:s=>({0:[0,3],3:[7,1],4:[3,2],6:[7,2]})[s%8]||null,
 waltz:s=>s%6===0?[0,2]:null,
 six:s=>s%12===0?[0,5]:s%12===6?[7,5]:null,
 doom:s=>s%8===0?[0,6]:null
};
let cfg={getContext:()=>null,paused:()=>false,pace:()=>1,onTrack:null};
let ctx=null,out=null,pulseWave=null,noise=null,timer=0,zone='mind',track=null,step=0,nextTime=0,loops=0,holdUntil=0,muted=false;
const rotation={};
function configureMusic(c){Object.assign(cfg,c);}
function graph(){
 const a=cfg.getContext();if(!a)return null;
 if(ctx!==a){ctx=a;
  const comp=a.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=4;comp.connect(a.destination);
  out=a.createGain();out.gain.value=.5;out.connect(comp);
  const real=new Float32Array(32),imag=new Float32Array(32);for(let n=1;n<32;n++)imag[n]=2*Math.sin(Math.PI*n*.25)/(Math.PI*n);pulseWave=a.createPeriodicWave(real,imag);
  noise=a.createBuffer(1,a.sampleRate,a.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 }
 return a;
}
function env(g,t,dur,vol,att=.006,rel=.08){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.setTargetAtTime(vol*.7,t+att,.08);g.gain.setTargetAtTime(0,t+Math.max(att,dur),rel/3);}
function osc(type,freq,t,stop,dest,detune=0){const o=ctx.createOscillator();if(type==='pulse')o.setPeriodicWave(pulseWave);else o.type=type;o.frequency.value=freq;o.detune.value=detune;o.connect(dest);o.start(t);o.stop(stop);return o;}
function filter(type,freq,dest,q=.7){const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;f.connect(dest);return f;}
// A pitched note. kind: square|triangle|sine|pulse|saw|brass|organ|glass|bass|stab|pad|power
function voice(kind,midi,t,dur,vol,dest=out){
 const g=ctx.createGain();g.connect(dest);const f=hz(midi),end=t+dur+.6;
 switch(kind){
  case 'saw':env(g,t,dur,vol*.8);osc('sawtooth',f,t,end,filter('lowpass',2400,g));break;
  case 'brass':{env(g,t,dur,vol*.9,.03);const lp=filter('lowpass',700,g);lp.frequency.setValueAtTime(700,t);lp.frequency.linearRampToValueAtTime(3200,t+.06);lp.frequency.setTargetAtTime(1400,t+.08,.15);osc('sawtooth',f,t,end,lp,-6);osc('sawtooth',f,t,end,lp,6);break;}
  case 'organ':{env(g,t,dur,vol*.7,.01,.12);const lp=filter('lowpass',3200,g);osc('square',f,t,end,lp);osc('sine',f*2,t,end,lp);osc('sine',f/2,t,end,g);break;}
  case 'glass':{env(g,t,dur,vol,.02,.6);osc('sine',f,t,end+.4,g);osc('triangle',f*2,t,end+.4,g,9);break;}
  case 'bass':{env(g,t,dur,vol,.004,.05);const lp=filter('lowpass',900,g);osc('triangle',f,t,end,lp);osc('square',f,t,end,filter('lowpass',420,g));break;}
  case 'stab':env(g,t,Math.min(dur,.09),vol,.003,.05);osc('triangle',f,t,end,filter('lowpass',2000,g));break;
  case 'pad':env(g,t,dur,vol,.25,.5);osc('sine',f,t,end+.5,g,-5);osc('triangle',f,t,end+.5,g,5);break;
  case 'power':{env(g,t,dur,vol,.01,.15);const lp=filter('lowpass',1200,g);osc('sawtooth',f,t,end,lp,-8);osc('sawtooth',f*1.4983,t,end,lp,8);break;}
  default:env(g,t,dur,vol);osc(kind,f,t,end,g);
 }
}
function drum(kind,t,vol,dest=out){
 const g=ctx.createGain();g.connect(dest);
 if(kind==='k'){const o=ctx.createOscillator();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.connect(g);o.start(t);o.stop(t+.3);return;}
 const n=ctx.createBufferSource();n.buffer=noise;n.playbackRate.value=.8+Math.random()*.4;
 const len={s:.16,h:.04,o:.2,c:1.4}[kind]||.1;
 n.connect(filter(kind==='s'?'bandpass':'highpass',kind==='s'?1800:kind==='c'?4200:7000,g,kind==='s'?.8:.7));
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+len);n.start(t,Math.random()*.5);n.stop(t+len+.02);
 if(kind==='s'){const g2=ctx.createGain();g2.connect(dest);g2.gain.setValueAtTime(vol*.6,t);g2.gain.exponentialRampToValueAtTime(.001,t+.08);osc('triangle',190,t,t+.1,g2);}
}
function playStep(tr,s,t,sd){
 const bar=tr.bar||16,cs=tr.cs||bar,ci=Math.floor(s/cs)%tr.chordList.length,ch=tr.chordList[ci],inChord=s%cs;
 for(const e of tr.at[s]||[])voice(tr.lead||'square',e.midi,t,e.dur*sd*.92,.075*(tr.leadVol||1));
 // bass
 if(tr.bassAt&&Object.keys(tr.bassAt).length){for(const e of tr.bassAt[s]||[])voice('bass',e.midi,t,e.dur*sd*.9,.16);}
 else{const b=BASS[tr.bass]?.(inChord,ch);if(b)voice('bass',36+ch.root+b[0]-(ch.root>7?12:0),t,b[1]*sd*.85,.16);}
 // chords / arpeggio
 const tones=ch.tones.map(x=>60+ch.root+x);
 if(tr.comp==='stab'&&s%4===2)for(const m of tones)voice('stab',m,t,sd,.022);
 if(tr.comp==='arp'&&(tr.bpm<130||s%2===0))voice('triangle',tones[(s/(tr.bpm<130?1:2)|0)%tones.length]+12,t,sd*.8,.022);
 if(tr.comp==='pad'&&inChord===0)for(const m of tones)voice('pad',m,t,cs*sd,.018);
 if(tr.comp==='power'&&inChord===0)voice('power',48+ch.root,t,cs*sd*.95,.035);
 // drums
 const d=DRUMS[tr.drums];if(d){const at=p=>p[s%p.length];
  if(at(d.k)==='x')drum('k',t,.42);if(at(d.s)==='x')drum('s',t,.13);const h=at(d.h);if(h==='x')drum('h',t,s%4?.022:.035);if(h==='o')drum('o',t,.03);
  if(s===0&&tr.drums!=='sparse'&&tr.drums!=='sixsoft')drum('c',t,.05);}
}
function pickTrack(){
 const list=PLAYLISTS[zone]||PLAYLISTS.mind,i=rotation[zone]??(rotation[zone]=0);
 track=compile(list[i%list.length]);step=0;loops=0;cfg.onTrack?.(track,zone);
}
function tick(){
 const a=graph();if(!a)return;
 if(cfg.paused()||a.currentTime<holdUntil){if(!muted){muted=true;out.gain.setTargetAtTime(0,a.currentTime,.05);}nextTime=Math.max(a.currentTime+.05,holdUntil);return;}
 if(muted){muted=false;out.gain.cancelScheduledValues(a.currentTime);out.gain.setTargetAtTime(.5,a.currentTime,.15);}
 if(!track)pickTrack();
 if(nextTime<a.currentTime)nextTime=a.currentTime+.05;
 while(nextTime<a.currentTime+.15){
  const pace=Math.min(1.3,Math.max(.8,+cfg.pace()||1)),sd=60/(track.bpm*pace)/4;
  const swing=step%2?(track.swing||0)*sd:0;
  try{playStep(track,step,nextTime+swing,sd);}catch{}
  nextTime+=sd;step++;
  if(step>=track.length){step=0;loops++;
   const need=Math.max(2,Math.ceil(45/(track.length*sd)));
   if(loops>=need){rotation[zone]=(rotation[zone]||0)+1;pickTrack();}}
 }
}
function startSequencer(){if(timer)return;const a=graph();if(!a)return;nextTime=a.currentTime+.1;muted=true;out.gain.value=0;timer=setInterval(tick,30);tick();}
function stopSequencer(){clearInterval(timer);timer=0;if(ctx&&out){out.gain.cancelScheduledValues(ctx.currentTime);out.gain.setTargetAtTime(0,ctx.currentTime,.04);}muted=true;}
function setSequencerZone(z){z=String(z||'mind');if(z.startsWith('warp'))z='warp';if(!PLAYLISTS[z])z='mind';if(z===zone&&track)return;if(z!==zone&&track)rotation[z]=(rotation[z]??-1)+1;zone=z;track=null;if(timer&&ctx){out.gain.cancelScheduledValues(ctx.currentTime);out.gain.setTargetAtTime(0,ctx.currentTime,.03);muted=true;nextTime=ctx.currentTime+.12;}}
// Pause background music for `seconds` (title cards, intro card).
function holdMusicFor(seconds){const a=graph();if(a)holdUntil=Math.max(holdUntil,a.currentTime+seconds);}
function releaseHold(){holdUntil=0;}
const nowPlaying=()=>track?{id:track.id,name:track.name,by:track.by,zone}:null;

// ---- Metal riff for the title cards ----
let metalBus=null;
function distortion(amount=80){const s=ctx.createWaveShaper(),n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=(3+amount)*x*20*Math.PI/180/(Math.PI+amount*Math.abs(x));}s.curve=c;s.oversample='2x';return s;}
function stopMetal(){if(!metalBus||!ctx)return;const b=metalBus;metalBus=null;b.gain.cancelScheduledValues(ctx.currentTime);b.gain.setTargetAtTime(0,ctx.currentTime,.05);setTimeout(()=>{try{b.disconnect();}catch{}},400);releaseHold();}
// Returns the riff's length in seconds (0 if audio is unavailable).
function playMetalRiff(kind='mind'){
 const a=graph();if(!a)return 0;stopMetal();
 const r=METAL[String(kind).startsWith('warp')?'warp':kind]||METAL.mind,sd=60/r.bpm/4,t0=a.currentTime+.05;
 const bus=metalBus=a.createGain();bus.gain.value=.55;bus.connect(a.destination);
 const cab=filter('lowpass',3400,bus,1.2),pre=a.createGain();pre.gain.value=1;const sh=distortion(90);pre.connect(filter('highpass',90,sh));sh.connect(cab);
 const guitar=(semi,t,dur,mute)=>{const g=a.createGain();g.connect(mute?filter('lowpass',700,pre):pre);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.5,t+.004);g.gain.setTargetAtTime(0,t+dur,mute?.02:.06);
  const f=hz(40+semi);for(const [m,d] of [[1,-9],[1,9],[1.4983,0],[2,4]]){const o=a.createOscillator();o.type='sawtooth';o.frequency.value=f*m;o.detune.value=d;o.connect(g);o.start(t);o.stop(t+dur+.4);}
  const bg=a.createGain();bg.connect(bus);bg.gain.setValueAtTime(.12,t);bg.gain.setTargetAtTime(0,t+dur,.05);const bo=a.createOscillator();bo.type='sawtooth';bo.frequency.value=f/2;bo.connect(filter('lowpass',300,bg));bo.start(t);bo.stop(t+dur+.3);};
 let at=0;
 for(const tok of r.riff.split(/\s+/)){if(!tok||tok==='|')continue;const [n,d]=tok.split(':'),dur=+(d||1);const t=t0+at*sd;
  guitar(n==='x'?0:+n,t,dur*sd*(n==='x'?.5:.92),n==='x');at+=dur;}
 const end=t0+at*sd;guitar(0,end,1.1,false);
 for(let s=0;s<at;s++){const t=t0+s*sd;drum('k',t,.5,bus);if(s%8===4)drum('s',t,.3,bus);if(s%16===0)drum('c',t,.12,bus);if(s%2===0)drum('h',t,.04,bus);}
 drum('k',end,.6,bus);drum('c',end,.18,bus);drum('s',end,.3,bus);
 const total=end-a.currentTime+1.1;holdMusicFor(total);
 setTimeout(()=>{if(metalBus===bus){metalBus=null;releaseHold();setTimeout(()=>{try{bus.disconnect();}catch{}},300);}},total*1000+100);
 return total;
}
// ---- Soft string-quartet chord (intro card). kind: 'open' | 'close' ----
function playQuartet(kind='open'){
 const a=graph();if(!a)return;const t=a.currentTime+.03,bus=a.createGain();bus.gain.value=.5;bus.connect(a.destination);
 const chords=kind==='close'?[[[45,52,61,67],0,.9],[[38,50,57,66],.85,2.6]]:[[[38,45,54,62,66],0,3]];
 for(const [notes,start,dur] of chords)for(const m of notes){const g=a.createGain();g.connect(bus);const st=t+start;g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(.03,st+.35);g.gain.setTargetAtTime(0,st+dur,.4);
  const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=5+Math.random();lg.gain.value=hz(m)*.006;lfo.connect(lg);
  const lp=filter('lowpass',1500,g);for(const d of [-6,6]){const o=a.createOscillator();o.type='sawtooth';o.frequency.value=hz(m);o.detune.value=d;lg.connect(o.frequency);o.connect(lp);o.start(st);o.stop(st+dur+2);}lfo.start(st);lfo.stop(st+dur+2);}
 setTimeout(()=>{try{bus.disconnect();}catch{}},8000);
}
Object.assign(exports,{configureMusic,startSequencer,stopSequencer,setSequencerZone,holdMusicFor,releaseHold,nowPlaying,playMetalRiff,stopMetal,playQuartet,parseNotes,parseChord,compile,TRACKS,PLAYLISTS});
