const {store}=require("src/state.js");
const {hash}=require("src/utils.js");
const {pairPace}=require("src/pairs.js");
const music=require("src/music.js");
let context=null,zone='mind',playing=false;
function audioContext(){if(!store.profile?.settings.sound&&!store.profile?.settings.music)return null;try{context ||= new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume();return context;}catch{return null;}}
function tone(frequency=440,duration=.07,volume=.035,type='sine'){const a=audioContext();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(volume,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+duration);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+duration);}
function sound(name='tap'){if(!store.profile?.settings.sound)return;const notes={tap:[330],tick:[440],pickup:[784,1047],handoff:[392,523],start:[659,988],win:[523,659,784],lose:[240,190],unlock:[392,523,659,784],roll:[150,210,280],shot:[90],card:[220,330],rare:[180,360,540,720]};(notes[name]||notes.tap).forEach((n,i)=>setTimeout(()=>tone(n,.1,.028,name==='shot'?'sawtooth':'sine'),i*65));}
function vibrate(ms=12){try{navigator.vibrate?.(store.profile?.settings.reducedMotion?0:ms);}catch{}}
// Per-level playlists (track ids -> names). Tracks live in src/data/musicTracks.js.
const ZONE_MUSIC=Object.fromEntries(Object.entries(music.PLAYLISTS).map(([z,ids])=>[z,{tracks:ids,names:ids.map(id=>music.TRACKS[id].name),name:music.TRACKS[ids[0]].name}]));
// Small "now playing" chip when a track starts (board only, never during a minigame).
let chip=null,chipTimer=0;
function showTrackName(track){
 if(!playing||store.session||document.hidden||!document.body)return;
 try{chip ||= Object.assign(document.createElement('div'),{className:'music-chip'});chip.setAttribute('aria-hidden','true');
  chip.textContent=`♪ ${track.name}${track.by&&track.by!=='original'?' · '+track.by:''}`;document.body.append(chip);
  chip.classList.remove('show');void chip.offsetWidth;chip.classList.add('show');clearTimeout(chipTimer);chipTimer=setTimeout(()=>chip?.classList.remove('show'),3600);}catch{}
}
music.configureMusic({
 getContext:()=>store.profile?.settings.music?audioContext():null,
 paused:()=>!playing||document.hidden||!!store.session||!store.profile?.settings.music,
 pace:()=>store.run?pairPace(store.run):1,
 onTrack:showTrackName
});
// realm: mind | body | spirit | horror | upside-down | warp (warp-*) | home
function setMusicZone(realm){if(zone===realm)return;zone=realm;music.setSequencerZone(realm);}
function startMusic(){stopMusic();if(!store.profile?.settings.music)return;if(!audioContext())return;playing=true;music.setSequencerZone(zone);music.startSequencer();}
function stopMusic(){playing=false;music.stopSequencer();music.stopMetal();}
// Hardcore metal riff for a level/boss title card; background music pauses meanwhile.
// kind: a realm id or 'boss'. Returns the riff length in seconds (0 when music is off).
function playMetal(kind){if(!store.profile?.settings.music||!audioContext())return 0;try{return music.playMetalRiff(kind);}catch{return 0;}}
function stopMetal(){try{music.stopMetal();}catch{}}
function holdMusic(seconds){try{music.holdMusicFor(seconds);}catch{}}
function releaseMusic(){try{music.releaseHold();}catch{}}
function playQuartet(kind){if(!store.profile?.settings.sound&&!store.profile?.settings.music)return;if(!audioContext())return;try{music.playQuartet(kind);}catch{}}
const nowPlaying=()=>music.nowPlaying();

const pickupClocks=new WeakMap();
function pickupSound(session){const now=performance.now();if(now-(pickupClocks.get(session)??-Infinity)<85)return false;pickupClocks.set(session,now);sound('pickup');return true;}

Object.assign(exports,{audioContext,tone,sound,vibrate,ZONE_MUSIC,setMusicZone,startMusic,stopMusic,pickupSound,playMetal,stopMetal,holdMusic,releaseMusic,playQuartet,nowPlaying});
