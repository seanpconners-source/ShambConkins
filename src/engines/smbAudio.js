// Super Mario Bros.: the owner's NES rips (assets/music/smb-song-<name>.mp3, smb-sfx-<name>.wav; USER_PORTRAITS['music:...']).
// Worked like the cartridge: one area song at a time, cut hard, never faded; sound effects sit on the NES's channels, so a
// new one on a channel cuts the one before it (see CH); the same song starts over on a new area. A sound whose file isn't
// in yet returns false and the game plays its old synth sound.
// The rips are several passes of each song. `loop` = [back to here, from here], one period apart, measured from the
// repetition; the file stops just after it. Repeats aren't sample-exact (the NES's noise channel), so the join is a short
// crossfade on the audio clock. `head` = the silence before the music; the hurry rips open with the hurry-up jingle and
// `skip` is where it ends, for when a hurry song starts again later (a new area, the star running out).
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");

const SONGS={
 over:{head:1,loop:[10.3,96.7057]},
 under:{head:.5,loop:[1,13.598]},
 castle:{head:.5,loop:[1,9.0036]},
 star:{head:.5,loop:[2,11.5991]},
 'over-hurry':{head:.5,skip:3.35,loop:[7.2,64.8042]},
 'under-hurry':{head:.5,skip:3.35,loop:[3.7,20.499]},
 'castle-hurry':{head:.5,skip:3.35,loop:[3.7,10.103]},
 'star-hurry':{head:.5,skip:3.35,loop:[5,14.5991]},
 clear:{head:.5},'castle-clear':{head:.5},tunnel:{head:.5}
};
// file: [channel, volume, ms of silence at the start of the rip]. Channels as in the game's sound engine: 1 = square 1,
// 2 = square 2, 3 = noise, 0 = the event music (death, game over)
const SFX={jumpsmall:[1,1.4,24],jump:[1,1.4,12],bump:[1,1.4,16],stompswim:[1,1.8,32],kickkill:[1,1.4,37],pipepowerdown:[1,1.4,18],fireball:[1,1.4,21],flagpole:[1,1.6,10],
 coin:[2,1.4,21],item:[2,1.4,34],powerup:[2,1.4,26],'1up':[2,1.4,31],beep:[2,1.4,17],billfirework:[2,1.2,16],brick:[3,1.2,26],fire:[3,1.2,8],bowserfall:[0,1.2,12],
 death:[0,.7,29],gameover:[0,.9,17],pause:[0,1.4,20]};
const LEVEL=.85,XF=.08;
const sfxOn=()=>!!store.profile?.settings?.sound,musicOn=()=>!!store.profile?.settings?.music;
const songURL=n=>USER_PORTRAITS['music:smb-song-'+n]||null,sfxURL=n=>USER_PORTRAITS['music:smb-sfx-'+n]||null;
const curveIn=new Float32Array(16),curveOut=new Float32Array(16);for(let i=0;i<16;i++){const k=i/15*Math.PI/2;curveIn[i]=Math.sin(k);curveOut[i]=Math.cos(k);}
const bufs=new Map(),fx=new Map(),chans=new Map();
let session=null,want=null,song=null,one=null,jingleNext=false,watch=0,suspended=false,held=false,manual=false,lastTick=0;

function decode(url){const a=audioContext();if(!a||!url)return null;return fetch(url).then(r=>r.arrayBuffer()).then(b=>a.decodeAudioData(b)).catch(()=>null);}
function loadSong(n){let p=bufs.get(n);if(!p&&(p=decode(songURL(n))))bufs.set(n,p);return p||null;}
function open(s){session=s;if(musicOn())for(const n of Object.keys(SONGS))loadSong(n);
 if(sfxOn())for(const n of Object.keys(SFX))if(!fx.has(n)){fx.set(n,null);decode(sfxURL(n))?.then(b=>{if(b)fx.set(n,b);});}}
// ---------------- sound effects
function play(n){const buf=fx.get(n),a=buf&&sfxOn()&&audioContext();if(!a)return false;const [ch,vol,lead]=SFX[n];
 try{const old=chans.get(ch),t=a.currentTime;if(old){old.g.gain.setTargetAtTime(0,t,.004);old.src.stop(t+.03);}
  const src=a.createBufferSource(),g=a.createGain();src.buffer=buf;g.gain.value=vol;src.connect(g);g.connect(a.destination);src.start(t,lead/1000);
  const v={src,g};chans.set(ch,v);src.onended=()=>{if(chans.get(ch)===v)chans.delete(ch);};return true;}catch{return false;}}
