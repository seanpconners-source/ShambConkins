// A table's own recorded audio (drop-ins in assets/music/, built into USER_PORTRAITS['music:<prefix>-<name>']):
// real songs as the soundtrack and recorded guitar licks layered on the machine's synth sounds. Data per table
// (tables/bucketheadAudio.js): cfg = {prefix, songs:{slug:{title,artist}}, playlist:[slug...], roles:{role:{song,from}},
// sfx:{soundName:{lick|one|stab, vol, prio, replace}}}. Missing files fall back to the synth band / synth sounds.
//
// Songs (HTML audio, streamed, never decoded whole): the playlist plays on through the game (shuffled once, next song
// when one ends, kept between games); a mode role (rules.music → e.g. 'jordan') fades the playlist out and plays its
// own song from `from` seconds (looped), and the playlist resumes where it was when the mode ends. 'wait'/'bonus' duck
// the song, 'tilt' fades it out, a guitar lick ducks it for as long as it plays. iOS ignores el.volume (no fades there).
// Guitar: lick(tier) = one lead voice (a bigger award cuts a smaller lick off, a small one never cuts a big one), one(name)
// = a single named clip, stab = the first ~0.3 s of a random lick (a guitar hit on bumpers, targets, lanes).
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const musicOn=()=>!!store.profile?.settings?.music,sfxOn=()=>!!store.profile?.settings?.sound;
const ORDER=new Map();// prefix → {order,pos}: the playlist shuffle carries on from game to game
const BASE=.6,FADE=1.4;// song volume, fade speed (volume per second)

function createSongs(cfg,{paused=()=>false,onSong=null}={}){
 const url=slug=>USER_PORTRAITS[`music:${cfg.prefix}-${slug}`]||null;
 const list=(cfg.playlist||[]).filter(url);
 const api={has:list.length>0,role:'',now:null};if(!api.has)return api;
 let main=null,mode=null,duckUntil=0,level=1,held=false;
 const voice=(slug,from=0,loop=false)=>{const el=new Audio(url(slug));el.loop=loop;el.volume=0;el.preload='auto';
  if(from>0){const seek=()=>{try{el.currentTime=from;}catch{}};if(el.readyState>=1)seek();else el.addEventListener('loadedmetadata',seek,{once:true});}
  return {slug,el,vol:0,want:0,on:false};};
 const start=v=>{if(v.on)return;v.on=true;if(!held)v.el.play()?.catch?.(()=>{});api.now=cfg.songs?.[v.slug]||{title:v.slug};onSong?.(api.now);};
 const halt=v=>{if(!v)return;v.on=false;try{v.el.pause();}catch{}};
 function nextMain(){halt(main);let st=ORDER.get(cfg.prefix);
  if(!st||st.order.length!==list.length){const order=list.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}st={order,pos:0};ORDER.set(cfg.prefix,st);}
  const slug=list[st.order[st.pos++%list.length]];main=voice(slug,0,list.length===1);main.el.onended=()=>{if(main?.slug===slug)nextMain();};start(main);}
 // fades: each voice eases toward want × level (level = duck/tilt), a faded-out voice pauses
 const tick=setInterval(()=>{const p=paused();if(p!==held){held=p;for(const v of [main,mode])if(v?.on){try{p?v.el.pause():v.el.play()?.catch?.(()=>{});}catch{}}}if(held)return;
  const lv=api.role==='tilt'?0:api.role==='wait'||api.role==='bonus'?.45:1,duck=performance.now()<duckUntil?.5:1;level=lv*duck;
  for(const v of [main,mode]){if(!v)continue;const target=v.want*level*BASE,st=FADE*.05;v.vol+=Math.max(-st,Math.min(st,target-v.vol));
   try{v.el.volume=Math.max(0,Math.min(1,v.vol));}catch{}
   if(v.want===0&&v.vol<=.001&&v.on&&v!==main)halt(v);}
  if(mode&&mode.want===0&&mode.vol<=.001){halt(mode);mode=null;}
  if(main&&main.want===0&&main.vol<=.001&&main.on)halt(main);},50);
 api.set=role=>{if(!musicOn())role=null;if(role===api.role)return;api.role=role;
  if(!role){for(const v of [main,mode])if(v){v.want=0;}return;}
  if(role==='wait'||role==='bonus'||role==='tilt'){if(!main&&!mode)nextMain();return;}
  const r=cfg.roles?.[role];
  if(r&&url(r.song)&&main?.slug!==r.song){
   if(mode?.slug===r.song&&mode.role===role){mode.want=1;if(main)main.want=0;return;}
   if(mode){mode.want=0;halt(mode);}mode=voice(r.song,r.from||0,true);mode.role=role;mode.want=1;start(mode);if(main)main.want=0;return;}
  // playlist roles: back to the playlist where it was
  if(mode){mode.want=0;}
  if(!main)nextMain();else if(!main.on){main.on=true;if(!held)main.el.play()?.catch?.(()=>{});api.now=cfg.songs?.[main.slug]||{title:main.slug};onSong?.(api.now);}
  main.want=1;};
 api.duck=sec=>{duckUntil=Math.max(duckUntil,performance.now()+sec*1000);};
 api.stop=()=>{clearInterval(tick);halt(main);halt(mode);main=mode=null;api.role='';};
 // tests: what is playing (song, position, length, volume)
 const st=v=>v&&{slug:v.slug,t:+v.el.currentTime.toFixed(1),dur:+(v.el.duration||0).toFixed(1),vol:+v.el.volume.toFixed(2),paused:v.el.paused,err:v.el.error?.code||0};
 api.status=()=>({role:api.role,main:st(main),mode:st(mode)});
 return api;
}

