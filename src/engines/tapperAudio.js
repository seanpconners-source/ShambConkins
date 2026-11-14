// Banana Stand Tapper music + narrator drop-ins (owner, Nov 14: music and narrator clips from the show, he adds the files).
// Files go in assets/music/ (build → USER_PORTRAITS['music:<name>']; downloaded the first time the game opens, pwa.js LATER):
//   tapper-song-<level>.mp3      a level's song (level = stand | penthouse | modelhome), looped
//   tapper-song.mp3, tapper-song-<n>.mp3   shared songs for levels without their own (picked from the seed)
//   tapper-narr-<moment>-<n>.mp3 narrator clips, one picked at random when the moment comes (not every time):
//     start (a shift starts) · level (a new level's title card) · clear (level cleared) · lose (a life lost)
//     win (the game's winner) · end (closing time) · any (now and then during play)
// While a clip plays the song ducks. Nothing here plays when the files aren't in: the game is silent apart from its synth
// sounds. createTapperAudio({seed,musicOn}) → {level(id), narrate(moment,chance), tick(), stop()}.
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const url=k=>USER_PORTRAITS['music:'+k]||null;
function pool(prefix){const out=[];if(url(prefix))out.push(prefix);for(let i=1;i<=40;i++)if(url(prefix+'-'+i))out.push(prefix+'-'+i);return out;}
const hashS=str=>{let h=2166136261;for(const ch of String(str))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
function fade(el,to,ms,done){const from=el.volume,t0=performance.now();const step=()=>{const k=Math.min(1,(performance.now()-t0)/ms);try{el.volume=Math.max(0,Math.min(1,from+(to-from)*k));}catch{}if(k<1)setTimeout(step,40);else done?.();};step();}
const VOL=.6,DUCK=.22,NARR=1;
function createTapperAudio({seed,musicOn}){
 let cur=null,name=null,last=0,watch=0,paused=false,dead=false,voice=null,lastNarr=-99,vol=VOL;
 const songFor=id=>url('tapper-song-'+id)?'tapper-song-'+id:(()=>{const p=pool('tapper-song');return p.length?p[hashS(seed+':'+id)%p.length]:null;})();
 function play(k){if(dead||!musicOn()||k===name)return;const old=cur;name=k;cur=null;if(old)fade(old,0,800,()=>{try{old.pause();}catch{}});
  const u=k&&url(k);if(!u)return;try{const el=new Audio(u);el.loop=true;el.volume=0;el.play()?.catch?.(()=>{});cur=el;fade(el,voice?DUCK:vol,1200);}catch{cur=null;}}
 return{
  get playing(){return name;},get speaking(){return !!voice;},
  level(id){play(songFor(id));},
  // a narrator clip for `moment`, with probability `chance`, never two within 6 s
  narrate(moment,chance=1){if(dead||!musicOn()||voice)return false;const now=performance.now()/1000;if(now-lastNarr<6||Math.random()>chance)return false;
   const p=pool('tapper-narr-'+moment);if(!p.length)return false;lastNarr=now;
   try{const el=new Audio(url(p[Math.floor(Math.random()*p.length)]));el.volume=NARR;voice=el;if(cur)fade(cur,DUCK,300);
    const done=()=>{if(voice!==el)return;voice=null;if(cur&&!dead)fade(cur,vol,900);};el.onended=done;el.onerror=done;el.play()?.catch?.(done);}catch{voice=null;return false;}
   return true;},
  tick(){last=performance.now();if(paused){paused=false;try{cur?.play()?.catch?.(()=>{});voice?.play()?.catch?.(()=>{});}catch{}}
   if(!watch)watch=setInterval(()=>{if(dead)return;if(!paused&&performance.now()-last>400){paused=true;try{cur?.pause();voice?.pause();}catch{}}},250);},
  stop(){dead=true;clearInterval(watch);watch=0;const old=cur;cur=null;name=null;if(old)fade(old,0,500,()=>{try{old.pause();}catch{}});const v=voice;voice=null;if(v)fade(v,0,600,()=>{try{v.pause();}catch{}});}};
}
Object.assign(exports,{createTapperAudio});