function hush(){for(const v of chans.values())try{v.src.stop();}catch{}chans.clear();}
// ---------------- jingles: the level-clear fanfares, played once on top of the silence the game leaves for them
function jingle(n){const a=musicOn()&&audioContext();if(!a)return false;const p=loadSong(n);if(!p)return false;const mine={};one=mine;
 p.then(buf=>{if(one!==mine||!buf)return;try{const src=a.createBufferSource(),g=a.createGain();src.buffer=buf;g.gain.value=LEVEL;src.connect(g);g.connect(a.destination);src.start(a.currentTime,SONGS[n].head);mine.src=src;src.onended=()=>{if(one===mine)one=null;};}catch{one=null;}});return true;}
const jingleOn=()=>!!one;
function stopJingle(){const j=one;one=null;try{j?.src?.stop();}catch{}}
// ---------------- the area song
function segment(S,when,from,join){const a=S.a,L=S.def.loop,t0=Math.max(when,a.currentTime+.01),pad=XF/2,stopAt=t0+L[1]-from+pad;
 try{const src=a.createBufferSource(),g=a.createGain();src.buffer=S.buf;src.connect(g);g.connect(S.out);
  if(join)g.gain.setValueCurveAtTime(curveIn,t0,XF);g.gain.setValueCurveAtTime(curveOut,stopAt-XF,XF);
  src.start(t0,from,stopAt-t0);S.parts.push({src,when:t0,from,stopAt});S.next=stopAt-XF;}catch{}}
function startSong(n,buf,from){const a=audioContext();if(!a||!buf)return;const out=a.createGain();out.gain.value=LEVEL;out.connect(a.destination);
 const S={name:n,def:SONGS[n],buf,a,out,parts:[],next:0,pos:from,paused:false};song=S;if(suspended)S.paused=true;else segment(S,a.currentTime,from,false);}
function dropSong(){const S=song;if(!S)return;song=null;for(const p of S.parts)try{p.src.stop();}catch{}try{S.out.disconnect();}catch{}}
const songPos=S=>{const now=S.a.currentTime;let cur=null;for(const p of S.parts)if(p.when<=now&&(!cur||p.when>cur.when))cur=p;return cur?cur.from+now-cur.when:S.pos;};
function pauseSong(){const S=song;if(!S||S.paused)return;S.pos=songPos(S);S.paused=true;for(const p of S.parts)try{p.src.stop();}catch{}S.parts=[];}
function resumeSong(){const S=song;if(!S||!S.paused)return;S.paused=false;const L=S.def.loop;segment(S,S.a.currentTime+.02,S.pos>L[1]-XF*2?L[0]:S.pos,true);}
function pump(){const S=song;if(!S||S.paused)return;const now=S.a.currentTime;S.parts=S.parts.filter(p=>p.stopAt>now-.1);if(S.next-now<1)segment(S,S.next,S.def.loop[0]-XF/2,true);}
// the song this moment wants (null = silence); safe to call every frame
function music(n){n=n&&musicOn()&&songURL(n)?n:null;if(n===want)return;want=n;dropSong();if(!n)return;const d=SONGS[n];let from=d.skip||d.head;if(d.skip&&jingleNext){from=d.head;jingleNext=false;}
 stopJingle();loadSong(n)?.then(buf=>{if(want===n&&!song)startSong(n,buf,from);});}
// time is running out: the next hurry song starts from its jingle. False when the music is off (the game beeps instead)
function hurry(){if(!musicOn())return false;jingleNext=true;return true;}
// ---------------- pause
const hold=v=>{held=!!v;};
function wake(){suspended=false;if(manual){manual=false;play('pause');}resumeSong();}
function tick(){lastTick=performance.now();if(suspended&&!document.hidden)wake();
 if(!watch)watch=setInterval(()=>{const stopped=!!session?.paused&&!held,idle=document.hidden||stopped;
  if(idle&&!suspended){suspended=true;manual=stopped&&!document.hidden;pauseSong();if(manual)play('pause');}pump();},100);}
function stopAll(){clearInterval(watch);watch=0;suspended=false;held=false;manual=false;want=null;jingleNext=false;dropSong();stopJingle();hush();bufs.clear();fx.clear();session=null;}
const nowPlaying=()=>({want,name:song?.name||null,pos:song?songPos(song):0,paused:!!song?.paused,jingle:!!one,sfx:[...fx.values()].filter(Boolean).length});
Object.assign(exports,{SONGS,SFX,open,play,hush,jingle,jingleOn,music,hurry,hold,tick,stopAll,nowPlaying});
