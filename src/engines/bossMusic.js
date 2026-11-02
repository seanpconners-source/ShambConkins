// Boss fight music drop-ins (ROADMAP K22). The owner's songs go in assets/music/ and replace the synth chiptune loop:
//   boss-<bossId>.mp3            that boss's own song (whole fight)
//   boss-<bossId>-p2|p3|final.mp3 optional: switch to it when that phase starts (p2 = 2nd phase, final = FINAL PHASE)
//   boss-any.mp3, boss-any-<n>.mp3 shared pool for bosses without their own song (picked per fight from the seed)
//   boss-final.mp3               shared FINAL PHASE song (Hard/Extreme) when the boss has no -final of its own
//   boss-win.mp3 / boss-lose.mp3 one-shot stingers on the knockout / the defeat
// createBossMusic({bossId,seed,musicOn}) → {active, phase(n,last), cut(on), end(won), tick(), stop()}.
// tick() each frame; when frames stop (pause menu, hidden tab) the song pauses, and stop() when the fight is over.
// During the partner-down cutscene the song slows and drops in pitch like a tape (cut(true)).
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const url=k=>USER_PORTRAITS['music:'+k]||null;
function pool(prefix){const out=[];if(url(prefix))out.push(prefix);for(let i=1;i<=30;i++)if(url(prefix+'-'+i))out.push(prefix+'-'+i);return out;}
const hashS=str=>{let h=2166136261;for(const ch of String(str))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
// which file plays for phase n (0-based) of a fight with `last` = index of the last phase (last>=3 = has a FINAL PHASE)
function trackFor(bossId,seed,n,last){const own='boss-'+bossId,fin=last>=3&&n===last;
 if(fin&&url(own+'-final'))return own+'-final';
 if(n>=2&&url(own+'-p3'))return own+'-p3';if(n>=1&&url(own+'-p2'))return own+'-p2';
 if(url(own))return own;
 if(fin&&url('boss-final'))return 'boss-final';
 const any=pool('boss-any');return any.length?any[hashS(seed+':'+bossId)%any.length]:null;}
function fade(el,to,ms,done){const from=el.volume,t0=performance.now();const step=()=>{const k=Math.min(1,(performance.now()-t0)/ms);try{el.volume=Math.max(0,Math.min(1,from+(to-from)*k));}catch{}if(k<1)setTimeout(step,40);else done?.();};step();}
const VOL=.75;
function createBossMusic({bossId,seed,musicOn}){let cur=null,name=null,last=0,watch=0,paused=false,dead=false,slow=false;
 const active=()=>!!trackFor(bossId,seed,0,3);
 function play(k){if(dead||!musicOn())return;if(k===name)return;const old=cur;name=k;cur=null;if(old)fade(old,0,700,()=>{try{old.pause();}catch{}});
  const u=k&&url(k);if(!u)return;try{const el=new Audio(u);el.loop=true;el.volume=0;el.preservesPitch=false;el.mozPreservesPitch=false;el.webkitPreservesPitch=false;if(slow)el.playbackRate=.72;el.play()?.catch?.(()=>{});cur=el;fade(el,VOL,1200);}catch{cur=null;}}
 function sting(k){if(dead||!musicOn()||!url(k))return;try{const el=new Audio(url(k));el.volume=VOL;el.play()?.catch?.(()=>{});}catch{}}
 return{active,get playing(){return name;},
  phase(n,lastI){play(trackFor(bossId,seed,n,lastI));},
  cut(on){slow=on;if(cur)try{cur.playbackRate=on?.72:1;cur.volume=on?VOL*.6:VOL;}catch{}},
  end(won){const k=won?'boss-win':'boss-lose';if(url(k)){const old=cur;cur=null;name=null;if(old)fade(old,0,400,()=>{try{old.pause();}catch{}});sting(k);}else if(cur)fade(cur,VOL*.5,800);},
  tick(){last=performance.now();if(paused&&cur){paused=false;try{cur.play()?.catch?.(()=>{});}catch{}}
   if(!watch)watch=setInterval(()=>{if(dead)return;if(!paused&&performance.now()-last>400&&cur){paused=true;try{cur.pause();}catch{}}},250);},
  stop(){dead=true;clearInterval(watch);watch=0;const old=cur;cur=null;name=null;if(old)fade(old,0,500,()=>{try{old.pause();}catch{}});}};}
Object.assign(exports,{createBossMusic,trackFor});
