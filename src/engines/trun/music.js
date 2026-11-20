// Temple Run (Boulder Run revamp): an original jungle drum groove made in WebAudio (no recordings): low/high toms,
// bongos, shaker, wood block, a low drone and a pan-flute phrase on a minor pentatonic. Layers join as the run gets
// faster (setLevel 0..3). Honours the Music setting; stop() on exit, hold(true) while paused.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");

const BPM=118,STEP=60/BPM/4;// 16th notes
// patterns, 16 steps: 1 = hit, numbers > 1 = accent
const PAT={
 lowTom:  [2,0,0,0, 0,0,1,0, 2,0,0,0, 0,0,1,0],
 highTom: [0,0,0,0, 2,0,0,0, 0,0,0,1, 2,0,0,0],
 bongo:   [0,1,0,1, 0,0,1,0, 0,1,0,1, 0,1,1,0],
 shaker:  [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1],
 block:   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1],
 roll:    [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,1,1]};
// per zone: root, scale, flute vibrato (temple D minor pentatonic, mines low B, tomb E 'Egyptian' scale, valley G)
// zone order as in track.js ZONES: temple, jungle (A, drums up front), mines, catacombs (low C# Phrygian), tomb, bridge (F# minor), valley
const ZK=[{root:146.83,scale:[0,3,5,7,10,12,15],vib:.012,anvil:0},{root:110,scale:[0,2,3,7,9,12,14],vib:.02,anvil:0},{root:123.47,scale:[0,3,5,6,7,10,12],vib:.008,anvil:1},
 {root:138.59,scale:[0,1,3,5,7,8,12],vib:.006,anvil:0},{root:164.81,scale:[0,1,4,5,7,8,12],vib:.03,anvil:0},{root:185,scale:[0,2,3,5,7,8,12],vib:.018,anvil:1},{root:196,scale:[0,2,4,7,9,12,14],vib:.014,anvil:0}];
let SCALE=ZK[0].scale,ROOT=ZK[0].root,VIB=ZK[0].vib,ANVIL=0;
// original flute phrases (scale degrees, -1 = rest), 16 steps each
const PHRASES=[[4,-1,3,-1,2,-1,-1,-1,1,-1,2,-1,0,-1,-1,-1],[2,-1,4,-1,5,-1,4,3,2,-1,-1,-1,-1,-1,-1,-1],[5,-1,4,-1,2,-1,3,-1,4,-1,-1,-1,2,-1,1,-1],[0,-1,2,-1,3,-1,4,-1,6,-1,5,-1,4,-1,-1,-1]];