const BUFS=new Map();// url → AudioBuffer | null (loading) | false (failed)
function decoded(a,u){if(!BUFS.has(u)){BUFS.set(u,null);fetch(u).then(r=>r.arrayBuffer()).then(b=>a.decodeAudioData(b)).then(buf=>BUFS.set(u,buf)).catch(()=>BUFS.set(u,false));}return BUFS.get(u)||null;}
function createGuitar(cfg,{onLick=null}={}){
 const keys=Object.keys(USER_PORTRAITS).filter(k=>k.startsWith(`music:${cfg.prefix}-gtr-`));
 const api={has:keys.length>0};if(!api.has)return api;
 const files=name=>keys.filter(k=>k===`music:${cfg.prefix}-gtr-${name}`||k.startsWith(`music:${cfg.prefix}-gtr-${name}-`)).map(k=>USER_PORTRAITS[k]);
 const ctx=()=>{if(!sfxOn())return null;return audioContext();};
 const last=new Map();let lead=null,stabs=[],stabT=0;
 const pick=name=>{const a=ctx();if(!a)return null;const urls=files(name),ready=urls.filter(u=>decoded(a,u));if(!ready.length)return null;
  const pool=ready.length>1?ready.filter(u=>u!==last.get(name)):ready,u=pool[Math.floor(Math.random()*pool.length)];last.set(name,u);return BUFS.get(u);};
 const play=(buf,vol,{off=0,dur=0,rate=1}={})=>{const a=audioContext(),s=a.createBufferSource(),g=a.createGain(),t=a.currentTime;s.buffer=buf;s.playbackRate.value=rate;g.gain.value=vol;s.connect(g).connect(a.destination);
  if(dur>0){g.gain.setValueAtTime(vol,t+Math.max(0,dur-.08));g.gain.linearRampToValueAtTime(0,t+dur);s.start(t,off,dur+.02);}else s.start(t,off);return {s,g,end:t+(dur||buf.duration-off)/rate};};
 const fadeOut=v=>{try{const a=audioContext(),t=a.currentTime;v.g.gain.setTargetAtTime(0,t,.03);v.s.stop(t+.15);}catch{}};
 api.preload=()=>{const a=ctx();if(a)for(const k of keys)decoded(a,USER_PORTRAITS[k]);};
 // a lead lick: a bigger (or equal, after a second) award cuts the one playing; a smaller one waits its turn (skipped)
 api.lick=(tier,vol=.8,prio=1)=>{const a=ctx();if(!a)return false;const now=a.currentTime;
  if(lead&&lead.end>now&&(prio<lead.prio||(prio===lead.prio&&now-lead.t0<1)))return true;
  const buf=pick(tier);if(!buf)return false;if(lead&&lead.end>now)fadeOut(lead);lead={...play(buf,vol),prio,t0:now};onLick?.(buf.duration);return true;};
 api.one=(name,vol=.7)=>{const buf=pick(name);if(!buf)return false;play(buf,vol);return true;};
 // a guitar hit: the opening of a random lick, at most two at once
 api.stab=(vol=.4)=>{const a=ctx();if(!a)return false;const now=a.currentTime;if(now-stabT<.09)return true;
  const buf=pick(['short','mid','tiny'][Math.floor(Math.random()*3)])||pick('short');if(!buf)return false;stabT=now;stabs=stabs.filter(v=>v.end>now);if(stabs.length>=2)fadeOut(stabs.shift());
  stabs.push(play(buf,vol,{dur:.26+Math.random()*.08}));return true;};
 // a machine sound name → its guitar part; returns true when the guitar replaces the synth sound
 api.sound=name=>{const e=cfg.sfx?.[name];if(!e)return false;let ok=false;
  try{ok=e.lick?api.lick(e.lick,e.vol??.8,e.prio??1):e.one?api.one(e.one,e.vol??.7):e.stab?api.stab(e.vol??.4):false;}catch{ok=false;}
  return ok&&!!e.replace;};
 api.stop=()=>{for(const v of [lead,...stabs])if(v)fadeOut(v);lead=null;stabs=[];};
 api.status=()=>{const u=keys.map(k=>BUFS.get(USER_PORTRAITS[k]));return {files:keys.length,decoded:u.filter(Boolean).length,failed:u.filter(b=>b===false).length};};
 return api;
}
Object.assign(exports,{createSongs,createGuitar});
