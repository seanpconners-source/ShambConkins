// Sunset Riders sounds (the owner's files, assets/music/sunset-*; README there), for any game that wants them.
// createSunsetMusic: the music director (songs picked by what is going on, crossfaded, played out); `sting` plays a short jingle.
// The pick uses Math.random on purpose: it must not touch s.random, which both phones share in an online game.
// sunsetVoice: one voice clip through WebAudio; returns false when it can't play yet, so a caller can fall back on a synth sound.
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const {SUNSET_GAIN}=require("src/data/sunsetSounds.js");
const {store}=require("src/state.js");
const {audioContext}=require("src/audio.js");
const url=n=>USER_PORTRAITS['music:sunset-'+n];
const on=k=>!!store.profile?.settings?.[k];
const gain=n=>SUNSET_GAIN[n]??.6;
// Songs by what they are in Sunset Riders (stage themes, boss/showdown themes, the quiet ones), for the music director.
// calm = writing a bounty, between rounds; play = a phrase being shot at; tense = someone on their last bullets or the
// clock running out. The victory songs aren't dealt (the Stage Clear jingle plays at the end instead).
const MOODS={
 calm:['time-to-set-off','now-the-time-to-depart-has-come','the-rosy-setting-sun','the-beautiful-setting-sun','looking-up-at-the-stars','dance-over-night','i-dance-to-the-morning','adios-amigo'],
 play:['gunfight-at-the-sunset-corral','shoot-out-at-the-sunset-ranch','face-with-courage','i-will-run-and-face-tomorrow','butch-cassidy-and-sunset-riders','train-stage-2','ay-chihuahua','aye-chihuaha','mountain-stage-2','the-great-petal','splendid-flower-petal','the-magnificent-four'],
 tense:['its-time-to-pay','quick-draw','draw-your-gun','draw-pilgrim','fight-bravely','me-ready-for-pow-wow','get-ready-for-a-pow-wow','you-and-he-big-trouble','you-in-heap-big-trouble','were-gonna-blow-you-away'],
};
const RANK={calm:0,play:1,tense:2};
const tune=n=>n.replace(/^song-(genesis|snes)-\d+-/,'');
// the same tune under its two names (Genesis / SNES), so the two versions of one song never play back to back
const SAME={'aye-chihuaha':'ay-chihuahua','the-beautiful-setting-sun':'the-rosy-setting-sun','now-the-time-to-depart-has-come':'time-to-set-off','i-dance-to-the-morning':'dance-over-night','shoot-out-at-the-sunset-ranch':'gunfight-at-the-sunset-corral','i-will-run-and-face-tomorrow':'face-with-courage','splendid-flower-petal':'the-great-petal','draw-pilgrim':'draw-your-gun','get-ready-for-a-pow-wow':'me-ready-for-pow-wow','you-in-heap-big-trouble':'you-and-he-big-trouble'};
const base=n=>{const t=tune(n);return SAME[t]||t;};
let songs=null;
function songList(){return songs||(songs=Object.keys(USER_PORTRAITS).filter(k=>k.startsWith('music:sunset-song-')).map(k=>k.slice(13)));}
const moodOf=n=>Object.keys(MOODS).find(m=>MOODS[m].includes(tune(n)))||null;
// per mood: every song once before any repeats, never the same tune twice running (kept between games)
const bags={},recent=[];
function pickSong(mood){const all=songList().filter(n=>moodOf(n)===mood);if(!all.length)return null;
 let bag=bags[mood];if(!bag||!bag.length){bag=bags[mood]=[...all];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}}
 let k=bag.length-1;while(k>0&&recent.includes(base(bag[k])))k--;const n=bag.splice(k,1)[0];recent.unshift(base(n));recent.length=Math.min(recent.length,3);return n;}
