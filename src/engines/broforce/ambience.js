// BF-33: original, quiet procedural stage atmosphere. This module NEVER creates
// an AudioContext: the host passes its existing BF-26-compatible context provider.
// start()/resume() must be called directly from a user gesture; the host calls
// pause() on visibility loss, game pause or rotation and stop() on disposal.
const AMBIENCE_STAGES = Object.freeze({
 'broforce-jungle': Object.freeze({step:.34,notes:[110,0,164.81,0,123.47,0,146.83,0],
  wave:'triangle',texture:'bandpass',filter:720,pulse:75,grain:.16}),
 'broforce-factory': Object.freeze({step:.25,notes:[98,146.83,0,98,116.54,0,146.83,73.42],
  wave:'square',texture:'lowpass',filter:330,pulse:145,grain:.12}),
 'broforce-city': Object.freeze({step:.38,notes:[220,0,246.94,0,233.08,0,196,0],
  wave:'sine',texture:'highpass',filter:2200,pulse:440,grain:.25}),
 'broforce-desert': Object.freeze({step:.52,notes:[82.41,0,0,123.47,0,0,110,0],
  wave:'sine',texture:'bandpass',filter:390,pulse:61.74,grain:.43})
});

function createBroforceAmbience({getContext=()=>null,getSettings=()=>({}),stageId='broforce-jungle'}={}) {
 const theme=AMBIENCE_STAGES[stageId]||AMBIENCE_STAGES['broforce-jungle'];
 const MAX_VOICES=12, LOOKAHEAD=1.2, CHECK_MS=550;
 const active=new Set();
 let ctx=null,master=null,musicBus=null,environmentBus=null,noiseBuffer=null;
 let nextTime=0,step=0,timer=null,started=false,paused=false,closed=false;
 let resuming=false,token=0,intensity=.35;
 const safe=(fn,fallback)=>{try{return fn();}catch{return fallback;}};
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
 const options=()=>safe(()=>getSettings()||{},{});
 const enabled=o=>({music:o.music!==false,sound:o.sound!==false,
  motion:o.reducedMotion===true?.7:1});
 function cancelTimer(){if(timer!==null){clearTimeout(timer);timer=null;}}
 function disposeVoice(v,interrupt=true){
  if(v.done)return;
  v.done=true;v.source.onended=null;
  if(interrupt)try{v.source.stop(0);}catch{}
  for(const node of v.nodes)try{node.disconnect();}catch{}
  active.delete(v);
 }
 function clearGraph(){
  cancelTimer();
  for(const v of [...active])disposeVoice(v);
  for(const n of [musicBus,environmentBus,master])if(n)try{n.disconnect();}catch{}
  master=musicBus=environmentBus=noiseBuffer=null;
 }
 function updateMix(p){
  if(!master)return;
  const k=.65+.35*intensity;
  master.gain.value=.14*p.motion;
  // Deliberately sit under BF-26 action SFX, without compressor/extra context.
  musicBus.gain.value=p.music ? .20*k : 0;
  environmentBus.gain.value=p.sound ? .13*k : 0;
 }
 function graph(){
  if(master)return;
  master=ctx.createGain();musicBus=ctx.createGain();environmentBus=ctx.createGain();
  musicBus.connect(master);environmentBus.connect(master);master.connect(ctx.destination);
 }
 function makeNoise(){
  if(noiseBuffer)return noiseBuffer;
  const sr=Math.max(8000,Math.min(96000,ctx.sampleRate||44100));
  const b=ctx.createBuffer(1,Math.ceil(sr*.5),sr),data=b.getChannelData(0);
  let seed=0x6a09e667;
  for(let i=0;i<data.length;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   data[i]=seed/2147483648-1;
  }
  noiseBuffer=b;return b;
 }
 function addVoice(src,nodes,start,duration){
  if(active.size>=MAX_VOICES){for(const n of nodes)try{n.disconnect();}catch{}return false;}
  const voice={source:src,nodes,done:false,end:start+duration+.015};
  src.onended=()=>disposeVoice(voice,false);
  active.add(voice);
  try{src.start(start);src.stop(voice.end);return true;}
  catch{disposeVoice(voice);return false;}
 }
 function tone(at,freq,duration,vol,type,bus,slide=1){
  if(active.size>=MAX_VOICES)return;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(Math.max(25,freq),at);
  if(slide!==1)osc.frequency.exponentialRampToValueAtTime(Math.max(25,freq*slide),at+duration);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.linearRampToValueAtTime(Math.max(.0002,vol),at+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(bus);
  addVoice(osc,[osc,gain],at,duration);
 }
 function wind(at,duration,vol){
  if(active.size>=MAX_VOICES)return;
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=makeNoise();filter.type=theme.texture;
  filter.frequency.value=theme.filter;filter.Q.value=theme.texture==='bandpass'?.75:.55;
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.linearRampToValueAtTime(vol,at+Math.min(.09,duration*.28));
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  src.connect(filter);filter.connect(gain);gain.connect(environmentBus);
  addVoice(src,[src,filter,gain],at,duration);
 }
 function scheduleBeat(at,n,p){
  const beat=n%8,note=theme.notes[beat];
  if(p.music&&note){
   const dur=stageId==='broforce-desert' ? Math.min(.95,theme.step*1.9) : theme.step*.68;
   const slide=stageId==='broforce-city' ? (beat===0?1.15:.88) : 1;
   tone(at,note,dur,stageId==='broforce-factory'?.26:.21,theme.wave,musicBus,slide);
  }
  if(p.music&&beat===0){
   tone(at,theme.pulse,Math.min(.34,theme.step*.8),stageId==='broforce-factory'?.24:.18,
    'triangle',musicBus,stageId==='broforce-jungle'?.68:1);
  }
  if(p.sound&&((stageId==='broforce-factory'&&beat%2===0)||
     (stageId==='broforce-jungle'&&beat%3===0)||
     (stageId==='broforce-city'&&beat%2===0)||
     (stageId==='broforce-desert'&&beat%3===0))){
   wind(at,theme.grain,stageId==='broforce-city'?.17:.13);
  }
 }
 function pump(){
  timer=null;
  if(closed||paused||!started||!ctx)return;
  // Some browsers interrupt without firing the host's pause/visibility event.
  if(ctx.state!=='running'){clearGraph();return;}
  const p=enabled(options());
  if(!p.music&&!p.sound){clearGraph();return;}
  try{
   graph();updateMix(p);
   const now=Number.isFinite(ctx.currentTime)?ctx.currentTime:0;
   for(const v of [...active])if(v.end<now-.03)disposeVoice(v,false);
   // A tab wake-up cannot trigger a burst of thousands of missed beats.
   if(nextTime<now){const skipped=Math.ceil((now-nextTime)/theme.step);step+=skipped;nextTime+=skipped*theme.step;}
   let budget=10;
   while(nextTime<now+LOOKAHEAD&&budget-->0){
    scheduleBeat(nextTime,step++,p);nextTime+=theme.step;
   }
  }catch{clearGraph();return;}
  timer=setTimeout(pump,CHECK_MS);
 }
 function activate(){
  if(closed||paused||!started||!ctx)return false;
  if(ctx.state!=='running'&&master)clearGraph();
  if(ctx.state==='running'){
   if(timer!==null)return true;
   nextTime=Number.isFinite(ctx.currentTime)?ctx.currentTime+.035:.035;
   pump();return true;
  }
  if(ctx.state!=='suspended'||typeof ctx.resume!=='function')return false;
  if(resuming)return true;
  resuming=true;const current=token;
  try{Promise.resolve(ctx.resume()).then(()=>{
   resuming=false;
   if(current===token&&!closed&&!paused&&started&&ctx.state==='running')activate();
  },()=>{resuming=false;});}
  catch{resuming=false;return false;}
  return true;
 }
 function start(){
  if(closed||paused)return false;
  if(started)return activate(); // Explicit next gesture retries after an interrupted context.
  const p=enabled(options());
  if(!p.music&&!p.sound)return false;
  const a=safe(()=>getContext(),null);
  if(!a||a.state==='closed')return false;
  ctx=a;started=true;return activate();
 }
 function setIntensity(level){
  if(Number.isFinite(level))intensity=clamp(level,0,1);
  if(ctx&&ctx.state!=='running'&&master)clearGraph();
  if(master){
   const p=enabled(options());
   if(!p.music&&!p.sound)clearGraph();
   else updateMix(p);
  }
  // Enables sound again after the host changes profile settings and calls us.
  if(started&&!paused&&!closed&&!master&&ctx?.state==='running'&&
    (enabled(options()).music||enabled(options()).sound)){
   nextTime=ctx.currentTime+.035;
   pump();
  }
  return intensity;
 }
 function pause(){
  if(closed||!started||paused)return false;
  paused=true;token++;resuming=false;clearGraph();return true;
 }
 function resume(){
  if(closed||!started||!paused)return false;
  paused=false;token++;return activate();
 }
 function stop(){
  if(closed)return;
  closed=true;started=false;paused=false;token++;resuming=false;
  clearGraph();ctx=null;
 }
 return {start,setIntensity,pause,resume,stop};
}
Object.assign(exports,{createBroforceAmbience});
