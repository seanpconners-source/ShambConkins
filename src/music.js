// WebAudio band for the generative board score (src/musicGen.js composes; this plays):
// FM electric piano, mallets, flutes, pads, basses and a soft drum kit through a shared
// reverb + tempo echo, with kick ducking for the dance styles and a dirt bus for Horror.
// Also: distorted metal riffs for the level title cards, the string-quartet chord for the
// intro card and the unlock fanfare. src/audio.js owns the AudioContext and settings.
const {METAL}=require("src/data/musicTracks.js");
const {composeSong,styleFor}=require("src/musicGen.js");
const hz=m=>440*2**((m-69)/12);
let cfg={getContext:()=>null,paused:()=>false,pace:()=>1,onTrack:null,scene:()=>null};
let ctx=null,out=null,pulseWave=null,noise=null,impulse=null,bus={},fx=null,sendsOf={},chordTrem=null;
let timer=0,zone='home',song=null,secIdx=0,step=0,plays=0,nextTime=0,holdUntil=0,muted=false,sceneKey='';
const MIX=.45;
function configureMusic(c){Object.assign(cfg,c);}
const level=()=>MIX*(song?.gain||1);
function makeImpulse(a,seconds=1.8,decay=2.8){const n=Math.floor(a.sampleRate*seconds),b=a.createBuffer(2,n,a.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++){const x=i/n;d[i]=(Math.random()*2-1)*Math.pow(1-x,decay)*(i<a.sampleRate*.012?i/(a.sampleRate*.012):1);}}return b;}
function shaperCurve(amount){const n=2048,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=(1+amount)*x/(1+amount*Math.abs(x));}return c;}
function graph(a=cfg.getContext()){
 if(!a)return null;
 if(ctx!==a){ctx=a;
  const comp=a.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=3.5;comp.attack.value=.01;comp.release.value=.2;comp.connect(a.destination);
  out=a.createGain();out.gain.value=MIX;
  const tone=a.createBiquadFilter(),hp=a.createBiquadFilter();tone.type='peaking';tone.frequency.value=3000;tone.Q.value=.7;tone.gain.value=2;hp.type='highpass';hp.frequency.value=38;out.connect(hp);hp.connect(tone);tone.connect(comp);
  const real=new Float32Array(32),imag=new Float32Array(32);for(let n=1;n<32;n++)imag[n]=2*Math.sin(Math.PI*n*.25)/(Math.PI*n);pulseWave=a.createPeriodicWave(real,imag);
  noise=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  impulse=makeImpulse(a);
  const mix=a.createGain();mix.connect(out);
  const verb=a.createConvolver();verb.buffer=impulse;const verbIn=a.createGain(),verbOut=a.createGain();verbOut.gain.value=.8;verbIn.connect(verb);verb.connect(verbOut);verbOut.connect(out);
  const echoIn=a.createGain(),delay=a.createDelay(2),fb=a.createGain(),lp=a.createBiquadFilter(),echoOut=a.createGain();
  delay.delayTime.value=.4;fb.gain.value=.3;lp.type='lowpass';lp.frequency.value=2600;echoOut.gain.value=.7;
  echoIn.connect(delay);delay.connect(lp);lp.connect(fb);fb.connect(delay);lp.connect(echoOut);echoOut.connect(out);
  const duck=a.createGain();duck.connect(mix);
  const dirtIn=a.createGain(),shaper=a.createWaveShaper(),dlp=a.createBiquadFilter(),dirtOut=a.createGain();
  shaper.curve=shaperCurve(18);shaper.oversample='2x';dlp.type='lowpass';dlp.frequency.value=5200;dirtOut.gain.value=.38;dirtIn.connect(shaper);shaper.connect(dlp);dlp.connect(dirtOut);dirtOut.connect(mix);
  const gabIn=a.createGain(),gsh=a.createWaveShaper(),glp=a.createBiquadFilter(),gabOut=a.createGain();
  gsh.curve=shaperCurve(60);glp.type='lowpass';glp.frequency.value=4200;gabOut.gain.value=.34;gabIn.connect(gsh);gsh.connect(glp);glp.connect(gabOut);gabOut.connect(mix);
  // Role buses: pan + one reverb and one echo send each (amounts follow the song's instruments).
  const role=(name,p,dest,v=0,e=0)=>{const g=a.createGain();let o=g;if(a.createStereoPanner&&p){o=a.createStereoPanner();o.pan.value=p;g.connect(o);}o.connect(dest);
   const sv=a.createGain(),se=a.createGain();sv.gain.value=v;se.gain.value=e;g.connect(sv);sv.connect(verbIn);g.connect(se);se.connect(echoIn);sendsOf[name]={v:sv,e:se};return g;};
  bus={mix,duck,dirt:dirtIn,gabber:gabIn,lead:role('lead',.06,mix,.25,.18),chord:role('chord',-.2,duck,.22),arp:role('arp',.28,duck,.25,.15),pad:role('pad',0,duck,.45),bass:mix,perc:role('perc',.12,mix,.1),amb:role('amb',-.1,mix,.3)};
  // Shared tremolo for electric-piano comping (one LFO instead of one per note).
  const lfo=a.createOscillator(),depth=a.createGain();lfo.frequency.value=4.2;depth.gain.value=0;lfo.connect(depth);depth.connect(bus.chord.gain);lfo.start();chordTrem=depth;
  fx={verb:verbIn,echo:echoIn,delay};
 }
 return a;
}
function filter(type,freq,dest,q=.7){const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;f.connect(dest);return f;}
function osc(type,freq,t,stop,dest,detune=0){const o=ctx.createOscillator();if(type==='pulse')o.setPeriodicWave(pulseWave);else o.type=type;o.frequency.value=freq;o.detune.value=detune;o.connect(dest);o.start(t);o.stop(stop);return o;}

