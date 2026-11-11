// Sonic: the owner's Sonic 3 & Knuckles sound rips (Mr Lange's set, 44.1 kHz, assets/music/s3k-sfx-<name>.wav ->
// USER_PORTRAITS['music:s3k-sfx-<name>']). The rips are numbered by the game's sound test; the names come from the
// sound IDs in the game's sound driver (S3K_33 = ring, S3K_62 = jump, S3K_AB = spin dash ...), checked against each
// file's length and pitch (docs: assets/music/README.md). Files are copied byte for byte, levels as ripped.
// Like the Mega Drive driver, a sound cuts the one before it in its slot (one ring at a time, one jump...), rings alternate
// left/right, and the spin dash charge rises in pitch with every rev. A sound whose file isn't in returns false and the
// game plays its old synth sound.
// MUSIC (Nov 10): the owner's Sonic 3 soundtrack (VGM recordings, assets/music/s3k-song-<name>.flac). The album's .mp3
// files are really MPEG Layer II, which browsers don't all decode, so each was decoded, cut after one pass of its loop and
// saved as FLAC (no further loss). The rest of the album (bosses, other zones, Sonic 1/2/CD) is still in Claude Share.
// One area song at a time (music(name), safe every frame); jingles on top: '1up' pauses the song and fades it back in
// where it was, like the Mega Drive driver; 'act-clear' and 'game-over' play into the silence the game leaves for them.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");

// name: [slot, volume]. Slots stand in for the driver's channels: a new sound in a slot stops the old one.
// Volumes (Nov 11, owner: sounds far louder than the music, the ring worst): the rips range from -1.6 to -19 LUFS at their
// loudest moment (ffmpeg ebur128 max momentary), so each is levelled to a target: -18 for most, -22 for rings (they come
// in strings), -21 for the moves you make all the time (jump, roll, skid, spin dash), -16/-15 for boss blows; the few too
// short to measure that way are set from their peak (-9 dBFS). Songs sit at -19 LUFS (SONGS gain), jingles -17.
const SFX={'ring-right':['ring',.168],'ring-left':['ring',.168],'ring-loss':['ring',.168],jump:['move',.58],roll:['move',.16],skid:['move',.58],
 spindash:['move',.107],dash:['move',.72],spring:['spring',.367],hurt:['hurt',.54],spike:['hurt',.34],explode:['pop',.81],break:['pop',.35],
 shield:['item',.5],'fire-shield':['item',.355],'bubble-shield':['item',.447],'lightning-shield':['item',.263],'insta-shield':['move',1.5],
 'fire-dash':['move',1],'bubble-bounce':['move',.305],'lightning-jump':['move',.457],starpost:['item',.5],signpost:['sign',.77],
 register:['sign',.237],'big-ring':['item',.437],bumper:['spring',.305],'boss-hit':['boss',.48],'boss-explode':['boss2',.58],blast:['boss2',1.26],
 crash:['pop',.54],collapse:['world',.214],switch:['world',1.46],splash:['world',1],bubble:['world',.43],drown:['hurt',.35],'air-ding':['item',.575],
 continue:['sign',.363]};
const LEVEL=1;
const sfxOn=()=>!!store.profile?.settings?.sound;
const url=n=>USER_PORTRAITS['music:s3k-sfx-'+n]||null;
const fx=new Map(),slots=new Map();
let ringSide=0;

function decode(u){const a=audioContext();if(!a||!u)return null;return fetch(u).then(r=>r.arrayBuffer()).then(b=>a.decodeAudioData(b)).catch(()=>null);}
// start decoding every sound and song (call when the game opens; s = the session, for its pause)
function open(s){if(s)session=s;if(musicOn())for(const n of Object.keys(SONGS))loadSong(n);
 if(!sfxOn())return;for(const n of Object.keys(SFX))if(!fx.has(n)){fx.set(n,null);decode(url(n))?.then(b=>{if(b)fx.set(n,b);});}}
const has=n=>!!fx.get(n);
// play a sound; opts: rate (playback speed), pan (-1..1), vol. False if the file isn't decoded (use the synth sound)
function play(n,opts={}){const buf=fx.get(n),a=buf&&sfxOn()&&audioContext();if(!a)return false;const [slot,v0]=SFX[n];
 try{const t=a.currentTime,old=slots.get(slot);if(old){old.g.gain.setTargetAtTime(0,t,.004);old.src.stop(t+.03);}
  const src=a.createBufferSource(),g=a.createGain();src.buffer=buf;if(opts.rate)src.playbackRate.value=opts.rate;
  g.gain.value=LEVEL*v0*(opts.vol??1);let last=g;
  if(opts.pan&&a.createStereoPanner){const p=a.createStereoPanner();p.pan.value=opts.pan;g.connect(p);last=p;}
  src.connect(g);last.connect(a.destination);src.start(t);const rec={src,g};slots.set(slot,rec);
  src.onended=()=>{if(slots.get(slot)===rec)slots.delete(slot);};return true;}catch{return false;}}
