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
// Browsers start an AudioContext suspended until a user gesture (iOS also wants resume() called inside it),
// so music started at launch stays silent until then: resume the context on the first taps/keys.
function installAudioUnlock(){
 const evs=['pointerdown','touchend','keydown','click'],off=()=>evs.forEach(e=>document.removeEventListener(e,unlock,true));
 function unlock(){const a=(playing||context)?audioContext():null;if(!a){if(!store.profile?.settings.music&&!store.profile?.settings.sound)off();return;}
  try{const b=a.createBufferSource();b.buffer=a.createBuffer(1,1,22050);b.connect(a.destination);b.start(0);}catch{}
  if(a.state==='running')off();else a.resume?.().then(()=>{if(a.state==='running')off();}).catch(()=>{});}
 evs.forEach(e=>document.addEventListener(e,unlock,true));
}
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

// Breaking glass: a bright noise crack, a low thud and a scatter of tinkling shards. Synthesised, no samples.
let glassNoise=null;
function glassSmash(volume=.5){
 if(!store.profile?.settings.sound)return;const a=audioContext();if(!a)return;const t=a.currentTime;
 if(!glassNoise){glassNoise=a.createBuffer(1,Math.floor(a.sampleRate*.6),a.sampleRate);const d=glassNoise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.2);}
 const out=a.createGain();out.gain.value=volume;out.connect(a.destination);
 const n=a.createBufferSource(),hp=a.createBiquadFilter(),ng=a.createGain();n.buffer=glassNoise;hp.type='highpass';hp.frequency.value=2600;ng.gain.setValueAtTime(.9,t);ng.gain.exponentialRampToValueAtTime(.001,t+.45);n.connect(hp);hp.connect(ng);ng.connect(out);n.start(t);n.stop(t+.5);
 const o=a.createOscillator(),og=a.createGain();o.type='sine';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);og.gain.setValueAtTime(.7,t);og.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(og);og.connect(out);o.start(t);o.stop(t+.18);
 for(let i=0;i<9;i++){const at=t+.01+Math.random()*.32,s=a.createOscillator(),g=a.createGain();s.type=i%2?'triangle':'sine';s.frequency.value=2200+Math.random()*4800;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.16+Math.random()*.12,at+.004);g.gain.exponentialRampToValueAtTime(.0001,at+.07+Math.random()*.12);s.connect(g);g.connect(out);s.start(at);s.stop(at+.22);}
}
Object.assign(exports,{installAudioUnlock,glassSmash,audioContext,tone,sound,vibrate,setMusicZone,setMusicScene,playFanfare,startMusic,stopMusic,pickupSound,playMetal,stopMetal,holdMusic,releaseMusic,playQuartet,nowPlaying});