// ---- Instruments. o: [type, freq ratio, gain, detune]; f: filter {t,k (x note freq)|hz,q,env,ed};
// fm: {r ratio,i start index,e end index,t time}; click: [ratio,gain,decay]; vib: [rate,cents,delay];
// trem: [rate,depth]; glide: [time, start ratio]; tr: transpose; send/echo: reverb/delay amounts.
const INST={
 epiano:{o:[['sine',1,1]],fm:{r:1,i:1.5,e:.12,t:.6},click:[4,.18,.06],a:.003,d:2.4,s:0,r:.3,vol:0.15,send:.22,trem:[4.2,.12]},
 epianoLead:{o:[['sine',1,1]],fm:{r:1,i:1.7,e:.2,t:.5},click:[4,.22,.05],a:.003,d:2,s:0,r:.3,vol:0.182,send:.25,echo:.16,trem:[4.2,.1]},
 vibes:{o:[['sine',1,1],['sine',4,.06]],click:[4,.25,.07],a:.002,d:2.6,s:0,r:.35,vol:0.168,send:.32,echo:.16,trem:[5.4,.32]},
 marimba:{o:[['sine',1,1],['sine',2,.08]],click:[4,.55,.035],a:.002,d:.5,s:0,r:.1,vol:0.195,send:.16,echo:.1},
 bell:{o:[['sine',1,1]],fm:{r:3.5,i:2.2,e:.15,t:.7},a:.002,d:2,s:0,r:.6,vol:0.119,send:.42,echo:.26},
 celesta:{o:[['sine',1,1],['sine',2,.25]],click:[3,.3,.05],a:.002,d:1,s:0,r:.3,vol:0.14,send:.38,echo:.22,tr:12},
 flute:{o:[['sine',1,1],['triangle',2,.07]],noise:{g:.05,bp:2},a:.06,d:.4,s:.8,r:.16,vol:0.145,send:.32,echo:.2,vib:[5,16,.22]},
 whistle:{o:[['sine',1,1]],noise:{g:.02,bp:3},a:.03,d:.3,s:.85,r:.1,vol:0.109,send:.28,echo:.2,vib:[5.6,24,.15],glide:[.05,.97]},
 steel:{o:[['sine',1,1],['sine',2,.4]],fm:{r:1,i:.9,e:.05,t:.25},click:[3.01,.2,.05],a:.002,d:.9,s:0,r:.2,vol:0.162,send:.26,echo:.18},
 synth:{o:[['sawtooth',1,.5,-7],['sawtooth',1,.5,7]],f:{t:'lowpass',k:4,q:2,env:2,ed:.25},a:.012,d:.3,s:.6,r:.2,vol:0.077,send:.22,echo:.28,vib:[5.5,10,.25],glide:[.04,.985]},
 square:{o:[['pulse',1,.6],['square',1,.3,6]],f:{t:'lowpass',k:5,q:1},a:.005,d:.25,s:.5,r:.1,vol:0.065,send:.18,echo:.22},
 synthPluck:{o:[['sawtooth',1,1]],f:{t:'lowpass',k:2,q:3,env:5,ed:.15},a:.003,d:.4,s:0,r:.1,vol:0.115,send:.22,echo:.3},
 theremin:{o:[['sine',1,1],['triangle',1,.15]],a:.08,d:.3,s:.9,r:.3,vol:0.135,send:.42,echo:.26,vib:[6.4,38,0],glide:[.09,.96]},
 cello:{o:[['sawtooth',1,.5,-5],['sawtooth',1,.5,5]],f:{t:'lowpass',k:3,q:.9},a:.09,d:.4,s:.85,r:.3,vol:0.091,send:.3,vib:[5,14,.25],tr:-12},
 oud:{o:[['sawtooth',1,.6],['triangle',1,.6]],f:{t:'lowpass',k:3,q:2,env:3,ed:.12},a:.003,d:.6,s:0,r:.1,vol:0.126,send:.26,echo:.2,glide:[.03,1.03]},
 koto:{o:[['triangle',1,1],['sine',2,.3]],f:{t:'lowpass',k:4,q:1,env:2,ed:.2},click:[3,.2,.03],a:.002,d:1,s:0,r:.2,vol:0.154,send:.32,echo:.2},
 harpsichord:{o:[['sawtooth',1,.6],['square',2,.2]],f:{t:'lowpass',k:6,q:1,env:1,ed:.1},a:.002,d:.8,s:0,r:.08,vol:0.077,send:.26},
 toypiano:{o:[['sine',1,1],['sine',3.1,.3]],click:[5.3,.2,.02],a:.002,d:.6,s:0,r:.1,vol:0.135,send:.2,echo:.15,tr:12},
 mutedTrumpet:{o:[['sawtooth',1,1]],f:{t:'bandpass',k:2.4,q:1.6},a:.04,d:.3,s:.75,r:.12,vol:0.15,send:.26,echo:.2,vib:[5.5,15,.22]},
 guitar:{o:[['sawtooth',1,.5,-4],['sawtooth',1,.5,4],['square',.5,.15]],f:{t:'lowpass',k:3,q:1.5,env:1,ed:.3},a:.005,d:.9,s:.5,r:.15,vol:0.084,send:.22,echo:.3,vib:[5.5,18,.3]},
 scream:{o:[['sawtooth',1,.55,-15],['sawtooth',1.005,.55,15]],f:{t:'lowpass',hz:3200,q:4},a:.003,d:.1,s:.9,r:.05,vol:.075,dirt:true,echo:.12,vib:[7,40,.05],glide:[.06,.9]},
 brass:{o:[['sawtooth',1,.5,-6],['sawtooth',1,.5,6]],f:{t:'lowpass',k:2.2,q:1,env:2.2,ed:.12},a:.03,d:.3,s:.8,r:.22,vol:.12,send:.3,vib:[5.5,12,.25]},
 // chord / comp voices
 clav:{o:[['pulse',1,1]],f:{t:'lowpass',k:6,q:3,env:2,ed:.05},a:.002,d:.22,s:0,r:.04,vol:0.068},
 harp:{o:[['triangle',1,1],['sine',2,.2]],click:[3,.1,.02],a:.002,d:1.5,s:0,r:.4,vol:0.102,send:.42},
 pluck:{o:[['triangle',1,1],['sawtooth',1,.25]],f:{t:'lowpass',k:5,q:1,env:3,ed:.1},a:.002,d:.5,s:0,r:.1,vol:0.09,send:.2,echo:.08},
 arpSaw:{o:[['sawtooth',1,1]],f:{t:'lowpass',hz:950,q:6,env:2.5,ed:.12},a:.003,d:.25,s:.1,r:.1,vol:0.063,send:.2,echo:.22},
 power:{o:[['sawtooth',1,.6,-10],['sawtooth',1.4983,.45,10]],f:{t:'lowpass',hz:2000,q:1},a:.002,d:.15,s:.7,r:.04,vol:.075,dirt:true},
 // pads
 warm:{o:[['sawtooth',1,.33,-9],['sawtooth',1,.33,9],['sawtooth',.5,.2]],f:{t:'lowpass',hz:1100,q:.5},a:.7,d:1,s:.9,r:1.2,vol:0.036,send:.45},
 choir:{o:[['sawtooth',1,.5,-6],['sawtooth',1,.5,6]],f:{t:'bandpass',hz:900,q:1.2},a:1,d:1,s:.9,r:1.5,vol:0.065,send:.6,vib:[4.5,8,.4]},
 glass:{o:[['sine',1,.6],['triangle',2,.2,6]],a:.5,d:1,s:.9,r:1.2,vol:0.049,send:.5},
 strings:{o:[['sawtooth',1,.5,-7],['sawtooth',1,.5,7]],f:{t:'lowpass',hz:2200,q:.6},a:.45,d:1,s:.9,r:.8,vol:0.042,send:.45,vib:[5,10,.3]},
 // basses
 sub:{o:[['sine',1,1],['triangle',2,.4]],f:{t:'lowpass',hz:900},a:.01,d:.5,s:.8,r:.12,vol:0.088},
 upright:{o:[['sine',1,1],['triangle',1,.5],['sawtooth',1,.12]],f:{t:'lowpass',hz:1100,env:1.2,ed:.1},a:.006,d:.6,s:.2,r:.1,vol:0.098},
 synthBass:{o:[['sawtooth',1,.6],['square',.5,.4]],f:{t:'lowpass',hz:600,q:4,env:2.5,ed:.15},a:.004,d:.25,s:.5,r:.07,vol:0.068},
 slap:{o:[['sawtooth',1,.5],['sine',1,.6]],f:{t:'lowpass',hz:800,q:5,env:4,ed:.07},a:.002,d:.3,s:.4,r:.05,vol:0.081},
 distBass:{o:[['sawtooth',1,1.2]],f:{t:'lowpass',hz:1200,q:2},a:.002,d:.2,s:.9,r:.04,vol:.08,dirt:true}
};
// Play one note of an instrument. dest: a bus node.
function play(name,midi,t,dur,vel=1,dest=bus.lead,sends=null){
 const P=INST[name];if(!P)return;midi+=P.tr||0;
 const f=hz(midi),g=ctx.createGain(),peak=P.vol*vel,a=P.a||.004,d=P.d||.4,s=P.s??0,r=P.r||.15,solo=dest===bus.lead;
 const hold=t+Math.max(a+.01,dur),stop=(s?hold+r*3:Math.min(hold+r*3,t+a+d*1.6))+.05;
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setTargetAtTime(peak*s,t+a,d/3);g.gain.setTargetAtTime(0,hold,r/3);
 let post=g;
 if(P.trem&&solo){const tg=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();tg.gain.value=1-P.trem[1];lfo.frequency.value=P.trem[0];lg.gain.value=P.trem[1];lfo.connect(lg);lg.connect(tg.gain);g.connect(tg);lfo.start(t);lfo.stop(stop);post=tg;}
 post.connect(P.dirt&&bus.dirt?bus.dirt:dest);
 if(sends&&P.send){const sg=ctx.createGain();sg.gain.value=P.send;post.connect(sg);sg.connect(sends.verb);}
 let input=g;
 if(P.f){const fl=ctx.createBiquadFilter(),base=Math.min(16000,P.f.hz||f*P.f.k);fl.type=P.f.t;fl.Q.value=P.f.q||.7;
  if(P.f.env){fl.frequency.setValueAtTime(Math.min(16000,base*(1+P.f.env)),t);fl.frequency.setTargetAtTime(base,t+.004,(P.f.ed||.2)/3);}else fl.frequency.value=base;fl.connect(g);input=fl;}
 const oscs=[];
 for(const [type,ratio,gain=1,det=0] of P.o){const o=ctx.createOscillator();if(type==='pulse')o.setPeriodicWave(pulseWave);else o.type=type;
  const fr=f*ratio;if(P.glide){o.frequency.setValueAtTime(fr*P.glide[1],t);o.frequency.exponentialRampToValueAtTime(fr,t+P.glide[0]);}else o.frequency.value=fr;
  o.detune.value=det;const og=ctx.createGain();og.gain.value=gain;o.connect(og);og.connect(input);o.start(t);o.stop(stop);oscs.push(o);}
 if(P.fm){const m=ctx.createOscillator(),mg=ctx.createGain();m.frequency.value=f*P.fm.r;mg.gain.setValueAtTime(f*P.fm.i,t);mg.gain.setTargetAtTime(f*P.fm.e,t,P.fm.t/3);m.connect(mg);mg.connect(oscs[0].frequency);m.start(t);m.stop(stop);}
 if(P.vib){const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=P.vib[0];lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(0,t+P.vib[2]);lg.gain.linearRampToValueAtTime(P.vib[1],t+P.vib[2]+.18);lfo.connect(lg);for(const o of oscs)lg.connect(o.detune);lfo.start(t);lfo.stop(stop);}
 if(P.click&&(solo||!P.fm)){const c=ctx.createOscillator(),cg=ctx.createGain();c.frequency.value=Math.min(15000,f*P.click[0]);cg.gain.setValueAtTime(peak*P.click[1],t);cg.gain.exponentialRampToValueAtTime(.0001,t+P.click[2]);c.connect(cg);cg.connect(post);c.start(t);c.stop(t+P.click[2]+.02);}
 if(P.noise){const n=ctx.createBufferSource();n.buffer=noise;n.loop=true;const ng=ctx.createGain();ng.gain.value=P.noise.g/P.vol;n.connect(filter('bandpass',Math.min(12000,f*P.noise.bp),ng,1));ng.connect(input);n.start(t,Math.random()*1.5);n.stop(stop);}
}
// ---- Percussion ----
function noiseHit(t,len,vol,type,freq,dest,q=.8,att=0){const n=ctx.createBufferSource();n.buffer=noise;const g=ctx.createGain();n.connect(filter(type,freq,g,q));g.connect(dest);
 if(att){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);}else g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0005,t+att+len);n.start(t,Math.random()*1.5);n.stop(t+att+len+.03);return g;}