// a ring: alternates right/left like the game
function ring(){ringSide^=1;return play(ringSide?'ring-right':'ring-left',{pan:ringSide?.35:-.35});}
// spin dash charge: each rev a little higher (the driver raises the pitch per rev)
function rev(r){return play('spindash',{rate:Math.pow(2,Math.min(8,r)/24)});}
function hush(){for(const v of slots.values())try{v.src.stop();}catch{}slots.clear();}

// ---------------- music
// loop = [back to here, from here] in seconds, one period apart: the period is the sample lag that nearly every window
// of the decoded rip agreed on; 'back to here' sits where the two passes match best (the FM chip's phase isn't the same
// on each pass, so the join is a short crossfade). gain = to -19 LUFS integrated (jingles -17), measured with ebur128.
const SONGS={
 'green-hill':{loop:[15.4,53.84678],gain:.372},// Zone 1 Act 1 (owner's pick, Sonic 1 CD set, Mega Drive version): 14.5 s intro, period 1,695,503 samples
 'emerald-hill':{loop:[7.0,48.533855],gain:.403},// Zone 1 Act 2 (owner's pick, Sonic 2 on the Sonic 1&2 CD, Mega Drive version): period 1,831,643 samples (spectrogram lag, then the sample lag most windows agree on), joined at 7.0 s
 miniboss:{loop:[15.25,67.535215],gain:.437},// Sonic 3 Miniboss (owner's album): no clean whole-track period (the drums repeat every 8.72 s), 6 x 8.71 s = 2,305,778 samples joined at 15.25 s where both passes match (0.99)
 boss:{loop:[.95,32.949977],gain:.422},// Sonic 3 'Robotnik' (owner's album; the Act 3 boss, Nov 11 round 4): period 1,411,199 samples (32.0 s), joined at 0.95 s where both passes match (0.9986)
 'angel-island-1':{loop:[.6,66.13522],gain:.556},// Angel Island Act 1: no intro, period 2,890,103 samples
 'azure-lake':{loop:[4.5,58.89998],gain:.407},// Azure Lake (competition): 1.8 s intro, period 2,399,039 samples
 invincible:{loop:[.35,10.65238],gain:.437},// period 454,335 samples
 'data-select':{loop:[1.45,61.18347],gain:.624},// the character select: period 2,634,246 samples, 0.9 s intro
 title:{gain:.335},// the title screen: played once like the game (15.7 s), again after a pause
 '1up':{gain:.468},'act-clear':{gain:.61},'game-over':{gain:.69}};
const MUSIC=1,XF=.08;
const musicOn=()=>!!store.profile?.settings?.music;
const songURL=n=>USER_PORTRAITS['music:s3k-song-'+n]||null;
const curveIn=new Float32Array(16),curveOut=new Float32Array(16);for(let i=0;i<16;i++){const k=i/15*Math.PI/2;curveIn[i]=Math.sin(k);curveOut[i]=Math.cos(k);}
const bufs=new Map(),lens=new Map();
let session=null,want=null,song=null,one=null,watch=0,suspended=false,held=false;
function loadSong(n){let p=bufs.get(n);if(!p&&(p=decode(songURL(n)))){bufs.set(n,p);p.then(b=>{if(b)lens.set(n,b.duration);});}return p||null;}
// one stretch of the song from `from` to the loop's end; fin = seconds of fade-in (a crossfade join or a 1-up resume)
function segment(S,when,from,fin){const a=S.a,L=S.def.loop,t0=Math.max(when,a.currentTime+.01),stopAt=t0+L[1]-from+XF/2;
 try{const src=a.createBufferSource(),g=a.createGain();src.buffer=S.buf;src.connect(g);g.connect(S.out);
  if(fin){const c=new Float32Array(16);for(let i=0;i<16;i++)c[i]=fin>XF?i/15:curveIn[i];g.gain.setValueCurveAtTime(c,t0,Math.min(fin,stopAt-t0-XF-.01));}
  g.gain.setValueCurveAtTime(curveOut,stopAt-XF,XF);src.start(t0,from,stopAt-t0);S.parts.push({src,when:t0,from,stopAt});S.next=stopAt-XF;}catch{}}
