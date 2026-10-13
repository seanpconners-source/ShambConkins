// Broforce Mobile: original, procedural action SFX. Nothing is allocated before play().
// A game owns one instance and calls stop() on exit; a stopped instance is not reusable.
function createBroforceAudio(getContext,getSettings){
 const COST={jump:2,land:2,pistol:2,rifle:3,shotgun:4,grenade:2,explosion:4,
  'wall-break':3,impact:2,hit:2,rescue:4,swap:2,'boss-intro':3,'boss-hit':3,
  'boss-death':4,helicopter:2,extraction:4,win:4,lose:3};
 const GAP={jump:.065,land:.08,pistol:.055,rifle:.052,shotgun:.17,grenade:.16,
  explosion:.24,'wall-break':.16,impact:.05,hit:.075,rescue:.4,swap:.14,
  'boss-intro':.7,'boss-hit':.12,'boss-death':.9,helicopter:.25,
  extraction:.7,win:.7,lose:.7};
 const IMPORTANT=new Set(['explosion','rescue','boss-intro','boss-death','extraction','win','lose']);
 const MAX_EVENTS=8,MAX_VOICES=28;
 const active=new Set(),last=new Map();
 let ctx=null,master=null,noiseBuffer=null,voices=0,closed=false,resuming=false,pending=null;
 const safe=(fn,fallback)=>{try{return fn();}catch{return fallback;}};
 const setting=()=>safe(()=>getSettings()||{},{});
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 function dispose(group,interrupt=true){
  if(group.disposed)return;
  group.disposed=true;
  for(const src of group.sources){src.onended=null;if(interrupt)try{src.stop(0);}catch{}}
  for(const node of group.nodes)try{node.disconnect();}catch{}
  group.sources.clear();group.nodes.clear();active.delete(group);
  voices=Math.max(0,voices-group.cost);
 }
 function clearGraph(){
  for(const group of [...active])dispose(group);
  if(master)try{master.disconnect();}catch{}
  master=null;noiseBuffer=null;voices=0;last.clear();
 }
 function stop(){closed=true;pending=null;clearGraph();ctx=null;}
 function ensureGraph(a){
  if(a!==ctx){clearGraph();ctx=a;}
  if(!master){master=a.createGain();master.gain.value=.19;master.connect(a.destination);}
 }
 function buffer(){
  if(noiseBuffer)return noiseBuffer;
  const sr=Math.max(8000,ctx.sampleRate||44100);
  const b=ctx.createBuffer(1,Math.ceil(sr*.78),sr),d=b.getChannelData(0);
  let seed=0x9e3779b9;
  for(let i=0;i<d.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;d[i]=seed/2147483648-1;}
  return noiseBuffer=b;
 }
 function envelope(p,t,level,dur,attack=.002){
  p.setValueAtTime(.0001,t);
  p.linearRampToValueAtTime(Math.max(.0002,level),t+attack);
  p.exponentialRampToValueAtTime(.0001,t+dur);
 }
 function source(group,src,start,duration,offset){
  group.nodes.add(src);group.sources.add(src);
  src.onended=()=>{
   if(group.disposed)return;
   group.sources.delete(src);
   if(!group.sources.size)dispose(group,false);
  };
  if(offset===undefined)src.start(start);else src.start(start,offset);
  src.stop(start+duration+.012);
  group.end=Math.max(group.end,start+duration+.012);
 }
 function tone(g,from,to,dur,level,type='triangle',delay=0,attack=.002){
  const t=g.start+delay,o=ctx.createOscillator(),amp=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(Math.max(24,from),t);
  if(to!==from)o.frequency.exponentialRampToValueAtTime(Math.max(24,to),t+dur);
  envelope(amp.gain,t,level,dur,attack);
  o.connect(amp);amp.connect(g.mix);g.nodes.add(amp);
  source(g,o,t,dur);
 }
 function grit(g,mode,freq,dur,level,delay=0,q=.75){
  const t=g.start+delay,n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),amp=ctx.createGain();
  n.buffer=buffer();f.type=mode;f.frequency.value=freq;f.Q.value=q;
  envelope(amp.gain,t,level,dur);
  n.connect(f);f.connect(amp);amp.connect(g.mix);g.nodes.add(f);g.nodes.add(amp);
  source(g,n,t,dur,Math.random()*.11);
 }
 function rotor(g,dur=.65,level=.48,delay=0){
  const t=g.start+delay,n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),amp=ctx.createGain();
  n.buffer=buffer();f.type='lowpass';f.frequency.value=570;f.Q.value=.65;
  amp.gain.setValueAtTime(.0001,t);
  for(let i=0;i<6;i++){
   const at=t+i*.097;
   amp.gain.setValueAtTime(.0001,at);
   amp.gain.linearRampToValueAtTime(level*(1-i*.055),at+.012);
   amp.gain.exponentialRampToValueAtTime(.0001,at+.081);
  }
  n.connect(f);f.connect(amp);amp.connect(g.mix);g.nodes.add(f);g.nodes.add(amp);
  source(g,n,t,dur,Math.random()*.08);
 }
 function synth(g,name){
  switch(name){
   case 'jump':tone(g,165,385,.145,.39,'triangle');grit(g,'highpass',1900,.045,.12);break;
   case 'land':tone(g,125,49,.17,.59,'sine');grit(g,'lowpass',590,.105,.46);break;
   case 'pistol':grit(g,'highpass',2100,.085,.73);tone(g,225,83,.11,.58,'triangle');break;
   case 'rifle':grit(g,'highpass',2600,.048,.85);grit(g,'bandpass',1000,.11,.46,.016);tone(g,167,63,.125,.56);break;
   case 'shotgun':grit(g,'highpass',1650,.125,.92);grit(g,'lowpass',480,.29,.68,.007);tone(g,122,42,.24,.81,'sine');tone(g,780,260,.07,.19,'triangle',.065);break;
   case 'grenade':tone(g,690,248,.28,.43,'triangle');grit(g,'bandpass',1800,.15,.33,.035,2);break;
   case 'explosion':tone(g,91,32,.53,.94,'sine');grit(g,'lowpass',280,.57,.93);grit(g,'highpass',1550,.14,.8);grit(g,'bandpass',640,.34,.57,.075);break;
   case 'wall-break':grit(g,'highpass',1350,.16,.84);grit(g,'lowpass',390,.48,.72,.045);tone(g,310,91,.19,.51,'triangle',.012);break;
   case 'impact':grit(g,'bandpass',850,.095,.63);tone(g,179,72,.13,.64,'sine');break;
   case 'hit':grit(g,'highpass',1850,.07,.52);tone(g,250,93,.16,.5,'triangle');break;
   case 'rescue':tone(g,392,588,.17,.38,'triangle');tone(g,494,740,.21,.4,'triangle',.085);tone(g,587,988,.32,.41,'sine',.17);tone(g,784,1175,.32,.25,'triangle',.24);break;
   case 'swap':tone(g,260,520,.14,.42,'sine');tone(g,470,790,.17,.34,'triangle',.09);break;
   case 'boss-intro':tone(g,110,56,.58,.8,'sine');tone(g,277,138,.5,.52,'triangle',.13);grit(g,'lowpass',360,.33,.45,.05);break;
   case 'boss-hit':grit(g,'highpass',1300,.12,.78);tone(g,146,52,.24,.81,'sine');grit(g,'lowpass',450,.18,.5,.045);break;
   case 'boss-death':tone(g,102,29,.72,.95,'sine');grit(g,'lowpass',320,.67,.95,.04);grit(g,'highpass',950,.23,.67);tone(g,470,60,.65,.34,'triangle',.13);break;
   case 'helicopter':rotor(g);tone(g,76,64,.66,.4,'sine');break;
   case 'extraction':rotor(g,.65,.39);tone(g,392,587,.23,.34,'triangle',.04);tone(g,587,880,.26,.38,'triangle',.2);tone(g,784,1175,.33,.36,'sine',.35);break;
   case 'win':tone(g,392,392,.22,.37,'triangle');tone(g,494,494,.25,.38,'triangle',.12);tone(g,587,587,.31,.38,'triangle',.24);tone(g,784,784,.46,.33,'sine',.35);break;
   case 'lose':tone(g,392,349,.26,.37,'triangle');tone(g,311,264,.28,.37,'triangle',.16);tone(g,220,131,.44,.41,'sine',.34);break;
  }
 }
 function play(name,options={}){
  if(closed||!Object.hasOwn(COST,name))return false;
  const settings=setting();
  if(settings.sound===false){pending=null;if(active.size||master)clearGraph();return false;}
  const volume=clamp(Number(options&&options.volume===undefined?1:options?.volume),0,1);
  if(!Number.isFinite(volume)||volume<=0)return false;
  const a=safe(()=>getContext(),null);
  if(!a||a.state==='closed'){pending=null;if(active.size||master)clearGraph();return false;}
  if(a.state&&a.state!=='running'){
   // Interrupted/suspended contexts must not revive old scheduled combat voices.
   if(active.size||master)clearGraph();
   if(a.state==='suspended'&&typeof a.resume==='function'){
    pending={name,options};
    if(!resuming){resuming=true;
     try{Promise.resolve(a.resume()).then(()=>{
       resuming=false;const item=pending;pending=null;
       if(item&&!closed&&a.state==='running'&&setting().sound)play(item.name,item.options);
      },()=>{resuming=false;pending=null;});}
     catch{resuming=false;pending=null;}
    }
   }
   return false;
  }
  try{
   ensureGraph(a);
   const now=Number.isFinite(a.currentTime)?a.currentTime:0;
   for(const g of [...active])if(now>g.end+.04)dispose(g,false);
   if(now-(last.get(name)??-Infinity)<GAP[name])return false;
   while((active.size>=MAX_EVENTS||voices+COST[name]>MAX_VOICES)&&IMPORTANT.has(name)&&active.size)dispose(active.values().next().value);
   if(active.size>=MAX_EVENTS||voices+COST[name]>MAX_VOICES)return false;
   const mix=a.createGain(),sensitivity=settings.reducedMotion?.8:1;
   mix.gain.value=volume*sensitivity;mix.connect(master);
   const g={mix,nodes:new Set([mix]),sources:new Set(),start:now+.002,end:now,disposed:false,cost:COST[name]};
   active.add(g);voices+=g.cost;
   try{synth(g,name);last.set(name,now);return true;}
   catch{dispose(g);return false;}
  }catch{return false;}
 }
 return {play,stop};
}
Object.assign(exports,{createBroforceAudio});
