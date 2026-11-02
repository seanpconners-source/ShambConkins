// A table's own recorded audio (drop-ins in assets/music/, built into USER_PORTRAITS['music:<prefix>-<name>']):
// real songs as the soundtrack and recorded guitar sounds on the machine. Data per table (tables/bucketheadAudio.js):
// cfg = {prefix, songs:{slug:{title,album}}, sections:{slug:[[from,to,level]...]}, roles:{role:{song,from}},
// sfx:{soundName:{...}}, synthTrim:{soundName:gain}}. Missing files fall back to the synth band / synth sounds.
//
// Songs = a music director (HTML audio, streamed, never decoded whole). Every song is mapped into sections with a level
// (1 calm, 2 medium, 3 heavy); the game asks for a level (set(role, level): attract = calm, play = medium, modes,
// multiball and hot streaks = heavy). The director keeps the playing section while it fits; when the game's level
// changes (or the song drifts away from it) it crossfades, preferably to a later section of the same song, else to
// another song's section of that level, picking up a song where it was faded out before. A named role (rules.music →
// e.g. 'jordan') plays its own song from `from`. 'wait'/'bonus' duck, 'tilt' fades out, a guitar lick ducks a little.
// Which songs played and where they stopped carries on from game to game. iOS ignores el.volume (no fades there).
//
// Sounds: everything (guitar clips and the machine's synth sounds, via sound.js setSoundBus) goes through one bus with a
// short plate-like reverb so hits trail out. Clip kinds: lick(tier) = one lead voice (a bigger award cuts a smaller lick
// off), one(name, off, dur) = a named clip or a slice of it, grain = a few ms from a random point (spinner), stab = the
// opening of a random lick. Levels: cfg.sfx[name].vol (clips) and cfg.synthTrim (synth) were set by measuring each sound
// on the bus (tests: s.debug.audioMeter) so all of them sit at the same loudness under the music.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const musicOn=()=>!!store.profile?.settings?.music,sfxOn=()=>!!store.profile?.settings?.sound;
const BASE=.92;                              // song volume (el.volume at full)
const XF={up:1.6,down:4.5,song:3.5,mode:2};  // crossfade seconds: into a heavier part, into a calmer one, song end, mode song
const MEMORY=new Map();                      // prefix → {resume: slug → seconds, recent: [slug...]}, kept between games

