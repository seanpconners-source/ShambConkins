// A tiny Game Boy APU in WebAudio: two pulse channels (12.5/25/50% duty), a 4-bit
// wave channel and LFSR noise, a 16th-note sequencer, sound effects and procedural
// "cries". All melodies here are original compositions written for ShambConkins in the
// style of 8-bit battle music (no Nintendo melodies are reproduced).
const {store}=require("src/state.js");
const {hash,seededRandom}=require("src/utils.js");
const ctxOf=()=>{try{return require("src/audio.js").audioContext();}catch{return null;}};
const musicOn=()=>!!store.profile?.settings?.music;
const sfxOn=()=>!!store.profile?.settings?.sound;

let A=null,master=null,musicBus=null,sfxBus=null,waves=null,noise=null;
function setup(){
 const a=ctxOf();if(!a)return null;if(A===a)return a;A=a;
 master=a.createGain();master.gain.value=.9;
 const comp=a.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.003;comp.release.value=.12;
 // the Game Boy speaker: no lows, a little top roll-off
 const hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=90;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=9000;
 master.connect(hp);hp.connect(lp);lp.connect(comp);comp.connect(a.destination);
 musicBus=a.createGain();musicBus.gain.value=.55;musicBus.connect(master);sfxBus=a.createGain();sfxBus.gain.value=.8;sfxBus.connect(master);
 const pulse=d=>{const n=48,re=new Float32Array(n),im=new Float32Array(n);for(let k=1;k<n;k++)re[k]=2/(k*Math.PI)*Math.sin(k*Math.PI*d);return a.createPeriodicWave(re,im);};
 // wave RAM: a 32-step, 4-bit triangle, the classic bass voice
 const waveTable=()=>{const N=32,s=[];for(let i=0;i<N;i++)s.push(Math.round((i<16?i:31-i)/15*15)/7.5-1);const n=24,re=new Float32Array(n),im=new Float32Array(n);for(let k=1;k<n;k++){let r=0,m=0;for(let i=0;i<N;i++){r+=s[i]*Math.cos(2*Math.PI*k*i/N);m+=s[i]*Math.sin(2*Math.PI*k*i/N);}re[k]=r/N*2;im[k]=m/N*2;}return a.createPeriodicWave(re,im);};
 waves={12:pulse(.125),25:pulse(.25),50:pulse(.5),wave:waveTable()};
 const lfsr=(len,short)=>{const b=a.createBuffer(1,len,a.sampleRate),d=b.getChannelData(0);let r=0x7fff;for(let i=0;i<len;i++){const bit=(r^(r>>1))&1;r=(r>>1)|(bit<<14);if(short)r=(r&~0x40)|(bit<<6);d[i]=r&1?-.8:.8;}return b;};
 noise={long:lfsr(a.sampleRate,false),short:lfsr(4096,true)};
 return a;
}
const hz=m=>440*2**((m-69)/12);
const live=new Set();
function track(node,until){live.add(node);node.onended=()=>{live.delete(node);try{node.disconnect();}catch{}};}

