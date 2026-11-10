// Sonic: the owner's Sonic 3 & Knuckles sound rips (Mr Lange's set, 44.1 kHz, assets/music/s3k-sfx-<name>.wav ->
// USER_PORTRAITS['music:s3k-sfx-<name>']). The rips are numbered by the game's sound test; the names come from the
// sound IDs in the game's sound driver (S3K_33 = ring, S3K_62 = jump, S3K_AB = spin dash ...), checked against each
// file's length and pitch (docs: assets/music/README.md). Files are copied byte for byte, levels as ripped.
// Like the Mega Drive driver, a sound cuts the one before it in its slot (one ring at a time, one jump...), rings alternate
// left/right, and the spin dash charge rises in pitch with every rev. A sound whose file isn't in returns false and the
// game plays its old synth sound.
const {audioContext}=require("src/audio.js");
const {store}=require("src/state.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");

// name: [slot, volume]. Slots stand in for the driver's channels: a new sound in a slot stops the old one.
const SFX={'ring-right':['ring',1],'ring-left':['ring',1],'ring-loss':['ring',1],jump:['move',1],roll:['move',.9],skid:['move',1],
 spindash:['move',1],dash:['move',1],spring:['spring',1],hurt:['hurt',1],spike:['hurt',1],explode:['pop',1],break:['pop',1],
 shield:['item',1],'fire-shield':['item',1],'bubble-shield':['item',1],'lightning-shield':['item',1],'insta-shield':['move',1],
 'fire-dash':['move',1],'bubble-bounce':['move',1],'lightning-jump':['move',1],starpost:['item',1],signpost:['sign',1],
 register:['sign',1],'big-ring':['item',1],bumper:['spring',1],'boss-hit':['boss',1],'boss-explode':['boss2',1],blast:['boss2',1],
 crash:['pop',1],collapse:['world',1],switch:['world',1],splash:['world',1],bubble:['world',1],drown:['hurt',1],'air-ding':['item',1],
 continue:['sign',1]};
const LEVEL=.9;
const sfxOn=()=>!!store.profile?.settings?.sound;
const url=n=>USER_PORTRAITS['music:s3k-sfx-'+n]||null;
const fx=new Map(),slots=new Map();
let ringSide=0;

function decode(u){const a=audioContext();if(!a||!u)return null;return fetch(u).then(r=>r.arrayBuffer()).then(b=>a.decodeAudioData(b)).catch(()=>null);}
// start decoding every sound (call when the game opens)
function open(){if(!sfxOn())return;for(const n of Object.keys(SFX))if(!fx.has(n)){fx.set(n,null);decode(url(n))?.then(b=>{if(b)fx.set(n,b);});}}
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
function stopAll(){hush();fx.clear();}
const loaded=()=>[...fx.values()].filter(Boolean).length;
Object.assign(exports,{SFX,open,play,ring,rev,has,hush,stopAll,loaded});