function createSongs(cfg,{paused=()=>false,onSong=null}={}){
 const url=slug=>USER_PORTRAITS[`music:${cfg.prefix}-${slug}`]||null;
 const secs=cfg.sections||{},list=Object.keys(secs).filter(url);
 const api={has:list.length>0,role:'',level:1,now:null};if(!api.has)return api;
 if(!MEMORY.has(cfg.prefix))MEMORY.set(cfg.prefix,{resume:new Map(),recent:[]});
 const mem=MEMORY.get(cfg.prefix),voices=[];
 let lead=null,followUntil=0,held=false,duckUntil=0,mis=0,changedAt=0,modeRole=null,lastT=performance.now(),lvlNow=1;
 const secAt=(slug,t)=>(secs[slug]||[]).find(s=>t>=s[0]-.5&&t<s[1])||null;
 function voice(slug,from,loop){const el=new Audio(url(slug));el.loop=loop;el.volume=0;el.preload='auto';
  if(from>0){const seek=()=>{try{el.currentTime=from;}catch{}};if(el.readyState>=1)seek();else el.addEventListener('loadedmetadata',seek,{once:true});}
  const v={slug,el,g:0,dir:1,rate:1,from,gain:Math.pow(10,(cfg.songs?.[slug]?.gain||0)/20)};if(!held)el.play()?.catch?.(()=>{});voices.push(v);return v;}
 const pos=v=>v.el.readyState>=1?v.el.currentTime:v.from;
 // make v the playing song: everything else fades out over xf seconds (and is remembered where it stopped)
 function take(slug,from,{loop=false,xf=XF.song}={}){
  for(const o of voices)if(o.dir>0){o.dir=-1;o.rate=1/xf;if(!o.el.loop)mem.resume.set(o.slug,pos(o));}
  const v=voice(slug,from,loop);v.rate=1/xf;lead=v;mis=0;
  mem.recent=[slug,...mem.recent.filter(s=>s!==slug)].slice(0,4);
  const info=cfg.songs?.[slug]||{title:slug};if(api.now!==info){api.now=info;onSong?.(info);}return v;}
 // the best place to go for a level: a section of that level, rather in a song not heard lately, a long one, or where
 // a song was left off (so the song you heard before a mode comes back)
 function choose(level,avoid=null){let best=null;
  for(const tryL of [level,level===3?2:level===1?2:3])for(const slug of list)for(const s of secs[slug]){if(s[2]!==tryL)continue;
   let from=s[0],score=Math.random()*2+Math.min(2,(s[1]-s[0])/90)-(tryL!==level?20:0);
   // a song left off inside this section (e.g. faded out for a mode) comes back where it was; a song's own start is a
   // good entry too; songs heard lately are avoided otherwise
   const r=mem.resume.get(slug),back=r!=null&&r>=s[0]&&r<s[1]-25;if(back){from=r;score+=5;}else{const ri=mem.recent.indexOf(slug);if(ri>=0)score-=(4-ri)*1.6;if(s[0]===0)score+=1;}
   if(slug===avoid)score-=12;
   if(!best||score>best.score)best={slug,from,score};}
  return best;}
 const go=(c,xf)=>{if(c)take(c.slug,c.from,{xf});};
 function tick(){const now=performance.now(),dt=Math.min(.25,(now-lastT)/1000);lastT=now;
  const p=paused();if(p!==held){held=p;for(const v of voices){try{p?v.el.pause():v.el.play()?.catch?.(()=>{});}catch{}}}if(held)return;
  const role=api.role;
  if(now<followUntil){}// watching the other phone's ball: its song (follow) decides
  else if(role&&role!=='tilt'){
   const r=cfg.roles?.[role];
   if(r&&url(r.song)){if(modeRole!==role){modeRole=role;if(lead?.slug!==r.song)take(r.song,r.from||0,{loop:true,xf:XF.mode});else lead.el.loop=true;}}
   else{if(modeRole){modeRole=null;if(lead)lead.el.loop=false;changedAt=now;}// the mode's song plays on while it fits
    if(!lead)go(choose(api.level),XF.song);
    else{const t=pos(lead),d=lead.el.duration||1e9,s=secAt(lead.slug,t),sl=s?s[2]:api.level;
     if(d-t<XF.song+.3)go(choose(api.level,lead.slug),XF.song);   // the song ends: crossfade into the next one
     else if(sl===api.level)mis=0;
     else if((secs[lead.slug]||[]).some(q=>q[2]===api.level&&q[0]>t&&q[0]-t<12))mis=0;// the right part is coming up: wait for it
     else{mis+=dt;const fresh=now-changedAt<12000,diff=Math.abs(sl-api.level);
      // the game just changed: heavier at once, calmer after a few seconds; the song drifted: tolerate a step for a while
      const lim=fresh?(api.level>sl?1.2:6):diff>1?3:25;
      if(mis>lim){const later=(secs[lead.slug]||[]).find(q=>q[2]===api.level&&q[0]>t&&q[0]-t<120);
       go(later&&Math.random()<.6?{slug:lead.slug,from:later[0]}:choose(api.level,lead.slug),api.level>sl?XF.up:XF.down);}}}}}
  // volumes: equal-power fades, the whole mix ducked while waiting / a lick plays, out on a tilt
  const lv=role==='tilt'||!role?0:role==='wait'||role==='bonus'?.55:1,duck=now<duckUntil?.72:1;lvlNow+=(lv*duck-lvlNow)*Math.min(1,dt*(lv*duck<lvlNow?3:1.2));
  for(let i=voices.length-1;i>=0;i--){const v=voices[i];v.g=Math.max(0,Math.min(1,v.g+v.dir*v.rate*dt));
   try{v.el.volume=Math.max(0,Math.min(1,BASE*v.gain*lvlNow*Math.sin(v.g*Math.PI/2)));}catch{}
   if(v.dir<0&&v.g<=0){try{v.el.pause();}catch{}v.el.removeAttribute('src');voices.splice(i,1);if(v===lead)lead=null;}}
  if(!role&&!voices.length)lead=null;}
 const timer=setInterval(tick,100);
 api.set=(role,level)=>{if(!musicOn())role=null;
  if(level&&role&&role!=='wait'&&role!=='bonus'&&role!=='tilt'&&level!==api.level){api.level=level;changedAt=performance.now();}
  if(role===api.role)return;api.role=role;
  if(!role)for(const v of voices){v.dir=-1;v.rate=1/1.5;if(!v.el.loop)mem.resume.set(v.slug,pos(v));}};
 // online: the watching phone plays what the playing phone plays (song, position), crossfading when that changes
 api.leadPos=()=>lead?[lead.slug,+pos(lead).toFixed(1)]:null;
 api.follow=(slug,t)=>{followUntil=performance.now()+2500;if(!url(slug)||!api.role||api.role==='tilt')return;if(lead?.slug===slug&&Math.abs(pos(lead)-t)<4)return;take(slug,t,{xf:XF.up});};
 api.duck=sec=>{duckUntil=Math.max(duckUntil,performance.now()+sec*1000);};
 api.stop=()=>{clearInterval(timer);for(const v of voices){if(v.dir>0&&!v.el.loop)mem.resume.set(v.slug,pos(v));try{v.el.pause();}catch{}}voices.length=0;lead=null;api.role='';};
 // tests: what is playing
 const st=v=>v&&{slug:v.slug,t:+pos(v).toFixed(1),dur:+(v.el.duration||0).toFixed(1),vol:+v.el.volume.toFixed(2),paused:v.el.paused,err:v.el.error?.code||0,sec:secAt(v.slug,pos(v))?.[2]??null};
 api.status=()=>({role:api.role,level:api.level,lead:st(lead),voices:voices.length});
 return api;
}