function startSong(n,buf){const a=audioContext();if(!a||!buf)return;const out=a.createGain();out.gain.value=MUSIC*(SONGS[n].gain||1);out.connect(a.destination);
 const S={name:n,def:SONGS[n],buf,a,out,parts:[],next:0,pos:0,paused:false};song=S;if(suspended||one?.duck)S.paused=true;else segment(S,a.currentTime,0,0);}
function dropSong(){const S=song;if(!S)return;song=null;for(const p of S.parts)try{p.src.stop();}catch{}try{S.out.disconnect();}catch{}}
const songPos=S=>{const now=S.a.currentTime;let cur=null;for(const p of S.parts)if(p.when<=now&&(!cur||p.when>cur.when))cur=p;return cur?cur.from+now-cur.when:S.pos;};
function pauseSong(){const S=song;if(!S||S.paused)return;S.pos=songPos(S);S.paused=true;for(const p of S.parts)try{p.src.stop();}catch{}S.parts=[];}
function resumeSong(fin=XF){const S=song;if(!S||!S.paused||suspended||one?.duck)return;S.paused=false;const L=S.def.loop;segment(S,S.a.currentTime+.02,S.pos>L[1]-XF*2?L[0]:S.pos,fin);}
function pump(){const S=song;if(!S||S.paused)return;const now=S.a.currentTime;S.parts=S.parts.filter(p=>p.stopAt>now-.1);if(S.next-now<1)segment(S,S.next,S.def.loop[0]-XF/2,XF);}
// the area song this moment wants (null = silence); safe to call every frame. A change starts the new song from the top.
function music(n){n=n&&musicOn()&&songURL(n)&&SONGS[n]?.loop?n:null;if(n===want)return;want=n;dropSong();if(!n)return;
 loadSong(n)?.then(buf=>{if(want===n&&!song)startSong(n,buf);});}
// the same song again from the top (a respawn)
function restart(){const n=want;want=null;dropSong();music(n);}
// a jingle once; false when the music is off or the file isn't in
function jingle(n){const a=musicOn()&&audioContext(),p=a&&SONGS[n]&&loadSong(n);if(!p)return false;stopJingle();const duck=n==='1up',mine={duck,n};one=mine;if(duck)pauseSong();
 const done=()=>{if(one!==mine)return;one=null;if(duck)resumeSong(.6);};
 p.then(buf=>{if(one!==mine)return;if(!buf)return done();try{const src=a.createBufferSource(),g=a.createGain();src.buffer=buf;g.gain.value=MUSIC*(SONGS[n].gain||1);src.connect(g);g.connect(a.destination);
  src.start(a.currentTime);mine.src=src;src.onended=done;}catch{done();}});return true;}
function stopJingle(){const j=one;one=null;try{j?.src?.stop();}catch{}if(j?.duck)resumeSong(.3);}
// seconds a jingle lasts (0 until decoded)
const jingleLen=n=>lens.get(n)||0;
// pause: the game's pause menu, a hand-off card or the app in the background stop the song where it is
const hold=v=>{held=!!v;};
function tick(){if(suspended&&!document.hidden){suspended=false;resumeSong();}
 if(!watch)watch=setInterval(()=>{const idle=document.hidden||(!!session?.paused&&!held);if(idle&&!suspended){suspended=true;pauseSong();}pump();},100);}
function stopAll(){clearInterval(watch);watch=0;suspended=false;held=false;want=null;dropSong();const j=one;one=null;try{j?.src?.stop();}catch{}hush();fx.clear();bufs.clear();lens.clear();session=null;}
const nowPlaying=()=>({want,name:song?.name||null,pos:song?songPos(song):0,paused:!!song?.paused,parts:song?.parts.length||0,jingle:one?.n||null,songs:lens.size});
// tests: jump the song to t seconds
function seekSong(t){const S=song;if(!S||S.paused)return;for(const p of S.parts)try{p.src.stop();}catch{}S.parts=[];segment(S,S.a.currentTime+.02,t,XF);}
const loaded=()=>[...fx.values()].filter(Boolean).length;
Object.assign(exports,{SFX,SONGS,open,play,ring,rev,has,hush,stopAll,loaded,music,restart,jingle,stopJingle,jingleLen,hold,tick,nowPlaying,seekSong});
