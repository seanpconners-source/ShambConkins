// Side-by-side games online (s.online): this phone plays only its own field (s.online.me); the other field is drawn from
// the other phone's snapshots. pack(i) → this phone's field as plain data, unpack(i,data) → show the other field.
// Snapshots {f} go out about hz times a second when something changed (push() sends one now, e.g. right after a key
// moment); {e} carries game events (Tetris garbage...); {fin} is the other field's final result (finish() / remoteDone()).
// sync(tag) resolves once both phones have reached the same point (e.g. both tapped Ready) — the arena games' host waits on it.
// start(tag) is sync plus a start at the same moment on both phones: seat 1 times three pings, sends go and starts half a
// round trip later; the other phone starts when go arrives. Arena games stamp events with the time since start().
const {isOnline}=require("src/engines/cpuKit.js");
function netField(s,{pack,unpack,onEvent=null,hz=10}){
 const net=isOnline(s)?s.online:null;if(!net)return null;s.hotseat=true;
 let wait=0,last='',gone=false;const waiters=[],got=new Set(),sigWait=new Map();
 const mark=k=>{got.add(k);sigWait.get(k)?.();sigWait.delete(k);},signal=k=>got.has(k)||gone?Promise.resolve():new Promise(r=>sigWait.set(k,r));
 const nf={me:net.me,remote:net.remote,fin:undefined,
  push(){const st=pack(nf.me),k=JSON.stringify(st);wait=1/hz;if(k===last)return;last=k;net.send({f:st});},
  tick(dt){wait-=dt;if(wait<=0)nf.push();},
  event(e){net.send({e});},
  finish(v){nf.push();net.send({fin:v});},
  sync(tag='go'){net.send({e:{__s:tag}});return signal('s'+tag);},
  async start(tag='go'){await nf.sync(tag);if(gone||!s.alive)return;
   if(net.me!==0)return signal('g'+tag);
   let best=Infinity;for(let k=0;k<3&&!gone;k++){const t0=performance.now();net.send({e:{__p:tag+'#'+k}});await signal('q'+tag+'#'+k);best=Math.min(best,performance.now()-t0);}
   net.send({e:{__g:tag}});if(Number.isFinite(best)&&best>1)await new Promise(r=>setTimeout(r,best/2));},
  get gone(){return gone;},
  // the other phone's final result (null if they left)
  remoteDone(){return nf.fin!==undefined?Promise.resolve(nf.fin):gone?Promise.resolve(null):new Promise(r=>waiters.push(r));}};
 void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive){gone=true;for(const r of waiters.splice(0))r(null);for(const r of sigWait.values())r();sigWait.clear();return;}
  if(m.f!==undefined)unpack(nf.remote,m.f);
  else if(m.e!==undefined){const e=m.e;if(e?.__s!==undefined)mark('s'+e.__s);else if(e?.__p!==undefined)net.send({e:{__q:e.__p}});else if(e?.__q!==undefined)mark('q'+e.__q);else if(e?.__g!==undefined)mark('g'+e.__g);else onEvent?.(e);}
  else if(m.fin!==undefined){nf.fin=m.fin;for(const r of waiters.splice(0))r(m.fin);}}})();
 return nf;
}
// One round of an arena game online where each phone judges only its own player's death. Times are seconds since the
// round's start(). die(t, extra) = this phone's player went down (final at once: shots and blasts only reach a phone when
// they're real there, so a death is never found late); feed(o) takes the other phone's {o:[round,'f',ms|-1,extra]}; tick(now)
// declares this phone alive (-1) once its clock passes their death by `tie`, and returns the result once both are in:
// 'me', 'them' or 'none' (both down within tie, or both still up at time-up). timeUp(extra) = this phone's round clock ran out.
// R.frozen: this phone's player is out of the round (stop moving it). R.theirExtra: what the other phone sent with its out.
function roundOutcome(nf,round,{tie=.1}={}){
 const R={round,out:null,theirOut:null,theirDead:null,extra:null,theirExtra:null,frozen:false,result:null};
 const final=(v,extra=null)=>{if(R.out!==null)return false;R.out=v<0?-1:Math.round(v*1000);R.extra=extra;R.frozen=true;nf.event({o:[round,'f',R.out,extra]});return true;};
 return {R,
  die:(t,extra)=>final(Math.max(0,t),extra),
  timeUp:extra=>final(-1,extra),
  feed(o){if(!Array.isArray(o)||o[0]!==round||o[1]!=='f'||R.theirOut!==null)return;R.theirOut=o[2]<0?-1:o[2]|0;R.theirExtra=o[3]??null;if(R.theirOut>=0)R.theirDead=R.theirOut/1000;},
  tick(now,extra){
   if(R.out===null&&R.theirDead!==null&&now>=R.theirDead+tie)final(-1,typeof extra==='function'?extra():extra);
   if(R.result===null&&R.out!==null&&R.theirOut!==null){const a=R.out,b=R.theirOut;R.result=a<0&&b<0?'none':a<0?'me':b<0?'them':Math.abs(a-b)<=tie*1000?'none':a<b?'them':'me';}
   return R.result;}};
}
Object.assign(exports,{netField,roundOutcome});