function toneHit(t,f0,f1,len,vol,dest,type='sine',sweep=.08){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+sweep);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0005,t+len);o.connect(g);g.connect(dest);o.start(t);o.stop(t+len+.02);return g;}
function send(node,amount){if(!fx||!amount)return;const s=ctx.createGain();s.gain.value=amount;node.connect(s);s.connect(fx.verb);}
function perc(kind,t,vel=1,dest=bus.perc){
 const v=vel;
 switch(kind){
  case 'kick':toneHit(t,120,50,.26,.28*v,bus.mix,'sine',.09);toneHit(t,1400,600,.012,.06*v,bus.mix,'triangle',.01);duckAt(t,.6);break;
  case 'kick808':toneHit(t,150,50,.36,.34*v,bus.mix,'sine',.1);toneHit(t,1800,700,.012,.08*v,bus.mix,'triangle',.01);duckAt(t,.45);break;
  case 'gabber':toneHit(t,280,52,.32,.55*v,bus.gabber,'sine',.06);break;
  case 'snare':send(noiseHit(t,.17,.16*v,'bandpass',1900,dest),.15);toneHit(t,200,170,.08,.06*v,dest,'triangle',.05);break;
  case 'snareBig':send(noiseHit(t,.32,.2*v,'bandpass',1500,dest,.7),.55);toneHit(t,210,160,.12,.09*v,dest,'triangle',.08);break;
  case 'snareHard':noiseHit(t,.16,.26*v,'bandpass',2200,bus.dirt,.6);toneHit(t,240,180,.08,.1*v,dest,'triangle',.04);break;
  case 'clap':for(const [o,l] of [[0,.02],[.011,.02],[.022,.16]])send(noiseHit(t+o,l,.14*v,'bandpass',1250,dest,1.1),.3);break;
  case 'rim':toneHit(t,1750,1600,.035,.06*v,dest,'triangle',.02);noiseHit(t,.02,.05*v,'highpass',3000,dest);break;
  case 'brush':noiseHit(t,.24,.08*v,'lowpass',5200,dest,.5,.025);break;
  case 'hat':noiseHit(t,.035,.06*v,'highpass',7800,dest);break;
  case 'ohat':noiseHit(t,.22,.05*v,'highpass',7000,dest);break;
  case 'ride':noiseHit(t,.45,.04*v,'highpass',5200,dest);toneHit(t,3150,3150,.5,.008*v,dest,'sine',.01);toneHit(t,4730,4730,.35,.005*v,dest,'sine',.01);break;
  case 'shaker':noiseHit(t,.06,.065*v,'bandpass',6200,dest,1.1,.012);break;
  case 'sleigh':for(let i=0;i<3;i++)noiseHit(t+i*.018,.05,.025*v,'bandpass',9200,dest,3);break;
  case 'congaHi':toneHit(t,380,330,.18,.12*v,dest,'sine',.03);break;
  case 'congaLo':toneHit(t,250,215,.22,.13*v,dest,'sine',.03);break;
  case 'tom':toneHit(t,150,105,.32,.18*v,dest,'sine',.12);break;
  case 'crash':send(noiseHit(t,1.5,.05*v,'highpass',4200,dest,.7),.3);break;
  case 'timpani':toneHit(t,98,92,1.3,.26*v,bus.mix,'sine',.3);noiseHit(t,.08,.06*v,'lowpass',400,bus.mix);break;
 }
}
function duckAt(t,depth){if(!song?.duck||!bus.duck)return;const g=bus.duck.gain;g.setValueAtTime(1,t);g.linearRampToValueAtTime(1-depth*.75,t+.008);g.setTargetAtTime(1,t+.03,.09);}
// ---- Grooves (one char per sixteenth; x = hit, o = ghost) ----
const KITS={
 boombap:{kick:'kick',snare:'snare',full:{k:'x......x..x.....',s:'....x.......x...',h:'x.o.x.o.x.o.x.oo'},light:{h:'x.o.x.o.x.o.x.o.'}},
 brush:{kick:'kick',snare:'brush',full:{k:'o.......o.......',s:'....x.......x...',r:'x...x.x.x...x.x.',c:'x..x..x...x..x..'},light:{r:'x...x.x.x...x.x.'}},
 disco:{kick:'kick808',snare:'clap',full:{k:'x...x...x...x...',s:'....x.......x...',h:'o.o.o.o.o.o.o.o.',O:'..x...x...x...x.'},light:{k:'x...x...x...x...',O:'..x...x...x...x.'}},
 downtempo:{kick:'kick',snare:'rim',full:{k:'x.........x.....',s:'........x.......',p:'o.o.o.o.o.o.o.o.'},light:{p:'o...o...o...o...'}},
 synthwave:{kick:'kick808',snare:'snareBig',full:{k:'x.......x.......',s:'....x.......x...',h:'x.o.x.o.x.o.x.o.'},light:{h:'x.o.x.o.x.o.x.o.'}},
 hardcore:{kick:'gabber',snare:'snareHard',full:{k:'x...x...x...x...',s:'....x.......x...',O:'..x...x...x...x.',h:'.x.x.x.x.x.x.x.x'},light:{k:'x...x...x...x...',O:'..x...x...x...x.'}},
 pop:{kick:'kick',snare:'clap',full:{k:'x.....x...x.....',s:'....x.......x...',p:'xoxoxoxoxoxoxoxo'},light:{p:'x.o.x.o.x.o.x.o.'}},
 swing:{kick:'kick',snare:'brush',full:{k:'o...o...o...o...',r:'x...x.x.x...x.x.',h:'....x.......x...',s:'..........o....o'},light:{r:'x...x.x.x...x.x.',h:'....x.......x...'}},
 calypso:{kick:'kick',snare:'rim',full:{k:'x...x...x...x...',s:'...x..x....x..x.',p:'xoxoxoxoxoxoxoxo',t:'..x.xo....x.xo..'},light:{p:'x.o.x.o.x.o.x.o.'}},
 march:{kick:'kick',snare:'snare',full:{k:'x.......x.......',t:'x..x..x.x..x..x.',s:'....o.......o.oo',p:'.o.o.o.o.o.o.o.o'},light:{t:'x..x..x.x..x..x.'}},
 breakbeat:{kick:'kick808',snare:'snare',full:{k:'x.x.......x.....',s:'....x..o.o..x..o',h:'x.x.x.x.x.x.x.xx'},light:{h:'x.x.x.x.x.x.x.x.'}}
};
const FILL={s:'....x...x.x.xxxx'},HC_FILL='....x.xx.xxxxxxx';
const LANE={h:'hat',O:'ohat',r:'ride',p:'shaker',c:'rim',t:'tom'};
const EXTRA={congas:{t:'x..o..x.x.o.x...'},shaker:{p:'xoxoxoxoxoxoxoxo'},sleigh:{p:'x.x.x.x.x.x.x.x.'}};
// ---- Comping (positions within the bar -> length in sixteenths) ----
const HITS={lofi:{0:10,10:5},bossa:{0:3,6:2,10:3,13:3},stabs:{2:1,6:1,10:1,13:1,14:1},bounce:{2:1,6:1,10:1,14:1},
 strum:{0:2,3:2,6:2,8:2,11:2,14:2},charleston:{0:2,6:3},calypso:{2:1,5:1,7:1,10:1,13:1,15:1}};