// ---- the sound bus: dry + a short reverb (generated impulse: 1.9 s, darker as it decays), one per audio context
let BUS=null;
function bus(){const a=audioContext();if(!a)return null;if(BUS&&BUS.a===a)return BUS;
 const input=a.createGain(),wet=a.createGain(),conv=a.createConvolver(),pre=a.createDelay(.05);
 const len=Math.round(a.sampleRate*1.9),ir=a.createBuffer(2,len,a.sampleRate);
 for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);let lp=0;for(let i=0;i<len;i++){const t=i/a.sampleRate,k=Math.min(.95,.25+t*.45);lp=lp*k+(Math.random()*2-1)*(1-k);d[i]=lp*Math.exp(-t*3.4)*(1+t*.6);}}
 conv.buffer=ir;pre.delayTime.value=.018;wet.gain.value=.4;// the convolver normalises the impulse: .4 ≈ 8 dB under the dry hit
 input.connect(a.destination);input.connect(pre).connect(conv).connect(wet).connect(a.destination);
 BUS={a,input,meter:null};return BUS;}
// tests: the loudest 50 ms RMS (dBFS) on the dry bus while fn plays
async function measure(fn,ms=1600){const b=bus();if(!b)return null;const a=b.a;if(!b.meter){b.meter=a.createAnalyser();b.meter.fftSize=2048;b.input.connect(b.meter);}
 const buf=new Float32Array(b.meter.fftSize);let max=0;fn();const t0=performance.now();
 while(performance.now()-t0<ms){await new Promise(r=>setTimeout(r,20));b.meter.getFloatTimeDomainData(buf);let s=0;for(const v of buf)s+=v*v;max=Math.max(max,Math.sqrt(s/buf.length));}
 return +(20*Math.log10(max+1e-9)).toFixed(1);}