function makeMusic(){SCALE=ZK[0].scale;ROOT=ZK[0].root;VIB=ZK[0].vib;ANVIL=0;
 let a=null,bus=null,timer=null,step=0,next=0,level=0,held=false,noise=null,drone=null;
 const on=()=>!!store.profile?.settings.music;
 function ensure(){if(a)return true;if(!on())return false;a=audioContext();if(!a)return false;bus=a.createGain();bus.gain.value=.55;
  const comp=a.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;bus.connect(comp);comp.connect(a.destination);
  noise=a.createBuffer(1,a.sampleRate,a.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return true;}
 function tom(t,f0,f1,vol,dur){const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+.05);
  // skin slap
  const s=a.createBufferSource(),f=a.createBiquadFilter(),g2=a.createGain();s.buffer=noise;f.type='bandpass';f.frequency.value=f0*6;f.Q.value=1.2;g2.gain.setValueAtTime(vol*.35,t);g2.gain.exponentialRampToValueAtTime(.0001,t+.04);s.connect(f);f.connect(g2);g2.connect(bus);s.start(t,Math.random()*.5);s.stop(t+.06);}
 function hiss(t,vol,dur,freq){const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=noise;f.type='highpass';f.frequency.value=freq;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(bus);s.start(t,Math.random()*.5);s.stop(t+dur+.02);}
 function click(t,f,vol){const o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.06);o.connect(g);g.connect(bus);o.start(t);o.stop(t+.08);}
 function flute(t,deg,dur){const f=ROOT*2*Math.pow(2,SCALE[deg]/12),o=a.createOscillator(),o2=a.createOscillator(),g=a.createGain(),lp=a.createBiquadFilter(),vib=a.createOscillator(),vg=a.createGain();
  o.type='sine';o2.type='triangle';o.frequency.value=f;o2.frequency.value=f*2;vib.frequency.value=5.5;vg.gain.value=f*VIB;vib.connect(vg);vg.connect(o.frequency);
  lp.type='lowpass';lp.frequency.value=2600;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.06,t+.06);g.gain.setValueAtTime(.05,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  const g2=a.createGain();g2.gain.value=.25;o.connect(g);o2.connect(g2);g2.connect(g);g.connect(lp);lp.connect(bus);
  // breath
  hiss(t,.012,dur*.5,3000);for(const x of [o,o2,vib]){x.start(t);x.stop(t+dur+.05);}}
 function startDrone(){if(drone)return;const t=a.currentTime,g=a.createGain(),lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=320;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.05,t+2);
  const os=[ROOT/2,ROOT/2*1.5,ROOT/2*1.003].map(f=>{const o=a.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(lp);o.start();return o;});lp.connect(g);g.connect(bus);drone={g,os};}
 function stopDrone(){if(!drone)return;const t=a.currentTime;drone.g.gain.cancelScheduledValues(t);drone.g.gain.setValueAtTime(drone.g.gain.value,t);drone.g.gain.linearRampToValueAtTime(.0001,t+.4);for(const o of drone.os)o.stop(t+.5);drone=null;}
 function schedule(){if(held||!a)return;const ahead=a.currentTime+.25;
  while(next<ahead){const i=step%16,bar=Math.floor(step/16),t=next;
   if(PAT.lowTom[i])tom(t,95,48,.42*PAT.lowTom[i]/2+.12,.38);
   if(PAT.highTom[i]&&level>=0)tom(t,170,105,.26*PAT.highTom[i]/2+.06,.26);
   if(PAT.shaker[i])hiss(t,(i%4===0?.05:.028)*(level>=1?1:.6),.05,6000);
   if(level>=1&&PAT.bongo[i])tom(t,(i%2?330:270),(i%2?250:210),.14,.12);
   if(level>=2&&PAT.block[i])click(t,950,.08);
   if(ANVIL&&level>=1&&(i===4||i===12))click(t,2100,.05);
   if(level>=3&&bar%4===3&&PAT.roll[i])tom(t,190,120,.2,.12);
   if(level>=2&&i===0&&bar%4===0){const ph=PHRASES[(bar/4|0)%PHRASES.length];ph.forEach((d,k)=>{if(d>=0)flute(t+k*STEP,d,STEP*(ph[k+1]===-1?2:1)*1.05);});}
   step++;next+=STEP;}}
 return {
  start(){if(!ensure())return;if(timer)return;step=0;next=a.currentTime+.08;startDrone();timer=setInterval(schedule,60);schedule();},
  setLevel(l){level=Math.max(0,Math.min(3,l|0));},
  // a new zone: new key and colour; the drone follows the new root
  setZone(z){const k=ZK[((z|0)%ZK.length+ZK.length)%ZK.length];SCALE=k.scale;ROOT=k.root;VIB=k.vib;ANVIL=k.anvil;if(a&&drone){stopDrone();startDrone();}},
  hold(h){if(!a)return;held=!!h;if(held){if(drone)drone.g.gain.setTargetAtTime(.0001,a.currentTime,.1);}else{if(drone)drone.g.gain.setTargetAtTime(.05,a.currentTime,.2);next=Math.max(next,a.currentTime+.05);}},
  stop(){if(timer){clearInterval(timer);timer=null;}if(a)stopDrone();}};}

Object.assign(exports,{makeMusic});