const BASSLINE={lofi:{0:[0,6,1],7:[0,2,.6],10:[-5,4,.75]},funk:{0:[0,2,1],3:[0,1,.7],4:[12,1,.8],6:[0,2,.9],8:[0,1,1],10:[12,1,.8],11:[0,1,.6],14:[7,1,.7]},
 bounce:{0:[0,2,1],4:[7,1,.7],8:[0,2,1],12:[7,1,.7]},calypso:{0:[0,3,1],3:[0,1,.7],4:[7,2,.8],8:[0,3,1],11:[0,1,.7],12:[7,2,.8]}};
function playStep(sg,sec,s,t,sd){
 const pos=s%16,bar=Math.floor(s/16),ci=Math.floor(s/sg.cs)%sec.prog.length,cstep=s%sg.cs,ch=sec.prog[ci],vc=sec.voicings[ci],light=sec.drums==='light';
 const rootPc=(sg.key+ch.root)%12,bassRoot=36+rootPc;
 // comping
 const H=HITS[sg.comp];
 if(H&&H[pos]!==undefined){const len=H[pos],top=sg.comp==='stabs'?vc.slice(-3):vc;
  top.slice(-4).forEach((m,i)=>play(sg.chordInst,m,t+(sg.comp==='strum'?i*.012:0),len*sd*.9,(pos%4===0?.9:.65)*(light&&sg.comp!=='lofi'?.75:1),bus.chord));}
 else if(sg.comp==='arpUp'&&s%2===0){const i=(s/2)%(vc.length*2);play(sg.chordInst,vc[i%vc.length]+12*Math.floor(i/vc.length),t,sd*3,i===0?.9:.7,bus.arp);}
 else if(sg.comp==='arp16'){const seq=[0,1,2,3,2,1,0,2],n=vc.length,m=vc[seq[pos%8]%n]+12;play(sg.chordInst,m,t,sd*.9,pos%4===0?1:.7,bus.arp);}
 else if(sg.comp==='chug'){const pat='xx.x.xx.x.x.xx.x';if(pat[pos]==='x'&&!light)play('power',36+12+rootPc-(rootPc>6?12:0),t,sd*.85,pos%4===0?1:.8,bus.chord);}
 else if(sg.comp==='noir'&&cstep===0){vc.forEach(m=>play(sg.chordInst,m,t,sg.cs*sd*.8,.55,bus.chord));}
 // pad
 if(sg.pad&&cstep===0)vc.slice(-4).forEach(m=>play(sg.pad,m,t,sg.cs*sd,sec.thin?.8:1,bus.pad));
 // bass
 const bl=BASSLINE[sg.bass];let b=null;
 if(bl)b=bl[pos];
 else if(sg.bass==='walk'&&pos%4===0){const nx=sec.prog[(ci+1)%sec.prog.length],q=pos/4,nextPc=(sg.key+nx.root)%12;
  b=q===0?[0,3.6,1]:q===1?[ch.tones[1],3.6,.8]:q===2?[ch.tones[2]%12,3.6,.85]:[((nextPc-rootPc+12)%12||12)-1,3.6,.75];}
 else if(sg.bass==='sustain'&&cstep===0)b=[0,sg.cs*.95,1];
 else if(sg.bass==='pulse8'&&pos%2===0)b=[pos===14?12:0,1.8,pos%4===0?1:.75];
 else if(sg.bass==='octave'&&pos%2===0)b=[(pos/2)%2?12:0,1.5,(pos/2)%2?.75:1];
 else if(sg.bass==='gabber'&&pos%4!==0)b=[pos%4===2?0:12,1,pos%4===2?1:.6];
 if(b&&!(sec.name==='intro'&&sg.hardcore))play(sg.bassInst,bassRoot+b[0],t,b[1]*sd,b[2],bus.bass);
 // drums
 const kit=KITS[sg.kit];
 if(kit){const lanes=light?kit.light:kit.full,fillBar=!light&&bar===sec.bars-1;
  for(const [lane,pat] of Object.entries(lanes)){let p=pat;if(lane==='s'&&fillBar)p=sg.hardcore?HC_FILL:FILL.s;const c=p[pos%p.length];if(c!=='x'&&c!=='o')continue;
   const vel=c==='x'?1:.5,kind=lane==='k'?kit.kick:lane==='s'?kit.snare:lane==='t'&&sg.kit==='calypso'?(pos%4===2?'congaHi':'congaLo'):LANE[lane];
   perc(kind,t,vel*(lane==='s'&&fillBar?.55+pos/32:1));}
  if(fillBar&&sg.hardcore&&pos>=12)perc('snareHard',t+sd/2,.6+pos/40);
  if(pos===0&&bar===0&&!light&&sec.name!=='A')perc('crash',t,.8);
  if(sg.perc&&!light){const ex=EXTRA[sg.perc];for(const [lane,pat] of Object.entries(ex)){const c=pat[pos];if(c==='x'||c==='o'){const kind=sg.perc==='congas'?(pos%3?'congaLo':'congaHi'):sg.perc==='sleigh'?'sleigh':'shaker';perc(kind,t,c==='x'?.8:.45);}}}
 }
 // lead
 if(!sec.noLead)for(const e of sec.leadAt?.[s]||[]){let m=e.midi;
  if(sg.hardcore&&Math.random()<.15)m+=12;
  play(sg.lead,m,t+(Math.random()-.5)*.008,e.dur*sd*.94,e.vel*(sec.thin?.75:1)*(sec.lift?1.08:1),bus.lead);}
 // ambience
 ambience(sg,sec,s,pos,bar,t,sd,vc);
}
function noiseBed(t,len,vol,type,freq,q,shape='flat',sweep=null){
 const n=ctx.createBufferSource();n.buffer=noise;n.loop=true;const g=ctx.createGain(),f=filter(type,freq,g,q);n.connect(f);g.connect(bus.amb);
 if(sweep){f.frequency.setValueAtTime(sweep[0],t);f.frequency.linearRampToValueAtTime(sweep[1],t+len*.5);f.frequency.linearRampToValueAtTime(sweep[2],t+len);}
 g.gain.setValueAtTime(0,t);if(shape==='swell'){g.gain.linearRampToValueAtTime(vol,t+len*.45);g.gain.linearRampToValueAtTime(0,t+len);}else{g.gain.linearRampToValueAtTime(vol,t+.25);g.gain.setValueAtTime(vol,t+len-.05);g.gain.linearRampToValueAtTime(0,t+len+.25);}
 n.start(t,Math.random()*1.5);n.stop(t+len+.3);
}
function ambience(sg,sec,s,pos,bar,t,sd,vc){
 const A=sg.amb,barLen=16*sd;if(!A)return;
 if(A==='vinyl'){if(pos===0)noiseBed(t,barLen,.006,'highpass',4500,.5);if(Math.random()<.09)noiseHit(t+Math.random()*sd,.004,.03+Math.random()*.05,'highpass',2500,bus.amb);}
 else if(A==='rain'&&pos===0)noiseBed(t,barLen,.018,'bandpass',2600,.4);
 else if(A==='waves'&&pos===0&&bar%2===0)noiseBed(t,barLen*2,.05,'lowpass',850,.5,'swell');
 else if(A==='wind'&&pos===0&&bar%2===0)noiseBed(t,barLen*2,.02,'bandpass',600,3,'swell',[420,900,500]);
 else if(A==='rumble'&&pos===0&&bar%2===0)noiseBed(t,barLen*2,.06,'lowpass',150,.7,'swell');
 else if(A==='birds'&&pos===0&&Math.random()<.4){const at=t+Math.random()*barLen*.7,n=2+Math.floor(Math.random()*3),base=2500+Math.random()*900;
  for(let i=0;i<n;i++){const g=toneHit(at+i*.09,base,base*1.35,.06,.016,bus.amb,'sine',.05);send(g,.4);}}
 else if(A==='shimmer'&&pos===0&&bar%2===1)play('bell',vc[Math.floor(Math.random()*vc.length)]+24,t+sd*2,sd*8,.3,bus.amb);
 else if(A==='bits'&&Math.random()<.05)toneHit(t,2000+Math.floor(Math.random()*4)*500,2000,.03,.012,bus.amb,'square',.001);
 else if(A==='siren'&&pos===0&&bar%4===2){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(500,t);o.frequency.linearRampToValueAtTime(1100,t+barLen);o.frequency.linearRampToValueAtTime(450,t+barLen*2);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+barLen*.5);g.gain.linearRampToValueAtTime(0,t+barLen*2);o.connect(filter('lowpass',2400,g));g.connect(bus.dirt);o.start(t);o.stop(t+barLen*2+.05);}
}
// ---- Sequencer ----
function prepare(sg){for(const sec of sg.sections){sec.leadAt={};for(const e of sec.lead)(sec.leadAt[e.at]||=[]).push(e);if(sec.name==='intro')sec.noLead=true;}return sg;}
function sceneNow(){try{return cfg.scene?.()||null;}catch{return null;}}
function startSong(skipIntro=false){
 const sc=styleFor(zone)==='home'?null:sceneNow(),sg=prepare(composeSong(zone,sc?.biome,sc?.place,0));
 const named=song?.name!==sg.name||song?.by!==sg.by;song=sg;sceneKey=`${zone}|${sc?.biome||''}`;secIdx=skipIntro?1:0;step=0;plays=0;
 if(fx)fx.delay.delayTime.setValueAtTime(Math.min(1.5,60/sg.bpm*.75),ctx.currentTime);
 const setSend=(r,inst)=>{const P=INST[inst]||{},S=sendsOf[r];if(!S)return;S.v.gain.setValueAtTime(P.send||0,ctx.currentTime);S.e.gain.setValueAtTime(P.echo||0,ctx.currentTime);};
 setSend('lead',sg.lead);setSend('chord',sg.chordInst);setSend('arp',sg.chordInst);if(sg.pad)setSend('pad',sg.pad);
 const tr=INST[sg.chordInst]?.trem;if(chordTrem){chordTrem.gain.setValueAtTime(tr?tr[1]:0,ctx.currentTime);bus.chord.gain.setValueAtTime(tr?1-tr[1]:1,ctx.currentTime);}
 if(named)cfg.onTrack?.(sg,zone);
}
function advance(){
 const sec=song.sections[secIdx];step++;
 if(step%16===0){
  // Follow the current player's surroundings at bar lines; same style keeps the groove going.
  if(styleFor(zone)!=='home'){const sc=sceneNow(),key=`${zone}|${sc?.biome||''}`;if(key!==sceneKey){startSong(true);return;}}
  if(step>=sec.bars*16){step=0;secIdx++;if(secIdx>=song.sections.length){secIdx=1;plays++;
   if(plays>=2){const sg=prepare(composeSong(zone,song.biome,song.place,song.variation+1));song=sg;plays=0;}}}
 }
}
function tick(){
 const a=graph();if(!a)return;
 if(cfg.paused()||a.currentTime<holdUntil){if(!muted){muted=true;out.gain.cancelScheduledValues(a.currentTime);out.gain.setTargetAtTime(0,a.currentTime,.05);}nextTime=Math.max(a.currentTime+.05,holdUntil);return;}
 if(!song)startSong();
 if(muted){muted=false;out.gain.cancelScheduledValues(a.currentTime);out.gain.setTargetAtTime(level(),a.currentTime,.25);}
 if(nextTime<a.currentTime)nextTime=a.currentTime+.05;
 while(nextTime<a.currentTime+.18){
  const pace=Math.min(1.12,Math.max(.92,+cfg.pace()||1)),sd=60/(song.bpm*pace)/4,sec=song.sections[secIdx];
  const lag=(step%2?song.swing*sd:0)+(step%4===2?song.swing8*sd:0);
  try{playStep(song,sec,step,nextTime+lag,sd);}catch{}
  nextTime+=sd;advance();
 }
}
function startSequencer(){if(timer)return;const a=graph();if(!a)return;nextTime=a.currentTime+.1;muted=true;out.gain.value=0;timer=setInterval(tick,30);tick();}
function stopSequencer(){clearInterval(timer);timer=0;if(ctx&&out){out.gain.cancelScheduledValues(ctx.currentTime);out.gain.setTargetAtTime(0,ctx.currentTime,.04);}muted=true;}
// zone: home | mind | body | spirit | horror | upside-down | warp-<board id>
function setSequencerZone(z){z=String(z||'mind');if(z===zone&&song)return;zone=z;song=null;if(timer&&ctx){out.gain.cancelScheduledValues(ctx.currentTime);out.gain.setTargetAtTime(0,ctx.currentTime,.06);muted=true;nextTime=ctx.currentTime+.25;}}
// Pause background music for `seconds` (title cards, intro card, fanfare).
function holdMusicFor(seconds){const a=ctx||graph();if(a)holdUntil=Math.max(holdUntil,a.currentTime+seconds);}
function releaseHold(){holdUntil=0;}
const nowPlaying=()=>song?{id:song.id,name:song.name,by:song.by,zone,biome:song.biome,section:song.sections[secIdx]?.name}:null;