const BUFS=new Map();// url → AudioBuffer | null (loading) | false (failed)
function decoded(a,u){if(!BUFS.has(u)){BUFS.set(u,null);fetch(u).then(r=>r.arrayBuffer()).then(b=>a.decodeAudioData(b)).then(buf=>BUFS.set(u,buf)).catch(()=>BUFS.set(u,false));}return BUFS.get(u)||null;}
function createGuitar(cfg,{onLick=null}={}){
 const pre=`music:${cfg.prefix}-`,keys=Object.keys(USER_PORTRAITS).filter(k=>k.startsWith(pre+'gtr-')||k.startsWith(pre+'fx-'));
 const api={has:keys.length>0};if(!api.has)return api;
 // name = file name after the prefix: 'gtr-big' = every gtr-big-<n>, 'fx-sparks' = fx-sparks-1/2, 'fx-wail' = that one
 const files=name=>keys.filter(k=>k===pre+name||k.startsWith(pre+name+'-')).map(k=>USER_PORTRAITS[k]);
 const ctx=()=>{if(!sfxOn())return null;return audioContext();};
 const last=new Map();let lead=null,stabs=[],stabT=0,grainT=0;
 const pick=name=>{const a=ctx();if(!a)return null;const urls=files(name),ready=urls.filter(u=>decoded(a,u));if(!ready.length)return null;
  const pool=ready.length>1?ready.filter(u=>u!==last.get(name)):ready,u=pool[Math.floor(Math.random()*pool.length)];last.set(name,u);return BUFS.get(u);};
 const play=(buf,vol,{off=0,dur=0,rate=1}={})=>{const a=audioContext(),s=a.createBufferSource(),g=a.createGain(),t=a.currentTime;s.buffer=buf;s.playbackRate.value=rate;
  s.connect(g).connect(bus()?.input||a.destination);off=Math.min(off,Math.max(0,buf.duration-.05));const len=dur>0?Math.min(dur,buf.duration-off):buf.duration-off;
  // short fade in (no click on a slice), fade out over the last 12% (min 60 ms) so cut clips ring into the reverb
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+(off>0?.008:.002));const fo=Math.max(.06,len*.12);g.gain.setValueAtTime(vol,t+Math.max(.01,len/rate-fo));g.gain.linearRampToValueAtTime(0,t+len/rate);
  s.start(t,off,len+.02);return {s,g,end:t+len/rate};};
 const fadeOut=v=>{try{const a=audioContext(),t=a.currentTime;v.g.gain.cancelScheduledValues(t);v.g.gain.setValueAtTime(v.g.gain.value,t);v.g.gain.linearRampToValueAtTime(0,t+.12);v.s.stop(t+.14);}catch{}};
 const rate=r=>Array.isArray(r)?r[0]+Math.random()*(r[1]-r[0]):r||1;
 api.preload=()=>{const a=ctx();if(a){bus();for(const k of keys)decoded(a,USER_PORTRAITS[k]);}};
 // a lead lick: a bigger (or equal, after a second) award cuts the one playing; a smaller one is skipped
 api.lick=(tier,vol=.5,prio=1)=>{const a=ctx();if(!a)return false;const now=a.currentTime;
  if(lead&&lead.end>now&&(prio<lead.prio||(prio===lead.prio&&now-lead.t0<1)))return true;
  const buf=pick(tier);if(!buf)return false;if(lead&&lead.end>now)fadeOut(lead);lead={...play(buf,vol),prio,t0:now};onLick?.(buf.duration);return true;};
 api.one=(name,vol=.5,o={})=>{const buf=pick(name);if(!buf)return false;play(buf,vol,{off:o.off||0,dur:o.dur||0,rate:rate(o.rate)});return true;};
 // a grain: a few tens of ms from a random point of a clip (the spinner ticking through string scratches)
 api.grain=(name,vol=.3,len=.07)=>{const a=ctx();if(!a)return false;if(a.currentTime-grainT<.035)return true;const buf=pick(name);if(!buf)return false;grainT=a.currentTime;
  play(buf,vol,{off:Math.random()*Math.max(0,buf.duration-len),dur:len,rate:.92+Math.random()*.16});return true;};
 // a guitar hit: the opening of a random lick, at most two at once
 api.stab=(vol=.3)=>{const a=ctx();if(!a)return false;const now=a.currentTime;if(now-stabT<.09)return true;
  const buf=pick(['gtr-short','gtr-mid','gtr-tiny'][Math.floor(Math.random()*3)])||pick('gtr-short');if(!buf)return false;stabT=now;stabs=stabs.filter(v=>v.end>now);if(stabs.length>=2)fadeOut(stabs.shift());
  stabs.push(play(buf,vol,{dur:.28+Math.random()*.1}));return true;};
 // a machine sound name → its guitar part (one entry or a list to pick from at random); true = it replaces the synth one
 api.sound=name=>{let e=cfg.sfx?.[name];if(Array.isArray(e))e=e[Math.floor(Math.random()*e.length)];if(!e)return false;let ok=false;
  try{ok=e.lick?api.lick(e.lick,e.vol??.5,e.prio??1):e.one?api.one(e.one,e.vol??.5,e):e.grain?api.grain(e.grain,e.vol??.3,e.len):e.stab?api.stab(e.vol??.3):false;}catch{ok=false;}
  return ok&&e.replace!==false;};
 api.stop=()=>{for(const v of [lead,...stabs])if(v)fadeOut(v);lead=null;stabs=[];};
 api.status=()=>{const u=keys.map(k=>BUFS.get(USER_PORTRAITS[k]));return {files:keys.length,decoded:u.filter(Boolean).length,failed:u.filter(b=>b===false).length};};
 return api;
}
Object.assign(exports,{createSongs,createGuitar,soundBus:bus,measure});
