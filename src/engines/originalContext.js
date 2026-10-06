const {clamp, escapeHTML, shuffle, seededRandom}=require("src/utils.js");
const {character}=require("src/characters.js");
const {sound, vibrate, tone}=require("src/audio.js");
const {store}=require("src/state.js");
// Original engines run inside the current session: one clock, one input scope,
// and complete cleanup on pause, exit, or completion. No old dispatcher runs.
function originalContext(s) {
 if(['lightcycle','fruitmerge','sumo','dualrace','snakeduel','moneygrab','sword2p','ballrun2p','battleroyale','sewer'].includes(s.game.engine)){s.shared=true;s.updateScores();}
 const releaseControls=()=>{for(const b of document.getElementById('game-controls')?.querySelectorAll('button')||[])b.onpointercancel?.({pointerId:0,preventDefault(){}});};
 s.on(window,'blur',releaseControls);s.resetOnPause?.(releaseControls);s.cleanup(releaseControls);
 let now=0,id=0,accumulator=0,rng=seededRandom(s.seed),resultSent=false;
 const rafs=new Map(),jobs=new Map();
 const performance={now:()=>now},Math=Object.create(globalThis.Math);Math.random=()=>rng();
 const requestAnimationFrame=fn=>{rafs.set(++id,fn);return id;};
 const cancelAnimationFrame=id=>rafs.delete(id);
 const schedule=(fn,ms,repeat)=>{jobs.set(++id,{fn,ms:Math.max(1,ms||1),at:now+Math.max(1,ms||1),repeat});return id;};
 const setTimeout=(fn,ms)=>schedule(fn,ms,false),setInterval=(fn,ms)=>schedule(fn,ms,true),clearTimeout=id=>jobs.delete(id),clearInterval=clearTimeout;
 s.cleanup(()=>{jobs.clear();rafs.clear();});
 s.frame(dt=>{accumulator+=dt*1000;for(let ticks=0;ticks<6&&accumulator>=1000/60&&s.alive;ticks++){accumulator-=1000/60;now+=1000/60;for(const [key,job]of [...jobs])if(now>=job.at&&jobs.has(key)){if(job.repeat)job.at+=job.ms;else jobs.delete(key);job.fn();if(!s.alive)return;}const callbacks=[...rafs];rafs.clear();for(const [,fn]of callbacks){fn(now);if(!s.alive)return;}
  if(s.debug.originalScore)s.setScores(s.debug.originalScore());
 }});
 const q=id=>document.getElementById(id),state={players:s.players,current:s.active},profile=store.profile;
 const mgDone=(winner,label='',reward=null,rawScore=null)=>{if(resultSent||!s.alive)return;resultSent=true;if(Array.isArray(rawScore)&&rawScore.length===2&&rawScore.every(Number.isFinite))return s.finish([...rawScore],label);const score=winner===null?[0,0]:winner===0?[1,0]:[0,1],match=label.match(/(\d+)\s*[–−-]\s*(\d+)/);if(match){if(winner===1){score[1]=+match[1];score[0]=+match[2];}else{score[0]=+match[1];score[1]=+match[2];}}s.finish(score,label);};
 const canvasSetup=()=>{const [c,x,W,H]=s.canvas(680,360);c.width=W;c.height=H;return [c,x,q('game-controls'),q('game-status'),W,H];};
 const openMG=(game,html)=>{s.body.innerHTML=html;};
 const toast=html=>{const plain=String(html).replace(/<[^>]*>/g,'');if(/pass/i.test(plain)){rng=seededRandom(s.seed);void s.pass(1,plain);}else s.hint(plain);};
 const coneSVG=(color,size=1,number='')=>`<span style="color:${escapeHTML(color)};font-size:${48*size}px">▲</span><b>${number}</b>`;
 const rgba=(color,alpha)=>color.startsWith('#')&&color.length===7?color+Math.round(clamp(alpha,0,1)*255).toString(16).padStart(2,'0'):color;
 return {canvasSetup,q,$:q,state,profile,clamp,mgDone,sp:sound,sfx:sound,hp:vibrate,vib:vibrate,beepFx:sound,buzz:vibrate,playSfx:sound,haptic:vibrate,beep:tone,toast,openMG,coneSVG,esc17:escapeHTML,getTime:()=>now,shuffle17:values=>shuffle(values,Math.random),char:character,rgba,sprite:()=>null,drawPlayer:(x,i,cx,cy,size,mood)=>s.sprite(x,i,cx,cy-size*.65,size,{mood:mood==='walk'?'walking':mood==='idle'?'normal':mood}),requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math};
}

Object.assign(exports,{originalContext});