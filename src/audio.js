const {store}=require("src/state.js");
const {hash}=require("src/utils.js");
const {pairPace}=require("src/pairs.js");
let context=null,beatTimer=null,step=0,zone='mind';
function audioContext(){if(!store.profile?.settings.sound&&!store.profile?.settings.music)return null;try{context ||= new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume();return context;}catch{return null;}}
function tone(frequency=440,duration=.07,volume=.035,type='sine'){const a=audioContext();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(volume,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+duration);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+duration);}
function sound(name='tap'){if(!store.profile?.settings.sound)return;const notes={tap:[330],tick:[440],pickup:[784,1047],handoff:[392,523],start:[659,988],win:[523,659,784],lose:[240,190],unlock:[392,523,659,784],roll:[150,210,280],shot:[90],card:[220,330],rare:[180,360,540,720]};(notes[name]||notes.tap).forEach((n,i)=>setTimeout(()=>tone(n,.1,.028,name==='shot'?'sawtooth':'sine'),i*65));}
function vibrate(ms=12){try{navigator.vibrate?.(store.profile?.settings.reducedMotion?0:ms);}catch{}}
const ZONE_MUSIC={
 mind:{base:130.81,beat:470,voice:'triangle',notes:[0,7,12,4,9,7,2,4],chord:[0,4,7],name:'Curious keys'},
 body:{base:82.41,beat:280,voice:'square',notes:[0,0,7,0,10,7,3,7],chord:[0,3,7],name:'Wild pulse'},
 spirit:{base:110,beat:640,voice:'sine',notes:[0,12,7,14,9,7,4,12],chord:[0,7,14],name:'Floating lanterns'},
 horror:{base:55,beat:570,voice:'sawtooth',notes:[0,1,6,0,13,6,1,-1],chord:[0,1,6],name:'The route below'},
 'upside-down':{base:73.42,beat:410,voice:'triangle',notes:[12,7,1,0,6,1,7,-1],chord:[0,6,13],name:'Wrong-side signal'}
};
function setMusicZone(realm){if(zone===realm)return;zone=realm;step=0;if(beatTimer)startMusic();}
function startMusic(){stopMusic();if(!store.profile?.settings.music)return;audioContext();const track=ZONE_MUSIC[zone]||ZONE_MUSIC.spirit,pace=store.run?pairPace(store.run):1;beatTimer=setInterval(()=>{if(document.hidden||store.session)return;const n=step++%track.notes.length;tone(track.base*2**(track.notes[n]/12),track.beat/1000*.75,.008,track.voice);if(n===0)track.chord.forEach(semitone=>tone(track.base*2**(semitone/12),1.1,.003,'sine'));if(zone==='body'&&n%2===0)tone(n%4===0?45:180,.09,.009,n%4===0?'sine':'triangle');},track.beat/pace);}
function stopMusic(){clearInterval(beatTimer);beatTimer=null;}

const pickupClocks=new WeakMap();
function pickupSound(session){const now=performance.now();if(now-(pickupClocks.get(session)??-Infinity)<85)return false;pickupClocks.set(session,now);sound('pickup');return true;}

Object.assign(exports,{audioContext,tone,sound,vibrate,ZONE_MUSIC,setMusicZone,startMusic,stopMusic,pickupSound});