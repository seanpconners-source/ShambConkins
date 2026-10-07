const {store}=require("src/state.js");
const {hash}=require("src/utils.js");
const {pairPace}=require("src/pairs.js");
const music=require("src/music.js");
const pk=require("src/pkmn/pkmnAudio.js");
let context=null,zone='home',playing=false;
function audioContext(){if(!store.profile?.settings.sound&&!store.profile?.settings.music)return null;try{context ||= new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume();return context;}catch{return null;}}
function tone(frequency=440,duration=.07,volume=.035,type='sine'){const a=audioContext();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(volume,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+duration);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+duration);}
function sound(name='tap'){if(!store.profile?.settings.sound)return;const notes={tap:[330],tick:[440],pickup:[784,1047],handoff:[392,523],start:[659,988],win:[523,659,784],lose:[240,190],unlock:[392,523,659,784],roll:[150,210,280],shot:[90],card:[220,330],rare:[180,360,540,720]};(notes[name]||notes.tap).forEach((n,i)=>setTimeout(()=>tone(n,.1,.028,name==='shot'?'sawtooth':'sine'),i*65));}
function vibrate(ms=12){try{navigator.vibrate?.(store.profile?.settings.reducedMotion?0:ms);}catch{}}
// Small "now playing" chip when a track starts (board only, never during a minigame).
let chip=null,chipTimer=0;
function showTrackName(track){
 if(!playing||store.session||document.hidden||!document.body)return;
 try{chip ||= Object.assign(document.createElement('div'),{className:'music-chip'});chip.setAttribute('aria-hidden','true');
  chip.textContent=`♪ ${track.name}${track.by?' · '+track.by:''}`;document.body.append(chip);
  chip.classList.remove('show');void chip.offsetWidth;chip.classList.add('show');clearTimeout(chipTimer);chipTimer=setTimeout(()=>chip?.classList.remove('show'),3600);}catch{}
}
music.configureMusic({
 getContext:()=>store.profile?.settings.music?audioContext():null,
 paused:()=>!playing||document.hidden||!!store.session||!store.profile?.settings.music,
 pace:()=>store.run?pairPace(store.run):1,
 onTrack:showTrackName,
 scene:()=>sceneProvider?.()
});
// app.js supplies the current player's surroundings ({biome, place}) so the score follows the board.
let sceneProvider=null;
function setMusicScene(fn){sceneProvider=fn;}
// realm: mind | body | spirit | horror | upside-down | warp (warp-<board id>) | home
// The Pokémon warp zone plays its own chiptune route theme instead of the generative score.
function setMusicZone(realm){if(realm==='warp'&&store.run?.warp?.id)realm='warp-'+store.run.warp.id;if(zone===realm)return;const was=zone;zone=realm;
 if(realm==='warp-pokemon'){if(playing){music.stopSequencer();pk.playSong('route');}return;}
 if(was==='warp-pokemon'){pk.stopSong();music.setSequencerZone(realm);if(playing)music.startSequencer();return;}
 music.setSequencerZone(realm);}
function startMusic(){stopMusic();if(!store.profile?.settings.music)return;if(!audioContext())return;playing=true;if(zone==='warp-pokemon'){pk.playSong('route');return;}music.setSequencerZone(zone);music.startSequencer();}
function stopMusic(){playing=false;music.stopSequencer();music.stopMetal();if(pk.songPlaying()==='route')pk.stopSong();}
// Hardcore metal riff for a level/boss title card; background music pauses meanwhile.
// kind: a realm id or 'boss'. Returns the riff length in seconds (0 when music is off).
function playMetal(kind){if(!store.profile?.settings.music||!audioContext())return 0;try{return music.playMetalRiff(kind);}catch{return 0;}}
function stopMetal(){try{music.stopMetal();}catch{}}
function holdMusic(seconds){try{music.holdMusicFor(seconds);}catch{}}
function releaseMusic(){try{music.releaseHold();}catch{}}
function playQuartet(kind){if(!store.profile?.settings.sound&&!store.profile?.settings.music)return;if(!audioContext())return;try{music.playQuartet(kind);}catch{}}
// Triumphant little ditty when a character joins (plays with either sound or music on).
function playFanfare(){if(!store.profile?.settings.sound&&!store.profile?.settings.music)return 0;const a=audioContext();if(!a)return 0;try{return music.playFanfare(a);}catch{return 0;}}
const nowPlaying=()=>music.nowPlaying();

const pickupClocks=new WeakMap();
function pickupSound(session){const now=performance.now();if(now-(pickupClocks.get(session)??-Infinity)<85)return false;pickupClocks.set(session,now);sound('pickup');return true;}

Object.assign(exports,{audioContext,tone,sound,vibrate,setMusicZone,setMusicScene,playFanfare,startMusic,stopMusic,pickupSound,playMetal,stopMetal,holdMusic,releaseMusic,playQuartet,nowPlaying});
