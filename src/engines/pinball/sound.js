// Pinball sounds, all synthesized: solenoid clacks (flippers, pops, slings, kickers, knocker), switch ticks, the
// rolling-ball rumble, and short original game jingles. Follows the game's Sound setting.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
let noise=null,roll=null;
function ctx(){if(!store.profile?.settings?.sound)return null;const a=audioContext();if(!a)return null;if(!noise){noise=a.createBuffer(1,a.sampleRate,a.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}return a;}
function out(a,vol){const g=a.createGain();g.gain.value=vol;g.connect(a.destination);return g;}
// Filtered noise burst.
function burst(a,dest,{t=0,dur=.04,f=1500,q=1,type='bandpass',vol=.5}={}){const s=a.createBufferSource();s.buffer=noise;const bq=a.createBiquadFilter();bq.type=type;bq.frequency.value=f;bq.Q.value=q;const g=a.createGain(),t0=a.currentTime+t;g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.001,t0+dur);s.connect(bq).connect(g).connect(dest);s.start(t0,Math.random()*.5,dur+.02);}
// Pitched blip with a downward sweep.
function blip(a,dest,{t=0,f=200,f2=f*.5,dur=.08,type='sine',vol=.5}={}){const o=a.createOscillator(),g=a.createGain(),t0=a.currentTime+t;o.type=type;o.frequency.setValueAtTime(f,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t0+dur);g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.001,t0+dur);o.connect(g).connect(dest);o.start(t0);o.stop(t0+dur+.02);}
function notes(a,dest,seq,{type='square',vol=.12,step=.09}={}){seq.forEach((n,i)=>{if(n==null)return;const f=440*2**((n-69)/12);blip(a,dest,{t:i*step,f,f2:f*.995,dur:step*1.6,type,vol});});}
const S={
 flip:a=>{const d=out(a,.5);burst(a,d,{dur:.03,f:2200,q:.8,vol:.6});blip(a,d,{f:110,f2:60,dur:.06,vol:.7});},
 flipDown:a=>{const d=out(a,.25);burst(a,d,{dur:.025,f:1400,q:.8,vol:.4});},
 bumper:a=>{const d=out(a,.55);burst(a,d,{dur:.05,f:900,q:.7,vol:.8});blip(a,d,{f:180,f2:70,dur:.12,type:'triangle',vol:.8});blip(a,d,{t:.01,f:1320,f2:1300,dur:.12,vol:.12});},
 sling:a=>{const d=out(a,.45);burst(a,d,{dur:.04,f:1800,q:.6,vol:.7});blip(a,d,{f:240,f2:90,dur:.07,vol:.6});},
 drop:a=>{const d=out(a,.45);blip(a,d,{f:320,f2:140,dur:.07,vol:.7});burst(a,d,{dur:.03,f:600,type:'lowpass',vol:.5});},
 standup:a=>{const d=out(a,.35);blip(a,d,{f:1500,f2:1200,dur:.03,vol:.5});burst(a,d,{dur:.02,f:3000,vol:.3});},
 rollover:a=>{const d=out(a,.25);blip(a,d,{f:1568,f2:1560,dur:.18,vol:.4});blip(a,d,{t:.05,f:2093,f2:2090,dur:.2,vol:.25});},
 spin:a=>{const d=out(a,.2);burst(a,d,{dur:.012,f:3500,q:2,vol:.6});blip(a,d,{f:880+Math.random()*80,f2:870,dur:.03,type:'square',vol:.12});},
 hole:a=>{const d=out(a,.5);blip(a,d,{f:90,f2:45,dur:.18,vol:.9});burst(a,d,{dur:.08,f:400,type:'lowpass',vol:.6});},
 eject:a=>{const d=out(a,.5);burst(a,d,{dur:.05,f:1200,q:.6,vol:.7});blip(a,d,{f:130,f2:60,dur:.1,vol:.8});},
 kick:a=>{S.eject(a);},
 plunge:a=>{const d=out(a,.4);burst(a,d,{dur:.09,f:900,q:.5,vol:.5});blip(a,d,{f:300,f2:120,dur:.12,type:'triangle',vol:.4});},
 autoPlunge:a=>{S.eject(a);},
 knocker:a=>{const d=out(a,.8);blip(a,d,{f:70,f2:40,dur:.25,vol:1});burst(a,d,{dur:.09,f:500,q:.4,vol:.9});},
 gate:a=>{const d=out(a,.2);blip(a,d,{f:2600,f2:2400,dur:.02,vol:.3});},
 wall:a=>{const d=out(a,.18);burst(a,d,{dur:.02,f:2500,q:1.5,vol:.5});},
 nudge:a=>{const d=out(a,.5);blip(a,d,{f:60,f2:35,dur:.15,vol:.8});burst(a,d,{dur:.05,f:300,type:'lowpass',vol:.6});},
 ramp:a=>{const d=out(a,.18);notes(a,d,[60,64,67],{vol:.1,step:.05,type:'triangle'});},
 lock:a=>{const d=out(a,.3);notes(a,d,[55,62,67,74],{step:.1});},
 award:a=>{const d=out(a,.25);notes(a,d,[72,76,79,84],{step:.07});},
 skill:a=>{const d=out(a,.3);notes(a,d,[67,71,74,79,83,86],{step:.06});},
 jackpot:a=>{const d=out(a,.32);notes(a,d,[60,64,67,72,64,67,72,76,67,72,76,79,84],{step:.065});},
 super:a=>{const d=out(a,.35);notes(a,d,[60,67,72,76,79,84,null,84,88,91,96],{step:.08,type:'sawtooth',vol:.09});},
 multiball:a=>{const d=out(a,.32);for(let i=0;i<6;i++)blip(a,d,{t:i*.18,f:i%2?660:880,f2:i%2?650:870,dur:.16,type:'square',vol:.15});},
 save:a=>{const d=out(a,.28);notes(a,d,[67,72,79],{step:.08});},
 drain:a=>{const d=out(a,.3);notes(a,d,[64,60,55,48],{step:.16,type:'triangle',vol:.2});},
 tiltDrain:a=>{S.drain(a);},
 danger:a=>{const d=out(a,.3);for(let i=0;i<3;i++)blip(a,d,{t:i*.14,f:220,f2:215,dur:.1,type:'square',vol:.2});},
 tilt:a=>{const d=out(a,.35);blip(a,d,{f:110,f2:50,dur:1.2,type:'sawtooth',vol:.3});},
 bonus:a=>{const d=out(a,.2);blip(a,d,{f:1046,f2:1040,dur:.05,type:'square',vol:.15});},
 start:a=>{const d=out(a,.3);notes(a,d,[48,55,60,63,67,72],{step:.09,type:'sawtooth',vol:.08});},
 gameOver:a=>{const d=out(a,.3);notes(a,d,[67,63,60,55,51,48],{step:.18,type:'triangle',vol:.2});},
};
function pinballSound(name){const a=ctx();if(!a||!S[name])return;try{S[name](a);}catch{}}
// Rolling ball: one looped noise source whose level follows the fastest ball on the playfield.
function rollLevel(speed){const a=ctx();if(!a){return;}if(!roll){const s=a.createBufferSource();s.buffer=noise;s.loop=true;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=180;const g=a.createGain();g.gain.value=0;s.connect(f).connect(g).connect(a.destination);s.start();roll={s,f,g};}
 const v=Math.min(1,speed/3500);roll.g.gain.setTargetAtTime(v*.1,a.currentTime,.05);roll.f.frequency.setTargetAtTime(120+v*380,a.currentTime,.05);}
function stopRoll(){if(roll){try{roll.s.stop();}catch{}roll=null;}}
Object.assign(exports,{pinballSound,rollLevel,stopRoll});