// ---------------------------------------------------------------- voices
function pulseNote(dest,t,dur,midi,{duty=50,vol=.1,decay=0,vib=false,slide=0,release=.012}={}){
 const a=A,o=a.createOscillator(),g=a.createGain();o.setPeriodicWave(waves[duty]||waves[50]);o.frequency.setValueAtTime(hz(midi),t);
 if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,hz(midi+slide)),t+dur);
 if(vib&&dur>.22){const l=a.createOscillator(),lg=a.createGain();l.frequency.value=5.6;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(hz(midi)*.012,t+.2);l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur+.05);track(l);}
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.004);
 if(decay)g.gain.setTargetAtTime(vol*.35,t+.01,decay);
 g.gain.setValueAtTime(decay?Math.max(.0001,vol*.4):vol,t+Math.max(.005,dur-release));g.gain.linearRampToValueAtTime(0,t+dur);
 o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.02);track(o);
}
function waveNote(dest,t,dur,midi,vol=.2){const a=A,o=a.createOscillator(),g=a.createGain();o.setPeriodicWave(waves.wave);o.frequency.value=hz(midi);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.003);g.gain.setValueAtTime(vol,t+Math.max(.004,dur-.012));g.gain.linearRampToValueAtTime(0,t+dur);o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.02);track(o);}
function noiseHit(dest,t,dur,{vol=.1,rate=1,short=false,freq=0,q=1,type='highpass',decay=null}={}){
 const a=A,n=a.createBufferSource();n.buffer=short?noise.short:noise.long;n.loop=true;n.playbackRate.value=rate;const g=a.createGain();
 let node=n;if(freq){const f=a.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;n.connect(f);node=f;}
 g.gain.setValueAtTime(vol,t);g.gain.setTargetAtTime(0,t+.002,decay??dur/3);node.connect(g);g.connect(dest);n.start(t,Math.random()*.5);n.stop(t+dur+.05);track(n);
}
const DRUM={
 h:(d,t)=>noiseHit(d,t,.05,{vol:.05,rate:1,freq:7000,decay:.015}),
 o:(d,t)=>noiseHit(d,t,.18,{vol:.045,rate:1,freq:6000,decay:.06}),
 s:(d,t)=>noiseHit(d,t,.16,{vol:.13,rate:.45,freq:1400,type:'bandpass',q:.6,decay:.05}),
 k:(d,t)=>{noiseHit(d,t,.08,{vol:.14,rate:.12,freq:420,type:'lowpass',decay:.03});pulseNote(d,t,.07,40,{duty:50,vol:.09,slide:-14});},
 c:(d,t)=>noiseHit(d,t,.6,{vol:.07,rate:.9,freq:5000,decay:.22}),
 t:(d,t)=>noiseHit(d,t,.12,{vol:.1,rate:.25,freq:900,type:'bandpass',q:1.2,decay:.05})
};