const VERSIONS=['genesis','snes'];
const FADE=1.6,HOLD_DOWN=8,MIN_PLAY=15;   // seconds: crossfade, a calmer moment must last this long, and a song plays at least this long before it is left for a calmer one
// The music director (like Bucketheadland's): the game says what is going on with mood(); the songs change only when that
// really changes (up to tense at once, down after a calm spell), with a crossfade, and otherwise play out to their end, then
// the next song of the same mood. Leaving a song for a moment keeps its place: coming back resumes it where it was.
function createSunsetMusic(paused=()=>false){
 const ok=typeof Audio!=='undefined';const els=new Map();   // song → its own element, so a resume keeps its place
 const element=n=>{let el=els.get(n);if(!el&&ok){el=new Audio(url(n));el.preload='auto';el.volume=0;els.set(n,el);}return el;};
 let lead=null,level=null,want='play',wantAt=0,switchAt=0,stopped=false,started=false,held=false,sting=null,clock=0;const mem={},fading=new Set();
 const vol=n=>Math.max(0,Math.min(1,gain(n)));
 // equal-power fade on the element's volume (iOS ignores el.volume: there the songs cut instead of fading)
 function fade(n,to,secs,done){const el=element(n);if(!el)return;clearInterval(el._fi);const from=el.volume,t0=Date.now();fading.add(n);
  el._fi=setInterval(()=>{const k=Math.min(1,(Date.now()-t0)/1000/secs),v=to>from?from+(to-from)*Math.sin(k*Math.PI/2):to+(from-to)*Math.cos(k*Math.PI/2);
   try{el.volume=Math.max(0,Math.min(1,v));}catch{}if(k>=1){clearInterval(el._fi);fading.delete(n);done?.();}},50);}
 function playSong(n,at=0){const el=element(n);if(!el||!url(n))return false;el.onended=()=>{if(lead===n){mem[level]=null;lead=null;next();}};
  el.onerror=()=>{if(lead===n){lead=null;setTimeout(next,500);}};
  try{if(at>0&&el.duration&&at<el.duration-4)el.currentTime=at;else el.currentTime=0;}catch{}
  el.volume=0;if(!held)el.play()?.catch?.(()=>{});lead=n;switchAt=clock;fade(n,vol(n),at>0?FADE:.25);return true;}
 function leave(){if(!lead)return;const n=lead,el=element(n);mem[level]={n,t:el?.currentTime||0};lead=null;fade(n,0,FADE,()=>{try{el.pause();}catch{}});}
 function next(){if(stopped||sting||!started||!on('music'))return;level=want;const m=mem[level];mem[level]=null;
  if(m&&playSong(m.n,Math.max(0,m.t-1.5)))return;const n=pickSong(level);if(n)playSong(n);}
 function go(){leave();next();}
 const watch=setInterval(()=>{if(stopped)return;clock+=.25;
  const p=paused()||!on('music'),live=[lead,...fading].filter(Boolean).map(element).filter(Boolean);
  if(sting){const el=sting.el;if(p&&!el.paused)try{el.pause();}catch{}else if(!p&&el.paused&&!sting.done)el.play()?.catch?.(()=>{});return;}
  if(p){if(!held){held=true;for(const el of live)try{el.pause();}catch{}}return;}
  if(held){held=false;for(const el of live)el.play()?.catch?.(()=>{});}
  if(!started)return;if(!lead){next();return;}
  if(want===level)return;
  const up=RANK[want]>RANK[level],since=clock-wantAt;
  if(up?since>=.5:since>=HOLD_DOWN&&clock-switchAt>=MIN_PLAY)go();},250);
 return {
  start(){started=true;next();},
  // what is going on in the game now: 'calm' | 'play' | 'tense' (cheap to call every frame)
  mood(m){if(!RANK.hasOwnProperty(m)||m===want)return;want=m;wantAt=clock;},
  // kind = wanted | yippie | gameover; the songs fade out under it; then() runs when it ends, also at once if it can't play
  sting(kind,then=null){const n=`sting-${kind}-${VERSIONS[Math.floor(Math.random()*2)]}`;
   if(lead){const k=lead;mem[level]={n:k,t:element(k)?.currentTime||0};lead=null;fade(k,0,.35,()=>{try{element(k).pause();}catch{}});}
   const el=ok&&url(n)&&on('music')&&!stopped?new Audio(url(n)):null;if(!el){then?.();return;}
   sting={n,el,done:false};el.volume=vol(n);el.onended=el.onerror=()=>{if(sting?.el!==el)return;sting.done=true;sting=null;then?.();};el.play()?.catch?.(()=>{});},
  song:()=>sting?sting.n:lead,mood_:()=>({want,level}),
  playing:()=>{const el=sting?sting.el:lead&&element(lead);return !!el&&!el.paused;},
  get el(){return sting?sting.el:lead&&element(lead);},
  voices:()=>[...VOICE.values()].filter(Boolean).length,
  stop(){if(stopped)return;stopped=true;clearInterval(watch);const all=[...els.values(),sting?.el].filter(Boolean);sting=null;lead=null;
   for(const el of all){el.onended=el.onerror=null;clearInterval(el._fi);let v=el.volume;const f=setInterval(()=>{v-=.08;if(v>0){try{el.volume=v;}catch{}return;}clearInterval(f);try{el.pause();el.removeAttribute('src');el.load();}catch{}},30);}},
 };
}
const VOICE=new Map();
function loadVoice(name){const a=audioContext();if(!a||VOICE.has(name)||!url('voice-'+name))return;VOICE.set(name,null);
 fetch(url('voice-'+name)).then(r=>r.arrayBuffer()).then(b=>a.decodeAudioData(b)).then(buf=>VOICE.set(name,buf)).catch(()=>VOICE.delete(name));}
function preloadSunsetVoices(){for(const k of Object.keys(USER_PORTRAITS))if(k.startsWith('music:sunset-voice-'))loadVoice(k.slice(19));}
function sunsetVoice(name,{vol=1,delay=0,pan=0}={}){if(!on('sound'))return true;const a=audioContext(),buf=VOICE.get(name);if(!a||!buf){loadVoice(name);return false;}
 const s=a.createBufferSource(),g=a.createGain();s.buffer=buf;g.gain.value=gain('voice-'+name)*vol;s.connect(g);
 if(pan&&a.createStereoPanner){const p=a.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(a.destination);}else g.connect(a.destination);
 s.start(a.currentTime+delay);return true;}
Object.assign(exports,{createSunsetMusic,preloadSunsetVoices,sunsetVoice});