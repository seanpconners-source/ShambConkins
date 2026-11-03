// Sunset Riders sounds (the owner's files, assets/music/sunset-*; README there), for any game that wants them.
// createSunsetMusic: a random song from the pool for each game, then another when it ends; `sting` plays a short jingle first.
// The pick uses Math.random on purpose: it must not touch s.random, which both phones share in an online game.
// sunsetVoice: one voice clip through WebAudio; returns false when it can't play yet, so a caller can fall back on a synth sound.
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const {SUNSET_GAIN}=require("src/data/sunsetSounds.js");
const {store}=require("src/state.js");
const {audioContext}=require("src/audio.js");
const url=n=>USER_PORTRAITS['music:sunset-'+n];
const on=k=>!!store.profile?.settings?.[k];
const gain=n=>SUNSET_GAIN[n]??.6;
let songs=null,bag=[],lastSong=null;
function songList(){return songs||(songs=Object.keys(USER_PORTRAITS).filter(k=>k.startsWith('music:sunset-song-')).map(k=>k.slice(13)));}
// every song once before any repeats, and never the same one twice running, even between games
function pickSong(){const all=songList();if(!all.length)return null;
 if(!bag.length){bag=[...all];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.length>1&&bag.at(-1)===lastSong)bag.unshift(bag.pop());}
 return lastSong=bag.pop();}
const VERSIONS=['genesis','snes'];
function createSunsetMusic(paused=()=>false){
 const el=typeof Audio==='undefined'?null:new Audio();let playing=null,stopped=false,held=false,wanted=false,fails=0;
 function play(name,done){if(stopped||!el||!url(name)||!on('music'))return false;el.onended=done;el.volume=gain(name);el.src=url(name);el.play()?.catch?.(()=>{});playing=name;held=false;return true;}
 function next(){wanted=true;const n=pickSong();if(n&&!play(n,next))playing=null;}
 if(el)el.onerror=()=>{if(stopped||!wanted||++fails>3)return;setTimeout(next,500);};
 // the pause menu, a hidden app and the Music setting all stop the song; it carries on from there, or starts if Music was off
 const watch=setInterval(()=>{if(stopped||!el)return;const p=paused()||!on('music');if(!playing){if(!p&&wanted)next();return;}
  if(p&&!held){held=true;try{el.pause();}catch{}}else if(!p&&held){held=false;el.play()?.catch?.(()=>{});}},250);
 return {
  start:next,
  // kind = wanted | yippie | gameover; then() runs when it ends, also at once if it can't play
  sting(kind,then=null){wanted=false;const name=`sting-${kind}-${VERSIONS[Math.floor(Math.random()*2)]}`;if(!play(name,then))then?.();},
  song:()=>playing,playing:()=>!!el&&!!playing&&!el.paused,el,voices:()=>[...VOICE.values()].filter(Boolean).length,
  stop(){if(stopped)return;stopped=true;clearInterval(watch);if(!el)return;el.onended=el.onerror=null;
   let v=el.volume;const fade=setInterval(()=>{v-=.08;if(v>0){el.volume=v;return;}clearInterval(fade);try{el.pause();el.removeAttribute('src');el.load();}catch{}},30);playing=null;},
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