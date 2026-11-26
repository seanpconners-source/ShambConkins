// THE EPISODE's segments (src/engines/tpir/episode.js): each part of the show (Contestants' Row, a pricing game, the Big Wheel, the
// Showcase) is one of the show's own game engines, run inside the episode's session as a CHILD session: the engine gets an object that
// looks like its session (canvas, frames, input, waits, seed, the Pause/Exit buttons of the real one) but has its own lifetime, so
// when the engine "finishes" the episode gets its scores back and carries on instead of the whole game ending. Its frame loops and
// listeners stop with it; Exit/pause of the real session still reach it.
//   runSegment(s, run, {players, solo, episode, scoreAs}) -> Promise<{scores, label, episode}|null (the session ended)>
// players: who sits in seats 0/1 for this part (a studio guest = {name, character, guest:true}); solo: s.solo to show the engine
// (kind 'cpu' makes seat 1 the computer's); episode: what the engine reads as s.episode (only = the seat that plays, etc.).
function runSegment(s,run,{players=s.players,solo=s.solo,episode={},scoreAs=null}={}){
 return new Promise(resolve=>{
  if(!s.alive)return resolve(null);
  const kid=Object.create(s);let done=false;
  kid.abort=new AbortController();kid.cleanups=[];kid.inputResets=[];kid.finished=false;kid.score=[0,0];kid.players=players;kid.solo=solo;
  kid.episode=episode;kid.fromMenu=true;kid.frameErrors=0;
  // pause/wait state: the real session's pause (Pause button) pauses the segment too
  let ownPaused=false,ownWaiting=false;
  Object.defineProperty(kid,'paused',{get(){return s.paused||ownPaused;},set(v){ownPaused=!!v;},configurable:true});
  Object.defineProperty(kid,'waiting',{get(){return s.waiting||ownWaiting;},set(v){ownWaiting=!!v;},configurable:true});
  if(scoreAs)kid.scoreAs=scoreAs;
  const end=(v)=>{if(done)return;done=true;kid.finished=true;try{kid.abort.abort();}catch{}for(const fn of kid.cleanups.splice(0))try{fn();}catch{}s.abort.signal.removeEventListener('abort',stop);resolve(v);};
  const stop=()=>end(null);
  s.abort.signal.addEventListener('abort',stop);
  kid.finish=(scores,label='')=>{if(done)return;end({scores:scores||[0,0],label,episode});};
  // the segment's own score chips: the episode keeps the real ones
  kid.setScores=()=>{};kid.updateScores=()=>{};
  Promise.resolve().then(()=>run(kid)).then(()=>{if(!done)end({scores:kid.score||[0,0],label:'',episode});}).catch(e=>{console.error('episode segment',e);end({scores:[0,0],label:'',episode,error:e});});
 });}
Object.assign(exports,{runSegment});