// ---- Unlock fanfare: a short brass "ta-da" with timpani, glockenspiel and cymbal ----
function playFanfare(a){
 a=graph(a);if(!a)return 0;
 const t0=a.currentTime+.04,fan=a.createGain();fan.gain.value=.9;fan.connect(a.destination);
 const verb=a.createConvolver();verb.buffer=impulse;const vg=a.createGain();vg.gain.value=.55;verb.connect(vg);vg.connect(fan);
 const sends={verb,echo:null},keep=bus;bus={...bus,perc:fan,mix:fan,lead:null};
 try{
  const lead=[[0,67,.12],[.13,72,.12],[.26,76,.12],[.39,79,.34],[.78,76,.13],[.93,84,1.05]],harm=[[0,64],[.13,67],[.26,72],[.39,76],[.78,72],[.93,79]];
  lead.forEach(([o,m,d])=>play('brass',m,t0+o,d,1,fan,sends));
  harm.forEach(([o,m],i)=>play('brass',m,t0+o,lead[i][2],.7,fan,sends));
  for(const m of [48,55,60,64])play('brass',m,t0+.93,1.05,.75,fan,sends);
  [84,88,91,96].forEach((m,i)=>play('bell',m,t0+.93+i*.06,.6,.55,fan,sends));
  perc('timpani',t0+.39,.7,fan);perc('timpani',t0+.93,1,fan);perc('crash',t0+.93,1.1,fan);
  for(let i=0;i<6;i++)perc('snare',t0+.66+i*.045,.25+i*.08,fan);
 }finally{bus=keep;}
 const total=2.6;holdMusicFor(total);setTimeout(()=>{try{fan.disconnect();}catch{}},5000);
 return total;
}
// Test helper: render `seconds` of a scene into an OfflineAudioContext, scheduling a little
// ahead at a time like the live player. Resolves {buffer, info}.
async function renderSceneInto(a,z,biome,seconds,place=''){
 const keep={getContext:cfg.getContext,scene:cfg.scene,onTrack:cfg.onTrack};cfg.getContext=()=>a;cfg.scene=()=>({biome,place});cfg.onTrack=null;
 const kz=zone,ks=song,ki=secIdx,kst=step;let t=.05,info=null;
 const fill=until=>{while(t<until){const sd=60/song.bpm/4,sec=song.sections[secIdx];playStep(song,sec,step,t+(step%2?song.swing*sd:0)+(step%4===2?song.swing8*sd:0),sd);t+=sd;advance();}info=nowPlaying();};
 try{graph();zone=z;song=null;startSong();out.gain.value=level();fill(.6);
  for(let T=.25;T<seconds-.3;T+=.25){const at=T;a.suspend(at).then(()=>{fill(Math.min(seconds-.1,at+.6));a.resume();});}
  const buffer=await a.startRendering();return {buffer,info};
 }finally{cfg.getContext=keep.getContext;cfg.scene=keep.scene;cfg.onTrack=keep.onTrack;zone=kz;song=ks;secIdx=ki;step=kst;ctx=null;}
}
// Metal-riff drums (title cards).
function drum(kind,t,vol,dest){
 const g=ctx.createGain();g.connect(dest);
 if(kind==='k'){const o=ctx.createOscillator();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.connect(g);o.start(t);o.stop(t+.3);return;}
 const n=ctx.createBufferSource();n.buffer=noise;n.playbackRate.value=.8+Math.random()*.4;
 const len={s:.16,h:.04,o:.2,c:1.4}[kind]||.1;
 n.connect(filter(kind==='s'?'bandpass':'highpass',kind==='s'?1800:kind==='c'?4200:7000,g,kind==='s'?.8:.7));
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+len);n.start(t,Math.random()*.5);n.stop(t+len+.02);
 if(kind==='s'){const g2=ctx.createGain();g2.connect(dest);g2.gain.setValueAtTime(vol*.6,t);g2.gain.exponentialRampToValueAtTime(.001,t+.08);osc('triangle',190,t,t+.1,g2);}
}