// ---------------------------------------------------------------- notation
// "B4:3 B4:3 E5:2 r:2" → note events in 16th steps.
const NOTE={C:0,'C#':1,DB:1,D:2,'D#':3,EB:3,E:4,F:5,'F#':6,GB:6,G:7,'G#':8,AB:8,A:9,'A#':10,BB:10,B:11};
function midi(name){const m=name.toUpperCase().match(/^([A-G](?:#|B)?)(-?\d)$/);if(!m)return null;return 12*(+m[2]+1)+NOTE[m[1]];}
function seq(str,start=0){const ev=[];let t=start;for(const tok of str.trim().split(/\s+/)){const [n,d]=tok.split(':'),len=+(d||1);if(n!=='r')ev.push([t,len,midi(n)]);t+=len;}return {ev,len:t-start};}
const CH={Em:['E4','G4','B4'],C:['C4','E4','G4'],D:['D4','F#4','A4'],F:['F4','A4','C5'],B7:['B3','D#4','F#4','A4'],B:['B3','D#4','F#4'],Am:['A3','C4','E4'],G:['G3','B3','D4'],E:['E4','G#4','B4'],
 Dm:['D4','F4','A4'],Bm:['B3','D4','F#4'],Bb:['Bb3','D4','F4'],A:['A3','C#4','E4'],Gm:['G3','Bb3','D4'],E7:['E4','G#4','B4','D5']};
function arp(chords,pattern=[0,1,2,3,2,1],step=1,octave=0){const ev=[];chords.forEach((name,bar)=>{const notes=CH[name].map(midi);const full=[...notes,notes[0]+12];for(let i=0;i<16;i+=step){const n=full[pattern[(i/step)%pattern.length]%full.length]+octave*12;ev.push([bar*16+i,step,n]);}});return ev;}
function bass(chords,pattern,{octave=-1}={}){const ev=[];chords.forEach((name,bar)=>{const root=midi(CH[name][0])+octave*12;let t=0;for(const [iv,len] of pattern){if(iv!==null)ev.push([bar*16+t,len,root+iv]);t+=len;}});return ev;}
function drums(bars){const ev=[];bars.forEach((p,bar)=>{[...p].forEach((ch,i)=>{if(DRUM[ch])ev.push([bar*16+i,1,ch]);});});return ev;}
function melody(...bars){let t=0;const ev=[];for(const b of bars){const s=seq(b,t);ev.push(...s.ev);t+=s.len;}return ev;}
const shift=(ev,by)=>ev.map(([t,d,n])=>[t+by,d,n]);
function part(bars,{lead=[],harm=[],low=[],kit=[]},opts={}){return {bars,lead,harm,low,kit,...opts};}

// ---------------------------------------------------------------- songs
const B8=(a,b)=>[a,a,a,a,a,a,a,b];
const KIT_A='k.h.s.h.k.h.s.hh',KIT_B='k.h.s.hkk.h.s.h.',KIT_FILL='k.h.s.h.k.h.ssss';
const SONGS={};
// Wild battle: E minor, frantic.
{
 const intro=part(2,{
  lead:melody('E6 F6 C#6 D6 A#5 B5 G5 G#5 E5 F5 C#5 D5 A#4 B4 G4 G#4','E5:2 r:2 E5:2 r:2 E4 G4 B4 E5 G5 B5 E6 r'),
  harm:melody('E5 F5 C#5 D5 A#4 B4 G4 G#4 E4 F4 C#4 D4 A#3 B3 G3 G#3','B4:2 r:2 B4:2 r:2 B3 E4 G4 B4 E5 G5 B5 r'),
  low:melody('E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2','E2:2 r:2 E2:2 r:2 r:4 C#3 D3 D#3 E3'),
  kit:drums(['hhhhhhhhhhhhhhhh','s.s.s.s.ssssssss'])});
 const A=['Em','Em','C','D','Em','Em','F','B7'],Bc=['C','Am','D','Bm','C','Am','B','B'];
 const loopA=part(8,{
  lead:melody('B4:3 B4:3 E5:2 D5:2 B4:2 A4:2 G4:2','F#4:2 G4:2 A4:2 B4:2 D5:2 B4:6','C5:3 C5:3 E5:2 G5:4 F#5:2 E5:2','D5:3 C5:3 B4:2 A4:2 B4:2 C5:2 D5:2',
   'E5:3 E5:3 G5:2 F#5:2 E5:2 D5:2 B4:2','C5:2 B4:2 A4:2 G4:2 A4:2 B4:6','C5:3 A4:3 F4:2 A4:2 C5:2 F5:4','D#5:2 F#5:2 A5:2 F#5:2 D#5:4 B4:4'),
  harm:arp(A,[0,1,2,3,2,1],1,0),low:bass(A,[[0,2],[12,2],[7,2],[12,2],[0,2],[12,2],[7,2],[12,2]]),kit:drums([KIT_A,KIT_A,KIT_A,KIT_B,KIT_A,KIT_A,KIT_A,KIT_FILL])});
 const loopB=part(8,{
  lead:melody('G5:6 E5:2 C5:4 E5:4','A5:6 E5:2 C5:4 A4:4','F#5:6 D5:2 A4:4 D5:4','B5:6 F#5:2 D5:4 B4:4','E5:4 G5:4 C6:6 B5:2','A5:4 G5:4 E5:4 C5:4','D#5:4 F#5:4 B5:4 A5:4','F#5:4 D#5:4 B4:8'),
  harm:arp(Bc,[0,2,1,2],2,1),low:bass(Bc,[[0,2],[12,2],[0,2],[12,2],[0,2],[12,2],[0,2],[12,2]]),kit:drums([...B8(KIT_A,KIT_A).slice(0,7),KIT_FILL])});
 SONGS.wild={bpm:168,duty:[50,25],intro,loop:[loopA,loopB]};
}
// Trainer battle: A minor, galloping.
{
 const intro=part(2,{
  lead:melody('A5 A5 G5 A5 C6 A5 G5 A5 E5 A5 G5 A5 B5 A5 G#5 A5','A5:2 r A5:2 r A5:2 r:2 E5 G#5 B5 D6 E6 G#6'),
  harm:melody('E5 E5 E5 E5 E5 E5 E5 E5 C5 C5 C5 C5 D5 D5 D5 D5','E5:2 r E5:2 r E5:2 r:2 B4 E5 G#5 B5 D6 E6'),
  low:melody('A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2','A2:2 r A2:2 r A2:2 r:2 E2 E2 E3 E2 E3 E3'),
  kit:drums(['k.hhk.hhk.hhk.hh','s.ks.ks.k..sssss'])});
 const A=['Am','G','F','E','Am','G','F','E'],Bc=['Dm','Am','Dm','E'];
 const gallop=[[0,2],[12,1],[12,1],[0,2],[12,1],[12,1],[0,2],[12,1],[12,1],[0,2],[7,1],[12,1]];
 const loopA=part(8,{
  lead:melody('A4:2 C5:2 E5:4 D5:2 C5:2 B4:2 C5:2','D5:6 B4:2 G4:4 B4:4','C5:2 D5:2 E5:2 F5:2 E5:2 D5:2 C5:2 A4:2','B4:6 G#4:2 E4:2 G#4:2 B4:2 D5:2',
   'E5:2 A5:2 E5:2 C5:2 A4:2 C5:2 E5:4','D5:2 G5:2 D5:2 B4:2 G4:2 B4:2 D5:4','F5:3 E5:3 D5:2 C5:3 B4:3 A4:2','G#4:4 B4:4 E5:4 G#5:4'),
  harm:arp(A,[0,2,1,2],1,1),low:bass(A,gallop),kit:drums(['k.h.s.hkk.h.s.hh','k.h.s.hkk.h.s.hh','k.h.s.hkk.h.s.hh','k.h.s.hkk.hsssss','k.h.s.hkk.h.s.hh','k.h.s.hkk.h.s.hh','k.h.s.hkk.h.s.hh','k.s.s.s.ssssssss'])});
 const loopB=part(4,{
  lead:melody('F5:8 E5:4 D5:4','E5:8 C5:4 A4:4','D5:4 F5:4 A5:4 G5:2 F5:2','E5:4 D5:4 C5:2 B4:2 G#4:4'),
  harm:arp(Bc,[0,1,2,1],2,1),low:bass(Bc,gallop),kit:drums(['k.o.s.o.k.o.s.o.','k.o.s.o.k.o.s.o.','k.o.s.o.k.o.s.o.','k.s.s.s.ssssssss'])});
 SONGS.trainer={bpm:176,duty:[50,25],intro,loop:[loopA,loopB]};
}
// Gym leader / rival: D minor, heavy.
{
 const intro=part(2,{
  lead:melody('D5 D6 D5 D6 D5 D6 D5 D6 D5 D6 D5 D6 D5 D6 D5 D6','C#5 C#6 C#5 C#6 C#5 C#6 C#5 C#6 A4:2 C#5:2 E5:2 A5:2'),
  harm:melody('A4:16','A4:8 E4:2 A4:2 C#5:2 E5:2'),
  low:melody('D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2','C#2:2 C#3:2 C#2:2 C#3:2 A1 A1 A2 A1 A2 A2 A3 A2'),
  kit:drums(['ssssssssssssssss','k.k.k.k.ssssssss'])});
 const A=['Dm','Bb','C','A','Dm','Bb','C','A'];
 const loopA=part(8,{
  lead:melody('D5:2 F5:2 A5:3 G5:3 F5:2 E5:2 F5:2','D5:6 A#4:2 F4:4 A#4:4','C5:2 E5:2 G5:3 F5:3 E5:2 D5:2 E5:2','C#5:6 E5:2 A5:8',
   'A5:2 G5:2 F5:2 E5:2 F5:2 G5:2 A5:4','A#5:4 A5:2 G5:2 F5:4 D5:4','E5:2 F5:2 G5:2 E5:2 C5:4 G5:4','A5:4 G5:2 F5:2 E5:4 C#5:4'),
  harm:arp(A,[0,1,2,3],1,1),low:bass(A,[[0,2],[12,2],[0,2],[12,2],[0,2],[12,2],[10,2],[12,2]]),kit:drums(['k.hsk.hsk.hsk.hs','k.hsk.hsk.hsk.hs','k.hsk.hsk.hsk.hs','k.hsk.hsssssssss','k.hsk.hsk.hsk.hs','k.hsk.hsk.hsk.hs','k.hsk.hsk.hsk.hs','ksksksksssssssss'])});
 SONGS.gym={bpm:184,duty:[50,25],intro,loop:[loopA]};
}
// Victory fanfare and loop: C major.
{
 const C=['C','F','G','C'];
 const intro=part(2,{lead:melody('C5:2 C5:2 C5:2 E5:6 r:4','G5:2 G5:2 G5:2 C6:10'),harm:melody('G4:2 G4:2 G4:2 C5:6 r:4','E5:2 E5:2 E5:2 G5:10'),low:melody('C3:2 C3:2 C3:2 C2:6 r:4','G2:2 G2:2 G2:2 C3:10'),kit:drums(['s.s.s.c.........','s.s.s.c.........'])});
 const loop=part(4,{lead:melody('E5:2 G5:2 E5:2 C5:2 D5:2 E5:2 G5:4','F5:2 A5:2 F5:2 C5:2 D5:2 F5:2 A5:4','G5:2 B5:2 G5:2 D5:2 F5:2 G5:2 B5:4','C6:4 G5:4 E5:4 C5:4'),
  harm:arp(C,[0,1,2,1],2,1),low:bass(C,[[0,2],[7,2],[12,2],[7,2],[0,2],[7,2],[12,2],[7,2]]),kit:drums(['k.h.s.h.k.h.s.h.','k.h.s.h.k.h.s.h.','k.h.s.h.k.h.s.h.','k.h.s.h.k.hss.s.'])});
 SONGS.victory={bpm:140,duty:[25,12],intro,loop:[loop]};
}
// Route theme for the Pokémon warp zone: G major, a stroll.
{
 const C=['G','Em','C','D','G','Em','C','G'];
 const loop=part(8,{lead:melody('B4:2 D5:2 G5:4 F#5:2 G5:2 A5:4','B5:4 A5:2 G5:2 E5:8','E5:2 G5:2 C6:4 B5:2 A5:2 G5:4','F#5:4 E5:2 D5:2 A4:8','B4:2 D5:2 G5:4 A5:2 B5:2 D6:4','C6:4 B5:2 A5:2 G5:4 E5:4','E5:4 G5:4 F#5:4 A5:4','G5:12 r:4'),
  harm:arp(C,[1,2],2,1),low:bass(C,[[0,4],[7,4],[12,4],[7,4]]),kit:drums(B8('k...h.h.k...h.h.','k...h.h.k.h.hhh.'))});
 SONGS.route={bpm:126,duty:[50,12],intro:null,loop:[loop]};
}
// Trainer spotted you: a nervous loop while they walk over.
{
 const loop=part(2,{lead:melody('E5:2 G5:2 E5:2 B4:2 C5:2 B4:2 G4:2 B4:2','E5:2 G5:2 B5:2 G5:2 A#5:2 A5:2 G5:2 F#5:2'),harm:melody('r:16','r:16'),low:bass(['Em','Em'],[[0,2],[12,2],[0,2],[12,2],[0,2],[12,2],[0,2],[12,2]]),kit:drums(['h.h.s.h.h.h.s.h.','h.h.s.h.h.h.ssss'])});
 SONGS.spotted={bpm:150,duty:[50,25],intro:null,loop:[loop]};
}
// One-shot jingles: [bpm, lead, harm, bass].
const JINGLES={
 caught:[150,'G4:2 C5:2 E5:2 G5:4 E5:2 F5:2 G5:2 C6:12','E4:2 G4:2 C5:2 E5:4 C5:2 D5:2 E5:2 G5:12','C3:2 C3:2 C3:2 C3:4 G2:2 G2:2 G2:2 C3:12'],
 levelup:[160,'F5:2 A5:2 C6:2 F6:6','C5:2 F5:2 A5:2 C6:6','F3:2 F3:2 F3:2 F2:6'],
 heal:[150,'C6:2 G5:2 E5:2 C5:2 G5:2 C6:8','E5:2 C5:2 G4:2 E4:2 C5:2 E5:8','C3:4 G2:4 C3:8'],
 item:[150,'G5:2 G5:2 G5:2 C6:4 E6:8','E5:2 E5:2 E5:2 G5:4 C6:8','C3:2 C3:2 C3:2 E3:4 C3:8'],
 blackout:[100,'E5:4 D#5:4 D5:4 C#5:12','C5:4 B4:4 A#4:4 A4:12','A2:4 G#2:4 G2:4 F#2:12'],
 bang:[200,'E6:2 r:1 E6:6','B5:2 r:1 B5:6','E3:2 r:1 E2:6']
};

// ---------------------------------------------------------------- sequencer
let timer=0,current=null,nextT=0,partIdx=0,step=0,inIntro=false,songId=null,songBus=null;
function stopSong(fade=.05){
 clearInterval(timer);timer=0;songId=null;current=null;
 if(songBus&&A){const b=songBus;b.gain.cancelScheduledValues(A.currentTime);b.gain.setTargetAtTime(0,A.currentTime,fade);setTimeout(()=>{try{b.disconnect();}catch{}},600);}songBus=null;
}
function playSong(id){
 if(songId===id&&timer)return;stopSong();if(!musicOn())return;const a=setup();if(!a)return;const song=SONGS[id];if(!song)return;
 songId=id;current=song;songBus=a.createGain();songBus.gain.value=1;songBus.connect(musicBus);
 nextT=a.currentTime+.06;inIntro=!!song.intro;partIdx=0;step=0;
 timer=setInterval(pump,25);pump();
}
function pump(){
 if(!current||!A)return;const song=current,sp=60/song.bpm/4,ahead=A.currentTime+.16;
 while(nextT<ahead){
  const p=inIntro?song.intro:song.loop[partIdx];
  for(const [lane,list] of [['lead',p.lead],['harm',p.harm],['low',p.low],['kit',p.kit]])for(const ev of list)if(ev[0]===step)scheduleEv(lane,ev,nextT,sp,song);
  step++;nextT+=sp;
  if(step>=p.bars*16){step=0;if(inIntro)inIntro=false;else partIdx=(partIdx+1)%song.loop.length;}
 }
}
function scheduleEv(lane,[t,len,n],at,sp,song){
 const d=songBus,dur=len*sp;if(!d)return;
 if(lane==='lead')pulseNote(d,at,dur*.94,n,{duty:song.duty[0],vol:.085,vib:len>=4,decay:len>=3?.18:0});
 else if(lane==='harm')pulseNote(d,at,dur*.9,n,{duty:song.duty[1],vol:.045,decay:.06});
 else if(lane==='low')waveNote(d,at,dur*.9,n,.17);
 else DRUM[n]?.(d,at);
}
function playJingle(id){
 const j=JINGLES[id];if(!j||!(musicOn()||sfxOn()))return 0;const a=setup();if(!a)return 0;const [bpm,...lines]=j,sp=60/bpm/4,t0=a.currentTime+.04;let total=0;
 lines.forEach((line,i)=>{const {ev,len}=seq(line);total=Math.max(total,len*sp);for(const [t,l,n] of ev){const at=t0+t*sp,dur=l*sp*.95;if(i===2)waveNote(sfxBus,at,dur,n,.17);else pulseNote(sfxBus,at,dur,n,{duty:i?25:50,vol:i?.05:.09,vib:l>=6,decay:l>=6?.3:0});}});
 return total+.1;
}

// ---------------------------------------------------------------- effects
function sfx(name,opts={}){
 if(!sfxOn())return;const a=setup();if(!a)return;const t=a.currentTime+.01,d=sfxBus;
 switch(name){
  case 'press':pulseNote(d,t,.035,91,{duty:50,vol:.07});break;
  case 'hit':noiseHit(d,t,.18,{vol:.24,rate:.5,decay:.05});pulseNote(d,t,.06,48,{duty:50,vol:.08,slide:-10});break;
  case 'hitSuper':noiseHit(d,t,.32,{vol:.3,rate:.35,decay:.09});noiseHit(d,t+.12,.2,{vol:.22,rate:.25,decay:.06});pulseNote(d,t,.12,43,{duty:50,vol:.1,slide:-12});break;
  case 'hitWeak':noiseHit(d,t,.08,{vol:.14,rate:1.2,freq:2500,decay:.02});break;
  case 'faint':pulseNote(d,t,.55,79,{duty:25,vol:.1,slide:-36});break;
  case 'throw':pulseNote(d,t,.4,96,{duty:12,vol:.07,slide:-30});noiseHit(d,t,.3,{vol:.05,rate:.8,freq:3000,decay:.1});break;
  case 'poof':noiseHit(d,t,.35,{vol:.18,rate:.7,freq:1800,type:'bandpass',decay:.12});pulseNote(d,t,.2,60,{duty:12,vol:.06,slide:24});break;
  case 'wobble':noiseHit(d,t,.05,{vol:.16,rate:.3,freq:900,type:'bandpass',decay:.02});pulseNote(d,t,.05,55,{duty:50,vol:.07});break;
  case 'click':pulseNote(d,t,.04,84,{duty:50,vol:.09});pulseNote(d,t+.07,.06,91,{duty:50,vol:.09});break;
  case 'run':for(let i=0;i<3;i++)noiseHit(d,t+i*.09,.08,{vol:.12,rate:.9-i*.2,freq:2000,decay:.03});break;
  case 'statUp':for(let i=0;i<6;i++)pulseNote(d,t+i*.045,.04,72+i*3,{duty:25,vol:.06});break;
  case 'statDown':for(let i=0;i<6;i++)pulseNote(d,t+i*.045,.04,90-i*3,{duty:25,vol:.06});break;
  case 'heal':for(let i=0;i<8;i++)pulseNote(d,t+i*.05,.05,84+(i%4)*4,{duty:12,vol:.05});break;
  case 'status':pulseNote(d,t,.25,70,{duty:12,vol:.06,slide:8});pulseNote(d,t+.12,.25,66,{duty:12,vol:.05,slide:-8});break;
  case 'miss':pulseNote(d,t,.12,64,{duty:12,vol:.05,slide:-5});break;
  case 'lowhp':pulseNote(d,t,.08,88,{duty:50,vol:.045});pulseNote(d,t+.16,.08,88,{duty:50,vol:.045});break;
  case 'beam':pulseNote(d,t,.5,72,{duty:12,vol:.06,slide:24});noiseHit(d,t,.5,{vol:.06,rate:1.5,freq:4000,decay:.2});break;
  case 'zap':for(let i=0;i<5;i++)noiseHit(d,t+i*.06,.05,{vol:.12,short:true,rate:1.4,decay:.02});break;
  case 'fire':noiseHit(d,t,.6,{vol:.1,rate:.25,freq:900,type:'lowpass',decay:.25});break;
  case 'water':for(let i=0;i<5;i++)pulseNote(d,t+i*.07,.06,76+((i*5)%9),{duty:50,vol:.05,slide:6});break;
  case 'swoosh':noiseHit(d,t,.25,{vol:.1,rate:1.2,freq:3500,type:'bandpass',decay:.08});break;
  case 'shake':noiseHit(d,t,.8,{vol:.22,rate:.12,freq:300,type:'lowpass',decay:.3});break;
  case 'explode':noiseHit(d,t,1.1,{vol:.32,rate:.15,decay:.4});break;
  case 'psy':for(let i=0;i<8;i++)pulseNote(d,t+i*.06,.06,70+((i%2)?7:0),{duty:25,vol:.045});break;
  case 'ghost':pulseNote(d,t,.6,62,{duty:12,vol:.06,vib:true});pulseNote(d,t,.6,63,{duty:12,vol:.05});break;
  case 'slide':pulseNote(d,t,.25,50,{duty:50,vol:.05,slide:12});break;
  case 'bump':pulseNote(d,t,.06,40,{duty:50,vol:.08});break;
  case 'run-fail':pulseNote(d,t,.1,60,{duty:50,vol:.06});break;
  case 'exp':for(let i=0;i<4;i++)pulseNote(d,t+i*.04,.035,88+i,{duty:50,vol:.04});break;
 }
}
// Procedural cries: a few pulse sweeps and a noise burst from the character's id.
function cry(id,{faint=false}={}){
 if(!sfxOn())return 0;const a=setup();if(!a)return 0;const r=seededRandom('cry:'+id),t0=a.currentTime+.02,stretch=faint?1.35:1,drop=faint?-5:0;
 const base=50+Math.floor(r()*30),parts=3+Math.floor(r()*3);let t=t0;const duty=[12,25,50][Math.floor(r()*3)];
 for(let i=0;i<parts;i++){const len=(.06+r()*.14)*stretch,slide=Math.round((r()-.5)*24),note=base+Math.round((r()-.4)*12)+drop;pulseNote(sfxBus,t,len,note,{duty,vol:.08,slide});pulseNote(sfxBus,t,len,note+.3+(r()<.4?7:0),{duty:duty===50?25:50,vol:.05,slide});if(r()<.45)noiseHit(sfxBus,t,len,{vol:.06,rate:.3+r(),freq:1500+r()*3000,type:'bandpass',decay:len/2});t+=len*(.8+r()*.3);}
 return t-t0;
}
let alarm=0;
function lowHpAlarm(on){if(on&&!alarm&&sfxOn()){sfx('lowhp');alarm=setInterval(()=>sfx('lowhp'),620);}else if(!on&&alarm){clearInterval(alarm);alarm=0;}}
function stopAll(){stopSong();lowHpAlarm(false);if(A)for(const n of [...live]){try{n.stop(A.currentTime+.02);}catch{}}}
const songPlaying=()=>songId;

Object.assign(exports,{playSong,stopSong,playJingle,sfx,cry,lowHpAlarm,stopAll,songPlaying,SONGS,JINGLES,seq,midi});