// ---- Metal riff for the title cards ----
let metalBus=null;
function distortion(amount=80){const s=ctx.createWaveShaper(),n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=(3+amount)*x*20*Math.PI/180/(Math.PI+amount*Math.abs(x));}s.curve=c;s.oversample='2x';return s;}
function stopMetal(){if(!metalBus||!ctx)return;const b=metalBus;metalBus=null;b.gain.cancelScheduledValues(ctx.currentTime);b.gain.setTargetAtTime(0,ctx.currentTime,.05);setTimeout(()=>{try{b.disconnect();}catch{}},400);releaseHold();}
// Returns the riff's length in seconds (0 if audio is unavailable).
function playMetalRiff(kind='mind'){
 const a=graph();if(!a)return 0;stopMetal();
 const r=METAL[String(kind).startsWith('warp')?'warp':kind]||METAL.mind,sd=60/r.bpm/4,t0=a.currentTime+.05;
 const bus=metalBus=a.createGain();bus.gain.value=.42;bus.connect(a.destination);
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
 for(const [notes,start,dur] of chords)for(const m of notes){const g=a.createGain();g.connect(bus);const st=t+start;g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(.055,st+.35);g.gain.setTargetAtTime(0,st+dur,.4);
  const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=5+Math.random();lg.gain.value=hz(m)*.006;lfo.connect(lg);
  const lp=filter('lowpass',1500,g);for(const d of [-6,6]){const o=a.createOscillator();o.type='sawtooth';o.frequency.value=hz(m);o.detune.value=d;lg.connect(o.frequency);o.connect(lp);o.start(st);o.stop(st+dur+2);}lfo.start(st);lfo.stop(st+dur+2);}
 setTimeout(()=>{try{bus.disconnect();}catch{}},8000);
}
Object.assign(exports,{renderSceneInto,configureMusic,startSequencer,stopSequencer,setSequencerZone,holdMusicFor,releaseHold,nowPlaying,playMetalRiff,stopMetal,playQuartet,playFanfare,INST});
